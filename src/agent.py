"""
The orchestration layer.

Flow:
    natural-language question
      -> plan        (choose tool + arguments)
      -> HUMAN GATE  (a person approves the plan before anything "publishes")
      -> execute     (call the deterministic tool)
      -> report      (plain-language summary of the risk numbers)
    ...with every step written to an append-only audit log.

The planner has two modes:
  * LLM mode  : if ANTHROPIC_API_KEY is set, an LLM maps the question to a tool call.
  * Offline   : a transparent rule-based planner so the demo runs with no key,
                no network, and fully deterministic output.

This mirrors the real design goal: the LLM decides *intent*, deterministic code
does the *math*, and a human owns the *decision to act*.
"""

from __future__ import annotations
import os
import json
from .tools import TOOLS, TOOL_SPECS, run_risk_simulation  # noqa: F401
from .audit import AuditLog


def _offline_planner(question: str) -> dict:
    """Rule-based intent mapping. Transparent and deterministic."""
    q = question.lower()
    if any(w in q for w in ("history", "data", "what do we have", "describe")):
        return {"tool": "describe_market", "args": {}}

    if "spike" in q or "jump" in q:
        model = "jump_diffusion"
    elif "mean" in q or "revert" in q:
        model = "ou"
    else:
        model = "ou"  # sensible default for energy prices

    horizon = 21
    for token, days in (("week", 5), ("month", 21), ("quarter", 63), ("year", 252)):
        if token in q:
            horizon = days
            break

    confidence = 0.99 if "99" in q else 0.95
    return {"tool": "run_risk_simulation",
            "args": {"model": model, "horizon": horizon, "confidence": confidence}}


def _llm_planner(question: str) -> dict:
    """Optional: use an LLM with tool-calling to choose the action."""
    import anthropic  # imported lazily so the package is optional
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=512,
        tools=TOOL_SPECS,
        messages=[{"role": "user", "content": question}],
    )
    for block in resp.content:
        if block.type == "tool_use":
            return {"tool": block.name, "args": dict(block.input)}
    # fall back if the model answered without a tool call
    return _offline_planner(question)


def plan(question: str) -> dict:
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            return _llm_planner(question)
        except Exception:
            return _offline_planner(question)
    return _offline_planner(question)


def render_report(tool: str, result: dict) -> str:
    if tool != "run_risk_simulation":
        return json.dumps(result, indent=2)
    return (
        f"Risk summary  ({result['model']} model, {result['horizon_days']}-day horizon, "
        f"{result['n_paths']:,} paths)\n"
        f"  Expected P&L            : {result['expected_pnl']:,.0f}  "
        f"(MC standard error +/- {result['mc_standard_error']:,.0f})\n"
        f"  VaR  @ {result['confidence']:.0%}            : {result['var']:,.0f}\n"
        f"  CVaR / Expected Shortfall: {result['cvar_expected_shortfall']:,.0f}\n"
        f"  Worst / best case        : {result['worst_case']:,.0f} / {result['best_case']:,.0f}\n"
        f"  Seed (reproducible)      : {result['seed']}"
    )


class RiskAgent:
    def __init__(self, audit_path: str = "audit_log.jsonl"):
        self.audit = AuditLog(audit_path)

    def answer(self, question: str, approver) -> dict:
        """
        `approver` is a callable taking the proposed plan dict and returning
        True/False. Nothing executes until it returns True. This is the
        human-in-the-loop control point.
        """
        proposed = plan(question)
        self.audit.record("agent", "proposed_plan", {"question": question, "plan": proposed})

        approved = bool(approver(proposed))
        self.audit.record("human", "approval_decision",
                          {"plan": proposed, "approved": approved})
        if not approved:
            return {"status": "rejected", "plan": proposed}

        fn = TOOLS[proposed["tool"]]
        result = fn(**proposed["args"])
        self.audit.record("tool", "executed", {"tool": proposed["tool"],
                                                "args": proposed["args"], "result": result})

        report = render_report(proposed["tool"], result)
        self.audit.record("agent", "report", {"report": report})
        return {"status": "ok", "plan": proposed, "result": result, "report": report}

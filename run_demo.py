"""
End-to-end demo: ask a risk question in plain language, watch the agent
propose a plan, approve it at the human gate, and get a risk report.

Run:
    python run_demo.py
    python run_demo.py "What is the 1-month VaR if prices spike?"

Runs fully offline (no API key needed). Set ANTHROPIC_API_KEY to route the
planning step through an LLM instead of the built-in rule-based planner.
"""

import sys
from src.agent import RiskAgent


def cli_approver(plan: dict) -> bool:
    """Human-in-the-loop gate. Auto-approves with --yes for a non-interactive demo."""
    print("\nProposed plan:")
    print(f"  tool : {plan['tool']}")
    print(f"  args : {plan['args']}")
    if "--yes" in sys.argv:
        print("  -> auto-approved (--yes)\n")
        return True
    reply = input("Approve this plan? [y/N] ").strip().lower()
    return reply == "y"


def main():
    question = next((a for a in sys.argv[1:] if not a.startswith("--")),
                    "What is our one-month Value at Risk on a 1,000 MWh power position?")
    print(f"Question: {question}")

    agent = RiskAgent(audit_path="audit_log.jsonl")
    outcome = agent.answer(question, approver=cli_approver)

    if outcome["status"] == "rejected":
        print("\nPlan rejected by human reviewer. Nothing was executed.")
        return

    print("\n" + outcome["report"])
    print("\nFull trace written to audit_log.jsonl")


if __name__ == "__main__":
    main()

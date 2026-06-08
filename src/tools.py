"""
The "tools" the agent is allowed to call. Each tool is a plain function with a
typed signature and a JSON-serializable return value. This is the deterministic,
testable layer underneath the LLM: the model decides *which* tool to call and
with *what* arguments, but the math here is fully reproducible.

The TOOL_SPECS list is also the contract you would hand to an LLM tool-calling
API (name + description + JSON schema of inputs).
"""

from __future__ import annotations
from . import sim, risk, data


def describe_market() -> dict:
    """Summarize the (synthetic) price history and suggest model parameters."""
    prices = data.synthetic_power_prices()
    params = data.estimate_params(prices)
    return {"history_days": int(prices.size), "latest_price": params["s0"],
            "suggested_params": params}


def run_risk_simulation(model: str = "ou", horizon: int = 21, n_paths: int = 50_000,
                        position: float = 1000.0, confidence: float = 0.95,
                        seed: int = 42) -> dict:
    """
    Run a Monte Carlo price simulation and return a risk summary.
    `model` in {gbm, ou/mean_reversion, jump_diffusion}; `horizon` in trading days.
    """
    prices = data.synthetic_power_prices()
    est = data.estimate_params(prices)
    if model in ("ou", "mean_reversion"):
        params = {"s0": est["s0"], "theta": 0.05, "mu": est["long_run_level"], "sigma": est["sigma"] * est["s0"]}
    elif model == "jump_diffusion":
        params = {"s0": est["s0"], "mu": est["mu"], "sigma": est["sigma"]}
    else:  # gbm
        params = {"s0": est["s0"], "mu": est["mu"], "sigma": est["sigma"]}

    paths = sim.simulate(model, params, horizon=horizon, n_paths=n_paths, seed=seed)
    pnl = risk.terminal_pnl(paths, position=position)
    summary = risk.summarize(pnl, confidence=confidence)
    summary.update({"model": model, "horizon_days": horizon, "position": position, "seed": seed})
    return summary


# Contract you would pass to an LLM tool-calling API.
TOOL_SPECS = [
    {
        "name": "describe_market",
        "description": "Summarize available price history and suggest simulation parameters.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "run_risk_simulation",
        "description": "Run a Monte Carlo price simulation and return VaR/CVaR risk metrics.",
        "input_schema": {
            "type": "object",
            "properties": {
                "model": {"type": "string", "enum": ["gbm", "ou", "mean_reversion", "jump_diffusion"]},
                "horizon": {"type": "integer", "description": "horizon in trading days"},
                "n_paths": {"type": "integer"},
                "position": {"type": "number", "description": "position size (MWh, contracts, etc.)"},
                "confidence": {"type": "number"},
            },
            "required": ["model", "horizon"],
        },
    },
]

TOOLS = {"describe_market": describe_market, "run_risk_simulation": run_risk_simulation}

"""
Risk metrics computed from simulated terminal values or P&L distributions.

  - VaR  (Value at Risk)            : loss not exceeded with confidence c
  - CVaR (Conditional VaR / ES)     : expected loss in the tail beyond VaR
  - CFaR (Cash-Flow at Risk)        : shortfall of cash flow vs. an expected level

Each result carries the Monte Carlo standard error of the mean so the caller
knows how much to trust the estimate (a core reproducibility/governance point).
"""

from __future__ import annotations
import numpy as np


def terminal_pnl(paths: np.ndarray, position: float = 1.0) -> np.ndarray:
    """P&L per path = position * (terminal price - initial price)."""
    return position * (paths[:, -1] - paths[:, 0])


def value_at_risk(pnl: np.ndarray, confidence: float = 0.95) -> float:
    """VaR as a positive loss number at the given confidence level."""
    q = np.quantile(pnl, 1 - confidence)
    return float(-q)


def conditional_var(pnl: np.ndarray, confidence: float = 0.95) -> float:
    """CVaR / Expected Shortfall: mean loss in the worst (1 - c) tail."""
    q = np.quantile(pnl, 1 - confidence)
    tail = pnl[pnl <= q]
    if tail.size == 0:
        return float(-q)
    return float(-tail.mean())


def cash_flow_at_risk(cash_flows: np.ndarray, expected: float | None = None,
                      confidence: float = 0.95) -> float:
    """
    CFaR: shortfall of realized cash flow below the expected level at the
    given confidence. Defaults `expected` to the mean of the distribution.
    """
    expected = float(np.mean(cash_flows)) if expected is None else expected
    q = np.quantile(cash_flows, 1 - confidence)
    return float(expected - q)


def summarize(pnl: np.ndarray, confidence: float = 0.95) -> dict:
    """Bundle the headline risk numbers plus MC diagnostics."""
    n = pnl.size
    mean = float(pnl.mean())
    std = float(pnl.std(ddof=1))
    se = std / np.sqrt(n)  # standard error of the mean estimate
    return {
        "n_paths": int(n),
        "confidence": confidence,
        "expected_pnl": round(mean, 2),
        "mc_standard_error": round(se, 2),
        "var": round(value_at_risk(pnl, confidence), 2),
        "cvar_expected_shortfall": round(conditional_var(pnl, confidence), 2),
        "worst_case": round(float(pnl.min()), 2),
        "best_case": round(float(pnl.max()), 2),
    }

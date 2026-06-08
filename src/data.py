"""
Synthetic energy-price series generator.

IMPORTANT: this project uses ONLY synthetic data so it can live in a public
repo with no exposure of internal or proprietary information. Swap this module
for a governed market-data connector inside an enterprise environment.
"""

from __future__ import annotations
import numpy as np


def synthetic_power_prices(days: int = 504, s0: float = 45.0, seed: int = 7) -> np.ndarray:
    """
    Generate a plausible daily power-price history with mean reversion,
    seasonality, and occasional spikes. Returns a 1-D array of length `days`.
    """
    rng = np.random.default_rng(seed)
    prices = np.empty(days)
    prices[0] = s0
    theta, mu, sigma = 0.05, 45.0, 1.6
    for t in range(1, days):
        season = 4.0 * np.sin(2 * np.pi * t / 252)            # annual cycle
        spike = rng.binomial(1, 0.01) * rng.normal(15, 5)      # rare price spike
        prev = prices[t - 1]
        prices[t] = max(1.0, prev + theta * (mu + season - prev) + sigma * rng.standard_normal() + spike)
    return prices


def estimate_params(prices: np.ndarray, dt: float = 1 / 252) -> dict:
    """
    Rough parameter estimates from a price series, for seeding the simulator.
    Returns drift (mu), volatility (sigma), spot (s0), and a mean level.
    """
    log_ret = np.diff(np.log(prices))
    mu = float(log_ret.mean() / dt)
    sigma = float(log_ret.std(ddof=1) / np.sqrt(dt))
    return {
        "s0": float(prices[-1]),
        "mu": round(mu, 4),
        "sigma": round(sigma, 4),
        "long_run_level": round(float(prices.mean()), 2),
    }

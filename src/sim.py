"""
Monte Carlo price-path simulation engine.

Three stochastic models commonly used for commodity / energy prices:
  - Geometric Brownian Motion (GBM)        : baseline log-normal drift/diffusion
  - Ornstein-Uhlenbeck mean reversion (OU) : energy prices revert to a level
  - Merton jump-diffusion                  : adds price spikes on top of GBM

All models are vectorized over `n_paths`. Everything is driven by an explicit
RNG seed so results are reproducible and auditable.
"""

from __future__ import annotations
import numpy as np


def gbm_paths(s0: float, mu: float, sigma: float, horizon: int,
              n_paths: int, dt: float = 1 / 252, rng=None) -> np.ndarray:
    """Geometric Brownian Motion. Returns array shape (n_paths, horizon + 1)."""
    rng = rng or np.random.default_rng()
    z = rng.standard_normal((n_paths, horizon))
    increments = (mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * z
    log_paths = np.cumsum(increments, axis=1)
    paths = s0 * np.exp(np.hstack([np.zeros((n_paths, 1)), log_paths]))
    return paths


def ou_paths(s0: float, theta: float, mu: float, sigma: float, horizon: int,
             n_paths: int, dt: float = 1 / 252, rng=None) -> np.ndarray:
    """
    Ornstein-Uhlenbeck mean-reverting process (Vasicek form):
        dX = theta * (mu - X) dt + sigma dW
    `theta` is the reversion speed, `mu` the long-run level.
    """
    rng = rng or np.random.default_rng()
    paths = np.empty((n_paths, horizon + 1))
    paths[:, 0] = s0
    sqrt_dt = np.sqrt(dt)
    for t in range(1, horizon + 1):
        z = rng.standard_normal(n_paths)
        prev = paths[:, t - 1]
        paths[:, t] = prev + theta * (mu - prev) * dt + sigma * sqrt_dt * z
    return paths


def jump_diffusion_paths(s0: float, mu: float, sigma: float, horizon: int,
                         n_paths: int, jump_intensity: float = 20.0,
                         jump_mean: float = -0.02, jump_std: float = 0.08,
                         dt: float = 1 / 252, rng=None) -> np.ndarray:
    """
    Merton jump-diffusion: GBM plus a compound-Poisson jump component.
    `jump_intensity` is the expected number of jumps per year.
    """
    rng = rng or np.random.default_rng()
    z = rng.standard_normal((n_paths, horizon))
    diffusion = (mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * z
    n_jumps = rng.poisson(jump_intensity * dt, size=(n_paths, horizon))
    jump_sizes = rng.normal(jump_mean, jump_std, size=(n_paths, horizon)) * n_jumps
    increments = diffusion + jump_sizes
    log_paths = np.cumsum(increments, axis=1)
    paths = s0 * np.exp(np.hstack([np.zeros((n_paths, 1)), log_paths]))
    return paths


MODELS = {
    "gbm": gbm_paths,
    "ou": ou_paths,
    "mean_reversion": ou_paths,
    "jump_diffusion": jump_diffusion_paths,
}


def simulate(model: str, params: dict, horizon: int, n_paths: int,
             seed: int | None = None) -> np.ndarray:
    """
    Dispatch to a named model and return simulated paths.
    `seed` is recorded so any run can be reproduced exactly.
    """
    if model not in MODELS:
        raise ValueError(f"unknown model '{model}'. choices: {sorted(MODELS)}")
    rng = np.random.default_rng(seed)
    fn = MODELS[model]
    return fn(horizon=horizon, n_paths=n_paths, rng=rng, **params)

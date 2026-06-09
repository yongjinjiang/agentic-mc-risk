# Agentic Monte Carlo Risk Workflow

A small, runnable prototype of an **AI agent that runs Monte Carlo risk simulations
under human-in-the-loop control** — built as a weekend exploration of how agentic
workflows could support an Enterprise Risk team.

It deliberately sits at the intersection of two things: **agentic AI / tool-calling**
(the kind of system design work I do in practice) and **Monte Carlo / stochastic modeling** (the quantitative
core of price-uncertainty and financial-loss analysis, and the same math I used for
years in computational physics).

> ⚠️ **Synthetic data only.** Everything here runs on a synthetic price series so it
> can live in a public repo with zero exposure of internal or proprietary information.
> In an enterprise setting, `src/data.py` would be swapped for a governed market-data
> connector. This is a design prototype, not a production risk system.

---

## Try in browser: [Live demo](https://yongjinjiang.github.io/agentic-mc-risk/)

## Two ways to use this repo

If you prefer Python, clone the repo and run the local prototype:

```bash
python run_demo.py --yes
```

If you prefer a browser experience, open the GitHub Pages version once the `web/` app is deployed. The browser app includes preset scenarios, charts, and CSV export so you can explore the same Monte Carlo risk ideas interactively without installing Python.

## Motivation

This project starts from a simple but real risk question: how do we turn uncertain inputs into a defensible risk output? In practice, you may have multiple plausible distributions, dependencies between drivers, and uncertainty that needs to be propagated all the way through the model. The goal here is to show that workflow end-to-end: choose a distribution, account for dependence when needed, propagate uncertainty with Monte Carlo simulation, and report risk measures such as VaR and CVaR with an audit trail.

## What it does

Ask a question in plain language:

```
python run_demo.py "What is the one-month VaR if power prices spike?"
```

The agent then:

1. **Plans** — maps the question to a concrete tool call (which stochastic model,
   what horizon, what confidence level).
2. **Stops at a human gate** — a person approves the plan before anything executes.
3. **Executes** deterministic Monte Carlo code (50,000 price paths, fixed seed).
4. **Reports** the risk numbers in plain language.
5. **Logs every step** to an append-only audit trail.

Sample output:

```
Risk summary  (jump_diffusion model, 21-day horizon, 50,000 paths)
  Expected P&L             : -1,112  (MC standard error +/- 51)
  VaR  @ 95%               : 17,717
  CVaR / Expected Shortfall: 20,853
  Worst / best case        : -39,178 / 92,477
  Seed (reproducible)      : 42
```

---

## Design principle: LLM decides intent, code does the math, human owns the decision

The single most important idea here is the separation of concerns:

| Layer | Responsibility | Why |
|-------|----------------|-----|
| **LLM** (`agent.plan`) | interpret the question, choose *which* tool and *what* arguments | natural-language flexibility |
| **Deterministic tools** (`tools.py`, `sim.py`, `risk.py`) | run the actual simulation and math | reproducible, testable, no hallucinated numbers |
| **Human gate** (`approver`) | approve the plan before execution | accountability for any action taken |
| **Audit log** (`audit.py`) | record every step with timestamp, params, seed, hash | traceability for a regulated environment |

An LLM never produces a risk number directly. It only routes to vetted code. That is
what makes the workflow defensible: any output traces back to its inputs, its random
seed, and the human who approved it.

The planner runs **fully offline** with a transparent rule-based fallback, so the demo
needs no API key and no network. Set `ANTHROPIC_API_KEY` to route planning through an
LLM with tool-calling instead.

---

## Model drivers

In this prototype, the final price or price range is mainly driven by the starting price, the drift or mean-reversion level, volatility, jump behavior, and the time horizon. In plain terms: the initial price sets the baseline, volatility widens the range, mean reversion pulls prices toward a long-run level, jumps create spikes or crashes, and a longer horizon gives uncertainty more time to accumulate. If we later extend the model to multiple assets, dependence between drivers will also become a major factor.

## The Monte Carlo / stochastic layer

Three price models common in commodity / energy risk (`src/sim.py`):

- **Geometric Brownian Motion** — log-normal baseline.
- **Ornstein-Uhlenbeck mean reversion** — energy prices revert to a level; the default.
- **Merton jump-diffusion** — adds the price spikes characteristic of power markets.

Risk metrics (`src/risk.py`): **VaR**, **CVaR / Expected Shortfall**, and **Cash-Flow-at-Risk**,
each reported with the **Monte Carlo standard error** so the reader knows how much to
trust the estimate.

These are the same tools — Markov-chain sampling, high-dimensional integration,
convergence and variance control — that I worked with for years modeling strongly
correlated systems in condensed-matter physics. The application changes; the math does not.

---

## Layout

```
agentic-mc-risk/
├── run_demo.py          # end-to-end demo (offline-capable)
├── src/
│   ├── agent.py         # orchestration: plan → human gate → execute → report
│   ├── tools.py         # tool-calling contract + deterministic tool functions
│   ├── sim.py           # Monte Carlo price-path models
│   ├── risk.py          # VaR / CVaR / CFaR + MC standard error
│   ├── data.py          # synthetic price data (swap for a governed connector)
│   └── audit.py         # append-only structured audit log
├── examples/
│   └── sample_questions.md
├── tests/
│   └── test_smoke.py
└── .github/workflows/ci.yml
```

## Run it

```bash
pip install -r requirements.txt
python run_demo.py --yes          # auto-approve for a non-interactive run
python run_demo.py                # interactive: approve the plan yourself
```

## Possible next steps

- Correlated multi-commodity simulation (Cholesky / copulas for power × gas × load)
- Variance-reduction (antithetic variates, quasi-random sequences) for faster convergence
- Model-calibration tool fitted to a real (governed) price feed
- A reviewer UI for the approval step and a searchable audit view

---

*Built as a learning prototype. Synthetic data only; not a production risk model.*

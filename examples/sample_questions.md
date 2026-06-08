# Sample questions

These exercise different branches of the offline planner:

| Question | Resulting plan |
|----------|----------------|
| "What price history do we have?" | `describe_market` |
| "What is our one-month VaR on a power position?" | `run_risk_simulation` (ou, 21d) |
| "Estimate the quarterly VaR at 99% confidence." | `run_risk_simulation` (ou, 63d, 0.99) |
| "What is the one-month VaR if prices spike?" | `run_risk_simulation` (jump_diffusion, 21d) |
| "Show the one-week mean-reversion risk." | `run_risk_simulation` (ou, 5d) |

Run any of them:

```bash
python run_demo.py --yes "Estimate the quarterly VaR at 99% confidence."
```

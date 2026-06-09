import unittest

from src.agent import plan, render_report
from src.tools import run_risk_simulation


class TestRiskWorkflow(unittest.TestCase):
    def test_offline_planner_routes_spike_questions_to_jump_diffusion(self):
        proposed = plan("What is the one-month VaR if prices spike?")
        self.assertEqual(proposed["tool"], "run_risk_simulation")
        self.assertEqual(proposed["args"]["model"], "jump_diffusion")
        self.assertEqual(proposed["args"]["horizon"], 21)
        self.assertEqual(proposed["args"]["confidence"], 0.95)

    def test_run_risk_simulation_returns_expected_headline_fields(self):
        result = run_risk_simulation(n_paths=2000, horizon=5, seed=7)
        for key in (
            "n_paths",
            "confidence",
            "expected_pnl",
            "mc_standard_error",
            "var",
            "cvar_expected_shortfall",
            "worst_case",
            "best_case",
            "model",
            "horizon_days",
            "position",
            "seed",
        ):
            self.assertIn(key, result)
        self.assertEqual(result["n_paths"], 2000)
        self.assertEqual(result["horizon_days"], 5)
        self.assertEqual(result["seed"], 7)

    def test_render_report_mentions_key_risk_metrics(self):
        result = run_risk_simulation(n_paths=500, horizon=5, seed=11)
        report = render_report("run_risk_simulation", result)
        self.assertIn("Risk summary", report)
        self.assertIn("VaR", report)
        self.assertIn("CVaR / Expected Shortfall", report)
        self.assertIn("Seed (reproducible)", report)


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Stdlib tests for tetlock_aggregate.py.

Run: python3 -I .claude/skills/tetlock-ensemble-forecasting/scripts/test_tetlock_aggregate.py
"""
import json
import math
import os
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tetlock_aggregate as ta  # noqa: E402

LENSES_W1 = ("outside-view", "fermi", "signals")
LENSES_W2 = ("bayes", "premortem")


def effort(eid, key, make):
    return {"effort_id": eid, "effort_key": key,
            "wave1": [make(l, eid, i) for i, l in enumerate(LENSES_W1)],
            "wave2": [make(l, eid, 3 + i) for i, l in enumerate(LENSES_W2)],
            "wave3": make("reconciler", eid, 5)}


def legacy_panelist(lens, eid, i):
    return {"lens": lens, "cq1": 40 + i, "cq2": 50, "cq5": 60 - i,
            "cq3": {"p10": 1.0, "p50": 2.0 + 0.1 * i, "p90": 3.5},
            "cq4": {"p10": 0.5, "p50": 1.0, "p90": 2.0},
            "cq6": {"A": 25, "B": 25, "C": 25, "D": 25},
            "hypothesis_scores": {"a": 50, "b": 40, "c": 60, "d": 30},
            "asset_views": [{"buildout_2026_2030_real_pct": 5, "diffusion_2031_2036_if_A": 10,
                             "diffusion_2031_2036_if_B": 0, "diffusion_2031_2036_if_C": -10,
                             "diffusion_2031_2036_if_D": 20}]}


GENERIC_QUESTIONS = [
    {"id": "q1", "type": "binary", "label": "Trade/GDP falls"},
    {"id": "q2", "type": "continuous", "label": "TIPS 2035", "unit": "%"},
    {"id": "q3", "type": "continuous", "label": "Net interest", "unit": "% GDP"},
    {"id": "q4", "type": "regimes", "label": "2045 regime",
     "options": [{"id": "A", "label": "a"}, {"id": "B", "label": "b"}, {"id": "C", "label": "c"}]},
]


def generic_panelist(lens, eid, i):
    return {"lens": lens, "q1": 60 + eid, "q2": {"p10": 0.5, "p50": 1.5, "p90": 2.5},
            "q3": {"p10": 3.0, "p50": 4.0 + 0.1 * eid, "p90": 5.5},
            "q4": {"A": 50, "B": 30, "C": 20}}


class PoolingMath(unittest.TestCase):
    def test_d1_is_geometric_mean_of_odds(self):
        ps = [0.2, 0.8]
        self.assertAlmostEqual(ta.extremize(ps, 1.0), 0.5)
        ps = [0.6, 0.9]
        odds = math.sqrt((0.6 / 0.4) * (0.9 / 0.1))
        self.assertAlmostEqual(ta.extremize(ps, 1.0), odds / (1 + odds))

    def test_extremizing_sharpens_away_from_half(self):
        ps = [0.7, 0.75, 0.8]
        self.assertGreater(ta.extremize(ps, 1.35), ta.extremize(ps, 1.0))
        ps = [0.3, 0.25]
        self.assertLess(ta.extremize(ps, 1.35), ta.extremize(ps, 1.0))


class LegacyBundle(unittest.TestCase):
    def setUp(self):
        self.bundle = {"asset_list": ["equities"],
                       "efforts": [effort(e, f"e{e}", legacy_panelist) for e in range(1, 5)]}

    def test_legacy_spec_still_aggregates(self):
        spec, res, rows = ta.aggregate(self.bundle)
        self.assertEqual(len(rows), 24)
        self.assertEqual(res["validation_problems"], [])
        self.assertEqual(res["completeness_problems"], [])
        self.assertEqual(set(res["binary"]), {"cq1", "cq2", "cq5"})
        self.assertAlmostEqual(res["binary"]["cq2"]["raw_mean_pct"], 50.0)
        self.assertAlmostEqual(res["regimes"]["cq6"]["raw_mean_pct"]["A"], 25.0)
        row = res["assets"]["rows"][0]
        # uniform regime weights -> mean of the four conditional columns
        self.assertAlmostEqual(row["regime_weighted"], (10 + 0 - 10 + 20) / 4)
        self.assertEqual(res["assets"]["n_contributors"], 6)


class GenericBundle(unittest.TestCase):
    def bundle(self):
        return {"title": "Test panel", "questions": GENERIC_QUESTIONS,
                "efforts": [effort(e, f"e{e}", generic_panelist) for e in range(1, 5)]}

    def test_question_set_comes_from_bundle(self):
        spec, res, _ = ta.aggregate(self.bundle())
        self.assertEqual(list(res["binary"]), ["q1"])
        self.assertEqual(list(res["continuous"]), ["q2", "q3"])
        self.assertEqual(list(res["regimes"]), ["q4"])
        self.assertEqual(res["planks"], {})
        self.assertIsNone(res["assets"])
        self.assertAlmostEqual(res["binary"]["q1"]["raw_mean_pct"], 62.5)
        self.assertEqual(res["binary"]["q1"]["effort_level"]["range_pct"], [61.0, 64.0])
        self.assertAlmostEqual(res["continuous"]["q3"]["ensemble_mean"]["p50"], 4.25)
        self.assertTrue(res["continuous"]["q3"]["ordering_ok"])

    def test_negative_regime_is_reported_and_excluded(self):
        b = self.bundle()
        b["efforts"][0]["wave1"][0]["q4"] = {"A": 72, "B": 30, "C": -2}
        _, res, _ = ta.aggregate(b)
        self.assertTrue(any("outside 0-100" in p and "C=-2" in p for p in res["validation_problems"]))
        r = res["regimes"]["q4"]
        self.assertEqual(r["n"], 23)            # the bad payload is excluded, not renormalized
        self.assertGreaterEqual(r["range_pct"]["C"][0], 0.0)

    def test_regime_sum_violation_is_named(self):
        b = self.bundle()
        b["efforts"][1]["wave2"][0]["q4"] = {"A": 55, "B": 30, "C": 20}
        _, res, _ = ta.aggregate(b)
        self.assertTrue(any("sums to 105.00" in p for p in res["validation_problems"]))
        self.assertEqual(res["regimes"]["q4"]["n"], 24)  # renormalized and kept

    def test_binary_bounds_and_missing_seat(self):
        b = self.bundle()
        b["efforts"][2]["wave1"][1]["q1"] = 100
        b["efforts"][3]["wave2"].pop()
        _, res, _ = ta.aggregate(b)
        self.assertTrue(any("q1=100 outside 1-99" in p for p in res["validation_problems"]))
        self.assertTrue(any("5 panelists, expected 6" in p for p in res["completeness_problems"]))
        self.assertEqual(res["binary"]["q1"]["n"], 22)

    def test_bad_spec_raises(self):
        b = self.bundle()
        b["questions"] = [{"id": "x", "type": "ordinal"}]
        with self.assertRaises(ValueError):
            ta.aggregate(b)

    def test_cli_writes_outputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "in.json")
            with open(src, "w") as fh:
                json.dump(self.bundle(), fh)
            out = os.path.join(tmp, "out")
            proc = subprocess.run([sys.executable, "-I", os.path.join(HERE, "tetlock_aggregate.py"),
                                   src, out, "--d-sens", "1.5"], capture_output=True, text=True)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            for f in ("aggregate.json", "aggregate.md", "chart_probabilities.svg",
                      "chart_intervals.svg", "chart_regimes.svg"):
                self.assertTrue(os.path.exists(os.path.join(out, f)), f)
            with open(os.path.join(out, "aggregate.json")) as fh:
                res = json.load(fh)
            self.assertEqual(res["d_sensitivity"], 1.5)
            with open(os.path.join(out, "aggregate.md")) as fh:
                self.assertIn("Extremized d=1.5", fh.read())


if __name__ == "__main__":
    unittest.main(verbosity=1)

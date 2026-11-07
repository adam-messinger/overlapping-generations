#!/usr/bin/env python3
"""Aggregate the China-catch-up / solar-build calibration panel.

Reads panel-output.json (4 efforts x 6 seats, 3 waves) and writes
aggregate.json. Same conventions as the repo skill's tetlock_aggregate.py:
the headline is the UNEXTREMIZED raw mean (and median) over all 24 seats;
d=1.35 extremization is a labelled secondary for the binary only; quantiles
are pooled by Vincentization (mean of each quantile) and never extremized.

Usage: python3 -I aggregate.py [panel-output.json] [aggregate.json]
"""
import json
import math
import statistics as st
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONTINUOUS = ("q1", "q2", "q3", "q4")
REGIMES = ("A", "B", "C", "D")
D_SENS = 1.35
EPS = 1e-4


def logit(p):
    p = min(1 - EPS, max(EPS, p))
    return math.log(p / (1 - p))


def extremize(ps, d):
    return 1 / (1 + math.exp(-d * st.fmean(logit(p) for p in ps)))


def seats(bundle):
    for e in bundle["efforts"]:
        for w in ("wave1", "wave2"):
            for p in e[w]:
                yield e["effort_key"], p.get("wave"), p.get("lens"), p
        yield e["effort_key"], 3, "reconciler", e["wave3"]


def validate(rows):
    problems = []
    for ek, wave, lens, p in rows:
        tag = f"{ek}/W{wave}/{lens}"
        for q in CONTINUOUS:
            lo, mid, hi = (p[q][k] for k in ("p10", "p50", "p90"))
            if not lo < mid < hi:
                problems.append(f"{tag}: {q} not ordered ({lo}/{mid}/{hi})")
        if not 1 <= p["q5"] <= 99:
            problems.append(f"{tag}: q5={p['q5']} outside 1-99")
        s = sum(p["q6"][r] for r in REGIMES)
        if abs(s - 100) > 0.51:
            problems.append(f"{tag}: q6 sums to {s}")
    return problems


def main(argv):
    src = Path(argv[1]) if len(argv) > 1 else HERE / "panel-output.json"
    dst = Path(argv[2]) if len(argv) > 2 else HERE / "aggregate.json"
    bundle = json.loads(src.read_text())
    rows = list(seats(bundle))
    recs = [p for _e, w, _l, p in rows if w == 3]
    out = {"n_seats": len(rows), "validation": validate(rows)}
    for q in CONTINUOUS:
        qs = [p[q] for *_x, p in rows]
        out[q] = {
            "vincentized_mean": {k: st.fmean(x[k] for x in qs) for k in ("p10", "p50", "p90")},
            "median": {k: st.median(x[k] for x in qs) for k in ("p10", "p50", "p90")},
            "p50_range": [min(x["p50"] for x in qs), max(x["p50"] for x in qs)],
            "p50_stdev": st.stdev(x["p50"] for x in qs),
            "reconciler_p50s": [r[q]["p50"] for r in recs],
        }
    ps = [p["q5"] / 100 for *_x, p in rows]
    out["q5"] = {
        "raw_mean_pct": 100 * st.fmean(ps),
        "median_pct": 100 * st.median(ps),
        "range_pct": [100 * min(ps), 100 * max(ps)],
        "extremized_d135_pct_secondary": 100 * extremize(ps, D_SENS),
        "reconciler_pct": [r["q5"] for r in recs],
    }
    ds = [{r: 100 * p["q6"][r] / sum(p["q6"].values()) for r in REGIMES} for *_x, p in rows]
    out["q6"] = {
        "raw_mean_pct": {r: st.fmean(d[r] for d in ds) for r in REGIMES},
        "range_pct": {r: [min(d[r] for d in ds), max(d[r] for d in ds)] for r in REGIMES},
    }
    # Coherence: the Q4/Q3 ratio implied by pooled medians vs the regime split
    out["coherence"] = {
        "implied_R_from_p50s": out["q4"]["vincentized_mean"]["p50"] / out["q3"]["vincentized_mean"]["p50"],
        "q3_cagr_2025_to_2030_from_511GW": (out["q3"]["vincentized_mean"]["p50"] / 511) ** (1 / 5) - 1,
        "q4_cagr_2030_to_2035": (out["q4"]["vincentized_mean"]["p50"] / out["q3"]["vincentized_mean"]["p50"]) ** (1 / 5) - 1,
    }
    dst.write_text(json.dumps(out, indent=2) + "\n")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main(sys.argv)

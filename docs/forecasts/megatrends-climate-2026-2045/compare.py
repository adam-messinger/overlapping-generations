#!/usr/bin/env python3
"""Side-by-side of this panel's pooled numbers and the source report's (Wave 4 only).

  compare.py <aggregate.json> <source-report.json> <out.md>

The source report's numbers are transcribed in source-report.json and were withheld
from every seat. The two ensembles answered the same ten named questions, but only
this panel had published resolvers, so a gap mixes a difference of judgment with a
difference of definition (see REPORT.md).
"""
import json, sys

BINARY = [("q1", "Q1 elasticity < 0.75 and digital + AI goods + minerals > 42%"),
          ("q2", "Q2 r* composite >= 2.00%, 2036-2045"),
          ("q3", "Q3 G7 climate fiscal cost >= 1.5% GDP/yr, 2040-2045"),
          ("q4", "Q4 >= 3 G7: automation tax >= 2% GDP or formal YCC"),
          ("q5", "Q5 US + China > 50% and EU-27 < 11.5% of world GDP, 2045")]
CONTINUOUS = [("c1", "C1 trade/GDP volume elasticity, 2026-2045", "x", 2),
              ("c2", "C2 neutral real rate, 2036-2045 avg", "%", 2),
              ("c3", "C3 advanced-economy gross debt, 2045", "% GDP", 0),
              ("c4", "C4 OECD + China real GDP per capita, 2026-2045", "%/yr", 2)]
REGIMES = [("A", "Q6-A techno-abundance"), ("B", "Q6-B bloc capitalism and repression"),
           ("C", "Q6-C stagflationary climate-debt crisis")]


def pp(x):
    return f"{x:+.1f} pp"


def main(agg_path, src_path, out_path):
    agg = json.load(open(agg_path, encoding="utf-8"))
    src = json.load(open(src_path, encoding="utf-8"))["run3"]
    L = ["# This panel against the source report (Run 3)", "",
         "Raw mean first, median in brackets. The d = 1.35 column is a labelled sensitivity.", "",
         "## Binary questions (probability of Yes)", "",
         "| Question | Source report | This panel | Difference (means) | This panel's effort range | *d = 1.35: source / this panel* |",
         "|---|---|---|---|---|---|"]
    for qid, label in BINARY:
        a = agg["binary"][qid]
        lo, hi = a["effort_level"]["range_pct"]
        L.append(f"| {label} | {src['raw_mean'][qid]:.1f}% ({src['median'][qid]:.1f}%) | "
                 f"**{a['raw_mean_pct']:.1f}%** ({a['median_pct']:.1f}%) | {pp(a['raw_mean_pct'] - src['raw_mean'][qid])} | "
                 f"{lo:.0f}-{hi:.0f}% | *{src['extremized_d135'][qid]:.1f}% / {a['extremized_pct']:.1f}%* |")
    L += ["", "## Continuous questions (P10 / P50 / P90, ensemble mean; never extremized)", "",
          "| Question | Unit | Source report | This panel | Difference in P50 | This panel's effort P50 range |",
          "|---|---|---|---|---|---|"]
    for qid, label, unit, nd in CONTINUOUS:
        a = agg["continuous"][qid]
        m, s = a["ensemble_mean"], src["raw_mean"][qid]
        lo, hi = a["effort_level"]["p50_range"]
        f = lambda v: f"{v:.{nd}f}"
        L.append(f"| {label} | {unit} | {f(s['p10'])} / {f(s['p50'])} / {f(s['p90'])} | "
                 f"**{f(m['p10'])} / {f(m['p50'])} / {f(m['p90'])}** | {m['p50'] - s['p50']:+.{nd}f} | {f(lo)}-{f(hi)} |")
    L += ["", "## Q6 regimes (2045 end-state)", "",
          "| Regime | Source report | This panel | Difference (means) | This panel's effort range |",
          "|---|---|---|---|---|"]
    r = agg["regimes"]["q6"]
    for rid, label in REGIMES:
        lo, hi = r["effort_level"]["range_pct"][rid]
        L.append(f"| {label} | {src['raw_mean']['q6'][rid]:.1f}% ({src['median']['q6'][rid]:.1f}%) | "
                 f"**{r['raw_mean_pct'][rid]:.1f}%** ({r['median_pct_renormalized'][rid]:.1f}%) | "
                 f"{pp(r['raw_mean_pct'][rid] - src['raw_mean']['q6'][rid])} | {lo:.0f}-{hi:.0f}% |")
    L.append("")
    open(out_path, "w", encoding="utf-8").write("\n".join(L))
    print("wrote", out_path)


if __name__ == "__main__":
    main(*sys.argv[1:4])

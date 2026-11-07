#!/usr/bin/env python3
"""
tetlock_aggregate.py -- Good Judgment Project style aggregation for the
Demographics x AI coupled ensemble (K=4 efforts x 6 single-skill panelists = 24).

Aggregation discipline (per the brief):
  * PRIMARY headline   : unextremized Raw Arithmetic Mean (d = 1.0) and Median.
  * SECONDARY sensitivity: Baron-Satopaa log-odds extremization at d = 1.35, LABELLED.
  * Continuous CQs     : P10/P50/P90 kept as quantiles, pooled by Vincentization
                         (Ensemble Mean) and by per-quantile median (Ensemble Median).
                         Probability extremization is NEVER applied to quantiles.
  * Effort Range       : spread of the 4 Wave-3 effort-level reconcilers, which is the
                         same object the Section 2B priors report as "Effort Range".

Deliberate separation: d=1.0 in LOG-ODDS space is the geometric mean of odds, which is
NOT the arithmetic mean. Both are reported so the reader can tell how much of any gap
between headline and sensitivity is the pooling rule and how much is extremization.

Stdlib only. Usage:
    python3 -I tetlock_aggregate.py <ensemble.json> [--out <prefix>]
"""

import json
import math
import statistics as st
import sys

EPS = 1e-6
BINARY_CQS = ("cq1", "cq2", "cq5")
CONTINUOUS_CQS = ("cq3", "cq4")
REGIMES = ("A", "B", "C", "D")
PLANKS = ("a", "b", "c", "d")
D_SENSITIVITY = 1.35


# ---------------------------------------------------------------- transforms
def _clamp(p):
    return min(1.0 - EPS, max(EPS, p))


def logit(p):
    p = _clamp(p)
    return math.log(p / (1.0 - p))


def logistic(x):
    return 1.0 / (1.0 + math.exp(-x))


def extremize(probs, d):
    """Baron-Satopaa: back-transform d * (mean log-odds). d=1 is the geometric
    mean of odds; d>1 sharpens away from 0.5."""
    if not probs:
        return None
    return logistic(d * st.fmean(logit(p) for p in probs))


# ---------------------------------------------------------------- extraction
def load(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def panelists(bundle):
    """Flatten to a list of (effort_id, effort_key, wave, lens, payload)."""
    rows = []
    for eff in bundle.get("efforts", []):
        eid, ekey = eff.get("effort_id"), eff.get("effort_key")
        for p in eff.get("wave1") or []:
            rows.append((eid, ekey, 1, p.get("lens"), p))
        for p in eff.get("wave2") or []:
            rows.append((eid, ekey, 2, p.get("lens"), p))
        if eff.get("wave3"):
            rows.append((eid, ekey, 3, "reconciler", eff["wave3"]))
    return rows


def reconcilers(bundle):
    return [
        (eff.get("effort_id"), eff.get("effort_key"), eff["wave3"])
        for eff in bundle.get("efforts", [])
        if eff.get("wave3")
    ]


# ---------------------------------------------------------------- validation
def validate(rows):
    """Report every payload that violates an accounting lock. Does not repair
    silently -- a violation that is renormalized without being reported is how a
    broken ensemble looks healthy."""
    problems = []
    for eid, ekey, wave, lens, p in rows:
        tag = f"E{eid}-{ekey}/W{wave}/{lens}"
        for cq in BINARY_CQS:
            v = p.get(cq)
            if v is None:
                problems.append(f"{tag}: {cq} missing")
            elif not (1 <= v <= 99):
                problems.append(f"{tag}: {cq}={v} outside 1-99")
        for cq in CONTINUOUS_CQS:
            q = p.get(cq) or {}
            try:
                lo, mid, hi = q["p10"], q["p50"], q["p90"]
            except KeyError:
                problems.append(f"{tag}: {cq} quantiles missing")
                continue
            if not (lo < mid < hi):
                problems.append(f"{tag}: {cq} quantiles not ordered ({lo}/{mid}/{hi})")
        c6 = p.get("cq6") or {}
        if all(r in c6 for r in REGIMES):
            s = sum(c6[r] for r in REGIMES)
            if abs(s - 100.0) > 0.51:
                problems.append(f"{tag}: cq6 sums to {s:.2f}, not 100 (renormalized)")
        else:
            problems.append(f"{tag}: cq6 incomplete")
        hs = p.get("hypothesis_scores") or {}
        for k in PLANKS:
            if k not in hs:
                problems.append(f"{tag}: hypothesis plank '{k}' missing")
            elif not (0 <= hs[k] <= 100):
                problems.append(f"{tag}: plank '{k}'={hs[k]} outside 0-100")
    return problems


# ---------------------------------------------------------------- aggregation
def agg_binary(rows, recs, cq):
    vals = [p[cq] / 100.0 for *_r, p in rows if p.get(cq) is not None]
    eff_vals = [w3[cq] / 100.0 for _i, _k, w3 in recs if w3.get(cq) is not None]
    by_wave = {}
    for _eid, _ek, wave, _lens, p in rows:
        if p.get(cq) is not None:
            by_wave.setdefault(wave, []).append(p[cq] / 100.0)
    return {
        "n": len(vals),
        "raw_mean_pct": 100 * st.fmean(vals),
        "median_pct": 100 * st.median(vals),
        "stdev_pct": 100 * (st.stdev(vals) if len(vals) > 1 else 0.0),
        "min_pct": 100 * min(vals),
        "max_pct": 100 * max(vals),
        "logodds_mean_d1_pct": 100 * extremize(vals, 1.0),
        "extremized_d135_pct": 100 * extremize(vals, D_SENSITIVITY),
        "effort_level": {
            "n": len(eff_vals),
            "values_pct": [100 * v for v in eff_vals],
            "range_pct": [100 * min(eff_vals), 100 * max(eff_vals)] if eff_vals else None,
            "mean_pct": 100 * st.fmean(eff_vals) if eff_vals else None,
        },
        "by_wave_mean_pct": {w: 100 * st.fmean(v) for w, v in sorted(by_wave.items())},
    }


def agg_continuous(rows, recs, cq):
    qs = [p[cq] for *_r, p in rows if p.get(cq)]
    eff_qs = [w3[cq] for _i, _k, w3 in recs if w3.get(cq)]
    by_wave = {}
    for _eid, _ek, wave, _lens, p in rows:
        if p.get(cq):
            by_wave.setdefault(wave, []).append(p[cq])

    def pool(items, fn):
        return {k: fn([q[k] for q in items]) for k in ("p10", "p50", "p90")}

    out = {
        "n": len(qs),
        "ensemble_mean": pool(qs, st.fmean),          # Vincentization
        "ensemble_median": pool(qs, st.median),
        "p50_stdev": st.stdev([q["p50"] for q in qs]) if len(qs) > 1 else 0.0,
        "p50_min": min(q["p50"] for q in qs),
        "p50_max": max(q["p50"] for q in qs),
        "effort_level": {
            "n": len(eff_qs),
            "p50_values": [q["p50"] for q in eff_qs],
            "p50_range": [min(q["p50"] for q in eff_qs), max(q["p50"] for q in eff_qs)] if eff_qs else None,
            "mean": pool(eff_qs, st.fmean) if eff_qs else None,
        },
        "by_wave_mean": {w: pool(v, st.fmean) for w, v in sorted(by_wave.items())},
    }
    # Mean P10<P50<P90 ordering survives Vincentization, but assert it anyway.
    m = out["ensemble_mean"]
    out["ordering_ok"] = m["p10"] < m["p50"] < m["p90"]
    return out


def agg_regimes(rows, recs):
    def norm(c6):
        s = sum(c6[r] for r in REGIMES)
        return {r: 100.0 * c6[r] / s for r in REGIMES} if s else None

    dists = [norm(p["cq6"]) for *_r, p in rows if p.get("cq6") and all(r in p["cq6"] for r in REGIMES)]
    dists = [d for d in dists if d]
    eff_dists = [norm(w3["cq6"]) for _i, _k, w3 in recs if w3.get("cq6")]
    eff_dists = [d for d in eff_dists if d]

    raw_mean = {r: st.fmean(d[r] for d in dists) for r in REGIMES}
    med = {r: st.median(d[r] for d in dists) for r in REGIMES}
    med_sum = sum(med.values())
    med_norm = {r: 100.0 * med[r] / med_sum for r in REGIMES}  # medians need renormalizing

    by_wave = {}
    for _eid, _ek, wave, _lens, p in rows:
        if p.get("cq6") and all(r in p["cq6"] for r in REGIMES):
            d = norm(p["cq6"])
            if d:
                by_wave.setdefault(wave, []).append(d)

    return {
        "n": len(dists),
        "raw_mean_pct": raw_mean,
        "median_pct_renormalized": med_norm,
        "median_pct_raw": med,
        "median_sum_before_renorm": med_sum,
        "stdev_pct": {r: (st.stdev([d[r] for d in dists]) if len(dists) > 1 else 0.0) for r in REGIMES},
        "range_pct": {r: [min(d[r] for d in dists), max(d[r] for d in dists)] for r in REGIMES},
        "effort_level": {
            "n": len(eff_dists),
            "dists_pct": eff_dists,
            "mean_pct": {r: st.fmean(d[r] for d in eff_dists) for r in REGIMES} if eff_dists else None,
            "range_pct": {r: [min(d[r] for d in eff_dists), max(d[r] for d in eff_dists)] for r in REGIMES} if eff_dists else None,
        },
        "by_wave_mean_pct": {
            w: {r: st.fmean(d[r] for d in ds) for r in REGIMES} for w, ds in sorted(by_wave.items())
        },
    }


def agg_planks(rows, recs):
    out = {}
    for k in PLANKS:
        vals = [p["hypothesis_scores"][k] for *_r, p in rows
                if (p.get("hypothesis_scores") or {}).get(k) is not None]
        eff = [w3["hypothesis_scores"][k] for _i, _ky, w3 in recs
               if (w3.get("hypothesis_scores") or {}).get(k) is not None]
        out[k] = {
            "n": len(vals),
            "raw_mean_pct": st.fmean(vals),
            "median_pct": st.median(vals),
            "stdev_pct": st.stdev(vals) if len(vals) > 1 else 0.0,
            "range_pct": [min(vals), max(vals)],
            "extremized_d135_pct": 100 * extremize([v / 100.0 for v in vals], D_SENSITIVITY),
            "effort_level_values_pct": eff,
            "effort_range_pct": [min(eff), max(eff)] if eff else None,
        }
    return out


def agg_assets(bundle, rows, regime_weights):
    """Asset matrix comes from Effort 4 (its explicit mandate). Every Effort-4
    panelist across all three waves contributes, so the matrix is an ensemble of 6,
    not one agent's table."""
    assets = bundle.get("asset_list", [])
    contributors = [p for eid, _k, _w, _l, p in rows if eid == 4 and p.get("asset_views")]
    cols = ("buildout_2026_2030_real_pct", "diffusion_2031_2036_if_A",
            "diffusion_2031_2036_if_B", "diffusion_2031_2036_if_C", "diffusion_2031_2036_if_D")
    table = []
    for idx, name in enumerate(assets):
        cells = {}
        for col in cols:
            vals = []
            for p in contributors:
                views = p["asset_views"]
                if idx < len(views) and views[idx].get(col) is not None:
                    vals.append(views[idx][col])
            cells[col] = {
                "mean": st.fmean(vals) if vals else None,
                "median": st.median(vals) if vals else None,
                "range": [min(vals), max(vals)] if vals else None,
                "n": len(vals),
            }
        # CQ6-weighted 2031-2036 expectation, derived from the regime weights --
        # not from a single-scenario narrative pick.
        parts = [(regime_weights[r] / 100.0, cells[f"diffusion_2031_2036_if_{r}"]["mean"]) for r in REGIMES]
        wtd = sum(w * v for w, v in parts if v is not None) if all(v is not None for _w, v in parts) else None
        spread = None
        rvals = [cells[f"diffusion_2031_2036_if_{r}"]["mean"] for r in REGIMES]
        if all(v is not None for v in rvals):
            spread = max(rvals) - min(rvals)
        cells["cq6_weighted_2031_2036"] = wtd
        cells["regime_dispersion_pp"] = spread
        table.append({"asset": name, **cells})
    return {"n_contributors": len(contributors), "rows": table}


# ---------------------------------------------------------------- reporting
def pct(x, nd=1):
    return "n/a" if x is None else f"{x:.{nd}f}"


def markdown(res):
    L = []
    L.append("## CQ1 / CQ2 / CQ5 -- binary\n")
    L.append("| CQ | n | Raw Mean (d=1.0) | Median | St.dev | Panelist Range | Effort Range | *log-odds d=1.0* | *Extremized d=1.35* |")
    L.append("|---|---|---|---|---|---|---|---|---|")
    for cq in BINARY_CQS:
        a = res["binary"][cq]
        er = a["effort_level"]["range_pct"]
        L.append(
            f"| {cq.upper()} | {a['n']} | **{pct(a['raw_mean_pct'])}%** | **{pct(a['median_pct'])}%** | "
            f"{pct(a['stdev_pct'])} pp | {pct(a['min_pct'],0)}-{pct(a['max_pct'],0)}% | "
            f"{pct(er[0],0)}-{pct(er[1],0)}% | *{pct(a['logodds_mean_d1_pct'])}%* | *{pct(a['extremized_d135_pct'])}%* |"
        )
    L.append("\n## CQ3 / CQ4 -- continuous (quantiles, never extremized)\n")
    L.append("| CQ | n | Ensemble Mean P10/P50/P90 | Ensemble Median P10/P50/P90 | P50 st.dev | P50 Range | Effort P50 Range |")
    L.append("|---|---|---|---|---|---|---|")
    for cq in CONTINUOUS_CQS:
        a = res["continuous"][cq]
        m, d = a["ensemble_mean"], a["ensemble_median"]
        er = a["effort_level"]["p50_range"]
        L.append(
            f"| {cq.upper()} | {a['n']} | **{pct(m['p10'],2)} / {pct(m['p50'],2)} / {pct(m['p90'],2)}** | "
            f"**{pct(d['p10'],2)} / {pct(d['p50'],2)} / {pct(d['p90'],2)}** | {pct(a['p50_stdev'],2)} | "
            f"{pct(a['p50_min'],2)}-{pct(a['p50_max'],2)} | {pct(er[0],2)}-{pct(er[1],2)} |"
        )
    L.append("\n## CQ6 -- MECE end-state regimes at Dec 31 2036\n")
    r = res["regimes"]
    L.append("| Regime | Raw Mean | Median (renorm.) | St.dev | Panelist Range | Effort Range |")
    L.append("|---|---|---|---|---|---|")
    names = {"A": "A AI-Solvent Renaissance", "B": "B Bifurcated Barbell",
             "C": "C Fiscal Dominance / Stagflation", "D": "D Capital-Concentrated Stagnation"}
    for k in REGIMES:
        er = (r["effort_level"]["range_pct"] or {}).get(k)
        L.append(
            f"| {names[k]} | **{pct(r['raw_mean_pct'][k])}%** | **{pct(r['median_pct_renormalized'][k])}%** | "
            f"{pct(r['stdev_pct'][k])} pp | {pct(r['range_pct'][k][0],0)}-{pct(r['range_pct'][k][1],0)}% | "
            f"{pct(er[0],0) if er else 'n/a'}-{pct(er[1],0) if er else 'n/a'}% |"
        )
    L.append(f"\nMedians summed to {pct(r['median_sum_before_renorm'])} before renormalization.\n")
    L.append("\n## Working-hypothesis planks (credence that each is substantially correct as stated)\n")
    L.append("| Plank | n | Raw Mean | Median | St.dev | Range | *d=1.35* |")
    L.append("|---|---|---|---|---|---|---|")
    pl = {"a": "(a) AI savings smoothly supply elder care",
          "b": "(b) India/Philippines suffer severely",
          "c": "(c) Hot now, falls in the 2030s",
          "d": "(d) Exponential AI outruns population decline"}
    for k in PLANKS:
        a = res["planks"][k]
        L.append(
            f"| {pl[k]} | {a['n']} | **{pct(a['raw_mean_pct'])}%** | **{pct(a['median_pct'])}%** | "
            f"{pct(a['stdev_pct'])} pp | {pct(a['range_pct'][0],0)}-{pct(a['range_pct'][1],0)}% | "
            f"*{pct(a['extremized_d135_pct'])}%* |"
        )
    L.append("\n## Wave-by-wave audit trail (mean across all efforts)\n")
    L.append("| Wave | CQ1 | CQ2 | CQ5 | CQ3 P50 | CQ4 P50 | A | B | C | D |")
    L.append("|---|---|---|---|---|---|---|---|---|---|")
    for w in (1, 2, 3):
        b = [res["binary"][cq]["by_wave_mean_pct"].get(w) for cq in BINARY_CQS]
        c3 = res["continuous"]["cq3"]["by_wave_mean"].get(w, {})
        c4 = res["continuous"]["cq4"]["by_wave_mean"].get(w, {})
        rg = res["regimes"]["by_wave_mean_pct"].get(w, {})
        L.append(
            f"| W{w} | {pct(b[0])}% | {pct(b[1])}% | {pct(b[2])}% | {pct(c3.get('p50'),2)} | "
            f"{pct(c4.get('p50'),2)} | {pct(rg.get('A'))}% | {pct(rg.get('B'))}% | "
            f"{pct(rg.get('C'))}% | {pct(rg.get('D'))}% |"
        )
    a = res["assets"]
    L.append(f"\n## Asset matrix -- annualized real %/yr (Effort-4 ensemble, n={a['n_contributors']})\n")
    L.append("| Asset | 2026-30 Buildout | 2031-36 \\|A | \\|B | \\|C | \\|D | **CQ6-weighted 2031-36** | Regime spread |")
    L.append("|---|---|---|---|---|---|---|---|")
    for row in a["rows"]:
        L.append(
            f"| {row['asset']} | {pct(row['buildout_2026_2030_real_pct']['mean'])} | "
            f"{pct(row['diffusion_2031_2036_if_A']['mean'])} | {pct(row['diffusion_2031_2036_if_B']['mean'])} | "
            f"{pct(row['diffusion_2031_2036_if_C']['mean'])} | {pct(row['diffusion_2031_2036_if_D']['mean'])} | "
            f"**{pct(row['cq6_weighted_2031_2036'])}** | {pct(row['regime_dispersion_pp'])} pp |"
        )
    return "\n".join(L)


# ---------------------------------------------------------------- charts
# Stdlib-only SVG. matplotlib is deliberately NOT a dependency: this repo keeps
# its toolchain light, and SVG is the better artifact anyway (crisp, themeable,
# inspectable in a diff). Palette values are the validated data-viz defaults.
PAL = {
    "surface": "#fcfcfb", "ink": "#0b0b0b", "ink2": "#52514e", "grid": "#e4e3df",
    "s1": "#2a78d6", "s1_soft": "#b7d3f6", "s2": "#eb6834", "neutral": "#f0efec",
    "pos": "#2a78d6", "neg": "#d03b3b",
}
ROW_H, PAD_T, PAD_B, LABEL_W, PLOT_W = 30, 64, 46, 300, 400


def _esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def _frame(title, subtitle, rows_n, body, ticks):
    h = PAD_T + rows_n * ROW_H + PAD_B
    w = LABEL_W + PLOT_W + 40
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
        f'font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Helvetica,Arial" font-size="12">',
        f'<rect width="{w}" height="{h}" fill="{PAL["surface"]}"/>',
        f'<text x="16" y="24" font-size="14" font-weight="600" fill="{PAL["ink"]}">{_esc(title)}</text>',
        f'<text x="16" y="42" font-size="11" fill="{PAL["ink2"]}">{_esc(subtitle)}</text>',
    ]
    for tx, tlabel in ticks:
        out.append(f'<line x1="{tx:.1f}" y1="{PAD_T - 8}" x2="{tx:.1f}" y2="{PAD_T + rows_n * ROW_H}" '
                   f'stroke="{PAL["grid"]}" stroke-width="1"/>')
        out.append(f'<text x="{tx:.1f}" y="{PAD_T + rows_n * ROW_H + 18}" text-anchor="middle" '
                   f'font-size="10" fill="{PAL["ink2"]}">{_esc(tlabel)}</text>')
    out.extend(body)
    out.append("</svg>")
    return "\n".join(out)


def chart_probabilities(res, d_sens, path):
    """CQ1/CQ2/CQ5 + the four hypothesis planks. Range bar + mean/median/extremized."""
    items = []
    for cq in BINARY_CQS:
        a = res["binary"][cq]
        items.append((cq.upper(), a["raw_mean_pct"], a["median_pct"], a["extremized_d135_pct"],
                      a["min_pct"], a["max_pct"]))
    for k in PLANKS:
        a = res["planks"][k]
        items.append((f"Plank ({k})", a["raw_mean_pct"], a["median_pct"], a["extremized_d135_pct"],
                      a["range_pct"][0], a["range_pct"][1]))

    def x(p):
        return LABEL_W + (p / 100.0) * PLOT_W

    body = [
        # legend -- 3 marker types, so identity is never colour-alone
        f'<circle cx="{LABEL_W}" cy="54" r="5" fill="{PAL["s1"]}"/>',
        f'<text x="{LABEL_W + 10}" y="58" font-size="10" fill="{PAL["ink2"]}">Raw mean (d=1.0)</text>',
        f'<circle cx="{LABEL_W + 118}" cy="54" r="5" fill="{PAL["surface"]}" stroke="{PAL["s1"]}" stroke-width="2"/>',
        f'<text x="{LABEL_W + 128}" y="58" font-size="10" fill="{PAL["ink2"]}">Median</text>',
        f'<line x1="{LABEL_W + 188}" y1="48" x2="{LABEL_W + 188}" y2="60" stroke="{PAL["s2"]}" stroke-width="2"/>',
        f'<text x="{LABEL_W + 194}" y="58" font-size="10" fill="{PAL["ink2"]}">Extremized d={d_sens}</text>',
    ]
    for i, (label, mean_, med, ext, lo, hi) in enumerate(items):
        cy = PAD_T + i * ROW_H + ROW_H / 2
        body.append(f'<text x="{LABEL_W - 12}" y="{cy + 4:.1f}" text-anchor="end" fill="{PAL["ink"]}">{_esc(label)}</text>')
        body.append(f'<rect x="{x(lo):.1f}" y="{cy - 3:.1f}" width="{max(1.0, x(hi) - x(lo)):.1f}" height="6" '
                    f'rx="3" fill="{PAL["s1_soft"]}"/>')
        body.append(f'<line x1="{x(ext):.1f}" y1="{cy - 9:.1f}" x2="{x(ext):.1f}" y2="{cy + 9:.1f}" '
                    f'stroke="{PAL["s2"]}" stroke-width="2"/>')
        body.append(f'<circle cx="{x(med):.1f}" cy="{cy:.1f}" r="5" fill="{PAL["surface"]}" '
                    f'stroke="{PAL["s1"]}" stroke-width="2"/>')
        body.append(f'<circle cx="{x(mean_):.1f}" cy="{cy:.1f}" r="5" fill="{PAL["s1"]}" '
                    f'stroke="{PAL["surface"]}" stroke-width="2"/>')
        body.append(f'<text x="{LABEL_W + PLOT_W + 8}" y="{cy + 4:.1f}" font-size="11" '
                    f'font-weight="600" fill="{PAL["ink"]}">{mean_:.0f}%</text>')
        body.append(f'<title>{_esc(label)}: raw mean {mean_:.1f}%, median {med:.1f}%, '
                    f'panelist range {lo:.0f}-{hi:.0f}%, d={d_sens} {ext:.1f}%</title>')
    ticks = [(x(p), f"{p}%") for p in (0, 25, 50, 75, 100)]
    svg = _frame("Binary coupled questions and hypothesis planks",
                 "Headline is the unextremized raw mean; bar spans the full panelist range (n=24)",
                 len(items), body, ticks)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg)


def chart_intervals(res, path):
    """CQ3/CQ4 quantiles. Never extremized -- its own chart, per the brief."""
    items = []
    for cq, unit in (("cq3", "%/yr real GDP growth"), ("cq4", "% real yield")):
        a = res["continuous"][cq]
        items.append((f"{cq.upper()} ({unit})", a["ensemble_mean"], a["ensemble_median"],
                      a["p50_min"], a["p50_max"]))
    lo = min(min(m["p10"] for _l, m, _d, _a, _b in items), min(a for *_r, a, _b in items))
    hi = max(max(m["p90"] for _l, m, _d, _a, _b in items), max(b for *_r, _a, b in items))
    span = (hi - lo) or 1.0
    lo, hi = lo - 0.1 * span, hi + 0.1 * span

    def x(v):
        return LABEL_W + (v - lo) / (hi - lo) * PLOT_W

    body = [
        f'<rect x="{LABEL_W}" y="50" width="34" height="8" rx="4" fill="{PAL["s1_soft"]}"/>',
        f'<text x="{LABEL_W + 40}" y="58" font-size="10" fill="{PAL["ink2"]}">P10-P90 (ensemble mean)</text>',
        f'<line x1="{LABEL_W + 196}" y1="48" x2="{LABEL_W + 196}" y2="60" stroke="{PAL["s1"]}" stroke-width="3"/>',
        f'<text x="{LABEL_W + 202}" y="58" font-size="10" fill="{PAL["ink2"]}">P50</text>',
    ]
    for i, (label, m, d, pmin, pmax) in enumerate(items):
        cy = PAD_T + i * ROW_H + ROW_H / 2
        body.append(f'<text x="{LABEL_W - 12}" y="{cy + 4:.1f}" text-anchor="end" fill="{PAL["ink"]}">{_esc(label)}</text>')
        body.append(f'<rect x="{x(m["p10"]):.1f}" y="{cy - 5:.1f}" width="{max(1.0, x(m["p90"]) - x(m["p10"])):.1f}" '
                    f'height="10" rx="5" fill="{PAL["s1_soft"]}"/>')
        body.append(f'<line x1="{x(pmin):.1f}" y1="{cy:.1f}" x2="{x(pmax):.1f}" y2="{cy:.1f}" '
                    f'stroke="{PAL["ink2"]}" stroke-width="1" stroke-dasharray="2 2"/>')
        body.append(f'<line x1="{x(m["p50"]):.1f}" y1="{cy - 10:.1f}" x2="{x(m["p50"]):.1f}" y2="{cy + 10:.1f}" '
                    f'stroke="{PAL["s1"]}" stroke-width="3"/>')
        body.append(f'<text x="{LABEL_W + PLOT_W + 8}" y="{cy + 4:.1f}" font-size="11" font-weight="600" '
                    f'fill="{PAL["ink"]}">{m["p50"]:.2f}</text>')
        body.append(f'<title>{_esc(label)}: mean P10/P50/P90 {m["p10"]:.2f}/{m["p50"]:.2f}/{m["p90"]:.2f}; '
                    f'median {d["p10"]:.2f}/{d["p50"]:.2f}/{d["p90"]:.2f}; panelist P50 range {pmin:.2f}-{pmax:.2f}</title>')
    nticks = 5
    ticks = [(x(lo + j * (hi - lo) / (nticks - 1)), f"{lo + j * (hi - lo) / (nticks - 1):.1f}") for j in range(nticks)]
    svg = _frame("Continuous coupled questions (quantiles, never extremized)",
                 "Solid bar = Vincentized ensemble mean P10-P90; dashed = spread of panelist P50s",
                 len(items), body, ticks)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg)


def chart_regimes(res, path):
    """CQ6 MECE regimes, raw mean with the effort-level range as a whisker."""
    r = res["regimes"]
    names = {"A": "A  AI-Solvent Renaissance", "B": "B  Bifurcated Barbell",
             "C": "C  Fiscal Dominance / Stagflation", "D": "D  Capital-Concentrated Stagnation"}
    hi = max(max(r["range_pct"][k][1] for k in REGIMES), 50.0)
    hi = (int(hi / 10) + 1) * 10

    def x(p):
        return LABEL_W + (p / 100.0) * PLOT_W * (100.0 / hi)

    body = []
    for i, k in enumerate(REGIMES):
        cy = PAD_T + i * ROW_H + ROW_H / 2
        v = r["raw_mean_pct"][k]
        lo_e, hi_e = r["range_pct"][k]
        er = (r["effort_level"]["range_pct"] or {}).get(k)
        body.append(f'<text x="{LABEL_W - 12}" y="{cy + 4:.1f}" text-anchor="end" fill="{PAL["ink"]}">{_esc(names[k])}</text>')
        # 2px surface gap between adjacent bars comes from the 30px row vs 18px bar
        body.append(f'<rect x="{LABEL_W}" y="{cy - 9:.1f}" width="{max(1.0, x(v) - LABEL_W):.1f}" height="18" '
                    f'rx="4" fill="{PAL["s1"]}"/>')
        body.append(f'<line x1="{x(lo_e):.1f}" y1="{cy:.1f}" x2="{x(hi_e):.1f}" y2="{cy:.1f}" '
                    f'stroke="{PAL["ink2"]}" stroke-width="1" stroke-dasharray="2 2"/>')
        if er:
            body.append(f'<line x1="{x(er[0]):.1f}" y1="{cy - 6:.1f}" x2="{x(er[0]):.1f}" y2="{cy + 6:.1f}" '
                        f'stroke="{PAL["s2"]}" stroke-width="2"/>')
            body.append(f'<line x1="{x(er[1]):.1f}" y1="{cy - 6:.1f}" x2="{x(er[1]):.1f}" y2="{cy + 6:.1f}" '
                        f'stroke="{PAL["s2"]}" stroke-width="2"/>')
        body.append(f'<text x="{LABEL_W + PLOT_W + 8}" y="{cy + 4:.1f}" font-size="11" font-weight="600" '
                    f'fill="{PAL["ink"]}">{v:.1f}%</text>')
        body.append(f'<title>{_esc(names[k])}: raw mean {v:.1f}%, median {r["median_pct_renormalized"][k]:.1f}%, '
                    f'panelist range {lo_e:.0f}-{hi_e:.0f}%'
                    + (f', effort range {er[0]:.0f}-{er[1]:.0f}%' if er else '') + '</title>')
    ticks = [(x(p), f"{p}%") for p in range(0, hi + 1, max(10, hi // 5))]
    svg = _frame("CQ6 end-state regimes at Dec 31 2036",
                 "Bar = raw mean (sums to 100%); dashed = panelist range; orange ticks = effort-level range",
                 len(REGIMES), body, ticks)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg)


# ---------------------------------------------------------------- entrypoint
def main(argv):
    """CLI contract: tetlock_aggregate.py <forecasts_input.json> <outdir> [--d-sens D]"""
    args = [a for a in argv[1:] if not a.startswith("--")]
    if len(args) < 1:
        print(__doc__)
        return 2
    path = args[0]
    outdir = args[1].rstrip("/") if len(args) > 1 else "."
    d_sens = D_SENSITIVITY
    if "--d-sens" in argv:
        d_sens = float(argv[argv.index("--d-sens") + 1])

    bundle = load(path)
    rows = panelists(bundle)
    recs = reconcilers(bundle)
    if not rows:
        print(f"ERROR: no panelist payloads found in {path}", file=sys.stderr)
        return 1
    problems = validate(rows)

    res = {
        "d_sensitivity": d_sens,
        "panelist_count": len(rows),
        "effort_count": len(recs),
        "expected_panelists": 24,
        "validation_problems": problems,
        "binary": {cq: agg_binary(rows, recs, cq) for cq in BINARY_CQS},
        "continuous": {cq: agg_continuous(rows, recs, cq) for cq in CONTINUOUS_CQS},
        "regimes": agg_regimes(rows, recs),
        "planks": agg_planks(rows, recs),
    }
    # honour a non-default d for every probability column
    if abs(d_sens - D_SENSITIVITY) > 1e-9:
        for cq in BINARY_CQS:
            vals = [p[cq] / 100.0 for *_r, p in rows if p.get(cq) is not None]
            res["binary"][cq]["extremized_d135_pct"] = 100 * extremize(vals, d_sens)
        for k in PLANKS:
            vals = [p["hypothesis_scores"][k] / 100.0 for *_r, p in rows
                    if (p.get("hypothesis_scores") or {}).get(k) is not None]
            res["planks"][k]["extremized_d135_pct"] = 100 * extremize(vals, d_sens)
    res["assets"] = agg_assets(bundle, rows, res["regimes"]["raw_mean_pct"])

    import os
    os.makedirs(outdir, exist_ok=True)
    with open(f"{outdir}/aggregate.json", "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=2)
    md = markdown(res)
    with open(f"{outdir}/aggregate.md", "w", encoding="utf-8") as fh:
        fh.write(md + "\n")
    chart_probabilities(res, d_sens, f"{outdir}/chart_probabilities.svg")
    chart_intervals(res, f"{outdir}/chart_intervals.svg")
    chart_regimes(res, f"{outdir}/chart_regimes.svg")

    print(f"Panelists: {len(rows)}/24 across {len(recs)}/4 effort reconcilers (d_sens={d_sens})")
    if problems:
        print(f"\n!! {len(problems)} accounting-lock violations:")
        for p in problems:
            print("   -", p)
    else:
        print("All accounting locks satisfied.")
    print(f"\nWrote: aggregate.json, aggregate.md, chart_probabilities.svg, "
          f"chart_intervals.svg, chart_regimes.svg -> {outdir}/")
    print()
    print(md)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

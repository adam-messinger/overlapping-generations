#!/usr/bin/env python3
"""
tetlock_aggregate.py -- Good Judgment Project style aggregation for a K-effort x
6-panelist Tetlock ensemble.

The question set is read from the input bundle (`questions`), so the script serves
any panel. A bundle without `questions` is treated as the original Demographics x AI
2036 panel (cq1/cq2/cq5 binary, cq3/cq4 continuous, cq6 regimes A-D, planks a-d,
Effort-4 asset matrix) so its sealed bundles still aggregate unchanged.

Aggregation discipline:
  * PRIMARY headline   : unextremized Raw Arithmetic Mean and Median.
  * SECONDARY sensitivity: Baron-Satopaa log-odds extremization at d (default 1.35),
                         LABELLED as such.
  * The d = 1.0 log-odds pool (geometric mean of odds) is reported separately from
    the arithmetic mean: they are different estimators, and the gap between them is
    the pooling rule, not extremization.
  * Continuous questions: P10/P50/P90 kept as quantiles, pooled by Vincentization
    (Ensemble Mean) and per-quantile median (Ensemble Median). Never extremized.
  * Regimes (MECE): raw mean of each panelist's renormalized distribution; medians
    are renormalized and the pre-renormalization sum is reported.
  * Effort Range: spread of the K Wave-3 effort reconcilers.
  * Violations are reported, never silently repaired.

Stdlib only. Usage:
    python3 -I tetlock_aggregate.py <bundle.json> [<outdir>] [--d-sens D]

Bundle schema (generic):
{
  "title": "Four megatrends, 2026-2045",              # optional, used in headings
  "expected_efforts": 4, "expected_per_effort": 6,      # optional, default 4 and 6
  "questions": [
    {"id": "q1", "type": "binary", "label": "World trade/GDP 2035 < 2024"},
    {"id": "q2", "type": "continuous", "label": "US 10y TIPS 2035 avg", "unit": "%"},
    {"id": "q6", "type": "regimes", "label": "2045 end-state",
     "options": [{"id": "A", "label": "Fortress blocs"}, ...]}
  ],
  "planks": [{"id": "a", "label": "..."}],              # optional credences, 0-100
  "assets": {                                           # optional conditional matrix
    "effort_id": 4, "list": ["equities", ...],
    "columns": [{"id": "buildout", "label": "2026-30"}, ...],
    "regime_weighting": {"question": "q6", "column_template": "if_{regime}",
                         "label": "Regime-weighted"}
  },
  "efforts": [
    {"effort_id": 1, "effort_key": "energy",
     "wave1": [{"lens": "outside-view", "q1": 62, "q2": {"p10": .., "p50": .., "p90": ..},
                "q6": {"A": 30, ...}, "hypothesis_scores": {"a": 55}, "asset_views": [...]}],
     "wave2": [...], "wave3": {...}}
  ]
}
Binary answers are percentages in [1, 99]. Regime answers are percentages >= 0 that
should sum to 100.
"""
import json
import math
import os
import statistics as st
import sys

EPS = 1e-6
D_SENSITIVITY = 1.35

# ---------------------------------------------------------------- legacy spec
# The original Demographics x AI 2036 panel. Used only when a bundle has no
# `questions` key, so bundles sealed before generalization still aggregate.
LEGACY_SPEC = {
    "title": "Demographics x AI coupled ensemble (2036)",
    "questions": [
        {"id": "cq1", "type": "binary", "label": "CQ1"},
        {"id": "cq2", "type": "binary", "label": "CQ2"},
        {"id": "cq5", "type": "binary", "label": "CQ5"},
        {"id": "cq3", "type": "continuous", "label": "CQ3", "unit": "%/yr real GDP growth"},
        {"id": "cq4", "type": "continuous", "label": "CQ4", "unit": "% real yield"},
        {"id": "cq6", "type": "regimes", "label": "CQ6 -- MECE end-state regimes at Dec 31 2036",
         "options": [
             {"id": "A", "label": "AI-Solvent Renaissance"},
             {"id": "B", "label": "Bifurcated Barbell"},
             {"id": "C", "label": "Fiscal Dominance / Stagflation"},
             {"id": "D", "label": "Capital-Concentrated Stagnation"},
         ]},
    ],
    "planks": [
        {"id": "a", "label": "(a) AI savings smoothly supply elder care"},
        {"id": "b", "label": "(b) India/Philippines suffer severely"},
        {"id": "c", "label": "(c) Hot now, falls in the 2030s"},
        {"id": "d", "label": "(d) Exponential AI outruns population decline"},
    ],
    "assets": {
        "effort_id": 4,
        "columns": [
            {"id": "buildout_2026_2030_real_pct", "label": "2026-30 Buildout"},
            {"id": "diffusion_2031_2036_if_A", "label": "2031-36 |A"},
            {"id": "diffusion_2031_2036_if_B", "label": "|B"},
            {"id": "diffusion_2031_2036_if_C", "label": "|C"},
            {"id": "diffusion_2031_2036_if_D", "label": "|D"},
        ],
        "regime_weighting": {"question": "cq6",
                             "column_template": "diffusion_2031_2036_if_{regime}",
                             "label": "CQ6-weighted 2031-36"},
        "units": "annualized real %/yr",
    },
}


def resolve_spec(bundle):
    """Return the question spec for this bundle, filling optional sections."""
    if "questions" in bundle:
        spec = {
            "title": bundle.get("title", "Tetlock ensemble"),
            "questions": bundle["questions"],
            "planks": bundle.get("planks", []),
            "assets": bundle.get("assets"),
        }
    else:
        spec = json.loads(json.dumps(LEGACY_SPEC))
        if bundle.get("asset_list"):
            spec["assets"]["list"] = bundle["asset_list"]
        else:
            spec["assets"] = None
    spec["expected_efforts"] = bundle.get("expected_efforts", 4)
    spec["expected_per_effort"] = bundle.get("expected_per_effort", 6)
    return spec


def spec_errors(spec):
    errs = []
    seen = set()
    for q in spec["questions"]:
        qid, qt = q.get("id"), q.get("type")
        if not qid:
            errs.append("question without id")
            continue
        if qid in seen:
            errs.append(f"duplicate question id '{qid}'")
        seen.add(qid)
        if qt not in ("binary", "continuous", "regimes"):
            errs.append(f"question '{qid}': unknown type '{qt}'")
        if qt == "regimes":
            opts = q.get("options") or []
            if len(opts) < 2:
                errs.append(f"question '{qid}': regimes need at least 2 options")
    if not spec["questions"]:
        errs.append("bundle declares no questions")
    return errs


def by_type(spec, t):
    return [q for q in spec["questions"] if q["type"] == t]


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


def _is_num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


# ---------------------------------------------------------------- validation
def validate(spec, rows):
    """Report every payload that violates an accounting lock. Does not repair
    silently -- a violation that is renormalized without being reported is how a
    broken ensemble looks healthy."""
    problems = []
    for eid, ekey, wave, lens, p in rows:
        tag = f"E{eid}-{ekey}/W{wave}/{lens}"
        for q in spec["questions"]:
            qid, qt = q["id"], q["type"]
            v = p.get(qid)
            if qt == "binary":
                if v is None:
                    problems.append(f"{tag}: {qid} missing")
                elif not _is_num(v) or not (1 <= v <= 99):
                    problems.append(f"{tag}: {qid}={v} outside 1-99")
            elif qt == "continuous":
                v = v or {}
                try:
                    lo, mid, hi = v["p10"], v["p50"], v["p90"]
                except (KeyError, TypeError):
                    problems.append(f"{tag}: {qid} quantiles missing")
                    continue
                if not all(_is_num(x) for x in (lo, mid, hi)):
                    problems.append(f"{tag}: {qid} quantiles not numeric")
                elif not (lo < mid < hi):
                    problems.append(f"{tag}: {qid} quantiles not ordered ({lo}/{mid}/{hi})")
            else:  # regimes
                v = v or {}
                opts = [o["id"] for o in q["options"]]
                if not all(o in v for o in opts):
                    problems.append(f"{tag}: {qid} incomplete")
                    continue
                bad = [o for o in opts if not _is_num(v[o]) or not (0 <= v[o] <= 100)]
                if bad:
                    problems.append(f"{tag}: {qid} option(s) {','.join(bad)} outside 0-100 "
                                    f"({', '.join(f'{o}={v[o]}' for o in bad)}); payload excluded")
                    continue
                s = sum(v[o] for o in opts)
                if abs(s - 100.0) > 0.51:
                    problems.append(f"{tag}: {qid} sums to {s:.2f}, not 100 (renormalized)")
        if spec["planks"]:
            hs = p.get("hypothesis_scores") or {}
            for pl in spec["planks"]:
                k = pl["id"]
                if k not in hs:
                    problems.append(f"{tag}: hypothesis plank '{k}' missing")
                elif not _is_num(hs[k]) or not (0 <= hs[k] <= 100):
                    problems.append(f"{tag}: plank '{k}'={hs[k]} outside 0-100")
    return problems


def count_problems(spec, bundle, rows, recs):
    """Panel completeness: a missing seat is a finding, not a rounding error."""
    out = []
    exp_e, exp_p = spec["expected_efforts"], spec["expected_per_effort"]
    if len(recs) != exp_e:
        out.append(f"{len(recs)} effort reconcilers found, expected {exp_e}")
    for eff in bundle.get("efforts", []):
        n = len(eff.get("wave1") or []) + len(eff.get("wave2") or []) + (1 if eff.get("wave3") else 0)
        if n != exp_p:
            out.append(f"effort {eff.get('effort_id')}-{eff.get('effort_key')}: {n} panelists, expected {exp_p}")
    return out


# ---------------------------------------------------------------- aggregation
def _binary_vals(rows, qid):
    return [p[qid] / 100.0 for *_r, p in rows if _is_num(p.get(qid)) and 1 <= p[qid] <= 99]


def agg_binary(rows, recs, qid, d_sens):
    vals = _binary_vals(rows, qid)
    eff_vals = [w3[qid] / 100.0 for _i, _k, w3 in recs if _is_num(w3.get(qid)) and 1 <= w3[qid] <= 99]
    by_wave = {}
    for _eid, _ek, wave, _lens, p in rows:
        if _is_num(p.get(qid)) and 1 <= p[qid] <= 99:
            by_wave.setdefault(wave, []).append(p[qid] / 100.0)
    if not vals:
        return {"n": 0}
    return {
        "n": len(vals),
        "raw_mean_pct": 100 * st.fmean(vals),
        "median_pct": 100 * st.median(vals),
        "stdev_pct": 100 * (st.stdev(vals) if len(vals) > 1 else 0.0),
        "min_pct": 100 * min(vals),
        "max_pct": 100 * max(vals),
        "logodds_mean_d1_pct": 100 * extremize(vals, 1.0),
        "extremized_pct": 100 * extremize(vals, d_sens),
        "effort_level": {
            "n": len(eff_vals),
            "values_pct": [100 * v for v in eff_vals],
            "range_pct": [100 * min(eff_vals), 100 * max(eff_vals)] if eff_vals else None,
            "mean_pct": 100 * st.fmean(eff_vals) if eff_vals else None,
        },
        "by_wave_mean_pct": {w: 100 * st.fmean(v) for w, v in sorted(by_wave.items())},
    }


def _quantiles_ok(q):
    return (isinstance(q, dict) and all(_is_num(q.get(k)) for k in ("p10", "p50", "p90"))
            and q["p10"] < q["p50"] < q["p90"])


def agg_continuous(rows, recs, qid):
    qs = [p[qid] for *_r, p in rows if _quantiles_ok(p.get(qid))]
    eff_qs = [w3[qid] for _i, _k, w3 in recs if _quantiles_ok(w3.get(qid))]
    by_wave = {}
    for _eid, _ek, wave, _lens, p in rows:
        if _quantiles_ok(p.get(qid)):
            by_wave.setdefault(wave, []).append(p[qid])
    if not qs:
        return {"n": 0}

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
    m = out["ensemble_mean"]
    out["ordering_ok"] = m["p10"] < m["p50"] < m["p90"]
    return out


def _regime_dist(q, payload):
    """Renormalized distribution, or None if the payload is incomplete or has an
    out-of-range option (those are reported by validate() and excluded here)."""
    opts = [o["id"] for o in q["options"]]
    v = payload.get(q["id"]) if payload else None
    if not isinstance(v, dict) or not all(o in v for o in opts):
        return None
    if not all(_is_num(v[o]) and 0 <= v[o] <= 100 for o in opts):
        return None
    s = sum(v[o] for o in opts)
    return {o: 100.0 * v[o] / s for o in opts} if s > 0 else None


def agg_regimes(rows, recs, q):
    opts = [o["id"] for o in q["options"]]
    dists = [d for d in (_regime_dist(q, p) for *_r, p in rows) if d]
    eff_dists = [d for d in (_regime_dist(q, w3) for _i, _k, w3 in recs) if d]
    if not dists:
        return {"n": 0}
    raw_mean = {r: st.fmean(d[r] for d in dists) for r in opts}
    med = {r: st.median(d[r] for d in dists) for r in opts}
    med_sum = sum(med.values())
    med_norm = {r: 100.0 * med[r] / med_sum for r in opts} if med_sum else med
    by_wave = {}
    for _eid, _ek, wave, _lens, p in rows:
        d = _regime_dist(q, p)
        if d:
            by_wave.setdefault(wave, []).append(d)
    return {
        "n": len(dists),
        "raw_mean_pct": raw_mean,
        "median_pct_renormalized": med_norm,
        "median_pct_raw": med,
        "median_sum_before_renorm": med_sum,
        "stdev_pct": {r: (st.stdev([d[r] for d in dists]) if len(dists) > 1 else 0.0) for r in opts},
        "range_pct": {r: [min(d[r] for d in dists), max(d[r] for d in dists)] for r in opts},
        "effort_level": {
            "n": len(eff_dists),
            "dists_pct": eff_dists,
            "mean_pct": {r: st.fmean(d[r] for d in eff_dists) for r in opts} if eff_dists else None,
            "range_pct": {r: [min(d[r] for d in eff_dists), max(d[r] for d in eff_dists)] for r in opts} if eff_dists else None,
        },
        "by_wave_mean_pct": {w: {r: st.fmean(d[r] for d in ds) for r in opts} for w, ds in sorted(by_wave.items())},
    }


def agg_planks(spec, rows, recs, d_sens):
    out = {}
    for pl in spec["planks"]:
        k = pl["id"]
        ok = lambda p: _is_num((p.get("hypothesis_scores") or {}).get(k)) and 0 <= p["hypothesis_scores"][k] <= 100
        vals = [p["hypothesis_scores"][k] for *_r, p in rows if ok(p)]
        eff = [w3["hypothesis_scores"][k] for _i, _ky, w3 in recs if ok(w3)]
        if not vals:
            out[k] = {"n": 0}
            continue
        out[k] = {
            "n": len(vals),
            "raw_mean_pct": st.fmean(vals),
            "median_pct": st.median(vals),
            "stdev_pct": st.stdev(vals) if len(vals) > 1 else 0.0,
            "range_pct": [min(vals), max(vals)],
            "extremized_pct": 100 * extremize([v / 100.0 for v in vals], d_sens),
            "effort_level_values_pct": eff,
            "effort_range_pct": [min(eff), max(eff)] if eff else None,
        }
    return out


def agg_assets(spec, rows, regimes_res):
    """Conditional asset matrix from one effort's panelists (all its waves), so the
    matrix is an ensemble of that effort's seats, not one agent's table. If a regime
    weighting is declared, the weighted column uses the pooled regime raw means --
    not a single-scenario narrative pick."""
    a = spec.get("assets")
    if not a or not a.get("list"):
        return None
    eid_want = a.get("effort_id")
    contributors = [p for eid, _k, _w, _l, p in rows
                    if (eid_want is None or eid == eid_want) and p.get("asset_views")]
    cols = [c["id"] for c in a["columns"]]
    rw = a.get("regime_weighting")
    weights = None
    if rw:
        rq = regimes_res.get(rw["question"]) or {}
        weights = rq.get("raw_mean_pct")
    table = []
    for idx, name in enumerate(a["list"]):
        cells = {}
        for col in cols:
            vals = []
            for p in contributors:
                views = p["asset_views"]
                if idx < len(views) and _is_num((views[idx] or {}).get(col)):
                    vals.append(views[idx][col])
            cells[col] = {
                "mean": st.fmean(vals) if vals else None,
                "median": st.median(vals) if vals else None,
                "range": [min(vals), max(vals)] if vals else None,
                "n": len(vals),
            }
        wtd = spread = None
        if rw and weights:
            rvals = {r: cells.get(rw["column_template"].format(regime=r), {}).get("mean") for r in weights}
            if all(v is not None for v in rvals.values()):
                wtd = sum(weights[r] / 100.0 * rvals[r] for r in weights)
                spread = max(rvals.values()) - min(rvals.values())
        cells["regime_weighted"] = wtd
        cells["regime_dispersion"] = spread
        table.append({"asset": name, **cells})
    return {"n_contributors": len(contributors), "effort_id": eid_want, "rows": table}


# ---------------------------------------------------------------- reporting
def pct(x, nd=1):
    return "n/a" if x is None else f"{x:.{nd}f}"


def num(x, nd=2):
    return "n/a" if x is None else f"{x:.{nd}f}"


def markdown(spec, res):
    d = res["d_sensitivity"]
    L = []
    bq = by_type(spec, "binary")
    if bq:
        L.append("## Binary questions\n")
        L.append(f"| Q | Question | n | Raw Mean | Median | St.dev | Panelist Range | Effort Range "
                 f"| *log-odds d=1.0* | *Extremized d={d}* |")
        L.append("|---|---|---|---|---|---|---|---|---|---|")
        for q in bq:
            a = res["binary"][q["id"]]
            if not a.get("n"):
                L.append(f"| {q['id'].upper()} | {q.get('label', '')} | 0 | n/a | | | | | | |")
                continue
            er = a["effort_level"]["range_pct"]
            L.append(
                f"| {q['id'].upper()} | {q.get('label', '')} | {a['n']} | **{pct(a['raw_mean_pct'])}%** | "
                f"**{pct(a['median_pct'])}%** | {pct(a['stdev_pct'])} pp | "
                f"{pct(a['min_pct'], 0)}-{pct(a['max_pct'], 0)}% | "
                f"{(pct(er[0], 0) + '-' + pct(er[1], 0) + '%') if er else 'n/a'} | "
                f"*{pct(a['logodds_mean_d1_pct'])}%* | *{pct(a['extremized_pct'])}%* |"
            )
    cq = by_type(spec, "continuous")
    if cq:
        L.append("\n## Continuous questions (quantiles, never extremized)\n")
        L.append("| Q | Question | Unit | n | Ensemble Mean P10/P50/P90 | Ensemble Median P10/P50/P90 "
                 "| P50 st.dev | P50 Range | Effort P50 Range |")
        L.append("|---|---|---|---|---|---|---|---|---|")
        for q in cq:
            a = res["continuous"][q["id"]]
            if not a.get("n"):
                L.append(f"| {q['id'].upper()} | {q.get('label', '')} | {q.get('unit', '')} | 0 | n/a | | | | |")
                continue
            m, md = a["ensemble_mean"], a["ensemble_median"]
            er = a["effort_level"]["p50_range"]
            L.append(
                f"| {q['id'].upper()} | {q.get('label', '')} | {q.get('unit', '')} | {a['n']} | "
                f"**{num(m['p10'])} / {num(m['p50'])} / {num(m['p90'])}** | "
                f"**{num(md['p10'])} / {num(md['p50'])} / {num(md['p90'])}** | {num(a['p50_stdev'])} | "
                f"{num(a['p50_min'])}-{num(a['p50_max'])} | "
                f"{(num(er[0]) + '-' + num(er[1])) if er else 'n/a'} |"
            )
    for q in by_type(spec, "regimes"):
        r = res["regimes"][q["id"]]
        L.append(f"\n## {q['id'].upper()} -- {q.get('label', 'MECE regimes')}\n")
        if not r.get("n"):
            L.append("No valid regime distributions.\n")
            continue
        L.append("| Regime | Raw Mean | Median (renorm.) | St.dev | Panelist Range | Effort Range |")
        L.append("|---|---|---|---|---|---|")
        for o in q["options"]:
            k = o["id"]
            er = (r["effort_level"]["range_pct"] or {}).get(k)
            L.append(
                f"| {k} {o.get('label', '')} | **{pct(r['raw_mean_pct'][k])}%** | "
                f"**{pct(r['median_pct_renormalized'][k])}%** | {pct(r['stdev_pct'][k])} pp | "
                f"{pct(r['range_pct'][k][0], 0)}-{pct(r['range_pct'][k][1], 0)}% | "
                f"{(pct(er[0], 0) + '-' + pct(er[1], 0) + '%') if er else 'n/a'} |"
            )
        L.append(f"\nMedians summed to {pct(r['median_sum_before_renorm'])} before renormalization.\n")
    if spec["planks"]:
        L.append("\n## Working-hypothesis planks (credence that each is substantially correct as stated)\n")
        L.append(f"| Plank | n | Raw Mean | Median | St.dev | Range | *d={d}* |")
        L.append("|---|---|---|---|---|---|---|")
        for pl in spec["planks"]:
            a = res["planks"][pl["id"]]
            if not a.get("n"):
                L.append(f"| {pl.get('label', pl['id'])} | 0 | n/a | | | | |")
                continue
            L.append(
                f"| {pl.get('label', pl['id'])} | {a['n']} | **{pct(a['raw_mean_pct'])}%** | "
                f"**{pct(a['median_pct'])}%** | {pct(a['stdev_pct'])} pp | "
                f"{pct(a['range_pct'][0], 0)}-{pct(a['range_pct'][1], 0)}% | *{pct(a['extremized_pct'])}%* |"
            )
    # wave audit
    L.append("\n## Wave-by-wave audit trail (mean across all efforts)\n")
    hdr, cells_by_wave = ["Wave"], {1: [], 2: [], 3: []}
    for q in bq:
        hdr.append(q["id"].upper())
        for w in cells_by_wave:
            v = res["binary"][q["id"]].get("by_wave_mean_pct", {}).get(w)
            cells_by_wave[w].append(f"{pct(v)}%" if v is not None else "n/a")
    for q in cq:
        hdr.append(f"{q['id'].upper()} P50")
        for w in cells_by_wave:
            v = res["continuous"][q["id"]].get("by_wave_mean", {}).get(w, {}).get("p50")
            cells_by_wave[w].append(num(v))
    for q in by_type(spec, "regimes"):
        for o in q["options"]:
            hdr.append(f"{q['id'].upper()}:{o['id']}")
            for w in cells_by_wave:
                v = res["regimes"][q["id"]].get("by_wave_mean_pct", {}).get(w, {}).get(o["id"])
                cells_by_wave[w].append(f"{pct(v)}%" if v is not None else "n/a")
    L.append("| " + " | ".join(hdr) + " |")
    L.append("|" + "---|" * len(hdr))
    for w, cells in cells_by_wave.items():
        L.append(f"| W{w} | " + " | ".join(cells) + " |")
    a = res.get("assets")
    if a:
        ac = spec["assets"]
        units = ac.get("units", "")
        L.append(f"\n## Asset matrix -- {units} (effort {a['effort_id']} ensemble, n={a['n_contributors']})\n")
        rw = ac.get("regime_weighting")
        hdr = ["Asset"] + [c["label"] for c in ac["columns"]]
        if rw:
            hdr += [f"**{rw.get('label', 'Regime-weighted')}**", "Regime spread"]
        L.append("| " + " | ".join(h.replace("|", "\\|") for h in hdr) + " |")
        L.append("|" + "---|" * len(hdr))
        for row in a["rows"]:
            cells = [row["asset"]] + [pct(row[c["id"]]["mean"]) for c in ac["columns"]]
            if rw:
                cells += [f"**{pct(row['regime_weighted'])}**", f"{pct(row['regime_dispersion'])} pp"]
            L.append("| " + " | ".join(cells) + " |")
    return "\n".join(L)


# ---------------------------------------------------------------- charts
# Stdlib-only SVG. matplotlib is deliberately NOT a dependency: this repo keeps
# its toolchain light, and SVG is the better artifact anyway (crisp, themeable,
# inspectable in a diff). Palette values are the validated data-viz defaults.
PAL = {
    "surface": "#fcfcfb", "ink": "#0b0b0b", "ink2": "#52514e", "grid": "#e4e3df",
    "s1": "#2a78d6", "s1_soft": "#b7d3f6", "s2": "#eb6834", "neutral": "#f0efec",
}
ROW_H, PAD_T, PAD_B, LABEL_W, PLOT_W = 30, 64, 46, 300, 400


def _esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _short(s, n=44):
    s = str(s)
    return s if len(s) <= n else s[: n - 1] + "…"


def _frame(title, subtitle, rows_n, body, ticks):
    h = PAD_T + rows_n * ROW_H + PAD_B
    w = LABEL_W + PLOT_W + 60
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


def chart_probabilities(spec, res, d_sens, path):
    """Binary questions + planks. Range bar + mean/median/extremized markers."""
    items = []
    for q in by_type(spec, "binary"):
        a = res["binary"][q["id"]]
        if a.get("n"):
            items.append((f"{q['id'].upper()} {q.get('label', '')}", a["raw_mean_pct"], a["median_pct"],
                          a["extremized_pct"], a["min_pct"], a["max_pct"], a["n"]))
    for pl in spec["planks"]:
        a = res["planks"][pl["id"]]
        if a.get("n"):
            items.append((pl.get("label", f"Plank ({pl['id']})"), a["raw_mean_pct"], a["median_pct"],
                          a["extremized_pct"], a["range_pct"][0], a["range_pct"][1], a["n"]))
    if not items:
        return False

    def x(p):
        return LABEL_W + (p / 100.0) * PLOT_W

    body = [
        f'<circle cx="{LABEL_W}" cy="54" r="5" fill="{PAL["s1"]}"/>',
        f'<text x="{LABEL_W + 10}" y="58" font-size="10" fill="{PAL["ink2"]}">Raw mean</text>',
        f'<circle cx="{LABEL_W + 80}" cy="54" r="5" fill="{PAL["surface"]}" stroke="{PAL["s1"]}" stroke-width="2"/>',
        f'<text x="{LABEL_W + 90}" y="58" font-size="10" fill="{PAL["ink2"]}">Median</text>',
        f'<line x1="{LABEL_W + 150}" y1="48" x2="{LABEL_W + 150}" y2="60" stroke="{PAL["s2"]}" stroke-width="2"/>',
        f'<text x="{LABEL_W + 156}" y="58" font-size="10" fill="{PAL["ink2"]}">Extremized d={d_sens} (sensitivity)</text>',
    ]
    for i, (label, mean_, med, ext, lo, hi, n) in enumerate(items):
        cy = PAD_T + i * ROW_H + ROW_H / 2
        body.append(f'<text x="{LABEL_W - 12}" y="{cy + 4:.1f}" text-anchor="end" fill="{PAL["ink"]}">{_esc(_short(label))}</text>')
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
                    f'panelist range {lo:.0f}-{hi:.0f}% (n={n}), d={d_sens} {ext:.1f}%</title>')
    ticks = [(x(p), f"{p}%") for p in (0, 25, 50, 75, 100)]
    svg = _frame(f"{spec['title']}: probability questions",
                 "Headline is the unextremized raw mean; bar spans the full panelist range",
                 len(items), body, ticks)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg)
    return True


def chart_intervals(spec, res, path):
    """Continuous quantiles, never extremized. Each row has its OWN scale, because
    a panel's continuous questions rarely share a unit; the row's scale ends are
    printed so no row is read against another's axis."""
    items = []
    for q in by_type(spec, "continuous"):
        a = res["continuous"][q["id"]]
        if a.get("n"):
            items.append((q, a))
    if not items:
        return False
    body = [
        f'<rect x="{LABEL_W}" y="50" width="34" height="8" rx="4" fill="{PAL["s1_soft"]}"/>',
        f'<text x="{LABEL_W + 40}" y="58" font-size="10" fill="{PAL["ink2"]}">P10-P90 (ensemble mean)</text>',
        f'<line x1="{LABEL_W + 176}" y1="48" x2="{LABEL_W + 176}" y2="60" stroke="{PAL["s1"]}" stroke-width="3"/>',
        f'<text x="{LABEL_W + 182}" y="58" font-size="10" fill="{PAL["ink2"]}">P50</text>',
        f'<line x1="{LABEL_W + 210}" y1="54" x2="{LABEL_W + 240}" y2="54" stroke="{PAL["ink2"]}" stroke-dasharray="2 2"/>',
        f'<text x="{LABEL_W + 246}" y="58" font-size="10" fill="{PAL["ink2"]}">panelist P50 spread</text>',
    ]
    row_h = ROW_H + 14
    for i, (q, a) in enumerate(items):
        m, md = a["ensemble_mean"], a["ensemble_median"]
        lo = min(m["p10"], a["p50_min"])
        hi = max(m["p90"], a["p50_max"])
        span = (hi - lo) or 1.0
        lo, hi = lo - 0.08 * span, hi + 0.08 * span

        def x(v, lo=lo, hi=hi):
            return LABEL_W + (v - lo) / (hi - lo) * PLOT_W

        cy = PAD_T + i * row_h + row_h / 2 - 4
        label = f"{q['id'].upper()} {q.get('label', '')}"
        unit = q.get("unit", "")
        body.append(f'<text x="{LABEL_W - 12}" y="{cy + 4:.1f}" text-anchor="end" fill="{PAL["ink"]}">{_esc(_short(label))}</text>')
        body.append(f'<line x1="{LABEL_W}" y1="{cy:.1f}" x2="{LABEL_W + PLOT_W}" y2="{cy:.1f}" stroke="{PAL["grid"]}"/>')
        body.append(f'<rect x="{x(m["p10"]):.1f}" y="{cy - 5:.1f}" width="{max(1.0, x(m["p90"]) - x(m["p10"])):.1f}" '
                    f'height="10" rx="5" fill="{PAL["s1_soft"]}"/>')
        body.append(f'<line x1="{x(a["p50_min"]):.1f}" y1="{cy:.1f}" x2="{x(a["p50_max"]):.1f}" y2="{cy:.1f}" '
                    f'stroke="{PAL["ink2"]}" stroke-width="1" stroke-dasharray="2 2"/>')
        body.append(f'<line x1="{x(m["p50"]):.1f}" y1="{cy - 10:.1f}" x2="{x(m["p50"]):.1f}" y2="{cy + 10:.1f}" '
                    f'stroke="{PAL["s1"]}" stroke-width="3"/>')
        body.append(f'<text x="{LABEL_W}" y="{cy + 22:.1f}" font-size="9" fill="{PAL["ink2"]}">{lo:.2f}</text>')
        body.append(f'<text x="{LABEL_W + PLOT_W}" y="{cy + 22:.1f}" text-anchor="end" font-size="9" '
                    f'fill="{PAL["ink2"]}">{hi:.2f} {_esc(unit)}</text>')
        body.append(f'<text x="{LABEL_W + PLOT_W + 8}" y="{cy + 4:.1f}" font-size="11" font-weight="600" '
                    f'fill="{PAL["ink"]}">{m["p50"]:.2f}</text>')
        body.append(f'<title>{_esc(label)} ({_esc(unit)}): mean P10/P50/P90 {m["p10"]:.2f}/{m["p50"]:.2f}/{m["p90"]:.2f}; '
                    f'median {md["p10"]:.2f}/{md["p50"]:.2f}/{md["p90"]:.2f}; panelist P50 range '
                    f'{a["p50_min"]:.2f}-{a["p50_max"]:.2f}</title>')
    h = PAD_T + len(items) * row_h + 20
    w = LABEL_W + PLOT_W + 60
    svg = "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
        f'font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Helvetica,Arial" font-size="12">',
        f'<rect width="{w}" height="{h}" fill="{PAL["surface"]}"/>',
        f'<text x="16" y="24" font-size="14" font-weight="600" fill="{PAL["ink"]}">'
        f'{_esc(spec["title"])}: continuous questions (never extremized)</text>',
        f'<text x="16" y="42" font-size="11" fill="{PAL["ink2"]}">Each row has its own scale (ends printed under the row)</text>',
        *body, "</svg>"])
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg)
    return True


def chart_regimes(q, r, path):
    """MECE regimes: raw mean bar, panelist range dashed, effort range ticks."""
    opts = q["options"]
    hi = max(max(r["range_pct"][o["id"]][1] for o in opts), 50.0)
    hi = int(min(100, (int(hi / 10) + 1) * 10))

    def x(p):
        return LABEL_W + (p / hi) * PLOT_W

    body = []
    for i, o in enumerate(opts):
        k = o["id"]
        cy = PAD_T + i * ROW_H + ROW_H / 2
        v = r["raw_mean_pct"][k]
        lo_e, hi_e = r["range_pct"][k]
        er = (r["effort_level"]["range_pct"] or {}).get(k)
        name = f"{k}  {o.get('label', '')}"
        body.append(f'<text x="{LABEL_W - 12}" y="{cy + 4:.1f}" text-anchor="end" fill="{PAL["ink"]}">{_esc(_short(name))}</text>')
        body.append(f'<rect x="{LABEL_W}" y="{cy - 9:.1f}" width="{max(1.0, x(v) - LABEL_W):.1f}" height="18" '
                    f'rx="4" fill="{PAL["s1"]}"/>')
        body.append(f'<line x1="{x(lo_e):.1f}" y1="{cy:.1f}" x2="{x(hi_e):.1f}" y2="{cy:.1f}" '
                    f'stroke="{PAL["ink2"]}" stroke-width="1" stroke-dasharray="2 2"/>')
        if er:
            for e in er:
                body.append(f'<line x1="{x(e):.1f}" y1="{cy - 6:.1f}" x2="{x(e):.1f}" y2="{cy + 6:.1f}" '
                            f'stroke="{PAL["s2"]}" stroke-width="2"/>')
        body.append(f'<text x="{LABEL_W + PLOT_W + 8}" y="{cy + 4:.1f}" font-size="11" font-weight="600" '
                    f'fill="{PAL["ink"]}">{v:.1f}%</text>')
        body.append(f'<title>{_esc(name)}: raw mean {v:.1f}%, median {r["median_pct_renormalized"][k]:.1f}%, '
                    f'panelist range {lo_e:.0f}-{hi_e:.0f}%'
                    + (f', effort range {er[0]:.0f}-{er[1]:.0f}%' if er else '') + '</title>')
    ticks = [(x(p), f"{p}%") for p in range(0, hi + 1, max(10, hi // 5))]
    svg = _frame(f"{q['id'].upper()} {q.get('label', 'end-state regimes')}",
                 "Bar = raw mean (sums to 100%); dashed = panelist range; orange ticks = effort-level range",
                 len(opts), body, ticks)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(svg)


# ---------------------------------------------------------------- entrypoint
def aggregate(bundle, d_sens=D_SENSITIVITY):
    """Pure aggregation: returns (spec, result, rows). Raises ValueError on a bad spec."""
    spec = resolve_spec(bundle)
    errs = spec_errors(spec)
    if errs:
        raise ValueError("; ".join(errs))
    rows = panelists(bundle)
    recs = reconcilers(bundle)
    res = {
        "title": spec["title"],
        "d_sensitivity": d_sens,
        "panelist_count": len(rows),
        "effort_count": len(recs),
        "expected_panelists": spec["expected_efforts"] * spec["expected_per_effort"],
        "validation_problems": validate(spec, rows),
        "completeness_problems": count_problems(spec, bundle, rows, recs),
        "binary": {q["id"]: agg_binary(rows, recs, q["id"], d_sens) for q in by_type(spec, "binary")},
        "continuous": {q["id"]: agg_continuous(rows, recs, q["id"]) for q in by_type(spec, "continuous")},
        "regimes": {q["id"]: agg_regimes(rows, recs, q) for q in by_type(spec, "regimes")},
        "planks": agg_planks(spec, rows, recs, d_sens),
    }
    res["assets"] = agg_assets(spec, rows, res["regimes"])
    return spec, res, rows


def main(argv):
    """CLI contract: tetlock_aggregate.py <forecasts_input.json> [<outdir>] [--d-sens D]"""
    d_sens = D_SENSITIVITY
    args = []
    i = 1
    while i < len(argv):
        if argv[i] == "--d-sens":
            d_sens = float(argv[i + 1])
            i += 2
            continue
        if argv[i] == "--out":  # legacy prefix flag
            args.append(argv[i + 1]) if len(args) == 1 else None
            i += 2
            continue
        if not argv[i].startswith("--"):
            args.append(argv[i])
        i += 1
    if not args:
        print(__doc__)
        return 2
    path = args[0]
    outdir = args[1].rstrip("/") if len(args) > 1 else "."

    bundle = load(path)
    try:
        spec, res, rows = aggregate(bundle, d_sens)
    except ValueError as e:
        print(f"ERROR: invalid question spec: {e}", file=sys.stderr)
        return 1
    if not rows:
        print(f"ERROR: no panelist payloads found in {path}", file=sys.stderr)
        return 1

    os.makedirs(outdir, exist_ok=True)
    with open(f"{outdir}/aggregate.json", "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=2)
    md = markdown(spec, res)
    with open(f"{outdir}/aggregate.md", "w", encoding="utf-8") as fh:
        fh.write(f"# {spec['title']}\n\n" + md + "\n")
    written = ["aggregate.json", "aggregate.md"]
    if chart_probabilities(spec, res, d_sens, f"{outdir}/chart_probabilities.svg"):
        written.append("chart_probabilities.svg")
    if chart_intervals(spec, res, f"{outdir}/chart_intervals.svg"):
        written.append("chart_intervals.svg")
    rq = by_type(spec, "regimes")
    for j, q in enumerate(rq):
        r = res["regimes"][q["id"]]
        if r.get("n"):
            name = "chart_regimes.svg" if j == 0 else f"chart_regimes_{q['id']}.svg"
            chart_regimes(q, r, f"{outdir}/{name}")
            written.append(name)

    print(f"Panelists: {res['panelist_count']}/{res['expected_panelists']} across "
          f"{res['effort_count']}/{spec['expected_efforts']} effort reconcilers (d_sens={d_sens})")
    problems = res["completeness_problems"] + res["validation_problems"]
    if problems:
        print(f"\n!! {len(problems)} accounting-lock or completeness violations:")
        for p in problems:
            print("   -", p)
    else:
        print("All accounting locks satisfied.")
    print(f"\nWrote: {', '.join(written)} -> {outdir}/")
    print()
    print(md)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

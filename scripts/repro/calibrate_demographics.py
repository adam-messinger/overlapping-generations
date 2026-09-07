"""Fit src/modules/demographics.ts to the UN WPP 2024 low-fertility variant.

Fertility paths and the 2025 observables are fitted here; the two-band working
cohort that the module actually runs lives in demog_mirror2.py, which carries
the final calibration of the childbearing span and the band death rates.
(demog_mirror.py mirrors the pre-recalibration single-band module and is kept
only to show the fit was validated against the original code.)

Targets: regional population, 0-19, 20-64 and 65+ cohorts, 2025-2100.
Levers, in order of preference: 2025 observables set directly from WPP, the
birth-formula's own exposure coefficients (which the module marks "stylized ...
not sourced data"), then the three fertility-convergence parameters per region.
Nothing structural changes -- no new parameters, no interface change.
"""
from __future__ import annotations
import json, sys
import numpy as np
import pandas as pd
from scipy.optimize import least_squares

sys.path.insert(0, "scripts/repro")
from demog_mirror import run, enrollment, REGIONS  # noqa: E402

DATA = "data/human-capital-repro"
YEARS = list(range(2025, 2101))


def wpp_targets():
    p = pd.read_csv(f"{DATA}/pop_age.csv")
    AGE = {f"{a}-{a+4}": a for a in range(0, 100, 5)}
    lo = p[p.series == "low"].copy()
    lo["a"] = lo.agegrp.map(AGE)
    t = {}
    for (r, y), g in lo.groupby(["region", "year"]):
        if y < 2025 or y > 2100:
            continue
        s = dict(zip(g.a, g.pop_thousands))
        tot = lambda a, b: sum(v for k, v in s.items() if a <= k <= b) * 1e3
        t[(r, y)] = dict(pop=tot(0, 100), young=tot(0, 15),
                         working=tot(20, 60), old=tot(65, 100))
    ind = pd.read_csv(f"{DATA}/wpp_low_indicators.csv")
    tfr = {(r.region, int(r.year)): float(r.tfr) for r in ind.itertuples() if r.tfr > 0}
    lex = {(r.region, int(r.year)): float(r.life_expectancy) for r in ind.itertuples()}
    births = {(r.region, int(r.year)): float(r.births) for r in ind.itertuples()}
    return t, tfr, lex, births


def fit_exposure(t, tfr, births):
    """Births-weighted span for the module's (wy*young + ww*working)*0.5/span."""
    best = None
    for wy in (0.25, 0.28, 0.30):
        for ww in (0.62, 0.65, 0.67, 0.70):
            num = den = 0.0
            for (r, y), tg in t.items():
                if (r, y) not in tfr:
                    continue
                num += tfr[(r, y)] * (wy * tg["young"] + ww * tg["working"]) * 0.5
                den += births[(r, y)]
            span = num / den
            drift = []
            for yr in (2025, 2050, 2075, 2100):
                pn = sum(tfr[(r, yr)] * (wy * t[(r, yr)]["young"] + ww * t[(r, yr)]["working"])
                         * 0.5 / span for r in REGIONS if (r, yr) in tfr)
                pb = sum(births[(r, yr)] for r in REGIONS if (r, yr) in tfr)
                drift.append(pn / pb - 1)
            score = float(np.sqrt(np.mean(np.square(drift))))
            if best is None or score < best[0]:
                best = (score, wy, ww, span, drift)
    return best


def fit_fertility(tfr):
    """Per region: TFR(t) = floor + (f0-floor)*exp(-decay*t) against WPP low."""
    out = {}
    for r in REGIONS:
        ys = np.array([y - 2025 for y in YEARS if (r, y) in tfr], float)
        vs = np.array([tfr[(r, y)] for y in YEARS if (r, y) in tfr], float)

        # The module's form is a monotone convergence to a floor, so constrain
        # floor <= f0 (parameterised as floor = f0 - gap, gap >= 0).  WPP low's
        # China and OECD paths are mildly U-shaped and cannot be represented;
        # the fit returns the best monotone approximation rather than inventing
        # a rising branch.
        def resid(p):
            f0, gap, dk = p
            return (f0 - gap) + gap * np.exp(-dk * ys) - vs

        p0 = [vs[0], max(1e-3, vs[0] - vs[-1]), 0.03]
        sol = least_squares(resid, p0, bounds=([0.4, 0.0, 0.002], [6.0, 4.0, 0.20]))
        f0, gap, dk = sol.x
        fl = f0 - gap
        out[r] = dict(fertility=round(float(f0), 3), fertilityFloor=round(float(fl), 3),
                      fertilityDecay=round(float(dk), 4),
                      rmse=float(np.sqrt(np.mean(resid(sol.x) ** 2))))
    return out


def score(res, t):
    """Relative error of the mirror against WPP low, by field."""
    rows = []
    for rec in res:
        y = rec["year"]
        for r in REGIONS:
            tg = t.get((r, y))
            if not tg:
                continue
            for f in ("pop", "young", "working", "old"):
                rows.append(dict(year=y, region=r, field=f,
                                 err=rec[f][r] / tg[f] - 1))
    return pd.DataFrame(rows)


if __name__ == "__main__":
    t, tfr, lex, births = wpp_targets()
    d = json.load(open("/tmp/demog_defaults.json"))

    sc, wy, ww, span, drift = fit_exposure(t, tfr, births)
    print(f"exposure fit: wy={wy} ww={ww} span={span:.2f}  world birth drift "
          + " ".join(f"{x:+.1%}" for x in drift))

    fert = fit_fertility(tfr)
    print("\nfertility fit (TFR path vs WPP low):")
    for r in REGIONS:
        f = fert[r]
        print(f"  {r:11s} f0={f['fertility']:5.3f} floor={f['fertilityFloor']:5.3f} "
              f"decay={f['fertilityDecay']:.4f}  rmse={f['rmse']:.3f}")

    # apply
    for r in REGIONS:
        tg = t[(r, 2025)]
        d["regions"][r].update(
            pop2025=tg["pop"],
            young=tg["young"] / tg["pop"], working=tg["working"] / tg["pop"],
            old=tg["old"] / tg["pop"], lifeExpectancy=lex[(r, 2025)],
            fertility=fert[r]["fertility"], fertilityFloor=fert[r]["fertilityFloor"],
            fertilityDecay=fert[r]["fertilityDecay"])
    gains = [(lex[(r, 2100)] - lex[(r, 2025)]) / 75 for r in REGIONS]
    d["lifeExpectancyGrowth"] = round(float(np.mean(gains)), 3)
    print(f"\nlifeExpectancyGrowth: {d['lifeExpectancyGrowth']} "
          f"(regional gains {min(gains):.3f}-{max(gains):.3f}/yr)")

    json.dump(dict(exposure=dict(wy=wy, ww=ww, span=round(span, 2)),
                   fertility=fert, lifeExpectancyGrowth=d["lifeExpectancyGrowth"],
                   regions2025={r: t[(r, 2025)] for r in REGIONS},
                   lifeExpectancy2025={r: lex[(r, 2025)] for r in REGIONS}),
              open(f"{DATA}/demographics_calibration.json", "w"), indent=1)

    res = run(d, enrollment, wy=wy, ww=ww, span=span)
    e = score(res, t)
    print("\nmirror vs WPP low, world-level relative error:")
    for y in (2025, 2050, 2075, 2100):
        row = []
        for f in ("pop", "young", "working", "old"):
            num = sum(rec[f][r] for rec in res if rec["year"] == y for r in REGIONS)
            den = sum(t[(r, y)][f] for r in REGIONS)
            row.append(f"{f} {num/den-1:+.1%}")
        print(f"  {y}: " + "  ".join(row))
    print("\nby region, |error| max over 2025-2100:")
    print(e.assign(a=e.err.abs()).groupby(["region", "field"]).a.max().unstack().round(3).to_string())

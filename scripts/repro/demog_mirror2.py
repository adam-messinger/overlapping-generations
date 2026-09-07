"""Two-band-workforce mirror of the demographics module, for calibration.

Working (20-64) is split into 20-44 and 45-64 so a retirement wave propagates
with a lag instead of draining at a flat 1/45 a year.  Kept in Python so the
calibration can run thousands of times; validated against the TypeScript module
once the parameters are applied.
"""
from __future__ import annotations
import math

REGIONS = ["us", "oecd-ex-us", "china", "india", "latam", "seasia", "russia", "mena", "ssa"]
W1_SPAN, W2_SPAN = 25.0, 20.0          # ages 20-44 and 45-64
EXPO_YOUNG, EXPO_W1, EXPO_W2 = 0.28, 1.00, 0.28
WORKING_MIGRANT_SHARE, MIGRANT_COLLEGE_SHARE = 0.8, 0.70
YOUNG_MIGRANT_SHARE, OLD_MIGRANT_SHARE = 0.15, 0.05
W1_MIGRANT_SHARE = 0.75                 # arrivals skew young within 20-64

# Remaining life expectancy at 65.  The module assumed LEx - 55, which
# overstates it by ~10 years once LEx reaches 90; fitted to UN WPP 2024 LE65
# across the nine regions, 2025-2100 (R2 0.944, max residual 2.8 yr).
LE65_A, LE65_B = 0.539, -23.14


def expconv(start, target, rate, years):
    return target + (start - target) * math.exp(-rate * years)


def run(d, span=35.9, dy=0.001, d1=0.0015, d2=0.005, years=76, le65=True,
        b1=0.0, b2=0.0, by=0.0):
    st = {}
    for r in REGIONS:
        pr = d["regions"][r]
        pop = pr["pop2025"]
        st[r] = dict(pop=pop, young=pr["young"] * pop,
                     w1=pr["workingYoung"] * pop, w2=pr["workingOlder"] * pop,
                     old=pr["old"] * pop, le=pr["lifeExpectancy"],
                     f0=pr["fertility"], ff=pr["fertilityFloor"],
                     fd=pr["fertilityDecay"], mr=pr["migrationRate"])
    out = []
    for i in range(years):
        inflow = sum(st[r]["pop"] * st[r]["mr"] for r in REGIONS if st[r]["mr"] > 0)
        outflow = -sum(st[r]["pop"] * st[r]["mr"] for r in REGIONS if st[r]["mr"] < 0)
        sc = outflow / inflow if inflow > 0 else 0.0
        rec = {"year": 2025 + i}
        new = {}
        for r in REGIONS:
            s = st[r]
            tfr = expconv(s["f0"], s["ff"], s["fd"], i)
            emr = 0.0 if inflow == 0 else (s["mr"] * sc if s["mr"] > 0 else s["mr"])
            mig = s["pop"] * emr
            entrants = s["young"] / 20
            if i == 0:
                new[r] = s
            else:
                births = tfr * (EXPO_YOUNG * s["young"] + EXPO_W1 * s["w1"]
                                + EXPO_W2 * s["w2"]) * 0.5 / span
                f12, f2o = s["w1"] / W1_SPAN, s["w2"] / W2_SPAN
                # working-age and child mortality fall with life expectancy
                le_gap = s["le"] - 75.0
                dy_r = dy * math.exp(-by * le_gap)
                d1_r = d1 * math.exp(-b1 * le_gap)
                d2_r = d2 * math.exp(-b2 * le_gap)
                young = max(0.0, s["young"] + births - entrants - s["young"] * dy_r)
                w1 = max(0.0, s["w1"] + entrants - f12 - s["w1"] * d1_r)
                w2 = max(0.0, s["w2"] + f12 - f2o - s["w2"] * d2_r)
                e65 = (max(10.0, LE65_A * s["le"] + LE65_B) if le65
                       else max(15.0, s["le"] - 55.0))
                old = max(0.0, s["old"] + f2o - s["old"] / e65)
                w1 += mig * WORKING_MIGRANT_SHARE * W1_MIGRANT_SHARE
                w2 += mig * WORKING_MIGRANT_SHARE * (1 - W1_MIGRANT_SHARE)
                young += mig * YOUNG_MIGRANT_SHARE
                old += mig * OLD_MIGRANT_SHARE
                new[r] = dict(pop=young + w1 + w2 + old, young=young, w1=w1, w2=w2,
                              old=old, le=s["le"] + d["lifeExpectancyGrowth"],
                              f0=s["f0"], ff=s["ff"], fd=s["fd"], mr=s["mr"])
            n = new[r]
            rec.setdefault("pop", {})[r] = n["pop"]
            rec.setdefault("young", {})[r] = n["young"]
            rec.setdefault("working", {})[r] = n["w1"] + n["w2"]
            rec.setdefault("old", {})[r] = n["old"]
            rec.setdefault("entrants", {})[r] = entrants
            rec.setdefault("tfr", {})[r] = tfr
        st = new
        out.append(rec)
    return out

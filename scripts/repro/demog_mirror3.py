"""Five-year-age-group mirror of the demographics module, for calibration.

Cohort transitions are structural (1/5 a year out of a 5-year group) instead of
a flat drain across a 20- or 45-year band, and the old ages are resolved too, so
the 65+ death rate is not pinned to its stationary-population value.
"""
from __future__ import annotations
import math

REGIONS = ["us", "oecd-ex-us", "china", "india", "latam", "seasia", "russia", "mena", "ssa"]
NG = 21                      # 0-4 ... 95-99 plus an open-ended 100+
W0, W1 = 4, 12               # working groups: 20-24 .. 60-64
OLD0 = 13                    # 65+ starts here
F0, F1 = 3, 9                # childbearing: 15-19 .. 45-49
ASFR = [0.07, 0.2, 0.26, 0.24, 0.15, 0.07, 0.01]
ASFR_SCALE = 0.997131
MORT_K = [0.15, 0.11273, 0.10938, 0.07191, 0.07526, 0.09996, 0.03602, 0.01856, 0.02285, 0.03898, 0.0513, 0.0577, 0.06094, 0.09305, 0.09332, 0.09271, 0.09185, 0.08835, 0.0769, 0.06281, 0.08253]
MORT = [0.0022655, 0.0011493, 0.0007347, 0.0001183, 7.48e-05, 0.0006757, 0.0019803, 0.0026052, 0.0033682, 0.0043062, 0.0058475, 0.0083135, 0.0120498, 0.0179335, 0.0272456, 0.042497, 0.0680744, 0.1097959, 0.1743085, 0.2577304, 0.4198243]
0.039900
WORKING_MIGRANT_SHARE, MIGRANT_COLLEGE_SHARE = 0.8, 0.70
YOUNG_MIGRANT_SHARE, OLD_MIGRANT_SHARE = 0.15, 0.05
MIG_W = [0.26, 0.26, 0.19, 0.12, 0.08, 0.05, 0.03, 0.01, 0.00]


def expconv(a, b, r, t):
    return b + (a - b) * math.exp(-r * t)


def run(d, years=76):
    st = {}
    for r in REGIONS:
        pr = d["regions"][r]
        pop = pr["pop2025"]
        st[r] = dict(pop=[s * pop for s in pr["ageDistribution"]], le=pr["lifeExpectancy"],
                     f0=pr["fertility"], ff=pr["fertilityFloor"], fd=pr["fertilityDecay"],
                     mr=pr["migrationRate"])
    out = []
    for i in range(years):
        inflow = sum(sum(st[r]["pop"]) * st[r]["mr"] for r in REGIONS if st[r]["mr"] > 0)
        outflow = -sum(sum(st[r]["pop"]) * st[r]["mr"] for r in REGIONS if st[r]["mr"] < 0)
        sc = outflow / inflow if inflow > 0 else 0.0
        rec = {"year": 2025 + i, "births": 0.0, "deaths": 0.0}
        new = {}
        for r in REGIONS:
            s = st[r]; p = s["pop"]
            tfr = expconv(s["f0"], s["ff"], s["fd"], i)
            emr = 0.0 if inflow == 0 else (s["mr"] * sc if s["mr"] > 0 else s["mr"])
            mig = sum(p) * emr
            entrants = p[3] / 5.0
            if i == 0:
                new[r] = s
            else:
                gap = s["le"] - 75.0
                m = [MORT[g] * math.exp(-MORT_K[g] * gap) for g in range(NG)]
                births = tfr * 0.1 * ASFR_SCALE * sum(ASFR[g - F0] * p[g] for g in range(F0, F1 + 1))
                q = [0.0] * NG
                for g in range(NG - 1):
                    ing = births if g == 0 else p[g - 1] / 5.0
                    q[g] = max(0.0, p[g] + ing - p[g] / 5.0 - p[g] * m[g])
                q[NG - 1] = max(0.0, p[NG - 1] + p[NG - 2] / 5.0 - p[NG - 1] * m[NG - 1])
                rec["births"] += births
                rec["deaths"] += sum(p[g] * m[g] for g in range(NG))
                for j, wgt in enumerate(MIG_W):
                    q[W0 + j] += mig * WORKING_MIGRANT_SHARE * wgt
                yt = sum(q[:4]) or 1.0
                for g in range(4):
                    q[g] += mig * YOUNG_MIGRANT_SHARE * q[g] / yt
                ot = sum(q[OLD0:]) or 1.0
                for g in range(OLD0, NG):
                    q[g] += mig * OLD_MIGRANT_SHARE * q[g] / ot
                new[r] = dict(pop=q, le=s["le"] + d["lifeExpectancyGrowth"],
                              f0=s["f0"], ff=s["ff"], fd=s["fd"], mr=s["mr"])
            n = new[r]["pop"]
            rec.setdefault("pop", {})[r] = sum(n)
            rec.setdefault("young", {})[r] = sum(n[:4])
            rec.setdefault("working", {})[r] = sum(n[W0:W1 + 1])
            rec.setdefault("old", {})[r] = sum(n[OLD0:])
            rec.setdefault("entrants", {})[r] = entrants
            rec.setdefault("tfr", {})[r] = tfr
        st = new
        out.append(rec)
    return out

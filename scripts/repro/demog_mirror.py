"""Exact Python mirror of src/modules/demographics.ts cohort dynamics.

Used only to calibrate the fertility parameters against UN WPP 2024 low; the
mirror is validated against the TypeScript module before any fit is trusted.
"""
from __future__ import annotations
import json, math

REGIONS = ["us", "oecd-ex-us", "china", "india", "latam", "seasia", "russia", "mena", "ssa"]
WORKING_MIGRANT_SHARE, MIGRANT_COLLEGE_SHARE = 0.8, 0.70
YOUNG_MIGRANT_SHARE, OLD_MIGRANT_SHARE = 0.15, 0.05


def logistic(start, ceiling, rate, years):
    if start >= ceiling:
        return ceiling
    if start <= 0:
        return 0.0
    if rate <= 0:
        return start
    midpoint = math.log((ceiling - start) / start) / rate
    return ceiling / (1 + math.exp(-rate * (years - midpoint)))


def enrollment(e, i):
    return logistic(e["enrollmentRate2025"], e["enrollmentTarget"], e["enrollmentGrowth"] * 10, i)


def expconv(start, target, rate, years):
    return target + (start - target) * math.exp(-rate * years)


def run(defaults, enroll_fn, years=76, wy=0.25, ww=0.65, span=32.0):
    st = {}
    for r in REGIONS:
        p, e = defaults["regions"][r], defaults["education"][r]
        pop = p["pop2025"]
        y, w, o = p["young"] * pop, p["working"] * pop, p["old"] * pop
        st[r] = dict(pop=pop, young=y, working=w, old=o,
                     wc=w * e["collegeShare2025"], wn=w * (1 - e["collegeShare2025"]),
                     oc=o * e["collegeShare2025"] * 0.5, on=o - o * e["collegeShare2025"] * 0.5,
                     le=p["lifeExpectancy"],
                     f0=p["fertility"],
                     ff=p["fertilityFloor"] * defaults["fertilityFloorMultiplier"],
                     fd=p["fertilityDecay"],
                     mr=p["migrationRate"] * defaults["migrationMultiplier"])
    out = []
    for i in range(years):
        year = 2025 + i
        inflow = sum(st[r]["pop"] * st[r]["mr"] for r in REGIONS if st[r]["mr"] > 0)
        outflow = -sum(st[r]["pop"] * st[r]["mr"] for r in REGIONS if st[r]["mr"] < 0)
        scale = outflow / inflow if inflow > 0 else 0.0
        rec = {"year": year}
        new = {}
        for r in REGIONS:
            s = st[r]
            e = defaults["education"][r]
            tfr = expconv(s["f0"], s["ff"], s["fd"], i)
            emr = 0.0 if inflow == 0 else (s["mr"] * scale if s["mr"] > 0 else s["mr"])
            mig = s["pop"] * emr
            entrants = s["young"] / 20
            enroll = enroll_fn(e, i)
            rec.setdefault("tfr", {})[r] = tfr
            rec.setdefault("entrants", {})[r] = entrants
            if i == 0:
                new[r] = s
            else:
                pop = s["pop"]
                ys, ws = s["young"] / pop, s["working"] / pop
                births = (tfr * (ys * wy + ws * ww) * 0.5 / span) * pop
                a_y, a_w = entrants, s["working"] / 45
                yd, wd = s["young"] * 0.001, s["working"] * 0.003
                tw = s["wc"] + s["wn"]
                cs = s["wc"] / tw if tw > 0 else 0.5
                base = max(15, s["le"] - 55)
                mc = 1 / (base + e["lifeBonusCollege"] * 0.5)
                mn = 1 / max(10, base - e["lifePenaltyNonCollege"] * 0.5)
                odc, odn = min(s["oc"] * mc, s["oc"]), min(s["on"] * mn, s["on"])
                wc = max(0, s["wc"] + a_y * enroll - a_w * cs - wd * cs)
                wn = max(0, s["wn"] + a_y * (1 - enroll) - a_w * (1 - cs) - wd * (1 - cs))
                oc = max(0, s["oc"] + a_w * cs - odc)
                on = max(0, s["on"] + a_w * (1 - cs) - odn)
                young = max(0, s["young"] + births - a_y - yd)
                wc += mig * WORKING_MIGRANT_SHARE * MIGRANT_COLLEGE_SHARE
                wn += mig * WORKING_MIGRANT_SHARE * (1 - MIGRANT_COLLEGE_SHARE)
                young += mig * YOUNG_MIGRANT_SHARE
                old = oc + on + mig * OLD_MIGRANT_SHARE
                oc += mig * OLD_MIGRANT_SHARE * 0.5
                on += mig * OLD_MIGRANT_SHARE * 0.5
                working = wc + wn
                new[r] = dict(pop=young + working + old, young=young, working=working, old=old,
                              wc=wc, wn=wn, oc=oc, on=on,
                              le=s["le"] + defaults["lifeExpectancyGrowth"],
                              f0=s["f0"], ff=s["ff"], fd=s["fd"], mr=s["mr"])
            rec.setdefault("pop", {})[r] = new[r]["pop"]
            rec.setdefault("young", {})[r] = new[r]["young"]
            rec.setdefault("working", {})[r] = new[r]["working"]
            rec.setdefault("old", {})[r] = new[r]["old"]
        st = new
        out.append(rec)
    return out

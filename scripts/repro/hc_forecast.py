"""2025-2100 human-capital vintage ledger, built from the brief alone.

Annual ledger.  Every region holds vintages of workforce members; each vintage
carries a headcount, the replacement cost it was booked at (in the region's own
2025 dollars, so the whole ledger is already constant-cost), and how many years
it is into the workforce.  Book value per head is C * max(0, 1 - k / L), with L
the current expected years in the workforce, so a change in L revalues the
stock and the ledger closes exactly:

    dStock = net investment + migration transfer + life revaluation
"""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hc_ledger as L  # noqa: E402

DATA = os.environ.get("OUT", "data/human-capital-repro")
YEARS = list(range(2025, 2101))
AGE_MID = {f"{a}-{a+4}": a + 2.5 for a in range(0, 100, 5)}

# Entrant tertiary-attainment ceilings (tertiary + advanced share of entrants).
# The brief says enrolment rises "toward regional targets" without naming them;
# these are mine, anchored on current OECD tertiary attainment of 25-34 year
# olds and the observed pace of catch-up elsewhere.
TERTIARY_TARGET = {
    "us": 0.75, "oecd-ex-us": 0.70, "china": 0.65, "india": 0.45, "latam": 0.55,
    "seasia": 0.50, "russia": 0.70, "mena": 0.45, "ssa": 0.30,
}
TERTIARY_TAU = 35.0          # years to close 1-1/e of the gap to the target
NONE_FLOOR, PRIMARY_FLOOR = 0.005, 0.02

MIGRANT_WORKING_SHARE = 0.80  # share of net migration that is working-age
MIGRANT_COLLEGE_SHARE = 0.70  # share of working-age migrants with tertiary+
MIGRANT_TENURE = 10.0         # mean years already in the workforce on arrival

# GDP per capita path.  The brief drives this from the energy model; with no
# such model here I use a transparent convergence rule: the frontier grows at
# FRONTIER_GROWTH and every other region closes CONVERGENCE of its log gap to
# the frontier each year.  Only the current-dollar figures depend on it.
FRONTIER_GROWTH = 0.015
CONVERGENCE = 0.015

# Market-exchange-rate GDP per capita, 2025, $ per person (my own aggregation of
# IMF WEO country nominal GDP over the WPP populations of each region).  Only
# used by the "market" price base; the default is Maddison 2011 PPP dollars.
GDPPC_MARKET_2025 = {
    "us": 88400.0, "oecd-ex-us": 39600.0, "china": 13400.0, "india": 2640.0,
    "latam": 10400.0, "seasia": 5820.0, "russia": 7480.0, "mena": 7560.0,
    "ssa": 1620.0,
}


@dataclass
class Vintage:
    band: str
    cohort: str          # "own" (native + the 2025 seed) or "imm" (post-2025 arrival)
    n: float             # headcount
    cost: float          # booked replacement cost per head, constant 2025 $
    k: float             # years already in the workforce


@dataclass
class RegionState:
    region: str
    vintages: list = field(default_factory=list)
    unit_cost: dict = field(default_factory=dict)     # constant 2025 unit cost by band
    life: dict = field(default_factory=dict)          # current useful life by band
    base_le: float = 75.0


def bv(v: Vintage, life: dict) -> float:
    lb = life[v.band]
    return v.cost * max(0.0, 1.0 - v.k / lb) if lb > 0 else 0.0


# China's 2025 stock tertiary share, NBS census "junior college and above"
# extrapolated from 15.5% in 2020 -- the same override the backcast applies.
CHINA_TERTIARY_2025 = 18.5


# The brief says "UN WPP 2024 low-fertility variant", but the study's own
# demographics reach 8.5bn in 2100 while the true low variant reaches 7.0bn.
# BLEND_LAMBDA mixes medium into low so the world path matches the study's.
BLEND_LAMBDA = 0.474


def load_inputs(variant="low"):
    pop = pd.read_csv(f"{DATA}/pop_age.csv")
    if variant == "blend":
        lo = pop[pop.series == "low"].set_index(["region", "year", "agegrp"]).pop_thousands
        me = pop[pop.series == "medium"].set_index(["region", "year", "agegrp"]).pop_thousands
        mixed = (lo * (1 - BLEND_LAMBDA) + me * BLEND_LAMBDA).dropna().reset_index()
        mixed["series"] = "blend"
        pop = pd.concat([pop, mixed])
    low = pop[(pop.series == variant) | ((pop.series == "estimate") & (pop.year < 2024))]
    p019, p2064, ptot = {}, {}, {}
    for (reg, yr), g in low.groupby(["region", "year"]):
        s = dict(zip(g.agegrp, g.pop_thousands))
        ptot[(reg, yr)] = sum(s.values()) * 1e3
        p019[(reg, yr)] = sum(v for k, v in s.items() if AGE_MID.get(k, 999) < 20) * 1e3
        p2064[(reg, yr)] = sum(v for k, v in s.items()
                               if 20 <= AGE_MID.get(k, 999) <= 64) * 1e3
    le = pd.read_csv(f"{DATA}/life_expectancy.csv")
    lex = {(r.region, int(r.year)): float(r.life_expectancy) for r in le.itertuples()}
    mig = {(r.region, int(r.year)): float(r.net_migration_thousands) * 1e3
           for r in le.itertuples()}
    gdp = pd.read_csv(f"{DATA}/gdppc_maddison.csv")
    g22 = {r.region: float(r.gdppc) for r in gdp[gdp.year == 2022].itertuples()}
    g10 = {r.region: float(r.gdppc) for r in gdp[gdp.year == 2010].itertuples()}
    gdppc2025 = {r: g22[r] * ((g22[r] / g10[r]) ** (1 / 12)) ** 3 for r in g22}
    mix = pd.read_csv(f"{DATA}/attain_2564.csv")
    mix25 = {r.region: (r.lu, r.lp, r.ls, r.lh)
             for r in mix[(mix.year == 2025)].itertuples()}
    lu, lp, ls, lh = mix25["china"]
    f = (100.0 - CHINA_TERTIARY_2025) / (lu + lp + ls)
    mix25["china"] = (lu * f, lp * f, ls * f, CHINA_TERTIARY_2025)
    e = pd.read_csv(f"{DATA}/attain_1524.csv")
    ent25 = {r.region: (r.lu, r.lp, r.ls, r.lh)
             for r in e[(e.year == 2030)].itertuples()}
    return p019, p2064, ptot, lex, mig, gdppc2025, mix25, ent25


def gdppc_path(gdppc2025):
    frontier = max(gdppc2025.values())
    path = {(r, 2025): v for r, v in gdppc2025.items()}
    cur = dict(gdppc2025)
    f = frontier
    import math
    for y in range(2026, 2101):
        f *= 1 + FRONTIER_GROWTH
        for r in cur:
            gap = math.log(f / cur[r]) if cur[r] > 0 else 0.0
            cur[r] *= (1 + FRONTIER_GROWTH) * math.exp(CONVERGENCE * gap)
            path[(r, y)] = cur[r]
    return path


def entrant_mix(region, base, year, adv, tgt=None, tau=TERTIARY_TAU):
    """Entrant band shares: tertiary rises toward the regional target."""
    import math
    lu, lp, ls, lh = base
    tot = lu + lp + ls + lh
    lu, lp, ls, lh = (x / tot for x in (lu, lp, ls, lh))
    tgt = tgt or TERTIARY_TARGET
    w = 1.0 - math.exp(-(year - 2025) / tau)
    ter = lh + (tgt[region] - lh) * w
    none = lu + (NONE_FLOOR - lu) * w
    pri = lp + (PRIMARY_FLOOR - lp) * w
    sec = max(0.0, 1.0 - ter - none - pri)
    a = adv[region]
    return {"none": none, "primary": pri, "secondary": sec,
            "tertiary": ter * (1 - a), "advanced": ter * a}


def run(scale=None, rearing=L.REARING_SHARE, foregone=L.FOREGONE_SHARE,
        adv=None, migration=True, seed="population", prices="maddison",
        tertiary_target=None, tertiary_tau=TERTIARY_TAU, variant="low",
        working_share=MIGRANT_WORKING_SHARE, tenure=MIGRANT_TENURE):
    """seed: "population" spreads the 2025 population aged 20-64 uniformly over
    the 45 single-year ages and thins each by the survival curve; "flow" instead
    builds a stationary workforce from the 2025 entrant flow, which is what
    forces the brief's "2025 investment = charge" identity to hold."""
    adv = adv or L.ADVANCED_SHARE
    tgt = tertiary_target or TERTIARY_TARGET
    p019, p2064, ptot, lex, mig, gdppc2025, mix25, ent25 = load_inputs(variant)
    if prices == "market":
        gdppc2025 = dict(GDPPC_MARKET_2025)
    gpath = gdppc_path(gdppc2025)

    st: dict[str, RegionState] = {}
    for r in L.REGIONS:
        base_le = lex[(r, 2025)]
        c = L.band_costs(r, gdppc2025[r], base_le, base_le, rearing, foregone, scale)
        s = RegionState(r, unit_cost=dict(c.unit_cost), life=dict(c.useful_life),
                        base_le=base_le)
        # Seed: the 2025 population aged 20-64 spread uniformly over the 45
        # single-year ages, each age thinned by the survival curve.  The
        # thinning is a genuine reduction, not a reshaping -- it is what makes
        # the seeded *workforce* smaller than the population of that age range.
        shares = L.split_attainment(*mix25[r], adv[r])
        head = p2064[(r, 2025)]
        density = (head / 45.0) if seed == "population" else (p019[(r, 2025)] / 20.0)
        for b in L.BANDS:
            entry = L.BAND_SPEC[b][0]
            curve = L.survival_curve(b, r, base_le, base_le, scale)
            for k in range(len(curve)):
                if seed == "population" and not 20 <= entry + k <= 64:
                    continue
                s.vintages.append(Vintage(b, "own", density * shares[b] * curve[k],
                                          c.unit_cost[b], float(k)))
        st[r] = s

    rows = []
    for r in L.REGIONS:
        rows.append(dict(region=r, year=2025,
                         stock=sum(v.n * bv(v, st[r].life) for v in st[r].vintages),
                         head=sum(v.n for v in st[r].vintages), imm_head=0.0,
                         investment=0.0, depreciation=0.0, writeoff=0.0,
                         mig_in=0.0, mig_out=0.0, revaluation=0.0,
                         charge_own=0.0, charge_imm=0.0, gdppc=gpath[(r, 2025)]))

    for y in range(2026, 2101):
        pool_out, want_in = {}, {}
        flows = {}
        for r in L.REGIONS:
            s = st[r]
            le_prev, le_now = lex[(r, y - 1)], lex[(r, y)]
            life_prev = dict(s.life)
            c = L.band_costs(r, gdppc2025[r], le_now, s.base_le, rearing, foregone, scale)
            s.life = dict(c.useful_life)
            retire = c.retire

            dep = wo = reval = 0.0
            dep_own = wo_own = dep_imm = wo_imm = 0.0
            alive = []
            for v in s.vintages:
                b0 = v.cost * max(0.0, 1.0 - v.k / life_prev[v.band]) if life_prev[v.band] else 0.0
                b1 = bv(v, s.life)
                reval += v.n * (b1 - b0)
                age = L.BAND_SPEC[v.band][0] + v.k
                b2 = v.cost * max(0.0, 1.0 - (v.k + 1) / s.life[v.band]) if s.life[v.band] else 0.0
                d = v.n * (b1 - b2)
                dep += d
                h = L.hazard(v.band, age, v.k, r, le_now, scale)
                exits = v.n * h
                retiring = (age + 1) >= retire[v.band]
                if retiring:
                    exits = v.n
                w = exits * b2
                wo += w
                if v.cohort == "own":
                    dep_own += d
                    wo_own += w
                else:
                    dep_imm += d
                    wo_imm += w
                v.n -= exits
                v.k += 1
                if v.n > 1.0 and not retiring:
                    alive.append(v)
            s.vintages = alive

            # entrants
            ent = p019[(r, y)] / 20.0
            em = entrant_mix(r, ent25[r], y, adv, tgt, tertiary_tau)
            inv = 0.0
            for b in L.BANDS:
                n = ent * em[b]
                if n <= 0:
                    continue
                s.vintages.append(Vintage(b, "own", n, c.unit_cost[b], 0.0))
                inv += n * c.unit_cost[b]

            m = mig.get((r, y), 0.0) * working_share if migration else 0.0
            if m >= 0:
                want_in[r] = m
            else:
                pool_out[r] = -m
            flows[r] = dict(dep=dep, wo=wo, reval=reval, inv=inv,
                            dep_own=dep_own, wo_own=wo_own,
                            dep_imm=dep_imm, wo_imm=wo_imm)

        # close the world: scale gross inflows and outflows to the smaller side
        tin, tout = sum(want_in.values()), sum(pool_out.values())
        if tin > 0 and tout > 0:
            total = min(tin, tout)
            want_in = {r: v * total / tin for r, v in want_in.items()}
            pool_out = {r: v * total / tout for r, v in pool_out.items()}
        else:
            want_in = {r: 0.0 for r in want_in}
            pool_out = {r: 0.0 for r in pool_out}

        mig_out_val = {r: 0.0 for r in L.REGIONS}
        mig_in_val = {r: 0.0 for r in L.REGIONS}
        for r, out in pool_out.items():
            s = st[r]
            a = adv[r]
            mixm = {"tertiary": MIGRANT_COLLEGE_SHARE * (1 - a),
                    "advanced": MIGRANT_COLLEGE_SHARE * a}
            rest = 1.0 - MIGRANT_COLLEGE_SHARE
            heads = {b: sum(v.n for v in s.vintages if v.band == b) for b in L.BANDS}
            nonc = sum(heads[b] for b in ("none", "primary", "secondary")) or 1.0
            for b in ("none", "primary", "secondary"):
                mixm[b] = rest * heads[b] / nonc
            for b, sh in mixm.items():
                take = out * sh
                pool = heads[b]
                if pool <= 0:
                    continue
                f = min(1.0, take / pool)
                for v in s.vintages:
                    if v.band != b:
                        continue
                    leave = v.n * f
                    mig_out_val[r] += leave * bv(v, s.life)
                    v.n -= leave
        for r, inn in want_in.items():
            s = st[r]
            a = adv[r]
            mixm = {"tertiary": MIGRANT_COLLEGE_SHARE * (1 - a),
                    "advanced": MIGRANT_COLLEGE_SHARE * a}
            rest = 1.0 - MIGRANT_COLLEGE_SHARE
            heads = {b: sum(v.n for v in s.vintages if v.band == b) for b in L.BANDS}
            nonc = sum(heads[b] for b in ("none", "primary", "secondary")) or 1.0
            for b in ("none", "primary", "secondary"):
                mixm[b] = rest * heads[b] / nonc
            for b, sh in mixm.items():
                n = inn * sh
                if n <= 0:
                    continue
                v = Vintage(b, "imm", n, s.unit_cost[b], tenure)
                mig_in_val[r] += n * bv(v, s.life)
                s.vintages.append(v)

        for r in L.REGIONS:
            s, f = st[r], flows[r]
            rows.append(dict(
                region=r, year=y,
                stock=sum(v.n * bv(v, s.life) for v in s.vintages),
                head=sum(v.n for v in s.vintages),
                imm_head=sum(v.n for v in s.vintages if v.cohort == "imm"),
                investment=f["inv"], depreciation=f["dep"], writeoff=f["wo"],
                mig_in=mig_in_val[r], mig_out=mig_out_val[r], revaluation=f["reval"],
                charge_own=f["dep_own"] + f["wo_own"],
                charge_imm=f["dep_imm"] + f["wo_imm"],
                gdppc=gpath[(r, y)]))
    df = pd.DataFrame(rows)
    df["net_own"] = df.investment - df.charge_own
    df["net_total"] = df.net_own + df.mig_in - df.mig_out - df.charge_imm
    return df


if __name__ == "__main__":
    df = run()
    df.to_csv(f"{DATA}/forecast_regions.csv", index=False)
    w = df.groupby("year").sum(numeric_only=True)
    w["index"] = w.stock / w.stock.loc[2025]
    resid = (w.stock.diff() - (w.investment - w.depreciation - w.writeoff
             + w.mig_in - w.mig_out + w.revaluation)).abs().max()
    print("max |residual| in the world decomposition: %.3e" % resid)
    print(w.loc[[2025, 2030, 2040, 2050, 2060, 2063, 2070, 2080, 2100],
                ["index", "stock", "investment", "depreciation", "writeoff",
                 "revaluation", "net_own", "net_total"]].to_string())
    print("peak", w["index"].idxmax(), round(w["index"].max(), 4))

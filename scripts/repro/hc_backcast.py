"""1925-2025 backcast of the human-capital stock, built from the brief alone."""
from __future__ import annotations

import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hc_ledger as L  # noqa: E402

DATA = os.environ.get("OUT", "data/human-capital-repro")
YEARS = list(range(1925, 2026, 5))
AGE_MID = {f"{a}-{a+4}": a + 2.5 for a in range(0, 100, 5)}

# China tertiary overrides.  NBS census "junior college and above" share of the
# adult population (2000/2010/2020) and MoE tertiary gross enrolment for the
# entrant cohort; the brief pins the census numbers.
CHINA_STOCK_TERTIARY = {2000: 3.6, 2010: 8.9, 2020: 15.5}
CHINA_ENTRANT_TERTIARY = {2000: 12.5, 2005: 20.0, 2010: 26.5,
                          2015: 40.0, 2020: 54.4, 2025: 60.2}


def _interp(series: dict, year: int):
    """Linear interpolation / flat extrapolation over an int-keyed dict."""
    if not series:
        return None
    ks = sorted(series)
    if year <= ks[0]:
        return series[ks[0]]
    if year >= ks[-1]:
        return series[ks[-1]]
    for a, b in zip(ks, ks[1:]):
        if a <= year <= b:
            w = 0.0 if b == a else (year - a) / (b - a)
            return series[a] * (1 - w) + series[b] * w


def load():
    pop = pd.read_csv(f"{DATA}/pop_age.csv")
    # WPP estimates run to 2024; take 2025 from the projection so the backcast
    # ends on an observed-population year rather than an extrapolation.
    est = pd.concat([pop[pop.series == "estimate"],
                     pop[(pop.series == "low") & (pop.year == 2025)]])
    pop2564 = {}
    pop2024 = {}
    poptot = {}
    for (reg, yr), g in est.groupby(["region", "year"]):
        s = dict(zip(g.agegrp, g.pop_thousands))
        poptot[(reg, yr)] = sum(s.values()) * 1e3
        pop2564[(reg, yr)] = sum(v for k, v in s.items()
                                 if 25 <= AGE_MID.get(k, 999) <= 64) * 1e3
        pop2024[(reg, yr)] = s.get("20-24", 0.0) * 1e3

    pre = pd.read_csv(f"{DATA}/pop_total_pre1950.csv")
    pre_tot = {(r.region, int(r.year)): float(r.population_historical)
               for r in pre.itertuples()}

    gdp = pd.read_csv(f"{DATA}/gdppc_maddison.csv")
    gdppc = {(r.region, int(r.year)): float(r.gdppc) for r in gdp.itertuples()}

    le = pd.read_csv(f"{DATA}/life_expectancy.csv")
    lex = {(r.region, int(r.year)): float(r.life_expectancy) for r in le.itertuples()}

    def mix_table(path):
        d = pd.read_csv(path)
        out = {}
        for r in d.itertuples():
            out.setdefault((r.region, int(r.year)), (r.lu, r.lp, r.ls, r.lh))
        return out

    return dict(
        pop2564=pop2564, pop2024=pop2024, poptot=poptot, pre_tot=pre_tot,
        gdppc=gdppc, lex=lex,
        mix2564=mix_table(f"{DATA}/attain_2564.csv"),
        mix1524=mix_table(f"{DATA}/attain_1524.csv"),
        by_age=pd.read_csv(f"{DATA}/attain_by_age.csv"),
    )


def series_for(src, reg):
    """Per-region interpolated series over YEARS."""
    # population: WPP 1950+, OWID total x the 1950 age shares before that
    p2564 = {y: src["pop2564"][(reg, y)] for y in range(1950, 2026)
             if (reg, y) in src["pop2564"]}
    p2024 = {y: src["pop2024"][(reg, y)] for y in range(1950, 2026)
             if (reg, y) in src["pop2024"]}
    ptot = {y: src["poptot"][(reg, y)] for y in range(1950, 2026)
            if (reg, y) in src["poptot"]}
    share2564 = p2564[1950] / ptot[1950]
    share2024 = p2024[1950] / ptot[1950]
    for y in range(1900, 1950):
        t = src["pre_tot"].get((reg, y))
        if t:
            ptot[y] = t
            p2564[y] = t * share2564
            p2024[y] = t * share2024
    # GDP per capita: Maddison to 2022, then the region's 2010-2022 trend
    g = {y: v for (r, y), v in src["gdppc"].items() if r == reg}
    if 2022 in g and 2010 in g:
        cagr = (g[2022] / g[2010]) ** (1 / 12) - 1
        for y in (2023, 2024, 2025):
            g[y] = g[2022] * (1 + cagr) ** (y - 2022)
    lex = {y: v for (r, y), v in src["lex"].items() if r == reg}
    m64 = {y: v for (r, y), v in src["mix2564"].items() if r == reg}
    m24 = {y: v for (r, y), v in src["mix1524"].items() if r == reg}
    return p2564, p2024, ptot, g, lex, m64, m24


def run(scale=None, rearing=L.REARING_SHARE, foregone=L.FOREGONE_SHARE,
        adv=None) -> pd.DataFrame:
    src = load()
    adv = adv or L.ADVANCED_SHARE
    pop = pd.read_csv(f"{DATA}/pop_age.csv")
    est = pd.concat([pop[pop.series == "estimate"],
                     pop[(pop.series == "low") & (pop.year == 2025)]])
    age_dist = {}
    for (reg, yr), g in est.groupby(["region", "year"]):
        age_dist[(reg, yr)] = {k: v * 1e3 for k, v in zip(g.agegrp, g.pop_thousands)
                               if 25 <= AGE_MID.get(k, 999) <= 64}
    by_age = {}
    for r in src["by_age"].itertuples():
        by_age[(r.region, int(r.year), int(r.agefrom))] = (r.lu, r.lp, r.ls, r.lh)

    rows = []
    for reg in L.REGIONS:
        p2564, p2024, ptot, g, lex, m64, m24 = series_for(src, reg)
        base_le = _interp(lex, 2025)
        gdppc2025 = _interp(g, 2025)
        costs2025 = L.band_costs(reg, gdppc2025, base_le, base_le, rearing, foregone, scale)
        for y in YEARS:
            gd = _interp(g, y)
            le = _interp(lex, max(y, 1950))
            c = L.band_costs(reg, gd, le, base_le, rearing, foregone, scale)
            lu, lp, ls, lh = _interp_mix(m64, y)
            if reg == "china":
                lh = _interp(CHINA_STOCK_TERTIARY, y) if y >= 2000 else lh
                lu, lp, ls = _rescale(lu, lp, ls, 100.0 - lh)
            sh = L.split_attainment(lu, lp, ls, lh, adv[reg])
            n = p2564.get(y) or _interp(p2564, y)
            gross_cur = n * sum(sh[b] * c.unit_cost[b] for b in L.BANDS)
            gross_con = n * sum(sh[b] * costs2025.unit_cost[b] for b in L.BANDS)

            # net of depreciation, using the age distribution inside 25-64
            net_cur = net_con = None
            dist = age_dist.get((reg, y))
            if dist:
                net_cur = net_con = 0.0
                for ag, pa in dist.items():
                    mid = AGE_MID[ag]
                    key = (reg, y - (y % 5), int(mid - 2.5))
                    ba = by_age.get((reg, y, int(mid - 2.5)))
                    mix_a = ba if ba else (lu, lp, ls, lh)
                    if reg == "china" and y >= 2000:
                        a0, a1, a2, _ = mix_a
                        a0, a1, a2 = _rescale(a0, a1, a2, 100.0 - lh)
                        mix_a = (a0, a1, a2, lh)
                    sa = L.split_attainment(*mix_a, adv[reg])
                    for b in L.BANDS:
                        entry = L.BAND_SPEC[b][0]
                        life = c.useful_life[b]
                        rem = max(0.0, min(1.0, 1.0 - (mid - entry) / life)) if life else 0.0
                        net_cur += pa * sa[b] * c.unit_cost[b] * rem
                        net_con += pa * sa[b] * costs2025.unit_cost[b] * rem

            # entrants: the 20-24 cohort divided by five, carrying the
            # attainment mix of today's 15-24 year olds five years on
            e = (p2024.get(y) or _interp(p2024, y)) / 5.0
            eu, ep, es, eh = _interp_mix(m24, y + 5)
            if reg == "china" and y >= 2000:
                eh = _interp(CHINA_ENTRANT_TERTIARY, y)
                eu, ep, es = _rescale(eu, ep, es, 100.0 - eh)
            esh = L.split_attainment(eu, ep, es, eh, adv[reg])
            inv_cur = e * sum(esh[b] * c.unit_cost[b] for b in L.BANDS)
            inv_con = e * sum(esh[b] * costs2025.unit_cost[b] for b in L.BANDS)
            gdp = gd * (ptot.get(y) or _interp(ptot, y))
            rows.append(dict(region=reg, year=y, pop=ptot.get(y) or _interp(ptot, y),
                             pop2564=n, entrants=e, gdppc=gd, gdp=gdp,
                             gross_cur=gross_cur, gross_con=gross_con,
                             net_cur=net_cur, net_con=net_con,
                             inv_cur=inv_cur, inv_con=inv_con,
                             tert_stock=sh["tertiary"] + sh["advanced"]))
    return pd.DataFrame(rows)


def _interp_mix(table, year):
    ks = sorted(table)
    if year <= ks[0]:
        return table[ks[0]]
    if year >= ks[-1]:
        return table[ks[-1]]
    for a, b in zip(ks, ks[1:]):
        if a <= year <= b:
            w = 0.0 if b == a else (year - a) / (b - a)
            return tuple(table[a][i] * (1 - w) + table[b][i] * w for i in range(4))


def _rescale(lu, lp, ls, target):
    s = lu + lp + ls
    if s <= 0:
        return 0.0, 0.0, target
    f = target / s
    return lu * f, lp * f, ls * f


if __name__ == "__main__":
    df = run()
    df.to_csv(f"{DATA}/backcast_regions.csv", index=False)
    w = df.groupby("year").agg(
        pop=("pop", "sum"), pop2564=("pop2564", "sum"), entrants=("entrants", "sum"),
        gross_cur=("gross_cur", "sum"), gross_con=("gross_con", "sum"),
        net_cur=("net_cur", "sum"), net_con=("net_con", "sum"),
        inv_cur=("inv_cur", "sum"), inv_con=("inv_con", "sum"), gdp=("gdp", "sum"))
    w["inv_gdp"] = w.inv_cur / w.gdp
    w["index_con"] = w.gross_con / w.gross_con.loc[2025]
    w.to_csv(f"{DATA}/backcast_world.csv")
    print(w[["pop2564", "gross_con", "net_con", "inv_gdp", "index_con"]].to_string())

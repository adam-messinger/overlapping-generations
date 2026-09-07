"""Build the regional source panels for the independent human-capital reproduction.

Reads the raw downloads (UN WPP 2024, Maddison Project 2023, Lee-Lee 2016 /
Barro-Lee v3 + projections, OWID population) and writes small tidy CSVs to
data/human-capital-repro/.  Run with RAW=<dir> pointing at the downloads.
"""
from __future__ import annotations

import csv
import gzip
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hc_regions import NAME_TO_ISO, REGIONS, _OVERRIDE, _SUBREGION  # noqa: E402

RAW = os.environ.get("RAW", "raw")
OUT = os.environ.get("OUT", "data/human-capital-repro")
os.makedirs(OUT, exist_ok=True)

AGE_GRPS = [f"{a}-{a+4}" for a in range(0, 100, 5)] + ["100+"]


def _region(iso3, parent):
    if iso3 in _OVERRIDE:
        return _OVERRIDE[iso3]
    try:
        return _SUBREGION.get(int(parent))
    except (TypeError, ValueError):
        return None


def wpp_panel(path, variant, years):
    """region x year x agegrp population (thousands) from a WPP CSV.gz."""
    acc: dict[tuple[str, int, str], float] = {}
    iso_map: dict[str, str] = {}
    with gzip.open(path, "rt", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row["LocTypeName"] != "Country/Area" or row["Variant"] != variant:
                continue
            t = int(row["Time"])
            if t not in years:
                continue
            reg = _region(row["ISO3_code"], row["ParentID"])
            if reg is None:
                continue
            iso_map[row["ISO3_code"]] = reg
            k = (reg, t, row["AgeGrp"])
            acc[k] = acc.get(k, 0.0) + float(row["PopTotal"])
    return acc, iso_map


def main():
    years_hist = set(range(1950, 2025))
    years_proj = set(range(2024, 2101))

    print("reading WPP medium estimates 1950-2024 ...")
    hist, iso_map = wpp_panel(f"{RAW}/wpp_med.csv.gz", "Medium", years_hist)
    print("reading WPP low variant 2024-2100 ...")
    low, _ = wpp_panel(f"{RAW}/wpp_other.csv.gz", "Low", years_proj)

    with open(f"{OUT}/pop_age.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["region", "year", "agegrp", "pop_thousands", "series"])
        for label, acc in (("estimate", hist), ("low", low)):
            for (reg, t, ag), v in sorted(acc.items()):
                w.writerow([reg, t, ag, round(v, 3), label])

    with open(f"{OUT}/iso_region.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["iso3", "region"])
        for iso, reg in sorted(iso_map.items()):
            w.writerow([iso, reg])

    # ---- pre-1950 total population, OWID (HYDE/Gapminder/UN splice) ----
    print("reading OWID population ...")
    owid = pd.read_csv(f"{RAW}/owid_pop.csv")
    owid = owid[(owid.year >= 1900) & (owid.year <= 1950) & owid.code.notna()]
    owid["region"] = owid.code.map(iso_map)
    pre = (owid[owid.region.notna()].groupby(["region", "year"])
           .population_historical.sum().reset_index())
    pre.to_csv(f"{OUT}/pop_total_pre1950.csv", index=False)

    # ---- Maddison GDP per capita (2011 PPP $) ----
    print("reading Maddison ...")
    mad = pd.read_excel(f"{RAW}/mpd2023.xlsx", sheet_name="Full data")
    mad["region"] = mad.countrycode.map(iso_map)
    mad = mad[mad.region.notna() & mad.gdppc.notna() & mad["pop"].notna()]
    mad = mad[(mad.year >= 1900) & (mad.year <= 2022)]
    mad["gdp"] = mad.gdppc * mad["pop"]
    g = mad.groupby(["region", "year"]).agg(gdp=("gdp", "sum"), pop=("pop", "sum")).reset_index()
    g["gdppc"] = g.gdp / g["pop"]
    g[["region", "year", "gdppc", "pop", "gdp"]].to_csv(f"{OUT}/gdppc_maddison.csv", index=False)

    # ---- attainment: Lee-Lee long series, Barro-Lee v3 by age, BL projections ----
    def attain(path, tag, by_age=False):
        d = pd.read_csv(path)
        code = "WBcode" if "WBcode" in d.columns else "BLcode"
        d["iso3"] = d[code].astype(str).str.strip('"')
        d["region"] = d.iso3.map(iso_map)
        miss = d[d.region.isna()].country.unique()
        if len(miss):
            d.loc[d.region.isna(), "region"] = (
                d.loc[d.region.isna(), "country"].map(NAME_TO_ISO).map(iso_map))
        d = d[d.region.notna()]
        keys = ["region", "year"] + (["agefrom", "ageto"] if by_age else [])
        out = []
        for k, grp in d.groupby(keys):
            wgt = grp["pop"].astype(float)
            if wgt.sum() <= 0:
                continue
            rec = dict(zip(keys, k if isinstance(k, tuple) else (k,)))
            for c in ["lu", "lp", "ls", "lh"]:
                rec[c] = float((grp[c].astype(float) * wgt).sum() / wgt.sum())
            rec["cov_pop"] = float(wgt.sum())
            rec["source"] = tag
            out.append(rec)
        return pd.DataFrame(out)

    ll2564 = attain(f"{RAW}/OUP_long_MF2564_v1.csv", "leelee")
    ll1524 = attain(f"{RAW}/OUP_long_MF1524_v1.csv", "leelee")
    pj2564 = attain(f"{RAW}/OUP_proj_MF2564_v1.csv", "bl-proj")
    pj1524 = attain(f"{RAW}/OUP_proj_MF1524_v1.csv", "bl-proj")
    blage = attain(f"{RAW}/BL_v3_MF.csv", "bl-v3", by_age=True)

    pd.concat([ll2564, pj2564]).to_csv(f"{OUT}/attain_2564.csv", index=False)
    pd.concat([ll1524, pj1524]).to_csv(f"{OUT}/attain_1524.csv", index=False)
    blage.to_csv(f"{OUT}/attain_by_age.csv", index=False)

    # ---- life expectancy and net migration (WPP demographic indicators) ----
    print("reading WPP demographic indicators ...")
    le: dict[tuple[str, int], list[float]] = {}
    with gzip.open(f"{RAW}/wpp_di.csv.gz", "rt", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            if row["LocTypeName"] != "Country/Area":
                continue
            reg = _region(row["ISO3_code"], row["ParentID"])
            if reg is None:
                continue
            t = int(row["Time"])
            if t % 5 and t != 2024:
                continue
            try:
                pop = float(row["TPopulation1Jan"]) if row["TPopulation1Jan"] else 0.0
                lex = float(row["LEx"]) if row["LEx"] else None
                nm = float(row["NetMigrations"]) if row["NetMigrations"] else 0.0
            except ValueError:
                continue
            if lex is None:
                continue
            a = le.setdefault((reg, t), [0.0, 0.0, 0.0])
            a[0] += lex * pop
            a[1] += pop
            a[2] += nm
    with open(f"{OUT}/life_expectancy.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["region", "year", "life_expectancy", "net_migration_thousands"])
        for (reg, t), (num, den, nm) in sorted(le.items()):
            if den > 0:
                w.writerow([reg, t, round(num / den, 4), round(nm, 3)])

    print("done ->", OUT)


if __name__ == "__main__":
    main()

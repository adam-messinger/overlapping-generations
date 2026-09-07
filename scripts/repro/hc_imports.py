"""Human capital as an import: what a destination acquires vs what it would
have cost to rear and school the same workers at home.

The ledger already books an arriving worker at the destination's replacement
cost and writes it off at the origin's. This script reads that channel as a
trade account: import volume, the outlay avoided, the price the origin paid,
and how much of each destination's workforce replacement is met by import.
"""
from __future__ import annotations
import os, sys
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hc_forecast as F  # noqa: E402
import hc_ledger as L  # noqa: E402

NAMES = {"us": "United States", "oecd-ex-us": "OECD ex-US", "china": "China",
         "india": "India + South Asia", "latam": "Latin America",
         "seasia": "SE Asia + Pacific", "russia": "Russia + CIS",
         "mena": "MENA", "ssa": "Sub-Saharan Africa"}


def account(df: pd.DataFrame) -> pd.DataFrame:
    d = df[df.year > 2025].copy()
    # world average cost the origin actually paid, per worker exported
    w = d.groupby("year").agg(ov=("mig_out", "sum"), oh=("mig_out_head", "sum"),
                              og=("mig_out_gross", "sum"))
    d = d.join((w.ov / w.oh).rename("origin_cost_per_head"), on="year")
    # what the origin spent to REAR AND SCHOOL each departing worker, before
    # any write-down for the years already worked
    d = d.join((w.og / w.oh).rename("origin_build_per_head"), on="year")

    d["import_value"] = d.mig_in                       # booked at destination cost
    d["import_head"] = d.mig_in_head
    d["import_years"] = d.mig_in_years                 # remaining work-years bought
    # what the destination would have had to spend at home for the same
    # remaining work-years, using its own entrants' cost per work-year
    d["home_cost_per_year"] = d.investment / d.entrant_years.replace(0, pd.NA)
    d["avoided_outlay"] = d.import_years * d.home_cost_per_year
    # what building those workers actually cost, at origin prices
    d["origin_outlay"] = d.import_head * d.origin_cost_per_head
    # gross build cost: what the destination pays to raise one worker to the
    # same education, vs what the origin actually paid
    d["dest_build_per_head"] = d.mig_in_gross / d.import_head.replace(0, pd.NA)
    d["origin_build_total"] = d.import_head * d.origin_build_per_head
    d["build_discount"] = 1 - d.origin_build_per_head / d.dest_build_per_head
    return d


def summarise(d: pd.DataFrame, regions, years=(2030, 2050, 2075, 2100)):
    rows = []
    for r in regions:
        x = d[d.region == r].set_index("year")
        if x.import_head.sum() <= 0 or x.import_head[list(years)].sum() <= 0:
            continue
        for y in years:
            rows.append(dict(
                region=NAMES[r], year=y,
                imports_M=x.import_head[y] / 1e6,
                import_value_B=x.import_value[y] / 1e9,
                avoided_B=x.avoided_outlay[y] / 1e9,
                origin_paid_B=x.origin_outlay[y] / 1e9,
                discount=1 - x.origin_outlay[y] / x.avoided_outlay[y],
                share_of_acquisition=x.import_value[y] / (x.investment[y] + x.import_value[y]),
                share_of_workyears=x.import_years[y] / (x.entrant_years[y] + x.import_years[y]),
                build_here_k=x.dest_build_per_head[y] / 1e3,
                built_there_k=x.origin_build_per_head[y] / 1e3,
                build_discount=x.build_discount[y],
            ))
    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = F.run()
    d = account(df)
    imp = [r for r in L.REGIONS if d[d.region == r].import_head.sum() > 0]
    print("NET IMPORTERS OF HUMAN CAPITAL (constant 2025 cost, Maddison 2011 PPP $)\n")
    s = summarise(d, imp)
    for r in s.region.unique():
        q = s[s.region == r]
        print(f"--- {r} ---")
        print(q.drop(columns="region").to_string(index=False, float_format=lambda v: f"{v:9.3f}"))
        print()
    us = d[d.region == "us"]
    print("UNITED STATES, cumulative 2026-2100 ($T constant 2025 cost)")
    print(f"  workers imported            {us.import_head.sum()/1e6:8.1f} M")
    print(f"  remaining work-years bought {us.import_years.sum()/1e6:8.0f} M")
    print(f"  booked at US replacement    {us.import_value.sum()/1e12:8.1f} T")
    print(f"  outlay avoided at home      {us.avoided_outlay.sum()/1e12:8.1f} T")
    print(f"  origins actually spent      {us.origin_outlay.sum()/1e12:8.1f} T")
    print(f"  implied import discount     {1-us.origin_outlay.sum()/us.avoided_outlay.sum():8.1%}")
    print(f"  US domestic investment      {us.investment.sum()/1e12:8.1f} T")
    print()
    print("  Gross build cost per worker (rearing + schooling, undepreciated):")
    print(f"    to raise one at US prices   ${us.mig_in_gross.sum()/us.import_head.sum()/1e3:8.1f} k")
    print(f"    what the origins paid       ${us.origin_build_total.sum()/us.import_head.sum()/1e3:8.1f} k")
    print(f"    build discount              {1-us.origin_build_total.sum()/us.mig_in_gross.sum():8.1%}")

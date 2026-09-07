"""Assemble the reproduction tables and the target check."""
from __future__ import annotations

import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hc_backcast as B  # noqa: E402
import hc_forecast as F  # noqa: E402
import hc_ledger as L  # noqa: E402

DATA = os.environ.get("OUT", "data/human-capital-repro")
NAMES = {"us": "United States", "oecd-ex-us": "OECD ex-US", "china": "China",
         "india": "India + South Asia", "latam": "Latin America",
         "seasia": "SE Asia + Pacific", "russia": "Russia + CIS",
         "mena": "MENA", "ssa": "Sub-Saharan Africa"}


def world(df):
    w = df.groupby("year").sum(numeric_only=True)
    w["index"] = w.stock / w.stock.loc[2025]
    return w


def regional_index(df):
    base = df[df.year == 2025].set_index("region").stock
    d = df.copy()
    d["idx"] = [r.stock / base[r.region] for r in d.itertuples()]
    return d.pivot(index="year", columns="region", values="idx")


def turning_year(df, region, col):
    s = df[df.region == region].set_index("year")[col]
    neg = [y for y in s.index if y > 2026 and s[y] < 0]
    return min(neg) if neg else None


def summary(df):
    w, piv = world(df), regional_index(df)
    sl = w.loc[2026:2050]
    return dict(
        peak_year=int(w["index"].idxmax()), peak=float(w["index"].max()),
        idx2100=float(w["index"].loc[2100]),
        stock2025=float(w.stock.loc[2025]),
        inv2026=float(w.investment.loc[2026]),
        charge2026=float((w.depreciation + w.writeoff).loc[2026]),
        netinv_2550=float((sl.investment - sl.depreciation - sl.writeoff).sum()),
        mig_2550=float((sl.mig_in - sl.mig_out).sum()),
        reval_2550=float(sl.revaluation.sum()),
        total_2550=float(w.stock.loc[2050] - w.stock.loc[2025]),
        netinv2100=float((w.investment - w.depreciation - w.writeoff).loc[2100]),
        resid=float((w.stock.diff() - (w.investment - w.depreciation - w.writeoff
                     + w.mig_in - w.mig_out + w.revaluation)).abs().max()),
        piv=piv, w=w, df=df)


SPECS = {
    "primary": dict(),
    "blend": dict(variant="blend"),
    "medium": dict(variant="medium"),
    # §5.3 diagnostics: driven by this repository's own demographics output
    "model": dict(variant="model"),
    "model_cohorts": dict(variant="model-cohorts"),
    "market": dict(prices="market"),
    "eurostat": dict(scale=L.HAZARD_SCALE_EUROSTAT),
    "nomig": dict(migration=False),
    "rearing30": dict(rearing=0.30),
    "rearing0": dict(rearing=0.0),
    "foregone45": dict(foregone=0.45),
}

if __name__ == "__main__":
    out = {}
    for k, kw in SPECS.items():
        print("running", k, kw, flush=True)
        df = F.run(**kw)
        df.to_csv(f"{DATA}/forecast_{k}.csv", index=False)
        out[k] = summary(df)

    rows = []
    for k, s in out.items():
        rows.append(dict(spec=k, peak_year=s["peak_year"], peak=round(s["peak"], 3),
                         idx2100=round(s["idx2100"], 3),
                         stock2025_T=round(s["stock2025"] / 1e12, 1),
                         inv2026_T=round(s["inv2026"] / 1e12, 2),
                         charge2026_T=round(s["charge2026"] / 1e12, 2),
                         netinv2550_T=round(s["netinv_2550"] / 1e12, 1),
                         mig2550_T=round(s["mig_2550"] / 1e12, 1),
                         reval2550_T=round(s["reval_2550"] / 1e12, 1),
                         total2550_T=round(s["total_2550"] / 1e12, 1),
                         resid=f"{s['resid']:.1e}"))
    pd.DataFrame(rows).to_csv(f"{DATA}/spec_matrix.csv", index=False)
    print(pd.DataFrame(rows).to_string(index=False))

    peaks = {}
    for k, s in out.items():
        p = s["piv"]
        peaks[k] = {r: (int(p[r].idxmax()), round(float(p[r].max()), 3),
                        round(float(p[r].loc[2100]), 3)) for r in p.columns}
    pd.DataFrame(peaks).to_csv(f"{DATA}/regional_peaks.csv")
    print()
    for r in L.REGIONS:
        print(f"{NAMES[r]:22s} " + "  ".join(
            f"{k}:{peaks[k][r][0]}@{peaks[k][r][1]:.2f}->{peaks[k][r][2]:.2f}"
            for k in ("primary", "blend", "medium")))

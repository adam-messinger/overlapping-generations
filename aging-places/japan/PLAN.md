# Step 1 plan: complete the Japan mechanism and adjudicate the holdout

Goal (from the frozen protocol, `../docs/INTERNATIONAL_PANEL.md`): move from the *partial*
mechanism (employment shares + foreign share only) to the *full* frozen-weight mechanism, run the
household chain, then open the sealed 2020–2025 holdout if and only if the required outcome data
is officially published — logging any deviation before opening.

## Work items

### A. Missing origin constructs (2010 and 2015 vintages, official sources only)

| Construct | US weight it unlocks | Source | Risk |
|---|---|---|---|
| University/junior-college enrollment (per campus or municipal) | engines: college 0.15, uni15 0.10, uni60 0.05 | MEXT School Basic Survey via e-Stat | municipal resolution may not exist → log + fall back to prefecture-share allocation or drop uni15/uni60 |
| Resident education (bachelor+ share) | human capital: 0.40 + 0.30 | 2010 Census sample detailed tabulation | 2015 origin uses 2010 values (available-at-origin, logged) |
| Radius market access (pop within 70/105/140 km) + dominance | access 0.20, hub 0.10 | municipal centroids (MLIT point data) × census pop | low |
| Affordability (residential land price / income) | afford −0.25 | MLIT L01 land price points; SSDS taxable income | L01 parsing (SHP/DBF or XML), Shift_JIS |
| Distress vacancy ("other" vacant share) | distress −0.15 | Housing & Land Survey 2008/2013 municipal tables | published only for pop ≥ 15k → coverage-limited, imputed elsewhere |

Armed-forces share has no municipal Japanese equivalent acquired; it stays at zero contribution
(documented). All fetches follow the existing pattern: raw responses hashed into
`data/*-sources.json`, boundary-audited to frozen 2020 municipalities.

### B. Full-mechanism development run

Extend `development-backtest.ts`'s partial attraction to the full frozen composite (adding the
five channels above with unchanged US weights and percentile standardization). Report the same
tables as the partial audit: MAE vs no-migration & demographic-only, equal-basin Spearman vs the
lagged-population kill comparator, bootstrap CIs, both windows. No weight may be fitted to
Japanese outcomes.

### C. Household chain

Run the frozen household allocation (origin-anchored headship, same attraction) against the
lagged household trend on the exact common sample, both windows — the protocol's second primary.

### D. Holdout adjudication (gated)

1. Establish what 2025 Census municipal outcomes are published as of today (scout in progress):
   preliminary counts (population, households) are expected; the age tabulation may not be.
2. If working-age outcomes are unavailable: adjudicate the household primary now, log a deviation
   entry stating the working-age primary remains sealed pending the official age tabulation — do
   NOT substitute a different population concept without explicit protocol versioning.
3. Publish all opened outcome families, favorable or not, in BACKTEST.md + development-demography.json.

### E. Simplify + PR

Prune any scaffolding, ensure `npm run test:aging` covers the new constructs (coverage manifest,
boundary reconciliation, weight-freeze assertions), update README/BACKTEST/INTERNATIONAL_PANEL
deviation log, merge PR.

## Plan review (revision notes)

- *Scope check:* uni15/uni60 radius enrollment requires campus coordinates; if MEXT tables are
  municipal (not per-campus), municipal centroid placement is acceptable (villages hosting
  campuses are small relative to 15 km). Revised: use municipal centroid placement always;
  per-campus geocoding is out of scope.
- *L01 volume:* national point files ~26k points/yr; filter to residential-use rows during parse;
  keep only municipal medians. If 2010 XML schema stalls, 2015-only affordability with logged
  coverage note beats schema archaeology (the mechanism z-scores within origin year anyway).
- *Do not* rebuild markets or boundaries — reuse the audited 2020-boundary crosswalk and basins.
- *Order:* centroids/access first (unblocks access+hub with zero new table risk), then education,
  then MEXT, then L01, then HLS. Each construct lands independently with its own coverage entry,
  so a stalled acquisition never blocks the run.
- *Holdout discipline:* the temptation will be to "just use" resident-register age data if the
  census age tabulation is missing. Rejected: population-concept substitution inside a sealed
  test is exactly what the preregistration exists to prevent.

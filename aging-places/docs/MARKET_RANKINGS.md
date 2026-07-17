# Within-market rankings (step 2)

## Plan and rationale

Validation left an asymmetric evidence base: the mechanism scenario is the only score with a
positive, bootstrap-confirmed *local* rank signal (market-backtest: +0.156 equal-zone Spearman
over lagged population, 95% CI above zero), while the national historical-persistence score has
almost no within-zone signal (equal-zone 0.023) and fails temporal transfer. The Japan holdout
(BACKTEST.md §6) reinforced the same reading: demographic structure allocates *within* markets
far better than it forecasts absolute levels.

So the product is reframed: the primary ranked surface is **place-within-commuting-zone**, ranked
by `mechanismScore`; the national lists remain valuation/exposure screens. This also resolves the
gateway-suburb critique structurally — Maywood is now compared with the LA basin, not Nantucket.

Plan review notes: (a) rank only by the locally-validated score, never by historical persistence;
(b) product geography uses cz2020 (validation used cz2000 — noted, not identical); (c) a
`flowContradiction` flag marks places where the model's implied relative inflow disagrees with
realized 2000-2023 headcount decline — a disclosed disagreement, not a veto; (d) leaders exclude
`low`-confidence rows; the full file keeps everything.

## Outputs

- `outputs/market-rankings.csv.gz` — 24,029 places across 540 zones (>=5 modeled places):
  zoneRank, zonePercentile, structural rank, scores, confidence, flags.
- `outputs/market-leaders.csv` — top-3 per zone for 447 zones with >=10 places (1,343 rows),
  ordered by zone size: the "who wins within each market as it ages" list.

## Results snapshot

- 1,898 of 24,029 ranked places carry the flow-contradiction flag; the LA gateway belt
  (e.g. Maywood: #10 of 371 in-zone, flagged) is the canonical case — mechanism-strong,
  history-contradicted, and now visibly both.
- Leader rows pattern-match the theory's within-market prediction: institutional inner suburbs
  and campus towns top their zones (Evanston/Oak Park in Chicago; Berkeley/Emeryville in the
  Bay; University Park/Richardson in Dallas; State College #1 of 73 in its own zone).
- Caveats: zone ranks inherit every mechanism limitation (scenario tooling, not validated
  forecasts of absolute growth); cz2020 assignment quality varies (`cz2020Containment` in
  data/place-markets.csv.gz); no post-2000-boundary validation of the exact cz2020 geography.

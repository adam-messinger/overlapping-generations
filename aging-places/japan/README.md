# Japan municipal validation

This directory is the external-regime development pipeline for the US aging-places mechanism.
The protocol in [`../docs/INTERNATIONAL_PANEL.md`](../docs/INTERNATIONAL_PANEL.md) was committed as
`ec2869b` before any post-2020 Japanese municipal outcome was acquired. The 2020–2025 holdout is
still sealed.

## Current status

- 1,741 outcome municipalities on frozen 2020 boundaries;
- official Population Census endpoints for 2010, 2015, and 2020;
- official origin-destination commuting matrices for 2010 and 2015;
- official origin-year employment by industry and non-Japanese-resident counts for 2010 and 2015;
- 10% dominant-flow basins: 565 in 2010 and 553 in 2015 before the five-place evaluation filter;
- a two-window partial-mechanism audit using the unchanged observed subset of US weights; and
- no post-2020 municipal outcome in the raw or derived data.

The current audit is not `japan-model-v1`. It includes the frozen US demographic
regeneration/vitality terms, working-age mover parameters, education/health/public employment,
professional-information-finance employment, and total foreign-resident gateway. It improves
working-age absolute error in both development windows, but its local-rank advantage over lagged
population is imprecise. University enrollment, resident education, radius access, vacancy, and
land prices remain absent. It therefore does not earn the international-validation label.

## Reproduce

The raw official downloads are ignored; exact table IDs and SHA-256 hashes are retained in
`data/census-sources.json`, `data/commuting2010-sources.json`,
`data/commuting2015-sources.json`, and `data/origin-feature-sources.json`.

```bash
# Requires the official raw files documented by the manifests.
node --import tsx aging-places/japan/scripts/write-source-manifest.ts
node --import tsx aging-places/japan/scripts/build-census-panel.ts

# Commuting downloads and market construction.
node --import tsx aging-places/japan/scripts/fetch-commuting.ts --year=2010
node --import tsx aging-places/japan/scripts/fetch-commuting.ts --year=2015
node --import tsx aging-places/japan/scripts/build-markets.ts --year=2010
node --import tsx aging-places/japan/scripts/build-markets.ts --year=2015

# Origin-year equivalent constructs. `--reuse` rebuilds from already fetched,
# hash-recorded raw responses without touching the network.
node --import tsx aging-places/japan/scripts/fetch-origin-features.ts
node --import tsx aging-places/japan/scripts/build-origin-features.ts

# Development outcomes stop at 2020.
node --import tsx aging-places/japan/scripts/development-backtest.ts
npm run test:aging
```

## Derived files

- `data/census-2010-2020.csv.gz`: age, population, and household panel.
- `data/boundary-audit-2010-2020.csv.gz`: source-to-2020 municipal operations and exactness flags.
- `data/commuting-markets{2010,2015}.csv.gz`: origin-year basin assignments.
- `data/origin-features.csv.gz`: institutional-employment and gateway origin features.
- `data/origin-feature-boundary-audit.csv.gz`: source-to-2020 feature aggregation audit.
- `data/origin-feature-sources.json`: exact source IDs, selections, and hashes.
- `data/origin-feature-coverage.json`: construct-level missingness by origin year.
- `data/development-demography.json`: metrics, uncertainty, and scope limitations.
- `data/development-demography-localities.csv.gz`: row-level predictions and outcomes for audit.

Tokyo's 23 special wards remain separate outcome units. Because the official commuting matrix
publishes their origin as aggregate code `13100`, each ward receives the same explicitly flagged
market assignment; `13100` is never an outcome row. Five evacuated/suppressed 2015 municipalities
have zero worker denominators and self-link rather than being dropped.

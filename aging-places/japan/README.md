# Japan municipal validation

This directory is the external-regime development pipeline for the US aging-places mechanism.
The protocol in [`../docs/INTERNATIONAL_PANEL.md`](../docs/INTERNATIONAL_PANEL.md) was committed as
`ec2869b` before any post-2020 Japanese municipal outcome was acquired. The 2020–2025 holdout is
still sealed.

## Current status

- 1,741 outcome municipalities on frozen 2020 boundaries;
- official Population Census endpoints for 2010, 2015, and 2020;
- official origin-destination commuting matrices for 2010 and 2015;
- 10% dominant-flow basins: 565 in 2010 and 553 in 2015 before the five-place evaluation filter;
- a two-window demographic-channel audit; and
- no post-2020 municipal outcome in the raw or derived data.

The current audit is not `japan-model-v1`. It includes the frozen US demographic
regeneration/vitality terms and working-age mover parameters, but not yet institutions, human
capital, foreign-resident gateway, radius access, vacancy, or land prices. It adds statistically
detectable local rank information over no-migration aging in both windows, but its advantage over
lagged population is imprecise. It therefore does not earn the international-validation label.

## Reproduce

The raw official downloads are ignored; exact table IDs and SHA-256 hashes are retained in
`data/census-sources.json`, `data/commuting2010-sources.json`, and
`data/commuting2015-sources.json`.

```bash
# Requires the official raw files documented by the manifests.
node --import tsx aging-places/japan/scripts/write-source-manifest.ts
node --import tsx aging-places/japan/scripts/build-census-panel.ts

# Commuting downloads and market construction.
node --import tsx aging-places/japan/scripts/fetch-commuting.ts --year=2010
node --import tsx aging-places/japan/scripts/fetch-commuting.ts --year=2015
node --import tsx aging-places/japan/scripts/build-markets.ts --year=2010
node --import tsx aging-places/japan/scripts/build-markets.ts --year=2015

# Development outcomes stop at 2020.
node --import tsx aging-places/japan/scripts/development-backtest.ts
npm run test:aging
```

## Derived files

- `data/census-2010-2020.csv.gz`: age, population, and household panel.
- `data/boundary-audit-2010-2020.csv.gz`: source-to-2020 municipal operations and exactness flags.
- `data/commuting-markets{2010,2015}.csv.gz`: origin-year basin assignments.
- `data/development-demography.json`: metrics, uncertainty, and scope limitations.
- `data/development-demography-localities.csv.gz`: row-level predictions and outcomes for audit.

Tokyo's 23 special wards remain separate outcome units. Because the official commuting matrix
publishes their origin as aggregate code `13100`, each ward receives the same explicitly flagged
market assignment; `13100` is never an outcome row. Five evacuated/suppressed 2015 municipalities
have zero worker denominators and self-link rather than being dropped.

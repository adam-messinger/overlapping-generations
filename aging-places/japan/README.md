# Japan municipal validation

> **Live status (2026-07-19):** the household holdout opened on 2026-07-17 and failed; the
> working-age holdout remains sealed pending the official 2025 municipal age table. The
> [canonical status manifest](../data/international-validation-status.json) is authoritative.

This directory is the external-regime development pipeline for the US aging-places mechanism.
The protocol in [`../docs/INTERNATIONAL_PANEL.md`](../docs/INTERNATIONAL_PANEL.md) was committed as
`ec2869b` before any post-2020 Japanese municipal outcome was acquired. The holdout later split
by outcome availability: official 2025 household counts were opened, while the working-age
primary remains sealed.

## Current status

- 1,741 outcome municipalities on frozen 2020 boundaries;
- official Population Census endpoints for 2010, 2015, and 2020;
- official origin-destination commuting matrices for 2010 and 2015;
- official origin-year employment by industry and non-Japanese-resident counts for 2010 and 2015;
- the extended frozen channels: resident education, resident-student enrollment substitutes,
  radius access and dominance, land-price affordability, and coverage-limited distress vacancy;
- 10% dominant-flow basins: 565 in 2010 and 553 in 2015 before the five-place evaluation filter;
- full and partial frozen-weight development audits, including the origin-anchored household
  chain; and
- an opened 2020–2025 household result, with no post-2020 municipal age outcome yet acquired.

The full development audit uses the unchanged frozen US weights and does not fit to Japanese
outcomes. It failed to beat lagged population with the required confidence in either working-age
window; in the comparable 2015–2020 household window, it also trailed lagged household trend.
The opened household primary then lost to persistence on both MAE (0.00585 vs 0.00536 per year)
and equal-basin Spearman (0.630 vs 0.689). It therefore does not produce a validated
`japan-model-v1`; the mechanism remains scenario tooling. The pending working-age primary can
add narrower evidence but cannot reverse the failed all-gates verdict.

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

# Extended origin constructs and development outcomes through 2020.
node --import tsx aging-places/japan/scripts/build-extended-features.ts
node --import tsx aging-places/japan/scripts/development-backtest.ts

# Requires the hash-recorded official 2025 household source in the ignored raw directory.
node --import tsx aging-places/japan/scripts/holdout-2025.ts
npm run aging:status
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
- `data/origin-features-extended.csv.gz`: extended frozen-channel origin features.
- `data/estat-extended-sources.json` and `data/mlit-sources.json`: exact extended-source IDs
  and hashes.
- `data/development-demography.json`: partial and full development metrics and uncertainty.
- `data/development-demography-localities.csv.gz`: row-level predictions and outcomes for audit.
- `data/holdout-2025.json`: opened household-only holdout metrics and scope.

Tokyo's 23 special wards remain separate outcome units. Because the official commuting matrix
publishes their origin as aggregate code `13100`, each ward receives the same explicitly flagged
market assignment; `13100` is never an outcome row. Five evacuated/suppressed 2015 municipalities
have zero worker denominators and self-link rather than being dropped.

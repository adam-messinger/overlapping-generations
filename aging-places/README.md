# aging-places — US municipal aging and housing model

This project studies how present-day municipal structure is associated with long-run housing
outcomes as the United States ages. It contains two deliberately separate components:

- a historical ranking model fit on 2000 place characteristics and 2000–2025 Zillow ZHVI
  growth; and
- an overlapping-generations mechanism simulation for demographic and housing scenarios.

The headline forecast files now use the first component. The mechanism score is reported beside
it, not blended into it, because the blend did not improve state-grouped validation. Neither the
headline index nor the mechanism path is a calibrated 40-year return forecast.

Start with [REPORT.md](docs/REPORT.md), then read [METHODOLOGY.md](docs/METHODOLOGY.md) and
[BACKTEST.md](docs/BACKTEST.md). Data provenance is in [REFERENCES.md](docs/REFERENCES.md).

## Layout

```text
aging-places/
├── data/       committed derived snapshots and fitted model metadata
├── docs/       theory, methods, validation, and interpretation
├── outputs/    full forecast and filtered ranking tables
├── raw/        ignored source downloads
├── scripts/    fetch, feature, validation, hindcast, and forecast pipeline
└── src/        nation, attraction, migration, and housing-market modules
```

## Reproduce the committed snapshot

The compact derived data are committed, so no network access is required for the modeling steps:

```bash
npx tsx aging-places/scripts/backtest.ts
npx tsx aging-places/scripts/hindcast.ts
npx tsx aging-places/scripts/forecast.ts
npm test
```

`backtest.ts` rewrites `data/model.json` and `data/validation.json`. `forecast.ts` rewrites all
files under `outputs/`.

## Rebuild the data

```bash
# Official Census gazetteer/crosswalk, Zillow ZHVI, and epoch-specific IPEDS files
npx tsx aging-places/scripts/fetch-static.ts

# Census 2000 and ACS 2019–2023 place tables; cached requests are resumable
npx tsx aging-places/scripts/fetch-census.ts

npx tsx aging-places/scripts/build-static.ts
npx tsx aging-places/scripts/build-features.ts
npx tsx aging-places/scripts/backtest.ts
npx tsx aging-places/scripts/hindcast.ts
npx tsx aging-places/scripts/forecast.ts
```

Raw files default to `aging-places/raw/` and request cache files to
`aging-places/.cache/`. Override them with `AGING_RAW_DIR` and `AGING_SCRATCH`. Zillow updates its
series and occasionally changes download paths; set `AGING_ZHVI_URL` if needed. A fresh download
is therefore a new data vintage, not a byte-for-byte recreation of the committed snapshot.

## Output semantics

- `outlook`: standardized headline rank score.
- `historicalWinnerIndex`: 0–1 logistic ranking index. It is not a probability of future success.
- `mechanismScore`: standardized 2025–2065 real-price scenario output.
- `mechanismRealLogGrowth`: unstandardized scenario log growth.
- `structuralScore`: price-free current fundamentals composite.
- `valuationGap`: structural score minus standardized current log price/income.
- `confidence` and `confidenceReasons`: data/support warnings, not statistical intervals.

The top/bottom lists currently cover 3,460 eligible places and require population at least 10,000,
observed current ZHVI, a non-group-quarters-dominated housing market, and confidence above `low`.
The full file retains all 24,525
modeled places with population at least 250.

## Simulation architecture

```text
nation: cohort path and international migration
  ↓
attraction: additive institutional, human-capital, access, regeneration,
            gateway, amenity, health, scarcity, and feedback terms
  ↓
migration: closed internal flows sized from modeled local stocks
           + open international flows scaled to modeled coverage
  ↓
market: local cohort aging, observed-household demand, supply, and real prices
  └──────── one-year lagged affordability, age, stock, and capacity feedback ────────┘
```

Programmatic entry point:

```ts
import { runAgingSim } from './aging-places/src/simulation.js';

const result = runAgingSim({ epoch: '2023', years: 40 });
```

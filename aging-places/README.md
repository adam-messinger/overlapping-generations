# aging-places — US municipal aging and housing model

This project studies how present-day municipal structure is associated with long-run housing
outcomes as the United States ages. It contains two deliberately separate components:

- a historical ranking model fit on 2000 place characteristics and 2000–2025 Zillow ZHVI
  growth; and
- an overlapping-generations mechanism simulation for demographic and housing scenarios.

The ranking files use the first component as a **historical persistence score**. The mechanism
score is reported beside it, not blended into it, because the blend did not improve state-grouped
validation. Neither quantity is a calibrated 40-year return forecast or an internationally
validated aging-resilience score.

Start with [REPORT.md](docs/REPORT.md), then read [METHODOLOGY.md](docs/METHODOLOGY.md) and
[BACKTEST.md](docs/BACKTEST.md). Data provenance is in [REFERENCES.md](docs/REFERENCES.md).
The one-shot [2024 evidence refresh and temporal audit](docs/REFRESH_2024.md)
is the current point-in-time update; it leaves the committed production
snapshot and coefficients unchanged.
Experimental global-simulation coupling is documented in
[GLOBAL_INTEGRATION.md](docs/GLOBAL_INTEGRATION.md).
The pre-registered external tests are documented in
[INTERNATIONAL_PANEL.md](docs/INTERNATIONAL_PANEL.md), the
[Japan pipeline](japan/README.md), and the Italy protocol
([ITALY_PANEL.md](docs/ITALY_PANEL.md), `italy/`). The generated table below is the canonical
live status; neither completed test validates the mechanism beyond scenario tooling
(BACKTEST.md §5-7).

<!-- INTERNATIONAL_STATUS:START -->
## International validation status

_Live status as of **2026-07-19**. Generated from [the canonical status manifest](data/international-validation-status.json); frozen protocols and plans are historical records, not live-status sources._

| Country | Development | Working-age holdout | Household holdout | Secondary outcomes | Overall |
|---|---|---|---|---|---|
| Japan | [Complete](japan/data/development-demography.json) — fail | Awaiting official data — pending | [Opened 2026-07-17](japan/data/holdout-2025.json) — **fail** | Vacancy: Not run — pending; land price: Not run — pending | **fail** |
| Italy | [Complete](italy/data/development.json) — fail | [Opened 2026-07-18](italy/data/holdout-2024.json) — **fail** | Not run — pending | Vacancy: Not run — not applicable; land price: Not run — pending | **fail** |

- **Japan:** The opened household primary failed. The pending working-age primary can add narrower evidence but cannot make all frozen v1 gates pass. Any feature, coefficient, comparator, or gate change informed by the opened household outcome is exploratory or requires a newly preregistered v2.
- **Italy:** The opened working-age primary failed both preregistered gates. Because the working-age holdout is open, feature or weight changes are exploratory or require a newly preregistered v2.
<!-- INTERNATIONAL_STATUS:END -->

## Layout

```text
aging-places/
├── data/       committed derived snapshots and fitted model metadata
├── docs/       theory, methods, validation, and interpretation
├── italy/      frozen-protocol external-regime development and holdout results
├── outputs/    full forecast and filtered ranking tables
├── japan/      frozen-boundary external-regime development and holdout results
├── raw/        ignored source downloads
├── scripts/    fetch, feature, validation, hindcast, and forecast pipeline
└── src/        nation, attraction, migration, and housing-market modules
```

## Reproduce the committed snapshot

The compact derived data are committed, so no network access is required for the modeling steps:

```bash
npx tsx aging-places/scripts/backtest.ts
npx tsx aging-places/scripts/hindcast.ts
npx tsx aging-places/scripts/market-backtest.ts
npx tsx aging-places/scripts/window-stability.ts
node --import tsx aging-places/japan/scripts/development-backtest.ts
npx tsx aging-places/scripts/institutional-scenarios.ts
npx tsx aging-places/scripts/forecast.ts
npx tsx aging-places/scripts/market-rankings.ts
npx tsx aging-places/scripts/flow-validation.ts
npx tsx aging-places/scripts/scenario-ensemble.ts
npm run aging:global-city
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

### Audited one-shot refresh

```bash
npm run aging:refresh -- --vintage=2024
```

This captures raw payloads, queries, retrieval times, release schemas,
semantic crosswalks, hashes, normalized datasets, and derived forecast
artifacts in `var/forecast-workbench/aging-us`. Versioned working files go
under ignored `data/snapshots/` and `outputs/snapshots/`; the compact
comparison, rolling-origin audit, and report are checked in. The command is
operator-invoked and installs no monitor, timer, or scheduled job. It uses the
configured Census API key; the Gazetteer, IPEDS, and Zillow downloads require
no additional account.

## Output semantics

- `historicalPersistenceScore`: canonical standardized persistence rank.
- `outlook`: deprecated compatibility alias for `historicalPersistenceScore`.
- `historicalWinnerIndex`: 0–1 logistic ranking index. It is not a probability of future success.
- `mechanismScore`: standardized 2025–2065 real-price scenario output.
- `mechanismRealLogGrowth`: unstandardized scenario log growth.
- `structuralScore`: price-free current fundamentals composite.
- `valuationGap`: structural score minus standardized current log price/income.
- `confidence` and `confidenceReasons`: data/support warnings, not statistical intervals.
- `outputs/market-rankings.csv.gz` / `outputs/market-leaders.csv`: the primary ranked surface —
  places ranked WITHIN commuting zones by `mechanismScore`, the only score with validated local
  rank signal (see docs/MARKET_RANKINGS.md). National lists are valuation/exposure screens.
- The migration submodel is a modeling device, not a flow forecast: it fails direct IRS
  county-flow validation within zones (docs/FLOW_VALIDATION.md); its validated surface is prices.
- `outputs/scenario-bands.csv.gz`: per-place scenario ranges over a 48-run fragility ensemble
  (immigration, gateway, amenity repricing, institutional decline, regime concentration) with
  `scenarioRobust`, dominant-axis attribution, and a signed `concentrationShift` (percentile
  move if US allocation turns old-regime, Japan/Italy-style; the dial reads simulated national
  working-age growth, so it deepens under low immigration). See docs/SCENARIO_ENSEMBLE.md.
  Ranges, not probability intervals.

The top/bottom lists currently cover 3,496 eligible places and require population at least 10,000,
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

Opt-in global coupling:

```ts
import { runGlobalCitySimulation } from './aging-places/src/global-bridge.js';

const { global, macroPath, city } = runGlobalCitySimulation({ years: 40 });
```

This currently maps the global model's OECD real GDP-per-capita path into municipal income growth
and national real house-price drift. The current OECD path contains a large, unvalidated modeled
GDP-share reallocation, so coupled absolute price and income levels are integration diagnostics,
not forecasts. The OECD proxy and all unconsumed capital, WACC, energy, and climate fields remain
explicit in `macroPath`. The GDP-to-income and GDP-to-house-price assumptions are now versioned
semantic crosswalks rather than implicit unit-compatible mappings; see
[GLOBAL_INTEGRATION.md](docs/GLOBAL_INTEGRATION.md).

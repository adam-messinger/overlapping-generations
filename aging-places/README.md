# aging-places — Aging Demographics & US Municipal Real-Estate Value

A research program built as a second simulation root on this repo's generic framework
(`../src/framework`): which US municipalities gain or lose long-term real-estate value over
the next 20-40 years as America ages, derived from the experience of countries further along
the demographic transition (Japan, Korea, Italy, Spain, Germany).

**Start here: [`docs/REPORT.md`](docs/REPORT.md)** — theory, lessons, methodology, backtest,
top/bottom 100, most under/overvalued, and the win/lose mechanics. Supporting docs:
`docs/THEORY.md`, `docs/LESSONS_JAPAN.md`, `docs/LESSONS_ITALY.md`, `docs/METHODOLOGY.md`,
`docs/BACKTEST.md`, `docs/STRESS_TEST.md`.

## Layout

```
aging-places/
├── data/        # committed gzipped extracts (Census 2000, ACS 2023, ZHVI, IPEDS, model.json)
├── docs/        # the deliverables
├── outputs/     # forecast-all.csv.gz, top100/bottom100/undervalued/overvalued.csv
├── scripts/     # pipeline: fetch-census, build-static, build-features, backtest, hindcast, forecast
└── src/         # the OLG municipal simulation (modules: nation, attraction, migration, market)
```

## Reproduce

```bash
# from the repo root (data extracts are committed; steps 1-2 only needed to re-fetch)
npx tsx aging-places/scripts/fetch-census.ts      # ~1,100 keyless data.census.gov requests
npx tsx aging-places/scripts/build-static.ts      # gazetteer, ZHVI, IPEDS (downloads in scratch)
npx tsx aging-places/scripts/build-features.ts    # feature engineering + spatial market access
npx tsx aging-places/scripts/backtest.ts          # fit + validate statistical model (writes data/model.json)
npx tsx aging-places/scripts/hindcast.ts          # validate mechanism sim 2000->2025
npx tsx aging-places/scripts/forecast.ts          # run 2025-2065, write outputs/
npx tsc --noEmit -p aging-places/tsconfig.json    # typecheck
```

## Simulation architecture

Reuses `src/framework` (autowire, pure modules, lags for feedback):

```
nation (US cohorts, mover pools, elderly wealth)
   ↓
attraction (four-capitals scores; lagged price/income + young-share feedback)
   ↓
migration (gravity-logit allocation of working-age & retiree pools)
   ↓
market (local cohort aging, housing demand/supply, price) ── lags ──> attraction, migration
```

Run programmatically:

```ts
import { runAgingSim } from './aging-places/src/simulation.js';
const res = runAgingSim({ epoch: '2023', years: 40 }); // or epoch '2000' for the hindcast
```

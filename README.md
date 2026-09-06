# Overlapping Generations Energy Simulation

A TypeScript simulation exploring energy transitions, demographics, debt, and
climate from 2025 to 2100. Eleven pure modules (demographics, production,
demand, capital, generations, human capital, energy, dispatch, resources, CDR,
climate) are composed by a
domain-independent simulation toolkit — the [`tsimulation`](packages/tsimulation/)
package. Its module kernel resolves dependencies topologically and breaks
feedback cycles with explicit lags; its sibling model/experiment layer supports
event, monthly-network, calibration, ensemble, adapter, and provenance workflows
without forcing them into the annual-module abstraction.

This is an npm workspaces monorepo: `packages/tsimulation/` is the standalone,
MIT-licensed engine (reusable for any discrete-time simulation),
`packages/forecast-workbench/` is the private point-in-time evidence and
forecasting control plane, and the energy model in `src/` consumes the
simulation engine as a workspace dependency.

Key modeling commitments: Ayres–Warr biophysical production (useful energy as
a primary growth factor), Wright's Law learning curves for solar/wind/battery,
merit-order dispatch with VRE penetration limits, DICE-style climate damages
with tipping points, Fernández-Villaverde demographic convergence, and an
explicit intergenerational transfer + debt/credit channel. The capital block
uses a profit-led monetary circuit: firms order investment, banks create
deposits for the financing gap, and sectoral saving is measured ex post in a
Godley-consistent ledger. A Keen–Ayres–Standish production equation is carried
as a structural challenger; see
[`docs/STEVE_KEEN_MODEL_AUDIT.md`](docs/STEVE_KEEN_MODEL_AUDIT.md).

The diagnostic layer in `src/modules/generations.ts` allocates those
flows to five-year birth-cohort balance sheets and reports borrowing-limit and
credit-rationing gaps without changing the macro path. See
[`docs/GENERATIONAL_ACCOUNTS.md`](docs/GENERATIONAL_ACCOUNTS.md). The conditional
1989–2025 validation against Federal Reserve, World Bank, and National Transfer
Accounts data is documented in
[`docs/GENERATIONAL_BACKCAST.md`](docs/GENERATIONAL_BACKCAST.md).

A second diagnostic layer, `src/modules/human-capital.ts`, keeps a cost-based
human-capital ledger: the rearing and schooling investment embodied in each
year's workforce entrants, capitalized at current replacement cost and
depreciated straight-line over the expected time in the workforce (death,
disability, domestic-role, and retirement exits), banded by education level.
See [`docs/HUMAN_CAPITAL.md`](docs/HUMAN_CAPITAL.md) and `npm run human-capital`.

## Quick start

```bash
npm install

# Run with default parameters
npx tsx src/simulation.ts

# Run a scenario
npx tsx src/simulation.ts --scenario=net-zero
npx tsx src/simulation.ts --list

# Explore parameters (also used by LLM agents)
npx tsx src/introspection.ts

# Tests (typecheck + all module/integration suites)
npm test

# Forecast workbench and migrated forecasting/news replays
npm run forecast -- help
npm run forecast -- source-catalog \
  --monitoring-started-at=2026-07-28T00:00:00.000Z
npm run forecast -- replay outbreak \
  --root=/tmp/outbreak-ledger \
  --audit=/tmp/outbreak-audit \
  --synthetic-resolution=1500

# Regression against the blessed baseline
npm run regression

# Standalone research simulations and frozen backtests
node --import tsx scripts/outbreak-backtest.ts
node --import tsx scripts/critical-materials-backtest.ts
node --import tsx scripts/hormuz-scenario.ts

# News-driven cross-model stress tests (July 2026)
node --import tsx scripts/news-war-ai.ts
node --import tsx scripts/multi-chokepoint-scenario.ts
node --import tsx scripts/defense-sourcing-scenario.ts
node --import tsx scripts/heat-adaptation-scenario.ts
node --import tsx scripts/generic-drug-scenario.ts
node --import tsx scripts/bilateral-tariff-scenario.ts
node --import tsx scripts/financial-contagion-scenario.ts
npm run aviation:infrastructure
npm run aviation:bay-pj
npm run ebike:motors
npm run trade:calibrate-network
npm run trade:network

# Refresh the checked-in country-by-HS6 graph from BACI, Census, and legal schedules
npm run trade:build-network

# Rerun every new model/backtest and optionally emit reproducible manifests
npm run sim:new -- --output=/tmp/tsimulation-suite.json --manifests=/tmp/tsimulation-manifests
```

## Programmatic use

```typescript
import { runSimulation, runWithScenario, describeParameters, describeOutputs } from './src/index.js';

const result = runSimulation({ energy: { carbonPrice: 100 } });
console.log(result.metrics.warming2100);

const { result: nz } = await runWithScenario('scenarios/net-zero.json');
```

## Where things live

- **[CLAUDE.md](CLAUDE.md)** — architecture, module dependency graph,
  development conventions, scenario table, key outputs. Start here.
- `src/modules/` — the ten simulation modules (pure
  `init`/`step`/`validate` interfaces)
- `packages/tsimulation/` — the generic simulation kernel plus standalone
  model, experiment, calibration, adapter, solver, evidence, and manifest APIs
  (no domain imports; reusable for other simulations; see its
  [README](packages/tsimulation/README.md))
- [`packages/forecast-workbench/`](packages/forecast-workbench/) — the local
  point-in-time evidence, sealed forecast, resolution, scoring, and audit
  control plane ([architecture and operating guide](docs/FORECAST_WORKBENCH.md))
- [`docs/SEMANTIC_MEASUREMENT_CONTRACTS.md`](docs/SEMANTIC_MEASUREMENT_CONTRACTS.md)
  — estimand, observation-regime, immutable data-lineage, crosswalk, and
  experiment-semantics design plus the first strict model migrations
- `scenarios/` — scenario JSON files ([format docs](scenarios/README.md))
- `baselines/` + `scripts/` — blessed regression baselines and the
  capture/compare/bless tooling
- `docs/` and `sources/` — academic references and calibration sources
- `src/simulations/outbreak/` — outbreak preparedness V1/V2, frozen WHO panel,
  calibration and holdout tests ([method and results](docs/OUTBREAK_SIMULATION.md))
- `src/simulations/critical-materials/` — Weber-style price propagation, a
  dynamic mineral bottleneck network, and the monthly Hormuz stock-flow bridge
  ([materials](docs/CRITICAL_MATERIALS_NETWORK.md), [Hormuz](docs/HORMUZ_SIMULATION.md))
- `src/simulations/{news,heat,drug-supply,trade,financial-contagion}/` — small
  news-driven stress tests with frozen backcasts and explicit scenario inputs
  ([method, results, and limitations](docs/NEWS_STRESS_TESTS_2026-07-22.md);
  latest pass: [6 September 2026](docs/NEWS_STRESS_TESTS_2026-09-06.md))
- `src/simulations/trade/network-*` — an exporter-by-HS6 trade graph with
  customs-policy incidence, supplier diversion and input-output propagation
  ([method, calibration, and July 2026 result](docs/TRADE_NETWORK_TARIFFS.md))
- `src/simulations/aviation-infrastructure/` — conventional and advanced-air-
  mobility traffic through FBOs, small airports, helipads, and vertiports,
  plus a conventional-PJ-only Bay Area airport overlay
  ([method, scenarios, and forecast](docs/AVIATION_INFRASTRUCTURE.md))
- `src/simulations/e-bike-motors/` — regional e-bike adoption, inferred
  drive-unit supplier volumes, and U.S. entrant commercial/financial scenarios
  ([method, backtest, and investment interpretation](docs/E_BIKE_MOTOR_MARKET.md))

# Overlapping Generations Energy Simulation

A TypeScript simulation exploring energy transitions, demographics, debt, and
climate from 2025 to 2100. Ten pure modules (demographics, production,
demand, capital, generations, energy, dispatch, resources, CDR, climate) are composed by a
domain-independent simulation toolkit — the [`tsimulation`](packages/tsimulation/)
package. Its module kernel resolves dependencies topologically and breaks
feedback cycles with explicit lags; its sibling model/experiment layer supports
event, monthly-network, calibration, ensemble, adapter, and provenance workflows
without forcing them into the annual-module abstraction.

This is an npm workspaces monorepo: `packages/tsimulation/` is the standalone,
MIT-licensed engine (reusable for any discrete-time simulation), and the energy
model in `src/` consumes it as a workspace dependency.

Key modeling commitments: Ayres–Warr biophysical production (useful energy as
a primary growth factor), Wright's Law learning curves for solar/wind/battery,
merit-order dispatch with VRE penetration limits, DICE-style climate damages
with tipping points, Fernández-Villaverde demographic convergence, and an
explicit intergenerational transfer + debt/credit channel.

The diagnostic layer in `src/modules/generations.ts` allocates those
flows to five-year birth-cohort balance sheets and reports borrowing-limit and
credit-rationing gaps without changing the macro path. See
[`docs/GENERATIONAL_ACCOUNTS.md`](docs/GENERATIONAL_ACCOUNTS.md). The conditional
1989–2025 validation against Federal Reserve, World Bank, and National Transfer
Accounts data is documented in
[`docs/GENERATIONAL_BACKCAST.md`](docs/GENERATIONAL_BACKCAST.md).

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
  ([method, results, and limitations](docs/NEWS_STRESS_TESTS_2026-07-22.md))
- `src/simulations/aviation-infrastructure/` — conventional and advanced-air-
  mobility traffic through FBOs, small airports, helipads, and vertiports,
  plus a conventional-PJ-only Bay Area airport overlay
  ([method, scenarios, and forecast](docs/AVIATION_INFRASTRUCTURE.md))

# Overlapping Generations Energy Simulation

A TypeScript simulation exploring energy transitions, demographics, debt, and
climate from 2025 to 2100. Ten pure modules (demographics, production,
demand, capital, generations, energy, dispatch, resources, CDR, climate) are composed by a
small domain-independent framework (`src/framework/`) that resolves
dependencies topologically and breaks feedback cycles with explicit one-year
lags.

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
- `src/framework/` — generic autowiring/collector/problem framework
  (no domain imports; reusable for other simulations)
- `scenarios/` — scenario JSON files ([format docs](scenarios/README.md))
- `baselines/` + `scripts/` — blessed regression baselines and the
  capture/compare/bless tooling
- `docs/` and `sources/` — academic references and calibration sources

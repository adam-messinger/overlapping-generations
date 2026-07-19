# Overlapping Generations Energy Simulation

A TypeScript simulation exploring energy transitions, demographics, and climate from 2025-2100.

## Project Structure

This repository is an npm **workspaces monorepo**. The generic engine lives in
its own package (`packages/tsimulation`) and the energy model consumes it.

```
overlapping-generations/           # workspaces monorepo root (private)
├── packages/
│   └── tsimulation/               # Generic simulation framework — standalone, MIT, publishable
│       ├── src/                   # autowire, module, problem, collectors, introspect, component-params, ...
│       ├── test/                  # node:test suite (zero test deps)
│       ├── examples/              # runnable predator-prey demo
│       └── README.md              # framework docs
├── src/
│   ├── modules/                   # Simulation modules (pure functions)
│   │   ├── demographics.ts
│   │   ├── production.ts
│   │   ├── demand.ts
│   │   ├── capital.ts
│   │   ├── generations.ts
│   │   ├── energy.ts
│   │   ├── dispatch.ts
│   │   ├── resources.ts
│   │   ├── cdr.ts
│   │   └── climate.ts
│   ├── primitives/                # Math functions (learningCurve, compound, etc.)
│   ├── domain-types.ts            # Region, EnergySource, Fuel, Mineral types + arrays
│   ├── standard-collectors.ts     # standardCollectors + computeEnergySystemOverhead
│   ├── simulation.ts              # Main runner + CLI
│   ├── simulation-autowired.ts    # Autowired runner, transforms, lags, YearResult mapping
│   ├── scenario.ts                # Scenario loader
│   ├── introspection.ts           # Agent parameter discovery
│   └── index.ts                   # Public API
├── scenarios/                     # Scenario configurations
├── scripts/                       # Analysis scripts
├── sources/                       # Academic references
└── baselines/                     # Saved baseline runs
```

The `tsimulation` framework is fully domain-independent and published as a
standalone open-source package (see `packages/tsimulation/README.md`). Modules
and runners import it as a workspace dependency: `import { defineModule } from 'tsimulation'`.
Domain-specific types live in `domain-types.ts` and domain-specific collectors in
`standard-collectors.ts`.

## Quick Start

```bash
# Run simulation with default parameters
npx tsx src/simulation.ts

# Run with a scenario
npx tsx src/simulation.ts --scenario=net-zero

# List available scenarios
npx tsx src/simulation.ts --list

# Explore parameters (for LLM agents)
npx tsx src/introspection.ts
npx tsx src/introspection.ts --param=carbonPrice
```

## Module Architecture

Each module implements a pure interface:

```typescript
interface Module<TParams, TState, TInputs, TOutputs> {
  validate(params): ValidationResult;
  mergeParams(partial): TParams;
  init(params): TState;
  step(state, inputs, params, year, yearIndex): { state, outputs };
}
```

### Module Dependency Graph

```
demographics (no inputs)
     ↓
production ← lagged capital, lagged energy, lagged damages, lagged food stress
     ↓
   demand ← production (GDP), demographics, lagged damages, lagged LCOE
     ↓
   capital ← demographics, demand, lagged damages, regional life expectancy
     ├→ generations ← demographics, demand (diagnostic, no feedback)
     ↓
   energy ← demand, capital
     ↓
  dispatch ← demand, energy
     ↓
  resources ← energy, demographics, demand, climate (lagged)
     ↓
     cdr ← climate (temperature), production (GDP), dispatch (LCOE), energy
     ↓
   climate ← dispatch, resources (land use carbon), cdr (removal)
     ↓
(damages, energy burden, food stress feed back via lags to production for next year)
```

## Development Conventions

CI (.github/workflows/test.yml) runs `npm test` (typecheck + unit/integration suites) and `npm run regression` (scenario metrics vs blessed baseline) on PRs. Conventions below are not otherwise enforced.

### Module Change Checklist

After changing a module's params, inputs, or outputs:

1. Grep for old param names in: defaults, `paramMeta`, scenario files, `mergeParams`
2. Verify introspection: `npx tsx src/introspection.ts` produces valid output
3. Run all scenarios (`--scenario=baseline/net-zero/high-sensitivity/climate-cascade`) — no warnings about unrecognized keys
4. Run `npm test`

Do this before committing. Most fix-up commits in project history would have been caught by steps 1-2.

### Calibration & Sources

- Every calibrated numeric default needs an inline source comment: value, source, year
  - Example: `alpha: 0.36, // Wright's Law solar learning rate, Rubin (2019)`
- Two independent sources for values that drive major outputs (learning rates, damage coefficients, elasticities)
- Observable params (population, carbon price) update with new data; structural params (elasticities, damage exponents) update rarely and require justification

### Commit Scope

- One feedback mechanism per commit (new lag + new params + new tests = own commit)
- Don't bundle: scenario tuning + module calibration + new scripts
- Calibration-only commits cite sources in the commit message
- OK to bundle: thematically related param improvements across a single module

### Parameter Lifecycle

- **Adding**: interface + defaults + `paramMeta` + validation rule + test
- **Demoting from Tier-1**: remove from `paramMeta` only; keep in interface/defaults and read from `params`
- Never hardcode a demoted param as a constant — programmatic overrides via `runSimulation({...})` must still work

### Architecture Boundaries

- `packages/tsimulation/` is a standalone, domain-independent package: it must not
  import from `src/` (the energy domain) and must stay dependency-free. Its own
  tests live in `packages/tsimulation/test/` (Node's built-in `node:test`).
- After changing framework source, rebuild it (`npm run build:framework`) so the
  workspace consumers pick up new `dist` types. `npm test`/`npm run regression`
  do this automatically via pre-hooks.
- Shared (domain) test infrastructure: `src/test-utils.ts`
- Shared math/utility functions: `src/primitives/`
- When a new approach replaces an old one, remove the old code in the same or next commit

## Key Models

### Energy
- **Solar/Wind**: Wright's Law learning curves (α=0.36 solar, α=0.23 wind)
- **Dispatch**: Merit order by marginal cost with VRE penetration limits
- **Storage**: Battery capacity enables higher VRE penetration
- **WACC**: Interest rate → WACC → LCOE channel (capital-intensive sources penalized when rates high)
- **Regional financing spreads**: per-region WACC = global rate + static risk residual + home-bias term from the region's savings gap vs the world (Feldstein-Horioka, `financingHomeBias`); calibrated so 2025 totals match the IEA Cost of Capital Observatory, `financingSpreadScale` dials friction (0 = frictionless)
- **Curtailment feedback**: High curtailment dampens VRE additions, boosts storage investment
- **System LCOE**: Solar investment cost blends with storage cost at high VRE penetration

### Climate
- **DICE-2023**: Quadratic damage function with regional multipliers
- **Tipping points**: Damage acceleration above threshold temperature
- **Carbon cycle**: Cumulative emissions → CO2 ppm → temperature

### Demographics
- **Fernández-Villaverde**: Fertility convergence to regional floors
- **3-cohort model**: Young (0-19), Working (20-64), Old (65+)
- **Education**: College share affects effective workers

### Production (Ayres-Warr Biophysical)
- **GDP = Y₀ × (K/K₀)^α × (L/L₀)^β × (E/E₀)^γ × TFP × (1-damages)**
- Useful energy is dominant growth driver (γ=0.55) — a deliberate heterodox choice (mainstream cost-share logic implies γ≈0.05-0.08)
- GDP *levels* are ~5x sensitive to γ; transition shape and warming are not — see `docs/SENSITIVITY.md` and `scripts/gamma-damage-sensitivity.ts`
- All inputs lagged to break circular dependencies
- Resource energy (mining, farming) subtracted from productive supply

### CDR (Carbon Dioxide Removal)
- Wright's Law capital cost learning + LCOE-driven energy cost
- Deploys when NPV-adjusted social cost of carbon > CDR cost
- Endogenous discount rate: social rate = fraction of market interest rate
- Energy demand subtracted from productive useful energy

### Capital, Debt & Intergenerational Transfers
- GDP = WorkerConsumption + Investment + RetireeCost + ChildCost + PublicDebtService
- **Debt/credit channel**: Investment = max(0, grossSavings + creditImpulse)
- Public debt: primary deficit accumulates (interest paid from tax revenue, not capitalized)
- Private debt: credit impulse dampened by r-g spread and leverage ratio
- **Risk premium**: high total debt/GDP → higher interest rate → self-limiting
- Retirement age adjusts with life expectancy; wages partially indexed to productivity
- Demographic savings response: life expectancy and dependency ratio affect savings

### Five-Year Generational Accounts
- Diagnostic birth-cohort assets, liabilities, taxes, transfers, and bequests
- Desired versus funded productive-capital acquisition by cohort
- Separates income-based borrowing-limit gaps from aggregate credit rationing
- Reconciles to macro capital/debt stocks but does not feed back into the macro path
- See `docs/GENERATIONAL_ACCOUNTS.md` for equations and interpretation limits

## Scenarios

| Scenario | Description |
|----------|-------------|
| `baseline` | Endogenous fast-transition, no further policy (NOT IEA STEPS — see scenario description) |
| `net-zero` | IEA NZE 2050, aggressive electrification |
| `high-sensitivity` | Climate sensitivity 4.5°C |
| `climate-cascade` | High sensitivity + tipping points |
| `tech-stagnation` | Learning rate saturation |
| `tech-breakthrough` | Aggressive learning + fusion proxy |
| `automation-boom` | High robot growth |
| `central-path` | Twin-Engine 30% probability |
| `tech-plateau` | Twin-Engine learning saturation |
| `debt-populism` | Twin-Engine policy instability |
| `regional-divergence` | Regional policy divergence |
| `ssp1-19` | IPCC SSP1-1.9 (sustainability) |
| `ssp1-26` | IPCC SSP1-2.6 (sustainability, moderate) |
| `ssp3-70` | IPCC SSP3-7.0 (regional rivalry) |
| `ssp5-85` | IPCC SSP5-8.5 (fossil development) |

## Agent Introspection

For LLM agents, `describeParameters()` and `describeOutputs()` return structured metadata:

```typescript
import { describeParameters, describeOutputs, buildParams } from './src/index.js';

const schema = describeParameters();
// schema.carbonPrice = { type, default, min, max, unit, description, path }

// Output fields (auto-generated from standardCollectors)
const outputs = describeOutputs();
// outputs.temperature = { unit: '°C', description: '...', module: 'climate' }

// Build params from name + value
const params = buildParams('carbonPrice', 150);
// Returns: { energy: { carbonPrice: 150 } }
```

Run `describeParameters()` for the current Tier-1 parameter list.

## Programmatic Use

```typescript
import { runSimulation, runWithScenario } from './src/index.js';

// Basic run
const result = runSimulation();
console.log(result.metrics.warming2100);

// With overrides
const result2 = runSimulation({
  energy: { carbonPrice: 100 },
  climate: { sensitivity: 4.0 },
});

// With scenario file
const { result } = await runWithScenario('scenarios/net-zero.json');
```

## Key Outputs

| Metric | Unit | Description |
|--------|------|-------------|
| `temperature` | °C | Above preindustrial |
| `damages` | fraction | GDP loss from climate |
| `gdp` | $T | Global GDP |
| `electricityDemand` | TWh | Total electricity |
| `gridIntensity` | kg CO₂/MWh | Grid carbon intensity |
| `fossilShare` | fraction | Fossil in electricity mix |
| `electrificationRate` | fraction | Share of energy electrified |
| `transferBurden` | fraction | Pension + healthcare + education share of GDP |
| `cdrRemoval` | Gt CO₂/yr | Carbon dioxide removal |
| `energyBurden` | fraction | Energy cost share of GDP |
| `effectiveWACC` | fraction | Weighted avg cost of capital for energy |
| `robotsDensity` | per 1000 | Robots per 1000 workers |
| `farmland` | Mha | Agricultural land (cropland + pasture) |
| `totalDebtGDP` | ratio | Total debt to GDP |
| `creditImpulse` | $T | Net new private credit |
| `debtRiskPremium` | fraction | Interest rate premium from debt |

Full output list available via `describeOutputs()`.

## Academic Sources

See `sources/` for detailed references. Sources listed here are implemented in
code; background reading that inspired the project but has no code referent
(Odum's Maximum Power Principle, Reinhart-Sbrancia financial repression, the
Weber sellers'-inflation papers) lives in `sources/` without being claimed
here.
- **Ayres/Warr**: Useful energy as production factor (biophysical economics) — the production function
- **Fernández-Villaverde**: Demographic projections — fertility convergence
- **DICE-2023/Howard-Sterner**: Climate damage function (quadratic midpoint)
- **Schlenker/Roberts**: Climate-yield relationships (stylized transfer)
- **Galbraith/Chen**: a single uncertainty-damping factor on savings (`stabilityLambda`); the full entropy-economics framework is NOT implemented

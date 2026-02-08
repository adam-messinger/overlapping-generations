# Overlapping Generations Energy Simulation

A TypeScript simulation exploring energy transitions, demographics, and climate from 2025-2100.

## Project Structure

```
overlapping-generations/
├── src/
│   ├── modules/              # Simulation modules (pure functions)
│   │   ├── demographics.ts
│   │   ├── production.ts
│   │   ├── demand.ts
│   │   ├── capital.ts
│   │   ├── energy.ts
│   │   ├── dispatch.ts
│   │   ├── resources.ts
│   │   ├── cdr.ts
│   │   └── climate.ts
│   ├── framework/            # Generic, domain-independent framework
│   │   ├── index.ts          # Barrel export
│   │   ├── autowire.ts       # Init/step/finalize with dependency resolution
│   │   ├── collectors.ts     # Generic collector infrastructure
│   │   ├── problem.ts        # Problem-solve separation (Julia SciML-inspired)
│   │   ├── types.ts          # YearIndex, TimeSeries, ValidationResult, ParamMeta
│   │   ├── module.ts         # Module interface + defineModule
│   │   ├── introspect.ts     # Parameter schema generation
│   │   ├── validated-merge.ts # validatedMerge wrapper
│   │   └── component-params.ts # Dot-path get/set (Julia ComponentArrays-inspired)
│   ├── primitives/           # Math functions (learningCurve, compound, etc.)
│   ├── domain-types.ts       # Region, EnergySource, Fuel, Mineral types + arrays
│   ├── standard-collectors.ts # standardCollectors + computeEnergySystemOverhead
│   ├── simulation.ts         # Main runner + CLI
│   ├── simulation-autowired.ts # Autowired runner, transforms, lags, YearResult mapping
│   ├── scenario.ts           # Scenario loader
│   ├── introspection.ts      # Agent parameter discovery
│   └── index.ts              # Public API
├── scenarios/                # Scenario configurations
├── scripts/                  # Analysis scripts
├── sources/                  # Academic references
└── baselines/                # Saved baseline runs
```

The `framework/` directory is fully domain-independent and reusable for other simulations. Domain-specific types live in `domain-types.ts` and domain-specific collectors in `standard-collectors.ts`.

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

## Key Models

### Energy
- **Solar/Wind**: Wright's Law learning curves (α=0.36 solar, α=0.23 wind)
- **Dispatch**: Merit order by marginal cost with VRE penetration limits
- **Storage**: Battery capacity enables higher VRE penetration
- **WACC**: Interest rate → WACC → LCOE channel (capital-intensive sources penalized when rates high)
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
- Useful energy is dominant growth driver (γ=0.55)
- All inputs lagged to break circular dependencies
- Resource energy (mining, farming) subtracted from productive supply

### CDR (Carbon Dioxide Removal)
- Wright's Law capital cost learning + LCOE-driven energy cost
- Deploys when NPV-adjusted social cost of carbon > CDR cost
- Endogenous discount rate: social rate = fraction of market interest rate
- Energy demand subtracted from productive useful energy

### Capital & Intergenerational Transfers
- GDP = WorkerConsumption + Investment + RetireeCost + ChildCost
- Retirement age adjusts with life expectancy; wages partially indexed to productivity
- Demographic savings response: life expectancy and dependency ratio affect savings

## Scenarios

| Scenario | Description |
|----------|-------------|
| `baseline` | Current policies (STEPS-aligned) |
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

// 59 Tier-1 parameters
const schema = describeParameters();
// schema.carbonPrice = { type, default, min, max, unit, description, path }

// ~99 output fields (auto-generated from standardCollectors)
const outputs = describeOutputs();
// outputs.temperature = { unit: '°C', description: '...', module: 'climate' }

// Build params from name + value
const params = buildParams('carbonPrice', 150);
// Returns: { energy: { carbonPrice: 150 } }
```

59 Tier-1 parameters available for scenario exploration.

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
| `farmland` | Mha | Cropland area |

~95 total output fields available via `describeOutputs()`.

## Academic Sources

See `sources/` for detailed references:
- **Galbraith/Chen**: Entropy economics, energy transitions
- **Odum**: Maximum Power Principle
- **Schlenker/Roberts**: Climate-yield relationships
- **DICE-2023**: Climate damage functions
- **Fernández-Villaverde**: Demographic projections

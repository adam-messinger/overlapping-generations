# Overlapping Generations Energy Simulation

A TypeScript simulation exploring energy transitions, demographics, and climate from 2025-2100.

## Project Structure

```
overlapping-generations/
├── src/
│   ├── modules/           # Simulation modules (pure functions)
│   │   ├── demographics.ts
│   │   ├── demand.ts
│   │   ├── capital.ts
│   │   ├── energy.ts
│   │   ├── dispatch.ts
│   │   ├── expansion.ts
│   │   ├── resources.ts
│   │   └── climate.ts
│   ├── framework/         # Module interface and types
│   ├── primitives/        # Math functions (learningCurve, compound, etc.)
│   ├── simulation.ts      # Main runner
│   ├── scenario.ts        # Scenario loader
│   ├── introspection.ts   # Agent parameter discovery
│   └── index.ts           # Public API
├── scenarios/             # Scenario configurations
├── scripts/               # Analysis scripts
├── sources/               # Academic references
└── baselines/             # Saved baseline runs
```

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
   demand ← demographics, lagged damages
     ↓
   capital ← demographics, demand
     ↓
   energy ← demand, capital
     ↓
  expansion ← demand, energy, demographics
     ↓
  dispatch ← demand, energy, expansion
     ↓
  resources ← energy, demographics, climate (lagged)
     ↓
   climate ← dispatch, resources
     ↓
(damages feed back to demand, capital for next year)
```

## Key Models

### Energy
- **Solar/Wind**: Wright's Law learning curves (α=0.36 solar, α=0.23 wind)
- **Dispatch**: Merit order by marginal cost with VRE penetration limits
- **Storage**: Battery capacity enables higher VRE penetration

### Climate
- **DICE-2023**: Quadratic damage function with regional multipliers
- **Tipping points**: Damage acceleration above threshold temperature
- **Carbon cycle**: Cumulative emissions → CO2 ppm → temperature

### Demographics
- **Fernández-Villaverde**: Fertility convergence to regional floors
- **3-cohort model**: Young (0-19), Working (20-64), Old (65+)
- **Education**: College share affects effective workers

### G/C Expansion (Entropy Economics)
- Energy transitions are **additive**, not substitutive
- Cheap energy unlocks new activities (cost expansion multiplier)
- Robots are new "species" filling energy niches

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

## Agent Introspection

For LLM agents, `describeParameters()` returns structured metadata:

```typescript
import { describeParameters, buildParams } from './src/index.js';

const schema = describeParameters();
// schema.carbonPrice = { type, default, min, max, unit, description, path }

// Build params from name + value
const params = buildParams('carbonPrice', 150);
// Returns: { energy: { carbonPrice: 150 } }
```

21 Tier-1 parameters available for scenario exploration.

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
| `robotsDensity` | per 1000 | Robots per 1000 workers |
| `farmland` | Mha | Cropland area |

## Academic Sources

See `sources/` for detailed references:
- **Galbraith/Chen**: Entropy economics, energy transitions
- **Odum**: Maximum Power Principle
- **Schlenker/Roberts**: Climate-yield relationships
- **DICE-2023**: Climate damage functions
- **Fernández-Villaverde**: Demographic projections

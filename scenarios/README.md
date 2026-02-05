# Scenarios

Scenario files configure the simulation with different parameter sets representing alternative futures.

## Format

Scenarios are JSON files with the following structure:

```json
{
  "name": "Human-readable name",
  "description": "Description of scenario assumptions",

  "meta": {
    "author": "Optional author",
    "source": "Optional source reference",
    "probability": 0.08
  },

  "energy": { ... },
  "demand": { ... },
  "capital": { ... },
  "expansion": { ... },
  "climate": { ... },
  "resources": { ... },
  "demographics": { ... },
  "dispatch": { ... }
}
```

Only include modules/parameters you want to override. Unspecified values use defaults.

## Available Scenarios

| Scenario | Description |
|----------|-------------|
| `baseline` | Current policies trajectory (STEPS-aligned) |
| `net-zero` | IEA Net Zero 2050 pathway |
| `high-sensitivity` | Climate sensitivity at IPCC high-end (4.5°C) |
| `tech-stagnation` | Pessimistic learning rates |
| `climate-cascade` | Tail risk: high sensitivity + early tipping |
| `automation-boom` | Accelerated AI/robotics adoption |

## Usage

### CLI

```bash
# List scenarios
npx tsx src/simulation.ts --list

# Run with scenario
npx tsx src/simulation.ts --scenario=net-zero

# Run with scenario file path
npx tsx src/simulation.ts --scenario=scenarios/custom.json
```

### Programmatic

```typescript
import { runWithScenario, runSimulation, loadScenario, scenarioToParams } from './src/index.js';

// Run with scenario
const { scenario, result } = await runWithScenario('scenarios/net-zero.json');
console.log(`${scenario.name}: ${result.metrics.warming2100}°C by 2100`);

// Load scenario and override
const scenario = await loadScenario('scenarios/baseline.json');
const params = scenarioToParams(scenario);
params.energy = { ...params.energy, carbonPrice: 200 };
const result = runSimulation(params);
```

## Module Parameters

### energy

```json
{
  "carbonPrice": 150,
  "sources": {
    "solar": { "alpha": 0.40, "growthRate": 0.30, "cost0": 35 },
    "wind": { "alpha": 0.28 },
    "battery": { "alpha": 0.30 },
    "nuclear": { "growthRate": 0.04 }
  },
  "maxGrowthRate": { "solar": 0.30 }
}
```

### demand

```json
{
  "electrificationTarget": 0.80,
  "efficiencyMultiplier": 1.3,
  "sectors": {
    "transport": { "electrificationTarget": 0.85 },
    "buildings": { "electrificationTarget": 0.95 }
  }
}
```

### climate

```json
{
  "sensitivity": 4.5,
  "damageCoeff": 0.003,
  "tippingThreshold": 2.0,
  "regionalDamage": { "oecd": 0.8, "china": 1.0, "em": 1.8, "row": 2.0 }
}
```

### expansion

```json
{
  "robotGrowthRate": 0.15,
  "robotCap": 800,
  "energyPerRobotMWh": 12,
  "expansionCoefficient": 0.30
}
```

### capital

```json
{
  "stabilityLambda": 3.0,
  "automationGrowth": 0.12
}
```

# Scenarios

Scenario files configure the simulation with different parameter sets
representing alternative futures.

## Format

Scenarios are JSON files. Top-level keys are `name`, `description`, optional
`meta` / `startYear` / `endYear`, and one key per module whose parameters you
want to override:

```json
{
  "name": "Human-readable name",
  "description": "Description of scenario assumptions",

  "meta": {
    "author": "Optional author",
    "source": "Optional source reference",
    "probability": 0.08
  },

  "demographics": { ... },
  "demand": { ... },
  "capital": { ... },
  "energy": { ... },
  "dispatch": { ... },
  "resources": { ... },
  "cdr": { ... },
  "climate": { ... }
}
```

Only include modules/parameters you want to override; unspecified values use
defaults. Unrecognized keys produce a loader warning. For the authoritative
parameter list (names, units, ranges, defaults), run:

```bash
npx tsx src/introspection.ts
npx tsx src/introspection.ts --param=carbonPrice
```

## Available scenarios

See the scenario table in [CLAUDE.md](../CLAUDE.md) for the full list with
descriptions, or:

```bash
npx tsx src/simulation.ts --list
```

## Usage

### CLI

```bash
# Run with a named scenario
npx tsx src/simulation.ts --scenario=net-zero

# Run with a scenario file path
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

## Example overrides

```json
{
  "energy": {
    "carbonPrice": 150,
    "sources": { "solar": { "alpha": 0.40 }, "wind": { "alpha": 0.28 } }
  },
  "climate": {
    "sensitivity": 4.5,
    "tippingThreshold": 2.0
  },
  "demand": {
    "dataCenterBaseGrowth": 0.25
  }
}
```

Existing scenario files in this directory are the best reference for which
keys are commonly tuned together.

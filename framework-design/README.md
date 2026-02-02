# tsimulation: A TypeScript Micro-Framework for Modular Simulations

Inspired by Julia's approach to scientific computing, designed for the Overlapping Generations simulation.

## Why This Framework?

The current energy-sim.js has grown to ~5,000 lines with these pain points:

| Problem | Current Code | tsimulation Solution |
|---------|--------------|----------------|
| **250+ untyped params** | Easy to mistype, no validation | TypeScript interfaces with `validate()` |
| **Can't test in isolation** | Need full setup to test dispatch() | Each module is self-contained |
| **Global state mutation** | 5+ vars mutated in main loop | State explicit in `step()` return |
| **Two-pass GDP hack** | Fragile feedback handling | Framework iterates until convergence |
| **Parameter threading** | Tier-1→Tier-2→Tier-3 cascade | Each module owns its params |
| **Single 5000-line file** | Hard to navigate | One file per module |

## Core Principles

1. **Modules are pure** — No global state, all inputs explicit
2. **Types enforce contracts** — Params, state, inputs, outputs all typed
3. **Feedback is declarative** — Framework resolves dependencies and iterates
4. **Testing is trivial** — Each module testable in complete isolation

## Directory Structure

```
src/
├── framework/
│   ├── types.ts          # Core type definitions (Region, EnergySource, etc.)
│   ├── module.ts         # Module interface and helpers
│   ├── simulation.ts     # Simulation runner with dependency resolution
│   └── timeseries.ts     # Time series storage and query helpers
├── primitives/
│   └── math.ts           # compound, learningCurve, logistic, etc.
├── modules/
│   ├── energy.ts         # LCOE calculation, capacity state machine
│   ├── dispatch.ts       # Merit order dispatch
│   ├── climate.ts        # Emissions, temperature, DICE damages
│   ├── demographics.ts   # Population, cohorts, education (TODO)
│   ├── demand.ts         # GDP, electricity demand (TODO)
│   ├── capital.ts        # Savings, investment, robots (TODO)
│   ├── resources.ts      # Minerals, food, land (TODO)
│   └── expansion.ts      # G/C demand expansion (TODO)
├── simulation.ts         # Wire up all modules
└── index.ts              # Public API
```

## The Module Interface

Every module implements this interface:

```typescript
interface Module<TParams, TState, TInputs, TOutputs> {
  name: string;
  description: string;
  defaults: TParams;

  // Declare dependencies
  inputs: readonly (keyof TInputs)[];   // What I need from other modules
  outputs: readonly (keyof TOutputs)[]; // What I provide

  // Lifecycle
  validate(params: Partial<TParams>): ValidationResult;
  mergeParams(partial: Partial<TParams>): TParams;
  init(params: TParams): TState;

  // The core logic - MUST be pure (no side effects)
  step(
    state: TState,
    inputs: TInputs,
    params: TParams,
    year: Year,
    yearIndex: YearIndex
  ): { state: TState; outputs: TOutputs };
}
```

## Example: Climate Module

```typescript
// Full type safety on params
interface ClimateParams {
  climSensitivity: number;  // °C per CO2 doubling
  damageCoeff: number;      // DICE quadratic coefficient
  maxDamage: number;        // Cap (Weitzman)
  // ...
}

// Explicit state
interface ClimateState {
  cumulativeEmissions: number;
  temperature: number;
}

// Declared dependencies
interface ClimateInputs {
  emissions: number;  // From dispatch + demand modules
}

interface ClimateOutputs {
  temperature: number;
  damages: number;
  regionalDamages: Record<Region, number>;
}

export const climateModule = defineModule({
  name: 'climate',
  inputs: ['emissions'],
  outputs: ['temperature', 'damages', 'regionalDamages'],

  step(state, inputs, params, year, yearIndex) {
    // Pure calculation - no global state
    const newCumulative = state.cumulativeEmissions + inputs.emissions;
    const co2ppm = 280 + (newCumulative * 0.45 * 0.128);
    const temperature = /* ... */;

    return {
      state: { cumulativeEmissions: newCumulative, temperature },
      outputs: { temperature, damages, regionalDamages },
    };
  },
});
```

## Automatic Feedback Resolution

The framework builds a dependency graph from module declarations:

```
demographics → demand → expansion → dispatch → climate
                 ↑                               │
                 └───────── damages ─────────────┘
```

When it detects a cycle, it iterates until convergence:

```typescript
const sim = createSimulation({
  modules: [demographics, demand, expansion, dispatch, climate],
  maxIterations: 3,          // For feedback loops
  convergenceThreshold: 0.001, // 0.1% change = converged
});
```

## Testing in Isolation

No more setting up the entire simulation to test one function:

```typescript
// Test climate module with synthetic inputs
test('damages increase with temperature', () => {
  const state = climateModule.init(climateDefaults);

  const { outputs } = climateModule.step(
    state,
    { emissions: 50 },  // Just provide the input directly
    climateDefaults,
    2025,
    0
  );

  expect(outputs.damages).toBeGreaterThan(0);
});
```

## Comparison with Current Code

### Before (energy-sim.js)
```javascript
// 680-line runSimulation() function
function runSimulation(params = {}) {
  // Extract 25+ parameters
  const carbonPrice = params.carbonPrice ?? defaults.carbonPrice;
  // ... 50 more lines of param extraction

  // Global state mutations
  let cumulativeEmissions = climateParams.cumulativeCO2_2025;
  let gasExtracted = 0;
  let currentCapital = capitalParams.initialCapitalStock;

  // Main loop with everything interleaved
  for (let i = 0; i < numYears; i++) {
    // 500 lines of mixed logic
  }
}
```

### After (tsimulation)
```typescript
// Each concern in its own file
// climate.ts: 150 lines
// dispatch.ts: 200 lines
// energy.ts: 200 lines

// Main orchestration is trivial
const sim = createSimulation([
  energyModule,
  dispatchModule,
  climateModule,
]);

const results = sim.run({
  climate: { climSensitivity: 4.5 },
  energy: { carbonPrice: 150 },
});
```

## Query Helpers

Same query patterns as current code, but typed:

```typescript
import { query } from './framework/timeseries';

// Find crossover year
const solarBeatsGas = query.crossover(
  results,
  'energy', 'solarLCOE',
  'energy', 'gasLCOE'
);
console.log(`Solar beats gas in ${solarBeatsGas.year}`);

// Get value at specific year
const warming = query.valueAt(results, 'climate', 'temperature', 2100);

// Find peak
const peakEmissions = query.peakYear(results, 'climate', 'emissions');

// Calculate per-capita
const elecPerCapita = query.perCapita(
  results,
  'demand', 'electricityDemand',
  'demographics', 'population'
);
```

## Migration Path

1. **Start with framework/** — Copy these files as-is
2. **Port primitives/** — Direct translation from energy-sim.js
3. **Port one module at a time** — Start with climate (simplest)
4. **Add adapter** — Bridge old runSimulation() to new framework during transition
5. **Gradually migrate** — Replace old code module by module

## Files Included

```
framework-design/
├── README.md                      # This file
└── src/
    ├── framework/
    │   ├── types.ts               # Core type definitions
    │   ├── module.ts              # Module interface
    │   ├── simulation.ts          # Runner with dependency resolution
    │   └── timeseries.ts          # Query helpers
    ├── primitives/
    │   └── math.ts                # Mathematical primitives
    ├── modules/
    │   ├── climate.ts             # Complete climate module
    │   ├── climate.test.ts        # Example tests
    │   ├── dispatch.ts            # Complete dispatch module
    │   └── energy.ts              # Complete energy module
    └── simulation.ts              # Wiring example
```

## What Julia Does Better

This framework captures Julia's key ideas, but TypeScript still lacks:

1. **Multiple dispatch** — Julia functions specialize on ALL argument types
2. **Zero-cost abstractions** — Julia compiles to native code
3. **Dimensional analysis** — Unitful.jl catches unit errors at compile time
4. **Automatic differentiation** — For sensitivity analysis
5. **DifferentialEquations.jl** — Sophisticated ODE/DAE solvers

If this simulation grows significantly more complex, Julia remains the better choice for the core numerical engine. This TypeScript framework is a pragmatic middle ground that preserves your existing JavaScript investment while adding structure.

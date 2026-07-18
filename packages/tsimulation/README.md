# tsimulation

A tiny, dependency-free TypeScript framework for building modular, discrete-time
simulations. You write **modules** — pure units that declare typed inputs and
outputs and a `step()` function. The engine wires them together automatically:
it resolves execution order by topological sort, and breaks feedback cycles with
explicit one-year (one-step) **lags**.

The design borrows ideas from Julia's [SciML](https://sciml.ai/) /
ModelingToolkit ecosystem — problem/solve separation, component-array parameter
access, co-located parameter metadata — and brings them to TypeScript.

- **Zero runtime dependencies.** Ships as ESM with type declarations.
- **No Node built-ins in the core.** Runs in Node, Deno, Bun, and browsers
  (uses only `structuredClone` and `console.warn`).
- **Fail-fast wiring.** Output collisions, unresolved inputs, dependency cycles,
  transform typos, and `NaN`/`Infinity` outputs all throw with clear messages.

> Extracted from the [overlapping-generations](https://github.com/adam-messinger/overlapping-generations)
> energy–climate–demographics model, where it composes ten modules across a
> 75-step run. It is domain-independent: nothing here knows about energy or years.

## Install

```bash
npm install tsimulation
```

Requires Node.js ≥ 20 (or any ESM runtime with `structuredClone`).

**ESM-only.** This package ships as ES modules — `import` it. There is no
CommonJS build; `require('tsimulation')` works only on Node versions with
`require(esm)` support (≥ 20.19 / ≥ 22.12) and throws `ERR_REQUIRE_ESM` on
older ones. Use a dynamic `import()` from CommonJS if you need to.

## Concepts

| Concept | What it is |
|---------|------------|
| **Module** | A unit with `defaults`, declared `inputs`/`outputs`, `init()`, and a pure `step()`. Composed via `defineModule`. |
| **Autowire** | The engine reads every module's `inputs`/`outputs`, builds a dependency graph, and runs modules in topological order each step. |
| **Transform** | A function that derives an input from other modules' outputs (e.g. a ratio). Declares `dependsOn` so the engine can order it. |
| **Lag** | A delayed value used to break a feedback cycle. Module A can read last step's output of module B even though B reads A this step. |
| **Collector** | A declarative spec for extracting per-step time series and summary metrics from a completed run. |

The engine advances in integer steps (labelled `startYear`..`endYear`, but the
labels are just integers — use `0..N` for a generic horizon).

### Why lags?

If `prey` depends on `predators` and `predators` depends on `prey`, there is no
valid execution order — a true cycle. Real dynamical systems resolve this with
time: this step's predators depend on *last* step's prey. You model that by
declaring a `lag`, and the engine's cycle detector will otherwise throw rather
than silently pick an order.

## Worked example: predator–prey

Two modules in mutual feedback, with the cycle broken by a one-step lag. See
[`examples/predator-prey.ts`](examples/predator-prey.ts) for the runnable file
(`npm run example`).

```typescript
import { defineModule, runAutowired } from 'tsimulation';

// Prey grow logistically and are thinned by (last step's) predators.
const prey = defineModule({
  name: 'prey',
  description: 'Prey population',
  defaults: { growth: 0.6, capacity: 120, predation: 0.02 },
  inputs: ['laggedPredators'] as const,
  outputs: ['prey'] as const,
  validate: () => ({ valid: true, errors: [], warnings: [] }),
  mergeParams: (p) => ({ growth: 0.6, capacity: 120, predation: 0.02, ...p }),
  init: () => ({ count: 40 }),
  step: (state, inputs, params) => {
    const born = params.growth * state.count * (1 - state.count / params.capacity);
    const eaten = params.predation * state.count * inputs.laggedPredators;
    const count = Math.max(0, state.count + born - eaten);
    return { state: { count }, outputs: { prey: count } };
  },
});

// Predators feed on this step's prey and die off at a fixed rate.
const predator = defineModule({
  name: 'predator',
  description: 'Predator population',
  defaults: { efficiency: 0.012, mortality: 0.5 },
  inputs: ['prey'] as const,
  outputs: ['predators'] as const,
  validate: () => ({ valid: true, errors: [], warnings: [] }),
  mergeParams: (p) => ({ efficiency: 0.012, mortality: 0.5, ...p }),
  init: () => ({ count: 9 }),
  step: (state, inputs, params) => {
    const born = params.efficiency * inputs.prey * state.count;
    const died = params.mortality * state.count;
    const count = Math.max(0, state.count + born - died);
    return { state: { count }, outputs: { predators: count } };
  },
});

const result = runAutowired({
  modules: [predator, prey], // order doesn't matter — the engine sorts
  lags: {
    // 'prey' reads laggedPredators; it resolves to last step's 'predators'
    laggedPredators: { source: 'predators', delay: 1, initial: 9 },
  },
  startYear: 0,
  endYear: 40,
});

for (let i = 0; i < result.years.length; i++) {
  const t = result.years[i];
  const p = result.outputs.prey.prey[i].toFixed(1);
  const q = result.outputs.predator.predators[i].toFixed(1);
  console.log(`t=${t}  prey=${p}  predators=${q}`);
}
```

## Interactive stepping

`runAutowired` runs to completion. For step-by-step control (animation,
interactive tuning, early exit) use the problem/solve API:

```typescript
import { defineSimulation, init } from 'tsimulation';

const problem = defineSimulation({ modules: [predator, prey], lags, startYear: 0, endYear: 40 });
const sim = init(problem);
while (!sim.done()) {
  const { year, outputs } = sim.step();
  if (outputs.prey < 1) break; // extinction — stop early
}
const result = sim.result();
```

## Collecting results

Instead of reaching into `result.outputs[module][output]`, declare collectors
once and get tidy per-step records plus summary metrics:

```typescript
import { collectResults } from 'tsimulation';

const { timeseries, metrics } = collectResults(result, {
  timeseries: [
    { source: 'prey', unit: 'individuals' },
    { source: 'predators', unit: 'individuals' },
  ],
  metrics: [
    { source: 'prey', as: 'peakPrey', aggregator: { peak: true } },
    { source: 'predators', as: 'finalPredators', aggregator: 'last' },
  ],
});
```

## Parameter introspection

Modules can attach `paramMeta` describing each tunable parameter (range, unit,
description, tier). `generateParameterSchema(modules)` walks that metadata to
produce a schema — handy for building UIs or exposing knobs to an LLM agent.
`ComponentParams` gives immutable dot-path get/set over nested parameter trees
for sweeps.

## API surface

- **Composition:** `defineModule`, `Module`, `StepResult`, `ValidationResult`
- **Running:** `runAutowired`, `initAutowired`, `stepAutowired`, `finalizeAutowired`
- **Problem/solve:** `defineSimulation`, `solve`, `init`, `Stepper`
- **Graph internals (exposed for testing/tools):** `buildOutputRegistry`,
  `buildDependencyGraph`, `topologicalSort`, `validateWiring`, `validateConnectorTypes`
- **Transform helpers:** `requireOutput`, `optionalOutput`, `yearZeroFallback`
- **Results:** `getOutputsAtYear`, `getTimeSeries`, `collectResults`, `resolveKey`
- **Params:** `ComponentParams`, `generateParameterSchema`, `validatedMerge`

## Status

Pre-1.0. The API may change between minor versions until 1.0; changes are
recorded in [CHANGELOG.md](CHANGELOG.md). The engine is discrete and integer-stepped
by design — continuous/adaptive time stepping is out of scope.

## License

[MIT](LICENSE) © Adam Messinger

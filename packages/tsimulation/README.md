# tsimulation

A dependency-free TypeScript toolkit for simulation work, from small event and
network experiments to modular, discrete-time systems. Everything remains under
one `tsimulation` package:

- the **module kernel** wires typed `step()` components into dynamical systems;
- the **model layer** gives standalone simulations a common validated contract;
- the **experiment layer** runs scenarios, factorials, sweeps, thresholds, and
  seeded uncertainty ensembles;
- calibration, evidence, adapters, shock ledgers, and run manifests make the
  resulting claims inspectable and reproducible.

The design borrows ideas from Julia's [SciML](https://sciml.ai/) /
ModelingToolkit ecosystem — problem/solve separation, component-array parameter
access, co-located parameter metadata — and brings them to TypeScript.

- **Zero runtime dependencies.** Ships as ESM with type declarations.
- **No Node built-ins in the core.** Runs in Node, Deno, Bun, and browsers
  (uses only `structuredClone` and `console.warn`).
- **Fail-fast wiring.** Output collisions, unresolved inputs, dependency cycles,
  transform typos, and `NaN`/`Infinity` outputs all throw with clear messages.
- **Strict units by default.** Every numeric leaf at a model or module boundary
  declares a unit, while non-numeric metadata is marked explicitly. Incompatible
  wiring and runtime shape drift fail before results can escape the model.
- **One project, multiple time scales.** Annual systems, monthly networks, and
  event models share APIs without forcing every model into an annual module.
- **Evidence-aware.** Development, validation, holdout, diagnostic, and scenario
  evidence roles travel with model definitions and manifests.

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
| **Model** | A validated standalone simulation contract with version, ports, evidence, and invariants. |
| **Experiment** | A scenario set, factorial, sweep, threshold search, or seeded ensemble around a model. |
| **Adapter** | An explicit unit- and time-scale-aware bridge from one model's output to another's input. |
| **Manifest** | A stable record of model/code/data versions, hashes, calibration split, inputs, outputs, and diagnostics. |

The engine advances in integer steps (labelled `startYear`..`endYear`, but the
labels are just integers — use `0..N` for a generic horizon).

## Unit contracts

Numeric ports use registered atomic units or compound expressions such as
`$/MWh`, `$T/year`, `TWh/year`, `kgCO2/MWh`, and `people/year`. The parser
supports `*`, `/`, parentheses, and integer powers. Scale changes are never
implicit: `$B/year` cannot wire directly into `$T/year`, although
`convertUnit()` can perform the conversion inside a declared transform.
Likewise, power and energy remain distinct unless time appears explicitly
(`GW*hour` is convertible to `GWh`; `GW` is not convertible to `TWh`).

Module `connectorTypes` are complete contracts, and transforms declare both
`inputTypes` and an `outputType`. Lags carry a contract from source through the
initial value and history to the consumer. `runAutowired()` validates all of
these in `error` mode by default. Use `auditConnectorContracts()` in CI for a
non-running completeness report.

Structured values use recursive `objectPort()`, `recordPort()`, and
`vectorPort()` schemas. Each numeric leaf carries its own unit; strings and
booleans use `metadataPort()`. Required, optional, and nullable fields remain
distinct in both TypeScript and runtime validation. For example:

```typescript
const capacity = objectPort<CapacityRow>({
  solar: { unit: 'GW' },
  battery: { unit: 'GWh' },
  label: metadataPort('string', 'Scenario label'),
});
```

The recursive validator reports the full failing path, such as
`capacity.battery`, and rejects missing or undeclared fields. Use
`auditConnectorContracts()` for module graphs and `auditModelContracts()` for
standalone models; both distinguish dimensional leaves, metadata, structured
schemas, and remaining opaque escape hatches.

`opaqueConnector()` and `opaquePort()` still exist for truly external or
unbounded structures and require an explanation. They should be rare: a record
containing several physical dimensions is normally a reason to use a recursive
schema, not to make the record opaque.

Boundary contracts cannot detect a dimensionally invalid equation entirely
inside a `step()` or `run()` function. The unit-aware equation helpers cover
high-risk stock/flow and conservation identities without changing ordinary
TypeScript arithmetic:

```typescript
const addition = integrateFlow(
  unitQuantity(investment, '$T/year'),
  unitQuantity(1, 'year'),
  '$T',
);

assertUnitBalance('capital stock', unitQuantity(nextCapital, '$T'), [
  unitQuantity(previousCapital, '$T'),
  addition,
  unitQuantity(-depreciation, '$T'),
]);
```

`sumQuantities()`, `subtractQuantities()`, `multiplyQuantities()`,
`divideQuantities()`, `powQuantity()`, `convertQuantity()`, and
`assertUnitBalance()` reject incompatible dimensions immediately. Apply them to
important identities and unit transitions rather than wrapping every scalar in
the model.

## Standalone models and experiments

Event studies and monthly networks do not need to pretend they are annual
modules. Define a model directly, then put reusable experiment machinery around
it:

```typescript
import { defineModel, runFactorial, twoFactorInteraction } from 'tsimulation';

const heat = defineModel({
  id: 'heat-event',
  version: '1.0.0',
  description: 'Toy mortality response to heat and cooling access',
  run: ({ temperature, cooling }: { temperature: number; cooling: number }) => ({
    deaths: Math.max(0, temperature - 30) * (1 - cooling),
  }),
  inputPorts: { temperature: { unit: '°C' }, cooling: { unit: 'fraction' } },
  outputPorts: { deaths: { unit: 'people' } },
});

const experiment = runFactorial({
  model: heat,
  baseInput: { temperature: 35, cooling: 0 },
  factors: {
    climate: [
      { id: 'current', apply: x => x },
      { id: 'hotter', apply: x => ({ ...x, temperature: x.temperature + 2 }) },
    ],
    adaptation: [
      { id: 'none', apply: x => x },
      { id: 'cooling', apply: x => ({ ...x, cooling: 0.5 }) },
    ],
  },
});

const interaction = twoFactorInteraction({
  experiment,
  factorA: 'climate', factorB: 'adaptation',
  controlA: 'current', treatmentA: 'hotter',
  controlB: 'none', treatmentB: 'cooling',
  outcome: output => output.deaths,
});
```

Use `calibrate()` to select candidates on development observations before
holdouts are evaluated; `runEnsemble()` for seeded Monte Carlo/Latin-hypercube
work; `defineAdapter()` for model-to-model bridges; and `createRunManifest()`
to serialize the full provenance of a run.

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
import { defineModule, runAutowired, unitConnector } from 'tsimulation';

// Prey grow logistically and are thinned by (last step's) predators.
const prey = defineModule({
  name: 'prey',
  description: 'Prey population',
  defaults: { growth: 0.6, capacity: 120, predation: 0.02 },
  inputs: ['laggedPredators'] as const,
  outputs: ['prey'] as const,
  connectorTypes: {
    inputs: { laggedPredators: unitConnector('number', 'individual') },
    outputs: { prey: unitConnector('number', 'individual') },
  },
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
  connectorTypes: {
    inputs: { prey: unitConnector('number', 'individual') },
    outputs: { predators: unitConnector('number', 'individual') },
  },
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
    laggedPredators: {
      source: 'predators', delay: 1, initial: 9,
      contract: unitConnector('number', 'individual'),
    },
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

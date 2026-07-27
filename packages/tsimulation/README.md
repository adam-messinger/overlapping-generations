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
- **Meaning is checked separately from units.** Estimands declare population,
  geography, inclusion, total/incremental status, ratio basis, temporal support,
  value vintage, and valuation. Dataset-specific measurement regimes and
  explicit crosswalks prevent equal-unit values from being treated as
  interchangeable.
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
| **Module** | A unit with `defaults`, a `connectorTypes` port contract, `init()`, and a pure `step()`. Composed via `defineModule`, which derives its port lists from that contract. |
| **Autowire** | The engine reads every module's `inputs`/`outputs`, builds a dependency graph, and runs modules in topological order each step. |
| **Transform** | A function that derives an input from other modules' outputs (e.g. a ratio). Declares `dependsOn` so the engine can order it. |
| **Lag** | A delayed value used to break a feedback cycle. Module A can read last step's output of module B even though B reads A this step. |
| **Collector** | A declarative spec for extracting per-step time series and summary metrics from a completed run. |
| **Model** | A validated standalone simulation contract with version, ports, evidence, and invariants. |
| **Experiment** | A scenario set, factorial, sweep, threshold search, or seeded ensemble around a model. |
| **Adapter** | An explicit unit- and time-scale-aware bridge from one model's output to another's input. |
| **Estimand** | The stable real-world quantity a value represents, independent of units and data release. |
| **Measurement** | A dataset field, observation procedure, coverage, and revision regime bound to an estimand. |
| **Data snapshot** | An immutable retrieval vintage with canonical request metadata and exact SHA-256 content identity. |
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

`opaquePort()` still exists for truly external or
unbounded structures and requires an explanation. It should be rare: a record
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

For equations where equal units can still hide different meanings, use
`semanticQuantity()` with `multiplySemanticQuantities()` or
`divideSemanticQuantities()`. These operations require a
`SemanticDerivation`; every supplied estimand must match the derivation's
declared inputs, so one dimensionless share cannot impersonate another.

Reusable stock/flow ledgers keep lifecycle bookkeeping out of model-specific
arrays:

- `createVintageStock()` / `advanceVintageStock()` handle opening cohorts,
  additions, delivery lags, scheduled retirements, scrappage, and terminal
  stock with a checked conservation residual.
- `depreciableVintage()` / `straightLineDepreciation()` keep deployment lags,
  useful lives, depreciation, and terminal book value explicit.
- `createTransitLedger()` / `advanceTransitLedger()` conserve dispatched,
  arrived, and terminal in-transit inventory, including fractional delays.

## Semantic and measurement contracts

Units answer “how is this number scaled?” They cannot tell total from
incremental electricity, residents from reporting hospitals, vessel counts
from cargo volume, or a first release from a backfilled series.

`EstimandContract` supplies the stable meaning of a quantity. Attach it with
`measurementPort()`. Standalone models now default to `semanticValidation:
'required'`: every quantitative leaf needs population, geography and boundary
version, stock/flow/rate/share status, total-versus-incremental status,
temporal support, and a value-vintage convention. Rates, shares, and indexes
also require an explicit numerator and denominator.

`completeModelSemanticContracts()` is a migration aid for a complete unit
schema. It preserves authored contracts and fills missing leaves with
path-specific, visibly framework-completed contracts before enforcing strict
validation. Completion clones the port graph, preserving intentional sharing
within the model without mutating schemas reused by another model.
Domain-authored contracts remain preferable wherever the real population or
reporting boundary is known. `semanticValidation: 'off'` is an explicit escape
hatch for infrastructure fixtures, not the default.

`MeasurementBinding` separately identifies the dataset, field, observation
procedure, reporting coverage, release, and revision policy. Attach a
source-bound observation with `measurementPort()` or
`observationPort()`. Two observation ports with different regimes fail
compatibility unless they carry a matching `MeasurementCrosswalk`.

```typescript
const admissions = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'us-covid-weekly-admissions',
  version: '1',
  quantityKind: 'health.covid-19.hospital-admissions',
  measure: { kind: 'flow', totality: 'total' },
  population: {
    id: 'population.us.residents',
    universe: 'People resident in the United States.',
  },
  geography: { id: 'geo.us', boundaryVersion: 'current-national-boundary' },
  time: {
    kind: 'interval',
    interval: 'epidemiological-week',
    aggregation: 'sum',
    calendar: 'cdc-week-ending-saturday',
  },
  vintage: {
    basis: 'observation-release',
    convention: 'CDC release associated with the bound measurement.',
  },
});

const firstRelease = defineMeasurement({
  schemaVersion: 'tsimulation.measurement/v1',
  id: 'cdc-first-release-admissions',
  version: '1',
  estimand: admissions,
  dataset: { id: 'cdc.weekly-admissions', field: 'covid_admissions' },
  procedure: { description: 'Freeze the initially reported national total.' },
  revisionPolicy: 'first-release',
  release: 'first',
});

const input = observationPort('people/week', firstRelease, 'vector');
```

`SemanticCrosswalk` bridges genuinely different estimands. A
`MeasurementCrosswalk` bridges observation procedures for the same (or a
crosswalked) phenomenon. `SemanticDerivation` records an equation that creates
a new estimand. Models and adapters propagate the IDs and versions of those
objects into run lineage; manifests hash the complete boundary contracts.

## Data snapshots and provenance

`captureDataSnapshot()` resolves data, hashes the exact raw bytes with SHA-256,
hashes the normalized value separately, and records the canonical request,
resolver version, retrieval/as-of/publication times, response metadata,
coverage, and measurement binding. Artifact identity is content identity;
snapshot identity also includes retrieval vintage, so identical bytes fetched
at two different times remain the same artifact but different snapshots.

Secrets are supplied by named `credentialsRef` and are never serialized.
Requests containing credential-like query/header names or URL credentials are
rejected. Portable inline resolvers are exported from `tsimulation`; Node HTTP
and file resolvers are exported from `tsimulation/node`.

`createRunManifest()` emits `tsimulation.run/v2`, linking snapshots,
transformations, evidence, calibration splits, semantic lineage, experiment
meaning, and input/output contract hashes. It also seals the complete manifest
payload with `integrityHash`; `parseRunManifest()` verifies that hash and all
recomputable component hashes by default. Parsed v1 manifests can be upgraded,
but unavailable historical lineage is explicitly marked rather than invented.

## Experiment meaning

`ExperimentContract` distinguishes scenarios, stress tests, design spaces,
sensitivity studies, aleatory uncertainty, epistemic uncertainty, and nested
mixed uncertainty. Variables declare roles and domains, and multiple
probabilistic variables must state their dependence assumption.

This changes result language as well as metadata:

- scenario/stress results are unweighted cases;
- design samples report empirical design percentiles, not probabilities;
- aleatory ensembles may report probability quantiles;
- epistemic studies report possibility bounds;
- mixed studies must use `runNestedEnsemble()` and preserve an outer set of
  epistemic cases around inner aleatory distributions. A flat mixed ensemble
  throws instead of producing a misleading single CDF.

`twoFactorInteraction()` refuses to select an arbitrary first level when a
factorial has additional factors. Callers must condition on every extra factor
or request mean marginalization; marginalization also requires balanced
extra-factor support in all four comparison cells.

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
import { defineModule, runAutowired, unitPort } from 'tsimulation';

// Prey grow logistically and are thinned by (last step's) predators.
const prey = defineModule({
  name: 'prey',
  description: 'Prey population',
  defaults: { growth: 0.6, capacity: 120, predation: 0.02 },
  connectorTypes: {
    inputs: { laggedPredators: unitPort('individual') },
    outputs: { prey: unitPort('individual') },
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
  connectorTypes: {
    inputs: { prey: unitPort('individual') },
    outputs: { predators: unitPort('individual') },
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
      contract: unitPort('individual'),
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

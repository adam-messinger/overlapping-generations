# Architecture Review — July 2026

Scope: modularization and layering only. Not a bug hunt (see
`docs/codebase-review-2026-06.md` for that). The question here is whether the
abstractions are right for **elegance, performance, understandability, and
composability**.

Tree reviewed: 70,738 lines of TypeScript across `packages/tsimulation`
(8,442), `src` (39,183), `aging-places` (12,863), `scripts` (7,029).
`npx tsc --noEmit` is clean for both the root and `aging-places` tsconfigs —
the June review's 31 errors are gone.

---

## Verdict

The **core abstraction is right**. `Module<TParams, TState, TInputs, TOutputs>`
with a pure `step()`, declared ports, autowired topological ordering, and
explicit lags for feedback is a genuinely good fit for this problem, and the
energy model reads well because of it. Nothing below argues for replacing it.

The problems are all in the layers built *around* that core, and they share one
root cause: **abstractions were added faster than they were adopted**. The
result is three parallel composition mechanisms, two parallel port
vocabularies, two parallel result-assembly paths, and a contract-validation
layer that costs 5.6x the runtime of the model it validates.

Ranked by what I'd fix first:

| # | Finding | Cost |
|---|---------|------|
| 1 | Unit/contract validation dominates runtime (~82% of a run) | Performance |
| 2 | Three composition abstractions, no shared spine | Composability |
| 3 | `ConnectorSpec` is a redundant alias of `PortMeta` (8 duplicate constructors) | Elegance |
| 4 | Declarative collectors built, never adopted; results assembled by hand twice | Understandability |
| 5 | `inputs`/`outputs` arrays are 100% derivable from `connectorTypes` | Elegance |
| 6 | `registry.ts` + `registry-port-schemas.ts` are a 2,644-line coupling hub | Composability |
| 7 | Flat global output namespace prevents model composition | Composability |
| 8 | `aging-places/` is a fourth tier outside the workspace boundary | Layering |

---

## Layer map (as built)

```
packages/tsimulation/          ENGINE + CONTRACTS (dependency-free, MIT)
  module/autowire/problem      ← composable step-graph        [used by 2 domains]
  units/semantics/collectors   ← contracts & provenance       [used by everything]
  model/adapter/registry       ← black-box run wrapper        [used by 1 file]
  study/experiment/ensemble/   ← design-of-experiments        [~unused]
  data/node-data/manifest      ← data provenance              [~unused]

src/                           ENERGY-DEMOGRAPHICS-CLIMATE MODEL
  modules/*.ts        (15,264) ← real Module implementations  ✔ uses the engine
  simulation-autowired (1,273) ← wiring: 19 transforms, 26 lags
  simulation.ts / index.ts     ← facade + public API
  connector-schemas.ts         ← shared port schemas (hub #1)

src/simulations/       (19,603) 15+ SEPARATE MODELS
  */model.ts                   ← hand-rolled time loops       ✘ bypasses the engine
  registry.ts          (1,444) ← imports all 15, wraps in defineModel
  registry-port-schemas (1,200) ← their port schemas (hub #2)
  */*-bridge.ts                ← ad-hoc cross-model glue

aging-places/          (12,863) A THIRD DOMAIN
  src/modules/*.ts             ← real Module implementations  ✔ uses the engine
  src/global-bridge.ts         ← reaches into ../../src/simulation.js
  (no package.json, own tsconfig, not a workspace)
```

The shape of the problem is visible in that map: the engine's flagship
abstraction serves two of three domains, while the largest domain
(`src/simulations`, 19,603 lines) uses `tsimulation` as a units library only —
**exactly one import per model file**, and every one of them re-implements its
own `for (let month = 0; ...)` loop and state threading.

---

## 1. Contract validation dominates runtime — 5.6x

**Measured.** A single default `runSimulation()` — 76 steps, 10 modules — takes
**6,142 ms** warm. A CPU profile attributes it almost entirely to unit-string
parsing, not to the model:

```
 20.9%  dimensionKey            units.ts:282
 17.3%  cleanDimensions         units.ts:268
  8.2%  normalizeExpression     units.ts
  6.9%  combineResolvedUnits    units.ts
  6.2%  parseAtom               units.ts
  4.6%  getUnit                 units.ts:433
  3.3%  assertPortValue         units.ts:782
  2.9%  validatePortMeta        units.ts:526
  2.4%  resolveUnit             units.ts
  ...
  1.2%  generations.step        ← the actual domain model
```

The mechanism is a layering mistake, not a micro-optimization gap:

1. `stepAutowired` calls `assertConnectorValue` on every module input and every
   module output, every step (`autowire.ts:1156`, `:1172`). Default policy is
   `connectorValidation = 'error'` (`autowire.ts:986`).
2. `assertPortValue` recurses into the value. For a
   `Record<Region, Record<EnergySource, number>>` that is 5×8 = 40 leaves.
3. **At every leaf** it first calls `validatePortMeta(meta, context)` —
   re-validating a *static, frozen contract object* against nothing.
4. `validatePortMeta` calls `getUnit(port.unit)` → `resolveUnit` →
   `normalizeExpression` + expression parse + `dimensionKey`/`cleanDimensions`.
   **There is no cache** (`units.ts:266` holds only registered base units), and
   both `resolveUnit` and `getUnit` deep-clone the result on the way out.

So `'$T/year'` is re-parsed from a string, dimension-analyzed, and cloned twice,
for every leaf of every port of every module of every step.

**Verified fix — two memos, 5.6x:**

| Patch | Warm run |
|---|---|
| baseline | 6,142 ms |
| + `Map` cache in `resolveUnit` | 1,419 ms (4.3x) |
| + `WeakSet` memo in `validatePortMeta` | **1,088 ms (5.6x)** |

Both are a few lines. I applied and measured them, then reverted — the tree is
unchanged. Correctness argument: unit symbols are immutable strings and port
metas are frozen static objects, so both results are pure functions of identity.
(`registerUnit` must invalidate the resolve cache.)

Two related taxes, both on by default:

- **Param-liveness Proxy** (6% of the post-fix profile). `runAutowiredSimulation`
  defaults `paramLiveness: 'warn'` (`simulation-autowired.ts:880`), which wraps
  the whole merged param tree in a recursive read-tracking `Proxy`
  (`autowire.ts:1037`, `liveness.ts:6`) with string-path concatenation on every
  property read, for the entire run. This is a development diagnostic paying
  rent in production.
- **Transform tracking Proxy.** `connectorValidation === 'error'` — the default —
  makes every transform read go through a fresh `Proxy` allocated per transform
  per step (`autowire.ts:1121-1136`).

**Architectural point, not just a perf point:** the validation *policy* is not
reachable from the domain layer. `runAutowiredSimulation` exposes `trackReads`
and `paramLiveness` but **not** `connectorValidation`
(`simulation-autowired.ts:807-813`), so there is no way to run a fast ensemble.
At 6.1 s/run a 1,000-member ensemble is 102 minutes; at the memoized 1.1 s it is
18; with validation off it would be seconds. `scripts/parameter-sweep.ts` and
`packages/tsimulation/src/ensemble.ts` both exist and both pay full price.

**Recommendation.** Cache both layers. Then separate the two things
`assertPortValue` currently conflates: *contract validity* (static — belongs at
wire time, where `validateConnectorTypes` already runs) and *value conformance*
(dynamic — belongs in the loop). Expose `connectorValidation` through the domain
runner and default ensemble paths to `'off'` after a validated first run.

---

## 2. Three composition abstractions with no shared spine

The framework offers three ways to define a simulation unit, and they do not
compose with each other:

| Abstraction | What it is | Real consumers |
|---|---|---|
| `Module` + `autowire` | Composable node in a wired step graph | `src/modules/*` (10), `aging-places/src/modules/*` (4) |
| `defineModel` + `ModelRegistry` | Validated black-box `run(input) → output` | `src/simulations/registry.ts` — **one file** |
| plain `simulateX(scenario)` | Hand-rolled loop, no framework | all 15+ `src/simulations/*/model.ts` |

`defineModel` is not a bad abstraction — it's a genuinely different thing from
`Module` (boundary contract + evidence + provenance around an opaque run, vs. a
composable node). The problem is that **it is applied post-hoc**. The models are
written as bare functions; `registry.ts` then wraps all 15 of them from the
outside, 1,444 lines away from the code they describe. The contract is not
adjacent to the thing it constrains, so it cannot fail fast at the point of
authorship — only when someone remembers to update the registry.

And because nothing composes `defineModel` models, cross-model wiring is done by
hand in four ad-hoc `*-bridge.ts` files (`hormuz-bridge.ts`,
`forecast-bridge.ts`, `global-bridge.ts`, plus the adapter inside
`hormuz-weber-inflation.ts`). `defineAdapter` exists for exactly this and is used
in all four — but each bridge is bespoke glue, not a composition the engine
understands. There is no equivalent of `topologicalSort` for models.

**The cost is concrete:** 19,603 lines of simulation code get none of the
engine's guarantees — no dependency ordering, no lag discipline, no NaN guard
per step, no per-step port checking, no introspection. They get unit helpers.

**Recommendation.** Pick a spine and mean it. Either:

- **(a)** Make `Module` the unit for anything with a time loop. The 15 sub-models
  mostly *are* step functions with a loop wrapped around them; `simulateOutbreakV2`
  and `simulateGenericDrugEconomics` are the easy proofs. `defineModel` then wraps
  a *wired graph*, not a bare function, and becomes the boundary layer it was
  designed to be.
- **(b)** Accept that sub-models are black boxes, but move each `defineModel`
  call **into its own model file** and delete the registry hub (see #6). The
  registry becomes a 30-line list of imports.

(a) is the better architecture; (b) is a third of the work and fixes the
adjacency problem on its own. Doing neither is the current state, and it is the
most expensive of the three.

---

## 3. `ConnectorSpec` is a redundant alias of `PortMeta`

The framework has **two vocabularies for the same concept**, with eight
near-identical constructor pairs:

| Module ports (`module.ts`) | Model ports (`units.ts`) |
|---|---|
| `unitConnector(type, unit, desc)` | `unitPort(unit, valueType, desc)` |
| `measurementConnector` | `measurementPort` |
| `observationConnector` | `observationPort` |
| `opaqueConnector` | `opaquePort` |
| `metadataConnector` | `metadataPort` |
| `objectConnector` | `objectPort` |
| `recordConnector` | `recordPort` |
| `vectorConnector` | `vectorPort` |

`connectorSpecToPortMeta` (`autowire.ts:377`) shows they are the same type:

```ts
if ('kind' in spec && spec.kind) return spec as PortMeta;   // structured: identical
...
return { unit: spec.unit, valueType: spec.type, ... };      // quantity: type → valueType
```

For structured ports the conversion is a **cast** — `ConnectorSpec` *is*
`PortMeta`. For quantity ports the only difference is that `ConnectorSpec.type`
is the required-and-positional spelling of `PortMeta.valueType`. That's it.
Two exported type families, two constructor families, 50+ exported symbols, for
one concept.

The confusion is already visible in domain code: `src/connector-schemas.ts`
imports `objectConnector`, `recordConnector`, `objectPort`, `recordPort`, and
`unitPort` **from the same import statement** and mixes them in one file.

**Recommendation.** Delete `ConnectorSpec` and the `*Connector` constructors.
Make `connectorTypes` hold `PortMeta` directly; keep `unitConnector` as a
deprecated alias for one release if scenario code depends on it. This removes
~150 lines of framework surface, one conversion function called in the hot loop,
and an entire axis of "which one do I use here?".

---

## 4. Declarative collectors: built, exported, documented, never used

`packages/tsimulation/src/collectors.ts` is 653 lines implementing a declarative
result-collection engine (`TimeseriesDef`, `MetricDef`, aggregators, contract
auditing). `src/standard-collectors.ts` is 366 lines declaring 142 timeseries for
this model.

**`collectResults()` is never called outside framework tests.** The production
path is:

```
runAutowiredFull → toYearResults()   (137 hand-written field mappings, ~218 lines)
                 → computeMetrics()  (imperative, simulation-autowired.ts:1146)
```

So the output schema is defined **three times**: `YearResult` (134 fields,
`simulation.ts:60-264`), `toYearResults` (137 mappings), and
`standardCollectors` (142 entries). `standardCollectors` survives as an
introspection metadata source and as a *test fixture* — `simulation.test.ts`
has four separate tests whose only job is to detect drift between the
declarative spec and the imperative code that actually runs.

That is the diagnostic: **when you need tests to keep an abstraction in sync
with the code that replaced it, the abstraction is not carrying its weight.**
It also means `describeOutputs()` — the LLM-agent-facing schema — describes a
spec that never executes.

`computeMetrics` and `standardCollectors.metrics` are separately duplicated and
have already drifted (`peakTransferBurden` only in collectors;
`peakPopulationYear` only in `computeMetrics`) — flagged as M16 in the June
review and still present.

**Recommendation.** Adopt or delete. Adopting is the right call and is mostly
mechanical: make `toYearResults` call `collectResults(result, standardCollectors)`,
derive `YearResult` from the collector list as a mapped type, and move
`computeMetrics`' unique metrics into `standardCollectors.metrics`. Four tests
then become unnecessary because the drift becomes unrepresentable.

---

## 5. `inputs`/`outputs` arrays are pure redundancy

Every module declares its ports **three times**: the TS interface
(`DemandInputs`/`DemandOutputs`), the string array (`inputs: [...] as const`),
and the contract (`connectorTypes.inputs/outputs`).

I verified across all 10 modules that the arrays are *exactly*
`Object.keys(connectorTypes.*)` — zero drift today, and zero information:

```
demographics   arrays === Object.keys(connectorTypes)
production     arrays === Object.keys(connectorTypes)
demand         arrays === Object.keys(connectorTypes)
capital        arrays === Object.keys(connectorTypes)
... (all 10)
```

That's ~450 lines of declaration whose only function is to be kept in sync.
`demand.ts` alone spends 62 lines on the arrays (`demand.ts:1012-1073`) before
restating the same 45 names in `connectorTypes`.

This redundancy is not harmless — it is the shape of the June review's H5
(phantom outputs `garrettJ`, `effectiveDepreciation` advertised by collectors
with no producing module). More declaration sites means more places for a name
to exist without an implementation.

**Recommendation.** Derive `inputs`/`outputs` from `connectorTypes` in
`defineModule`. The `as const` arrays currently do carry the literal-union types
that `TInputs`/`TOutputs` check against, so this needs
`keyof typeof connectorTypes.inputs` to take over that job — a real but bounded
piece of type work, and it deletes a whole class of drift permanently.

---

## 6. The registry is a coupling hub

`src/simulations/registry.ts` (1,444 lines) imports **65 modules** — every
simulation in the tree. `registry-port-schemas.ts` (1,200 lines) holds 90 port
schemas for those same simulations, hoisted out of the leaves into a shared file.

Two consequences:

- **Every consumer pays for everything.** Measured: importing `registry.ts` costs
  **233 ms**; importing `heat/model.js` alone costs **45 ms**. All 40 scripts in
  `scripts/` import the registry to reach one model
  (`scripts/heat-adaptation-scenario.ts` wants `heatEventModel` and loads the
  outbreak, aviation, contagion, and Hormuz models to get it).
- **Leaf knowledge lives in the hub.** A port schema for the aviation model
  belongs next to the aviation model. Hoisting it into
  `registry-port-schemas.ts` means adding a field to a leaf requires editing a
  shared file that 15 unrelated models also depend on — the classic
  shared-mutable-header problem, and it inverts the dependency direction the rest
  of the tree follows.

Note the contrast: `src/connector-schemas.ts` (hub #1, 18 exports) is
*legitimately* shared — those schemas describe records genuinely passed between
modules in one wired graph. `registry-port-schemas.ts` (hub #2, 90 exports) is
not; its contents are private to one model each.

**Recommendation.** Move each `PORT` schema into its own model's directory
(most already have a `data.ts` that is the natural home), and move each
`defineModel` call next to its `run` function. `registry.ts` collapses to
imports plus `new ModelRegistry().register(...)`. Consumers can then import one
model. If a lazy catalogue is wanted, make the registry values thunks.

---

## 7. Flat global output namespace

`buildOutputRegistry` (`autowire.ts:221-241`) throws on any output-name
collision across modules. Output names are therefore a single flat global
namespace, and `currentOutputs` is one untyped `Record<string, any>` cleared each
step.

This is a fine trade for one model — it's what makes the wiring readable, and
`gdp` meaning one thing everywhere is a feature. But it caps composability
hard: **two instances of any model can never coexist in one graph**, and two
models that both produce `population` cannot be wired together at all without
renaming one module's outputs. Regional/multi-instance work (`aging-places`
already runs a second model family, and `global-bridge.ts` bridges them by
running one simulation and feeding results into another) hits this ceiling
directly.

**Recommendation.** Not urgent, but worth deciding deliberately rather than by
default. Namespacing outputs as `module.output` with unqualified names resolving
when unambiguous would preserve today's readability while unblocking instancing.
If instead the flat namespace is a *chosen* constraint, say so in the framework
README — right now it reads as an accident.

---

## 8. `aging-places/` sits outside the layering

`aging-places/` is 12,863 lines — a third domain model, structurally a mirror of
`src/` (`domain-types.ts`, `modules/`, `simulation.ts`, its own `AGING_MODULES`
wired through `runAutowired`). It is architecturally a peer of the energy model.

But it is **not a workspace**: no `package.json`, its own `tsconfig.json` with
`typeRoots: ["../node_modules/@types"]`, and it reaches into its sibling by
relative path:

```
aging-places/src/global-bridge.ts:14      from '../../src/simulation.js'
aging-places/src/global-bridge.ts:8       from '../../src/domain-types.js'
aging-places/japan/src/validation.ts:1    from '../../src/scoring.js'
aging-places/*.test.ts  (12 files)        from '../../src/test-utils.js'
```

`src/test-utils.ts` is the shared test harness for three domains but lives in
one of them — CLAUDE.md even documents it as "shared (domain) test
infrastructure", which is a contradiction in terms once there are three domains.

CLAUDE.md's own architecture-boundaries rule states the framework must not
import from `src/`. There is no stated rule for domain↔domain, and the absence
shows: `aging-places` depends on the energy model's *internals*, not on a
published surface.

**Recommendation.** Either promote `aging-places` to `packages/aging-places` with
a real `package.json` (so the dependency on the energy model becomes a declared
one), or move it to `src/aging-places` and accept it as part of one domain
package. Either way, extract `test-utils.ts` — and probably `scoring.ts` — into
`packages/testkit` or into `tsimulation` proper. The current arrangement is the
only one that lets a cycle form silently.

---

## Under-adopted framework surface

Distinct from the findings above, but the same disease. Exported from the public
barrel, with the number of files outside `packages/tsimulation` that reference
each:

| Module | Lines | Exports | Real consumers |
|---|---|---|---|
| `study.ts` | 418 | 12 | **0** (framework test only) |
| `node-data.ts` | 135 | 4 | **0** |
| `serialization.ts` | 43 | 2 | 0 direct (used internally) |
| `data.ts` | 477 | 25 | 1 |
| `experiment.ts` | 303 | 18 | 1 |
| `ensemble.ts` | 358 | 15 | 1 |
| `manifest.ts` | 275 | 7 | 2 |
| `calibration.ts` | 214 | 6 | 2 |
| `shock-ledger.ts` | 103 | 5 | 1 |

That is ~2,300 lines and ~90 exported symbols of design-of-experiments and
data-provenance machinery with essentially no callers. For a package whose
README presents it as a publishable general-purpose engine, this is the first
thing a new reader has to triage, and it is most of what `index.ts` exports.

`node-data.ts` additionally imports `node:fs/promises` and `node:url` — a
platform dependency in a package documented as dependency-free and
domain-independent.

**Recommendation.** Move `study`, `experiment`, `data`, `node-data`, and
`manifest` behind subpath exports (`tsimulation/study`, `tsimulation/data`) or
into a `tsimulation-lab` package. The core — `module`, `autowire`, `problem`,
`units`, `collectors` — is ~4,000 lines and is the part that earns its keep.

---

## What is genuinely good

Worth stating plainly, because the list above is one-sided:

- **`Module` + `step()` purity.** Modules are honestly pure, state is threaded
  explicitly, and the domain code is testable in isolation. This is the load-bearing
  decision and it was made correctly.
- **Lags as first-class config.** Making feedback delays explicit
  (`LagConfig.bootstrap` distinguishing stock from flow initialization,
  `autowire.ts:97-121`) is a better answer than convergence iteration, and the
  comment explaining *why* stocks must not bootstrap is the kind of documentation
  that prevents a whole bug class.
- **Fail-fast wiring.** `buildOutputRegistry` collision detection, topological
  sort, `validateWiring`, and per-step NaN guards catch real mistakes at the
  right time.
- **Unit contracts on ports at all.** The idea is right — a model that carries
  `$T/year` vs `$/MWh` in its type system is far more trustworthy than one that
  doesn't. Finding #1 is an implementation defect in a good idea, not an argument
  against it.
- **`src/simulations/*` internal consistency.** Every sub-simulation follows the
  same `model.ts` / `data.ts` / `calibration.ts` / `*.test.ts` layout. That
  convention is doing real work and should be preserved through any restructuring.
- **`problem.ts`.** Small, clean, does exactly one thing (define/solve/step
  separation) in 123 lines.

---

## Suggested order of work

1. **Memoize `resolveUnit` and `validatePortMeta`; expose `connectorValidation`
   through `runAutowiredSimulation`; default `paramLiveness` to `'off'` outside
   dev.** ~30 lines, measured 5.6x, unblocks ensembles. Do this first.
2. **Delete `ConnectorSpec`/`*Connector` in favor of `PortMeta`/`*Port`.**
   Mechanical, removes a hot-path conversion and an entire vocabulary.
3. **Derive `inputs`/`outputs` from `connectorTypes`.** Deletes ~450 lines and
   a drift class.
4. **Adopt `collectResults`; collapse `toYearResults`/`computeMetrics`/
   `standardCollectors` to one definition.** Deletes four sync-checking tests.
5. **Dissolve the registry hub:** schemas and `defineModel` calls move to leaves.
6. **Move under-adopted framework modules behind subpath exports.**
7. **Decide `aging-places`' boundary** and extract `test-utils`.
8. **Decide, and document, whether the flat output namespace is permanent.**

Steps 1-4 are net line *deletions* and touch no model behavior — the regression
baseline should be byte-identical. Steps 5-8 are structural and want their own
commits per CLAUDE.md's commit-scope rule.

# Changelog

All notable changes to `tsimulation` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) from 1.0
onward. Before 1.0, minor versions may include breaking changes.

## [Unreleased]

### Performance
- `assertPortValue` no longer re-validates the port contract at every node of
  its recursive descent. Contract validity and value conformance are separate
  questions: the contract is a static schema that `validatePortMeta` already
  walks in full, so it is now checked once at the top of the descent instead of
  once per value leaf. For a `Record<Region, Record<Source, number>>` that is
  one contract walk rather than ~40.
- Unit resolution is memoized, keyed on the raw symbol and invalidated by
  `registerUnit`. Contract checking resolved the same handful of unit strings
  at every port on every step, re-parsing each expression from scratch.

  Together these took a representative 76-step, 10-module run from 6,617 ms to
  1,238 ms (5.4x) with byte-identical outputs. `validatePortMeta` remains a
  pure predicate — nothing about a contract's validity is cached.

### Changed
- `getUnit` no longer clones the resolved unit a second time. It still returns a
  private copy that callers may freely mutate.

### Added
- Standalone `defineModel` / `runModel` contracts and a model registry, with
  finite-value checks, invariants, port metadata, evidence, and validation claims.
- Development-only calibration selection with sealed validation/holdout scoring
  and stable split hashes.
- Scenario, factorial, difference-in-differences, sweep, threshold, parameter
  effect, seeded ensemble, quantile, Latin-hypercube, and rank-sensitivity APIs.
- Explicit model adapters carrying source/target model names, units, and time scales.
- Unit registry/conversion, overlap-aware shock composition, conflict-safe
  temporal merges, stable serialization/hashing, and reproducible run manifests.
- Compound-unit algebra (`*`, `/`, powers, and parentheses), complete typed
  port contracts, explicit opaque-port escape hatches, and CI-friendly graph
  contract audits.
- Recursive object, record, and vector port schemas with leaf-level units,
  explicit string/boolean metadata, optional/nullable semantics, exact runtime
  shape checks, and model-registry contract audits.
- Unit-aware equation helpers for compatible sums and differences, products,
  quotients, powers, explicit flow integration, conversion, and accounting or
  conservation balance assertions.
- Shared validated linear/fixed-point solvers and generic DAG validation/sorting.
- Deep parameter-read tracking and unread-override diagnostics.
- Versioned estimand contracts for population, geography, inclusion,
  total/incremental and stock/flow meaning, ratio basis, temporal support,
  valuation, and sign convention.
- Dataset-specific measurement bindings and measurement crosswalks for source
  fields, observation procedures, reporting coverage, releases, revisions,
  backfills, and transformations.
- Immutable SHA-256 data artifacts and retrieval snapshots, resolver-backed
  lineage, safe credential references, evidence/calibration snapshot linkage,
  and Node HTTP/file resolvers.
- Explicit experiment intent and variable roles, including separate aleatory,
  epistemic, and nested mixed-uncertainty result semantics.
- Semantic derivation/crosswalk propagation through modules, transforms,
  adapters, collectors, standalone models, calibration, and v2 run manifests.

### Changed (behavior)
- The engine now runs each module's `validate()` at load time, throwing on
  invalid params and warning on warnings. Previously `validate()` was never
  called by the engine — a module relying on it for enforcement would have let
  invalid params through.
- A transform whose key equals a module output name is now a wiring error
  (previously the transform silently shadowed the output for consumers). Rename
  the transform, or drop it if it only passed the output through.
- Lag `delay` must be an integer ≥ 1; invalid delays are now a wiring error
  instead of silently producing `undefined`/mis-sized buffers.
- Duplicate module names, transform/lag ambiguity, direct current-step
  self-consumption, and transform self-dependencies are now wiring errors.
- Batch and interactive problem execution share the same lag-bootstrap path.
- Lag bootstrapping can use convergence tolerance, damping, iteration limits,
  failure policy, and returned residual diagnostics instead of a fixed pass count.
- Connector declarations now require units and value-shape metadata for every
  module input/output. Transforms and lags carry explicit signatures, and
  connector validation defaults to errors rather than warnings.
- Standalone model input/output contracts are complete at compile time and
  checked against actual runtime objects. Adapter targets require explicit
  source mappings, conversion declarations, and aggregation declarations.
- Structured module and standalone-model contracts are now checked recursively
  instead of treating a whole record or vector as one opaque boundary value.
- Ports with equal units but incompatible estimands or declared measurement
  regimes now fail unless an explicit matching crosswalk is supplied.
- Ensemble summaries now distinguish probability quantiles, design-sample
  percentiles, and epistemic bounds. Flat mixed-uncertainty ensembles are
  rejected in favor of nested families.
- Run manifests now emit `tsimulation.run/v2` with boundary-contract hashes,
  semantic lineage, experiment meaning, and full external-data lineage; v1
  records upgrade with unavailable historical fields marked explicitly.

### Fixed
- The NaN/Infinity output guard now descends into arrays and arbitrarily deep,
  cycle-safe object output (it previously stopped at a fixed depth).
- `topologicalSort` no longer mutates its input graph, so it is safe to call
  more than once (a second call previously returned wrong order).
- `ComponentParams.get()` deep-clones object subtrees (immutability); `set()`
  no longer throws when a path passes through a `null` node.
- Collector `max`/`min`/`peak` return `undefined` (not `±Infinity`) on an empty
  or all-non-numeric series; `max`/`min` use a reduce (no stack overflow on long
  series). `collectResults` validates metric configs up front (unknown source
  key, or neither source nor transform, now throw).
- Persisted data requests reject credential-like query/header names, URL
  credentials, and credential-like URL query parameters.

### Packaging
- Added a `default` export condition so `require('tsimulation')` resolves on
  Node with `require(esm)` support; documented the package as ESM-only.
- Ship `src/` so the bundled source maps / declaration maps resolve to real
  sources for debugging and go-to-definition.

## [0.1.0] — 2026-07-18

Initial public release. Extracted, unchanged in behavior, from the
`overlapping-generations` energy–climate–demographics model.

### Added
- `defineModule` / `Module` interface: pure modules with typed inputs, outputs,
  parameters, and `step()`.
- Autowiring engine: `runAutowired`, `initAutowired`, `stepAutowired`,
  `finalizeAutowired`, with topological ordering and output-collision detection.
- Feedback support via `lags`, and derived inputs via `transforms` (with
  `dependsOn` dependency tracking and a dev-mode read tracker).
- Composition-time validation: unresolved inputs, dependency cycles, transform
  typos, transform chaining, and cycle-breaker misuse all throw.
- Runtime output guards: missing declared outputs and `NaN`/`Infinity` values
  (including nested records) throw with the offending path and step.
- Problem/solve separation: `defineSimulation`, `solve`, `init` (stepper).
- Declarative result collection: `collectResults`, `resolveKey`.
- Parameter tooling: `ComponentParams` (dot-path get/set), `generateParameterSchema`
  (from co-located `paramMeta`), `validatedMerge`.
- Transform helpers: `requireOutput`, `optionalOutput`, `yearZeroFallback`.

### Changed from the in-repo framework
- `startYear` and `endYear` are now **required** on the run config (the previous
  `2025`/`2100` defaults were domain-specific).
- Doc comments no longer reference calendar years or energy-domain specifics.
- Tests run on Node's built-in test runner (`node:test`) with zero test
  dependencies.

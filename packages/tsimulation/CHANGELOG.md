# Changelog

All notable changes to `tsimulation` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) from 1.0
onward. Before 1.0, minor versions may include breaking changes.

## [Unreleased]

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

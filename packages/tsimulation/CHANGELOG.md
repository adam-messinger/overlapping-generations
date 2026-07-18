# Changelog

All notable changes to `tsimulation` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) from 1.0
onward. Before 1.0, minor versions may include breaking changes.

## [Unreleased]

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

# Contributing to tsimulation

Thanks for your interest. This package is small and intends to stay that way —
a focused engine for modular discrete-time simulations, with zero runtime
dependencies.

## Scope

In scope: the module abstraction, autowiring, lags/transforms, wiring and output
validation, result collection, and parameter tooling.

Out of scope (by design): domain models, continuous/adaptive time stepping,
solvers/optimizers, data I/O, and anything that would add a runtime dependency.
The core must not import Node built-ins beyond what already ships (`structuredClone`,
`console.warn`), so it keeps running in browsers, Deno, and Bun.

## Development

```bash
npm install          # from the monorepo root
npm run build -w tsimulation
npm test -w tsimulation
npm run example -w tsimulation
```

Tests use the Node built-in runner (`node:test` + `node:assert/strict`), executed
through [`tsx`](https://github.com/privatenumber/tsx). Add a `*.test.ts` file
under `test/` and it will be picked up.

## Expectations for changes

- **Behavior changes need tests.** New validation rules, new aggregators, and new
  wiring semantics each need a covering test.
- **Keep it dependency-free.** PRs that add a runtime dependency will not be merged.
- **Public API changes go in the CHANGELOG** under `Unreleased`, with a note on
  whether they are breaking (allowed in a minor bump before 1.0).
- **Match the existing style.** Explanatory comments explain *why* a rule exists
  (see the wiring validators), not *what* a line does.

## Reporting issues

Please include a minimal module setup that reproduces the problem — the smaller
the `defineModule` fixtures, the faster it can be diagnosed.

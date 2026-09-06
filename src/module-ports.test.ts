/**
 * Module execution-order invariant.
 *
 * Module ports are declared once, as `connectorTypes`; `defineModule` derives
 * the `inputs`/`outputs` arrays from `Object.keys` of that contract. Object.keys
 * preserves insertion order, and that order is load-bearing:
 *
 *   buildDependencyGraph walks `mod.inputs` in declaration order, seeding
 *   topologicalSort's ready queue and so deciding tie-breaking among modules
 *   with no dependency between them.
 *
 * That matters for the `optionalOutput(...)` transforms in
 * simulation-autowired.ts, but narrowly. `currentOutputs` is cleared at the top
 * of every step, so a transform whose producer sorts AFTER its consumer takes
 * the fallback in every year regardless of order. Only producer/consumer pairs
 * where the producer currently sorts FIRST are genuinely order-sensitive — for
 * those, reordering a module's port declarations would move model outputs
 * silently instead of failing.
 *
 * The pinned order below is therefore a canary, not a specification: a failure
 * means "the sort changed, go check whether an order-sensitive pair flipped",
 * not "this list is the only correct order".
 */

import { expect, printSummary, test } from './test-utils.js';
import { runAutowiredSimulation } from './simulation-autowired.js';

console.log('\n=== Module Port Declaration Tests ===\n');

test('module execution order is stable', () => {
  // AutowireResult.outputs is seeded in topologically-sorted module order, so a
  // real run reports the order the engine actually used — including the effect
  // of the production transforms and lags.
  const order = Object.keys(runAutowiredSimulation({ endYear: 2026 }).outputs);

  // Note this is NOT the order drawn in CLAUDE.md's dependency graph, which
  // shows cdr between resources and climate. cdr's live inputs are satisfied
  // much earlier, so the sort places it fourth; everything it reads from
  // dispatch/climate arrives via lags.
  expect(order).toEqual([
    'demographics',
    'production',
    'demand',
    'cdr',
    'capital',
    'generations',
    'humanCapital',
    'energy',
    'dispatch',
    'resources',
    'climate',
  ]);
});

printSummary();

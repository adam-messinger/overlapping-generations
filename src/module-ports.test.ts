/**
 * Module port-declaration invariants.
 *
 * Every module declares its ports twice: as `inputs`/`outputs` string arrays and
 * as `connectorTypes`. Set equality between the two is already enforced by the
 * engine (`validateConnectorTypes` rejects a declared port with no contract and
 * a contract with no declared port). What is NOT enforced anywhere is ORDER,
 * which is load-bearing:
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
 * those, a reordering would move outputs silently instead of failing.
 *
 * The pinned order below is therefore a canary, not a specification: a failure
 * means "the sort changed, go check whether an order-sensitive pair flipped",
 * not "this list is the only correct order".
 */

import { expect, printSummary, test } from './test-utils.js';
import { ALL_MODULES, runAutowiredSimulation } from './simulation-autowired.js';

console.log('\n=== Module Port Declaration Tests ===\n');

for (const mod of ALL_MODULES) {
  test(`${mod.name}: inputs match connectorTypes.inputs in order`, () => {
    expect(mod.inputs.map(String)).toEqual(Object.keys(mod.connectorTypes.inputs));
  });

  test(`${mod.name}: outputs match connectorTypes.outputs in order`, () => {
    expect(mod.outputs.map(String)).toEqual(Object.keys(mod.connectorTypes.outputs));
  });
}

test('module execution order is stable', () => {
  // AutowireResult.outputs is seeded in topologically-sorted module order, so a
  // real run reports the order the engine actually used — including the effect
  // of the production transforms and lags.
  const order = Object.keys(runAutowiredSimulation({ endYear: 2026 }).outputs);

  // Pinned because `optionalOutput` transforms read whether a producer has
  // already run this step. Changing this order changes model outputs.
  //
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
    'energy',
    'dispatch',
    'resources',
    'climate',
  ]);
});

printSummary();

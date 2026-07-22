/**
 * Tests for problem/solve separation and the interactive stepper.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defineSimulation, solve, init } from '../src/problem.js';
import { defineModule } from '../src/module.js';
import { okValidate } from './helpers.js';

const counter = defineModule({
  name: 'counter',
  description: 'counts up by a fixed step',
  defaults: { step: 1 },
  inputs: [] as const,
  outputs: ['n'] as const,
  validate: okValidate,
  mergeParams: (p) => ({ step: 1, ...p }),
  init: (params) => ({ n: 0, step: params.step }),
  step: (state) => ({
    state: { ...state, n: state.n + state.step },
    outputs: { n: state.n + state.step },
  }),
});

function problem() {
  return defineSimulation({ modules: [counter], startYear: 0, endYear: 3 });
}

test('solve runs a problem to completion', () => {
  const result = solve(problem());
  assert.deepStrictEqual(result.years, [0, 1, 2, 3]);
  assert.deepStrictEqual(result.outputs.counter.n, [1, 2, 3, 4]);
});

test('stepper advances one step at a time and reports done', () => {
  const sim = init(problem());
  assert.strictEqual(sim.done(), false);
  assert.strictEqual(sim.year(), 0);

  const first = sim.step();
  assert.strictEqual(first.year, 0);
  assert.strictEqual(first.outputs.n, 1);
  assert.strictEqual(first.done, false);
  assert.strictEqual(sim.year(), 1);
  assert.deepStrictEqual(sim.getOutputs(), { n: 1 });

  sim.step(); // year 1 → n 2
  sim.step(); // year 2 → n 3
  const last = sim.step(); // year 3 → n 4
  assert.strictEqual(last.year, 3);
  assert.strictEqual(last.outputs.n, 4);
  assert.strictEqual(last.done, true);
  assert.strictEqual(sim.done(), true);
});

test('stepper result() collects all steps taken so far', () => {
  const sim = init(problem());
  while (!sim.done()) sim.step();
  const result = sim.result();
  assert.deepStrictEqual(result.outputs.counter.n, [1, 2, 3, 4]);
});

test('batch and stepper use the same bootstrap-prepared lag initials', () => {
  const flow = defineModule({
    name: 'flow',
    description: '',
    defaults: {},
    inputs: [] as const,
    outputs: ['flow'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { flow: 10 } }),
  });
  const reader = defineModule({
    name: 'reader',
    description: '',
    defaults: {},
    inputs: ['previous'] as const,
    outputs: ['seen'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_state, inputs) => ({ state: {}, outputs: { seen: inputs.previous } }),
  });
  const problem = defineSimulation({
    modules: [flow, reader],
    lags: { previous: { source: 'flow', delay: 1, initial: 0, bootstrap: true } },
    bootstrapLags: { maxIterations: 2, tolerance: 0 },
    startYear: 0,
    endYear: 0,
  });
  const batch = solve(problem);
  const stepper = init(problem);
  stepper.step();
  assert.strictEqual(batch.outputs.reader.seen[0], 10);
  assert.strictEqual(stepper.result().outputs.reader.seen[0], 10);
});

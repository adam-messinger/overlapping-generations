/**
 * The executor seam.
 *
 * `runEnsembleAsync` exists so model evaluations can be spread across workers.
 * That is only safe if the result does not depend on the executor, so these
 * tests drive one study through executors that finish in deliberately wrong
 * orders and demand the serial answer back — and through executors that cheat,
 * which must be rejected rather than quietly believed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runEnsemble,
  runEnsembleAsync,
  serialExecutor,
  orderTaskResults,
  type TaskExecutor,
} from '../src/index.js';
import { defineModel } from '../src/model.js';

const scaleModel = defineModel<{ x: number }, { y: number }>({
  id: 'scale',
  version: '1.0.0',
  description: 'Doubles its input',
  inputPorts: { x: { unit: '1' } },
  outputPorts: { y: { unit: '1' } },
  semanticValidation: 'off',
  run: (input) => ({ y: input.x * 2 }),
});

const study = {
  model: scaleModel,
  draws: 24,
  seed: 1234,
  sample: (random: () => number) => {
    const x = random();
    return { input: { x }, parameters: { x } };
  },
  metrics: { y: (output: { y: number }) => output.y },
};

/** Runs every task concurrently; completion order is real, not simulated. */
const concurrentExecutor: TaskExecutor = {
  async map(items, task) {
    return Promise.all(items.map(async (item, index) => ({
      index,
      result: await task.run(item, index),
    })));
  },
};

/**
 * Genuinely out-of-order completion: staggered timers mean later items can
 * finish first, and results are returned in whatever order they land.
 */
const outOfOrderExecutor: TaskExecutor = {
  async map(items, task) {
    const landed: Array<{ index: number; result: any }> = [];
    await Promise.all(items.map((item, index) => new Promise<void>((resolve) => {
      setTimeout(async () => {
        landed.push({ index, result: await task.run(item, index) });
        resolve();
      }, (items.length - index) % 7);
    })));
    return landed;
  },
};

test('an executor cannot change the answer', async () => {
  const serial = runEnsemble(study);
  for (const [name, executor] of [
    ['default (none given)', undefined],
    ['serialExecutor', serialExecutor],
    ['concurrent', concurrentExecutor],
    ['out-of-order completion', outOfOrderExecutor],
  ] as const) {
    const viaExecutor = await runEnsembleAsync(study, executor);
    assert.deepEqual(viaExecutor.outputs, serial.outputs, `${name}: outputs differ`);
    assert.deepEqual(viaExecutor.metrics, serial.metrics, `${name}: metrics differ`);
    assert.deepEqual(
      viaExecutor.rankSensitivity,
      serial.rankSensitivity,
      `${name}: rank sensitivity differs`,
    );
  }
});

test('out-of-order completion really happens in that test executor', async () => {
  // Otherwise the test above would be asserting against a serial executor
  // wearing a different name.
  const order = await outOfOrderExecutor.map([0, 1, 2, 3, 4, 5], { run: (item) => item });
  assert.notDeepEqual(
    order.map((pair) => pair.index),
    [0, 1, 2, 3, 4, 5],
    'expected completion order to differ from input order',
  );
});

test('a different seed draws differently, so the equality above is not vacuous', async () => {
  const base = await runEnsembleAsync(study, outOfOrderExecutor);
  const other = await runEnsembleAsync({ ...study, seed: 99 }, outOfOrderExecutor);
  assert.notDeepEqual(other.outputs, base.outputs);
});

test('each draw is evaluated exactly once, on its own input', async () => {
  // Counting evaluations is not enough: an executor that ran draw 0 twenty-four
  // times would count 24. Compare the multiset of inputs the model actually saw
  // against the inputs that were drawn.
  const seen: number[] = [];
  const recording = defineModel<{ x: number }, { y: number }>({
    id: 'recording',
    version: '1.0.0',
    description: 'Records the inputs it sees',
    inputPorts: { x: { unit: '1' } },
    outputPorts: { y: { unit: '1' } },
    semanticValidation: 'off',
    run: (input) => { seen.push(input.x); return { y: input.x * 2 }; },
  });
  const result = await runEnsembleAsync({ ...study, model: recording }, outOfOrderExecutor);
  const drawnInputs = result.outputs.map((output) => output.y / 2);
  assert.equal(seen.length, study.draws);
  assert.deepEqual([...seen].sort(), [...drawnInputs].sort());
});

// =============================================================================
// A CHEATING EXECUTOR MUST BE REJECTED, NOT BELIEVED
// =============================================================================

const dropOneExecutor: TaskExecutor = {
  async map(items, task) {
    const done = await serialExecutor.map(items, task);
    return done.slice(0, -1);
  },
};

const duplicateExecutor: TaskExecutor = {
  async map(items, task) {
    const first = { index: 0, result: await task.run(items[0], 0) };
    return items.map(() => first);
  },
};

const outOfRangeExecutor: TaskExecutor = {
  async map(items, task) {
    const done = await serialExecutor.map(items, task);
    return done.map((pair, i) => (i === 0 ? { ...pair, index: items.length } : pair));
  },
};

test('an executor that drops, duplicates or invents a task is rejected', async () => {
  await assert.rejects(
    () => runEnsembleAsync(study, dropOneExecutor),
    /returned 23 results for 24 tasks/,
  );
  await assert.rejects(
    () => runEnsembleAsync(study, duplicateExecutor),
    /index 0 more than once/,
  );
  await assert.rejects(
    () => runEnsembleAsync(study, outOfRangeExecutor),
    /out-of-range index 24/,
  );
});

test('orderTaskResults scatters by index, not arrival', () => {
  const scattered = orderTaskResults(
    [{ index: 2, result: 'c' }, { index: 0, result: 'a' }, { index: 1, result: 'b' }],
    3,
    'test',
  );
  assert.deepEqual(scattered, ['a', 'b', 'c']);
});

// =============================================================================
// VALIDATION ORDER
// =============================================================================

test('every sample is validated before any model runs', async () => {
  // Drawing is now a complete phase before evaluation, so a bad sample at any
  // draw fails before the model is entered at all. Pinning it because it is a
  // deliberate change from the old interleaved order, where an earlier model
  // error would have won.
  let evaluations = 0;
  const counting = defineModel<{ x: number }, { y: number }>({
    id: 'counting',
    version: '1.0.0',
    description: 'Counts evaluations',
    inputPorts: { x: { unit: '1' } },
    outputPorts: { y: { unit: '1' } },
    semanticValidation: 'off',
    run: (input) => { evaluations++; return { y: input.x }; },
  });
  const experiment = {
    schemaVersion: 'tsimulation.experiment/v1',
    id: 'domain-check',
    version: '1.0.0',
    intent: 'aleatory-uncertainty',
    description: 'x is uniform on [0, 1]',
    variables: [
      {
        id: 'x',
        role: 'aleatory',
        // An aleatory variable needs an objective probability domain; an
        // `interval` is a possibility range carrying no density, which the
        // framework rejects for this role.
        domain: { kind: 'distribution', family: 'uniform', parameters: { lower: 0, upper: 1 } },
      },
    ],
  } as const;

  await assert.rejects(
    () => runEnsembleAsync({
      ...study,
      model: counting,
      draws: 8,
      experiment,
      sample: (random: () => number, draw: number) => {
        const x = draw === 5 ? 42 : random();
        return { input: { x }, parameters: { x } };
      },
    }),
    /draw 5/,
  );
  assert.equal(evaluations, 0, 'no model should run once a sample is invalid');
});

/**
 * The executor seam.
 *
 * `runEnsembleAsync` exists so a caller can spread model evaluations across
 * workers. That is only safe if the result does not depend on the executor, so
 * these tests drive the same study through executors that finish tasks in
 * deliberately wrong orders and demand the serial answer back.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runEnsemble,
  runEnsembleAsync,
  serialExecutor,
  type TaskExecutor,
} from '../src/index.js';
import { defineModel } from '../src/model.js';

/** A model whose output depends only on its input, so ordering is observable. */
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

/** Finishes every task, then returns them reversed if it may. */
const reversingExecutor: TaskExecutor = {
  async map(items, run) {
    const done = await Promise.all(items.map(async (item, index) => run(item, index)));
    return done.reverse().reverse();
  },
};

/** Resolves tasks in a scrambled order, to catch completion-order assembly. */
const scrambledExecutor: TaskExecutor = {
  async map(items, run) {
    const indices = items.map((_, index) => index);
    // Interleave so nothing finishes in input order.
    indices.sort((a, b) => (a % 5) - (b % 5) || b - a);
    const results = new Array(items.length);
    for (const index of indices) {
      results[index] = await Promise.resolve(run(items[index], index));
    }
    return results;
  },
};

test('an executor cannot change the answer', async () => {
  const serial = runEnsemble(study);
  for (const [name, executor] of [
    ['default (none given)', undefined],
    ['serialExecutor', serialExecutor],
    ['reversing', reversingExecutor],
    ['scrambled', scrambledExecutor],
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

test('draws are seeded on the calling thread, so order is fixed before any task runs', async () => {
  // The executor sees inputs already drawn; it never touches the RNG. Two runs
  // with the same seed must therefore agree whatever the executor does, and a
  // different seed must actually change the draw.
  const a = await runEnsembleAsync(study, scrambledExecutor);
  const b = await runEnsembleAsync(study, reversingExecutor);
  assert.deepEqual(a.outputs, b.outputs);

  const different = await runEnsembleAsync({ ...study, seed: 99 }, scrambledExecutor);
  assert.notDeepEqual(different.outputs, a.outputs, 'a different seed must draw differently');
});

test('every draw is evaluated exactly once', async () => {
  let evaluations = 0;
  const counted = defineModel<{ x: number }, { y: number }>({
    id: 'counted',
    version: '1.0.0',
    description: 'Counts evaluations',
    inputPorts: { x: { unit: '1' } },
    outputPorts: { y: { unit: '1' } },
    semanticValidation: 'off',
    run: (input) => { evaluations++; return { y: input.x }; },
  });
  await runEnsembleAsync({ ...study, model: counted }, scrambledExecutor);
  assert.equal(evaluations, study.draws);
});

test('serialExecutor preserves input order', async () => {
  const seen: number[] = [];
  const result = await serialExecutor.map([10, 20, 30], (item, index) => {
    seen.push(index);
    return item * 2;
  });
  assert.deepEqual(result, [20, 40, 60]);
  assert.deepEqual(seen, [0, 1, 2]);
});

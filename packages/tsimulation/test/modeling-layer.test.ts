import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ModelRegistry,
  calibrate,
  createRunManifest,
  defineModel,
  inferValidationGrade,
  manifestToJson,
  runFactorial,
  runModel,
  runScenarios,
  twoFactorInteraction,
  validateEvidence,
} from '../src/index.js';

const arithmetic = defineModel<{ a: number; b: number }, { y: number }>({
  id: 'arithmetic',
  version: '1.0.0',
  description: 'Small deterministic model used to exercise the public experiment API.',
  run: ({ a, b }) => ({ y: a + b + a * b }),
  inputPorts: { a: { unit: '1' }, b: { unit: '1' } },
  outputPorts: { y: { unit: '1' } },
  invariants: [{ id: 'finite-y', description: 'y is finite', check: (row) => Number.isFinite(row.y) }],
});

test('model runner enforces finite values, invariants, and registry uniqueness', () => {
  assert.equal(runModel(arithmetic, { a: 2, b: 3 }).output.y, 11);
  assert.throws(() => runModel(arithmetic, { a: Number.NaN, b: 1 }), /Non-finite/);
  assert.throws(() => defineModel<{ x: number }, { y: number }>({
    id: 'bad-unit', version: '1', description: 'bad', run: ({ x }) => ({ y: x }),
    inputPorts: { x: { unit: 'not-a-unit' } }, outputPorts: { y: { unit: '1' } },
  }), /unknown unit/);
  assert.throws(() => defineModel<{ x: number }, { y: number }>({
    id: 'bad-evidence', version: '1', description: 'bad', run: ({ x }) => ({ y: x }),
    inputPorts: { x: { unit: '1' } }, outputPorts: { y: { unit: '1' } },
    validationClaims: [{
      grade: 'scenario-only', label: 'Claim', basis: 'Basis', evidenceIds: ['missing'],
    }],
  }), /unknown evidence/);
  const registry = new ModelRegistry().register(arithmetic);
  assert.equal(registry.get('arithmetic'), arithmetic);
  assert.throws(() => registry.register(arithmetic), /already registered/);
});

test('calibration selects on development data before revealing holdout', () => {
  const result = calibrate({
    id: 'sealed-holdout',
    candidates: [{ x: 0 }, { x: 10 }],
    observations: [
      { id: 'train', role: 'development' as const, value: 0 },
      { id: 'test', role: 'holdout' as const, value: 10 },
    ],
    predict: (params) => params.x,
    loss: (prediction, observation) => Math.abs(prediction - observation.value),
  });
  assert.deepEqual(result.params, { x: 0 });
  assert.equal(result.scores.development.weightedMeanLoss, 0);
  assert.equal(result.scores.holdout.weightedMeanLoss, 10);
  assert.equal(result.candidateCount, 2);
});

test('factorial experiments expose a genuine difference-in-differences interaction', () => {
  const experiment = runFactorial({
    model: arithmetic,
    baseInput: { a: 0, b: 0 },
    factors: {
      a: [
        { id: 'off', apply: (input) => ({ ...input, a: 0 }) },
        { id: 'on', apply: (input) => ({ ...input, a: 1 }) },
      ],
      b: [
        { id: 'off', apply: (input) => ({ ...input, b: 0 }) },
        { id: 'on', apply: (input) => ({ ...input, b: 1 }) },
      ],
    },
  });
  assert.equal(experiment.cells.length, 4);
  const interaction = twoFactorInteraction({
    experiment,
    factorA: 'a', factorB: 'b',
    controlA: 'off', treatmentA: 'on',
    controlB: 'off', treatmentB: 'on',
    outcome: (output) => output.y,
  });
  assert.equal(interaction.interaction, 1);
  assert.throws(() => runScenarios(arithmetic, [
    { id: 'same', input: { a: 0, b: 0 } },
    { id: 'same', input: { a: 1, b: 1 } },
  ]), /Duplicate scenario/);
});

test('run manifests are stable, auditable, and carry evidence roles', () => {
  const evidence = [{
    id: 'observed-holdout',
    label: 'Observed holdout',
    kind: 'observed' as const,
    role: 'holdout' as const,
    source: { title: 'Source', url: 'https://example.com/data', accessedAt: '2026-07-22' },
  }];
  validateEvidence(evidence);
  assert.equal(inferValidationGrade(evidence), 'out-of-sample');
  const run = runModel(arithmetic, { a: 2, b: 3 }, { seed: 7, runLabel: 'central' });
  const first = createRunManifest({
    run, runId: 'test-run', createdAt: '2026-07-22T00:00:00.000Z',
    gitSha: 'abc', dirty: true, data: { fixture: [3, 2, 1] }, evidence,
  });
  const second = createRunManifest({
    run, runId: 'test-run', createdAt: '2026-07-22T00:00:00.000Z',
    gitSha: 'abc', dirty: true, data: { fixture: [3, 2, 1] }, evidence,
  });
  assert.equal(manifestToJson(first), manifestToJson(second));
  assert.equal(first.inputHash, second.inputHash);
  assert.equal(first.dataHashes.fixture, second.dataHashes.fixture);
});

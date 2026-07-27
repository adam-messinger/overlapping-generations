import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ModelRegistry,
  calibrate,
  completeModelSemanticContracts,
  createRunManifest,
  defineEstimand,
  defineModel,
  inferValidationGrade,
  manifestToJson,
  parseRunManifest,
  runFactorial,
  runModel,
  runScenarios,
  twoFactorInteraction,
  unitPort,
  validateEvidence,
  type QuantityPortMeta,
} from '../src/index.js';

const arithmetic = defineModel<{ a: number; b: number }, { y: number }>({
  id: 'arithmetic',
  version: '1.0.0',
  description: 'Small deterministic model used to exercise the public experiment API.',
  run: ({ a, b }) => ({ y: a + b + a * b }),
  inputPorts: { a: { unit: '1' }, b: { unit: '1' } },
  outputPorts: { y: { unit: '1' } },
  semanticValidation: 'off',
  invariants: [{ id: 'finite-y', description: 'y is finite', check: (row) => Number.isFinite(row.y) }],
});

test('model runner enforces finite values, invariants, and registry uniqueness', () => {
  assert.equal(runModel(arithmetic, { a: 2, b: 3 }).output.y, 11);
  assert.throws(() => runModel(arithmetic, { a: Number.NaN, b: 1 }), /Non-finite/);
  assert.throws(() => defineModel<{ x: number }, { y: number }>({
    id: 'bad-unit', version: '1', description: 'bad', run: ({ x }) => ({ y: x }),
    inputPorts: { x: { unit: 'not-a-unit' } }, outputPorts: { y: { unit: '1' } },
    semanticValidation: 'off',
  }), /unknown unit/);
  assert.throws(() => defineModel<{ x: number }, { y: number }>({
    id: 'bad-evidence', version: '1', description: 'bad', run: ({ x }) => ({ y: x }),
    inputPorts: { x: { unit: '1' } }, outputPorts: { y: { unit: '1' } },
    semanticValidation: 'off',
    validationClaims: [{
      grade: 'scenario-only', label: 'Claim', basis: 'Basis', evidenceIds: ['missing'],
    }],
  }), /unknown evidence/);
  const registry = new ModelRegistry().register(arithmetic);
  assert.equal(registry.get('arithmetic'), arithmetic);
  assert.throws(() => registry.register(arithmetic), /already registered/);
});

test('model semantics are mandatory unless an infrastructure test opts out', () => {
  assert.throws(
    () => defineModel<{ x: number }, { y: number }>({
      id: 'missing-semantics',
      version: '1',
      description: 'Must not silently accept unit-only quantitative ports.',
      inputPorts: { x: { unit: '1' } },
      outputPorts: { y: { unit: '1' } },
      run: ({ x }) => ({ y: x }),
    }),
    /missing estimand contract/,
  );
  const incomplete = defineEstimand({
    schemaVersion: 'tsimulation.estimand/v1',
    id: 'estimand.test.incomplete',
    version: '1',
    quantityKind: 'test.incomplete',
    measure: { kind: 'share' },
  });
  assert.throws(
    () => defineModel<{ x: number }, { y: number }>({
      id: 'incomplete-semantics',
      version: '1',
      description: 'A present but underspecified estimand is still invalid.',
      inputPorts: { x: { unit: 'fraction', estimand: incomplete } },
      outputPorts: { y: { unit: 'fraction', estimand: incomplete } },
      run: ({ x }) => ({ y: x }),
    }),
    /population boundary is required.*total-versus-incremental status is required/s,
  );
});

test('semantic completion distinguishes stocks, flows, shares, and per-capacity rates', () => {
  type Input = {
    firmCapacity: number;
    dailyGasFlow: number;
    coverage: number;
    annualValue: number;
    capexPerAddedCapacity: number;
  };
  const completed = completeModelSemanticContracts<Input, Input>({
    id: 'semantic-inference',
    version: '1',
    description: 'Adversarial semantic-inference fixture.',
    inputPorts: {
      firmCapacity: { unit: 'GW' },
      dailyGasFlow: { unit: 'Bcf/day' },
      coverage: { unit: 'fraction' },
      annualValue: { unit: '$B/year' },
      capexPerAddedCapacity: { unit: '$/(driveunit/year)' },
    },
    outputPorts: {
      firmCapacity: { unit: 'GW' },
      dailyGasFlow: { unit: 'Bcf/day' },
      coverage: { unit: 'fraction' },
      annualValue: { unit: '$B/year' },
      capexPerAddedCapacity: { unit: '$/(driveunit/year)' },
    },
    run: (input) => input,
  });
  const kind = (name: keyof Input) =>
    (completed.inputPorts[name] as QuantityPortMeta).estimand!.measure.kind;
  assert.equal(kind('firmCapacity'), 'stock');
  assert.equal(kind('dailyGasFlow'), 'flow');
  assert.equal(kind('coverage'), 'share');
  assert.equal(kind('annualValue'), 'flow');
  assert.equal(kind('capexPerAddedCapacity'), 'rate');
  assert.doesNotThrow(() => defineModel(completed));
});

test('semantic completion cannot leak generated meaning through reused port schemas', () => {
  const shared = unitPort('GW');
  const first = completeModelSemanticContracts({
    id: 'first-completion',
    version: '1.0.0',
    description: 'First completion boundary.',
    run: (input: { capacity: number }) => input,
    inputPorts: { capacity: shared },
    outputPorts: { capacity: shared },
  });
  const second = completeModelSemanticContracts({
    id: 'second-completion',
    version: '1.0.0',
    description: 'Second completion boundary.',
    run: (input: { capacity: number }) => input,
    inputPorts: { capacity: shared },
    outputPorts: { capacity: shared },
  });

  assert.equal(shared.estimand, undefined);
  assert.notEqual(
    (first.inputPorts as { capacity: typeof shared }).capacity.estimand?.id,
    (second.inputPorts as { capacity: typeof shared }).capacity.estimand?.id,
  );
  assert.equal(
    (first.inputPorts as { capacity: typeof shared }).capacity.estimand,
    (first.outputPorts as { capacity: typeof shared }).capacity.estimand,
  );
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

test('two-factor interactions cannot silently select the first level of a third factor', () => {
  const model = defineModel<{ a: number; b: number; c: number }, { y: number }>({
    id: 'three-factor',
    version: '1',
    description: 'Third-factor interaction diagnostic.',
    run: ({ a, b, c }) => ({ y: a * b * c }),
    inputPorts: {
      a: { unit: '1' },
      b: { unit: '1' },
      c: { unit: '1' },
    },
    outputPorts: { y: { unit: '1' } },
    semanticValidation: 'off',
  });
  const experiment = runFactorial({
    model,
    baseInput: { a: 0, b: 0, c: 1 },
    factors: {
      a: [
        { id: 'off', apply: (input) => ({ ...input, a: 0 }) },
        { id: 'on', apply: (input) => ({ ...input, a: 1 }) },
      ],
      b: [
        { id: 'off', apply: (input) => ({ ...input, b: 0 }) },
        { id: 'on', apply: (input) => ({ ...input, b: 1 }) },
      ],
      c: [
        { id: 'low', apply: (input) => ({ ...input, c: 1 }) },
        { id: 'high', apply: (input) => ({ ...input, c: 10 }) },
      ],
    },
  });
  const interactionOptions = {
    experiment,
    factorA: 'a',
    factorB: 'b',
    controlA: 'off',
    treatmentA: 'on',
    controlB: 'off',
    treatmentB: 'on',
    outcome: (output: { y: number }) => output.y,
  };
  assert.throws(
    () => twoFactorInteraction(interactionOptions),
    /ambiguous with additional factors/,
  );
  assert.equal(twoFactorInteraction({
    ...interactionOptions,
    conditionOn: { c: 'low' },
  }).interaction, 1);
  assert.equal(twoFactorInteraction({
    ...interactionOptions,
    conditionOn: { c: 'high' },
  }).interaction, 10);
  assert.equal(twoFactorInteraction({
    ...interactionOptions,
    marginalize: 'mean',
  }).interaction, 5.5);
  const unbalanced = {
    ...experiment,
    cells: experiment.cells.filter(
      (cell) =>
        !(
          cell.levels.a === 'on' &&
          cell.levels.b === 'on' &&
          cell.levels.c === 'high'
        ),
    ),
  };
  assert.throws(
    () => twoFactorInteraction({
      ...interactionOptions,
      experiment: unbalanced,
      marginalize: 'mean',
    }),
    /unbalanced extra-factor support/,
  );
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
  assert.equal(first.integrityHash, second.integrityHash);
  const tampered = structuredClone(first);
  tampered.output.y = 999;
  assert.throws(
    () => parseRunManifest(JSON.stringify(tampered)),
    /integrity failure for outputHash/,
  );
  const tamperedLineage = structuredClone(first);
  tamperedLineage.semanticLineage = {
    ...tamperedLineage.semanticLineage,
    derivations: [
      ...tamperedLineage.semanticLineage.derivations,
      { id: 'forged-derivation', version: '1' },
    ],
  };
  assert.throws(
    () => parseRunManifest(JSON.stringify(tamperedLineage)),
    /integrity failure for integrityHash/,
  );
});

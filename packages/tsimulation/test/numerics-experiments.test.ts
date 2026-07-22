import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  auditParameterEffects,
  defineModel,
  findThreshold,
  latinHypercube,
  quantile,
  runEnsemble,
  seededRandom,
  solveFixedPoint,
  solveLinearSystem,
  validateAndSortGraph,
} from '../src/index.js';

test('linear solver reports an accurate residual and rejects singular systems', () => {
  const solved = solveLinearSystem([[2, 1], [1, 3]], [5, 6]);
  assert.ok(Math.abs(solved.solution[0] - 1.8) < 1e-12);
  assert.ok(Math.abs(solved.solution[1] - 1.4) < 1e-12);
  assert.ok(solved.residualInfinityNorm < 1e-12);
  assert.throws(() => solveLinearSystem([[1, 2], [2, 4]], [1, 2]), /Singular/);
});

test('fixed-point solver has explicit converged, exhausted, and non-finite states', () => {
  const converged = solveFixedPoint([0], ([x]) => [(x + 2) / 2], { tolerance: 1e-10 });
  assert.equal(converged.converged, true);
  assert.equal(converged.termination, 'converged');
  assert.ok(Math.abs(converged.value[0] - 2) < 1e-9);
  const exhausted = solveFixedPoint([0], ([x]) => [x + 1], { maxIterations: 3 });
  assert.equal(exhausted.iterations, 3);
  assert.equal(exhausted.termination, 'max-iterations');
  const nonFinite = solveFixedPoint([1], () => [Number.NaN]);
  assert.equal(nonFinite.termination, 'non-finite');
});

test('graph validation catches typoed dependencies and cycles before simulation', () => {
  const nodes = [
    { id: 'ore', deps: [] as string[] },
    { id: 'metal', deps: ['ore'] },
    { id: 'product', deps: ['metal'] },
  ];
  assert.deepEqual(validateAndSortGraph(nodes, (row) => row.id, (row) => row.deps).ids, ['ore', 'metal', 'product']);
  assert.throws(
    () => validateAndSortGraph([{ id: 'x', deps: ['typo'] }], (row) => row.id, (row) => row.deps),
    /unknown dependency/,
  );
  assert.throws(
    () => validateAndSortGraph([
      { id: 'a', deps: ['b'] }, { id: 'b', deps: ['a'] },
    ], (row) => row.id, (row) => row.deps),
    /cycle/,
  );
});

test('thresholds, parameter audits, and seeded ensembles are reproducible', () => {
  const threshold = findThreshold({ lower: 0, upper: 10, target: 25, evaluate: (x) => x * x });
  assert.equal(threshold.found, true);
  assert.ok(Math.abs(threshold.estimate! - 5) < 1e-5);
  const model = defineModel<{ x: number; inert?: number }, { y: number }>({
    id: 'ensemble-test', version: '1', description: 'test', run: ({ x }) => ({ y: x * x }),
  });
  const audit = auditParameterEffects({
    model, baseline: { x: 2 },
    variants: [{ id: 'active', input: { x: 3 } }, { id: 'inert', input: { x: 2, inert: 4 } }],
    metrics: { y: (output) => output.y },
  });
  assert.equal(audit[0].inert, false);
  assert.equal(audit[1].inert, true);
  const make = () => runEnsemble({
    model, draws: 20, seed: 42,
    sample: (random) => {
      const x = random();
      return { input: { x }, parameters: { x } };
    },
    metrics: { y: (output) => output.y },
  });
  assert.deepEqual(make(), make());
  assert.equal(quantile([0, 10], 0.5), 5);
  assert.deepEqual(latinHypercube(5, ['a', 'b'], seededRandom(9)), latinHypercube(5, ['a', 'b'], seededRandom(9)));
});

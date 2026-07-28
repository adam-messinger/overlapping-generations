import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDiscreteStability2D,
  finiteDifferenceJacobian,
} from '../src/index.js';

test('finite-difference Jacobian recovers a coupled linear map', () => {
  const jacobian = finiteDifferenceJacobian(
    ([x, y]) => [0.8 * x + 0.1 * y, -0.2 * x + 0.5 * y],
    [2, 3],
  );
  assert.ok(Math.abs(jacobian[0][0] - 0.8) < 1e-9);
  assert.ok(Math.abs(jacobian[0][1] - 0.1) < 1e-9);
  assert.ok(Math.abs(jacobian[1][0] + 0.2) < 1e-9);
  assert.ok(Math.abs(jacobian[1][1] - 0.5) < 1e-9);
});

test('finite-difference Jacobian uses a forward difference at a lower bound', () => {
  const jacobian = finiteDifferenceJacobian(
    ([x, y]) => [2 * x + y, x + 3 * y],
    [0, 2],
    { lowerBounds: [0, 0] },
  );
  assert.ok(Math.abs(jacobian[0][0] - 2) < 1e-9);
  assert.ok(Math.abs(jacobian[1][0] - 1) < 1e-9);
  assert.ok(Math.abs(jacobian[0][1] - 1) < 1e-9);
  assert.ok(Math.abs(jacobian[1][1] - 3) < 1e-9);
});

test('2D stability analysis classifies stable, marginal, and unstable maps', () => {
  assert.equal(analyzeDiscreteStability2D([[0.8, 0], [0, 0.5]]).classification, 'stable');
  assert.equal(analyzeDiscreteStability2D([[1, 0], [0, 0.5]]).classification, 'marginal');
  assert.equal(analyzeDiscreteStability2D([[1.1, 0], [0, 0.5]]).classification, 'unstable');
});

test('2D stability analysis handles complex eigenvalues', () => {
  const analysis = analyzeDiscreteStability2D([[0, -0.5], [0.5, 0]]);
  assert.equal(analysis.classification, 'stable');
  assert.equal(analysis.eigenvalues[0].real, 0);
  assert.ok(Math.abs(analysis.eigenvalues[0].imaginary - 0.5) < 1e-12);
  assert.ok(Math.abs(analysis.spectralRadius - 0.5) < 1e-12);
});

/**
 * Read-Tracking Parity
 *
 * This model passes typed arrays as module parameters, which the read tracker
 * used to proxy — enabling the diagnostic turned a working run into a
 * TypeError. Enabling it must leave results identical.
 */

import { expect, printSummary, test } from '../../src/test-utils.js';
import { runAgingSim } from './simulation.js';

console.log('\n=== Read-Tracking Parity ===\n');

test('enabling parameter liveness does not change the model path', () => {
  const config = { epoch: '2023' as const, years: 4 };

  const off = runAgingSim({ ...config, paramLiveness: 'off' });
  const warn = runAgingSim({ ...config, paramLiveness: 'warn' });

  // The whole result as canonical JSON, so every number has to agree rather
  // than a summary statistic that could hide a divergence.
  expect(JSON.stringify(warn)).toBe(JSON.stringify(off));
});

test('typed-array parameters survive liveness checking', () => {
  // Before the leaf rule was inverted this threw:
  // "Method get TypedArray.prototype.length called on incompatible receiver".
  const result = runAgingSim({ epoch: '2023', years: 3, paramLiveness: 'warn' });
  expect(result.years.length > 0).toBeTrue();
});

printSummary();

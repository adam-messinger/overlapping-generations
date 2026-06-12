/**
 * Distribution Primitive Tests
 */

import { GDP_SHARES, distributeByGDP } from './distribute.js';
import { REGIONS } from '../domain-types.js';
import { test, expect, printSummary } from '../test-utils.js';

console.log('\n=== Distribution Primitive Tests ===\n');

test('GDP_SHARES sum to exactly 1', () => {
  const sum = REGIONS.reduce((s, r) => s + GDP_SHARES[r], 0);
  expect(Math.abs(sum - 1)).toBeLessThan(1e-12);
});

test('distributeByGDP conserves the total', () => {
  const parts = distributeByGDP(100);
  const sum = REGIONS.reduce((s, r) => s + parts[r], 0);
  expect(Math.abs(sum - 100)).toBeLessThan(1e-9);
});

test('distributeByGDP of zero is zero everywhere', () => {
  const parts = distributeByGDP(0);
  for (const r of REGIONS) {
    expect(parts[r]).toBe(0);
  }
});

printSummary();

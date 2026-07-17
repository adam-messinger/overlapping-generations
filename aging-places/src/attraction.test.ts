import { expect, printSummary, test } from '../../src/test-utils.js';
import { universityThroughputRetention } from './modules/attraction.js';

console.log('\n=== Aging Places Attraction Scenario Tests ===\n');

test('full retention preserves the static university-throughput contribution', () => {
  expect(universityThroughputRetention(1, 0, 39)).toBe(1);
});

test('throughput contraction compounds until it reaches its floor', () => {
  expect(universityThroughputRetention(0.98, 0.6, 10)).toBeCloseTo(0.98 ** 10, 10);
  expect(universityThroughputRetention(0.98, 0.6, 40)).toBe(0.6);
});

test('the first scenario year retains the full origin-year contribution', () => {
  expect(universityThroughputRetention(0.8, 0.1, 0)).toBe(1);
});

printSummary();

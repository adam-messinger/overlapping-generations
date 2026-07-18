import { expect, printSummary, test } from '../../src/test-utils.js';
import { concentrationShift, universityThroughputRetention } from './modules/attraction.js';

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

test('concentration dial is off at zero sensitivity regardless of growth', () => {
  expect(concentrationShift(0, -0.02, 0.005, -0.005)).toBe(0);
});

test('concentration dial stays off while working-age growth is healthy', () => {
  expect(concentrationShift(1, 0.01, 0.005, -0.005)).toBe(0);
  expect(concentrationShift(1, 0.005, 0.005, -0.005)).toBe(0);
});

test('concentration dial ramps linearly and saturates at deep decline', () => {
  expect(concentrationShift(1, 0, 0.005, -0.005)).toBeCloseTo(0.5, 10);
  expect(concentrationShift(1, -0.005, 0.005, -0.005)).toBe(1);
  expect(concentrationShift(1, -0.02, 0.005, -0.005)).toBe(1);
  expect(concentrationShift(0.5, -0.02, 0.005, -0.005)).toBe(0.5);
});

test('a degenerate growth band disables the dial instead of dividing by zero', () => {
  expect(concentrationShift(1, 0, 0.005, 0.005)).toBe(0);
});

printSummary();

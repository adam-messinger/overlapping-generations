import { expect, printSummary, test } from '../../../src/test-utils.js';
import {
  bootstrapDifference,
  conditionalWorkingAllocation,
  evaluateLocal,
  marketFold,
  percentileStandardize,
} from './validation.js';

console.log('\n=== Japan Validation Tests ===\n');

test('local metrics exclude basins below the frozen five-unit minimum', () => {
  const rows = [
    ...Array.from({ length: 5 }, (_, i) => ({ market: 'A', score: i, outcome: i })),
    ...Array.from({ length: 4 }, (_, i) => ({ market: 'B', score: i, outcome: 3 - i })),
  ];
  const result = evaluateLocal(rows);
  expect(result.metrics.n).toBe(5);
  expect(result.metrics.markets).toBe(1);
  expect(result.metrics.meanWithinMarketSpearman).toBeCloseTo(1, 8);
});

test('percentile standardization is centered and preserves ties', () => {
  const result = percentileStandardize([10, 20, 20, 40]);
  expect(result.reduce((sum, value) => sum + value, 0)).toBeCloseTo(0, 8);
  expect(result[1]).toBe(result[2]);
  expect(result[0]).toBeLessThan(result[3]);
});

test('conditional allocation conserves the observed national endpoint total', () => {
  const result = conditionalWorkingAllocation([
    { originWorking: 100, demographicEndpoint: 90, observedEndpoint: 95, attraction: -1, annualMoverRate: 0.02 },
    { originWorking: 200, demographicEndpoint: 190, observedEndpoint: 205, attraction: 1, annualMoverRate: 0.02 },
  ]);
  expect(result.predictedEndpointTotal).toBeCloseTo(300, 8);
  expect(result.predictedEndpoint[1]).toBeGreaterThan(190 * (300 / 280));
});

test('bootstrap difference compares only common markets', () => {
  const result = bootstrapDifference(
    new Map([['A', 0.5], ['B', 0.2]]),
    new Map([['A', 0.1], ['C', 0.4]]),
    100,
  );
  expect(result.markets).toBe(1);
  expect(result.meanDifference).toBeCloseTo(0.4, 8);
  expect(result.ci95).toEqual([0.4, 0.4]);
});

test('fold assignment is deterministic and year-specific', () => {
  expect(marketFold(2010, 'JP2010-01100')).toBe(marketFold(2010, 'JP2010-01100'));
  expect(marketFold(2010, 'JP2010-01100') === marketFold(2015, 'JP2010-01100')).toBeFalse();
});

printSummary();

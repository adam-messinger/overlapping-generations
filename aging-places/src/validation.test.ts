import { expect, printSummary, test } from '../../src/test-utils.js';
import { loadFeatureRows, stateFold } from '../scripts/backtest.js';
import { columnStats, standardize } from './scoring.js';

console.log('\n=== Aging Places Validation Tests ===\n');

test('a state is assigned wholly to one frozen spatial fold', () => {
  const rows = loadFeatureRows('features2000.csv').filter(
    (row) => row.raw.logGrowth00_25 !== null && row.pop >= 1000
  );
  const seen = new Map<string, number>();
  for (const row of rows) {
    const fold = stateFold(row.state);
    if (seen.has(row.state)) expect(fold).toBe(seen.get(row.state)!);
    seen.set(row.state, fold);
  }
  expect(seen.size).toBeGreaterThan(40);
  const counts = new Array(5).fill(0);
  for (const row of rows) counts[stateFold(row.state)]++;
  for (const count of counts) expect(count).toBeGreaterThan(500);
});

test('standardization uses supplied training statistics', () => {
  const train = [[1], [2], [3]];
  const test = [[100]];
  const stats = columnStats(train);
  const standardized = standardize(test, stats.means, stats.sds);
  expect(standardized[0][0]).toBeCloseTo(98, 8);
});

printSummary();

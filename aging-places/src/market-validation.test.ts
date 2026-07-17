import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, printSummary, test } from '../../src/test-utils.js';
import { loadFeatureRows } from '../scripts/backtest.js';
import { choosePrimaryCounty } from '../scripts/build-markets.js';
import { DATA_DIR } from '../scripts/lib.js';
import {
  centerWithinMarkets, loadPlaceMarkets, marketFold,
} from '../scripts/market-backtest.js';

console.log('\n=== Functional-Market Validation Tests ===\n');

test('every 2000 commuting zone is assigned wholly to one fold', () => {
  const rows = loadFeatureRows('features2000.csv').filter(
    (row) => row.raw.logGrowth00_25 !== null && row.pop >= 1000
  );
  const crosswalk = loadPlaceMarkets();
  const seen = new Map<string, number>();
  const foldRows = new Array(5).fill(0);
  let assigned = 0;
  for (const row of rows) {
    const market = crosswalk.get(row.geoid)?.cz2000;
    if (!market) continue;
    const fold = marketFold(market, 'cz2000');
    if (seen.has(market)) expect(fold).toBe(seen.get(market)!);
    seen.set(market, fold);
    foldRows[fold]++;
    assigned++;
  }
  expect(assigned).toBeGreaterThan(5800);
  expect(seen.size).toBeGreaterThan(300);
  for (const count of foldRows) expect(count).toBeGreaterThan(500);
});

test('largest Census-2000 place part resolves a cross-market place', () => {
  const markets = new Map([
    ['01001', { cz: '1' }],
    ['01003', { cz: '2' }],
  ]);
  const selected = choosePrimaryCounty(['01001', '01003'], [
    { geoid: '0109999', countyFips: '01001', pop2000: 100, pop1990: 90 },
    { geoid: '0109999', countyFips: '01003', pop2000: 900, pop1990: 800 },
  ], markets);
  expect(selected.primaryCountyFips).toBe('01003');
  expect(selected.assignmentMethod).toBe('largest_2000_place_part');
  expect(selected.crossMarket2000).toBeTrue();
});

test('within-market centering has a zero sum in every market', () => {
  const values = [1, 3, 10, 16, 22];
  const markets = ['a', 'a', 'b', 'b', 'b'];
  const centered = centerWithinMarkets(values, markets, [0, 1, 2, 3, 4]);
  expect(centered.get(0)).toBeCloseTo(-1, 10);
  expect(centered.get(1)).toBeCloseTo(1, 10);
  expect((centered.get(2) ?? 0) + (centered.get(3) ?? 0) + (centered.get(4) ?? 0))
    .toBeCloseTo(0, 10);
});

test('committed market-validation folds partition rows and markets exactly once', () => {
  const file = path.join(DATA_DIR, 'market-validation.json');
  expect(fs.existsSync(file)).toBeTrue();
  const result = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, any>;
  for (const geography of ['cz2000', 'cz2020']) {
    const section = result[geography];
    const testRows = section.folds.reduce(
      (sum: number, fold: Record<string, number>) => sum + fold.testN, 0
    );
    const testMarkets = section.folds.reduce(
      (sum: number, fold: Record<string, number>) => sum + fold.testMarkets, 0
    );
    expect(testRows).toBe(section.universe.eligibleRows);
    expect(testMarkets).toBe(section.universe.eligibleMarkets);
    for (const fold of section.folds) {
      expect(fold.trainN + fold.testN).toBe(section.universe.eligibleRows);
      expect(fold.trainMarkets + fold.testMarkets).toBe(section.universe.eligibleMarkets);
    }
  }
});

printSummary();

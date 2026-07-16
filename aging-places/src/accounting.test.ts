import { expect, printSummary, test } from '../../src/test-utils.js';
import { COHORTS, Cohort } from './domain-types.js';
import { loadEpoch } from './data.js';
import { allocateInternal, allocateInternational } from './modules/migration.js';
import { impliedHouseholds } from './modules/market.js';
import { runAgingSim } from './simulation.js';

const sum = (values: ArrayLike<number>): number => {
  let total = 0;
  for (let i = 0; i < values.length; i++) total += values[i];
  return total;
};

console.log('\n=== Aging Places Accounting Tests ===\n');

test('internal migration is zero-sum and no origin loses more than its stock', () => {
  const stock = Float64Array.from([100, 10, 0, 50]);
  const units = Float64Array.from([20, 500, 30, 40]);
  const attraction = Float64Array.from([-1, 2, 0.5, 0]);
  const allocation = allocateInternal(0.09, units, attraction, 0.3, stock);
  expect(sum(allocation.net)).toBeCloseTo(0, 10);
  expect(sum(allocation.arrivals)).toBeCloseTo(allocation.pool, 10);
  expect(sum(allocation.departures)).toBeCloseTo(allocation.pool, 10);
  for (let i = 0; i < stock.length; i++) {
    expect(allocation.departures[i] <= stock[i]).toBeTrue();
  }
  // A destination can be housing-rich, but a zero-resident origin has no departures.
  expect(allocation.departures[2]).toBe(0);
});

test('international migration is an open flow whose allocations sum to the target', () => {
  const stock = Float64Array.from([100, 200, 50]);
  const attraction = Float64Array.from([0, 1, -1]);
  const inflow = allocateInternational(1234, stock, attraction, 0.5, stock);
  expect(sum(inflow)).toBeCloseTo(1234, 8);
  const outflow = allocateInternational(-70, stock, attraction, 0.5, stock);
  expect(sum(outflow)).toBeCloseTo(-70, 8);
  for (let i = 0; i < stock.length; i++) expect(-outflow[i] <= stock[i]).toBeTrue();
});

test('start-year modeled headship reproduces observed occupied units', () => {
  const { statics } = loadEpoch('features2023.csv', 250);
  const headship: Record<Cohort, number> = {
    a0_19: 0, a20_24: 0.38, a25_44: 0.50, a45_64: 0.56, a65up: 0.63,
  };
  let checked = 0;
  for (let i = 0; i < statics.n; i++) {
    if (statics.occupiedUnits0[i] <= 0) continue;
    const cohorts = {} as Record<Cohort, number>;
    for (const cohort of COHORTS) cohorts[cohort] = statics.cohorts0[cohort][i];
    expect(impliedHouseholds(cohorts, headship, statics.headshipScale[i]))
      .toBeCloseTo(statics.occupiedUnits0[i], 7);
    checked++;
  }
  expect(checked).toBeGreaterThan(10000);
});

test('zero reported housing stock gets a finite fallback but is ineligible', () => {
  const { statics } = loadEpoch('features2023.csv', 250);
  let found = false;
  for (let i = 0; i < statics.n; i++) {
    if (statics.observedUnits0[i] !== 0) continue;
    found = true;
    expect(statics.units0[i]).toBeGreaterThan(0);
    expect(statics.housingMarketEligible[i]).toBe(0);
  }
  expect(found).toBeTrue();
});

test('international migration changes municipal population and internal residual stays zero', () => {
  const noImmigration = runAgingSim({
    epoch: '2023', years: 5, minPop: 1000,
    params: { nation: { netImmigrationStart: 0, netImmigrationLongRun: 0 } },
  });
  const highImmigration = runAgingSim({
    epoch: '2023', years: 5, minPop: 1000,
    params: { nation: { netImmigrationStart: 2.2e6, netImmigrationLongRun: 2.2e6 } },
  });
  expect(sum(highImmigration.finalPop) - sum(noImmigration.finalPop)).toBeGreaterThan(5e6);
  const maxResidual = Math.max(...highImmigration.national.internalMigrationResidual.map(Math.abs));
  expect(maxResidual).toBeLessThan(1e-5);
  expect(sum(highImmigration.national.localNetImmigration)).toBeGreaterThan(5e6);
});

printSummary();

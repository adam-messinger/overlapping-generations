/**
 * Integration test for the autowired energy simulation.
 *
 * Lives with the domain (not in the tsimulation framework package) because it
 * exercises the full module set. Verifies that the energy-system overhead —
 * energy spent building and running the energy system itself — is positive once
 * the simulation is past its first step.
 */

import { test, expect, printSummary } from './test-utils.js';
import { allocateRegionalInvestment, runAutowiredFull } from './simulation-autowired.js';
import { REGIONS, type Region } from './domain-types.js';

test('energySystemOverhead > 0 after year 1 in full simulation', () => {
  const { results } = runAutowiredFull({ startYear: 2025, endYear: 2030 });

  // Year 0 may be 0 (no prior additions), but subsequent years should have overhead
  const lastYear = results[results.length - 1];
  expect(lastYear.energySystemOverhead).toBeGreaterThan(0);
});

test('regional investment allocation gives a negative-propensity region nothing, not negative', () => {
  // debt-populism's US: an ageing working share plus a -0.15 savingsPremium
  // takes its desired saving propensity below zero by 2080
  const savings = Object.fromEntries(REGIONS.map(r => [r, 0.2])) as Record<Region, number>;
  savings.us = -0.06;
  const gdp = Object.fromEntries(REGIONS.map(r => [r, 10])) as Record<Region, number>;
  const allocation = allocateRegionalInvestment(30, savings, gdp);

  expect(allocation.us).toBe(0);
  let total = 0;
  for (const r of REGIONS) {
    expect(allocation[r] >= 0).toBeTrue();
    total += allocation[r];
  }
  // The other regions split the world total; none receives more than it
  expect(total).toBeCloseTo(30, 9);
  expect(allocation.china).toBeCloseTo(30 / (REGIONS.length - 1), 9);
});

printSummary();

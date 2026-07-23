import assert from 'node:assert/strict';
import test from 'node:test';

import { calibrateMaritimeNetwork } from './shipping-calibration.js';
import { maritimeScenarios } from './shipping-data.js';
import { simulateMaritimeNetwork } from './shipping-network.js';

test('serial chokepoints do not count Hormuz-overlapping barrels twice', () => {
  const scenario = {
    ...maritimeScenarios['dual-chokepoint-closure'],
    hormuzThroughputPath: [0],
    babThroughputPath: [0],
    suezThroughputPath: [1],
  };
  const noOverlap = simulateMaritimeNetwork(scenario, {
    babHormuzOverlapShare: 0,
    capeExtraDays: 0,
  }).monthly[0];
  const overlap = simulateMaritimeNetwork(scenario, {
    babHormuzOverlapShare: 0.35,
    capeExtraDays: 0,
  }).monthly[0];
  assert.ok(overlap.oilAvailableToRedSeaMbd < noOverlap.oilAvailableToRedSeaMbd);
  assert.ok(Math.abs(overlap.oilAvailableToRedSeaMbd / noOverlap.oilAvailableToRedSeaMbd - 0.65) < 1e-9);
});

test('Cape transit queue conserves rerouted departures across adjacent months', () => {
  const scenario = {
    ...maritimeScenarios['dual-chokepoint-closure'],
    hormuzThroughputPath: [1, 1, 1],
    babThroughputPath: [0, 0, 0],
    suezThroughputPath: [1, 1, 1],
  };
  const result = simulateMaritimeNetwork(scenario, {
    capeExtraDays: 15,
    daysPerMonth: 30,
    oilCapeRerouteShare: 1,
  });
  assert.ok(result.monthly[0].capeOilArrivalsMbd < result.monthly[0].capeOilDeparturesMbd);
  assert.ok(Math.abs(
    result.monthly[1].capeOilArrivalsMbd - result.monthly[0].capeOilDeparturesMbd,
  ) < 1e-9);
});

test('2024 oil fit carries into the frozen 1H25 Cape-flow holdout', () => {
  const calibration = calibrateMaritimeNetwork();
  assert.ok(Math.abs(calibration.developmentCapeOilMbd - 9.3) <= 0.05);
  assert.ok(calibration.holdoutAbsoluteErrorMbd <= 0.25);
  assert.ok(calibration.params.oilCapeRerouteShare > 0.5);
  assert.ok(calibration.params.oilCapeRerouteShare < 0.7);
});

test('July 23 nowcast reproduces the observed loading drop without reapplying Hormuz', () => {
  const result = simulateMaritimeNetwork(
    maritimeScenarios['july-23-tanker-attacks'],
  );
  assert.ok(Math.abs(result.monthly[0].oilAvailableToRedSeaMbd - 7.4) < 1e-9);
  assert.ok(Math.abs(result.monthly[0].directOilMbd - 6.1) < 1e-9);
  assert.equal(result.monthly[0].hormuzThroughput, 1);
  assert.ok(
    result.monthly[1].intendedMarketOilAvailability <
      result.monthly[0].intendedMarketOilAvailability,
  );
});

test('full Red Sea avoidance produces finite delay, capacity, and inflation paths', () => {
  const result = simulateMaritimeNetwork(
    maritimeScenarios['dual-chokepoint-closure'],
  );
  assert.ok(result.monthly.some((row) => row.containerEffectiveCapacityLoss > 0.08));
  assert.ok(result.monthly.some((row) => row.importInflationImpulsePctPoints > 1));
  for (const row of result.monthly) {
    assert.ok(row.containerEffectiveCapacityLoss >= 0);
    assert.ok(row.containerEffectiveCapacityLoss <= 0.25);
    assert.ok(Number.isFinite(row.intendedMarketOilAvailability));
  }
});

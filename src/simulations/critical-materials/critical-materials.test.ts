import { expect, printSummary, test } from '../../test-utils.js';
import { calibrateRareEarthEvent } from './calibration.js';
import {
  criticalMaterialNetwork,
  rareEarth2025Event,
  weberBenchmark,
} from './data.js';
import { simulateDynamicNetwork } from './dynamic-network.js';
import {
  evaluateWeberPeriod,
  fitWeberModels,
  simulatePriceShock,
} from './price-network.js';

test('a price shock propagates beyond direct final demand', () => {
  const shock = simulatePriceShock(criticalMaterialNetwork, 'rare-earths', 1);
  expect(shock.nodePriceChanges.magnets).toBeGreaterThan(0);
  expect(shock.nodePriceChanges.evs).toBeGreaterThan(0);
  expect(shock.finalBasketPriceChange).toBeGreaterThan(0);
});

test('network exposure beats direct exposure on both Weber holdout periods', () => {
  const fit = fitWeberModels(weberBenchmark);
  for (const period of ['covid', 'ukraine'] as const) {
    const v1 = evaluateWeberPeriod(weberBenchmark, period, 'v1', fit);
    const v2 = evaluateWeberPeriod(weberBenchmark, period, 'v2', fit);
    expect(v2.maePctPoints).toBeLessThan(v1.maePctPoints);
    expect(v2.rankCorrelation).toBeGreaterThan(v1.rankCorrelation);
  }
});

test('inventories delay the observed rare-earth quantity bottleneck', () => {
  const v1 = calibrateRareEarthEvent('v1');
  const v2 = calibrateRareEarthEvent('v2');
  expect(v1.result.firstCurtailmentMonth ?? -1).toBeLessThan(
    v2.result.firstCurtailmentMonth ?? -1,
  );
  expect(v2.result.firstCurtailmentMonth).toBe(
    rareEarth2025Event.fitTargets.firstAutoCurtailmentMonth,
  );
});

test('a larger stockpile reduces a sustained rare-earth shock loss', () => {
  const common = {
    months: 12,
    supplyPaths: { 'rare-earths': [1, ...Array(11).fill(0.2)] },
    revision: 'v2' as const,
    priceElasticity: 2.75,
    pricePassThrough: 0.85,
  };
  const base = simulateDynamicNetwork(criticalMaterialNetwork, {
    ...common,
    inventoryMultiplier: 1,
  });
  const buffered = simulateDynamicNetwork(criticalMaterialNetwork, {
    ...common,
    inventoryMultiplier: 3,
  });
  expect(buffered.cumulativeWeightedOutputLoss).toBeLessThan(
    base.cumulativeWeightedOutputLoss,
  );
});

test('price network rejects typoed suppliers instead of silently dropping them', () => {
  expect(() => simulatePriceShock([
    { id: 'ore', label: 'Ore', kind: 'material', inputs: [], inventoryMonths: 0, finalDemandWeight: 0 },
    {
      id: 'product', label: 'Product', kind: 'final', inventoryMonths: 0, finalDemandWeight: 1,
      inputs: [{ from: 'orre', costShare: 0.2, critical: true }],
    },
  ], 'ore', 1)).toThrow("references unknown input 'orre'");
});

test('single-node price network has a well-defined result', () => {
  const result = simulatePriceShock([
    { id: 'ore', label: 'Ore', kind: 'material', inputs: [], inventoryMonths: 0, finalDemandWeight: 1 },
  ], 'ore', 0.5);
  expect(result.finalBasketPriceChange).toBe(0.5);
});

test('empty dynamic supply paths are rejected rather than treated as normal supply', () => {
  expect(() => simulateDynamicNetwork(criticalMaterialNetwork, {
    months: 2,
    supplyPaths: { 'rare-earths': [] },
    revision: 'v2',
    priceElasticity: 2,
    pricePassThrough: 0.8,
  })).toThrow("Supply path 'rare-earths' must not be empty");
});

printSummary();

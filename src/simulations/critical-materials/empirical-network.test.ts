import { expect, printSummary, test } from '../../test-utils.js';
import {
  calibrateDisruptionModel,
  simulateHistoricalDisruption,
} from './event-backtest.js';
import {
  empiricalMaterialById,
  federalReserveEventWindows,
  historicalDisruptionEvents,
} from './empirical-data.js';
import {
  buildEmpiricalMaterialOverlay,
  simulateEmpiricalNMinusOne,
} from './empirical-network.js';

test('USGS concentration and inventory arithmetic is internally consistent', () => {
  expect(empiricalMaterialById.cobalt.dominantProducerShare).toBeCloseTo(230 / 310, 12);
  expect(empiricalMaterialById.cobalt.observedInventoryMonths ?? -1).toBeCloseTo(1.875, 12);
  expect(empiricalMaterialById.copper.observedInventoryMonths ?? -1).toBeCloseTo(450 / 2_200 * 12, 12);
  expect(empiricalMaterialById.gallium.dominantProducerShare).toBeBetween(0.98, 1);
});

test('empirical overlay maps every network material and flags recipe-only manganese', () => {
  const audit = buildEmpiricalMaterialOverlay();
  expect(audit.errors).toHaveLength(0);
  expect(audit.unmatchedNetworkMaterials).toHaveLength(0);
  expect(audit.unmatchedRecipeMaterials).toEqual(['manganese']);
});

test('frozen Federal Reserve event windows fall inside declared target envelopes', () => {
  const tohoku = federalReserveEventWindows.tohokuMotorVehicles;
  const baseline = tohoku.baselineJanToMar2011.reduce((a, b) => a + b, 0) / 3;
  const tohokuLoss = 1 - Math.min(...tohoku.aprilToJuly2011) / baseline;
  expect(tohokuLoss).toBeBetween(0.04, 0.1);

  const chips = federalReserveEventWindows.chipShortageMotorVehicles;
  const chipLoss = 1 - Math.min(...chips.february2021ToMarch2022) / chips.january2021;
  expect(chipLoss).toBeBetween(0.15, 0.3);

  const gallium = federalReserveEventWindows.galliumSemiconductorComponents;
  const galliumLoss = 1 - Math.min(...gallium.augustToDecember2023) / gallium.july2023;
  expect(galliumLoss).toBeBetween(0, 0.03);
});

test('physical revision beats cost-share model on frozen event holdouts', () => {
  const v1 = calibrateDisruptionModel('cost-share-v1');
  const v3 = calibrateDisruptionModel('physical-v3');
  expect(v3.holdout.meanScore).toBeLessThan(v1.holdout.meanScore);
  expect(v3.parameters.accessibleInventoryFraction).toBe(0.4);
});

test('physical revision separates buffered gallium from rare-earth curtailment', () => {
  const fitted = calibrateDisruptionModel('physical-v3');
  const gallium = historicalDisruptionEvents.find((row) => row.id === 'gallium-licensing-2023');
  const rareEarth = historicalDisruptionEvents.find((row) => row.id === 'rare-earth-controls-2025');
  if (!gallium || !rareEarth) throw new Error('Missing frozen holdout events');
  const galliumResult = simulateHistoricalDisruption(gallium, 'physical-v3', fitted.parameters);
  const rareEarthResult = simulateHistoricalDisruption(rareEarth, 'physical-v3', fitted.parameters);
  expect(galliumResult.firstCurtailmentMonth).toBe(null);
  expect(rareEarthResult.firstCurtailmentMonth).toBeBetween(1, 2);
});

test('empirical dominant-producer stress ranks gallium above lithium', () => {
  const gallium = simulateEmpiricalNMinusOne('gallium');
  const lithium = simulateEmpiricalNMinusOne('lithium');
  expect(gallium.result.cumulativeWeightedOutputLoss).toBeGreaterThan(
    lithium.result.cumulativeWeightedOutputLoss,
  );
});

printSummary();

import assert from 'node:assert/strict';
import test from 'node:test';

import { calibratedCisplatinBackcast, drugPriceReliefSensitivity } from './calibration.js';
import { genericDrugEconomicsScenarios } from './data.js';
import { simulateGenericDrugEconomics } from './model.js';

test('cisplatin calibration matches national volume and center-access targets', () => {
  const fit = calibratedCisplatinBackcast;
  assert.ok(Math.abs(fit.q3NationalVolumeIndex - 1.23) < 1e-9);
  assert.ok(Math.abs(fit.juneCenterShortage - 0.70) < 1e-9);
  assert.ok(Math.abs(fit.septemberCenterShortage - 0.59) < 1e-9);
});

test('the held-out utilization decline is close to the observed 15 percent', () => {
  const fit = calibratedCisplatinBackcast;
  assert.ok(Math.abs(fit.predictedJuneUtilizationDecline - fit.observedUtilizationDecline) < 0.03);
});

test('a frozen price cap produces a deeper shortage than 50 percent relief', () => {
  const frozen = simulateGenericDrugEconomics(genericDrugEconomicsScenarios['frozen-cap']);
  const relief = simulateGenericDrugEconomics(genericDrugEconomicsScenarios['50pct-relief']);
  assert.ok(frozen.cumulativeDoseShortfall > relief.cumulativeDoseShortfall);
  assert.ok(frozen.minimumServiceLevel < relief.minimumServiceLevel);
  assert.ok(frozen.monthsBelow98Pct > relief.monthsBelow98Pct);
});

test('reliability procurement protects inventory better than price relief alone', () => {
  const relief = simulateGenericDrugEconomics(genericDrugEconomicsScenarios['50pct-relief']);
  const resilience = simulateGenericDrugEconomics(
    genericDrugEconomicsScenarios['50pct-resilience'],
  );
  assert.ok(resilience.cumulativeDoseShortfall <= relief.cumulativeDoseShortfall);
  assert.ok(resilience.endingInventoryMonths > relief.endingInventoryMonths);
});

test('the relief threshold shifts when the raw-material shock is larger', () => {
  const rows = drugPriceReliefSensitivity();
  const central50 = rows.find((row) =>
    row.rawMaterialCostMultiplier === 1.8 && row.priceRelief === 0.50)!;
  const severe50 = rows.find((row) =>
    row.rawMaterialCostMultiplier === 2.1 && row.priceRelief === 0.50)!;
  assert.ok(central50.minimumServiceLevel > 0.98);
  assert.ok(severe50.minimumServiceLevel < 0.90);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  genericTariffScenarios,
  simulateGenericTariffTransition,
} from './generic-tariff.js';

test('the zero-tariff window preserves baseline service and inventory', () => {
  const result = simulateGenericTariffTransition(genericTariffScenarios.announced);
  for (const row of result.months.slice(0, 24)) {
    assert.equal(row.tariffRate, 0);
    assert.equal(row.serviceLevel, 1);
  }
});

test('tariffs alone create a persistent shortage after inventories run out', () => {
  const result = simulateGenericTariffTransition(
    genericTariffScenarios['no-onshoring'],
  );
  assert.ok(result.firstShortageMonth !== null);
  assert.ok(result.monthsBelow98Pct >= 20);
  assert.ok(result.minimumServiceLevel < 0.80);
});

test('a conventional three-year qualification path misses the two-year window', () => {
  const result = simulateGenericTariffTransition(genericTariffScenarios.announced);
  assert.ok(result.firstShortageMonth !== null);
  assert.ok(result.firstShortageMonth! >= 36);
  assert.ok(result.cumulativeDoseShortfallMonths > 1);
});

test('accelerated qualification and a production credit avoid the modeled shortage', () => {
  const conventional = simulateGenericTariffTransition(
    genericTariffScenarios.announced,
  );
  const accelerated = simulateGenericTariffTransition(
    genericTariffScenarios['fast-qualification'],
  );
  assert.equal(accelerated.firstShortageMonth, null);
  assert.equal(accelerated.minimumServiceLevel, 1);
  assert.ok(
    accelerated.cumulativeDoseShortfallMonths <
      conventional.cumulativeDoseShortfallMonths,
  );
});

test('full pass-through protects supply by making purchasers absorb the tariff', () => {
  const result = simulateGenericTariffTransition(
    genericTariffScenarios['full-pass-through'],
  );
  assert.equal(result.firstShortageMonth, null);
  assert.equal(result.minimumServiceLevel, 1);
  assert.ok(result.peakPaidPriceMultiplier > 2);
});

test('inventory delays a shortage but cannot cure absent replacement supply', () => {
  const base = genericTariffScenarios['no-onshoring'];
  const thin = simulateGenericTariffTransition({
    ...base,
    id: 'thin-inventory',
    initialInventoryMonths: 0,
  });
  const stocked = simulateGenericTariffTransition({
    ...base,
    id: 'stocked',
    initialInventoryMonths: 4,
  });
  assert.ok(thin.firstShortageMonth !== null);
  assert.ok(stocked.firstShortageMonth !== null);
  assert.ok(stocked.firstShortageMonth! > thin.firstShortageMonth!);
});

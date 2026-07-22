import assert from 'node:assert/strict';
import test from 'node:test';

import { auditTariffCalibration } from './calibration.js';
import { brazilJuly2026Tariff, canadaJuly2026Tariff } from './data.js';
import { simulateBilateralTariff } from './model.js';

test('single-elasticity V1 fails the steel holdout and motivates sector elasticities', () => {
  const audit = auditTariffCalibration();
  assert.ok(audit.v1SteelAbsoluteError > 0.20);
  assert.ok(audit.steelTradeElasticity < audit.aluminumTradeElasticity / 2);
  assert.equal(audit.downstreamLossExceedsProtectedGain, true);
});

test('scoped Canada action reproduces the published average tariff increase', () => {
  const result = simulateBilateralTariff(canadaJuly2026Tariff);
  assert.ok(Math.abs(result.effectiveAverageTariffIncrease - 0.0257) < 0.001);
});

test('headline treatment materially overstates the Canada shock', () => {
  const scoped = simulateBilateralTariff(canadaJuly2026Tariff);
  const naive = simulateBilateralTariff(canadaJuly2026Tariff, { scope: 'naive-headline' });
  assert.ok(naive.usConsumerPriceChange > scoped.usConsumerPriceChange * 10);
  assert.ok(Math.abs(naive.partnerRealGdpChange) > Math.abs(scoped.partnerRealGdpChange) * 10);
});

test('Canada bears a larger GDP hit than Brazil because U.S. exposure is much higher', () => {
  const canada = simulateBilateralTariff(canadaJuly2026Tariff);
  const brazil = simulateBilateralTariff(brazilJuly2026Tariff);
  assert.ok(Math.abs(canada.partnerRealGdpChange) > Math.abs(brazil.partnerRealGdpChange) * 2);
});

test('retaliation worsens the U.S. GDP effect without removing import-price pressure', () => {
  const unilateral = simulateBilateralTariff(canadaJuly2026Tariff);
  const retaliated = simulateBilateralTariff(canadaJuly2026Tariff, { retaliation: true });
  assert.ok(retaliated.usRealGdpChange < unilateral.usRealGdpChange);
  assert.equal(retaliated.usConsumerPriceChange, unilateral.usConsumerPriceChange);
});

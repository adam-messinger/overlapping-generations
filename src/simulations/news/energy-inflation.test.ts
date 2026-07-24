import assert from 'node:assert/strict';
import test from 'node:test';

import {
  energyInflationEvidence,
  energyInflationScenarios,
  simulateEnergyInflationV1,
  simulateEnergyInflationV2,
} from './energy-inflation.js';

test('propagation revision improves the multidimensional 2022 reconstruction', () => {
  const scenario = energyInflationScenarios['euro-area-2022-backcast'];
  const v1 = simulateEnergyInflationV1(scenario);
  const v2 = simulateEnergyInflationV2(scenario);
  const score = (result: typeof v1): number =>
    Math.abs(
      result.peakHeadlineInflationPct -
        energyInflationEvidence.euroArea2022PeakHeadlineInflationPct,
    ) +
    Math.abs(
      result.peakCoreInflationPct -
        energyInflationEvidence.euroArea2023PeakCoreInflationPct,
    ) +
    Math.abs(
      result.peakPolicyRatePct -
        energyInflationEvidence.euroArea2023PeakDepositRatePct,
    );

  assert.ok(score(v2) < score(v1));
  assert.ok(v2.peakCoreInflationPct > scenario.startingCoreInflationPct);
  assert.ok(v1.peakCoreInflationPct === scenario.startingCoreInflationPct);
});

test('looking through a temporary supply shock prevents a headline-driven hiking cycle', () => {
  const scenario = energyInflationScenarios['euro-area-2026-current'];
  const v1 = simulateEnergyInflationV1(scenario);
  const v2 = simulateEnergyInflationV2(scenario);

  assert.ok(v2.peakHeadlineInflationPct > 4.5);
  assert.ok(v2.peakCoreInflationPct < 3);
  assert.ok(v2.peakPolicyRatePct < v1.peakPolicyRatePct - 0.5);
});

test('persistence raises core inflation and the policy peak', () => {
  const current = simulateEnergyInflationV2(
    energyInflationScenarios['euro-area-2026-current'],
  );
  const persistent = simulateEnergyInflationV2(
    energyInflationScenarios['euro-area-2026-persistent'],
  );

  assert.ok(persistent.peakCoreInflationPct > current.peakCoreInflationPct);
  assert.ok(persistent.peakPolicyRatePct > current.peakPolicyRatePct);
  assert.ok(
    persistent.monthsHeadlineAboveTarget > current.monthsHeadlineAboveTarget,
  );
});

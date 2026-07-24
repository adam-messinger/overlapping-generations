import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calibrateCoralBleaching,
  coralBleachingScenarios,
  simulateCoralBleachingV1,
  simulateCoralBleachingV2,
} from './coral-bleaching.js';

test('adding the warming baseline materially improves the frozen holdout', () => {
  const calibration = calibrateCoralBleaching();

  assert.equal(calibration.developmentThroughYear, 2017);
  assert.equal(calibration.holdoutV1.observations, 8);
  assert.ok(
    calibration.holdoutV2.meanAbsoluteError <
      calibration.holdoutV1.meanAbsoluteError / 2,
  );
  assert.ok(
    calibration.holdoutV2.rootMeanSquaredError <
      calibration.holdoutV1.rootMeanSquaredError / 2,
  );
});

test('ENSO-only toy model misses the recent bleaching regime', () => {
  const scenario = coralBleachingScenarios.holdout;
  const v1 = simulateCoralBleachingV1(scenario);
  const v2 = simulateCoralBleachingV2(scenario);
  const row2024V1 = v1.years.find((row) => row.year === 2024);
  const row2024V2 = v2.years.find((row) => row.year === 2024);

  assert.ok((row2024V1?.predictedBleachingExtent ?? 1) < 0.2);
  assert.ok((row2024V2?.predictedBleachingExtent ?? 0) > 0.7);
});

test('current outlook attributes most global exposure to warming, with ENSO adding a lagged pulse', () => {
  const result = simulateCoralBleachingV2(
    coralBleachingScenarios['current-outlook'],
  );
  const row2026 = result.years.find((row) => row.year === 2026);
  const row2027 = result.years.find((row) => row.year === 2027);

  assert.ok((row2026?.predictedBleachingExtent ?? 0) > 0.65);
  assert.ok(
    (row2026?.earlyRecordBaselineCounterfactualExtent ?? 1) < 0.1,
  );
  assert.ok(
    (row2027?.predictedBleachingExtent ?? 0) >
      (row2026?.predictedBleachingExtent ?? 1),
  );
  assert.ok((row2027?.conditionalEnsoContributionPctPoints ?? 0) > 10);
  assert.ok(
    (row2027?.conditionalRecentWarmingContributionPctPoints ?? 0) > 70,
  );
});

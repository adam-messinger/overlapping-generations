import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateCyclosporaNowcast,
  evaluateDataCenterRatepayerPledge,
  evaluateHeatMortalityNowcast,
} from './headline-experiments-2026-07-26.js';

test('heat revision turns a brittle multiplier into a wide nowcast', () => {
  const result = evaluateHeatMortalityNowcast();

  assert.ok(result.initialV1.estimatedExcessDeaths > 180);
  assert.ok(result.initialV1.estimatedExcessDeaths < 210);
  assert.ok(
    result.initialV1.leaveOneOutMeanAbsolutePercentageError > 0.60,
  );
  assert.ok(
    result.revisedV2.leaveOneOutMeanAbsolutePercentageError > 0.50,
  );
  assert.ok(result.revisedV2.centralExcessDeaths > 200);
  assert.ok(result.revisedV2.centralExcessDeaths < 225);
  assert.ok(result.revisedV2.lowerExcessDeaths < 120);
  assert.ok(result.revisedV2.upperExcessDeaths > 400);
  assert.ok(
    result.revisedV2.provisionalCountShareOfCentralExcess < 0.35,
  );
});

test('Cyclospora revision validates reporting decay on a later snapshot', () => {
  const result = evaluateCyclosporaNowcast();

  assert.ok(result.initialV1.projectedFinalCases > 4_000);
  assert.ok(
    result.calibration.later2020AbsolutePercentageError < 0.03,
  );
  assert.ok(result.calibration.refitReportingHalfLifeDays > 6);
  assert.ok(result.calibration.refitReportingHalfLifeDays < 7);
  assert.ok(result.revisedV2.centralFinalOutbreakCases > 3_300);
  assert.ok(result.revisedV2.centralFinalOutbreakCases < 3_500);
  assert.ok(result.revisedV2.lowerFinalOutbreakCases > 2_900);
  assert.ok(result.revisedV2.upperFinalOutbreakCases > 4_200);
  assert.ok(
    result.responseTiming.currentDelayRelativeToHistoricalMean < 0.6,
  );
  assert.equal(result.responseTiming.publicLinkageToRecallDays, 1);
});

test('data-center revision separates protection, scarcity, and fixed-cost dilution', () => {
  const result = evaluateDataCenterRatepayerPledge();

  assert.ok(result.initialV1.fullySocializedBillImpact > 0.05);
  assert.equal(result.initialV1.literalFullPledgeBillImpact, 0);
  assert.ok(
    result.revisedV2.central.netNonDataCenterBillImpact > 0.02,
  );
  assert.ok(
    result.revisedV2.central.netNonDataCenterBillImpact < 0.03,
  );
  assert.ok(
    result.revisedV2.noProtection.netNonDataCenterBillImpact > 0.08,
  );
  assert.ok(
    result.revisedV2.literalFullPledge.netNonDataCenterBillImpact < 0,
  );
  assert.equal(
    result.revisedV2.literalFullPledgeWithoutLegacyContribution
      .netNonDataCenterBillImpact,
    0,
  );
  assert.ok(
    result.revisedV2
      .headlineTerritoryCoverageMisreadAsProjectCoverage
      .netNonDataCenterBillImpact <
      result.revisedV2.central.netNonDataCenterBillImpact,
  );
});

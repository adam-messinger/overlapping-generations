import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluatePipelineAttrition,
  evaluateSolarCoalCrossover,
  evaluateVendorFinancingBackstop,
  solarCoalCrossoverCase,
} from './headline-experiments-2026-07-27.js';

test('vendor backstop dwarfs telecom ratios but prices as a survivable contingency', () => {
  const result = evaluateVendorFinancingBackstop();

  assert.ok(result.initialV1.backstopShareOfRevenue > 1.1);
  assert.ok(result.initialV1.backstopShareOfRevenue < 1.2);
  assert.ok(result.initialV1.multipleOfLargestHistoricalRatio > 4);
  assert.ok(result.initialV1.multipleOfLargestHistoricalRatio < 6);
  assert.ok(result.initialV1.totalDiscussedShareOfRevenue > 2.5);

  assert.ok(result.revisedV2.fullBuildAnnualLeasePaymentBillion > 50);
  assert.ok(result.revisedV2.fullBuildAnnualLeasePaymentBillion < 70);
  assert.ok(result.revisedV2.requiredLesseeRevenueBillion > 180);
  assert.ok(result.revisedV2.requiredLesseeRevenueBillion < 210);

  const byId = new Map(
    result.revisedV2.scenarioCoverage.map((row) => [row.id, row]),
  );
  assert.equal(byId.get('slow-monetization')?.coverageYear, null);
  const centralCoverage = byId.get('central')?.coverageYear;
  assert.ok(centralCoverage !== null && centralCoverage !== undefined);
  assert.ok(centralCoverage >= 2031 && centralCoverage <= 2033);

  assert.ok(result.revisedV2.expectedLossBillion > 15);
  assert.ok(result.revisedV2.expectedLossBillion < 35);
  assert.ok(result.revisedV2.expectedLossShareOfAnnualFreeCashFlow < 0.4);
  assert.ok(result.revisedV2.worstCaseLossYearsOfFreeCashFlow > 1.5);
  assert.ok(result.revisedV2.worstCaseLossYearsOfFreeCashFlow < 3);
  assert.ok(result.revisedV2.historicalLossShareOfCommitments > 0.3);
  assert.ok(result.revisedV2.historicalLossShareOfCommitments < 0.4);
  assert.ok(result.revisedV2.guaranteedBuyerShareOfProjectCapex > 0.6);
});

test('pipeline attrition shrinks from fatal to comparable once semantics are fixed', () => {
  const result = evaluatePipelineAttrition();

  assert.ok(result.requiredNetAdditionsGwPerYear > 15);
  assert.ok(result.requiredNetAdditionsGwPerYear < 17);
  assert.ok(result.initialV1.forecastLooksInfeasible);
  assert.ok(result.initialV1.annualizedBlockedGwPerYear > 40);

  assert.ok(result.revisedV2.blockedGwFullStack < 4);
  assert.ok(result.revisedV2.blockedGwFacilityOnly > 10);
  assert.ok(result.revisedV2.netCapacityLossGwPerYearHigh < 8);
  assert.ok(result.revisedV2.netCapacityLossGwPerYearLow > 2);
  assert.ok(result.revisedV2.consentDragAverageLoadGwPerYearHigh < 5);
  assert.ok(result.revisedV2.grossBlockedShareOfEmbeddedAttrition > 1);
  assert.ok(result.revisedV2.grossBlockedShareOfEmbeddedAttrition < 1.6);

  const drags = result.revisedV2.firmCapacityVariants.map(
    (row) => row.firmCapacityDragAverageLoadGwPerYear,
  );
  assert.ok(Math.min(...drags) < 2);
  assert.ok(Math.max(...drags) > 5);
  assert.equal(result.revisedV2.bindingConstraint, 'comparable');
});

test('solar-coal revision validates on May 2026 and moves the crossover to 2028', () => {
  const result = evaluateSolarCoalCrossover();

  assert.equal(result.initialV1.claimedCrossoverYear, 2026);
  assert.ok(result.initialV1.may2026SolarShareOfCoal > 1);

  assert.ok(result.revisedV2.maySolarSeasonalFactor > 1.1);
  assert.ok(result.revisedV2.maySolarSeasonalFactor < 1.3);
  assert.ok(result.revisedV2.mayCoalSeasonalFactor > 0.75);
  assert.ok(result.revisedV2.mayCoalSeasonalFactor < 0.9);
  assert.ok(result.revisedV2.predictionReproducesMonthlyCrossover);
  assert.ok(Math.abs(result.revisedV2.may2026SolarPredictionError) < 0.1);
  assert.ok(Math.abs(result.revisedV2.may2026CoalPredictionError) < 0.1);

  assert.equal(result.revisedV2.annualCrossoverYear, 2028);
  assert.equal(result.revisedV2.annualCrossoverYearCoalDeclineLow, 2028);
  assert.equal(result.revisedV2.annualCrossoverYearCoalDeclineHigh, 2029);
  assert.ok(result.revisedV2.monthlyLeadYears !== null);
  assert.ok(result.revisedV2.monthlyLeadYears >= 2);
  assert.ok(result.revisedV2.annual2026SolarDeficitTwh > 150);
});

test('solar-coal crossover responds to slower solar additions', () => {
  const slow = evaluateSolarCoalCrossover({
    ...solarCoalCrossoverCase,
    solarAnnualAdditionTwh: 70,
    solarAdditionGrowth: 0,
    coalAnnualGrowth: -0.02,
  });
  const crossover = slow.revisedV2.annualCrossoverYear;
  assert.ok(crossover !== null);
  assert.ok(crossover >= 2029);
});

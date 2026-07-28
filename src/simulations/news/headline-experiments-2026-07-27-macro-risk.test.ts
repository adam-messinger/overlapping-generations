import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateChinaIndustrialProfits,
  evaluateHurricaneInsuranceRisk,
  evaluateOilPauseInflation,
} from './headline-experiments-2026-07-27-macro-risk.js';

test('oil revision makes inflation relief conditional on pause duration', () => {
  const result = evaluateOilPauseInflation();

  assert.ok(Math.abs(result.initialV1.spotOilPriceRelief - 0.0814) < 1e-9);
  assert.ok(
    result.initialV1.instantaneousHeadlinePriceLevelReliefPctPoints >
      0.4,
  );
  assert.ok(result.initialV1.warPremiumShareRemaining > 0.7);
  assert.ok(
    result.revisedV2.temporaryPause
      .firstYearAverageHeadlineReliefPctPoints < 0.05,
  );
  assert.ok(
    result.revisedV2.sustainedPause
      .firstYearAverageHeadlineReliefPctPoints > 0.20,
  );
  assert.ok(
    result.revisedV2.sustainedPause.peakHeadlineInflationPct <
      result.revisedV2.prePauseStress.peakHeadlineInflationPct,
  );
});

test('China revision reconciles profits through revenue and margins', () => {
  const result = evaluateChinaIndustrialProfits();
  const exact = result.revisedV2.exactGrowthDecomposition;

  assert.ok(
    Math.abs(
      exact.revenueScalePctPoints +
        exact.marginExpansionPctPoints +
        exact.interactionPctPoints -
        result.case.totalProfitGrowth,
    ) < 1e-12,
  );
  assert.ok(
    result.revisedV2.shapleyGrowthDecomposition
      .marginChannelShareOfProfitGrowth > 0.6,
  );
  assert.ok(
    result.revisedV2.sectorContribution
      .electronicsAndRawMaterialsShareOfGrowth > 0.92,
  );
  assert.ok(
    result.revisedV2.exportCounterfactualCentral
      .exportCushionPctPoints > 0.029,
  );
  assert.ok(
    result.revisedV2.exportCounterfactualCentral
      .exportCushionPctPoints < 0.031,
  );
  const sensitivity =
    result.revisedV2.exportCounterfactualSensitivity;
  assert.ok((sensitivity.at(0)?.exportCushionPctPoints ?? 1) > 0.02);
  assert.ok((sensitivity.at(-1)?.exportCushionPctPoints ?? 0) < 0.04);
});

test('hurricane revision retains a large loss tail in a quieter season', () => {
  const result = evaluateHurricaneInsuranceRisk();

  assert.ok(
    result.initialV1.historicalMeanAbsolutePercentageError > 0.95,
  );
  assert.ok(
    result.revisedV2.historicalMechanismMeanAbsolutePercentageError <
      0.20,
  );
  assert.ok(result.revisedV2.central.expectedLossBillion > 18);
  assert.ok(result.revisedV2.central.expectedLossBillion < 19);
  assert.ok(result.revisedV2.central.medianLossBillion < 10);
  assert.ok(result.revisedV2.central.p90LossBillion > 100);
  assert.ok(
    result.revisedV2.central.probabilityAtLeastOneMetroStrike > 0.10,
  );
  assert.ok(
    result.revisedV2.central.probabilityAtLeastOneMetroStrike < 0.13,
  );
  assert.ok(result.revisedV2.central.expectedLossReduction > 0.35);
});

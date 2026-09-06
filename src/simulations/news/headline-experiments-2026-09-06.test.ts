import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateDieselInflationAndFed,
  evaluateEbolaTrajectory,
  evaluateHormuzClosureNarrative,
} from './headline-experiments-2026-09-06.js';

test('Hormuz: the vessel count cannot be the oil flow, and the price does not identify it', () => {
  const result = evaluateHormuzClosureNarrative();
  const v1 = result.initialV1;
  const v2 = result.revisedV2;

  // Reading 7% of transits as 7% of oil volume implies a price far above spot.
  assert.ok(v1.vesselCountThroughputShare < 0.08);
  assert.ok(v1.literalClearingPriceUsd > 130);
  assert.ok(v1.settlementModelBrentAtVesselCountUsd > result.case.brentUsdPerBarrel + 10);

  // Both inversions reproduce spot, with very different throughput.
  assert.ok(Math.abs(v2.settlementModel.septemberBrentReproducedUsd - result.case.brentUsdPerBarrel) < 0.05);
  assert.ok(Math.abs(v2.stockFlowModel.septemberBrentReproducedUsd - result.case.brentUsdPerBarrel) < 0.05);
  assert.ok(v2.settlementModel.septemberThroughputImpliedByPrice > 0.2);
  assert.ok(v2.stockFlowModel.throughputBandWithin3Usd.high < 0.15);
  assert.ok(v2.priceImpliedToVesselCountRatio > 3);

  // Renewed strikes add more premium than the observed weekly move, so the
  // implied physical flow rises from August to September.
  assert.ok(v2.settlementModel.septemberThroughputImpliedByPrice > v2.settlementModel.augustThroughputImpliedByPrice);
  const sensitivity = v2.settlementModel.intensitySensitivity;
  for (let i = 1; i < sensitivity.length; i++) {
    assert.ok(sensitivity[i]!.septemberThroughputImpliedByPrice >= sensitivity[i - 1]!.septemberThroughputImpliedByPrice);
  }

  // The IEA observed draw is a holdout both models fail on the high side, and
  // the stock identity then puts the flow well above the vessel count.
  const anchored = v2.stockAnchored;
  assert.ok(anchored.settlementModelMarchToJulyDrawMb > result.case.ieaObservedStockDrawMarchToJulyMb * 1.5);
  assert.ok(anchored.stockFlowModelMarchToJulyDrawMb > result.case.ieaObservedStockDrawMarchToJulyMb * 1.2);
  const central = anchored.readings.find((r) => r.demandElasticity === 0.15);
  assert.ok(central && central.impliedHormuzThroughputShare > 0.25 && central.impliedHormuzThroughputShare < 0.5);

  // Conditioning on survival to October removes the mass the model had
  // already placed on a settlement that did not happen.
  for (const branch of v2.branches) {
    assert.ok(branch.settledByDec2026GivenSurvival < branch.settledByDec2026Unconditional);
    assert.ok(branch.settledByDec2026GivenSurvival > 0.1 && branch.settledByDec2026GivenSurvival < 0.5);
    assert.equal(branch.usSprExhaustedLabel, 'Nov 2026');
  }
  const escalation = v2.branches.find((b) => b.id === 'escalation');
  const pause = v2.branches.find((b) => b.id === 'pause');
  assert.ok(escalation && pause);
  assert.ok(escalation.brentDec2026Usd > 105);
  assert.ok(pause.brentDec2026Usd < 90);
  assert.ok(escalation.settledByDec2026GivenSurvival > pause.settledByDec2026GivenSurvival);
});

test('Diesel: a refining-margin shock with a small incremental CPI contribution', () => {
  const result = evaluateDieselInflationAndFed();
  const v2 = result.revisedV2;

  assert.ok(result.initialV1.naiveHeadlineAdditionPctPoints > 1);
  assert.ok(v2.distillateMarket.crackShareOfWholesaleRise > 0.7);
  assert.ok(v2.distillateMarket.impliedShortRunElasticity > 0.05);
  assert.ok(v2.distillateMarket.impliedShortRunElasticity < 0.2);
  assert.ok(v2.distillateMarket.retailIfHormuzProductsLostUsdPerGal > result.case.dieselUsdPerGalNow);
  assert.ok(v2.distillateMarket.retailAfterMediumRunAdjustmentUsdPerGal < result.case.dieselUsdPerGalNow);

  assert.ok(v2.cpiPassThrough.totalHeadlineAdditionAfterYearPctPoints < 0.3);
  assert.ok(v2.cpiPassThrough.totalHeadlineAdditionAfterYearPctPoints > 0.1);
  assert.ok(v2.cpiPassThrough.incrementalDieselBillBillionPerYear < v2.cpiPassThrough.yearOverYearDieselBillBillionPerYear / 2);
  assert.ok(v2.baseEffects.headlineIfEnergyFlatJun2027Pct < 3);

  // The retail-energy calibration lands near the reported July print.
  assert.ok(Math.abs(v2.policy.modelHeadlineJuly2026Pct - result.case.headlineCpiJuly) < 0.25);
  // Headline drifts up into year-end on the September fuel level, then base
  // effects pull it toward core by mid-2027 under either policy rule.
  assert.ok(v2.policy.lookThrough.headlineDec2026Pct > result.case.headlineCpiJuly);
  assert.ok(v2.policy.lookThrough.headlineJun2027Pct < 3.1);
  assert.ok(v2.policy.hikeRule.peakPolicyRatePct > v2.policy.lookThrough.peakPolicyRatePct + 0.5);
  assert.ok(Math.abs(v2.policy.headlineDifferenceDec2027PctPoints) < 0.05);
  assert.ok(v2.policy.outputGapDifferencePctPoints < 0);

  // One print does not establish a trend above the breakeven range.
  assert.ok(v2.labour.probabilityAugustAboveConsensusIsSignal > 0.85);
  assert.ok(v2.labour.probabilityTrendAboveBreakevenHigh < 0.5);
  assert.ok(v2.labour.probabilityTrendAboveBreakevenLow > 0.7);
});

test('Ebola: exponential extrapolation fails a plateau that an Rt-near-one fit reproduces', () => {
  const result = evaluateEbolaTrajectory();
  const v1 = result.initialV1;
  const v2 = result.revisedV2;

  assert.ok(v1.doublingTimeDays > 20 && v1.doublingTimeDays < 30);
  assert.ok(v1.projectedCasesByDec31 > 100_000);
  assert.ok(v1.ratioToWestAfrica > 4);

  // Confirmed incidence has been flat since mid-July.
  assert.ok(v2.plateauRatio > 0.85 && v2.plateauRatio < 1.15);
  const recent = v2.empiricalReproductionNumber.slice(-6);
  const meanRt = recent.reduce((a, b) => a + b.rt, 0) / recent.length;
  assert.ok(meanRt > 0.9 && meanRt < 1.25);

  // A single-stage fit carries growth into the holdout; a second stage helps
  // out of sample; the full-sample refit lands at Rt ≈ 1.
  assert.ok(v2.evaluation.holdout.caseCumulativeError > 0.25);
  assert.ok(v2.twoStage.holdoutCumulativeErrorImprovement > 0);
  assert.ok(v2.finalFit.effectiveReproductionNumberNow > 0.9 && v2.finalFit.effectiveReproductionNumberNow < 1.1);
  assert.ok(v2.fitted.ascertainment < 0.5);

  const plateau = v2.projections.find((p) => p.id === 'plateau-continues');
  const erodes = v2.projections.find((p) => p.id === 'response-erodes');
  const strengthens = v2.projections.find((p) => p.id === 'response-strengthens');
  assert.ok(plateau && erodes && strengthens);
  assert.ok(plateau.confirmedCasesByDec31 > 12_000 && plateau.confirmedCasesByDec31 < 25_000);
  assert.ok(plateau.confirmedCasesByDec31 < v1.projectedCasesByDec31 / 5);
  assert.ok(strengthens.confirmedCasesByDec31 < plateau.confirmedCasesByDec31);
  assert.ok(erodes.confirmedCasesByDec31 > plateau.confirmedCasesByDec31);
  assert.ok(erodes.confirmedCasesByDec31 < v1.projectedCasesByDec31);
});

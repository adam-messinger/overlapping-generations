import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateBrentDealRepricing,
  evaluateElNinoTemperature,
  evaluateFedDecemberHike,
  scoreSeptember6Forecasts,
} from './headline-experiments-2026-11-08.js';
import { ERA5_MONTHLY_ANOMALY_1991_2020, ONI_MONTHLY } from './el-nino-temperature-data.js';

test('Brent: the deal bet explains a minority of the fall; today is the stock-cleared status quo', () => {
  const r = evaluateBrentDealRepricing();
  // Reading the whole fall as a deal bet needs a jump in deal odds ~4x the largest observed move.
  assert.ok(r.initialV1.impliedOverObservedOddsMove > 3);
  // At most about a quarter of the $19 fall is a move in deal odds.
  assert.ok(r.revisedV2.dealOddsMoveShareOfFallAtMost < 0.3);
  // The 6 November close sits at the model's status quo at full tempo...
  const fullTempo = r.revisedV2.statusQuoNovemberAtTempoUsd.find((z) => z.tempo === 1);
  assert.ok(fullTempo && Math.abs(fullTempo.brentUsd - r.case.brentNov6Usd) < 4);
  for (const reading of r.revisedV2.impliedDealProbabilityAtModelNoDeal) assert.ok(reading.probability < 0.1);
  // ...while the 30 October close is well above even a re-closure in the model.
  assert.ok(r.revisedV2.october30AboveEscalationPeakUsd > 10);
  // Holdout: the stock block lands far closer to the IEA's end-September gap than the legacy block.
  const gap = r.revisedV2.stockGapEndSeptemberMb;
  assert.ok(Math.abs(gap.stocksV2 - gap.iea) < Math.abs(gap.flowV1 - gap.iea) / 3);
  assert.ok(gap.stocksV2 / gap.iea < 1.35);
});

test('Fed: refit removes the core bias; headline peaks in October under any rule', () => {
  const r = evaluateFedDecemberHike();
  assert.ok(r.initialV1.meanCoreErrorPp > 0.15);
  assert.ok(r.revisedV2.fitRmsePp < r.revisedV2.v1FitRmsePp / 2);
  assert.ok(r.revisedV2.fittedIndirectPassThrough < r.revisedV2.defaultIndirectPassThrough);
  const { lookThrough, hikeRule, relapse } = r.revisedV2;
  assert.equal(lookThrough.peakHeadlineMonth, 'Oct 2026');
  assert.ok(lookThrough.headlineJun2027Pct < lookThrough.headlineDec2026Pct - 0.8);
  assert.ok(Math.abs(r.revisedV2.hikeBuysDec2027Pp) < 0.05);
  assert.ok(hikeRule.policyRateDec2026Pct > lookThrough.policyRateDec2026Pct);
  assert.ok(relapse.headlineJun2027Pct > lookThrough.headlineJun2027Pct + 0.3);
  // The revisions turn the 6 September labour read around.
  assert.ok(r.revisedV2.labour.september6ProbabilityTrendAbove90k < 0.4);
  assert.ok(r.revisedV2.labour.probabilityTrendAbove90k > 0.8);
});

test('El Nino: the strong-event excess passes the 2026 holdout and makes 2027 the record year', () => {
  assert.equal(ERA5_MONTHLY_ANOMALY_1991_2020.length, (2026 - 1969) * 12 + 10);
  assert.equal(ONI_MONTHLY.length, (2026 - 1969) * 12 + 9);
  const r = evaluateElNinoTemperature();
  assert.ok(r.fit.ensoCoefficient > 0.08 && r.fit.ensoCoefficient < 0.13);
  // Every prior strong El Nino's following year ran warm against the regression.
  for (const s of r.fit.strongEventResiduals) assert.ok(s.residual > 0.03);
  // Holdout: the regression alone misses July–October 2026; the excess fixes it.
  assert.ok(r.holdout2026.julyToOctoberResidual > 0.05);
  assert.ok(Math.abs(r.holdout2026.julyToOctoberResidualV2) < Math.abs(r.holdout2026.julyToOctoberResidual) / 2);
  assert.ok(Math.abs(r.holdout2026.firstHalfResidual) < 0.03);
  // 2026: inside Copernicus's projected range, most likely second.
  const y26 = r.revisedV2.year2026;
  assert.ok(y26.annualAnomalyPreindustrial > r.case.copernicusProjection2026.low - 0.01);
  assert.ok(y26.annualAnomalyPreindustrial < r.case.copernicusProjection2026.high);
  assert.ok(y26.probabilityAbove2024 < 0.3);
  // 2027: the record year in V2, a coin flip in V1.
  assert.ok(r.revisedV2.year2027.annualAnomalyPreindustrial > r.observed.record2024 + 0.05);
  assert.ok(r.revisedV2.year2027.probabilityAbove2024 > 0.7);
  assert.ok(r.initialV1.year2027.probabilityAbove2024 < 0.6);
});

test('Scorecard: the 6 September Ebola plateau call beat the exponential by a wide margin', () => {
  const s = scoreSeptember6Forecasts();
  const observed = s.ebola.observedCasesAtLastObservation;
  assert.ok(Math.abs(s.ebola.plateauCasesAtLastObservation - observed) / observed < 0.15);
  assert.ok(s.ebola.exponentialCasesAtLastObservation > 2.5 * observed);
  assert.ok(s.ebola.observedWeeklyCasesSinceAnchor < s.ebola.plateauWeeklyCases);
  // The IEA's August flow falls inside the 6 September stock-anchored band.
  assert.ok(s.hormuz.ieaAugustThroughputShare > s.hormuz.stockAnchoredThroughputBand[0]);
  assert.ok(s.hormuz.ieaAugustThroughputShare < s.hormuz.stockAnchoredThroughputBand[1]);
});

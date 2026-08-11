import assert from 'node:assert/strict';
import test from 'node:test';

import {
  basePeriodCpiWeights,
  coreWeight,
  cpiWeights,
  crudeImpliedRetail,
  crudePath,
  dcGuardDeployment,
  decomposeCpi,
  energyWeight,
  evaluateGuardDeployment,
  evaluateOilCpiPassThrough,
  gasolinePassThrough,
  julyCpiCase,
  stepRetailGasoline,
  totalEnergyWeight,
} from './headline-experiments-2026-08-11.js';

test('CPI weights partition the index', () => {
  assert.ok(Math.abs(energyWeight + cpiWeights.food + coreWeight - 100) < 1e-9);
  assert.ok(totalEnergyWeight(cpiWeights) > totalEnergyWeight(basePeriodCpiWeights));
});

test('the decomposition is additive and weight-consistent', () => {
  const result = decomposeCpi({
    gasoline: -3,
    electricity: 0.4,
    utilityGas: 0.5,
    fuelOil: -2,
    food: 0.2,
    core: 0.2,
  });
  assert.ok(
    Math.abs(
      result.energyContribution +
        result.foodContribution +
        result.coreContribution -
        result.headlineChange,
    ) < 1e-12,
  );
  // A uniform 1% rise in everything must produce a 1% headline under any weights.
  const uniform = decomposeCpi({
    gasoline: 1,
    electricity: 1,
    utilityGas: 1,
    fuelOil: 1,
    food: 1,
    core: 1,
  });
  assert.ok(Math.abs(uniform.headlineChange - 1) < 1e-12);
  const uniformBase = decomposeCpi(
    { gasoline: 1, electricity: 1, utilityGas: 1, fuelOil: 1, food: 1, core: 1 },
    basePeriodCpiWeights,
  );
  assert.ok(Math.abs(uniformBase.headlineChange - 1) < 1e-12);
});

test('the June print reconstructs from its own published components', () => {
  const result = evaluateOilCpiPassThrough();
  // Non-gasoline energy is backed out of the reported gasoline and energy
  // indexes rather than guessed, so it should be a mild decline, not a rise.
  assert.ok(result.validation.impliedNonGasolineEnergy < 0);
  assert.ok(result.validation.impliedNonGasolineEnergy > -4);
  assert.ok(result.validation.driftWeightError < 0.05);
  assert.ok(result.validation.baseWeightError < 0.05);
  // Both weight tables round to the reported -0.4%, so the drift markup is a
  // refinement, not the thing that rescues the reconstruction.
  assert.equal(
    Math.round(result.validation.reconstructedJuneHeadlineBaseWeights * 10) / 10,
    result.validation.reportedJuneHeadline,
  );
  assert.equal(
    Math.round(result.validation.reconstructedJuneHeadlineDriftWeights * 10) / 10,
    result.validation.reportedJuneHeadline,
  );
  assert.ok(
    result.validation.driftWeightError < result.validation.baseWeightError,
  );
});

test('the July print carries an energy drag, not an energy boost', () => {
  const result = evaluateOilCpiPassThrough();
  assert.ok(result.revisedV2.julyGasolineNsaChange < -2);
  assert.ok(result.revisedV2.julyDecomposition.energyContribution < 0);
  assert.ok(result.revisedV2.headlineForecast < result.case.consensusHeadline);
  assert.ok(result.revisedV2.surpriseVersusConsensus < -0.05);
  assert.equal(result.revisedV2.headlineForecastRounded, 0.1);
  assert.ok(result.revisedV2.headlineYoYForecast < result.case.consensusHeadlineYoY);
  // The whole forecast band sits below consensus.
  assert.ok(result.revisedV2.headlineHigh < result.case.consensusHeadline);
});

test('V1 reads an August spot move into a July reference period', () => {
  const result = evaluateOilCpiPassThrough();
  assert.ok(result.initialV1.brentFourSessionChange > 5);
  assert.ok(result.initialV1.impliedHeadlineChange > 0.4);
  // The naive read and the model disagree by more than three tenths of a point
  // on a number whose consensus band is a tenth wide.
  assert.ok(
    result.initialV1.impliedHeadlineChange - result.revisedV2.headlineForecast >
      0.3,
  );
});

test('a margin overhang absorbs most of a crude rebound', () => {
  const result = evaluateOilCpiPassThrough();
  const july = crudePath[crudePath.length - 1];
  assert.equal(july.month, '2026-07');
  // The pump sits above the crude-implied level after the April-to-July fall.
  const overhang = july.retailGasoline! - crudeImpliedRetail(july.brent);
  assert.ok(overhang > 0.2);
  const hold = result.augustScenarios.find((s) => s.id === 'hold');
  assert.ok(hold);
  const crudeRise = (100 * (hold.augustBrent - july.brent)) / july.brent;
  assert.ok(crudeRise > 6);
  // Crude up ~7%, pump up under a third of that in the first month.
  assert.ok(hold.retailChangePct > 0);
  assert.ok(hold.retailChangePct < crudeRise / 3);
});

test('escalation scenarios are monotone in crude', () => {
  const result = evaluateOilCpiPassThrough();
  const ordered = [...result.augustScenarios].sort(
    (a, b) => a.augustBrent - b.augustBrent,
  );
  for (let i = 1; i < ordered.length; i += 1) {
    assert.ok(ordered[i].retailChangePct > ordered[i - 1].retailChangePct);
    assert.ok(
      ordered[i].headlineEnergyContribution >
        ordered[i - 1].headlineEnergyContribution,
    );
  }
  // Only a full closure puts more than half a point on a monthly print.
  const closure = ordered[ordered.length - 1];
  assert.ok(closure.headlineEnergyContribution > 0.4);
});

test('the war spike becomes a disinflationary base effect', () => {
  const result = evaluateOilCpiPassThrough();
  assert.equal(result.baseEffects.length, crudePath.length);
  for (const row of result.baseEffects) {
    assert.ok(row.gasolineYoY < 0, `${row.month} should be negative y/y`);
    assert.ok(row.headlineYoYShiftFromJune < -0.8);
  }
  // Spring 2027 laps the $103-117 months, the deepest part of the base.
  const may = result.baseEffects.find((row) => row.month === '2027-05');
  assert.ok(may);
  assert.ok(may.gasolineYoY < -12);
  const worst = Math.min(
    ...result.baseEffects.map((row) => row.headlineYoYShiftFromJune),
  );
  assert.ok(worst < -1.2);
});

test('the pass-through step is asymmetric in the right direction', () => {
  // Pump below the crude-implied level closes fast; above it, slowly.
  const below = stepRetailGasoline(3.0, 80, 80);
  const above = stepRetailGasoline(4.5, 80, 80);
  const target = crudeImpliedRetail(80);
  assert.ok(below.retail - 3.0 > 0);
  assert.ok(above.retail - 4.5 < 0);
  const belowShare = (below.retail - 3.0) / (target - 3.0);
  const aboveShare = (above.retail - 4.5) / (target - 4.5);
  assert.ok(belowShare > 2 * aboveShare);
  assert.equal(gasolinePassThrough.alphaUp > gasolinePassThrough.alphaDown, true);
});

test('the deployment run rate reconciles with the published total', () => {
  const result = evaluateGuardDeployment();
  assert.ok(result.remainingCost > dcGuardDeployment.pogoTotalLow);
  assert.ok(result.remainingCost < dcGuardDeployment.pogoTotalHigh);
  assert.ok(result.annualCost > 1e9 && result.annualCost < 1.2e9);
});

test('no attainable property-crime effect can justify the bill', () => {
  const result = evaluateGuardDeployment();
  assert.ok(result.initialV1.propertyOffencesAverted > 6_000);
  assert.ok(result.revisedV2.propertyBenefit > 0);
  assert.ok(result.revisedV2.benefitCostRatio < 0.05);
  // Break-even needs multiples of the District's entire annual property-crime
  // count, so the ceiling binds before the effect size does.
  assert.ok(result.revisedV2.breakEvenPropertyMultipleOfStock > 5);
  assert.ok(
    result.revisedV2.breakEvenPropertyOffences >
      dcGuardDeployment.annualPropertyOffences,
  );
  // Break-even on homicide alone needs most of every killing in the city.
  assert.ok(result.revisedV2.breakEvenHomicideShare > 0.5);
  assert.ok(result.revisedV2.breakEvenHomicideShare < 1);
});

test('the police comparison is scale-invariant and mostly unavailable', () => {
  const result = evaluateGuardDeployment();
  const opp = result.opportunityCost;
  assert.ok(opp.benefitCostRatioPerDollar > 1);
  assert.ok(
    opp.benefitCostRatioPerDollar > 10 * result.revisedV2.benefitCostRatio,
  );
  // The headline "double the police force" version is out of sample.
  assert.equal(opp.unconstrainedOutOfSample, true);
  assert.ok(opp.unconstrainedForceIncrease > 1.5);
  // What the hiring constraint changes is scale, not return.
  assert.ok(opp.constrainedForceIncrease < 0.25);
  assert.ok(opp.constrainedSpendShare < 0.05);
  assert.ok(opp.unallocatedRemainder > 2e9);
  assert.ok(
    Math.abs(
      opp.constrainedBenefit / (opp.constrainedOfficers * dcGuardDeployment.officerAnnualCost) -
        opp.benefitCostRatioPerDollar,
    ) < 1e-9,
  );
});

test('the homicide valuation is the parameter that moves the police comparison', () => {
  const result = evaluateGuardDeployment();
  const ratios = result.homicideValueSensitivity.map(
    (row) => row.constrainedBenefitCostRatio,
  );
  assert.ok(Math.max(...ratios) / Math.min(...ratios) > 2);
  // Even at the low valuation the deployment's own ratio is far worse.
  assert.ok(Math.min(...ratios) > 10 * result.revisedV2.benefitCostRatio);
  // Break-even homicides fall as the valuation rises.
  for (let i = 1; i < result.homicideValueSensitivity.length; i += 1) {
    assert.ok(
      result.homicideValueSensitivity[i].breakEvenHomicides <
        result.homicideValueSensitivity[i - 1].breakEvenHomicides,
    );
  }
});

test('the CPI case carries the figures the forecast will be judged against', () => {
  assert.equal(julyCpiCase.consensusHeadline, 0.2);
  assert.equal(julyCpiCase.consensusHeadlineYoY, 3.4);
  assert.equal(julyCpiCase.juneHeadline, -0.4);
  assert.ok(julyCpiCase.coreNowcastLow < julyCpiCase.coreNowcastHigh);
});

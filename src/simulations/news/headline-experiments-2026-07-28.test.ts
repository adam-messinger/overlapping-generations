import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateGermanySickNotes,
  evaluateNvidiaVendorFinancing,
  evaluateSpainLabourMarket,
} from './headline-experiments-2026-07-28.js';

test('Spain raw rate change reconciles and survives in weaker adjusted form', () => {
  const result = evaluateSpainLabourMarket();
  const decomposedChange =
    result.initialV1.employmentContributionPctPoints +
    result.initialV1.labourForceContributionPctPoints;

  assert.ok(
    Math.abs(
      decomposedChange -
      result.initialV1.rawRateChangePctPoints,
    ) < 1e-10,
  );
  assert.equal(result.initialV1.isLabourForceExitStory, false);
  assert.ok(result.initialV1.rawRateChangePctPoints < -0.95);
  assert.ok(
    result.revisedV2.impliedSeasonallyAdjustedRateChangePctPoints <
      0,
  );
  assert.ok(
    result.revisedV2.rawRateDeclineRetainedAfterAdjustment > 0 &&
      result.revisedV2.rawRateDeclineRetainedAfterAdjustment < 0.15,
  );
  assert.ok(result.revisedV2.annualRateChangePctPoints < -0.4);
});

test('Nvidia face-value shortcut overstates direct expected credit loss', () => {
  const result = evaluateNvidiaVendorFinancing();

  assert.equal(
    result.initialV1.grossFaceValueToObservedEquityLoss,
    1,
  );
  assert.ok(
    result.revisedV2.centralExpectedLoss
      .expectedLossShareOfObservedEquityLoss < 0.10,
  );
  assert.ok(
    result.revisedV2.stressExpectedLoss
      .expectedLossShareOfObservedEquityLoss < 0.40,
  );
  assert.ok(
    result.revisedV2.stressExpectedLoss
      .presentValueExpectedLossBillion >
      result.revisedV2.centralExpectedLoss
        .presentValueExpectedLossBillion,
  );
});

test('existing AI capital paths preserve the financing fork', () => {
  const result = evaluateNvidiaVendorFinancing();
  const byScenario = Object.fromEntries(
    result.revisedV2.customerCapitalCycle.map((row) => [
      row.scenario,
      row,
    ]),
  );

  assert.ok(
    (byScenario['slow-monetization']?.peakFundingNeedBillion ?? 0) >
      (byScenario.central?.peakFundingNeedBillion ?? Infinity),
  );
  assert.ok(
    (byScenario.central?.peakFundingNeedBillion ?? 0) >
      (byScenario['fast-monetization']?.peakFundingNeedBillion ??
        Infinity),
  );
  assert.ok(
    (byScenario.central?.guaranteeShareOfPeakFundingNeed ?? 1) <
      0.15,
  );
});

test('Germany policy result changes sign across exposed assumptions', () => {
  const result = evaluateGermanySickNotes();
  const byScenario = Object.fromEntries(
    result.revisedV2.scenarios.map((row) => [row.id, row]),
  );

  assert.ok(result.initialV1.effectiveLabourChange > 0.006);
  assert.ok(
    (byScenario.cautious?.effectiveLabourChange ?? 0) < 0,
  );
  assert.ok(
    Math.abs(
      byScenario['break-even']?.effectiveLabourChange ?? 1,
    ) < 0.00001,
  );
  assert.ok(
    (byScenario.optimistic?.effectiveLabourChange ?? 0) > 0.0025,
  );
  assert.ok(
    result.revisedV2.breakEvenBehaviouralShare > 0.25 &&
      result.revisedV2.breakEvenBehaviouralShare < 0.26,
  );
});

test('daily experiments reject invalid inputs', () => {
  assert.throws(
    () =>
      evaluateSpainLabourMarket({
        previousEmploymentThousand: 1,
        previousUnemploymentThousand: 1,
        currentEmploymentThousand: 1,
        currentUnemploymentThousand: 1,
        currentLabourForceThousand: 3,
        seasonallyAdjustedEmploymentGrowth: 0,
        seasonallyAdjustedUnemploymentGrowth: 0,
        annualEmploymentChangeThousand: 0,
        annualUnemploymentChangeThousand: 0,
        servicesEmploymentChangeThousand: 0,
      }),
    /Invalid Spain labour-market stocks/,
  );
  assert.throws(
    () =>
      evaluateNvidiaVendorFinancing({
        ...evaluateNvidiaVendorFinancing().case,
        lossGivenDefault: 0,
      }),
    /Invalid Nvidia vendor-financing case/,
  );
  assert.throws(
    () =>
      evaluateGermanySickNotes({
        ...evaluateGermanySickNotes().case,
        workingDaysPerYear: 400,
      }),
    /Invalid Germany sick-note case/,
  );
});

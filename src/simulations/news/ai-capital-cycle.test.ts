import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aiCapitalCycleScenarios,
  simulateAiCapitalCycleV1,
  simulateAiCapitalCycleV2,
} from './ai-capital-cycle.js';

test('the headline depreciation test clears while the economic test does not', () => {
  const scenario = aiCapitalCycleScenarios.central;
  const v1 = simulateAiCapitalCycleV1(scenario);
  const v2 = simulateAiCapitalCycleV2(scenario);
  const first = v2.quarters[0];

  assert.equal(v1.clearsDepreciationBar, true);
  assert.ok(v1.revenueDepreciationCoverage > 1);
  assert.ok((first?.economicReplacementCoverage ?? 1) < 1);
  assert.ok((first?.freeCashFlowBillion ?? 0) < 0);
});

test('new capex cohorts raise depreciation before central revenue catches up', () => {
  const result = simulateAiCapitalCycleV2(aiCapitalCycleScenarios.central);
  const peakDepreciation = Math.max(
    ...result.quarters.map((row) => row.depreciationBillion),
  );

  assert.ok(
    peakDepreciation >
      aiCapitalCycleScenarios.central.startingQuarterlyAiDepreciationBillion * 4,
  );
  assert.equal(result.firstEconomicReplacementQuarter, '2032Q3');
  assert.equal(result.firstTotalCapexSelfFundingQuarter, '2032Q4');
  assert.ok(result.peakCumulativeFundingNeedBillion > 1_500);
  assert.ok(result.endingCapexReplacementCoverage > 0.95);
});

test('monetization assumptions create a wide financing fork', () => {
  const fast = simulateAiCapitalCycleV2(
    aiCapitalCycleScenarios['fast-monetization'],
  );
  const slow = simulateAiCapitalCycleV2(
    aiCapitalCycleScenarios['slow-monetization'],
  );

  assert.ok(fast.firstEconomicReplacementQuarter !== null);
  assert.equal(slow.firstEconomicReplacementQuarter, null);
  assert.ok(
    slow.peakCumulativeFundingNeedBillion >
      fast.peakCumulativeFundingNeedBillion * 3,
  );
  assert.ok(slow.endingDebtBalanceBillion > fast.endingDebtBalanceBillion);
});


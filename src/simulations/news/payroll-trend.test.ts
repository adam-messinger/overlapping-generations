import assert from 'node:assert/strict';
import test from 'node:test';

import {
  backtestPayrollTrend,
  defaultPayrollFilterParams,
  fitLocalLevel,
  payrollMonthIndex as ix,
  payrollTrendAt,
  revisionStats,
  visibleVintage,
} from './payroll-trend.js';
import { PAYROLL_VINTAGES } from './payroll-vintages.js';

test('vintages: one row per month through October 2026, with the lapse gaps', () => {
  assert.equal(PAYROLL_VINTAGES.length, ix(2026, 10) + 1);
  // October 2025 never had a first print; September 2025 never had a second.
  assert.equal(PAYROLL_VINTAGES[ix(2025, 10)]![0], null);
  assert.equal(PAYROLL_VINTAGES[ix(2025, 9)]![1], null);
  // A release shows the latest month at its first print, the one before at its second.
  assert.deepEqual(visibleVintage(ix(2026, 8), ix(2026, 8)), { vintage: 0, value: 162 });
  assert.deepEqual(visibleVintage(ix(2026, 8), ix(2026, 10)), { vintage: 2, value: 186 });
  assert.deepEqual(visibleVintage(ix(2026, 9), ix(2026, 10)), { vintage: 1, value: 60 });
});

test('the defaults are the maximum-likelihood fit on pre-backtest third estimates', () => {
  const fit = fitLocalLevel(ix(2025, 12));
  assert.equal(fit.trendInnovationSd, defaultPayrollFilterParams.trendInnovationSd);
  assert.equal(fit.thirdEstimateNoiseSd, defaultPayrollFilterParams.thirdEstimateNoiseSd);
});

test('revisions are biased down over 2022–2026, and noisy', () => {
  const r = revisionStats(ix(2026, 10));
  assert.ok(r.firstToThirdMean < -15);
  assert.ok(r.firstToThirdSd > 40 && r.firstToThirdSd < 60);
  assert.ok(r.secondToThirdSd < r.firstToThirdSd);
});

test('the September method is reproduced, and the filter changes the October read', () => {
  const sep = payrollTrendAt(ix(2026, 8));
  // 6 September: (31 + 21 + 162) / 3 = 71k from the prints visible then.
  assert.ok(Math.abs(sep.naiveThreeMonth - 71.3) < 0.1);
  const now = payrollTrendAt(ix(2026, 10));
  assert.ok(Math.abs(now.naiveThreeMonth - 137) < 0.1);
  // Filtered, the October trend sits near the top of the 30–90k breakeven range,
  // not 47k above it.
  assert.ok(now.trend > 75 && now.trend < 110, `trend ${now.trend.toFixed(1)}`);
  assert.ok(now.probabilityAbove(90) > 0.35 && now.probabilityAbove(90) < 0.7);
});

test('real-time backtest: the bias-corrected filter beats the three-month average', () => {
  const b = backtestPayrollTrend(ix(2024, 1), ix(2026, 8));
  assert.equal(b.releases, 32);
  for (const target of [b.smoothedTarget, b.centredTarget]) {
    assert.ok(target.filterRmse < target.naiveRmse);
    assert.ok(Math.abs(target.filterMeanError) < Math.abs(target.naiveMeanError) * 0.7);
  }
  // Against the model-free target, smoothing alone does not beat the naive read:
  // the gain comes from the revision-bias correction.
  assert.ok(b.centredTarget.noBiasRmse >= b.centredTarget.naiveRmse - 1);
});

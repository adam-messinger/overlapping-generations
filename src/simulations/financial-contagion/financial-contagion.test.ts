import assert from 'node:assert/strict';
import test from 'node:test';

import { auditUkLdiBackcast } from './calibration.js';
import {
  contagionPolicies,
  leveragedFunds2026,
  sovereignMarkets2026,
  sovereignShockScenarios,
} from './data.js';
import { simulateFinancialContagion } from './model.js';

test('feedback revision reproduces UK LDI forced sales and yield peak', () => {
  const audit = auditUkLdiBackcast();
  assert.ok(audit.v1ForcedSalesBillion < 2);
  assert.ok(Math.abs(audit.v2ForcedSalesBillion - audit.observedForcedSalesBillion) < 0.01);
  assert.ok(Math.abs(audit.v2PeakYieldShockBps - audit.observedPeakYieldShockBps) < 0.02);
  assert.ok(audit.feedbackLoopGain > 0.95);
});

test('post-reform duration funds do not sell into a 100bp UK shock', () => {
  const result = simulateFinancialContagion(
    sovereignShockScenarios['uk-100bp'],
    contagionPolicies.current,
    sovereignMarkets2026,
    leveragedFunds2026,
  );
  const durationFund = result.funds.find((fund) => fund.fund === 'pension-insurer-duration')!;
  assert.equal(durationFund.forcedSalesBillion, 0);
});

test('global relative-value funds transmit a UK shock across sovereign markets', () => {
  const result = simulateFinancialContagion(
    sovereignShockScenarios['uk-100bp'],
    contagionPolicies.current,
    sovereignMarkets2026,
    leveragedFunds2026,
  );
  assert.ok(result.crossMarketSpilloverBps > 0);
  assert.ok(result.markets.find((market) => market.market === 'treasury')!.amplifiedShockBps > 0);
  assert.ok(result.markets.find((market) => market.market === 'jgb')!.amplifiedShockBps > 0);
});

test('ex ante safeguards reduce forced sales and amplification', () => {
  const shock = sovereignShockScenarios['global-200bp'];
  const current = simulateFinancialContagion(
    shock,
    contagionPolicies.current,
    sovereignMarkets2026,
    leveragedFunds2026,
  );
  const safe = simulateFinancialContagion(
    shock,
    contagionPolicies.safeguards,
    sovereignMarkets2026,
    leveragedFunds2026,
  );
  assert.ok(safe.totalForcedSalesBillion < current.totalForcedSalesBillion);
  const currentAmplification = current.markets.reduce((sum, row) => sum + row.amplificationBps, 0);
  const safeAmplification = safe.markets.reduce((sum, row) => sum + row.amplificationBps, 0);
  assert.ok(safeAmplification < currentAmplification);
  assert.equal(current.liquidationCapacityExhausted, true);
  assert.equal(safe.liquidationCapacityExhausted, false);
});

test('targeted backstops reduce price amplification but not the need to deleverage', () => {
  const shock = sovereignShockScenarios['global-200bp'];
  const current = simulateFinancialContagion(
    shock,
    contagionPolicies.current,
    sovereignMarkets2026,
    leveragedFunds2026,
  );
  const backstop = simulateFinancialContagion(
    shock,
    contagionPolicies.backstop,
    sovereignMarkets2026,
    leveragedFunds2026,
  );
  const currentAmplification = current.markets.reduce((sum, row) => sum + row.amplificationBps, 0);
  const backstopAmplification = backstop.markets.reduce((sum, row) => sum + row.amplificationBps, 0);
  assert.ok(backstopAmplification < currentAmplification);
  assert.ok(backstop.totalForcedSalesBillion > 0);
});

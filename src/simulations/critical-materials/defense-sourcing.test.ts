import assert from 'node:assert/strict';
import test from 'node:test';

import { simulateDefenseSourcing } from './defense-sourcing.js';

test('continued waivers bridge the qualification pipeline', () => {
  const result = simulateDefenseSourcing('continued-waivers');
  assert.equal(result.firstCurtailmentMonth, null);
  assert.ok(result.waiverSupplyMonths > 0);
  assert.equal(result.outputMonthsLost, 0);
});

test('abrupt cutoff creates a larger shortfall than a staged cutoff', () => {
  const abrupt = simulateDefenseSourcing('abrupt-cutoff');
  const staged = simulateDefenseSourcing('staged-cutoff');
  assert.ok(abrupt.outputMonthsLost > staged.outputMonthsLost);
  assert.ok(abrupt.minimumDefenseOutput < staged.minimumDefenseOutput);
});

test('a larger stockpile delays but does not cure a sustained qualification gap', () => {
  const abrupt = simulateDefenseSourcing('abrupt-cutoff');
  const stockpile = simulateDefenseSourcing('stockpile-only');
  assert.ok((stockpile.firstCurtailmentMonth ?? 0) > (abrupt.firstCurtailmentMonth ?? 0));
  assert.ok(stockpile.outputMonthsLost > 0);
  assert.ok(stockpile.outputMonthsLost < abrupt.outputMonthsLost);
});

test('accelerated qualification reduces output loss', () => {
  const abrupt = simulateDefenseSourcing('abrupt-cutoff');
  const accelerated = simulateDefenseSourcing('accelerated-qualification');
  assert.ok(accelerated.outputMonthsLost < abrupt.outputMonthsLost);
  assert.ok(accelerated.monthsBelow95Pct < abrupt.monthsBelow95Pct);
});

test('combined resilience avoids material curtailment in the central path', () => {
  const combined = simulateDefenseSourcing('combined-resilience');
  assert.ok(combined.minimumDefenseOutput >= 0.95);
  assert.ok(combined.outputMonthsLost < 0.25);
});

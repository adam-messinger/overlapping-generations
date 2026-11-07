/**
 * Every Scenario Completes
 *
 * Runs every scenarios/*.json to 2100 on the fast macro path and checks the
 * headline metrics are finite. scripts/baseline.ts (npm run regression)
 * covers only the canonical subset.
 */

import { STUDY_OPTIONS } from './ensemble-model.js';
import { listScenarios, getScenarioPath } from './scenario.js';
import { runWithScenario, type SimulationMetrics } from './simulation.js';
import { test, expect, printSummary } from './test-utils.js';

const names = await listScenarios();

test('scenarios/ is non-empty', () => {
  expect(names.length > 0).toBeTrue();
});

for (const name of names) {
  // test() is synchronous, so the run is awaited outside it
  let metrics: SimulationMetrics | undefined;
  let error: unknown;
  try {
    ({ result: { metrics } } = await runWithScenario(getScenarioPath(name), undefined, STUDY_OPTIONS));
  } catch (e) {
    error = e;
  }
  test(`scenario ${name} runs to completion with finite metrics`, () => {
    if (error) throw error;
    expect(metrics!.warming2100 ?? NaN).toBeBetween(-Number.MAX_VALUE, Number.MAX_VALUE);
    expect(metrics!.gdp2100 ?? NaN).toBeBetween(Number.MIN_VALUE, Number.MAX_VALUE);
  });
}

printSummary();

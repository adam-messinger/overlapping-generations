/**
 * Every Scenario Completes
 *
 * The regression baseline (scripts/baseline.ts) runs a handful of canonical
 * scenarios; this runs every file in scenarios/ to 2100 and checks it
 * finishes with finite headline metrics. debt-populism threw in energy for
 * months without anything noticing because it was in neither set.
 *
 * Runs the macro path with the engine checks off: what is under test is
 * that the model completes, and `diagnostics: false` is pinned bit-identical
 * on the macro path by simulation.test.ts.
 */

import { listScenarios, getScenarioPath } from './scenario.js';
import { runWithScenario } from './simulation.js';
import { test, expect, printSummary } from './test-utils.js';

const names = await listScenarios();

test('scenarios/ is non-empty', () => {
  expect(names.length > 0).toBeTrue();
});

const outcomes = new Map<string, { error?: Error; warming2100?: number; gdp2100?: number }>();
for (const name of names) {
  try {
    const { result } = await runWithScenario(getScenarioPath(name), undefined, {
      diagnostics: false,
      connectorValidation: 'off',
      paramLiveness: 'off',
    });
    const last = result.results[result.results.length - 1];
    outcomes.set(name, { warming2100: result.metrics.warming2100, gdp2100: last.gdp });
  } catch (error) {
    outcomes.set(name, { error: error as Error });
  }
}

for (const name of names) {
  test(`scenario ${name} runs to completion with finite metrics`, () => {
    const outcome = outcomes.get(name)!;
    if (outcome.error) throw new Error(`${name}: ${outcome.error.message}`);
    expect(Number.isFinite(outcome.warming2100)).toBeTrue();
    expect(Number.isFinite(outcome.gdp2100) && outcome.gdp2100! > 0).toBeTrue();
  });
}

printSummary();

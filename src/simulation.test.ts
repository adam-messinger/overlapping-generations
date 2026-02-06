/**
 * Simulation Integration Tests
 */

import { runSimulation } from './simulation.js';
import { scenarioToParams } from './scenario.js';
import { test, expect, printSummary } from './test-utils.js';

console.log('\n=== Simulation Integration Tests ===\n');

test('runSimulation respects startYear/endYear', () => {
  const result = runSimulation({ startYear: 2025, endYear: 2028 });
  expect(result.years[0]).toBe(2025);
  expect(result.years[result.years.length - 1]).toBe(2028);
  expect(result.years).toHaveLength(4);
  expect(result.results).toHaveLength(4);
});

test('scenarioToParams passes through startYear/endYear', () => {
  const params = scenarioToParams({
    name: 'Test Scenario',
    description: 'Start/end year passthrough',
    startYear: 2030,
    endYear: 2032,
  });

  expect(params.startYear).toBe(2030);
  expect(params.endYear).toBe(2032);
});

printSummary();

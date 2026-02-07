/**
 * Simulation Integration Tests
 */

import { runSimulation } from './simulation.js';
import { runAutowiredFull, runAutowiredSimulation } from './simulation-autowired.js';
import { scenarioToParams } from './scenario.js';
import { standardCollectors } from './standard-collectors.js';
import { resolveKey } from './framework/collectors.js';
import { describeOutputs } from './introspection.js';
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

// Cross-check: standardCollectors covers all toYearResults fields
test('standardCollectors covers all toYearResults fields', () => {
  const result = runAutowiredFull({ startYear: 2025, endYear: 2026 });
  const yearResultKeys = new Set(Object.keys(result.results[0]));
  const collectorKeys = new Set(
    standardCollectors.timeseries.map(d => resolveKey(d))
  );
  collectorKeys.add('year'); // framework field

  const missingFromCollectors = [...yearResultKeys].filter(k => !collectorKeys.has(k));
  const extraInCollectors = [...collectorKeys].filter(k => !yearResultKeys.has(k));

  if (missingFromCollectors.length > 0) {
    throw new Error(
      `YearResult fields missing from standardCollectors: ${missingFromCollectors.join(', ')}`
    );
  }
  if (extraInCollectors.length > 0) {
    throw new Error(
      `standardCollectors fields not in YearResult: ${extraInCollectors.join(', ')}`
    );
  }
});

// Cross-check: describeOutputs matches standardCollectors
test('describeOutputs keys match standardCollectors keys', () => {
  const outputSchema = describeOutputs();
  const outputKeys = new Set(Object.keys(outputSchema));
  const collectorKeys = new Set(
    standardCollectors.timeseries
      .filter(d => d.unit && d.description) // only entries with metadata
      .map(d => resolveKey(d))
  );
  collectorKeys.add('year'); // framework field

  const missingFromOutputs = [...collectorKeys].filter(k => !outputKeys.has(k));
  const extraInOutputs = [...outputKeys].filter(k => !collectorKeys.has(k));

  if (missingFromOutputs.length > 0) {
    throw new Error(
      `standardCollectors fields missing from describeOutputs: ${missingFromOutputs.join(', ')}`
    );
  }
  if (extraInOutputs.length > 0) {
    throw new Error(
      `describeOutputs fields not in standardCollectors: ${extraInOutputs.join(', ')}`
    );
  }
});

// trackReads integration: run real simulation and check for undeclared reads
test('no undeclared transform reads in real simulation', () => {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args.map(a => String(a)).join(' ');
    warnings.push(msg);
  };

  try {
    runAutowiredSimulation({ startYear: 2025, endYear: 2027 }, { trackReads: true });
    const trackWarnings = warnings.filter(w => w.includes('[autowire]') && w.includes('reads'));
    if (trackWarnings.length > 0) {
      throw new Error(
        `Undeclared transform reads detected:\n${trackWarnings.join('\n')}`
      );
    }
  } finally {
    console.warn = origWarn;
  }
});

printSummary();

/**
 * Simulation Integration Tests
 */

import { runSimulation } from './simulation.js';
import { runAutowiredFull, runAutowiredSimulation, ALL_MODULES } from './simulation-autowired.js';
import { buildOutputRegistry, resolveKey } from 'tsimulation';
import { scenarioToParams } from './scenario.js';
import { standardCollectors } from './standard-collectors.js';
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

test('2025 regional financing spreads reproduce the IEA-observed calibration', () => {
  // Total spread = static residual (energy defaults) + financingHomeBias ×
  // 2025 savings gap (capital outputs). The residuals were derived by hand
  // from the observed totals, so this pins the cross-module calibration:
  // changing capital's savings params or financingHomeBias without
  // re-deriving the residuals breaks this test rather than silently
  // decalibrating the spreads. See REGIONAL_FINANCING_SPREADS in energy.ts.
  const observed: Record<string, number> = {
    oecd: -0.010, china: -0.015, india: 0.020, latam: 0.030,
    seasia: 0.025, russia: 0.050, mena: 0.010, ssa: 0.060,
  };
  const result = runSimulation({ startYear: 2025, endYear: 2025 });
  const r = result.results[0];
  for (const [region, total] of Object.entries(observed)) {
    const actual = r.regionalWACC[region as keyof typeof r.regionalWACC] - r.effectiveWACC;
    expect(Math.abs(actual - total)).toBeLessThan(0.001);
  }
});

test('cohort accounts reconcile to the next-year macro stocks', () => {
  const result = runSimulation({ startYear: 2025, endYear: 2026 });
  const first = result.results[0];
  const second = result.results[1];
  expect(Object.keys(first.cohortAccounts).length).toBeGreaterThan(0);
  expect(first.cohortAssets).toBeCloseTo(second.capitalStock, 6);
});

test('cohort constraint assumptions do not feed back into the macro path', () => {
  const tight = runSimulation({
    startYear: 2025,
    endYear: 2030,
    generations: { borrowingLimitIncomeMultiple: 0 },
  });
  const loose = runSimulation({
    startYear: 2025,
    endYear: 2030,
    generations: { borrowingLimitIncomeMultiple: 20 },
  });
  const tightFinal = tight.results[tight.results.length - 1];
  const looseFinal = loose.results[loose.results.length - 1];
  expect(tightFinal.gdp).toBeCloseTo(looseFinal.gdp, 8);
  expect(tightFinal.capitalStock).toBeCloseTo(looseFinal.capitalStock, 8);
  expect(tightFinal.cohortBorrowingLimitGap).toBeGreaterThan(
    looseFinal.cohortBorrowingLimitGap,
  );
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

// Cross-check: every collector source is a real module output.
// Catches phantom outputs: collector entries whose source no module computes
// would silently collect undefined (and YearResult would report a constant).
test('standardCollectors sources exist in module outputs', () => {
  // Output name -> owning module, from the real wiring's module list
  const outputOwner = buildOutputRegistry(ALL_MODULES);

  const problems: string[] = [];
  for (const def of standardCollectors.timeseries) {
    if (def.transform) continue; // transform entries compute their own value
    const owner = outputOwner.get(def.source);
    if (!owner) {
      problems.push(`'${def.source}' is not produced by any module`);
    } else if (def.module && def.module !== owner) {
      problems.push(`'${def.source}' attributed to '${def.module}' but produced by '${owner}'`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`standardCollectors drift:\n${problems.join('\n')}`);
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

/**
 * Demographics Module Tests
 *
 * Tests for population projection, cohort aging, and education tracking.
 * Validates against Fernández-Villaverde calibration targets.
 */

import { demographicsModule, demographicsDefaults } from './demographics.js';
import { REGIONS } from '../framework/types.js';

// Simple test framework
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
    failed++;
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeCloseTo(expected: number, precision: number = 2) {
      const diff = Math.abs(actual - expected);
      const threshold = Math.pow(10, -precision);
      if (diff > threshold) {
        throw new Error(`Expected ~${expected}, got ${actual} (diff: ${diff.toFixed(4)})`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeBetween(min: number, max: number) {
      if (actual < min || actual > max) {
        throw new Error(`Expected ${actual} to be between ${min} and ${max}`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true, got ${actual}`);
      }
    },
    toBeFalse() {
      if (actual !== false) {
        throw new Error(`Expected false, got ${actual}`);
      }
    },
  };
}

// Helper to run simulation for N years
function runYears(years: number) {
  const params = demographicsModule.mergeParams({});
  let state = demographicsModule.init(params);
  let outputs: any;

  for (let i = 0; i < years; i++) {
    const result = demographicsModule.step(state, {}, params, 2025 + i, i);
    state = result.state;
    outputs = result.outputs;
  }

  return { state, outputs };
}

// Helper to find peak year
function findPeak(getData: (year: number) => number) {
  let peakYear = 2025;
  let peakValue = getData(2025);

  for (let year = 2026; year <= 2100; year++) {
    const value = getData(year);
    if (value > peakValue) {
      peakValue = value;
      peakYear = year;
    }
  }

  return { year: peakYear, value: peakValue };
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== Demographics Module Tests ===\n');

// --- Initialization ---

console.log('--- Initialization ---\n');

test('init returns state with all regions', () => {
  const state = demographicsModule.init(demographicsDefaults);
  for (const region of REGIONS) {
    expect(state.regions[region] !== undefined).toBeTrue();
  }
});

test('init sets correct 2025 population', () => {
  const state = demographicsModule.init(demographicsDefaults);
  const totalPop =
    state.regions.oecd.population +
    state.regions.china.population +
    state.regions.em.population +
    state.regions.row.population;

  expect(totalPop / 1e9).toBeCloseTo(8.3, 1);
});

test('init sets correct cohort structure', () => {
  const state = demographicsModule.init(demographicsDefaults);

  // Check that cohorts sum to population
  for (const region of REGIONS) {
    const r = state.regions[region];
    const cohortSum = r.young + r.working + r.old;
    expect(cohortSum / r.population).toBeCloseTo(1.0, 2);
  }
});

test('init sets education splits', () => {
  const state = demographicsModule.init(demographicsDefaults);

  // Check that working = workingCollege + workingNonCollege
  for (const region of REGIONS) {
    const r = state.regions[region];
    const eduSum = r.workingCollege + r.workingNonCollege;
    expect(eduSum / r.working).toBeCloseTo(1.0, 2);
  }
});

// --- Year 0 outputs ---

console.log('\n--- Year 0 Outputs ---\n');

test('step year 0 returns correct global population', () => {
  const { outputs } = runYears(1);
  expect(outputs.population / 1e9).toBeCloseTo(8.3, 1);
});

test('step year 0 returns correct dependency ratio', () => {
  const { outputs } = runYears(1);
  expect(outputs.dependency).toBeCloseTo(0.20, 1);
});

test('step year 0 returns correct college share', () => {
  const { outputs } = runYears(1);
  expect(outputs.collegeShare).toBeCloseTo(0.20, 1);
});

// --- Population Dynamics ---

console.log('\n--- Population Dynamics ---\n');

test('population grows initially', () => {
  const year1 = runYears(1).outputs.population;
  const year10 = runYears(10).outputs.population;

  expect(year10).toBeGreaterThan(year1);
});

test('China population declines from 2025', () => {
  const year1 = runYears(1).outputs.regionalPopulation.china;
  const year50 = runYears(50).outputs.regionalPopulation.china;

  expect(year50).toBeLessThan(year1);
});

test('dependency ratio increases over time', () => {
  const year1 = runYears(1).outputs.dependency;
  const year50 = runYears(50).outputs.dependency;

  expect(year50).toBeGreaterThan(year1);
});

test('college share increases over time', () => {
  const year1 = runYears(1).outputs.collegeShare;
  const year50 = runYears(50).outputs.collegeShare;

  expect(year50).toBeGreaterThan(year1);
});

// --- JFV Calibration Targets ---

console.log('\n--- JFV Calibration Targets ---\n');

test('global population peaks 2050-2070', () => {
  const params = demographicsModule.mergeParams({});
  let state = demographicsModule.init(params);
  const popByYear: Record<number, number> = {};

  for (let year = 2025; year <= 2100; year++) {
    const { state: newState, outputs } = demographicsModule.step(
      state, {}, params, year, year - 2025
    );
    state = newState;
    popByYear[year] = outputs.population;
  }

  const peak = findPeak((y) => popByYear[y] || 0);
  expect(peak.year).toBeBetween(2050, 2070);
});

test('peak population ~9.2B (JFV: ~9.5B)', () => {
  const params = demographicsModule.mergeParams({});
  let state = demographicsModule.init(params);
  let maxPop = 0;

  for (let year = 2025; year <= 2100; year++) {
    const { state: newState, outputs } = demographicsModule.step(
      state, {}, params, year, year - 2025
    );
    state = newState;
    maxPop = Math.max(maxPop, outputs.population);
  }

  expect(maxPop / 1e9).toBeBetween(9.0, 9.5);
});

test('2100 population 8-9B and declining', () => {
  const year75 = runYears(75).outputs.population;
  const year76 = runYears(76).outputs.population;

  expect(year76 / 1e9).toBeBetween(8.0, 9.0);
  expect(year76).toBeLessThan(year75); // Declining
});

test('China 2100 population ~0.7-0.8B (JFV: 50% decline)', () => {
  const year76 = runYears(76).outputs.regionalPopulation.china;
  expect(year76 / 1e9).toBeBetween(0.7, 0.85);
});

test('China decline 40-50%', () => {
  const year1 = runYears(1).outputs.regionalPopulation.china;
  const year76 = runYears(76).outputs.regionalPopulation.china;
  const decline = (year1 - year76) / year1;

  expect(decline).toBeBetween(0.40, 0.55);
});

test('dependency ratio 2075 ~44-46%', () => {
  const year51 = runYears(51).outputs.dependency;
  expect(year51).toBeBetween(0.44, 0.48);
});

test('college share 2050 ~32-36%', () => {
  const year26 = runYears(26).outputs.collegeShare;
  expect(year26).toBeBetween(0.32, 0.38);
});

// --- Regional Fertility ---

console.log('\n--- Regional Fertility ---\n');

test('China TFR 2025 ~1.05', () => {
  const { outputs } = runYears(1);
  expect(outputs.regionalFertility.china).toBeCloseTo(1.05, 1);
});

test('China TFR converges toward floor by 2100', () => {
  const { outputs } = runYears(76);
  // Floor is 0.8, should be close by 2100
  expect(outputs.regionalFertility.china).toBeBetween(0.80, 0.90);
});

test('ROW TFR declines from ~4.2', () => {
  const year1 = runYears(1).outputs.regionalFertility.row;
  const year50 = runYears(50).outputs.regionalFertility.row;

  expect(year1).toBeGreaterThan(3.5);
  expect(year50).toBeLessThan(year1);
});

test('all regions have declining fertility', () => {
  const year1 = runYears(1).outputs.regionalFertility;
  const year50 = runYears(50).outputs.regionalFertility;

  for (const region of REGIONS) {
    expect(year50[region]).toBeLessThan(year1[region]);
  }
});

// --- Validation ---

console.log('\n--- Validation ---\n');

test('validation passes for default params', () => {
  const result = demographicsModule.validate({});
  expect(result.valid).toBeTrue();
});

test('validation catches invalid fertility', () => {
  const result = demographicsModule.validate({
    regions: {
      ...demographicsDefaults.regions,
      china: {
        ...demographicsDefaults.regions.china,
        fertility: 10, // Way too high
      },
    },
  });
  expect(result.valid).toBeFalse();
});

test('validation catches cohorts not summing to 1', () => {
  const result = demographicsModule.validate({
    regions: {
      ...demographicsDefaults.regions,
      oecd: {
        ...demographicsDefaults.regions.oecd,
        young: 0.5,
        working: 0.5,
        old: 0.5, // Sums to 1.5
      },
    },
  });
  expect(result.valid).toBeFalse();
});

test('validation warns on very low fertility floor', () => {
  const result = demographicsModule.validate({
    regions: {
      ...demographicsDefaults.regions,
      china: {
        ...demographicsDefaults.regions.china,
        fertilityFloor: 0.4, // Very low
      },
    },
  });
  expect(result.valid).toBeTrue(); // Valid but warns
  expect(result.warnings.length).toBeGreaterThan(0);
});

// --- Edge Cases ---

console.log('\n--- Edge Cases ---\n');

test('effective workers includes wage premium', () => {
  const { outputs } = runYears(1);
  // Effective workers should be higher than raw working due to college premium
  expect(outputs.effectiveWorkers).toBeGreaterThan(outputs.working);
});

test('regional outputs provided for all regions', () => {
  const { outputs } = runYears(1);

  for (const region of REGIONS) {
    expect(outputs.regionalPopulation[region]).toBeGreaterThan(0);
    expect(outputs.regionalWorking[region]).toBeGreaterThan(0);
    expect(outputs.regionalDependency[region]).toBeGreaterThan(0);
    expect(outputs.regionalFertility[region]).toBeGreaterThan(0);
  }
});

test('module has correct metadata', () => {
  expect(demographicsModule.name).toBe('demographics');
  expect(demographicsModule.inputs.length).toBe(1); // temperature (lagged, for heat stress)
  expect(demographicsModule.outputs.length).toBeGreaterThan(0);
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n=== Summary ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}

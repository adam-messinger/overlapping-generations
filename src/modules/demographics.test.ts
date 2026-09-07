/**
 * Demographics Module Tests
 *
 * Tests for population projection, cohort aging, and education tracking.
 * Validates against Fernández-Villaverde calibration targets.
 */

import { demographicsModule, demographicsDefaults } from './demographics.js';
import { REGIONS } from '../domain-types.js';

import { test, expect, printSummary, sumRegional } from '../test-utils.js';

// Helper to run simulation for N years
function runYears(years: number) {
  const params = demographicsModule.mergeParams({});
  let state = demographicsModule.init(params);
  let outputs: any;

  for (let i = 0; i < years; i++) {
    const result = demographicsModule.step(state, { temperature: 1.2 }, params, 2025 + i, i);
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
  const totalPop = sumRegional(state.regions, r => r.population);

  expect(totalPop / 1e9).toBeCloseTo(8.2, 0);
});

test('init sets correct cohort structure', () => {
  const state = demographicsModule.init(demographicsDefaults);

  // Check that cohorts sum to population
  for (const region of REGIONS) {
    const r = state.regions[region];
    const cohortSum = r.ages.reduce((a: number, b: number) => a + b, 0);
    expect(cohortSum / r.population).toBeCloseTo(1.0, 2);
  }
});

test('init sets education splits', () => {
  const state = demographicsModule.init(demographicsDefaults);

  // College counts sit inside each age group, only at working age and above,
  // and tilt toward the younger workers.
  for (const region of REGIONS) {
    const r = state.regions[region];
    expect(r.ages).toHaveLength(21);
    expect(r.college).toHaveLength(21);
    for (let g = 0; g < 21; g++) {
      expect(r.college[g]).toBeLessThan(r.ages[g] + 1);
      if (g < 4) expect(r.college[g]).toBe(0);
    }
    // 20-24 carries a higher college share than the retired groups
    expect(r.college[4] / r.ages[4]).toBeGreaterThan(r.college[13] / r.ages[13]);
  }
});

// --- Year 0 outputs ---

console.log('\n--- Year 0 Outputs ---\n');

test('step year 0 returns correct global population', () => {
  const { outputs } = runYears(1);
  expect(outputs.population / 1e9).toBeCloseTo(8.2, 1);
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

console.log('\n--- UN WPP 2024 low variant tracking ---\n');

test('global population peaks in the 2040s-2050s (WPP low: 8.95B in 2052)', () => {
  const params = demographicsModule.mergeParams({});
  let state = demographicsModule.init(params);
  const popByYear: Record<number, number> = {};

  for (let year = 2025; year <= 2100; year++) {
    const { state: newState, outputs } = demographicsModule.step(
      state, { temperature: 1.2 }, params, year, year - 2025
    );
    state = newState;
    popByYear[year] = outputs.population;
  }

  const peak = findPeak((y) => popByYear[y] || 0);
  // WPP low peaks at 8.946B in 2052; the two-band cohort structure brings the
  // turn forward a few years because it cannot resolve the exact shape of the
  // 20-64 pyramid. Anything outside this window is a calibration regression.
  expect(peak.year).toBeBetween(2040, 2058);
});

test('peak population ~8.7B (WPP low: 8.95B)', () => {
  const params = demographicsModule.mergeParams({});
  let state = demographicsModule.init(params);
  let maxPop = 0;

  for (let year = 2025; year <= 2100; year++) {
    const { state: newState, outputs } = demographicsModule.step(
      state, { temperature: 1.2 }, params, year, year - 2025
    );
    state = newState;
    maxPop = Math.max(maxPop, outputs.population);
  }

  expect(maxPop / 1e9).toBeBetween(8.4, 9.1);
});

test('2100 population tracks WPP low (6.97B) and is declining', () => {
  const year75 = runYears(75).outputs.population;
  const year76 = runYears(76).outputs.population;

  expect(year76 / 1e9).toBeBetween(6.5, 7.4);
  expect(year76).toBeLessThan(year75); // Declining
});

// China is the worst-tracked region: WPP low takes it to 0.41B by 2100 (-72%)
// and two coarse working bands cannot follow a pyramid that inverted this hard,
// so the module lands near 0.64B (-56%). Pinned at what the module does, with
// the gap to WPP low recorded here rather than hidden.
test('China 2100 population ~0.50B (WPP low: 0.41B)', () => {
  const year76 = runYears(76).outputs.regionalPopulation.china;
  expect(year76 / 1e9).toBeBetween(0.44, 0.56);
});

test('China declines by about two thirds (WPP low: -72%)', () => {
  const year1 = runYears(1).outputs.regionalPopulation.china;
  const year76 = runYears(76).outputs.regionalPopulation.china;
  const decline = (year1 - year76) / year1;

  expect(decline).toBeBetween(0.60, 0.70);
});

test('dependency ratio 2075 ~44-46%', () => {
  const year51 = runYears(51).outputs.dependency;
  expect(year51).toBeBetween(0.44, 0.48);
});

// Not an external target: a self-consistency pin. Resolving the age structure
// raised it from ~34% to ~40%, because the least-educated oldest workers now
// retire on schedule instead of draining in proportion to their stock share,
// so the education transition runs at its true pace rather than a damped one.
test('college share 2050 ~40%', () => {
  const year26 = runYears(26).outputs.collegeShare;
  expect(year26).toBeBetween(0.36, 0.43);
});

// --- Regional Fertility ---

console.log('\n--- Regional Fertility ---\n');

test('China TFR 2025 matches WPP low (0.77)', () => {
  const { outputs } = runYears(1);
  expect(outputs.regionalFertility.china).toBeCloseTo(0.77, 1);
});

test('China TFR stays near its floor to 2100', () => {
  const { outputs } = runYears(76);
  // WPP low has China at 0.68 in 2050 recovering to 0.85 by 2100; the module's
  // monotone convergence takes the flat best fit through that U-shape.
  expect(outputs.regionalFertility.china).toBeBetween(0.73, 0.79);
});

test('SSA TFR declines from ~3.9 (WPP low 2025)', () => {
  const year1 = runYears(1).outputs.regionalFertility.ssa;
  const year50 = runYears(50).outputs.regionalFertility.ssa;

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
      'oecd-ex-us': {
        ...demographicsDefaults.regions['oecd-ex-us'],
        // Sums to 1.5, not 1.0
        ageDistribution: new Array(21).fill(1.5 / 21),
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
// EXOGENOUS POPULATION
// =============================================================================

console.log('\n--- Exogenous Population ---\n');

function runYearsWithParams(years: number, partial: Partial<import('./demographics.js').DemographicsParams>) {
  const params = demographicsModule.mergeParams(partial);
  let state = demographicsModule.init(params);
  let outputs: any;
  for (let i = 0; i < years; i++) {
    const result = demographicsModule.step(state, { temperature: 1.2 }, params, 2025 + i, i);
    state = result.state;
    outputs = result.outputs;
  }
  return { state, outputs };
}

test('absent exogenousPopulation has no effect', () => {
  const baseline = runYears(25);
  const withUndefined = runYearsWithParams(25, {});
  expect(withUndefined.outputs.population).toBe(baseline.outputs.population);
});

test('exact data point year hits target', () => {
  const target = 5e9;
  const { outputs } = runYearsWithParams(1, {
    exogenousPopulation: [{ year: 2025, total: target }],
  });
  expect(Math.abs(outputs.population - target)).toBeLessThan(1e6);
});

test('interpolation between data points', () => {
  const { outputs } = runYearsWithParams(6, {
    exogenousPopulation: [
      { year: 2025, total: 8e9 },
      { year: 2035, total: 10e9 },
    ],
  });
  // year=2030 (yearIndex=5) should be halfway between 8B and 10B = 9B
  expect(Math.abs(outputs.population - 9e9)).toBeLessThan(1e8);
});

test('age structure preserved after scaling', () => {
  // Run without exogenous to get baseline ratios
  const baseline = runYears(10);
  const baseYoungShare = baseline.outputs.regionalYoung['oecd-ex-us'] / baseline.outputs.regionalPopulation['oecd-ex-us'];

  // Run with exogenous population (doubled)
  const scaled = runYearsWithParams(10, {
    exogenousPopulation: [{ year: 2025, total: 16e9 }, { year: 2050, total: 20e9 }],
  });
  const scaledYoungShare = scaled.outputs.regionalYoung['oecd-ex-us'] / scaled.outputs.regionalPopulation['oecd-ex-us'];

  // Ratios should be the same (scaling is uniform)
  expect(Math.abs(scaledYoungShare - baseYoungShare)).toBeLessThan(0.01);
});

// =============================================================================
// MIGRATION CONSERVATION
// =============================================================================

console.log('\n--- Migration Conservation ---\n');

test('migration is pure redistribution: world population unchanged (1 step)', () => {
  // From identical initial state, the first aged year must produce exactly
  // the same world population with and without migration — net migration
  // sums to zero in a closed world (receiving inflows are scaled to the
  // emigration budget).
  const withMigration = runYears(2).outputs;
  const withoutMigration = runYearsWithParams(2, { migrationMultiplier: 0 }).outputs;
  const relDiff = Math.abs(withMigration.population - withoutMigration.population)
    / withoutMigration.population;
  expect(relDiff).toBeLessThan(1e-9);
});

test('migration composition effects stay small over 30 years', () => {
  // Multi-year totals can drift slightly because redistribution shifts
  // people between regions with different fertility/mortality — but pure
  // redistribution must not create or destroy population at scale.
  const withMigration = runYears(30).outputs;
  const withoutMigration = runYearsWithParams(30, { migrationMultiplier: 0 }).outputs;
  const relDiff = Math.abs(withMigration.population - withoutMigration.population)
    / withoutMigration.population;
  expect(relDiff).toBeLessThan(0.005);
});

test('migration moves population between regions', () => {
  const withMigration = runYears(20).outputs;
  const withoutMigration = runYearsWithParams(20, { migrationMultiplier: 0 }).outputs;
  // OECD ex-US is the largest receiving region — migration must raise its population
  expect(withMigration.regionalPopulation['oecd-ex-us'])
    .toBeGreaterThan(withoutMigration.regionalPopulation['oecd-ex-us']);
});

// --- Workforce entrants and education-split stocks ---

console.log('\n--- Workforce entrants ---\n');

test('workforce entrants are a fifth of the pre-step 15-19 group in every year', () => {
  const params = demographicsModule.mergeParams({});
  let state = demographicsModule.init(params);
  for (let i = 0; i < 5; i++) {
    const teens = Object.fromEntries(REGIONS.map(r => [r, state.regions[r].ages[3]]));
    const result = demographicsModule.step(state, { temperature: 1.2 }, params, 2025 + i, i);
    for (const region of REGIONS) {
      expect(result.outputs.regionalWorkforceEntrants[region]).toBeCloseTo(teens[region] / 5, 0);
    }
    state = result.state;
  }
});

test('entrant college share follows the enrollment projection and rises toward its target', () => {
  const first = runYears(1).outputs;
  const later = runYears(40).outputs;
  for (const region of REGIONS) {
    const share2025 = first.regionalEntrantCollegeShare[region];
    expect(share2025).toBeCloseTo(demographicsDefaults.education[region].enrollmentRate2025, 6);
    expect(later.regionalEntrantCollegeShare[region]).toBeGreaterThan(share2025);
    expect(later.regionalEntrantCollegeShare[region] <= demographicsDefaults.education[region].enrollmentTarget + 1e-9).toBeTrue();
  }
});

test('education-split working stocks reconcile to the regional working cohort', () => {
  for (const years of [1, 30]) {
    const { outputs } = runYears(years);
    for (const region of REGIONS) {
      const split = outputs.regionalWorkingCollege[region] + outputs.regionalWorkingNonCollege[region];
      expect(split).toBeCloseTo(outputs.regionalWorking[region], 0);
    }
  }
});

test('exogenous population scaling scales entrants and education-split stocks too', () => {
  const params = demographicsModule.mergeParams({
    exogenousPopulation: [{ year: 2025, total: 4e9 }, { year: 2100, total: 4e9 }],
  });
  const state = demographicsModule.init(params);
  const { outputs } = demographicsModule.step(state, { temperature: 1.2 }, params, 2025, 0);
  const totalWorking = REGIONS.reduce((sum, r) => sum + outputs.regionalWorking[r], 0);
  const totalSplit = REGIONS.reduce(
    (sum, r) => sum + outputs.regionalWorkingCollege[r] + outputs.regionalWorkingNonCollege[r], 0);
  expect(totalSplit).toBeCloseTo(totalWorking, 0);
  const totalTeens = REGIONS.reduce((sum, r) => sum + state.regions[r].ages[3], 0);
  const totalEntrants = REGIONS.reduce((sum, r) => sum + outputs.regionalWorkforceEntrants[r], 0);
  const scale = 4e9 / REGIONS.reduce((sum, r) => sum + state.regions[r].population, 0);
  expect(totalEntrants).toBeCloseTo((totalTeens / 5) * scale, 0);
});

test('working-age migration outputs sum to zero across regions and follow the 80/70 split', () => {
  for (const years of [1, 20]) {
    const { outputs } = runYears(years);
    let net = 0;
    for (const region of REGIONS) {
      const college = outputs.regionalWorkingMigrationCollege[region];
      const nonCollege = outputs.regionalWorkingMigrationNonCollege[region];
      net += college + nonCollege;
      if (Math.abs(nonCollege) > 0) expect(college / (college + nonCollege)).toBeCloseTo(0.70, 9);
    }
    expect(Math.abs(net) < 1).toBeTrue();
    expect(outputs.regionalWorkingMigrationCollege['oecd-ex-us']).toBeGreaterThan(0);
    expect(outputs.regionalWorkingMigrationCollege.india).toBeLessThan(0);
    expect(outputs.regionalWorkingMigrationCollege.china).toBeLessThan(0);
  }
});

// =============================================================================
// SUMMARY
// =============================================================================

printSummary();

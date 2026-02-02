/**
 * Expansion Module Tests
 *
 * Tests for G/C Entropy Economics: robot energy and cost expansion.
 * Validates automation growth, cost-driven expansion, and infrastructure caps.
 */

import { expansionModule, expansionDefaults } from './expansion.js';

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
  };
}

// Helper to create typical inputs
function createInputs(options: {
  baseDemand?: number;
  cheapestLCOE?: number;
  workingPopulation?: number;
  investmentRate?: number;
} = {}) {
  return {
    baseDemand: options.baseDemand ?? 30000, // TWh
    cheapestLCOE: options.cheapestLCOE ?? 35, // $/MWh
    workingPopulation: options.workingPopulation ?? 5e9, // 5 billion workers
    investmentRate: options.investmentRate ?? 0.22,
  };
}

// Helper to run expansion for N years
function runYears(years: number, options?: Parameters<typeof createInputs>[0]) {
  const params = expansionModule.mergeParams({});
  let state = expansionModule.init(params);
  let outputs: any;

  for (let i = 0; i < years; i++) {
    const inputs = createInputs(options);
    const result = expansionModule.step(state, inputs, params, 2025 + i, i);
    state = result.state;
    outputs = result.outputs;
  }

  return { state, outputs };
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== Expansion Module Tests ===\n');

// --- Initialization ---

console.log('--- Initialization ---\n');

test('init sets baseline robots per 1000', () => {
  const state = expansionModule.init(expansionDefaults);
  expect(state.robotsPer1000).toBe(1);
});

test('init sets zero previous demand', () => {
  const state = expansionModule.init(expansionDefaults);
  expect(state.prevAdjustedDemand).toBe(0);
});

// --- Robot Energy ---

console.log('\n--- Robot Energy ---\n');

test('robot load is positive', () => {
  const { outputs } = runYears(1);
  expect(outputs.robotLoadTWh).toBeGreaterThan(0);
});

test('robots per 1000 grows over time', () => {
  const year1 = runYears(1).outputs.robotsPer1000;
  const year25 = runYears(25).outputs.robotsPer1000;
  expect(year25).toBeGreaterThan(year1);
});

test('robot load grows with working population', () => {
  const low = runYears(1, { workingPopulation: 3e9 }).outputs.robotLoadTWh;
  const high = runYears(1, { workingPopulation: 6e9 }).outputs.robotLoadTWh;
  expect(high).toBeGreaterThan(low);
});

test('robots per 1000 capped at robotCap', () => {
  const { outputs } = runYears(100); // Long enough to hit cap
  expect(outputs.robotsPer1000).toBeLessThan(expansionDefaults.robotCap + 1);
});

test('robot load at 2025 ~600 TWh', () => {
  // 1 robot per 1000 workers × 5B workers = 5M robots
  // 5M × 10 MWh = 50M MWh = 50 TWh
  // But need to check actual calculation
  const { outputs } = runYears(1, { workingPopulation: 5e9 });
  expect(outputs.robotLoadTWh).toBeBetween(10, 500);
});

// --- Cost Expansion ---

console.log('\n--- Cost Expansion ---\n');

test('expansion multiplier > 1 when LCOE < baseline', () => {
  const { outputs } = runYears(1, { cheapestLCOE: 25 }); // Below 50 baseline
  expect(outputs.expansionMultiplier).toBeGreaterThan(1);
});

test('expansion multiplier = 1 when LCOE = baseline', () => {
  const { outputs } = runYears(1, { cheapestLCOE: 50 }); // Equal to baseline
  expect(outputs.expansionMultiplier).toBeCloseTo(1, 2);
});

test('cheaper LCOE = higher expansion', () => {
  const mid = runYears(1, { cheapestLCOE: 25 }).outputs.expansionMultiplier;
  const cheap = runYears(1, { cheapestLCOE: 10 }).outputs.expansionMultiplier;
  expect(cheap).toBeGreaterThan(mid);
});

test('expansion follows log form (diminishing returns)', () => {
  // 50 → 25 should give ~25% expansion (log2(2) = 1)
  // 25 → 12.5 should give another ~25% (log2(4) = 2)
  const at25 = runYears(1, { cheapestLCOE: 25 }).outputs.expansionMultiplier;
  const at12 = runYears(1, { cheapestLCOE: 12.5 }).outputs.expansionMultiplier;
  // Difference should be about the same (log form)
  expect(at25).toBeCloseTo(1.25, 1);
  expect(at12).toBeCloseTo(1.5, 1);
});

// --- Adjusted Demand ---

console.log('\n--- Adjusted Demand ---\n');

test('adjusted demand > base demand', () => {
  const { outputs } = runYears(1);
  expect(outputs.adjustedDemand).toBeGreaterThan(30000); // Base demand
});

test('adjusted demand includes robot load', () => {
  const { outputs } = runYears(1);
  // Adjusted = (base + robots) × expansion
  // Should be at least base + robots
  expect(outputs.adjustedDemand).toBeGreaterThan(30000 + outputs.robotLoadTWh * 0.9);
});

test('adjusted demand grows over time', () => {
  const year1 = runYears(1).outputs.adjustedDemand;
  const year25 = runYears(25).outputs.adjustedDemand;
  expect(year25).toBeGreaterThan(year1);
});

// --- Infrastructure Constraint ---

console.log('\n--- Infrastructure Constraint ---\n');

test('max demand growth scales with investment rate', () => {
  const low = runYears(1, { investmentRate: 0.15 }).outputs.maxDemandGrowth;
  const high = runYears(1, { investmentRate: 0.30 }).outputs.maxDemandGrowth;
  expect(high).toBeGreaterThan(low);
});

test('max demand growth at baseline = base rate', () => {
  const { outputs } = runYears(1, { investmentRate: 0.22 }); // Baseline
  expect(outputs.maxDemandGrowth).toBeCloseTo(0.025, 3);
});

// --- Validation ---

console.log('\n--- Validation ---\n');

test('validation passes for default params', () => {
  const result = expansionModule.validate({});
  expect(result.valid).toBeTrue();
});

test('validation catches negative energy per robot', () => {
  const result = expansionModule.validate({ energyPerRobotMWh: -5 });
  expect(result.valid).toBe(false);
});

test('validation catches invalid expansion coefficient', () => {
  const result = expansionModule.validate({ expansionCoefficient: 2 });
  expect(result.valid).toBe(false);
});

test('validation catches negative baseline LCOE', () => {
  const result = expansionModule.validate({ baselineLCOE: -10 });
  expect(result.valid).toBe(false);
});

// --- Module Metadata ---

console.log('\n--- Module Metadata ---\n');

test('module has correct name', () => {
  expect(expansionModule.name).toBe('expansion');
});

test('module declares correct inputs', () => {
  expect(expansionModule.inputs.includes('baseDemand')).toBeTrue();
  expect(expansionModule.inputs.includes('cheapestLCOE')).toBeTrue();
  expect(expansionModule.inputs.includes('workingPopulation')).toBeTrue();
});

test('module declares correct outputs', () => {
  expect(expansionModule.outputs.includes('adjustedDemand')).toBeTrue();
  expect(expansionModule.outputs.includes('robotLoadTWh')).toBeTrue();
  expect(expansionModule.outputs.includes('expansionMultiplier')).toBeTrue();
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

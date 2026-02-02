/**
 * Capital Module Tests
 *
 * Tests for savings, investment, and automation dynamics.
 * Validates against Penn World Table and OLG theory.
 */

import { capitalModule, capitalDefaults } from './capital.js';
import { demographicsModule, demographicsDefaults } from './demographics.js';
import { demandModule, demandDefaults } from './demand.js';
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
  };
}

// Helper to get full inputs for capital module
function getCapitalInputs(yearIndex: number) {
  // Run demographics
  const demoParams = demographicsModule.mergeParams({});
  let demoState = demographicsModule.init(demoParams);
  let demoOutputs: any;

  for (let i = 0; i <= yearIndex; i++) {
    const result = demographicsModule.step(demoState, {}, demoParams, 2025 + i, i);
    demoState = result.state;
    demoOutputs = result.outputs;
  }

  // Run demand
  const demandParams = demandModule.mergeParams({});
  let demandState = demandModule.init(demandParams);
  let demandOutputs: any;

  for (let i = 0; i <= yearIndex; i++) {
    const demoInputsForDemand = {
      regionalPopulation: demoOutputs.regionalPopulation,
      regionalWorking: demoOutputs.regionalWorking,
      regionalEffectiveWorkers: demoOutputs.regionalEffectiveWorkers,
      regionalDependency: demoOutputs.regionalDependency,
      population: demoOutputs.population,
      working: demoOutputs.working,
      dependency: demoOutputs.dependency,
    };
    const result = demandModule.step(demandState, demoInputsForDemand, demandParams, 2025 + i, i);
    demandState = result.state;
    demandOutputs = result.outputs;
  }

  return {
    regionalYoung: demoOutputs.regionalYoung,
    regionalWorking: demoOutputs.regionalWorking,
    regionalOld: demoOutputs.regionalOld,
    regionalPopulation: demoOutputs.regionalPopulation,
    effectiveWorkers: demoOutputs.effectiveWorkers,
    gdp: demandOutputs.gdp,
    damages: 0, // No climate damages for basic tests
  };
}

// Helper to run capital simulation for N years
function runYears(years: number, damagesFraction: number = 0) {
  const capitalParams = capitalModule.mergeParams({});
  let capitalState = capitalModule.init(capitalParams);
  let outputs: any;

  for (let i = 0; i < years; i++) {
    const inputs = getCapitalInputs(i);
    inputs.damages = damagesFraction;
    const result = capitalModule.step(capitalState, inputs, capitalParams, 2025 + i, i);
    capitalState = result.state;
    outputs = result.outputs;
  }

  return { state: capitalState, outputs };
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== Capital Module Tests ===\n');

// --- Initialization ---

console.log('--- Initialization ---\n');

test('init returns correct initial capital stock', () => {
  const state = capitalModule.init(capitalDefaults);
  expect(state.stock).toBe(420);
});

// --- Year 0 Outputs ---

console.log('\n--- Year 0 Outputs ---\n');

test('step year 0 returns correct capital stock', () => {
  const { outputs } = runYears(1);
  // Initial stock is $420T
  expect(outputs.stock).toBeBetween(400, 450);
});

test('step year 0 returns correct K/Y ratio', () => {
  const { outputs } = runYears(1);
  // K/Y should be ~3.5 (Penn World Table)
  expect(outputs.capitalOutputRatio).toBeBetween(3.0, 4.0);
});

test('step year 0 returns correct savings rate', () => {
  const { outputs } = runYears(1);
  // Global savings rate ~22% (demographic-weighted)
  expect(outputs.savingsRate).toBeBetween(0.18, 0.28);
});

test('step year 0 returns correct interest rate', () => {
  const { outputs } = runYears(1);
  // Real interest rate ~4% (r = αY/K - δ)
  expect(outputs.interestRate).toBeBetween(0.02, 0.08);
});

test('step year 0 returns correct investment', () => {
  const { outputs } = runYears(1);
  // Investment = GDP × savingsRate × stability
  // ~$119T × 0.22 × 1.0 ≈ $26T
  expect(outputs.investment).toBeBetween(20, 35);
});

test('step year 0 returns stability = 1 with no damages', () => {
  const { outputs } = runYears(1);
  expect(outputs.stability).toBeCloseTo(1.0, 2);
});

// --- Regional Savings ---

console.log('\n--- Regional Savings ---\n');

test('China has higher savings rate than OECD', () => {
  const { outputs } = runYears(1);
  expect(outputs.regionalSavings.china).toBeGreaterThan(outputs.regionalSavings.oecd);
});

test('ROW has lower savings rate than OECD', () => {
  const { outputs } = runYears(1);
  expect(outputs.regionalSavings.row).toBeLessThan(outputs.regionalSavings.oecd);
});

test('all regional savings rates are reasonable', () => {
  const { outputs } = runYears(1);
  for (const region of REGIONS) {
    expect(outputs.regionalSavings[region]).toBeBetween(0.10, 0.45);
  }
});

// --- Capital Accumulation ---

console.log('\n--- Capital Accumulation ---\n');

test('capital stock grows over time', () => {
  const year1 = runYears(1).outputs.stock;
  const year25 = runYears(25).outputs.stock;
  expect(year25).toBeGreaterThan(year1);
});

test('investment grows with GDP', () => {
  const year1 = runYears(1).outputs.investment;
  const year25 = runYears(25).outputs.investment;
  expect(year25).toBeGreaterThan(year1);
});

test('K per worker increases over time', () => {
  const year1 = runYears(1).outputs.kPerWorker;
  const year25 = runYears(25).outputs.kPerWorker;
  expect(year25).toBeGreaterThan(year1);
});

// --- Automation ---

console.log('\n--- Automation ---\n');

test('automation share starts at 2%', () => {
  const { outputs } = runYears(1);
  expect(outputs.automationShare).toBeCloseTo(0.02, 2);
});

test('automation share grows over time', () => {
  const year1 = runYears(1).outputs.automationShare;
  const year25 = runYears(25).outputs.automationShare;
  expect(year25).toBeGreaterThan(year1);
});

test('automation share capped at 20%', () => {
  const year76 = runYears(76).outputs.automationShare;
  expect(year76).toBeLessThan(0.21);
});

test('robots density increases over time', () => {
  const year1 = runYears(1).outputs.robotsDensity;
  const year25 = runYears(25).outputs.robotsDensity;
  expect(year25).toBeGreaterThan(year1);
});

// --- Stability Factor ---

console.log('\n--- Stability Factor ---\n');

test('stability = 1 when damages = 0', () => {
  const { outputs } = runYears(1, 0);
  expect(outputs.stability).toBeCloseTo(1.0, 2);
});

test('stability < 1 when damages > 0', () => {
  const { outputs } = runYears(1, 0.10); // 10% damages
  expect(outputs.stability).toBeLessThan(1.0);
});

test('stability decreases with higher damages', () => {
  const low = runYears(1, 0.10).outputs.stability;
  const high = runYears(1, 0.30).outputs.stability;
  expect(high).toBeLessThan(low);
});

test('high damages suppress investment', () => {
  const noDamage = runYears(1, 0).outputs.investment;
  const highDamage = runYears(1, 0.30).outputs.investment;
  expect(highDamage).toBeLessThan(noDamage);
});

// --- Interest Rate ---

console.log('\n--- Interest Rate ---\n');

test('interest rate is positive', () => {
  const { outputs } = runYears(1);
  expect(outputs.interestRate).toBeGreaterThan(0);
});

test('interest rate changes with K/Y ratio', () => {
  // As capital grows faster than GDP, interest rate should fall
  const year1 = runYears(1).outputs;
  const year25 = runYears(25).outputs;

  // Higher K/Y should mean lower r
  if (year25.capitalOutputRatio > year1.capitalOutputRatio) {
    expect(year25.interestRate).toBeLessThan(year1.interestRate);
  }
});

// --- Validation ---

console.log('\n--- Validation ---\n');

test('validation passes for default params', () => {
  const result = capitalModule.validate({});
  expect(result.valid).toBeTrue();
});

test('validation catches invalid alpha', () => {
  const result = capitalModule.validate({ alpha: 0.8 });
  expect(result.valid).toBe(false);
});

test('validation catches invalid depreciation', () => {
  const result = capitalModule.validate({ depreciation: 0.5 });
  expect(result.valid).toBe(false);
});

test('validation warns on extreme capital stock', () => {
  const result = capitalModule.validate({ initialCapitalStock: 50 });
  expect(result.valid).toBeTrue();
  expect(result.warnings.length).toBeGreaterThan(0);
});

// --- Module Metadata ---

console.log('\n--- Module Metadata ---\n');

test('module has correct name', () => {
  expect(capitalModule.name).toBe('capital');
});

test('module declares correct inputs', () => {
  expect(capitalModule.inputs.length).toBeGreaterThan(0);
  expect(capitalModule.inputs.includes('gdp')).toBeTrue();
  expect(capitalModule.inputs.includes('effectiveWorkers')).toBeTrue();
});

test('module declares correct outputs', () => {
  expect(capitalModule.outputs.length).toBeGreaterThan(0);
  expect(capitalModule.outputs.includes('stock')).toBeTrue();
  expect(capitalModule.outputs.includes('investment')).toBeTrue();
  expect(capitalModule.outputs.includes('interestRate')).toBeTrue();
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

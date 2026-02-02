/**
 * Energy Module Tests
 *
 * Tests for LCOE calculation, learning curves, and capacity state machine.
 * Validates Wright's Law, EROEI depletion, and investment constraints.
 */

import { energyModule, energyDefaults } from './energy.js';
import { ENERGY_SOURCES, EnergySource } from '../framework/types.js';

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

// Helper to create inputs
function createInputs(
  electricityDemand: number = 30000,
  availableInvestment: number = 25,
  stabilityFactor: number = 1.0
) {
  return { electricityDemand, availableInvestment, stabilityFactor };
}

// Helper to run simulation for N years
function runYears(years: number, params?: Partial<typeof energyDefaults>) {
  const energyParams = energyModule.mergeParams(params ?? {});
  let state = energyModule.init(energyParams);
  let outputs: any;

  for (let i = 0; i < years; i++) {
    const inputs = createInputs(30000 + i * 500, 25 + i * 0.5, 1.0);
    const result = energyModule.step(state, inputs, energyParams, 2025 + i, i);
    state = result.state;
    outputs = result.outputs;
  }

  return { state, outputs };
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== Energy Module Tests ===\n');

// --- Initialization ---

console.log('--- Initialization ---\n');

test('init returns state with all energy sources', () => {
  const state = energyModule.init(energyDefaults);
  for (const source of ENERGY_SOURCES) {
    expect(state.capacities[source] !== undefined).toBeTrue();
  }
});

test('init sets correct 2025 solar capacity', () => {
  const state = energyModule.init(energyDefaults);
  expect(state.capacities.solar.installed).toBe(1500);
});

test('init sets correct 2025 wind capacity', () => {
  const state = energyModule.init(energyDefaults);
  expect(state.capacities.wind.installed).toBe(1000);
});

test('init sets correct 2025 nuclear capacity', () => {
  const state = energyModule.init(energyDefaults);
  expect(state.capacities.nuclear.installed).toBe(400);
});

test('init sets cumulative equal to initial capacity', () => {
  const state = energyModule.init(energyDefaults);
  expect(state.capacities.solar.cumulative).toBe(state.capacities.solar.installed);
});

// --- Year 0 LCOE ---

console.log('\n--- Year 0 LCOE ---\n');

test('step year 0 returns solar LCOE ~$35/MWh', () => {
  const { outputs } = runYears(1);
  expect(outputs.lcoes.solar).toBeBetween(20, 50);
});

test('step year 0 returns wind LCOE ~$35/MWh', () => {
  const { outputs } = runYears(1);
  expect(outputs.lcoes.wind).toBeBetween(20, 50);
});

test('step year 0 returns gas LCOE with carbon cost', () => {
  const { outputs } = runYears(1);
  // Base ~$45 + carbon cost
  expect(outputs.lcoes.gas).toBeGreaterThan(45);
});

test('step year 0 returns coal LCOE with carbon cost', () => {
  const { outputs } = runYears(1);
  // Base ~$40 + high carbon cost
  expect(outputs.lcoes.coal).toBeGreaterThan(40);
});

test('coal LCOE higher than gas (more carbon intensive)', () => {
  const { outputs } = runYears(1);
  expect(outputs.lcoes.coal).toBeGreaterThan(outputs.lcoes.gas);
});

test('battery cost calculated correctly', () => {
  const { outputs } = runYears(1);
  expect(outputs.batteryCost).toBeBetween(50, 200);
});

// --- Learning Curves ---

console.log('\n--- Learning Curves ---\n');

test('solar LCOE declines over time (learning)', () => {
  const year1 = runYears(1).outputs.lcoes.solar;
  const year25 = runYears(25).outputs.lcoes.solar;
  expect(year25).toBeLessThan(year1);
});

test('wind LCOE declines over time (learning)', () => {
  const year1 = runYears(1).outputs.lcoes.wind;
  const year25 = runYears(25).outputs.lcoes.wind;
  expect(year25).toBeLessThan(year1);
});

test('battery cost declines over time (learning)', () => {
  const year1 = runYears(1).outputs.batteryCost;
  const year25 = runYears(25).outputs.batteryCost;
  expect(year25).toBeLessThan(year1);
});

test('nuclear LCOE stays constant (no learning)', () => {
  const year1 = runYears(1).outputs.lcoes.nuclear;
  const year25 = runYears(25).outputs.lcoes.nuclear;
  expect(year25).toBeCloseTo(year1, 0);
});

test('solar+battery LCOE declines over time', () => {
  const year1 = runYears(1).outputs.solarPlusBatteryLCOE;
  const year25 = runYears(25).outputs.solarPlusBatteryLCOE;
  expect(year25).toBeLessThan(year1);
});

// --- Capacity Growth ---

console.log('\n--- Capacity Growth ---\n');

test('solar capacity grows over time', () => {
  const year1 = runYears(1).outputs.capacities.solar;
  const year25 = runYears(25).outputs.capacities.solar;
  expect(year25).toBeGreaterThan(year1);
});

test('wind capacity grows over time', () => {
  const year1 = runYears(1).outputs.capacities.wind;
  const year25 = runYears(25).outputs.capacities.wind;
  expect(year25).toBeGreaterThan(year1);
});

test('coal capacity does not grow (no new additions)', () => {
  const year1 = runYears(1).outputs.additions.coal;
  expect(year1).toBe(0);
});

test('cumulative capacity only increases', () => {
  const year1 = runYears(1).outputs.cumulativeCapacity.solar;
  const year25 = runYears(25).outputs.cumulativeCapacity.solar;
  expect(year25).toBeGreaterThan(year1);
});

test('additions are positive for growing sources', () => {
  const { outputs } = runYears(5);
  expect(outputs.additions.solar).toBeGreaterThan(0);
  expect(outputs.additions.wind).toBeGreaterThan(0);
});

// --- Carbon Pricing ---

console.log('\n--- Carbon Pricing ---\n');

test('higher carbon price increases coal LCOE', () => {
  const low = runYears(1, { carbonPrice: 35 }).outputs.lcoes.coal;
  const high = runYears(1, { carbonPrice: 150 }).outputs.lcoes.coal;
  expect(high).toBeGreaterThan(low);
});

test('higher carbon price increases gas LCOE', () => {
  const low = runYears(1, { carbonPrice: 35 }).outputs.lcoes.gas;
  const high = runYears(1, { carbonPrice: 150 }).outputs.lcoes.gas;
  expect(high).toBeGreaterThan(low);
});

test('carbon price does not affect solar LCOE', () => {
  const low = runYears(1, { carbonPrice: 35 }).outputs.lcoes.solar;
  const high = runYears(1, { carbonPrice: 150 }).outputs.lcoes.solar;
  expect(high).toBeCloseTo(low, 1);
});

// --- Cheapest LCOE ---

console.log('\n--- Cheapest LCOE ---\n');

test('cheapest LCOE is reasonable', () => {
  const { outputs } = runYears(1);
  expect(outputs.cheapestLCOE).toBeBetween(10, 100);
});

test('cheapest LCOE declines over time', () => {
  const year1 = runYears(1).outputs.cheapestLCOE;
  const year25 = runYears(25).outputs.cheapestLCOE;
  expect(year25).toBeLessThan(year1);
});

// --- Stability Factor ---

console.log('\n--- Stability Factor ---\n');

test('lower stability reduces additions', () => {
  const params = energyModule.mergeParams({});
  let stateHigh = energyModule.init(params);
  let stateLow = energyModule.init(params);

  const inputsHigh = createInputs(30000, 25, 1.0);
  const inputsLow = createInputs(30000, 25, 0.5);

  const resultHigh = energyModule.step(stateHigh, inputsHigh, params, 2025, 0);
  const resultLow = energyModule.step(stateLow, inputsLow, params, 2025, 0);

  // Lower stability should result in lower or equal additions
  const totalHigh = ENERGY_SOURCES.reduce((sum, s) => sum + resultHigh.outputs.additions[s], 0);
  const totalLow = ENERGY_SOURCES.reduce((sum, s) => sum + resultLow.outputs.additions[s], 0);

  expect(totalLow).toBeLessThan(totalHigh + 1); // Allow small tolerance
});

// --- Validation ---

console.log('\n--- Validation ---\n');

test('validation passes for default params', () => {
  const result = energyModule.validate({});
  expect(result.valid).toBeTrue();
});

test('validation catches negative carbon price', () => {
  const result = energyModule.validate({ carbonPrice: -10 });
  expect(result.valid).toBe(false);
});

test('validation warns on very high carbon price', () => {
  const result = energyModule.validate({ carbonPrice: 600 });
  expect(result.valid).toBeTrue();
  expect(result.warnings.length).toBeGreaterThan(0);
});

test('validation catches invalid alpha', () => {
  const result = energyModule.validate({
    sources: {
      ...energyDefaults.sources,
      solar: { ...energyDefaults.sources.solar, alpha: 1.5 },
    },
  });
  expect(result.valid).toBe(false);
});

// --- Module Metadata ---

console.log('\n--- Module Metadata ---\n');

test('module has correct name', () => {
  expect(energyModule.name).toBe('energy');
});

test('module declares correct inputs', () => {
  expect(energyModule.inputs.length).toBeGreaterThan(0);
  expect(energyModule.inputs.includes('electricityDemand')).toBeTrue();
  expect(energyModule.inputs.includes('availableInvestment')).toBeTrue();
});

test('module declares correct outputs', () => {
  expect(energyModule.outputs.length).toBeGreaterThan(0);
  expect(energyModule.outputs.includes('lcoes')).toBeTrue();
  expect(energyModule.outputs.includes('capacities')).toBeTrue();
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

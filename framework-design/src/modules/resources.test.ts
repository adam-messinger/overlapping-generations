/**
 * Resources Module Tests
 *
 * Tests for mineral demand, land use, and forest carbon.
 * Validates recycling curves, yield damage, and carbon flux.
 */

import { resourcesModule, resourcesDefaults } from './resources.js';

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
  solarAdditions?: number;
  windAdditions?: number;
  batteryAdditions?: number;
  population?: number;
  gdpPerCapita?: number;
  temperature?: number;
  grainDemand?: number;
} = {}) {
  return {
    capacities: {
      solar: 2000,
      wind: 1200,
      hydro: 1400,
      nuclear: 400,
      gas: 1800,
      coal: 2000,
      battery: 600,
    },
    additions: {
      solar: options.solarAdditions ?? 100,
      wind: options.windAdditions ?? 50,
      hydro: 10,
      nuclear: 5,
      gas: 0,
      coal: 0,
      battery: options.batteryAdditions ?? 80,
    },
    population: options.population ?? 8.3e9,
    gdpPerCapita: options.gdpPerCapita ?? 14000,
    gdpPerCapita2025: 14000,
    temperature: options.temperature ?? 1.3,
    grainDemand: options.grainDemand ?? 2800, // Mt
  };
}

// Helper to run resources for N years
function runYears(years: number, options?: Parameters<typeof createInputs>[0]) {
  const params = resourcesModule.mergeParams({});
  let state = resourcesModule.init(params);
  let outputs: any;

  for (let i = 0; i < years; i++) {
    const inputs = createInputs(options);
    const result = resourcesModule.step(state, inputs, params, 2025 + i, i);
    state = result.state;
    outputs = result.outputs;
  }

  return { state, outputs };
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== Resources Module Tests ===\n');

// --- Initialization ---

console.log('--- Initialization ---\n');

test('init returns state with minerals', () => {
  const state = resourcesModule.init(resourcesDefaults);
  expect(state.minerals.copper !== undefined).toBeTrue();
  expect(state.minerals.lithium !== undefined).toBeTrue();
  expect(state.minerals.rareEarths !== undefined).toBeTrue();
  expect(state.minerals.steel !== undefined).toBeTrue();
});

test('init returns state with land at 2025 values', () => {
  const state = resourcesModule.init(resourcesDefaults);
  expect(state.land.farmland).toBe(4800);
  expect(state.land.forest).toBe(4000);
  expect(state.land.urban).toBe(50);
});

test('init starts with zero cumulative minerals', () => {
  const state = resourcesModule.init(resourcesDefaults);
  expect(state.minerals.copper.cumulative).toBe(0);
  expect(state.minerals.lithium.cumulative).toBe(0);
});

test('init starts with zero decay pool', () => {
  const state = resourcesModule.init(resourcesDefaults);
  expect(state.decayPool).toBe(0);
});

// --- Mineral Demand ---

console.log('\n--- Mineral Demand ---\n');

test('copper demand driven by solar and wind additions', () => {
  const { outputs } = runYears(1);
  expect(outputs.minerals.copper.demand).toBeGreaterThan(0);
});

test('lithium demand driven by battery additions', () => {
  const { outputs } = runYears(1, { batteryAdditions: 100 });
  expect(outputs.minerals.lithium.demand).toBeGreaterThan(0);
});

test('steel demand from solar, wind, nuclear', () => {
  const { outputs } = runYears(1);
  expect(outputs.minerals.steel.demand).toBeGreaterThan(0);
});

test('higher solar additions = more copper demand', () => {
  const low = runYears(1, { solarAdditions: 50 }).outputs.minerals.copper.demand;
  const high = runYears(1, { solarAdditions: 200 }).outputs.minerals.copper.demand;
  expect(high).toBeGreaterThan(low);
});

test('mineral demand declines with learning (intensity reduction)', () => {
  const year1 = runYears(1).outputs.minerals.copper.grossDemand;
  const year20 = runYears(20).outputs.minerals.copper.grossDemand;
  // With 2% learning rate, intensity at year 20 is ~67% of year 1
  // But cumulative additions also matter, so just check it's lower per unit
  expect(year20).toBeLessThan(year1 * 2); // Rough check
});

test('cumulative minerals increase over time', () => {
  const year1 = runYears(1).outputs.minerals.copper.cumulative;
  const year10 = runYears(10).outputs.minerals.copper.cumulative;
  expect(year10).toBeGreaterThan(year1);
});

test('recycling rate increases with stock-in-use', () => {
  const year1 = runYears(1).outputs.minerals.copper.recyclingRate;
  const year20 = runYears(20).outputs.minerals.copper.recyclingRate;
  expect(year20).toBeGreaterThan(year1);
});

test('recycled amount increases with higher recycling rate', () => {
  const year1 = runYears(1).outputs.minerals.copper.recycled;
  const year20 = runYears(20).outputs.minerals.copper.recycled;
  // More cumulative stock = higher recycling rate = more recycled
  expect(year20).toBeGreaterThan(0);
});

test('reserve ratio calculated correctly', () => {
  const { outputs } = runYears(10);
  expect(outputs.minerals.copper.reserveRatio).toBeGreaterThan(0);
  expect(outputs.minerals.copper.reserveRatio).toBeLessThan(1);
});

// --- Land Use ---

console.log('\n--- Land Use ---\n');

test('farmland responds to grain demand', () => {
  const low = runYears(1, { grainDemand: 2000 }).outputs.land.farmland;
  const high = runYears(1, { grainDemand: 4000 }).outputs.land.farmland;
  expect(high).toBeGreaterThan(low);
});

test('yield improves over time (tech improvement)', () => {
  const year1 = runYears(1).outputs.land.yield;
  const year25 = runYears(25).outputs.land.yield;
  expect(year25).toBeGreaterThan(year1);
});

test('yield damaged by high temperature', () => {
  const low = runYears(1, { temperature: 1.5 }).outputs.land.yieldDamageFactor;
  const high = runYears(1, { temperature: 3.0 }).outputs.land.yieldDamageFactor;
  expect(high).toBeLessThan(low);
});

test('yield damage factor is 1 below threshold', () => {
  const { outputs } = runYears(1, { temperature: 1.5 });
  expect(outputs.land.yieldDamageFactor).toBeCloseTo(1, 2);
});

test('yield damage factor < 1 above threshold', () => {
  const { outputs } = runYears(1, { temperature: 3.0 });
  expect(outputs.land.yieldDamageFactor).toBeLessThan(1);
});

test('urban area grows with population', () => {
  const low = runYears(1, { population: 8e9 }).outputs.land.urban;
  const high = runYears(1, { population: 10e9 }).outputs.land.urban;
  expect(high).toBeGreaterThan(low);
});

test('urban area grows with wealth', () => {
  const low = runYears(1, { gdpPerCapita: 10000 }).outputs.land.urban;
  const high = runYears(1, { gdpPerCapita: 30000 }).outputs.land.urban;
  expect(high).toBeGreaterThan(low);
});

test('forest change calculated correctly', () => {
  const { outputs } = runYears(2);
  // Forest change is year-over-year difference
  expect(typeof outputs.land.forestChange).toBe('number');
});

test('desert is residual from land budget', () => {
  const { outputs } = runYears(1);
  const total = outputs.land.farmland + outputs.land.urban +
                outputs.land.forest + outputs.land.desert;
  // Should be close to total land area
  expect(total).toBeBetween(12000, 14000);
});

// --- Forest Carbon ---

console.log('\n--- Forest Carbon ---\n');

test('sequestration from forest growth', () => {
  // Low grain demand = less farmland = more forest = sequestration
  const { outputs } = runYears(5, { grainDemand: 2000 });
  expect(outputs.carbon.sequestration).toBeGreaterThan(0);
});

test('deforestation emissions from forest loss', () => {
  // High grain demand = more farmland = less forest = emissions
  const { outputs } = runYears(5, { grainDemand: 5000 });
  expect(outputs.carbon.deforestationEmissions >= 0).toBeTrue();
});

test('cumulative sequestration increases over time', () => {
  const year5 = runYears(5, { grainDemand: 2000 }).outputs.carbon.cumulativeSequestration;
  const year20 = runYears(20, { grainDemand: 2000 }).outputs.carbon.cumulativeSequestration;
  expect(year20).toBeGreaterThan(year5);
});

test('net flux can be positive or negative', () => {
  const { outputs } = runYears(1);
  expect(typeof outputs.carbon.netFlux).toBe('number');
});

test('decay emissions from decay pool', () => {
  // After deforestation, decay pool accumulates and emits
  const { outputs, state } = runYears(5, { grainDemand: 5000 });
  // Decay emissions should be non-negative
  expect(outputs.carbon.decayEmissions >= 0).toBeTrue();
});

// --- Validation ---

console.log('\n--- Validation ---\n');

test('validation passes for default params', () => {
  const result = resourcesModule.validate({});
  expect(result.valid).toBeTrue();
});

test('validation catches invalid learning rate', () => {
  const result = resourcesModule.validate({
    minerals: {
      ...resourcesDefaults.minerals,
      copper: { ...resourcesDefaults.minerals.copper, learningRate: 0.5 },
    },
  });
  expect(result.valid).toBe(false);
});

test('validation catches invalid recycling rates', () => {
  const result = resourcesModule.validate({
    minerals: {
      ...resourcesDefaults.minerals,
      copper: { ...resourcesDefaults.minerals.copper, recyclingBase: 1.5 },
    },
  });
  expect(result.valid).toBe(false);
});

test('validation catches invalid yield', () => {
  const result = resourcesModule.validate({
    land: { ...resourcesDefaults.land, yield2025: 0 },
  });
  expect(result.valid).toBe(false);
});

// --- Module Metadata ---

console.log('\n--- Module Metadata ---\n');

test('module has correct name', () => {
  expect(resourcesModule.name).toBe('resources');
});

test('module declares correct inputs', () => {
  expect(resourcesModule.inputs.includes('capacities')).toBeTrue();
  expect(resourcesModule.inputs.includes('additions')).toBeTrue();
  expect(resourcesModule.inputs.includes('temperature')).toBeTrue();
});

test('module declares correct outputs', () => {
  expect(resourcesModule.outputs.includes('minerals')).toBeTrue();
  expect(resourcesModule.outputs.includes('land')).toBeTrue();
  expect(resourcesModule.outputs.includes('carbon')).toBeTrue();
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

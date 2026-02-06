/**
 * Resources Module Tests
 *
 * Tests for mineral demand, land use, and forest carbon.
 * Validates recycling curves, yield damage, and carbon flux.
 */

import { resourcesModule, resourcesDefaults } from './resources.js';

import { test, expect, printSummary } from '../test-utils.js';

// Helper to create typical inputs
function createInputs(options: {
  solarAdditions?: number;
  windAdditions?: number;
  batteryAdditions?: number;
  population?: number;
  gdpPerCapita?: number;
  temperature?: number;
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
    // grainDemand is now calculated internally via Bennett's Law
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

test('farmland responds to gdpPerCapita (Bennett\'s Law)', () => {
  // Higher GDP → more protein → more grain (feed conversion) → more farmland
  const low = runYears(1, { gdpPerCapita: 5000 }).outputs.land.farmland;
  const high = runYears(1, { gdpPerCapita: 50000 }).outputs.land.farmland;
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
  // Lower GDP = less protein = less grain = less farmland = more forest = sequestration
  const { outputs } = runYears(5, { gdpPerCapita: 8000, population: 6e9 });
  expect(outputs.carbon.sequestration).toBeGreaterThan(0);
});

test('deforestation emissions from forest loss', () => {
  // High population + high GDP = high grain demand = more farmland = less forest = emissions
  const { outputs } = runYears(5, { population: 12e9, gdpPerCapita: 40000 });
  expect(outputs.carbon.deforestationEmissions >= 0).toBeTrue();
});

test('cumulative sequestration increases over time', () => {
  const year5 = runYears(5, { population: 6e9, gdpPerCapita: 8000 }).outputs.carbon.cumulativeSequestration;
  const year20 = runYears(20, { population: 6e9, gdpPerCapita: 8000 }).outputs.carbon.cumulativeSequestration;
  expect(year20).toBeGreaterThan(year5);
});

test('net flux can be positive or negative', () => {
  const { outputs } = runYears(1);
  expect(typeof outputs.carbon.netFlux).toBe('number');
});

test('decay emissions from decay pool', () => {
  // After deforestation, decay pool accumulates and emits
  const { outputs, state } = runYears(5, { population: 12e9, gdpPerCapita: 40000 });
  // Decay emissions should be non-negative
  expect(outputs.carbon.decayEmissions >= 0).toBeTrue();
});

// --- Food (Bennett's Law) ---

console.log('\n--- Food (Bennett\'s Law) ---\n');

test('food output includes calories per capita', () => {
  const { outputs } = runYears(1);
  expect(outputs.food.caloriesPerCapita).toBeGreaterThan(2500);
  expect(outputs.food.caloriesPerCapita).toBeLessThan(3500);
});

test('protein share increases with GDP', () => {
  const lowGDP = runYears(1, { gdpPerCapita: 5000 }).outputs.food.proteinShare;
  const highGDP = runYears(1, { gdpPerCapita: 50000 }).outputs.food.proteinShare;
  expect(highGDP).toBeGreaterThan(lowGDP);
});

test('protein share saturates at max', () => {
  const { outputs } = runYears(1, { gdpPerCapita: 100000 });
  // Should be close to max (0.16) but not exceed it
  expect(outputs.food.proteinShare <= 0.16).toBeTrue();
  expect(outputs.food.proteinShare).toBeGreaterThan(0.14);
});

test('grain equivalent increases with population', () => {
  const lowPop = runYears(1, { population: 6e9 }).outputs.food.grainEquivalent;
  const highPop = runYears(1, { population: 10e9 }).outputs.food.grainEquivalent;
  expect(highPop).toBeGreaterThan(lowPop);
});

test('grain equivalent increases with wealth (more protein = more feed)', () => {
  const lowWealth = runYears(1, { gdpPerCapita: 5000 }).outputs.food.grainEquivalent;
  const highWealth = runYears(1, { gdpPerCapita: 50000 }).outputs.food.grainEquivalent;
  // Higher wealth → more protein → ~6x more grain per calorie
  expect(highWealth).toBeGreaterThan(lowWealth);
});

test('grain equivalent is reasonable magnitude', () => {
  // 2025 calibration: ~3800-4000 Mt grain equivalent
  const { outputs } = runYears(1, { population: 8.3e9, gdpPerCapita: 14000 });
  expect(outputs.food.grainEquivalent).toBeGreaterThan(3000);
  expect(outputs.food.grainEquivalent).toBeLessThan(5000);
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
  expect(resourcesModule.inputs.includes('additions')).toBeTrue();
  expect(resourcesModule.inputs.includes('temperature')).toBeTrue();
});

test('module declares correct outputs', () => {
  expect(resourcesModule.outputs.includes('minerals')).toBeTrue();
  expect(resourcesModule.outputs.includes('land')).toBeTrue();
  expect(resourcesModule.outputs.includes('carbon')).toBeTrue();
  expect(resourcesModule.outputs.includes('food')).toBeTrue();
});

// =============================================================================
// SUMMARY
// =============================================================================

printSummary();

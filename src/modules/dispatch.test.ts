/**
 * Dispatch Module Tests
 *
 * Tests for merit order dispatch, penetration limits, and emissions.
 * Validates grid operations and carbon intensity calculations.
 */

import { dispatchModule, dispatchDefaults } from './dispatch.js';
import { EnergySource, ENERGY_SOURCES } from '../domain-types.js';

import { test, expect, printSummary } from '../test-utils.js';

// Helper to create typical 2025 inputs
function createInputs(options: {
  demand?: number;
  solarCap?: number;
  windCap?: number;
  nuclearCap?: number;
  gasCap?: number;
  coalCap?: number;
  batteryCap?: number;
  solarLCOE?: number;
  windLCOE?: number;
  gasLCOE?: number;
  coalLCOE?: number;
  carbonPrice?: number;
} = {}) {
  return {
    electricityDemand: options.demand ?? 25000, // TWh DELIVERED (x1.20 gridLossFactor = 30k generation required)
    capacities: {
      solar: options.solarCap ?? 1500,
      wind: options.windCap ?? 1000,
      hydro: 1400,
      nuclear: options.nuclearCap ?? 400,
      gas: options.gasCap ?? 1800,
      coal: options.coalCap ?? 2100,
      battery: options.batteryCap ?? 500,
    },
    lcoes: {
      solar: options.solarLCOE ?? 35,
      wind: options.windLCOE ?? 35,
      hydro: 40,
      nuclear: 90,
      gas: options.gasLCOE ?? 60,
      coal: options.coalLCOE ?? 75,
      battery: 140,
    },
    solarPlusBatteryLCOE: (options.solarLCOE ?? 35) + 20,
    carbonPrice: options.carbonPrice ?? 35, // $/ton CO2
  };
}

// Helper to run dispatch
function runDispatch(options?: Parameters<typeof createInputs>[0]) {
  const params = dispatchModule.mergeParams({});
  const state = dispatchModule.init(params);
  const inputs = createInputs(options);
  return dispatchModule.step(state, inputs, params, 2025, 0);
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== Dispatch Module Tests ===\n');

// --- Initialization ---

console.log('--- Initialization ---\n');

test('init returns empty state (stateless module)', () => {
  const state = dispatchModule.init(dispatchDefaults);
  expect(Object.keys(state).length).toBe(0);
});

// --- Basic Dispatch ---

console.log('\n--- Basic Dispatch ---\n');

test('total generation covers demand x grid-loss factor (small shortfall ok)', () => {
  const { outputs } = runDispatch();
  // Required generation = delivered demand x gridLossFactor: T&D losses +
  // station own use. With 8 regions, small shortfalls possible from
  // regional distribution.
  const required = 25000 * dispatchDefaults.gridLossFactor;
  expect(outputs.totalGeneration).toBeBetween(required - 2500, required + 100);
  expect(outputs.shortfall).toBeBetween(0, 2500);
});

test('all sources get some generation', () => {
  const { outputs } = runDispatch();
  // At least some sources should have generation
  const totalGen = ENERGY_SOURCES.reduce(
    (sum, s) => sum + (outputs.generation[s] || 0),
    0
  );
  expect(totalGen).toBeGreaterThan(0);
});

test('generation values are non-negative', () => {
  const { outputs } = runDispatch();
  for (const source of ENERGY_SOURCES) {
    const gen = outputs.generation[source] || 0;
    expect(gen >= 0).toBeTrue();
  }
});

test('shortfall release cannot exceed physical solar panel output', () => {
  // High VRE + deep shortfall exercises the emergency-release path.
  // Bare solar and solarPlusBattery draw from the same panels: their combined
  // dispatch must never exceed pre-curtailment panel potential (the old
  // release credited curtailed solar AND curtailed solar+battery — same
  // panels twice — creating energy from nothing exactly in this regime).
  const params = dispatchModule.mergeParams({});
  const { outputs } = runDispatch({
    demand: 100000,
    solarCap: 20000,
    batteryCap: 40000,
    windCap: 500,
    nuclearCap: 0,
    gasCap: 0,
    coalCap: 0,
  });
  const solarPotential =
    (20000 * params.capacityFactor.solar * params.hoursPerYear) / 1000;
  const solarDerived = outputs.generation.solar + outputs.generation.solarPlusBattery;
  expect(solarDerived).toBeLessThan(solarPotential * 1.0001);
  expect(outputs.shortfall).toBeGreaterThan(0); // release path was exercised
  expect(outputs.curtailmentTWh >= 0).toBeTrue();
});

// --- Merit Order ---

console.log('\n--- Merit Order ---\n');

test('cheapest source dispatched first', () => {
  // With solar at $20 and gas at $80, solar should be cheapest
  const { outputs } = runDispatch({ solarLCOE: 20, gasLCOE: 80 });
  expect(outputs.cheapestSource).toBe('solar');
});

test('cheaper sources get more generation', () => {
  // Solar is cheaper than coal, should get more
  const { outputs } = runDispatch({ solarLCOE: 25, coalLCOE: 100 });
  expect(outputs.generation.solar).toBeGreaterThan(0);
});

test('expensive sources are curtailed', () => {
  // With very cheap solar/wind, expensive coal should be minimal
  const { outputs } = runDispatch({
    solarLCOE: 15,
    windLCOE: 15,
    coalLCOE: 120,
    solarCap: 5000,
    windCap: 5000,
  });
  // Coal should be much less than solar+wind
  const cleanGen = outputs.generation.solar + outputs.generation.wind;
  expect(cleanGen).toBeGreaterThan(outputs.generation.coal);
});

// --- Penetration Limits ---

console.log('\n--- Penetration Limits ---\n');

test('bare solar limited by penetration (40%)', () => {
  const { outputs } = runDispatch({
    solarCap: 10000, // Very high capacity
    solarLCOE: 10,   // Very cheap
    demand: 30000,
  });
  // Solar should be limited to ~40% of demand
  const maxSolarGen = 30000 * 0.40;
  expect(outputs.generation.solar).toBeLessThan(maxSolarGen + 1000);
});

test('wind limited by penetration (35%)', () => {
  const { outputs } = runDispatch({
    windCap: 10000,
    windLCOE: 10,
    demand: 30000,
  });
  // Wind should be limited to ~35% of demand
  const maxWindGen = 30000 * 0.35;
  expect(outputs.generation.wind).toBeLessThan(maxWindGen + 1000);
});

test('gas not limited by penetration', () => {
  // Gas can fill any remaining demand
  const { outputs } = runDispatch({
    gasCap: 10000,
    gasLCOE: 30, // Make it cheap
    solarCap: 100,
    windCap: 100,
  });
  expect(outputs.generation.gas).toBeGreaterThan(0);
});

// --- Solar + Battery ---

console.log('\n--- Solar + Battery ---\n');

test('solar+battery generation calculated', () => {
  const { outputs } = runDispatch({ batteryCap: 1000 });
  expect(outputs.generation.solarPlusBattery >= 0).toBeTrue();
});

test('higher battery capacity enables higher VRE penetration', () => {
  // With low battery, VRE is limited; with high battery, storage allows higher penetration
  const lowBatt = runDispatch({ batteryCap: 500, solarCap: 5000, windCap: 5000 }).outputs;
  const highBatt = runDispatch({ batteryCap: 5000, solarCap: 5000, windCap: 5000 }).outputs;
  const lowVRE = lowBatt.generation.solar + lowBatt.generation.wind + lowBatt.generation.solarPlusBattery;
  const highVRE = highBatt.generation.solar + highBatt.generation.wind + highBatt.generation.solarPlusBattery;
  expect(highVRE).toBeGreaterThan(lowVRE);
});

// --- Emissions ---

console.log('\n--- Emissions ---\n');

test('grid intensity is positive with fossil generation', () => {
  const { outputs } = runDispatch();
  expect(outputs.gridIntensity).toBeGreaterThan(0);
});

test('electricity emissions calculated correctly', () => {
  const { outputs } = runDispatch();
  // Should be in Gt range
  expect(outputs.electricityEmissions).toBeBetween(0, 50);
});

test('higher coal = higher grid intensity', () => {
  const lowCoal = runDispatch({ coalCap: 500, coalLCOE: 100 }).outputs.gridIntensity;
  const highCoal = runDispatch({ coalCap: 3000, coalLCOE: 30 }).outputs.gridIntensity;
  expect(highCoal).toBeGreaterThan(lowCoal);
});

test('zero emissions from clean-only grid', () => {
  // If only nuclear/hydro/solar/wind, emissions should be zero
  const { outputs } = runDispatch({
    nuclearCap: 5000,
    solarCap: 5000,
    windCap: 5000,
    gasCap: 0,
    coalCap: 0,
  });
  expect(outputs.electricityEmissions).toBeCloseTo(0, 1);
});

// --- Fossil Share ---

console.log('\n--- Fossil Share ---\n');

test('fossil share between 0 and 1', () => {
  const { outputs } = runDispatch();
  expect(outputs.fossilShare).toBeBetween(0, 1);
});

test('high clean capacity = low fossil share', () => {
  const lowClean = runDispatch({
    solarCap: 500,
    windCap: 500,
  }).outputs.fossilShare;

  const highClean = runDispatch({
    solarCap: 5000,
    windCap: 5000,
    solarLCOE: 15,
    windLCOE: 15,
  }).outputs.fossilShare;

  expect(highClean).toBeLessThan(lowClean);
});

// --- Edge Cases ---

console.log('\n--- Edge Cases ---\n');

test('handles zero demand', () => {
  const { outputs } = runDispatch({ demand: 0 });
  expect(outputs.totalGeneration).toBe(0);
  expect(outputs.shortfall).toBe(0);
});

test('handles very high demand with shortfall', () => {
  const { outputs } = runDispatch({ demand: 200000 }); // Way more than capacity
  expect(outputs.shortfall).toBeGreaterThan(0);
});

test('handles zero capacity', () => {
  const { outputs } = runDispatch({
    solarCap: 0,
    windCap: 0,
    nuclearCap: 0,
    gasCap: 0,
    coalCap: 0,
  });
  // Only hydro remains (1400 GW default)
  expect(outputs.generation.hydro).toBeGreaterThan(0);
});

// --- Validation ---

console.log('\n--- Validation ---\n');

test('validation passes for default params', () => {
  const result = dispatchModule.validate({});
  expect(result.valid).toBeTrue();
});

test('validation catches invalid capacity factor', () => {
  const result = dispatchModule.validate({
    capacityFactor: { ...dispatchDefaults.capacityFactor, solar: 1.5 },
  });
  expect(result.valid).toBe(false);
});

test('validation catches negative carbon intensity', () => {
  const result = dispatchModule.validate({
    carbonIntensity: { ...dispatchDefaults.carbonIntensity, gas: -100 },
  });
  expect(result.valid).toBe(false);
});

// --- Module Metadata ---

console.log('\n--- Module Metadata ---\n');

test('module has correct name', () => {
  expect(dispatchModule.name).toBe('dispatch');
});

test('module declares correct inputs', () => {
  expect(dispatchModule.inputs.includes('electricityDemand')).toBeTrue();
  expect(dispatchModule.inputs.includes('capacities')).toBeTrue();
  expect(dispatchModule.inputs.includes('carbonPrice')).toBeTrue();
  expect(dispatchModule.inputs.includes('effectiveSolarCF')).toBeTrue();
  expect(dispatchModule.inputs.includes('effectiveWindCF')).toBeTrue();
});

test('module declares correct outputs', () => {
  expect(dispatchModule.outputs.includes('generation')).toBeTrue();
  expect(dispatchModule.outputs.includes('gridIntensity')).toBeTrue();
  expect(dispatchModule.outputs.includes('electricityEmissions')).toBeTrue();
});

// =============================================================================
// SUMMARY
// =============================================================================

printSummary();

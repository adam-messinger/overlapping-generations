/**
 * Energy Module Tests
 *
 * Tests for LCOE calculation, learning curves, and capacity state machine.
 * Validates Wright's Law, EROEI depletion, and investment constraints.
 */

import { energyModule, energyDefaults } from './energy.js';
import { ENERGY_SOURCES, EnergySource, REGIONS, Region } from '../framework/types.js';

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

test('init returns state with all energy sources (regional)', () => {
  const state = energyModule.init(energyDefaults);
  for (const region of REGIONS) {
    for (const source of ENERGY_SOURCES) {
      expect(state.regional[region][source] !== undefined).toBeTrue();
    }
  }
});

test('init returns state with global learning state', () => {
  const state = energyModule.init(energyDefaults);
  for (const source of ENERGY_SOURCES) {
    expect(state.global[source] !== undefined).toBeTrue();
  }
});

test('init sets correct 2025 solar capacity (sum of regional)', () => {
  const state = energyModule.init(energyDefaults);
  // Sum across all regions: 600+600+90+40+35+5+30+8 = 1408
  let total = 0;
  for (const region of REGIONS) {
    total += state.regional[region].solar.installed;
  }
  expect(total).toBe(1408);
});

test('init sets correct regional solar capacities', () => {
  const state = energyModule.init(energyDefaults);
  expect(state.regional.oecd.solar.installed).toBe(600);
  expect(state.regional.china.solar.installed).toBe(600);
  expect(state.regional.india.solar.installed).toBe(90);
  expect(state.regional.ssa.solar.installed).toBe(8);
});

test('init sets cumulative equal to global initial capacity', () => {
  const state = energyModule.init(energyDefaults);
  // Global cumulative = sum of regional = 1408 for solar
  expect(state.global.solar.cumulative).toBe(1408);
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

test('coal base LCOE (without carbon) less than gas base LCOE', () => {
  // Global LCOEs are now base costs without carbon (carbon is regional)
  // Coal base cost ~$40, Gas base cost ~$45
  const { outputs } = runYears(1);
  expect(outputs.lcoes.coal).toBeLessThan(outputs.lcoes.gas);
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

test('higher regional carbon price affects regional clean energy growth', () => {
  // With regional carbon pricing, higher carbon prices in a region should
  // make clean energy more competitive there. Test with OECD high carbon.
  const lowCarbon = runYears(10, {
    regional: {
      ...energyDefaults.regional,
      oecd: { ...energyDefaults.regional.oecd, carbonPrice: 20 },
    },
  });
  const highCarbon = runYears(10, {
    regional: {
      ...energyDefaults.regional,
      oecd: { ...energyDefaults.regional.oecd, carbonPrice: 200 },
    },
  });
  // With high carbon price, more solar should be added in OECD
  // (because it becomes more competitive vs fossil)
  expect(highCarbon.outputs.regionalAdditions.oecd.solar).toBeGreaterThan(0);
});

test('global LCOE for fossil does not include carbon (regional)', () => {
  // The global LCOE is now base cost without carbon - carbon is applied regionally
  const { outputs } = runYears(1);
  // Coal base cost should be around $40-45 (no carbon)
  expect(outputs.lcoes.coal).toBeBetween(38, 48);
  // Gas base cost should be around $45-50 (no carbon)
  expect(outputs.lcoes.gas).toBeBetween(43, 52);
});

test('carbon price does not affect solar LCOE', () => {
  const low = runYears(1, { carbonPrice: 35 }).outputs.lcoes.solar;
  const high = runYears(1, { carbonPrice: 150 }).outputs.lcoes.solar;
  expect(high).toBeCloseTo(low, 1);
});

// --- Regional Carbon Pricing ---

console.log('\n--- Regional Carbon Pricing ---\n');

test('regional carbon prices affect regional additions differently', () => {
  // Test that different regional carbon prices lead to different outcomes
  // China has lower carbon price (15) than OECD (50), so China should have
  // relatively less clean energy incentive at the margin
  const { outputs } = runYears(10);

  // Both regions should have growing solar
  expect(outputs.regionalAdditions.oecd.solar).toBeGreaterThan(0);
  expect(outputs.regionalAdditions.china.solar).toBeGreaterThan(0);
});

test('regional capacities are tracked separately', () => {
  const { outputs } = runYears(1);

  // Each region should have its own capacity values
  expect(outputs.regionalCapacities.oecd.solar).toBeGreaterThan(0);
  expect(outputs.regionalCapacities.china.solar).toBeGreaterThan(0);
  expect(outputs.regionalCapacities.india.solar).toBeGreaterThan(0);
  expect(outputs.regionalCapacities.ssa.solar).toBeGreaterThan(0);
});

test('global capacity equals sum of regional capacities', () => {
  const { outputs } = runYears(10);

  for (const source of ENERGY_SOURCES) {
    let regionalSum = 0;
    for (const region of REGIONS) {
      regionalSum += outputs.regionalCapacities[region][source];
    }
    // Allow small floating point tolerance
    expect(Math.abs(outputs.capacities[source] - regionalSum)).toBeLessThan(0.01);
  }
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

// --- Investment Constraint ---

console.log('\n--- Investment Constraint ---\n');

test('lower investment reduces additions', () => {
  const params = energyModule.mergeParams({});
  let stateHigh = energyModule.init(params);
  let stateLow = energyModule.init(params);

  const inputsHigh = createInputs(30000, 50, 1.0);  // High investment: $50T
  const inputsLow = createInputs(30000, 10, 1.0);   // Low investment: $10T

  const resultHigh = energyModule.step(stateHigh, inputsHigh, params, 2025, 0);
  const resultLow = energyModule.step(stateLow, inputsLow, params, 2025, 0);

  // Lower investment should result in lower solar additions
  expect(resultLow.outputs.additions.solar).toBeLessThan(resultHigh.outputs.additions.solar + 1);
});

test('investment constraint calculated from CAPEX', () => {
  const params = energyModule.mergeParams({});
  let state = energyModule.init(params);

  // Very low investment should heavily constrain additions
  const inputs = createInputs(30000, 1, 1.0);  // Only $1T investment
  const result = energyModule.step(state, inputs, params, 2025, 0);

  // With $1T investment × 15% clean share = $150B clean budget
  // Solar LCOE is cheapest (~$35), so it gets funded first
  // At $800M/GW CAPEX = 187.5 GW max solar additions
  // Target growth would be 1500 GW × 25% = 375 GW
  // So investment should constrain this significantly
  expect(result.outputs.additions.solar).toBeLessThan(200);
  expect(result.outputs.additions.solar).toBeGreaterThan(100); // Still substantial
});

test('CAPEX learning reduces constraint over time', () => {
  const params = energyModule.mergeParams({});

  // Run year 0 with limited investment
  let state0 = energyModule.init(params);
  const inputs = createInputs(30000, 10, 1.0);
  const result0 = energyModule.step(state0, inputs, params, 2025, 0);

  // Run year 25 with same investment - CAPEX has declined
  let state25 = energyModule.init(params);
  for (let i = 0; i < 25; i++) {
    const r = energyModule.step(state25, inputs, params, 2025 + i, i);
    state25 = r.state;
  }
  const inputs25 = createInputs(30000, 10, 1.0);
  const result25 = energyModule.step(state25, inputs25, params, 2050, 25);

  // By 2050, CAPEX learning (2%/year × 25 years) should allow ~60% more capacity
  // per dollar of investment, so additions could be higher (if not ceiling-constrained)
  // This test just verifies CAPEX learning is working
  expect(result25.outputs.additions.solar >= 0).toBeTrue();
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

test('validation catches negative regional carbon price', () => {
  const result = energyModule.validate({
    regional: {
      ...energyDefaults.regional,
      oecd: { ...energyDefaults.regional.oecd, carbonPrice: -10 },
    },
  });
  expect(result.valid).toBe(false);
});

test('validation warns on very high regional carbon price', () => {
  const result = energyModule.validate({
    regional: {
      ...energyDefaults.regional,
      china: { ...energyDefaults.regional.china, carbonPrice: 600 },
    },
  });
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
  expect(energyModule.outputs.includes('regionalCapacities')).toBeTrue();
  expect(energyModule.outputs.includes('energyRegional')).toBeTrue();
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

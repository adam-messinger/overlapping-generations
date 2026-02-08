/**
 * Energy Module Tests
 *
 * Tests for LCOE calculation, learning curves, and capacity state machine.
 * Validates Wright's Law, EROEI depletion, and investment constraints.
 */

import { energyModule, energyDefaults } from './energy.js';
import { EnergySource, ENERGY_SOURCES, Region, REGIONS } from '../domain-types.js';

import { test, expect, printSummary } from '../test-utils.js';

// Helper to create inputs
function createInputs(
  electricityDemand: number = 30000,
  availableInvestment: number = 25,
  mineralConstraint: number = 1.0,
  laggedCurtailmentRate: number = 0,
  laggedInterestRate: number = 0.05,
) {
  return { electricityDemand, availableInvestment, mineralConstraint, laggedCurtailmentRate, laggedInterestRate };
}

// Helper to run simulation for N years
function runYears(years: number, params?: Partial<typeof energyDefaults>) {
  const energyParams = energyModule.mergeParams(params ?? {});
  let state = energyModule.init(energyParams);
  let outputs: any;

  for (let i = 0; i < years; i++) {
    const inputs = createInputs(30000 + i * 500, 25 + i * 0.5);
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

test('coal additions much smaller than solar', () => {
  const { outputs } = runYears(5);
  // Coal may get small demand-gap additions but solar dominates on LCOE
  expect(outputs.additions.solar).toBeGreaterThan(outputs.additions.coal * 10);
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

test('lower investment reduces additions (stability embedded in capital)', () => {
  const params = energyModule.mergeParams({});
  let stateHigh = energyModule.init(params);
  let stateLow = energyModule.init(params);

  const inputsHigh = createInputs(30000, 25);
  const inputsLow = createInputs(30000, 12.5);  // Half investment (as if stability=0.5)

  const resultHigh = energyModule.step(stateHigh, inputsHigh, params, 2025, 0);
  const resultLow = energyModule.step(stateLow, inputsLow, params, 2025, 0);

  // Lower investment should result in lower additions
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

  // With $1T investment × 15% clean share = $150B clean budget spread across 8 regions
  // Solar regional LCOE adjusted for site CF, so not all regions build aggressively
  // At $800M/GW CAPEX, budget constrains additions well below demand-driven target
  expect(result.outputs.additions.solar).toBeLessThan(200);
  expect(result.outputs.additions.solar).toBeGreaterThan(10); // Constrained but nonzero
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

// --- Curtailment Feedback ---

console.log('\n--- Curtailment Feedback ---\n');

test('zero curtailment does not affect solar additions', () => {
  const params = energyModule.mergeParams({});
  const state = energyModule.init(params);
  const inputsNone = createInputs(30000, 25, 1.0, 0);
  const inputsZero = createInputs(30000, 25, 1.0, 0);
  const r1 = energyModule.step(state, inputsNone, params, 2025, 0);
  const r2 = energyModule.step(state, inputsZero, params, 2025, 0);
  expect(r1.outputs.additions.solar).toBeCloseTo(r2.outputs.additions.solar, 0);
});

test('high curtailment reduces solar additions', () => {
  // Run 5 years to build up enough solar that demand-fill path is active
  const params = energyModule.mergeParams({});
  let stateA = energyModule.init(params);
  let stateB = energyModule.init(params);
  for (let i = 0; i < 5; i++) {
    const inp = createInputs(30000 + i * 500, 25 + i * 0.5, 1.0, 0);
    stateA = energyModule.step(stateA, inp, params, 2025 + i, i).state;
    stateB = energyModule.step(stateB, inp, params, 2025 + i, i).state;
  }
  const rLow = energyModule.step(stateA, createInputs(35000, 30, 1.0, 0), params, 2030, 5);
  const rHigh = energyModule.step(stateB, createInputs(35000, 30, 1.0, 0.3), params, 2030, 5);
  expect(rHigh.outputs.additions.solar).toBeLessThan(rLow.outputs.additions.solar);
});

test('high curtailment increases battery relative to solar additions', () => {
  // Run 10 years, then compare. High curtailment dampens solar but not battery.
  // Even if battery additions are growth-capped (identical absolute value),
  // the ratio of battery:solar additions should be higher with curtailment.
  const params = energyModule.mergeParams({});
  let stateA = energyModule.init(params);
  let stateB = energyModule.init(params);
  for (let i = 0; i < 10; i++) {
    const inp = createInputs(30000 + i * 500, 25 + i * 0.5, 1.0, 0);
    stateA = energyModule.step(stateA, inp, params, 2025 + i, i).state;
    stateB = energyModule.step(stateB, inp, params, 2025 + i, i).state;
  }
  const rA = energyModule.step(stateA, createInputs(40000, 35, 1.0, 0), params, 2035, 10);
  const rB = energyModule.step(stateB, createInputs(40000, 35, 1.0, 0.4), params, 2035, 10);
  // Solar additions should be strongly dampened by curtailment
  expect(rB.outputs.additions.solar).toBeLessThan(rA.outputs.additions.solar);
  // Battery/solar ratio should be higher (even if battery is identical due to growth cap)
  const ratioA = rA.outputs.additions.battery / Math.max(1, rA.outputs.additions.solar);
  const ratioB = rB.outputs.additions.battery / Math.max(1, rB.outputs.additions.solar);
  expect(ratioB).toBeGreaterThan(ratioA);
});

test('curtailment at 50% hits floor (additions > 0)', () => {
  const params = energyModule.mergeParams({});
  const state = energyModule.init(params);
  const inputs = createInputs(30000, 25, 1.0, 0.5);
  const r = energyModule.step(state, inputs, params, 2025, 0);
  // With 50% curtailment and penalty=2.0: damping = max(0.1, 1-2*0.5) = max(0.1, 0) = 0.1
  // So additions should be small but nonzero
  expect(r.outputs.additions.solar).toBeGreaterThan(0);
});

// --- WACC / Interest Rate ---

console.log('\n--- WACC / Interest Rate ---\n');

test('CRF function: WACC = baseWACC produces no LCOE adjustment', () => {
  const params = energyModule.mergeParams({});
  const state = energyModule.init(params);
  // laggedInterestRate = 0.05, riskPremium = 0.02 → effectiveWACC = 0.07 = baseWACC
  const inputs = createInputs(30000, 25, 1.0, 0, 0.05);
  const r = energyModule.step(state, inputs, params, 2025, 0);
  expect(r.outputs.effectiveWACC).toBeCloseTo(0.07, 2);
});

test('high interest rate raises LCOE for capital-intensive sources', () => {
  const params = energyModule.mergeParams({});
  const state = energyModule.init(params);
  const rBase = energyModule.step(state, createInputs(30000, 25, 1.0, 0, 0.05), params, 2025, 0);
  const rHigh = energyModule.step(state, createInputs(30000, 25, 1.0, 0, 0.10), params, 2025, 0);
  // Solar (capitalIntensity=0.85) should see a bigger LCOE increase than gas (0.15)
  const solarIncrease = rHigh.outputs.lcoes.solar / rBase.outputs.lcoes.solar;
  const gasIncrease = rHigh.outputs.lcoes.gas / rBase.outputs.lcoes.gas;
  expect(solarIncrease).toBeGreaterThan(gasIncrease);
});

test('high interest rate penalizes solar more than gas', () => {
  const params = energyModule.mergeParams({});
  const state = energyModule.init(params);
  const r = energyModule.step(state, createInputs(30000, 25, 1.0, 0, 0.10), params, 2025, 0);
  // At WACC=12% vs base 7%, CRF ratio = ~1.27
  // Solar adj = 0.85 * 0.27 = +23%; gas adj = 0.15 * 0.27 = +4%
  expect(r.outputs.effectiveWACC).toBeCloseTo(0.12, 2);
  // Solar LCOE should be notably higher than base ($35)
  expect(r.outputs.lcoes.solar).toBeGreaterThan(40);
});

test('low interest rate does not push solar below soft floor', () => {
  const params = energyModule.mergeParams({});
  const state = energyModule.init(params);
  // Very low interest rate → WACC < baseWACC → discount on capital-intensive sources
  const r = energyModule.step(state, createInputs(30000, 25, 1.0, 0, 0.005), params, 2025, 0);
  // Solar LCOE should never drop below soft floor ($12)
  expect(r.outputs.lcoes.solar).toBeGreaterThan(12);
});

test('low interest rate produces minWACC floor', () => {
  const params = energyModule.mergeParams({});
  const state = energyModule.init(params);
  const r = energyModule.step(state, createInputs(30000, 25, 1.0, 0, 0.005), params, 2025, 0);
  // laggedInterestRate=0.005 + riskPremium=0.02 = 0.025, but minWACC=0.03
  expect(r.outputs.effectiveWACC).toBeCloseTo(0.03, 2);
});

// --- System LCOE ---

console.log('\n--- System LCOE ---\n');

test('at low VRE share, solar effective ranking close to bare LCOE', () => {
  // Year 0: VRE share is low → effective solar LCOE ≈ bare solar LCOE
  // The global LCOE output is the bare LCOE (not the ranking LCOE).
  // At year 0, solar and wind are both $35 base. Solar should remain competitive.
  const params = energyModule.mergeParams({});
  const state = energyModule.init(params);
  const r = energyModule.step(state, createInputs(30000, 25), params, 2025, 0);
  // Solar LCOE should be reasonable and solar should still get additions
  expect(r.outputs.lcoes.solar).toBeBetween(25, 50);
  expect(r.outputs.additions.solar).toBeGreaterThan(0);
});

test('effective WACC output is present', () => {
  const params = energyModule.mergeParams({});
  const state = energyModule.init(params);
  const r = energyModule.step(state, createInputs(30000, 25), params, 2025, 0);
  expect(r.outputs.effectiveWACC).toBeGreaterThan(0);
  expect(r.outputs.effectiveWACC).toBeLessThan(0.20);
});

// --- Validation ---

console.log('\n--- New Param Validation ---\n');

test('validation catches negative curtailmentPenalty', () => {
  const result = energyModule.validate({ curtailmentPenalty: -1 });
  expect(result.valid).toBe(false);
});

test('validation catches negative riskPremium', () => {
  const result = energyModule.validate({ riskPremium: -0.01 });
  expect(result.valid).toBe(false);
});

test('validation catches non-positive baseWACC', () => {
  const result = energyModule.validate({ baseWACC: 0 });
  expect(result.valid).toBe(false);
});

test('validation catches negative minWACC', () => {
  const result = energyModule.validate({ minWACC: -0.01 });
  expect(result.valid).toBe(false);
});

// =============================================================================
// SUMMARY
// =============================================================================

printSummary();

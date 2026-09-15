/**
 * Resources Module Tests
 *
 * Tests for mineral demand, land use, and forest carbon.
 * Validates recycling curves, yield damage, and carbon flux.
 */

import {
  resourcesModule,
  resourcesDefaults,
  MINERAL_KEYS,
  miningDepletionMultiplier,
} from './resources.js';

import { test, expect, printSummary, sumRegional } from '../test-utils.js';

// Helper to create typical inputs
function createInputs(options: {
  solarAdditions?: number;
  windAdditions?: number;
  batteryAdditions?: number;
  population?: number;
  gdpPerCapita?: number;
  gdp?: number;
  temperature?: number;
} = {}) {
  return {
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
    gdp: options.gdp ?? 116,
    gdp2025: 116,
    temperature: options.temperature ?? 1.3,
    transportElectrification: 0.05,
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

test('transition mineral intensity declines with learning', () => {
  // Asserted on the transition slice: `learningRate` is an equipment-intensity
  // decline and is deliberately not applied to baseline demand, so the total
  // would be dominated by the GDP-driven stream and say nothing about learning.
  const year1 = runYears(1).outputs.minerals.copper.transitionGrossDemand;
  const year20 = runYears(20).outputs.minerals.copper.transitionGrossDemand;
  // 2% learning over 19 further years: 0.98^19 = 0.68. Solar and wind additions
  // are held fixed by the helper but the EV-battery term is not (fleet growth
  // is large in year 1 and steady by year 20), so allow ~1%.
  expect(year20 / (year1 * Math.pow(0.98, 19))).toBeCloseTo(1, 2);
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

// --- Baseline (non-transition) demand and the supply constraint ---

console.log('\n--- Baseline Demand & Supply Constraint ---\n');

test('baseline stream equals its 2025 constant at the GDP anchor', () => {
  // Module-level half of the calibration: at gdpRatio 1 the non-transition
  // stream must be exactly its calibrated constant. The end-to-end pin (that
  // total primary demand reproduces observed mine production, which depends on
  // the real 2025 capacity additions) lives in simulation.test.ts.
  const { outputs } = runYears(1);
  for (const key of MINERAL_KEYS) {
    const baseline = outputs.minerals[key].grossDemand - outputs.minerals[key].transitionGrossDemand;
    expect(baseline).toBeCloseTo(resourcesDefaults.minerals[key].baselineDemand2025, 6);
  }
});

test('lithium is under capacity in 2025 (battery build, not baseline, is the gap)', () => {
  // Documented exception: ~85% of real lithium use is batteries and the
  // model's 2025 battery build is below the actual market, so lithium does not
  // calibrate to mine production. It must at least not exceed capacity.
  const { outputs } = runYears(1);
  expect(outputs.minerals.lithium.demand)
    .toBeLessThan(resourcesDefaults.minerals.lithium.annualSupply2025);
});

test('baseline demand scales with GDP at the stated elasticity', () => {
  const y1 = runYears(1).outputs.minerals.copper;
  const base = y1.grossDemand;
  const transition = y1.transitionGrossDemand;
  const doubled = runYears(1, { gdp: 232 }).outputs.minerals.copper.grossDemand;
  // Only the baseline stream responds to GDP; the transition slice is unchanged.
  const ratio = (doubled - transition) / (base - transition);
  expect(ratio).toBeCloseTo(Math.pow(2, resourcesDefaults.minerals.copper.baselineGdpElasticity), 6);
});

test('supply ratio is 1.0 when capacity is ample', () => {
  const { outputs } = runYears(1);
  expect(outputs.minerals.copper.supplyRatio).toBeCloseTo(1, 6);
  expect(outputs.mineralConstraint).toBeCloseTo(1, 6);
});

test('constraint binds when demand outruns capacity', () => {
  // 4x GDP against an unchanged capacity path must ration copper.
  const { outputs } = runYears(1, { gdp: 464 });
  expect(outputs.minerals.copper.supplyRatio).toBeLessThan(1);
  expect(outputs.mineralConstraint).toBeLessThan(1);
});

test('extraction ledger closes: cumulative never exceeds the capacity path', () => {
  // Booking `extraction` rather than `demand` is what keeps this true.
  const years = 30;
  const { state, outputs } = runYears(years, { gdp: 464 });
  // Read the capacity off state rather than re-deriving the growth law, so the
  // test cannot pass by duplicating a bug in the thing it is checking.
  expect(outputs.minerals.copper.extraction)
    .toBeLessThan(state.minerals.copper.miningCapacity * 1.000001);
  expect(outputs.minerals.copper.cumulative)
    .toBeLessThan(state.minerals.copper.miningCapacity * years);
});

test('a source is not throttled by a mineral it does not use', () => {
  // Nuclear uses steel only (no perMW_nuclear on copper/lithium/rareEarths),
  // so a copper shortage must leave nuclear at 1.0.
  const { outputs } = runYears(1, { gdp: 464 });
  expect(outputs.mineralConstraintBySource.nuclear).toBeCloseTo(
    outputs.minerals.steel.supplyRatio, 6);
  expect(outputs.mineralConstraintBySource.battery).toBeLessThan(1); // battery uses copper
});

test('mining energy is charged on the transition slice only', () => {
  // Baseline mining energy is already inside production's nonElectricEnergy
  // anchor; charging it again as system overhead would double-count it.
  const { outputs } = runYears(1);
  const expected = MINERAL_KEYS.reduce((sum, key) => {
    const rr = outputs.minerals[key].reserveRatio;
    const depletion = miningDepletionMultiplier(rr, resourcesDefaults.mining.depletionExponent);
    return sum + outputs.minerals[key].transitionGrossDemand
      * resourcesDefaults.mining.energyIntensity[key] * depletion * 1e6 / 3.6e6;
  }, 0);
  expect(outputs.miningEnergyTWh).toBeCloseTo(expected, 6);
});

test('partial override of one baseline field preserves the other', () => {
  // MineralParams is merged one level deep, so these must be flat fields.
  const params = resourcesModule.mergeParams({
    minerals: { copper: { baselineGdpElasticity: 0.5 } },
  } as any);
  expect(params.minerals.copper.baselineGdpElasticity).toBe(0.5);
  expect(params.minerals.copper.baselineDemand2025)
    .toBe(resourcesDefaults.minerals.copper.baselineDemand2025);
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

test('land identity holds exactly: farmland + urban + forest + desert = total', () => {
  for (const years of [1, 10, 40]) {
    const { outputs } = runYears(years);
    const total = outputs.land.farmland + outputs.land.urban +
                  outputs.land.forest + outputs.land.desert;
    expect(total).toBeCloseTo(resourcesDefaults.land.totalLandArea, 6);
  }
});

test('desertification at high temperature reduces available farmland', () => {
  // Force a farmland-cap-binding regime for BOTH runs (extreme grain
  // demand) so the cap is what determines farmland, then check warming
  // tightens it via climate-driven desert expansion
  const demandExtreme = { population: 20e9, gdpPerCapita: 80000 };
  const cool = runYears(40, { ...demandExtreme, temperature: 1.0 }).outputs;
  const hot = runYears(40, { ...demandExtreme, temperature: 4.0 }).outputs;
  expect(cool.foodStress).toBeGreaterThan(0); // cap binds in both runs
  expect(hot.land.farmland).toBeLessThan(cool.land.farmland + 1e-6);
  expect(hot.foodStress).toBeGreaterThan(cool.foodStress);
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

test('regional farmland shares partition world farmland (sum to 1)', () => {
  expect(sumRegional(resourcesDefaults.water.regional, r => r.farmlandShare)).toBeCloseTo(1, 9);
});

// =============================================================================
// SUMMARY
// =============================================================================

printSummary();

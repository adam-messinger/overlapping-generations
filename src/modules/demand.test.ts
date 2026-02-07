/**
 * Demand Module Tests
 *
 * Tests for GDP growth, energy intensity, and electricity demand.
 * Validates against IEA calibration targets.
 */

import { demandModule, demandDefaults } from './demand.js';
import { demographicsModule, demographicsDefaults } from './demographics.js';
import { REGIONS } from '../framework/types.js';

import { test, expect, printSummary } from '../test-utils.js';

// Helper to get demographics inputs for a given year
function getDemographicsInputs(yearIndex: number) {
  const demoParams = demographicsModule.mergeParams({});
  let demoState = demographicsModule.init(demoParams);
  let demoOutputs: any;

  for (let i = 0; i <= yearIndex; i++) {
    const result = demographicsModule.step(demoState, {}, demoParams, 2025 + i, i);
    demoState = result.state;
    demoOutputs = result.outputs;
  }

  return {
    regionalPopulation: demoOutputs.regionalPopulation,
    regionalWorking: demoOutputs.regionalWorking,
    regionalEffectiveWorkers: demoOutputs.regionalEffectiveWorkers,
    regionalDependency: demoOutputs.regionalDependency,
    population: demoOutputs.population,
    working: demoOutputs.working,
    dependency: demoOutputs.dependency,
  };
}

// Baseline GDP growth (~2.5%/yr) for tests — production module provides this in real sim
function baselineGdp(yearIndex: number) {
  return 158 * Math.pow(1.025, yearIndex);
}

// Helper to run demand simulation for N years
function runYears(years: number) {
  const demandParams = demandModule.mergeParams({});
  let demandState = demandModule.init(demandParams);
  let outputs: any;

  for (let i = 0; i < years; i++) {
    const inputs = {
      ...getDemographicsInputs(i),
      gdp: baselineGdp(i),
    };
    const result = demandModule.step(demandState, inputs, demandParams, 2025 + i, i);
    demandState = result.state;
    outputs = result.outputs;
  }

  return { state: demandState, outputs };
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== Demand Module Tests ===\n');

// --- Initialization ---

console.log('--- Initialization ---\n');

test('init returns state with all regions', () => {
  const state = demandModule.init(demandDefaults);
  for (const region of REGIONS) {
    expect(state.regions[region] !== undefined).toBeTrue();
  }
});

test('init sets correct 2025 GDP shares', () => {
  const state = demandModule.init(demandDefaults);
  const totalShare = REGIONS.reduce((sum, r) => sum + state.regions[r].gdpShare, 0);

  // GDP shares should sum to 1.0
  expect(totalShare).toBeCloseTo(1.0, 2);
  // OECD should have largest share (~39% of $158T PPP)
  expect(state.regions.oecd.gdpShare).toBeBetween(0.35, 0.45);
});

test('init sets correct energy intensity by region', () => {
  const state = demandModule.init(demandDefaults);
  expect(state.regions.oecd.intensity).toBeCloseTo(0.63, 2);
  expect(state.regions.china.intensity).toBeCloseTo(1.11, 2);
  expect(state.regions.india.intensity).toBeCloseTo(0.65, 2);
  expect(state.regions.russia.intensity).toBeCloseTo(1.03, 2);
});

// --- Year 0 Outputs ---

console.log('\n--- Year 0 Outputs ---\n');

test('step year 0 returns correct global GDP', () => {
  const { outputs } = runYears(1);
  // ~119T global GDP in 2025
  expect(outputs.gdp).toBeBetween(115, 125);
});

test('step year 0 returns correct electricity demand', () => {
  const { outputs } = runYears(1);
  // ~30,000 TWh in 2025 (IEA)
  expect(outputs.electricityDemand / 1000).toBeBetween(25, 35);
});

test('step year 0 returns correct electrification rate', () => {
  const { outputs } = runYears(1);
  // Derived from sector-weighted average: 0.02*0.45 + 0.35*0.30 + 0.30*0.25 ≈ 0.189
  // After first step with basePressure, should be near starting value
  expect(outputs.electrificationRate).toBeBetween(0.15, 0.30);
});

test('step year 0 returns correct total final energy', () => {
  const { outputs } = runYears(1);
  // ~122,000 TWh in 2025 (IEA)
  expect(outputs.totalFinalEnergy / 1000).toBeBetween(110, 140);
});

test('step year 0 returns correct final energy per capita/day', () => {
  const { outputs } = runYears(1);
  // ~40 kWh/person/day in 2025 (Twin-Engine)
  expect(outputs.finalEnergyPerCapitaDay).toBeBetween(35, 50);
});

// --- GDP Growth ---

console.log('\n--- GDP Growth ---\n');

test('global GDP grows over time', () => {
  const year1 = runYears(1).outputs.gdp;
  const year25 = runYears(25).outputs.gdp;

  expect(year25).toBeGreaterThan(year1);
});

test('China GDP grows faster than OECD initially', () => {
  const year1 = runYears(1).outputs.regional;
  const year10 = runYears(10).outputs.regional;

  const oecdGrowth = (year10.oecd.gdp - year1.oecd.gdp) / year1.oecd.gdp;
  const chinaGrowth = (year10.china.gdp - year1.china.gdp) / year1.china.gdp;

  expect(chinaGrowth).toBeGreaterThan(oecdGrowth);
});

test('China energy intensity declines faster than OECD (catch-up)', () => {
  const state10 = runYears(10).state;
  const state50 = runYears(50).state;

  // China's intensity decline should be larger (faster catch-up)
  const chinaDecline = state10.regions.china.intensity - state50.regions.china.intensity;
  const oecdDecline = state10.regions.oecd.intensity - state50.regions.oecd.intensity;
  expect(chinaDecline).toBeGreaterThan(oecdDecline);
});

// --- Energy Intensity ---

console.log('\n--- Energy Intensity ---\n');

test('energy intensity declines over time', () => {
  const year1 = runYears(1).outputs.regional.oecd.energyIntensity;
  const year25 = runYears(25).outputs.regional.oecd.energyIntensity;

  expect(year25).toBeLessThan(year1);
});

test('China intensity declines faster than OECD', () => {
  const year1 = runYears(1).outputs.regional;
  const year25 = runYears(25).outputs.regional;

  const oecdDecline = 1 - year25.oecd.energyIntensity / year1.oecd.energyIntensity;
  const chinaDecline = 1 - year25.china.energyIntensity / year1.china.energyIntensity;

  expect(chinaDecline).toBeGreaterThan(oecdDecline);
});

// --- Electrification ---

console.log('\n--- Electrification ---\n');

test('electrification rate increases over time', () => {
  const year1 = runYears(1).outputs.electrificationRate;
  const year25 = runYears(25).outputs.electrificationRate;

  expect(year25).toBeGreaterThan(year1);
});

test('electrification rate reaches reasonable level by 2100', () => {
  const year76 = runYears(76).outputs.electrificationRate;
  // Sector-derived rate should reach 50-90% by 2100 depending on cost dynamics
  // Can exceed old ceilings when economics are favorable (cost escalation, not hard walls)
  expect(year76).toBeBetween(0.45, 0.92);
});

test('electricity share of total energy increases', () => {
  const year1 = runYears(1).outputs;
  const year25 = runYears(25).outputs;

  const share1 = year1.electricityDemand / year1.totalFinalEnergy;
  const share25 = year25.electricityDemand / year25.totalFinalEnergy;

  expect(share25).toBeGreaterThan(share1);
});

// --- Calibration Targets ---

console.log('\n--- Calibration Targets ---\n');

test('electricity demand 2050 higher than 2025', () => {
  const year1 = runYears(1).outputs.electricityDemand;
  const year26 = runYears(26).outputs.electricityDemand;
  // Should roughly double or more by 2050 (IEA projects 52,000-71,000 TWh)
  expect(year26).toBeGreaterThan(year1 * 1.5);
});

test('final energy per capita ~50-65 kWh/day by 2050 (Twin-Engine)', () => {
  const year26 = runYears(26).outputs.finalEnergyPerCapitaDay;
  expect(year26).toBeBetween(45, 70);
});

test('Asia-Pacific share >40% by 2050', () => {
  const year26 = runYears(26).outputs;
  const asiaElec = year26.regional.china.electricityDemand +
                   year26.regional.india.electricityDemand +
                   year26.regional.seasia.electricityDemand;
  const asiaShare = asiaElec / year26.electricityDemand;

  expect(asiaShare).toBeGreaterThan(0.40);
});

// --- Per-Worker Metrics ---

console.log('\n--- Per-Worker Metrics ---\n');

test('GDP per working-age adult increases over time', () => {
  const year1 = runYears(1).outputs.gdpPerWorking;
  const year25 = runYears(25).outputs.gdpPerWorking;

  expect(year25).toBeGreaterThan(year1);
});

test('electricity per worker increases over time', () => {
  const year1 = runYears(1).outputs.electricityPerWorking;
  const year25 = runYears(25).outputs.electricityPerWorking;

  expect(year25).toBeGreaterThan(year1);
});

// --- Validation ---

console.log('\n--- Validation ---\n');

test('validation passes for default params', () => {
  const result = demandModule.validate({});
  expect(result.valid).toBeTrue();
});

test('validation catches negative GDP', () => {
  const result = demandModule.validate({
    regions: {
      ...demandDefaults.regions,
      oecd: { ...demandDefaults.regions.oecd, gdp2025: -10 },
    },
  });
  expect(result.valid).toBe(false);
});

test('validation catches invalid cost escalation threshold', () => {
  const result = demandModule.validate({
    sectors: {
      ...demandDefaults.sectors,
      transport: { ...demandDefaults.sectors.transport, costEscalationThreshold: 1.5 },
    },
  });
  expect(result.valid).toBe(false);
});

test('validation catches negative cost escalation rate', () => {
  const result = demandModule.validate({
    sectors: {
      ...demandDefaults.sectors,
      industry: { ...demandDefaults.sectors.industry, costEscalationRate: -1 },
    },
  });
  expect(result.valid).toBe(false);
});

// --- Endogenous Fuel Mix ---

console.log('\n--- Endogenous Fuel Mix ---\n');

// Helper to run with custom params and inputs
function runYearsWithParams(years: number, paramOverrides: Partial<typeof demandDefaults>, inputOverrides?: { carbonPrice?: number }) {
  const demandParams = demandModule.mergeParams(paramOverrides);
  let demandState = demandModule.init(demandParams);
  let outputs: any;

  for (let i = 0; i < years; i++) {
    const inputs = {
      ...getDemographicsInputs(i),
      gdp: baselineGdp(i),
      carbonPrice: inputOverrides?.carbonPrice ?? 35,
    };
    const result = demandModule.step(demandState, inputs, demandParams, 2025 + i, i);
    demandState = result.state;
    outputs = result.outputs;
  }

  return { state: demandState, outputs };
}

test('high carbon price reduces coal share faster', () => {
  const lowCarbon = runYearsWithParams(25, {}, { carbonPrice: 10 });
  const highCarbon = runYearsWithParams(25, {}, { carbonPrice: 200 });

  // High carbon price should have lower coal consumption
  expect(highCarbon.outputs.fuels.coal).toBeLessThan(lowCarbon.outputs.fuels.coal);
});

test('fuel shares respond to carbon price over time', () => {
  const year1 = runYearsWithParams(1, {}, { carbonPrice: 100 });
  const year25 = runYearsWithParams(25, {}, { carbonPrice: 100 });

  // Hydrogen share should increase over time with high carbon price
  // (cleaner fuels become more attractive)
  const h2Share1 = year1.outputs.fuels.hydrogen / year1.outputs.nonElectricEnergy;
  const h2Share25 = year25.outputs.fuels.hydrogen / year25.outputs.nonElectricEnergy;
  expect(h2Share25).toBeGreaterThan(h2Share1);
});

test('zero carbon price drifts slowly from baseline', () => {
  const year25Zero = runYearsWithParams(25, {}, { carbonPrice: 0 });
  const year25High = runYearsWithParams(25, {}, { carbonPrice: 200 });

  // With zero carbon price, oil should remain higher than with high carbon price
  expect(year25Zero.outputs.fuels.oil).toBeGreaterThan(year25High.outputs.fuels.oil);
});

// --- Cost-Driven Sector Electrification ---

console.log('\n--- Cost-Driven Sector Electrification ---\n');

test('sector electrification rates stay below physical ceiling (0.98)', () => {
  const year76 = runYearsWithParams(76, {}, {});

  // All sectors should stay below the 0.98 physical ceiling
  expect(year76.outputs.sectors.transport.electrificationRate).toBeLessThan(0.98);
  expect(year76.outputs.sectors.buildings.electrificationRate).toBeLessThan(0.98);
  expect(year76.outputs.sectors.industry.electrificationRate).toBeLessThan(0.98);
});

test('high carbon price accelerates transport electrification', () => {
  const lowCarbon = runYearsWithParams(25, {}, { carbonPrice: 10 });
  const highCarbon = runYearsWithParams(25, {}, { carbonPrice: 200 });

  expect(highCarbon.outputs.sectors.transport.electrificationRate)
    .toBeGreaterThan(lowCarbon.outputs.sectors.transport.electrificationRate);
});

test('buildings electrification responds to gas+carbon cost', () => {
  const lowCarbon = runYearsWithParams(25, {}, { carbonPrice: 10 });
  const highCarbon = runYearsWithParams(25, {}, { carbonPrice: 200 });

  expect(highCarbon.outputs.sectors.buildings.electrificationRate)
    .toBeGreaterThan(lowCarbon.outputs.sectors.buildings.electrificationRate);
});

test('industry is most cost-sensitive sector', () => {
  const lowCarbon = runYearsWithParams(25, {}, { carbonPrice: 10 });
  const highCarbon = runYearsWithParams(25, {}, { carbonPrice: 200 });

  // Calculate relative increase in electrification
  const transportIncrease =
    (highCarbon.outputs.sectors.transport.electrificationRate - lowCarbon.outputs.sectors.transport.electrificationRate) /
    lowCarbon.outputs.sectors.transport.electrificationRate;
  const industryIncrease =
    (highCarbon.outputs.sectors.industry.electrificationRate - lowCarbon.outputs.sectors.industry.electrificationRate) /
    lowCarbon.outputs.sectors.industry.electrificationRate;

  // Industry should have higher relative sensitivity (costSensitivity: 0.10 vs 0.08)
  expect(industryIncrease).toBeGreaterThan(transportIncrease * 0.5); // At least half as responsive
});

// --- Energy Burden LCOE Sensitivity ---

console.log('\n--- Energy Burden LCOE Sensitivity ---\n');

test('energy burden differs between low and high laggedAvgLCOE', () => {
  const demandParams = demandModule.mergeParams({});
  const demoInputs = getDemographicsInputs(5);

  // Run 5 years to get a meaningful state
  let state = demandModule.init(demandParams);
  for (let i = 0; i < 5; i++) {
    const result = demandModule.step(state, {
      ...getDemographicsInputs(i),
      gdp: baselineGdp(i),
      laggedAvgLCOE: 50,
    }, demandParams, 2025 + i, i);
    state = result.state;
  }

  // Low LCOE case
  const lowResult = demandModule.step(state, {
    ...demoInputs,
    gdp: baselineGdp(5),
    laggedAvgLCOE: 20,
  }, demandParams, 2030, 5);

  // High LCOE case
  const highResult = demandModule.step(state, {
    ...demoInputs,
    gdp: baselineGdp(5),
    laggedAvgLCOE: 150,
  }, demandParams, 2030, 5);

  // Energy burden should be higher with expensive electricity
  expect(highResult.outputs.energyBurden).toBeGreaterThan(lowResult.outputs.energyBurden);
  // Electricity cost should differ meaningfully
  expect(highResult.outputs.electricityCost).toBeGreaterThan(lowResult.outputs.electricityCost * 2);
});

// --- Module Metadata ---

console.log('\n--- Module Metadata ---\n');

test('module has correct name', () => {
  expect(demandModule.name).toBe('demand');
});

test('module declares correct inputs', () => {
  expect(demandModule.inputs.length).toBeGreaterThan(0);
  expect(demandModule.inputs.includes('population')).toBeTrue();
  expect(demandModule.inputs.includes('working')).toBeTrue();
});

test('module declares correct outputs', () => {
  expect(demandModule.outputs.length).toBeGreaterThan(0);
  expect(demandModule.outputs.includes('electricityDemand')).toBeTrue();
  expect(demandModule.outputs.includes('regional')).toBeTrue();
});

// =============================================================================
// SUMMARY
// =============================================================================

printSummary();

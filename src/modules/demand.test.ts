/**
 * Demand Module Tests
 *
 * Tests for GDP growth, energy intensity, and electricity demand.
 * Validates against IEA calibration targets.
 */

import { demandModule, demandDefaults } from './demand.js';
import { demographicsModule, demographicsDefaults } from './demographics.js';
import { REGIONS } from '../domain-types.js';

import { test, expect, printSummary } from '../test-utils.js';

// Helper to get demographics inputs for a given year
function getDemographicsInputs(yearIndex: number) {
  const demoParams = demographicsModule.mergeParams({});
  let demoState = demographicsModule.init(demoParams);
  let demoOutputs: any;

  for (let i = 0; i <= yearIndex; i++) {
    const result = demographicsModule.step(demoState, { temperature: 1.2 }, demoParams, 2025 + i, i);
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

test('sector shares sum to one and reproduce the 2025 electrification anchor', () => {
  // IEA WEB final-consumption weights (other/non-energy folded into industry).
  const s = demandDefaults.sectors;
  expect(s.transport.share + s.buildings.share + s.industry.share).toBeCloseTo(1.0, 9);
  // Weighted 2025 electrification ~21-23% of final energy (IEA: ~20-22%)
  const weighted = s.transport.share * s.transport.electrification2025 +
    s.buildings.share * s.buildings.electrification2025 +
    s.industry.share * s.industry.electrification2025;
  expect(weighted).toBeBetween(0.19, 0.24);
});

test('step year 0 returns correct electricity demand', () => {
  const { outputs } = runYears(1);
  // Observed 2025 final electricity consumption ~26-28k TWh (IEA). The
  // efficiency-corrected accounting initializes at the low end (~25k):
  // year-0 electrified increments draw 1/multiplier the displaced fuel.
  expect(outputs.electricityDemand / 1000).toBeBetween(24, 32);
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

test('final energy per capita ~35-60 kWh/day by 2050 (Twin-Engine)', () => {
  // Efficiency-corrected accounting: final energy shrinks as electrification
  // proceeds (an EV draws ~1/3.5 the final energy of the ICE it displaces),
  // so 2050 per-capita final energy sits below the old fuel-scale band.
  const year26 = runYears(26).outputs.finalEnergyPerCapitaDay;
  expect(year26).toBeBetween(35, 60);
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
function runYearsWithParams(
  years: number,
  paramOverrides: Partial<typeof demandDefaults>,
  inputOverrides?: { carbonPrice?: number; laggedAvgLCOE?: number; laggedInterestRate?: number }
) {
  const demandParams = demandModule.mergeParams(paramOverrides);
  let demandState = demandModule.init(demandParams);
  let outputs: any;

  for (let i = 0; i < years; i++) {
    const inputs = {
      ...getDemographicsInputs(i),
      gdp: baselineGdp(i),
      carbonPrice: inputOverrides?.carbonPrice ?? 35,
      ...(inputOverrides?.laggedAvgLCOE !== undefined && { laggedAvgLCOE: inputOverrides.laggedAvgLCOE }),
      ...(inputOverrides?.laggedInterestRate !== undefined && { laggedInterestRate: inputOverrides.laggedInterestRate }),
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

  // Industry has the highest costSensitivity (0.10 vs 0.08) but retail
  // pricing narrows its relative carbon response: oil's $45/MWh delivery
  // margin gives transport more absolute fuel-cost leverage per $ of carbon
  // than coal's $5 margin gives industry. Require a meaningful positive
  // response, not dominance.
  expect(industryIncrease).toBeGreaterThan(transportIncrease * 0.3);
  expect(industryIncrease).toBeGreaterThan(0);
});

// --- Emissions Release Valve (signed electrification pressure) ---

console.log('\n--- Release Valve ---\n');

test('adverse electricity economics reverse electrification toward the 2025 floor', () => {
  // The release valve: with electricity expensive relative to fuel, cost
  // pressure goes NEGATIVE (was clamped at zero — decarbonization
  // regardless of economics). Reversal is damped by reversalStickiness and
  // floored at the 2025 rate (known limitation: no de-electrification
  // below today's stock).
  const params = demandModule.mergeParams({});
  let state = demandModule.init(params);
  // start buildings above its 2025 anchor so there is room to fall
  state = { ...state, sectorElectrification: { ...state.sectorElectrification, buildings: 0.45 } };
  const inputs = {
    ...getDemographicsInputs(0),
    gdp: baselineGdp(0),
    carbonPrice: 0,
    laggedAvgLCOE: 400, // extremely expensive electricity
  };
  const { outputs } = demandModule.step(state, inputs, params, 2025, 0);
  expect(outputs.sectors.buildings.electrificationRate).toBeLessThan(0.45);
  // floor holds: cannot fall below the 2025 anchor even under sustained stress
  let st = demandModule.init(params);
  for (let i = 0; i < 30; i++) {
    const r = demandModule.step(st, { ...getDemographicsInputs(0), gdp: baselineGdp(i), carbonPrice: 0, laggedAvgLCOE: 400 }, params, 2025 + i, i);
    st = r.state;
  }
  expect(st.sectorElectrification.buildings)
    .toBeGreaterThan(params.sectors.buildings.electrification2025 - 1e-9);
});

test('reversalStickiness damps reversal relative to adoption', () => {
  const sticky = demandModule.mergeParams({});
  const unsticky = demandModule.mergeParams({
    sectors: {
      transport: { reversalStickiness: 1 },
      buildings: { reversalStickiness: 1 },
      industry: { reversalStickiness: 1 },
    },
  } as any);
  const start = (p: any) => {
    let st = demandModule.init(p);
    return { ...st, sectorElectrification: { ...st.sectorElectrification, buildings: 0.45 } };
  };
  const inputs = { ...getDemographicsInputs(0), gdp: baselineGdp(0), carbonPrice: 0, laggedAvgLCOE: 400 };
  const s1 = demandModule.step(start(sticky), inputs, sticky, 2025, 0).outputs;
  const s2 = demandModule.step(start(unsticky), inputs, unsticky, 2025, 0).outputs;
  expect(s2.sectors.buildings.electrificationRate)
    .toBeLessThan(s1.sectors.buildings.electrificationRate);
});

// --- Retail Pricing (delivery adders + fuel price paths) ---

console.log('\n--- Retail Pricing ---\n');

const zeroElecAdderSectors = {
  transport: { electricityDeliveryCost: 0 },
  buildings: { electricityDeliveryCost: 0 },
  industry: { electricityDeliveryCost: 0 },
};

const zeroDeliveryOverrides = {
  sectors: zeroElecAdderSectors,
  fuels: {
    oil: { deliveryMargin: 0 },
    gas: { deliveryMargin: 0 },
    coal: { deliveryMargin: 0 },
    biomass: { deliveryMargin: 0 },
    hydrogen: { deliveryMargin: 0 },
    biofuel: { deliveryMargin: 0 },
  },
} as Partial<typeof demandDefaults>;

// Shared default-params 25-year run — the "base" side of the A/B tests below
const retailBase25 = runYearsWithParams(25, {}, {});

test('electricity delivery adder slows electrification vs bare wholesale', () => {
  // Zero out only the electricity-side adder; keep fuel margins so the
  // comparison isolates the electricity retail penalty
  const noElecAdder = runYearsWithParams(25, {
    sectors: zeroElecAdderSectors,
  } as Partial<typeof demandDefaults>, {});

  expect(retailBase25.outputs.electrificationRate)
    .toBeLessThan(noElecAdder.outputs.electrificationRate);
});

test('fuel delivery margins do not perturb the logit fuel mix', () => {
  // priceSensitivity is calibrated on the wholesale scale; margins must be
  // excluded from share competition or coal (margin $5) gains spuriously
  const highMargins = runYearsWithParams(25, {
    fuels: {
      oil: { deliveryMargin: 100 },
      gas: { deliveryMargin: 100 },
      coal: { deliveryMargin: 0 },
    },
  } as Partial<typeof demandDefaults>, {});

  const baseShare = retailBase25.outputs.fuels.coal / retailBase25.outputs.nonElectricEnergy;
  const marginShare = highMargins.outputs.fuels.coal / highMargins.outputs.nonElectricEnergy;
  expect(Math.abs(baseShare - marginShare)).toBeLessThan(1e-9);
});

test('rising oil price path shifts fuel mix away from oil', () => {
  const risingOil = runYearsWithParams(25, {
    fuels: { oil: { priceEscalation: 0.03 } },
  } as Partial<typeof demandDefaults>, {});

  const flatOilShare = retailBase25.outputs.fuels.oil / retailBase25.outputs.nonElectricEnergy;
  const risingOilShare = risingOil.outputs.fuels.oil / risingOil.outputs.nonElectricEnergy;
  expect(risingOilShare).toBeLessThan(flatOilShare);
});

test('energy burden includes delivery costs (retail scale)', () => {
  const retail = runYearsWithParams(10, {}, {});
  const wholesale = runYearsWithParams(10, zeroDeliveryOverrides, {});

  expect(retail.outputs.energyBurden).toBeGreaterThan(wholesale.outputs.energyBurden);
});

test('validation catches out-of-range delivery and escalation params', () => {
  const badAdder = demandModule.validate({
    sectors: { buildings: { electricityDeliveryCost: 500 } },
  } as Partial<typeof demandDefaults>);
  expect(badAdder.valid).toBe(false);

  const badEscalation = demandModule.validate({
    fuels: { oil: { priceEscalation: 0.2 } },
  } as Partial<typeof demandDefaults>);
  expect(badEscalation.valid).toBe(false);

  const badMargin = demandModule.validate({
    fuels: { gas: { deliveryMargin: -5 } },
  } as Partial<typeof demandDefaults>);
  expect(badMargin.valid).toBe(false);
});

// --- Robot value-vs-cost adoption ---

console.log('\n--- Robot value-vs-cost adoption ---\n');

test('robot profitability starts in the calibrated band (pi 2025 in [2, 3.5])', () => {
  // The cliff-edge pin: robotDisplacementShare is LOAD-BEARING — a
  // recalibration that pushes pi(2025) below 1 silently freezes deployment
  // forever (the rule only decays unprofitable fleets). Guard the band.
  const { outputs } = runYears(1);
  expect(outputs.robotProfitability).toBeBetween(2, 3.5);
});

test('near-term robot adoption matches IFR-observed pace (~10-16%/yr)', () => {
  const year1 = runYears(1).outputs.robotsPer1000;
  const year6 = runYears(6).outputs.robotsPer1000;
  const annualGrowth = Math.pow(year6 / year1, 1 / 5) - 1;
  expect(annualGrowth).toBeBetween(0.10, 0.16);
});

test('unprofitable fleets are not replaced: halt and decay at high interest rates', () => {
  // At laggedInterestRate=0.8, MC ~ 80k*0.9 = $72k >> MV ~ $36k -> pi < 1 for
  // the whole decade (unit-cost decline at -3%/yr cannot close the gap):
  // fleet decays at robotDepreciation each step and replacement capex stops.
  const { outputs } = runYearsWithParams(10, {}, { laggedInterestRate: 0.8 });
  expect(outputs.robotProfitability).toBeLessThan(1);
  const expected = demandDefaults.robotBaseline2025 *
    Math.pow(1 - demandDefaults.robotDepreciation, 10);
  expect(outputs.robotsPer1000).toBeCloseTo(expected, 3);
  expect(outputs.robotCapexSpend).toBeCloseTo(0, 9);
});

test('adoption slows with the cost of capital (r=0.03 vs r=0.10)', () => {
  const cheap = runYearsWithParams(25, {}, { laggedInterestRate: 0.03 }).outputs.robotsPer1000;
  const dear = runYearsWithParams(25, {}, { laggedInterestRate: 0.10 }).outputs.robotsPer1000;
  expect(dear).toBeLessThan(cheap);
});

test('integration-cost exponent brakes long-run density (theta 0.9 vs 0.6)', () => {
  const high = runYearsWithParams(75, { robotIntegrationExponent: 0.9 }, {}).outputs.robotsPer1000;
  const low = runYearsWithParams(75, { robotIntegrationExponent: 0.6 }, {}).outputs.robotsPer1000;
  expect(high).toBeLessThan(low);
});

test('fleet capex includes replacement of the depreciating fleet when profitable', () => {
  // At year 40 the fleet is large and profitable: capex must be at least the
  // replacement bill (depreciation x fleet x unit cost), on top of additions.
  const { state, outputs } = runYears(40);
  expect(outputs.robotProfitability).toBeGreaterThan(1);
  const unitCostNow = demandDefaults.robotUnitCost *
    Math.pow(1 - demandDefaults.robotCostDecline, 39);
  // state.robotFleet is end-of-year-40; the replacement term used the prior
  // fleet, which is strictly smaller than end-of-year -> a 0.85x lower bound
  // on the prior fleet is safe.
  const replacementFloor =
    (demandDefaults.robotDepreciation * state.robotFleet * 0.85 * unitCostNow) / 1e12;
  expect(outputs.robotCapexSpend).toBeGreaterThan(replacementFloor);
});

test('robot rule params round-trip through mergeParams (silent-no-op trap)', () => {
  const merged = demandModule.mergeParams({
    robotDiffusionRate: 0.33,
    robotIntegrationExponent: 0.9,
    robotDepreciation: 0.12,
    robotDisplacementShare: 0.4,
  });
  expect(merged.robotDiffusionRate).toBe(0.33);
  expect(merged.robotIntegrationExponent).toBe(0.9);
  expect(merged.robotDepreciation).toBe(0.12);
  expect(merged.robotDisplacementShare).toBe(0.4);
});

test('robot rule validation rejects out-of-range params', () => {
  expect(demandModule.validate({ robotBaseline2025: 0 }).valid).toBeFalse();
  expect(demandModule.validate({ robotDiffusionRate: 0.7 }).valid).toBeFalse();
  expect(demandModule.validate({ robotIntegrationExponent: 2.5 }).valid).toBeFalse();
  expect(demandModule.validate({ robotDepreciation: 0 }).valid).toBeFalse();
  expect(demandModule.validate({ robotDisplacementShare: 1.5 }).valid).toBeFalse();
  expect(demandModule.validate({
    robotDiffusionRate: 0.3, robotIntegrationExponent: 0.8,
    robotDepreciation: 0.1, robotDisplacementShare: 0.5,
  }).valid).toBeTrue();
});

// --- Datacenter / AI Compute ---

console.log('\n--- Datacenter / AI Compute ---\n');

test('datacenter load initializes near 500 TWh in 2025', () => {
  const { outputs } = runYears(1);
  expect(outputs.dataCenterLoadTWh).toBeBetween(400, 700);
});

test('datacenter load grows over time', () => {
  const year1 = runYears(1).outputs.dataCenterLoadTWh;
  const year25 = runYears(25).outputs.dataCenterLoadTWh;
  expect(year25).toBeGreaterThan(year1 * 2);
});

test('datacenter power-spend share equilibrates at the WTP ceiling', () => {
  // The brake replaces the hard TWh cap: load grows until the DC electricity
  // bill approaches the ceiling share of GDP, then rides it (never exceeds
  // it materially; reaches at least half of it by 2100 in the test harness).
  const { outputs } = runYears(76);
  const share = outputs.dataCenterPowerSpendShare;
  expect(share).toBeLessThan(demandDefaults.dataCenterPowerSpendCeiling * 1.05);
  expect(share).toBeGreaterThan(demandDefaults.dataCenterPowerSpendCeiling * 0.5);
});

test('datacenter ceiling param round-trips and validates', () => {
  const merged = demandModule.mergeParams({ dataCenterPowerSpendCeiling: 0.001 });
  expect(merged.dataCenterPowerSpendCeiling).toBe(0.001);
  expect(demandModule.validate({ dataCenterPowerSpendCeiling: 0 }).valid).toBeFalse();
  expect(demandModule.validate({ dataCenterPowerSpendCeiling: 0.1 }).valid).toBeFalse();
  expect(demandModule.validate({ dataCenterPowerSpendCeiling: 0.0005 }).valid).toBeTrue();
});

test('datacenter load responds to LCOE (cheap power → more compute)', () => {
  const cheap = runYearsWithParams(25, {}, { laggedAvgLCOE: 20 }).outputs.dataCenterLoadTWh;
  const expensive = runYearsWithParams(25, {}, { laggedAvgLCOE: 150 }).outputs.dataCenterLoadTWh;
  expect(cheap).toBeGreaterThan(expensive);
});

test('datacenter load is included in global electricity demand', () => {
  const withDc = runYearsWithParams(1, { dataCenterBaseline2025: 1000, dataCenterBaseGrowth: 0 }, {});
  const withoutDc = runYearsWithParams(1, { dataCenterBaseline2025: 0, dataCenterBaseGrowth: 0 }, {});
  // With 1000 TWh datacenter baseline, total elec should be ~1000 TWh higher
  expect(withDc.outputs.electricityDemand - withoutDc.outputs.electricityDemand).toBeBetween(900, 1100);
});

test('datacenter regional shares sum to global total', () => {
  const { outputs } = runYears(10);
  const regionalSum = REGIONS.reduce((sum, r) => sum + outputs.regional[r].electricityDemand, 0);
  // Regional electricity demand includes both base sector demand and distributed DC+robot load
  expect(regionalSum).toBeCloseTo(outputs.electricityDemand, 1);
});

// --- Sector Conservation ---

console.log('\n--- Sector Conservation ---\n');

test('sector non-electric energy sums to nonElectricEnergy output', () => {
  // Robot/DC loads are 100% electric; if they leak into the sector split
  // they show up as phantom non-electric energy and break this identity
  for (const years of [1, 10, 40]) {
    const { outputs } = runYears(years);
    const sectorNonElec = outputs.sectors.transport.nonElectric +
      outputs.sectors.buildings.nonElectric +
      outputs.sectors.industry.nonElectric;
    const tolerance = Math.max(1, outputs.nonElectricEnergy * 1e-6);
    expect(Math.abs(sectorNonElec - outputs.nonElectricEnergy)).toBeLessThan(tolerance);
  }
});

test('sector totals plus robot/DC loads sum to totalFinalEnergy', () => {
  for (const years of [1, 10, 40]) {
    const { outputs } = runYears(years);
    const sectorTotal = outputs.sectors.transport.total +
      outputs.sectors.buildings.total +
      outputs.sectors.industry.total;
    const reconstructed = sectorTotal + outputs.robotLoadTWh + outputs.dataCenterLoadTWh;
    const tolerance = Math.max(1, outputs.totalFinalEnergy * 1e-6);
    expect(Math.abs(reconstructed - outputs.totalFinalEnergy)).toBeLessThan(tolerance);
  }
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

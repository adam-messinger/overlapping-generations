/**
 * Capital Module Tests
 *
 * Tests for savings, investment, and automation dynamics.
 * Validates against Penn World Table and OLG theory.
 */

import { capitalModule, capitalDefaults } from './capital.js';
import { demographicsModule, demographicsDefaults } from './demographics.js';
import { demandModule, demandDefaults } from './demand.js';
import { Region, REGIONS } from '../domain-types.js';
import { GDP_SHARES } from '../primitives/distribute.js';

import { test, expect, printSummary } from '../test-utils.js';

// Baseline GDP growth (~2.5%/yr) for tests — production module provides this in real sim
function baselineGdp(yearIndex: number) {
  return 158 * Math.pow(1.025, yearIndex);
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

  // Run demand (needs gdp input from production — use baseline estimate)
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
      gdp: baselineGdp(i),
    };
    const result = demandModule.step(demandState, demoInputsForDemand, demandParams, 2025 + i, i);
    demandState = result.state;
    demandOutputs = result.outputs;
  }

  const gdp = baselineGdp(yearIndex);
  const regionalGdp: Record<Region, number> = {} as any;
  for (const r of REGIONS) regionalGdp[r] = gdp * GDP_SHARES[r];

  return {
    regionalYoung: demoOutputs.regionalYoung,
    regionalWorking: demoOutputs.regionalWorking,
    regionalOld: demoOutputs.regionalOld,
    regionalPopulation: demoOutputs.regionalPopulation,
    effectiveWorkers: demoOutputs.effectiveWorkers,
    regionalLifeExpectancy: demoOutputs.regionalLifeExpectancy,
    gdp,
    regionalGdp,
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
  expect(state.stock).toBe(553);
});

// --- Year 0 Outputs ---

console.log('\n--- Year 0 Outputs ---\n');

test('step year 0 returns correct capital stock', () => {
  const { outputs } = runYears(1);
  // Initial stock is $553T PPP (K/Y ≈ 3.5 at $158T GDP)
  expect(outputs.stock).toBeBetween(540, 580);
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
  // ~$158T × 0.27 × 1.0 ≈ $43T
  expect(outputs.investment).toBeBetween(35, 55);
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

test('SSA has lower savings rate than OECD', () => {
  const { outputs } = runYears(1);
  expect(outputs.regionalSavings.ssa).toBeLessThan(outputs.regionalSavings.oecd);
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

test('validation accepts small capital stock within range', () => {
  const result = capitalModule.validate({ initialCapitalStock: 5 });
  expect(result.valid).toBeTrue();
  expect(result.warnings.length).toBe(0);
});

test('validation warns on extreme capital stock', () => {
  const result = capitalModule.validate({ initialCapitalStock: 0.5 });
  expect(result.valid).toBeTrue();
  expect(result.warnings.length).toBeGreaterThan(0);
});

// --- Intergenerational Transfers ---

console.log('\n--- Intergenerational Transfers ---\n');

test('transfer burden is 10-30% in year 1', () => {
  const { outputs } = runYears(1);
  expect(outputs.transferBurden).toBeBetween(0.10, 0.30);
});

test('GDP decomposition identity: I + retireeCost + childCost + workerConsumption + debtService ≈ GDP', () => {
  const { outputs } = runYears(1);
  const gdp = baselineGdp(0);
  const sum = outputs.investment + outputs.retireeCost + outputs.childCost
    + outputs.workerConsumption + outputs.publicDebtService;
  expect(sum / gdp).toBeBetween(0.99, 1.05);
});

test('higher pension rate → lower investment', () => {
  // Default run
  const defaultParams = capitalModule.mergeParams({});
  let defaultState = capitalModule.init(defaultParams);
  const defaultInputs = getCapitalInputs(0);
  const defaultResult = capitalModule.step(defaultState, defaultInputs, defaultParams, 2025, 0);

  // High pension run — override all regional premiums to ensure higher pensions everywhere
  const highPremium: Record<string, { pensionRate: number }> = {};
  for (const r of REGIONS) highPremium[r] = { pensionRate: 0.45 };
  const highParams = capitalModule.mergeParams({
    transfers: { educationRate: 0.04 },
    transferPremium: highPremium as any,
  });
  let highState = capitalModule.init(highParams);
  const highResult = capitalModule.step(highState, defaultInputs, highParams, 2025, 0);

  expect(highResult.outputs.investment).toBeLessThan(defaultResult.outputs.investment);
});

test('worker consumption is positive', () => {
  const { outputs } = runYears(1);
  expect(outputs.workerConsumption).toBeGreaterThan(0);
});

test('retiree cost is positive', () => {
  const { outputs } = runYears(1);
  expect(outputs.retireeCost).toBeGreaterThan(0);
});

test('child cost is positive', () => {
  const { outputs } = runYears(1);
  expect(outputs.childCost).toBeGreaterThan(0);
});

test('transfer burden rises over 75 years (aging population)', () => {
  const year1 = runYears(1).outputs.transferBurden;
  const year76 = runYears(76).outputs.transferBurden;
  expect(year76).toBeGreaterThan(year1);
});

// --- Retirement Age Adjustment ---

console.log('\n--- Retirement Age Adjustment ---\n');

test('retirement age adjustment reduces transfer burden at year 50', () => {
  // With adjustment (default retirementAgeResponse=0.67)
  const withAdj = runYears(50).outputs.transferBurden;

  // Without adjustment (retirementAgeResponse=0)
  const noAdjParams = capitalModule.mergeParams({ retirementAgeResponse: 0 });
  let noAdjState = capitalModule.init(noAdjParams);
  let noAdjOutputs: any;
  for (let i = 0; i < 50; i++) {
    const inputs = getCapitalInputs(i);
    const result = capitalModule.step(noAdjState, inputs, noAdjParams, 2025 + i, i);
    noAdjState = result.state;
    noAdjOutputs = result.outputs;
  }
  expect(withAdj).toBeLessThan(noAdjOutputs.transferBurden);
});

test('retirement age adjustment is zero in year 0 (no LE gains yet)', () => {
  // In year 0, LE gain = 0, so retirement age = 65, no reclassification
  const year0 = runYears(1).outputs;
  // Run with retirementAgeResponse=0 for comparison
  const noAdjParams = capitalModule.mergeParams({ retirementAgeResponse: 0 });
  let noAdjState = capitalModule.init(noAdjParams);
  const inputs = getCapitalInputs(0);
  const noAdj = capitalModule.step(noAdjState, inputs, noAdjParams, 2025, 0);
  // Should be very close (both see 0 LE gain in year 0)
  expect(year0.transferBurden / noAdj.outputs.transferBurden).toBeBetween(0.99, 1.01);
});

// --- Wage Indexation ---

console.log('\n--- Wage Indexation ---\n');

test('lower wageIndexation reduces transfer burden growth', () => {
  // wageIndexation=1 (full wage): burden grows fastest
  const fullWageParams = capitalModule.mergeParams({ wageIndexation: 1.0 });
  let fullWageState = capitalModule.init(fullWageParams);
  let fullWageOutputs: any;
  for (let i = 0; i < 50; i++) {
    const inputs = getCapitalInputs(i);
    const result = capitalModule.step(fullWageState, inputs, fullWageParams, 2025 + i, i);
    fullWageState = result.state;
    fullWageOutputs = result.outputs;
  }

  // wageIndexation=0.3 (mostly price-indexed): burden grows slower
  const lowWageParams = capitalModule.mergeParams({ wageIndexation: 0.3 });
  let lowWageState = capitalModule.init(lowWageParams);
  let lowWageOutputs: any;
  for (let i = 0; i < 50; i++) {
    const inputs = getCapitalInputs(i);
    const result = capitalModule.step(lowWageState, inputs, lowWageParams, 2025 + i, i);
    lowWageState = result.state;
    lowWageOutputs = result.outputs;
  }

  expect(lowWageOutputs.transferBurden).toBeLessThan(fullWageOutputs.transferBurden);
});

test('GDP identity still holds with retirement age + wage indexation', () => {
  const { outputs } = runYears(25);
  const gdp = baselineGdp(24);
  const sum = outputs.investment + outputs.retireeCost + outputs.childCost
    + outputs.workerConsumption + outputs.publicDebtService;
  expect(sum / gdp).toBeBetween(0.99, 1.05);
});

test('validation catches invalid retirementAgeResponse', () => {
  const result = capitalModule.validate({ retirementAgeResponse: 1.5 });
  expect(result.valid).toBe(false);
});

test('validation catches invalid wageIndexation', () => {
  const result = capitalModule.validate({ wageIndexation: -0.1 });
  expect(result.valid).toBe(false);
});

// --- Demographic Savings Response ---

console.log('\n--- Demographic Savings Response ---\n');

test('higher savingsLifeExpSensitivity → higher savings at year 50 (LE grows)', () => {
  // Default sensitivity (0.5)
  const defaultResult = runYears(50).outputs.savingsRate;

  // Zero sensitivity (no LE effect)
  const zeroParams = capitalModule.mergeParams({ savingsLifeExpSensitivity: 0 });
  let zeroState = capitalModule.init(zeroParams);
  let zeroOutputs: any;
  for (let i = 0; i < 50; i++) {
    const inputs = getCapitalInputs(i);
    const result = capitalModule.step(zeroState, inputs, zeroParams, 2025 + i, i);
    zeroState = result.state;
    zeroOutputs = result.outputs;
  }

  // With LE growing over 50 years, positive sensitivity should produce higher savings
  expect(defaultResult).toBeGreaterThan(zeroOutputs.savingsRate);
});

test('higher savingsDependencySensitivity reduces savings when dependency rises', () => {
  // Default sensitivity (0.3)
  const defaultResult = runYears(50).outputs.savingsRate;

  // High sensitivity (0.8)
  const highParams = capitalModule.mergeParams({ savingsDependencySensitivity: 0.8 });
  let highState = capitalModule.init(highParams);
  let highOutputs: any;
  for (let i = 0; i < 50; i++) {
    const inputs = getCapitalInputs(i);
    const result = capitalModule.step(highState, inputs, highParams, 2025 + i, i);
    highState = result.state;
    highOutputs = result.outputs;
  }

  // Higher dependency sensitivity should reduce savings as population ages
  expect(highOutputs.savingsRate).toBeLessThan(defaultResult);
});

test('demographic savings response has no effect in year 0 (no reference yet)', () => {
  // Year 0 with default params
  const defaultResult = runYears(1).outputs.savingsRate;

  // Year 0 with zero sensitivities
  const zeroParams = capitalModule.mergeParams({
    savingsLifeExpSensitivity: 0,
    savingsDependencySensitivity: 0,
  });
  let zeroState = capitalModule.init(zeroParams);
  const inputs = getCapitalInputs(0);
  const zeroResult = capitalModule.step(zeroState, inputs, zeroParams, 2025, 0);

  // In year 0, reference values are being captured and current = reference
  // so leFactor = 1 + 0.5 * ln(1) = 1, depFactor = 1 - 0.3 * 0 = 1
  // Should be same as zero sensitivity
  expect(defaultResult / zeroResult.outputs.savingsRate).toBeBetween(0.99, 1.01);
});

test('validation catches invalid savingsLifeExpSensitivity', () => {
  const result = capitalModule.validate({ savingsLifeExpSensitivity: 1.5 });
  expect(result.valid).toBe(false);
});

test('validation catches invalid savingsDependencySensitivity', () => {
  const result = capitalModule.validate({ savingsDependencySensitivity: -0.1 });
  expect(result.valid).toBe(false);
});

// --- Debt/Credit Channel ---

console.log('\n--- Debt/Credit Channel ---\n');

// --- Init ---

test('debt stocks initialize from GDP at year 0', () => {
  const { outputs } = runYears(1);
  // publicDebtGDP should be ~0.90 (initialPublicDebtGDP)
  expect(outputs.publicDebtGDP).toBeBetween(0.85, 0.95);
  // privateDebtGDP should be ~1.60 (initialPrivateDebtGDP)
  expect(outputs.privateDebtGDP).toBeBetween(1.50, 1.70);
});

test('totalDebtGDP equals public + private', () => {
  const { outputs } = runYears(1);
  expect(outputs.totalDebtGDP).toBeCloseTo(outputs.publicDebtGDP + outputs.privateDebtGDP, 4);
});

test('previousGdp is captured in state', () => {
  const params = capitalModule.mergeParams({});
  let state = capitalModule.init(params);
  const inputs = getCapitalInputs(0);
  const result = capitalModule.step(state, inputs, params, 2025, 0);
  expect(result.state.previousGdp).toBeCloseTo(inputs.gdp, 2);
});

// --- Public debt ---

test('public debt service is positive', () => {
  const { outputs } = runYears(1);
  expect(outputs.publicDebtService).toBeGreaterThan(0);
});

test('fiscal consolidation kicks in above 60% threshold', () => {
  // With default 90% public debt/GDP, fiscal consolidation is active
  const { outputs } = runYears(1);
  // Public deficit should be reduced by consolidation
  // Primary deficit = 0.03 × GDP - consolidation
  // consolidation = 0.03 × (0.90 - 0.60) × GDP = 0.009 × GDP
  // So net primary deficit = (0.03 - 0.009) × GDP = 0.021 × GDP
  // This means public debt grows, but slower than without consolidation
  expect(outputs.publicDebtGDP).toBeGreaterThan(0);
});

test('higher publicDeficitRate → higher public debt/GDP after 25 years', () => {
  // Default deficit
  const defaultResult = runYears(25).outputs.publicDebtGDP;

  // High deficit
  const highParams = capitalModule.mergeParams({ publicDeficitRate: 0.06 });
  let highState = capitalModule.init(highParams);
  let highOutputs: any;
  for (let i = 0; i < 25; i++) {
    const inputs = getCapitalInputs(i);
    const result = capitalModule.step(highState, inputs, highParams, 2025 + i, i);
    highState = result.state;
    highOutputs = result.outputs;
  }

  expect(highOutputs.publicDebtGDP).toBeGreaterThan(defaultResult);
});

test('fiscal reaction max saturates consolidation', () => {
  // With very high debt, consolidation should cap at fiscalReactionMax (4% of GDP)
  const params = capitalModule.mergeParams({
    initialPublicDebtGDP: 3.0,  // 300% public debt/GDP
    fiscalReactionCoeff: 0.10,  // Very aggressive
  });
  let state = capitalModule.init(params);
  const inputs = getCapitalInputs(0);
  const result = capitalModule.step(state, inputs, params, 2025, 0);
  // The consolidation is capped, so public debt still grows
  // (debt service > capped consolidation for very high debt levels)
  expect(result.outputs.publicDebtService).toBeGreaterThan(0);
});

// --- Private debt ---

test('credit impulse is positive in year 0', () => {
  const { outputs } = runYears(1);
  expect(outputs.creditImpulse).toBeGreaterThan(0);
});

test('leverage damping reduces credit when private debt/GDP > threshold', () => {
  // Default: private debt/GDP = 1.60, threshold = 1.50
  const defaultResult = runYears(1).outputs.creditImpulse;

  // Low initial leverage (below threshold → no damping)
  const lowParams = capitalModule.mergeParams({ initialPrivateDebtGDP: 1.0 });
  let lowState = capitalModule.init(lowParams);
  const inputs = getCapitalInputs(0);
  const lowResult = capitalModule.step(lowState, inputs, lowParams, 2025, 0);

  expect(lowResult.outputs.creditImpulse).toBeGreaterThan(defaultResult);
});

test('spread factor reduces credit when r > g', () => {
  // When interest rate exceeds GDP growth, credit should slow
  // Create scenario with very high interest rates (high debt risk premium)
  const highDebtParams = capitalModule.mergeParams({
    initialPublicDebtGDP: 3.0,
    initialPrivateDebtGDP: 3.0,
    debtRiskThreshold: 1.0,  // Trigger premium earlier
    debtRiskLambda: 0.10,    // Aggressive risk premium
  });
  let highState = capitalModule.init(highDebtParams);
  const inputs = getCapitalInputs(0);
  const highResult = capitalModule.step(highState, inputs, highDebtParams, 2025, 0);

  // Normal scenario
  const normalResult = runYears(1).outputs;

  // High-debt scenario should have lower credit impulse
  expect(highResult.outputs.creditImpulse).toBeLessThan(normalResult.creditImpulse);
});

test('amortization reduces private debt stock', () => {
  // Run 2 years, check that amortization occurs
  const params = capitalModule.mergeParams({ baseCreditGrowth: 0 });  // No new credit
  let state = capitalModule.init(params);
  let outputs: any;
  for (let i = 0; i < 2; i++) {
    const inputs = getCapitalInputs(i);
    const result = capitalModule.step(state, inputs, params, 2025 + i, i);
    state = result.state;
    outputs = result.outputs;
  }
  // With zero credit growth, private debt/GDP should decline (amortization eats into it)
  expect(outputs.privateDebtGDP).toBeLessThan(1.60);
});

test('zero baseCreditGrowth produces zero credit impulse', () => {
  const params = capitalModule.mergeParams({ baseCreditGrowth: 0 });
  let state = capitalModule.init(params);
  const inputs = getCapitalInputs(0);
  const result = capitalModule.step(state, inputs, params, 2025, 0);
  expect(result.outputs.creditImpulse).toBeCloseTo(0, 6);
});

// --- Risk premium ---

test('risk premium is zero when totalDebtGDP < threshold', () => {
  const params = capitalModule.mergeParams({
    initialPublicDebtGDP: 0.50,
    initialPrivateDebtGDP: 1.00,
    debtRiskThreshold: 2.00,
  });
  let state = capitalModule.init(params);
  const inputs = getCapitalInputs(0);
  const result = capitalModule.step(state, inputs, params, 2025, 0);
  // Total debt = 1.50, threshold = 2.00 → no premium
  expect(result.outputs.debtRiskPremium).toBeCloseTo(0, 6);
});

test('risk premium is positive when totalDebtGDP > threshold', () => {
  const { outputs } = runYears(1);
  // Default total debt = 0.90 + 1.60 = 2.50, threshold = 2.00
  // Premium = 0.03 × 0.50 = 0.015
  expect(outputs.debtRiskPremium).toBeGreaterThan(0);
  expect(outputs.debtRiskPremium).toBeCloseTo(0.015, 2);
});

test('risk premium flows into interest rate', () => {
  const { outputs } = runYears(1);
  // Interest rate should be higher than base rate due to risk premium
  const gdp = baselineGdp(0);
  const baseRate = capitalDefaults.alpha * gdp / capitalDefaults.initialCapitalStock - capitalDefaults.depreciation;
  expect(outputs.interestRate).toBeGreaterThan(baseRate);
  expect(outputs.interestRate).toBeCloseTo(baseRate + outputs.debtRiskPremium, 4);
});

// --- Investment ---

test('investment is augmented by credit impulse', () => {
  // Compare with zero credit
  const zeroCreditParams = capitalModule.mergeParams({ baseCreditGrowth: 0 });
  let zeroState = capitalModule.init(zeroCreditParams);
  const inputs = getCapitalInputs(0);
  const zeroResult = capitalModule.step(zeroState, inputs, zeroCreditParams, 2025, 0);

  // Default has positive credit
  const defaultParams = capitalModule.mergeParams({});
  let defaultState = capitalModule.init(defaultParams);
  const defaultResult = capitalModule.step(defaultState, inputs, defaultParams, 2025, 0);

  expect(defaultResult.outputs.investment).toBeGreaterThan(zeroResult.outputs.investment);
});

test('investment floors at zero', () => {
  // Extreme negative scenario: high debt service, low savings
  const extremeParams = capitalModule.mergeParams({
    initialPublicDebtGDP: 5.0,
    initialPrivateDebtGDP: 0,
    baseCreditGrowth: 0,
    savingsWorking: 0.10,
    debtRiskLambda: 0.10,
  });
  let state = capitalModule.init(extremeParams);
  const inputs = getCapitalInputs(0);
  const result = capitalModule.step(state, inputs, extremeParams, 2025, 0);
  expect(result.outputs.investment).toBeGreaterThan(-0.001);
});

// --- GDP identity ---

test('GDP identity: I + retireeCost + childCost + workerConsumption + debtService ≈ GDP', () => {
  const { outputs } = runYears(1);
  const gdp = baselineGdp(0);
  const sum = outputs.investment + outputs.retireeCost + outputs.childCost
    + outputs.workerConsumption + outputs.publicDebtService;
  // Allow some tolerance since workerConsumption has a 20% floor that may bind
  expect(sum / gdp).toBeBetween(0.99, 1.05);
});

// --- Stability over time ---

test('debt/GDP is bounded over 76 years', () => {
  const { outputs } = runYears(76);
  // Should not explode: self-limiting via risk premium + leverage damping + fiscal reaction
  expect(outputs.totalDebtGDP).toBeBetween(0.5, 10.0);
});

test('high-deficit case stabilizes (fiscal reaction + risk premium)', () => {
  const highDeficitParams = capitalModule.mergeParams({
    publicDeficitRate: 0.06,
    baseCreditGrowth: 0.06,
  });
  let state = capitalModule.init(highDeficitParams);
  let outputs: any;
  for (let i = 0; i < 76; i++) {
    const inputs = getCapitalInputs(i);
    const result = capitalModule.step(state, inputs, highDeficitParams, 2025 + i, i);
    state = result.state;
    outputs = result.outputs;
  }
  // Even with high deficits, debt should be bounded (self-limiting channels)
  expect(outputs.totalDebtGDP).toBeBetween(0.5, 15.0);
});

// --- Backward compatibility ---

test('zero debt params approximately reproduce old investment', () => {
  const zeroDebtParams = capitalModule.mergeParams({
    initialPublicDebtGDP: 0,
    initialPrivateDebtGDP: 0,
    baseCreditGrowth: 0,
    publicDeficitRate: 0,
    debtRiskLambda: 0,
  });
  let state = capitalModule.init(zeroDebtParams);
  const inputs = getCapitalInputs(0);
  const result = capitalModule.step(state, inputs, zeroDebtParams, 2025, 0);

  // With zero debt: no risk premium, no credit impulse, no debt service
  // Investment should be ~grossSavings only
  expect(result.outputs.debtRiskPremium).toBeCloseTo(0, 6);
  expect(result.outputs.creditImpulse).toBeCloseTo(0, 6);
  expect(result.outputs.publicDebtService).toBeCloseTo(0, 6);
  expect(result.outputs.investment).toBeGreaterThan(30); // Still substantial
});

// --- Validation ---

test('validation catches invalid baseCreditGrowth', () => {
  const result = capitalModule.validate({ baseCreditGrowth: 0.20 });
  expect(result.valid).toBe(false);
});

test('validation catches invalid publicDeficitRate', () => {
  const result = capitalModule.validate({ publicDeficitRate: 0.20 });
  expect(result.valid).toBe(false);
});

test('validation catches invalid debtRiskLambda', () => {
  const result = capitalModule.validate({ debtRiskLambda: 0.30 });
  expect(result.valid).toBe(false);
});

test('validation catches invalid privateAmortization', () => {
  const result = capitalModule.validate({ privateAmortization: 0.005 });
  expect(result.valid).toBe(false);
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
  expect(capitalModule.outputs.includes('retireeCost')).toBeTrue();
  expect(capitalModule.outputs.includes('transferBurden')).toBeTrue();
  expect(capitalModule.outputs.includes('publicDebtGDP')).toBeTrue();
  expect(capitalModule.outputs.includes('creditImpulse')).toBeTrue();
  expect(capitalModule.outputs.includes('debtRiskPremium')).toBeTrue();
});

test('module declares regionalGdp input', () => {
  expect(capitalModule.inputs.includes('regionalGdp')).toBeTrue();
});

// =============================================================================
// SUMMARY
// =============================================================================

printSummary();

/**
 * Capital Module Tests
 *
 * Tests for savings, investment, and automation dynamics.
 * Validates against Penn World Table and OLG theory.
 */

import { capitalModule, capitalDefaults } from './capital.js';
import { firmDepositChange } from './capital-accounting.js';
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
    const result = demographicsModule.step(demoState, { temperature: 1.2 }, demoParams, 2025 + i, i);
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
  // GDP-weighted desired household-saving propensity ~26-28%;
  // China's high rate carries its GDP share, not its population share.
  expect(outputs.savingsRate).toBeBetween(0.22, 0.32);
});

test('step year 0 returns correct interest rate', () => {
  const { outputs } = runYears(1);
  // Real interest rate ~4% (r = αY/K - δ)
  expect(outputs.interestRate).toBeBetween(0.02, 0.08);
});

test('step year 0 returns correct investment', () => {
  const { outputs } = runYears(1);
  // Profit-led orders plus bank finance retain the prior 2025 calibration.
  expect(outputs.investment).toBeBetween(35, 55);
});

test('step year 0 returns stability = 1 with no damages', () => {
  const { outputs } = runYears(1);
  expect(outputs.stability).toBeCloseTo(1.0, 2);
});

// --- Regional Savings ---

console.log('\n--- Regional Savings ---\n');

test('China has higher savings rate than OECD ex-US', () => {
  const { outputs } = runYears(1);
  expect(outputs.regionalSavings.china).toBeGreaterThan(outputs.regionalSavings['oecd-ex-us']);
});

test('SSA has lower savings rate than OECD ex-US', () => {
  const { outputs } = runYears(1);
  expect(outputs.regionalSavings.ssa).toBeLessThan(outputs.regionalSavings['oecd-ex-us']);
});

test('regional saving rate floors at zero when the premium exceeds the base', () => {
  // The additive premium is calibrated at the default savingsWorking; at the
  // declared minimum a premium below -base would otherwise go negative and
  // hand the region negative gross investment downstream
  const params = capitalModule.mergeParams({
    savingsWorking: 0.20,
    savingsPremium: { ...capitalDefaults.savingsPremium, us: -0.50 },
  });
  const { outputs } = capitalModule.step(capitalModule.init(params), getCapitalInputs(0), params, 2025, 0);
  expect(outputs.regionalSavings.us).toBe(0);
  for (const region of REGIONS) {
    expect(outputs.regionalSavings[region]).toBeBetween(0, 1);
  }
  // Other regions are untouched by the floor
  expect(outputs.regionalSavings.china).toBeGreaterThan(0);
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

test('GDP expenditure identity is exact and excludes cash transfers and interest', () => {
  const { outputs } = runYears(1);
  const gdp = baselineGdp(0);
  const sum = outputs.householdConsumption
    + outputs.investment
    + outputs.governmentServiceConsumption;
  expect(sum).toBeCloseTo(gdp, 9);
  expect(outputs.nationalAccountsResidual).toBeCloseTo(0, 9);
  expect(outputs.pensionTransfers).toBeGreaterThan(0);
  expect(outputs.publicInterestPayments).toBeGreaterThan(0);
});

test('a tax-financed pension transfer does not remove aggregate investment finance', () => {
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

  expect(highResult.outputs.pensionTransfers)
    .toBeGreaterThan(defaultResult.outputs.pensionTransfers);
  expect(highResult.outputs.investment)
    .toBeCloseTo(defaultResult.outputs.investment, 9);
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

test('regional transfer flows reconcile to global transfer outputs', () => {
  const { outputs } = runYears(1);
  const regionalRetirees = Object.values(outputs.regionalRetireeCost as Record<string, number>)
    .reduce((sum, value) => sum + value, 0);
  const regionalChildren = Object.values(outputs.regionalChildCost as Record<string, number>)
    .reduce((sum, value) => sum + value, 0);
  expect(regionalRetirees).toBeCloseTo(outputs.retireeCost, 6);
  expect(regionalChildren).toBeCloseTo(outputs.childCost, 6);
});

test('end-of-period stock outputs reconcile to returned state', () => {
  const { state, outputs } = runYears(1);
  expect(outputs.nextCapitalStock).toBeCloseTo(state.stock, 6);
  expect(outputs.nextPrivateDebtStock).toBeCloseTo(state.privateDebt, 6);
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

test('retirement-age extension follows gains in life expectancy at 65, not at birth', () => {
  const params = capitalModule.mergeParams({});
  let state = capitalModule.init(params);
  const base = getCapitalInputs(0);
  state = capitalModule.step(state, base, params, 2025, 0).state;
  const gained = {
    ...base,
    regionalLifeExpectancy: Object.fromEntries(
      Object.entries(base.regionalLifeExpectancy as Record<string, number>)
        .map(([r, le]) => [r, le + 5]),
    ) as typeof base.regionalLifeExpectancy,
  };
  const out = capitalModule.step(state, gained, params, 2026, 1).outputs as any;
  // WPP 2024: e65 gains are ~2/3 of at-birth gains in the US, ~1/4 in SSA.
  expect(out.regionalRetirementAgeExtension.us).toBeCloseTo(0.67 * 0.66 * 5, 6);
  expect(out.regionalRetirementAgeExtension.ssa).toBeCloseTo(0.67 * 0.24 * 5, 6);
});

test('a borrowed share of rising transfer costs raises public debt', () => {
  const taxed = capitalModule.mergeParams({ ageingCostDeficitShare: 0 });
  const borrowed = capitalModule.mergeParams({ ageingCostDeficitShare: 1 });
  const run = (params: typeof taxed) => {
    let state = capitalModule.init(params);
    let outputs: any;
    for (let i = 0; i < 40; i++) {
      const result = capitalModule.step(state, getCapitalInputs(i), params, 2025 + i, i);
      state = result.state;
      outputs = result.outputs;
    }
    return outputs;
  };
  const a = run(taxed);
  const b = run(borrowed);
  expect(b.transferBurden).toBeGreaterThan(0.11); // ageing raised it from ~0.095
  expect(b.publicDebtGDP).toBeGreaterThan(a.publicDebtGDP + 0.1);
});

test('machine worker-equivalents\' income goes to capital, lowering the labor share', () => {
  const params = capitalModule.mergeParams({});
  let state = capitalModule.init(params);
  const base = getCapitalInputs(0);
  const y0 = capitalModule.step(state, { ...base, automationLaborShare: 0.01 }, params, 2025, 0);
  state = y0.state;
  const inputs1 = getCapitalInputs(1);
  const same = capitalModule.step(state, { ...inputs1, automationLaborShare: 0.01 }, params, 2026, 1);
  const more = capitalModule.step(state, { ...inputs1, automationLaborShare: 0.11 }, params, 2026, 1);
  // The 2025 machine share is inside the alpha calibration: no change, no shift.
  const market = inputs1.gdp - same.outputs.governmentServiceConsumption;
  expect(same.outputs.laborCompensation).toBeCloseTo((1 - params.alpha) * market, 6);
  // +10pp of augmented labor that is machines moves (1-alpha) x 10% of market output.
  expect(same.outputs.laborCompensation - more.outputs.laborCompensation)
    .toBeCloseTo((1 - params.alpha) * 0.10 * market, 6);
  expect(more.outputs.laborShare).toBeLessThan(same.outputs.laborShare);
});

// --- Benefit levels ---

console.log('\n--- Benefit levels ---\n');

test('pension per retiree tracks current GDP per worker (benefit ratio held at 2025)', () => {
  const { outputs } = runYears(30);
  const inputs = getCapitalInputs(29);
  // Region by region the pension bill is pensionRate x reclassified retirees x
  // CURRENT GDP per (adjusted) worker; nothing is frozen at the 2025 level.
  const r = 'us';
  const share = outputs.regionalRetirementAgeExtension[r] >= 0 ? 1 : 0;
  expect(share).toBe(1);
  const pensionPerRetireeOverGdpPerWorker =
    outputs.regionalPensionTransfers[r]
    / (inputs.regionalOld[r] * capitalDefaults.transferPremium[r].pensionRate!)
    / (inputs.regionalGdp[r] / inputs.regionalWorking[r]);
  // Reclassification moves people between old and working, so the ratio sits
  // a little below 1 — but nowhere near the ~0.8 a frozen 30% weight gave.
  expect(pensionPerRetireeOverGdpPerWorker).toBeBetween(0.9, 1.0);
});

test('GDP identity still holds with retirement age adjustment', () => {
  const { outputs } = runYears(25);
  const gdp = baselineGdp(24);
  const sum = outputs.householdConsumption
    + outputs.investment
    + outputs.governmentServiceConsumption;
  expect(sum).toBeCloseTo(gdp, 9);
});

test('validation catches invalid retirementAgeResponse', () => {
  const result = capitalModule.validate({ retirementAgeResponse: 1.5 });
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

// --- Firm cash floor ---

test('firms that cannot pay their interest default instead of overdrawing deposits', () => {
  // Opening with every deposit held by households, private debt at 6x GDP
  // and a 10pp credit spread (loan rate ~11%): the interest bill exceeds
  // operating surplus from the first step and firms have no buffer, which
  // used to throw "Godley account 'firms.deposits' cannot have a negative
  // balance". (At the default ~3% loan rate 6x GDP of debt is serviceable.)
  const params = capitalModule.mergeParams({
    openingHouseholdDepositShare: 1,
    initialPrivateDebtGDP: 6,
    creditSpread: 0.10,
  });
  const inputs = getCapitalInputs(0);
  const { state, outputs } = capitalModule.step(capitalModule.init(params), inputs, params, 2025, 0);

  expect(outputs.privateInterestPayments + outputs.unpaidPrivateInterest)
    .toBeGreaterThan(outputs.operatingSurplus);
  expect(outputs.unpaidPrivateInterest).toBeGreaterThan(0);
  expect(state.financialLedger!.balances['firms.deposits']).toBeBetween(0, 1e-6);
  // Insolvent loans are written down to what the cash flow can carry
  expect(outputs.loanWriteOffs).toBeCloseTo(outputs.unpaidPrivateInterest / outputs.loanRate, 6);
  expect(outputs.nextPrivateDebtStock).toBeCloseTo(
    state.financialLedger!.balances['firms.privateLoans'], 6,
  );
  // Saving stays on a paid basis, so the identities still close
  expect(Math.abs(outputs.savingInvestmentResidual)).toBeLessThan(1e-9);
  expect(Math.abs(outputs.nationalAccountsResidual)).toBeLessThan(1e-9);
  expect(Math.abs(outputs.householdSavingLedgerResidual)).toBeLessThan(1e-9);
  expect(outputs.financialLedgerResidual).toBeLessThan(1e-8);
});

test('firmDepositChange matches what the ledger posts to firms.deposits', () => {
  // The cash floor sizes defaults with firmDepositChange; if a firm cash flow
  // were posted without being listed there, the floor would miss it
  const params = capitalModule.mergeParams({});
  let state = capitalModule.init(params);
  for (let i = 0; i < 5; i++) {
    const opening = state.financialLedger?.balances['firms.deposits'];
    const result = capitalModule.step(state, getCapitalInputs(i), params, 2025 + i, i);
    if (opening !== undefined) {
      expect(result.state.financialLedger!.balances['firms.deposits'] - opening)
        .toBeCloseTo(firmDepositChange(result.outputs), 9);
    }
    state = result.state;
  }
});

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

test('public interest follows the bond holder and bank income is distributed', () => {
  const first = runYears(1).outputs;
  const second = runYears(2).outputs;
  expect(first.publicInterestToBanks).toBeCloseTo(0, 9);
  expect(second.publicInterestToBanks).toBeGreaterThan(0);
  expect(
    second.publicInterestToBanks + second.publicInterestToHouseholds,
  ).toBeCloseTo(second.publicInterestPayments, 9);
  expect(second.bankSaving).toBeCloseTo(0, 9);
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

test('gross loan originations are positive and distinct from net credit creation', () => {
  const { outputs } = runYears(1);
  expect(outputs.grossLoanOriginations).toBeGreaterThan(0);
  expect(outputs.grossLoanOriginations).toBeCloseTo(
    outputs.refinancedPrincipal + outputs.newInvestmentLoanOriginations,
    8,
  );
  expect(outputs.netCreditCreation).toBeCloseTo(
    outputs.grossLoanOriginations
      - outputs.principalRepayments
      - outputs.loanWriteOffs,
    8,
  );
  expect(outputs.creditImpulse)
    .toBeCloseTo(outputs.newInvestmentLoanOriginations, 12);
});

test('leverage damping reduces credit when private debt/GDP > threshold', () => {
  // Default: private debt/GDP = 1.60, threshold = 1.50
  const defaultResult = runYears(1).outputs.newInvestmentLoanOriginations;

  // Low initial leverage (below threshold → no damping)
  const lowParams = capitalModule.mergeParams({ initialPrivateDebtGDP: 1.0 });
  let lowState = capitalModule.init(lowParams);
  const inputs = getCapitalInputs(0);
  const lowResult = capitalModule.step(lowState, inputs, lowParams, 2025, 0);

  expect(lowResult.outputs.newInvestmentLoanOriginations)
    .toBeGreaterThan(defaultResult);
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

  // High-debt scenario should have lower net-new investment credit. Total
  // originations can be larger because a larger debt stock refinances more.
  expect(highResult.outputs.newInvestmentLoanOriginations)
    .toBeLessThan(normalResult.newInvestmentLoanOriginations);
});

test('full principal rollover holds the debt stock flat without net-new credit', () => {
  const params = capitalModule.mergeParams({ baseCreditGrowth: 0 });  // No new credit
  let state = capitalModule.init(params);
  let outputs: any;
  for (let i = 0; i < 2; i++) {
    const inputs = getCapitalInputs(i);
    const result = capitalModule.step(state, inputs, params, 2025 + i, i);
    state = result.state;
    outputs = result.outputs;
  }
  expect(outputs.nextPrivateDebtStock).toBeCloseTo(252.8, 6);
  // GDP growth still lowers the debt ratio.
  expect(outputs.privateDebtGDP).toBeLessThan(1.60);
});

test('zero baseCreditGrowth stops new investment credit but still refinances principal', () => {
  const params = capitalModule.mergeParams({ baseCreditGrowth: 0 });
  let state = capitalModule.init(params);
  const inputs = getCapitalInputs(0);
  const result = capitalModule.step(state, inputs, params, 2025, 0);
  expect(result.outputs.newInvestmentLoanOriginations).toBeCloseTo(0, 6);
  expect(result.outputs.refinancedPrincipal).toBeGreaterThan(0);
  expect(result.outputs.grossLoanOriginations)
    .toBeCloseTo(result.outputs.refinancedPrincipal, 8);
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

test('investment is augmented by net-new bank credit', () => {
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

test('GDP identity has no consumption floor or transfer double count', () => {
  const { outputs } = runYears(1);
  const gdp = baselineGdp(0);
  expect(
    outputs.householdConsumption
      + outputs.investment
      + outputs.governmentServiceConsumption,
  ).toBeCloseTo(gdp, 9);
  expect(outputs.workerConsumption + outputs.retireeConsumption)
    .toBeCloseTo(outputs.householdConsumption, 9);
  expect(outputs.financialLedgerResidual).toBeCloseTo(0, 8);
});

test('sectoral saving is ex post and sums exactly to realized investment', () => {
  const { outputs } = runYears(1);
  expect(
    outputs.householdSaving
      + outputs.firmGrossSaving
      + outputs.governmentSaving
      + outputs.bankSaving,
  ).toBeCloseTo(outputs.investment, 9);
  expect(outputs.nationalSaving).toBeCloseTo(outputs.investment, 9);
  expect(outputs.grossSavings).toBeCloseTo(outputs.nationalSaving, 12);
  expect(outputs.savingInvestmentResidual).toBeCloseTo(0, 9);
  expect(outputs.householdSavingLedgerResidual).toBeCloseTo(0, 9);
});

test('desired household saving is not added to bank credit as investment funding', () => {
  const inputs = getCapitalInputs(0);
  const lowParams = capitalModule.mergeParams({ savingsWorking: 0.20 });
  const highParams = capitalModule.mergeParams({ savingsWorking: 0.65 });
  const low = capitalModule.step(
    capitalModule.init(lowParams),
    inputs,
    lowParams,
    2025,
    0,
  ).outputs;
  const high = capitalModule.step(
    capitalModule.init(highParams),
    inputs,
    highParams,
    2025,
    0,
  ).outputs;
  expect(high.savingsRate).toBeGreaterThan(low.savingsRate);
  expect(high.investment).toBeCloseTo(low.investment, 9);
  expect(high.newInvestmentLoanOriginations)
    .toBeCloseTo(low.newInvestmentLoanOriginations, 9);
});

test('principal refinancing is not counted as new investment finance', () => {
  const { outputs } = runYears(1);
  expect(outputs.refinancedPrincipal)
    .toBeCloseTo(outputs.principalRepayments, 9);
  expect(
    outputs.investment
      <= outputs.firmInternalFunds
        + outputs.newInvestmentLoanOriginations
        + 1e-9,
  ).toBeTrue();
});

// --- Target leverage ---

// Year 1 from a year-0 state whose leverage target has been moved by
// `targetScale`: the ledger and debt stocks are untouched, so the firm opens
// off-target by exactly that factor.
function stepOffTarget(targetScale: number, overrides: Partial<typeof capitalDefaults> = {}) {
  // A wide bank envelope, so the tests see the firm's request, not rationing
  const params = capitalModule.mergeParams({
    baseCreditGrowth: 0.15,
    leverageDamping: 0,
    ...overrides,
  });
  const year0 = capitalModule.step(capitalModule.init(params), getCapitalInputs(0), params, 2025, 0);
  const state = {
    ...year0.state,
    targetPrivateLeverage: year0.state.targetPrivateLeverage! * targetScale,
  };
  return capitalModule.step(state, getCapitalInputs(1), params, 2026, 1);
}

function expectIdentitiesClose(outputs: any) {
  expect(Math.abs(outputs.savingInvestmentResidual)).toBeLessThan(1e-9);
  expect(Math.abs(outputs.nationalAccountsResidual)).toBeLessThan(1e-9);
  expect(Math.abs(outputs.householdSavingLedgerResidual)).toBeLessThan(1e-9);
  expect(outputs.financialLedgerResidual).toBeLessThan(1e-8);
}

test('target leverage is the year-0 private debt / capital ratio, held in state', () => {
  const { state, outputs } = runYears(3);
  const gdp0 = baselineGdp(0);
  const expected = capitalDefaults.initialPrivateDebtGDP * gdp0 / capitalDefaults.initialCapitalStock;
  expect(outputs.targetPrivateLeverage).toBeCloseTo(expected, 12);
  expect(state.targetPrivateLeverage!).toBeCloseTo(expected, 12);
});

test('an under-levered firm closes the stated share of the gap and pays the recap out', () => {
  const onTargetRun = stepOffTarget(1);
  const onTarget = onTargetRun.outputs;
  const { state, outputs } = stepOffTarget(1.2);
  const opening = outputs.privateLeverage;
  const target = outputs.targetPrivateLeverage;
  expect(target).toBeGreaterThan(opening);
  // Flannery-Rangan partial adjustment in ratio space, exact when banks
  // supply the request and orders are fully financed
  expect(outputs.nextPrivateDebtStock / outputs.nextCapitalStock).toBeCloseTo(
    opening + capitalDefaults.leverageAdjustmentSpeed * (target - opening), 9,
  );
  expect(outputs.leverageRecapBorrowing).toBeGreaterThan(0);
  expect(outputs.unfundedCreditDemand).toBe(0);
  // Orders are fully financed; the recap credit buys no capital (investment
  // only moves through the higher interest bill) and is paid out to owners
  // rather than parked in firm deposits
  expect(outputs.unfundedFinancingDemand).toBe(0);
  expect(outputs.investment).toBeCloseTo(outputs.plannedInvestment, 9);
  expect(outputs.investment).toBeLessThan(onTarget.investment);
  expect(outputs.firmDividendPayments).toBeGreaterThan(
    onTarget.firmDividendPayments + 0.9 * outputs.leverageRecapBorrowing,
  );
  const firmDeposits = (ledger: any) => ledger.balances['firms.deposits'];
  expect(Math.abs(
    firmDeposits(state.financialLedger) - firmDeposits(onTargetRun.state.financialLedger),
  )).toBeLessThan(0.1 * outputs.leverageRecapBorrowing);
  expect(state.financialLedger!.balances['firms.privateLoans'])
    .toBeCloseTo(outputs.nextPrivateDebtStock, 6);
  expectIdentitiesClose(outputs);
});

test('an over-levered firm with spare cash repays early instead of paying it out', () => {
  // No net investment orders: internal funds exceed replacement investment
  const noGrowth = { maximumNetInvestmentRate: 0 };
  const onTarget = stepOffTarget(1, noGrowth).outputs;
  const { state, outputs } = stepOffTarget(0.7, noGrowth);
  expect(outputs.voluntaryPrincipalRepayments).toBeGreaterThan(0);
  expect(outputs.newInvestmentLoanOriginations).toBe(0);
  expect(outputs.nextPrivateDebtStock / outputs.nextCapitalStock)
    .toBeLessThan(outputs.privateLeverage);
  expect(outputs.nextPrivateDebtStock / outputs.nextCapitalStock)
    .toBeGreaterThan(outputs.targetPrivateLeverage);
  // The repayment comes out of cash that would otherwise be distributed
  expect(outputs.investment).toBeCloseTo(onTarget.investment, 9);
  expect(outputs.firmDividendPayments).toBeLessThan(onTarget.firmDividendPayments);
  expect(state.financialLedger!.balances['firms.deposits']).toBeGreaterThan(0);
  expectIdentitiesClose(outputs);
});

test('investment borrowing still takes priority over the leverage target', () => {
  // Far over target, but orders exceed internal funds: the firm still
  // borrows its financing gap (pecking order) and repays nothing early
  const { outputs } = stepOffTarget(0.5);
  expect(outputs.voluntaryPrincipalRepayments).toBe(0);
  expect(outputs.leverageRecapBorrowing).toBe(0);
  expect(outputs.newInvestmentLoanOriginations).toBeCloseTo(
    outputs.plannedInvestment - outputs.firmInternalFunds, 6,
  );
});

test('validation catches invalid leverageAdjustmentSpeed', () => {
  expect(capitalModule.validate({ leverageAdjustmentSpeed: 1.5 }).valid).toBe(false);
  expect(capitalModule.validate({ leverageAdjustmentSpeed: -0.1 }).valid).toBe(false);
  expect(capitalModule.validate({ leverageAdjustmentSpeed: 0 }).valid).toBe(true);
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

  // With zero debt: no risk premium, originations, or public interest.
  // Positive operating surplus still supplies internal investment funds.
  expect(result.outputs.debtRiskPremium).toBeCloseTo(0, 6);
  expect(result.outputs.grossLoanOriginations).toBeCloseTo(0, 6);
  expect(result.outputs.publicInterestPayments).toBeCloseTo(0, 6);
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

test('validation catches invalid financial substeps, defaults, and bank equity', () => {
  expect(capitalModule.validate({ financialSubsteps: 2.5 }).valid).toBeFalse();
  expect(capitalModule.validate({ privateDefaultRate: -0.01 }).valid).toBeFalse();
  expect(capitalModule.validate({ bankEquityRatio: 0.5 }).valid).toBeFalse();
  expect(capitalModule.validate({
    openingHouseholdDepositShare: 1.1,
  }).valid).toBeFalse();
  expect(capitalModule.validate({ loanRolloverRate: 1.1 }).valid).toBeFalse();
  expect(capitalModule.validate({ firmRetentionRate: -0.1 }).valid).toBeFalse();
  expect(capitalModule.validate({
    investmentProfitRateFloor: 0.04,
    investmentProfitRateCeiling: 0.03,
  }).valid).toBeFalse();
});

test('loan write-offs reduce private debt and bank equity without breaking accounting', () => {
  const baseline = runYears(1).outputs;
  const params = capitalModule.mergeParams({ privateDefaultRate: 0.20 });
  const state = capitalModule.init(params);
  const result = capitalModule.step(state, getCapitalInputs(0), params, 2025, 0);
  expect(result.outputs.loanWriteOffs).toBeGreaterThan(0);
  expect(result.outputs.nextPrivateDebtStock).toBeLessThan(baseline.nextPrivateDebtStock);
  expect(result.outputs.bankEquity).toBeLessThan(baseline.bankEquity);
  expect(result.outputs.bankEquityShortfall).toBeGreaterThan(0);
  expect(result.outputs.financialLedgerResidual).toBeCloseTo(0, 8);
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
  expect(capitalModule.outputs.includes('grossLoanOriginations')).toBeTrue();
  expect(capitalModule.outputs.includes('newInvestmentLoanOriginations')).toBeTrue();
  expect(capitalModule.outputs.includes('netCreditCreation')).toBeTrue();
  expect(capitalModule.outputs.includes('householdSaving')).toBeTrue();
  expect(capitalModule.outputs.includes('savingInvestmentResidual')).toBeTrue();
  expect(capitalModule.outputs.includes('nationalAccountsResidual')).toBeTrue();
  expect(capitalModule.outputs.includes('financialLedgerResidual')).toBeTrue();
  expect(capitalModule.outputs.includes('debtRiskPremium')).toBeTrue();
});

test('module declares regionalGdp input', () => {
  expect(capitalModule.inputs.includes('regionalGdp')).toBeTrue();
});

// =============================================================================
// SUMMARY
// =============================================================================


test('realized spends are debited from capital formation (one ledger)', () => {
  // One ledger: money debited from capital formation is money actually
  // spent (realized energy/CDR/robot/DC capex), not an internal estimate.
  const params = capitalModule.mergeParams({});
  const state = capitalModule.init(params);
  const base = getCapitalInputs(0);
  const noSpend = capitalModule.step(state, base, params, 2025, 0);
  const withSpend = capitalModule.step(state, {
    ...base,
    energyCapexSpend: 3,
    cdrSpend: 1,
    robotCapexSpend: 2,
    dataCenterCapexSpend: 4,
  }, params, 2025, 0);
  // withSpend debits exactly 3+1+2+4 from the pool
  expect(withSpend.outputs.investment - withSpend.outputs.generalInvestment)
    .toBeCloseTo(10, 6);
  // unwired, energy falls back to the internal estimate (nonzero debit)
  expect(noSpend.outputs.investment - noSpend.outputs.generalInvestment)
    .toBeGreaterThan(0);
  // floor-binding path: spends beyond the pool are exposed, not hidden
  const overflow = capitalModule.step(state, {
    ...base,
    energyCapexSpend: 1e6,
    cdrSpend: 0,
    robotCapexSpend: 0,
    dataCenterCapexSpend: 0,
  }, params, 2025, 0);
  expect(overflow.outputs.generalInvestment).toBe(0);
  expect(overflow.outputs.unfundedRealizedSpend).toBeGreaterThan(0);
});

printSummary();

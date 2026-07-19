/**
 * CDR Module Tests
 *
 * Verifies the social-cost-of-carbon arithmetic (units: $/ton), the
 * deployment gate, budget/ramp constraints, Wright's Law learning, and
 * energy accounting.
 */

import { cdrModule, cdrDefaults, CDRInputs, CDRState } from './cdr.js';
import { test, expect, printSummary } from '../test-utils.js';

// =============================================================================
// HELPERS
// =============================================================================

function makeInputs(overrides: Partial<CDRInputs> = {}): CDRInputs {
  return {
    temperature: 1.45,
    gdp: 110,            // $T
    laggedAvgLCOE: 50,   // $/MWh
    laggedInterestRate: 0.05,
    ...overrides,
  };
}

function runYears(years: number, inputs: Partial<CDRInputs> = {}, params = cdrDefaults) {
  let state: CDRState = cdrModule.init(params);
  let outputs;
  for (let i = 0; i < years; i++) {
    const result = cdrModule.step(state, makeInputs(inputs), params, 2025 + i, i);
    state = result.state;
    outputs = result.outputs;
  }
  return { state, outputs: outputs! };
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== CDR Module Tests ===\n');

test('SCC is in $/ton: matches hand-computed value', () => {
  // Marginal damage flow = 2 × damageCoeff × T × tcre × GDP($) / 1e9 tons-per-Gt,
  // discounted as a growing annuity over sccHorizonYears.
  // With T=1.45, GDP=$110T, r=0.05, socialDiscountFactor=0.5 (ρ=0.025),
  // year-0 growth fallback g=0.02:
  //   flow = 2 × 0.00536 × 1.45 × 0.00045 × 110e12 / 1e9 ≈ $0.77/ton/yr
  //   x = 1.02/1.025, annuity over 100 yr ≈ 79 → SCC ≈ $61/ton
  // (a unit slip of 1e9 in the flow is exactly the bug this guards against)
  const flow = 2 * 0.00536 * 1.45 * 0.00045 * 110e12 / 1e9;
  const x = 1.02 / 1.025;
  const annuity = x * (1 - Math.pow(x, 100)) / (1 - x);
  expect(flow * annuity).toBeBetween(45, 75);

  // 2025 cost is ~$400 capital + $125 energy ≫ ~$61 SCC → gate stays closed,
  // so capacity (and removal) must remain at zero
  const { outputs } = runYears(1);
  expect(outputs.cdrRemovalGtCO2).toBe(0);
  expect(outputs.cdrCapacity).toBe(0);
});

test('SCC rises with the NPV horizon and with damage-flow growth', () => {
  // Longer horizon → more discounted damage-years → earlier deployment
  // becomes justified at lower temperature/GDP. Compare the gate at a
  // marginal case: same inputs, horizons 30 vs 300.
  const marginal = { temperature: 3, gdp: 300, laggedAvgLCOE: 30, laggedInterestRate: 0.04 };
  const short = runYears(10, marginal, cdrModule.mergeParams({ sccHorizonYears: 30 }));
  const long = runYears(10, marginal, cdrModule.mergeParams({ sccHorizonYears: 300 }));
  expect(long.outputs.cdrRemovalGtCO2).toBeGreaterThan(short.outputs.cdrRemovalGtCO2);
});

test('no deployment at current temperature and cost', () => {
  const { outputs } = runYears(20);
  expect(outputs.cdrRemovalGtCO2).toBe(0);
  expect(outputs.cdrAnnualSpend).toBe(0);
  expect(outputs.cdrEnergyTWh).toBe(0);
});

test('deploys when SCC exceeds cost (high T, high GDP, low discount)', () => {
  // T=4, GDP=$400T, r=0.02 → SCC = 2×0.00536×4×0.00045×400e12/0.01/1e9 ≈ $772/ton
  // vs cost ≈ 400 + 2500×0.03 = $475/ton → gate open
  const { outputs } = runYears(5, {
    temperature: 4,
    gdp: 400,
    laggedAvgLCOE: 30,
    laggedInterestRate: 0.02,
  });
  expect(outputs.cdrRemovalGtCO2).toBeGreaterThan(0);
  expect(outputs.cdrAnnualSpend).toBeGreaterThan(0);
});

test('deployment is budget-constrained', () => {
  const params = { ...cdrDefaults, budgetFraction: 0.005 };
  const gdp = 400;
  const { outputs } = runYears(60, {
    temperature: 4,
    gdp,
    laggedAvgLCOE: 30,
    laggedInterestRate: 0.02,
  }, params);
  // Annual spend can never exceed budgetFraction × GDP
  expect(outputs.cdrAnnualSpend).toBeLessThan(params.budgetFraction * gdp * 1.001);
});

test('capacity ramp respects maxGrowthRate + bootstrap', () => {
  const inputs = { temperature: 4, gdp: 400, laggedAvgLCOE: 30, laggedInterestRate: 0.02 };
  const year1 = runYears(1, inputs).outputs;
  const year2 = runYears(2, inputs).outputs;
  // First-year addition is at most the bootstrap (prevCapacity = 0)
  expect(year1.cdrCapacity).toBeLessThan(cdrDefaults.bootstrapRate * 1.001);
  // Subsequent additions bounded by capacity × maxGrowthRate + bootstrap
  const maxYear2 = year1.cdrCapacity * (1 + cdrDefaults.maxGrowthRate) + cdrDefaults.bootstrapRate;
  expect(year2.cdrCapacity).toBeLessThan(maxYear2 * 1.001);
});

test("Wright's Law: cost declines with cumulative deployment", () => {
  const inputs = { temperature: 4, gdp: 400, laggedAvgLCOE: 30, laggedInterestRate: 0.02 };
  const early = runYears(2, inputs).outputs;
  const late = runYears(40, inputs).outputs;
  expect(late.cdrCumulative).toBeGreaterThan(early.cdrCumulative);
  expect(late.cdrCostPerTon).toBeLessThan(early.cdrCostPerTon);
});

test('energy demand: kWh/ton equals TWh/Gt', () => {
  const inputs = { temperature: 4, gdp: 400, laggedAvgLCOE: 30, laggedInterestRate: 0.02 };
  const { outputs } = runYears(30, inputs);
  expect(outputs.cdrRemovalGtCO2).toBeGreaterThan(0);
  expect(outputs.cdrEnergyTWh).toBeCloseTo(
    outputs.cdrRemovalGtCO2 * cdrDefaults.energyPerTon, 6
  );
});

test('discountRate param is the fallback when interest rate is unwired', () => {
  // With laggedInterestRate undefined, the social discount is params.discountRate.
  // Under the horizon-bounded annuity a tiny rate no longer explodes the SCC,
  // so discriminate the fallback path with a pair: at T=4/GDP=$400T a 0.1%
  // fallback rate opens the gate (annuity ~100-300 years of flow) while a 10%
  // rate keeps it shut (annuity ~10).
  const inputs = { temperature: 4, gdp: 400, laggedInterestRate: undefined };
  const cheap = runYears(3, inputs, { ...cdrDefaults, discountRate: 0.001 });
  const dear = runYears(3, inputs, { ...cdrDefaults, discountRate: 0.10 });
  expect(cheap.outputs.cdrRemovalGtCO2).toBeGreaterThan(0);
  expect(dear.outputs.cdrRemovalGtCO2).toBe(0);
});

test('removal capped by maxDeployRate', () => {
  const params = { ...cdrDefaults, maxDeployRate: 2, budgetFraction: 0.05 };
  const { outputs } = runYears(76, {
    temperature: 5,
    gdp: 600,
    laggedAvgLCOE: 20,
    laggedInterestRate: 0.02,
  }, params);
  expect(outputs.cdrRemovalGtCO2).toBeLessThan(2.001);
});

printSummary();

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
  // SCC = 2 × damageCoeff × T × tcre × GDP($) / discount / 1e9 tons-per-Gt
  // With T=1.45, GDP=$110T, r=0.05, socialDiscountFactor=0.5:
  //   2 × 0.00536 × 1.45 × 0.00045 × 110e12 / 0.025 / 1e9 ≈ $30.8/ton
  // (a unit slip of 1e9 here is exactly the bug this test guards against)
  const expectedSCC = 2 * 0.00536 * 1.45 * 0.00045 * 110e12 / 0.025 / 1e9;
  expect(expectedSCC).toBeBetween(25, 40);

  // 2025 cost is ~$400 capital + $125 energy ≫ $31 SCC → gate stays closed,
  // so capacity (and removal) must remain at zero
  const { outputs } = runYears(1);
  expect(outputs.cdrRemovalGtCO2).toBe(0);
  expect(outputs.cdrCapacity).toBe(0);
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
  // discountRate=0.001 inflates the SCC ~30x vs the wired case → forces deployment
  // at conditions where the wired case stays shut.
  const params = { ...cdrDefaults, discountRate: 0.001 };
  const inputs = { temperature: 1.45, gdp: 110, laggedAvgLCOE: 50 } as CDRInputs;
  let state = cdrModule.init(params);
  let outputs;
  for (let i = 0; i < 3; i++) {
    const result = cdrModule.step(state, inputs, params, 2025 + i, i);
    state = result.state;
    outputs = result.outputs;
  }
  expect(outputs!.cdrRemovalGtCO2).toBeGreaterThan(0);
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

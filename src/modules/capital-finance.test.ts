import { test, expect } from '../test-utils.js';
import { advanceCapitalFinance, type CapitalFinanceParameters } from './capital-finance.js';
import {
  capitalBankCapitalRatio,
  createCapitalGodleyLedger,
  postCapitalGodleyYear,
} from './capital-accounting.js';

const params: CapitalFinanceParameters = {
  alpha: 0.33,
  depreciation: 0.05,
  publicDeficitRate: 0.03,
  fiscalReactionCoeff: 0.03,
  fiscalReactionThreshold: 0.60,
  fiscalReactionMax: 0.04,
  baseCreditGrowth: 0.04,
  creditSensitivity: 1,
  leverageDamping: 1.5,
  leverageThreshold: 1.5,
  privateAmortization: 0.05,
  loanRolloverRate: 1,
  privateDefaultRate: 0,
  debtRiskLambda: 0.03,
  debtRiskThreshold: 2,
  neutralSafeRate: 0.01,
  safeRateGrowthPassThrough: 1,
  safeRateGrowthAnchor: 0.034,
  safeRateDebtSensitivity: 0.03,
  initialPublicDebtGDP: 0.9,
  financialRepression: 0,
  repressionDebtThreshold: 1.5,
  repressionDepth: 0.03,
  creditSpread: 0.02,
  financialSubsteps: 4,
};

test('public debt pays the safe rate and private debt the loan rate, not the return on capital', () => {
  const result = advanceCapitalFinance(
    { publicDebt: 142.2, privateDebt: 252.8, previousGdp: 158 },
    { gdp: 158, capitalStock: 553 },
    { ...params, financialSubsteps: 1 },
  );
  // Opening public debt 142.2 / 158 = 0.90, the anchor: the safe rate is neutral.
  expect(result.safeRate).toBeCloseTo(params.neutralSafeRate, 12);
  expect(result.loanRate).toBeCloseTo(result.safeRate + params.creditSpread, 12);
  // With one substep the opening stocks carry the whole year's interest.
  expect(result.publicInterestPayments).toBeCloseTo(result.safeRate * 142.2, 9);
  expect(result.privateInterestPayments).toBeCloseTo(result.loanRate * 252.8, 9);
  // The 2025 calibration: ~1% safe rate under a ~6% return on capital + premium.
  expect(result.safeRate).toBeGreaterThan(0.005);
  expect(result.safeRate).toBeLessThan(0.015);
});

test('public debt accrues interest at the safe rate on top of the primary balance', () => {
  const noPrimary = {
    ...params,
    publicDeficitRate: 0,
    fiscalReactionCoeff: 0,
    financialSubsteps: 1,
  };
  const result = advanceCapitalFinance(
    { publicDebt: 142.2, privateDebt: 252.8, previousGdp: 158 },
    { gdp: 158, capitalStock: 553 },
    noPrimary,
  );
  expect(result.primaryDeficit).toBeCloseTo(0, 12);
  expect(result.publicDebtChange).toBeCloseTo(result.safeRate * 142.2, 9);
  // A repressed (negative) safe rate liquidates debt with no primary surplus.
  const repressed = advanceCapitalFinance(
    { publicDebt: 142.2, privateDebt: 252.8, previousGdp: 158 },
    { gdp: 158, capitalStock: 553 },
    { ...noPrimary, neutralSafeRate: -0.03 },
  );
  expect(repressed.safeRate).toBeLessThan(0);
  expect(repressed.publicDebtChange).toBeLessThan(0);
});

test('an additional primary deficit rate adds to debt one-for-one with GDP', () => {
  const annual = { ...params, financialSubsteps: 1 };
  const state = { publicDebt: 158 * 0.9, privateDebt: 252.8, previousGdp: 158 };
  const base = advanceCapitalFinance(state, { gdp: 158, capitalStock: 553 }, annual);
  const ageing = advanceCapitalFinance(
    state,
    { gdp: 158, capitalStock: 553, additionalPrimaryDeficitRate: 0.01 },
    annual,
  );
  expect(ageing.publicDebtChange - base.publicDebtChange).toBeCloseTo(1.58, 9);
  expect(ageing.primaryDeficit - base.primaryDeficit).toBeCloseTo(1.58, 9);
});

test('quarterly finance transition separates gross originations from net credit', () => {
  const result = advanceCapitalFinance(
    { publicDebt: 142.2, privateDebt: 252.8, previousGdp: 158 },
    { gdp: 158, capitalStock: 553 },
    params,
  );
  expect(result.grossLoanOriginations).toBeGreaterThan(0);
  expect(result.refinancedPrincipal).toBeCloseTo(result.principalRepayments, 9);
  expect(result.newInvestmentLoanOriginations).toBeGreaterThan(0);
  expect(result.principalRepayments).toBeGreaterThan(0);
  expect(result.netCreditCreation).toBeCloseTo(
    result.grossLoanOriginations - result.principalRepayments - result.loanWriteOffs,
    9,
  );
  expect(result.path.length).toBe(4);
});

test('investment-credit demand is rationed independently of principal refinancing', () => {
  const result = advanceCapitalFinance(
    { publicDebt: 142.2, privateDebt: 252.8, previousGdp: 158 },
    { gdp: 158, capitalStock: 553, netNewCreditDemand: 1 },
    params,
  );
  expect(result.newInvestmentLoanOriginations).toBeCloseTo(1, 9);
  expect(result.refinancedPrincipal).toBeCloseTo(result.principalRepayments, 9);
  expect(result.grossLoanOriginations).toBeCloseTo(
    result.newInvestmentLoanOriginations + result.refinancedPrincipal,
    9,
  );
  expect(result.netCreditCreation).toBeCloseTo(1, 9);
  expect(result.privateInterestPayments).toBeGreaterThan(0);
});

test('quarterly and monthly debt integration converge more closely than annual Euler', () => {
  const state = { publicDebt: 142.2, privateDebt: 252.8, previousGdp: 154 };
  const inputs = { gdp: 158, capitalStock: 553 };
  const annual = advanceCapitalFinance(state, inputs, { ...params, financialSubsteps: 1 });
  const quarterly = advanceCapitalFinance(state, inputs, { ...params, financialSubsteps: 4 });
  const monthly = advanceCapitalFinance(state, inputs, { ...params, financialSubsteps: 12 });
  const annualError = Math.abs(annual.state.privateDebt - monthly.state.privateDebt);
  const quarterlyError = Math.abs(quarterly.state.privateDebt - monthly.state.privateDebt);
  expect(quarterlyError).toBeLessThan(annualError);
});

test('defaults destroy bank equity while preserving exact Godley identities', () => {
  const opening = createCapitalGodleyLedger({
    capitalStock: 553,
    privateDebt: 252.8,
    publicDebt: 142.2,
    bankEquityRatio: 0.10,
  });
  const before = capitalBankCapitalRatio(opening);
  const result = postCapitalGodleyYear(opening, {
    depreciation: 20,
    generalInvestment: 25,
    laborCompensation: 100,
    householdConsumption: 85,
    grossLoanOriginations: 6,
    principalRepayments: 12,
    loanWriteOffs: 5,
    privateInterestPayments: 5,
    firmDividendPayments: 2,
    bankDividendPayments: 5,
    publicDebtChange: 3,
    governmentServiceConsumption: 8,
    pensionTransfers: 18,
    publicInterestPayments: 5,
    publicInterestToBanks: 0,
    netTaxes: 28,
  });
  expect(result.report.maxResidual).toBeCloseTo(0, 8);
  expect(result.state.balances['firms.privateLoans']).toBeCloseTo(241.8, 8);
  expect(result.state.balances['banks.privateLoans']).toBeCloseTo(241.8, 8);
  expect(result.state.balances['banks.publicBonds']).toBeCloseTo(3, 8);
  expect(result.state.balances['households.publicBonds']).toBeCloseTo(142.2, 8);
  expect(capitalBankCapitalRatio(result.state)).toBeLessThan(before);
});

test('households can fund dissaving by selling bonds to banks', () => {
  const opening = createCapitalGodleyLedger({
    capitalStock: 100,
    privateDebt: 10,
    publicDebt: 100,
    bankEquityRatio: 0.10,
  });
  const result = postCapitalGodleyYear(opening, {
    depreciation: 0,
    generalInvestment: 0,
    laborCompensation: 0,
    householdConsumption: 10,
    grossLoanOriginations: 0,
    principalRepayments: 0,
    loanWriteOffs: 0,
    privateInterestPayments: 0,
    firmDividendPayments: 0,
    bankDividendPayments: 0,
    publicDebtChange: 0,
    governmentServiceConsumption: 0,
    pensionTransfers: 0,
    publicInterestPayments: 0,
    publicInterestToBanks: 0,
    netTaxes: 0,
  });
  expect(result.state.balances['households.deposits']).toBeCloseTo(0, 9);
  expect(result.state.balances['households.publicBonds']).toBeCloseTo(95, 9);
  expect(result.state.balances['banks.publicBonds']).toBeCloseTo(5, 9);
  expect(result.report.maxResidual).toBeCloseTo(0, 9);
});

test('the safe rate tracks trend growth one-for-one, not the return on capital', () => {
  // One substep: stocks stay at their opening values, so rates compare exactly.
  const annual = { ...params, financialSubsteps: 1 };
  const state = { publicDebt: 158 * 0.9, privateDebt: 252.8, previousGdp: 158 };
  const base = advanceCapitalFinance(state, { gdp: 158, capitalStock: 553 }, annual);
  const slow = advanceCapitalFinance(
    state,
    { gdp: 158, capitalStock: 553, trendGrowth: params.safeRateGrowthAnchor - 0.01 },
    annual,
  );
  expect(base.safeRate - slow.safeRate).toBeCloseTo(0.01, 12);
  // A scarcer capital stock raises the return on capital but not the safe rate.
  const scarce = advanceCapitalFinance(state, { gdp: 158, capitalStock: 450 }, annual);
  expect(scarce.interestRate).toBeGreaterThan(base.interestRate + 0.01);
  expect(scarce.safeRate).toBeCloseTo(base.safeRate, 12);
  // More public debt raises the sovereign rate by safeRateDebtSensitivity per unit of debt/GDP.
  const indebted = advanceCapitalFinance(
    { ...state, publicDebt: 158 * 1.9 },
    { gdp: 158, capitalStock: 553 },
    { ...annual, repressionDebtThreshold: 5 },
  );
  expect(indebted.safeRate - base.safeRate).toBeCloseTo(0.03, 12);
});

test('financial repression: an explicit lever, and a cap below growth at high public debt', () => {
  const annual = { ...params, financialSubsteps: 1 };
  const state = { publicDebt: 158 * 0.9, privateDebt: 252.8, previousGdp: 158 };
  const base = advanceCapitalFinance(state, { gdp: 158, capitalStock: 553 }, annual);
  expect(base.repressionGap).toBeCloseTo(0, 12);
  const lever = advanceCapitalFinance(
    state,
    { gdp: 158, capitalStock: 553 },
    { ...annual, financialRepression: 0.02 },
  );
  expect(base.safeRate - lever.safeRate).toBeCloseTo(0.02, 12);
  expect(lever.repressionGap).toBeCloseTo(0.02, 12);
  // Far above the threshold the safe rate is held at trend growth less the depth.
  const dominance = advanceCapitalFinance(
    { ...state, publicDebt: 158 * 3.0 },
    { gdp: 158, capitalStock: 553, trendGrowth: 0.034 },
    annual,
  );
  expect(dominance.safeRate).toBeCloseTo(0.034 - params.repressionDepth, 12);
  expect(dominance.repressionGap).toBeGreaterThan(0);
});

test('credit capacity is the lending envelope: demand above it is exactly the unfunded part', () => {
  const opening = { publicDebt: 142.2, privateDebt: 252.8, previousGdp: 152.6 };
  const inputs = { gdp: 158, capitalStock: 553 };
  const unlimited = advanceCapitalFinance(opening, inputs, params);
  const capacity = unlimited.netNewCreditCapacity;
  expect(capacity).toBeGreaterThan(0);
  expect(unlimited.newInvestmentLoanOriginations).toBeCloseTo(capacity, 12);
  // Demand above the envelope: lending stops at capacity, the rest is unfunded
  const over = advanceCapitalFinance(opening, { ...inputs, netNewCreditDemand: capacity + 1 }, params);
  expect(over.unfundedNetNewCreditDemand).toBeCloseTo(1, 9);
  expect(over.newInvestmentLoanOriginations + over.unfundedNetNewCreditDemand - over.netNewCreditCapacity)
    .toBeCloseTo(1, 9);
  // Demand below it: fully lent, and demand less capacity is negative (the
  // unclipped gap the seed-year probe reads)
  const under = advanceCapitalFinance(opening, { ...inputs, netNewCreditDemand: capacity / 2 }, params);
  expect(under.unfundedNetNewCreditDemand).toBe(0);
  expect(under.newInvestmentLoanOriginations).toBeCloseTo(capacity / 2, 9);
  expect(under.newInvestmentLoanOriginations - under.netNewCreditCapacity).toBeLessThan(0);
});

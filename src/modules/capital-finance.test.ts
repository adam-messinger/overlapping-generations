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
  financialSubsteps: 4,
};

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

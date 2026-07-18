/**
 * Five-year cohort accounting tests.
 */

import { REGIONS, Region } from '../domain-types.js';
import { test, expect, printSummary } from '../test-utils.js';
import { generationsModule } from './generations.js';

function regional(value: number): Record<Region, number> {
  return Object.fromEntries(REGIONS.map(region => [region, value])) as Record<Region, number>;
}

function makeInputs(overrides: Record<string, any> = {}) {
  const stock = overrides.stock ?? 553;
  const generalInvestment = overrides.generalInvestment ?? 38;
  const nextCapitalStock = overrides.nextCapitalStock ?? (0.95 * stock + generalInvestment);
  return {
    regionalYoung: regional(20e6),
    regionalWorking: regional(60e6),
    regionalOld: regional(20e6),
    regionalPopulation: regional(100e6),
    regionalLifeExpectancy: regional(75),
    regionalGdp: regional(20),
    gdp: 160,
    stock,
    nextCapitalStock,
    investment: overrides.investment ?? 42,
    generalInvestment,
    creditImpulse: overrides.creditImpulse ?? 5,
    privateDebtStock: overrides.privateDebtStock ?? 256,
    nextPrivateDebtStock: overrides.nextPrivateDebtStock ?? 248.2,
    publicDebtService: overrides.publicDebtService ?? 8,
    regionalSavings: regional(0.25),
    regionalRetireeCost: regional(1.75),
    regionalChildCost: regional(0.20),
    ...overrides,
  };
}

function runOne(paramOverrides: Record<string, any> = {}, inputOverrides: Record<string, any> = {}) {
  const params = generationsModule.mergeParams(paramOverrides);
  const state = generationsModule.init(params);
  return generationsModule.step(state, makeInputs(inputOverrides), params, 2025, 0);
}

console.log('\n=== Generations Module Tests ===\n');

test('uses five-year birth cohorts and reconciles population', () => {
  const { outputs } = runOne();
  let totalPopulation = 0;
  for (const account of Object.values(outputs.cohortAccounts)) {
    expect(account.birthYearEnd - account.birthYearStart).toBe(4);
    totalPopulation += account.population;
  }
  expect(totalPopulation).toBeCloseTo(800e6, 2);
});

test('end-of-period cohort assets and liabilities reconcile to macro stocks', () => {
  const inputs = makeInputs();
  const { outputs } = runOne();
  expect(outputs.cohortAssets).toBeCloseTo(inputs.nextCapitalStock, 6);
  expect(outputs.cohortLiabilities).toBeCloseTo(inputs.nextPrivateDebtStock, 6);
});

test('retired cohorts can retain outstanding liabilities without labor income', () => {
  const { outputs } = runOne();
  const oecdAccounts = Object.values(outputs.regionalCohortAccounts.oecd);
  const retiredLiabilities = oecdAccounts
    .filter(account => account.oldPopulation > 0)
    .reduce((sum, account) => sum + account.liabilities, 0);
  expect(retiredLiabilities).toBeGreaterThan(0);
});

test('scenario debt-age weights shift the initial liability allocation', () => {
  const young = runOne({
    debtAgeWeight20to39: 1,
    debtAgeWeight40to54: 0,
    debtAgeWeight55to69: 0,
    debtAgeWeight70plus: 0,
  }, {
    creditImpulse: 0,
    nextPrivateDebtStock: 256 * 0.95,
  }).outputs.regionalCohortAccounts.oecd;
  const old = runOne({
    debtAgeWeight20to39: 0,
    debtAgeWeight40to54: 0,
    debtAgeWeight55to69: 0,
    debtAgeWeight70plus: 1,
  }, {
    creditImpulse: 0,
    nextPrivateDebtStock: 256 * 0.95,
  }).outputs.regionalCohortAccounts.oecd;
  const oldShare = (accounts: typeof old) => {
    const values = Object.values(accounts);
    const total = values.reduce((sum, account) => sum + account.liabilities, 0);
    const age70plus = values
      .filter(account => account.ageStart >= 70)
      .reduce((sum, account) => sum + account.liabilities, 0);
    return age70plus / total;
  };
  expect(oldShare(old)).toBeGreaterThan(oldShare(young));
});

test('scenario asset-age weights shift the initial asset allocation', () => {
  const young = runOne({
    assetAgeWeight20to39: 1,
    assetAgeWeight40to54: 0,
    assetAgeWeight55to69: 0,
    assetAgeWeight70plus: 0,
  }, {
    generalInvestment: 0,
    investment: 0,
    nextCapitalStock: 553 * 0.95,
  }).outputs.regionalCohortAccounts.oecd;
  const old = runOne({
    assetAgeWeight20to39: 0,
    assetAgeWeight40to54: 0,
    assetAgeWeight55to69: 0,
    assetAgeWeight70plus: 1,
  }, {
    generalInvestment: 0,
    investment: 0,
    nextCapitalStock: 553 * 0.95,
  }).outputs.regionalCohortAccounts.oecd;
  const oldShare = (accounts: typeof old) => {
    const values = Object.values(accounts);
    const total = values.reduce((sum, account) => sum + account.assets, 0);
    const age70plus = values
      .filter(account => account.ageStart >= 70)
      .reduce((sum, account) => sum + account.assets, 0);
    return age70plus / total;
  };
  expect(oldShare(old)).toBeGreaterThan(oldShare(young));
});

test('a lower funder share leaves more new-capital ownership with incumbent owners', () => {
  const oldShareOfAssets = (funderShare: number): number => {
    const accounts = runOne({ newCapitalFunderShare: funderShare }).outputs
      .regionalCohortAccounts.oecd;
    const values = Object.values(accounts);
    const total = values.reduce((sum, account) => sum + account.assets, 0);
    const retired = values
      .filter(account => account.ageStart >= 65)
      .reduce((sum, account) => sum + account.assets, 0);
    return retired / total;
  };
  expect(oldShareOfAssets(0)).toBeGreaterThan(oldShareOfAssets(1));
});

test('cohort assets reconcile to the macro stock at any funder share', () => {
  const inputs = makeInputs();
  for (const funderShare of [0, 0.25, 1]) {
    const { outputs } = runOne({ newCapitalFunderShare: funderShare });
    expect(outputs.cohortAssets).toBeCloseTo(inputs.nextCapitalStock, 6);
  }
});

test('cohort debt is amortized once by the macro debt transition', () => {
  const params = generationsModule.mergeParams({});
  const firstInputs = makeInputs({
    creditImpulse: 0,
    privateDebtStock: 256,
    nextPrivateDebtStock: 256 * 0.95,
  });
  const first = generationsModule.step(
    generationsModule.init(params),
    firstInputs,
    params,
    2025,
    0,
  );
  const cohort = '1955-1959';
  const firstLiabilities = first.outputs.regionalCohortAccounts.oecd[cohort].liabilities;
  const second = generationsModule.step(first.state, makeInputs({
    creditImpulse: 0,
    privateDebtStock: firstInputs.nextPrivateDebtStock,
    nextPrivateDebtStock: firstInputs.nextPrivateDebtStock * 0.95,
  }), params, 2026, 1);
  const secondLiabilities = second.outputs.regionalCohortAccounts.oecd[cohort].liabilities;
  expect(secondLiabilities / firstLiabilities).toBeCloseTo(0.95, 6);
});

test('education, retiree transfers, and worker taxes reconcile', () => {
  const { outputs } = runOne();
  const accounts = Object.values(outputs.cohortAccounts);
  const education = accounts.reduce((sum, account) => sum + account.education, 0);
  const pensions = accounts.reduce((sum, account) => sum + account.pensionHealthcare, 0);
  const taxes = accounts.reduce((sum, account) => sum + account.taxes, 0);
  expect(education).toBeCloseTo(1.6, 6);
  expect(pensions).toBeCloseTo(14.0, 6);
  expect(taxes).toBeCloseTo(23.6, 6);
});

test('a tighter borrowing limit increases the borrowing-limit gap', () => {
  const loose = runOne({ borrowingLimitIncomeMultiple: 20 }).outputs;
  const tight = runOne({ borrowingLimitIncomeMultiple: 0 }).outputs;
  expect(tight.cohortBorrowingLimitGap).toBeGreaterThan(loose.cohortBorrowingLimitGap);
  expect(tight.borrowingConstrainedWorkingShare).toBeGreaterThan(
    loose.borrowingConstrainedWorkingShare,
  );
});

test('lower investment increases the cohort funding gap at the same desired growth target', () => {
  const highInvestment = runOne({}, {
    investment: 42,
    generalInvestment: 38,
    nextCapitalStock: 0.95 * 553 + 38,
  }).outputs;
  const lowInvestment = runOne({}, {
    investment: 12,
    generalInvestment: 10,
    creditImpulse: 1,
    nextCapitalStock: 0.95 * 553 + 10,
  }).outputs;
  expect(lowInvestment.cohortFundingGap).toBeGreaterThan(highInvestment.cohortFundingGap);
  expect(lowInvestment.aggregateCapitalFundingGap).toBeGreaterThan(
    highInvestment.aggregateCapitalFundingGap,
  );
  expect(lowInvestment.aggregateCapitalCoverage).toBeLessThan(
    highInvestment.aggregateCapitalCoverage,
  );
});

test('mortality produces positive bequests and cumulative recipient flows', () => {
  const params = generationsModule.mergeParams({});
  const first = generationsModule.step(
    generationsModule.init(params),
    makeInputs(),
    params,
    2025,
    0,
  );
  const secondInputs = makeInputs({
    stock: first.outputs.cohortAssets,
    nextCapitalStock: first.outputs.cohortAssets * 0.95 + 38,
    privateDebtStock: first.outputs.cohortLiabilities,
  });
  const second = generationsModule.step(first.state, secondInputs, params, 2026, 1);
  expect(second.outputs.cohortBequests).toBeGreaterThan(0);
  const bequestsGiven = Object.values(second.outputs.cohortAccounts)
    .reduce((sum, account) => sum + account.bequestsGiven, 0);
  expect(bequestsGiven).toBeCloseTo(second.outputs.cohortBequests, 6);
  const cumulativeBequests = Object.values(second.outputs.cohortAccounts)
    .reduce((sum, account) => sum + account.cumulativeBequestsReceived, 0);
  expect(cumulativeBequests).toBeGreaterThan(second.outputs.cohortBequests);
});

test('validation rejects invalid cohort and borrowing parameters', () => {
  expect(generationsModule.validate({ cohortWidth: 0 }).valid).toBeFalse();
  expect(generationsModule.validate({ borrowingLimitIncomeMultiple: -1 }).valid).toBeFalse();
  expect(generationsModule.validate({ debtAgeWeight70plus: -1 }).valid).toBeFalse();
  expect(generationsModule.validate({
    debtAgeWeight20to39: 0,
    debtAgeWeight40to54: 0,
    debtAgeWeight55to69: 0,
    debtAgeWeight70plus: 0,
  }).valid).toBeFalse();
  expect(generationsModule.validate({ assetAgeWeight70plus: -1 }).valid).toBeFalse();
  expect(generationsModule.validate({
    assetAgeWeight20to39: 0,
    assetAgeWeight40to54: 0,
    assetAgeWeight55to69: 0,
    assetAgeWeight70plus: 0,
  }).valid).toBeFalse();
  expect(generationsModule.validate({ newCapitalFunderShare: 1.5 }).valid).toBeFalse();
  expect(generationsModule.validate({ newCapitalFunderShare: -0.1 }).valid).toBeFalse();
});

printSummary();

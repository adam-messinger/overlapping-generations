/**
 * Five-year birth-cohort balance sheets.
 *
 * This module is a diagnostic accounting layer: it allocates the macro flows
 * produced by demographics and capital across five-year birth cohorts without
 * feeding those allocations back into the existing macro simulation. That
 * keeps the baseline unchanged while making distributional assumptions and
 * capital-access gaps observable.
 *
 * A cohort is "funding constrained" when its desired acquisition of productive
 * capital exceeds own saving plus the credit actually allocated to it. The gap
 * is split into:
 * - a borrowing-limit gap (desired borrowing exceeds its income-based limit)
 * - a credit-rationing gap (it has headroom, but aggregate credit is scarce)
 *
 * Desired aggregate capital formation is transparent and scenario-controlled:
 * replacement investment implied by the capital module plus a target net
 * capital growth rate. This is a diagnostic target, not an optimized Euler
 * equation or a claim about welfare.
 */

import { Region, REGIONS } from '../domain-types.js';
import { Module } from '../framework/module.js';
import { validatedMerge } from '../framework/validated-merge.js';

export interface GenerationsParams {
  cohortWidth: number;                  // Years per birth cohort (default 5)
  maxAge: number;                       // Oldest represented age
  laborIncomeShare: number;             // Share of regional GDP allocated as labor income
  desiredNetCapitalGrowth: number;      // Diagnostic desired net K growth/year
  borrowingLimitIncomeMultiple: number; // Maximum liabilities / annual labor income
  constraintTolerance: number;          // Relative gap below which a cohort is treated as unconstrained
  bequestRecipientMinAge: number;       // Youngest typical heir
  bequestRecipientMaxAge: number;       // Oldest typical heir
  assetAgeWeight20to39: number;         // Initial asset ownership, relative to ages 40-54
  assetAgeWeight40to54: number;         // Initial asset ownership normalization
  assetAgeWeight55to69: number;         // Initial asset ownership, relative to ages 40-54
  assetAgeWeight70plus: number;         // Initial asset ownership, relative to ages 40-54
  newCapitalFunderShare: number;        // Share of new capital owned by current funders vs incumbents
  debtAgeWeight20to39: number;          // Initial debt exposure, relative to ages 40-54
  debtAgeWeight40to54: number;          // Initial debt exposure normalization
  debtAgeWeight55to69: number;          // Initial debt exposure, relative to ages 40-54
  debtAgeWeight70plus: number;          // Initial debt exposure, relative to ages 40-54
}

interface CohortLedgerState {
  region: Region;
  birthYearStart: number;
  assets: number;
  liabilities: number;
  cumulativeTaxes: number;
  cumulativeTransfers: number;
  cumulativeEducation: number;
  cumulativePensionHealthcare: number;
  cumulativeBequestsReceived: number;
  cumulativeBequestsGiven: number;
  cumulativeFundingGap: number;
}

interface GenerationsState {
  initialized: boolean;
  accounts: Record<string, CohortLedgerState>;
}

interface GenerationsInputs {
  regionalYoung: Record<Region, number>;
  regionalWorking: Record<Region, number>;
  regionalOld: Record<Region, number>;
  regionalPopulation: Record<Region, number>;
  regionalLifeExpectancy: Record<Region, number>;
  regionalGdp: Record<Region, number>;
  gdp: number;

  stock: number;
  nextCapitalStock: number;
  investment: number;
  generalInvestment: number;
  creditImpulse: number;
  privateDebtStock: number;
  nextPrivateDebtStock: number;
  publicDebtService: number;
  regionalSavings: Record<Region, number>;
  regionalRetireeCost: Record<Region, number>;
  regionalChildCost: Record<Region, number>;
}

export type CohortStatus = 'young' | 'working' | 'old' | 'mixed';

export interface CohortAccount {
  label: string;
  birthYearStart: number;
  birthYearEnd: number;
  ageStart: number;
  ageEnd: number;
  status: CohortStatus;
  population: number;
  youngPopulation: number;
  workingPopulation: number;
  oldPopulation: number;

  // End-of-period balance sheet ($T)
  assets: number;
  liabilities: number;
  netWorth: number;
  assetsPerCapita: number;       // dollars/person
  liabilitiesPerCapita: number; // dollars/person
  netWorthPerCapita: number;     // dollars/person

  // Current-year flows ($T)
  laborIncome: number;
  taxes: number;
  pensionHealthcare: number;
  education: number;
  bequestsReceived: number;
  bequestsGiven: number;
  ownFunds: number;
  creditAllocated: number;
  desiredCapital: number;
  fundedCapital: number;
  fundingGap: number;
  borrowingLimitGap: number;
  creditRationingGap: number;
  constraintShare: number; // fundingGap / desiredCapital

  // Cumulative nominal flows since the simulation start ($T)
  cumulativeTaxes: number;
  cumulativeTransfers: number;
  cumulativeEducation: number;
  cumulativePensionHealthcare: number;
  cumulativeBequestsReceived: number;
  cumulativeBequestsGiven: number;
  cumulativeFundingGap: number;
  cumulativeNetTransfer: number;
}

interface GenerationsOutputs {
  cohortAccounts: Record<string, CohortAccount>;
  regionalCohortAccounts: Record<Region, Record<string, CohortAccount>>;
  cohortDesiredCapital: number;
  cohortFundedCapital: number;
  cohortFundingGap: number;
  aggregateCapitalFundingGap: number;
  aggregateCapitalCoverage: number;
  cohortBorrowingLimitGap: number;
  cohortCreditRationingGap: number;
  constrainedWorkingShare: number;
  borrowingConstrainedWorkingShare: number;
  cohortBequests: number;
  cohortAssets: number;
  cohortLiabilities: number;
}

interface PopulationSlice {
  region: Region;
  birthYearStart: number;
  birthYearEnd: number;
  ageStart: number;
  ageEnd: number;
  representativeAge: number;
  population: number;
  youngPopulation: number;
  workingPopulation: number;
  oldPopulation: number;
}

interface AnnualFlows {
  laborIncome: number;
  taxes: number;
  pensionHealthcare: number;
  education: number;
  bequestsReceived: number;
  bequestsGiven: number;
  ownFunds: number;
  creditAllocated: number;
  desiredCapital: number;
  fundedCapital: number;
  fundingGap: number;
  borrowingLimitGap: number;
  creditRationingGap: number;
}

export const generationsDefaults: GenerationsParams = {
  cohortWidth: 5,
  maxAge: 105,
  laborIncomeShare: 0.67,
  desiredNetCapitalGrowth: 0.02,
  borrowingLimitIncomeMultiple: 4.0,
  constraintTolerance: 0.01,
  bequestRecipientMinAge: 30,
  bequestRecipientMaxAge: 54,
  // Scale-free DFA calibration on 1989-2012 U.S. age shares, with ages 40-54
  // normalized to one. Asset weights and the funder share are calibrated
  // jointly (Fed DFA July 2026 release, 2013-2025 held out as a temporal
  // check). See scripts/generational-backcast.ts --calibrate-asset-profile.
  assetAgeWeight20to39: 0.241,
  assetAgeWeight40to54: 1.00,
  assetAgeWeight55to69: 1.182,
  assetAgeWeight70plus: 1.202,
  newCapitalFunderShare: 0.255,
  debtAgeWeight20to39: 0.579,
  debtAgeWeight40to54: 1.00,
  debtAgeWeight55to69: 0.487,
  debtAgeWeight70plus: 0.198,
};

function cohortKey(region: Region, birthYearStart: number): string {
  return `${region}:${birthYearStart}`;
}

function cohortLabel(birthYearStart: number, width: number): string {
  return `${birthYearStart}-${birthYearStart + width - 1}`;
}

function emptyLedger(region: Region, birthYearStart: number): CohortLedgerState {
  return {
    region,
    birthYearStart,
    assets: 0,
    liabilities: 0,
    cumulativeTaxes: 0,
    cumulativeTransfers: 0,
    cumulativeEducation: 0,
    cumulativePensionHealthcare: 0,
    cumulativeBequestsReceived: 0,
    cumulativeBequestsGiven: 0,
    cumulativeFundingGap: 0,
  };
}

function emptyFlows(): AnnualFlows {
  return {
    laborIncome: 0,
    taxes: 0,
    pensionHealthcare: 0,
    education: 0,
    bequestsReceived: 0,
    bequestsGiven: 0,
    ownFunds: 0,
    creditAllocated: 0,
    desiredCapital: 0,
    fundedCapital: 0,
    fundingGap: 0,
    borrowingLimitGap: 0,
    creditRationingGap: 0,
  };
}

function statusFor(slice: Pick<PopulationSlice, 'youngPopulation' | 'workingPopulation' | 'oldPopulation'>): CohortStatus {
  const nonzero = [slice.youngPopulation, slice.workingPopulation, slice.oldPopulation]
    .filter(v => v > 1e-6).length;
  if (nonzero > 1) return 'mixed';
  if (slice.workingPopulation > 0) return 'working';
  if (slice.oldPopulation > 0) return 'old';
  return 'young';
}

/** Allocate each broad demographic stock exactly across five-year birth bins. */
function buildPopulationSlices(
  inputs: GenerationsInputs,
  params: GenerationsParams,
  year: number,
): Record<string, PopulationSlice> {
  const result: Record<string, PopulationSlice> = {};
  const width = params.cohortWidth;
  const earliestBirth = Math.floor((year - params.maxAge) / width) * width;
  const latestBirth = Math.floor(year / width) * width;

  for (const region of REGIONS) {
    const candidates: Array<{
      birthYearStart: number;
      youngWeight: number;
      workingWeight: number;
      oldWeight: number;
      ageSum: number;
      activeYears: number;
      ageStart: number;
      ageEnd: number;
    }> = [];

    for (let birthStart = earliestBirth; birthStart <= latestBirth; birthStart += width) {
      let youngWeight = 0;
      let workingWeight = 0;
      let oldWeight = 0;
      let ageSum = 0;
      let activeYears = 0;
      let ageStart = Number.POSITIVE_INFINITY;
      let ageEnd = 0;

      for (let birthYear = birthStart; birthYear < birthStart + width; birthYear++) {
        const age = year - birthYear;
        if (age < 0 || age > params.maxAge) continue;
        activeYears++;
        ageSum += age;
        ageStart = Math.min(ageStart, age);
        ageEnd = Math.max(ageEnd, age);
        if (age <= 19) youngWeight += 1;
        else if (age <= 64) workingWeight += 1;
        else oldWeight += Math.exp(-(age - 65) / 18);
      }

      if (activeYears > 0) {
        candidates.push({
          birthYearStart: birthStart,
          youngWeight,
          workingWeight,
          oldWeight,
          ageSum,
          activeYears,
          ageStart,
          ageEnd,
        });
      }
    }

    const totalYoungWeight = candidates.reduce((sum, c) => sum + c.youngWeight, 0);
    const totalWorkingWeight = candidates.reduce((sum, c) => sum + c.workingWeight, 0);
    const totalOldWeight = candidates.reduce((sum, c) => sum + c.oldWeight, 0);

    for (const c of candidates) {
      const youngPopulation = totalYoungWeight > 0
        ? inputs.regionalYoung[region] * c.youngWeight / totalYoungWeight
        : 0;
      const workingPopulation = totalWorkingWeight > 0
        ? inputs.regionalWorking[region] * c.workingWeight / totalWorkingWeight
        : 0;
      const oldPopulation = totalOldWeight > 0
        ? inputs.regionalOld[region] * c.oldWeight / totalOldWeight
        : 0;
      const key = cohortKey(region, c.birthYearStart);
      result[key] = {
        region,
        birthYearStart: c.birthYearStart,
        birthYearEnd: c.birthYearStart + width - 1,
        ageStart: c.ageStart,
        ageEnd: c.ageEnd,
        representativeAge: c.ageSum / c.activeYears,
        population: youngPopulation + workingPopulation + oldPopulation,
        youngPopulation,
        workingPopulation,
        oldPopulation,
      };
    }
  }

  return result;
}

/** DFA age bands shared by the initial asset and debt distributions. */
function ageBandWeight(
  age: number,
  weight20to39: number,
  weight40to54: number,
  weight55to69: number,
  weight70plus: number,
): number {
  if (age < 20) return 0;
  if (age < 40) return weight20to39;
  if (age < 55) return weight40to54;
  if (age < 70) return weight55to69;
  return weight70plus;
}

function savingAgeWeight(age: number): number {
  if (age < 20 || age >= 65) return 0;
  if (age < 30) return 0.55;
  if (age < 40) return 0.85;
  if (age < 55) return 1.20;
  return 1.35;
}

function capitalDemandWeight(age: number): number {
  if (age < 20 || age >= 65) return 0;
  if (age < 30) return 2.00;
  if (age < 40) return 1.60;
  if (age < 50) return 1.10;
  if (age < 55) return 0.85;
  return 0.55;
}

function allocatePool(
  pool: number,
  scores: Record<string, number>,
  keys: string[],
): Record<string, number> {
  const result: Record<string, number> = {};
  const total = keys.reduce((sum, key) => sum + Math.max(0, scores[key] ?? 0), 0);
  for (const key of keys) {
    result[key] = total > 0 ? pool * Math.max(0, scores[key] ?? 0) / total : 0;
  }
  return result;
}

function scaleLedgerField(
  ledgers: Record<string, CohortLedgerState>,
  field: 'assets' | 'liabilities',
  target: number,
  fallbackScores: Record<string, number>,
): void {
  const keys = Object.keys(ledgers);
  const current = keys.reduce((sum, key) => sum + Math.max(0, ledgers[key][field]), 0);
  if (current > 0) {
    const scale = target / current;
    for (const key of keys) ledgers[key][field] = Math.max(0, ledgers[key][field]) * scale;
    return;
  }
  const allocated = allocatePool(target, fallbackScores, keys);
  for (const key of keys) ledgers[key][field] = allocated[key];
}

function distributeBequest(
  region: Region,
  amount: number,
  slices: Record<string, PopulationSlice>,
  ledgers: Record<string, CohortLedgerState>,
  received: Record<string, number>,
  params: GenerationsParams,
): void {
  if (amount <= 0) return;
  let recipients = Object.keys(slices).filter(key => {
    const slice = slices[key];
    return slice.region === region &&
      slice.representativeAge >= params.bequestRecipientMinAge &&
      slice.representativeAge <= params.bequestRecipientMaxAge &&
      slice.workingPopulation > 0;
  });
  if (recipients.length === 0) {
    recipients = Object.keys(slices).filter(key =>
      slices[key].region === region && slices[key].workingPopulation > 0
    );
  }
  if (recipients.length === 0) return;
  const scores = Object.fromEntries(
    recipients.map(key => [key, slices[key].workingPopulation])
  ) as Record<string, number>;
  const allocation = allocatePool(amount, scores, recipients);
  for (const key of recipients) {
    ledgers[key].assets += allocation[key];
    received[key] = (received[key] ?? 0) + allocation[key];
  }
}

function finalizeAccount(
  slice: PopulationSlice,
  ledger: CohortLedgerState,
  flows: AnnualFlows,
  params: GenerationsParams,
): CohortAccount {
  const netWorth = ledger.assets - ledger.liabilities;
  const perCapitaScale = slice.population > 0 ? 1e12 / slice.population : 0;
  const cumulativeNetTransfer = ledger.cumulativeTransfers +
    ledger.cumulativeBequestsReceived - ledger.cumulativeBequestsGiven - ledger.cumulativeTaxes;
  return {
    label: cohortLabel(slice.birthYearStart, params.cohortWidth),
    birthYearStart: slice.birthYearStart,
    birthYearEnd: slice.birthYearEnd,
    ageStart: slice.ageStart,
    ageEnd: slice.ageEnd,
    status: statusFor(slice),
    population: slice.population,
    youngPopulation: slice.youngPopulation,
    workingPopulation: slice.workingPopulation,
    oldPopulation: slice.oldPopulation,
    assets: ledger.assets,
    liabilities: ledger.liabilities,
    netWorth,
    assetsPerCapita: ledger.assets * perCapitaScale,
    liabilitiesPerCapita: ledger.liabilities * perCapitaScale,
    netWorthPerCapita: netWorth * perCapitaScale,
    ...flows,
    constraintShare: flows.desiredCapital > 0
      ? Math.min(1, flows.fundingGap / flows.desiredCapital)
      : 0,
    cumulativeTaxes: ledger.cumulativeTaxes,
    cumulativeTransfers: ledger.cumulativeTransfers,
    cumulativeEducation: ledger.cumulativeEducation,
    cumulativePensionHealthcare: ledger.cumulativePensionHealthcare,
    cumulativeBequestsReceived: ledger.cumulativeBequestsReceived,
    cumulativeBequestsGiven: ledger.cumulativeBequestsGiven,
    cumulativeFundingGap: ledger.cumulativeFundingGap,
    cumulativeNetTransfer,
  };
}

function aggregateAccounts(
  accounts: CohortAccount[],
  birthYearStart: number,
  params: GenerationsParams,
): CohortAccount {
  const sum = (field: keyof CohortAccount): number =>
    accounts.reduce((total, account) => total + (account[field] as number), 0);
  const population = sum('population');
  const assets = sum('assets');
  const liabilities = sum('liabilities');
  const desiredCapital = sum('desiredCapital');
  const aggregate: CohortAccount = {
    label: cohortLabel(birthYearStart, params.cohortWidth),
    birthYearStart,
    birthYearEnd: birthYearStart + params.cohortWidth - 1,
    ageStart: Math.min(...accounts.map(a => a.ageStart)),
    ageEnd: Math.max(...accounts.map(a => a.ageEnd)),
    status: 'mixed',
    population,
    youngPopulation: sum('youngPopulation'),
    workingPopulation: sum('workingPopulation'),
    oldPopulation: sum('oldPopulation'),
    assets,
    liabilities,
    netWorth: assets - liabilities,
    assetsPerCapita: population > 0 ? assets * 1e12 / population : 0,
    liabilitiesPerCapita: population > 0 ? liabilities * 1e12 / population : 0,
    netWorthPerCapita: population > 0 ? (assets - liabilities) * 1e12 / population : 0,
    laborIncome: sum('laborIncome'),
    taxes: sum('taxes'),
    pensionHealthcare: sum('pensionHealthcare'),
    education: sum('education'),
    bequestsReceived: sum('bequestsReceived'),
    bequestsGiven: sum('bequestsGiven'),
    ownFunds: sum('ownFunds'),
    creditAllocated: sum('creditAllocated'),
    desiredCapital,
    fundedCapital: sum('fundedCapital'),
    fundingGap: sum('fundingGap'),
    borrowingLimitGap: sum('borrowingLimitGap'),
    creditRationingGap: sum('creditRationingGap'),
    constraintShare: desiredCapital > 0 ? Math.min(1, sum('fundingGap') / desiredCapital) : 0,
    cumulativeTaxes: sum('cumulativeTaxes'),
    cumulativeTransfers: sum('cumulativeTransfers'),
    cumulativeEducation: sum('cumulativeEducation'),
    cumulativePensionHealthcare: sum('cumulativePensionHealthcare'),
    cumulativeBequestsReceived: sum('cumulativeBequestsReceived'),
    cumulativeBequestsGiven: sum('cumulativeBequestsGiven'),
    cumulativeFundingGap: sum('cumulativeFundingGap'),
    cumulativeNetTransfer: sum('cumulativeNetTransfer'),
  };
  aggregate.status = statusFor(aggregate);
  return aggregate;
}

export const generationsModule: Module<
  GenerationsParams,
  GenerationsState,
  GenerationsInputs,
  GenerationsOutputs
> = {
  name: 'generations',
  description: 'Five-year birth-cohort balance sheets and capital-access diagnostics',
  defaults: generationsDefaults,

  paramMeta: {
    desiredNetCapitalGrowth: {
      description: 'Target net capital-stock growth used to define diagnostic desired investment.',
      unit: 'fraction/year',
      range: { min: 0, max: 0.08, default: 0.02 },
      tier: 1 as const,
    },
    borrowingLimitIncomeMultiple: {
      description: 'Maximum cohort liabilities as a multiple of annual labor income.',
      unit: 'ratio',
      range: { min: 0, max: 10, default: 4.0 },
      tier: 1 as const,
    },
    laborIncomeShare: {
      description: 'Share of GDP allocated to cohort labor income for generational accounts.',
      unit: 'fraction',
      range: { min: 0.4, max: 0.85, default: 0.67 },
      tier: 2 as const,
    },
    assetAgeWeight20to39: {
      description: 'Initial per-person asset ownership for ages 20-39, relative to ages 40-54.',
      unit: 'relative weight',
      range: { min: 0, max: 5, default: 0.241 },
      tier: 2 as const,
    },
    assetAgeWeight40to54: {
      description: 'Initial per-person asset ownership for ages 40-54 (normalization band).',
      unit: 'relative weight',
      range: { min: 0, max: 5, default: 1.00 },
      tier: 2 as const,
    },
    assetAgeWeight55to69: {
      description: 'Initial per-person asset ownership for ages 55-69, relative to ages 40-54.',
      unit: 'relative weight',
      range: { min: 0, max: 5, default: 1.182 },
      tier: 2 as const,
    },
    assetAgeWeight70plus: {
      description: 'Initial per-person asset ownership for ages 70+, relative to ages 40-54.',
      unit: 'relative weight',
      range: { min: 0, max: 5, default: 1.202 },
      tier: 2 as const,
    },
    newCapitalFunderShare: {
      description: 'Share of new productive investment owned by its current cohort funders; the rest accrues pro rata to incumbent owners.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.255 },
      tier: 2 as const,
    },
    debtAgeWeight20to39: {
      description: 'Initial per-person debt exposure for ages 20-39, relative to ages 40-54.',
      unit: 'relative weight',
      range: { min: 0, max: 5, default: 0.579 },
      tier: 2 as const,
    },
    debtAgeWeight40to54: {
      description: 'Initial per-person debt exposure for ages 40-54 (normalization band).',
      unit: 'relative weight',
      range: { min: 0, max: 5, default: 1.00 },
      tier: 2 as const,
    },
    debtAgeWeight55to69: {
      description: 'Initial per-person debt exposure for ages 55-69, relative to ages 40-54.',
      unit: 'relative weight',
      range: { min: 0, max: 5, default: 0.487 },
      tier: 2 as const,
    },
    debtAgeWeight70plus: {
      description: 'Initial per-person debt exposure for ages 70+, relative to ages 40-54.',
      unit: 'relative weight',
      range: { min: 0, max: 5, default: 0.198 },
      tier: 2 as const,
    },
  },

  inputs: [
    'regionalYoung',
    'regionalWorking',
    'regionalOld',
    'regionalPopulation',
    'regionalLifeExpectancy',
    'regionalGdp',
    'gdp',
    'stock',
    'nextCapitalStock',
    'investment',
    'generalInvestment',
    'creditImpulse',
    'privateDebtStock',
    'nextPrivateDebtStock',
    'publicDebtService',
    'regionalSavings',
    'regionalRetireeCost',
    'regionalChildCost',
  ] as const,

  outputs: [
    'cohortAccounts',
    'regionalCohortAccounts',
    'cohortDesiredCapital',
    'cohortFundedCapital',
    'cohortFundingGap',
    'aggregateCapitalFundingGap',
    'aggregateCapitalCoverage',
    'cohortBorrowingLimitGap',
    'cohortCreditRationingGap',
    'constrainedWorkingShare',
    'borrowingConstrainedWorkingShare',
    'cohortBequests',
    'cohortAssets',
    'cohortLiabilities',
  ] as const,

  validate(partial: Partial<GenerationsParams>) {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (partial.cohortWidth !== undefined &&
        (!Number.isInteger(partial.cohortWidth) || partial.cohortWidth < 1 || partial.cohortWidth > 10)) {
      errors.push('cohortWidth must be an integer between 1 and 10');
    }
    if (partial.maxAge !== undefined && (partial.maxAge < 80 || partial.maxAge > 120)) {
      errors.push('maxAge must be between 80 and 120');
    }
    if (partial.laborIncomeShare !== undefined &&
        (partial.laborIncomeShare < 0 || partial.laborIncomeShare > 1)) {
      errors.push('laborIncomeShare must be between 0 and 1');
    }
    if (partial.desiredNetCapitalGrowth !== undefined &&
        (partial.desiredNetCapitalGrowth < 0 || partial.desiredNetCapitalGrowth > 0.15)) {
      errors.push('desiredNetCapitalGrowth must be between 0 and 0.15');
    }
    if (partial.borrowingLimitIncomeMultiple !== undefined &&
        (partial.borrowingLimitIncomeMultiple < 0 || partial.borrowingLimitIncomeMultiple > 20)) {
      errors.push('borrowingLimitIncomeMultiple must be between 0 and 20');
    }
    if (partial.constraintTolerance !== undefined &&
        (partial.constraintTolerance < 0 || partial.constraintTolerance > 1)) {
      errors.push('constraintTolerance must be between 0 and 1');
    }
    const ageWeightErrors = (label: string, weights: Array<number | undefined>): string[] => {
      const provided = weights.filter((value): value is number => value !== undefined);
      const result: string[] = [];
      if (provided.some(value => !Number.isFinite(value) || value < 0 || value > 10)) {
        result.push(`${label} age weights must be finite numbers between 0 and 10`);
      }
      if (provided.length === 4 && provided.every(value => value === 0)) {
        result.push(`at least one ${label} age weight must be positive`);
      }
      return result;
    };
    errors.push(...ageWeightErrors('asset', [
      partial.assetAgeWeight20to39,
      partial.assetAgeWeight40to54,
      partial.assetAgeWeight55to69,
      partial.assetAgeWeight70plus,
    ]));
    errors.push(...ageWeightErrors('debt', [
      partial.debtAgeWeight20to39,
      partial.debtAgeWeight40to54,
      partial.debtAgeWeight55to69,
      partial.debtAgeWeight70plus,
    ]));
    if (partial.newCapitalFunderShare !== undefined &&
        (!Number.isFinite(partial.newCapitalFunderShare) ||
          partial.newCapitalFunderShare < 0 || partial.newCapitalFunderShare > 1)) {
      errors.push('newCapitalFunderShare must be between 0 and 1');
    }
    const minAge = partial.bequestRecipientMinAge ?? generationsDefaults.bequestRecipientMinAge;
    const maxAge = partial.bequestRecipientMaxAge ?? generationsDefaults.bequestRecipientMaxAge;
    if (minAge < 18 || maxAge > 80 || minAge > maxAge) {
      errors.push('bequest recipient ages must be ordered and between 18 and 80');
    }
    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<GenerationsParams>): GenerationsParams {
    return validatedMerge('generations', this.validate, p => ({
      ...generationsDefaults,
      ...p,
    }), partial);
  },

  init(): GenerationsState {
    return { initialized: false, accounts: {} };
  },

  step(state, inputs, params, year) {
    const slices = buildPopulationSlices(inputs, params, year);
    const keys = Object.keys(slices);
    const ledgers: Record<string, CohortLedgerState> = {};
    const flows: Record<string, AnnualFlows> = {};
    for (const key of keys) {
      const previous = state.accounts[key];
      ledgers[key] = previous ? { ...previous } : emptyLedger(slices[key].region, slices[key].birthYearStart);
      flows[key] = emptyFlows();
    }

    // Annual income, taxes, and dependent transfers. Taxes are an incidence
    // convention: workers finance transfers and public interest in proportion
    // to their labor income. The macro capital module itself has no tax ledger.
    for (const region of REGIONS) {
      const regionKeys = keys.filter(key => slices[key].region === region);
      const workingTotal = regionKeys.reduce((sum, key) => sum + slices[key].workingPopulation, 0);
      const youngTotal = regionKeys.reduce((sum, key) => sum + slices[key].youngPopulation, 0);
      const oldTotal = regionKeys.reduce((sum, key) => sum + slices[key].oldPopulation, 0);
      const regionLaborIncome = Math.max(0, inputs.regionalGdp[region]) * params.laborIncomeShare;
      const debtServiceShare = inputs.gdp > 0
        ? inputs.publicDebtService * Math.max(0, inputs.regionalGdp[region]) / inputs.gdp
        : 0;
      const regionTaxes = inputs.regionalRetireeCost[region] +
        inputs.regionalChildCost[region] + debtServiceShare;

      for (const key of regionKeys) {
        const slice = slices[key];
        const workerShare = workingTotal > 0 ? slice.workingPopulation / workingTotal : 0;
        const youngShare = youngTotal > 0 ? slice.youngPopulation / youngTotal : 0;
        const oldShare = oldTotal > 0 ? slice.oldPopulation / oldTotal : 0;
        flows[key].laborIncome = regionLaborIncome * workerShare;
        flows[key].taxes = regionTaxes * workerShare;
        flows[key].education = inputs.regionalChildCost[region] * youngShare;
        flows[key].pensionHealthcare = inputs.regionalRetireeCost[region] * oldShare;
      }
    }

    const assetScores: Record<string, number> = {};
    const debtScores: Record<string, number> = {};
    for (const key of keys) {
      const slice = slices[key];
      const regionPop = Math.max(1, inputs.regionalPopulation[slice.region]);
      const incomePerCapita = Math.max(0, inputs.regionalGdp[slice.region]) / regionPop;
      assetScores[key] = slice.population * incomePerCapita * ageBandWeight(
        slice.representativeAge,
        params.assetAgeWeight20to39,
        params.assetAgeWeight40to54,
        params.assetAgeWeight55to69,
        params.assetAgeWeight70plus,
      );
      // Outstanding liabilities persist after labor income stops. Using current
      // labor income here assigned retirees exactly zero debt, despite mortgages
      // and other balances commonly extending into retirement. Population ×
      // regional income per capita supplies a scale-neutral exposure base; the
      // age profile determines its allocation. New credit remains restricted
      // separately below to cohorts with capital demand and borrowing headroom.
      debtScores[key] = slice.population * incomePerCapita * ageBandWeight(
        slice.representativeAge,
        params.debtAgeWeight20to39,
        params.debtAgeWeight40to54,
        params.debtAgeWeight55to69,
        params.debtAgeWeight70plus,
      );
    }

    // Initialize the 2025 ownership/debt distribution, or carry prior cohort
    // shares forward and reconcile them to the macro stocks.
    if (!state.initialized) {
      const initialAssets = allocatePool(inputs.stock, assetScores, keys);
      const initialDebt = allocatePool(inputs.privateDebtStock, debtScores, keys);
      for (const key of keys) {
        ledgers[key].assets = initialAssets[key];
        ledgers[key].liabilities = initialDebt[key];
      }
    } else {
      // Cohorts older than maxAge leave their remaining assets as bequests.
      const expiredByRegion = Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>;
      for (const [key, account] of Object.entries(state.accounts)) {
        if (!slices[key]) expiredByRegion[account.region] += account.assets;
      }
      const expiredReceived: Record<string, number> = {};
      for (const region of REGIONS) {
        distributeBequest(region, expiredByRegion[region], slices, ledgers, expiredReceived, params);
      }
      for (const [key, value] of Object.entries(expiredReceived)) {
        flows[key].bequestsReceived += value;
      }
      scaleLedgerField(ledgers, 'assets', inputs.stock, assetScores);
      scaleLedgerField(ledgers, 'liabilities', inputs.privateDebtStock, debtScores);
    }

    // Mortality transfers productive-asset ownership to working-age heirs.
    // This is deliberately gross bequest accounting; estate taxes and the
    // allocation of creditor claims are outside the current macro model.
    const mortalityBequests = Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>;
    for (const key of keys) {
      const slice = slices[key];
      const oldMortality = 1 / Math.max(15, inputs.regionalLifeExpectancy[slice.region] - 55);
      const mortalityRate = slice.population > 0
        ? (slice.youngPopulation * 0.001 + slice.workingPopulation * 0.003 +
          slice.oldPopulation * oldMortality) / slice.population
        : 0;
      const bequest = ledgers[key].assets * Math.min(1, Math.max(0, mortalityRate));
      ledgers[key].assets -= bequest;
      flows[key].bequestsGiven += bequest;
      mortalityBequests[slice.region] += bequest;
    }
    const mortalityReceived: Record<string, number> = {};
    for (const region of REGIONS) {
      distributeBequest(region, mortalityBequests[region], slices, ledgers, mortalityReceived, params);
    }
    for (const [key, value] of Object.entries(mortalityReceived)) {
      flows[key].bequestsReceived += value;
    }

    // Desired investment = replacement implied by the macro stock transition
    // plus a user-visible target net growth rate.
    const impliedDepreciation = inputs.stock > 0
      ? Math.max(0, Math.min(1, (inputs.stock + inputs.generalInvestment - inputs.nextCapitalStock) / inputs.stock))
      : 0;
    const desiredTotal = inputs.stock * (impliedDepreciation + params.desiredNetCapitalGrowth);
    const desiredScores: Record<string, number> = {};
    const savingScores: Record<string, number> = {};
    for (const key of keys) {
      const slice = slices[key];
      desiredScores[key] = flows[key].laborIncome * capitalDemandWeight(slice.representativeAge);
      savingScores[key] = flows[key].laborIncome * savingAgeWeight(slice.representativeAge) *
        Math.max(0, inputs.regionalSavings[slice.region]);
    }
    const desiredAllocation = allocatePool(desiredTotal, desiredScores, keys);
    const generalShare = inputs.investment > 0
      ? Math.max(0, Math.min(1, inputs.generalInvestment / inputs.investment))
      : 0;
    const generalCreditPool = Math.min(
      inputs.generalInvestment,
      Math.max(0, inputs.creditImpulse * generalShare),
    );
    const ownFundsPool = Math.max(0, inputs.generalInvestment - generalCreditPool);
    const ownFundsAllocation = allocatePool(ownFundsPool, savingScores, keys);

    const eligibleCredit: Record<string, number> = {};
    for (const key of keys) {
      const desired = desiredAllocation[key];
      const ownFunds = ownFundsAllocation[key];
      const desiredBorrowing = Math.max(0, desired - ownFunds);
      const borrowingLimit = params.borrowingLimitIncomeMultiple * flows[key].laborIncome;
      const borrowingHeadroom = Math.max(0, borrowingLimit - ledgers[key].liabilities);
      eligibleCredit[key] = Math.min(desiredBorrowing, borrowingHeadroom);
      flows[key].desiredCapital = desired;
      flows[key].ownFunds = ownFunds;
      flows[key].borrowingLimitGap = Math.max(0, desiredBorrowing - borrowingHeadroom);
    }
    const creditAllocation = allocatePool(
      Math.min(generalCreditPool, Object.values(eligibleCredit).reduce((sum, value) => sum + value, 0)),
      eligibleCredit,
      keys,
    );
    for (const key of keys) {
      flows[key].creditAllocated = creditAllocation[key];
      flows[key].fundedCapital = Math.min(
        flows[key].desiredCapital,
        flows[key].ownFunds + flows[key].creditAllocated,
      );
      flows[key].fundingGap = Math.max(0, flows[key].desiredCapital - flows[key].fundedCapital);
      flows[key].creditRationingGap = Math.max(
        0,
        eligibleCredit[key] - flows[key].creditAllocated,
      );
    }

    // Add current flows to cumulative ledgers before producing snapshots.
    for (const key of keys) {
      const transfer = flows[key].education + flows[key].pensionHealthcare;
      ledgers[key].cumulativeTaxes += flows[key].taxes;
      ledgers[key].cumulativeTransfers += transfer;
      ledgers[key].cumulativeEducation += flows[key].education;
      ledgers[key].cumulativePensionHealthcare += flows[key].pensionHealthcare;
      ledgers[key].cumulativeBequestsReceived += flows[key].bequestsReceived;
      ledgers[key].cumulativeBequestsGiven += flows[key].bequestsGiven;
      ledgers[key].cumulativeFundingGap += flows[key].fundingGap;
    }

    // End-of-period productive asset ownership. Existing owners retain the
    // post-depreciation stock. Only newCapitalFunderShare of new general
    // investment is owned by its current cohort funders; the remainder accrues
    // pro rata to incumbent owners. Households mostly hold new capital through
    // retained corporate earnings, pension claims, and revalued existing
    // assets rather than by directly purchasing it from labor income, so
    // funder-only ownership drained old cohorts of assets at rates the DFA
    // replay rejects.
    const funderOwnedInvestment = inputs.generalInvestment * params.newCapitalFunderShare;
    const incumbentCapital = Math.max(0, inputs.nextCapitalStock - funderOwnedInvestment);
    scaleLedgerField(ledgers, 'assets', incumbentCapital, assetScores);
    const ownershipScores: Record<string, number> = {};
    for (const key of keys) {
      ownershipScores[key] = flows[key].ownFunds + flows[key].creditAllocated;
      if (ownershipScores[key] <= 0) ownershipScores[key] = savingScores[key] + desiredScores[key];
    }
    const newAssetOwnership = allocatePool(funderOwnedInvestment, ownershipScores, keys);
    for (const key of keys) ledgers[key].assets += newAssetOwnership[key];

    // End-of-period private liabilities: retain the post-amortization base and
    // allocate new credit to cohorts with capital demand and borrowing headroom.
    // The macro next-debt stock has already deducted amortization, so retained
    // balances stay proportional to existing cohort liabilities. Applying an
    // additional age-retention factor here previously erased retiree debt at
    // 60-98% per year, effectively amortizing it twice.
    const retainedDebt = Math.max(0, inputs.nextPrivateDebtStock - inputs.creditImpulse);
    const retainedDebtScores: Record<string, number> = {};
    for (const key of keys) {
      retainedDebtScores[key] = ledgers[key].liabilities;
    }
    const retainedDebtAllocation = allocatePool(retainedDebt, retainedDebtScores, keys);
    for (const key of keys) ledgers[key].liabilities = retainedDebtAllocation[key];
    const totalCreditScores: Record<string, number> = {};
    for (const key of keys) {
      totalCreditScores[key] = eligibleCredit[key] > 0 ? eligibleCredit[key] : desiredScores[key];
    }
    const newLiabilities = allocatePool(inputs.creditImpulse, totalCreditScores, keys);
    for (const key of keys) ledgers[key].liabilities += newLiabilities[key];
    // Macro rounding and unusual scenarios can make retainedDebt + credit differ
    // slightly from the target. Reconcile exactly.
    scaleLedgerField(ledgers, 'liabilities', inputs.nextPrivateDebtStock, debtScores);

    const regionalCohortAccounts = Object.fromEntries(
      REGIONS.map(region => [region, {}])
    ) as Record<Region, Record<string, CohortAccount>>;
    for (const key of keys) {
      const slice = slices[key];
      const label = cohortLabel(slice.birthYearStart, params.cohortWidth);
      regionalCohortAccounts[slice.region][label] = finalizeAccount(
        slice,
        ledgers[key],
        flows[key],
        params,
      );
    }

    const cohortAccounts: Record<string, CohortAccount> = {};
    const birthYears = [...new Set(Object.values(slices).map(slice => slice.birthYearStart))]
      .sort((a, b) => a - b);
    for (const birthYear of birthYears) {
      const accounts = REGIONS
        .map(region => regionalCohortAccounts[region][cohortLabel(birthYear, params.cohortWidth)])
        .filter((account): account is CohortAccount => account !== undefined);
      cohortAccounts[cohortLabel(birthYear, params.cohortWidth)] = aggregateAccounts(
        accounts,
        birthYear,
        params,
      );
    }

    const totalWorking = keys.reduce((sum, key) => sum + slices[key].workingPopulation, 0);
    let constrainedWorking = 0;
    let borrowingConstrainedWorking = 0;
    for (const key of keys) {
      const desired = flows[key].desiredCapital;
      if (desired <= 0) continue;
      if (flows[key].fundingGap / desired > params.constraintTolerance) {
        constrainedWorking += slices[key].workingPopulation;
      }
      if (flows[key].borrowingLimitGap / desired > params.constraintTolerance) {
        borrowingConstrainedWorking += slices[key].workingPopulation;
      }
    }

    const sumFlow = (field: keyof AnnualFlows): number =>
      keys.reduce((sum, key) => sum + flows[key][field], 0);
    const cohortBequests = sumFlow('bequestsReceived');

    return {
      state: {
        initialized: true,
        accounts: ledgers,
      },
      outputs: {
        cohortAccounts,
        regionalCohortAccounts,
        cohortDesiredCapital: sumFlow('desiredCapital'),
        cohortFundedCapital: sumFlow('fundedCapital'),
        cohortFundingGap: sumFlow('fundingGap'),
        aggregateCapitalFundingGap: Math.max(0, desiredTotal - inputs.generalInvestment),
        aggregateCapitalCoverage: desiredTotal > 0
          ? Math.min(1, inputs.generalInvestment / desiredTotal)
          : 1,
        cohortBorrowingLimitGap: sumFlow('borrowingLimitGap'),
        cohortCreditRationingGap: sumFlow('creditRationingGap'),
        constrainedWorkingShare: totalWorking > 0 ? constrainedWorking / totalWorking : 0,
        borrowingConstrainedWorkingShare: totalWorking > 0
          ? borrowingConstrainedWorking / totalWorking
          : 0,
        cohortBequests,
        cohortAssets: Object.values(ledgers).reduce((sum, ledger) => sum + ledger.assets, 0),
        cohortLiabilities: Object.values(ledgers).reduce((sum, ledger) => sum + ledger.liabilities, 0),
      },
    };
  },
};

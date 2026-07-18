/**
 * Historical validation for the five-year generational accounts.
 *
 * This is deliberately a *conditional replay*, not a calibration of the full
 * energy/economy model. Observed U.S. aggregate household assets and
 * liabilities from the Federal Reserve DFA, and observed U.S. GDP/population
 * from the World Bank, are supplied to the cohort ledger. The ledger is then
 * judged on the part it actually determines: allocation across ages and the
 * timing of its capital-constraint diagnostic.
 *
 * An optional National Transfer Accounts (NTA) file provides a second,
 * cross-sectional check on the age shapes of labor income, taxes, education,
 * pensions, and health transfers.
 *
 * Data sources and example invocation are documented in
 * docs/GENERATIONAL_BACKCAST.md.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REGIONS, type Region } from '../src/domain-types.js';
import {
  generationsModule,
  type CohortAccount,
  type GenerationsParams,
} from '../src/modules/generations.js';
import { runSimulation } from '../src/simulation.js';

type CsvRow = Record<string, string>;

const AGE_GROUPS = ['ageunder40', 'age40to54', 'age55to69', 'age70plus'] as const;
type AgeGroup = typeof AGE_GROUPS[number];

interface DfaCell {
  assets: number;
  liabilities: number;
}

interface DfaYear {
  year: number;
  assets: number;
  liabilities: number;
  groups: Record<AgeGroup, DfaCell>;
}

interface ReplayYear {
  year: number;
  accounts: Record<string, CohortAccount>;
  constrainedWorkingShare: number;
  borrowingConstrainedWorkingShare: number;
  aggregateCapitalCoverage: number;
  cohortFundingGap: number;
  gdp: number;
}

interface ShareFit {
  maePercentagePoints: number;
  rSquared: number;
  correlation: number;
}

interface ProfileFit {
  variable: string;
  observedPeakAge: number;
  modelPeakAge: number;
  totalVariation: number;
  correlation: number;
}

interface WorldBankData {
  population: Map<number, number>;
  age0to14: Map<number, number>;
  age15to64: Map<number, number>;
  age65plus: Map<number, number>;
  gdp: Map<number, number>;
  lifeExpectancy: Map<number, number>;
}

// Initial age-weight calibration is symmetric between the two balance-sheet
// sides: four scale-free weights on the DFA age bands, with 40-54 normalized
// to one. Each side declares its param keys and the DFA field it is scored on.
const PROFILE_SIDES = {
  assets: {
    label: 'asset',
    field: 'assets',
    keys: [
      'assetAgeWeight20to39',
      'assetAgeWeight40to54',
      'assetAgeWeight55to69',
      'assetAgeWeight70plus',
    ],
  },
  liabilities: {
    label: 'debt',
    field: 'liabilities',
    keys: [
      'debtAgeWeight20to39',
      'debtAgeWeight40to54',
      'debtAgeWeight55to69',
      'debtAgeWeight70plus',
    ],
  },
} as const;
type ProfileSide = typeof PROFILE_SIDES[keyof typeof PROFILE_SIDES];
type ProfileKey = ProfileSide['keys'][number];
type AgeProfile = Partial<Record<ProfileKey, number>>;

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const equals = arg.indexOf('=');
    if (equals === -1) result[arg.slice(2)] = true;
    else result[arg.slice(2, equals)] = arg.slice(equals + 1);
  }
  return result;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function readCsv(path: string): CsvRow[] {
  const lines = readFileSync(path, 'utf8')
    .replace(/\r/g, '')
    .split('\n')
    .filter(line => line.length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? '']));
  });
}

function number(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function loadDfa(path: string): Map<number, DfaYear> {
  const rows = readCsv(path);
  const byYear = new Map<number, DfaYear>();
  for (const row of rows) {
    const match = /^(\d{4}):Q4$/.exec(row.Date);
    if (!match || !AGE_GROUPS.includes(row.Category as AgeGroup)) continue;
    const year = Number(match[1]);
    const group = row.Category as AgeGroup;
    const entry = byYear.get(year) ?? {
      year,
      assets: 0,
      liabilities: 0,
      groups: Object.fromEntries(AGE_GROUPS.map(key => [key, { assets: 0, liabilities: 0 }])) as
        Record<AgeGroup, DfaCell>,
    };
    // DFA level files are in millions of current dollars; model stocks are $T.
    const assets = number(row.Assets) / 1e6;
    const liabilities = number(row.Liabilities) / 1e6;
    entry.groups[group] = { assets, liabilities };
    entry.assets += assets;
    entry.liabilities += liabilities;
    byYear.set(year, entry);
  }
  return byYear;
}

function loadWorldBankSeries(path: string): Map<number, number> {
  const payload = JSON.parse(readFileSync(path, 'utf8')) as [unknown, Array<{ date: string; value: number | null }>];
  const rows = Array.isArray(payload) ? payload[1] : [];
  const result = new Map<number, number>();
  for (const row of rows ?? []) {
    const value = row.value;
    if (value !== null && Number.isFinite(value)) result.set(Number(row.date), value);
  }
  return result;
}

function loadWorldBankData(directory: string): WorldBankData {
  return {
    population: loadWorldBankSeries(join(directory, 'wb-pop.json')),
    age0to14: loadWorldBankSeries(join(directory, 'wb-young.json')),
    age15to64: loadWorldBankSeries(join(directory, 'wb-working.json')),
    age65plus: loadWorldBankSeries(join(directory, 'wb-old.json')),
    gdp: loadWorldBankSeries(join(directory, 'wb-gdp.json')),
    lifeExpectancy: loadWorldBankSeries(join(directory, 'wb-life.json')),
  };
}

function lastAvailable(series: Map<number, number>, year: number): number {
  for (let candidate = year; candidate >= year - 5; candidate--) {
    const value = series.get(candidate);
    if (value !== undefined) return value;
  }
  throw new Error(`No value at or shortly before ${year}`);
}

function regionalRecord(value: number, activeRegion: Region = 'oecd'): Record<Region, number> {
  return Object.fromEntries(REGIONS.map(region => [region, region === activeRegion ? value : 0])) as
    Record<Region, number>;
}

function modelAgeGroup(age: number): AgeGroup {
  if (age < 40) return 'ageunder40';
  if (age < 55) return 'age40to54';
  if (age < 70) return 'age55to69';
  return 'age70plus';
}

function ageGroupOverlap(account: CohortAccount, group: AgeGroup): number {
  const bounds: Record<AgeGroup, [number, number]> = {
    ageunder40: [0, 39],
    age40to54: [40, 54],
    age55to69: [55, 69],
    age70plus: [70, 105],
  };
  const [lo, hi] = bounds[group];
  const overlapLo = Math.max(lo, Math.ceil(account.ageStart));
  const overlapHi = Math.min(hi, Math.floor(account.ageEnd));
  if (overlapHi < overlapLo) return 0;
  const accountYears = Math.max(1, Math.floor(account.ageEnd) - Math.ceil(account.ageStart) + 1);
  return (overlapHi - overlapLo + 1) / accountYears;
}

function groupModelAccounts(accounts: Record<string, CohortAccount>): Record<AgeGroup, DfaCell> {
  const grouped = Object.fromEntries(
    AGE_GROUPS.map(group => [group, { assets: 0, liabilities: 0 }]),
  ) as Record<AgeGroup, DfaCell>;
  for (const account of Object.values(accounts)) {
    for (const group of AGE_GROUPS) {
      const overlap = ageGroupOverlap(account, group);
      grouped[group].assets += account.assets * overlap;
      grouped[group].liabilities += account.liabilities * overlap;
    }
  }
  return grouped;
}

function shares(cells: Record<AgeGroup, DfaCell>, field: keyof DfaCell): Record<AgeGroup, number> {
  const total = AGE_GROUPS.reduce((sum, group) => sum + cells[group][field], 0);
  return Object.fromEntries(
    AGE_GROUPS.map(group => [group, total > 0 ? cells[group][field] / total : 0]),
  ) as Record<AgeGroup, number>;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function correlation(observed: number[], modeled: number[]): number {
  if (observed.length !== modeled.length || observed.length === 0) return 0;
  const observedMean = mean(observed);
  const modeledMean = mean(modeled);
  let covariance = 0;
  let observedVariance = 0;
  let modeledVariance = 0;
  for (let i = 0; i < observed.length; i++) {
    const o = observed[i] - observedMean;
    const m = modeled[i] - modeledMean;
    covariance += o * m;
    observedVariance += o * o;
    modeledVariance += m * m;
  }
  const denominator = Math.sqrt(observedVariance * modeledVariance);
  return denominator > 0 ? covariance / denominator : 0;
}

function rSquared(observed: number[], modeled: number[]): number {
  const observedMean = mean(observed);
  const sse = observed.reduce((sum, value, i) => sum + (value - modeled[i]) ** 2, 0);
  const sst = observed.reduce((sum, value) => sum + (value - observedMean) ** 2, 0);
  return sst > 0 ? 1 - sse / sst : 0;
}

function fitShares(
  observed: Array<Record<AgeGroup, number>>,
  modeled: Array<Record<AgeGroup, number>>,
): ShareFit {
  const o = observed.flatMap(row => AGE_GROUPS.map(group => row[group]));
  const m = modeled.flatMap(row => AGE_GROUPS.map(group => row[group]));
  return {
    maePercentagePoints: mean(o.map((value, i) => Math.abs(value - m[i]))) * 100,
    rSquared: rSquared(o, m),
    correlation: correlation(o, m),
  };
}

function runReplay(
  dfa: Map<number, DfaYear>,
  worldBankDir: string,
  overrides: Partial<GenerationsParams> = {},
  suppliedWorldBank?: WorldBankData,
): ReplayYear[] {
  const worldBank = suppliedWorldBank ?? loadWorldBankData(worldBankDir);
  const { population, age0to14, age15to64, age65plus, gdp, lifeExpectancy } = worldBank;

  const years = [...dfa.keys()].sort((a, b) => a - b);
  const first = years[0];
  const last = years[years.length - 1];
  const params = generationsModule.mergeParams(overrides);
  let state = generationsModule.init(params);
  const replay: ReplayYear[] = [];

  for (let year = first; year < last; year++) {
    const current = dfa.get(year);
    const next = dfa.get(year + 1);
    if (!current || !next) continue;

    const pop = lastAvailable(population, year);
    const share0to14 = lastAvailable(age0to14, year) / 100;
    const share15to64 = lastAvailable(age15to64, year) / 100;
    const share65plus = lastAvailable(age65plus, year) / 100;
    // World Bank reports 0-14 and 15-64. Approximate ages 15-19 as
    // five-fiftieths of the 15-64 band, making the ledger's 0-19/20-64 split.
    const young = pop * (share0to14 + share15to64 * 0.10);
    const working = pop * share15to64 * 0.90;
    const old = pop * share65plus;
    const gdpTrillions = lastAvailable(gdp, year) / 1e12;
    const life = lastAvailable(lifeExpectancy, year);

    // Reconstruct gross flows from observed end-of-year balance sheets using
    // the same 5% depreciation/amortization conventions as the macro model.
    // Asset-price revaluations are therefore included: this is a generous
    // funding proxy, not a national-accounts measure of fixed investment.
    const generalInvestment = Math.max(0, next.assets - current.assets * 0.95);
    const investment = generalInvestment / 0.85;
    const creditImpulse = Math.max(0, next.liabilities - current.liabilities * 0.95);

    const step = generationsModule.step(state, {
      regionalYoung: regionalRecord(young),
      regionalWorking: regionalRecord(working),
      regionalOld: regionalRecord(old),
      regionalPopulation: regionalRecord(pop),
      regionalLifeExpectancy: regionalRecord(life),
      regionalGdp: regionalRecord(gdpTrillions),
      gdp: gdpTrillions,
      stock: current.assets,
      nextCapitalStock: next.assets,
      investment,
      generalInvestment,
      creditImpulse,
      privateDebtStock: current.liabilities,
      nextPrivateDebtStock: next.liabilities,
      publicDebtService: 0.02 * gdpTrillions,
      regionalSavings: regionalRecord(0.20),
      regionalRetireeCost: regionalRecord(0.10 * gdpTrillions),
      regionalChildCost: regionalRecord(0.05 * gdpTrillions),
    }, params, year, year - first);

    state = step.state;
    replay.push({
      year: year + 1,
      accounts: step.outputs.regionalCohortAccounts.oecd,
      constrainedWorkingShare: step.outputs.constrainedWorkingShare,
      borrowingConstrainedWorkingShare: step.outputs.borrowingConstrainedWorkingShare,
      aggregateCapitalCoverage: step.outputs.aggregateCapitalCoverage,
      cohortFundingGap: step.outputs.cohortFundingGap,
      gdp: gdpTrillions,
    });
  }
  return replay;
}

function snapshotShares(
  observed: DfaYear,
  worldBank: WorldBankData,
  overrides: Partial<GenerationsParams>,
  field: keyof DfaCell,
): Record<AgeGroup, number> {
  const year = observed.year;
  const pop = lastAvailable(worldBank.population, year);
  const share0to14 = lastAvailable(worldBank.age0to14, year) / 100;
  const share15to64 = lastAvailable(worldBank.age15to64, year) / 100;
  const share65plus = lastAvailable(worldBank.age65plus, year) / 100;
  const young = pop * (share0to14 + share15to64 * 0.10);
  const working = pop * share15to64 * 0.90;
  const old = pop * share65plus;
  const gdp = lastAvailable(worldBank.gdp, year) / 1e12;
  const life = lastAvailable(worldBank.lifeExpectancy, year);
  const params = generationsModule.mergeParams(overrides);
  const step = generationsModule.step(generationsModule.init(params), {
    regionalYoung: regionalRecord(young),
    regionalWorking: regionalRecord(working),
    regionalOld: regionalRecord(old),
    regionalPopulation: regionalRecord(pop),
    regionalLifeExpectancy: regionalRecord(life),
    regionalGdp: regionalRecord(gdp),
    gdp,
    stock: observed.assets,
    nextCapitalStock: observed.assets * 0.95,
    investment: 0,
    generalInvestment: 0,
    creditImpulse: 0,
    privateDebtStock: observed.liabilities,
    nextPrivateDebtStock: observed.liabilities * 0.95,
    publicDebtService: 0,
    regionalSavings: regionalRecord(0),
    regionalRetireeCost: regionalRecord(0),
    regionalChildCost: regionalRecord(0),
  }, params, year, 0);
  return shares(groupModelAccounts(step.outputs.regionalCohortAccounts.oecd), field);
}

function snapshotFit(
  dfa: Map<number, DfaYear>,
  worldBank: WorldBankData,
  years: number[],
  overrides: Partial<GenerationsParams>,
  field: keyof DfaCell,
): ShareFit {
  const observed: Array<Record<AgeGroup, number>> = [];
  const modeled: Array<Record<AgeGroup, number>> = [];
  for (const year of years) {
    const row = dfa.get(year);
    if (!row) continue;
    observed.push(shares(row.groups, field));
    modeled.push(snapshotShares(row, worldBank, overrides, field));
  }
  return fitShares(observed, modeled);
}

function replayFit(
  dfa: Map<number, DfaYear>,
  replay: ReplayYear[],
  years: number[],
  field: keyof DfaCell,
): ShareFit {
  const observed: Array<Record<AgeGroup, number>> = [];
  const modeled: Array<Record<AgeGroup, number>> = [];
  for (const year of years) {
    const observedRow = dfa.get(year);
    const modeledRow = replay.find(row => row.year === year);
    if (!observedRow || !modeledRow) continue;
    observed.push(shares(observedRow.groups, field));
    modeled.push(shares(groupModelAccounts(modeledRow.accounts), field));
  }
  return fitShares(observed, modeled);
}

function profileFromWeights(side: ProfileSide, weights: number[]): AgeProfile {
  return Object.fromEntries(side.keys.map((key, i) => [key, weights[i]]));
}

function normalizeProfile(side: ProfileSide, profile: AgeProfile): AgeProfile {
  const scale = Math.max(1e-9, profile[side.keys[1]] ?? 0);
  return {
    ...profile,
    ...profileFromWeights(
      side,
      side.keys.map((key, i) => i === 1 ? 1 : (profile[key] ?? 0) / scale),
    ),
  };
}

function defaultProfile(side: ProfileSide): AgeProfile {
  return normalizeProfile(
    side,
    Object.fromEntries(side.keys.map(key => [key, generationsModule.defaults[key]])),
  );
}

function calibrateProfile(
  dfa: Map<number, DfaYear>,
  worldBank: WorldBankData,
  side: ProfileSide,
  baseOverrides: Partial<GenerationsParams>,
): {
  profile: AgeProfile;
  trainingYears: number[];
  validationYears: number[];
  trainingSnapshotFit: ShareFit;
  validationSnapshotFit: ShareFit;
  trainingReplayFit: ShareFit;
  validationReplayFit: ShareFit;
} {
  // Estimate a time-invariant curve on the first two thirds of the DFA sample.
  // The objective gives equal weight to stand-alone age shares and the
  // conditional replay, preserving 2013-2025 as a chronological check.
  const availableYears = [...dfa.keys()].sort((a, b) => a - b);
  const trainingYears = availableYears.filter(year => year <= 2012);
  const validationYears = availableYears.filter(year => year >= 2013);
  const trainingReplayYears = [1995, 2001, 2007, 2009, 2011];
  const validationReplayYears = [2019, 2025];
  const starts: AgeProfile[] = [
    defaultProfile(side),
    profileFromWeights(side, [0.50, 1, 0.50, 0.25]),
    profileFromWeights(side, [1, 1, 1, 1]),
    profileFromWeights(side, [0.25, 1, 1, 1]),
    profileFromWeights(side, [0.25, 1, 2, 3]),
  ];
  const adjustable: ProfileKey[] = [side.keys[0], side.keys[2], side.keys[3]];
  const cache = new Map<string, number>();
  const objective = (profile: AgeProfile): number => {
    const key = side.keys.map(field => (profile[field] ?? 0).toFixed(8)).join(':');
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const overrides = { ...baseOverrides, ...profile };
    const snapshotMae = snapshotFit(
      dfa,
      worldBank,
      trainingYears,
      overrides,
      side.field,
    ).maePercentagePoints;
    const replayMae = replayFit(
      dfa,
      runReplay(dfa, '', overrides, worldBank),
      trainingReplayYears,
      side.field,
    ).maePercentagePoints;
    const value = 0.5 * (snapshotMae + replayMae);
    cache.set(key, value);
    return value;
  };

  let bestProfile = starts[0];
  let bestScore = objective(bestProfile);
  for (const start of starts) {
    let profile = normalizeProfile(side, start);
    let score = objective(profile);
    for (const logStep of [1, 0.5, 0.25, 0.10, 0.05, 0.02, 0.01]) {
      for (let iteration = 0; iteration < 20; iteration++) {
        let nextProfile = profile;
        let nextScore = score;
        for (const field of adjustable) {
          for (const direction of [-1, 1]) {
            const candidate = {
              ...profile,
              [field]: Math.min(10, Math.max(0.01, (profile[field] ?? 0) * Math.exp(direction * logStep))),
            };
            const candidateScore = objective(candidate);
            if (candidateScore < nextScore - 1e-9) {
              nextProfile = candidate;
              nextScore = candidateScore;
            }
          }
        }
        if (nextProfile === profile) break;
        profile = nextProfile;
        score = nextScore;
      }
    }
    if (score < bestScore) {
      bestProfile = profile;
      bestScore = score;
    }
  }

  // Three decimals avoids presenting optimizer noise as empirical precision.
  const rounded = Object.fromEntries(
    side.keys.map(field => [field, Number((bestProfile[field] ?? 0).toFixed(3))]),
  ) as AgeProfile;
  const roundedOverrides = { ...baseOverrides, ...rounded };
  const roundedReplay = runReplay(dfa, '', roundedOverrides, worldBank);
  return {
    profile: rounded,
    trainingYears,
    validationYears,
    trainingSnapshotFit: snapshotFit(dfa, worldBank, trainingYears, roundedOverrides, side.field),
    validationSnapshotFit: snapshotFit(dfa, worldBank, validationYears, roundedOverrides, side.field),
    trainingReplayFit: replayFit(dfa, roundedReplay, trainingReplayYears, side.field),
    validationReplayFit: replayFit(dfa, roundedReplay, validationReplayYears, side.field),
  };
}

function formatProfile(side: ProfileSide, profile: AgeProfile): string {
  const bands = ['20-39', '40-54', '55-69', '70+'];
  return side.keys
    .map((key, i) => `${bands[i]} ${(profile[key] ?? 0).toFixed(3)}`)
    .join(', ');
}

function parseProfile(side: ProfileSide, flag: string, value: string): AgeProfile {
  const weights = value.split(',').map(Number);
  if (weights.length !== 4 || weights.some(weight => !Number.isFinite(weight) || weight < 0) ||
      weights[1] <= 0) {
    throw new Error(
      `--${flag} requires four non-negative comma-separated weights, with 40-54 positive`,
    );
  }
  return normalizeProfile(side, profileFromWeights(side, weights));
}

function normalizedProfile(values: number[]): number[] {
  const positive = values.map(value => Math.max(0, value));
  const total = positive.reduce((sum, value) => sum + value, 0);
  return positive.map(value => total > 0 ? value / total : 0);
}

function peakAge(values: number[]): number {
  let index = 0;
  for (let age = 1; age < values.length; age++) {
    if (values[age] > values[index]) index = age;
  }
  return index;
}

function accountAtAge(accounts: Record<string, CohortAccount>, age: number): CohortAccount | undefined {
  return Object.values(accounts).find(account => age >= account.ageStart && age <= account.ageEnd);
}

function validateNta(path: string, accounts: Record<string, CohortAccount>): ProfileFit[] {
  const rows = readCsv(path).filter(row => row.Country === 'US' && Number(row.Age) <= 100);
  const variables: Array<{
    label: string;
    observed: (row: CsvRow) => number;
    observedType: string;
    modeled: (account: CohortAccount) => number;
  }> = [
    {
      label: 'Labor income',
      observed: row => number(row['Labor Income']),
      observedType: 'Smooth Mean',
      modeled: account => account.population > 0 ? account.laborIncome * 1e12 / account.population : 0,
    },
    {
      label: 'Taxes',
      observed: row => number(row.Taxes),
      observedType: 'Smooth Mean',
      modeled: account => account.population > 0 ? account.taxes * 1e12 / account.population : 0,
    },
    {
      label: 'Education',
      observed: row => number(row['Public Consumption, Education']),
      observedType: 'Mean',
      modeled: account => account.population > 0 ? account.education * 1e12 / account.population : 0,
    },
    {
      label: 'Pension + health',
      observed: row => number(row['Public Transfers, Health, Inflows']) +
        number(row['Public Transfers, Pensions, Inflows']),
      observedType: 'Smooth Mean',
      modeled: account => account.population > 0
        ? account.pensionHealthcare * 1e12 / account.population
        : 0,
    },
  ];

  return variables.map(variable => {
    const observed = Array.from({ length: 101 }, () => 0);
    const modeled = Array.from({ length: 101 }, () => 0);
    for (const row of rows) {
      if (row.Type !== variable.observedType) continue;
      const age = Number(row.Age);
      observed[age] = variable.observed(row);
    }
    for (let age = 0; age <= 100; age++) {
      const account = accountAtAge(accounts, age);
      if (account) modeled[age] = variable.modeled(account);
    }
    const observedNorm = normalizedProfile(observed);
    const modeledNorm = normalizedProfile(modeled);
    return {
      variable: variable.label,
      observedPeakAge: peakAge(observed),
      modelPeakAge: peakAge(modeled),
      totalVariation: 0.5 * observedNorm.reduce(
        (sum, value, age) => sum + Math.abs(value - modeledNorm[age]),
        0,
      ),
      correlation: correlation(observedNorm, modeledNorm),
    };
  });
}

function loadSloos(path: string): Map<number, number> {
  const rows = readCsv(path);
  const observations = new Map<number, number[]>();
  for (const row of rows) {
    const year = Number((row.observation_date ?? '').slice(0, 4));
    const value = Number(row.DRTSCILM);
    if (!Number.isFinite(year) || !Number.isFinite(value)) continue;
    const values = observations.get(year) ?? [];
    values.push(value);
    observations.set(year, values);
  }
  return new Map([...observations.entries()].map(([year, values]) => [year, mean(values)]));
}

function pct(value: number, digits = 1): string {
  return `${(100 * value).toFixed(digits)}%`;
}

function signedPp(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}pp`;
}

function formatFit(fit: ShareFit): string {
  return `MAE ${fit.maePercentagePoints.toFixed(1)}pp, R² ${fit.rSquared.toFixed(2)}, r ${fit.correlation.toFixed(2)}`;
}

function singleYearMae(
  observed: Record<AgeGroup, DfaCell>,
  modeled: Record<AgeGroup, DfaCell>,
  field: keyof DfaCell,
): number {
  const observedShares = shares(observed, field);
  const modeledShares = shares(modeled, field);
  return mean(AGE_GROUPS.map(group => Math.abs(observedShares[group] - modeledShares[group]))) * 100;
}

function printShareTable(
  title: string,
  observedCells: Record<AgeGroup, DfaCell>,
  modelCells: Record<AgeGroup, DfaCell>,
  field: keyof DfaCell,
): void {
  const observed = shares(observedCells, field);
  const modeled = shares(modelCells, field);
  console.log(`\n${title}`);
  console.log('Age group       Observed   Model    Error');
  for (const group of AGE_GROUPS) {
    console.log(
      `${group.padEnd(15)} ${pct(observed[group]).padStart(8)}  ${pct(modeled[group]).padStart(7)}  ` +
      `${signedPp(modeled[group] - observed[group]).padStart(8)}`,
    );
  }
}

function usage(): void {
  console.log(`Usage:
  npx tsx scripts/generational-backcast.ts \\
    --dfa=/path/to/dfa-age-levels.csv \\
    --world-bank-dir=/path/to/world-bank-jsons \\
    [--nta=/path/to/nta-transposed.csv] \\
    [--sloos=/path/to/DRTSCILM.csv] \\
    [--calibrate-asset-profile] \\
    [--asset-profile=20-39,40-54,55-69,70+] \\
    [--calibrate-debt-profile] \\
    [--debt-profile=20-39,40-54,55-69,70+]

Expected World Bank files:
  wb-pop.json, wb-young.json, wb-working.json, wb-old.json,
  wb-gdp.json, wb-life.json

See docs/GENERATIONAL_BACKCAST.md for exact source URLs and download commands.`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const dfaPath = typeof args.dfa === 'string' ? args.dfa : '';
  const worldBankDir = typeof args['world-bank-dir'] === 'string' ? args['world-bank-dir'] : '';
  const ntaPath = typeof args.nta === 'string' ? args.nta : '';
  const sloosPath = typeof args.sloos === 'string' ? args.sloos : '';
  if (!dfaPath || !worldBankDir || !existsSync(dfaPath)) {
    usage();
    process.exitCode = 1;
    return;
  }

  const dfa = loadDfa(dfaPath);
  const worldBank = loadWorldBankData(worldBankDir);

  // Debt resolves first because the asset replay depends on cohort borrowing
  // headroom (and therefore the debt profile), while the debt replay does not
  // read the asset side.
  const resolveProfile = (
    side: ProfileSide,
    flagBase: string,
    baseOverrides: Partial<GenerationsParams>,
  ): AgeProfile => {
    let profile = defaultProfile(side);
    if (typeof args[`${flagBase}-profile`] === 'string') {
      profile = {
        ...profile,
        ...parseProfile(side, `${flagBase}-profile`, args[`${flagBase}-profile`] as string),
      };
    }
    if (args[`calibrate-${flagBase}-profile`]) {
      const calibration = calibrateProfile(dfa, worldBank, side, { ...baseOverrides, ...profile });
      profile = calibration.profile;
      console.log(`\nDFA ${side.label.toUpperCase()}-AGE PROFILE CALIBRATION`);
      console.log(`Training years: ${calibration.trainingYears[0]}-${calibration.trainingYears.at(-1)}`);
      console.log(`Temporal check: ${calibration.validationYears[0]}-${calibration.validationYears.at(-1)}`);
      console.log(`Selected weights: ${formatProfile(side, calibration.profile)}`);
      console.log(`Training snapshot fit: ${formatFit(calibration.trainingSnapshotFit)}`);
      console.log(`Training replay fit: ${formatFit(calibration.trainingReplayFit)}`);
      console.log(`Temporal snapshot check: ${formatFit(calibration.validationSnapshotFit)}`);
      console.log(`Temporal replay check: ${formatFit(calibration.validationReplayFit)}`);
    }
    return profile;
  };
  const debtProfile = resolveProfile(PROFILE_SIDES.liabilities, 'debt', {});
  const assetProfile = resolveProfile(PROFILE_SIDES.assets, 'asset', debtProfile);
  const ageProfiles: Partial<GenerationsParams> = { ...debtProfile, ...assetProfile };
  const replay = runReplay(dfa, worldBankDir, ageProfiles, worldBank);
  const holdoutYears = [1995, 2001, 2007, 2009, 2011, 2019, 2025]
    .filter(year => dfa.has(year) && replay.some(row => row.year === year));
  const observedAssetShares: Array<Record<AgeGroup, number>> = [];
  const modeledAssetShares: Array<Record<AgeGroup, number>> = [];
  const observedDebtShares: Array<Record<AgeGroup, number>> = [];
  const modeledDebtShares: Array<Record<AgeGroup, number>> = [];

  for (const year of holdoutYears) {
    const observed = dfa.get(year)!;
    const modeled = replay.find(row => row.year === year)!;
    const grouped = groupModelAccounts(modeled.accounts);
    observedAssetShares.push(shares(observed.groups, 'assets'));
    modeledAssetShares.push(shares(grouped, 'assets'));
    observedDebtShares.push(shares(observed.groups, 'liabilities'));
    modeledDebtShares.push(shares(grouped, 'liabilities'));
  }

  const assetFit = fitShares(observedAssetShares, modeledAssetShares);
  const debtFit = fitShares(observedDebtShares, modeledDebtShares);
  const lastYear = holdoutYears[holdoutYears.length - 1];
  const observedLast = dfa.get(lastYear)!;
  const replayLast = replay.find(row => row.year === lastYear)!;
  const replayLastGrouped = groupModelAccounts(replayLast.accounts);

  console.log('\nGENERATIONAL BACKCAST — conditional U.S. balance-sheet replay');
  console.log('Observed aggregate assets/debt and demographics are inputs; age allocation is the test.');
  console.log(`Holdouts: ${holdoutYears.join(', ')}`);
  console.log(`Asset age weights: ${formatProfile(PROFILE_SIDES.assets, assetProfile)}`);
  console.log(`Debt age weights: ${formatProfile(PROFILE_SIDES.liabilities, debtProfile)}`);
  console.log(`Asset-share fit: ${formatFit(assetFit)}`);
  console.log(`Debt-share fit:  ${formatFit(debtFit)}`);

  console.log('\nHoldout error by year (mean absolute percentage-point error)');
  console.log('Year  assets  liabilities');
  for (const year of holdoutYears) {
    const observed = dfa.get(year)!;
    const modeled = groupModelAccounts(replay.find(row => row.year === year)!.accounts);
    console.log(
      `${year}  ${singleYearMae(observed.groups, modeled, 'assets').toFixed(1).padStart(6)}  ` +
      `${singleYearMae(observed.groups, modeled, 'liabilities').toFixed(1).padStart(11)}`,
    );
  }
  printShareTable(`${lastYear} asset ownership shares`, observedLast.groups, replayLastGrouped, 'assets');
  printShareTable(`${lastYear} liability shares`, observedLast.groups, replayLastGrouped, 'liabilities');

  // Also show the actual forward model's 2025 cross-section. This is not a
  // historical replay, but it reveals whether conditioning on observed totals
  // materially changes the age-allocation result.
  const baseline2025 = runSimulation({
    startYear: 2025,
    endYear: 2025,
    generations: ageProfiles,
  }).results[0];
  const baselineGrouped = groupModelAccounts(baseline2025.regionalCohortAccounts.oecd);
  if (dfa.has(2025)) {
    printShareTable('2025 current global-model/OECD asset shares', dfa.get(2025)!.groups, baselineGrouped, 'assets');
    printShareTable('2025 current global-model/OECD liability shares', dfa.get(2025)!.groups, baselineGrouped, 'liabilities');
    console.log(
      `2025 current global-model/OECD liability-share MAE: ` +
      `${singleYearMae(dfa.get(2025)!.groups, baselineGrouped, 'liabilities').toFixed(1)}pp`,
    );
  }

  const byConstraint = [...replay].sort(
    (a, b) => b.constrainedWorkingShare - a.constrainedWorkingShare,
  );
  console.log('\nHighest modeled funding-constraint years');
  console.log('Year  constrained  borrowing-limit  aggregate coverage  gap/GDP');
  for (const row of byConstraint.slice(0, 8)) {
    console.log(
      `${row.year}  ${pct(row.constrainedWorkingShare).padStart(11)}  ` +
      `${pct(row.borrowingConstrainedWorkingShare).padStart(15)}  ` +
      `${pct(row.aggregateCapitalCoverage).padStart(18)}  ` +
      `${pct(row.gdp > 0 ? row.cohortFundingGap / row.gdp : 0).padStart(7)}`,
    );
  }

  const sensitivityCases: Array<{ label: string; overrides: Partial<GenerationsParams> }> = [
    { label: 'growth 1%, limit 4x', overrides: { desiredNetCapitalGrowth: 0.01 } },
    { label: 'growth 2%, limit 4x', overrides: {} },
    { label: 'growth 3%, limit 4x', overrides: { desiredNetCapitalGrowth: 0.03 } },
    { label: 'growth 2%, limit 1x', overrides: { borrowingLimitIncomeMultiple: 1 } },
    { label: 'growth 2%, limit 2x', overrides: { borrowingLimitIncomeMultiple: 2 } },
    { label: 'growth 2%, limit 8x', overrides: { borrowingLimitIncomeMultiple: 8 } },
  ];
  console.log('\nConstraint sensitivity, 1990-2025 average and peak');
  console.log('Assumption             avg constrained  avg limit-bound  peak (year)');
  for (const scenario of sensitivityCases) {
    const rows = runReplay(dfa, worldBankDir, {
      ...ageProfiles,
      ...scenario.overrides,
    }, worldBank);
    const peak = rows.reduce((best, row) =>
      row.constrainedWorkingShare > best.constrainedWorkingShare ? row : best,
    );
    console.log(
      `${scenario.label.padEnd(23)} ${pct(mean(rows.map(row => row.constrainedWorkingShare))).padStart(14)}  ` +
      `${pct(mean(rows.map(row => row.borrowingConstrainedWorkingShare))).padStart(15)}  ` +
      `${pct(peak.constrainedWorkingShare).padStart(5)} (${peak.year})`,
    );
  }

  if (sloosPath && existsSync(sloosPath)) {
    const tightening = loadSloos(sloosPath);
    const matched = replay.filter(row => tightening.has(row.year));
    const observed = matched.map(row => tightening.get(row.year)!);
    const cohortStress = matched.map(row => row.constrainedWorkingShare);
    const aggregateStress = matched.map(row => 1 - row.aggregateCapitalCoverage);
    const topObserved = [...matched]
      .sort((a, b) => tightening.get(b.year)! - tightening.get(a.year)!)
      .slice(0, 6)
      .map(row => row.year);
    const topModeled = [...matched]
      .sort((a, b) => b.constrainedWorkingShare - a.constrainedWorkingShare)
      .slice(0, 6)
      .map(row => row.year);
    console.log('\nCredit-supply timing check: Fed SLOOS C&I tightening');
    console.log(`Correlation with constrained-worker share: ${correlation(observed, cohortStress).toFixed(2)}`);
    console.log(`Correlation with aggregate funding shortfall: ${correlation(observed, aggregateStress).toFixed(2)}`);
    console.log(`Highest observed tightening years: ${topObserved.join(', ')}`);
    console.log(`Highest modeled constraint years: ${topModeled.join(', ')}`);
    console.log('(SLOOS is a macro bank-credit benchmark, not an age-specific constraint measure.)');
  }

  if (ntaPath && existsSync(ntaPath)) {
    const ntaYear = replay.find(row => row.year === 2011) ?? replayLast;
    const profileFits = validateNta(ntaPath, ntaYear.accounts);
    console.log('\nNTA 2011 U.S. age-profile comparison (shape only)');
    console.log('Variable            Peak observed/model   TV distance   correlation');
    for (const fit of profileFits) {
      console.log(
        `${fit.variable.padEnd(19)} ${String(fit.observedPeakAge).padStart(3)}/` +
        `${String(fit.modelPeakAge).padEnd(3)}             ` +
        `${fit.totalVariation.toFixed(2).padStart(5)}          ${fit.correlation.toFixed(2).padStart(5)}`,
      );
    }
  }

  console.log('\nInterpretation guardrails');
  console.log('- Aggregate balance-sheet levels are imposed, so they are not validation results.');
  console.log('- DFA households are grouped by reference-person age; model accounts are person cohorts.');
  console.log('- Household assets include valuations and claims; model assets mean productive capital.');
  console.log('- The constraint series is a model diagnostic; peaks can be compared with history, not its level.');
}

main();

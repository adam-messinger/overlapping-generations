/**
 * Human-capital ledger tests.
 *
 * The ledger is straight-line at current replacement cost over the expected
 * time in the workforce, so its closure identity is exact whenever unit cost
 * and useful life are constant:
 *   netStock_t = netStock_{t-1} + investment - depreciation - writeOffs
 * and, in a steady state (constant entrants, cost, life), depreciation plus
 * write-offs equals investment.
 */

import { EDUCATION_BANDS, EducationBand, REGIONS, Region } from '../domain-types.js';
import { test, expect, printSummary, regional } from '../test-utils.js';
import {
  humanCapitalModule,
  humanCapitalDefaults,
  unitReplacementCost,
  expectedWorkingYears,
  exitHazards,
  type HumanCapitalOverrides,
} from './human-capital.js';

/** Inputs for a one-band world: every entrant is a secondary completer. */
function makeInputs(overrides: Record<string, any> = {}) {
  return {
    regionalWorkforceEntrants: regional(1e6),
    regionalEntrantCollegeShare: regional(0),
    regionalWorkingCollege: regional(0),
    regionalWorkingNonCollege: regional(45e6),
    regionalLifeExpectancy: regional(75),
    regionalGdpPerCapita: regional(20_000),
    regionalGdp: regional(2),
    regionalWorkingMigrationCollege: regional(0),
    regionalWorkingMigrationNonCollege: regional(0),
    regionalRetirementAgeExtension: regional(0),
    gdp: 16,
    stock: 50,
    ...overrides,
  };
}

const ALL_SECONDARY: HumanCapitalOverrides['regions'] = Object.fromEntries(REGIONS.map(region => [region, {
  secondaryCompletionShare: 1, secondaryCompletionTarget: 1, advancedShare: 0, domesticExitShare: 0,
}]));

/** One band, no exit hazards: useful life = retirement age - entry age exactly. */
const NO_HAZARDS: HumanCapitalOverrides = {
  regions: ALL_SECONDARY,
  hazards: { mortalityBase: 0, disabilityBase: 0 },
};

function runYears(
  years: number,
  paramOverrides: HumanCapitalOverrides = {},
  inputsFor: (yearIndex: number) => Record<string, any> = () => ({}),
) {
  const params = humanCapitalModule.mergeParams(paramOverrides);
  let state = humanCapitalModule.init(params);
  const outputs: any[] = [];
  for (let i = 0; i < years; i++) {
    const result = humanCapitalModule.step(state, makeInputs(inputsFor(i)) as any, params, 2025 + i, i);
    state = result.state;
    outputs.push(result.outputs);
  }
  return outputs;
}

console.log('\n=== Human Capital Module Tests ===\n');

// --- Replacement cost ---------------------------------------------------------

test('replacement cost rises with each education band (prefix-sum schooling + longer rearing)', () => {
  const outlaysOnly = humanCapitalModule.mergeParams({ foregoneEarningsShare: 0 });
  const costs = EDUCATION_BANDS.map(band => unitReplacementCost(outlaysOnly, band, 50_000));
  for (let i = 1; i < costs.length; i++) expect(costs[i]).toBeGreaterThan(costs[i - 1]);
  // primary: 16 yr x 0.30 rearing + 6 yr x 0.20 schooling = 6.0 x GDP/capita
  expect(costs[0]).toBeCloseTo(50_000 * (0.30 * 16 + 6 * 0.20), 6);
  // advanced: 26 yr rearing + all four stages
  expect(costs[3]).toBeCloseTo(
    50_000 * (0.30 * 26 + 6 * 0.20 + 6 * 0.25 + 4 * 0.40 + 3 * 0.50), 6,
  );
});

test('foregone earnings price only the school years at or above the working age', () => {
  const p = humanCapitalDefaults;
  const outlaysOnly = humanCapitalModule.mergeParams({ foregoneEarningsShare: 0 });
  const extra = (band: EducationBand) =>
    (unitReplacementCost(p, band, 50_000) - unitReplacementCost(outlaysOnly, band, 50_000)) / 50_000;
  // Schooling runs 6-12 (primary), 12-18 (secondary), 18-22 (tertiary),
  // 22-25 (advanced); the opportunity cost starts at 16.
  expect(extra('primary')).toBeCloseTo(0, 9);
  expect(extra('secondary')).toBeCloseTo(0.45 * 2, 9);
  expect(extra('tertiary')).toBeCloseTo(0.45 * 6, 9);
  expect(extra('advanced')).toBeCloseTo(0.45 * 9, 9);
  // A later working age removes the secondary-stage cost entirely
  const later = humanCapitalModule.mergeParams({ foregoneEarningsFromAge: 18 });
  expect((unitReplacementCost(later, 'secondary', 50_000) - unitReplacementCost(outlaysOnly, 'secondary', 50_000)))
    .toBeCloseTo(0, 6);
});

test('replacement cost scales linearly with GDP per capita', () => {
  const low = unitReplacementCost(humanCapitalDefaults, 'tertiary', 10_000);
  const high = unitReplacementCost(humanCapitalDefaults, 'tertiary', 20_000);
  expect(high / low).toBeCloseTo(2, 9);
});

// --- Useful life: expected time in the workforce ----------------------------

test('useful life is the survival-weighted time to exit for any cause, not retirement minus entry', () => {
  const p = humanCapitalDefaults;
  for (const band of EDUCATION_BANDS) {
    const span = p.bands[band].retirementAge - p.bands[band].entryAge;
    const life = expectedWorkingYears(p, 'oecd', band, 81, p.bands[band].retirementAge);
    expect(life).toBeLessThan(span);
    expect(life).toBeGreaterThan(0.5 * span);
  }
});

test('OECD useful lives by band track Eurostat duration of working life (~31 / 36 / 40 years)', () => {
  const p = humanCapitalDefaults;
  const life = (band: EducationBand) => expectedWorkingYears(p, 'oecd', band, 81, p.bands[band].retirementAge);
  expect(life('primary')).toBeBetween(29, 34);
  expect(life('secondary')).toBeBetween(34, 39);
  expect(life('tertiary')).toBeBetween(37, 42);
  expect(life('advanced')).toBeBetween(36, 41);
  expect(life('secondary')).toBeGreaterThan(life('primary'));
  expect(life('tertiary')).toBeGreaterThan(life('secondary'));
});

test('every exit cause shortens useful life: death, disability, domestic role, retirement', () => {
  const merge = (o: HumanCapitalOverrides) => humanCapitalModule.mergeParams(o);
  const base = expectedWorkingYears(merge(NO_HAZARDS), 'india', 'secondary', 71, 63);
  expect(base).toBeCloseTo(63 - 18, 9);
  const withDeath = expectedWorkingYears(merge({ ...NO_HAZARDS, hazards: { disabilityBase: 0 } }), 'india', 'secondary', 71, 63);
  const withDisability = expectedWorkingYears(merge({ ...NO_HAZARDS, hazards: { mortalityBase: 0 } }), 'india', 'secondary', 71, 63);
  const withDomestic = expectedWorkingYears(merge({
    ...NO_HAZARDS,
    regions: { india: { domesticExitShare: 0.29 } },
  }), 'india', 'secondary', 71, 63);
  const earlierRetirement = expectedWorkingYears(merge(NO_HAZARDS), 'india', 'secondary', 71, 58);
  for (const shorter of [withDeath, withDisability, withDomestic, earlierRetirement]) {
    expect(shorter).toBeLessThan(base);
  }
  // Domestic exits remove a fixed share of entrants within the window
  expect(withDomestic / base).toBeBetween(0.7, 0.8);
});

test('exit hazards carry the documented gradients: age, life expectancy, education, region', () => {
  const p = humanCapitalDefaults;
  const at = (region: Region, band: EducationBand, le: number, t: number) => exitHazards(p, region, band, le, t);
  // Age: hazards rise with years since entry
  expect(at('oecd', 'secondary', 81, 30).death).toBeGreaterThan(at('oecd', 'secondary', 81, 5).death);
  expect(at('oecd', 'secondary', 81, 30).disability).toBeGreaterThan(at('oecd', 'secondary', 81, 5).disability);
  // Life expectancy: a low-LE region has higher mortality at the same age
  expect(at('ssa', 'secondary', 62, 10).death).toBeGreaterThan(at('oecd', 'secondary', 81, 10).death);
  // Education: lower bands exit more for every cause
  expect(at('oecd', 'primary', 81, 10).disability).toBeGreaterThan(at('oecd', 'tertiary', 81, 10).disability);
  expect(at('oecd', 'primary', 81, 5).domestic).toBeGreaterThan(at('oecd', 'tertiary', 81, 5).domestic);
  // Region: the domestic-role exit is largest where the participation gap is widest
  expect(at('mena', 'secondary', 74, 5).domestic).toBeGreaterThan(at('oecd', 'secondary', 81, 5).domestic);
  // Domestic exits stop after the window
  expect(at('mena', 'secondary', 74, p.hazards.domesticExitWindow).domestic).toBe(0);
});

test('a lower life expectancy shortens useful life through mortality, holding retirement fixed', () => {
  const p = humanCapitalDefaults;
  const high = expectedWorkingYears(p, 'oecd', 'secondary', 81, 63);
  const low = expectedWorkingYears(p, 'oecd', 'secondary', 62, 63);
  expect(low).toBeLessThan(high);
});

// --- Entrant allocation -------------------------------------------------------

test('band entrants reconcile to demographic entrants and college share', () => {
  const [out] = runYears(1, {}, () => ({ regionalEntrantCollegeShare: regional(0.4) }));
  const total = EDUCATION_BANDS.reduce((sum, band) => sum + out.humanCapitalByBand[band].entrants, 0);
  expect(total).toBeCloseTo(8e6, 0);
  expect(out.workforceEntrants).toBeCloseTo(8e6, 0);
  const college = out.humanCapitalByBand.tertiary.entrants + out.humanCapitalByBand.advanced.entrants;
  expect(college / total).toBeCloseTo(0.4, 9);
});

test('secondary completion converges toward its regional target', () => {
  const outputs = runYears(60, { secondaryCompletionConvergence: 0.05 });
  const primaryShare = (out: any) => out.humanCapitalByBand.primary.entrants / out.workforceEntrants;
  expect(primaryShare(outputs[59])).toBeLessThan(primaryShare(outputs[0]));
});

// --- Straight-line depreciation and closure ----------------------------------

test('steady state without hazards: depreciation equals investment from the seeded 2025 ledger', () => {
  // Working stock = entrants x initialWorkingSpan seeds a steady entrant flow
  // equal to the current one, so the ledger starts in its steady state.
  const [out] = runYears(1, NO_HAZARDS);
  expect(out.humanCapitalDepreciation).toBeCloseTo(out.humanCapitalInvestment, 6);
  expect(out.humanCapitalWriteOffs).toBe(0);
  expect(out.humanCapitalNetInvestment).toBeCloseTo(0, 6);
});

test('steady state with hazards: depreciation plus write-offs equals investment', () => {
  const outputs = runYears(60, { regions: ALL_SECONDARY });
  const out = outputs[59];
  expect(out.humanCapitalWriteOffs).toBeGreaterThan(0);
  expect(out.humanCapitalDepreciation + out.humanCapitalWriteOffs)
    .toBeCloseTo(out.humanCapitalInvestment, 9);
  expect(out.humanCapitalNetInvestment).toBeCloseTo(0, 9);
  // Entrants equal exits once the seeded ledger has fully turned over
  expect(out.workforceExits).toBeCloseTo(out.workforceEntrants, 3);
});

test('steady state without hazards: net stock is half the gross stock, in service = entrants x (life - 1)', () => {
  const outputs = runYears(50, NO_HAZARDS);
  const out = outputs[49];
  expect(out.humanCapitalNetStock / out.humanCapitalGrossStock).toBeCloseTo(0.5, 6);
  const life = humanCapitalDefaults.bands.secondary.retirementAge - humanCapitalDefaults.bands.secondary.entryAge;
  expect(out.humanCapitalByBand.secondary.usefulLife).toBeCloseTo(life, 9);
  expect(out.humanCapitalByBand.secondary.workersInService).toBeCloseTo(8e6 * (life - 1), 0);
});

test('closure: net stock change equals investment - depreciation - write-offs at constant cost', () => {
  // Entrants double after year 10 so the ledger is out of steady state; the
  // identity must still hold exactly with the default hazards on.
  const outputs = runYears(40, {}, i => ({
    regionalWorkforceEntrants: regional(i >= 10 ? 2e6 : 1e6),
    regionalEntrantCollegeShare: regional(0.35),
  }));
  for (let i = 1; i < outputs.length; i++) {
    const delta = outputs[i].humanCapitalNetStock - outputs[i - 1].humanCapitalNetStock;
    expect(delta).toBeCloseTo(outputs[i].humanCapitalNetInvestment, 6);
    expect(outputs[i].humanCapitalWriteOffs).toBeGreaterThan(0);
  }
});

test('closure with revaluation: rising replacement cost revalues the opening stock', () => {
  const outputs = runYears(5, NO_HAZARDS, i => ({ regionalGdpPerCapita: regional(20_000 * Math.pow(1.03, i)) }));
  for (let i = 1; i < outputs.length; i++) {
    const revalued = outputs[i - 1].humanCapitalNetStock * 1.03;
    const delta = outputs[i].humanCapitalNetStock - revalued;
    expect(delta).toBeCloseTo(outputs[i].humanCapitalNetInvestment, 6);
  }
});

test('a demographic bust turns net investment negative; a boom turns it positive', () => {
  const bust = runYears(3, NO_HAZARDS, () => ({ regionalWorkforceEntrants: regional(0.5e6) }))[2];
  const boom = runYears(3, NO_HAZARDS, () => ({ regionalWorkforceEntrants: regional(2e6) }))[2];
  expect(bust.humanCapitalNetInvestment).toBeLessThan(0);
  expect(boom.humanCapitalNetInvestment).toBeGreaterThan(0);
});

test('a one-off entrant wave depreciates over its useful life and retires at the retirement age', () => {
  const life = 10;
  const outputs = runYears(life + 2, {
    ...NO_HAZARDS,
    bands: {
      secondary: { entryAge: 30, retirementAge: 30 + life },
      tertiary: { entryAge: 30 },
      advanced: { entryAge: 30 },
    },
  }, i => ({
    regionalWorkforceEntrants: regional(i === 0 ? 1e6 : 0),
    regionalWorkingNonCollege: regional(0),
  }));
  const perYear = outputs[0].humanCapitalInvestment / life;
  for (let i = 0; i < life; i++) expect(outputs[i].humanCapitalDepreciation).toBeCloseTo(perYear, 9);
  expect(outputs[life].humanCapitalDepreciation).toBeCloseTo(0, 9);
  expect(outputs[life - 1].humanCapitalByBand.secondary.retirements).toBeCloseTo(8e6, 0);
  expect(outputs[life - 1].humanCapitalByBand.secondary.workersInService).toBeCloseTo(0, 6);
  expect(outputs[life].humanCapitalGrossStock).toBeCloseTo(0, 9);
});

test('workers who outlive their expected working life stay in service at zero book value until retirement', () => {
  // Hazards on: useful life < retirement span, so the oldest vintages are
  // fully depreciated but still counted in service and in the gross stock.
  const outputs = runYears(50, { regions: ALL_SECONDARY });
  const out = outputs[49];
  const band = out.humanCapitalByBand.secondary;
  const span = humanCapitalDefaults.bands.secondary.retirementAge - humanCapitalDefaults.bands.secondary.entryAge;
  expect(band.usefulLife).toBeLessThan(span);
  expect(band.retirements).toBeGreaterThan(0);
  expect(band.netStock / band.grossStock).toBeLessThan(0.5);
  // In service = entrants x sum of workforce survival over every year up to
  // the retirement age, not just up to the (shorter) useful life.
  const params = humanCapitalModule.mergeParams({ regions: ALL_SECONDARY });
  let survival = 1;
  let untilRetirement = 0;
  let untilUsefulLife = 0;
  for (let t = 0; t < span - 1; t++) {
    survival *= 1 - exitHazards(params, 'oecd', 'secondary', 75, t).total;
    untilRetirement += survival;
    if (t + 1 < band.usefulLife) untilUsefulLife += survival;
  }
  expect(band.workersInService).toBeCloseTo(8e6 * untilRetirement, -3);
  expect(band.workersInService).toBeGreaterThan(8e6 * untilUsefulLife);
});

test('exits are attributed by cause and sum to the global exit flow', () => {
  const outputs = runYears(45, {}, () => ({ regionalEntrantCollegeShare: regional(0.35) }));
  const out = outputs[44];
  let total = 0;
  for (const band of EDUCATION_BANDS) {
    const b = out.humanCapitalByBand[band];
    for (const cause of ['deaths', 'disabilityExits', 'domesticExits', 'retirements'] as const) {
      expect(b[cause]).toBeGreaterThan(0);
      total += b[cause];
    }
  }
  expect(total).toBeCloseTo(out.workforceExits, 3);
  // Lower bands exit more for disability; domestic exits are concentrated below tertiary
  const perEntrant = (band: any, cause: any) => out.humanCapitalByBand[band][cause] / out.humanCapitalByBand[band].entrants;
  expect(perEntrant('primary', 'disabilityExits')).toBeGreaterThan(perEntrant('tertiary', 'disabilityExits'));
  expect(perEntrant('primary', 'domesticExits')).toBeGreaterThan(perEntrant('advanced', 'domesticExits'));
});

// --- Migration transfers ---------------------------------------------------------

/** `people` working-age movers a year from one region to another, all secondary band. */
function migrationInputs(from: Region = 'india', to: Region = 'oecd', people = 0.2e6, extra: Record<string, any> = {}) {
  return {
    regionalWorkingMigrationNonCollege: { ...regional(0), [from]: -people, [to]: people },
    regionalGdpPerCapita: { ...regional(20_000), oecd: 60_000, india: 5_000 },
    ...extra,
  };
}

test('migration moves headcount between regional ledgers and conserves the world total', () => {
  const still = runYears(20, NO_HAZARDS)[19];
  const moved = runYears(20, NO_HAZARDS, () => migrationInputs())[19];
  // Movers leave with a headcount-weighted tenure profile and land with the
  // plain profile, so a few sit closer to retirement: conserved to ~1e-5.
  const world = (out: any) => out.humanCapitalByBand.secondary.workersInService;
  expect(Math.abs(world(moved) / world(still) - 1)).toBeLessThan(1e-4);
  expect(moved.regionalHumanCapital.oecd.migrationNetPeople).toBeCloseTo(0.2e6, 0);
  expect(moved.regionalHumanCapital.india.migrationNetPeople).toBeCloseTo(-0.2e6, 0);
  // Destination stock grows, origin stock shrinks, relative to the no-migration run
  expect(moved.regionalHumanCapital.oecd.netStock).toBeGreaterThan(still.regionalHumanCapital.oecd.netStock);
  expect(moved.regionalHumanCapital.india.netStock).toBeLessThan(still.regionalHumanCapital.india.netStock);
});

test('migrants are revalued at destination cost: inflows exceed outflows when movers go to a richer region', () => {
  const [out] = runYears(1, NO_HAZARDS, () => migrationInputs());
  expect(out.regionalHumanCapital.oecd.migrationTransfer).toBeGreaterThan(0);
  expect(out.regionalHumanCapital.india.migrationTransfer).toBeLessThan(0);
  expect(out.humanCapitalMigrationInflows).toBeCloseTo(out.regionalHumanCapital.oecd.migrationTransfer, 9);
  expect(out.humanCapitalMigrationOutflows).toBeCloseTo(-out.regionalHumanCapital.india.migrationTransfer, 9);
  // Same people, same tenure profile, 12x the unit cost at destination
  expect(out.humanCapitalMigrationInflows / out.humanCapitalMigrationOutflows).toBeCloseTo(12, 6);
  expect(out.humanCapitalMigrationRevaluation).toBeCloseTo(
    out.humanCapitalMigrationInflows - out.humanCapitalMigrationOutflows, 9);
  // Reverse the direction: equal and opposite valuation
  const [back] = runYears(1, NO_HAZARDS, () => migrationInputs('oecd', 'india'));
  expect(back.humanCapitalMigrationRevaluation).toBeLessThan(0);
});

test('closure with migration: net stock change = investment + transfer - depreciation - write-offs per region', () => {
  const outputs = runYears(15, {}, () => migrationInputs('india', 'oecd', 0.2e6, { regionalEntrantCollegeShare: regional(0.3) }));
  for (let i = 1; i < outputs.length; i++) {
    for (const region of ['oecd', 'india', 'china'] as Region[]) {
      const a = outputs[i - 1].regionalHumanCapital[region];
      const b = outputs[i].regionalHumanCapital[region];
      const delta = b.netStock - a.netStock;
      expect(delta).toBeCloseTo(b.investment + b.migrationTransfer - b.depreciation - b.writeOffs, 6);
    }
    expect(outputs[i].regionalHumanCapital.china.migrationTransfer).toBe(0);
  }
});

test('migrants skew early-career: a shorter tenure scale transfers more book value per mover', () => {
  const young = runYears(1, { ...NO_HAZARDS, migrantTenureScale: 3 }, () => migrationInputs())[0];
  const old = runYears(1, { ...NO_HAZARDS, migrantTenureScale: 40 }, () => migrationInputs())[0];
  expect(young.humanCapitalMigrationOutflows).toBeGreaterThan(old.humanCapitalMigrationOutflows);
});

test('emigration cannot remove more than a ledger holds', () => {
  const [out] = runYears(1, NO_HAZARDS, () => migrationInputs('india', 'oecd', 1e6, {
    regionalWorkingNonCollege: regional(0),
    regionalWorkforceEntrants: regional(0),
  }));
  expect(out.regionalHumanCapital.india.grossStock).toBeCloseTo(0, 9);
  expect(out.humanCapitalMigrationOutflows).toBeCloseTo(0, 9);
  expect(Number.isFinite(out.humanCapitalNetStock)).toBeTrue();
});

// --- Retirement age and life expectancy --------------------------------------

test("retirement age extends by capital's life-expectancy extension", () => {
  const outputs = runYears(2, NO_HAZARDS, i => ({ regionalRetirementAgeExtension: regional(i === 0 ? 0 : 0.67 * 3) }));
  const span = humanCapitalDefaults.bands.secondary.retirementAge - humanCapitalDefaults.bands.secondary.entryAge;
  expect(outputs[0].humanCapitalByBand.secondary.usefulLife).toBeCloseTo(span, 9);
  expect(outputs[1].humanCapitalByBand.secondary.usefulLife).toBeCloseTo(span + 0.67 * 3, 6);
  // Longer life -> smaller annual slice on the same stock
  expect(outputs[1].humanCapitalDepreciation).toBeLessThan(outputs[0].humanCapitalDepreciation);
});

test('higher bands carry longer useful lives and higher unit costs in the mixed default world', () => {
  const [out] = runYears(1, {}, () => ({ regionalEntrantCollegeShare: regional(0.4) }));
  for (let i = 1; i < EDUCATION_BANDS.length; i++) {
    const lower = out.humanCapitalByBand[EDUCATION_BANDS[i - 1]];
    const upper = out.humanCapitalByBand[EDUCATION_BANDS[i]];
    expect(upper.unitCost).toBeGreaterThan(lower.unitCost);
  }
  expect(out.humanCapitalByBand.secondary.usefulLife).toBeGreaterThan(out.humanCapitalByBand.primary.usefulLife);
  expect(out.humanCapitalByBand.tertiary.usefulLife).toBeGreaterThan(out.humanCapitalByBand.secondary.usefulLife);
});

// --- Aggregates ----------------------------------------------------------------

test('regional and band ledgers both sum to the global ledger', () => {
  const [out] = runYears(1, {}, () => ({ regionalEntrantCollegeShare: regional(0.3) }));
  const sumRegions = (field: string) =>
    REGIONS.reduce((sum, region) => sum + out.regionalHumanCapital[region][field], 0);
  const sumBands = (field: string) =>
    EDUCATION_BANDS.reduce((sum, band) => sum + out.humanCapitalByBand[band][field], 0);
  for (const field of ['investment', 'depreciation', 'writeOffs', 'grossStock', 'netStock']) {
    expect(sumRegions(field)).toBeCloseTo(sumBands(field), 9);
  }
  expect(sumBands('investment')).toBeCloseTo(out.humanCapitalInvestment, 9);
  expect(sumBands('depreciation')).toBeCloseTo(out.humanCapitalDepreciation, 9);
  expect(sumBands('netStock')).toBeCloseTo(out.humanCapitalNetStock, 9);
  expect(out.humanCapitalInvestmentGdpShare).toBeCloseTo(out.humanCapitalInvestment / 16, 9);
  expect(out.humanCapitalNetStockToPhysical).toBeCloseTo(out.humanCapitalNetStock / 50, 9);
  expect(out.regionalHumanCapital.oecd.investmentGdpShare)
    .toBeCloseTo(out.regionalHumanCapital.oecd.investment / 2, 9);
});

test('75-year run produces finite, non-negative ledger values', () => {
  const outputs = runYears(76, {}, i => ({
    regionalGdpPerCapita: regional(20_000 * Math.pow(1.02, i)),
    regionalEntrantCollegeShare: regional(Math.min(0.9, 0.3 + 0.005 * i)),
    regionalLifeExpectancy: regional(75 + 0.1 * i),
  }));
  for (const out of outputs) {
    for (const value of [
      out.humanCapitalInvestment, out.humanCapitalDepreciation, out.humanCapitalWriteOffs,
      out.humanCapitalGrossStock, out.humanCapitalNetStock, out.humanCapitalNetStockToPhysical,
      out.workforceExits,
    ]) {
      expect(Number.isFinite(value)).toBeTrue();
      expect(value >= 0).toBeTrue();
    }
    expect(out.humanCapitalNetStock <= out.humanCapitalGrossStock).toBeTrue();
  }
});

// --- Params ----------------------------------------------------------------------

test('mergeParams deep-merges band, region, and hazard overrides', () => {
  const params = humanCapitalModule.mergeParams({
    bands: { tertiary: { retirementAge: 70 } },
    regions: { ssa: { advancedShare: 0.2 } },
    hazards: { disabilityBase: 0.001 },
  });
  expect(params.bands.tertiary.retirementAge).toBe(70);
  expect(params.bands.tertiary.entryAge).toBe(humanCapitalDefaults.bands.tertiary.entryAge);
  expect(params.bands.primary.retirementAge).toBe(humanCapitalDefaults.bands.primary.retirementAge);
  expect(params.regions.ssa.advancedShare).toBe(0.2);
  expect(params.regions.ssa.domesticExitShare).toBe(humanCapitalDefaults.regions.ssa.domesticExitShare);
  expect(params.regions.oecd.advancedShare).toBe(humanCapitalDefaults.regions.oecd.advancedShare);
  expect(params.hazards.disabilityBase).toBe(0.001);
  expect(params.hazards.mortalityBase).toBe(humanCapitalDefaults.hazards.mortalityBase);
});

test('validation rejects out-of-range values', () => {
  expect(humanCapitalModule.validate({ rearingCostShare: 1.5 }).valid).toBeFalse();
  expect(humanCapitalModule.validate({ hazards: { mortalityBase: -0.1 } }).valid).toBeFalse();
  expect(humanCapitalModule.validate({ bands: { primary: { retirementAge: 12 } } }).valid).toBeFalse();
  expect(humanCapitalModule.validate({ regions: { india: { domesticExitShare: 1.2 } } }).valid).toBeFalse();
  expect(humanCapitalModule.validate({ migrantTenureScale: 0 }).valid).toBeFalse();
  expect(humanCapitalModule.validate({ foregoneEarningsShare: 2 }).valid).toBeFalse();
  expect(humanCapitalModule.validate({}).valid).toBeTrue();
  expect(() => humanCapitalModule.mergeParams({ rearingCostShare: -1 })).toThrow();
});

printSummary();

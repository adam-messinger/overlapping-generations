/**
 * Human-Capital Ledger (education-banded, cost-based)
 *
 * A diagnostic accounting layer that capitalizes the pre-workforce investment
 * embodied in each year's labor-market entrants and depreciates it straight-
 * line over the entrant's EXPECTED TIME IN THE WORKFORCE, valued at CURRENT
 * REPLACEMENT COST. It follows the Kendrick (1976) / Eisner (1985) cost-based
 * human-capital accounting: the asset value of a worker is what it would cost
 * today to rear and school a replacement, not the discounted lifetime
 * earnings of the Jorgenson-Fraumeni income approach. Straight-line follows
 * Eisner; Kendrick's accelerated schedule over-depreciates (Graham & Webb
 * 1979; Mallatt, BEA 2026). See docs/HUMAN_CAPITAL.md "Prior art".
 *
 * Bands: four education levels (primary, secondary, tertiary, advanced).
 * Each band has
 * - a higher entry age (more years of room, board, and care),
 * - more schooling stages (each stage priced per student-year), and
 * - its own expected working life (useful life for depreciation).
 *
 * Useful life is NOT retirement age minus entry age. It is the expected years
 * a new entrant will actually spend in the workforce before exiting for ANY
 * cause, from a survival model with four exit hazards:
 *   death        Gompertz-style, rising with age, scaled by regional life
 *                expectancy and an education gradient
 *   disability   rising with age, steeper for lower education (physical jobs)
 *   domestic     transition to unpaid domestic/caregiving or other
 *                non-participation, concentrated in the first years after
 *                entry, regional (female participation gap) with an
 *                education gradient
 *   retirement   everyone still active exits at the band's effective
 *                retirement age, which extends with life expectancy by the
 *                capital module's regionalRetirementAgeExtension
 *   L = sum over t of S(t), S = survival in the workforce since entry.
 *
 * Ledger (per region, per band, per entry-year vintage):
 *   investment_t     = entrants_t x unitCost_t
 *   write-offs_t     = pre-retirement exits x remaining book value
 *   depreciation_t   = sum over survivors of min(unitCost_t / L_t, book value)
 *   net stock (end)  = sum over vintages of n_v x unitCost_t x max(0, 1 - age/L_t)
 *   gross stock      = sum over in-service vintages of n_v x unitCost_t
 * A vintage that outlives L is fully depreciated but stays in service (at
 * zero book value) until it retires — exactly like a fully depreciated
 * machine still on the floor. Retirement is fractional across the two
 * ledger years that straddle the (non-integer) retirement age, so a slowly
 * rising retirement age does not make whole cohorts retire in lumps.
 *
 * Migration: demographics' net working-age migration (by education) moves
 * headcount between regional ledgers. Emigrants are drawn from the origin's
 * vintages with a tenure profile that skews young (migrants are mostly
 * early-career), immigrants are placed in the destination's vintages with
 * the same profile. Each region books the transfer at its OWN replacement
 * cost, so a worker moving from a low- to a high-cost region is revalued on
 * arrival; the world-level difference is reported separately.
 *
 * NO FEEDBACK: nothing here changes GDP, labor, capital, or demographics.
 * See docs/HUMAN_CAPITAL.md.
 */

import { defineModule, Module, ValidationResult, validatedMerge, unitPort } from 'tsimulation';
import { EDUCATION_BANDS, EducationBand, REGIONS, Region } from '../domain-types.js';
import { HUMAN_CAPITAL_BAND_PORT, HUMAN_CAPITAL_REGION_PORT } from '../port-schemas.js';
import { clamp, exponentialConvergence } from '../primitives/math.js';
import { deepMerge, DeepPartial } from '../primitives/deep-merge.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface EducationBandParams {
  /** Age at workforce entry; years of room, board, and care before entry */
  entryAge: number;
  /** Years of schooling in the stage that distinguishes this band from the one below */
  stageYears: number;
  /** Per-student annual spend on that stage, as a fraction of GDP per capita */
  stageCostShare: number;
  /** Effective retirement age (2025); extends with life expectancy */
  retirementAge: number;
  /** Education gradient on the working-age mortality hazard (secondary = 1) */
  mortalityMultiplier: number;
  /** Education gradient on the disability-exit hazard (secondary = 1) */
  disabilityMultiplier: number;
  /** Education gradient on the domestic/non-participation exit share (secondary = 1) */
  domesticExitMultiplier: number;
}

export interface RegionHumanCapitalParams {
  /** Share of NON-college entrants who completed upper secondary (2025) */
  secondaryCompletionShare: number;
  /** Long-run target for that share */
  secondaryCompletionTarget: number;
  /** Share of college entrants who go on to a postgraduate (advanced) degree */
  advancedShare: number;
  /** Share of secondary-band entrants who exit to domestic/non-participation roles */
  domesticExitShare: number;
}

export interface ExitHazardParams {
  /** Annual mortality hazard at age 40 for the secondary band, LE = 75 */
  mortalityBase: number;
  /** Exponential age slope of the mortality hazard (per year of age) */
  mortalityAgeSlope: number;
  /** Mortality scales by exp(slope x (75 - regional life expectancy)) */
  mortalityLifeExpectancySlope: number;
  /** Annual disability-exit hazard at age 40 for the secondary band */
  disabilityBase: number;
  /** Exponential age slope of the disability hazard (per year of age) */
  disabilityAgeSlope: number;
  /** Years after entry over which domestic/non-participation exits occur */
  domesticExitWindow: number;
}

export interface HumanCapitalParams {
  bands: Record<EducationBand, EducationBandParams>;
  regions: Record<Region, RegionHumanCapitalParams>;
  hazards: ExitHazardParams;
  /** Annual room, board, and care per child as a fraction of GDP per capita */
  rearingCostShare: number;
  /** Age at which the first schooling stage begins (ISCED 1 entry) */
  schoolStartAge: number;
  /** Age from which a student's time has an earnings opportunity cost */
  foregoneEarningsFromAge: number;
  /** Foregone earnings per student-year at or above that age, as a fraction of GDP per capita */
  foregoneEarningsShare: number;
  /** Annual convergence rate of secondary completion toward its regional target */
  secondaryCompletionConvergence: number;
  /** Years spanned by the working-age cohort used to seed 2025 vintages */
  initialWorkingSpan: number;
  /** Tenure profile of migrants: weight exp(-yearsSinceEntry / scale) */
  migrantTenureScale: number;
}

/** Scenario / programmatic override shape: any nested subset of the params. */
export type HumanCapitalOverrides = DeepPartial<HumanCapitalParams>;

export const humanCapitalDefaults: HumanCapitalParams = {
  // Entry ages: primary-only entrants start work in mid-teens (ILO child and
  // adolescent labour statistics; legal minimum working ages 14-16), secondary
  // completers at 18, bachelor's graduates at 22 (4-year degree after age 18),
  // postgraduates at ~26 (OECD Education at a Glance 2023, Table B: average
  // age of first-time master's graduates ~26).
  // Stage years: 6 primary + 6 secondary is the ISCED 1-3 norm (UNESCO UIS);
  // 4 tertiary years (bachelor's); 3 advanced years blends 1-2 yr master's
  // with 4-6 yr doctorates (OECD EAG 2023).
  // Stage cost shares: total (public + private) spending per student as a
  // fraction of GDP per capita — OECD EAG 2023 Table C1.1: primary ~0.21,
  // secondary ~0.25, tertiary ~0.38 of GDP/capita; UNESCO UIS 2022 global
  // government spend per primary student ~0.15-0.20 of GDP/capita. Advanced
  // 0.50 reflects research-intensive per-student costs above the tertiary
  // average (US NCES doctoral-institution spend ~1.4x bachelor's-level).
  // Retirement ages: OECD average effective labour-market exit age ~64
  // (Pensions at a Glance 2023); the college/non-college gap is ~2-3 years
  // and widening (Rutledge 2018, CRR Boston College), so 61/63/66/68.
  // Education gradients: mortality ~1.5x for no-high-school vs. college
  // (Case & Deaton 2021); disability-exit rates ~2-3x for the least educated
  // (SSA disability incidence by education; Eurostat health-limitation by
  // attainment); domestic/non-participation exits fall steeply with
  // attainment (ILO: tertiary-educated women's participation ~1.5-2x that of
  // primary-educated women in South Asia and MENA).
  // Calibration check: with the hazards below the OECD expected working lives
  // are ~32/37/39/38 years by band vs. Eurostat duration of working life by
  // attainment (lfsi_dwl_a, EU-27 2023): ISCED 0-2 ~31, 3-4 ~36, 5-8 ~40.
  bands: {
    primary:   { entryAge: 16, stageYears: 6, stageCostShare: 0.20, retirementAge: 61, mortalityMultiplier: 1.5, disabilityMultiplier: 2.2, domesticExitMultiplier: 1.8 },
    secondary: { entryAge: 18, stageYears: 6, stageCostShare: 0.25, retirementAge: 63, mortalityMultiplier: 1.1, disabilityMultiplier: 1.3, domesticExitMultiplier: 1.0 },
    tertiary:  { entryAge: 22, stageYears: 4, stageCostShare: 0.40, retirementAge: 66, mortalityMultiplier: 0.8, disabilityMultiplier: 0.7, domesticExitMultiplier: 0.55 },
    advanced:  { entryAge: 26, stageYears: 3, stageCostShare: 0.50, retirementAge: 68, mortalityMultiplier: 0.7, disabilityMultiplier: 0.5, domesticExitMultiplier: 0.40 },
  },
  // secondaryCompletionShare: share of non-college entrants with completed
  // upper secondary. Derived from UNESCO UIS 2022 upper-secondary completion
  // rates (Europe/N. America ~90%, E. Asia ~75%, LAC ~65%, S. Asia ~50%,
  // SSA ~30%) net of the college-bound flow demographics already carries
  // (all college entrants completed secondary), so the residual share is
  // below the population rate. Targets assume continued convergence toward
  // universal secondary completion (SDG 4.1); advancedShare is the
  // postgraduate share of tertiary attainment, OECD EAG 2023 Table A1.1
  // (master's + doctoral ~30% of tertiary among 25-34 year olds in OECD;
  // China MoE 2023 ~15% of new degrees postgraduate; judgment elsewhere).
  // domesticExitShare: share of secondary-band entrants who leave (or never
  // join) the workforce for domestic/caregiving or other non-participation
  // reasons, taken as half the male-female participation gap relative to
  // male participation (ILO ILOSTAT 2023 LFPR, ages 15+): OECD 80/65 ->
  // 0.09 (+0.03 for prime-age male non-participation), China 74/61 -> 0.09,
  // India 77/33 -> 0.29, LatAm 75/52 -> 0.15, SE Asia 79/58 -> 0.13, Russia+
  // CIS 70/55 -> 0.11, MENA 70/20 -> 0.36, SSA 72/60 -> 0.08.
  regions: {
    oecd:   { secondaryCompletionShare: 0.75, secondaryCompletionTarget: 0.90, advancedShare: 0.30, domesticExitShare: 0.12 },
    china:  { secondaryCompletionShare: 0.65, secondaryCompletionTarget: 0.90, advancedShare: 0.15, domesticExitShare: 0.09 },
    india:  { secondaryCompletionShare: 0.45, secondaryCompletionTarget: 0.80, advancedShare: 0.15, domesticExitShare: 0.29 },
    latam:  { secondaryCompletionShare: 0.55, secondaryCompletionTarget: 0.85, advancedShare: 0.10, domesticExitShare: 0.15 },
    seasia: { secondaryCompletionShare: 0.55, secondaryCompletionTarget: 0.85, advancedShare: 0.10, domesticExitShare: 0.13 },
    russia: { secondaryCompletionShare: 0.85, secondaryCompletionTarget: 0.92, advancedShare: 0.25, domesticExitShare: 0.11 },
    mena:   { secondaryCompletionShare: 0.55, secondaryCompletionTarget: 0.85, advancedShare: 0.12, domesticExitShare: 0.36 },
    ssa:    { secondaryCompletionShare: 0.30, secondaryCompletionTarget: 0.70, advancedShare: 0.08, domesticExitShare: 0.08 },
  },
  hazards: {
    // Mortality: ~0.2%/yr at 40 in a LE-75 population, doubling every ~9 yr
    // (Gompertz slope 0.08; HMD life tables give ~1%/yr at 60); the LE
    // slope reproduces the SSA (LE 62) / OECD (LE 81) working-age mortality
    // ratio of ~3x (WHO Global Health Estimates 2021).
    mortalityBase: 0.002,
    mortalityAgeSlope: 0.08,
    mortalityLifeExpectancySlope: 0.06,
    // Disability: US SSA disability awards ~2-3 per 1,000 insured at 40
    // rising to ~15 at 60 (SSA Annual Statistical Report 2022); slope 0.06
    // gives 0.35% at 40 -> 1.2% at 60 for the secondary band. A 20-year-old
    // has a ~25% chance of a disability spell before retirement (SSA).
    disabilityBase: 0.0035,
    disabilityAgeSlope: 0.06,
    // Domestic/caregiving exits are concentrated in the childbearing years
    // after entry (ages ~20-35), so the share is spread over 15 years.
    domesticExitWindow: 15,
  },
  // Room, board, and care per child-year as a fraction of GDP per capita.
  // USDA Expenditures on Children by Families (2017 report, 2015 data):
  // ~$13k/yr for a middle-income two-child family vs. US GDP/capita ~$57k
  // -> 0.23 (out-of-pocket only, excludes public schooling and parental
  // time). National Transfer Accounts (Lee & Mason 2011): child consumption
  // incl. public education ~0.45-0.50 of GDP/capita. 0.30 sits between the
  // out-of-pocket figure and the NTA total net of schooling, which is
  // priced separately above.
  rearingCostShare: 0.30,
  // Foregone earnings: the cost-based accounts of Kendrick (1976), Eisner
  // (1985), Abraham (2010), and Mallatt (BEA 2026) all count the earnings
  // students give up while in school beyond the age at which they could
  // work. Schooling starts at 6 (ISCED 1); the opportunity cost applies from
  // 16 (Kendrick used 14; legal full-time working ages 15-16 in most OECD
  // countries) at 0.45 of GDP per capita per student-year: US full-time
  // median earnings at ages 18-24 ~$35k vs GDP/capita ~$82k (Census CPS
  // 2023), and Mallatt values student time at CPS wages of same-age workers.
  // Set foregoneEarningsShare to 0 for the explicit-outlay (USDA + OECD
  // spending) measure alone.
  schoolStartAge: 6,
  foregoneEarningsFromAge: 16,
  foregoneEarningsShare: 0.45,
  secondaryCompletionConvergence: 0.02, // ~35-yr half-life, same order as demographics' enrollment convergence
  initialWorkingSpan: 45,               // demographics' working cohort spans ages 20-64
  // Migrants are early-career: median age of new permanent migrants to OECD
  // countries ~29-30 (OECD International Migration Outlook 2023), UN DESA
  // International Migrant Stock 2020 median age 36 for the stock. An
  // exponential tenure weight with a 10-year scale gives a mean of ~10 years
  // since entry (age ~30) among working-age movers.
  migrantTenureScale: 10,
};

/** Annual exit hazards are capped here so a vintage is never emptied in one year. */
const MAX_ANNUAL_EXIT = 0.95;
/** Cap on the cumulative domestic-exit share of a band's entrants. */
const MAX_DOMESTIC_SHARE = 0.9;

// =============================================================================
// STATE
// =============================================================================

interface HumanCapitalState {
  initialized: boolean;
  /** vintages[region][band][age] = surviving headcount that entered `age` years ago */
  vintages: Record<Region, Record<EducationBand, number[]>>;
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface HumanCapitalInputs {
  regionalWorkforceEntrants: Record<Region, number>;
  regionalEntrantCollegeShare: Record<Region, number>;
  regionalWorkingCollege: Record<Region, number>;
  regionalWorkingNonCollege: Record<Region, number>;
  regionalLifeExpectancy: Record<Region, number>;
  regionalGdpPerCapita: Record<Region, number>;
  regionalGdp: Record<Region, number>;
  /** Net working-age migration by education (people/year, + = inflow) */
  regionalWorkingMigrationCollege: Record<Region, number>;
  regionalWorkingMigrationNonCollege: Record<Region, number>;
  /** Years added to retirement ages by life-expectancy gains (capital's pension rule) */
  regionalRetirementAgeExtension: Record<Region, number>;
  gdp: number;
  /** Physical capital stock ($T), for the human/physical capital ratio */
  stock: number;
}

export interface HumanCapitalBandAccount {
  entrants: number;          // people/year
  workersInService: number;  // people still in the workforce (incl. fully depreciated)
  unitCost: number;          // $/person, entrant-weighted replacement cost
  usefulLife: number;        // years, entrant-weighted expected time in workforce
  investment: number;        // $T/year
  depreciation: number;      // $T/year
  writeOffs: number;         // $T/year, book value of pre-retirement exits
  grossStock: number;        // $T
  netStock: number;          // $T
  deaths: number;            // people/year
  disabilityExits: number;   // people/year
  domesticExits: number;     // people/year
  retirements: number;       // people/year
}

export interface HumanCapitalRegionAccount {
  entrants: number;
  investment: number;
  depreciation: number;
  writeOffs: number;
  grossStock: number;
  netStock: number;
  investmentGdpShare: number;
  /** Net working-age migrants moved into (+) or out of (-) this ledger */
  migrationNetPeople: number;        // people/year
  /** Book value of those migrants at this region's replacement cost (+ inflow) */
  migrationTransfer: number;         // $T/year
}

export interface HumanCapitalOutputs {
  humanCapitalInvestment: number;           // $T/year, capitalized at entry
  humanCapitalDepreciation: number;         // $T/year, straight-line at replacement cost
  humanCapitalWriteOffs: number;            // $T/year, pre-retirement exits (death, disability, domestic)
  humanCapitalNetInvestment: number;        // $T/year
  humanCapitalGrossStock: number;           // $T, end of year
  humanCapitalNetStock: number;             // $T, end of year
  humanCapitalInvestmentGdpShare: number;   // fraction
  humanCapitalDepreciationGdpShare: number; // fraction
  humanCapitalNetStockToPhysical: number;   // net HC stock / physical capital stock
  workforceEntrants: number;                // people/year
  workforceExits: number;                   // people/year, all causes incl. retirement
  humanCapitalMigrationInflows: number;     // $T/year, immigrants' book value at destination cost
  humanCapitalMigrationOutflows: number;    // $T/year, emigrants' book value at origin cost
  humanCapitalMigrationRevaluation: number; // $T/year, inflows - outflows (destination vs origin cost)
  humanCapitalByBand: Record<EducationBand, HumanCapitalBandAccount>;
  regionalHumanCapital: Record<Region, HumanCapitalRegionAccount>;
}

// =============================================================================
// COSTS AND BAND SPLITS
// =============================================================================

/**
 * Replacement cost of one entrant in `band`: rearing through the entry age,
 * every schooling stage up to and including the band's own stage, and the
 * earnings foregone in the school years at or above the working age, all
 * priced at today's GDP per capita.
 */
export function unitReplacementCost(
  params: HumanCapitalParams,
  band: EducationBand,
  gdpPerCapita: number
): number {
  let schooling = 0;
  let foregoneYears = 0;
  let stageStart = params.schoolStartAge;
  for (const stage of EDUCATION_BANDS) {
    const years = params.bands[stage].stageYears;
    schooling += years * params.bands[stage].stageCostShare;
    // School years spent at or above the working age carry an opportunity cost
    foregoneYears += Math.max(0, stageStart + years - Math.max(stageStart, params.foregoneEarningsFromAge));
    stageStart += years;
    if (stage === band) break;
  }
  const rearing = params.rearingCostShare * params.bands[band].entryAge;
  const foregone = params.foregoneEarningsShare * foregoneYears;
  return gdpPerCapita * (rearing + schooling + foregone);
}

/**
 * Split a region's non-college and college headcounts across the four bands:
 * the upper-secondary completion share (converging to its target) splits the
 * non-college flow, the postgraduate share splits the college flow.
 */
function bandSplit(
  params: HumanCapitalParams,
  region: Region,
  nonCollege: number,
  college: number,
  yearIndex: number
): Record<EducationBand, number> {
  const r = params.regions[region];
  const secondary = exponentialConvergence(
    r.secondaryCompletionShare,
    r.secondaryCompletionTarget,
    params.secondaryCompletionConvergence,
    yearIndex
  );
  return {
    primary: nonCollege * (1 - secondary),
    secondary: nonCollege * secondary,
    tertiary: college * (1 - r.advancedShare),
    advanced: college * r.advancedShare,
  };
}

// =============================================================================
// EXIT HAZARDS AND USEFUL LIFE
// =============================================================================

/**
 * The plain-number inputs one (region, band) cell needs for its hazard curve.
 * Read from params once per cell per step: the runner hands modules a
 * read-tracking proxy of their params, and the hazard curve is evaluated
 * for every vintage age, so reading through the proxy inside that loop was
 * the single largest cost in the whole simulation.
 */
interface HazardCell {
  entryAge: number;
  retirementAge: number;
  mortalityScale: number;     // mortalityBase x band multiplier
  mortalityAgeSlope: number;
  mortalityLifeExpectancySlope: number;
  disabilityScale: number;    // disabilityBase x band multiplier
  disabilityAgeSlope: number;
  domesticShare: number;      // cumulative share of the vintage that exits
  domesticExitWindow: number;
}

function hazardCell(params: HumanCapitalParams, region: Region, band: EducationBand): HazardCell {
  const b = params.bands[band];
  const h = params.hazards;
  return {
    entryAge: b.entryAge,
    retirementAge: b.retirementAge,
    mortalityScale: h.mortalityBase * b.mortalityMultiplier,
    mortalityAgeSlope: h.mortalityAgeSlope,
    mortalityLifeExpectancySlope: h.mortalityLifeExpectancySlope,
    disabilityScale: h.disabilityBase * b.disabilityMultiplier,
    disabilityAgeSlope: h.disabilityAgeSlope,
    domesticShare: Math.min(MAX_DOMESTIC_SHARE, params.regions[region].domesticExitShare * b.domesticExitMultiplier),
    domesticExitWindow: h.domesticExitWindow,
  };
}

/** Annual exit hazards by cause; the three causes sum to `total`. */
export interface ExitHazards {
  death: number;
  disability: number;
  domestic: number;
  total: number;
}

/**
 * Hazard rows for years 0..years-1 after entry. The causes are scaled
 * proportionally so their sum never exceeds MAX_ANNUAL_EXIT, which keeps
 * survival positive and lets exits be attributed by cause without a second
 * cap downstream.
 */
function hazardTable(cell: HazardCell, lifeExpectancy: number, years: number): ExitHazards[] {
  const lifeFactor = Math.exp(cell.mortalityLifeExpectancySlope * (75 - lifeExpectancy));
  // Domestic/non-participation exits: a cumulative share of entrants over the
  // first `domesticExitWindow` years, spread as a constant annual hazard.
  const domesticAnnual = 1 - Math.pow(1 - cell.domesticShare, 1 / cell.domesticExitWindow);
  const rows: ExitHazards[] = [];
  for (let t = 0; t < years; t++) {
    const age = cell.entryAge + t;
    let death = cell.mortalityScale * Math.exp(cell.mortalityAgeSlope * (age - 40)) * lifeFactor;
    let disability = cell.disabilityScale * Math.exp(cell.disabilityAgeSlope * (age - 40));
    let domestic = t < cell.domesticExitWindow ? domesticAnnual : 0;
    const sum = death + disability + domestic;
    if (sum > MAX_ANNUAL_EXIT) {
      const scale = MAX_ANNUAL_EXIT / sum;
      death *= scale;
      disability *= scale;
      domestic *= scale;
    }
    rows.push({ death, disability, domestic, total: death + disability + domestic });
  }
  return rows;
}

/**
 * Annual exit hazards for a worker `yearsSinceEntry` years after entering the
 * workforce in `band`, in a region with the given life expectancy.
 */
export function exitHazards(
  params: HumanCapitalParams,
  region: Region,
  band: EducationBand,
  lifeExpectancy: number,
  yearsSinceEntry: number
): ExitHazards {
  return hazardTable(hazardCell(params, region, band), lifeExpectancy, yearsSinceEntry + 1)[yearsSinceEntry];
}

/**
 * Share of a vintage that has retired by the end of the ledger year in which
 * it is `age` years past entry: a one-year ramp ending at maxYears - 1, so an
 * integer maxYears retires the whole vintage in year floor(maxYears) - 1 and
 * a fractional one splits it across the two straddling years.
 */
function retiredShare(age: number, maxYears: number): number {
  return clamp(age + 2 - maxYears, 0, 1);
}

/** Expected years in the workforce: the survival curve integrated to the retirement age. */
function expectedLife(entryAge: number, table: ExitHazards[], retirementAge: number): number {
  const span = retirementAge - entryAge;
  let survival = 1;
  let years = 0;
  for (let t = 0; t < span; t++) {
    // Partial final year when the retirement age is not an integer offset
    years += survival * Math.min(1, span - t);
    survival *= 1 - table[t].total;
  }
  return Math.max(1, years);
}

/**
 * Expected years in the workforce for a new entrant: the area under the
 * workforce-survival curve from entry to the effective retirement age.
 */
export function expectedWorkingYears(
  params: HumanCapitalParams,
  region: Region,
  band: EducationBand,
  lifeExpectancy: number,
  retirementAge: number
): number {
  const cell = hazardCell(params, region, band);
  const years = Math.max(1, Math.ceil(retirementAge - cell.entryAge));
  return expectedLife(cell.entryAge, hazardTable(cell, lifeExpectancy, years), retirementAge);
}

// =============================================================================
// ONE (REGION, BAND) CELL FOR ONE YEAR
// =============================================================================

interface CellInputs {
  cell: HazardCell;
  lifeExpectancy: number;
  retirementAge: number;
  unitCost: number;
  entrants: number;
  migrants: number;          // net working-age migrants (+ inflow)
  migrantTenureScale: number;
  /** Prior vintages, or the steady-state seed flow when the ledger is new */
  previous: number[] | { seedFlow: number; initialWorkingSpan: number };
}

interface CellResult extends HumanCapitalBandAccount {
  migrationTransfer: number;
  surviving: number[];
}

const BAND_FLOW_KEYS = [
  'entrants', 'workersInService', 'investment', 'depreciation', 'writeOffs',
  'grossStock', 'netStock', 'deaths', 'disabilityExits', 'domesticExits', 'retirements',
] as const;
const REGION_FLOW_KEYS = [
  'entrants', 'investment', 'depreciation', 'writeOffs', 'grossStock', 'netStock',
] as const;

function emptyBandAccount(): HumanCapitalBandAccount {
  return {
    entrants: 0, workersInService: 0, unitCost: 0, usefulLife: 0,
    investment: 0, depreciation: 0, writeOffs: 0, grossStock: 0, netStock: 0,
    deaths: 0, disabilityExits: 0, domesticExits: 0, retirements: 0,
  };
}

function emptyRegionAccount(): HumanCapitalRegionAccount {
  return {
    entrants: 0, investment: 0, depreciation: 0, writeOffs: 0,
    grossStock: 0, netStock: 0, investmentGdpShare: 0,
    migrationNetPeople: 0, migrationTransfer: 0,
  };
}

/** Advance one region-band vintage ledger by one year. */
function stepCell(input: CellInputs): CellResult {
  const { cell, unitCost, retirementAge } = input;
  const maxYears = retirementAge - cell.entryAge;
  const horizon = Math.max(1, Math.ceil(maxYears));

  // --- Seed 2025 vintages from the existing working stock -----------------
  // A steady flow of stock/span people turning 20 per year (uniform age
  // distribution over the working cohort, the same assumption demographics
  // makes when it ages 1/45 out per year), thinned by the survival curve so
  // the seeded ledger is in its steady state.
  let previous: number[];
  const table = hazardTable(cell, input.lifeExpectancy, Math.max(horizon,
    Array.isArray(input.previous) ? input.previous.length + 1 : 0));
  if (Array.isArray(input.previous)) {
    previous = input.previous;
  } else {
    previous = [];
    let survival = 1;
    for (let age = 0; retiredShare(age, maxYears) < 1; age++) {
      survival *= 1 - table[age].total;
      previous.push(input.previous.seedFlow * survival * (1 - retiredShare(age, maxYears)));
    }
  }
  const usefulLife = expectedLife(cell.entryAge, table, retirementAge);
  const bookValue = (age: number) => unitCost * Math.max(0, 1 - age / usefulLife);

  // --- Age the ledger, admit this year's entrants ---------------------------
  const aged = [input.entrants, ...previous];   // index = years since entry
  const result: CellResult = {
    ...emptyBandAccount(),
    entrants: input.entrants,
    unitCost,
    usefulLife,
    investment: input.entrants * unitCost / 1e12,
    migrationTransfer: 0,
    surviving: [],
  };

  // --- Migration: move headcount between regional ledgers ------------------
  // Net working-age migrants in this band, with a tenure profile that skews
  // early-career. Emigrants leave with their book value at origin cost;
  // immigrants are booked at this region's cost. Both are valued at
  // start-of-year book value, before this year's exits and slice.
  if (input.migrants !== 0) {
    const weights = aged.map((headcount, age) =>
      (input.migrants < 0 ? headcount : 1) * Math.exp(-age / input.migrantTenureScale));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight > 0) {
      for (let age = 0; age < aged.length; age++) {
        // Emigrants cannot exceed the vintage; the shortfall is dropped
        const move = input.migrants < 0
          ? -Math.min(aged[age], -input.migrants * weights[age] / totalWeight)
          : input.migrants * weights[age] / totalWeight;
        aged[age] += move;
        result.migrationTransfer += move * bookValue(age) / 1e12;
      }
    }
  }

  // --- Exits, write-offs, straight-line depreciation, retirement ------------
  for (let age = 0; age < aged.length; age++) {
    const headcount = aged[age];
    const remainingBefore = bookValue(age);
    const remainingAfter = bookValue(age + 1);

    // Pre-retirement exits leave with their remaining book value
    const h = table[age];
    result.deaths += headcount * h.death;
    result.disabilityExits += headcount * h.disability;
    result.domesticExits += headcount * h.domestic;
    result.writeOffs += headcount * h.total * remainingBefore / 1e12;
    const alive = headcount * (1 - h.total);

    // Straight-line slice on survivors, never below zero book value
    result.depreciation += alive * Math.min(unitCost / usefulLife, remainingBefore) / 1e12;

    // Retirement: the share of the vintage past the effective retirement
    // age leaves the workforce. Any remaining book value of retirees (only
    // when usefulLife ~ maxYears, i.e. no exit hazards) is taken as terminal
    // depreciation so the ledger closes exactly.
    const remaining = alive * (1 - retiredShare(age, maxYears));
    const retiring = alive - remaining;
    result.retirements += retiring;
    result.depreciation += retiring * remainingAfter / 1e12;

    // Still in service (possibly fully depreciated)
    result.surviving.push(remaining);
    result.workersInService += remaining;
    result.grossStock += remaining * unitCost / 1e12;
    result.netStock += remaining * remainingAfter / 1e12;
  }
  // Drop trailing retired vintages so the ledger never grows past the
  // retirement horizon.
  while (result.surviving.length > 0 && result.surviving[result.surviving.length - 1] === 0) {
    result.surviving.pop();
  }
  return result;
}

// =============================================================================
// MODULE
// =============================================================================

/** The generic Module contract, with validate/mergeParams accepting nested partial overrides. */
export interface HumanCapitalModule extends Module<
  HumanCapitalParams,
  HumanCapitalState,
  HumanCapitalInputs,
  HumanCapitalOutputs
> {
  validate(params: HumanCapitalOverrides): ValidationResult;
  mergeParams(partial: HumanCapitalOverrides): HumanCapitalParams;
}

export const humanCapitalModule: HumanCapitalModule = defineModule<
  HumanCapitalParams, HumanCapitalState, HumanCapitalInputs, HumanCapitalOutputs
>({
  name: 'humanCapital',
  description: 'Education-banded human-capital investment and straight-line depreciation over expected time in the workforce, at replacement cost',

  defaults: humanCapitalDefaults,

  paramMeta: {
    rearingCostShare: {
      description: 'Annual room, board, and care per child as a fraction of GDP per capita. USDA out-of-pocket ~0.23; NTA child consumption ~0.45 incl. schooling.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.30 },
      tier: 1 as const,
    },
    foregoneEarningsShare: {
      description: "Earnings a student forgoes per school year at or above the working age, as a fraction of GDP per capita (Kendrick/BEA convention; 0 = explicit outlays only).",
      unit: 'fraction',
      range: { min: 0, max: 1.5, default: 0.45 },
      tier: 1 as const,
    },
    migrantTenureScale: {
      description: 'Tenure profile of working-age migrants: exp(-years since entry / scale); 10 puts the mean mover ~10 years into a career.',
      unit: 'year',
      range: { min: 1, max: 45, default: 10 },
      tier: 2 as const,
    },
    hazards: {
      disabilityBase: {
        description: 'Annual disability-exit hazard at age 40 for secondary-educated workers (SSA award rates ~0.2-0.3%).',
        unit: 'fraction/year',
        range: { min: 0, max: 0.05, default: 0.0035 },
        tier: 2 as const,
      },
      mortalityBase: {
        description: 'Annual working-age mortality hazard at age 40, life expectancy 75, secondary band.',
        unit: 'fraction/year',
        range: { min: 0, max: 0.05, default: 0.002 },
        tier: 2 as const,
      },
    },
    bands: {
      primary: {
        retirementAge: {
          paramName: 'primaryRetirementAge',
          description: 'Effective retirement age of primary-only workers (2025).',
          unit: 'year',
          range: { min: 40, max: 80, default: 61 },
          tier: 2 as const,
        },
      },
      secondary: {
        retirementAge: {
          paramName: 'secondaryRetirementAge',
          description: 'Effective retirement age of secondary-completer workers (2025).',
          unit: 'year',
          range: { min: 40, max: 80, default: 63 },
          tier: 2 as const,
        },
      },
      tertiary: {
        retirementAge: {
          paramName: 'tertiaryRetirementAge',
          description: "Effective retirement age of bachelor's-level workers (2025).",
          unit: 'year',
          range: { min: 40, max: 80, default: 66 },
          tier: 2 as const,
        },
        stageCostShare: {
          paramName: 'tertiaryCostShare',
          description: 'Per-student annual tertiary spending as a fraction of GDP per capita (OECD EAG 2023 ~0.38).',
          unit: 'fraction',
          range: { min: 0, max: 2, default: 0.40 },
          tier: 2 as const,
        },
      },
      advanced: {
        retirementAge: {
          paramName: 'advancedRetirementAge',
          description: 'Effective retirement age of postgraduate workers (2025).',
          unit: 'year',
          range: { min: 40, max: 80, default: 68 },
          tier: 2 as const,
        },
      },
    },
  },

  connectorTypes: {
    inputs: {
      regionalWorkforceEntrants: unitPort('people/year', 'record'),
      regionalEntrantCollegeShare: unitPort('fraction', 'record'),
      regionalWorkingCollege: unitPort('people', 'record'),
      regionalWorkingNonCollege: unitPort('people', 'record'),
      regionalLifeExpectancy: unitPort('year', 'record'),
      regionalGdpPerCapita: unitPort('$/people/year', 'record'),
      regionalGdp: unitPort('$T/year', 'record'),
      regionalWorkingMigrationCollege: unitPort('people/year', 'record'),
      regionalWorkingMigrationNonCollege: unitPort('people/year', 'record'),
      regionalRetirementAgeExtension: unitPort('year', 'record'),
      gdp: unitPort('$T/year'),
      stock: unitPort('$T'),
    },
    outputs: {
      humanCapitalInvestment: unitPort('$T/year'),
      humanCapitalDepreciation: unitPort('$T/year'),
      humanCapitalWriteOffs: unitPort('$T/year'),
      humanCapitalNetInvestment: unitPort('$T/year'),
      humanCapitalGrossStock: unitPort('$T'),
      humanCapitalNetStock: unitPort('$T'),
      humanCapitalInvestmentGdpShare: unitPort('fraction'),
      humanCapitalDepreciationGdpShare: unitPort('fraction'),
      humanCapitalNetStockToPhysical: unitPort('fraction'),
      workforceEntrants: unitPort('people/year'),
      workforceExits: unitPort('people/year'),
      humanCapitalMigrationInflows: unitPort('$T/year'),
      humanCapitalMigrationOutflows: unitPort('$T/year'),
      humanCapitalMigrationRevaluation: unitPort('$T/year'),
      humanCapitalByBand: HUMAN_CAPITAL_BAND_PORT,
      regionalHumanCapital: HUMAN_CAPITAL_REGION_PORT,
    },
  },

  validate(partial: HumanCapitalOverrides): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const p = deepMerge(humanCapitalDefaults, partial);

    const finiteIn = (label: string, value: number, min: number, max: number) => {
      if (!Number.isFinite(value) || value < min || value > max) {
        errors.push(`${label} ${value} outside valid range [${min}, ${max}]`);
      }
    };

    finiteIn('rearingCostShare', p.rearingCostShare, 0, 1);
    finiteIn('schoolStartAge', p.schoolStartAge, 3, 10);
    finiteIn('foregoneEarningsFromAge', p.foregoneEarningsFromAge, 10, 30);
    finiteIn('foregoneEarningsShare', p.foregoneEarningsShare, 0, 1.5);
    finiteIn('secondaryCompletionConvergence', p.secondaryCompletionConvergence, 0, 1);
    finiteIn('initialWorkingSpan', p.initialWorkingSpan, 20, 60);
    finiteIn('migrantTenureScale', p.migrantTenureScale, 1, 45);

    const h = p.hazards;
    finiteIn('hazards.mortalityBase', h.mortalityBase, 0, 0.05);
    finiteIn('hazards.mortalityAgeSlope', h.mortalityAgeSlope, 0, 0.3);
    finiteIn('hazards.mortalityLifeExpectancySlope', h.mortalityLifeExpectancySlope, 0, 0.3);
    finiteIn('hazards.disabilityBase', h.disabilityBase, 0, 0.05);
    finiteIn('hazards.disabilityAgeSlope', h.disabilityAgeSlope, 0, 0.3);
    finiteIn('hazards.domesticExitWindow', h.domesticExitWindow, 1, 40);

    for (const band of EDUCATION_BANDS) {
      const b = p.bands[band];
      finiteIn(`bands.${band}.entryAge`, b.entryAge, 10, 35);
      finiteIn(`bands.${band}.stageYears`, b.stageYears, 0, 10);
      finiteIn(`bands.${band}.stageCostShare`, b.stageCostShare, 0, 2);
      finiteIn(`bands.${band}.retirementAge`, b.retirementAge, 40, 80);
      if (b.retirementAge <= b.entryAge) {
        errors.push(`bands.${band}.retirementAge ${b.retirementAge} must exceed entryAge ${b.entryAge}`);
      }
      finiteIn(`bands.${band}.mortalityMultiplier`, b.mortalityMultiplier, 0, 10);
      finiteIn(`bands.${band}.disabilityMultiplier`, b.disabilityMultiplier, 0, 10);
      finiteIn(`bands.${band}.domesticExitMultiplier`, b.domesticExitMultiplier, 0, 10);
    }
    for (let i = 1; i < EDUCATION_BANDS.length; i++) {
      const lower = p.bands[EDUCATION_BANDS[i - 1]];
      const upper = p.bands[EDUCATION_BANDS[i]];
      if (upper.entryAge < lower.entryAge) {
        warnings.push(`bands.${EDUCATION_BANDS[i]}.entryAge below bands.${EDUCATION_BANDS[i - 1]}.entryAge`);
      }
    }

    for (const region of REGIONS) {
      const r = p.regions[region];
      finiteIn(`regions.${region}.secondaryCompletionShare`, r.secondaryCompletionShare, 0, 1);
      finiteIn(`regions.${region}.secondaryCompletionTarget`, r.secondaryCompletionTarget, 0, 1);
      finiteIn(`regions.${region}.advancedShare`, r.advancedShare, 0, 1);
      finiteIn(`regions.${region}.domesticExitShare`, r.domesticExitShare, 0, 1);
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: HumanCapitalOverrides): HumanCapitalParams {
    // validatedMerge is typed on Partial<T>; both callbacks accept the deeper
    // override shape, so the narrowing here is only for its signature.
    return validatedMerge<HumanCapitalParams>(
      'humanCapital',
      this.validate,
      p => deepMerge(humanCapitalDefaults, p),
      partial as Partial<HumanCapitalParams>,
    );
  },

  init(): HumanCapitalState {
    return { initialized: false, vintages: {} as Record<Region, Record<EducationBand, number[]>> };
  },

  step(state, inputs, params, _year, yearIndex) {
    const vintages = {} as Record<Region, Record<EducationBand, number[]>>;
    const byBand = {} as Record<EducationBand, HumanCapitalBandAccount>;
    // Entrant-weighted unit cost and useful life per band; the unweighted
    // regional mean is the fallback for a band with no entrants anywhere.
    const meanCost = {} as Record<EducationBand, number>;
    const meanLife = {} as Record<EducationBand, number>;
    for (const band of EDUCATION_BANDS) {
      byBand[band] = emptyBandAccount();
      meanCost[band] = 0;
      meanLife[band] = 0;
    }
    const regional = {} as Record<Region, HumanCapitalRegionAccount>;
    let migrationInflows = 0;
    let migrationOutflows = 0;
    const migrantTenureScale = params.migrantTenureScale;
    const initialWorkingSpan = params.initialWorkingSpan;

    for (const region of REGIONS) {
      const account = emptyRegionAccount();
      const gdpPerCapita = Math.max(0, inputs.regionalGdpPerCapita[region] ?? 0);
      const lifeExpectancy = inputs.regionalLifeExpectancy[region] ?? 75;
      const retirementExtension = Math.max(0, inputs.regionalRetirementAgeExtension[region] ?? 0);

      const entrants = Math.max(0, inputs.regionalWorkforceEntrants[region] ?? 0);
      const college = clamp(inputs.regionalEntrantCollegeShare[region] ?? 0, 0, 1);
      const entrantsByBand = bandSplit(params, region, entrants * (1 - college), entrants * college, yearIndex);
      const migrantsByBand = bandSplit(
        params, region,
        inputs.regionalWorkingMigrationNonCollege[region] ?? 0,
        inputs.regionalWorkingMigrationCollege[region] ?? 0,
        yearIndex,
      );
      const stockByBand = state.initialized ? null : bandSplit(
        params, region,
        Math.max(0, inputs.regionalWorkingNonCollege[region] ?? 0),
        Math.max(0, inputs.regionalWorkingCollege[region] ?? 0),
        0,
      );

      vintages[region] = {} as Record<EducationBand, number[]>;

      for (const band of EDUCATION_BANDS) {
        const cell = hazardCell(params, region, band);
        const result = stepCell({
          cell,
          lifeExpectancy,
          // Retirement age extends with life expectancy under the pension
          // block's rule, so the two never disagree about working life.
          retirementAge: cell.retirementAge + retirementExtension,
          unitCost: unitReplacementCost(params, band, gdpPerCapita),
          entrants: entrantsByBand[band],
          migrants: migrantsByBand[band],
          migrantTenureScale,
          previous: stockByBand
            ? { seedFlow: stockByBand[band] / initialWorkingSpan, initialWorkingSpan }
            : state.vintages[region]?.[band] ?? [],
        });
        vintages[region][band] = result.surviving;

        const b = byBand[band];
        for (const key of BAND_FLOW_KEYS) b[key] += result[key];
        b.unitCost += result.unitCost * result.entrants;
        b.usefulLife += result.usefulLife * result.entrants;
        meanCost[band] += result.unitCost / REGIONS.length;
        meanLife[band] += result.usefulLife / REGIONS.length;

        for (const key of REGION_FLOW_KEYS) account[key] += result[key];
        account.migrationNetPeople += migrantsByBand[band];
        account.migrationTransfer += result.migrationTransfer;
        if (result.migrationTransfer > 0) migrationInflows += result.migrationTransfer;
        else migrationOutflows -= result.migrationTransfer;
      }

      const regionGdp = inputs.regionalGdp[region] ?? 0;
      account.investmentGdpShare = regionGdp > 0 ? account.investment / regionGdp : 0;
      regional[region] = account;
    }

    const total = emptyBandAccount();
    for (const band of EDUCATION_BANDS) {
      const b = byBand[band];
      b.unitCost = b.entrants > 0 ? b.unitCost / b.entrants : meanCost[band];
      b.usefulLife = b.entrants > 0 ? b.usefulLife / b.entrants : meanLife[band];
      for (const key of BAND_FLOW_KEYS) total[key] += b[key];
    }

    const gdp = inputs.gdp;
    return {
      state: { initialized: true, vintages },
      outputs: {
        humanCapitalInvestment: total.investment,
        humanCapitalDepreciation: total.depreciation,
        humanCapitalWriteOffs: total.writeOffs,
        humanCapitalNetInvestment: total.investment - total.depreciation - total.writeOffs,
        humanCapitalGrossStock: total.grossStock,
        humanCapitalNetStock: total.netStock,
        humanCapitalInvestmentGdpShare: gdp > 0 ? total.investment / gdp : 0,
        humanCapitalDepreciationGdpShare: gdp > 0 ? total.depreciation / gdp : 0,
        humanCapitalNetStockToPhysical: inputs.stock > 0 ? total.netStock / inputs.stock : 0,
        workforceEntrants: total.entrants,
        workforceExits: total.deaths + total.disabilityExits + total.domesticExits + total.retirements,
        humanCapitalMigrationInflows: migrationInflows,
        humanCapitalMigrationOutflows: migrationOutflows,
        humanCapitalMigrationRevaluation: migrationInflows - migrationOutflows,
        humanCapitalByBand: byBand,
        regionalHumanCapital: regional,
      },
    };
  },
});

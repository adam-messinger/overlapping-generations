/**
 * Demographics Module
 *
 * Population projection with cohort aging and education tracking.
 * Based on Fernández-Villaverde fertility convergence thesis.
 *
 * Inputs: NONE (root module - no dependencies)
 *
 * Outputs (to other modules):
 * - population: Global population
 * - working: Working-age population (20-64)
 * - dependency: Old-age dependency ratio
 * - effectiveWorkers: Productivity-weighted workers
 * - regionalPopulation: Per-region breakdown
 */

import { defineModule, Module, ValidationResult, validatedMerge, unitPort } from 'tsimulation';
import { Region, REGIONS } from '../domain-types.js';
import { exponentialConvergence, logistic } from '../primitives/math.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface RegionDemoParams {
  pop2025: number;           // Initial population
  fertility: number;         // TFR in 2025
  fertilityFloor: number;    // Long-term convergence target
  fertilityDecay: number;    // Annual convergence rate
  lifeExpectancy: number;    // Years
  young: number;             // 0-19 share
  workingYoung: number;      // 20-44 share (the childbearing band)
  workingOlder: number;      // 45-64 share
  old: number;               // 65+ share
  migrationRate: number;     // Net migration rate
}

export interface RegionEduParams {
  enrollmentRate2025: number;   // Tertiary enrollment rate
  enrollmentTarget: number;     // Long-term target
  enrollmentGrowth: number;     // Annual convergence rate
  collegeShare2025: number;     // Share of workers with degree
  wagePremium2025: number;      // College wage premium (1.5 = 50% more)
  premiumTarget: number;        // Long-term premium
  premiumDecay: number;         // Annual decay rate
  lifeBonusCollege: number;     // Extra years of life for college grads
  lifePenaltyNonCollege: number; // Penalty for non-college
}

/** Heat stress parameters per region (Zhao et al. 2021) */
export interface HeatStressParams {
  baselineWetBulb: number;      // Summer peak wet-bulb temperature (°C)
  warmingAmplification: number; // Regional warming multiplier relative to global mean
  outdoorFraction: number;      // Fraction of workers doing outdoor labor
}

export interface DemographicsParams {
  regions: Record<Region, RegionDemoParams>;
  education: Record<Region, RegionEduParams>;
  fertilityFloorMultiplier: number;
  migrationMultiplier: number;
  lifeExpectancyGrowth: number;

  // Optional exogenous population trajectory: scales all cohorts to match target total
  exogenousPopulation?: { year: number; total: number }[];

  // Heat stress (Zhao et al. 2021): wet-bulb temperature reduces outdoor labor productivity
  heatStress: Record<Region, HeatStressParams>;
  heatStressThreshold: number;    // Wet-bulb °C where productivity loss begins (33°C)
  heatStressScale: number;        // °C above threshold for full outdoor productivity loss (4°C)
}

export const demographicsDefaults: DemographicsParams = {
  // Regional table: pop2025, fertility, life expectancy, and cohort shares
  // from UN World Population Prospects 2024 (medium variant, regions
  // aggregated to this model's 9 groups); fertility floors/decay follow
  // Fernández-Villaverde's low-fertility convergence argument (see
  // docs/REFERENCES.md). migrationRate is the net annual rate as a fraction
  // of regional population, calibrated to UN WPP 2015-2023 net migration
  // averages; inflows are rescaled at runtime so global net migration is
  // zero.
  regions: {
    us: {
      pop2025: 0.3464e9,    // US Census Vintage 2024 / UN WPP 2024 low variant, 2025
      fertility: 1.419,        // TFR 2025, WPP low variant
      fertilityFloor: 1.140,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.2000,
      lifeExpectancy: 79.6,     // UN WPP 2024, 2025
      young: 0.2349,           // 0-19 share, WPP low 2025
      workingYoung: 0.3378,    // 20-44 share, WPP low 2025
      workingOlder: 0.2431,    // 45-64 share
      old: 0.1841,             // 65+ share
      migrationRate: 0.00376, // WPP low mean net migration / population 2025-2100
    },
    'oecd-ex-us': {
      pop2025: 0.8055e9,    // UN WPP 2024 low, member states less the US, 2025
      fertility: 1.113,        // TFR 2025, WPP low variant
      fertilityFloor: 1.021,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.2000,
      lifeExpectancy: 82.6,     // UN WPP 2024, 2025
      young: 0.1926,           // 0-19 share, WPP low 2025
      workingYoung: 0.3030,    // 20-44 share, WPP low 2025
      workingOlder: 0.2770,    // 45-64 share
      old: 0.2274,             // 65+ share
      migrationRate: 0.00203, // WPP low mean net migration / population 2025-2100
    },
    china: {
      pop2025: 1.4440e9,    // UN WPP 2024 low, incl. Hong Kong, Macao, Taiwan, 2025
      fertility: 0.766,        // TFR 2025, WPP low variant (incl. HK/Macao/Taiwan)
      fertilityFloor: 0.740,   // WPP low has China rising slightly after 2050; the
      // module's monotone convergence takes the flat best fit instead
      fertilityDecay: 0.0400,
      lifeExpectancy: 78.5,     // UN WPP 2024, 2025
      young: 0.2108,           // 0-19 share, WPP low 2025
      workingYoung: 0.3424,    // 20-44 share, WPP low 2025
      workingOlder: 0.2961,    // 45-64 share
      old: 0.1507,             // 65+ share
      migrationRate: -0.00016, // WPP low mean net migration / population 2025-2100
    },
    india: {
      pop2025: 1.9868e9,    // UN WPP 2024 low, India + South Asia, 2025
      fertility: 1.930,        // TFR 2025, WPP low variant
      fertilityFloor: 1.331,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.0658,
      lifeExpectancy: 72.1,     // UN WPP 2024, 2025
      young: 0.3535,           // 0-19 share, WPP low 2025
      workingYoung: 0.3957,    // 20-44 share, WPP low 2025
      workingOlder: 0.1819,    // 45-64 share
      old: 0.0688,             // 65+ share
      migrationRate: -0.00067, // WPP low mean net migration / population 2025-2100
    },
    latam: {
      pop2025: 0.6659e9,    // UN WPP 2024 low, Latin America and the Caribbean, 2025
      fertility: 1.573,        // TFR 2025, WPP low variant
      fertilityFloor: 1.158,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.1529,
      lifeExpectancy: 76.0,     // UN WPP 2024, 2025
      young: 0.2977,           // 0-19 share, WPP low 2025
      workingYoung: 0.3818,    // 20-44 share, WPP low 2025
      workingOlder: 0.2186,    // 45-64 share
      old: 0.1020,             // 65+ share
      migrationRate: -0.00042, // WPP low mean net migration / population 2025-2100
    },
    seasia: {
      pop2025: 0.7424e9,    // UN WPP 2024 low, SE Asia + Pacific, 2025
      fertility: 1.708,        // TFR 2025, WPP low variant
      fertilityFloor: 1.222,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.1114,
      lifeExpectancy: 72.3,     // UN WPP 2024, 2025
      young: 0.3139,           // 0-19 share, WPP low 2025
      workingYoung: 0.3797,    // 20-44 share, WPP low 2025
      workingOlder: 0.2215,    // 45-64 share
      old: 0.0849,             // 65+ share
      migrationRate: -0.00015, // WPP low mean net migration / population 2025-2100
    },
    russia: {
      pop2025: 0.2950e9,    // UN WPP 2024 low, Russia + CIS, 2025
      fertility: 1.698,        // TFR 2025, WPP low variant
      fertilityFloor: 1.305,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.0870,
      lifeExpectancy: 73.6,     // UN WPP 2024, 2025
      young: 0.2713,           // 0-19 share, WPP low 2025
      workingYoung: 0.3437,    // 20-44 share, WPP low 2025
      workingOlder: 0.2409,    // 45-64 share
      old: 0.1440,             // 65+ share
      migrationRate: 0.00098, // WPP low mean net migration / population 2025-2100
    },
    mena: {
      pop2025: 0.6016e9,    // UN WPP 2024 low, MENA incl. Iran and Turkiye, 2025
      fertility: 2.131,        // TFR 2025, WPP low variant
      fertilityFloor: 1.294,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.0478,
      lifeExpectancy: 75.5,     // UN WPP 2024, 2025
      young: 0.3585,           // 0-19 share, WPP low 2025
      workingYoung: 0.3903,    // 20-44 share, WPP low 2025
      workingOlder: 0.1871,    // 45-64 share
      old: 0.0641,             // 65+ share
      migrationRate: -0.00033, // WPP low mean net migration / population 2025-2100
    },
    ssa: {
      pop2025: 1.3216e9,    // UN WPP 2024 low, Sub-Saharan Africa incl. Sudan, 2025
      fertility: 3.900,        // TFR 2025, WPP low variant
      fertilityFloor: 1.453,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.0392,
      lifeExpectancy: 63.0,     // UN WPP 2024, 2025
      young: 0.5111,           // 0-19 share, WPP low 2025
      workingYoung: 0.3447,    // 20-44 share, WPP low 2025
      workingOlder: 0.1117,    // 45-64 share
      old: 0.0325,             // 65+ share
      migrationRate: -0.00035, // WPP low mean net migration / population 2025-2100
    },
  },
  // Education block: enrollment rates/targets anchored to UNESCO UIS
  // tertiary gross enrollment (2022: OECD ~75%, China ~60%, SSA ~10%);
  // college wage premia to Psacharopoulos & Patrinos (2018) returns-to-
  // education ranges; life-expectancy bonuses/penalties are stylized
  // (US college/non-college gap ~8yr, Case & Deaton 2021 — halved here
  // as a global compromise). Trajectory params (targets, growth, decay)
  // are modeling assumptions.
  education: {
    us: {
      enrollmentRate2025: 0.79,  // UNESCO UIS 2022 tertiary gross enrollment, US ~79%
      enrollmentTarget: 0.82,
      enrollmentGrowth: 0.010,
      collegeShare2025: 0.42,    // Census CPS 2023: 37.7% of 25+ bachelor's+, higher among 25-64
      wagePremium2025: 1.7,      // OECD EAG 2024: US tertiary/upper-secondary earnings ~1.73
      premiumTarget: 1.5,
      premiumDecay: 0.003,
      lifeBonusCollege: 4,       // Case & Deaton 2021: ~8yr BA/non-BA gap, halved
      lifePenaltyNonCollege: 1,
    },
    'oecd-ex-us': {
      enrollmentRate2025: 0.73,  // UNESCO UIS 2022: OECD ~75% incl. US; Mexico/Turkey pull the rest down
      enrollmentTarget: 0.80,
      enrollmentGrowth: 0.010,
      collegeShare2025: 0.39,    // OECD EAG 2024: tertiary attainment 25-64 ~40% ex-US
      wagePremium2025: 1.45,     // OECD EAG 2024: OECD avg 1.54 with the US at 1.73
      premiumTarget: 1.35,
      premiumDecay: 0.003,
      lifeBonusCollege: 3,
      lifePenaltyNonCollege: 1,
    },
    china: {
      enrollmentRate2025: 0.61,
      enrollmentTarget: 0.80,
      enrollmentGrowth: 0.015,
      collegeShare2025: 0.22,
      wagePremium2025: 1.8,
      premiumTarget: 1.5,
      premiumDecay: 0.005,
      lifeBonusCollege: 2,
      lifePenaltyNonCollege: 1,
    },
    india: {
      enrollmentRate2025: 0.30,
      enrollmentTarget: 0.55,
      enrollmentGrowth: 0.025,
      collegeShare2025: 0.15,
      wagePremium2025: 2.0,
      premiumTarget: 1.6,
      premiumDecay: 0.004,
      lifeBonusCollege: 2,
      lifePenaltyNonCollege: 1,
    },
    latam: {
      enrollmentRate2025: 0.55,
      enrollmentTarget: 0.65,
      enrollmentGrowth: 0.015,
      collegeShare2025: 0.20,
      wagePremium2025: 2.0,
      premiumTarget: 1.6,
      premiumDecay: 0.004,
      lifeBonusCollege: 2,
      lifePenaltyNonCollege: 1,
    },
    seasia: {
      enrollmentRate2025: 0.38,
      enrollmentTarget: 0.60,
      enrollmentGrowth: 0.020,
      collegeShare2025: 0.15,
      wagePremium2025: 1.8,
      premiumTarget: 1.5,
      premiumDecay: 0.004,
      lifeBonusCollege: 2,
      lifePenaltyNonCollege: 1,
    },
    russia: {
      enrollmentRate2025: 0.68,
      enrollmentTarget: 0.75,
      enrollmentGrowth: 0.010,
      collegeShare2025: 0.35,
      wagePremium2025: 1.4,
      premiumTarget: 1.3,
      premiumDecay: 0.003,
      lifeBonusCollege: 2,
      lifePenaltyNonCollege: 2,  // High non-college male mortality (alcohol, occupational hazards)
    },
    mena: {
      enrollmentRate2025: 0.40,
      enrollmentTarget: 0.60,
      enrollmentGrowth: 0.020,
      collegeShare2025: 0.20,
      wagePremium2025: 1.8,
      premiumTarget: 1.5,
      premiumDecay: 0.004,
      lifeBonusCollege: 2,
      lifePenaltyNonCollege: 1,
    },
    ssa: {
      enrollmentRate2025: 0.09,
      enrollmentTarget: 0.40,
      enrollmentGrowth: 0.030,
      collegeShare2025: 0.06,
      wagePremium2025: 2.5,
      premiumTarget: 1.8,
      premiumDecay: 0.003,
      lifeBonusCollege: 1,
      lifePenaltyNonCollege: 1,
    },
  },
  fertilityFloorMultiplier: 1.0,
  migrationMultiplier: 1.0,
  lifeExpectancyGrowth: 0.139, // mean regional LEx gain, UN WPP 2024 (10.4 yr to 2100)

  // Heat stress: wet-bulb temperature → outdoor labor productivity loss
  heatStress: {
    us:     { baselineWetBulb: 24, warmingAmplification: 0.8, outdoorFraction: 0.14 },  // BLS: agriculture+construction ~6% of jobs; Gulf/Southeast humid summers
    'oecd-ex-us': { baselineWetBulb: 24, warmingAmplification: 0.8, outdoorFraction: 0.16 },  // Mexico/Turkey/Southern Europe raise outdoor share
    china:  { baselineWetBulb: 28, warmingAmplification: 1.0, outdoorFraction: 0.25 },
    india:  { baselineWetBulb: 31, warmingAmplification: 1.2, outdoorFraction: 0.40 },
    latam:  { baselineWetBulb: 28, warmingAmplification: 1.0, outdoorFraction: 0.25 },
    seasia: { baselineWetBulb: 30, warmingAmplification: 1.1, outdoorFraction: 0.35 },
    russia: { baselineWetBulb: 18, warmingAmplification: 0.6, outdoorFraction: 0.20 },
    mena:   { baselineWetBulb: 30, warmingAmplification: 1.2, outdoorFraction: 0.30 },
    ssa:    { baselineWetBulb: 31, warmingAmplification: 1.2, outdoorFraction: 0.45 },
  },
  heatStressThreshold: 33,   // Wet-bulb °C where outdoor productivity loss begins
  heatStressScale: 4,        // °C above threshold for total outdoor productivity loss
};

// =============================================================================
// STATE - Track absolute counts, not shares
// =============================================================================

interface RegionState {
  population: number;
  // Absolute cohort counts. The working cohort is carried as two bands,
  // 20-44 and 45-64, so a retirement wave propagates with a lag instead of
  // draining at a flat 1/45 a year; `working` is their sum.
  young: number;
  old: number;
  // Education splits (absolute counts), per working band
  w1College: number;
  w1NonCollege: number;
  w2College: number;
  w2NonCollege: number;
  oldCollege: number;
  oldNonCollege: number;
  // Other state
  lifeExpectancy: number;
  // Cached params for projections
  _fertility0: number;
  _fertilityFloor: number;
  _fertilityDecay: number;
  _migrationRate: number;
}

export interface DemographicsState {
  regions: Record<Region, RegionState>;
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface DemographicsInputs {
  /** Global temperature above preindustrial (°C), lagged from climate */
  temperature: number;
}

export interface DemographicsOutputs {
  // Global aggregates
  population: number;
  working: number;
  dependency: number;
  effectiveWorkers: number;
  collegeShare: number;

  // Heat stress
  heatStressLoss: Record<Region, number>;  // Fractional labor loss per region (0-1)

  // Regional breakdown
  regionalPopulation: Record<Region, number>;
  regionalYoung: Record<Region, number>;
  regionalWorking: Record<Region, number>;
  regionalOld: Record<Region, number>;
  regionalEffectiveWorkers: Record<Region, number>;
  regionalDependency: Record<Region, number>;
  regionalFertility: Record<Region, number>;
  regionalLifeExpectancy: Record<Region, number>;

  // Education-split working stocks and this year's workforce entrants (the
  // 1/20 of the young cohort that ages into working age; read by the
  // human-capital ledger)
  regionalWorkingCollege: Record<Region, number>;
  regionalWorkingNonCollege: Record<Region, number>;
  regionalWorkforceEntrants: Record<Region, number>;
  regionalEntrantCollegeShare: Record<Region, number>;
  // Net working-age migration by education (people/year; positive = inflow,
  // sums to zero across regions). Read by the human-capital ledger.
  regionalWorkingMigrationCollege: Record<Region, number>;
  regionalWorkingMigrationNonCollege: Record<Region, number>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function projectFertility(
  initial: number,
  floor: number,
  decayRate: number,
  years: number
): number {
  return exponentialConvergence(initial, floor, decayRate, years);
}

function projectEnrollmentRate(
  initial: number,
  target: number,
  growthRate: number,
  years: number
): number {
  // Use logistic function correctly: logistic(start, ceiling, rate, years)
  return logistic(initial, target, growthRate * 10, years);
}

function projectWagePremium(
  initial: number,
  target: number,
  decayRate: number,
  years: number
): number {
  return exponentialConvergence(initial, target, decayRate, years);
}

/** Net migrants: 80% working-age (70% of them college), 15% young, 5% old. */
const WORKING_MIGRANT_SHARE = 0.8;
const MIGRANT_COLLEGE_SHARE = 0.70;
const YOUNG_MIGRANT_SHARE = 0.15;
const OLD_MIGRANT_SHARE = 0.05;
/** Working-age arrivals skew to the younger band. */
const W1_MIGRANT_SHARE = 0.75;

// =============================================================================
// COHORT TRANSITION AND MORTALITY CONSTANTS
//
// Calibrated to the UN WPP 2024 low-fertility variant aggregated to these nine
// regions, 2025-2100 (scripts/repro/calibrate_demographics.py). The working
// cohort is two bands so that the 45-64 bulge retires as a wave; a single
// 20-64 stock draining at 1/45 a year cannot track a non-uniform age pyramid.
// =============================================================================
const W1_SPAN = 25;   // ages 20-44
const W2_SPAN = 20;   // ages 45-64

/**
 * Childbearing exposure. 15-19 is ~28% of the 0-19 cohort and 45-49 ~28% of
 * the 45-64 band (UN WPP 2024 age structure); all of 20-44 is in the window.
 * The span is the effective 15-49 window, fitted to WPP low births (35.9 yr
 * against a nominal 35).
 */
const EXPOSURE_YOUNG = 0.28;
const EXPOSURE_W1 = 1.0;
const EXPOSURE_W2 = 0.28;
const CHILDBEARING_SPAN = 35.9;

/**
 * Annual death rates at the LEx = 75 reference, falling with life expectancy.
 * Fitted within demographically plausible bands: 0-19 0.05-0.30%, 20-44
 * 0.10-0.25%, 45-64 0.40-0.90% a year.
 */
const YOUNG_DEATH_RATE = 0.0015;
const W1_DEATH_RATE = 0.0010;
const W2_DEATH_RATE = 0.0040;
const W1_DEATH_LE_DECAY = 0.03;
const W2_DEATH_LE_DECAY = 0.04;
const DEATH_REFERENCE_LE = 75;

/**
 * Effective remaining life at 65, which sets the old cohort's exit rate. The
 * module previously used LEx - 55, which overstates remaining life at 65 by
 * ~10 years once LEx reaches 90 and so let the old cohort accumulate without
 * limit. Regressing UN WPP 2024 LE65 on LEx across the nine regions, 2025-2100
 * gives 0.539 * LEx - 23.14 (R2 0.944, max residual 2.8 yr). The intercept
 * used here is looser than that: 1/LE65 is the 65+ death rate only in a
 * stationary population, and this one is far from stationary while the large
 * mid-century cohorts age in, so -20.5 is the value that keeps the modelled
 * 65+ stock on the WPP low path through that transition (old cohort within
 * about 10% of WPP low, 2025-2100).
 */
const LE65_SLOPE = 0.539;
const LE65_INTERCEPT = -20.5;

/**
 * The flows a region's cohorts generate this year: entrants aging out of the
 * young cohort, their college split, and net migration by cohort. One source
 * for ageCohorts and for the reported outputs, so the two cannot drift.
 */
interface CohortFlows {
  entrants: number;               // 1/20 of the young cohort turns 20
  enrollRate: number;             // college share of entrants
  migration: number;              // net migrants, all ages
  workingMigrationCollege: number;
  workingMigrationNonCollege: number;
}

function cohortFlows(
  state: RegionState,
  eduParams: RegionEduParams,
  yearIndex: number,
  effectiveMigrationRate: number
): CohortFlows {
  const migration = state.population * effectiveMigrationRate;
  const working = migration * WORKING_MIGRANT_SHARE;
  return {
    // Young cohort: 20 years (ages 0-19), so 1/20 age out per year
    entrants: state.young / 20,
    enrollRate: projectEnrollmentRate(
      eduParams.enrollmentRate2025,
      eduParams.enrollmentTarget,
      eduParams.enrollmentGrowth,
      yearIndex
    ),
    migration,
    workingMigrationCollege: working * MIGRANT_COLLEGE_SHARE,
    workingMigrationNonCollege: working * (1 - MIGRANT_COLLEGE_SHARE),
  };
}

/**
 * Births from the TFR and the cohorts in the 15-49 window. With the working
 * cohort split at 45, the 20-44 band *is* the core childbearing range, so the
 * exposure weights are structural rather than stylized.
 */
function birthsFromTFR(tfr: number, young: number, w1: number, w2: number): number {
  const womenOfChildbearingAge =
    (EXPOSURE_YOUNG * young + EXPOSURE_W1 * w1 + EXPOSURE_W2 * w2) * 0.5;
  return (tfr * womenOfChildbearingAge) / CHILDBEARING_SPAN;
}

/** Remaining life expectancy at 65 implied by a region's life expectancy. */
function remainingLifeAt65(lifeExpectancy: number): number {
  return Math.max(10, LE65_SLOPE * lifeExpectancy + LE65_INTERCEPT);
}

function ageCohorts(
  state: RegionState,
  tfr: number,
  eduParams: RegionEduParams,
  lifeExpectancyGrowth: number,
  flows: CohortFlows
): RegionState {
  const w1 = state.w1College + state.w1NonCollege;
  const w2 = state.w2College + state.w2NonCollege;

  const births = birthsFromTFR(tfr, state.young, w1, w2);

  // Aging transitions: each band drains over its own width, so the 45-64
  // bulge reaches 65 as a wave rather than immediately.
  const agingOutOfYoung = flows.entrants;
  const agingOutOfW1 = w1 / W1_SPAN;
  const agingOutOfW2 = w2 / W2_SPAN;

  // Working-age and child mortality, falling with life expectancy.
  const leGap = state.lifeExpectancy - DEATH_REFERENCE_LE;
  const w1DeathRate = W1_DEATH_RATE * Math.exp(-W1_DEATH_LE_DECAY * leGap);
  const w2DeathRate = W2_DEATH_RATE * Math.exp(-W2_DEATH_LE_DECAY * leGap);
  const youngDeaths = state.young * YOUNG_DEATH_RATE;

  // === EDUCATION TRACKING ===
  const newCollegeWorkers = agingOutOfYoung * flows.enrollRate;
  const newNonCollegeWorkers = agingOutOfYoung * (1 - flows.enrollRate);
  const collegeShareW1 = w1 > 0 ? state.w1College / w1 : flows.enrollRate;
  const collegeShareW2 = w2 > 0 ? state.w2College / w2 : collegeShareW1;

  // Old cohort deaths with differential mortality
  const remainingLEat65Base = remainingLifeAt65(state.lifeExpectancy);
  const remainingLEat65College = remainingLEat65Base + eduParams.lifeBonusCollege * 0.5;
  const remainingLEat65NonCollege = Math.max(
    8, remainingLEat65Base - eduParams.lifePenaltyNonCollege * 0.5);

  const oldDeathsCollege = Math.min(state.oldCollege / remainingLEat65College, state.oldCollege);
  const oldDeathsNonCollege = Math.min(
    state.oldNonCollege / remainingLEat65NonCollege, state.oldNonCollege);

  // === COHORT UPDATES ===
  let w1College = Math.max(0, state.w1College + newCollegeWorkers
    - agingOutOfW1 * collegeShareW1 - state.w1College * w1DeathRate);
  let w1NonCollege = Math.max(0, state.w1NonCollege + newNonCollegeWorkers
    - agingOutOfW1 * (1 - collegeShareW1) - state.w1NonCollege * w1DeathRate);
  let w2College = Math.max(0, state.w2College + agingOutOfW1 * collegeShareW1
    - agingOutOfW2 * collegeShareW2 - state.w2College * w2DeathRate);
  let w2NonCollege = Math.max(0, state.w2NonCollege + agingOutOfW1 * (1 - collegeShareW1)
    - agingOutOfW2 * (1 - collegeShareW2) - state.w2NonCollege * w2DeathRate);
  let newOldCollege = Math.max(0, state.oldCollege + agingOutOfW2 * collegeShareW2 - oldDeathsCollege);
  let newOldNonCollege = Math.max(0, state.oldNonCollege
    + agingOutOfW2 * (1 - collegeShareW2) - oldDeathsNonCollege);
  let newYoung = Math.max(0, state.young + births - agingOutOfYoung - youngDeaths);

  // Apply migration (primarily working-age, skewed to the younger band and
  // 70% college). Rate is pre-scaled so global net migration sums to zero.
  const migW1 = flows.migration * WORKING_MIGRANT_SHARE * W1_MIGRANT_SHARE;
  const migW2 = flows.migration * WORKING_MIGRANT_SHARE * (1 - W1_MIGRANT_SHARE);
  w1College += migW1 * MIGRANT_COLLEGE_SHARE;
  w1NonCollege += migW1 * (1 - MIGRANT_COLLEGE_SHARE);
  w2College += migW2 * MIGRANT_COLLEGE_SHARE;
  w2NonCollege += migW2 * (1 - MIGRANT_COLLEGE_SHARE);
  newYoung += flows.migration * YOUNG_MIGRANT_SHARE;
  newOldCollege += flows.migration * OLD_MIGRANT_SHARE * 0.5;
  newOldNonCollege += flows.migration * OLD_MIGRANT_SHARE * 0.5;

  const newWorking = w1College + w1NonCollege + w2College + w2NonCollege;
  const newOld = newOldCollege + newOldNonCollege;

  return {
    population: newYoung + newWorking + newOld,
    young: newYoung,
    old: newOld,
    w1College,
    w1NonCollege,
    w2College,
    w2NonCollege,
    oldCollege: newOldCollege,
    oldNonCollege: newOldNonCollege,
    lifeExpectancy: state.lifeExpectancy + lifeExpectancyGrowth,
    _fertility0: state._fertility0,
    _fertilityFloor: state._fertilityFloor,
    _fertilityDecay: state._fertilityDecay,
    _migrationRate: state._migrationRate,
  };
}

/**
 * Linearly interpolate exogenous population for a given year.
 * Clamps to first/last value outside data range.
 */
function interpolateExogenousPop(
  year: number,
  data: { year: number; total: number }[]
): number {
  if (data.length === 0) return 0;
  if (year <= data[0].year) return data[0].total;
  if (year >= data[data.length - 1].year) return data[data.length - 1].total;
  for (let i = 0; i < data.length - 1; i++) {
    if (year >= data[i].year && year <= data[i + 1].year) {
      const t = (year - data[i].year) / (data[i + 1].year - data[i].year);
      return data[i].total + t * (data[i + 1].total - data[i].total);
    }
  }
  return data[data.length - 1].total;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const demographicsModule: Module<
  DemographicsParams,
  DemographicsState,
  DemographicsInputs,
  DemographicsOutputs
> = defineModule<DemographicsParams, DemographicsState, DemographicsInputs, DemographicsOutputs>({
  name: 'demographics',
  description: 'Population projection with cohort aging and education',

  defaults: demographicsDefaults,

  paramMeta: {
    regions: {
      us: {
        fertilityFloor: {
          paramName: 'usFertilityFloor',
          description: 'Long-run fertility floor for the United States. 2.1 = replacement level.',
          unit: 'children/woman',
          range: { min: 1.0, max: 2.1, default: 1.4 },
          tier: 1 as const,
        },
      },
      'oecd-ex-us': {
        fertilityFloor: {
          paramName: 'oecdExUsFertilityFloor',
          description: 'Long-run fertility floor for the OECD ex-US region. 2.1 = replacement level.',
          unit: 'children/woman',
          range: { min: 1.0, max: 2.1, default: 1.3 },
          tier: 1 as const,
        },
      },
    },
  },

  connectorTypes: {
    inputs: {
      // Lagged from climate, for heat stress.
      temperature: unitPort('Δ°C'),
    },
    outputs: {
      population: unitPort('people'),
      working: unitPort('people'),
      dependency: unitPort('fraction'),
      effectiveWorkers: unitPort('people'),
      collegeShare: unitPort('fraction'),
      heatStressLoss: unitPort('fraction', 'record'),
      regionalPopulation: unitPort('people', 'record'),
      regionalYoung: unitPort('people', 'record'),
      regionalWorking: unitPort('people', 'record'),
      regionalOld: unitPort('people', 'record'),
      regionalEffectiveWorkers: unitPort('people', 'record'),
      regionalDependency: unitPort('fraction', 'record'),
      regionalFertility: unitPort('1', 'record'),
      regionalLifeExpectancy: unitPort('year', 'record'),
      regionalWorkingCollege: unitPort('people', 'record'),
      regionalWorkingNonCollege: unitPort('people', 'record'),
      regionalWorkforceEntrants: unitPort('people/year', 'record'),
      regionalEntrantCollegeShare: unitPort('fraction', 'record'),
      regionalWorkingMigrationCollege: unitPort('people/year', 'record'),
      regionalWorkingMigrationNonCollege: unitPort('people/year', 'record'),
    },
  },

  validate(params: Partial<DemographicsParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const p = { ...demographicsDefaults, ...params };

    for (const region of REGIONS) {
      const r = p.regions[region];
      if (r.fertility < 0.5 || r.fertility > 6) {
        errors.push(`${region}.fertility ${r.fertility} outside valid range [0.5, 6]`);
      }
      if (r.fertilityFloor < 0.5) {
        warnings.push(`${region}.fertilityFloor ${r.fertilityFloor} very low`);
      }

      const cohortSum = r.young + r.workingYoung + r.workingOlder + r.old;
      if (Math.abs(cohortSum - 1.0) > 0.01) {
        errors.push(`${region} cohort shares sum to ${cohortSum}, should be 1.0`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<DemographicsParams>): DemographicsParams {
    return validatedMerge('demographics', this.validate, (p) => {
      const result = { ...demographicsDefaults, ...p };

      // Deep merge regions
      if (p.regions) {
        result.regions = { ...demographicsDefaults.regions };
        for (const region of REGIONS) {
          if (p.regions[region]) {
            result.regions[region] = {
              ...demographicsDefaults.regions[region],
              ...p.regions[region],
            };
          }
        }
      }

      // Deep merge education
      if (p.education) {
        result.education = { ...demographicsDefaults.education };
        for (const region of REGIONS) {
          if (p.education[region]) {
            result.education[region] = {
              ...demographicsDefaults.education[region],
              ...p.education[region],
            };
          }
        }
      }

      // Deep merge heat stress
      if (p.heatStress) {
        result.heatStress = { ...demographicsDefaults.heatStress };
        for (const region of REGIONS) {
          if (p.heatStress[region]) {
            result.heatStress[region] = {
              ...demographicsDefaults.heatStress[region],
              ...p.heatStress[region],
            };
          }
        }
      }

      return result;
    }, partial);
  },

  init(params: DemographicsParams): DemographicsState {
    const regions: Record<Region, RegionState> = {} as Record<Region, RegionState>;

    for (const region of REGIONS) {
      const r = params.regions[region];
      const e = params.education[region];

      // Initialize with ABSOLUTE counts, not shares
      const pop = r.pop2025;
      const youngAbs = r.young * pop;
      const w1Abs = r.workingYoung * pop;
      const w2Abs = r.workingOlder * pop;
      const oldAbs = r.old * pop;

      // Education splits. The older working band carries a lower college
      // share than the younger one: attainment has risen with each cohort.
      const w1Share = Math.min(1, e.collegeShare2025 * 1.15);
      const w2Share = Math.max(0, e.collegeShare2025 * 0.8);
      // Elderly college share starts lower (they got degrees decades ago)
      const oldCollege = oldAbs * e.collegeShare2025 * 0.5;
      const oldNonCollege = oldAbs - oldCollege;

      regions[region] = {
        population: pop,
        young: youngAbs,
        old: oldAbs,
        w1College: w1Abs * w1Share,
        w1NonCollege: w1Abs * (1 - w1Share),
        w2College: w2Abs * w2Share,
        w2NonCollege: w2Abs * (1 - w2Share),
        oldCollege,
        oldNonCollege,
        lifeExpectancy: r.lifeExpectancy,
        // Cache effective params
        _fertility0: r.fertility,
        _fertilityFloor: r.fertilityFloor * params.fertilityFloorMultiplier,
        _fertilityDecay: r.fertilityDecay,
        _migrationRate: r.migrationRate * params.migrationMultiplier,
      };
    }

    return { regions };
  },

  step(state, inputs, params, year, yearIndex) {
    const temperature = inputs.temperature ?? 1.2;  // Fallback for year 0

    const newRegions: Record<Region, RegionState> = {} as Record<Region, RegionState>;

    // Aggregate outputs
    let totalPop = 0;
    let totalWorking = 0;
    let totalOld = 0;
    let totalEffective = 0;
    let totalCollegeWorkers = 0;

    const regionalPopulation: Record<Region, number> = {} as Record<Region, number>;
    const regionalYoung: Record<Region, number> = {} as Record<Region, number>;
    const regionalWorking: Record<Region, number> = {} as Record<Region, number>;
    const regionalOld: Record<Region, number> = {} as Record<Region, number>;
    const regionalDependency: Record<Region, number> = {} as Record<Region, number>;
    const regionalFertility: Record<Region, number> = {} as Record<Region, number>;
    const regionalEffectiveWorkers: Record<Region, number> = {} as Record<Region, number>;
    const heatStressLoss: Record<Region, number> = {} as Record<Region, number>;
    const regionalLifeExpectancy: Record<Region, number> = {} as Record<Region, number>;
    const regionalWorkingCollege: Record<Region, number> = {} as Record<Region, number>;
    const regionalWorkingNonCollege: Record<Region, number> = {} as Record<Region, number>;
    const regionalWorkforceEntrants: Record<Region, number> = {} as Record<Region, number>;
    const regionalEntrantCollegeShare: Record<Region, number> = {} as Record<Region, number>;
    const regionalWorkingMigrationCollege: Record<Region, number> = {} as Record<Region, number>;
    const regionalWorkingMigrationNonCollege: Record<Region, number> = {} as Record<Region, number>;

    // Migration conservation: scale receiving-region inflows so global net
    // migration is exactly zero (a closed world). Emigration supply
    // (negative-rate regions) sets the budget, so positive migrationRates
    // act as *relative shares* of that budget, not absolute inflow rates —
    // halving a sole receiver's rate does not halve its inflow.
    let totalInflow = 0;
    let totalOutflow = 0;
    for (const region of REGIONS) {
      const flow = state.regions[region].population * state.regions[region]._migrationRate;
      if (flow > 0) totalInflow += flow;
      else totalOutflow += -flow;
    }
    const inflowScale = totalInflow > 0 ? totalOutflow / totalInflow : 0;

    for (const region of REGIONS) {
      const regionState = state.regions[region];
      const eduParams = params.education[region];

      // Project fertility for this year
      const tfr = projectFertility(
        regionState._fertility0,
        regionState._fertilityFloor,
        regionState._fertilityDecay,
        yearIndex
      );

      // For year 0 (2025), just output current state
      // For subsequent years, age forward
      // Inflows scale to match the emigration budget; with no receiving
      // regions, outflows are zeroed too (net must be zero)
      const effectiveMigrationRate = totalInflow === 0
        ? 0
        : (regionState._migrationRate > 0
          ? regionState._migrationRate * inflowScale
          : regionState._migrationRate);
      // Flows are reported in year 0 too (no aging happens, but the entrant
      // and migration flows implied by the 2025 age structure are
      // well-defined observables read by the human-capital ledger).
      const flows = cohortFlows(regionState, eduParams, yearIndex, effectiveMigrationRate);
      const newState = yearIndex === 0
        ? regionState
        : ageCohorts(regionState, tfr, eduParams, params.lifeExpectancyGrowth, flows);
      regionalWorkforceEntrants[region] = flows.entrants;
      regionalEntrantCollegeShare[region] = flows.enrollRate;
      regionalWorkingMigrationCollege[region] = flows.workingMigrationCollege;
      regionalWorkingMigrationNonCollege[region] = flows.workingMigrationNonCollege;

      newRegions[region] = newState;
      regionalLifeExpectancy[region] = newState.lifeExpectancy;

      const workingCollegeAbs = newState.w1College + newState.w2College;
      const workingNonCollegeAbs = newState.w1NonCollege + newState.w2NonCollege;
      regionalWorkingCollege[region] = workingCollegeAbs;
      regionalWorkingNonCollege[region] = workingNonCollegeAbs;

      // Calculate regional outputs
      const workingPop = workingCollegeAbs + workingNonCollegeAbs;
      const oldPop = newState.old;

      regionalPopulation[region] = newState.population;
      regionalYoung[region] = newState.young;
      regionalWorking[region] = workingPop;
      regionalOld[region] = oldPop;
      regionalDependency[region] = workingPop > 0 ? oldPop / workingPop : 0;
      regionalFertility[region] = tfr;

      // Aggregate
      totalPop += newState.population;
      totalWorking += workingPop;
      totalOld += oldPop;

      // Effective workers (college premium)
      const wagePremium = projectWagePremium(
        eduParams.wagePremium2025,
        eduParams.premiumTarget,
        eduParams.premiumDecay,
        yearIndex
      );
      const collegeWorkers = workingCollegeAbs;
      const nonCollegeWorkers = workingNonCollegeAbs;
      let regionEffective = nonCollegeWorkers + collegeWorkers * wagePremium;

      // =====================================================================
      // HEAT STRESS ON LABOR (Zhao et al. 2021)
      // Wet-bulb temperature reduces outdoor labor productivity. Linear ramp
      // from zero at threshold to total loss at threshold + scale.
      // At 35°C wet-bulb, outdoor work becomes lethal.
      //
      // Differentially applied: outdoor labor is overwhelmingly non-college
      // (construction, agriculture, mining, transport). College workers are
      // mostly indoor. outdoorFraction applies to non-college workers only.
      // =====================================================================
      const hs = params.heatStress[region];
      const regionalWetBulb = hs.baselineWetBulb + hs.warmingAmplification * temperature;
      const excess = Math.max(0, regionalWetBulb - params.heatStressThreshold);
      const outdoorProductivityLoss = Math.min(1, excess / params.heatStressScale);
      // Apply to non-college workers only (outdoor labor)
      const nonCollegeHeatLoss = hs.outdoorFraction * outdoorProductivityLoss;
      const adjustedNonCollege = nonCollegeWorkers * (1 - nonCollegeHeatLoss);
      regionEffective = adjustedNonCollege + collegeWorkers * wagePremium;
      // Report as fraction of total effective workers lost
      const effectiveWithout = nonCollegeWorkers + collegeWorkers * wagePremium;
      heatStressLoss[region] = effectiveWithout > 0
        ? 1 - regionEffective / effectiveWithout
        : 0;

      totalEffective += regionEffective;
      totalCollegeWorkers += collegeWorkers;
      regionalEffectiveWorkers[region] = regionEffective;
    }

    // Exogenous population scaling: preserve age structure, scale to target total
    if (params.exogenousPopulation && params.exogenousPopulation.length > 0) {
      const target = interpolateExogenousPop(year, params.exogenousPopulation);
      if (totalPop > 0) {
        const scale = target / totalPop;
        for (const region of REGIONS) {
          const rs = newRegions[region];
          rs.population *= scale;
          rs.young *= scale;
          rs.w1College *= scale;
          rs.w1NonCollege *= scale;
          rs.w2College *= scale;
          rs.w2NonCollege *= scale;
          rs.old *= scale;
          rs.oldCollege *= scale;
          rs.oldNonCollege *= scale;
          regionalPopulation[region] *= scale;
          regionalYoung[region] *= scale;
          regionalWorking[region] *= scale;
          regionalOld[region] *= scale;
          regionalEffectiveWorkers[region] *= scale;
          regionalWorkingCollege[region] *= scale;
          regionalWorkingNonCollege[region] *= scale;
          regionalWorkforceEntrants[region] *= scale;
          regionalWorkingMigrationCollege[region] *= scale;
          regionalWorkingMigrationNonCollege[region] *= scale;
        }
        totalPop *= scale;
        totalWorking *= scale;
        totalOld *= scale;
        totalEffective *= scale;
        totalCollegeWorkers *= scale;
      }
    }

    const globalCollegeShare = totalWorking > 0 ? totalCollegeWorkers / totalWorking : 0;

    return {
      state: { regions: newRegions },
      outputs: {
        population: totalPop,
        working: totalWorking,
        dependency: totalWorking > 0 ? totalOld / totalWorking : 0,
        effectiveWorkers: totalEffective,
        collegeShare: globalCollegeShare,
        heatStressLoss,
        regionalPopulation,
        regionalYoung,
        regionalWorking,
        regionalOld,
        regionalEffectiveWorkers,
        regionalDependency,
        regionalFertility,
        regionalLifeExpectancy,
        regionalWorkingCollege,
        regionalWorkingNonCollege,
        regionalWorkforceEntrants,
        regionalEntrantCollegeShare,
        regionalWorkingMigrationCollege,
        regionalWorkingMigrationNonCollege,
      },
    };
  },
});

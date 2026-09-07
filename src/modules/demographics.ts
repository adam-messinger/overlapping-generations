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
  /**
   * Share of the region's 2025 population in each five-year age group:
   * 0-4, 5-9, ... 95-99, 100+ (21 entries, summing to 1).
   */
  ageDistribution: number[];
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
      pop2025: 0.3464e9,   // UN WPP 2024 low variant, 2025
      fertility: 1.419,        // TFR 2025, WPP low variant
      fertilityFloor: 1.140,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.2000,
      lifeExpectancy: 79.6,     // UN WPP 2024, 2025
      // 2025 age structure, UN WPP 2024 low: 0-4, 5-9 ... 95-99, 100+
      ageDistribution: [
        0.05119, 0.05699, 0.06080, 0.06590, 0.06657, 0.06536, 0.06919,
        0.06959, 0.06701, 0.06193, 0.05919, 0.05980, 0.06217, 0.05790,
        0.04769, 0.03665, 0.02256, 0.01226, 0.00551, 0.00153, 0.00021,
      ],
      migrationRate: 0.00376, // WPP low mean net migration / population 2025-2100
    },
    'oecd-ex-us': {
      pop2025: 0.8058e9,   // UN WPP 2024 low variant, 2025
      fertility: 1.113,        // TFR 2025, WPP low variant
      fertilityFloor: 1.021,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.2000,
      lifeExpectancy: 82.6,     // UN WPP 2024, 2025
      // 2025 age structure, UN WPP 2024 low: 0-4, 5-9 ... 95-99, 100+
      ageDistribution: [
        0.04027, 0.04767, 0.05126, 0.05332, 0.05446, 0.05764, 0.06092,
        0.06363, 0.06619, 0.06823, 0.07139, 0.07027, 0.06702, 0.06080,
        0.05379, 0.04710, 0.03207, 0.02117, 0.00974, 0.00267, 0.00039,
      ],
      migrationRate: 0.00203, // WPP low mean net migration / population 2025-2100
    },
    china: {
      pop2025: 1.4440e9,   // UN WPP 2024 low variant, 2025
      fertility: 0.766,        // TFR 2025, WPP low variant (incl. HK/Macao/Taiwan)
      fertilityFloor: 0.740,   // WPP low has China rising slightly after 2050; the
      // module's monotone convergence takes the flat best fit instead
      fertilityDecay: 0.0400,
      lifeExpectancy: 78.5,     // UN WPP 2024, 2025
      // 2025 age structure, UN WPP 2024 low: 0-4, 5-9 ... 95-99, 100+
      ageDistribution: [
        0.03126, 0.05648, 0.06351, 0.05953, 0.05563, 0.05858, 0.06973,
        0.08567, 0.07276, 0.06574, 0.08133, 0.08245, 0.06661, 0.05005,
        0.04635, 0.02780, 0.01526, 0.00789, 0.00284, 0.00049, 0.00004,
      ],
      migrationRate: -0.00016, // WPP low mean net migration / population 2025-2100
    },
    india: {
      pop2025: 1.9869e9,   // UN WPP 2024 low variant, 2025
      fertility: 1.930,        // TFR 2025, WPP low variant
      fertilityFloor: 1.331,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.0658,
      lifeExpectancy: 72.1,     // UN WPP 2024, 2025
      // 2025 age structure, UN WPP 2024 low: 0-4, 5-9 ... 95-99, 100+
      ageDistribution: [
        0.08427, 0.08796, 0.09030, 0.09093, 0.08997, 0.08526, 0.07974,
        0.07407, 0.06670, 0.05682, 0.04908, 0.04150, 0.03455, 0.02732,
        0.01959, 0.01163, 0.00627, 0.00290, 0.00095, 0.00019, 0.00002,
      ],
      migrationRate: -0.00067, // WPP low mean net migration / population 2025-2100
    },
    latam: {
      pop2025: 0.6660e9,   // UN WPP 2024 low variant, 2025
      fertility: 1.573,        // TFR 2025, WPP low variant
      fertilityFloor: 1.158,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.1529,
      lifeExpectancy: 76.0,     // UN WPP 2024, 2025
      // 2025 age structure, UN WPP 2024 low: 0-4, 5-9 ... 95-99, 100+
      ageDistribution: [
        0.06664, 0.07447, 0.07801, 0.07854, 0.07924, 0.07947, 0.07773,
        0.07478, 0.07051, 0.06422, 0.05769, 0.05140, 0.04525, 0.03641,
        0.02740, 0.01872, 0.01123, 0.00563, 0.00208, 0.00051, 0.00007,
      ],
      migrationRate: -0.00042, // WPP low mean net migration / population 2025-2100
    },
    seasia: {
      pop2025: 0.7424e9,   // UN WPP 2024 low variant, 2025
      fertility: 1.708,        // TFR 2025, WPP low variant
      fertilityFloor: 1.222,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.1114,
      lifeExpectancy: 72.3,     // UN WPP 2024, 2025
      // 2025 age structure, UN WPP 2024 low: 0-4, 5-9 ... 95-99, 100+
      ageDistribution: [
        0.07008, 0.07905, 0.08388, 0.08086, 0.07769, 0.07744, 0.07761,
        0.07499, 0.07199, 0.06470, 0.05912, 0.05309, 0.04459, 0.03439,
        0.02309, 0.01421, 0.00780, 0.00379, 0.00130, 0.00028, 0.00004,
      ],
      migrationRate: -0.00015, // WPP low mean net migration / population 2025-2100
    },
    russia: {
      pop2025: 0.2950e9,   // UN WPP 2024 low variant, 2025
      fertility: 1.698,        // TFR 2025, WPP low variant
      fertilityFloor: 1.305,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.0870,
      lifeExpectancy: 73.6,     // UN WPP 2024, 2025
      // 2025 age structure, UN WPP 2024 low: 0-4, 5-9 ... 95-99, 100+
      ageDistribution: [
        0.06196, 0.07095, 0.07373, 0.06467, 0.05655, 0.05714, 0.06968,
        0.08391, 0.07642, 0.06732, 0.06055, 0.05480, 0.05819, 0.05288,
        0.03960, 0.02491, 0.01146, 0.01091, 0.00320, 0.00102, 0.00012,
      ],
      migrationRate: 0.00098, // WPP low mean net migration / population 2025-2100
    },
    mena: {
      pop2025: 0.6016e9,   // UN WPP 2024 low variant, 2025
      fertility: 2.131,        // TFR 2025, WPP low variant
      fertilityFloor: 1.294,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.0478,
      lifeExpectancy: 75.5,     // UN WPP 2024, 2025
      // 2025 age structure, UN WPP 2024 low: 0-4, 5-9 ... 95-99, 100+
      ageDistribution: [
        0.08639, 0.09346, 0.09412, 0.08449, 0.07821, 0.07876, 0.08036,
        0.08002, 0.07296, 0.06137, 0.05013, 0.04168, 0.03396, 0.02526,
        0.01855, 0.01117, 0.00574, 0.00249, 0.00074, 0.00013, 0.00001,
      ],
      migrationRate: -0.00033, // WPP low mean net migration / population 2025-2100
    },
    ssa: {
      pop2025: 1.3216e9,   // UN WPP 2024 low variant, 2025
      fertility: 3.900,        // TFR 2025, WPP low variant
      fertilityFloor: 1.453,   // floor/decay fitted to the WPP low TFR path to 2100
      fertilityDecay: 0.0392,
      lifeExpectancy: 63.0,     // UN WPP 2024, 2025
      // 2025 age structure, UN WPP 2024 low: 0-4, 5-9 ... 95-99, 100+
      ageDistribution: [
        0.14552, 0.13403, 0.12228, 0.10928, 0.09369, 0.07915, 0.06725,
        0.05700, 0.04764, 0.03856, 0.03046, 0.02402, 0.01860, 0.01368,
        0.00920, 0.00543, 0.00272, 0.00108, 0.00031, 0.00006, 0.00001,
      ],
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
  // Absolute headcount in each five-year age group, and how many of them hold
  // a tertiary qualification. Both are length N_AGE_GROUPS; the education
  // arrays are zero below the workforce entry group.
  ages: number[];
  college: number[];
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
// AGE STRUCTURE, FERTILITY AND MORTALITY
//
// The population is carried as five-year age groups (0-4 ... 95-99 plus an
// open-ended 100+), so a cohort moves through the structure at 1/5 a year
// rather than draining at a flat rate across a 20- or 45-year band. The coarse
// versions of this module could not track a non-uniform age pyramid: they bled
// people out of the childbearing ages a decade early, which cost births, which
// compounded. Calibrated to the UN WPP 2024 low-fertility variant aggregated to
// these nine regions, 2025-2100 (scripts/repro/calibrate_demographics.py and
// scripts/repro/demog_mirror3.py).
// =============================================================================
const N_AGE_GROUPS = 21;      // 0-4 ... 95-99, 100+
const AGE_GROUP_SPAN = 5;
const WORK_FIRST = 4;         // 20-24
const WORK_LAST = 12;         // 60-64
const OLD_FIRST = 13;         // 65-69
const FERTILE_FIRST = 3;      // 15-19
const FERTILE_LAST = 9;       // 45-49

/**
 * Age-specific fertility as a share of the TFR, 15-19 through 45-49. The shape
 * is the standard world ASFR distribution; the scale is fitted so the formula
 * reproduces WPP low births (R2 0.999, world drift within 2% across the century).
 */
const ASFR_SHARE = [0.07, 0.2, 0.26, 0.24, 0.15, 0.07, 0.01];
const ASFR_SCALE = 0.9971;

/**
 * Annual death rate by age group at a life expectancy of 75, and the rate at
 * which each group's mortality falls as life expectancy rises. Fitted to WPP
 * low five-year cohort survival on world totals (regional ratios confound net
 * migration with death), shifted to group midpoints -- a cohort survival ratio
 * reflects mortality centred half a group older than the group it starts in,
 * which at old ages is a ~20% level error -- then level-scaled so total deaths
 * match WPP low within 3%.
 */
const MORTALITY = [0.0022655, 0.0011493, 0.0007347, 0.0001183, 7.48e-05, 0.0006757, 0.0019803, 0.0026052, 0.0033682, 0.0043062, 0.0058475, 0.0083135, 0.0120498, 0.0179335, 0.0272456, 0.042497, 0.0680744, 0.1097959, 0.1743085, 0.2577304, 0.4198243];
const MORTALITY_LE_DECAY = [0.15, 0.11273, 0.10938, 0.07191, 0.07526, 0.09996, 0.03602, 0.01856, 0.02285, 0.03898, 0.0513, 0.0577, 0.06094, 0.09305, 0.09332, 0.09271, 0.09185, 0.08835, 0.0769, 0.06281, 0.08253];
const MORTALITY_REFERENCE_LE = 75;

/** Working-age arrivals by age group, 20-24 through 60-64. */
const MIGRANT_AGE_WEIGHTS = [0.26, 0.26, 0.19, 0.12, 0.08, 0.05, 0.03, 0.01, 0.0];

/** Relative mortality of college vs non-college within an age group. */
const COLLEGE_MORTALITY_TILT = 0.02;


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
    // Entrants are the 15-19 group aging into 20-24: a fifth of it each year.
    entrants: state.ages[FERTILE_FIRST] / AGE_GROUP_SPAN,
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
 * Births from the TFR and the women in each five-year childbearing group.
 * TFR = 5 * sum(ASFR_g), so births = sum_g (TFR * share_g / 5) * women_g, and
 * women are taken as half of each group.
 */
function birthsFromTFR(tfr: number, ages: number[]): number {
  let exposure = 0;
  for (let g = FERTILE_FIRST; g <= FERTILE_LAST; g++) {
    exposure += ASFR_SHARE[g - FERTILE_FIRST] * ages[g];
  }
  return tfr * 0.1 * ASFR_SCALE * exposure;
}

/** Annual death rate for an age group at a given life expectancy. */
function mortalityRate(group: number, lifeExpectancy: number): number {
  return MORTALITY[group]
    * Math.exp(-MORTALITY_LE_DECAY[group] * (lifeExpectancy - MORTALITY_REFERENCE_LE));
}

function ageCohorts(
  state: RegionState,
  tfr: number,
  eduParams: RegionEduParams,
  lifeExpectancyGrowth: number,
  flows: CohortFlows
): RegionState {
  const le = state.lifeExpectancy;
  const births = birthsFromTFR(tfr, state.ages);

  const ages = new Array<number>(N_AGE_GROUPS).fill(0);
  const college = new Array<number>(N_AGE_GROUPS).fill(0);

  for (let g = 0; g < N_AGE_GROUPS; g++) {
    const n = state.ages[g];
    const c = state.college[g];
    const m = mortalityRate(g, le);

    // Deaths, split so college mortality is lower while the group total is
    // exactly n * m -- the schedule's calibration is preserved.
    const share = n > 0 ? c / n : 0;
    const rc = Math.exp(-COLLEGE_MORTALITY_TILT * eduParams.lifeBonusCollege);
    const rn = Math.exp(COLLEGE_MORTALITY_TILT * eduParams.lifePenaltyNonCollege);
    const z = share * rc + (1 - share) * rn;
    const deaths = n * m;
    const collegeDeaths = z > 0 ? deaths * (share * rc) / z : 0;

    // Aging: a fifth of each group moves up, except the open-ended top group.
    const leaving = g === N_AGE_GROUPS - 1 ? 0 : n / AGE_GROUP_SPAN;
    const leavingCollege = n > 0 ? leaving * share : 0;

    ages[g] += Math.max(0, n - leaving - deaths);
    college[g] += Math.max(0, c - leavingCollege - collegeDeaths);
    if (g < N_AGE_GROUPS - 1) {
      ages[g + 1] += leaving;
      // Entrants pick up their education on entering the workforce group.
      college[g + 1] += g + 1 === WORK_FIRST ? leaving * flows.enrollRate : leavingCollege;
    }
  }
  ages[0] += births;

  // Migration: 80% working-age (70% of them college) spread over the working
  // groups, 15% young pro rata, 5% old pro rata.
  const mig = flows.migration;
  for (let j = 0; j < MIGRANT_AGE_WEIGHTS.length; j++) {
    const n = mig * WORKING_MIGRANT_SHARE * MIGRANT_AGE_WEIGHTS[j];
    ages[WORK_FIRST + j] += n;
    college[WORK_FIRST + j] += n * MIGRANT_COLLEGE_SHARE;
  }
  let youngTotal = 0;
  for (let g = 0; g < WORK_FIRST; g++) youngTotal += ages[g];
  if (youngTotal > 0) {
    for (let g = 0; g < WORK_FIRST; g++) {
      ages[g] += mig * YOUNG_MIGRANT_SHARE * (ages[g] / youngTotal);
    }
  }
  let oldTotal = 0;
  for (let g = OLD_FIRST; g < N_AGE_GROUPS; g++) oldTotal += ages[g];
  if (oldTotal > 0) {
    for (let g = OLD_FIRST; g < N_AGE_GROUPS; g++) {
      const w = ages[g] / oldTotal;
      ages[g] += mig * OLD_MIGRANT_SHARE * w;
      college[g] += mig * OLD_MIGRANT_SHARE * w * 0.5;
    }
  }

  for (let g = 0; g < N_AGE_GROUPS; g++) {
    ages[g] = Math.max(0, ages[g]);
    college[g] = Math.min(Math.max(0, college[g]), ages[g]);
  }

  let population = 0;
  for (const n of ages) population += n;

  return {
    population,
    ages,
    college,
    lifeExpectancy: le + lifeExpectancyGrowth,
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

      if (r.ageDistribution.length !== N_AGE_GROUPS) {
        errors.push(
          `${region}.ageDistribution has ${r.ageDistribution.length} groups, expected ${N_AGE_GROUPS}`);
      }
      const cohortSum = r.ageDistribution.reduce((a, b) => a + b, 0);
      if (Math.abs(cohortSum - 1.0) > 0.01) {
        errors.push(`${region} age shares sum to ${cohortSum}, should be 1.0`);
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
      const ages = r.ageDistribution.map((share) => share * pop);
      // College share by age: attainment has risen with each cohort, so the
      // youngest workers carry more of it and the retired carry least.
      const college = ages.map((n, g) => {
        if (g < WORK_FIRST) return 0;
        const tilt = g >= OLD_FIRST ? 0.5 : 1.15 - 0.05 * (g - WORK_FIRST);
        return n * Math.min(1, Math.max(0, e.collegeShare2025 * tilt));
      });

      regions[region] = {
        population: pop,
        ages,
        college,
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

      let workingCollegeAbs = 0;
      let workingAbs = 0;
      let youngAbs = 0;
      let oldAbs = 0;
      for (let g = 0; g < N_AGE_GROUPS; g++) {
        if (g < WORK_FIRST) youngAbs += newState.ages[g];
        else if (g <= WORK_LAST) {
          workingAbs += newState.ages[g];
          workingCollegeAbs += newState.college[g];
        } else oldAbs += newState.ages[g];
      }
      const workingNonCollegeAbs = workingAbs - workingCollegeAbs;
      regionalWorkingCollege[region] = workingCollegeAbs;
      regionalWorkingNonCollege[region] = workingNonCollegeAbs;

      // Calculate regional outputs
      const workingPop = workingAbs;
      const oldPop = oldAbs;

      regionalPopulation[region] = newState.population;
      regionalYoung[region] = youngAbs;
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
          for (let g = 0; g < N_AGE_GROUPS; g++) {
            rs.ages[g] *= scale;
            rs.college[g] *= scale;
          }
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

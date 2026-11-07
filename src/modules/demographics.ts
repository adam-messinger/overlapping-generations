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
  working: number;           // 20-64 share
  old: number;               // 65+ share
  // Age structure WITHIN the cohorts (UN WPP 2024, 2025): 5-year bands.
  // The cohorts age band by band, so entrants are the 15-19 band turning 20
  // and retirees the 60-64 band turning 65 - not 1/20 and 1/45 of the cohort,
  // which assumed ages spread evenly and retired ~2x too many people a year.
  youngBandShares: number[];   // 0-4, 5-9, 10-14, 15-19 (sum 1)
  workingBandShares: number[]; // 20-24 ... 60-64, nine bands (sum 1)
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
      pop2025: 0.34e9,         // Census Bureau Vintage 2024: 340M Jan 2025
      fertility: 1.62,         // CDC NVSS 2023 TFR 1.62
      fertilityFloor: 1.14,  // Fit to UN WPP 2024 Low variant 2030-2100 (rmse 0.011; Low 1.14 in 2050, 1.15 in 2100): Fernandez-Villaverde & Norrick (2026) read the Low variant as the realistic path
      fertilityDecay: 0.213,  // Low-variant fit speed (0.304) x 0.7: the world path then peaks at ~9.0B in 2054, Fernandez-Villaverde & Norrick's ~9B circa 2056 (the Low variant's immediate -0.5 shift peaks in 2052)
      lifeExpectancy: 79,      // CDC NVSS 2023: 78.4, recovering post-COVID
      young: 0.237,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.24
      working: 0.579,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.58
      old: 0.184,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.18
      youngBandShares: [0.2259, 0.2402, 0.2562, 0.2777],  // UN WPP 2024, 2025 (scripts/wpp-age-structure.py)
      workingBandShares: [0.1146, 0.1125, 0.1191, 0.1198, 0.1154, 0.1066, 0.1019, 0.1030, 0.1070],
      migrationRate: 0.0035,   // UN WPP 2024 / CBO 2025: net ~+1.2M/yr on 340M (relative share of the emigration budget; the closed-world rescale books ~1.6M/yr, see docs/HUMAN_CAPITAL_TRAJECTORY.md)
    },
    'oecd-ex-us': {
      pop2025: 0.80e9,         // 1.14B model-OECD less the US
      fertility: 1.5,          // Weighted: EU 1.4, Japan 1.2, Korea 0.7, Mexico 1.8, Turkey 1.5
      fertilityFloor: 1.02,  // Fit to UN WPP 2024 Low variant 2030-2100 (rmse 0.044; Low 0.99 in 2050, 1.07 in 2100): Fernandez-Villaverde & Norrick (2026) read the Low variant as the realistic path
      fertilityDecay: 0.279,  // Low-variant fit speed (0.399) x 0.7: the world path then peaks at ~9.0B in 2054, Fernandez-Villaverde & Norrick's ~9B circa 2056 (the Low variant's immediate -0.5 shift peaks in 2052)
      lifeExpectancy: 82,      // Japan 84.7, EU 81.5, Korea 83.5 (UN WPP 2024)
      young: 0.194,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.18
      working: 0.579,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.58
      old: 0.227,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.24
      youngBandShares: [0.2182, 0.2448, 0.2632, 0.2738],  // UN WPP 2024, 2025 (scripts/wpp-age-structure.py)
      workingBandShares: [0.0939, 0.0994, 0.1051, 0.1098, 0.1142, 0.1177, 0.1231, 0.1212, 0.1156],
      migrationRate: 0.004,    // ~+3M/yr on 800M (Germany, Canada, UK, Australia, Spain the main receivers; the closed-world rescale books ~4.3M/yr)
    },
    china: {
      pop2025: 1.41e9,
      fertility: 1.0,          // TFR 2023 (JFV: ultra-low, no recovery despite pro-natalist spending)
      fertilityFloor: 0.74,  // Fit to UN WPP 2024 Low variant 2030-2100 (rmse 0.076; Low 0.68 in 2050, 0.84 in 2100): Fernandez-Villaverde & Norrick (2026) read the Low variant as the realistic path
      fertilityDecay: 0.279,  // Low-variant fit speed (0.399) x 0.7: the world path then peaks at ~9.0B in 2054, Fernandez-Villaverde & Norrick's ~9B circa 2056 (the Low variant's immediate -0.5 shift peaks in 2052)
      lifeExpectancy: 78,
      young: 0.213,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.17
      working: 0.637,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.66
      old: 0.150,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.17
      youngBandShares: [0.1574, 0.2651, 0.2981, 0.2794],  // UN WPP 2024, 2025 (scripts/wpp-age-structure.py)
      workingBandShares: [0.0871, 0.0917, 0.1092, 0.1342, 0.1140, 0.1030, 0.1274, 0.1291, 0.1043],
      migrationRate: -0.0002, // UN WPP 2024: net -0.2 to -0.3M/yr on 1.41B (students and skilled workers to the OECD)
    },
    india: {
      pop2025: 1.97e9,
      fertility: 2.1,          // India crossed below replacement 2020; Pakistan/Bangladesh still above
      fertilityFloor: 1.35,  // Fit to UN WPP 2024 Low variant 2030-2100 (rmse 0.037; Low 1.47 in 2050, 1.29 in 2100): Fernandez-Villaverde & Norrick (2026) read the Low variant as the realistic path
      fertilityDecay: 0.066,  // Low-variant fit speed (0.094) x 0.7: the world path then peaks at ~9.0B in 2054, Fernandez-Villaverde & Norrick's ~9B circa 2056 (the Low variant's immediate -0.5 shift peaks in 2052)
      lifeExpectancy: 71,
      young: 0.355,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.32
      working: 0.576,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.59
      old: 0.069,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.09
      youngBandShares: [0.2448, 0.2468, 0.2533, 0.2551],  // UN WPP 2024, 2025 (scripts/wpp-age-structure.py)
      workingBandShares: [0.1557, 0.1476, 0.1380, 0.1282, 0.1155, 0.0984, 0.0850, 0.0718, 0.0598],
      migrationRate: -0.001,
    },
    latam: {
      pop2025: 0.67e9,
      fertility: 1.8,          // 76% of countries below replacement (ECLAC 2024)
      fertilityFloor: 1.16,  // Fit to UN WPP 2024 Low variant 2030-2100 (rmse 0.012; Low 1.17 in 2050, 1.15 in 2100): Fernandez-Villaverde & Norrick (2026) read the Low variant as the realistic path
      fertilityDecay: 0.152,  // Low-variant fit speed (0.217) x 0.7: the world path then peaks at ~9.0B in 2054, Fernandez-Villaverde & Norrick's ~9B circa 2056 (the Low variant's immediate -0.5 shift peaks in 2052)
      lifeExpectancy: 76,
      young: 0.300,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.27
      working: 0.598,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.63
      old: 0.102,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.10
      youngBandShares: [0.2313, 0.2478, 0.2596, 0.2613],  // UN WPP 2024, 2025 (scripts/wpp-age-structure.py)
      workingBandShares: [0.1320, 0.1324, 0.1295, 0.1246, 0.1175, 0.1070, 0.0961, 0.0856, 0.0754],
      migrationRate: -0.002,
    },
    seasia: {
      pop2025: 0.70e9,
      fertility: 2.1,
      fertilityFloor: 1.23,  // Fit to UN WPP 2024 Low variant 2030-2100 (rmse 0.027; Low 1.27 in 2050, 1.20 in 2100): Fernandez-Villaverde & Norrick (2026) read the Low variant as the realistic path
      fertilityDecay: 0.136,  // Low-variant fit speed (0.194) x 0.7: the world path then peaks at ~9.0B in 2054, Fernandez-Villaverde & Norrick's ~9B circa 2056 (the Low variant's immediate -0.5 shift peaks in 2052)
      lifeExpectancy: 73,
      young: 0.316,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.28
      working: 0.599,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.63
      old: 0.085,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.09
      youngBandShares: [0.2301, 0.2496, 0.2649, 0.2554],  // UN WPP 2024, 2025 (scripts/wpp-age-structure.py)
      workingBandShares: [0.1292, 0.1288, 0.1291, 0.1247, 0.1197, 0.1076, 0.0983, 0.0883, 0.0742],
      migrationRate: -0.002,
    },
    russia: {
      pop2025: 0.29e9,
      fertility: 1.6,          // Russia 1.5; Central Asian states (Uzbekistan 2.8, Tajikistan 3.6) pull up
      fertilityFloor: 1.29,  // Fit to UN WPP 2024 Low variant 2030-2100 (rmse 0.029; Low 1.37 in 2050, 1.25 in 2100): Fernandez-Villaverde & Norrick (2026) read the Low variant as the realistic path
      fertilityDecay: 0.040,  // Low-variant fit speed (0.057) x 0.7: the world path then peaks at ~9.0B in 2054, Fernandez-Villaverde & Norrick's ~9B circa 2056 (the Low variant's immediate -0.5 shift peaks in 2052)
      lifeExpectancy: 73,
      young: 0.273,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.22
      working: 0.583,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.62
      old: 0.144,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.16
      youngBandShares: [0.2350, 0.2592, 0.2694, 0.2363],  // UN WPP 2024, 2025 (scripts/wpp-age-structure.py)
      workingBandShares: [0.0967, 0.0978, 0.1192, 0.1435, 0.1307, 0.1152, 0.1036, 0.0938, 0.0995],
      migrationRate: -0.001,
    },
    mena: {
      pop2025: 0.60e9,
      fertility: 2.5,          // Bifurcated: Turkey 1.5/Iran 1.45 vs Egypt 3.4/Iraq 3.5/Yemen 3.8
      fertilityFloor: 1.41,  // Fit to UN WPP 2024 Low variant 2030-2100 (rmse 0.053; Low 1.66 in 2050, 1.34 in 2100): Fernandez-Villaverde & Norrick (2026) read the Low variant as the realistic path
      fertilityDecay: 0.047,  // Low-variant fit speed (0.067) x 0.7: the world path then peaks at ~9.0B in 2054, Fernandez-Villaverde & Norrick's ~9B circa 2056 (the Low variant's immediate -0.5 shift peaks in 2052)
      lifeExpectancy: 74,
      young: 0.372,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.33
      working: 0.566,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.59
      old: 0.062,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.08
      youngBandShares: [0.2519, 0.2593, 0.2575, 0.2314],  // UN WPP 2024, 2025 (scripts/wpp-age-structure.py)
      workingBandShares: [0.1399, 0.1392, 0.1400, 0.1374, 0.1246, 0.1045, 0.0855, 0.0711, 0.0579],
      migrationRate: 0.001,
    },
    ssa: {
      pop2025: 1.38e9,
      fertility: 4.3,          // UN WPP 2024: TFR 4.34, JFV says "faster convergence than anticipated"
      fertilityFloor: 1.58,  // Fit to UN WPP 2024 Low variant 2030-2100 (rmse 0.078; Low 2.37 in 2050, 1.54 in 2100): Fernandez-Villaverde & Norrick (2026) read the Low variant as the realistic path
      fertilityDecay: 0.036,  // Low-variant fit speed (0.052) x 0.7: the world path then peaks at ~9.0B in 2054, Fernandez-Villaverde & Norrick's ~9B circa 2056 (the Low variant's immediate -0.5 shift peaks in 2052)
      lifeExpectancy: 62,
      young: 0.513,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.47
      working: 0.455,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.48
      old: 0.032,       // UN WPP 2024, 2025 estimate (scripts/wpp-age-structure.py); was 0.05
      youngBandShares: [0.2883, 0.2607, 0.2382, 0.2128],  // UN WPP 2024, 2025 (scripts/wpp-age-structure.py)
      workingBandShares: [0.2053, 0.1731, 0.1472, 0.1251, 0.1046, 0.0848, 0.0668, 0.0526, 0.0406],
      migrationRate: -0.001,
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
  lifeExpectancyGrowth: 0.1,

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
  // Absolute cohort counts
  young: number;
  working: number;
  old: number;
  // 5-year age bands inside the young and working cohorts (absolute counts)
  youngBands: number[];   // 0-4 ... 15-19
  workingBands: number[]; // 20-24 ... 60-64
  // Education splits (absolute counts)
  workingCollege: number;
  workingNonCollege: number;
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
/** Annual mortality inside the young (0-19) and working (20-64) cohorts (stylized, unchanged by the band split). */
const YOUNG_MORTALITY = 0.001;
const WORKING_MORTALITY = 0.003;
const WORKING_MIGRANT_SHARE = 0.8;
const MIGRANT_COLLEGE_SHARE = 0.70;
const YOUNG_MIGRANT_SHARE = 0.15;
const OLD_MIGRANT_SHARE = 0.05;

/**
 * The flows a region's cohorts generate this year: entrants aging out of the
 * young cohort, their college split, and net migration by cohort. One source
 * for ageCohorts and for the reported outputs, so the two cannot drift.
 */
interface CohortFlows {
  entrants: number;               // the 15-19 band turning 20 this year
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
    // The 15-19 band turning 20 (a fifth of it each year)
    entrants: state.youngBands[state.youngBands.length - 1] / BAND_YEARS,
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

/** Five-year band width: one band ages into the next over five years. */
const BAND_YEARS = 5;
/** Index of the bands covering ages 20-49 inside the working cohort. */
const WORKING_CHILDBEARING_BANDS = 6;

/**
 * Births from TFR and the women actually of childbearing age, read off the
 * bands: half of the 15-19 band and of the six working bands 20-49. TFR is
 * the sum of age-specific rates over the 35-year 15-49 window, so a flat
 * schedule gives births = TFR x women(15-49) / 35. (Replaces fixed
 * 0.25/0.65 cohort fractions, which ignored the age structure.)
 */
function birthsFromTFR(tfr: number, youngBands: number[], workingBands: number[]): number {
  let persons15to49 = youngBands[youngBands.length - 1];
  for (let i = 0; i < WORKING_CHILDBEARING_BANDS; i++) persons15to49 += workingBands[i];
  return (tfr * persons15to49 * 0.5) / 35;
}

/** Normalize band shares to sum to 1 (guards hand-edited params). */
function normalizedShares(shares: number[]): number[] {
  const sum = shares.reduce((a, b) => a + b, 0);
  return sum > 0 ? shares.map(x => x / sum) : shares.map(() => 1 / shares.length);
}

/**
 * Age a cohort's bands by one year: a fifth of each band moves up, the top
 * band's fifth leaves (returned as `out`), `inflow` enters the bottom band,
 * deaths at `mortality` and `migrants` (spread in proportion to band size)
 * are applied. Returns the new bands and the outflow from the top band.
 */
function ageBands(
  bands: number[],
  inflow: number,
  mortality: number,
  migrants: number,
): { bands: number[]; out: number } {
  const total = bands.reduce((a, b) => a + b, 0);
  const next = bands.map(b => b * (1 - 1 / BAND_YEARS - mortality));
  for (let i = 1; i < bands.length; i++) next[i] += bands[i - 1] / BAND_YEARS;
  next[0] += inflow;
  for (let i = 0; i < bands.length; i++) {
    next[i] = Math.max(0, next[i] + (total > 0 ? migrants * bands[i] / total : migrants / bands.length));
  }
  return { bands: next, out: bands[bands.length - 1] / BAND_YEARS };
}

function ageCohorts(
  state: RegionState,
  tfr: number,
  eduParams: RegionEduParams,
  lifeExpectancyGrowth: number,
  flows: CohortFlows
): RegionState {
  // Births from the women actually aged 15-49 (deaths are per-cohort below)
  const births = birthsFromTFR(tfr, state.youngBands, state.workingBands);

  // Aging transitions through 5-year bands: entrants are the 15-19 band
  // turning 20, retirees the 60-64 band turning 65
  const agingOutOfYoung = flows.entrants;
  const agingOutOfWorking = state.workingBands[state.workingBands.length - 1] / BAND_YEARS;

  // Deaths by cohort (proportional to mortality rates)
  const workingDeaths = state.working * WORKING_MORTALITY;

  // === EDUCATION TRACKING ===
  // Split new workers by enrollment rate (determined at age 18-22)
  const newCollegeWorkers = agingOutOfYoung * flows.enrollRate;
  const newNonCollegeWorkers = agingOutOfYoung * (1 - flows.enrollRate);

  // Calculate aging out of working by education
  const totalWorking = state.workingCollege + state.workingNonCollege;
  const collegeShareOfWorking = totalWorking > 0 ? state.workingCollege / totalWorking : 0.5;
  const agingOutCollegeWorkers = agingOutOfWorking * collegeShareOfWorking;
  const agingOutNonCollegeWorkers = agingOutOfWorking * (1 - collegeShareOfWorking);

  // Working deaths split by education share
  const workingDeathsCollege = workingDeaths * collegeShareOfWorking;
  const workingDeathsNonCollege = workingDeaths * (1 - collegeShareOfWorking);

  // Old cohort deaths with differential mortality
  const remainingLEat65Base = Math.max(15, state.lifeExpectancy - 55);
  const remainingLEat65College = remainingLEat65Base + eduParams.lifeBonusCollege * 0.5;
  const remainingLEat65NonCollege = Math.max(10, remainingLEat65Base - eduParams.lifePenaltyNonCollege * 0.5);

  const oldMortalityCollege = 1 / remainingLEat65College;
  const oldMortalityNonCollege = 1 / remainingLEat65NonCollege;

  const oldDeathsCollege = Math.min(state.oldCollege * oldMortalityCollege, state.oldCollege);
  const oldDeathsNonCollege = Math.min(state.oldNonCollege * oldMortalityNonCollege, state.oldNonCollege);

  // Update education cohorts
  let newWorkingCollege = Math.max(0, state.workingCollege + newCollegeWorkers - agingOutCollegeWorkers - workingDeathsCollege);
  let newWorkingNonCollege = Math.max(0, state.workingNonCollege + newNonCollegeWorkers - agingOutNonCollegeWorkers - workingDeathsNonCollege);
  let newOldCollege = Math.max(0, state.oldCollege + agingOutCollegeWorkers - oldDeathsCollege);
  let newOldNonCollege = Math.max(0, state.oldNonCollege + agingOutNonCollegeWorkers - oldDeathsNonCollege);

  // === STANDARD COHORT UPDATES ===
  // Band ageing, with deaths at the cohort rates above and this year's
  // migrants spread across bands in proportion to their size
  const youngAged = ageBands(state.youngBands, births, YOUNG_MORTALITY, flows.migration * YOUNG_MIGRANT_SHARE);
  const workingAged = ageBands(
    state.workingBands, agingOutOfYoung, WORKING_MORTALITY,
    flows.workingMigrationCollege + flows.workingMigrationNonCollege,
  );
  let newYoung = youngAged.bands.reduce((a, b) => a + b, 0);
  let newWorking = newWorkingCollege + newWorkingNonCollege;
  let newOld = newOldCollege + newOldNonCollege;

  // Apply migration (primarily to working-age, 70% college for migrants).
  // Rate is pre-scaled by the caller so global net migration sums to zero.
  newWorkingCollege += flows.workingMigrationCollege;
  newWorkingNonCollege += flows.workingMigrationNonCollege;
  newWorking = newWorkingCollege + newWorkingNonCollege;
  newOld += flows.migration * OLD_MIGRANT_SHARE;
  // The education ledger and the bands book the same flows; rescale the
  // bands onto the ledger total so clamping cannot let them drift apart.
  const bandWorking = workingAged.bands.reduce((a, b) => a + b, 0);
  const workingBands = bandWorking > 0
    ? workingAged.bands.map(b => b * newWorking / bandWorking)
    : workingAged.bands;
  newOldCollege += flows.migration * OLD_MIGRANT_SHARE * 0.5;
  newOldNonCollege += flows.migration * OLD_MIGRANT_SHARE * 0.5;

  const newPop = newYoung + newWorking + newOld;

  return {
    population: newPop,
    young: newYoung,
    working: newWorking,
    old: newOld,
    youngBands: youngAged.bands,
    workingBands,
    workingCollege: newWorkingCollege,
    workingNonCollege: newWorkingNonCollege,
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
          range: { min: 0.8, max: 2.1, default: 1.14 },
          tier: 1 as const,
        },
      },
      'oecd-ex-us': {
        fertilityFloor: {
          paramName: 'oecdExUsFertilityFloor',
          description: 'Long-run fertility floor for the OECD ex-US region. 2.1 = replacement level.',
          unit: 'children/woman',
          range: { min: 0.8, max: 2.1, default: 1.02 },
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

      if (!Array.isArray(r.youngBandShares) || r.youngBandShares.length !== 4 ||
          r.youngBandShares.some(x => !Number.isFinite(x) || x < 0)) {
        errors.push(`${region}.youngBandShares must be 4 non-negative shares (0-4 ... 15-19)`);
      }
      if (!Array.isArray(r.workingBandShares) || r.workingBandShares.length !== 9 ||
          r.workingBandShares.some(x => !Number.isFinite(x) || x < 0)) {
        errors.push(`${region}.workingBandShares must be 9 non-negative shares (20-24 ... 60-64)`);
      }

      const cohortSum = r.young + r.working + r.old;
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
      const workingAbs = r.working * pop;
      const oldAbs = r.old * pop;

      // Education splits
      const workingCollege = workingAbs * e.collegeShare2025;
      const workingNonCollege = workingAbs * (1 - e.collegeShare2025);
      // Elderly college share starts lower (they got degrees decades ago)
      const oldCollege = oldAbs * e.collegeShare2025 * 0.5;
      const oldNonCollege = oldAbs - oldCollege;

      regions[region] = {
        population: pop,
        young: youngAbs,
        working: workingAbs,
        old: oldAbs,
        youngBands: normalizedShares(r.youngBandShares).map(x => x * youngAbs),
        workingBands: normalizedShares(r.workingBandShares).map(x => x * workingAbs),
        workingCollege,
        workingNonCollege,
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

      regionalWorkingCollege[region] = newState.workingCollege;
      regionalWorkingNonCollege[region] = newState.workingNonCollege;

      // Calculate regional outputs
      const workingPop = newState.working;
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
      const collegeWorkers = newState.workingCollege;
      const nonCollegeWorkers = newState.workingNonCollege;
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
          rs.working *= scale;
          rs.youngBands = rs.youngBands.map(b => b * scale);
          rs.workingBands = rs.workingBands.map(b => b * scale);
          rs.old *= scale;
          rs.workingCollege *= scale;
          rs.workingNonCollege *= scale;
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

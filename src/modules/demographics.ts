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
  name: string;
  pop2025: number;           // Initial population
  fertility: number;         // TFR in 2025
  fertilityFloor: number;    // Long-term convergence target
  fertilityDecay: number;    // Annual convergence rate
  lifeExpectancy: number;    // Years
  young: number;             // 0-19 share
  working: number;           // 20-64 share
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
  // aggregated to this model's 8 groups); fertility floors/decay follow
  // Fernández-Villaverde's low-fertility convergence argument (see
  // docs/REFERENCES.md). migrationRate is the net annual rate as a fraction
  // of regional population, calibrated to UN WPP 2015-2023 net migration
  // averages (OECD ~+4-5M/yr); inflows are rescaled at runtime so global
  // net migration is zero.
  regions: {
    oecd: {
      name: 'OECD',
      pop2025: 1.14e9,
      fertility: 1.55,
      fertilityFloor: 1.3,
      fertilityDecay: 0.01,
      lifeExpectancy: 81,
      young: 0.20,
      working: 0.58,
      old: 0.22,
      migrationRate: 0.004,
    },
    china: {
      name: 'China',
      pop2025: 1.41e9,
      fertility: 1.0,          // TFR 2023 (JFV: ultra-low, no recovery despite pro-natalist spending)
      fertilityFloor: 0.8,     // South Korea at 0.7
      fertilityDecay: 0.05,    // Fast convergence (JFV: steepest decline)
      lifeExpectancy: 78,
      young: 0.17,
      working: 0.66,
      old: 0.17,
      migrationRate: 0.0,
    },
    india: {
      name: 'India + South Asia',
      pop2025: 1.97e9,
      fertility: 2.1,          // India crossed below replacement 2020; Pakistan/Bangladesh still above
      fertilityFloor: 1.4,
      fertilityDecay: 0.03,
      lifeExpectancy: 71,
      young: 0.32,
      working: 0.59,
      old: 0.09,
      migrationRate: -0.001,
    },
    latam: {
      name: 'Latin America',
      pop2025: 0.67e9,
      fertility: 1.8,          // 76% of countries below replacement (ECLAC 2024)
      fertilityFloor: 1.4,
      fertilityDecay: 0.02,
      lifeExpectancy: 76,
      young: 0.27,
      working: 0.63,
      old: 0.10,
      migrationRate: -0.002,
    },
    seasia: {
      name: 'SE Asia + Pacific',
      pop2025: 0.70e9,
      fertility: 2.1,
      fertilityFloor: 1.4,
      fertilityDecay: 0.025,
      lifeExpectancy: 73,
      young: 0.28,
      working: 0.63,
      old: 0.09,
      migrationRate: -0.002,
    },
    russia: {
      name: 'Russia + CIS',
      pop2025: 0.29e9,
      fertility: 1.6,          // Russia 1.5; Central Asian states (Uzbekistan 2.8, Tajikistan 3.6) pull up
      fertilityFloor: 1.3,
      fertilityDecay: 0.02,
      lifeExpectancy: 73,
      young: 0.22,
      working: 0.62,
      old: 0.16,
      migrationRate: -0.001,
    },
    mena: {
      name: 'MENA',
      pop2025: 0.60e9,
      fertility: 2.5,          // Bifurcated: Turkey 1.5/Iran 1.45 vs Egypt 3.4/Iraq 3.5/Yemen 3.8
      fertilityFloor: 1.5,
      fertilityDecay: 0.025,
      lifeExpectancy: 74,
      young: 0.33,
      working: 0.59,
      old: 0.08,
      migrationRate: 0.001,
    },
    ssa: {
      name: 'Sub-Saharan Africa',
      pop2025: 1.38e9,
      fertility: 4.3,          // UN WPP 2024: TFR 4.34, JFV says "faster convergence than anticipated"
      fertilityFloor: 1.8,
      fertilityDecay: 0.02,
      lifeExpectancy: 62,
      young: 0.47,
      working: 0.48,
      old: 0.05,
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
    oecd: {
      enrollmentRate2025: 0.75,
      enrollmentTarget: 0.80,
      enrollmentGrowth: 0.010,
      collegeShare2025: 0.40,
      wagePremium2025: 1.5,
      premiumTarget: 1.4,
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
    oecd:   { baselineWetBulb: 24, warmingAmplification: 0.8, outdoorFraction: 0.15 },
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

/** Share of net migrants who are working-age, and the college share among them. */
export const WORKING_MIGRANT_SHARE = 0.8;
export const MIGRANT_COLLEGE_SHARE = 0.70;

function birthRateFromTFR(tfr: number, workingShare: number, youngShare: number): number {
  // Women 15-49 are roughly split between young (15-19) and working (20-49) cohorts
  // Approximate: 0.25 of young + 0.65 of working are women 15-49
  // (stylized cohort-overlap fractions, not sourced data)
  const womenOfChildbearingAge = youngShare * 0.25 + workingShare * 0.65;
  // Divide by 2 (only women) and by 32: effective childbearing span used
  // here is ~32 years, slightly under the nominal 15-49 window (35 years)
  // to account for low fertility at the window edges
  return (tfr * womenOfChildbearingAge * 0.5) / 32;
}

function ageCohorts(
  state: RegionState,
  tfr: number,
  eduParams: RegionEduParams,
  yearIndex: number,
  lifeExpectancyGrowth: number,
  effectiveMigrationRate: number
): RegionState {
  const pop = state.population;
  const youngShare = state.young / pop;
  const workingShare = state.working / pop;

  // Calculate births (deaths are computed per-cohort below)
  const births = birthRateFromTFR(tfr, workingShare, youngShare) * pop;

  // Aging transitions - KEY: use correct cohort lengths
  // Young cohort: 20 years (ages 0-19), so 1/20 age out per year
  // Working cohort: 45 years (ages 20-64), so 1/45 age out per year
  const agingOutOfYoung = state.young / 20;
  const agingOutOfWorking = state.working / 45;

  // Deaths by cohort (proportional to mortality rates)
  const youngDeaths = state.young * 0.001;
  const workingDeaths = state.working * 0.003;

  // === EDUCATION TRACKING ===
  // Split new workers by enrollment rate (determined at age 18-22)
  const enrollRate = projectEnrollmentRate(
    eduParams.enrollmentRate2025,
    eduParams.enrollmentTarget,
    eduParams.enrollmentGrowth,
    yearIndex
  );
  const newCollegeWorkers = agingOutOfYoung * enrollRate;
  const newNonCollegeWorkers = agingOutOfYoung * (1 - enrollRate);

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
  let newYoung = Math.max(0, state.young + births - agingOutOfYoung - youngDeaths);
  let newWorking = newWorkingCollege + newWorkingNonCollege;
  let newOld = newOldCollege + newOldNonCollege;

  // Apply migration (primarily to working-age, 70% college for migrants).
  // Rate is pre-scaled by the caller so global net migration sums to zero.
  const migration = pop * effectiveMigrationRate;
  const migrationCollege = migration * WORKING_MIGRANT_SHARE * MIGRANT_COLLEGE_SHARE;
  const migrationNonCollege = migration * WORKING_MIGRANT_SHARE * (1 - MIGRANT_COLLEGE_SHARE);

  newWorkingCollege += migrationCollege;
  newWorkingNonCollege += migrationNonCollege;
  newWorking = newWorkingCollege + newWorkingNonCollege;
  newYoung += migration * 0.15;
  newOld += migration * 0.05;
  newOldCollege += migration * 0.05 * 0.5;
  newOldNonCollege += migration * 0.05 * 0.5;

  const newPop = newYoung + newWorking + newOld;

  return {
    population: newPop,
    young: newYoung,
    working: newWorking,
    old: newOld,
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
      oecd: {
        fertilityFloor: {
          paramName: 'oecdFertilityFloor',
          description: 'Long-run fertility floor for OECD region. 2.1 = replacement level.',
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
      let newState: RegionState;
      if (yearIndex === 0) {
        newState = regionState;
      } else {
        newState = ageCohorts(
          regionState, tfr, eduParams, yearIndex,
          params.lifeExpectancyGrowth, effectiveMigrationRate
        );
      }
      // Working-age migration flow, the same split ageCohorts applies.
      // Reported in year 0 too (as with entrants) as the flow implied by the
      // 2025 populations.
      const workingMigration = regionState.population * effectiveMigrationRate * WORKING_MIGRANT_SHARE;
      regionalWorkingMigrationCollege[region] = workingMigration * MIGRANT_COLLEGE_SHARE;
      regionalWorkingMigrationNonCollege[region] = workingMigration * (1 - MIGRANT_COLLEGE_SHARE);

      newRegions[region] = newState;
      regionalLifeExpectancy[region] = newState.lifeExpectancy;

      // Workforce entrants: the same 1/20 of the pre-step young cohort that
      // ageCohorts moves into working age, split by the same enrollment
      // projection. Reported in year 0 too (no aging happens, but the
      // entrant flow is a well-defined observable of the 2025 age structure).
      regionalWorkforceEntrants[region] = regionState.young / 20;
      regionalEntrantCollegeShare[region] = projectEnrollmentRate(
        eduParams.enrollmentRate2025,
        eduParams.enrollmentTarget,
        eduParams.enrollmentGrowth,
        yearIndex
      );
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

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

import { defineModule, Module } from '../framework/module.js';
import { Region, REGIONS, ValidationResult } from '../framework/types.js';
import { exponentialConvergence, logistic } from '../primitives/math.js';
import { validatedMerge } from '../framework/validated-merge.js';

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

export interface DemographicsParams {
  regions: Record<Region, RegionDemoParams>;
  education: Record<Region, RegionEduParams>;
  fertilityFloorMultiplier: number;
  migrationMultiplier: number;
  lifeExpectancyGrowth: number;
}

export const demographicsDefaults: DemographicsParams = {
  regions: {
    oecd: {
      name: 'OECD',
      pop2025: 1.4e9,
      fertility: 1.6,
      fertilityFloor: 1.4,
      fertilityDecay: 0.005,
      lifeExpectancy: 82,
      young: 0.18,
      working: 0.59,
      old: 0.23,
      migrationRate: 0.003,
    },
    china: {
      name: 'China',
      pop2025: 1.4e9,
      fertility: 1.05,        // TFR 2023 (JFV)
      fertilityFloor: 0.8,    // Lower floor (South Korea at 0.7)
      fertilityDecay: 0.05,   // Fast convergence (JFV: steepest decline)
      lifeExpectancy: 78,
      young: 0.16,
      working: 0.68,
      old: 0.16,
      migrationRate: 0.0,
    },
    em: {
      name: 'Emerging Markets',
      pop2025: 3.5e9,
      fertility: 2.3,         // Slightly higher starting TFR
      fertilityFloor: 1.4,
      fertilityDecay: 0.02,   // JFV: faster convergence than expected
      lifeExpectancy: 72,
      young: 0.27,
      working: 0.63,
      old: 0.10,
      migrationRate: -0.001,
    },
    row: {
      name: 'Rest of World',
      pop2025: 2.0e9,           // Africa + others
      fertility: 4.2,           // High starting TFR (Sub-Saharan Africa ~4.5)
      fertilityFloor: 1.5,      // Lower floor (JFV: even Africa converging)
      fertilityDecay: 0.028,    // Balance: high enough peak, declining by 2100
      lifeExpectancy: 65,
      young: 0.42,              // Very young population
      working: 0.52,
      old: 0.06,
      migrationRate: -0.001,
    },
  },
  education: {
    oecd: {
      enrollmentRate2025: 0.55,
      enrollmentTarget: 0.70,   // Higher target (UNESCO projections)
      enrollmentGrowth: 0.012,  // Faster growth
      collegeShare2025: 0.40,
      wagePremium2025: 1.5,
      premiumTarget: 1.4,
      premiumDecay: 0.003,
      lifeBonusCollege: 3,
      lifePenaltyNonCollege: 1,
    },
    china: {
      enrollmentRate2025: 0.60,
      enrollmentTarget: 0.75,   // Higher target (China pushing education)
      enrollmentGrowth: 0.015,  // Faster growth
      collegeShare2025: 0.22,
      wagePremium2025: 1.8,
      premiumTarget: 1.5,
      premiumDecay: 0.005,
      lifeBonusCollege: 2,
      lifePenaltyNonCollege: 1,
    },
    em: {
      enrollmentRate2025: 0.35,
      enrollmentTarget: 0.60,   // Higher target
      enrollmentGrowth: 0.02,   // Faster growth (catching up)
      collegeShare2025: 0.18,
      wagePremium2025: 2.0,
      premiumTarget: 1.6,
      premiumDecay: 0.004,
      lifeBonusCollege: 2,
      lifePenaltyNonCollege: 1,
    },
    row: {
      enrollmentRate2025: 0.15,
      enrollmentTarget: 0.45,   // Higher target
      enrollmentGrowth: 0.025,  // Faster growth (catching up)
      collegeShare2025: 0.08,
      wagePremium2025: 2.2,
      premiumTarget: 1.7,
      premiumDecay: 0.003,
      lifeBonusCollege: 1,
      lifePenaltyNonCollege: 1,
    },
  },
  fertilityFloorMultiplier: 1.0,
  migrationMultiplier: 1.0,
  lifeExpectancyGrowth: 0.1,
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

/** Demographics has no inputs - it's a root module */
export interface DemographicsInputs {
  // Empty - no dependencies
}

export interface DemographicsOutputs {
  // Global aggregates
  population: number;
  working: number;
  old: number;
  dependency: number;
  effectiveWorkers: number;
  collegeShare: number;

  // Regional breakdown
  regionalPopulation: Record<Region, number>;
  regionalYoung: Record<Region, number>;
  regionalWorking: Record<Region, number>;
  regionalOld: Record<Region, number>;
  regionalEffectiveWorkers: Record<Region, number>;
  regionalDependency: Record<Region, number>;
  regionalFertility: Record<Region, number>;
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

function birthRateFromTFR(tfr: number, workingShare: number, youngShare: number): number {
  // Women 15-49 are roughly split between young (15-19) and working (20-49) cohorts
  // Approximate: 0.25 of young + 0.65 of working are women 15-49
  const womenOfChildbearingAge = youngShare * 0.25 + workingShare * 0.65;
  // Divide by 2 (only women) and by 32 (average childbearing span)
  return (tfr * womenOfChildbearingAge * 0.5) / 32;
}

function deathRate(youngShare: number, workingShare: number, oldShare: number, lifeExpectancy: number): number {
  const youngMortality = 0.001;  // 0.1% per year
  const workingMortality = 0.003; // 0.3% per year
  // Remaining life expectancy at 65 is about LE - 65 + 10 (selection effects)
  const remainingLEat65 = Math.max(15, lifeExpectancy - 55);
  const oldMortality = 1 / remainingLEat65;

  return youngShare * youngMortality + workingShare * workingMortality + oldShare * oldMortality;
}

function ageCohorts(
  state: RegionState,
  tfr: number,
  eduParams: RegionEduParams,
  yearIndex: number,
  lifeExpectancyGrowth: number
): RegionState {
  const pop = state.population;
  const youngShare = state.young / pop;
  const workingShare = state.working / pop;
  const oldShare = state.old / pop;

  // Calculate births and deaths
  const births = birthRateFromTFR(tfr, workingShare, youngShare) * pop;
  const deaths = deathRate(youngShare, workingShare, oldShare, state.lifeExpectancy) * pop;

  // Aging transitions - KEY: use correct cohort lengths
  // Young cohort: 20 years (ages 0-19), so 1/20 age out per year
  // Working cohort: 45 years (ages 20-64), so 1/45 age out per year
  const agingOutOfYoung = state.young / 20;
  const agingOutOfWorking = state.working / 45;

  // Deaths by cohort (proportional to mortality rates)
  const youngDeaths = state.young * 0.001;
  const workingDeaths = state.working * 0.003;
  const oldDeaths = deaths - youngDeaths - workingDeaths;

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

  // Apply migration (primarily to working-age, 70% college for migrants)
  const migration = pop * state._migrationRate;
  const migrationCollege = migration * 0.8 * 0.70;
  const migrationNonCollege = migration * 0.8 * 0.30;

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

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const demographicsModule: Module<
  DemographicsParams,
  DemographicsState,
  DemographicsInputs,
  DemographicsOutputs
> = defineModule({
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
          range: { min: 1.0, max: 2.1, default: 1.4 },
          tier: 1 as const,
        },
      },
    },
  },

  inputs: [] as const, // No dependencies - root module

  outputs: [
    'population',
    'working',
    'old',
    'dependency',
    'effectiveWorkers',
    'collegeShare',
    'regionalPopulation',
    'regionalYoung',
    'regionalWorking',
    'regionalOld',
    'regionalEffectiveWorkers',
    'regionalDependency',
    'regionalFertility',
  ] as const,

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

  step(state, _inputs, params, year, yearIndex) {
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
      let newState: RegionState;
      if (yearIndex === 0) {
        newState = regionState;
      } else {
        newState = ageCohorts(regionState, tfr, eduParams, yearIndex, params.lifeExpectancyGrowth);
      }

      newRegions[region] = newState;

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
      const regionEffective = nonCollegeWorkers + collegeWorkers * wagePremium;
      totalEffective += regionEffective;
      totalCollegeWorkers += collegeWorkers;
      regionalEffectiveWorkers[region] = regionEffective;
    }

    const globalCollegeShare = totalWorking > 0 ? totalCollegeWorkers / totalWorking : 0;

    return {
      state: { regions: newRegions },
      outputs: {
        population: totalPop,
        working: totalWorking,
        old: totalOld,
        dependency: totalWorking > 0 ? totalOld / totalWorking : 0,
        effectiveWorkers: totalEffective,
        collegeShare: globalCollegeShare,
        regionalPopulation,
        regionalYoung,
        regionalWorking,
        regionalOld,
        regionalEffectiveWorkers,
        regionalDependency,
        regionalFertility,
      },
    };
  },
});

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
      fertility: 1.05,
      fertilityFloor: 0.85,
      fertilityDecay: 0.012,
      lifeExpectancy: 78,
      young: 0.16,
      working: 0.68,
      old: 0.16,
      migrationRate: 0.0,
    },
    em: {
      name: 'Emerging Markets',
      pop2025: 3.5e9,
      fertility: 2.1,
      fertilityFloor: 1.4,
      fertilityDecay: 0.02,
      lifeExpectancy: 72,
      young: 0.27,
      working: 0.63,
      old: 0.10,
      migrationRate: -0.001,
    },
    row: {
      name: 'Rest of World',
      pop2025: 2.0e9,
      fertility: 3.5,
      fertilityFloor: 1.6,
      fertilityDecay: 0.03,
      lifeExpectancy: 65,
      young: 0.40,
      working: 0.54,
      old: 0.06,
      migrationRate: -0.001,
    },
  },
  education: {
    oecd: {
      enrollmentRate2025: 0.55,
      enrollmentTarget: 0.65,
      enrollmentGrowth: 0.008,
      collegeShare2025: 0.40,
      wagePremium2025: 1.5,
      premiumTarget: 1.4,
      premiumDecay: 0.003,
    },
    china: {
      enrollmentRate2025: 0.60,
      enrollmentTarget: 0.70,
      enrollmentGrowth: 0.012,
      collegeShare2025: 0.22,
      wagePremium2025: 1.8,
      premiumTarget: 1.5,
      premiumDecay: 0.005,
    },
    em: {
      enrollmentRate2025: 0.35,
      enrollmentTarget: 0.55,
      enrollmentGrowth: 0.015,
      collegeShare2025: 0.18,
      wagePremium2025: 2.0,
      premiumTarget: 1.6,
      premiumDecay: 0.004,
    },
    row: {
      enrollmentRate2025: 0.15,
      enrollmentTarget: 0.40,
      enrollmentGrowth: 0.02,
      collegeShare2025: 0.08,
      wagePremium2025: 2.2,
      premiumTarget: 1.7,
      premiumDecay: 0.003,
    },
  },
  fertilityFloorMultiplier: 1.0,
  migrationMultiplier: 1.0,
  lifeExpectancyGrowth: 0.1,
};

// =============================================================================
// STATE
// =============================================================================

interface RegionState {
  population: number;
  young: number;      // Fraction
  working: number;    // Fraction
  old: number;        // Fraction
  fertility: number;  // Current TFR
  collegeShare: number;
  lifeExpectancy: number;
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
  regionalWorking: Record<Region, number>;
  regionalDependency: Record<Region, number>;
  regionalFertility: Record<Region, number>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function projectFertility(
  current: number,
  floor: number,
  decayRate: number,
  years: number
): number {
  return exponentialConvergence(current, floor, decayRate, years);
}

function projectCollegeShare(
  initial: number,
  enrollmentRate: number,
  years: number
): number {
  // College share grows based on enrollment rate
  // New graduates enter workforce each year
  const maxShare = 0.6; // Cap at 60%
  const growth = enrollmentRate * 0.02; // ~2% of enrollment becomes new share
  return Math.min(initial + growth * years, maxShare);
}

function projectWagePremium(
  initial: number,
  target: number,
  decayRate: number,
  years: number
): number {
  return exponentialConvergence(initial, target, decayRate, years);
}

function ageForward(
  state: RegionState,
  params: RegionDemoParams,
  eduParams: RegionEduParams,
  years: number,
  fertilityFloorMult: number,
  migrationMult: number
): RegionState {
  const effectiveFloor = params.fertilityFloor * fertilityFloorMult;
  const effectiveMigration = params.migrationRate * migrationMult;

  // Project fertility
  const newFertility = projectFertility(
    params.fertility,
    effectiveFloor,
    params.fertilityDecay,
    years
  );

  // Birth rate from TFR (simplified)
  const birthRate = (newFertility / 2.1) * 0.012; // ~1.2% at replacement

  // Death rate (simplified, age-adjusted)
  const youngDeathRate = 0.001;
  const workingDeathRate = 0.003;
  const oldDeathRate = 0.035;

  // Cohort transitions (simplified 20-year cohorts)
  const agingRate = 1 / 20; // 5% of each cohort ages up per year

  // Calculate new cohort shares
  let newYoung = state.young * (1 - agingRate) + birthRate - state.young * youngDeathRate;
  let newWorking = state.working + state.young * agingRate - state.working * agingRate
                   - state.working * workingDeathRate + effectiveMigration;
  let newOld = state.old + state.working * agingRate - state.old * oldDeathRate;

  // Normalize to ensure they sum to 1
  const total = newYoung + newWorking + newOld;
  newYoung /= total;
  newWorking /= total;
  newOld /= total;

  // Population growth
  const growthRate = birthRate - (state.young * youngDeathRate +
                                   state.working * workingDeathRate +
                                   state.old * oldDeathRate) + effectiveMigration;
  const newPopulation = state.population * (1 + growthRate);

  // Education
  const newCollegeShare = projectCollegeShare(
    eduParams.collegeShare2025,
    eduParams.enrollmentRate2025,
    years
  );

  return {
    population: newPopulation,
    young: newYoung,
    working: newWorking,
    old: newOld,
    fertility: newFertility,
    collegeShare: newCollegeShare,
    lifeExpectancy: state.lifeExpectancy + 0.1, // Simplified
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

  inputs: [] as const, // No dependencies - root module

  outputs: [
    'population',
    'working',
    'old',
    'dependency',
    'effectiveWorkers',
    'collegeShare',
    'regionalPopulation',
    'regionalWorking',
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
    const result = { ...demographicsDefaults, ...partial };

    // Deep merge regions
    if (partial.regions) {
      result.regions = { ...demographicsDefaults.regions };
      for (const region of REGIONS) {
        if (partial.regions[region]) {
          result.regions[region] = {
            ...demographicsDefaults.regions[region],
            ...partial.regions[region],
          };
        }
      }
    }

    // Deep merge education
    if (partial.education) {
      result.education = { ...demographicsDefaults.education };
      for (const region of REGIONS) {
        if (partial.education[region]) {
          result.education[region] = {
            ...demographicsDefaults.education[region],
            ...partial.education[region],
          };
        }
      }
    }

    return result;
  },

  init(params: DemographicsParams): DemographicsState {
    const regions: Record<Region, RegionState> = {} as Record<Region, RegionState>;

    for (const region of REGIONS) {
      const r = params.regions[region];
      const e = params.education[region];
      regions[region] = {
        population: r.pop2025,
        young: r.young,
        working: r.working,
        old: r.old,
        fertility: r.fertility,
        collegeShare: e.collegeShare2025,
        lifeExpectancy: r.lifeExpectancy,
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
    const regionalWorking: Record<Region, number> = {} as Record<Region, number>;
    const regionalDependency: Record<Region, number> = {} as Record<Region, number>;
    const regionalFertility: Record<Region, number> = {} as Record<Region, number>;

    for (const region of REGIONS) {
      const regionState = state.regions[region];
      const regionParams = params.regions[region];
      const eduParams = params.education[region];

      // Age forward
      const newState = ageForward(
        regionState,
        regionParams,
        eduParams,
        yearIndex,
        params.fertilityFloorMultiplier,
        params.migrationMultiplier
      );

      newRegions[region] = newState;

      // Calculate regional outputs
      const workingPop = newState.population * newState.working;
      const oldPop = newState.population * newState.old;

      regionalPopulation[region] = newState.population;
      regionalWorking[region] = workingPop;
      regionalDependency[region] = newState.old / newState.working;
      regionalFertility[region] = newState.fertility;

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
      const collegeWorkers = workingPop * newState.collegeShare;
      const nonCollegeWorkers = workingPop * (1 - newState.collegeShare);
      totalEffective += nonCollegeWorkers + collegeWorkers * wagePremium;
      totalCollegeWorkers += collegeWorkers;
    }

    const globalCollegeShare = totalWorking > 0 ? totalCollegeWorkers / totalWorking : 0;

    return {
      state: { regions: newRegions },
      outputs: {
        population: totalPop,
        working: totalWorking,
        old: totalOld,
        dependency: totalOld / totalWorking,
        effectiveWorkers: totalEffective,
        collegeShare: globalCollegeShare,
        regionalPopulation,
        regionalWorking,
        regionalDependency,
        regionalFertility,
      },
    };
  },
});

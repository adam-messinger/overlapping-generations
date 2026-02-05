/**
 * G/C Expansion Module
 *
 * Implements Galbraith/Chen Entropy Economics: energy transitions are ADDITIVE,
 * not substitutive. When energy costs drop, released resources get reinvested
 * into new activities.
 *
 * Two mechanisms:
 * 1. AUTOMATION ENERGY (new species) - Robots/AI are genuinely NEW energy
 *    consumers. This is ecological succession (Odum): new species fill
 *    available energy niches.
 *
 * 2. COST EXPANSION (unlocking activities) - When energy becomes cheaper,
 *    activities that were previously too expensive become viable (desalination,
 *    DAC, synthetic fuels, electric steel, compute).
 *
 * Inputs (from other modules):
 * - baseDemand: Base electricity demand before expansion (TWh)
 * - cheapestLCOE: Cheapest energy source ($/MWh)
 * - workingPopulation: Global working-age population
 *
 * Outputs (to other modules):
 * - adjustedDemand: Demand after expansion (TWh)
 * - robotLoadTWh: Automation energy consumption (TWh)
 * - expansionMultiplier: Cost expansion factor
 */

import { defineModule, Module } from '../framework/module.js';
import { ValidationResult } from '../framework/types.js';
import { validatedMerge } from '../framework/validated-merge.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface ExpansionParams {
  // Automation energy (new species)
  energyPerRobotMWh: number;    // MWh per robot-unit per year
  robotGrowthRate: number;       // Annual growth rate
  robotBaseline2025: number;     // Robots per 1000 workers in 2025
  robotCap: number;              // Max robots per 1000 workers

  // G/C cost expansion
  baselineLCOE: number;          // 2025 grid-average $/MWh
  expansionCoefficient: number;  // Expansion per cost halving (log form)

  // Infrastructure constraint
  baseMaxDemandGrowthRate: number; // Max demand growth at baseline investment
  baseInvestmentRate: number;      // Reference investment/GDP ratio
}

export const expansionDefaults: ExpansionParams = {
  // Automation energy
  energyPerRobotMWh: 10,         // MWh per robot-unit per year
  robotGrowthRate: 0.12,         // 12% annual growth
  robotBaseline2025: 1,          // 1 robot per 1000 workers in 2025
  robotCap: 500,                 // Max robots per 1000 workers

  // G/C cost expansion
  baselineLCOE: 50,              // 2025 grid-average $/MWh
  expansionCoefficient: 0.25,    // 25% expansion per cost halving

  // Infrastructure constraint
  baseMaxDemandGrowthRate: 0.025, // 2.5% at baseline
  baseInvestmentRate: 0.22,       // Reference investment/GDP
};

// =============================================================================
// STATE
// =============================================================================

export interface ExpansionState {
  robotsPer1000: number;         // Current robots per 1000 workers
  prevAdjustedDemand: number;    // Previous year's adjusted demand (for growth cap)
  prevBaseDemand: number;        // Previous year's base demand (for expansion cap)
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface ExpansionInputs {
  /** Base electricity demand before expansion (TWh) */
  baseDemand: number;

  /** Cheapest LCOE this year ($/MWh) */
  cheapestLCOE: number;

  /** Global working-age population */
  workingPopulation: number;

  /** Current investment rate (for infrastructure constraint) */
  investmentRate: number;
}

export interface ExpansionOutputs {
  /** Adjusted demand after expansion (TWh) */
  adjustedDemand: number;

  /** Robot/automation energy load (TWh) */
  robotLoadTWh: number;

  /** Cost expansion multiplier */
  expansionMultiplier: number;

  /** Robots per 1000 workers */
  robotsPer1000: number;

  /** Infrastructure-capped demand growth rate */
  maxDemandGrowth: number;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const expansionModule: Module<
  ExpansionParams,
  ExpansionState,
  ExpansionInputs,
  ExpansionOutputs
> = defineModule({
  name: 'expansion',
  description: 'G/C Entropy Economics: robot energy and cost expansion',

  defaults: expansionDefaults,

  paramMeta: {
    robotGrowthRate: {
      description: 'Annual growth rate of robot/AI automation. 12% = doubling every 6 years.',
      unit: 'fraction/year',
      range: { min: 0.05, max: 0.25, default: 0.12 },
      tier: 1 as const,
    },
    expansionCoefficient: {
      paramName: 'expansionCoeff',
      description: 'Energy demand expansion per LCOE halving (G/C Entropy Economics). 0.25 = 25% more demand when costs halve.',
      unit: 'fraction per cost halving',
      range: { min: 0.10, max: 0.50, default: 0.25 },
      tier: 1 as const,
    },
    energyPerRobotMWh: {
      paramName: 'robotEnergyPerUnit',
      description: 'Energy consumption per robot-equivalent (datacenter + physical robots).',
      unit: 'MWh/robot-unit/year',
      range: { min: 5, max: 20, default: 10 },
      tier: 1 as const,
    },
  },

  inputs: [
    'baseDemand',
    'cheapestLCOE',
    'workingPopulation',
    'investmentRate',
  ] as const,

  outputs: [
    'adjustedDemand',
    'robotLoadTWh',
    'expansionMultiplier',
    'robotsPer1000',
    'maxDemandGrowth',
  ] as const,

  validate(params: Partial<ExpansionParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const p = { ...expansionDefaults, ...params };

    if (p.energyPerRobotMWh <= 0) {
      errors.push('energyPerRobotMWh must be positive');
    }
    if (p.robotGrowthRate < 0 || p.robotGrowthRate > 0.5) {
      warnings.push(`robotGrowthRate ${p.robotGrowthRate} seems unusual`);
    }
    if (p.robotBaseline2025 < 0) {
      errors.push('robotBaseline2025 cannot be negative');
    }
    if (p.expansionCoefficient < 0 || p.expansionCoefficient > 1) {
      errors.push('expansionCoefficient should be 0-1');
    }
    if (p.baselineLCOE <= 0) {
      errors.push('baselineLCOE must be positive');
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<ExpansionParams>): ExpansionParams {
    return validatedMerge('expansion', this.validate, (p) => ({
      ...expansionDefaults,
      ...p,
    }), partial);
  },

  init(params: ExpansionParams): ExpansionState {
    return {
      robotsPer1000: params.robotBaseline2025,
      prevAdjustedDemand: 0,
      prevBaseDemand: 0,
    };
  },

  step(state, inputs, params, _year, yearIndex) {
    const { baseDemand, cheapestLCOE, workingPopulation, investmentRate } = inputs;

    // =========================================================================
    // 1. AUTOMATION ENERGY (new species in economic ecology)
    // =========================================================================
    // Robots/AI are genuinely NEW energy consumers - ecological succession
    const robotsPer1000 = Math.min(
      params.robotBaseline2025 * Math.pow(1 + params.robotGrowthRate, yearIndex),
      params.robotCap
    );

    // Total robots globally
    const totalRobots = (robotsPer1000 / 1000) * workingPopulation;

    // Automation energy load (TWh) - additive, not multiplicative
    // energyPerRobotMWh is MWh/robot/year, working pop might be billions
    // totalRobots * MWh / 1e6 = TWh
    const robotLoadTWh = (totalRobots * params.energyPerRobotMWh) / 1e6;

    // =========================================================================
    // 2. G/C COST EXPANSION (cheap energy unlocks new activities)
    // =========================================================================
    // Cost reduction releases resources → reinvested into new activities
    // This is CONTINUOUS, not threshold-based
    const costRatio = params.baselineLCOE / Math.max(5, cheapestLCOE);

    // Log form: first cost halvings matter more than later ones
    // log2(2) = 1.0 → 25% expansion when energy is 2× cheaper
    // log2(4) = 2.0 → 50% expansion when energy is 4× cheaper
    const expansionMultiplier = 1 + params.expansionCoefficient *
      Math.log2(Math.max(1, costRatio));

    // =========================================================================
    // 3. INFRASTRUCTURE CONSTRAINT (endogenous)
    // =========================================================================
    // How fast can we build? Scales with investment capacity.
    const investmentMultiplier = investmentRate / params.baseInvestmentRate;
    const maxDemandGrowth = params.baseMaxDemandGrowthRate * investmentMultiplier;

    // =========================================================================
    // 4. COMBINED DEMAND
    // =========================================================================
    // Automation added first, then expansion multiplier applied
    // The expansion is ADDITIONAL demand on top of base, never reduces it
    let adjustedDemand = (baseDemand + robotLoadTWh) * expansionMultiplier;

    // Apply infrastructure growth cap to the EXPANSION PORTION only
    // Base demand must be met; only the G/C expansion is infrastructure-limited
    // This ensures adjustedDemand >= baseDemand always
    if (state.prevAdjustedDemand > 0 && yearIndex > 0) {
      // Expansion portion = adjustedDemand - baseDemand
      const expansionPortion = adjustedDemand - baseDemand;

      // Max allowable expansion this year based on infrastructure
      // Use previous year's expansion as the base for growth cap
      const prevExpansionPortion = Math.max(0, state.prevAdjustedDemand - state.prevBaseDemand);
      const maxExpansion = prevExpansionPortion * (1 + maxDemandGrowth);

      // Cap only the expansion portion
      const cappedExpansion = Math.min(expansionPortion, maxExpansion);

      adjustedDemand = baseDemand + cappedExpansion;
    }

    return {
      state: {
        robotsPer1000,
        prevAdjustedDemand: adjustedDemand,
        prevBaseDemand: baseDemand,
      },
      outputs: {
        adjustedDemand,
        robotLoadTWh,
        expansionMultiplier,
        robotsPer1000,
        maxDemandGrowth,
      },
    };
  },
});

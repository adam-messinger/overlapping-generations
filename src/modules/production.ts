/**
 * Production Module
 *
 * Biophysical production function where GDP emerges from energy, capital, and labor.
 * Based on Ayres-Warr (2009) finding that useful energy is the dominant growth driver.
 *
 * Core equation (normalized Cobb-Douglas):
 *   GDP = Y₀ × (K/K₀)^α × (L/L₀)^β × (E/E₀)^γ × efficiency × (1 - damages)
 *
 * Efficiency replaces exogenous TFP with two physical factors:
 *   1. End-use efficiency (Wright's Law on cumulative useful work): η₀ → η_max
 *   2. Organizational efficiency (education-driven, diminishing returns)
 *
 * Ayres-Warr elasticities:
 *   α = 0.25 (capital)
 *   β = 0.15 (labor)
 *   γ = 0.55 (useful energy)
 *
 * All inputs are lagged (from previous year), so production runs early in the
 * step order (after demographics). This breaks the GDP→demand→dispatch→energy→GDP
 * cycle cleanly.
 *
 * Sources:
 * - Ayres & Warr (2009): The Economic Growth Engine
 * - Kümmel et al. (2010): LINEX production function
 * - Santos et al. (2018): Exergy economics survey
 * - Brockway et al. (2018): Exergy-GDP relationship
 */

import { defineModule, Module } from '../framework/module.js';
import { ValidationResult } from '../framework/types.js';
import { validatedMerge } from '../framework/validated-merge.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface ProductionParams {
  alpha: number;              // Capital elasticity (0.25)
  beta: number;               // Labor elasticity (0.15)
  gamma: number;              // Useful energy elasticity (0.55)
  initialGDP: number;         // $T (2025 global GDP)
  electricExergy: number;     // Exergy factor for electricity (0.95)
  thermalExergy: number;      // Exergy factor for direct fuel use (0.35)
  foodStressElasticity: number; // GDP reduction per unit food stress (0.3)

  // End-use efficiency (Wright's Law on cumulative useful work)
  endUseEfficiency0: number;        // η₀: initial second-law efficiency (0.35)
  endUseEfficiencyMax: number;      // η_max: thermodynamic ceiling (0.60)
  endUseLearningExponent: number;   // λ: Wright's Law exponent (0.30)
  cumulativeWorkHistory: number;    // Years of prior useful work experience (30)

  // Organizational efficiency (education-driven)
  orgEfficiencySensitivity: number;    // φ: sensitivity to college share gain (0.35)
  orgEfficiencyMaxCollegeGain: number; // max college share improvement (0.40)
}

export const productionDefaults: ProductionParams = {
  alpha: 0.25,
  beta: 0.15,
  gamma: 0.55,
  initialGDP: 120,            // $120T (2025 global GDP)
  electricExergy: 0.95,       // Electricity is nearly pure useful work
  thermalExergy: 0.35,        // Thermal fuels ~35% exergy efficiency
  foodStressElasticity: 0.3,  // 30% GDP hit at full food stress
  endUseEfficiency0: 0.35,
  endUseEfficiencyMax: 0.60,
  endUseLearningExponent: 0.25,
  cumulativeWorkHistory: 30,        // ~30yr of modern energy use before 2025
  orgEfficiencySensitivity: 0.35,
  orgEfficiencyMaxCollegeGain: 0.40,
};

// =============================================================================
// STATE
// =============================================================================

export interface ProductionState {
  initialCapital: number;       // K₀, captured in year 0
  initialLabor: number;         // L₀, captured in year 0
  initialUsefulEnergy: number;  // E₀, captured in year 0
  cumulativeUsefulWork: number; // Running sum of useful energy (TWh)
  initialCollegeShare: number;  // Captured in year 0
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface ProductionInputs {
  /** Capital stock $T (from capital, lagged) */
  capitalStock: number;
  /** Effective workers (from demographics, current year) */
  effectiveWorkers: number;
  /** Total electricity generation TWh (from dispatch, lagged) */
  totalGeneration: number;
  /** Non-electric energy TWh (from demand, lagged) */
  nonElectricEnergy: number;
  /** Climate damage fraction 0-1 (from climate, lagged) */
  damages: number;
  /** Energy burden damage fraction 0-1 (from demand, lagged) */
  energyBurdenDamage: number;
  /** Food stress fraction 0-1 (from resources, lagged) */
  foodStress: number;
  /** Resource energy consumption TWh (from resources, lagged) */
  resourceEnergy: number;
  /** Energy system overhead TWh — embodied + operating (from energy, lagged) */
  energySystemOverhead: number;
  /** College share fraction (from demographics, current year) */
  collegeShare: number;
}

export interface ProductionOutputs {
  /** GDP from biophysical production function ($T) */
  gdp: number;
  /** Exergy-weighted useful energy (TWh) */
  productionUsefulEnergy: number;
  /** (K/K₀)^α */
  capitalContribution: number;
  /** (L/L₀)^β */
  laborContribution: number;
  /** (E/E₀)^γ */
  energyContribution: number;
  /** Combined efficiency multiplier (replaces TFP) */
  efficiencyLevel: number;
  /** End-use efficiency multiplier (η/η₀) */
  endUseEfficiency: number;
  /** Current second-law efficiency η(t) */
  eta: number;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const productionModule: Module<
  ProductionParams,
  ProductionState,
  ProductionInputs,
  ProductionOutputs
> = defineModule({
  name: 'production',
  description: 'Biophysical production function (Ayres-Warr): GDP from energy, capital, labor',

  defaults: productionDefaults,

  paramMeta: {
    alpha: {
      description: 'Capital elasticity in production function (Ayres-Warr). Traditional Solow uses ~0.33, biophysical model uses 0.25.',
      unit: 'fraction',
      range: { min: 0.10, max: 0.40, default: 0.25 },
      tier: 1 as const,
    },
    beta: {
      description: 'Labor elasticity in production function. Low because much "labor" growth is really energy-augmented.',
      unit: 'fraction',
      range: { min: 0.05, max: 0.30, default: 0.15 },
      tier: 1 as const,
    },
    gamma: {
      description: 'Useful energy elasticity. Ayres-Warr find ~0.5-0.6 for useful work. Dominant growth driver.',
      unit: 'fraction',
      range: { min: 0.30, max: 0.70, default: 0.55 },
      tier: 1 as const,
    },
  },

  inputs: [
    'capitalStock',
    'effectiveWorkers',
    'totalGeneration',
    'nonElectricEnergy',
    'damages',
    'energyBurdenDamage',
    'foodStress',
    'resourceEnergy',
    'energySystemOverhead',
    'collegeShare',
  ] as const,

  outputs: [
    'gdp',
    'productionUsefulEnergy',
    'capitalContribution',
    'laborContribution',
    'energyContribution',
    'efficiencyLevel',
    'endUseEfficiency',
    'eta',
  ] as const,

  validate(params: Partial<ProductionParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (params.alpha !== undefined && (params.alpha < 0 || params.alpha > 1)) {
      errors.push('alpha must be between 0 and 1');
    }
    if (params.beta !== undefined && (params.beta < 0 || params.beta > 1)) {
      errors.push('beta must be between 0 and 1');
    }
    if (params.gamma !== undefined && (params.gamma < 0 || params.gamma > 1)) {
      errors.push('gamma must be between 0 and 1');
    }
    if (params.alpha !== undefined && params.beta !== undefined && params.gamma !== undefined) {
      const sum = params.alpha + params.beta + params.gamma;
      if (sum > 1.1) {
        warnings.push(`α+β+γ = ${sum.toFixed(2)}, strongly increasing returns to scale`);
      }
    }
    if (params.initialGDP !== undefined && params.initialGDP <= 0) {
      errors.push('initialGDP must be positive');
    }
    if (params.endUseEfficiency0 !== undefined && params.endUseEfficiencyMax !== undefined) {
      if (params.endUseEfficiency0 >= params.endUseEfficiencyMax) {
        errors.push('endUseEfficiency0 must be less than endUseEfficiencyMax');
      }
    }
    if (params.endUseLearningExponent !== undefined && params.endUseLearningExponent < 0) {
      errors.push('endUseLearningExponent must be non-negative');
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<ProductionParams>): ProductionParams {
    return validatedMerge('production', this.validate, (p) => ({
      ...productionDefaults,
      ...p,
    }), partial);
  },

  init(_params: ProductionParams): ProductionState {
    return {
      initialCapital: 0,
      initialLabor: 0,
      initialUsefulEnergy: 0,
      cumulativeUsefulWork: 0,
      initialCollegeShare: 0,
    };
  },

  step(state, inputs, params, _year, yearIndex) {
    const {
      capitalStock,
      effectiveWorkers,
      totalGeneration,
      nonElectricEnergy,
      damages,
      energyBurdenDamage,
      foodStress,
      resourceEnergy,
      energySystemOverhead,
      collegeShare,
    } = inputs;

    // Compute useful energy from lagged supply (exergy-weighted)
    // Subtract energy consumed by the system itself (not available for productive GDP):
    //   - resourceEnergy: mining + farming operations
    //   - energySystemOverhead: embodied energy of new capacity + operating energy
    const grossUsefulEnergy = totalGeneration * params.electricExergy
      + nonElectricEnergy * params.thermalExergy;
    const OVERHEAD_EXERGY = 0.65; // Average exergy factor for energy system overhead (mix of electric/thermal)
    const systemOverhead = resourceEnergy * params.thermalExergy
      + energySystemOverhead * OVERHEAD_EXERGY;
    const productionUsefulEnergy = Math.max(0, grossUsefulEnergy - systemOverhead);

    // Year 0: capture initial values for normalization
    let initialCapital = state.initialCapital;
    let initialLabor = state.initialLabor;
    let initialUsefulEnergy = state.initialUsefulEnergy;
    let cumulativeUsefulWork = state.cumulativeUsefulWork;
    let initialCollegeShare = state.initialCollegeShare;

    if (yearIndex === 0) {
      initialCapital = capitalStock;
      initialLabor = effectiveWorkers;
      initialUsefulEnergy = productionUsefulEnergy;
      // Historical baseline: humanity has ~30 years of modern useful work experience
      // This damps the early learning rate (prevents front-loading where ratio doubles in year 1)
      cumulativeUsefulWork = productionUsefulEnergy * params.cumulativeWorkHistory;
      initialCollegeShare = collegeShare;
    } else {
      cumulativeUsefulWork += productionUsefulEnergy;
    }

    // Guard against zero division
    const safeK0 = initialCapital > 0 ? initialCapital : 1;
    const safeL0 = initialLabor > 0 ? initialLabor : 1;
    const safeE0 = initialUsefulEnergy > 0 ? initialUsefulEnergy : 1;

    // Production function components (normalized)
    const capitalContribution = Math.pow(capitalStock / safeK0, params.alpha);
    const laborContribution = Math.pow(effectiveWorkers / safeL0, params.beta);
    const energyContribution = Math.pow(Math.max(0.01, productionUsefulEnergy / safeE0), params.gamma);

    // =========================================================================
    // Endogenous efficiency (replaces exogenous TFP)
    // =========================================================================

    // 1. End-use efficiency (Wright's Law on cumulative useful work)
    //    As humanity accumulates useful work experience, device efficiency improves
    //    (motors, LEDs, heat pumps, industrial processes). Bounded by thermodynamic ceiling.
    // Ratio of cumulative work to initial baseline (initial baseline = history × year0_production)
    const safeBaseline = initialUsefulEnergy * params.cumulativeWorkHistory;
    const safeCumInit = safeBaseline > 0 ? safeBaseline : 1;
    const cumulativeRatio = cumulativeUsefulWork / safeCumInit;
    const learningFraction = 1 - Math.pow(Math.max(1, cumulativeRatio), -params.endUseLearningExponent);
    const eta = params.endUseEfficiency0 +
      learningFraction * (params.endUseEfficiencyMax - params.endUseEfficiency0);
    const endUseEfficiency = eta / params.endUseEfficiency0;

    // 2. Organizational efficiency (education-driven, diminishing returns)
    //    Better-educated workforce coordinates more efficiently.
    //    Easy organizational improvements captured first → diminishing returns.
    const collegeDelta = Math.max(0, collegeShare - initialCollegeShare);
    const diminishing = Math.max(0, 1 - collegeDelta / params.orgEfficiencyMaxCollegeGain);
    const organizationalEfficiency = 1 + params.orgEfficiencySensitivity * collegeDelta * diminishing;

    // Combined efficiency level
    const efficiencyLevel = endUseEfficiency * organizationalEfficiency;

    // Damage factors (all lagged, so year 0 damages = 0)
    const damageFactor = 1 - damages;
    const burdenFactor = 1 - energyBurdenDamage;
    const foodFactor = 1 - params.foodStressElasticity * Math.max(0, Math.min(1, foodStress));

    // GDP = Y₀ × (K/K₀)^α × (L/L₀)^β × (E/E₀)^γ × efficiency × damage factors
    const gdp = params.initialGDP
      * capitalContribution
      * laborContribution
      * energyContribution
      * efficiencyLevel
      * damageFactor
      * burdenFactor
      * foodFactor;

    return {
      state: {
        initialCapital,
        initialLabor,
        initialUsefulEnergy,
        cumulativeUsefulWork,
        initialCollegeShare,
      },
      outputs: {
        gdp,
        productionUsefulEnergy,
        capitalContribution,
        laborContribution,
        energyContribution,
        efficiencyLevel,
        endUseEfficiency,
        eta,
      },
    };
  },
});

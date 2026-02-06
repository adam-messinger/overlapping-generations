/**
 * Production Module
 *
 * Biophysical production function where GDP emerges from energy, capital, and labor.
 * Based on Ayres-Warr (2009) finding that useful energy is the dominant growth driver.
 *
 * Core equation (normalized Cobb-Douglas):
 *   GDP = Y₀ × (K/K₀)^α × (L/L₀)^β × (E/E₀)^γ × TFP(t) × (1 - damages)
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
  tfpGrowthRate: number;      // Autonomous TFP growth (small — most growth from E,K,L)
  initialGDP: number;         // $T (2025 global GDP)
  electricExergy: number;     // Exergy factor for electricity (0.95)
  thermalExergy: number;      // Exergy factor for direct fuel use (0.35)
  foodStressElasticity: number; // GDP reduction per unit food stress (0.3)
}

export const productionDefaults: ProductionParams = {
  alpha: 0.25,
  beta: 0.15,
  gamma: 0.55,
  tfpGrowthRate: 0.003,       // 0.3%/year autonomous TFP
  initialGDP: 120,            // $120T (2025 global GDP)
  electricExergy: 0.95,       // Electricity is nearly pure useful work
  thermalExergy: 0.35,        // Thermal fuels ~35% exergy efficiency
  foodStressElasticity: 0.3,  // 30% GDP hit at full food stress
};

// =============================================================================
// STATE
// =============================================================================

export interface ProductionState {
  initialCapital: number;       // K₀, captured in year 0
  initialLabor: number;         // L₀, captured in year 0
  initialUsefulEnergy: number;  // E₀, captured in year 0
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
  /** exp(tfpGrowthRate × yearIndex) */
  tfpLevel: number;
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
    tfpGrowthRate: {
      description: 'Autonomous TFP growth rate (institutional, organizational). Small because most growth comes from energy/capital/labor.',
      unit: 'fraction/year',
      range: { min: 0.0, max: 0.01, default: 0.003 },
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
  ] as const,

  outputs: [
    'gdp',
    'productionUsefulEnergy',
    'capitalContribution',
    'laborContribution',
    'energyContribution',
    'tfpLevel',
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
    if (params.tfpGrowthRate !== undefined && (params.tfpGrowthRate < -0.01 || params.tfpGrowthRate > 0.05)) {
      warnings.push(`tfpGrowthRate ${params.tfpGrowthRate} seems unusual`);
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
    } = inputs;

    // Compute useful energy from lagged supply (exergy-weighted)
    // Subtract energy used for mining and farming (not available for productive GDP)
    const grossUsefulEnergy = totalGeneration * params.electricExergy
      + nonElectricEnergy * params.thermalExergy;
    const productionUsefulEnergy = Math.max(0, grossUsefulEnergy - resourceEnergy * params.thermalExergy);

    // Year 0: capture initial values for normalization
    let initialCapital = state.initialCapital;
    let initialLabor = state.initialLabor;
    let initialUsefulEnergy = state.initialUsefulEnergy;

    if (yearIndex === 0) {
      initialCapital = capitalStock;
      initialLabor = effectiveWorkers;
      initialUsefulEnergy = productionUsefulEnergy;
    }

    // Guard against zero division
    const safeK0 = initialCapital > 0 ? initialCapital : 1;
    const safeL0 = initialLabor > 0 ? initialLabor : 1;
    const safeE0 = initialUsefulEnergy > 0 ? initialUsefulEnergy : 1;

    // Production function components (normalized)
    const capitalContribution = Math.pow(capitalStock / safeK0, params.alpha);
    const laborContribution = Math.pow(effectiveWorkers / safeL0, params.beta);
    const energyContribution = Math.pow(Math.max(0.01, productionUsefulEnergy / safeE0), params.gamma);

    // TFP
    const tfpLevel = Math.exp(params.tfpGrowthRate * yearIndex);

    // Damage factors (all lagged, so year 0 damages = 0)
    const damageFactor = 1 - damages;
    const burdenFactor = 1 - energyBurdenDamage;
    const foodFactor = 1 - params.foodStressElasticity * Math.max(0, Math.min(1, foodStress));

    // GDP = Y₀ × (K/K₀)^α × (L/L₀)^β × (E/E₀)^γ × TFP × damage factors
    const gdp = params.initialGDP
      * capitalContribution
      * laborContribution
      * energyContribution
      * tfpLevel
      * damageFactor
      * burdenFactor
      * foodFactor;

    return {
      state: {
        initialCapital,
        initialLabor,
        initialUsefulEnergy,
      },
      outputs: {
        gdp,
        productionUsefulEnergy,
        capitalContribution,
        laborContribution,
        energyContribution,
        tfpLevel,
      },
    };
  },
});

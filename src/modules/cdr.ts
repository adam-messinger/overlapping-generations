/**
 * CDR (Carbon Dioxide Removal) Module
 *
 * Models direct air capture and other engineered CDR technologies that:
 * - Deploy when cost drops below NPV-adjusted social cost of carbon
 * - Follow Wright's Law on capital cost + cheap solar driving energy cost down
 * - Consume electricity that competes with robots and productive energy
 * - Feed negative emissions into the climate module
 *
 * Key mechanism: CDR energy consumption reduces useful energy available for
 * production, creating an endogenous CDR-vs-automation tradeoff.
 *
 * Sources:
 * - Fasihi et al. (2019): Techno-economic assessment of CO2 direct air capture plants
 * - McQueen et al. (2021): Cost analysis of direct air capture and sequestration
 * - Lackner (2020): The promise of negative emissions
 */

import { defineModule, Module } from '../framework/module.js';
import { ValidationResult } from '../framework/types.js';
import { validatedMerge } from '../framework/validated-merge.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface CDRParams {
  /** Initial capital cost $/ton CO2 (2025) */
  cost0: number;
  /** Wright's Law learning exponent */
  alpha: number;
  /** Starting cumulative deployment Gt (2025) */
  cumulative2025: number;

  /** Energy requirement kWh per ton CO2 */
  energyPerTon: number;

  /** Max annual capacity growth fraction */
  maxGrowthRate: number;
  /** Minimum capacity addition Gt/yr (bootstrap) */
  bootstrapRate: number;
  /** Hard cap on deployment Gt/yr */
  maxDeployRate: number;
  /** Max fraction of GDP for CDR spending */
  budgetFraction: number;

  /** Discount rate for NPV of permanent damage reduction */
  discountRate: number;

  /** Damage coefficient (mirrors climate module) */
  damageCoeff: number;
  /** Transient climate response to cumulative emissions, C per Gt CO2 */
  tcre: number;
}

export const cdrDefaults: CDRParams = {
  cost0: 400,             // $/ton CO2 (current DAC costs ~$400-600)
  alpha: 0.15,            // Moderate learning (less than solar's 0.36)
  cumulative2025: 0.001,  // ~1 Mt captured to date

  energyPerTon: 2500,     // kWh/ton CO2 (thermodynamic minimum ~250, real ~2000-3000)

  maxGrowthRate: 0.30,    // 30% annual capacity growth
  bootstrapRate: 0.001,   // 1 Mt/yr minimum addition to bootstrap
  maxDeployRate: 15,      // 15 Gt/yr hard cap (physical/geological limits)
  budgetFraction: 0.005,  // 0.5% of GDP max spend

  discountRate: 0.03,     // 3% social discount rate

  damageCoeff: 0.00536,   // DICE-2023 quadratic damage coefficient
  tcre: 0.00045,          // °C per Gt CO2 (IPCC AR6: ~0.45°C per 1000 Gt)
};

// =============================================================================
// STATE
// =============================================================================

export interface CDRState {
  /** Cumulative Gt CO2 captured */
  cumulativeDeployed: number;
  /** Current installed capacity Gt/yr */
  currentCapacity: number;
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface CDRInputs {
  /** Temperature above preindustrial, C (lagged from climate) */
  temperature: number;
  /** Global GDP $T (from production, current year) */
  gdp: number;
  /** Generation-weighted average LCOE $/MWh (lagged from dispatch) */
  laggedAvgLCOE: number;
}

export interface CDROutputs {
  /** Gt CO2 removed this year */
  cdrRemovalGtCO2: number;
  /** Electricity consumed TWh */
  cdrEnergyTWh: number;
  /** Current total cost $/ton (capital + energy) */
  cdrCostPerTon: number;
  /** Total Gt removed to date */
  cdrCumulative: number;
  /** Current installed capacity Gt/yr */
  cdrCapacity: number;
  /** Annual spending $T/yr */
  cdrAnnualSpend: number;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const cdrModule: Module<
  CDRParams,
  CDRState,
  CDRInputs,
  CDROutputs
> = defineModule({
  name: 'cdr',
  description: 'Carbon dioxide removal (DAC + sequestration) with Wright\'s Law learning',

  defaults: cdrDefaults,

  paramMeta: {
    cost0: {
      description: 'Initial capital cost of CDR per ton CO2. Current DAC is ~$400-600.',
      unit: '$/ton CO₂',
      range: { min: 100, max: 1000, default: 400 },
      tier: 1 as const,
    },
    alpha: {
      description: "Wright's Law learning exponent for CDR capital cost. Lower than solar (0.36) due to process complexity.",
      unit: 'dimensionless',
      range: { min: 0.05, max: 0.30, default: 0.15 },
      tier: 1 as const,
    },
    energyPerTon: {
      description: 'Electricity required per ton CO2 captured. Thermodynamic minimum ~250 kWh, real systems ~2000-3000.',
      unit: 'kWh/ton CO₂',
      range: { min: 1000, max: 5000, default: 2500 },
      tier: 1 as const,
    },
    budgetFraction: {
      description: 'Maximum fraction of GDP allocated to CDR spending.',
      unit: 'fraction',
      range: { min: 0.001, max: 0.02, default: 0.005 },
      tier: 1 as const,
    },
  },

  inputs: [
    'temperature',
    'gdp',
    'laggedAvgLCOE',
  ] as const,

  outputs: [
    'cdrRemovalGtCO2',
    'cdrEnergyTWh',
    'cdrCostPerTon',
    'cdrCumulative',
    'cdrCapacity',
    'cdrAnnualSpend',
  ] as const,

  validate(params: Partial<CDRParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (params.cost0 !== undefined && params.cost0 <= 0) {
      errors.push('cost0 must be positive');
    }
    if (params.alpha !== undefined && (params.alpha < 0 || params.alpha > 1)) {
      errors.push('alpha must be between 0 and 1');
    }
    if (params.energyPerTon !== undefined && params.energyPerTon <= 0) {
      errors.push('energyPerTon must be positive');
    }
    if (params.maxGrowthRate !== undefined && params.maxGrowthRate <= 0) {
      errors.push('maxGrowthRate must be positive');
    }
    if (params.maxDeployRate !== undefined && params.maxDeployRate <= 0) {
      errors.push('maxDeployRate must be positive');
    }
    if (params.budgetFraction !== undefined && (params.budgetFraction < 0 || params.budgetFraction > 0.1)) {
      errors.push('budgetFraction must be between 0 and 0.1');
    }
    if (params.discountRate !== undefined && params.discountRate <= 0) {
      errors.push('discountRate must be positive');
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<CDRParams>): CDRParams {
    return validatedMerge('cdr', this.validate, (p) => ({
      ...cdrDefaults,
      ...p,
    }), partial);
  },

  init(_params: CDRParams): CDRState {
    return {
      cumulativeDeployed: 0,
      currentCapacity: 0,
    };
  },

  step(state, inputs, params, _year, _yearIndex) {
    const { temperature, gdp, laggedAvgLCOE } = inputs;

    // =========================================================================
    // 1. CDR cost: capital (Wright's Law) + energy (LCOE-driven)
    // =========================================================================

    const cumulativeForLearning = params.cumulative2025 + state.cumulativeDeployed;
    const doublings = Math.log2(Math.max(1, cumulativeForLearning / params.cumulative2025));
    const capitalCostPerTon = params.cost0 * Math.pow(2, -params.alpha * doublings);

    // Energy cost: kWh/ton × $/kWh (LCOE is $/MWh, convert to $/kWh)
    const energyCostPerTon = params.energyPerTon * (laggedAvgLCOE / 1000);

    const cdrCostPerTon = capitalCostPerTon + energyCostPerTon;

    // =========================================================================
    // 2. Effective social cost of carbon (NPV of permanent damage reduction)
    //    SCC = d(Damages)/d(Emission) / discountRate
    //        = 2 × damageCoeff × T × TCRE × GDP($) / discountRate
    // =========================================================================

    const gdpDollars = gdp * 1e12; // Convert $T to $
    const effectiveSCC = 2 * params.damageCoeff * Math.max(0, temperature)
      * params.tcre * gdpDollars / params.discountRate;
    // effectiveSCC is in $ per ton CO2

    // =========================================================================
    // 3. Deployment decision: deploy when SCC > CDR cost
    // =========================================================================

    const shouldDeploy = effectiveSCC > cdrCostPerTon;

    let targetCapacity: number;
    if (shouldDeploy) {
      // Budget-constrained: max spend = budgetFraction × GDP
      const maxSpend = params.budgetFraction * gdp * 1e12; // $
      const maxFromBudget = maxSpend / (cdrCostPerTon > 0 ? cdrCostPerTon : 1); // tons
      const maxFromBudgetGt = maxFromBudget / 1e9; // Gt

      targetCapacity = Math.min(maxFromBudgetGt, params.maxDeployRate);
    } else {
      targetCapacity = 0;
    }

    // =========================================================================
    // 4. Capacity growth (logistic ramp-up)
    // =========================================================================

    const prevCapacity = state.currentCapacity;
    let newCapacity: number;

    if (targetCapacity > prevCapacity) {
      const gap = targetCapacity - prevCapacity;
      const maxAddition = prevCapacity * params.maxGrowthRate + params.bootstrapRate;
      const addition = Math.min(gap * 0.3, maxAddition);
      newCapacity = prevCapacity + addition;
    } else {
      // Don't decommission rapidly — capacity persists but doesn't grow
      newCapacity = prevCapacity;
    }

    newCapacity = Math.min(newCapacity, params.maxDeployRate);

    // =========================================================================
    // 5. Outputs
    // =========================================================================

    const removal = newCapacity; // Gt/yr
    // 1 Gt = 1e9 tons, 1 TWh = 1e9 kWh → kWh/ton × (1e9 ton/Gt) / (1e9 kWh/TWh) = kWh/ton
    const TWH_PER_GT = params.energyPerTon; // 2500 TWh per Gt CO2
    const cdrEnergyTWh = removal * TWH_PER_GT;
    const cdrCumulative = state.cumulativeDeployed + removal;
    const cdrAnnualSpend = (removal * 1e9 * cdrCostPerTon) / 1e12; // $T/yr

    return {
      state: {
        cumulativeDeployed: cdrCumulative,
        currentCapacity: newCapacity,
      },
      outputs: {
        cdrRemovalGtCO2: removal,
        cdrEnergyTWh,
        cdrCostPerTon,
        cdrCumulative,
        cdrCapacity: newCapacity,
        cdrAnnualSpend,
      },
    };
  },
});

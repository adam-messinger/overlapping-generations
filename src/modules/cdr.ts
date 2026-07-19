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

import { defineModule, Module, ValidationResult, validatedMerge } from 'tsimulation';
import { clamp } from '../primitives/math.js';

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

  /** Discount rate for NPV of permanent damage reduction (fallback when no interest rate) */
  discountRate: number;

  /** Fraction of market interest rate used for social discount (CDR NPV) */
  socialDiscountFactor: number;

  /** Horizon (years) for the SCC's growing-annuity NPV */
  sccHorizonYears: number;

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

  discountRate: 0.03,     // 3% social discount rate (fallback)
  socialDiscountFactor: 0.5, // Social rate = 50% of market rate
  sccHorizonYears: 100,   // NPV horizon; rationale and source in paramMeta

  damageCoeff: 0.00536,   // Midpoint of DICE-2023 (~0.0035) and Howard-Sterner (~0.0072); mirrors climate module default
  // °C per Gt CO2 (IPCC AR6: ~0.45°C per 1000 Gt). Duplicated here because
  // modules are parameter-isolated: this approximates the climate module's
  // EMERGENT TCRE (~0.00044 at default sensitivity 3.0). Scenarios that change
  // climate sensitivity should override this to match, or the SCC gate and
  // realized warming silently diverge.
  tcre: 0.00058,  // mirrors climate's 75-yr emergent warming/GtCO2 with the rising airborne fraction (consistency-pinned in climate.test.ts); AR6 central 0.00045 is the 30-yr marginal
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
  /** Lagged real interest rate (from capital previous year) for endogenous
   *  discount rate. Optional: when unwired, params.discountRate is used. */
  laggedInterestRate?: number;

  /** Lagged GDP $T (previous year) for damage-flow growth in the SCC annuity.
   *  Optional: when unwired, a 2% trend growth fallback is used. */
  laggedGdp?: number;
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
      paramName: 'cdrCost0',
      description: 'Initial capital cost of CDR per ton CO2. Current DAC is ~$400-600.',
      unit: '$/ton CO₂',
      range: { min: 100, max: 1000, default: 400 },
      tier: 1 as const,
    },
    alpha: {
      paramName: 'cdrAlpha',
      description: "Wright's Law learning exponent for CDR capital cost. Lower than solar (0.36) due to process complexity.",
      unit: 'dimensionless',
      range: { min: 0.05, max: 0.30, default: 0.15 },
      tier: 1 as const,
    },
    energyPerTon: {
      paramName: 'cdrEnergyPerTon',
      description: 'Electricity required per ton CO2 captured. Thermodynamic minimum ~250 kWh, real systems ~2000-3000.',
      unit: 'kWh/ton CO₂',
      range: { min: 1000, max: 5000, default: 2500 },
      tier: 1 as const,
    },
    budgetFraction: {
      paramName: 'cdrBudgetFraction',
      description: 'Maximum fraction of GDP allocated to CDR spending.',
      unit: 'fraction',
      range: { min: 0.001, max: 0.02, default: 0.005 },
      tier: 1 as const,
    },
    sccHorizonYears: {
      description: 'Horizon for the SCC growing-annuity NPV. EPA (2023) uses ~280 years; 100 is a conservative truncation. Longer horizons raise the SCC and pull CDR deployment earlier.',
      unit: 'years',
      range: { min: 10, max: 300, default: 100 },
      tier: 2 as const,
    },
  },

  inputs: [
    'temperature',
    'gdp',
    'laggedAvgLCOE',
    'laggedInterestRate',
    'laggedGdp',
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
    if (params.sccHorizonYears !== undefined &&
        (!Number.isFinite(params.sccHorizonYears) ||
          params.sccHorizonYears < 10 || params.sccHorizonYears > 300)) {
      errors.push('sccHorizonYears must be between 10 and 300');
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
    // 2. Effective social cost of carbon: NPV of the marginal damage stream.
    //    A marginal ton causes a damage flow of 2·damageCoeff·T·TCRE·GDP per
    //    year; damages scale with GDP, so the flow grows with the economy.
    //    Discounted as a growing annuity over sccHorizonYears (EPA 2023 SCC
    //    methodology and DICE compute the SCC as an NPV over a multi-century
    //    horizon). The previous perpetuity of the current-year flow ignored
    //    growth entirely, understating the SCC whenever growth approached the
    //    discount rate.
    // =========================================================================

    // Endogenous discount rate: social rate = fraction of market rate,
    // falling back to params.discountRate when no interest rate is wired
    // (!= null catches both undefined and null — optionalOutput-style
    // wiring passes null for missing values)
    const laggedR = inputs.laggedInterestRate;
    const effectiveDiscount = laggedR != null
      ? Math.max(0.01, laggedR * params.socialDiscountFactor)
      : params.discountRate;

    const gdpDollars = gdp * 1e12; // Convert $T to $
    // tcre is °C per Gt CO2, so the damage derivative is $ per Gt; divide by
    // 1e9 tons/Gt to express the flow in $ per ton per year
    const marginalDamageFlow = 2 * params.damageCoeff * Math.max(0, temperature)
      * params.tcre * gdpDollars / 1e9;
    // Growing-annuity factor: closed form of sum over H years of
    // ((1+g)/(1+rho))^t, with the g -> rho limit equal to H. Growth is the
    // realized GDP growth, clamped to [0, 6%]; 2% trend fallback when the
    // lagged GDP is unwired.
    const gdpGrowth = inputs.laggedGdp != null && inputs.laggedGdp > 0
      ? clamp(gdp / inputs.laggedGdp - 1, 0, 0.06)
      : 0.02;
    const x = (1 + gdpGrowth) / (1 + effectiveDiscount);
    const annuityFactor = Math.abs(1 - x) < 1e-6
      ? params.sccHorizonYears
      : x * (1 - Math.pow(x, params.sccHorizonYears)) / (1 - x);
    const effectiveSCC = marginalDamageFlow * annuityFactor;

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
    // kWh/ton × 1e9 ton/Gt = 1e9 kWh/Gt = 1 TWh/Gt, so kWh/ton ≡ TWh/Gt numerically
    const TWH_PER_GT = params.energyPerTon; // 2500 kWh/ton = 2500 TWh per Gt CO2
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

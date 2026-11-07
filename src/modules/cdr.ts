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

import { defineModule, defineParams, type InferParams, Module, num, unitPort } from 'tsimulation';
import { clamp } from '../primitives/math.js';

// =============================================================================
// PARAMETERS
// =============================================================================

/**
 * One declaration per parameter: the defaults, the type, validation, the
 * strict deep merge and the introspection metadata are all derived from it.
 */
export const cdrParams = defineParams('cdr', {
  cost0: num({
    default: 400, unit: '$/tCO2', min: 0, exclusiveMin: true, explore: { min: 100, max: 1000 },
    source: 'Current DAC ~$400-600/t: Fasihi et al. 2019; McQueen et al. 2021',
    tier: 1, paramName: 'cdrCost0',
    description: 'Initial capital cost of CDR per ton CO2. Current DAC is ~$400-600.',
  }),
  alpha: num({
    default: 0.15, unit: '1', min: 0, max: 1, explore: { min: 0.05, max: 0.30 },
    source: "Judgment: moderate learning, below solar's 0.36 (Rubin 2019) for process complexity",
    tier: 1, paramName: 'cdrAlpha',
    description: "Wright's Law learning exponent for CDR capital cost. Lower than solar (0.36) due to process complexity.",
  }),
  cumulative2025: num({
    default: 0.001, unit: 'GtCO2', min: 0, exclusiveMin: true,
    source: '~1 Mt captured to date (IEA DAC tracking, 2024)',
  }),
  energyPerTon: num({
    default: 2500, unit: 'kWh/tCO2', min: 0, exclusiveMin: true, explore: { min: 1000, max: 5000 },
    source: 'Thermodynamic minimum ~250, real systems ~2000-3000 kWh/t (Fasihi et al. 2019)',
    tier: 1, paramName: 'cdrEnergyPerTon',
    description: 'Electricity required per ton CO2 captured. Thermodynamic minimum ~250 kWh, real systems ~2000-3000.',
  }),
  maxGrowthRate: num({
    default: 0.30, unit: 'fraction/year', min: 0, exclusiveMin: true,
    source: 'Assumption: 30%/yr capacity growth, the pace of early solar/wind scale-up',
  }),
  bootstrapRate: num({
    default: 0.001, unit: 'GtCO2/year', min: 0,
    source: 'Assumption: 1 Mt/yr minimum addition so deployment can start from ~0',
  }),
  maxDeployRate: num({
    default: 15, unit: 'GtCO2/year', min: 0, exclusiveMin: true,
    source: 'Assumption: physical/geological storage ceiling (IPCC AR6 WG3 ranges top out near 15 Gt/yr)',
  }),
  budgetFraction: num({
    default: 0.005, unit: 'fraction', min: 0, max: 0.1, explore: { min: 0.001, max: 0.02 },
    source: 'Assumption: 0.5% of GDP maximum CDR spend',
    tier: 1, paramName: 'cdrBudgetFraction',
    description: 'Maximum fraction of GDP allocated to CDR spending.',
  }),
  discountRate: num({
    default: 0.03, unit: 'fraction/year', min: 0, exclusiveMin: true,
    source: '3% social discount rate, fallback when no interest rate is wired (EPA 2023 SCC central 2%)',
  }),
  socialDiscountFactor: num({
    default: 0.5, unit: 'fraction', min: 0,
    source: 'Assumption: social rate = 50% of the market real rate',
  }),
  sccHorizonYears: num({
    default: 100, unit: 'year', min: 10, max: 300,
    source: 'EPA (2023) uses ~280 years; 100 is a conservative truncation',
    tier: 2,
    description: 'Horizon for the SCC growing-annuity NPV. EPA (2023) uses ~280 years; 100 is a conservative truncation. Longer horizons raise the SCC and pull CDR deployment earlier.',
  }),
  damageCoeff: num({
    default: 0.00536, unit: '1/Δ°C^2', min: 0,
    // Mirrors the climate module's damage coefficient.
    source: 'Midpoint of DICE-2023 (~0.0035) and Howard-Sterner (~0.0072); mirrors climate.damageCoeff',
  }),
  tcre: num({
    default: 0.00058, unit: 'Δ°C/GtCO2', min: 0,
    // The climate module's 75-yr EMERGENT warming/GtCO2 at default sensitivity
    // 3.0 and airborneFractionSlope 0.05 — the emergent average rather than
    // the 30-yr marginal (0.00045, AR6 central) because the SCC annuity
    // integrates damages over the full deployment horizon. Pinned to
    // climate's emergent value in climate.test.ts; derived from climate
    // sensitivity at run time (src/param-derivations.ts).
    source: 'Emergent 75-yr TCRE of the climate module at sensitivity 3.0 (AR6 likely 0.27-0.63 C/TtCO2)',
  }),
});

export type CDRParams = InferParams<typeof cdrParams.children>;

export const cdrDefaults: CDRParams = cdrParams.defaults;

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
> = defineModule<CDRParams, CDRState, CDRInputs, CDROutputs>({
  name: 'cdr',
  description: 'Carbon dioxide removal (DAC + sequestration) with Wright\'s Law learning',

  defaults: cdrDefaults,

  paramMeta: cdrParams.paramMeta,

  connectorTypes: {
    inputs: {
      temperature: unitPort('Δ°C'),
      gdp: unitPort('$T/year'),
      laggedAvgLCOE: unitPort('$/MWh'),
      laggedInterestRate: unitPort('fraction'),
      laggedGdp: unitPort('$T/year'),
    },
    outputs: {
      cdrRemovalGtCO2: unitPort('GtCO2/year'),
      cdrEnergyTWh: unitPort('TWh/year'),
      cdrCostPerTon: unitPort('$/tCO2'),
      cdrCumulative: unitPort('GtCO2'),
      cdrCapacity: unitPort('GtCO2/year'),
      cdrAnnualSpend: unitPort('$T/year'),
    },
  },

  validate: cdrParams.validate,

  mergeParams(partial) {
    return cdrParams.merge(partial);
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

/**
 * Energy Module
 *
 * Handles LCOE calculation and capacity state management.
 * Implements Wright's Law learning curves and EROEI depletion.
 *
 * REGIONALIZATION (v2):
 * - Learning curves are GLOBAL (Wright's Law operates on cumulative deployment)
 * - Capacity stock is REGIONAL (each region has its own grid)
 * - Carbon price is REGIONAL (policy divergence)
 * - Investment is REGIONAL (from capital module's regionalSavings)
 *
 * This enables scenarios like "OECD stays on fossil while China goes solar"
 * while still modeling global learning (China building solar drives down
 * costs for everyone).
 *
 * State machine architecture:
 *   actualCapacity[t] = actualCapacity[t-1] + additions[t] - retirements[t]
 *
 * Outputs (to other modules):
 * - lcoes: Current LCOE by source ($/MWh) - GLOBAL (learning-driven)
 * - capacities: Installed capacity by source (GW) - SUM of regional
 * - regionalCapacities: Regional breakdown
 * - cumulativeCapacity: Total deployed (for learning curves)
 */

import {
  advanceVintageStock,
  createVintageStock,
  defineModule,
  type Module,
  type ValidationResult,
  type VintageStockState,
  validatedMerge,
  unitPort,
} from 'tsimulation';
import {
  ENERGY_ADDITION_PORT,
  ENERGY_CAPACITY_PORT,
  ENERGY_LCOE_PORT,
  REGIONAL_ENERGY_ADDITION_PORT,
  REGIONAL_ENERGY_CAPACITY_PORT,
  REGIONAL_ENERGY_LCOE_PORT,
} from '../port-schemas.js';
import { EnergySource, ENERGY_SOURCES, Region, REGIONS } from '../domain-types.js';
import { learningCurve, depletion } from '../primitives/math.js';
import { distributeByGDP } from '../primitives/distribute.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface EnergySourceParams {
  name: string;
  cost0: number;           // $/MWh baseline (2025); battery is $/kWh
  alpha: number;           // Wright's Law exponent (0 = no learning)
  // $/MWh (solar/wind) or $/kWh (battery) irreducible non-learning cost: the
  // balance-of-system / soft-cost component Wright's Law is NOT applied to.
  // CONTESTED: Farmer et al. (2022) find "no good empirical evidence supporting
  // floor costs" and impose none (past IAM floors were "repeatedly violated");
  // the OIES camp says a floor is real but lives in slow-learning BOS/soft costs
  // (module is now only ~13% of installed solar cost) at an undetermined level.
  // For solar this sets the terminal 2100 LCOE ~1:1, so treat it as a WIDE band
  // biased HIGH (i.e. the transition may be even cheaper than modeled) and
  // sensitivity-test downward. See sources/wrights-law-empirics-and-floors.md
  // and docs/SENSITIVITY.md.
  softFloor: number;
  referenceCF: number;     // Base CF for LCOE calculation (0 = no CF adjustment)
  carbonIntensity: number; // kg CO2/MWh
  // Fossil fuel specific
  eroei0?: number;         // Initial EROEI
  // Depletion budget in extraction units (extraction accrues as
  // installed_GW × 0.01/yr). Calibrated so that at the 2025 fleet the budget
  // exhausts on the observed proved-reserves R/P timescale; a shrinking fleet
  // stretches it, growth shortens it.
  reserves?: number;

  // Regional 2025 baselines (replaces single capacity2025)
  capacity2025: Record<Region, number>;
}

/** Regional policy parameters */
export interface RegionalEnergyParams {
  carbonPrice: number;                          // $/ton CO2
  maxGrowthRate?: Partial<Record<EnergySource, number>>;  // Policy constraints (overrides global)
  capacityFactor?: Partial<Record<EnergySource, number>>; // Resource quality (solar irradiance, etc.)
  financingSpread?: number;                     // Financing cost spread over global rate (fraction, e.g. 0.06 = +6pp)
}

export interface EnergyParams {
  sources: Record<EnergySource, EnergySourceParams>;

  /** Regional policy parameters (carbon price, growth constraints) */
  regional: Record<Region, RegionalEnergyParams>;

  /** EROI assumptions by source (non-fossil used directly; fossil uses depletion) */
  eroi: Record<EnergySource, number>;

  /** Global carbon price (fallback if regional not specified) - DEPRECATED, use regional */
  carbonPrice: number;

  /** Maximum growth rates (manufacturing limits) - global defaults */
  maxGrowthRate: Record<EnergySource, number>;

  /** Asset lifetimes (years) */
  lifetime: Record<EnergySource, number>;

  /** Battery round-trip efficiency */
  batteryEfficiency: number;

  /** Battery duration (hours) - converts GWh to GW */
  batteryDuration: number;

  /**
   * CAPEX for investment constraint
   * - Generators: $M/GW
   * - Battery: $M/GWh
   */
  capex: Record<EnergySource, number>;

  /**
   * Clean energy share of investment (grows over time)
   * cleanShare = cleanEnergyShare2025 + cleanEnergyShareGrowth × min(1, yearIndex/25)
   */
  cleanEnergyShare2025: number;
  cleanEnergyShareGrowth: number;

  /**
   * Generation required per unit of delivered demand — MUST equal
   * dispatch's gridLossFactor (consistency-pinned in energy.test.ts):
   * capacity is sized for the generation dispatch will actually request.
   */
  gridLossFactor: number;

  /**
   * Endogenous capex share: when desired clean build exceeds the ramp
   * budget, energy investment can compete for more of the investment pool.
   * flex = fraction of the unmet desired spend the share expands to cover
   * (0 = exogenous ramp only, current behavior); cleanShareMax caps the
   * total share of investment energy capex may claim.
   */
  cleanShareFlex: number;
  cleanShareMax: number;

  /**
   * CAPEX learning rate (annual decline for solar/wind/battery)
   */
  capexLearningRate: number;

  /**
   * Demand-driven capacity additions
   */
  demandFillRate: number;               // Fill this fraction of demand gap per year (0.30)
  competitiveThreshold: number;         // Build if within this factor of fossil LCOE (1.20)

  /** Capacity planning ceilings (max share of demand each source can serve) */
  capacityCeiling: Record<EnergySource, number>;

  /** Battery cycles per year for LCOE calculation */
  batteryCyclesPerYear: number;

  /** Battery service life in years; capex amortizes over lifetime cycles */
  batteryLifetimeYears: number;

  /** How strongly curtailment dampens VRE additions (default 2.0).
   *  damping = max(0.1, 1 - curtailmentPenalty × laggedCurtailmentRate) */
  curtailmentPenalty: number;

  /** How strongly curtailment boosts battery target (default 2.0).
   *  storagePressure = 1 + curtailmentStorageBoost × laggedCurtailmentRate */
  curtailmentStorageBoost: number;

  /** Risk premium over interest rate for energy project WACC */
  riskPremium: number;

  /** Base WACC used for LCOE calibration (no adjustment when effective WACC equals this) */
  baseWACC: number;

  /** Floor on effective WACC */
  minWACC: number;

  /** Multiplier on all regional financing spreads (0 = frictionless capital markets) */
  financingSpreadScale: number;

  /** Fraction of a region's savings-rate gap vs the world that passes into its
   *  financing spread (Feldstein-Horioka home bias; 0 = perfect capital mobility) */
  financingHomeBias: number;

  /** Fraction of LCOE that is capital cost, by source */
  capitalIntensity: Record<EnergySource, number>;

  /** Long-duration storage (iron-air, compressed air, pumped hydro, etc.) */
  longStorage: {
    cost0: number;             // $/kWh initial cost (2025)
    alpha: number;             // Wright's Law learning exponent
    growthRate: number;        // Max annual capacity growth rate
    duration: number;          // Hours of storage duration (100h)
    capacity2025: Record<Region, number>;  // GWh per region
  };

  /** Site quality degradation — capacity factor declines with cumulative deployment */
  siteDepletion: {
    solarDepletion: number;        // Max CF reduction fraction (0.30 = 30% at full potential)
    windDepletion: number;         // Max CF reduction fraction
    solarPotential: Record<Region, number>;  // GW of good-quality sites per region
    windPotential: Record<Region, number>;   // GW of good-quality sites per region
  };
}

/**
 * Regional 2025 Capacity Defaults (GW; GWh for battery)
 *
 * Based on IEA World Energy Outlook 2024 and IRENA statistics.
 * 8-region split from original 4-region (EM → india+latam+seasia, ROW → russia+mena+ssa).
 */
const REGIONAL_CAPACITY_2025: Record<EnergySource, Record<Region, number>> = {
  solar:   { oecd: 600, china: 600, india: 90,  latam: 40,  seasia: 35,  russia: 5,   mena: 30,  ssa: 8 },
  wind:    { oecd: 500, china: 400, india: 42,  latam: 22,  seasia: 5,   russia: 2,   mena: 12,  ssa: 5 },
  gas:     { oecd: 1000,china: 200, india: 70,  latam: 120, seasia: 130, russia: 220, mena: 220, ssa: 45 },
  coal:    { oecd: 400, china: 1200,india: 270, latam: 20,  seasia: 100, russia: 45,  mena: 20,  ssa: 55 },
  nuclear: { oecd: 300, china: 60,  india: 8,   latam: 5,   seasia: 0,   russia: 12,  mena: 5,   ssa: 2 },
  hydro:   { oecd: 400, china: 400, india: 55,  latam: 200, seasia: 100, russia: 60,  mena: 50,  ssa: 40 },
  battery: { oecd: 100, china: 80,  india: 5,   latam: 2,   seasia: 3,   russia: 1,   mena: 2,   ssa: 2 },
};

/**
 * Regional Carbon Price Defaults ($/ton CO2)
 *
 * Based on World Bank Carbon Pricing Dashboard 2024.
 */
const REGIONAL_CARBON_PRICES: Record<Region, number> = {
  oecd: 50,
  china: 15,
  india: 5,
  latam: 10,
  seasia: 5,
  russia: 0,
  mena: 0,
  ssa: 0,
};

/**
 * Regional Financing Spreads — static risk residual (fraction, over the
 * global rate)
 *
 * A region's total spread = static residual + financingHomeBias x (world
 * savings rate - regional savings rate). The observed totals are calibrated
 * to the IEA Cost of Capital Observatory (2024: nominal WACC ~6-7% advanced
 * economies vs ~10-15% EMDE, Africa highest) and Steffen (2020, Energy
 * Economics) renewable project-finance survey; IRENA Renewable Power
 * Generation Costs 2023 uses 3.5-11% WACC assumptions across country tiers.
 *
 * The static residuals below are the observed 2025 totals minus the
 * home-bias component at the model's 2025 savings rates (home bias 0.15,
 * world savings 29.8%), so 2025 total spreads reproduce the observed values
 * by construction and evolve thereafter with regional savings:
 *
 *   region  observed  savings gap  home-bias  static residual
 *   oecd    -0.010      +3.7pp      +0.006      -0.016
 *   china   -0.015     -15.0pp      -0.022      +0.007
 *   india   +0.020      +1.2pp      +0.002      +0.018
 *   latam   +0.030      +6.4pp      +0.010      +0.020
 *   seasia  +0.025      +3.4pp      +0.005      +0.020
 *   russia  +0.050      +4.9pp      +0.007      +0.043
 *   mena    +0.010      -1.8pp      -0.003      +0.013
 *   ssa     +0.060     +16.2pp      +0.024      +0.036
 *
 * The residual carries sovereign, currency, and off-taker risk: China's is
 * slightly positive (its cheap capital is entirely a savings/state-credit
 * story), Russia's stays large (sanctions-era isolation), MENA blends cheap
 * Gulf auction finance with expensive North African markets.
 */
const REGIONAL_FINANCING_SPREADS: Record<Region, number> = {
  oecd: -0.016,
  china: 0.007,
  india: 0.018,
  latam: 0.020,
  seasia: 0.020,
  russia: 0.043,
  mena: 0.013,
  ssa: 0.036,
};

/**
 * Regional Solar Capacity Factors
 *
 * Based on latitude and irradiance. MENA has world's best solar (0.24).
 * Russia has poor solar (0.11).
 */
const REGIONAL_SOLAR_CF: Record<Region, number> = {
  oecd: 0.18,
  china: 0.17,
  india: 0.20,
  latam: 0.21,
  seasia: 0.18,
  russia: 0.11,
  mena: 0.24,
  ssa: 0.22,
};

export const energyDefaults: EnergyParams = {
  sources: {
    solar: {
      name: 'Solar PV',
      cost0: 35,             // $/MWh unsubsidized utility PV, Lazard LCOE+ 2024 low end; hardware $23 + soft $12
      alpha: 0.36,           // 22% learning/doubling; Way et al. 2022, OWID 1976-2019 (~20%) — see sources/energy-learning-rates.md
      softFloor: 12,         // $/MWh BOS/soft-cost floor; SETS terminal 2100 LCOE ~1:1. Contested & likely biased high — wide band ~$6-18, test downward. See interface note + sources/wrights-law-empirics-and-floors.md
      referenceCF: 0.20,     // CF adjustment: worse sites → higher effective LCOE
      capacity2025: REGIONAL_CAPACITY_2025.solar,
      carbonIntensity: 0,
    },
    wind: {
      name: 'Wind',
      cost0: 35,             // $/MWh unsubsidized onshore, Lazard LCOE+ 2024 low-mid; hardware $20 + soft $15
      alpha: 0.23,           // ~15% learning/doubling; lit. range 10-19% — see sources/energy-learning-rates.md
      softFloor: 15,         // $/MWh BOS/soft-cost floor (> solar: complex install, maintenance). Contested — wide band. See interface note.
      referenceCF: 0.30,     // CF adjustment for site quality degradation
      capacity2025: REGIONAL_CAPACITY_2025.wind,
      carbonIntensity: 0,
    },
    gas: {
      name: 'Natural Gas',
      cost0: 45,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,        // No CF adjustment (dispatchable)
      capacity2025: REGIONAL_CAPACITY_2025.gas,
      carbonIntensity: 400,
      eroei0: 30,
      // 2025 fleet (sum of capacity2025) x 0.01/yr exhausts this budget on
      // the ~48-year proved-reserves R/P timescale (EI Statistical Review of
      // World Energy 2024: ~188 tcm reserves / ~4.0 tcm/yr production).
      // Pinned by the R/P calibration test in energy.test.ts.
      reserves: 960,
    },
    coal: {
      name: 'Coal',
      cost0: 40,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,
      capacity2025: REGIONAL_CAPACITY_2025.coal,
      carbonIntensity: 900,
      eroei0: 25,
      // 2025 fleet x 0.01/yr exhausts this budget on the ~125-year
      // proved-reserves R/P timescale (EI Statistical Review 2024: ~1,074 Gt
      // reserves / ~8.7 Gt/yr production). Pinned by the R/P calibration
      // test in energy.test.ts.
      reserves: 2640,
    },
    nuclear: {
      name: 'Nuclear',
      cost0: 90,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,
      capacity2025: REGIONAL_CAPACITY_2025.nuclear,
      carbonIntensity: 0,
    },
    hydro: {
      name: 'Hydroelectric',
      cost0: 40,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,
      capacity2025: REGIONAL_CAPACITY_2025.hydro,
      carbonIntensity: 0,
    },
    battery: {
      name: 'Battery Storage',
      cost0: 140,            // $/kWh pack, BNEF battery price survey 2023 ($139/kWh); hardware $120 + soft $20
      alpha: 0.26,           // ~17% learning/doubling; Ziegler & Trancik 2021 find ~24% at cell level, pack lower
      softFloor: 20,         // $/kWh BOS floor (BMS, pack assembly, install). INERT on the baseline transition — never binds (sweep: 10/20/40 identical). See interface note.
      referenceCF: 0,        // No CF adjustment (dispatchable)
      capacity2025: REGIONAL_CAPACITY_2025.battery,
      carbonIntensity: 0,
    },
  },

  // Regional policy parameters
  regional: {
    oecd:   { carbonPrice: REGIONAL_CARBON_PRICES.oecd,   capacityFactor: { solar: REGIONAL_SOLAR_CF.oecd },   financingSpread: REGIONAL_FINANCING_SPREADS.oecd   },
    china:  { carbonPrice: REGIONAL_CARBON_PRICES.china,  capacityFactor: { solar: REGIONAL_SOLAR_CF.china },  financingSpread: REGIONAL_FINANCING_SPREADS.china  },
    india:  { carbonPrice: REGIONAL_CARBON_PRICES.india,  capacityFactor: { solar: REGIONAL_SOLAR_CF.india },  financingSpread: REGIONAL_FINANCING_SPREADS.india  },
    latam:  { carbonPrice: REGIONAL_CARBON_PRICES.latam,  capacityFactor: { solar: REGIONAL_SOLAR_CF.latam },  financingSpread: REGIONAL_FINANCING_SPREADS.latam  },
    seasia: { carbonPrice: REGIONAL_CARBON_PRICES.seasia, capacityFactor: { solar: REGIONAL_SOLAR_CF.seasia }, financingSpread: REGIONAL_FINANCING_SPREADS.seasia },
    russia: { carbonPrice: REGIONAL_CARBON_PRICES.russia, capacityFactor: { solar: REGIONAL_SOLAR_CF.russia }, financingSpread: REGIONAL_FINANCING_SPREADS.russia },
    mena:   { carbonPrice: REGIONAL_CARBON_PRICES.mena,   capacityFactor: { solar: REGIONAL_SOLAR_CF.mena },   financingSpread: REGIONAL_FINANCING_SPREADS.mena   },
    ssa:    { carbonPrice: REGIONAL_CARBON_PRICES.ssa,    capacityFactor: { solar: REGIONAL_SOLAR_CF.ssa },    financingSpread: REGIONAL_FINANCING_SPREADS.ssa    },
  },

  // EROI assumptions (used for net energy fraction). Contested literature:
  // ranges span Weißbach et al. (2013, buffered vs unbuffered) to
  // Murphy & Hall (2010); values below sit mid-range, see docs/REFERENCES.md
  eroi: {
    solar: 20,
    wind: 25,
    nuclear: 60,
    hydro: 30,
    battery: 10,
    gas: 30,
    coal: 25,
  },

  // Global fallback carbon price (DEPRECATED - use regional)
  carbonPrice: 35,

  // Max annual capacity growth: modeling assumptions bracketing recent
  // history (solar grew ~25-40%/yr 2015-2024, IRENA; nuclear/hydro
  // supply-chain limited)
  maxGrowthRate: {
    solar: 0.30,
    wind: 0.20,
    battery: 0.40,
    nuclear: 0.05,
    hydro: 0.02,
    gas: 0.05,
    coal: 0.03,
  },
  // Asset lives in years: NREL ATB 2024 / IEA WEO assumptions (nuclear with
  // license extension; hydro civil works)
  lifetime: {
    solar: 30,
    wind: 25,
    battery: 15,
    nuclear: 60,
    hydro: 80,
    gas: 40,
    coal: 45,
  },
  batteryEfficiency: 0.85,
  batteryDuration: 4, // hours (for GWh → GW conversion)
  // Overnight capital cost $/kW ($/kWh for battery): IRENA Renewable Power
  // Generation Costs 2023 global-weighted averages (solar ~$760/kW, onshore
  // wind ~$1160/kW); nuclear is an OECD/recent-builds compromise
  capex: {
    solar: 800,
    wind: 1200,
    battery: 150,
    nuclear: 6000,
    hydro: 2000,
    gas: 800,
    coal: 2000,
  },

  // Investment constraint parameters
  cleanEnergyShare2025: 0.15,     // 15% of investment to clean energy in 2025
  cleanEnergyShareGrowth: 0.15,   // Grows to 30% by 2050
  gridLossFactor: 1.25,           // = dispatch gridLossFactor (pinned); capacity planned on generation basis
  cleanShareFlex: 0,              // default off: exogenous ramp only (calibrated baseline)
  cleanShareMax: 0.30,            // matches the ramp's own 2050 endpoint when flex is off
  capexLearningRate: 0.02,        // 2% CAPEX decline per year for solar/wind/battery

  // Demand-driven capacity
  demandFillRate: 0.30,           // Fill 30% of demand gap per year
  competitiveThreshold: 1.20,     // Build if LCOE within 20% of fossil

  // Capacity planning ceilings (how much to build, not how much to
  // generate): modeling assumptions, not sourced data
  capacityCeiling: {
    solar: 0.8,
    wind: 0.35,
    nuclear: 0.3,
    hydro: 0.2,
    gas: 1.0,
    coal: 1.0,
    battery: 1.0,
  },

  // Battery LCOE cycles
  batteryCyclesPerYear: 365,
  batteryLifetimeYears: 15,  // Grid LFP calendar life ~15yr / ~5000 cycles, NREL Storage Futures (2023)

  // Curtailment feedback: dampen VRE additions when curtailment is high
  curtailmentPenalty: 2.0,         // At 30% curtailment: additions × 0.4; at 50%: × 0.1 (floor)
  curtailmentStorageBoost: 2.0,    // At 30% curtailment: battery target × 1.6; at 50%: × 2.0

  // WACC: financing cost channel for LCOE
  riskPremium: 0.02,               // 2% over risk-free (interest) rate
  baseWACC: 0.07,                  // 7% baseline — LCOE calibrated at this rate
  minWACC: 0.03,                   // Floor on WACC (even in very low-rate world)
  financingSpreadScale: 1.0,       // Regional spreads applied at face value
  // Domestic savings scarcity raises the local cost of capital: savings and
  // investment stay correlated because capital is imperfectly mobile
  // (Feldstein & Horioka 1980; retention coefficients ~0.3-0.5 in recent
  // decades). 0.15 maps savings-rate gaps to price, attributing roughly a
  // third of the extreme regions' observed spread to savings scarcity.
  financingHomeBias: 0.15,
  capitalIntensity: {              // Fraction of LCOE that is capital cost
    solar: 0.85,
    wind: 0.80,
    nuclear: 0.90,
    hydro: 0.85,
    gas: 0.15,
    coal: 0.25,
    battery: 0.80,
  },

  // Long-duration storage (iron-air, CAES, etc.): modeling assumptions —
  // pre-commercial technology, costs anchored loosely to ~2x Li-ion
  longStorage: {
    cost0: 300,                // $/kWh (2025, ~2x battery)
    alpha: 0.15,               // Slower learning than Li-ion
    growthRate: 0.25,          // Max annual growth rate
    duration: 100,             // 100 hours
    capacity2025: {
      oecd: 5, china: 3, india: 1, latam: 1,
      seasia: 0.5, russia: 0.5, mena: 0.5, ssa: 0.5,
    },
  },

  // Site quality degradation: modeling assumptions (best-sites-first;
  // regional potentials are order-of-magnitude, not resource assessments)
  siteDepletion: {
    solarDepletion: 0.30,      // Best sites used first → 30% CF reduction at full potential
    windDepletion: 0.30,       // Same for wind
    solarPotential: {          // GW of good-quality solar sites per region
      oecd: 3000, china: 2500, india: 1500, latam: 2000,
      seasia: 1000, russia: 1000, mena: 2000, ssa: 2000,
    },
    windPotential: {           // GW of good-quality wind sites per region
      oecd: 1200, china: 800, india: 400, latam: 600,
      seasia: 300, russia: 800, mena: 200, ssa: 400,
    },
  },
};

// =============================================================================
// STATE
// =============================================================================

/** Regional capacity state (per region, per source) */
export interface RegionalCapacityState {
  installed: number;      // Current capacity (GW or GWh) in this region
  additions: number[];    // Auditable history of annual additions
  initialCapacity: number; // Original 2025 capacity
  vintages: VintageStockState;
}

/** Global learning state (per source) - for Wright's Law */
export interface GlobalLearningState {
  cumulative: number;     // Total ever deployed GLOBALLY (for learning)
  extracted: number;      // Fossil fuels: extracted so far (global)
}

export interface EnergyState {
  /** Regional capacity by region and source */
  regional: Record<Region, Record<EnergySource, RegionalCapacityState>>;

  /** Global cumulative for learning curves */
  global: Record<EnergySource, GlobalLearningState>;

  /** Long-duration storage regional capacity (GWh) */
  longStorageRegional: Record<Region, number>;

  /** Long-duration storage global cumulative (GWh, for learning) */
  longStorageCumulative: number;
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface EnergyInputs {
  /** Electricity demand for ceiling calculation (TWh) - GLOBAL */
  electricityDemand: number;

  /** Regional electricity demand (TWh) - for regional ceiling calculation */
  regionalElectricityDemand?: Record<Region, number>;

  /** Available investment for capacity ($T) - GLOBAL */
  availableInvestment: number;

  /** Regional investment ($T) - for regional allocation */
  regionalInvestment?: Record<Region, number>;

  /** Mineral supply constraint 0-1 (from resources, lagged). 1 = no constraint. */
  mineralConstraint: number;

  /** Lagged curtailment rate 0-1 (from dispatch previous year). 0 = no curtailment. */
  laggedCurtailmentRate: number;

  /** Lagged real interest rate (from capital previous year) for WACC calculation */
  laggedInterestRate: number;

  /** Global savings rate this year (from capital) for the home-bias spread */
  savingsRate?: number;

  /** Regional savings rates this year (from capital) for the home-bias spread */
  regionalSavings?: Record<Region, number>;
}

export interface EnergyOutputs {
  /** Realized capex spend this year, all sources incl. fossil/storage ($T) */
  energyCapexSpend: number;
  /** Generator LCOEs ($/MWh) plus battery capital cost ($/kWh), globally learned */
  lcoes: Record<EnergySource, number>;

  /** Regional generator LCOEs ($/MWh) plus battery capital cost ($/kWh) */
  regionalLCOEs: Record<Region, Record<EnergySource, number>>;

  /** Net energy fraction by source (1 - 1/EROI) */
  netEnergyFraction: Record<EnergySource, number>;

  /** Solar + battery combined LCOE ($/MWh) */
  solarPlusBatteryLCOE: number;

  /** Installed capacity by source (GW, GWh for battery) - SUM of regional */
  capacities: Record<EnergySource, number>;

  /** Regional capacity breakdown */
  regionalCapacities: Record<Region, Record<EnergySource, number>>;

  /** Cumulative capacity (for external tracking) - GLOBAL */
  cumulativeCapacity: Record<EnergySource, number>;

  /** Capacity additions this year (GW; GWh for battery) - SUM of regional */
  additions: Record<EnergySource, number>;

  /** Regional additions breakdown */
  regionalAdditions: Record<Region, Record<EnergySource, number>>;

  /** Battery cost ($/kWh) */
  batteryCost: number;

  /** Cheapest LCOE this year ($/MWh) */
  cheapestLCOE: number;

  /** Effective solar capacity factor (capacity-weighted, after site depletion) */
  effectiveSolarCF: number;

  /** Effective wind capacity factor (capacity-weighted, after site depletion) */
  effectiveWindCF: number;

  /** Long-duration storage cost ($/kWh) */
  longStorageCost: number;

  /** Long-duration storage total capacity (GWh) */
  longStorageCapacity: number;

  /** Long-duration storage regional capacities (GWh) */
  longStorageRegional: Record<Region, number>;

  /** Effective WACC used for LCOE adjustment this year */
  effectiveWACC: number;

  /** Effective WACC by region (global rate + regional financing spread) */
  regionalWACC: Record<Region, number>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get global cumulative capacity for learning curves
 */
function getGlobalCumulative2025(params: EnergyParams, source: EnergySource): number {
  let total = 0;
  for (const region of REGIONS) {
    total += params.sources[source].capacity2025[region];
  }
  return total;
}

/**
 * Get global long storage cumulative capacity for learning curves
 */
function getGlobalLongStorageCumulative2025(params: EnergyParams): number {
  let total = 0;
  for (const region of REGIONS) {
    total += params.longStorage.capacity2025[region] ?? 0;
  }
  return total;
}

/** Annual capital-recovery factor for an asset with a finite service life. */
export function capitalRecoveryFactor(rate: number, lifetimeYears: number): number {
  if (rate < 0.001) return 1 / lifetimeYears;
  return rate / (1 - Math.pow(1 + rate, -lifetimeYears));
}

/**
 * Convert storage capital cost ($/kWh of energy capacity) to incremental
 * levelized storage service cost ($/MWh cycled).
 */
export function levelizedStorageCostPerMWh(
  costPerKWh: number,
  wacc: number,
  lifetimeYears: number,
  cyclesPerYear: number,
): number {
  return (costPerKWh * 1000 * capitalRecoveryFactor(wacc, lifetimeYears)) /
    cyclesPerYear;
}

/**
 * Get base regional capacity factor (with regional override, before site depletion)
 */
function getBaseRegionalCapacityFactor(
  params: EnergyParams,
  region: Region,
  source: EnergySource
): number {
  // Check for regional override
  const regionalCF = params.regional[region].capacityFactor?.[source];
  if (regionalCF !== undefined) return regionalCF;

  // Default capacity factors
  switch (source) {
    case 'solar': return 0.20;
    case 'wind': return 0.30;
    case 'nuclear': return 0.83;
    case 'hydro': return 0.38;
    default: return 0.50;
  }
}

/**
 * Get effective regional capacity factor with site quality degradation.
 * Best sites are used first; as cumulative deployment approaches regional potential,
 * capacity factor declines.
 *
 * effectiveCF = baseCF × (1 - depletion × min(1, cumCapacity / regionalPotential))
 */
function getRegionalCapacityFactor(
  params: EnergyParams,
  region: Region,
  source: EnergySource,
  installedCapacity?: number
): number {
  const baseCF = getBaseRegionalCapacityFactor(params, region, source);

  // Only apply site depletion to solar and wind
  if (installedCapacity !== undefined && (source === 'solar' || source === 'wind')) {
    const depletion = source === 'solar'
      ? params.siteDepletion.solarDepletion
      : params.siteDepletion.windDepletion;
    const potential = source === 'solar'
      ? params.siteDepletion.solarPotential[region]
      : params.siteDepletion.windPotential[region];
    const depletionFraction = Math.min(1, installedCapacity / potential);
    return baseCF * (1 - depletion * depletionFraction);
  }

  return baseCF;
}

/**
 * Get regional max growth rate (with regional override)
 */
function getRegionalMaxGrowth(
  params: EnergyParams,
  region: Region,
  source: EnergySource
): number {
  // Check for regional override
  const regionalGrowth = params.regional[region].maxGrowthRate?.[source];
  if (regionalGrowth !== undefined) return regionalGrowth;

  // Use global default
  return params.maxGrowthRate[source];
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const energyModule: Module<
  EnergyParams,
  EnergyState,
  EnergyInputs,
  EnergyOutputs
> = defineModule<EnergyParams, EnergyState, EnergyInputs, EnergyOutputs>({
  name: 'energy',
  description: 'Regional capacity with global learning curves',

  defaults: energyDefaults,

  paramMeta: {
    carbonPrice: {
      description: 'Carbon tax applied to fossil fuel generation. Higher values accelerate clean energy transition.',
      unit: '$/ton CO₂',
      range: { min: 0, max: 300, default: 35 },
      tier: 1 as const,
    },
    cleanShareFlex: {
      description: 'Endogenous energy-capex share: fraction of unmet desired clean build the investment share expands to cover, competing for the investment pool. 0 = exogenous 15%→30% ramp only (calibrated baseline). Expanded spend is debited from general capital formation via the lagged energyCapexSpend ledger (crowding-out is real). Used by the ai-energy-boom scenario.',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0 },
      tier: 1 as const,
    },
    cleanShareMax: {
      description: 'Ceiling on the share of total investment that energy capex may claim when cleanShareFlex > 0.',
      unit: 'fraction',
      range: { min: 0.05, max: 0.9, default: 0.30 },
      tier: 1 as const,
    },
    sources: {
      solar: {
        alpha: {
          paramName: 'solarAlpha',
          description: "Wright's Law learning exponent for solar. 0.36 means 22% cost reduction per capacity doubling.",
          unit: 'dimensionless',
          range: { min: 0.1, max: 0.5, default: 0.36 },
          tier: 1 as const,
        },
      },
      wind: {
        alpha: {
          paramName: 'windAlpha',
          description: "Wright's Law learning exponent for wind. Lower than solar due to mature technology.",
          unit: 'dimensionless',
          range: { min: 0.1, max: 0.4, default: 0.23 },
          tier: 1 as const,
        },
      },
      battery: {
        alpha: {
          paramName: 'batteryAlpha',
          description: "Wright's Law learning exponent for battery storage.",
          unit: 'dimensionless',
          range: { min: 0.1, max: 0.4, default: 0.26 },
          tier: 1 as const,
        },
      },
    },
    curtailmentPenalty: {
      description: 'How strongly curtailment dampens VRE additions. At 30% curtailment and penalty=2: additions reduced 60%.',
      unit: 'dimensionless',
      range: { min: 0, max: 5, default: 2.0 },
      tier: 1 as const,
    },
    riskPremium: {
      description: 'Risk premium over interest rate for energy project WACC. Higher values penalize capital-intensive sources.',
      unit: 'fraction',
      range: { min: 0, max: 0.10, default: 0.02 },
      tier: 1 as const,
    },
    baseWACC: {
      description: 'Baseline WACC at which LCOEs are calibrated. No LCOE adjustment when effective WACC equals this.',
      unit: 'fraction',
      range: { min: 0.03, max: 0.15, default: 0.07 },
      tier: 1 as const,
    },
    minWACC: {
      description: 'Floor on effective WACC. Prevents unrealistically cheap financing.',
      unit: 'fraction',
      range: { min: 0.01, max: 0.10, default: 0.03 },
      tier: 1 as const,
    },
    financingSpreadScale: {
      description: 'Multiplier on regional financing spreads over the global rate. 0 = frictionless global capital market, 1 = observed spreads, >1 = fragmentation.',
      unit: 'dimensionless',
      range: { min: 0, max: 3, default: 1.0 },
      tier: 1 as const,
    },
    financingHomeBias: {
      description: 'Fraction of a region\'s savings-rate gap vs the world that passes into its financing spread. 0 = perfect capital mobility (Feldstein-Horioka home bias).',
      unit: 'dimensionless',
      range: { min: 0, max: 1, default: 0.15 },
      tier: 2 as const,
    },
    regional: {
      oecd: {
        carbonPrice: {
          paramName: 'oecdCarbonPrice',
          description: 'Carbon price for OECD region (EU ETS ~80, US implicit ~25, blended ~50).',
          unit: '$/ton CO₂',
          range: { min: 0, max: 300, default: 50 },
          tier: 1 as const,
        },
      },
      china: {
        carbonPrice: {
          paramName: 'chinaCarbonPrice',
          description: 'Carbon price for China (nascent national ETS).',
          unit: '$/ton CO₂',
          range: { min: 0, max: 300, default: 15 },
          tier: 1 as const,
        },
      },
      india: {
        carbonPrice: {
          paramName: 'indiaCarbonPrice',
          description: 'Carbon price for India + South Asia. Limited carbon pricing.',
          unit: '$/ton CO₂',
          range: { min: 0, max: 300, default: 5 },
          tier: 1 as const,
        },
      },
    },
  },

  connectorTypes: {
    inputs: {
      electricityDemand: unitPort('TWh/year'),
      regionalElectricityDemand: unitPort('TWh/year', 'record'),
      availableInvestment: unitPort('$T/year'),
      regionalInvestment: unitPort('$T/year', 'record'),
      mineralConstraint: unitPort('fraction'),
      laggedCurtailmentRate: unitPort('fraction'),
      laggedInterestRate: unitPort('fraction'),
      savingsRate: unitPort('fraction'),
      regionalSavings: unitPort('fraction', 'record'),
    },
    outputs: {
      lcoes: ENERGY_LCOE_PORT,
      regionalLCOEs: REGIONAL_ENERGY_LCOE_PORT,
      netEnergyFraction: unitPort('fraction', 'record'),
      solarPlusBatteryLCOE: unitPort('$/MWh'),
      capacities: ENERGY_CAPACITY_PORT,
      energyCapexSpend: unitPort('$T/year'),
      regionalCapacities: REGIONAL_ENERGY_CAPACITY_PORT,
      cumulativeCapacity: ENERGY_CAPACITY_PORT,
      additions: ENERGY_ADDITION_PORT,
      regionalAdditions: REGIONAL_ENERGY_ADDITION_PORT,
      batteryCost: unitPort('$/kWh'),
      cheapestLCOE: unitPort('$/MWh'),
      effectiveSolarCF: unitPort('fraction'),
      effectiveWindCF: unitPort('fraction'),
      longStorageCost: unitPort('$/kWh'),
      longStorageCapacity: unitPort('GWh'),
      longStorageRegional: unitPort('GWh', 'record'),
      effectiveWACC: unitPort('fraction'),
      regionalWACC: unitPort('fraction', 'record'),
    },
  },

  validate(params: Partial<EnergyParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const p = {
      ...energyDefaults,
      ...params,
      eroi: { ...energyDefaults.eroi, ...(params.eroi ?? {}) },
      lifetime: { ...energyDefaults.lifetime, ...(params.lifetime ?? {}) },
    };

    // Validate regional carbon prices
    if (p.regional) {
      for (const region of REGIONS) {
        const rp = p.regional[region];
        if (rp && rp.carbonPrice < 0) {
          errors.push(`regional.${region}.carbonPrice cannot be negative`);
        }
        if (rp && rp.carbonPrice > 500) {
          warnings.push(`regional.${region}.carbonPrice ${rp.carbonPrice} unusually high`);
        }
      }
    }

    // Legacy: validate global carbonPrice
    if (p.carbonPrice < 0) {
      errors.push('carbonPrice cannot be negative');
    }
    if (p.carbonPrice > 500) {
      warnings.push(`carbonPrice ${p.carbonPrice} unusually high`);
    }

    // Endogenous capex share
    if (p.cleanShareFlex < 0 || p.cleanShareFlex > 1) {
      errors.push('cleanShareFlex must be between 0 and 1');
    }
    if (p.cleanShareMax < 0.05 || p.cleanShareMax > 0.9) {
      errors.push('cleanShareMax must be between 0.05 and 0.9');
    }
    if (p.cleanShareFlex > 0 &&
        p.cleanShareMax < p.cleanEnergyShare2025 + p.cleanEnergyShareGrowth) {
      warnings.push('cleanShareMax below the exogenous ramp endpoint — flex will never expand the budget');
    }

    for (const source of ENERGY_SOURCES) {
      const s = p.sources[source];
      if (s.alpha < 0 || s.alpha > 1) {
        errors.push(`sources.${source}.alpha must be 0-1`);
      }
      if (s.cost0 < 0) {
        errors.push(`sources.${source}.cost0 cannot be negative`);
      }
      const lifetime = p.lifetime[source];
      if (!Number.isInteger(lifetime) || lifetime < 1) {
        errors.push(`lifetime.${source} must be an integer number of years >= 1`);
      }
      const eroi = p.eroi[source];
      if (eroi !== undefined && eroi <= 1) {
        errors.push(`eroi.${source} must be > 1`);
      }
    }

    // Curtailment feedback
    if (p.curtailmentPenalty !== undefined && p.curtailmentPenalty < 0) {
      errors.push('curtailmentPenalty cannot be negative');
    }
    // Battery LCOS
    if (p.batteryCyclesPerYear !== undefined && p.batteryCyclesPerYear <= 0) {
      errors.push('batteryCyclesPerYear must be positive');
    }
    if (p.batteryLifetimeYears !== undefined && p.batteryLifetimeYears <= 0) {
      errors.push('batteryLifetimeYears must be positive');
    }
    // WACC
    if (p.riskPremium !== undefined && p.riskPremium < 0) {
      errors.push('riskPremium cannot be negative');
    }
    if (p.baseWACC !== undefined && p.baseWACC <= 0) {
      errors.push('baseWACC must be positive');
    }
    if (p.minWACC !== undefined && p.minWACC < 0) {
      errors.push('minWACC cannot be negative');
    }
    if (p.financingSpreadScale !== undefined &&
        (!Number.isFinite(p.financingSpreadScale) || p.financingSpreadScale < 0 || p.financingSpreadScale > 3)) {
      errors.push('financingSpreadScale must be between 0 and 3');
    }
    if (p.financingHomeBias !== undefined &&
        (!Number.isFinite(p.financingHomeBias) || p.financingHomeBias < 0 || p.financingHomeBias > 1)) {
      errors.push('financingHomeBias must be between 0 and 1');
    }
    if (p.regional) {
      for (const region of REGIONS) {
        const spread = p.regional[region]?.financingSpread;
        if (spread !== undefined && (!Number.isFinite(spread) || spread < -0.05 || spread > 0.20)) {
          errors.push(`financingSpread for ${region} must be between -0.05 and 0.20`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<EnergyParams>): EnergyParams {
    return validatedMerge('energy', this.validate, (p) => {
      const result = { ...energyDefaults, ...p };

      // Deep merge sources
      if (p.sources) {
        result.sources = { ...energyDefaults.sources };
        for (const source of ENERGY_SOURCES) {
          if (p.sources[source]) {
            result.sources[source] = {
              ...energyDefaults.sources[source],
              ...p.sources[source],
            };
            // Deep merge regional capacity2025
            if (p.sources[source].capacity2025) {
              result.sources[source].capacity2025 = {
                ...energyDefaults.sources[source].capacity2025,
                ...p.sources[source].capacity2025,
              };
            }
          }
        }
      }

      // Deep merge regional params
      if (p.regional) {
        result.regional = { ...energyDefaults.regional };
        for (const region of REGIONS) {
          if (p.regional[region]) {
            result.regional[region] = {
              ...energyDefaults.regional[region],
              ...p.regional[region],
            };
            if (p.regional[region].maxGrowthRate) {
              result.regional[region].maxGrowthRate = {
                ...energyDefaults.regional[region].maxGrowthRate,
                ...p.regional[region].maxGrowthRate,
              };
            }
            if (p.regional[region].capacityFactor) {
              result.regional[region].capacityFactor = {
                ...energyDefaults.regional[region].capacityFactor,
                ...p.regional[region].capacityFactor,
              };
            }
          }
        }
      }

      // Deep merge other records
      if (p.maxGrowthRate) {
        result.maxGrowthRate = { ...energyDefaults.maxGrowthRate, ...p.maxGrowthRate };
      }
      if (p.lifetime) {
        result.lifetime = { ...energyDefaults.lifetime, ...p.lifetime };
      }
      if (p.capex) {
        result.capex = { ...energyDefaults.capex, ...p.capex };
      }
      if (p.eroi) {
        result.eroi = { ...energyDefaults.eroi, ...p.eroi };
      }
      if (p.capacityCeiling) {
        result.capacityCeiling = { ...energyDefaults.capacityCeiling, ...p.capacityCeiling };
      }
      if (p.capitalIntensity) {
        result.capitalIntensity = { ...energyDefaults.capitalIntensity, ...p.capitalIntensity };
      }
      if (p.longStorage) {
        result.longStorage = { ...energyDefaults.longStorage, ...p.longStorage };
        if (p.longStorage.capacity2025) {
          result.longStorage.capacity2025 = { ...energyDefaults.longStorage.capacity2025, ...p.longStorage.capacity2025 };
        }
      }
      if (p.siteDepletion) {
        result.siteDepletion = { ...energyDefaults.siteDepletion, ...p.siteDepletion };
        if (p.siteDepletion.solarPotential) {
          result.siteDepletion.solarPotential = { ...energyDefaults.siteDepletion.solarPotential, ...p.siteDepletion.solarPotential };
        }
        if (p.siteDepletion.windPotential) {
          result.siteDepletion.windPotential = { ...energyDefaults.siteDepletion.windPotential, ...p.siteDepletion.windPotential };
        }
      }

      return result;
    }, partial);
  },

  init(params: EnergyParams): EnergyState {
    // Initialize regional capacity state
    const regional: Record<Region, Record<EnergySource, RegionalCapacityState>> = {} as any;
    for (const region of REGIONS) {
      regional[region] = {} as any;
      for (const source of ENERGY_SOURCES) {
        const cap2025 = params.sources[source].capacity2025[region];
        regional[region][source] = {
          installed: cap2025,
          additions: [],
          initialCapacity: cap2025,
          vintages: createVintageStock({
            unit: source === 'battery' ? 'GWh' : 'GW',
            initialStock: cap2025,
            serviceLifeSteps: params.lifetime[source],
            initialRetirementProfile: 'uniform',
            idPrefix: `${region}-${source}-opening`,
          }),
        };
      }
    }

    // Initialize global learning state
    const global: Record<EnergySource, GlobalLearningState> = {} as any;
    for (const source of ENERGY_SOURCES) {
      const globalCumulative = getGlobalCumulative2025(params, source);
      global[source] = {
        cumulative: globalCumulative,
        extracted: 0,
      };
    }

    // Initialize long-duration storage
    const longStorageRegional: Record<Region, number> = {} as any;
    let longStorageCumulative = 0;
    for (const region of REGIONS) {
      const cap = params.longStorage.capacity2025[region] ?? 0;
      longStorageRegional[region] = cap;
      longStorageCumulative += cap;
    }

    return { regional, global, longStorageRegional, longStorageCumulative };
  },

  step(state, inputs, params, year, yearIndex) {
    const { electricityDemand, availableInvestment } = inputs;

    // Distribute demand/investment to regions if not provided
    const regionalDemand = inputs.regionalElectricityDemand ?? distributeByGDP(electricityDemand);
    const regionalInvestment = inputs.regionalInvestment ?? distributeByGDP(availableInvestment);

    // Output accumulators
    const lcoes: Record<EnergySource, number> = {} as any;
    const netEnergyFraction: Record<EnergySource, number> = {} as any;
    const globalCapacities: Record<EnergySource, number> = {} as any;
    const globalAdditions: Record<EnergySource, number> = {} as any;
    const cumulativeCapacity: Record<EnergySource, number> = {} as any;

    const regionalCapacities: Record<Region, Record<EnergySource, number>> = {} as any;
    const regionalAdditions: Record<Region, Record<EnergySource, number>> = {} as any;

    // New state
    const newRegional: Record<Region, Record<EnergySource, RegionalCapacityState>> = {} as any;
    const newGlobal: Record<EnergySource, GlobalLearningState> = {} as any;

    // Initialize outputs
    for (const source of ENERGY_SOURCES) {
      globalCapacities[source] = 0;
      globalAdditions[source] = 0;
    }
    for (const region of REGIONS) {
      regionalCapacities[region] = {} as any;
      regionalAdditions[region] = {} as any;
      newRegional[region] = {} as any;
    }

    // =========================================================================
    // Calculate GLOBAL LCOEs (Wright's Law on global cumulative)
    // =========================================================================

    for (const source of ENERGY_SOURCES) {
      const s = params.sources[source];
      const globalState = state.global[source];
      const prevCumulative = globalState.cumulative;
      const globalCumulative2025 = getGlobalCumulative2025(params, source);

      let lcoe: number;
      if (s.alpha > 0) {
        // Learning curve (solar, wind, battery) - GLOBAL cumulative
        // Wright's Law applies only to hardware portion; soft costs are irreducible
        const ratio = prevCumulative / globalCumulative2025;
        const hardwareCost = s.cost0 - s.softFloor;
        lcoe = hardwareCost * Math.pow(Math.max(1, ratio), -s.alpha) + s.softFloor;
        const eroi = params.eroi[source];
        netEnergyFraction[source] = eroi > 1 ? 1 - 1 / eroi : 0;
      } else if (s.eroei0 !== undefined && s.reserves !== undefined) {
        // Fossil fuel with depletion - GLOBAL extraction
        const dep = depletion(s.reserves, globalState.extracted, s.eroei0);
        const baseCost = s.cost0 / dep.netEnergyFraction;
        // Note: carbon cost added regionally below
        lcoe = baseCost;
        netEnergyFraction[source] = dep.netEnergyFraction;
      } else {
        // Fixed cost (nuclear, hydro)
        lcoe = s.cost0;
        const eroi = params.eroi[source];
        netEnergyFraction[source] = eroi > 1 ? 1 - 1 / eroi : 0;
      }

      lcoes[source] = lcoe;
    }

    // =========================================================================
    // WACC adjustment: financing cost affects capital-intensive sources more
    // =========================================================================

    const laggedInterestRate = inputs.laggedInterestRate ?? 0.05;
    const waccAt = (spread: number): number =>
      Math.max(params.minWACC, laggedInterestRate + params.riskPremium + spread);
    const effectiveWACC = waccAt(0);

    // Capital recovery factor: CRF(r, n) = r / (1 - (1+r)^(-n))
    const PROJECT_LIFE = 25; // years, generic generation asset
    const crfBase = capitalRecoveryFactor(params.baseWACC, PROJECT_LIFE);

    // Adjust LCOE for the capital-intensity-weighted portion only, so soft
    // floor bounds are respected. The CRF ratio depends only on the WACC, so
    // callers precompute it once per WACC (global, then per region below).
    const waccAdjustedLCOE = (baseLCOE: number, source: EnergySource, crfRatio: number): number => {
      const ci = params.capitalIntensity[source] ?? 0;
      const capitalPortion = baseLCOE * ci;
      const nonCapitalPortion = baseLCOE * (1 - ci);
      return capitalPortion * crfRatio + nonCapitalPortion;
    };

    // Pre-adjustment LCOEs are the basis for the regional adjustment.
    const preWaccLcoes = { ...lcoes };
    const crfGlobalRatio =
      capitalRecoveryFactor(effectiveWACC, PROJECT_LIFE) / crfBase;
    for (const source of ENERGY_SOURCES) {
      // Battery is an up-front energy-capacity cost ($/kWh), not a generator
      // LCOE. Financing enters when that cost is converted to LCOS below.
      lcoes[source] = source === 'battery'
        ? preWaccLcoes[source]
        : waccAdjustedLCOE(preWaccLcoes[source], source, crfGlobalRatio);
    }

    // Regional financing spreads over the global rate: a static residual for
    // sovereign/currency/off-taker risk (IEA Cost of Capital Observatory;
    // Steffen 2020) plus a home-bias term — regions whose domestic savings
    // are scarce relative to the world pool pay more for capital
    // (Feldstein & Horioka 1980).
    const regionalWACC = {} as Record<Region, number>;
    const regionalCrfRatio = {} as Record<Region, number>;
    for (const region of REGIONS) {
      const regionalSavingsRate = inputs.regionalSavings?.[region];
      const savingsGap = inputs.savingsRate !== undefined && regionalSavingsRate !== undefined
        ? inputs.savingsRate - regionalSavingsRate
        : 0;
      const spread = ((params.regional[region].financingSpread ?? 0) +
        params.financingHomeBias * savingsGap) * params.financingSpreadScale;
      regionalWACC[region] = waccAt(spread);
      regionalCrfRatio[region] =
        capitalRecoveryFactor(regionalWACC[region], PROJECT_LIFE) / crfBase;
    }

    // =========================================================================
    // Process each region independently
    // =========================================================================

    // CAPEX learning factor (global - declines 2%/year for solar/wind/battery)
    const capexLearningFactor = Math.pow(1 - params.capexLearningRate, yearIndex);
    const effectiveCapex: Record<EnergySource, number> = {} as any;
    for (const source of ENERGY_SOURCES) {
      let capex = params.capex[source];
      if (source === 'solar' || source === 'wind' || source === 'battery') {
        capex *= capexLearningFactor;
      }
      effectiveCapex[source] = capex;
    }

    let realizedCapexB = 0; // $B, summed across regions
    const regionalLCOEs = {} as Record<Region, Record<EnergySource, number>>;

    for (const region of REGIONS) {
      const regionParams = params.regional[region];
      // Plan capacity on the GENERATION basis dispatch will request
      // (delivered demand x grid losses/own use) — without this the fleet
      // is sized ~25% under what dispatch asks it to run
      const regionDemand = regionalDemand[region] * params.gridLossFactor;
      const regionInvestment = regionalInvestment[region];

      // Regional effective LCOE (regional financing cost + carbon cost + site quality)
      const regionalLCOE: Record<EnergySource, number> = {} as any;
      for (const source of ENERGY_SOURCES) {
        let lcoe = source === 'battery'
          ? preWaccLcoes[source]
          : waccAdjustedLCOE(preWaccLcoes[source], source, regionalCrfRatio[region]);
        // Add regional carbon cost for fossil fuels
        if (source === 'gas' || source === 'coal') {
          const carbonCost = (params.sources[source].carbonIntensity * regionParams.carbonPrice) / 1000;
          lcoe += carbonCost;
        }
        // Adjust for site quality degradation: worse CF → higher effective LCOE
        // A site with half the reference CF costs twice as much per MWh
        const refCF = params.sources[source].referenceCF;
        if (refCF > 0) {
          const regionState = state.regional[region][source];
          const effectiveCF = getRegionalCapacityFactor(params, region, source, regionState.installed);
          lcoe *= refCF / effectiveCF;
        }
        regionalLCOE[source] = lcoe;
      }
      regionalLCOEs[region] = regionalLCOE;
      const regionalBatteryLCOS = levelizedStorageCostPerMWh(
        regionalLCOE.battery,
        regionalWACC[region],
        params.batteryLifetimeYears,
        params.batteryCyclesPerYear,
      );
      const regionalSolarPlusBatteryLCOE =
        regionalLCOE.solar / params.batteryEfficiency + regionalBatteryLCOS;

      // Find cheapest LCOE from each side for bilateral competitiveness
      const cheapestFossilLCOE = Math.min(regionalLCOE.gas, regionalLCOE.coal);
      const cheapestCleanLCOE = Math.min(
        regionalLCOE.solar, regionalLCOE.wind,
        regionalLCOE.nuclear, regionalLCOE.hydro
      );

      // Clean energy share grows over time (e.g., 15% → 30% over 25 years)
      const cleanShare = params.cleanEnergyShare2025 +
        params.cleanEnergyShareGrowth * Math.min(1, yearIndex / 25);

      // Regional clean energy budget ($B); may expand below if cleanShareFlex > 0
      let cleanBudget = regionInvestment * cleanShare * 1000;

      // Calculate desired additions for this region
      const desiredAdditions: Record<EnergySource, number> = {} as any;

      for (const source of ENERGY_SOURCES) {
        const s = params.sources[source];
        const regionState = state.regional[region][source];
        const prevInstalled = regionState.installed;

        const cf = getRegionalCapacityFactor(params, region, source, regionState.installed);
        const maxPen = params.capacityCeiling[source];

        // Max useful capacity based on regional demand ceiling
        const maxUsefulGen = regionDemand * maxPen;
        let maxUsefulCapacity: number;
        if (source === 'battery') {
          const solarGW = state.regional[region].solar.installed;
          maxUsefulCapacity = solarGW * params.batteryDuration;
        } else {
          maxUsefulCapacity = (maxUsefulGen * 1000) / (cf * 8760);
        }

        // Calculate target addition
        let targetAddition: number;
        const MIN_CAPACITY_GROWTH = 0.01;

        if (source === 'battery') {
          const solarGW = state.regional[region].solar.installed;
          const solarAdditions = desiredAdditions.solar ?? 0;
          const futureSolarGW = solarGW + solarAdditions;
          // Curtailment feedback: boost battery target when curtailment is high
          const curtRate = inputs.laggedCurtailmentRate ?? 0;
          const storagePressure = 1 + params.curtailmentStorageBoost * curtRate;
          const targetBatteryGWh = futureSolarGW * params.batteryDuration * storagePressure;
          const batteryGap = Math.max(0, targetBatteryGWh - prevInstalled);

          // Keep the calibrated firmed-solar adoption threshold separate
          // from budget ranking. Both sides here are $/MWh; the actual LCOS
          // conversion below fixes the distinct $/kWh-vs-$/MWh sorting bug.
          const CALIBRATED_FIRMED_SOLAR_MARKUP = 1.5;
          const firmedSolarAdoptionProxy =
            regionalLCOE.solar * CALIBRATED_FIRMED_SOLAR_MARKUP;
          const isCompetitive =
            firmedSolarAdoptionProxy <=
            cheapestFossilLCOE * params.competitiveThreshold;

          if (isCompetitive && batteryGap > 0) {
            targetAddition = batteryGap * params.demandFillRate;
          } else {
            targetAddition = prevInstalled * MIN_CAPACITY_GROWTH;
          }
        } else {
          // Unified demand-gap targeting for all non-battery sources
          const currentGenTWh = (prevInstalled * cf * 8760) / 1000;
          const demandGapTWh = Math.max(0, maxUsefulGen - currentGenTWh);
          const demandGapGW = (demandGapTWh * 1000) / (cf * 8760);

          // Bilateral competitiveness: compare against cheapest from the other side
          const isFossil = source === 'gas' || source === 'coal';
          const otherSideLCOE = isFossil ? cheapestCleanLCOE : cheapestFossilLCOE;
          const isCompetitive = regionalLCOE[source] <= otherSideLCOE * params.competitiveThreshold;

          if (isCompetitive && demandGapGW > 0) {
            targetAddition = demandGapGW * params.demandFillRate;
            // Curtailment feedback: dampen VRE additions when curtailment is high
            if (source === 'solar' || source === 'wind') {
              const curtRate = inputs.laggedCurtailmentRate ?? 0;
              const curtailmentDamping = Math.max(0.1, 1 - params.curtailmentPenalty * curtRate);
              targetAddition *= curtailmentDamping;
            }
          } else {
            // Clean sources: small baseline growth (R&D, pilots)
            // Fossil sources: no new builds when uncompetitive
            targetAddition = isFossil ? 0 : prevInstalled * MIN_CAPACITY_GROWTH;
          }
        }

        // Regional growth cap
        const maxGrowth = getRegionalMaxGrowth(params, region, source);
        const growthCapped = prevInstalled * maxGrowth;
        const ceilingRoom = Math.max(0, maxUsefulCapacity - prevInstalled);

        let desired = Math.max(0, targetAddition);
        desired = Math.min(desired, growthCapped, ceilingRoom);

        desiredAdditions[source] = desired;
      }

      // Apply investment constraint (LCOE priority)
      // System LCOE: blend solar with solarPlusBattery based on VRE penetration.
      // At high VRE share, marginal solar needs storage — use blended cost for ranking.
      let prevVREGen = 0;
      let prevTotalGen = 0;
      for (const source of ENERGY_SOURCES) {
        if (source === 'battery') continue;
        const regionState = state.regional[region][source];
        const prevCap = regionState.installed;
        const sourceCF = getRegionalCapacityFactor(params, region, source, prevCap);
        const gen = (prevCap * sourceCF * 8760) / 1000;
        prevTotalGen += gen;
        if (source === 'solar' || source === 'wind') prevVREGen += gen;
      }
      const regionVREShare = prevTotalGen > 0 ? prevVREGen / prevTotalGen : 0;

      // Effective solar LCOE for investment ranking: blends bare solar with solar+battery
      const effectiveSolarLCOE = (1 - regionVREShare) * regionalLCOE.solar + regionVREShare * regionalSolarPlusBatteryLCOE;

      const rankingLCOE: Record<EnergySource, number> = { ...regionalLCOE };
      rankingLCOE.solar = effectiveSolarLCOE;
      rankingLCOE.battery = regionalBatteryLCOS;

      const cleanSources: EnergySource[] = ['solar', 'wind', 'battery', 'nuclear', 'hydro'];
      cleanSources.sort((a, b) => rankingLCOE[a] - rankingLCOE[b]);

      // Per-source desired spend ($B) — same cost formula as the funding
      // loop below and the realized-capex accumulation (funded x capex)
      const desiredCost: Record<EnergySource, number> = {} as any;
      for (const source of cleanSources) {
        desiredCost[source] = (desiredAdditions[source] * effectiveCapex[source]) / 1000;
      }

      // Endogenous capex share: when desired build exceeds the ramp budget,
      // energy investment competes for more of the investment pool — the share
      // expands to cover cleanShareFlex of the unmet spend, capped at
      // cleanShareMax of regional investment. flex = 0 (default) preserves
      // the exogenous ramp exactly. Expanded spend IS debited from general
      // capital formation via the lagged energyCapexSpend ledger (crowding-
      // out is real). NB: in practice the diffusion/penetration ceilings
      // usually bind before this budget does, so flex rarely changes the
      // build — see the ai-energy-boom scenario notes.
      if (params.cleanShareFlex > 0) {
        const totalDesiredCost = cleanSources.reduce((s, src) => s + desiredCost[src], 0);
        if (totalDesiredCost > cleanBudget) {
          const maxBudget = regionInvestment * params.cleanShareMax * 1000;
          cleanBudget = Math.min(
            maxBudget,
            cleanBudget + params.cleanShareFlex * (totalDesiredCost - cleanBudget)
          );
        }
      }

      let remainingBudget = cleanBudget;
      const fundedAdditions: Record<EnergySource, number> = {} as any;

      for (const source of cleanSources) {
        const cost = desiredCost[source];

        if (cost <= remainingBudget) {
          fundedAdditions[source] = desiredAdditions[source];
          remainingBudget -= cost;
        } else {
          const affordable = (remainingBudget / effectiveCapex[source]) * 1000;
          fundedAdditions[source] = affordable;
          remainingBudget = 0;
        }
      }

      fundedAdditions.gas = desiredAdditions.gas ?? 0;
      fundedAdditions.coal = desiredAdditions.coal ?? 0;

      // Apply mineral supply constraint: scale down mineral-intensive additions
      // Only affects sources that require minerals (solar, wind, battery, nuclear)
      const mc = inputs.mineralConstraint ?? 1.0;
      if (mc < 1.0) {
        for (const source of ['solar', 'wind', 'battery', 'nuclear'] as EnergySource[]) {
          fundedAdditions[source] *= mc;
        }
      }

      // Realized capex this region actually spends ($B): ALL sources —
      // fossil and storage additions cost capital too, not only the
      // clean-budget sources
      for (const source of ENERGY_SOURCES) {
        realizedCapexB += (fundedAdditions[source] * effectiveCapex[source]) / 1000;
      }

      // Calculate retirements and update regional state
      for (const source of ENERGY_SOURCES) {
        const regionState = state.regional[region][source];
        const addition = fundedAdditions[source];
        const lifetime = params.lifetime[source];
        const vintage = advanceVintageStock(regionState.vintages, {
          step: yearIndex,
          additions: addition,
          serviceLifeSteps: lifetime,
          cohortId: `${region}-${source}-${year}`,
        });
        const newInstalled = vintage.closingStock;

        newRegional[region][source] = {
          installed: newInstalled,
          additions: [...regionState.additions, addition],
          initialCapacity: regionState.initialCapacity,
          vintages: vintage.state,
        };

        regionalCapacities[region][source] = newInstalled;
        regionalAdditions[region][source] = addition;

        // Accumulate global totals
        globalCapacities[source] += newInstalled;
        globalAdditions[source] += addition;
      }
    }

    // =========================================================================
    // Compute capacity-weighted effective CFs and update dynamic EROI
    // =========================================================================

    let effectiveSolarCF = 0;
    let effectiveWindCF = 0;
    let totalSolarCap = 0;
    let totalWindCap = 0;
    const baseSolarCF = getBaseRegionalCapacityFactor(params, 'oecd', 'solar'); // global reference
    const baseWindCF = getBaseRegionalCapacityFactor(params, 'oecd', 'wind');

    for (const region of REGIONS) {
      const solarCap = newRegional[region].solar.installed;
      const windCap = newRegional[region].wind.installed;
      const solarCF = getRegionalCapacityFactor(params, region, 'solar', solarCap);
      const windCF = getRegionalCapacityFactor(params, region, 'wind', windCap);
      effectiveSolarCF += solarCF * solarCap;
      effectiveWindCF += windCF * windCap;
      totalSolarCap += solarCap;
      totalWindCap += windCap;
    }
    effectiveSolarCF = totalSolarCap > 0 ? effectiveSolarCF / totalSolarCap : baseSolarCF;
    effectiveWindCF = totalWindCap > 0 ? effectiveWindCF / totalWindCap : baseWindCF;

    // Update net energy fraction for solar/wind using dynamic EROI
    // effectiveEROI = baseEROI × (avgEffectiveCF / baseCF)
    const solarBaseEROI = params.eroi.solar;
    const windBaseEROI = params.eroi.wind;
    const dynamicSolarEROI = solarBaseEROI * (effectiveSolarCF / Math.max(0.01, baseSolarCF));
    const dynamicWindEROI = windBaseEROI * (effectiveWindCF / Math.max(0.01, baseWindCF));
    netEnergyFraction.solar = dynamicSolarEROI > 1 ? 1 - 1 / dynamicSolarEROI : 0;
    netEnergyFraction.wind = dynamicWindEROI > 1 ? 1 - 1 / dynamicWindEROI : 0;

    // =========================================================================
    // Update global learning state
    // =========================================================================

    for (const source of ENERGY_SOURCES) {
      const s = params.sources[source];
      const prevCumulative = state.global[source].cumulative;
      const newCumulative = prevCumulative + globalAdditions[source];

      let extracted = state.global[source].extracted;
      if (s.reserves !== undefined) {
        // Extraction proxy: installed capacity (GW) × 0.01 per year (budget
        // provenance at the gas/coal defaults). EROEI decline with fraction
        // remaining follows the net-energy literature (Murphy & Hall 2010;
        // Delannoy et al. 2021; Brockway et al. 2019); the sqrt exponent in
        // primitives/math.ts depletion() is a stylized midpoint.
        let globalInstalled = 0;
        for (const region of REGIONS) {
          globalInstalled += state.regional[region][source].installed;
        }
        extracted += globalInstalled * 0.01;
      }

      newGlobal[source] = {
        cumulative: newCumulative,
        extracted,
      };

      cumulativeCapacity[source] = newCumulative;
    }

    // =========================================================================
    // Calculate battery cost and solar+battery LCOE
    // =========================================================================

    const globalCumulativeBattery2025 = getGlobalCumulative2025(params, 'battery');
    const batteryRatio = state.global.battery.cumulative / globalCumulativeBattery2025;
    const batteryHardware = params.sources.battery.cost0 - params.sources.battery.softFloor;
    const batteryCost = batteryHardware *
      Math.pow(Math.max(1, batteryRatio), -params.sources.battery.alpha) +
      params.sources.battery.softFloor;

    // LCOS: annualize battery capex ($/kWh × 1000 = $/MWh of capacity) with
    // the capital recovery factor over the battery's life, then spread over
    // annual cycles. Uses the same effective WACC as every other source's
    // capital cost, so storage responds to interest rates consistently
    // (~$42/MWh at 7% WACC vs ~$26 straight-line).
    const batteryLCOEContribution = levelizedStorageCostPerMWh(
      batteryCost,
      effectiveWACC,
      params.batteryLifetimeYears,
      params.batteryCyclesPerYear,
    );
    const solarPlusBatteryLCOE =
      lcoes.solar / params.batteryEfficiency + batteryLCOEContribution;

    // =========================================================================
    // Long-duration storage (parallel track, not an EnergySource)
    // =========================================================================

    const longStorageInit = getGlobalLongStorageCumulative2025(params);
    const longStoragePrevCum = state.longStorageCumulative;
    const longStorageRatio = longStoragePrevCum / Math.max(1, longStorageInit);
    const longStorageCost = params.longStorage.cost0 *
      Math.pow(Math.max(1, longStorageRatio), -params.longStorage.alpha);

    // Size long storage to system needs: ramps when VRE > 50%
    const totalVRECap = globalCapacities.solar + globalCapacities.wind;
    const totalCap = ENERGY_SOURCES.reduce((s, src) => src === 'battery' ? s : s + globalCapacities[src], 0);
    const vreShare = totalCap > 0 ? totalVRECap / totalCap : 0;
    // Target fraction ramps 0 at VRE<50% to 0.3 at VRE>80%
    const longStorageFraction = Math.max(0, Math.min(0.3, (vreShare - 0.5) / 0.3 * 0.3));

    const newLongStorageRegional: Record<Region, number> = {} as any;
    let longStorageTotal = 0;
    let longStorageCumulativeNew = longStoragePrevCum;

    for (const region of REGIONS) {
      const prevCap = state.longStorageRegional[region] ?? 0;
      const regionDemandTWh = regionalDemand[region];
      const PEAK_TO_AVERAGE = 2;
      const peakGW = (regionDemandTWh * 1000) / 8760 * PEAK_TO_AVERAGE;
      const targetGWh = peakGW * longStorageFraction * params.longStorage.duration;
      const gap = Math.max(0, targetGWh - prevCap);
      const maxAdd = prevCap * params.longStorage.growthRate;
      const addition = Math.min(gap * 0.2, maxAdd + 1); // +1 GWh min to bootstrap

      const newCap = prevCap + addition;
      newLongStorageRegional[region] = newCap;
      longStorageTotal += newCap;
      longStorageCumulativeNew += addition;
    }

    // Find cheapest LCOE ($/MWh)
    // Note: lcoes.battery is $/kWh (storage cost), not $/MWh like generation sources.
    // Skip battery here; its contribution is captured via solarPlusBatteryLCOE.
    let cheapestLCOE = Infinity;
    for (const source of ENERGY_SOURCES) {
      if (source === 'battery') continue;
      if (lcoes[source] < cheapestLCOE) {
        cheapestLCOE = lcoes[source];
      }
    }
    if (solarPlusBatteryLCOE < cheapestLCOE) {
      cheapestLCOE = solarPlusBatteryLCOE;
    }

    return {
      state: {
        regional: newRegional,
        global: newGlobal,
        longStorageRegional: newLongStorageRegional,
        longStorageCumulative: longStorageCumulativeNew,
      },
      outputs: {
        lcoes,
        regionalLCOEs,
        netEnergyFraction,
        solarPlusBatteryLCOE,
        energyCapexSpend: realizedCapexB / 1000, // $T realized (all sources)
        capacities: globalCapacities,
        regionalCapacities,
        cumulativeCapacity,
        additions: globalAdditions,
        regionalAdditions,
        batteryCost,
        cheapestLCOE,
        effectiveSolarCF,
        effectiveWindCF,
        longStorageCost,
        longStorageCapacity: longStorageTotal,
        longStorageRegional: newLongStorageRegional,
        effectiveWACC,
        regionalWACC,
      },
    };
  },
});

// =============================================================================
// HELPER: Distribute value by GDP share (fallback when regional not provided)
// =============================================================================

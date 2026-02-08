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

import { defineModule, Module } from '../framework/module.js';
import { ValidationResult } from '../framework/types.js';
import { EnergySource, ENERGY_SOURCES, Region, REGIONS } from '../domain-types.js';
import { learningCurve, depletion } from '../primitives/math.js';
import { validatedMerge } from '../framework/validated-merge.js';
import { distributeByGDP } from '../primitives/distribute.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface EnergySourceParams {
  name: string;
  cost0: number;           // $/MWh baseline (2025); battery is $/kWh
  alpha: number;           // Wright's Law exponent (0 = no learning)
  softFloor: number;       // $/MWh irreducible non-learning costs (labor, land, permitting, O&M)
  referenceCF: number;     // Base CF for LCOE calculation (0 = no CF adjustment)
  growthRate: number;      // Annual capacity growth rate (default, can be overridden regionally)
  carbonIntensity: number; // kg CO2/MWh
  // Fossil fuel specific
  eroei0?: number;         // Initial EROEI
  reserves?: number;       // Depletion budget (dimensionless; extraction accrues as installed_GW × 0.01/yr)

  // Regional 2025 baselines (replaces single capacity2025)
  capacity2025: Record<Region, number>;
}

/** Regional policy parameters */
export interface RegionalEnergyParams {
  carbonPrice: number;                          // $/ton CO2
  maxGrowthRate?: Partial<Record<EnergySource, number>>;  // Policy constraints (overrides global)
  capacityFactor?: Partial<Record<EnergySource, number>>; // Resource quality (solar irradiance, etc.)
  coalPhaseoutYear?: number;                    // Regional override for coal phaseout year
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

  /** Year after which no new coal capacity is built (default 2035) */
  coalPhaseoutYear: number;

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

  /** Fraction of LCOE that is capital cost, by source */
  capitalIntensity: Record<EnergySource, number>;

  /** Long-duration storage (iron-air, compressed air, pumped hydro, etc.) */
  longStorage: {
    cost0: number;             // $/kWh initial cost (2025)
    alpha: number;             // Wright's Law learning exponent
    growthRate: number;        // Max annual capacity growth rate
    duration: number;          // Hours of storage duration (100h)
    efficiency: number;        // Round-trip efficiency (0.50)
    lifetime: number;          // Years
    capex: number;             // $M/GWh CAPEX
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
      cost0: 35,             // $/MWh total LCOE at reference CF (hardware $23 + soft $12)
      alpha: 0.36,           // Wright's Law on hardware portion only
      softFloor: 12,         // $/MWh irreducible: installation labor, land, permitting, O&M
      referenceCF: 0.20,     // CF adjustment: worse sites → higher effective LCOE
      capacity2025: REGIONAL_CAPACITY_2025.solar,
      growthRate: 0.25,
      carbonIntensity: 0,
    },
    wind: {
      name: 'Wind',
      cost0: 35,             // $/MWh total at reference CF (hardware $20 + soft $15)
      alpha: 0.23,
      softFloor: 15,         // Higher than solar: offshore maintenance, complex installation
      referenceCF: 0.30,     // CF adjustment for site quality degradation
      capacity2025: REGIONAL_CAPACITY_2025.wind,
      growthRate: 0.18,
      carbonIntensity: 0,
    },
    gas: {
      name: 'Natural Gas',
      cost0: 45,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,        // No CF adjustment (dispatchable)
      capacity2025: REGIONAL_CAPACITY_2025.gas,
      growthRate: 0.02,
      carbonIntensity: 400,
      eroei0: 30,
      reserves: 200,
    },
    coal: {
      name: 'Coal',
      cost0: 40,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,
      capacity2025: REGIONAL_CAPACITY_2025.coal,
      growthRate: -0.02,
      carbonIntensity: 900,
      eroei0: 25,
      reserves: 500,
    },
    nuclear: {
      name: 'Nuclear',
      cost0: 90,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,
      capacity2025: REGIONAL_CAPACITY_2025.nuclear,
      growthRate: 0.02,
      carbonIntensity: 0,
    },
    hydro: {
      name: 'Hydroelectric',
      cost0: 40,
      alpha: 0,
      softFloor: 0,
      referenceCF: 0,
      capacity2025: REGIONAL_CAPACITY_2025.hydro,
      growthRate: 0.01,
      carbonIntensity: 0,
    },
    battery: {
      name: 'Battery Storage',
      cost0: 140,            // $/kWh total (hardware $120 + soft $20)
      alpha: 0.26,
      softFloor: 20,         // $/kWh: BMS, pack assembly, installation
      referenceCF: 0,        // No CF adjustment (dispatchable)
      capacity2025: REGIONAL_CAPACITY_2025.battery,
      growthRate: 0.35,
      carbonIntensity: 0,
    },
  },

  // Regional policy parameters
  regional: {
    oecd:   { carbonPrice: REGIONAL_CARBON_PRICES.oecd,   capacityFactor: { solar: REGIONAL_SOLAR_CF.oecd } },
    china:  { carbonPrice: REGIONAL_CARBON_PRICES.china,  capacityFactor: { solar: REGIONAL_SOLAR_CF.china } },
    india:  { carbonPrice: REGIONAL_CARBON_PRICES.india,  capacityFactor: { solar: REGIONAL_SOLAR_CF.india } },
    latam:  { carbonPrice: REGIONAL_CARBON_PRICES.latam,  capacityFactor: { solar: REGIONAL_SOLAR_CF.latam } },
    seasia: { carbonPrice: REGIONAL_CARBON_PRICES.seasia, capacityFactor: { solar: REGIONAL_SOLAR_CF.seasia } },
    russia: { carbonPrice: REGIONAL_CARBON_PRICES.russia, capacityFactor: { solar: REGIONAL_SOLAR_CF.russia } },
    mena:   { carbonPrice: REGIONAL_CARBON_PRICES.mena,   capacityFactor: { solar: REGIONAL_SOLAR_CF.mena } },
    ssa:    { carbonPrice: REGIONAL_CARBON_PRICES.ssa,    capacityFactor: { solar: REGIONAL_SOLAR_CF.ssa } },
  },

  // Non-fossil EROI assumptions (used for net energy fraction)
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

  maxGrowthRate: {
    solar: 0.30,
    wind: 0.20,
    battery: 0.40,
    nuclear: 0.05,
    hydro: 0.02,
    gas: 0.05,
    coal: 0.03,
  },
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
  capexLearningRate: 0.02,        // 2% CAPEX decline per year for solar/wind/battery

  // Demand-driven capacity
  demandFillRate: 0.30,           // Fill 30% of demand gap per year
  competitiveThreshold: 1.20,     // Build if LCOE within 20% of fossil

  // Capacity planning ceilings (how much to build, not how much to generate)
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

  // Coal phaseout: no new coal after this year (default 2035)
  coalPhaseoutYear: 2035,

  // Curtailment feedback: dampen VRE additions when curtailment is high
  curtailmentPenalty: 2.0,         // At 30% curtailment: additions × 0.4; at 50%: × 0.1 (floor)
  curtailmentStorageBoost: 2.0,    // At 30% curtailment: battery target × 1.6; at 50%: × 2.0

  // WACC: financing cost channel for LCOE
  riskPremium: 0.02,               // 2% over risk-free (interest) rate
  baseWACC: 0.07,                  // 7% baseline — LCOE calibrated at this rate
  minWACC: 0.03,                   // Floor on WACC (even in very low-rate world)
  capitalIntensity: {              // Fraction of LCOE that is capital cost
    solar: 0.85,
    wind: 0.80,
    nuclear: 0.90,
    hydro: 0.85,
    gas: 0.15,
    coal: 0.25,
    battery: 0.80,
  },

  // Long-duration storage (iron-air, CAES, etc.)
  longStorage: {
    cost0: 300,                // $/kWh (2025, ~2x battery)
    alpha: 0.15,               // Slower learning than Li-ion
    growthRate: 0.25,          // Max annual growth rate
    duration: 100,             // 100 hours
    efficiency: 0.50,          // 50% round-trip
    lifetime: 25,              // Years
    capex: 200,                // $M/GWh
    capacity2025: {
      oecd: 5, china: 3, india: 1, latam: 1,
      seasia: 0.5, russia: 0.5, mena: 0.5, ssa: 0.5,
    },
  },

  // Site quality degradation
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
  additions: number[];    // History of additions (for retirement)
  initialCapacity: number; // Original 2025 capacity (for retirement)
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
}

/** Regional capacity outputs */
export interface RegionalEnergyOutputs {
  capacities: Record<EnergySource, number>;
  additions: Record<EnergySource, number>;
  retirements: Record<EnergySource, number>;
}

export interface EnergyOutputs {
  /** Current LCOE by source ($/MWh) - GLOBAL (from learning curves) */
  lcoes: Record<EnergySource, number>;

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

  /** Capacity retirements this year (GW; GWh for battery) - SUM of regional */
  retirements: Record<EnergySource, number>;

  /** Regional retirements breakdown */
  regionalRetirements: Record<Region, Record<EnergySource, number>>;

  /** Battery cost ($/kWh) */
  batteryCost: number;

  /** Cheapest LCOE this year ($/MWh) */
  cheapestLCOE: number;

  /** Regional detail for dispatch */
  energyRegional: Record<Region, RegionalEnergyOutputs>;

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
> = defineModule({
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
    sources: {
      solar: {
        alpha: {
          paramName: 'solarAlpha',
          description: "Wright's Law learning exponent for solar. 0.36 means 22% cost reduction per capacity doubling.",
          unit: 'dimensionless',
          range: { min: 0.1, max: 0.5, default: 0.36 },
          tier: 1 as const,
        },
        growthRate: {
          paramName: 'solarGrowthRate',
          description: 'Base annual growth rate for solar capacity (25% = doubling every ~3 years).',
          unit: 'fraction/year',
          range: { min: 0.05, max: 0.40, default: 0.25 },
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
        growthRate: {
          paramName: 'windGrowthRate',
          description: 'Base annual growth rate for wind capacity.',
          unit: 'fraction/year',
          range: { min: 0.05, max: 0.30, default: 0.18 },
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
    coalPhaseoutYear: {
      description: 'Year after which no new coal capacity is built. Existing plants retire at lifetime.',
      unit: 'year',
      range: { min: 2025, max: 2100, default: 2035 },
      tier: 1 as const,
    },
    curtailmentPenalty: {
      description: 'How strongly curtailment dampens VRE additions. At 30% curtailment and penalty=2: additions reduced 60%.',
      unit: 'dimensionless',
      range: { min: 0, max: 5, default: 2.0 },
      tier: 1 as const,
    },
    curtailmentStorageBoost: {
      description: 'How strongly curtailment boosts battery storage target. At 30% curtailment and boost=2: target 60% higher.',
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
      ssa: {
        carbonPrice: {
          paramName: 'ssaCarbonPrice',
          description: 'Carbon price for Sub-Saharan Africa. No effective pricing.',
          unit: '$/ton CO₂',
          range: { min: 0, max: 300, default: 0 },
          tier: 1 as const,
        },
      },
    },
  },

  inputs: [
    'electricityDemand',
    'regionalElectricityDemand',
    'availableInvestment',
    'regionalInvestment',
    'mineralConstraint',
    'laggedCurtailmentRate',
    'laggedInterestRate',
  ] as const,

  outputs: [
    'lcoes',
    'netEnergyFraction',
    'solarPlusBatteryLCOE',
    'capacities',
    'regionalCapacities',
    'cumulativeCapacity',
    'additions',
    'regionalAdditions',
    'retirements',
    'regionalRetirements',
    'batteryCost',
    'cheapestLCOE',
    'energyRegional',
    'effectiveSolarCF',
    'effectiveWindCF',
    'longStorageCost',
    'longStorageCapacity',
    'longStorageRegional',
    'effectiveWACC',
  ] as const,

  validate(params: Partial<EnergyParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const p = {
      ...energyDefaults,
      ...params,
      eroi: { ...energyDefaults.eroi, ...(params.eroi ?? {}) },
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

    for (const source of ENERGY_SOURCES) {
      const s = p.sources[source];
      if (s.alpha < 0 || s.alpha > 1) {
        errors.push(`sources.${source}.alpha must be 0-1`);
      }
      if (s.cost0 < 0) {
        errors.push(`sources.${source}.cost0 cannot be negative`);
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
    if (p.curtailmentStorageBoost !== undefined && p.curtailmentStorageBoost < 0) {
      errors.push('curtailmentStorageBoost cannot be negative');
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
      if (p.coalPhaseoutYear !== undefined) {
        result.coalPhaseoutYear = p.coalPhaseoutYear;
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
          additions: [0], // Year 0 has no additions
          initialCapacity: cap2025,
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
    const globalRetirements: Record<EnergySource, number> = {} as any;
    const cumulativeCapacity: Record<EnergySource, number> = {} as any;

    const regionalCapacities: Record<Region, Record<EnergySource, number>> = {} as any;
    const regionalAdditions: Record<Region, Record<EnergySource, number>> = {} as any;
    const regionalRetirements: Record<Region, Record<EnergySource, number>> = {} as any;
    const regionalOutputs: Record<Region, RegionalEnergyOutputs> = {} as any;

    // New state
    const newRegional: Record<Region, Record<EnergySource, RegionalCapacityState>> = {} as any;
    const newGlobal: Record<EnergySource, GlobalLearningState> = {} as any;

    // Initialize outputs
    for (const source of ENERGY_SOURCES) {
      globalCapacities[source] = 0;
      globalAdditions[source] = 0;
      globalRetirements[source] = 0;
    }
    for (const region of REGIONS) {
      regionalCapacities[region] = {} as any;
      regionalAdditions[region] = {} as any;
      regionalRetirements[region] = {} as any;
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
    const effectiveWACC = Math.max(params.minWACC, laggedInterestRate + params.riskPremium);

    // Capital recovery factor: CRF(r) = r / (1 - (1+r)^(-n)) for 25-year project life
    const PROJECT_LIFE = 25;
    const crf = (r: number) => {
      if (r < 0.001) return 1 / PROJECT_LIFE; // Limit as r→0
      return r / (1 - Math.pow(1 + r, -PROJECT_LIFE));
    };
    const crfEffective = crf(effectiveWACC);
    const crfBase = crf(params.baseWACC);

    // Adjust LCOE for each source based on capital intensity and WACC deviation.
    // Apply adjustment only to the capital portion to respect soft floor bounds.
    const crfRatio = crfEffective / crfBase;
    for (const source of ENERGY_SOURCES) {
      const ci = params.capitalIntensity[source] ?? 0;
      const baseLCOE = lcoes[source];
      const capitalPortion = baseLCOE * ci;
      const nonCapitalPortion = baseLCOE * (1 - ci);
      lcoes[source] = capitalPortion * crfRatio + nonCapitalPortion;
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

    for (const region of REGIONS) {
      const regionParams = params.regional[region];
      const regionDemand = regionalDemand[region];
      const regionInvestment = regionalInvestment[region];

      // Regional effective LCOE (base LCOE + carbon cost + site quality adjustment)
      const regionalLCOE: Record<EnergySource, number> = {} as any;
      for (const source of ENERGY_SOURCES) {
        let lcoe = lcoes[source];
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

      // Find cheapest fossil LCOE for this region
      const cheapestFossilLCOE = Math.min(regionalLCOE.gas, regionalLCOE.coal);

      // Clean energy share grows over time (e.g., 15% → 30% over 25 years)
      const cleanShare = params.cleanEnergyShare2025 +
        params.cleanEnergyShareGrowth * Math.min(1, yearIndex / 25);

      // Regional clean energy budget ($B)
      const cleanBudget = regionInvestment * cleanShare * 1000;

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

        if (source === 'solar' || source === 'wind' || source === 'nuclear' || source === 'hydro') {
          const currentGenTWh = (prevInstalled * cf * 8760) / 1000;
          const demandGapTWh = Math.max(0, maxUsefulGen - currentGenTWh);
          const demandGapGW = (demandGapTWh * 1000) / (cf * 8760);

          const isCompetitive = regionalLCOE[source] <= cheapestFossilLCOE * params.competitiveThreshold;

          if (isCompetitive && demandGapGW > 0) {
            targetAddition = demandGapGW * params.demandFillRate;
            // Curtailment feedback: dampen VRE additions when curtailment is high
            if (source === 'solar' || source === 'wind') {
              const curtRate = inputs.laggedCurtailmentRate ?? 0;
              const curtailmentDamping = Math.max(0.1, 1 - params.curtailmentPenalty * curtRate);
              targetAddition *= curtailmentDamping;
            }
          } else {
            const MIN_CAPACITY_GROWTH = 0.01;
            targetAddition = prevInstalled * MIN_CAPACITY_GROWTH;
          }
        } else if (source === 'battery') {
          const solarGW = state.regional[region].solar.installed;
          const solarAdditions = desiredAdditions.solar ?? 0;
          const futureSolarGW = solarGW + solarAdditions;
          // Curtailment feedback: boost battery target when curtailment is high
          const curtRate = inputs.laggedCurtailmentRate ?? 0;
          const storagePressure = 1 + params.curtailmentStorageBoost * curtRate;
          const targetBatteryGWh = futureSolarGW * params.batteryDuration * storagePressure;
          const batteryGap = Math.max(0, targetBatteryGWh - prevInstalled);

          const REGIONAL_BATTERY_MARKUP = 1.5;
          const solarPlusBatteryLCOE = regionalLCOE.solar * REGIONAL_BATTERY_MARKUP;
          const isCompetitive = solarPlusBatteryLCOE <= cheapestFossilLCOE * params.competitiveThreshold;

          if (isCompetitive && batteryGap > 0) {
            targetAddition = batteryGap * params.demandFillRate;
          } else {
            const MIN_CAPACITY_GROWTH = 0.01;
            targetAddition = prevInstalled * MIN_CAPACITY_GROWTH;
          }
        } else {
          targetAddition = prevInstalled * s.growthRate;
        }

        // Regional growth cap
        const maxGrowth = getRegionalMaxGrowth(params, region, source);
        const growthCapped = prevInstalled * maxGrowth;
        const ceilingRoom = Math.max(0, maxUsefulCapacity - prevInstalled);

        let desired = Math.max(0, targetAddition);
        desired = Math.min(desired, growthCapped, ceilingRoom);

        // Coal phaseout: no new coal after phaseout year (regional override or global)
        if (source === 'coal') {
          const regionalPhaseout = regionParams.coalPhaseoutYear ?? params.coalPhaseoutYear;
          if (year >= regionalPhaseout) {
            desired = 0;
          }
        }

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
      const REGIONAL_BATTERY_MARKUP_FOR_RANK = 1.5;
      const regionalSolarPlusBatteryLCOE = regionalLCOE.solar * REGIONAL_BATTERY_MARKUP_FOR_RANK;
      const effectiveSolarLCOE = (1 - regionVREShare) * regionalLCOE.solar + regionVREShare * regionalSolarPlusBatteryLCOE;

      const rankingLCOE: Record<EnergySource, number> = { ...regionalLCOE };
      rankingLCOE.solar = effectiveSolarLCOE;

      const cleanSources: EnergySource[] = ['solar', 'wind', 'battery', 'nuclear', 'hydro'];
      cleanSources.sort((a, b) => rankingLCOE[a] - rankingLCOE[b]);

      let remainingBudget = cleanBudget;
      const fundedAdditions: Record<EnergySource, number> = {} as any;

      for (const source of cleanSources) {
        const desired = desiredAdditions[source];
        const capex = effectiveCapex[source];
        const cost = (desired * capex) / 1000;

        if (cost <= remainingBudget) {
          fundedAdditions[source] = desired;
          remainingBudget -= cost;
        } else {
          const affordable = (remainingBudget / capex) * 1000;
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

      // Calculate retirements and update regional state
      for (const source of ENERGY_SOURCES) {
        const regionState = state.regional[region][source];
        const prevInstalled = regionState.installed;

        const addition = fundedAdditions[source];
        const lifetime = params.lifetime[source];
        let retirement = 0;

        if (yearIndex < lifetime) {
          retirement += regionState.initialCapacity / lifetime;
        }
        if (yearIndex >= lifetime && regionState.additions.length > lifetime) {
          retirement += regionState.additions[yearIndex - lifetime] || 0;
        }

        const newInstalled = Math.max(0, prevInstalled + addition - retirement);

        newRegional[region][source] = {
          installed: newInstalled,
          additions: [...regionState.additions, addition],
          initialCapacity: regionState.initialCapacity,
        };

        regionalCapacities[region][source] = newInstalled;
        regionalAdditions[region][source] = addition;
        regionalRetirements[region][source] = retirement;

        // Accumulate global totals
        globalCapacities[source] += newInstalled;
        globalAdditions[source] += addition;
        globalRetirements[source] += retirement;
      }

      // Store regional outputs
      regionalOutputs[region] = {
        capacities: regionalCapacities[region],
        additions: regionalAdditions[region],
        retirements: regionalRetirements[region],
      };
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
        // Extraction proxy: installed capacity (GW) × 0.01 per year.
        // Dimensionless — calibrated so reserves/extracted ratio drives EROEI decay.
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

    const cyclesPerYear = params.batteryCyclesPerYear;
    const batteryLCOEContribution = (batteryCost * 1000) / cyclesPerYear;
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
        netEnergyFraction,
        solarPlusBatteryLCOE,
        capacities: globalCapacities,
        regionalCapacities,
        cumulativeCapacity,
        additions: globalAdditions,
        regionalAdditions,
        retirements: globalRetirements,
        regionalRetirements,
        batteryCost,
        cheapestLCOE,
        energyRegional: regionalOutputs,
        effectiveSolarCF,
        effectiveWindCF,
        longStorageCost,
        longStorageCapacity: longStorageTotal,
        longStorageRegional: newLongStorageRegional,
        effectiveWACC,
      },
    };
  },
});

// =============================================================================
// HELPER: Distribute value by GDP share (fallback when regional not provided)
// =============================================================================


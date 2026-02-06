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
import { EnergySource, ENERGY_SOURCES, Region, REGIONS, ValidationResult } from '../framework/types.js';
import { learningCurve, depletion } from '../primitives/math.js';
import { validatedMerge } from '../framework/validated-merge.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface EnergySourceParams {
  name: string;
  cost0: number;           // $/MWh baseline (2025); battery is $/kWh
  alpha: number;           // Wright's Law exponent (0 = no learning)
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
  gas:     { oecd: 800, china: 150, india: 30,  latam: 90,  seasia: 110, russia: 190, mena: 190, ssa: 30 },
  coal:    { oecd: 300, china: 1200,india: 250, latam: 15,  seasia: 80,  russia: 40,  mena: 15,  ssa: 40 },
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
      cost0: 35,
      alpha: 0.36,
      capacity2025: REGIONAL_CAPACITY_2025.solar,
      growthRate: 0.25,
      carbonIntensity: 0,
    },
    wind: {
      name: 'Wind',
      cost0: 35,
      alpha: 0.23,
      capacity2025: REGIONAL_CAPACITY_2025.wind,
      growthRate: 0.18,
      carbonIntensity: 0,
    },
    gas: {
      name: 'Natural Gas',
      cost0: 45,
      alpha: 0,
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
      capacity2025: REGIONAL_CAPACITY_2025.nuclear,
      growthRate: 0.02,
      carbonIntensity: 0,
    },
    hydro: {
      name: 'Hydroelectric',
      cost0: 40,
      alpha: 0,
      capacity2025: REGIONAL_CAPACITY_2025.hydro,
      growthRate: 0.01,
      carbonIntensity: 0,
    },
    battery: {
      name: 'Battery Storage',
      cost0: 140,           // $/kWh
      alpha: 0.26,
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
    coal: 0.0,
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

  /** Stability factor affecting investment (0-1) */
  stabilityFactor: number;

  /** Mineral supply constraint 0-1 (from resources, lagged). 1 = no constraint. */
  mineralConstraint: number;
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
 * Get regional capacity factor (with regional override)
 */
function getRegionalCapacityFactor(
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
    case 'nuclear': return 0.90;
    case 'hydro': return 0.42;
    default: return 0.50;
  }
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
    'stabilityFactor',
    'mineralConstraint',
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

    return { regional, global };
  },

  step(state, inputs, params, year, yearIndex) {
    const { electricityDemand, availableInvestment, stabilityFactor } = inputs;

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
        const ratio = prevCumulative / globalCumulative2025;
        lcoe = s.cost0 * Math.pow(Math.max(1, ratio), -s.alpha);
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

      // Regional effective LCOE (base LCOE + regional carbon cost for fossil)
      const regionalLCOE: Record<EnergySource, number> = {} as any;
      for (const source of ENERGY_SOURCES) {
        let lcoe = lcoes[source];
        // Add regional carbon cost for fossil fuels
        if (source === 'gas' || source === 'coal') {
          const carbonCost = (params.sources[source].carbonIntensity * regionParams.carbonPrice) / 1000;
          lcoe += carbonCost;
        }
        regionalLCOE[source] = lcoe;
      }

      // Find cheapest fossil LCOE for this region
      const cheapestFossilLCOE = Math.min(regionalLCOE.gas, regionalLCOE.coal);

      // Clean energy share grows over time (e.g., 15% → 30% over 25 years)
      const cleanShare = params.cleanEnergyShare2025 +
        params.cleanEnergyShareGrowth * Math.min(1, yearIndex / 25);

      // Regional clean energy budget ($B)
      const cleanBudget = regionInvestment * cleanShare * stabilityFactor * 1000;

      // Calculate desired additions for this region
      const desiredAdditions: Record<EnergySource, number> = {} as any;

      for (const source of ENERGY_SOURCES) {
        const s = params.sources[source];
        const regionState = state.regional[region][source];
        const prevInstalled = regionState.installed;

        const cf = getRegionalCapacityFactor(params, region, source);
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
          } else {
            const MIN_CAPACITY_GROWTH = 0.01;
            targetAddition = prevInstalled * MIN_CAPACITY_GROWTH;
          }
        } else if (source === 'battery') {
          const solarGW = state.regional[region].solar.installed;
          const solarAdditions = desiredAdditions.solar ?? 0;
          const futureSolarGW = solarGW + solarAdditions;
          const targetBatteryGWh = futureSolarGW * params.batteryDuration;
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

        // No new coal: existing plants retire at lifetime but no new capacity built
        if (source === 'coal') {
          desired = 0;
        }

        desiredAdditions[source] = desired;
      }

      // Apply investment constraint (LCOE priority)
      const cleanSources: EnergySource[] = ['solar', 'wind', 'battery', 'nuclear', 'hydro'];
      cleanSources.sort((a, b) => regionalLCOE[a] - regionalLCOE[b]);

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
      // Coal already zeroed above (desired = 0), but not in cleanSources so set explicitly
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
    const batteryCost = params.sources.battery.cost0 *
      Math.pow(Math.max(1, batteryRatio), -params.sources.battery.alpha);

    const cyclesPerYear = params.batteryCyclesPerYear;
    const batteryLCOEContribution = (batteryCost * 1000) / cyclesPerYear;
    const solarPlusBatteryLCOE =
      lcoes.solar / params.batteryEfficiency + batteryLCOEContribution;

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
      state: { regional: newRegional, global: newGlobal },
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
      },
    };
  },
});

// =============================================================================
// HELPER: Distribute value by GDP share (fallback when regional not provided)
// =============================================================================

function distributeByGDP(total: number): Record<Region, number> {
  // GDP shares (approximate 2025): sum = $118T
  const shares: Record<Region, number> = {
    oecd: 0.47, china: 0.15, india: 0.11, latam: 0.07,
    seasia: 0.06, russia: 0.03, mena: 0.04, ssa: 0.06,
  };

  const result: Record<Region, number> = {} as any;
  for (const region of REGIONS) {
    result[region] = total * shares[region];
  }
  return result;
}

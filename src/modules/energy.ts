/**
 * Energy Module
 *
 * Handles LCOE calculation and capacity state management.
 * Implements Wright's Law learning curves and EROEI depletion.
 *
 * State machine architecture:
 *   actualCapacity[t] = actualCapacity[t-1] + additions[t] - retirements[t]
 *
 * Outputs (to other modules):
 * - lcoes: Current LCOE by source ($/MWh)
 * - capacities: Installed capacity by source (GW)
 * - cumulativeCapacity: Total deployed (for learning curves)
 */

import { defineModule, Module } from '../framework/module.js';
import { EnergySource, ENERGY_SOURCES, ValidationResult } from '../framework/types.js';
import { learningCurve, depletion } from '../primitives/math.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface EnergySourceParams {
  name: string;
  cost0: number;           // $/MWh baseline (2025)
  alpha: number;           // Wright's Law exponent (0 = no learning)
  capacity2025: number;    // GW installed (GWh for battery)
  growthRate: number;      // Annual capacity growth rate
  carbonIntensity: number; // kg CO2/MWh
  // Fossil fuel specific
  eroei0?: number;         // Initial EROEI
  reserves?: number;       // Total reserves
}

export interface EnergyParams {
  sources: Record<EnergySource, EnergySourceParams>;

  /** Carbon price ($/ton CO2) */
  carbonPrice: number;

  /** Maximum growth rates (manufacturing limits) */
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
}

export const energyDefaults: EnergyParams = {
  sources: {
    solar: {
      name: 'Solar PV',
      cost0: 35,
      alpha: 0.36,
      capacity2025: 1500,
      growthRate: 0.25,
      carbonIntensity: 0,
    },
    wind: {
      name: 'Wind',
      cost0: 35,
      alpha: 0.23,
      capacity2025: 1000,
      growthRate: 0.18,
      carbonIntensity: 0,
    },
    gas: {
      name: 'Natural Gas',
      cost0: 45,
      alpha: 0,
      capacity2025: 1800,
      growthRate: 0.02,
      carbonIntensity: 400,
      eroei0: 30,
      reserves: 200,
    },
    coal: {
      name: 'Coal',
      cost0: 40,
      alpha: 0,
      capacity2025: 2100,
      growthRate: -0.02,
      carbonIntensity: 900,
      eroei0: 25,
      reserves: 500,
    },
    nuclear: {
      name: 'Nuclear',
      cost0: 90,
      alpha: 0,
      capacity2025: 400,
      growthRate: 0.02,
      carbonIntensity: 0,
    },
    hydro: {
      name: 'Hydroelectric',
      cost0: 40,
      alpha: 0,
      capacity2025: 1400,
      growthRate: 0.01,
      carbonIntensity: 0,
    },
    battery: {
      name: 'Battery Storage',
      cost0: 140,           // $/kWh
      alpha: 0.26,
      capacity2025: 2000,   // GWh
      growthRate: 0.35,
      carbonIntensity: 0,
    },
  },
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
};

// =============================================================================
// STATE
// =============================================================================

export interface CapacityState {
  installed: number;      // Current capacity (GW or GWh)
  cumulative: number;     // Cumulative deployed (for learning)
  extracted: number;      // Fossil fuels: extracted so far
  additions: number[];    // History of additions (for retirement)
  initialCapacity: number; // Original 2025 capacity (for retirement)
}

export interface EnergyState {
  capacities: Record<EnergySource, CapacityState>;
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface EnergyInputs {
  /** Electricity demand for ceiling calculation (TWh) */
  electricityDemand: number;

  /** Available investment for capacity ($T) */
  availableInvestment: number;

  /** Stability factor affecting investment (0-1) */
  stabilityFactor: number;
}

export interface EnergyOutputs {
  /** Current LCOE by source ($/MWh) */
  lcoes: Record<EnergySource, number>;

  /** Solar + battery combined LCOE ($/MWh) */
  solarPlusBatteryLCOE: number;

  /** Installed capacity by source (GW, GWh for battery) */
  capacities: Record<EnergySource, number>;

  /** Cumulative capacity (for external tracking) */
  cumulativeCapacity: Record<EnergySource, number>;

  /** Capacity additions this year (GW; GWh for battery) */
  additions: Record<EnergySource, number>;

  /** Capacity retirements this year (GW; GWh for battery) */
  retirements: Record<EnergySource, number>;

  /** Battery cost ($/kWh) */
  batteryCost: number;

  /** Cheapest LCOE this year ($/MWh) */
  cheapestLCOE: number;
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
  description: 'LCOE calculation and capacity state machine',

  defaults: energyDefaults,

  inputs: ['electricityDemand', 'availableInvestment', 'stabilityFactor'] as const,

  outputs: [
    'lcoes',
    'solarPlusBatteryLCOE',
    'capacities',
    'cumulativeCapacity',
    'additions',
    'retirements',
    'batteryCost',
    'cheapestLCOE',
  ] as const,

  validate(params: Partial<EnergyParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const p = { ...energyDefaults, ...params };

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
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<EnergyParams>): EnergyParams {
    const result = { ...energyDefaults, ...partial };

    // Deep merge sources
    if (partial.sources) {
      result.sources = { ...energyDefaults.sources };
      for (const source of ENERGY_SOURCES) {
        if (partial.sources[source]) {
          result.sources[source] = {
            ...energyDefaults.sources[source],
            ...partial.sources[source],
          };
        }
      }
    }

    // Deep merge other records
    if (partial.maxGrowthRate) {
      result.maxGrowthRate = { ...energyDefaults.maxGrowthRate, ...partial.maxGrowthRate };
    }
    if (partial.lifetime) {
      result.lifetime = { ...energyDefaults.lifetime, ...partial.lifetime };
    }
    if (partial.capex) {
      result.capex = { ...energyDefaults.capex, ...partial.capex };
    }

    return result;
  },

  init(params: EnergyParams): EnergyState {
    const capacities: Record<EnergySource, CapacityState> = {} as any;

    for (const source of ENERGY_SOURCES) {
      const s = params.sources[source];
      capacities[source] = {
        installed: s.capacity2025,
        cumulative: s.capacity2025,
        extracted: 0,
        additions: [0], // Year 0 has no additions
        initialCapacity: s.capacity2025, // Track for retirement
      };
    }

    return { capacities };
  },

  step(state, inputs, params, year, yearIndex) {
    const { electricityDemand, availableInvestment, stabilityFactor } = inputs;
    const newCapacities: Record<EnergySource, CapacityState> = {} as any;

    const lcoes: Record<EnergySource, number> = {} as any;
    const outputCapacities: Record<EnergySource, number> = {} as any;
    const cumulativeCapacity: Record<EnergySource, number> = {} as any;
    const additions: Record<EnergySource, number> = {} as any;
    const retirements: Record<EnergySource, number> = {} as any;

    // =========================================================================
    // Calculate investment budget
    // =========================================================================

    // Clean energy share grows over time (e.g., 15% → 30% over 25 years)
    const cleanShare = params.cleanEnergyShare2025 +
      params.cleanEnergyShareGrowth * Math.min(1, yearIndex / 25);

    // Total clean energy budget ($B)
    // Investment is adjusted by stability factor (Galbraith/Chen uncertainty)
    const cleanBudget = availableInvestment * cleanShare * stabilityFactor * 1000; // $T → $B

    // CAPEX learning factor (declines 2%/year for solar/wind/battery)
    const capexLearningFactor = Math.pow(1 - params.capexLearningRate, yearIndex);

    // Get effective CAPEX for each source (with learning applied)
    const effectiveCapex: Record<EnergySource, number> = {} as any;
    for (const source of ENERGY_SOURCES) {
      let capex = params.capex[source];
      if (source === 'solar' || source === 'wind' || source === 'battery') {
        capex *= capexLearningFactor;
      }
      effectiveCapex[source] = capex;
    }

    // =========================================================================
    // First pass: Calculate LCOEs
    // =========================================================================

    for (const source of ENERGY_SOURCES) {
      const s = params.sources[source];
      const cap = state.capacities[source];
      const prevCumulative = cap.cumulative;

      // Calculate LCOE
      let lcoe: number;
      if (s.alpha > 0) {
        // Learning curve (solar, wind, battery)
        const ratio = prevCumulative / s.capacity2025;
        lcoe = s.cost0 * Math.pow(Math.max(1, ratio), -s.alpha);
      } else if (s.eroei0 !== undefined && s.reserves !== undefined) {
        // Fossil fuel with depletion
        const dep = depletion(s.reserves, cap.extracted, s.eroei0);
        const baseCost = s.cost0 / dep.netEnergyFraction;
        const carbonCost = (s.carbonIntensity * params.carbonPrice) / 1000;
        lcoe = baseCost + carbonCost;
      } else {
        // Fixed cost (nuclear, hydro)
        lcoe = s.cost0;
      }

      lcoes[source] = lcoe;
    }

    // Find cheapest fossil LCOE for competitiveness check
    const cheapestFossilLCOE = Math.min(lcoes.gas, lcoes.coal);

    // =========================================================================
    // Calculate desired additions (demand-driven for clean, growth rate for fossil)
    // =========================================================================

    const desiredAdditions: Record<EnergySource, number> = {} as any;

    for (const source of ENERGY_SOURCES) {
      const s = params.sources[source];
      const cap = state.capacities[source];
      const prevInstalled = cap.installed;

      // Capacity factor and penetration limits
      const cf = source === 'solar' ? 0.2 :
                 source === 'wind' ? 0.3 :
                 source === 'nuclear' ? 0.9 :
                 source === 'hydro' ? 0.42 : 0.5;
      const maxPen = source === 'solar' ? 0.8 :
                     source === 'wind' ? 0.35 :
                     source === 'nuclear' ? 0.3 :
                     source === 'hydro' ? 0.2 : 1.0;

      // Max useful capacity based on demand ceiling
      const maxUsefulGen = electricityDemand * maxPen;
      let maxUsefulCapacity: number;
      if (source === 'battery') {
        const solarGW = state.capacities.solar.installed;
        maxUsefulCapacity = solarGW * params.batteryDuration;
      } else {
        maxUsefulCapacity = (maxUsefulGen * 1000) / (cf * 8760);
      }

      // Calculate target addition
      let targetAddition: number;

      if (source === 'solar' || source === 'wind' || source === 'nuclear' || source === 'hydro') {
        // Demand-driven additions for clean generators
        // Calculate current generation (TWh)
        const currentGenTWh = (prevInstalled * cf * 8760) / 1000;

        // Demand gap: how much more can this source contribute?
        const demandGapTWh = Math.max(0, maxUsefulGen - currentGenTWh);
        const demandGapGW = (demandGapTWh * 1000) / (cf * 8760);

        // Check if this source is competitive with fossil
        const isCompetitive = lcoes[source] <= cheapestFossilLCOE * params.competitiveThreshold;

        // Target: fill demandFillRate (30%) of gap per year if competitive
        if (isCompetitive && demandGapGW > 0) {
          targetAddition = demandGapGW * params.demandFillRate;
        } else {
          // Not competitive or no gap - minimal maintenance growth
          targetAddition = prevInstalled * 0.01; // 1% maintenance/replacement
        }
      } else if (source === 'battery') {
        // Battery follows solar: target is to have enough storage to firm solar
        // Max useful = solarGW × batteryDuration (GWh)
        const solarGW = state.capacities.solar.installed;
        const solarAdditions = desiredAdditions.solar ?? 0; // Already calculated
        const futureSolarGW = solarGW + solarAdditions;
        const targetBatteryGWh = futureSolarGW * params.batteryDuration;
        const batteryGap = Math.max(0, targetBatteryGWh - prevInstalled);

        // Check if battery is cost-competitive (use solar+battery vs fossil)
        const solarPlusBatteryLCOE = lcoes.solar * 1.5; // Rough approximation
        const isCompetitive = solarPlusBatteryLCOE <= cheapestFossilLCOE * params.competitiveThreshold;

        if (isCompetitive && batteryGap > 0) {
          targetAddition = batteryGap * params.demandFillRate;
        } else {
          targetAddition = prevInstalled * 0.01; // Minimal maintenance
        }
      } else {
        // Fossil fuels: use exogenous growth rate
        targetAddition = prevInstalled * s.growthRate;
      }

      // Growth cap constraint (manufacturing/supply chain limits)
      const maxGrowth = params.maxGrowthRate[source];
      const growthCapped = prevInstalled * maxGrowth;

      // Ceiling room
      const ceilingRoom = Math.max(0, maxUsefulCapacity - prevInstalled);

      // Apply growth cap and ceiling (not investment yet)
      let desired = Math.max(0, targetAddition);
      desired = Math.min(desired, growthCapped, ceilingRoom);

      // Coal: no new additions
      if (source === 'coal') {
        desired = 0;
      }

      desiredAdditions[source] = desired;
    }

    // =========================================================================
    // Second pass: Apply investment constraint (LCOE priority)
    // =========================================================================

    // Sort clean sources by LCOE (fund cheapest first)
    const cleanSources: EnergySource[] = ['solar', 'wind', 'battery', 'nuclear', 'hydro'];
    cleanSources.sort((a, b) => lcoes[a] - lcoes[b]);

    // Allocate budget by LCOE priority
    let remainingBudget = cleanBudget; // $B
    const fundedAdditions: Record<EnergySource, number> = {} as any;

    for (const source of cleanSources) {
      const desired = desiredAdditions[source];
      const capex = effectiveCapex[source]; // $M/GW or $M/GWh

      // Cost of desired additions: GW × $M/GW / 1000 = $B
      const cost = (desired * capex) / 1000;

      if (cost <= remainingBudget) {
        // Fully funded
        fundedAdditions[source] = desired;
        remainingBudget -= cost;
      } else {
        // Partially funded - get as much as budget allows
        const affordable = (remainingBudget / capex) * 1000; // GW or GWh
        fundedAdditions[source] = affordable;
        remainingBudget = 0;
      }
    }

    // Gas and coal don't use clean budget
    fundedAdditions.gas = desiredAdditions.gas ?? 0;
    fundedAdditions.coal = 0;

    // =========================================================================
    // Third pass: Calculate retirements and update state
    // =========================================================================

    for (const source of ENERGY_SOURCES) {
      const s = params.sources[source];
      const cap = state.capacities[source];
      const prevInstalled = cap.installed;
      const prevCumulative = cap.cumulative;

      const addition = fundedAdditions[source];
      additions[source] = addition;

      // Calculate retirements
      // Two components: initial capacity + additions from lifetime years ago
      const lifetime = params.lifetime[source];
      let retirement = 0;

      // 1. Initial capacity retires over lifetime (1/lifetime per year)
      if (yearIndex < lifetime) {
        retirement += cap.initialCapacity / lifetime;
      }

      // 2. Additions from lifetime years ago retire
      if (yearIndex >= lifetime && cap.additions.length > lifetime) {
        retirement += cap.additions[yearIndex - lifetime] || 0;
      }

      // Update capacity
      const newInstalled = Math.max(0, prevInstalled + addition - retirement);
      const newCumulative = prevCumulative + addition;

      // Update extracted for fossil fuels
      let extracted = cap.extracted;
      if (s.reserves !== undefined) {
        // Rough extraction based on capacity utilization
        extracted += prevInstalled * 0.01;
      }

      newCapacities[source] = {
        installed: newInstalled,
        cumulative: newCumulative,
        extracted,
        additions: [...cap.additions, addition],
        initialCapacity: cap.initialCapacity,
      };

      outputCapacities[source] = newInstalled;
      cumulativeCapacity[source] = newCumulative;
      additions[source] = addition;
      retirements[source] = retirement;
    }

    // Battery cost ($/kWh) - normalized learning curve
    const batteryRatio = state.capacities.battery.cumulative / params.sources.battery.capacity2025;
    const batteryCost = params.sources.battery.cost0 *
      Math.pow(Math.max(1, batteryRatio), -params.sources.battery.alpha);

    // Solar + battery combined LCOE
    // Battery adds to solar LCOE based on:
    // - Battery cost ($/kWh) × 1000 = $/MWh storage capacity
    // - Amortized over cycles: $/MWh × (1 / cycles_per_year)
    // - A 4h battery with daily cycling: 365 cycles/year
    // - Contribution = batteryCost($/kWh) × 1000 × duration / (cycles × duration)
    //                = batteryCost × 1000 / cycles
    // For daily cycling: batteryLCOEContribution = batteryCost $/kWh × 1000 / 365 ≈ batteryCost × 2.74 $/MWh
    // Plus efficiency losses
    const cyclesPerYear = 365; // Assume daily cycling
    const batteryLCOEContribution = (batteryCost * 1000) / cyclesPerYear; // $/MWh
    const solarPlusBatteryLCOE =
      lcoes.solar / params.batteryEfficiency + batteryLCOEContribution;

    // Find cheapest LCOE
    let cheapestLCOE = Infinity;
    for (const source of ENERGY_SOURCES) {
      if (lcoes[source] < cheapestLCOE) {
        cheapestLCOE = lcoes[source];
      }
    }
    if (solarPlusBatteryLCOE < cheapestLCOE) {
      cheapestLCOE = solarPlusBatteryLCOE;
    }

    return {
      state: { capacities: newCapacities },
      outputs: {
        lcoes,
        solarPlusBatteryLCOE,
        capacities: outputCapacities,
        cumulativeCapacity,
        additions,
        retirements,
        batteryCost,
        cheapestLCOE,
      },
    };
  },
});

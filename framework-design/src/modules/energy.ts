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
   * Investment allocation across clean sources (must sum to 1.0)
   * Determines how clean energy budget is split across sources
   */
  investmentAllocation: Partial<Record<EnergySource, number>>;

  /**
   * CAPEX learning rate (annual decline for solar/wind/battery)
   */
  capexLearningRate: number;
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
  cleanEnergyShare2025: 0.15,      // 15% of investment to clean energy in 2025
  cleanEnergyShareGrowth: 0.15,   // Grows to 30% by 2050

  investmentAllocation: {
    solar: 0.40,       // 40% of clean budget to solar
    wind: 0.25,        // 25% to wind
    battery: 0.20,     // 20% to battery
    nuclear: 0.10,     // 10% to nuclear
    hydro: 0.05,       // 5% to hydro
    // gas/coal: no allocation (handled separately)
  },

  capexLearningRate: 0.02,        // 2% CAPEX decline per year for solar/wind/battery
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
    if (partial.investmentAllocation) {
      result.investmentAllocation = {
        ...energyDefaults.investmentAllocation,
        ...partial.investmentAllocation,
      };
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
    // Calculate investment-constrained capacity
    // =========================================================================

    // Clean energy share grows over time (e.g., 15% → 30% over 25 years)
    const cleanShare = params.cleanEnergyShare2025 +
      params.cleanEnergyShareGrowth * Math.min(1, yearIndex / 25);

    // Total clean energy budget ($B)
    // Investment is adjusted by stability factor (Galbraith/Chen uncertainty)
    const cleanBudget = availableInvestment * cleanShare * stabilityFactor * 1000; // $T → $B

    // CAPEX learning factor (declines 2%/year for solar/wind/battery)
    const capexLearningFactor = Math.pow(1 - params.capexLearningRate, yearIndex);

    // Calculate max additions from investment budget for each source
    const investmentCap: Partial<Record<EnergySource, number>> = {};
    for (const source of ENERGY_SOURCES) {
      const allocation = params.investmentAllocation[source];
      if (allocation !== undefined && allocation > 0) {
        const budget = cleanBudget * allocation; // $B for this source
        let capex = params.capex[source]; // $M/GW or $M/GWh

        // Apply CAPEX learning to solar, wind, battery
        if (source === 'solar' || source === 'wind' || source === 'battery') {
          capex *= capexLearningFactor;
        }

        // Budget ($B) / CAPEX ($M/GW) × 1000 = GW (or GWh for battery)
        investmentCap[source] = (budget / capex) * 1000;
      } else if (source === 'gas') {
        // Gas: no investment constraint
        investmentCap[source] = Infinity;
      } else if (source === 'coal') {
        // Coal: no new investment
        investmentCap[source] = 0;
      }
    }

    // =========================================================================
    // Calculate additions for each source
    // =========================================================================

    for (const source of ENERGY_SOURCES) {
      const s = params.sources[source];
      const cap = state.capacities[source];
      const prevInstalled = cap.installed;
      const prevCumulative = cap.cumulative;

      // Calculate LCOE
      let lcoe: number;
      if (s.alpha > 0) {
        // Learning curve (solar, wind, battery)
        // Wright's Law: cost = cost₀ × (cumulative / cumulative₀)^(-α)
        // cost0 is the cost at capacity2025, so we normalize by initial capacity
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

      // Calculate additions - demand-driven growth
      let targetAddition = prevInstalled * s.growthRate;

      // Growth cap constraint (manufacturing/supply chain limits)
      const maxGrowth = params.maxGrowthRate[source];
      const growthCapped = prevInstalled * maxGrowth;

      // Demand ceiling constraint - can't overbuild beyond useful capacity
      // Use capacity factor and penetration limit to estimate useful capacity
      const cf = source === 'solar' ? 0.2 :
                 source === 'wind' ? 0.3 :
                 source === 'nuclear' ? 0.9 :
                 source === 'hydro' ? 0.42 : 0.5;
      const maxPen = source === 'solar' ? 0.8 :  // Solar+battery can reach 80%
                     source === 'wind' ? 0.35 :
                     source === 'nuclear' ? 0.3 :
                     source === 'hydro' ? 0.2 : 1.0;
      const maxUsefulGen = electricityDemand * maxPen;

      // For battery: capacity is in GWh, so ceiling is also in GWh
      // Battery should roughly match solar capacity for firming
      // GWh needed ≈ solar GW × batteryDuration hours
      let maxUsefulCapacity: number;
      if (source === 'battery') {
        // Battery GWh needed to firm solar: solarGW × duration
        const solarGW = state.capacities.solar.installed;
        maxUsefulCapacity = solarGW * params.batteryDuration;
      } else {
        // Generators: convert TWh demand to GW capacity
        maxUsefulCapacity = (maxUsefulGen * 1000) / (cf * 8760);
      }
      const ceilingRoom = Math.max(0, maxUsefulCapacity - prevInstalled);

      // Investment constraint (from capital model)
      const investmentRoom = investmentCap[source] ?? Infinity;

      // Apply all constraints: growth cap, demand ceiling, investment budget
      let addition = Math.max(0, targetAddition);
      addition = Math.min(addition, growthCapped, ceilingRoom, investmentRoom);

      // Coal: no new additions (already constrained by investmentCap = 0)
      if (source === 'coal') {
        addition = 0;
      }

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

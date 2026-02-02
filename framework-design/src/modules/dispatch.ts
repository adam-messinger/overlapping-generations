/**
 * Dispatch Module
 *
 * Merit order dispatch - allocates electricity demand to sources by LCOE.
 * Respects capacity constraints and penetration limits.
 *
 * Inputs (from other modules):
 * - electricityDemand: Total demand (TWh)
 * - capacities: Installed capacity by source (GW)
 * - lcoes: Levelized cost by source ($/MWh)
 *
 * Outputs (to other modules):
 * - generation: TWh by source
 * - gridIntensity: kg CO2/MWh
 * - totalGeneration: TWh
 * - emissions: Gt CO2 from electricity
 */

import { defineModule, Module } from '../framework/module.js';
import { EnergySource, ENERGY_SOURCES, ValidationResult } from '../framework/types.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface DispatchParams {
  /** Capacity factor by source (fraction of nameplate available) */
  capacityFactor: Record<EnergySource, number>;

  /** Maximum penetration by source (fraction of demand) */
  maxPenetration: Record<EnergySource, number>;

  /** Carbon intensity by source (kg CO2/MWh) */
  carbonIntensity: Record<EnergySource, number>;

  /** Hours per year (for capacity -> energy conversion) */
  hoursPerYear: number;

  /** Battery storage duration (hours) for solar firming calculation */
  batteryDuration: number;
}

export const dispatchDefaults: DispatchParams = {
  capacityFactor: {
    solar: 0.20,
    wind: 0.30,
    hydro: 0.42,
    nuclear: 0.90,
    gas: 0.50,
    coal: 0.60,
    battery: 0.20,  // Same as solar (firming)
  },
  maxPenetration: {
    solar: 0.40,     // Bare solar limited by intermittency
    wind: 0.35,
    hydro: 0.20,     // Site-limited
    nuclear: 0.30,   // Baseload
    gas: 1.0,        // Dispatchable, no limit
    coal: 1.0,
    battery: 0.80,   // Solar+battery can reach 80%
  },
  carbonIntensity: {
    solar: 0,
    wind: 0,
    hydro: 0,
    nuclear: 0,
    gas: 400,
    coal: 900,
    battery: 0,
  },
  hoursPerYear: 8760,
  batteryDuration: 4,
};

// =============================================================================
// STATE
// =============================================================================

/** Dispatch module has no persistent state - pure function of inputs */
export interface DispatchState {
  // Empty - dispatch is stateless
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface DispatchInputs {
  /** Total electricity demand (TWh) */
  electricityDemand: number;

  /** Installed capacity by source (GW, GWh for battery) */
  capacities: Record<EnergySource, number>;

  /** Levelized cost by source ($/MWh) */
  lcoes: Record<EnergySource, number>;

  /** Combined solar+battery LCOE ($/MWh) */
  solarPlusBatteryLCOE: number;
}

export interface DispatchOutputs {
  /** Generation by source (TWh) */
  generation: Record<EnergySource | 'solarPlusBattery', number>;

  /** Grid carbon intensity (kg CO2/MWh) */
  gridIntensity: number;

  /** Total generation (TWh) */
  totalGeneration: number;

  /** Electricity emissions (Gt CO2) */
  electricityEmissions: number;

  /** Unmet demand, if any (TWh) */
  shortfall: number;

  /** Cheapest source this year */
  cheapestSource: EnergySource;

  /** Fossil share of generation (fraction) */
  fossilShare: number;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const dispatchModule: Module<
  DispatchParams,
  DispatchState,
  DispatchInputs,
  DispatchOutputs
> = defineModule({
  name: 'dispatch',
  description: 'Merit order dispatch with penetration limits',

  defaults: dispatchDefaults,

  inputs: [
    'electricityDemand',
    'capacities',
    'lcoes',
    'solarPlusBatteryLCOE',
  ] as const,

  outputs: [
    'generation',
    'gridIntensity',
    'totalGeneration',
    'electricityEmissions',
    'shortfall',
    'cheapestSource',
    'fossilShare',
  ] as const,

  validate(params: Partial<DispatchParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const p = { ...dispatchDefaults, ...params };

    for (const source of ENERGY_SOURCES) {
      const cf = p.capacityFactor[source];
      if (cf < 0 || cf > 1) {
        errors.push(`capacityFactor.${source} must be 0-1, got ${cf}`);
      }

      const mp = p.maxPenetration[source];
      if (mp < 0 || mp > 1) {
        errors.push(`maxPenetration.${source} must be 0-1, got ${mp}`);
      }

      const ci = p.carbonIntensity[source];
      if (ci < 0) {
        errors.push(`carbonIntensity.${source} cannot be negative`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<DispatchParams>): DispatchParams {
    return {
      ...dispatchDefaults,
      ...partial,
      capacityFactor: { ...dispatchDefaults.capacityFactor, ...partial.capacityFactor },
      maxPenetration: { ...dispatchDefaults.maxPenetration, ...partial.maxPenetration },
      carbonIntensity: { ...dispatchDefaults.carbonIntensity, ...partial.carbonIntensity },
    };
  },

  init(_params: DispatchParams): DispatchState {
    return {};
  },

  step(_state, inputs, params, _year, _yearIndex) {
    const { electricityDemand, capacities, lcoes, solarPlusBatteryLCOE } = inputs;
    const demandTWh = electricityDemand;

    // Calculate max generation (TWh) each source can provide
    const maxGen: Record<string, number> = {};
    for (const source of ENERGY_SOURCES) {
      const capacity = capacities[source];
      const cf = params.capacityFactor[source];
      maxGen[source] = (capacity * cf * params.hoursPerYear) / 1000;
    }

    // Solar+battery capacity limited by battery storage
    // Battery GWh can firm ~2x its capacity in solar (4h storage, solar produces ~8h)
    const batteryGWh = capacities.battery;
    const solarCapacityFirmable = batteryGWh * 2; // GW of solar that battery can firm
    maxGen['solarPlusBattery'] =
      (Math.min(capacities.solar * 0.5, solarCapacityFirmable) *
        params.capacityFactor.battery *
        params.hoursPerYear) /
      1000;

    // Build source list for merit order
    interface MeritSource {
      name: string;
      lcoe: number;
      max: number;
      carbonIntensity: number;
      isSolar: boolean;
      isBareSolar: boolean;
    }

    const sources: MeritSource[] = [
      {
        name: 'nuclear',
        lcoe: lcoes.nuclear,
        max: maxGen.nuclear,
        carbonIntensity: params.carbonIntensity.nuclear,
        isSolar: false,
        isBareSolar: false,
      },
      {
        name: 'hydro',
        lcoe: lcoes.hydro,
        max: maxGen.hydro,
        carbonIntensity: params.carbonIntensity.hydro,
        isSolar: false,
        isBareSolar: false,
      },
      {
        name: 'solar',
        lcoe: lcoes.solar,
        max: maxGen.solar,
        carbonIntensity: 0,
        isSolar: true,
        isBareSolar: true,
      },
      {
        name: 'solarPlusBattery',
        lcoe: solarPlusBatteryLCOE,
        max: maxGen.solarPlusBattery,
        carbonIntensity: 0,
        isSolar: true,
        isBareSolar: false,
      },
      {
        name: 'wind',
        lcoe: lcoes.wind,
        max: maxGen.wind,
        carbonIntensity: params.carbonIntensity.wind,
        isSolar: false,
        isBareSolar: false,
      },
      {
        name: 'gas',
        lcoe: lcoes.gas,
        max: maxGen.gas,
        carbonIntensity: params.carbonIntensity.gas,
        isSolar: false,
        isBareSolar: false,
      },
      {
        name: 'coal',
        lcoe: lcoes.coal,
        max: maxGen.coal,
        carbonIntensity: params.carbonIntensity.coal,
        isSolar: false,
        isBareSolar: false,
      },
    ];

    // Sort by LCOE (merit order)
    sources.sort((a, b) => a.lcoe - b.lcoe);

    // Find cheapest source
    const cheapestSource = sources[0].name as EnergySource;

    // Dispatch in merit order
    const generation: Record<string, number> = {
      solar: 0,
      wind: 0,
      hydro: 0,
      nuclear: 0,
      gas: 0,
      coal: 0,
      battery: 0,
      solarPlusBattery: 0,
    };

    let remaining = demandTWh;
    let totalSolarAllocated = 0;
    let totalWindAllocated = 0;

    const maxBareSolarPen = params.maxPenetration.solar;
    const maxTotalSolarPen = params.maxPenetration.battery;
    const maxWindPen = params.maxPenetration.wind;

    for (const source of sources) {
      if (remaining <= 0) break;

      let maxAllocation = source.max;

      // Apply penetration limits
      if (source.isSolar) {
        const totalSolarRoom = maxTotalSolarPen * demandTWh - totalSolarAllocated;
        if (source.isBareSolar) {
          const bareSolarRoom = maxBareSolarPen * demandTWh - totalSolarAllocated;
          maxAllocation = Math.min(maxAllocation, bareSolarRoom, totalSolarRoom);
        } else {
          maxAllocation = Math.min(maxAllocation, totalSolarRoom);
        }
      } else if (source.name === 'wind') {
        const windRoom = maxWindPen * demandTWh - totalWindAllocated;
        maxAllocation = Math.min(maxAllocation, windRoom);
      }

      const allocation = Math.min(remaining, Math.max(0, maxAllocation));

      if (allocation > 0) {
        generation[source.name] = allocation;
        remaining -= allocation;

        if (source.isSolar) {
          totalSolarAllocated += allocation;
        } else if (source.name === 'wind') {
          totalWindAllocated += allocation;
        }
      }
    }

    const totalGeneration = demandTWh - remaining;
    const shortfall = remaining;

    // Calculate grid carbon intensity
    const totalEmissionsKg =
      generation.gas * params.carbonIntensity.gas +
      generation.coal * params.carbonIntensity.coal;
    const gridIntensity = totalGeneration > 0 ? totalEmissionsKg / totalGeneration : 0;
    const electricityEmissions = totalEmissionsKg / 1e6; // kg -> Gt

    // Calculate fossil share
    const fossilGen = generation.gas + generation.coal;
    const fossilShare = totalGeneration > 0 ? fossilGen / totalGeneration : 0;

    return {
      state: {},
      outputs: {
        generation: generation as Record<EnergySource | 'solarPlusBattery', number>,
        gridIntensity,
        totalGeneration,
        electricityEmissions,
        shortfall,
        cheapestSource,
        fossilShare,
      },
    };
  },
});

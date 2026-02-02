/**
 * Dispatch Module
 *
 * Merit order dispatch - allocates electricity demand to sources by marginal cost.
 * Real markets dispatch by marginal cost (fuel + variable O&M), not LCOE.
 * Nuclear has high LCOE (~$90) but low marginal cost (~$12), so it dispatches
 * as baseload after renewables.
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

  /** Marginal cost by source ($/MWh) - fuel + variable O&M, no capital */
  marginalCost: Record<EnergySource, number>;

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
  // Marginal cost = fuel + variable O&M (no capital)
  // Nuclear: low marginal (~$12) despite high LCOE (~$90)
  // Gas/coal: fuel cost + carbon price applied dynamically
  marginalCost: {
    solar: 0,
    wind: 0,
    hydro: 5,
    nuclear: 12,
    gas: 35,      // Base fuel cost, carbon added dynamically
    coal: 25,     // Base fuel cost, carbon added dynamically
    battery: 5,
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

  /** Carbon price ($/ton CO2) for marginal cost calculation */
  carbonPrice: number;
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
    'carbonPrice',
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

      const mc = p.marginalCost[source];
      if (mc < 0) {
        errors.push(`marginalCost.${source} cannot be negative`);
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
      marginalCost: { ...dispatchDefaults.marginalCost, ...partial.marginalCost },
    };
  },

  init(_params: DispatchParams): DispatchState {
    return {};
  },

  step(_state, inputs, params, _year, _yearIndex) {
    const { electricityDemand, capacities, lcoes, solarPlusBatteryLCOE, carbonPrice } = inputs;
    const demandTWh = electricityDemand;

    // Calculate marginal costs with carbon price
    // Marginal cost = base fuel/O&M + (carbon intensity * carbon price / 1000)
    const marginalCosts: Record<string, number> = {};
    for (const source of ENERGY_SOURCES) {
      const baseMC = params.marginalCost[source];
      const carbonCost = (params.carbonIntensity[source] * carbonPrice) / 1000;
      marginalCosts[source] = baseMC + carbonCost;
    }
    // Solar+battery marginal cost (slightly higher than bare solar due to battery losses)
    marginalCosts['solarPlusBattery'] = 5;

    // Calculate max generation (TWh) each source can provide
    const maxGen: Record<string, number> = {};
    for (const source of ENERGY_SOURCES) {
      const capacity = capacities[source];
      const cf = params.capacityFactor[source];
      maxGen[source] = (capacity * cf * params.hoursPerYear) / 1000;
    }

    // Solar+battery capacity limited by battery storage
    // Battery capacity is in GWh; convert to GW for comparison with solar GW
    // batteryGW = batteryGWh / batteryDuration (4h default)
    const batteryGWh = capacities.battery;
    const batteryDuration = 4; // hours
    const batteryGW = batteryGWh / batteryDuration;

    // Battery GW can firm roughly equal GW of solar (assumes 4h storage, 8h solar production)
    // So solarCapacityFirmable (GW) ≈ batteryGW
    const solarCapacityFirmable = batteryGW; // GW of solar that battery can firm
    maxGen['solarPlusBattery'] =
      (Math.min(capacities.solar * 0.5, solarCapacityFirmable) *
        params.capacityFactor.battery *
        params.hoursPerYear) /
      1000;

    // Build source list for merit order (sorted by marginal cost, not LCOE)
    interface MeritSource {
      name: string;
      marginalCost: number;
      max: number;
      carbonIntensity: number;
      isSolar: boolean;
      isBareSolar: boolean;
    }

    const sources: MeritSource[] = [
      {
        name: 'nuclear',
        marginalCost: marginalCosts.nuclear,
        max: maxGen.nuclear,
        carbonIntensity: params.carbonIntensity.nuclear,
        isSolar: false,
        isBareSolar: false,
      },
      {
        name: 'hydro',
        marginalCost: marginalCosts.hydro,
        max: maxGen.hydro,
        carbonIntensity: params.carbonIntensity.hydro,
        isSolar: false,
        isBareSolar: false,
      },
      {
        name: 'solar',
        marginalCost: marginalCosts.solar,
        max: maxGen.solar,
        carbonIntensity: 0,
        isSolar: true,
        isBareSolar: true,
      },
      {
        name: 'solarPlusBattery',
        marginalCost: marginalCosts.solarPlusBattery,
        max: maxGen.solarPlusBattery,
        carbonIntensity: 0,
        isSolar: true,
        isBareSolar: false,
      },
      {
        name: 'wind',
        marginalCost: marginalCosts.wind,
        max: maxGen.wind,
        carbonIntensity: params.carbonIntensity.wind,
        isSolar: false,
        isBareSolar: false,
      },
      {
        name: 'gas',
        marginalCost: marginalCosts.gas,
        max: maxGen.gas,
        carbonIntensity: params.carbonIntensity.gas,
        isSolar: false,
        isBareSolar: false,
      },
      {
        name: 'coal',
        marginalCost: marginalCosts.coal,
        max: maxGen.coal,
        carbonIntensity: params.carbonIntensity.coal,
        isSolar: false,
        isBareSolar: false,
      },
    ];

    // Sort by marginal cost (merit order) - NOT by LCOE
    // Nuclear has high LCOE but low marginal cost, so it dispatches early
    sources.sort((a, b) => a.marginalCost - b.marginalCost);

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

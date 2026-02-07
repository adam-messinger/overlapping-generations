/**
 * Dispatch Module
 *
 * Merit order dispatch - allocates electricity demand to sources by marginal cost.
 * Real markets dispatch by marginal cost (fuel + variable O&M), not LCOE.
 * Nuclear has high LCOE (~$90) but low marginal cost (~$12), so it dispatches
 * as baseload after renewables.
 *
 * REGIONALIZATION (v2):
 * - Each region has an independent grid (no inter-regional trade)
 * - Regional carbon prices affect merit order (higher carbon → gas/coal more expensive)
 * - Regional capacities determine generation limits
 * - Global aggregates preserved for backwards compatibility
 *
 * Inputs (from other modules):
 * - electricityDemand: Total demand (TWh) - GLOBAL
 * - regionalElectricityDemand: Regional demand (TWh)
 * - capacities: Installed capacity by source (GW) - GLOBAL (sum)
 * - regionalCapacities: Regional capacity breakdown
 * - regionalCarbonPrice: Regional carbon prices
 *
 * Outputs (to other modules):
 * - generation: TWh by source - GLOBAL (sum)
 * - regional: Regional breakdown
 * - gridIntensity: kg CO2/MWh - GLOBAL (weighted avg)
 * - totalGeneration: TWh - GLOBAL
 * - emissions: Gt CO2 from electricity - GLOBAL
 */

import { defineModule, Module } from '../framework/module.js';
import { EnergySource, ENERGY_SOURCES, Region, REGIONS, ValidationResult } from '../framework/types.js';
import { validatedMerge } from '../framework/validated-merge.js';
import { distributeByGDP, GDP_SHARES } from '../primitives/distribute.js';

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

  /** Storage-based VRE limits */
  baseVRELimit: number;              // VRE limit with 0h storage (default 0.30)
  storageBonusPerHour: number;       // Additional VRE share per storage hour (0.08)
  maxVRECeiling: number;             // Physical max VRE share (0.95)

  /** Soft curtailment parameters */
  curtailmentOnset: number;          // VRE share where curtailment begins (default 0.30)
  curtailmentCoeff: number;          // Quadratic penalty coefficient (default 1.5)
  maxCurtailmentPenalty: number;     // Cap on curtailment penalty (default 0.5)

  /** VRE sub-fraction allocation within maxVREPenetration */
  vreSolarFraction: number;          // Bare solar share of VRE capacity (default 0.5)
  vreTotalSolarFraction: number;     // Total solar (bare + battery) share (default 0.7)
  vreWindFraction: number;           // Wind share of VRE capacity (default 0.6)

  /** Long-duration storage VRE bonus per effective hour */
  longStorageBonusPerHour: number;   // Additional VRE share per long-storage hour (0.04)
}

export const dispatchDefaults: DispatchParams = {
  capacityFactor: {
    solar: 0.20,
    wind: 0.30,
    hydro: 0.38,
    nuclear: 0.83,
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

  // Storage-based VRE limits
  baseVRELimit: 0.30,                // Grid handles 30% VRE with no storage
  storageBonusPerHour: 0.08,         // Each storage hour adds 8% VRE capacity
  maxVRECeiling: 0.95,               // Physical max (need some dispatchable)

  // Soft curtailment
  curtailmentOnset: 0.30,            // VRE curtailment begins at 30% share
  curtailmentCoeff: 1.5,             // Quadratic penalty coefficient
  maxCurtailmentPenalty: 0.5,        // Cap on curtailment penalty

  // VRE sub-fraction allocation
  vreSolarFraction: 0.5,             // Bare solar share of VRE capacity
  vreTotalSolarFraction: 0.7,        // Total solar (bare + battery) share of VRE
  vreWindFraction: 0.6,              // Wind share of VRE capacity

  // Long-duration storage
  longStorageBonusPerHour: 0.04,     // Half of short-duration's 0.08
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
  /** Total electricity demand (TWh) - GLOBAL */
  electricityDemand: number;

  /** Regional electricity demand (TWh) */
  regionalElectricityDemand?: Record<Region, number>;

  /** Installed capacity by source (GW, GWh for battery) - GLOBAL (sum) */
  capacities: Record<EnergySource, number>;

  /** Regional capacity breakdown */
  regionalCapacities?: Record<Region, Record<EnergySource, number>>;

  /** Carbon price ($/ton CO2) - GLOBAL fallback */
  carbonPrice: number;

  /** Regional carbon prices ($/ton CO2) */
  regionalCarbonPrice?: Record<Region, number>;

  /** Long-duration storage regional capacities (GWh) */
  longStorageRegional?: Record<Region, number>;

  /** Effective solar capacity factor (site-depletion adjusted) */
  effectiveSolarCF?: number;

  /** Effective wind capacity factor (site-depletion adjusted) */
  effectiveWindCF?: number;
}

/** Regional dispatch outputs */
export interface RegionalDispatchOutputs {
  generation: Record<EnergySource | 'solarPlusBattery', number>;
  gridIntensity: number;
  electricityEmissions: number;
  fossilShare: number;
  totalGeneration: number;
  shortfall: number;
  curtailmentTWh: number;
  curtailmentRate: number;
}

export interface DispatchOutputs {
  /** Generation by source (TWh) - GLOBAL (sum of regional) */
  generation: Record<EnergySource | 'solarPlusBattery', number>;

  /** Regional generation breakdown */
  regionalGeneration: Record<Region, Record<EnergySource | 'solarPlusBattery', number>>;

  /** Grid carbon intensity (kg CO2/MWh) - GLOBAL (generation-weighted avg) */
  gridIntensity: number;

  /** Regional grid intensity */
  regionalGridIntensity: Record<Region, number>;

  /** Total generation (TWh) - GLOBAL */
  totalGeneration: number;

  /** Electricity emissions (Gt CO2) - GLOBAL (sum) */
  electricityEmissions: number;

  /** Regional emissions */
  regionalEmissions: Record<Region, number>;

  /** Unmet demand, if any (TWh) - GLOBAL */
  shortfall: number;

  /** Cheapest source this year */
  cheapestSource: EnergySource;

  /** Fossil share of generation (fraction) - GLOBAL */
  fossilShare: number;

  /** Regional fossil share */
  regionalFossilShare: Record<Region, number>;

  /** VRE curtailment (TWh) - GLOBAL */
  curtailmentTWh: number;

  /** Curtailment rate (fraction of available VRE) - GLOBAL */
  curtailmentRate: number;

  /** Regional curtailment (TWh) */
  regionalCurtailment: Record<Region, number>;

  /** Regional detail for other modules */
  dispatchRegional: Record<Region, RegionalDispatchOutputs>;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

// =============================================================================
// HELPER: Dispatch for a single region
// =============================================================================

interface MeritSource {
  name: string;
  marginalCost: number;
  max: number;
  carbonIntensity: number;
  isSolar: boolean;
  isBareSolar: boolean;
}

function dispatchRegion(
  demandTWh: number,
  capacities: Record<EnergySource, number>,
  carbonPrice: number,
  params: DispatchParams,
  longStorageGWh: number = 0
): RegionalDispatchOutputs {
  // Calculate marginal costs with regional carbon price
  const marginalCosts: Record<string, number> = {};
  for (const source of ENERGY_SOURCES) {
    const baseMC = params.marginalCost[source];
    const carbonCost = (params.carbonIntensity[source] * carbonPrice) / 1000;
    marginalCosts[source] = baseMC + carbonCost;
  }
  marginalCosts['solarPlusBattery'] = params.marginalCost.battery;

  // Calculate max generation (TWh) each source can provide
  const maxGen: Record<string, number> = {};
  for (const source of ENERGY_SOURCES) {
    const capacity = capacities[source];
    const cf = params.capacityFactor[source];
    maxGen[source] = (capacity * cf * params.hoursPerYear) / 1000;
  }

  // Solar+battery capacity limited by battery storage
  const batteryGWh = capacities.battery;
  const batteryGW = batteryGWh / params.batteryDuration;
  const pairedSolarGW = Math.min(capacities.solar * 0.5, batteryGW);
  maxGen['solarPlusBattery'] =
    (pairedSolarGW * params.capacityFactor.battery * params.hoursPerYear) / 1000;

  // For curtailment, count solar panels once (bare solar covers all panels;
  // solarPlusBattery draws from the same panels via storage)
  const totalAvailableVRE = maxGen.solar + maxGen.wind;

  // Save pre-curtailment VRE values for shortfall release
  const preCurtailmentSolar = maxGen.solar;
  const preCurtailmentSolarBattery = maxGen.solarPlusBattery;
  const preCurtailmentWind = maxGen.wind;

  // Soft curtailment: reduce effective VRE as share increases beyond onset
  const expectedVREShare = demandTWh > 0 ? totalAvailableVRE / demandTWh : 0;
  if (expectedVREShare > params.curtailmentOnset) {
    const excess = expectedVREShare - params.curtailmentOnset;
    const penalty = Math.min(params.maxCurtailmentPenalty, params.curtailmentCoeff * excess * excess);
    maxGen.solar *= (1 - penalty);
    maxGen.solarPlusBattery *= (1 - penalty);
    maxGen.wind *= (1 - penalty);
  }

  // Solar and solar+storage share the same underlying solar capacity.
  // Track remaining solar generation potential to avoid double-counting.
  let remainingSolarGen = maxGen.solar;

  // Build merit order
  const sources: MeritSource[] = [
    { name: 'nuclear', marginalCost: marginalCosts.nuclear, max: maxGen.nuclear, carbonIntensity: params.carbonIntensity.nuclear, isSolar: false, isBareSolar: false },
    { name: 'hydro', marginalCost: marginalCosts.hydro, max: maxGen.hydro, carbonIntensity: params.carbonIntensity.hydro, isSolar: false, isBareSolar: false },
    { name: 'solar', marginalCost: marginalCosts.solar, max: maxGen.solar, carbonIntensity: 0, isSolar: true, isBareSolar: true },
    { name: 'solarPlusBattery', marginalCost: marginalCosts.solarPlusBattery, max: maxGen.solarPlusBattery, carbonIntensity: 0, isSolar: true, isBareSolar: false },
    { name: 'wind', marginalCost: marginalCosts.wind, max: maxGen.wind, carbonIntensity: params.carbonIntensity.wind, isSolar: false, isBareSolar: false },
    { name: 'gas', marginalCost: marginalCosts.gas, max: maxGen.gas, carbonIntensity: params.carbonIntensity.gas, isSolar: false, isBareSolar: false },
    { name: 'coal', marginalCost: marginalCosts.coal, max: maxGen.coal, carbonIntensity: params.carbonIntensity.coal, isSolar: false, isBareSolar: false },
  ];

  sources.sort((a, b) => a.marginalCost - b.marginalCost);

  // Dispatch in merit order
  const generation: Record<string, number> = {
    solar: 0, wind: 0, hydro: 0, nuclear: 0, gas: 0, coal: 0, battery: 0, solarPlusBattery: 0,
  };

  let remaining = demandTWh;
  let totalSolarAllocated = 0;
  let totalWindAllocated = 0;
  let totalVREAllocated = 0;

  // VRE limits based on two-tier storage (short-duration batteries + long-duration)
  const PEAK_TO_AVERAGE_RATIO = 2;
  const peakDemandGW = (demandTWh * 1000) / params.hoursPerYear * PEAK_TO_AVERAGE_RATIO;
  const shortStorageHours = batteryGWh / Math.max(1, peakDemandGW);
  const longStorageHours = longStorageGWh / Math.max(1, peakDemandGW);
  const maxVREPenetration = Math.min(
    params.maxVRECeiling,
    params.baseVRELimit
      + shortStorageHours * params.storageBonusPerHour
      + longStorageHours * params.longStorageBonusPerHour
  );
  const maxBareSolarPen = Math.min(maxVREPenetration * params.vreSolarFraction, params.maxPenetration.solar);
  const maxTotalSolarPen = Math.min(maxVREPenetration * params.vreTotalSolarFraction, params.maxPenetration.solar + params.maxPenetration.battery);
  const maxWindPen = Math.min(maxVREPenetration * params.vreWindFraction, params.maxPenetration.wind);
  const maxCombinedVRE = params.baseVRELimit
    + shortStorageHours * params.storageBonusPerHour
    + longStorageHours * params.longStorageBonusPerHour;

  for (const source of sources) {
    if (remaining <= 0) break;

    let maxAllocation = source.max;

    if (source.isSolar) {
      const totalSolarRoom = maxTotalSolarPen * demandTWh - totalSolarAllocated;
      if (source.isBareSolar) {
        const bareSolarRoom = maxBareSolarPen * demandTWh - totalSolarAllocated;
        maxAllocation = Math.min(maxAllocation, bareSolarRoom, totalSolarRoom);
      } else {
        maxAllocation = Math.min(maxAllocation, totalSolarRoom);
      }
      const combinedRoom = Math.min(params.maxVRECeiling, maxCombinedVRE) * demandTWh - totalVREAllocated;
      maxAllocation = Math.min(maxAllocation, combinedRoom);
    } else if (source.name === 'wind') {
      const windRoom = maxWindPen * demandTWh - totalWindAllocated;
      maxAllocation = Math.min(maxAllocation, windRoom);
      const combinedRoom = Math.min(params.maxVRECeiling, maxCombinedVRE) * demandTWh - totalVREAllocated;
      maxAllocation = Math.min(maxAllocation, combinedRoom);
    }

    // Ensure solar and solar+storage do not exceed total solar potential
    if (source.isSolar) {
      maxAllocation = Math.min(maxAllocation, remainingSolarGen);
    }

    const allocation = Math.min(remaining, Math.max(0, maxAllocation));

    if (allocation > 0) {
      generation[source.name] = allocation;
      remaining -= allocation;

      if (source.isSolar) {
        totalSolarAllocated += allocation;
        totalVREAllocated += allocation;
        remainingSolarGen = Math.max(0, remainingSolarGen - allocation);
      } else if (source.name === 'wind') {
        totalWindAllocated += allocation;
        totalVREAllocated += allocation;
      }
    }
  }

  // Release curtailed VRE to fill any shortfall before tracking curtailment
  if (remaining > 0) {
    const curtailedSolar = preCurtailmentSolar - maxGen.solar;
    const curtailedSolarBattery = preCurtailmentSolarBattery - maxGen.solarPlusBattery;
    const curtailedWind = preCurtailmentWind - maxGen.wind;
    const totalCurtailed = curtailedSolar + curtailedSolarBattery + curtailedWind;

    if (totalCurtailed > 0) {
      const release = Math.min(remaining, totalCurtailed);
      // Pro-rata release across VRE sources
      generation.solar += release * (curtailedSolar / totalCurtailed);
      generation.solarPlusBattery += release * (curtailedSolarBattery / totalCurtailed);
      generation.wind += release * (curtailedWind / totalCurtailed);
      remaining -= release;
    }
  }

  // Curtailment tracking (from final dispatched vs pre-curtailment available)
  const totalDispatchedVRE = generation.solar + generation.solarPlusBattery + generation.wind;
  const curtailmentTWh = Math.max(0, totalAvailableVRE - totalDispatchedVRE);
  const curtailmentRate = totalAvailableVRE > 0 ? curtailmentTWh / totalAvailableVRE : 0;

  const totalGeneration = demandTWh - remaining;
  const shortfall = remaining;

  // TWh × kg/MWh = 1e6 × Gt CO2 (intermediate unit for both intensity and emissions)
  const emissionsProduct =
    generation.gas * params.carbonIntensity.gas +
    generation.coal * params.carbonIntensity.coal;
  const gridIntensity = totalGeneration > 0 ? emissionsProduct / totalGeneration : 0; // kg CO2/MWh
  const electricityEmissions = emissionsProduct / 1e6; // Gt CO2

  const fossilGen = generation.gas + generation.coal;
  const fossilShare = totalGeneration > 0 ? fossilGen / totalGeneration : 0;

  return {
    generation: generation as Record<EnergySource | 'solarPlusBattery', number>,
    gridIntensity,
    electricityEmissions,
    fossilShare,
    totalGeneration,
    shortfall,
    curtailmentTWh,
    curtailmentRate,
  };
}

// =============================================================================
// HELPER: Distribute value by GDP share (fallback)
// =============================================================================

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
  description: 'Regional merit order dispatch with penetration limits',

  defaults: dispatchDefaults,

  inputs: [
    'electricityDemand',
    'regionalElectricityDemand',
    'capacities',
    'regionalCapacities',
    'carbonPrice',
    'regionalCarbonPrice',
    'longStorageRegional',
    'effectiveSolarCF',
    'effectiveWindCF',
  ] as const,

  outputs: [
    'generation',
    'regionalGeneration',
    'gridIntensity',
    'regionalGridIntensity',
    'totalGeneration',
    'electricityEmissions',
    'regionalEmissions',
    'shortfall',
    'cheapestSource',
    'fossilShare',
    'regionalFossilShare',
    'curtailmentTWh',
    'curtailmentRate',
    'regionalCurtailment',
    'dispatchRegional',
  ] as const,

  paramMeta: {
    curtailmentOnset: {
      description: 'VRE share of demand at which soft curtailment begins.',
      unit: 'fraction',
      range: { min: 0.15, max: 0.50, default: 0.30 },
      tier: 1 as const,
    },
    curtailmentCoeff: {
      description: 'Quadratic penalty coefficient for VRE curtailment beyond onset.',
      unit: 'per fraction²',
      range: { min: 0.5, max: 3.0, default: 1.5 },
      tier: 1 as const,
    },
  },

  connectorTypes: {
    inputs: {
      electricityDemand: 'number',
      regionalElectricityDemand: 'record',
      capacities: 'record',
      regionalCapacities: 'nested-record',
      carbonPrice: 'number',
      regionalCarbonPrice: 'record',
      longStorageRegional: 'record',
      effectiveSolarCF: 'number',
      effectiveWindCF: 'number',
    },
    outputs: {
      generation: 'record',
      regionalGeneration: 'nested-record',
      gridIntensity: 'number',
      regionalGridIntensity: 'record',
      totalGeneration: 'number',
      electricityEmissions: 'number',
      regionalEmissions: 'record',
      shortfall: 'number',
      fossilShare: 'number',
      regionalFossilShare: 'record',
      curtailmentTWh: 'number',
      curtailmentRate: 'number',
      regionalCurtailment: 'record',
      dispatchRegional: 'nested-record',
    },
  },

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
    return validatedMerge('dispatch', this.validate, (p) => ({
      ...dispatchDefaults,
      ...p,
      capacityFactor: { ...dispatchDefaults.capacityFactor, ...p.capacityFactor },
      maxPenetration: { ...dispatchDefaults.maxPenetration, ...p.maxPenetration },
      carbonIntensity: { ...dispatchDefaults.carbonIntensity, ...p.carbonIntensity },
      marginalCost: { ...dispatchDefaults.marginalCost, ...p.marginalCost },
    }), partial);
  },

  init(_params: DispatchParams): DispatchState {
    return {};
  },

  step(_state, inputs, params, _year, _yearIndex) {
    const {
      electricityDemand,
      capacities,
      carbonPrice,
    } = inputs;

    // Get regional inputs (or distribute by GDP share)
    const regionalDemand = inputs.regionalElectricityDemand ?? distributeByGDP(electricityDemand);
    const regionalCapacities = inputs.regionalCapacities ?? distributeCapacitiesByGDP(capacities);
    const regionalCarbonPrice = inputs.regionalCarbonPrice ??
      Object.fromEntries(REGIONS.map(r => [r, carbonPrice])) as Record<Region, number>;

    // Process each region independently
    const regionalOutputs: Record<Region, RegionalDispatchOutputs> = {} as any;
    const regionalGeneration: Record<Region, Record<EnergySource | 'solarPlusBattery', number>> = {} as any;
    const regionalGridIntensity: Record<Region, number> = {} as any;
    const regionalEmissions: Record<Region, number> = {} as any;
    const regionalFossilShare: Record<Region, number> = {} as any;

    const longStorageRegional = inputs.longStorageRegional ??
      Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>;

    // Use site-depletion-adjusted CFs from energy module when available
    const effectiveParams = (inputs.effectiveSolarCF != null || inputs.effectiveWindCF != null)
      ? {
          ...params,
          capacityFactor: {
            ...params.capacityFactor,
            ...(inputs.effectiveSolarCF != null && { solar: inputs.effectiveSolarCF }),
            ...(inputs.effectiveWindCF != null && { wind: inputs.effectiveWindCF }),
          },
        }
      : params;

    for (const region of REGIONS) {
      const regionResult = dispatchRegion(
        regionalDemand[region],
        regionalCapacities[region],
        regionalCarbonPrice[region],
        effectiveParams,
        longStorageRegional[region]
      );

      regionalOutputs[region] = regionResult;
      regionalGeneration[region] = regionResult.generation;
      regionalGridIntensity[region] = regionResult.gridIntensity;
      regionalEmissions[region] = regionResult.electricityEmissions;
      regionalFossilShare[region] = regionResult.fossilShare;
    }

    // Aggregate global totals
    const globalGeneration: Record<string, number> = {
      solar: 0, wind: 0, hydro: 0, nuclear: 0, gas: 0, coal: 0, battery: 0, solarPlusBattery: 0,
    };

    let globalTotalGeneration = 0;
    let globalShortfall = 0;
    let globalEmissionsProduct = 0; // TWh × kg/MWh (intermediate unit)
    let globalCurtailmentTWh = 0;
    const regionalCurtailment: Record<Region, number> = {} as Record<Region, number>;

    for (const region of REGIONS) {
      const rg = regionalGeneration[region];
      for (const source of [...ENERGY_SOURCES, 'solarPlusBattery'] as const) {
        globalGeneration[source] += rg[source];
      }
      globalTotalGeneration += regionalOutputs[region].totalGeneration;
      globalShortfall += regionalOutputs[region].shortfall;
      globalEmissionsProduct += regionalOutputs[region].electricityEmissions * 1e6; // Gt → intermediate unit
      globalCurtailmentTWh += regionalOutputs[region].curtailmentTWh;
      regionalCurtailment[region] = regionalOutputs[region].curtailmentTWh;
    }

    // Global curtailment rate from regional sums
    const globalAvailableVRE = globalGeneration.solar + globalGeneration.solarPlusBattery + globalGeneration.wind + globalCurtailmentTWh;
    const globalCurtailmentRate = globalAvailableVRE > 0 ? globalCurtailmentTWh / globalAvailableVRE : 0;

    const globalGridIntensity = globalTotalGeneration > 0 ? globalEmissionsProduct / globalTotalGeneration : 0;
    const globalElectricityEmissions = globalEmissionsProduct / 1e6;

    const fossilGen = globalGeneration.gas + globalGeneration.coal;
    const globalFossilShare = globalTotalGeneration > 0 ? fossilGen / globalTotalGeneration : 0;

    // Find cheapest source with non-zero generation (by marginal cost)
    let cheapestSource: EnergySource = 'solar';
    let lowestMC = Infinity;
    for (const source of ENERGY_SOURCES) {
      if (globalGeneration[source] > 0) {
        const baseMC = params.marginalCost[source];
        const carbonCost = (params.carbonIntensity[source] * carbonPrice) / 1000;
        const mc = baseMC + carbonCost;
        if (mc < lowestMC) {
          lowestMC = mc;
          cheapestSource = source;
        }
      }
    }

    return {
      state: {},
      outputs: {
        generation: globalGeneration as Record<EnergySource | 'solarPlusBattery', number>,
        regionalGeneration,
        gridIntensity: globalGridIntensity,
        regionalGridIntensity,
        totalGeneration: globalTotalGeneration,
        electricityEmissions: globalElectricityEmissions,
        regionalEmissions,
        shortfall: globalShortfall,
        cheapestSource,
        fossilShare: globalFossilShare,
        regionalFossilShare,
        curtailmentTWh: globalCurtailmentTWh,
        curtailmentRate: globalCurtailmentRate,
        regionalCurtailment,
        dispatchRegional: regionalOutputs,
      },
    };
  },
});

// =============================================================================
// HELPER: Distribute capacities by GDP share (fallback)
// =============================================================================

function distributeCapacitiesByGDP(
  capacities: Record<EnergySource, number>
): Record<Region, Record<EnergySource, number>> {
  const result: Record<Region, Record<EnergySource, number>> = {} as any;

  for (const region of REGIONS) {
    result[region] = {} as any;
    for (const source of ENERGY_SOURCES) {
      result[region][source] = capacities[source] * GDP_SHARES[region];
    }
  }

  return result;
}

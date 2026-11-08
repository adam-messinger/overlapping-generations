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

import {
  assertUnitBalance,
  atMost,
  closeTo,
  convertQuantity,
  defineModule,
  type ModuleInvariant,
  sumValues,
  divideQuantities,
  Module,
  multiplyQuantities,
  subtractQuantities,
  sumQuantities,
  unitPort,
  unitQuantity,
  ValidationResult,
  validatedMerge,
} from 'tsimulation';
import {
  ENERGY_CAPACITY_PORT,
  REGIONAL_ENERGY_CAPACITY_PORT,
} from '../port-schemas.js';
import { EnergySource, ENERGY_SOURCES, Region, REGIONS } from '../domain-types.js';
import { distributeByGDP, GDP_SHARES } from '../primitives/distribute.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface DispatchParams {
  /**
   * Capacity factor by source: the share of nameplate each source runs at in
   * the merit order. For gas and coal this is world-average UTILIZATION (how
   * hard the fleet runs where other sources share the load), not what a
   * plant can physically deliver; see `availability`.
   */
  capacityFactor: Record<EnergySource, number>;

  /**
   * Annual availability of thermal plants (fraction of nameplate): the most a
   * gas or coal fleet can generate in a year once planned and forced outages
   * are taken out. The gap above `capacityFactor` is headroom dispatched only
   * for demand the merit order leaves unserved, so a region whose thermal
   * fleet carries the load (India coal, LatAm gas and coal) runs its plants
   * harder than the world average, as it does, while a region with other
   * supply keeps the calibrated utilization. Hydro and nuclear have no
   * headroom: hydro is limited by water, and nuclear already runs near its
   * availability.
   */
  availability: Record<'gas' | 'coal', number>;

  /** Carbon intensity by source (kg CO2/MWh) */
  carbonIntensity: Record<EnergySource, number>;

  /** Marginal cost by source ($/MWh) - fuel + variable O&M, no capital */
  marginalCost: Record<EnergySource, number>;

  /** Hours per year (for capacity -> energy conversion) */
  hoursPerYear: number;

  /**
   * Generation required per unit of delivered demand: T&D losses (~8%,
   * IEA world average) plus station own-use and other transformation
   * (~12%). Demand-side electricityDemand is delivered/final-energy basis
   * (IEA TFC); generation, emissions, and grid intensity are
   * generation-basis, matching IEA/Ember statistics.
   */
  gridLossFactor: number;

  /** Battery storage duration (hours) for solar firming calculation */
  batteryDuration: number;

  /** Storage-based VRE limits */
  baseVRELimit: number;              // VRE limit with 0h storage (default 0.30)
  storageBonusPerHour: number;       // Additional VRE share per storage hour (0.08)

  /** Soft curtailment parameters */
  curtailmentOnset: number;          // VRE share where curtailment begins with NO storage (default 0.30); storage shifts it by the penetration headroom it adds
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
  // Global fleet-average capacity factors, Ember/IEA electricity data
  // 2023-24 (solar ~14-20% by region, wind ~25-35%, nuclear ~80%+, hydro
  // ~38%; gas/coal are utilization, not availability: see `availability`)
  capacityFactor: {
    solar: 0.20,
    wind: 0.30,
    hydro: 0.38,
    nuclear: 0.83,
    gas: 0.50,
    coal: 0.60,
    battery: 0.20,  // Same as solar (firming)
  },
  // Equivalent availability factor (1 - planned - forced outage share).
  // NERC GADS 2019-23 fleet averages (NERC State of Reliability 2024): gas
  // combined cycle ~85-88%, coal ~75-82% (coal forced outages ~2x gas). IEA/
  // NEA Projected Costs of Generating Electricity 2020 takes 85% as the
  // achievable baseload load factor for both. Gas is the CCGT figure, which
  // dominates fleet energy; coal sits between the two sources.
  availability: {
    gas: 0.85,
    coal: 0.80,
  },
  // Combustion intensity kg CO2/MWh: gas CCGT ~350-450, coal ~800-1000
  // (IPCC AR5 Annex III combustion values; lifecycle excluded)
  carbonIntensity: {
    solar: 0,
    wind: 0,
    hydro: 0,
    nuclear: 0,
    gas: 440,   // world fleet average incl. open-cycle and older CCGT (Ember 2024 ~443 kg/MWh)
    coal: 970,  // world fleet average, subcritical-heavy (IEA/Ember ~950-1000 kg/MWh; 900 was modern-plant, not fleet)
    battery: 0,
  },
  // Marginal cost = fuel + variable O&M (no capital), $/MWh.
  // Nuclear ~$12: NEI/EIA fuel + variable O&M; gas $35 ≈ $4/MMBtu at ~7
  // heat rate + VOM; coal $25 ≈ $2/MMBtu at ~10 heat rate + VOM (2024 US
  // reference prices; carbon cost applied dynamically)
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
  gridLossFactor: 1.25,     // generation/delivered: IEA ~31.5k TWh generated (2025) vs ~25k delivered final electricity
  batteryDuration: 4,

  // Storage-based VRE limits
  baseVRELimit: 0.30,                // Grid handles 30% VRE with no storage
  storageBonusPerHour: 0.08,         // Each storage hour adds 8% VRE capacity

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

  /** Standby (firm-adequacy) capacity inside regionalCapacities (GW). It is
   *  held for security, so it runs only after every other source and the
   *  curtailed-VRE release: it serves demand that would otherwise go unmet. */
  regionalStandbyCapacity?: Record<Region, Partial<Record<'coal' | 'gas', number>>>;
  /** Fuel + VOM $/MWh by region from energy (one source of truth for fuel prices); falls back to marginalCost */
  regionalFossilRunningCost?: Record<Region, Partial<Record<'coal' | 'gas', number>>>;

  /** Carbon price ($/ton CO2) - GLOBAL fallback */
  carbonPrice: number;

  /** Regional carbon prices ($/ton CO2) */
  regionalCarbonPrice?: Record<Region, number>;

  /** Long-duration storage regional capacities (GWh) */
  longStorageRegional?: Record<Region, number>;

  /** Effective solar capacity factor (site-depletion adjusted) */
  /**
   * Site-depletion-adjusted capacity factors by region. Preferred over the
   * fleet means below: one mean applied everywhere lets a region generate
   * more than its own panels physically can.
   */
  regionalEffectiveSolarCF?: Record<Region, number>;
  regionalEffectiveWindCF?: Record<Region, number>;

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

  /** Share of required generation left unserved by region (0-1) */
  regionalShortfallRate: Record<Region, number>;

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

  /** Regional curtailment rate (fraction of the region's available VRE).
   *  Energy damps each region's VRE build by its OWN rate, not the world's. */
  regionalCurtailmentRate: Record<Region, number>;
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

function annualGenerationTWh(
  capacityGW: number,
  capacityFactor: number,
  hoursPerYear: number,
  label: string,
): number {
  return convertQuantity(multiplyQuantities([
    unitQuantity(capacityGW, 'GW', `${label} capacity`),
    unitQuantity(capacityFactor, 'fraction', `${label} capacity factor`),
    unitQuantity(hoursPerYear, 'hour/year', 'operating hours'),
  ], `${label} annual generation`), 'TWh/year').value;
}

function dispatchRegion(
  demandTWh: number,
  capacities: Record<EnergySource, number>,
  carbonPrice: number,
  params: DispatchParams,
  longStorageGWh: number = 0,
  standbyGW: Partial<Record<'coal' | 'gas', number>> = {},
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
    if (source === 'battery') {
      // Battery is an energy stock (GWh), not generation power (GW). Its
      // contribution is represented only through solarPlusBattery below.
      maxGen[source] = 0;
      continue;
    }
    // Standby capacity is held out of the merit order (dispatched last, below)
    const standby = source === 'coal' || source === 'gas' ? (standbyGW[source] ?? 0) : 0;
    const capacity = Math.max(0, capacities[source] - standby);
    const cf = params.capacityFactor[source];
    maxGen[source] = annualGenerationTWh(capacity, cf, params.hoursPerYear, source);
  }

  // Solar+battery capacity limited by battery storage
  const batteryGWh = capacities.battery;
  const batteryGW = convertQuantity(divideQuantities(
    unitQuantity(batteryGWh, 'GWh', 'battery energy capacity'),
    unitQuantity(params.batteryDuration, 'hour', 'battery duration'),
    'battery discharge power',
  ), 'GW').value;
  const pairedSolarGW = Math.min(capacities.solar * 0.5, batteryGW);
  maxGen['solarPlusBattery'] = annualGenerationTWh(
    pairedSolarGW,
    params.capacityFactor.battery,
    params.hoursPerYear,
    'solar plus battery',
  );

  // For curtailment, count solar panels once (bare solar covers all panels;
  // solarPlusBattery draws from the same panels via storage)
  const totalAvailableVRE = maxGen.solar + maxGen.wind;

  // Save pre-curtailment VRE values for shortfall release
  const preCurtailmentSolar = maxGen.solar;
  const preCurtailmentWind = maxGen.wind;

  // VRE limits based on two-tier storage (short-duration batteries + long-duration)
  const PEAK_TO_AVERAGE_RATIO = 2;
  const averageDemandGW = convertQuantity(divideQuantities(
    unitQuantity(demandTWh, 'TWh/year', 'annual electricity demand'),
    unitQuantity(params.hoursPerYear, 'hour/year', 'operating hours'),
    'average electricity demand',
  ), 'GW').value;
  const peakDemandGW = averageDemandGW * PEAK_TO_AVERAGE_RATIO;
  const shortStorageHours = convertQuantity(divideQuantities(
    unitQuantity(batteryGWh, 'GWh', 'short-duration storage'),
    unitQuantity(Math.max(1, peakDemandGW), 'GW', 'peak demand'),
    'short-duration storage hours',
  ), 'hour').value;
  const longStorageHours = convertQuantity(divideQuantities(
    unitQuantity(longStorageGWh, 'GWh', 'long-duration storage'),
    unitQuantity(Math.max(1, peakDemandGW), 'GW', 'peak demand'),
    'long-duration storage hours',
  ), 'hour').value;
  // VRE penetration limit = storage-based headroom. No separate ceiling: the
  // old 0.95 maxVRECeiling never bound (curtailment, per-source caps, and the
  // demand limit clamp VRE first), and it made maxVREPenetration a redundant
  // copy of this same expression — verified byte-identical across all scenarios.
  const maxCombinedVRE = params.baseVRELimit
    + shortStorageHours * params.storageBonusPerHour
    + longStorageHours * params.longStorageBonusPerHour;

  // Soft curtailment: reduce effective VRE as share increases beyond onset.
  // Storage moves the onset by the same headroom it adds to the penetration
  // limit: shifting surplus midday output into other hours is exactly what
  // lets a grid absorb more VRE before spilling it. Without this the penalty
  // took ~47% of US VRE in 2075 at 86% VRE share despite 8h short + 21h long
  // storage (penetration limit 180%), and energy's build read that as every
  // new VRE MW being half wasted, so unpriced coal won the build.
  const storageHeadroom = maxCombinedVRE - params.baseVRELimit;
  const curtailmentOnset = params.curtailmentOnset + storageHeadroom;
  const expectedVREShare = demandTWh > 0 ? totalAvailableVRE / demandTWh : 0;
  if (expectedVREShare > curtailmentOnset) {
    const excess = expectedVREShare - curtailmentOnset;
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

  // VRE headroom split by sub-fraction. The old per-source maxPenetration caps
  // (solar 0.40, wind 0.35, battery 0.80) are removed: the storage-headroom
  // fractions sit below them on every path, so they clipped at most ~0.1% of
  // GDP in the high-sensitivity tail and nothing elsewhere. The four non-VRE
  // entries (hydro/nuclear/gas/coal) were never read. Curtailment + the demand
  // limit remain the real VRE constraints.
  const maxBareSolarPen = maxCombinedVRE * params.vreSolarFraction;
  const maxTotalSolarPen = maxCombinedVRE * params.vreTotalSolarFraction;
  const maxWindPen = maxCombinedVRE * params.vreWindFraction;

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
      const combinedRoom = maxCombinedVRE * demandTWh - totalVREAllocated;
      maxAllocation = Math.min(maxAllocation, combinedRoom);
    } else if (source.name === 'wind') {
      const windRoom = maxWindPen * demandTWh - totalWindAllocated;
      maxAllocation = Math.min(maxAllocation, windRoom);
      const combinedRoom = maxCombinedVRE * demandTWh - totalVREAllocated;
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

  // Emergency release: dispatch otherwise-curtailed VRE to fill shortfall.
  // Intentionally bypasses penetration limits (last-resort dispatch) but is
  // capped by physical panel/turbine output: solarPlusBattery draws from the
  // same panels as bare solar, so releasable solar energy is the panel
  // potential minus everything solar-derived already dispatched. Released
  // solar is credited to bare solar: curtailed energy dispatched directly
  // does not pass through storage (this slightly under-weights storage LCOS
  // in weighted-average pricing during shortfall years — accepted).
  if (remaining > 0) {
    const releasableSolar = Math.max(
      0, preCurtailmentSolar - generation.solar - generation.solarPlusBattery);
    const releasableWind = Math.max(0, preCurtailmentWind - generation.wind);
    const totalReleasable = releasableSolar + releasableWind;

    if (totalReleasable > 0) {
      const release = Math.min(remaining, totalReleasable);
      generation.solar += release * (releasableSolar / totalReleasable);
      generation.wind += release * (releasableWind / totalReleasable);
      remaining -= release;
    }
  }

  // Thermal availability headroom: demand still unserved runs the ordinary
  // gas and coal fleets above world-average utilization, up to availability,
  // cheapest first. Utilization is an outcome of the load each fleet shares
  // with other sources. Even with oil and bioenergy power folded into the
  // fleet rows, LatAm (2.2%) and India (0.8%) could not serve their own 2025
  // demand at the world averages (energy anchors each region's fleet on that
  // demand, see fleetDemandRatio): 57 TWh unserved in 2025, ~5,000 by 2100.
  if (remaining > 0) {
    const headroom = (['gas', 'coal'] as const)
      .map((source) => {
        const standby = standbyGW[source] ?? 0;
        const gw = Math.max(0, capacities[source] - standby);
        const extraCF = Math.max(0, params.availability[source] - params.capacityFactor[source]);
        return { source, cost: marginalCosts[source], twh: annualGenerationTWh(gw, extraCF, params.hoursPerYear, `${source} headroom`) };
      })
      .sort((a, b) => a.cost - b.cost);
    for (const { source, twh } of headroom) {
      if (remaining <= 0) break;
      const run = Math.min(remaining, twh);
      generation[source] += run;
      remaining -= run;
    }
  }

  // Standby (firm-adequacy) capacity: last resort, after the VRE release and
  // the ordinary fleet's availability headroom.
  // It is security capacity, so it runs only for demand nothing else serves;
  // in merit order it would run as baseload (~60% CF in China by 2050).
  for (const source of ['gas', 'coal'] as const) {
    if (remaining <= 0) break;
    const gw = Math.min(standbyGW[source] ?? 0, capacities[source]);
    if (gw <= 0) continue;
    const run = Math.min(remaining, annualGenerationTWh(
      gw, params.capacityFactor[source], params.hoursPerYear, `standby ${source}`));
    generation[source] += run;
    remaining -= run;
  }

  // Curtailment tracking (from final dispatched vs pre-curtailment available)
  const totalDispatchedVRE = generation.solar + generation.solarPlusBattery + generation.wind;
  const curtailmentTWh = Math.max(0, totalAvailableVRE - totalDispatchedVRE);
  const curtailmentRate = totalAvailableVRE > 0 ? curtailmentTWh / totalAvailableVRE : 0;

  const totalGeneration = subtractQuantities(
    unitQuantity(demandTWh, 'TWh/year', 'required generation'),
    [unitQuantity(remaining, 'TWh/year', 'unserved generation')],
    'served generation',
  ).value;
  const shortfall = remaining;

  const electricityEmissions = sumQuantities([
    convertQuantity(multiplyQuantities([
      unitQuantity(generation.gas, 'TWh/year', 'gas generation'),
      unitQuantity(params.carbonIntensity.gas, 'kgCO2/MWh', 'gas carbon intensity'),
    ], 'gas emissions'), 'GtCO2/year'),
    convertQuantity(multiplyQuantities([
      unitQuantity(generation.coal, 'TWh/year', 'coal generation'),
      unitQuantity(params.carbonIntensity.coal, 'kgCO2/MWh', 'coal carbon intensity'),
    ], 'coal emissions'), 'GtCO2/year'),
  ], 'GtCO2/year', 'electricity emissions').value;
  const gridIntensity = totalGeneration > 0
    ? convertQuantity(divideQuantities(
        unitQuantity(electricityEmissions, 'GtCO2/year', 'electricity emissions'),
        unitQuantity(totalGeneration, 'TWh/year', 'total generation'),
        'grid carbon intensity',
      ), 'kgCO2/MWh').value
    : 0;

  const fossilGen = sumQuantities([
    unitQuantity(generation.gas, 'TWh/year', 'gas generation'),
    unitQuantity(generation.coal, 'TWh/year', 'coal generation'),
  ], 'TWh/year', 'fossil generation').value;
  const fossilShare = totalGeneration > 0 ? fossilGen / totalGeneration : 0;

  assertUnitBalance(
    'regional dispatch supply requirement',
    unitQuantity(demandTWh, 'TWh/year', 'required generation'),
    [
      unitQuantity(totalGeneration, 'TWh/year', 'served generation'),
      unitQuantity(shortfall, 'TWh/year', 'shortfall'),
    ],
  );
  assertUnitBalance(
    'regional dispatched generation',
    unitQuantity(totalGeneration, 'TWh/year', 'served generation'),
    Object.entries(generation).map(([source, value]) =>
      unitQuantity(value, 'TWh/year', `${source} generation`)),
    { relativeTolerance: 1e-10 },
  );

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

/**
 * The capacity factors a region is dispatched at: the site-depletion-adjusted
 * regional value from energy, then the fleet mean, then the parameter default,
 * so a caller supplying neither behaves as before. Shared by the step and by
 * the physical-potential invariant, so the bound checks the CFs actually used.
 */
function regionCapacityFactors(
  inputs: DispatchInputs,
  params: DispatchParams,
  region: Region,
): DispatchParams['capacityFactor'] {
  return {
    ...params.capacityFactor,
    solar: inputs.regionalEffectiveSolarCF?.[region] ?? inputs.effectiveSolarCF ?? params.capacityFactor.solar,
    wind: inputs.regionalEffectiveWindCF?.[region] ?? inputs.effectiveWindCF ?? params.capacityFactor.wind,
  };
}

// =============================================================================
// INVARIANTS
// =============================================================================

/**
 * Identities every dispatch step promises, checked by the engine after each
 * step of every run. The physical-potential bound is the one a fleet-mean
 * capacity factor broke (bc9f43e) and the shortfall release broke by
 * crediting the same panels twice (16e7793).
 */
const DISPATCH_INVARIANTS: readonly ModuleInvariant<
  DispatchParams, DispatchState, DispatchInputs, DispatchOutputs
>[] = [
  {
    name: 'global generation is the sum of regions',
    check: ({ outputs }) => [...ENERGY_SOURCES, 'solarPlusBattery' as const].map((source) =>
      closeTo(
        `${source} generation`,
        outputs.generation[source],
        sumValues(outputs.regionalGeneration, (r) => r[source])
      )),
  },
  {
    name: 'total generation is the sum of sources',
    check: ({ outputs }) =>
      closeTo('total generation', outputs.totalGeneration, sumValues(outputs.generation)),
  },
  {
    name: 'global emissions and curtailment are the sum of regions',
    check: ({ outputs }) => [
      closeTo('electricity emissions', outputs.electricityEmissions,
        sumValues(outputs.regionalEmissions)),
      closeTo('curtailment', outputs.curtailmentTWh,
        sumValues(outputs.regionalCurtailment)),
    ],
  },
  {
    name: 'no region generates more than its capacity can',
    description: 'Each source is bounded by the region\'s capacity x its own capacity factor x hours '
      + '(availability for gas and coal); bare and battery-paired solar share the same panels.',
    check: ({ inputs, outputs, params }) => {
      const capacities = inputs.regionalCapacities ?? distributeCapacitiesByGDP(inputs.capacities);
      const messages: (string | undefined)[] = [];
      for (const region of REGIONS) {
        const cap = capacities[region];
        const gen = outputs.regionalGeneration[region];
        // Gas and coal are bounded by availability: dispatch runs them past
        // utilization for demand the merit order leaves unserved
        const cf: Record<string, number> = {
          ...regionCapacityFactors(inputs, params, region),
          ...params.availability,
        };
        for (const source of ENERGY_SOURCES) {
          if (source === 'battery') continue;
          const served = source === 'solar' ? gen.solar + gen.solarPlusBattery : gen[source];
          const potential = (cap[source] * cf[source] * params.hoursPerYear) / 1000;
          messages.push(atMost(`${region} ${source} TWh`, served, potential));
        }
      }
      return messages;
    },
  },
];

export const dispatchModule: Module<
  DispatchParams,
  DispatchState,
  DispatchInputs,
  DispatchOutputs
> = defineModule<DispatchParams, DispatchState, DispatchInputs, DispatchOutputs>({
  name: 'dispatch',
  description: 'Regional merit order dispatch with penetration limits',

  defaults: dispatchDefaults,

  invariants: DISPATCH_INVARIANTS,

  paramMeta: {
    curtailmentOnset: {
      description: 'VRE share of demand at which soft curtailment begins with no storage; storage shifts the onset by the same headroom it adds to the VRE penetration limit.',
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
      electricityDemand: unitPort('TWh/year'),
      regionalElectricityDemand: unitPort('TWh/year', 'record'),
      capacities: ENERGY_CAPACITY_PORT,
      regionalCapacities: REGIONAL_ENERGY_CAPACITY_PORT,
      regionalStandbyCapacity: unitPort('GW', 'nested-record'),
      regionalFossilRunningCost: unitPort('$/MWh', 'nested-record'),
      carbonPrice: unitPort('$/tCO2'),
      regionalCarbonPrice: unitPort('$/tCO2', 'record'),
      longStorageRegional: unitPort('GWh', 'record'),
      regionalEffectiveSolarCF: unitPort('fraction', 'record'),
      regionalEffectiveWindCF: unitPort('fraction', 'record'),
      effectiveSolarCF: unitPort('fraction'),
      effectiveWindCF: unitPort('fraction'),
    },
    outputs: {
      generation: unitPort('TWh/year', 'record'),
      regionalGeneration: unitPort('TWh/year', 'nested-record'),
      gridIntensity: unitPort('kgCO2/MWh'),
      regionalGridIntensity: unitPort('kgCO2/MWh', 'record'),
      totalGeneration: unitPort('TWh/year'),
      electricityEmissions: unitPort('GtCO2/year'),
      regionalEmissions: unitPort('GtCO2/year', 'record'),
      shortfall: unitPort('TWh/year'),
      regionalShortfallRate: unitPort('fraction', 'record'),
      fossilShare: unitPort('fraction'),
      regionalFossilShare: unitPort('fraction', 'record'),
      curtailmentTWh: unitPort('TWh/year'),
      curtailmentRate: unitPort('fraction'),
      regionalCurtailment: unitPort('TWh/year', 'record'),
      regionalCurtailmentRate: unitPort('fraction', 'record'),
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

      const ci = p.carbonIntensity[source];
      if (ci < 0) {
        errors.push(`carbonIntensity.${source} cannot be negative`);
      }

      const mc = p.marginalCost[source];
      if (mc < 0) {
        errors.push(`marginalCost.${source} cannot be negative`);
      }
    }

    const availability = { ...dispatchDefaults.availability, ...params.availability };
    const capacityFactor = { ...dispatchDefaults.capacityFactor, ...params.capacityFactor };
    for (const source of ['gas', 'coal'] as const) {
      const a = availability[source];
      if (!(a >= 0 && a <= 1)) {
        errors.push(`availability.${source} must be 0-1, got ${a}`);
      } else if (a < capacityFactor[source]) {
        warnings.push(`availability.${source} (${a}) is below capacityFactor.${source} `
          + `(${capacityFactor[source]}): the fleet gets no headroom above utilization`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<DispatchParams>): DispatchParams {
    return validatedMerge('dispatch', this.validate, (p) => ({
      ...dispatchDefaults,
      ...p,
      capacityFactor: { ...dispatchDefaults.capacityFactor, ...p.capacityFactor },
      availability: { ...dispatchDefaults.availability, ...p.availability },
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

    // Convert delivered demand to required generation (losses + own use),
    // then get regional inputs (or distribute by GDP share)
    const generationRequired = electricityDemand * params.gridLossFactor;
    const regionalDemand = inputs.regionalElectricityDemand
      ? Object.fromEntries(REGIONS.map(r =>
          [r, inputs.regionalElectricityDemand![r] * params.gridLossFactor]
        )) as Record<Region, number>
      : distributeByGDP(generationRequired);
    const regionalCapacities = inputs.regionalCapacities ?? distributeCapacitiesByGDP(capacities);
    const regionalCarbonPrice = inputs.regionalCarbonPrice ??
      Object.fromEntries(REGIONS.map(r => [r, carbonPrice])) as Record<Region, number>;

    // Process each region independently
    const regionalOutputs: Record<Region, RegionalDispatchOutputs> = {} as any;
    const regionalGeneration: Record<Region, Record<EnergySource | 'solarPlusBattery', number>> = {} as any;
    const regionalGridIntensity: Record<Region, number> = {} as any;
    const regionalEmissions: Record<Region, number> = {} as any;
    const regionalFossilShare: Record<Region, number> = {} as any;
    const regionalShortfallRate: Record<Region, number> = {} as any;

    const longStorageRegional = inputs.longStorageRegional ??
      Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>;

    for (const region of REGIONS) {
      const regionParams = { ...params, capacityFactor: regionCapacityFactors(inputs, params, region) };

      // Regional fuel prices (energy's regional fossilRunningCost) set the
      // gas/coal merit order; e.g. LNG-priced gas runs after domestic coal.
      const fuel = inputs.regionalFossilRunningCost?.[region];
      const fuelParams = fuel
        ? {
            ...regionParams,
            marginalCost: {
              ...regionParams.marginalCost,
              ...(fuel.gas != null && { gas: fuel.gas }),
              ...(fuel.coal != null && { coal: fuel.coal }),
            },
          }
        : regionParams;
      const regionResult = dispatchRegion(
        regionalDemand[region],
        regionalCapacities[region],
        regionalCarbonPrice[region],
        fuelParams,
        longStorageRegional[region],
        inputs.regionalStandbyCapacity?.[region],
      );

      regionalOutputs[region] = regionResult;
      regionalGeneration[region] = regionResult.generation;
      regionalGridIntensity[region] = regionResult.gridIntensity;
      regionalEmissions[region] = regionResult.electricityEmissions;
      regionalFossilShare[region] = regionResult.fossilShare;
      const requiredGeneration = regionResult.totalGeneration + regionResult.shortfall;
      regionalShortfallRate[region] = requiredGeneration > 0
        ? regionResult.shortfall / requiredGeneration
        : 0;
    }

    // Aggregate global totals
    const globalGeneration: Record<string, number> = {
      solar: 0, wind: 0, hydro: 0, nuclear: 0, gas: 0, coal: 0, battery: 0, solarPlusBattery: 0,
    };

    let globalTotalGeneration = 0;
    let globalShortfall = 0;
    let globalElectricityEmissions = 0;
    let globalCurtailmentTWh = 0;
    const regionalCurtailment: Record<Region, number> = {} as Record<Region, number>;
    const regionalCurtailmentRate: Record<Region, number> = {} as Record<Region, number>;

    for (const region of REGIONS) {
      const rg = regionalGeneration[region];
      for (const source of [...ENERGY_SOURCES, 'solarPlusBattery'] as const) {
        globalGeneration[source] += rg[source];
      }
      globalTotalGeneration += regionalOutputs[region].totalGeneration;
      globalShortfall += regionalOutputs[region].shortfall;
      globalElectricityEmissions += regionalOutputs[region].electricityEmissions;
      globalCurtailmentTWh += regionalOutputs[region].curtailmentTWh;
      regionalCurtailment[region] = regionalOutputs[region].curtailmentTWh;
      regionalCurtailmentRate[region] = regionalOutputs[region].curtailmentRate;
    }

    // Global curtailment rate from regional sums
    const globalAvailableVRE = globalGeneration.solar + globalGeneration.solarPlusBattery + globalGeneration.wind + globalCurtailmentTWh;
    const globalCurtailmentRate = globalAvailableVRE > 0 ? globalCurtailmentTWh / globalAvailableVRE : 0;

    const globalGridIntensity = globalTotalGeneration > 0
      ? convertQuantity(divideQuantities(
          unitQuantity(globalElectricityEmissions, 'GtCO2/year', 'global electricity emissions'),
          unitQuantity(globalTotalGeneration, 'TWh/year', 'global generation'),
          'global grid intensity',
        ), 'kgCO2/MWh').value
      : 0;

    const fossilGen = sumQuantities([
      unitQuantity(globalGeneration.gas, 'TWh/year', 'global gas generation'),
      unitQuantity(globalGeneration.coal, 'TWh/year', 'global coal generation'),
    ], 'TWh/year', 'global fossil generation').value;
    const globalFossilShare = globalTotalGeneration > 0 ? fossilGen / globalTotalGeneration : 0;

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
        regionalShortfallRate,
        fossilShare: globalFossilShare,
        regionalFossilShare,
        curtailmentTWh: globalCurtailmentTWh,
        curtailmentRate: globalCurtailmentRate,
        regionalCurtailment,
        regionalCurtailmentRate,
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

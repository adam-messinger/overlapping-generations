/**
 * Demand Module
 *
 * Calculates GDP growth, energy intensity, and electricity demand by region.
 * Takes demographics outputs (population, workers, dependency) and produces
 * economic outputs that feed into energy and capital modules.
 *
 * Theoretical basis:
 * - Fernández-Villaverde: GDP per working-age adult as key metric
 * - Ole Peters: Ergodicity economics (time-average vs ensemble-average)
 * - Odum: Energy as basis of real wealth
 *
 * GDP growth equation (Ayres/Warr):
 *   growthRate = residualTFP + ε·usefulWorkGrowth + α·capitalGrowth + (1-α)·laborGrowth + demographicAdj
 *
 * Where:
 * - residualTFP decays over time (catch-up growth fades)
 * - usefulWorkGrowth = growth in useful energy per worker (lagged 1 year)
 * - ε = usefulWorkElasticity (default 0.4) — Ayres/Warr finding
 * - laborGrowth uses effective workers (education-weighted)
 * - demographicAdj penalizes high dependency ratios
 */

import { REGIONS, Region } from '../framework/types.js';
import { Module } from '../framework/module.js';
import { validatedMerge } from '../framework/validated-merge.js';

// =============================================================================
// TYPES
// =============================================================================

interface RegionalEconomicParams {
  gdp2025: number;           // $ trillions (World Bank)
  tfpGrowth: number;         // Total factor productivity growth rate
  tfpDecay: number;          // Rate at which catch-up growth fades
  energyIntensity: number;   // MWh per $1000 GDP (total energy)
  intensityDecline: number;  // Annual efficiency improvement rate
}

// Sector parameters
interface SectorParams {
  share: number;                  // Share of total final energy (sums to 1)
  electrification2025: number;    // Current sector electrification rate
  electrificationTarget: number;  // Physical ceiling (70%/95%/65%)
  /** @deprecated Retained for backward-compatible scenario loading; not read by step() */
  electrificationSpeed: number;
  // Cost-driven electrification parameters
  costSensitivity: number;        // Response to cost ratio (0.08/0.06/0.10)
  basePressure: number;           // Background pressure (0.015/0.02/0.008)
  efficiencyMultiplier: number;   // EV=3.5x, heat pump=3.0x, industry=1.1x
  maxAnnualChange: number;        // Infrastructure constraint (0.04/0.03/0.025)
  primaryFuel: 'oil' | 'gas';     // Which fuel sector competes with
}

// Fuel parameters for non-electric energy
interface FuelParams {
  share2025: number;              // Share of non-electric in 2025
  carbonIntensity: number;        // kg CO2 per MWh thermal
  price: number;                  // Base fuel price $/MWh thermal
}

// Fuel mix evolution parameters
interface FuelMixParams {
  priceSensitivity: number;       // β in logit model (default 0.03)
  inertiaRate: number;            // α blending rate (default 0.08 = ~9yr half-life)
}

// Energy burden parameters
interface EnergyBurdenParams {
  threshold: number;              // Burden threshold (fraction of GDP, default 0.08)
  elasticity: number;             // GDP damage per % excess burden (default 1.5)
  maxDamage: number;              // Maximum GDP damage (fraction, default 0.30)
  maxBurden: number;              // Historical max burden (fraction, default 0.14)
  persistent: number;             // Fraction of damage that persists (default 0.25)
}

export interface DemandParams {
  // Regional economic parameters
  regions: Record<Region, RegionalEconomicParams>;

  // Global demand parameters
  electrification2025: number;    // Current electricity share (IEA: 25%)
  electrificationTarget: number;  // 2050+ target (IEA Net Zero: 65%)
  demographicFactor: number;      // Dependency ratio impact on growth

  // Cost-driven electrification parameters
  costSensitivity: number;               // Elec gain per cost halving (default 0.05)
  maxAnnualElecChange: number;           // Infrastructure constraint (default 0.02)
  physicalElecCeiling: number;           // Physical max (~90%, some can't electrify)

  // Sector-level parameters
  sectors: {
    transport: SectorParams;
    buildings: SectorParams;
    industry: SectorParams;
  };

  // Fuel mix for non-electric energy
  fuels: {
    oil: FuelParams;
    gas: FuelParams;
    coal: FuelParams;
    biomass: FuelParams;
    hydrogen: FuelParams;
    biofuel: FuelParams;
  };

  // Energy burden parameters
  energyBurden: EnergyBurdenParams;

  // Fuel mix evolution parameters
  fuelMix: FuelMixParams;

  // Optional efficiency multiplier (slider)
  efficiencyMultiplier: number;

  // Ayres/Warr useful work elasticity
  usefulWorkElasticity: number;  // Share of GDP growth explained by useful work (default 0.4)

  // GDP growth Solow capital elasticity
  capitalElasticity: number;     // Capital share in GDP growth (labor = 1 - this, default 0.35)

  // Baseline electrification trend
  baselineElecTrend: number;     // Annual baseline electrification momentum (default 0.005)
}

interface RegionalState {
  gdpShare: number;   // Fraction of global GDP (sums to 1)
  intensity: number;  // Current energy intensity (MWh/$1000)
}

interface DemandState {
  regions: Record<Region, RegionalState>;
  baselineDependency: number;  // Year 0 dependency for adjustment
  electrificationRate: number; // Current electrification rate (cost-driven)
  fuelShares: Record<FuelType, number>; // Evolved fuel shares (for non-electric)
  sectorElectrification: {     // Sector-level electrification rates
    transport: number;
    buildings: number;
    industry: number;
  };
  previousEffectiveWorkers: Record<Region, number>; // For labor growth calculation
  previousUsefulEnergyPerWorker: number; // For Ayres/Warr useful work growth
  usefulWorkGrowthRate: number;          // Exposed for diagnostics
}

// Inputs from demographics and production modules
interface DemandInputs {
  // Per-region demographics
  regionalPopulation: Record<Region, number>;
  regionalWorking: Record<Region, number>;
  regionalEffectiveWorkers: Record<Region, number>;
  regionalDependency: Record<Region, number>;

  // Global demographics
  population: number;
  working: number;
  dependency: number;

  // GDP from production module
  gdp: number;

  // Optional damage fractions (for regional share evolution)
  regionalDamages?: Record<Region, number>;
  energyBurdenDamage?: number;

  // For energy burden calculation (from dispatch/energy)
  electricityGeneration?: number;        // TWh
  weightedAverageLCOE?: number;          // $/MWh (generation-weighted)
  carbonPrice?: number;                  // $/tonne for fuel carbon cost

  // For cost-driven electrification
  laggedAvgLCOE?: number;                // $/MWh from previous year
}

interface RegionalOutputs {
  gdp: number;                  // $ trillions
  growthRate: number;           // Annual growth rate
  energyIntensity: number;      // MWh per $1000 GDP
  totalFinalEnergy: number;     // TWh (total energy)
  electricityDemand: number;    // TWh
  nonElectricEnergy: number;    // TWh
  gdpPerWorking: number;        // $ per working-age person
  electricityPerWorking: number; // kWh per working-age person
}

// Sector-level output
interface SectorOutput {
  total: number;                // TWh (sector total)
  electric: number;             // TWh (electricity portion)
  nonElectric: number;          // TWh (non-electric portion)
  electrificationRate: number;  // Fraction electrified
}

// Fuel consumption output
interface FuelOutput {
  oil: number;        // TWh
  gas: number;        // TWh
  coal: number;       // TWh
  biomass: number;    // TWh
  hydrogen: number;   // TWh
  biofuel: number;    // TWh
}

export type FuelType = 'oil' | 'gas' | 'coal' | 'biomass' | 'hydrogen' | 'biofuel';
export type SectorType = 'transport' | 'buildings' | 'industry';

interface DemandOutputs {
  // Regional outputs
  regional: Record<Region, RegionalOutputs>;

  // Global aggregates
  electricityDemand: number;    // TWh (global)
  electrificationRate: number;  // Fraction (0-1)
  totalFinalEnergy: number;     // TWh (global)
  nonElectricEnergy: number;    // TWh (global)
  usefulEnergy: number;         // TWh (useful, efficiency-adjusted)
  usefulEnergyFactor: number;   // Useful energy / total final energy
  gdpPerWorking: number;        // $ per person (global)
  electricityPerWorking: number; // kWh per person (global)
  finalEnergyPerCapitaDay: number; // kWh/person/day

  // Sector breakdown
  sectors: {
    transport: SectorOutput;
    buildings: SectorOutput;
    industry: SectorOutput;
  };

  // Fuel consumption (non-electric only)
  fuels: FuelOutput;

  // Non-electric emissions (Gt CO2/year)
  nonElectricEmissions: number;

  // Energy burden outputs
  electricityCost: number;   // $ trillions
  fuelCost: number;          // $ trillions
  totalEnergyCost: number;   // $ trillions
  energyBurden: number;      // Fraction of GDP (0-1)
  burdenDamage: number;      // GDP damage fraction (0-1)

  // Ayres/Warr useful work diagnostics
  usefulWorkGrowthRate: number; // Growth rate of useful energy per worker
}

// =============================================================================
// DEFAULTS
// =============================================================================

/**
 * Default economic parameters
 *
 * Energy intensity calibrated to match IEA 2025 data:
 * - Global final energy: ~122,000 TWh (IEA World Energy Outlook)
 * - Global electricity: ~30,000 TWh → 25% electrification
 * - OECD: ~40,000 TWh, $58T GDP → 0.70 MWh/$1000 total energy
 * - China: ~37,000 TWh, $18T GDP → 2.04 MWh/$1000 total energy
 * - EM: ~33,000 TWh, $35T GDP → 0.93 MWh/$1000 total energy
 * - ROW: ~12,000 TWh, $8T GDP → 1.53 MWh/$1000 total energy
 */
export const demandDefaults: DemandParams = {
  regions: {
    oecd: {
      gdp2025: 58,              // $58T (World Bank)
      tfpGrowth: 0.008,         // Residual TFP after useful work extraction (Ayres/Warr)
      tfpDecay: 0.0,            // Mature economy - no convergence
      energyIntensity: 0.70,    // MWh per $1000 GDP (IEA-calibrated)
      intensityDecline: 0.003,  // 0.3%/year
    },
    china: {
      gdp2025: 18,              // $18T (World Bank)
      tfpGrowth: 0.025,         // Residual TFP (catch-up component)
      tfpDecay: 0.015,          // Converging toward OECD
      energyIntensity: 2.04,    // High - industrial economy
      intensityDecline: 0.008,  // 0.8%/year
    },
    em: {
      gdp2025: 35,              // $35T (India, Brazil, Indonesia, etc.)
      tfpGrowth: 0.016,         // Residual TFP
      tfpDecay: 0.008,          // Slow convergence
      energyIntensity: 0.93,    // Mixed economies
      intensityDecline: 0.005,  // 0.5%/year
    },
    row: {
      gdp2025: 8,               // $8T (Africa, etc.)
      tfpGrowth: 0.020,         // Residual TFP (demographic dividend)
      tfpDecay: 0.010,          // Gradual convergence
      energyIntensity: 1.53,    // Lower efficiency
      intensityDecline: 0.004,  // 0.4%/year
    },
  },

  // Global parameters
  electrification2025: 0.25,    // Current electricity share (IEA)
  electrificationTarget: 0.65,  // 2050+ target (IEA Net Zero)
  demographicFactor: 0.015,     // Dependency ratio impact on growth

  // Cost-driven electrification
  costSensitivity: 0.05,            // 5% electrification gain per cost halving
  maxAnnualElecChange: 0.02,        // Infrastructure constraint: 2%/year max
  physicalElecCeiling: 0.90,        // ~90% max (aviation, shipping, high-temp heat)

  // Sector-level parameters (IEA-calibrated)
  // Transport: EVs growing fast, aviation/shipping slow
  // Buildings: Heat pumps, electric heating
  // Industry: Electric arc furnaces, hydrogen steel
  sectors: {
    transport: {
      share: 0.45,                // 45% of final energy (IEA)
      electrification2025: 0.02,  // 2% (mostly rail)
      electrificationTarget: 0.70, // 70% ceiling (aviation 12%, long-haul shipping 10% can't)
      electrificationSpeed: 0.06, // Legacy param (backward compat)
      costSensitivity: 0.08,      // Response to fuel/elec cost ratio
      basePressure: 0.015,        // Background electrification pressure
      efficiencyMultiplier: 3.5,  // EVs 3.5x more efficient than ICE
      maxAnnualChange: 0.04,      // 4%/year max (infrastructure)
      primaryFuel: 'oil',         // Competes with oil (gasoline/diesel)
    },
    buildings: {
      share: 0.30,                // 30% of final energy
      electrification2025: 0.35,  // 35% (heating, appliances)
      electrificationTarget: 0.95, // 95% ceiling (nearly all can electrify)
      electrificationSpeed: 0.08, // Legacy param (backward compat)
      costSensitivity: 0.06,      // Less sensitive than transport
      basePressure: 0.02,         // Higher baseline (heat pump momentum)
      efficiencyMultiplier: 3.0,  // Heat pump COP ~3
      maxAnnualChange: 0.03,      // 3%/year max
      primaryFuel: 'gas',         // Competes with gas (heating)
    },
    industry: {
      share: 0.25,                // 25% of final energy
      electrification2025: 0.30,  // 30% (motors, EAFs)
      electrificationTarget: 0.65, // 65% ceiling (high-temp processes need H2)
      electrificationSpeed: 0.05, // Legacy param (backward compat)
      costSensitivity: 0.10,      // Most cost-sensitive sector
      basePressure: 0.008,        // Slower baseline (heavy equipment)
      efficiencyMultiplier: 1.1,  // Motors ~10% more efficient
      maxAnnualChange: 0.025,     // 2.5%/year max (long-lived equipment)
      primaryFuel: 'gas',         // Competes with gas (process heat)
    },
  },

  // Fuel mix for non-electric energy (2025 shares, will evolve)
  // Carbon intensities from IEA/IPCC, prices calibrated to IEA
  fuels: {
    oil: {
      share2025: 0.50,           // Dominates transport
      carbonIntensity: 267,      // kg CO2/MWh (gasoline/diesel)
      price: 50,                 // $/MWh (~$80/barrel equivalent)
    },
    gas: {
      share2025: 0.30,           // Heating, industry
      carbonIntensity: 202,      // kg CO2/MWh
      price: 25,                 // $/MWh (US/global blend)
    },
    coal: {
      share2025: 0.12,           // Industrial heat, developing countries
      carbonIntensity: 341,      // kg CO2/MWh
      price: 15,                 // $/MWh (before carbon pricing)
    },
    biomass: {
      share2025: 0.06,           // Traditional biomass
      carbonIntensity: 100,      // kg CO2/MWh (net with regrowth)
      price: 30,                 // $/MWh
    },
    hydrogen: {
      share2025: 0.01,           // Negligible today
      carbonIntensity: 0,        // Green hydrogen (assume clean)
      price: 150,                // $/MWh (2025, will decline)
    },
    biofuel: {
      share2025: 0.01,           // Aviation, blends
      carbonIntensity: 50,       // kg CO2/MWh (lifecycle)
      price: 80,                 // $/MWh
    },
  },

  // Energy burden parameters (1970s oil shock calibrated)
  energyBurden: {
    threshold: 0.08,             // 8% of GDP is threshold (normal cheap energy)
    elasticity: 1.5,             // GDP damage per % excess burden
    maxDamage: 0.30,             // Max 30% GDP reduction
    maxBurden: 0.14,             // 1970s crisis peak
    persistent: 0.25,            // 25% of damage persists
  },

  // Fuel mix evolution parameters
  fuelMix: {
    priceSensitivity: 0.03,      // β in logit model ($/MWh scale)
    inertiaRate: 0.08,           // α = ~9yr half-life for fleet turnover
  },

  efficiencyMultiplier: 1.0,    // Default: no adjustment

  usefulWorkElasticity: 0.4,   // Ayres/Warr: useful work contribution to GDP growth

  capitalElasticity: 0.35,     // Capital share in GDP growth (Solow)
  baselineElecTrend: 0.005,   // 0.5%/year baseline electrification momentum
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate weighted average fuel cost for non-electric energy.
 * Used for cost-driven electrification.
 *
 * @param fuels Fuel parameters (price, carbon intensity)
 * @param fuelShares Current evolved fuel shares (sums to ~1)
 * @param carbonPrice Carbon price ($/tonne)
 * @returns Weighted average fuel cost ($/MWh)
 */
function calculateWeightedFuelCost(
  fuels: DemandParams['fuels'],
  fuelShares: Record<FuelType, number>,
  carbonPrice: number
): number {
  const fuelKeys = ['oil', 'gas', 'coal', 'biomass', 'hydrogen', 'biofuel'] as const;
  let totalCost = 0;
  let totalShare = 0;

  for (const fuel of fuelKeys) {
    const f = fuels[fuel];
    const share = fuelShares[fuel];
    // Effective price = base price + carbon cost
    const carbonCost = (f.carbonIntensity * carbonPrice) / 1000; // $/MWh
    const effectivePrice = f.price + carbonCost;
    totalCost += effectivePrice * share;
    totalShare += share;
  }

  return totalShare > 0 ? totalCost / totalShare : 50; // Default to $50/MWh
}

/**
 * Calculate logit-based fuel shares with inertia.
 * Fuel shares respond to effective prices (base + carbon cost).
 *
 * @param fuels Fuel parameters (price, carbon intensity)
 * @param prevShares Previous year's fuel shares
 * @param carbonPrice Carbon price ($/tonne)
 * @param priceSensitivity β in logit model
 * @param inertiaRate α blending rate (0 = all inertia, 1 = pure logit)
 * @returns New fuel shares (normalized to sum to 1)
 */
function calculateLogitFuelShares(
  fuels: DemandParams['fuels'],
  prevShares: Record<FuelType, number>,
  carbonPrice: number,
  priceSensitivity: number,
  inertiaRate: number
): Record<FuelType, number> {
  const fuelKeys: FuelType[] = ['oil', 'gas', 'coal', 'biomass', 'hydrogen', 'biofuel'];

  // Calculate effective prices for each fuel
  const effectivePrices: Record<FuelType, number> = {} as Record<FuelType, number>;
  for (const fuel of fuelKeys) {
    const f = fuels[fuel];
    const carbonCost = (f.carbonIntensity * carbonPrice) / 1000; // $/MWh
    effectivePrices[fuel] = f.price + carbonCost;
  }

  // Calculate logit shares: exp(-β × price) / Σ exp(-β × price)
  let logitSum = 0;
  const logitRaw: Record<FuelType, number> = {} as Record<FuelType, number>;
  for (const fuel of fuelKeys) {
    logitRaw[fuel] = Math.exp(-priceSensitivity * effectivePrices[fuel]);
    logitSum += logitRaw[fuel];
  }

  const logitShares: Record<FuelType, number> = {} as Record<FuelType, number>;
  for (const fuel of fuelKeys) {
    logitShares[fuel] = logitRaw[fuel] / logitSum;
  }

  // Blend with previous shares using inertia rate
  // newShare = α × logitShare + (1-α) × prevShare
  const blendedShares: Record<FuelType, number> = {} as Record<FuelType, number>;
  let total = 0;
  for (const fuel of fuelKeys) {
    blendedShares[fuel] = inertiaRate * logitShares[fuel] + (1 - inertiaRate) * prevShares[fuel];
    // Apply minimum floor (0.1%)
    blendedShares[fuel] = Math.max(0.001, blendedShares[fuel]);
    total += blendedShares[fuel];
  }

  // Renormalize to sum to 1
  for (const fuel of fuelKeys) {
    blendedShares[fuel] /= total;
  }

  return blendedShares;
}

/**
 * Calculate cost-driven sector electrification rate.
 * Electrification accelerates when electricity is cheaper than fuel (adjusted for efficiency).
 *
 * @param prevRate Previous year's electrification rate
 * @param electricityPrice Electricity price ($/MWh)
 * @param fuelPrice Primary fuel price ($/MWh)
 * @param carbonPrice Carbon price ($/tonne)
 * @param fuelCarbonIntensity Fuel carbon intensity (kg CO2/MWh)
 * @param sectorParams Sector parameters
 * @param yearIndex Year index for infrastructure score
 * @returns New sector electrification rate
 */
function calculateSectorElectrification(
  prevRate: number,
  electricityPrice: number,
  fuelPrice: number,
  carbonPrice: number,
  fuelCarbonIntensity: number,
  sectorParams: SectorParams,
  yearIndex: number
): number {
  // Calculate effective fuel cost with carbon pricing
  const fuelCarbonCost = (fuelCarbonIntensity * carbonPrice) / 1000; // $/MWh
  const effectiveFuelCost = fuelPrice + fuelCarbonCost;

  // Adjust electricity cost for efficiency (EVs use 1/3.5 the energy of ICE)
  const effectiveElecCost = electricityPrice / sectorParams.efficiencyMultiplier;

  // Infrastructure score builds with adoption and time (0-1)
  // Higher adoption → better charging/grid infrastructure → lower effective cost
  const INFRA_ADOPTION_WEIGHT = 2;
  const INFRA_TIME_INCREMENT = 0.01;
  const infraScore = Math.min(1, prevRate * INFRA_ADOPTION_WEIGHT + yearIndex * INFRA_TIME_INCREMENT);

  // Adjust cost ratio for infrastructure (lower infra → higher effective elec cost)
  const infraPenalty = 1 + 0.3 * (1 - infraScore); // 30% penalty at zero infra
  const adjustedElecCost = effectiveElecCost * infraPenalty;

  // Cost ratio: fuel cost / adjusted electricity cost
  // When ratio > 1, electricity is cheaper → pressure to electrify
  const costRatio = effectiveFuelCost / adjustedElecCost;

  // Pressure = base + sensitivity × log(max(1, ratio))
  // log(1) = 0, so no bonus when costs are equal
  const costPressure = sectorParams.costSensitivity * Math.log(Math.max(1, costRatio));
  const totalPressure = sectorParams.basePressure + costPressure;

  // Apply pressure to gap-to-ceiling
  const ceiling = sectorParams.electrificationTarget;
  const gapToCeiling = ceiling - prevRate;
  const desiredChange = totalPressure * gapToCeiling;

  // Clamp annual change
  const clampedChange = Math.max(
    -sectorParams.maxAnnualChange,
    Math.min(sectorParams.maxAnnualChange, desiredChange)
  );

  // New rate with floor at starting value and ceiling at target
  const newRate = Math.max(
    sectorParams.electrification2025,
    Math.min(ceiling, prevRate + clampedChange)
  );

  return newRate;
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const demandModule: Module<
  DemandParams,
  DemandState,
  DemandInputs,
  DemandOutputs
> = {
  name: 'demand',
  description: 'GDP and electricity demand model with regional economics',
  defaults: demandDefaults,

  paramMeta: {
    electrificationTarget: {
      description: 'Long-run electrification target. 0.65 means 65% of final energy as electricity by late century.',
      unit: 'fraction',
      range: { min: 0.50, max: 0.95, default: 0.65 },
      tier: 1 as const,
    },
    sectors: {
      transport: {
        electrificationTarget: {
          paramName: 'transportElecTarget',
          description: 'Transport sector electrification ceiling (70% - aviation/shipping limits).',
          unit: 'fraction',
          range: { min: 0.50, max: 0.85, default: 0.70 },
          tier: 1 as const,
        },
        costSensitivity: {
          paramName: 'transportCostSensitivity',
          description: 'Transport sector response to electricity/fuel cost ratio. Higher = faster EV adoption when cheap.',
          unit: 'fraction per cost ratio',
          range: { min: 0.02, max: 0.20, default: 0.08 },
          tier: 1 as const,
        },
      },
      buildings: {
        electrificationTarget: {
          paramName: 'buildingsElecTarget',
          description: 'Buildings sector electrification ceiling (95% - nearly all can electrify).',
          unit: 'fraction',
          range: { min: 0.60, max: 0.98, default: 0.95 },
          tier: 1 as const,
        },
        costSensitivity: {
          paramName: 'buildingsCostSensitivity',
          description: 'Buildings sector response to electricity/gas cost ratio. Heat pump adoption sensitivity.',
          unit: 'fraction per cost ratio',
          range: { min: 0.02, max: 0.15, default: 0.06 },
          tier: 1 as const,
        },
      },
      industry: {
        electrificationTarget: {
          paramName: 'industryElecTarget',
          description: 'Industry sector electrification ceiling (65% - high-temp needs H2).',
          unit: 'fraction',
          range: { min: 0.40, max: 0.85, default: 0.65 },
          tier: 1 as const,
        },
        costSensitivity: {
          paramName: 'industryCostSensitivity',
          description: 'Industry sector response to cost signals. Most cost-sensitive sector.',
          unit: 'fraction per cost ratio',
          range: { min: 0.02, max: 0.25, default: 0.10 },
          tier: 1 as const,
        },
      },
    },
    usefulWorkElasticity: {
      description: 'Ayres/Warr useful work contribution to GDP growth. Higher = energy drives more growth, lower = more exogenous TFP.',
      unit: 'fraction',
      range: { min: 0.1, max: 0.7, default: 0.4 },
      tier: 1 as const,
    },
    capitalElasticity: {
      description: 'Capital elasticity in GDP growth (labor = 1 - this).',
      unit: 'fraction',
      range: { min: 0.2, max: 0.5, default: 0.35 },
      tier: 1 as const,
    },
    fuelMix: {
      priceSensitivity: {
        paramName: 'fuelPriceSensitivity',
        description: 'Logit model sensitivity to effective fuel prices. Higher = faster response to price signals.',
        unit: 'per $/MWh',
        range: { min: 0.01, max: 0.10, default: 0.03 },
        tier: 1 as const,
      },
      inertiaRate: {
        paramName: 'fuelInertiaRate',
        description: 'Rate of fuel mix adjustment (0.08 = ~9yr half-life matching fleet turnover).',
        unit: 'fraction/year',
        range: { min: 0.02, max: 0.20, default: 0.08 },
        tier: 1 as const,
      },
    },
  },

  inputs: [
    'regionalWorking',
    'regionalEffectiveWorkers',
    'regionalDependency',
    'population',
    'working',
    'dependency',
    'gdp',
    'regionalDamages',
    'energyBurdenDamage',
    'electricityGeneration',
    'weightedAverageLCOE',
    'carbonPrice',
    'laggedAvgLCOE',
  ] as const,

  outputs: [
    'electricityDemand',
    'electrificationRate',
    'totalFinalEnergy',
    'nonElectricEnergy',
    'usefulEnergy',
    'usefulEnergyFactor',
    'gdpPerWorking',
    'electricityPerWorking',
    'finalEnergyPerCapitaDay',
    'regional',
    'sectors',
    'fuels',
    'nonElectricEmissions',
    'electricityCost',
    'fuelCost',
    'totalEnergyCost',
    'energyBurden',
    'burdenDamage',
    'usefulWorkGrowthRate',
  ] as const,

  validate(params: Partial<DemandParams>) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate regional params
    if (params.regions) {
      for (const region of REGIONS) {
        const r = params.regions[region];
        if (!r) continue;

        if (r.gdp2025 !== undefined && r.gdp2025 < 0) {
          errors.push(`${region}: GDP must be positive`);
        }
        if (r.tfpGrowth !== undefined && (r.tfpGrowth < -0.05 || r.tfpGrowth > 0.10)) {
          errors.push(`${region}: TFP growth must be between -5% and 10%`);
        }
        if (r.energyIntensity !== undefined && r.energyIntensity < 0) {
          errors.push(`${region}: Energy intensity must be positive`);
        }
        if (r.intensityDecline !== undefined && r.intensityDecline > 0.05) {
          warnings.push(`${region}: Energy intensity decline >5%/year is unusually high`);
        }
      }
    }

    // Validate useful work elasticity
    if (params.usefulWorkElasticity !== undefined) {
      if (params.usefulWorkElasticity < 0 || params.usefulWorkElasticity > 1) {
        errors.push('usefulWorkElasticity must be between 0 and 1');
      }
    }

    // Validate global params
    if (params.electrificationTarget !== undefined) {
      if (params.electrificationTarget < 0 || params.electrificationTarget > 1) {
        errors.push('Electrification target must be between 0 and 1');
      }
      if (params.electrificationTarget > 0.90) {
        warnings.push('Electrification target >90% may be unrealistic (aviation, shipping)');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<DemandParams>): DemandParams {
    return validatedMerge('demand', this.validate, (p) => {
      const merged = { ...demandDefaults };

      // Merge regions
      if (p.regions) {
        merged.regions = { ...demandDefaults.regions };
        for (const region of REGIONS) {
          if (p.regions[region]) {
            merged.regions[region] = {
              ...demandDefaults.regions[region],
              ...p.regions[region],
            };
          }
        }
      }

      // Merge sectors
      if (p.sectors) {
        merged.sectors = { ...demandDefaults.sectors };
        for (const sector of ['transport', 'buildings', 'industry'] as const) {
          if (p.sectors[sector]) {
            merged.sectors[sector] = {
              ...demandDefaults.sectors[sector],
              ...p.sectors[sector],
            };
          }
        }
      }

      // Merge fuels
      if (p.fuels) {
        merged.fuels = { ...demandDefaults.fuels };
        for (const fuel of ['oil', 'gas', 'coal', 'biomass', 'hydrogen', 'biofuel'] as const) {
          if (p.fuels[fuel]) {
            merged.fuels[fuel] = {
              ...demandDefaults.fuels[fuel],
              ...p.fuels[fuel],
            };
          }
        }
      }

      // Merge scalar params
      if (p.electrification2025 !== undefined) merged.electrification2025 = p.electrification2025;
      if (p.electrificationTarget !== undefined) merged.electrificationTarget = p.electrificationTarget;
      if (p.demographicFactor !== undefined) merged.demographicFactor = p.demographicFactor;
      if (p.efficiencyMultiplier !== undefined) merged.efficiencyMultiplier = p.efficiencyMultiplier;

      // Useful work elasticity
      if (p.usefulWorkElasticity !== undefined) merged.usefulWorkElasticity = p.usefulWorkElasticity;

      // GDP growth params
      if (p.capitalElasticity !== undefined) merged.capitalElasticity = p.capitalElasticity;
      if (p.baselineElecTrend !== undefined) merged.baselineElecTrend = p.baselineElecTrend;

      // Cost-driven electrification params
      if (p.costSensitivity !== undefined) merged.costSensitivity = p.costSensitivity;
      if (p.maxAnnualElecChange !== undefined) merged.maxAnnualElecChange = p.maxAnnualElecChange;
      if (p.physicalElecCeiling !== undefined) merged.physicalElecCeiling = p.physicalElecCeiling;

      // Merge fuelMix params
      if (p.fuelMix) {
        merged.fuelMix = {
          ...demandDefaults.fuelMix,
          ...p.fuelMix,
        };
      }

      // Merge energyBurden params
      if (p.energyBurden) {
        merged.energyBurden = {
          ...demandDefaults.energyBurden,
          ...p.energyBurden,
        };
      }

      return merged;
    }, partial);
  },

  init(params: DemandParams): DemandState {
    const regions = {} as Record<Region, RegionalState>;

    // Calculate initial GDP shares from gdp2025 values
    const totalGdp = REGIONS.reduce((sum, r) => sum + params.regions[r].gdp2025, 0);

    for (const region of REGIONS) {
      const r = params.regions[region];
      regions[region] = {
        gdpShare: r.gdp2025 / totalGdp,
        intensity: r.energyIntensity,
      };
    }

    // Initialize fuel shares from 2025 values
    const fuelShares: Record<FuelType, number> = {
      oil: params.fuels.oil.share2025,
      gas: params.fuels.gas.share2025,
      coal: params.fuels.coal.share2025,
      biomass: params.fuels.biomass.share2025,
      hydrogen: params.fuels.hydrogen.share2025,
      biofuel: params.fuels.biofuel.share2025,
    };

    // Initialize sector electrification from 2025 values
    const sectorElectrification = {
      transport: params.sectors.transport.electrification2025,
      buildings: params.sectors.buildings.electrification2025,
      industry: params.sectors.industry.electrification2025,
    };

    return {
      regions,
      baselineDependency: 0, // Will be set on first step
      electrificationRate: params.electrification2025, // Initial electrification
      fuelShares,
      sectorElectrification,
      previousEffectiveWorkers: { oecd: 0, china: 0, em: 0, row: 0 }, // Set on first step
      previousUsefulEnergyPerWorker: 0, // Set after first year
      usefulWorkGrowthRate: 0,          // No growth in first year
    };
  },

  step(
    state: DemandState,
    inputs: DemandInputs,
    params: DemandParams,
    year: number,
    yearIndex: number
  ): { state: DemandState; outputs: DemandOutputs } {
    const t = yearIndex;

    // Set baseline dependency on first step
    let baselineDependency = state.baselineDependency;
    if (yearIndex === 0) {
      baselineDependency = inputs.dependency;
    }

    // Calculate global electrification rate (cost-driven)
    // Electricity becomes more attractive when cheaper than fuel
    const carbonPrice = inputs.carbonPrice ?? 35; // Default carbon price
    const avgFuelCost = calculateWeightedFuelCost(params.fuels, state.fuelShares, carbonPrice);
    const electricityPrice = inputs.laggedAvgLCOE ?? 50; // Default $/MWh if not provided

    // Cost ratio drives electrification pressure
    // When electricity is cheaper than fuel (ratio > 1), electrification accelerates
    const costRatio = avgFuelCost / electricityPrice;

    // Baseline trend: natural electrification from existing infrastructure/policy momentum
    // ~0.5%/year baseline + additional cost-driven pressure
    const baselineTrend = params.baselineElecTrend;

    // Additional cost pressure from favorable economics
    // costSensitivity = 0.05 means 5% boost per cost halving (beyond baseline)
    const costBonus = Math.log(Math.max(1, costRatio)) * params.costSensitivity;

    // Total pressure = baseline + cost bonus
    const totalPressure = baselineTrend + costBonus;

    // Get previous rate from state
    const prevRate = state.electrificationRate;

    // Apply pressure with infrastructure constraint
    const targetRate = Math.min(
      params.physicalElecCeiling,
      prevRate + totalPressure
    );

    // Limit annual change (infrastructure takes time to build)
    const maxChange = params.maxAnnualElecChange;
    const electrificationRate = Math.max(
      params.electrification2025, // Floor at starting rate
      Math.min(
        params.physicalElecCeiling,
        prevRate + Math.max(-maxChange, Math.min(maxChange, targetRate - prevRate))
      )
    );

    // Global GDP comes from production module
    const globalGdp = inputs.gdp;

    // Evolve regional GDP shares based on differential productivity
    const newRegions = {} as Record<Region, RegionalState>;
    const regionalOutputs = {} as Record<Region, RegionalOutputs>;

    let globalElec = 0;
    let globalWorking = 0;
    let globalTotalFinal = 0;
    let globalNonElec = 0;

    // First pass: compute share adjustments
    const shareAdjustments: Record<Region, number> = {} as Record<Region, number>;
    let avgTfp = 0;
    for (const region of REGIONS) {
      const regionParams = params.regions[region];
      const tfp = regionParams.tfpGrowth * Math.pow(1 - regionParams.tfpDecay, t);
      avgTfp += tfp * state.regions[region].gdpShare;
    }

    for (const region of REGIONS) {
      const regionParams = params.regions[region];
      const effective = inputs.regionalEffectiveWorkers[region];
      const prevEffective = state.previousEffectiveWorkers[region];

      const tfp = regionParams.tfpGrowth * Math.pow(1 - regionParams.tfpDecay, t);
      const laborAdj = (yearIndex > 0 && prevEffective > 0)
        ? 0.1 * ((effective - prevEffective) / prevEffective)
        : 0;
      const damageAdj = -(inputs.regionalDamages?.[region] ?? 0) * 0.5;

      shareAdjustments[region] = (tfp - avgTfp) + laborAdj + damageAdj;
    }

    // Update shares and normalize
    const rawShares: Record<Region, number> = {} as Record<Region, number>;
    let totalShares = 0;
    for (const region of REGIONS) {
      rawShares[region] = state.regions[region].gdpShare * (1 + shareAdjustments[region]);
      rawShares[region] = Math.max(0.01, rawShares[region]); // Floor at 1%
      totalShares += rawShares[region];
    }

    // Second pass: compute energy demand from regional GDP
    for (const region of REGIONS) {
      const regionParams = params.regions[region];
      const currentState = state.regions[region];
      const working = inputs.regionalWorking[region];

      const normalizedShare = rawShares[region] / totalShares;
      const newGdp = globalGdp * normalizedShare;

      // Compute growth rate for diagnostics
      const prevGdp = currentState.gdpShare * (yearIndex > 0 ? globalGdp / (1 + 0.02) : globalGdp);
      const growthRate = prevGdp > 0 ? (newGdp - prevGdp) / prevGdp : 0;

      // Update energy intensity
      let newIntensity = currentState.intensity;
      if (yearIndex > 0) {
        newIntensity = currentState.intensity *
          (1 - regionParams.intensityDecline * params.efficiencyMultiplier);
      }

      // Calculate energy demand
      const totalEnergy = newGdp * newIntensity * 1000; // TWh
      const elecDemand = totalEnergy * electrificationRate;
      const nonElecEnergy = totalEnergy - elecDemand;

      // Per working-age adult metrics
      const gdpPerWorking = (newGdp * 1e12) / working;
      const elecPerWorking = (elecDemand * 1e9) / working;

      // Store new state
      newRegions[region] = {
        gdpShare: normalizedShare,
        intensity: newIntensity,
      };

      // Store outputs
      regionalOutputs[region] = {
        gdp: newGdp,
        growthRate,
        energyIntensity: newIntensity,
        totalFinalEnergy: totalEnergy,
        electricityDemand: elecDemand,
        nonElectricEnergy: nonElecEnergy,
        gdpPerWorking,
        electricityPerWorking: elecPerWorking,
      };

      // Accumulate globals
      globalElec += elecDemand;
      globalWorking += working;
      globalTotalFinal += totalEnergy;
      globalNonElec += nonElecEnergy;
    }

    // Calculate final energy per capita per day
    // TWh × 1e9 kWh/TWh / population / 365 days
    const finalEnergyPerCapitaDay = (globalTotalFinal * 1e9 / inputs.population) / 365;

    // =========================================================================
    // Sector-level breakdown with cost-driven electrification
    // =========================================================================
    const sectorKeys = ['transport', 'buildings', 'industry'] as const;
    const sectors = {} as Record<typeof sectorKeys[number], SectorOutput>;
    const newSectorElectrification = { ...state.sectorElectrification };

    for (const sectorKey of sectorKeys) {
      const sectorParams = params.sectors[sectorKey];
      const prevSectorRate = state.sectorElectrification[sectorKey];

      // Get primary fuel price for this sector
      const primaryFuel = sectorParams.primaryFuel;
      const fuelPrice = params.fuels[primaryFuel].price;
      const fuelCarbonIntensity = params.fuels[primaryFuel].carbonIntensity;

      // Calculate cost-driven electrification rate
      const sectorElecRate = calculateSectorElectrification(
        prevSectorRate,
        electricityPrice,
        fuelPrice,
        carbonPrice,
        fuelCarbonIntensity,
        sectorParams,
        yearIndex
      );

      // Update sector electrification state
      newSectorElectrification[sectorKey] = sectorElecRate;

      // Sector total energy
      const sectorTotal = globalTotalFinal * sectorParams.share;
      const sectorElectric = sectorTotal * sectorElecRate;
      const sectorNonElectric = sectorTotal - sectorElectric;

      sectors[sectorKey] = {
        total: sectorTotal,
        electric: sectorElectric,
        nonElectric: sectorNonElectric,
        electrificationRate: sectorElecRate,
      };
    }

    // Useful energy = electrified energy * efficiency multiplier + non-electric energy
    let usefulEnergy = 0;
    for (const sectorKey of sectorKeys) {
      const sectorParams = params.sectors[sectorKey];
      const sectorOutput = sectors[sectorKey];
      usefulEnergy += sectorOutput.electric * sectorParams.efficiencyMultiplier;
      usefulEnergy += sectorOutput.nonElectric;
    }
    const usefulEnergyFactor = globalTotalFinal > 0 ? usefulEnergy / globalTotalFinal : 1;

    // Ayres/Warr: compute useful energy per worker growth rate for next year's GDP
    const totalEffectiveWorkers = REGIONS.reduce(
      (sum, r) => sum + inputs.regionalEffectiveWorkers[r], 0
    );
    const usefulEnergyPerWorker = totalEffectiveWorkers > 0
      ? usefulEnergy / totalEffectiveWorkers
      : 0;
    const newUsefulWorkGrowthRate = state.previousUsefulEnergyPerWorker > 0
      ? (usefulEnergyPerWorker - state.previousUsefulEnergyPerWorker) / state.previousUsefulEnergyPerWorker
      : 0;

    // =========================================================================
    // Fuel mix for non-electric energy (price-driven with inertia)
    // =========================================================================
    // Fuel shares evolve based on effective prices (base + carbon cost)
    // Uses logit model blended with previous shares for fleet inertia
    const fuelKeys = ['oil', 'gas', 'coal', 'biomass', 'hydrogen', 'biofuel'] as const;

    // Calculate evolved fuel shares using logit model with inertia
    const evolvedShares = calculateLogitFuelShares(
      params.fuels,
      state.fuelShares,
      carbonPrice,
      params.fuelMix.priceSensitivity,
      params.fuelMix.inertiaRate
    );

    // Calculate fuel consumption (TWh) and emissions (Gt CO2/year)
    const fuels: FuelOutput = {
      oil: 0,
      gas: 0,
      coal: 0,
      biomass: 0,
      hydrogen: 0,
      biofuel: 0,
    };

    let nonElectricEmissions = 0; // Gt CO2/year

    // Calculate fuel costs (with carbon pricing if provided)
    // (carbonPrice already declared above for electrification calculation)
    let fuelCost = 0; // $ trillions

    for (const fuel of fuelKeys) {
      const fuelConsumption = globalNonElec * evolvedShares[fuel];
      fuels[fuel] = fuelConsumption;

      // Emissions: TWh × 1e6 MWh/TWh × kg/MWh / 1e12 kg/Gt = Gt CO2
      // Simplified: TWh × kg/MWh / 1e6 = Gt CO2
      const emissions = (fuelConsumption * params.fuels[fuel].carbonIntensity) / 1e6;
      nonElectricEmissions += emissions;

      // Fuel cost with carbon pricing
      // Base price + (carbonIntensity kg/MWh × carbonPrice $/t / 1000 kg/t)
      const carbonCost = (params.fuels[fuel].carbonIntensity * carbonPrice) / 1000;
      const effectivePrice = params.fuels[fuel].price + carbonCost;

      // Cost: TWh × $/MWh × 1e6 MWh/TWh / 1e12 = $ trillions
      fuelCost += (fuelConsumption * effectivePrice) / 1e6;
    }

    // =========================================================================
    // Energy Burden Calculation
    // =========================================================================
    // Electricity cost: generation × weighted LCOE
    // TWh × $/MWh × 1e6 MWh/TWh / 1e12 = $ trillions
    const electricityGeneration = inputs.electricityGeneration ?? globalElec;
    const avgLCOE = inputs.weightedAverageLCOE ?? 50; // Default assumption
    const electricityTotalCost = (electricityGeneration * avgLCOE) / 1e6;

    const totalEnergyCost = electricityTotalCost + fuelCost;
    const energyBurden = totalEnergyCost / globalGdp;

    // Cap burden at historical max (e.g., 1970s oil crisis peak)
    const cappedBurden = Math.min(energyBurden, params.energyBurden.maxBurden);

    // Energy burden damage: when burden exceeds threshold
    let burdenDamage = 0;
    if (cappedBurden > params.energyBurden.threshold) {
      const excessBurden = cappedBurden - params.energyBurden.threshold;
      // Linear damage up to max
      burdenDamage = Math.min(
        excessBurden * params.energyBurden.elasticity,
        params.energyBurden.maxDamage
      );
    }

    return {
      state: {
        regions: newRegions,
        baselineDependency,
        electrificationRate, // Persist for next step (cost-driven)
        fuelShares: evolvedShares, // Persist evolved fuel shares
        sectorElectrification: newSectorElectrification, // Persist sector rates
        previousEffectiveWorkers: inputs.regionalEffectiveWorkers, // For next year's labor growth
        previousUsefulEnergyPerWorker: usefulEnergyPerWorker, // For Ayres/Warr
        usefulWorkGrowthRate: newUsefulWorkGrowthRate,
      },
      outputs: {
        regional: regionalOutputs,
        electricityDemand: globalElec,
        electrificationRate,
        totalFinalEnergy: globalTotalFinal,
        nonElectricEnergy: globalNonElec,
        usefulEnergy,
        usefulEnergyFactor,
        gdpPerWorking: (globalGdp * 1e12) / globalWorking,
        electricityPerWorking: (globalElec * 1e9) / globalWorking,
        finalEnergyPerCapitaDay,
        sectors,
        fuels,
        nonElectricEmissions,
        electricityCost: electricityTotalCost,
        fuelCost,
        totalEnergyCost,
        energyBurden,
        burdenDamage,
        usefulWorkGrowthRate: newUsefulWorkGrowthRate,
      },
    };
  },
};

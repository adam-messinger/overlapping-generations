/**
 * Resources Module
 *
 * Handles mineral demand, land use, and forest carbon.
 * Minerals are driven by energy capacity additions.
 * Land responds to population, GDP, and climate (yield damage).
 * Forest carbon creates feedback to climate module.
 *
 * Inputs (from other modules):
 * - additions: From energy module
 * - population, gdpPerCapita: From demographics/demand
 * - temperature: From climate module (lagged)
 * - transportElectrification: From demand (EV battery demand)
 *
 * Outputs (to other modules):
 * - netFlux: Gt CO2/year from land use change (to climate)
 * - minerals, land: Tracking data
 */

import { defineModule, Module, ValidationResult, validatedMerge } from 'tsimulation';
import { EnergySource, Region, REGIONS } from '../domain-types.js';

// =============================================================================
// PARAMETERS
// =============================================================================

export interface MineralParams {
  name: string;
  perMW_solar?: number;      // kg per MW solar
  perMW_wind?: number;       // kg per MW wind
  perMW_nuclear?: number;    // kg per MW nuclear
  perGWh_battery?: number;   // kg per GWh battery
  learningRate: number;      // Annual intensity decline
  reserves: number | null;   // Mt known reserves (null = unlimited)
  recyclingBase: number;     // Baseline recycling rate
  recyclingMax: number;      // Max recycling rate
  recyclingHalfway: number;  // Mt stock at halfway to max recycling

  // Mining supply constraints
  annualSupply2025: number;  // Mt/year current mining capacity
  maxMiningGrowth: number;   // Max annual growth rate of mining capacity
  maxMiningCapacity: number; // Mt/year ceiling (logistic saturation)
}

export interface LandParams {
  farmland2025: number;           // Mha cropland
  yieldGrowthRate: number;        // Annual yield improvement
  yield2025: number;              // t/ha global average
  nonFoodMultiplier: number;      // Expands grain-only to total cropland

  urbanPerCapita: number;         // ha per person
  urban2025: number;              // Mha urban area
  urbanWealthElasticity: number;  // 10% richer → X% more urban land

  forestArea2025: number;         // Mha forests
  forestLossRate: number;         // Annual loss baseline
  reforestationRate: number;      // Fraction of abandoned farmland → forest

  minForestArea: number;          // Mha ecological minimum forest area
  totalLandArea: number;          // Mha total ice-free land
  desert2025: number;             // Mha desert/barren
  desertificationRate: number;    // Baseline annual expansion
  desertificationClimateCoeff: number; // Additional per °C above 1.5°C

  // Forest carbon
  forestCarbonDensity: number;    // t C/ha average standing stock
  sequestrationRate: number;      // t CO2/ha/year for growing forest
  deforestationEmissionFactor: number; // Fraction released immediately
  decayRate: number;              // Annual decay rate for deferred pool

  // Climate-yield damage
  yieldDamageThreshold: number;   // °C where damage begins
  yieldDamageCoeff: number;       // Quadratic damage coefficient

  // Schlenker/Roberts yield cliff
  yieldCliffExcess: number;       // °C above threshold where cliff begins (default 1.0)
  yieldCliffSteepness: number;    // Exponential decay rate beyond cliff (default 1.5)
}

export interface FoodParams {
  // Calories
  caloriesPerCapita2025: number;  // kcal/day global average
  caloriesGrowthRate: number;     // Annual growth (developing world catch-up)

  // Bennett's Law - protein transition with wealth
  proteinShare2025: number;       // Fraction of calories from protein
  proteinShareMax: number;        // Saturation level (OECD)
  proteinGDPHalfway: number;      // GDP/capita at halfway to max protein

  // Conversion factors
  grainToProteinRatio: number;    // kg grain per kg protein (feed conversion)
  caloriesPerKgGrain: number;     // kcal per kg grain
  proteinCaloriesPerKg: number;   // kcal per kg protein (meat/dairy)
}

export interface MiningEnergyParams {
  energyIntensity: Record<MineralKey, number>;  // GJ per ton
  depletionExponent: number;                    // 0.3
}

/**
 * Water stress model (IPCC AR6-calibrated parametric approach)
 *
 * At 4-region resolution, supply/demand accounting can't capture local stress
 * (Sahel vs Congo, India vs Brazil). Instead, we model the fraction of
 * each region's agriculture under water stress as a function of warming,
 * calibrated to IPCC AR6 WG2 Chapter 4 findings:
 *   - 2°C: ~2-5% additional yield loss from water
 *   - 3°C: ~5-10%
 *   - 4°C: ~10-20%
 */
export interface WaterRegionalParams {
  vulnerability: number;    // Stress per °C above 1.2 (higher = more arid/exposed)
  farmlandShare: number;    // Share of global farmland (for weighting yield impact)
}

export interface WaterParams {
  regional: Record<Region, WaterRegionalParams>;
  baseSeverity: number;       // Scale factor at moderate warming (1.0)
  severityGrowth: number;     // Severity growth per °C above 2.0 (0.5)
  yieldSensitivity: number;   // Yield loss per unit water stress (0.3)
}

export interface EVBatteryParams {
  /** Global light vehicle fleet 2025 (millions) */
  vehicleFleet2025: number;
  /** Fleet growth per unit GDP/capita growth */
  fleetGDPElasticity: number;
  /** Average EV battery capacity (kWh) */
  avgBatteryKWh: number;
  /** Average vehicle lifetime (years) */
  vehicleLifetime: number;
}

export interface ResourcesParams {
  minerals: {
    copper: MineralParams;
    lithium: MineralParams;
    rareEarths: MineralParams;
    steel: MineralParams;
  };
  evBattery: EVBatteryParams;
  mining: MiningEnergyParams;
  land: LandParams & { energyPerHectare: number };
  food: FoodParams;
  water: WaterParams;
}

export const resourcesDefaults: ResourcesParams = {
  minerals: {
    copper: {
      name: 'Copper',
      perMW_solar: 2800,          // kg/MW utility PV, IEA Critical Minerals 2021 (~2.8 t/MW); see docs/
      perMW_wind: 3500,           // kg/MW onshore, IEA 2021 (~2.9 t/MW onshore, ~8 t/MW offshore — blended)
      // 0.7 kg/kWh: cell current collectors ~0.3-0.5 kg/kWh plus module/pack
      // busbars and interconnects (IEA Critical Minerals 2021; EV teardowns).
      // Was 800 kg/GWh — a ~1000x unit error that made battery copper invisible.
      perGWh_battery: 700000,     // kg/GWh (0.7 kg/kWh)
      learningRate: 0.02,         // Intensity decline assumption
      reserves: 880,              // Mt, USGS Mineral Commodity Summaries 2023 (~890 Mt)
      recyclingBase: 0.15,
      recyclingMax: 0.50,
      recyclingHalfway: 500,
      annualSupply2025: 22,       // Mt/year mine production, USGS 2024 (~22 Mt)
      maxMiningGrowth: 0.03,      // 3%/yr max growth (assumption)
      maxMiningCapacity: 60,      // Mt/yr logistic ceiling (assumption)
    },
    lithium: {
      name: 'Lithium',
      perGWh_battery: 110000,     // kg Li per GWh (~0.11 kg/kWh, blended NMC/LFP; IRENA 2023)
      learningRate: 0.03,         // Intensity decline from NMC→LFP shift + efficiency
      reserves: 28,               // Mt lithium metal (USGS 2024)
      recyclingBase: 0.05,
      recyclingMax: 0.30,
      recyclingHalfway: 20,
      annualSupply2025: 0.18,     // Mt/year lithium metal (USGS 2024: 180kt)
      maxMiningGrowth: 0.15,      // 15%/yr max growth (new mines opening fast)
      maxMiningCapacity: 3.0,     // Mt/yr logistic ceiling (brine + hard rock + clay)
    },
    rareEarths: {
      name: 'Rare Earths',
      // Fleet average: ~200 kg NdPr-eq/MW applies to direct-drive machines only
      // (IEA 2021); direct-drive is ~30% of the market (GWEC), geared DFIG uses
      // ~10x less. Previously 200 applied to all additions — ~3x overstated.
      perMW_wind: 65,             // kg NdPr-equivalent/MW, fleet-weighted
      learningRate: 0.01,
      reserves: 130,              // Mt REO, USGS 2024 (~110-130 Mt range)
      recyclingBase: 0.01,
      recyclingMax: 0.20,
      recyclingHalfway: 10,
      annualSupply2025: 0.30,     // Mt/year
      maxMiningGrowth: 0.05,      // 5%/yr
      maxMiningCapacity: 1.5,     // Mt/yr logistic ceiling
    },
    steel: {
      name: 'Steel',
      perMW_solar: 35000,         // kg/MW incl. mounting/trackers (lit. range 30-70 t/MW)
      perMW_wind: 120000,         // kg/MW incl. tower/foundation (lit. range 100-180 t/MW)
      perMW_nuclear: 60000,       // kg/MW (lit. ~40-80 t/MW)
      learningRate: 0.01,
      reserves: null, // Effectively unlimited (iron ore is not scarce)
      recyclingBase: 0.35,
      recyclingMax: 0.70,
      recyclingHalfway: 5000,
      annualSupply2025: 1900,     // Mt/year crude steel, worldsteel 2023 (~1.89 Gt)
      maxMiningGrowth: 0.02,      // 2%/yr max growth (assumption)
      maxMiningCapacity: 3500,    // Mt/yr logistic ceiling (assumption)
    },
  },
  evBattery: {
    vehicleFleet2025: 1400,     // million vehicles globally
    fleetGDPElasticity: 0.3,    // 10% richer → 3% more vehicles
    avgBatteryKWh: 60,          // kWh per EV (trending down with efficiency)
    vehicleLifetime: 15,        // years average
  },
  mining: {
    energyIntensity: {
      copper: 30,       // GJ per ton (lit. ~20-30 GJ/t at current ore grades)
      lithium: 50,      // GJ per ton
      rareEarths: 100,  // GJ per ton
      // worldsteel: ~20 GJ/t crude steel global average (BF-BOF ~24, EAF ~10).
      // Was 5 GJ/t — an EAF-scrap figure applied to all steel, ~4x low.
      steel: 20,        // GJ per ton
    },
    depletionExponent: 0.3,
  },
  land: {
    energyPerHectare: 3.0,   // GJ/ha (fertilizer ~1.5, machinery ~1.0, irrigation ~0.5)
    farmland2025: 4800,      // Mha total agricultural land incl. pasture (FAOSTAT 2021 ~4.8 Gha; cropland alone is ~1.6 Gha)
    yieldGrowthRate: 0.01,   // ~1%/yr technological yield growth (FAO long-run cereal trend)
    yield2025: 4.0,          // t/ha world average cereal yield (FAOSTAT 2022: ~4.1)
    nonFoodMultiplier: 4.9,  // Total agricultural land per unit of grain-equivalent cropland (calibrated to farmland2025)

    urbanPerCapita: 0.04,    // ha/person built-up land (lit. range 0.02-0.06)
    urban2025: 50,           // Mha (unused in step; kept for state init)
    urbanWealthElasticity: 0.3, // Modeling assumption

    forestArea2025: 4000,    // Mha (FAO Global Forest Resources Assessment 2020: 4,060 Mha)
    forestLossRate: 0.002,   // ~0.2%/yr gross loss (FAO FRA 2020: ~10 Mha/yr on 4 Gha)
    reforestationRate: 0.5,  // Fraction of released farmland that reforests (assumption)

    minForestArea: 2000,     // Mha protected floor (assumption)
    totalLandArea: 13000,    // Mha global land excl. Antarctica (FAO: ~13 Gha)
    desert2025: 3870,        // Mha residual: total - farmland - forest - computed 2025 urban (~330 Mha at pop 8.2e9); FAO barren/other order of magnitude
    desertificationRate: 0.001,      // Assumption (UNCCD reports degradation, not desert area growth)
    desertificationClimateCoeff: 0.002, // Assumption

    // t C/ha (the code converts to CO2 via 44/12). Deforestation is
    // tropics-concentrated, so the density of *cleared* forest is
    // tropical-weighted: ~150-200 t C/ha above+below-ground biomass in moist
    // tropical forest (IPCC 2006 Guidelines Tier-1; FAO FRA 2020). The old
    // comment mislabeled this value as t CO2/ha.
    forestCarbonDensity: 150,
    sequestrationRate: 7.5,    // t CO2/ha/yr young forest (IPCC AR6 WGIII afforestation range ~4-10)
    deforestationEmissionFactor: 0.5, // Fraction emitted immediately vs decay pool (assumption)
    decayRate: 0.05,

    // Schlenker & Roberts (2009) nonlinear yield-temperature response —
    // see sources/Schlenker-Roberts-Crop-Yields.md
    yieldDamageThreshold: 2.0,
    yieldDamageCoeff: 0.15,

    yieldCliffExcess: 1.0,
    yieldCliffSteepness: 1.5,
  },
  food: {
    // Calories baseline (FAO global average)
    caloriesPerCapita2025: 2800,  // kcal/day
    caloriesGrowthRate: 0.002,    // 0.2%/year (developing world catch-up)

    // Bennett's Law - protein share rises with income
    proteinShare2025: 0.11,       // 11% of calories from protein (global avg)
    proteinShareMax: 0.16,        // 16% saturation (OECD level)
    proteinGDPHalfway: 15000,     // GDP/capita at halfway to max ($15k)

    // Conversion factors
    grainToProteinRatio: 6,       // kg grain per kg protein (feed conversion)
    caloriesPerKgGrain: 3400,     // kcal per kg grain
    proteinCaloriesPerKg: 4000,   // kcal per kg protein (meat/dairy avg)
  },

  // Water stress: vulnerabilities are stylized rankings consistent with
  // IPCC AR6 WGII regional water-scarcity assessments and Schewe et al.
  // (2014, docs/schewe-2014.pdf); per-degree severities are calibration,
  // not sourced point values
  water: {
    regional: {
      oecd: {
        vulnerability: 0.03,    // Low — temperate, good infrastructure
        farmlandShare: 0.22,
      },
      china: {
        vulnerability: 0.06,    // Moderate — North China plains drying
        farmlandShare: 0.13,
      },
      india: {
        vulnerability: 0.14,    // High — groundwater crisis, monsoon variability
        farmlandShare: 0.18,
      },
      latam: {
        vulnerability: 0.05,    // Moderate — Amazon basin, but some arid regions
        farmlandShare: 0.12,
      },
      seasia: {
        vulnerability: 0.07,    // Moderate — monsoon-dependent
        farmlandShare: 0.10,
      },
      russia: {
        vulnerability: 0.02,    // Low — abundant freshwater
        farmlandShare: 0.10,
      },
      mena: {
        vulnerability: 0.20,    // Highest — most water-scarce region globally
        farmlandShare: 0.05,
      },
      ssa: {
        vulnerability: 0.15,    // High — Sahel, Horn of Africa
        farmlandShare: 0.10,
      },
    },
    baseSeverity: 1.0,          // Scale factor at moderate warming
    severityGrowth: 0.5,        // 50% more severe per °C above 2.0
    yieldSensitivity: 0.3,      // 30% of water stress → yield loss
  },
};

// =============================================================================
// STATE
// =============================================================================

export interface MineralState {
  cumulative: number;      // Mt total extracted
  miningCapacity: number;  // Mt/year current mining capacity
}

export interface LandState {
  farmland: number;    // Mha
  urban: number;       // Mha
  forest: number;      // Mha
  desert: number;      // Mha
  desertExpansion: number; // Mha cumulative climate-driven desertification
}

export interface ResourcesState {
  minerals: {
    copper: MineralState;
    lithium: MineralState;
    rareEarths: MineralState;
    steel: MineralState;
  };
  land: LandState;
  decayPool: number;           // Gt CO2 deferred emissions
  cumulativeSequestration: number; // Gt CO2 total sequestered
  prevEVFleetMillions: number; // Previous year's EV fleet size (millions)
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface ResourcesInputs {
  /** Capacity additions this year (GW, GWh for battery) */
  additions: Record<EnergySource, number>;

  /** Global population */
  population: number;

  /** GDP per capita ($) */
  gdpPerCapita: number;

  /** GDP per capita in 2025 ($) - for wealth adjustment */
  gdpPerCapita2025: number;

  /** Global temperature (°C above preindustrial) */
  temperature: number;

  /** Transport electrification fraction (0-1), from demand module */
  transportElectrification: number;
}

export interface MineralOutput {
  demand: number;        // Mt/year net of recycling
  grossDemand: number;   // Mt/year before recycling
  recycled: number;      // Mt/year recycled
  cumulative: number;    // Mt total extracted
  recyclingRate: number; // Current recycling rate
  reserveRatio: number;  // Cumulative / reserves (null if unlimited)
}

export interface LandOutput {
  farmland: number;          // Mha
  urban: number;             // Mha
  forest: number;            // Mha
  desert: number;            // Mha
  yield: number;             // t/ha
  yieldDamageFactor: number; // 1 = no damage, <1 = climate damage
  forestChange: number;      // Mha/year (positive = growth)
}

export interface CarbonOutput {
  sequestration: number;           // Gt CO2/year removed
  deforestationEmissions: number;  // Gt CO2/year immediate
  decayEmissions: number;          // Gt CO2/year from decay pool
  netFlux: number;                 // Gt CO2/year (positive = net emissions)
  cumulativeSequestration: number; // Gt CO2 total sequestered
}

export interface FoodOutput {
  caloriesPerCapita: number;  // kcal/person/day
  proteinShare: number;       // Fraction (0-0.16)
  grainEquivalent: number;    // Mt/year (total grain needed for food)
}

export interface ResourcesOutputs {
  minerals: {
    copper: MineralOutput;
    lithium: MineralOutput;
    rareEarths: MineralOutput;
    steel: MineralOutput;
  };
  land: LandOutput;
  carbon: CarbonOutput;
  food: FoodOutput;
  foodStress: number;  // 0-1, fraction of food demand that cannot be met
  mineralConstraint: number;  // 0-1, min supply ratio across minerals (1 = no constraint)
  miningEnergyTWh: number;   // Energy for mining operations
  farmingEnergyTWh: number;  // Energy for farming operations
  totalResourceEnergy: number; // Sum of mining + farming energy (TWh)
  waterStress: Record<Region, number>;  // 0-1 per region
  waterYieldFactor: number;   // 0-1 global yield multiplier from water
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate recycling rate based on stock-in-use
 */
function recyclingRate(mineral: MineralParams, stockInUse: number): number {
  if (!mineral.recyclingMax) return 0;
  return mineral.recyclingBase +
    (mineral.recyclingMax - mineral.recyclingBase) *
    (1 - Math.exp(-stockInUse / mineral.recyclingHalfway));
}

/**
 * Calculate mineral demand for capacity additions
 */
function calculateMineralDemand(
  mineral: MineralParams,
  additions: Record<EnergySource, number>,
  yearIndex: number,
  cumulativeStock: number
): { demand: number; grossDemand: number; recycled: number; recyclingRate: number } {
  // Intensity declines with learning
  const intensityFactor = Math.pow(1 - mineral.learningRate, yearIndex);

  // Calculate gross demand in kg
  let grossDemandKg = 0;

  if (mineral.perMW_solar) {
    grossDemandKg += additions.solar * 1000 * mineral.perMW_solar * intensityFactor;
  }
  if (mineral.perMW_wind) {
    grossDemandKg += additions.wind * 1000 * mineral.perMW_wind * intensityFactor;
  }
  if (mineral.perMW_nuclear) {
    grossDemandKg += additions.nuclear * 1000 * mineral.perMW_nuclear * intensityFactor;
  }
  if (mineral.perGWh_battery) {
    // Battery additions are already in GWh (from energy module)
    const batteryGWh = additions.battery;
    grossDemandKg += batteryGWh * mineral.perGWh_battery * intensityFactor;
  }

  // Convert to Mt
  const grossDemand = grossDemandKg / 1e9;

  // Calculate recycling
  const recycleRate = recyclingRate(mineral, cumulativeStock);
  const recycled = grossDemand * recycleRate;
  const demand = Math.max(0, grossDemand - recycled);

  return { demand, grossDemand, recycled, recyclingRate: recycleRate };
}

/**
 * Calculate food demand with Bennett's Law protein transition
 *
 * As people get richer, they eat more protein (meat/dairy), which requires
 * more grain via feed conversion (~6kg grain per kg protein).
 */
function calculateFoodDemand(
  population: number,
  gdpPerCapita: number,
  yearIndex: number,
  food: FoodParams
): FoodOutput {
  // Base calories with slow growth for developing world catch-up
  const caloriesPerCapita = food.caloriesPerCapita2025 *
    Math.pow(1 + food.caloriesGrowthRate, yearIndex);

  // Bennett's Law: protein share rises with income (logistic saturation)
  // proteinShare = base + (max - base) × gdp/(gdp + halfwayGDP)
  const proteinShare = food.proteinShare2025 +
    (food.proteinShareMax - food.proteinShare2025) *
    (gdpPerCapita / (gdpPerCapita + food.proteinGDPHalfway));

  // Total calories per year (convert to useful units)
  // population × kcal/day × 365 days = kcal/year
  const totalCaloriesPerYear = population * caloriesPerCapita * 365;

  // Split into protein and non-protein calories
  const proteinCalories = totalCaloriesPerYear * proteinShare;
  const nonProteinCalories = totalCaloriesPerYear - proteinCalories;

  // Convert to grain equivalent (Mt)
  // Direct grain: non-protein calories / caloriesPerKgGrain / 1e9 (kg → Mt)
  const directGrainMt = nonProteinCalories / food.caloriesPerKgGrain / 1e9;

  // Protein via livestock: protein calories / proteinCaloriesPerKg × grainToProteinRatio / 1e9
  // This is the key Bennett's Law effect: more protein = much more grain
  const proteinGrainMt =
    (proteinCalories / food.proteinCaloriesPerKg) * food.grainToProteinRatio / 1e9;

  const grainEquivalent = directGrainMt + proteinGrainMt;

  return {
    caloriesPerCapita,
    proteinShare,
    grainEquivalent,
  };
}

// =============================================================================
// MODULE DEFINITION
// =============================================================================

type MineralKey = 'copper' | 'lithium' | 'rareEarths' | 'steel';
const MINERAL_KEYS: MineralKey[] = ['copper', 'lithium', 'rareEarths', 'steel'];

export const resourcesModule: Module<
  ResourcesParams,
  ResourcesState,
  ResourcesInputs,
  ResourcesOutputs
> = defineModule({
  name: 'resources',
  description: 'Mineral demand, land use, and forest carbon',

  defaults: resourcesDefaults,

  paramMeta: {
    land: {
      yieldGrowthRate: {
        description: 'Annual agricultural yield improvement from technology.',
        unit: 'fraction/year',
        range: { min: 0.005, max: 0.02, default: 0.01 },
        tier: 1 as const,
      },
    },
  },

  inputs: [
    'additions',
    'population',
    'gdpPerCapita',
    'gdpPerCapita2025',
    'temperature',
    'transportElectrification',
  ] as const,

  outputs: [
    'minerals',
    'land',
    'carbon',
    'food',
    'foodStress',
    'mineralConstraint',
    'miningEnergyTWh',
    'farmingEnergyTWh',
    'totalResourceEnergy',
    'waterStress',
    'waterYieldFactor',
  ] as const,

  validate(params: Partial<ResourcesParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const p = { ...resourcesDefaults, ...params };

    // Validate mineral params
    for (const key of MINERAL_KEYS) {
      const m = p.minerals[key];
      if (m.learningRate < 0 || m.learningRate > 0.2) {
        errors.push(`minerals.${key}.learningRate should be 0-0.2`);
      }
      if (m.recyclingBase < 0 || m.recyclingBase > 1) {
        errors.push(`minerals.${key}.recyclingBase must be 0-1`);
      }
      if (m.recyclingMax < m.recyclingBase) {
        errors.push(`minerals.${key}.recyclingMax must be >= recyclingBase`);
      }
    }

    // Validate land params
    if (p.land.yield2025 <= 0) {
      errors.push('land.yield2025 must be positive');
    }
    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<ResourcesParams>): ResourcesParams {
    return validatedMerge('resources', this.validate, (p) => {
      const result = { ...resourcesDefaults, ...p };

      // Deep merge minerals
      if (p.minerals) {
        result.minerals = { ...resourcesDefaults.minerals };
        for (const key of MINERAL_KEYS) {
          if (p.minerals[key]) {
            result.minerals[key] = {
              ...resourcesDefaults.minerals[key],
              ...p.minerals[key],
            };
          }
        }
      }

      // Deep merge mining
      if (p.mining) {
        result.mining = { ...resourcesDefaults.mining };
        if (p.mining.energyIntensity) {
          result.mining.energyIntensity = { ...resourcesDefaults.mining.energyIntensity, ...p.mining.energyIntensity };
        }
        if (p.mining.depletionExponent !== undefined) {
          result.mining.depletionExponent = p.mining.depletionExponent;
        }
      }

      // Deep merge land
      if (p.land) {
        result.land = { ...resourcesDefaults.land, ...p.land };
      }

      // Deep merge water
      if (p.water) {
        result.water = { ...resourcesDefaults.water, ...p.water };
        if (p.water.regional) {
          result.water.regional = { ...resourcesDefaults.water.regional };
          for (const region of REGIONS) {
            if (p.water.regional[region]) {
              result.water.regional[region] = {
                ...resourcesDefaults.water.regional[region],
                ...p.water.regional[region],
              };
            }
          }
        }
      }

      // Deep merge evBattery
      if (p.evBattery) {
        result.evBattery = { ...resourcesDefaults.evBattery, ...p.evBattery };
      }

      // Deep merge food
      if (p.food) {
        result.food = { ...resourcesDefaults.food, ...p.food };
      }

      return result;
    }, partial);
  },

  init(params: ResourcesParams): ResourcesState {
    // ~40M EVs on the road in 2025 (IEA GEVO 2024)
    const initialEVFleet = 40;
    return {
      minerals: {
        copper: { cumulative: 0, miningCapacity: params.minerals.copper.annualSupply2025 },
        lithium: { cumulative: 0, miningCapacity: params.minerals.lithium.annualSupply2025 },
        rareEarths: { cumulative: 0, miningCapacity: params.minerals.rareEarths.annualSupply2025 },
        steel: { cumulative: 0, miningCapacity: params.minerals.steel.annualSupply2025 },
      },
      land: {
        farmland: params.land.farmland2025,
        urban: params.land.urban2025,
        forest: params.land.forestArea2025,
        desert: params.land.desert2025,
        desertExpansion: 0,
      },
      decayPool: 0,
      cumulativeSequestration: 0,
      prevEVFleetMillions: initialEVFleet,
    };
  },

  step(state, inputs, params, year, yearIndex) {
    const {
      additions,
      population,
      gdpPerCapita,
      gdpPerCapita2025,
      temperature,
      transportElectrification,
    } = inputs;
    const { land, food, evBattery } = params;

    // =========================================================================
    // FOOD (Bennett's Law)
    // =========================================================================
    const foodOutput = calculateFoodDemand(population, gdpPerCapita, yearIndex, food);
    const grainDemand = foodOutput.grainEquivalent;

    // =========================================================================
    // EV BATTERY DEMAND (lithium + copper from transport electrification)
    // =========================================================================
    // Vehicle fleet grows with GDP per capita
    const gdpGrowthRatio = gdpPerCapita2025 > 0 ? gdpPerCapita / gdpPerCapita2025 : 1;
    const vehicleFleetMillions = evBattery.vehicleFleet2025
      * Math.pow(gdpGrowthRatio, evBattery.fleetGDPElasticity);

    const evFleetMillions = vehicleFleetMillions * (transportElectrification ?? 0);

    // Annual new EV batteries = fleet growth + replacement of retiring EVs
    const fleetGrowth = Math.max(0, evFleetMillions - state.prevEVFleetMillions);
    const replacements = evFleetMillions / evBattery.vehicleLifetime;
    const newEVBatteriesMillions = fleetGrowth + replacements;

    // Convert to GWh: millions of vehicles × kWh/vehicle / 1e6 kWh per GWh
    const evBatteryGWh = newEVBatteriesMillions * evBattery.avgBatteryKWh / 1e3;

    // =========================================================================
    // MINERALS
    // =========================================================================
    const mineralOutputs: Record<MineralKey, MineralOutput> = {} as any;
    const newMineralState: Record<MineralKey, MineralState> = {} as any;

    // Track minimum supply ratio across all minerals
    let mineralConstraint = 1.0;

    for (const key of MINERAL_KEYS) {
      const mineral = params.minerals[key];
      const prevCumulative = state.minerals[key].cumulative;
      const prevMiningCapacity = state.minerals[key].miningCapacity;

      // Grid battery + EV battery additions for minerals with perGWh_battery
      const additionsWithEV = { ...additions };
      if (mineral.perGWh_battery) {
        additionsWithEV.battery = (additions.battery ?? 0) + evBatteryGWh;
      }

      const result = calculateMineralDemand(
        mineral,
        additionsWithEV,
        yearIndex,
        prevCumulative
      );

      // Logistic mining capacity growth:
      // capacity grows at maxMiningGrowth but slows as it approaches maxMiningCapacity
      const utilizationFraction = prevMiningCapacity / mineral.maxMiningCapacity;
      const effectiveGrowth = mineral.maxMiningGrowth * Math.max(0, 1 - utilizationFraction);
      const newMiningCapacity = prevMiningCapacity * (1 + effectiveGrowth);

      // Supply ratio: can supply meet gross demand (before recycling)?
      // Net demand (after recycling) is what mining must actually provide
      const supplyRatio = result.demand > 0
        ? Math.min(1, newMiningCapacity / result.demand)
        : 1.0;
      mineralConstraint = Math.min(mineralConstraint, supplyRatio);

      const newCumulative = prevCumulative + result.demand;

      mineralOutputs[key] = {
        demand: result.demand,
        grossDemand: result.grossDemand,
        recycled: result.recycled,
        cumulative: newCumulative,
        recyclingRate: result.recyclingRate,
        reserveRatio: mineral.reserves ? newCumulative / mineral.reserves : 0,
      };

      newMineralState[key] = { cumulative: newCumulative, miningCapacity: newMiningCapacity };
    }

    // =========================================================================
    // LAND
    // =========================================================================

    // Yield with tech improvement and climate damage
    const techYield = land.yield2025 * Math.pow(1 + land.yieldGrowthRate, yearIndex);
    // Schlenker/Roberts yield damage: smooth quadratic below cliff, exponential collapse above
    const excessTemp = Math.max(0, temperature - land.yieldDamageThreshold);
    let yieldDamageFactor: number;
    if (excessTemp <= land.yieldCliffExcess) {
      // Moderate zone: smooth quadratic
      yieldDamageFactor = 1 / (1 + land.yieldDamageCoeff * excessTemp * excessTemp);
    } else {
      // Cliff zone: exponential collapse beyond threshold
      const precliff = 1 / (1 + land.yieldDamageCoeff * land.yieldCliffExcess * land.yieldCliffExcess);
      const cliffDelta = excessTemp - land.yieldCliffExcess;
      yieldDamageFactor = precliff * Math.exp(-land.yieldCliffSteepness * cliffDelta);
    }
    // =========================================================================
    // WATER STRESS (IPCC AR6-calibrated parametric model)
    // =========================================================================
    // Regional water stress grows with warming × vulnerability.
    // Severity increases above 2°C (evapotranspiration + precipitation shifts).
    const { water } = params;
    const warmingAboveBaseline = Math.max(0, temperature - 1.2);
    const severityMultiplier = water.baseSeverity
      + water.severityGrowth * Math.max(0, temperature - 2.0);

    const waterStressOut = {} as Record<Region, number>;
    let globalWaterStress = 0;

    for (const r of REGIONS) {
      const wr = water.regional[r];
      waterStressOut[r] = Math.min(1, wr.vulnerability * warmingAboveBaseline * severityMultiplier);
      globalWaterStress += waterStressOut[r] * wr.farmlandShare;
    }

    // Water yield factor compounds with temperature damage
    const waterYieldFactor = Math.max(0, 1 - globalWaterStress * water.yieldSensitivity);
    const currentYield = techYield * yieldDamageFactor * waterYieldFactor;

    // Farmland = grain demand / yield × non-food multiplier
    // grainDemand is in Mt, yield is t/ha → result in Mha
    const grainFarmland = grainDemand / currentYield;
    const uncappedFarmland = grainFarmland * land.nonFoodMultiplier;

    // Urban land (compute early for land budget)
    const wealthFactor = Math.pow(gdpPerCapita / gdpPerCapita2025, land.urbanWealthElasticity);
    const urban = (population * land.urbanPerCapita * wealthFactor) / 1e6;

    // Climate-driven desertification accumulates path-dependently in state
    // (the previous form recomputed the whole expansion retroactively with
    // the current year's climate factor and then double-counted it on top
    // of the residual desert area)
    const climateExcess = Math.max(0, temperature - 1.5);
    const desertificationFactor = 1 + land.desertificationClimateCoeff * climateExcess;
    const desertExpansion = state.land.desertExpansion +
      (yearIndex > 0 ? land.desert2025 * land.desertificationRate * desertificationFactor : 0);

    // Hard land budget constraint: farmland cannot exceed available land.
    // Desert area (initial + climate-driven expansion) is unavailable, so
    // desertification tightens the cap and can trigger foodStress.
    const availableLand = land.totalLandArea - urban - land.minForestArea
      - (land.desert2025 + desertExpansion);
    const farmland = Math.min(uncappedFarmland, availableLand);
    const foodStress = uncappedFarmland > 0
      ? Math.max(0, 1 - farmland / uncappedFarmland)
      : 0;

    // Forest dynamics. Assumption: when farmland is shrinking (land
    // released), background forest loss halves; when expanding, loss scales
    // up with agricultural pressure
    const landReleased = Math.max(0, land.farmland2025 - farmland);
    const agPressure = Math.max(0, farmland - land.farmland2025) / land.farmland2025;
    const lossMultiplier = landReleased > 0 ? 0.5 : (1 + agPressure);
    const effectiveLossRate = land.forestLossRate * lossMultiplier;

    // Path-dependent: use previous year's forest area from state
    const prevForest = state.land.forest;
    const forestAfterLoss = prevForest * (1 - effectiveLossRate);
    // Only newly released farmland this year contributes to reforestation
    const prevLandReleased = Math.max(0, land.farmland2025 - state.land.farmland);
    const newlyReleased = Math.max(0, landReleased - prevLandReleased);
    const reforestation = newlyReleased * land.reforestationRate;
    // When the farmland cap binds, farmland expands into forest above the
    // protected floor — clip forest so the residual desert never falls below
    // desert2025 + desertExpansion (the area the cap declared unavailable).
    // The ceiling equals minForestArea exactly when the cap binds, and
    // exceeds it otherwise; the resulting forestChange feeds deforestation
    // emissions (farmland expansion = forest clearing).
    const forestCeiling = land.totalLandArea - farmland - urban
      - (land.desert2025 + desertExpansion);
    const forest = Math.min(forestAfterLoss + reforestation, forestCeiling);

    // Desert/barren is the pure residual, so the land identity holds:
    // farmland + urban + forest + desert === totalLandArea
    const desert = Math.max(0, land.totalLandArea - farmland - urban - forest);

    // Forest change
    const forestChange = forest - state.land.forest;

    const landOutput: LandOutput = {
      farmland,
      urban,
      forest,
      desert,
      yield: currentYield,
      yieldDamageFactor,
      forestChange,
    };

    // =========================================================================
    // FOREST CARBON
    // =========================================================================

    // Sequestration from forest growth
    const sequestration = forestChange > 0
      ? (forestChange * 1e6 * land.sequestrationRate) / 1e9
      : 0;

    // Deforestation emissions
    const deforestationArea = forestChange < 0 ? -forestChange : 0;
    const CO2_PER_CARBON = 44 / 12; // molecular weight ratio CO2/C
    const totalCarbonReleased = (deforestationArea * 1e6 * land.forestCarbonDensity * CO2_PER_CARBON) / 1e9;
    const immediateEmissions = totalCarbonReleased * land.deforestationEmissionFactor;
    const deferredEmissions = totalCarbonReleased * (1 - land.deforestationEmissionFactor);

    // Decay pool
    const decayEmissions = state.decayPool * land.decayRate;
    const newDecayPool = state.decayPool + deferredEmissions - decayEmissions;

    // Net flux (positive = emissions, negative = sink)
    const netFlux = immediateEmissions + decayEmissions - sequestration;

    // Cumulative sequestration
    const newCumulativeSequestration = state.cumulativeSequestration + sequestration;

    const carbonOutput: CarbonOutput = {
      sequestration,
      deforestationEmissions: immediateEmissions,
      decayEmissions,
      netFlux,
      cumulativeSequestration: newCumulativeSequestration,
    };

    // =========================================================================
    // ENERGY COSTS FOR MINING AND FARMING
    // =========================================================================
    let miningEnergyTWh = 0;
    for (const key of MINERAL_KEYS) {
      const grossDemandMt = mineralOutputs[key].grossDemand;
      const baseEnergyPerTon = params.mining.energyIntensity[key];
      const reserveRatio = mineralOutputs[key].reserveRatio;
      // Harder to mine as ores deplete
      const depletionMultiplier = 1 / Math.pow(Math.max(0.01, 1 - reserveRatio), params.mining.depletionExponent);
      const miningEnergyGJ = grossDemandMt * baseEnergyPerTon * depletionMultiplier * 1e6;
      miningEnergyTWh += miningEnergyGJ / 3.6e6; // GJ → TWh (1 TWh = 3.6e6 GJ)
    }

    // Farming energy: fertilizer, machinery, irrigation
    const farmingEnergyTWh = farmland * params.land.energyPerHectare * 1e6 / 3.6e6;

    const totalResourceEnergy = miningEnergyTWh + farmingEnergyTWh;

    // =========================================================================
    // UPDATE STATE
    // =========================================================================
    const newState: ResourcesState = {
      minerals: newMineralState,
      land: {
        farmland,
        urban,
        forest,
        desert,
        desertExpansion,
      },
      decayPool: newDecayPool,
      cumulativeSequestration: newCumulativeSequestration,
      prevEVFleetMillions: evFleetMillions,
    };

    return {
      state: newState,
      outputs: {
        minerals: mineralOutputs,
        land: landOutput,
        carbon: carbonOutput,
        food: foodOutput,
        foodStress,
        mineralConstraint,
        miningEnergyTWh,
        farmingEnergyTWh,
        totalResourceEnergy,
        waterStress: waterStressOut,
        waterYieldFactor,
      },
    };
  },
});

/**
 * Resources Module
 *
 * Handles mineral demand, land use, and forest carbon.
 * Minerals are driven by energy capacity additions.
 * Land responds to population, GDP, and climate (yield damage).
 * Forest carbon creates feedback to climate module.
 *
 * Inputs (from other modules):
 * - capacities, additions: From energy module
 * - population, gdpPerCapita: From demographics/demand
 * - temperature: From climate module
 *
 * Outputs (to other modules):
 * - netFlux: Gt CO2/year from land use change (to climate)
 * - minerals, land: Tracking data
 */

import { defineModule, Module } from '../framework/module.js';
import { EnergySource, ValidationResult } from '../framework/types.js';

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

export interface ResourcesParams {
  minerals: {
    copper: MineralParams;
    lithium: MineralParams;
    rareEarths: MineralParams;
    steel: MineralParams;
  };
  land: LandParams;
  food: FoodParams;
}

export const resourcesDefaults: ResourcesParams = {
  minerals: {
    copper: {
      name: 'Copper',
      perMW_solar: 2800,
      perMW_wind: 3500,
      perGWh_battery: 800,
      learningRate: 0.02,
      reserves: 880,
      recyclingBase: 0.15,
      recyclingMax: 0.50,
      recyclingHalfway: 500,
    },
    lithium: {
      name: 'Lithium',
      perGWh_battery: 600,
      learningRate: 0.03,
      reserves: 22,
      recyclingBase: 0.05,
      recyclingMax: 0.30,
      recyclingHalfway: 20,
    },
    rareEarths: {
      name: 'Rare Earths',
      perMW_wind: 200,
      learningRate: 0.01,
      reserves: 130,
      recyclingBase: 0.01,
      recyclingMax: 0.20,
      recyclingHalfway: 10,
    },
    steel: {
      name: 'Steel',
      perMW_solar: 35000,
      perMW_wind: 120000,
      perMW_nuclear: 60000,
      learningRate: 0.01,
      reserves: null, // Effectively unlimited
      recyclingBase: 0.35,
      recyclingMax: 0.70,
      recyclingHalfway: 5000,
    },
  },
  land: {
    farmland2025: 4800,
    yieldGrowthRate: 0.01,
    yield2025: 4.0,
    nonFoodMultiplier: 4.9,

    urbanPerCapita: 0.04,
    urban2025: 50,
    urbanWealthElasticity: 0.3,

    forestArea2025: 4000,
    forestLossRate: 0.002,
    reforestationRate: 0.5,

    totalLandArea: 13000,
    desert2025: 4150,
    desertificationRate: 0.001,
    desertificationClimateCoeff: 0.002,

    forestCarbonDensity: 150,
    sequestrationRate: 7.5,
    deforestationEmissionFactor: 0.5,
    decayRate: 0.05,

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
};

// =============================================================================
// STATE
// =============================================================================

export interface MineralState {
  cumulative: number;  // Mt total extracted
}

export interface LandState {
  farmland: number;    // Mha
  urban: number;       // Mha
  forest: number;      // Mha
  desert: number;      // Mha
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
}

// =============================================================================
// INPUTS / OUTPUTS
// =============================================================================

export interface ResourcesInputs {
  /** Installed capacity by source (GW, GWh for battery) */
  capacities: Record<EnergySource, number>;

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

  inputs: [
    'capacities',
    'additions',
    'population',
    'gdpPerCapita',
    'gdpPerCapita2025',
    'temperature',
  ] as const,

  outputs: [
    'minerals',
    'land',
    'carbon',
    'food',
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
    if (p.land.yieldDamageThreshold < 0) {
      errors.push('land.yieldDamageThreshold must be non-negative');
    }

    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial: Partial<ResourcesParams>): ResourcesParams {
    const result = { ...resourcesDefaults, ...partial };

    // Deep merge minerals
    if (partial.minerals) {
      result.minerals = { ...resourcesDefaults.minerals };
      for (const key of MINERAL_KEYS) {
        if (partial.minerals[key]) {
          result.minerals[key] = {
            ...resourcesDefaults.minerals[key],
            ...partial.minerals[key],
          };
        }
      }
    }

    // Deep merge land
    if (partial.land) {
      result.land = { ...resourcesDefaults.land, ...partial.land };
    }

    return result;
  },

  init(params: ResourcesParams): ResourcesState {
    return {
      minerals: {
        copper: { cumulative: 0 },
        lithium: { cumulative: 0 },
        rareEarths: { cumulative: 0 },
        steel: { cumulative: 0 },
      },
      land: {
        farmland: params.land.farmland2025,
        urban: params.land.urban2025,
        forest: params.land.forestArea2025,
        desert: params.land.desert2025,
      },
      decayPool: 0,
      cumulativeSequestration: 0,
    };
  },

  step(state, inputs, params, year, yearIndex) {
    const {
      additions,
      population,
      gdpPerCapita,
      gdpPerCapita2025,
      temperature,
    } = inputs;
    const { land, food } = params;

    // =========================================================================
    // FOOD (Bennett's Law)
    // =========================================================================
    const foodOutput = calculateFoodDemand(population, gdpPerCapita, yearIndex, food);
    const grainDemand = foodOutput.grainEquivalent;

    // =========================================================================
    // MINERALS
    // =========================================================================
    const mineralOutputs: Record<MineralKey, MineralOutput> = {} as any;
    const newMineralState: Record<MineralKey, MineralState> = {} as any;

    for (const key of MINERAL_KEYS) {
      const mineral = params.minerals[key];
      const prevCumulative = state.minerals[key].cumulative;

      const result = calculateMineralDemand(
        mineral,
        additions,
        yearIndex,
        prevCumulative
      );

      const newCumulative = prevCumulative + result.demand;

      mineralOutputs[key] = {
        demand: result.demand,
        grossDemand: result.grossDemand,
        recycled: result.recycled,
        cumulative: newCumulative,
        recyclingRate: result.recyclingRate,
        reserveRatio: mineral.reserves ? newCumulative / mineral.reserves : 0,
      };

      newMineralState[key] = { cumulative: newCumulative };
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
    const currentYield = techYield * yieldDamageFactor;

    // Farmland = grain demand / yield × non-food multiplier
    // grainDemand is in Mt, yield is t/ha → result in Mha
    const grainFarmland = grainDemand / currentYield;
    const farmland = grainFarmland * land.nonFoodMultiplier;

    // Urban land
    const wealthFactor = Math.pow(gdpPerCapita / gdpPerCapita2025, land.urbanWealthElasticity);
    const urban = (population * land.urbanPerCapita * wealthFactor) / 1e6;

    // Forest dynamics
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
    const forest = forestAfterLoss + reforestation;

    // Desert/barren
    const climateExcess = Math.max(0, temperature - 1.5);
    const desertificationFactor = 1 + land.desertificationClimateCoeff * climateExcess;
    const baseDesert = land.totalLandArea - farmland - urban - forest;
    const climateDrivenExpansion = yearIndex > 0
      ? land.desert2025 * land.desertificationRate * desertificationFactor * yearIndex
      : 0;
    const desert = Math.max(0, baseDesert + climateDrivenExpansion);

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
    const totalCarbonReleased = (deforestationArea * 1e6 * land.forestCarbonDensity * 3.67) / 1e9;
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
    // UPDATE STATE
    // =========================================================================
    const newState: ResourcesState = {
      minerals: newMineralState,
      land: {
        farmland,
        urban,
        forest,
        desert,
      },
      decayPool: newDecayPool,
      cumulativeSequestration: newCumulativeSequestration,
    };

    return {
      state: newState,
      outputs: {
        minerals: mineralOutputs,
        land: landOutput,
        carbon: carbonOutput,
        food: foodOutput,
      },
    };
  },
});

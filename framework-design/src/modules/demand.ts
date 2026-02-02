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
 * GDP growth equation:
 *   growthRate = TFP + 0.65 × laborGrowth + demographicAdj
 *
 * Where:
 * - TFP decays over time (catch-up growth fades)
 * - laborGrowth uses effective workers (education-weighted)
 * - demographicAdj penalizes high dependency ratios
 */

import { REGIONS, Region, ModuleDefinition } from '../framework/types.js';

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

interface DemandParams {
  // Regional economic parameters
  regions: Record<Region, RegionalEconomicParams>;

  // Global demand parameters
  electrification2025: number;    // Current electricity share (IEA: 25%)
  electrificationTarget: number;  // 2050+ target (IEA Net Zero: 65%)
  electrificationSpeed: number;   // Logistic convergence rate
  demographicFactor: number;      // Dependency ratio impact on growth

  // Optional efficiency multiplier (slider)
  efficiencyMultiplier: number;
}

interface RegionalState {
  gdp: number;        // Current GDP ($ trillions)
  intensity: number;  // Current energy intensity (MWh/$1000)
}

interface DemandState {
  regions: Record<Region, RegionalState>;
  baselineDependency: number;  // Year 0 dependency for adjustment
}

// Inputs from demographics module
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

  // Optional damage fractions for GDP feedback
  regionalDamages?: Record<Region, number>;
  energyBurdenDamage?: number;
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

interface DemandOutputs {
  // Regional outputs
  regional: Record<Region, RegionalOutputs>;

  // Global aggregates
  gdp: number;                  // $ trillions (global)
  electricityDemand: number;    // TWh (global)
  electrificationRate: number;  // Fraction (0-1)
  totalFinalEnergy: number;     // TWh (global)
  nonElectricEnergy: number;    // TWh (global)
  gdpPerWorking: number;        // $ per person (global)
  electricityPerWorking: number; // kWh per person (global)
  finalEnergyPerCapitaDay: number; // kWh/person/day
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
      tfpGrowth: 0.015,         // 1.5% baseline TFP
      tfpDecay: 0.0,            // Mature economy - no convergence
      energyIntensity: 0.70,    // MWh per $1000 GDP (IEA-calibrated)
      intensityDecline: 0.003,  // 0.3%/year
    },
    china: {
      gdp2025: 18,              // $18T (World Bank)
      tfpGrowth: 0.035,         // 3.5% catch-up growth
      tfpDecay: 0.015,          // Converging toward OECD
      energyIntensity: 2.04,    // High - industrial economy
      intensityDecline: 0.008,  // 0.8%/year
    },
    em: {
      gdp2025: 35,              // $35T (India, Brazil, Indonesia, etc.)
      tfpGrowth: 0.025,         // 2.5% baseline
      tfpDecay: 0.008,          // Slow convergence
      energyIntensity: 0.93,    // Mixed economies
      intensityDecline: 0.005,  // 0.5%/year
    },
    row: {
      gdp2025: 8,               // $8T (Africa, etc.)
      tfpGrowth: 0.030,         // 3.0% demographic dividend
      tfpDecay: 0.010,          // Gradual convergence
      energyIntensity: 1.53,    // Lower efficiency
      intensityDecline: 0.004,  // 0.4%/year
    },
  },

  // Global parameters
  electrification2025: 0.25,    // Current electricity share (IEA)
  electrificationTarget: 0.65,  // 2050+ target (IEA Net Zero)
  electrificationSpeed: 0.08,   // Convergence rate
  demographicFactor: 0.015,     // Dependency ratio impact on growth

  efficiencyMultiplier: 1.0,    // Default: no adjustment
};

// =============================================================================
// MODULE DEFINITION
// =============================================================================

export const demandModule: ModuleDefinition<
  DemandParams,
  DemandState,
  DemandInputs,
  DemandOutputs
> = {
  name: 'demand',

  inputs: [
    'regionalPopulation',
    'regionalWorking',
    'regionalEffectiveWorkers',
    'regionalDependency',
    'population',
    'working',
    'dependency',
  ] as const,

  outputs: [
    'gdp',
    'electricityDemand',
    'electrificationRate',
    'totalFinalEnergy',
    'nonElectricEnergy',
    'gdpPerWorking',
    'electricityPerWorking',
    'finalEnergyPerCapitaDay',
    'regional',
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
    const merged = { ...demandDefaults };

    // Merge regions
    if (partial.regions) {
      merged.regions = { ...demandDefaults.regions };
      for (const region of REGIONS) {
        if (partial.regions[region]) {
          merged.regions[region] = {
            ...demandDefaults.regions[region],
            ...partial.regions[region],
          };
        }
      }
    }

    // Merge scalar params
    if (partial.electrification2025 !== undefined) merged.electrification2025 = partial.electrification2025;
    if (partial.electrificationTarget !== undefined) merged.electrificationTarget = partial.electrificationTarget;
    if (partial.electrificationSpeed !== undefined) merged.electrificationSpeed = partial.electrificationSpeed;
    if (partial.demographicFactor !== undefined) merged.demographicFactor = partial.demographicFactor;
    if (partial.efficiencyMultiplier !== undefined) merged.efficiencyMultiplier = partial.efficiencyMultiplier;

    return merged;
  },

  init(params: DemandParams): DemandState {
    const regions = {} as Record<Region, RegionalState>;

    for (const region of REGIONS) {
      const r = params.regions[region];
      regions[region] = {
        gdp: r.gdp2025,
        intensity: r.energyIntensity,
      };
    }

    return {
      regions,
      baselineDependency: 0, // Will be set on first step
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

    // Calculate global electrification rate (exponential convergence)
    const electrificationRate =
      params.electrificationTarget -
      (params.electrificationTarget - params.electrification2025) *
      Math.exp(-params.electrificationSpeed * t);

    // Process each region
    const newRegions = {} as Record<Region, RegionalState>;
    const regionalOutputs = {} as Record<Region, RegionalOutputs>;

    let globalGdp = 0;
    let globalElec = 0;
    let globalWorking = 0;
    let globalTotalFinal = 0;
    let globalNonElec = 0;

    for (const region of REGIONS) {
      const regionParams = params.regions[region];
      const currentState = state.regions[region];

      // Get demographics for this region
      const working = inputs.regionalWorking[region];
      const workingPrev = working; // TODO: track previous for growth calc
      const effective = inputs.regionalEffectiveWorkers[region];
      const dependency = inputs.regionalDependency[region];

      // Calculate labor growth using effective workers
      // For now, approximate from year index (proper tracking would need prior state)
      const laborGrowth = yearIndex > 0 ? 0.01 : 0; // Placeholder - ideally track effective workers

      // Demographic adjustment (Fernández-Villaverde)
      // Higher dependency = lower growth
      const demographicAdj = params.demographicFactor * (baselineDependency - dependency);

      // TFP with decay (catch-up growth fades)
      const tfp = regionParams.tfpGrowth * Math.pow(1 - regionParams.tfpDecay, t);

      // Total growth rate: TFP + labor contribution + demographic adjustment
      // Labor share (1 - α) ≈ 0.65
      const growthRate = tfp + 0.65 * laborGrowth + demographicAdj;

      // Update GDP
      let newGdp = currentState.gdp;
      if (yearIndex > 0) {
        // Apply optional damage feedback
        const damageFraction = inputs.regionalDamages?.[region] ?? 0;
        const persistentDamage = damageFraction * 0.25; // 25% of damages permanent
        const burdenDamage = inputs.energyBurdenDamage ?? 0;
        const persistentBurden = burdenDamage * 0.25;

        newGdp = currentState.gdp * (1 + growthRate) * (1 - persistentDamage) * (1 - persistentBurden);
      }

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
      const gdpPerWorking = (newGdp * 1e12) / working;      // $ per person
      const elecPerWorking = (elecDemand * 1e9) / working;  // kWh per person

      // Store new state
      newRegions[region] = {
        gdp: newGdp,
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
      globalGdp += newGdp;
      globalElec += elecDemand;
      globalWorking += working;
      globalTotalFinal += totalEnergy;
      globalNonElec += nonElecEnergy;
    }

    // Calculate final energy per capita per day
    // TWh × 1e9 kWh/TWh / population / 365 days
    const finalEnergyPerCapitaDay = (globalTotalFinal * 1e9 / inputs.population) / 365;

    return {
      state: {
        regions: newRegions,
        baselineDependency,
      },
      outputs: {
        regional: regionalOutputs,
        gdp: globalGdp,
        electricityDemand: globalElec,
        electrificationRate,
        totalFinalEnergy: globalTotalFinal,
        nonElectricEnergy: globalNonElec,
        gdpPerWorking: (globalGdp * 1e12) / globalWorking,
        electricityPerWorking: (globalElec * 1e9) / globalWorking,
        finalEnergyPerCapitaDay,
      },
    };
  },
};

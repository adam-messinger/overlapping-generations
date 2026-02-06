/**
 * Simulation Runner
 *
 * Wires all modules together and runs the full 2025-2100 simulation.
 * Handles module dependencies, state management, and result collection.
 *
 * Module dependency graph:
 *   demographics (no inputs)
 *        ↓
 *      demand ← demographics
 *        ↓
 *      capital ← demographics, demand
 *        ↓
 *      energy ← demand, capital
 *        ↓
 *      dispatch ← demand, energy
 *        ↓
 *      resources ← energy, demographics, demand, climate (lagged)
 *        ↓
 *      climate ← dispatch, resources (land use carbon)
 *        ↓
 *      (damages feed back to demand, capital for next year)
 */

import { demographicsModule, DemographicsParams } from './modules/demographics.js';
import { ProductionParams } from './modules/production.js';
import { demandModule, DemandParams } from './modules/demand.js';
import { capitalModule, CapitalParams } from './modules/capital.js';
import { energyModule, EnergyParams } from './modules/energy.js';
import { dispatchModule, DispatchParams } from './modules/dispatch.js';
import { expansionModule, ExpansionParams } from './modules/expansion.js';
import { resourcesModule, ResourcesParams } from './modules/resources.js';
import { climateModule, ClimateParams } from './modules/climate.js';
import { Region, REGIONS, EnergySource } from './framework/types.js';
import { runAutowiredFull } from './simulation-autowired.js';

// =============================================================================
// TYPES
// =============================================================================

export interface SimulationParams {
  startYear?: number;
  endYear?: number;
  demographics?: Partial<DemographicsParams>;
  production?: Partial<ProductionParams>;
  demand?: Partial<DemandParams>;
  capital?: Partial<CapitalParams>;
  energy?: Partial<EnergyParams>;
  dispatch?: Partial<DispatchParams>;
  expansion?: Partial<ExpansionParams>;
  resources?: Partial<ResourcesParams>;
  climate?: Partial<ClimateParams>;
}

export interface YearResult {
  year: number;

  // Demographics
  population: number;
  working: number;
  dependency: number;
  effectiveWorkers: number;
  collegeShare: number;

  // Demand
  capitalElasticity: number;
  gdp: number;
  electricityDemand: number;
  electrificationRate: number;
  totalFinalEnergy: number;
  nonElectricEnergy: number;
  finalEnergyPerCapitaDay: number;

  // Sectors
  transportElectrification: number;
  buildingsElectrification: number;
  industryElectrification: number;

  // Fuels (TWh)
  oilConsumption: number;
  gasConsumption: number;
  coalConsumption: number;
  hydrogenConsumption: number;

  // Non-electric emissions (Gt CO2/year)
  nonElectricEmissions: number;

  // Energy burden
  totalEnergyCost: number;    // $ trillions
  energyBurden: number;       // Fraction of GDP
  burdenDamage: number;       // GDP damage fraction

  // Capital
  capitalStock: number;
  investment: number;
  savingsRate: number;
  stability: number;
  interestRate: number;
  robotsDensity: number;
  automationShare: number;
  capitalOutputRatio: number;
  capitalGrowthRate: number;

  // Energy
  lcoes: Record<EnergySource, number>;
  capacities: Record<EnergySource, number>;
  solarLCOE: number;
  windLCOE: number;
  batteryCost: number;
  cheapestLCOE: number;
  solarPlusBatteryLCOE: number;

  // Dispatch
  generation: Record<string, number>;
  gridIntensity: number;
  totalGeneration: number;
  shortfall: number;
  electricityEmissions: number;
  fossilShare: number;
  curtailmentTWh: number;
  curtailmentRate: number;

  // Climate
  temperature: number;
  co2ppm: number;
  equilibriumTemp: number;
  damages: number;
  cumulativeEmissions: number;

  // Resources - Minerals
  copperDemand: number;
  lithiumDemand: number;
  copperCumulative: number;
  lithiumCumulative: number;

  // Resources - Land
  farmland: number;
  forest: number;
  desert: number;
  yieldDamageFactor: number;

  // Resources - Food (Bennett's Law)
  proteinShare: number;          // Fraction of calories from protein
  grainEquivalent: number;       // Mt grain needed (direct + feed)
  foodStress: number;            // 0-1, fraction of food demand unmet (land cap)

  // Resources - Carbon
  forestNetFlux: number;
  cumulativeSequestration: number;

  // Production (biophysical)
  productionGdp: number;
  usefulEnergyProduction: number;

  // G/C Expansion
  robotLoadTWh: number;
  expansionMultiplier: number;
  adjustedDemand: number;
  robotsPer1000: number;

  // Regional
  regionalPopulation: Record<Region, number>;
  regionalGdp: Record<Region, number>;

  // Regional Energy (v2)
  regionalCapacities: Record<Region, Record<EnergySource, number>>;
  regionalAdditions: Record<Region, Record<EnergySource, number>>;

  // Regional Dispatch (v2)
  regionalGeneration: Record<Region, Record<string, number>>;
  regionalGridIntensity: Record<Region, number>;
  regionalFossilShare: Record<Region, number>;
  regionalEmissions: Record<Region, number>;
}

export interface SimulationResult {
  years: number[];
  results: YearResult[];
  metrics: SimulationMetrics;
}

export interface SimulationMetrics {
  // Population
  peakPopulation: number;
  peakPopulationYear: number;
  population2100: number;

  // Climate
  warming2050: number;
  warming2100: number;
  peakEmissions: number;
  peakEmissionsYear: number;

  // Energy
  solarCrossoverYear: number | null;  // Year solar beats gas
  gridBelow100Year: number | null;    // Year grid intensity < 100 kg/MWh
  fossilShareFinal: number;

  // Economy
  gdp2050: number;
  gdp2100: number;
  kY2050: number;  // Capital-output ratio
}

// =============================================================================
// SIMULATION CLASS
// =============================================================================

export class Simulation {
  private params: SimulationParams;
  private startYear: number;
  private endYear: number;

  // Module params
  private demoParams: DemographicsParams;
  private demandParams: DemandParams;
  private capitalParams: CapitalParams;
  private energyParams: EnergyParams;
  private dispatchParams: DispatchParams;
  private expansionParams: ExpansionParams;
  private resourcesParams: ResourcesParams;
  private climateParams: ClimateParams;

  constructor(params: SimulationParams = {}) {
    this.params = params;
    this.startYear = params.startYear ?? 2025;
    this.endYear = params.endYear ?? 2100;

    // Merge params with defaults
    this.demoParams = demographicsModule.mergeParams(params.demographics ?? {});
    this.demandParams = demandModule.mergeParams(params.demand ?? {});
    this.capitalParams = capitalModule.mergeParams(params.capital ?? {});
    this.energyParams = energyModule.mergeParams(params.energy ?? {});
    this.dispatchParams = dispatchModule.mergeParams(params.dispatch ?? {});
    this.expansionParams = expansionModule.mergeParams(params.expansion ?? {});
    this.resourcesParams = resourcesModule.mergeParams(params.resources ?? {});
    this.climateParams = climateModule.mergeParams(params.climate ?? {});
  }

  /**
   * Validate all module parameters
   */
  validate(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const modules = [
      { name: 'demographics', result: demographicsModule.validate(this.demoParams) },
      { name: 'demand', result: demandModule.validate(this.demandParams) },
      { name: 'capital', result: capitalModule.validate(this.capitalParams) },
      { name: 'energy', result: energyModule.validate(this.energyParams) },
      { name: 'dispatch', result: dispatchModule.validate(this.dispatchParams) },
      { name: 'expansion', result: expansionModule.validate(this.expansionParams) },
      { name: 'resources', result: resourcesModule.validate(this.resourcesParams) },
      { name: 'climate', result: climateModule.validate(this.climateParams) },
    ];

    for (const { name, result } of modules) {
      for (const e of result.errors) {
        errors.push(`${name}: ${e}`);
      }
      for (const w of result.warnings) {
        warnings.push(`${name}: ${w}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Run the full simulation
   */
  run(): SimulationResult {
    const years: number[] = [];
    const results: YearResult[] = [];

    // Initialize all module states
    let demoState = demographicsModule.init(this.demoParams);
    let demandState = demandModule.init(this.demandParams);
    let capitalState = capitalModule.init(this.capitalParams);
    let energyState = energyModule.init(this.energyParams);
    let dispatchState = dispatchModule.init(this.dispatchParams);
    let expansionState = expansionModule.init(this.expansionParams);
    let resourcesState = resourcesModule.init(this.resourcesParams);
    let climateState = climateModule.init(this.climateParams);

    // Track lagged values for feedback loops
    let laggedDamages: Record<Region, number> = { oecd: 0, china: 0, em: 0, row: 0 };
    let laggedBurdenDamage = 0;
    let laggedTemperature = 1.2; // Initial temperature for resources
    let laggedAvgLCOE = 50; // Initial LCOE for cost-driven electrification ($/MWh)
    let laggedNetEnergyFactor = 1; // Initial net energy factor for investment
    let laggedCapitalGrowthRate = 0; // Initial capital growth rate for Solow feedback
    let gdpPerCapita2025 = 0; // Will be set in first year

    for (let year = this.startYear; year <= this.endYear; year++) {
      const yearIndex = year - this.startYear;
      years.push(year);

      // =======================================================================
      // Step 1: Demographics (no inputs)
      // =======================================================================
      const demoResult = demographicsModule.step(
        demoState,
        {},
        this.demoParams,
        year,
        yearIndex
      );
      demoState = demoResult.state;
      const demo = demoResult.outputs;

      // =======================================================================
      // Step 2: Demand (needs demographics, lagged damages)
      // =======================================================================
      const demandInputs = {
        regionalPopulation: demo.regionalPopulation,
        regionalWorking: demo.regionalWorking,
        regionalEffectiveWorkers: demo.regionalEffectiveWorkers,
        regionalDependency: demo.regionalDependency,
        population: demo.population,
        working: demo.working,
        dependency: demo.dependency,
        regionalDamages: laggedDamages,
        energyBurdenDamage: laggedBurdenDamage,
        laggedAvgLCOE, // For cost-driven electrification
        carbonPrice: this.energyParams.carbonPrice, // Pass carbon price for fuel cost calc
        capitalGrowthRate: laggedCapitalGrowthRate, // Solow capital contribution
      };
      const demandResult = demandModule.step(
        demandState,
        demandInputs,
        this.demandParams,
        year,
        yearIndex
      );
      demandState = demandResult.state;
      const demand = demandResult.outputs;

      // =======================================================================
      // Step 3: Capital (needs demographics, demand, lagged damages)
      // =======================================================================
      // Compute GDP-weighted average of regional damages
      const regionalGdpValues: Record<Region, number> = {
        oecd: demand.regional.oecd.gdp,
        china: demand.regional.china.gdp,
        em: demand.regional.em.gdp,
        row: demand.regional.row.gdp,
      };
      const totalRegionalGdp = REGIONS.reduce((sum, r) => sum + regionalGdpValues[r], 0);
      const globalDamage = totalRegionalGdp > 0
        ? REGIONS.reduce((sum, r) => sum + laggedDamages[r] * regionalGdpValues[r], 0) / totalRegionalGdp
        : 0;

      const capitalInputs = {
        regionalYoung: demo.regionalYoung,
        regionalWorking: demo.regionalWorking,
        regionalOld: demo.regionalOld,
        regionalPopulation: demo.regionalPopulation,
        effectiveWorkers: demo.effectiveWorkers,
        gdp: demand.gdp,
        damages: globalDamage,
        netEnergyFactor: laggedNetEnergyFactor,
      };
      const capitalResult = capitalModule.step(
        capitalState,
        capitalInputs,
        this.capitalParams,
        year,
        yearIndex
      );
      capitalState = capitalResult.state;
      const capital = capitalResult.outputs;

      // Update lagged capital growth rate for next year's Solow feedback
      laggedCapitalGrowthRate = capital.capitalGrowthRate;

      // =======================================================================
      // Step 4: Energy (needs demand, capital)
      // =======================================================================

      // Compute regional electricity demand from demand module
      const regionalElectricityDemand: Record<Region, number> = {
        oecd: demand.regional.oecd.electricityDemand,
        china: demand.regional.china.electricityDemand,
        em: demand.regional.em.electricityDemand,
        row: demand.regional.row.electricityDemand,
      };

      // Compute regional investment from capital's regional savings
      const totalSavings = Object.values(capital.regionalSavings).reduce((a, b) => a + b, 0);
      const regionalInvestment: Record<Region, number> = {} as Record<Region, number>;
      for (const region of REGIONS) {
        regionalInvestment[region] = totalSavings > 0
          ? capital.investment * (capital.regionalSavings[region] / totalSavings)
          : capital.investment / 4;
      }

      const energyInputs = {
        electricityDemand: demand.electricityDemand,
        regionalElectricityDemand,
        availableInvestment: capital.investment,
        regionalInvestment,
        stabilityFactor: capital.stability,
      };
      const energyResult = energyModule.step(
        energyState,
        energyInputs,
        this.energyParams,
        year,
        yearIndex
      );
      energyState = energyResult.state;
      const energy = energyResult.outputs;

      // =======================================================================
      // Step 5: G/C Expansion (needs demand, energy, demographics, capital)
      // =======================================================================
      // Find cheapest LCOE (for cost expansion calculation)
      const cheapestLCOE = Math.min(...Object.values(energy.lcoes));

      const expansionInputs = {
        baseDemand: demand.electricityDemand,
        cheapestLCOE,
        workingPopulation: demo.working,
        investmentRate: capital.savingsRate, // Use savings as proxy for investment capacity
      };
      const expansionResult = expansionModule.step(
        expansionState,
        expansionInputs,
        this.expansionParams,
        year,
        yearIndex
      );
      expansionState = expansionResult.state;
      const expansion = expansionResult.outputs;

      // =======================================================================
      // Step 6: Dispatch (uses adjusted demand from expansion)
      // =======================================================================

      // Scale regional demand by expansion factor
      const expansionFactor = demand.electricityDemand > 0
        ? expansion.adjustedDemand / demand.electricityDemand
        : 1.0;
      const regionalAdjustedDemand: Record<Region, number> = {} as Record<Region, number>;
      for (const region of REGIONS) {
        regionalAdjustedDemand[region] = regionalElectricityDemand[region] * expansionFactor;
      }

      // Get regional carbon prices from energy params
      const regionalCarbonPrice: Record<Region, number> = {} as Record<Region, number>;
      for (const region of REGIONS) {
        regionalCarbonPrice[region] = this.energyParams.regional[region].carbonPrice;
      }

      const dispatchInputs = {
        electricityDemand: expansion.adjustedDemand, // Use expanded demand
        regionalElectricityDemand: regionalAdjustedDemand,
        capacities: energy.capacities,
        regionalCapacities: energy.regionalCapacities,
        lcoes: energy.lcoes,
        solarPlusBatteryLCOE: energy.solarPlusBatteryLCOE,
        carbonPrice: this.energyParams.carbonPrice,
        regionalCarbonPrice,
      };
      const dispatchResult = dispatchModule.step(
        dispatchState,
        dispatchInputs,
        this.dispatchParams,
        year,
        yearIndex
      );
      dispatchState = dispatchResult.state;
      const dispatch = dispatchResult.outputs;

      // =======================================================================
      // Update net energy factor (lagged to next year)
      // =======================================================================
      let grossElectricity = 0;
      let netElectricity = 0;
      for (const [source, gen] of Object.entries(dispatch.generation)) {
        const generation = gen ?? 0;
        if (generation <= 0) continue;
        let energySource: EnergySource;
        if (source === 'solarPlusBattery') {
          energySource = 'solar';
        } else {
          energySource = source as EnergySource;
        }
        const fraction = energy.netEnergyFraction[energySource] ?? 1;
        grossElectricity += generation;
        netElectricity += generation * fraction;
      }
      const netEnergyFactor = grossElectricity > 0 ? netElectricity / grossElectricity : 1;
      laggedNetEnergyFactor = Math.max(0, Math.min(1, netEnergyFactor));

      // =======================================================================
      // Step 7: Resources (needs energy, demographics, demand, lagged temperature)
      // =======================================================================
      // Calculate GDP per capita for land use calculations
      const gdpPerCapita = (demand.gdp * 1e12) / demo.population;
      if (yearIndex === 0) {
        gdpPerCapita2025 = gdpPerCapita;
      }

      // Resources module now calculates grain demand internally via Bennett's Law
      const resourcesInputs = {
        capacities: energy.capacities,
        additions: energy.additions,
        population: demo.population,
        gdpPerCapita,
        gdpPerCapita2025,
        temperature: laggedTemperature,
      };
      const resourcesResult = resourcesModule.step(
        resourcesState,
        resourcesInputs,
        this.resourcesParams,
        year,
        yearIndex
      );
      resourcesState = resourcesResult.state;
      const resources = resourcesResult.outputs;

      // =======================================================================
      // Step 8: Climate (needs emissions from dispatch + land use)
      // =======================================================================
      // Total emissions = electricity + non-electric (fuel-based) + land use change
      const landUseEmissions = resources.carbon.netFlux; // Can be negative (sink)
      const totalEmissions = dispatch.electricityEmissions + demand.nonElectricEmissions + landUseEmissions;

      const climateInputs = {
        emissions: totalEmissions,
      };
      const climateResult = climateModule.step(
        climateState,
        climateInputs,
        this.climateParams,
        year,
        yearIndex
      );
      climateState = climateResult.state;
      const climate = climateResult.outputs;

      // =======================================================================
      // Step 9: Energy Burden (from demand module)
      // =======================================================================
      // Use the demand module's burden calculation (uses proper params)
      const totalEnergyCost = demand.totalEnergyCost;
      const energyBurden = demand.energyBurden;
      const burdenDamage = demand.burdenDamage;

      // Compute generation-weighted LCOE for lagged feedback
      let totalGeneration = 0;
      let weightedLCOE = 0;
      for (const source of Object.keys(dispatch.generation) as Array<keyof typeof dispatch.generation>) {
        const gen = dispatch.generation[source];
        totalGeneration += gen;
        weightedLCOE += gen * (energy.lcoes[source as keyof typeof energy.lcoes] ?? 50);
      }
      weightedLCOE = totalGeneration > 0 ? weightedLCOE / totalGeneration : 50;

      // =======================================================================
      // Update lagged values for next year's feedback
      // =======================================================================
      laggedDamages = climate.regionalDamages;
      laggedTemperature = climate.temperature;
      laggedBurdenDamage = burdenDamage;
      laggedAvgLCOE = totalGeneration > 0 ? weightedLCOE : laggedAvgLCOE; // For cost-driven elec

      // =======================================================================
      // Collect results
      // =======================================================================
      const regionalGdp: Record<Region, number> = {
        oecd: demand.regional.oecd.gdp,
        china: demand.regional.china.gdp,
        em: demand.regional.em.gdp,
        row: demand.regional.row.gdp,
      };

      results.push({
        year,

        // Demographics
        population: demo.population,
        working: demo.working,
        dependency: demo.dependency,
        effectiveWorkers: demo.effectiveWorkers,
        collegeShare: demo.collegeShare,

        // Demand
        capitalElasticity: this.demandParams.capitalElasticity,
        gdp: demand.gdp,
        electricityDemand: demand.electricityDemand,
        electrificationRate: demand.electrificationRate,
        totalFinalEnergy: demand.totalFinalEnergy,
        nonElectricEnergy: demand.nonElectricEnergy,
        finalEnergyPerCapitaDay: demand.finalEnergyPerCapitaDay,

        // Sectors
        transportElectrification: demand.sectors.transport.electrificationRate,
        buildingsElectrification: demand.sectors.buildings.electrificationRate,
        industryElectrification: demand.sectors.industry.electrificationRate,

        // Fuels
        oilConsumption: demand.fuels.oil,
        gasConsumption: demand.fuels.gas,
        coalConsumption: demand.fuels.coal,
        hydrogenConsumption: demand.fuels.hydrogen,

        // Non-electric emissions
        nonElectricEmissions: demand.nonElectricEmissions,

        // Energy burden
        totalEnergyCost,
        energyBurden,
        burdenDamage,

        // Capital
        capitalStock: capital.stock,
        investment: capital.investment,
        savingsRate: capital.savingsRate,
        stability: capital.stability,
        interestRate: capital.interestRate,
        robotsDensity: capital.robotsDensity,
        automationShare: capital.automationShare,
        capitalOutputRatio: capital.capitalOutputRatio,
        capitalGrowthRate: capital.capitalGrowthRate,

        // Energy
        lcoes: energy.lcoes,
        capacities: energy.capacities,
        solarLCOE: energy.lcoes.solar,
        windLCOE: energy.lcoes.wind,
        batteryCost: energy.batteryCost,
        cheapestLCOE: energy.cheapestLCOE,
        solarPlusBatteryLCOE: energy.solarPlusBatteryLCOE,

        // Dispatch
        generation: dispatch.generation,
        gridIntensity: dispatch.gridIntensity,
        totalGeneration: dispatch.totalGeneration,
        shortfall: dispatch.shortfall,
        electricityEmissions: dispatch.electricityEmissions,
        fossilShare: dispatch.fossilShare,
        curtailmentTWh: dispatch.curtailmentTWh,
        curtailmentRate: dispatch.curtailmentRate,

        // Climate
        temperature: climate.temperature,
        co2ppm: climate.co2ppm,
        equilibriumTemp: climate.equilibriumTemp,
        damages: climate.damages,
        cumulativeEmissions: climate.cumulativeEmissions,

        // Resources - Minerals
        copperDemand: resources.minerals.copper.demand,
        lithiumDemand: resources.minerals.lithium.demand,
        copperCumulative: resources.minerals.copper.cumulative,
        lithiumCumulative: resources.minerals.lithium.cumulative,

        // Resources - Land
        farmland: resources.land.farmland,
        forest: resources.land.forest,
        desert: resources.land.desert,
        yieldDamageFactor: resources.land.yieldDamageFactor,

        // Resources - Food (Bennett's Law)
        proteinShare: resources.food.proteinShare,
        grainEquivalent: resources.food.grainEquivalent,
        foodStress: resources.foodStress,

        // Resources - Carbon
        forestNetFlux: resources.carbon.netFlux,
        cumulativeSequestration: resources.carbon.cumulativeSequestration,

        // Production (biophysical) — not computed in manual path
        productionGdp: 0,
        usefulEnergyProduction: 0,

        // G/C Expansion
        robotLoadTWh: expansion.robotLoadTWh,
        expansionMultiplier: expansion.expansionMultiplier,
        adjustedDemand: expansion.adjustedDemand,
        robotsPer1000: expansion.robotsPer1000,

        // Regional
        regionalPopulation: demo.regionalPopulation,
        regionalGdp,

        // Regional Energy (v2)
        regionalCapacities: energy.regionalCapacities,
        regionalAdditions: energy.regionalAdditions,

        // Regional Dispatch (v2)
        regionalGeneration: dispatch.regionalGeneration,
        regionalGridIntensity: dispatch.regionalGridIntensity,
        regionalFossilShare: dispatch.regionalFossilShare,
        regionalEmissions: dispatch.regionalEmissions,
      });
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(results);

    return { years, results, metrics };
  }

  /**
   * Calculate summary metrics from results
   */
  private calculateMetrics(results: YearResult[]): SimulationMetrics {
    // Population metrics
    let peakPopulation = 0;
    let peakPopulationYear = 2025;
    for (const r of results) {
      if (r.population > peakPopulation) {
        peakPopulation = r.population;
        peakPopulationYear = r.year;
      }
    }

    // Emissions metrics
    let peakEmissions = 0;
    let peakEmissionsYear = 2025;
    for (const r of results) {
      const totalEmissions = r.electricityEmissions + r.nonElectricEmissions + r.forestNetFlux;
      if (totalEmissions > peakEmissions) {
        peakEmissions = totalEmissions;
        peakEmissionsYear = r.year;
      }
    }

    // Crossover years
    let solarCrossoverYear: number | null = null;
    let gridBelow100Year: number | null = null;
    for (const r of results) {
      if (solarCrossoverYear === null && r.solarLCOE < r.lcoes.gas) {
        solarCrossoverYear = r.year;
      }
      if (gridBelow100Year === null && r.gridIntensity < 100) {
        gridBelow100Year = r.year;
      }
    }

    const idx2050 = results.findIndex(r => r.year === 2050);
    const idx2100 = results.length - 1;

    return {
      peakPopulation,
      peakPopulationYear,
      population2100: results[idx2100].population,

      warming2050: idx2050 >= 0 ? results[idx2050].temperature : 0,
      warming2100: results[idx2100].temperature,
      peakEmissions,
      peakEmissionsYear,

      solarCrossoverYear,
      gridBelow100Year,
      fossilShareFinal: results[idx2100].fossilShare,

      gdp2050: idx2050 >= 0 ? results[idx2050].gdp : 0,
      gdp2100: results[idx2100].gdp,
      kY2050: idx2050 >= 0 ? results[idx2050].capitalStock / results[idx2050].gdp : 0,
    };
  }
}

// =============================================================================
// CONVENIENCE FUNCTION
// =============================================================================

/**
 * Run a simulation with optional parameter overrides.
 * Delegates to the autowired simulation path.
 */
export function runSimulation(params: SimulationParams = {}): SimulationResult {
  return runAutowiredFull(params);
}

/**
 * Run a simulation using the manual (hand-wired) path.
 * Kept for regression testing and comparison.
 */
export function runSimulationManual(params: SimulationParams = {}): SimulationResult {
  const sim = new Simulation(params);
  const validation = sim.validate();

  if (!validation.valid) {
    throw new Error(`Simulation validation failed:\n${validation.errors.join('\n')}`);
  }

  if (validation.warnings.length > 0) {
    console.warn('Validation warnings:', validation.warnings);
  }

  return sim.run();
}

/**
 * Run a simulation with a scenario file
 */
export async function runWithScenario(
  scenarioPath: string,
  overrides?: SimulationParams
): Promise<{ scenario: { name: string; description: string }; result: SimulationResult }> {
  const { loadScenario, scenarioToParams, deepMerge } = await import('./scenario.js');

  const scenario = await loadScenario(scenarioPath);
  let params = scenarioToParams(scenario);

  if (overrides) {
    params = deepMerge(params, overrides);
  }

  const result = runSimulation(params);

  return {
    scenario: { name: scenario.name, description: scenario.description },
    result,
  };
}

// =============================================================================
// CLI RUNNER
// =============================================================================

async function runCLI() {
  const args = process.argv.slice(2);

  // Known flags
  const knownFlags = new Set([
    '--scenario', '--list', '--help', '-h',
    '--carbonPrice', '--sensitivity',
  ]);

  // Parse --scenario=name or --scenario name
  let scenarioName: string | undefined;
  let scenarioPath: string | undefined;
  const unknownFlags: string[] = [];
  const paramOverrides: SimulationParams = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--scenario=')) {
      scenarioName = arg.split('=')[1];
    } else if (arg === '--scenario' && args[i + 1]) {
      scenarioName = args[++i];
    } else if (arg === '--list') {
      // List available scenarios
      const { listScenarios } = await import('./scenario.js');
      const scenarios = await listScenarios();
      console.log('Available scenarios:');
      for (const s of scenarios) {
        console.log(`  ${s}`);
      }
      return;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npx tsx src/simulation.ts [options]');
      console.log('');
      console.log('Options:');
      console.log('  --scenario=NAME           Run with named scenario');
      console.log('  --list                    List available scenarios');
      console.log('  --carbonPrice=VALUE       Override carbon price ($/ton)');
      console.log('  --sensitivity=VALUE       Override climate sensitivity (°C)');
      console.log('  --help, -h                Show this help');
      return;
    } else if (arg.startsWith('--carbonPrice=')) {
      const value = parseFloat(arg.split('=')[1]);
      if (!isNaN(value)) {
        paramOverrides.energy = { ...paramOverrides.energy, carbonPrice: value };
      }
    } else if (arg.startsWith('--sensitivity=')) {
      const value = parseFloat(arg.split('=')[1]);
      if (!isNaN(value)) {
        paramOverrides.climate = { ...paramOverrides.climate, sensitivity: value };
      }
    } else if (arg.startsWith('--') || arg.startsWith('-')) {
      // Check if it's a known flag with separate value
      const flagName = arg.split('=')[0];
      if (!knownFlags.has(flagName)) {
        unknownFlags.push(arg);
      }
    }
  }

  // Warn about unknown flags
  if (unknownFlags.length > 0) {
    console.warn(`Warning: Unknown flags ignored: ${unknownFlags.join(', ')}`);
    console.warn('Run with --help to see available options.');
    console.warn('');
  }

  // Load scenario if specified
  let params: SimulationParams = {};
  let loadedScenario: { name: string; description: string } | undefined;

  if (scenarioName) {
    const { loadScenario, scenarioToParams, getScenarioPath } = await import('./scenario.js');
    try {
      // Try as path first, then as name
      scenarioPath = scenarioName.endsWith('.json')
        ? scenarioName
        : getScenarioPath(scenarioName);
      const scenario = await loadScenario(scenarioPath);
      params = scenarioToParams(scenario);
      loadedScenario = { name: scenario.name, description: scenario.description };
    } catch (err) {
      console.error(`Error loading scenario '${scenarioName}': ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // Merge CLI parameter overrides
  const { deepMerge } = await import('./scenario.js');
  if (Object.keys(paramOverrides).length > 0) {
    params = deepMerge(params, paramOverrides);
  }

  // Run simulation
  if (loadedScenario) {
    console.log(`=== ${loadedScenario.name} ===`);
    console.log(loadedScenario.description);
    console.log('');
  } else {
    console.log('=== Full Simulation ===\n');
  }

  const result = runSimulation(params);

  // Print sample years
  const sampleYears = [2025, 2030, 2040, 2050, 2075, 2100];

  console.log('Year  Pop(B)  GDP($T)  Elec(TWh)  Temp(°C)  Grid(kg/MWh)  Solar$/MWh');
  console.log('----  ------  -------  ---------  --------  ------------  ----------');

  for (const r of result.results) {
    if (sampleYears.includes(r.year)) {
      console.log(
        `${r.year}  ` +
        `${(r.population / 1e9).toFixed(2)}    ` +
        `${r.gdp.toFixed(0).padStart(5)}    ` +
        `${(r.electricityDemand / 1000).toFixed(0).padStart(6)}k    ` +
        `${r.temperature.toFixed(2).padStart(5)}     ` +
        `${r.gridIntensity.toFixed(0).padStart(8)}      ` +
        `${r.solarLCOE.toFixed(0).padStart(6)}`
      );
    }
  }

  console.log('\n=== Metrics ===\n');
  console.log(`Peak population: ${(result.metrics.peakPopulation / 1e9).toFixed(2)}B in ${result.metrics.peakPopulationYear}`);
  console.log(`Population 2100: ${(result.metrics.population2100 / 1e9).toFixed(2)}B`);
  console.log(`Warming 2050: ${result.metrics.warming2050.toFixed(2)}°C`);
  console.log(`Warming 2100: ${result.metrics.warming2100.toFixed(2)}°C`);
  console.log(`Peak emissions: ${result.metrics.peakEmissions.toFixed(1)} Gt in ${result.metrics.peakEmissionsYear}`);
  console.log(`Solar crosses gas: ${result.metrics.solarCrossoverYear ?? 'never'}`);
  console.log(`Grid < 100 kg/MWh: ${result.metrics.gridBelow100Year ?? 'never'}`);
  console.log(`GDP 2050: $${result.metrics.gdp2050.toFixed(0)}T`);
  console.log(`GDP 2100: $${result.metrics.gdp2100.toFixed(0)}T`);
  console.log(`K/Y 2050: ${result.metrics.kY2050.toFixed(2)}`);

  // Resource metrics
  const idx2025 = 0;
  const idx2050 = result.results.findIndex(r => r.year === 2050);
  const idx2100 = result.results.length - 1;
  console.log('\n=== Resources ===\n');
  console.log(`Copper cumulative 2100: ${result.results[idx2100].copperCumulative.toFixed(0)} Mt`);
  console.log(`Lithium cumulative 2100: ${result.results[idx2100].lithiumCumulative.toFixed(1)} Mt`);
  console.log(`Forest 2100: ${result.results[idx2100].forest.toFixed(0)} Mha`);
  console.log(`Farmland 2100: ${result.results[idx2100].farmland.toFixed(0)} Mha`);
  console.log(`Yield damage 2100: ${((1 - result.results[idx2100].yieldDamageFactor) * 100).toFixed(0)}%`);
  console.log(`Cumulative sequestration: ${result.results[idx2100].cumulativeSequestration.toFixed(1)} Gt CO2`);

  console.log('\n=== Food (Bennett\'s Law) ===\n');
  console.log(`Protein share 2025: ${(result.results[idx2025].proteinShare * 100).toFixed(1)}%`);
  console.log(`Protein share 2050: ${(result.results[idx2050].proteinShare * 100).toFixed(1)}%`);
  console.log(`Protein share 2100: ${(result.results[idx2100].proteinShare * 100).toFixed(1)}%`);
  console.log(`Grain demand 2025: ${result.results[idx2025].grainEquivalent.toFixed(0)} Mt`);
  console.log(`Grain demand 2050: ${result.results[idx2050].grainEquivalent.toFixed(0)} Mt`);
  console.log(`Grain demand 2100: ${result.results[idx2100].grainEquivalent.toFixed(0)} Mt`);

  // G/C Expansion metrics
  console.log('\n=== G/C Expansion ===\n');
  console.log(`Robot load 2025: ${result.results[idx2025].robotLoadTWh.toFixed(0)} TWh`);
  console.log(`Robot load 2050: ${result.results[idx2050].robotLoadTWh.toFixed(0)} TWh`);
  console.log(`Robot load 2100: ${result.results[idx2100].robotLoadTWh.toFixed(0)} TWh`);
  console.log(`Robots/1000 workers 2025: ${result.results[idx2025].robotsPer1000.toFixed(1)}`);
  console.log(`Robots/1000 workers 2100: ${result.results[idx2100].robotsPer1000.toFixed(1)}`);
  console.log(`Expansion multiplier 2025: ${result.results[idx2025].expansionMultiplier.toFixed(2)}x`);
  console.log(`Expansion multiplier 2050: ${result.results[idx2050].expansionMultiplier.toFixed(2)}x`);
  console.log(`Expansion multiplier 2100: ${result.results[idx2100].expansionMultiplier.toFixed(2)}x`);
  console.log(`Base demand 2025: ${result.results[idx2025].electricityDemand.toFixed(0)} TWh`);
  console.log(`Adjusted demand 2025: ${result.results[idx2025].adjustedDemand.toFixed(0)} TWh`);
  console.log(`Adjusted demand 2100: ${result.results[idx2100].adjustedDemand.toFixed(0)} TWh`);

  // Sector electrification
  console.log('\n=== Sector Electrification ===\n');
  console.log(`Transport 2025: ${(result.results[idx2025].transportElectrification * 100).toFixed(0)}%`);
  console.log(`Transport 2050: ${(result.results[idx2050].transportElectrification * 100).toFixed(0)}%`);
  console.log(`Transport 2100: ${(result.results[idx2100].transportElectrification * 100).toFixed(0)}%`);
  console.log(`Buildings 2025: ${(result.results[idx2025].buildingsElectrification * 100).toFixed(0)}%`);
  console.log(`Buildings 2050: ${(result.results[idx2050].buildingsElectrification * 100).toFixed(0)}%`);
  console.log(`Buildings 2100: ${(result.results[idx2100].buildingsElectrification * 100).toFixed(0)}%`);
  console.log(`Industry 2025: ${(result.results[idx2025].industryElectrification * 100).toFixed(0)}%`);
  console.log(`Industry 2050: ${(result.results[idx2050].industryElectrification * 100).toFixed(0)}%`);
  console.log(`Industry 2100: ${(result.results[idx2100].industryElectrification * 100).toFixed(0)}%`);

  // Fuel mix
  console.log('\n=== Fuel Mix (non-electric TWh) ===\n');
  console.log(`Non-electric 2025: ${result.results[idx2025].nonElectricEnergy.toFixed(0)} TWh`);
  console.log(`Non-electric 2050: ${result.results[idx2050].nonElectricEnergy.toFixed(0)} TWh`);
  console.log(`Non-electric 2100: ${result.results[idx2100].nonElectricEnergy.toFixed(0)} TWh`);
  console.log(`Oil 2025: ${result.results[idx2025].oilConsumption.toFixed(0)} TWh`);
  console.log(`Oil 2100: ${result.results[idx2100].oilConsumption.toFixed(0)} TWh`);
  console.log(`Hydrogen 2025: ${result.results[idx2025].hydrogenConsumption.toFixed(0)} TWh`);
  console.log(`Hydrogen 2100: ${result.results[idx2100].hydrogenConsumption.toFixed(0)} TWh`);
  console.log(`Non-electric emissions 2025: ${result.results[idx2025].nonElectricEmissions.toFixed(1)} Gt`);
  console.log(`Non-electric emissions 2100: ${result.results[idx2100].nonElectricEmissions.toFixed(1)} Gt`);

  // Energy burden
  console.log('\n=== Energy Burden ===\n');
  console.log(`Energy cost 2025: $${result.results[idx2025].totalEnergyCost.toFixed(1)}T`);
  console.log(`Energy cost 2050: $${result.results[idx2050].totalEnergyCost.toFixed(1)}T`);
  console.log(`Energy cost 2100: $${result.results[idx2100].totalEnergyCost.toFixed(1)}T`);
  console.log(`Energy burden 2025: ${(result.results[idx2025].energyBurden * 100).toFixed(1)}% of GDP`);
  console.log(`Energy burden 2050: ${(result.results[idx2050].energyBurden * 100).toFixed(1)}% of GDP`);
  console.log(`Energy burden 2100: ${(result.results[idx2100].energyBurden * 100).toFixed(1)}% of GDP`);

  // Find peak burden
  let peakBurden = 0;
  let peakBurdenYear = 2025;
  for (const r of result.results) {
    if (r.energyBurden > peakBurden) {
      peakBurden = r.energyBurden;
      peakBurdenYear = r.year;
    }
  }
  console.log(`Peak burden: ${(peakBurden * 100).toFixed(1)}% in ${peakBurdenYear}`);
}

if (process.argv[1]?.endsWith('simulation.ts') || process.argv[1]?.endsWith('simulation.js')) {
  runCLI().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

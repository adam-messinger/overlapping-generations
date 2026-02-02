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
 *      climate ← dispatch
 *        ↓
 *      (damages feed back to demand, capital for next year)
 */

import { demographicsModule, DemographicsParams } from './modules/demographics.js';
import { demandModule, DemandParams } from './modules/demand.js';
import { capitalModule, CapitalParams } from './modules/capital.js';
import { energyModule, EnergyParams } from './modules/energy.js';
import { dispatchModule, DispatchParams } from './modules/dispatch.js';
import { climateModule, ClimateParams } from './modules/climate.js';
import { Region, EnergySource } from './framework/types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface SimulationParams {
  startYear?: number;
  endYear?: number;
  demographics?: Partial<DemographicsParams>;
  demand?: Partial<DemandParams>;
  capital?: Partial<CapitalParams>;
  energy?: Partial<EnergyParams>;
  dispatch?: Partial<DispatchParams>;
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
  gdp: number;
  electricityDemand: number;
  electrificationRate: number;
  totalFinalEnergy: number;
  finalEnergyPerCapitaDay: number;

  // Capital
  capitalStock: number;
  investment: number;
  savingsRate: number;
  stability: number;
  interestRate: number;
  robotsDensity: number;

  // Energy
  lcoes: Record<EnergySource, number>;
  capacities: Record<EnergySource, number>;
  solarLCOE: number;
  windLCOE: number;
  batteryCost: number;

  // Dispatch
  generation: Record<string, number>;
  gridIntensity: number;
  electricityEmissions: number;
  fossilShare: number;

  // Climate
  temperature: number;
  co2ppm: number;
  damages: number;
  cumulativeEmissions: number;

  // Regional
  regionalPopulation: Record<Region, number>;
  regionalGdp: Record<Region, number>;
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
    let climateState = climateModule.init(this.climateParams);

    // Track lagged values for feedback loops
    let laggedDamages: Record<Region, number> = { oecd: 0, china: 0, em: 0, row: 0 };
    let laggedBurdenDamage = 0;

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
      const capitalInputs = {
        regionalYoung: demo.regionalYoung,
        regionalWorking: demo.regionalWorking,
        regionalOld: demo.regionalOld,
        regionalPopulation: demo.regionalPopulation,
        effectiveWorkers: demo.effectiveWorkers,
        gdp: demand.gdp,
        damages: laggedDamages.oecd, // Use OECD as proxy for global
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

      // =======================================================================
      // Step 4: Energy (needs demand, capital)
      // =======================================================================
      const energyInputs = {
        electricityDemand: demand.electricityDemand,
        availableInvestment: capital.investment,
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
      // Step 5: Dispatch (needs demand, energy)
      // =======================================================================
      const dispatchInputs = {
        electricityDemand: demand.electricityDemand,
        capacities: energy.capacities,
        lcoes: energy.lcoes,
        solarPlusBatteryLCOE: energy.solarPlusBatteryLCOE,
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
      // Step 6: Climate (needs emissions from dispatch)
      // =======================================================================
      // Total emissions = electricity + non-electric
      // Non-electric emissions decline with electrification
      const nonElectricEmissions = 25 * (1 - demand.electrificationRate); // Rough proxy
      const totalEmissions = dispatch.electricityEmissions + nonElectricEmissions;

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
      // Update lagged values for next year's feedback
      // =======================================================================
      laggedDamages = climate.regionalDamages;
      // Energy burden damage would come from energy cost calculation (simplified here)
      laggedBurdenDamage = 0; // TODO: implement energy burden feedback

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
        gdp: demand.gdp,
        electricityDemand: demand.electricityDemand,
        electrificationRate: demand.electrificationRate,
        totalFinalEnergy: demand.totalFinalEnergy,
        finalEnergyPerCapitaDay: demand.finalEnergyPerCapitaDay,

        // Capital
        capitalStock: capital.stock,
        investment: capital.investment,
        savingsRate: capital.savingsRate,
        stability: capital.stability,
        interestRate: capital.interestRate,
        robotsDensity: capital.robotsDensity,

        // Energy
        lcoes: energy.lcoes,
        capacities: energy.capacities,
        solarLCOE: energy.lcoes.solar,
        windLCOE: energy.lcoes.wind,
        batteryCost: energy.batteryCost,

        // Dispatch
        generation: dispatch.generation,
        gridIntensity: dispatch.gridIntensity,
        electricityEmissions: dispatch.electricityEmissions,
        fossilShare: dispatch.fossilShare,

        // Climate
        temperature: climate.temperature,
        co2ppm: climate.co2ppm,
        damages: climate.damages,
        cumulativeEmissions: climate.cumulativeEmissions,

        // Regional
        regionalPopulation: demo.regionalPopulation,
        regionalGdp,
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
      const totalEmissions = r.electricityEmissions + 25 * (1 - r.electrificationRate);
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
 * Run a simulation with optional parameter overrides
 */
export function runSimulation(params: SimulationParams = {}): SimulationResult {
  const sim = new Simulation(params);
  const validation = sim.validate();

  if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
    throw new Error('Simulation validation failed');
  }

  if (validation.warnings.length > 0) {
    console.warn('Validation warnings:', validation.warnings);
  }

  return sim.run();
}

// =============================================================================
// CLI RUNNER
// =============================================================================

if (process.argv[1]?.endsWith('simulation.ts') || process.argv[1]?.endsWith('simulation.js')) {
  console.log('=== SimTS Full Simulation ===\n');

  const result = runSimulation();

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
}

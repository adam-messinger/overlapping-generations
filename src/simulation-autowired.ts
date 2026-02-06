/**
 * Auto-wired Simulation Runner
 *
 * Julia-inspired automatic dependency resolution.
 * Modules declare inputs/outputs, framework wires them automatically.
 *
 * Fixes over initial version:
 * - netEnergyFactor computed from generation + netEnergyFraction (lagged)
 * - energyBurdenDamage sourced from demand.burdenDamage (not climate.damages)
 * - capitalGrowthRate lagged to break demand→capital cycle
 * - gdpPerCapita2025 captured from year 0 via closure
 * - carbonPrice + regionalCarbonPrice read from full params
 * - Metrics computation ported from simulation.ts
 * - YearResult mapping from autowire outputs
 */

import { runAutowired, getOutputsAtYear, AutowireResult } from './framework/autowire.js';
import { demographicsModule } from './modules/demographics.js';
import { productionModule } from './modules/production.js';
import { demandModule } from './modules/demand.js';
import { capitalModule } from './modules/capital.js';
import { energyModule } from './modules/energy.js';
import { dispatchModule } from './modules/dispatch.js';
// expansion module dissolved into demand + production
import { resourcesModule } from './modules/resources.js';
import { climateModule } from './modules/climate.js';
import { Region, REGIONS, EnergySource, ENERGY_SOURCES } from './framework/types.js';
import type { SimulationParams, YearResult, SimulationMetrics, SimulationResult } from './simulation.js';

// =============================================================================
// MODULES
// =============================================================================

const ALL_MODULES = [
  demographicsModule,
  productionModule,
  demandModule,
  capitalModule,
  energyModule,
  dispatchModule,
  resourcesModule,
  climateModule,
];

// =============================================================================
// BUILD TRANSFORMS AND LAGS
// =============================================================================

/**
 * Build transforms with proper parameter access.
 * Closure captures merged energy params for carbonPrice/regionalCarbonPrice.
 */
function buildTransforms(mergedEnergyParams: any) {
  // Mutable closure: captures gdpPerCapita2025 on first year
  let capturedGdpPerCapita2025 = 0;

  return {
    // Energy needs availableInvestment (from capital.investment)
    availableInvestment: {
      fn: (outputs: Record<string, any>) => outputs.investment ?? 30,
      dependsOn: ['investment'],
    },

    // Energy needs stabilityFactor (from capital.stability)
    stabilityFactor: {
      fn: (outputs: Record<string, any>) => outputs.stability ?? 1.0,
      dependsOn: ['stability'],
    },

    // Capital uses effectiveWorkers from demographics
    effectiveWorkers: {
      fn: (outputs: Record<string, any>) => outputs.effectiveWorkers,
      dependsOn: ['effectiveWorkers'],
    },

    // Capital and demand use gdp from production
    gdp: {
      fn: (outputs: Record<string, any>) => outputs.gdp,
      dependsOn: ['gdp'],
    },

    // Dispatch and energy use electricity demand from demand module
    electricityDemand: {
      fn: (outputs: Record<string, any>) =>
        outputs.electricityDemand ?? 30000,
      dependsOn: ['electricityDemand'],
    },

    // Resources needs gdpPerCapita (derived)
    gdpPerCapita: {
      fn: (outputs: Record<string, any>) => {
        const gdp = outputs.gdp ?? 120;
        const pop = outputs.population ?? 8e9;
        return (gdp * 1e12) / pop;
      },
      dependsOn: ['gdp', 'population'],
    },

    // Resources needs gdpPerCapita2025 (captured from year 0)
    gdpPerCapita2025: {
      fn: (outputs: Record<string, any>, _year: number, yearIndex: number) => {
        if (yearIndex === 0) {
          const gdp = outputs.gdp ?? 120;
          const pop = outputs.population ?? 8e9;
          capturedGdpPerCapita2025 = (gdp * 1e12) / pop;
        }
        return capturedGdpPerCapita2025;
      },
      dependsOn: ['gdp', 'population'],
    },

    // Climate needs total emissions (electricity + non-electric + land use)
    emissions: {
      fn: (outputs: Record<string, any>) => {
        const elecEmissions = outputs.electricityEmissions ?? 10;
        const nonElecEmissions = outputs.nonElectricEmissions ?? 25;
        // netFlux is nested inside carbon output from resources
        const carbon = outputs.carbon;
        const landUse = carbon?.netFlux ?? 0;
        return elecEmissions + nonElecEmissions + landUse;
      },
      dependsOn: ['electricityEmissions', 'nonElectricEmissions', 'carbon'],
    },

    // Dispatch needs carbonPrice (from energy params)
    carbonPrice: {
      fn: () => mergedEnergyParams.carbonPrice,
      dependsOn: [],
    },

    // Dispatch needs solarPlusBatteryLCOE from energy
    solarPlusBatteryLCOE: {
      fn: (outputs: Record<string, any>) => outputs.solarPlusBatteryLCOE ?? 30,
      dependsOn: ['solarPlusBatteryLCOE'],
    },

    // Dispatch needs capacities from energy
    capacities: {
      fn: (outputs: Record<string, any>) => outputs.capacities,
      dependsOn: ['capacities'],
    },

    // Dispatch needs lcoes from energy
    lcoes: {
      fn: (outputs: Record<string, any>) => outputs.lcoes,
      dependsOn: ['lcoes'],
    },

    // Resources needs additions from energy
    additions: {
      fn: (outputs: Record<string, any>) => outputs.additions ?? {},
      dependsOn: ['additions'],
    },

    // Resources needs population from demographics
    population: {
      fn: (outputs: Record<string, any>) => outputs.population,
      dependsOn: ['population'],
    },

    // Demand needs electricityGeneration (from dispatch.totalGeneration)
    // No dependsOn to avoid cycle (demand→dispatch→demand)
    electricityGeneration: {
      fn: (outputs: Record<string, any>) => outputs.totalGeneration,
      dependsOn: [],
    },

    // Demand needs weightedAverageLCOE (from generation-weighted lcoes)
    // No dependsOn to avoid cycle
    weightedAverageLCOE: {
      fn: (outputs: Record<string, any>) => {
        const generation = outputs.generation;
        const lcoes = outputs.lcoes;
        if (!generation || !lcoes) return 50;
        let totalGen = 0;
        let weightedSum = 0;
        for (const source of Object.keys(generation)) {
          const gen = generation[source] ?? 0;
          const lcoe = lcoes[source] ?? 50;
          totalGen += gen;
          weightedSum += gen * lcoe;
        }
        return totalGen > 0 ? weightedSum / totalGen : 50;
      },
      dependsOn: [],
    },

    // Compute net energy factor from generation + netEnergyFraction
    // (same logic as simulation.ts lines 462-478)
    netEnergyFactorComputed: {
      fn: (outputs: Record<string, any>) => {
        const generation = outputs.generation;
        const netEnergyFraction = outputs.netEnergyFraction;
        if (!generation || !netEnergyFraction) return 1;
        let grossElectricity = 0;
        let netElectricity = 0;
        for (const [source, gen] of Object.entries(generation)) {
          const g = gen as number;
          if (g <= 0) continue;
          const energySource = source === 'solarPlusBattery' ? 'solar' : source;
          const fraction = netEnergyFraction[energySource] ?? 1;
          grossElectricity += g;
          netElectricity += g * fraction;
        }
        return grossElectricity > 0
          ? Math.max(0, Math.min(1, netElectricity / grossElectricity))
          : 1;
      },
      dependsOn: [],  // No deps to avoid cycle - uses current year's outputs
    },

    // Regional electricity demand from demand module
    regionalElectricityDemand: {
      fn: (outputs: Record<string, any>) => {
        const regional = outputs.regional;
        if (!regional) {
          const globalDemand = outputs.electricityDemand ?? 30000;
          const shares: Record<Region, number> = { oecd: 0.38, china: 0.31, em: 0.25, row: 0.06 };
          const result = {} as Record<Region, number>;
          for (const r of REGIONS) result[r] = globalDemand * shares[r];
          return result;
        }
        const result = {} as Record<Region, number>;
        for (const r of REGIONS) result[r] = regional[r]?.electricityDemand ?? 0;
        return result;
      },
      dependsOn: ['regional', 'electricityDemand'],
    },

    // Regional investment from capital
    regionalInvestment: {
      fn: (outputs: Record<string, any>) => {
        const investment = outputs.investment ?? 30;
        const regionalSavings = outputs.regionalSavings;
        if (!regionalSavings) {
          const shares: Record<Region, number> = { oecd: 0.49, china: 0.15, em: 0.29, row: 0.07 };
          const result: Record<Region, number> = {} as any;
          for (const r of REGIONS) result[r] = investment * shares[r];
          return result;
        }
        let totalSavings = 0;
        for (const r of REGIONS) totalSavings += regionalSavings[r] ?? 0;
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          result[r] = totalSavings > 0 ? investment * ((regionalSavings[r] ?? 0) / totalSavings) : investment / 4;
        }
        return result;
      },
      dependsOn: ['investment', 'regionalSavings'],
    },

    // Regional capacities from energy module
    regionalCapacities: {
      fn: (outputs: Record<string, any>) => outputs.regionalCapacities ?? null,
      dependsOn: ['regionalCapacities'],
    },

    // Regional carbon prices from energy params
    regionalCarbonPrice: {
      fn: () => {
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          result[r] = mergedEnergyParams.regional[r].carbonPrice;
        }
        return result;
      },
      dependsOn: [],
    },

    // GDP-weighted average of regional damages (matches manual path's capital input)
    gdpWeightedDamages: {
      fn: (outputs: Record<string, any>) => {
        const regionalDamages = outputs.regionalDamages;
        const regional = outputs.regional; // demand regional outputs
        if (!regionalDamages || !regional) return outputs.damages ?? 0;
        let totalGdp = 0;
        let weightedSum = 0;
        for (const r of REGIONS) {
          const gdp = regional[r]?.gdp ?? 0;
          totalGdp += gdp;
          weightedSum += (regionalDamages[r] ?? 0) * gdp;
        }
        return totalGdp > 0 ? weightedSum / totalGdp : 0;
      },
      dependsOn: [],  // No deps to avoid cycle - uses current outputs
    },
  };
}

/**
 * Build lag configurations.
 */
function buildLags() {
  return {
    // Demand needs lagged climate damages
    regionalDamages: {
      source: 'regionalDamages',
      delay: 1,
      initial: { oecd: 0, china: 0, em: 0, row: 0 } as Record<Region, number>,
    },

    // Demand needs lagged energy burden damage (from demand.burdenDamage, not climate.damages)
    energyBurdenDamage: {
      source: 'burdenDamage',
      delay: 1,
      initial: 0,
    },

    // Capital needs lagged GDP-weighted damages (matches manual path)
    damages: {
      source: 'gdpWeightedDamages',
      delay: 1,
      initial: 0,
    },

    // Resources needs lagged temperature
    temperature: {
      source: 'temperature',
      delay: 1,
      initial: 1.2,
    },

    // Demand needs lagged average LCOE for cost-driven electrification
    laggedAvgLCOE: {
      source: 'weightedAverageLCOE',
      delay: 1,
      initial: 50,
    },

    // Capital needs lagged net energy factor (from computed transform)
    netEnergyFactor: {
      source: 'netEnergyFactorComputed',
      delay: 1,
      initial: 1,
    },

    // Production needs lagged capital stock
    capitalStock: {
      source: 'stock',
      delay: 1,
      initial: 420,
    },

    // Production needs lagged total generation
    totalGeneration: {
      source: 'totalGeneration',
      delay: 1,
      initial: 30000,
    },

    // Production needs lagged non-electric energy
    nonElectricEnergy: {
      source: 'nonElectricEnergy',
      delay: 1,
      initial: 92000,
    },

    // Production needs lagged food stress
    foodStress: {
      source: 'foodStress',
      delay: 1,
      initial: 0,
    },
  };
}

// =============================================================================
// RUN SIMULATION
// =============================================================================

/**
 * Run autowired simulation with full SimulationParams support.
 */
export function runAutowiredSimulation(params: SimulationParams = {}): AutowireResult {
  // Merge energy params to read carbon prices
  const mergedEnergyParams = energyModule.mergeParams(params.energy ?? {});

  const transforms = buildTransforms(mergedEnergyParams);
  const lags = buildLags();

  return runAutowired({
    modules: ALL_MODULES,
    transforms,
    lags,
    params: {
      demographics: params.demographics,
      production: params.production,
      demand: params.demand,
      capital: params.capital,
      energy: params.energy,
      dispatch: params.dispatch,
      resources: params.resources,
      climate: params.climate,
    },
    startYear: params.startYear ?? 2025,
    endYear: params.endYear ?? 2100,
  });
}

// =============================================================================
// YEAR RESULT MAPPING
// =============================================================================

/**
 * Convert autowire result to flat YearResult array (matches simulation.ts output).
 */
export function toYearResults(result: AutowireResult, mergedDemandParams?: any): YearResult[] {
  const yearResults: YearResult[] = [];

  for (let i = 0; i < result.years.length; i++) {
    const o = getOutputsAtYear(result, i);

    yearResults.push({
      year: result.years[i],

      // Demographics
      population: o.population,
      working: o.working,
      dependency: o.dependency,
      effectiveWorkers: o.effectiveWorkers,
      collegeShare: o.collegeShare,

      // Demand
      capitalElasticity: mergedDemandParams?.capitalElasticity ?? 0.35,
      gdp: o.gdp,
      electricityDemand: o.electricityDemand,
      electrificationRate: o.electrificationRate,
      totalFinalEnergy: o.totalFinalEnergy,
      nonElectricEnergy: o.nonElectricEnergy,
      finalEnergyPerCapitaDay: o.finalEnergyPerCapitaDay,

      // Sectors
      transportElectrification: o.sectors?.transport?.electrificationRate ?? 0,
      buildingsElectrification: o.sectors?.buildings?.electrificationRate ?? 0,
      industryElectrification: o.sectors?.industry?.electrificationRate ?? 0,

      // Fuels
      oilConsumption: o.fuels?.oil ?? 0,
      gasConsumption: o.fuels?.gas ?? 0,
      coalConsumption: o.fuels?.coal ?? 0,
      hydrogenConsumption: o.fuels?.hydrogen ?? 0,

      // Non-electric emissions
      nonElectricEmissions: o.nonElectricEmissions,

      // Energy burden
      totalEnergyCost: o.totalEnergyCost,
      energyBurden: o.energyBurden,
      burdenDamage: o.burdenDamage,

      // Capital
      capitalStock: o.stock,
      investment: o.investment,
      savingsRate: o.savingsRate,
      stability: o.stability,
      interestRate: o.interestRate,
      robotsDensity: o.robotsDensity,
      automationShare: o.automationShare,
      capitalOutputRatio: o.capitalOutputRatio,
      capitalGrowthRate: o.capitalGrowthRate,

      // Energy
      lcoes: o.lcoes,
      capacities: o.capacities,
      solarLCOE: o.lcoes?.solar ?? 0,
      windLCOE: o.lcoes?.wind ?? 0,
      batteryCost: o.batteryCost ?? 0,
      cheapestLCOE: o.cheapestLCOE ?? 0,
      solarPlusBatteryLCOE: o.solarPlusBatteryLCOE ?? 0,

      // Dispatch
      generation: o.generation,
      gridIntensity: o.gridIntensity,
      totalGeneration: o.totalGeneration,
      shortfall: o.shortfall,
      electricityEmissions: o.electricityEmissions,
      fossilShare: o.fossilShare,
      curtailmentTWh: o.curtailmentTWh,
      curtailmentRate: o.curtailmentRate,

      // Climate
      temperature: o.temperature,
      co2ppm: o.co2ppm,
      equilibriumTemp: o.equilibriumTemp,
      damages: o.damages,
      cumulativeEmissions: o.cumulativeEmissions,

      // Resources - Minerals
      copperDemand: o.minerals?.copper?.demand ?? 0,
      lithiumDemand: o.minerals?.lithium?.demand ?? 0,
      copperCumulative: o.minerals?.copper?.cumulative ?? 0,
      lithiumCumulative: o.minerals?.lithium?.cumulative ?? 0,

      // Resources - Land
      farmland: o.land?.farmland ?? 0,
      forest: o.land?.forest ?? 0,
      desert: o.land?.desert ?? 0,
      yieldDamageFactor: o.land?.yieldDamageFactor ?? 1,

      // Resources - Food
      proteinShare: o.food?.proteinShare ?? 0,
      grainEquivalent: o.food?.grainEquivalent ?? 0,
      foodStress: o.foodStress ?? 0,

      // Resources - Carbon
      forestNetFlux: o.carbon?.netFlux ?? 0,
      cumulativeSequestration: o.carbon?.cumulativeSequestration ?? 0,

      // Robot/automation (from demand, expansion dissolved)
      robotLoadTWh: o.robotLoadTWh ?? 0,
      expansionMultiplier: 1.0,  // expansion dissolved into production function
      adjustedDemand: o.electricityDemand ?? 30000,  // no separate adjustment
      robotsPer1000: o.robotsPer1000 ?? 0,

      // Production (biophysical)
      productionGdp: o.gdp,  // Same as gdp now (production is authoritative)
      usefulEnergyProduction: o.productionUsefulEnergy,

      // Regional
      regionalPopulation: o.regionalPopulation,
      regionalGdp: (() => {
        const regional = o.regional;
        if (!regional) return { oecd: 0, china: 0, em: 0, row: 0 };
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) result[r] = regional[r]?.gdp ?? 0;
        return result;
      })(),

      // Regional Energy
      regionalCapacities: o.regionalCapacities,
      regionalAdditions: o.regionalAdditions,

      // Regional Dispatch
      regionalGeneration: o.regionalGeneration,
      regionalGridIntensity: o.regionalGridIntensity,
      regionalFossilShare: o.regionalFossilShare,
      regionalEmissions: o.regionalEmissions,
    });
  }

  return yearResults;
}

// =============================================================================
// METRICS
// =============================================================================

/**
 * Compute summary metrics from YearResult array.
 * Ported from simulation.ts calculateMetrics().
 */
export function computeMetrics(results: YearResult[]): SimulationMetrics {
  let peakPopulation = 0;
  let peakPopulationYear = 2025;
  for (const r of results) {
    if (r.population > peakPopulation) {
      peakPopulation = r.population;
      peakPopulationYear = r.year;
    }
  }

  let peakEmissions = 0;
  let peakEmissionsYear = 2025;
  for (const r of results) {
    const totalEmissions = r.electricityEmissions + r.nonElectricEmissions + r.forestNetFlux;
    if (totalEmissions > peakEmissions) {
      peakEmissions = totalEmissions;
      peakEmissionsYear = r.year;
    }
  }

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

/**
 * Run autowired simulation and return full SimulationResult (matching simulation.ts).
 */
export function runAutowiredFull(params: SimulationParams = {}): SimulationResult {
  const autowireResult = runAutowiredSimulation(params);
  const mergedDemandParams = demandModule.mergeParams(params.demand ?? {});
  const results = toYearResults(autowireResult, mergedDemandParams);
  const metrics = computeMetrics(results);
  return { years: autowireResult.years, results, metrics };
}

// =============================================================================
// CLI
// =============================================================================

if (process.argv[1]?.endsWith('simulation-autowired.ts') ||
    process.argv[1]?.endsWith('simulation-autowired.js')) {

  console.log('=== Autowired Simulation ===\n');

  try {
    const simResult = runAutowiredFull();
    const { results, metrics } = simResult;

    const sampleYears = [2025, 2030, 2040, 2050, 2075, 2100];

    console.log('Year  Pop(B)  GDP($T)  Elec(TWh)  Temp(°C)  Grid(kg/MWh)  Solar$/MWh');
    console.log('----  ------  -------  ---------  --------  ------------  ----------');

    for (const r of results) {
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
    console.log(`Peak population: ${(metrics.peakPopulation / 1e9).toFixed(2)}B in ${metrics.peakPopulationYear}`);
    console.log(`Population 2100: ${(metrics.population2100 / 1e9).toFixed(2)}B`);
    console.log(`Warming 2050: ${metrics.warming2050.toFixed(2)}°C`);
    console.log(`Warming 2100: ${metrics.warming2100.toFixed(2)}°C`);
    console.log(`Peak emissions: ${metrics.peakEmissions.toFixed(1)} Gt in ${metrics.peakEmissionsYear}`);
    console.log(`Solar crosses gas: ${metrics.solarCrossoverYear ?? 'never'}`);
    console.log(`Grid < 100 kg/MWh: ${metrics.gridBelow100Year ?? 'never'}`);
    console.log(`GDP 2050: $${metrics.gdp2050.toFixed(0)}T`);
    console.log(`GDP 2100: $${metrics.gdp2100.toFixed(0)}T`);
    console.log(`K/Y 2050: ${metrics.kY2050.toFixed(2)}`);

  } catch (err) {
    console.error('Auto-wiring failed:', (err as Error).message);
    process.exit(1);
  }
}

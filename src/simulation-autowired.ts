/**
 * Auto-wired Simulation Runner
 *
 * Julia-inspired automatic dependency resolution.
 * Modules declare inputs/outputs, framework wires them automatically.
 *
 * Fixes over initial version:
 * - netEnergyFactor computed from generation + netEnergyFraction (lagged)
 * - energyBurdenDamage sourced from demand.burdenDamage (consumed by production only)
 * - capitalGrowthRate lagged to break demand→capital cycle
 * - gdpPerCapita2025 captured from year 0 via closure
 * - carbonPrice + regionalCarbonPrice read from full params
 * - Metrics computation ported from simulation.ts
 * - YearResult mapping from autowire outputs
 */

import { runAutowired, getOutputsAtYear, AutowireResult, requireOutput, optionalOutput } from './framework/autowire.js';
import { computeEnergySystemOverhead } from './standard-collectors.js';
import { demographicsModule } from './modules/demographics.js';
import { productionModule } from './modules/production.js';
import { demandModule } from './modules/demand.js';
import { capitalModule } from './modules/capital.js';
import { energyModule } from './modules/energy.js';
import { dispatchModule } from './modules/dispatch.js';
// expansion module dissolved into demand + production
import { resourcesModule } from './modules/resources.js';
import { cdrModule } from './modules/cdr.js';
import { climateModule } from './modules/climate.js';
import { Region, REGIONS, EnergySource, ENERGY_SOURCES } from './domain-types.js';
import { GDP_SHARES } from './primitives/distribute.js';
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
  cdrModule,
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
    // Energy needs availableInvestment (from capital.energyInvestment)
    availableInvestment: {
      fn: (outputs: Record<string, any>) => requireOutput(outputs, 'energyInvestment', 'availableInvestment'),
      dependsOn: ['energyInvestment'],
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
      fn: (outputs: Record<string, any>) => requireOutput(outputs, 'electricityDemand', 'electricityDemand'),
      dependsOn: ['electricityDemand'],
    },

    // Resources needs gdpPerCapita (derived)
    gdpPerCapita: {
      fn: (outputs: Record<string, any>) => {
        const gdp = requireOutput<number>(outputs, 'gdp', 'gdpPerCapita');
        const pop = requireOutput<number>(outputs, 'population', 'gdpPerCapita');
        return (gdp * 1e12) / pop;
      },
      dependsOn: ['gdp', 'population'],
    },

    // Resources needs gdpPerCapita2025 (captured from year 0)
    gdpPerCapita2025: {
      fn: (outputs: Record<string, any>, _year: number, yearIndex: number) => {
        if (yearIndex === 0) {
          const gdp = requireOutput<number>(outputs, 'gdp', 'gdpPerCapita2025');
          const pop = requireOutput<number>(outputs, 'population', 'gdpPerCapita2025');
          capturedGdpPerCapita2025 = (gdp * 1e12) / pop;
        }
        return capturedGdpPerCapita2025;
      },
      dependsOn: ['gdp', 'population'],
    },

    // Climate needs total emissions (electricity + non-electric + land use - CDR)
    emissions: {
      fn: (outputs: Record<string, any>) => {
        const elecEmissions = requireOutput<number>(outputs, 'electricityEmissions', 'emissions');
        const nonElecEmissions = requireOutput<number>(outputs, 'nonElectricEmissions', 'emissions');
        const carbon = requireOutput<Record<string, any>>(outputs, 'carbon', 'emissions');
        const landUse = carbon.netFlux ?? 0;  // Legitimately zero when no land-use change
        const cdrRemoval = optionalOutput(outputs, 'cdrRemovalGtCO2', 0);  // Zero before CDR activates
        return elecEmissions + nonElecEmissions + landUse - cdrRemoval;
      },
      dependsOn: ['electricityEmissions', 'nonElectricEmissions', 'carbon', 'cdrRemovalGtCO2'],
    },

    // Dispatch needs carbonPrice (from energy params)
    carbonPrice: {
      fn: () => mergedEnergyParams.carbonPrice,
      dependsOn: [],
    },

    // Dispatch needs capacities from energy
    capacities: {
      fn: (outputs: Record<string, any>) => outputs.capacities,
      dependsOn: ['capacities'],
    },

    // Resources needs additions from energy
    additions: {
      fn: (outputs: Record<string, any>) => requireOutput(outputs, 'additions', 'additions'),
      dependsOn: ['additions'],
    },

    // Resources needs transport electrification for EV battery mineral demand
    transportElectrification: {
      fn: (outputs: Record<string, any>) => {
        const sectors = requireOutput<Record<string, any>>(outputs, 'sectors', 'transportElectrification');
        return sectors.transport?.electrificationRate ?? 0;
      },
      dependsOn: ['sectors'],
    },

    // Resources needs population from demographics
    population: {
      fn: (outputs: Record<string, any>) => outputs.population,
      dependsOn: ['population'],
    },

    // Cycle-breaker: reads current-year dispatch outputs that may not exist yet
    // (demand→dispatch→demand cycle broken by omitting dependsOn)
    // Uses optionalOutput because dispatch hasn't run yet when demand needs this
    electricityGeneration: {
      fn: (outputs: Record<string, any>) =>
        optionalOutput(outputs, 'totalGeneration', undefined),
      dependsOn: [],
    },

    // Cycle-breaker: reads current-year dispatch+energy outputs that may not exist yet
    // Uses optionalOutput because dispatch/energy haven't run yet when this is evaluated
    weightedAverageLCOE: {
      fn: (outputs: Record<string, any>) => {
        const generation = optionalOutput<Record<string, number> | null>(outputs, 'generation', null);
        const lcoes = optionalOutput<Record<string, number> | null>(outputs, 'lcoes', null);
        if (!generation || !lcoes) return 50;
        let totalGen = 0;
        let weightedSum = 0;
        // ENERGY_SOURCES covers the 7 primary sources (solar, wind, nuclear, etc.)
        for (const source of ENERGY_SOURCES) {
          const gen = generation[source] ?? 0;
          const lcoe = lcoes[source] ?? 50;
          totalGen += gen;
          weightedSum += gen * lcoe;
        }
        // Include solarPlusBattery separately — its generation represents the
        // battery-backed portion of solar, with a higher LCOE than bare solar.
        // Without this, the average is biased low when storage is a large share.
        const spbGen = generation['solarPlusBattery'] ?? 0;
        const spbLcoe = outputs.solarPlusBatteryLCOE ?? 50;
        totalGen += spbGen;
        weightedSum += spbGen * spbLcoe;
        return totalGen > 0 ? weightedSum / totalGen : 50;
      },
      dependsOn: [],
    },

    // Cycle-breaker: reads current-year dispatch+energy outputs that may not exist yet
    // Uses optionalOutput because dispatch/energy haven't run yet when this is evaluated
    netEnergyFactorComputed: {
      fn: (outputs: Record<string, any>) => {
        const generation = optionalOutput<Record<string, number> | null>(outputs, 'generation', null);
        const netEnergyFraction = optionalOutput<Record<string, number> | null>(outputs, 'netEnergyFraction', null);
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
        const regional = requireOutput<Record<string, any>>(outputs, 'regional', 'regionalElectricityDemand');
        const result = {} as Record<Region, number>;
        for (const r of REGIONS) result[r] = regional[r]?.electricityDemand ?? 0;
        return result;
      },
      dependsOn: ['regional'],
    },

    // Regional investment from capital (weighted by savings rate × GDP share)
    regionalInvestment: {
      fn: (outputs: Record<string, any>) => {
        const investment = requireOutput<number>(outputs, 'investment', 'regionalInvestment');
        const regionalSavings = requireOutput<Record<Region, number>>(outputs, 'regionalSavings', 'regionalInvestment');
        // Weight by savings rate × GDP share (proxy for savings amount)
        let totalWeight = 0;
        const weights: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          weights[r] = (regionalSavings[r] ?? 0) * GDP_SHARES[r];
          totalWeight += weights[r];
        }
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          result[r] = totalWeight > 0 ? investment * (weights[r] / totalWeight) : investment / REGIONS.length;
        }
        return result;
      },
      dependsOn: ['investment', 'regionalSavings'],
    },

    // Regional capacities from energy module
    regionalCapacities: {
      fn: (outputs: Record<string, any>) => requireOutput(outputs, 'regionalCapacities', 'regionalCapacities'),
      dependsOn: ['regionalCapacities'],
    },

    // Long-duration storage regional capacities (GWh) from energy module
    longStorageRegional: {
      fn: (outputs: Record<string, any>) => requireOutput(outputs, 'longStorageRegional', 'longStorageRegional'),
      dependsOn: ['longStorageRegional'],
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

    // Cycle-breaker: reads current-year energy outputs that may not exist yet
    // Uses optionalOutput because energy hasn't run yet when production needs this
    energySystemOverheadComputed: {
      fn: (outputs: Record<string, any>) => computeEnergySystemOverhead(
        optionalOutput<Record<string, number> | null>(outputs, 'additions', null),
        optionalOutput<Record<string, number> | null>(outputs, 'capacities', null),
      ),
      dependsOn: [],
    },

    // Regional life expectancy for capital module retirement age adjustment
    regionalLifeExpectancy: {
      fn: (outputs: Record<string, any>) => outputs.regionalLifeExpectancy,
      dependsOn: ['regionalLifeExpectancy'],
    },

    // Regional GDP for capital module intergenerational transfers
    regionalGdp: {
      fn: (outputs: Record<string, any>) => {
        const regional = requireOutput<Record<string, any>>(outputs, 'regional', 'regionalGdp');
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) result[r] = regional[r]?.gdp ?? 0;
        return result;
      },
      dependsOn: ['regional'],
    },

    // Regional GDP per capita for climate adaptation
    regionalGdpPerCapita: {
      fn: (outputs: Record<string, any>) => {
        const regional = requireOutput<Record<string, any>>(outputs, 'regional', 'regionalGdpPerCapita');
        const regionalPop = requireOutput<Record<Region, number>>(outputs, 'regionalPopulation', 'regionalGdpPerCapita');
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          const gdp = regional[r]?.gdp ?? 0;
          const pop = regionalPop[r] ?? 1;
          result[r] = (gdp * 1e12) / pop;
        }
        return result;
      },
      dependsOn: ['regional', 'regionalPopulation'],
    },

    // Cycle-breaker: reads current-year climate+demand outputs that may not exist yet
    // Uses optionalOutput because climate/demand outputs aren't available for this transform
    gdpWeightedDamages: {
      fn: (outputs: Record<string, any>) => {
        const regionalDamages = optionalOutput<Record<Region, number> | null>(outputs, 'regionalDamages', null);
        const regional = optionalOutput<Record<string, any> | null>(outputs, 'regional', null);
        if (!regionalDamages || !regional) return 0;
        let totalGdp = 0;
        let weightedSum = 0;
        for (const r of REGIONS) {
          const gdp = regional[r]?.gdp ?? 0;
          totalGdp += gdp;
          weightedSum += (regionalDamages[r] ?? 0) * gdp;
        }
        return totalGdp > 0 ? weightedSum / totalGdp : 0;
      },
      dependsOn: [],
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
      initial: Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>,
    },

    // Production needs lagged energy burden damage (from demand.burdenDamage)
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
      initial: 1.45,
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
      initial: 553,
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

    // Production needs lagged resource energy
    resourceEnergy: {
      source: 'totalResourceEnergy',
      delay: 1,
      initial: 0,
    },

    // Production needs lagged energy system overhead (embodied + operating)
    energySystemOverhead: {
      source: 'energySystemOverheadComputed',
      delay: 1,
      initial: 0,
    },

    // Production needs lagged CDR energy consumption (CDR competes for electricity)
    cdrEnergy: {
      source: 'cdrEnergyTWh',
      delay: 1,
      initial: 0,
    },

    // Energy needs lagged mineral constraint (resources runs after energy in topo order)
    mineralConstraint: {
      source: 'mineralConstraint',
      delay: 1,
      initial: 1.0,  // No constraint in year 0
    },

    // Demand needs lagged regional fossil share (for energy cost → GDP share feedback)
    regionalFossilShare: {
      source: 'regionalFossilShare',
      delay: 1,
      initial: Object.fromEntries(REGIONS.map(r => [r, 0.5])) as Record<Region, number>,
    },
  };
}

// =============================================================================
// RUN SIMULATION
// =============================================================================

/**
 * Run autowired simulation with full SimulationParams support.
 */
export function runAutowiredSimulation(
  params: SimulationParams = {},
  options?: { trackReads?: boolean }
): AutowireResult {
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
      cdr: params.cdr,
      climate: params.climate,
    },
    startYear: params.startYear ?? 2025,
    endYear: params.endYear ?? 2100,
    trackReads: options?.trackReads,
  });
}

// =============================================================================
// YEAR RESULT MAPPING
// =============================================================================

/**
 * Convert autowire result to flat YearResult array (matches simulation.ts output).
 */
export function toYearResults(result: AutowireResult): YearResult[] {
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

      // Useful work
      usefulWorkGrowthRate: o.usefulWorkGrowthRate ?? 0,

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
      retireeCost: o.retireeCost ?? 0,
      childCost: o.childCost ?? 0,
      transferBurden: o.transferBurden ?? 0,
      workerConsumption: o.workerConsumption ?? 0,

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
      deepOceanTemp: o.deepOceanTemp ?? 0,
      radiativeForcing: o.radiativeForcing ?? 0,

      // Adaptation
      regionalAdaptation: o.regionalAdaptation ?? Object.fromEntries(REGIONS.map(r => [r, 0])),

      // Long-duration storage
      longStorageCost: o.longStorageCost ?? 300,
      longStorageCapacity: o.longStorageCapacity ?? 0,

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

      // CDR (Carbon Dioxide Removal)
      cdrRemoval: o.cdrRemovalGtCO2 ?? 0,
      cdrEnergyTWh: o.cdrEnergyTWh ?? 0,
      cdrCostPerTon: o.cdrCostPerTon ?? 400,
      cdrCumulative: o.cdrCumulative ?? 0,
      cdrCapacity: o.cdrCapacity ?? 0,
      cdrAnnualSpend: o.cdrAnnualSpend ?? 0,

      // Robot/automation (from demand, expansion dissolved)
      robotLoadTWh: o.robotLoadTWh ?? 0,
      robotsPer1000: o.robotsPer1000 ?? 0,

      // Production (biophysical)
      productionUsefulEnergy: o.productionUsefulEnergy ?? 0,
      // Compute from energy module outputs (the transform output
      // energySystemOverheadComputed is only available via the lag mechanism)
      energySystemOverhead: computeEnergySystemOverhead(o.additions, o.capacities),

      // Mineral constraint
      mineralConstraint: o.mineralConstraint ?? 1.0,

      // Water stress
      waterStress: o.waterStress ?? Object.fromEntries(REGIONS.map(r => [r, 0])),
      waterYieldFactor: o.waterYieldFactor ?? 1,

      // Infrastructure lock-in
      fossilStockTWh: o.fossilStockTWh ?? 0,

      // Heat stress
      heatStressLoss: o.heatStressLoss ?? Object.fromEntries(REGIONS.map(r => [r, 0])),

      // Regional
      regionalPopulation: o.regionalPopulation,
      regionalGdp: (() => {
        const regional = o.regional;
        if (!regional) return Object.fromEntries(REGIONS.map(r => [r, 0])) as Record<Region, number>;
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
  const results = toYearResults(autowireResult);
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

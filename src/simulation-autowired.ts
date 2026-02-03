/**
 * Auto-wired Simulation Runner
 *
 * Demonstrates Julia-inspired automatic dependency resolution.
 * Modules declare inputs/outputs, framework wires them automatically.
 *
 * Compare with simulation.ts which has 400+ lines of manual wiring.
 */

import { runAutowired, getOutputsAtYear, AutowireResult } from './framework/autowire.js';
import { demographicsModule } from './modules/demographics.js';
import { demandModule } from './modules/demand.js';
import { capitalModule } from './modules/capital.js';
import { energyModule, energyDefaults } from './modules/energy.js';
import { dispatchModule } from './modules/dispatch.js';
import { expansionModule } from './modules/expansion.js';
import { resourcesModule } from './modules/resources.js';
import { climateModule } from './modules/climate.js';
import { Region, REGIONS, EnergySource, ENERGY_SOURCES } from './framework/types.js';

// =============================================================================
// TRANSFORMS
// =============================================================================

/**
 * Transforms compute derived inputs from available outputs.
 * These handle cases where the input isn't a direct 1:1 mapping.
 *
 * Each transform declares its dependencies via `dependsOn` so the
 * dependency graph builder can create proper execution order.
 */
const transforms = {
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

  // Expansion needs cheapest LCOE (derived from lcoes record)
  cheapestLCOE: {
    fn: (outputs: Record<string, any>) => {
      const lcoes = outputs.lcoes;
      if (!lcoes) return 50; // Default
      return Math.min(...Object.values(lcoes) as number[]);
    },
    dependsOn: ['lcoes'],
  },

  // Expansion uses baseDemand (same as electricityDemand)
  baseDemand: {
    fn: (outputs: Record<string, any>) => outputs.electricityDemand,
    dependsOn: ['electricityDemand'],
  },

  // Expansion uses workingPopulation (same as working)
  workingPopulation: {
    fn: (outputs: Record<string, any>) => outputs.working,
    dependsOn: ['working'],
  },

  // Expansion uses investmentRate (from savingsRate)
  investmentRate: {
    fn: (outputs: Record<string, any>) => outputs.savingsRate,
    dependsOn: ['savingsRate'],
  },

  // Capital uses effectiveWorkers from demographics
  effectiveWorkers: {
    fn: (outputs: Record<string, any>) => outputs.effectiveWorkers,
    dependsOn: ['effectiveWorkers'],
  },

  // Capital uses gdp from demand
  gdp: {
    fn: (outputs: Record<string, any>) => outputs.gdp,
    dependsOn: ['gdp'],
  },

  // Capital uses lagged net energy factor (not wired in autowire yet)
  netEnergyFactor: {
    fn: () => 1,
    dependsOn: [],
  },

  // Dispatch uses adjusted demand from expansion (when available).
  // Energy also needs electricityDemand but runs BEFORE expansion, so it gets
  // the base value from demand module (via fallback).
  // NOTE: No dependsOn for adjustedDemand - that would create a cycle
  // (energy → expansion → energy). The transform uses fallback logic:
  // - After expansion runs: uses adjustedDemand
  // - Before expansion runs (for energy): uses electricityDemand from demand
  electricityDemand: {
    fn: (outputs: Record<string, any>) =>
      outputs.adjustedDemand ?? outputs.electricityDemand ?? 30000,
    dependsOn: ['electricityDemand'],  // Depend on base demand, not adjusted
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

  // Resources needs gdpPerCapita2025 (capture from year 0)
  gdpPerCapita2025: {
    fn: (outputs: Record<string, any>, _year: number, yearIndex: number) => {
      // For simplicity, calculate same as gdpPerCapita for year 0
      if (yearIndex === 0) {
        const gdp = outputs.gdp ?? 120;
        const pop = outputs.population ?? 8e9;
        return (gdp * 1e12) / pop;
      }
      // TODO: Would need state to track this properly
      return 15000; // Approximate 2025 value
    },
    dependsOn: ['gdp', 'population'],
  },

  // Climate needs total emissions
  emissions: {
    fn: (outputs: Record<string, any>) => {
      const elecEmissions = outputs.electricityEmissions ?? 10;
      const nonElecEmissions = outputs.nonElectricEmissions ?? 25;
      const landUse = outputs.netFlux ?? 0;
      return elecEmissions + nonElecEmissions + landUse;
    },
    dependsOn: ['electricityEmissions', 'nonElectricEmissions', 'netFlux'],
  },

  // Dispatch needs carbonPrice (parameter, not output - design limitation)
  // TODO: Refactor dispatch to take carbonPrice as param, not input
  carbonPrice: {
    fn: () => 35,
    dependsOn: [],  // No dependencies - constant value
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

  // Resources needs population from demographics (already output, but name might differ)
  population: {
    fn: (outputs: Record<string, any>) => outputs.population,
    dependsOn: ['population'],
  },

  // Demand needs electricityGeneration (from dispatch.totalGeneration)
  // NOTE: No dependsOn - this would create a cycle (demand→dispatch→demand).
  // The transform uses current-year value if available, otherwise defaults.
  // The lag 'laggedAvgLCOE' handles the feedback for cost-driven electrification.
  electricityGeneration: {
    fn: (outputs: Record<string, any>) => outputs.totalGeneration,
    dependsOn: [],
  },

  // Demand needs weightedAverageLCOE (derived from generation-weighted lcoes)
  // NOTE: No dependsOn - this would create a cycle (demand→dispatch→demand).
  // Uses default when dispatch hasn't run yet this year.
  weightedAverageLCOE: {
    fn: (outputs: Record<string, any>) => {
      const generation = outputs.generation;
      const lcoes = outputs.lcoes;
      if (!generation || !lcoes) return 50; // Default

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

  // ==========================================================================
  // REGIONAL TRANSFORMS (for regionalized energy/dispatch)
  // ==========================================================================

  // Regional electricity demand from demand module's regional outputs
  // Distribute based on demand module's regional electricity demand
  regionalElectricityDemand: {
    fn: (outputs: Record<string, any>) => {
      const regional = outputs.regional;
      if (!regional) {
        // Fallback: distribute global demand by GDP share
        const globalDemand = outputs.electricityDemand ?? 30000;
        const shares: Record<Region, number> = { oecd: 0.38, china: 0.31, em: 0.25, row: 0.06 };
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          result[r] = globalDemand * shares[r];
        }
        return result;
      }
      // Use regional electricity demand from demand module
      const result: Record<Region, number> = {} as any;
      for (const r of REGIONS) {
        result[r] = regional[r]?.electricityDemand ?? 0;
      }
      return result;
    },
    dependsOn: ['regional', 'electricityDemand'],
  },

  // Regional investment from capital module's regional savings
  regionalInvestment: {
    fn: (outputs: Record<string, any>) => {
      const investment = outputs.investment ?? 30;
      const regionalSavings = outputs.regionalSavings;

      if (!regionalSavings) {
        // Fallback: distribute by GDP share
        const shares: Record<Region, number> = { oecd: 0.49, china: 0.15, em: 0.29, row: 0.07 };
        const result: Record<Region, number> = {} as any;
        for (const r of REGIONS) {
          result[r] = investment * shares[r];
        }
        return result;
      }

      // Weight investment by regional savings rates
      let totalSavings = 0;
      for (const r of REGIONS) {
        totalSavings += regionalSavings[r] ?? 0;
      }
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
    fn: (outputs: Record<string, any>) => {
      return outputs.regionalCapacities ?? null;
    },
    dependsOn: ['regionalCapacities'],
  },

  // Regional carbon prices (from energy params - defaults)
  regionalCarbonPrice: {
    fn: () => {
      // Use energy module's regional carbon price defaults
      const result: Record<Region, number> = {} as any;
      for (const r of REGIONS) {
        result[r] = energyDefaults.regional[r].carbonPrice;
      }
      return result;
    },
    dependsOn: [],  // No dependencies - constant value from params
  },
};

// =============================================================================
// LAGS (FEEDBACK LOOPS)
// =============================================================================

/**
 * Lags handle feedback loops by using previous year's values.
 */
const lags = {
  // Demand needs lagged climate damages
  regionalDamages: {
    source: 'regionalDamages',
    delay: 1,
    initial: { oecd: 0, china: 0, em: 0, row: 0 } as Record<Region, number>,
  },

  // Demand needs lagged energy burden damage
  energyBurdenDamage: {
    source: 'damages', // Use climate damages as proxy for now
    delay: 1,
    initial: 0,
  },

  // Capital needs lagged damages
  damages: {
    source: 'damages',
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
    initial: 50, // $/MWh default
  },
};

// =============================================================================
// RUN SIMULATION
// =============================================================================

export function runAutowiredSimulation(params: {
  carbonPrice?: number;
  sensitivity?: number;
  startYear?: number;
  endYear?: number;
} = {}): AutowireResult {
  return runAutowired({
    modules: [
      demographicsModule,
      demandModule,
      capitalModule,
      energyModule,
      expansionModule,
      dispatchModule,
      resourcesModule,
      climateModule,
    ],
    transforms,
    lags,
    params: {
      energy: { carbonPrice: params.carbonPrice ?? 35 },
      climate: { sensitivity: params.sensitivity ?? 3.0 },
    },
    startYear: params.startYear ?? 2025,
    endYear: params.endYear ?? 2100,
  });
}

// =============================================================================
// CLI
// =============================================================================

if (process.argv[1]?.endsWith('simulation-autowired.ts') ||
    process.argv[1]?.endsWith('simulation-autowired.js')) {

  console.log('=== tsimulation Auto-Wired Demo ===\n');

  try {
    const result = runAutowiredSimulation({
      startYear: 2025,
      endYear: 2050, // Shorter for demo
    });

    console.log('Modules executed in topological order based on dependencies.\n');

    // Sample output
    console.log('Year  Pop(B)  Temp(°C)  GridInt');
    console.log('----  ------  --------  -------');

    for (let i = 0; i <= 25; i += 5) {
      const outputs = getOutputsAtYear(result, i);
      const year = 2025 + i;
      const pop = (outputs.population / 1e9).toFixed(2);
      const temp = (outputs.temperature ?? 0).toFixed(2);
      const grid = (outputs.gridIntensity ?? 0).toFixed(0);

      console.log(`${year}  ${pop.padStart(6)}  ${temp.padStart(8)}  ${grid.padStart(7)}`);
    }

    console.log('\n✓ Auto-wiring successful!');
    console.log(`  Years simulated: ${result.years.length}`);
    console.log(`  Modules: ${Object.keys(result.outputs).join(', ')}`);

  } catch (err) {
    console.error('Auto-wiring failed:', (err as Error).message);
    process.exit(1);
  }
}

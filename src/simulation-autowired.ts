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
import { energyModule } from './modules/energy.js';
import { dispatchModule } from './modules/dispatch.js';
import { expansionModule } from './modules/expansion.js';
import { resourcesModule } from './modules/resources.js';
import { climateModule } from './modules/climate.js';
import { Region } from './framework/types.js';

// =============================================================================
// TRANSFORMS
// =============================================================================

/**
 * Transforms compute derived inputs from available outputs.
 * These handle cases where the input isn't a direct 1:1 mapping.
 */
const transforms = {
  // Energy needs availableInvestment (from capital.investment)
  availableInvestment: (outputs: Record<string, any>) => outputs.investment ?? 30,

  // Energy needs stabilityFactor (from capital.stability)
  stabilityFactor: (outputs: Record<string, any>) => outputs.stability ?? 1.0,

  // Expansion needs cheapest LCOE (derived from lcoes record)
  cheapestLCOE: (outputs: Record<string, any>) => {
    const lcoes = outputs.lcoes;
    if (!lcoes) return 50; // Default
    return Math.min(...Object.values(lcoes) as number[]);
  },

  // Expansion uses baseDemand (same as electricityDemand)
  baseDemand: (outputs: Record<string, any>) => outputs.electricityDemand,

  // Expansion uses workingPopulation (same as working)
  workingPopulation: (outputs: Record<string, any>) => outputs.working,

  // Expansion uses investmentRate (from savingsRate)
  investmentRate: (outputs: Record<string, any>) => outputs.savingsRate,

  // Capital uses effectiveWorkers from demographics
  effectiveWorkers: (outputs: Record<string, any>) => outputs.effectiveWorkers,

  // Capital uses gdp from demand
  gdp: (outputs: Record<string, any>) => outputs.gdp,

  // Dispatch uses adjusted demand from expansion
  electricityDemand: (outputs: Record<string, any>) =>
    outputs.adjustedDemand ?? outputs.electricityDemand ?? 30000,

  // Resources needs gdpPerCapita (derived)
  gdpPerCapita: (outputs: Record<string, any>) => {
    const gdp = outputs.gdp ?? 120;
    const pop = outputs.population ?? 8e9;
    return (gdp * 1e12) / pop;
  },

  // Resources needs gdpPerCapita2025 (capture from year 0)
  gdpPerCapita2025: (outputs: Record<string, any>, _year: number, yearIndex: number) => {
    // For simplicity, calculate same as gdpPerCapita for year 0
    if (yearIndex === 0) {
      const gdp = outputs.gdp ?? 120;
      const pop = outputs.population ?? 8e9;
      return (gdp * 1e12) / pop;
    }
    // TODO: Would need state to track this properly
    return 15000; // Approximate 2025 value
  },

  // Climate needs total emissions
  emissions: (outputs: Record<string, any>) => {
    const elecEmissions = outputs.electricityEmissions ?? 10;
    const nonElecEmissions = outputs.nonElectricEmissions ?? 25;
    const landUse = outputs.netFlux ?? 0;
    return elecEmissions + nonElecEmissions + landUse;
  },

  // Dispatch needs carbonPrice (parameter, not output - design limitation)
  // TODO: Refactor dispatch to take carbonPrice as param, not input
  carbonPrice: () => 35,

  // Dispatch needs solarPlusBatteryLCOE from energy
  solarPlusBatteryLCOE: (outputs: Record<string, any>) => outputs.solarPlusBatteryLCOE ?? 30,

  // Dispatch needs capacities from energy
  capacities: (outputs: Record<string, any>) => outputs.capacities,

  // Dispatch needs lcoes from energy
  lcoes: (outputs: Record<string, any>) => outputs.lcoes,

  // Resources needs additions from energy
  additions: (outputs: Record<string, any>) => outputs.additions ?? {},

  // Resources needs population from demographics (already output, but name might differ)
  population: (outputs: Record<string, any>) => outputs.population,
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

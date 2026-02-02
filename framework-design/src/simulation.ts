/**
 * Main Simulation - Wires all modules together
 *
 * This shows the dependency graph and how modules connect.
 *
 * DEPENDENCY GRAPH:
 *
 *   demographics ─────────────────────────────────────┐
 *        │                                            │
 *        ▼                                            │
 *   demand ──────────────► electricityDemand ─────────┼───► energy
 *        │                                            │        │
 *        │                                            │        │
 *        ▼                                            │        ▼
 *   expansion ◄──── cheapestLCOE ◄────────────────────┼─── capacities
 *        │                                            │        │
 *        │                                            │        │
 *        ▼                                            │        ▼
 *   adjustedDemand ───────────────────────────────────┼───► dispatch
 *                                                     │        │
 *   capital ◄──── gdp ◄───────────────────────────────┤        │
 *        │                                            │        ▼
 *        ▼                                            │    emissions
 *   availableInvestment ──────────────────────────────┘        │
 *        │                                                     │
 *        │                                                     ▼
 *        └─────────────────────────────────────────────► climate
 *                                                           │
 *                                                           │
 *                                                           ▼
 *                                                      damages ────► demand (feedback)
 *
 *
 * FEEDBACK LOOPS:
 * 1. damages → demand (GDP reduction) → emissions → climate → damages
 * 2. cheapestLCOE → expansion → adjustedDemand → dispatch → emissions
 * 3. investment → capacity additions → learning → LCOE → investment profitability
 */

import { createSimulation, Simulation, SimulationConfig } from './framework/simulation';
import { climateModule } from './modules/climate';
import { dispatchModule } from './modules/dispatch';
import { energyModule } from './modules/energy';
// Future imports:
// import { demographicsModule } from './modules/demographics';
// import { demandModule } from './modules/demand';
// import { capitalModule } from './modules/capital';
// import { resourcesModule } from './modules/resources';
// import { expansionModule } from './modules/expansion';

/**
 * Create the full simulation with all modules
 */
export function createFullSimulation(config?: SimulationConfig): Simulation {
  return createSimulation(
    [
      // Core modules (dependency order handled by framework)
      energyModule,
      dispatchModule,
      climateModule,
      // demographicsModule,
      // demandModule,
      // capitalModule,
      // resourcesModule,
      // expansionModule,
    ],
    {
      startYear: 2025,
      endYear: 2100,
      maxIterations: 3,  // For feedback convergence
      verbose: false,
      ...config,
    }
  );
}

/**
 * Quick scenario runner (like runScenario in current code)
 */
export function runScenario(params: {
  carbonPrice?: number;
  solarAlpha?: number;
  climSensitivity?: number;
  // ... other tier-1 params
}): Record<string, any> {
  const sim = createFullSimulation();

  // Register with parameter overrides
  const results = sim.run({
    energy: {
      carbonPrice: params.carbonPrice,
      sources: params.solarAlpha
        ? { solar: { alpha: params.solarAlpha } }
        : undefined,
    },
    climate: {
      climSensitivity: params.climSensitivity,
    },
  });

  // Derive flat metrics for easy consumption
  return deriveScenarioMetrics(results);
}

/**
 * Derive flat metrics from results (like runScenario output)
 */
function deriveScenarioMetrics(results: any): Record<string, any> {
  // This would compute all the m.warming2100, m.peakEmissionsYear, etc.
  // that the current runScenario returns
  return {
    // Placeholder - actual implementation would use query helpers
    warming2100: 0,
    peakEmissionsYear: 0,
    // ...
  };
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/*
// Basic usage:
const sim = createFullSimulation();
const results = sim.run();

// Access results:
results.modules.climate.temperature  // Array of temps 2025-2100
results.modules.dispatch.gridIntensity
results.modules.energy.lcoes

// With overrides:
const results2 = sim.run({
  energy: { carbonPrice: 150 },
  climate: { climSensitivity: 4.5 }
});

// Quick scenario:
const metrics = runScenario({ carbonPrice: 100 });
console.log(`Warming: ${metrics.warming2100}°C`);


// Query helpers:
import { query } from './framework/timeseries';

const crossover = query.crossover(results, 'energy', 'solarLCOE', 'energy', 'gasLCOE');
console.log(`Solar beats gas in ${crossover.year}`);

const peakEmissions = query.peakYear(results, 'climate', 'emissions');
console.log(`Peak emissions in ${peakEmissions.year}: ${peakEmissions.value} Gt`);
*/

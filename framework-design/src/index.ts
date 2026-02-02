/**
 * tsimulation - TypeScript Energy/Demographics Simulation Framework
 *
 * Main entry point for programmatic use.
 */

// Simulation
export {
  Simulation,
  runSimulation,
  runWithScenario,
  SimulationParams,
  SimulationResult,
  SimulationMetrics,
  YearResult,
} from './simulation.js';

// Scenario loader
export {
  Scenario,
  loadScenario,
  scenarioToParams,
  listScenarios,
  getScenarioPath,
  deepMerge,
} from './scenario.js';

// Modules (for advanced use)
export { demographicsModule, demographicsDefaults } from './modules/demographics.js';
export { demandModule, demandDefaults } from './modules/demand.js';
export { capitalModule, capitalDefaults } from './modules/capital.js';
export { energyModule, energyDefaults } from './modules/energy.js';
export { dispatchModule, dispatchDefaults } from './modules/dispatch.js';
export { expansionModule, expansionDefaults } from './modules/expansion.js';
export { resourcesModule, resourcesDefaults } from './modules/resources.js';
export { climateModule, climateDefaults } from './modules/climate.js';

// Framework primitives
export { compound, learningCurve, depletion, logistic, poissonShock } from './primitives/math.js';

// Types
export type { Region, EnergySource, ValidationResult } from './framework/types.js';

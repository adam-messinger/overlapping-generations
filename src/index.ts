/**
 * tsimulation - TypeScript Energy/Demographics Simulation Framework
 *
 * Main entry point for programmatic use.
 */

// Simulation
export { Simulation, runSimulation, runWithScenario } from './simulation.js';
export type { SimulationParams, SimulationResult, SimulationMetrics, YearResult } from './simulation.js';

// Scenario loader
export { loadScenario, scenarioToParams, listScenarios, getScenarioPath, deepMerge } from './scenario.js';
export type { Scenario } from './scenario.js';

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

// Agent introspection
export { describeParameters, describeOutputs, buildParams, buildMultiParams, listParameters } from './introspection.js';
export type { ParameterInfo, ParameterSchema, OutputInfo, OutputSchema } from './introspection.js';

// Auto-wired simulation
export { runAutowired, buildOutputRegistry, buildDependencyGraph, topologicalSort, getOutputsAtYear, getTimeSeries } from './framework/autowire.js';
export type { TransformFn, TransformConfig, TransformEntry, LagConfig, AutowireConfig, AutowireResult, AnyModule } from './framework/autowire.js';
export { runAutowiredSimulation } from './simulation-autowired.js';

// Result helpers
export { getAtYear, extractTimeSeries } from './helpers.js';

// Types
export type { Region, EnergySource, ValidationResult } from './framework/types.js';

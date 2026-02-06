/**
 * tsimulation - TypeScript Energy/Demographics Simulation Framework
 *
 * Main entry point for programmatic use.
 */

// Simulation
export { runSimulation, runWithScenario } from './simulation.js';
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
export { productionModule, productionDefaults } from './modules/production.js';
export { resourcesModule, resourcesDefaults } from './modules/resources.js';
export { climateModule, climateDefaults } from './modules/climate.js';

// Framework primitives
export { compound, learningCurve, depletion, logistic, poissonShock } from './primitives/math.js';

// Component params (Julia ComponentArrays-inspired)
export { ComponentParams } from './framework/component-params.js';

// Agent introspection
export { describeParameters, describeOutputs, buildParams, buildMultiParams, listParameters } from './introspection.js';
export type { ParameterInfo, ParameterSchema, OutputInfo, OutputSchema } from './introspection.js';

// Auto-wired simulation
export { runAutowired, initAutowired, stepAutowired, finalizeAutowired, buildOutputRegistry, buildDependencyGraph, topologicalSort, getOutputsAtYear, getTimeSeries, validateConnectorTypes } from './framework/autowire.js';
export type { TransformFn, TransformConfig, TransformEntry, LagConfig, AutowireConfig, AutowireResult, AutowireState, AnyModule } from './framework/autowire.js';
export type { ConnectorType } from './framework/module.js';
export { runAutowiredSimulation, runAutowiredFull, toYearResults, computeMetrics } from './simulation-autowired.js';

// Problem-solve separation (Julia SciML-inspired)
export { defineSimulation, solve, init } from './framework/problem.js';
export type { SimulationProblem, StepResult, Stepper } from './framework/problem.js';

// Declarative data collectors
export { collectResults, standardCollectors } from './framework/collectors.js';
export type { TimeseriesDef, MetricDef, MetricAggregator, CollectorConfig, CollectedResults } from './framework/collectors.js';

// Result helpers
export { getAtYear, extractTimeSeries } from './helpers.js';

// Types
export type { Region, EnergySource, ValidationResult } from './framework/types.js';

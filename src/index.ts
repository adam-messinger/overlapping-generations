/**
 * tsimulation - TypeScript Energy/Demographics Simulation Framework
 *
 * Main entry point for programmatic use.
 */

// Simulation
export { runSimulation, runWithScenario } from './simulation.js';
export type { SimulationParams, RunOptions, SimulationResult, SimulationMetrics, YearResult } from './simulation.js';

// Scenario loader
export { loadScenario, scenarioToParams, listScenarios, getScenarioPath, deepMerge } from './scenario.js';
export type { Scenario } from './scenario.js';

// Modules (for advanced use)
export { demographicsModule, demographicsDefaults } from './modules/demographics.js';
export { demandModule, demandDefaults } from './modules/demand.js';
export { capitalModule, capitalDefaults } from './modules/capital.js';
export { generationsModule, generationsDefaults } from './modules/generations.js';
export type { GenerationsParams, CohortAccount, CohortStatus } from './modules/generations.js';
export { energyModule, energyDefaults } from './modules/energy.js';
export { dispatchModule, dispatchDefaults } from './modules/dispatch.js';
export { productionModule, productionDefaults } from './modules/production.js';
export { resourcesModule, resourcesDefaults } from './modules/resources.js';
export { cdrModule, cdrDefaults } from './modules/cdr.js';
export { climateModule, climateDefaults } from './modules/climate.js';

// Framework primitives
export { compound, learningCurve, depletion, logistic, poissonShock } from './primitives/math.js';

// Component params (Julia ComponentArrays-inspired)
export { ComponentParams } from 'tsimulation';

// Agent introspection
export { describeParameters, describeOutputs, buildParams, buildMultiParams, listParameters } from './introspection.js';
export type { ParameterInfo, ParameterSchema, OutputInfo, OutputSchema } from './introspection.js';

// Auto-wired simulation
export { runAutowired, initAutowired, stepAutowired, finalizeAutowired, buildOutputRegistry, buildDependencyGraph, topologicalSort, getOutputsAtYear, getTimeSeries, validateConnectorTypes } from 'tsimulation';
export type { TransformFn, TransformConfig, TransformEntry, LagConfig, AutowireConfig, AutowireResult, AutowireState, AnyModule } from 'tsimulation';
export type { PortMeta, PortValueType } from 'tsimulation';
export { runAutowiredSimulation, runAutowiredFull, toYearResults, computeMetrics } from './simulation-autowired.js';

// Problem-solve separation (Julia SciML-inspired)
export { defineSimulation, solve, init } from 'tsimulation';
export type { SimulationProblem, StepperResult, Stepper } from 'tsimulation';

// Declarative data collectors (generic framework)
export {
  assertCollectorContracts,
  auditCollectorContracts,
  collectResults,
  resolveCollectorContract,
  resolveKey,
  summarizePortUnits,
} from 'tsimulation';
export type {
  TimeseriesDef,
  MetricDef,
  MetricAggregator,
  CollectorConfig,
  CollectedResults,
  CollectorContractAudit,
} from 'tsimulation';

// Standard collectors (domain-specific)
export { standardCollectors, computeEnergySystemOverhead } from './standard-collectors.js';

// Result helpers
export { getAtYear, extractTimeSeries } from './helpers.js';

// Domain types
export type { Region, EnergySource } from './domain-types.js';

// Hormuz transport/energy bottleneck extension
export { hormuzDefaults, hormuzScenarios } from './simulations/critical-materials/hormuz-data.js';
export type { HormuzModelParams, HormuzScenario, HormuzScenarioId } from './simulations/critical-materials/hormuz-data.js';
export { simulateHormuzDisruption, withHormuzParams } from './simulations/critical-materials/hormuz-model.js';
export type { HormuzSimulationResult, HormuzMonthResult, AnnualHormuzShock } from './simulations/critical-materials/hormuz-model.js';
export { calibrateHormuzModel, scoreHormuzBackcast } from './simulations/critical-materials/hormuz-calibration.js';
export { buildHormuzGlobalOverrides, compareHormuzGlobalImpact } from './simulations/critical-materials/hormuz-bridge.js';

// Aviation infrastructure and air-mobility traffic extension
export {
  aviationEvidence,
  aviationInfrastructureScenarios,
  centralAviationScenario,
  paloAltoTrafficHistory,
  tafFacilityTrafficHistory,
} from './simulations/aviation-infrastructure/data.js';
export type {
  AirMobilityArchitecture,
  AirMobilityMarket,
  AviationFacilityClass,
  AviationInfrastructureScenario,
} from './simulations/aviation-infrastructure/data.js';
export { simulateAviationInfrastructure } from './simulations/aviation-infrastructure/model.js';
export type {
  ArchitectureYearResult,
  AviationInfrastructureResult,
  AviationInfrastructureYear,
  FacilityTrafficYearResult,
} from './simulations/aviation-infrastructure/model.js';
export {
  analyzeAviationSensitivity,
  backtestConventionalTraffic,
  evaluateEarlyAamBenchmark,
  naiveExtrapolatedAamFlights,
  projectPaloAltoTraffic,
} from './simulations/aviation-infrastructure/calibration.js';
export {
  BAY_AREA_PRIVATE_JET_AIRPORT_CODES,
  bayAreaPrivateJetAirportProfiles,
  bayAreaPrivateJetScenarios,
  projectBayAreaPrivateJetTraffic,
} from './simulations/aviation-infrastructure/bay-area-private-jets.js';
export type {
  BayAreaAirportPrivateJetYear,
  BayAreaAirportRole,
  BayAreaPrivateJetAirportCode,
  BayAreaPrivateJetAirportProfile,
  BayAreaPrivateJetResult,
  BayAreaPrivateJetScenario,
  BayAreaPrivateJetYear,
  BayAreaTafTrafficKnot,
} from './simulations/aviation-infrastructure/bay-area-private-jets.js';

// Framework types
export type { ValidationResult } from 'tsimulation';

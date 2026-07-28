/**
 * tsimulation — public API barrel.
 *
 * A dependency-free engine for modular, discrete-time simulations.
 */

export * from './types.js';
export * from './module.js';
export * from './autowire.js';
export * from './problem.js';
export * from './introspect.js';
export * from './validated-merge.js';
export * from './component-params.js';
export * from './validation.js';
export * from './units.js';
export * from './equation.js';
export * from './graph.js';
export * from './solvers.js';
export * from './serialization.js';
export * from './semantics.js';
export * from './data.js';
export * from './evidence.js';
export * from './model.js';
export * from './adapter.js';
export * from './calibration.js';
export * from './experiment.js';
export * from './study.js';
export * from './ensemble.js';
export * from './shock-ledger.js';
export * from './manifest.js';
export * from './liveness.js';
export * from './stock-flow.js';
export * from './godley.js';
export * from './dynamics.js';
export {
  assertCollectorContracts,
  auditCollectorContracts,
  collectResults,
  resolveCollectorContract,
  resolveKey,
  resolvePortPath,
  summarizePortUnits,
} from './collectors.js';
export type {
  TimeseriesDef,
  MetricDef,
  MetricAggregator,
  CollectorConfig,
  CollectedResults,
  CollectorContractAudit,
} from './collectors.js';

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
export { collectResults, resolveKey } from './collectors.js';
export type { TimeseriesDef, MetricDef, MetricAggregator, CollectorConfig, CollectedResults } from './collectors.js';

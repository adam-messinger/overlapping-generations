/**
 * Framework barrel export.
 *
 * All generic, domain-independent framework primitives.
 * Domain types (Region, EnergySource, etc.) live in ../domain-types.ts.
 * Domain collectors (standardCollectors, etc.) live in ../standard-collectors.ts.
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

/**
 * Declarative Data Collection
 *
 * Replaces manual YearResult construction with declared collectors.
 * Collectors define how to extract timeseries data and summary metrics
 * from raw AutowireResult.
 *
 * This file is domain-independent. Domain-specific collectors
 * (standardCollectors, computeEnergySystemOverhead) live in
 * ../standard-collectors.ts.
 *
 * Usage:
 *   const config = standardCollectors;  // or custom
 *   const { timeseries, metrics } = collectResults(autowireResult, config);
 */

import { AutowireResult, getOutputsAtYear } from './autowire.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * How to extract a value from the flat outputs of a single year.
 *
 * - source: output key to read (e.g., 'temperature', 'generation')
 * - as: optional rename for the result field (defaults to source)
 * - path: optional dot-path for nested extraction (e.g., 'copper.demand')
 * - transform: optional function to derive value from all outputs
 * - unit: output unit for introspection (e.g., '°C', 'TWh')
 * - description: human-readable description for introspection
 * - module: originating module name for introspection
 */
export interface TimeseriesDef {
  source: string;
  as?: string;
  path?: string;
  transform?: (outputs: Record<string, any>, year: number, yearIndex: number) => any;
  unit?: string;
  description?: string;
  module?: string;
}

/**
 * Metric aggregation types
 */
export type MetricAggregator =
  | 'last'                              // Value at final year
  | 'max'                               // Maximum value across all years
  | 'min'                               // Minimum value across all years
  | { first: (value: any, year: number) => boolean }  // First year matching condition
  | { peak: true }                      // { value, year } of maximum
  | { custom: (values: any[], years: number[]) => any }; // Arbitrary aggregation

/**
 * How to compute a summary metric from timeseries data.
 *
 * - source: timeseries field to aggregate (must match a timeseries 'as' or 'source')
 * - as: name for the metric in output
 * - aggregator: how to reduce the timeseries to a single value
 * - transform: optional function over all year outputs (for multi-field metrics)
 */
export interface MetricDef {
  source?: string;
  as: string;
  aggregator: MetricAggregator;
  transform?: (outputs: Record<string, any>, year: number, yearIndex: number) => any;
}

/**
 * Collector configuration
 */
export interface CollectorConfig {
  timeseries: TimeseriesDef[];
  metrics: MetricDef[];
}

/**
 * Collected results
 */
export interface CollectedResults {
  years: number[];
  timeseries: Record<string, any>[];  // Per-year records
  metrics: Record<string, any>;       // Summary metrics
}

// =============================================================================
// EXTRACTION
// =============================================================================

/**
 * Extract a value from flat outputs using a timeseries definition.
 */
function extractValue(def: TimeseriesDef, outputs: Record<string, any>, year: number, yearIndex: number): any {
  if (def.transform) {
    return def.transform(outputs, year, yearIndex);
  }

  let value = outputs[def.source];

  // Navigate nested path if specified
  if (def.path && value != null && typeof value === 'object') {
    const parts = def.path.split('.');
    for (const part of parts) {
      value = value?.[part];
    }
  }

  return value;
}

/**
 * Resolve the key name for a timeseries definition.
 */
export function resolveKey(def: TimeseriesDef): string {
  return def.as ?? def.source;
}

// =============================================================================
// AGGREGATION
// =============================================================================

/**
 * Aggregate a series of values into a metric.
 */
function aggregate(values: any[], years: number[], aggregator: MetricAggregator): any {
  if (aggregator === 'last') {
    return values[values.length - 1];
  }

  if (aggregator === 'max') {
    return Math.max(...values.filter(v => typeof v === 'number'));
  }

  if (aggregator === 'min') {
    return Math.min(...values.filter(v => typeof v === 'number'));
  }

  if (typeof aggregator === 'object' && 'first' in aggregator) {
    for (let i = 0; i < values.length; i++) {
      if (aggregator.first(values[i], years[i])) {
        return years[i];
      }
    }
    return null;
  }

  if (typeof aggregator === 'object' && 'peak' in aggregator) {
    let maxVal = -Infinity;
    let maxYear = years[0];
    for (let i = 0; i < values.length; i++) {
      if (typeof values[i] === 'number' && values[i] > maxVal) {
        maxVal = values[i];
        maxYear = years[i];
      }
    }
    return { value: maxVal, year: maxYear };
  }

  if (typeof aggregator === 'object' && 'custom' in aggregator) {
    return aggregator.custom(values, years);
  }

  return undefined;
}

// =============================================================================
// COLLECT
// =============================================================================

/**
 * Execute collectors against an AutowireResult.
 */
export function collectResults(result: AutowireResult, config: CollectorConfig): CollectedResults {
  const { years } = result;
  const timeseries: Record<string, any>[] = [];

  // Collect timeseries per year
  for (let i = 0; i < years.length; i++) {
    const outputs = getOutputsAtYear(result, i);
    const record: Record<string, any> = { year: years[i] };

    for (const def of config.timeseries) {
      const key = resolveKey(def);
      record[key] = extractValue(def, outputs, years[i], i);
    }

    timeseries.push(record);
  }

  // Collect metrics
  const metrics: Record<string, any> = {};

  for (const def of config.metrics) {
    if (def.transform) {
      // Multi-field metric: compute per-year values then aggregate
      const values: any[] = [];
      for (let i = 0; i < years.length; i++) {
        const outputs = getOutputsAtYear(result, i);
        values.push(def.transform(outputs, years[i], i));
      }
      metrics[def.as] = aggregate(values, years, def.aggregator);
    } else if (def.source) {
      // Single-field metric: extract from timeseries
      const values = timeseries.map(r => r[def.source!]);
      metrics[def.as] = aggregate(values, years, def.aggregator);
    }
  }

  return { years, timeseries, metrics };
}

/**
 * Declarative Data Collection
 *
 * Replaces manual YearResult construction with declared collectors.
 * Collectors define how to extract timeseries data and summary metrics
 * from raw AutowireResult.
 *
 * Define collectors describing which outputs to extract as time series and
 * how to aggregate them into summary metrics.
 *
 * Usage:
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
 * - source: the produced timeseries key to aggregate — a timeseries def's `as`
 *   if it set one, otherwise its `source` (validated; an unknown key throws)
 * - as: name for the metric in output
 * - aggregator: how to reduce the timeseries to a single value
 * - transform: optional function over all year outputs (for multi-field metrics)
 *
 * Exactly one of `source` or `transform` must be set.
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

const isNumber = (v: unknown): v is number => typeof v === 'number';

/**
 * Aggregate a series of values into a metric.
 */
function aggregate(values: any[], years: number[], aggregator: MetricAggregator): any {
  if (aggregator === 'last') {
    return values[values.length - 1];
  }

  if (aggregator === 'max' || aggregator === 'min') {
    // Return undefined — not a silent -Infinity/Infinity — when there is no
    // numeric value. Reduce (not Math.max(...spread)) also avoids a call-stack
    // overflow when a generic series is very long.
    const nums = values.filter(isNumber);
    if (nums.length === 0) return undefined;
    const pick = aggregator === 'max' ? Math.max : Math.min;
    return nums.reduce((a, b) => pick(a, b));
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
    let found = false;
    for (let i = 0; i < values.length; i++) {
      if (isNumber(values[i])) {
        found = true;
        if (values[i] > maxVal) {
          maxVal = values[i];
          maxYear = years[i];
        }
      }
    }
    return found ? { value: maxVal, year: maxYear } : undefined;
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

  // Validate metric configs before doing any work (fail fast, like
  // validateWiring). Each metric needs exactly one of source/transform, and a
  // `source` must name a *produced* timeseries key — the resolved name (`as` if
  // the timeseries def set one, else its `source`), not the raw source.
  const timeseriesKeys = new Set(config.timeseries.map(resolveKey));
  for (const def of config.metrics) {
    if (def.transform) continue;
    if (!def.source) {
      throw new Error(`Metric '${def.as}' has neither a 'source' nor a 'transform'`);
    }
    if (!timeseriesKeys.has(def.source)) {
      const renamed = config.timeseries.find(t => t.source === def.source && t.as && t.as !== def.source);
      const hint = renamed ? ` (a timeseries has source '${def.source}' but was renamed via as: '${renamed.as}')` : '';
      throw new Error(`Metric '${def.as}' reads timeseries key '${def.source}' which no timeseries def produces${hint}`);
    }
  }

  // Collect timeseries per year
  const timeseries: Record<string, any>[] = [];
  for (let i = 0; i < years.length; i++) {
    const outputs = getOutputsAtYear(result, i);
    const record: Record<string, any> = { year: years[i] };

    for (const def of config.timeseries) {
      const key = resolveKey(def);
      record[key] = extractValue(def, outputs, years[i], i);
    }

    timeseries.push(record);
  }

  // Collect metrics (config validated above)
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
    } else {
      // Single-field metric: extract from a produced timeseries key
      const values = timeseries.map(r => r[def.source!]);
      metrics[def.as] = aggregate(values, years, def.aggregator);
    }
  }

  return { years, timeseries, metrics };
}

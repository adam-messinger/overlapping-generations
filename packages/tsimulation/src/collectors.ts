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

import {
  connectorSpecToPortMeta,
  getOutputsAtYear,
  type AnyModule,
  type AutowireResult,
} from './autowire.js';
import type { ConnectorSpec } from './module.js';
import {
  areUnitsIdentical,
  auditPortSemantics,
  assertPortValue,
  isMetadataPort,
  isObjectPort,
  isOpaquePort,
  isQuantityPort,
  isRecordPort,
  isVectorPort,
  validatePortMeta,
  validatePortCompatibility,
  type PortMeta,
  type QuantityPortMeta,
} from './units.js';
import {
  compareEstimands,
  validateSemanticDerivation,
  type MeasurementCrosswalk,
  type SemanticCrosswalk,
  type SemanticDerivation,
  type SemanticValidationMode,
} from './semantics.js';

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
 * - unit: optional asserted unit for introspection; direct collectors derive
 *   their authoritative contract from the producer
 * - description: human-readable description for introspection
 * - module: originating module name for introspection
 * - inputTypes/outputType: mandatory signatures for transformed collectors
 */
export interface TimeseriesDef {
  source: string;
  as?: string;
  path?: string;
  transform?: (outputs: Record<string, any>, year: number, yearIndex: number) => any;
  inputTypes?: Record<string, ConnectorSpec>;
  outputType?: ConnectorSpec;
  inputCrosswalks?: Record<string, SemanticCrosswalk>;
  inputMeasurementCrosswalks?: Record<string, MeasurementCrosswalk>;
  derivation?: SemanticDerivation;
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
  /** Required for transformed/custom metrics under strict semantic validation. */
  outputType?: ConnectorSpec;
  derivation?: SemanticDerivation;
}

/**
 * Collector configuration
 */
export interface CollectorConfig {
  timeseries: TimeseriesDef[];
  metrics: MetricDef[];
  semanticValidation?: SemanticValidationMode;
}

/**
 * Collected results
 */
export interface CollectedResults {
  years: number[];
  timeseries: Record<string, any>[];  // Per-year records
  metrics: Record<string, any>;       // Summary metrics
  contracts: {
    timeseries: Record<string, PortMeta>;
    metrics: Record<string, PortMeta>;
  };
}

export interface CollectorContractAudit {
  valid: boolean;
  errors: string[];
  collectors: number;
  directCollectors: number;
  transformedCollectors: number;
}

interface ProducerContract {
  module: string;
  spec: ConnectorSpec;
}

type ProducerContracts = Readonly<Record<string, ProducerContract>>;

function producerContractsFromModules(modules: readonly AnyModule[]): ProducerContracts {
  return Object.fromEntries(
    modules.flatMap((mod) =>
      mod.outputs.map((output) => {
        const name = String(output);
        const spec = (mod.connectorTypes.outputs as Record<string, ConnectorSpec>)[name];
        return [name, { module: mod.name, spec }] as const;
      }),
    ),
  );
}

function scalarQuantity(port: QuantityPortMeta): QuantityPortMeta {
  return {
    ...port,
    valueType: 'number',
    optional: false,
    nullable: false,
  };
}

/**
 * Resolve a collector's dot-path through a recursive producer contract.
 * Homogeneous legacy record connectors can validate the leaf unit even though
 * they do not declare keys; fixed object/record schemas validate every key.
 */
export function resolvePortPath(
  root: PortMeta,
  path: string | undefined,
  context = 'collector source',
): PortMeta {
  if (!path) return root;
  const parts = path.split('.');
  if (parts.some((part) => !part)) throw new Error(`${context}: invalid empty path segment in '${path}'`);
  let current = root;
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (isObjectPort(current)) {
      const next = (current.fields as Readonly<Record<string, PortMeta>>)[part];
      if (!next) throw new Error(`${context}: path '${path}' has no field '${part}'`);
      current = next;
      continue;
    }
    if (isRecordPort(current)) {
      if (current.keys && !current.keys.includes(part)) {
        throw new Error(`${context}: path '${path}' uses undeclared record key '${part}'`);
      }
      current = current.values;
      continue;
    }
    if (isVectorPort(current)) {
      if (!/^\d+$/.test(part)) {
        throw new Error(`${context}: path '${path}' must use a numeric vector index, got '${part}'`);
      }
      current = current.items;
      continue;
    }
    if (isQuantityPort(current) && current.valueType && current.valueType !== 'number') {
      // A homogeneous record/nested-record connector has one unit at every
      // numeric leaf but no field schema. The remaining path therefore has
      // the same scalar quantity contract.
      return scalarQuantity(current);
    }
    if (isOpaquePort(current)) {
      throw new Error(`${context}: path '${path}' enters an opaque contract at '${part}'`);
    }
    throw new Error(`${context}: path '${path}' continues through a non-structured value at '${part}'`);
  }
  return current;
}

function transformedContract(def: TimeseriesDef, context: string): PortMeta {
  if (!def.outputType) {
    throw new Error(`${context}: transformed collector must declare outputType`);
  }
  const contract = connectorSpecToPortMeta(def.outputType);
  validatePortMeta(contract, `${context} output`);
  return contract;
}

function validateDeclaredUnit(def: TimeseriesDef, contract: PortMeta, context: string): void {
  if (!def.unit) return;
  if (!isQuantityPort(contract)) {
    throw new Error(
      `${context}: structured or metadata contracts cannot be represented by one unit '${def.unit}'; ` +
      `omit unit and use the derived contract`,
    );
  }
  if (!areUnitsIdentical(contract.unit, def.unit)) {
    throw new Error(
      `${context}: collector unit '${def.unit}' does not match producer/output contract '${contract.unit}'`,
    );
  }
}

function resolveCollectorAgainstRegistry(
  def: TimeseriesDef,
  producers: ProducerContracts,
  context: string,
  semanticValidation: SemanticValidationMode = 'if-present',
): PortMeta {
  const producer = producers[def.source];
  if (!producer) throw new Error(`${context}: source '${def.source}' is not produced by any module`);
  if (def.module && def.module !== producer.module) {
    throw new Error(
      `${context}: source '${def.source}' is attributed to '${def.module}' but produced by '${producer.module}'`,
    );
  }

  if (!def.transform) {
    if (def.inputTypes || def.outputType) {
      throw new Error(`${context}: direct collector must not declare transform inputTypes/outputType`);
    }
    const contract = resolvePortPath(
      connectorSpecToPortMeta(producer.spec),
      def.path,
      `${context} source '${def.source}'`,
    );
    validatePortMeta(contract, `${context} resolved source`);
    if (semanticValidation === 'required') {
      const semantic = auditPortSemantics(contract, `${context} resolved source`);
      if (semantic.missingSemanticPaths.length > 0) {
        throw new Error(`${context}: direct source is missing an estimand contract`);
      }
    }
    validateDeclaredUnit(def, contract, context);
    return contract;
  }

  if (def.path) throw new Error(`${context}: transformed collector must not also declare path`);
  if (!def.inputTypes) {
    throw new Error(`${context}: transformed collector must declare inputTypes`);
  }
  for (const [read, expectedSpec] of Object.entries(def.inputTypes)) {
    const readProducer = producers[read];
    if (!readProducer) {
      throw new Error(`${context}: transform input '${read}' is not produced by any module`);
    }
    validatePortCompatibility(
      connectorSpecToPortMeta(readProducer.spec),
      connectorSpecToPortMeta(expectedSpec),
      `${context}: ${readProducer.module}.${read} -> transform input '${read}'`,
      {
        semanticValidation,
        crosswalk: def.inputCrosswalks?.[read],
        measurementCrosswalk: def.inputMeasurementCrosswalks?.[read],
      },
    );
  }
  const contract = transformedContract(def, context);
  if (def.derivation) {
    validateSemanticDerivation(def.derivation, `${context} derivation`);
    if (isQuantityPort(contract) && contract.estimand) {
      const comparison = compareEstimands(def.derivation.outputEstimand, contract.estimand);
      if (!comparison.compatible) {
        throw new Error(`${context}: derivation output estimand does not match outputType`);
      }
    }
  }
  if (semanticValidation === 'required') {
    const semantic = auditPortSemantics(contract, `${context} output`);
    if (semantic.missingSemanticPaths.length > 0) {
      throw new Error(`${context}: transformed output is missing an estimand contract`);
    }
    const inputEstimands = Object.values(def.inputTypes)
      .map((spec) => connectorSpecToPortMeta(spec))
      .flatMap((meta) => isQuantityPort(meta) && meta.estimand ? [meta.estimand] : []);
    if (isQuantityPort(contract) && contract.estimand && inputEstimands.length > 0 &&
        !inputEstimands.some((input) => compareEstimands(input, contract.estimand!).compatible) &&
        !def.derivation) {
      throw new Error(`${context}: transformed collector derives a new estimand without a derivation`);
    }
  }
  validateDeclaredUnit(def, contract, context);
  return contract;
}

function auditCollectorRegistry(
  producers: ProducerContracts,
  config: CollectorConfig,
): CollectorContractAudit {
  const errors: string[] = [];
  const keys = new Set<string>();
  let directCollectors = 0;
  let transformedCollectors = 0;
  for (const def of config.timeseries) {
    const key = resolveKey(def);
    const context = `collector '${key}'`;
    if (keys.has(key)) errors.push(`${context}: duplicate resolved timeseries key`);
    keys.add(key);
    if (def.transform) transformedCollectors++;
    else directCollectors++;
    try {
      resolveCollectorAgainstRegistry(
        def,
        producers,
        context,
        config.semanticValidation ?? 'if-present',
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  for (const metric of config.metrics) {
    try {
      if (metric.outputType) {
        const contract = connectorSpecToPortMeta(metric.outputType);
        validatePortMeta(contract, `metric '${metric.as}' output`);
        if (metric.derivation) {
          validateSemanticDerivation(metric.derivation, `metric '${metric.as}' derivation`);
        }
        if (config.semanticValidation === 'required') {
          const semantic = auditPortSemantics(contract, `metric.${metric.as}`);
          if (semantic.missingSemanticPaths.length > 0) {
            throw new Error(`Metric '${metric.as}' output is missing an estimand contract`);
          }
        }
      } else if (
        config.semanticValidation === 'required' &&
        (metric.transform || metric.aggregator !== 'last')
      ) {
        throw new Error(
          `Metric '${metric.as}' must declare outputType under strict semantic validation`,
        );
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    collectors: config.timeseries.length,
    directCollectors,
    transformedCollectors,
  };
}

/** CI-friendly audit of collectors against the actual module producers. */
export function auditCollectorContracts(
  modules: readonly AnyModule[],
  config: CollectorConfig,
): CollectorContractAudit {
  return auditCollectorRegistry(producerContractsFromModules(modules), config);
}

export function assertCollectorContracts(
  modules: readonly AnyModule[],
  config: CollectorConfig,
): CollectorContractAudit {
  const audit = auditCollectorContracts(modules, config);
  if (!audit.valid) throw new Error(`Collector contract errors:\n${audit.errors.join('\n')}`);
  return audit;
}

/** Resolve the authoritative schema for one direct or transformed collector. */
export function resolveCollectorContract(
  modules: readonly AnyModule[],
  def: TimeseriesDef,
  semanticValidation: SemanticValidationMode = 'if-present',
): PortMeta {
  return resolveCollectorAgainstRegistry(
    def,
    producerContractsFromModules(modules),
    `collector '${resolveKey(def)}'`,
    semanticValidation,
  );
}

/** Compact display-only summary; the returned PortMeta remains authoritative. */
export function summarizePortUnits(port: PortMeta): string {
  const units = new Set<string>();
  const visit = (node: PortMeta): void => {
    if (isQuantityPort(node)) units.add(node.unit);
    else if (isObjectPort(node)) {
      for (const field of Object.values(node.fields as Readonly<Record<string, PortMeta>>)) visit(field);
    } else if (isRecordPort(node)) visit(node.values);
    else if (isVectorPort(node)) visit(node.items);
    else if (isMetadataPort(node)) units.add('metadata');
    else if (isOpaquePort(node)) units.add('opaque');
  };
  visit(port);
  const values = [...units].sort();
  if (values.length === 0) return 'structured';
  if (values.length === 1) return values[0];
  return `mixed[${values.join(', ')}]`;
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
  const producers = result.outputContracts;
  const resolvedContracts = new Map<string, PortMeta>();
  if (producers) {
    const audit = auditCollectorRegistry(producers, config);
    if (!audit.valid) throw new Error(`Collector contract errors:\n${audit.errors.join('\n')}`);
    for (const def of config.timeseries) {
      resolvedContracts.set(
        resolveKey(def),
        resolveCollectorAgainstRegistry(
          def,
          producers,
          `collector '${resolveKey(def)}'`,
          config.semanticValidation ?? 'if-present',
        ),
      );
    }
  }

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
      let value: unknown;
      if (def.transform && producers) {
        const reads = new Set<string>();
        const proxy = new Proxy(outputs, {
          get(target, property) {
            if (typeof property === 'string') reads.add(property);
            return target[property as string];
          },
        });
        value = def.transform(proxy, years[i], i);
        for (const read of reads) {
          if (!def.inputTypes?.[read]) {
            throw new Error(
              `Collector '${key}' transform reads '${read}' without an input unit signature`,
            );
          }
        }
      } else {
        value = extractValue(def, outputs, years[i], i);
      }
      const contract = resolvedContracts.get(key);
      if (contract) assertPortValue(value, contract, `Collector '${key}' at year ${years[i]}`);
      record[key] = value;
    }

    timeseries.push(record);
  }

  // Collect metrics (config validated above)
  const metrics: Record<string, any> = {};
  const metricContracts: Record<string, PortMeta> = {};
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
    if (def.outputType) {
      const contract = connectorSpecToPortMeta(def.outputType);
      validatePortMeta(contract, `Metric '${def.as}' output`);
      if (def.derivation) {
        validateSemanticDerivation(def.derivation, `Metric '${def.as}' derivation`);
      }
      if (config.semanticValidation === 'required') {
        const semantic = auditPortSemantics(contract, `metric.${def.as}`);
        if (semantic.missingSemanticPaths.length > 0) {
          throw new Error(`Metric '${def.as}' output is missing an estimand contract`);
        }
      }
      assertPortValue(metrics[def.as], contract, `Metric '${def.as}'`);
      metricContracts[def.as] = contract;
    } else if (!def.transform && def.aggregator === 'last' && def.source) {
      const sourceContract = resolvedContracts.get(def.source);
      if (sourceContract) metricContracts[def.as] = sourceContract;
    } else if (config.semanticValidation === 'required') {
      throw new Error(
        `Metric '${def.as}' must declare outputType under strict semantic validation`,
      );
    }
  }

  return {
    years,
    timeseries,
    metrics,
    contracts: {
      timeseries: Object.fromEntries(resolvedContracts),
      metrics: metricContracts,
    },
  };
}

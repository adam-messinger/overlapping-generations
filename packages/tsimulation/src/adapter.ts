import type { ValidationResult } from './types.js';
import type { PortMeta } from './units.js';
import {
  areUnitsConvertible,
  isOpaquePort,
  isQuantityPort,
  validatePortMeta,
  validatePortUnits,
} from './units.js';
import { assertFiniteDeep } from './validation.js';

export type TimeScale =
  | { kind: 'event' }
  | { kind: 'daily' }
  | { kind: 'monthly' }
  | { kind: 'quarterly' }
  | { kind: 'annual' };

export interface AdapterContext {
  sourceRunId?: string;
  targetStart?: number;
  targetEnd?: number;
}

/**
 * An explicit, inspectable contract for moving output from one simulation
 * into another. Adapters own time aggregation and unit conversion; neither is
 * allowed to happen implicitly at a model boundary.
 */
export interface AdapterDefinition<TSource, TTarget> {
  id: string;
  version: string;
  description: string;
  sourceModel: string;
  targetModel: string;
  sourceTimeScale: TimeScale;
  targetTimeScale: TimeScale;
  /** Semantic quantities read from the source. All must be declared. */
  sourcePorts: Readonly<Record<string, PortMeta>>;
  /** Semantic quantities written into the target. All must be declared. */
  targetPorts: Readonly<Record<string, PortMeta>>;
  /** Explicit source-to-target conversion and time-aggregation contracts. */
  portMappings: readonly AdapterPortMapping[];
  adapt: (source: TSource, context: AdapterContext) => TTarget;
  validateSource?: (source: TSource) => ValidationResult | void;
  validateTarget?: (target: TTarget, source: TSource) => ValidationResult | void;
  requireFiniteSource?: boolean;
  requireFiniteTarget?: boolean;
}

export type AdapterConversion =
  | { kind: 'identity' }
  | { kind: 'unit'; convert: (value: number) => number }
  | { kind: 'custom'; description: string; convert: (value: unknown) => unknown };

export type AdapterAggregation =
  | { kind: 'none' }
  | { kind: 'sum' | 'mean' | 'last' }
  | { kind: 'custom'; description: string };

export interface AdapterPortMapping {
  source: string;
  target: string;
  conversion: AdapterConversion;
  aggregation: AdapterAggregation;
}

export interface AdapterRun<TSource, TTarget> {
  adapterId: string;
  adapterVersion: string;
  sourceModel: string;
  targetModel: string;
  source: TSource;
  target: TTarget;
  context: AdapterContext;
  warnings: string[];
}

function validatePorts(id: string, side: string, ports: Readonly<Record<string, PortMeta>>): void {
  for (const [name, port] of Object.entries(ports)) {
    validatePortMeta(port, `Adapter '${id}' ${side} port '${name}'`);
  }
}

function validateMappings<TSource, TTarget>(definition: AdapterDefinition<TSource, TTarget>): void {
  const mappedSources = new Set<string>();
  const mappedTargets = new Set<string>();
  for (const mapping of definition.portMappings) {
    const source = definition.sourcePorts[mapping.source];
    const target = definition.targetPorts[mapping.target];
    if (!source) throw new Error(`Adapter '${definition.id}' mapping has unknown source port '${mapping.source}'`);
    if (!target) throw new Error(`Adapter '${definition.id}' mapping has unknown target port '${mapping.target}'`);
    mappedSources.add(mapping.source);
    mappedTargets.add(mapping.target);
    if (mapping.conversion.kind === 'identity') {
      try {
        validatePortUnits(
          source,
          target,
          `Adapter '${definition.id}' identity mapping ${mapping.source} -> ${mapping.target}`,
        );
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : String(error),
        );
      }
    } else if (mapping.conversion.kind === 'unit') {
      if (
        isOpaquePort(source) || isOpaquePort(target) ||
        !isQuantityPort(source) || !isQuantityPort(target) ||
        !areUnitsConvertible(source.unit, target.unit)
      ) {
        throw new Error(
          `Adapter '${definition.id}' unit mapping ${mapping.source} -> ${mapping.target} has incompatible contracts`,
        );
      }
    } else if (!mapping.conversion.description.trim()) {
      throw new Error(`Adapter '${definition.id}' custom mapping must describe its conversion`);
    }
    if (mapping.aggregation.kind === 'custom' && !mapping.aggregation.description.trim()) {
      throw new Error(`Adapter '${definition.id}' custom aggregation must have a description`);
    }
  }
  for (const source of Object.keys(definition.sourcePorts)) {
    if (!mappedSources.has(source)) {
      throw new Error(`Adapter '${definition.id}' source port '${source}' has no target mapping`);
    }
  }
  for (const target of Object.keys(definition.targetPorts)) {
    if (!mappedTargets.has(target)) {
      throw new Error(`Adapter '${definition.id}' target port '${target}' has no source mapping`);
    }
  }
}

function applyValidation(result: ValidationResult | void, label: string, warnings: string[]): void {
  if (!result) return;
  warnings.push(...result.warnings.map((warning) => `${label}: ${warning}`));
  if (!result.valid || result.errors.length > 0) {
    throw new Error(`${label}:\n  ${result.errors.join('\n  ')}`);
  }
}

export function defineAdapter<TSource, TTarget>(
  definition: AdapterDefinition<TSource, TTarget>,
): AdapterDefinition<TSource, TTarget> {
  if (!definition.id.trim()) throw new Error('Adapter ID must not be empty');
  if (!definition.version.trim()) throw new Error(`Adapter '${definition.id}' version must not be empty`);
  if (!definition.description.trim()) throw new Error(`Adapter '${definition.id}' description must not be empty`);
  if (!definition.sourceModel.trim() || !definition.targetModel.trim()) {
    throw new Error(`Adapter '${definition.id}' must name both source and target models`);
  }
  if (!definition.sourcePorts || !definition.targetPorts) {
    throw new Error(`Adapter '${definition.id}' must declare source and target port contracts`);
  }
  if (!definition.portMappings) throw new Error(`Adapter '${definition.id}' must declare port mappings`);
  validatePorts(definition.id, 'source', definition.sourcePorts);
  validatePorts(definition.id, 'target', definition.targetPorts);
  validateMappings(definition);
  return definition;
}

export function runAdapter<TSource, TTarget>(
  adapter: AdapterDefinition<TSource, TTarget>,
  source: TSource,
  context: AdapterContext = {},
): AdapterRun<TSource, TTarget> {
  const warnings: string[] = [];
  if (adapter.requireFiniteSource !== false) assertFiniteDeep(source, `${adapter.id}.source`);
  applyValidation(adapter.validateSource?.(source), `Adapter '${adapter.id}' invalid source`, warnings);
  const target = adapter.adapt(source, context);
  if (adapter.requireFiniteTarget !== false) assertFiniteDeep(target, `${adapter.id}.target`);
  applyValidation(adapter.validateTarget?.(target, source), `Adapter '${adapter.id}' invalid target`, warnings);
  return {
    adapterId: adapter.id,
    adapterVersion: adapter.version,
    sourceModel: adapter.sourceModel,
    targetModel: adapter.targetModel,
    source,
    target,
    context,
    warnings,
  };
}

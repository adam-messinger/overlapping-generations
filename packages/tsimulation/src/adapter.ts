import type { ValidationResult } from './types.js';
import type { PortMeta } from './units.js';
import { getUnit } from './units.js';
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
  sourcePorts?: Readonly<Record<string, PortMeta>>;
  targetPorts?: Readonly<Record<string, PortMeta>>;
  adapt: (source: TSource, context: AdapterContext) => TTarget;
  validateSource?: (source: TSource) => ValidationResult | void;
  validateTarget?: (target: TTarget, source: TSource) => ValidationResult | void;
  requireFiniteSource?: boolean;
  requireFiniteTarget?: boolean;
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
    if (!getUnit(port.unit)) throw new Error(`Adapter '${id}' ${side} port '${name}' has unknown unit '${port.unit}'`);
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
  validatePorts(definition.id, 'source', definition.sourcePorts ?? {});
  validatePorts(definition.id, 'target', definition.targetPorts ?? {});
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

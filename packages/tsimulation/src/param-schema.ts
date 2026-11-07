/**
 * Parameter schemas: one declaration per module parameter, from which the
 * typed defaults, the merge, the validation and the introspection metadata are
 * all derived.
 *
 * A module that hand-writes its interface, defaults object, `paramMeta` tree,
 * `validate` and `mergeParams` keeps five copies of the same list, and every
 * pair of them can drift: a nested section the merge forgot to deep-merge
 * (silently dropping overrides), a `paramMeta` default that disagrees with the
 * real one, an introspection path that names nothing, a typo'd scenario key
 * accepted and ignored. Declared once, none of those can disagree.
 *
 * What the schema adds over the hand-written forms:
 * - every numeric parameter carries a registered unit (checked at definition)
 *   and may carry its calibration source
 * - the merge is a strict deep merge: an unknown key at any depth is an error,
 *   inherited names (`__proto__`, `constructor`, ...) can never address a
 *   parameter, and values are copied in so a caller's object cannot alias the
 *   module's params
 * - validity bounds (what the model can run with) are separate from the
 *   exploration range (what a sweep or agent should try), and the range's
 *   default is the real default by construction
 */

import type { ParamMeta, ValidationResult } from './types.js';
import { isKnownUnit } from './units.js';

// =============================================================================
// SPECS
// =============================================================================

interface LeafCommon {
  /** What the parameter means; required for anything exposed to introspection. */
  readonly description?: string;
  /** Calibration source: value, source, year (the convention for calibrated defaults). */
  readonly source?: string;
  /** Introspection tier: 1 user-facing, 2 scenario, 3 calibration. Untiered leaves are not exposed. */
  readonly tier?: 1 | 2 | 3;
  /** Friendly introspection key (defaults to the leaf name). */
  readonly paramName?: string;
}

export interface NumberParamSpec extends LeafCommon {
  readonly kind: 'number';
  readonly default: number;
  /** A registered unit symbol or compound ('$/tCO2', 'kWh/tCO2', 'fraction', '1'). */
  readonly unit: string;
  /** Validity bounds: values outside them are rejected. */
  readonly min?: number;
  readonly max?: number;
  /** When true, `min` itself is rejected (strictly positive and the like). */
  readonly exclusiveMin?: boolean;
  readonly integer?: boolean;
  /** Plausible range for sweeps and agents; defaults to the validity bounds. */
  readonly explore?: { readonly min: number; readonly max: number };
}

export interface BooleanParamSpec extends LeafCommon {
  readonly kind: 'boolean';
  readonly default: boolean;
}

export interface ChoiceParamSpec<V extends string = string> extends LeafCommon {
  readonly kind: 'choice';
  readonly default: V;
  readonly values: readonly V[];
}

export interface GroupParamSpec<C extends ParamChildren = ParamChildren> {
  readonly kind: 'group';
  readonly children: C;
  readonly description?: string;
}

export type ParamSpec = NumberParamSpec | BooleanParamSpec | ChoiceParamSpec<string> | GroupParamSpec<any>;
export type ParamChildren = { readonly [key: string]: ParamSpec };

export type InferParam<S> =
  S extends NumberParamSpec ? number :
  S extends BooleanParamSpec ? boolean :
  S extends ChoiceParamSpec<infer V> ? V :
  S extends GroupParamSpec<infer C> ? InferParams<C> :
  never;

/** The parameter object type a schema describes. */
export type InferParams<C extends ParamChildren> = { -readonly [K in keyof C]: InferParam<C[K]> };

/** What a caller may pass: any subset, at any depth. */
export type ParamOverrides<T> = { [K in keyof T]?: T[K] extends object ? ParamOverrides<T[K]> : T[K] };

/** The parameter type of a schema returned by `defineParams`. */
export type ParamsOf<S> = S extends ParamSchema<infer C> ? InferParams<C> : never;

/** A numeric parameter. `unit` must be a registered unit symbol. */
export function num(spec: Omit<NumberParamSpec, 'kind'>): NumberParamSpec {
  return { kind: 'number', ...spec };
}

export function bool(spec: Omit<BooleanParamSpec, 'kind'>): BooleanParamSpec {
  return { kind: 'boolean', ...spec };
}

export function choice<const V extends string>(
  values: readonly V[],
  spec: Omit<ChoiceParamSpec<V>, 'kind' | 'values'>,
): ChoiceParamSpec<V> {
  return { kind: 'choice', values, ...spec };
}

/** A nested section. */
export function group<const C extends ParamChildren>(children: C, description?: string): GroupParamSpec<C> {
  return { kind: 'group', children, ...(description ? { description } : {}) };
}

// =============================================================================
// SCHEMA
// =============================================================================

export interface ParamSchema<C extends ParamChildren, T = InferParams<C>> {
  readonly moduleName: string;
  readonly children: C;
  /** A fresh copy of the defaults on every read. */
  readonly defaults: T;
  /** Check an override object: unknown keys, types and validity bounds. */
  validate(overrides: unknown): ValidationResult;
  /** Strict deep merge of overrides onto the defaults; throws on any validation error. */
  merge(overrides?: unknown): T;
  /** The `paramMeta` tree for `generateParameterSchema` (tiered leaves only). */
  readonly paramMeta: Record<string, any>;
  /** Every leaf, as a dot path, in declaration order. */
  leafPaths(): string[];
  /** Numeric leaves without a `source`, as dot paths. */
  unsourced(): string[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function walk(
  children: ParamChildren,
  visit: (path: string, spec: Exclude<ParamSpec, GroupParamSpec>) => void,
  prefix = '',
): void {
  for (const [key, spec] of Object.entries(children)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (spec.kind === 'group') walk(spec.children, visit, path);
    else visit(path, spec);
  }
}

function defaultsOf(children: ParamChildren): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(children)) {
    result[key] = spec.kind === 'group' ? defaultsOf(spec.children) : spec.default;
  }
  return result;
}

function checkLeaf(path: string, spec: Exclude<ParamSpec, GroupParamSpec>, value: unknown, errors: string[]): void {
  switch (spec.kind) {
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`${path} must be a finite number, got ${String(value)}`);
        return;
      }
      if (spec.integer && !Number.isInteger(value)) errors.push(`${path} must be an integer, got ${value}`);
      if (spec.min !== undefined) {
        if (spec.exclusiveMin ? value <= spec.min : value < spec.min) {
          errors.push(`${path} must be ${spec.exclusiveMin ? '>' : '>='} ${spec.min}, got ${value}`);
        }
      }
      if (spec.max !== undefined && value > spec.max) errors.push(`${path} must be <= ${spec.max}, got ${value}`);
      return;
    }
    case 'boolean':
      if (typeof value !== 'boolean') errors.push(`${path} must be a boolean, got ${String(value)}`);
      return;
    case 'choice':
      if (typeof value !== 'string' || !spec.values.includes(value)) {
        errors.push(`${path} must be one of ${spec.values.join(', ')}, got ${String(value)}`);
      }
      return;
  }
}

function validateAgainst(children: ParamChildren, value: unknown, prefix: string, errors: string[]): void {
  if (!isPlainObject(value)) {
    errors.push(`${prefix || 'parameters'} must be a plain object`);
    return;
  }
  for (const key of Object.keys(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    // Own keys of the schema only: an inherited name never addresses a parameter.
    if (!Object.hasOwn(children, key)) {
      errors.push(`unknown parameter '${path}'`);
      continue;
    }
    const spec = children[key];
    const child = value[key];
    if (child === undefined) continue;
    if (spec.kind === 'group') validateAgainst(spec.children, child, path, errors);
    else checkLeaf(path, spec, child, errors);
  }
}

function mergeInto(children: ParamChildren, base: Record<string, unknown>, overrides: Record<string, unknown>): void {
  for (const key of Object.keys(overrides)) {
    const spec = children[key];
    const value = overrides[key];
    if (value === undefined) continue;
    if (spec.kind === 'group') {
      mergeInto(spec.children, base[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      base[key] = value; // leaves are primitives, so this copies
    }
  }
}

function metaOf(children: ParamChildren): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, spec] of Object.entries(children)) {
    if (spec.kind === 'group') {
      const nested = metaOf(spec.children);
      if (Object.keys(nested).length > 0) result[key] = nested;
      continue;
    }
    if (spec.tier === undefined) continue;
    const range = spec.kind === 'number'
      ? { min: spec.explore?.min ?? spec.min, max: spec.explore?.max ?? spec.max, default: spec.default }
      : { default: spec.default as any };
    const meta: ParamMeta = {
      description: spec.description ?? '',
      unit: spec.kind === 'number' ? spec.unit : spec.kind,
      range,
      tier: spec.tier,
      ...(spec.source ? { source: spec.source } : {}),
      ...(spec.paramName ? { paramName: spec.paramName } : {}),
    };
    result[key] = meta;
  }
  return result;
}

/** Problems with the schema itself, found once at definition time. */
function auditSchema(moduleName: string, children: ParamChildren): string[] {
  const problems: string[] = [];
  walk(children, (path, spec) => {
    const errors: string[] = [];
    checkLeaf(path, spec, spec.default, errors);
    for (const error of errors) problems.push(`default violates its own bounds: ${error}`);
    if (spec.tier !== undefined && !spec.description) problems.push(`${path} is tiered but has no description`);
    if (spec.kind === 'number') {
      if (!isKnownUnit(spec.unit)) problems.push(`${path} has unknown unit '${spec.unit}'`);
      if (spec.explore) {
        if (spec.explore.min > spec.explore.max) problems.push(`${path} explore range is inverted`);
        const outside = [spec.explore.min, spec.explore.max].filter((bound) => {
          const e: string[] = [];
          checkLeaf(path, spec, bound, e);
          return e.length > 0;
        });
        if (outside.length > 0) problems.push(`${path} explore range leaves the validity bounds`);
        if (spec.default < spec.explore.min || spec.default > spec.explore.max) {
          problems.push(`${path} default ${spec.default} is outside its explore range`);
        }
      }
    }
  });
  return problems.map((problem) => `[${moduleName}] ${problem}`);
}

/**
 * Declare a module's parameters once.
 *
 * ```ts
 * const cdrParams = defineParams('cdr', {
 *   cost0: num({ default: 400, unit: '$/tCO2', min: 0, exclusiveMin: true,
 *     source: 'Fasihi et al. 2019', tier: 1, paramName: 'cdrCost0',
 *     description: '...', explore: { min: 100, max: 1000 } }),
 * });
 * export type CDRParams = InferParams<typeof cdrParams.children>;
 * ```
 */
export function defineParams<const C extends ParamChildren>(
  moduleName: string,
  children: C,
): ParamSchema<C> {
  const problems = auditSchema(moduleName, children);
  if (problems.length > 0) throw new Error(`Invalid parameter schema:\n  ${problems.join('\n  ')}`);

  const validate = (overrides: unknown): ValidationResult => {
    const errors: string[] = [];
    validateAgainst(children, overrides ?? {}, '', errors);
    return { valid: errors.length === 0, errors, warnings: [] };
  };
  const paramMeta = metaOf(children);

  return {
    moduleName,
    children,
    get defaults() {
      return defaultsOf(children) as InferParams<C>;
    },
    validate,
    merge(overrides: unknown = {}) {
      const result = validate(overrides);
      if (!result.valid) {
        throw new Error(`[${moduleName}] Invalid parameters:\n  ${result.errors.join('\n  ')}`);
      }
      const merged = defaultsOf(children);
      mergeInto(children, merged, overrides as Record<string, unknown>);
      return merged as InferParams<C>;
    },
    paramMeta,
    leafPaths() {
      const paths: string[] = [];
      walk(children, (path) => paths.push(path));
      return paths;
    },
    unsourced() {
      const paths: string[] = [];
      walk(children, (path, spec) => {
        if (spec.kind === 'number' && !spec.source) paths.push(path);
      });
      return paths;
    },
  };
}

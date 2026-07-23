/**
 * Module interface - the core abstraction
 *
 * Each module is a self-contained unit with:
 * - Typed parameters (validated at load time)
 * - Internal state (persists across years)
 * - Declared inputs (what it needs from other modules)
 * - Declared outputs (what it provides to other modules)
 * - Pure step function (no side effects)
 */

import { YearIndex, Year, ValidationResult, ParamMeta } from './types.js';
import {
  validateEstimand,
  validateMeasurement,
  type EstimandContract,
  type MeasurementBinding,
} from './semantics.js';
import type {
  MetadataPortMeta,
  ObjectFieldContract,
  OpaquePortMeta,
  PortMeta,
  PortMetaForValue,
  QuantityPortMeta,
} from './units.js';

/**
 * Module definition interface
 *
 * @template TParams - Module's parameter type
 * @template TState - Module's internal state type
 * @template TInputs - What this module needs from other modules
 * @template TOutputs - What this module provides to other modules
 */
/** Connector type for runtime validation of module wiring */
export type ConnectorType = 'number' | 'record' | 'nested-record' | 'vector' | 'metadata';
interface ConnectorSpecBase {
  type: ConnectorType;
}
export interface UnitConnectorSpec extends ConnectorSpecBase, QuantityPortMeta {
  type: Exclude<ConnectorType, 'metadata'>;
  /** Runtime unit contract. Different scales require an explicit transform. */
  unit: string;
  opaque?: never;
  description?: string;
}
export interface OpaqueConnectorSpec extends ConnectorSpecBase, OpaquePortMeta {
  type: Exclude<ConnectorType, 'number' | 'metadata'>;
  /** Explicit escape hatch for mixed-unit structured data. */
}
export interface MetadataConnectorSpec extends ConnectorSpecBase, MetadataPortMeta {
  type: 'metadata';
}
export interface ObjectConnectorSpec extends ConnectorSpecBase {
  type: 'record' | 'nested-record';
  kind: 'object';
  fields: Readonly<Record<string, PortMeta>>;
  description?: string;
  optional?: boolean;
  nullable?: boolean;
}
export interface RecordConnectorSpec extends ConnectorSpecBase {
  type: 'record' | 'nested-record';
  kind: 'record';
  values: PortMeta;
  keys?: readonly string[];
  description?: string;
  optional?: boolean;
  nullable?: boolean;
}
export interface VectorConnectorSpec extends ConnectorSpecBase {
  type: 'vector';
  kind: 'vector';
  items: PortMeta;
  description?: string;
  optional?: boolean;
  nullable?: boolean;
}
export type ConnectorSpec =
  | UnitConnectorSpec
  | OpaqueConnectorSpec
  | MetadataConnectorSpec
  | ObjectConnectorSpec
  | RecordConnectorSpec
  | VectorConnectorSpec;
/** String declarations are retained only so strict validation can diagnose legacy callers. */
export type ConnectorDeclaration = ConnectorType | ConnectorSpec;
export type ConnectorContract<T extends object> = {
  readonly [K in keyof T]-?: ConnectorSpec;
};

export function unitConnector(
  type: Exclude<ConnectorType, 'metadata'>,
  unit: string,
  description?: string,
): UnitConnectorSpec {
  return { type, unit, ...(description ? { description } : {}) };
}

export function measurementConnector(
  type: Exclude<ConnectorType, 'metadata'>,
  unit: string,
  estimand: EstimandContract,
  description?: string,
): UnitConnectorSpec {
  validateEstimand(estimand, `Connector '${estimand.id}' estimand`);
  return {
    type,
    unit,
    estimand,
    ...(description ? { description } : {}),
  };
}

export function observationConnector(
  type: Exclude<ConnectorType, 'metadata'>,
  unit: string,
  measurement: MeasurementBinding,
  description?: string,
): UnitConnectorSpec {
  validateMeasurement(measurement, `Connector '${measurement.id}' measurement`);
  return {
    type,
    unit,
    estimand: measurement.estimand,
    measurement,
    ...(description ? { description } : {}),
  };
}

export function opaqueConnector(
  type: Exclude<ConnectorType, 'number' | 'metadata'>,
  description: string,
): OpaqueConnectorSpec {
  return { type, opaque: true, description };
}

export function metadataConnector(
  dataType: MetadataPortMeta['dataType'],
  description: string,
): MetadataConnectorSpec {
  return { type: 'metadata', kind: 'metadata', dataType, description };
}

export function objectConnector<T extends object>(
  type: 'record' | 'nested-record',
  fields: ObjectFieldContract<T>,
  description?: string,
): ObjectConnectorSpec {
  return {
    type,
    kind: 'object',
    fields: fields as Readonly<Record<string, PortMeta>>,
    ...(description ? { description } : {}),
  };
}

export function recordConnector<T>(
  type: 'record' | 'nested-record',
  values: PortMetaForValue<T>,
  options: { keys?: readonly string[]; description?: string } = {},
): RecordConnectorSpec {
  return {
    type,
    kind: 'record',
    values: values as PortMeta,
    ...(options.keys ? { keys: [...options.keys] } : {}),
    ...(options.description ? { description: options.description } : {}),
  };
}

export function vectorConnector<T>(
  items: PortMetaForValue<T>,
  description?: string,
): VectorConnectorSpec {
  return {
    type: 'vector',
    kind: 'vector',
    items: items as PortMeta,
    ...(description ? { description } : {}),
  };
}

export interface Module<
  TParams extends object,
  TState extends object,
  TInputs extends object,
  TOutputs extends object
> {
  /** Unique module identifier */
  readonly name: string;

  /** Human-readable description */
  readonly description: string;

  /** Default parameters */
  readonly defaults: TParams;

  /**
   * Input dependencies - keys that must be provided from other modules' outputs
   * Used by framework to build dependency graph
   */
  readonly inputs: readonly (keyof TInputs)[];

  /**
   * Output keys - what this module provides
   * Used by framework to resolve dependencies
   */
  readonly outputs: readonly (keyof TOutputs)[];

  /** Complete runtime shape and unit contracts for every input and output. */
  readonly connectorTypes: {
    inputs: ConnectorContract<TInputs>;
    outputs: ConnectorContract<TOutputs>;
  };

  /**
   * Parameter metadata tree, mirroring the structure of `defaults`.
   * Leaf nodes are ParamMeta objects (have `description` + `unit` + `range`).
   * Used by generateParameterSchema() to auto-generate introspection data.
   */
  readonly paramMeta?: Record<string, any>;

  /**
   * Validate parameters
   * Called once at simulation start
   */
  validate(params: Partial<TParams>): ValidationResult;

  /**
   * Merge partial params with defaults
   */
  mergeParams(partial: Partial<TParams>): TParams;

  /**
   * Initialize state for the first step
   * Called once at simulation start
   */
  init(params: TParams): TState;

  /**
   * Step function - compute one year
   *
   * MUST be pure: no side effects, no mutations
   * Returns new state and outputs for this year
   *
   * @param state - Current state (from previous year or init)
   * @param inputs - Values from other modules for this year
   * @param params - Module parameters (immutable)
   * @param year - Absolute step label (often a calendar year)
   * @param yearIndex - Step index (0-based)
   */
  step(
    state: TState,
    inputs: TInputs,
    params: TParams,
    year: Year,
    yearIndex: YearIndex
  ): StepResult<TState, TOutputs>;
}

/**
 * Result of a step function
 */
export interface StepResult<TState, TOutputs> {
  /** New state for next year */
  state: TState;
  /** Outputs for this year (consumed by dependent modules) */
  outputs: TOutputs;
}

/**
 * Helper to create a module with better type inference
 */
export function defineModule<
  TParams extends object,
  TState extends object,
  TInputs extends object,
  TOutputs extends object
>(
  definition: Module<TParams, TState, TInputs, TOutputs>
): Module<TParams, TState, TInputs, TOutputs> {
  return definition;
}

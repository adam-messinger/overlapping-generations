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

/**
 * Module definition interface
 *
 * @template TParams - Module's parameter type
 * @template TState - Module's internal state type
 * @template TInputs - What this module needs from other modules
 * @template TOutputs - What this module provides to other modules
 */
/** Connector type for runtime validation of module wiring */
export type ConnectorType = 'number' | 'record' | 'nested-record';

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

  /**
   * Optional connector type declarations for runtime wiring validation.
   * When present, the framework validates type compatibility between
   * providers and consumers at startup.
   */
  readonly connectorTypes?: {
    inputs?: Partial<Record<keyof TInputs, ConnectorType>>;
    outputs?: Partial<Record<keyof TOutputs, ConnectorType>>;
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
   * Initialize state for year 0 (2025)
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
   * @param year - Absolute year (2025-2100)
   * @param yearIndex - Year index (0-75)
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

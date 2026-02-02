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

import { YearIndex, Year, ValidationResult } from './types.js';

/**
 * Module definition interface
 *
 * @template TParams - Module's parameter type
 * @template TState - Module's internal state type
 * @template TInputs - What this module needs from other modules
 * @template TOutputs - What this module provides to other modules
 */
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

/**
 * Type helper to extract inputs type from a module
 */
export type ModuleInputs<M> = M extends Module<any, any, infer I, any> ? I : never;

/**
 * Type helper to extract outputs type from a module
 */
export type ModuleOutputs<M> = M extends Module<any, any, any, infer O> ? O : never;

/**
 * Type helper to extract state type from a module
 */
export type ModuleState<M> = M extends Module<any, infer S, any, any> ? S : never;

/**
 * Type helper to extract params type from a module
 */
export type ModuleParams<M> = M extends Module<infer P, any, any, any> ? P : never;

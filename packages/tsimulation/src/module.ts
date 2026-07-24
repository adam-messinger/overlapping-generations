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
import type { PortMeta } from './units.js';

/**
 * Module definition interface
 *
 * @template TParams - Module's parameter type
 * @template TState - Module's internal state type
 * @template TInputs - What this module needs from other modules
 * @template TOutputs - What this module provides to other modules
 */
/**
 * Complete runtime shape and unit contract for every port of a module.
 *
 * Ports are described with the same PortMeta vocabulary that model and adapter
 * boundaries use (`unitPort`, `objectPort`, `recordPort`, ...). There is no
 * separate "connector" spelling: a port is a port wherever it appears.
 */
export type ConnectorContract<T extends object> = {
  readonly [K in keyof T]-?: PortMeta;
};

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
/**
 * What an author writes. `inputs`/`outputs` are optional here because they are
 * exactly `Object.keys(connectorTypes.*)` — declaring them again is a second
 * copy of the same list that can only ever drift.
 *
 * `Module` (what `defineModule` returns) keeps them required, so every
 * framework consumer can still iterate `mod.inputs` without a null check.
 */
export type ModuleDefinition<
  TParams extends object,
  TState extends object,
  TInputs extends object,
  TOutputs extends object
> = Omit<Module<TParams, TState, TInputs, TOutputs>, 'inputs' | 'outputs'> &
  Partial<Pick<Module<TParams, TState, TInputs, TOutputs>, 'inputs' | 'outputs'>>;

export function defineModule<
  TParams extends object,
  TState extends object,
  TInputs extends object,
  TOutputs extends object
>(
  definition: ModuleDefinition<TParams, TState, TInputs, TOutputs>
): Module<TParams, TState, TInputs, TOutputs> {
  // Derive only when absent. Fixtures that declare ports without a
  // connectorTypes contract keep working, and validateConnectorTypes keeps
  // both of its cross-check branches live for modules that declare both.
  //
  // Object.keys preserves insertion order, which matters: buildDependencyGraph
  // walks mod.inputs in declaration order and that seeds topologicalSort's
  // tie-break. Pinned by src/module-ports.test.ts.
  return {
    ...definition,
    inputs:
      definition.inputs ??
      (Object.keys(definition.connectorTypes?.inputs ?? {}) as (keyof TInputs)[]),
    outputs:
      definition.outputs ??
      (Object.keys(definition.connectorTypes?.outputs ?? {}) as (keyof TOutputs)[]),
  };
}

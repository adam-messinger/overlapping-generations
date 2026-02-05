/**
 * Problem-Solve Separation
 *
 * Separates simulation definition from execution, inspired by Julia's SciML.
 *
 * Usage:
 *   // Define (inert - no computation)
 *   const problem = defineSimulation({ modules, transforms, lags, params });
 *
 *   // Batch run
 *   const result = solve(problem);
 *
 *   // Interactive step-by-step
 *   const stepper = init(problem);
 *   while (!stepper.done()) {
 *     const { year, outputs } = stepper.step();
 *     console.log(year, outputs.temperature);
 *   }
 *   const result = stepper.result();
 */

import {
  AutowireConfig,
  AutowireResult,
  AutowireState,
  initAutowired,
  stepAutowired,
  finalizeAutowired,
  runAutowired,
} from './autowire.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Inert simulation definition. Holds configuration but performs no computation.
 */
export interface SimulationProblem {
  readonly config: AutowireConfig;
}

/**
 * Step result returned on each year advance
 */
export interface StepResult {
  year: number;
  outputs: Record<string, any>;
  done: boolean;
}

/**
 * Interactive step-by-step simulation runner
 */
export interface Stepper {
  /** Advance one year. Returns year outputs. */
  step(): StepResult;
  /** Current year (next year to be stepped) */
  year(): number;
  /** Whether the simulation has finished */
  done(): boolean;
  /** Get current year's flat outputs (after most recent step) */
  getOutputs(): Record<string, any>;
  /** Collect results from all years stepped so far */
  result(): AutowireResult;
}

// =============================================================================
// DEFINE
// =============================================================================

/**
 * Define a simulation problem (no computation performed).
 */
export function defineSimulation(config: AutowireConfig): SimulationProblem {
  return { config };
}

// =============================================================================
// SOLVE
// =============================================================================

/**
 * Run a simulation problem to completion.
 */
export function solve(problem: SimulationProblem): AutowireResult {
  return runAutowired(problem.config);
}

// =============================================================================
// INIT (STEPPER)
// =============================================================================

/**
 * Initialize a step-by-step simulation runner.
 */
export function init(problem: SimulationProblem): Stepper {
  const state: AutowireState = initAutowired(problem.config);

  return {
    step(): StepResult {
      return stepAutowired(state);
    },

    year(): number {
      return state.currentYear;
    },

    done(): boolean {
      return state.currentYear > state.endYear;
    },

    getOutputs(): Record<string, any> {
      return { ...state.currentOutputs };
    },

    result(): AutowireResult {
      return finalizeAutowired(state);
    },
  };
}

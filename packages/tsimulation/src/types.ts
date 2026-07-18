/**
 * Core types for the simulation framework
 */

/** Step index (0-based): 0 is the first step. */
export type YearIndex = number;

/** Step label — an absolute integer, often a calendar year. */
export type Year = number;

/**
 * Time series data - array indexed by step (0 = first step)
 */
export type TimeSeries<T> = T[];


/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Range constraint for numeric parameters
 */
export interface Range {
  min?: number;
  max?: number;
  default: number;
}

/**
 * Parameter metadata for documentation and validation
 */
export interface ParamMeta {
  description: string;
  unit: string;
  range: Range;
  tier: 1 | 2 | 3;  // 1 = user-facing, 2 = scenario, 3 = calibration
  source?: string;  // Academic source
  /** Friendly key for introspection (e.g., 'climateSensitivity'). Defaults to leaf key name. */
  paramName?: string;
}


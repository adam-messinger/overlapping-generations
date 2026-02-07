/**
 * Core types for the simulation framework
 */

/** Year index (0 = 2025, 75 = 2100) */
export type YearIndex = number;

/** Absolute year (2025-2100) */
export type Year = number;

/**
 * Time series data - array indexed by year (0 = 2025)
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


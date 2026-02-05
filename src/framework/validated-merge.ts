/**
 * Validate-on-Construct Pattern
 *
 * Julia-inspired: parameters are validated at construction time,
 * so invalid params never exist. mergeParams() calls validate()
 * internally.
 */

import { ValidationResult } from './types.js';

/**
 * Wraps a module's merge + validate into a single operation.
 * Throws on validation errors, logs warnings to console.
 *
 * @param moduleName - Module name for error messages
 * @param validateFn - Module's validate function
 * @param mergeFn - Function that merges partial params with defaults
 * @param partial - Partial params to merge
 * @returns Fully merged and validated params
 */
export function validatedMerge<TParams>(
  moduleName: string,
  validateFn: (params: Partial<TParams>) => ValidationResult,
  mergeFn: (partial: Partial<TParams>) => TParams,
  partial: Partial<TParams>
): TParams {
  const merged = mergeFn(partial);

  const result = validateFn(merged);

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      console.warn(`[${moduleName}] Warning: ${warning}`);
    }
  }

  if (!result.valid) {
    throw new Error(
      `[${moduleName}] Invalid parameters:\n  ${result.errors.join('\n  ')}`
    );
  }

  return merged;
}

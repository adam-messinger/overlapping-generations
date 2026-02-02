/**
 * Differentiable Interface
 *
 * Utilities to make simulations compatible with automatic differentiation.
 *
 * AD libraries (like JAX, TensorFlow, or future TS AD tools) work best with:
 * 1. Pure functions: f(x) -> y with no side effects
 * 2. Flat arrays: params as Float64Array, not nested objects
 * 3. Scalar outputs: loss/objective as a single number
 *
 * This module provides:
 * - flatten/unflatten: convert between nested params and flat arrays
 * - differentiableSimulation: wrapper that takes flat array, returns scalar
 *
 * Usage with hypothetical AD library:
 * ```typescript
 * const loss = (x: number[]) => differentiableSimulation(x, schema).warming2100;
 * const gradient = ad.grad(loss);
 * const sensitivity = gradient(flatDefaults);
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Schema describing how to flatten/unflatten a parameter object
 */
export interface ParamSchema {
  /** Parameter path (e.g., 'climate.sensitivity') */
  path: string;
  /** Index in flat array */
  index: number;
  /** Default value */
  default: number;
  /** Optional bounds for optimization */
  min?: number;
  max?: number;
  /** Human-readable description */
  description?: string;
}

/**
 * Complete flattening schema for a simulation
 */
export interface FlatteningSchema {
  /** Ordered list of parameters */
  params: ParamSchema[];
  /** Total length of flat array */
  length: number;
  /** Map from path to index for quick lookup */
  pathToIndex: Map<string, number>;
}

// =============================================================================
// FLATTEN / UNFLATTEN
// =============================================================================

/**
 * Create a flattening schema from a nested params object
 *
 * Only includes numeric values (not arrays, objects, or strings)
 */
export function createSchema(
  params: Record<string, any>,
  prefix = ''
): FlatteningSchema {
  const schemaParams: ParamSchema[] = [];
  let index = 0;

  function traverse(obj: Record<string, any>, path: string) {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;

      if (typeof value === 'number' && isFinite(value)) {
        schemaParams.push({
          path: fullPath,
          index: index++,
          default: value,
        });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        traverse(value, fullPath);
      }
      // Skip arrays, strings, booleans, etc.
    }
  }

  traverse(params, prefix);

  const pathToIndex = new Map<string, number>();
  for (const p of schemaParams) {
    pathToIndex.set(p.path, p.index);
  }

  return {
    params: schemaParams,
    length: schemaParams.length,
    pathToIndex,
  };
}

/**
 * Flatten a nested params object to a numeric array
 */
export function flatten(
  params: Record<string, any>,
  schema: FlatteningSchema
): number[] {
  const flat = new Array(schema.length).fill(0);

  function traverse(obj: Record<string, any>, path: string) {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;

      if (typeof value === 'number' && isFinite(value)) {
        const idx = schema.pathToIndex.get(fullPath);
        if (idx !== undefined) {
          flat[idx] = value;
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        traverse(value, fullPath);
      }
    }
  }

  traverse(params, '');
  return flat;
}

/**
 * Unflatten a numeric array back to nested params object
 */
export function unflatten(
  flat: number[],
  schema: FlatteningSchema,
  template: Record<string, any>
): Record<string, any> {
  // Deep clone template
  const result = JSON.parse(JSON.stringify(template));

  for (const param of schema.params) {
    const value = flat[param.index];
    setPath(result, param.path, value);
  }

  return result;
}

/**
 * Set a value at a nested path
 */
function setPath(obj: Record<string, any>, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Get a value at a nested path
 */
export function getPath(obj: Record<string, any>, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

// =============================================================================
// DIFFERENTIABLE SIMULATION WRAPPER
// =============================================================================

/**
 * Options for differentiable simulation
 */
export interface DifferentiableOptions {
  /** Which output to return (e.g., 'warming2100') */
  output: string;
  /** Fixed parameters not in the flat array */
  fixed?: Record<string, any>;
  /** Start year */
  startYear?: number;
  /** End year */
  endYear?: number;
}

/**
 * Result of a differentiable simulation
 */
export interface DifferentiableResult {
  /** The scalar output value */
  value: number;
  /** All outputs (for debugging) */
  outputs: Record<string, any>;
}

/**
 * Create a differentiable simulation function
 *
 * Returns a pure function: flatParams -> scalar
 *
 * @param runFn - The simulation runner function
 * @param schema - Flattening schema for parameters
 * @param template - Template params object
 * @param options - Which output to extract
 */
export function createDifferentiableSimulation(
  runFn: (params: Record<string, any>) => { results: Array<Record<string, any>> },
  schema: FlatteningSchema,
  template: Record<string, any>,
  options: DifferentiableOptions
): (flatParams: number[]) => number {
  const { output, fixed = {}, startYear = 2025, endYear = 2100 } = options;

  return (flatParams: number[]): number => {
    // Unflatten parameters
    const params = unflatten(flatParams, schema, template);

    // Merge with fixed params
    const merged = deepMerge(params, fixed);

    // Run simulation
    const result = runFn({
      ...merged,
      startYear,
      endYear,
    });

    // Extract output
    const yearIdx = endYear - startYear;
    const finalYear = result.results[yearIdx];

    if (finalYear === undefined) {
      throw new Error(`No result for year ${endYear}`);
    }

    const value = getPath(finalYear, output);
    if (typeof value !== 'number') {
      throw new Error(`Output '${output}' is not a number: ${typeof value}`);
    }

    return value;
  };
}

/**
 * Deep merge two objects
 */
function deepMerge(target: any, source: any): any {
  if (source === undefined) return target;
  if (typeof source !== 'object' || source === null) return source;
  if (typeof target !== 'object' || target === null) return source;

  const result = { ...target };
  for (const key of Object.keys(source)) {
    result[key] = deepMerge(target[key], source[key]);
  }
  return result;
}

// =============================================================================
// NUMERICAL GRADIENT (FOR TESTING)
// =============================================================================

/**
 * Compute numerical gradient using central differences
 *
 * This is slow but useful for testing/validation.
 * Real AD would be much faster.
 */
export function numericalGradient(
  fn: (x: number[]) => number,
  x: number[],
  epsilon = 1e-5
): number[] {
  const grad = new Array(x.length);

  for (let i = 0; i < x.length; i++) {
    const xPlus = [...x];
    const xMinus = [...x];
    xPlus[i] += epsilon;
    xMinus[i] -= epsilon;

    grad[i] = (fn(xPlus) - fn(xMinus)) / (2 * epsilon);
  }

  return grad;
}

/**
 * Find which parameters have the largest gradient magnitude
 * (i.e., which parameters most affect the output)
 */
export function sensitivityAnalysis(
  fn: (x: number[]) => number,
  x: number[],
  schema: FlatteningSchema,
  epsilon = 1e-5
): Array<{ path: string; sensitivity: number; value: number }> {
  const grad = numericalGradient(fn, x, epsilon);

  const results = schema.params.map((param, i) => ({
    path: param.path,
    sensitivity: Math.abs(grad[i]),
    value: x[i],
  }));

  // Sort by sensitivity (highest first)
  results.sort((a, b) => b.sensitivity - a.sensitivity);

  return results;
}

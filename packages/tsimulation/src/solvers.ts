import { assertFiniteDeep, validateNumber } from './validation.js';

export interface LinearSolveOptions {
  singularTolerance?: number;
}

export interface LinearSolveResult {
  solution: number[];
  residualInfinityNorm: number;
  minimumPivot: number;
  maximumPivot: number;
  pivotRatio: number;
}

export function solveLinearSystem(
  matrix: readonly (readonly number[])[],
  vector: readonly number[],
  options: LinearSolveOptions = {},
): LinearSolveResult {
  const n = vector.length;
  if (n === 0) throw new Error('Linear system must not be empty');
  if (matrix.length !== n || matrix.some((row) => row.length !== n)) {
    throw new Error(`Linear system must be square (${n}x${n})`);
  }
  assertFiniteDeep(matrix, 'matrix');
  assertFiniteDeep(vector, 'vector');
  const singularTolerance = options.singularTolerance ?? 1e-12;
  const toleranceErrors = validateNumber(singularTolerance, 'singularTolerance', {
    min: 0,
    exclusiveMin: true,
  });
  if (toleranceErrors.length > 0) throw new Error(toleranceErrors.join('; '));

  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  let minimumPivot = Number.POSITIVE_INFINITY;
  let maximumPivot = 0;
  for (let pivot = 0; pivot < n; pivot++) {
    let best = pivot;
    for (let row = pivot + 1; row < n; row++) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) best = row;
    }
    const pivotMagnitude = Math.abs(augmented[best][pivot]);
    if (pivotMagnitude < singularTolerance) {
      throw new Error(`Singular or ill-conditioned linear system at pivot ${pivot}`);
    }
    minimumPivot = Math.min(minimumPivot, pivotMagnitude);
    maximumPivot = Math.max(maximumPivot, pivotMagnitude);
    [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
    const divisor = augmented[pivot][pivot];
    for (let column = pivot; column <= n; column++) augmented[pivot][column] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      for (let column = pivot; column <= n; column++) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }
  const solution = augmented.map((row) => row[n]);
  const residualInfinityNorm = matrix.reduce((maximum, row, rowIndex) => {
    const fitted = row.reduce((sum, coefficient, column) => sum + coefficient * solution[column], 0);
    return Math.max(maximum, Math.abs(fitted - vector[rowIndex]));
  }, 0);
  return {
    solution,
    residualInfinityNorm,
    minimumPivot,
    maximumPivot,
    pivotRatio: maximumPivot / minimumPivot,
  };
}

export interface FixedPointOptions {
  tolerance?: number;
  maxIterations?: number;
  damping?: number;
}

export interface FixedPointResult {
  value: number[];
  converged: boolean;
  iterations: number;
  residualInfinityNorm: number;
  termination: 'converged' | 'max-iterations' | 'non-finite';
}

export function solveFixedPoint(
  initial: readonly number[],
  iterate: (value: readonly number[], iteration: number) => readonly number[],
  options: FixedPointOptions = {},
): FixedPointResult {
  if (initial.length === 0) throw new Error('Fixed-point vector must not be empty');
  assertFiniteDeep(initial, 'initial');
  const tolerance = options.tolerance ?? 1e-8;
  const maxIterations = options.maxIterations ?? 1_000;
  const damping = options.damping ?? 1;
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error('tolerance must be finite and >= 0');
  if (!Number.isInteger(maxIterations) || maxIterations < 1) throw new Error('maxIterations must be an integer >= 1');
  if (!(damping > 0 && damping <= 1)) throw new Error('damping must be in (0, 1]');
  let value = [...initial];
  let residualInfinityNorm = Number.POSITIVE_INFINITY;
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const candidate = [...iterate(value, iteration)];
    if (candidate.length !== value.length || candidate.some((item) => !Number.isFinite(item))) {
      return {
        value,
        converged: false,
        iterations: iteration,
        residualInfinityNorm: Number.POSITIVE_INFINITY,
        termination: 'non-finite',
      };
    }
    residualInfinityNorm = candidate.reduce(
      (maximum, item, index) => Math.max(maximum, Math.abs(item - value[index])),
      0,
    );
    value = candidate.map((item, index) => value[index] + damping * (item - value[index]));
    if (residualInfinityNorm <= tolerance) {
      return { value: candidate, converged: true, iterations: iteration, residualInfinityNorm, termination: 'converged' };
    }
  }
  return { value, converged: false, iterations: maxIterations, residualInfinityNorm, termination: 'max-iterations' };
}

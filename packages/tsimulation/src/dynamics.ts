/** Dependency-free local diagnostics for discrete-time dynamical systems. */

export type StateVector = readonly number[];
export type DiscreteMap = (state: StateVector) => StateVector;

export interface FiniteDifferenceOptions {
  /** Absolute perturbation floor. Default: 1e-6. */
  absoluteStep?: number;
  /** Scale-relative perturbation. Default: 1e-5. */
  relativeStep?: number;
  /**
   * Optional coordinate lower bounds. A forward difference is used whenever
   * the central perturbation would cross a bound.
   */
  lowerBounds?: StateVector;
}

export interface ComplexEigenvalue {
  real: number;
  imaginary: number;
  magnitude: number;
}

export type StabilityClassification = 'stable' | 'marginal' | 'unstable';

export interface DiscreteStability2D {
  jacobian: readonly [readonly [number, number], readonly [number, number]];
  trace: number;
  determinant: number;
  eigenvalues: readonly [ComplexEigenvalue, ComplexEigenvalue];
  spectralRadius: number;
  classification: StabilityClassification;
}

function assertFiniteVector(vector: StateVector, context: string): void {
  if (vector.length === 0) throw new Error(`${context} must be non-empty`);
  vector.forEach((value, index) => {
    if (!Number.isFinite(value)) throw new Error(`${context}[${index}] must be finite`);
  });
}

/**
 * Finite-difference Jacobian. Central differences are used in the interior
 * and forward differences at supplied lower bounds. The map must return the
 * same number of outputs as state variables.
 */
export function finiteDifferenceJacobian(
  map: DiscreteMap,
  point: StateVector,
  options: FiniteDifferenceOptions = {},
): number[][] {
  assertFiniteVector(point, 'Jacobian point');
  const absoluteStep = options.absoluteStep ?? 1e-6;
  const relativeStep = options.relativeStep ?? 1e-5;
  if (!Number.isFinite(absoluteStep) || absoluteStep <= 0) {
    throw new Error('Jacobian absoluteStep must be finite and positive');
  }
  if (!Number.isFinite(relativeStep) || relativeStep < 0) {
    throw new Error('Jacobian relativeStep must be finite and non-negative');
  }

  const dimension = point.length;
  const lowerBounds = options.lowerBounds;
  if (lowerBounds !== undefined) {
    if (lowerBounds.length !== dimension) {
      throw new Error(`Jacobian lowerBounds must contain ${dimension} values`);
    }
    lowerBounds.forEach((bound, index) => {
      if (!Number.isFinite(bound)) {
        throw new Error(`Jacobian lowerBounds[${index}] must be finite`);
      }
      if (point[index] < bound) {
        throw new Error(`Jacobian point[${index}] must be >= lowerBounds[${index}]`);
      }
    });
  }

  const jacobian = Array.from({ length: dimension }, () =>
    Array.from({ length: dimension }, () => 0));
  let fAtPoint: StateVector | undefined;
  const evaluate = (state: StateVector): StateVector => {
    const output = map(state);
    assertFiniteVector(output, 'Jacobian map output');
    if (output.length !== dimension) {
      throw new Error(
        `Jacobian map must return ${dimension} values (got ${output.length})`,
      );
    }
    return output;
  };
  for (let column = 0; column < dimension; column++) {
    const step = Math.max(absoluteStep, Math.abs(point[column]) * relativeStep);
    const above = [...point];
    above[column] += step;
    const fAbove = evaluate(above);
    const useForwardDifference =
      lowerBounds !== undefined && point[column] - step < lowerBounds[column];
    const below = [...point];
    below[column] -= step;
    const fBelow = useForwardDifference
      ? (fAtPoint ??= evaluate(point))
      : evaluate(below);
    const denominator = useForwardDifference ? step : 2 * step;
    for (let row = 0; row < dimension; row++) {
      jacobian[row][column] = (fAbove[row] - fBelow[row]) / denominator;
    }
  }
  return jacobian;
}

/** Exact eigenvalue and spectral-radius analysis for a two-state discrete map. */
export function analyzeDiscreteStability2D(
  jacobian: readonly (readonly number[])[],
  marginalTolerance = 1e-6,
): DiscreteStability2D {
  if (
    jacobian.length !== 2
    || jacobian.some((row) => row.length !== 2)
    || jacobian.flat().some((value) => !Number.isFinite(value))
  ) {
    throw new Error('2D stability analysis requires a finite 2x2 Jacobian');
  }
  if (!Number.isFinite(marginalTolerance) || marginalTolerance < 0) {
    throw new Error('marginalTolerance must be finite and non-negative');
  }
  const a = jacobian[0][0];
  const b = jacobian[0][1];
  const c = jacobian[1][0];
  const d = jacobian[1][1];
  const trace = a + d;
  const determinant = a * d - b * c;
  const discriminant = trace * trace - 4 * determinant;
  let eigenvalues: [ComplexEigenvalue, ComplexEigenvalue];
  if (discriminant >= 0) {
    const root = Math.sqrt(discriminant);
    const first = (trace + root) / 2;
    const second = (trace - root) / 2;
    eigenvalues = [
      { real: first, imaginary: 0, magnitude: Math.abs(first) },
      { real: second, imaginary: 0, magnitude: Math.abs(second) },
    ];
  } else {
    const real = trace / 2;
    const imaginary = Math.sqrt(-discriminant) / 2;
    const magnitude = Math.hypot(real, imaginary);
    eigenvalues = [
      { real, imaginary, magnitude },
      { real, imaginary: -imaginary, magnitude },
    ];
  }
  const spectralRadius = Math.max(...eigenvalues.map((value) => value.magnitude));
  const classification: StabilityClassification =
    spectralRadius < 1 - marginalTolerance
      ? 'stable'
      : spectralRadius > 1 + marginalTolerance
        ? 'unstable'
        : 'marginal';
  return {
    jacobian: [
      [a, b],
      [c, d],
    ],
    trace,
    determinant,
    eigenvalues,
    spectralRadius,
    classification,
  };
}

/**
 * Tests for differentiable interface
 */

import {
  createSchema,
  flatten,
  unflatten,
  getPath,
  numericalGradient,
  sensitivityAnalysis,
  createDifferentiableSimulation,
} from './differentiable.js';

// =============================================================================
// TEST UTILITIES
// =============================================================================

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    const error = err instanceof Error ? err.message : String(err);
    console.log(`✗ ${name}`);
    console.log(`  ${error}`);
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeCloseTo(expected: number, precision = 5) {
      if (typeof actual !== 'number') {
        throw new Error(`Expected number, got ${typeof actual}`);
      }
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision);
      if (diff > tolerance) {
        throw new Error(`Expected ${expected} (±${tolerance}), got ${actual}`);
      }
    },
    toHaveLength(expected: number) {
      if (!Array.isArray(actual) || actual.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${Array.isArray(actual) ? actual.length : 'not an array'}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
  };
}

// =============================================================================
// TEST DATA
// =============================================================================

const testParams = {
  climate: {
    sensitivity: 3.0,
    damageCoeff: 0.00236,
    tippingThreshold: 2.5,
  },
  energy: {
    carbonPrice: 35,
    solarAlpha: 0.36,
  },
  simple: 100,
};

// =============================================================================
// TESTS: SCHEMA CREATION
// =============================================================================

console.log('\n=== Schema Tests ===\n');

test('createSchema extracts numeric parameters', () => {
  const schema = createSchema(testParams);

  expect(schema.length).toBe(6);
  expect(schema.pathToIndex.has('climate.sensitivity')).toBe(true);
  expect(schema.pathToIndex.has('energy.carbonPrice')).toBe(true);
  expect(schema.pathToIndex.has('simple')).toBe(true);
});

test('createSchema ignores non-numeric values', () => {
  const paramsWithStrings = {
    ...testParams,
    name: 'test',
    enabled: true,
    data: [1, 2, 3],
  };

  const schema = createSchema(paramsWithStrings);
  expect(schema.length).toBe(6); // Same as before, ignores string/bool/array
});

test('createSchema preserves order', () => {
  const schema = createSchema(testParams);

  // Should be in traversal order
  const paths = schema.params.map(p => p.path);
  expect(paths.includes('climate.sensitivity')).toBe(true);
  expect(paths.includes('energy.carbonPrice')).toBe(true);
});

// =============================================================================
// TESTS: FLATTEN / UNFLATTEN
// =============================================================================

console.log('\n=== Flatten/Unflatten Tests ===\n');

test('flatten creates array from params', () => {
  const schema = createSchema(testParams);
  const flat = flatten(testParams, schema);

  expect(flat).toHaveLength(6);

  // Check specific values
  const sensitivityIdx = schema.pathToIndex.get('climate.sensitivity')!;
  expect(flat[sensitivityIdx]).toBe(3.0);

  const carbonIdx = schema.pathToIndex.get('energy.carbonPrice')!;
  expect(flat[carbonIdx]).toBe(35);
});

test('unflatten reconstructs params from array', () => {
  const schema = createSchema(testParams);
  const flat = flatten(testParams, schema);

  // Modify the flat array
  const sensitivityIdx = schema.pathToIndex.get('climate.sensitivity')!;
  flat[sensitivityIdx] = 4.5;

  const reconstructed = unflatten(flat, schema, testParams);

  expect(reconstructed.climate.sensitivity).toBe(4.5);
  expect(reconstructed.energy.carbonPrice).toBe(35); // Unchanged
});

test('flatten/unflatten roundtrip preserves values', () => {
  const schema = createSchema(testParams);
  const flat = flatten(testParams, schema);
  const reconstructed = unflatten(flat, schema, testParams);

  expect(reconstructed.climate.sensitivity).toBe(testParams.climate.sensitivity);
  expect(reconstructed.climate.damageCoeff).toBe(testParams.climate.damageCoeff);
  expect(reconstructed.energy.carbonPrice).toBe(testParams.energy.carbonPrice);
  expect(reconstructed.simple).toBe(testParams.simple);
});

// =============================================================================
// TESTS: PATH HELPERS
// =============================================================================

console.log('\n=== Path Helper Tests ===\n');

test('getPath extracts nested values', () => {
  expect(getPath(testParams, 'climate.sensitivity')).toBe(3.0);
  expect(getPath(testParams, 'energy.carbonPrice')).toBe(35);
  expect(getPath(testParams, 'simple')).toBe(100);
});

test('getPath returns undefined for missing paths', () => {
  expect(getPath(testParams, 'nonexistent')).toBe(undefined);
  expect(getPath(testParams, 'climate.nonexistent')).toBe(undefined);
});

// =============================================================================
// TESTS: NUMERICAL GRADIENT
// =============================================================================

console.log('\n=== Numerical Gradient Tests ===\n');

test('numericalGradient computes gradient of quadratic', () => {
  // f(x) = x[0]^2 + 2*x[1]^2
  // df/dx[0] = 2*x[0], df/dx[1] = 4*x[1]
  const f = (x: number[]) => x[0] * x[0] + 2 * x[1] * x[1];

  const x = [3, 2];
  const grad = numericalGradient(f, x);

  expect(grad[0]).toBeCloseTo(6, 4);  // 2 * 3 = 6
  expect(grad[1]).toBeCloseTo(8, 4);  // 4 * 2 = 8
});

test('numericalGradient handles linear function', () => {
  // f(x) = 2*x[0] + 3*x[1] + 5
  // df/dx[0] = 2, df/dx[1] = 3
  const f = (x: number[]) => 2 * x[0] + 3 * x[1] + 5;

  const x = [10, 20];
  const grad = numericalGradient(f, x);

  expect(grad[0]).toBeCloseTo(2, 4);
  expect(grad[1]).toBeCloseTo(3, 4);
});

// =============================================================================
// TESTS: SENSITIVITY ANALYSIS
// =============================================================================

console.log('\n=== Sensitivity Analysis Tests ===\n');

test('sensitivityAnalysis identifies sensitive parameters', () => {
  // f(x) = 100*x[0] + x[1] + 0.001*x[2]
  // Gradient: [100, 1, 0.001]
  // x[0] is most sensitive
  const f = (x: number[]) => 100 * x[0] + x[1] + 0.001 * x[2];

  const schema = createSchema({ a: 1, b: 1, c: 1 });
  const x = [1, 1, 1];

  const results = sensitivityAnalysis(f, x, schema);

  // Should be sorted by sensitivity (highest first)
  expect(results[0].path).toBe('a');
  expect(results[0].sensitivity).toBeCloseTo(100, 2);
  expect(results[1].path).toBe('b');
  expect(results[2].path).toBe('c');
});

// =============================================================================
// TESTS: DIFFERENTIABLE SIMULATION
// =============================================================================

console.log('\n=== Differentiable Simulation Tests ===\n');

test('createDifferentiableSimulation wraps simulation correctly', () => {
  // Mock simulation that returns temperature = sensitivity * 0.5
  const mockRun = (params: Record<string, any>) => ({
    results: [
      { temperature: params.climate?.sensitivity * 0.5 || 1.5 },
    ],
  });

  const schema = createSchema({ climate: { sensitivity: 3.0 } });
  const template = { climate: { sensitivity: 3.0 } };

  const diffSim = createDifferentiableSimulation(
    mockRun,
    schema,
    template,
    { output: 'temperature', startYear: 2025, endYear: 2025 }
  );

  // Default params
  const result = diffSim([3.0]);
  expect(result).toBeCloseTo(1.5, 4);

  // Modified params
  const result2 = diffSim([4.0]);
  expect(result2).toBeCloseTo(2.0, 4);
});

test('createDifferentiableSimulation allows gradient computation', () => {
  // Mock simulation: temp = sensitivity^2 / 10
  const mockRun = (params: Record<string, any>) => ({
    results: [
      { temperature: Math.pow(params.climate?.sensitivity || 3, 2) / 10 },
    ],
  });

  const schema = createSchema({ climate: { sensitivity: 3.0 } });
  const template = { climate: { sensitivity: 3.0 } };

  const diffSim = createDifferentiableSimulation(
    mockRun,
    schema,
    template,
    { output: 'temperature', startYear: 2025, endYear: 2025 }
  );

  // Compute gradient: d(s^2/10)/ds = 2s/10 = s/5
  // At s=3: gradient = 3/5 = 0.6
  const grad = numericalGradient(diffSim, [3.0]);
  expect(grad[0]).toBeCloseTo(0.6, 3);
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n=== Summary ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}

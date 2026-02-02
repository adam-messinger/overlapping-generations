/**
 * Tests for automatic dependency resolution
 */

import {
  buildOutputRegistry,
  buildDependencyGraph,
  topologicalSort,
  runAutowired,
  getOutputsAtYear,
  getTimeSeries,
  AnyModule,
} from './autowire.js';
import { defineModule } from './module.js';

// =============================================================================
// TEST UTILITIES
// =============================================================================

let passed = 0;
let failed = 0;
const results: { name: string; passed: boolean; error?: string }[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    const error = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error });
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
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true, got ${actual}`);
      }
    },
    toBeFalse() {
      if (actual !== false) {
        throw new Error(`Expected false, got ${actual}`);
      }
    },
    toThrow(message?: string) {
      if (typeof actual !== 'function') {
        throw new Error('Expected a function');
      }
      try {
        (actual as () => void)();
        throw new Error('Expected function to throw');
      } catch (err) {
        if (message && err instanceof Error && !err.message.includes(message)) {
          throw new Error(`Expected error containing "${message}", got "${err.message}"`);
        }
      }
    },
    toHaveLength(expected: number) {
      if (!Array.isArray(actual) || actual.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${Array.isArray(actual) ? actual.length : 'not an array'}`);
      }
    },
  };
}

// =============================================================================
// TEST MODULES
// =============================================================================

// Simple module with no inputs (root)
const rootModule = defineModule({
  name: 'root',
  description: 'Root module with no dependencies',
  defaults: { initial: 100 },
  inputs: [] as const,
  outputs: ['value', 'doubled'] as const,
  validate: () => ({ valid: true, errors: [], warnings: [] }),
  mergeParams: (p) => ({ initial: 100, ...p }),
  init: (params) => ({ current: params.initial }),
  step: (state, _inputs, _params, _year, yearIndex) => ({
    state: { current: state.current + 1 },
    outputs: {
      value: state.current + yearIndex,
      doubled: (state.current + yearIndex) * 2,
    },
  }),
});

// Module that depends on root
const dependentModule = defineModule({
  name: 'dependent',
  description: 'Depends on root module',
  defaults: { multiplier: 10 },
  inputs: ['value'] as const,
  outputs: ['result'] as const,
  validate: () => ({ valid: true, errors: [], warnings: [] }),
  mergeParams: (p) => ({ multiplier: 10, ...p }),
  init: () => ({}),
  step: (_state, inputs, params, _year, _yearIndex) => ({
    state: {},
    outputs: {
      result: inputs.value * params.multiplier,
    },
  }),
});

// Module with feedback (needs lagged value)
const feedbackModule = defineModule({
  name: 'feedback',
  description: 'Needs lagged value',
  defaults: {},
  inputs: ['value', 'laggedResult'] as const,
  outputs: ['accumulated'] as const,
  validate: () => ({ valid: true, errors: [], warnings: [] }),
  mergeParams: (p) => ({ ...p }),
  init: () => ({ total: 0 }),
  step: (state, inputs, _params, _year, _yearIndex) => {
    const newTotal = state.total + inputs.value + (inputs.laggedResult || 0);
    return {
      state: { total: newTotal },
      outputs: { accumulated: newTotal },
    };
  },
});

// =============================================================================
// TESTS: OUTPUT REGISTRY
// =============================================================================

console.log('\n=== Output Registry Tests ===\n');

test('buildOutputRegistry creates mapping from outputs to modules', () => {
  const registry = buildOutputRegistry([rootModule, dependentModule]);

  expect(registry.get('value')).toBe('root');
  expect(registry.get('doubled')).toBe('root');
  expect(registry.get('result')).toBe('dependent');
  expect(registry.size).toBe(3);
});

test('buildOutputRegistry detects collisions', () => {
  const collision = defineModule({
    name: 'collision',
    description: 'Has same output as root',
    defaults: {},
    inputs: [] as const,
    outputs: ['value'] as const, // Collision with root
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { value: 0 } }),
  });

  expect(() => buildOutputRegistry([rootModule, collision])).toThrow('collision');
});

// =============================================================================
// TESTS: DEPENDENCY GRAPH
// =============================================================================

console.log('\n=== Dependency Graph Tests ===\n');

test('buildDependencyGraph identifies dependencies', () => {
  const registry = buildOutputRegistry([rootModule, dependentModule]);
  const graph = buildDependencyGraph([rootModule, dependentModule], registry);

  const rootNode = graph.get('root')!;
  const depNode = graph.get('dependent')!;

  expect(rootNode.dependsOn.size).toBe(0);
  expect(rootNode.providesTo.has('dependent')).toBeTrue();

  expect(depNode.dependsOn.has('root')).toBeTrue();
  expect(depNode.providesTo.size).toBe(0);
});

test('buildDependencyGraph throws on unresolved input', () => {
  const orphan = defineModule({
    name: 'orphan',
    description: 'Needs something that does not exist',
    defaults: {},
    inputs: ['nonexistent'] as const,
    outputs: ['orphanOut'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { orphanOut: 0 } }),
  });

  const registry = buildOutputRegistry([orphan]);
  expect(() => buildDependencyGraph([orphan], registry)).toThrow('Unresolved input');
});

test('buildDependencyGraph allows transforms for computed inputs', () => {
  const computed = defineModule({
    name: 'computed',
    description: 'Needs a computed input',
    defaults: {},
    inputs: ['computedValue'] as const,
    outputs: ['computedOut'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { computedOut: inputs.computedValue * 2 } }),
  });

  const registry = buildOutputRegistry([rootModule, computed]);
  const transforms = {
    computedValue: (outputs: Record<string, any>) => outputs.value + outputs.doubled,
  };

  // Should not throw
  const graph = buildDependencyGraph([rootModule, computed], registry, transforms);
  expect(graph.size).toBe(2);
});

test('transforms with dependsOn create proper dependency edges', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces rawValue',
    defaults: {},
    inputs: [] as const,
    outputs: ['rawValue'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { rawValue: 42 } }),
  });

  const consumer = defineModule({
    name: 'consumer',
    description: 'Consumes derivedValue (provided by transform)',
    defaults: {},
    inputs: ['derivedValue'] as const,
    outputs: ['result'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { result: inputs.derivedValue * 2 } }),
  });

  const transforms = {
    derivedValue: {
      fn: (outputs: Record<string, any>) => outputs.rawValue * 2,
      dependsOn: ['rawValue'],
    },
  };

  const registry = buildOutputRegistry([producer, consumer]);
  const graph = buildDependencyGraph([producer, consumer], registry, transforms);

  // Consumer should depend on producer (via transform's dependsOn)
  expect(graph.get('consumer')!.dependsOn.has('producer')).toBeTrue();
  expect(graph.get('producer')!.providesTo.has('consumer')).toBeTrue();
});

test('transforms without dependsOn (bare functions) still work but create no edges', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces rawValue',
    defaults: {},
    inputs: [] as const,
    outputs: ['rawValue'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { rawValue: 42 } }),
  });

  const consumer = defineModule({
    name: 'consumer',
    description: 'Consumes derivedValue (provided by transform)',
    defaults: {},
    inputs: ['derivedValue'] as const,
    outputs: ['result'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { result: inputs.derivedValue * 2 } }),
  });

  // Bare function - backwards compatible but no dependency edge
  const transforms = {
    derivedValue: (outputs: Record<string, any>) => outputs.rawValue * 2,
  };

  const registry = buildOutputRegistry([producer, consumer]);
  const graph = buildDependencyGraph([producer, consumer], registry, transforms);

  // Consumer should NOT depend on producer (bare function has no dependsOn)
  expect(graph.get('consumer')!.dependsOn.has('producer')).toBeFalse();
});

// =============================================================================
// TESTS: TOPOLOGICAL SORT
// =============================================================================

console.log('\n=== Topological Sort Tests ===\n');

test('topologicalSort orders modules correctly', () => {
  const registry = buildOutputRegistry([rootModule, dependentModule]);
  const graph = buildDependencyGraph([rootModule, dependentModule], registry);
  const sorted = topologicalSort(graph);

  // Root must come before dependent
  const rootIdx = sorted.findIndex(m => m.name === 'root');
  const depIdx = sorted.findIndex(m => m.name === 'dependent');

  expect(rootIdx < depIdx).toBeTrue();
});

test('topologicalSort handles multiple roots', () => {
  const root2 = defineModule({
    name: 'root2',
    description: 'Another root',
    defaults: {},
    inputs: [] as const,
    outputs: ['value2'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { value2: 999 } }),
  });

  const multi = defineModule({
    name: 'multi',
    description: 'Depends on both roots',
    defaults: {},
    inputs: ['value', 'value2'] as const,
    outputs: ['combined'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { combined: inputs.value + inputs.value2 } }),
  });

  const registry = buildOutputRegistry([rootModule, root2, multi]);
  const graph = buildDependencyGraph([rootModule, root2, multi], registry);
  const sorted = topologicalSort(graph);

  // Both roots must come before multi
  const rootIdx = sorted.findIndex(m => m.name === 'root');
  const root2Idx = sorted.findIndex(m => m.name === 'root2');
  const multiIdx = sorted.findIndex(m => m.name === 'multi');

  expect(rootIdx < multiIdx).toBeTrue();
  expect(root2Idx < multiIdx).toBeTrue();
});

test('topologicalSort detects cycles', () => {
  const cycleA = defineModule({
    name: 'cycleA',
    description: 'Part of cycle',
    defaults: {},
    inputs: ['fromB'] as const,
    outputs: ['toB'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { toB: 1 } }),
  });

  const cycleB = defineModule({
    name: 'cycleB',
    description: 'Part of cycle',
    defaults: {},
    inputs: ['toB'] as const,
    outputs: ['fromB'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { fromB: 2 } }),
  });

  const registry = buildOutputRegistry([cycleA, cycleB]);
  const graph = buildDependencyGraph([cycleA, cycleB], registry);

  expect(() => topologicalSort(graph)).toThrow('cycle');
});

// =============================================================================
// TESTS: FULL SIMULATION
// =============================================================================

console.log('\n=== Simulation Tests ===\n');

test('runAutowired executes modules in correct order', () => {
  const result = runAutowired({
    modules: [dependentModule, rootModule], // Wrong order - should be auto-sorted
    startYear: 2025,
    endYear: 2027,
  });

  expect(result.years).toHaveLength(3);

  // Root outputs: value = state.current + yearIndex
  // state.current starts at 100, increments each year
  // Year 0: current=100, value=100+0=100, new current=101
  // Year 1: current=101, value=101+1=102, new current=102
  // Year 2: current=102, value=102+2=104, new current=103
  const rootValues = result.outputs.root.value;
  expect(rootValues[0]).toBe(100); // year 2025, yearIndex 0
  expect(rootValues[1]).toBe(102); // year 2026, yearIndex 1
  expect(rootValues[2]).toBe(104); // year 2027, yearIndex 2

  // Dependent outputs: result = value * 10
  const depResults = result.outputs.dependent.result;
  expect(depResults[0]).toBe(1000);
  expect(depResults[1]).toBe(1020);
  expect(depResults[2]).toBe(1040);
});

test('runAutowired handles transforms', () => {
  const computed = defineModule({
    name: 'computed',
    description: 'Uses computed input',
    defaults: {},
    inputs: ['summed'] as const,
    outputs: ['final'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { final: inputs.summed } }),
  });

  const result = runAutowired({
    modules: [rootModule, computed],
    transforms: {
      summed: (outputs) => outputs.value + outputs.doubled,
    },
    startYear: 2025,
    endYear: 2026,
  });

  // summed = value + doubled = 100 + 200 = 300 for year 0
  expect(result.outputs.computed.final[0]).toBe(300);
});

test('runAutowired handles lags for feedback', () => {
  const result = runAutowired({
    modules: [rootModule, feedbackModule],
    lags: {
      laggedResult: {
        source: 'accumulated',
        delay: 1,
        initial: 0,
      },
    },
    startYear: 2025,
    endYear: 2027,
  });

  const accumulated = result.outputs.feedback.accumulated;

  // Year 0: state.total=0, value=100, lagged=0, newTotal = 0 + 100 + 0 = 100
  expect(accumulated[0]).toBe(100);

  // Year 1: state.total=100, value=102, lagged=100, newTotal = 100 + 102 + 100 = 302
  expect(accumulated[1]).toBe(302);
});

test('runAutowired applies parameter overrides', () => {
  const result = runAutowired({
    modules: [rootModule, dependentModule],
    params: {
      dependent: { multiplier: 5 }, // Override default of 10
    },
    startYear: 2025,
    endYear: 2025,
  });

  // result = value * multiplier = 100 * 5 = 500
  expect(result.outputs.dependent.result[0]).toBe(500);
});

// =============================================================================
// TESTS: HELPERS
// =============================================================================

console.log('\n=== Helper Tests ===\n');

test('getOutputsAtYear returns flat output record', () => {
  const result = runAutowired({
    modules: [rootModule, dependentModule],
    startYear: 2025,
    endYear: 2026,
  });

  const year0 = getOutputsAtYear(result, 0);

  expect(year0.value).toBe(100);
  expect(year0.doubled).toBe(200);
  expect(year0.result).toBe(1000);
  expect(year0['root.value']).toBe(100);
  expect(year0['dependent.result']).toBe(1000);
});

test('getTimeSeries returns specific output array', () => {
  const result = runAutowired({
    modules: [rootModule],
    startYear: 2025,
    endYear: 2027,
  });

  const values = getTimeSeries(result, 'root', 'value');
  expect(values).toHaveLength(3);
  expect(values[0]).toBe(100);
  expect(values[1]).toBe(102);
  expect(values[2]).toBe(104);
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

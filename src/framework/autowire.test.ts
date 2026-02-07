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
  validateWiring,
  requireOutput,
  yearZeroFallback,
  optionalOutput,
  AnyModule,
} from './autowire.js';
import { defineModule } from './module.js';
import { test, expect, printSummary } from '../test-utils.js';

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
// TESTS: WIRING VALIDATION
// =============================================================================

console.log('\n=== Wiring Validation Tests ===\n');

test('validateWiring catches typo in transform dependsOn', () => {
  const registry = buildOutputRegistry([rootModule]);
  const transforms = {
    derived: {
      fn: (outputs: Record<string, any>) => outputs.value * 2,
      dependsOn: ['valeu'],  // Typo!
    },
  };

  expect(() => validateWiring([rootModule], registry, transforms, {}))
    .toThrow("depends on 'valeu' which doesn't exist");
});

test('validateWiring catches missing lag source', () => {
  const registry = buildOutputRegistry([rootModule]);
  const lags = {
    laggedFoo: { source: 'nonexistent', delay: 1, initial: 0 },
  };

  expect(() => validateWiring([rootModule], registry, {}, lags))
    .toThrow("reads source 'nonexistent' which doesn't exist");
});

test('validateWiring passes for correct wiring', () => {
  const registry = buildOutputRegistry([rootModule, dependentModule]);
  const transforms = {
    summed: {
      fn: (outputs: Record<string, any>) => outputs.value + outputs.doubled,
      dependsOn: ['value', 'doubled'],
    },
  };
  const lags = {
    laggedResult: { source: 'result', delay: 1, initial: 0 },
  };

  // Should not throw
  validateWiring([rootModule, dependentModule], registry, transforms, lags);
});

test('runAutowired throws on bad dependsOn (integration)', () => {
  const consumer = defineModule({
    name: 'consumer',
    description: 'Has a transform with a typo',
    defaults: {},
    inputs: ['derived'] as const,
    outputs: ['out'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out: inputs.derived } }),
  });

  expect(() => runAutowired({
    modules: [rootModule, consumer],
    transforms: {
      derived: {
        fn: (outputs: Record<string, any>) => outputs.value,
        dependsOn: ['valeu'],  // Typo — should be caught at init
      },
    },
    startYear: 2025,
    endYear: 2025,
  })).toThrow("depends on 'valeu' which doesn't exist");
});

test('validateWiring allows transform dependsOn referencing other transforms', () => {
  const registry = buildOutputRegistry([rootModule]);
  const transforms = {
    derived1: {
      fn: () => 42,
      dependsOn: ['value'],
    },
    derived2: {
      fn: () => 84,
      dependsOn: ['derived1'],  // References another transform
    },
  };

  // Should not throw
  validateWiring([rootModule], registry, transforms, {});
});

// =============================================================================
// TESTS: OUTPUT COMPLETENESS + NaN GUARD
// =============================================================================

console.log('\n=== Output Completeness Tests ===\n');

test('throws when module step omits a declared output', () => {
  const incomplete = defineModule({
    name: 'incomplete',
    description: 'Omits an output',
    defaults: {},
    inputs: [] as const,
    outputs: ['present', 'missing'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({
      state: {},
      outputs: { present: 42 } as any,  // 'missing' not returned
    }),
  });

  expect(() => runAutowired({
    modules: [incomplete],
    startYear: 2025,
    endYear: 2025,
  })).toThrow("declares output 'missing' but step() didn't return it");
});

test('throws when module step returns NaN output', () => {
  const nanModule = defineModule({
    name: 'nanProducer',
    description: 'Produces NaN',
    defaults: {},
    inputs: [] as const,
    outputs: ['bad'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({
      state: {},
      outputs: { bad: NaN },
    }),
  });

  expect(() => runAutowired({
    modules: [nanModule],
    startYear: 2025,
    endYear: 2025,
  })).toThrow("output 'bad' is NaN at year 2025");
});

test('throws when module step returns Infinity output', () => {
  const infModule = defineModule({
    name: 'infProducer',
    description: 'Produces Infinity',
    defaults: {},
    inputs: [] as const,
    outputs: ['bad'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({
      state: {},
      outputs: { bad: Infinity },
    }),
  });

  expect(() => runAutowired({
    modules: [infModule],
    startYear: 2025,
    endYear: 2025,
  })).toThrow("output 'bad' is Infinity at year 2025");
});

test('throws when nested record output contains NaN', () => {
  const nestedNan = defineModule({
    name: 'nestedNanProducer',
    description: 'Produces nested NaN',
    defaults: {},
    inputs: [] as const,
    outputs: ['regional'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({
      state: {},
      outputs: { regional: { oecd: 42, china: NaN } },
    }),
  });

  expect(() => runAutowired({
    modules: [nestedNan],
    startYear: 2025,
    endYear: 2025,
  })).toThrow("output 'regional.china' is NaN at year 2025");
});

test('throws when module step returns -Infinity output', () => {
  const negInfModule = defineModule({
    name: 'negInfProducer',
    description: 'Produces -Infinity',
    defaults: {},
    inputs: [] as const,
    outputs: ['bad'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({
      state: {},
      outputs: { bad: -Infinity },
    }),
  });

  expect(() => runAutowired({
    modules: [negInfModule],
    startYear: 2025,
    endYear: 2025,
  })).toThrow("output 'bad' is -Infinity at year 2025");
});

test('throws when deeply nested output (2 levels) contains NaN', () => {
  const deepNan = defineModule({
    name: 'deepNanProducer',
    description: 'Produces NaN two levels deep (e.g., minerals.copper.demand)',
    defaults: {},
    inputs: [] as const,
    outputs: ['minerals'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({
      state: {},
      outputs: { minerals: { copper: { demand: 42, cumulative: NaN } } },
    }),
  });

  expect(() => runAutowired({
    modules: [deepNan],
    startYear: 2025,
    endYear: 2025,
  })).toThrow("output 'minerals.copper.cumulative' is NaN at year 2025");
});

test('allows null and non-numeric outputs', () => {
  const mixed = defineModule({
    name: 'mixed',
    description: 'Mixed output types',
    defaults: {},
    inputs: [] as const,
    outputs: ['num', 'str', 'nul', 'obj'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({
      state: {},
      outputs: { num: 42, str: 'hello', nul: null, obj: { a: 1, b: 2 } },
    }),
  });

  // Should not throw
  const result = runAutowired({
    modules: [mixed],
    startYear: 2025,
    endYear: 2025,
  });
  expect(result.outputs.mixed.num[0]).toBe(42);
});

// =============================================================================
// TESTS: TRANSFORM HELPERS
// =============================================================================

console.log('\n=== Transform Helper Tests ===\n');

test('yearZeroFallback returns value when present', () => {
  const outputs = { foo: 42 };
  expect(yearZeroFallback(outputs, 'foo', 0, 5, 'test')).toBe(42);
});

test('yearZeroFallback returns initial on year 0 when missing', () => {
  const outputs = {};
  expect(yearZeroFallback(outputs, 'foo', 99, 0, 'test')).toBe(99);
});

test('yearZeroFallback throws after year 0 when missing', () => {
  const outputs = {};
  expect(() => yearZeroFallback(outputs, 'foo', 99, 1, 'test'))
    .toThrow("'foo' missing at year index 1");
});

test('optionalOutput returns value when present', () => {
  const outputs = { bar: 42 };
  expect(optionalOutput(outputs, 'bar', 0)).toBe(42);
});

test('optionalOutput returns fallback when missing', () => {
  const outputs = {};
  expect(optionalOutput(outputs, 'bar', 99)).toBe(99);
});

// =============================================================================
// TESTS: YEAR RESULT MAPPING
// =============================================================================

console.log('\n=== Year Result Mapping Tests ===\n');

test('energySystemOverhead > 0 after year 1 in full simulation', async () => {
  const { runAutowiredFull } = await import('../simulation-autowired.js');
  const { results } = runAutowiredFull({ startYear: 2025, endYear: 2030 });

  // Year 0 might be 0 (no prior additions), but subsequent years should have overhead
  const year5 = results[results.length - 1];
  expect(year5.energySystemOverhead).toBeGreaterThan(0);
});

// =============================================================================
// TESTS: TRANSFORM READ TRACKING
// =============================================================================

console.log('\n=== Transform Read Tracking Tests ===\n');

test('trackReads detects undeclared reads (via console.warn)', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces values',
    defaults: {},
    inputs: [] as const,
    outputs: ['a', 'b'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { a: 10, b: 20 } }),
  });

  const consumer = defineModule({
    name: 'consumer',
    description: 'Uses transform',
    defaults: {},
    inputs: ['derived'] as const,
    outputs: ['out'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out: inputs.derived } }),
  });

  // Transform reads 'a' AND 'b' but only declares 'a'
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (msg: string) => { warnings.push(msg); };

  try {
    runAutowired({
      modules: [producer, consumer],
      transforms: {
        derived: {
          fn: (outputs: Record<string, any>) => outputs.a + outputs.b,
          dependsOn: ['a'],  // Missing 'b'!
        },
      },
      startYear: 2025,
      endYear: 2025,
      trackReads: true,
    });

    const undeclaredWarnings = warnings.filter(w => w.includes("reads 'b'"));
    expect(undeclaredWarnings.length > 0).toBeTrue();
  } finally {
    console.warn = origWarn;
  }
});

test('trackReads does not warn for cycle-breakers (dependsOn: [])', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces values',
    defaults: {},
    inputs: [] as const,
    outputs: ['a'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { a: 10 } }),
  });

  const consumer = defineModule({
    name: 'consumer',
    description: 'Uses cycle-breaker transform',
    defaults: {},
    inputs: ['cycled'] as const,
    outputs: ['out'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out: inputs.cycled ?? 0 } }),
  });

  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (msg: string) => { warnings.push(msg); };

  try {
    runAutowired({
      modules: [producer, consumer],
      transforms: {
        cycled: {
          fn: (outputs: Record<string, any>) => outputs.a ?? 0,
          dependsOn: [],  // Cycle-breaker
        },
      },
      startYear: 2025,
      endYear: 2025,
      trackReads: true,
    });

    const trackWarnings = warnings.filter(w => w.includes('reads'));
    expect(trackWarnings.length).toBe(0);
  } finally {
    console.warn = origWarn;
  }
});

// =============================================================================
// CYCLE-BREAKER LINT
// =============================================================================

test('validateWiring errors when module directly consumes a cycle-breaker transform', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces values',
    defaults: {},
    inputs: [] as const,
    outputs: ['a'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { a: 10 } }),
  });

  // Consumer declares 'cycled' as a direct input — but 'cycled' is a cycle-breaker
  const consumer = defineModule({
    name: 'consumer',
    description: 'Directly consumes cycle-breaker',
    defaults: {},
    inputs: ['cycled'] as const,
    outputs: ['out'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out: inputs.cycled ?? 0 } }),
  });

  // A second consumer that uses the lag properly (this proves 'cycled' is a lag source)
  const properConsumer = defineModule({
    name: 'properConsumer',
    description: 'Consumes via lag',
    defaults: {},
    inputs: ['laggedCycled'] as const,
    outputs: ['out2'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out2: inputs.laggedCycled ?? 0 } }),
  });

  expect(() => {
    runAutowired({
      modules: [producer, consumer, properConsumer],
      transforms: {
        cycled: {
          fn: (outputs: Record<string, any>) => outputs.a ?? 0,
          dependsOn: [],  // Cycle-breaker
        },
      },
      lags: {
        laggedCycled: { source: 'cycled', delay: 1, initial: 0 },
      },
      startYear: 2025,
      endYear: 2025,
    });
  }).toThrow('directly consumes cycle-breaker');
});

test('validateWiring allows cycle-breaker when consumed via lag only', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces values',
    defaults: {},
    inputs: [] as const,
    outputs: ['a'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { a: 10 } }),
  });

  const consumer = defineModule({
    name: 'consumer',
    description: 'Consumes via lag',
    defaults: {},
    inputs: ['laggedCycled'] as const,
    outputs: ['out'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out: inputs.laggedCycled ?? 0 } }),
  });

  // Should NOT throw — consumer uses a lag, not direct consumption
  runAutowired({
    modules: [producer, consumer],
    transforms: {
      cycled: {
        fn: (outputs: Record<string, any>) => outputs.a ?? 0,
        dependsOn: [],  // Cycle-breaker (also a lag source)
      },
    },
    lags: {
      laggedCycled: { source: 'cycled', delay: 1, initial: 0 },
    },
    startYear: 2025,
    endYear: 2025,
  });
  // If we get here, no error was thrown — pass
});

test('validateWiring allows dependsOn:[] transform that is not a lag source (parameter injection)', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces values',
    defaults: {},
    inputs: [] as const,
    outputs: ['a'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { a: 10 } }),
  });

  const consumer = defineModule({
    name: 'consumer',
    description: 'Consumes parameter injection',
    defaults: {},
    inputs: ['constant'] as const,
    outputs: ['out'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out: inputs.constant ?? 0 } }),
  });

  // Should NOT throw — 'constant' has dependsOn:[] but is NOT a lag source,
  // so it's a parameter injection, not a cycle-breaker
  runAutowired({
    modules: [producer, consumer],
    transforms: {
      constant: {
        fn: () => 42,
        dependsOn: [],  // No deps, but not a lag source — OK
      },
    },
    startYear: 2025,
    endYear: 2025,
  });
  // If we get here, no error was thrown — pass
});

// =============================================================================
// SUMMARY
// =============================================================================

printSummary();

/**
 * Tests for automatic dependency resolution.
 * Uses the Node built-in test runner (node:test) with zero test dependencies.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOutputRegistry,
  buildDependencyGraph,
  topologicalSort,
  runAutowired,
  getOutputsAtYear,
  getTimeSeries,
  validateWiring,
  yearZeroFallback,
  optionalOutput,
} from '../src/autowire.js';
import { defineModule } from '../src/module.js';
import { okValidate, throwsWith } from './helpers.js';

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

test('buildOutputRegistry creates mapping from outputs to modules', () => {
  const registry = buildOutputRegistry([rootModule, dependentModule]);

  assert.strictEqual(registry.get('value'), 'root');
  assert.strictEqual(registry.get('doubled'), 'root');
  assert.strictEqual(registry.get('result'), 'dependent');
  assert.strictEqual(registry.size, 3);
});

test('buildOutputRegistry detects collisions', () => {
  const collision = defineModule({
    name: 'collision',
    description: 'Has same output as root',
    defaults: {},
    inputs: [] as const,
    outputs: ['value'] as const, // Collision with root
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { value: 0 } }),
  });

  throwsWith(() => buildOutputRegistry([rootModule, collision]), 'collision');
});

// =============================================================================
// TESTS: DEPENDENCY GRAPH
// =============================================================================

test('buildDependencyGraph identifies dependencies', () => {
  const registry = buildOutputRegistry([rootModule, dependentModule]);
  const graph = buildDependencyGraph([rootModule, dependentModule], registry);

  const rootNode = graph.get('root')!;
  const depNode = graph.get('dependent')!;

  assert.strictEqual(rootNode.dependsOn.size, 0);
  assert.strictEqual(rootNode.providesTo.has('dependent'), true);

  assert.strictEqual(depNode.dependsOn.has('root'), true);
  assert.strictEqual(depNode.providesTo.size, 0);
});

test('buildDependencyGraph throws on unresolved input', () => {
  const orphan = defineModule({
    name: 'orphan',
    description: 'Needs something that does not exist',
    defaults: {},
    inputs: ['nonexistent'] as const,
    outputs: ['orphanOut'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { orphanOut: 0 } }),
  });

  const registry = buildOutputRegistry([orphan]);
  throwsWith(() => buildDependencyGraph([orphan], registry), 'Unresolved input');
});

test('buildDependencyGraph allows transforms for computed inputs', () => {
  const computed = defineModule({
    name: 'computed',
    description: 'Needs a computed input',
    defaults: {},
    inputs: ['computedValue'] as const,
    outputs: ['computedOut'] as const,
    validate: okValidate,
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
  assert.strictEqual(graph.size, 2);
});

test('transforms with dependsOn create proper dependency edges', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces rawValue',
    defaults: {},
    inputs: [] as const,
    outputs: ['rawValue'] as const,
    validate: okValidate,
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
    validate: okValidate,
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
  assert.strictEqual(graph.get('consumer')!.dependsOn.has('producer'), true);
  assert.strictEqual(graph.get('producer')!.providesTo.has('consumer'), true);
});

test('transforms without dependsOn (bare functions) still work but create no edges', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces rawValue',
    defaults: {},
    inputs: [] as const,
    outputs: ['rawValue'] as const,
    validate: okValidate,
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
    validate: okValidate,
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
  assert.strictEqual(graph.get('consumer')!.dependsOn.has('producer'), false);
});

// =============================================================================
// TESTS: TOPOLOGICAL SORT
// =============================================================================

test('topologicalSort orders modules correctly', () => {
  const registry = buildOutputRegistry([rootModule, dependentModule]);
  const graph = buildDependencyGraph([rootModule, dependentModule], registry);
  const sorted = topologicalSort(graph);

  // Root must come before dependent
  const rootIdx = sorted.findIndex((m) => m.name === 'root');
  const depIdx = sorted.findIndex((m) => m.name === 'dependent');

  assert.ok(rootIdx < depIdx);
});

test('topologicalSort handles multiple roots', () => {
  const root2 = defineModule({
    name: 'root2',
    description: 'Another root',
    defaults: {},
    inputs: [] as const,
    outputs: ['value2'] as const,
    validate: okValidate,
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
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { combined: inputs.value + inputs.value2 } }),
  });

  const registry = buildOutputRegistry([rootModule, root2, multi]);
  const graph = buildDependencyGraph([rootModule, root2, multi], registry);
  const sorted = topologicalSort(graph);

  // Both roots must come before multi
  const rootIdx = sorted.findIndex((m) => m.name === 'root');
  const root2Idx = sorted.findIndex((m) => m.name === 'root2');
  const multiIdx = sorted.findIndex((m) => m.name === 'multi');

  assert.ok(rootIdx < multiIdx);
  assert.ok(root2Idx < multiIdx);
});

test('topologicalSort detects cycles', () => {
  const cycleA = defineModule({
    name: 'cycleA',
    description: 'Part of cycle',
    defaults: {},
    inputs: ['fromB'] as const,
    outputs: ['toB'] as const,
    validate: okValidate,
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
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { fromB: 2 } }),
  });

  const registry = buildOutputRegistry([cycleA, cycleB]);
  const graph = buildDependencyGraph([cycleA, cycleB], registry);

  throwsWith(() => topologicalSort(graph), 'cycle');
});

// =============================================================================
// TESTS: FULL SIMULATION
// =============================================================================

test('runAutowired executes modules in correct order', () => {
  const result = runAutowired({
    modules: [dependentModule, rootModule], // Wrong order - should be auto-sorted
    startYear: 2025,
    endYear: 2027,
  });

  assert.strictEqual(result.years.length, 3);

  // Root outputs: value = state.current + yearIndex
  const rootValues = result.outputs.root.value;
  assert.strictEqual(rootValues[0], 100); // year 2025, yearIndex 0
  assert.strictEqual(rootValues[1], 102); // year 2026, yearIndex 1
  assert.strictEqual(rootValues[2], 104); // year 2027, yearIndex 2

  // Dependent outputs: result = value * 10
  const depResults = result.outputs.dependent.result;
  assert.strictEqual(depResults[0], 1000);
  assert.strictEqual(depResults[1], 1020);
  assert.strictEqual(depResults[2], 1040);
});

test('runAutowired handles transforms', () => {
  const computed = defineModule({
    name: 'computed',
    description: 'Uses computed input',
    defaults: {},
    inputs: ['summed'] as const,
    outputs: ['final'] as const,
    validate: okValidate,
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
  assert.strictEqual(result.outputs.computed.final[0], 300);
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
  assert.strictEqual(accumulated[0], 100);

  // Year 1: state.total=100, value=102, lagged=100, newTotal = 100 + 102 + 100 = 302
  assert.strictEqual(accumulated[1], 302);
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
  assert.strictEqual(result.outputs.dependent.result[0], 500);
});

// =============================================================================
// TESTS: HELPERS
// =============================================================================

test('getOutputsAtYear returns flat output record', () => {
  const result = runAutowired({
    modules: [rootModule, dependentModule],
    startYear: 2025,
    endYear: 2026,
  });

  const year0 = getOutputsAtYear(result, 0);

  assert.strictEqual(year0.value, 100);
  assert.strictEqual(year0.doubled, 200);
  assert.strictEqual(year0.result, 1000);
  assert.strictEqual(year0['root.value'], 100);
  assert.strictEqual(year0['dependent.result'], 1000);
});

test('getTimeSeries returns specific output array', () => {
  const result = runAutowired({
    modules: [rootModule],
    startYear: 2025,
    endYear: 2027,
  });

  const values = getTimeSeries(result, 'root', 'value');
  assert.strictEqual(values.length, 3);
  assert.strictEqual(values[0], 100);
  assert.strictEqual(values[1], 102);
  assert.strictEqual(values[2], 104);
});

// =============================================================================
// TESTS: WIRING VALIDATION
// =============================================================================

test('validateWiring catches typo in transform dependsOn', () => {
  const registry = buildOutputRegistry([rootModule]);
  const transforms = {
    derived: {
      fn: (outputs: Record<string, any>) => outputs.value * 2,
      dependsOn: ['valeu'], // Typo!
    },
  };

  throwsWith(
    () => validateWiring([rootModule], registry, transforms, {}),
    "depends on 'valeu' which doesn't exist"
  );
});

test('validateWiring catches missing lag source', () => {
  const registry = buildOutputRegistry([rootModule]);
  const lags = {
    laggedFoo: { source: 'nonexistent', delay: 1, initial: 0 },
  };

  throwsWith(
    () => validateWiring([rootModule], registry, {}, lags),
    "reads source 'nonexistent' which doesn't exist"
  );
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
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out: inputs.derived } }),
  });

  throwsWith(
    () =>
      runAutowired({
        modules: [rootModule, consumer],
        transforms: {
          derived: {
            fn: (outputs: Record<string, any>) => outputs.value,
            dependsOn: ['valeu'], // Typo — should be caught at init
          },
        },
        startYear: 2025,
        endYear: 2025,
      }),
    "depends on 'valeu' which doesn't exist"
  );
});

test('validateWiring rejects transform dependsOn referencing other transforms', () => {
  const registry = buildOutputRegistry([rootModule]);
  const transforms = {
    derived1: {
      fn: () => 42,
      dependsOn: ['value'],
    },
    derived2: {
      fn: () => 84,
      dependsOn: ['derived1'], // References another transform — not supported
    },
  };

  throwsWith(
    () => validateWiring([rootModule], registry, transforms, {}),
    "Transform 'derived2' depends on transform 'derived1'"
  );
});

// =============================================================================
// TESTS: OUTPUT COMPLETENESS + NaN GUARD
// =============================================================================

test('throws when module step omits a declared output', () => {
  const incomplete = defineModule({
    name: 'incomplete',
    description: 'Omits an output',
    defaults: {},
    inputs: [] as const,
    outputs: ['present', 'missing'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({
      state: {},
      outputs: { present: 42 } as any, // 'missing' not returned
    }),
  });

  throwsWith(
    () => runAutowired({ modules: [incomplete], startYear: 2025, endYear: 2025 }),
    "declares output 'missing' but step() didn't return it"
  );
});

test('throws when module step returns NaN output', () => {
  const nanModule = defineModule({
    name: 'nanProducer',
    description: 'Produces NaN',
    defaults: {},
    inputs: [] as const,
    outputs: ['bad'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { bad: NaN } }),
  });

  throwsWith(
    () => runAutowired({ modules: [nanModule], startYear: 2025, endYear: 2025 }),
    "output 'bad' is NaN at year 2025"
  );
});

test('throws when module step returns Infinity output', () => {
  const infModule = defineModule({
    name: 'infProducer',
    description: 'Produces Infinity',
    defaults: {},
    inputs: [] as const,
    outputs: ['bad'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { bad: Infinity } }),
  });

  throwsWith(
    () => runAutowired({ modules: [infModule], startYear: 2025, endYear: 2025 }),
    "output 'bad' is Infinity at year 2025"
  );
});

test('throws when nested record output contains NaN', () => {
  const nestedNan = defineModule({
    name: 'nestedNanProducer',
    description: 'Produces nested NaN',
    defaults: {},
    inputs: [] as const,
    outputs: ['regional'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { regional: { oecd: 42, china: NaN } } }),
  });

  throwsWith(
    () => runAutowired({ modules: [nestedNan], startYear: 2025, endYear: 2025 }),
    "output 'regional.china' is NaN at year 2025"
  );
});

test('throws when module step returns -Infinity output', () => {
  const negInfModule = defineModule({
    name: 'negInfProducer',
    description: 'Produces -Infinity',
    defaults: {},
    inputs: [] as const,
    outputs: ['bad'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { bad: -Infinity } }),
  });

  throwsWith(
    () => runAutowired({ modules: [negInfModule], startYear: 2025, endYear: 2025 }),
    "output 'bad' is -Infinity at year 2025"
  );
});

test('throws when deeply nested output (2 levels) contains NaN', () => {
  const deepNan = defineModule({
    name: 'deepNanProducer',
    description: 'Produces NaN two levels deep (e.g., minerals.copper.demand)',
    defaults: {},
    inputs: [] as const,
    outputs: ['minerals'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({
      state: {},
      outputs: { minerals: { copper: { demand: 42, cumulative: NaN } } },
    }),
  });

  throwsWith(
    () => runAutowired({ modules: [deepNan], startYear: 2025, endYear: 2025 }),
    "output 'minerals.copper.cumulative' is NaN at year 2025"
  );
});

test('allows null and non-numeric outputs', () => {
  const mixed = defineModule({
    name: 'mixed',
    description: 'Mixed output types',
    defaults: {},
    inputs: [] as const,
    outputs: ['num', 'str', 'nul', 'obj'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({
      state: {},
      outputs: { num: 42, str: 'hello', nul: null, obj: { a: 1, b: 2 } },
    }),
  });

  // Should not throw
  const result = runAutowired({ modules: [mixed], startYear: 2025, endYear: 2025 });
  assert.strictEqual(result.outputs.mixed.num[0], 42);
});

// =============================================================================
// TESTS: TRANSFORM HELPERS
// =============================================================================

test('yearZeroFallback returns value when present', () => {
  const outputs = { foo: 42 };
  assert.strictEqual(yearZeroFallback(outputs, 'foo', 0, 5, 'test'), 42);
});

test('yearZeroFallback returns initial on year 0 when missing', () => {
  const outputs = {};
  assert.strictEqual(yearZeroFallback(outputs, 'foo', 99, 0, 'test'), 99);
});

test('yearZeroFallback throws after year 0 when missing', () => {
  const outputs = {};
  throwsWith(() => yearZeroFallback(outputs, 'foo', 99, 1, 'test'), "'foo' missing at year index 1");
});

test('optionalOutput returns value when present', () => {
  const outputs = { bar: 42 };
  assert.strictEqual(optionalOutput(outputs, 'bar', 0), 42);
});

test('optionalOutput returns fallback when missing', () => {
  const outputs = {};
  assert.strictEqual(optionalOutput(outputs, 'bar', 99), 99);
});

// =============================================================================
// TESTS: TRANSFORM READ TRACKING
// =============================================================================

test('trackReads detects undeclared reads (via console.warn)', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces values',
    defaults: {},
    inputs: [] as const,
    outputs: ['a', 'b'] as const,
    validate: okValidate,
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
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out: inputs.derived } }),
  });

  // Transform reads 'a' AND 'b' but only declares 'a'
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (msg: string) => {
    warnings.push(msg);
  };

  try {
    runAutowired({
      modules: [producer, consumer],
      transforms: {
        derived: {
          fn: (outputs: Record<string, any>) => outputs.a + outputs.b,
          dependsOn: ['a'], // Missing 'b'!
        },
      },
      startYear: 2025,
      endYear: 2025,
      trackReads: true,
    });

    const undeclaredWarnings = warnings.filter((w) => w.includes("reads 'b'"));
    assert.ok(undeclaredWarnings.length > 0);
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
    validate: okValidate,
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
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out: inputs.cycled ?? 0 } }),
  });

  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (msg: string) => {
    warnings.push(msg);
  };

  try {
    runAutowired({
      modules: [producer, consumer],
      transforms: {
        cycled: {
          fn: (outputs: Record<string, any>) => outputs.a ?? 0,
          dependsOn: [], // Cycle-breaker
        },
      },
      startYear: 2025,
      endYear: 2025,
      trackReads: true,
    });

    const trackWarnings = warnings.filter((w) => w.includes('reads'));
    assert.strictEqual(trackWarnings.length, 0);
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
    validate: okValidate,
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
    validate: okValidate,
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
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, inputs) => ({ state: {}, outputs: { out2: inputs.laggedCycled ?? 0 } }),
  });

  throwsWith(
    () =>
      runAutowired({
        modules: [producer, consumer, properConsumer],
        transforms: {
          cycled: {
            fn: (outputs: Record<string, any>) => outputs.a ?? 0,
            dependsOn: [], // Cycle-breaker
          },
        },
        lags: {
          laggedCycled: { source: 'cycled', delay: 1, initial: 0 },
        },
        startYear: 2025,
        endYear: 2025,
      }),
    'directly consumes cycle-breaker'
  );
});

test('validateWiring allows cycle-breaker when consumed via lag only', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces values',
    defaults: {},
    inputs: [] as const,
    outputs: ['a'] as const,
    validate: okValidate,
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
    validate: okValidate,
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
        dependsOn: [], // Cycle-breaker (also a lag source)
      },
    },
    lags: {
      laggedCycled: { source: 'cycled', delay: 1, initial: 0 },
    },
    startYear: 2025,
    endYear: 2025,
  });
});

test('validateWiring allows dependsOn:[] transform that is not a lag source (parameter injection)', () => {
  const producer = defineModule({
    name: 'producer',
    description: 'Produces values',
    defaults: {},
    inputs: [] as const,
    outputs: ['a'] as const,
    validate: okValidate,
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
    validate: okValidate,
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
        dependsOn: [], // No deps, but not a lag source — OK
      },
    },
    startYear: 2025,
    endYear: 2025,
  });
});

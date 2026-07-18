/**
 * Tests that topologicalSort does not mutate its input graph and is idempotent.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOutputRegistry, buildDependencyGraph, topologicalSort } from '../src/autowire.js';
import { defineModule } from '../src/module.js';
import { okValidate } from './helpers.js';

const A = defineModule({
  name: 'A', description: '', defaults: {}, inputs: [] as const, outputs: ['a'] as const,
  validate: okValidate, mergeParams: (p) => p, init: () => ({}),
  step: () => ({ state: {}, outputs: { a: 1 } }),
});
const B = defineModule({
  name: 'B', description: '', defaults: {}, inputs: ['a'] as const, outputs: ['b'] as const,
  validate: okValidate, mergeParams: (p) => p, init: () => ({}),
  step: (_s, i) => ({ state: {}, outputs: { b: i.a } }),
});

function freshGraph() {
  const registry = buildOutputRegistry([B, A]); // B registered first, to make order non-trivial
  return buildDependencyGraph([B, A], registry);
}

test('topologicalSort does not mutate the caller graph', () => {
  const graph = freshGraph();
  assert.deepStrictEqual([...graph.get('B')!.dependsOn], ['A']);
  topologicalSort(graph);
  // The caller's dependency sets must be intact after sorting.
  assert.deepStrictEqual([...graph.get('B')!.dependsOn], ['A']);
  assert.strictEqual(graph.get('A')!.dependsOn.size, 0);
});

test('topologicalSort is idempotent — same graph, same valid order', () => {
  const graph = freshGraph();
  const first = topologicalSort(graph).map((m) => m.name);
  const second = topologicalSort(graph).map((m) => m.name);
  assert.deepStrictEqual(first, ['A', 'B']); // dependency respected
  assert.deepStrictEqual(second, first); // stable across calls
});

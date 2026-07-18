/**
 * Tests for the ComponentParams dot-path container.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ComponentParams } from '../src/component-params.js';

test('get reads dot-paths and returns undefined for missing paths', () => {
  const p = ComponentParams.from({ climate: { sensitivity: 3 }, energy: { carbonPrice: 50 } });
  assert.strictEqual(p.get('climate.sensitivity'), 3);
  assert.strictEqual(p.get('energy.carbonPrice'), 50);
  assert.strictEqual(p.get('climate.missing'), undefined);
  assert.strictEqual(p.get('nope.deep.path'), undefined);
});

test('set is immutable and returns a new instance', () => {
  const p = ComponentParams.from({ a: { b: 1 } });
  const q = p.set('a.b', 2);
  assert.strictEqual(p.get('a.b'), 1); // original unchanged
  assert.strictEqual(q.get('a.b'), 2);
  assert.notStrictEqual(p, q);
});

test('set can create new nested paths', () => {
  const p = ComponentParams.from({ a: { b: 1 } });
  const q = p.set('a.c.d', 9);
  assert.strictEqual(q.get('a.c.d'), 9);
  assert.strictEqual(q.get('a.b'), 1);
});

test('entries and paths walk numeric leaves only', () => {
  const p = ComponentParams.from({ a: { b: 1, s: 'skip' }, c: 2, arr: [1, 2] });
  const entries = Array.from(p.entries()).sort((x, y) => x[0].localeCompare(y[0]));
  assert.deepStrictEqual(entries, [
    ['a.b', 1],
    ['c', 2],
  ]);
  assert.deepStrictEqual(p.paths().sort(), ['a.b', 'c']);
});

test('toParams returns a deep clone that does not alias internal state', () => {
  const src = { a: { b: 1 } };
  const p = ComponentParams.from(src);
  const out = p.toParams();
  assert.deepStrictEqual(out, src);
  assert.notStrictEqual(out, src);
  out.a.b = 99;
  assert.strictEqual(p.get('a.b'), 1); // internal data not mutated
});

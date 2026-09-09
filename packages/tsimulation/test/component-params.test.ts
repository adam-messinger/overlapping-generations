/**
 * Tests for the ComponentParams dot-path container.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ComponentParams } from '../src/component-params.js';

test('get reads dot-paths and returns undefined for missing paths', () => {
  const p = ComponentParams.from({ group: { alpha: 3 }, other: { beta: 50 } });
  assert.strictEqual(p.get('group.alpha'), 3);
  assert.strictEqual(p.get('other.beta'), 50);
  assert.strictEqual(p.get('group.missing'), undefined);
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

test('set() through a null intermediate node does not throw', () => {
  const p = ComponentParams.from({ a: { b: null } });
  const q = p.set('a.b.c', 5);
  assert.strictEqual(q.get('a.b.c'), 5);
  // top-level null too
  const r = ComponentParams.from<{ a: unknown }>({ a: null }).set('a.x', 9);
  assert.strictEqual(r.get('a.x'), 9);
});

test('get() of an object subtree does not alias internal state', () => {
  const p = ComponentParams.from({ g: { x: 1 } });
  const sub = p.get('g') as { x: number };
  sub.x = 999; // mutating the returned subtree must not leak back
  assert.strictEqual(p.get('g.x'), 1);
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

test('reserved path segments are refused rather than followed', () => {
  const params = ComponentParams.from<Record<string, unknown>>({});
  const before = (({}) as Record<string, unknown>).olgProbe;

  assert.throws(() => params.set('__proto__.olgProbe', 42), /reserved segment/);
  assert.throws(() => params.get('__proto__.olgProbe'), /reserved segment/);
  assert.throws(() => params.set('constructor.prototype.olgProbe', 42), /reserved segment/);
  assert.throws(() => params.set('a.prototype.b', 1), /reserved segment/);

  // The prototype must be untouched whether or not the write was refused.
  assert.strictEqual((({}) as Record<string, unknown>).olgProbe, before);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(Object.prototype, 'olgProbe'), false);
});

test('get reads own properties only, not inherited ones', () => {
  (Object.prototype as Record<string, unknown>).olgInherited = 'from the prototype';
  try {
    const params = ComponentParams.from({ group: {} });
    assert.strictEqual(params.get('group.olgInherited'), undefined);
    assert.strictEqual(params.get('group.toString'), undefined);
  } finally {
    delete (Object.prototype as Record<string, unknown>).olgInherited;
  }
});

test('an inserted object is not shared with the caller', () => {
  // Only a single set aliases: chaining re-clones the container and severs
  // it, so a chained test would pass while the defect stood.
  const subtree = { x: 1 };
  const params = ComponentParams.from<Record<string, unknown>>({}).set('a', subtree);

  subtree.x = 99;

  assert.deepEqual(params.get('a'), { x: 1 });
  assert.deepEqual(params.toParams(), { a: { x: 1 } });
});

test('set carries the values structuredClone supports', () => {
  const params = ComponentParams.from<Record<string, unknown>>({})
    .set('series', new Float64Array([1, 2, 3]))
    .set('when', new Date('2026-09-09T00:00:00.000Z'));

  assert.deepEqual(params.get('series'), new Float64Array([1, 2, 3]));
  assert.strictEqual(
    (params.get('when') as Date).toISOString(),
    '2026-09-09T00:00:00.000Z',
  );
});

/**
 * Read-Tracking Tests
 *
 * Enabling a diagnostic must not change what a model computes, and must not
 * turn a working parameter shape into a failure.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leafPaths, trackObjectReads, unreadOverridePaths } from '../src/liveness.js';

test('native objects are read through, not proxied', () => {
  // The proxy cannot be the receiver for an accessor backed by an internal
  // slot, and an extracted method throws later with `this` bound to it. Both
  // are avoided by treating anything that is not a plain object as a leaf.
  const { proxy } = trackObjectReads({
    typed: new Float64Array([1, 2, 3]),
    buffer: new ArrayBuffer(8),
    when: new Date('2026-09-09T00:00:00.000Z'),
    lookup: new Map([['a', 1]]),
    unique: new Set([1, 2]),
    pattern: /x/g,
  });

  assert.equal(proxy.typed.length, 3);
  assert.equal(proxy.typed[0], 1);
  assert.equal(proxy.buffer.byteLength, 8);
  assert.equal(proxy.when.toISOString(), '2026-09-09T00:00:00.000Z');
  assert.equal(proxy.lookup.get('a'), 1);
  assert.equal(proxy.unique.has(2), true);
  assert.equal(proxy.pattern.source, 'x');
});

test('an extracted method still works when called', () => {
  const { proxy } = trackObjectReads({ when: new Date('2026-09-09T00:00:00.000Z') });
  const getTime = proxy.when.getTime;
  assert.equal(typeof getTime.call(proxy.when), 'number');
});

test('plain containers are still tracked', () => {
  const { proxy, reads } = trackObjectReads({
    climate: { sensitivity: 3, layers: [1, 2] },
    energy: { carbonPrice: 50 },
  });

  void proxy.climate.sensitivity;
  void proxy.climate.layers[1];

  assert.equal(reads.has('climate.sensitivity'), true);
  assert.equal(reads.has('climate.layers.1'), true);
  assert.equal(reads.has('energy.carbonPrice'), false);
});

test('tracking a native object records one read, not one per element', () => {
  const { proxy, reads } = trackObjectReads({ stat: { pop: new Float64Array([1, 2, 3]) } });
  void proxy.stat.pop;
  assert.deepEqual([...reads], ['stat.pop']);
});

test('leafPaths treats a native object as one parameter', () => {
  // Expanding per element made a typed-array override report one unread path
  // per element — a warning storm, or a thrown error under paramLiveness
  // 'error'.
  assert.deepEqual(leafPaths({ stat: { pop: new Float64Array([1, 2, 3]) } }), ['stat.pop']);
  assert.deepEqual(leafPaths({ when: new Date() }), ['when']);
  assert.deepEqual(leafPaths({ plain: { a: 1, b: 2 } }), ['plain.a', 'plain.b']);
});

test('a typed-array override is reported once when unread', () => {
  const overrides = { stat: { pop: new Float64Array([1, 2, 3]) } };
  const { proxy, reads } = trackObjectReads({ stat: { other: 1 } });
  void proxy.stat.other;
  assert.deepEqual(unreadOverridePaths(overrides, reads), ['stat.pop']);
});

test('reading a tracked override marks it read', () => {
  const overrides = { stat: { pop: new Float64Array([1, 2, 3]) } };
  const { proxy, reads } = trackObjectReads(overrides);
  void proxy.stat.pop;
  assert.deepEqual(unreadOverridePaths(overrides, reads), []);
});

/**
 * Tests for the canonical JSON codec: `stableStringify` and its inverse
 * `parseCanonical`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCanonical, stableStringify } from '../src/serialization.js';

const roundTrip = <T>(value: T): T => parseCanonical<T>(stableStringify(value));

test('parseCanonical restores own properties whose value is undefined', () => {
  const value = { license: undefined, name: 'source' };
  const restored = roundTrip(value);
  assert.ok(Object.prototype.hasOwnProperty.call(restored, 'license'));
  assert.strictEqual(restored.license, undefined);
  assert.strictEqual(restored.name, 'source');
});

test('parseCanonical restores the non-JSON number forms', () => {
  const restored = roundTrip({
    nan: Number.NaN,
    inf: Number.POSITIVE_INFINITY,
    negInf: Number.NEGATIVE_INFINITY,
    negZero: -0,
    ordinary: 1.5,
  });
  assert.ok(Number.isNaN(restored.nan));
  assert.strictEqual(restored.inf, Number.POSITIVE_INFINITY);
  assert.strictEqual(restored.negInf, Number.NEGATIVE_INFINITY);
  assert.ok(Object.is(restored.negZero, -0));
  assert.strictEqual(restored.ordinary, 1.5);
});

test('parseCanonical restores bigints and dates', () => {
  const restored = roundTrip({ count: 9007199254740993n, at: new Date('2026-09-09T00:00:00.000Z') });
  assert.strictEqual(restored.count, 9007199254740993n);
  assert.ok(restored.at instanceof Date);
  assert.strictEqual(restored.at.toISOString(), '2026-09-09T00:00:00.000Z');
});

test('parseCanonical leaves ordinary structures untouched', () => {
  const value = { list: [1, 'two', null, { nested: true }], empty: {}, none: null };
  assert.deepEqual(roundTrip(value), value);
});

test('the round trip is hash-preserving for absent optional fields', () => {
  // The point of decoding rather than changing the encoder: a reloaded record
  // must re-serialize to the same bytes, so its content address is unchanged.
  const receipt = { id: 'acquisition:1', license: undefined, schemaArtifactId: undefined };
  const canonical = stableStringify(receipt);
  assert.strictEqual(stableStringify(parseCanonical(canonical)), canonical);
});

test('a marker nested inside a larger object still decodes', () => {
  const restored = roundTrip({ outer: { inner: { deep: undefined }, list: [undefined, 2] } });
  assert.strictEqual(restored.outer.inner.deep, undefined);
  assert.deepEqual(restored.outer.list, [undefined, 2]);
});

test('an object that merely resembles a marker is not mistaken for one', () => {
  // Two keys, so it is not the single-key marker shape.
  assert.deepEqual(roundTrip({ $undefined: true, also: 1 }), { $undefined: true, also: 1 });
  // Right key, wrong payload type.
  assert.deepEqual(roundTrip({ $date: 5 }), { $date: 5 });
  // Right key, unrecognised payload value.
  assert.deepEqual(roundTrip({ $number: 'not-a-form' }), { $number: 'not-a-form' });
});

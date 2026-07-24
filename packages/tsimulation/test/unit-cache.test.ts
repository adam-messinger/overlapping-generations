/**
 * Guards for unit-resolution caching.
 *
 * Contract validation resolves the same handful of unit strings at every port
 * on every step, so resolution is memoized. That is only safe because a
 * resolved unit is handed out as a private copy and because registering a new
 * unit invalidates a cached miss — these tests pin both.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getUnit, registerUnit, validatePortMeta, recordPort, unitPort } from '../src/index.js';

test('mutating a resolved unit cannot corrupt a later lookup', () => {
  const first = getUnit('TWh/year');
  const second = getUnit('TWh/year');
  assert.ok(first && second);
  assert.notEqual(first, second, 'callers must not share one cached object');
  assert.deepEqual(first, second);

  first.scale = 123456;
  (first.dimensions as Record<string, number>).bogus = 99;

  const fresh = getUnit('TWh/year');
  assert.ok(fresh);
  assert.notEqual(fresh.scale, 123456);
  assert.equal((fresh.dimensions as Record<string, number>).bogus, undefined);
});

test('a compound expression resolves identically on repeat', () => {
  assert.deepEqual(getUnit('kWh/people/day'), getUnit('kWh/people/day'));
});

test('validatePortMeta throws every time for an invalid contract', () => {
  // Validity must stay a pure predicate: a contract that fails once fails
  // always, so no caching may downgrade a hard wiring error into a pass.
  const bad = { unit: 'not-a-real-unit' } as never;
  assert.throws(() => validatePortMeta(bad, 'first'), /unknown unit/);
  assert.throws(() => validatePortMeta(bad, 'second'), /unknown unit/);
});

test('a nested contract reused at two paths validates at both', () => {
  const leaf = unitPort('TWh/year');
  validatePortMeta(recordPort(leaf, { keys: ['x'] }), 'outer.one');
  validatePortMeta(recordPort(leaf, { keys: ['y'] }), 'outer.two');
});

// Registers a process-global unit, so it runs last: it clears the resolution
// cache and would otherwise perturb the tests above.
test('registering a unit invalidates a previously cached miss', () => {
  const symbol = 'zorkmid';
  assert.equal(getUnit(symbol), undefined, 'unknown symbol should miss first');

  registerUnit({ symbol, dimension: 'dimensionless', scale: 1 });

  assert.ok(getUnit(symbol), 'newly registered unit must be visible after a cached miss');
  assert.ok(getUnit('zorkmid/year'), 'compound expression over a new unit must resolve');
});

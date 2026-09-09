/**
 * Scenario Loading Hardening Tests
 *
 * Scenario JSON is the one place in this repo where a parameter path really
 * is externally supplied, so the loader must treat prototype-chain keys as
 * unrecognised rather than as parameters.
 */

import { deepMerge } from './primitives/deep-merge.js';
import { test, expect, printSummary } from './test-utils.js';

test('deepMerge ignores prototype-chain keys from parsed JSON', () => {
  // JSON.parse creates __proto__ as an own key, so Object.keys surfaces it
  // and assigning through it would replace the merged object's prototype.
  const hostile = JSON.parse('{"__proto__": {"pwned": true}, "climate": {"sensitivity": 4}}');
  const merged = deepMerge({ climate: { sensitivity: 3 } } as any, hostile);

  expect(Object.getPrototypeOf(merged) === Object.prototype).toBeTrue();
  expect(({} as any).pwned === undefined).toBeTrue();
  // The legitimate override still applies.
  expect(merged.climate.sensitivity).toBe(4);
});

test('deepMerge ignores constructor and prototype keys', () => {
  const merged = deepMerge(
    { a: 1 } as any,
    JSON.parse('{"constructor": {"x": 1}, "prototype": {"y": 2}, "a": 2}'),
  );
  expect(merged.a).toBe(2);
  expect(Object.prototype.hasOwnProperty.call(merged, 'prototype')).toBeFalse();
});

printSummary();

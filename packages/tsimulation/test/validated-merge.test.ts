/**
 * Tests for the validate-on-construct merge wrapper.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatedMerge } from '../src/validated-merge.js';

test('validatedMerge returns merged params when valid', () => {
  const merged = validatedMerge(
    'demo',
    () => ({ valid: true, errors: [], warnings: [] }),
    (partial) => ({ a: 1, b: 2, ...partial }),
    { b: 20 }
  );
  assert.deepStrictEqual(merged, { a: 1, b: 20 });
});

test('validatedMerge throws with module name and all errors on invalid', () => {
  assert.throws(
    () =>
      validatedMerge(
        'moduleA',
        () => ({ valid: false, errors: ['value too low', 'bad exponent'], warnings: [] }),
        (p) => p,
        {}
      ),
    (err: unknown) =>
      err instanceof Error &&
      err.message.includes('[moduleA]') &&
      err.message.includes('value too low') &&
      err.message.includes('bad exponent')
  );
});

test('validatedMerge logs warnings but does not throw', () => {
  const warnings: string[] = [];
  const orig = console.warn;
  console.warn = (msg: string) => {
    warnings.push(msg);
  };
  try {
    const merged = validatedMerge(
      'moduleB',
      () => ({ valid: true, errors: [], warnings: ['threshold unusually high'] }),
      (p: { threshold?: number }) => ({ threshold: 999, ...p }),
      {}
    );
    assert.strictEqual(merged.threshold, 999);
    assert.ok(warnings.some((w) => w.includes('threshold unusually high')));
    assert.ok(warnings.some((w) => w.includes('[moduleB]')));
  } finally {
    console.warn = orig;
  }
});

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
        'climate',
        () => ({ valid: false, errors: ['sensitivity too low', 'bad damage exp'], warnings: [] }),
        (p) => p,
        {}
      ),
    (err: unknown) =>
      err instanceof Error &&
      err.message.includes('[climate]') &&
      err.message.includes('sensitivity too low') &&
      err.message.includes('bad damage exp')
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
      'energy',
      () => ({ valid: true, errors: [], warnings: ['carbonPrice unusually high'] }),
      (p: { carbonPrice?: number }) => ({ carbonPrice: 999, ...p }),
      {}
    );
    assert.strictEqual(merged.carbonPrice, 999);
    assert.ok(warnings.some((w) => w.includes('carbonPrice unusually high')));
    assert.ok(warnings.some((w) => w.includes('[energy]')));
  } finally {
    console.warn = orig;
  }
});

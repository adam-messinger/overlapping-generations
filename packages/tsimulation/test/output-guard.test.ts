/**
 * Tests for the NaN/Infinity output guard's coverage of arrays and deep nesting.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAutowired as runAutowiredStrict } from '../src/autowire.js';
import { defineModule } from '../src/module.js';
import { okValidate, throwsWith } from './helpers.js';

const runAutowired = (config: Parameters<typeof runAutowiredStrict>[0]) =>
  runAutowiredStrict({ ...config, connectorValidation: 'off' });

/** Module that emits a single output value `v`. */
const emit = (v: unknown) =>
  defineModule({
    name: 'emit',
    description: 'emits one output',
    defaults: {},
    inputs: [] as const,
    outputs: ['v'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { v } }),
  });

const run = (v: unknown) => runAutowired({ modules: [emit(v)], startYear: 0, endYear: 0 });

test('NaN inside an array output is caught, with an indexed path', () => {
  throwsWith(() => run([1, NaN, 3]), "output 'v[1]' is NaN at year 0");
});

test('Infinity inside an array output is caught', () => {
  throwsWith(() => run([1, 2, Infinity]), "output 'v[2]' is Infinity at year 0");
});

test('NaN inside an array of records is caught (mixed path)', () => {
  throwsWith(
    () => run([{ x: 1 }, { x: NaN }]),
    "output 'v[1].x' is NaN at year 0"
  );
});

test('NaN nested in objects at depth 4 is caught (was silently skipped before)', () => {
  throwsWith(
    () => run({ a: { b: { c: { d: NaN } } } }),
    "output 'v.a.b.c.d' is NaN at year 0"
  );
});

test('a number at the depth cap (8) is still checked', () => {
  // v.L1.L2.L3.L4.L5.L6.L7 = NaN  → NaN sits at depth 8
  const atCap = { L1: { L2: { L3: { L4: { L5: { L6: { L7: NaN } } } } } } };
  throwsWith(() => run(atCap), 'is NaN at year 0');
});

test('NaN beyond the former depth cap is caught', () => {
  const tooDeep = { L1: { L2: { L3: { L4: { L5: { L6: { L7: { L8: { L9: NaN } } } } } } } } };
  throwsWith(() => run(tooDeep), 'is NaN at year 0');
});

test('valid arrays and nested records pass the guard', () => {
  const result = run({ series: [1, 2, 3], regions: [{ v: 4 }, { v: 5 }] });
  assert.deepStrictEqual(result.outputs.emit.v[0], { series: [1, 2, 3], regions: [{ v: 4 }, { v: 5 }] });
});

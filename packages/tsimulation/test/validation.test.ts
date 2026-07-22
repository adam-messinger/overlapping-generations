/**
 * Tests that the engine runs each module's validate() at load time.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAutowired as runAutowiredStrict, initAutowired as initAutowiredStrict } from '../src/autowire.js';
import { defineModule } from '../src/module.js';
import { okValidate, throwsWith } from './helpers.js';

const runAutowired = (config: Parameters<typeof runAutowiredStrict>[0]) =>
  runAutowiredStrict({ ...config, connectorValidation: 'off' });
const initAutowired = (config: Parameters<typeof initAutowiredStrict>[0]) =>
  initAutowiredStrict({ ...config, connectorValidation: 'off' });

/** A module whose validate() rejects when `x < 100`. */
const guarded = defineModule({
  name: 'guarded',
  description: 'validates its params',
  defaults: { x: 1 },
  inputs: [] as const,
  outputs: ['y'] as const,
  validate: (p) => {
    const x = (p as { x?: number }).x ?? 0;
    return x >= 100
      ? { valid: true, errors: [], warnings: [] }
      : { valid: false, errors: [`x must be >= 100, got ${x}`], warnings: [] };
  },
  mergeParams: (p) => ({ x: 1, ...p }),
  init: () => ({}),
  step: () => ({ state: {}, outputs: { y: 42 } }),
});

test('runAutowired throws when a module validate() fails, naming the module and error', () => {
  throwsWith(
    () => runAutowired({ modules: [guarded], startYear: 0, endYear: 0 }),
    '[guarded]'
  );
  throwsWith(
    () => runAutowired({ modules: [guarded], startYear: 0, endYear: 0 }),
    'x must be >= 100'
  );
});

test('initAutowired (stepper path) validates too', () => {
  throwsWith(() => initAutowired({ modules: [guarded], startYear: 0, endYear: 0 }), '[guarded]');
});

test('valid params (via override) pass validation and run', () => {
  const result = runAutowired({
    modules: [guarded],
    params: { guarded: { x: 150 } },
    startYear: 0,
    endYear: 0,
  });
  assert.strictEqual(result.outputs.guarded.y[0], 42);
});

test('validate() warnings are surfaced via console.warn but do not throw', () => {
  const warner = defineModule({
    name: 'warner',
    description: 'warns but is valid',
    defaults: {},
    inputs: [] as const,
    outputs: ['z'] as const,
    validate: () => ({ valid: true, errors: [], warnings: ['z is unusually high'] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { z: 1 } }),
  });

  const warnings: string[] = [];
  const orig = console.warn;
  console.warn = (msg: string) => {
    warnings.push(msg);
  };
  try {
    const result = runAutowired({ modules: [warner], startYear: 0, endYear: 0 });
    assert.strictEqual(result.outputs.warner.z[0], 1);
    assert.ok(warnings.some((w) => w.includes('z is unusually high')));
    assert.ok(warnings.some((w) => w.includes('[warner]')));
  } finally {
    console.warn = orig;
  }
});

test('a module with a passing validate() is unaffected', () => {
  const plain = defineModule({
    name: 'plain',
    description: 'always valid',
    defaults: {},
    inputs: [] as const,
    outputs: ['v'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { v: 7 } }),
  });
  const result = runAutowired({ modules: [plain], startYear: 0, endYear: 0 });
  assert.strictEqual(result.outputs.plain.v[0], 7);
});

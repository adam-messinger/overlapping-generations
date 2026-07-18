/**
 * Tests for composition-time wiring validation: transform/output collisions
 * and lag delay validation.
 */

import { test } from 'node:test';
import { buildOutputRegistry, validateWiring, runAutowired } from '../src/autowire.js';
import { defineModule } from '../src/module.js';
import { okValidate, throwsWith } from './helpers.js';

const producer = defineModule({
  name: 'producer',
  description: '',
  defaults: {},
  inputs: [] as const,
  outputs: ['x'] as const,
  validate: okValidate,
  mergeParams: (p) => p,
  init: () => ({}),
  step: () => ({ state: {}, outputs: { x: 1 } }),
});

test('a transform whose name collides with a module output is rejected', () => {
  const registry = buildOutputRegistry([producer]);
  throwsWith(
    () => validateWiring([producer], registry, { x: (o) => o.x }, {}),
    "Transform 'x' collides with output 'x' provided by module 'producer'"
  );
});

test('collision is caught through runAutowired (integration)', () => {
  const consumer = defineModule({
    name: 'consumer',
    description: '',
    defaults: {},
    inputs: ['x'] as const,
    outputs: ['y'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: (_s, i) => ({ state: {}, outputs: { y: i.x } }),
  });
  throwsWith(
    () =>
      runAutowired({
        modules: [producer, consumer],
        transforms: { x: { fn: (o) => (o.x ?? 0) * 2, dependsOn: [] } },
        startYear: 0,
        endYear: 0,
      }),
    'collides with output'
  );
});

test('lag delay must be an integer >= 1', () => {
  const registry = buildOutputRegistry([producer]);
  for (const bad of [0, -1, 1.5]) {
    throwsWith(
      () => validateWiring([producer], registry, {}, { lagX: { source: 'x', delay: bad, initial: 0 } }),
      `delay ${bad}: delay must be an integer >= 1`
    );
  }
});

test('lag delay of 1 and 2 are accepted', () => {
  const registry = buildOutputRegistry([producer]);
  // Should not throw.
  validateWiring([producer], registry, {}, { lagX: { source: 'x', delay: 1, initial: 0 } });
  validateWiring([producer], registry, {}, { lagX: { source: 'x', delay: 2, initial: 0 } });
});

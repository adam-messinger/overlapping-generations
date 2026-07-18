/**
 * Tests for auto-generated parameter introspection.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateParameterSchema } from '../src/introspect.js';
import { defineModule } from '../src/module.js';
import { okValidate } from './helpers.js';

const mod = defineModule({
  name: 'demo',
  description: 'test module with paramMeta across tiers',
  defaults: { gain: 3, nested: { limit: 2 }, buried: 0.5 },
  inputs: [] as const,
  outputs: ['x'] as const,
  validate: okValidate,
  mergeParams: (p) => p,
  init: () => ({}),
  step: () => ({ state: {}, outputs: { x: 0 } }),
  paramMeta: {
    gain: {
      description: 'Primary gain',
      unit: 'ratio',
      range: { min: 1, max: 6, default: 3 },
      tier: 1,
      paramName: 'topGain',
    },
    nested: {
      limit: {
        description: 'Nested limit',
        unit: 'ratio',
        range: { min: 1, max: 5, default: 2 },
        tier: 2,
      },
    },
    buried: {
      description: 'Calibration knob',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.5 },
      tier: 3,
    },
  },
});

test('generateParameterSchema returns tier-1 params by default with full metadata', () => {
  const schema = generateParameterSchema([mod]);
  assert.deepStrictEqual(Object.keys(schema), ['topGain']); // paramName alias, tier-1 only
  const s = schema.topGain;
  assert.strictEqual(s.type, 'number');
  assert.strictEqual(s.default, 3);
  assert.strictEqual(s.min, 1);
  assert.strictEqual(s.max, 6);
  assert.strictEqual(s.unit, 'ratio');
  assert.strictEqual(s.description, 'Primary gain');
  assert.strictEqual(s.path, 'demo.gain');
});

test('generateParameterSchema includes deeper tiers when maxTier is raised', () => {
  const t2 = generateParameterSchema([mod], 2);
  assert.deepStrictEqual(Object.keys(t2).sort(), ['limit', 'topGain']);
  assert.strictEqual(t2.limit.path, 'demo.nested.limit');

  const t3 = generateParameterSchema([mod], 3);
  assert.deepStrictEqual(Object.keys(t3).sort(), ['buried', 'limit', 'topGain']);
});

test('modules without paramMeta contribute nothing', () => {
  const bare = defineModule({
    name: 'bare',
    description: '',
    defaults: { a: 1 },
    inputs: [] as const,
    outputs: ['o'] as const,
    validate: okValidate,
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { o: 0 } }),
  });
  assert.deepStrictEqual(generateParameterSchema([bare]), {});
});

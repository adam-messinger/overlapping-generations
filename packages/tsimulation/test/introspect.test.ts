/**
 * Tests for auto-generated parameter introspection.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateParameterSchema } from '../src/introspect.js';
import { defineModule } from '../src/module.js';

const mod = defineModule({
  name: 'climate',
  description: 'test module with paramMeta across tiers',
  defaults: { sensitivity: 3, tipping: { threshold: 2 }, hidden: 0.5 },
  inputs: [] as const,
  outputs: ['x'] as const,
  validate: () => ({ valid: true, errors: [], warnings: [] }),
  mergeParams: (p) => p,
  init: () => ({}),
  step: () => ({ state: {}, outputs: { x: 0 } }),
  paramMeta: {
    sensitivity: {
      description: 'Equilibrium climate sensitivity',
      unit: '°C',
      range: { min: 1, max: 6, default: 3 },
      tier: 1,
      paramName: 'climateSensitivity',
    },
    tipping: {
      threshold: {
        description: 'Tipping threshold',
        unit: '°C',
        range: { min: 1, max: 5, default: 2 },
        tier: 2,
      },
    },
    hidden: {
      description: 'Calibration knob',
      unit: 'fraction',
      range: { min: 0, max: 1, default: 0.5 },
      tier: 3,
    },
  },
});

test('generateParameterSchema returns tier-1 params by default with full metadata', () => {
  const schema = generateParameterSchema([mod]);
  assert.deepStrictEqual(Object.keys(schema), ['climateSensitivity']); // paramName alias, tier-1 only
  const s = schema.climateSensitivity;
  assert.strictEqual(s.type, 'number');
  assert.strictEqual(s.default, 3);
  assert.strictEqual(s.min, 1);
  assert.strictEqual(s.max, 6);
  assert.strictEqual(s.unit, '°C');
  assert.strictEqual(s.description, 'Equilibrium climate sensitivity');
  assert.strictEqual(s.path, 'climate.sensitivity');
});

test('generateParameterSchema includes deeper tiers when maxTier is raised', () => {
  const t2 = generateParameterSchema([mod], 2);
  assert.deepStrictEqual(Object.keys(t2).sort(), ['climateSensitivity', 'threshold']);
  assert.strictEqual(t2.threshold.path, 'climate.tipping.threshold');

  const t3 = generateParameterSchema([mod], 3);
  assert.deepStrictEqual(Object.keys(t3).sort(), ['climateSensitivity', 'hidden', 'threshold']);
});

test('modules without paramMeta contribute nothing', () => {
  const bare = defineModule({
    name: 'bare',
    description: '',
    defaults: { a: 1 },
    inputs: [] as const,
    outputs: ['o'] as const,
    validate: () => ({ valid: true, errors: [], warnings: [] }),
    mergeParams: (p) => p,
    init: () => ({}),
    step: () => ({ state: {}, outputs: { o: 0 } }),
  });
  assert.deepStrictEqual(generateParameterSchema([bare]), {});
});

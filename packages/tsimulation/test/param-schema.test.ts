/**
 * Parameter schemas and derived parameters.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bool, choice, defineParams, group, num, type InferParams } from '../src/param-schema.js';
import { applyDerivations, type ParamDerivation } from '../src/param-derivations.js';
import { generateParameterSchema } from '../src/introspect.js';
import { defineModule } from '../src/module.js';
import { throwsWith } from './helpers.js';

const schema = defineParams('demo', {
  rate: num({
    default: 0.03, unit: 'fraction/year', min: 0, max: 1, source: 'test 2026',
    tier: 1, paramName: 'demoRate', description: 'A rate.', explore: { min: 0.01, max: 0.1 },
  }),
  cost: num({ default: 400, unit: '$/tCO2', min: 0, exclusiveMin: true }),
  years: num({ default: 10, unit: 'year', integer: true, min: 1 }),
  enabled: bool({ default: true }),
  mode: choice(['fast', 'slow'], { default: 'fast' }),
  region: group({
    us: num({ default: 1, unit: 'fraction', source: 'test', tier: 2, description: 'US share.' }),
    eu: num({ default: 2, unit: 'fraction' }),
  }),
});
type Demo = InferParams<typeof schema.children>;

test('defaults are derived from the declaration and are a fresh copy each read', () => {
  const defaults: Demo = schema.defaults;
  assert.deepEqual(defaults, {
    rate: 0.03, cost: 400, years: 10, enabled: true, mode: 'fast', region: { us: 1, eu: 2 },
  });
  defaults.region.us = 99;
  assert.equal(schema.defaults.region.us, 1);
});

test('merge is deep: a nested override keeps its siblings', () => {
  // The bug class: a hand-written spread merge replaced the whole nested
  // section, silently resetting every sibling to undefined.
  const merged = schema.merge({ region: { eu: 5 } });
  assert.deepEqual(merged.region, { us: 1, eu: 5 });
  assert.equal(merged.rate, 0.03);
});

test('an unknown key at any depth is rejected, not ignored', () => {
  throwsWith(() => schema.merge({ rat: 0.1 }), "unknown parameter 'rat'");
  throwsWith(() => schema.merge({ region: { use: 1 } }), "unknown parameter 'region.use'");
});

test('inherited names can never address a parameter', () => {
  const polluted = JSON.parse('{"__proto__": {"probe": 1}}');
  throwsWith(() => schema.merge(polluted), "unknown parameter '__proto__'");
  throwsWith(() => schema.merge({ constructor: 1 }), "unknown parameter 'constructor'");
  assert.equal(({} as Record<string, unknown>).probe, undefined);
});

test('the caller\'s object is copied, not aliased', () => {
  const overrides = { region: { us: 3 } };
  const merged = schema.merge(overrides);
  overrides.region.us = 7;
  assert.equal(merged.region.us, 3);
});

test('types and validity bounds are enforced', () => {
  const errors = schema.validate({
    rate: 2, cost: 0, years: 2.5, enabled: 'yes', mode: 'medium', region: 3,
  }).errors;
  assert.deepEqual(errors, [
    'rate must be <= 1, got 2',
    'cost must be > 0, got 0',
    'years must be an integer, got 2.5',
    'enabled must be a boolean, got yes',
    'mode must be one of fast, slow, got medium',
    'region must be a plain object',
  ]);
  throwsWith(() => schema.merge({ rate: Number.NaN }), 'rate must be a finite number');
});

test('paramMeta comes from the same declaration, so its default cannot disagree', () => {
  assert.deepEqual(schema.paramMeta.rate, {
    description: 'A rate.', unit: 'fraction/year', range: { min: 0.01, max: 0.1, default: 0.03 },
    tier: 1, source: 'test 2026', paramName: 'demoRate',
  });
  // Untiered leaves stay out of introspection
  assert.equal(schema.paramMeta.cost, undefined);
  assert.deepEqual(Object.keys(schema.paramMeta.region), ['us']);

  const mod = defineModule({
    name: 'demo',
    description: 'demo',
    defaults: schema.defaults,
    paramMeta: schema.paramMeta,
    connectorTypes: { inputs: {}, outputs: {} },
    validate: schema.validate,
    mergeParams: (p) => schema.merge(p),
    init: () => ({}),
    step: () => ({ state: {}, outputs: {} }),
  });
  const generated = generateParameterSchema([mod], 2);
  assert.equal(generated.demoRate.path, 'demo.rate');
  assert.equal(generated.demoRate.default, 0.03);
  assert.equal(generated.us.path, 'demo.region.us');
});

test('a schema that contradicts itself fails at definition', () => {
  throwsWith(() => defineParams('bad', { x: num({ default: -1, unit: 'fraction', min: 0 }) }),
    'default violates its own bounds: x must be >= 0');
  throwsWith(() => defineParams('bad', { x: num({ default: 1, unit: 'furlongs' }) }),
    "x has unknown unit 'furlongs'");
  throwsWith(() => defineParams('bad', { x: num({ default: 1, unit: '1', tier: 1 }) }),
    'x is tiered but has no description');
  throwsWith(() => defineParams('bad', {
    x: num({ default: 5, unit: '1', explore: { min: 0, max: 1 } }),
  }), 'default 5 is outside its explore range');
  throwsWith(() => defineParams('bad', {
    x: num({ default: 0.5, unit: '1', min: 0, max: 1, explore: { min: 0, max: 2 } }),
  }), 'explore range leaves the validity bounds');
});

test('leaf paths and unsourced numbers are listed', () => {
  assert.deepEqual(schema.leafPaths(), ['rate', 'cost', 'years', 'enabled', 'mode', 'region.us', 'region.eu']);
  assert.deepEqual(schema.unsourced(), ['cost', 'years', 'region.eu']);
});

// =============================================================================
// DERIVATIONS
// =============================================================================

const defaults: Record<string, Record<string, any>> = {
  climate: { sensitivity: 3, damage: 0.005 },
  cdr: { tcre: 0.00058, damage: 0.005, horizon: 100 },
  grid: { loss: 1.25 },
  energy: { loss: 1.25, scaled: 0 },
};
const merge = (name: string, overrides: Record<string, unknown>) => ({ ...defaults[name], ...overrides });

const DERIVATIONS: ParamDerivation[] = [
  {
    target: 'energy.scaled',
    from: ['energy.loss'],
    description: 'Scaled planning loss.',
    derive: (read) => (read('energy.loss') as number) * 2,
  },
  {
    target: 'cdr.tcre',
    from: ['climate.sensitivity'],
    description: 'TCRE scales with sensitivity.',
    derive: (read) => 0.00058 * (read('climate.sensitivity') as number) / 3,
  },
  {
    target: 'energy.loss',
    from: ['grid.loss'],
    description: 'One grid-loss factor.',
    derive: (read) => read('grid.loss'),
  },
];

test('targets follow their sources, in dependency order', () => {
  const { params, values, reads } = applyDerivations(
    { climate: { sensitivity: 4.5 }, grid: { loss: 1.1 } },
    DERIVATIONS,
    { merge },
  );
  assert.equal(params.cdr.tcre, 0.00058 * 1.5);
  // energy.scaled reads energy.loss, itself derived: computed after it
  assert.equal(params.energy.loss, 1.1);
  assert.equal(params.energy.scaled, 2.2);
  assert.deepEqual(Object.keys(values).sort(), ['cdr.tcre', 'energy.loss', 'energy.scaled']);
  assert.deepEqual(reads, { energy: ['loss'], grid: ['loss'], climate: ['sensitivity'] });
});

test('overriding a derived parameter is refused unless decoupled', () => {
  // The failure mode: `??=` coupling let an explicit value, even the default,
  // silently re-split two views of one quantity.
  throwsWith(() => applyDerivations({ cdr: { tcre: 0.00058 } }, DERIVATIONS, { merge }),
    "Parameter 'cdr.tcre' is derived from climate.sensitivity");
  const { params } = applyDerivations(
    { cdr: { tcre: 0.001 }, climate: { sensitivity: 4.5 } },
    DERIVATIONS,
    { merge, decouple: ['cdr.tcre'] },
  );
  assert.equal(params.cdr.tcre, 0.001);
});

test('a stale decouple entry is an error, not a silent no-op', () => {
  throwsWith(() => applyDerivations({}, DERIVATIONS, { merge, decouple: ['cdr.horizon'] }),
    "decouple names 'cdr.horizon', which is not a derived parameter");
});

test('a derivation cannot read what it does not declare', () => {
  const sneaky: ParamDerivation = {
    target: 'cdr.damage', from: ['climate.sensitivity'], description: 'x',
    derive: (read) => read('climate.damage'),
  };
  throwsWith(() => applyDerivations({}, [sneaky], { merge }),
    "read 'climate.damage', which it does not declare in from");
});

test('cycles and duplicate targets are rejected', () => {
  const a: ParamDerivation = { target: 'x.a', from: ['x.b'], description: '', derive: (r) => r('x.b') };
  const b: ParamDerivation = { target: 'x.b', from: ['x.a'], description: '', derive: (r) => r('x.a') };
  throwsWith(() => applyDerivations({}, [a, b], { merge: () => ({}) }), 'Derived parameters form a cycle');
  throwsWith(() => applyDerivations({}, [a, a], { merge: () => ({}) }), "Parameter 'x.a' is derived twice");
});

test('each module is merged once per distinct overrides object', () => {
  const calls: string[] = [];
  applyDerivations({ climate: { sensitivity: 4.5 } }, [
    { target: 'cdr.a', from: ['climate.sensitivity'], description: '', derive: (r) => r('climate.sensitivity') },
    { target: 'cdr.b', from: ['climate.sensitivity'], description: '', derive: (r) => r('climate.sensitivity') },
  ], { merge: (name, overrides) => { calls.push(name); return merge(name, overrides); } });
  assert.deepEqual(calls, ['climate']);
});

test('input params are not mutated', () => {
  const input = { climate: { sensitivity: 4.5 } };
  applyDerivations(input, DERIVATIONS, { merge });
  assert.deepEqual(input, { climate: { sensitivity: 4.5 } });
});

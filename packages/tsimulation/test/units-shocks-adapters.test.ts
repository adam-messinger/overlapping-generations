import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  composeShockLedger,
  convertUnit,
  defineAdapter,
  defineModel,
  defineModule,
  auditConnectorContracts,
  areUnitsConvertible,
  getUnit,
  mergeTemporalRecords,
  multiplyUnits,
  runAutowired,
  runAdapter,
  runModel,
  trackObjectReads,
  unreadOverridePaths,
  unitConnector,
  validatePortUnits,
} from '../src/index.js';
import { okValidate } from './helpers.js';

test('units convert explicitly and incompatible connector units fail', () => {
  assert.equal(convertUnit(100, 'bp', '%'), 1);
  assert.equal(convertUnit(1, '$T', '$B'), 1_000);
  assert.throws(() => convertUnit(1, 'GW', 'TWh'), /Incompatible/);
  assert.throws(
    () => validatePortUnits({ unit: '%' }, { unit: 'fraction' }, 'port x'),
    /explicit conversion/,
  );
});

test('compound-unit algebra distinguishes stocks, flows, power, and energy', () => {
  assert.equal(convertUnit(1, '$T/year', '$B/year'), 1_000);
  assert.equal(convertUnit(1, 'GW*hour', 'GWh'), 1);
  assert.ok(getUnit('kgCO2/MWh'));
  assert.ok(areUnitsConvertible(multiplyUnits('GW', 'hour').symbol, 'GWh'));
  assert.throws(() => convertUnit(1, '$T', '$T/year'), /Incompatible/);
  assert.throws(() => convertUnit(1, 'GW', 'TWh'), /Incompatible/);
});

test('strict graph audit rejects missing contracts and implicit scale conversions', () => {
  const legacy = defineModule({
    name: 'legacy', description: 'missing contract', defaults: {}, inputs: [] as const,
    outputs: ['value'] as const, validate: okValidate, mergeParams: (p) => p,
    init: () => ({}), step: () => ({ state: {}, outputs: { value: 1 } }),
  } as any);
  assert.throws(
    () => runAutowired({ modules: [legacy], startYear: 0, endYear: 0 }),
    /Missing connector contract/,
  );

  const producer = defineModule({
    name: 'producer', description: 'produces billions', defaults: {}, inputs: [] as const,
    outputs: ['revenue'] as const,
    connectorTypes: { inputs: {}, outputs: { revenue: unitConnector('number', '$B/year') } },
    validate: okValidate, mergeParams: (p) => p, init: () => ({}),
    step: () => ({ state: {}, outputs: { revenue: 1_000 } }),
  });
  const consumer = defineModule({
    name: 'consumer', description: 'expects trillions', defaults: {}, inputs: ['revenue'] as const,
    outputs: ['seen'] as const,
    connectorTypes: {
      inputs: { revenue: unitConnector('number', '$T/year') },
      outputs: { seen: unitConnector('number', '$T/year') },
    },
    validate: okValidate, mergeParams: (p) => p, init: () => ({}),
    step: (_s, input) => ({ state: {}, outputs: { seen: input.revenue } }),
  });
  const audit = auditConnectorContracts([producer, consumer]);
  assert.equal(audit.valid, false);
  assert.ok(audit.errors.some((error) => error.includes('unit mismatch')));
});

test('an explicit transform may perform a declared unit conversion', () => {
  const producer = defineModule({
    name: 'producer-b', description: 'produces billions', defaults: {}, inputs: [] as const,
    outputs: ['revenueB'] as const,
    connectorTypes: { inputs: {}, outputs: { revenueB: unitConnector('number', '$B/year') } },
    validate: okValidate, mergeParams: (p) => p, init: () => ({}),
    step: () => ({ state: {}, outputs: { revenueB: 1_000 } }),
  });
  const consumer = defineModule({
    name: 'consumer-t', description: 'consumes trillions', defaults: {}, inputs: ['revenueT'] as const,
    outputs: ['seen'] as const,
    connectorTypes: {
      inputs: { revenueT: unitConnector('number', '$T/year') },
      outputs: { seen: unitConnector('number', '$T/year') },
    },
    validate: okValidate, mergeParams: (p) => p, init: () => ({}),
    step: (_s, input) => ({ state: {}, outputs: { seen: input.revenueT } }),
  });
  const transforms = {
    revenueT: {
      fn: (outputs: Record<string, number>) => convertUnit(outputs.revenueB, '$B/year', '$T/year'),
      dependsOn: ['revenueB'],
      inputTypes: { revenueB: unitConnector('number', '$B/year') },
      outputType: unitConnector('number', '$T/year'),
    },
  };
  const audit = auditConnectorContracts([producer, consumer], transforms);
  assert.equal(audit.valid, true, audit.errors.join('\n'));
  const result = runAutowired({ modules: [producer, consumer], transforms, startYear: 0, endYear: 0 });
  assert.equal(result.outputs['consumer-t'].seen[0], 1);
});

test('lags preserve their source unit and cannot hide a mismatch', () => {
  const source = defineModule({
    name: 'energy-source', description: 'annual energy', defaults: {}, inputs: [] as const,
    outputs: ['energy'] as const,
    connectorTypes: { inputs: {}, outputs: { energy: unitConnector('number', 'TWh/year') } },
    validate: okValidate, mergeParams: (p) => p, init: () => ({}),
    step: () => ({ state: {}, outputs: { energy: 1 } }),
  });
  const sink = defineModule({
    name: 'power-sink', description: 'expects power', defaults: {}, inputs: ['previousPower'] as const,
    outputs: ['seen'] as const,
    connectorTypes: {
      inputs: { previousPower: unitConnector('number', 'GW') },
      outputs: { seen: unitConnector('number', 'GW') },
    },
    validate: okValidate, mergeParams: (p) => p, init: () => ({}),
    step: (_s, input) => ({ state: {}, outputs: { seen: input.previousPower } }),
  });
  const audit = auditConnectorContracts([source, sink], {}, {
    previousPower: {
      source: 'energy', delay: 1, initial: 0,
      contract: unitConnector('number', 'TWh/year'),
    },
  });
  assert.equal(audit.valid, false);
  assert.ok(audit.errors.some((error) => error.includes('lag previousPower -> power-sink.previousPower')));
});

test('model contracts catch runtime drift beyond the declared TypeScript shape', () => {
  const model = defineModel<{ x: number }, { y: number }>({
    id: 'drifting-model', version: '1', description: 'returns an undeclared field',
    inputPorts: { x: { unit: '1' } }, outputPorts: { y: { unit: '1' } },
    run: ({ x }) => ({ y: x, accidental: x } as { y: number }),
  });
  assert.throws(() => runModel(model, { x: 1 }), /accidental: value has no port contract/);
});

test('shock ledger composes compatible shocks and rejects overlap/double counting', () => {
  const composed = composeShockLedger([
    { id: 'a', channel: 'price', period: 2026, value: 100, unit: 'bp', operation: 'add' },
    { id: 'b', channel: 'price', period: 2026, value: 1, unit: '%', operation: 'add' },
  ]);
  assert.equal(composed.length, 1);
  assert.equal(composed[0].value, 200);
  assert.throws(() => composeShockLedger([
    { id: 'x', channel: 'oil', period: 1, value: 0.2, unit: 'fraction', operation: 'add', overlapGroup: 'hormuz' },
    { id: 'y', channel: 'oil', period: 1, value: 0.1, unit: 'fraction', operation: 'add', overlapGroup: 'hormuz' },
  ]), /overlap group/);
  assert.throws(() => mergeTemporalRecords({
    existing: [{ year: 2026, value: 1 }], generated: [{ year: 2026, value: 2 }],
  }), /conflicts/);
  assert.deepEqual(mergeTemporalRecords({
    existing: [{ year: 2026, value: 1 }], generated: [{ year: 2026, value: 2 }], onConflict: 'replace',
  }), [{ year: 2026, value: 2 }]);
});

test('adapters declare source/target models, time scales, units, and validation', () => {
  const adapter = defineAdapter<{ monthly: number[] }, { annual: number }>({
    id: 'monthly-to-annual', version: '1', description: 'sum monthly values',
    sourceModel: 'monthly', targetModel: 'annual',
    sourceTimeScale: { kind: 'monthly' }, targetTimeScale: { kind: 'annual' },
    sourcePorts: { flow: { unit: 'TWh' } }, targetPorts: { flow: { unit: 'TWh' } },
    portMappings: [{
      source: 'flow', target: 'flow', conversion: { kind: 'identity' }, aggregation: { kind: 'sum' },
    }],
    adapt: (source) => ({ annual: source.monthly.reduce((sum, value) => sum + value, 0) }),
  });
  const run = runAdapter(adapter, { monthly: [1, 2, 3] }, { sourceRunId: 'run-1' });
  assert.deepEqual(run.target, { annual: 6 });
  assert.equal(run.context.sourceRunId, 'run-1');
});

test('adapters reject implicit scale changes and accept an explicit conversion function', () => {
  const base = {
    id: 'currency-scale', version: '1', description: 'currency scale bridge',
    sourceModel: 'billions', targetModel: 'trillions',
    sourceTimeScale: { kind: 'annual' as const }, targetTimeScale: { kind: 'annual' as const },
    sourcePorts: { value: { unit: '$B' } }, targetPorts: { value: { unit: '$T' } },
    adapt: (source: { value: number }) => ({ value: convertUnit(source.value, '$B', '$T') }),
  };
  assert.throws(() => defineAdapter({
    ...base,
    portMappings: [{
      source: 'value', target: 'value', conversion: { kind: 'identity' as const }, aggregation: { kind: 'none' as const },
    }],
  }), /identity mapping/);
  const adapter = defineAdapter({
    ...base,
    portMappings: [{
      source: 'value', target: 'value',
      conversion: { kind: 'unit' as const, convert: (value: number) => convertUnit(value, '$B', '$T') },
      aggregation: { kind: 'none' as const },
    }],
  });
  assert.equal(runAdapter(adapter, { value: 1_000 }).target.value, 1);
});

test('nested parameter read tracking identifies an inert override', () => {
  const tracked = trackObjectReads({ active: { value: 2 }, inert: 3 });
  assert.equal(tracked.proxy.active.value, 2);
  assert.deepEqual(unreadOverridePaths({ active: { value: 9 }, inert: 4 }, tracked.reads), ['inert']);
});

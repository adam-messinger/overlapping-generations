import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  composeShockLedger,
  convertUnit,
  defineAdapter,
  defineModel,
  defineModule,
  auditConnectorContracts,
  auditModelContracts,
  areUnitsConvertible,
  assertPortValue,
  getUnit,
  assertUnitBalance,
  convertQuantity,
  divideQuantities,
  integrateFlow,
  metadataPort,
  mergeTemporalRecords,
  multiplyUnits,
  multiplyQuantities,
  objectConnector,
  objectPort,
  runAutowired,
  runAdapter,
  runModel,
  trackObjectReads,
  unreadOverridePaths,
  unitConnector,
  unitQuantity,
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

test('absolute temperatures, temperature differences, and calendar labels stay distinct', () => {
  assert.ok(Math.abs(convertUnit(30, '°C', 'K') - 303.15) < 1e-12);
  assert.equal(convertUnit(5, 'Δ°C', 'ΔK'), 5);
  assert.equal(areUnitsConvertible('°C', 'Δ°C'), false);
  assert.equal(areUnitsConvertible('pH', 'fraction'), false);
  assert.equal(areUnitsConvertible('calendar-year', 'year'), false);
  assert.equal(areUnitsConvertible('calendar-month', 'month'), false);
  assert.equal(areUnitsConvertible('step-index', 'month'), false);
  assert.ok(getUnit('Δ°C*day'));
  assert.equal(getUnit('°C*day'), undefined);
});

test('aviation units distinguish flights, endpoint operations, passengers, and capacity', () => {
  assert.ok(Math.abs(convertUnit(1, 'mi', 'km') - 1.609344) < 1e-12);
  assert.equal(areUnitsConvertible('flight', 'operation'), false);
  assert.equal(areUnitsConvertible('flight', 'passenger-trip'), false);
  assert.equal(areUnitsConvertible('aircraft', 'vehicle'), false);
  assert.ok(getUnit('flight/aircraft/day'));
  assert.ok(getUnit('operation/facility/day'));
  assert.ok(getUnit('USgal/operation'));
});

test('recursive contracts validate every nested field and report its path', () => {
  interface CapacityRow { solar: number; battery: number; label: string }
  const capacity = objectPort<CapacityRow>({
    solar: { unit: 'GW' },
    battery: { unit: 'GWh' },
    label: metadataPort('string', 'Scenario label.'),
  });
  assertPortValue({ solar: 10, battery: 40, label: 'base' }, capacity, 'capacity');
  assert.throws(
    () => assertPortValue({ solar: 10, battery: 40 }, capacity, 'capacity'),
    /capacity.label: required contracted value is missing/,
  );
  assert.throws(
    () => assertPortValue({ solar: 10, battery: 40, label: true }, capacity, 'capacity'),
    /capacity.label: expected string metadata/,
  );
  assert.throws(
    () => assertPortValue(
      { solar: 10, battery: 40, label: 'base', undeclared: 1 },
      capacity,
      'capacity',
    ),
    /capacity.undeclared: value has no port contract/,
  );

  const producer = objectConnector<CapacityRow>('record', {
    solar: { unit: 'GW' },
    battery: { unit: 'GWh' },
    label: metadataPort('string', 'Scenario label.'),
  });
  const badConsumer = objectConnector<CapacityRow>('record', {
    solar: { unit: 'GW' },
    battery: { unit: 'GW' },
    label: metadataPort('string', 'Scenario label.'),
  });
  assert.throws(
    () => validatePortUnits(producer, badConsumer, 'energy capacities'),
    /energy capacities\.battery: unit mismatch 'GWh' -> 'GW'/,
  );
});

test('scalar, optional, and nullable contracts stay strict at runtime and wiring time', () => {
  assert.throws(
    () => assertPortValue([1, 2], { unit: 'GW' }, 'scalar capacity'),
    /scalar capacity: expected number value/,
  );
  assert.throws(
    () => assertPortValue({ a: null }, { unit: 'GW', valueType: 'record' }, 'capacity map'),
    /capacity map\.a: unit-bearing value must be numeric, got null/,
  );
  assert.throws(
    () => validatePortUnits(
      { unit: 'GW', nullable: true },
      { unit: 'GW' },
      'nullable capacity',
    ),
    /nullable producer cannot satisfy a non-null consumer/,
  );
  assert.throws(
    () => validatePortUnits(
      { unit: 'GW', optional: true },
      { unit: 'GW' },
      'optional capacity',
    ),
    /optional producer cannot satisfy a required consumer/,
  );

  const malformed = auditModelContracts([{
    id: 'malformed',
    inputPorts: { row: { kind: 'object' } },
    outputPorts: { value: { unit: '1' } },
  }] as any);
  assert.equal(malformed.valid, false);
  assert.match(malformed.errors.join('\n'), /object contract must declare fields/);
});

test('unit-aware equations integrate flows and reject invalid arithmetic', () => {
  const annualInvestment = unitQuantity(2, '$T/year', 'investment');
  const addition = integrateFlow(annualInvestment, unitQuantity(1, 'year'), '$T', 'annual investment');
  assert.ok(Math.abs(addition.value - 2) < 1e-12);
  assert.equal(addition.unit, '$T');

  const generation = convertQuantity(multiplyQuantities([
    unitQuantity(1, 'GW'),
    unitQuantity(0.5, 'fraction'),
    unitQuantity(8760, 'hour/year'),
  ]), 'TWh/year');
  assert.ok(Math.abs(generation.value - 4.38) < 1e-12);

  const storageDuration = convertQuantity(divideQuantities(
    unitQuantity(8, 'GWh'),
    unitQuantity(2, 'GW'),
  ), 'hour');
  assert.ok(Math.abs(storageDuration.value - 4) < 1e-12);

  assertUnitBalance('capital stock', unitQuantity(102, '$T'), [
    unitQuantity(100, '$T'),
    addition,
  ]);
  assert.throws(
    () => assertUnitBalance('bad ledger', unitQuantity(1, '$T'), [unitQuantity(1, 'people')]),
    /cannot convert 'people' to '\$T'/,
  );
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

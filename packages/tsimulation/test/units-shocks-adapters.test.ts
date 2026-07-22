import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  composeShockLedger,
  convertUnit,
  defineAdapter,
  mergeTemporalRecords,
  runAdapter,
  trackObjectReads,
  unreadOverridePaths,
  validatePortUnits,
} from '../src/index.js';

test('units convert explicitly and incompatible connector units fail', () => {
  assert.equal(convertUnit(100, 'bp', '%'), 1);
  assert.equal(convertUnit(1, '$T', '$B'), 1_000);
  assert.throws(() => convertUnit(1, 'GW', 'TWh'), /Incompatible/);
  assert.throws(
    () => validatePortUnits({ unit: '%' }, { unit: 'fraction' }, 'port x'),
    /explicit conversion/,
  );
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
    adapt: (source) => ({ annual: source.monthly.reduce((sum, value) => sum + value, 0) }),
  });
  const run = runAdapter(adapter, { monthly: [1, 2, 3] }, { sourceRunId: 'run-1' });
  assert.deepEqual(run.target, { annual: 6 });
  assert.equal(run.context.sourceRunId, 'run-1');
});

test('nested parameter read tracking identifies an inert override', () => {
  const tracked = trackObjectReads({ active: { value: 2 }, inert: 3 });
  assert.equal(tracked.proxy.active.value, 2);
  assert.deepEqual(unreadOverridePaths({ active: { value: 9 }, inert: 4 }, tracked.reads), ['inert']);
});

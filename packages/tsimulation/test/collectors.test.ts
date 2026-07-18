/**
 * Tests for declarative result collection.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAutowired } from '../src/autowire.js';
import { defineModule } from '../src/module.js';
import { collectResults, resolveKey } from '../src/collectors.js';

const ramp = defineModule({
  name: 'ramp',
  description: 'Outputs a rising number and a nested record',
  defaults: {},
  inputs: [] as const,
  outputs: ['temp', 'nested'] as const,
  validate: () => ({ valid: true, errors: [], warnings: [] }),
  mergeParams: (p) => p,
  init: () => ({}),
  step: (_s, _i, _p, _y, yearIndex) => ({
    state: {},
    outputs: { temp: yearIndex * 10, nested: { region: { value: yearIndex + 1 } } },
  }),
});

function run() {
  return runAutowired({ modules: [ramp], startYear: 2000, endYear: 2004 });
}

test('collectResults extracts a simple timeseries by source', () => {
  const { timeseries, years } = collectResults(run(), {
    timeseries: [{ source: 'temp' }],
    metrics: [],
  });
  assert.deepStrictEqual(years, [2000, 2001, 2002, 2003, 2004]);
  assert.strictEqual(timeseries[0].temp, 0);
  assert.strictEqual(timeseries[4].temp, 40);
  assert.strictEqual(timeseries[0].year, 2000);
});

test('collectResults renames via `as` and reads nested via `path`', () => {
  const { timeseries } = collectResults(run(), {
    timeseries: [
      { source: 'temp', as: 'temperature' },
      { source: 'nested', as: 'regionValue', path: 'region.value' },
    ],
    metrics: [],
  });
  assert.strictEqual(timeseries[2].temperature, 20);
  assert.strictEqual(timeseries[2].regionValue, 3);
});

test('collectResults supports a transform timeseries', () => {
  const { timeseries } = collectResults(run(), {
    timeseries: [{ source: 'temp', as: 'plusYear', transform: (o, year) => o.temp + year }],
    metrics: [],
  });
  assert.strictEqual(timeseries[1].plusYear, 10 + 2001);
});

test('resolveKey prefers `as`, else falls back to source', () => {
  assert.strictEqual(resolveKey({ source: 'temp' }), 'temp');
  assert.strictEqual(resolveKey({ source: 'temp', as: 'temperature' }), 'temperature');
});

test('metric aggregators: last, max, min', () => {
  const { metrics } = collectResults(run(), {
    timeseries: [{ source: 'temp' }],
    metrics: [
      { source: 'temp', as: 'final', aggregator: 'last' },
      { source: 'temp', as: 'hi', aggregator: 'max' },
      { source: 'temp', as: 'lo', aggregator: 'min' },
    ],
  });
  assert.strictEqual(metrics.final, 40);
  assert.strictEqual(metrics.hi, 40);
  assert.strictEqual(metrics.lo, 0);
});

test('metric aggregator: first matching year', () => {
  const { metrics } = collectResults(run(), {
    timeseries: [{ source: 'temp' }],
    metrics: [{ source: 'temp', as: 'firstHot', aggregator: { first: (v) => v >= 25 } }],
  });
  assert.strictEqual(metrics.firstHot, 2003); // yearIndex 3 → temp 30 ≥ 25
});

test('metric aggregator: peak returns value and year', () => {
  const { metrics } = collectResults(run(), {
    timeseries: [{ source: 'temp' }],
    metrics: [{ source: 'temp', as: 'peak', aggregator: { peak: true } }],
  });
  assert.deepStrictEqual(metrics.peak, { value: 40, year: 2004 });
});

test('metric aggregator: custom, and a transform-based metric', () => {
  const { metrics } = collectResults(run(), {
    timeseries: [{ source: 'temp' }],
    metrics: [
      { source: 'temp', as: 'sum', aggregator: { custom: (vals) => vals.reduce((a, b) => a + b, 0) } },
      { as: 'lastNested', transform: (o) => o.nested.region.value, aggregator: 'last' },
    ],
  });
  assert.strictEqual(metrics.sum, 0 + 10 + 20 + 30 + 40);
  assert.strictEqual(metrics.lastNested, 5);
});

/**
 * Tests for declarative result collection.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAutowired } from '../src/autowire.js';
import { defineModule } from '../src/module.js';
import { collectResults, resolveKey } from '../src/collectors.js';
import { okValidate } from './helpers.js';

const ramp = defineModule({
  name: 'ramp',
  description: 'Outputs a rising number and a nested record',
  defaults: {},
  inputs: [] as const,
  outputs: ['level', 'group'] as const,
  validate: okValidate,
  mergeParams: (p) => p,
  init: () => ({}),
  step: (_s, _i, _p, _y, yearIndex) => ({
    state: {},
    outputs: { level: yearIndex * 10, group: { inner: { value: yearIndex + 1 } } },
  }),
});

function run() {
  return runAutowired({ modules: [ramp], startYear: 2000, endYear: 2004 });
}

test('collectResults extracts a simple timeseries by source', () => {
  const { timeseries, years } = collectResults(run(), {
    timeseries: [{ source: 'level' }],
    metrics: [],
  });
  assert.deepStrictEqual(years, [2000, 2001, 2002, 2003, 2004]);
  assert.strictEqual(timeseries[0].level, 0);
  assert.strictEqual(timeseries[4].level, 40);
  assert.strictEqual(timeseries[0].year, 2000);
});

test('collectResults renames via `as` and reads nested via `path`', () => {
  const { timeseries } = collectResults(run(), {
    timeseries: [
      { source: 'level', as: 'scaled' },
      { source: 'group', as: 'innerValue', path: 'inner.value' },
    ],
    metrics: [],
  });
  assert.strictEqual(timeseries[2].scaled, 20);
  assert.strictEqual(timeseries[2].innerValue, 3);
});

test('collectResults supports a transform timeseries', () => {
  const { timeseries } = collectResults(run(), {
    timeseries: [{ source: 'level', as: 'plusYear', transform: (o, year) => o.level + year }],
    metrics: [],
  });
  assert.strictEqual(timeseries[1].plusYear, 10 + 2001);
});

test('resolveKey prefers `as`, else falls back to source', () => {
  assert.strictEqual(resolveKey({ source: 'level' }), 'level');
  assert.strictEqual(resolveKey({ source: 'level', as: 'scaled' }), 'scaled');
});

test('metric aggregators: last, max, min', () => {
  const { metrics } = collectResults(run(), {
    timeseries: [{ source: 'level' }],
    metrics: [
      { source: 'level', as: 'final', aggregator: 'last' },
      { source: 'level', as: 'hi', aggregator: 'max' },
      { source: 'level', as: 'lo', aggregator: 'min' },
    ],
  });
  assert.strictEqual(metrics.final, 40);
  assert.strictEqual(metrics.hi, 40);
  assert.strictEqual(metrics.lo, 0);
});

test('metric aggregator: first matching year', () => {
  const { metrics } = collectResults(run(), {
    timeseries: [{ source: 'level' }],
    metrics: [{ source: 'level', as: 'firstHigh', aggregator: { first: (v) => v >= 25 } }],
  });
  assert.strictEqual(metrics.firstHigh, 2003); // yearIndex 3 → level 30 ≥ 25
});

test('metric aggregator: peak returns value and year', () => {
  const { metrics } = collectResults(run(), {
    timeseries: [{ source: 'level' }],
    metrics: [{ source: 'level', as: 'peak', aggregator: { peak: true } }],
  });
  assert.deepStrictEqual(metrics.peak, { value: 40, year: 2004 });
});

test('max/min return undefined (not ±Infinity) on an all-non-numeric series', () => {
  const { metrics } = collectResults(run(), {
    // path resolves to nothing → every value undefined
    timeseries: [{ source: 'group', as: 'empty', path: 'nope.nope' }],
    metrics: [
      { source: 'empty', as: 'hi', aggregator: 'max' },
      { source: 'empty', as: 'lo', aggregator: 'min' },
      { source: 'empty', as: 'pk', aggregator: { peak: true } },
    ],
  });
  assert.strictEqual(metrics.hi, undefined);
  assert.strictEqual(metrics.lo, undefined);
  assert.strictEqual(metrics.pk, undefined);
});

test('a metric whose source is not a produced timeseries key throws', () => {
  assert.throws(
    () =>
      collectResults(run(), {
        timeseries: [{ source: 'level' }],
        metrics: [{ source: 'ghost', as: 'x', aggregator: 'last' }],
      }),
    /Metric 'x' reads timeseries key 'ghost' which no timeseries def produces/
  );
});

test('a metric referencing a renamed source gets a helpful hint', () => {
  assert.throws(
    () =>
      collectResults(run(), {
        timeseries: [{ source: 'level', as: 'renamed' }],
        metrics: [{ source: 'level', as: 'x', aggregator: 'last' }],
      }),
    /renamed via as: 'renamed'/
  );
});

test('a metric with neither source nor transform throws', () => {
  assert.throws(
    () =>
      collectResults(run(), {
        timeseries: [{ source: 'level' }],
        metrics: [{ as: 'ghost', aggregator: 'last' }],
      }),
    /Metric 'ghost' has neither a 'source' nor a 'transform'/
  );
});

test('max reduces without a stack overflow on a long series', () => {
  const N = 200000;
  const big = {
    years: Array.from({ length: N }, (_, i) => i),
    outputs: { m: { v: Array.from({ length: N }, (_, i) => i) } },
    states: { m: [] as any[] },
  };
  const { metrics } = collectResults(big, {
    timeseries: [{ source: 'v' }],
    metrics: [{ source: 'v', as: 'hi', aggregator: 'max' }],
  });
  assert.strictEqual(metrics.hi, N - 1);
});

test('metric aggregator: custom, and a transform-based metric', () => {
  const { metrics } = collectResults(run(), {
    timeseries: [{ source: 'level' }],
    metrics: [
      { source: 'level', as: 'sum', aggregator: { custom: (vals) => vals.reduce((a, b) => a + b, 0) } },
      { as: 'lastInner', transform: (o) => o.group.inner.value, aggregator: 'last' },
    ],
  });
  assert.strictEqual(metrics.sum, 0 + 10 + 20 + 30 + 40);
  assert.strictEqual(metrics.lastInner, 5);
});

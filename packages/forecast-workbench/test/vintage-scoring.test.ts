import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crpsFromSamples,
  diffObservationRelease,
  observationKeyId,
  rankedProbabilityScore,
  selectObservationsAsOf,
  weightedIntervalScore,
  type ForecastQuestion,
  type ObservationKey,
  type SourceRelease,
} from '../src/index.js';

const key: ObservationKey = {
  schemaVersion: 'forecast-workbench.observation-key/v1',
  datasetId: 'example',
  seriesId: 'count',
  geography: 'US',
  frequency: 'weekly',
  validPeriod: '2026-01-03',
  measure: 'people/week',
};

const firstRelease: SourceRelease = {
  schemaVersion: 'forecast-workbench.source-release/v1',
  id: 'release-1',
  sourceId: 'example',
  datasetId: 'example',
  availableAt: '2026-01-05T00:00:00.000Z',
  acquisitionReceiptId: 'acquisition-1',
  publicationTimeBasis: 'source',
};

test('observation releases distinguish first seen, revised, and withdrawn rows', () => {
  const first = diffObservationRelease({
    release: firstRelease,
    rows: [{ key, value: 10 }],
  });
  assert.equal(first[0].status, 'new');
  assert.equal(first[0].firstReleaseBasis, 'first-seen');
  const second = diffObservationRelease({
    release: { ...firstRelease, id: 'release-2', availableAt: '2026-01-12T00:00:00.000Z' },
    rows: [{ key, value: 12 }],
    previousByObservationKey: new Map([[observationKeyId(key), first[0]]]),
    completeReplacement: true,
  });
  assert.equal(second[0].status, 'revised');
  assert.equal(second[0].predecessorId, first[0].id);
  const beforeRevision = selectObservationsAsOf({
    versions: [...first, ...second],
    cutoffAt: '2026-01-10T00:00:00.000Z',
    profile: {
      sourceId: 'example',
      capability: 'true-vintage',
      description: 'Fixture source.',
    },
  });
  assert.equal(beforeRevision.get(observationKeyId(key))?.value, 10);
  const afterRevision = selectObservationsAsOf({
    versions: [...first, ...second],
    cutoffAt: '2026-01-20T00:00:00.000Z',
    profile: {
      sourceId: 'example',
      capability: 'true-vintage',
      description: 'Fixture source.',
    },
  });
  assert.equal(afterRevision.get(observationKeyId(key))?.value, 12);
  assert.throws(() => selectObservationsAsOf({
    versions: first,
    cutoffAt: '2025-01-01T00:00:00.000Z',
    profile: {
      sourceId: 'latest',
      capability: 'current-only',
      description: 'Latest-only fixture.',
      monitoringStartedAt: '2026-01-01T00:00:00.000Z',
    },
  }), /cannot support an as-of query/);
});

test('proper scoring conventions are deterministic', () => {
  assert.equal(rankedProbabilityScore({
    orderedOutcomeIds: ['a', 'b', 'c'],
    probabilities: { a: 0.2, b: 0.5, c: 0.3 },
    outcomeId: 'b',
    normalization: 'mean-boundaries',
  }), ((0.2 - 0) ** 2 + (0.7 - 1) ** 2) / 2);
  const wis = weightedIntervalScore({
    kind: 'quantiles',
    quantiles: [
      { probability: 0.025, value: 0 },
      { probability: 0.25, value: 5 },
      { probability: 0.5, value: 10 },
      { probability: 0.75, value: 15 },
      { probability: 0.975, value: 20 },
    ],
  }, 10);
  // Independently specified, not read back from the implementation. The grid
  // is symmetric about the median and the observation sits on it, so the
  // median term is 0, the 50% interval contributes 0.25 x 10 and the 95%
  // interval 0.025 x 20, over K + 1/2 = 2.5 for two intervals.
  // https://epiforecasts.io/scoringutils/reference/wis.html
  assert.equal(wis, 1.2);
  assert.equal(crpsFromSamples([10, 10, 10], 10), 0);
  assert.equal(crpsFromSamples([0, 1], 0), 0.25);
});

test('WIS divides by K + 1/2, and the superseded normalization still replays', () => {
  const prediction = {
    kind: 'quantiles' as const,
    quantiles: [
      { probability: 0.025, value: 0 },
      { probability: 0.25, value: 5 },
      { probability: 0.5, value: 10 },
      { probability: 0.75, value: 15 },
      { probability: 0.975, value: 20 },
    ],
  };
  assert.equal(weightedIntervalScore(prediction, 10), 1.2);
  // Scores recorded before the definition was corrected must still reproduce
  // the values they were recorded with.
  assert.equal(
    weightedIntervalScore(prediction, 10, undefined, 'weight-sum'),
    3.8709677419354835,
  );

  // One interval: K + 1/2 = 1.5.
  assert.equal(
    weightedIntervalScore(
      {
        kind: 'quantiles',
        quantiles: [
          { probability: 0.25, value: 5 },
          { probability: 0.5, value: 10 },
          { probability: 0.75, value: 15 },
        ],
      },
      10,
      [0.25, 0.5, 0.75],
    ),
    2.5 / 1.5,
  );
});

test('WIS rejects a grid that is not symmetric about the median', () => {
  assert.throws(
    () => weightedIntervalScore(
      {
        kind: 'quantiles',
        quantiles: [
          { probability: 0.25, value: 5 },
          { probability: 0.5, value: 10 },
          { probability: 0.9, value: 18 },
        ],
      },
      10,
      [0.25, 0.5, 0.9],
    ),
    /symmetric grid/,
  );
});

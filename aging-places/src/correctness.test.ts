import * as fs from 'node:fs';
import { expect, printSummary, test } from '../../src/test-utils.js';
import { selectZhviCandidate } from '../scripts/build-features.js';
import { parseCensusTablePayload } from '../scripts/fetch-census.js';
import { REPO_ROOT } from '../scripts/lib.js';
import { assertEpochColumns, loadEpoch } from './data.js';
import { COHORTS, Cohort } from './domain-types.js';
import {
  MODEL_FEATURES, ModelSpec, assertModelCompatible, buildMatrix,
} from './scoring.js';
import { impliedHouseholds, priceToIncomeCorrection } from './modules/market.js';

console.log('\n=== Aging Places Correctness Regression Tests ===\n');

test('cheap places receive no upward price-to-income correction', () => {
  const cheap = priceToIncomeCorrection(Math.log(50_000), 50_000, 3.6, 0.025, 0);
  const expensive = priceToIncomeCorrection(Math.log(500_000), 50_000, 3.6, 0.025, 0);
  const externallySupported = priceToIncomeCorrection(Math.log(500_000), 50_000, 3.6, 0.025, 1);
  expect(cheap).toBe(0);
  expect(expensive).toBeLessThan(0);
  expect(externallySupported).toBe(0);
});

test('same-name Zillow collisions require one county match', () => {
  const candidates = [
    ['Springfield', 'Greene County'],
    ['Springfield', 'Clark County'],
  ];
  expect(selectZhviCandidate(candidates, 'Clark County', 1)).toEqual(candidates[1]);
  expect(selectZhviCandidate(candidates, 'Wrong County', 1)).toBe(null);
  expect(selectZhviCandidate([candidates[0]], 'Wrong County', 1)).toEqual(candidates[0]);
});

test('missing prestigeVTI is imputed as null rather than propagating NaN', () => {
  const raw = Object.fromEntries(MODEL_FEATURES.map((feature) => [feature.name, 1]));
  delete raw.prestigeVTI;
  const matrix = buildMatrix([{
    geoid: '0100124', name: 'Test', state: 'AL', county: 'Henry County',
    lat: 0, lon: 0, pop: 1000, raw,
  }]);
  const index = MODEL_FEATURES.findIndex((feature) => feature.name === 'prestigeVTI');
  expect(matrix[0][index]).toBe(null);
});

test('epoch loader contract rejects missing feature columns', () => {
  expect(() => assertEpochColumns(['geoid', 'name', 'state', 'pop'], 'broken.csv'))
    .toThrow('missing required columns');
});

test('persisted model feature order and dimensions are enforced', () => {
  const features = MODEL_FEATURES.map((feature) => feature.name);
  const good: ModelSpec = {
    features,
    means: features.map(() => 0),
    sds: features.map(() => 1),
    logitW: new Array(features.length + 1).fill(0),
    linW: new Array(features.length + 1).fill(0),
    threshold: 0.5,
    preprocessing: 'epoch_zscore',
    meta: {},
  };
  assertModelCompatible(good);
  expect(() => assertModelCompatible({ ...good, features: [...features].reverse() }))
    .toThrow('feature contract mismatch');
});

test('Census API error payloads fail validation before caching', () => {
  const valid = parseCensusTablePayload(
    JSON.stringify({ response: { data: [['GEO_ID'], ['1600000US0100124']] } }),
    'table', '01'
  );
  expect(valid.rows).toHaveLength(1);
  expect(() => parseCensusTablePayload(
    JSON.stringify({ error: 'temporary upstream response' }), 'table', '01'
  )).toThrow('no data');
});

test('loader preserves leading-zero GEOIDs and custom headship anchoring', () => {
  const custom: Record<Cohort, number> = {
    a0_19: 0, a20_24: 0.2, a25_44: 0.4, a45_64: 0.7, a65up: 0.8,
  };
  const { statics, raw } = loadEpoch('features2023.csv', 10_000, custom);
  expect(raw.geoid[0]).toBe(statics.geoid[0]);
  expect(String(raw.geoid[0]).length).toBe(7);
  let checked = 0;
  for (let i = 0; i < statics.n && checked < 100; i++) {
    if (statics.occupiedUnits0[i] <= 0) continue;
    const cohorts = {} as Record<Cohort, number>;
    for (const cohort of COHORTS) cohorts[cohort] = statics.cohorts0[cohort][i];
    expect(impliedHouseholds(cohorts, custom, statics.headshipScale[i]))
      .toBeCloseTo(statics.occupiedUnits0[i], 7);
    checked++;
  }
  expect(checked).toBeGreaterThan(50);
});

test('repository paths are decoded filesystem paths', () => {
  expect(fs.existsSync(REPO_ROOT)).toBeTrue();
  expect(REPO_ROOT.endsWith('aging-places')).toBeTrue();
});

printSummary();

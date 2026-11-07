/**
 * Seed-year discontinuity detection.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSeedYearKinks, scoreSeedYear } from '../src/seed-year.js';

const linear = [100, 103, 106, 109, 112, 115];
const accelerating = [100, 101, 103, 106, 110, 115];
const noisy = [100, 103.5, 105.5, 109.5, 111.5, 115];
// The shape of a phantom first-year recession: -5.5%, then ~+3%/yr
const phantomRecession = [158, 149.3, 153.8, 158.4, 163.2, 168.1];
// A flow seeded at a value its own dynamics never produce
const badSeed = [28, -4.03, -4.02, -4.02, -4.02, -3.48];

test('smooth, accelerating and noisy paths are not flagged', () => {
  const kinks = findSeedYearKinks({ linear, accelerating, noisy });
  assert.deepEqual(kinks, []);
});

test('a first step off the later path is flagged, worst first', () => {
  const kinks = findSeedYearKinks({ linear, phantomRecession, badSeed });
  assert.deepEqual(kinks.map((k) => k.name), ['badSeed', 'phantomRecession']);
  assert.ok(kinks[1].score > 0.05);
  assert.ok(kinks[1].firstChange < 0 && kinks[1].laterMeanChange > 0);
});

test('a start offset examines a series from step 1', () => {
  // A growth rate is 0 at the seed step by definition; examined from step 1
  // it is smooth, examined from step 0 it would look like a jump.
  const growthRate = [0, 0.019, 0.0207, 0.021, 0.0222, 0.0232, 0.0241];
  assert.equal(findSeedYearKinks({ growthRate }).length, 1);
  assert.equal(findSeedYearKinks({ growthRate }, { startOffsets: { growthRate: 1 } }).length, 0);
});

test('series too short, non-finite or all zero are skipped, not flagged', () => {
  assert.equal(scoreSeedYear([1, 2, 3]), undefined);
  assert.equal(scoreSeedYear([1, Number.NaN, 3, 4, 5, 6]), undefined);
  assert.equal(scoreSeedYear([0, 0, 0, 0, 0, 0])?.score, 0);
});

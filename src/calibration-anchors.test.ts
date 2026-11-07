/**
 * 2025 Magnitude Anchor Tests
 *
 * Every anchor holds at the default calibration, and an error of the size
 * this project's history actually shipped (a unit slip in an intensity, a
 * fuel-scale quantity read as electricity) takes the matching anchor out of
 * its band on the first simulated year.
 */

import { MAGNITUDE_ANCHORS, readAnchors } from './calibration-anchors.js';
import { REGIONS } from './domain-types.js';
import { demandDefaults } from './modules/demand.js';
import { test, expect, printSummary } from './test-utils.js';

const failing = (readings: ReturnType<typeof readAnchors>) =>
  readings.filter((reading) => !reading.within).map((reading) => reading.anchor.name);

test('every 2025 output sits within its anchor band', () => {
  const readings = readAnchors();
  for (const reading of readings) {
    if (!reading.within) {
      console.log(`    ${reading.anchor.name}: model ${reading.model} vs ${reading.anchor.observed} (x${reading.anchor.factor})`);
    }
  }
  expect(failing(readings).join(', ')).toBe('');
});

test('each anchor states a source and a band that can fail', () => {
  for (const anchor of MAGNITUDE_ANCHORS) {
    expect(anchor.source.length > 10).toBeTrue();
    expect(anchor.factor > 1 && anchor.factor <= 1.5).toBeTrue();
  }
});

test('a unit slip in a mineral intensity breaks the copper anchor', () => {
  // The shape of 6adfe5b (183x) and da37e79 (~1000x): kg where t was meant.
  // Limit: the transition stream is ~2 Mt of ~23, so a slip that makes it
  // SMALLER (da37e79's battery copper was 1000x too low) moves the world
  // total by under 10% and stays inside the band. Anchors on totals catch
  // inflating slips; a deflating one needs an anchor on its own stream.
  const readings = readAnchors({
    resources: { minerals: { copper: { perMW_solar: 2800 * 1000 } } } as any,
  });
  expect(failing(readings).includes('primary copper demand')).toBeTrue();
});

test('fuel-scale energy read as electricity breaks the energy anchors', () => {
  // The shape of 4e7d739 (~3.5x): every region's final-energy intensity inflated
  const regions = Object.fromEntries(REGIONS.map((region) =>
    [region, { energyIntensity: demandDefaults.regions[region].energyIntensity * 3.5 }]));
  const failed = failing(readAnchors({ demand: { regions } as any }));
  expect(failed.includes('total final energy')).toBeTrue();
});

printSummary();

/**
 * Seed-Year Continuity Tests
 *
 * The model starts from observed 2025 data, so the first simulated step
 * should sit on the path the next few steps describe. Several fixes in this
 * project's history were first-step artifacts that then shifted every later
 * level: a phantom -5.5% recession in 2026 from hand-guessed lag initials
 * (19ca9a5), a fuel-mix logit whose fixed point was not the observed 2025 mix
 * (cf31149), and idle fossil read at nameplate so the solar build hit its
 * factory cap in year one (13a142e).
 *
 * Every published numeric output is checked (tsimulation's
 * findSeedYearKinks). A new discontinuity fails; known ones are listed below
 * by name, and an entry that stops flagging also fails, so the list can only
 * shrink by fixing what it names. Outputs clipped at zero are probed through
 * the quantity they clip.
 */

import { findSeedYearKinks } from 'tsimulation';
import { runSimulation } from './simulation.js';
import { test, expect, printSummary } from './test-utils.js';

/** Outputs whose seed-year value is defined differently; examined from step 1. */
const SEED_DEFINED: Record<string, string> = {
  productionFunctionGap: 'zero at the anchor year by construction',
  humanCapitalLifeRevaluation: 'the seed year has no prior schedule to revalue',
  capitalGrowthRate: 'defined from the second year (needs a previous stock)',
  usefulWorkGrowthRate: 'defined from the second year (needs a previous level)',
};

/**
 * First-step discontinuities present today. Each is a lead to investigate,
 * not an accepted behavior. Empty since the seed-year fixes of 2026-11; add an
 * entry only with what it was traced to.
 */
const KNOWN_SEED_YEAR_ARTIFACTS: Record<string, string> = {};

/**
 * Outputs that are max(0, x) of a quantity x that is examined instead. A
 * clipped series that crosses zero in the window flags however smooth x is,
 * so the probe reads x (the underlying path) and checks the clip still holds.
 */
const CLIPPED: Record<string, {
  reason: string;
  underlying: (s: Record<string, number[]>) => number[];
}> = {
  aggregateCapitalFundingGap: {
    reason: 'max(0, desired - actual capital formation) at 2% desired net growth: positive '
      + 'exactly when capital grows below 2%/yr, which it does in 2025 (1.98%) and not after',
    // Capital growth over each year: closing (next year's opening) / opening
    underlying: (s) => s.capitalStock.slice(1).map((k, i) => k / s.capitalStock[i] - 1),
  },
};

const { results } = runSimulation({ endYear: 2031 }, { paramLiveness: 'off' });
const series: Record<string, number[]> = {};
for (const key of Object.keys(results[0])) {
  if (key === 'year' || typeof (results[0] as unknown as Record<string, unknown>)[key] !== 'number') continue;
  series[key] = results.map((row) => (row as unknown as Record<string, number>)[key]);
}
for (const [name, { underlying }] of Object.entries(CLIPPED)) {
  series[`${name}:underlying`] = underlying(series);
}
const clippedSeries = Object.fromEntries(Object.keys(CLIPPED).map((name) => [name, series[name]]));
for (const name of Object.keys(CLIPPED)) delete series[name];
const startOffsets = Object.fromEntries(Object.keys(SEED_DEFINED).map((name) => [name, 1]));
// Identity residuals (national accounts, ledgers) are zero up to round-off
const kinks = findSeedYearKinks(series, { startOffsets, absoluteTolerance: 1e-9 });
const flagged = new Set(kinks.map((kink) => kink.name));

test('the probe covers the published outputs', () => {
  expect(Object.keys(series).length > 150).toBeTrue();
  for (const name of [...Object.keys(SEED_DEFINED), ...Object.keys(KNOWN_SEED_YEAR_ARTIFACTS)]) {
    expect(name in series).toBeTrue();
  }
  for (const name of Object.keys(CLIPPED)) {
    expect(name in clippedSeries && `${name}:underlying` in series).toBeTrue();
    // Shorter than the detector's window (trendSteps + 2) is skipped silently
    expect(series[`${name}:underlying`].length >= 6).toBeTrue();
  }
});

test('a clipped output is still clipped in the window (else probe it directly)', () => {
  for (const values of Object.values(clippedSeries)) {
    expect(Math.min(...values)).toBe(0);
  }
});

test('no new first-step discontinuity', () => {
  const unexpected = kinks.filter((kink) => !(kink.name in KNOWN_SEED_YEAR_ARTIFACTS));
  for (const kink of unexpected) {
    console.log(`    ${kink.name} (score ${kink.score.toFixed(3)}): ${kink.window.map((v) => v.toPrecision(4)).join(' ')}`);
  }
  expect(unexpected.map((kink) => kink.name).join(', ')).toBe('');
});

test('every listed artifact is still present (remove an entry once it is fixed)', () => {
  const fixed = Object.keys(KNOWN_SEED_YEAR_ARTIFACTS).filter((name) => !flagged.has(name));
  expect(fixed.join(', ')).toBe('');
});

test('GDP opens on its own path (the phantom 2026 recession stays fixed)', () => {
  expect(flagged.has('gdp')).toBe(false);
  expect(series.gdp[1] > series.gdp[0]).toBeTrue();
});

printSummary();

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
import { runSimulation, type YearResult } from './simulation.js';
import { extractTimeSeries } from './helpers.js';
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
 * not an accepted behavior. Add an entry only with what it was traced to.
 */
const CREDIT_GAP_STEP =
  'investment credit demand less the lending envelope runs $1.03T, then 0.79, 0.69, 0.54, '
  + '0.39, 0.25: the first step falls 0.25 where later steps fall 0.10-0.15. Present under the '
  + 'old 0.25/0.15/0.55 weights too (1.05, 0.78, 0.64, 0.44, 0.22) and at $15B/GW datacenter '
  + 'capital (0.67, 0.44, 0.29, 0.10); it was hidden while the gap crossed zero in the window '
  + '(the clipped-series rule). 2025 credit demand sits a step above its path; not yet traced';
const KNOWN_SEED_YEAR_ARTIFACTS: Record<string, string> = {
  unfundedCreditDemand: CREDIT_GAP_STEP,
  unfundedInvestmentDemand: CREDIT_GAP_STEP,
  unfundedFinancingDemand: CREDIT_GAP_STEP,
};

/**
 * Outputs that are max(0, x) of a quantity x that is probed instead. A
 * clipped series that reaches zero inside the window flags however smooth x
 * is, so the probe reads x and checks the output is still clipped there (an
 * entry cannot outlive its reason).
 */
type Series = Record<string, number[]>;
/**
 * Empty today. The credit-gap outputs (unfundedCreditDemand,
 * unfundedInvestmentDemand, unfundedFinancingDemand, leverageRecapBorrowing)
 * were listed while credit demand crossed the lending envelope in 2027; on
 * the constant-returns path with $45B/GW datacenter capital it stays above
 * the envelope through the window, so they are no longer clipped there and
 * are probed directly.
 */
const CLIPPED: Record<string, { reason: string; underlying: (s: Series) => number[] }> = {};

const run = runSimulation({ endYear: 2031 }, { paramLiveness: 'off' });
const numericFields = (Object.keys(run.results[0]) as (keyof YearResult)[])
  .filter((key) => key !== 'year' && typeof run.results[0][key] === 'number');
const series = Object.fromEntries(numericFields.map((key) => [key, extractTimeSeries(run, key).values]));
const clippedSeries = Object.fromEntries(Object.keys(CLIPPED).map((name) => [name, series[name]]));
for (const [name, { underlying }] of Object.entries(CLIPPED)) series[`${name}:underlying`] = underlying(series);
for (const name of Object.keys(CLIPPED)) delete series[name];
const startOffsets = Object.fromEntries(Object.keys(SEED_DEFINED).map((name) => [name, 1]));
const kinks = findSeedYearKinks(series, { startOffsets });
const flagged = new Set(kinks.map((kink) => kink.name));

test('the probe covers the published outputs', () => {
  expect(Object.keys(series).length > 150).toBeTrue();
  for (const name of [...Object.keys(SEED_DEFINED), ...Object.keys(KNOWN_SEED_YEAR_ARTIFACTS)]) {
    expect(name in series).toBeTrue();
  }
  for (const name of Object.keys(CLIPPED)) {
    // Shorter than the detector's window (trendSteps + 2) would be skipped silently
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

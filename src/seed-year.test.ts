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
 * shrink by fixing what it names.
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
const UNFUNDED_CLIPPED = '0.44 -> 0.20 -> 0 $T: a clipped smooth decline, not a seed jump';
const KNOWN_SEED_YEAR_ARTIFACTS: Record<string, string> = {
  curtailmentTWh:
    'all China: +349, +541, +618, +675, +550 TWh steps, the S-shaped onset of dispatch\'s '
    + 'quadratic curtailment penalty with 2025 just past it; trend-seeding the lagged '
    + 'curtailment rate leaves the shape unchanged. Not a seed effect as far as traced. The '
    + 'level is the lead: China curtails 16% of VRE in 2026 and 35% by 2028 (4% in 2025)',
  // max(0, credit demand - lending envelope): 0.44, 0.20, 0 from 2027 as the
  // unclipped gap falls smoothly through zero (-0.08, -0.38, -0.73)
  unfundedInvestmentDemand: UNFUNDED_CLIPPED,
  unfundedFinancingDemand: UNFUNDED_CLIPPED,
  unfundedCreditDemand: UNFUNDED_CLIPPED,
};

const run = runSimulation({ endYear: 2031 }, { paramLiveness: 'off' });
const numericFields = (Object.keys(run.results[0]) as (keyof YearResult)[])
  .filter((key) => key !== 'year' && typeof run.results[0][key] === 'number');
const series = Object.fromEntries(numericFields.map((key) => [key, extractTimeSeries(run, key).values]));
const startOffsets = Object.fromEntries(Object.keys(SEED_DEFINED).map((name) => [name, 1]));
const kinks = findSeedYearKinks(series, { startOffsets });
const flagged = new Set(kinks.map((kink) => kink.name));

test('the probe covers the published outputs', () => {
  expect(Object.keys(series).length > 150).toBeTrue();
  for (const name of [...Object.keys(SEED_DEFINED), ...Object.keys(KNOWN_SEED_YEAR_ARTIFACTS)]) {
    expect(name in series).toBeTrue();
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

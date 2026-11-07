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
 * findSeedYearKinks). A new discontinuity fails; the ones present today are
 * listed below by name, and an entry that stops flagging also fails, so the
 * list can only shrink by fixing what it names.
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
 * not an accepted behavior.
 */
const KNOWN_SEED_YEAR_ARTIFACTS: Record<string, string> = {
  usefulWorkGrowthRate: 'useful work per worker falls 0.5% in 2026, then grows 0.4-1%/yr',
  shortfall: 'unserved generation halves in 2026 (231 -> 115 TWh) and then resumes rising',
  miningEnergyTWh: 'dips in 2026 (238 -> 177 TWh) and recovers: the 2026 build is smaller than 2025 and 2027',
  energySystemOverhead: 'dips in 2026 (2,036 -> 1,737 TWh), carrying the mining-energy dip',
  unfundedInvestmentDemand: 'flat in 2026, then rising ~0.3-0.5 $T/yr',
  unfundedFinancingDemand: 'flat in 2026, then rising ~0.3-0.5 $T/yr',
  unfundedCreditDemand: 'flat in 2026, then rising ~0.3-0.5 $T/yr',
  curtailmentTWh: 'rises half as fast in 2026 as in each later year',
  debtRiskPremium: 'rises in 2026, then falls every year after',
  aggregateCapitalFundingGap: 'diagnostic ledger: 0.08 -> 0.29 $T in 2026, then zero',
};

const { results } = runSimulation({ endYear: 2031 }, { paramLiveness: 'off' });
const series: Record<string, number[]> = {};
for (const key of Object.keys(results[0])) {
  if (key === 'year' || typeof (results[0] as unknown as Record<string, unknown>)[key] !== 'number') continue;
  series[key] = results.map((row) => (row as unknown as Record<string, number>)[key]);
}
const startOffsets = Object.fromEntries(Object.keys(SEED_DEFINED).map((name) => [name, 1]));
// Identity residuals (national accounts, ledgers) are zero up to round-off
const kinks = findSeedYearKinks(series, { startOffsets, absoluteTolerance: 1e-9 });
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

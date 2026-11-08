/**
 * Regional perturbation tests
 *
 * A small nudge to one region's output must produce a proportionate response
 * elsewhere. Overlays feed the main model small regional output levels
 * (scripts/ai-offshoring/ through `regionalOutputAdjustments`, the Hormuz
 * bridge through `commodityShocks.regionalOutputFactors`), so their regional
 * readouts are only as good as this.
 *
 * The bug these pin: demand priced regional fuel on two code paths. A year
 * with no commodityShocks entry billed the fossil-stock lock-in fuel to no
 * region; a year with ANY entry (even a no-op) billed each region its share.
 * SSA's energy burden sits above the burden-damage threshold, so the path
 * switch alone moved its GDP -0.65% by 2048 under a 0.01% US nudge.
 */

import { runSimulation } from './simulation.js';
import { REGIONS, type Region } from './domain-types.js';
import { test, expect, printSummary } from './test-utils.js';

const END_YEAR = 2100;
const FAST = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;

function everyYear(regionalOutputFactors: Partial<Record<Region, number>>) {
  const shocks = [];
  for (let year = 2026; year <= END_YEAR; year++) shocks.push({ year, regionalOutputFactors });
  return shocks;
}

function run(commodityShocks: ReturnType<typeof everyYear>) {
  return runSimulation(
    { startYear: 2025, endYear: END_YEAR, demand: { commodityShocks } },
    FAST,
  );
}

const baseline = run([]);

test('a no-op commodity shock in every year is bit-identical to none', () => {
  const noOp = run(everyYear({ us: 1 }));
  for (let index = 0; index < baseline.results.length; index++) {
    const a = baseline.results[index];
    const b = noOp.results[index];
    expect(Object.is(b.gdp, a.gdp)).toBeTrue();
    expect(Object.is(b.energyBurden, a.energyBurden)).toBeTrue();
    for (const region of REGIONS) {
      expect(Object.is(b.regionalGdp[region], a.regionalGdp[region])).toBeTrue();
    }
  }
});

test('a 0.01% output nudge in one region moves every other region by < 0.05%', () => {
  // Measured after the fix: the US nudge moves the others ~-0.001% (their
  // share of the normalization to world GDP), at most 0.003% through 2100
  // for any perturbed region. Before, SSA moved -0.65% and China -0.08%.
  const nudged = run(everyYear({ us: 1.0001 }));
  let worst = 0;
  for (let index = 0; index < baseline.results.length; index++) {
    for (const region of REGIONS) {
      if (region === 'us') continue;
      const change = Math.abs(
        nudged.results[index].regionalGdp[region] / baseline.results[index].regionalGdp[region] - 1,
      );
      worst = Math.max(worst, change);
    }
  }
  expect(worst).toBeLessThan(0.0005);
});

test('regionalOutputAdjustments and commodityShocks regional factors give the same regional GDP', () => {
  // Since fuel costing no longer depends on whether a year has a shock
  // record, the two routes to a regional output level differ only in where
  // the factor enters the allocator; for in-range factors they agree.
  const viaHook = (factors: Partial<Record<Region, number>>[], years: number[]) => runSimulation(
    { startYear: 2025, endYear: END_YEAR, demand: { regionalOutputAdjustments: years.map((year, k) => ({ year, factors: factors[k] })) } },
    FAST,
  );
  const viaShock = (factors: Partial<Record<Region, number>>[], years: number[]) => run(
    years.map((year, k) => ({ year, regionalOutputFactors: factors[k] })),
  );
  const years = Array.from({ length: END_YEAR - 2025 }, (_, k) => 2026 + k);
  // A held nudge, and a sparse time-varying path
  const cases: [Partial<Record<Region, number>>[], number[]][] = [
    [years.map(() => ({ ssa: 1.0001 })), years],
    [[{ india: 0.98 }, { india: 0.95 }, { india: 1.02 }], [2030, 2031, 2060]],
  ];
  for (const [factors, ys] of cases) {
    const a = viaHook(factors, ys);
    const b = viaShock(factors, ys);
    let worst = 0;
    for (let index = 0; index < a.results.length; index++) {
      for (const region of REGIONS) {
        worst = Math.max(worst, Math.abs(a.results[index].regionalGdp[region] / b.results[index].regionalGdp[region] - 1));
      }
    }
    expect(worst).toBeLessThan(1e-9);
  }
});

printSummary();

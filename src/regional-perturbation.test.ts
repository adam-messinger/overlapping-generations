/**
 * Regional perturbation tests
 *
 * A small nudge to one region's output must produce a proportionate response
 * elsewhere. Overlays (scripts/ai-offshoring/, the Hormuz shock) feed the main
 * model small `commodityShocks.regionalOutputFactors`, so their regional
 * readouts are only as good as this.
 *
 * The bug these pin: demand priced regional fuel on two code paths. A year
 * with no commodityShocks entry billed the fossil-stock lock-in fuel to no
 * region; a year with ANY entry (even a no-op) billed each region its share.
 * SSA's energy burden sits above the burden-damage threshold, so the path
 * switch alone moved its GDP -0.65% by 2048 under a 0.01% US nudge.
 */

import { runSimulation } from './simulation.js';
import { STUDY_OPTIONS } from './ensemble-model.js';
import type { AnnualCommodityShock } from './modules/demand.js';
import { REGIONS, type Region } from './domain-types.js';
import { test, expect, printSummary, numericLeaves, differingLeaves } from './test-utils.js';

const END_YEAR = 2100;

function everyYear(regionalOutputFactors: Partial<Record<Region, number>>): AnnualCommodityShock[] {
  const shocks: AnnualCommodityShock[] = [];
  for (let year = 2026; year <= END_YEAR; year++) shocks.push({ year, regionalOutputFactors });
  return shocks;
}

function run(commodityShocks: AnnualCommodityShock[]) {
  return runSimulation(
    { startYear: 2025, endYear: END_YEAR, demand: { commodityShocks } },
    STUDY_OPTIONS,
  );
}

function leaves(result: ReturnType<typeof run>): Map<string, number> {
  const into = new Map<string, number>();
  numericLeaves(result.results, 'results', into);
  numericLeaves(result.metrics, 'metrics', into);
  return into;
}

const baseline = run([]);

test('a no-op commodity shock in every year is bit-identical to none', () => {
  const expected = leaves(baseline);
  const actual = leaves(run(everyYear({ us: 1 })));
  expect(actual.size).toBe(expected.size);
  expect(differingLeaves(expected, actual)).toEqual([]);
});

test('a 0.01% output nudge in one region moves every other region by < 0.05%', () => {
  // The others move ~-0.001%: their share of the renormalization to world
  // GDP (at most 0.003% through 2100 for any perturbed region).
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

printSummary();

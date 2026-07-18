/**
 * Hierarchy-top diagnostic (the Milano lesson, tested on US data).
 *
 * Italy showed the demographic-attraction core inverts at the top of
 * winner-take-all metro hierarchies (Milano predicted 67/93 in its basin,
 * realized #1). This diagnostic asks whether the same failure exists in the
 * US 2000-2025 within-market surface, and whether zeroing the demographic
 * attraction terms (regen + vitality) — globally, or only for each commuting
 * zone's largest place — helps or hurts the validated equal-zone metric.
 *
 * Development-window diagnostic on the same exact common sample as
 * market-backtest.ts (cz2000, lagged 1990-2000 population comparator).
 * Not a new validation claim.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR } from './lib.js';
import { loadFeatureRows } from './backtest.js';
import { loadPlaceMarkets } from './market-backtest.js';
import { runAgingSim } from '../src/simulation.js';
import { bootstrapDifference, evaluateLocal, spearman } from '../japan/src/validation.js';

const MIN_PLACES = 5;

function main(): void {
  const rows = loadFeatureRows('features2000.csv').filter(
    (row) => row.raw.logGrowth00_25 !== null && row.pop >= 1000,
  );
  const markets = loadPlaceMarkets();
  // Exact primary common sample from market-backtest: cz2000 + lagged trend.
  const sample = rows.flatMap((row) => {
    const market = markets.get(row.geoid);
    if (!market?.cz2000 || market.laggedLogPopGrowth90_00 === null) return [];
    return [{
      geoid: row.geoid, name: row.name, state: row.state, pop: row.pop,
      zone: market.cz2000, lagged: market.laggedLogPopGrowth90_00,
      outcome: row.raw.logGrowth00_25 as number,
    }];
  });
  const byZone = new Map<string, typeof sample>();
  for (const unit of sample) {
    const list = byZone.get(unit.zone) ?? [];
    list.push(unit);
    byZone.set(unit.zone, list);
  }
  const primaryByZone = new Map<string, string>(
    [...byZone.entries()].map(([zone, list]) => [zone, list.reduce((a, b) => (b.pop > a.pop ? b : a)).geoid]),
  );
  const primaryGeoids = new Set(primaryByZone.values());
  console.log(`sample: ${sample.length} places, ${byZone.size} zones, ${primaryGeoids.size} zone primaries`);

  const base = runAgingSim({ epoch: '2000', years: 25, minPop: 1000 });
  const mask = new Float64Array(base.data.statics.n).fill(1);
  base.data.statics.geoid.forEach((geoid, i) => {
    if (primaryGeoids.has(geoid)) mask[i] = 0;
  });
  const variants: [string, ReturnType<typeof runAgingSim>][] = [
    ['mechanism', base],
    ['demoZeroGlobal', runAgingSim({
      epoch: '2000', years: 25, minPop: 1000,
      params: { attraction: { wRegen: 0, wVitality: 0 } },
    })],
    ['demoZeroAtZonePrimary', runAgingSim({
      epoch: '2000', years: 25, minPop: 1000,
      params: { attraction: { demographicAttractionMultiplier: mask } },
    })],
  ];
  const scores: Record<string, (u: typeof sample[number]) => number> = {
    laggedTrend: (u) => u.lagged,
  };
  for (const [label, run] of variants) {
    const byGeoid = new Map<string, number>();
    run.data.statics.geoid.forEach((geoid, i) => byGeoid.set(geoid, run.simRealLogGrowth[i]));
    scores[label] = (u) => byGeoid.get(u.geoid) ?? NaN;
  }
  const evaluations = new Map<string, ReturnType<typeof evaluateLocal>>();
  for (const [label, score] of Object.entries(scores)) {
    evaluations.set(label, evaluateLocal(
      sample.map((u) => ({ market: u.zone, score: score(u), outcome: u.outcome })), MIN_PLACES,
    ));
  }

  // Milano statistic: each zone primary's within-zone percentile, predicted vs
  // realized, over zones with >= 10 sample places; big-zone subset = top 30 by
  // sample population.
  const zones10 = [...byZone.entries()].filter(([, list]) => list.length >= 10);
  const zonePop = (list: typeof sample): number => list.reduce((s, u) => s + u.pop, 0);
  const big = new Set(
    [...zones10].sort((a, b) => zonePop(b[1]) - zonePop(a[1])).slice(0, 30).map(([zone]) => zone),
  );
  const pctl = (list: typeof sample, target: string, value: (u: typeof sample[number]) => number): number => {
    const v = value(list.find((u) => u.geoid === target)!);
    return list.filter((u) => value(u) < v).length / (list.length - 1);
  };
  const primaryStats = (label: string, subset: (zone: string) => boolean): Record<string, unknown> => {
    const score = scores[label];
    const predicted: number[] = []; const realized: number[] = [];
    let inversions = 0;
    for (const [zone, list] of zones10) {
      if (!subset(zone)) continue;
      const primary = primaryByZone.get(zone)!;
      const p = pctl(list, primary, score);
      const r = pctl(list, primary, (u) => u.outcome);
      predicted.push(p); realized.push(r);
      if (p < 0.5 && r >= 1 - 3 / list.length) inversions += 1; // predicted bottom half, realized top 3
    }
    const mean = (v: number[]): number => +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(3);
    const crossZone = spearman(predicted, realized);
    return {
      zones: predicted.length,
      meanPredictedPctl: mean(predicted),
      meanRealizedPctl: mean(realized),
      crossZoneSpearman: Number.isFinite(crossZone) ? +crossZone.toFixed(3) : null,
      milanoInversions: inversions,
    };
  };

  const report = {
    scope: 'development-window diagnostic on the market-backtest cz2000 common sample; not validation',
    sample: { places: sample.length, zones: byZone.size, zonesWith10: zones10.length },
    equalZoneSpearman: Object.fromEntries(
      [...evaluations.entries()].map(([label, ev]) => [label, ev.metrics]),
    ),
    differences: {
      demoZeroGlobalMinusMechanism: bootstrapDifference(
        evaluations.get('demoZeroGlobal')!.spearmanByMarket, evaluations.get('mechanism')!.spearmanByMarket,
      ),
      demoZeroAtZonePrimaryMinusMechanism: bootstrapDifference(
        evaluations.get('demoZeroAtZonePrimary')!.spearmanByMarket, evaluations.get('mechanism')!.spearmanByMarket,
      ),
      mechanismMinusLagged: bootstrapDifference(
        evaluations.get('mechanism')!.spearmanByMarket, evaluations.get('laggedTrend')!.spearmanByMarket,
      ),
      demoZeroAtZonePrimaryMinusLagged: bootstrapDifference(
        evaluations.get('demoZeroAtZonePrimary')!.spearmanByMarket, evaluations.get('laggedTrend')!.spearmanByMarket,
      ),
    },
    zonePrimaryStats: Object.fromEntries(Object.keys(scores).map((label) => [label, {
      allZones10: primaryStats(label, () => true),
      thirtyLargestZones: primaryStats(label, (zone) => big.has(zone)),
    }])),
  };
  fs.writeFileSync(path.join(DATA_DIR, 'hierarchy-top-diagnostic.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
}

main();

/**
 * Step 4 — scenario ensemble and per-place uncertainty bands.
 *
 * The mechanism is scenario tooling (BACKTEST.md); this makes the scenarios
 * explicit. Full factorial over the four documented fragility axes:
 *   immigration   nation.netImmigrationLongRun   0.6M / 1.2M / 1.8M per yr
 *   gateway       attraction.wGateway            0.05 (rerouted) / 0.10
 *   amenity       attraction.rAmenity            0.25 (climate/insurance
 *                 repricing of second-home demand) / 0.45
 *   institutions  attraction.universityThroughputAnnualRetention
 *                 0.985 with floor 0.5 (secular enrollment decline) / 1.0
 *   concentration attraction.concentrationSensitivity  0 (current-regime
 *                 allocation) / 1 (old-regime: demographic->institutional
 *                 weight shift as simulated working-age growth declines,
 *                 the Japan/Italy pattern; endogenous to the immigration
 *                 axis because the dial reads simulated national growth)
 * 48 runs of the 2025-2065 simulation. Per place: percentile of real log
 * price growth within each run's universe -> band [min,max], base percentile,
 * per-axis mean absolute percentile shift, dominant axis, a signed
 * `concentrationShift` (mean old-regime minus current-regime percentile), and
 * a `scenarioRobust` flag (band width <= 0.15).
 *
 * These are NOT probability intervals — no distribution over scenarios is
 * asserted. They answer: which places' relative standing survives every
 * combination of the known fragilities, and which places' standing is a bet
 * on one axis.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, OUT_DIR, ensureDirs, writeCsv } from './lib.js';
import { runAgingSim } from '../src/simulation.js';

const AXES = {
  immigration: [
    { level: 'low', params: { nation: { netImmigrationLongRun: 0.6e6 } } },
    { level: 'base', params: { nation: {} } },
    { level: 'high', params: { nation: { netImmigrationLongRun: 1.8e6 } } },
  ],
  gateway: [
    { level: 'rerouted', params: { attraction: { wGateway: 0.05 } } },
    { level: 'base', params: { attraction: {} } },
  ],
  amenity: [
    { level: 'repriced', params: { attraction: { rAmenity: 0.25 } } },
    { level: 'base', params: { attraction: {} } },
  ],
  institutions: [
    { level: 'declining', params: { attraction: { universityThroughputAnnualRetention: 0.985, universityThroughputFloor: 0.5 } } },
    { level: 'base', params: { attraction: {} } },
  ],
  concentration: [
    { level: 'old-regime', params: { attraction: { concentrationSensitivity: 1 } } },
    { level: 'base', params: { attraction: {} } },
  ],
} as const;

type AxisName = keyof typeof AXES;
const AXIS_NAMES = Object.keys(AXES) as AxisName[];

function percentiles(values: Float64Array): Float64Array {
  const order = [...values.keys()].sort((a, b) => values[a] - values[b]);
  const out = new Float64Array(values.length);
  order.forEach((originalIndex, rank) => {
    out[originalIndex] = values.length > 1 ? rank / (values.length - 1) : 0.5;
  });
  return out;
}

function merge(a: Record<string, Record<string, unknown>>, b: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = { ...a };
  for (const [module, params] of Object.entries(b)) {
    out[module] = { ...(out[module] ?? {}), ...params };
  }
  return out;
}

interface Run {
  key: string;
  levels: Record<AxisName, string>;
  params: Record<string, Record<string, unknown>>;
}

function main(): void {
  ensureDirs();
  // Full factorial over AXES: fold each axis into the grid (last axis varies
  // fastest), so adding an axis is a one-line edit to AXES.
  let grid: Omit<Run, 'key'>[] = [{ levels: {} as Record<AxisName, string>, params: {} }];
  for (const axis of AXIS_NAMES) {
    grid = grid.flatMap((partial) => AXES[axis].map((spec) => ({
      levels: { ...partial.levels, [axis]: spec.level },
      params: merge(partial.params, spec.params as Record<string, Record<string, unknown>>),
    })));
  }
  const runs: Run[] = grid.map((entry) => ({
    key: AXIS_NAMES.map((axis) => entry.levels[axis]).join('|'),
    ...entry,
  }));

  let geoid: string[] = [];
  let names: string[] = [];
  let states: string[] = [];
  let pops: Float64Array = new Float64Array(0);
  const pctByRun = new Map<string, Float64Array>();
  for (const run of runs) {
    const started = Date.now();
    const result = runAgingSim({ epoch: '2023', years: 40, params: run.params });
    if (geoid.length === 0) {
      geoid = result.data.statics.geoid;
      names = result.data.statics.name;
      states = result.data.statics.state;
      pops = result.data.statics.pop0;
    }
    pctByRun.set(run.key, percentiles(result.simRealLogGrowth));
    console.log(`${run.key}: ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }

  const baseKey = AXIS_NAMES.map(() => 'base').join('|');
  const basePct = pctByRun.get(baseKey)!;
  const n = geoid.length;
  // Precompute per-run percentile arrays and, per axis, each non-base run's
  // base-counterpart pair — none of this depends on the place index.
  const runPcts = runs.map((run) => pctByRun.get(run.key)!);
  const pairsByAxis: Record<AxisName, { run: number; counterpart: number; immigration: string }[]> = Object.fromEntries(
    AXIS_NAMES.map((axis) => [axis, runs.flatMap((run, index) => {
      if (run.levels[axis] === 'base') return [];
      const counterpartKey = AXIS_NAMES.map((name) => (name === axis ? 'base' : run.levels[name])).join('|');
      const counterpart = runs.findIndex((other) => other.key === counterpartKey);
      return counterpart >= 0 ? [{ run: index, counterpart, immigration: run.levels.immigration }] : [];
    })]),
  ) as Record<AxisName, { run: number; counterpart: number; immigration: string }[]>;
  const rows: (string | number | null)[][] = [];
  let robustCount = 0;
  const interactionAbsShift: Record<string, { total: number; count: number }> = {};
  for (let i = 0; i < n; i++) {
    let min = 1;
    let max = 0;
    for (const pct of runPcts) {
      const p = pct[i];
      if (p < min) min = p;
      if (p > max) max = p;
    }
    // Per-axis effects vs the run differing only on that axis: mean |diff|
    // (fragility) and mean signed diff (direction of the non-base level).
    const axisEffect = {} as Record<AxisName, number>;
    const axisSigned = {} as Record<AxisName, number>;
    const shiftByImmigration: Record<string, { total: number; count: number }> = {};
    for (const axis of AXIS_NAMES) {
      let total = 0;
      let signed = 0;
      for (const pair of pairsByAxis[axis]) {
        const diff = runPcts[pair.run][i] - runPcts[pair.counterpart][i];
        total += Math.abs(diff);
        signed += diff;
        if (axis === 'concentration') {
          const bucket = shiftByImmigration[pair.immigration] ?? { total: 0, count: 0 };
          bucket.total += diff;
          bucket.count += 1;
          shiftByImmigration[pair.immigration] = bucket;
        }
      }
      const count = pairsByAxis[axis].length;
      axisEffect[axis] = count > 0 ? total / count : 0;
      axisSigned[axis] = count > 0 ? signed / count : 0;
    }
    const dominant = AXIS_NAMES.reduce((best, axis) => (axisEffect[axis] > axisEffect[best] ? axis : best), AXIS_NAMES[0]);
    const width = max - min;
    const robust = width <= 0.15 ? 1 : 0;
    robustCount += robust;
    // Signed concentration shift (old-regime minus base), also bucketed by
    // immigration level: the dial reads simulated growth, so low immigration
    // deepens it.
    const signedShift = axisSigned.concentration;
    for (const [level, bucket] of Object.entries(shiftByImmigration)) {
      const acc = interactionAbsShift[level] ?? { total: 0, count: 0 };
      acc.total += Math.abs(bucket.total / bucket.count);
      acc.count += 1;
      interactionAbsShift[level] = acc;
    }
    rows.push([
      geoid[i], names[i], states[i], Math.round(pops[i]),
      +basePct[i].toFixed(4), +min.toFixed(4), +max.toFixed(4), +width.toFixed(4),
      robust, dominant,
      +axisEffect.immigration.toFixed(4), +axisEffect.gateway.toFixed(4),
      +axisEffect.amenity.toFixed(4), +axisEffect.institutions.toFixed(4),
      +axisEffect.concentration.toFixed(4), +signedShift.toFixed(4),
    ]);
  }
  writeCsv(path.join(OUT_DIR, 'scenario-bands.csv.gz'), [
    'geoid', 'name', 'state', 'pop',
    'basePctl', 'minPctl', 'maxPctl', 'bandWidth', 'scenarioRobust', 'dominantAxis',
    'effImmigration', 'effGateway', 'effAmenity', 'effInstitutions',
    'effConcentration', 'concentrationShift',
  ], rows);

  const summary = {
    runs: runs.length,
    places: n,
    axes: {
      immigration: ['0.6M', '1.2M (base)', '1.8M'],
      gateway: ['wGateway 0.05', '0.10 (base)'],
      amenity: ['rAmenity 0.25 (climate/insurance repricing)', '0.45 (base)'],
      institutions: ['retention 0.985 floor 0.5', '1.0 (base)'],
      concentration: ['sensitivity 1 (old-regime allocation, Japan/Italy)', '0 (base)'],
    },
    scenarioRobustShare: +(robustCount / n).toFixed(4),
    /** Mean |per-place concentration shift| by immigration level: the dial is
     * endogenous to simulated working-age growth, so the shift should deepen
     * as immigration falls. */
    concentrationEffectByImmigration: Object.fromEntries(
      Object.entries(interactionAbsShift).map(([level, acc]) => [level, +(acc.total / acc.count).toFixed(4)]),
    ),
    note: 'bands are scenario ranges, not probability intervals',
  };
  fs.writeFileSync(path.join(DATA_DIR, 'scenario-ensemble.json'), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify(summary));
}

main();

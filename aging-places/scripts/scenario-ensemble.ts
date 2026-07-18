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

function main(): void {
  ensureDirs();
  // Build the 24-run grid
  const runs: { key: string; levels: Record<AxisName, string>; params: Record<string, Record<string, unknown>> }[] = [];
  for (const immigration of AXES.immigration) {
    for (const gateway of AXES.gateway) {
      for (const amenity of AXES.amenity) {
        for (const institutions of AXES.institutions) {
          for (const concentration of AXES.concentration) {
            let params: Record<string, Record<string, unknown>> = {};
            for (const spec of [immigration, gateway, amenity, institutions, concentration]) {
              params = merge(params, spec.params as Record<string, Record<string, unknown>>);
            }
            runs.push({
              key: [immigration.level, gateway.level, amenity.level, institutions.level, concentration.level].join('|'),
              levels: {
                immigration: immigration.level, gateway: gateway.level,
                amenity: amenity.level, institutions: institutions.level,
                concentration: concentration.level,
              },
              params,
            });
          }
        }
      }
    }
  }

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

  const baseKey = 'base|base|base|base|base';
  const basePct = pctByRun.get(baseKey)!;
  const n = geoid.length;
  const rows: (string | number | null)[][] = [];
  let robustCount = 0;
  const interactionAbsShift: Record<string, { total: number; count: number }> = {};
  for (let i = 0; i < n; i++) {
    let min = 1;
    let max = 0;
    for (const run of runs) {
      const p = pctByRun.get(run.key)![i];
      if (p < min) min = p;
      if (p > max) max = p;
    }
    // Per-axis effect: mean |pctl - pctl of the run differing only on that axis|
    const axisEffect: Record<AxisName, number> = {
      immigration: 0, gateway: 0, amenity: 0, institutions: 0, concentration: 0,
    };
    for (const axis of AXIS_NAMES) {
      let total = 0;
      let count = 0;
      for (const run of runs) {
        if (run.levels[axis] === 'base') continue;
        const counterpartKey = AXIS_NAMES.map((name) => (name === axis ? 'base' : run.levels[name])).join('|');
        const counterpart = pctByRun.get(counterpartKey);
        if (!counterpart) continue;
        total += Math.abs(pctByRun.get(run.key)![i] - counterpart[i]);
        count += 1;
      }
      axisEffect[axis] = count > 0 ? total / count : 0;
    }
    const dominant = AXIS_NAMES.reduce((best, axis) => (axisEffect[axis] > axisEffect[best] ? axis : best), AXIS_NAMES[0]);
    const width = max - min;
    const robust = width <= 0.15 ? 1 : 0;
    robustCount += robust;
    // Signed concentration shift: mean (old-regime minus base-concentration)
    // percentile over the 24 counterpart pairs, overall and per immigration
    // level (the dial reads simulated growth, so low immigration deepens it).
    let shiftTotal = 0;
    let shiftCount = 0;
    const shiftByImmigration: Record<string, { total: number; count: number }> = {};
    for (const run of runs) {
      if (run.levels.concentration !== 'old-regime') continue;
      const counterpartKey = AXIS_NAMES.map((name) => (name === 'concentration' ? 'base' : run.levels[name])).join('|');
      const diff = pctByRun.get(run.key)![i] - pctByRun.get(counterpartKey)![i];
      shiftTotal += diff;
      shiftCount += 1;
      const bucket = shiftByImmigration[run.levels.immigration] ?? { total: 0, count: 0 };
      bucket.total += diff;
      bucket.count += 1;
      shiftByImmigration[run.levels.immigration] = bucket;
    }
    const signedShift = shiftCount > 0 ? shiftTotal / shiftCount : 0;
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

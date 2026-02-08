/**
 * Parameter Sweep: One-at-a-Time Sensitivity Analysis
 *
 * Systematically varies each Tier-1 parameter and ranks by impact on key outcomes.
 * Also compares scenario spread on the same metrics.
 *
 * Usage:
 *   npx tsx scripts/parameter-sweep.ts
 */

import {
  runSimulation,
  describeParameters,
  buildMultiParams,
  listScenarios,
  getScenarioPath,
  loadScenario,
  scenarioToParams,
} from '../src/index.js';
import type { SimulationResult, YearResult } from '../src/index.js';

// =============================================================================
// TYPES
// =============================================================================

interface MetricDef {
  name: string;
  unit: string;
  extract: (r: SimulationResult) => number;
}

interface SweepResult {
  param: string;
  lowValue: number | boolean;
  highValue: number | boolean;
  baseline: number;
  lowResult: number;
  highResult: number;
  sensitivity: number; // |high - low| / |baseline| (or absolute if baseline ≈ 0)
}

// =============================================================================
// METRICS TO MEASURE
// =============================================================================

const last = (r: SimulationResult): YearResult => r.results[r.results.length - 1];

const METRICS: MetricDef[] = [
  { name: 'warming2100', unit: '°C', extract: r => r.metrics.warming2100 },
  { name: 'gdp2100', unit: '$T', extract: r => r.metrics.gdp2100 },
  { name: 'peakEmissions', unit: 'Gt', extract: r => r.metrics.peakEmissions },
  { name: 'fossilShare2100', unit: 'frac', extract: r => last(r).fossilShare },
  { name: 'curtailment2100', unit: 'frac', extract: r => last(r).curtailmentRate },
  { name: 'transferBurden2100', unit: 'frac', extract: r => last(r).transferBurden },
  { name: 'cdrRemoval2100', unit: 'Gt/yr', extract: r => last(r).cdrRemoval },
  { name: 'energyBurden2100', unit: 'frac', extract: r => last(r).energyBurden },
];

// =============================================================================
// HELPERS
// =============================================================================

function computeSensitivity(baseline: number, low: number, high: number): number {
  const delta = Math.abs(high - low);
  // If baseline is near zero, use absolute delta
  if (Math.abs(baseline) < 1e-6) return delta;
  return delta / Math.abs(baseline);
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function rpad(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

function formatValue(v: number, unit: string): string {
  if (unit === '°C') return v.toFixed(2) + '°C';
  if (unit === '$T') return '$' + v.toFixed(0) + 'T';
  if (unit === 'Gt') return v.toFixed(1) + ' Gt';
  if (unit === 'Gt/yr') return v.toFixed(2) + ' Gt/yr';
  if (unit === 'frac') return (v * 100).toFixed(1) + '%';
  return v.toFixed(3);
}

// =============================================================================
// MAIN SWEEP
// =============================================================================

async function main() {
  const t0 = Date.now();
  const schema = describeParameters();
  const paramNames = Object.keys(schema);
  console.log(`Found ${paramNames.length} Tier-1 parameters\n`);

  // ---- BASELINE ----
  console.log('Running baseline...');
  const baseline = runSimulation();
  const baselineMetrics: Record<string, number> = {};
  for (const m of METRICS) {
    baselineMetrics[m.name] = m.extract(baseline);
  }

  console.log('Baseline values:');
  for (const m of METRICS) {
    console.log(`  ${pad(m.name, 22)} ${formatValue(baselineMetrics[m.name], m.unit)}`);
  }
  console.log('');

  // ---- PARAMETER SWEEP ----
  // For each param: run at 10th and 90th percentile of range
  const allResults: Record<string, SweepResult[]> = {};
  for (const m of METRICS) {
    allResults[m.name] = [];
  }

  let runCount = 0;
  const skipped: string[] = [];

  for (const name of paramNames) {
    const info = schema[name];

    let lowValue: number | boolean;
    let highValue: number | boolean;

    if (info.type === 'boolean') {
      lowValue = false;
      highValue = true;
    } else {
      if (info.min === undefined || info.max === undefined) {
        skipped.push(name);
        continue;
      }
      // 10th and 90th percentile of range
      lowValue = info.min + 0.1 * (info.max - info.min);
      highValue = info.min + 0.9 * (info.max - info.min);

      // Skip if low == high (zero-width range)
      if (Math.abs((highValue as number) - (lowValue as number)) < 1e-12) {
        skipped.push(name);
        continue;
      }
    }

    // Build params and run
    let lowResult: SimulationResult;
    let highResult: SimulationResult;
    try {
      const lowParams = buildMultiParams({ [name]: lowValue });
      lowResult = runSimulation(lowParams as any);
      runCount++;
    } catch (e) {
      console.warn(`  SKIP ${name} (low=${lowValue}): ${(e as Error).message}`);
      skipped.push(name);
      continue;
    }

    try {
      const highParams = buildMultiParams({ [name]: highValue });
      highResult = runSimulation(highParams as any);
      runCount++;
    } catch (e) {
      console.warn(`  SKIP ${name} (high=${highValue}): ${(e as Error).message}`);
      skipped.push(name);
      continue;
    }

    // Extract metrics
    for (const m of METRICS) {
      const bv = baselineMetrics[m.name];
      const lv = m.extract(lowResult);
      const hv = m.extract(highResult);
      allResults[m.name].push({
        param: name,
        lowValue,
        highValue,
        baseline: bv,
        lowResult: lv,
        highResult: hv,
        sensitivity: computeSensitivity(bv, lv, hv),
      });
    }

    // Progress
    const paramIdx = paramNames.indexOf(name) + 1;
    if (paramIdx % 10 === 0) {
      console.log(`  ${paramIdx}/${paramNames.length} params done...`);
    }
  }

  console.log(`\nCompleted ${runCount} simulation runs (${skipped.length} params skipped)`);
  if (skipped.length > 0) {
    console.log(`Skipped: ${skipped.join(', ')}`);
  }

  // ---- PER-METRIC RANKINGS ----
  const TOP_N = 15;

  console.log('\n' + '='.repeat(80));
  console.log('PARAMETER SENSITIVITY RANKINGS');
  console.log('='.repeat(80));

  for (const m of METRICS) {
    const results = allResults[m.name];
    results.sort((a, b) => b.sensitivity - a.sensitivity);

    console.log(`\n=== ${m.name.toUpperCase()} (baseline: ${formatValue(baselineMetrics[m.name], m.unit)}) ===`);
    console.log(`${rpad('Rank', 4)}  ${pad('Parameter', 28)}  ${pad('Low → High', 28)}  ${rpad('Sensitivity', 11)}`);
    console.log(`${'-'.repeat(4)}  ${'-'.repeat(28)}  ${'-'.repeat(28)}  ${'-'.repeat(11)}`);

    const top = results.slice(0, TOP_N);
    for (let i = 0; i < top.length; i++) {
      const r = top[i];
      const arrow = `${formatValue(r.lowResult, m.unit)} → ${formatValue(r.highResult, m.unit)}`;
      console.log(
        `${rpad(String(i + 1), 4)}  ${pad(r.param, 28)}  ${pad(arrow, 28)}  ${rpad(r.sensitivity.toFixed(3), 11)}`
      );
    }
  }

  // ---- OVERALL IMPORTANCE (geometric mean across metrics) ----
  console.log('\n' + '='.repeat(80));
  console.log('OVERALL IMPORTANCE (geometric mean of sensitivities across all metrics)');
  console.log('='.repeat(80));

  // Collect all params that appeared in at least one metric
  const paramSet = new Set<string>();
  for (const m of METRICS) {
    for (const r of allResults[m.name]) {
      paramSet.add(r.param);
    }
  }

  const overallScores: { param: string; geoMean: number; perMetric: Record<string, number> }[] = [];

  for (const param of paramSet) {
    const sensitivities: number[] = [];
    const perMetric: Record<string, number> = {};

    for (const m of METRICS) {
      const entry = allResults[m.name].find(r => r.param === param);
      const s = entry ? entry.sensitivity : 0;
      sensitivities.push(s);
      perMetric[m.name] = s;
    }

    // Geometric mean (add small epsilon to avoid zero-product)
    const eps = 1e-6;
    const logSum = sensitivities.reduce((sum, s) => sum + Math.log(s + eps), 0);
    const geoMean = Math.exp(logSum / sensitivities.length) - eps;

    overallScores.push({ param, geoMean: Math.max(0, geoMean), perMetric });
  }

  overallScores.sort((a, b) => b.geoMean - a.geoMean);

  // Header
  const metricHeaders = METRICS.map(m => rpad(m.name.replace('2100', '').replace('2100', '').slice(0, 8), 8));
  console.log(
    `\n${rpad('Rank', 4)}  ${pad('Parameter', 28)}  ${rpad('Overall', 8)}  ${metricHeaders.join('  ')}`
  );
  console.log(
    `${'-'.repeat(4)}  ${'-'.repeat(28)}  ${'-'.repeat(8)}  ${metricHeaders.map(() => '-'.repeat(8)).join('  ')}`
  );

  for (let i = 0; i < overallScores.length; i++) {
    const s = overallScores[i];
    const cells = METRICS.map(m => rpad(s.perMetric[m.name].toFixed(3), 8));
    console.log(
      `${rpad(String(i + 1), 4)}  ${pad(s.param, 28)}  ${rpad(s.geoMean.toFixed(4), 8)}  ${cells.join('  ')}`
    );
  }

  // ---- SCENARIO COMPARISON ----
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO COMPARISON (same 8 metrics)');
  console.log('='.repeat(80));

  const scenarios = await listScenarios();
  // Filter out test scenarios
  const realScenarios = scenarios.filter(s => !s.startsWith('test-'));

  // Header
  const scenMetricHeaders = METRICS.map(m => rpad(m.name.replace('2100', '').slice(0, 10), 12));
  console.log(
    `\n${pad('Scenario', 24)}  ${scenMetricHeaders.join('  ')}`
  );
  console.log(
    `${'-'.repeat(24)}  ${scenMetricHeaders.map(() => '-'.repeat(12)).join('  ')}`
  );

  // Baseline row
  {
    const cells = METRICS.map(m => rpad(formatValue(baselineMetrics[m.name], m.unit), 12));
    console.log(`${pad('baseline (default)', 24)}  ${cells.join('  ')}`);
  }

  const scenarioResults: { name: string; metrics: Record<string, number> }[] = [];

  for (const scenName of realScenarios) {
    try {
      const scenPath = getScenarioPath(scenName);
      const scenario = await loadScenario(scenPath);
      const params = scenarioToParams(scenario);
      const result = runSimulation(params as any);

      const metricVals: Record<string, number> = {};
      for (const m of METRICS) {
        metricVals[m.name] = m.extract(result);
      }
      scenarioResults.push({ name: scenName, metrics: metricVals });

      const cells = METRICS.map(m => rpad(formatValue(metricVals[m.name], m.unit), 12));
      console.log(`${pad(scenName, 24)}  ${cells.join('  ')}`);
    } catch (e) {
      console.log(`${pad(scenName, 24)}  ERROR: ${(e as Error).message}`);
    }
  }

  // Compute scenario spread (max - min for each metric)
  console.log(`\n${pad('--- SPREAD ---', 24)}`);
  const allScenMetrics = [
    { name: 'baseline', metrics: baselineMetrics },
    ...scenarioResults,
  ];

  for (const m of METRICS) {
    const values = allScenMetrics.map(s => s.metrics[m.name]);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const spread = maxV - minV;
    const relSpread = Math.abs(baselineMetrics[m.name]) > 1e-6
      ? spread / Math.abs(baselineMetrics[m.name])
      : spread;

    console.log(
      `  ${pad(m.name, 22)} range: ${formatValue(minV, m.unit)} → ${formatValue(maxV, m.unit)}` +
      `  spread: ${relSpread.toFixed(3)} (${formatValue(spread, m.unit)})`
    );
  }

  // ---- PARAM SWEEP vs SCENARIO SPREAD ----
  console.log('\n' + '='.repeat(80));
  console.log('PARAMETER SWEEP vs SCENARIO SPREAD');
  console.log('Which matters more: parameter uncertainty or scenario choice?');
  console.log('='.repeat(80));

  for (const m of METRICS) {
    const results = allResults[m.name];
    if (results.length === 0) continue;

    // Max single-parameter swing
    const topParam = results.reduce((best, r) =>
      Math.abs(r.highResult - r.lowResult) > Math.abs(best.highResult - best.lowResult) ? r : best
    );
    const paramSwing = Math.abs(topParam.highResult - topParam.lowResult);

    // Scenario spread
    const scenValues = allScenMetrics.map(s => s.metrics[m.name]);
    const scenSpread = Math.max(...scenValues) - Math.min(...scenValues);

    const ratio = scenSpread > 1e-9 ? paramSwing / scenSpread : Infinity;

    console.log(
      `\n  ${pad(m.name, 22)}` +
      `\n    Top param: ${pad(topParam.param, 24)} swing: ${formatValue(paramSwing, m.unit)}` +
      `\n    Scenario spread:${' '.repeat(20)} ${formatValue(scenSpread, m.unit)}` +
      `\n    Ratio (param/scenario): ${ratio.toFixed(2)}x`
    );
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nTotal time: ${elapsed}s (${1 + runCount + realScenarios.length} runs)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

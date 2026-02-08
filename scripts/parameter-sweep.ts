/**
 * Parameter Sweep: Full Cross Scenarios × Parameters Sensitivity Analysis
 *
 * Perturbs every Tier-1 parameter within every scenario (default + 16 files),
 * then reports sensitivity rankings across the full matrix.
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
import { deepMerge } from '../src/scenario.js';
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

interface ScenarioSweep {
  scenarioName: string;
  baselineMetrics: Record<string, number>;
  paramResults: Record<string, SweepResult[]>; // metric name → per-param results
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

function geoMean(values: number[]): number {
  const eps = 1e-6;
  const logSum = values.reduce((sum, s) => sum + Math.log(s + eps), 0);
  return Math.max(0, Math.exp(logSum / values.length) - eps);
}

// =============================================================================
// PARAM PERTURBATION VALUES (shared across all scenarios)
// =============================================================================

interface ParamPerturbation {
  name: string;
  lowValue: number | boolean;
  highValue: number | boolean;
}

function computePerturbations(schema: Record<string, any>): ParamPerturbation[] {
  const perturbations: ParamPerturbation[] = [];

  for (const name of Object.keys(schema)) {
    const info = schema[name];

    if (info.type === 'boolean') {
      perturbations.push({ name, lowValue: false, highValue: true });
    } else {
      if (info.min === undefined || info.max === undefined) continue;
      const low = info.min + 0.1 * (info.max - info.min);
      const high = info.min + 0.9 * (info.max - info.min);
      if (Math.abs(high - low) < 1e-12) continue;
      perturbations.push({ name, lowValue: low, highValue: high });
    }
  }

  return perturbations;
}

// =============================================================================
// SWEEP ONE SCENARIO
// =============================================================================

function sweepScenario(
  scenarioName: string,
  scenarioParams: Record<string, unknown>,
  perturbations: ParamPerturbation[],
): { sweep: ScenarioSweep; runCount: number; skipped: string[] } {
  // Run scenario baseline
  const baselineResult = runSimulation(scenarioParams as any);
  const baselineMetrics: Record<string, number> = {};
  for (const m of METRICS) {
    baselineMetrics[m.name] = m.extract(baselineResult);
  }

  const paramResults: Record<string, SweepResult[]> = {};
  for (const m of METRICS) {
    paramResults[m.name] = [];
  }

  let runCount = 1; // baseline
  const skipped: string[] = [];

  for (const p of perturbations) {
    let lowResult: SimulationResult;
    let highResult: SimulationResult;

    try {
      const lowOverride = buildMultiParams({ [p.name]: p.lowValue });
      const merged = deepMerge(scenarioParams, lowOverride);
      lowResult = runSimulation(merged as any);
      runCount++;
    } catch {
      skipped.push(p.name);
      continue;
    }

    try {
      const highOverride = buildMultiParams({ [p.name]: p.highValue });
      const merged = deepMerge(scenarioParams, highOverride);
      highResult = runSimulation(merged as any);
      runCount++;
    } catch {
      skipped.push(p.name);
      continue;
    }

    for (const m of METRICS) {
      const bv = baselineMetrics[m.name];
      const lv = m.extract(lowResult);
      const hv = m.extract(highResult);
      paramResults[m.name].push({
        param: p.name,
        lowValue: p.lowValue,
        highValue: p.highValue,
        baseline: bv,
        lowResult: lv,
        highResult: hv,
        sensitivity: computeSensitivity(bv, lv, hv),
      });
    }
  }

  return {
    sweep: { scenarioName, baselineMetrics, paramResults },
    runCount,
    skipped,
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const t0 = Date.now();
  const schema = describeParameters();
  const perturbations = computePerturbations(schema);
  console.log(`Found ${Object.keys(schema).length} Tier-1 parameters, ${perturbations.length} perturbable\n`);

  // ---- BUILD SCENARIO LIST ----
  const scenarioFiles = (await listScenarios()).filter(s => !s.startsWith('test-'));
  const scenarioEntries: { name: string; params: Record<string, unknown> }[] = [
    { name: '(default)', params: {} },
  ];

  for (const scenName of scenarioFiles) {
    const scenPath = getScenarioPath(scenName);
    const scenario = await loadScenario(scenPath);
    scenarioEntries.push({ name: scenName, params: scenarioToParams(scenario) as Record<string, unknown> });
  }

  console.log(`Scenarios: ${scenarioEntries.length} (default + ${scenarioFiles.length} files)`);
  console.log(`Total runs: ~${scenarioEntries.length} baselines + ${scenarioEntries.length} × ${perturbations.length} × 2 param runs = ~${scenarioEntries.length + scenarioEntries.length * perturbations.length * 2}\n`);

  // ---- SWEEP ALL SCENARIOS ----
  const sweeps: ScenarioSweep[] = [];
  let totalRuns = 0;

  for (const entry of scenarioEntries) {
    const st = Date.now();
    const { sweep, runCount, skipped } = sweepScenario(entry.name, entry.params, perturbations);
    sweeps.push(sweep);
    totalRuns += runCount;
    const elapsed = ((Date.now() - st) / 1000).toFixed(1);
    const skipMsg = skipped.length > 0 ? ` (${skipped.length} skipped)` : '';
    console.log(`  ${pad(entry.name, 24)} ${runCount} runs in ${elapsed}s${skipMsg}`);
  }

  // ==========================================================================
  // SECTION 1: SCENARIO BASELINES
  // ==========================================================================
  console.log('\n' + '='.repeat(100));
  console.log('SECTION 1: SCENARIO BASELINES');
  console.log('='.repeat(100));

  const scenMetricHeaders = METRICS.map(m => rpad(m.name.replace('2100', '').slice(0, 10), 12));
  console.log(`\n${pad('Scenario', 24)}  ${scenMetricHeaders.join('  ')}`);
  console.log(`${'-'.repeat(24)}  ${scenMetricHeaders.map(() => '-'.repeat(12)).join('  ')}`);

  for (const sweep of sweeps) {
    const cells = METRICS.map(m => rpad(formatValue(sweep.baselineMetrics[m.name], m.unit), 12));
    console.log(`${pad(sweep.scenarioName, 24)}  ${cells.join('  ')}`);
  }

  // Spread row
  console.log(`\n${pad('--- SPREAD ---', 24)}`);
  for (const m of METRICS) {
    const values = sweeps.map(s => s.baselineMetrics[m.name]);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const spread = maxV - minV;
    const defaultBaseline = sweeps[0].baselineMetrics[m.name];
    const relSpread = Math.abs(defaultBaseline) > 1e-6 ? spread / Math.abs(defaultBaseline) : spread;
    console.log(
      `  ${pad(m.name, 22)} range: ${formatValue(minV, m.unit)} → ${formatValue(maxV, m.unit)}` +
      `  spread: ${relSpread.toFixed(3)} (${formatValue(spread, m.unit)})`
    );
  }

  // ==========================================================================
  // SECTION 2: PER-SCENARIO TOP-10
  // ==========================================================================
  console.log('\n' + '='.repeat(100));
  console.log('SECTION 2: PER-SCENARIO TOP-10 (by geo-mean importance)');
  console.log('='.repeat(100));

  for (const sweep of sweeps) {
    // Compute overall importance per param for this scenario
    const paramSet = new Set<string>();
    for (const m of METRICS) {
      for (const r of sweep.paramResults[m.name]) {
        paramSet.add(r.param);
      }
    }

    const scores: { param: string; gm: number }[] = [];
    for (const param of paramSet) {
      const sensitivities = METRICS.map(m => {
        const entry = sweep.paramResults[m.name].find(r => r.param === param);
        return entry ? entry.sensitivity : 0;
      });
      scores.push({ param, gm: geoMean(sensitivities) });
    }
    scores.sort((a, b) => b.gm - a.gm);

    console.log(`\n--- ${sweep.scenarioName} ---`);
    const top = scores.slice(0, 10);
    for (let i = 0; i < top.length; i++) {
      const s = top[i];
      // Show per-metric sensitivities inline
      const perMetric = METRICS.map(m => {
        const entry = sweep.paramResults[m.name].find(r => r.param === s.param);
        return (entry ? entry.sensitivity : 0).toFixed(3);
      });
      console.log(
        `  ${rpad(String(i + 1), 2)}. ${pad(s.param, 28)} gm=${s.gm.toFixed(4)}  [${perMetric.join(' ')}]`
      );
    }
  }

  // ==========================================================================
  // SECTION 3: CROSS-SCENARIO MAX SENSITIVITY
  // ==========================================================================
  console.log('\n' + '='.repeat(100));
  console.log('SECTION 3: CROSS-SCENARIO MAX SENSITIVITY (worst-case importance)');
  console.log('='.repeat(100));

  // For each param, take MAX sensitivity across all scenarios for each metric
  const allParams = new Set<string>();
  for (const sweep of sweeps) {
    for (const m of METRICS) {
      for (const r of sweep.paramResults[m.name]) {
        allParams.add(r.param);
      }
    }
  }

  const maxSensScores: { param: string; gm: number; perMetric: Record<string, number>; worstScenario: Record<string, string> }[] = [];

  for (const param of allParams) {
    const perMetric: Record<string, number> = {};
    const worstScenario: Record<string, string> = {};

    for (const m of METRICS) {
      let maxSens = 0;
      let worstScen = '';
      for (const sweep of sweeps) {
        const entry = sweep.paramResults[m.name].find(r => r.param === param);
        if (entry && entry.sensitivity > maxSens) {
          maxSens = entry.sensitivity;
          worstScen = sweep.scenarioName;
        }
      }
      perMetric[m.name] = maxSens;
      worstScenario[m.name] = worstScen;
    }

    const gm = geoMean(Object.values(perMetric));
    maxSensScores.push({ param, gm, perMetric, worstScenario });
  }

  maxSensScores.sort((a, b) => b.gm - a.gm);

  const metricHeaders = METRICS.map(m => rpad(m.name.replace('2100', '').slice(0, 8), 8));
  console.log(
    `\n${rpad('Rank', 4)}  ${pad('Parameter', 28)}  ${rpad('Overall', 8)}  ${metricHeaders.join('  ')}`
  );
  console.log(
    `${'-'.repeat(4)}  ${'-'.repeat(28)}  ${'-'.repeat(8)}  ${metricHeaders.map(() => '-'.repeat(8)).join('  ')}`
  );

  for (let i = 0; i < maxSensScores.length; i++) {
    const s = maxSensScores[i];
    const cells = METRICS.map(m => rpad(s.perMetric[m.name].toFixed(3), 8));
    console.log(
      `${rpad(String(i + 1), 4)}  ${pad(s.param, 28)}  ${rpad(s.gm.toFixed(4), 8)}  ${cells.join('  ')}`
    );
  }

  // ==========================================================================
  // SECTION 4: CONDITIONALLY IMPORTANT PARAMS
  // ==========================================================================
  console.log('\n' + '='.repeat(100));
  console.log('SECTION 4: CONDITIONALLY IMPORTANT PARAMS');
  console.log('(max sensitivity > 0.01 in some scenario, but < 0.001 in default baseline)');
  console.log('='.repeat(100));

  const defaultSweep = sweeps[0]; // (default)

  const conditionalParams: { param: string; defaultGm: number; maxGm: number; bestScenario: string }[] = [];

  for (const param of allParams) {
    // Default sensitivity: geo-mean across metrics
    const defaultSens = METRICS.map(m => {
      const entry = defaultSweep.paramResults[m.name].find(r => r.param === param);
      return entry ? entry.sensitivity : 0;
    });
    const defaultGm = geoMean(defaultSens);

    // Max sensitivity across all scenarios (per-metric max, then geo-mean)
    const maxEntry = maxSensScores.find(s => s.param === param);
    const maxGm = maxEntry ? maxEntry.gm : 0;

    // Find which scenario gives highest geo-mean
    let bestScenario = '(default)';
    let bestScenGm = 0;
    for (const sweep of sweeps) {
      const sens = METRICS.map(m => {
        const entry = sweep.paramResults[m.name].find(r => r.param === param);
        return entry ? entry.sensitivity : 0;
      });
      const gm = geoMean(sens);
      if (gm > bestScenGm) {
        bestScenGm = gm;
        bestScenario = sweep.scenarioName;
      }
    }

    if (maxGm > 0.01 && defaultGm < 0.001) {
      conditionalParams.push({ param, defaultGm, maxGm, bestScenario });
    }
  }

  conditionalParams.sort((a, b) => b.maxGm - a.maxGm);

  if (conditionalParams.length === 0) {
    console.log('\n  (none found)');
  } else {
    console.log(
      `\n${pad('Parameter', 28)}  ${rpad('Default gm', 10)}  ${rpad('Max gm', 10)}  Best Scenario`
    );
    console.log(
      `${'-'.repeat(28)}  ${'-'.repeat(10)}  ${'-'.repeat(10)}  ${'-'.repeat(24)}`
    );
    for (const c of conditionalParams) {
      console.log(
        `${pad(c.param, 28)}  ${rpad(c.defaultGm.toFixed(6), 10)}  ${rpad(c.maxGm.toFixed(4), 10)}  ${c.bestScenario}`
      );
    }
  }

  // ==========================================================================
  // SECTION 5: DEAD PARAMS
  // ==========================================================================
  console.log('\n' + '='.repeat(100));
  console.log('SECTION 5: DEAD PARAMS (max sensitivity < 0.001 across ALL scenarios)');
  console.log('Candidates for hardcoding or removal.');
  console.log('='.repeat(100));

  const deadParams: { param: string; maxSens: number }[] = [];

  for (const score of maxSensScores) {
    const maxMetricSens = Math.max(...Object.values(score.perMetric));
    if (maxMetricSens < 0.001) {
      deadParams.push({ param: score.param, maxSens: maxMetricSens });
    }
  }

  deadParams.sort((a, b) => a.maxSens - b.maxSens);

  if (deadParams.length === 0) {
    console.log('\n  (none — all params have sensitivity >= 0.001 in at least one scenario)');
  } else {
    console.log(`\n  ${deadParams.length} dead params:`);
    for (const d of deadParams) {
      console.log(`    ${pad(d.param, 28)}  max sensitivity: ${d.maxSens.toFixed(6)}`);
    }
  }

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(100));
  console.log(`Total: ${totalRuns} runs across ${sweeps.length} scenarios in ${elapsed}s`);
  console.log('='.repeat(100));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

/**
 * Learning × Damage Sensitivity Sweep
 *
 * 5 × 5 × 5 full-factorial sweep over:
 *   - Solar Wright's Law exponent  (solarAlpha)
 *   - Wind Wright's Law exponent   (windAlpha)
 *   - Quadratic damage coefficient (damageCoeff)
 *
 * Across 4 scenarios: baseline, net-zero, high-sensitivity, climate-cascade.
 *
 * Reports per-scenario elasticities for warming2100 / gdp2100 /
 * fossilShare2100 / cdrCumulative2100, plus tornado plots and a caveats
 * section.
 *
 * Usage: npx tsx scripts/learning-damage-sweep.ts [--output=scripts/learning-damage-sweep.md]
 *
 * Runtime: ~60–90s on a 2025 laptop (500 simulations).
 */

import {
  runSimulation,
  buildMultiParams,
  getScenarioPath,
  loadScenario,
  scenarioToParams,
} from '../src/index.js';
import { deepMerge } from '../src/scenario.js';
import type { SimulationResult, YearResult } from '../src/index.js';
import * as fs from 'fs';

// =============================================================================
// GRID DEFINITION
// =============================================================================

const SOLAR_ALPHAS = [0.25, 0.30, 0.36, 0.40, 0.45];
const WIND_ALPHAS  = [0.15, 0.20, 0.23, 0.27, 0.30];
const DAMAGE_COEFS = [0.003, 0.004, 0.00536, 0.007, 0.009];

// Indices of the central (calibrated-default) value in each axis.
const CENTRAL = { solar: 2, wind: 2, damage: 2 } as const;

const SCENARIOS = ['baseline', 'net-zero', 'high-sensitivity', 'climate-cascade'];

interface MetricDef {
  name: string;
  unit: string;
  extract: (r: SimulationResult) => number;
}

const last = (r: SimulationResult): YearResult => r.results[r.results.length - 1];

const METRICS: MetricDef[] = [
  { name: 'warming2100',     unit: '°C',     extract: r => r.metrics.warming2100 },
  { name: 'gdp2100',         unit: '$T',     extract: r => r.metrics.gdp2100 },
  { name: 'fossilShare2100', unit: 'frac',   extract: r => last(r).fossilShare },
  { name: 'cdrCumulative2100', unit: 'Gt',   extract: r => last(r).cdrCumulative ?? 0 },
];

// =============================================================================
// CORE SWEEP
// =============================================================================

interface CellResult {
  solarIdx: number;
  windIdx: number;
  damageIdx: number;
  metrics: Record<string, number>;
}

interface ScenarioSweep {
  scenarioName: string;
  cells: CellResult[];
  centralMetrics: Record<string, number>;
}

async function sweepScenario(scenarioName: string): Promise<ScenarioSweep> {
  const scenario = await loadScenario(getScenarioPath(scenarioName));
  const baseParams = scenarioToParams(scenario);

  const cells: CellResult[] = [];

  for (let si = 0; si < SOLAR_ALPHAS.length; si++) {
    for (let wi = 0; wi < WIND_ALPHAS.length; wi++) {
      for (let di = 0; di < DAMAGE_COEFS.length; di++) {
        const override = buildMultiParams({
          solarAlpha: SOLAR_ALPHAS[si],
          windAlpha: WIND_ALPHAS[wi],
          damageCoeff: DAMAGE_COEFS[di],
        });
        const merged = deepMerge(baseParams, override);
        const result = runSimulation(merged as any);

        const metrics: Record<string, number> = {};
        for (const m of METRICS) metrics[m.name] = m.extract(result);
        cells.push({ solarIdx: si, windIdx: wi, damageIdx: di, metrics });
      }
    }
  }

  const central = cells.find(
    c => c.solarIdx === CENTRAL.solar && c.windIdx === CENTRAL.wind && c.damageIdx === CENTRAL.damage
  )!;

  return { scenarioName, cells, centralMetrics: central.metrics };
}

// =============================================================================
// ANALYSIS
// =============================================================================

interface Elasticity {
  metric: string;
  axis: 'solar' | 'wind' | 'damage';
  value: number;    // % change in metric per % change in param, evaluated at central ± 1 step
  lowMetric: number;
  highMetric: number;
  lowParam: number;
  highParam: number;
}

/**
 * Elasticity at the central point: finite-difference using the adjacent low/high
 * grid points along one axis (holding the other two at central).
 */
function computeElasticity(
  sweep: ScenarioSweep,
  axis: 'solar' | 'wind' | 'damage',
  metric: string
): Elasticity {
  const c = CENTRAL;
  const lowIdx = { solar: c.solar, wind: c.wind, damage: c.damage };
  const highIdx = { ...lowIdx };
  lowIdx[axis] = c[axis] - 1;
  highIdx[axis] = c[axis] + 1;

  const lowCell = sweep.cells.find(x =>
    x.solarIdx === lowIdx.solar && x.windIdx === lowIdx.wind && x.damageIdx === lowIdx.damage
  )!;
  const highCell = sweep.cells.find(x =>
    x.solarIdx === highIdx.solar && x.windIdx === highIdx.wind && x.damageIdx === highIdx.damage
  )!;

  const axisValues = axis === 'solar' ? SOLAR_ALPHAS : axis === 'wind' ? WIND_ALPHAS : DAMAGE_COEFS;
  const lowParam = axisValues[lowIdx[axis]];
  const highParam = axisValues[highIdx[axis]];

  const lowM = lowCell.metrics[metric];
  const highM = highCell.metrics[metric];
  const centralM = sweep.centralMetrics[metric];
  const centralP = axisValues[c[axis]];

  // Arc elasticity: (dM/M) / (dP/P) with midpoint as reference
  const dM = highM - lowM;
  const dP = highParam - lowParam;
  const elasticity = centralM !== 0 && centralP !== 0
    ? (dM / centralM) / (dP / centralP)
    : 0;

  return {
    metric, axis,
    value: elasticity,
    lowMetric: lowM, highMetric: highM,
    lowParam, highParam,
  };
}

// =============================================================================
// OUTPUT FORMATTING
// =============================================================================

function fmtMetric(v: number, unit: string): string {
  if (unit === '°C') return v.toFixed(2) + '°C';
  if (unit === '$T') return '$' + v.toFixed(0) + 'T';
  if (unit === 'Gt') return v.toFixed(1);
  if (unit === 'frac') return (v * 100).toFixed(1) + '%';
  return v.toFixed(3);
}

function renderElasticityTable(sweep: ScenarioSweep): string {
  const lines: string[] = [];
  lines.push(`### ${sweep.scenarioName}\n`);
  lines.push('Central-point values:');
  for (const m of METRICS) {
    lines.push(`- **${m.name}**: ${fmtMetric(sweep.centralMetrics[m.name], m.unit)}`);
  }
  lines.push('');

  lines.push('| Metric | Solar α elasticity | Wind α elasticity | Damage ω elasticity |');
  lines.push('|---|---:|---:|---:|');
  for (const m of METRICS) {
    const e_s = computeElasticity(sweep, 'solar', m.name).value;
    const e_w = computeElasticity(sweep, 'wind', m.name).value;
    const e_d = computeElasticity(sweep, 'damage', m.name).value;
    lines.push(`| ${m.name} | ${e_s.toFixed(3)} | ${e_w.toFixed(3)} | ${e_d.toFixed(3)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderTornado(sweep: ScenarioSweep): string {
  const lines: string[] = [];
  lines.push(`#### Tornado — ${sweep.scenarioName}\n`);
  lines.push('Metric deltas (high − low across the full parameter range, other two axes at central):\n');
  lines.push('```');

  const MAX_BAR = 40;

  for (const m of METRICS) {
    lines.push(`${m.name} (central = ${fmtMetric(sweep.centralMetrics[m.name], m.unit)})`);

    const axisDeltas: Array<{ axis: string; delta: number; low: number; high: number }> = [];
    for (const axis of ['solar', 'wind', 'damage'] as const) {
      const axisVals = axis === 'solar' ? SOLAR_ALPHAS : axis === 'wind' ? WIND_ALPHAS : DAMAGE_COEFS;
      const idxLow = 0;
      const idxHigh = axisVals.length - 1;
      const lowIdx = { solar: CENTRAL.solar, wind: CENTRAL.wind, damage: CENTRAL.damage };
      const highIdx = { ...lowIdx };
      lowIdx[axis] = idxLow;
      highIdx[axis] = idxHigh;
      const lowCell = sweep.cells.find(x =>
        x.solarIdx === lowIdx.solar && x.windIdx === lowIdx.wind && x.damageIdx === lowIdx.damage
      )!;
      const highCell = sweep.cells.find(x =>
        x.solarIdx === highIdx.solar && x.windIdx === highIdx.wind && x.damageIdx === highIdx.damage
      )!;
      axisDeltas.push({
        axis,
        delta: highCell.metrics[m.name] - lowCell.metrics[m.name],
        low: lowCell.metrics[m.name],
        high: highCell.metrics[m.name],
      });
    }

    const maxAbs = Math.max(...axisDeltas.map(d => Math.abs(d.delta)));
    for (const d of axisDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))) {
      const len = maxAbs > 0 ? Math.round(Math.abs(d.delta) / maxAbs * MAX_BAR) : 0;
      const bar = (d.delta >= 0 ? '█' : '▒').repeat(len);
      const deltaStr = `${d.delta >= 0 ? '+' : ''}${fmtMetric(d.delta, m.unit).replace(/[°$]/g, '')}`;
      lines.push(`  ${d.axis.padEnd(6)} ${bar.padEnd(MAX_BAR)} ${deltaStr}`);
    }
    lines.push('');
  }
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

function renderInteractionNotes(sweeps: ScenarioSweep[]): string {
  const lines: string[] = [];
  lines.push('## Cross-scenario interactions\n');
  lines.push('Elasticities that shift substantially between scenarios indicate non-linearity worth reporting.\n');

  for (const m of METRICS) {
    for (const axis of ['solar', 'wind', 'damage'] as const) {
      const values = sweeps.map(s => ({
        scenario: s.scenarioName,
        elasticity: computeElasticity(s, axis, m.name).value,
      }));
      const absVals = values.map(v => Math.abs(v.elasticity));
      const maxAbs = Math.max(...absVals);
      const minAbs = Math.min(...absVals);
      const relativeSpread = maxAbs > 1e-6 ? (maxAbs - minAbs) / maxAbs : 0;

      if (relativeSpread > 0.3) {
        lines.push(`- **${m.name} vs ${axis}**: elasticity spread ${(relativeSpread * 100).toFixed(0)}% across scenarios — ${values.map(v => `${v.scenario}=${v.elasticity.toFixed(2)}`).join(', ')}`);
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

function renderReport(sweeps: ScenarioSweep[]): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push('# Learning × Damage Sensitivity Sweep\n');
  lines.push(`_Generated ${now}_\n`);
  lines.push('## Grid\n');
  lines.push(`- **Solar Wright's Law exponent**: ${SOLAR_ALPHAS.join(', ')} (central ${SOLAR_ALPHAS[CENTRAL.solar]})`);
  lines.push(`- **Wind Wright's Law exponent**: ${WIND_ALPHAS.join(', ')} (central ${WIND_ALPHAS[CENTRAL.wind]})`);
  lines.push(`- **Damage coefficient ω**: ${DAMAGE_COEFS.join(', ')} (central ${DAMAGE_COEFS[CENTRAL.damage]})`);
  lines.push(`- **Scenarios**: ${SCENARIOS.join(', ')}`);
  lines.push(`- **Runs**: ${SOLAR_ALPHAS.length * WIND_ALPHAS.length * DAMAGE_COEFS.length * SCENARIOS.length}`);
  lines.push('');

  lines.push('## Elasticities (evaluated at central ± 1 grid step)\n');
  lines.push('Elasticity = (ΔM / M) / (ΔP / P), finite-differenced around the central point. ');
  lines.push('Positive ⇒ metric rises with parameter. Magnitude > ~0.5 indicates strong sensitivity.\n');

  for (const s of sweeps) lines.push(renderElasticityTable(s));

  lines.push('## Tornado plots (full-range deltas)\n');
  for (const s of sweeps) lines.push(renderTornado(s));

  lines.push(renderInteractionNotes(sweeps));

  lines.push('## Caveats\n');
  lines.push('- Solar and wind learning rates are correlated in reality (shared supply chain, financing, interconnect queues). The `(high-solar, low-wind)` corner is lightly populated empirically — read corner cells with skepticism.');
  lines.push('- Damage coefficient elasticity is emissions-path dependent; per-scenario tables (not pooled).');
  lines.push('- Warming responds primarily to emissions, not damages. Expect |damage elasticity on warming| ≪ 1 — non-zero here reflects indirect feedback (damages → GDP → energy demand → emissions).');
  lines.push('- Local sensitivities at 5-point resolution — adequate for curvature detection within the grid range, not for full uncertainty quantification.');
  lines.push('- The central (0.36 / 0.23 / 0.00536) reproduces the calibrated defaults; sanity-check by comparing `centralMetrics` with a plain `npm start` run.');
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let outputPath = 'scripts/learning-damage-sweep.md';
  for (const a of args) {
    if (a.startsWith('--output=')) outputPath = a.split('=')[1];
  }

  console.log('=== Learning × Damage Sweep ===\n');
  console.log(`Grid: ${SOLAR_ALPHAS.length}×${WIND_ALPHAS.length}×${DAMAGE_COEFS.length} × ${SCENARIOS.length} scenarios = ${SOLAR_ALPHAS.length * WIND_ALPHAS.length * DAMAGE_COEFS.length * SCENARIOS.length} runs\n`);

  const startTime = Date.now();
  const sweeps: ScenarioSweep[] = [];
  for (const name of SCENARIOS) {
    process.stdout.write(`  Running ${name}... `);
    const t0 = Date.now();
    sweeps.push(await sweepScenario(name));
    console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  console.log(`\nTotal runtime: ${((Date.now() - startTime) / 1000).toFixed(1)}s\n`);

  const report = renderReport(sweeps);
  fs.writeFileSync(outputPath, report);
  console.log(`Report written to: ${outputPath}\n`);

  // Spot-check output to stdout
  console.log('--- Quick summary ---\n');
  for (const s of sweeps) {
    console.log(`${s.scenarioName}: warming2100 elasticities — solar=${computeElasticity(s, 'solar', 'warming2100').value.toFixed(3)}, wind=${computeElasticity(s, 'wind', 'warming2100').value.toFixed(3)}, damage=${computeElasticity(s, 'damage', 'warming2100').value.toFixed(3)}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

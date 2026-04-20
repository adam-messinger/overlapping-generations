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

type Axis = 'solar' | 'wind' | 'damage';

const GRID: Record<Axis, number[]> = {
  solar:  [0.25, 0.30, 0.36, 0.40, 0.45],
  wind:   [0.15, 0.20, 0.23, 0.27, 0.30],
  damage: [0.003, 0.004, 0.00536, 0.007, 0.009],
};
const AXES: readonly Axis[] = ['solar', 'wind', 'damage'];

// Indices of the central (calibrated-default) value in each axis.
const CENTRAL: Record<Axis, number> = { solar: 2, wind: 2, damage: 2 };

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

type CellMetrics = Record<string, number>;

interface ScenarioSweep {
  scenarioName: string;
  // Flat array indexed by cellIndex(solarIdx, windIdx, damageIdx)
  cells: CellMetrics[];
  centralMetrics: CellMetrics;
}

const N_WIND = GRID.wind.length;
const N_DAMAGE = GRID.damage.length;

function cellIndex(si: number, wi: number, di: number): number {
  return si * N_WIND * N_DAMAGE + wi * N_DAMAGE + di;
}

async function sweepScenario(scenarioName: string): Promise<ScenarioSweep> {
  const scenario = await loadScenario(getScenarioPath(scenarioName));
  const baseParams = scenarioToParams(scenario);

  const cells: CellMetrics[] = new Array(GRID.solar.length * N_WIND * N_DAMAGE);

  for (let si = 0; si < GRID.solar.length; si++) {
    for (let wi = 0; wi < N_WIND; wi++) {
      for (let di = 0; di < N_DAMAGE; di++) {
        const override = buildMultiParams({
          solarAlpha: GRID.solar[si],
          windAlpha: GRID.wind[wi],
          damageCoeff: GRID.damage[di],
        });
        const merged = deepMerge(baseParams, override);
        const result = runSimulation(merged as any);

        const metrics: CellMetrics = {};
        for (const m of METRICS) metrics[m.name] = m.extract(result);
        cells[cellIndex(si, wi, di)] = metrics;
      }
    }
  }

  const centralMetrics = cells[cellIndex(CENTRAL.solar, CENTRAL.wind, CENTRAL.damage)];
  return { scenarioName, cells, centralMetrics };
}

// =============================================================================
// ANALYSIS
// =============================================================================

/**
 * Elasticity (centered finite difference): (ΔM/M) / (ΔP/P) using the grid
 * points one step above and below central, holding the other two axes central.
 */
function computeElasticity(sweep: ScenarioSweep, axis: Axis, metric: string): number {
  const lowIdx = { ...CENTRAL };
  const highIdx = { ...CENTRAL };
  lowIdx[axis] = CENTRAL[axis] - 1;
  highIdx[axis] = CENTRAL[axis] + 1;

  const lowM = sweep.cells[cellIndex(lowIdx.solar, lowIdx.wind, lowIdx.damage)][metric];
  const highM = sweep.cells[cellIndex(highIdx.solar, highIdx.wind, highIdx.damage)][metric];
  const centralM = sweep.centralMetrics[metric];
  const centralP = GRID[axis][CENTRAL[axis]];
  const dP = GRID[axis][highIdx[axis]] - GRID[axis][lowIdx[axis]];

  if (centralM === 0 || centralP === 0) return 0;
  return ((highM - lowM) / centralM) / (dP / centralP);
}

/**
 * Pre-compute elasticities for a sweep so render functions don't redo work.
 * Keyed by `${metric}|${axis}`.
 */
function elasticityMap(sweep: ScenarioSweep): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of METRICS) {
    for (const axis of AXES) {
      map.set(`${m.name}|${axis}`, computeElasticity(sweep, axis, m.name));
    }
  }
  return map;
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

function renderElasticityTable(sweep: ScenarioSweep, elasticities: Map<string, number>): string {
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
    const e = (axis: Axis) => elasticities.get(`${m.name}|${axis}`)!.toFixed(3);
    lines.push(`| ${m.name} | ${e('solar')} | ${e('wind')} | ${e('damage')} |`);
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

    const axisDeltas = AXES.map(axis => {
      const lowIdx = { ...CENTRAL };
      const highIdx = { ...CENTRAL };
      lowIdx[axis] = 0;
      highIdx[axis] = GRID[axis].length - 1;
      const lowM = sweep.cells[cellIndex(lowIdx.solar, lowIdx.wind, lowIdx.damage)][m.name];
      const highM = sweep.cells[cellIndex(highIdx.solar, highIdx.wind, highIdx.damage)][m.name];
      return { axis, delta: highM - lowM };
    });

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

function renderInteractionNotes(sweeps: ScenarioSweep[], allElasticities: Map<string, number>[]): string {
  const lines: string[] = [];
  lines.push('## Cross-scenario interactions\n');
  lines.push('Elasticities that shift substantially between scenarios indicate non-linearity worth reporting.\n');

  for (const m of METRICS) {
    for (const axis of AXES) {
      const values = sweeps.map((s, i) => ({
        scenario: s.scenarioName,
        elasticity: allElasticities[i].get(`${m.name}|${axis}`)!,
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
  const elasticities = sweeps.map(elasticityMap);

  lines.push('# Learning × Damage Sensitivity Sweep\n');
  lines.push(`_Generated ${now}_\n`);
  lines.push('## Grid\n');
  lines.push(`- **Solar Wright's Law exponent**: ${GRID.solar.join(', ')} (central ${GRID.solar[CENTRAL.solar]})`);
  lines.push(`- **Wind Wright's Law exponent**: ${GRID.wind.join(', ')} (central ${GRID.wind[CENTRAL.wind]})`);
  lines.push(`- **Damage coefficient ω**: ${GRID.damage.join(', ')} (central ${GRID.damage[CENTRAL.damage]})`);
  lines.push(`- **Scenarios**: ${SCENARIOS.join(', ')}`);
  lines.push(`- **Runs**: ${GRID.solar.length * GRID.wind.length * GRID.damage.length * SCENARIOS.length}`);
  lines.push('');

  lines.push('## Elasticities (evaluated at central ± 1 grid step)\n');
  lines.push('Elasticity = (ΔM / M) / (ΔP / P), finite-differenced around the central point. ');
  lines.push('Positive ⇒ metric rises with parameter. Magnitude > ~0.5 indicates strong sensitivity.\n');

  for (let i = 0; i < sweeps.length; i++) lines.push(renderElasticityTable(sweeps[i], elasticities[i]));

  lines.push('## Tornado plots (full-range deltas)\n');
  for (const s of sweeps) lines.push(renderTornado(s));

  lines.push(renderInteractionNotes(sweeps, elasticities));

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
  const cellsPerScenario = GRID.solar.length * GRID.wind.length * GRID.damage.length;
  console.log(`Grid: ${GRID.solar.length}×${GRID.wind.length}×${GRID.damage.length} × ${SCENARIOS.length} scenarios = ${cellsPerScenario * SCENARIOS.length} runs\n`);

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
    console.log(`${s.scenarioName}: warming2100 elasticities — solar=${computeElasticity(s, 'solar', 'warming2100').toFixed(3)}, wind=${computeElasticity(s, 'wind', 'warming2100').toFixed(3)}, damage=${computeElasticity(s, 'damage', 'warming2100').toFixed(3)}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

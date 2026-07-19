/**
 * Growth backcast 1990-2025: can the production function retrodict history?
 *
 * Drives the ACTUAL production module (src/modules/production.ts) — same
 * exergy weighting, same endogenous efficiency (Wright's-law end-use +
 * organizational) — with observed world inputs 1990-2025, initialized in
 * 1990, and compares the predicted GDP path to observed GDP. No damages,
 * burdens, or system overheads (netted out of both anchors; roughly
 * constant shares over the window, so growth-rate comparisons are clean).
 *
 * This is the model's out-of-sample exam: the forward run is anchored in
 * 2025 and predicts 75 years; here the same structure is anchored in 1990
 * and "predicts" 35 years we can check. A structure that under-predicts
 * the observed 1990-2025 growth by X pp/yr carries that same missing
 * engine into the future.
 *
 * Observed world series (5-year points, interpolated geometrically).
 * All values approximate (±5-10%); conclusions rest on growth-rate gaps
 * well above that uncertainty. Sources:
 * - GDP: World Bank WDI, GDP PPP constant 2017 intl $ (2025 = model's
 *   $158T anchor, consistent with WDI 2023 $145T + IMF growth)
 * - Electricity generation: IEA WEO / Ember yearly electricity data
 * - Total final consumption: IEA World Energy Balances (Mtoe x 11.63)
 * - Capital stock: Penn World Table 10.01 'cn' world aggregate, constant
 *   2017$ (2025 = model's $553T anchor, K/Y ~3.5)
 * - Working-age 20-64: UN World Population Prospects 2024
 * - College share of workforce: Barro-Lee attainment, interpolated
 *
 * Regenerates scripts/growth-backcast.md.
 */

import { writeFileSync } from 'fs';
import { productionModule } from '../src/modules/production.js';
import { runSimulation } from '../src/index.js';

// ---------------------------------------------------------------------------
// Observed world data, 5-year points 1990-2025
// ---------------------------------------------------------------------------

const YEARS5 = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025];

const OBSERVED = {
  // $T PPP, constant 2017 intl $ (World Bank WDI; 2020 includes covid dip)
  gdp: [47.6, 55.6, 65.4, 79.5, 94.6, 111.5, 126.9, 158],
  // TWh generated (IEA/Ember)
  electricity: [11860, 13170, 15440, 18240, 21530, 24250, 26940, 31500],
  // TWh total final energy consumption (IEA WEB)
  totalFinal: [72700, 76500, 81400, 90700, 100100, 106900, 110300, 119000],
  // $T capital stock, constant 2017$ (PWT 10.01; 2025 = model anchor)
  capital: [160, 190, 225, 275, 340, 420, 495, 553],
  // Billions aged 20-64 (UN WPP 2024)
  workingAge: [2.79, 3.03, 3.27, 3.56, 3.87, 4.16, 4.45, 4.65],
  // Tertiary attainment share of workforce (Barro-Lee, rough)
  college: [0.10, 0.11, 0.12, 0.135, 0.15, 0.165, 0.18, 0.20],
};

// Geometric interpolation to annual series 1990-2025
function annualize(points: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const r = Math.pow(points[i + 1] / points[i], 1 / 5);
    for (let k = 0; k < 5; k++) out.push(points[i] * Math.pow(r, k));
  }
  out.push(points[points.length - 1]);
  return out;
}

const gdpObs = annualize(OBSERVED.gdp);
const genObs = annualize(OBSERVED.electricity);
const tfcObs = annualize(OBSERVED.totalFinal);
const capObs = annualize(OBSERVED.capital);
const labObs = annualize(OBSERVED.workingAge);
const colObs = annualize(OBSERVED.college);

// Non-electric final energy = TFC - delivered electricity (generation less
// ~8% grid losses and own use)
const DELIVERY_FACTOR = 0.92;
const nonElecObs = tfcObs.map((tfc, i) => tfc - genObs[i] * DELIVERY_FACTOR);

const N = gdpObs.length; // 36 years, 1990..2025
const cagr = (a: number, b: number, years: number) => Math.log(b / a) / years;
const pct = (x: number) => (x * 100).toFixed(2);

// ---------------------------------------------------------------------------
// Backcast: drive the real production module from a 1990 anchor
// ---------------------------------------------------------------------------

interface BackcastResult {
  gamma: number;
  gdpPath: number[];
  contributions: { K: number; L: number; E: number; eff: number }; // 2025 levels, 1990=1
}

function runBackcast(gammaOverride?: number): BackcastResult {
  const params = productionModule.mergeParams({
    initialGDP: OBSERVED.gdp[0],
    ...(gammaOverride !== undefined && { gamma: gammaOverride }),
  });
  let st = productionModule.init(params);
  const gdpPath: number[] = [];
  let last: any;
  for (let i = 0; i < N; i++) {
    const r = productionModule.step(
      st,
      {
        capitalStock: capObs[i],
        effectiveWorkers: labObs[i] * 1e9,
        totalGeneration: genObs[i],
        nonElectricEnergy: nonElecObs[i],
        damages: 0,
        energyBurdenDamage: 0,
        foodStress: 0,
        resourceEnergy: 0,
        energySystemOverhead: 0,
        collegeShare: colObs[i],
        cdrEnergy: 0,
      },
      params,
      1990 + i,
      i
    );
    st = r.state;
    last = r.outputs;
    gdpPath.push(r.outputs.gdp);
  }
  return {
    gamma: params.gamma,
    gdpPath,
    contributions: {
      K: last.capitalContribution,
      L: last.laborContribution,
      E: last.energyContribution,
      eff: last.efficiencyLevel,
    },
  };
}

const gammaGrid = [0.08, 0.25, 0.40, 0.55, 0.70];
const backcasts = gammaGrid.map((g) => runBackcast(g));
const def = backcasts.find((b) => b.gamma === 0.55)!;

// Residual: extra annual productivity growth needed to close the 2025 gap
const residual = (b: BackcastResult) =>
  cagr(b.gdpPath[N - 1] / OBSERVED.gdp[0], gdpObs[N - 1] / OBSERVED.gdp[0], N - 1);

// ---------------------------------------------------------------------------
// Forward contrast: same decomposition for the model's own 2025-2050 path
// ---------------------------------------------------------------------------

const fwd: any = runSimulation();
const f = (y: number) => fwd.results[y - 2025];
const fwdE = (row: any) =>
  row.productionUsefulEnergy ??
  0.95 * row.electricityDemand + 0.35 * row.nonElectricEnergy;

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const lines: string[] = [];
const p = (s = '') => lines.push(s);

p('# Growth backcast 1990-2025');
p();
p('Generated by `scripts/growth-backcast.ts`. The forward production');
p('structure (exergy-weighted energy, endogenous Wright’s-law + education');
p('efficiency, no exogenous TFP) is anchored in 1990 and driven with');
p('observed world capital, labor, electricity, final energy, and education');
p('through 2025. If the structure is right, it should reproduce observed');
p('growth; the shortfall measures the growth engine the model is missing.');
p();

p('## Headline');
p();
const predCagr = cagr(def.gdpPath[0], def.gdpPath[N - 1], N - 1);
const obsCagr = cagr(gdpObs[0], gdpObs[N - 1], N - 1);
p('| | 1990→2025 CAGR | GDP 2025 (1990=$47.6T) |');
p('|---|---:|---:|');
p(`| Observed (WDI) | ${pct(obsCagr)}%/yr | $${gdpObs[N - 1].toFixed(0)}T |`);
p(`| Model (γ=0.55 default) | ${pct(predCagr)}%/yr | $${def.gdpPath[N - 1].toFixed(0)}T |`);
p(`| **Shortfall** | **${pct(obsCagr - predCagr)} pp/yr** | **${(100 * (1 - def.gdpPath[N - 1] / gdpObs[N - 1])).toFixed(0)}% under** |`);
p();

p('## Factor decomposition at default γ (2025 level, 1990 = 1)');
p();
p('| Factor | Level ratio | Growth contribution (pp/yr) |');
p('|---|---:|---:|');
const c = def.contributions;
p(`| Capital (K/K₀)^0.25 | ${c.K.toFixed(2)} | ${pct(Math.log(c.K) / (N - 1))} |`);
p(`| Labor (L/L₀)^0.15 | ${c.L.toFixed(2)} | ${pct(Math.log(c.L) / (N - 1))} |`);
p(`| Useful energy (E/E₀)^0.55 | ${c.E.toFixed(2)} | ${pct(Math.log(c.E) / (N - 1))} |`);
p(`| Endogenous efficiency | ${c.eff.toFixed(2)} | ${pct(Math.log(c.eff) / (N - 1))} |`);
p(`| **Model total** | ${(def.gdpPath[N - 1] / def.gdpPath[0]).toFixed(2)} | **${pct(predCagr)}** |`);
p(`| Observed | ${(gdpObs[N - 1] / gdpObs[0]).toFixed(2)} | ${pct(obsCagr)} |`);
p();
p('Raw input growth 1990-2025: capital ' + pct(cagr(capObs[0], capObs[N - 1], N - 1)) +
  '%/yr, working-age labor ' + pct(cagr(labObs[0], labObs[N - 1], N - 1)) +
  '%/yr, electricity ' + pct(cagr(genObs[0], genObs[N - 1], N - 1)) +
  '%/yr, non-electric final energy ' + pct(cagr(nonElecObs[0], nonElecObs[N - 1], N - 1)) +
  '%/yr, exergy-weighted useful energy ' +
  pct(cagr(0.95 * genObs[0] + 0.35 * nonElecObs[0], 0.95 * genObs[N - 1] + 0.35 * nonElecObs[N - 1], N - 1)) + '%/yr.');
p();

p('## Does a different γ fix it?');
p();
p('| γ | Predicted CAGR | Shortfall vs observed | Residual productivity needed |');
p('|---|---:|---:|---:|');
for (const b of backcasts) {
  const pc = cagr(b.gdpPath[0], b.gdpPath[N - 1], N - 1);
  p(`| ${b.gamma.toFixed(2)}${b.gamma === 0.55 ? ' (default)' : ''} | ${pct(pc)}%/yr | ${pct(obsCagr - pc)} pp/yr | ${pct(residual(b))}%/yr |`);
}
p();
p('Higher γ fits history better (useful energy grew faster than the');
p('α/β-weighted K,L bundle), but even γ=0.70 leaves a large gap — and');
p('closing the gap entirely on γ would need γ ≈ 1, far outside any');
p('defended range. The missing engine is not the energy elasticity.');
p();

p('## Per-decade check (γ=0.55)');
p();
p('| Period | Observed %/yr | Model %/yr | Gap pp/yr |');
p('|---|---:|---:|---:|');
for (let i = 0; i + 10 <= N - 1 || i === 30; i += 10) {
  const j = Math.min(i + 10, N - 1);
  const o = cagr(gdpObs[i], gdpObs[j], j - i);
  const m = cagr(def.gdpPath[i], def.gdpPath[j], j - i);
  p(`| ${1990 + i}-${1990 + j} | ${pct(o)} | ${pct(m)} | ${pct(o - m)} |`);
}
p();

p('## Forward contrast: the same engine 2025-2050');
p();
const y25 = f(2025), y50 = f(2050);
const gK = cagr(y25.capitalStock, y50.capitalStock, 25);
const gE = cagr(fwdE(y25), fwdE(y50), 25);
const gY = cagr(y25.gdp, y50.gdp, 25);
p('| | 1990-2025 (observed inputs) | 2025-2050 (model forward) |');
p('|---|---:|---:|');
p(`| Capital growth | ${pct(cagr(capObs[0], capObs[N - 1], N - 1))}%/yr | ${pct(gK)}%/yr |`);
p(`| Exergy-weighted E growth | ${pct(cagr(0.95 * genObs[0] + 0.35 * nonElecObs[0], 0.95 * genObs[N - 1] + 0.35 * nonElecObs[N - 1], N - 1))}%/yr | ${pct(gE)}%/yr |`);
p(`| GDP growth | ${pct(obsCagr)}%/yr (obs) / ${pct(predCagr)}%/yr (model) | ${pct(gY)}%/yr |`);
p();

p('## Caveats');
p();
p('- Observed series are approximate (±5-10%); the measured shortfall is');
p('  several times larger than that uncertainty.');
p('- Labor uses working-age headcount; education enters via collegeShare →');
p('  organizational efficiency, mirroring the model’s own separation.');
p('  If effective (education-weighted) labor grew ~0.3 pp/yr faster, the');
p('  β=0.15 weight makes that worth only ~0.05 pp/yr of the gap.');
p('- Damages, energy-burden, food stress, and system overheads are zeroed');
p('  on both sides of the comparison (small, roughly constant shares).');
p('- 2020 covid dip is in the observed GDP series; per-decade rows bracket it.');

writeFileSync('scripts/growth-backcast.md', lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log('\nReport written to scripts/growth-backcast.md');

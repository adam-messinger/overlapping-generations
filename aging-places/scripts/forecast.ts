/**
 * Forward forecast 2025-2065 for every US municipality:
 *  1. statistical score — the backtest-validated logit/linear model applied
 *     to 2023 features (ranking preserved under cross-sectional z-scoring);
 *  2. mechanism score — the OLG municipal simulation run 40 years forward;
 *  3. outlook = blend of both (z-averaged);
 *  4. valuation gap = outlook vs current price-to-income percentile;
 *  5. explainability: pillar drivers + typology tags per place.
 *
 * Outputs (outputs/):
 *   forecast-all.csv.gz, top100.csv, bottom100.csv, undervalued.csv,
 *   overvalued.csv
 *
 * Usage: npx tsx aging-places/scripts/forecast.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, OUT_DIR, ensureDirs, writeCsv } from './lib.js';
import { loadFeatureRows } from './backtest.js';
import {
  MODEL_FEATURES, ModelSpec, buildMatrix, columnStats, standardize, predictLogit, predictLinear,
} from '../src/scoring.js';
import { runAgingSim } from '../src/simulation.js';
import { attractionModule } from '../src/modules/attraction.js';

function zVec(v: number[]): number[] {
  const ok = v.filter((x) => Number.isFinite(x));
  const m = ok.reduce((s, x) => s + x, 0) / ok.length;
  const sd = Math.sqrt(ok.reduce((s, x) => s + (x - m) ** 2, 0) / (ok.length - 1)) || 1;
  return v.map((x) => (Number.isFinite(x) ? (x - m) / sd : 0));
}

interface PlaceOut {
  geoid: string; name: string; state: string; pop: number;
  outlook: number; simGrowth: number; fittedProb: number; fittedGrowth: number;
  valuationGap: number | null; zhvi2025: number | null; medianValue: number | null;
  pillars: Record<string, number>;
  tags: string[];
  positives: string[];
  negatives: string[];
}

const PILLAR_LABELS: Record<string, string> = {
  engines: 'institutional engines (edu/med/gov/military/university)',
  human: 'human capital (degrees, professional employment)',
  access: 'market access (population within 60-120min)',
  regen: 'demographic regeneration (25-44 vs 65+)',
  gateway: 'immigrant gateway',
  amenity: 'amenity capital (seasonal homes, arts, prestige)',
  scarcity: 'scarcity capital (price/income, density, slow building)',
  distress: 'distress vacancy',
};

function main(): void {
  ensureDirs();

  // ---- 1. statistical model on 2023 features ----
  const model: ModelSpec = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'model.json'), 'utf8'));
  const rows23 = loadFeatureRows('features2023.csv').filter((r) => r.pop >= 250);
  const Xraw = buildMatrix(rows23);
  const stats23 = columnStats(Xraw);
  const Z = standardize(Xraw, stats23.means, stats23.sds);
  const fittedProb = predictLogit(Z, model.logitW);
  const fittedGrowth = predictLinear(Z, model.linW);

  // ---- 2. mechanism simulation 2025-2065 ----
  const sim = runAgingSim({ epoch: '2023', years: 40, minPop: 250 });
  const simByGeoid = new Map<string, number>();
  for (let i = 0; i < sim.data.statics.n; i++) {
    simByGeoid.set(sim.data.statics.geoid[i], sim.simLogGrowth[i]);
  }

  // ---- pillars via the attraction module's own composites ----
  const att = attractionModule.init(attractionModule.mergeParams({ statics: sim.data.statics }));
  const pillarByGeoid = new Map<string, Record<string, number>>();
  for (let i = 0; i < sim.data.statics.n; i++) {
    pillarByGeoid.set(sim.data.statics.geoid[i], {
      engines: att.engines[i], human: att.human[i], access: att.access[i],
      regen: att.regen[i], gateway: att.gateway[i], amenity: att.amenity[i],
      scarcity: att.scarcity[i], distress: att.distress[i],
    });
  }

  // ---- 3+4. combine, valuation gap ----
  const simArr = rows23.map((r) => simByGeoid.get(r.geoid) ?? NaN);
  const zSim = zVec(simArr);
  const zFit = zVec(fittedGrowth);
  // Mechanism-dominant blend: the fitted model captures the historical
  // %-growth channel (which favored cheap-base convergence 2000-25); the
  // simulation captures forward aging dynamics — the construct this study
  // is about. See docs/STRESS_TEST.md ("the Boston test") for the rationale.
  // Winsorize each component at ±3 s.d. so one model's tail can't dominate.
  const w3 = (x: number): number => Math.max(-3, Math.min(3, x));
  const outlook = rows23.map((_, i) => 0.7 * w3(zSim[i]) + 0.3 * w3(zFit[i]));
  // Valuation: current price-to-income (ZHVI preferred, median value fallback)
  const pti = rows23.map((r) => {
    const price = r.raw.zhvi2025 ?? r.raw.medianValue;
    const inc = r.raw.medianHHInc;
    return price !== null && inc !== null && inc > 0 ? Math.log(price / inc) : NaN;
  });
  const zPti = zVec(pti);
  const valuationGap = rows23.map((_, i) => (Number.isFinite(pti[i]) ? outlook[i] - zPti[i] : null));

  // ---- 5. explainability ----
  const out: PlaceOut[] = rows23.map((r, i) => {
    const p = pillarByGeoid.get(r.geoid) ?? {};
    const contribs: [string, number][] = [
      ['engines', 0.30 * (p.engines ?? 0)],
      ['human', 0.25 * (p.human ?? 0)],
      ['access', 0.20 * (p.access ?? 0)],
      ['regen', 0.15 * (p.regen ?? 0)],
      ['gateway', 0.10 * (p.gateway ?? 0)],
      ['amenity', 0.45 * (p.amenity ?? 0)],
      ['scarcity', 0.15 * (p.scarcity ?? 0)],
      ['distress', -0.15 * (p.distress ?? 0)],
    ];
    const sorted = [...contribs].sort((a, b) => b[1] - a[1]);
    const positives = sorted.filter(([, v]) => v > 0.12).slice(0, 3).map(([k]) => PILLAR_LABELS[k]);
    const negatives = sorted.filter(([, v]) => v < -0.12).slice(-3).map(([k]) => PILLAR_LABELS[k]);

    const z = (name: string): number => {
      const j = MODEL_FEATURES.findIndex((f) => f.name === name);
      return j >= 0 ? Z[i][j] : 0;
    };
    const tags: string[] = [];
    // Knowledge Center = actual college town: resident students are a large
    // share of the place, not merely a university somewhere in the metro.
    const uni15 = r.raw.uniEnroll15 ?? 0;
    const collegeShare = r.raw.collegeShare ?? 0;
    if (collegeShare > 0.15 || (uni15 / Math.max(1, r.pop) > 0.5 && collegeShare > 0.08)) tags.push('Knowledge Center');
    if (z('healthEmpShare') > 1.5 && r.pop >= 20000) tags.push('Medical Hub');
    if (z('pubAdminShare') > 1.5) tags.push('Government Hub');
    if (z('armedShare') > 1.5) tags.push('Military Anchor');
    if ((p.engines ?? 0) > 0.8 && z('logPopAccess60') < 0 && r.pop >= 10000) tags.push('Regional Service Center');
    if (z('seasonalShare') > 1.0) tags.push('Amenity Destination');
    if (z('seasonalShare') > 0.5 && z('valueToIncome') > 1.5) tags.push('Prestige Destination');
    if (z('share65') > 1.5 && z('seasonalShare') > 0.3) tags.push('Retirement Market');
    if (z('logPopAccess60') > 1.0 && r.pop < 50000 && outlook[i] > 0) tags.push('Metro Spillover Market');
    if (z('share45_64') > 1.0 && z('repRatio') < -0.3) tags.push('Aging Trap');
    if ((p.engines ?? 0) < -0.8 && z('logPopAccess60') < -0.5) tags.push('Institutional Loser');
    if (z('repRatio') < -1.0 && z('share65') > 1.0 && outlook[i] < 0) tags.push('Demographic Loser');
    if (z('newBuildShare') > 1.5 && outlook[i] < 0) tags.push('Housing Overbuild');

    return {
      geoid: r.geoid, name: r.name, state: r.state, pop: r.pop,
      outlook: +outlook[i].toFixed(3),
      simGrowth: +(simArr[i] ?? 0).toFixed(3),
      fittedProb: +fittedProb[i].toFixed(3),
      fittedGrowth: +fittedGrowth[i].toFixed(3),
      valuationGap: valuationGap[i] === null ? null : +valuationGap[i]!.toFixed(3),
      zhvi2025: r.raw.zhvi2025, medianValue: r.raw.medianValue,
      pillars: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, +Number(v).toFixed(2)])),
      tags, positives, negatives,
    };
  });

  // ---- write outputs ----
  const header = [
    'geoid', 'name', 'state', 'pop', 'outlook', 'simGrowth', 'fittedProb', 'fittedGrowth',
    'valuationGap', 'zhvi2025', 'medianValue',
    'engines', 'human', 'access', 'regen', 'gateway', 'amenity', 'scarcity', 'distress',
    'tags', 'positives', 'negatives',
  ];
  const toRow = (o: PlaceOut): (string | number | null)[] => [
    o.geoid, o.name, o.state, o.pop, o.outlook, o.simGrowth, o.fittedProb, o.fittedGrowth,
    o.valuationGap, o.zhvi2025, o.medianValue,
    o.pillars.engines ?? null, o.pillars.human ?? null, o.pillars.access ?? null,
    o.pillars.regen ?? null, o.pillars.gateway ?? null, o.pillars.amenity ?? null,
    o.pillars.scarcity ?? null, o.pillars.distress ?? null,
    o.tags.join('; '), o.positives.join('; '), o.negatives.join('; '),
  ];
  writeCsv(path.join(OUT_DIR, 'forecast-all.csv.gz'), header, out.map(toRow));

  const eligible = out.filter((o) => o.pop >= 10000);
  const byOutlook = [...eligible].sort((a, b) => b.outlook - a.outlook);
  writeCsv(path.join(OUT_DIR, 'top100.csv'), header, byOutlook.slice(0, 100).map(toRow));
  writeCsv(path.join(OUT_DIR, 'bottom100.csv'), header, byOutlook.slice(-100).reverse().map(toRow));

  const valued = out.filter((o) => o.pop >= 5000 && o.valuationGap !== null && o.zhvi2025 !== null);
  const byGap = [...valued].sort((a, b) => (b.valuationGap ?? 0) - (a.valuationGap ?? 0));
  // Undervalued = genuinely strong outlook AND cheap relative to it — not
  // merely cheap (outlook >= 0.5 filters the "just poor and cheap" tail).
  writeCsv(path.join(OUT_DIR, 'undervalued.csv'), header,
    byGap.filter((o) => o.outlook >= 0.5).slice(0, 100).map(toRow));
  writeCsv(path.join(OUT_DIR, 'overvalued.csv'), header,
    byGap.filter((o) => o.outlook < 0).reverse().slice(0, 100).map(toRow));

  // Console preview for stress-testing
  console.log('=== TOP 25 (pop>=10k) ===');
  for (const o of byOutlook.slice(0, 25)) {
    console.log(`${o.outlook.toFixed(2).padStart(6)} ${o.name}, ${o.state} (pop ${o.pop}) [${o.tags.join('|')}]`);
  }
  console.log('=== BOTTOM 25 ===');
  for (const o of byOutlook.slice(-25).reverse()) {
    console.log(`${o.outlook.toFixed(2).padStart(6)} ${o.name}, ${o.state} (pop ${o.pop}) [${o.tags.join('|')}]`);
  }
  console.log('=== sanity: major cities ===');
  const majors: [string, string][] = [
    ['Boston city', 'MA'], ['New York city', 'NY'], ['San Francisco city', 'CA'],
    ['Chicago city', 'IL'], ['Detroit city', 'MI'], ['Ann Arbor city', 'MI'],
    ['Rochester city', 'MN'], ['Palo Alto city', 'CA'], ['Naples city', 'FL'],
    ['Youngstown city', 'OH'], ['Madison city', 'WI'], ['Boulder city', 'CO'],
    ['Chapel Hill town', 'NC'], ['Austin city', 'TX'], ['Seattle city', 'WA'],
    ['Washington city', 'DC'], ['Ithaca city', 'NY'], ['State College borough', 'PA'],
    ['Carmel-by-the-Sea city', 'CA'], ['Jackson town', 'WY'], ['Bozeman city', 'MT'],
    ['Durham CDP', 'NH'], ['Port Townsend city', 'WA'], ['The Villages CDP', 'FL'],
  ];
  for (const [nm, st] of majors) {
    const hit = out.find((o) => o.name === nm && o.state === st);
    if (!hit) { console.log(`${nm}, ${st}: NOT FOUND`); continue; }
    const rank = byOutlook.findIndex((o) => o.geoid === hit.geoid);
    console.log(`${hit.name}, ${hit.state}: outlook=${hit.outlook} rank=${rank >= 0 ? rank + 1 : 'sub-10k'}/${byOutlook.length} sim=${hit.simGrowth} fit=${hit.fittedGrowth} [${hit.tags.join('|')}]`);
  }
}

main();

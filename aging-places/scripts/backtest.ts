/**
 * Backtest: score every municipality using ONLY year-2000 information, then
 * validate predictions against realized 2000-2025 Zillow ZHVI growth.
 *
 * Objective per the research design: HIGH RECALL on future winners.
 * Reports recall, precision, ROC-AUC, and calibration on a held-out test set,
 * fits the production model on all data, and writes data/model.json.
 *
 * Usage: npx tsx aging-places/scripts/backtest.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, parseCsv, readCsvAuto } from './lib.js';
import {
  FeatureRow, MODEL_FEATURES, buildMatrix, columnStats, standardize,
  fitLogit, fitRidge, predictLogit, predictLinear, rocAuc, mulberry32,
} from '../src/scoring.js';

export function loadFeatureRows(file: string): FeatureRow[] {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, file)));
  const header = rows[0];
  const out: FeatureRow[] = [];
  for (const r of rows.slice(1)) {
    if (r.length < header.length) continue;
    const raw: Record<string, number | null> = {};
    for (let j = 0; j < header.length; j++) {
      const v = r[j];
      raw[header[j]] = v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null;
    }
    out.push({
      geoid: r[0], name: r[1], state: r[2], county: r[3],
      lat: Number(r[4]), lon: Number(r[5]), pop: Number(r[6]) || 0, raw,
    });
  }
  return out;
}

interface Metrics {
  n: number; auc: number;
  recall: number; precision: number; flaggedShare: number; threshold: number;
  calibration: { decile: number; meanPred: number; actualRate: number; n: number }[];
}

function evaluate(p: number[], y: number[], threshold: number): Metrics {
  const flagged: number[] = p.map((v) => (v >= threshold ? 1 : 0));
  const tp = y.reduce((s, yi, i) => s + (yi === 1 && flagged[i] === 1 ? 1 : 0), 0);
  const fp = flagged.reduce((s, f, i) => s + (f === 1 && y[i] === 0 ? 1 : 0), 0);
  const fn = y.reduce((s, yi, i) => s + (yi === 1 && flagged[i] === 0 ? 1 : 0), 0);
  const idx = p.map((v, i) => ({ v, y: y[i] })).sort((a, b) => a.v - b.v);
  const calibration: Metrics['calibration'] = [];
  const nDec = 10;
  for (let d = 0; d < nDec; d++) {
    const lo = Math.floor((d * idx.length) / nDec);
    const hi = Math.floor(((d + 1) * idx.length) / nDec);
    const slice = idx.slice(lo, hi);
    calibration.push({
      decile: d + 1,
      meanPred: +(slice.reduce((s, o) => s + o.v, 0) / slice.length).toFixed(3),
      actualRate: +(slice.reduce((s, o) => s + o.y, 0) / slice.length).toFixed(3),
      n: slice.length,
    });
  }
  return {
    n: p.length,
    auc: +rocAuc(p, y).toFixed(4),
    recall: +(tp / Math.max(1, tp + fn)).toFixed(3),
    precision: +(tp / Math.max(1, tp + fp)).toFixed(3),
    flaggedShare: +(flagged.reduce((s, v) => s + v, 0) / p.length).toFixed(3),
    threshold: +threshold.toFixed(4),
    calibration,
  };
}

/** Threshold achieving >= targetRecall on (p, y). */
function thresholdForRecall(p: number[], y: number[], targetRecall: number): number {
  const pos = p.filter((_, i) => y[i] === 1).sort((a, b) => b - a);
  if (pos.length === 0) return 0.5;
  const k = Math.min(pos.length - 1, Math.floor(targetRecall * pos.length));
  return pos[k];
}

function main(): void {
  const all = loadFeatureRows('features2000.csv');
  // Backtest universe: places with a real outcome and enough size for a
  // meaningful market (Zillow coverage below ~1k population is thin and noisy).
  const rows = all.filter(
    (r) => r.raw.logGrowth00_25 !== null && r.pop >= 1000
  );
  const growth = rows.map((r) => r.raw.logGrowth00_25 as number);

  // Winner definition: top quartile of national 2000-2025 log value growth.
  const sorted = [...growth].sort((a, b) => a - b);
  const q75 = sorted[Math.floor(sorted.length * 0.75)];
  const y: number[] = growth.map((g) => (g >= q75 ? 1 : 0));

  // Matrix
  const Xraw = buildMatrix(rows);
  const { means, sds } = columnStats(Xraw);
  const Z = standardize(Xraw, means, sds);

  // Split 70/30
  const rng = mulberry32(42);
  const isTest = rows.map(() => rng() < 0.3);
  const trainIdx = rows.map((_, i) => i).filter((i) => !isTest[i]);
  const testIdx = rows.map((_, i) => i).filter((i) => isTest[i]);
  const Ztr = trainIdx.map((i) => Z[i]);
  const ytr = trainIdx.map((i) => y[i]);
  const Zte = testIdx.map((i) => Z[i]);
  const yte = testIdx.map((i) => y[i]);

  const w = fitLogit(Ztr, ytr, { l2: 1e-3, lr: 0.5, iters: 600 });
  const ptr = predictLogit(Ztr, w);
  const pte = predictLogit(Zte, w);

  // High-recall operating point: catch 90% of winners on train.
  const thr = thresholdForRecall(ptr, ytr, 0.9);
  const mTrain = evaluate(ptr, ytr, thr);
  const mTest = evaluate(pte, yte, thr);

  // Large-place subset (pop >= 10k) — the markets that matter most.
  const bigTest = testIdx.filter((i) => rows[i].pop >= 10000);
  const mTestBig = evaluate(
    bigTest.map((i) => predictLogit([Z[i]], w)[0]),
    bigTest.map((i) => y[i]),
    thr
  );

  // Continuous expected-growth model. Fit on STATE-DEMEANED growth: the
  // theory (and the JP/DE evidence: Fukuoka vs rural Kyushu, Leipzig vs
  // Chemnitz) concerns within-region divergence, and demeaning removes the
  // 2000-25 coastal-state macro cycle that would otherwise dominate weights.
  const stateMean = new Map<string, { s: number; n: number }>();
  for (const i of trainIdx) {
    const st = rows[i].state;
    const acc = stateMean.get(st) ?? { s: 0, n: 0 };
    acc.s += growth[i]; acc.n++;
    stateMean.set(st, acc);
  }
  const natMean = growth.reduce((s, v) => s + v, 0) / growth.length;
  const demean = (i: number): number => {
    const acc = stateMean.get(rows[i].state);
    return growth[i] - (acc && acc.n >= 8 ? acc.s / acc.n : natMean);
  };
  const lin = fitRidge(trainIdx.map((i) => Z[i]), trainIdx.map((i) => demean(i)), 1e-2);
  const predTe = predictLinear(Zte, lin);
  const actTe = testIdx.map((i) => demean(i));
  const mY = actTe.reduce((s, v) => s + v, 0) / actTe.length;
  const ssTot = actTe.reduce((s, v) => s + (v - mY) ** 2, 0);
  const ssRes = actTe.reduce((s, v, i) => s + (v - predTe[i]) ** 2, 0);
  const r2 = 1 - ssRes / ssTot;
  // Rank correlation (Spearman via rank transform + Pearson)
  const rankOf = (a: number[]): number[] => {
    const order = a.map((v, i) => ({ v, i })).sort((x, z) => x.v - z.v);
    const ranks = new Array(a.length).fill(0);
    order.forEach((o, r) => { ranks[o.i] = r; });
    return ranks;
  };
  const ra = rankOf(actTe);
  const rp = rankOf(predTe);
  const mra = ra.reduce((s, v) => s + v, 0) / ra.length;
  const cov = ra.reduce((s, v, i) => s + (v - mra) * (rp[i] - mra), 0);
  const va = ra.reduce((s, v) => s + (v - mra) ** 2, 0);
  const vp = rp.reduce((s, v) => s + (v - mra) ** 2, 0);
  const spearman = cov / Math.sqrt(va * vp);

  // Refit production model on ALL rows (weights used by the forward forecast).
  const wAll = fitLogit(Z, y, { l2: 1e-3, lr: 0.5, iters: 600 });
  const allStateMean = new Map<string, { s: number; n: number }>();
  for (let i = 0; i < rows.length; i++) {
    const acc = allStateMean.get(rows[i].state) ?? { s: 0, n: 0 };
    acc.s += growth[i]; acc.n++;
    allStateMean.set(rows[i].state, acc);
  }
  const demeanAll = (i: number): number => {
    const acc = allStateMean.get(rows[i].state);
    return growth[i] - (acc && acc.n >= 8 ? acc.s / acc.n : natMean);
  };
  const linAll = fitRidge(Z, rows.map((_, i) => demeanAll(i)), 1e-2);
  const pAll = predictLogit(Z, wAll);
  const thrAll = thresholdForRecall(pAll, y, 0.9);

  const model = {
    features: MODEL_FEATURES.map((f) => f.name),
    means, sds,
    logitW: wAll, linW: linAll, threshold: thrAll,
    meta: {
      fitDate: '2026-07-15',
      universe: `US places pop>=1000 with ZHVI 2000 & 2025 (n=${rows.length})`,
      winnerDef: `top quartile of log(ZHVI2025/ZHVI2000), q75=${q75.toFixed(4)}`,
      outcome: 'Zillow ZHVI city-level, June obs',
      testMetrics: { train: mTrain, test: mTest, testBig: mTestBig, linR2: +r2.toFixed(3), spearman: +spearman.toFixed(3) },
    },
  };
  fs.writeFileSync(path.join(DATA_DIR, 'model.json'), JSON.stringify(model, null, 1));

  // ---- report ----
  const fw = MODEL_FEATURES.map((f, j) => ({ name: f.name, w: +w[j + 1].toFixed(3), wLin: +lin[j + 1].toFixed(4) }))
    .sort((a, b) => Math.abs(b.w) - Math.abs(a.w));
  console.log(`universe n=${rows.length}  winners(top-quartile)=${y.reduce((s, v) => s + v, 0)}  q75 logGrowth=${q75.toFixed(3)}`);
  console.log(`TRAIN  auc=${mTrain.auc} recall=${mTrain.recall} precision=${mTrain.precision} flagged=${mTrain.flaggedShare}`);
  console.log(`TEST   auc=${mTest.auc} recall=${mTest.recall} precision=${mTest.precision} flagged=${mTest.flaggedShare}`);
  console.log(`TEST>=10k auc=${mTestBig.auc} recall=${mTestBig.recall} precision=${mTestBig.precision} n=${mTestBig.n}`);
  console.log(`LIN    testR2=${r2.toFixed(3)} spearman=${spearman.toFixed(3)}`);
  console.log('calibration (test):', JSON.stringify(mTest.calibration));
  console.log('top |w| features:');
  for (const x of fw) console.log(`  ${x.name.padEnd(20)} logit=${String(x.w).padStart(7)}  lin=${x.wLin}`);

  // Notable misses: biggest actual winners scored below threshold (test set)
  const misses = testIdx
    .filter((i) => y[i] === 1 && predictLogit([Z[i]], w)[0] < thr)
    .sort((a, b) => growth[b] - growth[a])
    .slice(0, 15)
    .map((i) => `${rows[i].name}, ${rows[i].state} (pop ${rows[i].pop}, g=${growth[i].toFixed(2)})`);
  console.log('\nbiggest missed winners (test):');
  misses.forEach((m) => console.log('  ' + m));
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) main();

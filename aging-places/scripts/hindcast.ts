/**
 * Hindcast validation of the mechanism simulation: initialize with year-2000
 * data, run 25 years with theory-derived attraction weights (NOT fitted on
 * the outcome), and compare simulated place-level growth against realized
 * 2000-2025 ZHVI growth.
 *
 * This is the complement to backtest.ts: backtest validates the *statistical*
 * model via train/test split; hindcast validates the *mechanism* model whose
 * weights come from international evidence.
 */
import { runAgingSim } from '../src/simulation.js';
import { rocAuc } from '../src/scoring.js';

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  return cov / Math.sqrt(va * vb);
}

function spearman(a: number[], b: number[]): number {
  const rank = (x: number[]): number[] => {
    const order = x.map((v, i) => ({ v, i })).sort((p, q) => p.v - q.v);
    const r = new Array(x.length).fill(0);
    order.forEach((o, k) => { r[o.i] = k; });
    return r;
  };
  return pearson(rank(a), rank(b));
}

function main(): void {
  const res = runAgingSim({ epoch: '2000', years: 25, minPop: 1000 });
  const { data, simLogGrowth } = res;

  const sim: number[] = [];
  const act: number[] = [];
  const pops: number[] = [];
  for (let i = 0; i < data.statics.n; i++) {
    const o = data.outcome[i];
    if (o === null) continue;
    sim.push(simLogGrowth[i]);
    act.push(o);
    pops.push(data.statics.pop0[i]);
  }
  const q75 = [...act].sort((a, b) => a - b)[Math.floor(act.length * 0.75)];
  const y = act.map((g) => (g >= q75 ? 1 : 0));

  console.log(`hindcast n=${sim.length}`);
  console.log(`pearson=${pearson(sim, act).toFixed(3)} spearman=${spearman(sim, act).toFixed(3)} auc(top-quartile)=${rocAuc(sim, y).toFixed(3)}`);

  const bigIdx = sim.map((_, i) => i).filter((i) => pops[i] >= 10000);
  const simB = bigIdx.map((i) => sim[i]);
  const actB = bigIdx.map((i) => act[i]);
  const yB = bigIdx.map((i) => y[i]);
  console.log(`>=10k: n=${simB.length} pearson=${pearson(simB, actB).toFixed(3)} spearman=${spearman(simB, actB).toFixed(3)} auc=${rocAuc(simB, yB).toFixed(3)}`);

  // Dispersion check: simulated vs actual cross-sectional sd of log growth
  const sd = (x: number[]): number => {
    const m = x.reduce((s, v) => s + v, 0) / x.length;
    return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1));
  };
  console.log(`sd(sim)=${sd(sim).toFixed(3)} sd(actual)=${sd(act).toFixed(3)}`);
  console.log(`national meanPriceIndex path: start=${res.national.meanPriceIndex[0].toFixed(3)} end=${res.national.meanPriceIndex.at(-1)?.toFixed(3)}`);
  console.log(`natPop65Share end=${res.national.natPop65Share.at(-1)?.toFixed(3)} (actual 2025 ~0.18)`);
}

main();

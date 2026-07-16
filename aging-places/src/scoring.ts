/**
 * Municipal scoring: feature definitions and linear scorers shared by the
 * backtest (which fits weights on year-2000 data) and the forward simulation
 * (which consumes the fitted weights as attraction parameters).
 *
 * The feature set operationalizes the four capitals of THEORY.md:
 *   - Demographic Regeneration: repRatio, youngShare, share45_64 (single-cohort trap)
 *   - Institutional Concentration: eduEmpShare, healthEmpShare, pubAdminShare,
 *     armedShare, collegeShare, uniEnroll15/60
 *   - Amenity/Scarcity: seasonalShare, artsEmpShare, valueToIncome, density
 *   - Human capital & wealth: bachShare, gradShare, income, profInfoFireShare
 *   - Market access: popAccess60/120 (also the metro-spillover channel)
 *   - Supply side: newBuildShare, distressVacancy
 */

export interface FeatureRow {
  geoid: string;
  name: string;
  state: string;
  county: string;
  lat: number;
  lon: number;
  pop: number;
  raw: Record<string, number | null>;
}

/** Model feature names -> transform of raw columns. */
export const MODEL_FEATURES: { name: string; from: (r: Record<string, number | null>) => number | null }[] = [
  { name: 'repRatio', from: (r) => clip(r.repRatio, 0, 10) },
  { name: 'youngShare', from: (r) => r.youngShare },
  { name: 'share65', from: (r) => r.share65 },
  { name: 'share45_64', from: (r) => r.share45_64 },
  { name: 'eduEmpShare', from: (r) => r.eduEmpShare },
  { name: 'healthEmpShare', from: (r) => r.healthEmpShare },
  { name: 'pubAdminShare', from: (r) => r.pubAdminShare },
  { name: 'artsEmpShare', from: (r) => r.artsEmpShare },
  { name: 'profInfoFireShare', from: (r) => r.profInfoFireShare },
  { name: 'armedShare', from: (r) => r.armedShare },
  { name: 'bachShare', from: (r) => r.bachShare },
  { name: 'gradShare', from: (r) => r.gradShare },
  { name: 'collegeShare', from: (r) => clip(r.collegeShare, 0, 1) },
  { name: 'seasonalShare', from: (r) => r.seasonalShare },
  { name: 'distressVacancy', from: (r) => r.distressVacancy },
  { name: 'newBuildShare', from: (r) => r.newBuildShare },
  { name: 'foreignShare', from: (r) => r.foreignShare },
  // Prestige-gated value/income: raw V/I conflates prestige scarcity with
  // poverty-unaffordability. build-features.ts gates income against each
  // epoch's median, avoiding a fixed nominal-dollar threshold across eras.
  {
    name: 'prestigeVTI',
    from: (r) => clip(r.prestigeVTI, 0, 60),
  },
  { name: 'logIncome', from: (r) => logOrNull(r.medianHHInc) },
  { name: 'logDensity', from: (r) => log1pOrNull(r.density) },
  { name: 'logPop', from: (r) => logOrNull(r.pop) },
  { name: 'logPopAccess60', from: (r) => log1pOrNull(r.popAccess60) },
  { name: 'logPopAccess120', from: (r) => log1pOrNull(r.popAccess120) },
  { name: 'logUni15', from: (r) => log1pOrNull(r.uniEnroll15) },
  { name: 'logUni60', from: (r) => log1pOrNull(r.uniEnroll60) },
];

function clip(v: number | null, lo: number, hi: number): number | null {
  if (v === null) return null;
  return Math.min(hi, Math.max(lo, v));
}
function logOrNull(v: number | null): number | null {
  return v !== null && v > 0 ? Math.log(v) : null;
}
function log1pOrNull(v: number | null): number | null {
  return v !== null && v >= 0 ? Math.log1p(v) : null;
}

export interface ModelSpec {
  features: string[];
  means: number[];
  sds: number[];
  /** Logistic weights (winner classification), incl. intercept at index 0. */
  logitW: number[];
  /** Linear weights (expected log growth), incl. intercept at index 0. */
  linW: number[];
  /** Operating threshold on P(winner) chosen for high recall. */
  threshold: number;
  /** Cross-epoch preprocessing contract. */
  preprocessing?: 'epoch_zscore';
  statisticalScore?: string;
  meta: Record<string, unknown>;
}

/** Build the raw (untransformed) model matrix; nulls stay null for later imputation. */
export function buildMatrix(rows: FeatureRow[]): (number | null)[][] {
  return rows.map((row) => MODEL_FEATURES.map((f) => f.from(row.raw)));
}

/** Standardize with given means/sds, imputing nulls at the mean (=> z of 0). */
export function standardize(X: (number | null)[][], means: number[], sds: number[]): number[][] {
  return X.map((row) =>
    row.map((v, j) => (v === null || sds[j] === 0 ? 0 : (v - means[j]) / sds[j]))
  );
}

export function columnStats(X: (number | null)[][]): { means: number[]; sds: number[] } {
  const nf = X[0]?.length ?? 0;
  const means = new Array(nf).fill(0);
  const sds = new Array(nf).fill(0);
  for (let j = 0; j < nf; j++) {
    const vals = X.map((r) => r[j]).filter((v): v is number => v !== null);
    const m = vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length);
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, vals.length - 1));
    means[j] = m;
    sds[j] = sd;
  }
  return { means, sds };
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function predictLogit(Z: number[][], w: number[]): number[] {
  return Z.map((row) => sigmoid(w[0] + row.reduce((s, v, j) => s + v * w[j + 1], 0)));
}

export function predictLinear(Z: number[][], w: number[]): number[] {
  return Z.map((row) => w[0] + row.reduce((s, v, j) => s + v * w[j + 1], 0));
}

/** Logistic regression via gradient descent with L2 regularization. */
export function fitLogit(
  Z: number[][], y: number[], opts: { l2?: number; lr?: number; iters?: number } = {}
): number[] {
  const { l2 = 1e-3, lr = 0.5, iters = 400 } = opts;
  const n = Z.length;
  const nf = Z[0].length;
  let w = new Array(nf + 1).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array(nf + 1).fill(0);
    for (let i = 0; i < n; i++) {
      const p = sigmoid(w[0] + Z[i].reduce((s, v, j) => s + v * w[j + 1], 0));
      const err = p - y[i];
      grad[0] += err;
      for (let j = 0; j < nf; j++) grad[j + 1] += err * Z[i][j];
    }
    for (let j = 0; j <= nf; j++) {
      const reg = j === 0 ? 0 : l2 * w[j];
      w[j] -= lr * (grad[j] / n + reg);
    }
  }
  return w;
}

/** Ridge regression via normal equations (Gaussian elimination). */
export function fitRidge(Z: number[][], y: number[], l2 = 1e-2): number[] {
  const n = Z.length;
  const nf = Z[0].length;
  const d = nf + 1;
  // X'X with intercept column
  const A: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  const b = new Array(d).fill(0);
  for (let i = 0; i < n; i++) {
    const xi = [1, ...Z[i]];
    for (let j = 0; j < d; j++) {
      b[j] += xi[j] * y[i];
      for (let k = j; k < d; k++) A[j][k] += xi[j] * xi[k];
    }
  }
  for (let j = 0; j < d; j++) for (let k = 0; k < j; k++) A[j][k] = A[k][j];
  for (let j = 1; j < d; j++) A[j][j] += l2 * n;
  // Solve A w = b
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < d; col++) {
    let piv = col;
    for (let r = col + 1; r < d; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const pv = M[col][col];
    if (Math.abs(pv) < 1e-12) continue;
    for (let r = 0; r < d; r++) {
      if (r === col) continue;
      const factor = M[r][col] / pv;
      for (let c = col; c <= d; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[d] / row[i]));
}

/** ROC-AUC via the rank-sum (Mann-Whitney) statistic. */
export function rocAuc(scores: number[], y: number[]): number {
  const pairs = scores.map((s, i) => ({ s, y: y[i] })).sort((a, b) => a.s - b.s);
  let rank = 1;
  let sumRankPos = 0;
  let nPos = 0;
  let i = 0;
  while (i < pairs.length) {
    let j = i;
    while (j < pairs.length && pairs[j].s === pairs[i].s) j++;
    const avgRank = (rank + rank + (j - i) - 1) / 2;
    for (let k = i; k < j; k++) {
      if (pairs[k].y === 1) { sumRankPos += avgRank; nPos++; }
    }
    rank += j - i;
    i = j;
  }
  const nNeg = pairs.length - nPos;
  if (nPos === 0 || nNeg === 0) return NaN;
  return (sumRankPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

/** Deterministic PRNG for reproducible splits. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Real-time payroll trend with revision noise.
 *
 * The 6 September 2026 pass read the trend as the plain average of the three
 * latest prints, with the BLS sampling interval as its only error. That treats
 * a first print as unbiased and as good as a third. It is neither: from 2022
 * to 2025 the third estimate came in on average 27k below the first, with a
 * revision sd of ~50k on top of sampling error.
 *
 * This module filters the trend instead. The true monthly change is a local
 * level (a random-walk trend plus monthly noise); each month enters at the
 * vintage visible on the release date, with that vintage's revision variance
 * added and its mean revision subtracted. Revision means come from a trailing
 * window of revisions already known on the release date, so the backtest is
 * real-time: nothing from after a release is used to estimate it.
 *
 * The trend and noise variances are fitted by maximum likelihood on third
 * estimates before the backtest window.
 */

import { normalCdf } from '../../primitives/math.js';
import { PAYROLL_VINTAGES, PAYROLL_VINTAGE_START, type PayrollVintage } from './payroll-vintages.js';

export interface PayrollFilterParams {
  /** Monthly sd of the trend's random walk, thousands. */
  trendInnovationSd: number;
  /** Sd of a third estimate around the trend: sampling error plus genuine month-to-month noise. */
  thirdEstimateNoiseSd: number;
  /** Months of known revisions used for the mean revision (bias); 0 = no bias correction. */
  biasWindowMonths: number;
}

/** Fitted on 2022–2025 third estimates (see `fitLocalLevel`); bias window chosen on the 2024–2026 backtest. */
export const defaultPayrollFilterParams: PayrollFilterParams = {
  trendInnovationSd: 35,
  thirdEstimateNoiseSd: 90,
  biasWindowMonths: 24,
};

const monthLabel = (index: number): string => {
  const total = PAYROLL_VINTAGE_START.year * 12 + PAYROLL_VINTAGE_START.month - 1 + index;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[total % 12]} ${Math.floor(total / 12)}`;
};

export const payrollMonthIndex = (year: number, month: number): number =>
  (year - PAYROLL_VINTAGE_START.year) * 12 + (month - PAYROLL_VINTAGE_START.month);

/**
 * What a release for reference month `release` showed for month `m`: the
 * highest published vintage no later than the release (lag 0 = first print,
 * 1 = second, 2+ = third). Returns the 0-based vintage and value.
 */
export function visibleVintage(
  m: number,
  release: number,
  vintages: readonly PayrollVintage[] = PAYROLL_VINTAGES,
): { vintage: 0 | 1 | 2; value: number } | null {
  const lag = release - m;
  if (lag < 0) return null;
  const row = vintages[m];
  if (!row) return null;
  for (let v = Math.min(lag, 2); v >= 0; v -= 1) {
    const value = row[v];
    if (value !== null && value !== undefined) return { vintage: v as 0 | 1 | 2, value };
  }
  return null;
}

export interface RevisionStats {
  /** Mean and sd of (third − first) and (third − second), from revisions known at the release. */
  firstToThirdMean: number;
  firstToThirdSd: number;
  secondToThirdMean: number;
  secondToThirdSd: number;
  count: number;
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: readonly number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

/** Revisions whose third estimate had been published by `release`, optionally only the latest `window` months. */
export function revisionStats(
  release: number,
  window = Infinity,
  vintages: readonly PayrollVintage[] = PAYROLL_VINTAGES,
): RevisionStats {
  const r1: number[] = [];
  const r2: number[] = [];
  for (let m = 0; m <= release - 2; m += 1) {
    if (release - m >= 2 + window) continue;
    const [a, b, c] = vintages[m] ?? [null, null, null];
    if (c === null) continue;
    if (a !== null) r1.push(c - a);
    if (b !== null) r2.push(c - b);
  }
  return {
    firstToThirdMean: mean(r1),
    firstToThirdSd: sd(r1),
    secondToThirdMean: mean(r2),
    secondToThirdSd: sd(r2),
    count: r1.length,
  };
}

interface Observation {
  value: number;
  extraVariance: number;
}

function localLevel(
  observations: readonly (Observation | null)[],
  q: number,
  h: number,
): { level: number[]; variance: number[]; logLikelihood: number } {
  const first = observations.find((o) => o !== null);
  let mu = first?.value ?? 0;
  let p = 1e6;
  let ll = 0;
  const level: number[] = [];
  const variance: number[] = [];
  observations.forEach((o, i) => {
    if (i > 0) p += q;
    if (o) {
      const s = p + h + o.extraVariance;
      const k = p / s;
      const e = o.value - mu;
      if (i > 0) ll += -0.5 * (Math.log(2 * Math.PI * s) + (e * e) / s);
      mu += k * e;
      p *= 1 - k;
    }
    level.push(mu);
    variance.push(p);
  });
  return { level, variance, logLikelihood: ll };
}

/**
 * Maximum-likelihood trend and noise sds on third estimates through
 * `lastMonth` (grid, 5k steps). Used once to set the defaults.
 */
export function fitLocalLevel(lastMonth: number): { trendInnovationSd: number; thirdEstimateNoiseSd: number } {
  const obs = PAYROLL_VINTAGES.slice(0, lastMonth + 1).map((row) =>
    row[2] === null ? null : { value: row[2], extraVariance: 0 },
  );
  let best = { ll: -Infinity, q: 0, h: 0 };
  for (let q = 5; q <= 80; q += 5) {
    for (let h = 30; h <= 140; h += 5) {
      const { logLikelihood } = localLevel(obs, q * q, h * h);
      if (logLikelihood > best.ll) best = { ll: logLikelihood, q, h };
    }
  }
  return { trendInnovationSd: best.q, thirdEstimateNoiseSd: best.h };
}

export interface PayrollTrendEstimate {
  releaseLabel: string;
  /** Filtered trend at the release month, thousands per month, and its sd. */
  trend: number;
  trendSd: number;
  /** The 6 September method: the plain average of the three latest prints. */
  naiveThreeMonth: number;
  /** Mean revisions applied (added to first and second prints). */
  firstPrintBias: number;
  secondPrintBias: number;
  revisionSdFirst: number;
  revisionSdSecond: number;
  probabilityAbove: (thousand: number) => number;
}

/** The filtered trend as of the release for reference month `release`, using only what was published then. */
export function payrollTrendAt(
  release: number,
  params: PayrollFilterParams = defaultPayrollFilterParams,
): PayrollTrendEstimate {
  const all = revisionStats(release);
  const windowed = params.biasWindowMonths > 0 ? revisionStats(release, params.biasWindowMonths) : null;
  const b1 = windowed ? windowed.firstToThirdMean : 0;
  const b2 = windowed ? windowed.secondToThirdMean : 0;
  const obs: (Observation | null)[] = [];
  for (let m = 0; m <= release; m += 1) {
    const seen = visibleVintage(m, release);
    if (!seen) {
      obs.push(null);
      continue;
    }
    if (seen.vintage === 2) obs.push({ value: seen.value, extraVariance: 0 });
    else if (seen.vintage === 1) obs.push({ value: seen.value + b2, extraVariance: all.secondToThirdSd ** 2 });
    else obs.push({ value: seen.value + b1, extraVariance: all.firstToThirdSd ** 2 });
  }
  const run = localLevel(obs, params.trendInnovationSd ** 2, params.thirdEstimateNoiseSd ** 2);
  const trend = run.level[release] ?? Number.NaN;
  const trendSd = Math.sqrt(run.variance[release] ?? Number.NaN);
  const recent = [release - 2, release - 1, release]
    .map((m) => visibleVintage(m, release))
    .filter((x): x is { vintage: 0 | 1 | 2; value: number } => x !== null);
  return {
    releaseLabel: monthLabel(release),
    trend,
    trendSd,
    naiveThreeMonth: mean(recent.map((r) => r.value)),
    firstPrintBias: b1,
    secondPrintBias: b2,
    revisionSdFirst: all.firstToThirdSd,
    revisionSdSecond: all.secondToThirdSd,
    probabilityAbove: (thousand: number) => 1 - normalCdf((thousand - trend) / trendSd),
  };
}

export interface PayrollBacktest {
  releases: number;
  firstRelease: string;
  lastRelease: string;
  /** Against the ex-post smoothed trend (latest vintages, same model). */
  smoothedTarget: { naiveRmse: number; naiveMeanError: number; filterRmse: number; filterMeanError: number; noBiasRmse: number };
  /** Against a model-free target: the centred five-month mean of the latest vintages. */
  centredTarget: { naiveRmse: number; naiveMeanError: number; filterRmse: number; filterMeanError: number; noBiasRmse: number };
}

/** Real-time backtest over releases `from`..`to` (reference-month indices). */
export function backtestPayrollTrend(
  from: number,
  to: number,
  params: PayrollFilterParams = defaultPayrollFilterParams,
): PayrollBacktest {
  const last = PAYROLL_VINTAGES.length - 1;
  const latest = (m: number): number | null => {
    const row = PAYROLL_VINTAGES[m];
    if (!row) return null;
    return row[2] ?? row[1] ?? row[0];
  };
  // Ex-post trend: RTS smoother over the latest vintages.
  const stats = revisionStats(last);
  const obs = PAYROLL_VINTAGES.map((row) => {
    const v = visibleVintage(PAYROLL_VINTAGES.indexOf(row), last);
    if (!v) return null;
    const extra = v.vintage === 2 ? 0 : v.vintage === 1 ? stats.secondToThirdSd ** 2 : stats.firstToThirdSd ** 2;
    return { value: v.value, extraVariance: extra };
  });
  const q = params.trendInnovationSd ** 2;
  const filtered = localLevel(obs, q, params.thirdEstimateNoiseSd ** 2);
  const smoothed = [...filtered.level];
  for (let i = smoothed.length - 2; i >= 0; i -= 1) {
    const predicted = filtered.variance[i]! + q;
    const gain = filtered.variance[i]! / predicted;
    smoothed[i] = filtered.level[i]! + gain * (smoothed[i + 1]! - filtered.level[i]!);
  }
  const centred = (m: number): number | null => {
    if (m + 2 > last) return null;
    const xs = [m - 2, m - 1, m, m + 1, m + 2].map(latest).filter((x): x is number => x !== null);
    return mean(xs);
  };
  const score = (target: (m: number) => number | null) => {
    const naive: number[] = [];
    const filter: number[] = [];
    const noBias: number[] = [];
    for (let m = from; m <= to; m += 1) {
      const t = target(m);
      if (t === null) continue;
      const est = payrollTrendAt(m, params);
      naive.push(est.naiveThreeMonth - t);
      filter.push(est.trend - t);
      noBias.push(payrollTrendAt(m, { ...params, biasWindowMonths: 0 }).trend - t);
    }
    const rmse = (xs: number[]) => Math.sqrt(mean(xs.map((x) => x * x)));
    return {
      naiveRmse: rmse(naive),
      naiveMeanError: mean(naive),
      filterRmse: rmse(filter),
      filterMeanError: mean(filter),
      noBiasRmse: rmse(noBias),
    };
  };
  return {
    releases: to - from + 1,
    firstRelease: monthLabel(from),
    lastRelease: monthLabel(to),
    smoothedTarget: score((m) => smoothed[m] ?? null),
    centredTarget: score(centred),
  };
}

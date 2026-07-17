import { mulberry32 } from '../../src/scoring.js';

export interface LocalObservation {
  market: string;
  score: number;
  outcome: number;
}
export interface LocalMetrics {
  n: number;
  markets: number;
  marketsWithDefinedSpearman: number;
  pooledCenteredSpearman: number | null;
  meanWithinMarketSpearman: number | null;
  medianWithinMarketSpearman: number | null;
  meanWithinMarketPairwiseAccuracy: number | null;
}

export interface LocalEvaluation {
  metrics: LocalMetrics;
  spearmanByMarket: Map<string, number>;
}

export interface ConditionalAllocationUnit {
  originWorking: number;
  demographicEndpoint: number;
  observedEndpoint: number;
  attraction: number;
  annualMoverRate: number;
}

export interface ConditionalAllocationResult {
  predictedEndpoint: number[];
  predictedLogChange: number[];
  baselineScaleToObservedNationalTotal: number;
  effectiveAnnualMoverRate: number;
  fiveYearMovedFraction: number;
  observedEndpointTotal: number;
  predictedEndpointTotal: number;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function percentile(values: number[], q: number): number {
  if (values.length === 0) return NaN;
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.min(ordered.length - 1, Math.max(0, Math.floor(q * ordered.length)));
  return ordered[index];
}

function ranks(values: number[]): number[] {
  const ordered = values.map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);
  const result = new Array(values.length).fill(0);
  let i = 0;
  while (i < ordered.length) {
    let j = i + 1;
    while (j < ordered.length && ordered[j].value === ordered[i].value) j++;
    const rank = (i + j - 1) / 2;
    for (let k = i; k < j; k++) result[ordered[k].index] = rank;
    i = j;
  }
  return result;
}

function pearson(first: number[], second: number[]): number {
  if (first.length !== second.length || first.length < 2) return NaN;
  const firstMean = mean(first);
  const secondMean = mean(second);
  let covariance = 0;
  let firstVariance = 0;
  let secondVariance = 0;
  for (let i = 0; i < first.length; i++) {
    covariance += (first[i] - firstMean) * (second[i] - secondMean);
    firstVariance += (first[i] - firstMean) ** 2;
    secondVariance += (second[i] - secondMean) ** 2;
  }
  return firstVariance > 0 && secondVariance > 0
    ? covariance / Math.sqrt(firstVariance * secondVariance)
    : NaN;
}

export function spearman(first: number[], second: number[]): number {
  return pearson(ranks(first), ranks(second));
}

function pairwiseAccuracy(score: number[], outcome: number[]): number {
  let correct = 0;
  let comparable = 0;
  for (let i = 0; i < score.length; i++) {
    for (let j = i + 1; j < score.length; j++) {
      const actual = Math.sign(outcome[i] - outcome[j]);
      if (actual === 0) continue;
      const predicted = Math.sign(score[i] - score[j]);
      comparable++;
      if (predicted === actual) correct++;
      else if (predicted === 0) correct += 0.5;
    }
  }
  return comparable > 0 ? correct / comparable : NaN;
}

function rounded(value: number): number | null {
  return Number.isFinite(value) ? +value.toFixed(4) : null;
}

export function evaluateLocal(
  observations: LocalObservation[],
  minimumUnits = 5,
): LocalEvaluation {
  const finite = observations.filter(
    (row) => Number.isFinite(row.score) && Number.isFinite(row.outcome) && row.market !== '',
  );
  const grouped = new Map<string, LocalObservation[]>();
  for (const row of finite) {
    const group = grouped.get(row.market) ?? [];
    group.push(row);
    grouped.set(row.market, group);
  }
  const eligible = new Map(
    [...grouped].filter(([, rows]) => rows.length >= minimumUnits),
  );
  const centeredScore: number[] = [];
  const centeredOutcome: number[] = [];
  const spearmanByMarket = new Map<string, number>();
  const pairwiseByMarket = new Map<string, number>();
  for (const [market, rows] of eligible) {
    const scores = rows.map((row) => row.score);
    const outcomes = rows.map((row) => row.outcome);
    const scoreMean = mean(scores);
    const outcomeMean = mean(outcomes);
    centeredScore.push(...scores.map((value) => value - scoreMean));
    centeredOutcome.push(...outcomes.map((value) => value - outcomeMean));
    const correlation = spearman(scores, outcomes);
    const pairwise = pairwiseAccuracy(scores, outcomes);
    if (Number.isFinite(correlation)) spearmanByMarket.set(market, correlation);
    if (Number.isFinite(pairwise)) pairwiseByMarket.set(market, pairwise);
  }
  const correlations = [...spearmanByMarket.values()];
  const pairwise = [...pairwiseByMarket.values()];
  return {
    metrics: {
      n: [...eligible.values()].reduce((total, rows) => total + rows.length, 0),
      markets: eligible.size,
      marketsWithDefinedSpearman: correlations.length,
      pooledCenteredSpearman: rounded(spearman(centeredScore, centeredOutcome)),
      meanWithinMarketSpearman: rounded(mean(correlations)),
      medianWithinMarketSpearman: rounded(median(correlations)),
      meanWithinMarketPairwiseAccuracy: rounded(mean(pairwise)),
    },
    spearmanByMarket,
  };
}

export function bootstrapDifference(
  first: Map<string, number>,
  second: Map<string, number>,
  iterations = 4000,
  seed = 20250716,
): { markets: number; meanDifference: number | null; ci95: [number | null, number | null] } {
  const markets = [...first.keys()].filter((market) => second.has(market)).sort();
  const differences = markets.map((market) => first.get(market)! - second.get(market)!);
  if (differences.length === 0) return { markets: 0, meanDifference: null, ci95: [null, null] };
  const rng = mulberry32(seed);
  const draws: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    let total = 0;
    for (let i = 0; i < differences.length; i++) {
      total += differences[Math.floor(rng() * differences.length)];
    }
    draws.push(total / differences.length);
  }
  return {
    markets: differences.length,
    meanDifference: rounded(mean(differences)),
    ci95: [rounded(percentile(draws, 0.025)), rounded(percentile(draws, 0.975))],
  };
}

/** Stable whole-market fold assignment, frozen by origin year and basin ID. */
export function marketFold(year: number, market: string, folds = 5): number {
  const value = `${year}:${market}`;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % folds;
}

/** Convert a cross-sectional feature to a centered, unit-SD percentile rank. */
export function percentileStandardize(values: number[]): number[] {
  if (values.length <= 1) return values.map(() => 0);
  const ranked = ranks(values).map((rank) => rank / (values.length - 1));
  const center = mean(ranked);
  const sd = Math.sqrt(
    ranked.reduce((total, value) => total + (value - center) ** 2, 0)
    / Math.max(1, ranked.length - 1),
  ) || 1;
  return ranked.map((value) => (value - center) / sd);
}

/**
 * Five-year conditional allocation using the US mechanism's frozen working
 * mover rates and beta. The observed endpoint enters only as a national-total
 * constraint; municipal endpoint shares remain predictions.
 */
export function conditionalWorkingAllocation(
  units: ConditionalAllocationUnit[],
  years = 5,
  beta = 0.5,
): ConditionalAllocationResult {
  if (units.length === 0) throw new Error('conditional allocation requires at least one unit');
  const observedEndpointTotal = units.reduce((sum, unit) => sum + unit.observedEndpoint, 0);
  const demographicTotal = units.reduce((sum, unit) => sum + unit.demographicEndpoint, 0);
  if (observedEndpointTotal <= 0 || demographicTotal <= 0) {
    throw new Error('conditional allocation requires positive endpoint totals');
  }
  const originTotal = units.reduce((sum, unit) => sum + unit.originWorking, 0);
  const effectiveAnnualMoverRate = units.reduce(
    (sum, unit) => sum + unit.annualMoverRate * unit.originWorking, 0,
  ) / originTotal;
  const fiveYearMovedFraction = 1 - (1 - effectiveAnnualMoverRate) ** years;
  const baselineScaleToObservedNationalTotal = observedEndpointTotal / demographicTotal;
  const scaledBaseline = units.map(
    (unit) => unit.demographicEndpoint * baselineScaleToObservedNationalTotal,
  );
  const weights = units.map(
    (unit, index) => scaledBaseline[index] * Math.exp(Math.max(-8, Math.min(8, beta * unit.attraction))),
  );
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const predictedEndpoint = units.map((unit, index) => (
    (1 - fiveYearMovedFraction) * scaledBaseline[index]
    + fiveYearMovedFraction * observedEndpointTotal * weights[index] / weightTotal
  ));
  const predictedLogChange = units.map((unit, index) => (
    Math.log(predictedEndpoint[index] / unit.originWorking)
  ));
  return {
    predictedEndpoint,
    predictedLogChange,
    baselineScaleToObservedNationalTotal,
    effectiveAnnualMoverRate,
    fiveYearMovedFraction,
    observedEndpointTotal,
    predictedEndpointTotal: predictedEndpoint.reduce((sum, value) => sum + value, 0),
  };
}

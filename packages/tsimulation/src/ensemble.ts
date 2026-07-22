import type { ModelDefinition } from './model.js';
import { runModel } from './model.js';

export type RandomSource = () => number;

export function seededRandom(seed: number): RandomSource {
  if (!Number.isInteger(seed)) throw new Error('Random seed must be an integer');
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function quantile(values: readonly number[], probability: number): number {
  if (values.length === 0) throw new Error('Cannot take a quantile of an empty series');
  if (!(probability >= 0 && probability <= 1)) throw new Error('Quantile probability must be in [0, 1]');
  if (values.some((value) => !Number.isFinite(value))) throw new Error('Quantile values must be finite');
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
}

export function latinHypercube(
  draws: number,
  dimensions: readonly string[],
  random: RandomSource,
): Array<Record<string, number>> {
  if (!Number.isInteger(draws) || draws < 1) throw new Error('Latin-hypercube draws must be >= 1');
  const samples = Array.from({ length: draws }, () => ({} as Record<string, number>));
  for (const dimension of dimensions) {
    const strata = Array.from({ length: draws }, (_, index) => (index + random()) / draws);
    for (let index = strata.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1));
      [strata[index], strata[swap]] = [strata[swap], strata[index]];
    }
    strata.forEach((value, index) => { samples[index][dimension] = value; });
  }
  return samples;
}

function ranks(values: readonly number[]): number[] {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = Array(values.length).fill(0) as number[];
  let start = 0;
  while (start < sorted.length) {
    let end = start + 1;
    while (end < sorted.length && sorted[end].value === sorted[start].value) end++;
    const rank = (start + end - 1) / 2 + 1;
    for (let index = start; index < end; index++) result[sorted[index].index] = rank;
    start = end;
  }
  return result;
}

function correlation(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length < 2) return 0;
  const leftMean = left.reduce((a, b) => a + b, 0) / left.length;
  const rightMean = right.reduce((a, b) => a + b, 0) / right.length;
  let numerator = 0;
  let leftSum = 0;
  let rightSum = 0;
  for (let index = 0; index < left.length; index++) {
    const l = left[index] - leftMean;
    const r = right[index] - rightMean;
    numerator += l * r;
    leftSum += l * l;
    rightSum += r * r;
  }
  const denominator = Math.sqrt(leftSum * rightSum);
  return denominator > 0 ? numerator / denominator : 0;
}

export interface EnsembleSample<TInput> {
  input: TInput;
  parameters?: Readonly<Record<string, number>>;
}

export interface EnsembleMetricSummary {
  mean: number;
  min: number;
  max: number;
  quantiles: Record<string, number>;
}

export interface EnsembleResult<TOutput> {
  seed: number;
  draws: number;
  outputs: TOutput[];
  metrics: Record<string, EnsembleMetricSummary>;
  rankSensitivity: Record<string, Record<string, number>>;
}

export function runEnsemble<TInput, TOutput>(options: {
  model: ModelDefinition<TInput, TOutput>;
  draws: number;
  seed: number;
  sample: (random: RandomSource, draw: number) => EnsembleSample<TInput>;
  metrics: Readonly<Record<string, (output: TOutput) => number>>;
  quantiles?: readonly number[];
}): EnsembleResult<TOutput> {
  if (!Number.isInteger(options.draws) || options.draws < 1) throw new Error('Ensemble draws must be >= 1');
  const random = seededRandom(options.seed);
  const outputs: TOutput[] = [];
  const parameterRows: Array<Readonly<Record<string, number>>> = [];
  for (let draw = 0; draw < options.draws; draw++) {
    const sample = options.sample(random, draw);
    parameterRows.push(sample.parameters ?? {});
    outputs.push(runModel(options.model, sample.input, { seed: options.seed, runLabel: `draw-${draw}` }).output);
  }
  const probabilities = options.quantiles ?? [0.05, 0.5, 0.95];
  const metricValues = Object.fromEntries(Object.entries(options.metrics).map(([name, metric]) => {
    const values = outputs.map(metric);
    if (values.some((value) => !Number.isFinite(value))) throw new Error(`Ensemble metric '${name}' is non-finite`);
    return [name, values];
  })) as Record<string, number[]>;
  const metrics = Object.fromEntries(Object.entries(metricValues).map(([name, values]) => [name, {
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    quantiles: Object.fromEntries(probabilities.map((p) => [String(p), quantile(values, p)])),
  } satisfies EnsembleMetricSummary]));
  const parameterNames = [...new Set(parameterRows.flatMap((row) => Object.keys(row)))];
  const rankSensitivity = Object.fromEntries(parameterNames.map((parameter) => {
    const parameterValues = parameterRows.map((row) => row[parameter] ?? 0);
    return [parameter, Object.fromEntries(Object.entries(metricValues).map(([metric, values]) => [
      metric,
      correlation(ranks(parameterValues), ranks(values)),
    ]))];
  }));
  return { seed: options.seed, draws: options.draws, outputs, metrics, rankSensitivity };
}

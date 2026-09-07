import type { ModelDefinition } from './model.js';
import {
  type TaskExecutor,
  type TaskRef,
  serialExecutor,
  orderTaskResults,
} from './executor.js';
import { runModel } from './model.js';
import {
  experimentInterpretation,
  validateExperiment,
  validateExperimentSample,
  type ExperimentContract,
  type ExperimentResultInterpretation,
} from './study.js';

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
  variables?: Readonly<Record<string, unknown>>;
}

export interface ProbabilityMetricSummary {
  kind: 'probability';
  mean: number;
  min: number;
  max: number;
  quantiles: Record<string, number>;
}

export interface DesignMetricSummary {
  kind: 'design-sample';
  designMean: number;
  min: number;
  max: number;
  /** Percentiles of sampled design points; these are not probabilities. */
  empiricalPercentiles: Record<string, number>;
}

export interface EpistemicMetricSummary {
  kind: 'epistemic-possibility';
  lower: number;
  upper: number;
  sampledPossibilities: number;
}

export type EnsembleMetricSummary =
  | ProbabilityMetricSummary
  | DesignMetricSummary
  | EpistemicMetricSummary;

export interface EnsembleResult<TOutput> {
  seed: number;
  draws: number;
  outputs: TOutput[];
  metrics: Record<string, EnsembleMetricSummary>;
  rankSensitivity: Record<string, Record<string, number>>;
  experiment?: ExperimentContract;
  interpretation: ExperimentResultInterpretation;
}

export interface EpistemicCase<TContext> {
  id: string;
  context: TContext;
}

export interface NestedMetricSummary {
  kind: 'nested-aleatory-epistemic';
  byEpistemicCase: Readonly<Record<string, ProbabilityMetricSummary>>;
  meanRange: { lower: number; upper: number };
  quantileEnvelope: Readonly<Record<string, { lower: number; upper: number }>>;
}

export interface NestedEnsembleResult<TOutput, TContext> {
  seed: number;
  aleatoryDrawsPerCase: number;
  experiment: ExperimentContract;
  interpretation: 'nested-aleatory-epistemic';
  families: readonly {
    epistemicCase: EpistemicCase<TContext>;
    outputs: readonly TOutput[];
  }[];
  metrics: Readonly<Record<string, NestedMetricSummary>>;
}

export interface EnsembleOptions<TInput, TOutput> {
  model: ModelDefinition<TInput, TOutput>;
  draws: number;
  seed: number;
  sample: (random: RandomSource, draw: number) => EnsembleSample<TInput>;
  metrics: Readonly<Record<string, (output: TOutput) => number>>;
  quantiles?: readonly number[];
  experiment?: ExperimentContract;
  /**
   * Serializable handle to this model, for an out-of-process executor. Unused
   * by the serial path; a worker pool requires it, since it cannot receive the
   * model's functions across a thread boundary.
   */
  taskRef?: TaskRef;
}

/**
 * Draw every sample up front, on the calling thread.
 *
 * The seeded RNG is consumed strictly in draw order, so this must stay
 * sequential -- it is what makes a parallel run reproduce a serial one exactly.
 * Only the model evaluations that follow are independent.
 */
export interface DrawnSample<TInput> {
  input: TInput;
  parameters: Readonly<Record<string, number>>;
}

/**
 * Consume `count` draws from `random`, validating each against `experiment`.
 *
 * Shared by the flat and nested ensembles so the RNG contract has one shape.
 * The nested case passes the same `random` across its cases, preserving its
 * case-major, draw-minor stream order.
 */
function drawSamples<TInput>(
  random: RandomSource,
  count: number,
  sample: (random: RandomSource, draw: number) => EnsembleSample<TInput>,
  label: (draw: number) => string,
  experiment?: ExperimentContract,
): Array<DrawnSample<TInput>> {
  const drawn: Array<DrawnSample<TInput>> = [];
  for (let draw = 0; draw < count; draw++) {
    const next = sample(random, draw);
    if (experiment) {
      validateExperimentSample(
        experiment,
        next.variables ?? next.parameters ?? {},
        label(draw),
      );
    }
    drawn.push({ input: next.input, parameters: next.parameters ?? {} });
  }
  return drawn;
}

function drawEnsembleSamples<TInput, TOutput>(
  options: EnsembleOptions<TInput, TOutput>,
): Array<DrawnSample<TInput>> {
  return drawSamples(
    seededRandom(options.seed),
    options.draws,
    options.sample,
    (draw) => `Ensemble draw ${draw}`,
    options.experiment,
  );
}

function validateEnsembleOptions<TInput, TOutput>(
  options: EnsembleOptions<TInput, TOutput>,
): void {
  if (!Number.isInteger(options.draws) || options.draws < 1) throw new Error('Ensemble draws must be >= 1');
  if (options.experiment) {
    validateExperiment(options.experiment);
    if (options.experiment.intent === 'mixed-uncertainty') {
      throw new Error(
        'A flat ensemble cannot represent mixed aleatory/epistemic uncertainty; ' +
        'use separate nested studies instead of flattening the two levels.',
      );
    }
  }
}

/** Aggregate finished draws. Shared by the serial and executor-driven paths. */
function summarizeEnsemble<TInput, TOutput>(
  options: EnsembleOptions<TInput, TOutput>,
  drawn: ReadonlyArray<DrawnSample<TInput>>,
  outputs: TOutput[],
): EnsembleResult<TOutput> {
  const parameterRows = drawn.map((sample) => sample.parameters);
  const interpretation = experimentInterpretation(options.experiment);
  const probabilities = options.quantiles ?? [0.05, 0.5, 0.95];
  if (probabilities.some((probability) =>
    !Number.isFinite(probability) || probability < 0 || probability > 1
  )) {
    throw new Error('Ensemble percentile levels must be finite and in [0, 1]');
  }
  const metricValues = Object.fromEntries(Object.entries(options.metrics).map(([name, metric]) => {
    const values = outputs.map(metric);
    if (values.some((value) => !Number.isFinite(value))) throw new Error(`Ensemble metric '${name}' is non-finite`);
    return [name, values];
  })) as Record<string, number[]>;
  const metrics = Object.fromEntries(Object.entries(metricValues).map(([name, values]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (interpretation === 'probability-distribution') {
      return [name, {
        kind: 'probability',
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        min,
        max,
        quantiles: Object.fromEntries(probabilities.map((p) => [String(p), quantile(values, p)])),
      } satisfies ProbabilityMetricSummary];
    }
    if (interpretation === 'epistemic-possibility') {
      return [name, {
        kind: 'epistemic-possibility',
        lower: min,
        upper: max,
        sampledPossibilities: values.length,
      } satisfies EpistemicMetricSummary];
    }
    return [name, {
      kind: 'design-sample',
      designMean: values.reduce((a, b) => a + b, 0) / values.length,
      min,
      max,
      empiricalPercentiles: Object.fromEntries(
        probabilities.map((p) => [String(p), quantile(values, p)]),
      ),
    } satisfies DesignMetricSummary];
  }));
  const parameterNames = [...new Set(parameterRows.flatMap((row) => Object.keys(row)))];
  const rankSensitivity = Object.fromEntries(parameterNames.map((parameter) => {
    const parameterValues = parameterRows.map((row) => row[parameter] ?? 0);
    return [parameter, Object.fromEntries(Object.entries(metricValues).map(([metric, values]) => [
      metric,
      correlation(ranks(parameterValues), ranks(values)),
    ]))];
  }));
  return {
    seed: options.seed,
    draws: options.draws,
    outputs,
    metrics,
    rankSensitivity,
    ...(options.experiment ? { experiment: options.experiment } : {}),
    interpretation,
  };
}

/**
 * One model evaluation, with the draw index attached to any failure.
 *
 * `runLabel` only reaches the ModelRun record, never an error message, so a
 * model that throws on one draw out of a thousand otherwise gives no clue
 * which. Rethrowing here makes the label do what it claims.
 */
function evaluateDraw<TInput, TOutput>(
  options: EnsembleOptions<TInput, TOutput>,
  input: TInput,
  draw: number,
): TOutput {
  try {
    return runModel(options.model, input, {
      seed: options.seed,
      runLabel: `draw-${draw}`,
    }).output;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Ensemble draw ${draw}: ${reason}`, { cause: error });
  }
}

export function runEnsemble<TInput, TOutput>(
  options: EnsembleOptions<TInput, TOutput>,
): EnsembleResult<TOutput> {
  validateEnsembleOptions(options);
  const drawn = drawEnsembleSamples(options);
  const outputs = drawn.map((sample, draw) => evaluateDraw(options, sample.input, draw));
  return summarizeEnsemble(options, drawn, outputs);
}

/**
 * `runEnsemble` with the model evaluations handed to an executor.
 *
 * Identical to the serial form in every respect that affects results: the same
 * validation, the same seeded draws in the same order, the same aggregation.
 * Only the mapping differs, and results are reassembled by index, so
 * `runEnsembleAsync(o, executor)` and `runEnsemble(o)` agree for any executor
 * that runs each task once -- and one that does not is rejected by
 * `orderTaskResults` rather than believed, so the agreement does not rest on
 * an executor being well-behaved. `ensemble-executor.test.ts` pins both halves.
 *
 * Defaults to `serialExecutor`, so calling it without one is the serial path
 * through the same code rather than a second implementation of it.
 */
export async function runEnsembleAsync<TInput, TOutput>(
  options: EnsembleOptions<TInput, TOutput>,
  executor: TaskExecutor = serialExecutor,
): Promise<EnsembleResult<TOutput>> {
  validateEnsembleOptions(options);
  const drawn = drawEnsembleSamples(options);
  const pairs = await executor.map(drawn, {
    run: (sample, draw) => evaluateDraw(options, sample.input, draw),
    ...(options.taskRef ? { ref: options.taskRef } : {}),
  });
  const outputs = orderTaskResults(pairs, drawn.length, 'Ensemble');
  return summarizeEnsemble(options, drawn, outputs);
}

/**
 * Preserve epistemic cases as an outer possibility set and aleatory
 * probability distributions as inner families. No single flattened CDF is
 * produced because that would silently assign probabilities to epistemic
 * possibilities.
 */
export function runNestedEnsemble<TInput, TOutput, TContext>(options: {
  model: ModelDefinition<TInput, TOutput>;
  experiment: ExperimentContract;
  epistemicCases: readonly EpistemicCase<TContext>[];
  aleatoryDrawsPerCase: number;
  seed: number;
  sample: (
    epistemic: EpistemicCase<TContext>,
    random: RandomSource,
    draw: number,
  ) => EnsembleSample<TInput>;
  metrics: Readonly<Record<string, (output: TOutput) => number>>;
  quantiles?: readonly number[];
}): NestedEnsembleResult<TOutput, TContext> {
  validateExperiment(options.experiment);
  if (options.experiment.intent !== 'mixed-uncertainty') {
    throw new Error('Nested ensembles require a mixed-uncertainty experiment');
  }
  if (!Number.isInteger(options.aleatoryDrawsPerCase) || options.aleatoryDrawsPerCase < 1) {
    throw new Error('Nested ensemble aleatoryDrawsPerCase must be >= 1');
  }
  if (options.epistemicCases.length === 0) {
    throw new Error('Nested ensemble needs at least one epistemic case');
  }
  const caseIds = new Set<string>();
  for (const epistemic of options.epistemicCases) {
    if (!epistemic.id.trim()) throw new Error('Nested ensemble epistemic case ID must not be empty');
    if (caseIds.has(epistemic.id)) {
      throw new Error(`Duplicate epistemic case ID '${epistemic.id}'`);
    }
    caseIds.add(epistemic.id);
  }
  const probabilities = options.quantiles ?? [0.05, 0.5, 0.95];
  if (probabilities.some((probability) =>
    !Number.isFinite(probability) || probability < 0 || probability > 1
  )) {
    throw new Error('Nested ensemble quantile levels must be finite and in [0, 1]');
  }
  // Same split as the flat ensemble: draw the whole seeded stream first, in
  // case-major/draw-minor order, then evaluate. Sharing one `random` across
  // cases preserves that stream order. Left interleaved, this loop would be
  // the one path a worker pool could not take -- and it is the expensive one,
  // being cases x draws.
  const random = seededRandom(options.seed);
  const families = options.epistemicCases.map((epistemic) => {
    const drawn = drawSamples(
      random,
      options.aleatoryDrawsPerCase,
      (rng, draw) => options.sample(epistemic, rng, draw),
      (draw) => `Nested ensemble case '${epistemic.id}' draw ${draw}`,
      options.experiment,
    );
    const outputs = drawn.map((sample, draw) => runModel(options.model, sample.input, {
      seed: options.seed,
      runLabel: `${epistemic.id}:draw-${draw}`,
    }).output);
    return { epistemicCase: epistemic, outputs };
  });
  const metrics = Object.fromEntries(Object.entries(options.metrics).map(([name, metric]) => {
    const byEpistemicCase = Object.fromEntries(families.map((family) => {
      const values = family.outputs.map(metric);
      if (values.some((value) => !Number.isFinite(value))) {
        throw new Error(`Nested ensemble metric '${name}' is non-finite`);
      }
      return [family.epistemicCase.id, {
        kind: 'probability',
        mean: values.reduce((sum, value) => sum + value, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        quantiles: Object.fromEntries(
          probabilities.map((probability) => [
            String(probability),
            quantile(values, probability),
          ]),
        ),
      } satisfies ProbabilityMetricSummary];
    }));
    const summaries = Object.values(byEpistemicCase);
    const meanValues = summaries.map((summary) => summary.mean);
    const quantileEnvelope = Object.fromEntries(probabilities.map((probability) => {
      const values = summaries.map((summary) => summary.quantiles[String(probability)]);
      return [String(probability), {
        lower: Math.min(...values),
        upper: Math.max(...values),
      }];
    }));
    return [name, {
      kind: 'nested-aleatory-epistemic',
      byEpistemicCase,
      meanRange: {
        lower: Math.min(...meanValues),
        upper: Math.max(...meanValues),
      },
      quantileEnvelope,
    } satisfies NestedMetricSummary];
  }));
  return {
    seed: options.seed,
    aleatoryDrawsPerCase: options.aleatoryDrawsPerCase,
    experiment: options.experiment,
    interpretation: 'nested-aleatory-epistemic',
    families,
    metrics,
  };
}

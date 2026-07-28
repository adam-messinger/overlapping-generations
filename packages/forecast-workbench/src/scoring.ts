import {
  outcomeIds,
  validatePrediction,
  type ForecastQuestion,
  type Prediction,
} from './contracts.js';
import { requireIsoTimestamp } from './canonical.js';

export interface ScoringSpecification {
  schemaVersion: 'forecast-workbench.scoring-spec/v1';
  id: string;
  version: string;
  brierNormalization: 'sum' | 'mean';
  rpsNormalization: 'sum' | 'mean-boundaries';
  logProbabilityFloor: number;
  wisRequiredQuantiles: readonly number[];
  crpsInput: 'samples';
  timeWeighting: 'duration';
}

export const DEFAULT_SCORING_SPECIFICATION: ScoringSpecification = {
  schemaVersion: 'forecast-workbench.scoring-spec/v1',
  id: 'forecast-workbench-default-scores',
  version: '1.0.0',
  brierNormalization: 'sum',
  rpsNormalization: 'mean-boundaries',
  logProbabilityFloor: 1e-12,
  wisRequiredQuantiles: [0.025, 0.25, 0.5, 0.75, 0.975],
  crpsInput: 'samples',
  timeWeighting: 'duration',
};

export interface ForecastScoreValues {
  brier?: number;
  rankedProbability?: number;
  logarithmic?: number;
  weightedInterval?: number;
  crps?: number;
}

export interface ScoreRecord {
  schemaVersion: 'forecast-workbench.score/v1';
  questionHash: string;
  forecastId: string;
  resolutionId: string;
  scoredAt: string;
  scoringSpecification: ScoringSpecification;
  observedOutcomeId?: string;
  observedValue?: number;
  values: ForecastScoreValues;
}

export interface ScoreSeriesSummary {
  schemaVersion: 'forecast-workbench.score-series/v1';
  questionHash: string;
  forecasterId: string;
  seriesId: string;
  resolutionId: string;
  scoredAt: string;
  forecastScoreIds: readonly string[];
  launchForecastId: string;
  closingForecastId: string;
  launch: ForecastScoreValues;
  closing: ForecastScoreValues;
  timeWeighted: ForecastScoreValues;
  scoringSpecification: ScoringSpecification;
}

function distribution(
  question: ForecastQuestion,
  prediction: Prediction,
): Readonly<Record<string, number>> {
  if (prediction.kind === 'binary' && question.outcome.kind === 'binary') {
    return {
      [question.outcome.negative.id]: 1 - prediction.probability,
      [question.outcome.positive.id]: prediction.probability,
    };
  }
  if (prediction.kind === 'categorical' ||
      prediction.kind === 'ordered-categorical') {
    return prediction.probabilities;
  }
  throw new Error('Categorical scoring requires a categorical prediction');
}

export function brierScore(options: {
  probabilities: Readonly<Record<string, number>>;
  outcomeId: string;
  normalization?: 'sum' | 'mean';
}): number {
  const entries = Object.entries(options.probabilities);
  if (!entries.some(([id]) => id === options.outcomeId)) {
    throw new Error(`Observed outcome '${options.outcomeId}' is absent from probabilities`);
  }
  const sum = entries.reduce(
    (score, [id, probability]) =>
      score + (probability - Number(id === options.outcomeId)) ** 2,
    0,
  );
  return options.normalization === 'mean' ? sum / entries.length : sum;
}

export function rankedProbabilityScore(options: {
  orderedOutcomeIds: readonly string[];
  probabilities: Readonly<Record<string, number>>;
  outcomeId: string;
  normalization?: 'sum' | 'mean-boundaries';
}): number {
  const observedIndex = options.orderedOutcomeIds.indexOf(options.outcomeId);
  if (observedIndex < 0) throw new Error(`Unknown ordered outcome '${options.outcomeId}'`);
  let cumulativeForecast = 0;
  let score = 0;
  for (let index = 0; index < options.orderedOutcomeIds.length - 1; index++) {
    cumulativeForecast += options.probabilities[options.orderedOutcomeIds[index]] ?? 0;
    const cumulativeObserved = Number(observedIndex <= index);
    score += (cumulativeForecast - cumulativeObserved) ** 2;
  }
  return options.normalization === 'sum'
    ? score
    : score / Math.max(1, options.orderedOutcomeIds.length - 1);
}

export function logarithmicScore(
  probability: number,
  floor = 1e-12,
): number {
  if (!Number.isFinite(floor) || floor <= 0 || floor >= 1) {
    throw new Error('Log-score floor must be in (0, 1)');
  }
  return -Math.log(Math.max(floor, Math.min(1, probability)));
}

function quantileMap(prediction: Extract<Prediction, { kind: 'quantiles' }>): Map<number, number> {
  return new Map(prediction.quantiles.map(({ probability, value }) => [probability, value]));
}

export function weightedIntervalScore(
  prediction: Extract<Prediction, { kind: 'quantiles' }>,
  observed: number,
  requiredQuantiles: readonly number[] =
    DEFAULT_SCORING_SPECIFICATION.wisRequiredQuantiles,
): number {
  const values = quantileMap(prediction);
  for (const probability of requiredQuantiles) {
    if (!values.has(probability)) {
      throw new Error(`WIS requires quantile ${probability}`);
    }
  }
  const median = values.get(0.5);
  if (median === undefined) throw new Error('WIS requires the median');
  let weighted = 0.5 * Math.abs(observed - median);
  let totalWeight = 0.5;
  const lowerProbabilities = requiredQuantiles.filter((value) => value < 0.5);
  for (const lowerProbability of lowerProbabilities) {
    const upperProbability = 1 - lowerProbability;
    const lower = values.get(lowerProbability);
    const upper = values.get(upperProbability);
    if (lower === undefined || upper === undefined) continue;
    const alpha = 2 * lowerProbability;
    const intervalScore =
      upper - lower +
      (2 / alpha) * (lower - observed) * Number(observed < lower) +
      (2 / alpha) * (observed - upper) * Number(observed > upper);
    const weight = alpha / 2;
    weighted += weight * intervalScore;
    totalWeight += weight;
  }
  return weighted / totalWeight;
}

export function crpsFromSamples(samples: readonly number[], observed: number): number {
  if (samples.length === 0) throw new Error('CRPS samples must not be empty');
  if (!Number.isFinite(observed) ||
      samples.some((sample) => !Number.isFinite(sample))) {
    throw new Error('CRPS samples and observation must be finite');
  }
  const ordered = [...samples].sort((left, right) => left - right);
  const absoluteObservation = ordered.reduce(
    (sum, sample) => sum + Math.abs(sample - observed),
    0,
  );
  // For ordered samples, half the mean pairwise absolute difference is
  // Σ(2i - n + 1)x_i / n² using zero-based i. This avoids an O(n²) loop.
  const halfPairwise = ordered.reduce(
    (sum, sample, index) =>
      sum + (2 * index - ordered.length + 1) * sample,
    0,
  ) / (ordered.length * ordered.length);
  return absoluteObservation / ordered.length - halfPairwise;
}

export function scorePrediction(options: {
  question: ForecastQuestion;
  prediction: Prediction;
  observedOutcomeId?: string;
  observedValue?: number;
  specification?: ScoringSpecification;
}): ForecastScoreValues {
  const specification = options.specification ?? DEFAULT_SCORING_SPECIFICATION;
  validatePrediction(options.prediction, options.question.outcome);
  if (options.question.outcome.kind === 'continuous') {
    if (options.observedValue === undefined || !Number.isFinite(options.observedValue)) {
      throw new Error('Continuous scoring requires an observed value');
    }
    if (options.prediction.kind === 'quantiles') {
      return {
        weightedInterval: weightedIntervalScore(
          options.prediction,
          options.observedValue,
          specification.wisRequiredQuantiles,
        ),
      };
    }
    if (options.prediction.kind === 'samples') {
      return {
        crps: crpsFromSamples(options.prediction.values, options.observedValue),
      };
    }
    throw new Error('Continuous scoring requires quantiles or samples');
  }
  if (!options.observedOutcomeId) {
    throw new Error('Categorical scoring requires an observed outcome ID');
  }
  const ids = outcomeIds(options.question.outcome);
  if (!ids.includes(options.observedOutcomeId)) {
    throw new Error(`Unknown observed outcome '${options.observedOutcomeId}'`);
  }
  const probabilities = distribution(options.question, options.prediction);
  const observedProbability = probabilities[options.observedOutcomeId];
  const values: ForecastScoreValues = {
    brier: brierScore({
      probabilities,
      outcomeId: options.observedOutcomeId,
      normalization: specification.brierNormalization,
    }),
    logarithmic: logarithmicScore(
      observedProbability,
      specification.logProbabilityFloor,
    ),
  };
  if (options.question.outcome.kind === 'ordered-categorical') {
    values.rankedProbability = rankedProbabilityScore({
      orderedOutcomeIds: ids,
      probabilities,
      outcomeId: options.observedOutcomeId,
      normalization: specification.rpsNormalization,
    });
  }
  return values;
}

export function timeWeightedScore(options: {
  forecasts: readonly {
    sealedAt: string;
    score: number;
  }[];
  opensAt: string;
  closesAt: string;
}): number {
  requireIsoTimestamp(options.opensAt, 'time-weighted score opensAt');
  requireIsoTimestamp(options.closesAt, 'time-weighted score closesAt');
  if (options.forecasts.length === 0) throw new Error('Time-weighted score needs forecasts');
  const rows = [...options.forecasts].sort(
    (left, right) => Date.parse(left.sealedAt) - Date.parse(right.sealedAt),
  );
  let weighted = 0;
  let duration = 0;
  const close = Date.parse(options.closesAt);
  for (let index = 0; index < rows.length; index++) {
    requireIsoTimestamp(rows[index].sealedAt, 'forecast sealedAt');
    if (!Number.isFinite(rows[index].score)) throw new Error('Forecast score must be finite');
    const start = Math.max(Date.parse(options.opensAt), Date.parse(rows[index].sealedAt));
    const end = Math.min(
      close,
      index + 1 < rows.length ? Date.parse(rows[index + 1].sealedAt) : close,
    );
    if (end <= start) continue;
    const interval = end - start;
    weighted += interval * rows[index].score;
    duration += interval;
  }
  if (duration <= 0) throw new Error('Forecasts have no active time inside the question window');
  return weighted / duration;
}

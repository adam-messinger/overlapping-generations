import { requireIsoTimestamp, requireText } from './canonical.js';
import {
  validatePrediction,
  type ForecastQuestion,
  type Prediction,
} from './contracts.js';

export type AggregationMethod =
  | { kind: 'equal-weight' }
  | { kind: 'log-odds' }
  | { kind: 'performance-weighted'; epsilon: number };

export interface AggregationInput {
  forecastId: string;
  forecasterId: string;
  prediction: Prediction;
  sealedAt: string;
  performanceScore?: number;
  performanceScoreAvailableAt?: string;
}

export interface AggregationRecord {
  schemaVersion: 'forecast-workbench.aggregation/v1';
  id: string;
  version: string;
  questionHash: string;
  createdAt: string;
  method: AggregationMethod;
  inputs: readonly AggregationInput[];
  trainingScoreIds: readonly string[];
  result: Prediction;
}

export function validateAggregationRecord(
  aggregation: AggregationRecord,
  question: ForecastQuestion,
): void {
  if (aggregation.schemaVersion !== 'forecast-workbench.aggregation/v1') {
    throw new Error(
      `Unsupported aggregation schema '${String(aggregation.schemaVersion)}'`,
    );
  }
  requireText(aggregation.id, 'aggregation.id');
  requireText(aggregation.version, 'aggregation.version');
  requireText(aggregation.questionHash, 'aggregation.questionHash');
  requireIsoTimestamp(aggregation.createdAt, 'aggregation.createdAt');
  if (aggregation.inputs.length < 2) throw new Error('Aggregation needs at least two forecasts');
  const forecastIds = new Set<string>();
  for (const input of aggregation.inputs) {
    requireText(input.forecastId, 'aggregation forecast ID');
    requireText(input.forecasterId, 'aggregation forecaster ID');
    requireIsoTimestamp(input.sealedAt, `forecast '${input.forecastId}' sealedAt`);
    if (Date.parse(input.sealedAt) > Date.parse(aggregation.createdAt)) {
      throw new Error(`Aggregation includes future forecast '${input.forecastId}'`);
    }
    if (forecastIds.has(input.forecastId)) {
      throw new Error(`Aggregation repeats forecast '${input.forecastId}'`);
    }
    forecastIds.add(input.forecastId);
    validatePrediction(input.prediction, question.outcome);
  }
  const trainingIds = new Set<string>();
  for (const id of aggregation.trainingScoreIds) {
    requireText(id, 'aggregation training-score ID');
    if (trainingIds.has(id)) {
      throw new Error(`Aggregation repeats training score '${id}'`);
    }
    trainingIds.add(id);
  }
  if (
    !['equal-weight', 'log-odds', 'performance-weighted'].includes(
      aggregation.method.kind,
    )
  ) {
    throw new Error(
      `Invalid aggregation method '${String(aggregation.method.kind)}'`,
    );
  }
  if (
    aggregation.method.kind === 'performance-weighted' &&
    aggregation.trainingScoreIds.length === 0
  ) {
    throw new Error(
      'Performance-weighted aggregation must cite training scores',
    );
  }
  validatePrediction(aggregation.result, question.outcome);
}

function clampProbability(value: number): number {
  return Math.min(1 - 1e-12, Math.max(1e-12, value));
}

function logit(value: number): number {
  const clamped = clampProbability(value);
  return Math.log(clamped / (1 - clamped));
}

function logistic(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function weights(
  inputs: readonly AggregationInput[],
  method: AggregationMethod,
  createdAt: string,
): number[] {
  if (method.kind !== 'performance-weighted') return inputs.map(() => 1);
  if (!Number.isFinite(method.epsilon) || method.epsilon <= 0) {
    throw new Error('Performance-weight epsilon must be positive');
  }
  return inputs.map((input) => {
    if (input.performanceScore === undefined || !input.performanceScoreAvailableAt) {
      throw new Error(`Forecast '${input.forecastId}' lacks an available performance score`);
    }
    requireIsoTimestamp(
      input.performanceScoreAvailableAt,
      `forecast '${input.forecastId}' score availability`,
    );
    if (Date.parse(input.performanceScoreAvailableAt) > Date.parse(createdAt)) {
      throw new Error(`Forecast '${input.forecastId}' uses a future performance score`);
    }
    if (!Number.isFinite(input.performanceScore) || input.performanceScore < 0) {
      throw new Error(`Forecast '${input.forecastId}' performance score is invalid`);
    }
    return 1 / (method.epsilon + input.performanceScore);
  });
}

function weightedMean(values: readonly number[], rowWeights: readonly number[]): number {
  const total = rowWeights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) throw new Error('Aggregation weights sum to zero');
  return values.reduce(
    (sum, value, index) => sum + value * rowWeights[index],
    0,
  ) / total;
}

export function aggregatePredictions(options: {
  id: string;
  version: string;
  questionHash: string;
  createdAt: string;
  method: AggregationMethod;
  inputs: readonly AggregationInput[];
  trainingScoreIds?: readonly string[];
}): AggregationRecord {
  requireText(options.id, 'aggregation.id');
  requireText(options.version, 'aggregation.version');
  requireText(options.questionHash, 'aggregation.questionHash');
  requireIsoTimestamp(options.createdAt, 'aggregation.createdAt');
  if (options.inputs.length < 2) throw new Error('Aggregation needs at least two forecasts');
  for (const input of options.inputs) {
    requireText(input.forecastId, 'aggregation forecast ID');
    requireText(input.forecasterId, 'aggregation forecaster ID');
    requireIsoTimestamp(input.sealedAt, `forecast '${input.forecastId}' sealedAt`);
    if (Date.parse(input.sealedAt) > Date.parse(options.createdAt)) {
      throw new Error(`Aggregation includes future forecast '${input.forecastId}'`);
    }
  }
  const kind = options.inputs[0].prediction.kind;
  if (options.inputs.some(({ prediction }) => prediction.kind !== kind)) {
    throw new Error('Aggregation inputs use different prediction kinds');
  }
  if (kind === 'quantiles' || kind === 'samples') {
    throw new Error('Continuous aggregation is not implemented without a common distribution grid');
  }
  const rowWeights = weights(options.inputs, options.method, options.createdAt);
  let result: Prediction;
  if (kind === 'binary') {
    const inputs = options.inputs.map(({ prediction }) =>
      prediction as Extract<Prediction, { kind: 'binary' }>
    );
    const positiveOutcomeId = inputs[0].positiveOutcomeId;
    if (inputs.some((input) => input.positiveOutcomeId !== positiveOutcomeId)) {
      throw new Error('Binary aggregation inputs target different positive outcomes');
    }
    const probabilities = inputs.map(({ probability }) => probability);
    const probability = options.method.kind === 'log-odds'
      ? logistic(weightedMean(probabilities.map(logit), rowWeights))
      : weightedMean(probabilities, rowWeights);
    result = { kind: 'binary', positiveOutcomeId, probability };
  } else {
    const inputs = options.inputs.map(({ prediction }) =>
      prediction as Extract<Prediction, { kind: 'categorical' | 'ordered-categorical' }>
    );
    const ids = Object.keys(inputs[0].probabilities).sort();
    if (inputs.some((input) =>
      JSON.stringify(Object.keys(input.probabilities).sort()) !== JSON.stringify(ids))) {
      throw new Error('Categorical aggregation inputs use different outcomes');
    }
    const raw = Object.fromEntries(ids.map((id) => {
      const values = inputs.map((input) => input.probabilities[id]);
      return [
        id,
        options.method.kind === 'log-odds'
          ? logistic(weightedMean(values.map(logit), rowWeights))
          : weightedMean(values, rowWeights),
      ];
    }));
    const total = Object.values(raw).reduce((sum, value) => sum + value, 0);
    result = {
      kind,
      probabilities: Object.fromEntries(
        Object.entries(raw).map(([id, value]) => [id, value / total]),
      ),
    };
  }
  return {
    schemaVersion: 'forecast-workbench.aggregation/v1',
    id: options.id,
    version: options.version,
    questionHash: options.questionHash,
    createdAt: options.createdAt,
    method: options.method,
    inputs: [...options.inputs],
    trainingScoreIds: [...(options.trainingScoreIds ?? [])],
    result,
  };
}

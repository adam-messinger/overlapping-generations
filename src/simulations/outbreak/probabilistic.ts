import type { RespiratorySeries } from './rolling-data.js';

export type ForecastModel = 'persistence' | 'local-trend' | 'adaptive-ensemble';
export type ForecastHorizon = 1 | 2 | 3 | 4;

export const FORECAST_QUANTILES = [0.025, 0.25, 0.5, 0.75, 0.975] as const;
export type ForecastQuantile = (typeof FORECAST_QUANTILES)[number];

export interface ProbabilisticForecast {
  model: ForecastModel;
  originIndex: number;
  targetIndex: number;
  horizon: ForecastHorizon;
  pointLog: number;
  quantilesLog: Readonly<Record<ForecastQuantile, number>>;
}

export interface ForecastScore {
  wis: number;
  absoluteError: number;
  covered50: boolean;
  covered95: boolean;
}

export interface ModelEvaluation {
  model: ForecastModel;
  forecasts: number;
  wis: number;
  maeLog: number;
  coverage50: number;
  coverage95: number;
  wisByHorizon: Readonly<Record<ForecastHorizon, number>>;
}

export interface PathogenEvaluation {
  pathogen: string;
  weeks: number;
  firstOrigin: number;
  models: Readonly<Record<ForecastModel, ModelEvaluation>>;
}

export interface PanelEvaluation {
  pathogens: readonly PathogenEvaluation[];
  macroAverage: Readonly<Record<ForecastModel, ModelEvaluation>>;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const transform = (value: number): number => Math.log1p(Math.max(0, value));

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function quantile(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = probability * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function localTrend(logValues: readonly number[], origin: number, horizon: number): number {
  const start = Math.max(1, origin - 5);
  const differences: number[] = [];
  for (let index = start; index <= origin; index++) {
    differences.push(logValues[index] - logValues[index - 1]);
  }
  // Damping and a weekly growth cap stop a few noisy reports from becoming an
  // implausible four-week exponential extrapolation.
  const slope = clamp(quantile(differences, 0.5), -0.3, 0.3);
  let extension = 0;
  for (let step = 1; step <= horizon; step++) extension += 0.72 ** (step - 1);
  return logValues[origin] + slope * extension;
}

function seasonalAnalog(
  logValues: readonly number[],
  origin: number,
  horizon: number,
): number | null {
  const seasonalTarget = origin + horizon - 52;
  if (seasonalTarget < 0 || origin < 55) return null;
  const offsets: number[] = [];
  for (let lag = 0; lag < 4; lag++) {
    const current = origin - lag;
    const prior = current - 52;
    if (prior >= 0) offsets.push(logValues[current] - logValues[prior]);
  }
  return logValues[seasonalTarget] + quantile(offsets, 0.5);
}

type Candidate = 'persistence' | 'local-trend' | 'seasonal';

function candidatePoint(
  logValues: readonly number[],
  candidate: Candidate,
  origin: number,
  horizon: number,
): number | null {
  if (candidate === 'persistence') return logValues[origin];
  if (candidate === 'local-trend') return localTrend(logValues, origin, horizon);
  return seasonalAnalog(logValues, origin, horizon);
}

function candidateRecentMae(
  logValues: readonly number[],
  candidate: Candidate,
  origin: number,
  horizon: number,
): number | null {
  const errors: Array<{ age: number; error: number }> = [];
  const latestPriorOrigin = origin - horizon;
  const earliestPriorOrigin = Math.max(6, latestPriorOrigin - 51);
  for (let priorOrigin = earliestPriorOrigin; priorOrigin <= latestPriorOrigin; priorOrigin++) {
    const predicted = candidatePoint(logValues, candidate, priorOrigin, horizon);
    if (predicted === null) continue;
    errors.push({
      age: latestPriorOrigin - priorOrigin,
      error: Math.abs(logValues[priorOrigin + horizon] - predicted),
    });
  }
  if (errors.length < 8) return null;
  let weightedError = 0;
  let totalWeight = 0;
  for (const row of errors) {
    const weight = 0.96 ** row.age;
    weightedError += weight * row.error;
    totalWeight += weight;
  }
  return weightedError / totalWeight;
}

/** Point forecast that uses no observations after `origin`. */
export function pointForecast(
  values: readonly number[],
  model: ForecastModel,
  origin: number,
  horizon: ForecastHorizon,
): number {
  const logValues = values.map(transform);
  if (model === 'persistence') return logValues[origin];
  if (model === 'local-trend') return localTrend(logValues, origin, horizon);

  const candidates: readonly Candidate[] = ['persistence', 'local-trend', 'seasonal'];
  let numerator = 0;
  let denominator = 0;
  for (const candidate of candidates) {
    const point = candidatePoint(logValues, candidate, origin, horizon);
    if (point === null) continue;
    const recentMae = candidateRecentMae(logValues, candidate, origin, horizon);
    // Before enough candidate-specific errors accumulate, use equal conservative
    // weights. Thereafter inverse-error weights adapt separately by horizon.
    const weight = recentMae === null ? 1 : 1 / (0.04 + recentMae) ** 2;
    numerator += weight * point;
    denominator += weight;
  }
  const combined = 0.5 * (numerator / denominator) + 0.5 * localTrend(logValues, origin, horizon);
  const recent = logValues.slice(Math.max(0, origin - 7), origin + 1);
  return clamp(combined, Math.min(...recent) - 0.35, Math.max(...recent) + 0.35);
}

function historicalResiduals(
  values: readonly number[],
  model: ForecastModel,
  origin: number,
  horizon: ForecastHorizon,
): number[] {
  const logValues = values.map(transform);
  const residuals: number[] = [];
  const latestPriorOrigin = origin - horizon;
  const earliestPriorOrigin = Math.max(6, latestPriorOrigin - 103);
  for (let priorOrigin = earliestPriorOrigin; priorOrigin <= latestPriorOrigin; priorOrigin++) {
    const point = pointForecast(values, model, priorOrigin, horizon);
    residuals.push(logValues[priorOrigin + horizon] - point);
  }
  return residuals;
}

export function makeForecast(
  values: readonly number[],
  model: ForecastModel,
  originIndex: number,
  horizon: ForecastHorizon,
): ProbabilisticForecast {
  if (originIndex < 6) throw new Error('Forecast origin needs at least seven observations');
  if (originIndex + horizon >= values.length) throw new Error('Forecast target is outside series');
  const pointLog = pointForecast(values, model, originIndex, horizon);
  let residuals = historicalResiduals(values, model, originIndex, horizon);
  if (residuals.length < 12) {
    const logValues = values.map(transform);
    const changes = logValues
      .slice(1, originIndex + 1)
      .map((value, index) => value - logValues[index]);
    residuals = changes.map((change) => change * Math.sqrt(horizon));
  }
  const entries = FORECAST_QUANTILES.map((level) => [
    level,
    pointLog + quantile(residuals, level),
  ] as const);
  return {
    model,
    originIndex,
    targetIndex: originIndex + horizon,
    horizon,
    pointLog,
    quantilesLog: Object.fromEntries(entries) as Record<ForecastQuantile, number>,
  };
}

/** WIS with central 50% and 95% intervals, evaluated on log1p admissions. */
export function scoreForecast(
  forecast: ProbabilisticForecast,
  observedAdmissions: number,
): ForecastScore {
  const observed = transform(observedAdmissions);
  const q = forecast.quantilesLog;
  const intervalScore = (alpha: 0.5 | 0.05, lower: number, upper: number): number =>
    upper - lower +
    (2 / alpha) * (lower - observed) * Number(observed < lower) +
    (2 / alpha) * (observed - upper) * Number(observed > upper);
  const absoluteError = Math.abs(observed - q[0.5]);
  const wis =
    (0.5 * absoluteError +
      0.25 * intervalScore(0.5, q[0.25], q[0.75]) +
      0.025 * intervalScore(0.05, q[0.025], q[0.975])) /
    2.5;
  return {
    wis,
    absoluteError,
    covered50: observed >= q[0.25] && observed <= q[0.75],
    covered95: observed >= q[0.025] && observed <= q[0.975],
  };
}

const MODELS: readonly ForecastModel[] = [
  'persistence',
  'local-trend',
  'adaptive-ensemble',
];
const HORIZONS: readonly ForecastHorizon[] = [1, 2, 3, 4];

export function evaluateSeries(
  series: RespiratorySeries,
  options: {
    minimumTrainingWeeks?: number;
    firstTargetIndex?: number;
    lastTargetIndex?: number;
  } = {},
): PathogenEvaluation {
  const minimumTrainingWeeks =
    options.minimumTrainingWeeks ?? (series.id === 'rsv' ? 26 : 52);
  const firstOrigin = Math.max(12, minimumTrainingWeeks - 1);
  const models = {} as Record<ForecastModel, ModelEvaluation>;
  for (const model of MODELS) {
    let forecasts = 0;
    let totalWis = 0;
    let totalMae = 0;
    let covered50 = 0;
    let covered95 = 0;
    const horizonWis: Record<ForecastHorizon, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const horizonCount: Record<ForecastHorizon, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (let origin = firstOrigin; origin < series.admissions.length - 1; origin++) {
      for (const horizon of HORIZONS) {
        if (origin + horizon >= series.admissions.length) continue;
        if (
          options.firstTargetIndex !== undefined &&
          origin + horizon < options.firstTargetIndex
        ) continue;
        if (
          options.lastTargetIndex !== undefined &&
          origin + horizon > options.lastTargetIndex
        ) continue;
        const forecast = makeForecast(series.admissions, model, origin, horizon);
        const score = scoreForecast(forecast, series.admissions[origin + horizon]);
        forecasts++;
        totalWis += score.wis;
        totalMae += score.absoluteError;
        covered50 += Number(score.covered50);
        covered95 += Number(score.covered95);
        horizonWis[horizon] += score.wis;
        horizonCount[horizon]++;
      }
    }
    models[model] = {
      model,
      forecasts,
      wis: totalWis / forecasts,
      maeLog: totalMae / forecasts,
      coverage50: covered50 / forecasts,
      coverage95: covered95 / forecasts,
      wisByHorizon: Object.fromEntries(
        HORIZONS.map((horizon) => [horizon, horizonWis[horizon] / horizonCount[horizon]]),
      ) as Record<ForecastHorizon, number>,
    };
  }
  return { pathogen: series.id, weeks: series.admissions.length, firstOrigin, models };
}

export function evaluatePanel(
  series: readonly RespiratorySeries[],
  window: 'all' | 'development' | 'holdout' = 'all',
): PanelEvaluation {
  const pathogens = series.map((item) => {
    const holdoutWeeks = item.id === 'rsv' ? 26 : 52;
    const holdoutStart = item.admissions.length - holdoutWeeks;
    if (window === 'development') {
      return evaluateSeries(item, { lastTargetIndex: holdoutStart - 1 });
    }
    if (window === 'holdout') {
      return evaluateSeries(item, { firstTargetIndex: holdoutStart });
    }
    return evaluateSeries(item);
  });
  const macroAverage = {} as Record<ForecastModel, ModelEvaluation>;
  for (const model of MODELS) {
    macroAverage[model] = {
      model,
      forecasts: pathogens.reduce((sum, row) => sum + row.models[model].forecasts, 0),
      wis: mean(pathogens.map((row) => row.models[model].wis)),
      maeLog: mean(pathogens.map((row) => row.models[model].maeLog)),
      coverage50: mean(pathogens.map((row) => row.models[model].coverage50)),
      coverage95: mean(pathogens.map((row) => row.models[model].coverage95)),
      wisByHorizon: Object.fromEntries(
        HORIZONS.map((horizon) => [
          horizon,
          mean(pathogens.map((row) => row.models[model].wisByHorizon[horizon])),
        ]),
      ) as Record<ForecastHorizon, number>,
    };
  }
  return { pathogens, macroAverage };
}

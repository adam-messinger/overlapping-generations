import {
  historicalDisruptionEvents,
  type HistoricalDisruptionEvent,
  type TargetRange,
} from './empirical-data.js';

export type DisruptionModel = 'cost-share-v1' | 'physical-v3';

export interface DisruptionParameters {
  accessibleInventoryFraction: number;
  substitutionMultiplier: number;
  scarcityPriceSlope: number;
}

export interface EventPrediction {
  eventId: string;
  outputPath: readonly number[];
  firstCurtailmentMonth: number | null;
  recoveryMonth: number | null;
  troughOutputLoss: number;
  peakInputPriceMultiple: number;
}

export interface EventScore {
  eventId: string;
  score: number;
  components: number;
  prediction: EventPrediction;
}

export interface BacktestScore {
  model: DisruptionModel;
  fitSet: 'development' | 'holdout';
  meanScore: number;
  events: readonly EventScore[];
}

export interface CalibratedDisruptionModel {
  model: DisruptionModel;
  parameters: DisruptionParameters;
  development: BacktestScore;
  holdout: BacktestScore;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * V1 treats a missing input as a proportional cost-share loss. V3 treats the
 * input as a physical recipe constraint buffered by accessible stocks and slow
 * technical substitution. Both use the same deliberately simple scarcity-price
 * curve so quantity-network improvements cannot be attributed to a price refit.
 */
export function simulateHistoricalDisruption(
  event: HistoricalDisruptionEvent,
  model: DisruptionModel,
  parameters: DisruptionParameters,
): EventPrediction {
  let inventory =
    model === 'physical-v3'
      ? event.grossInventoryMonths * parameters.accessibleInventoryFraction
      : 0;
  const inventoryCapacity = inventory;
  const outputPath: number[] = [];
  let shortageDuration = 0;
  let peakInputPriceMultiple = 1;

  for (let month = 0; month < event.supplyPath.length; month++) {
    const supply = clamp(event.supplyPath[month], 0, 1);
    peakInputPriceMultiple = Math.max(
      peakInputPriceMultiple,
      1 + parameters.scarcityPriceSlope * (1 - supply),
    );
    if (model === 'cost-share-v1') {
      outputPath.push(1 - event.directInputCostShare * (1 - supply));
      continue;
    }

    shortageDuration = supply < 0.999 ? shortageDuration + 1 : 0;
    const substitution =
      event.maximumTechnicalSubstitution *
      parameters.substitutionMultiplier *
      clamp(shortageDuration / 12, 0, 1);
    const requirement = Math.max(0.5, 1 - substitution);
    const available = inventory + supply;
    const output = clamp(available / requirement, 0, 1);
    outputPath.push(output);
    inventory = Math.min(
      inventoryCapacity,
      Math.max(0, available - requirement * output),
    );
  }

  const curtailmentThreshold = 0.95;
  let firstCurtailmentMonth: number | null = null;
  let recoveryMonth: number | null = null;
  for (let month = 1; month < outputPath.length; month++) {
    if (firstCurtailmentMonth === null && outputPath[month] < curtailmentThreshold) {
      firstCurtailmentMonth = month;
    } else if (
      firstCurtailmentMonth !== null &&
      recoveryMonth === null &&
      outputPath[month] >= curtailmentThreshold
    ) {
      recoveryMonth = month;
    }
  }
  return {
    eventId: event.id,
    outputPath,
    firstCurtailmentMonth,
    recoveryMonth,
    troughOutputLoss: 1 - Math.min(...outputPath),
    peakInputPriceMultiple,
  };
}

function rangeDistance(value: number, target: TargetRange, scale: number): number {
  if (value < target.min) return (target.min - value) / scale;
  if (value > target.max) return (value - target.max) / scale;
  return 0;
}

export function scoreHistoricalEvent(
  event: HistoricalDisruptionEvent,
  prediction: EventPrediction,
): EventScore {
  const losses: number[] = [];
  if (event.observed.firstCurtailmentMonth !== null) {
    losses.push(
      prediction.firstCurtailmentMonth === null
        ? 2
        : rangeDistance(
            prediction.firstCurtailmentMonth,
            event.observed.firstCurtailmentMonth,
            2,
          ),
    );
  } else if (event.observedNoBroadCurtailment) {
    losses.push(prediction.firstCurtailmentMonth === null ? 0 : 2);
  }
  if (event.observed.troughOutputLoss !== null) {
    losses.push(
      rangeDistance(prediction.troughOutputLoss, event.observed.troughOutputLoss, 0.1),
    );
  }
  if (event.observed.recoveryMonth !== null) {
    losses.push(
      prediction.recoveryMonth === null
        ? 2
        : rangeDistance(prediction.recoveryMonth, event.observed.recoveryMonth, 3),
    );
  }
  if (event.observed.peakInputPriceMultiple !== null) {
    losses.push(
      rangeDistance(
        prediction.peakInputPriceMultiple,
        event.observed.peakInputPriceMultiple,
        5,
      ),
    );
  }
  if (losses.length === 0) throw new Error(`Event ${event.id} has no scoreable targets`);
  return {
    eventId: event.id,
    score: losses.reduce((sum, value) => sum + value, 0) / losses.length,
    components: losses.length,
    prediction,
  };
}

export function evaluateDisruptionModel(
  model: DisruptionModel,
  parameters: DisruptionParameters,
  fitSet: 'development' | 'holdout',
  events: readonly HistoricalDisruptionEvent[] = historicalDisruptionEvents,
): BacktestScore {
  const selected = events.filter((event) => event.fitSet === fitSet);
  const scores = selected.map((event) =>
    scoreHistoricalEvent(event, simulateHistoricalDisruption(event, model, parameters)),
  );
  return {
    model,
    fitSet,
    meanScore: scores.reduce((sum, row) => sum + row.score, 0) / scores.length,
    events: scores,
  };
}

/** Grid selection sees only the 2010/2011/2021 development events. */
export function calibrateDisruptionModel(
  model: DisruptionModel,
  events: readonly HistoricalDisruptionEvent[] = historicalDisruptionEvents,
): CalibratedDisruptionModel {
  const inventoryGrid =
    model === 'cost-share-v1' ? [0] : [0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1];
  const substitutionGrid = model === 'cost-share-v1' ? [0] : [0, 0.5, 1];
  const priceGrid = [6, 7, 8, 9, 10, 11, 12];
  let best: CalibratedDisruptionModel | undefined;
  for (const accessibleInventoryFraction of inventoryGrid) {
    for (const substitutionMultiplier of substitutionGrid) {
      for (const scarcityPriceSlope of priceGrid) {
        const parameters = {
          accessibleInventoryFraction,
          substitutionMultiplier,
          scarcityPriceSlope,
        };
        const development = evaluateDisruptionModel(model, parameters, 'development', events);
        const candidate = {
          model,
          parameters,
          development,
          holdout: evaluateDisruptionModel(model, parameters, 'holdout', events),
        };
        if (!best || candidate.development.meanScore < best.development.meanScore) {
          best = candidate;
        }
      }
    }
  }
  if (!best) throw new Error(`No calibration candidates for ${model}`);
  return best;
}

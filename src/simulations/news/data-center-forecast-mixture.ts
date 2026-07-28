import {
  defineModel,
  defineEstimand,
  measurementPort,
  opaquePort,
  type ModelDefinition,
} from 'tsimulation';

export const DATA_CENTER_FORECAST_SEED = 20_350_723;
export const DATA_CENTER_FORECAST_DRAWS = 200_000;

export type DataCenterForecastBin =
  | 'below 10%'
  | '10% to below 15%'
  | '15% to below 20%'
  | '20% or more';
export type DataCenterSourceFamily =
  | 'EIA general energy model'
  | 'LBNL specialized bottom-up model';
export type DataCenterGrowthRegime =
  | 'EIA path'
  | 'headwinds'
  | 'central'
  | 'lift-off';

export interface DataCenterForecastDraw {
  share2030: number;
  share2035: number;
  relativeLogGrowth: number;
  sourceFamily: DataCenterSourceFamily;
  growthRegime: DataCenterGrowthRegime;
}

export interface DataCenterForecastSummary {
  bins: Record<DataCenterForecastBin, number>;
  p10: number;
  median: number;
  p90: number;
}

export interface DataCenterForecastMixtureInput {
  eiaWeight: number;
  draws: number;
}

const forecastWeightEstimand = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'estimand.forecast.structural-model-family-weight',
  version: '1.0.0',
  quantityKind: 'forecast.epistemic-model-family-weight',
  measure: { kind: 'share' },
  population: {
    id: 'population.forecast.structural-model-families',
    universe: 'Structural model families explicitly included in the analyst mixture.',
  },
  geography: {
    id: 'geo.model-specification',
    boundaryVersion: 'forecast-adapter-v1',
  },
  time: { kind: 'instant' },
  vintage: {
    basis: 'scenario-assumption',
    convention: 'Belief declared at the manifested run time.',
  },
});

const drawCountEstimand = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'estimand.forecast.monte-carlo-draw-count',
  version: '1.0.0',
  quantityKind: 'computation.monte-carlo-draw-count',
  measure: { kind: 'count' },
  population: {
    id: 'population.forecast.monte-carlo-draws',
    universe: 'Pseudo-random draws executed by one manifested forecast run.',
  },
  geography: {
    id: 'geo.model-specification',
    boundaryVersion: 'forecast-adapter-v1',
  },
  time: { kind: 'instant' },
  vintage: {
    basis: 'structural-constant',
    convention: 'Fixed for the manifested run.',
  },
});

export const dataCenter2035ShareEstimand = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'estimand.forecast.us-data-center-site-electricity-share-calendar-2035',
  version: '1.0.0',
  quantityKind: 'electricity.data-center-full-site-consumption-share',
  measure: { kind: 'share', totality: 'total', accounting: 'gross' },
  population: {
    id: 'population.us.data-center-sites',
    universe:
      'U.S. data-center sites including IT equipment and supporting site infrastructure.',
    exclusion: ['Separately metered cryptocurrency mining when separable'],
  },
  geography: {
    id: 'geo.us',
    boundaryVersion: '50-states-and-district-of-columbia',
  },
  ratio: {
    numerator: 'calendar-2035 full-site U.S. data-center electricity consumption',
    denominator: 'calendar-2035 total U.S. electricity consumption',
  },
  time: {
    kind: 'interval',
    interval: 'calendar-year-2035',
    aggregation: 'sum',
    calendar: 'gregorian',
  },
  vintage: {
    basis: 'scenario-assumption',
    convention: 'Epistemic distribution created at the manifested forecast origin.',
  },
});

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4_294_967_296;
  };
}

function normal(random: () => number): number {
  const first = Math.max(Number.EPSILON, random());
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function logit(value: number): number {
  return Math.log(value / (1 - value));
}

function logistic(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function classify(share: number): DataCenterForecastBin {
  if (share < 0.10) return 'below 10%';
  if (share < 0.15) return '10% to below 15%';
  if (share < 0.20) return '15% to below 20%';
  return '20% or more';
}

function quantile(sorted: readonly number[], probability: number): number {
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(probability * sorted.length)),
  );
  return sorted[index];
}

export function drawDataCenterForecasts(
  eiaWeight: number,
  seed = DATA_CENTER_FORECAST_SEED,
  drawCount = DATA_CENTER_FORECAST_DRAWS,
): DataCenterForecastDraw[] {
  if (!Number.isFinite(eiaWeight) || eiaWeight < 0 || eiaWeight > 1) {
    throw new Error('EIA structural weight must be in [0, 1]');
  }
  if (!Number.isInteger(drawCount) || drawCount < 1) {
    throw new Error('Data-center forecast draw count must be a positive integer');
  }
  const random = mulberry32(seed);
  const draws: DataCenterForecastDraw[] = [];
  for (let index = 0; index < drawCount; index++) {
    const isEia = random() < eiaWeight;
    let share2030: number;
    let relativeLogGrowth: number;
    let sourceFamily: DataCenterSourceFamily;
    let growthRegime: DataCenterGrowthRegime;
    if (isEia) {
      sourceFamily = 'EIA general energy model';
      growthRegime = 'EIA path';
      share2030 = logistic(logit(0.060) + 0.25 * normal(random));
      relativeLogGrowth = 0.060 + 0.030 * normal(random);
    } else {
      sourceFamily = 'LBNL specialized bottom-up model';
      share2030 = logistic(logit(0.118) + 0.23 * normal(random));
      const regime = random();
      if (regime < 0.30) {
        growthRegime = 'headwinds';
        relativeLogGrowth = 0.030 + 0.030 * normal(random);
      } else if (regime < 0.80) {
        growthRegime = 'central';
        relativeLogGrowth = 0.100 + 0.035 * normal(random);
      } else {
        growthRegime = 'lift-off';
        relativeLogGrowth = 0.170 + 0.040 * normal(random);
      }
    }
    const share2035 = logistic(logit(share2030) + 5 * relativeLogGrowth);
    draws.push({
      share2030,
      share2035,
      relativeLogGrowth,
      sourceFamily,
      growthRegime,
    });
  }
  return draws;
}

export function summarizeDataCenterForecasts(
  draws: readonly DataCenterForecastDraw[],
): DataCenterForecastSummary {
  if (draws.length === 0) throw new Error('Cannot summarize zero forecast draws');
  const orderedBins: DataCenterForecastBin[] = [
    'below 10%',
    '10% to below 15%',
    '15% to below 20%',
    '20% or more',
  ];
  const counts = new Map<DataCenterForecastBin, number>(
    orderedBins.map((bin) => [bin, 0]),
  );
  for (const draw of draws) {
    const bin = classify(draw.share2035);
    counts.set(bin, (counts.get(bin) ?? 0) + 1);
  }
  const shares = draws.map(({ share2035 }) => share2035).sort((left, right) => left - right);
  return {
    bins: Object.fromEntries(
      orderedBins.map((bin) => [bin, (counts.get(bin) ?? 0) / draws.length]),
    ) as Record<DataCenterForecastBin, number>,
    p10: quantile(shares, 0.10),
    median: quantile(shares, 0.50),
    p90: quantile(shares, 0.90),
  };
}

export function dataCenterConditionalProbability(
  draws: readonly DataCenterForecastDraw[],
  condition: (draw: DataCenterForecastDraw) => boolean,
): { draws: number; pAtLeast20: number } {
  const selected = draws.filter(condition);
  if (selected.length === 0) {
    throw new Error('Data-center conditional selected no draws');
  }
  return {
    draws: selected.length,
    pAtLeast20:
      selected.filter(({ share2035 }) => share2035 >= 0.20).length /
      selected.length,
  };
}

export const dataCenterForecastMixtureModel: ModelDefinition<
  DataCenterForecastMixtureInput,
  DataCenterForecastSummary
> = defineModel({
  id: 'us-data-center-2035-judgmental-mixture',
  version: '1.0.0',
  description:
    'Seeded analyst-weighted mixture over EIA and LBNL structural families for the 2035 question.',
  inputPorts: {
    eiaWeight: measurementPort('fraction', forecastWeightEstimand, 'number'),
    draws: measurementPort('1', drawCountEstimand, 'number'),
  },
  outputPorts: {
    bins: opaquePort('Four ordered-bin probabilities.', 'record'),
    p10: measurementPort('fraction', dataCenter2035ShareEstimand, 'number'),
    median: measurementPort('fraction', dataCenter2035ShareEstimand, 'number'),
    p90: measurementPort('fraction', dataCenter2035ShareEstimand, 'number'),
  },
  semanticValidation: 'if-present',
  validateInput: ({ eiaWeight, draws }) => {
    if (!Number.isFinite(eiaWeight) || eiaWeight < 0 || eiaWeight > 1) {
      throw new Error('EIA structural weight must be in [0, 1]');
    }
    if (!Number.isInteger(draws) || draws < 1) {
      throw new Error('Draw count must be a positive integer');
    }
  },
  invariants: [{
    id: 'probabilities-sum-to-one',
    description: 'The four outcome probabilities sum to one.',
    check: (output) =>
      Math.abs(
        Object.values(output.bins).reduce((sum, probability) => sum + probability, 0) - 1,
      ) < 1e-12,
  }],
  run: (input, context) => summarizeDataCenterForecasts(
    drawDataCenterForecasts(
      input.eiaWeight,
      context.seed ?? DATA_CENTER_FORECAST_SEED,
      input.draws,
    ),
  ),
});

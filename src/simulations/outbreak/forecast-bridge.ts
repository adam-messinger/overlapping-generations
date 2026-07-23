import {
  defineAdapter,
  observationPort,
  runAdapter,
} from 'tsimulation';
import {
  FORECAST_QUANTILES,
  type ForecastQuantile,
  type ProbabilisticForecast,
} from './probabilistic.js';
import {
  cdcFixedInitialAdmissionsMeasurement,
  cdcOperationalAdmissionsMeasurement,
  operationalToFixedInitialAdmissionsCrosswalk,
} from './measurement-contracts.js';

export interface ResolutionForecastInput {
  forecast: ProbabilisticForecast;
  /** Count-scale fixed-initial / operational overlap ratio. */
  correction: number;
}

export interface ResolutionAdmissionsForecast {
  point: number;
  quantiles: Readonly<Record<ForecastQuantile, number>>;
}

export function mapOperationalToFixedInitialCount(
  operationalCount: number,
  correction: number,
): number {
  if (!Number.isFinite(operationalCount) || operationalCount < 0) {
    throw new Error('Operational admission count must be finite and non-negative');
  }
  if (!Number.isFinite(correction) || correction <= 0) {
    throw new Error('Measurement correction must be finite and positive');
  }
  return operationalCount * correction;
}

/**
 * The forecasting algorithm targets the long, revisable operational series.
 * This adapter maps its count-scale output to the fixed-initial series used by
 * the July 2026 resolution contract and records that regime change explicitly.
 */
export const outbreakResolutionAdapter = defineAdapter<
  ResolutionForecastInput,
  ResolutionAdmissionsForecast
>({
  id: 'outbreak-operational-to-fixed-initial-resolution',
  version: '1.0.0',
  description: 'Convert operational-series log-count forecast output to fixed-initial CDC resolution counts.',
  sourceModel: 'outbreak-probabilistic-forecast',
  targetModel: 'cdc-fixed-initial-resolution',
  sourceTimeScale: { kind: 'weekly' },
  targetTimeScale: { kind: 'weekly' },
  semanticValidation: 'required',
  measurementValidation: 'required',
  sourcePorts: {
    admissions: observationPort(
      'log1p-admissions',
      cdcOperationalAdmissionsMeasurement,
    ),
  },
  targetPorts: {
    admissions: observationPort(
      'people/week',
      cdcFixedInitialAdmissionsMeasurement,
    ),
  },
  portMappings: [{
    source: 'admissions',
    target: 'admissions',
    conversion: {
      kind: 'custom',
      description: 'Invert log1p to counts and multiply by the overlap-based measurement correction.',
      convert: (value) => value,
    },
    aggregation: { kind: 'none' },
    measurementCrosswalk: operationalToFixedInitialAdmissionsCrosswalk,
  }],
  adapt: ({ forecast, correction }) => ({
    point: mapOperationalToFixedInitialCount(
      Math.expm1(forecast.pointLog),
      correction,
    ),
    quantiles: Object.fromEntries(
      FORECAST_QUANTILES.map((probability) => [
        probability,
        mapOperationalToFixedInitialCount(
          Math.expm1(forecast.quantilesLog[probability]),
          correction,
        ),
      ]),
    ) as Record<ForecastQuantile, number>,
  }),
});

export function runOutbreakResolutionAdapter(
  input: ResolutionForecastInput,
): ResolutionAdmissionsForecast {
  return runAdapter(outbreakResolutionAdapter, input).target;
}

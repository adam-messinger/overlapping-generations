import {
  fixedInitialCovidObservations,
  operationalCovidContinuation,
} from '../src/simulations/outbreak/pilot-data-2026-07-23.js';
import {
  evaluateSeries,
  historicalResiduals,
  makeForecast,
} from '../src/simulations/outbreak/probabilistic.js';
import {
  mapOperationalToFixedInitialCount,
  runOutbreakResolutionAdapter,
} from '../src/simulations/outbreak/forecast-bridge.js';
import {
  respiratorySeries,
  type RespiratorySeries,
} from '../src/simulations/outbreak/rolling-data.js';

const TARGET_WEEK = '2026-08-15';
const HORIZON = 4;
const MODEL = 'adaptive-ensemble';
const BIN_LIMITS = [4_000, 6_000, 9_000, 14_000] as const;

function assertConsecutive(weeks: readonly string[]): void {
  for (let index = 1; index < weeks.length; index++) {
    const previous = Date.parse(`${weeks[index - 1]}T00:00:00Z`);
    const current = Date.parse(`${weeks[index]}T00:00:00Z`);
    if ((current - previous) / 86_400_000 !== 7) {
      throw new Error(`Non-consecutive weeks: ${weeks[index - 1]} -> ${weeks[index]}`);
    }
  }
}

function quantile(values: readonly number[], probability: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const position = probability * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function format(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const frozen = respiratorySeries('covid19');
if (frozen.weeks.at(-1) !== '2025-05-31') {
  throw new Error('Unexpected end of frozen respiratory series');
}
const weeks = [
  ...frozen.weeks,
  ...operationalCovidContinuation.map((row) => row.weekEnding),
];
const admissions = [
  ...frozen.admissions,
  ...operationalCovidContinuation.map((row) => row.admissions),
];
assertConsecutive(weeks);

const extended: RespiratorySeries = {
  ...frozen,
  weeks,
  admissions,
};
const originIndex = admissions.length - 1;
if (weeks[originIndex] !== '2026-07-18') {
  throw new Error('Unexpected operational forecast origin');
}

const operationalByWeek = new Map(
  operationalCovidContinuation.map((row) => [row.weekEnding, row.admissions]),
);
const overlapRatios = fixedInitialCovidObservations.map((row) => {
  const operational = operationalByWeek.get(row.weekEnding);
  if (operational === undefined) throw new Error(`Missing overlap at ${row.weekEnding}`);
  return row.admissions / operational;
});
const resolverCorrection =
  overlapRatios.reduce((sum, value) => sum + value, 0) / overlapRatios.length;

const forecast = makeForecast(admissions, MODEL, originIndex, HORIZON);
const residuals = historicalResiduals(admissions, MODEL, originIndex, HORIZON);
const resolverSamples = residuals.map(
  (residual) => mapOperationalToFixedInitialCount(
    Math.max(0, Math.expm1(forecast.pointLog + residual)),
    resolverCorrection,
  ),
);

const binCounts = [0, 0, 0, 0, 0];
for (const value of resolverSamples) {
  const index = BIN_LIMITS.findIndex((limit) => value < limit);
  binCounts[index === -1 ? 4 : index]++;
}

const resolutionForecast = runOutbreakResolutionAdapter({
  forecast,
  correction: resolverCorrection,
});
const resolverQuantiles = resolutionForecast.quantiles;
const recentEvaluation = evaluateSeries(extended, {
  firstTargetIndex: frozen.admissions.length,
});

const valuesByWeek = new Map(
  weeks.map((week, index) => [week, admissions[index]]),
);
const analogDates = [
  ['2021', '2021-07-17', '2021-08-14'],
  ['2022', '2022-07-16', '2022-08-13'],
  ['2023', '2023-07-15', '2023-08-12'],
  ['2024', '2024-07-20', '2024-08-17'],
  ['2025', '2025-07-19', '2025-08-16'],
] as const;
const latestResolverEquivalent =
  operationalCovidContinuation.at(-1)!.admissions * resolverCorrection;
const analogs = analogDates.map(([year, originWeek, targetWeek]) => {
  const origin = valuesByWeek.get(originWeek);
  const target = valuesByWeek.get(targetWeek);
  if (origin === undefined || target === undefined) {
    throw new Error(`Missing analog observations for ${year}`);
  }
  const multiplier = target / origin;
  return { year, origin, target, multiplier, scaledTarget: latestResolverEquivalent * multiplier };
});

console.log('OUTBREAK FORECAST PILOT — frozen 2026-07-23 vintage');
console.log(`Operational origin: ${weeks[originIndex]} (${format(admissions[originIndex])})`);
console.log(`Target: ${TARGET_WEEK}; horizon: ${HORIZON} weeks`);
console.log(
  `Fixed-initial / operational overlap correction: ${resolverCorrection.toFixed(4)} ` +
  `(n=${overlapRatios.length})`,
);
console.log(`Forecast residuals: n=${residuals.length}\n`);

console.log('Model-only adaptive forecast, mapped to the resolution series');
console.log(
  `Point=${format(resolutionForecast.point)}; ` +
  `q2.5=${format(resolverQuantiles[0.025])}; q25=${format(resolverQuantiles[0.25])}; ` +
  `q50=${format(resolverQuantiles[0.5])}; q75=${format(resolverQuantiles[0.75])}; ` +
  `q97.5=${format(resolverQuantiles[0.975])}`,
);
console.log(
  `Empirical-residual bins: ${binCounts
    .map((count, index) => `${String.fromCharCode(65 + index)}=${(100 * count / resolverSamples.length).toFixed(1)}%`)
    .join('; ')}`,
);
console.log(
  `Residual samples >=9,000: ${resolverSamples.filter((value) => value >= 9_000).length}/` +
  `${resolverSamples.length}; max=${format(Math.max(...resolverSamples))}`,
);
console.log(
  `Recomputed sample quantiles: ${[0.025, 0.25, 0.5, 0.75, 0.975]
    .map((probability) => `${probability}=${format(quantile(resolverSamples, probability))}`)
    .join('; ')}\n`,
);

console.log('Four-week mid-July-to-mid-August reference class');
console.log('Year\torigin\ttarget\tmultiple\tscaled-to-current');
for (const row of analogs) {
  console.log(
    `${row.year}\t${format(row.origin)}\t${format(row.target)}\t` +
    `${row.multiplier.toFixed(2)}x\t${format(row.scaledTarget)}`,
  );
}

console.log('\nPost-development pseudo-holdout, targets 2025-06-07 through 2026-07-18');
for (const model of ['persistence', 'local-trend', 'adaptive-ensemble'] as const) {
  const result = recentEvaluation.models[model];
  console.log(
    `${model}: WIS=${result.wis.toFixed(3)}; 50% coverage=` +
    `${(100 * result.coverage50).toFixed(1)}%; 95% coverage=` +
    `${(100 * result.coverage95).toFixed(1)}%; n=${result.forecasts}`,
  );
}

import type { OutbreakEpisode } from './data.js';
import { assertFiniteDeep, validateNumber } from 'tsimulation';

export interface OutbreakSeries {
  weeklyCases: number[];
  weeklyDeaths: number[];
  weeklyInfections: number[];
  peakHospitalLoad: number;
  totalInfections: number;
  totalDeaths: number;
}

export interface OutbreakV1Params {
  population: number;
  weeks: number;
  r0: number;
  infectiousDays: number;
  initialInfectious: number;
  responseStartDay: number;
  responseMultiplier: number;
  ascertainment: number;
  infectionFatalityRatio: number;
  caseReportDelayDays: number;
  infectionToDeathDays: number;
}

export interface CountermeasureParams {
  startDay: number;
  coursesPerThousandPerDay: number;
  effectivenessAgainstInfection: number;
}

/**
 * A later change in the contact multiplier, applied after the response and
 * easing schedule. Stages are evaluated in order; each ramps linearly from the
 * multiplier in force when it starts to its own value over `rampDays`.
 */
export interface ResponseStage {
  startDay: number;
  multiplier: number;
  rampDays: number;
}

export interface OutbreakV2Params extends OutbreakV1Params {
  incubationDays: number;
  initialExposed: number;
  responseRampDays: number;
  easingStartDaysAfterResponse: number;
  easedResponseMultiplier: number;
  easingRampDays: number;
  importedInfectionsPerMillionPerDay: number;
  hospitalizationRate: number;
  hospitalStayDays: number;
  staffedBedsPer100k: number;
  overflowFatalitySlope: number;
  severityDeclineStartDaysAfterResponse: number;
  severityHalfLifeDays: number;
  severityFloor: number;
  countermeasure?: CountermeasureParams;
  additionalStages?: readonly ResponseStage[];
}

export interface FitMetrics {
  caseNmae: number;
  deathNmae: number;
  casePeakWeekError: number;
  deathPeakWeekError: number;
  caseCumulativeError: number;
  deathCumulativeError: number;
  score: number;
}

export interface EpisodeEvaluation {
  train: FitMetrics;
  holdout: FitMetrics;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function validateV1(params: OutbreakV1Params): void {
  assertFiniteDeep(params, 'outbreak V1 params');
  const errors = [
    ...validateNumber(params.population, 'population', { min: 0, exclusiveMin: true }),
    ...validateNumber(params.weeks, 'weeks', { integer: true, min: 1 }),
    ...validateNumber(params.r0, 'r0', { min: 0 }),
    ...validateNumber(params.infectiousDays, 'infectiousDays', { min: 0, exclusiveMin: true }),
    ...validateNumber(params.initialInfectious, 'initialInfectious', { min: 0 }),
    ...validateNumber(params.responseStartDay, 'responseStartDay', { min: 0 }),
    ...validateNumber(params.responseMultiplier, 'responseMultiplier', { min: 0, max: 2 }),
    ...validateNumber(params.ascertainment, 'ascertainment', { min: 0, max: 1 }),
    ...validateNumber(params.infectionFatalityRatio, 'infectionFatalityRatio', { min: 0, max: 1 }),
    ...validateNumber(params.caseReportDelayDays, 'caseReportDelayDays', { integer: true, min: 0 }),
    ...validateNumber(params.infectionToDeathDays, 'infectionToDeathDays', { integer: true, min: 0 }),
  ];
  if (params.initialInfectious > params.population) errors.push('initialInfectious must not exceed population');
  if (errors.length > 0) throw new Error(`Invalid outbreak V1 params:\n  ${errors.join('\n  ')}`);
}

function validateV2(params: OutbreakV2Params): void {
  const { easingStartDaysAfterResponse, severityHalfLifeDays, ...finite } = params;
  assertFiniteDeep(finite, 'outbreak V2 params');
  validateV1({
    population: params.population,
    weeks: params.weeks,
    r0: params.r0,
    infectiousDays: params.infectiousDays,
    initialInfectious: params.initialInfectious,
    responseStartDay: params.responseStartDay,
    responseMultiplier: params.responseMultiplier,
    ascertainment: params.ascertainment,
    infectionFatalityRatio: params.infectionFatalityRatio,
    caseReportDelayDays: params.caseReportDelayDays,
    infectionToDeathDays: params.infectionToDeathDays,
  });
  const errors = [
    ...validateNumber(params.incubationDays, 'incubationDays', { min: 0, exclusiveMin: true }),
    ...validateNumber(params.initialExposed, 'initialExposed', { min: 0 }),
    ...validateNumber(params.responseRampDays, 'responseRampDays', { min: 0, exclusiveMin: true }),
    ...(!Number.isFinite(easingStartDaysAfterResponse) && easingStartDaysAfterResponse === Number.POSITIVE_INFINITY
      ? [] : validateNumber(easingStartDaysAfterResponse, 'easingStartDaysAfterResponse', { min: 0 })),
    ...validateNumber(params.easedResponseMultiplier, 'easedResponseMultiplier', { min: 0, max: 2 }),
    ...validateNumber(params.easingRampDays, 'easingRampDays', { min: 0, exclusiveMin: true }),
    ...validateNumber(params.importedInfectionsPerMillionPerDay, 'importedInfectionsPerMillionPerDay', { min: 0 }),
    ...validateNumber(params.hospitalizationRate, 'hospitalizationRate', { min: 0, max: 1 }),
    ...validateNumber(params.hospitalStayDays, 'hospitalStayDays', { integer: true, min: 1 }),
    ...validateNumber(params.staffedBedsPer100k, 'staffedBedsPer100k', { min: 0 }),
    ...validateNumber(params.overflowFatalitySlope, 'overflowFatalitySlope', { min: 0 }),
    ...validateNumber(params.severityDeclineStartDaysAfterResponse, 'severityDeclineStartDaysAfterResponse', { min: 0 }),
    ...(!Number.isFinite(severityHalfLifeDays) && severityHalfLifeDays === Number.POSITIVE_INFINITY
      ? [] : validateNumber(severityHalfLifeDays, 'severityHalfLifeDays', { min: 0, exclusiveMin: true })),
    ...validateNumber(params.severityFloor, 'severityFloor', { min: 0, max: 1 }),
  ];
  if (params.initialInfectious + params.initialExposed > params.population) {
    errors.push('initialInfectious + initialExposed must not exceed population');
  }
  params.additionalStages?.forEach((stage, index, stages) => {
    errors.push(
      ...validateNumber(stage.startDay, `additionalStages[${index}].startDay`, { min: 0 }),
      ...validateNumber(stage.multiplier, `additionalStages[${index}].multiplier`, { min: 0, max: 2 }),
      ...validateNumber(stage.rampDays, `additionalStages[${index}].rampDays`, { min: 0, exclusiveMin: true }),
    );
    const previous = stages[index - 1];
    if (previous && stage.startDay < previous.startDay) {
      errors.push(`additionalStages[${index}].startDay must not precede the previous stage`);
    }
  });
  if (params.countermeasure) {
    errors.push(
      ...validateNumber(params.countermeasure.startDay, 'countermeasure.startDay', { min: 0 }),
      ...validateNumber(params.countermeasure.coursesPerThousandPerDay, 'countermeasure.coursesPerThousandPerDay', { min: 0 }),
      ...validateNumber(params.countermeasure.effectivenessAgainstInfection, 'countermeasure.effectivenessAgainstInfection', { min: 0, max: 1 }),
    );
  }
  if (errors.length > 0) throw new Error(`Invalid outbreak V2 params:\n  ${errors.join('\n  ')}`);
}

function aggregateWeeks(daily: readonly number[], weeks: number): number[] {
  const weekly = Array.from({ length: weeks }, () => 0);
  for (let day = 0; day < daily.length; day++) {
    const week = Math.floor(day / 7);
    if (week < weeks) weekly[week] += daily[day];
  }
  return weekly;
}

function delayedValue(
  values: readonly number[],
  day: number,
  centerDelay: number,
  distributed: boolean,
): number {
  if (!distributed) return values[day - centerDelay] ?? 0;
  // A compact approximation to an onset/reporting or infection/death delay
  // distribution. It avoids the false precision of a single deterministic lag.
  const weights = [0.1, 0.2, 0.4, 0.2, 0.1];
  const offsets = [-4, -2, 0, 2, 4];
  return weights.reduce(
    (sum, weight, index) =>
      sum + weight * (values[day - centerDelay - offsets[index]] ?? 0),
    0,
  );
}

/** V1: homogeneous SIR, a single instantaneous response step, fixed delays. */
export function simulateOutbreakV1(params: OutbreakV1Params): OutbreakSeries {
  validateV1(params);
  const days = params.weeks * 7;
  let susceptible = params.population - params.initialInfectious;
  let infectious = params.initialInfectious;
  let removed = 0;
  const infections: number[] = [];
  const cases: number[] = [];
  const deaths: number[] = [];
  const beta = params.r0 / params.infectiousDays;

  for (let day = 0; day < days; day++) {
    const contact = day >= params.responseStartDay ? params.responseMultiplier : 1;
    const newInfections = clamp(
      beta * contact * infectious * (susceptible / params.population),
      0,
      susceptible,
    );
    const recoveries = Math.min(infectious, infectious / params.infectiousDays);
    susceptible -= newInfections;
    infectious += newInfections - recoveries;
    removed += recoveries;
    infections.push(newInfections);
    cases.push(
      params.ascertainment *
        delayedValue(infections, day, params.caseReportDelayDays, false),
    );
    deaths.push(
      params.infectionFatalityRatio *
        delayedValue(infections, day, params.infectionToDeathDays, false),
    );
  }

  void removed;
  const weeklyCases = aggregateWeeks(cases, params.weeks);
  const weeklyDeaths = aggregateWeeks(deaths, params.weeks);
  const result = {
    weeklyCases,
    weeklyDeaths,
    weeklyInfections: aggregateWeeks(infections, params.weeks),
    peakHospitalLoad: 0,
    totalInfections: infections.reduce((a, b) => a + b, 0),
    totalDeaths: weeklyDeaths.reduce((a, b) => a + b, 0),
  };
  assertFiniteDeep(result, 'outbreak V1 result');
  return result;
}

function contactMultiplier(day: number, params: OutbreakV2Params): number {
  let value = scheduledContactMultiplier(day, params);
  for (const stage of params.additionalStages ?? []) {
    if (day < stage.startDay) break;
    const progress = clamp((day - stage.startDay + 1) / stage.rampDays, 0, 1);
    value += progress * (stage.multiplier - value);
  }
  return value;
}

function scheduledContactMultiplier(day: number, params: OutbreakV2Params): number {
  if (day < params.responseStartDay) return 1;
  const responseProgress = clamp(
    (day - params.responseStartDay + 1) / params.responseRampDays,
    0,
    1,
  );
  const initialResponse =
    1 - responseProgress * (1 - params.responseMultiplier);
  const easingStart =
    params.responseStartDay + params.easingStartDaysAfterResponse;
  if (day < easingStart) return initialResponse;
  const easingProgress = clamp(
    (day - easingStart + 1) / params.easingRampDays,
    0,
    1,
  );
  return (
    initialResponse +
    easingProgress * (params.easedResponseMultiplier - initialResponse)
  );
}

/**
 * V2: SEIR disease clock, gradual response/easing, distributed observation
 * delays, low continuing import pressure, optional countermeasure rollout, and
 * a simple staffed-bed overflow channel.
 */
export function simulateOutbreakV2(params: OutbreakV2Params): OutbreakSeries {
  validateV2(params);
  const days = params.weeks * 7;
  let susceptible =
    params.population - params.initialInfectious - params.initialExposed;
  let exposed = params.initialExposed;
  let infectious = params.initialInfectious;
  let removed = 0;
  const infections: number[] = [];
  const fatalityWeightedInfections: number[] = [];
  const cases: number[] = [];
  const deaths: number[] = [];
  const hospitalAdmissions: number[] = [];
  let hospitalLoad = 0;
  let peakHospitalLoad = 0;
  const beta = params.r0 / params.infectiousDays;
  const bedCapacity = (params.staffedBedsPer100k / 100_000) * params.population;

  for (let day = 0; day < days; day++) {
    if (params.countermeasure && day >= params.countermeasure.startDay) {
      const courses =
        (params.countermeasure.coursesPerThousandPerDay / 1_000) *
        params.population;
      const newlyProtected = Math.min(
        susceptible,
        courses * params.countermeasure.effectivenessAgainstInfection,
      );
      susceptible -= newlyProtected;
      removed += newlyProtected;
    }

    const imports =
      (params.importedInfectionsPerMillionPerDay / 1_000_000) *
      params.population;
    const locallyAcquired =
      beta *
      contactMultiplier(day, params) *
      infectious *
      (susceptible / params.population);
    const newInfections = clamp(locallyAcquired + imports, 0, susceptible);
    const progressions = Math.min(exposed, exposed / params.incubationDays);
    const recoveries = Math.min(infectious, infectious / params.infectiousDays);

    susceptible -= newInfections;
    exposed += newInfections - progressions;
    infectious += progressions - recoveries;
    removed += recoveries;
    infections.push(newInfections);

    const admissions = params.hospitalizationRate * newInfections;
    hospitalAdmissions.push(admissions);
    hospitalLoad += admissions - (hospitalAdmissions[day - params.hospitalStayDays] ?? 0);
    hospitalLoad = Math.max(0, hospitalLoad);
    peakHospitalLoad = Math.max(peakHospitalLoad, hospitalLoad);
    const overload = bedCapacity > 0 ? Math.max(0, hospitalLoad / bedCapacity - 1) : 0;
    const fatalityMultiplier = 1 + params.overflowFatalitySlope * overload;
    const severityDeclineStart =
      params.responseStartDay + params.severityDeclineStartDaysAfterResponse;
    const severityElapsed = Math.max(0, day - severityDeclineStart);
    const severityFactor =
      day < severityDeclineStart || !Number.isFinite(params.severityHalfLifeDays)
        ? 1
        : params.severityFloor +
          (1 - params.severityFloor) *
            2 ** (-severityElapsed / params.severityHalfLifeDays);
    fatalityWeightedInfections.push(
      newInfections * fatalityMultiplier * severityFactor,
    );

    cases.push(
      params.ascertainment *
        delayedValue(infections, day, params.caseReportDelayDays, true),
    );
    deaths.push(
      params.infectionFatalityRatio *
        delayedValue(
          fatalityWeightedInfections,
          day,
          params.infectionToDeathDays,
          true,
        ),
    );
  }

  void removed;
  const weeklyCases = aggregateWeeks(cases, params.weeks);
  const weeklyDeaths = aggregateWeeks(deaths, params.weeks);
  const result = {
    weeklyCases,
    weeklyDeaths,
    weeklyInfections: aggregateWeeks(infections, params.weeks),
    peakHospitalLoad,
    totalInfections: infections.reduce((a, b) => a + b, 0),
    totalDeaths: weeklyDeaths.reduce((a, b) => a + b, 0),
  };
  assertFiniteDeep(result, 'outbreak V2 result');
  return result;
}

function peakIndex(values: readonly number[]): number {
  let peak = -Infinity;
  let index = 0;
  values.forEach((value, candidate) => {
    if (value > peak) {
      peak = value;
      index = candidate;
    }
  });
  return index;
}

function metricsForSlice(
  observedCases: readonly number[],
  observedDeaths: readonly number[],
  predictedCases: readonly number[],
  predictedDeaths: readonly number[],
): FitMetrics {
  const nmae = (observed: readonly number[], predicted: readonly number[]) => {
    const denominator = Math.max(1, observed.reduce((a, b) => a + b, 0));
    return (
      observed.reduce(
        (sum, actual, index) => sum + Math.abs((predicted[index] ?? 0) - actual),
        0,
      ) / denominator
    );
  };
  const cumulativeError = (
    observed: readonly number[],
    predicted: readonly number[],
  ) => {
    const actual = observed.reduce((a, b) => a + b, 0);
    const forecast = predicted.reduce((a, b) => a + b, 0);
    return Math.abs(forecast - actual) / Math.max(1, actual);
  };
  const caseNmae = nmae(observedCases, predictedCases);
  const deathNmae = nmae(observedDeaths, predictedDeaths);
  const casePeakWeekError = Math.abs(peakIndex(observedCases) - peakIndex(predictedCases));
  const deathPeakWeekError = Math.abs(
    peakIndex(observedDeaths) - peakIndex(predictedDeaths),
  );
  const caseCumulativeError = cumulativeError(observedCases, predictedCases);
  const deathCumulativeError = cumulativeError(observedDeaths, predictedDeaths);
  const horizon = Math.max(1, observedCases.length - 1);
  const score =
    0.3 * caseNmae +
    0.3 * deathNmae +
    0.15 * caseCumulativeError +
    0.15 * deathCumulativeError +
    0.05 * (casePeakWeekError / horizon) +
    0.05 * (deathPeakWeekError / horizon);
  return {
    caseNmae,
    deathNmae,
    casePeakWeekError,
    deathPeakWeekError,
    caseCumulativeError,
    deathCumulativeError,
    score,
  };
}

export function evaluateEpisode(
  episode: OutbreakEpisode,
  series: OutbreakSeries,
): EpisodeEvaluation {
  const cases = episode.observations.map((row) => row.cases);
  const deaths = episode.observations.map((row) => row.deaths);
  const split = episode.trainWeeks;
  return {
    train: metricsForSlice(
      cases.slice(0, split),
      deaths.slice(0, split),
      series.weeklyCases.slice(0, split),
      series.weeklyDeaths.slice(0, split),
    ),
    holdout: metricsForSlice(
      cases.slice(split),
      deaths.slice(split),
      series.weeklyCases.slice(split),
      series.weeklyDeaths.slice(split),
    ),
  };
}

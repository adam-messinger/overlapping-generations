import type { OutbreakEpisode } from './data.js';
import {
  evaluateEpisode,
  simulateOutbreakV1,
  simulateOutbreakV2,
  type EpisodeEvaluation,
  type OutbreakSeries,
  type OutbreakV1Params,
  type OutbreakV2Params,
} from './model.js';

export interface CalibratedOutbreak<P> {
  params: P;
  series: OutbreakSeries;
  evaluation: EpisodeEvaluation;
}

export function fitScale(
  unitSeries: readonly number[],
  observations: readonly number[],
  weeks: number,
  min: number,
  max: number,
): number {
  let numerator = 0;
  let denominator = 0;
  for (let week = 0; week < weeks; week++) {
    numerator += unitSeries[week] * observations[week];
    denominator += unitSeries[week] ** 2;
  }
  if (denominator === 0) return min;
  return Math.min(max, Math.max(min, numerator / denominator));
}

export function scaledSeries(
  series: OutbreakSeries,
  ascertainment: number,
  ifr: number,
): OutbreakSeries {
  const weeklyCases = series.weeklyCases.map((value) => value * ascertainment);
  const weeklyDeaths = series.weeklyDeaths.map((value) => value * ifr);
  return {
    ...series,
    weeklyCases,
    weeklyDeaths,
    totalDeaths: weeklyDeaths.reduce((a, b) => a + b, 0),
  };
}

const R0_GRID = [2, 2.4, 2.8, 3.2, 3.6] as const;
const SEED_GRID = [10, 30, 100, 300, 1_000] as const;
const RESPONSE_DAY_GRID = [21, 28, 35, 42, 49, 56] as const;
const RESPONSE_FLOOR_GRID = [0.15, 0.25, 0.35, 0.45, 0.55] as const;

/** Grid fit on the training slice only. Biology and delay parameters stay fixed. */
export function calibrateOutbreakV1(
  episode: OutbreakEpisode,
): CalibratedOutbreak<OutbreakV1Params> {
  let best: CalibratedOutbreak<OutbreakV1Params> | undefined;
  const weeks = episode.observations.length;
  const observedCases = episode.observations.map((row) => row.cases);
  const observedDeaths = episode.observations.map((row) => row.deaths);

  for (const r0 of R0_GRID) {
    for (const initialInfectious of SEED_GRID) {
      for (const responseStartDay of RESPONSE_DAY_GRID) {
        for (const responseMultiplier of RESPONSE_FLOOR_GRID) {
          const unitParams: OutbreakV1Params = {
            population: episode.population,
            weeks,
            r0,
            infectiousDays: 5,
            initialInfectious,
            responseStartDay,
            responseMultiplier,
            ascertainment: 1,
            infectionFatalityRatio: 1,
            caseReportDelayDays: 5,
            infectionToDeathDays: 22,
          };
          const unit = simulateOutbreakV1(unitParams);
          const ascertainment = fitScale(
            unit.weeklyCases,
            observedCases,
            episode.trainWeeks,
            0.02,
            0.9,
          );
          const infectionFatalityRatio = fitScale(
            unit.weeklyDeaths,
            observedDeaths,
            episode.trainWeeks,
            0.002,
            0.03,
          );
          const series = scaledSeries(unit, ascertainment, infectionFatalityRatio);
          const params = { ...unitParams, ascertainment, infectionFatalityRatio };
          const evaluation = evaluateEpisode(episode, series);
          if (!best || evaluation.train.score < best.evaluation.train.score) {
            best = { params, series, evaluation };
          }
        }
      }
    }
  }
  if (!best) throw new Error(`No V1 calibration candidates for ${episode.id}`);
  return best;
}

const RAMP_GRID = [7, 14, 21, 28] as const;
// Continuing introductions and unresolved local clusters are expressed per
// million people per day. The broader range is needed because a closed model
// forces every first wave toward extinction and misses the observed summer
// floor, especially in the UK panel.
const IMPORT_GRID = [0, 0.1, 1, 3] as const;
const SEVERITY_HALF_LIFE_GRID = [21, 35, 56, Number.POSITIVE_INFINITY] as const;

/**
 * Revision fit. The same training split and R0/seed/response grids are retained;
 * only the mechanisms identified in the V1 retrospective are added.
 */
export function calibrateOutbreakV2(
  episode: OutbreakEpisode,
): CalibratedOutbreak<OutbreakV2Params> {
  let best: CalibratedOutbreak<OutbreakV2Params> | undefined;
  const weeks = episode.observations.length;
  const observedCases = episode.observations.map((row) => row.cases);
  const observedDeaths = episode.observations.map((row) => row.deaths);

  for (const r0 of R0_GRID) {
    for (const initialExposed of SEED_GRID) {
      for (const responseStartDay of RESPONSE_DAY_GRID) {
        for (const responseMultiplier of RESPONSE_FLOOR_GRID) {
          for (const responseRampDays of RAMP_GRID) {
            for (const importedInfectionsPerMillionPerDay of IMPORT_GRID) {
              for (const severityHalfLifeDays of SEVERITY_HALF_LIFE_GRID) {
              const unitParams: OutbreakV2Params = {
                population: episode.population,
                weeks,
                r0,
                infectiousDays: 5,
                incubationDays: 5.2,
                initialInfectious: Math.max(1, initialExposed * 0.2),
                initialExposed,
                responseStartDay,
                responseMultiplier,
                responseRampDays,
                // The first-wave holdout contains no defensible, common policy
                // release rule. Keep the response in place rather than use
                // future calendar knowledge to manufacture an easing date.
                easingStartDaysAfterResponse: 999,
                easedResponseMultiplier: 0.78,
                easingRampDays: 35,
                importedInfectionsPerMillionPerDay,
                ascertainment: 1,
                infectionFatalityRatio: 1,
                caseReportDelayDays: 5,
                infectionToDeathDays: 22,
                hospitalizationRate: 0.04,
                hospitalStayDays: 10,
                staffedBedsPer100k: 30,
                overflowFatalitySlope: 0.35,
                // This reduced-form term represents the observed first-wave
                // change in age/risk mix plus clinical learning. It is fitted,
                // not treated as immutable pathogen biology.
                severityDeclineStartDaysAfterResponse: 35,
                severityHalfLifeDays,
                severityFloor: 0.2,
              };
              const unit = simulateOutbreakV2(unitParams);
              const ascertainment = fitScale(
                unit.weeklyCases,
                observedCases,
                episode.trainWeeks,
                0.02,
                0.9,
              );
              const infectionFatalityRatio = fitScale(
                unit.weeklyDeaths,
                observedDeaths,
                episode.trainWeeks,
                0.002,
                0.03,
              );
              const series = scaledSeries(unit, ascertainment, infectionFatalityRatio);
              const params = {
                ...unitParams,
                ascertainment,
                infectionFatalityRatio,
              };
              const evaluation = evaluateEpisode(episode, series);
              if (!best || evaluation.train.score < best.evaluation.train.score) {
                best = { params, series, evaluation };
              }
              }
            }
          }
        }
      }
    }
  }
  if (!best) throw new Error(`No V2 calibration candidates for ${episode.id}`);
  return best;
}

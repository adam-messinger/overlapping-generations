import { expect, printSummary, test } from '../../test-utils.js';
import { calibrateOutbreakV1, calibrateOutbreakV2 } from './calibration.js';
import { outbreakEpisodes } from './data.js';
import { simulateOutbreakV1, simulateOutbreakV2 } from './model.js';

test('faster response reduces infections in the V1 toy model', () => {
  const common = {
    population: 10_000_000,
    weeks: 30,
    r0: 2.8,
    infectiousDays: 5,
    initialInfectious: 50,
    responseMultiplier: 0.35,
    ascertainment: 0.25,
    infectionFatalityRatio: 0.008,
    caseReportDelayDays: 5,
    infectionToDeathDays: 22,
  };
  const early = simulateOutbreakV1({ ...common, responseStartDay: 15 });
  const late = simulateOutbreakV1({ ...common, responseStartDay: 35 });
  expect(early.totalInfections).toBeLessThan(late.totalInfections);
});

test('countermeasure rollout reduces V2 deaths', () => {
  const common = {
    population: 10_000_000,
    weeks: 52,
    r0: 3,
    infectiousDays: 5,
    incubationDays: 5.2,
    initialInfectious: 10,
    initialExposed: 50,
    responseStartDay: 30,
    responseMultiplier: 0.5,
    responseRampDays: 14,
    easingStartDaysAfterResponse: 70,
    easedResponseMultiplier: 0.85,
    easingRampDays: 35,
    importedInfectionsPerMillionPerDay: 0.1,
    ascertainment: 0.25,
    infectionFatalityRatio: 0.007,
    caseReportDelayDays: 5,
    infectionToDeathDays: 22,
    hospitalizationRate: 0.04,
    hospitalStayDays: 10,
    staffedBedsPer100k: 30,
    overflowFatalitySlope: 0.35,
    severityDeclineStartDaysAfterResponse: 35,
    severityHalfLifeDays: 35,
    severityFloor: 0.2,
  };
  const none = simulateOutbreakV2(common);
  const rollout = simulateOutbreakV2({
    ...common,
    countermeasure: {
      startDay: 120,
      coursesPerThousandPerDay: 5,
      effectivenessAgainstInfection: 0.75,
    },
  });
  expect(rollout.totalDeaths).toBeLessThan(none.totalDeaths);
});

test('calibration never sees the frozen holdout slice', () => {
  const episode = outbreakEpisodes[0];
  const changedHoldout = {
    ...episode,
    observations: episode.observations.map((row, index) =>
      index < episode.trainWeeks
        ? row
        : { ...row, cases: row.cases * 100, deaths: row.deaths * 100 },
    ),
  };
  const original = calibrateOutbreakV1(episode);
  const changed = calibrateOutbreakV1(changedHoldout);
  expect(changed.params).toEqual(original.params);
});

test('V2 revision improves mean holdout score on the three-country panel', () => {
  let v1 = 0;
  let v2 = 0;
  for (const episode of outbreakEpisodes) {
    v1 += calibrateOutbreakV1(episode).evaluation.holdout.score;
    v2 += calibrateOutbreakV2(episode).evaluation.holdout.score;
  }
  expect(v2 / outbreakEpisodes.length).toBeLessThan(
    v1 / outbreakEpisodes.length,
  );
});

printSummary();

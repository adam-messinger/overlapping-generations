import {
  calibrateOutbreakV1,
  calibrateOutbreakV2,
} from '../src/simulations/outbreak/calibration.js';
import { outbreakEpisodes } from '../src/simulations/outbreak/data.js';
import { simulateOutbreakV2 } from '../src/simulations/outbreak/model.js';
import { evaluatePanel } from '../src/simulations/outbreak/probabilistic.js';
import { respiratoryPanel } from '../src/simulations/outbreak/rolling-data.js';
import { runModel } from 'tsimulation';
import { outbreakPreparednessModel } from '../src/simulations/registry.js';

const pct = (value: number) => `${(100 * value).toFixed(1)}%`;
const round = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 0 });

console.log('OUTBREAK BACKTEST — frozen WHO weekly reports');
console.log('Fit: weeks 1–15; holdout: weeks 16–25. Lower score is better.\n');
console.log('Episode\tV1 train\tV1 holdout\tV2 train\tV2 holdout\tV2 R0\tresponse day');

let v1Mean = 0;
let v2Mean = 0;
for (const episode of outbreakEpisodes) {
  const v1 = calibrateOutbreakV1(episode);
  const v2 = calibrateOutbreakV2(episode);
  v1Mean += v1.evaluation.holdout.score;
  v2Mean += v2.evaluation.holdout.score;
  console.log(
    [
      episode.label,
      v1.evaluation.train.score.toFixed(3),
      v1.evaluation.holdout.score.toFixed(3),
      v2.evaluation.train.score.toFixed(3),
      v2.evaluation.holdout.score.toFixed(3),
      v2.params.r0.toFixed(1),
      v2.params.responseStartDay,
    ].join('\t'),
  );
}
v1Mean /= outbreakEpisodes.length;
v2Mean /= outbreakEpisodes.length;
console.log(`\nMean holdout: V1 ${v1Mean.toFixed(3)}; V2 ${v2Mean.toFixed(3)} (${pct(1 - v2Mean / v1Mean)} lower).`);

const rollingDevelopment = evaluatePanel(respiratoryPanel, 'development');
const rollingHoldout = evaluatePanel(respiratoryPanel, 'holdout');
console.log('\nROLLING PROBABILISTIC BACKTEST — frozen CDC national admissions');
console.log('Horizons: 1–4 weeks. Score: WIS on log1p admissions; lower is better.');
console.log('Holdout: final 52 weeks for COVID/influenza and final 26 weeks for RSV.\n');
console.log('Pathogen\tpersistence WIS\tlocal trend WIS\tadaptive WIS\tadaptive 50% cov\tadaptive 95% cov');
for (const row of rollingHoldout.pathogens) {
  const adaptive = row.models['adaptive-ensemble'];
  console.log([
    row.pathogen,
    row.models.persistence.wis.toFixed(3),
    row.models['local-trend'].wis.toFixed(3),
    adaptive.wis.toFixed(3),
    pct(adaptive.coverage50),
    pct(adaptive.coverage95),
  ].join('\t'));
}
for (const [label, evaluation] of [
  ['Development', rollingDevelopment],
  ['Frozen holdout', rollingHoldout],
] as const) {
  const baseline = evaluation.macroAverage.persistence;
  const initial = evaluation.macroAverage['local-trend'];
  const revised = evaluation.macroAverage['adaptive-ensemble'];
  console.log(
    `${label} macro WIS: persistence ${baseline.wis.toFixed(3)}; ` +
    `local trend ${initial.wis.toFixed(3)}; adaptive ${revised.wis.toFixed(3)} ` +
    `(${pct(1 - revised.wis / baseline.wis)} below persistence).`,
  );
}
console.log('Adaptive holdout WIS by horizon: ' +
  ([1, 2, 3, 4] as const)
    .map((horizon) => `${horizon}w=${rollingHoldout.macroAverage['adaptive-ensemble'].wisByHorizon[horizon].toFixed(3)}`)
    .join('; '));

const preparednessBase = {
  population: 10_000_000,
  weeks: 104,
  r0: 3,
  infectiousDays: 5,
  incubationDays: 5.2,
  initialInfectious: 10,
  initialExposed: 50,
  responseMultiplier: 0.32,
  responseRampDays: 14,
  easingStartDaysAfterResponse: 999,
  easedResponseMultiplier: 0.82,
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

const scenarios = [
  { name: '7-1-7 response (day 15)', responseStartDay: 15 },
  { name: 'One-month response (day 30)', responseStartDay: 30 },
  { name: 'Six-week response (day 45)', responseStartDay: 45 },
  {
    name: 'Day 30 + countermeasure day 120',
    responseStartDay: 30,
    countermeasure: {
      startDay: 120,
      coursesPerThousandPerDay: 5,
      effectivenessAgainstInfection: 0.75,
    },
  },
] as const;

console.log('\nGENERIC PREPAREDNESS EXPERIMENT (10m people; scenario, not forecast)');
console.log('Scenario\tinfections\tdeaths\tpeak staffed-bed load');
for (const scenario of scenarios) {
  const { name, ...scenarioInput } = scenario;
  const result = runModel(outbreakPreparednessModel, {
    ...preparednessBase,
    ...scenarioInput,
  }).output;
  console.log(
    [
      name,
      round(result.totalInfections),
      round(result.totalDeaths),
      round(result.peakHospitalLoad),
    ].join('\t'),
  );
}

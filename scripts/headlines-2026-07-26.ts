import {
  evaluateCyclosporaNowcast,
  evaluateDataCenterRatepayerPledge,
  evaluateHeatMortalityNowcast,
} from '../src/simulations/news/headline-experiments-2026-07-26.js';

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;
const count = (value: number): string =>
  Math.round(value).toLocaleString('en-US');

console.log('=== News-driven simulations: 2026-07-26 ===\n');
console.log('Selected questions');
console.table([
  {
    headline: 'At least 69 U.S. deaths in the July heat domes',
    estimand: 'event-attributable excess deaths',
    mechanism: 'provisional reporting × heat attribution',
  },
  {
    headline: 'Cyclospora response called catastrophic',
    estimand: 'final outbreak-linked cases and response timing',
    mechanism: 'classification lag after recall',
  },
  {
    headline: 'Data-center pledge will protect or lower bills',
    estimand: 'change in non-data-center retail bills',
    mechanism: 'cost allocation + scarcity − fixed-cost dilution',
  },
]);

const heat = evaluateHeatMortalityNowcast();
console.log('\n1. Heat mortality');
console.table([
  {
    version: 'observed provisional',
    central: count(heat.case.provisionalHeatAttributedDeaths),
    range: 'not supplied',
    test: 'deaths explicitly attributed to heat',
  },
  {
    version: 'V1 fixed multiplier',
    central: count(heat.initialV1.estimatedExcessDeaths),
    range: 'none',
    test:
      `leave-one-event-out MAPE ${pct(
        heat.initialV1.leaveOneOutMeanAbsolutePercentageError,
      )}`,
  },
  {
    version: 'V2 observation model',
    central: count(heat.revisedV2.centralExcessDeaths),
    range:
      `${count(heat.revisedV2.lowerExcessDeaths)}–` +
      count(heat.revisedV2.upperExcessDeaths),
    test:
      `point MAPE still ${pct(
        heat.revisedV2.leaveOneOutMeanAbsolutePercentageError,
      )}`,
  },
]);
console.log(
  `The 69-count is ${pct(
    heat.revisedV2.provisionalCountShareOfCentralExcess,
  )} of the central excess-mortality nowcast. The large interval is the result: historical event multipliers do not support a precise national conversion.`,
);

const cyclospora = evaluateCyclosporaNowcast();
console.log('\n2. Cyclospora');
console.table([
  {
    version: 'reported 24 July',
    cases: count(cyclospora.case.currentReportedCases),
    interpretation: 'outbreak-specific confirmed count',
  },
  {
    version: 'V1 compound report growth',
    cases: count(cyclospora.initialV1.projectedFinalCases),
    interpretation: 'mistakes boundary/reporting changes for infections',
  },
  {
    version: 'V2 reporting completion',
    cases: count(cyclospora.revisedV2.centralFinalOutbreakCases),
    interpretation:
      `${count(
        cyclospora.revisedV2.lowerFinalOutbreakCases,
      )}–${count(
        cyclospora.revisedV2.upperFinalOutbreakCases,
      )} sensitivity`,
  },
]);
console.log(
  `A curve calibrated on 2018 plus the early 2020 snapshot predicts the later 2020 snapshot within ${pct(
    cyclospora.calibration.later2020AbsolutePercentageError,
  )}. It implies about ${count(
    cyclospora.revisedV2.projectedAdditionalReports,
  )} additional outbreak-linked reports, mostly administrative lag rather than post-recall exposure.`,
);
console.table([
  {
    metric: 'first defined onset → recall',
    current: `${cyclospora.responseTiming.currentFirstOnsetToRecallDays} days`,
    comparison:
      `${cyclospora.responseTiming.historicalMeanFirstOnsetToRecallDays.toFixed(
        1,
      )} days in the two historical episodes`,
  },
  {
    metric: 'public vehicle linkage → recall',
    current: `${cyclospora.responseTiming.publicLinkageToRecallDays} day`,
    comparison: 'execution after public linkage was fast',
  },
  {
    metric: 'revision to first-onset boundary',
    current:
      `${cyclospora.responseTiming.firstOnsetBoundaryRevisionDays} days`,
    comparison: 'makes one response-delay score unstable',
  },
]);

const dataCenters = evaluateDataCenterRatepayerPledge();
console.log('\n3. Data centers and retail bills');
const ratepayerRows = [
  {
    case: 'V1 fully socialized',
    impact: dataCenters.initialV1.fullySocializedBillImpact,
    capex: dataCenters.initialV1.fullySocializedBillImpact,
    scarcity: 0,
    fixedBenefit: 0,
  },
  {
    case: 'V1 literal full pledge',
    impact: dataCenters.initialV1.literalFullPledgeBillImpact,
    capex: 0,
    scarcity: 0,
    fixedBenefit: 0,
  },
  {
    case: 'V2 no protection',
    impact:
      dataCenters.revisedV2.noProtection.netNonDataCenterBillImpact,
    capex:
      dataCenters.revisedV2.noProtection.ratepayerCapexBillImpact,
    scarcity:
      dataCenters.revisedV2.noProtection.wholesaleScarcityBillImpact,
    fixedBenefit:
      dataCenters.revisedV2.noProtection.legacyFixedCostBillBenefit,
  },
  {
    case: 'V2 central 65% project coverage',
    impact:
      dataCenters.revisedV2.central.netNonDataCenterBillImpact,
    capex:
      dataCenters.revisedV2.central.ratepayerCapexBillImpact,
    scarcity:
      dataCenters.revisedV2.central.wholesaleScarcityBillImpact,
    fixedBenefit:
      dataCenters.revisedV2.central.legacyFixedCostBillBenefit,
  },
  {
    case: 'V2 literal full pledge',
    impact:
      dataCenters.revisedV2.literalFullPledge
        .netNonDataCenterBillImpact,
    capex:
      dataCenters.revisedV2.literalFullPledge
        .ratepayerCapexBillImpact,
    scarcity:
      dataCenters.revisedV2.literalFullPledge
        .wholesaleScarcityBillImpact,
    fixedBenefit:
      dataCenters.revisedV2.literalFullPledge
        .legacyFixedCostBillBenefit,
  },
];
console.table(
  ratepayerRows.map((row) => ({
    case: row.case,
    'capex shift': pct(row.capex),
    scarcity: pct(row.scarcity),
    'fixed-cost benefit': `-${pct(row.fixedBenefit)}`,
    'net bill': pct(row.impact),
  })),
);
console.log(
  `Treating the White House's ${pct(
    dataCenters.case.headlineTerritoryPowerCoverage,
  )} territory-power coverage as if it were enforceable project coverage would produce ${pct(
    dataCenters.revisedV2
      .headlineTerritoryCoverageMisreadAsProjectCoverage
      .netNonDataCenterBillImpact,
  )}; that is not what the statistic measures.`,
);

console.log('\nWhere the models differ from conventional wisdom');
console.log(
  '- Heat: “dramatic undercount” is directionally right, but a confident single multiplier is not. The central nowcast is about 200 excess deaths and the defensible toy range is roughly 110–440.',
);
console.log(
  '- Cyclospora: thousands of cases and a roughly 3,400 central final count are consistent with a severe event. But the rising post-recall count is mainly expected reporting lag, and the public supplier-linkage-to-recall step took one day. The model cannot turn the available data into a clean verdict on upstream agency competence.',
);
console.log(
  '- Data centers: a literal, enforceable full-cost pledge prevents a positive bill shift; it does not automatically lower bills. Lower bills require a contribution to legacy fixed costs. Conversely, the widely repeated 15–40% figure is a nominal, all-demand, four-market ICF forecast—not a data-center-only causal estimate.',
);

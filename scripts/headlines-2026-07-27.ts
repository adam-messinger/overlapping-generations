import {
  evaluateChinaIndustrialProfits,
  evaluateHurricaneInsuranceRisk,
  evaluateOilPauseInflation,
} from '../src/simulations/news/headline-experiments-2026-07-27.js';

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;
const pp = (value: number): string => `${value.toFixed(2)}pp`;
const money = (value: number): string => `$${value.toFixed(1)}B`;

console.log('=== News-driven simulations: 2026-07-27 ===\n');
console.log('Selected questions');
console.table([
  {
    headline: 'Oil tumbles after the U.S.-Iran pause',
    estimand: 'first-year headline-inflation relief',
    mechanism: 'oil path → retail pass-through → core/policy lags',
  },
  {
    headline: 'China industrial profits rise 18.7%',
    estimand: 'sources of profit growth and export cushion',
    mechanism: 'revenue × margin + sector contributions',
  },
  {
    headline: 'El Nino may not be good news for insurers',
    estimand: 'annual insured-loss distribution',
    mechanism: 'landfalls × ordinary loss + rare metro strike',
  },
]);

const oil = evaluateOilPauseInflation();
console.log('\n1. Oil pause and inflation');
console.table([
  {
    version: 'V1 spot shortcut',
    oil: `${pct(oil.initialV1.spotOilPriceRelief)} lower`,
    'first-year relief':
      pp(oil.initialV1.instantaneousHeadlinePriceLevelReliefPctPoints),
    interpretation: 'mistakes immediate price-level effect for annual CPI',
  },
  {
    version: 'V2 one-month pause',
    oil: `$${oil.case.pauseDayBrentUsdPerBarrel.toFixed(2)}/bbl for one month`,
    'first-year relief':
      pp(
        oil.revisedV2.temporaryPause
          .firstYearAverageHeadlineReliefPctPoints,
      ),
    interpretation: 'most stress returns before retail pass-through',
  },
  {
    version: 'V2 six-month pause',
    oil: `$${oil.case.pauseDayBrentUsdPerBarrel.toFixed(2)}/bbl for six months`,
    'first-year relief':
      pp(
        oil.revisedV2.sustainedPause
          .firstYearAverageHeadlineReliefPctPoints,
      ),
    interpretation: 'durable but partial inflation relief',
  },
]);
console.log(
  `Monday's price remained ${pct(
    oil.initialV1.oilPriceStillAbovePrewar,
  )} above the prewar close, leaving ${pct(
    oil.initialV1.warPremiumShareRemaining,
  )} of the modeled war premium in place.`,
);

const china = evaluateChinaIndustrialProfits();
console.log('\n2. China industrial profits');
console.table([
  {
    version: 'V1 revenue-only',
    'profit growth':
      pct(china.initialV1.revenueOnlyPredictedProfitGrowth),
    'miss vs observed':
      pp(100 * china.initialV1.revenueOnlyGrowthErrorPctPoints),
    interpretation: 'omits margin expansion',
  },
  {
    version: 'V2 observed',
    'profit growth': pct(china.case.totalProfitGrowth),
    'miss vs observed': pp(0),
    interpretation: 'revenue × margin identity',
  },
  {
    version: 'V2 without export growth',
    'profit growth':
      pct(
        china.revisedV2.exportCounterfactualCentral
          .counterfactualProfitGrowthWithoutExportGrowth,
      ),
    'miss vs observed':
      pp(
        100 *
        china.revisedV2.exportCounterfactualCentral
          .exportCushionPctPoints,
      ),
    interpretation: 'cross-system proxy, not a causal estimate',
  },
]);
console.table([
  {
    component: 'revenue scale',
    contribution:
      pp(
        100 *
        china.revisedV2.shapleyGrowthDecomposition
          .revenueChannelPctPoints,
      ),
    'share of growth':
      pct(
        1 -
        china.revisedV2.shapleyGrowthDecomposition
          .marginChannelShareOfProfitGrowth,
      ),
  },
  {
    component: 'margin expansion',
    contribution:
      pp(
        100 *
        china.revisedV2.shapleyGrowthDecomposition
          .marginChannelPctPoints,
      ),
    'share of growth':
      pct(
        china.revisedV2.shapleyGrowthDecomposition
          .marginChannelShareOfProfitGrowth,
      ),
  },
  {
    component: 'electronics + raw materials',
    contribution:
      pp(
        100 *
        (
          china.revisedV2.sectorContribution
            .electronicsPctPoints +
          china.revisedV2.sectorContribution
            .rawMaterialsPctPoints
        ),
      ),
    'share of growth':
      pct(
        china.revisedV2.sectorContribution
          .electronicsAndRawMaterialsShareOfGrowth,
      ),
  },
]);
console.log(
  `The export-growth cushion is about ${pp(
    100 *
    china.revisedV2.exportCounterfactualCentral
      .exportCushionPctPoints,
  )}, with a ${pp(
    100 *
    (
      china.revisedV2.exportCounterfactualSensitivity.at(0)
        ?.exportCushionPctPoints ?? 0
    ),
  )}–${pp(
    100 *
    (
      china.revisedV2.exportCounterfactualSensitivity.at(-1)
        ?.exportCushionPctPoints ?? 0
    ),
  )} bridge range.`,
);

const hurricane = evaluateHurricaneInsuranceRisk();
console.log('\n3. El Nino and hurricane insurance');
console.table([
  {
    version: 'V1 named-storm scaling',
    mean: money(hurricane.initialV1.expectedLossBillion),
    median: 'not modeled',
    p90: 'not modeled',
    '$100B metro year':
      'not modeled',
    check:
      `${pct(
        hurricane.initialV1
          .historicalMeanAbsolutePercentageError,
      )} MAPE`,
  },
  {
    version: 'V2 landfall/location distribution',
    mean: money(hurricane.revisedV2.central.expectedLossBillion),
    median: money(hurricane.revisedV2.central.medianLossBillion),
    p90: money(hurricane.revisedV2.central.p90LossBillion),
    '$100B metro year':
      pct(
        hurricane.revisedV2.central
          .probabilityAtLeastOneMetroStrike,
      ),
    check:
      `${pct(
        hurricane.revisedV2
          .historicalMechanismMeanAbsolutePercentageError,
      )} conditional MAPE`,
  },
]);
console.log(
  `Expected loss is ${pct(
    hurricane.revisedV2.central.expectedLossReduction,
  )} below the recent average, but the 90th percentile is still ${money(
    hurricane.revisedV2.central.p90LossBillion,
  )}.`,
);

console.log('\nWhere the models differ from conventional wisdom');
console.log(
  '- Oil: the relief story is directionally right, but duration dominates the one-day move. A one-month pause removes only about 0.04pp from average first-year headline inflation in this bridge; six months removes about 0.21pp.',
);
console.log(
  '- China: exports plausibly cushioned profits, but they are not the main accounting explanation. The central bridge assigns roughly 3.0pp of the 18.7% gain to export growth; margin expansion supplies about 63%, and electronics plus raw materials account for 92.5% of the gain.',
);
console.log(
  '- Hurricanes: the article’s warning is supported as a statement about the tail, not the mean. The model cuts expected loss by about 38% in an El Nino year while retaining roughly a 12% chance of a present-day $100B metro strike.',
);

console.log('\nLimits');
console.log(
  '- Oil uses the existing stylized euro-area pass-through model; it is not a Fed or country-specific forecast.',
);
console.log(
  '- China combines customs exports with the revenue universe of large industrial firms; the export result is a sensitivity bridge, not causal identification.',
);
console.log(
  '- Hurricane location risk is inferred from aggregate historical loss and landfall averages; portfolio-level catastrophe modeling would require geocoded exposure and event catalogs.',
);

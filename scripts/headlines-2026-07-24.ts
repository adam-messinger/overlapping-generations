import { runModel } from 'tsimulation';

import { calibrateHormuzModel } from '../src/simulations/critical-materials/hormuz-calibration.js';
import { hormuzScenarios } from '../src/simulations/critical-materials/hormuz-data.js';
import {
  aiCapitalCycleScenarios,
  simulateAiCapitalCycleV1,
} from '../src/simulations/news/ai-capital-cycle.js';
import {
  calibrateCoralBleaching,
  coralBleachingScenarios,
  simulateCoralBleachingV1,
} from '../src/simulations/news/coral-bleaching.js';
import { coralCurrentEvidence } from '../src/simulations/news/coral-data.js';
import {
  energyInflationEvidence,
  energyInflationScenarios,
  simulateEnergyInflationV1,
  simulateEnergyInflationV3,
} from '../src/simulations/news/energy-inflation.js';
import {
  buildWeberEnergyPricePathsFromSourceMonths,
  defaultWeberEnergyBridgeOptions,
  makeEnergyInflationNetworkScenario,
  makeHormuzWeberInflationScenario,
} from '../src/simulations/news/hormuz-weber-inflation.js';
import {
  aiCapitalCycleModel,
  coralBleachingModel,
  energyInflationModel,
  hormuzWeberInflationModel,
} from '../src/simulations/registry.js';

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;
const pp = (value: number): string => `${value.toFixed(1)}pp`;
const money = (value: number): string =>
  `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(0)}B`;

console.log('=== News-driven simulations: 2026-07-24 ===\n');
console.log('Selected questions');
console.table([
  {
    headline: '$100 oil and higher European yields',
    model: 'energy price level → headline/core inflation → policy',
  },
  {
    headline: 'AI cash burn versus revenue clearing depreciation',
    model: 'revenue → operating cash → asset cohorts → replacement/growth funding',
  },
  {
    headline: 'Warming versus El Niño in coral bleaching',
    model: 'ocean baseline + lagged ENSO → global 365-day reef stress extent',
  },
]);

// ---------------------------------------------------------------------------
// 1. Energy shock, inflation, and policy
// ---------------------------------------------------------------------------

const hormuzCalibration = calibrateHormuzModel();
const energyBackcastScenario =
  energyInflationScenarios['euro-area-2022-backcast'];
const energyBackcastV1 = simulateEnergyInflationV1(energyBackcastScenario);
const energyBackcastV2 =
  runModel(energyInflationModel, energyBackcastScenario).output;
const backcastWeberPaths = buildWeberEnergyPricePathsFromSourceMonths(
  energyBackcastScenario.importEnergyPricePath.map(
    (priceMultiple, index) => ({
      index,
      year: 2022 + Math.floor(index / 12),
      month: index % 12 + 1,
      oilPriceMultiple: priceMultiple,
      gasPriceMultiple: priceMultiple,
    }),
  ),
  {
    ...defaultWeberEnergyBridgeOptions,
    horizonMonths: energyBackcastScenario.importEnergyPricePath.length,
  },
);
const energyBackcastV3 = simulateEnergyInflationV3(
  makeEnergyInflationNetworkScenario({
    id: 'euro-area-2022-weber-energy-attribution',
    label: 'Euro-area 2022 Weber energy-attribution check',
    inflationScenario: energyBackcastScenario,
    pricePaths: backcastWeberPaths,
  }),
);

console.log('\n1. Energy shock → inflation and policy');
console.log('2022–2023 reconstruction');
console.table([
  {
    version: 'observed',
    'peak headline': `${energyInflationEvidence.euroArea2022PeakHeadlineInflationPct.toFixed(1)}%`,
    'peak core': `${energyInflationEvidence.euroArea2023PeakCoreInflationPct.toFixed(1)}%`,
    'peak policy': `${energyInflationEvidence.euroArea2023PeakDepositRatePct.toFixed(1)}%`,
  },
  {
    version: 'V1 direct-only',
    'peak headline': `${energyBackcastV1.peakHeadlineInflationPct.toFixed(1)}%`,
    'peak core': `${energyBackcastV1.peakCoreInflationPct.toFixed(1)}%`,
    'peak policy': `${energyBackcastV1.peakPolicyRatePct.toFixed(1)}%`,
  },
  {
    version: 'V2 propagation',
    'peak headline': `${energyBackcastV2.peakHeadlineInflationPct.toFixed(1)}%`,
    'peak core': `${energyBackcastV2.peakCoreInflationPct.toFixed(1)}%`,
    'peak policy': `${energyBackcastV2.peakPolicyRatePct.toFixed(1)}%`,
  },
  {
    version: 'V3 Weber energy-only',
    'peak headline': `${energyBackcastV3.peakHeadlineInflationPct.toFixed(1)}%`,
    'peak core': `${energyBackcastV3.peakCoreInflationPct.toFixed(1)}%`,
    'peak policy': `${energyBackcastV3.peakPolicyRatePct.toFixed(1)}%`,
  },
]);

const currentEnergyV2 = runModel(
  energyInflationModel,
  energyInflationScenarios['euro-area-2026-current'],
).output;
const integratedEnergyRuns = (
  ['short-disruption', 'partial-reopening', 'prolonged-closure'] as const
).map((hormuzScenarioId) =>
  runModel(
    hormuzWeberInflationModel,
    makeHormuzWeberInflationScenario({
      id: `euro-area-${hormuzScenarioId}`,
      label: `Euro-area ${hormuzScenarioId}`,
      hormuzScenario: hormuzScenarios[hormuzScenarioId],
      hormuzParams: hormuzCalibration.params,
      inflationScenario:
        energyInflationScenarios['euro-area-2026-current'],
    }),
  ).output
);
console.log('Current scenario branches');
console.table([
  {
    case: 'V2 scalar synthetic decay',
    'peak oil': 'not separated',
    'peak gas': 'not separated',
    'peak network CPI': 'implicit',
    'peak headline': `${currentEnergyV2.peakHeadlineInflationPct.toFixed(1)}%`,
    'peak core': `${currentEnergyV2.peakCoreInflationPct.toFixed(1)}%`,
    'peak policy': `${currentEnergyV2.peakPolicyRatePct.toFixed(1)}%`,
    'policy increase': pp(
      currentEnergyV2.peakPolicyRatePct -
        energyInflationScenarios['euro-area-2026-current']
          .startingPolicyRatePct,
    ),
  },
  ...integratedEnergyRuns.map((result) => ({
    case: `V3 ${result.scenario.hormuzScenario.id}`,
    'peak oil': `${
      Math.max(
        ...result.pricePaths.months.map((row) => row.oilPriceMultiple),
      ).toFixed(2)
    }×`,
    'peak gas': `${
      Math.max(
        ...result.pricePaths.months.map((row) => row.gasPriceMultiple),
      ).toFixed(2)
    }×`,
    'peak network CPI': pp(
      Math.max(
        ...result.pricePaths.months.map(
          (row) => row.networkIndirectCpiImpactPct,
        ),
      ),
    ),
    'peak headline':
      `${result.inflation.peakHeadlineInflationPct.toFixed(1)}%`,
    'peak core': `${result.inflation.peakCoreInflationPct.toFixed(1)}%`,
    'peak policy': `${result.inflation.peakPolicyRatePct.toFixed(1)}%`,
    'policy increase': pp(
      result.inflation.peakPolicyRatePct -
        result.scenario.inflationScenario.startingPolicyRatePct,
    ),
  })),
]);
console.log('Partial-reopening Weber-exposure sensitivity');
console.table(
  [0.5, 1, 2].map((networkScale) => {
    const result = runModel(
      hormuzWeberInflationModel,
      makeHormuzWeberInflationScenario({
        id: `euro-area-partial-network-${networkScale}`,
        label: `Partial reopening, ${networkScale}x Weber exposure`,
        hormuzScenario: hormuzScenarios['partial-reopening'],
        hormuzParams: hormuzCalibration.params,
        inflationScenario:
          energyInflationScenarios['euro-area-2026-current'],
        bridgeOptions: { networkScale },
      }),
    ).output;
    return {
      'Weber exposure': `${networkScale.toFixed(1)}×`,
      'peak headline':
        `${result.inflation.peakHeadlineInflationPct.toFixed(1)}%`,
      'peak core': `${result.inflation.peakCoreInflationPct.toFixed(1)}%`,
      'peak policy': `${result.inflation.peakPolicyRatePct.toFixed(1)}%`,
    };
  }),
);

// ---------------------------------------------------------------------------
// 2. AI capital cycle
// ---------------------------------------------------------------------------

console.log('\n2. AI revenue, depreciation, and self-financing');
const aiRows = Object.values(aiCapitalCycleScenarios).map((scenario) => {
  const v1 = simulateAiCapitalCycleV1(scenario);
  const v2 = runModel(aiCapitalCycleModel, scenario).output;
  return {
    scenario: scenario.id,
    'V1 revenue/depreciation': `${v1.revenueDepreciationCoverage.toFixed(2)}×`,
    'V2 initial replacement': `${(v2.quarters[0]?.economicReplacementCoverage ?? 0).toFixed(2)}×`,
    'replacement breakeven': v2.firstEconomicReplacementQuarter ?? 'after 2035',
    'all-capex breakeven': v2.firstTotalCapexSelfFundingQuarter ?? 'after 2035',
    'peak funding need': money(v2.peakCumulativeFundingNeedBillion),
    '2035 cumulative cash': money(v2.endingCumulativeNetCashBillion),
    '2035 capex/replacement': `${v2.endingCapexReplacementCoverage.toFixed(2)}×`,
  };
});
console.table(aiRows);

const centralAi = runModel(
  aiCapitalCycleModel,
  aiCapitalCycleScenarios.central,
).output;
console.log('Central path, selected year-end quarters');
console.table(
  centralAi.quarters
    .filter((row) => row.quarter === 4)
    .map((row) => ({
      year: row.year,
      'AI revenue $B/q': row.aiRevenueBillion.toFixed(0),
      'AI capex $B/q': row.aiCapexBillion.toFixed(0),
      'depreciation $B/q': row.depreciationBillion.toFixed(0),
      'replacement coverage': `${row.economicReplacementCoverage.toFixed(2)}×`,
      'free cash flow $B/q': row.freeCashFlowBillion.toFixed(0),
      'cumulative cash $B': row.cumulativeNetCashBillion.toFixed(0),
    })),
);

// ---------------------------------------------------------------------------
// 3. Coral bleaching
// ---------------------------------------------------------------------------

console.log('\n3. Coral bleaching: ENSO timing versus warming baseline');
const coralCalibration = calibrateCoralBleaching();
console.table([
  {
    model: 'V1 ENSO-only',
    'development MAE': pct(coralCalibration.developmentV1.meanAbsoluteError),
    '2018–25 holdout MAE': pct(coralCalibration.holdoutV1.meanAbsoluteError),
    'holdout RMSE': pct(coralCalibration.holdoutV1.rootMeanSquaredError),
  },
  {
    model: 'V2 warming + lagged ENSO',
    'development MAE': pct(coralCalibration.developmentV2.meanAbsoluteError),
    '2018–25 holdout MAE': pct(coralCalibration.holdoutV2.meanAbsoluteError),
    'holdout RMSE': pct(coralCalibration.holdoutV2.rootMeanSquaredError),
  },
]);

const coralHoldoutV1 = simulateCoralBleachingV1(
  coralBleachingScenarios.holdout,
);
const coralHoldoutV2 = runModel(
  coralBleachingModel,
  coralBleachingScenarios.holdout,
).output;
const holdoutYears = [2018, 2020, 2022, 2024, 2025];
console.log('Selected holdout years');
console.table(
  holdoutYears.map((year) => {
    const v1 = coralHoldoutV1.years.find((row) => row.year === year);
    const v2 = coralHoldoutV2.years.find((row) => row.year === year);
    return {
      year,
      observed: pct(v2?.observedBleachingExtent ?? 0),
      'V1 ENSO-only': pct(v1?.predictedBleachingExtent ?? 0),
      'V2 warming + ENSO': pct(v2?.predictedBleachingExtent ?? 0),
    };
  }),
);

const coralOutlook = runModel(
  coralBleachingModel,
  coralBleachingScenarios['current-outlook'],
).output;
console.table(
  coralOutlook.years.map((row) => ({
    year: row.year,
    'predicted global extent': pct(row.predictedBleachingExtent),
    '1986-95 baseline counterfactual': pct(
      row.earlyRecordBaselineCounterfactualExtent,
    ),
    'neutral-ENSO counterfactual': pct(row.neutralEnsoCounterfactualExtent),
    'conditional post-1986 warming contribution': pp(
      row.conditionalRecentWarmingContributionPctPoints,
    ),
    'conditional ENSO contribution': pp(
      row.conditionalEnsoContributionPctPoints,
    ),
  })),
);
console.log(
  `NOAA observed 365-day global extent through July 22: ${
    pct(coralCurrentEvidence.observed2026ThroughJuly22)
  }.`,
);

console.log('\nWhere the revisions differ from simple headline readings');
console.log(
  '- Once the actual Hormuz reopening path and Weber total-requirements exposure replace the scalar shortcut, the partial-reopening case peaks near 4.2% headline, 2.3% core, and a 2.4% policy rate. The old aggregate bridge over-attributed the 2022 core episode to energy.',
);
console.log(
  '- AI revenue does clear current depreciation, but after operating cost and the depreciation wave from capex already under way, the central standalone AI buildout does not cover replacement economics until 2032 and still has not earned back cumulative investment by 2035.',
);
console.log(
  '- El Niño is mainly a timing pulse in the global coral model. The warming baseline alone produces most of the 2026–2027 stress footprint; the coming ENSO pulse adds most strongly with a lag in 2027.',
);
console.log('\nGuardrails');
console.log(
  '- The energy model uses OECD regional commodity prices as a euro-area proxy and published Weber network exposures, not a current euro-area input-output table. It is not a forecast of a particular ECB meeting.',
);
console.log(
  '- The AI model is an outside-China standalone scope. AI capex allocation and AI-adjacent cloud revenue are not observed consistently, so the scenario fork is more reliable than the central level.',
);
console.log(
  '- The coral model predicts global thermal exposure, not local Florida mortality, species survival, acidification, disease, or recovery.',
);

import { assertFiniteDeep } from 'tsimulation';

import {
  dataCenterGridScenarios,
  simulateDataCenterGrid,
} from './data-center-grid.js';

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const geometricMean = (values: readonly number[]): number =>
  Math.exp(mean(values.map((value) => Math.log(value))));

// ---------------------------------------------------------------------------
// 1. U.S. heat-mortality nowcast
// ---------------------------------------------------------------------------

export interface HeatMortalityBenchmark {
  id: string;
  label: string;
  heatAttributedDeaths: number;
  excessDeaths: number;
}

export interface HeatMortalityNowcastCase {
  provisionalHeatAttributedDeaths: number;
  reportingCompletenessCentral: number;
  reportingCompletenessLow: number;
  reportingCompletenessHigh: number;
  benchmarks: readonly HeatMortalityBenchmark[];
}

export interface HeatMortalityBacktestRow {
  holdoutId: string;
  observedExcessDeaths: number;
  arithmeticPrediction: number;
  geometricPrediction: number;
  arithmeticAbsolutePercentageError: number;
  geometricAbsolutePercentageError: number;
}

export interface HeatMortalityNowcastResult {
  case: HeatMortalityNowcastCase;
  historicalMultipliers: readonly {
    id: string;
    heatAttributionShare: number;
    excessToAttributedMultiplier: number;
  }[];
  initialV1: {
    fixedArithmeticMultiplier: number;
    estimatedExcessDeaths: number;
    leaveOneOutMeanAbsolutePercentageError: number;
  };
  revisedV2: {
    robustGeometricMultiplier: number;
    estimatedCompleteHeatAttributedDeaths: number;
    centralExcessDeaths: number;
    lowerExcessDeaths: number;
    upperExcessDeaths: number;
    provisionalCountShareOfCentralExcess: number;
    historicalShareWithMoreThanTwofoldUndercount: number;
    leaveOneOutMeanAbsolutePercentageError: number;
  };
  backtest: readonly HeatMortalityBacktestRow[];
}

export const heatMortalityNowcastCase: HeatMortalityNowcastCase = {
  provisionalHeatAttributedDeaths: 69,
  // The direct count is still provisional. These are explicit nowcast
  // judgments, not estimates inferred from the three historical events.
  reportingCompletenessCentral: 0.85,
  reportingCompletenessLow: 0.70,
  reportingCompletenessHigh: 0.95,
  benchmarks: [
    {
      id: 'chicago-1995',
      label: 'Chicago 1995 heat wave',
      heatAttributedDeaths: 473,
      excessDeaths: 739,
    },
    {
      id: 'california-2006',
      label: 'California 2006 heat wave',
      heatAttributedDeaths: 147,
      excessDeaths: 655,
    },
    {
      id: 'pacific-northwest-2021',
      label: 'Pacific Northwest 2021 heat wave',
      // Final state totals for Washington (157) and Oregon (116), matching
      // the two-state geography of the approximate excess-death estimate.
      heatAttributedDeaths: 273,
      excessDeaths: 600,
    },
  ],
};

/**
 * Nowcasts excess mortality from a provisional count of deaths explicitly
 * attributed to heat.
 *
 * V1 applies one arithmetic-average multiplier. The leave-one-event-out
 * backtest shows that this is badly overconfident. V2 keeps a robust central
 * multiplier but makes the main revision epistemic: it separates provisional
 * reporting completeness from death-certificate attribution and carries the
 * observed event heterogeneity into a wide interval.
 */
export function evaluateHeatMortalityNowcast(
  input: HeatMortalityNowcastCase = heatMortalityNowcastCase,
): HeatMortalityNowcastResult {
  assertFiniteDeep(input, 'heat-mortality nowcast case');
  if (input.benchmarks.length < 3) {
    throw new Error('Heat-mortality nowcast requires at least three benchmarks');
  }
  if (
    input.reportingCompletenessLow <= 0 ||
    input.reportingCompletenessHigh > 1 ||
    input.reportingCompletenessLow >
      input.reportingCompletenessCentral ||
    input.reportingCompletenessCentral >
      input.reportingCompletenessHigh
  ) {
    throw new Error('Invalid heat reporting-completeness interval');
  }

  const historicalMultipliers = input.benchmarks.map((benchmark) => {
    if (
      benchmark.heatAttributedDeaths <= 0 ||
      benchmark.excessDeaths <= 0
    ) {
      throw new Error(`Invalid heat benchmark: ${benchmark.id}`);
    }
    return {
      id: benchmark.id,
      heatAttributionShare:
        benchmark.heatAttributedDeaths / benchmark.excessDeaths,
      excessToAttributedMultiplier:
        benchmark.excessDeaths / benchmark.heatAttributedDeaths,
    };
  });
  const multipliers = historicalMultipliers.map(
    (row) => row.excessToAttributedMultiplier,
  );

  const backtest = input.benchmarks.map((holdout, holdoutIndex) => {
    const trainingMultipliers = multipliers.filter(
      (_, index) => index !== holdoutIndex,
    );
    const arithmeticPrediction =
      holdout.heatAttributedDeaths * mean(trainingMultipliers);
    const geometricPrediction =
      holdout.heatAttributedDeaths * geometricMean(trainingMultipliers);
    return {
      holdoutId: holdout.id,
      observedExcessDeaths: holdout.excessDeaths,
      arithmeticPrediction,
      geometricPrediction,
      arithmeticAbsolutePercentageError:
        Math.abs(arithmeticPrediction - holdout.excessDeaths) /
        holdout.excessDeaths,
      geometricAbsolutePercentageError:
        Math.abs(geometricPrediction - holdout.excessDeaths) /
        holdout.excessDeaths,
    };
  });

  const fixedArithmeticMultiplier = mean(multipliers);
  const robustGeometricMultiplier = geometricMean(multipliers);
  const centralExcessDeaths =
    input.provisionalHeatAttributedDeaths /
    input.reportingCompletenessCentral *
    robustGeometricMultiplier;
  const lowerExcessDeaths =
    input.provisionalHeatAttributedDeaths /
    input.reportingCompletenessHigh *
    Math.min(...multipliers);
  const upperExcessDeaths =
    input.provisionalHeatAttributedDeaths /
    input.reportingCompletenessLow *
    Math.max(...multipliers);

  const result: HeatMortalityNowcastResult = {
    case: input,
    historicalMultipliers,
    initialV1: {
      fixedArithmeticMultiplier,
      estimatedExcessDeaths:
        input.provisionalHeatAttributedDeaths * fixedArithmeticMultiplier,
      leaveOneOutMeanAbsolutePercentageError: mean(
        backtest.map((row) => row.arithmeticAbsolutePercentageError),
      ),
    },
    revisedV2: {
      robustGeometricMultiplier,
      estimatedCompleteHeatAttributedDeaths:
        input.provisionalHeatAttributedDeaths /
        input.reportingCompletenessCentral,
      centralExcessDeaths,
      lowerExcessDeaths,
      upperExcessDeaths,
      provisionalCountShareOfCentralExcess:
        input.provisionalHeatAttributedDeaths / centralExcessDeaths,
      historicalShareWithMoreThanTwofoldUndercount:
        multipliers.filter((multiplier) => multiplier > 2).length /
        multipliers.length,
      leaveOneOutMeanAbsolutePercentageError: mean(
        backtest.map((row) => row.geometricAbsolutePercentageError),
      ),
    },
    backtest,
  };
  assertFiniteDeep(result, 'heat-mortality nowcast result');
  return result;
}

// ---------------------------------------------------------------------------
// 2. Cyclospora reporting lag and response timing
// ---------------------------------------------------------------------------

export interface CyclosporaNowcastCase {
  currentReportedCases: number;
  previousReportedCases: number;
  daysBetweenReports: number;
  daysSinceRecall: number;
  maximumClassificationDelayDays: number;
  actionDayReportedCases2018: number;
  finalCases2018: number;
  earlySnapshotCases2020: number;
  earlySnapshotDaysAfterRecall2020: number;
  laterSnapshotCases2020: number;
  laterSnapshotDaysAfterRecall2020: number;
  finalCases2020: number;
  currentFirstOnsetToRecallDays: number;
  historicalFirstOnsetToRecallDays: readonly number[];
  publicLinkageToRecallDays: number;
  firstOnsetBoundaryRevisionDays: number;
}

export interface CyclosporaNowcastResult {
  case: CyclosporaNowcastCase;
  initialV1: {
    recentCompoundDailyGrowth: number;
    projectedFinalCases: number;
    flaw: string;
  };
  calibration: {
    actionDayReportingCompleteness: number;
    reportingHalfLifeDaysFromEarly2020Snapshot: number;
    later2020PredictedCases: number;
    later2020ObservedCases: number;
    later2020AbsolutePercentageError: number;
    refitReportingHalfLifeDays: number;
  };
  revisedV2: {
    estimatedReportingCompleteness: number;
    centralFinalOutbreakCases: number;
    lowerFinalOutbreakCases: number;
    upperFinalOutbreakCases: number;
    projectedAdditionalReports: number;
    projectedAdditionalReportsShareOfFinal: number;
  };
  responseTiming: {
    currentFirstOnsetToRecallDays: number;
    historicalMeanFirstOnsetToRecallDays: number;
    currentDelayRelativeToHistoricalMean: number;
    publicLinkageToRecallDays: number;
    firstOnsetBoundaryRevisionDays: number;
  };
}

export const cyclosporaNowcastCase: CyclosporaNowcastCase = {
  currentReportedCases: 1_947,
  previousReportedCases: 1_644,
  daysBetweenReports: 8,
  daysSinceRecall: 7,
  maximumClassificationDelayDays: 42,
  // In the 2018 fast-food salad outbreak, 61 cases were known at the
  // intervention date and 511 were eventually linked to the outbreak.
  actionDayReportedCases2018: 61,
  finalCases2018: 511,
  // Full Fresh Express recall: 27 June 2020. FDA snapshots were 509 cases
  // on 8 July and 641 on 22 July; the final outbreak count was 701.
  earlySnapshotCases2020: 509,
  earlySnapshotDaysAfterRecall2020: 11,
  laterSnapshotCases2020: 641,
  laterSnapshotDaysAfterRecall2020: 25,
  finalCases2020: 701,
  // The revised nine-state outbreak definition starts on 22 June and the
  // recall was 17 July. The earlier five-state update had started on 13 May.
  currentFirstOnsetToRecallDays: 25,
  historicalFirstOnsetToRecallDays: [54, 47],
  publicLinkageToRecallDays: 1,
  firstOnsetBoundaryRevisionDays: 40,
};

const reportingCompletion = (
  actionDayCompleteness: number,
  daysAfterAction: number,
  halfLifeDays: number,
): number =>
  1 -
  (1 - actionDayCompleteness) *
    Math.pow(2, -daysAfterAction / halfLifeDays);

const inferReportingHalfLife = (
  actionDayCompleteness: number,
  observedCompleteness: number,
  daysAfterAction: number,
): number =>
  -daysAfterAction *
  Math.log(2) /
  Math.log(
    (1 - observedCompleteness) /
      (1 - actionDayCompleteness),
  );

/**
 * Separates growth in an administrative outbreak count from new infections.
 *
 * V1 compounds the latest reported-count growth through FDA's six-week
 * classification window. V2 calibrates a reporting-completion curve on the
 * 2018 and 2020 outbreaks, tests it on a later 2020 snapshot, then refits both
 * 2020 snapshots for the current nowcast.
 */
export function evaluateCyclosporaNowcast(
  input: CyclosporaNowcastCase = cyclosporaNowcastCase,
): CyclosporaNowcastResult {
  assertFiniteDeep(input, 'Cyclospora nowcast case');
  if (
    input.currentReportedCases <= 0 ||
    input.previousReportedCases <= 0 ||
    input.daysBetweenReports <= 0 ||
    input.daysSinceRecall < 0
  ) {
    throw new Error('Invalid Cyclospora current-count inputs');
  }

  const recentCompoundDailyGrowth =
    Math.log(
      input.currentReportedCases / input.previousReportedCases,
    ) / input.daysBetweenReports;
  const remainingClassificationDays = Math.max(
    0,
    input.maximumClassificationDelayDays - input.daysSinceRecall,
  );
  const naiveProjectedFinalCases =
    input.currentReportedCases *
    Math.exp(recentCompoundDailyGrowth * remainingClassificationDays);

  const actionDayReportingCompleteness =
    input.actionDayReportedCases2018 / input.finalCases2018;
  const early2020Completeness =
    input.earlySnapshotCases2020 / input.finalCases2020;
  const reportingHalfLifeDaysFromEarly2020Snapshot =
    inferReportingHalfLife(
      actionDayReportingCompleteness,
      early2020Completeness,
      input.earlySnapshotDaysAfterRecall2020,
    );
  const later2020PredictedCompleteness = reportingCompletion(
    actionDayReportingCompleteness,
    input.laterSnapshotDaysAfterRecall2020,
    reportingHalfLifeDaysFromEarly2020Snapshot,
  );
  const later2020PredictedCases =
    input.finalCases2020 * later2020PredictedCompleteness;

  // Refit after the frozen later-2020 check. A grid fit is intentionally
  // transparent and avoids introducing an optimizer dependency for two points.
  let refitReportingHalfLifeDays = 1;
  let refitLoss = Number.POSITIVE_INFINITY;
  for (let step = 100; step <= 3_000; step++) {
    const halfLifeDays = step / 100;
    const earlyPrediction = reportingCompletion(
      actionDayReportingCompleteness,
      input.earlySnapshotDaysAfterRecall2020,
      halfLifeDays,
    );
    const laterPrediction = reportingCompletion(
      actionDayReportingCompleteness,
      input.laterSnapshotDaysAfterRecall2020,
      halfLifeDays,
    );
    const loss =
      Math.pow(earlyPrediction - early2020Completeness, 2) +
      Math.pow(
        laterPrediction -
          input.laterSnapshotCases2020 / input.finalCases2020,
        2,
      );
    if (loss < refitLoss) {
      refitLoss = loss;
      refitReportingHalfLifeDays = halfLifeDays;
    }
  }

  const estimatedReportingCompleteness = reportingCompletion(
    actionDayReportingCompleteness,
    input.daysSinceRecall,
    refitReportingHalfLifeDays,
  );
  const centralFinalOutbreakCases =
    input.currentReportedCases / estimatedReportingCompleteness;
  const lowerCompletion = reportingCompletion(
    actionDayReportingCompleteness,
    input.daysSinceRecall,
    5,
  );
  const upperCompletion = reportingCompletion(
    actionDayReportingCompleteness,
    input.daysSinceRecall,
    10,
  );
  // A longer reporting half-life implies lower observed completeness and thus
  // a larger eventual outbreak count.
  const lowerFinalOutbreakCases =
    input.currentReportedCases / lowerCompletion;
  const upperFinalOutbreakCases =
    input.currentReportedCases / upperCompletion;
  const projectedAdditionalReports =
    centralFinalOutbreakCases - input.currentReportedCases;

  const result: CyclosporaNowcastResult = {
    case: input,
    initialV1: {
      recentCompoundDailyGrowth,
      projectedFinalCases: naiveProjectedFinalCases,
      flaw:
        'Compounds a count whose geography and onset boundary changed, treating delayed classification as continuing infection growth.',
    },
    calibration: {
      actionDayReportingCompleteness,
      reportingHalfLifeDaysFromEarly2020Snapshot,
      later2020PredictedCases,
      later2020ObservedCases: input.laterSnapshotCases2020,
      later2020AbsolutePercentageError:
        Math.abs(
          later2020PredictedCases - input.laterSnapshotCases2020,
        ) / input.laterSnapshotCases2020,
      refitReportingHalfLifeDays,
    },
    revisedV2: {
      estimatedReportingCompleteness,
      centralFinalOutbreakCases,
      lowerFinalOutbreakCases,
      upperFinalOutbreakCases,
      projectedAdditionalReports,
      projectedAdditionalReportsShareOfFinal:
        projectedAdditionalReports / centralFinalOutbreakCases,
    },
    responseTiming: {
      currentFirstOnsetToRecallDays:
        input.currentFirstOnsetToRecallDays,
      historicalMeanFirstOnsetToRecallDays: mean(
        input.historicalFirstOnsetToRecallDays,
      ),
      currentDelayRelativeToHistoricalMean:
        input.currentFirstOnsetToRecallDays /
        mean(input.historicalFirstOnsetToRecallDays),
      publicLinkageToRecallDays: input.publicLinkageToRecallDays,
      firstOnsetBoundaryRevisionDays:
        input.firstOnsetBoundaryRevisionDays,
    },
  };
  assertFiniteDeep(result, 'Cyclospora nowcast result');
  return result;
}

// ---------------------------------------------------------------------------
// 3. Data-center ratepayer pledge
// ---------------------------------------------------------------------------

export interface DataCenterRatepayerCase {
  enforceableProjectCoverage: number;
  headlineTerritoryPowerCoverage: number;
  legacyFixedCostContributionPerMwh: number;
  generationShareOfRetailRate: number;
  wholesalePriceElasticityToUnmatchedLoad: number;
}

export interface DataCenterRatepayerLayer {
  enforceableProjectCoverage: number;
  legacyFixedCostContributionPerMwh: number;
  wholesalePriceElasticityToUnmatchedLoad: number;
  ratepayerCapexBillImpact: number;
  wholesaleScarcityBillImpact: number;
  legacyFixedCostBillBenefit: number;
  netNonDataCenterBillImpact: number;
  unmatchedGridEnergyTwh: number;
}

export interface DataCenterRatepayerResult {
  case: DataCenterRatepayerCase;
  initialV1: {
    fullySocializedBillImpact: number;
    literalFullPledgeBillImpact: number;
  };
  revisedV2: {
    central: DataCenterRatepayerLayer;
    headlineTerritoryCoverageMisreadAsProjectCoverage:
      DataCenterRatepayerLayer;
    noProtection: DataCenterRatepayerLayer;
    literalFullPledge: DataCenterRatepayerLayer;
    literalFullPledgeWithoutLegacyContribution:
      DataCenterRatepayerLayer;
  };
  sensitivity: readonly DataCenterRatepayerLayer[];
  comparisonAnchors: {
    icfNominalRetailRateIncrease2030Low: number;
    icfNominalRetailRateIncrease2030High: number;
    icfAllCauseElectricityDemandGrowth2030: number;
    historicalDoublingEffectEstimate: number;
    historicalEntryEffectEstimate: number;
  };
}

export const dataCenterRatepayerCase: DataCenterRatepayerCase = {
  // This is an explicit scenario judgment. The White House's 80% figure is
  // territory/power coverage, not evidence that 80% of future projects have
  // enforceable cost-recovery agreements.
  enforceableProjectCoverage: 0.65,
  headlineTerritoryPowerCoverage: 0.80,
  // Illustrative margin above marginal energy and project-specific costs that
  // can contribute to the legacy fixed system. Set to zero to model a tariff
  // that merely makes the new project whole.
  legacyFixedCostContributionPerMwh: 5,
  generationShareOfRetailRate: 0.40,
  wholesalePriceElasticityToUnmatchedLoad: 0.50,
};

/**
 * Adds rate-design and market-price channels around the existing registered
 * data-center grid model.
 *
 * V1 is the original all-or-nothing capital-allocation comparison. V2 blends
 * compliant and uncovered projects, separates the White House's territory
 * coverage statistic from enforceable project coverage, adds wholesale
 * scarcity from unmatched load, and credits durable large-load contributions
 * to legacy fixed costs.
 */
export function evaluateDataCenterRatepayerPledge(
  input: DataCenterRatepayerCase = dataCenterRatepayerCase,
): DataCenterRatepayerResult {
  assertFiniteDeep(input, 'data-center ratepayer case');
  for (const [label, value] of [
    ['enforceableProjectCoverage', input.enforceableProjectCoverage],
    ['headlineTerritoryPowerCoverage', input.headlineTerritoryPowerCoverage],
    ['generationShareOfRetailRate', input.generationShareOfRetailRate],
  ] as const) {
    if (value < 0 || value > 1) {
      throw new Error(`${label} must be between zero and one`);
    }
  }
  if (
    input.legacyFixedCostContributionPerMwh < 0 ||
    input.wholesalePriceElasticityToUnmatchedLoad < 0
  ) {
    throw new Error('Data-center ratepayer cost parameters must be non-negative');
  }

  const socialized = simulateDataCenterGrid(
    dataCenterGridScenarios.socialized,
  );
  const fullPledge = simulateDataCenterGrid(
    dataCenterGridScenarios['full-pledge-clean-flex'],
  );
  const nonDataCenterRetailRevenueBillion =
    socialized.scenario.nonDataCenterRetailSalesTwh *
    socialized.scenario.nonDataCenterRetailRatePerMwh /
    1_000;

  const layer = (
    enforceableProjectCoverage: number,
    legacyFixedCostContributionPerMwh =
      input.legacyFixedCostContributionPerMwh,
    wholesalePriceElasticity =
      input.wholesalePriceElasticityToUnmatchedLoad,
  ): DataCenterRatepayerLayer => {
    const uncoveredShare = 1 - enforceableProjectCoverage;
    const ratepayerCapexBillImpact =
      socialized.nonDataCenterBillImpact * uncoveredShare;
    const unmatchedGridEnergyTwh =
      socialized.annualElectricityTwh * uncoveredShare;
    const unmatchedLoadShareOfOtherSales =
      unmatchedGridEnergyTwh /
      socialized.scenario.nonDataCenterRetailSalesTwh;
    const wholesaleScarcityBillImpact =
      unmatchedLoadShareOfOtherSales *
      wholesalePriceElasticity *
      input.generationShareOfRetailRate;
    const annualLegacyContributionBillion =
      socialized.annualElectricityTwh *
      legacyFixedCostContributionPerMwh /
      1_000;
    const legacyFixedCostBillBenefit =
      annualLegacyContributionBillion /
      nonDataCenterRetailRevenueBillion;
    return {
      enforceableProjectCoverage,
      legacyFixedCostContributionPerMwh,
      wholesalePriceElasticityToUnmatchedLoad: wholesalePriceElasticity,
      ratepayerCapexBillImpact,
      wholesaleScarcityBillImpact,
      legacyFixedCostBillBenefit,
      netNonDataCenterBillImpact:
        ratepayerCapexBillImpact +
        wholesaleScarcityBillImpact -
        legacyFixedCostBillBenefit,
      unmatchedGridEnergyTwh,
    };
  };

  const sensitivity = [0, 0.25, 0.65, 1].flatMap(
    (enforceableProjectCoverage) =>
      [0, 5, 10].flatMap((legacyContribution) =>
        [0.25, 0.50, 0.75].map((wholesaleElasticity) =>
          layer(
            enforceableProjectCoverage,
            legacyContribution,
            wholesaleElasticity,
          ),
        ),
      ),
  );

  const result: DataCenterRatepayerResult = {
    case: input,
    initialV1: {
      fullySocializedBillImpact: socialized.nonDataCenterBillImpact,
      literalFullPledgeBillImpact: fullPledge.nonDataCenterBillImpact,
    },
    revisedV2: {
      central: layer(input.enforceableProjectCoverage),
      headlineTerritoryCoverageMisreadAsProjectCoverage: layer(
        input.headlineTerritoryPowerCoverage,
      ),
      noProtection: layer(0),
      literalFullPledge: layer(1),
      literalFullPledgeWithoutLegacyContribution: layer(1, 0),
    },
    sensitivity,
    comparisonAnchors: {
      // The ICF numbers are nominal, market-specific, and driven by total
      // demand growth—not a causal data-center-only estimate.
      icfNominalRetailRateIncrease2030Low: 0.15,
      icfNominalRetailRateIncrease2030High: 0.40,
      icfAllCauseElectricityDemandGrowth2030: 0.25,
      // These two recent studies use different treatments and estimands. They
      // are retained as competing anchors, not averaged into the model.
      historicalDoublingEffectEstimate: -0.035,
      historicalEntryEffectEstimate: 0.021,
    },
  };
  assertFiniteDeep(result, 'data-center ratepayer result');
  return result;
}

export const july26HeadlineEvidence = {
  heat: {
    currentCount:
      'https://www.washingtonpost.com/weather/2026/07/26/this-months-heat-domes-killed-least-70-people-us-post-analysis-finds/',
    california2006: 'https://pubmed.ncbi.nlm.nih.gov/19680599/',
    chicago1995:
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC1854989/',
    pacificNorthwest2021:
      'https://doh.wa.gov/emergencies/be-prepared-be-safe/severe-weather-and-natural-disasters/extreme-heat/hot-weather-precautions/heat-wave-2021',
    oregon2021:
      'https://climate.oregon.gov/s/2023-Legislative-Report.pdf',
  },
  cyclospora: {
    current:
      'https://www.fda.gov/food/outbreaks-foodborne-illness/investigation-9-state-outbreak-cyclospora-illnesses-iceberg-lettuce-july-2026',
    outbreak2018:
      'https://www.cdc.gov/mmwr/volumes/67/wr/mm6739a6.htm',
    outbreak2020:
      'https://www.fda.gov/food/outbreaks-foodborne-illness/outbreak-investigation-cyclospora-bagged-salads-june-2020',
  },
  dataCenters: {
    currentNews:
      'https://apnews.com/article/trump-ai-data-centers-pledge-490ea7e4c7227d5e550b00a0056c33c9',
    pledge: 'https://www.whitehouse.gov/ratepayer-protection-pledge/',
    icf:
      'https://www.icf.com/-/media/files/icf/reports/2025/energy-demand-report-icf-2025_report.pdf',
    doeRateDesign:
      'https://www.energy.gov/policy/articles/electricity-rate-designs-large-loads-evolving-practices-and-opportunities',
    lowerRateStudy: 'https://arxiv.org/abs/2606.19777',
    higherRateStudy:
      'https://papers.ssrn.com/sol3/Delivery.cfm/6967558.pdf?abstractid=6967558',
  },
} as const;

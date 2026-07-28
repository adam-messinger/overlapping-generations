import { assertFiniteDeep } from 'tsimulation';

import {
  energyInflationScenarios,
  simulateEnergyInflationV2,
  type EnergyInflationResult,
  type EnergyInflationScenario,
} from './energy-inflation.js';

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

// ---------------------------------------------------------------------------
// 1. Oil-price relief after the U.S.-Iran pause
// ---------------------------------------------------------------------------

export interface OilPauseInflationCase {
  prewarBrentUsdPerBarrel: number;
  prePauseBrentUsdPerBarrel: number;
  pauseDayBrentUsdPerBarrel: number;
  oilShareOfImportEnergy: number;
  temporaryPauseMonths: number;
  sustainedPauseMonths: number;
  decayHalfLifeMonths: number;
  horizonMonths: number;
}

export interface OilPauseInflationPathSummary {
  id: 'pre-pause-stress' | 'temporary-pause' | 'sustained-pause';
  peakHeadlineInflationPct: number;
  peakCoreInflationPct: number;
  peakPolicyRatePct: number;
  firstYearAverageHeadlineInflationPct: number;
  firstYearHeadlineExcessPointMonths: number;
}

export interface OilPauseInflationResult {
  case: OilPauseInflationCase;
  initialV1: {
    spotOilPriceRelief: number;
    oilPriceStillAbovePrewar: number;
    warPremiumShareRemaining: number;
    instantaneousHeadlinePriceLevelReliefPctPoints: number;
    flaw: string;
  };
  revisedV2: {
    prePauseStress: OilPauseInflationPathSummary;
    temporaryPause: OilPauseInflationPathSummary & {
      firstYearAverageHeadlineReliefPctPoints: number;
      firstYearHeadlineExcessReliefPointMonths: number;
    };
    sustainedPause: OilPauseInflationPathSummary & {
      firstYearAverageHeadlineReliefPctPoints: number;
      firstYearHeadlineExcessReliefPointMonths: number;
    };
    interpretation: string;
  };
}

export const oilPauseInflationCase: OilPauseInflationCase = {
  // Brent closed at $67.02 on 27 February, the last trading day before the
  // war. The 27 July Reuters market wrap reported $88.90, down 8.14% on the
  // day, which implies a $96.78 pre-pause close.
  prewarBrentUsdPerBarrel: 67.02,
  prePauseBrentUsdPerBarrel: 88.90 / (1 - 0.0814),
  pauseDayBrentUsdPerBarrel: 88.90,
  // Existing Hormuz-Weber bridge calibration: oil is 55% of the stylized
  // imported-energy shock and gas is the remainder.
  oilShareOfImportEnergy: 0.55,
  temporaryPauseMonths: 1,
  sustainedPauseMonths: 6,
  decayHalfLifeMonths: 8,
  horizonMonths: 36,
};

const makeOilPricePath = (options: {
  input: OilPauseInflationCase;
  pauseMonths: number;
}): number[] => {
  const { input, pauseMonths } = options;
  return Array.from({ length: input.horizonMonths }, (_, month) => {
    if (month < pauseMonths) return input.pauseDayBrentUsdPerBarrel;
    if (month < input.sustainedPauseMonths) {
      return input.prePauseBrentUsdPerBarrel;
    }
    return (
      input.prewarBrentUsdPerBarrel +
      (input.prePauseBrentUsdPerBarrel -
        input.prewarBrentUsdPerBarrel) *
        Math.pow(
          0.5,
          (month - input.sustainedPauseMonths + 1) /
            input.decayHalfLifeMonths,
        )
    );
  });
};

const makeStressOilPricePath = (
  input: OilPauseInflationCase,
): number[] =>
  Array.from({ length: input.horizonMonths }, (_, month) => {
    if (month < input.sustainedPauseMonths) {
      return input.prePauseBrentUsdPerBarrel;
    }
    return (
      input.prewarBrentUsdPerBarrel +
      (input.prePauseBrentUsdPerBarrel -
        input.prewarBrentUsdPerBarrel) *
        Math.pow(
          0.5,
          (month - input.sustainedPauseMonths + 1) /
            input.decayHalfLifeMonths,
        )
    );
  });

const runOilInflationPath = (
  input: OilPauseInflationCase,
  id: OilPauseInflationPathSummary['id'],
  oilPricePath: readonly number[],
): EnergyInflationResult => {
  const base = energyInflationScenarios['euro-area-2026-current'];
  const importEnergyPricePath = oilPricePath.map(
    (oilPrice) =>
      1 +
      input.oilShareOfImportEnergy *
        (oilPrice / input.prewarBrentUsdPerBarrel - 1),
  );
  const scenario: EnergyInflationScenario = {
    ...base,
    id: `july-27-${id}`,
    label: `27 July oil pause: ${id}`,
    importEnergyPricePath,
  };
  return simulateEnergyInflationV2(scenario);
};

const summarizeOilInflationPath = (
  id: OilPauseInflationPathSummary['id'],
  run: EnergyInflationResult,
): OilPauseInflationPathSummary => {
  const firstYear = run.months.slice(0, 12);
  return {
    id,
    peakHeadlineInflationPct: run.peakHeadlineInflationPct,
    peakCoreInflationPct: run.peakCoreInflationPct,
    peakPolicyRatePct: run.peakPolicyRatePct,
    firstYearAverageHeadlineInflationPct: mean(
      firstYear.map((row) => row.headlineInflationPct),
    ),
    firstYearHeadlineExcessPointMonths: firstYear.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          row.headlineInflationPct -
            run.scenario.inflationTargetPct,
        ),
      0,
    ),
  };
};

/**
 * Compares a mark-to-market CPI shortcut with the existing lagged
 * energy-inflation model. The revision branches on the durability of the
 * pause because a one-day oil quote is not a consumer-price path.
 */
export function evaluateOilPauseInflation(
  input: OilPauseInflationCase = oilPauseInflationCase,
): OilPauseInflationResult {
  assertFiniteDeep(input, 'oil-pause inflation case');
  if (
    input.prewarBrentUsdPerBarrel <= 0 ||
    input.pauseDayBrentUsdPerBarrel <= input.prewarBrentUsdPerBarrel ||
    input.prePauseBrentUsdPerBarrel <= input.pauseDayBrentUsdPerBarrel ||
    input.temporaryPauseMonths < 1 ||
    input.temporaryPauseMonths >= input.sustainedPauseMonths ||
    input.sustainedPauseMonths >= input.horizonMonths
  ) {
    throw new Error('Invalid oil-pause inflation case');
  }

  const base = energyInflationScenarios['euro-area-2026-current'];
  const compositeMultiple = (oilPrice: number): number =>
    1 +
    input.oilShareOfImportEnergy *
      (oilPrice / input.prewarBrentUsdPerBarrel - 1);
  const consumerEnergyTargetGapLog = (oilPrice: number): number =>
    Math.log(
      1 +
        base.directConsumerPassThrough *
          (compositeMultiple(oilPrice) - 1) *
          base.exchangeRateAmplification,
    );
  const instantaneousHeadlinePriceLevelReliefPctPoints =
    100 *
    base.energyCpiWeight *
    (
      consumerEnergyTargetGapLog(input.prePauseBrentUsdPerBarrel) -
      consumerEnergyTargetGapLog(input.pauseDayBrentUsdPerBarrel)
    );

  const prePauseStress = summarizeOilInflationPath(
    'pre-pause-stress',
    runOilInflationPath(
      input,
      'pre-pause-stress',
      makeStressOilPricePath(input),
    ),
  );
  const temporaryPauseBase = summarizeOilInflationPath(
    'temporary-pause',
    runOilInflationPath(
      input,
      'temporary-pause',
      makeOilPricePath({
        input,
        pauseMonths: input.temporaryPauseMonths,
      }),
    ),
  );
  const sustainedPauseBase = summarizeOilInflationPath(
    'sustained-pause',
    runOilInflationPath(
      input,
      'sustained-pause',
      makeOilPricePath({
        input,
        pauseMonths: input.sustainedPauseMonths,
      }),
    ),
  );

  const result: OilPauseInflationResult = {
    case: input,
    initialV1: {
      spotOilPriceRelief:
        1 -
        input.pauseDayBrentUsdPerBarrel /
          input.prePauseBrentUsdPerBarrel,
      oilPriceStillAbovePrewar:
        input.pauseDayBrentUsdPerBarrel /
          input.prewarBrentUsdPerBarrel -
        1,
      warPremiumShareRemaining:
        (input.pauseDayBrentUsdPerBarrel -
          input.prewarBrentUsdPerBarrel) /
        (input.prePauseBrentUsdPerBarrel -
          input.prewarBrentUsdPerBarrel),
      instantaneousHeadlinePriceLevelReliefPctPoints,
      flaw:
        'Treats a one-day futures repricing as an immediate, durable consumer-price change.',
    },
    revisedV2: {
      prePauseStress,
      temporaryPause: {
        ...temporaryPauseBase,
        firstYearAverageHeadlineReliefPctPoints:
          prePauseStress.firstYearAverageHeadlineInflationPct -
          temporaryPauseBase.firstYearAverageHeadlineInflationPct,
        firstYearHeadlineExcessReliefPointMonths:
          prePauseStress.firstYearHeadlineExcessPointMonths -
          temporaryPauseBase.firstYearHeadlineExcessPointMonths,
      },
      sustainedPause: {
        ...sustainedPauseBase,
        firstYearAverageHeadlineReliefPctPoints:
          prePauseStress.firstYearAverageHeadlineInflationPct -
          sustainedPauseBase.firstYearAverageHeadlineInflationPct,
        firstYearHeadlineExcessReliefPointMonths:
          prePauseStress.firstYearHeadlineExcessPointMonths -
          sustainedPauseBase.firstYearHeadlineExcessPointMonths,
      },
      interpretation:
        'The spot move is genuine relief, but most of it reaches annual inflation only if the pause persists long enough to pass through retail energy prices.',
    },
  };
  assertFiniteDeep(result, 'oil-pause inflation result');
  return result;
}

// ---------------------------------------------------------------------------
// 2. China's first-half industrial-profit growth
// ---------------------------------------------------------------------------

export interface ChinaIndustrialProfitCase {
  currentProfitTrillionYuan: number;
  totalProfitGrowth: number;
  operatingRevenueGrowth: number;
  currentOperatingMargin: number;
  currentExportsTrillionYuan: number;
  exportGrowth: number;
  electronicsContributionPctPoints: number;
  rawMaterialsContributionPctPoints: number;
  autoProfitGrowth: number;
  exportRevenueShareLow: number;
  exportRevenueShareHigh: number;
}

export interface ChinaExportCounterfactual {
  priorExportRevenueShare: number;
  counterfactualRevenueGrowthWithoutExportGrowth: number;
  counterfactualProfitGrowthWithoutExportGrowth: number;
  exportCushionPctPoints: number;
  exportCushionShareOfObservedProfitGrowth: number;
}

export interface ChinaIndustrialProfitResult {
  case: ChinaIndustrialProfitCase;
  initialV1: {
    revenueOnlyPredictedProfitGrowth: number;
    revenueOnlyGrowthErrorPctPoints: number;
    exportGrowthAsProfitGrowth: number;
    exportGrowthErrorPctPoints: number;
    flaw: string;
  };
  revisedV2: {
    previousProfitTrillionYuan: number;
    currentIndustrialRevenueTrillionYuan: number;
    previousOperatingMargin: number;
    marginGrowth: number;
    exactGrowthDecomposition: {
      revenueScalePctPoints: number;
      marginExpansionPctPoints: number;
      interactionPctPoints: number;
    };
    shapleyGrowthDecomposition: {
      revenueChannelPctPoints: number;
      marginChannelPctPoints: number;
      marginChannelShareOfProfitGrowth: number;
    };
    sectorContribution: {
      electronicsPctPoints: number;
      rawMaterialsPctPoints: number;
      allOtherIndustriesPctPoints: number;
      electronicsAndRawMaterialsShareOfGrowth: number;
    };
    exportCounterfactualCentral: ChinaExportCounterfactual;
    exportCounterfactualSensitivity: readonly ChinaExportCounterfactual[];
  };
}

export const chinaIndustrialProfitCase: ChinaIndustrialProfitCase = {
  // NBS, 27 July 2026: CNY3.95tn H1 profit, +18.7% y/y.
  currentProfitTrillionYuan: 3.95,
  totalProfitGrowth: 0.187,
  // NBS: operating revenue +6.5% and operating margin 5.7%.
  operatingRevenueGrowth: 0.065,
  currentOperatingMargin: 0.057,
  // NBS/GAC: H1 goods exports CNY14.7314tn, +13.4% y/y.
  currentExportsTrillionYuan: 14.7314,
  exportGrowth: 0.134,
  // NBS: electronics and raw materials contributed 8.5pp and 8.8pp,
  // respectively, to the 18.7% aggregate profit gain.
  electronicsContributionPctPoints: 0.085,
  rawMaterialsContributionPctPoints: 0.088,
  // NBS/Reuters: automobile-manufacturing profit -19.5% y/y.
  autoProfitGrowth: -0.195,
  // Sensitivity around the cross-system export/industrial-revenue proxy.
  exportRevenueShareLow: 0.15,
  exportRevenueShareHigh: 0.25,
};

/**
 * Revises a sales-growth reading into the accounting identity
 * profit = revenue × margin, then bounds an export-growth counterfactual.
 *
 * The export calculation is deliberately a bridge, not a causal estimate:
 * customs exports and above-designated-size industrial revenue have different
 * statistical universes, and export-linked margins are not separately public.
 */
export function evaluateChinaIndustrialProfits(
  input: ChinaIndustrialProfitCase = chinaIndustrialProfitCase,
): ChinaIndustrialProfitResult {
  assertFiniteDeep(input, 'China industrial-profit case');
  if (
    input.currentProfitTrillionYuan <= 0 ||
    input.currentOperatingMargin <= 0 ||
    input.totalProfitGrowth <= -1 ||
    input.operatingRevenueGrowth <= -1 ||
    input.exportGrowth <= -1
  ) {
    throw new Error('Invalid China industrial-profit case');
  }

  const previousProfitTrillionYuan =
    input.currentProfitTrillionYuan /
    (1 + input.totalProfitGrowth);
  const currentIndustrialRevenueTrillionYuan =
    input.currentProfitTrillionYuan /
    input.currentOperatingMargin;
  const previousIndustrialRevenueTrillionYuan =
    currentIndustrialRevenueTrillionYuan /
    (1 + input.operatingRevenueGrowth);
  const previousOperatingMargin =
    previousProfitTrillionYuan /
    previousIndustrialRevenueTrillionYuan;
  const marginGrowth =
    input.currentOperatingMargin / previousOperatingMargin - 1;
  const interaction =
    input.operatingRevenueGrowth * marginGrowth;

  const previousExportsTrillionYuan =
    input.currentExportsTrillionYuan / (1 + input.exportGrowth);
  const proxyPriorExportRevenueShare =
    previousExportsTrillionYuan /
    previousIndustrialRevenueTrillionYuan;
  const exportCounterfactual = (
    priorExportRevenueShare: number,
  ): ChinaExportCounterfactual => {
    const counterfactualRevenueGrowthWithoutExportGrowth =
      input.operatingRevenueGrowth -
      priorExportRevenueShare * input.exportGrowth;
    const counterfactualProfitGrowthWithoutExportGrowth =
      (1 + counterfactualRevenueGrowthWithoutExportGrowth) *
        (1 + marginGrowth) -
      1;
    const exportCushionPctPoints =
      input.totalProfitGrowth -
      counterfactualProfitGrowthWithoutExportGrowth;
    return {
      priorExportRevenueShare,
      counterfactualRevenueGrowthWithoutExportGrowth,
      counterfactualProfitGrowthWithoutExportGrowth,
      exportCushionPctPoints,
      exportCushionShareOfObservedProfitGrowth:
        exportCushionPctPoints / input.totalProfitGrowth,
    };
  };
  const exportShares = [
    input.exportRevenueShareLow,
    proxyPriorExportRevenueShare,
    input.exportRevenueShareHigh,
  ].sort((a, b) => a - b);

  const electronicsAndRawMaterials =
    input.electronicsContributionPctPoints +
    input.rawMaterialsContributionPctPoints;
  const result: ChinaIndustrialProfitResult = {
    case: input,
    initialV1: {
      revenueOnlyPredictedProfitGrowth: input.operatingRevenueGrowth,
      revenueOnlyGrowthErrorPctPoints:
        input.totalProfitGrowth - input.operatingRevenueGrowth,
      exportGrowthAsProfitGrowth: input.exportGrowth,
      exportGrowthErrorPctPoints:
        input.totalProfitGrowth - input.exportGrowth,
      flaw:
        'Equates sales or export growth with profit growth and therefore omits margin repricing and sector mix.',
    },
    revisedV2: {
      previousProfitTrillionYuan,
      currentIndustrialRevenueTrillionYuan,
      previousOperatingMargin,
      marginGrowth,
      exactGrowthDecomposition: {
        revenueScalePctPoints: input.operatingRevenueGrowth,
        marginExpansionPctPoints: marginGrowth,
        interactionPctPoints: interaction,
      },
      shapleyGrowthDecomposition: {
        revenueChannelPctPoints:
          input.operatingRevenueGrowth + interaction / 2,
        marginChannelPctPoints: marginGrowth + interaction / 2,
        marginChannelShareOfProfitGrowth:
          (marginGrowth + interaction / 2) /
          input.totalProfitGrowth,
      },
      sectorContribution: {
        electronicsPctPoints:
          input.electronicsContributionPctPoints,
        rawMaterialsPctPoints:
          input.rawMaterialsContributionPctPoints,
        allOtherIndustriesPctPoints:
          input.totalProfitGrowth - electronicsAndRawMaterials,
        electronicsAndRawMaterialsShareOfGrowth:
          electronicsAndRawMaterials / input.totalProfitGrowth,
      },
      exportCounterfactualCentral: exportCounterfactual(
        proxyPriorExportRevenueShare,
      ),
      exportCounterfactualSensitivity:
        exportShares.map(exportCounterfactual),
    },
  };
  assertFiniteDeep(result, 'China industrial-profit result');
  return result;
}

// ---------------------------------------------------------------------------
// 3. El Nino and Atlantic hurricane insured losses
// ---------------------------------------------------------------------------

export interface HurricaneInsuranceCase {
  normalNamedStorms: number;
  forecastNamedStormsLow: number;
  forecastNamedStormsHigh: number;
  recentAverageInsuredLossBillion: number;
  elNinoAverageLandfalls: number;
  laNinaAverageLandfalls: number;
  historicalElNinoAverageLossBillion: number;
  currentMetroStrikeLossBillion: number;
  andrew1992NamedStorms: number;
  andrew1992CurrentEquivalentLossBillion: number;
  season2020NamedStorms: number;
  season2020UsLandfalls: number;
  season2020InsuredLossBillion: number;
}

export interface HurricaneLossDistribution {
  expectedLossBillion: number;
  medianLossBillion: number;
  p90LossBillion: number;
  p95LossBillion: number;
  p99LossBillion: number;
  probabilityAtLeastRecentAverageLoss: number;
  probabilityAtLeastOneMetroStrike: number;
}

export interface HurricaneInsuranceResult {
  case: HurricaneInsuranceCase;
  initialV1: {
    midpointNamedStormForecast: number;
    expectedLossBillion: number;
    expectedLossRangeBillion: readonly [number, number];
    expectedLossReduction: number;
    historicalChecks: readonly {
      year: number;
      observedLossBillion: number;
      countScaledPredictionBillion: number;
      absolutePercentageError: number;
    }[];
    historicalMeanAbsolutePercentageError: number;
    flaw: string;
  };
  revisedV2: {
    normalLandfallRate: number;
    ordinaryLossPerLandfallBillion: number;
    calibratedMetroStrikeProbabilityPerLandfall: number;
    central: HurricaneLossDistribution & {
      expectedLossReduction: number;
    };
    historicalMechanismChecks: readonly {
      year: number;
      conditioning: string;
      observedLossBillion: number;
      mechanismPredictionBillion: number;
      absolutePercentageError: number;
    }[];
    historicalMechanismMeanAbsolutePercentageError: number;
    concentrationSensitivity: readonly {
      metroStrikeProbabilityMultiplier: number;
      expectedLossBillion: number;
      probabilityAtLeastOneMetroStrike: number;
    }[];
    interpretation: string;
  };
}

export const hurricaneInsuranceCase: HurricaneInsuranceCase = {
  // NOAA climatology and 2026 outlook as reported by Reuters: 14 named
  // storms normally; 8-14 forecast in 2026.
  normalNamedStorms: 14,
  forecastNamedStormsLow: 8,
  forecastNamedStormsHigh: 14,
  // Aon/Reuters: roughly $30bn average annual insured loss, 2016-2024.
  recentAverageInsuredLossBillion: 30,
  // Aon 2026 ENSO report, 13 years in each phase: 3.8 El Nino and 8.4
  // La Nina landfalling storms per year; inflation-adjusted El Nino losses
  // averaged $6.1bn.
  elNinoAverageLandfalls: 3.8,
  laNinaAverageLandfalls: 8.4,
  historicalElNinoAverageLossBillion: 6.1,
  // Swiss Re/Karen Clark estimates cited by Reuters: Andrew today, or a
  // major Miami/Tampa/Houston strike, can exceed $100bn insured.
  currentMetroStrikeLossBillion: 100,
  // Reuters' two deliberately contrasting seasons.
  andrew1992NamedStorms: 7,
  andrew1992CurrentEquivalentLossBillion: 100,
  season2020NamedStorms: 30,
  // NOAA/AOML: 12 continental-U.S. landfalling storms in 2020.
  season2020UsLandfalls: 12,
  season2020InsuredLossBillion: 30,
};

const poissonMasses = (lambda: number, maximum: number): number[] => {
  const masses = [Math.exp(-lambda)];
  for (let count = 1; count <= maximum; count++) {
    masses.push((masses[count - 1] * lambda) / count);
  }
  return masses;
};

const discreteLossDistribution = (options: {
  landfallRate: number;
  metroStrikeProbability: number;
  ordinaryLossPerLandfallBillion: number;
  metroStrikeLossBillion: number;
  comparisonLossBillion: number;
}): HurricaneLossDistribution => {
  // Poisson thinning makes metro and ordinary-only landfalls independent.
  const metroRate =
    options.landfallRate * options.metroStrikeProbability;
  const ordinaryOnlyRate =
    options.landfallRate * (1 - options.metroStrikeProbability);
  const metroMasses = poissonMasses(metroRate, 20);
  const ordinaryMasses = poissonMasses(ordinaryOnlyRate, 40);
  const outcomes: { loss: number; probability: number }[] = [];
  for (
    let metroCount = 0;
    metroCount < metroMasses.length;
    metroCount++
  ) {
    for (
      let ordinaryCount = 0;
      ordinaryCount < ordinaryMasses.length;
      ordinaryCount++
    ) {
      outcomes.push({
        loss:
          (metroCount + ordinaryCount) *
            options.ordinaryLossPerLandfallBillion +
          metroCount * options.metroStrikeLossBillion,
        probability:
          metroMasses[metroCount] * ordinaryMasses[ordinaryCount],
      });
    }
  }
  outcomes.sort((a, b) => a.loss - b.loss);
  const totalMass = outcomes.reduce(
    (sum, row) => sum + row.probability,
    0,
  );
  const quantile = (probability: number): number => {
    let cumulative = 0;
    for (const row of outcomes) {
      cumulative += row.probability / totalMass;
      if (cumulative >= probability) return row.loss;
    }
    return outcomes.at(-1)?.loss ?? 0;
  };
  const probabilityAtLeastRecentAverageLoss =
    outcomes
      .filter(
        (row) =>
          row.loss >=
          options.comparisonLossBillion,
      )
      .reduce((sum, row) => sum + row.probability, 0) /
    totalMass;
  return {
    expectedLossBillion:
      options.landfallRate *
      (
        options.ordinaryLossPerLandfallBillion +
        options.metroStrikeProbability *
          options.metroStrikeLossBillion
      ),
    medianLossBillion: quantile(0.50),
    p90LossBillion: quantile(0.90),
    p95LossBillion: quantile(0.95),
    p99LossBillion: quantile(0.99),
    probabilityAtLeastRecentAverageLoss,
    probabilityAtLeastOneMetroStrike:
      1 - Math.exp(-metroRate),
  };
};

/**
 * Replaces named-storm scaling with a compound landfall/location model.
 * Ordinary loss is anchored to historical El Nino loss per landfall. A rare
 * present-day metro strike is calibrated so that the same model reproduces
 * the recent $30bn all-season average at the midpoint of the observed El
 * Nino/La Nina landfall rates.
 */
export function evaluateHurricaneInsuranceRisk(
  input: HurricaneInsuranceCase = hurricaneInsuranceCase,
): HurricaneInsuranceResult {
  assertFiniteDeep(input, 'hurricane insurance case');
  if (
    input.normalNamedStorms <= 0 ||
    input.forecastNamedStormsLow <= 0 ||
    input.forecastNamedStormsHigh <
      input.forecastNamedStormsLow ||
    input.elNinoAverageLandfalls <= 0 ||
    input.laNinaAverageLandfalls <= 0
  ) {
    throw new Error('Invalid hurricane insurance case');
  }

  const midpointNamedStormForecast =
    (
      input.forecastNamedStormsLow +
      input.forecastNamedStormsHigh
    ) / 2;
  const countScaledLoss = (namedStorms: number): number =>
    input.recentAverageInsuredLossBillion *
    namedStorms /
    input.normalNamedStorms;
  const historicalChecks = [
    {
      year: 1992,
      observedLossBillion:
        input.andrew1992CurrentEquivalentLossBillion,
      countScaledPredictionBillion: countScaledLoss(
        input.andrew1992NamedStorms,
      ),
    },
    {
      year: 2020,
      observedLossBillion: input.season2020InsuredLossBillion,
      countScaledPredictionBillion: countScaledLoss(
        input.season2020NamedStorms,
      ),
    },
  ].map((row) => ({
    ...row,
    absolutePercentageError:
      Math.abs(
        row.countScaledPredictionBillion - row.observedLossBillion
      ) / row.observedLossBillion,
  }));

  const normalLandfallRate =
    (
      input.elNinoAverageLandfalls +
      input.laNinaAverageLandfalls
    ) / 2;
  const ordinaryLossPerLandfallBillion =
    input.historicalElNinoAverageLossBillion /
    input.elNinoAverageLandfalls;
  const calibratedMetroStrikeProbabilityPerLandfall =
    (
      input.recentAverageInsuredLossBillion / normalLandfallRate -
      ordinaryLossPerLandfallBillion
    ) / input.currentMetroStrikeLossBillion;
  if (
    calibratedMetroStrikeProbabilityPerLandfall <= 0 ||
    calibratedMetroStrikeProbabilityPerLandfall >= 1
  ) {
    throw new Error(
      'Hurricane metro-strike calibration is outside (0, 1)',
    );
  }

  const centralBase = discreteLossDistribution({
    landfallRate: input.elNinoAverageLandfalls,
    metroStrikeProbability:
      calibratedMetroStrikeProbabilityPerLandfall,
    ordinaryLossPerLandfallBillion,
    metroStrikeLossBillion: input.currentMetroStrikeLossBillion,
    comparisonLossBillion: input.recentAverageInsuredLossBillion,
  });
  const historicalMechanismChecks = [
    {
      year: 1992,
      conditioning: 'one present-day metro strike',
      observedLossBillion:
        input.andrew1992CurrentEquivalentLossBillion,
      mechanismPredictionBillion:
        input.currentMetroStrikeLossBillion +
        ordinaryLossPerLandfallBillion,
    },
    {
      year: 2020,
      conditioning: `${input.season2020UsLandfalls} U.S. landfalls, no metro strike`,
      observedLossBillion: input.season2020InsuredLossBillion,
      mechanismPredictionBillion:
        input.season2020UsLandfalls *
        ordinaryLossPerLandfallBillion,
    },
  ].map((row) => ({
    ...row,
    absolutePercentageError:
      Math.abs(
        row.mechanismPredictionBillion - row.observedLossBillion
      ) / row.observedLossBillion,
  }));
  const concentrationSensitivity = [0.5, 1, 1.5].map(
    (metroStrikeProbabilityMultiplier) => {
      const metroStrikeProbability =
        calibratedMetroStrikeProbabilityPerLandfall *
        metroStrikeProbabilityMultiplier;
      return {
        metroStrikeProbabilityMultiplier,
        expectedLossBillion:
          input.elNinoAverageLandfalls *
          (
            ordinaryLossPerLandfallBillion +
            metroStrikeProbability *
              input.currentMetroStrikeLossBillion
          ),
        probabilityAtLeastOneMetroStrike:
          1 -
          Math.exp(
            -input.elNinoAverageLandfalls *
              metroStrikeProbability,
          ),
      };
    },
  );

  const initialExpectedLossBillion = countScaledLoss(
    midpointNamedStormForecast,
  );
  const result: HurricaneInsuranceResult = {
    case: input,
    initialV1: {
      midpointNamedStormForecast,
      expectedLossBillion: initialExpectedLossBillion,
      expectedLossRangeBillion: [
        countScaledLoss(input.forecastNamedStormsLow),
        countScaledLoss(input.forecastNamedStormsHigh),
      ],
      expectedLossReduction:
        1 -
        initialExpectedLossBillion /
          input.recentAverageInsuredLossBillion,
      historicalChecks,
      historicalMeanAbsolutePercentageError: mean(
        historicalChecks.map(
          (row) => row.absolutePercentageError,
        ),
      ),
      flaw:
        'Named-storm counts cannot represent landfall location or the heavy right tail of insured exposure.',
    },
    revisedV2: {
      normalLandfallRate,
      ordinaryLossPerLandfallBillion,
      calibratedMetroStrikeProbabilityPerLandfall,
      central: {
        ...centralBase,
        expectedLossReduction:
          1 -
          centralBase.expectedLossBillion /
            input.recentAverageInsuredLossBillion,
      },
      historicalMechanismChecks,
      historicalMechanismMeanAbsolutePercentageError: mean(
        historicalMechanismChecks.map(
          (row) => row.absolutePercentageError,
        ),
      ),
      concentrationSensitivity,
      interpretation:
        'El Nino lowers expected loss, but the annual distribution remains strongly right-skewed: a quiet basin can still contain one urban catastrophe.',
    },
  };
  assertFiniteDeep(result, 'hurricane insurance result');
  return result;
}

export const july27HeadlineEvidence = {
  oil: {
    markets:
      'https://au.investing.com/news/stock-market-news/shares-bonds-bounce-as-oil-skid-offers-inflation-relief-4552818',
    prewarClose:
      'https://www.kiplinger.com/investing/stocks/stocks-slip-as-alphabet-gets-ready-to-report-stock-market-today',
    iea:
      'https://www.iea.org/reports/oil-market-report-july-2026',
  },
  china: {
    reporting:
      'https://www.investing.com/news/economic-indicators/chinas-industrial-profit-growth-moderates-amid-patchy-recovery-4812940',
    nbsEconomy:
      'https://www.stats.gov.cn/english/PressRelease/202607/t20260715_1964120.html',
    nbsProduction:
      'https://www.stats.gov.cn/english/PressRelease/202607/t20260717_1964159.html',
    sectorContributions:
      'https://www.china.org.cn/china/Off_the_Wire/2026-07/27/content_118620327.shtml',
  },
  hurricane: {
    reporting:
      'https://www.investing.com/news/stock-market-news/analysiswhy-el-ninos-promise-of-a-quieter-hurricane-season-may-not-guarantee-good-news-for-insurers-4813365',
    aon:
      'https://www.aon.com/getmedia/a205f3da-7119-41a2-9a8e-4255172509d9/El-Nino-US-Hurricane-Risk-report.pdf',
    noaaOutlook:
      'https://apnews.com/article/hurricanes-atlantic-pacific-el-nino-damage-risk-419de66615c5eb9b2974ef14b4d2f50b',
    noaa2020:
      'https://www.aoml.noaa.gov/hurricane_blog/record-breaking-atlantic-hurricane-season-draws-to-an-end/',
  },
} as const;

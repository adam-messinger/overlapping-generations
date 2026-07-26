import { assertFiniteDeep } from 'tsimulation';

import {
  hormuzDefaults,
  type HormuzModelParams,
  type HormuzScenario,
} from '../critical-materials/hormuz-data.js';
import {
  simulateHormuzDisruption,
  type HormuzSimulationResult,
} from '../critical-materials/hormuz-model.js';

const DAYS_PER_MONTH = 365.25 / 12;

const capitalRecoveryFactor = (
  annualRate: number,
  lifeYears: number,
): number => {
  const growth = Math.pow(1 + annualRate, lifeYears);
  return annualRate * growth / (growth - 1);
};

export interface AlphabetCapexCase {
  capex2024Billion: number;
  capex2025Billion: number;
  capex2026Billion: number;
  cloudShareOfIncrementalCapex: number;
  serverShareOfCapex: number;
  serverLifeYears: number;
  facilityLifeYears: number;
  hurdleRate: number;
  cloudQ4Revenue2024Billion: number;
  cloudQ4Revenue2025Billion: number;
  cloudQ2Revenue2025Billion: number;
  cloudQ2Revenue2026Billion: number;
  cloudQ4Margin2024: number;
  cloudQ4Margin2025: number;
  cloudQ2Margin2025: number;
  cloudQ2Margin2026: number;
  organicCloudRevenueGrowth: number;
  counterfactualCloudMargin2026: number;
  downsideBenefitPersistence: number;
  q2FreeCashFlowBillion: number;
}

export interface CapitalChargeComparison {
  incrementalCapexBillion: number;
  cloudAllocatedCapexBillion: number;
  annualCapitalChargeBillion: number;
  annualIncrementalCloudOperatingProfitBillion: number;
  capitalChargeCoverage: number;
}

export interface AlphabetCapexResult {
  case: AlphabetCapexCase;
  weightedAnnualCapitalChargeRate: number;
  naiveHeadline: {
    annualizedFreeCashFlowBillion: number;
    fullCapexCapitalChargeBillion: number;
    annualizedCurrentCloudOperatingProfitBillion: number;
    cloudProfitToFullCapitalCharge: number;
  };
  backcast2025: CapitalChargeComparison;
  currentCentral: CapitalChargeComparison & {
    requiredBenefitAttribution: number;
    breakEvenCloudRevenueGrowth: number;
  };
  backcastProductivityProjection: {
    annualOperatingProfitPerCloudCapexDollar: number;
    projectedAnnualCloudOperatingProfitBillion: number;
    capitalChargeCoverage: number;
    halfProductivityCoverage: number;
    requiredBackcastProductivityRetention: number;
  };
  attributionDownside: {
    annualAttributedCloudOperatingProfitBillion: number;
    capitalChargeCoverage: number;
    otherBusinessBenefitNeededBillion: number;
  };
  sensitivity: readonly {
    organicCloudGrowth: number;
    cloudCapexShare: number;
    capitalChargeCoverage: number;
    requiredBenefitAttribution: number;
  }[];
}

export const alphabetCapexCase: AlphabetCapexCase = {
  capex2024Billion: 52.5,
  capex2025Billion: 91.4,
  capex2026Billion: 200,
  cloudShareOfIncrementalCapex: 0.55,
  serverShareOfCapex: 0.60,
  serverLifeYears: 4,
  facilityLifeYears: 20,
  hurdleRate: 0.10,
  cloudQ4Revenue2024Billion: 12,
  cloudQ4Revenue2025Billion: 17.7,
  cloudQ2Revenue2025Billion: 13.6,
  cloudQ2Revenue2026Billion: 24.8,
  cloudQ4Margin2024: 0.175,
  cloudQ4Margin2025: 0.301,
  cloudQ2Margin2025: 0.207,
  cloudQ2Margin2026: 0.356,
  organicCloudRevenueGrowth: 0.20,
  // A conservative continuation of the margin expansion already visible in
  // the historical segment results, rather than holding the old 20.7% margin.
  counterfactualCloudMargin2026: 0.25,
  downsideBenefitPersistence: 0.50,
  q2FreeCashFlowBillion: -5.9,
};

/**
 * A capital-charge diagnostic around the registered AI capital-cycle model.
 *
 * V1 deliberately compares all company capex with one segment's current
 * profit. The revisions compare only the capex increase with above-trend
 * Cloud profit, backcast the same test over 2024-25, and then haircut the
 * attribution because 2026 spending mostly creates future capacity.
 */
export function evaluateAlphabetCapex(
  input: AlphabetCapexCase = alphabetCapexCase,
): AlphabetCapexResult {
  assertFiniteDeep(input, 'Alphabet capex case');
  const weightedAnnualCapitalChargeRate =
    input.serverShareOfCapex *
      capitalRecoveryFactor(input.hurdleRate, input.serverLifeYears) +
    (1 - input.serverShareOfCapex) *
      capitalRecoveryFactor(input.hurdleRate, input.facilityLifeYears);

  const compare = (
    incrementalCapexBillion: number,
    cloudShare: number,
    annualIncrementalCloudOperatingProfitBillion: number,
  ): CapitalChargeComparison => {
    const cloudAllocatedCapexBillion =
      incrementalCapexBillion * cloudShare;
    const annualCapitalChargeBillion =
      cloudAllocatedCapexBillion * weightedAnnualCapitalChargeRate;
    return {
      incrementalCapexBillion,
      cloudAllocatedCapexBillion,
      annualCapitalChargeBillion,
      annualIncrementalCloudOperatingProfitBillion,
      capitalChargeCoverage:
        annualIncrementalCloudOperatingProfitBillion /
        annualCapitalChargeBillion,
    };
  };

  const backcastCounterfactualProfit =
    input.cloudQ4Revenue2024Billion *
    (1 + input.organicCloudRevenueGrowth) *
    input.cloudQ4Margin2024;
  const backcastObservedProfit =
    input.cloudQ4Revenue2025Billion * input.cloudQ4Margin2025;
  const backcast2025 = compare(
    input.capex2025Billion - input.capex2024Billion,
    input.cloudShareOfIncrementalCapex,
    4 * (backcastObservedProfit - backcastCounterfactualProfit),
  );

  const currentCounterfactualQuarterlyProfit =
    input.cloudQ2Revenue2025Billion *
    (1 + input.organicCloudRevenueGrowth) *
    input.counterfactualCloudMargin2026;
  const currentObservedQuarterlyProfit =
    input.cloudQ2Revenue2026Billion * input.cloudQ2Margin2026;
  const annualIncrementalCloudOperatingProfitBillion =
    4 *
    (currentObservedQuarterlyProfit -
      currentCounterfactualQuarterlyProfit);
  const currentBase = compare(
    input.capex2026Billion - input.capex2025Billion,
    input.cloudShareOfIncrementalCapex,
    annualIncrementalCloudOperatingProfitBillion,
  );
  const requiredBenefitAttribution =
    currentBase.annualCapitalChargeBillion /
    annualIncrementalCloudOperatingProfitBillion;
  const quarterlyProfitNeeded =
    currentCounterfactualQuarterlyProfit +
    currentBase.annualCapitalChargeBillion / 4;
  const breakEvenRevenue =
    quarterlyProfitNeeded / input.cloudQ2Margin2026;
  const currentCentral = {
    ...currentBase,
    requiredBenefitAttribution,
    breakEvenCloudRevenueGrowth:
      breakEvenRevenue / input.cloudQ2Revenue2025Billion - 1,
  };

  // A temporally aligned alternative: use the 2024→25 cohort as a noisy
  // productivity calibration for the larger 2025→26 capex increase. This is
  // not a causal estimate, but it avoids claiming that capex paid in 2026
  // created revenue already reported in 2026 Q2.
  const annualOperatingProfitPerCloudCapexDollar =
    backcast2025.annualIncrementalCloudOperatingProfitBillion /
    backcast2025.cloudAllocatedCapexBillion;
  const projectedAnnualCloudOperatingProfitBillion =
    currentBase.cloudAllocatedCapexBillion *
    annualOperatingProfitPerCloudCapexDollar;
  const projectedCoverage =
    projectedAnnualCloudOperatingProfitBillion /
    currentBase.annualCapitalChargeBillion;

  const annualAttributedCloudOperatingProfitBillion =
    annualIncrementalCloudOperatingProfitBillion *
    input.downsideBenefitPersistence;
  const otherBusinessBenefitNeededBillion = Math.max(
    0,
    currentBase.annualCapitalChargeBillion -
      annualAttributedCloudOperatingProfitBillion,
  );

  const fullCapexCapitalChargeBillion =
    input.capex2026Billion * weightedAnnualCapitalChargeRate;
  const annualizedCurrentCloudOperatingProfitBillion =
    4 * currentObservedQuarterlyProfit;

  const sensitivity = [0.10, 0.20, 0.30].flatMap(
    (organicCloudGrowth) =>
      [0.45, 0.55, 0.65].map((cloudCapexShare) => {
        const counterfactualProfit =
          input.cloudQ2Revenue2025Billion *
          (1 + organicCloudGrowth) *
          input.counterfactualCloudMargin2026;
        const incrementalProfit =
          4 * (currentObservedQuarterlyProfit - counterfactualProfit);
        const comparison = compare(
          input.capex2026Billion - input.capex2025Billion,
          cloudCapexShare,
          incrementalProfit,
        );
        return {
          organicCloudGrowth,
          cloudCapexShare,
          capitalChargeCoverage: comparison.capitalChargeCoverage,
          requiredBenefitAttribution:
            comparison.annualCapitalChargeBillion / incrementalProfit,
        };
      }),
  );

  const result: AlphabetCapexResult = {
    case: input,
    weightedAnnualCapitalChargeRate,
    naiveHeadline: {
      annualizedFreeCashFlowBillion: 4 * input.q2FreeCashFlowBillion,
      fullCapexCapitalChargeBillion,
      annualizedCurrentCloudOperatingProfitBillion,
      cloudProfitToFullCapitalCharge:
        annualizedCurrentCloudOperatingProfitBillion /
        fullCapexCapitalChargeBillion,
    },
    backcast2025,
    currentCentral,
    backcastProductivityProjection: {
      annualOperatingProfitPerCloudCapexDollar,
      projectedAnnualCloudOperatingProfitBillion,
      capitalChargeCoverage: projectedCoverage,
      halfProductivityCoverage: projectedCoverage * 0.50,
      requiredBackcastProductivityRetention: 1 / projectedCoverage,
    },
    attributionDownside: {
      annualAttributedCloudOperatingProfitBillion,
      capitalChargeCoverage:
        annualAttributedCloudOperatingProfitBillion /
        currentBase.annualCapitalChargeBillion,
      otherBusinessBenefitNeededBillion,
    },
    sensitivity,
  };
  assertFiniteDeep(result, 'Alphabet capex result');
  return result;
}

export interface ForcedLaborTariffCase {
  coveredImportsBillion: number;
  coveredShareOfUsImports: number;
  taxableProductShare: number;
  oldTemporaryTariffRate: number;
  highRateCountryImportShare: number;
  lowRate: number;
  highRate: number;
  tariffPassThrough: number;
  importDemandElasticity: number;
  crossCountryElasticity: number;
  finalConsumptionImportExposure: number;
  inputOutputAmplification: number;
  firstQuarterTransmissionShare: number;
  representativeExporterBillion: number;
}

export interface ForcedLaborTariffResult {
  case: ForcedLaborTariffCase;
  weightedNewTariffRate: number;
  naiveFromZero: {
    deliveredImportPriceIncrease: number;
    consumerPriceLevelIncrease: number;
    affectedImportQuantityDecline: number;
    annualTariffRevenueBillion: number;
  };
  incrementalFromExpiringTariff: {
    tariffRateIncrease: number;
    deliveredImportPriceIncrease: number;
    consumerPriceLevelIncrease: number;
    firstQuarterConsumerPriceLevelIncrease: number;
    affectedImportQuantityDecline: number;
    additionalAnnualTariffRevenueBillion: number;
  };
  forcedLaborMechanism: {
    highRateCountryRelativeVolumeDecline: number;
    withinCountryForcedLaborRelativePriceChange: number;
    representativeAnnualSavingsFromComplianceMillion: number;
    countriesChangingLawDuringInvestigation: number;
  };
  sensitivity: readonly {
    taxableProductShare: number;
    highRateCountryImportShare: number;
    incrementalConsumerPriceLevelIncrease: number;
    additionalAnnualTariffRevenueBillion: number;
  }[];
}

export const forcedLaborTariffCase: ForcedLaborTariffCase = {
  // Scenario-scale import base. The policy's official coverage is observed;
  // the dollar base and exempt share should be replaced by an HTS-weighted
  // customs extract once one is available.
  coveredImportsBillion: 3_300,
  coveredShareOfUsImports: 0.994,
  taxableProductShare: 0.78,
  oldTemporaryTariffRate: 0.10,
  highRateCountryImportShare: 0.40,
  lowRate: 0.10,
  highRate: 0.125,
  tariffPassThrough: 0.80,
  importDemandElasticity: 1.50,
  crossCountryElasticity: 2,
  finalConsumptionImportExposure: 0.15,
  inputOutputAmplification: 1.25,
  firstQuarterTransmissionShare: 0.35,
  representativeExporterBillion: 10,
};

/**
 * Separates three mechanisms that are conflated in the tariff headline:
 * the gross rate relative to zero, the small change from the expiring 10%
 * tariff, and the 2.5-point incentive for a country to enact a prohibition.
 */
export function evaluateForcedLaborTariffs(
  input: ForcedLaborTariffCase = forcedLaborTariffCase,
): ForcedLaborTariffResult {
  assertFiniteDeep(input, 'forced-labor tariff case');
  const weightedNewTariffRate =
    input.lowRate +
    (input.highRate - input.lowRate) *
      input.highRateCountryImportShare;
  const priceAndQuantity = (rateIncrease: number) => {
    const deliveredImportPriceIncrease =
      rateIncrease *
      input.taxableProductShare *
      input.tariffPassThrough;
    const quantityRatio = Math.pow(
      1 + rateIncrease * input.tariffPassThrough,
      -input.importDemandElasticity,
    );
    return {
      deliveredImportPriceIncrease,
      consumerPriceLevelIncrease:
        deliveredImportPriceIncrease *
        input.finalConsumptionImportExposure *
        input.inputOutputAmplification,
      affectedImportQuantityDecline: 1 - quantityRatio,
      quantityRatio,
    };
  };

  const gross = priceAndQuantity(weightedNewTariffRate);
  const incrementalRate =
    weightedNewTariffRate - input.oldTemporaryTariffRate;
  const incremental = priceAndQuantity(incrementalRate);
  const taxableImports =
    input.coveredImportsBillion * input.taxableProductShare;
  const grossRevenue =
    taxableImports * gross.quantityRatio * weightedNewTariffRate;
  const oldRevenue =
    taxableImports * input.oldTemporaryTariffRate;
  const newRevenue =
    taxableImports * incremental.quantityRatio * weightedNewTariffRate;

  const countryRateDifference = input.highRate - input.lowRate;
  const highRateCountryRelativeVolumeDecline =
    1 -
    Math.pow(
      1 + countryRateDifference * input.tariffPassThrough,
      -input.crossCountryElasticity,
    );

  const sensitivity = [0.65, 0.78, 0.90].flatMap(
    (taxableProductShare) =>
      [0.30, 0.40, 0.60].map((highRateCountryImportShare) => {
        const averageRate =
          input.lowRate +
          (input.highRate - input.lowRate) *
            highRateCountryImportShare;
        const delta = averageRate - input.oldTemporaryTariffRate;
        const quantityRatio = Math.pow(
          1 + delta * input.tariffPassThrough,
          -input.importDemandElasticity,
        );
        const base = input.coveredImportsBillion * taxableProductShare;
        return {
          taxableProductShare,
          highRateCountryImportShare,
          incrementalConsumerPriceLevelIncrease:
            delta *
            taxableProductShare *
            input.tariffPassThrough *
            input.finalConsumptionImportExposure *
            input.inputOutputAmplification,
          additionalAnnualTariffRevenueBillion:
            base * quantityRatio * averageRate -
            base * input.oldTemporaryTariffRate,
        };
      }),
  );

  const result: ForcedLaborTariffResult = {
    case: input,
    weightedNewTariffRate,
    naiveFromZero: {
      deliveredImportPriceIncrease: gross.deliveredImportPriceIncrease,
      consumerPriceLevelIncrease: gross.consumerPriceLevelIncrease,
      affectedImportQuantityDecline: gross.affectedImportQuantityDecline,
      annualTariffRevenueBillion: grossRevenue,
    },
    incrementalFromExpiringTariff: {
      tariffRateIncrease: incrementalRate,
      deliveredImportPriceIncrease:
        incremental.deliveredImportPriceIncrease,
      consumerPriceLevelIncrease:
        incremental.consumerPriceLevelIncrease,
      firstQuarterConsumerPriceLevelIncrease:
        incremental.consumerPriceLevelIncrease *
        input.firstQuarterTransmissionShare,
      affectedImportQuantityDecline:
        incremental.affectedImportQuantityDecline,
      additionalAnnualTariffRevenueBillion: newRevenue - oldRevenue,
    },
    forcedLaborMechanism: {
      highRateCountryRelativeVolumeDecline,
      // A uniform country tariff does not make a forced-labor product more
      // expensive than a compliant product from the same country.
      withinCountryForcedLaborRelativePriceChange: 0,
      representativeAnnualSavingsFromComplianceMillion:
        input.representativeExporterBillion *
        input.taxableProductShare *
        countryRateDifference *
        1_000,
      countriesChangingLawDuringInvestigation: 6,
    },
    sensitivity,
  };
  assertFiniteDeep(result, 'forced-labor tariff result');
  return result;
}

export interface OilBufferCase {
  prewarOilPricePerBarrel: number;
  currentOilPricePerBarrel: number;
  prewarWorldSupplyPerDay: number;
  currentWorldOutputLossPerDay: number;
  shortRunDemandElasticity: number;
  observedJuneGulfExportPerDay: number;
  prewarGulfExportPerDay: number;
  chinaPrewarSeaborneImportsPerDay: number;
  chinaMaySeaborneImportsPerDay: number;
  chinaJuneCrudeStockDrawMillionBarrels: number;
  usCommercialCrudeStocksMillionBarrels: number;
  usCommercialStockOperationalFloorMillionBarrels: number;
  usSprStocksMillionBarrels: number;
  usRecentSprDrawMillionBarrelsPerWeek: number;
  globalRefineryRunShortfallPerDay: number;
  globalProductDemandPerDay: number;
  productDemandElasticity: number;
}

export interface OilBufferResult {
  case: OilBufferCase;
  naiveNoBuffer: {
    supplyLossShare: number;
    priceMultiple: number;
    pricePerBarrel: number;
  };
  stockFlowRevision: {
    juneThroughput: number;
    impliedCurrentThroughput: number;
    modeledCurrentPricePerBarrel: number;
    currentInventoryDrawPerDay: number;
    accessibleGlobalInventoryRemainingMillionBarrels: number;
    run: HormuzSimulationResult;
  };
  throughputSensitivity: readonly {
    shortRunDemandElasticity: number;
    impliedCurrentThroughput: number;
  }[];
  chinaBuffer: {
    importReductionPerDay: number;
    observedStockDrawPerDay: number;
    stockDrawShareOfImportReduction: number;
    residualDemandRunCutOrReroutingPerDay: number;
  };
  usRefineryRunway: readonly {
    lostNetCrudeSupplyPerDay: number;
    sprDrawPerDay: number;
    remainingDailyGap: number;
    commercialBufferDays: number | null;
  }[];
  usOperationalFloorSensitivity: readonly {
    operationalFloorMillionBarrels: number;
    lostNetCrudeSupplyPerDay: number;
    commercialBufferDays: number;
  }[];
  productBottleneck: {
    refineryRunShortfallShare: number;
    productScarcityPriceMultiple: number;
  };
}

export const oilBufferCase: OilBufferCase = {
  prewarOilPricePerBarrel: 70,
  currentOilPricePerBarrel: 100,
  prewarWorldSupplyPerDay: 104,
  currentWorldOutputLossPerDay: 9.4,
  shortRunDemandElasticity: 0.20,
  observedJuneGulfExportPerDay: 16.1,
  prewarGulfExportPerDay: 24,
  chinaPrewarSeaborneImportsPerDay: 11,
  chinaMaySeaborneImportsPerDay: 6.7,
  chinaJuneCrudeStockDrawMillionBarrels: 41,
  usCommercialCrudeStocksMillionBarrels: 411.7,
  usCommercialStockOperationalFloorMillionBarrels: 350,
  usSprStocksMillionBarrels: 311,
  usRecentSprDrawMillionBarrelsPerWeek: 5.1,
  globalRefineryRunShortfallPerDay: 6,
  globalProductDemandPerDay: 100,
  productDemandElasticity: 0.40,
};

const currentHormuzScenario = (
  juneThroughput: number,
  julyThroughput: number,
): HormuzScenario => ({
  id: 'july-25-2026-assimilation',
  label: 'Observed recovery followed by renewed July disruption',
  description:
    'March-May closure, observed June Gulf export recovery, and a July throughput value inferred from the current oil price.',
  startYear: 2026,
  startMonth: 1,
  throughputPath: [1, 1, 0.10, 0.08, 0.08, juneThroughput, julyThroughput],
});

function assimilateCurrentOilPrice(
  input: OilBufferCase,
  params: HormuzModelParams,
  juneThroughput: number,
): {
  throughput: number;
  run: HormuzSimulationResult;
} {
  const targetPriceMultiple =
    input.currentOilPricePerBarrel /
    input.prewarOilPricePerBarrel;
  let best:
    | {
        throughput: number;
        distance: number;
        run: HormuzSimulationResult;
      }
    | undefined;
  for (let step = 0; step <= 1_000; step++) {
    const throughput = step / 1_000;
    const run = simulateHormuzDisruption(
      currentHormuzScenario(juneThroughput, throughput),
      params,
    );
    const modeledPriceMultiple =
      run.months.at(-1)?.oil.priceMultiple ?? 1;
    const distance = Math.abs(modeledPriceMultiple - targetPriceMultiple);
    if (!best || distance < best.distance) {
      best = { throughput, distance, run };
    }
  }
  if (!best) throw new Error('Unable to assimilate current oil price');
  return best;
}

/**
 * Reconciles the current oil price with the registered Hormuz stock-flow
 * model, then keeps crude stocks, refinery throughput, and China's opaque
 * stock draw as separate accounting layers.
 */
export function evaluateOilBuffers(
  input: OilBufferCase = oilBufferCase,
  params: HormuzModelParams = hormuzDefaults,
): OilBufferResult {
  assertFiniteDeep({ input, params }, 'oil-buffer case');
  const supplyLossShare =
    input.currentWorldOutputLossPerDay /
    input.prewarWorldSupplyPerDay;
  const naivePriceMultiple = Math.pow(
    1 / (1 - supplyLossShare),
    1 / input.shortRunDemandElasticity,
  );

  const juneThroughput =
    input.observedJuneGulfExportPerDay /
    input.prewarGulfExportPerDay;
  const best = assimilateCurrentOilPrice(input, params, juneThroughput);
  const currentMonth = best.run.months.at(-1);
  if (!currentMonth) throw new Error('Oil-buffer run returned no months');
  const throughputSensitivity = [0.15, 0.20, 0.25, 0.30].map(
    (shortRunDemandElasticity) => {
      const sensitivityParams: HormuzModelParams = {
        ...params,
        oil: {
          ...params.oil,
          demandElasticity: shortRunDemandElasticity,
        },
      };
      return {
        shortRunDemandElasticity,
        impliedCurrentThroughput: assimilateCurrentOilPrice(
          input,
          sensitivityParams,
          juneThroughput,
        ).throughput,
      };
    },
  );

  const importReductionPerDay =
    input.chinaPrewarSeaborneImportsPerDay -
    input.chinaMaySeaborneImportsPerDay;
  const observedStockDrawPerDay =
    input.chinaJuneCrudeStockDrawMillionBarrels / DAYS_PER_MONTH;

  const usableCommercialStocks = Math.max(
    0,
    input.usCommercialCrudeStocksMillionBarrels -
      input.usCommercialStockOperationalFloorMillionBarrels,
  );
  const maximumSprDrawPerDay =
    input.usRecentSprDrawMillionBarrelsPerWeek / 7;
  const usRefineryRunway = [0.5, 1.5, 3].map(
    (lostNetCrudeSupplyPerDay) => {
      const sprDrawPerDay = Math.min(
        lostNetCrudeSupplyPerDay,
        maximumSprDrawPerDay,
      );
      const remainingDailyGap = Math.max(
        0,
        lostNetCrudeSupplyPerDay - sprDrawPerDay,
      );
      return {
        lostNetCrudeSupplyPerDay,
        sprDrawPerDay,
        remainingDailyGap,
        commercialBufferDays:
          remainingDailyGap > 0
            ? usableCommercialStocks / remainingDailyGap
            : null,
      };
    },
  );
  const usOperationalFloorSensitivity = [350, 375, 390].flatMap(
    (operationalFloorMillionBarrels) =>
      [1.5, 3].map((lostNetCrudeSupplyPerDay) => {
        const remainingDailyGap = Math.max(
          0,
          lostNetCrudeSupplyPerDay - maximumSprDrawPerDay,
        );
        return {
          operationalFloorMillionBarrels,
          lostNetCrudeSupplyPerDay,
          commercialBufferDays:
            Math.max(
              0,
              input.usCommercialCrudeStocksMillionBarrels -
                operationalFloorMillionBarrels,
            ) / remainingDailyGap,
        };
      }),
  );

  const refineryRunShortfallShare =
    input.globalRefineryRunShortfallPerDay /
    input.globalProductDemandPerDay;
  const productScarcityPriceMultiple = Math.pow(
    1 / (1 - refineryRunShortfallShare),
    1 / input.productDemandElasticity,
  );

  const result: OilBufferResult = {
    case: input,
    naiveNoBuffer: {
      supplyLossShare,
      priceMultiple: naivePriceMultiple,
      pricePerBarrel:
        input.prewarOilPricePerBarrel * naivePriceMultiple,
    },
    stockFlowRevision: {
      juneThroughput,
      impliedCurrentThroughput: best.throughput,
      modeledCurrentPricePerBarrel:
        input.prewarOilPricePerBarrel *
        (currentMonth.oil.priceMultiple ?? 1),
      currentInventoryDrawPerDay: currentMonth.oil.inventoryDrawPerDay,
      accessibleGlobalInventoryRemainingMillionBarrels:
        currentMonth.oil.inventoryRemaining,
      run: best.run,
    },
    throughputSensitivity,
    chinaBuffer: {
      importReductionPerDay,
      observedStockDrawPerDay,
      stockDrawShareOfImportReduction:
        observedStockDrawPerDay / importReductionPerDay,
      residualDemandRunCutOrReroutingPerDay: Math.max(
        0,
        importReductionPerDay - observedStockDrawPerDay,
      ),
    },
    usRefineryRunway,
    usOperationalFloorSensitivity,
    productBottleneck: {
      refineryRunShortfallShare,
      productScarcityPriceMultiple,
    },
  };
  assertFiniteDeep(result, 'oil-buffer result');
  return result;
}

export const july25HeadlineEvidence = {
  alphabet: {
    current:
      'https://abc.xyz/investor/events/event-details/2026/2026-Q2-Earnings-Call-2026-GgTAq7Is0z/default.aspx',
    q4_2024:
      'https://abc.xyz/investor/events/event-details/2025/2024-Q4-Earnings-Call/default.aspx',
    q4_2025:
      'https://abc.xyz/investor/events/event-details/2026/2025-Q4-Earnings-Call-2026-Dr_C033hS6/default.aspx',
    annual2024:
      'https://abc.xyz/assets/99/21/46cafdba41089a12a2d86ea47d44/goog026-annualreport2024-web.pdf',
  },
  tariffs: {
    action:
      'https://ustr.gov/about/policy-offices/press-office/press-releases/2026/july/ustr-takes-action-forced-labor-section-301-investigations',
    notice:
      'https://ustr.gov/sites/default/files/files/Press/Releases/2026/FLIP%20301%20Investigation%20Final%20Action%20FRN%207-23-26%20FINAL.pdf',
    reporting:
      'https://apnews.com/article/tariffs-forced-labor-trump-supreme-court-160b5c76b005a5d703cdcc4644f7cdc9',
  },
  oil: {
    iea:
      'https://www.iea.org/reports/oil-market-report-july-2026',
    eia:
      'https://www.eia.gov/petroleum/supply/weekly/',
    china:
      'https://www.semafor.com/article/06/09/2026/china-is-keeping-oil-markets-balanced',
  },
} as const;

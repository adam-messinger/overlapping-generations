import type { Region } from '../../domain-types.js';

export type HormuzScenarioId =
  | 'observed-2026-to-date'
  | 'short-disruption'
  | 'partial-reopening'
  | 'prolonged-closure';

export interface HormuzScenario {
  id: string;
  label: string;
  description: string;
  startYear: number;
  startMonth: number;
  /** Fraction of normal Hormuz traffic physically able to pass each month. */
  throughputPath: readonly number[];
  /** Fraction of the 4.7 mb/d oil bypass capacity operational each month. */
  bypassAvailabilityPath?: readonly number[];
}

export interface TradedCommodityParams {
  /** World demand in the commodity's native daily unit. */
  globalDemandPerDay: number;
  /** Baseline daily flow through Hormuz in the same unit. */
  hormuzFlowPerDay: number;
  /** Maximum non-Hormuz supply response in daily units. */
  alternativeSupplyMaxPerDay: number;
  alternativeSupplyRampMonths: number;
  /** Stocks that can actually be mobilized, expressed as days of world demand. */
  accessibleInventoryDays: number;
  maxInventoryDrawPerDay: number;
  /** Absolute short-run demand elasticity used to clear the market. */
  demandElasticity: number;
  /** Elasticity after conservation, fuel switching, and production adjustment. */
  mediumRunDemandElasticity: number;
  demandElasticityRampMonths: number;
  /** Closure/insurance premium applied in addition to physical scarcity. */
  routeRiskPremium: number;
  maxPriceMultiple: number;
}

export interface OilMarketParams extends TradedCommodityParams {
  crudeHormuzFlowPerDay: number;
  bypassCapacityPerDay: number;
  bypassRampMonths: number;
  /** Initially empty export-side tank space; once full, stranded crude is shut in. */
  exporterSpareStorageMillionBarrels: number;
  exporterStorageDrainMaxPerDay: number;
}

export interface FertilizerMarketParams {
  /** Share of globally traded fertilizer shipments normally crossing Hormuz. */
  hormuzTradeShare: number;
  /** Traded-market application as a share of total world fertilizer use. */
  tradedSupplyShareOfGlobalUse: number;
  alternativeSupplyMaxShare: number;
  alternativeSupplyRampMonths: number;
  accessibleInventoryMonths: number;
  maxInventoryDrawSharePerMonth: number;
  demandElasticity: number;
  gasPricePassThrough: number;
  maxPriceMultiple: number;
  /** Short-run share of crop yield exposed to fertilizer application. */
  fertilizerYieldContribution: number;
  /** Within-year buffering from timing, soil nutrients, and crop switching. */
  harvestPassThrough: number;
}

export interface HormuzRegionExposure {
  /** Share of the region's oil use normally supplied through Hormuz. */
  hormuzOilShareOfUse: number;
  /** LNG share of total regional gas consumption. */
  lngShareOfGasUse: number;
  /** Hormuz share of that region's LNG supply. */
  hormuzShareOfLng: number;
  /** Above one means thinner inventories and less rerouting capacity. */
  physicalVulnerability: number;
  /** Regional share of world oil consumption; all regions sum to one. */
  oilConsumptionWeight: number;
  /** Regional share of world gas consumption; all regions sum to one. */
  gasConsumptionWeight: number;
  /** GDP response to a 100% oil-price increase from net exports/imports. */
  oilTermsOfTradeSensitivity: number;
  /** GDP share exposed to Gulf export shut-ins (non-zero only for MENA). */
  gulfShutInGdpSensitivity: number;
}

export interface HormuzModelParams {
  oil: OilMarketParams;
  lng: TradedCommodityParams;
  fertilizer: FertilizerMarketParams;
  regions: Readonly<Record<Region, HormuzRegionExposure>>;
  /** Converts LNG spot-market prices into a broad regional gas-price shock. */
  globalLngPricePassThrough: number;
  regionalScarcityPricePremium: number;
}

/**
 * Frozen public anchors, retrieved July 2026.
 *
 * EIA World Oil Transit Chokepoints (1H25): 20.9 mb/d oil, including
 * 14.7 mb/d crude/condensate and 6.1 mb/d products; 11.4 Bcf/d LNG; Saudi
 * and UAE pipelines can bypass about 4.7 mb/d.
 * https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/
 *
 * IMF (2026-03-30): about one-third of fertilizer shipments cross Hormuz.
 * https://www.imf.org/en/Blogs/Articles/2026/03/30/how-the-war-in-the-middle-east-is-affecting-energy-trade-and-finance
 *
 * Parameters not supplied by those sources (mobilizable stocks, elasticities,
 * regional exposure splits, storage space, and pass-through) are deliberately
 * labeled model judgments and are tested as sensitivities, not observations.
 */
export const hormuzDefaults: HormuzModelParams = {
  oil: {
    globalDemandPerDay: 104,
    hormuzFlowPerDay: 20.9,
    crudeHormuzFlowPerDay: 14.7,
    bypassCapacityPerDay: 4.7,
    bypassRampMonths: 1,
    alternativeSupplyMaxPerDay: 1.5,
    alternativeSupplyRampMonths: 6,
    accessibleInventoryDays: 14,
    maxInventoryDrawPerDay: 4,
    demandElasticity: 0.20,
    mediumRunDemandElasticity: 0.35,
    demandElasticityRampMonths: 3,
    routeRiskPremium: 0.04,
    maxPriceMultiple: 4,
    exporterSpareStorageMillionBarrels: 75,
    exporterStorageDrainMaxPerDay: 2,
  },
  lng: {
    // 11.4 Bcf/d was roughly one-fifth of seaborne LNG, implying ~57 Bcf/d.
    globalDemandPerDay: 57,
    hormuzFlowPerDay: 11.4,
    alternativeSupplyMaxPerDay: 1.0,
    alternativeSupplyRampMonths: 8,
    accessibleInventoryDays: 4,
    maxInventoryDrawPerDay: 1.5,
    demandElasticity: 0.25,
    mediumRunDemandElasticity: 0.40,
    demandElasticityRampMonths: 4,
    routeRiskPremium: 0.07,
    maxPriceMultiple: 5,
  },
  fertilizer: {
    hormuzTradeShare: 0.33,
    // Judgment: prices clear in the traded market, but domestic/non-traded
    // supply buffers the crop-yield effect. This is not a sourced trade ratio.
    tradedSupplyShareOfGlobalUse: 0.50,
    alternativeSupplyMaxShare: 0.05,
    alternativeSupplyRampMonths: 8,
    accessibleInventoryMonths: 0.15,
    maxInventoryDrawSharePerMonth: 0.08,
    demandElasticity: 0.60,
    gasPricePassThrough: 0.10,
    maxPriceMultiple: 3,
    fertilizerYieldContribution: 0.35,
    harvestPassThrough: 0.50,
  },
  // Regional splits are transparent model judgments. Weighted oil exposure is
  // 19.6% of world use, close to EIA's 20% global anchor. Gas exposure is much
  // smaller because LNG is only part of total gas use.
  regions: {
    oecd: {
      hormuzOilShareOfUse: 0.12,
      lngShareOfGasUse: 0.18,
      hormuzShareOfLng: 0.15,
      physicalVulnerability: 0.75,
      oilConsumptionWeight: 0.38,
      gasConsumptionWeight: 0.38,
      oilTermsOfTradeSensitivity: -0.010,
      gulfShutInGdpSensitivity: 0,
    },
    china: {
      hormuzOilShareOfUse: 0.42,
      lngShareOfGasUse: 0.10,
      hormuzShareOfLng: 0.35,
      physicalVulnerability: 0.85,
      oilConsumptionWeight: 0.18,
      gasConsumptionWeight: 0.12,
      oilTermsOfTradeSensitivity: -0.012,
      gulfShutInGdpSensitivity: 0,
    },
    india: {
      hormuzOilShareOfUse: 0.48,
      lngShareOfGasUse: 0.25,
      hormuzShareOfLng: 0.55,
      physicalVulnerability: 1.10,
      oilConsumptionWeight: 0.06,
      gasConsumptionWeight: 0.03,
      oilTermsOfTradeSensitivity: -0.018,
      gulfShutInGdpSensitivity: 0,
    },
    latam: {
      hormuzOilShareOfUse: 0.02,
      lngShareOfGasUse: 0.10,
      hormuzShareOfLng: 0.05,
      physicalVulnerability: 0.65,
      oilConsumptionWeight: 0.08,
      gasConsumptionWeight: 0.08,
      oilTermsOfTradeSensitivity: 0.006,
      gulfShutInGdpSensitivity: 0,
    },
    seasia: {
      hormuzOilShareOfUse: 0.35,
      lngShareOfGasUse: 0.20,
      hormuzShareOfLng: 0.40,
      physicalVulnerability: 1.05,
      oilConsumptionWeight: 0.08,
      gasConsumptionWeight: 0.06,
      oilTermsOfTradeSensitivity: -0.014,
      gulfShutInGdpSensitivity: 0,
    },
    russia: {
      hormuzOilShareOfUse: 0,
      lngShareOfGasUse: 0,
      hormuzShareOfLng: 0,
      physicalVulnerability: 0.25,
      oilConsumptionWeight: 0.04,
      gasConsumptionWeight: 0.17,
      oilTermsOfTradeSensitivity: 0.030,
      gulfShutInGdpSensitivity: 0,
    },
    mena: {
      hormuzOilShareOfUse: 0.03,
      lngShareOfGasUse: 0.05,
      hormuzShareOfLng: 0.05,
      physicalVulnerability: 0.40,
      oilConsumptionWeight: 0.09,
      gasConsumptionWeight: 0.12,
      oilTermsOfTradeSensitivity: 0.015,
      gulfShutInGdpSensitivity: 0.18,
    },
    ssa: {
      hormuzOilShareOfUse: 0.15,
      lngShareOfGasUse: 0.05,
      hormuzShareOfLng: 0.15,
      physicalVulnerability: 1.20,
      oilConsumptionWeight: 0.09,
      gasConsumptionWeight: 0.04,
      oilTermsOfTradeSensitivity: -0.015,
      gulfShutInGdpSensitivity: 0,
    },
  },
  globalLngPricePassThrough: 0.45,
  regionalScarcityPricePremium: 1.5,
};

const closureToDate = [1, 1, 0.10, 0.08, 0.08, 0.08, 0.08] as const;

export const hormuzScenarios: Readonly<Record<HormuzScenarioId, HormuzScenario>> = {
  'observed-2026-to-date': {
    id: 'observed-2026-to-date',
    label: 'Observed 2026 through July',
    description:
      'January-February normal, then an effectively closed route. The March value also reproduces EIA quarter-average traffic; monthly values are reconstructed assumptions, not reported observations.',
    startYear: 2026,
    startMonth: 1,
    throughputPath: closureToDate,
  },
  'short-disruption': {
    id: 'short-disruption',
    label: 'Short disruption and rapid repair',
    description: 'A severe two-month closure followed by rapid normalization within five months.',
    startYear: 2026,
    startMonth: 1,
    throughputPath: [1, 1, 0.10, 0.15, 0.50, 0.85, 1, 1, 1, 1, 1, 1],
  },
  'partial-reopening': {
    id: 'partial-reopening',
    label: 'Observed closure, gradual partial reopening',
    description: 'Observed-to-date path followed by a staged reopening through year end.',
    startYear: 2026,
    startMonth: 1,
    throughputPath: [...closureToDate, 0.20, 0.40, 0.65, 0.85, 1, 1, 1, 1, 1, 1, 1],
  },
  'prolonged-closure': {
    id: 'prolonged-closure',
    label: 'Prolonged closure and slow repair',
    description: 'Near-closure through early 2027, followed by a slow five-month restoration.',
    startYear: 2026,
    startMonth: 1,
    throughputPath: [
      1, 1,
      0.10, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08,
      0.08, 0.08, 0.20, 0.40, 0.60, 0.80,
      1, 1, 1, 1, 1, 1,
    ],
  },
};

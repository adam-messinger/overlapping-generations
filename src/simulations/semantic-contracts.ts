/**
 * Shared estimand contracts for the first strict semantic migrations.
 *
 * These describe the phenomenon represented by a number. Dataset fields,
 * releases, revisions, and retrieval times belong in MeasurementBinding and
 * DataSnapshot records instead.
 */
import {
  defineEstimand,
  defineSemanticCrosswalk,
  type EstimandContract,
  type SemanticCrosswalk,
} from 'tsimulation';

type EstimandSpec = Omit<
  EstimandContract,
  'schemaVersion' | 'id' | 'version'
>;

function estimand(id: string, spec: EstimandSpec): EstimandContract {
  return defineEstimand({
    schemaVersion: 'tsimulation.estimand/v1',
    id,
    version: '1.0.0',
    ...spec,
  });
}

const us = {
  id: 'geo.us',
  label: 'United States',
  boundaryVersion: 'current-national-boundary',
} as const;

const world = {
  id: 'geo.world',
  label: 'World',
  boundaryVersion: 'global-model-boundary-v1',
} as const;

const usDataCenters = {
  id: 'population.us.data-centers',
  label: 'U.S. data-center facilities',
  universe: 'Full-site electricity demand and supporting infrastructure for data-center facilities in the United States.',
  inclusion: ['IT load', 'cooling', 'power conversion', 'other facility overhead'],
  exclusion: ['ordinary commercial buildings', 'telecommunications networks outside data-center sites'],
} as const;

const usNonDataCenterRetailCustomers = {
  id: 'population.us.non-data-center-retail-electricity-customers',
  label: 'U.S. retail electricity customers other than data centers',
  universe: 'Retail electricity sales and bills excluding modeled data-center load.',
  exclusion: ['modeled data-center electricity consumption'],
} as const;

const calendarYearMean = {
  kind: 'interval',
  interval: 'calendar-year',
  aggregation: 'mean',
  calendar: 'gregorian',
} as const;

const calendarYearSum = {
  kind: 'interval',
  interval: 'calendar-year',
  aggregation: 'sum',
  calendar: 'gregorian',
} as const;

const pointInTime = {
  kind: 'instant',
  calendar: 'gregorian',
} as const;

const realUsd2026 = {
  priceBasis: 'real',
  currency: 'USD',
  priceYear: 2026,
  exchangeRateBasis: 'market',
} as const;

function dataCenterContract(
  id: string,
  quantityKind: string,
  measure: EstimandContract['measure'],
  options: Partial<Pick<
    EstimandContract,
    'population' | 'geography' | 'ratio' | 'time' | 'valuation' | 'signConvention' | 'description'
  >> = {},
): EstimandContract {
  return estimand(`estimand.data-center.${id}`, {
    quantityKind,
    measure,
    population: usDataCenters,
    geography: us,
    ...options,
  });
}

/** 2035 U.S. large-load scenario inputs and derived results. */
export const dataCenterEstimands = {
  totalPowerCapacityGw: dataCenterContract(
    'total-power-capacity',
    'electricity.maximum-data-center-grid-demand-capacity',
    { kind: 'stock', totality: 'total', accounting: 'gross' },
    {
      time: pointInTime,
      description: 'Total full-site U.S. data-center power-demand capacity at a stated date.',
    },
  ),
  totalAnnualElectricityTwh: dataCenterContract(
    'total-annual-electricity',
    'electricity.full-site-consumption',
    { kind: 'flow', totality: 'total', accounting: 'gross' },
    { time: calendarYearSum },
  ),
  incrementalContractedLoadGw: dataCenterContract(
    'incremental-contracted-load',
    'electricity.maximum-contracted-demand',
    { kind: 'level', totality: 'incremental', accounting: 'gross' },
    {
      time: pointInTime,
      description: 'Incremental full-site data-center maximum demand contracted between the scenario base and 2035.',
    },
  ),
  loadFactor: dataCenterContract(
    'load-factor',
    'electricity.load-factor',
    { kind: 'share' },
    {
      ratio: {
        numerator: 'annual-average-full-site-electric-load',
        denominator: 'realized-maximum-contracted-full-site-load',
      },
      time: calendarYearMean,
    },
  ),
  peakCoincidenceFactor: dataCenterContract(
    'peak-coincidence-factor',
    'electricity.system-peak-coincidence-factor',
    { kind: 'share' },
    {
      ratio: {
        numerator: 'data-center-load-coincident-with-grid-system-peak',
        denominator: 'realized-maximum-contracted-data-center-load',
      },
      time: calendarYearMean,
    },
  ),
  flexibleLoadShare: dataCenterContract(
    'flexible-peak-load-share',
    'electricity.scarcity-curtailable-load-share',
    { kind: 'share' },
    {
      ratio: {
        numerator: 'curtailable-data-center-load-at-system-peak',
        denominator: 'data-center-load-coincident-with-system-peak',
      },
      time: calendarYearMean,
    },
  ),
  dedicatedGenerationShare: dataCenterContract(
    'dedicated-generation-share',
    'electricity.dedicated-additional-supply-share',
    { kind: 'share' },
    {
      ratio: {
        numerator: 'annual-data-center-electricity-from-additive-dedicated-generation',
        denominator: 'annual-total-data-center-electricity',
      },
      time: calendarYearSum,
    },
  ),
  dedicatedCapacityCredit: dataCenterContract(
    'dedicated-capacity-credit',
    'electricity.firm-capacity-credit',
    { kind: 'share' },
    {
      ratio: {
        numerator: 'accredited-firm-capacity',
        denominator: 'dedicated-nameplate-generation-capacity',
      },
      time: pointInTime,
    },
  ),
  sharedFirmBuildGw: dataCenterContract(
    'shared-firm-capacity-built-input',
    'electricity.shared-firm-generation-capacity-built',
    { kind: 'stock', totality: 'incremental', accounting: 'gross' },
    { time: pointInTime },
  ),
  generationCostResponsibility: dataCenterContract(
    'generation-cost-responsibility',
    'finance.developer-generation-capex-responsibility',
    { kind: 'share' },
    {
      ratio: {
        numerator: 'shared-generation-capex-assigned-to-data-center-developer',
        denominator: 'total-shared-generation-capex-for-incremental-load',
      },
      valuation: realUsd2026,
    },
  ),
  networkCostResponsibility: dataCenterContract(
    'network-cost-responsibility',
    'finance.developer-network-capex-responsibility',
    { kind: 'share' },
    {
      ratio: {
        numerator: 'network-upgrade-capex-assigned-to-data-center-developer',
        denominator: 'total-network-upgrade-capex-for-incremental-load',
      },
      valuation: realUsd2026,
    },
  ),
  takeOrPayCoverage: dataCenterContract(
    'take-or-pay-coverage',
    'finance.take-or-pay-capex-coverage',
    { kind: 'share' },
    {
      ratio: {
        numerator: 'developer-assigned-utility-capex-protected-by-take-or-pay',
        denominator: 'developer-assigned-utility-capex',
      },
      valuation: realUsd2026,
    },
  ),
  expectedLoadRealization: dataCenterContract(
    'expected-load-realization',
    'electricity.contracted-load-realization',
    { kind: 'share' },
    {
      ratio: {
        numerator: 'expected-realized-maximum-contracted-load',
        denominator: 'announced-maximum-contracted-load',
      },
      time: pointInTime,
    },
  ),
  generationCapexPerKw: dataCenterContract(
    'generation-capex-per-capacity',
    'finance.generation-capital-cost-per-nameplate-capacity',
    { kind: 'rate', totality: 'incremental', accounting: 'gross' },
    {
      ratio: {
        numerator: 'overnight-generation-capital-cost',
        denominator: 'generation-nameplate-capacity',
      },
      valuation: realUsd2026,
    },
  ),
  networkCapexPerKw: dataCenterContract(
    'network-capex-per-load-capacity',
    'finance.network-capital-cost-per-contracted-load',
    { kind: 'rate', totality: 'incremental', accounting: 'gross' },
    {
      ratio: {
        numerator: 'network-upgrade-capital-cost',
        denominator: 'incremental-maximum-contracted-load',
      },
      valuation: realUsd2026,
    },
  ),
  fixedChargeRate: dataCenterContract(
    'fixed-charge-rate',
    'finance.annual-fixed-charge-rate',
    { kind: 'rate' },
    {
      ratio: {
        numerator: 'annual-revenue-requirement',
        denominator: 'installed-capital-cost',
      },
      time: calendarYearSum,
      valuation: realUsd2026,
    },
  ),
  nonDataCenterRetailSalesTwh: estimand('estimand.data-center.non-data-center-retail-sales', {
    quantityKind: 'electricity.retail-sales',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: usNonDataCenterRetailCustomers,
    geography: us,
    time: calendarYearSum,
  }),
  nonDataCenterRetailRatePerMwh: estimand('estimand.data-center.non-data-center-retail-rate', {
    quantityKind: 'finance.average-retail-electricity-rate',
    measure: { kind: 'rate' },
    population: usNonDataCenterRetailCustomers,
    geography: us,
    ratio: {
      numerator: 'annual-retail-electricity-revenue',
      denominator: 'annual-retail-electricity-sales',
    },
    time: calendarYearMean,
    valuation: realUsd2026,
  }),
  gridEmissionsKgPerMwh: dataCenterContract(
    'grid-operational-emissions-factor',
    'emissions.grid-operational-carbon-intensity',
    { kind: 'rate', accounting: 'gross' },
    {
      ratio: {
        numerator: 'grid-operational-carbon-dioxide-emissions',
        denominator: 'grid-electricity-delivered-to-data-centers',
      },
      time: calendarYearMean,
    },
  ),
  dedicatedEmissionsKgPerMwh: dataCenterContract(
    'dedicated-operational-emissions-factor',
    'emissions.dedicated-generation-operational-carbon-intensity',
    { kind: 'rate', accounting: 'gross' },
    {
      ratio: {
        numerator: 'dedicated-generation-operational-carbon-dioxide-emissions',
        denominator: 'dedicated-electricity-delivered-to-data-centers',
      },
      time: calendarYearMean,
    },
  ),
  hoursPerYear: estimand('estimand.calendar.hours-per-gregorian-year', {
    quantityKind: 'calendar.hours-per-year',
    measure: { kind: 'count' },
    time: calendarYearSum,
  }),
  realizedAverageLoadGw: dataCenterContract(
    'realized-average-load',
    'electricity.annual-average-full-site-load',
    { kind: 'level', totality: 'incremental', accounting: 'gross' },
    { time: calendarYearMean },
  ),
  annualElectricityTwh: dataCenterContract(
    'annual-electricity',
    'electricity.full-site-consumption',
    { kind: 'flow', totality: 'incremental', accounting: 'gross' },
    { time: calendarYearSum },
  ),
  coincidentPeakGw: dataCenterContract(
    'coincident-peak',
    'electricity.load-coincident-with-system-peak',
    { kind: 'level', totality: 'incremental', accounting: 'gross' },
    { time: pointInTime },
  ),
  flexiblePeakGw: dataCenterContract(
    'flexible-coincident-peak',
    'electricity.scarcity-curtailable-load-at-system-peak',
    { kind: 'level', totality: 'incremental', accounting: 'gross' },
    { time: pointInTime },
  ),
  dedicatedFirmCapacityGw: dataCenterContract(
    'dedicated-firm-capacity',
    'electricity.dedicated-accredited-firm-capacity',
    { kind: 'stock', totality: 'incremental', accounting: 'gross' },
    { time: pointInTime },
  ),
  sharedFirmCapacityRequiredGw: dataCenterContract(
    'shared-firm-capacity-required',
    'electricity.shared-firm-capacity-requirement',
    { kind: 'stock', totality: 'incremental', accounting: 'gross' },
    { time: pointInTime },
  ),
  sharedFirmCapacityBuiltGw: dataCenterContract(
    'shared-firm-capacity-built',
    'electricity.shared-firm-generation-capacity-built',
    { kind: 'stock', totality: 'incremental', accounting: 'gross' },
    { time: pointInTime },
  ),
  reliabilityGapGw: dataCenterContract(
    'firm-capacity-reliability-gap',
    'electricity.unserved-firm-capacity-requirement',
    { kind: 'stock', totality: 'incremental', accounting: 'net' },
    { time: pointInTime },
  ),
  dedicatedGenerationCapexBillion: dataCenterContract(
    'dedicated-generation-capex',
    'finance.dedicated-generation-capital-cost',
    { kind: 'stock', totality: 'incremental', accounting: 'gross' },
    { time: pointInTime, valuation: realUsd2026 },
  ),
  sharedGenerationCapexBillion: dataCenterContract(
    'shared-generation-capex',
    'finance.shared-generation-capital-cost',
    { kind: 'stock', totality: 'incremental', accounting: 'gross' },
    { time: pointInTime, valuation: realUsd2026 },
  ),
  networkCapexBillion: dataCenterContract(
    'network-capex',
    'finance.network-upgrade-capital-cost',
    { kind: 'stock', totality: 'incremental', accounting: 'gross' },
    { time: pointInTime, valuation: realUsd2026 },
  ),
  totalIncrementalCapexBillion: dataCenterContract(
    'total-incremental-capex',
    'finance.total-generation-and-network-capital-cost',
    { kind: 'stock', totality: 'incremental', accounting: 'gross' },
    { time: pointInTime, valuation: realUsd2026 },
  ),
  developerAssignedCapexBillion: dataCenterContract(
    'developer-assigned-capex',
    'finance.capital-cost-assigned-to-data-center-developers',
    { kind: 'stock', totality: 'incremental', accounting: 'net' },
    { time: pointInTime, valuation: realUsd2026 },
  ),
  ratepayerAssignedCapexBillion: dataCenterContract(
    'ratepayer-assigned-capex',
    'finance.capital-cost-assigned-to-non-data-center-ratepayers',
    { kind: 'stock', totality: 'incremental', accounting: 'net' },
    {
      population: usNonDataCenterRetailCustomers,
      time: pointInTime,
      valuation: realUsd2026,
    },
  ),
  strandedRiskShiftBillion: dataCenterContract(
    'stranded-risk-shift',
    'finance.expected-stranded-capital-cost-shift-to-ratepayers',
    { kind: 'stock', totality: 'incremental', accounting: 'net' },
    {
      population: usNonDataCenterRetailCustomers,
      time: pointInTime,
      valuation: realUsd2026,
    },
  ),
  annualRatepayerRevenueRequirementBillion: dataCenterContract(
    'annual-ratepayer-revenue-requirement',
    'finance.incremental-annual-ratepayer-revenue-requirement',
    { kind: 'flow', totality: 'incremental', accounting: 'net' },
    {
      population: usNonDataCenterRetailCustomers,
      time: calendarYearSum,
      valuation: realUsd2026,
    },
  ),
  nonDataCenterBillImpact: dataCenterContract(
    'non-data-center-bill-impact',
    'finance.non-data-center-retail-bill-increase',
    { kind: 'share', totality: 'incremental', accounting: 'net' },
    {
      population: usNonDataCenterRetailCustomers,
      ratio: {
        numerator: 'incremental-annual-ratepayer-revenue-requirement',
        denominator: 'baseline-annual-non-data-center-retail-revenue',
      },
      time: calendarYearSum,
    },
  ),
  dedicatedElectricityTwh: dataCenterContract(
    'dedicated-electricity',
    'electricity.full-site-consumption-from-additive-dedicated-generation',
    { kind: 'flow', totality: 'incremental', accounting: 'gross' },
    { time: calendarYearSum },
  ),
  gridElectricityTwh: dataCenterContract(
    'grid-electricity',
    'electricity.full-site-consumption-from-shared-grid-generation',
    { kind: 'flow', totality: 'incremental', accounting: 'gross' },
    { time: calendarYearSum },
  ),
  operationalEmissionsGtCo2: dataCenterContract(
    'operational-emissions',
    'emissions.data-center-electricity-operational-carbon-dioxide',
    { kind: 'flow', totality: 'incremental', accounting: 'gross' },
    { time: calendarYearSum },
  ),
} as const;

const usResidents = {
  id: 'population.us.residents',
  label: 'United States residents',
  universe: 'People resident in the United States.',
} as const;

/** Stable outbreak quantity; source vintage and revision policy are measurement metadata. */
export const usCovidWeeklyAdmissions = estimand(
  'estimand.outbreak.us-covid-weekly-hospital-admissions',
  {
    quantityKind: 'health.covid-19.hospital-admissions',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: usResidents,
    geography: us,
    time: {
      kind: 'interval',
      interval: 'epidemiological-week',
      aggregation: 'sum',
      calendar: 'cdc-reporting-week-ending-saturday',
    },
    description: 'New U.S. hospital admissions with laboratory-confirmed COVID-19 during the reporting week.',
  },
);

export const outbreakForecastEstimands = {
  values: usCovidWeeklyAdmissions,
  originIndex: estimand('estimand.outbreak.forecast-origin-index', {
    quantityKind: 'forecast.observation-series-origin-index',
    measure: { kind: 'index' },
    time: { kind: 'timeless' },
  }),
  targetIndex: estimand('estimand.outbreak.forecast-target-index', {
    quantityKind: 'forecast.observation-series-target-index',
    measure: { kind: 'index' },
    time: { kind: 'timeless' },
  }),
  horizon: estimand('estimand.outbreak.forecast-horizon', {
    quantityKind: 'forecast.horizon-duration',
    measure: { kind: 'level' },
    time: { kind: 'timeless' },
  }),
  admissionsLog: usCovidWeeklyAdmissions,
} as const;

const globalCommodityMarket = {
  id: 'population.global-traded-energy-market',
  label: 'Global traded oil and gas market',
  universe: 'Modeled global intended consumption in the traded oil or gas market.',
} as const;

const globalNonElectricEnergy = {
  id: 'population.global-non-electric-final-energy',
  label: 'Global non-electric final-energy demand',
  universe: 'Modeled global non-electric final-energy consumption across fuels.',
} as const;

function globalEnergyEstimand(
  id: string,
  quantityKind: string,
  population: EstimandContract['population'],
  ratio: EstimandContract['ratio'],
): EstimandContract {
  return estimand(`estimand.hormuz.${id}`, {
    quantityKind,
    measure: { kind: 'share', accounting: 'net' },
    population,
    geography: world,
    ratio,
    time: calendarYearMean,
  });
}

export const hormuzEstimands = {
  commodityThroughputShare: estimand('estimand.hormuz.commodity-throughput-share', {
    quantityKind: 'logistics.hormuz-commodity-volume-throughput-capacity-share',
    measure: { kind: 'share', accounting: 'gross' },
    population: {
      id: 'population.hormuz-oil-flow',
      label: 'Baseline modeled commodity cargo flow through the Strait of Hormuz',
      universe: 'Physical cargo-carrying throughput applied to oil, LNG, and fertilizer flows; not vessel count, cargo count, or all maritime traffic.',
    },
    geography: {
      id: 'geo.strait-of-hormuz',
      label: 'Strait of Hormuz',
      boundaryVersion: 'shipping-network-v1',
    },
    ratio: {
      numerator: 'scenario-commodity-volume-able-to-transit-strait',
      denominator: 'baseline-commodity-volume-transiting-strait',
    },
    time: {
      kind: 'interval',
      interval: 'simulation-month',
      aggregation: 'mean',
      calendar: 'simulation-step',
    },
  }),
  oilAvailability: globalEnergyEstimand(
    'global-oil-availability',
    'energy.oil-physical-availability',
    globalCommodityMarket,
    {
      numerator: 'modeled-oil-consumption-served',
      denominator: 'counterfactual-oil-consumption-demanded',
    },
  ),
  gasAvailability: globalEnergyEstimand(
    'global-gas-availability',
    'energy.gas-physical-availability',
    globalCommodityMarket,
    {
      numerator: 'modeled-gas-consumption-served',
      denominator: 'counterfactual-gas-consumption-demanded',
    },
  ),
  nonElectricAvailability: globalEnergyEstimand(
    'global-non-electric-availability',
    'energy.non-electric-final-energy-physical-availability',
    globalNonElectricEnergy,
    {
      numerator: 'modeled-non-electric-final-energy-served',
      denominator: 'counterfactual-non-electric-final-energy-demanded',
    },
  ),
  oilPriceMultiple: estimand('estimand.hormuz.global-oil-price-multiple', {
    quantityKind: 'price.global-oil-price-multiple',
    measure: { kind: 'index' },
    population: globalCommodityMarket,
    geography: world,
    ratio: {
      numerator: 'scenario-global-oil-price',
      denominator: 'counterfactual-global-oil-price',
    },
    time: calendarYearMean,
  }),
  gasPriceMultiple: estimand('estimand.hormuz.global-gas-price-multiple', {
    quantityKind: 'price.global-gas-price-multiple',
    measure: { kind: 'index' },
    population: globalCommodityMarket,
    geography: world,
    ratio: {
      numerator: 'scenario-global-gas-price',
      denominator: 'counterfactual-global-gas-price',
    },
    time: calendarYearMean,
  }),
} as const;

function crosswalk(
  id: string,
  source: EstimandContract,
  target: EstimandContract,
  description: string,
  method: string,
  assumptions: readonly string[],
): SemanticCrosswalk {
  return defineSemanticCrosswalk({
    schemaVersion: 'tsimulation.crosswalk/v1',
    id,
    version: '1.0.0',
    description,
    source,
    target,
    method,
    assumptions,
    uncertainty: {
      kind: 'qualitative',
      description: 'Composite result varies with the assumed oil and gas shares of non-electric final energy.',
    },
  });
}

export const hormuzCrosswalks = {
  oilToNonElectric: crosswalk(
    'crosswalk.hormuz.oil-availability-to-non-electric-energy',
    hormuzEstimands.oilAvailability,
    hormuzEstimands.nonElectricAvailability,
    'Convert the oil availability result into its contribution to a broader non-electric final-energy availability shock.',
    'Fixed-share weighted loss: oilShare * (1 - oilAvailability), combined with gas and unshocked fuels.',
    ['The near-term oil share is supplied explicitly in HormuzBridgeOptions.', 'Unmodeled non-electric fuels retain availability 1.0.'],
  ),
  gasToNonElectric: crosswalk(
    'crosswalk.hormuz.gas-availability-to-non-electric-energy',
    hormuzEstimands.gasAvailability,
    hormuzEstimands.nonElectricAvailability,
    'Convert the consumption-weighted regional gas availability result into its contribution to a broader non-electric final-energy availability shock.',
    'Fixed-share weighted loss: gasShare * (1 - gasAvailability), combined with oil and unshocked fuels.',
    ['The near-term gas share is supplied explicitly in HormuzBridgeOptions.', 'Regional gas availability is weighted by modeled gas consumption.'],
  ),
} as const;

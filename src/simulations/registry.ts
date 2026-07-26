import {
  ModelRegistry,
  defineModel,
  measurementPort,
  metadataPort,
  observationPort,
  opaquePort,
  unitPort,
  type EvidenceRecord,
  type ValidationClaim,
} from 'tsimulation';
import { outbreakForecastEstimands } from './semantic-contracts.js';
import {
  AI_CAPITAL_CYCLE_SCENARIO_PORT,
  AI_CAPITAL_QUARTERS_PORT,
  AI_CAPITAL_SNAPSHOT_PORT,
  ANNUAL_HORMUZ_ROWS_PORT,
  BOOLEAN_PORT,
  CONTAGION_OPTIONS_PORT,
  CONTAGION_POLICY_PORT,
  CORAL_SCENARIO_PORT,
  CORAL_YEAR_RESULTS_PORT,
  COUNTERMEASURE_PORT,
  DATA_CENTER_GRID_RESULT_PORT,
  DATA_CENTER_GRID_SCENARIO_PORT,
  DEFENSE_MONTHS_PORT,
  DEFENSE_PARAMS_PORT,
  DYNAMIC_NETWORK_OPTIONS_PORT,
  DYNAMIC_NETWORK_PORT,
  DRUG_MONTHS_PORT,
  DRUG_SCENARIO_PORT,
  ENERGY_INFLATION_MONTHS_PORT,
  ENERGY_INFLATION_SCENARIO_PORT,
  FUND_STRESS_ROWS_PORT,
  GENERIC_TARIFF_MONTHS_PORT,
  GENERIC_TARIFF_SCENARIO_PORT,
  HEAT_ADAPTATION_PORT,
  HEAT_EVENT_PORT,
  HEAT_FOOD_PORT,
  HEAT_MORTALITY_PORT,
  HEAT_POWER_PORT,
  HORMUZ_MONTHS_PORT,
  HORMUZ_PARAMS_PORT,
  HORMUZ_SCENARIO_PORT,
  HORMUZ_WEBER_INFLATION_RESULT_PORT,
  HORMUZ_WEBER_INFLATION_SCENARIO_PORT,
  LEVERAGED_FUNDS_PORT,
  MARITIME_ANNUAL_ROWS_PORT,
  MARITIME_MONTHS_PORT,
  MARITIME_PARAMS_PORT,
  MARITIME_SCENARIO_PORT,
  MARKET_STRESS_ROWS_PORT,
  MATERIAL_NODES_PORT,
  PARTIAL_DEFENSE_PARAMS_PORT,
  PARTIAL_MARITIME_PARAMS_PORT,
  PRICE_SHOCK_PORT,
  PROBABILISTIC_FORECAST_PORT,
  SOVEREIGN_MARKETS_PORT,
  SOVEREIGN_SCENARIO_PORT,
  TARIFF_ACTION_PORT,
  TARIFF_SECTORS_PORT,
  WAR_AI_YEARS_PORT,
} from './registry-port-schemas.js';
import type { HeatAdaptation, HeatEvent } from './heat/data.js';
import { heatEvidence } from './heat/data.js';
import { simulateHeatEvent, type HeatSimulationResult } from './heat/model.js';
import type { GenericDrugEconomicsScenario } from './drug-supply/data.js';
import { drugSupplyEvidence } from './drug-supply/data.js';
import { simulateGenericDrugEconomics, type GenericDrugEconomicsResult } from './drug-supply/model.js';
import {
  genericTariffEvidence,
  simulateGenericTariffTransition,
  type GenericTariffResult,
  type GenericTariffScenario,
} from './drug-supply/generic-tariff.js';
import type { BilateralTariffAction } from './trade/data.js';
import { tariffEvidence } from './trade/data.js';
import { simulateBilateralTariff, type BilateralTariffResult } from './trade/model.js';
import {
  tradeNetworkEvidence,
  type TradeNetworkTariffScenario,
} from './trade/network-data.js';
import {
  simulateTradeNetworkTariff,
  type TradeNetworkTariffResult,
} from './trade/network-model.js';
import {
  TRADE_NETWORK_RESULT_PORT,
  TRADE_NETWORK_SCENARIO_PORT,
} from './trade/network-ports.js';
import type {
  ContagionPolicy,
  LeveragedFundGroup,
  SovereignMarket,
  SovereignShockScenario,
} from './financial-contagion/data.js';
import { financialContagionEvidence } from './financial-contagion/data.js';
import {
  simulateFinancialContagion,
  type FinancialContagionResult,
} from './financial-contagion/model.js';
import type { MaritimeNetworkParams, MaritimeScenario } from './critical-materials/shipping-data.js';
import {
  simulateMaritimeNetwork,
  type MaritimeSimulationResult,
} from './critical-materials/shipping-network.js';
import type {
  DefensePolicyId,
  DefenseSourcingParams,
} from './critical-materials/defense-sourcing-data.js';
import {
  simulateDefenseSourcing,
  type DefenseSourcingResult,
} from './critical-materials/defense-sourcing.js';
import type { MaterialNode } from './critical-materials/data.js';
import {
  simulateDynamicNetwork,
  type DynamicNetworkOptions,
  type DynamicNetworkResult,
} from './critical-materials/dynamic-network.js';
import {
  simulatePriceShock,
  type PriceShockResult,
} from './critical-materials/price-network.js';
import type { HormuzModelParams, HormuzScenario } from './critical-materials/hormuz-data.js';
import {
  simulateHormuzDisruption,
  type HormuzSimulationResult,
} from './critical-materials/hormuz-model.js';
import type { OutbreakV2Params, OutbreakSeries } from './outbreak/model.js';
import { simulateOutbreakV2 } from './outbreak/model.js';
import {
  makeForecast,
  type ForecastHorizon,
  type ForecastModel,
  type ProbabilisticForecast,
} from './outbreak/probabilistic.js';
import {
  cdcFixedInitialAdmissionsMeasurement,
  cdcOperationalAdmissionsMeasurement,
} from './outbreak/measurement-contracts.js';
import {
  runWarAiExperiment,
  type WarAiExperiment,
  type WarAiExperimentOptions,
} from './news/war-ai.js';
import {
  dataCenterGridEvidence,
  simulateDataCenterGrid,
  type DataCenterGridResult,
  type DataCenterGridScenario,
} from './news/data-center-grid.js';
import {
  energyInflationEvidence,
  simulateEnergyInflationV2,
  type EnergyInflationResult,
  type EnergyInflationScenario,
} from './news/energy-inflation.js';
import {
  hormuzWeberEvidence,
  simulateHormuzWeberInflation,
  type HormuzWeberInflationResult,
  type HormuzWeberInflationScenario,
} from './news/hormuz-weber-inflation.js';
import {
  aiCapitalCycleEvidence,
  simulateAiCapitalCycleV2,
  type AiCapitalCycleResult,
  type AiCapitalCycleScenario,
} from './news/ai-capital-cycle.js';
import {
  simulateCoralBleachingV2,
  type CoralBleachingResult,
  type CoralBleachingScenario,
} from './news/coral-bleaching.js';
import { coralCurrentEvidence } from './news/coral-data.js';
import {
  bnef2035DataCenterCapacityMeasurement,
  bnefTotalToIncrementalLoadDerivation,
  lbnl2023DataCenterElectricityMeasurement,
} from './news/data-center-grid-measurements.js';
import {
  aviationEvidence,
  tafFacilityTrafficHistory,
  type AviationInfrastructureScenario,
} from './aviation-infrastructure/data.js';
import {
  simulateAviationInfrastructure,
  type AviationInfrastructureResult,
} from './aviation-infrastructure/model.js';
import {
  businessJetEndpointDerivation,
  faaDomesticBusinessJetOperations2025Measurement,
  faaInternationalBusinessJetOperations2025Measurement,
} from './aviation-infrastructure/measurement-contracts.js';
import {
  AVIATION_INFRASTRUCTURE_RESULT_PORT,
  AVIATION_INFRASTRUCTURE_SCENARIO_PORT,
} from './aviation-infrastructure/ports.js';
import {
  EBIKE_REGIONS,
  MOTOR_ARCHITECTURES,
  MOTOR_SUPPLIERS,
  ebikeMotorEvidence,
  regionalSalesHistory,
  supplierDisclosures,
  type EbikeMotorScenario,
} from './e-bike-motors/data.js';
import {
  simulateEbikeMotorMarket,
  type EbikeMotorResult,
} from './e-bike-motors/model.js';
import {
  EBIKE_MOTOR_RESULT_PORT,
  EBIKE_MOTOR_SCENARIO_PORT,
} from './e-bike-motors/ports.js';
import {
  ananda2024ComparableMeasurement,
  bafang2024DriveUnitMeasurement,
  bikeToDriveUnitDerivation,
  china2023ProductionMeasurement,
  eu2023SalesMeasurement,
  japan2022ShipmentMeasurement,
  usChannelExpansionDerivation,
  usDtc2024Measurement,
} from './e-bike-motors/measurement-contracts.js';

const observed = (
  id: string,
  label: string,
  url: string,
  role: EvidenceRecord['role'],
  accessedAt = '2026-07-22',
  measurement?: EvidenceRecord['measurement'],
  value?: unknown,
  unit?: string,
): EvidenceRecord => ({
  id,
  label,
  kind: 'observed',
  role,
  source: { title: label, url, accessedAt },
  ...(measurement ? { measurement } : {}),
  ...(value !== undefined ? { value } : {}),
  ...(unit ? { unit } : {}),
});

const claim = (
  grade: ValidationClaim['grade'],
  label: string,
  basis: string,
  evidenceIds: string[],
): ValidationClaim => ({ grade, label, basis, evidenceIds });

export interface HeatModelInput {
  event: HeatEvent;
  adaptation: HeatAdaptation;
  mortalityScale: number;
}

const heatEvidenceRecords: EvidenceRecord[] = [
  observed('heat-france-2026', 'France 2026 preliminary excess mortality', heatEvidence.sources.france2026, 'development'),
  observed('heat-europe-2022', 'European 2022 age-specific heat mortality', heatEvidence.sources.europe2022, 'validation'),
  observed('heat-europe-adaptation', 'European heat-adaptation counterfactual', heatEvidence.sources.europe2023Adaptation, 'validation'),
];

export const heatEventModel = defineModel<HeatModelInput, HeatSimulationResult>({
  id: 'acute-heat-event',
  version: '2.0.0',
  description: 'Coupled acute heat mortality, cooling-power, and crop-stress experiment.',
  run: ({ event, adaptation, mortalityScale }) => simulateHeatEvent(event, adaptation, mortalityScale),
  inputPorts: {
    event: HEAT_EVENT_PORT,
    adaptation: HEAT_ADAPTATION_PORT,
    mortalityScale: unitPort('1', 'number'),
  },
  outputPorts: {
    event: HEAT_EVENT_PORT,
    adaptation: HEAT_ADAPTATION_PORT,
    mortalityScale: unitPort('1', 'number'),
    power: HEAT_POWER_PORT,
    food: HEAT_FOOD_PORT,
    mortality: HEAT_MORTALITY_PORT,
  },
  invariants: [
    { id: 'nonnegative-deaths', description: 'Mortality must be non-negative', check: (row) => row.mortality.totalDeaths >= 0 },
    { id: 'grid-uptime-range', description: 'Grid uptime must be in [0,1]', check: (row) => row.power.effectiveGridUptime >= 0 && row.power.effectiveGridUptime <= 1 },
  ],
  evidence: heatEvidenceRecords,
  validationClaims: [claim('same-event-fit', 'France mortality level', 'Mortality scale is fitted to this event; age gradients and adaptation are external checks.', ['heat-france-2026', 'heat-europe-2022', 'heat-europe-adaptation'])],
});

export const genericDrugModel = defineModel<GenericDrugEconomicsScenario, GenericDrugEconomicsResult>({
  id: 'generic-drug-economics',
  version: '2.0.0',
  description: 'Monthly sterile-generic margins, utilization, inventories, and patient service.',
  run: (scenario) => simulateGenericDrugEconomics(scenario),
  inputPorts: {
    id: metadataPort('string', 'Scenario identifier.'),
    label: metadataPort('string', 'Scenario label.'),
    months: unitPort('month', 'number'),
    ratedCapacity: unitPort('1', 'number'),
    initialUtilization: unitPort('fraction', 'number'),
    initialInventoryMonths: unitPort('month', 'number'),
    targetInventoryMonths: unitPort('month', 'number'),
    rawMaterialCostMultiplier: unitPort('1', 'number'),
    laterRawMaterialCostMultiplier: unitPort('1', 'number'),
    rawMaterialReliefMonth: unitPort('step-index', 'number'),
    priceMultiplier: unitPort('1', 'number'),
    priceChangeDelayMonths: unitPort('month', 'number'),
    demandMultiplier: unitPort('1', 'number'),
    qualityAvailability: unitPort('fraction', 'number'),
    adjustmentHalfLifeMonths: unitPort('month', 'number'),
    resiliencePayment: unitPort('fraction', 'number'),
  },
  outputPorts: {
    scenario: DRUG_SCENARIO_PORT,
    months: DRUG_MONTHS_PORT,
    firstShortageMonth: { ...unitPort('step-index', 'number'), nullable: true },
    monthsBelow98Pct: unitPort('month', 'number'),
    minimumServiceLevel: unitPort('fraction', 'number'),
    cumulativeDoseShortfall: unitPort('month', 'number'),
    endingInventoryMonths: unitPort('month', 'number'),
    averagePaidPriceMultiplier: unitPort('1', 'number'),
    averageOperatingMargin: unitPort('fraction', 'number'),
  },
  invariants: [{
    id: 'service-range',
    description: 'Every monthly service level must be in [0,1]',
    check: (result) => result.months.every((row) => row.serviceLevel >= 0 && row.serviceLevel <= 1),
  }],
  evidence: [
    observed('drug-india-price', 'India 2026 oncology-drug ceiling-price relief', drugSupplyEvidence.sources.indiaPriceRelief, 'scenario'),
    observed('drug-cisplatin-utilization', 'Held-out cisplatin utilization response', drugSupplyEvidence.sources.utilization, 'holdout'),
  ],
  validationClaims: [claim('mechanism-inherited', 'Margin-to-service scenario', 'Supply dynamics inherit the separately backtested cisplatin inventory/allocation mechanism; manufacturer cost curves remain scenarios.', ['drug-cisplatin-utilization', 'drug-india-price'])],
});

export const genericDrugTariffModel = defineModel<
  GenericTariffScenario,
  GenericTariffResult
>({
  id: 'generic-drug-tariff-transition',
  version: '1.0.0',
  description:
    'Monthly import economics, inventories, qualified onshoring, prices, and patient service under phased generic-drug tariffs.',
  run: (scenario) => simulateGenericTariffTransition(scenario),
  inputPorts: GENERIC_TARIFF_SCENARIO_PORT.fields,
  outputPorts: {
    scenario: GENERIC_TARIFF_SCENARIO_PORT,
    months: GENERIC_TARIFF_MONTHS_PORT,
    firstShortageMonth: { ...unitPort('step-index', 'number'), nullable: true },
    monthsBelow98Pct: unitPort('month', 'number'),
    minimumServiceLevel: unitPort('fraction', 'number'),
    cumulativeDoseShortfallMonths: unitPort('month', 'number'),
    peakPaidPriceMultiplier: unitPort('1', 'number'),
    averagePaidPriceMultiplier: unitPort('1', 'number'),
    endingInventoryMonths: unitPort('month', 'number'),
    endingDomesticCapacityShare: unitPort('fraction', 'number'),
    cumulativeTariffRevenueDemandMonths: unitPort('month', 'number'),
  },
  invariants: [
    {
      id: 'service-range',
      description: 'Every monthly patient service level must be in [0,1].',
      check: (result) =>
        result.months.every(
          (row) => row.serviceLevel >= 0 && row.serviceLevel <= 1,
        ),
    },
    {
      id: 'supply-share-reconciliation',
      description: 'Initial domestic and import shares must sum to one.',
      check: (result) =>
        Math.abs(
          result.scenario.initialDomesticShare +
            result.scenario.initialImportShare -
            1,
        ) < 1e-9,
    },
  ],
  evidence: [
    observed(
      'generic-tariff-policy',
      'July 2026 proposed phased tariff on imported generic drugs',
      genericTariffEvidence.sources.policy,
      'scenario',
      '2026-07-23',
    ),
    observed(
      'generic-tariff-fda-onshoring',
      'FDA foreign generic manufacturing and API shares',
      genericTariffEvidence.sources.fdaOnshoring,
      'development',
      '2026-07-23',
    ),
    observed(
      'generic-tariff-fda-economics',
      'FDA generic prescription and spending shares',
      genericTariffEvidence.sources.fdaGenericEconomics,
      'validation',
      '2026-07-23',
    ),
  ],
  validationClaims: [
    claim(
      'scenario-only',
      'Tariff-to-access transition',
      'Import exposure and policy timing are observed, while pass-through, plant timing, and supplier exit are transparent scenarios without a historical holdout.',
      [
        'generic-tariff-policy',
        'generic-tariff-fda-onshoring',
        'generic-tariff-fda-economics',
      ],
    ),
  ],
});

export const dataCenterGridModel = defineModel<
  DataCenterGridScenario,
  DataCenterGridResult
>({
  id: 'data-center-grid-cost-allocation',
  version: '1.0.0',
  description:
    'Large-load resource adequacy, generation/network capex assignment, take-or-pay risk, ratepayer impact, and operational emissions.',
  semanticValidation: 'required',
  run: (scenario) => simulateDataCenterGrid(scenario),
  inputPorts: DATA_CENTER_GRID_SCENARIO_PORT.fields,
  outputPorts: DATA_CENTER_GRID_RESULT_PORT.fields,
  invariants: [
    {
      id: 'capex-reconciliation',
      description: 'Developer and ratepayer assignments must reconcile to total capex.',
      check: (result) =>
        Math.abs(
          result.totalIncrementalCapexBillion -
            result.developerAssignedCapexBillion -
            result.ratepayerAssignedCapexBillion,
        ) < 1e-8,
    },
    {
      id: 'nonnegative-reliability-gap',
      description: 'The residual firm-capacity gap cannot be negative.',
      check: (result) => result.reliabilityGapGw >= 0,
    },
  ],
  evidence: [
    {
      ...observed(
        'dc-grid-bnef-2035',
        'BloombergNEF 194 GW U.S. data-center scenario for 2035',
        dataCenterGridEvidence.sources.bnef2035,
        'scenario',
        '2026-07-23',
        bnef2035DataCenterCapacityMeasurement,
        dataCenterGridEvidence.bnef2035CapacityGw,
        'GW',
      ),
      semanticDerivations: [bnefTotalToIncrementalLoadDerivation],
    },
    observed(
      'dc-grid-lbnl',
      'Berkeley Lab U.S. data-center electricity range',
      dataCenterGridEvidence.sources.lbnl,
      'development',
      '2026-07-23',
      lbnl2023DataCenterElectricityMeasurement,
      dataCenterGridEvidence.lbnl2023ElectricityTwh,
      'TWh/year',
    ),
    observed(
      'dc-grid-doe-rates',
      'DOE large-load rate-design principles',
      dataCenterGridEvidence.sources.doeRates,
      'validation',
      '2026-07-23',
    ),
    observed(
      'dc-grid-pledge',
      'Ratepayer Protection Pledge commitments',
      dataCenterGridEvidence.sources.pledge,
      'scenario',
      '2026-07-23',
    ),
    observed(
      'dc-grid-flexibility',
      'EPRI DCFlex field demonstrations',
      dataCenterGridEvidence.sources.flexibility,
      'validation',
      '2026-07-23',
    ),
  ],
  validationClaims: [
    claim(
      'scenario-only',
      'Ratepayer and adequacy implications',
      'The accounting identities are exact and load/flexibility anchors are published, but 2035 capex, project realization, and generation mix remain conditional scenarios.',
      [
        'dc-grid-bnef-2035',
        'dc-grid-lbnl',
        'dc-grid-doe-rates',
        'dc-grid-pledge',
        'dc-grid-flexibility',
      ],
    ),
  ],
});

export const energyInflationModel = defineModel<
  EnergyInflationScenario,
  EnergyInflationResult
>({
  id: 'energy-inflation-policy',
  version: '2.0.0',
  description:
    'Monthly import-energy price-level transmission into headline/core inflation, output, expectations, and a supply-shock-aware policy rule.',
  run: (scenario) => simulateEnergyInflationV2(scenario),
  inputPorts: ENERGY_INFLATION_SCENARIO_PORT.fields,
  outputPorts: {
    scenario: ENERGY_INFLATION_SCENARIO_PORT,
    revision: metadataPort('string', 'Energy-inflation model revision.'),
    months: ENERGY_INFLATION_MONTHS_PORT,
    peakHeadlineInflationPct: unitPort('%'),
    peakCoreInflationPct: unitPort('%'),
    peakPolicyRatePct: unitPort('%'),
    troughOutputGapPct: unitPort('%'),
    monthsHeadlineAboveTarget: unitPort('month'),
    monthsCoreAboveTarget: unitPort('month'),
  },
  invariants: [
    {
      id: 'monthly-path-reconciliation',
      description: 'The output path must contain one row per input month.',
      check: (result) =>
        result.months.length === result.scenario.importEnergyPricePath.length,
    },
    {
      id: 'nonnegative-policy-rate',
      description: 'This toy policy rule is subject to an effective lower bound of zero.',
      check: (result) =>
        result.months.every((row) => row.policyRatePct >= 0),
    },
  ],
  evidence: [
    observed(
      'energy-inflation-current-market',
      'July 2026 Brent settlement and market repricing',
      energyInflationEvidence.sources.currentMarkets,
      'scenario',
      '2026-07-24',
      undefined,
      energyInflationEvidence.currentBrentUsdPerBarrel,
      '$/barrel',
    ),
    observed(
      'energy-inflation-ecb-transmission',
      'ECB 2026 energy-shock transmission analysis',
      energyInflationEvidence.sources.ecbTransmission,
      'development',
      '2026-07-24',
    ),
    observed(
      'energy-inflation-2022-outcomes',
      'Euro-area 2022–2023 inflation and policy peaks',
      energyInflationEvidence.sources.ecbPolicy,
      'validation',
      '2026-07-24',
      undefined,
      {
        headlineInflationPct:
          energyInflationEvidence.euroArea2022PeakHeadlineInflationPct,
        coreInflationPct:
          energyInflationEvidence.euroArea2023PeakCoreInflationPct,
        depositRatePct:
          energyInflationEvidence.euroArea2023PeakDepositRatePct,
      },
    ),
  ],
  validationClaims: [
    claim(
      'same-event-fit',
      '2022 multidimensional reconstruction',
      'The revised mechanism is checked against the 2022–2023 headline-inflation, core-inflation, and policy-rate peaks; the 2026 duration and policy response remain scenarios.',
      [
        'energy-inflation-ecb-transmission',
        'energy-inflation-2022-outcomes',
        'energy-inflation-current-market',
      ],
    ),
  ],
});

export const hormuzWeberInflationModel = defineModel<
  HormuzWeberInflationScenario,
  HormuzWeberInflationResult
>({
  id: 'hormuz-weber-inflation',
  version: '1.0.0',
  description:
    'Monthly Hormuz oil/LNG stock-flow prices propagated through Weber total-requirements exposures into euro-area inflation and policy.',
  run: (scenario) => simulateHormuzWeberInflation(scenario),
  inputPorts: HORMUZ_WEBER_INFLATION_SCENARIO_PORT.fields,
  outputPorts: HORMUZ_WEBER_INFLATION_RESULT_PORT.fields,
  invariants: [
    {
      id: 'monthly-path-reconciliation',
      description:
        'Hormuz, Weber price, and inflation paths must cover the same horizon.',
      check: (result) =>
        result.hormuz.months.length === result.pricePaths.months.length &&
        result.pricePaths.months.length === result.inflation.months.length,
    },
    {
      id: 'network-impact-reconciliation',
      description:
        'Oil and gas Weber contributions must sum to total indirect CPI impact.',
      check: (result) =>
        result.pricePaths.months.every(
          (row) =>
            Math.abs(
              row.oilIndirectCpiImpactPct +
                row.gasIndirectCpiImpactPct -
                row.networkIndirectCpiImpactPct,
            ) < 1e-10,
        ),
    },
    {
      id: 'nonnegative-policy-rate',
      description:
        'The supply-shock-aware policy rule retains its zero lower bound.',
      check: (result) =>
        result.inflation.months.every((row) => row.policyRatePct >= 0),
    },
  ],
  evidence: [
    {
      id: 'hormuz-weber-total-requirements',
      label: 'Weber et al. systemically significant prices',
      kind: 'literature',
      role: 'development',
      source: {
        title:
          'Inflation in times of overlapping emergencies: systemically significant prices from an input-output perspective',
        url: hormuzWeberEvidence.weberDoi,
        accessedAt: '2026-07-24',
      },
      notes: hormuzWeberEvidence.notes,
    },
    observed(
      'hormuz-weber-current-market',
      'July 2026 Brent settlement and market repricing',
      energyInflationEvidence.sources.currentMarkets,
      'scenario',
      '2026-07-24',
    ),
    observed(
      'hormuz-weber-ecb-transmission',
      'ECB 2026 energy-shock transmission analysis',
      energyInflationEvidence.sources.ecbTransmission,
      'validation',
      '2026-07-24',
    ),
  ],
  validationClaims: [
    claim(
      'out-of-sample',
      'Weber network propagation plus inherited Hormuz stock-flow validation',
      'The total-requirements exposure is fitted on Weber’s 2000–2019 vector and checked on its published 2021-Q4 and 2022-Q2 vectors. Hormuz prices inherit the separate stock-flow development/holdout tests; the euro-area sector crosswalk remains a scenario.',
      [
        'hormuz-weber-total-requirements',
        'hormuz-weber-current-market',
        'hormuz-weber-ecb-transmission',
      ],
    ),
  ],
});

export const aiCapitalCycleModel = defineModel<
  AiCapitalCycleScenario,
  AiCapitalCycleResult
>({
  id: 'ai-capital-cycle',
  version: '2.0.0',
  description:
    'Quarterly AI revenue, operating cash, capex cohorts, depreciation, replacement, financing, and self-funding accounting.',
  run: (scenario) => simulateAiCapitalCycleV2(scenario),
  inputPorts: AI_CAPITAL_CYCLE_SCENARIO_PORT.fields,
  outputPorts: {
    scenario: AI_CAPITAL_CYCLE_SCENARIO_PORT,
    revision: metadataPort('string', 'AI capital-cycle model revision.'),
    initialSnapshot: AI_CAPITAL_SNAPSHOT_PORT,
    quarters: AI_CAPITAL_QUARTERS_PORT,
    firstRevenueCoverageQuarter: {
      ...metadataPort('string', 'First quarter with revenue at least depreciation.'),
      nullable: true,
    },
    firstEconomicReplacementQuarter: {
      ...metadataPort(
        'string',
        'First quarter whose operating contribution covers replacement and financing.',
      ),
      nullable: true,
    },
    firstTotalCapexSelfFundingQuarter: {
      ...metadataPort(
        'string',
        'First quarter whose operating contribution covers total capex and financing.',
      ),
      nullable: true,
    },
    peakCumulativeFundingNeedBillion: unitPort('$B'),
    endingCumulativeNetCashBillion: unitPort('$B'),
    endingDebtBalanceBillion: unitPort('$B'),
    endingCapexReplacementCoverage: unitPort('1'),
  },
  invariants: [
    {
      id: 'quarterly-cash-identity',
      description: 'Operating contribution less capex and financing equals free cash flow.',
      check: (result) =>
        result.quarters.every(
          (row) =>
            Math.abs(
              row.operatingCashContributionBillion -
                row.aiCapexBillion -
                row.financingCostBillion -
                row.freeCashFlowBillion,
            ) < 1e-8,
        ),
    },
    {
      id: 'nonnegative-debt',
      description: 'Debt balances cannot be negative.',
      check: (result) =>
        result.quarters.every((row) => row.debtBalanceBillion >= 0),
    },
  ],
  evidence: [
    observed(
      'ai-cycle-revenue-depreciation',
      'Q1 2026 AI revenue and depreciation comparison',
      aiCapitalCycleEvidence.sources.revenueAndDepreciation,
      'development',
      '2026-07-24',
      undefined,
      {
        revenueBillion:
          aiCapitalCycleEvidence.q1_2026RevenueBillion,
        depreciationBillion:
          aiCapitalCycleEvidence.q1_2026DepreciationBillion,
      },
      '$B/quarter',
    ),
    observed(
      'ai-cycle-capex',
      'Big Tech 2026 capital-spending guidance',
      aiCapitalCycleEvidence.sources.capex,
      'scenario',
      '2026-07-24',
      undefined,
      aiCapitalCycleEvidence.bigTech2026CapexBillion,
      '$B/year',
    ),
    observed(
      'ai-cycle-market-reaction',
      'July 2026 market reaction to hyperscaler cash burn',
      aiCapitalCycleEvidence.sources.currentMarkets,
      'scenario',
      '2026-07-24',
    ),
  ],
  validationClaims: [
    claim(
      'scenario-only',
      'AI buildout self-financing path',
      'The current-quarter revenue/depreciation ratio and aggregate capex are observed, while AI capex scope, operating cost, asset mix, monetization, and financing paths remain explicit scenarios.',
      [
        'ai-cycle-revenue-depreciation',
        'ai-cycle-capex',
        'ai-cycle-market-reaction',
      ],
    ),
  ],
});

export const coralBleachingModel = defineModel<
  CoralBleachingScenario,
  CoralBleachingResult
>({
  id: 'coral-bleaching-exposure',
  version: '2.0.0',
  description:
    'Annual global reef bleaching-level heat-stress extent from the ocean-warming baseline and lagged ENSO timing.',
  run: (scenario) => simulateCoralBleachingV2(scenario),
  inputPorts: CORAL_SCENARIO_PORT.fields,
  outputPorts: {
    scenario: CORAL_SCENARIO_PORT,
    revision: metadataPort('string', 'Coral-bleaching model revision.'),
    years: CORAL_YEAR_RESULTS_PORT,
  },
  invariants: [
    {
      id: 'extent-range',
      description: 'Observed, predicted, and counterfactual reef extents are shares in [0,1].',
      check: (result) =>
        result.years.every(
          (row) =>
            row.predictedBleachingExtent >= 0 &&
            row.predictedBleachingExtent <= 1 &&
            row.earlyRecordBaselineCounterfactualExtent >= 0 &&
            row.earlyRecordBaselineCounterfactualExtent <= 1 &&
            row.neutralEnsoCounterfactualExtent >= 0 &&
            row.neutralEnsoCounterfactualExtent <= 1,
        ),
    },
  ],
  evidence: [
    observed(
      'coral-noaa-bleaching-history',
      'NOAA 365-day bleaching stress extent',
      coralCurrentEvidence.sources.bleachingExtent,
      'development',
      '2026-07-24',
    ),
    observed(
      'coral-noaa-ocean-temperature',
      'NOAA global-ocean annual temperature anomalies',
      coralCurrentEvidence.sources.oceanTemperature,
      'development',
      '2026-07-24',
    ),
    observed(
      'coral-noaa-oni',
      'NOAA Oceanic Niño Index',
      coralCurrentEvidence.sources.oni,
      'development',
      '2026-07-24',
    ),
    observed(
      'coral-noaa-holdout',
      'NOAA 2018–2025 bleaching extent holdout',
      coralCurrentEvidence.sources.bleachingStatus,
      'holdout',
      '2026-07-24',
    ),
    observed(
      'coral-noaa-methodology',
      'NOAA Degree Heating Week methodology',
      coralCurrentEvidence.sources.methodology,
      'validation',
      '2026-07-24',
    ),
    observed(
      'coral-noaa-current-enso',
      'NOAA July 2026 ENSO strength probabilities',
      coralCurrentEvidence.sources.currentOutlook,
      'scenario',
      '2026-07-24',
    ),
  ],
  validationClaims: [
    claim(
      'out-of-sample',
      'Post-2017 bleaching-regime holdout',
      'Both revisions are fit only through 2017. Adding the ocean-warming baseline cuts 2018–2025 holdout MAE by roughly two thirds relative to the ENSO-only toy model.',
      [
        'coral-noaa-bleaching-history',
        'coral-noaa-ocean-temperature',
        'coral-noaa-oni',
        'coral-noaa-holdout',
        'coral-noaa-methodology',
        'coral-noaa-current-enso',
      ],
    ),
  ],
});

export interface TariffModelInput {
  action: BilateralTariffAction;
  scope?: 'actual' | 'naive-headline';
  retaliation?: boolean;
}

export const bilateralTariffModel = defineModel<TariffModelInput, BilateralTariffResult>({
  id: 'bilateral-tariff-io',
  version: '2.0.0',
  description: 'Product-scoped bilateral tariff model with input-output price propagation.',
  run: ({ action, scope, retaliation }) => simulateBilateralTariff(action, { scope, retaliation }),
  inputPorts: {
    action: TARIFF_ACTION_PORT,
    scope: { ...metadataPort('string', 'Tariff scope enum.'), optional: true },
    retaliation: { ...metadataPort('boolean', 'Retaliation flag.'), optional: true },
  },
  outputPorts: {
    action: TARIFF_ACTION_PORT,
    scope: metadataPort('string', 'Tariff scope enum.'),
    retaliation: metadataPort('boolean', 'Retaliation flag.'),
    coveredShareOfPartnerImports: unitPort('fraction', 'number'),
    effectiveAverageTariffIncrease: unitPort('fraction', 'number'),
    weightedAffectedImportQuantityDecline: unitPort('fraction', 'number'),
    tariffRevenueBillion: unitPort('$B/year', 'number'),
    domesticReplacementBillion: unitPort('$B/year', 'number'),
    usConsumerPriceChange: unitPort('fraction', 'number'),
    directConsumerPriceChange: unitPort('fraction', 'number'),
    ioPriceAmplification: unitPort('1', 'number'),
    usRealGdpChange: unitPort('fraction', 'number'),
    partnerRealGdpChange: unitPort('fraction', 'number'),
    partnerExportRevenueLossBillion: unitPort('$B/year', 'number'),
    sectors: TARIFF_SECTORS_PORT,
  },
  invariants: [{
    id: 'coverage-range',
    description: 'Covered imports must be a valid share',
    check: (result) => result.coveredShareOfPartnerImports >= 0 && result.coveredShareOfPartnerImports <= 1,
  }],
  evidence: [
    observed('tariff-usitc-2018', 'USITC 2018 steel and aluminum evaluation', tariffEvidence.sources.usitc, 'development'),
    observed('tariff-canada-order', 'Canada tariff product scope', tariffEvidence.sources.canadaOrder, 'scenario'),
  ],
  validationClaims: [claim('same-event-fit', 'Sector pass-through and substitution', 'Pass-through and elasticities are fit to the 2018 steel/aluminum episode; 2026 policy effects are conditional scenarios.', ['tariff-usitc-2018', 'tariff-canada-order'])],
});

export const tradeNetworkTariffModel = defineModel<
  TradeNetworkTariffScenario,
  TradeNetworkTariffResult
>({
  id: 'trade-network-tariff',
  version: '1.0.0',
  description:
    'OEC-style exporter-by-HS6 import network with legal tariff coverage, same-product supplier substitution and capacity, followed by U.S. input-output price propagation.',
  run: (scenario) => simulateTradeNetworkTariff(scenario),
  inputPorts: TRADE_NETWORK_SCENARIO_PORT.fields,
  outputPorts: TRADE_NETWORK_RESULT_PORT.fields,
  invariants: [
    {
      id: 'product-import-reconciliation',
      description:
        'Product baseline imports must reconcile to graph imports.',
      check: (result) =>
        Math.abs(
          result.products.reduce(
            (total, row) =>
              total + row.baselineImportsBillion,
            0,
          ) - result.totalImportsBillion,
        ) <=
        Math.max(1e-8, result.totalImportsBillion * 1e-9),
    },
    {
      id: 'taxable-import-bounds',
      description:
        'Old and new legally taxable flows cannot exceed total imports.',
      check: (result) =>
        result.oldTaxableImportsBillion >= 0 &&
        result.oldTaxableImportsBillion <=
          result.totalImportsBillion &&
        result.newTaxableImportsBillion >= 0 &&
        result.newTaxableImportsBillion <=
          result.totalImportsBillion,
    },
    {
      id: 'supplier-concentration-range',
      description:
        'Trade-weighted supplier HHI must stay in [0,1].',
      check: (result) =>
        result.weightedSupplierHhiBefore >= 0 &&
        result.weightedSupplierHhiBefore <= 1 &&
        result.weightedSupplierHhiAfter >= 0 &&
        result.weightedSupplierHhiAfter <= 1,
    },
    {
      id: 'nonnegative-unfilled-capacity',
      description:
        'Unfilled imports after capacity allocation cannot be negative.',
      check: (result) =>
        result.capacityConstrainedImportsBillion >= 0,
    },
  ],
  evidence: [
    observed(
      'trade-network-baci-current',
      'CEPII BACI bilateral HS6 trade network, version 202601',
      tradeNetworkEvidence.baci,
      'development',
      '2026-07-25',
    ),
    observed(
      'trade-network-census-current',
      'Census current HTS10 import values and customs duties',
      tradeNetworkEvidence.census,
      'development',
      '2026-07-25',
    ),
    observed(
      'trade-network-census-preferences',
      'Census entry-level trade-agreement preference identifiers',
      tradeNetworkEvidence.censusCountrySubcodes,
      'development',
      '2026-07-25',
    ),
    observed(
      'trade-network-section-122',
      'February 2026 temporary Section 122 tariff and exemptions',
      tradeNetworkEvidence.section122,
      'scenario',
      '2026-07-25',
    ),
    observed(
      'trade-network-section-301',
      'July 2026 forced-labor Section 301 final action',
      tradeNetworkEvidence.tariffNotice,
      'scenario',
      '2026-07-25',
    ),
    observed(
      'trade-network-baci-holdout',
      'BACI 2017–2019 China supplier-share holdout',
      tradeNetworkEvidence.baci,
      'holdout',
      '2026-07-25',
    ),
  ],
  validationClaims: [
    claim(
      'out-of-sample',
      '2018–2019 supplier diversion',
      'An elasticity of 1.5 fitted on electrical and mechanical equipment reduces holdout China-share error for plastics, textiles, furniture and toys by 31.7% versus no supplier diversion; exact tariff-line assignment and capacity remain scenario limitations.',
      [
        'trade-network-baci-current',
        'trade-network-baci-holdout',
      ],
    ),
    claim(
      'literature-anchored',
      '2026 legal incidence and customs-entry crosswalk',
      'Old and new exemption schedules are crosswalked at HTS10, while USMCA/CAFTA utilization and pre-existing Chapter 99 scope use observed Census entry classifications.',
      [
        'trade-network-census-current',
        'trade-network-census-preferences',
        'trade-network-section-122',
        'trade-network-section-301',
      ],
    ),
  ],
});

export interface PriceShockModelInput {
  nodes: readonly MaterialNode[];
  shockedNodeId: string;
  shockFraction: number;
  passThrough?: number;
}

export const criticalMaterialPriceModel = defineModel<PriceShockModelInput, PriceShockResult>({
  id: 'critical-material-price-network',
  version: '2.0.0',
  description: 'Weber-style input-output propagation of an upstream material price shock.',
  run: ({ nodes, shockedNodeId, shockFraction, passThrough }) =>
    simulatePriceShock(nodes, shockedNodeId, shockFraction, passThrough),
  inputPorts: {
    nodes: MATERIAL_NODES_PORT,
    shockedNodeId: metadataPort('string', 'Shocked material-network node identifier.'),
    shockFraction: unitPort('fraction', 'number'),
    passThrough: { ...unitPort('1', 'number'), optional: true },
  },
  outputPorts: PRICE_SHOCK_PORT.fields,
  invariants: [{
    id: 'finite-basket-price',
    description: 'The propagated final-basket price change must be finite.',
    check: (result) => Number.isFinite(result.finalBasketPriceChange),
  }],
  evidence: [],
});

export interface DynamicNetworkModelInput {
  nodes: readonly MaterialNode[];
  options: DynamicNetworkOptions;
}

export const criticalMaterialFlowModel = defineModel<
  DynamicNetworkModelInput,
  DynamicNetworkResult
>({
  id: 'critical-material-flow-network',
  version: '2.0.0',
  description: 'Monthly inventories, substitution, bottleneck output, and material-price propagation.',
  run: ({ nodes, options }) => simulateDynamicNetwork(nodes, options),
  inputPorts: {
    nodes: MATERIAL_NODES_PORT,
    options: DYNAMIC_NETWORK_OPTIONS_PORT,
  },
  outputPorts: DYNAMIC_NETWORK_PORT.fields,
  invariants: [{
    id: 'output-range',
    description: 'Weighted final output must remain in [0,1].',
    check: (result) => result.months.every(
      (row) => row.weightedFinalOutput >= 0 && row.weightedFinalOutput <= 1,
    ),
  }],
  evidence: [],
});

export interface FinancialContagionInput {
  scenario: SovereignShockScenario;
  policy: ContagionPolicy;
  markets: readonly SovereignMarket[];
  funds: readonly LeveragedFundGroup[];
  options?: { maxIterations?: number; toleranceBps?: number; bankTier1Billion?: number };
}

export const financialContagionModel = defineModel<FinancialContagionInput, FinancialContagionResult>({
  id: 'sovereign-nbfi-contagion',
  version: '2.0.0',
  description: 'Nonlinear collateral calls, forced sales, sovereign-market impact, and policy backstops.',
  run: ({ scenario, policy, markets, funds, options }) =>
    simulateFinancialContagion(scenario, policy, markets, funds, options),
  inputPorts: {
    scenario: SOVEREIGN_SCENARIO_PORT,
    policy: CONTAGION_POLICY_PORT,
    markets: SOVEREIGN_MARKETS_PORT,
    funds: LEVERAGED_FUNDS_PORT,
    options: { ...CONTAGION_OPTIONS_PORT, optional: true },
  },
  outputPorts: {
    scenario: SOVEREIGN_SCENARIO_PORT,
    policy: CONTAGION_POLICY_PORT,
    converged: metadataPort('boolean', 'Solver convergence flag.'),
    iterations: unitPort('1', 'number'),
    residualBps: unitPort('bp', 'number'),
    termination: metadataPort('string', 'Solver termination enum.'),
    markets: MARKET_STRESS_ROWS_PORT,
    funds: FUND_STRESS_ROWS_PORT,
    totalForcedSalesBillion: unitPort('$B', 'number'),
    totalCentralBankPurchasesBillion: unitPort('$B', 'number'),
    dealerCounterpartyLossBillion: unitPort('$B', 'number'),
    bankTier1CapitalHit: unitPort('fraction', 'number'),
    crossMarketSpilloverBps: unitPort('bp', 'number'),
    liquidationCapacityExhausted: BOOLEAN_PORT,
  },
  invariants: [{
    id: 'nonnegative-sales',
    description: 'Forced sales must be non-negative',
    check: (result) => result.totalForcedSalesBillion >= 0,
  }],
  evidence: [
    observed('finance-uk-ldi-2022', 'Bank of England 2022 LDI evidence', financialContagionEvidence.sources.boe2022, 'development'),
    observed('finance-bis-2026', 'BIS 2026 sovereign NBFI exposures', financialContagionEvidence.sources.bis2026, 'scenario'),
  ],
  validationClaims: [claim('same-event-fit', 'LDI fire-sale feedback', 'The nonlinear feedback is fitted to the 2022 gilt episode; cross-market 2026 exposures are scenario anchored.', ['finance-uk-ldi-2022', 'finance-bis-2026'])],
});

export interface MaritimeModelInput {
  scenario: MaritimeScenario;
  params?: Partial<MaritimeNetworkParams>;
}

export const maritimeNetworkModel = defineModel<MaritimeModelInput, MaritimeSimulationResult>({
  id: 'multi-chokepoint-maritime',
  version: '2.0.0',
  description: 'Monthly Hormuz–Bab–Suez serial-edge network with Cape rerouting and queues.',
  run: ({ scenario, params }) => simulateMaritimeNetwork(scenario, params),
  inputPorts: {
    scenario: MARITIME_SCENARIO_PORT,
    params: { ...PARTIAL_MARITIME_PARAMS_PORT, optional: true },
  },
  outputPorts: {
    scenario: MARITIME_SCENARIO_PORT,
    params: MARITIME_PARAMS_PORT,
    monthly: MARITIME_MONTHS_PORT,
    annual: MARITIME_ANNUAL_ROWS_PORT,
  },
  invariants: [{
    id: 'availability-range',
    description: 'Intended-market oil availability must stay in the modeled [0,1.5] range; values above one are delayed-cargo catch-up.',
    check: (result) => result.monthly.every((row) => row.intendedMarketOilAvailability >= 0 && row.intendedMarketOilAvailability <= 1.5),
  }],
  evidence: [],
  validationClaims: [claim('out-of-sample', 'Cape rerouting persistence', 'The sole rerouting coefficient is fit to 2024 and evaluated against a frozen 1H25 holdout.', [])],
});

export interface DefenseSourcingInput {
  policy: DefensePolicyId;
  overrides?: Partial<DefenseSourcingParams>;
}

export const defenseSourcingModel = defineModel<DefenseSourcingInput, DefenseSourcingResult>({
  id: 'defense-magnet-sourcing',
  version: '2.0.0',
  description: 'Monthly capacity commissioning, qualification, waivers, stockpiles, and defense output.',
  run: ({ policy, overrides }) => simulateDefenseSourcing(policy, overrides),
  inputPorts: {
    policy: metadataPort('string', 'Defense policy identifier.'),
    overrides: { ...PARTIAL_DEFENSE_PARAMS_PORT, optional: true },
  },
  outputPorts: {
    policy: metadataPort('string', 'Defense policy identifier.'),
    params: DEFENSE_PARAMS_PORT,
    months: DEFENSE_MONTHS_PORT,
    network: DYNAMIC_NETWORK_PORT,
    firstCurtailmentMonth: { ...unitPort('step-index', 'number'), nullable: true },
    minimumDefenseOutput: unitPort('fraction', 'number'),
    outputMonthsLost: unitPort('month', 'number'),
    monthsBelow95Pct: unitPort('month', 'number'),
    waiverSupplyMonths: unitPort('month', 'number'),
    stockpileDepletionMonth: { ...unitPort('step-index', 'number'), nullable: true },
    endingQualifiedCapacity: unitPort('1', 'number'),
    averageProcurementCostIndex: unitPort('1', 'number'),
  },
  invariants: [{
    id: 'output-range',
    description: 'Defense output must be in [0,1]',
    check: (result) => result.months.every((row) => row.defenseOutput >= 0 && row.defenseOutput <= 1),
  }],
  evidence: [],
  validationClaims: [claim('mechanism-inherited', 'Qualification bottleneck', 'Inventory and bottleneck dynamics inherit critical-material event validation; project and qualification coefficients are scenarios.', [])],
});

export interface HormuzModelInput {
  scenario: HormuzScenario;
  params?: HormuzModelParams;
}

export const hormuzDisruptionModel = defineModel<HormuzModelInput, HormuzSimulationResult>({
  id: 'hormuz-stock-flow',
  version: '2.0.0',
  description: 'Monthly oil, LNG, fertilizer, inventory, storage, price, and regional exposure model.',
  run: ({ scenario, params }) => simulateHormuzDisruption(scenario, params),
  inputPorts: {
    scenario: HORMUZ_SCENARIO_PORT,
    params: { ...HORMUZ_PARAMS_PORT, optional: true },
  },
  outputPorts: {
    scenario: HORMUZ_SCENARIO_PORT,
    params: HORMUZ_PARAMS_PORT,
    months: HORMUZ_MONTHS_PORT,
    annual: ANNUAL_HORMUZ_ROWS_PORT,
  },
  invariants: [{
    id: 'oil-availability-range',
    description: 'Monthly oil availability must be in [0,1]',
    check: (result) => result.months.every((row) => row.oil.physicalSupplyRatio >= 0 && row.oil.physicalSupplyRatio <= 1),
  }],
  evidence: [],
  validationClaims: [claim('out-of-sample', '2026 Hormuz stock-flow response', 'Traffic, loss, price, and shut-in data are development anchors; later oil and fertilizer outcomes are untouched holdouts.', [])],
});

export const outbreakPreparednessModel = defineModel<OutbreakV2Params, OutbreakSeries>({
  id: 'outbreak-preparedness',
  version: '2.0.0',
  description: 'SEIR outbreak with response, easing, care capacity, severity change, imports, and countermeasures.',
  run: (params) => simulateOutbreakV2(params),
  requireFiniteInput: false,
  inputPorts: {
    population: unitPort('people', 'number'),
    weeks: unitPort('week', 'number'),
    r0: unitPort('1', 'number'),
    infectiousDays: unitPort('day', 'number'),
    initialInfectious: unitPort('people', 'number'),
    responseStartDay: unitPort('day', 'number'),
    responseMultiplier: unitPort('fraction', 'number'),
    ascertainment: unitPort('fraction', 'number'),
    infectionFatalityRatio: unitPort('fraction', 'number'),
    caseReportDelayDays: unitPort('day', 'number'),
    infectionToDeathDays: unitPort('day', 'number'),
    incubationDays: unitPort('day', 'number'),
    initialExposed: unitPort('people', 'number'),
    responseRampDays: unitPort('day', 'number'),
    easingStartDaysAfterResponse: unitPort('day', 'number'),
    easedResponseMultiplier: unitPort('fraction', 'number'),
    easingRampDays: unitPort('day', 'number'),
    importedInfectionsPerMillionPerDay: unitPort('people/Mpeople/day', 'number'),
    hospitalizationRate: unitPort('fraction', 'number'),
    hospitalStayDays: unitPort('day', 'number'),
    staffedBedsPer100k: unitPort('bed/100kpeople', 'number'),
    overflowFatalitySlope: unitPort('fraction', 'number'),
    severityDeclineStartDaysAfterResponse: unitPort('day', 'number'),
    severityHalfLifeDays: unitPort('day', 'number'),
    severityFloor: unitPort('fraction', 'number'),
    countermeasure: { ...COUNTERMEASURE_PORT, optional: true },
  },
  outputPorts: {
    weeklyCases: unitPort('people/week', 'vector'),
    weeklyDeaths: unitPort('people/week', 'vector'),
    weeklyInfections: unitPort('people/week', 'vector'),
    peakHospitalLoad: unitPort('people', 'number'),
    totalInfections: unitPort('people', 'number'),
    totalDeaths: unitPort('people', 'number'),
  },
  invariants: [
    { id: 'nonnegative-deaths', description: 'Deaths must be non-negative', check: (result) => result.totalDeaths >= 0 },
    { id: 'nonnegative-infections', description: 'Infections must be non-negative', check: (result) => result.totalInfections >= 0 },
  ],
  evidence: [],
  validationClaims: [claim('out-of-sample', 'Cross-episode outbreak dynamics', 'Parameters are fitted on early weeks and scored on frozen later-week episode holdouts; generic preparedness paths remain scenarios.', [])],
});

export interface ProbabilisticForecastModelInput {
  values: readonly number[];
  model: ForecastModel;
  originIndex: number;
  horizon: ForecastHorizon;
}

export const outbreakForecastModel = defineModel<
  ProbabilisticForecastModelInput,
  ProbabilisticForecast
>({
  id: 'outbreak-probabilistic-forecast',
  version: '2.1.0',
  description: 'Leakage-safe one-to-four-week probabilistic U.S. COVID-19 hospital-admission forecast.',
  semanticValidation: 'required',
  run: ({ values, model, originIndex, horizon }) =>
    makeForecast(values, model, originIndex, horizon),
  inputPorts: {
    values: observationPort(
      'people/week',
      cdcOperationalAdmissionsMeasurement,
      'vector',
    ),
    model: metadataPort('string', 'Forecast-model identifier.'),
    originIndex: measurementPort(
      'step-index',
      outbreakForecastEstimands.originIndex,
      'number',
    ),
    horizon: measurementPort(
      'week',
      outbreakForecastEstimands.horizon,
      'number',
    ),
  },
  outputPorts: PROBABILISTIC_FORECAST_PORT.fields,
  invariants: [{
    id: 'ordered-intervals',
    description: 'Forecast quantiles must be weakly increasing.',
    check: (forecast) => {
      const q = forecast.quantilesLog;
      return q[0.025] <= q[0.25] && q[0.25] <= q[0.5] &&
        q[0.5] <= q[0.75] && q[0.75] <= q[0.975];
    },
  }],
  evidence: [
    {
      id: 'outbreak-forecast-operational-admissions',
      label: 'CDC operational, revisable U.S. COVID-19 weekly admissions',
      kind: 'observed',
      role: 'development',
      unit: 'people/week',
      source: {
        title: 'CDC complete operational national admissions API',
        url: 'https://data.cdc.gov/resource/mpgq-jmmr.json',
        accessedAt: '2026-07-23',
      },
      measurement: cdcOperationalAdmissionsMeasurement,
    },
    {
      id: 'outbreak-forecast-fixed-initial-admissions',
      label: 'CDC fixed-initial U.S. COVID-19 weekly admissions',
      kind: 'observed',
      role: 'diagnostic',
      unit: 'people/week',
      source: {
        title: 'CDC fixed-initial national admissions dataset',
        url: 'https://data.cdc.gov/resource/vdzy-6i9v.json',
        accessedAt: '2026-07-23',
      },
      measurement: cdcFixedInitialAdmissionsMeasurement,
      notes: 'Forecast resolution series; linked to the longer operational series through an explicit pilot correction, not treated as the same measurement procedure.',
    },
  ],
});

export const warAiModel = defineModel<WarAiExperimentOptions, WarAiExperiment>({
  id: 'war-ai-factorial',
  version: '2.0.0',
  description: 'Matched 2×2 AI-buildout and Hormuz-disruption macro interaction experiment.',
  run: (options) => runWarAiExperiment(options),
  inputPorts: {
    baseParams: { ...opaquePort('Global-model parameter tree contains many module-specific units.'), optional: true },
    aiParams: opaquePort('AI scenario parameter tree contains many module-specific units.'),
    hormuzScenario: { ...metadataPort('string', 'Hormuz scenario identifier.'), optional: true },
    endYear: { ...unitPort('calendar-year', 'number'), optional: true },
  },
  outputPorts: {
    scenario: metadataPort('string', 'Hormuz scenario identifier.'),
    paths: opaquePort('Four complete global simulation results contain many units.'),
    years: WAR_AI_YEARS_PORT,
  },
  invariants: [{
    id: 'aligned-paths',
    description: 'The four matched paths must cover the same number of years',
    check: (result) => new Set(Object.values(result.paths).map((path) => path.results.length)).size === 1,
  }],
  evidence: [],
  validationClaims: [claim('mechanism-inherited', 'War × AI interaction', 'This experiment composes the separately calibrated Hormuz model with the global macro model; the interaction itself has no historical holdout.', [])],
});

export const aviationInfrastructureModel = defineModel<
  AviationInfrastructureScenario,
  AviationInfrastructureResult
>({
  id: 'aviation-infrastructure-traffic',
  version: '1.0.0',
  description:
    'Annual U.S. conventional and advanced-air-mobility traffic allocated across major-airport FBOs, business-aviation airports, small airports, helipads, and new vertiports.',
  run: (scenario) => simulateAviationInfrastructure(scenario),
  inputPorts: AVIATION_INFRASTRUCTURE_SCENARIO_PORT.fields,
  outputPorts: AVIATION_INFRASTRUCTURE_RESULT_PORT.fields,
  invariants: [
    {
      id: 'two-facility-operations-per-flight',
      description:
        'Every origin-to-destination AAM flight must create one departure and one arrival.',
      check: (result) =>
        result.years.every((row) =>
          Math.abs(row.totalAamFacilityOperations - 2 * row.totalAamFlights) <=
          Math.max(1e-6, row.totalAamFacilityOperations * 1e-10)
        ),
    },
    {
      id: 'architecture-shares-reconcile',
      description:
        'VTOL and runway flight shares must sum to one whenever AAM operates.',
      check: (result) =>
        result.years.every((row) =>
          row.totalAamFlights === 0
            ? row.vtolFlightShare === 0 && row.runwayFlightShare === 0
            : Math.abs(row.vtolFlightShare + row.runwayFlightShare - 1) < 1e-10
        ),
    },
    {
      id: 'fbo-service-is-subset-of-traffic',
      description:
        'FBO-handled operations cannot exceed total facility operations.',
      check: (result) =>
        result.years.every((row) =>
          row.totalFboHandledOperations <=
          row.totalConventionalOperations + row.totalAamFacilityOperations + 1e-6
        ),
    },
  ],
  evidence: [
    {
      id: 'aviation-faa-business-jet-domestic',
      label: 'FAA 2025 domestic business-jet arrivals and departures',
      kind: 'observed',
      role: 'development',
      value: aviationEvidence.faaBusinessJetDomesticOperations2025,
      unit: 'operation/year',
      source: {
        title: 'FAA Business Jet Report, June 2026',
        url: aviationEvidence.sources.faaBusinessJet,
        accessedAt: '2026-07-23',
      },
      measurement: faaDomesticBusinessJetOperations2025Measurement,
    },
    {
      id: 'aviation-faa-business-jet-international',
      label: 'FAA 2025 international business-jet arrivals and departures',
      kind: 'observed',
      role: 'development',
      value: aviationEvidence.faaBusinessJetInternationalOperations2025,
      unit: 'operation/year',
      source: {
        title: 'FAA Business Jet Report, June 2026',
        url: aviationEvidence.sources.faaBusinessJet,
        accessedAt: '2026-07-23',
      },
      measurement: faaInternationalBusinessJetOperations2025Measurement,
    },
    {
      id: 'aviation-faa-taf-holdout',
      label: 'FAA 2023–2024 fixed-cohort airport traffic holdouts',
      kind: 'observed',
      role: 'holdout',
      value: {
        majorAirportGa2024:
          tafFacilityTrafficHistory.majorAirportGa.observations.at(-1)?.value,
        businessAviationAirport2024:
          tafFacilityTrafficHistory.businessAviationAirports.observations.at(-1)?.value,
        otherRunwayAirport2024:
          tafFacilityTrafficHistory.otherRunwayAirports.observations.at(-1)?.value,
      },
      unit: 'operation/year',
      source: {
        title: 'FAA 2025 Terminal Area Forecast',
        url: aviationEvidence.sources.faaTaf,
        accessedAt: '2026-07-23',
      },
      notes:
        `Fixed-cohort TAF source ZIP SHA-256: ${aviationEvidence.taf2025ZipSha256}.`,
    },
    {
      id: 'aviation-faa-business-jet-holdout',
      label: 'FAA 2024–2025 business-jet traffic holdout',
      kind: 'observed',
      role: 'holdout',
      value: {
        businessJet2024:
          5_134_988,
        businessJet2025:
          aviationEvidence.faaBusinessJetEtmscOperations2025,
      },
      unit: 'operation/year',
      source: {
        title: 'FAA Business Jet Report, June 2026',
        url: aviationEvidence.sources.faaBusinessJet,
        accessedAt: '2026-07-23',
      },
    },
    {
      id: 'aviation-faa-aam-unconstrained',
      label: 'FAA six-year unconstrained AAM fleet and trip scenario',
      kind: 'literature',
      role: 'scenario',
      value: {
        allUseCaseFleet:
          aviationEvidence.faaAamEarlyFleetAllUseCases,
        allUseCaseDepartures:
          aviationEvidence.faaAamEarlyAllUseCaseDepartures,
        passengerDepartures:
          aviationEvidence.faaAamEarlyPassengerDepartures,
      },
      source: {
        title: 'FAA Aerospace Forecast FY 2026–2046',
        url: aviationEvidence.sources.faaAerospaceForecast,
        accessedAt: '2026-07-23',
      },
      notes:
        'Passenger flights use Airport Shuttle plus Commuter Air Taxi. The published fleet also supports cargo and medical trips, so its VTOL comparison is only a scale proxy. This is not observed traffic or a forced calibration target.',
    },
    {
      id: 'aviation-faa-initial-aam-infrastructure',
      label: 'FAA initial AAM infrastructure assumptions',
      kind: 'literature',
      role: 'scenario',
      source: {
        title: 'FAA Advanced Air Mobility Infrastructure',
        url: aviationEvidence.sources.faaAamInfrastructure,
        accessedAt: '2026-07-23',
      },
      notes:
        'Supports an initial piloted-aircraft phase using existing airports and heliports.',
    },
    {
      id: 'aviation-electra-stol-certification',
      label: 'Electra EL9 FAA certification-basis milestone',
      kind: 'literature',
      role: 'scenario',
      source: {
        title: 'Electra EL9 FAA certification milestone',
        url: aviationEvidence.sources.electraCertification,
        accessedAt: '2026-07-23',
      },
      notes:
        'Program-specific evidence that a nine-seat ultra-short aircraft is in the certification process; it does not validate the modeled entry year.',
    },
  ],
  validationClaims: [
    claim(
      'out-of-sample',
      'Segmented conventional traffic baseline',
      'Segment-specific robust growth rates are estimated before the 2023–2025 holdouts and cut mean absolute percentage error roughly in half relative to a generic aviation-growth extrapolation.',
      [
        'aviation-faa-taf-holdout',
        'aviation-faa-business-jet-holdout',
      ],
    ),
    claim(
      'scenario-only',
      'AAM architecture, certification, and autonomy branches',
      'The early production ramp is compared with the FAA unconstrained scenario, but certification timing, usable-site rollout, passenger adoption, autonomy, and facility capture remain explicit scenarios rather than validated point forecasts.',
      [
        'aviation-faa-aam-unconstrained',
        'aviation-faa-initial-aam-infrastructure',
        'aviation-electra-stol-certification',
      ],
    ),
  ],
  semanticDerivations: [businessJetEndpointDerivation],
});

export const ebikeMotorMarketModel = defineModel<
  EbikeMotorScenario,
  EbikeMotorResult
>({
  id: 'e-bike-motor-market',
  version: '1.0.0',
  description:
    'Annual e-bike adoption by U.S., EU, China, Japan, and rest-of-world source boundary; drive-unit volumes by supplier; and commercial/financial constraints on a U.S. hub- or mid-drive entrant.',
  run: (scenario) => simulateEbikeMotorMarket(scenario),
  inputPorts: EBIKE_MOTOR_SCENARIO_PORT.fields,
  outputPorts: EBIKE_MOTOR_RESULT_PORT.fields,
  invariants: [
    {
      id: 'regional-sales-reconcile',
      description:
        'Regional complete-bike market flows must sum to the modeled global flow.',
      check: (result) =>
        result.years.every(
          (row) =>
            Math.abs(
              EBIKE_REGIONS.reduce(
                (total, region) => total + row.regions[region].annualSales,
                0,
              ) - row.globalAnnualSales,
            ) <= Math.max(1e-6, row.globalAnnualSales * 1e-10),
        ),
    },
    {
      id: 'architecture-volumes-reconcile',
      description:
        'Hub and mid-drive equivalents must exhaust the annual complete-bike market flow.',
      check: (result) =>
        result.years.every(
          (row) =>
            Math.abs(
              MOTOR_ARCHITECTURES.reduce(
                (total, architecture) =>
                  total + row.architectureVolumes[architecture],
                0,
              ) - row.globalDriveUnitDemand,
            ) <= Math.max(1e-6, row.globalDriveUnitDemand * 1e-10),
        ),
    },
    {
      id: 'supplier-volumes-reconcile',
      description:
        'Named incumbent, residual, and entrant drive-unit volumes must exhaust annual demand.',
      check: (result) =>
        result.years.every(
          (row) =>
            Math.abs(
              MOTOR_SUPPLIERS.reduce(
                (total, supplier) => total + row.supplierVolumes[supplier],
                0,
              ) - row.globalDriveUnitDemand,
            ) <= Math.max(1e-6, row.globalDriveUnitDemand * 1e-10),
        ),
    },
    {
      id: 'entrant-commercial-constraints',
      description:
        'Entrant deliveries cannot exceed addressable demand, OEM program capacity, or factory capacity.',
      check: (result) =>
        result.years.every(
          (row) =>
            row.entrant.annualUnits <= row.entrant.oemProgramCapacity + 1e-6 &&
            row.entrant.annualUnits <= row.entrant.factoryCapacity + 1e-6 &&
            EBIKE_REGIONS.every(
              (region) =>
                row.regions[region].entrantUnits <=
                row.regions[region].entrantAddressableUnits + 1e-6,
            ),
        ),
    },
  ],
  evidence: [
    {
      id: 'e-bike-us-2024-channel-expansion',
      label: 'U.S. 2024 direct-to-consumer e-bike channel estimate',
      kind: 'observed',
      role: 'development',
      value: 450_000,
      unit: 'ebike/year',
      source: {
        title:
          'PeopleForBikes: U.S. e-bike market is bigger than the numbers show',
        url: ebikeMotorEvidence.sources.usPeopleForBikes,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
      measurement: usDtc2024Measurement,
      semanticDerivations: [usChannelExpansionDerivation],
      notes:
        'The model uses a rounded 900,000 total-new-sales anchor; approximately 80,000 used-bike transactions are excluded.',
    },
    {
      id: 'e-bike-eu-adoption-development',
      label: 'EU27 + UK 2019–2021 e-bike retail-sales development series',
      kind: 'observed',
      role: 'development',
      value: regionalSalesHistory
        .filter((row) => row.region === 'eu' && row.role === 'development')
        .map(({ year, annualUnits }) => ({ year, annualUnits })),
      unit: 'ebike/year',
      source: {
        title: 'CONEBI 2020–2021 Bicycle Industry and Market Profiles',
        url: ebikeMotorEvidence.sources.euConebi2021,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
    },
    {
      id: 'e-bike-eu-2023-sales',
      label: 'EU27 + UK 2023 e-bike retail sales holdout',
      kind: 'observed',
      role: 'holdout',
      value: 5_100_000,
      unit: 'ebike/year',
      source: {
        title: 'CONEBI Bicycle Industry and Market Profile 2024',
        url: ebikeMotorEvidence.sources.euConebi2023,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
      measurement: eu2023SalesMeasurement,
    },
    {
      id: 'e-bike-china-2023-output',
      label: 'China 2023 electric-bicycle production proxy',
      kind: 'observed',
      role: 'diagnostic',
      value: 42_280_000,
      unit: 'ebike/year',
      source: {
        title: 'Chinese government electric-bicycle industry statistics',
        url: ebikeMotorEvidence.sources.chinaGovernmentStock,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
      measurement: china2023ProductionMeasurement,
      notes:
        'This is production by major enterprises, not harmonized retail sell-through.',
    },
    {
      id: 'e-bike-japan-adoption-development',
      label: 'Japan 2007–2017 power-assist factory-shipment development series',
      kind: 'observed',
      role: 'development',
      value: regionalSalesHistory
        .filter(
          (row) => row.region === 'japan' && row.role === 'development',
        )
        .map(({ year, annualUnits }) => ({ year, annualUnits })),
      unit: 'ebike/year',
      source: {
        title: 'Japanese Diet testimony citing METI factory shipments',
        url: ebikeMotorEvidence.sources.japanDiet,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
    },
    {
      id: 'e-bike-japan-2022-shipments',
      label: 'Japan 2022 power-assist factory-shipment holdout',
      kind: 'observed',
      role: 'holdout',
      value: 790_000,
      unit: 'ebike/year',
      source: {
        title: 'Japanese Diet testimony citing METI factory shipments',
        url: ebikeMotorEvidence.sources.japanDiet,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
      measurement: japan2022ShipmentMeasurement,
    },
    {
      id: 'e-bike-bafang-2024-volume',
      label: 'Bafang 2024 disclosed drive-unit-equivalent volume',
      kind: 'observed',
      role: 'development',
      value: supplierDisclosures.find(
        (row) => row.supplier === 'bafang',
      )?.modeledComparableUnits,
      unit: 'driveunit/year',
      source: {
        title: 'Bafang 2024 annual report',
        url: ebikeMotorEvidence.sources.bafangAnnualReport,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
      measurement: bafang2024DriveUnitMeasurement,
    },
    {
      id: 'e-bike-ananda-2024-volume',
      label: 'Ananda 2024 constructed comparable drive-unit volume',
      kind: 'derived',
      role: 'development',
      value: supplierDisclosures.find(
        (row) => row.supplier === 'ananda',
      )?.modeledComparableUnits,
      unit: 'driveunit/year',
      source: {
        title: 'Ananda 2024 annual report and prospectus',
        url: ebikeMotorEvidence.sources.anandaAnnualReport,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
      measurement: ananda2024ComparableMeasurement,
      notes:
        'Mid-drive and direct-hub volumes are reported or growth-derived; geared-hub volume is an explicit estimate.',
    },
    {
      id: 'e-bike-bosch-integration',
      label: 'Bosch integrated drive-system and OEM-service footprint',
      kind: 'literature',
      role: 'scenario',
      source: {
        title: 'Bosch 2025 annual report',
        url: ebikeMotorEvidence.sources.boschAnnualReport2025,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
      notes:
        'Bosch describes an integrated portfolio of drive units, batteries, ABS, displays, digital services, diagnostics, and a Europe-wide network of more than 30,000 specialist dealers.',
    },
    {
      id: 'e-bike-avinox-oem-ramp',
      label: 'Avinox reported expansion from 16 to more than 60 OEM partners',
      kind: 'literature',
      role: 'scenario',
      source: {
        title: 'Avinox April 2026 product and OEM-partner release',
        url: ebikeMotorEvidence.sources.avinox2026Release,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
      notes:
        'Company-issued evidence is used only to bound the breakthrough OEM-acquisition scenario, not as independent market validation.',
    },
    {
      id: 'e-bike-yamaha-brose-consolidation',
      label: 'Yamaha acquisition of Brose bicycle drive business',
      kind: 'observed',
      role: 'scenario',
      source: {
        title: 'Yamaha Motor acquisition announcement',
        url: ebikeMotorEvidence.sources.yamahaBrose,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
    },
    {
      id: 'e-bike-ul2849-system-certification',
      label: 'UL 2849 whole electrical-system certification boundary',
      kind: 'literature',
      role: 'scenario',
      source: {
        title: 'UL Solutions e-bike certification and UL 2849',
        url: ebikeMotorEvidence.sources.ul2849,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
      notes:
        'UL 2849 evaluates the drive train, battery, charger, and system combinations; a standalone competitive motor is not the full certification object.',
    },
    {
      id: 'e-bike-bionx-service-risk',
      label: 'BionX failure and replacement/service discontinuity',
      kind: 'observed',
      role: 'scenario',
      source: {
        title: 'Bicycle Retailer report on post-BionX replacement batteries',
        url: ebikeMotorEvidence.sources.bionxFailure,
        accessedAt: ebikeMotorEvidence.accessedAt,
      },
      notes:
        'Supports the entrant bankability and installed-base service constraints.',
    },
  ],
  validationClaims: [
    claim(
      'out-of-sample',
      'Regional adoption shape',
      'A replacement-and-saturation revision fitted only to EU 2019–2021 retail sales and Japan 2007–2017 factory shipments reduces mean error on the EU 2022–2023 and Japan 2022 holdouts from about 26.0% for exponential extrapolation to about 7.6%.',
      [
        'e-bike-eu-adoption-development',
        'e-bike-eu-2023-sales',
        'e-bike-japan-adoption-development',
        'e-bike-japan-2022-shipments',
      ],
    ),
    claim(
      'same-event-fit',
      'Supplier-volume baseline',
      'The 2024 regional share table is calibrated to the only two auditable public global volume comparators found, reproducing modeled-comparable Bafang and Ananda units with about 1.3% mean absolute percentage error; other supplier volumes remain inferred or residual.',
      ['e-bike-bafang-2024-volume', 'e-bike-ananda-2024-volume'],
    ),
    claim(
      'literature-anchored',
      'Motor-to-system commercial constraint',
      'OEM integration, certification, service coverage, and supplier longevity are represented independently from product quality based on incumbent operating models, Avinox partner acquisition, UL 2849, consolidation, and the BionX failure.',
      [
        'e-bike-bosch-integration',
        'e-bike-avinox-oem-ramp',
        'e-bike-yamaha-brose-consolidation',
        'e-bike-ul2849-system-certification',
        'e-bike-bionx-service-risk',
      ],
    ),
    claim(
      'scenario-only',
      'U.S. entrant investment outcome',
      'The entrant P&L, OEM win rate, addressable shares, capacity ramp, and learning curve are transparent strategic scenarios rather than a historical company forecast.',
      [
        'e-bike-us-2024-channel-expansion',
        'e-bike-bosch-integration',
        'e-bike-avinox-oem-ramp',
      ],
    ),
  ],
  semanticDerivations: [bikeToDriveUnitDerivation],
});

export const SIMULATION_MODELS = [
  heatEventModel,
  genericDrugModel,
  genericDrugTariffModel,
  dataCenterGridModel,
  energyInflationModel,
  hormuzWeberInflationModel,
  aiCapitalCycleModel,
  coralBleachingModel,
  bilateralTariffModel,
  tradeNetworkTariffModel,
  criticalMaterialPriceModel,
  criticalMaterialFlowModel,
  financialContagionModel,
  maritimeNetworkModel,
  defenseSourcingModel,
  hormuzDisruptionModel,
  outbreakPreparednessModel,
  outbreakForecastModel,
  warAiModel,
  aviationInfrastructureModel,
  ebikeMotorMarketModel,
] as const;

export const simulationModelRegistry = new ModelRegistry();
for (const model of SIMULATION_MODELS) simulationModelRegistry.register(model as any);

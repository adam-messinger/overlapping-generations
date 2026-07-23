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
  ANNUAL_HORMUZ_ROWS_PORT,
  BOOLEAN_PORT,
  CONTAGION_OPTIONS_PORT,
  CONTAGION_POLICY_PORT,
  COUNTERMEASURE_PORT,
  DATA_CENTER_GRID_RESULT_PORT,
  DATA_CENTER_GRID_SCENARIO_PORT,
  DEFENSE_MONTHS_PORT,
  DEFENSE_PARAMS_PORT,
  DYNAMIC_NETWORK_OPTIONS_PORT,
  DYNAMIC_NETWORK_PORT,
  DRUG_MONTHS_PORT,
  DRUG_SCENARIO_PORT,
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
  bnef2035DataCenterCapacityMeasurement,
  bnefTotalToIncrementalLoadDerivation,
  lbnl2023DataCenterElectricityMeasurement,
} from './news/data-center-grid-measurements.js';

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

export const SIMULATION_MODELS = [
  heatEventModel,
  genericDrugModel,
  genericDrugTariffModel,
  dataCenterGridModel,
  bilateralTariffModel,
  criticalMaterialPriceModel,
  criticalMaterialFlowModel,
  financialContagionModel,
  maritimeNetworkModel,
  defenseSourcingModel,
  hormuzDisruptionModel,
  outbreakPreparednessModel,
  outbreakForecastModel,
  warAiModel,
] as const;

export const simulationModelRegistry = new ModelRegistry();
for (const model of SIMULATION_MODELS) simulationModelRegistry.register(model as any);

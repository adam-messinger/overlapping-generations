import {
  ModelRegistry,
  defineModel,
  opaquePort,
  unitPort,
  type EvidenceRecord,
  type ValidationClaim,
} from 'tsimulation';
import type { HeatAdaptation, HeatEvent } from './heat/data.js';
import { heatEvidence } from './heat/data.js';
import { simulateHeatEvent, type HeatSimulationResult } from './heat/model.js';
import type { GenericDrugEconomicsScenario } from './drug-supply/data.js';
import { drugSupplyEvidence } from './drug-supply/data.js';
import { simulateGenericDrugEconomics, type GenericDrugEconomicsResult } from './drug-supply/model.js';
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
import type { HormuzModelParams, HormuzScenario } from './critical-materials/hormuz-data.js';
import {
  simulateHormuzDisruption,
  type HormuzSimulationResult,
} from './critical-materials/hormuz-model.js';
import type { OutbreakV2Params, OutbreakSeries } from './outbreak/model.js';
import { simulateOutbreakV2 } from './outbreak/model.js';
import {
  runWarAiExperiment,
  type WarAiExperiment,
  type WarAiExperimentOptions,
} from './news/war-ai.js';

const observed = (id: string, label: string, url: string, role: EvidenceRecord['role']): EvidenceRecord => ({
  id,
  label,
  kind: 'observed',
  role,
  source: { title: label, url, accessedAt: '2026-07-22' },
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
    event: opaquePort('Heat-event configuration contains temperatures, durations, populations, and shares.'),
    adaptation: opaquePort('Adaptation configuration contains capacities, temperatures, and shares.'),
    mortalityScale: unitPort('1', 'number'),
  },
  outputPorts: {
    event: opaquePort('Echoed mixed-unit heat-event configuration.'),
    adaptation: opaquePort('Echoed mixed-unit adaptation configuration.'),
    mortalityScale: unitPort('1', 'number'),
    power: opaquePort('Power result mixes degree-days, shares, TWh, and GW.'),
    food: opaquePort('Food result mixes degree-days and yield shares.'),
    mortality: opaquePort('Mortality result mixes thermal load, people, and shares.'),
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
    id: opaquePort('Scenario identifier.'),
    label: opaquePort('Scenario label.'),
    months: unitPort('month', 'number'),
    ratedCapacity: unitPort('1', 'number'),
    initialUtilization: unitPort('fraction', 'number'),
    initialInventoryMonths: unitPort('month', 'number'),
    targetInventoryMonths: unitPort('month', 'number'),
    rawMaterialCostMultiplier: unitPort('1', 'number'),
    laterRawMaterialCostMultiplier: unitPort('1', 'number'),
    rawMaterialReliefMonth: unitPort('month', 'number'),
    priceMultiplier: unitPort('1', 'number'),
    priceChangeDelayMonths: unitPort('month', 'number'),
    demandMultiplier: unitPort('1', 'number'),
    qualityAvailability: unitPort('fraction', 'number'),
    adjustmentHalfLifeMonths: unitPort('month', 'number'),
    resiliencePayment: unitPort('fraction', 'number'),
  },
  outputPorts: {
    scenario: opaquePort('Echoed mixed-unit drug scenario.'),
    months: opaquePort('Monthly records mix quantities, inventories, margins, and service shares.', 'vector'),
    firstShortageMonth: unitPort('month', 'number'),
    monthsBelow98Pct: unitPort('month', 'number'),
    minimumServiceLevel: unitPort('fraction', 'number'),
    cumulativeDoseShortfall: unitPort('1', 'number'),
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
    action: opaquePort('Tariff action mixes currency flows, tariff rates, and elasticities.'),
    scope: { ...opaquePort('Tariff scope enum.'), optional: true },
    retaliation: { ...opaquePort('Retaliation boolean.'), optional: true },
  },
  outputPorts: {
    action: opaquePort('Echoed mixed-unit tariff action.'),
    scope: opaquePort('Tariff scope enum.'),
    retaliation: opaquePort('Retaliation boolean.'),
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
    sectors: opaquePort('Sector results mix currency flows and dimensionless changes.', 'vector'),
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
    scenario: opaquePort('Shock scenario mixes yield shocks and labels.'),
    policy: opaquePort('Policy configuration mixes multipliers and currency limits.'),
    markets: opaquePort('Market records mix yields, durations, depth, and currency values.', 'vector'),
    funds: opaquePort('Fund records mix currency balance sheets, calls, and allocation shares.', 'vector'),
    options: { ...opaquePort('Solver options mix counts, basis points, and currency values.'), optional: true },
  },
  outputPorts: {
    scenario: opaquePort('Echoed mixed-unit shock scenario.'),
    policy: opaquePort('Echoed mixed-unit policy configuration.'),
    converged: opaquePort('Solver convergence boolean.'),
    iterations: unitPort('1', 'number'),
    residualBps: unitPort('bp', 'number'),
    termination: opaquePort('Solver termination enum.'),
    markets: opaquePort('Market stress records mix basis points and currency flows.', 'vector'),
    funds: opaquePort('Fund stress records mix currency flows, flags, and allocations.', 'vector'),
    totalForcedSalesBillion: unitPort('$B', 'number'),
    totalCentralBankPurchasesBillion: unitPort('$B', 'number'),
    dealerCounterpartyLossBillion: unitPort('$B', 'number'),
    bankTier1CapitalHit: unitPort('fraction', 'number'),
    crossMarketSpilloverBps: unitPort('bp', 'number'),
    liquidationCapacityExhausted: opaquePort('Liquidation-capacity boolean.'),
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
    scenario: opaquePort('Maritime scenario contains throughput paths, dates, and labels.'),
    params: { ...opaquePort('Network parameters mix flows, delays, exposures, and elasticities.'), optional: true },
  },
  outputPorts: {
    scenario: opaquePort('Echoed mixed-unit maritime scenario.'),
    params: opaquePort('Resolved mixed-unit maritime parameters.'),
    monthly: opaquePort('Monthly network rows mix mb/d, hours, shares, and inflation points.', 'vector'),
    annual: opaquePort('Annual network rows mix mb/d, hours, shares, and inflation points.', 'vector'),
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
    policy: opaquePort('Defense policy identifier.'),
    overrides: { ...opaquePort('Defense parameters mix capacities, dates, costs, and shares.'), optional: true },
  },
  outputPorts: {
    policy: opaquePort('Defense policy identifier.'),
    params: opaquePort('Resolved mixed-unit defense parameters.'),
    months: opaquePort('Monthly defense rows mix capacity, inventory, costs, and output shares.', 'vector'),
    network: opaquePort('Dynamic network result contains mixed node quantities and service shares.'),
    firstCurtailmentMonth: unitPort('month', 'number'),
    minimumDefenseOutput: unitPort('fraction', 'number'),
    outputMonthsLost: unitPort('month', 'number'),
    monthsBelow95Pct: unitPort('month', 'number'),
    waiverSupplyMonths: unitPort('month', 'number'),
    stockpileDepletionMonth: unitPort('month', 'number'),
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
    scenario: opaquePort('Hormuz scenario mixes throughput paths, timing, and labels.'),
    params: { ...opaquePort('Hormuz parameters mix commodity flows, storage, prices, and elasticities.'), optional: true },
  },
  outputPorts: {
    scenario: opaquePort('Echoed mixed-unit Hormuz scenario.'),
    params: opaquePort('Resolved mixed-unit Hormuz parameters.'),
    months: opaquePort('Monthly Hormuz rows mix physical flows, inventories, prices, and shares.', 'vector'),
    annual: opaquePort('Annual Hormuz rows mix availability, prices, output, and regional effects.', 'vector'),
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
    countermeasure: { ...opaquePort('Countermeasure configuration mixes timing, course flow, and efficacy.'), optional: true },
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

export const warAiModel = defineModel<WarAiExperimentOptions, WarAiExperiment>({
  id: 'war-ai-factorial',
  version: '2.0.0',
  description: 'Matched 2×2 AI-buildout and Hormuz-disruption macro interaction experiment.',
  run: (options) => runWarAiExperiment(options),
  inputPorts: {
    baseParams: { ...opaquePort('Global-model parameter tree contains many module-specific units.'), optional: true },
    aiParams: opaquePort('AI scenario parameter tree contains many module-specific units.'),
    hormuzScenario: { ...opaquePort('Hormuz scenario identifier.'), optional: true },
    endYear: { ...unitPort('year', 'number'), optional: true },
  },
  outputPorts: {
    scenario: opaquePort('Hormuz scenario identifier.'),
    paths: opaquePort('Four complete global simulation results contain many units.'),
    years: opaquePort('Annual experiment rows mix GDP, energy, capital, rates, and regional effects.', 'vector'),
  },
  invariants: [{
    id: 'aligned-paths',
    description: 'The four matched paths must cover the same number of years',
    check: (result) => new Set(Object.values(result.paths).map((path) => path.results.length)).size === 1,
  }],
  evidence: [],
  validationClaims: [claim('mechanism-inherited', 'War × AI interaction', 'This experiment composes the separately calibrated Hormuz model with the global macro model; the interaction itself has no historical holdout.', [])],
});

export const simulationModelRegistry = new ModelRegistry()
  .register(heatEventModel)
  .register(genericDrugModel)
  .register(bilateralTariffModel)
  .register(financialContagionModel)
  .register(maritimeNetworkModel)
  .register(defenseSourcingModel)
  .register(hormuzDisruptionModel)
  .register(outbreakPreparednessModel)
  .register(warAiModel);

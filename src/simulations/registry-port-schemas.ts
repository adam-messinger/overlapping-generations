/** Field-level model-port schemas shared by the sibling simulation registry. */

import {
  measurementPort,
  metadataPort,
  objectPort,
  partialObjectPort,
  recordPort,
  unitPort,
  vectorPort,
} from 'tsimulation';
import { REGIONS } from '../domain-types.js';
import {
  dataCenterEstimands,
  hormuzEstimands,
  outbreakForecastEstimands,
} from './semantic-contracts.js';
import { HEAT_AGE_GROUPS, type HeatAdaptation, type HeatEvent } from './heat/data.js';
import type {
  HeatFoodResult,
  HeatMortalityResult,
  HeatPowerResult,
} from './heat/model.js';
import type { GenericDrugEconomicsScenario } from './drug-supply/data.js';
import type { GenericDrugEconomicsMonth } from './drug-supply/model.js';
import type {
  GenericTariffMonth,
  GenericTariffScenario,
} from './drug-supply/generic-tariff.js';
import type {
  DataCenterGridResult,
  DataCenterGridScenario,
} from './news/data-center-grid.js';
import type {
  EnergyInflationMonth,
  EnergyInflationNetworkMonth,
  EnergyInflationNetworkResult,
  EnergyInflationNetworkScenario,
  EnergyInflationScenario,
} from './news/energy-inflation.js';
import type {
  HormuzWeberInflationResult,
  HormuzWeberInflationScenario,
  WeberEnergyBridgeOptions,
  WeberEnergyPriceMonth,
  WeberEnergyPricePaths,
} from './news/hormuz-weber-inflation.js';
import type {
  AiCapitalCycleScenario,
  AiCapitalQuarter,
  AiCapitalSnapshot,
} from './news/ai-capital-cycle.js';
import type {
  CoralBleachingParamsV1,
  CoralBleachingParamsV2,
  CoralBleachingScenario,
  CoralBleachingYearInput,
  CoralBleachingYearResult,
} from './news/coral-bleaching.js';
import type { BilateralTariffAction, TradeSectorId } from './trade/data.js';
import type { TariffSectorResult } from './trade/model.js';
import {
  SOVEREIGN_MARKETS,
  type ContagionPolicy,
  type LeveragedFundGroup,
  type SovereignMarket,
  type SovereignShockScenario,
} from './financial-contagion/data.js';
import type {
  FundStressResult,
  SovereignMarketStressResult,
} from './financial-contagion/model.js';
import type {
  MaritimeNetworkParams,
  MaritimeScenario,
} from './critical-materials/shipping-data.js';
import type {
  MaritimeAnnualResult,
  MaritimeMonthResult,
} from './critical-materials/shipping-network.js';
import type {
  DefenseCapacityProject,
  DefenseSourcingParams,
} from './critical-materials/defense-sourcing-data.js';
import type {
  DefenseSourcingMonth,
} from './critical-materials/defense-sourcing.js';
import type {
  DynamicMonthResult,
  DynamicNetworkOptions,
  DynamicNetworkResult,
} from './critical-materials/dynamic-network.js';
import type {
  MaterialInput,
  MaterialNode,
} from './critical-materials/data.js';
import type {
  PriceShockResult,
} from './critical-materials/price-network.js';
import type {
  FertilizerMarketParams,
  HormuzModelParams,
  HormuzRegionExposure,
  HormuzScenario,
  OilMarketParams,
  TradedCommodityParams,
} from './critical-materials/hormuz-data.js';
import type {
  AnnualHormuzShock,
  AnnualRegionalHormuzShock,
  CommodityMonthResult,
  FertilizerMonthResult,
  HormuzMonthResult,
  HormuzSimulationResult,
  RegionalHormuzMonthResult,
} from './critical-materials/hormuz-model.js';
import type { CountermeasureParams } from './outbreak/model.js';
import {
  FORECAST_QUANTILES,
  type ProbabilisticForecast,
} from './outbreak/probabilistic.js';
import type { WarAiYearResult } from './news/war-ai.js';

const regionFractions = () => recordPort<number>(unitPort('fraction'), { keys: REGIONS });
const sovereignBps = () => recordPort<number>(unitPort('bp'), { keys: SOVEREIGN_MARKETS });
const sovereignBillions = (unit = '$B') =>
  recordPort<number>(unitPort(unit), { keys: SOVEREIGN_MARKETS });

// Acute heat event -----------------------------------------------------------

export const HEAT_EVENT_PORT = objectPort<HeatEvent>({
  id: metadataPort('string', 'Heat-event identifier.'),
  label: metadataPort('string', 'Heat-event label.'),
  populationMillions: unitPort('Mpeople'),
  ageShares: recordPort<number>(unitPort('fraction'), { keys: HEAT_AGE_GROUPS }),
  heatDays: unitPort('day'),
  meanDayMaximumC: unitPort('°C'),
  meanNightMinimumC: unitPort('°C'),
  compoundHotNightShare: unitPort('fraction'),
  urbanHeatIslandC: unitPort('Δ°C'),
  humidityRiskMultiplier: unitPort('1'),
  mortalityDayThresholdC: unitPort('°C'),
  mortalityNightThresholdC: unitPort('°C'),
  cropHotHoursShare: unitPort('fraction'),
  cropThresholdC: unitPort('°C'),
  cropSensitiveOutputShare: unitPort('fraction'),
  baseNonCoolingPeakGw: unitPort('GW'),
  firmPowerCapacityGw: unitPort('GW'),
});

export const HEAT_ADAPTATION_PORT = objectPort<HeatAdaptation>({
  id: metadataPort('string', 'Adaptation identifier.'),
  label: metadataPort('string', 'Adaptation label.'),
  structuralMortalityRiskReduction: unitPort('fraction'),
  warningCoverage: unitPort('fraction'),
  warningMortalityEfficacy: unitPort('fraction'),
  outreachCoverage: recordPort<number>(unitPort('fraction'), { keys: HEAT_AGE_GROUPS }),
  outreachMortalityEfficacy: unitPort('fraction'),
  coolingAccess: recordPort<number>(unitPort('fraction'), { keys: HEAT_AGE_GROUPS }),
  coolingMortalityEfficacy: unitPort('fraction'),
  mechanicalGridUptime: unitPort('fraction'),
  passiveCoolingC: unitPort('Δ°C'),
  coolingEfficiencyMultiplier: unitPort('1'),
  demandResponseShare: unitPort('fraction'),
  additionalFirmCapacityGw: unitPort('GW'),
  irrigatedCropShare: unitPort('fraction'),
  irrigationDamageReduction: unitPort('fraction'),
  cropHeatToleranceC: unitPort('Δ°C'),
});

export const HEAT_POWER_PORT = objectPort<HeatPowerResult>({
  coolingDegreeDays: unitPort('Δ°C*day'),
  populationCoolingCoverage: unitPort('fraction'),
  coolingElectricityTwh: unitPort('TWh'),
  unmanagedCoolingPeakGw: unitPort('GW'),
  managedCoolingPeakGw: unitPort('GW'),
  totalPeakGw: unitPort('GW'),
  firmCapacityGw: unitPort('GW'),
  reserveMarginGw: unitPort('GW'),
  overloadOutageFraction: unitPort('fraction'),
  effectiveGridUptime: unitPort('fraction'),
});

export const HEAT_FOOD_PORT = objectPort<HeatFoodResult>({
  extremeDegreeDays: unitPort('Δ°C*day'),
  lossWithinExposedCrops: unitPort('fraction'),
  aggregateSeasonalYieldLoss: unitPort('fraction'),
  irrigatedDamageAvoided: unitPort('fraction'),
});

export const HEAT_MORTALITY_PORT = objectPort<HeatMortalityResult>({
  thermalLoad: unitPort('Δ°C*day'),
  deathsByAge: recordPort<number>(unitPort('people'), { keys: HEAT_AGE_GROUPS }),
  totalDeaths: unitPort('people'),
  shareAge65Plus: unitPort('fraction'),
  averageRiskMultiplier: unitPort('1'),
});

// Generic-drug economics -----------------------------------------------------

export const DRUG_SCENARIO_PORT = objectPort<GenericDrugEconomicsScenario>({
  id: metadataPort('string', 'Scenario identifier.'),
  label: metadataPort('string', 'Scenario label.'),
  months: unitPort('month'),
  ratedCapacity: unitPort('fraction'),
  initialUtilization: unitPort('fraction'),
  initialInventoryMonths: unitPort('month'),
  targetInventoryMonths: unitPort('month'),
  rawMaterialCostMultiplier: unitPort('1'),
  laterRawMaterialCostMultiplier: unitPort('1'),
  rawMaterialReliefMonth: unitPort('step-index'),
  priceMultiplier: unitPort('1'),
  priceChangeDelayMonths: unitPort('month'),
  demandMultiplier: unitPort('1'),
  qualityAvailability: unitPort('fraction'),
  adjustmentHalfLifeMonths: unitPort('month'),
  resiliencePayment: unitPort('fraction'),
});

export const DRUG_MONTH_PORT = objectPort<GenericDrugEconomicsMonth>({
  month: unitPort('step-index'),
  rawMaterialCostMultiplier: unitPort('1'),
  allowedPriceMultiplier: unitPort('1'),
  economicCostIndex: unitPort('1'),
  operatingMargin: unitPort('fraction'),
  targetUtilization: unitPort('fraction'),
  actualUtilization: unitPort('fraction'),
  releasedSupply: unitPort('fraction'),
  beginningInventory: unitPort('month'),
  endingInventory: unitPort('month'),
  serviceLevel: unitPort('fraction'),
});

export const DRUG_MONTHS_PORT = vectorPort<GenericDrugEconomicsMonth>(DRUG_MONTH_PORT);

// Generic-drug tariff transition --------------------------------------------

export const GENERIC_TARIFF_SCENARIO_PORT = objectPort<GenericTariffScenario>({
  id: metadataPort('string', 'Scenario identifier.'),
  label: metadataPort('string', 'Scenario label.'),
  months: unitPort('month'),
  initialImportShare: unitPort('fraction'),
  initialDomesticShare: unitPort('fraction'),
  initialInventoryMonths: unitPort('month'),
  targetInventoryMonths: unitPort('month'),
  tariffStartMonth: unitPort('step-index'),
  secondTariffMonth: unitPort('step-index'),
  firstTariffRate: unitPort('1'),
  secondTariffRate: unitPort('1'),
  importedUnitCostIndex: unitPort('1'),
  existingDomesticUnitCostIndex: unitPort('1'),
  newDomesticUnitCostIndex: unitPort('1'),
  tariffCustomsValueShare: unitPort('fraction'),
  payerPassThrough: unitPort('fraction'),
  importSupplyElasticity: unitPort('1'),
  minimumImportRetention: unitPort('fraction'),
  onshoreTargetShare: unitPort('fraction'),
  constructionLeadMonths: unitPort('month'),
  qualificationRampMonths: unitPort('month'),
  domesticSupplyElasticity: unitPort('1'),
  domesticProductionCredit: unitPort('fraction'),
});

export const GENERIC_TARIFF_MONTH_PORT = objectPort<GenericTariffMonth>({
  month: unitPort('step-index'),
  tariffRate: unitPort('1'),
  allowedPriceMultiplier: unitPort('1'),
  importDeliveredCostIndex: unitPort('1'),
  importEconomicCoverage: unitPort('fraction'),
  importSupply: unitPort('fraction'),
  existingDomesticSupply: unitPort('fraction'),
  newDomesticCapacity: unitPort('fraction'),
  newDomesticSupply: unitPort('fraction'),
  releasedSupply: unitPort('fraction'),
  beginningInventoryMonths: unitPort('month'),
  endingInventoryMonths: unitPort('month'),
  serviceLevel: unitPort('fraction'),
  domesticShareOfReleasedSupply: unitPort('fraction'),
  tariffRevenueIndex: unitPort('1'),
});

export const GENERIC_TARIFF_MONTHS_PORT =
  vectorPort<GenericTariffMonth>(GENERIC_TARIFF_MONTH_PORT);

// Data-center grid cost and adequacy ----------------------------------------

export const DATA_CENTER_GRID_SCENARIO_PORT = objectPort<DataCenterGridScenario>({
  id: metadataPort('string', 'Scenario identifier.'),
  label: metadataPort('string', 'Scenario label.'),
  incrementalContractedLoadGw: measurementPort(
    'GW',
    dataCenterEstimands.incrementalContractedLoadGw,
  ),
  loadFactor: measurementPort('fraction', dataCenterEstimands.loadFactor),
  peakCoincidenceFactor: measurementPort(
    'fraction',
    dataCenterEstimands.peakCoincidenceFactor,
  ),
  flexibleLoadShare: measurementPort(
    'fraction',
    dataCenterEstimands.flexibleLoadShare,
  ),
  dedicatedGenerationShare: measurementPort(
    'fraction',
    dataCenterEstimands.dedicatedGenerationShare,
  ),
  dedicatedPortfolioCapacityFactor: measurementPort(
    'fraction',
    dataCenterEstimands.dedicatedPortfolioCapacityFactor,
  ),
  dedicatedCapacityCredit: measurementPort(
    'fraction',
    dataCenterEstimands.dedicatedCapacityCredit,
  ),
  sharedFirmBuildGw: measurementPort(
    'GW',
    dataCenterEstimands.sharedFirmBuildGw,
  ),
  generationCostResponsibility: measurementPort(
    'fraction',
    dataCenterEstimands.generationCostResponsibility,
  ),
  networkCostResponsibility: measurementPort(
    'fraction',
    dataCenterEstimands.networkCostResponsibility,
  ),
  takeOrPayCoverage: measurementPort(
    'fraction',
    dataCenterEstimands.takeOrPayCoverage,
  ),
  expectedLoadRealization: measurementPort(
    'fraction',
    dataCenterEstimands.expectedLoadRealization,
  ),
  generationCapexPerKw: measurementPort(
    '$/kW',
    dataCenterEstimands.generationCapexPerKw,
  ),
  networkCapexPerKw: measurementPort(
    '$/kW',
    dataCenterEstimands.networkCapexPerKw,
  ),
  fixedChargeRate: measurementPort(
    'fraction/year',
    dataCenterEstimands.fixedChargeRate,
  ),
  nonDataCenterRetailSalesTwh: measurementPort(
    'TWh/year',
    dataCenterEstimands.nonDataCenterRetailSalesTwh,
  ),
  nonDataCenterRetailRatePerMwh: measurementPort(
    '$/MWh',
    dataCenterEstimands.nonDataCenterRetailRatePerMwh,
  ),
  gridEmissionsKgPerMwh: measurementPort(
    'kgCO2/MWh',
    dataCenterEstimands.gridEmissionsKgPerMwh,
  ),
  dedicatedEmissionsKgPerMwh: measurementPort(
    'kgCO2/MWh',
    dataCenterEstimands.dedicatedEmissionsKgPerMwh,
  ),
  hoursPerYear: measurementPort(
    'hour/year',
    dataCenterEstimands.hoursPerYear,
  ),
});

export const DATA_CENTER_GRID_RESULT_PORT = objectPort<DataCenterGridResult>({
  scenario: DATA_CENTER_GRID_SCENARIO_PORT,
  realizedAverageLoadGw: measurementPort(
    'GW',
    dataCenterEstimands.realizedAverageLoadGw,
  ),
  annualElectricityTwh: measurementPort(
    'TWh/year',
    dataCenterEstimands.annualElectricityTwh,
  ),
  coincidentPeakGw: measurementPort(
    'GW',
    dataCenterEstimands.coincidentPeakGw,
  ),
  flexiblePeakGw: measurementPort(
    'GW',
    dataCenterEstimands.flexiblePeakGw,
  ),
  dedicatedNameplateGw: measurementPort(
    'GW',
    dataCenterEstimands.dedicatedNameplateGw,
  ),
  dedicatedFirmCapacityGw: measurementPort(
    'GW',
    dataCenterEstimands.dedicatedFirmCapacityGw,
  ),
  sharedFirmCapacityRequiredGw: measurementPort(
    'GW',
    dataCenterEstimands.sharedFirmCapacityRequiredGw,
  ),
  sharedFirmCapacityBuiltGw: measurementPort(
    'GW',
    dataCenterEstimands.sharedFirmCapacityBuiltGw,
  ),
  reliabilityGapGw: measurementPort(
    'GW',
    dataCenterEstimands.reliabilityGapGw,
  ),
  dedicatedGenerationCapexBillion: measurementPort(
    '$B',
    dataCenterEstimands.dedicatedGenerationCapexBillion,
  ),
  sharedGenerationCapexBillion: measurementPort(
    '$B',
    dataCenterEstimands.sharedGenerationCapexBillion,
  ),
  networkCapexBillion: measurementPort(
    '$B',
    dataCenterEstimands.networkCapexBillion,
  ),
  totalIncrementalCapexBillion: measurementPort(
    '$B',
    dataCenterEstimands.totalIncrementalCapexBillion,
  ),
  developerAssignedCapexBillion: measurementPort(
    '$B',
    dataCenterEstimands.developerAssignedCapexBillion,
  ),
  ratepayerAssignedCapexBillion: measurementPort(
    '$B',
    dataCenterEstimands.ratepayerAssignedCapexBillion,
  ),
  strandedRiskShiftBillion: measurementPort(
    '$B',
    dataCenterEstimands.strandedRiskShiftBillion,
  ),
  annualRatepayerRevenueRequirementBillion: measurementPort(
    '$B/year',
    dataCenterEstimands.annualRatepayerRevenueRequirementBillion,
  ),
  nonDataCenterBillImpact: measurementPort(
    'fraction',
    dataCenterEstimands.nonDataCenterBillImpact,
  ),
  dedicatedElectricityTwh: measurementPort(
    'TWh/year',
    dataCenterEstimands.dedicatedElectricityTwh,
  ),
  gridElectricityTwh: measurementPort(
    'TWh/year',
    dataCenterEstimands.gridElectricityTwh,
  ),
  operationalEmissionsGtCo2: measurementPort(
    'GtCO2/year',
    dataCenterEstimands.operationalEmissionsGtCo2,
  ),
});

// Energy-price inflation and policy transmission ----------------------------

export const ENERGY_INFLATION_SCENARIO_PORT =
  objectPort<EnergyInflationScenario>({
    id: metadataPort('string', 'Energy-inflation scenario identifier.'),
    label: metadataPort('string', 'Energy-inflation scenario label.'),
    importEnergyPricePath: vectorPort<number>(unitPort('1')),
    startingHeadlineInflationPct: unitPort('%'),
    startingCoreInflationPct: unitPort('%'),
    startingExpectedInflationPct: unitPort('%'),
    startingPolicyRatePct: unitPort('%'),
    startingOutputGapPct: unitPort('%'),
    inflationTargetPct: unitPort('%'),
    neutralPolicyRatePct: unitPort('%'),
    energyCpiWeight: unitPort('fraction'),
    directConsumerPassThrough: unitPort('fraction'),
    directAdjustmentHalfLifeMonths: unitPort('month'),
    indirectCorePassThrough: unitPort('fraction'),
    indirectAdjustmentHalfLifeMonths: unitPort('month'),
    largeShockNonlinearity: unitPort('1'),
    fiscalShieldingShare: unitPort('fraction'),
    exchangeRateAmplification: unitPort('1'),
    inflationAttention: unitPort('1'),
    wageFeedback: unitPort('fraction'),
    energyOutputSensitivity: unitPort('fraction'),
    policyOutputSensitivity: unitPort('fraction'),
    policyInflationResponse: unitPort('1'),
    policyOutputResponse: unitPort('1'),
    policySmoothing: unitPort('fraction'),
    supplyShockLookThrough: unitPort('fraction'),
  });

export const ENERGY_INFLATION_MONTH_PORT =
  objectPort<EnergyInflationMonth>({
    month: unitPort('step-index'),
    importEnergyPriceMultiple: unitPort('1'),
    consumerEnergyPriceGapPct: unitPort('%'),
    corePriceGapPct: unitPort('%'),
    headlineInflationPct: unitPort('%'),
    coreInflationPct: unitPort('%'),
    expectedInflationPct: unitPort('%'),
    policyRatePct: unitPort('%'),
    outputGapPct: unitPort('%'),
  });
export const ENERGY_INFLATION_MONTHS_PORT =
  vectorPort<EnergyInflationMonth>(ENERGY_INFLATION_MONTH_PORT);

export const ENERGY_INFLATION_NETWORK_SCENARIO_PORT =
  objectPort<EnergyInflationNetworkScenario>({
    ...ENERGY_INFLATION_SCENARIO_PORT.fields,
    coreCpiWeight: unitPort('fraction'),
    networkCorePriceGapPathPct: vectorPort<number>(unitPort('%')),
    networkOtherCpiContributionPathPct:
      vectorPort<number>(unitPort('percentage-point')),
  });

export const ENERGY_INFLATION_NETWORK_MONTH_PORT =
  objectPort<EnergyInflationNetworkMonth>({
    ...ENERGY_INFLATION_MONTH_PORT.fields,
    networkCoreTargetPriceGapPct: unitPort('%'),
    networkOtherCpiContributionPct: unitPort('percentage-point'),
  });
export const ENERGY_INFLATION_NETWORK_MONTHS_PORT =
  vectorPort<EnergyInflationNetworkMonth>(
    ENERGY_INFLATION_NETWORK_MONTH_PORT,
  );

export const ENERGY_INFLATION_NETWORK_RESULT_PORT =
  objectPort<EnergyInflationNetworkResult>({
    scenario: ENERGY_INFLATION_NETWORK_SCENARIO_PORT,
    revision: metadataPort(
      'string',
      'Weber-network energy-inflation model revision.',
    ),
    months: ENERGY_INFLATION_NETWORK_MONTHS_PORT,
    peakHeadlineInflationPct: unitPort('%'),
    peakCoreInflationPct: unitPort('%'),
    peakPolicyRatePct: unitPort('%'),
    troughOutputGapPct: unitPort('%'),
    monthsHeadlineAboveTarget: unitPort('month'),
    monthsCoreAboveTarget: unitPort('month'),
  });

// AI capital-cycle accounting -----------------------------------------------

export const AI_CAPITAL_CYCLE_SCENARIO_PORT =
  objectPort<AiCapitalCycleScenario>({
    id: metadataPort('string', 'AI capital-cycle scenario identifier.'),
    label: metadataPort('string', 'AI capital-cycle scenario label.'),
    startYear: unitPort('calendar-year'),
    startQuarter: unitPort('calendar-quarter'),
    quarters: unitPort('quarter'),
    startingQuarterlyAiRevenueBillion: unitPort('$B/quarter'),
    startingQuarterlyAiDepreciationBillion: unitPort('$B/quarter'),
    annualRevenueGrowthPath: vectorPort<number>(unitPort('fraction/year')),
    annualTotalDeveloperCapexBillion: vectorPort<number>(unitPort('$B/year')),
    aiShareOfDeveloperCapex: unitPort('fraction'),
    cashOperatingCostShare: unitPort('fraction'),
    chipShareOfAiCapex: unitPort('fraction'),
    chipUsefulLifeYears: unitPort('year'),
    facilityUsefulLifeYears: unitPort('year'),
    chipDeploymentLagQuarters: unitPort('quarter'),
    facilityDeploymentLagQuarters: unitPort('quarter'),
    replacementCostPremium: unitPort('1'),
    debtFundedShareOfCashDeficit: unitPort('fraction'),
    financingRate: unitPort('fraction/year'),
  });

export const AI_CAPITAL_SNAPSHOT_PORT = objectPort<AiCapitalSnapshot>({
  quarterlyAiRevenueBillion: unitPort('$B/quarter'),
  quarterlyAiDepreciationBillion: unitPort('$B/quarter'),
  revenueDepreciationCoverage: unitPort('1'),
  revenueLessDepreciationBillion: unitPort('$B/quarter'),
  clearsDepreciationBar: metadataPort(
    'boolean',
    'Whether quarterly AI revenue is at least quarterly depreciation.',
  ),
});

export const AI_CAPITAL_QUARTER_PORT = objectPort<AiCapitalQuarter>({
  index: unitPort('step-index'),
  year: unitPort('calendar-year'),
  quarter: unitPort('calendar-quarter'),
  aiRevenueBillion: unitPort('$B/quarter'),
  aiCapexBillion: unitPort('$B/quarter'),
  depreciationBillion: unitPort('$B/quarter'),
  cashOperatingCostBillion: unitPort('$B/quarter'),
  operatingCashContributionBillion: unitPort('$B/quarter'),
  maintenanceCapexBillion: unitPort('$B/quarter'),
  growthCapexBillion: unitPort('$B/quarter'),
  financingCostBillion: unitPort('$B/quarter'),
  revenueDepreciationCoverage: unitPort('1'),
  economicReplacementCoverage: unitPort('1'),
  totalCapexSelfFundingCoverage: unitPort('1'),
  cashAfterReplacementBillion: unitPort('$B/quarter'),
  freeCashFlowBillion: unitPort('$B/quarter'),
  cumulativeNetCashBillion: unitPort('$B'),
  debtBalanceBillion: unitPort('$B'),
});
export const AI_CAPITAL_QUARTERS_PORT =
  vectorPort<AiCapitalQuarter>(AI_CAPITAL_QUARTER_PORT);

// Global coral-bleaching exposure -------------------------------------------

export const CORAL_PARAMS_V1_PORT = objectPort<CoralBleachingParamsV1>({
  intercept: unitPort('1'),
  laggedEnsoCoefficient: unitPort('1/Δ°C'),
});
export const CORAL_PARAMS_V2_PORT = objectPort<CoralBleachingParamsV2>({
  intercept: unitPort('1'),
  laggedEnsoCoefficient: unitPort('1/Δ°C'),
  oceanWarmingCoefficient: unitPort('1/Δ°C'),
  earlyRecordOceanAnomalyC: unitPort('Δ°C'),
});
export const CORAL_YEAR_INPUT_PORT = objectPort<CoralBleachingYearInput>({
  year: unitPort('calendar-year'),
  oceanAnomalyC: unitPort('Δ°C'),
  maxOniC: unitPort('Δ°C'),
  observedBleachingExtent: { ...unitPort('fraction'), nullable: true },
});
export const CORAL_SCENARIO_PORT = objectPort<CoralBleachingScenario>({
  id: metadataPort('string', 'Coral-bleaching scenario identifier.'),
  label: metadataPort('string', 'Coral-bleaching scenario label.'),
  priorYearMaxOniC: unitPort('Δ°C'),
  years: vectorPort<CoralBleachingYearInput>(CORAL_YEAR_INPUT_PORT),
  paramsV1: CORAL_PARAMS_V1_PORT,
  paramsV2: CORAL_PARAMS_V2_PORT,
});
export const CORAL_YEAR_RESULT_PORT = objectPort<CoralBleachingYearResult>({
  year: unitPort('calendar-year'),
  oceanAnomalyC: unitPort('Δ°C'),
  maxOniC: unitPort('Δ°C'),
  laggedPositiveEnsoC: unitPort('Δ°C'),
  observedBleachingExtent: { ...unitPort('fraction'), nullable: true },
  predictedBleachingExtent: unitPort('fraction'),
  earlyRecordBaselineCounterfactualExtent: unitPort('fraction'),
  neutralEnsoCounterfactualExtent: unitPort('fraction'),
  conditionalRecentWarmingContributionPctPoints: unitPort('percentage-point'),
  conditionalEnsoContributionPctPoints: unitPort('percentage-point'),
});
export const CORAL_YEAR_RESULTS_PORT =
  vectorPort<CoralBleachingYearResult>(CORAL_YEAR_RESULT_PORT);

// Bilateral tariffs ----------------------------------------------------------

export const TARIFF_ACTION_PORT = objectPort<BilateralTariffAction>({
  id: metadataPort('string', 'Tariff action identifier.'),
  partner: metadataPort('string', 'Trade partner.'),
  nominalTariff: unitPort('fraction'),
  affectedImportsBillion: unitPort('$B/year'),
  totalImportsBillion: unitPort('$B/year'),
  affectedImportAllocation: recordPort<number>(unitPort('fraction')),
  partnerExportsToUsShareOfGdp: unitPort('fraction'),
  tradeDiversionShare: unitPort('fraction'),
  partnerInputOutputMultiplier: unitPort('1'),
  domesticRecaptureShare: unitPort('fraction'),
  domesticValueAddedShare: unitPort('fraction'),
});

export const TARIFF_SECTOR_PORT = objectPort<TariffSectorResult>({
  sector: metadataPort('string', 'Trade-sector identifier.'),
  affectedImportsBillion: unitPort('$B/year'),
  deliveredTariffPriceIncrease: unitPort('fraction'),
  affectedImportQuantityDecline: unitPort('fraction'),
  directSectorCostShock: unitPort('fraction'),
  totalSectorPriceChange: unitPort('fraction'),
  displacedImportsBillion: unitPort('$B/year'),
});

export const TARIFF_SECTORS_PORT = vectorPort<TariffSectorResult>(TARIFF_SECTOR_PORT);

// Sovereign/NBFI contagion ---------------------------------------------------

export const SOVEREIGN_SCENARIO_PORT = objectPort<SovereignShockScenario>({
  id: metadataPort('string', 'Shock identifier.'),
  label: metadataPort('string', 'Shock label.'),
  fundamentalYieldShockBps: sovereignBps(),
});

export const CONTAGION_POLICY_PORT = objectPort<ContagionPolicy>({
  id: metadataPort('string', 'Policy identifier.'),
  label: metadataPort('string', 'Policy label.'),
  fundMarginCallMultiplier: unitPort('1'),
  fundingCallMultiplier: unitPort('1'),
  liquidityBufferMultiplier: unitPort('1'),
  marketImpactMultiplier: unitPort('1'),
  centralBankBackstopBillion: sovereignBillions('$B'),
});

export const SOVEREIGN_MARKET_PORT = objectPort<SovereignMarket>({
  id: metadataPort('string', 'Sovereign-market identifier.'),
  label: metadataPort('string', 'Sovereign-market label.'),
  baseMarketImpactBpsPerBillion: unitPort('bp/$B'),
  dealerCapacityBillion: unitPort('$B'),
  nonlinearImpact: unitPort('1'),
  bankExposureShareOfTier1: unitPort('fraction'),
  bankPortfolioDuration: unitPort('year'),
  recognizedMarkToMarketShare: unitPort('fraction'),
});
export const SOVEREIGN_MARKETS_PORT = vectorPort<SovereignMarket>(SOVEREIGN_MARKET_PORT);

export const LEVERAGED_FUND_PORT = objectPort<LeveragedFundGroup>({
  id: metadataPort('string', 'Fund-group identifier.'),
  label: metadataPort('string', 'Fund-group label.'),
  marginCallBillionPer100Bps: sovereignBillions('$B/100bp'),
  exogenousFundingCallBillion: unitPort('$B'),
  cashAndEligibleCollateralBillion: unitPort('$B'),
  maxLiquidationBillion: unitPort('$B'),
  liquidationWeights: recordPort<number>(unitPort('fraction'), { keys: SOVEREIGN_MARKETS }),
  bankGapLossShare: unitPort('fraction'),
});
export const LEVERAGED_FUNDS_PORT = vectorPort<LeveragedFundGroup>(LEVERAGED_FUND_PORT);

export interface ContagionSolverOptions {
  maxIterations?: number;
  toleranceBps?: number;
  bankTier1Billion?: number;
}
export const CONTAGION_OPTIONS_PORT = objectPort<ContagionSolverOptions>({
  maxIterations: { ...unitPort('1'), optional: true },
  toleranceBps: { ...unitPort('bp'), optional: true },
  bankTier1Billion: { ...unitPort('$B'), optional: true },
});

export const MARKET_STRESS_PORT = objectPort<SovereignMarketStressResult>({
  market: metadataPort('string', 'Sovereign-market identifier.'),
  fundamentalShockBps: unitPort('bp'),
  amplifiedShockBps: unitPort('bp'),
  amplificationBps: unitPort('bp'),
  grossForcedSalesBillion: unitPort('$B'),
  centralBankPurchasesBillion: unitPort('$B'),
  netMarketSalesBillion: unitPort('$B'),
});
export const MARKET_STRESS_ROWS_PORT = vectorPort<SovereignMarketStressResult>(MARKET_STRESS_PORT);

export const FUND_STRESS_PORT = objectPort<FundStressResult>({
  fund: metadataPort('string', 'Fund-group identifier.'),
  marginAndFundingCallBillion: unitPort('$B'),
  availableLiquidityBillion: unitPort('$B'),
  forcedSalesBillion: unitPort('$B'),
  salesByMarket: sovereignBillions('$B'),
  exhaustedLiquidationCapacity: metadataPort('boolean', 'Whether liquidation capacity is exhausted.'),
});
export const FUND_STRESS_ROWS_PORT = vectorPort<FundStressResult>(FUND_STRESS_PORT);

// Maritime chokepoint network ------------------------------------------------

export const MARITIME_SCENARIO_PORT = objectPort<MaritimeScenario>({
  id: metadataPort('string', 'Maritime scenario identifier.'),
  label: metadataPort('string', 'Maritime scenario label.'),
  description: metadataPort('string', 'Maritime scenario description.'),
  startYear: unitPort('calendar-year'),
  startMonth: unitPort('calendar-month'),
  hormuzThroughputPath: vectorPort<number>(unitPort('fraction')),
  babThroughputPath: vectorPort<number>(unitPort('fraction')),
  suezThroughputPath: vectorPort<number>(unitPort('fraction')),
  baselineBabOilMbd: unitPort('mb/d'),
  baselineCapeOilMbd: unitPort('mb/d'),
});

export const MARITIME_PARAMS_PORT = objectPort<MaritimeNetworkParams>({
  babCrudeShare: unitPort('fraction'),
  babHormuzOverlapShare: unitPort('fraction'),
  oilCapeRerouteShare: unitPort('fraction'),
  capeExtraDays: unitPort('day'),
  daysPerMonth: unitPort('day/month'),
  sumedCrudeCoverage: unitPort('mb/d'),
  suezContainerTradeShare: unitPort('fraction'),
  containerAvoidanceCalibration: unitPort('fraction'),
  containerNetworkAmplification: unitPort('1'),
  containerServiceCycleDays: unitPort('day'),
  importInflationPpPer100Hours: unitPort('percentage-point/100hour'),
  importInflationLagMonths: unitPort('month'),
  regionalTradeExposure: regionFractions(),
});
export const PARTIAL_MARITIME_PARAMS_PORT = partialObjectPort(MARITIME_PARAMS_PORT);

export const MARITIME_MONTH_PORT = objectPort<MaritimeMonthResult>({
  year: unitPort('calendar-year'),
  month: unitPort('calendar-month'),
  hormuzThroughput: unitPort('fraction'),
  babThroughput: unitPort('fraction'),
  suezThroughput: unitPort('fraction'),
  oilAvailableToRedSeaMbd: unitPort('mb/d'),
  directOilMbd: unitPort('mb/d'),
  capeOilDeparturesMbd: unitPort('mb/d'),
  capeOilArrivalsMbd: unitPort('mb/d'),
  reorientedOilMbd: unitPort('mb/d'),
  intendedMarketOilAvailability: unitPort('fraction'),
  capeOilFlowMbd: unitPort('mb/d'),
  containerAvoidance: unitPort('fraction'),
  containerEffectiveCapacityLoss: unitPort('fraction'),
  affectedLaneDelayHours: unitPort('hour'),
  importInflationImpulsePctPoints: unitPort('percentage-point'),
  regionalTradeCapacityFactor: regionFractions(),
});
export const MARITIME_MONTHS_PORT = vectorPort<MaritimeMonthResult>(MARITIME_MONTH_PORT);

export const MARITIME_ANNUAL_PORT = objectPort<MaritimeAnnualResult>({
  year: unitPort('calendar-year'),
  averageIntendedMarketOilAvailability: unitPort('fraction'),
  minimumIntendedMarketOilAvailability: unitPort('fraction'),
  averageCapeOilFlowMbd: unitPort('mb/d'),
  peakContainerCapacityLoss: unitPort('fraction'),
  peakAffectedLaneDelayHours: unitPort('hour'),
  peakImportInflationImpulsePctPoints: unitPort('percentage-point'),
  regionalTradeCapacityFactor: regionFractions(),
});
export const MARITIME_ANNUAL_ROWS_PORT = vectorPort<MaritimeAnnualResult>(MARITIME_ANNUAL_PORT);

// Defense magnet sourcing ----------------------------------------------------

export const DEFENSE_PROJECT_PORT = objectPort<DefenseCapacityProject>({
  id: metadataPort('string', 'Capacity-project identifier.'),
  capacity: unitPort('fraction'),
  commissionMonth: unitPort('step-index'),
  qualificationMonths: unitPort('month'),
});

export const DEFENSE_PARAMS_PORT = objectPort<DefenseSourcingParams>({
  months: unitPort('month'),
  cutoffMonth: unitPort('step-index'),
  initialQualifiedCapacity: unitPort('fraction'),
  initialPhysicalUnqualifiedCapacity: unitPort('fraction'),
  initialUnqualifiedQualificationMonths: unitPort('month'),
  projects: vectorPort<DefenseCapacityProject>(DEFENSE_PROJECT_PORT),
  stockpileMonths: unitPort('month'),
  qualificationTimeMultiplier: unitPort('1'),
  projectTimeMultiplier: unitPort('1'),
  waiverPath: vectorPort<number>(unitPort('fraction')),
  compliantCostPremium: unitPort('fraction'),
  emergencySpotPremium: unitPort('fraction'),
});
export const PARTIAL_DEFENSE_PARAMS_PORT = partialObjectPort(DEFENSE_PARAMS_PORT);

export const DEFENSE_MONTH_PORT = objectPort<DefenseSourcingMonth>({
  month: unitPort('step-index'),
  calendarYear: unitPort('calendar-year'),
  calendarMonth: unitPort('calendar-month'),
  physicalCompliantCapacity: unitPort('fraction'),
  qualifiedCompliantCapacity: unitPort('fraction'),
  waiverAllowance: unitPort('fraction'),
  waiverSupplyUsed: unitPort('fraction'),
  stockpileRemaining: unitPort('month'),
  usableInputSupply: unitPort('fraction'),
  compliantShareOfInput: unitPort('fraction'),
  procurementCostIndex: unitPort('1'),
  defenseOutput: unitPort('fraction'),
});
export const DEFENSE_MONTHS_PORT = vectorPort<DefenseSourcingMonth>(DEFENSE_MONTH_PORT);

export const MATERIAL_INPUT_PORT = objectPort<MaterialInput>({
  from: metadataPort('string', 'Upstream material or component identifier.'),
  costShare: unitPort('fraction'),
  critical: metadataPort('boolean', 'Whether this input is a fixed-proportion bottleneck.'),
  maxSubstitution: { ...unitPort('fraction'), optional: true },
  substitutionRampMonths: { ...unitPort('month'), optional: true },
});

export const MATERIAL_NODE_PORT = objectPort<MaterialNode>({
  id: metadataPort('string', 'Material-network node identifier.'),
  label: metadataPort('string', 'Material-network node label.'),
  kind: metadataPort('string', 'Material-network node kind.'),
  inputs: vectorPort<MaterialInput>(MATERIAL_INPUT_PORT),
  inventoryMonths: unitPort('month'),
  finalDemandWeight: unitPort('fraction'),
});
export const MATERIAL_NODES_PORT = vectorPort<MaterialNode>(MATERIAL_NODE_PORT);

export const DYNAMIC_NETWORK_OPTIONS_PORT = objectPort<DynamicNetworkOptions>({
  months: unitPort('month'),
  supplyPaths: recordPort<readonly number[]>(vectorPort<number>(unitPort('fraction'))),
  revision: metadataPort('string', 'Dynamic-network model revision.'),
  inventoryMonthsOverride: { ...unitPort('month'), optional: true },
  inventoryMonthsByInput: {
    ...recordPort<number>(unitPort('month')),
    optional: true,
  },
  inventoryMultiplier: { ...unitPort('1'), optional: true },
  substitutionMultiplier: { ...unitPort('1'), optional: true },
  priceElasticity: unitPort('1'),
  pricePassThrough: unitPort('1'),
  curtailmentNodeId: {
    ...metadataPort('string', 'Optional output node used to identify curtailment.'),
    optional: true,
  },
  curtailmentThreshold: { ...unitPort('fraction'), optional: true },
});

export const DYNAMIC_MONTH_PORT = objectPort<DynamicMonthResult>({
  month: unitPort('step-index'),
  outputRatios: recordPort<number>(unitPort('fraction')),
  weightedFinalOutput: unitPort('fraction'),
  finalBasketPriceMultiple: unitPort('1'),
  sourcePriceMultiples: recordPort<number>(unitPort('1')),
});
export const DYNAMIC_NETWORK_PORT = objectPort<DynamicNetworkResult>({
  months: vectorPort<DynamicMonthResult>(DYNAMIC_MONTH_PORT),
  firstCurtailmentMonth: { ...unitPort('step-index'), nullable: true },
  recoveryMonth: { ...unitPort('step-index'), nullable: true },
  peakSourcePriceMultiple: unitPort('1'),
  cumulativeWeightedOutputLoss: unitPort('month'),
});

export const PRICE_SHOCK_PORT = objectPort<PriceShockResult>({
  nodePriceChanges: recordPort<number>(unitPort('fraction')),
  finalBasketPriceChange: unitPort('fraction'),
});

// Hormuz commodity stock-flow model -----------------------------------------

export const HORMUZ_SCENARIO_PORT = objectPort<HormuzScenario>({
  id: metadataPort('string', 'Hormuz scenario identifier.'),
  label: metadataPort('string', 'Hormuz scenario label.'),
  description: metadataPort('string', 'Hormuz scenario description.'),
  startYear: unitPort('calendar-year'),
  startMonth: unitPort('calendar-month'),
  throughputPath: vectorPort<number>(
    measurementPort('fraction', hormuzEstimands.commodityThroughputShare),
    'Physical commodity cargo-throughput capacity relative to baseline; never vessel counts.',
  ),
  bypassAvailabilityPath: { ...vectorPort<number>(unitPort('fraction')), optional: true },
});

const tradedCommodityFields = (flowUnit: 'mb/d' | 'Bcf/day') => ({
  globalDemandPerDay: unitPort(flowUnit),
  hormuzFlowPerDay: unitPort(flowUnit),
  alternativeSupplyMaxPerDay: unitPort(flowUnit),
  alternativeSupplyRampMonths: unitPort('month'),
  accessibleInventoryDays: unitPort('day'),
  maxInventoryDrawPerDay: unitPort(flowUnit),
  demandElasticity: unitPort('1'),
  mediumRunDemandElasticity: unitPort('1'),
  demandElasticityRampMonths: unitPort('month'),
  routeRiskPremium: unitPort('fraction'),
  maxPriceMultiple: unitPort('1'),
});

export const OIL_PARAMS_PORT = objectPort<OilMarketParams>({
  ...tradedCommodityFields('mb/d'),
  crudeHormuzFlowPerDay: unitPort('mb/d'),
  bypassCapacityPerDay: unitPort('mb/d'),
  bypassRampMonths: unitPort('month'),
  exporterSpareStorageMillionBarrels: unitPort('million-barrel'),
  exporterStorageDrainMaxPerDay: unitPort('mb/d'),
});

export const LNG_PARAMS_PORT = objectPort<TradedCommodityParams>(tradedCommodityFields('Bcf/day'));

export const FERTILIZER_PARAMS_PORT = objectPort<FertilizerMarketParams>({
  hormuzTradeShare: unitPort('fraction'),
  tradedSupplyShareOfGlobalUse: unitPort('fraction'),
  alternativeSupplyMaxShare: unitPort('fraction'),
  alternativeSupplyRampMonths: unitPort('month'),
  accessibleInventoryMonths: unitPort('month'),
  maxInventoryDrawSharePerMonth: unitPort('fraction/month'),
  demandElasticity: unitPort('1'),
  gasPricePassThrough: unitPort('1'),
  maxPriceMultiple: unitPort('1'),
  fertilizerYieldContribution: unitPort('fraction'),
  harvestPassThrough: unitPort('fraction'),
});

export const HORMUZ_REGION_EXPOSURE_PORT = objectPort<HormuzRegionExposure>({
  hormuzOilShareOfUse: unitPort('fraction'),
  lngShareOfGasUse: unitPort('fraction'),
  hormuzShareOfLng: unitPort('fraction'),
  physicalVulnerability: unitPort('1'),
  oilConsumptionWeight: unitPort('fraction'),
  gasConsumptionWeight: unitPort('fraction'),
  oilTermsOfTradeSensitivity: unitPort('fraction'),
  gulfShutInGdpSensitivity: unitPort('fraction'),
});

export const HORMUZ_PARAMS_PORT = objectPort<HormuzModelParams>({
  oil: OIL_PARAMS_PORT,
  lng: LNG_PARAMS_PORT,
  globalGasDemandPerDay: unitPort('Bcf/day'),
  fertilizer: FERTILIZER_PARAMS_PORT,
  regions: recordPort<HormuzRegionExposure>(HORMUZ_REGION_EXPOSURE_PORT, { keys: REGIONS }),
  globalLngPricePassThrough: unitPort('fraction'),
  regionalScarcityPricePremium: unitPort('fraction'),
});

const oilMonthFields = {
  baselineDemandPerDay: unitPort('mb/d'),
  normalHormuzFlowPerDay: unitPort('mb/d'),
  blockedHormuzFlowPerDay: unitPort('mb/d'),
  bypassFlowPerDay: unitPort('mb/d'),
  alternativeSupplyPerDay: unitPort('mb/d'),
  inventoryDrawPerDay: unitPort('mb/d'),
  inventoryRemaining: unitPort('million-barrel'),
  physicalSupplyRatio: unitPort('fraction'),
  priceMultiple: unitPort('1'),
  demandRatio: unitPort('fraction'),
  rationingRatio: unitPort('fraction'),
  netPhysicalSupplyLossPerDay: unitPort('mb/d'),
};
const lngMonthFields = {
  baselineDemandPerDay: unitPort('Bcf/day'),
  normalHormuzFlowPerDay: unitPort('Bcf/day'),
  blockedHormuzFlowPerDay: unitPort('Bcf/day'),
  bypassFlowPerDay: unitPort('Bcf/day'),
  alternativeSupplyPerDay: unitPort('Bcf/day'),
  inventoryDrawPerDay: unitPort('Bcf/day'),
  inventoryRemaining: unitPort('Bcf'),
  physicalSupplyRatio: unitPort('fraction'),
  priceMultiple: unitPort('1'),
  demandRatio: unitPort('fraction'),
  rationingRatio: unitPort('fraction'),
  netPhysicalSupplyLossPerDay: unitPort('Bcf/day'),
};
export const OIL_MONTH_PORT = objectPort<CommodityMonthResult>(oilMonthFields);
export const LNG_MONTH_PORT = objectPort<CommodityMonthResult>(lngMonthFields);

export const FERTILIZER_MONTH_PORT = objectPort<FertilizerMonthResult>({
  blockedTradeShare: unitPort('fraction'),
  alternativeSupplyShare: unitPort('fraction'),
  inventoryDrawShare: unitPort('fraction'),
  inventoryRemainingMonths: unitPort('month'),
  physicalSupplyRatio: unitPort('fraction'),
  priceMultiple: unitPort('1'),
  applicationRatio: unitPort('fraction'),
  cropYieldMultiplier: unitPort('1'),
  foodAvailabilityMultiplier: unitPort('1'),
});

export const REGIONAL_HORMUZ_MONTH_PORT = objectPort<RegionalHormuzMonthResult>({
  oilAvailability: unitPort('fraction'),
  gasAvailability: unitPort('fraction'),
  oilPriceMultiple: unitPort('1'),
  gasPriceMultiple: unitPort('1'),
  tradeIncomeFactor: unitPort('1'),
});

export const HORMUZ_MONTH_PORT = objectPort<HormuzMonthResult>({
  index: unitPort('step-index'),
  year: unitPort('calendar-year'),
  month: unitPort('calendar-month'),
  throughput: unitPort('fraction'),
  oil: OIL_MONTH_PORT,
  lng: LNG_MONTH_PORT,
  fertilizer: FERTILIZER_MONTH_PORT,
  gulfCrudeShutInPerDay: unitPort('mb/d'),
  gulfExportStorageRemainingMillionBarrels: unitPort('million-barrel'),
  regional: recordPort<RegionalHormuzMonthResult>(REGIONAL_HORMUZ_MONTH_PORT, { keys: REGIONS }),
});
export const HORMUZ_MONTHS_PORT = vectorPort<HormuzMonthResult>(HORMUZ_MONTH_PORT);

export const ANNUAL_REGIONAL_HORMUZ_PORT = objectPort<AnnualRegionalHormuzShock>({
  oilAvailability: unitPort('fraction'),
  gasAvailability: unitPort('fraction'),
  oilPriceMultiple: unitPort('1'),
  gasPriceMultiple: unitPort('1'),
  tradeIncomeFactor: unitPort('1'),
});

export const ANNUAL_HORMUZ_PORT = objectPort<AnnualHormuzShock>({
  year: unitPort('calendar-year'),
  monthsModeled: unitPort('month'),
  oilPriceMultiple: unitPort('1'),
  gasPriceMultiple: unitPort('1'),
  fertilizerPriceMultiple: unitPort('1'),
  oilAvailability: unitPort('fraction'),
  lngAvailability: unitPort('fraction'),
  fertilizerApplicationRatio: unitPort('fraction'),
  cropYieldMultiplier: unitPort('1'),
  foodAvailabilityMultiplier: unitPort('1'),
  peakOilPriceMultiple: unitPort('1'),
  peakLngPriceMultiple: unitPort('1'),
  peakFertilizerPriceMultiple: unitPort('1'),
  peakGulfCrudeShutInPerDay: unitPort('mb/d'),
  regional: recordPort<AnnualRegionalHormuzShock>(ANNUAL_REGIONAL_HORMUZ_PORT, { keys: REGIONS }),
});
export const ANNUAL_HORMUZ_ROWS_PORT = vectorPort<AnnualHormuzShock>(ANNUAL_HORMUZ_PORT);

export const HORMUZ_RESULT_PORT = objectPort<HormuzSimulationResult>({
  scenario: HORMUZ_SCENARIO_PORT,
  params: HORMUZ_PARAMS_PORT,
  months: HORMUZ_MONTHS_PORT,
  annual: ANNUAL_HORMUZ_ROWS_PORT,
});

export const WEBER_ENERGY_BRIDGE_OPTIONS_PORT =
  objectPort<WeberEnergyBridgeOptions>({
    horizonMonths: unitPort('month'),
    region: metadataPort(
      'string',
      'Regional Hormuz price series used as the euro-area proxy.',
    ),
    oilInputShare: unitPort('fraction'),
    gasInputShare: unitPort('fraction'),
    oilPetroleumTransmissionShare: unitPort('fraction'),
    gasUtilitiesTransmissionShare: unitPort('fraction'),
    coreAllocationShare: unitPort('fraction'),
    coreCpiWeight: unitPort('fraction'),
    networkScale: unitPort('1'),
  });

export const WEBER_ENERGY_PRICE_MONTH_PORT =
  objectPort<WeberEnergyPriceMonth>({
    index: unitPort('step-index'),
    year: unitPort('calendar-year'),
    month: unitPort('calendar-month'),
    oilPriceMultiple: unitPort('1'),
    gasPriceMultiple: unitPort('1'),
    importEnergyPriceMultiple: unitPort('1'),
    oilIndirectCpiImpactPct: unitPort('percentage-point'),
    gasIndirectCpiImpactPct: unitPort('percentage-point'),
    networkIndirectCpiImpactPct: unitPort('percentage-point'),
    networkCoreSubindexPriceGapPct: unitPort('%'),
    networkOtherCpiContributionPct: unitPort('percentage-point'),
  });

export const WEBER_ENERGY_PRICE_PATHS_PORT =
  objectPort<WeberEnergyPricePaths>({
    months: vectorPort<WeberEnergyPriceMonth>(
      WEBER_ENERGY_PRICE_MONTH_PORT,
    ),
    importEnergyPricePath: vectorPort<number>(unitPort('1')),
    networkCorePriceGapPathPct: vectorPort<number>(unitPort('%')),
    networkOtherCpiContributionPathPct:
      vectorPort<number>(unitPort('percentage-point')),
  });

export const HORMUZ_WEBER_INFLATION_SCENARIO_PORT =
  objectPort<HormuzWeberInflationScenario>({
    id: metadataPort(
      'string',
      'Composed Hormuz-Weber-inflation scenario identifier.',
    ),
    label: metadataPort(
      'string',
      'Composed Hormuz-Weber-inflation scenario label.',
    ),
    hormuzScenario: HORMUZ_SCENARIO_PORT,
    hormuzParams: HORMUZ_PARAMS_PORT,
    inflationScenario: ENERGY_INFLATION_SCENARIO_PORT,
    bridgeOptions: WEBER_ENERGY_BRIDGE_OPTIONS_PORT,
  });

export const HORMUZ_WEBER_INFLATION_RESULT_PORT =
  objectPort<HormuzWeberInflationResult>({
    scenario: HORMUZ_WEBER_INFLATION_SCENARIO_PORT,
    revision: metadataPort(
      'string',
      'Composed Hormuz-Weber-inflation model revision.',
    ),
    hormuz: HORMUZ_RESULT_PORT,
    pricePaths: WEBER_ENERGY_PRICE_PATHS_PORT,
    inflation: ENERGY_INFLATION_NETWORK_RESULT_PORT,
  });

// Outbreak and composed macro experiment ------------------------------------

export const COUNTERMEASURE_PORT = objectPort<CountermeasureParams>({
  startDay: unitPort('day'),
  coursesPerThousandPerDay: unitPort('course/kpeople/day'),
  effectivenessAgainstInfection: unitPort('fraction'),
});

export const PROBABILISTIC_FORECAST_PORT = objectPort<ProbabilisticForecast>({
  model: metadataPort('string', 'Forecast-model identifier.'),
  originIndex: measurementPort(
    'step-index',
    outbreakForecastEstimands.originIndex,
  ),
  targetIndex: measurementPort(
    'step-index',
    outbreakForecastEstimands.targetIndex,
  ),
  horizon: measurementPort('week', outbreakForecastEstimands.horizon),
  pointLog: measurementPort(
    'log1p-admissions',
    outbreakForecastEstimands.admissionsLog,
  ),
  quantilesLog: recordPort<number>(measurementPort(
    'log1p-admissions',
    outbreakForecastEstimands.admissionsLog,
  ), {
    keys: FORECAST_QUANTILES.map(String),
  }),
});

export const WAR_AI_YEAR_PORT = objectPort<WarAiYearResult>({
  year: unitPort('calendar-year'),
  baselineGdp: unitPort('$T/year'),
  aiOnlyGdp: unitPort('$T/year'),
  warOnlyGdp: unitPort('$T/year'),
  warAndAiGdp: unitPort('$T/year'),
  warGdpEffectWithoutAiPct: unitPort('%'),
  warGdpEffectWithAiPct: unitPort('%'),
  aiCushionPctPoints: unitPort('percentage-point'),
  gdpInteraction: unitPort('$T/year'),
  dataCenterLoadTWh: unitPort('TWh/year'),
  dataCenterCapexSpend: unitPort('$T/year'),
  combinedInvestment: unitPort('$T/year'),
  combinedInterestRate: unitPort('fraction'),
  combinedEnergyBurden: unitPort('fraction'),
  combinedFoodStress: unitPort('fraction'),
  combinedCapitalFundingGap: unitPort('$T/year'),
  combinedConstrainedWorkingShare: unitPort('fraction'),
  regionalAiCushionPctPoints: recordPort<number>(unitPort('percentage-point'), { keys: REGIONS }),
});
export const WAR_AI_YEARS_PORT = vectorPort<WarAiYearResult>(WAR_AI_YEAR_PORT);

// Exported only to make intentional string fields explicit at registry sites.
export const STRING_ID_PORT = metadataPort('string', 'Identifier.');
export const BOOLEAN_PORT = metadataPort('boolean', 'Boolean flag.');

// Keep this import visible to TypeScript: dynamic tariff allocation keys are
// intentionally validated as string metadata plus fraction-valued map keys.
export type _TradeSectorIdForSchema = TradeSectorId;

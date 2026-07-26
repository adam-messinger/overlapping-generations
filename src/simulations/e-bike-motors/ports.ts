import {
  measurementPort,
  metadataPort,
  objectPort,
  recordPort,
  unitPort,
  vectorPort,
} from 'tsimulation';
import {
  EBIKE_REGIONS,
  MOTOR_ARCHITECTURES,
  MOTOR_SUPPLIERS,
  type EbikeMotorScenario,
  type EbikeRegion,
  type EntrantStrategy,
  type RegionalAdoptionParams,
} from './data.js';
import { ebikeMotorEstimands } from './measurement-contracts.js';
import type {
  EbikeMotorResult,
  EbikeMotorYear,
  EntrantFinancialYear,
  RegionalMotorYear,
} from './model.js';

const architectureFractions = () =>
  recordPort<number>(unitPort('fraction'), {
    keys: MOTOR_ARCHITECTURES,
  });

const architectureVolumes = () =>
  recordPort<number>(
    measurementPort(
      'driveunit/year',
      ebikeMotorEstimands.architectureDriveUnits,
    ),
    { keys: MOTOR_ARCHITECTURES },
  );

const supplierVolumes = () =>
  recordPort<number>(
    measurementPort(
      'driveunit/year',
      ebikeMotorEstimands.supplierDriveUnits,
    ),
    { keys: MOTOR_SUPPLIERS },
  );

function regionalAdoptionPort(region: EbikeRegion) {
  return objectPort<RegionalAdoptionParams>({
    id: metadataPort('string', 'Region identifier.'),
    label: metadataPort('string', 'Region label and source boundary.'),
    baseYear: measurementPort(
      'calendar-year',
      ebikeMotorEstimands.calendarYear,
    ),
    populationMillions: measurementPort(
      'Mpeople',
      ebikeMotorEstimands.regionalPopulation[region],
    ),
    annualPopulationGrowth: unitPort('fraction/year'),
    initialInstalledStock: measurementPort(
      'ebike',
      ebikeMotorEstimands.regionalInstalledStock[region],
    ),
    baseAnnualSales: measurementPort(
      'ebike/year',
      ebikeMotorEstimands.regionalAnnualMarketFlow[region],
    ),
    saturationStockPerThousandPeople: unitPort('ebike/kpeople'),
    innovationRate: unitPort('fraction/year'),
    imitationRate: unitPort('fraction/year'),
    replacementYears: unitPort('year'),
    baseMidDriveShare: unitPort('fraction'),
    targetMidDriveShare: unitPort('fraction'),
    architectureTransitionRate: unitPort('fraction/year'),
    entrantOpenness: architectureFractions(),
  });
}

const regionalAdoptionPorts = Object.fromEntries(
  EBIKE_REGIONS.map((region) => [region, regionalAdoptionPort(region)]),
) as Record<
  EbikeRegion,
  ReturnType<typeof regionalAdoptionPort>
>;

export const ENTRANT_STRATEGY_PORT = objectPort<EntrantStrategy>({
  id: metadataPort('string', 'Entrant-strategy identifier.'),
  label: metadataPort('string', 'Entrant-strategy label.'),
  launchYear: unitPort('calendar-year'),
  architecture: metadataPort('string', 'Hub or mid-drive architecture.'),
  productScore: unitPort('1'),
  priceIndex: unitPort('1'),
  serviceScore: unitPort('fraction'),
  integrationScore: unitPort('fraction'),
  bankabilityScore: unitPort('fraction'),
  maxAddressableShare: unitPort('fraction'),
  shareAdjustmentRate: unitPort('fraction/year'),
  initialQualifiedOems: measurementPort(
    'oemprogram',
    ebikeMotorEstimands.entrantQualifiedOems,
  ),
  annualOemWins: unitPort('oemprogram/year'),
  matureUnitsPerOem: unitPort('driveunit/oemprogram/year'),
  oemRampYears: unitPort('year'),
  initialAnnualCapacity: measurementPort(
    'driveunit/year',
    ebikeMotorEstimands.entrantCapacity,
  ),
  annualCapacityGrowth: unitPort('fraction/year'),
  maximumAnnualCapacity: measurementPort(
    'driveunit/year',
    ebikeMotorEstimands.entrantCapacity,
  ),
  averageSellingPriceDollars: unitPort('$/driveunit'),
  initialVariableCostDollars: unitPort('$/driveunit'),
  learningRatePerDoubling: unitPort('fraction'),
  learningReferenceUnits: unitPort('driveunit'),
  warrantyRevenueShare: unitPort('fraction'),
  serviceLifeYears: unitPort('year'),
  annualServiceCostPerActiveUnitDollars: unitPort('$/driveunit/year'),
  preLaunchAnnualResearchMillion: unitPort('$M/year'),
  postLaunchAnnualResearchMillion: unitPort('$M/year'),
  annualSalesAndServiceMillion: unitPort('$M/year'),
  annualGeneralAdminMillion: unitPort('$M/year'),
  engineeringMillionPerOemWin: unitPort('$M/oemprogram'),
  capexDollarsPerAddedCapacity: unitPort('$/(driveunit/year)'),
  discountRate: unitPort('fraction/year'),
  terminalGrowthRate: unitPort('fraction/year'),
});

export const EBIKE_MOTOR_SCENARIO_PORT = objectPort<EbikeMotorScenario>({
  id: metadataPort('string', 'Scenario identifier.'),
  label: metadataPort('string', 'Scenario label.'),
  startYear: measurementPort(
    'calendar-year',
    ebikeMotorEstimands.calendarYear,
  ),
  endYear: measurementPort(
    'calendar-year',
    ebikeMotorEstimands.calendarYear,
  ),
  regions: objectPort<EbikeMotorScenario['regions']>({
    us: regionalAdoptionPorts.us,
    eu: regionalAdoptionPorts.eu,
    china: regionalAdoptionPorts.china,
    japan: regionalAdoptionPorts.japan,
    row: regionalAdoptionPorts.row,
  }),
  entrant: ENTRANT_STRATEGY_PORT,
});

function regionalMotorYearPort(region: EbikeRegion) {
  return objectPort<RegionalMotorYear>({
    region: metadataPort('string', 'Region identifier.'),
    populationMillions: measurementPort(
      'Mpeople',
      ebikeMotorEstimands.regionalPopulation[region],
    ),
    beginningInstalledStock: measurementPort(
      'ebike',
      ebikeMotorEstimands.regionalInstalledStock[region],
    ),
    replacementSales: measurementPort(
      'ebike/year',
      ebikeMotorEstimands.regionalReplacementFlow[region],
    ),
    newAdoptionSales: measurementPort(
      'ebike/year',
      ebikeMotorEstimands.regionalNewAdoptionFlow[region],
    ),
    annualSales: measurementPort(
      'ebike/year',
      ebikeMotorEstimands.regionalAnnualMarketFlow[region],
    ),
    endingInstalledStock: measurementPort(
      'ebike',
      ebikeMotorEstimands.regionalInstalledStock[region],
    ),
    stockPerThousandPeople: unitPort('ebike/kpeople'),
    architectureShares: architectureFractions(),
    entrantAddressableUnits: measurementPort(
      'driveunit/year',
      ebikeMotorEstimands.regionalEntrantAddressableFlow[region],
    ),
    entrantUnits: measurementPort(
      'driveunit/year',
      ebikeMotorEstimands.regionalEntrantDeliveredFlow[region],
    ),
    entrantShareOfAddressableMarket: unitPort('fraction'),
  });
}

const regionalMotorYearPorts = Object.fromEntries(
  EBIKE_REGIONS.map((region) => [region, regionalMotorYearPort(region)]),
) as Record<EbikeRegion, ReturnType<typeof regionalMotorYearPort>>;

export const ENTRANT_FINANCIAL_YEAR_PORT =
  objectPort<EntrantFinancialYear>({
    annualUnits: measurementPort(
      'driveunit/year',
      ebikeMotorEstimands.supplierDriveUnits,
    ),
    activeInstalledBase: unitPort('driveunit'),
    qualifiedOemPrograms: measurementPort(
      'oemprogram',
      ebikeMotorEstimands.entrantQualifiedOems,
    ),
    oemProgramCapacity: measurementPort(
      'driveunit/year',
      ebikeMotorEstimands.entrantCapacity,
    ),
    factoryCapacity: measurementPort(
      'driveunit/year',
      ebikeMotorEstimands.entrantCapacity,
    ),
    averageSellingPriceDollars: unitPort('$/driveunit'),
    variableCostDollars: unitPort('$/driveunit'),
    revenueMillion: measurementPort(
      '$M/year',
      ebikeMotorEstimands.entrantRevenue,
    ),
    costOfGoodsMillion: unitPort('$M/year'),
    grossProfitMillion: unitPort('$M/year'),
    grossMargin: unitPort('fraction'),
    researchExpenseMillion: unitPort('$M/year'),
    salesAndServiceExpenseMillion: unitPort('$M/year'),
    installedBaseServiceExpenseMillion: unitPort('$M/year'),
    generalAdminExpenseMillion: unitPort('$M/year'),
    oemEngineeringExpenseMillion: unitPort('$M/year'),
    operatingExpenseMillion: unitPort('$M/year'),
    operatingIncomeMillion: measurementPort(
      '$M/year',
      ebikeMotorEstimands.entrantOperatingIncome,
    ),
    capacityCapexMillion: unitPort('$M/year'),
    freeCashFlowMillion: measurementPort(
      '$M/year',
      ebikeMotorEstimands.entrantCashFlow,
    ),
    cumulativeCashFlowMillion: measurementPort(
      '$M',
      ebikeMotorEstimands.entrantCumulativeCash,
    ),
    discountedCashFlowMillion: unitPort('$M/year'),
  });

export const EBIKE_MOTOR_YEAR_PORT = objectPort<EbikeMotorYear>({
  year: measurementPort(
    'calendar-year',
    ebikeMotorEstimands.calendarYear,
  ),
  regions: objectPort<EbikeMotorYear['regions']>({
    us: regionalMotorYearPorts.us,
    eu: regionalMotorYearPorts.eu,
    china: regionalMotorYearPorts.china,
    japan: regionalMotorYearPorts.japan,
    row: regionalMotorYearPorts.row,
  }),
  globalAnnualSales: unitPort('ebike/year'),
  globalDriveUnitDemand: measurementPort(
    'driveunit/year',
    ebikeMotorEstimands.globalDriveUnitDemand,
  ),
  globalInstalledStock: unitPort('ebike'),
  architectureVolumes: architectureVolumes(),
  supplierVolumes: supplierVolumes(),
  entrant: ENTRANT_FINANCIAL_YEAR_PORT,
});

export const EBIKE_MOTOR_RESULT_PORT = objectPort<EbikeMotorResult>({
  scenario: EBIKE_MOTOR_SCENARIO_PORT,
  years: vectorPort<EbikeMotorYear>(EBIKE_MOTOR_YEAR_PORT),
  firstOperatingBreakevenYear: {
    ...measurementPort(
      'calendar-year',
      ebikeMotorEstimands.calendarYear,
    ),
    nullable: true,
  },
  cashPaybackYear: {
    ...measurementPort(
      'calendar-year',
      ebikeMotorEstimands.calendarYear,
    ),
    nullable: true,
  },
  peakFundingNeedMillion: unitPort('$M'),
  explicitHorizonNpvMillion: unitPort('$M'),
  terminalValueAtHorizonMillion: unitPort('$M'),
  enterpriseNpvMillion: unitPort('$M'),
  endingAnnualUnits: measurementPort(
    'driveunit/year',
    ebikeMotorEstimands.supplierDriveUnits,
  ),
  endingRevenueMillion: measurementPort(
    '$M/year',
    ebikeMotorEstimands.entrantRevenue,
  ),
  endingOperatingIncomeMillion: measurementPort(
    '$M/year',
    ebikeMotorEstimands.entrantOperatingIncome,
  ),
  endingOperatingMargin: unitPort('fraction'),
  endingGlobalSupplierShare: unitPort('fraction'),
  entrantOutcome: metadataPort(
    'string',
    'Deterministic scale-and-profitability classification.',
  ),
});

/**
 * Reusable, field-level contracts for mixed-unit global-model records.
 *
 * Keeping these schemas in one domain-level module makes producer, transform,
 * lag, and consumer declarations compare the same semantic structure instead
 * of duplicating strings at each wiring site.
 */

import {
  metadataPort,
  objectConnector,
  objectPort,
  recordConnector,
  recordPort,
  unitPort,
} from 'tsimulation';
import { ENERGY_SOURCES, REGIONS } from './domain-types.js';

type EnergyValues = Record<(typeof ENERGY_SOURCES)[number], number>;

const energyCapacityFields = {
  solar: unitPort('GW'),
  wind: unitPort('GW'),
  gas: unitPort('GW'),
  coal: unitPort('GW'),
  nuclear: unitPort('GW'),
  hydro: unitPort('GW'),
  battery: unitPort('GWh'),
};

const energyAdditionFields = {
  solar: unitPort('GW/year'),
  wind: unitPort('GW/year'),
  gas: unitPort('GW/year'),
  coal: unitPort('GW/year'),
  nuclear: unitPort('GW/year'),
  hydro: unitPort('GW/year'),
  battery: unitPort('GWh/year'),
};

const energyLcoeFields = {
  solar: unitPort('$/MWh'),
  wind: unitPort('$/MWh'),
  gas: unitPort('$/MWh'),
  coal: unitPort('$/MWh'),
  nuclear: unitPort('$/MWh'),
  hydro: unitPort('$/MWh'),
  battery: unitPort('$/kWh'),
};

export const ENERGY_CAPACITY_PORT = objectPort<EnergyValues>(
  energyCapacityFields,
  'Generation power capacity plus battery energy capacity.',
);
export const ENERGY_ADDITION_PORT = objectPort<EnergyValues>(
  energyAdditionFields,
  'Annual generation and battery capacity additions.',
);
export const ENERGY_LCOE_PORT = objectPort<EnergyValues>(
  energyLcoeFields,
  'Generator LCOEs plus battery storage cost.',
);

export const ENERGY_CAPACITY_CONNECTOR = objectConnector<EnergyValues>(
  'record', energyCapacityFields, 'Generation power capacity plus battery energy capacity.',
);
export const REGIONAL_ENERGY_CAPACITY_CONNECTOR = recordConnector<EnergyValues>(
  'nested-record', ENERGY_CAPACITY_PORT,
  { keys: REGIONS, description: 'Capacity by region and technology.' },
);
export const ENERGY_ADDITION_CONNECTOR = objectConnector<EnergyValues>(
  'record', energyAdditionFields, 'Annual generation and battery capacity additions.',
);
export const REGIONAL_ENERGY_ADDITION_CONNECTOR = recordConnector<EnergyValues>(
  'nested-record', ENERGY_ADDITION_PORT,
  { keys: REGIONS, description: 'Annual capacity additions by region and technology.' },
);
export const ENERGY_LCOE_CONNECTOR = objectConnector<EnergyValues>(
  'record', energyLcoeFields, 'Generator LCOEs plus battery storage cost.',
);
export const REGIONAL_ENERGY_LCOE_CONNECTOR = recordConnector<EnergyValues>(
  'nested-record', ENERGY_LCOE_PORT,
  { keys: REGIONS, description: 'Technology costs by region.' },
);

interface RegionalDemandRow {
  gdp: number;
  growthRate: number;
  energyIntensity: number;
  totalFinalEnergy: number;
  electricityDemand: number;
  nonElectricEnergy: number;
  nonElectricEnergyPotential: number;
  gdpPerWorking: number;
  electricityPerWorking: number;
}

const regionalDemandRow = objectPort<RegionalDemandRow>({
  gdp: unitPort('$T/year'),
  growthRate: unitPort('fraction/year'),
  energyIntensity: unitPort('MWh/$k'),
  totalFinalEnergy: unitPort('TWh/year'),
  electricityDemand: unitPort('TWh/year'),
  nonElectricEnergy: unitPort('TWh/year'),
  nonElectricEnergyPotential: unitPort('TWh/year'),
  gdpPerWorking: unitPort('$/people/year'),
  electricityPerWorking: unitPort('kWh/people/year'),
});

export const REGIONAL_DEMAND_CONNECTOR = recordConnector<RegionalDemandRow>(
  'record', regionalDemandRow,
  { keys: REGIONS, description: 'Regional macroeconomic and energy demand results.' },
);

interface RegionalAllocationRow {
  tfpFactor: number;
  laborFactor: number;
  climateFactorChange: number;
  energyFactorChange: number;
  energyBurden: number;
  reliabilityFactor: number;
  gdpShare: number;
}

const regionalAllocationRow = objectPort<RegionalAllocationRow>({
  tfpFactor: unitPort('fraction'),
  laborFactor: unitPort('fraction'),
  climateFactorChange: unitPort('fraction'),
  energyFactorChange: unitPort('fraction'),
  energyBurden: unitPort('fraction'),
  reliabilityFactor: unitPort('fraction'),
  gdpShare: unitPort('fraction'),
});

export const REGIONAL_ALLOCATION_CONNECTOR = recordConnector<RegionalAllocationRow>(
  'record', regionalAllocationRow,
  { keys: REGIONS, description: 'Regional GDP allocation factors and shares.' },
);

interface SectorRow {
  total: number;
  electric: number;
  nonElectric: number;
  electrificationRate: number;
}

const sectorRow = objectPort<SectorRow>({
  total: unitPort('TWh/year'),
  electric: unitPort('TWh/year'),
  nonElectric: unitPort('TWh/year'),
  electrificationRate: unitPort('fraction'),
});

export const DEMAND_SECTORS_CONNECTOR = objectConnector<Record<'transport' | 'buildings' | 'industry', SectorRow>>(
  'record',
  { transport: sectorRow, buildings: sectorRow, industry: sectorRow },
  'Demand and electrification by end-use sector.',
);

interface MineralRow {
  demand: number;
  grossDemand: number;
  recycled: number;
  cumulative: number;
  recyclingRate: number;
  reserveRatio: number;
}

const mineralRow = objectPort<MineralRow>({
  demand: unitPort('Mt/year'),
  grossDemand: unitPort('Mt/year'),
  recycled: unitPort('Mt/year'),
  cumulative: unitPort('Mt'),
  recyclingRate: unitPort('fraction'),
  reserveRatio: unitPort('fraction'),
});

export const MINERALS_CONNECTOR = objectConnector<Record<'copper' | 'lithium' | 'rareEarths' | 'steel', MineralRow>>(
  'nested-record',
  { copper: mineralRow, lithium: mineralRow, rareEarths: mineralRow, steel: mineralRow },
  'Demand, recycling, and depletion by mineral.',
);

interface LandRow {
  farmland: number;
  urban: number;
  forest: number;
  desert: number;
  yield: number;
  yieldDamageFactor: number;
  forestChange: number;
}

const landFields = {
  farmland: unitPort('Mha'),
  urban: unitPort('Mha'),
  forest: unitPort('Mha'),
  desert: unitPort('Mha'),
  yield: unitPort('t/ha/year'),
  yieldDamageFactor: unitPort('fraction'),
  forestChange: unitPort('Mha/year'),
};
export const LAND_CONNECTOR = objectConnector<LandRow>('record', landFields, 'Global land-use ledger.');

interface CarbonRow {
  sequestration: number;
  deforestationEmissions: number;
  decayEmissions: number;
  netFlux: number;
  cumulativeSequestration: number;
}

const carbonFields = {
  sequestration: unitPort('GtCO2/year'),
  deforestationEmissions: unitPort('GtCO2/year'),
  decayEmissions: unitPort('GtCO2/year'),
  netFlux: unitPort('GtCO2/year'),
  cumulativeSequestration: unitPort('GtCO2'),
};
export const CARBON_CONNECTOR = objectConnector<CarbonRow>('record', carbonFields, 'Land-carbon stock and flow ledger.');

interface FoodRow {
  caloriesPerCapita: number;
  proteinShare: number;
  grainEquivalent: number;
}

const foodFields = {
  caloriesPerCapita: unitPort('kcal/people/day'),
  proteinShare: unitPort('fraction'),
  grainEquivalent: unitPort('Mt/year'),
};
export const FOOD_CONNECTOR = objectConnector<FoodRow>('record', foodFields, 'Food availability and demand.');

interface CohortRow {
  label: string;
  birthYearStart: number;
  birthYearEnd: number;
  ageStart: number;
  ageEnd: number;
  status: string;
  population: number;
  youngPopulation: number;
  workingPopulation: number;
  oldPopulation: number;
  assets: number;
  liabilities: number;
  netWorth: number;
  assetsPerCapita: number;
  liabilitiesPerCapita: number;
  netWorthPerCapita: number;
  laborIncome: number;
  taxes: number;
  pensionHealthcare: number;
  education: number;
  bequestsReceived: number;
  bequestsGiven: number;
  ownFunds: number;
  creditAllocated: number;
  desiredCapital: number;
  fundedCapital: number;
  fundingGap: number;
  borrowingLimitGap: number;
  creditRationingGap: number;
  constraintShare: number;
  cumulativeTaxes: number;
  cumulativeTransfers: number;
  cumulativeEducation: number;
  cumulativePensionHealthcare: number;
  cumulativeBequestsReceived: number;
  cumulativeBequestsGiven: number;
  cumulativeFundingGap: number;
  cumulativeNetTransfer: number;
}

const cohortFlowFields = {
  laborIncome: unitPort('$T/year'),
  taxes: unitPort('$T/year'),
  pensionHealthcare: unitPort('$T/year'),
  education: unitPort('$T/year'),
  bequestsReceived: unitPort('$T/year'),
  bequestsGiven: unitPort('$T/year'),
  ownFunds: unitPort('$T/year'),
  creditAllocated: unitPort('$T/year'),
  desiredCapital: unitPort('$T/year'),
  fundedCapital: unitPort('$T/year'),
  fundingGap: unitPort('$T/year'),
  borrowingLimitGap: unitPort('$T/year'),
  creditRationingGap: unitPort('$T/year'),
};

const cohortRow = objectPort<CohortRow>({
  label: metadataPort('string', 'Birth-cohort label.'),
  birthYearStart: unitPort('year'),
  birthYearEnd: unitPort('year'),
  ageStart: unitPort('year'),
  ageEnd: unitPort('year'),
  status: metadataPort('string', 'Lifecycle status.'),
  population: unitPort('people'),
  youngPopulation: unitPort('people'),
  workingPopulation: unitPort('people'),
  oldPopulation: unitPort('people'),
  assets: unitPort('$T'),
  liabilities: unitPort('$T'),
  netWorth: unitPort('$T'),
  assetsPerCapita: unitPort('$/people'),
  liabilitiesPerCapita: unitPort('$/people'),
  netWorthPerCapita: unitPort('$/people'),
  ...cohortFlowFields,
  constraintShare: unitPort('fraction'),
  cumulativeTaxes: unitPort('$T'),
  cumulativeTransfers: unitPort('$T'),
  cumulativeEducation: unitPort('$T'),
  cumulativePensionHealthcare: unitPort('$T'),
  cumulativeBequestsReceived: unitPort('$T'),
  cumulativeBequestsGiven: unitPort('$T'),
  cumulativeFundingGap: unitPort('$T'),
  cumulativeNetTransfer: unitPort('$T'),
});

const cohortMap = recordPort<CohortRow>(cohortRow, { description: 'Dynamic five-year birth cohorts.' });
export const COHORT_ACCOUNTS_CONNECTOR = recordConnector<CohortRow>(
  'record', cohortRow, { description: 'Global cohort ledger keyed by birth cohort.' },
);
export const REGIONAL_COHORT_ACCOUNTS_CONNECTOR = recordConnector<Record<string, CohortRow>>(
  'nested-record', cohortMap,
  { keys: REGIONS, description: 'Cohort ledgers nested by region.' },
);

/**
 * Explicit global -> US municipal integration boundary.
 *
 * The global model has an OECD region, not a US region. OECD GDP per capita
 * is therefore an auditable proxy for the national real-income path, not a
 * claim that the global model separately forecasts the United States.
 */
import type { Region } from '../../src/domain-types.js';
import {
  runSimulation,
  type SimulationParams,
  type SimulationResult,
  type YearResult,
} from '../../src/simulation.js';
import {
  defineAdapter,
  defineEstimand,
  defineSemanticCrosswalk,
  measurementPort,
  runAdapter,
  type EstimandContract,
} from 'tsimulation';
import { runAgingSim, type AgingSimResult } from './simulation.js';
import { type NationalMacroPath, type NationalMacroPoint } from './macro-path.js';

export const DEFAULT_HOUSE_PRICE_INCOME_PREMIUM = 0.002;

export interface GlobalMacroPathOptions {
  region?: Region;
  housePriceIncomePremium?: number;
  source?: string;
}

export interface GlobalCityRunConfig {
  years?: number;
  minPop?: number;
  region?: Region;
  housePriceIncomePremium?: number;
  globalParams?: SimulationParams;
  cityParams?: Record<string, Record<string, unknown>>;
}

export interface GlobalCityRunResult {
  global: SimulationResult;
  macroPath: NationalMacroPath;
  city: AgingSimResult;
}

export interface GlobalMacroAdapterInput {
  result: SimulationResult;
  options?: GlobalMacroPathOptions;
}

type EstimandSpec = Omit<
  EstimandContract,
  'schemaVersion' | 'id' | 'version'
>;

function macroEstimand(id: string, spec: EstimandSpec): EstimandContract {
  return defineEstimand({
    schemaVersion: 'tsimulation.estimand/v1',
    id: `estimand.global-city.${id}`,
    version: '1.0.0',
    ...spec,
  });
}

const selectedRegionResidents = {
  id: 'population.global-model.selected-region-residents',
  label: 'Residents of the selected global-model region',
  universe: 'People represented by the selected global-model region; OECD by default.',
} as const;

const usMunicipalHouseholds = {
  id: 'population.us.municipal-households',
  label: 'Households represented in the U.S. municipal aging model',
  universe: 'Households in municipalities included by the aging-places simulation.',
} as const;

const selectedRegion = {
  id: 'geo.global-model.selected-region',
  label: 'Selected global-model region',
  boundaryVersion: 'global-model-region-v1',
} as const;

const usMunicipalMarkets = {
  id: 'geo.us.municipal-markets',
  label: 'U.S. municipal housing and household-income markets',
  boundaryVersion: 'aging-places-city-universe-v1',
} as const;

const world = {
  id: 'geo.world',
  label: 'World',
  boundaryVersion: 'global-model-boundary-v1',
} as const;

const annualMean = {
  kind: 'interval',
  interval: 'calendar-year',
  aggregation: 'mean',
  calendar: 'gregorian',
} as const;

const globalCityEstimands = {
  regionalGdpPerCapita: macroEstimand('selected-region-real-gdp-per-capita', {
    quantityKind: 'economy.real-ppp-gdp-per-capita',
    measure: { kind: 'rate', accounting: 'gross' },
    population: selectedRegionResidents,
    geography: selectedRegion,
    ratio: {
      numerator: 'selected-region-real-ppp-gdp',
      denominator: 'selected-region-resident-population',
    },
    time: annualMean,
    valuation: {
      priceBasis: 'real',
      currency: 'international-dollar',
      priceYear: 2017,
      exchangeRateBasis: 'ppp',
    },
  }),
  municipalIncomeGrowth: macroEstimand('municipal-real-household-income-growth', {
    quantityKind: 'households.real-income-forward-growth-rate',
    measure: { kind: 'rate', accounting: 'net' },
    population: usMunicipalHouseholds,
    geography: usMunicipalMarkets,
    ratio: {
      numerator: 'next-year-real-household-income-index',
      denominator: 'current-year-real-household-income-index',
    },
    time: annualMean,
  }),
  municipalHousePriceDrift: macroEstimand('municipal-real-house-price-drift', {
    quantityKind: 'housing.real-house-price-forward-growth-rate',
    measure: { kind: 'rate', accounting: 'net' },
    population: usMunicipalHouseholds,
    geography: usMunicipalMarkets,
    ratio: {
      numerator: 'next-year-real-house-price-index',
      denominator: 'current-year-real-house-price-index',
    },
    time: annualMean,
  }),
  interestRate: macroEstimand('global-real-interest-rate', {
    quantityKind: 'finance.global-real-interest-rate',
    measure: { kind: 'rate' },
    geography: world,
    time: annualMean,
  }),
  regionalWacc: macroEstimand('selected-region-wacc', {
    quantityKind: 'finance.weighted-average-cost-of-capital',
    measure: { kind: 'rate' },
    geography: selectedRegion,
    time: annualMean,
  }),
  energyBurden: macroEstimand('global-energy-burden', {
    quantityKind: 'economy.energy-expenditure-share-of-gdp',
    measure: { kind: 'share', accounting: 'gross' },
    geography: world,
    ratio: {
      numerator: 'global-energy-expenditure',
      denominator: 'global-real-ppp-gdp',
    },
    time: annualMean,
  }),
  climateDamages: macroEstimand('global-climate-damages', {
    quantityKind: 'climate.realized-output-damage-share',
    measure: { kind: 'share', accounting: 'net' },
    geography: world,
    ratio: {
      numerator: 'global-output-lost-to-modeled-climate-damages',
      denominator: 'counterfactual-global-output-before-climate-damages',
    },
    time: annualMean,
  }),
  aggregateCapitalCoverage: macroEstimand('global-aggregate-capital-coverage', {
    quantityKind: 'capital.aggregate-investment-coverage',
    measure: { kind: 'share', accounting: 'net' },
    geography: world,
    ratio: {
      numerator: 'realized-general-investment',
      denominator: 'diagnostic-desired-aggregate-capital-formation',
    },
    time: annualMean,
  }),
  constrainedWorkingShare: macroEstimand('global-constrained-working-share', {
    quantityKind: 'generations.capital-constrained-working-age-population-share',
    measure: { kind: 'share', accounting: 'net' },
    geography: world,
    ratio: {
      numerator: 'working-age-people-capital-constrained-by-any-modeled-channel',
      denominator: 'working-age-people',
    },
    time: annualMean,
  }),
  borrowingConstrainedWorkingShare: macroEstimand(
    'global-borrowing-constrained-working-share',
    {
      quantityKind: 'generations.borrowing-constrained-working-age-population-share',
      measure: { kind: 'share', accounting: 'net' },
      geography: world,
      ratio: {
        numerator: 'working-age-people-constrained-by-borrowing-access',
        denominator: 'working-age-people',
      },
      time: annualMean,
    },
  ),
  regionalFossilShare: macroEstimand('selected-region-fossil-energy-share', {
    quantityKind: 'energy.fossil-share-of-primary-energy',
    measure: { kind: 'share', accounting: 'gross' },
    geography: selectedRegion,
    ratio: {
      numerator: 'selected-region-fossil-primary-energy',
      denominator: 'selected-region-total-primary-energy',
    },
    time: annualMean,
  }),
} as const;

const gdpToIncomeGrowth = defineSemanticCrosswalk({
  schemaVersion: 'tsimulation.crosswalk/v1',
  id: 'crosswalk.global-city.regional-gdp-per-capita-to-municipal-income-growth',
  version: '1.0.0',
  description: 'Use the selected global region real PPP GDP-per-capita forward change as a proxy for U.S. municipal real household-income growth.',
  source: globalCityEstimands.regionalGdpPerCapita,
  target: globalCityEstimands.municipalIncomeGrowth,
  method: 'Compute next/current annual GDP per capita minus one, then apply that rate to each included city.',
  assumptions: [
    'OECD real PPP GDP per capita is the default proxy because the global model has no U.S.-only region.',
    'The same national proxy growth rate applies to every included municipality.',
    'Changes in household income track GDP per capita one-for-one before city-specific dynamics.',
  ],
  uncertainty: {
    kind: 'qualitative',
    description: 'Proxy error includes OECD-versus-U.S., GDP-versus-household-income, and national-versus-city divergence.',
  },
});

const gdpToHousePriceDrift = defineSemanticCrosswalk({
  schemaVersion: 'tsimulation.crosswalk/v1',
  id: 'crosswalk.global-city.regional-gdp-per-capita-to-municipal-house-price-drift',
  version: '1.0.0',
  description: 'Derive a U.S. municipal real house-price drift from selected-region GDP-per-capita growth plus a fixed premium.',
  source: globalCityEstimands.regionalGdpPerCapita,
  target: globalCityEstimands.municipalHousePriceDrift,
  method: 'Compute next/current annual GDP per capita minus one and add housePriceIncomePremium.',
  assumptions: [
    'The premium is constant across cities and years.',
    'Local supply elasticity, migration, and mortgage-market conditions are not represented in this bridge.',
  ],
  uncertainty: {
    kind: 'qualitative',
    description: 'The fixed premium is a scenario assumption, not an estimated city-level forecasting equation.',
  },
});

function regionalGdpPerCapita(result: YearResult, region: Region): number {
  const gdp = result.regionalGdp[region];
  const population = result.regionalPopulation[region];
  if (!(gdp > 0) || !(population > 0)) {
    throw new Error('global bridge: non-positive ' + region + ' GDP or population in ' + result.year);
  }
  return (gdp * 1e12) / population;
}

function buildGlobalMacroPathUnchecked(
  result: SimulationResult,
  options: GlobalMacroPathOptions = {},
): NationalMacroPath {
  const region = options.region ?? 'oecd';
  const premium = options.housePriceIncomePremium ?? DEFAULT_HOUSE_PRICE_INCOME_PREMIUM;
  if (!Number.isFinite(premium) || premium < -0.05 || premium > 0.05) {
    throw new Error('global bridge: housePriceIncomePremium out of [-0.05,0.05]');
  }
  if (result.results.length < 2) {
    throw new Error('global bridge needs a look-ahead year to derive annual income growth');
  }

  const points: Record<number, NationalMacroPoint> = {};
  for (let index = 0; index < result.results.length - 1; index++) {
    const current = result.results[index];
    const next = result.results[index + 1];
    if (next.year !== current.year + 1) {
      throw new Error('global bridge requires consecutive annual results at ' + current.year);
    }
    const currentGdpPerCapita = regionalGdpPerCapita(current, region);
    const nextGdpPerCapita = regionalGdpPerCapita(next, region);
    const realIncomeGrowth = nextGdpPerCapita / currentGdpPerCapita - 1;
    points[current.year] = {
      year: current.year,
      realIncomeGrowth,
      realHousePriceDrift: realIncomeGrowth + premium,
      interestRate: current.interestRate,
      regionalWacc: current.regionalWACC[region],
      energyBurden: current.energyBurden,
      climateDamages: current.damages,
      aggregateCapitalCoverage: current.aggregateCapitalCoverage,
      constrainedWorkingShare: current.constrainedWorkingShare,
      borrowingConstrainedWorkingShare: current.borrowingConstrainedWorkingShare,
      regionalFossilShare: current.regionalFossilShare[region],
      regionalGdpPerCapita: currentGdpPerCapita,
    };
  }

  return {
    source: options.source ?? 'overlapping-generations global baseline',
    geography: region + ' proxy (global model has no US-only region)',
    incomeGrowthBasis: region + ' real PPP GDP per capita, forward annual change',
    points,
  };
}

/**
 * Strict semantic contract for the global-model -> municipal-model bridge.
 *
 * Identity mappings remain the same modeled quantities. The two crosswalks
 * make the OECD/selected-region proxy assumptions explicit and inspectable.
 */
export const globalCityMacroAdapter = defineAdapter<
  GlobalMacroAdapterInput,
  NationalMacroPath
>({
  id: 'global-olg-to-aging-places-macro-path',
  version: '2.0.0',
  description: 'Derive annual U.S. municipal macro assumptions from a selected region of the global OLG model.',
  sourceModel: 'global-olg',
  targetModel: 'aging-places',
  sourceTimeScale: { kind: 'annual' },
  targetTimeScale: { kind: 'annual' },
  semanticValidation: 'required',
  sourcePorts: {
    regionalGdpPerCapita: measurementPort(
      '$/people/year',
      globalCityEstimands.regionalGdpPerCapita,
    ),
    interestRate: measurementPort(
      'fraction',
      globalCityEstimands.interestRate,
    ),
    regionalWacc: measurementPort(
      'fraction',
      globalCityEstimands.regionalWacc,
    ),
    energyBurden: measurementPort(
      'fraction',
      globalCityEstimands.energyBurden,
    ),
    climateDamages: measurementPort(
      'fraction',
      globalCityEstimands.climateDamages,
    ),
    aggregateCapitalCoverage: measurementPort(
      'fraction',
      globalCityEstimands.aggregateCapitalCoverage,
    ),
    constrainedWorkingShare: measurementPort(
      'fraction',
      globalCityEstimands.constrainedWorkingShare,
    ),
    borrowingConstrainedWorkingShare: measurementPort(
      'fraction',
      globalCityEstimands.borrowingConstrainedWorkingShare,
    ),
    regionalFossilShare: measurementPort(
      'fraction',
      globalCityEstimands.regionalFossilShare,
    ),
  },
  targetPorts: {
    realIncomeGrowth: measurementPort(
      'fraction/year',
      globalCityEstimands.municipalIncomeGrowth,
    ),
    realHousePriceDrift: measurementPort(
      'fraction/year',
      globalCityEstimands.municipalHousePriceDrift,
    ),
    interestRate: measurementPort(
      'fraction',
      globalCityEstimands.interestRate,
    ),
    regionalWacc: measurementPort(
      'fraction',
      globalCityEstimands.regionalWacc,
    ),
    energyBurden: measurementPort(
      'fraction',
      globalCityEstimands.energyBurden,
    ),
    climateDamages: measurementPort(
      'fraction',
      globalCityEstimands.climateDamages,
    ),
    aggregateCapitalCoverage: measurementPort(
      'fraction',
      globalCityEstimands.aggregateCapitalCoverage,
    ),
    constrainedWorkingShare: measurementPort(
      'fraction',
      globalCityEstimands.constrainedWorkingShare,
    ),
    borrowingConstrainedWorkingShare: measurementPort(
      'fraction',
      globalCityEstimands.borrowingConstrainedWorkingShare,
    ),
    regionalFossilShare: measurementPort(
      'fraction',
      globalCityEstimands.regionalFossilShare,
    ),
    regionalGdpPerCapita: measurementPort(
      '$/people/year',
      globalCityEstimands.regionalGdpPerCapita,
    ),
  },
  portMappings: [
    {
      source: 'regionalGdpPerCapita',
      target: 'realIncomeGrowth',
      conversion: {
        kind: 'custom',
        description: 'Compute the forward annual percentage change from consecutive GDP-per-capita levels.',
        convert: (value) => value,
      },
      aggregation: { kind: 'none' },
      crosswalk: gdpToIncomeGrowth,
    },
    {
      source: 'regionalGdpPerCapita',
      target: 'realHousePriceDrift',
      conversion: {
        kind: 'custom',
        description: 'Compute forward GDP-per-capita growth and add the configured house-price premium.',
        convert: (value) => value,
      },
      aggregation: { kind: 'none' },
      crosswalk: gdpToHousePriceDrift,
    },
    {
      source: 'regionalGdpPerCapita',
      target: 'regionalGdpPerCapita',
      conversion: { kind: 'identity' },
      aggregation: { kind: 'none' },
    },
    ...([
      'interestRate',
      'regionalWacc',
      'energyBurden',
      'climateDamages',
      'aggregateCapitalCoverage',
      'constrainedWorkingShare',
      'borrowingConstrainedWorkingShare',
      'regionalFossilShare',
    ] as const).map((name) => ({
      source: name,
      target: name,
      conversion: { kind: 'identity' as const },
      aggregation: { kind: 'none' as const },
    })),
  ],
  adapt: ({ result, options = {} }) =>
    buildGlobalMacroPathUnchecked(result, options),
});

export function buildGlobalMacroPath(
  result: SimulationResult,
  options: GlobalMacroPathOptions = {},
): NationalMacroPath {
  return runAdapter(globalCityMacroAdapter, { result, options }).target;
}

export function runGlobalCitySimulation(
  config: GlobalCityRunConfig = {},
): GlobalCityRunResult {
  const years = config.years ?? 40;
  if (!Number.isInteger(years) || years < 1 || years > 75) {
    throw new Error('global bridge: years out of [1,75]');
  }
  const startYear = 2025;
  const requestedStart = config.globalParams?.startYear;
  const requestedEnd = config.globalParams?.endYear;
  if (requestedStart !== undefined && requestedStart !== startYear) {
    throw new Error('global bridge owns startYear=2025');
  }
  if (requestedEnd !== undefined && requestedEnd !== startYear + years) {
    throw new Error(
      'global bridge needs endYear=' + (startYear + years) + ' for the final look-ahead growth rate',
    );
  }

  const global = runSimulation({
    ...(config.globalParams ?? {}),
    startYear,
    endYear: startYear + years,
  });
  const macroPath = buildGlobalMacroPath(global, {
    region: config.region,
    housePriceIncomePremium: config.housePriceIncomePremium,
  });
  const city = runAgingSim({
    epoch: '2023',
    years,
    minPop: config.minPop,
    params: config.cityParams,
    macroPath,
  });
  return { global, macroPath, city };
}

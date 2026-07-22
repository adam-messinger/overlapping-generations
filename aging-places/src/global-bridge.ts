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

function regionalGdpPerCapita(result: YearResult, region: Region): number {
  const gdp = result.regionalGdp[region];
  const population = result.regionalPopulation[region];
  if (!(gdp > 0) || !(population > 0)) {
    throw new Error('global bridge: non-positive ' + region + ' GDP or population in ' + result.year);
  }
  return (gdp * 1e12) / population;
}

export function buildGlobalMacroPath(
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

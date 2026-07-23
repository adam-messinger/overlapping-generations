import { runSimulation } from '../../src/simulation.js';
import { expect, printSummary, test } from '../../src/test-utils.js';
import {
  DEFAULT_HOUSE_PRICE_INCOME_PREMIUM,
  buildGlobalMacroPath,
  globalCityMacroAdapter,
  runGlobalCitySimulation,
} from './global-bridge.js';
import { type NationalMacroPath, type NationalMacroPoint } from './macro-path.js';
import { annualMarketRate } from './modules/market.js';
import { runAgingSim } from './simulation.js';

function point(
  year: number,
  realIncomeGrowth: number,
  realHousePriceDrift: number,
): NationalMacroPoint {
  return {
    year,
    realIncomeGrowth,
    realHousePriceDrift,
    interestRate: 0.04,
    regionalWacc: 0.05,
    energyBurden: 0.06,
    climateDamages: 0.02,
    aggregateCapitalCoverage: 0.9,
    constrainedWorkingShare: 0.2,
    borrowingConstrainedWorkingShare: 0.1,
    regionalFossilShare: 0.4,
    regionalGdpPerCapita: 60_000,
  };
}

test('global bridge converts consecutive OECD GDP-per-capita levels into forward growth', () => {
  const global = runSimulation({ startYear: 2025, endYear: 2027 });
  const path = buildGlobalMacroPath(global);
  const current = global.results[0];
  const next = global.results[1];
  const currentPerCapita =
    current.regionalGdp.oecd * 1e12 / current.regionalPopulation.oecd;
  const nextPerCapita =
    next.regionalGdp.oecd * 1e12 / next.regionalPopulation.oecd;
  const expectedGrowth = nextPerCapita / currentPerCapita - 1;

  expect(Object.keys(path.points)).toHaveLength(2);
  expect(path.points[2025].realIncomeGrowth).toBeCloseTo(expectedGrowth, 12);
  expect(
    path.points[2025].realHousePriceDrift - path.points[2025].realIncomeGrowth,
  ).toBeCloseTo(DEFAULT_HOUSE_PRICE_INCOME_PREMIUM, 12);
  expect(path.points[2025].aggregateCapitalCoverage)
    .toBeCloseTo(current.aggregateCapitalCoverage, 12);
});

test('global bridge records proxy assumptions as semantic crosswalks', () => {
  expect(globalCityMacroAdapter.semanticValidation).toBe('required');
  const crosswalks = globalCityMacroAdapter.portMappings
    .flatMap((mapping) => mapping.crosswalk?.id ?? []);
  expect(crosswalks).toEqual([
    'crosswalk.global-city.regional-gdp-per-capita-to-municipal-income-growth',
    'crosswalk.global-city.regional-gdp-per-capita-to-municipal-house-price-drift',
  ]);
  expect(globalCityMacroAdapter.portMappings.filter(
    (mapping) => mapping.conversion.kind === 'identity',
  )).toHaveLength(9);
});

test('market annual paths override scalar rates only in the requested years', () => {
  expect(annualMarketRate({ 2025: -0.01 }, 0.01, 2025)).toBe(-0.01);
  expect(annualMarketRate({ 2025: -0.01 }, 0.01, 2026)).toBe(0.01);
  expect(annualMarketRate(null, 0.012, 2025)).toBe(0.012);
});

test('municipal simulation compounds the supplied macro income path', () => {
  const macroPath: NationalMacroPath = {
    source: 'test macro path',
    geography: 'test',
    incomeGrowthBasis: 'test levels',
    points: {
      2025: point(2025, 0.02, 0.022),
      2026: point(2026, -0.01, -0.008),
    },
  };
  const result = runAgingSim({
    epoch: '2023',
    years: 2,
    minPop: 100_000,
    macroPath,
  });
  const index = result.data.statics.income0.findIndex((value) => value > 1);
  const expected = result.data.statics.income0[index] * 1.02 * 0.99;
  expect(result.finalIncome[index]).toBeCloseTo(expected, 7);
  expect(result.macroPath?.source).toBe('test macro path');
});

test('municipal simulation rejects a partial macro horizon', () => {
  const partial: NationalMacroPath = {
    source: 'partial test path',
    geography: 'test',
    incomeGrowthBasis: 'test levels',
    points: { 2025: point(2025, 0.01, 0.012) },
  };
  expect(() => runAgingSim({
    epoch: '2023',
    years: 2,
    minPop: 100_000,
    macroPath: partial,
  })).toThrow('macro path missing year 2026');
});

test('coupled runner owns the look-ahead horizon and returns both simulations', () => {
  const result = runGlobalCitySimulation({ years: 1, minPop: 100_000 });
  expect(result.global.years).toHaveLength(2);
  expect(result.city.years).toHaveLength(1);
  expect(result.city.macroPath?.points[2025].year).toBe(2025);
});

printSummary();

import { runGlobalCitySimulation } from '../src/global-bridge.js';
import { runAgingSim } from '../src/simulation.js';

function numberArg(name: string, fallback: number): number {
  const prefix = '--' + name + '=';
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  if (!arg) return fallback;
  const value = Number(arg.slice(prefix.length));
  if (!Number.isFinite(value)) throw new Error('invalid --' + name);
  return value;
}

function sum(values: ArrayLike<number>): number {
  let total = 0;
  for (let index = 0; index < values.length; index++) total += values[index];
  return total;
}

function finalValue(values: number[]): number {
  return values[values.length - 1];
}

function annualizedGrowth(first: number, last: number, years: number): number {
  return (last / first) ** (1 / years) - 1;
}

function regionalGdpShare(
  result: { regionalGdp: Record<string, number> },
  region: string,
): number {
  const total = Object.values(result.regionalGdp).reduce((value, current) => value + current, 0);
  return result.regionalGdp[region] / total;
}

function main(): void {
  const years = numberArg('years', 40);
  const minPop = numberArg('min-pop', 250);
  const standalone = runAgingSim({ epoch: '2023', years, minPop });
  const coupled = runGlobalCitySimulation({ years, minPop });
  const points = coupled.city.years.map((year) => coupled.macroPath.points[year]);
  const compoundedIncome = points.reduce(
    (index, macroPoint) => index * (1 + macroPoint.realIncomeGrowth),
    1,
  );
  const annualizedIncomeGrowth = compoundedIncome ** (1 / years) - 1;
  const initialIncomeTotal = sum(coupled.city.data.statics.income0);
  const firstGlobal = coupled.global.results[0];
  const lastGlobal = coupled.global.results[coupled.global.results.length - 1];
  const firstOecdShare = regionalGdpShare(firstGlobal, 'oecd');
  const lastOecdShare = regionalGdpShare(lastGlobal, 'oecd');

  console.log(JSON.stringify({
    horizon: {
      firstCityTransition: coupled.city.years[0],
      lastCityTransition: coupled.city.years[coupled.city.years.length - 1],
      cityEndpoint: coupled.city.years[coupled.city.years.length - 1] + 1,
      globalLookAheadEnd: coupled.global.years[coupled.global.years.length - 1],
    },
    bridge: {
      source: coupled.macroPath.source,
      geography: coupled.macroPath.geography,
      incomeGrowthBasis: coupled.macroPath.incomeGrowthBasis,
      annualizedRealIncomeGrowth: +annualizedIncomeGrowth.toFixed(4),
      first: points[0],
      last: points[points.length - 1],
    },
    globalAudit: {
      annualizedRealGdpGrowth: +annualizedGrowth(
        firstGlobal.gdp,
        lastGlobal.gdp,
        years,
      ).toFixed(4),
      oecdGdpShare: {
        first: +firstOecdShare.toFixed(4),
        last: +lastOecdShare.toFixed(4),
        changePercentagePoints: +((lastOecdShare - firstOecdShare) * 100).toFixed(1),
      },
      warning: 'OECD GDP per capita is a model-derived proxy; it is not a validated US income forecast.',
    },
    city: {
      standalone: {
        finalMeanPriceIndex: +finalValue(standalone.national.meanPriceIndex).toFixed(4),
        finalMedianPriceIndex: +finalValue(standalone.national.medianPriceIndex).toFixed(4),
        finalIncomeIndex: +(sum(standalone.finalIncome) / initialIncomeTotal).toFixed(4),
      },
      globallyCoupled: {
        finalMeanPriceIndex: +finalValue(coupled.city.national.meanPriceIndex).toFixed(4),
        finalMedianPriceIndex: +finalValue(coupled.city.national.medianPriceIndex).toFixed(4),
        finalIncomeIndex: +(sum(coupled.city.finalIncome) / initialIncomeTotal).toFixed(4),
      },
    },
    interpretation: [
      'The city baseline remains standalone unless a macro path is supplied.',
      'This first slice consumes income growth and national real-price drift only.',
      'Interest, WACC, energy burden, damages, and capital constraints are carried for later channels.',
      'OECD is a proxy because the global model does not yet expose a US-only region.',
      'Absolute coupled price and income levels remain scenario outputs, not decision-grade US forecasts.',
    ],
  }, null, 2));
}

main();

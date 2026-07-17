/** Illustrative university-throughput retention scenarios for 2025-2065. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, OUT_DIR, ensureDirs, writeCsv } from './lib.js';
import { runAgingSim, type AgingSimResult } from '../src/simulation.js';
import { universityThroughputRetention } from '../src/modules/attraction.js';

const YEARS = 40;

interface ScenarioSpec {
  name: 'highRetention' | 'baseRetention' | 'lowRetention';
  annualRetention: number;
  floor: number;
}

const SCENARIOS: ScenarioSpec[] = [
  { name: 'highRetention', annualRetention: 1, floor: 1 },
  { name: 'baseRetention', annualRetention: 0.985, floor: 0.65 },
  { name: 'lowRetention', annualRetention: 0.96, floor: 0.25 },
];

function sum(values: Float64Array): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

function mean(values: Float64Array): number {
  return sum(values) / values.length;
}

function round(value: number, places = 6): number {
  return +value.toFixed(places);
}

function run(spec: ScenarioSpec): AgingSimResult {
  return runAgingSim({
    epoch: '2023',
    years: YEARS,
    minPop: 250,
    params: {
      attraction: {
        universityThroughputAnnualRetention: spec.annualRetention,
        universityThroughputFloor: spec.floor,
      },
    },
  });
}

function main(): void {
  ensureDirs();
  const runs = new Map(SCENARIOS.map((spec) => [spec.name, run(spec)]));
  const high = runs.get('highRetention')!;
  const base = runs.get('baseRetention')!;
  const low = runs.get('lowRetention')!;
  const statics = high.data.statics;
  const rows = statics.geoid.map((geoid, index) => {
    const highPrice = high.simRealLogGrowth[index];
    const basePrice = base.simRealLogGrowth[index];
    const lowPrice = low.simRealLogGrowth[index];
    const highPopulation = high.finalPop[index];
    const basePopulation = base.finalPop[index];
    const lowPopulation = low.finalPop[index];
    const throughputSignal = 0.10 * statics.z.logUni15[index] + 0.05 * statics.z.logUni60[index];
    return {
      geoid,
      name: statics.name[index],
      state: statics.state[index],
      originPopulation: statics.pop0[index],
      housingMarketEligible: statics.housingMarketEligible[index] === 1,
      throughputSignal,
      highPrice,
      basePrice,
      lowPrice,
      lowMinusHighPrice: lowPrice - highPrice,
      highPopulation,
      basePopulation,
      lowPopulation,
      lowMinusHighPopulationLog: Math.log(Math.max(1, lowPopulation) / Math.max(1, highPopulation)),
    };
  });
  const eligible = rows.filter((row) => row.originPopulation >= 10_000 && row.housingMarketEligible);
  const adverse = [...eligible].sort((a, b) => a.lowMinusHighPrice - b.lowMinusHighPrice);
  const beneficiaries = [...eligible].sort((a, b) => b.lowMinusHighPrice - a.lowMinusHighPrice);
  const compact = (row: typeof rows[number]): Record<string, string | number> => ({
    geoid: row.geoid,
    locality: `${row.name}, ${row.state}`,
    originPopulation: round(row.originPopulation, 0),
    throughputSignal: round(row.throughputSignal, 4),
    lowMinusHighRealLogPriceGrowth: round(row.lowMinusHighPrice, 5),
    lowMinusHighFinalPopulationLog: round(row.lowMinusHighPopulationLog, 5),
  });
  const result = {
    status: 'illustrative stress test; retention paths are not yet calibrated from Japan',
    interpretation: 'Only the enrollment-throughput contribution contracts; campuses, employment anchors, health systems, and human capital do not disappear mechanically.',
    scenarios: SCENARIOS.map((spec) => {
      const result = runs.get(spec.name)!;
      return {
        ...spec,
        finalThroughputRetention: round(
          universityThroughputRetention(spec.annualRetention, spec.floor, YEARS - 1), 4,
        ),
        finalMeanRealPriceIndex: round(mean(result.finalPriceIndex), 4),
        finalModeledPlacePopulation: round(sum(result.finalPop), 0),
        finalShareDecliningReal: round(result.national.shareDecliningReal.at(-1) ?? NaN, 4),
        totalUnmetInternalMigration: round(
          result.national.unmetInternalMigration.reduce((total, value) => total + value, 0), 2,
        ),
      };
    }),
    eligibleLocalities: eligible.length,
    mostAdverselyExposed: adverse.slice(0, 25).map(compact),
    relativeBeneficiaries: beneficiaries.slice(0, 25).map(compact),
  };
  const target = path.join(DATA_DIR, 'institutional-scenarios.json');
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
  writeCsv(
    path.join(OUT_DIR, 'institutional-scenario-exposure.csv.gz'),
    [
      'geoid', 'name', 'state', 'originPopulation', 'housingMarketEligible',
      'universityThroughputSignal', 'highRetentionRealLogPriceGrowth',
      'baseRetentionRealLogPriceGrowth', 'lowRetentionRealLogPriceGrowth',
      'lowMinusHighRealLogPriceGrowth', 'highRetentionFinalPopulation',
      'baseRetentionFinalPopulation', 'lowRetentionFinalPopulation',
      'lowMinusHighFinalPopulationLog',
    ],
    rows.map((row) => [
      row.geoid, row.name, row.state, row.originPopulation, Number(row.housingMarketEligible),
      row.throughputSignal, row.highPrice, row.basePrice, row.lowPrice,
      row.lowMinusHighPrice, row.highPopulation, row.basePopulation, row.lowPopulation,
      row.lowMinusHighPopulationLog,
    ]),
  );
  console.log(`wrote ${target}`);
  console.log(JSON.stringify({
    scenarios: result.scenarios,
    mostAdverselyExposed: result.mostAdverselyExposed.slice(0, 10),
    relativeBeneficiaries: result.relativeBeneficiaries.slice(0, 10),
  }, null, 2));
}

main();

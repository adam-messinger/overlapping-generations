/**
 * Simulation Comparison Script
 *
 * Runs both manual and autowired simulation paths with identical params
 * and reports per-field, per-year divergences.
 *
 * Usage:
 *   npx tsx src/simulation-compare.ts
 *   npx tsx src/simulation-compare.ts --scenario=net-zero
 *   npx tsx src/simulation-compare.ts --all-scenarios
 */

import { runSimulationManual, SimulationParams, YearResult } from './simulation.js';
import { runAutowiredFull } from './simulation-autowired.js';
import { loadScenario } from './scenario.js';
import * as fs from 'fs';

// Numeric fields to compare (skip object/nested fields)
const NUMERIC_FIELDS: (keyof YearResult)[] = [
  'population', 'working', 'dependency', 'effectiveWorkers', 'collegeShare',
  'gdp', 'electricityDemand', 'electrificationRate', 'totalFinalEnergy',
  'nonElectricEnergy', 'finalEnergyPerCapitaDay',
  'transportElectrification', 'buildingsElectrification', 'industryElectrification',
  'oilConsumption', 'gasConsumption', 'coalConsumption', 'hydrogenConsumption',
  'nonElectricEmissions',
  'totalEnergyCost', 'energyBurden', 'burdenDamage',
  'capitalStock', 'investment', 'savingsRate', 'stability', 'interestRate', 'robotsDensity',
  'solarLCOE', 'windLCOE', 'batteryCost',
  'gridIntensity', 'electricityEmissions', 'fossilShare',
  'curtailmentTWh', 'curtailmentRate',
  'temperature', 'co2ppm', 'damages', 'cumulativeEmissions',
  'copperDemand', 'lithiumDemand', 'copperCumulative', 'lithiumCumulative',
  'farmland', 'forest', 'desert', 'yieldDamageFactor',
  'proteinShare', 'grainEquivalent',
  'forestNetFlux', 'cumulativeSequestration',
  'robotLoadTWh', 'expansionMultiplier', 'adjustedDemand', 'robotsPer1000',
];

interface FieldDivergence {
  field: string;
  maxAbsDiff: number;
  maxRelDiff: number;
  worstYear: number;
  manualVal: number;
  autowiredVal: number;
}

function compareResults(manual: YearResult[], autowired: YearResult[]): FieldDivergence[] {
  const divergences: FieldDivergence[] = [];

  for (const field of NUMERIC_FIELDS) {
    let maxAbsDiff = 0;
    let maxRelDiff = 0;
    let worstYear = 0;
    let worstManual = 0;
    let worstAutowired = 0;

    for (let i = 0; i < manual.length && i < autowired.length; i++) {
      const m = manual[i][field] as number;
      const a = autowired[i][field] as number;

      if (m === undefined || a === undefined || isNaN(m) || isNaN(a)) continue;

      const absDiff = Math.abs(m - a);
      const denom = Math.max(Math.abs(m), Math.abs(a), 1e-10);
      const relDiff = absDiff / denom;

      if (absDiff > maxAbsDiff) {
        maxAbsDiff = absDiff;
        maxRelDiff = relDiff;
        worstYear = manual[i].year;
        worstManual = m;
        worstAutowired = a;
      }
    }

    divergences.push({
      field,
      maxAbsDiff,
      maxRelDiff,
      worstYear,
      manualVal: worstManual,
      autowiredVal: worstAutowired,
    });
  }

  return divergences.sort((a, b) => b.maxRelDiff - a.maxRelDiff);
}

function printReport(scenario: string, divergences: FieldDivergence[]) {
  console.log(`\n${'='.repeat(90)}`);
  console.log(`Scenario: ${scenario}`);
  console.log(`${'='.repeat(90)}`);

  const significant = divergences.filter(d => d.maxRelDiff > 1e-6);

  if (significant.length === 0) {
    console.log('  All fields match within 1e-6 relative tolerance.');
    return;
  }

  console.log(
    `${'Field'.padEnd(30)}  ${'MaxRelDiff'.padStart(12)}  ${'MaxAbsDiff'.padStart(12)}  ` +
    `${'Year'.padStart(4)}  ${'Manual'.padStart(14)}  ${'Autowired'.padStart(14)}`
  );
  console.log('-'.repeat(90));

  for (const d of significant) {
    const relStr = d.maxRelDiff < 0.001
      ? d.maxRelDiff.toExponential(2)
      : (d.maxRelDiff * 100).toFixed(2) + '%';

    console.log(
      `${d.field.padEnd(30)}  ${relStr.padStart(12)}  ${d.maxAbsDiff.toFixed(4).padStart(12)}  ` +
      `${String(d.worstYear).padStart(4)}  ${d.manualVal.toFixed(4).padStart(14)}  ${d.autowiredVal.toFixed(4).padStart(14)}`
    );
  }

  const perfectMatch = divergences.filter(d => d.maxRelDiff <= 1e-10).length;
  console.log(`\n  ${perfectMatch}/${divergences.length} fields match exactly (< 1e-10)`);
  console.log(`  ${significant.length} fields diverge (> 1e-6)`);
}

async function run() {
  const args = process.argv.slice(2);
  const allScenarios = args.includes('--all-scenarios');

  const scenarioArg = args.find(a => a.startsWith('--scenario='));
  const scenarioName = scenarioArg?.split('=')[1];

  const scenarios: { name: string; params: SimulationParams }[] = [];

  if (allScenarios) {
    const scenarioDir = `${process.cwd()}/scenarios`;
    const files = fs.readdirSync(scenarioDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const name = file.replace('.json', '');
      try {
        const loaded = loadScenario(`${scenarioDir}/${file}`);
        scenarios.push({ name, params: loaded });
      } catch (err) {
        console.warn(`  Skipping ${name}: ${(err as Error).message}`);
      }
    }
  } else if (scenarioName) {
    const loaded = loadScenario(`${process.cwd()}/scenarios/${scenarioName}.json`);
    scenarios.push({ name: scenarioName, params: loaded });
  } else {
    scenarios.push({ name: 'baseline (default params)', params: {} });
  }

  for (const { name, params } of scenarios) {
    try {
      const manualResult = runSimulationManual(params);
      const autowiredResult = runAutowiredFull(params);

      const divergences = compareResults(manualResult.results, autowiredResult.results);
      printReport(name, divergences);
    } catch (err) {
      console.error(`  ERROR in ${name}: ${(err as Error).message}`);
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

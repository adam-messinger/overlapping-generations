/**
 * Analyze electricity W per capita by region across scenarios
 *
 * Usage: npx tsx scripts/analyze-w-per-capita.ts
 */

import { runSimulation, runWithScenario, type SimulationResult, type YearResult } from '../src/index.js';
import { Region, REGIONS, REGION_NAMES, REGION_NAME_WIDTH } from '../src/domain-types.js';

const KEY_YEARS = [2025, 2040, 2060, 2080, 2100];
const COL = 8;

/** Global final energy (kWh/day per capita → W) and regional electricity W per capita. */
function wattsPerCapita(row: YearResult): { global: number; regional: Record<Region, number> } {
  const regional = {} as Record<Region, number>;
  for (const r of REGIONS) {
    const generation = row.regionalGeneration?.[r] as Record<string, number> | undefined;
    const genTWh = generation ? Object.values(generation).reduce((a, b) => a + b, 0) : 0;
    const pop = row.regionalPopulation?.[r] ?? 0;
    // TWh × 1e12 Wh / (pop × 8760 h) = W per capita
    regional[r] = pop > 0 ? genTWh * 1e12 / (pop * 8760) : 0;
  }
  return { global: (row.finalEnergyPerCapitaDay ?? 0) * 1000 / 24, regional };
}

const rowAt = (result: SimulationResult, year: number) => result.results.find(y => y.year === year);
const header = () => {
  console.log(`Year   ${'Global'.padStart(COL)}${REGIONS.map(r => r.padStart(COL + 3)).join('')}`);
};
const signed = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(0);

function printTable(title: string, cells: (year: number) => { global: number; regional: Record<Region, number> } | undefined, format = (n: number) => n.toFixed(0)) {
  console.log(`\n=== ${title} ===`);
  header();
  for (const year of KEY_YEARS) {
    const w = cells(year);
    if (!w) continue;
    console.log(`${year}   ${format(w.global).padStart(COL)}${REGIONS.map(r => format(w.regional[r]).padStart(COL + 3)).join('')}`);
  }
}

function printRegional(title: string, values: Record<Region, number> | undefined, format: (n: number) => string) {
  console.log(`\n${title}`);
  if (!values) return;
  for (const r of REGIONS) console.log(`  ${REGION_NAMES[r].padEnd(REGION_NAME_WIDTH)} ${format(values[r])}`);
}

async function main() {
  console.log('Analyzing electricity W per capita by region...\n');
  console.log('Running baseline scenario...');
  const baseline = runSimulation();
  console.log('Running regional-divergence scenario...');
  const { result: divergence } = await runWithScenario('scenarios/regional-divergence.json');

  const at = (result: SimulationResult) => (year: number) => {
    const row = rowAt(result, year);
    return row ? wattsPerCapita(row) : undefined;
  };
  printTable('BASELINE SCENARIO: electricity W per capita', at(baseline));
  printTable('REGIONAL DIVERGENCE (US fossil lock-in, China accelerated solar)', at(divergence));
  printTable('DIFFERENCE (Divergence - Baseline)', year => {
    const base = at(baseline)(year);
    const div = at(divergence)(year);
    if (!base || !div) return undefined;
    const regional = {} as Record<Region, number>;
    for (const r of REGIONS) regional[r] = div.regional[r] - base.regional[r];
    return { global: div.global - base.global, regional };
  }, signed);

  const base2050 = rowAt(baseline, 2050);
  const div2050 = rowAt(divergence, 2050);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const kg = (n: number) => n.toFixed(0);
  console.log('\n=== FOSSIL SHARE BY REGION (2050) ===');
  printRegional('Baseline:', base2050?.regionalFossilShare, pct);
  printRegional('Divergence:', div2050?.regionalFossilShare, pct);
  console.log('\n=== GRID INTENSITY BY REGION (kg CO₂/MWh, 2050) ===');
  printRegional('Baseline:', base2050?.regionalGridIntensity, kg);
  printRegional('Divergence:', div2050?.regionalGridIntensity, kg);
}

main().catch(console.error);

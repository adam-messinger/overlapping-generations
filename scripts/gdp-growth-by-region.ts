/**
 * GDP Growth Rates by Region by Decade
 *
 * Computes compound annual growth rates (CAGR) for each region
 * across each decade from 2025-2100.
 *
 * Usage: npx tsx scripts/gdp-growth-by-region.ts [--scenario=name]
 */

import { runSimulation, runWithScenario } from '../src/simulation.js';
import type { YearResult } from '../src/simulation.js';
import { REGIONS } from '../src/framework/types.js';
import type { Region } from '../src/framework/types.js';

const DECADES = [
  { label: '2025-2035', startYear: 2025, endYear: 2035 },
  { label: '2035-2045', startYear: 2035, endYear: 2045 },
  { label: '2045-2055', startYear: 2045, endYear: 2055 },
  { label: '2055-2065', startYear: 2055, endYear: 2065 },
  { label: '2065-2075', startYear: 2065, endYear: 2075 },
  { label: '2075-2085', startYear: 2075, endYear: 2085 },
  { label: '2085-2095', startYear: 2085, endYear: 2095 },
  { label: '2095-2100', startYear: 2095, endYear: 2100 },
];

const REGION_LABELS: Record<Region, string> = {
  oecd: 'OECD',
  china: 'China',
  em: 'Emerging',
  row: 'Rest of World',
};

function cagr(startVal: number, endVal: number, years: number): number {
  if (startVal <= 0 || years <= 0) return 0;
  return Math.pow(endVal / startVal, 1 / years) - 1;
}

function getAtYear(results: YearResult[], year: number): YearResult | undefined {
  return results.find(r => r.year === year);
}

async function main() {
  // Parse scenario argument
  let scenarioName: string | undefined;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--scenario=')) {
      scenarioName = arg.split('=')[1];
    }
  }

  // Run simulation
  let results: YearResult[];
  if (scenarioName) {
    console.log(`Running scenario: ${scenarioName}\n`);
    const { result } = await runWithScenario(`scenarios/${scenarioName}.json`);
    results = result.results;
  } else {
    console.log('Running default simulation\n');
    const result = runSimulation();
    results = result.results;
  }

  // --- Table 1: Regional GDP Levels at Decade Boundaries ---
  const boundaryYears = [2025, 2035, 2045, 2055, 2065, 2075, 2085, 2095, 2100];

  console.log('=== Regional GDP ($T) ===\n');
  const gdpHeader = ['Year', ...REGIONS.map(r => REGION_LABELS[r]), 'Global'].map(s => s.padStart(14)).join('');
  console.log(gdpHeader);
  console.log('-'.repeat(gdpHeader.length));

  for (const year of boundaryYears) {
    const row = getAtYear(results, year);
    if (!row) continue;
    const globalGdp = row.gdp;
    const cols = [
      year.toString().padStart(14),
      ...REGIONS.map(r => (row.regionalGdp[r] ?? 0).toFixed(1).padStart(14)),
      globalGdp.toFixed(1).padStart(14),
    ];
    console.log(cols.join(''));
  }

  // --- Table 2: CAGR by Region by Decade ---
  console.log('\n=== GDP Growth Rates (CAGR % per year) ===\n');
  const cagrHeader = ['Decade', ...REGIONS.map(r => REGION_LABELS[r]), 'Global'].map(s => s.padStart(14)).join('');
  console.log(cagrHeader);
  console.log('-'.repeat(cagrHeader.length));

  for (const decade of DECADES) {
    const startRow = getAtYear(results, decade.startYear);
    const endRow = getAtYear(results, decade.endYear);
    if (!startRow || !endRow) continue;

    const years = decade.endYear - decade.startYear;
    const globalCagr = cagr(startRow.gdp, endRow.gdp, years);

    const cols = [
      decade.label.padStart(14),
      ...REGIONS.map(r => {
        const startGdp = startRow.regionalGdp[r] ?? 0;
        const endGdp = endRow.regionalGdp[r] ?? 0;
        return (cagr(startGdp, endGdp, years) * 100).toFixed(2).padStart(14);
      }),
      (globalCagr * 100).toFixed(2).padStart(14),
    ];
    console.log(cols.join(''));
  }

  // --- Table 3: Regional GDP Share ---
  console.log('\n=== Regional GDP Share (%) ===\n');
  const shareHeader = ['Year', ...REGIONS.map(r => REGION_LABELS[r])].map(s => s.padStart(14)).join('');
  console.log(shareHeader);
  console.log('-'.repeat(shareHeader.length));

  for (const year of boundaryYears) {
    const row = getAtYear(results, year);
    if (!row) continue;
    const globalGdp = row.gdp;
    const cols = [
      year.toString().padStart(14),
      ...REGIONS.map(r => ((row.regionalGdp[r] ?? 0) / globalGdp * 100).toFixed(1).padStart(14)),
    ];
    console.log(cols.join(''));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

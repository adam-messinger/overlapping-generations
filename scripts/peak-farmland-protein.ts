/**
 * Predict peak farmland and peak protein consumption across scenarios.
 *
 * Runs the simulation under multiple parameter configurations and
 * reports the year and value at which farmland (Mha) and protein share
 * (fraction of calories) peak.
 */

import { runSimulation } from '../src/index.js';
import type { YearResult } from '../src/index.js';

interface PeakInfo {
  year: number;
  value: number;
}

function findPeak(years: number[], results: YearResult[], key: keyof YearResult): PeakInfo {
  let peakYear = years[0];
  let peakVal = -Infinity;
  for (let i = 0; i < results.length; i++) {
    const v = results[i][key] as number;
    if (v > peakVal) {
      peakVal = v;
      peakYear = years[i];
    }
  }
  return { year: peakYear, value: peakVal };
}

// Scenarios to sweep
const scenarios: Record<string, object> = {
  'Baseline (current policies)': {},

  'Net-Zero (high carbon price)': {
    energy: { carbonPrice: 150 },
  },

  'High yield growth (2%/yr)': {
    resources: { land: { yieldGrowthRate: 0.02 } },
  },

  'Low yield growth (0.5%/yr)': {
    resources: { land: { yieldGrowthRate: 0.005 } },
  },

  'High climate sensitivity (4.5°C)': {
    climate: { sensitivity: 4.5 },
  },

  'Tech breakthrough (fast learning)': {
    energy: {
      solarAlpha: 0.44,
      windAlpha: 0.30,
      batteryAlpha: 0.25,
    },
  },

  'Low protein saturation (12%)': {
    resources: { food: { proteinShareMax: 0.12 } },
  },

  'High protein saturation (20%)': {
    resources: { food: { proteinShareMax: 0.20 } },
  },

  'Automation boom (high robots)': {
    expansion: { robotGrowthRate: 0.20, robotLoad: 25 },
  },
};

console.log('='.repeat(90));
console.log('PEAK FARMLAND & PEAK PROTEIN ANALYSIS');
console.log('='.repeat(90));
console.log();

const summaryRows: string[] = [];

for (const [name, overrides] of Object.entries(scenarios)) {
  try {
    const { years, results } = runSimulation(overrides);

    const peakFarmland = findPeak(years, results, 'farmland');
    const peakProtein = findPeak(years, results, 'proteinShare');
    const peakGrain = findPeak(years, results, 'grainEquivalent');

    // Also find population peak for context
    const peakPop = findPeak(years, results, 'population' as keyof YearResult);

    // Get 2025 and 2100 values
    const r2025 = results[0];
    const r2100 = results[results.length - 1];

    console.log(`--- ${name} ---`);
    console.log(`  Peak Farmland:  ${peakFarmland.value.toFixed(0)} Mha in ${peakFarmland.year}`);
    console.log(`    2025: ${r2025.farmland.toFixed(0)} Mha → 2100: ${r2100.farmland.toFixed(0)} Mha`);
    console.log(`  Peak Protein:   ${(peakProtein.value * 100).toFixed(1)}% in ${peakProtein.year}`);
    console.log(`    2025: ${(r2025.proteinShare * 100).toFixed(1)}% → 2100: ${(r2100.proteinShare * 100).toFixed(1)}%`);
    console.log(`  Peak Grain:     ${peakGrain.value.toFixed(0)} Mt in ${peakGrain.year}`);
    console.log(`    2025: ${r2025.grainEquivalent.toFixed(0)} Mt → 2100: ${r2100.grainEquivalent.toFixed(0)} Mt`);
    console.log(`  Population:     peak ${(peakPop.value / 1e9).toFixed(2)}B in ${peakPop.year}`);
    console.log();

    summaryRows.push(
      `${name.padEnd(35)} | Farmland: ${peakFarmland.year} (${peakFarmland.value.toFixed(0)} Mha) | Protein: ${peakProtein.year} (${(peakProtein.value * 100).toFixed(1)}%) | Grain: ${peakGrain.year} (${peakGrain.value.toFixed(0)} Mt)`
    );
  } catch (e: any) {
    console.log(`--- ${name} --- ERROR: ${e.message}`);
    console.log();
  }
}

console.log('='.repeat(90));
console.log('SUMMARY TABLE');
console.log('='.repeat(90));
for (const row of summaryRows) {
  console.log(row);
}
console.log();

// Detailed year-by-year for baseline
console.log('='.repeat(90));
console.log('BASELINE TRAJECTORY (every 5 years)');
console.log('='.repeat(90));
console.log('Year | Farmland (Mha) | Protein (%) | Grain (Mt) | Population (B) | GDP/cap ($k) | Temp (°C)');
console.log('-'.repeat(95));

const { years, results } = runSimulation({});
for (let i = 0; i < years.length; i++) {
  if (years[i] % 5 === 0 || i === 0 || i === years.length - 1) {
    const r = results[i];
    const pop = ('population' in r) ? (r as any).population / 1e9 : 0;
    const gdpCap = ('gdpPerCapita' in r) ? (r as any).gdpPerCapita / 1000 : 0;
    console.log(
      `${years[i]} | ${r.farmland.toFixed(0).padStart(14)} | ${(r.proteinShare * 100).toFixed(1).padStart(11)} | ${r.grainEquivalent.toFixed(0).padStart(10)} | ${pop.toFixed(2).padStart(14)} | ${gdpCap.toFixed(1).padStart(12)} | ${r.temperature.toFixed(2).padStart(9)}`
    );
  }
}

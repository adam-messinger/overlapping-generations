/**
 * Baseline Capture Script
 *
 * Runs all scenarios and saves key metrics to JSON for comparison.
 * Use this before and after implementing changes to verify behavior.
 *
 * Usage: npx tsx scripts/baseline.ts [--output=baselines/pre-fix.json]
 */

import { runWithScenario, runSimulation } from '../src/simulation.js';
import * as fs from 'fs';
import * as path from 'path';

// Scenarios to run
const SCENARIOS = [
  'baseline',
  'net-zero',
  'high-sensitivity',
  'tech-stagnation',
  'automation-boom',
  'climate-cascade',
];

// Key metrics to capture
interface ScenarioMetrics {
  // Climate
  warming2050: number;
  warming2100: number;
  peakEmissions: number;
  peakEmissionsYear: number;

  // Electrification
  electrificationRate2025: number;
  electrificationRate2050: number;
  electrificationRate2100: number;

  // Capacity
  solarCapacity2025: number;
  solarCapacity2050: number;
  solarCapacity2100: number;
  windCapacity2050: number;
  batteryCapacity2050: number;

  // Grid
  gridIntensity2025: number;
  gridIntensity2050: number;
  gridIntensity2100: number;

  // Generation mix
  fossilShare2025: number;
  fossilShare2050: number;
  fossilShare2100: number;

  // Economic
  gdp2050: number;
  gdp2100: number;

  // Energy burden
  energyBurden2025: number;
  energyBurden2050: number;
  energyBurdenPeak: number;
  energyBurdenPeakYear: number;
}

interface BaselineData {
  timestamp: string;
  scenarios: Record<string, ScenarioMetrics>;
}

function extractMetrics(results: any[]): ScenarioMetrics {
  const idx2025 = 0;
  const idx2050 = results.findIndex(r => r.year === 2050);
  const idx2100 = results.length - 1;

  // Find peak emissions
  let peakEmissions = 0;
  let peakEmissionsYear = 2025;
  for (const r of results) {
    const totalEmissions = r.electricityEmissions + r.nonElectricEmissions;
    if (totalEmissions > peakEmissions) {
      peakEmissions = totalEmissions;
      peakEmissionsYear = r.year;
    }
  }

  // Find peak burden
  let energyBurdenPeak = 0;
  let energyBurdenPeakYear = 2025;
  for (const r of results) {
    if (r.energyBurden > energyBurdenPeak) {
      energyBurdenPeak = r.energyBurden;
      energyBurdenPeakYear = r.year;
    }
  }

  return {
    warming2050: results[idx2050]?.temperature ?? 0,
    warming2100: results[idx2100].temperature,
    peakEmissions,
    peakEmissionsYear,

    electrificationRate2025: results[idx2025].electrificationRate,
    electrificationRate2050: results[idx2050]?.electrificationRate ?? 0,
    electrificationRate2100: results[idx2100].electrificationRate,

    solarCapacity2025: results[idx2025].capacities.solar,
    solarCapacity2050: results[idx2050]?.capacities.solar ?? 0,
    solarCapacity2100: results[idx2100].capacities.solar,
    windCapacity2050: results[idx2050]?.capacities.wind ?? 0,
    batteryCapacity2050: results[idx2050]?.capacities.battery ?? 0,

    gridIntensity2025: results[idx2025].gridIntensity,
    gridIntensity2050: results[idx2050]?.gridIntensity ?? 0,
    gridIntensity2100: results[idx2100].gridIntensity,

    fossilShare2025: results[idx2025].fossilShare,
    fossilShare2050: results[idx2050]?.fossilShare ?? 0,
    fossilShare2100: results[idx2100].fossilShare,

    gdp2050: results[idx2050]?.gdp ?? 0,
    gdp2100: results[idx2100].gdp,

    energyBurden2025: results[idx2025].energyBurden,
    energyBurden2050: results[idx2050]?.energyBurden ?? 0,
    energyBurdenPeak,
    energyBurdenPeakYear,
  };
}

async function main() {
  // Parse arguments
  let outputPath = 'baselines/baseline.json';
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--output=')) {
      outputPath = arg.split('=')[1];
    }
  }

  console.log('=== Baseline Capture ===\n');

  const data: BaselineData = {
    timestamp: new Date().toISOString(),
    scenarios: {},
  };

  // Run default simulation first
  console.log('Running: default (no scenario)');
  const defaultResult = runSimulation();
  data.scenarios['default'] = extractMetrics(defaultResult.results);

  // Run each scenario
  for (const scenario of SCENARIOS) {
    console.log(`Running: ${scenario}`);
    try {
      const scenarioPath = `scenarios/${scenario}.json`;
      const { result } = await runWithScenario(scenarioPath);
      data.scenarios[scenario] = extractMetrics(result.results);
    } catch (err) {
      console.error(`  Error: ${(err as Error).message}`);
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nBaseline saved to: ${outputPath}`);

  // Print summary
  console.log('\n=== Summary ===\n');
  console.log('Scenario              Warming2100  Elec2050  Solar2050(GW)  FossilShare2050');
  console.log('-------------------   -----------  --------  -------------  ---------------');
  for (const [name, m] of Object.entries(data.scenarios)) {
    console.log(
      `${name.padEnd(20)}  ` +
        `${m.warming2100.toFixed(2).padStart(8)}°C  ` +
        `${(m.electrificationRate2050 * 100).toFixed(0).padStart(6)}%  ` +
        `${m.solarCapacity2050.toFixed(0).padStart(11)}  ` +
        `${(m.fossilShare2050 * 100).toFixed(0).padStart(13)}%`
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

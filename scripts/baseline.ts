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

// Canonical scenarios for regression testing.
// Covers: current policies, aggressive transition, high climate sensitivity,
// cascade-risk feedback, and two IPCC SSP pathways spanning the envelope.
const SCENARIOS = [
  'baseline',
  'net-zero',
  'high-sensitivity',
  'climate-cascade',
  'ssp1-26',
  'ssp5-85',
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
  // Select the named year rather than the last row. They coincide for the
  // 2025-2100 horizon every scenario uses, but taking the last row would
  // silently relabel some other year's value as 2100 on a shorter run.
  const idx2100 = results.findIndex(r => r.year === 2100);

  // A year that was not simulated has no value. NaN rather than 0, so the
  // comparator reports it as uncomparable instead of treating it as a real
  // reading that happens to be zero.
  const at = (index: number, read: (row: any) => number): number =>
    index >= 0 ? read(results[index]) : Number.NaN;

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
    warming2050: at(idx2050, r => r.temperature),
    warming2100: at(idx2100, r => r.temperature),
    peakEmissions,
    peakEmissionsYear,

    electrificationRate2025: results[idx2025].electrificationRate,
    electrificationRate2050: at(idx2050, r => r.electrificationRate),
    electrificationRate2100: at(idx2100, r => r.electrificationRate),

    solarCapacity2025: results[idx2025].capacities.solar,
    solarCapacity2050: at(idx2050, r => r.capacities.solar),
    solarCapacity2100: at(idx2100, r => r.capacities.solar),
    windCapacity2050: at(idx2050, r => r.capacities.wind),
    batteryCapacity2050: at(idx2050, r => r.capacities.battery),

    gridIntensity2025: results[idx2025].gridIntensity,
    gridIntensity2050: at(idx2050, r => r.gridIntensity),
    gridIntensity2100: at(idx2100, r => r.gridIntensity),

    fossilShare2025: results[idx2025].fossilShare,
    fossilShare2050: at(idx2050, r => r.fossilShare),
    fossilShare2100: at(idx2100, r => r.fossilShare),

    gdp2050: at(idx2050, r => r.gdp),
    gdp2100: at(idx2100, r => r.gdp),

    energyBurden2025: results[idx2025].energyBurden,
    energyBurden2050: at(idx2050, r => r.energyBurden),
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
  const failures: string[] = [];
  for (const scenario of SCENARIOS) {
    console.log(`Running: ${scenario}`);
    try {
      const scenarioPath = `scenarios/${scenario}.json`;
      const { result } = await runWithScenario(scenarioPath);
      data.scenarios[scenario] = extractMetrics(result.results);
    } catch (err) {
      const message = `${scenario}: ${(err as Error).message}`;
      failures.push(message);
      console.error(`  Error: ${message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Baseline capture failed for ${failures.length} scenario(s):\n${failures.join('\n')}`);
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

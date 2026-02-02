/**
 * Baseline Comparison Script
 *
 * Compares two baseline files and reports differences.
 * Use this to verify changes after implementing fixes.
 *
 * Usage: npx tsx scripts/compare-baselines.ts baselines/pre-fix.json baselines/post-fix.json
 */

import * as fs from 'fs';

interface ScenarioMetrics {
  warming2050: number;
  warming2100: number;
  peakEmissions: number;
  peakEmissionsYear: number;
  electrificationRate2025: number;
  electrificationRate2050: number;
  electrificationRate2100: number;
  solarCapacity2025: number;
  solarCapacity2050: number;
  solarCapacity2100: number;
  windCapacity2050: number;
  batteryCapacity2050: number;
  gridIntensity2025: number;
  gridIntensity2050: number;
  gridIntensity2100: number;
  fossilShare2025: number;
  fossilShare2050: number;
  fossilShare2100: number;
  gdp2050: number;
  gdp2100: number;
  energyBurden2025: number;
  energyBurden2050: number;
  energyBurdenPeak: number;
  energyBurdenPeakYear: number;
}

interface BaselineData {
  timestamp: string;
  scenarios: Record<string, ScenarioMetrics>;
}

// Metrics to compare with their display info
const METRICS: Array<{
  key: keyof ScenarioMetrics;
  label: string;
  unit: string;
  format: (v: number) => string;
  warningThreshold: number; // % change that triggers warning
}> = [
  { key: 'warming2100', label: 'Warming 2100', unit: '°C', format: v => v.toFixed(2), warningThreshold: 10 },
  { key: 'peakEmissions', label: 'Peak Emissions', unit: 'Gt', format: v => v.toFixed(1), warningThreshold: 20 },
  { key: 'electrificationRate2050', label: 'Elec Rate 2050', unit: '%', format: v => (v * 100).toFixed(0), warningThreshold: 15 },
  { key: 'solarCapacity2050', label: 'Solar 2050', unit: 'GW', format: v => v.toFixed(0), warningThreshold: 30 },
  { key: 'windCapacity2050', label: 'Wind 2050', unit: 'GW', format: v => v.toFixed(0), warningThreshold: 30 },
  { key: 'batteryCapacity2050', label: 'Battery 2050', unit: 'GWh', format: v => v.toFixed(0), warningThreshold: 30 },
  { key: 'fossilShare2050', label: 'Fossil Share 2050', unit: '%', format: v => (v * 100).toFixed(0), warningThreshold: 20 },
  { key: 'gridIntensity2050', label: 'Grid Intensity 2050', unit: 'kg/MWh', format: v => v.toFixed(0), warningThreshold: 20 },
  { key: 'gdp2050', label: 'GDP 2050', unit: '$T', format: v => v.toFixed(0), warningThreshold: 10 },
  { key: 'energyBurdenPeak', label: 'Peak Burden', unit: '%', format: v => (v * 100).toFixed(1), warningThreshold: 25 },
];

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/compare-baselines.ts <before.json> <after.json>');
    process.exit(1);
  }

  const [beforePath, afterPath] = args;

  // Load files
  const before: BaselineData = JSON.parse(fs.readFileSync(beforePath, 'utf-8'));
  const after: BaselineData = JSON.parse(fs.readFileSync(afterPath, 'utf-8'));

  console.log('=== Baseline Comparison ===\n');
  console.log(`Before: ${beforePath} (${before.timestamp})`);
  console.log(`After:  ${afterPath} (${after.timestamp})\n`);

  let warnings = 0;

  // Compare each scenario
  for (const scenario of Object.keys(after.scenarios)) {
    const beforeMetrics = before.scenarios[scenario];
    const afterMetrics = after.scenarios[scenario];

    if (!beforeMetrics) {
      console.log(`⚠ Scenario '${scenario}' not in before baseline`);
      continue;
    }

    console.log(`\n--- ${scenario} ---\n`);
    console.log('Metric                   Before      After       Change');
    console.log('----------------------   ---------   ---------   -------');

    for (const m of METRICS) {
      const beforeVal = beforeMetrics[m.key];
      const afterVal = afterMetrics[m.key];

      if (beforeVal === undefined || afterVal === undefined) continue;

      // Calculate change
      let changeStr: string;
      let isWarning = false;

      if (beforeVal === 0) {
        changeStr = afterVal === 0 ? '0%' : 'N/A';
      } else {
        const pctChange = ((afterVal - beforeVal) / Math.abs(beforeVal)) * 100;
        changeStr = `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%`;

        if (Math.abs(pctChange) > m.warningThreshold) {
          isWarning = true;
          warnings++;
        }
      }

      const prefix = isWarning ? '⚠ ' : '  ';
      console.log(
        `${prefix}${m.label.padEnd(20)}   ` +
          `${m.format(beforeVal).padStart(7)} ${m.unit.padEnd(3)}   ` +
          `${m.format(afterVal).padStart(7)} ${m.unit.padEnd(3)}   ` +
          `${changeStr}`
      );
    }
  }

  // Summary
  console.log('\n=== Summary ===\n');
  console.log(`Total scenarios: ${Object.keys(after.scenarios).length}`);
  console.log(`Warnings (>threshold change): ${warnings}`);

  if (warnings > 0) {
    console.log('\n⚠ Some metrics changed significantly. Review before proceeding.');
  } else {
    console.log('\n✓ All changes within expected thresholds.');
  }
}

main();

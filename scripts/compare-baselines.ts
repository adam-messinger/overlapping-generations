/**
 * Baseline Comparison Script
 *
 * Compares two baseline files and reports differences. Use before/after
 * implementing fixes, and in CI as a regression guard against unintentional
 * scenario-output drift.
 *
 * Tolerances: absolute for physical quantities (°C, percentage-point shares),
 * percentage for monetary/unitless (10%-of-gridIntensity is dimensionally
 * meaningful; 10%-of-warming hides a 0.2°C slip).
 *
 * Usage:
 *   npx tsx scripts/compare-baselines.ts <before.json> <after.json>
 *   npx tsx scripts/compare-baselines.ts --strict <before.json> <after.json>  # exit 1 on warnings
 *   npx tsx scripts/compare-baselines.ts --json <before.json> <after.json>    # machine-readable
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

type Tolerance =
  | { kind: 'absolute'; max: number }   // |after - before| > max triggers warning
  | { kind: 'percent'; max: number };   // |after - before| / |before| > max/100 triggers warning

interface MetricSpec {
  key: keyof ScenarioMetrics;
  label: string;
  unit: string;
  format: (v: number) => string;
  tolerance: Tolerance;
}

// Absolute tolerances for physical quantities; percentage for monetary/unitless.
const METRICS: MetricSpec[] = [
  { key: 'warming2050',             label: 'Warming 2050',        unit: '°C',     format: v => v.toFixed(2),     tolerance: { kind: 'absolute', max: 0.05 } },
  { key: 'warming2100',             label: 'Warming 2100',        unit: '°C',     format: v => v.toFixed(2),     tolerance: { kind: 'absolute', max: 0.05 } },
  { key: 'peakEmissions',           label: 'Peak Emissions',      unit: 'Gt',     format: v => v.toFixed(1),     tolerance: { kind: 'percent',  max: 10 } },
  { key: 'electrificationRate2025', label: 'Elec Rate 2025',      unit: 'pp',     format: v => (v*100).toFixed(1), tolerance: { kind: 'absolute', max: 0.02 } },
  { key: 'electrificationRate2050', label: 'Elec Rate 2050',      unit: 'pp',     format: v => (v*100).toFixed(1), tolerance: { kind: 'absolute', max: 0.02 } },
  { key: 'electrificationRate2100', label: 'Elec Rate 2100',      unit: 'pp',     format: v => (v*100).toFixed(1), tolerance: { kind: 'absolute', max: 0.02 } },
  { key: 'solarCapacity2050',       label: 'Solar 2050',          unit: 'GW',     format: v => v.toFixed(0),     tolerance: { kind: 'percent',  max: 15 } },
  { key: 'solarCapacity2100',       label: 'Solar 2100',          unit: 'GW',     format: v => v.toFixed(0),     tolerance: { kind: 'percent',  max: 15 } },
  { key: 'windCapacity2050',        label: 'Wind 2050',           unit: 'GW',     format: v => v.toFixed(0),     tolerance: { kind: 'percent',  max: 15 } },
  { key: 'batteryCapacity2050',     label: 'Battery 2050',        unit: 'GWh',    format: v => v.toFixed(0),     tolerance: { kind: 'percent',  max: 15 } },
  { key: 'fossilShare2050',         label: 'Fossil Share 2050',   unit: 'pp',     format: v => (v*100).toFixed(1), tolerance: { kind: 'absolute', max: 0.02 } },
  { key: 'fossilShare2100',         label: 'Fossil Share 2100',   unit: 'pp',     format: v => (v*100).toFixed(1), tolerance: { kind: 'absolute', max: 0.02 } },
  { key: 'gridIntensity2050',       label: 'Grid Intensity 2050', unit: 'kg/MWh', format: v => v.toFixed(0),     tolerance: { kind: 'percent',  max: 15 } },
  { key: 'gdp2050',                 label: 'GDP 2050',            unit: '$T',     format: v => v.toFixed(0),     tolerance: { kind: 'percent',  max: 5 } },
  { key: 'gdp2100',                 label: 'GDP 2100',            unit: '$T',     format: v => v.toFixed(0),     tolerance: { kind: 'percent',  max: 5 } },
  { key: 'energyBurdenPeak',        label: 'Peak Burden',         unit: 'pp',     format: v => (v*100).toFixed(1), tolerance: { kind: 'absolute', max: 0.015 } },
];

interface MetricDiff {
  scenario: string;
  metric: keyof ScenarioMetrics;
  label: string;
  before: number;
  after: number;
  delta: number;
  percentChange: number | null;
  toleranceKind: 'absolute' | 'percent';
  toleranceMax: number;
  warning: boolean;
}

interface ComparisonResult {
  beforePath: string;
  afterPath: string;
  beforeTimestamp: string;
  afterTimestamp: string;
  diffs: MetricDiff[];
  warnings: number;
  scenariosCompared: number;
  scenariosOnlyInAfter: string[];
  scenariosOnlyInBefore: string[];
}

function compute(before: BaselineData, after: BaselineData, beforePath: string, afterPath: string): ComparisonResult {
  const diffs: MetricDiff[] = [];
  let warnings = 0;

  const afterScenarios = new Set(Object.keys(after.scenarios));
  const beforeScenarios = new Set(Object.keys(before.scenarios));
  const scenariosOnlyInAfter = [...afterScenarios].filter(s => !beforeScenarios.has(s));
  const scenariosOnlyInBefore = [...beforeScenarios].filter(s => !afterScenarios.has(s));
  const common = [...afterScenarios].filter(s => beforeScenarios.has(s));

  for (const scenario of common) {
    const b = before.scenarios[scenario];
    const a = after.scenarios[scenario];

    for (const m of METRICS) {
      const beforeVal = b[m.key] as number;
      const afterVal = a[m.key] as number;
      if (beforeVal === undefined || afterVal === undefined) continue;

      const delta = afterVal - beforeVal;
      const percentChange = beforeVal !== 0 ? (delta / Math.abs(beforeVal)) * 100 : null;

      let warning = false;
      if (m.tolerance.kind === 'absolute') {
        warning = Math.abs(delta) > m.tolerance.max;
      } else {
        warning = percentChange !== null && Math.abs(percentChange) > m.tolerance.max;
      }

      if (warning) warnings++;
      diffs.push({
        scenario,
        metric: m.key,
        label: m.label,
        before: beforeVal,
        after: afterVal,
        delta,
        percentChange,
        toleranceKind: m.tolerance.kind,
        toleranceMax: m.tolerance.max,
        warning,
      });
    }
  }

  return {
    beforePath,
    afterPath,
    beforeTimestamp: before.timestamp,
    afterTimestamp: after.timestamp,
    diffs,
    warnings,
    scenariosCompared: common.length,
    scenariosOnlyInAfter,
    scenariosOnlyInBefore,
  };
}

function printHuman(result: ComparisonResult): void {
  console.log('=== Baseline Comparison ===\n');
  console.log(`Before: ${result.beforePath} (${result.beforeTimestamp})`);
  console.log(`After:  ${result.afterPath} (${result.afterTimestamp})\n`);

  for (const s of result.scenariosOnlyInAfter) console.log(`⚠ Scenario '${s}' only in after baseline (new)`);
  for (const s of result.scenariosOnlyInBefore) console.log(`⚠ Scenario '${s}' only in before baseline (removed)`);

  // Group diffs by scenario
  const byScenario = new Map<string, MetricDiff[]>();
  for (const d of result.diffs) {
    if (!byScenario.has(d.scenario)) byScenario.set(d.scenario, []);
    byScenario.get(d.scenario)!.push(d);
  }

  const metricFormat = new Map(METRICS.map(m => [m.key, m.format] as const));
  const metricUnit = new Map(METRICS.map(m => [m.key, m.unit] as const));

  for (const [scenario, diffs] of byScenario) {
    console.log(`\n--- ${scenario} ---\n`);
    console.log('Metric                   Before        After         Change          Tolerance');
    console.log('----------------------   -----------   -----------   -------------   ---------');
    for (const d of diffs) {
      const fmt = metricFormat.get(d.metric)!;
      const unit = metricUnit.get(d.metric)!;
      const prefix = d.warning ? '⚠ ' : '  ';
      const changeStr = d.toleranceKind === 'absolute'
        ? `${d.delta >= 0 ? '+' : ''}${d.delta.toFixed(4)}`
        : d.percentChange !== null ? `${d.percentChange >= 0 ? '+' : ''}${d.percentChange.toFixed(1)}%` : 'N/A';
      const tolStr = d.toleranceKind === 'absolute' ? `±${d.toleranceMax}` : `±${d.toleranceMax}%`;
      console.log(
        `${prefix}${d.label.padEnd(20)}   ` +
          `${fmt(d.before).padStart(7)} ${unit.padEnd(3)}   ` +
          `${fmt(d.after).padStart(7)} ${unit.padEnd(3)}   ` +
          `${changeStr.padStart(13)}   ` +
          `${tolStr}`
      );
    }
  }

  console.log('\n=== Summary ===\n');
  console.log(`Scenarios compared: ${result.scenariosCompared}`);
  console.log(`Warnings (outside tolerance): ${result.warnings}`);
  if (result.warnings > 0) {
    console.log('\n⚠ Some metrics changed beyond tolerance. Review, and re-bless baseline if intentional.');
  } else {
    console.log('\n✓ All metrics within tolerance.');
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const json = args.includes('--json');
  const paths = args.filter(a => !a.startsWith('--'));

  if (paths.length < 2) {
    console.error('Usage: npx tsx scripts/compare-baselines.ts [--strict] [--json] <before.json> <after.json>');
    process.exit(2);
  }

  const [beforePath, afterPath] = paths;
  const before: BaselineData = JSON.parse(fs.readFileSync(beforePath, 'utf-8'));
  const after: BaselineData = JSON.parse(fs.readFileSync(afterPath, 'utf-8'));

  const result = compute(before, after, beforePath, afterPath);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }

  if (strict && result.warnings > 0) process.exit(1);
}

main();

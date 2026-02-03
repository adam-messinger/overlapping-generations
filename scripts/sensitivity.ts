/**
 * Sensitivity sweep for baseline scenario.
 *
 * Usage:
 *   npx tsx scripts/sensitivity.ts
 */

import { runWithScenario } from '../src/index.js';

type Overrides = Record<string, any> | undefined;

type RunSpec = {
  label: string;
  overrides?: Overrides;
};

const scenarioPath = 'scenarios/baseline.json';

const runs: RunSpec[] = [
  { label: 'baseline' },
  { label: 'carbonPrice=0', overrides: { energy: { carbonPrice: 0 } } },
  { label: 'carbonPrice=50', overrides: { energy: { carbonPrice: 50 } } },
  { label: 'carbonPrice=200', overrides: { energy: { carbonPrice: 200 } } },
  { label: 'carbonPrice=400', overrides: { energy: { carbonPrice: 400 } } },
  { label: 'sensitivity=2.0', overrides: { climate: { sensitivity: 2.0 } } },
  { label: 'sensitivity=3.0', overrides: { climate: { sensitivity: 3.0 } } },
  { label: 'sensitivity=4.5', overrides: { climate: { sensitivity: 4.5 } } },
  { label: 'sensitivity=6.0', overrides: { climate: { sensitivity: 6.0 } } },
  {
    label: 'transportTarget=0.8',
    overrides: { demand: { sectors: { transport: { electrificationTarget: 0.8 } } } },
  },
  {
    label: 'buildingsTarget=0.99',
    overrides: { demand: { sectors: { buildings: { electrificationTarget: 0.99 } } } },
  },
  {
    label: 'industryTarget=0.8',
    overrides: { demand: { sectors: { industry: { electrificationTarget: 0.8 } } } },
  },
];

async function main() {
  console.log(
    [
      'run',
      'warming_2050_c',
      'warming_2100_c',
      'peak_emissions_gt',
      'peak_emissions_year',
      'gdp_2100_t',
      'grid_below_100_year',
      'solar_crossover_year',
    ].join(',')
  );

  for (const r of runs) {
    const { result } = await runWithScenario(scenarioPath, r.overrides);
    const m = result.metrics;
    const row = [
      r.label,
      m.warming2050.toFixed(3),
      m.warming2100.toFixed(3),
      m.peakEmissions.toFixed(3),
      String(m.peakEmissionsYear),
      m.gdp2100.toFixed(3),
      String(m.gridBelow100Year ?? ''),
      String(m.solarCrossoverYear ?? ''),
    ].join(',');
    console.log(row);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

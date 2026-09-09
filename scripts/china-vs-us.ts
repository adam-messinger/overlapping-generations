/**
 * Compare baseline vs "China electrifies, US drags feet" scenario.
 *
 * Carbon price is the supply-side lever: drives clean energy investment,
 * displaces fossil in merit order, accelerates learning curves.
 *
 * Baseline: China $15/t, OECD $50/t
 * Scenario: China $80/t, OECD $15/t
 */
import { runAutowiredSimulation, toYearResults } from '../src/simulation-autowired.js';
import { getOutputsAtYear } from 'tsimulation';
import type { SimulationParams } from '../src/simulation.js';
import type { DeepPartial } from '../src/primitives/deep-merge.js';

/**
 * `SimulationParams` declares each module block as a shallow `Partial`, so a
 * nested override like `energy.regional.china` does not typecheck even though
 * `mergeParams` merges exactly that at runtime. The override shape here is
 * the recursive one the runtime accepts; the cast marks where the declared
 * type is stricter than the behaviour.
 */
function run(label: string, overrides: DeepPartial<SimulationParams>) {
  const awResult = runAutowiredSimulation(overrides as SimulationParams);
  const results = toYearResults(awResult);

  console.log(`\n=== ${label} ===\n`);
  console.log(
    'Year  | China GDP  | China Gr | China EI | US GDP    | US Gr   | US EI   | Grid   | Temp'
  );
  console.log(
    '------|------------|----------|----------|-----------|---------|---------|--------|------'
  );
  for (let i = 0; i < awResult.years.length; i++) {
    const year = awResult.years[i];
    const yr = results[i];
    if (year % 10 === 0 || year === 2025) {
      const o = getOutputsAtYear(awResult, i);
      const cn = o.regional?.china;
      const oc = o.regional?.us;
      console.log(
        `${year}  ` +
        `| $${(cn?.gdp ?? 0).toFixed(1)}T`.padEnd(13) +
        `| ${((cn?.growthRate ?? 0) * 100).toFixed(2)}%`.padEnd(11) +
        `| ${(cn?.energyIntensity ?? 0).toFixed(2)}`.padEnd(11) +
        `| $${(oc?.gdp ?? 0).toFixed(1)}T`.padEnd(12) +
        `| ${((oc?.growthRate ?? 0) * 100).toFixed(2)}%`.padEnd(10) +
        `| ${(oc?.energyIntensity ?? 0).toFixed(2)}`.padEnd(10) +
        `| ${yr.gridIntensity.toFixed(0)}`.padEnd(9) +
        `| ${yr.temperature.toFixed(2)}°C`
      );
    }
  }
  const lastO = getOutputsAtYear(awResult, awResult.years.length - 1);
  const last = results[results.length - 1];
  console.log(`\n  China 2100 GDP: $${(lastO.regional?.china?.gdp ?? 0).toFixed(1)}T`);
  console.log(`  US 2100 GDP:    $${(lastO.regional?.us?.gdp ?? 0).toFixed(1)}T`);
  console.log(`  China 2100 EI:  ${(lastO.regional?.china?.energyIntensity ?? 0).toFixed(3)} MWh/$1k`);
  console.log(`  US 2100 EI:     ${(lastO.regional?.us?.energyIntensity ?? 0).toFixed(3)} MWh/$1k`);
  console.log(`  Global GDP:     $${last.gdp.toFixed(0)}T`);
  console.log(`  Warming:        ${last.temperature.toFixed(2)}°C`);
  console.log(`  Grid intensity: ${last.gridIntensity.toFixed(0)} kg/MWh`);
  console.log(`  Fossil share:   ${(last.fossilShare * 100).toFixed(1)}%`);
}

// Baseline
run('BASELINE', {});

// Carbon price only: China doubles down, US retreats
run('CARBON PRICE ONLY: China $80, US $15', {
  energy: {
    regional: {
      china: { carbonPrice: 80 },
      us: { carbonPrice: 15 },
    },
  },
});

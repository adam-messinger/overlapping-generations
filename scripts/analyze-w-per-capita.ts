/**
 * Analyze W per capita by region across scenarios
 *
 * Usage: npx tsx scripts/analyze-w-per-capita.ts
 */

import { runSimulation, runWithScenario } from '../src/index.js';
import { Region, REGIONS } from '../src/domain-types.js';

async function main() {
  console.log('Analyzing W per capita by region...\n');

  // Run baseline
  console.log('Running baseline scenario...');
  const baseline = runSimulation();

  // Run regional divergence
  console.log('Running regional-divergence scenario...');
  const { result: divergence } = await runWithScenario('scenarios/regional-divergence.json');

  // Key years to compare
  const keyYears = [2025, 2040, 2060, 2080, 2100];

  // Electricity W per capita by region
  // TWh × 1e12 Wh / (population × 8760 hours) = W per capita
  // = TWh × 1e12 / (pop × 8760)

  console.log('\n=== BASELINE SCENARIO ===');
  console.log('Electricity W per capita by region:\n');
  console.log('Year     Global    OECD    China      EM     ROW');
  console.log('----     ------    ----    -----      --     ---');

  for (const yr of keyYears) {
    const data = baseline.results.find((y: any) => y.year === yr) as any;
    if (data) {
      // Global W/capita from finalEnergyPerCapitaDay (kWh/day → W)
      const globalW = (data.finalEnergyPerCapitaDay ?? 0) * 1000 / 24;

      // Regional electricity W/capita using actual regional generation
      const regionalW: Record<string, number> = {};

      for (const r of REGIONS) {
        // Get total generation for this region (TWh)
        const regionGen = data.regionalGeneration?.[r] as Record<string, number> | undefined;
        const genTWh = regionGen
          ? Object.values(regionGen).reduce((a, b) => a + b, 0)
          : 0;
        // Get population (actual count)
        const pop = data.regionalPopulation?.[r] ?? 0;
        // Calculate W per capita: TWh × 1e12 Wh / (pop × 8760 hours)
        regionalW[r] = pop > 0 ? genTWh * 1e12 / (pop * 8760) : 0;
      }

      console.log(
        `${yr}     ${globalW.toFixed(0).padStart(6)}  ${regionalW.oecd.toFixed(0).padStart(6)}  ${regionalW.china.toFixed(0).padStart(6)}  ${regionalW.em.toFixed(0).padStart(6)}  ${regionalW.row.toFixed(0).padStart(6)}`
      );
    }
  }

  console.log('\n=== REGIONAL DIVERGENCE SCENARIO ===');
  console.log('(OECD fossil lock-in, China accelerated solar)\n');
  console.log('Year     Global    OECD    China      EM     ROW');
  console.log('----     ------    ----    -----      --     ---');

  for (const yr of keyYears) {
    const data = divergence.results.find((y: any) => y.year === yr) as any;
    if (data) {
      const globalW = (data.finalEnergyPerCapitaDay ?? 0) * 1000 / 24;

      const regionalW: Record<string, number> = {};

      for (const r of REGIONS) {
        const regionGen = data.regionalGeneration?.[r] as Record<string, number> | undefined;
        const genTWh = regionGen
          ? Object.values(regionGen).reduce((a, b) => a + b, 0)
          : 0;
        const pop = data.regionalPopulation?.[r] ?? 0;
        regionalW[r] = pop > 0 ? genTWh * 1e12 / (pop * 8760) : 0;
      }

      console.log(
        `${yr}     ${globalW.toFixed(0).padStart(6)}  ${regionalW.oecd.toFixed(0).padStart(6)}  ${regionalW.china.toFixed(0).padStart(6)}  ${regionalW.em.toFixed(0).padStart(6)}  ${regionalW.row.toFixed(0).padStart(6)}`
      );
    }
  }

  // Show difference
  console.log('\n=== DIFFERENCE (Divergence - Baseline) ===');
  console.log('Year     Global    OECD    China      EM     ROW');
  console.log('----     ------    ----    -----      --     ---');

  for (const yr of keyYears) {
    const base = baseline.results.find((y: any) => y.year === yr) as any;
    const div = divergence.results.find((y: any) => y.year === yr) as any;
    if (base && div) {
      const baseGlobalW = (base.finalEnergyPerCapitaDay ?? 0) * 1000 / 24;
      const divGlobalW = (div.finalEnergyPerCapitaDay ?? 0) * 1000 / 24;

      const baseW: Record<string, number> = {};
      const divW: Record<string, number> = {};

      for (const r of REGIONS) {
        const basePop = base.regionalPopulation?.[r] ?? 0;
        const divPop = div.regionalPopulation?.[r] ?? 0;

        const baseRegionGen = base.regionalGeneration?.[r] as Record<string, number> | undefined;
        const divRegionGen = div.regionalGeneration?.[r] as Record<string, number> | undefined;
        const baseGenTWh = baseRegionGen ? Object.values(baseRegionGen).reduce((a, b) => a + b, 0) : 0;
        const divGenTWh = divRegionGen ? Object.values(divRegionGen).reduce((a, b) => a + b, 0) : 0;

        baseW[r] = basePop > 0 ? baseGenTWh * 1e12 / (basePop * 8760) : 0;
        divW[r] = divPop > 0 ? divGenTWh * 1e12 / (divPop * 8760) : 0;
      }

      const diff = {
        global: divGlobalW - baseGlobalW,
        oecd: divW.oecd - baseW.oecd,
        china: divW.china - baseW.china,
        em: divW.em - baseW.em,
        row: divW.row - baseW.row,
      };
      const sign = (n: number) => n >= 0 ? '+' : '';
      console.log(
        `${yr}     ${sign(diff.global)}${diff.global.toFixed(0).padStart(5)}  ${sign(diff.oecd)}${diff.oecd.toFixed(0).padStart(5)}  ${sign(diff.china)}${diff.china.toFixed(0).padStart(5)}  ${sign(diff.em)}${diff.em.toFixed(0).padStart(5)}  ${sign(diff.row)}${diff.row.toFixed(0).padStart(5)}`
      );
    }
  }

  // Also show fossil share comparison
  console.log('\n=== FOSSIL SHARE BY REGION (2050) ===');
  const base2050 = baseline.results.find((y: any) => y.year === 2050) as any;
  console.log('\nBaseline:');
  if (base2050?.regionalFossilShare) {
    for (const r of REGIONS) {
      console.log(`  ${r.toUpperCase().padEnd(6)}: ${(base2050.regionalFossilShare[r] * 100).toFixed(1)}%`);
    }
  }

  const div2050 = divergence.results.find((y: any) => y.year === 2050) as any;
  console.log('\nDivergence:');
  if (div2050?.regionalFossilShare) {
    for (const r of REGIONS) {
      console.log(`  ${r.toUpperCase().padEnd(6)}: ${(div2050.regionalFossilShare[r] * 100).toFixed(1)}%`);
    }
  }

  // Show grid intensity
  console.log('\n=== GRID INTENSITY BY REGION (kg CO₂/MWh) ===');
  console.log('\nBaseline 2050:');
  if (base2050?.regionalGridIntensity) {
    for (const r of REGIONS) {
      console.log(`  ${r.toUpperCase().padEnd(6)}: ${base2050.regionalGridIntensity[r].toFixed(0)}`);
    }
  }

  console.log('\nDivergence 2050:');
  if (div2050?.regionalGridIntensity) {
    for (const r of REGIONS) {
      console.log(`  ${r.toUpperCase().padEnd(6)}: ${div2050.regionalGridIntensity[r].toFixed(0)}`);
    }
  }
}

main().catch(console.error);

/**
 * Compare scenarios against IPCC SSP pathways
 *
 * IPCC AR6 reference temperatures (2100 vs preindustrial):
 * - SSP1-1.9: 1.4°C (1.0-1.8) - Very low emissions
 * - SSP1-2.6: 1.8°C (1.3-2.4) - Low emissions
 * - SSP2-4.5: 2.7°C (2.1-3.5) - Intermediate
 * - SSP3-7.0: 3.6°C (2.8-4.6) - High emissions
 * - SSP5-8.5: 4.4°C (3.3-5.7) - Very high emissions
 */

import { runWithScenario, runSimulation } from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';

interface ScenarioResult {
  name: string;
  description: string;
  warming2050: number;
  warming2100: number;
  peakEmissions: number;
  peakEmissionsYear: number;
  gdp2050: number;
  gdp2100: number;
  electrification2050: number;
  electrification2100: number;
  transportElec2050: number;
  buildingsElec2050: number;
  industryElec2050: number;
  fossilShare2050: number;
  fossilShare2100: number;
  sspCategory: string;
}

// Map temperature to IPCC SSP category
function categorizeSSP(temp2100: number): string {
  if (temp2100 < 1.6) return 'SSP1-1.9 (1.0-1.8°C)';
  if (temp2100 < 2.2) return 'SSP1-2.6 (1.3-2.4°C)';
  if (temp2100 < 3.2) return 'SSP2-4.5 (2.1-3.5°C)';
  if (temp2100 < 4.1) return 'SSP3-7.0 (2.8-4.6°C)';
  return 'SSP5-8.5 (3.3-5.7°C)';
}

async function runScenario(scenarioPath: string): Promise<ScenarioResult | null> {
  try {
    const { result, scenario } = await runWithScenario(scenarioPath);
    const metrics = result.metrics;
    const results = result.results;

    // Find 2050 index (year 25) and 2100 index
    const idx2050 = 25;
    const idx2100 = results.length - 1;

    const name = path.basename(scenarioPath, '.json');
    const desc = scenario.description || name;

    return {
      name,
      description: desc.substring(0, 60),
      warming2050: metrics.warming2050,
      warming2100: metrics.warming2100,
      peakEmissions: metrics.peakEmissions,
      peakEmissionsYear: metrics.peakEmissionsYear,
      gdp2050: metrics.gdp2050,
      gdp2100: metrics.gdp2100,
      electrification2050: results[idx2050]?.electrificationRate ?? 0,
      electrification2100: results[idx2100]?.electrificationRate ?? 0,
      transportElec2050: results[idx2050]?.transportElectrification ?? 0,
      buildingsElec2050: results[idx2050]?.buildingsElectrification ?? 0,
      industryElec2050: results[idx2050]?.industryElectrification ?? 0,
      fossilShare2050: results[idx2050]?.fossilShare ?? 0,
      fossilShare2100: results[idx2100]?.fossilShare ?? 0,
      sspCategory: categorizeSSP(metrics.warming2100),
    };
  } catch (err) {
    console.error(`Error running ${scenarioPath}:`, err);
    return null;
  }
}

async function main() {
  const scenariosDir = path.join(process.cwd(), 'scenarios');
  const files = fs.readdirSync(scenariosDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  console.log('=== Scenario Comparison vs IPCC SSP Pathways ===\n');

  const results: ScenarioResult[] = [];

  for (const file of files) {
    const scenarioPath = path.join(scenariosDir, file);
    const result = await runScenario(scenarioPath);
    if (result) {
      results.push(result);
      process.stdout.write('.');
    }
  }
  console.log('\n');

  // Sort by 2100 warming
  results.sort((a, b) => a.warming2100 - b.warming2100);

  // Print comparison table
  console.log('=== Temperature & Emissions ===\n');
  console.log('Scenario               2050°C  2100°C  Peak Gt   Year   SSP Category');
  console.log('--------               ------  ------  -------   ----   ------------');
  for (const r of results) {
    console.log(
      `${r.name.padEnd(22)} ${r.warming2050.toFixed(2).padStart(5)}   ${r.warming2100.toFixed(2).padStart(5)}   ${r.peakEmissions.toFixed(1).padStart(6)}   ${r.peakEmissionsYear}   ${r.sspCategory}`
    );
  }

  console.log('\n=== Economic & Electrification ===\n');
  console.log('Scenario               GDP2050  GDP2100  Elec2050  Elec2100  Fossil2050');
  console.log('--------               -------  -------  --------  --------  ----------');
  for (const r of results) {
    console.log(
      `${r.name.padEnd(22)} ${('$'+r.gdp2050.toFixed(0)+'T').padStart(7)}  ${('$'+r.gdp2100.toFixed(0)+'T').padStart(7)}    ${(r.electrification2050*100).toFixed(0).padStart(3)}%      ${(r.electrification2100*100).toFixed(0).padStart(3)}%       ${(r.fossilShare2050*100).toFixed(0).padStart(3)}%`
    );
  }

  console.log('\n=== Sector Electrification 2050 ===\n');
  console.log('Scenario               Transport  Buildings  Industry');
  console.log('--------               ---------  ---------  --------');
  for (const r of results) {
    console.log(
      `${r.name.padEnd(22)}    ${(r.transportElec2050*100).toFixed(0).padStart(3)}%       ${(r.buildingsElec2050*100).toFixed(0).padStart(3)}%      ${(r.industryElec2050*100).toFixed(0).padStart(3)}%`
    );
  }

  // Summary statistics
  console.log('\n=== Summary by SSP Category ===\n');
  const bySsp: Record<string, ScenarioResult[]> = {};
  for (const r of results) {
    if (!bySsp[r.sspCategory]) bySsp[r.sspCategory] = [];
    bySsp[r.sspCategory].push(r);
  }

  for (const [ssp, scenarios] of Object.entries(bySsp)) {
    console.log(`${ssp}:`);
    for (const s of scenarios) {
      console.log(`  - ${s.name}: ${s.warming2100.toFixed(2)}°C`);
    }
    console.log('');
  }

  // IPCC alignment check
  console.log('=== IPCC AR6 Reference ===\n');
  console.log('SSP1-1.9: 1.4°C (1.0-1.8) - Net zero by 2050, negative emissions after');
  console.log('SSP1-2.6: 1.8°C (1.3-2.4) - Stringent mitigation, well below 2°C');
  console.log('SSP2-4.5: 2.7°C (2.1-3.5) - Intermediate, current policies trajectory');
  console.log('SSP3-7.0: 3.6°C (2.8-4.6) - High emissions, regional rivalry');
  console.log('SSP5-8.5: 4.4°C (3.3-5.7) - Fossil-fueled development');
}

main().catch(console.error);

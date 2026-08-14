/**
 * Ribbit Power Letter (July 2026) vs the Twin-Engine hypothesis.
 *
 * Prints the model quantities the letter makes checkable claims about:
 * datacenter load and its share of electricity, storage cost curves,
 * solar LCOE, and robot density — for baseline, central-path (the 30%
 * Twin-Engine central branch), and ai-energy-boom (the no-demand-cap
 * counterfactual).
 *
 * Run: npm run ribbit:compare
 *
 * The letter's own claims are quoted inline as LETTER_CLAIMS so the
 * comparison does not depend on re-reading the PDF.
 */

import { runSimulation } from '../src/simulation.js';
import { runWithScenario } from '../src/index.js';

const YEARS = [2025, 2030, 2035, 2040, 2050, 2075, 2100];

/** Checkable quantitative claims from the letter, with the letter's own sources. */
const LETTER_CLAIMS = [
  ['US adds >100 GW new capacity by 2030', 'more than the US added in the prior twenty years combined'],
  ['US datacenters exceed all of Japan by 2030', 'Japan consumes ~950-1,000 TWh/yr'],
  ['AI compute reaches ~200 GW by 2030', 'BloombergNEF chart; crosses "all human brains" (~160 GW) late this decade'],
  ['Solar costs fall 30-40% per capacity doubling', 'doubling time currently ~3 years'],
  ['Solar module costs -86%, wind -49% over 15 years', 'IRENA (2024)'],
  ['Li-ion prices -88% over 15 years, grid capacity up >100x since 2020', 'BNEF'],
  ['100-hour storage: 300 MW / 30 GWh pencils to ~$33/kWh after incentives', 'Google/Minnesota system'],
  ['1 GW AI datacenter annual cost: energy $590M of ~$8.4B total', 'epoch.ai, Jefferies — power is ~7% of TCO'],
  ['US interconnection queue ~2,600 GW vs ~1,300 GW installed', 'average wait 5+ years'],
  ['Transformer lead times 2-3 years; switchgear 12-24 months', 'up from 6-12 months in 2020'],
  ['Token consumption doubling roughly every 4 months', 'Ribbit/Epoch AI'],
] as const;

function row(x: any): string {
  const dcShare = (100 * (x.dataCenterLoadTWh ?? 0)) / (x.electricityDemand || 1);
  return [
    String(x.year),
    (x.electricityDemand ?? 0).toFixed(0).padStart(7),
    (x.dataCenterLoadTWh ?? 0).toFixed(0).padStart(7),
    (dcShare.toFixed(1) + '%').padStart(6),
    (x.solarLCOE ?? 0).toFixed(1).padStart(6),
    (x.batteryCost ?? 0).toFixed(0).padStart(7),
    (x.longStorageCost ?? 0).toFixed(0).padStart(7),
    ((100 * (x.fossilShare ?? 0)).toFixed(0) + '%').padStart(7),
    (x.robotsDensity ?? 0).toFixed(0).padStart(7),
    (x.gdp ?? 0).toFixed(0).padStart(6),
  ].join('  ');
}

function dump(label: string, rows: any[]): void {
  console.log(`\n### ${label}`);
  console.log(
    'year  elec TWh   DC TWh   DC%  solar$  batt$/kWh  LDES$/kWh  fossil  rob/1k   GDP$T',
  );
  for (const y of YEARS) {
    const r = rows.find((x) => x.year === y);
    if (r) console.log(row(r));
  }
}

console.log('=== Ribbit Power Letter (Jul 2026) vs Twin-Engine ===');
console.log('\nLetter claims held up against the model:');
for (const [claim, note] of LETTER_CLAIMS) console.log(`  - ${claim}  (${note})`);

dump('baseline', runSimulation().results);
dump('central-path (Twin-Engine 30% central)', (await runWithScenario('scenarios/central-path.json')).result.results);
dump('ai-energy-boom (no demand cap)', (await runWithScenario('scenarios/ai-energy-boom.json')).result.results);

console.log(`
Implied Wright's Law exponents from the letter, for comparison with params:
  30% decline per doubling -> alpha = ${(-Math.log(0.70) / Math.LN2).toFixed(2)}
  40% decline per doubling -> alpha = ${(-Math.log(0.60) / Math.LN2).toFixed(2)}
  model central-path solar alpha = 0.36 -> ${((1 - Math.pow(2, -0.36)) * 100).toFixed(0)}% per doubling
  model tech-breakthrough  alpha = 0.42 -> ${((1 - Math.pow(2, -0.42)) * 100).toFixed(0)}% per doubling
`);

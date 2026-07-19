/**
 * Near-term validation: model 2025-2030 vs observed/projected data.
 *
 * The regression suite pins the model against its own blessed baseline and
 * the growth backcast pins 1990-2025; nothing previously checked the model's
 * first five FORWARD years against the world. The adversarial forecast
 * review found nearly every 2025-2030 observable outside the model's path
 * (all errors pointing the same direction — toward the low-emissions,
 * low-growth headline). This report makes that comparison first-class.
 *
 * Observed/near-consensus anchors (2024-2026 data):
 * - Electricity generation 2025 ~31,500 TWh; growth ~3.5-4%/yr (IEA
 *   Electricity 2025; Ember). 2024 alone +4%.
 * - Fossil CO2 emissions (energy + industry) ~38 Gt, still rising slowly
 *   (Global Carbon Budget 2024: 37.4 Gt fossil; model counts energy CO2)
 * - Grid intensity ~445-480 kg CO2/MWh (Ember 2024: ~445 net)
 * - Solar additions ~600 GW (2024), ~650-700 GW expected 2025 (BNEF/IEA)
 * - Battery storage additions ~170+ GWh/yr and rising (BNEF 2024)
 * - Transport electrification ~1.5-2% of transport FINAL ENERGY (IEA EV
 *   Outlook 2024 — EV fleet share ~2-3%, energy share lower)
 * - Datacenter load 2030 ~945 TWh (IEA Energy & AI 2025)
 * - World GDP growth ~3%/yr PPP (IMF WEO)
 *
 * Run: npx tsx scripts/nearterm-validation.ts
 * The same bands are enforced (more loosely) in simulation.test.ts once
 * initialization passes them.
 */

import { runSimulation } from '../src/index.js';

interface Check {
  name: string;
  model: number;
  low: number;
  high: number;
  unit: string;
  source: string;
}

const r: any = runSimulation({ startYear: 2025, endYear: 2031 });
const g = (y: number) => r.results[y - 2025];
const cagr = (a: number, b: number, yrs: number) => (Math.pow(b / a, 1 / yrs) - 1) * 100;

const y25 = g(2025);
const y30 = g(2030);

const checks: Check[] = [
  {
    name: 'Electricity generation 2025',
    model: y25.electricityDemand / 1000,
    low: 29, high: 33, unit: 'k TWh',
    source: 'IEA/Ember ~31.5k TWh',
  },
  {
    name: 'Electricity demand growth 2025-2030',
    model: cagr(y25.electricityDemand, y30.electricityDemand, 5),
    low: 2.5, high: 5.0, unit: '%/yr',
    source: 'IEA ~3.5-4%/yr',
  },
  {
    name: 'Energy CO2 emissions 2025',
    model: y25.electricityEmissions + y25.nonElectricEmissions,
    low: 35, high: 40, unit: 'Gt CO2',
    source: 'GCB 2024 fossil ~37.4 Gt, rising',
  },
  {
    name: 'Grid intensity 2025',
    model: y25.gridIntensity,
    low: 420, high: 510, unit: 'kg/MWh',
    source: 'Ember 2024 ~445-480',
  },
  {
    name: 'GDP growth 2026-2030',
    model: cagr(g(2026).gdp, g(2030).gdp, 4),
    low: 1.5, high: 4.0, unit: '%/yr',
    source: 'IMF ~3%/yr PPP',
  },
  {
    name: 'Transport electrification 2025',
    model: y25.transportElectrification * 100,
    low: 1, high: 4, unit: '% of transport final energy',
    source: 'IEA EV Outlook ~1.5-2%',
  },
  {
    name: 'Transport electrification 2030',
    model: y30.transportElectrification * 100,
    low: 3, high: 10, unit: '% of transport final energy',
    source: 'aggressive forecasts ~4-5%',
  },
  {
    name: 'Datacenter load 2030',
    model: y30.dataCenterLoadTWh,
    low: 750, high: 1300, unit: 'TWh',
    source: 'IEA Energy & AI ~945 TWh',
  },
  {
    name: 'Solar additions 2026',
    model: g(2026).capacities.solar - g(2025).capacities.solar,
    low: 450, high: 900, unit: 'GW',
    source: '~600 GW (2024), ~650-700 expected',
  },
];

console.log('Near-term validation: model vs observed 2025-2030\n');
console.log('CHECK'.padEnd(42) + 'MODEL'.padStart(9) + '   BAND'.padEnd(16) + 'SOURCE');
let failures = 0;
for (const c of checks) {
  const pass = c.model >= c.low && c.model <= c.high;
  if (!pass) failures++;
  const flag = pass ? ' ok ' : ' ⚠  ';
  console.log(
    flag + c.name.padEnd(40)
    + c.model.toFixed(1).padStart(8)
    + `  [${c.low}-${c.high}] ${c.unit}`.padEnd(30)
    + c.source
  );
}
console.log(`\n${checks.length - failures}/${checks.length} within band`);
if (failures > 0) process.exitCode = 1;

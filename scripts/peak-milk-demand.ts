/**
 * Peak Milk Demand Projection
 *
 * Overlays a milk-specific demand model on top of the simulation's
 * GDP/population trajectories. Unlike aggregate protein (Bennett's Law
 * monotonic logistic), milk per capita follows an inverted-U with income:
 *
 *   milkPerCapita(y) = peakMilk × (y/y_peak) × exp(1 - y/y_peak)
 *
 * where y = GDP/capita ($PPP) and y_peak is the income at which
 * per-capita consumption peaks. This functional form (a Gamma-like hump)
 * captures the empirical pattern:
 *   - Low income: rising milk with income (nutrition transition)
 *   - Middle income: peak consumption
 *   - High income: decline (substitution to cheese, plant-based, etc.)
 *
 * Regional calibration based on FAO/OECD data:
 *   - OECD: peaked ~$35k, now declining (~270 kg/cap → ~230 kg/cap)
 *   - China: low baseline, lactose intolerance caps uptake
 *   - Emerging (India-heavy): strong dairy culture, still rising
 *   - Rest of world: mixed, moderate trajectory
 */

import { runSimulation } from '../src/index.js';
import type { YearResult } from '../src/index.js';
import type { Region } from '../src/framework/types.js';

// ---------------------------------------------------------------------------
// Milk demand model: inverted-U (Gamma-like hump)
// ---------------------------------------------------------------------------

interface MilkParams {
  peakMilkKgCap: number;   // kg/capita/year at peak consumption
  peakGdpCapita: number;   // GDP/capita ($) at which per-capita peaks
  floor: number;           // Minimum kg/cap (doesn't fall below this)
}

// Gamma-like hump: f(y) = peak × (y/y_peak) × exp(1 - y/y_peak)
// Peaks at y = y_peak with value = peak
// Declines for y > y_peak but approaches 0 only at very high y
function milkPerCapita(gdpPerCapita: number, p: MilkParams): number {
  const ratio = gdpPerCapita / p.peakGdpCapita;
  const raw = p.peakMilkKgCap * ratio * Math.exp(1 - ratio);
  return Math.max(raw, p.floor);
}

// Regional calibration
// Sources: FAO Food Balance Sheets, OECD-FAO Agricultural Outlook,
//          USDA ERS Dairy Data, India NDDB statistics
const REGIONAL_MILK: Record<Region, MilkParams> = {
  // OECD: US peaked ~1945 at ~130 kg fluid milk; total dairy (milk-equiv)
  // peaked ~270 kg/cap around $35k. Now ~230 kg/cap at ~$50k.
  oecd: {
    peakMilkKgCap: 270,
    peakGdpCapita: 35000,
    floor: 150,      // Cheese/yogurt provide a floor
  },

  // China: lactose intolerance (~90%), low base (~40 kg/cap), rising but
  // capped. Peak expected ~$25k at modest ~80 kg/cap.
  china: {
    peakMilkKgCap: 80,
    peakGdpCapita: 25000,
    floor: 30,
  },

  // Emerging markets (India-weighted): India is world's largest milk producer
  // with strong dairy culture despite partial lactose intolerance.
  // Currently ~85 kg/cap, rising fast. Peak likely ~$20k at ~140 kg/cap.
  em: {
    peakMilkKgCap: 140,
    peakGdpCapita: 20000,
    floor: 60,
  },

  // Rest of world: Sub-Saharan Africa, SE Asia, Latin America mix.
  // Low current consumption (~50 kg/cap), modest ceiling due to
  // lactose intolerance in key populations. Peak ~$18k at ~100 kg/cap.
  row: {
    peakMilkKgCap: 100,
    peakGdpCapita: 18000,
    floor: 40,
  },
};

// ---------------------------------------------------------------------------
// Run scenarios
// ---------------------------------------------------------------------------

const REGIONS: Region[] = ['oecd', 'china', 'em', 'row'];

interface MilkResult {
  year: number;
  totalMt: number;
  perCapitaKg: number;
  regional: Record<Region, { mt: number; kgCap: number }>;
}

function projectMilk(years: number[], results: YearResult[]): MilkResult[] {
  return years.map((year, i) => {
    const r = results[i];
    let totalKg = 0;
    let totalPop = 0;
    const regional = {} as Record<Region, { mt: number; kgCap: number }>;

    for (const reg of REGIONS) {
      const pop = r.regionalPopulation[reg];
      const gdp = r.regionalGdp[reg];    // $T
      const gdpCap = (gdp * 1e12) / pop; // $/person
      const kgCap = milkPerCapita(gdpCap, REGIONAL_MILK[reg]);
      const totalRegKg = pop * kgCap;

      regional[reg] = { mt: totalRegKg / 1e9, kgCap };
      totalKg += totalRegKg;
      totalPop += pop;
    }

    return {
      year,
      totalMt: totalKg / 1e9,
      perCapitaKg: totalKg / totalPop,
      regional,
    };
  });
}

interface PeakInfo {
  year: number;
  value: number;
}

function findPeak(data: MilkResult[], key: 'totalMt' | 'perCapitaKg'): PeakInfo {
  let best = { year: data[0].year, value: -Infinity };
  for (const d of data) {
    if (d[key] > best.value) {
      best = { year: d.year, value: d[key] };
    }
  }
  return best;
}

// Scenarios
const scenarios: Record<string, object> = {
  'Baseline': {},
  'Net-Zero': { energy: { carbonPrice: 150 } },
  'High climate sensitivity (4.5°C)': { climate: { sensitivity: 4.5 } },
  'Tech breakthrough': {
    energy: { solarAlpha: 0.44, windAlpha: 0.30, batteryAlpha: 0.25 },
  },
};

console.log('='.repeat(95));
console.log('PEAK MILK DEMAND PROJECTION');
console.log('Regional inverted-U model (Gamma-hump) over simulation GDP/population trajectories');
console.log('='.repeat(95));
console.log();

for (const [name, overrides] of Object.entries(scenarios)) {
  const { years, results } = runSimulation(overrides);
  const milk = projectMilk(years, results);

  const peakTotal = findPeak(milk, 'totalMt');
  const peakPerCap = findPeak(milk, 'perCapitaKg');

  const m2025 = milk[0];
  const m2050 = milk.find(m => m.year === 2050)!;
  const m2100 = milk[milk.length - 1];

  console.log(`--- ${name} ---`);
  console.log(`  Peak total milk demand:  ${peakTotal.value.toFixed(0)} Mt in ${peakTotal.year}`);
  console.log(`  Peak per-capita demand:  ${peakPerCap.value.toFixed(1)} kg/cap in ${peakPerCap.year}`);
  console.log();
  console.log(`  Total demand: 2025: ${m2025.totalMt.toFixed(0)} Mt → 2050: ${m2050.totalMt.toFixed(0)} Mt → 2100: ${m2100.totalMt.toFixed(0)} Mt`);
  console.log(`  Per-capita:   2025: ${m2025.perCapitaKg.toFixed(1)} kg → 2050: ${m2050.perCapitaKg.toFixed(1)} kg → 2100: ${m2100.perCapitaKg.toFixed(1)} kg`);
  console.log();

  // Regional breakdown at key years
  console.log('  Regional per-capita (kg/cap):');
  console.log('    Region    | 2025    | 2050    | 2100    | Peak yr');
  console.log('    ' + '-'.repeat(55));
  for (const reg of REGIONS) {
    const regData = milk.map(m => ({ year: m.year, kgCap: m.regional[reg].kgCap }));
    const regPeak = regData.reduce((best, d) => d.kgCap > best.kgCap ? d : best);
    console.log(
      `    ${reg.padEnd(10)}| ${m2025.regional[reg].kgCap.toFixed(1).padStart(7)} | ` +
      `${m2050.regional[reg].kgCap.toFixed(1).padStart(7)} | ` +
      `${m2100.regional[reg].kgCap.toFixed(1).padStart(7)} | ${regPeak.year}`
    );
  }
  console.log();

  // Regional volumes
  console.log('  Regional volume (Mt):');
  console.log('    Region    | 2025    | 2050    | 2100    | Peak yr | Peak Mt');
  console.log('    ' + '-'.repeat(65));
  for (const reg of REGIONS) {
    const regData = milk.map(m => ({ year: m.year, mt: m.regional[reg].mt }));
    const regPeak = regData.reduce((best, d) => d.mt > best.mt ? d : best);
    console.log(
      `    ${reg.padEnd(10)}| ${m2025.regional[reg].mt.toFixed(0).padStart(7)} | ` +
      `${m2050.regional[reg].mt.toFixed(0).padStart(7)} | ` +
      `${m2100.regional[reg].mt.toFixed(0).padStart(7)} | ` +
      `${String(regPeak.year).padStart(7)} | ${regPeak.mt.toFixed(0).padStart(7)}`
    );
  }
  console.log();
}

// Detailed baseline trajectory
console.log('='.repeat(95));
console.log('BASELINE MILK TRAJECTORY (every 5 years)');
console.log('='.repeat(95));

const { years, results } = runSimulation({});
const milk = projectMilk(years, results);

console.log('Year | Total (Mt) | Per-cap (kg) | OECD kg | China kg | EM kg  | ROW kg  | Pop (B)');
console.log('-'.repeat(90));
for (const m of milk) {
  if (m.year % 5 === 0 || m.year === 2025) {
    const r = results[years.indexOf(m.year)];
    const pop = r.population / 1e9;
    console.log(
      `${m.year} | ${m.totalMt.toFixed(0).padStart(10)} | ` +
      `${m.perCapitaKg.toFixed(1).padStart(12)} | ` +
      `${m.regional.oecd.kgCap.toFixed(1).padStart(7)} | ` +
      `${m.regional.china.kgCap.toFixed(1).padStart(8)} | ` +
      `${m.regional.em.kgCap.toFixed(1).padStart(6)} | ` +
      `${m.regional.row.kgCap.toFixed(1).padStart(7)} | ` +
      `${pop.toFixed(2).padStart(7)}`
    );
  }
}

console.log();
console.log('='.repeat(95));
console.log('KEY INSIGHT: Compare with aggregate protein (Bennett\'s Law)');
console.log('='.repeat(95));
console.log('Aggregate protein share: monotonically rising, no peak before 2100');
console.log('Milk demand per capita:  inverted-U, peaks when developing world reaches middle income');
console.log('Total milk volume:       peaks when per-capita decline outweighs population growth');
console.log();
console.log('The difference arises because:');
console.log('  1. Milk has substitutes (cheese, plant-based) that dominate at high income');
console.log('  2. Lactose intolerance caps uptake in Asia/Africa (65-90% prevalence)');
console.log('  3. Meat protein keeps rising at high income; dairy does not');

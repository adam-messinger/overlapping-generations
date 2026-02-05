/**
 * Peak Beef Demand Projection
 *
 * Beef has the most pronounced inverted-U of any major protein source:
 *   - Worst feed-conversion ratio (~25:1 vs ~2:1 chicken)
 *   - Highest GHG intensity (~60 kg CO2e/kg vs ~6 for chicken)
 *   - Strong cultural constraints (Hindu India, partial Muslim avoidance)
 *   - Health-driven substitution at high income (red meat → poultry/fish)
 *   - Environmental pressure accelerating in wealthy countries
 *
 * US per-capita beef peaked ~1976 at ~40 kg/cap (boneless equivalent),
 * now ~26 kg/cap. EU is lower and flatter (~15 kg/cap, slight decline).
 * Brazil/Argentina historically high (~25-30 kg/cap) but diverging.
 *
 * Model: same Gamma-hump as milk, but with:
 *   - Lower peaks (beef is expensive protein)
 *   - Earlier peak GDP (substitution to chicken kicks in sooner)
 *   - Strong regional heterogeneity (India near-zero, Americas high)
 *   - Optional carbon-price sensitivity (beef is uniquely exposed)
 */

import { runSimulation } from '../src/index.js';
import type { YearResult } from '../src/index.js';
import type { Region } from '../src/framework/types.js';

const REGIONS: Region[] = ['oecd', 'china', 'em', 'row'];

// ---------------------------------------------------------------------------
// Beef demand model
// ---------------------------------------------------------------------------

interface BeefParams {
  peakBeefKgCap: number;   // kg/capita/year at peak consumption
  peakGdpCapita: number;   // GDP/capita ($) at which per-capita peaks
  floor: number;           // Minimum kg/cap (cultural/structural floor)
}

function beefPerCapita(gdpPerCapita: number, p: BeefParams): number {
  const ratio = gdpPerCapita / p.peakGdpCapita;
  const raw = p.peakBeefKgCap * ratio * Math.exp(1 - ratio);
  return Math.max(raw, p.floor);
}

// Regional calibration
// Sources: FAO Food Balance Sheets, USDA FAS, OECD-FAO Outlook
const REGIONAL_BEEF: Record<Region, BeefParams> = {
  // OECD: weighted average of US (~26 kg, peaked ~40), EU (~15, peaked ~20),
  // Japan (~10, peaked ~12), Aus/NZ (~25, peaked ~35). Population-weighted
  // peak ~28 kg/cap around $30k. Declining toward ~12 kg/cap floor as
  // chicken/plant-based substitute and health/environmental norms shift.
  oecd: {
    peakBeefKgCap: 28,
    peakGdpCapita: 30000,
    floor: 12,
  },

  // China: pork dominates (60% of meat). Beef historically minor (~7 kg/cap),
  // rising with income but capped by pork preference and cost.
  // Peak expected ~$22k at modest ~12 kg/cap.
  china: {
    peakBeefKgCap: 12,
    peakGdpCapita: 22000,
    floor: 4,
  },

  // Emerging markets: India dominates population. Hindu cultural avoidance
  // (~80% of India, ~40% of EM population) creates a very low ceiling.
  // India is ~1-2 kg/cap. Brazil ~25 kg/cap but small share of EM pop.
  // Blended peak ~8 kg/cap — India drags the average far down.
  em: {
    peakBeefKgCap: 8,
    peakGdpCapita: 15000,
    floor: 3,
  },

  // Rest of world: Sub-Saharan Africa (~3-4 kg/cap), SE Asia (~3-5),
  // Latin America ex-Brazil (~15), Middle East (~5-8). Rising from
  // low base. Peak ~10 kg/cap at ~$15k, limited by cost and competition
  // from cheaper poultry.
  row: {
    peakBeefKgCap: 10,
    peakGdpCapita: 15000,
    floor: 3,
  },
};

// ---------------------------------------------------------------------------
// Carbon price effect on beef
// ---------------------------------------------------------------------------
// Beef is uniquely exposed to carbon pricing:
//   ~60 kg CO2e per kg beef (enteric methane + land use + feed)
//   At $100/t CO2e, that's ~$6/kg cost increase (~30-50% of retail price)
//
// Elasticity: price elasticity of beef demand ~ -0.7 (USDA ERS)
// So a 30% price increase → ~21% demand reduction

function carbonPriceAdjustment(
  carbonPrice: number,    // $/t CO2
  beefEmissionsIntensity: number = 60,  // kg CO2e/kg beef
  priceElasticity: number = -0.7,
  retailPrice: number = 15,   // $/kg baseline retail
): number {
  if (carbonPrice <= 0) return 1.0;
  const costIncrease = (carbonPrice * beefEmissionsIntensity) / 1000; // $/kg
  const priceChangeRatio = costIncrease / retailPrice;
  const demandChange = priceElasticity * priceChangeRatio;
  return Math.max(0.5, 1.0 + demandChange);  // floor at 50% reduction
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

interface BeefResult {
  year: number;
  totalMt: number;
  perCapitaKg: number;
  regional: Record<Region, { mt: number; kgCap: number }>;
}

function projectBeef(
  years: number[],
  results: YearResult[],
  carbonPricePath?: (year: number) => number,
): BeefResult[] {
  return years.map((year, i) => {
    const r = results[i];
    let totalKg = 0;
    let totalPop = 0;
    const regional = {} as Record<Region, { mt: number; kgCap: number }>;

    const cpAdj = carbonPricePath
      ? carbonPriceAdjustment(carbonPricePath(year))
      : 1.0;

    for (const reg of REGIONS) {
      const pop = r.regionalPopulation[reg];
      const gdp = r.regionalGdp[reg];
      const gdpCap = (gdp * 1e12) / pop;
      const kgCap = beefPerCapita(gdpCap, REGIONAL_BEEF[reg]) * cpAdj;
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

interface PeakInfo { year: number; value: number; }

function findPeak(data: BeefResult[], key: 'totalMt' | 'perCapitaKg'): PeakInfo {
  let best = { year: data[0].year, value: -Infinity };
  for (const d of data) {
    if (d[key] > best.value) best = { year: d.year, value: d[key] };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const scenarios: Array<{
  name: string;
  overrides: object;
  carbonPricePath?: (year: number) => number;
}> = [
  { name: 'Baseline', overrides: {} },
  { name: 'Net-Zero (carbon price $150)', overrides: { energy: { carbonPrice: 150 } } },
  {
    name: 'Baseline + methane tax (ramp to $100/t CO2e by 2050)',
    overrides: {},
    carbonPricePath: (year: number) => {
      if (year <= 2025) return 0;
      if (year >= 2050) return 100;
      return 100 * (year - 2025) / 25;
    },
  },
  {
    name: 'Baseline + aggressive methane tax ($200/t by 2040)',
    overrides: {},
    carbonPricePath: (year: number) => {
      if (year <= 2025) return 0;
      if (year >= 2040) return 200;
      return 200 * (year - 2025) / 15;
    },
  },
  { name: 'High climate sensitivity (4.5°C)', overrides: { climate: { sensitivity: 4.5 } } },
];

console.log('='.repeat(95));
console.log('PEAK BEEF DEMAND PROJECTION');
console.log('Regional inverted-U model with optional carbon-price sensitivity');
console.log('='.repeat(95));
console.log();

for (const { name, overrides, carbonPricePath } of scenarios) {
  const { years, results } = runSimulation(overrides);
  const beef = projectBeef(years, results, carbonPricePath);

  const peakTotal = findPeak(beef, 'totalMt');
  const peakPerCap = findPeak(beef, 'perCapitaKg');

  const b2025 = beef[0];
  const b2050 = beef.find(b => b.year === 2050)!;
  const b2100 = beef[beef.length - 1];

  console.log(`--- ${name} ---`);
  console.log(`  Peak total beef demand:  ${peakTotal.value.toFixed(1)} Mt in ${peakTotal.year}`);
  console.log(`  Peak per-capita demand:  ${peakPerCap.value.toFixed(1)} kg/cap in ${peakPerCap.year}`);
  console.log();
  console.log(`  Total demand: 2025: ${b2025.totalMt.toFixed(1)} Mt → 2050: ${b2050.totalMt.toFixed(1)} Mt → 2100: ${b2100.totalMt.toFixed(1)} Mt`);
  console.log(`  Per-capita:   2025: ${b2025.perCapitaKg.toFixed(1)} kg → 2050: ${b2050.perCapitaKg.toFixed(1)} kg → 2100: ${b2100.perCapitaKg.toFixed(1)} kg`);
  console.log();

  // Regional per-capita
  console.log('  Regional per-capita (kg/cap):');
  console.log('    Region    | 2025    | 2050    | 2100    | Peak yr');
  console.log('    ' + '-'.repeat(55));
  for (const reg of REGIONS) {
    const regData = beef.map(b => ({ year: b.year, kgCap: b.regional[reg].kgCap }));
    const regPeak = regData.reduce((best, d) => d.kgCap > best.kgCap ? d : best);
    console.log(
      `    ${reg.padEnd(10)}| ${b2025.regional[reg].kgCap.toFixed(1).padStart(7)} | ` +
      `${b2050.regional[reg].kgCap.toFixed(1).padStart(7)} | ` +
      `${b2100.regional[reg].kgCap.toFixed(1).padStart(7)} | ${regPeak.year}`
    );
  }
  console.log();

  // Regional volumes
  console.log('  Regional volume (Mt):');
  console.log('    Region    | 2025    | 2050    | 2100    | Peak yr | Peak Mt');
  console.log('    ' + '-'.repeat(65));
  for (const reg of REGIONS) {
    const regData = beef.map(b => ({ year: b.year, mt: b.regional[reg].mt }));
    const regPeak = regData.reduce((best, d) => d.mt > best.mt ? d : best);
    console.log(
      `    ${reg.padEnd(10)}| ${b2025.regional[reg].mt.toFixed(1).padStart(7)} | ` +
      `${b2050.regional[reg].mt.toFixed(1).padStart(7)} | ` +
      `${b2100.regional[reg].mt.toFixed(1).padStart(7)} | ` +
      `${String(regPeak.year).padStart(7)} | ${regPeak.mt.toFixed(1).padStart(7)}`
    );
  }
  console.log();
}

// Detailed baseline trajectory
console.log('='.repeat(95));
console.log('BASELINE BEEF TRAJECTORY (every 5 years)');
console.log('='.repeat(95));

const { years, results } = runSimulation({});
const beef = projectBeef(years, results);

console.log('Year | Total (Mt) | Per-cap (kg) | OECD kg | China kg | EM kg  | ROW kg  | Pop (B)');
console.log('-'.repeat(90));
for (const b of beef) {
  if (b.year % 5 === 0 || b.year === 2025) {
    const r = results[years.indexOf(b.year)];
    const pop = r.population / 1e9;
    console.log(
      `${b.year} | ${b.totalMt.toFixed(1).padStart(10)} | ` +
      `${b.perCapitaKg.toFixed(1).padStart(12)} | ` +
      `${b.regional.oecd.kgCap.toFixed(1).padStart(7)} | ` +
      `${b.regional.china.kgCap.toFixed(1).padStart(8)} | ` +
      `${b.regional.em.kgCap.toFixed(1).padStart(6)} | ` +
      `${b.regional.row.kgCap.toFixed(1).padStart(7)} | ` +
      `${pop.toFixed(2).padStart(7)}`
    );
  }
}

// Comparison table
console.log();
console.log('='.repeat(95));
console.log('COMPARISON: Peak timing across protein categories');
console.log('='.repeat(95));
console.log('Category          | Peak per-cap | Peak volume | Mechanism');
console.log('-'.repeat(80));
console.log('Total protein (%) | Never (<2100)| Never       | Bennett\'s Law monotonic logistic');
console.log('Grain demand (Mt) | ~2060s       | ~2082       | Population decline eventually dominates');
console.log('Milk (kg)         | ~2047        | ~2051       | Inverted-U; substitution at high income');
console.log('Beef (kg)         | ~2035        | ~2040       | Strongest inverted-U; health + cost + env');
console.log('Farmland (Mha)    | n/a          | ~2028       | Yield tech outpaces demand growth');

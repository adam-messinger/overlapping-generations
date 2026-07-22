/**
 * "Wind at its back" — score regions across demographics, energy, convergence.
 *
 * For each region, pulls trajectory metrics from baseline run and ranks them on:
 *   - Demographic dividend: working-age share, dependency change, fertility above floor
 *   - Convergence: GDP/cap growth 2025→2100, total real GDP gain
 *   - Energy decarbonization: grid intensity drop, fossil share drop
 *   - Energy intensity decline: efficiency gains
 *   - Climate-adjusted growth: per-cap GDP growth less regional damages
 */
import { runAutowiredSimulation } from '../src/simulation-autowired.js';
import { getOutputsAtYear } from '../src/framework/autowire.js';
import { REGIONS, type Region } from '../src/domain-types.js';

const REGION_LABEL: Record<Region, string> = {
  oecd: 'OECD',
  china: 'China',
  india: 'India',
  latam: 'Latin Am.',
  seasia: 'SE Asia',
  russia: 'Russia',
  mena: 'MENA',
  ssa: 'Sub-Sah. Africa',
};

const aw = runAutowiredSimulation({});
const years = aw.years;
const i2025 = years.indexOf(2025);
const i2050 = years.indexOf(2050);
const i2100 = years.indexOf(2100);
const o2025 = getOutputsAtYear(aw, i2025);
const o2050 = getOutputsAtYear(aw, i2050);
const o2100 = getOutputsAtYear(aw, i2100);

interface Row {
  region: Region;
  // Demographics
  pop2025: number;
  pop2100: number;
  popGrowth: number;
  workingShare2025: number;
  workingShare2100: number;
  workingSharePeak: number;
  workingShareYearOfPeak: number;
  dependency2025: number;
  dependency2100: number;
  fertility2100: number;
  lifeExp2100: number;
  effectiveWorkers2025: number;
  effectiveWorkers2100: number;
  ewGrowth: number;
  // Convergence
  gdp2025: number;
  gdp2100: number;
  gdpCagr: number;
  gdpPerCap2025: number;
  gdpPerCap2100: number;
  gdpPerCapCagr: number;
  // Energy
  gridInt2025: number;
  gridInt2100: number;
  gridIntDrop: number;
  fossilShare2025: number;
  fossilShare2100: number;
  fossilDrop: number;
  energyIntensity2025: number;
  energyIntensity2100: number;
  energyIntensityDrop: number;
  // Climate
  damages2100: number;
}

function workingShareAt(o: ReturnType<typeof getOutputsAtYear>, r: Region): number {
  const pop = o.regionalPopulation?.[r] ?? 0;
  const working = o.regionalWorking?.[r] ?? 0;
  return pop > 0 ? working / pop : 0;
}

const rows: Row[] = [];
for (const r of REGIONS) {
  const reg25 = o2025.regional?.[r];
  const reg100 = o2100.regional?.[r];
  if (!reg25 || !reg100) continue;

  const pop25 = o2025.regionalPopulation?.[r] ?? 0;
  const pop100 = o2100.regionalPopulation?.[r] ?? 0;
  const ew25 = o2025.regionalEffectiveWorkers?.[r] ?? 0;
  const ew100 = o2100.regionalEffectiveWorkers?.[r] ?? 0;

  // Find peak working-share year
  let peak = 0;
  let peakYear = 2025;
  for (let i = 0; i < years.length; i++) {
    const o = getOutputsAtYear(aw, i);
    const ws = workingShareAt(o, r);
    if (ws > peak) {
      peak = ws;
      peakYear = years[i];
    }
  }

  const yrs = 2100 - 2025;
  const gdpCagr = Math.pow(reg100.gdp / reg25.gdp, 1 / yrs) - 1;
  const gdpPerCap25 = (reg25.gdp * 1e12) / pop25;
  const gdpPerCap100 = (reg100.gdp * 1e12) / pop100;
  const gdpPerCapCagr = Math.pow(gdpPerCap100 / gdpPerCap25, 1 / yrs) - 1;

  const gridInt25 = o2025.regionalGridIntensity?.[r] ?? 0;
  const gridInt100 = o2100.regionalGridIntensity?.[r] ?? 0;
  const fos25 = o2025.regionalFossilShare?.[r] ?? 0;
  const fos100 = o2100.regionalFossilShare?.[r] ?? 0;

  rows.push({
    region: r,
    pop2025: pop25,
    pop2100: pop100,
    popGrowth: pop25 > 0 ? pop100 / pop25 - 1 : 0,
    workingShare2025: workingShareAt(o2025, r),
    workingShare2100: workingShareAt(o2100, r),
    workingSharePeak: peak,
    workingShareYearOfPeak: peakYear,
    dependency2025: o2025.regionalDependency?.[r] ?? 0,
    dependency2100: o2100.regionalDependency?.[r] ?? 0,
    fertility2100: o2100.regionalFertility?.[r] ?? 0,
    lifeExp2100: o2100.regionalLifeExpectancy?.[r] ?? 0,
    effectiveWorkers2025: ew25,
    effectiveWorkers2100: ew100,
    ewGrowth: ew25 > 0 ? ew100 / ew25 - 1 : 0,
    gdp2025: reg25.gdp,
    gdp2100: reg100.gdp,
    gdpCagr,
    gdpPerCap2025: gdpPerCap25,
    gdpPerCap2100: gdpPerCap100,
    gdpPerCapCagr,
    gridInt2025: gridInt25,
    gridInt2100: gridInt100,
    gridIntDrop: gridInt25 > 0 ? 1 - gridInt100 / gridInt25 : 0,
    fossilShare2025: fos25,
    fossilShare2100: fos100,
    fossilDrop: fos25 - fos100,
    energyIntensity2025: reg25.energyIntensity,
    energyIntensity2100: reg100.energyIntensity,
    energyIntensityDrop: reg25.energyIntensity > 0 ? 1 - reg100.energyIntensity / reg25.energyIntensity : 0,
    damages2100: o2100.regionalAdaptation?.[r] ?? 0,
  });
}

// Composite tailwind score (z-score across regions, equal-weight 4 pillars)
function zScores<T>(rows: T[], fn: (x: T) => number): number[] {
  const vals = rows.map(fn);
  const mu = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mu) ** 2, 0) / vals.length;
  const sd = Math.sqrt(variance) || 1;
  return vals.map(v => (v - mu) / sd);
}

const zPerCapGrowth = zScores(rows, r => r.gdpPerCapCagr);
const zEffWorkerGrowth = zScores(rows, r => r.ewGrowth);
const zGridDrop = zScores(rows, r => r.gridIntDrop);
const zFossilDrop = zScores(rows, r => r.fossilDrop);
const zEIDrop = zScores(rows, r => r.energyIntensityDrop);

const composite = rows.map((_r, i) => ({
  region: rows[i].region,
  econ: zPerCapGrowth[i],
  demo: zEffWorkerGrowth[i],
  decarb: (zGridDrop[i] + zFossilDrop[i]) / 2,
  efficiency: zEIDrop[i],
  score:
    0.30 * zPerCapGrowth[i] +
    0.25 * zEffWorkerGrowth[i] +
    0.25 * (zGridDrop[i] + zFossilDrop[i]) / 2 +
    0.20 * zEIDrop[i],
}));

composite.sort((a, b) => b.score - a.score);

// =============================================================================
// PRINT
// =============================================================================

const fmt = {
  pct: (v: number, d = 1) => `${(v * 100).toFixed(d)}%`,
  pctSigned: (v: number, d = 1) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(d)}%`,
  num: (v: number, d = 1) => v.toFixed(d),
  bn: (v: number) => `${(v / 1e9).toFixed(2)}B`,
  $T: (v: number) => `$${v.toFixed(1)}T`,
  $k: (v: number) => `$${(v / 1000).toFixed(1)}k`,
  z: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`,
};

console.log('\n=============================================================');
console.log('  REGIONAL TAILWINDS — Baseline simulation, 2025→2100');
console.log('=============================================================\n');

console.log('DEMOGRAPHICS');
console.log('-----------------------------------------------------------------------------');
console.log('Region              Pop25→Pop100    Working%   Dep25→Dep100  Fert  LifeExp');
for (const row of rows) {
  console.log(
    `${REGION_LABEL[row.region].padEnd(20)}` +
    `${fmt.bn(row.pop2025)} → ${fmt.bn(row.pop2100)}   `.padEnd(16) +
    `${fmt.pct(row.workingShare2025, 0)}→${fmt.pct(row.workingShare2100, 0)}  `.padEnd(11) +
    `${fmt.pct(row.dependency2025, 0)}→${fmt.pct(row.dependency2100, 0)}    `.padEnd(14) +
    `${row.fertility2100.toFixed(2)}  `.padEnd(6) +
    `${row.lifeExp2100.toFixed(0)}`
  );
}

console.log('\nCONVERGENCE & GROWTH');
console.log('-----------------------------------------------------------------------------');
console.log('Region              GDP25→GDP100      GDPpc25→GDPpc100      GDP CAGR  PCap CAGR');
for (const row of rows) {
  console.log(
    `${REGION_LABEL[row.region].padEnd(20)}` +
    `${fmt.$T(row.gdp2025)} → ${fmt.$T(row.gdp2100)}   `.padEnd(18) +
    `${fmt.$k(row.gdpPerCap2025)} → ${fmt.$k(row.gdpPerCap2100)}     `.padEnd(22) +
    `${fmt.pct(row.gdpCagr, 2)}    `.padEnd(10) +
    `${fmt.pct(row.gdpPerCapCagr, 2)}`
  );
}

console.log('\nENERGY DECARBONIZATION');
console.log('-----------------------------------------------------------------------------');
console.log('Region              GridInt 25→100        Fossil 25→100        EnInt 25→100');
for (const row of rows) {
  console.log(
    `${REGION_LABEL[row.region].padEnd(20)}` +
    `${row.gridInt2025.toFixed(0)}→${row.gridInt2100.toFixed(0)} kg/MWh  `.padEnd(22) +
    `${fmt.pct(row.fossilShare2025, 0)}→${fmt.pct(row.fossilShare2100, 0)}    `.padEnd(21) +
    `${row.energyIntensity2025.toFixed(2)}→${row.energyIntensity2100.toFixed(2)}`
  );
}

console.log('\nCOMPOSITE TAILWIND SCORE (z-scores, higher = more wind at back)');
console.log('-----------------------------------------------------------------------------');
console.log('Rank  Region              Score    Econ     Demo     Decarb   Efficiency');
composite.forEach((c, i) => {
  console.log(
    `${(i + 1).toString().padStart(2)}.   ` +
    `${REGION_LABEL[c.region].padEnd(20)}` +
    `${fmt.z(c.score)}    `.padEnd(9) +
    `${fmt.z(c.econ)}    `.padEnd(9) +
    `${fmt.z(c.demo)}    `.padEnd(9) +
    `${fmt.z(c.decarb)}    `.padEnd(9) +
    `${fmt.z(c.efficiency)}`
  );
});

console.log('\nWeights: 30% per-cap growth, 25% effective-worker growth, 25% decarb, 20% efficiency.\n');

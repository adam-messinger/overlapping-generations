/**
 * Correlation analysis: Robots/k vs SolarGW deployment
 */

import { runSimulation } from '../src/simulation.js';

const result = runSimulation();
const r = result.results;

// Extract time series
const years = r.map(x => x.year);
const robots = r.map(x => x.robotsDensity);
const solarGW = r.map(x => x.capacities?.solar ?? 0);
const solarAdditions = solarGW.map((v, i) => i === 0 ? 0 : v - solarGW[i-1]);
const batteryGWh = r.map(x => x.capacities?.battery ?? 0);
const elecDemand = r.map(x => x.electricityDemand);
const gdp = r.map(x => x.gdp);

// Pearson correlation function
function pearson(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

console.log('=== Correlation Analysis ===\n');

console.log('Pearson correlations with Robots/k:');
console.log(`  Solar GW (cumulative):  r = ${pearson(robots, solarGW).toFixed(3)}`);
console.log(`  Solar additions (GW/yr): r = ${pearson(robots, solarAdditions).toFixed(3)}`);
console.log(`  Battery GWh:            r = ${pearson(robots, batteryGWh).toFixed(3)}`);
console.log(`  Electricity demand:     r = ${pearson(robots, elecDemand).toFixed(3)}`);
console.log(`  GDP:                    r = ${pearson(robots, gdp).toFixed(3)}`);

console.log('\n=== Time Series Comparison ===\n');
console.log('Year    Robots/k   SolarGW   Solar+/yr   BattGWh    ElecTWh');
console.log('----    --------   -------   ---------   -------    -------');

const keyYears = [2025, 2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100];
for (const year of keyYears) {
  const i = r.findIndex(x => x.year === year);
  if (i >= 0) {
    console.log(
      `${year}    ` +
      `${robots[i].toFixed(0).padStart(8)}   ` +
      `${solarGW[i].toFixed(0).padStart(7)}   ` +
      `${solarAdditions[i].toFixed(0).padStart(9)}   ` +
      `${batteryGWh[i].toFixed(0).padStart(7)}    ` +
      `${elecDemand[i].toFixed(0).padStart(7)}`
    );
  }
}

console.log('\n=== Interpretation ===\n');
const rSolar = pearson(robots, solarGW);
const rAdditions = pearson(robots, solarAdditions);

if (rSolar > 0.9) {
  console.log('Strong positive correlation (r > 0.9) between robots and solar capacity.');
  console.log('Both are driven by common factors: time, GDP growth, and capital accumulation.');
}

if (rAdditions < 0.5) {
  console.log(`\nWeaker correlation with solar ADDITIONS (r = ${rAdditions.toFixed(2)}).`);
  console.log('Solar additions peak mid-century then slow as grid saturates.');
  console.log('Robot growth continues exponentially throughout.');
}

// Growth rate analysis
console.log('\n=== Growth Rate Analysis ===\n');
const robotGrowth = robots.slice(1).map((v, i) => (v / robots[i] - 1) * 100);
const solarGrowth = solarGW.slice(1).map((v, i) => solarGW[i] > 0 ? (v / solarGW[i] - 1) * 100 : 0);

console.log('Avg annual growth rates by era:');
const eras = [
  { name: '2025-2050', start: 0, end: 25 },
  { name: '2050-2075', start: 25, end: 50 },
  { name: '2075-2100', start: 50, end: 75 },
];

for (const era of eras) {
  const robotAvg = robotGrowth.slice(era.start, era.end).reduce((a,b) => a+b, 0) / (era.end - era.start);
  const solarAvg = solarGrowth.slice(era.start, era.end).reduce((a,b) => a+b, 0) / (era.end - era.start);
  console.log(`  ${era.name}: Robots ${robotAvg.toFixed(1)}%/yr, Solar ${solarAvg.toFixed(1)}%/yr`);
}

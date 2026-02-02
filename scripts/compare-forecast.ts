/**
 * Compare simulation output to Twin-Engine Century Forecast
 */

import { runSimulation } from '../src/simulation.js';

const result = runSimulation();
const r = result.results;

// Helper to get era averages
function eraAvg(startYear: number, endYear: number, getValue: (r: any) => number) {
  const values = r.filter(x => x.year >= startYear && x.year <= endYear).map(getValue);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Calculate oil share of final energy
function oilShare(row: any) {
  return row.oilConsumption / row.totalFinalEnergy;
}

// Era boundaries matching Twin-Engine
const eras = [
  { name: "2025-29", start: 2025, end: 2029 },
  { name: "2030-39", start: 2030, end: 2039 },
  { name: "2040-49", start: 2040, end: 2049 },
  { name: "2050-59", start: 2050, end: 2059 },
  { name: "2060-69", start: 2060, end: 2069 },
  { name: "2070-79", start: 2070, end: 2079 },
  { name: "2080-2100", start: 2080, end: 2100 },
];

// Twin-Engine values
const te: Record<string, { fe: number; temp: number; dep: number; robots: number; oil: number }> = {
  "2025-29": { fe: 40, temp: 1.56, dep: 0.24, robots: 15, oil: 0.30 },
  "2030-39": { fe: 43, temp: 1.70, dep: 0.28, robots: 30, oil: 0.26 },
  "2040-49": { fe: 47, temp: 1.90, dep: 0.32, robots: 45, oil: 0.20 },
  "2050-59": { fe: 50, temp: 2.05, dep: 0.37, robots: 60, oil: 0.15 },
  "2060-69": { fe: 53, temp: 2.05, dep: 0.41, robots: 80, oil: 0.13 },
  "2070-79": { fe: 55, temp: 2.00, dep: 0.44, robots: 110, oil: 0.12 },
  "2080-2100": { fe: 56, temp: 1.98, dep: 0.46, robots: 120, oil: 0.10 },
};

console.log("=== Simulation vs Twin-Engine Forecast Comparison ===\n");
console.log("Era        FE(kWh/d)  Temp(°C)  Dependency  Robots/1k  OilShare");
console.log("           Sim  T-E   Sim  T-E   Sim   T-E   Sim  T-E   Sim  T-E");
console.log("--------   --------   --------   ---------   --------   --------");

for (const era of eras) {
  const simFE = eraAvg(era.start, era.end, x => x.finalEnergyPerCapitaDay);
  const simTemp = eraAvg(era.start, era.end, x => x.temperature);
  const simDep = eraAvg(era.start, era.end, x => x.dependency);
  const simRobots = eraAvg(era.start, era.end, x => x.robotsDensity);
  const simOil = eraAvg(era.start, era.end, oilShare);

  const t = te[era.name];

  console.log(
    era.name.padEnd(10) +
    " " + simFE.toFixed(0).padStart(3) + "  " + t.fe.toString().padStart(2) +
    "   " + simTemp.toFixed(2).padStart(4) + " " + t.temp.toFixed(2).padStart(4) +
    "   " + (simDep*100).toFixed(0).padStart(2) + "%  " + (t.dep*100).toFixed(0).padStart(2) + "%" +
    "   " + simRobots.toFixed(0).padStart(3) + "  " + t.robots.toString().padStart(3) +
    "   " + (simOil*100).toFixed(0).padStart(2) + "% " + (t.oil*100).toFixed(0).padStart(2) + "%"
  );
}

// Print detailed divergence analysis
console.log("\n=== Detailed Divergence Analysis ===\n");

const sim2025 = r.find(x => x.year === 2025)!;
const sim2050 = r.find(x => x.year === 2050)!;
const sim2075 = r.find(x => x.year === 2075)!;
const sim2100 = r.find(x => x.year === 2100)!;

console.log("FINAL ENERGY (kWh/person/day)");
console.log("  Year    Sim    T-E    Delta");
console.log("  2025    " + sim2025.finalEnergyPerCapitaDay.toFixed(1).padStart(4) + "    40    " + (sim2025.finalEnergyPerCapitaDay - 40).toFixed(1));
console.log("  2050    " + sim2050.finalEnergyPerCapitaDay.toFixed(1).padStart(4) + "    50    " + (sim2050.finalEnergyPerCapitaDay - 50).toFixed(1));
console.log("  2075    " + sim2075.finalEnergyPerCapitaDay.toFixed(1).padStart(4) + "    55    " + (sim2075.finalEnergyPerCapitaDay - 55).toFixed(1));
console.log("  2100    " + sim2100.finalEnergyPerCapitaDay.toFixed(1).padStart(4) + "    56    " + (sim2100.finalEnergyPerCapitaDay - 56).toFixed(1));

console.log("\nTEMPERATURE (°C above pre-industrial)");
console.log("  Year    Sim    T-E    Delta");
console.log("  2025    " + sim2025.temperature.toFixed(2).padStart(4) + "   1.56   " + (sim2025.temperature - 1.56).toFixed(2));
console.log("  2050    " + sim2050.temperature.toFixed(2).padStart(4) + "   2.05   " + (sim2050.temperature - 2.05).toFixed(2));
console.log("  2075    " + sim2075.temperature.toFixed(2).padStart(4) + "   2.00   " + (sim2075.temperature - 2.00).toFixed(2));
console.log("  2100    " + sim2100.temperature.toFixed(2).padStart(4) + "   1.98   " + (sim2100.temperature - 1.98).toFixed(2));
console.log("  Note: T-E shows cooling 2060-2100 (CDR/net-zero); Sim continues warming");

console.log("\nOLD-AGE DEPENDENCY RATIO");
console.log("  Year    Sim    T-E    Delta");
console.log("  2025    " + (sim2025.dependency*100).toFixed(0).padStart(2) + "%    24%    " + ((sim2025.dependency - 0.24)*100).toFixed(0) + "pp");
console.log("  2050    " + (sim2050.dependency*100).toFixed(0).padStart(2) + "%    37%    " + ((sim2050.dependency - 0.37)*100).toFixed(0) + "pp");
console.log("  2075    " + (sim2075.dependency*100).toFixed(0).padStart(2) + "%    44%    " + ((sim2075.dependency - 0.44)*100).toFixed(0) + "pp");
console.log("  2100    " + (sim2100.dependency*100).toFixed(0).padStart(2) + "%    46%    " + ((sim2100.dependency - 0.46)*100).toFixed(0) + "pp");

console.log("\nROBOTS PER 1,000 WORKERS");
console.log("  Year    Sim    T-E    Delta");
console.log("  2025    " + sim2025.robotsDensity.toFixed(0).padStart(3) + "     15    " + (sim2025.robotsDensity - 15).toFixed(0));
console.log("  2050    " + sim2050.robotsDensity.toFixed(0).padStart(3) + "     60    " + (sim2050.robotsDensity - 60).toFixed(0));
console.log("  2075    " + sim2075.robotsDensity.toFixed(0).padStart(3) + "    110    " + (sim2075.robotsDensity - 110).toFixed(0));
console.log("  2100    " + sim2100.robotsDensity.toFixed(0).padStart(3) + "    120    " + (sim2100.robotsDensity - 120).toFixed(0));

console.log("\nOIL SHARE OF FINAL ENERGY");
console.log("  Year    Sim    T-E    Delta");
console.log("  2025    " + (oilShare(sim2025)*100).toFixed(0).padStart(2) + "%    30%    " + ((oilShare(sim2025) - 0.30)*100).toFixed(0) + "pp");
console.log("  2050    " + (oilShare(sim2050)*100).toFixed(0).padStart(2) + "%    15%    " + ((oilShare(sim2050) - 0.15)*100).toFixed(0) + "pp");
console.log("  2075    " + (oilShare(sim2075)*100).toFixed(0).padStart(2) + "%    12%    " + ((oilShare(sim2075) - 0.12)*100).toFixed(0) + "pp");
console.log("  2100    " + (oilShare(sim2100)*100).toFixed(0).padStart(2) + "%    10%    " + ((oilShare(sim2100) - 0.10)*100).toFixed(0) + "pp");

console.log("\n=== Summary of Model Differences ===\n");
console.log("1. TEMPERATURE: Sim shows continued warming to 2.5°C; T-E shows cooling");
console.log("   after 2060 (assumes successful CDR/net-zero by 2090s)");
console.log("");
console.log("2. FINAL ENERGY: Sim tracks T-E well through 2050, then diverges higher");
console.log("   (~80 vs 56 kWh/day by 2100) - likely G/C expansion effect");
console.log("");
console.log("3. ROBOTS: Sim much higher (500 vs 120 per 1000 by 2100)");
console.log("   - Sim uses 12%/yr growth rate; T-E more conservative");
console.log("");
console.log("4. OIL SHARE: Sim shows faster decline (6% vs 10% by 2100)");
console.log("   - Sim's electrification may be more aggressive");
console.log("");
console.log("5. DEPENDENCY: Good alignment (within 2-3pp throughout)");

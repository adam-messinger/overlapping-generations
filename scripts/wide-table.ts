/**
 * Output wide table of all simulation stats by year
 */

import { runSimulation } from '../src/simulation.js';

const result = runSimulation();
const r = result.results;

// Debug: show available keys
if (process.argv.includes('--keys')) {
  console.log('Available keys:', Object.keys(r[0]).sort().join(', '));
  process.exit(0);
}

// Select years to display (every 5 years)
const years = [2025, 2030, 2035, 2040, 2045, 2050, 2055, 2060, 2065, 2070, 2075, 2080, 2085, 2090, 2095, 2100];

// Define columns with formatting
const columns: Array<{
  key: string;
  label: string;
  format: (v: any) => string;
  getValue: (row: any) => any;
}> = [
  { key: 'year', label: 'Year', format: v => v.toString(), getValue: r => r.year },

  // Population & Demographics
  { key: 'pop', label: 'Pop(B)', format: v => (v/1e9).toFixed(2), getValue: r => r.population },
  { key: 'dep', label: 'Dep%', format: v => (v*100).toFixed(0), getValue: r => r.dependency },
  { key: 'college', label: 'Coll%', format: v => (v*100).toFixed(0), getValue: r => r.collegeShare },

  // GDP & Economy
  { key: 'gdp', label: 'GDP($T)', format: v => v.toFixed(0), getValue: r => r.gdp },
  { key: 'gdppc', label: 'GDP/cap$k', format: v => (v/1000).toFixed(1), getValue: r => r.gdp * 1e12 / r.population },

  // Energy
  { key: 'elecDem', label: 'ElecTWh', format: v => v.toFixed(0), getValue: r => r.electricityDemand },
  { key: 'finalE', label: 'FinalTWh', format: v => v.toFixed(0), getValue: r => r.totalFinalEnergy },
  { key: 'feDay', label: 'FE/d', format: v => v.toFixed(1), getValue: r => r.finalEnergyPerCapitaDay },
  { key: 'elecRate', label: 'Elec%', format: v => (v*100).toFixed(0), getValue: r => r.electrificationRate },

  // Capacity (GW) - from capacities object
  { key: 'solar', label: 'SolarGW', format: v => v.toFixed(0), getValue: r => r.capacities?.solar },
  { key: 'wind', label: 'WindGW', format: v => v.toFixed(0), getValue: r => r.capacities?.wind },
  { key: 'battery', label: 'BattGWh', format: v => v.toFixed(0), getValue: r => r.capacities?.battery },
  { key: 'nuclear', label: 'NukeGW', format: v => v.toFixed(0), getValue: r => r.capacities?.nuclear },

  // Grid & Emissions
  { key: 'gridInt', label: 'gCO2/kWh', format: v => v.toFixed(0), getValue: r => r.gridIntensity },
  { key: 'fossilSh', label: 'Fossil%', format: v => (v*100).toFixed(0), getValue: r => r.fossilShare },
  { key: 'elecEm', label: 'ElecGt', format: v => v.toFixed(1), getValue: r => r.electricityEmissions },
  { key: 'nonElecEm', label: 'NonEGt', format: v => v.toFixed(1), getValue: r => r.nonElectricEmissions },

  // Climate
  { key: 'temp', label: 'Temp°C', format: v => v.toFixed(2), getValue: r => r.temperature },
  { key: 'damages', label: 'Dmg%', format: v => (v*100).toFixed(1), getValue: r => r.damages },

  // LCOE ($/MWh)
  { key: 'solarLCOE', label: 'Solar$', format: v => v.toFixed(0), getValue: r => r.solarLCOE },
  { key: 'windLCOE', label: 'Wind$', format: v => v.toFixed(0), getValue: r => r.windLCOE },
  { key: 'gasLCOE', label: 'Gas$', format: v => v.toFixed(0), getValue: r => r.lcoes?.gas },

  // Capital & Automation
  { key: 'capital', label: 'Cap($T)', format: v => v.toFixed(0), getValue: r => r.capitalStock },
  { key: 'robots', label: 'Robots/k', format: v => v.toFixed(0), getValue: r => r.robotsDensity },
  { key: 'savings', label: 'Save%', format: v => (v*100).toFixed(0), getValue: r => r.savingsRate },

  // Resources
  { key: 'farmland', label: 'FarmMha', format: v => v.toFixed(0), getValue: r => r.farmland },
  { key: 'forest', label: 'ForestMha', format: v => v.toFixed(0), getValue: r => r.forest },

  // Energy Burden
  { key: 'burden', label: 'Burden%', format: v => (v*100).toFixed(1), getValue: r => r.energyBurden },
];

// Print header
console.log(columns.map(c => c.label.padStart(10)).join(' '));
console.log(columns.map(() => '----------').join(' '));

// Print rows
for (const year of years) {
  const row = r.find(x => x.year === year);
  if (!row) continue;

  const values = columns.map(col => {
    const val = col.getValue(row);
    if (val === undefined || val === null) return 'N/A'.padStart(10);
    return col.format(val).padStart(10);
  });

  console.log(values.join(' '));
}

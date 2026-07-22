/**
 * Sweep key parameters and observe sensitivity of Garrett J ratio.
 *
 * J = δK/I — ratio of capital decay to gross investment.
 * When J→1, net capital accumulation→0 (stagflation precondition).
 */

import { runSimulation } from '../src/index.js';

interface SweepCase {
  label: string;
  params: Record<string, any>;
}

const cases: SweepCase[] = [
  { label: 'baseline', params: {} },

  // Climate damage sensitivity
  { label: 'sensitivity=2.5', params: { climate: { sensitivity: 2.5 } } },
  { label: 'sensitivity=4.5', params: { climate: { sensitivity: 4.5 } } },
  { label: 'sensitivity=6.0', params: { climate: { sensitivity: 6.0 } } },

  // Depreciation rate
  { label: 'depreciation=0.03', params: { capital: { depreciation: 0.03 } } },
  { label: 'depreciation=0.07', params: { capital: { depreciation: 0.07 } } },
  { label: 'depreciation=0.10', params: { capital: { depreciation: 0.10 } } },

  // Energy transition stalls (Garrett's key mechanism)
  { label: 'solar α=0.20 (slow learning)', params: { energy: { solarLearningRate: 0.20 } } },
  { label: 'solar α=0.50 (fast learning)', params: { energy: { solarLearningRate: 0.50 } } },

  // Carbon price
  { label: 'carbonPrice=0', params: { energy: { carbonPrice: 0 } } },
  { label: 'carbonPrice=200', params: { energy: { carbonPrice: 200 } } },

  // Debt dynamics
  { label: 'high deficit (6%)', params: { capital: { publicDeficitRate: 0.06 } } },
  { label: 'low credit (1%)', params: { capital: { baseCreditGrowth: 0.01 } } },
  { label: 'high credit (8%)', params: { capital: { baseCreditGrowth: 0.08 } } },

  // Savings rate
  { label: 'low savings (0.30)', params: { capital: { savingsWorking: 0.30 } } },
  { label: 'high savings (0.55)', params: { capital: { savingsWorking: 0.55 } } },

  // Combined stress: high sensitivity + high depreciation + low savings
  { label: 'STRESS: sens=4.5+depr=0.08+lowSave', params: {
    climate: { sensitivity: 4.5 },
    capital: { depreciation: 0.08, savingsWorking: 0.30 },
  }},
];

// Extract J at key years
const keyYears = [2025, 2040, 2060, 2080, 2100];

console.log('Garrett J Ratio Sensitivity Sweep');
console.log('J = δK/I — closer to 1 = more dissipative (stagflation risk)');
console.log('');

// Header
const yearCols = keyYears.map(y => y.toString().padStart(6)).join('');
console.log(`${'Case'.padEnd(42)}${yearCols}`);
console.log('-'.repeat(42 + keyYears.length * 6));

for (const { label, params } of cases) {
  try {
    const result = runSimulation(params);

    const values = keyYears.map(y => {
      const r = result.results.find(r => r.year === y);
      if (!r) return '   N/A';
      return r.garrettJ.toFixed(3).padStart(6);
    }).join('');

    console.log(`${label.padEnd(42)}${values}`);
  } catch (e: any) {
    console.log(`${label.padEnd(42)} ERROR: ${e.message}`);
  }
}

import {
  defenseQualificationSensitivity,
  simulateDefenseSourcing,
} from '../src/simulations/critical-materials/defense-sourcing.js';
import type { DefensePolicyId } from '../src/simulations/critical-materials/defense-sourcing-data.js';

const policies: readonly DefensePolicyId[] = [
  'continued-waivers',
  'abrupt-cutoff',
  'stockpile-only',
  'staged-cutoff',
  'accelerated-qualification',
  'combined-resilience',
];
const results = policies.map((policy) => simulateDefenseSourcing(policy));
const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;
const calendar = (month: number | null): string => {
  if (month === null) return 'none';
  const offset = 6 + month;
  return `${2026 + Math.floor(offset / 12)}-${String(offset % 12 + 1).padStart(2, '0')}`;
};

console.log('=== Defense permanent-magnet sourcing policy ===\n');
console.log('Normalized U.S. defense demand; month zero is July 2026 and the modeled waiver cutoff is January 2027.');
console.table(results.map((result) => ({
  policy: result.policy,
  'first curtailment': calendar(result.firstCurtailmentMonth),
  'minimum output': pct(result.minimumDefenseOutput),
  'months <95%': result.monthsBelow95Pct,
  'output-months lost': result.outputMonthsLost.toFixed(2),
  'waiver-use months': result.waiverSupplyMonths,
  'stockpile exhausted': calendar(result.stockpileDepletionMonth),
  'qualified at end': pct(result.endingQualifiedCapacity),
  'avg cost index': result.averageProcurementCostIndex.toFixed(2),
})));

const abrupt = results.find((row) => row.policy === 'abrupt-cutoff')!;
console.log('\nAbrupt-cutoff mechanics around January 2027');
console.table(abrupt.months.slice(4, 20).map((row) => ({
  date: `${row.calendarYear}-${String(row.calendarMonth).padStart(2, '0')}`,
  'physical capacity': pct(row.physicalCompliantCapacity),
  'qualified capacity': pct(row.qualifiedCompliantCapacity),
  'waiver supply': pct(row.waiverSupplyUsed),
  'stock months': row.stockpileRemaining.toFixed(2),
  'usable input': pct(row.usableInputSupply),
  'defense output': pct(row.defenseOutput),
})));

console.log('\nAbrupt-cutoff sensitivity');
console.table(defenseQualificationSensitivity('abrupt-cutoff').map((row) => ({
  'initial qualified': pct(row.initialQualifiedCapacity),
  'qualification months': row.qualificationMonths,
  'minimum output': pct(row.minimumDefenseOutput),
  'output-months lost': row.outputMonthsLost.toFixed(2),
})));

console.log('\nInterpretation guardrails');
console.log('- Capacity is normalized to small defense demand; it is not a forecast of global magnet tonnage.');
console.log('- Project sizes and starting qualified coverage are transparent scenarios, not observed classified inventories.');
console.log('- The model covers the permanent-magnet branch, not every material named by procurement law.');
console.log('- Existing 2025 rare-earth event validation supports the inventory/bottleneck mechanism, not these policy coefficients.');

import fs from 'node:fs';
import { calibrateHormuzModel } from '../src/simulations/critical-materials/hormuz-calibration.js';
import {
  hormuzScenarios,
  type HormuzScenarioId,
} from '../src/simulations/critical-materials/hormuz-data.js';
import { simulateHormuzDisruption } from '../src/simulations/critical-materials/hormuz-model.js';

const QUESTION_DAILY_CALL_THRESHOLD = 62;
const PRE_CRISIS_DAILY_CALL_ANCHOR = 88;
const CURRENT_COMPATIBLE_SCENARIOS = [
  'partial-reopening',
  'prolonged-closure',
] as const satisfies readonly HormuzScenarioId[];

interface TransitRow {
  date: string;
  total: number;
  tankers: number;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return Number.NaN;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function parseTransitRows(path: string): TransitRow[] {
  const lines = fs.readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const header = lines.shift();
  if (header !== 'date,n_total,n_tanker,n_cargo') {
    throw new Error(`Unexpected transit CSV header: ${header}`);
  }
  return lines.map((line) => {
    const [date, total, tankers] = line.split(',');
    return { date, total: Number(total), tankers: Number(tankers) };
  });
}

function periodStats(
  rows: readonly TransitRow[],
  start: string,
  end: string,
): { days: number; mean: string; median: number; tankerMean: string } {
  const selected = rows.filter((row) => row.date >= start && row.date <= end);
  return {
    days: selected.length,
    mean: mean(selected.map((row) => row.total)).toFixed(2),
    median: median(selected.map((row) => row.total)),
    tankerMean: mean(selected.map((row) => row.tankers)).toFixed(2),
  };
}

const transitPathArg = process.argv
  .find((arg) => arg.startsWith('--transits='))
  ?.slice('--transits='.length);

if (transitPathArg) {
  const rows = parseTransitRows(transitPathArg);
  console.log('Observed IMF PortWatch mirror');
  console.table({
    'available pre-war file window': periodStats(
      rows,
      '2025-03-30',
      '2026-02-27',
    ),
    'post-closure through latest': periodStats(
      rows,
      '2026-02-28',
      '2026-07-19',
    ),
    'June agreement response': periodStats(rows, '2026-06-17', '2026-06-30'),
    'latest seven days': periodStats(rows, '2026-07-13', '2026-07-19'),
  });
}

const calibration = calibrateHormuzModel();
console.log('\nBackcast score');
console.table(
  [...calibration.development.components, ...calibration.holdout.components].map(
    (component) => ({
      set: calibration.development.components.includes(component)
        ? 'development'
        : 'holdout',
      target: component.name,
      modeled: component.value.toFixed(2),
      accepted: `${component.target.min.toFixed(2)}–${component.target.max.toFixed(2)}`,
      loss: component.loss.toFixed(2),
    }),
  ),
);

console.log('\nQuestion translation under current-compatible scenarios');
console.table(
  CURRENT_COMPATIBLE_SCENARIOS.map((scenarioId) => {
    const result = simulateHormuzDisruption(
      hormuzScenarios[scenarioId],
      calibration.params,
    );
    const december = result.months.find(
      (month) => month.year === 2026 && month.month === 12,
    );
    if (!december) throw new Error(`${scenarioId} has no December 2026 month`);
    const naiveDailyCallProxy =
      PRE_CRISIS_DAILY_CALL_ANCHOR * december.throughput;
    const annual = result.annual.find((row) => row.year === 2026);
    if (!annual) throw new Error(`${scenarioId} has no 2026 annual result`);
    return {
      scenario: scenarioId,
      'December oil-throughput fraction': december.throughput.toFixed(2),
      'naive calls/day proxy': naiveDailyCallProxy.toFixed(1),
      'proxy question result':
        naiveDailyCallProxy >= QUESTION_DAILY_CALL_THRESHOLD ? 'Yes' : 'No',
      '2026 oil-price multiple': annual.oilPriceMultiple.toFixed(2),
      '2026 oil availability': annual.oilAvailability.toFixed(3),
      'peak Gulf shut-in mb/d': annual.peakGulfCrudeShutInPerDay.toFixed(1),
    };
  }),
);

console.log('\nGuardrails');
console.log(
  '- The stock-flow model conditions on throughput paths; it does not estimate their probabilities.',
);
console.log(
  '- Its throughput variable is oil-volume capacity, while the resolution variable is a daily count of all vessel types.',
);
console.log(
  '- The 88 × throughput proxy is displayed only to test bin mapping and must not be treated as a calibrated forecast.',
);

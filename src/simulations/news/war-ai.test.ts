import assert from 'node:assert/strict';
import test from 'node:test';

import { runSimulation, type YearResult } from '../../simulation.js';
import { runWarAiExperiment, summarizeWarAiYear } from './war-ai.js';

function scaledRow(gdp: number): YearResult {
  const row = runSimulation({ startYear: 2025, endYear: 2025 }).results[0];
  return {
    ...row,
    gdp,
    regionalGdp: Object.fromEntries(
      Object.entries(row.regionalGdp).map(([region, value]) => [
        region,
        value * gdp / row.gdp,
      ]),
    ) as YearResult['regionalGdp'],
  };
}

test('factorial summary identifies a positive AI cushion', () => {
  const result = summarizeWarAiYear(
    2026,
    scaledRow(100),
    scaledRow(120),
    scaledRow(90),
    scaledRow(114),
  );
  assert.ok(Math.abs(result.warGdpEffectWithoutAiPct + 10) < 1e-9);
  assert.ok(Math.abs(result.warGdpEffectWithAiPct + 5) < 1e-9);
  assert.ok(Math.abs(result.aiCushionPctPoints - 5) < 1e-9);
  assert.ok(Math.abs(result.gdpInteraction - 4) < 1e-9);
});

test('war-AI experiment is matched and finite through 2030', () => {
  const experiment = runWarAiExperiment({
    endYear: 2030,
    aiParams: {
      demand: {
        dataCenterBaseGrowth: 0.15,
        dataCenterPowerSpendCeiling: 0.005,
      },
      production: { aiWorkerEquivalentPerTWh: 100_000 },
    },
  });
  assert.equal(experiment.years.length, 6);
  for (const row of experiment.years) {
    assert.ok(Number.isFinite(row.gdpInteraction));
    assert.ok(Number.isFinite(row.aiCushionPctPoints));
  }
  const first = experiment.years[0];
  assert.ok(Math.abs(first.warGdpEffectWithoutAiPct) < 1e-9);
  assert.ok(Math.abs(first.warGdpEffectWithAiPct) < 1e-9);
});

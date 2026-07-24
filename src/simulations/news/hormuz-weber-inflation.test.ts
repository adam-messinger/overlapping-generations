import assert from 'node:assert/strict';
import test from 'node:test';

import { calibrateHormuzModel } from '../critical-materials/hormuz-calibration.js';
import { hormuzScenarios } from '../critical-materials/hormuz-data.js';
import {
  energyInflationScenarios,
  simulateEnergyInflationV2,
} from './energy-inflation.js';
import {
  buildWeberEnergyPricePathsFromSourceMonths,
  defaultWeberEnergyBridgeOptions,
  makeHormuzWeberInflationScenario,
  simulateHormuzWeberInflation,
} from './hormuz-weber-inflation.js';

const calibratedParams = calibrateHormuzModel().params;

const run = (
  id: 'short-disruption' | 'partial-reopening' | 'prolonged-closure',
) =>
  simulateHormuzWeberInflation(
    makeHormuzWeberInflationScenario({
      id,
      label: id,
      hormuzScenario: hormuzScenarios[id],
      hormuzParams: calibratedParams,
      inflationScenario:
        energyInflationScenarios['euro-area-2026-current'],
    }),
  );

test('monthly adapter preserves the Hormuz path and reconciles the energy basket', () => {
  const result = run('partial-reopening');

  assert.equal(result.hormuz.months.length, 36);
  assert.equal(result.pricePaths.months.length, 36);
  assert.equal(result.inflation.months.length, 36);
  result.pricePaths.months.forEach((row, index) => {
    const expected =
      1 +
      result.scenario.bridgeOptions.oilInputShare *
        (row.oilPriceMultiple - 1) +
      result.scenario.bridgeOptions.gasInputShare *
        (row.gasPriceMultiple - 1);
    assert.ok(Math.abs(row.importEnergyPriceMultiple - expected) < 1e-12);
    assert.equal(
      result.inflation.months[index]?.importEnergyPriceMultiple,
      row.importEnergyPriceMultiple,
    );
  });
});

test('Weber total-requirements propagation adds indirect CPI exposure', () => {
  const paths = buildWeberEnergyPricePathsFromSourceMonths(
    Array.from(
      { length: defaultWeberEnergyBridgeOptions.horizonMonths },
      (_, index) => ({
        index,
        year: 2026 + Math.floor(index / 12),
        month: index % 12 + 1,
        oilPriceMultiple: index === 0 ? 2 : 1,
        gasPriceMultiple: index === 0 ? 2 : 1,
      }),
    ),
  );
  const shocked = paths.months[0];
  const normal = paths.months[1];

  assert.ok((shocked?.oilIndirectCpiImpactPct ?? 0) > 0);
  assert.ok((shocked?.gasIndirectCpiImpactPct ?? 0) > 0);
  assert.ok((shocked?.networkIndirectCpiImpactPct ?? 0) > 0.7);
  assert.equal(normal?.networkIndirectCpiImpactPct, 0);
});

test('closure duration now comes from Hormuz rather than an invented price plateau', () => {
  const short = run('short-disruption');
  const partial = run('partial-reopening');
  const prolonged = run('prolonged-closure');

  assert.ok(
    partial.inflation.peakHeadlineInflationPct >
      short.inflation.peakHeadlineInflationPct,
  );
  assert.ok(
    prolonged.inflation.peakCoreInflationPct >
      partial.inflation.peakCoreInflationPct,
  );
  assert.ok(
    prolonged.inflation.peakPolicyRatePct >
      partial.inflation.peakPolicyRatePct,
  );
});

test('network attribution is smaller than the old aggregate core shortcut', () => {
  const oldAggregate = simulateEnergyInflationV2(
    energyInflationScenarios['euro-area-2026-current'],
  );
  const integrated = run('partial-reopening');

  assert.ok(
    integrated.inflation.peakCoreInflationPct <
      oldAggregate.peakCoreInflationPct,
  );
  assert.ok(
    integrated.inflation.peakPolicyRatePct <
      oldAggregate.peakPolicyRatePct,
  );
});

test('dovish central result survives a doubled Weber exposure', () => {
  const result = simulateHormuzWeberInflation(
    makeHormuzWeberInflationScenario({
      id: 'double-network',
      label: 'Double Weber exposure',
      hormuzScenario: hormuzScenarios['partial-reopening'],
      hormuzParams: calibratedParams,
      inflationScenario:
        energyInflationScenarios['euro-area-2026-current'],
      bridgeOptions: { networkScale: 2 },
    }),
  );

  assert.ok(result.inflation.peakCoreInflationPct < 2.5);
  assert.ok(result.inflation.peakPolicyRatePct < 2.5);
});

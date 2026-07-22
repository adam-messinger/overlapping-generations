import assert from 'node:assert/strict';
import test from 'node:test';

import {
  auditFrance2026Backcast,
  calibratedHeatMortalityScale,
  heatTemperatureSensitivity,
} from './calibration.js';
import {
  france2026HeatEvent,
  france2035HotterEvent,
  heatAdaptationPackages,
} from './data.js';
import { simulateHeatEvent } from './model.js';

test('France 2026 calibration reproduces the preliminary observed excess-death count', () => {
  const audit = auditFrance2026Backcast();
  assert.ok(audit.absolutePercentageError < 1e-10);
  assert.ok(audit.shareAge65Plus > 0.85);
  assert.ok(audit.noAdaptationIncrease > 0.60);
  assert.ok(audit.noAdaptationIncrease < 1.05);
});

test('targeted cooling reduces mortality but raises unmanaged cooling peak', () => {
  const current = simulateHeatEvent(
    france2026HeatEvent,
    heatAdaptationPackages.current,
    calibratedHeatMortalityScale,
  );
  const targeted = simulateHeatEvent(
    france2026HeatEvent,
    heatAdaptationPackages['targeted-cooling'],
    calibratedHeatMortalityScale,
  );
  assert.ok(targeted.mortality.totalDeaths < current.mortality.totalDeaths);
  assert.ok(targeted.power.unmanagedCoolingPeakGw > current.power.unmanagedCoolingPeakGw);
});

test('combined adaptation controls grid peak and crop losses', () => {
  const targeted = simulateHeatEvent(
    france2026HeatEvent,
    heatAdaptationPackages['targeted-cooling'],
    calibratedHeatMortalityScale,
  );
  const combined = simulateHeatEvent(
    france2026HeatEvent,
    heatAdaptationPackages.combined,
    calibratedHeatMortalityScale,
  );
  assert.ok(combined.mortality.totalDeaths < targeted.mortality.totalDeaths);
  assert.ok(combined.food.aggregateSeasonalYieldLoss < targeted.food.aggregateSeasonalYieldLoss);
  assert.ok(combined.power.managedCoolingPeakGw < targeted.power.managedCoolingPeakGw);
  assert.ok(combined.power.reserveMarginGw > 0);
});

test('aging and a hotter event raise mortality under unchanged adaptation', () => {
  const present = simulateHeatEvent(
    france2026HeatEvent,
    heatAdaptationPackages.current,
    calibratedHeatMortalityScale,
  );
  const future = simulateHeatEvent(
    france2035HotterEvent,
    heatAdaptationPackages.current,
    calibratedHeatMortalityScale,
  );
  assert.ok(future.mortality.totalDeaths > present.mortality.totalDeaths * 1.25);
});

test('temperature sensitivity is monotonic for mortality and crop damage', () => {
  const rows = heatTemperatureSensitivity(france2026HeatEvent, heatAdaptationPackages.current);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].deaths > rows[i - 1].deaths);
    assert.ok(rows[i].yieldLoss > rows[i - 1].yieldLoss);
  }
});

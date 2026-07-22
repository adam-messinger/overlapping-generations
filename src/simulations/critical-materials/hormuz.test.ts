import { expect, printSummary, test } from '../../test-utils.js';
import { runSimulation } from '../../simulation.js';
import { calibrateHormuzModel } from './hormuz-calibration.js';
import { compareHormuzGlobalImpact } from './hormuz-bridge.js';
import { hormuzScenarios } from './hormuz-data.js';
import { simulateHormuzDisruption } from './hormuz-model.js';

const calibrated = calibrateHormuzModel();

test('empty commodity hooks are exactly baseline-neutral', () => {
  const baseline = runSimulation({ endYear: 2028 });
  const empty = runSimulation({
    endYear: 2028,
    demand: { commodityShocks: [] },
    production: { energySupplyShocks: [] },
    resources: { foodSupplyShocks: [] },
  });
  for (let index = 0; index < baseline.results.length; index++) {
    expect(empty.results[index].gdp).toBe(baseline.results[index].gdp);
    expect(empty.results[index].energyBurden)
      .toBe(baseline.results[index].energyBurden);
  }
});

test('2026 development anchors fit without using the holdout', () => {
  expect(calibrated.development.meanLoss).toBe(0);
  // The fertilizer basket is the one visible holdout miss; keep the aggregate
  // score bounded so a future refactor cannot silently destroy the backcast.
  expect(calibrated.holdout.meanLoss).toBeLessThan(0.25);
});

test('blocked transit is not mistaken for net global oil loss', () => {
  const march = calibrated.result.months.find((row) => row.month === 3)!;
  expect(march.oil.blockedHormuzFlowPerDay).toBeGreaterThan(18);
  expect(march.oil.bypassFlowPerDay).toBeGreaterThan(4);
  expect(march.oil.inventoryDrawPerDay).toBeGreaterThan(0);
  expect(march.oil.netPhysicalSupplyLossPerDay).toBeBetween(8, 12);
});

test('export storage saturation creates shut-ins without double-counting supply loss', () => {
  const march = calibrated.result.months.find((row) => row.month === 3)!;
  const april = calibrated.result.months.find((row) => row.month === 4)!;
  expect(april.gulfCrudeShutInPerDay).toBeGreaterThan(march.gulfCrudeShutInPerDay);
  expect(april.gulfExportStorageRemainingMillionBarrels).toBe(0);
  expect(april.oil.netPhysicalSupplyLossPerDay).toBeLessThan(12);
});

test('a prolonged closure exposes an inventory cliff', () => {
  const result = simulateHormuzDisruption(
    hormuzScenarios['prolonged-closure'],
    calibrated.params,
  );
  const exhaustedIndex = result.months.findIndex(
    (row) => row.oil.inventoryRemaining === 0,
  );
  expect(exhaustedIndex).toBeGreaterThan(2);
  const before = result.months[exhaustedIndex - 1];
  const exhausted = result.months[exhaustedIndex];
  const after = result.months[exhaustedIndex + 1];
  expect(before.oil.inventoryRemaining).toBeGreaterThan(0);
  expect(exhausted.oil.inventoryRemaining).toBe(0);
  // Even as throughput starts improving, losing the stock-flow buffer makes
  // the following month's physical gap worse than before exhaustion.
  expect(after.oil.netPhysicalSupplyLossPerDay)
    .toBeGreaterThan(before.oil.netPhysicalSupplyLossPerDay + 1);
});

test('regional exposure makes India more physically constrained than Latin America', () => {
  const july = calibrated.result.months.find((row) => row.month === 7)!;
  expect(july.regional.india.oilAvailability)
    .toBeLessThan(july.regional.oecd.oilAvailability);
  expect(july.regional.oecd.oilAvailability)
    .toBeLessThan(july.regional.latam.oilAvailability);
  expect(july.regional.india.gasAvailability)
    .toBeLessThan(july.regional.russia.gasAvailability);
});

test('the annual bridge raises burden and lowers GDP in the disruption year', () => {
  const result = simulateHormuzDisruption(
    hormuzScenarios['short-disruption'],
    calibrated.params,
  );
  const comparison = compareHormuzGlobalImpact(result, { endYear: 2028 });
  const impact2026 = comparison.impacts.find((row) => row.year === 2026)!;
  expect(impact2026.gdpChangePct).toBeLessThan(-0.1);
  expect(impact2026.energyBurdenChangePctPoints).toBeGreaterThan(0);
  expect(impact2026.foodStressChangePctPoints).toBeGreaterThan(0);
});

printSummary();

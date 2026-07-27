import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceTransitLedger,
  advanceVintageStock,
  createTransitLedger,
  createVintageStock,
  depreciableVintage,
  straightLineDepreciation,
} from '../src/index.js';

test('vintage stock retires a new cohort at exactly its service life', () => {
  let state = createVintageStock({
    unit: 'GW',
    initialStock: 0,
    serviceLifeSteps: 2,
  });
  const rows = [];
  for (let step = 0; step < 4; step++) {
    const result = advanceVintageStock(state, {
      step,
      additions: step === 0 ? 10 : 0,
      serviceLifeSteps: 2,
    });
    state = result.state;
    rows.push(result);
  }
  assert.equal(rows[0].closingStock, 10);
  assert.equal(rows[1].closingStock, 10);
  assert.equal(rows[2].scheduledRetirements, 10);
  assert.equal(rows[2].closingStock, 0);
  assert.ok(rows.every((row) => Math.abs(row.conservationResidual) < 1e-12));
});

test('uniform opening vintage retires evenly and scrappage reconciles', () => {
  let state = createVintageStock({
    unit: 'ebike',
    initialStock: 40,
    serviceLifeSteps: 4,
    initialRetirementProfile: 'uniform',
  });
  const first = advanceVintageStock(state, {
    step: 0,
    additions: 5,
    serviceLifeSteps: 4,
    scrappageAmount: 3,
  });
  state = first.state;
  assert.equal(first.openingStock, 40);
  assert.equal(first.scheduledRetirements, 10);
  assert.equal(first.deliveries, 5);
  assert.equal(first.scrappage, 3);
  assert.equal(first.closingStock, 32);
  assert.equal(first.terminalStock, 32);
  assert.equal(state.cumulativeScrappage, 3);
});

test('vintage stock rejects fractional service lives and skipped steps', () => {
  const state = createVintageStock({
    unit: 'GW',
    serviceLifeSteps: 2,
  });
  assert.throws(() => advanceVintageStock(state, {
    step: 0,
    additions: 1,
    serviceLifeSteps: 2.5,
  }), /integer/);
  assert.throws(() => advanceVintageStock(state, {
    step: 1,
    additions: 1,
    serviceLifeSteps: 2,
  }), /consecutive/);
});

test('straight-line depreciation respects deployment lag and terminal book value', () => {
  const vintage = depreciableVintage({
    id: 'chips-0',
    expenditureStep: 0,
    inServiceStep: 2,
    cost: 16,
    usefulLifeSteps: 4,
  });
  assert.equal(straightLineDepreciation([vintage], 1).depreciation, 0);
  assert.equal(straightLineDepreciation([vintage], 2).depreciation, 4);
  assert.equal(straightLineDepreciation([vintage], 5).endingBookValue, 0);
  assert.equal(straightLineDepreciation([vintage], 6).depreciation, 0);
});

test('depreciation excludes unspent future vintages and rejects service before spend', () => {
  const future = depreciableVintage({
    id: 'future-build',
    expenditureStep: 3,
    inServiceStep: 4,
    cost: 120,
    usefulLifeSteps: 3,
  });
  assert.deepEqual(straightLineDepreciation([future], 2), {
    step: 2,
    depreciation: 0,
    accumulatedDepreciation: 0,
    endingBookValue: 0,
    grossBookValue: 0,
  });
  assert.equal(straightLineDepreciation([future], 3).endingBookValue, 120);
  assert.throws(
    () => depreciableVintage({
      id: 'time-travel-build',
      expenditureStep: 3,
      inServiceStep: 2,
      cost: 120,
      usefulLifeSteps: 3,
    }),
    /inServiceStep cannot precede expenditureStep/,
  );
});

test('opening vintage profiles fail closed at runtime', () => {
  assert.throws(
    () => createVintageStock({
      unit: 'GW',
      initialStock: 10,
      serviceLifeSteps: 20,
      initialRetirementProfile: 'triangular' as 'uniform',
    }),
    /initialRetirementProfile must be 'uniform' or 'bullet'/,
  );
});

test('transit ledger preserves fractional-delay cargo and exposes terminal stock', () => {
  let state = createTransitLedger('million-barrel');
  const first = advanceTransitLedger(state, {
    step: 0,
    dispatchAmount: 30,
    delaySteps: 1.5,
  });
  state = first.state;
  assert.equal(first.arrived, 0);
  assert.equal(first.terminalInTransit, 30);
  const second = advanceTransitLedger(state, { step: 1, delaySteps: 1.5 });
  state = second.state;
  assert.equal(second.arrived, 15);
  assert.equal(second.terminalInTransit, 15);
  const third = advanceTransitLedger(state, { step: 2, delaySteps: 1.5 });
  assert.equal(third.arrived, 15);
  assert.equal(third.terminalInTransit, 0);
  assert.equal(third.conservationResidual, 0);
});

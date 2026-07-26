import assert from 'node:assert/strict';
import test from 'node:test';

import {
  backtestEbikeAdoption,
  analyzeEntrantGeographicScope,
  evaluateSupplierVolumeCalibration,
} from './calibration.js';
import {
  EBIKE_REGIONS,
  MOTOR_ARCHITECTURES,
  MOTOR_SUPPLIERS,
  ebikeMotorScenarios,
} from './data.js';
import { simulateEbikeMotorMarket } from './model.js';

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

test('stock-and-replacement adoption beats exponential extrapolation on holdouts', () => {
  const backtest = backtestEbikeAdoption();
  assert.equal(backtest.rows.length, 3);
  assert.ok(
    backtest.stockReplacementMeanAbsolutePercentageError <
      backtest.naiveMeanAbsolutePercentageError,
  );
  assert.ok(backtest.stockReplacementMeanAbsolutePercentageError < 0.10);
  assert.ok(backtest.naiveMeanAbsolutePercentageError > 0.20);
  assert.deepEqual(
    [...new Set(backtest.rows.map((row) => row.boundary))].sort(),
    ['factory-shipments', 'retail-new-sales'],
  );
});

test('base supplier allocation reproduces disclosed comparable volumes', () => {
  const calibration = evaluateSupplierVolumeCalibration();
  assert.equal(calibration.rows.length, 2);
  assert.ok(calibration.meanAbsolutePercentageError < 0.03);
  assert.ok(
    calibration.rows.every(
      (row) => row.errorVersusComparableTarget < 0.03,
    ),
  );
});

test('regional, architecture, and supplier volumes reconcile every year', () => {
  const result = simulateEbikeMotorMarket(ebikeMotorScenarios['full-stack']);
  for (const year of result.years) {
    const regionalSales = sum(
      EBIKE_REGIONS.map((region) => year.regions[region].annualSales),
    );
    const architectureUnits = sum(
      MOTOR_ARCHITECTURES.map(
        (architecture) => year.architectureVolumes[architecture],
      ),
    );
    const supplierUnits = sum(
      MOTOR_SUPPLIERS.map((supplier) => year.supplierVolumes[supplier]),
    );
    assert.ok(Math.abs(regionalSales - year.globalAnnualSales) < 1e-6);
    assert.equal(year.globalDriveUnitDemand, year.globalAnnualSales);
    assert.ok(
      Math.abs(architectureUnits - year.globalDriveUnitDemand) < 1e-6,
    );
    assert.ok(
      Math.abs(supplierUnits - year.globalDriveUnitDemand) < 1e-5,
    );
    for (const region of EBIKE_REGIONS) {
      const row = year.regions[region];
      assert.ok(
        Math.abs(
          row.architectureShares.hub +
            row.architectureShares['mid-drive'] -
            1,
        ) < 1e-12,
      );
      assert.ok(row.entrantUnits <= row.entrantAddressableUnits + 1e-8);
      assert.ok(row.entrantShareOfAddressableMarket >= 0);
      assert.ok(row.entrantShareOfAddressableMarket <= 1);
    }
    assert.ok(year.entrant.annualUnits <= year.entrant.factoryCapacity + 1e-8);
    assert.ok(
      year.entrant.annualUnits <= year.entrant.oemProgramCapacity + 1e-8,
    );
  }
});

test('excellent product alone does not reproduce a full commercial system', () => {
  const productOnly = simulateEbikeMotorMarket(
    ebikeMotorScenarios['product-only'],
  );
  const fullStack = simulateEbikeMotorMarket(
    ebikeMotorScenarios['full-stack'],
  );
  const breakthrough = simulateEbikeMotorMarket(
    ebikeMotorScenarios.breakthrough,
  );
  const localizedHub = simulateEbikeMotorMarket(
    ebikeMotorScenarios['localized-hub'],
  );

  assert.equal(productOnly.entrantOutcome, 'no-operating-breakeven');
  assert.equal(fullStack.entrantOutcome, 'scaled-industrial-supplier');
  assert.equal(breakthrough.entrantOutcome, 'venture-scale-platform');
  assert.equal(localizedHub.entrantOutcome, 'no-operating-breakeven');
  assert.ok(fullStack.endingAnnualUnits > productOnly.endingAnnualUnits * 3);
  assert.ok(
    breakthrough.endingAnnualUnits > fullStack.endingAnnualUnits * 1.5,
  );
  assert.ok(localizedHub.endingRevenueMillion < 50);
});

test('entrant financial statements and continuing value reconcile', () => {
  const result = simulateEbikeMotorMarket(ebikeMotorScenarios['full-stack']);
  for (const row of result.years) {
    const financials = row.entrant;
    assert.ok(
      Math.abs(
        financials.revenueMillion -
          financials.costOfGoodsMillion -
          financials.grossProfitMillion,
      ) < 1e-9,
    );
    assert.ok(
      Math.abs(
        financials.grossProfitMillion -
          financials.operatingExpenseMillion -
          financials.operatingIncomeMillion,
      ) < 1e-9,
    );
    assert.ok(
      Math.abs(
        financials.operatingIncomeMillion -
          financials.capacityCapexMillion -
          financials.freeCashFlowMillion,
      ) < 1e-9,
    );
  }
  assert.ok(result.terminalValueAtHorizonMillion > 0);
  assert.ok(result.enterpriseNpvMillion > result.explicitHorizonNpvMillion);
});

test('a U.S. company needs foreign OEM demand at full-stack fixed costs', () => {
  const scopes = analyzeEntrantGeographicScope();
  const usOnly = scopes.find((row) => row.scope === 'us-only')!;
  const usEu = scopes.find((row) => row.scope === 'us-eu')!;
  assert.equal(usOnly.metrics.firstOperatingBreakevenYear, null);
  assert.equal(usOnly.metrics.commercialWin, false);
  assert.ok(usEu.metrics.endingAnnualUnits > usOnly.metrics.endingAnnualUnits * 5);
  assert.equal(usEu.metrics.commercialWin, true);
});

test('invalid regional identities fail before simulation', () => {
  const scenario = structuredClone(ebikeMotorScenarios['full-stack']);
  scenario.regions.us.id = 'eu';
  assert.throws(
    () => simulateEbikeMotorMarket(scenario),
    /scenario\.regions\.us\.id must equal 'us'/,
  );
});

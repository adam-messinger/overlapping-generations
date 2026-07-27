import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dataCenterGridEvidence,
  dataCenterGridScenarios,
  simulateDataCenterGrid,
} from './data-center-grid.js';

test('capacity utilization reconciles the BNEF and LBNL energy anchors', () => {
  const scenario = dataCenterGridScenarios.socialized;
  const incremental = simulateDataCenterGrid(scenario);
  const currentElectricityTwh =
    dataCenterGridEvidence.illustrativeCurrentCapacityGw *
    dataCenterGridEvidence.reconciledFleetLoadFactor *
    scenario.hoursPerYear /
    1_000;
  const totalDataCenterElectricityTwh =
    currentElectricityTwh + incremental.annualElectricityTwh;
  const implied2035Share =
    totalDataCenterElectricityTwh /
    (totalDataCenterElectricityTwh + scenario.nonDataCenterRetailSalesTwh);

  assert.ok(
    Math.abs(currentElectricityTwh - dataCenterGridEvidence.lbnl2023ElectricityTwh) <
      10,
  );
  assert.ok(
    Math.abs(implied2035Share - dataCenterGridEvidence.bnef2035ElectricityShare) <
      1e-9,
  );
});

test('full generation, network, and take-or-pay responsibility protects other ratepayers', () => {
  const result = simulateDataCenterGrid(dataCenterGridScenarios['full-pledge-gas']);
  assert.equal(result.ratepayerAssignedCapexBillion, 0);
  assert.equal(result.nonDataCenterBillImpact, 0);
  assert.ok(result.developerAssignedCapexBillion > 0);
});

test('paying for generation alone leaves a material network cost shift', () => {
  const generationOnly = simulateDataCenterGrid(
    dataCenterGridScenarios['generation-only'],
  );
  const full = simulateDataCenterGrid(dataCenterGridScenarios['full-pledge-gas']);
  assert.ok(generationOnly.ratepayerAssignedCapexBillion > 50);
  assert.ok(generationOnly.nonDataCenterBillImpact > full.nonDataCenterBillImpact);
});

test('flexible compute reduces the firm-capacity requirement', () => {
  const inflexible = simulateDataCenterGrid(dataCenterGridScenarios['full-pledge-gas']);
  const flexible = simulateDataCenterGrid(
    dataCenterGridScenarios['full-pledge-clean-flex'],
  );
  assert.ok(flexible.flexiblePeakGw > inflexible.flexiblePeakGw);
  assert.ok(
    flexible.sharedFirmCapacityRequiredGw <
      inflexible.sharedFirmCapacityRequiredGw,
  );
});

test('clean dedicated supply changes emissions, not cost-allocation arithmetic', () => {
  const gas = simulateDataCenterGrid(dataCenterGridScenarios['full-pledge-gas']);
  const clean = simulateDataCenterGrid({
    ...dataCenterGridScenarios['full-pledge-gas'],
    id: 'clean-comparison',
    dedicatedEmissionsKgPerMwh: 50,
  });
  assert.equal(clean.nonDataCenterBillImpact, gas.nonDataCenterBillImpact);
  assert.ok(clean.operationalEmissionsGtCo2 < gas.operationalEmissionsGtCo2 / 5);
});

test('annual energy share does not masquerade as nameplate capacity share', () => {
  const base = dataCenterGridScenarios['full-pledge-gas'];
  const highCapacityFactor = simulateDataCenterGrid({
    ...base,
    dedicatedPortfolioCapacityFactor: 0.90,
  });
  const lowCapacityFactor = simulateDataCenterGrid({
    ...base,
    dedicatedPortfolioCapacityFactor: 0.45,
  });
  assert.equal(
    highCapacityFactor.dedicatedElectricityTwh,
    lowCapacityFactor.dedicatedElectricityTwh,
  );
  assert.ok(
    Math.abs(
      lowCapacityFactor.dedicatedNameplateGw /
        highCapacityFactor.dedicatedNameplateGw -
        2,
    ) < 1e-12,
  );
  assert.ok(
    lowCapacityFactor.dedicatedGenerationCapexBillion >
      highCapacityFactor.dedicatedGenerationCapexBillion,
  );
});

test('dedicated capacity factor must be positive before nameplate division', () => {
  const scenario = structuredClone(
    dataCenterGridScenarios['full-pledge-clean-flex'],
  );
  scenario.dedicatedPortfolioCapacityFactor = 0;
  assert.throws(
    () => simulateDataCenterGrid(scenario),
    /dedicatedPortfolioCapacityFactor must be > 0/,
  );
});

test('take-or-pay prevents abandoned contracted load from shifting assigned capex', () => {
  const base = {
    ...dataCenterGridScenarios['full-pledge-clean-flex'],
    expectedLoadRealization: 0.5,
  };
  const protectedResult = simulateDataCenterGrid({
    ...base,
    id: 'protected',
    takeOrPayCoverage: 1,
  });
  const unprotectedResult = simulateDataCenterGrid({
    ...base,
    id: 'unprotected',
    takeOrPayCoverage: 0,
  });
  assert.equal(protectedResult.strandedRiskShiftBillion, 0);
  assert.ok(unprotectedResult.strandedRiskShiftBillion > 0);
  assert.ok(
    unprotectedResult.nonDataCenterBillImpact >
      protectedResult.nonDataCenterBillImpact,
  );
});

test('dedicated build follows the contract while dispatch follows realized load', () => {
  const base = dataCenterGridScenarios['full-pledge-clean-flex'];
  const full = simulateDataCenterGrid(base);
  const halfRealized = simulateDataCenterGrid({
    ...base,
    id: 'half-realized',
    expectedLoadRealization: 0.5,
  });
  assert.equal(halfRealized.dedicatedNameplateGw, full.dedicatedNameplateGw);
  assert.equal(
    halfRealized.dedicatedElectricityTwh,
    full.dedicatedElectricityTwh / 2,
  );
});

test('capex assignment reconciles exactly', () => {
  for (const scenario of Object.values(dataCenterGridScenarios)) {
    const result = simulateDataCenterGrid(scenario);
    assert.ok(
      Math.abs(
        result.totalIncrementalCapexBillion -
          result.developerAssignedCapexBillion -
          result.ratepayerAssignedCapexBillion,
      ) < 1e-9,
    );
  }
});

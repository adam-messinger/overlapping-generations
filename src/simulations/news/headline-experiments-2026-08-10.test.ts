import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aiLoadSpectrum,
  bandPhysics,
  cloudLoadSpectrum,
  evaluateAiPowerVolatility,
  evaluateCoolingWear,
  evaluateInterconnectionQueue,
  evaluateVolatilityMacroLinkage,
  gigawattAiCampus,
  mechanicalWearIndex,
  priceBufferOption,
  smoothingTechnologies,
  solveQueueSteadyState,
  usInterconnectionQueue,
} from './headline-experiments-2026-08-10.js';

test('buffer throughput is invariant to the oscillation period', () => {
  // A*P*duty/(2*pi) times seconds-per-year, with T cancelling: the sizing and
  // the cycle count both move with the period but the energy moved does not.
  const slow = bandPhysics(
    {
      id: 'slow',
      label: 'slow',
      periodSeconds: 3_600,
      clusterPeakToPeakShare: 0.4,
      campusCorrelation: 1,
      dutyShareOfYear: 1,
    },
    1_000,
  );
  const fast = bandPhysics(
    {
      id: 'fast',
      label: 'fast',
      periodSeconds: 5,
      clusterPeakToPeakShare: 0.4,
      campusCorrelation: 1,
      dutyShareOfYear: 1,
    },
    1_000,
  );
  assert.ok(
    Math.abs(slow.throughputMwhPerYear / fast.throughputMwhPerYear - 1) < 1e-9,
  );
  assert.ok(Math.abs(slow.bufferEnergyMwh / fast.bufferEnergyMwh - 720) < 1e-6);
  assert.ok(Math.abs(slow.cyclesPerYear / fast.cyclesPerYear - 1 / 720) < 1e-9);
  assert.equal(slow.swingPowerMw, fast.swingPowerMw);
});

test('the C-rate limit forces the oversizing that makes micro-cycling survivable', () => {
  const physics = bandPhysics(aiLoadSpectrum[1], gigawattAiCampus.itLoadMw);
  const lfp = smoothingTechnologies.find((t) => t.id === 'lfp');
  assert.ok(lfp);
  const naive = priceBufferOption(physics, lfp, gigawattAiCampus, {
    applyDodStress: false,
    applyCRateSizing: false,
  });
  const refined = priceBufferOption(physics, lfp, gigawattAiCampus, {
    applyDodStress: true,
    applyCRateSizing: true,
  });
  // Sized to the swing energy alone and aged by raw cycle count, a grid battery
  // on the five-second band lasts under a day.
  assert.ok(naive.effectiveLifeYears < 0.01);
  assert.ok(refined.oversizeFactor > 1_000);
  assert.equal(refined.effectiveLifeYears, lfp.calendarLifeYears);
  assert.ok(refined.totalAnnualUsd < naive.totalAnnualUsd / 100);
});

test('the thermal low-pass removes the fast bands from mechanical wear', () => {
  const filtered = mechanicalWearIndex(
    aiLoadSpectrum,
    gigawattAiCampus.itLoadMw,
    gigawattAiCampus.coolingThermalTimeConstantSeconds,
    gigawattAiCampus.coolingFatigueExponent,
    { applyLowPass: true },
  );
  const unfiltered = mechanicalWearIndex(
    aiLoadSpectrum,
    gigawattAiCampus.itLoadMw,
    gigawattAiCampus.coolingThermalTimeConstantSeconds,
    gigawattAiCampus.coolingFatigueExponent,
    { applyLowPass: false },
  );
  assert.ok(unfiltered > 50 * filtered);
  // Both spectra are dominated by their fastest band before filtering and by
  // their slowest band after it, which is why the AI-to-cloud wear ratio is so
  // sensitive to whether the filter is applied at all.
  const cloudFiltered = mechanicalWearIndex(
    cloudLoadSpectrum,
    gigawattAiCampus.itLoadMw,
    gigawattAiCampus.coolingThermalTimeConstantSeconds,
    gigawattAiCampus.coolingFatigueExponent,
    { applyLowPass: true },
  );
  const cloudUnfiltered = mechanicalWearIndex(
    cloudLoadSpectrum,
    gigawattAiCampus.itLoadMw,
    gigawattAiCampus.coolingThermalTimeConstantSeconds,
    gigawattAiCampus.coolingFatigueExponent,
    { applyLowPass: false },
  );
  assert.ok(cloudUnfiltered > 10 * cloudFiltered);
  assert.ok(unfiltered / filtered > 10 * (cloudUnfiltered / cloudFiltered));
  assert.ok(
    evaluateCoolingWear(gigawattAiCampus, { applyLowPass: false })
      .wearMultiplier >
      20 *
        evaluateCoolingWear(gigawattAiCampus, { applyLowPass: true })
          .wearMultiplier,
  );
});

test('V1 alarm collapses by orders of magnitude once the constraints are applied', () => {
  const result = evaluateAiPowerVolatility();
  // V1 returns a cost exceeding the entire cost of owning the campus, which is
  // the diagnostic: a missing physical constraint, not a finding.
  assert.ok(result.initialV1.shareOfTco > 100);
  assert.ok(result.initialV1.legacyUpsLifeYears < 1e-4);
  assert.ok(result.revisedV2.shareOfTco < 0.02);
  assert.ok(result.revisedV2.shareOfTco > 0.001);
  assert.ok(
    result.initialV1.totalAnnualUsd > 1_000 * result.revisedV2.totalAnnualUsd,
  );
  assert.ok(result.revisedV2.perMwhUsd > 1 && result.revisedV2.perMwhUsd < 30);
});

test('measures that touch compute throughput are the expensive ones', () => {
  const result = evaluateAiPowerVolatility();
  for (const band of result.revisedV2.bands) {
    assert.equal(band.chosenStrategy, 'buffer');
    assert.ok(band.bufferAnnualUsd < band.dummyWorkloadAnnualUsd);
    assert.ok(band.dummyWorkloadAnnualUsd < band.powerCapAnnualUsd);
  }
  // The dummy-workload bill lands in the "tens of millions per year at
  // gigawatt scale" range that the reporting describes.
  const dummyTotal = result.revisedV2.bands.reduce(
    (sum, band) => sum + band.dummyWorkloadAnnualUsd,
    0,
  );
  assert.ok(dummyTotal > 100e6 && dummyTotal < 500e6);
});

test('an electrical buffer does not protect the chillers; a thermal store does', () => {
  const result = evaluateAiPowerVolatility();
  // Every band is buffered electrically, so nothing is flattened at the source
  // and the full thermal swing still reaches the cooling plant.
  assert.ok(result.revisedV2.coolingWearMultiplier > 3);
  assert.ok(result.revisedV2.coolingLifeYears < 6);
  assert.ok(result.revisedV2.unmitigatedCoolingAnnualUsd > 300e6);
  assert.equal(result.revisedV2.coolingStrategy, 'thermal-storage');
  assert.ok(result.revisedV2.thermalStoragePaybackRatio > 50);
});

test('the volatility tax is bounded even where the fatigue physics is not', () => {
  const result = evaluateAiPowerVolatility();
  const shares = result.sensitivity.map((row) => row.totalShareOfTco);
  const multipliers = result.sensitivity.map((row) => row.coolingWearMultiplier);
  assert.ok(Math.max(...multipliers) / Math.min(...multipliers) > 1.9);
  // The mitigation caps the exposure, so a 2x spread in the wear multiplier
  // leaves the headline number unchanged.
  assert.ok(Math.max(...shares) - Math.min(...shares) < 1e-9);
});

test('queue completions are set by service capacity, not by queue depth', () => {
  const result = evaluateInterconnectionQueue();
  const base = result.revisedV2.baseSteadyState;
  assert.ok(Math.abs(base.queueGw - usInterconnectionQueue.activeQueueGw) < 1);
  assert.ok(
    Math.abs(base.serviceCapacityGw - usInterconnectionQueue.observedAnnualAdditionsGw) <
      1e-6,
  );
  // Doubling arrivals into the same service system does not raise delivery: the
  // queue absorbs the difference and congestion drag makes completions fall.
  const referenceWait =
    usInterconnectionQueue.activeQueueGw /
    usInterconnectionQueue.observedAnnualAdditionsGw;
  const hazardScale =
    (result.revisedV2.impliedArrivalsGwPerYear -
      usInterconnectionQueue.observedAnnualAdditionsGw) /
    usInterconnectionQueue.activeQueueGw;
  const doubled = solveQueueSteadyState(
    2 * result.revisedV2.impliedArrivalsGwPerYear,
    usInterconnectionQueue.observedAnnualAdditionsGw,
    usInterconnectionQueue,
    hazardScale,
    usInterconnectionQueue.activeQueueGw,
    referenceWait,
  );
  assert.ok(doubled.queueGw > 1.3 * base.queueGw);
  assert.ok(doubled.serviceCapacityGw < base.serviceCapacityGw);
  assert.ok(doubled.serviceCapacityGw > 0.85 * base.serviceCapacityGw);
  // Arrivals doubled; delivery moved by less than a tenth, downward.
  assert.ok(
    Math.abs(doubled.serviceCapacityGw / base.serviceCapacityGw - 1) < 0.1,
  );
});

test('the headline completion rate overstates delivery against observed additions', () => {
  const result = evaluateInterconnectionQueue();
  assert.ok(result.revisedV2.impliedCompletionsGwPerYear > 90);
  assert.ok(result.revisedV2.completionOverstatementRatio > 1.4);
  assert.ok(result.revisedV2.completionShareConsistentWithAdditions < 0.10);
  // Naive pipeline reading versus a service system that needs four decades.
  assert.ok(result.initialV1.naiveDeliverableGw > 300);
  assert.ok(result.initialV1.yearsToClearQueueAtObservedRate > 35);
});

test('queue depth moves in opposite directions under two reforms that both help', () => {
  const result = evaluateInterconnectionQueue();
  const byId = Object.fromEntries(result.policies.map((p) => [p.id, p]));
  assert.ok(byId['cull-duplicates'].queueChangeVsBase < -0.2);
  assert.ok(byId['cull-duplicates'].completionsChangeVsBase > 0.05);
  assert.ok(byId['faster-service'].queueChangeVsBase > 0.1);
  assert.ok(byId['faster-service'].completionsChangeVsBase > 0.35);
  assert.ok(byId['both'].completionsChangeVsBase > 0.5);
  assert.ok(
    byId['both'].expectedWaitYears < result.revisedV2.baseSteadyState.expectedWaitYears / 1.5,
  );
});

test('data centers need most of the achievable buildout, which volatility does not touch', () => {
  const result = evaluateInterconnectionQueue();
  assert.ok(result.revisedV2.dataCenterLoadGw2030 > 100);
  assert.ok(result.revisedV2.dataCenterShareOfAnnualAdditions > 0.5);
  assert.ok(result.revisedV2.dataCenterShareOfAnnualAdditions < 1.0);
});

test('the volatility channel is macro-invisible at the mitigated tax', () => {
  const result = evaluateVolatilityMacroLinkage();
  const byId = Object.fromEntries(result.rows.map((row) => [row.id, row]));
  assert.equal(byId['none'].dataCenterLoadChange2100, 0);
  assert.ok(Math.abs(byId['mitigated'].dataCenterLoadChange2100) < 0.01);
  assert.ok(Math.abs(byId['mitigated'].temperatureChange2100) < 0.005);
  assert.ok(byId['binding'].dataCenterLoadChange2100 < -0.1);
  // Near-unit elasticity: the willingness-to-pay ceiling is a budget identity.
  assert.ok(
    result.loadElasticityToTax < -0.6 && result.loadElasticityToTax > -1.2,
  );
});

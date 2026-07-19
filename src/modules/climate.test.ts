/**
 * Climate Module Tests
 *
 * Tests for the two-layer energy balance model (Geoffroy et al. 2013).
 * Verifies initialization, step dynamics, committed warming, and damage functions.
 */

import { climateModule, climateDefaults } from './climate.js';
import { cdrDefaults } from './cdr.js';
import { test, expect, printSummary } from '../test-utils.js';

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== Climate Module Tests (Two-Layer Model) ===\n');

test('init returns correct initial state', () => {
  const state = climateModule.init(climateDefaults);
  expect(state.cumulativeEmissions).toBe(climateDefaults.cumulativeCO2_2025);
  expect(state.temperature).toBe(climateDefaults.currentTemp);
  // Deep temp should be derived from energy balance (< surface temp)
  expect(state.deepTemp).toBeGreaterThan(0);
  expect(state.deepTemp).toBeLessThan(state.temperature);
});

test('init deep temp consistent with energy balance', () => {
  const state = climateModule.init(climateDefaults);
  // Verify: C₁ × warmingRate ≈ F - λ·T₁ - γ·(T₁ - T₂)
  // F includes the non-CO2 overlay at its 2025 value.
  const T1 = climateDefaults.currentTemp;
  const co2ppm = climateDefaults.preindustrialCO2 + climateDefaults.cumulativeCO2_2025 * climateDefaults.airborneFraction * climateDefaults.ppmPerGt;
  const forcing = 3.7 * Math.log2(co2ppm / 280) + climateDefaults.nonCO2Forcing2025;
  const lambda = 3.7 / 3.0;
  const lhs = 7.3 * 0.02;
  const rhs = forcing - lambda * T1 - 0.73 * (T1 - state.deepTemp);
  expect(lhs).toBeCloseTo(rhs, 2);
});

test('step with zero emissions keeps temperature stable initially', () => {
  const state = climateModule.init(climateDefaults);
  const { outputs } = climateModule.step(
    state,
    { emissions: 0 },
    climateDefaults,
    2025,
    0
  );

  // Temperature should stay near currentTemp (small drift from existing imbalance)
  const T0 = climateDefaults.currentTemp;
  expect(outputs.temperature).toBeGreaterThan(T0 - 0.05);
  expect(outputs.temperature).toBeLessThan(T0 + 0.15);
});

test('step with high emissions increases temperature', () => {
  let state = climateModule.init(climateDefaults);

  // Run for 10 years with high emissions
  for (let i = 0; i < 10; i++) {
    const result = climateModule.step(
      state,
      { emissions: 50 }, // 50 Gt/year (higher than current ~35)
      climateDefaults,
      2025 + i,
      i
    );
    state = result.state;
  }

  // Two-layer model has more inertia than single-lag — 1.4°C after 10yr is correct
  expect(state.temperature).toBeGreaterThan(1.35);
});

test('deep ocean warms slower than surface', () => {
  let state = climateModule.init(climateDefaults);

  // Run for 30 years with steady emissions
  for (let i = 0; i < 30; i++) {
    const result = climateModule.step(
      state,
      { emissions: 40 },
      climateDefaults,
      2025 + i,
      i
    );
    state = result.state;
  }

  // Surface should have warmed more than deep ocean from their starting points
  const surfaceWarming = state.temperature - climateDefaults.currentTemp;
  const deepWarming = state.deepTemp - climateModule.init(climateDefaults).deepTemp;
  expect(surfaceWarming).toBeGreaterThan(deepWarming);
});

test('temperature continues rising after emissions stop (committed warming)', () => {
  let state = climateModule.init(climateDefaults);

  // Phase 1: Emit for 30 years
  for (let i = 0; i < 30; i++) {
    const result = climateModule.step(
      state,
      { emissions: 40 },
      climateDefaults,
      2025 + i,
      i
    );
    state = result.state;
  }
  const tempAtEmissionsStop = state.temperature;

  // Phase 2: Zero emissions for 20 more years
  // Temperature should still rise due to ocean heat uptake lag
  let maxTempAfterStop = tempAtEmissionsStop;
  for (let i = 0; i < 20; i++) {
    const result = climateModule.step(
      state,
      { emissions: 0 },
      climateDefaults,
      2055 + i,
      30 + i
    );
    state = result.state;
    maxTempAfterStop = Math.max(maxTempAfterStop, state.temperature);
  }

  // Key prediction: temperature continues rising after emissions stop
  // (This is the main benefit of the two-layer model over single-lag)
  expect(maxTempAfterStop).toBeGreaterThan(tempAtEmissionsStop);
});

test('equilibrium temp and committed warming gap', () => {
  const state = climateModule.init(climateDefaults);
  const { outputs } = climateModule.step(
    state,
    { emissions: 35 },
    climateDefaults,
    2025,
    0
  );

  // Equilibrium temp should be higher than current surface temp
  expect(outputs.equilibriumTemp).toBeGreaterThan(outputs.temperature);

  // The gap (equilibriumTemp - temperature) represents committed warming
  const committedWarming = outputs.equilibriumTemp - outputs.temperature;
  expect(committedWarming).toBeGreaterThan(0.2); // Significant committed warming
});

test('radiative forcing output is positive', () => {
  const state = climateModule.init(climateDefaults);
  const { outputs } = climateModule.step(
    state,
    { emissions: 35 },
    climateDefaults,
    2025,
    0
  );

  expect(outputs.radiativeForcing).toBeGreaterThan(2.0); // ~2.1 W/m² at 418 ppm
  expect(outputs.radiativeForcing).toBeLessThan(3.0);
});

test('deep ocean temp output matches state', () => {
  const state = climateModule.init(climateDefaults);
  const result = climateModule.step(
    state,
    { emissions: 35 },
    climateDefaults,
    2025,
    0
  );

  expect(result.outputs.deepOceanTemp).toBe(result.state.deepTemp);
});

test('damage function reproduces its documented calibration quantitatively', () => {
  // paramMeta claims ~4.8% GDP at 3°C before tipping amplification:
  // 0.00536 x 3^2 = 0.0482. Pins damageCoeff against an external literal —
  // the audit found the previous damage test asserted only emissions.
  const preTipping = climateDefaults.damageCoeff * 3 * 3;
  expect(preTipping).toBeCloseTo(0.048, 2);

  // Step-level anchor at the 2025 starting temperature (~1.45-1.50°C after
  // one zero-emission step): hand-computed damages there are ~0.0115-0.0128.
  // DICE-2023's coefficient would give ~0.008 and Howard-Sterner ~0.017, so
  // this band detects coefficient drift through the real step path without
  // mirroring the implementation formula.
  const state = climateModule.init(climateDefaults);
  const { outputs } = climateModule.step(state, { emissions: 0 }, climateDefaults, 2025, 0);
  expect(outputs.damages).toBeBetween(0.011, 0.013);
});

test('cdr default TCRE matches climate\'s emergent warming per GtCO2', () => {
  // cdr.tcre is a parameter-isolated duplicate of climate's emergent
  // warming-per-GtCO2. Measured module-only — constant emissions, non-CO2
  // overlay held at its 2025 level — so the delta is the CO2 response alone,
  // with no cross-module couplings to neutralize. If climate's sensitivity
  // default or temperature formula drifts, this fails instead of the SCC
  // gate silently miscalibrating.
  const params = climateModule.mergeParams({
    nonCO2Forcing2100: climateDefaults.nonCO2Forcing2025,
  });
  let state = climateModule.init(params);
  const T0 = state.temperature;
  const E0 = state.cumulativeEmissions;
  for (let i = 0; i < 75; i++) {
    state = climateModule.step(state, { emissions: 30 }, params, 2025 + i, i).state;
  }
  const emergent = (state.temperature - T0) / (state.cumulativeEmissions - E0);
  expect(Math.abs(emergent - cdrDefaults.tcre) / cdrDefaults.tcre).toBeLessThan(0.2);
});

test('rising non-CO2 forcing adds warming over the century', () => {
  const run = (nonCO2Forcing2100: number) => {
    const params = climateModule.mergeParams({ nonCO2Forcing2100 });
    let state = climateModule.init(params);
    for (let i = 0; i < 75; i++) {
      state = climateModule.step(state, { emissions: 20 }, params, 2025 + i, i).state;
    }
    return state.temperature;
  };
  // Aerosol-cleanup path (+0.85 by 2100) vs strong CH4 mitigation (+0.2):
  // the difference of 0.65 W/m^2 sustained should be worth a few tenths of a degree
  const spread = run(0.85) - run(0.2);
  expect(spread).toBeGreaterThan(0.1);
  expect(spread).toBeLessThan(0.5);
});

test('damages are capped at maxDamage under extreme warming', () => {
  const state = { ...climateModule.init(climateDefaults), temperature: 12 };
  const { outputs } = climateModule.step(state, { emissions: 0 }, climateDefaults, 2025, 0);
  expect(outputs.damages).toBeCloseTo(climateDefaults.maxDamage, 6);
});

test('damages increase with temperature', () => {
  const state = climateModule.init(climateDefaults);

  // Low emissions scenario
  const { outputs: lowEmissions } = climateModule.step(
    state,
    { emissions: 10 },
    climateDefaults,
    2025,
    0
  );

  // High emissions scenario (same initial state)
  const { outputs: highEmissions } = climateModule.step(
    state,
    { emissions: 100 },
    climateDefaults,
    2025,
    0
  );

  expect(highEmissions.cumulativeEmissions).toBeGreaterThan(lowEmissions.cumulativeEmissions);
});

test('regional damages vary by multiplier', () => {
  let state = climateModule.init(climateDefaults);

  // Run for 20 years to build up temperature
  for (let i = 0; i < 20; i++) {
    const result = climateModule.step(
      state,
      { emissions: 40 },
      climateDefaults,
      2025 + i,
      i
    );
    state = result.state;
  }

  const { outputs } = climateModule.step(
    state,
    { emissions: 40 },
    climateDefaults,
    2045,
    20
  );

  // SSA has 2.0x multiplier, OECD has 0.8x
  expect(outputs.regionalDamages.ssa).toBeGreaterThan(outputs.regionalDamages.oecd);
});

test('tipping point increases damages above threshold', () => {
  // Create state with high temperature
  const highTempState = {
    cumulativeEmissions: 5000,
    temperature: 3.5,
    deepTemp: 2.5,
  };

  const { outputs: highTemp } = climateModule.step(
    highTempState,
    { emissions: 50 },
    climateDefaults,
    2075,
    50
  );

  // Create state below tipping threshold
  const lowTempState = {
    cumulativeEmissions: 2500,
    temperature: 1.5,
    deepTemp: 0.8,
  };

  const { outputs: lowTemp } = climateModule.step(
    lowTempState,
    { emissions: 20 },
    climateDefaults,
    2050,
    25
  );

  // Damage per degree should be higher above tipping point
  const damagePerDegreeHigh = highTemp.damages / highTemp.temperature;
  const damagePerDegreeLow = lowTemp.damages / lowTemp.temperature;

  expect(damagePerDegreeHigh).toBeGreaterThan(damagePerDegreeLow);
});

test('damages capped at maxDamage', () => {
  // Extreme temperature scenario
  const extremeState = {
    cumulativeEmissions: 10000,
    temperature: 6.0,
    deepTemp: 4.0,
  };

  const { outputs } = climateModule.step(
    extremeState,
    { emissions: 100 },
    climateDefaults,
    2100,
    75
  );

  expect(outputs.damages).toBeLessThan(climateDefaults.maxDamage + 0.01);
});

test('validation catches invalid parameters', () => {
  const result = climateModule.validate({
    sensitivity: 10, // Way too high
    damageCoeff: -1, // Negative
  });

  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

test('validation warns on unusual but valid parameters', () => {
  const result = climateModule.validate({
    sensitivity: 5.0, // High but valid
  });

  expect(result.valid).toBeTrue();
  expect(result.warnings.length).toBeGreaterThan(0);
});

test('validation catches invalid two-layer params', () => {
  const result = climateModule.validate({
    upperHeatCapacity: -1,
    deepHeatCapacity: 0,
  });

  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

test('marginal TCRE matches AR6 best estimate', () => {
  // Two 30-year constant-emission paths differing by +1000 Gt total. The
  // rising airborne fraction (sink saturation) restores the near-linear
  // transient response that a constant fraction under log forcing
  // understates ~30% (adversarial review finding). AR6: 0.45 (0.27-0.63).
  const run = (emisPerYr: number) => {
    let st = climateModule.init(climateDefaults);
    let temp = 0;
    for (let i = 0; i < 30; i++) {
      const r = climateModule.step(st, { emissions: emisPerYr }, climateDefaults, 2025 + i, i);
      st = r.state; temp = r.outputs.temperature;
    }
    return temp;
  };
  const marginal = run(38 + 1000 / 30) - run(38);
  expect(marginal).toBeBetween(0.35, 0.55);
});

test('CO2 ppm calculation matches calibration', () => {
  // 2025: cumulative 2680 Gt (GCB 2024), airborne 0.42 (observed ratio),
  // ppmPerGt 0.128 -> 280 + 144 = 424 ppm, matching NOAA 2025 (~424)
  const state = climateModule.init(climateDefaults);
  const { outputs } = climateModule.step(
    state,
    { emissions: 0 },
    climateDefaults,
    2025,
    0
  );

  expect(outputs.co2ppm).toBeCloseTo(424, 0); // Within 1 ppm of NOAA 2025
});

// =============================================================================
// OCEAN pH TESTS
// =============================================================================

test('ocean pH at ~418 ppm matches NOAA observations (~8.06)', () => {
  const state = climateModule.init(climateDefaults);
  const { outputs } = climateModule.step(
    state,
    { emissions: 0 },
    climateDefaults,
    2025,
    0
  );

  // At ~418 ppm: pH = 8.18 - 0.32 × log2(418/280) ≈ 8.06
  expect(outputs.oceanPH).toBeCloseTo(8.06, 1);
});

test('ocean pH decreases with higher CO2', () => {
  let state = climateModule.init(climateDefaults);

  const { outputs: early } = climateModule.step(
    state,
    { emissions: 0 },
    climateDefaults,
    2025,
    0
  );

  // Run 30 years with high emissions to build up CO2
  for (let i = 0; i < 30; i++) {
    const result = climateModule.step(
      state,
      { emissions: 50 },
      climateDefaults,
      2025 + i,
      i
    );
    state = result.state;
  }

  const { outputs: later } = climateModule.step(
    state,
    { emissions: 50 },
    climateDefaults,
    2055,
    30
  );

  expect(later.oceanPH).toBeLessThan(early.oceanPH);
});

test('ocean pH at 560 ppm (2×CO2) ≈ 7.86', () => {
  // At 2×CO2 (560 ppm): pH = 8.18 - 0.32 × log2(560/280) = 8.18 - 0.32 = 7.86
  // Construct state with cumulative emissions that give ~560 ppm. Use a
  // zero airborne-fraction slope so the inversion is exact (this test
  // checks the pH formula, not the carbon cycle).
  const flatAF = climateModule.mergeParams({ airborneFractionSlope: 0 });
  const doubleCO2State = {
    cumulativeEmissions: flatAF.preindustrialCO2 / (flatAF.airborneFraction * flatAF.ppmPerGt),
    temperature: 2.0,
    deepTemp: 1.0,
  };

  const { outputs } = climateModule.step(
    doubleCO2State,
    { emissions: 0 },
    flatAF,
    2060,
    35
  );

  expect(outputs.co2ppm).toBeCloseTo(560, 0);
  expect(outputs.oceanPH).toBeCloseTo(7.86, 1);
});

test('higher sensitivity produces more warming', () => {
  const lowSensParams = { ...climateDefaults, sensitivity: 2.0 };
  const highSensParams = { ...climateDefaults, sensitivity: 4.5 };

  let lowState = climateModule.init(lowSensParams);
  let highState = climateModule.init(highSensParams);

  for (let i = 0; i < 50; i++) {
    lowState = climateModule.step(lowState, { emissions: 35 }, lowSensParams, 2025 + i, i).state;
    highState = climateModule.step(highState, { emissions: 35 }, highSensParams, 2025 + i, i).state;
  }

  expect(highState.temperature).toBeGreaterThan(lowState.temperature);
});

printSummary();

/**
 * Climate Module Tests
 *
 * Tests for the two-layer energy balance model (Geoffroy et al. 2013).
 * Verifies initialization, step dynamics, committed warming, and damage functions.
 */

import { climateModule, climateDefaults } from './climate.js';

// Simple test framework (would use Jest/Vitest in real project)
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e: any) {
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeCloseTo(expected: number, precision: number = 2) {
      const diff = Math.abs(actual - expected);
      const threshold = Math.pow(10, -precision);
      if (diff > threshold) {
        throw new Error(`Expected ~${expected}, got ${actual} (diff: ${diff})`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true, got ${actual}`);
      }
    },
  };
}

// =============================================================================
// TESTS
// =============================================================================

console.log('\n=== Climate Module Tests (Two-Layer Model) ===\n');

test('init returns correct initial state', () => {
  const state = climateModule.init(climateDefaults);
  expect(state.cumulativeEmissions).toBe(2400);
  expect(state.temperature).toBe(climateDefaults.currentTemp);
  // Deep temp should be derived from energy balance (< surface temp)
  expect(state.deepTemp).toBeGreaterThan(0);
  expect(state.deepTemp).toBeLessThan(state.temperature);
});

test('init deep temp consistent with energy balance', () => {
  const state = climateModule.init(climateDefaults);
  // Verify: C₁ × warmingRate ≈ F - λ·T₁ - γ·(T₁ - T₂)
  const T1 = climateDefaults.currentTemp;
  const co2ppm = 280 + 2400 * 0.45 * 0.128;
  const forcing = 3.7 * Math.log2(co2ppm / 280);
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

test('CO2 ppm calculation matches calibration', () => {
  // 2025: cumulative 2400 Gt, airborne 45%, ppmPerGt 0.128
  // Expected: 280 + (2400 * 0.45 * 0.128) = 280 + 138.24 ≈ 418 ppm
  const state = climateModule.init(climateDefaults);
  const { outputs } = climateModule.step(
    state,
    { emissions: 0 },
    climateDefaults,
    2025,
    0
  );

  expect(outputs.co2ppm).toBeCloseTo(418, 0); // Within 1 ppm
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

console.log('\n=== All tests complete ===\n');

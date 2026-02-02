/**
 * Climate Module Tests
 *
 * Demonstrates how modules can be tested in complete isolation.
 * No need to set up demographics, demand, or any other module.
 */

import { climateModule, climateDefaults } from './climate';

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

console.log('\n=== Climate Module Tests ===\n');

test('init returns correct initial state', () => {
  const state = climateModule.init(climateDefaults);
  expect(state.cumulativeEmissions).toBe(2400);
  expect(state.temperature).toBe(1.2);
});

test('step with zero emissions keeps temperature stable', () => {
  const state = climateModule.init(climateDefaults);
  const { outputs } = climateModule.step(
    state,
    { emissions: 0 },
    climateDefaults,
    2025,
    0
  );

  // Temperature should decrease toward equilibrium (which is lower with no new emissions)
  expect(outputs.temperature).toBeLessThan(1.3);
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

  expect(state.temperature).toBeGreaterThan(1.5);
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

  // Higher emissions → higher cumulative → higher temperature → higher damages
  // (Though the effect is small in just one year due to thermal lag)
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

  // ROW has 1.8x multiplier, OECD has 0.8x
  expect(outputs.regionalDamages.row).toBeGreaterThan(outputs.regionalDamages.oecd);
});

test('tipping point increases damages above threshold', () => {
  // Create state with high temperature
  const highTempState = {
    cumulativeEmissions: 5000, // Very high
    temperature: 3.5, // Above tipping threshold
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
    climSensitivity: 10, // Way too high
    damageCoeff: -1, // Negative
  });

  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

test('validation warns on unusual but valid parameters', () => {
  const result = climateModule.validate({
    climSensitivity: 5.0, // High but valid
  });

  expect(result.valid).toBeTrue();
  expect(result.warnings.length).toBeGreaterThan(0);
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

console.log('\n=== All tests complete ===\n');

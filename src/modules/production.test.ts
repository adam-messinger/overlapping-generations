/**
 * Production Module Tests
 *
 * The GDP engine had no tests despite carrying the model's most consequential
 * parameter (gamma = 0.55). These pin the calibrated exponents, the year-0
 * normalization, the energy elasticity itself, and the damage stacking.
 */

import { productionModule, productionDefaults } from './production.js';
import { runGrowthBackcast } from '../historical-backcast.js';
import { test, expect, printSummary } from '../test-utils.js';

function makeInputs(overrides: Record<string, number> = {}) {
  return {
    capitalStock: 553,
    effectiveWorkers: 5.2e9,
    totalGeneration: 27000,
    nonElectricEnergy: 99000,
    damages: 0,
    energyBurdenDamage: 0,
    foodStress: 0,
    resourceEnergy: 3000,
    energySystemOverhead: 2000,
    collegeShare: 0.25,
    cdrEnergy: 0,
    ...overrides,
  };
}

function yearZero(params = productionModule.mergeParams({})) {
  return productionModule.step(productionModule.init(params), makeInputs(), params, 2025, 0);
}

console.log('\n=== Production Module Tests ===\n');

test('calibrated Ayres-Warr exponents are pinned', () => {
  // gamma = 0.55: Ayres & Warr (2009), within Kuemmel et al. (2010) 0.40-0.60.
  // Changing the growth engine's core elasticities must be deliberate.
  expect(productionDefaults.gamma).toBe(0.55);
  expect(productionDefaults.alpha).toBe(0.25);
  expect(productionDefaults.beta).toBe(0.15);
});

test('1990-2025 growth backcast reproduces observed world GDP', () => {
  // The efficiency engine (eta0/etaMax/lambda) is calibrated so that the
  // production structure, anchored in 1990 and driven with observed world
  // inputs, reproduces observed 2025 GDP ($158T WDI PPP) — see
  // scripts/growth-backcast.md. This pins the calibration across all
  // production params AND the historical data: changing elasticities,
  // efficiency params, or the observed series without re-solving lambda
  // breaks this test rather than silently decalibrating the model.
  const r = runGrowthBackcast();
  const predicted2025 = r.gdpPath[r.gdpPath.length - 1];
  const observed2025 = r.gdpObserved[r.gdpObserved.length - 1];
  expect(Math.abs(predicted2025 / observed2025 - 1)).toBeLessThan(0.05);

  // Independent check the solver was not fitted to: the backcast's implied
  // 2025 second-law efficiency must land in Brockway et al. (2018)'s
  // measured ~0.20-0.25 band (started from De Stercke's 0.15 in 1990).
  expect(r.final.eta).toBeBetween(0.19, 0.27);
});

test('year 0 normalizes GDP to initialGDP with unit contributions', () => {
  const { outputs } = yearZero();
  expect(outputs.gdp).toBeCloseTo(productionDefaults.initialGDP, 6);
  expect(outputs.capitalContribution).toBeCloseTo(1, 9);
  expect(outputs.laborContribution).toBeCloseTo(1, 9);
  expect(outputs.energyContribution).toBeCloseTo(1, 9);
});

test('useful energy scales GDP with elasticity gamma', () => {
  const params = productionModule.mergeParams({});
  const base = yearZero(params);
  const sameEnergy = productionModule.step(base.state, makeInputs(), params, 2026, 1);
  const moreEnergy = productionModule.step(
    base.state,
    makeInputs({ totalGeneration: 27000 * 1.1, nonElectricEnergy: 99000 * 1.1, resourceEnergy: 3300, energySystemOverhead: 2200 }),
    params,
    2026,
    1,
  );
  const ratio = moreEnergy.outputs.gdp / sameEnergy.outputs.gdp;
  // Expected 1.1^0.55; the end-use learning term drifts the ratio by <0.5%
  const expected = Math.pow(1.1, params.gamma);
  expect(Math.abs(ratio - expected) / expected).toBeLessThan(0.005);
});

test('a lower gamma weakens the energy-growth channel', () => {
  const run = (gamma: number) => {
    const params = productionModule.mergeParams({ gamma });
    const y0 = productionModule.step(productionModule.init(params), makeInputs(), params, 2025, 0);
    return productionModule.step(
      y0.state,
      makeInputs({ totalGeneration: 27000 * 1.5, nonElectricEnergy: 99000 * 1.5 }),
      params,
      2026,
      1,
    ).outputs.gdp;
  };
  expect(run(0.55)).toBeGreaterThan(run(0.08));
});

test('damage factors multiply: climate, energy burden, and food stress', () => {
  const params = productionModule.mergeParams({});
  const y0 = yearZero(params);
  const clean = productionModule.step(y0.state, makeInputs(), params, 2026, 1);
  const damaged = productionModule.step(
    y0.state,
    makeInputs({ damages: 0.1, energyBurdenDamage: 0.05, foodStress: 1 }),
    params,
    2026,
    1,
  );
  const expected = (1 - 0.1) * (1 - 0.05) * (1 - params.foodStressElasticity);
  expect(damaged.outputs.gdp / clean.outputs.gdp).toBeCloseTo(expected, 9);
});

test('system overhead energy is subtracted from productive useful energy', () => {
  const params = productionModule.mergeParams({});
  const base = yearZero(params).outputs.productionUsefulEnergy;
  const heavier = productionModule.step(
    productionModule.init(params),
    makeInputs({ resourceEnergy: 6000 }),
    params,
    2025,
    0,
  ).outputs.productionUsefulEnergy;
  expect(heavier).toBeLessThan(base);
});

test('end-use efficiency rises with cumulative useful work and is bounded', () => {
  const params = productionModule.mergeParams({});
  let state = productionModule.init(params);
  let eta0 = 0;
  for (let i = 0; i < 50; i++) {
    const r = productionModule.step(state, makeInputs(), params, 2025 + i, i);
    state = r.state;
    if (i === 0) eta0 = r.outputs.eta;
    expect(r.outputs.eta).toBeLessThan(params.endUseEfficiencyMax + 1e-9);
  }
  const final = productionModule.step(state, makeInputs(), params, 2075, 50);
  expect(final.outputs.eta).toBeGreaterThan(eta0);
});

test('validation rejects out-of-range elasticities and warns on increasing returns', () => {
  expect(productionModule.validate({ gamma: -0.1 }).valid).toBeFalse();
  expect(productionModule.validate({ gamma: 1.5 }).valid).toBeFalse();
  const increasing = productionModule.validate({ alpha: 0.5, beta: 0.4, gamma: 0.5 });
  expect(increasing.valid).toBeTrue();
  expect(increasing.warnings.length).toBeGreaterThan(0);
});

printSummary();

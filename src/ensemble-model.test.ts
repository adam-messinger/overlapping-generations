/**
 * The study wrapper.
 *
 * The wrapper's job is to be the same model, seen through a narrower window.
 * Most of these tests exist to catch it quietly becoming a different one.
 */

import { runModel, runEnsemble } from 'tsimulation';
import { runSimulation } from './simulation.js';
import {
  energyEnsembleModel,
  ENERGY_ENSEMBLE_DEFAULTS,
  ENERGY_ENSEMBLE_BOUNDS,
  toSimulationParams,
  type EnergyEnsembleInput,
} from './ensemble-model.js';
import { test, expect, printSummary } from './test-utils.js';

const STUDY_OPTIONS = {
  diagnostics: false,
  connectorValidation: 'off',
  paramLiveness: 'off',
} as const;

const METRICS = [
  'warming2050', 'warming2100', 'gdp2050', 'gdp2100', 'peakEmissions', 'fossilShareFinal',
] as const;

test('the wrapper reports exactly what a direct run reports', () => {
  const direct = runSimulation(toSimulationParams(ENERGY_ENSEMBLE_DEFAULTS), STUDY_OPTIONS);
  const wrapped = runModel(energyEnsembleModel, ENERGY_ENSEMBLE_DEFAULTS).output;
  const differing = METRICS.filter(
    key => !Object.is((direct.metrics as unknown as Record<string, number>)[key], wrapped[key]),
  );
  expect(differing.join(', ')).toBe('');
});

test('the wrapper defaults reproduce the calibrated default run', () => {
  // The load-bearing test. Passing a parameter at its own default value must
  // be indistinguishable from not passing it -- and for one parameter it was
  // not: production.serviceEfficiencyGrowth is DERIVED from demand's
  // efficiency dial unless supplied, so supplying it, even at its declared
  // default, bypassed the coupling and moved every metric. A study built on
  // that would have reported a shifted baseline and an inflated spread with
  // nothing failing.
  const plain = runSimulation({}, STUDY_OPTIONS);
  const wrapped = runModel(energyEnsembleModel, ENERGY_ENSEMBLE_DEFAULTS).output;
  const differing = METRICS.filter(
    key => !Object.is((plain.metrics as unknown as Record<string, number>)[key], wrapped[key]),
  );
  expect(differing.join(', ')).toBe('');
});

test('the efficiency dial keeps both views of the one series coupled', () => {
  // Raising efficiency must raise GDP and LOWER warming: less energy per unit
  // of service means fewer emissions. Sampling production's growth rate
  // directly re-splits the series and inverts that, which is how the wrong
  // dial announces itself.
  const low = runModel(energyEnsembleModel,
    { ...ENERGY_ENSEMBLE_DEFAULTS, efficiencyMultiplier: 0.8 }).output;
  const high = runModel(energyEnsembleModel,
    { ...ENERGY_ENSEMBLE_DEFAULTS, efficiencyMultiplier: 1.25 }).output;
  expect(high.gdp2100).toBeGreaterThan(low.gdp2100);
  expect(low.warming2100).toBeGreaterThan(high.warming2100);
});

test('every sampled parameter actually moves an output', () => {
  // A parameter in the input type is a claim that its uncertainty matters. One
  // that changes nothing is either wired wrongly or does not belong here.
  const inert: string[] = [];
  for (const name of Object.keys(ENERGY_ENSEMBLE_BOUNDS) as Array<keyof EnergyEnsembleInput>) {
    const [low, high] = ENERGY_ENSEMBLE_BOUNDS[name];
    const atLow = runModel(energyEnsembleModel,
      { ...ENERGY_ENSEMBLE_DEFAULTS, [name]: low + 0.1 * (high - low) }).output;
    const atHigh = runModel(energyEnsembleModel,
      { ...ENERGY_ENSEMBLE_DEFAULTS, [name]: low + 0.9 * (high - low) }).output;
    if (METRICS.every(key => Object.is(atLow[key], atHigh[key]))) inert.push(name);
  }
  expect(inert.join(', ')).toBe('');
});

test('a draw outside its declared range is rejected, not run', () => {
  for (const [name, [low, high]] of Object.entries(ENERGY_ENSEMBLE_BOUNDS)) {
    for (const bad of [low - 1e-6, high + 1e-6, Number.NaN]) {
      let threw = false;
      try {
        runModel(energyEnsembleModel, { ...ENERGY_ENSEMBLE_DEFAULTS, [name]: bad });
      } catch { threw = true; }
      expect(`${name}=${bad}: ${threw}`).toBe(`${name}=${bad}: true`);
    }
  }
});

test('the framework ensemble can drive the wrapper end to end', () => {
  const result = runEnsemble({
    model: energyEnsembleModel,
    draws: 6,
    seed: 20260907,
    sample: (random) => {
      const [low, high] = ENERGY_ENSEMBLE_BOUNDS.climateSensitivity;
      const climateSensitivity = low + random() * (high - low);
      return {
        input: { ...ENERGY_ENSEMBLE_DEFAULTS, climateSensitivity },
        parameters: { climateSensitivity },
      };
    },
    metrics: { warming2100: output => output.warming2100 },
  });
  expect(result.outputs.length).toBe(6);
  // Warming is monotone in sensitivity, so the rank correlation is exactly 1.
  // A weaker value means the draws are not reaching the model.
  expect(result.rankSensitivity.climateSensitivity.warming2100).toBeCloseTo(1, 9);
});

printSummary();

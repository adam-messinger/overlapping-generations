/**
 * The study wrapper.
 *
 * The wrapper's job is to be the same model, seen through a narrower window.
 * Most of these tests exist to catch it quietly becoming a different one.
 */

import { runModel, runEnsemble } from 'tsimulation';
import { runSimulation } from './simulation.js';
import { describeParameters } from './introspection.js';
import {
  energyEnsembleModel,
  ENERGY_ENSEMBLE_DEFAULTS,
  ENERGY_ENSEMBLE_BOUNDS,
  STUDY_OPTIONS,
  toSimulationParams,
  type EnergyEnsembleInput,
} from './ensemble-model.js';
import { test, expect, printSummary } from './test-utils.js';

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
  // Sampling production's growth rate directly re-splits the series, which is
  // how the wrong dial announces itself. Measured across the declared range,
  // this dial vs the re-split: energy per $ of GDP in 2100 x0.57 vs x0.97,
  // GDP x2.3 vs x5.9, warming +0.12 vs +0.89 °C.
  //
  // Don't pin the SIGN of warming. Rebound in final energy is about 100%, so
  // the response is small and not monotone (see the input's doc comment).
  const [lowEnd, highEnd] = ENERGY_ENSEMBLE_BOUNDS.efficiencyMultiplier;
  const inputAt = (efficiencyMultiplier: number): EnergyEnsembleInput =>
    ({ ...ENERGY_ENSEMBLE_DEFAULTS, efficiencyMultiplier });
  const low = runModel(energyEnsembleModel, inputAt(lowEnd)).output;
  const high = runModel(energyEnsembleModel, inputAt(highEnd)).output;

  const energyPerGdp2100 = (efficiencyMultiplier: number) => {
    const y2100 = runSimulation(toSimulationParams(inputAt(efficiencyMultiplier)), STUDY_OPTIONS).results[75];
    return y2100.totalFinalEnergy / y2100.gdp;
  };
  expect(energyPerGdp2100(highEnd) / energyPerGdp2100(lowEnd)).toBeLessThan(0.7);

  expect(high.gdp2100).toBeGreaterThan(low.gdp2100);
  expect(high.gdp2100 / low.gdp2100).toBeLessThan(3);
  expect(Math.abs(high.warming2100 - low.warming2100)).toBeLessThan(0.3);
});

test('every sampled parameter actually moves an output', () => {
  // A parameter in the input type is a claim that its uncertainty matters. One
  // that changes nothing is either wired wrongly or does not belong here.
  const inert: string[] = [];
  for (const name of Object.keys(ENERGY_ENSEMBLE_BOUNDS) as Array<keyof EnergyEnsembleInput>) {
    const [low, high] = ENERGY_ENSEMBLE_BOUNDS[name];
    // Quartiles, not the near-edges: at 0.1 of its range robotIntegrationExponent
    // landed 0.01 above a divergence, so the probe passed on luck.
    const atLow = runModel(energyEnsembleModel,
      { ...ENERGY_ENSEMBLE_DEFAULTS, [name]: low + 0.25 * (high - low) }).output;
    const atHigh = runModel(energyEnsembleModel,
      { ...ENERGY_ENSEMBLE_DEFAULTS, [name]: low + 0.75 * (high - low) }).output;
    if (METRICS.every(key => Object.is(atLow[key], atHigh[key]))) inert.push(name);
  }
  expect(inert.join(', ')).toBe('');
});

test('the declared box is feasible where it interacts most', () => {
  // A study draws from this box; a draw the model cannot complete aborts the
  // whole ensemble, because runEnsemble has no partial-failure path.
  //
  // The Tier-1 range for robotIntegrationExponent starts at 0.3, but the model
  // diverges below ~0.385 (demand.energyBurden reaches Infinity before 2100),
  // and the corners that fail are those where it meets extreme gamma and
  // efficiency. Sweeping all 128 corners of the 7-D box found 64 failures at
  // theta 0.3, 3 at 0.45, 2 at 0.5 and none at 0.55 — hence the floor.
  //
  // Only the three interacting parameters are swept here; the full 128-corner
  // sweep takes ~50s and lives in the PR record rather than the suite.
  const interacting = ['robotIntegrationExponent', 'gamma', 'efficiencyMultiplier'] as const;
  const failures: string[] = [];
  for (let mask = 0; mask < (1 << interacting.length); mask++) {
    const input = { ...ENERGY_ENSEMBLE_DEFAULTS };
    interacting.forEach((name, i) => {
      const [low, high] = ENERGY_ENSEMBLE_BOUNDS[name];
      input[name] = (mask >> i) & 1 ? high : low;
    });
    try {
      runModel(energyEnsembleModel, input);
    } catch (error) {
      failures.push(
        `${interacting.map(n => `${n}=${input[n]}`).join(' ')}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  expect(failures.join(' | ')).toBe('');
});

test('bounds and defaults track the model declarations they claim to mirror', () => {
  // Derived rather than hand-written, so this asserts the derivation is wired
  // to the right names -- the failure it guards is a study silently drawing
  // from a range the model no longer declares.
  const schema = describeParameters();
  const tier1: Array<[keyof EnergyEnsembleInput, string]> = [
    ['gamma', 'gamma'],
    ['climateSensitivity', 'climateSensitivity'],
    ['tippingThreshold', 'tippingThreshold'],
    ['solarLearningRate', 'solarAlpha'],
    ['windLearningRate', 'windAlpha'],
  ];
  const wrong: string[] = [];
  for (const [field, name] of tier1) {
    const info = schema[name];
    const [low, high] = ENERGY_ENSEMBLE_BOUNDS[field];
    if (low !== info.min || high !== info.max) {
      wrong.push(`${field} bounds [${low}, ${high}] != ${name} [${info.min}, ${info.max}]`);
    }
    if (ENERGY_ENSEMBLE_DEFAULTS[field] !== info.default) {
      wrong.push(`${field} default ${ENERGY_ENSEMBLE_DEFAULTS[field]} != ${name} ${info.default}`);
    }
  }
  // robotIntegrationExponent is deliberately narrowed below its Tier-1 range;
  // only its upper bound and default should track.
  const theta = schema.robotIntegrationExponent;
  const [thetaLow, thetaHigh] = ENERGY_ENSEMBLE_BOUNDS.robotIntegrationExponent;
  if (thetaHigh !== theta.max) wrong.push(`theta upper ${thetaHigh} != ${theta.max}`);
  if (theta.min === undefined || thetaLow <= theta.min) {
    wrong.push(`theta floor ${thetaLow} should be above Tier-1 ${theta.min}`);
  }
  expect(wrong.join(' | ')).toBe('');
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

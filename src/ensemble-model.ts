/**
 * The energy model as a `tsimulation` model, so it can be driven by the
 * framework's ensemble and sensitivity machinery.
 *
 * `runEnsemble` needs a `ModelDefinition`: a validated input contract, a
 * validated output contract, and a pure `run`. `runSimulation` has none of
 * that — it takes a deep partial of every module's parameters and returns
 * seventy-odd fields per year. This wrapper narrows both ends to what a study
 * actually varies and actually reads.
 *
 * Narrowing is the point, not an inconvenience. An ensemble over "any
 * parameter" is not a study; the input type here is the claim about which
 * parameters carry the uncertainty, and it should be short enough to defend.
 *
 * The distributions those parameters are drawn from live with the study, not
 * here — this file says what can vary, not how much.
 */

import {
  defineModel,
  defineEstimand,
  measurementPort,
  unitPort,
  type ModelDefinition,
} from 'tsimulation';
import { runSimulation, type SimulationParams, type RunOptions } from './simulation.js';

// =============================================================================
// ESTIMANDS
// =============================================================================

/**
 * Only outputs carry estimands.
 *
 * An estimand says what a number measures in the world. `warming2100`
 * estimates something observable in principle; `gamma` is a structural
 * constant of a production function and estimates nothing — giving it one
 * would be ceremony, not meaning. The sampled inputs are therefore plain unit
 * ports and this model runs `semanticValidation: 'if-present'`.
 */
const warmingEstimand = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'estimand.climate.global-mean-surface-warming-above-preindustrial',
  version: '1.0.0',
  quantityKind: 'climate.global-mean-surface-temperature-anomaly',
  measure: { kind: 'level' },
  population: {
    id: 'population.earth.surface',
    universe: 'Global mean near-surface air temperature.',
  },
  geography: { id: 'geo.global', boundaryVersion: 'whole-earth' },
  time: { kind: 'instant' },
  vintage: {
    basis: 'scenario-assumption',
    convention: 'Model-projected anomaly relative to the preindustrial baseline.',
  },
});

const gdpEstimand = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'estimand.economy.gross-world-product-annual',
  version: '1.0.0',
  quantityKind: 'economy.gross-product',
  measure: { kind: 'level', accounting: 'gross' },
  population: {
    id: 'population.world.economies',
    universe: 'All final goods and services produced worldwide in one year.',
  },
  geography: { id: 'geo.global', boundaryVersion: 'nine-region-aggregate' },
  // A flow: the year's output is the sum over the year, not a level sampled
  // at an instant.
  time: { kind: 'interval', interval: 'calendar-year', aggregation: 'sum' },
  vintage: {
    basis: 'scenario-assumption',
    convention: 'Model-projected, in constant trillions of dollars.',
  },
});

const emissionsEstimand = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'estimand.climate.peak-annual-co2-emissions',
  version: '1.0.0',
  quantityKind: 'climate.co2-emissions-flow',
  measure: { kind: 'level', accounting: 'gross' },
  population: {
    id: 'population.world.co2-sources',
    universe: 'Energy and land-use CO2 emissions represented by the model.',
  },
  geography: { id: 'geo.global', boundaryVersion: 'nine-region-aggregate' },
  // Emissions accumulate within a year; the peak is taken across years.
  time: { kind: 'interval', interval: 'calendar-year', aggregation: 'sum' },
  vintage: {
    basis: 'scenario-assumption',
    convention: 'Maximum over the projected horizon.',
  },
});

const fossilShareEstimand = defineEstimand({
  schemaVersion: 'tsimulation.estimand/v1',
  id: 'estimand.energy.fossil-share-of-electricity-generation',
  version: '1.0.0',
  quantityKind: 'electricity.generation-share-by-fuel-class',
  measure: { kind: 'share', totality: 'total' },
  population: {
    id: 'population.world.electricity-generation',
    universe: 'All electricity generation represented by the dispatch model.',
  },
  geography: { id: 'geo.global', boundaryVersion: 'nine-region-aggregate' },
  ratio: {
    numerator: 'fossil-fuelled generation',
    denominator: 'total generation',
  },
  // A ratio of two annual sums, so the share itself is a mean over the year
  // rather than something summed.
  time: { kind: 'interval', interval: 'calendar-year', aggregation: 'mean' },
  vintage: {
    basis: 'scenario-assumption',
    convention: 'Final projected year.',
  },
});

// =============================================================================
// INPUT
// =============================================================================

/**
 * The parameters a study may vary.
 *
 * Chosen from what `docs/SENSITIVITY.md` establishes by hand as dominant, plus
 * the two climate knobs whose scenario variants already exist. Every one is a
 * Tier-1 parameter with declared bounds in `describeParameters()`; the bounds
 * asserted below are those, so a draw outside them fails here rather than
 * producing a quietly meaningless run.
 *
 * Deliberately short. Adding a parameter means claiming its uncertainty
 * matters to the conclusions, which is a claim that needs a source.
 */
export interface EnergyEnsembleInput {
  /** Useful-energy exponent in the Ayres-Warr production function. */
  gamma: number;
  /**
   * Efficiency-engine strength; the model's dominant GDP-level dial.
   *
   * This is demand's multiplier, NOT production's `serviceEfficiencyGrowth`,
   * and the difference is not cosmetic. The efficiency engine is one series
   * with two views — demand's intensity decline and production's eta — coupled
   * in `runAutowiredSimulation`, which derives production's growth rate from
   * demand's whenever it is not given explicitly. Supplying
   * `serviceEfficiencyGrowth` directly wins over that coupling and re-splits
   * the two views, which is the failure CLAUDE.md and the coupling comment
   * both warn about.
   *
   * Measured on this model: varying the multiplier over the range the repo's
   * own scenarios use gives a 1.56x GDP-2100 span with warming FALLING as
   * efficiency rises. Varying `serviceEfficiencyGrowth` over a comparable
   * range gives a 3.25x span with warming RISING — an inflated sensitivity and
   * a sign-flipped climate response, from an artifact rather than the model.
   */
  efficiencyMultiplier: number;
  /** Equilibrium climate sensitivity, °C per CO2 doubling. */
  climateSensitivity: number;
  /** Temperature above which damages accelerate. */
  tippingThreshold: number;
  /** Wright's Law learning rate for solar. */
  solarLearningRate: number;
  /** Wright's Law learning rate for wind. */
  windLearningRate: number;
  /** Robot integration-cost exponent; the late-century automation dial. */
  robotIntegrationExponent: number;
}

/** Declared bounds, mirroring `describeParameters()`. */
export const ENERGY_ENSEMBLE_BOUNDS: Readonly<
  Record<keyof EnergyEnsembleInput, readonly [number, number]>
> = {
  gamma: [0.05, 0.7],
  // Not a declared Tier-1 bound: `efficiencyMultiplier` is programmatically
  // settable but absent from paramMeta. The range is the span the repo's own
  // ten scenarios already use (0.7 in tech-plateau through 1.5 in ssp1-19),
  // which is a stronger warrant than an interval invented here.
  efficiencyMultiplier: [0.7, 1.5],
  climateSensitivity: [2, 5],
  tippingThreshold: [1.5, 4],
  solarLearningRate: [0.1, 0.5],
  windLearningRate: [0.1, 0.4],
  robotIntegrationExponent: [0.3, 1.2],
};

/** Defaults, so a study can vary a subset and leave the rest calibrated. */
export const ENERGY_ENSEMBLE_DEFAULTS: Readonly<EnergyEnsembleInput> = {
  gamma: 0.55,
  efficiencyMultiplier: 1,
  climateSensitivity: 3,
  tippingThreshold: 2,
  solarLearningRate: 0.36,
  windLearningRate: 0.23,
  robotIntegrationExponent: 0.75,
};

/** Map the flat study vector onto the nested parameter tree the runner wants. */
export function toSimulationParams(input: EnergyEnsembleInput): SimulationParams {
  return {
    // Note what is NOT set here: production.serviceEfficiencyGrowth. Leaving it
    // undefined is what lets runAutowiredSimulation derive it from demand, so
    // both views of the efficiency series move together.
    production: { gamma: input.gamma },
    demand: {
      efficiencyMultiplier: input.efficiencyMultiplier,
      robotIntegrationExponent: input.robotIntegrationExponent,
    },
    energy: {
      sources: {
        solar: { alpha: input.solarLearningRate },
        wind: { alpha: input.windLearningRate },
      },
    } as SimulationParams['energy'],
    climate: {
      sensitivity: input.climateSensitivity,
      tippingThreshold: input.tippingThreshold,
    },
  };
}

// =============================================================================
// OUTPUT
// =============================================================================

/** What a study reads back. Macro only — the diagnostic ledgers do not run. */
export interface EnergyEnsembleOutput {
  warming2050: number;
  warming2100: number;
  gdp2050: number;
  gdp2100: number;
  peakEmissions: number;
  fossilShareFinal: number;
}

/**
 * Engine settings for a study run.
 *
 * Diagnostics off because no metric above reads them, and the two validation
 * switches off because a study runs the same wiring thousands of times after
 * a representative run has already passed it. Together roughly 4x; see #63,
 * #66 and #68.
 */
const STUDY_OPTIONS = {
  diagnostics: false,
  connectorValidation: 'off',
  paramLiveness: 'off',
} as const satisfies RunOptions;

export const energyEnsembleModel: ModelDefinition<
  EnergyEnsembleInput,
  EnergyEnsembleOutput
> = defineModel({
  id: 'overlapping-generations-energy',
  version: '1.0.0',
  description:
    'The 2025-2100 energy/demographics/climate model, narrowed to the parameters a ' +
    'study varies and the macro metrics it reads.',
  inputPorts: {
    gamma: unitPort('fraction'),
    efficiencyMultiplier: unitPort('fraction'),
    climateSensitivity: unitPort('Δ°C'),
    tippingThreshold: unitPort('Δ°C'),
    solarLearningRate: unitPort('fraction'),
    windLearningRate: unitPort('fraction'),
    robotIntegrationExponent: unitPort('fraction'),
  },
  outputPorts: {
    warming2050: measurementPort('Δ°C', warmingEstimand, 'number'),
    warming2100: measurementPort('Δ°C', warmingEstimand, 'number'),
    gdp2050: measurementPort('$T/year', gdpEstimand, 'number'),
    gdp2100: measurementPort('$T/year', gdpEstimand, 'number'),
    peakEmissions: measurementPort('GtCO2/year', emissionsEstimand, 'number'),
    fossilShareFinal: measurementPort('fraction', fossilShareEstimand, 'number'),
  },
  semanticValidation: 'if-present',
  validateInput: (input) => {
    for (const [name, [low, high]] of Object.entries(ENERGY_ENSEMBLE_BOUNDS)) {
      const value = input[name as keyof EnergyEnsembleInput];
      if (!Number.isFinite(value)) {
        throw new Error(`Ensemble input '${name}' must be finite, got ${value}`);
      }
      if (value < low || value > high) {
        throw new Error(
          `Ensemble input '${name}' = ${value} is outside its declared range [${low}, ${high}]`,
        );
      }
    }
  },
  invariants: [
    {
      id: 'warming-is-monotone-in-time',
      description: 'Projected warming in 2100 is at least the 2050 level.',
      check: (output) => output.warming2100 >= output.warming2050,
    },
    {
      id: 'fossil-share-is-a-share',
      description: 'The final fossil share lies in [0, 1].',
      check: (output) => output.fossilShareFinal >= 0 && output.fossilShareFinal <= 1,
    },
  ],
  run: (input) => {
    const { metrics } = runSimulation(toSimulationParams(input), STUDY_OPTIONS);
    return {
      warming2050: metrics.warming2050,
      warming2100: metrics.warming2100,
      gdp2050: metrics.gdp2050,
      gdp2100: metrics.gdp2100,
      peakEmissions: metrics.peakEmissions,
      fossilShareFinal: metrics.fossilShareFinal,
    };
  },
});

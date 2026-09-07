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
import { describeParameters, buildMultiParams } from './introspection.js';

/**
 * Feasibility floor for `robotIntegrationExponent`; see ENERGY_ENSEMBLE_BOUNDS.
 * Set above the divergence at ~0.385 and clear of the pathological band above
 * it, verified by the corner sweep in `ensemble-model.test.ts`.
 */
const ROBOT_EXPONENT_FLOOR = 0.55;

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
 * the two climate knobs whose scenario variants already exist. Six are Tier-1
 * parameters and take their bounds from `describeParameters()`;
 * `efficiencyMultiplier` is not Tier-1 and `robotIntegrationExponent` is
 * narrowed for feasibility — both documented at `ENERGY_ENSEMBLE_BOUNDS`.
 * A draw outside its bound fails here rather than producing a quietly
 * meaningless run.
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
   * Measured on this model over [0.7, 1.5], the scenario span this input uses.
   * Coupled: gdp2100 1211 -> 2814 ($T), a 2.32x span, with warming FALLING
   * 2.700 -> 2.593 as efficiency rises — the physics, since less energy per
   * unit of service means fewer emissions. Scaling `serviceEfficiencyGrowth`
   * by the same ratio instead: gdp2100 597 -> 3591, a 6.02x span, with warming
   * RISING 2.592 -> 2.889. Two and a half times the apparent GDP sensitivity
   * and an inverted climate response, both artifacts of the re-split.
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

/**
 * Which Tier-1 parameter each study input drives.
 *
 * One map does three jobs: it builds the nested parameter tree through
 * `buildMultiParams`, and it derives the bounds and defaults below from
 * `describeParameters()` so neither can drift from the model's own declarations.
 * A previous change in this series was bitten by exactly that drift.
 */
const TIER1_NAMES = {
  gamma: 'gamma',
  climateSensitivity: 'climateSensitivity',
  tippingThreshold: 'tippingThreshold',
  solarLearningRate: 'solarAlpha',
  windLearningRate: 'windAlpha',
  robotIntegrationExponent: 'robotIntegrationExponent',
} as const satisfies Partial<Record<keyof EnergyEnsembleInput, string>>;

const SCHEMA = describeParameters();

function tier1Bound(name: string): readonly [number, number] {
  const info = SCHEMA[name];
  if (!info || info.min === undefined || info.max === undefined) {
    throw new Error(`Tier-1 parameter '${name}' has no declared bounds`);
  }
  return [info.min, info.max];
}

/**
 * The range each input may be drawn from.
 *
 * Derived from `describeParameters()` except where a comment says otherwise.
 * Two exceptions, both narrower than the model's declared range and both
 * deliberate:
 *
 * `efficiencyMultiplier` has no Tier-1 entry at all — it is programmatically
 * settable but absent from `paramMeta`, and `demandModule.validate` has no
 * rule for it either, so this is the only bound on it anywhere in the repo.
 * The range is the span the repo's own ten scenarios use: 0.7 in `ssp5-85`
 * through 1.5 in `ssp1-19`.
 *
 * `robotIntegrationExponent` is FEASIBILITY-NARROWED. Its Tier-1 range starts
 * at 0.3, but the model diverges below ~0.385 — `demand.energyBurden` reaches
 * Infinity before 2100 and the run aborts — and just above that cliff the
 * results are pathological rather than merely extreme: gdp2100 runs
 * 747 -> 420 -> 580 -> 2212 -> 2609 over theta 0.385 to 0.5, a 6x
 * non-monotonic swing driven by the asymptote rather than by the mechanism.
 * A study sampling uniformly from 0.3 would abort within a few dozen draws,
 * and one sampling from just above the cliff would report the cliff.
 */
export const ENERGY_ENSEMBLE_BOUNDS: Readonly<
  Record<keyof EnergyEnsembleInput, readonly [number, number]>
> = {
  gamma: tier1Bound(TIER1_NAMES.gamma),
  efficiencyMultiplier: [0.7, 1.5],
  climateSensitivity: tier1Bound(TIER1_NAMES.climateSensitivity),
  tippingThreshold: tier1Bound(TIER1_NAMES.tippingThreshold),
  solarLearningRate: tier1Bound(TIER1_NAMES.solarLearningRate),
  windLearningRate: tier1Bound(TIER1_NAMES.windLearningRate),
  robotIntegrationExponent: [ROBOT_EXPONENT_FLOOR, tier1Bound(TIER1_NAMES.robotIntegrationExponent)[1]],
};

/** Defaults, so a study can vary a subset and leave the rest calibrated. */
export const ENERGY_ENSEMBLE_DEFAULTS: Readonly<EnergyEnsembleInput> = {
  gamma: SCHEMA[TIER1_NAMES.gamma].default as number,
  efficiencyMultiplier: 1,
  climateSensitivity: SCHEMA[TIER1_NAMES.climateSensitivity].default as number,
  tippingThreshold: SCHEMA[TIER1_NAMES.tippingThreshold].default as number,
  solarLearningRate: SCHEMA[TIER1_NAMES.solarLearningRate].default as number,
  windLearningRate: SCHEMA[TIER1_NAMES.windLearningRate].default as number,
  robotIntegrationExponent: SCHEMA[TIER1_NAMES.robotIntegrationExponent].default as number,
};

/** Map the flat study vector onto the nested parameter tree the runner wants. */
export function toSimulationParams(input: EnergyEnsembleInput): SimulationParams {
  const tier1 = Object.fromEntries(
    Object.entries(TIER1_NAMES).map(([field, name]) => [
      name,
      input[field as keyof EnergyEnsembleInput],
    ]),
  );
  // Note what is NOT set: production.serviceEfficiencyGrowth. Leaving it
  // undefined is what lets runAutowiredSimulation derive it from demand, so
  // both views of the one efficiency series move together.
  const params = buildMultiParams(tier1) as SimulationParams;
  return {
    ...params,
    demand: { ...params.demand, efficiencyMultiplier: input.efficiencyMultiplier },
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
export const STUDY_OPTIONS = {
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

import type { ModelDefinition, ModelRun } from './model.js';
import { runModel } from './model.js';
import {
  experimentInterpretation,
  validateExperiment,
  type ExperimentContract,
  type ExperimentResultInterpretation,
} from './study.js';

export interface ScenarioCase<TInput> {
  id: string;
  label?: string;
  input: TInput;
}

export interface ScenarioRun<TInput, TOutput> extends ScenarioCase<TInput> {
  run: ModelRun<TInput, TOutput>;
  experiment?: ExperimentContract;
  interpretation: ExperimentResultInterpretation;
}

export function runScenarios<TInput, TOutput>(
  model: ModelDefinition<TInput, TOutput>,
  scenarios: readonly ScenarioCase<TInput>[],
  experiment?: ExperimentContract,
): ScenarioRun<TInput, TOutput>[] {
  if (experiment) validateExperiment(experiment);
  const interpretation = experimentInterpretation(experiment);
  const ids = new Set<string>();
  return scenarios.map((scenario) => {
    if (ids.has(scenario.id)) throw new Error(`Duplicate scenario ID '${scenario.id}'`);
    ids.add(scenario.id);
    return {
      ...scenario,
      run: runModel(model, scenario.input, { runLabel: scenario.id }),
      ...(experiment ? { experiment } : {}),
      interpretation,
    };
  });
}

export interface FactorLevel<TInput> {
  id: string;
  label?: string;
  apply: (input: TInput) => TInput;
}

export type FactorDefinitions<TInput> = Readonly<Record<string, readonly FactorLevel<TInput>[]>>;

export interface FactorialCell<TInput, TOutput> {
  id: string;
  levels: Readonly<Record<string, string>>;
  input: TInput;
  run: ModelRun<TInput, TOutput>;
}

export interface FactorialExperiment<TInput, TOutput> {
  factorNames: string[];
  cells: FactorialCell<TInput, TOutput>[];
  experiment?: ExperimentContract;
  interpretation: ExperimentResultInterpretation;
}

export function runFactorial<TInput, TOutput>(options: {
  model: ModelDefinition<TInput, TOutput>;
  baseInput: TInput;
  factors: FactorDefinitions<TInput>;
  experiment?: ExperimentContract;
}): FactorialExperiment<TInput, TOutput> {
  if (options.experiment) validateExperiment(options.experiment);
  const factorNames = Object.keys(options.factors);
  const cells: FactorialCell<TInput, TOutput>[] = [];
  const visit = (index: number, input: TInput, levels: Record<string, string>): void => {
    if (index === factorNames.length) {
      const id = factorNames.map((name) => `${name}=${levels[name]}`).join(',');
      cells.push({
        id,
        levels: { ...levels },
        input,
        run: runModel(options.model, input, { runLabel: id }),
      });
      return;
    }
    const factor = factorNames[index];
    const factorLevels = options.factors[factor];
    if (!factorLevels || factorLevels.length < 1) {
      throw new Error(`Factor '${factor}' has no levels`);
    }
    const ids = new Set<string>();
    for (const level of factorLevels) {
      if (ids.has(level.id)) throw new Error(`Factor '${factor}' has duplicate level '${level.id}'`);
      ids.add(level.id);
      visit(index + 1, level.apply(structuredClone(input)), { ...levels, [factor]: level.id });
    }
  };
  visit(0, structuredClone(options.baseInput), {});
  return {
    factorNames,
    cells,
    ...(options.experiment ? { experiment: options.experiment } : {}),
    interpretation: experimentInterpretation(options.experiment),
  };
}

export interface TwoFactorInteraction {
  control: number;
  factorAOnly: number;
  factorBOnly: number;
  combined: number;
  effectAAtControlB: number;
  effectAAtTreatedB: number;
  interaction: number;
}

export function twoFactorInteraction<TInput, TOutput>(options: {
  experiment: FactorialExperiment<TInput, TOutput>;
  factorA: string;
  factorB: string;
  controlA: string;
  treatmentA: string;
  controlB: string;
  treatmentB: string;
  outcome: (output: TOutput) => number;
  /**
   * Required for experiments with additional factors unless marginalize is
   * selected. Every non-A/B factor must have an explicit conditioning level.
   */
  conditionOn?: Readonly<Record<string, string>>;
  /** Average the four A×B cells over all matched levels of other factors. */
  marginalize?: 'mean';
}): TwoFactorInteraction {
  if (!options.experiment.factorNames.includes(options.factorA) ||
      !options.experiment.factorNames.includes(options.factorB) ||
      options.factorA === options.factorB) {
    throw new Error('twoFactorInteraction requires two distinct experiment factors');
  }
  const otherFactors = options.experiment.factorNames.filter(
    (factor) => factor !== options.factorA && factor !== options.factorB,
  );
  if (options.conditionOn && options.marginalize) {
    throw new Error('Choose conditionOn or marginalize, not both');
  }
  if (
    otherFactors.length > 0 &&
    !options.marginalize &&
    !otherFactors.every((factor) => options.conditionOn?.[factor] !== undefined)
  ) {
    throw new Error(
      `Two-factor interaction is ambiguous with additional factors ` +
      `[${otherFactors.join(', ')}]; supply conditionOn or marginalize: 'mean'`,
    );
  }
  for (const factor of Object.keys(options.conditionOn ?? {})) {
    if (!otherFactors.includes(factor)) {
      throw new Error(`conditionOn references non-extra factor '${factor}'`);
    }
  }
  const fullCellKeys = new Set<string>();
  for (const cell of options.experiment.cells) {
    const key = options.experiment.factorNames
      .map((factor) => `${factor}=${cell.levels[factor]}`)
      .join(',');
    if (fullCellKeys.has(key)) {
      throw new Error(`Factorial experiment has duplicate cell '${key}'`);
    }
    fullCellKeys.add(key);
  }
  if (options.marginalize && otherFactors.length > 0) {
    const support = (a: string, b: string): string[] =>
      options.experiment.cells
        .filter((cell) =>
          cell.levels[options.factorA] === a &&
          cell.levels[options.factorB] === b
        )
        .map((cell) =>
          otherFactors
            .map((factor) => `${factor}=${cell.levels[factor]}`)
            .join(','),
        )
        .sort();
    const supports = [
      support(options.controlA, options.controlB),
      support(options.treatmentA, options.controlB),
      support(options.controlA, options.treatmentB),
      support(options.treatmentA, options.treatmentB),
    ];
    if (
      supports[0].length === 0 ||
      supports.some(
        (candidate) =>
          candidate.length !== supports[0].length ||
          candidate.some((value, index) => value !== supports[0][index]),
      )
    ) {
      throw new Error(
        'Cannot marginalize a two-factor interaction over unbalanced extra-factor support',
      );
    }
  }
  const find = (a: string, b: string): number => {
    const cells = options.experiment.cells.filter((candidate) =>
      candidate.levels[options.factorA] === a &&
      candidate.levels[options.factorB] === b &&
      otherFactors.every((factor) =>
        options.marginalize ||
        candidate.levels[factor] === options.conditionOn?.[factor]
      ),
    );
    if (cells.length === 0) {
      throw new Error(`Missing factorial cell ${options.factorA}=${a}, ${options.factorB}=${b}`);
    }
    const values = cells.map((cell) => options.outcome(cell.run.output));
    if (values.some((value) => !Number.isFinite(value))) {
      throw new Error('Factorial outcome must be finite');
    }
    if (!options.marginalize && values.length !== 1) {
      throw new Error(
        `Conditioned factorial cell is not unique for ` +
        `${options.factorA}=${a}, ${options.factorB}=${b}`,
      );
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };
  const control = find(options.controlA, options.controlB);
  const factorAOnly = find(options.treatmentA, options.controlB);
  const factorBOnly = find(options.controlA, options.treatmentB);
  const combined = find(options.treatmentA, options.treatmentB);
  return {
    control,
    factorAOnly,
    factorBOnly,
    combined,
    effectAAtControlB: factorAOnly - control,
    effectAAtTreatedB: combined - factorBOnly,
    interaction: combined - factorAOnly - factorBOnly + control,
  };
}

export interface SweepPoint<TInput> {
  id: string;
  value: number;
  input: TInput;
}

export interface SweepResult<TInput, TOutput> extends SweepPoint<TInput> {
  run: ModelRun<TInput, TOutput>;
  experiment?: ExperimentContract;
  interpretation: ExperimentResultInterpretation;
}

export function runSweep<TInput, TOutput>(
  model: ModelDefinition<TInput, TOutput>,
  points: readonly SweepPoint<TInput>[],
  experiment?: ExperimentContract,
): SweepResult<TInput, TOutput>[] {
  return runScenarios(
    model,
    points.map(({ id, input }) => ({ id, input })),
    experiment,
  ).map((row, index) => ({
    ...points[index],
    run: row.run,
    ...(row.experiment ? { experiment: row.experiment } : {}),
    interpretation: row.interpretation,
  }));
}

export interface ThresholdResult {
  found: boolean;
  lower: number;
  upper: number;
  estimate: number | null;
  iterations: number;
  lowerOutcome: number;
  upperOutcome: number;
  experiment?: ExperimentContract;
  interpretation: ExperimentResultInterpretation;
}

/** Bisection for a monotonic outcome crossing a target. */
export function findThreshold(options: {
  lower: number;
  upper: number;
  target: number;
  evaluate: (value: number) => number;
  tolerance?: number;
  maxIterations?: number;
  direction?: 'increasing' | 'decreasing';
  experiment?: ExperimentContract;
}): ThresholdResult {
  if (options.experiment) validateExperiment(options.experiment);
  const metadata = {
    ...(options.experiment ? { experiment: options.experiment } : {}),
    interpretation: experimentInterpretation(options.experiment),
  };
  const tolerance = options.tolerance ?? 1e-6;
  const maxIterations = options.maxIterations ?? 100;
  if (!(options.upper > options.lower)) throw new Error('Threshold upper must exceed lower');
  if (!(tolerance > 0) || !Number.isFinite(tolerance)) throw new Error('Threshold tolerance must be positive');
  const direction = options.direction ?? 'increasing';
  let lower = options.lower;
  let upper = options.upper;
  let lowerOutcome = options.evaluate(lower);
  let upperOutcome = options.evaluate(upper);
  if (![lowerOutcome, upperOutcome, options.target].every(Number.isFinite)) {
    throw new Error('Threshold outcomes and target must be finite');
  }
  const signed = (outcome: number): number =>
    (direction === 'increasing' ? 1 : -1) * (outcome - options.target);
  if (signed(lowerOutcome) > 0 || signed(upperOutcome) < 0) {
    return {
      found: false,
      lower,
      upper,
      estimate: null,
      iterations: 0,
      lowerOutcome,
      upperOutcome,
      ...metadata,
    };
  }
  let iterations = 0;
  while (upper - lower > tolerance && iterations < maxIterations) {
    iterations++;
    const middle = (lower + upper) / 2;
    const outcome = options.evaluate(middle);
    if (!Number.isFinite(outcome)) throw new Error(`Threshold outcome is non-finite at ${middle}`);
    if (signed(outcome) >= 0) {
      upper = middle;
      upperOutcome = outcome;
    } else {
      lower = middle;
      lowerOutcome = outcome;
    }
  }
  return {
    found: true,
    lower,
    upper,
    estimate: (lower + upper) / 2,
    iterations,
    lowerOutcome,
    upperOutcome,
    ...metadata,
  };
}

export interface ParameterEffect<TInput> {
  id: string;
  input: TInput;
}

export interface ParameterEffectAudit {
  id: string;
  changedMetrics: string[];
  inert: boolean;
  deltas: Record<string, number>;
  experiment?: ExperimentContract;
  interpretation: ExperimentResultInterpretation;
}

export function auditParameterEffects<TInput, TOutput>(options: {
  model: ModelDefinition<TInput, TOutput>;
  baseline: TInput;
  variants: readonly ParameterEffect<TInput>[];
  metrics: Readonly<Record<string, (output: TOutput) => number>>;
  tolerance?: number;
  experiment?: ExperimentContract;
}): ParameterEffectAudit[] {
  if (options.experiment) validateExperiment(options.experiment);
  const interpretation = experimentInterpretation(options.experiment);
  const tolerance = options.tolerance ?? 1e-12;
  const baseline = runModel(options.model, options.baseline).output;
  return options.variants.map((variant) => {
    const output = runModel(options.model, variant.input, { runLabel: variant.id }).output;
    const deltas = Object.fromEntries(Object.entries(options.metrics).map(([name, metric]) => {
      const delta = metric(output) - metric(baseline);
      if (!Number.isFinite(delta)) throw new Error(`Parameter audit metric '${name}' is non-finite`);
      return [name, delta];
    }));
    const changedMetrics = Object.entries(deltas)
      .filter(([, delta]) => Math.abs(delta) > tolerance)
      .map(([name]) => name);
    return {
      id: variant.id,
      changedMetrics,
      inert: changedMetrics.length === 0,
      deltas,
      ...(options.experiment ? { experiment: options.experiment } : {}),
      interpretation,
    };
  });
}

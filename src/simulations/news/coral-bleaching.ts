import { assertFiniteDeep, validateNumber } from 'tsimulation';

import {
  coralHistory,
  type CoralHistoryRow,
} from './coral-data.js';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const logistic = (value: number): number => 1 / (1 + Math.exp(-value));

const logit = (value: number): number => {
  const bounded = clamp(value, 0.005, 0.995);
  return Math.log(bounded / (1 - bounded));
};

export interface CoralBleachingParamsV1 {
  intercept: number;
  laggedEnsoCoefficient: number;
}

export interface CoralBleachingParamsV2 extends CoralBleachingParamsV1 {
  oceanWarmingCoefficient: number;
  earlyRecordOceanAnomalyC: number;
}

export interface CoralBleachingYearInput {
  year: number;
  oceanAnomalyC: number;
  maxOniC: number;
  observedBleachingExtent: number | null;
}

export interface CoralBleachingScenario {
  id: string;
  label: string;
  priorYearMaxOniC: number;
  years: readonly CoralBleachingYearInput[];
  paramsV1: CoralBleachingParamsV1;
  paramsV2: CoralBleachingParamsV2;
}

export interface CoralBleachingYearResult {
  year: number;
  oceanAnomalyC: number;
  maxOniC: number;
  laggedPositiveEnsoC: number;
  observedBleachingExtent: number | null;
  predictedBleachingExtent: number;
  earlyRecordBaselineCounterfactualExtent: number;
  neutralEnsoCounterfactualExtent: number;
  conditionalRecentWarmingContributionPctPoints: number;
  conditionalEnsoContributionPctPoints: number;
}

export interface CoralBleachingResult {
  scenario: CoralBleachingScenario;
  revision: 'enso-only-v1' | 'warming-and-enso-v2';
  years: CoralBleachingYearResult[];
}

export interface CoralBacktestScore {
  meanAbsoluteError: number;
  rootMeanSquaredError: number;
  observations: number;
}

export interface CoralCalibration {
  developmentThroughYear: number;
  paramsV1: CoralBleachingParamsV1;
  paramsV2: CoralBleachingParamsV2;
  developmentV1: CoralBacktestScore;
  developmentV2: CoralBacktestScore;
  holdoutV1: CoralBacktestScore;
  holdoutV2: CoralBacktestScore;
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const augmented = matrix.map((row, index) => [...row, vector[index] as number]);
  for (let column = 0; column < augmented.length; column++) {
    let pivot = column;
    for (let row = column + 1; row < augmented.length; row++) {
      if (
        Math.abs(augmented[row]?.[column] ?? 0) >
        Math.abs(augmented[pivot]?.[column] ?? 0)
      ) {
        pivot = row;
      }
    }
    [augmented[column], augmented[pivot]] = [
      augmented[pivot] as number[],
      augmented[column] as number[],
    ];
    const pivotValue = augmented[column]?.[column] ?? 0;
    if (Math.abs(pivotValue) < 1e-12) {
      throw new Error('Coral calibration design matrix is singular');
    }
    for (let row = column + 1; row < augmented.length; row++) {
      const factor = (augmented[row]?.[column] ?? 0) / pivotValue;
      for (let index = column; index <= augmented.length; index++) {
        const current = augmented[row]?.[index] ?? 0;
        const pivotCell = augmented[column]?.[index] ?? 0;
        (augmented[row] as number[])[index] = current - factor * pivotCell;
      }
    }
  }

  const solution = Array<number>(augmented.length).fill(0);
  for (let row = augmented.length - 1; row >= 0; row--) {
    let residual = augmented[row]?.[augmented.length] ?? 0;
    for (let column = row + 1; column < augmented.length; column++) {
      residual -=
        (augmented[row]?.[column] ?? 0) * (solution[column] ?? 0);
    }
    solution[row] = residual / (augmented[row]?.[row] ?? 1);
  }
  return solution;
}

function fitLogitRegression(
  rows: ReadonlyArray<{
    features: readonly number[];
    observed: number;
  }>,
): number[] {
  const size = rows[0]?.features.length ?? 0;
  if (size === 0 || rows.length < size) {
    throw new Error('Insufficient coral observations for calibration');
  }
  const normal = Array.from(
    { length: size },
    () => Array<number>(size).fill(0),
  );
  const target = Array<number>(size).fill(0);
  for (const row of rows) {
    const transformed = logit(row.observed);
    row.features.forEach((left, leftIndex) => {
      target[leftIndex] = (target[leftIndex] ?? 0) + left * transformed;
      row.features.forEach((right, rightIndex) => {
        (normal[leftIndex] as number[])[rightIndex] =
          (normal[leftIndex]?.[rightIndex] ?? 0) + left * right;
      });
    });
  }
  // Tiny ridge term protects the generic routine without materially changing
  // this well-conditioned three-column fit.
  for (let index = 0; index < size; index++) {
    (normal[index] as number[])[index] =
      (normal[index]?.[index] ?? 0) + 1e-9;
  }
  return solveLinearSystem(normal, target);
}

function historyWithLag(
  history: readonly CoralHistoryRow[],
): Array<CoralHistoryRow & { laggedPositiveEnsoC: number }> {
  const byYear = new Map(history.map((row) => [row.year, row]));
  return history
    .filter((row) => byYear.has(row.year - 1))
    .map((row) => ({
      ...row,
      laggedPositiveEnsoC: Math.max(
        0,
        byYear.get(row.year - 1)?.maxOniC ?? 0,
      ),
    }));
}

function scoreRows(
  rows: ReadonlyArray<CoralHistoryRow & { laggedPositiveEnsoC: number }>,
  predict: (
    row: CoralHistoryRow & { laggedPositiveEnsoC: number },
  ) => number,
): CoralBacktestScore {
  if (rows.length === 0) {
    return { meanAbsoluteError: 0, rootMeanSquaredError: 0, observations: 0 };
  }
  let absoluteError = 0;
  let squaredError = 0;
  for (const row of rows) {
    const error = predict(row) - row.observedBleachingExtent;
    absoluteError += Math.abs(error);
    squaredError += error * error;
  }
  return {
    meanAbsoluteError: absoluteError / rows.length,
    rootMeanSquaredError: Math.sqrt(squaredError / rows.length),
    observations: rows.length,
  };
}

/**
 * Fit both revisions only through a declared year and report a frozen later
 * holdout. V1 uses ENSO alone; V2 adds the slowly changing ocean baseline.
 */
export function calibrateCoralBleaching(
  history: readonly CoralHistoryRow[] = coralHistory,
  developmentThroughYear = 2017,
): CoralCalibration {
  const lagged = historyWithLag(history);
  const development = lagged.filter(
    (row) => row.year <= developmentThroughYear,
  );
  const holdout = lagged.filter((row) => row.year > developmentThroughYear);

  const v1Coefficients = fitLogitRegression(
    development.map((row) => ({
      features: [1, row.laggedPositiveEnsoC],
      observed: row.observedBleachingExtent,
    })),
  );
  const v2Coefficients = fitLogitRegression(
    development.map((row) => ({
      features: [1, row.oceanAnomalyC, row.laggedPositiveEnsoC],
      observed: row.observedBleachingExtent,
    })),
  );
  const paramsV1: CoralBleachingParamsV1 = {
    intercept: v1Coefficients[0] as number,
    laggedEnsoCoefficient: v1Coefficients[1] as number,
  };
  const paramsV2: CoralBleachingParamsV2 = {
    intercept: v2Coefficients[0] as number,
    oceanWarmingCoefficient: v2Coefficients[1] as number,
    laggedEnsoCoefficient: v2Coefficients[2] as number,
    earlyRecordOceanAnomalyC:
      history
        .filter((row) => row.year >= 1986 && row.year <= 1995)
        .reduce((sum, row) => sum + row.oceanAnomalyC, 0) /
      history.filter((row) => row.year >= 1986 && row.year <= 1995).length,
  };
  const predictV1 = (
    row: CoralHistoryRow & { laggedPositiveEnsoC: number },
  ): number =>
    logistic(
      paramsV1.intercept +
        paramsV1.laggedEnsoCoefficient * row.laggedPositiveEnsoC,
    );
  const predictV2 = (
    row: CoralHistoryRow & { laggedPositiveEnsoC: number },
  ): number =>
    logistic(
      paramsV2.intercept +
        paramsV2.oceanWarmingCoefficient * row.oceanAnomalyC +
        paramsV2.laggedEnsoCoefficient * row.laggedPositiveEnsoC,
    );

  const result: CoralCalibration = {
    developmentThroughYear,
    paramsV1,
    paramsV2,
    developmentV1: scoreRows(development, predictV1),
    developmentV2: scoreRows(development, predictV2),
    holdoutV1: scoreRows(holdout, predictV1),
    holdoutV2: scoreRows(holdout, predictV2),
  };
  assertFiniteDeep(result, 'coral calibration');
  return result;
}

function validateScenario(scenario: CoralBleachingScenario): void {
  assertFiniteDeep(scenario, 'coral-bleaching scenario');
  const errors = [
    ...validateNumber(scenario.years.length, 'years.length', {
      min: 1,
    }),
  ];
  scenario.years.forEach((row, index) => {
    errors.push(
      ...validateNumber(row.oceanAnomalyC, `years[${index}].oceanAnomalyC`, {
        min: -5,
        max: 5,
      }),
      ...validateNumber(row.maxOniC, `years[${index}].maxOniC`, {
        min: -5,
        max: 5,
      }),
    );
    if (row.observedBleachingExtent !== null) {
      errors.push(
        ...validateNumber(
          row.observedBleachingExtent,
          `years[${index}].observedBleachingExtent`,
          { min: 0, max: 1 },
        ),
      );
    }
  });
  if (errors.length > 0) {
    throw new Error(`Invalid coral-bleaching scenario:\n  ${errors.join('\n  ')}`);
  }
}

function runCoralScenario(
  scenario: CoralBleachingScenario,
  revision: CoralBleachingResult['revision'],
): CoralBleachingResult {
  validateScenario(scenario);
  let priorYearMaxOniC = scenario.priorYearMaxOniC;
  const years = scenario.years.map((input): CoralBleachingYearResult => {
    const laggedPositiveEnsoC = Math.max(0, priorYearMaxOniC);
    priorYearMaxOniC = input.maxOniC;

    const params =
      revision === 'enso-only-v1' ? scenario.paramsV1 : scenario.paramsV2;
    const warmingTerm =
      revision === 'warming-and-enso-v2'
        ? scenario.paramsV2.oceanWarmingCoefficient * input.oceanAnomalyC
        : 0;
    const factualLogit =
      params.intercept +
      warmingTerm +
      params.laggedEnsoCoefficient * laggedPositiveEnsoC;
    const earlyRecordBaselineLogit =
      params.intercept +
      (
        revision === 'warming-and-enso-v2'
          ? scenario.paramsV2.oceanWarmingCoefficient *
            scenario.paramsV2.earlyRecordOceanAnomalyC
          : 0
      ) +
      params.laggedEnsoCoefficient * laggedPositiveEnsoC;
    const neutralEnsoLogit =
      params.intercept + warmingTerm;
    const predictedBleachingExtent = logistic(factualLogit);
    const earlyRecordBaselineCounterfactualExtent = logistic(
      earlyRecordBaselineLogit,
    );
    const neutralEnsoCounterfactualExtent = logistic(neutralEnsoLogit);

    return {
      year: input.year,
      oceanAnomalyC: input.oceanAnomalyC,
      maxOniC: input.maxOniC,
      laggedPositiveEnsoC,
      observedBleachingExtent: input.observedBleachingExtent,
      predictedBleachingExtent,
      earlyRecordBaselineCounterfactualExtent,
      neutralEnsoCounterfactualExtent,
      conditionalRecentWarmingContributionPctPoints:
        100 *
        (predictedBleachingExtent -
          earlyRecordBaselineCounterfactualExtent),
      conditionalEnsoContributionPctPoints:
        100 * (predictedBleachingExtent - neutralEnsoCounterfactualExtent),
    };
  });
  const result: CoralBleachingResult = { scenario, revision, years };
  assertFiniteDeep(result, `coral ${revision} result`);
  return result;
}

export function simulateCoralBleachingV1(
  scenario: CoralBleachingScenario,
): CoralBleachingResult {
  return runCoralScenario(scenario, 'enso-only-v1');
}

export function simulateCoralBleachingV2(
  scenario: CoralBleachingScenario,
): CoralBleachingResult {
  return runCoralScenario(scenario, 'warming-and-enso-v2');
}

const coralCalibration = calibrateCoralBleaching();

export const coralBleachingScenarios = {
  holdout: {
    id: 'holdout',
    label: 'Frozen 2018–2025 NOAA holdout',
    priorYearMaxOniC:
      coralHistory.find((row) => row.year === 2017)?.maxOniC ?? 0,
    years: coralHistory
      .filter((row) => row.year >= 2018)
      .map((row) => ({ ...row })),
    paramsV1: coralCalibration.paramsV1,
    paramsV2: coralCalibration.paramsV2,
  },
  'current-outlook': {
    id: 'current-outlook',
    label: '2026–2027 current warming and El Niño outlook',
    priorYearMaxOniC: 0.02,
    years: [
      {
        year: 2026,
        oceanAnomalyC: 1.00,
        maxOniC: 2.10,
        observedBleachingExtent: null,
      },
      {
        year: 2027,
        oceanAnomalyC: 1.02,
        maxOniC: 0.50,
        observedBleachingExtent: null,
      },
    ],
    paramsV1: coralCalibration.paramsV1,
    paramsV2: coralCalibration.paramsV2,
  },
} as const satisfies Readonly<Record<string, CoralBleachingScenario>>;

import { validateEstimand, type EstimandContract } from './semantics.js';
import { stableStringify } from './serialization.js';

export type ExperimentIntent =
  | 'scenario'
  | 'stress-test'
  | 'sensitivity'
  | 'design-space'
  | 'aleatory-uncertainty'
  | 'epistemic-uncertainty'
  | 'mixed-uncertainty';

export type ExperimentVariableRole =
  | 'constant'
  | 'state'
  | 'decision-lever'
  | 'aleatory'
  | 'epistemic'
  | 'structural';

export type DistributionFamily =
  | 'uniform'
  | 'normal'
  | 'lognormal'
  | 'triangular'
  | 'beta'
  | 'poisson'
  | 'binomial'
  | (string & {});

export type ExperimentDomain =
  | {
      kind: 'cases';
      values: readonly unknown[];
    }
  | {
      /** Possibility interval: it carries no probability density. */
      kind: 'interval';
      lower: number;
      upper: number;
    }
  | {
      kind: 'set';
      values: readonly unknown[];
    }
  | {
      kind: 'distribution';
      family: DistributionFamily;
      parameters: Readonly<Record<string, number>>;
    }
  | {
      kind: 'empirical-distribution';
      values: readonly number[];
      weights: readonly number[];
    }
  | {
      /** Explicit subjective belief, kept distinct from objective variability. */
      kind: 'subjective-distribution';
      family: DistributionFamily;
      parameters: Readonly<Record<string, number>>;
      rationale: string;
    };

export interface ExperimentVariableContract {
  id: string;
  /** Optional dot path in the model input object. */
  path?: string;
  role: ExperimentVariableRole;
  domain: ExperimentDomain;
  unit?: string;
  estimand?: EstimandContract;
  description?: string;
}

export type DependenceContract =
  | {
      kind: 'independent';
      variables: readonly string[];
    }
  | {
      kind: 'correlation';
      variables: readonly string[];
      matrix: readonly (readonly number[])[];
    }
  | {
      kind: 'custom';
      variables: readonly string[];
      description: string;
    };

export interface ExperimentContract {
  schemaVersion: 'tsimulation.experiment/v1';
  id: string;
  version: string;
  description: string;
  intent: ExperimentIntent;
  variables: readonly ExperimentVariableContract[];
  dependence?: DependenceContract;
  /** Human-readable limits on what conclusions the study supports. */
  interpretation?: string;
}

export type ExperimentResultInterpretation =
  | 'unweighted-cases'
  | 'design-sample'
  | 'probability-distribution'
  | 'epistemic-possibility'
  | 'nested-aleatory-epistemic'
  | 'legacy-unspecified';

function requiredText(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${context} must not be empty`);
}

function validateParameters(
  parameters: Readonly<Record<string, number>>,
  context: string,
): void {
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    throw new Error(`${context} must be a parameter record`);
  }
  for (const [name, value] of Object.entries(parameters)) {
    requiredText(name, `${context} parameter name`);
    if (!Number.isFinite(value)) throw new Error(`${context}.${name} must be finite`);
  }
}

function validateDomain(domain: ExperimentDomain, context: string): void {
  if (domain.kind === 'cases' || domain.kind === 'set') {
    if (!Array.isArray(domain.values) || domain.values.length === 0) {
      throw new Error(`${context}.${domain.kind} must contain at least one value`);
    }
    return;
  }
  if (domain.kind === 'interval') {
    if (!Number.isFinite(domain.lower) || !Number.isFinite(domain.upper) ||
        domain.upper < domain.lower) {
      throw new Error(`${context}.interval bounds are invalid`);
    }
    return;
  }
  if (domain.kind === 'empirical-distribution') {
    if (domain.values.length === 0 || domain.values.length !== domain.weights.length) {
      throw new Error(`${context}.empirical-distribution values/weights are invalid`);
    }
    if (domain.values.some((value) => !Number.isFinite(value)) ||
        domain.weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
      throw new Error(`${context}.empirical-distribution values and weights must be finite`);
    }
    const total = domain.weights.reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(total - 1) > 1e-9) {
      throw new Error(`${context}.empirical-distribution weights must sum to 1`);
    }
    return;
  }
  requiredText(domain.family, `${context}.${domain.kind}.family`);
  validateParameters(domain.parameters, `${context}.${domain.kind}.parameters`);
  if (domain.kind === 'subjective-distribution') {
    requiredText(domain.rationale, `${context}.subjective-distribution.rationale`);
  }
}

function probabilityDomain(domain: ExperimentDomain): boolean {
  return domain.kind === 'distribution' || domain.kind === 'empirical-distribution' ||
    domain.kind === 'subjective-distribution';
}

function validateDependence(
  dependence: DependenceContract | undefined,
  variables: readonly ExperimentVariableContract[],
  context: string,
): void {
  const probabilistic = variables.filter((variable) => probabilityDomain(variable.domain));
  if (probabilistic.length > 1 && !dependence) {
    throw new Error(
      `${context}.dependence must explicitly describe multiple probabilistic variables`,
    );
  }
  if (!dependence) return;
  const ids = new Set(variables.map((variable) => variable.id));
  const probabilisticIds = new Set(probabilistic.map((variable) => variable.id));
  if (new Set(dependence.variables).size !== dependence.variables.length) {
    throw new Error(`${context}.dependence variables contain duplicates`);
  }
  for (const id of dependence.variables) {
    if (!ids.has(id)) throw new Error(`${context}.dependence references unknown variable '${id}'`);
  }
  for (const id of probabilisticIds) {
    if (!dependence.variables.includes(id)) {
      throw new Error(`${context}.dependence omits probabilistic variable '${id}'`);
    }
  }
  if (dependence.kind !== 'custom') {
    for (const id of dependence.variables) {
      if (!probabilisticIds.has(id)) {
        throw new Error(
          `${context}.${dependence.kind} dependence includes non-probabilistic variable '${id}'`,
        );
      }
    }
  }
  if (dependence.kind === 'correlation') {
    const size = dependence.variables.length;
    if (dependence.matrix.length !== size ||
        dependence.matrix.some((row) => row.length !== size)) {
      throw new Error(`${context}.dependence correlation matrix has the wrong shape`);
    }
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        const value = dependence.matrix[row][column];
        if (!Number.isFinite(value) || value < -1 || value > 1) {
          throw new Error(`${context}.dependence correlation values must be in [-1, 1]`);
        }
        if (row === column && Math.abs(value - 1) > 1e-12) {
          throw new Error(`${context}.dependence correlation diagonal must equal 1`);
        }
        if (Math.abs(value - dependence.matrix[column][row]) > 1e-12) {
          throw new Error(`${context}.dependence correlation matrix must be symmetric`);
        }
      }
    }
    // Cholesky-style positive-semidefinite check, including singular matrices.
    const factor = Array.from({ length: size }, () => Array(size).fill(0) as number[]);
    const tolerance = 1e-10;
    for (let row = 0; row < size; row++) {
      for (let column = 0; column <= row; column++) {
        let residual = dependence.matrix[row][column];
        for (let index = 0; index < column; index++) {
          residual -= factor[row][index] * factor[column][index];
        }
        if (row === column) {
          if (residual < -tolerance) {
            throw new Error(
              `${context}.dependence correlation matrix is not positive semidefinite`,
            );
          }
          factor[row][column] = Math.sqrt(Math.max(0, residual));
        } else if (factor[column][column] > tolerance) {
          factor[row][column] = residual / factor[column][column];
        } else if (Math.abs(residual) > tolerance) {
          throw new Error(
            `${context}.dependence correlation matrix is not positive semidefinite`,
          );
        }
      }
    }
  } else if (dependence.kind === 'custom') {
    requiredText(dependence.description, `${context}.dependence.description`);
  }
}

export function defineExperiment(contract: ExperimentContract): ExperimentContract {
  validateExperiment(contract, `Experiment '${contract.id || '<unknown>'}'`);
  return contract;
}

export function validateExperiment(
  contract: ExperimentContract,
  context = 'experiment',
): void {
  if (contract.schemaVersion !== 'tsimulation.experiment/v1') {
    throw new Error(`${context} has unsupported schemaVersion '${String(contract.schemaVersion)}'`);
  }
  requiredText(contract.id, `${context}.id`);
  requiredText(contract.version, `${context}.version`);
  requiredText(contract.description, `${context}.description`);
  if (!([
    'scenario',
    'stress-test',
    'sensitivity',
    'design-space',
    'aleatory-uncertainty',
    'epistemic-uncertainty',
    'mixed-uncertainty',
  ] as const).includes(contract.intent)) {
    throw new Error(`${context}.intent is invalid`);
  }
  if (!Array.isArray(contract.variables)) throw new Error(`${context}.variables must be an array`);
  const ids = new Set<string>();
  for (const variable of contract.variables) {
    requiredText(variable.id, `${context} variable ID`);
    if (ids.has(variable.id)) throw new Error(`${context} has duplicate variable '${variable.id}'`);
    ids.add(variable.id);
    if (!([
      'constant',
      'state',
      'decision-lever',
      'aleatory',
      'epistemic',
      'structural',
    ] as const).includes(variable.role)) {
      throw new Error(`${context} variable '${variable.id}' has an invalid role`);
    }
    validateDomain(variable.domain, `${context} variable '${variable.id}'`);
    if (variable.estimand) {
      validateEstimand(variable.estimand, `${context} variable '${variable.id}' estimand`);
    }
    if (variable.role === 'aleatory' &&
        variable.domain.kind !== 'distribution' &&
        variable.domain.kind !== 'empirical-distribution') {
      throw new Error(
        `${context} aleatory variable '${variable.id}' must have an objective probability domain`,
      );
    }
    if (variable.role === 'epistemic' &&
        (variable.domain.kind === 'distribution' ||
         variable.domain.kind === 'empirical-distribution')) {
      throw new Error(
        `${context} epistemic variable '${variable.id}' must use an interval, set, or ` +
        'explicit subjective-distribution',
      );
    }
    if (probabilityDomain(variable.domain) &&
        variable.role !== 'aleatory' &&
        variable.role !== 'epistemic') {
      throw new Error(
        `${context} variable '${variable.id}' uses a probability domain but its role is ` +
        `'${variable.role}'`,
      );
    }
  }
  const hasAleatory = contract.variables.some((variable) => variable.role === 'aleatory');
  const hasEpistemic = contract.variables.some((variable) =>
    variable.role === 'epistemic' || variable.role === 'structural'
  );
  if (contract.intent === 'aleatory-uncertainty' && (!hasAleatory || hasEpistemic)) {
    throw new Error(`${context} aleatory study must contain aleatory but no epistemic variables`);
  }
  if (contract.intent === 'epistemic-uncertainty' && (!hasEpistemic || hasAleatory)) {
    throw new Error(`${context} epistemic study must contain epistemic but no aleatory variables`);
  }
  if (contract.intent === 'mixed-uncertainty' && (!hasAleatory || !hasEpistemic)) {
    throw new Error(`${context} mixed study must contain both aleatory and epistemic variables`);
  }
  if (!['aleatory-uncertainty', 'epistemic-uncertainty', 'mixed-uncertainty']
    .includes(contract.intent) &&
    contract.variables.some((variable) => variable.role === 'aleatory')) {
    throw new Error(`${context} non-UQ intent cannot label variables as aleatory`);
  }
  validateDependence(contract.dependence, contract.variables, context);
}

export function experimentInterpretation(
  contract: ExperimentContract | undefined,
): ExperimentResultInterpretation {
  if (!contract) return 'legacy-unspecified';
  validateExperiment(contract);
  if (contract.intent === 'scenario' || contract.intent === 'stress-test') {
    return 'unweighted-cases';
  }
  if (contract.intent === 'sensitivity' || contract.intent === 'design-space') {
    return 'design-sample';
  }
  if (contract.intent === 'aleatory-uncertainty') return 'probability-distribution';
  if (contract.intent === 'epistemic-uncertainty') return 'epistemic-possibility';
  return 'nested-aleatory-epistemic';
}

function domainContains(domain: ExperimentDomain, value: unknown): boolean {
  if (domain.kind === 'cases' || domain.kind === 'set') {
    const encoded = stableStringify(value);
    return domain.values.some((candidate) => stableStringify(candidate) === encoded);
  }
  if (domain.kind === 'interval') {
    return typeof value === 'number' && Number.isFinite(value) &&
      value >= domain.lower && value <= domain.upper;
  }
  if (domain.kind === 'empirical-distribution') {
    return typeof value === 'number' && Number.isFinite(value) &&
      domain.values.includes(value);
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  const family = domain.family;
  const parameters = domain.parameters;
  if (family === 'uniform') {
    return value >= (parameters.lower ?? Number.NEGATIVE_INFINITY) &&
      value <= (parameters.upper ?? Number.POSITIVE_INFINITY);
  }
  if (family === 'lognormal') return value > 0;
  if (family === 'beta') return value >= 0 && value <= 1;
  if (family === 'poisson') return Number.isInteger(value) && value >= 0;
  if (family === 'binomial') {
    return Number.isInteger(value) && value >= 0 &&
      value <= (parameters.trials ?? Number.POSITIVE_INFINITY);
  }
  if (family === 'triangular') {
    return value >= (parameters.lower ?? Number.NEGATIVE_INFINITY) &&
      value <= (parameters.upper ?? Number.POSITIVE_INFINITY);
  }
  return true;
}

/**
 * Validate the values actually sampled for a study. This keeps a correct
 * declaration from becoming decorative metadata around an unrelated sampler.
 */
export function validateExperimentSample(
  contract: ExperimentContract,
  values: Readonly<Record<string, unknown>>,
  context = 'experiment sample',
): void {
  validateExperiment(contract);
  const declared = new Set(contract.variables.map((variable) => variable.id));
  for (const key of Object.keys(values)) {
    if (!declared.has(key)) throw new Error(`${context} contains undeclared variable '${key}'`);
  }
  for (const variable of contract.variables) {
    if (variable.role === 'constant' || variable.role === 'state') continue;
    if (!Object.hasOwn(values, variable.id)) {
      throw new Error(`${context} is missing variable '${variable.id}'`);
    }
    if (!domainContains(variable.domain, values[variable.id])) {
      throw new Error(
        `${context} variable '${variable.id}' is outside its declared ${variable.domain.kind} domain`,
      );
    }
  }
}

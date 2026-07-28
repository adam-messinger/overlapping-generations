import { requireIsoTimestamp, requireText } from './canonical.js';

export interface ConditionalBranch {
  id: string;
  label: string;
  branchProbability: number;
  targetProbability: number;
  indicatorQuestionHash?: string;
}

export interface ConditionalForecastSet {
  schemaVersion: 'forecast-workbench.conditional-set/v1';
  id: string;
  version: string;
  questionHash: string;
  forecasterId: string;
  createdAt: string;
  unconditionalTargetProbability: number;
  completeMutuallyExclusivePartition: boolean;
  branches: readonly ConditionalBranch[];
}

export interface ConditionalCoherenceAudit {
  auditable: boolean;
  coherent: boolean;
  impliedUnconditional?: number;
  statedUnconditional: number;
  difference?: number;
  warnings: readonly string[];
}

function probability(value: number, context: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${context} must be in [0, 1]`);
  }
}

export function validateConditionalSet(set: ConditionalForecastSet): void {
  if (set.schemaVersion !== 'forecast-workbench.conditional-set/v1') {
    throw new Error(`Unsupported conditional schema '${String(set.schemaVersion)}'`);
  }
  requireText(set.id, 'conditionalSet.id');
  requireText(set.version, 'conditionalSet.version');
  requireText(set.questionHash, 'conditionalSet.questionHash');
  requireText(set.forecasterId, 'conditionalSet.forecasterId');
  requireIsoTimestamp(set.createdAt, 'conditionalSet.createdAt');
  if (typeof set.completeMutuallyExclusivePartition !== 'boolean') {
    throw new Error(
      'conditionalSet.completeMutuallyExclusivePartition must be boolean',
    );
  }
  probability(set.unconditionalTargetProbability, 'conditionalSet.unconditionalTargetProbability');
  if (set.branches.length < 2) throw new Error('Conditional set needs at least two branches');
  const ids = new Set<string>();
  for (const branch of set.branches) {
    requireText(branch.id, 'conditional branch ID');
    requireText(branch.label, `conditional branch '${branch.id}' label`);
    if (ids.has(branch.id)) throw new Error(`Duplicate conditional branch '${branch.id}'`);
    ids.add(branch.id);
    probability(branch.branchProbability, `conditional branch '${branch.id}' probability`);
    probability(branch.targetProbability, `conditional branch '${branch.id}' target probability`);
    if (branch.indicatorQuestionHash !== undefined) {
      requireText(
        branch.indicatorQuestionHash,
        `conditional branch '${branch.id}' indicator question`,
      );
    }
  }
}

export function auditConditionalCoherence(
  set: ConditionalForecastSet,
  tolerance = 1e-9,
): ConditionalCoherenceAudit {
  validateConditionalSet(set);
  if (!set.completeMutuallyExclusivePartition) {
    return {
      auditable: false,
      coherent: false,
      statedUnconditional: set.unconditionalTargetProbability,
      warnings: ['Branches are not declared a complete mutually exclusive partition.'],
    };
  }
  const branchTotal = set.branches.reduce(
    (sum, branch) => sum + branch.branchProbability,
    0,
  );
  const warnings: string[] = [];
  if (Math.abs(branchTotal - 1) > tolerance) {
    warnings.push(`Branch probabilities sum to ${branchTotal}, not 1.`);
  }
  const implied = set.branches.reduce(
    (sum, branch) => sum + branch.branchProbability * branch.targetProbability,
    0,
  );
  const difference = implied - set.unconditionalTargetProbability;
  if (Math.abs(difference) > tolerance) {
    warnings.push(
      `Conditionals imply ${implied}; stated unconditional is ` +
      `${set.unconditionalTargetProbability}.`,
    );
  }
  return {
    auditable: true,
    coherent: warnings.length === 0,
    impliedUnconditional: implied,
    statedUnconditional: set.unconditionalTargetProbability,
    difference,
    warnings,
  };
}

export function conditionalValueOfInformation(options: {
  set: ConditionalForecastSet;
  reducibility: number;
  timeliness: number;
  cost: number;
}): number {
  validateConditionalSet(options.set);
  for (const [name, value] of [
    ['reducibility', options.reducibility],
    ['timeliness', options.timeliness],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`${name} must be in [0, 1]`);
    }
  }
  if (!Number.isFinite(options.cost) || options.cost <= 0) {
    throw new Error('VOI cost must be positive');
  }
  const movement = options.set.branches.reduce(
    (sum, branch) =>
      sum + branch.branchProbability *
      Math.abs(branch.targetProbability - options.set.unconditionalTargetProbability),
    0,
  );
  return movement * options.reducibility * options.timeliness / options.cost;
}

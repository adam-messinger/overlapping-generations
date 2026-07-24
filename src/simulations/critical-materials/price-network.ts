import type { MaterialNode, WeberSectorBenchmark } from './data.js';
import { assertFiniteDeep, solveLinearSystem, validateNumber } from 'tsimulation';

export interface PriceShockResult {
  nodePriceChanges: Readonly<Record<string, number>>;
  finalBasketPriceChange: number;
}

/** Weber-style cost-price propagation with the shocked upstream node exogenous. */
export function simulatePriceShock(
  nodes: readonly MaterialNode[],
  shockedNodeId: string,
  shockFraction: number,
  passThrough = 1,
): PriceShockResult {
  assertFiniteDeep({ nodes, shockFraction, passThrough }, 'price network input');
  const ids = new Set<string>();
  for (const node of nodes) {
    if (!node.id) throw new Error('Price network node ID must not be empty');
    if (ids.has(node.id)) throw new Error(`Duplicate price network node '${node.id}'`);
    ids.add(node.id);
  }
  const errors = [
    ...validateNumber(shockFraction, 'shockFraction'),
    ...validateNumber(passThrough, 'passThrough', { min: 0 }),
  ];
  for (const node of nodes) {
    errors.push(...validateNumber(node.finalDemandWeight, `${node.id}.finalDemandWeight`, { min: 0 }));
    for (const input of node.inputs) {
      if (!ids.has(input.from)) errors.push(`${node.id} references unknown input '${input.from}'`);
      errors.push(...validateNumber(input.costShare, `${node.id}.inputs.${input.from}.costShare`, { min: 0 }));
    }
  }
  if (errors.length > 0) throw new Error(`Invalid price network:\n  ${errors.join('\n  ')}`);
  const shockedIndex = nodes.findIndex((node) => node.id === shockedNodeId);
  if (shockedIndex < 0) throw new Error(`Unknown shocked node: ${shockedNodeId}`);
  const endogenous = nodes.map((_, index) => index).filter((index) => index !== shockedIndex);
  const position = new Map(endogenous.map((nodeIndex, index) => [nodeIndex, index]));
  const matrix = endogenous.map(() => endogenous.map(() => 0));
  const rhs = endogenous.map(() => 0);

  endogenous.forEach((receiverIndex, row) => {
    matrix[row][row] = 1;
    for (const input of nodes[receiverIndex].inputs) {
      const supplierIndex = nodes.findIndex((node) => node.id === input.from);
      const coefficient = passThrough * input.costShare;
      if (supplierIndex === shockedIndex) {
        rhs[row] += coefficient * shockFraction;
      } else {
        const column = position.get(supplierIndex);
        if (column !== undefined) matrix[row][column] -= coefficient;
      }
    }
  });

  const solution = endogenous.length > 0 ? solveLinearSystem(matrix, rhs).solution : [];
  const nodePriceChanges: Record<string, number> = { [shockedNodeId]: shockFraction };
  endogenous.forEach((nodeIndex, index) => {
    nodePriceChanges[nodes[nodeIndex].id] = solution[index];
  });
  const weight = nodes.reduce((sum, node) => sum + node.finalDemandWeight, 0);
  const finalBasketPriceChange =
    nodes.reduce(
      (sum, node) => sum + node.finalDemandWeight * (nodePriceChanges[node.id] ?? 0),
      0,
    ) / Math.max(weight, 1e-12);
  return { nodePriceChanges, finalBasketPriceChange };
}

export interface WeberFit {
  directScale: number;
  networkExposure: Readonly<Record<string, number>>;
}

export interface WeberShockImpact {
  sectorId: string;
  shockPct: number;
  directCpiImpactPct: number;
  totalCpiImpactPct: number;
  indirectCpiImpactPct: number;
}

/** Fit V1's one global multiplier and V2's total-requirements exposure on 2000–2019. */
export function fitWeberModels(
  rows: readonly WeberSectorBenchmark[],
): WeberFit {
  assertFiniteDeep(rows, 'Weber benchmark');
  if (rows.length === 0) throw new Error('Weber benchmark must not be empty');
  let numerator = 0;
  let denominator = 0;
  const networkExposure: Record<string, number> = {};
  for (const row of rows) {
    const direct = row.latent.shockPct * (row.consumerSharePct / 100);
    numerator += direct * row.latent.totalCpiImpactPct;
    denominator += direct ** 2;
    networkExposure[row.id] = row.latent.totalCpiImpactPct / row.latent.shockPct;
  }
  if (!(denominator > 0)) throw new Error('Weber benchmark has no identifying shock variation');
  return {
    directScale: numerator / denominator,
    networkExposure,
  };
}

export function predictWeberImpact(
  row: WeberSectorBenchmark,
  period: 'latent' | 'covid' | 'ukraine',
  version: 'v1' | 'v2',
  fit: WeberFit,
): number {
  const shock = row[period].shockPct;
  if (version === 'v1') {
    return fit.directScale * shock * (row.consumerSharePct / 100);
  }
  return shock * fit.networkExposure[row.id];
}

/**
 * Apply a fitted Weber total-requirements exposure to an arbitrary sector
 * price shock, retaining the direct consumer-weight contribution separately.
 *
 * `indirectCpiImpactPct` is the network contribution beyond the shocked
 * sector's own final-consumption weight. It is a CPI percentage-point
 * contribution, not a percentage change in the upstream sector price.
 */
export function propagateWeberShock(
  rows: readonly WeberSectorBenchmark[],
  sectorId: string,
  shockPct: number,
  fit: WeberFit = fitWeberModels(rows),
): WeberShockImpact {
  assertFiniteDeep({ rows, shockPct, fit }, 'Weber shock propagation');
  const row = rows.find((candidate) => candidate.id === sectorId);
  if (!row) throw new Error(`Unknown Weber sector: ${sectorId}`);
  const exposure = fit.networkExposure[sectorId];
  if (exposure === undefined) {
    throw new Error(`Weber fit has no network exposure for sector: ${sectorId}`);
  }
  const directCpiImpactPct = shockPct * row.consumerSharePct / 100;
  const totalCpiImpactPct = shockPct * exposure;
  const result: WeberShockImpact = {
    sectorId,
    shockPct,
    directCpiImpactPct,
    totalCpiImpactPct,
    indirectCpiImpactPct: totalCpiImpactPct - directCpiImpactPct,
  };
  assertFiniteDeep(result, 'Weber shock impact');
  return result;
}

export interface WeberEvaluation {
  maePctPoints: number;
  rankCorrelation: number;
}

function ranks(values: readonly number[]): number[] {
  const order = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value);
  const result = Array(values.length).fill(0) as number[];
  order.forEach((entry, rank) => {
    result[entry.index] = rank + 1;
  });
  return result;
}

export function evaluateWeberPeriod(
  rows: readonly WeberSectorBenchmark[],
  period: 'latent' | 'covid' | 'ukraine',
  version: 'v1' | 'v2',
  fit: WeberFit,
): WeberEvaluation {
  if (rows.length < 2) throw new Error('Weber evaluation requires at least two sectors');
  const observed = rows.map((row) => row[period].totalCpiImpactPct);
  const predicted = rows.map((row) => predictWeberImpact(row, period, version, fit));
  const maePctPoints =
    observed.reduce((sum, value, index) => sum + Math.abs(value - predicted[index]), 0) /
    observed.length;
  const observedRanks = ranks(observed);
  const predictedRanks = ranks(predicted);
  const squaredRankDifference = observedRanks.reduce(
    (sum, rank, index) => sum + (rank - predictedRanks[index]) ** 2,
    0,
  );
  const n = observed.length;
  const rankCorrelation = 1 - (6 * squaredRankDifference) / (n * (n ** 2 - 1));
  return { maePctPoints, rankCorrelation };
}

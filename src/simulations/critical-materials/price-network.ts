import type { MaterialNode, WeberSectorBenchmark } from './data.js';

export interface PriceShockResult {
  nodePriceChanges: Readonly<Record<string, number>>;
  finalBasketPriceChange: number;
}

function solveLinear(matrix: number[][], vector: number[]): number[] {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let pivot = 0; pivot < n; pivot++) {
    let best = pivot;
    for (let row = pivot + 1; row < n; row++) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) {
        best = row;
      }
    }
    if (Math.abs(augmented[best][pivot]) < 1e-12) {
      throw new Error('Singular input-output price system');
    }
    [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
    const divisor = augmented[pivot][pivot];
    for (let column = pivot; column <= n; column++) augmented[pivot][column] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      for (let column = pivot; column <= n; column++) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }
  return augmented.map((row) => row[n]);
}

/** Weber-style cost-price propagation with the shocked upstream node exogenous. */
export function simulatePriceShock(
  nodes: readonly MaterialNode[],
  shockedNodeId: string,
  shockFraction: number,
  passThrough = 1,
): PriceShockResult {
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

  const solution = solveLinear(matrix, rhs);
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

/** Fit V1's one global multiplier and V2's total-requirements exposure on 2000–2019. */
export function fitWeberModels(
  rows: readonly WeberSectorBenchmark[],
): WeberFit {
  let numerator = 0;
  let denominator = 0;
  const networkExposure: Record<string, number> = {};
  for (const row of rows) {
    const direct = row.latent.shockPct * (row.consumerSharePct / 100);
    numerator += direct * row.latent.totalCpiImpactPct;
    denominator += direct ** 2;
    networkExposure[row.id] = row.latent.totalCpiImpactPct / row.latent.shockPct;
  }
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

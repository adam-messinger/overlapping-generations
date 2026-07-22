import type { MaterialNode } from './data.js';
import { simulatePriceShock } from './price-network.js';

export interface DynamicNetworkOptions {
  months: number;
  supplyPaths: Readonly<Record<string, readonly number[]>>;
  revision: 'v1' | 'v2';
  inventoryMonthsOverride?: number;
  inventoryMultiplier?: number;
  substitutionMultiplier?: number;
  priceElasticity: number;
  pricePassThrough: number;
  curtailmentNodeId?: string;
  curtailmentThreshold?: number;
}

export interface DynamicMonthResult {
  month: number;
  outputRatios: Readonly<Record<string, number>>;
  weightedFinalOutput: number;
  finalBasketPriceMultiple: number;
  sourcePriceMultiples: Readonly<Record<string, number>>;
}

export interface DynamicNetworkResult {
  months: readonly DynamicMonthResult[];
  firstCurtailmentMonth: number | null;
  recoveryMonth: number | null;
  peakSourcePriceMultiple: number;
  cumulativeWeightedOutputLoss: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function simulateDynamicNetwork(
  nodes: readonly MaterialNode[],
  options: DynamicNetworkOptions,
): DynamicNetworkResult {
  const inventories = new Map<string, number>();
  const shortageDurations = new Map<string, number>();
  const inventoryTarget = (node: MaterialNode): number => {
    if (options.revision === 'v1') return 0;
    const base = options.inventoryMonthsOverride ?? node.inventoryMonths;
    return base * (options.inventoryMultiplier ?? 1);
  };
  for (const node of nodes) {
    for (const input of node.inputs) {
      inventories.set(`${node.id}:${input.from}`, inventoryTarget(node));
      shortageDurations.set(`${node.id}:${input.from}`, 0);
    }
  }

  const finalWeight = nodes.reduce((sum, node) => sum + node.finalDemandWeight, 0);
  const results: DynamicMonthResult[] = [];
  let firstCurtailmentMonth: number | null = null;
  let recoveryMonth: number | null = null;
  let peakSourcePriceMultiple = 1;
  let cumulativeWeightedOutputLoss = 0;

  for (let month = 0; month < options.months; month++) {
    const outputRatios: Record<string, number> = {};
    const sourcePriceMultiples: Record<string, number> = {};
    let basketPriceChange = 0;

    for (const node of nodes) {
      if (node.kind === 'material') {
        const path = options.supplyPaths[node.id];
        const capacity = clamp(path?.[month] ?? path?.[path.length - 1] ?? 1, 0, 1.5);
        outputRatios[node.id] = capacity;
        const shortage = Math.max(0, 1 - capacity);
        const priceMultiple = Math.min(
          10,
          1 + options.priceElasticity * shortage / Math.max(capacity, 0.1),
        );
        sourcePriceMultiples[node.id] = priceMultiple;
        peakSourcePriceMultiple = Math.max(peakSourcePriceMultiple, priceMultiple);
        if (priceMultiple > 1) {
          basketPriceChange += simulatePriceShock(
            nodes,
            node.id,
            priceMultiple - 1,
            options.pricePassThrough,
          ).finalBasketPriceChange;
        }
        continue;
      }

      let criticalCapacity = 1;
      let nonCriticalEfficiency = 1;
      const inputState: Array<{
        key: string;
        requirement: number;
        available: number;
        critical: boolean;
        costShare: number;
      }> = [];

      for (const input of node.inputs) {
        const key = `${node.id}:${input.from}`;
        const upstream = outputRatios[input.from] ?? 1;
        const previousDuration = shortageDurations.get(key) ?? 0;
        const duration = upstream < 0.999 ? previousDuration + 1 : 0;
        shortageDurations.set(key, duration);
        const ramp = input.substitutionRampMonths ?? Number.POSITIVE_INFINITY;
        const maxSubstitution =
          options.revision === 'v2'
            ? Math.min(1, (input.maxSubstitution ?? 0) * (options.substitutionMultiplier ?? 1))
            : 0;
        const substitution = Number.isFinite(ramp)
          ? maxSubstitution * clamp(duration / ramp, 0, 1)
          : 0;
        const requirement = Math.max(0.01, 1 - substitution);
        const available = (inventories.get(key) ?? 0) + upstream;
        const inputCapacity = available / requirement;
        if (input.critical) {
          criticalCapacity = Math.min(criticalCapacity, inputCapacity);
        } else if (inputCapacity < 1) {
          nonCriticalEfficiency *= 1 - input.costShare * (1 - inputCapacity);
        }
        inputState.push({ key, requirement, available, critical: input.critical, costShare: input.costShare });
      }

      const output = clamp(criticalCapacity * nonCriticalEfficiency, 0, 1);
      outputRatios[node.id] = output;
      for (const state of inputState) {
        const remaining = Math.max(0, state.available - state.requirement * output);
        inventories.set(state.key, Math.min(inventoryTarget(node), remaining));
      }
    }

    const weightedFinalOutput =
      nodes.reduce(
        (sum, node) => sum + node.finalDemandWeight * (outputRatios[node.id] ?? 1),
        0,
      ) / Math.max(finalWeight, 1e-12);
    cumulativeWeightedOutputLoss += Math.max(0, 1 - weightedFinalOutput);
    const curtailmentNode = options.curtailmentNodeId;
    const measuredOutput = curtailmentNode
      ? outputRatios[curtailmentNode] ?? 1
      : weightedFinalOutput;
    const threshold = options.curtailmentThreshold ?? 0.95;
    if (firstCurtailmentMonth === null && measuredOutput < threshold) {
      firstCurtailmentMonth = month;
    } else if (
      firstCurtailmentMonth !== null &&
      recoveryMonth === null &&
      month > firstCurtailmentMonth &&
      measuredOutput >= threshold
    ) {
      recoveryMonth = month;
    }
    results.push({
      month,
      outputRatios,
      weightedFinalOutput,
      finalBasketPriceMultiple: 1 + basketPriceChange,
      sourcePriceMultiples,
    });
  }

  return {
    months: results,
    firstCurtailmentMonth,
    recoveryMonth,
    peakSourcePriceMultiple,
    cumulativeWeightedOutputLoss,
  };
}

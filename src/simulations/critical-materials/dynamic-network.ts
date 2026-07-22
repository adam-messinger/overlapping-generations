import type { MaterialNode } from './data.js';
import { simulatePriceShock } from './price-network.js';
import { assertFiniteDeep, validateAndSortGraph, validateNumber } from 'tsimulation';

export interface DynamicNetworkOptions {
  months: number;
  supplyPaths: Readonly<Record<string, readonly number[]>>;
  revision: 'v1' | 'v2' | 'v3';
  inventoryMonthsOverride?: number;
  /** Empirical input-specific stocks; takes precedence over the global override. */
  inventoryMonthsByInput?: Readonly<Record<string, number>>;
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
  assertFiniteDeep({ nodes, options }, 'dynamic network input');
  const optionErrors = [
    ...validateNumber(options.months, 'months', { integer: true, min: 1 }),
    ...validateNumber(options.priceElasticity, 'priceElasticity', { min: 0 }),
    ...validateNumber(options.pricePassThrough, 'pricePassThrough', { min: 0 }),
    ...validateNumber(options.inventoryMonthsOverride ?? 0, 'inventoryMonthsOverride', { min: 0 }),
    ...validateNumber(options.inventoryMultiplier ?? 1, 'inventoryMultiplier', { min: 0 }),
    ...validateNumber(options.substitutionMultiplier ?? 1, 'substitutionMultiplier', { min: 0 }),
    ...validateNumber(options.curtailmentThreshold ?? 0.98, 'curtailmentThreshold', { min: 0, max: 1 }),
  ];
  for (const node of nodes) {
    optionErrors.push(
      ...validateNumber(node.inventoryMonths, `${node.id}.inventoryMonths`, { min: 0 }),
      ...validateNumber(node.finalDemandWeight, `${node.id}.finalDemandWeight`, { min: 0 }),
    );
    for (const input of node.inputs) {
      optionErrors.push(
        ...validateNumber(input.costShare, `${node.id}.inputs.${input.from}.costShare`, { min: 0 }),
        ...validateNumber(input.maxSubstitution ?? 0, `${node.id}.inputs.${input.from}.maxSubstitution`, { min: 0, max: 1 }),
        ...validateNumber(input.substitutionRampMonths ?? 1, `${node.id}.inputs.${input.from}.substitutionRampMonths`, { min: 0, exclusiveMin: true }),
      );
    }
  }
  if (optionErrors.length > 0) throw new Error(`Invalid dynamic network options:\n  ${optionErrors.join('\n  ')}`);
  const orderedNodes = validateAndSortGraph(
    nodes,
    (node) => node.id,
    (node) => node.inputs.map((input) => input.from),
    'dynamic material network',
  ).ordered;
  const materialIds = new Set(
    orderedNodes.filter((node) => node.kind === 'material').map((node) => node.id),
  );
  for (const key of Object.keys(options.supplyPaths)) {
    if (!materialIds.has(key)) throw new Error(`Supply path references unknown material '${key}'`);
    const path = options.supplyPaths[key];
    if (path.length === 0) throw new Error(`Supply path '${key}' must not be empty`);
    const errors = path.flatMap((value, index) =>
      validateNumber(value, `supplyPaths.${key}[${index}]`, { min: 0, max: 1.5 }),
    );
    if (errors.length > 0) throw new Error(`Invalid dynamic network supply path:\n  ${errors.join('\n  ')}`);
  }
  if (options.curtailmentNodeId && !orderedNodes.some((node) => node.id === options.curtailmentNodeId)) {
    throw new Error(`Unknown curtailment node '${options.curtailmentNodeId}'`);
  }
  for (const [key, value] of Object.entries(options.inventoryMonthsByInput ?? {})) {
    const errors = validateNumber(value, `inventoryMonthsByInput.${key}`, { min: 0 });
    if (errors.length > 0) throw new Error(errors.join('; '));
  }
  const inventories = new Map<string, number>();
  const shortageDurations = new Map<string, number>();
  const inventoryTarget = (node: MaterialNode, inputFrom: string): number => {
    if (options.revision === 'v1') return 0;
    const base =
      options.inventoryMonthsByInput?.[inputFrom] ??
      options.inventoryMonthsOverride ??
      node.inventoryMonths;
    return base * (options.inventoryMultiplier ?? 1);
  };
  for (const node of orderedNodes) {
    for (const input of node.inputs) {
      inventories.set(`${node.id}:${input.from}`, inventoryTarget(node, input.from));
      shortageDurations.set(`${node.id}:${input.from}`, 0);
    }
  }

  const finalWeight = orderedNodes.reduce((sum, node) => sum + node.finalDemandWeight, 0);
  if (!(finalWeight > 0)) throw new Error('Dynamic material network needs positive final-demand weight');
  const results: DynamicMonthResult[] = [];
  let firstCurtailmentMonth: number | null = null;
  let recoveryMonth: number | null = null;
  let peakSourcePriceMultiple = 1;
  let cumulativeWeightedOutputLoss = 0;

  for (let month = 0; month < options.months; month++) {
    const outputRatios: Record<string, number> = {};
    const sourcePriceMultiples: Record<string, number> = {};
    let basketPriceChange = 0;

    for (const node of orderedNodes) {
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
            orderedNodes,
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
          options.revision !== 'v1'
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
        const inputFrom = state.key.slice(state.key.indexOf(':') + 1);
        inventories.set(
          state.key,
          Math.min(inventoryTarget(node, inputFrom), remaining),
        );
      }
    }

    const weightedFinalOutput =
      orderedNodes.reduce(
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

  const result: DynamicNetworkResult = {
    months: results,
    firstCurtailmentMonth,
    recoveryMonth,
    peakSourcePriceMultiple,
    cumulativeWeightedOutputLoss,
  };
  assertFiniteDeep(result, 'dynamic network result');
  return result;
}

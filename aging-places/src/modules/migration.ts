/**
 * Migration module: allocates internal movers and international migration
 * across the modeled municipal universe.
 *
 * Internal flows are closed: departures and arrivals have the same total.
 * Their pools are calculated from the municipal cohort stocks, not national
 * stocks, so a partial place universe cannot receive a full-country pool.
 * International migration is intentionally non-zero-sum and is scaled by the
 * cohort-specific share of the national population covered by modeled places.
 */
import { defineModule } from '../../../src/framework/index.js';
import type { ValidationResult } from '../../../src/framework/index.js';
import { COHORTS, Cohort } from '../domain-types.js';

export interface MigrationParams {
  betaWorking: number;
  betaRetiree: number;
  /** Annual shares of each local stock that move between municipalities. */
  workingMoverRate: number;
  midlifeMoverRate: number;
  retireeMoverRate: number;
  /** Portion of national net immigration represented by the place universe. */
  immigrationCoverageByCohort: Record<Cohort, number>;
}

export interface MigrationInputs {
  attractionWorking: Float64Array;
  attractionRetiree: Float64Array;
  netImmigrationByCohort: Record<Cohort, number>;
  laggedWorkingStock: Float64Array;
  laggedMidlifeStock: Float64Array;
  laggedRetireeStock: Float64Array;
  laggedDestinationUnits: Float64Array;
}

export interface Allocation {
  net: Float64Array;
  arrivals: Float64Array;
  departures: Float64Array;
  pool: number;
}

export interface MigrationOutputs {
  netWorking: Float64Array;
  netMidlife: Float64Array;
  netRetiree: Float64Array;
  localNetImmigrationByCohort: Record<Cohort, Float64Array>;
  arrivalsWorking: Float64Array;
  departuresWorking: Float64Array;
  departuresRetiree: Float64Array;
  internalNetTotal: number;
  internationalNetTotal: number;
}

const DEFAULT_COVERAGE: Record<Cohort, number> = {
  a0_19: 1, a20_24: 1, a25_44: 1, a45_64: 1, a65up: 1,
};

const DEFAULTS: MigrationParams = {
  betaWorking: 0.5,
  betaRetiree: 0.3,
  workingMoverRate: 0.025,
  midlifeMoverRate: 0.015,
  retireeMoverRate: 0.009,
  immigrationCoverageByCohort: DEFAULT_COVERAGE,
};

function weightedShares(
  mass: Float64Array, attraction: Float64Array, beta: number, fallback: Float64Array
): Float64Array {
  const n = mass.length;
  const weights = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const score = Math.max(-8, Math.min(8, beta * attraction[i]));
    weights[i] = Math.max(0, mass[i]) * Math.exp(score);
    total += weights[i];
  }
  if (total <= 0) {
    for (let i = 0; i < n; i++) {
      weights[i] = Math.max(0, fallback[i]);
      total += weights[i];
    }
  }
  if (total <= 0) return weights;
  for (let i = 0; i < n; i++) weights[i] /= total;
  return weights;
}

/** Allocate a closed internal-migration pool. Exported for invariant tests. */
export function allocateInternal(
  moverRate: number,
  destinationMass: Float64Array,
  attraction: Float64Array,
  beta: number,
  originStock: Float64Array
): Allocation {
  const n = originStock.length;
  const arrivals = new Float64Array(n);
  const departures = new Float64Array(n);
  const net = new Float64Array(n);
  let stockTotal = 0;
  for (let i = 0; i < n; i++) stockTotal += Math.max(0, originStock[i]);
  const pool = Math.max(0, Math.min(1, moverRate)) * stockTotal;
  if (pool <= 0 || stockTotal <= 0) return { net, arrivals, departures, pool: 0 };

  const destinationShares = weightedShares(destinationMass, attraction, beta, originStock);
  for (let i = 0; i < n; i++) {
    arrivals[i] = pool * destinationShares[i];
    departures[i] = pool * Math.max(0, originStock[i]) / stockTotal;
    net[i] = arrivals[i] - departures[i];
  }
  return { net, arrivals, departures, pool };
}

/** Allocate an open international flow. Positive values choose destinations;
 * negative values are exits distributed by resident stock and capped so a
 * place can never lose more members of a cohort than it has. */
export function allocateInternational(
  flow: number,
  destinationMass: Float64Array,
  attraction: Float64Array,
  beta: number,
  residentStock: Float64Array
): Float64Array {
  const n = residentStock.length;
  const out = new Float64Array(n);
  if (flow === 0) return out;
  if (flow > 0) {
    const shares = weightedShares(destinationMass, attraction, beta, residentStock);
    for (let i = 0; i < n; i++) out[i] = flow * shares[i];
    return out;
  }
  let stockTotal = 0;
  for (let i = 0; i < n; i++) stockTotal += Math.max(0, residentStock[i]);
  const exits = Math.min(-flow, stockTotal);
  if (stockTotal <= 0) return out;
  for (let i = 0; i < n; i++) out[i] = -exits * Math.max(0, residentStock[i]) / stockTotal;
  return out;
}

function sum(v: Float64Array): number {
  let total = 0;
  for (let i = 0; i < v.length; i++) total += v[i];
  return total;
}

export const migrationModule = defineModule<
  MigrationParams, Record<string, never>, MigrationInputs, MigrationOutputs
>({
  name: 'migration',
  description: 'Closed internal migration plus open international migration',
  defaults: DEFAULTS,
  inputs: [
    'attractionWorking', 'attractionRetiree', 'netImmigrationByCohort',
    'laggedWorkingStock', 'laggedMidlifeStock', 'laggedRetireeStock', 'laggedDestinationUnits',
  ],
  outputs: [
    'netWorking', 'netMidlife', 'netRetiree', 'localNetImmigrationByCohort',
    'arrivalsWorking', 'departuresWorking', 'departuresRetiree',
    'internalNetTotal', 'internationalNetTotal',
  ],

  validate(params): ValidationResult {
    const errors: string[] = [];
    for (const k of ['betaWorking', 'betaRetiree'] as const) {
      if (params[k] !== undefined && (params[k]! < 0 || params[k]! > 3)) errors.push(`${k} out of [0,3]`);
    }
    for (const k of ['workingMoverRate', 'midlifeMoverRate', 'retireeMoverRate'] as const) {
      if (params[k] !== undefined && (params[k]! < 0 || params[k]! > 1)) errors.push(`${k} out of [0,1]`);
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  },

  mergeParams(partial): MigrationParams {
    return {
      ...DEFAULTS,
      ...partial,
      immigrationCoverageByCohort: {
        ...DEFAULT_COVERAGE,
        ...(partial.immigrationCoverageByCohort ?? {}),
      },
    };
  },

  init(): Record<string, never> {
    return {};
  },

  step(state, inputs, params) {
    const midlifeAttraction = new Float64Array(inputs.attractionWorking.length);
    for (let i = 0; i < midlifeAttraction.length; i++) {
      midlifeAttraction[i] = 0.6 * inputs.attractionWorking[i] + 0.4 * inputs.attractionRetiree[i];
    }
    const working = allocateInternal(
      params.workingMoverRate, inputs.laggedWorkingStock, inputs.attractionWorking,
      params.betaWorking, inputs.laggedWorkingStock
    );
    const midlife = allocateInternal(
      params.midlifeMoverRate, inputs.laggedDestinationUnits, midlifeAttraction,
      0.5 * (params.betaWorking + params.betaRetiree), inputs.laggedMidlifeStock
    );
    // Units are destination capacity; retirees are the departure stock.
    const retiree = allocateInternal(
      params.retireeMoverRate, inputs.laggedDestinationUnits, inputs.attractionRetiree,
      params.betaRetiree, inputs.laggedRetireeStock
    );

    const localNetImmigrationByCohort = {} as Record<Cohort, Float64Array>;
    for (const cohort of COHORTS) {
      const workingLike = cohort === 'a0_19' || cohort === 'a20_24' || cohort === 'a25_44';
      const retireeLike = cohort === 'a65up';
      const attraction = workingLike
        ? inputs.attractionWorking
        : retireeLike ? inputs.attractionRetiree : midlifeAttraction;
      const destination = workingLike
        ? inputs.laggedWorkingStock
        : inputs.laggedDestinationUnits;
      const resident = cohort === 'a20_24' || cohort === 'a25_44'
        ? inputs.laggedWorkingStock
        : cohort === 'a45_64'
          ? inputs.laggedMidlifeStock
          : cohort === 'a65up'
            ? inputs.laggedRetireeStock
            : inputs.laggedWorkingStock;
      const nationalFlow = inputs.netImmigrationByCohort[cohort] ?? 0;
      const localFlow = nationalFlow * params.immigrationCoverageByCohort[cohort];
      localNetImmigrationByCohort[cohort] = allocateInternational(
        localFlow, destination, attraction,
        retireeLike ? params.betaRetiree : params.betaWorking, resident
      );
    }

    const internalNetTotal = sum(working.net) + sum(midlife.net) + sum(retiree.net);
    let internationalNetTotal = 0;
    for (const cohort of COHORTS) internationalNetTotal += sum(localNetImmigrationByCohort[cohort]);
    return {
      state,
      outputs: {
        netWorking: working.net,
        netMidlife: midlife.net,
        netRetiree: retiree.net,
        localNetImmigrationByCohort,
        arrivalsWorking: working.arrivals,
        departuresWorking: working.departures,
        departuresRetiree: retiree.departures,
        internalNetTotal,
        internationalNetTotal,
      },
    };
  },
});

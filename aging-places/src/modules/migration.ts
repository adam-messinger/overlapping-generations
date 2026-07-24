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
import { defineModule, ValidationResult, unitPort } from 'tsimulation';
import { COHORTS, COHORT_RATES, Cohort } from '../domain-types.js';

export interface MigrationParams {
  betaWorking: number;
  betaRetiree: number;
  /** Annual shares of each local stock that move between municipalities. */
  workingMoverRate: number;
  midlifeMoverRate: number;
  retireeMoverRate: number;
  /** Children changing municipality per net working-age mover. */
  childrenPerMover: number;
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
  laggedA0_19Stock: Float64Array;
  laggedA20_24Stock: Float64Array;
  laggedA25_44Stock: Float64Array;
  laggedA45_64Stock: Float64Array;
  laggedA65upStock: Float64Array;
  currentTfr: number;
}

export interface Allocation {
  net: Float64Array;
  arrivals: Float64Array;
  departures: Float64Array;
  pool: number;
  requestedPool: number;
  unmet: number;
}

export interface MigrationOutputs {
  netWorking: Float64Array;
  netMidlife: Float64Array;
  netRetiree: Float64Array;
  internalNetByCohort: Record<Cohort, Float64Array>;
  localNetImmigrationByCohort: Record<Cohort, Float64Array>;
  arrivalsWorking: Float64Array;
  departuresWorking: Float64Array;
  departuresRetiree: Float64Array;
  internalNetTotal: number;
  internationalNetTotal: number;
  unmetInternalMigrationByCohort: Record<Cohort, number>;
  unmetInternationalExitByCohort: Record<Cohort, number>;
  unmetInternalMigrationTotal: number;
  unmetInternationalExitTotal: number;
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
  childrenPerMover: 0.30,
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
  originStock: Float64Array,
  requestedPoolOverride?: number
): Allocation {
  const n = originStock.length;
  const arrivals = new Float64Array(n);
  const departures = new Float64Array(n);
  const net = new Float64Array(n);
  let stockTotal = 0;
  for (let i = 0; i < n; i++) stockTotal += Math.max(0, originStock[i]);
  const requestedPool = requestedPoolOverride ??
    Math.max(0, Math.min(1, moverRate)) * stockTotal;
  const pool = Math.min(Math.max(0, requestedPool), stockTotal);
  const unmet = Math.max(0, requestedPool - pool);
  if (pool <= 0 || stockTotal <= 0) {
    return { net, arrivals, departures, pool: 0, requestedPool, unmet };
  }

  const destinationShares = weightedShares(destinationMass, attraction, beta, originStock);
  for (let i = 0; i < n; i++) {
    arrivals[i] = pool * destinationShares[i];
    departures[i] = pool * Math.max(0, originStock[i]) / stockTotal;
    net[i] = arrivals[i] - departures[i];
  }
  return { net, arrivals, departures, pool, requestedPool, unmet };
}

/** Bound a proposed closed net flow by place-level origin capacity, then
 * rescale destinations so realized arrivals exactly equal departures. */
export function boundClosedNet(proposed: Float64Array, originCapacity: Float64Array): Allocation {
  const arrivals = new Float64Array(proposed.length);
  const departures = new Float64Array(proposed.length);
  const net = new Float64Array(proposed.length);
  let requestedPool = 0;
  let positiveTotal = 0;
  for (let i = 0; i < proposed.length; i++) {
    if (proposed[i] < 0) {
      requestedPool += -proposed[i];
      departures[i] = Math.min(-proposed[i], Math.max(0, originCapacity[i]));
    } else {
      positiveTotal += proposed[i];
    }
  }
  const pool = sum(departures);
  for (let i = 0; i < proposed.length; i++) {
    if (proposed[i] > 0 && positiveTotal > 0) arrivals[i] = pool * proposed[i] / positiveTotal;
    net[i] = arrivals[i] - departures[i];
  }
  return { net, arrivals, departures, pool, requestedPool, unmet: requestedPool - pool };
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
    'laggedA0_19Stock', 'laggedA20_24Stock', 'laggedA25_44Stock',
    'laggedA45_64Stock', 'laggedA65upStock', 'currentTfr',
  ],
  outputs: [
    'netWorking', 'netMidlife', 'netRetiree', 'internalNetByCohort',
    'localNetImmigrationByCohort',
    'arrivalsWorking', 'departuresWorking', 'departuresRetiree',
    'internalNetTotal', 'internationalNetTotal',
    'unmetInternalMigrationByCohort', 'unmetInternationalExitByCohort',
    'unmetInternalMigrationTotal', 'unmetInternationalExitTotal',
  ],
  connectorTypes: {
    inputs: {
      attractionWorking: unitPort('1', 'vector'),
      attractionRetiree: unitPort('1', 'vector'),
      netImmigrationByCohort: unitPort('people/year', 'record'),
      laggedWorkingStock: unitPort('people', 'vector'),
      laggedMidlifeStock: unitPort('people', 'vector'),
      laggedRetireeStock: unitPort('people', 'vector'),
      laggedDestinationUnits: unitPort('housing-unit', 'vector'),
      laggedA0_19Stock: unitPort('people', 'vector'),
      laggedA20_24Stock: unitPort('people', 'vector'),
      laggedA25_44Stock: unitPort('people', 'vector'),
      laggedA45_64Stock: unitPort('people', 'vector'),
      laggedA65upStock: unitPort('people', 'vector'),
      currentTfr: unitPort('1'),
    },
    outputs: {
      netWorking: unitPort('people/year', 'vector'),
      netMidlife: unitPort('people/year', 'vector'),
      netRetiree: unitPort('people/year', 'vector'),
      internalNetByCohort: unitPort('people/year', 'nested-record'),
      localNetImmigrationByCohort: unitPort('people/year', 'nested-record'),
      arrivalsWorking: unitPort('people/year', 'vector'),
      departuresWorking: unitPort('people/year', 'vector'),
      departuresRetiree: unitPort('people/year', 'vector'),
      internalNetTotal: unitPort('people/year'),
      internationalNetTotal: unitPort('people/year'),
      unmetInternalMigrationByCohort: unitPort('people/year', 'record'),
      unmetInternationalExitByCohort: unitPort('people/year', 'record'),
      unmetInternalMigrationTotal: unitPort('people/year'),
      unmetInternationalExitTotal: unitPort('people/year'),
    },
  },

  validate(params): ValidationResult {
    const errors: string[] = [];
    for (const k of ['betaWorking', 'betaRetiree'] as const) {
      if (params[k] !== undefined && (params[k]! < 0 || params[k]! > 3)) errors.push(`${k} out of [0,3]`);
    }
    for (const k of ['workingMoverRate', 'midlifeMoverRate', 'retireeMoverRate'] as const) {
      if (params[k] !== undefined && (params[k]! < 0 || params[k]! > 1)) errors.push(`${k} out of [0,1]`);
    }
    if (params.childrenPerMover !== undefined &&
        (params.childrenPerMover < 0 || params.childrenPerMover > 2)) {
      errors.push('childrenPerMover out of [0,2]');
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
    const current: Record<Cohort, Float64Array> = {
      a0_19: inputs.laggedA0_19Stock,
      a20_24: inputs.laggedA20_24Stock,
      a25_44: inputs.laggedA25_44Stock,
      a45_64: inputs.laggedA45_64Stock,
      a65up: inputs.laggedA65upStock,
    };
    const available = {} as Record<Cohort, Float64Array>;
    for (const cohort of COHORTS) available[cohort] = new Float64Array(current[cohort].length);
    const { survival, exit } = COHORT_RATES;
    for (let i = 0; i < current.a0_19.length; i++) {
      const grad0 = current.a0_19[i] * survival.a0_19 * exit.a0_19;
      const grad20 = current.a20_24[i] * survival.a20_24 * exit.a20_24;
      const grad25 = current.a25_44[i] * survival.a25_44 * exit.a25_44;
      const grad45 = current.a45_64[i] * survival.a45_64 * exit.a45_64;
      const womenReproductive = 0.495 *
        (0.25 * current.a0_19[i] + current.a20_24[i] + current.a25_44[i]);
      const births = (inputs.currentTfr / 30) * womenReproductive;
      available.a0_19[i] = current.a0_19[i] * survival.a0_19 - grad0 + births;
      available.a20_24[i] = current.a20_24[i] * survival.a20_24 - grad20 + grad0;
      available.a25_44[i] = current.a25_44[i] * survival.a25_44 - grad25 + grad20;
      available.a45_64[i] = current.a45_64[i] * survival.a45_64 - grad45 + grad25;
      available.a65up[i] = current.a65up[i] * survival.a65up + grad45;
    }

    const localNetImmigrationByCohort = {} as Record<Cohort, Float64Array>;
    const remaining = {} as Record<Cohort, Float64Array>;
    const unmetInternationalExitByCohort = {} as Record<Cohort, number>;
    for (const cohort of COHORTS) {
      const workingLike = cohort === 'a0_19' || cohort === 'a20_24' || cohort === 'a25_44';
      const retireeLike = cohort === 'a65up';
      const attraction = workingLike
        ? inputs.attractionWorking
        : retireeLike ? inputs.attractionRetiree : midlifeAttraction;
      const destination = workingLike
        ? inputs.laggedWorkingStock
        : inputs.laggedDestinationUnits;
      const nationalFlow = inputs.netImmigrationByCohort[cohort] ?? 0;
      const localFlow = nationalFlow * params.immigrationCoverageByCohort[cohort];
      localNetImmigrationByCohort[cohort] = allocateInternational(
        localFlow, destination, attraction,
        retireeLike ? params.betaRetiree : params.betaWorking, available[cohort]
      );
      const realized = sum(localNetImmigrationByCohort[cohort]);
      unmetInternationalExitByCohort[cohort] = localFlow < 0
        ? Math.max(0, -localFlow + realized) : 0;
      remaining[cohort] = new Float64Array(available[cohort].length);
      for (let i = 0; i < remaining[cohort].length; i++) {
        remaining[cohort][i] = Math.max(
          0,
          available[cohort][i] + Math.min(0, localNetImmigrationByCohort[cohort][i])
        );
      }
    }

    const working20 = allocateInternal(
      params.workingMoverRate, inputs.laggedWorkingStock, inputs.attractionWorking,
      params.betaWorking, remaining.a20_24,
      params.workingMoverRate * sum(available.a20_24)
    );
    const working25 = allocateInternal(
      params.workingMoverRate, inputs.laggedWorkingStock, inputs.attractionWorking,
      params.betaWorking, remaining.a25_44,
      params.workingMoverRate * sum(available.a25_44)
    );
    const midlife = allocateInternal(
      params.midlifeMoverRate, inputs.laggedDestinationUnits, midlifeAttraction,
      0.5 * (params.betaWorking + params.betaRetiree), remaining.a45_64,
      params.midlifeMoverRate * sum(available.a45_64)
    );
    const retiree = allocateInternal(
      params.retireeMoverRate, inputs.laggedDestinationUnits, inputs.attractionRetiree,
      params.betaRetiree, remaining.a65up,
      params.retireeMoverRate * sum(available.a65up)
    );
    const netWorking = new Float64Array(inputs.laggedWorkingStock.length);
    const proposedChildren = new Float64Array(inputs.laggedWorkingStock.length);
    for (let i = 0; i < netWorking.length; i++) {
      netWorking[i] = working20.net[i] + working25.net[i];
      proposedChildren[i] = params.childrenPerMover * netWorking[i];
    }
    const children = boundClosedNet(proposedChildren, remaining.a0_19);
    const internalNetByCohort: Record<Cohort, Float64Array> = {
      a0_19: children.net,
      a20_24: working20.net,
      a25_44: working25.net,
      a45_64: midlife.net,
      a65up: retiree.net,
    };
    const unmetInternalMigrationByCohort: Record<Cohort, number> = {
      a0_19: children.unmet,
      a20_24: working20.unmet,
      a25_44: working25.unmet,
      a45_64: midlife.unmet,
      a65up: retiree.unmet,
    };

    let internalNetTotal = 0;
    for (const cohort of COHORTS) internalNetTotal += sum(internalNetByCohort[cohort]);
    let internationalNetTotal = 0;
    for (const cohort of COHORTS) internationalNetTotal += sum(localNetImmigrationByCohort[cohort]);
    const unmetInternalMigrationTotal = COHORTS.reduce(
      (total, cohort) => total + unmetInternalMigrationByCohort[cohort], 0
    );
    const unmetInternationalExitTotal = COHORTS.reduce(
      (total, cohort) => total + unmetInternationalExitByCohort[cohort], 0
    );
    const netMidlife = midlife.net;
    const netRetiree = retiree.net;
    const arrivalsWorking = new Float64Array(netWorking.length);
    const departuresWorking = new Float64Array(netWorking.length);
    for (let i = 0; i < netWorking.length; i++) {
      arrivalsWorking[i] = working20.arrivals[i] + working25.arrivals[i];
      departuresWorking[i] = working20.departures[i] + working25.departures[i];
    }
    return {
      state,
      outputs: {
        netWorking,
        netMidlife,
        netRetiree,
        internalNetByCohort,
        localNetImmigrationByCohort,
        arrivalsWorking,
        departuresWorking,
        departuresRetiree: retiree.departures,
        internalNetTotal,
        internationalNetTotal,
        unmetInternalMigrationByCohort,
        unmetInternationalExitByCohort,
        unmetInternalMigrationTotal,
        unmetInternationalExitTotal,
      },
    };
  },
});

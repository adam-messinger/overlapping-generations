/**
 * Migration module: allocates the national mover pools across municipalities.
 *
 * Gravity-logit allocation: destination share of segment pool
 *   share_i ∝ mass_i × exp(beta × attraction_i)
 * Departures are proportional to local stock (everyone is equally likely to
 * be the mover; where they GO is what attraction shifts). Net internal
 * migration therefore sums to ~0 across places by construction.
 */
import { defineModule } from '../../../src/framework/index.js';
import type { ValidationResult } from '../../../src/framework/index.js';

export interface MigrationParams {
  /** Logit temperature for working-age destination choice. */
  betaWorking: number;
  /** Logit temperature for retiree destination choice. */
  betaRetiree: number;
}

export interface MigrationInputs {
  attractionWorking: Float64Array;
  attractionRetiree: Float64Array;
  workingMoverPool: number;
  retireeMoverPool: number;
  laggedWorkingStock: Float64Array;
  laggedRetireeMass: Float64Array; // housing-stock mass for retiree destinations
}

export interface MigrationOutputs {
  netWorking: Float64Array;
  netRetiree: Float64Array;
  arrivalsWorking: Float64Array;
}

const DEFAULTS: MigrationParams = {
  // Temperatures set so a +1 s.d. attraction gap ≈ 1.6x/1.35x destination odds;
  // consistent with the magnitude of youth-flow divergence in JP/KR data.
  betaWorking: 0.5,
  betaRetiree: 0.3,
};

function allocate(
  pool: number, mass: Float64Array, attraction: Float64Array, beta: number, stock: Float64Array
): { net: Float64Array; arrivals: Float64Array } {
  const n = mass.length;
  const w = new Float64Array(n);
  let sumW = 0;
  let sumStock = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(-8, Math.min(8, beta * attraction[i]));
    w[i] = Math.max(0, mass[i]) * Math.exp(a);
    sumW += w[i];
    sumStock += stock[i];
  }
  const net = new Float64Array(n);
  const arrivals = new Float64Array(n);
  if (sumW <= 0 || sumStock <= 0) return { net, arrivals };
  for (let i = 0; i < n; i++) {
    arrivals[i] = pool * (w[i] / sumW);
    net[i] = arrivals[i] - pool * (stock[i] / sumStock);
  }
  return { net, arrivals };
}

export const migrationModule = defineModule<MigrationParams, Record<string, never>, MigrationInputs, MigrationOutputs>({
  name: 'migration',
  description: 'Gravity-logit allocation of national mover pools',
  defaults: DEFAULTS,
  inputs: [
    'attractionWorking', 'attractionRetiree', 'workingMoverPool', 'retireeMoverPool',
    'laggedWorkingStock', 'laggedRetireeMass',
  ],
  outputs: ['netWorking', 'netRetiree', 'arrivalsWorking'],

  validate(params): ValidationResult {
    const errors: string[] = [];
    if (params.betaWorking !== undefined && (params.betaWorking < 0 || params.betaWorking > 3)) {
      errors.push('betaWorking out of [0,3]');
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  },

  mergeParams(partial): MigrationParams {
    return { ...DEFAULTS, ...partial };
  },

  init(): Record<string, never> {
    return {};
  },

  step(state, inputs, params) {
    const working = allocate(
      inputs.workingMoverPool, inputs.laggedWorkingStock, inputs.attractionWorking,
      params.betaWorking, inputs.laggedWorkingStock
    );
    const retiree = allocate(
      inputs.retireeMoverPool, inputs.laggedRetireeMass, inputs.attractionRetiree,
      params.betaRetiree, inputs.laggedRetireeMass
    );
    return {
      state,
      outputs: { netWorking: working.net, netRetiree: retiree.net, arrivalsWorking: working.arrivals },
    };
  },
});

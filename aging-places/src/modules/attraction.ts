/**
 * Attraction module: converts each municipality's four-capitals endowment
 * (THEORY.md) plus dynamic feedback (affordability, vitality) into segment
 * attraction scores for working-age and retiree movers.
 *
 * Pillar composites are fixed linear combinations of z-scored features
 * (weights justified in docs/METHODOLOGY.md from the Japan/Italy evidence);
 * the pillar-level weights are tunable params.
 */
import { defineModule, ValidationResult, unitPort } from 'tsimulation';
import { PlaceStatics } from '../domain-types.js';

export interface AttractionParams {
  statics: PlaceStatics | null;
  /** Working-age pillar weights. */
  wEngines: number;
  wHuman: number;
  wAccess: number;
  wRegen: number;
  wGateway: number;
  wVitality: number;   // dynamic: current young share (z)
  wAfford: number;     // dynamic penalty: z of lagged price/income
  wDistress: number;   // penalty: distress vacancy z
  /** Annual retention of the enrollment-throughput contribution. A value of
   * one preserves the current static institution assumption. */
  universityThroughputAnnualRetention: number;
  /** Lower bound on the retained enrollment-throughput contribution. */
  universityThroughputFloor: number;
  /** Diagnostic-only per-place multiplier on the demographic attraction terms
   * (regen + vitality), aligned with statics order. Null = 1 everywhere.
   * Used by the hierarchy-top diagnostic (Italy/Milano lesson). */
  demographicAttractionMultiplier: Float64Array | null;
  /** Regime-concentration dial (0 = off, current model; 1 = full response).
   * Scales a weight shift from the demographic terms (regen, vitality) to the
   * institutional terms (engines, human, hub) as SIMULATED national
   * working-age growth declines — the Japan/Italy old-regime pattern
   * (BACKTEST.md sections 6-8). Unvalidatable on US data by construction;
   * scenario tooling only, so the default stays 0. */
  concentrationSensitivity: number;
  /** National working-age log growth at/above which the shift is zero.
   * +0.5%/yr: the dispersed-growth US of the 2000s sat well above this. */
  concentrationGrowthHigh: number;
  /** Growth at/below which the shift is full. -0.5%/yr: Italy 2012-2019
   * (~-0.4%/yr, winner-take-all) and Japan 2010s (~-1%/yr, frozen
   * hierarchy) sit at or below this band edge. */
  concentrationGrowthLow: number;
  /** Hinterland-consolidation bonus: institutions in low-access regions
   * capture their shrinking hinterland (Fukuoka/Sapporo/Mayo pattern). */
  wHub: number;
  /** Retiree pillar weights. */
  rAmenity: number;
  rHealth: number;
  rScarcity: number;
  rAccess: number;
  rAfford: number;
}

export interface AttractionState {
  /** Precomputed static pillar composites. */
  engines: Float64Array;
  /** Enrollment-only portion of engines, exposed to scenario contraction. */
  universityThroughput: Float64Array;
  human: Float64Array;
  access: Float64Array;
  dominance: Float64Array;
  regen: Float64Array;
  gateway: Float64Array;
  amenity: Float64Array;
  scarcity: Float64Array;
  distress: Float64Array;
  health: Float64Array;
  /** Stats for z-scoring the dynamic price/income feedback. */
  pti0Mean: number;
  pti0Sd: number;
  ysMean: number;
  ysSd: number;
}

export interface AttractionInputs {
  laggedPriceToIncome: Float64Array;
  laggedYoungShare: Float64Array;
  natWorkingGrowth: number;
}

export interface AttractionOutputs {
  attractionWorking: Float64Array;
  attractionRetiree: Float64Array;
}

const DEFAULTS: AttractionParams = {
  statics: null,
  // Working-age weights: engines & human capital dominate (Fukuoka, Bologna,
  // Leipzig pattern); access is the spillover channel (Ciudad Real/Karuizawa);
  // regeneration = momentum of prior young presence; gateway = immigration.
  wEngines: 0.30,
  wHuman: 0.25,
  wAccess: 0.20,
  wRegen: 0.15,
  wGateway: 0.10,
  wVitality: 0.15,
  wAfford: 0.25,
  wDistress: 0.15,
  wHub: 0.10,
  universityThroughputAnnualRetention: 1,
  universityThroughputFloor: 0,
  demographicAttractionMultiplier: null,
  concentrationSensitivity: 0,
  concentrationGrowthHigh: 0.005,
  concentrationGrowthLow: -0.005,
  // Retiree weights: amenity dominates (Costa del Sol, Naples FL), healthcare
  // access second (empty-nester recentralization), prestige scarcity third.
  rAmenity: 0.45,
  rHealth: 0.25,
  rScarcity: 0.15,
  rAccess: 0.15,
  rAfford: 0.10,
};

function combine(statics: PlaceStatics, spec: [string, number][]): Float64Array {
  const n = statics.n;
  const out = new Float64Array(n);
  for (const [feat, w] of spec) {
    const col = statics.z[feat];
    if (!col) throw new Error(`attraction: missing z feature '${feat}'`);
    for (let i = 0; i < n; i++) out[i] += w * col[i];
  }
  return out;
}

function meanSd(v: Float64Array): { mean: number; sd: number } {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i];
  const mean = s / v.length;
  let ss = 0;
  for (let i = 0; i < v.length; i++) ss += (v[i] - mean) ** 2;
  return { mean, sd: Math.sqrt(ss / Math.max(1, v.length - 1)) || 1 };
}

export function universityThroughputRetention(
  annualRetention: number,
  floor: number,
  yearIndex: number,
): number {
  return Math.max(floor, annualRetention ** Math.max(0, yearIndex));
}

/** Regime-concentration shift in [0, sensitivity]: 0 while national
 * working-age growth is at/above `high`, ramping linearly to full at/below
 * `low`. See AttractionParams.concentrationSensitivity for grounding. */
export function concentrationShift(
  sensitivity: number,
  natWorkingGrowth: number,
  high: number,
  low: number,
): number {
  if (sensitivity <= 0 || high <= low) return 0;
  const band = Math.max(0, Math.min(1, (high - natWorkingGrowth) / (high - low)));
  return sensitivity * band;
}

export const attractionModule = defineModule<AttractionParams, AttractionState, AttractionInputs, AttractionOutputs>({
  name: 'attraction',
  description: 'Four-capitals attraction scores per municipality',
  defaults: DEFAULTS,
  connectorTypes: {
    inputs: {
      laggedPriceToIncome: unitPort('year', 'vector'),
      laggedYoungShare: unitPort('fraction', 'vector'),
      natWorkingGrowth: unitPort('fraction/year'),
    },
    outputs: {
      attractionWorking: unitPort('1', 'vector'),
      attractionRetiree: unitPort('1', 'vector'),
    },
  },

  validate(params): ValidationResult {
    const errors: string[] = [];
    for (const k of ['wEngines', 'wHuman', 'wAccess', 'wRegen', 'wGateway'] as const) {
      const v = params[k];
      if (v !== undefined && (v < 0 || v > 1)) errors.push(`${k} out of [0,1]`);
    }
    for (const k of ['universityThroughputAnnualRetention', 'universityThroughputFloor', 'concentrationSensitivity'] as const) {
      const v = params[k];
      if (v !== undefined && (v < 0 || v > 1)) errors.push(`${k} out of [0,1]`);
    }
    const high = params.concentrationGrowthHigh ?? DEFAULTS.concentrationGrowthHigh;
    const low = params.concentrationGrowthLow ?? DEFAULTS.concentrationGrowthLow;
    if (high <= low) errors.push('concentrationGrowthHigh must exceed concentrationGrowthLow');
    // The per-place mask ablates demographic signal for measurement; the
    // concentration dial reroutes it to institutions. Combining them would
    // reallocate weight that the mask already removed, so it is rejected.
    if (params.demographicAttractionMultiplier && (params.concentrationSensitivity ?? 0) > 0) {
      errors.push('demographicAttractionMultiplier (diagnostic) cannot combine with concentrationSensitivity > 0');
    }
    if (
      (params.concentrationSensitivity ?? 0) > 0 &&
      (params.wEngines ?? 0) + (params.wHuman ?? 0) <= 0
    ) {
      errors.push(
        'wEngines + wHuman must be positive when concentrationSensitivity > 0',
      );
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  },

  mergeParams(partial): AttractionParams {
    return { ...DEFAULTS, ...partial };
  },

  init(params): AttractionState {
    const s = params.statics;
    if (!s) throw new Error('attraction: statics dataset must be provided via params');
    // Pillar composites (internal weights fixed; see METHODOLOGY.md):
    const engines = combine(s, [
      ['eduEmpShare', 0.25], ['healthEmpShare', 0.20], ['pubAdminShare', 0.15],
      ['armedShare', 0.10], ['collegeShare', 0.15], ['logUni15', 0.10], ['logUni60', 0.05],
    ]);
    const universityThroughput = combine(s, [
      ['logUni15', 0.10], ['logUni60', 0.05],
    ]);
    const human = combine(s, [['bachShare', 0.4], ['gradShare', 0.3], ['profInfoFireShare', 0.3]]);
    const access = combine(s, [['logPopAccess60', 0.6], ['logPopAccess120', 0.4]]);
    const regen = combine(s, [['repRatio', 0.6], ['share45_64', -0.4]]);
    const gateway = combine(s, [['foreignShare', 1.0]]);
    const dominance = combine(s, [['domShare', 1.0]]);
    // Structural amenity/scarcity deliberately excludes current prices. This
    // keeps fundamentals separate from starting valuation and avoids treating
    // an already-expensive place as intrinsically more attractive.
    const amenity = combine(s, [['seasonalShare', 0.7], ['artsEmpShare', 0.3]]);
    const scarcity = combine(s, [['logDensity', 0.6], ['newBuildShare', -0.4]]);
    // Akiya gate (Wakayama lesson): amenity stores value only with access,
    // prestige, or institutions. Remote AND low-income places lose up to
    // half their amenity pull; Niseko/Jackson-type remote-prestige is exempt.
    const zInc = s.z.logIncome;
    const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
    for (let i = 0; i < s.n; i++) {
      if (amenity[i] > 0) {
        const remote = clamp01(-access[i] - 0.5);
        const poor = clamp01(-zInc[i]);
        amenity[i] *= 1 - 0.5 * remote * poor;
      }
    }
    const distress = combine(s, [['distressVacancy', 1.0]]);
    const health = combine(s, [['healthEmpShare', 1.0]]);
    // Dynamic feedback normalization anchors
    const pti = new Float64Array(s.n);
    for (let i = 0; i < s.n; i++) pti[i] = s.income0[i] > 0 ? s.price0[i] / s.income0[i] : 4;
    const { mean: pti0Mean, sd: pti0Sd } = meanSd(pti);
    const ys = new Float64Array(s.n);
    for (let i = 0; i < s.n; i++) {
      const tot = s.pop0[i] || 1;
      ys[i] = (s.cohorts0.a20_24[i] + s.cohorts0.a25_44[i]) / tot;
    }
    const { mean: ysMean, sd: ysSd } = meanSd(ys);
    return {
      engines, universityThroughput, human, access, dominance, regen, gateway,
      amenity, scarcity, distress, health, pti0Mean, pti0Sd, ysMean, ysSd,
    };
  },

  step(state, inputs, params, _year, yearIndex) {
    const n = state.engines.length;
    const aW = new Float64Array(n);
    const aR = new Float64Array(n);
    const { laggedPriceToIncome: pti, laggedYoungShare: ys } = inputs;
    const throughputRetention = universityThroughputRetention(
      params.universityThroughputAnnualRetention,
      params.universityThroughputFloor,
      yearIndex,
    );
    const demoMult = params.demographicAttractionMultiplier;
    // Regime-concentration dial: as simulated national working-age growth
    // declines, the demographic weight moves to the institutional terms in
    // proportion to their existing importance, and hinterland consolidation
    // strengthens (hub weight scales 1x -> 2x across the band). shift = 0
    // reproduces the base model exactly.
    const shift = concentrationShift(
      params.concentrationSensitivity, inputs.natWorkingGrowth,
      params.concentrationGrowthHigh, params.concentrationGrowthLow,
    );
    const freed = shift * (params.wRegen + params.wVitality);
    const institutionalWeight = params.wEngines + params.wHuman;
    const enginesSplit = institutionalWeight > 0
      ? params.wEngines / institutionalWeight
      : 0.5;
    const wEngines = params.wEngines + enginesSplit * freed;
    const wHuman = params.wHuman + (1 - enginesSplit) * freed;
    const wHub = params.wHub * (1 + shift);
    const demoScale = 1 - shift;
    for (let i = 0; i < n; i++) {
      const zPti = Math.max(-3, Math.min(6, (pti[i] - state.pti0Mean) / state.pti0Sd));
      const zYs = Math.max(-4, Math.min(4, (ys[i] - state.ysMean) / state.ysSd));
      const dm = (demoMult ? demoMult[i] : 1) * demoScale;
      const engines = state.engines[i]
        + (throughputRetention - 1) * state.universityThroughput[i];
      aW[i] =
        wEngines * engines +
        wHuman * state.human[i] +
        params.wAccess * state.access[i] +
        dm * params.wRegen * state.regen[i] +
        params.wGateway * state.gateway[i] +
        dm * params.wVitality * zYs -
        params.wAfford * zPti -
        params.wDistress * state.distress[i] +
        wHub * Math.max(0, engines) * Math.max(0, state.dominance[i]);
      aR[i] =
        params.rAmenity * state.amenity[i] +
        params.rHealth * state.health[i] +
        params.rScarcity * state.scarcity[i] +
        params.rAccess * state.access[i] -
        params.rAfford * zPti;
    }
    return { state, outputs: { attractionWorking: aW, attractionRetiree: aR } };
  },
});

/**
 * Municipal cohort and housing-market module.
 *
 * Housing demand is anchored to reported occupied units in the start year.
 * A place-specific headship multiplier then carries that observed household
 * structure forward as its age mix changes. This is essential for places with
 * prisons, dormitories, barracks, and other group quarters: residents of those
 * facilities are population, but they do not occupy ordinary housing units.
 */
import { defineModule, ValidationResult } from 'tsimulation';
import { COHORTS, COHORT_RATES, Cohort, DEFAULT_HEADSHIP, PlaceStatics } from '../domain-types.js';

export interface MarketParams {
  statics: PlaceStatics | null;
  kappaPrice: number;
  /** National real house-price drift. All price outputs are real. */
  drift: number;
  elastBase: number;
  elastDensitySlope: number;
  abandonMax: number;
  headship: Record<Cohort, number>;
  targetOccupancy: number;
  secondHomeWealthElast: number;
  /** Annual error-correction speed toward a heuristic price/income anchor.
   * This is a transparent calibration, not an estimate from the OECD paper. */
  ptiReversion: number;
  ptiAnchor: number;
  /** National real household-income growth used to evolve the denominator. */
  realIncomeGrowth: number;
  /** Children accompanying each net working-age migrant. */
  childrenPerMover: number;
}

export interface MarketState {
  cohorts: Record<Cohort, Float64Array>;
  units: Float64Array;
  logPrice: Float64Array;
  income: Float64Array;
  elasticity: Float64Array;
  wealthGate: Float64Array;
  extSupport: Float64Array;
}

export interface MarketInputs {
  internalNetByCohort: Record<Cohort, Float64Array>;
  localNetImmigrationByCohort: Record<Cohort, Float64Array>;
  elderlyWealthIndex: number;
  currentTfr: number;
}

export interface MarketOutputs {
  priceIndexVec: Float64Array;
  priceToIncome: Float64Array;
  youngShareVec: Float64Array;
  workingStock: Float64Array;
  midlifeStock: Float64Array;
  retireeStock: Float64Array;
  stockA0_19: Float64Array;
  stockA20_24: Float64Array;
  stockA25_44: Float64Array;
  stockA45_64: Float64Array;
  stockA65up: Float64Array;
  destinationUnits: Float64Array;
  unitsVec: Float64Array;
  householdsVec: Float64Array;
  incomeVec: Float64Array;
  gapVec: Float64Array;
  popVec: Float64Array;
  birthsTotal: number;
  meanPriceIndex: number;
  medianPriceIndex: number;
  p90PriceIndex: number;
  p10PriceIndex: number;
  shareDecliningReal: number;
}

const DEFAULTS: MarketParams = {
  statics: null,
  kappaPrice: 0.28,
  drift: 0.012,
  elastBase: 0.9,
  elastDensitySlope: 0.35,
  abandonMax: 0.006,
  headship: { ...DEFAULT_HEADSHIP },
  targetOccupancy: 0.96,
  secondHomeWealthElast: 1,
  ptiReversion: 0.025,
  ptiAnchor: 3.6,
  realIncomeGrowth: 0.01,
  childrenPerMover: 0.30,
};

export function impliedHouseholds(
  cohorts: Record<Cohort, number>, headship: Record<Cohort, number>, scale = 1
): number {
  let households = 0;
  for (const cohort of COHORTS) households += headship[cohort] * cohorts[cohort];
  return Math.max(0, scale * households);
}

export function housingDemandUnits(
  households: number, secondHomes: number, targetOccupancy: number
): number {
  return (Math.max(0, households) + Math.max(0, secondHomes)) /
    Math.max(0.5, Math.min(1, targetOccupancy));
}

function quantile(sorted: Float64Array, q: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[idx];
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** One-sided price/income correction. Cheap places do not receive a modeled
 * price subsidy merely because they sit below a heuristic national anchor. */
export function priceToIncomeCorrection(
  logPrice: number, income: number, anchor: number, reversion: number, externalSupport: number
): number {
  const overFundamental = Math.max(
    0,
    logPrice - Math.log(anchor * Math.max(20000, income))
  );
  return -reversion * overFundamental * (1 - clamp01(externalSupport));
}

export const marketModule = defineModule<MarketParams, MarketState, MarketInputs, MarketOutputs>({
  name: 'market',
  description: 'Local cohorts, observed-household demand, supply, and real prices',
  defaults: DEFAULTS,
  inputs: [
    'internalNetByCohort', 'localNetImmigrationByCohort',
    'elderlyWealthIndex', 'currentTfr',
  ],
  outputs: [
    'priceIndexVec', 'priceToIncome', 'youngShareVec', 'workingStock',
    'midlifeStock', 'retireeStock',
    'stockA0_19', 'stockA20_24', 'stockA25_44', 'stockA45_64', 'stockA65up',
    'destinationUnits', 'unitsVec',
    'householdsVec', 'incomeVec', 'gapVec', 'popVec', 'birthsTotal',
    'meanPriceIndex', 'medianPriceIndex', 'p90PriceIndex', 'p10PriceIndex',
    'shareDecliningReal',
  ],

  validate(params): ValidationResult {
    const errors: string[] = [];
    if (params.kappaPrice !== undefined && (params.kappaPrice < 0 || params.kappaPrice > 3)) {
      errors.push('kappaPrice out of [0,3]');
    }
    if (params.elastBase !== undefined && (params.elastBase < 0 || params.elastBase > 5)) {
      errors.push('elastBase out of [0,5]');
    }
    if (params.targetOccupancy !== undefined && (params.targetOccupancy < 0.5 || params.targetOccupancy > 1)) {
      errors.push('targetOccupancy out of [0.5,1]');
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  },

  mergeParams(partial): MarketParams {
    return { ...DEFAULTS, ...partial, headship: { ...DEFAULTS.headship, ...(partial.headship ?? {}) } };
  },

  init(params): MarketState {
    const s = params.statics;
    if (!s) throw new Error('market: statics dataset must be provided via params');
    const cohorts = {} as Record<Cohort, Float64Array>;
    for (const cohort of COHORTS) cohorts[cohort] = Float64Array.from(s.cohorts0[cohort]);
    const units = Float64Array.from(s.units0);
    const income = Float64Array.from(s.income0);
    const logPrice = new Float64Array(s.n);
    const elasticity = new Float64Array(s.n);
    const wealthGate = new Float64Array(s.n);
    const extSupport = new Float64Array(s.n);
    for (let i = 0; i < s.n; i++) {
      logPrice[i] = Math.log(Math.max(1e4, s.price0[i]));
      // Use density and construction scarcity, not the current price level,
      // to avoid making expensive places mechanically supply-constrained.
      const structuralConstraint = 0.65 * s.z.logDensity[i] - 0.35 * s.z.newBuildShare[i];
      elasticity[i] = Math.min(2, Math.max(0.05,
        params.elastBase - params.elastDensitySlope * structuralConstraint));
      wealthGate[i] = 1 - 0.7 * clamp01(-s.z.logPopAccess60[i] - 0.5) * clamp01(-s.z.logIncome[i]);
      // Observable external-demand channels: metro access, institutions,
      // seasonal demand, and high local income. Current prices are excluded.
      extSupport[i] = clamp01(
        0.4 * Math.max(0, s.z.logPopAccess60[i]) +
        0.25 * Math.max(0, s.z.collegeShare[i]) +
        0.2 * Math.max(0, s.z.seasonalShare[i]) +
        0.15 * Math.max(0, s.z.logIncome[i])
      );
    }
    return { cohorts, units, logPrice, income, elasticity, wealthGate, extSupport };
  },

  step(state, inputs, params) {
    const s = params.statics!;
    const n = s.n;
    const { survival: survival, exit } = COHORT_RATES;
    const current = state.cohorts;
    const next = {} as Record<Cohort, Float64Array>;
    for (const cohort of COHORTS) next[cohort] = new Float64Array(n);
    let birthsTotal = 0;

    for (let i = 0; i < n; i++) {
      const womenReproductive = 0.495 *
        (0.25 * current.a0_19[i] + current.a20_24[i] + current.a25_44[i]);
      const births = (inputs.currentTfr / 30) * womenReproductive;
      birthsTotal += births;
      const grad0 = current.a0_19[i] * survival.a0_19 * exit.a0_19;
      const grad20 = current.a20_24[i] * survival.a20_24 * exit.a20_24;
      const grad25 = current.a25_44[i] * survival.a25_44 * exit.a25_44;
      const grad45 = current.a45_64[i] * survival.a45_64 * exit.a45_64;
      const candidates: Record<Cohort, number> = {
        a0_19: current.a0_19[i] * survival.a0_19 - grad0 + births +
          inputs.internalNetByCohort.a0_19[i] + inputs.localNetImmigrationByCohort.a0_19[i],
        a20_24: current.a20_24[i] * survival.a20_24 - grad20 + grad0 +
          inputs.internalNetByCohort.a20_24[i] + inputs.localNetImmigrationByCohort.a20_24[i],
        a25_44: current.a25_44[i] * survival.a25_44 - grad25 + grad20 +
          inputs.internalNetByCohort.a25_44[i] + inputs.localNetImmigrationByCohort.a25_44[i],
        a45_64: current.a45_64[i] * survival.a45_64 - grad45 + grad25 +
          inputs.internalNetByCohort.a45_64[i] + inputs.localNetImmigrationByCohort.a45_64[i],
        a65up: current.a65up[i] * survival.a65up + grad45 +
          inputs.internalNetByCohort.a65up[i] + inputs.localNetImmigrationByCohort.a65up[i],
      };
      for (const cohort of COHORTS) {
        if (candidates[cohort] < -1e-6) {
          throw new Error(`market: migration exceeds ${cohort} stock for ${s.geoid[i]}`);
        }
        next[cohort][i] = Math.max(0, candidates[cohort]);
      }
    }

    const priceIndexVec = new Float64Array(n);
    const priceToIncome = new Float64Array(n);
    const youngShareVec = new Float64Array(n);
    const workingStock = new Float64Array(n);
    const midlifeStock = new Float64Array(n);
    const retireeStock = new Float64Array(n);
    const nextUnits = new Float64Array(n);
    const householdsVec = new Float64Array(n);
    const nextIncome = new Float64Array(n);
    const nextLogPrice = new Float64Array(n);
    const gapVec = new Float64Array(n);
    const popVec = new Float64Array(n);
    const wealth = Math.pow(inputs.elderlyWealthIndex, params.secondHomeWealthElast);
    let meanPriceIndex = 0;
    let declining = 0;

    for (let i = 0; i < n; i++) {
      const localCohorts = {} as Record<Cohort, number>;
      for (const cohort of COHORTS) localCohorts[cohort] = next[cohort][i];
      const households = impliedHouseholds(localCohorts, params.headship, s.headshipScale[i]);
      const secondHomes0 = s.seasonalShare[i] * s.observedUnits0[i];
      const secondHomes = secondHomes0 * (1 + (wealth - 1) * state.wealthGate[i]);
      const demandUnits = housingDemandUnits(households, secondHomes, params.targetOccupancy);
      const gap = Math.log(Math.max(1, demandUnits) / Math.max(1, state.units[i]));
      const boundedGap = Math.max(-1.5, Math.min(1.5, gap));
      const build = boundedGap > 0 ? state.elasticity[i] * 0.35 * boundedGap : 0;
      const abandon = boundedGap < -0.15
        ? params.abandonMax * Math.min(1, (-boundedGap - 0.15) / 0.6)
        : 0;
      nextUnits[i] = Math.max(1, state.units[i] * (1 + build - abandon));
      nextIncome[i] = Math.max(1, state.income[i] * (1 + params.realIncomeGrowth));

      nextLogPrice[i] = state.logPrice[i] + params.drift + params.kappaPrice * 0.5 * boundedGap -
        0.5 * build + priceToIncomeCorrection(
          state.logPrice[i], state.income[i], params.ptiAnchor,
          params.ptiReversion, state.extSupport[i]
        );

      const pop = COHORTS.reduce((total, cohort) => total + next[cohort][i], 0);
      const priceIndex = Math.exp(nextLogPrice[i] - Math.log(Math.max(1e4, s.price0[i])));
      popVec[i] = pop;
      priceIndexVec[i] = priceIndex;
      priceToIncome[i] = Math.exp(nextLogPrice[i]) / nextIncome[i];
      youngShareVec[i] = pop > 0 ? (next.a20_24[i] + next.a25_44[i]) / pop : 0;
      workingStock[i] = next.a20_24[i] + next.a25_44[i];
      midlifeStock[i] = next.a45_64[i];
      retireeStock[i] = next.a65up[i];
      householdsVec[i] = households;
      gapVec[i] = boundedGap;
      meanPriceIndex += priceIndex;
      if (priceIndex < 1) declining++;
    }

    const sorted = Float64Array.from(priceIndexVec).sort();
    meanPriceIndex /= Math.max(1, n);
    return {
      state: {
        ...state,
        cohorts: next,
        units: nextUnits,
        income: nextIncome,
        logPrice: nextLogPrice,
      },
      outputs: {
        priceIndexVec,
        priceToIncome,
        youngShareVec,
        workingStock,
        midlifeStock,
        retireeStock,
        stockA0_19: next.a0_19,
        stockA20_24: next.a20_24,
        stockA25_44: next.a25_44,
        stockA45_64: next.a45_64,
        stockA65up: next.a65up,
        destinationUnits: nextUnits,
        unitsVec: nextUnits,
        householdsVec,
        incomeVec: nextIncome,
        gapVec,
        popVec,
        birthsTotal,
        meanPriceIndex,
        medianPriceIndex: quantile(sorted, 0.5),
        p90PriceIndex: quantile(sorted, 0.9),
        p10PriceIndex: quantile(sorted, 0.1),
        shareDecliningReal: declining / Math.max(1, n),
      },
    };
  },
});

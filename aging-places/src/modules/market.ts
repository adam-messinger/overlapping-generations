/**
 * Market module: local cohort aging, household demand (incl. second homes
 * funded by elderly wealth), supply response with density/scarcity-dependent
 * elasticity, and the resulting price index per municipality.
 *
 * Key dynamics from the international evidence:
 *  - supply elasticity interacts with demand direction (Tokyo vs Daegu):
 *    elastic supply moderates winner prices and deepens loser declines;
 *  - abandonment: units decay slowly where demand gap is deeply negative
 *    (akiya/Stadtumbau channel);
 *  - second-home demand scales with national elderly wealth and local
 *    amenity (seasonalShare), decoupling amenity markets from local cohorts.
 */
import { defineModule } from '../../../src/framework/index.js';
import type { ValidationResult } from '../../../src/framework/index.js';
import { COHORTS, Cohort, PlaceStatics } from '../domain-types.js';
import { COHORT_RATES } from './nation.js';

export interface MarketParams {
  statics: PlaceStatics | null;
  /** Price response to demand gap (log units / yr). */
  kappaPrice: number;
  /** National real price drift (yr). */
  drift: number;
  /** Base supply elasticity (log units growth per unit positive gap). */
  elastBase: number;
  /** Elasticity reduction per s.d. of density/scarcity. */
  elastDensitySlope: number;
  /** Max abandonment rate when gap is deeply negative (units/yr). */
  abandonMax: number;
  /** Headship rates per cohort (household heads per person). */
  headship: Record<Cohort, number>;
  /** Second-home demand: wealth elasticity. */
  secondHomeWealthElast: number;
  /** Price-to-income error correction (yr^-1): prices above the local-income
   * fundamental revert unless supported by external wealth (prestige) or
   * metro access. Caldera & Johansson (OECD 2013) estimate 2-5%/yr. */
  ptiReversion: number;
  /** Long-run US median price-to-income anchor (JCHS/Shiller ~3.5-4). */
  ptiAnchor: number;
  /** TFR passed through for local births (kept equal to nation.tfr). */
  tfr: number;
  /** Children accompanying each net working-age migrant. */
  childrenPerMover: number;
}

export interface MarketState {
  cohorts: Record<Cohort, Float64Array>;
  units: Float64Array;
  logPrice: Float64Array; // log price level ($)
  elasticity: Float64Array;
  /** Akiya gate on second-home wealth growth: remote AND low-income places
   * don't capture growing elderly wealth (Wakayama vs Niseko). */
  wealthGate: Float64Array;
  /** External support for above-fundamental prices (prestige, metro access);
   * 1 = fully supported (no error correction), 0 = local incomes must carry. */
  extSupport: Float64Array;
}

export interface MarketInputs {
  netWorking: Float64Array;
  netRetiree: Float64Array;
  elderlyWealthIndex: number;
}

export interface MarketOutputs {
  priceIndexVec: Float64Array;   // P / P0
  priceToIncome: Float64Array;
  youngShareVec: Float64Array;
  workingStock: Float64Array;
  retireeMass: Float64Array;     // housing stock (retiree destination mass)
  unitsVec: Float64Array;
  gapVec: Float64Array;
  popVec: Float64Array;
  // National aggregates for collectors
  meanPriceIndex: number;
  medianPriceIndex: number;
  p90PriceIndex: number;
  p10PriceIndex: number;
  shareDecliningNominal: number;
}

const DEFAULTS: MarketParams = {
  statics: null,
  kappaPrice: 0.28,        // calibrated so hindcast 2000-25 cross-sectional dispersion matches ZHVI (see METHODOLOGY)
  drift: 0.012,            // long-run US real house price drift ~1.2%/yr, Shiller series
  elastBase: 0.9,          // Saiz (2010): mean metro supply elasticity ~1.75 over decadal horizons; annualized response here
  elastDensitySlope: 0.35, // Saiz: elasticity falls with density & geographic constraint
  abandonMax: 0.006,       // ~0.6%/yr stock decay in deep-surplus markets (akiya/Stadtumbau analog)
  headship: { a0_19: 0.0, a20_24: 0.38, a25_44: 0.50, a45_64: 0.56, a65up: 0.63 }, // Census HH headship 2023
  secondHomeWealthElast: 1.0,
  ptiReversion: 0.025,
  ptiAnchor: 3.6,
  tfr: 1.62,
  childrenPerMover: 0.30,  // ACS: children per 25-44 cross-county migrant household
};

function quantile(sorted: Float64Array, q: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[idx];
}

export const marketModule = defineModule<MarketParams, MarketState, MarketInputs, MarketOutputs>({
  name: 'market',
  description: 'Local cohorts, housing demand/supply, price formation',
  defaults: DEFAULTS,
  inputs: ['netWorking', 'netRetiree', 'elderlyWealthIndex'],
  outputs: [
    'priceIndexVec', 'priceToIncome', 'youngShareVec', 'workingStock', 'retireeMass',
    'unitsVec', 'gapVec', 'popVec',
    'meanPriceIndex', 'medianPriceIndex', 'p90PriceIndex', 'p10PriceIndex', 'shareDecliningNominal',
  ],

  validate(params): ValidationResult {
    const errors: string[] = [];
    if (params.kappaPrice !== undefined && (params.kappaPrice < 0 || params.kappaPrice > 3)) {
      errors.push('kappaPrice out of [0,3]');
    }
    if (params.elastBase !== undefined && (params.elastBase < 0 || params.elastBase > 5)) {
      errors.push('elastBase out of [0,5]');
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  },

  mergeParams(partial): MarketParams {
    return { ...DEFAULTS, ...partial, headship: { ...DEFAULTS.headship, ...(partial.headship ?? {}) } };
  },

  init(params): MarketState {
    const s = params.statics;
    if (!s) throw new Error('market: statics dataset must be provided via params');
    const n = s.n;
    const cohorts = {} as Record<Cohort, Float64Array>;
    for (const c of COHORTS) cohorts[c] = Float64Array.from(s.cohorts0[c]);
    const units = Float64Array.from(s.units0);
    const logPrice = new Float64Array(n);
    for (let i = 0; i < n; i++) logPrice[i] = Math.log(Math.max(1e4, s.price0[i]));
    // Supply elasticity: falls with density and prestige-scarcity (Saiz 2010
    // logic). Poverty-driven value/income does not imply constrained supply.
    const elasticity = new Float64Array(n);
    const zd = s.z.logDensity;
    const zv = s.z.prestigeVTI;
    const wealthGate = new Float64Array(n);
    const extSupport = new Float64Array(n);
    const za = s.z.logPopAccess60;
    const zi = s.z.logIncome;
    const zc = s.z.collegeShare;
    const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
    for (let i = 0; i < n; i++) {
      elasticity[i] = Math.min(2.0, Math.max(0.05,
        params.elastBase - params.elastDensitySlope * (0.6 * zd[i] + 0.4 * zv[i])));
      wealthGate[i] = 1 - 0.7 * clamp01(-za[i] - 0.5) * clamp01(-zi[i]);
      // External support: prestige wealth, metro access, or a university —
      // student towns' median incomes are compositionally depressed, but
      // their prices are carried by external (tuition/parental) money.
      extSupport[i] = clamp01(0.5 * Math.max(0, zv[i]) + 0.5 * Math.max(0, za[i]) + 0.5 * Math.max(0, zc[i]));
    }
    return { cohorts, units, logPrice, elasticity, wealthGate, extSupport };
  },

  step(state, inputs, params, _year, _yearIndex) {
    const s = params.statics!;
    const n = s.n;
    const { survival: sv, exit: ex } = COHORT_RATES;
    const c = state.cohorts;
    const next = {} as Record<Cohort, Float64Array>;
    for (const k of COHORTS) next[k] = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const womenReproductive = 0.495 * (0.25 * c.a0_19[i] + c.a20_24[i] + c.a25_44[i]);
      const births = (params.tfr / 30) * womenReproductive;
      const grad0 = c.a0_19[i] * sv.a0_19 * ex.a0_19;
      const grad20 = c.a20_24[i] * sv.a20_24 * ex.a20_24;
      const grad25 = c.a25_44[i] * sv.a25_44 * ex.a25_44;
      const grad45 = c.a45_64[i] * sv.a45_64 * ex.a45_64;
      const netW = inputs.netWorking[i];
      const netR = inputs.netRetiree[i];
      next.a0_19[i] = Math.max(0, c.a0_19[i] * sv.a0_19 - grad0 + births + params.childrenPerMover * netW);
      next.a20_24[i] = Math.max(0, c.a20_24[i] * sv.a20_24 - grad20 + grad0 + 0.25 * netW);
      next.a25_44[i] = Math.max(0, c.a25_44[i] * sv.a25_44 - grad25 + grad20 + 0.75 * netW);
      next.a45_64[i] = Math.max(0, c.a45_64[i] * sv.a45_64 - grad45 + grad25);
      next.a65up[i] = Math.max(0, c.a65up[i] * sv.a65up + grad45 + netR);
    }

    const priceIndexVec = new Float64Array(n);
    const priceToIncome = new Float64Array(n);
    const youngShareVec = new Float64Array(n);
    const workingStock = new Float64Array(n);
    const retireeMass = new Float64Array(n);
    const unitsVec = new Float64Array(n);
    const gapVec = new Float64Array(n);
    const popVec = new Float64Array(n);
    const wealth = Math.pow(inputs.elderlyWealthIndex, params.secondHomeWealthElast);

    for (let i = 0; i < n; i++) {
      // Demand: households + second homes + ~4% frictional vacancy target
      let households = 0;
      for (const k of COHORTS) households += params.headship[k] * next[k][i];
      const secondHomes = s.seasonalShare[i] * s.units0[i] * (1 + (wealth - 1) * state.wealthGate[i]);
      const demandUnits = (households + secondHomes) / 0.96;
      const gap = Math.log(Math.max(1, demandUnits) / Math.max(1, state.units[i]));
      const gapC = Math.max(-1.5, Math.min(1.5, gap));

      // Supply response: build when gap>0 (per elasticity), decay slowly when deeply negative
      const build = gapC > 0 ? state.elasticity[i] * 0.35 * gapC : 0;
      const abandon = gapC < -0.15 ? params.abandonMax * Math.min(1, (-gapC - 0.15) / 0.6) : 0;
      state.units[i] = state.units[i] * (1 + build - abandon);

      // Price: responds to gap net of the supply that will relieve it,
      // with income-anchored error correction where external support is weak
      const overFundamental = Math.max(0,
        state.logPrice[i] - Math.log(params.ptiAnchor * Math.max(20000, s.income0[i])));
      state.logPrice[i] += params.drift + params.kappaPrice * 0.5 * gapC - 0.5 * build
        - params.ptiReversion * overFundamental * (1 - state.extSupport[i]);

      const pop =
        next.a0_19[i] + next.a20_24[i] + next.a25_44[i] + next.a45_64[i] + next.a65up[i];
      popVec[i] = pop;
      priceIndexVec[i] = Math.exp(state.logPrice[i] - Math.log(Math.max(1e4, s.price0[i])));
      priceToIncome[i] = s.income0[i] > 0 ? Math.exp(state.logPrice[i]) / s.income0[i] : 4;
      youngShareVec[i] = pop > 0 ? (next.a20_24[i] + next.a25_44[i]) / pop : 0;
      workingStock[i] = next.a20_24[i] + next.a25_44[i];
      retireeMass[i] = state.units[i];
      unitsVec[i] = state.units[i];
      gapVec[i] = gapC;
    }

    const sortedIdx = Float64Array.from(priceIndexVec).sort();
    let declining = 0;
    for (let i = 0; i < n; i++) if (priceIndexVec[i] < 1) declining++;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += priceIndexVec[i];
    mean /= n;

    return {
      state: { ...state, cohorts: next },
      outputs: {
        priceIndexVec, priceToIncome, youngShareVec, workingStock, retireeMass,
        unitsVec, gapVec, popVec,
        meanPriceIndex: mean,
        medianPriceIndex: quantile(sortedIdx, 0.5),
        p90PriceIndex: quantile(sortedIdx, 0.9),
        p10PriceIndex: quantile(sortedIdx, 0.1),
        shareDecliningNominal: declining / n,
      },
    };
  },
});

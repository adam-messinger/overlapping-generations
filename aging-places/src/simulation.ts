/**
 * Composition root for the aging-places municipal simulation.
 *
 * Reuses the generic engine from src/framework (autowire: modules declare
 * inputs/outputs; lags break the attraction<->market feedback loop exactly as
 * the energy simulation does for damages/LCOE).
 *
 * Two entry points:
 *   runAgingSim({epoch: '2023'}) — 2025->2065 forecast
 *   runAgingSim({epoch: '2000'}) — 2000->2025 hindcast (validation)
 */
import { initAutowired, stepAutowired, LagConfig } from 'tsimulation';
import { COHORTS, Cohort, DEFAULT_HEADSHIP } from './domain-types.js';
import { EpochData, loadEpoch } from './data.js';
import { nationModule, NationParams } from './modules/nation.js';
import { attractionModule } from './modules/attraction.js';
import { migrationModule } from './modules/migration.js';
import { marketModule } from './modules/market.js';

export interface AgingSimConfig {
  epoch: '2000' | '2023';
  years?: number;
  params?: Record<string, Record<string, unknown>>;
  minPop?: number;
}

export interface AgingSimResult {
  data: EpochData;
  years: number[];
  /** Real log house-price growth start->end per place. */
  simRealLogGrowth: Float64Array;
  finalPriceIndex: Float64Array;
  finalPop: Float64Array;
  finalYoungShare: Float64Array;
  finalCohorts: Record<Cohort, Float64Array>;
  national: {
    meanPriceIndex: number[];
    medianPriceIndex: number[];
    p90PriceIndex: number[];
    p10PriceIndex: number[];
    shareDecliningReal: number[];
    natPop65Share: number[];
    localNetImmigration: number[];
    internalMigrationResidual: number[];
    unmetInternalMigration: number[];
    unmetInternationalExit: number[];
  };
}

/** National cohort start values (millions) per epoch.
 * 2000: Census 2000 SF1; 2025: Census Bureau vintage-2024 estimates. */
const NATION_START: Record<'2000' | '2023', NationParams['startCohortsM']> = {
  '2000': { a0_19: 80.5, a20_24: 18.9, a25_44: 85.0, a45_64: 61.9, a65up: 35.0 },
  '2023': { a0_19: 80.5, a20_24: 21.9, a25_44: 90.3, a45_64: 82.7, a65up: 59.3 },
};
/** Demographic paths per epoch (historical approximation vs current outlook). */
const NATION_DYNAMICS: Record<'2000' | '2023', Pick<NationParams,
  'tfrStart' | 'tfrLongRun' | 'tfrConvergenceYear' |
  'netImmigrationStart' | 'netImmigrationLongRun' | 'immigrationConvergenceYear'
>> = {
  '2000': {
    tfrStart: 2.056, tfrLongRun: 1.62, tfrConvergenceYear: 2025,
    netImmigrationStart: 1.05e6, netImmigrationLongRun: 1.05e6, immigrationConvergenceYear: 2025,
  },
  '2023': {
    tfrStart: 1.5995, tfrLongRun: 1.53, tfrConvergenceYear: 2035,
    netImmigrationStart: 0.41e6, netImmigrationLongRun: 1.2e6, immigrationConvergenceYear: 2035,
  },
};

export function runAgingSim(cfg: AgingSimConfig): AgingSimResult {
  const file = cfg.epoch === '2000' ? 'features2000.csv' : 'features2023.csv';
  const requestedHeadship = cfg.params?.market?.headship as Partial<Record<Cohort, number>> | undefined;
  const headship: Record<Cohort, number> = { ...DEFAULT_HEADSHIP, ...(requestedHeadship ?? {}) };
  const data = loadEpoch(file, cfg.minPop ?? 250, headship);
  const s = data.statics;
  const years = cfg.years ?? (cfg.epoch === '2000' ? 25 : 40);
  const startYear = cfg.epoch === '2000' ? 2000 : 2025;

  // Initial vectors for lag seeds
  const working0 = new Float64Array(s.n);
  const midlife0 = new Float64Array(s.n);
  const retiree0 = new Float64Array(s.n);
  const young0 = new Float64Array(s.n);
  const pti0 = new Float64Array(s.n);
  for (let i = 0; i < s.n; i++) {
    working0[i] = s.cohorts0.a20_24[i] + s.cohorts0.a25_44[i];
    midlife0[i] = s.cohorts0.a45_64[i];
    retiree0[i] = s.cohorts0.a65up[i];
    young0[i] = s.pop0[i] > 0 ? working0[i] / s.pop0[i] : 0;
    pti0[i] = s.income0[i] > 0 ? s.price0[i] / s.income0[i] : 4;
  }

  const lags: Record<string, LagConfig> = {
    laggedPriceToIncome: { source: 'priceToIncome', delay: 1, initial: pti0 },
    laggedYoungShare: { source: 'youngShareVec', delay: 1, initial: young0 },
    laggedWorkingStock: { source: 'workingStock', delay: 1, initial: working0 },
    laggedMidlifeStock: { source: 'midlifeStock', delay: 1, initial: midlife0 },
    laggedRetireeStock: { source: 'retireeStock', delay: 1, initial: retiree0 },
    laggedDestinationUnits: { source: 'destinationUnits', delay: 1, initial: Float64Array.from(s.units0) },
    laggedA0_19Stock: { source: 'stockA0_19', delay: 1, initial: Float64Array.from(s.cohorts0.a0_19) },
    laggedA20_24Stock: { source: 'stockA20_24', delay: 1, initial: Float64Array.from(s.cohorts0.a20_24) },
    laggedA25_44Stock: { source: 'stockA25_44', delay: 1, initial: Float64Array.from(s.cohorts0.a25_44) },
    laggedA45_64Stock: { source: 'stockA45_64', delay: 1, initial: Float64Array.from(s.cohorts0.a45_64) },
    laggedA65upStock: { source: 'stockA65up', delay: 1, initial: Float64Array.from(s.cohorts0.a65up) },
  };

  const nationEpoch = {
    startCohortsM: NATION_START[cfg.epoch],
    ...NATION_DYNAMICS[cfg.epoch],
  };
  const immigrationCoverageByCohort = {} as Record<Cohort, number>;
  for (const cohort of COHORTS) {
    let modeled = 0;
    for (let i = 0; i < s.n; i++) modeled += s.cohorts0[cohort][i];
    immigrationCoverageByCohort[cohort] = Math.max(0, Math.min(1,
      modeled / Math.max(1, NATION_START[cfg.epoch][cohort] * 1e6)
    ));
  }

  const state = initAutowired({
    modules: [nationModule, attractionModule, migrationModule, marketModule],
    lags,
    params: {
      nation: { ...nationEpoch, ...(cfg.params?.nation ?? {}) },
      attraction: { statics: s, ...(cfg.params?.attraction ?? {}) },
      migration: {
        immigrationCoverageByCohort,
        childrenPerMover: cfg.params?.market?.childrenPerMover ?? 0.30,
        ...(cfg.params?.migration ?? {}),
      },
      market: { statics: s, ...(cfg.params?.market ?? {}) },
    },
    startYear,
    endYear: startYear + years - 1,
  });

  const national: AgingSimResult['national'] = {
    meanPriceIndex: [], medianPriceIndex: [], p90PriceIndex: [], p10PriceIndex: [],
    shareDecliningReal: [], natPop65Share: [], localNetImmigration: [], internalMigrationResidual: [],
    unmetInternalMigration: [], unmetInternationalExit: [],
  };
  let last: Record<string, unknown> = {};
  const simYears: number[] = [];
  while (state.currentYear <= state.endYear) {
    const { year, outputs } = stepAutowired(state);
    simYears.push(year);
    last = outputs;
    national.meanPriceIndex.push(outputs.meanPriceIndex as number);
    national.medianPriceIndex.push(outputs.medianPriceIndex as number);
    national.p90PriceIndex.push(outputs.p90PriceIndex as number);
    national.p10PriceIndex.push(outputs.p10PriceIndex as number);
    national.shareDecliningReal.push(outputs.shareDecliningReal as number);
    national.localNetImmigration.push(outputs.internationalNetTotal as number);
    national.internalMigrationResidual.push(outputs.internalNetTotal as number);
    national.unmetInternalMigration.push(outputs.unmetInternalMigrationTotal as number);
    national.unmetInternationalExit.push(outputs.unmetInternationalExitTotal as number);
    const nat = outputs.natCohorts as Record<Cohort, number>;
    let tot = 0;
    for (const c of COHORTS) tot += nat[c];
    national.natPop65Share.push(nat.a65up / tot);
  }

  const finalPriceIndex = last.priceIndexVec as Float64Array;
  const finalPop = last.popVec as Float64Array;
  const finalYoungShare = last.youngShareVec as Float64Array;
  const simRealLogGrowth = new Float64Array(s.n);
  for (let i = 0; i < s.n; i++) simRealLogGrowth[i] = Math.log(Math.max(1e-9, finalPriceIndex[i]));
  const finalCohorts = {} as Record<Cohort, Float64Array>;
  const marketState = state.stateMap.get('market') as { cohorts: Record<Cohort, Float64Array> };
  for (const cohort of COHORTS) finalCohorts[cohort] = Float64Array.from(marketState.cohorts[cohort]);

  return {
    data, years: simYears, simRealLogGrowth, finalPriceIndex, finalPop,
    finalYoungShare, finalCohorts, national,
  };
}

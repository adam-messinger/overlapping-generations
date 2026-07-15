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
import { initAutowired, stepAutowired, LagConfig } from '../../src/framework/index.js';
import { COHORTS, Cohort } from './domain-types.js';
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
  /** log price growth start->end per place */
  simLogGrowth: Float64Array;
  finalPriceIndex: Float64Array;
  finalPop: Float64Array;
  finalYoungShare: Float64Array;
  national: {
    meanPriceIndex: number[];
    medianPriceIndex: number[];
    p90PriceIndex: number[];
    p10PriceIndex: number[];
    shareDecliningNominal: number[];
    natPop65Share: number[];
  };
}

/** National cohort start values (millions) per epoch.
 * 2000: Census 2000 SF1; 2025: Census Bureau vintage-2024 estimates. */
const NATION_START: Record<'2000' | '2023', NationParams['startCohortsM']> = {
  '2000': { a0_19: 80.5, a20_24: 18.9, a25_44: 85.0, a45_64: 61.9, a65up: 35.0 },
  '2023': { a0_19: 80.5, a20_24: 21.9, a25_44: 90.3, a45_64: 82.7, a65up: 59.3 },
};
/** TFR and net immigration per epoch (2000s realized vs CBO forward). */
const NATION_DYNAMICS: Record<'2000' | '2023', { tfr: number; netImmigration: number }> = {
  '2000': { tfr: 2.0, netImmigration: 1.05e6 }, // realized 2000s: TFR ~2.0, NIM ~1M/yr
  '2023': { tfr: 1.62, netImmigration: 1.1e6 }, // CDC 2024, CBO 2025 outlook
};

export function runAgingSim(cfg: AgingSimConfig): AgingSimResult {
  const file = cfg.epoch === '2000' ? 'features2000.csv' : 'features2023.csv';
  const data = loadEpoch(file, cfg.minPop ?? 250);
  const s = data.statics;
  const years = cfg.years ?? (cfg.epoch === '2000' ? 25 : 40);
  const startYear = cfg.epoch === '2000' ? 2000 : 2025;

  // Initial vectors for lag seeds
  const working0 = new Float64Array(s.n);
  const young0 = new Float64Array(s.n);
  const pti0 = new Float64Array(s.n);
  for (let i = 0; i < s.n; i++) {
    working0[i] = s.cohorts0.a20_24[i] + s.cohorts0.a25_44[i];
    young0[i] = s.pop0[i] > 0 ? working0[i] / s.pop0[i] : 0;
    pti0[i] = s.income0[i] > 0 ? s.price0[i] / s.income0[i] : 4;
  }

  const lags: Record<string, LagConfig> = {
    laggedPriceToIncome: { source: 'priceToIncome', delay: 1, initial: pti0 },
    laggedYoungShare: { source: 'youngShareVec', delay: 1, initial: young0 },
    laggedWorkingStock: { source: 'workingStock', delay: 1, initial: working0 },
    laggedRetireeMass: { source: 'unitsVec', delay: 1, initial: Float64Array.from(s.units0) },
  };

  const nationEpoch = {
    startCohortsM: NATION_START[cfg.epoch],
    ...NATION_DYNAMICS[cfg.epoch],
  };

  const state = initAutowired({
    modules: [nationModule, attractionModule, migrationModule, marketModule],
    lags,
    params: {
      nation: { ...nationEpoch, ...(cfg.params?.nation ?? {}) },
      attraction: { statics: s, ...(cfg.params?.attraction ?? {}) },
      migration: { ...(cfg.params?.migration ?? {}) },
      market: { statics: s, tfr: nationEpoch.tfr, ...(cfg.params?.market ?? {}) },
    },
    startYear,
    endYear: startYear + years - 1,
  });

  const national: AgingSimResult['national'] = {
    meanPriceIndex: [], medianPriceIndex: [], p90PriceIndex: [], p10PriceIndex: [],
    shareDecliningNominal: [], natPop65Share: [],
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
    national.shareDecliningNominal.push(outputs.shareDecliningNominal as number);
    const nat = outputs.natCohorts as Record<Cohort, number>;
    let tot = 0;
    for (const c of COHORTS) tot += nat[c];
    national.natPop65Share.push(nat.a65up / tot);
  }

  const finalPriceIndex = last.priceIndexVec as Float64Array;
  const finalPop = last.popVec as Float64Array;
  const finalYoungShare = last.youngShareVec as Float64Array;
  const simLogGrowth = new Float64Array(s.n);
  for (let i = 0; i < s.n; i++) simLogGrowth[i] = Math.log(Math.max(1e-9, finalPriceIndex[i]));

  return { data, years: simYears, simLogGrowth, finalPriceIndex, finalPop, finalYoungShare, national };
}

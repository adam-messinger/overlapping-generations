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
import {
  auditConnectorContracts,
  initAutowired,
  stepAutowired,
  unitPort,
  type AnyModule,
  type LagConfig,
} from 'tsimulation';
import { COHORTS, Cohort, DEFAULT_HEADSHIP } from './domain-types.js';
import { EpochData, loadEpoch } from './data.js';
import { nationModule, NationParams } from './modules/nation.js';
import { attractionModule } from './modules/attraction.js';
import { migrationModule } from './modules/migration.js';
import { marketModule } from './modules/market.js';
import {
  assertNationalMacroPath,
  type NationalMacroPath,
} from './macro-path.js';

export interface AgingSimConfig {
  epoch: '2000' | '2023';
  years?: number;
  params?: Record<string, Record<string, unknown>>;
  minPop?: number;
  /** Optional audited annual macro path. Existing standalone behavior remains
   * the default when this is absent. */
  macroPath?: NationalMacroPath;
}

export interface AgingSimResult {
  data: EpochData;
  years: number[];
  /** Real log house-price growth start->end per place. */
  simRealLogGrowth: Float64Array;
  finalPriceIndex: Float64Array;
  finalPop: Float64Array;
  finalIncome: Float64Array;
  finalYoungShare: Float64Array;
  finalCohorts: Record<Cohort, Float64Array>;
  macroPath: NationalMacroPath | null;
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

export const AGING_MODULES: AnyModule[] = [
  nationModule,
  attractionModule,
  migrationModule,
  marketModule,
];

interface AgingLagSeeds {
  priceToIncome: Float64Array;
  youngShare: Float64Array;
  working: Float64Array;
  midlife: Float64Array;
  retiree: Float64Array;
  destinationUnits: Float64Array;
  cohorts: Record<Cohort, Float64Array>;
}

function buildAgingLags(seeds: AgingLagSeeds): Record<string, LagConfig> {
  return {
    laggedPriceToIncome: {
      source: 'priceToIncome',
      delay: 1,
      initial: seeds.priceToIncome,
      contract: unitPort('year', 'vector'),
    },
    laggedYoungShare: {
      source: 'youngShareVec',
      delay: 1,
      initial: seeds.youngShare,
      contract: unitPort('fraction', 'vector'),
    },
    laggedWorkingStock: {
      source: 'workingStock',
      delay: 1,
      initial: seeds.working,
      contract: unitPort('people', 'vector'),
    },
    laggedMidlifeStock: {
      source: 'midlifeStock',
      delay: 1,
      initial: seeds.midlife,
      contract: unitPort('people', 'vector'),
    },
    laggedRetireeStock: {
      source: 'retireeStock',
      delay: 1,
      initial: seeds.retiree,
      contract: unitPort('people', 'vector'),
    },
    laggedDestinationUnits: {
      source: 'destinationUnits',
      delay: 1,
      initial: seeds.destinationUnits,
      contract: unitPort('housing-unit', 'vector'),
    },
    laggedA0_19Stock: {
      source: 'stockA0_19',
      delay: 1,
      initial: seeds.cohorts.a0_19,
      contract: unitPort('people', 'vector'),
    },
    laggedA20_24Stock: {
      source: 'stockA20_24',
      delay: 1,
      initial: seeds.cohorts.a20_24,
      contract: unitPort('people', 'vector'),
    },
    laggedA25_44Stock: {
      source: 'stockA25_44',
      delay: 1,
      initial: seeds.cohorts.a25_44,
      contract: unitPort('people', 'vector'),
    },
    laggedA45_64Stock: {
      source: 'stockA45_64',
      delay: 1,
      initial: seeds.cohorts.a45_64,
      contract: unitPort('people', 'vector'),
    },
    laggedA65upStock: {
      source: 'stockA65up',
      delay: 1,
      initial: seeds.cohorts.a65up,
      contract: unitPort('people', 'vector'),
    },
  };
}

/** Static unit/shape coverage for the aging-city composition root. */
export function auditAgingUnitContracts() {
  const scalar = () => Float64Array.of(1);
  return auditConnectorContracts(
    AGING_MODULES,
    {},
    buildAgingLags({
      priceToIncome: scalar(),
      youngShare: scalar(),
      working: scalar(),
      midlife: scalar(),
      retiree: scalar(),
      destinationUnits: scalar(),
      cohorts: {
        a0_19: scalar(),
        a20_24: scalar(),
        a25_44: scalar(),
        a45_64: scalar(),
        a65up: scalar(),
      },
    }),
  );
}

export function runAgingSim(cfg: AgingSimConfig): AgingSimResult {
  const years = cfg.years ?? (cfg.epoch === '2000' ? 25 : 40);
  if (!Number.isInteger(years) || years < 1 || years > 100) {
    throw new Error('aging simulation years out of [1,100]');
  }
  const startYear = cfg.epoch === '2000' ? 2000 : 2025;
  if (cfg.macroPath) {
    assertNationalMacroPath(cfg.macroPath, startYear, startYear + years - 1);
  }
  const file = cfg.epoch === '2000' ? 'features2000.csv' : 'features2023.csv';
  const requestedHeadship = cfg.params?.market?.headship as Partial<Record<Cohort, number>> | undefined;
  const headship: Record<Cohort, number> = { ...DEFAULT_HEADSHIP, ...(requestedHeadship ?? {}) };
  const data = loadEpoch(file, cfg.minPop ?? 250, headship);
  const s = data.statics;

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

  const lags = buildAgingLags({
    priceToIncome: pti0,
    youngShare: young0,
    working: working0,
    midlife: midlife0,
    retiree: retiree0,
    destinationUnits: Float64Array.from(s.units0),
    cohorts: {
      a0_19: Float64Array.from(s.cohorts0.a0_19),
      a20_24: Float64Array.from(s.cohorts0.a20_24),
      a25_44: Float64Array.from(s.cohorts0.a25_44),
      a45_64: Float64Array.from(s.cohorts0.a45_64),
      a65up: Float64Array.from(s.cohorts0.a65up),
    },
  });

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
  const macroMarketParams: Record<string, unknown> = {};
  if (cfg.macroPath) {
    const realIncomeGrowthPath: Record<number, number> = {};
    const realHousePriceDriftPath: Record<number, number> = {};
    for (const [year, point] of Object.entries(cfg.macroPath.points)) {
      const numericYear = Number(year);
      realIncomeGrowthPath[numericYear] = point.realIncomeGrowth;
      realHousePriceDriftPath[numericYear] = point.realHousePriceDrift;
    }
    macroMarketParams.realIncomeGrowthPath = realIncomeGrowthPath;
    macroMarketParams.realHousePriceDriftPath = realHousePriceDriftPath;
  }

  const state = initAutowired({
    modules: AGING_MODULES,
    lags,
    params: {
      nation: { ...nationEpoch, ...(cfg.params?.nation ?? {}) },
      attraction: { statics: s, ...(cfg.params?.attraction ?? {}) },
      migration: {
        immigrationCoverageByCohort,
        childrenPerMover: cfg.params?.market?.childrenPerMover ?? 0.30,
        ...(cfg.params?.migration ?? {}),
      },
      // A supplied macro path owns the two annual macro rates. Other market
      // overrides remain available through cfg.params.market.
      market: { statics: s, ...(cfg.params?.market ?? {}), ...macroMarketParams },
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
  const finalIncome = last.incomeVec as Float64Array;
  const finalYoungShare = last.youngShareVec as Float64Array;
  const simRealLogGrowth = new Float64Array(s.n);
  for (let i = 0; i < s.n; i++) simRealLogGrowth[i] = Math.log(Math.max(1e-9, finalPriceIndex[i]));
  const finalCohorts = {} as Record<Cohort, Float64Array>;
  const marketState = state.stateMap.get('market') as { cohorts: Record<Cohort, Float64Array> };
  for (const cohort of COHORTS) finalCohorts[cohort] = Float64Array.from(marketState.cohorts[cohort]);

  return {
    data, years: simYears, simRealLogGrowth, finalPriceIndex, finalPop,
    finalIncome, finalYoungShare, finalCohorts, macroPath: cfg.macroPath ?? null,
    national,
  };
}

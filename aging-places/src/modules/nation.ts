/**
 * National demographics module: cohort-component projection of the US
 * population 2025-2065, plus the national "mover pools" and elderly wealth
 * index that drive municipal migration and second-home demand.
 *
 * Calibration sources (values, source, year):
 *  - Start cohorts: US Census Bureau 2023-2024 national estimates (~335M total)
 *  - Births 3.62M (CDC NCHS 2024); TFR ~1.62
 *  - Net immigration ~1.1M/yr long-run (CBO 2025 demographic outlook central)
 *  - Cohort survival: SSA period life tables 2021 (approximate annual rates)
 *  - Cross-municipality mover shares: ACS county-to-county migration (~2.5% of
 *    20-44 move across counties/yr; 65+ ~0.9%/yr, of which most stay in place)
 */
import { defineModule } from '../../../src/framework/index.js';
import type { ValidationResult } from '../../../src/framework/index.js';
import { COHORTS, Cohort, CohortRates, NationOutputs } from '../domain-types.js';

export interface NationParams {
  /** Total fertility rate (births per woman). */
  tfr: number;
  /** Net international migration, persons/yr. */
  netImmigration: number;
  /** Share of the 20-44 population relocating across municipalities per year. */
  workingMoverRate: number;
  /** Share of the 65+ population relocating across municipalities per year. */
  retireeMoverRate: number;
  /** Real growth of per-capita 65+ wealth per year. */
  wealthGrowth: number;
  /** Start-year cohort sizes (millions). */
  startCohortsM: Record<Cohort, number>;
}

export interface NationState {
  cohorts: Record<Cohort, number>;
  elderlyWealthIndex: number;
}

export const COHORT_RATES: CohortRates = {
  // Approximate annual survival by bracket, SSA 2021 period tables
  survival: { a0_19: 0.9996, a20_24: 0.999, a25_44: 0.9985, a45_64: 0.995, a65up: 0.955 },
  // 1 / bracket width
  exit: { a0_19: 1 / 20, a20_24: 1 / 5, a25_44: 1 / 20, a45_64: 1 / 20, a65up: 0 },
};

// Net immigration distribution by cohort (CBO/ACS age profile of new arrivals)
const IMMIG_SHARE: Record<Cohort, number> = { a0_19: 0.22, a20_24: 0.16, a25_44: 0.44, a45_64: 0.14, a65up: 0.04 };

const DEFAULTS: NationParams = {
  tfr: 1.62,              // CDC NCHS 2024
  netImmigration: 1.1e6,  // CBO 2025 long-run central
  workingMoverRate: 0.025, // ACS county-to-county migration, 20-44
  retireeMoverRate: 0.009, // ACS, 65+
  wealthGrowth: 0.015,    // real per-capita wealth growth, Fed SCF long-run
  startCohortsM: { a0_19: 80.5, a20_24: 21.9, a25_44: 90.3, a45_64: 82.7, a65up: 59.3 }, // Census 2024 estimates
};

export const nationModule = defineModule<NationParams, NationState, Record<string, never>, NationOutputs>({
  name: 'nation',
  description: 'US national cohort projection, mover pools, elderly wealth',
  defaults: DEFAULTS,
  inputs: [],
  outputs: ['natCohorts', 'workingMoverPool', 'retireeMoverPool', 'elderlyWealthIndex', 'births'],

  validate(params): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (params.tfr !== undefined && (params.tfr < 0.8 || params.tfr > 3)) errors.push('tfr out of [0.8,3]');
    if (params.netImmigration !== undefined && Math.abs(params.netImmigration) > 5e6) errors.push('netImmigration out of range');
    return { valid: errors.length === 0, errors, warnings };
  },

  mergeParams(partial): NationParams {
    return { ...DEFAULTS, ...partial, startCohortsM: { ...DEFAULTS.startCohortsM, ...(partial.startCohortsM ?? {}) } };
  },

  init(params): NationState {
    const cohorts = {} as Record<Cohort, number>;
    for (const c of COHORTS) cohorts[c] = params.startCohortsM[c] * 1e6;
    return { cohorts, elderlyWealthIndex: 1 };
  },

  step(state, _inputs, params, _year, _yearIndex) {
    const c = state.cohorts;
    const { survival: s, exit: e } = COHORT_RATES;
    // Births: TFR spread over a ~30-year reproductive span; women ~49.5% of 15-44
    const womenReproductive = 0.495 * (0.25 * c.a0_19 + c.a20_24 + c.a25_44);
    const births = (params.tfr / 30) * womenReproductive;
    const next = {} as Record<Cohort, number>;
    const grad0 = c.a0_19 * s.a0_19 * e.a0_19;
    const grad20 = c.a20_24 * s.a20_24 * e.a20_24;
    const grad25 = c.a25_44 * s.a25_44 * e.a25_44;
    const grad45 = c.a45_64 * s.a45_64 * e.a45_64;
    next.a0_19 = c.a0_19 * s.a0_19 - grad0 + births + params.netImmigration * IMMIG_SHARE.a0_19;
    next.a20_24 = c.a20_24 * s.a20_24 - grad20 + grad0 + params.netImmigration * IMMIG_SHARE.a20_24;
    next.a25_44 = c.a25_44 * s.a25_44 - grad25 + grad20 + params.netImmigration * IMMIG_SHARE.a25_44;
    next.a45_64 = c.a45_64 * s.a45_64 - grad45 + grad25 + params.netImmigration * IMMIG_SHARE.a45_64;
    next.a65up = c.a65up * s.a65up + grad45 + params.netImmigration * IMMIG_SHARE.a65up;

    const elderlyWealthIndex =
      state.elderlyWealthIndex * (1 + params.wealthGrowth) * (next.a65up / c.a65up);

    const outputs: NationOutputs = {
      natCohorts: next,
      workingMoverPool: params.workingMoverRate * (next.a20_24 + next.a25_44),
      retireeMoverPool: params.retireeMoverRate * next.a65up,
      elderlyWealthIndex,
      births,
    };
    return { state: { cohorts: next, elderlyWealthIndex }, outputs };
  },
});

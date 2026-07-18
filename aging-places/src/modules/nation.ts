/**
 * National demographics module: cohort-component projection of the US
 * population 2025-2065, plus international migration and the elderly wealth
 * index that drive municipal migration and second-home demand.
 *
 * Calibration sources (values, source, year):
 *  - Start cohorts: US Census Bureau 2023-2024 national estimates (~335M total)
 *  - Final 2024 TFR 1.5995 (CDC NCHS, 2026 release)
 *  - CBO January 2026: TFR converges to 1.53; net immigration rises from
 *    roughly 0.41M in 2025 toward a 1.2M long-run average
 *  - Cohort survival: SSA period life tables 2021 (approximate annual rates)
 * Internal mover pools are deliberately not national outputs: they are sized
 * from the municipal stocks in migration.ts so a partial place universe never
 * receives the full-country mover pool.
 */
import { defineModule } from '../../../src/framework/index.js';
import type { ValidationResult } from '../../../src/framework/index.js';
import { COHORTS, COHORT_RATES, Cohort, NationOutputs } from '../domain-types.js';

export interface NationParams {
  /** Total fertility rate at the beginning and end of convergence. */
  tfrStart: number;
  tfrLongRun: number;
  tfrConvergenceYear: number;
  /** Net international migration path, persons/yr. */
  netImmigrationStart: number;
  netImmigrationLongRun: number;
  immigrationConvergenceYear: number;
  /** Real growth of per-capita 65+ wealth per year. */
  wealthGrowth: number;
  /** Start-year cohort sizes (millions). */
  startCohortsM: Record<Cohort, number>;
}

export interface NationState {
  cohorts: Record<Cohort, number>;
  elderlyWealthIndex: number;
}

// Net immigration distribution by cohort (CBO/ACS age profile of new arrivals)
export const IMMIG_SHARE: Record<Cohort, number> = {
  a0_19: 0.22, a20_24: 0.16, a25_44: 0.44, a45_64: 0.14, a65up: 0.04,
};

const DEFAULTS: NationParams = {
  tfrStart: 1.5995,
  tfrLongRun: 1.53,
  tfrConvergenceYear: 2035,
  netImmigrationStart: 0.41e6,
  netImmigrationLongRun: 1.2e6,
  immigrationConvergenceYear: 2035,
  wealthGrowth: 0.015,    // real per-capita wealth growth, Fed SCF long-run
  startCohortsM: { a0_19: 80.5, a20_24: 21.9, a25_44: 90.3, a45_64: 82.7, a65up: 59.3 }, // Census 2024 estimates
};

export const nationModule = defineModule<NationParams, NationState, Record<string, never>, NationOutputs>({
  name: 'nation',
  description: 'US national cohorts, international migration, and elderly wealth',
  defaults: DEFAULTS,
  inputs: [],
  outputs: [
    'natCohorts', 'currentTfr', 'netImmigrationByCohort', 'netImmigration',
    'elderlyWealthIndex', 'births', 'natWorkingGrowth',
  ],

  validate(params): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const k of ['tfrStart', 'tfrLongRun'] as const) {
      if (params[k] !== undefined && (params[k]! < 0.8 || params[k]! > 3)) errors.push(`${k} out of [0.8,3]`);
    }
    for (const k of ['netImmigrationStart', 'netImmigrationLongRun'] as const) {
      if (params[k] !== undefined && Math.abs(params[k]!) > 5e6) errors.push(`${k} out of range`);
    }
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

  step(state, _inputs, params, year, _yearIndex) {
    const c = state.cohorts;
    const { survival: s, exit: e } = COHORT_RATES;
    const interpolate = (start: number, end: number, convergenceYear: number): number => {
      const startYear = year - _yearIndex;
      const span = Math.max(1, convergenceYear - startYear);
      const progress = Math.max(0, Math.min(1, (year - startYear) / span));
      return start + progress * (end - start);
    };
    const currentTfr = interpolate(params.tfrStart, params.tfrLongRun, params.tfrConvergenceYear);
    const netImmigration = interpolate(
      params.netImmigrationStart, params.netImmigrationLongRun, params.immigrationConvergenceYear
    );
    const netImmigrationByCohort = {} as Record<Cohort, number>;
    for (const cohort of COHORTS) netImmigrationByCohort[cohort] = netImmigration * IMMIG_SHARE[cohort];
    // Births: TFR spread over a ~30-year reproductive span; women ~49.5% of 15-44
    const womenReproductive = 0.495 * (0.25 * c.a0_19 + c.a20_24 + c.a25_44);
    const births = (currentTfr / 30) * womenReproductive;
    const next = {} as Record<Cohort, number>;
    const grad0 = c.a0_19 * s.a0_19 * e.a0_19;
    const grad20 = c.a20_24 * s.a20_24 * e.a20_24;
    const grad25 = c.a25_44 * s.a25_44 * e.a25_44;
    const grad45 = c.a45_64 * s.a45_64 * e.a45_64;
    next.a0_19 = c.a0_19 * s.a0_19 - grad0 + births + netImmigrationByCohort.a0_19;
    next.a20_24 = c.a20_24 * s.a20_24 - grad20 + grad0 + netImmigrationByCohort.a20_24;
    next.a25_44 = c.a25_44 * s.a25_44 - grad25 + grad20 + netImmigrationByCohort.a25_44;
    next.a45_64 = c.a45_64 * s.a45_64 - grad45 + grad25 + netImmigrationByCohort.a45_64;
    next.a65up = c.a65up * s.a65up + grad45 + netImmigrationByCohort.a65up;

    const elderlyWealthIndex =
      state.elderlyWealthIndex * (1 + params.wealthGrowth) * (next.a65up / c.a65up);
    const working = c.a20_24 + c.a25_44 + c.a45_64;
    const nextWorking = next.a20_24 + next.a25_44 + next.a45_64;
    const natWorkingGrowth = working > 0 && nextWorking > 0 ? Math.log(nextWorking / working) : 0;

    const outputs: NationOutputs = {
      natCohorts: next,
      currentTfr,
      netImmigrationByCohort,
      netImmigration,
      elderlyWealthIndex,
      births,
      natWorkingGrowth,
    };
    return { state: { cohorts: next, elderlyWealthIndex }, outputs };
  },
});

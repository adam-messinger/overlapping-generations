/**
 * Domain types for the aging-places municipal simulation.
 * (Domain-specific; the generic engine lives in ../../src/framework.)
 */

/** Local age cohorts tracked per municipality. */
export const COHORTS = ['a0_19', 'a20_24', 'a25_44', 'a45_64', 'a65up'] as const;
export type Cohort = (typeof COHORTS)[number];

/** Default household headship assumptions shared by loading and simulation.
 * A custom market.headship scenario must also use its custom rates when the
 * start-year place multipliers are calibrated. */
export const DEFAULT_HEADSHIP: Record<Cohort, number> = {
  a0_19: 0,
  a20_24: 0.38,
  a25_44: 0.50,
  a45_64: 0.56,
  a65up: 0.63,
};

/** Static (slow-moving) municipal attributes, z-scored against the national
 * distribution at simulation start. */
export interface PlaceStatics {
  n: number;
  geoid: string[];
  name: string[];
  state: string[];
  /** z-scored feature columns, keyed by feature name. */
  z: Record<string, Float64Array>;
  /** Raw columns needed in levels. */
  pop0: Float64Array;
  /** Housing stock used by the simulation. Missing/zero observations receive
   * a conservative synthetic stock so the numerical model remains finite. */
  units0: Float64Array;
  /** Reported housing stock before any numerical fallback. */
  observedUnits0: Float64Array;
  /** Reported occupied housing units (equivalently, households). */
  occupiedUnits0: Float64Array;
  seasonalShare: Float64Array;
  /** Population living in group quarters and its share of total population. */
  groupQuarters0: Float64Array;
  groupQuartersShare: Float64Array;
  /** Per-place multiplier that makes modeled headship reproduce observed
   * occupied units in the start year. This prevents group-quarters residents
   * from becoming phantom housing demand. */
  headshipScale: Float64Array;
  /** Whether the observed place is suitable for a housing-market ranking. */
  housingMarketEligible: Uint8Array;
  /** Initial cohort counts. */
  cohorts0: Record<Cohort, Float64Array>;
  /** Initial price level ($, ZHVI or median value fallback). */
  price0: Float64Array;
  /** Initial median household income ($). */
  income0: Float64Array;
}

export interface NationOutputs {
  natCohorts: Record<Cohort, number>;
  /** TFR used for this transition. */
  currentTfr: number;
  /** National net international migration by age cohort. Municipal places
   * receive their modeled-universe share through the migration module. */
  netImmigrationByCohort: Record<Cohort, number>;
  netImmigration: number;
  /** Index of aggregate 65+ wealth (1.0 at start year). */
  elderlyWealthIndex: number;
  /** National births this year. */
  births: number;
  /** Log growth of the national working-age (20-64) stock this transition.
   * Drives the regime-concentration dial in the attraction module. */
  natWorkingGrowth: number;
}

/** Per-cohort annual survival + bracket-exit rates used by both the national
 * and municipal cohort updates. */
export interface CohortRates {
  survival: Record<Cohort, number>;
  /** Fraction of each bracket graduating to the next per year (1/width). */
  exit: Record<Cohort, number>;
}

export const COHORT_RATES: CohortRates = {
  // Approximate annual survival by bracket, SSA 2021 period tables.
  survival: { a0_19: 0.9996, a20_24: 0.999, a25_44: 0.9985, a45_64: 0.995, a65up: 0.955 },
  // Annual share aging into the next bracket (1 / bracket width).
  exit: { a0_19: 1 / 20, a20_24: 1 / 5, a25_44: 1 / 20, a45_64: 1 / 20, a65up: 0 },
};

/**
 * Domain types for the aging-places municipal simulation.
 * (Domain-specific; the generic engine lives in ../../src/framework.)
 */

/** Local age cohorts tracked per municipality. */
export const COHORTS = ['a0_19', 'a20_24', 'a25_44', 'a45_64', 'a65up'] as const;
export type Cohort = (typeof COHORTS)[number];

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
}

/** Per-cohort annual survival + bracket-exit rates used by both the national
 * and municipal cohort updates. */
export interface CohortRates {
  survival: Record<Cohort, number>;
  /** Fraction of each bracket graduating to the next per year (1/width). */
  exit: Record<Cohort, number>;
}

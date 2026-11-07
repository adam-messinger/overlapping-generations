/**
 * Seed-year discontinuities: does the first simulated step sit on the path
 * the following steps describe?
 *
 * A model initialized from observed data should start on a smooth path. When
 * it does not, the first step jumps (a lag seeded with a hand-guessed
 * constant, a behavioral equation whose fixed point is not the observed
 * state, a stock anchored at nameplate where the flow ran below it) and the
 * jump propagates into every later level. Such artifacts are invisible in
 * end-of-horizon metrics and obvious in the first two steps.
 *
 * For each series the first step's change is compared with the mean change
 * over the next `trendSteps` steps. The excess beyond those steps' own spread,
 * relative to the series' magnitude over the window, is the score; a smooth
 * trend, a steady acceleration and ordinary noise all score near zero.
 */

export interface SeedYearKink {
  name: string;
  /** (|first change - later mean change| - later spread) / magnitude. */
  score: number;
  firstChange: number;
  laterMeanChange: number;
  /** The values over the window, from the series' start offset. */
  window: number[];
}

export interface SeedYearOptions {
  /** Steps after the first used to describe the path (default 4). */
  trendSteps?: number;
  /** Scores above this are reported (default 0.05). */
  threshold?: number;
  /**
   * Per-series start index. A series whose seed-step value is defined
   * differently (a growth rate that is 0 before there is a previous step, a
   * revaluation with no prior schedule) is examined from step 1 instead.
   */
  startOffsets?: Readonly<Record<string, number>>;
}

/** Score one series. Returns undefined when it is too short or not finite. */
export function scoreSeedYear(values: readonly number[], trendSteps = 4): Omit<SeedYearKink, 'name'> | undefined {
  if (values.length < trendSteps + 2) return undefined;
  const window = values.slice(0, trendSteps + 2);
  if (window.some((value) => typeof value !== 'number' || !Number.isFinite(value))) return undefined;
  const firstChange = window[1] - window[0];
  const later = window.slice(2).map((value, index) => value - window[index + 1]);
  const laterMeanChange = later.reduce((sum, change) => sum + change, 0) / later.length;
  const spread = Math.max(...later.map((change) => Math.abs(change - laterMeanChange)));
  const magnitude = Math.max(...window.map(Math.abs));
  if (magnitude === 0) return { score: 0, firstChange, laterMeanChange, window };
  const score = (Math.abs(firstChange - laterMeanChange) - spread) / magnitude;
  return { score, firstChange, laterMeanChange, window };
}

/** Every series whose first step departs from the path after it, worst first. */
export function findSeedYearKinks(
  series: Readonly<Record<string, readonly number[]>>,
  options: SeedYearOptions = {},
): SeedYearKink[] {
  const trendSteps = options.trendSteps ?? 4;
  const threshold = options.threshold ?? 0.05;
  const kinks: SeedYearKink[] = [];
  for (const [name, values] of Object.entries(series)) {
    const offset = options.startOffsets?.[name] ?? 0;
    const scored = scoreSeedYear(values.slice(offset), trendSteps);
    if (scored && scored.score > threshold) kinks.push({ name, ...scored });
  }
  return kinks.sort((a, b) => b.score - a.score);
}

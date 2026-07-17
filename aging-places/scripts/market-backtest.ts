/**
 * Functional-market validation for municipal local capture.
 *
 * The production classifier answers a national historical-persistence
 * question. This diagnostic asks a different question: within a functional
 * housing/labor market, did a score order places by realized 2000-2025 ZHVI
 * growth? Whole commuting zones are held out from fitted models. The primary
 * geography is the USDA ERS 2000 commuting-zone definition; 2020 zones are a
 * future-geography sensitivity only.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, parseCsv, readCsvAuto } from './lib.js';
import { loadFeatureRows } from './backtest.js';
import {
  FeatureRow, MODEL_FEATURES, buildMatrix, columnStats, fitLogit, fitRidge,
  mulberry32, predictLinear, predictLogit, standardize,
} from '../src/scoring.js';
import { runAgingSim } from '../src/simulation.js';

const FOLDS = 5;
const MIN_PLACES = 5;

export interface PlaceMarket {
  geoid: string;
  assignmentMethod: string;
  crossMarket2000: boolean;
  cz2000: string | null;
  crossMarket2020: boolean;
  cz2020: string | null;
  laggedLogPopGrowth90_00: number | null;
}

type Geography = 'cz2000' | 'cz2020';

interface PublicMetrics {
  n: number;
  markets: number;
  pooledCenteredSpearman: number | null;
  meanWithinMarketSpearman: number | null;
  medianWithinMarketSpearman: number | null;
  meanWithinMarketPairwiseAccuracy: number | null;
}

interface DetailedMetrics {
  public: PublicMetrics;
  spearmanByMarket: Map<string, number>;
  pairwiseByMarket: Map<string, number>;
}

interface FoldSummary {
  fold: number;
  trainN: number;
  testN: number;
  trainMarkets: number;
  testMarkets: number;
}

interface OofScores {
  historicalPersistence: number[];
  localRidge: number[];
  mechanism: number[];
  foreignShare: number[];
  marketAccess: number[];
  laggedPopulationTrend: number[];
}

function finiteOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function loadPlaceMarkets(): Map<string, PlaceMarket> {
  const parsed = parseCsv(readCsvAuto(path.join(DATA_DIR, 'place-markets.csv')));
  const header = parsed[0];
  const at = (name: string): number => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`place-markets.csv: missing required column ${name}`);
    return index;
  };
  const geoid = at('geoid');
  const assignmentMethod = at('assignmentMethod');
  const crossMarket2000 = at('crossMarket2000');
  const cz2000 = at('cz2000');
  const crossMarket2020 = at('crossMarket2020');
  const cz2020 = at('cz2020');
  const lagged = at('laggedLogPopGrowth90_00');
  return new Map(parsed.slice(1).map((row) => [row[geoid], {
    geoid: row[geoid],
    assignmentMethod: row[assignmentMethod],
    crossMarket2000: row[crossMarket2000] === '1',
    cz2000: row[cz2000] || null,
    crossMarket2020: row[crossMarket2020] === '1',
    cz2020: row[cz2020] || null,
    laggedLogPopGrowth90_00: finiteOrNull(row[lagged]),
  }]));
}

/** Frozen market-level fold assignment. The geography prefix prevents the
 * same numeric identifier in two vintages from accidentally sharing a fold. */
export function marketFold(market: string, geography: Geography, folds = FOLDS): number {
  const value = `${geography}:${market}`;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % folds;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function quantile(values: number[], q: number): number {
  if (values.length === 0) return NaN;
  const ordered = [...values].sort((a, b) => a - b);
  const position = Math.min(ordered.length - 1, Math.max(0, Math.floor(q * ordered.length)));
  return ordered[position];
}

function ranks(values: number[]): number[] {
  const ordered = values.map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value);
  const result = new Array(values.length).fill(0);
  let i = 0;
  while (i < ordered.length) {
    let j = i + 1;
    while (j < ordered.length && ordered[j].value === ordered[i].value) j++;
    const rank = (i + j - 1) / 2;
    for (let k = i; k < j; k++) result[ordered[k].index] = rank;
    i = j;
  }
  return result;
}

function pearson(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length < 2) return NaN;
  const meanA = mean(a), meanB = mean(b);
  let covariance = 0, varianceA = 0, varianceB = 0;
  for (let i = 0; i < a.length; i++) {
    covariance += (a[i] - meanA) * (b[i] - meanB);
    varianceA += (a[i] - meanA) ** 2;
    varianceB += (b[i] - meanB) ** 2;
  }
  return varianceA > 0 && varianceB > 0
    ? covariance / Math.sqrt(varianceA * varianceB)
    : NaN;
}

export function spearman(a: number[], b: number[]): number {
  return pearson(ranks(a), ranks(b));
}

function pairwiseAccuracy(score: number[], outcome: number[]): number {
  let correct = 0, comparable = 0;
  for (let i = 0; i < score.length; i++) {
    for (let j = i + 1; j < score.length; j++) {
      const actual = Math.sign(outcome[i] - outcome[j]);
      if (actual === 0) continue;
      const predicted = Math.sign(score[i] - score[j]);
      comparable++;
      if (predicted === actual) correct++;
      else if (predicted === 0) correct += 0.5;
    }
  }
  return comparable > 0 ? correct / comparable : NaN;
}

function groupCounts(indices: number[], markets: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const index of indices) {
    const market = markets[index];
    counts.set(market, (counts.get(market) ?? 0) + 1);
  }
  return counts;
}

/** Center a target or score within market. This is used only for the pooled
 * diagnostic; within-market ranks are invariant to centering. */
export function centerWithinMarkets(
  values: number[], markets: string[], indices: number[]
): Map<number, number> {
  const totals = new Map<string, { total: number; n: number }>();
  for (const index of indices) {
    const current = totals.get(markets[index]) ?? { total: 0, n: 0 };
    current.total += values[index];
    current.n++;
    totals.set(markets[index], current);
  }
  return new Map(indices.map((index) => {
    const group = totals.get(markets[index])!;
    return [index, values[index] - group.total / group.n];
  }));
}

function evaluate(
  scores: number[], outcome: number[], markets: string[], candidateIndices: number[],
  minPlaces = MIN_PLACES,
): DetailedMetrics {
  const finite = candidateIndices.filter(
    (index) => Number.isFinite(scores[index]) && Number.isFinite(outcome[index])
  );
  const counts = groupCounts(finite, markets);
  const indices = finite.filter((index) => (counts.get(markets[index]) ?? 0) >= minPlaces);
  const centeredScore = centerWithinMarkets(scores, markets, indices);
  const centeredOutcome = centerWithinMarkets(outcome, markets, indices);
  const byMarket = new Map<string, number[]>();
  for (const index of indices) {
    const current = byMarket.get(markets[index]) ?? [];
    current.push(index);
    byMarket.set(markets[index], current);
  }
  const spearmanByMarket = new Map<string, number>();
  const pairwiseByMarket = new Map<string, number>();
  for (const [market, group] of byMarket) {
    const correlation = spearman(
      group.map((index) => scores[index]), group.map((index) => outcome[index])
    );
    const concordance = pairwiseAccuracy(
      group.map((index) => scores[index]), group.map((index) => outcome[index])
    );
    if (Number.isFinite(correlation)) spearmanByMarket.set(market, correlation);
    if (Number.isFinite(concordance)) pairwiseByMarket.set(market, concordance);
  }
  const correlations = [...spearmanByMarket.values()];
  const pairwise = [...pairwiseByMarket.values()];
  const round = (value: number): number | null => Number.isFinite(value)
    ? +value.toFixed(4) : null;
  return {
    public: {
      n: indices.length,
      markets: byMarket.size,
      pooledCenteredSpearman: round(spearman(
        indices.map((index) => centeredScore.get(index)!),
        indices.map((index) => centeredOutcome.get(index)!),
      )),
      meanWithinMarketSpearman: round(mean(correlations)),
      medianWithinMarketSpearman: round(median(correlations)),
      meanWithinMarketPairwiseAccuracy: round(mean(pairwise)),
    },
    spearmanByMarket,
    pairwiseByMarket,
  };
}

function residualizeByMarket(
  outcome: number[], markets: string[], indices: number[]
): Map<number, number> {
  return centerWithinMarkets(outcome, markets, indices);
}

function zApply(train: number[], values: number[]): number[] {
  const center = mean(train);
  const variance = train.reduce((sum, value) => sum + (value - center) ** 2, 0) /
    Math.max(1, train.length - 1);
  const sd = Math.sqrt(variance) || 1;
  return values.map((value) => Math.max(-4, Math.min(4, (value - center) / sd)));
}

function percentile(values: number[], q: number): number {
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.min(ordered.length - 1, Math.max(0, Math.floor(q * ordered.length)));
  return ordered[index];
}

function bootstrapDifference(
  first: Map<string, number>, second: Map<string, number>, iterations = 4000,
): { markets: number; meanDifference: number; ci95: [number, number] } {
  const markets = [...first.keys()].filter((market) => second.has(market)).sort();
  const differences = markets.map((market) => first.get(market)! - second.get(market)!);
  const rng = mulberry32(20250716);
  const draws: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    let total = 0;
    for (let i = 0; i < differences.length; i++) {
      total += differences[Math.floor(rng() * differences.length)];
    }
    draws.push(total / differences.length);
  }
  return {
    markets: differences.length,
    meanDifference: +mean(differences).toFixed(4),
    ci95: [+percentile(draws, 0.025).toFixed(4), +percentile(draws, 0.975).toFixed(4)],
  };
}

function initializeScores(length: number): OofScores {
  const blank = (): number[] => new Array(length).fill(NaN);
  return {
    historicalPersistence: blank(),
    localRidge: blank(),
    mechanism: blank(),
    foreignShare: blank(),
    marketAccess: blank(),
    laggedPopulationTrend: blank(),
  };
}

function runGeography(
  geography: Geography, rows: FeatureRow[], outcome: number[], rawMatrix: (number | null)[][],
  mechanism: number[], marketByGeoid: Map<string, PlaceMarket>,
): Record<string, unknown> {
  const marketIds = rows.map((row) => marketByGeoid.get(row.geoid)?.[geography] ?? '');
  const initial = rows.map((_, index) => index).filter((index) => marketIds[index] !== '');
  const counts = groupCounts(initial, marketIds);
  // A multi-county place with no Census place-part population has an arbitrary
  // primary county. Exclude that explicit fallback from the primary analysis.
  const eligible = initial.filter((index) =>
    (counts.get(marketIds[index]) ?? 0) >= MIN_PLACES &&
    marketByGeoid.get(rows[index].geoid)?.assignmentMethod !== 'first_county_no_part'
  );
  const eligibleCounts = groupCounts(eligible, marketIds);
  const finalEligible = eligible.filter(
    (index) => (eligibleCounts.get(marketIds[index]) ?? 0) >= MIN_PLACES
  );
  const residual = residualizeByMarket(outcome, marketIds, finalEligible);
  const scores = initializeScores(rows.length);
  const foldSummaries: FoldSummary[] = [];
  const foreignIndex = MODEL_FEATURES.findIndex((feature) => feature.name === 'foreignShare');
  const accessIndex = MODEL_FEATURES.findIndex((feature) => feature.name === 'logPopAccess120');

  for (let fold = 0; fold < FOLDS; fold++) {
    const test = finalEligible.filter(
      (index) => marketFold(marketIds[index], geography) === fold
    );
    const train = finalEligible.filter(
      (index) => marketFold(marketIds[index], geography) !== fold
    );
    const stats = columnStats(train.map((index) => rawMatrix[index]));
    const zTrain = standardize(train.map((index) => rawMatrix[index]), stats.means, stats.sds);
    const zTest = standardize(test.map((index) => rawMatrix[index]), stats.means, stats.sds);
    const cutoff = quantile(train.map((index) => outcome[index]), 0.75);
    const winners = train.map((index) => Number(outcome[index] >= cutoff));
    const logit = fitLogit(zTrain, winners, { l2: 1e-3, lr: 0.5, iters: 600 });
    const ridge = fitRidge(zTrain, train.map((index) => residual.get(index)!), 1e-2);
    const logitTest = predictLogit(zTest, logit);
    const ridgeTest = predictLinear(zTest, ridge);
    // zApply is retained only to verify that any future composite uses the
    // fold's training scale. It is not needed by rank-based metrics today.
    const logitTrain = predictLogit(zTrain, logit);
    void zApply(logitTrain, logitTest);
    test.forEach((index, position) => {
      scores.historicalPersistence[index] = logitTest[position];
      scores.localRidge[index] = ridgeTest[position];
      scores.mechanism[index] = mechanism[index];
      scores.foreignShare[index] = zTest[position][foreignIndex];
      scores.marketAccess[index] = zTest[position][accessIndex];
      scores.laggedPopulationTrend[index] =
        marketByGeoid.get(rows[index].geoid)?.laggedLogPopGrowth90_00 ?? NaN;
    });
    foldSummaries.push({
      fold,
      trainN: train.length,
      testN: test.length,
      trainMarkets: new Set(train.map((index) => marketIds[index])).size,
      testMarkets: new Set(test.map((index) => marketIds[index])).size,
    });
  }

  const allAvailable: Record<string, PublicMetrics> = {};
  for (const [name, values] of Object.entries(scores)) {
    allAvailable[name] = evaluate(values, outcome, marketIds, finalEligible).public;
  }

  const commonCandidate = finalEligible.filter(
    (index) => Number.isFinite(scores.laggedPopulationTrend[index])
  );
  const commonCounts = groupCounts(commonCandidate, marketIds);
  const common = commonCandidate.filter(
    (index) => (commonCounts.get(marketIds[index]) ?? 0) >= MIN_PLACES
  );
  const commonDetails: Record<string, DetailedMetrics> = {};
  const commonPublic: Record<string, PublicMetrics> = {};
  for (const [name, values] of Object.entries(scores)) {
    const detail = evaluate(values, outcome, marketIds, common);
    commonDetails[name] = detail;
    commonPublic[name] = detail.public;
  }
  const difference = bootstrapDifference(
    commonDetails.mechanism.spearmanByMarket,
    commonDetails.laggedPopulationTrend.spearmanByMarket,
  );
  const mechanismValue = commonPublic.mechanism.meanWithinMarketSpearman;
  const baselineValue = commonPublic.laggedPopulationTrend.meanWithinMarketSpearman;
  const pointDifference = (mechanismValue ?? NaN) - (baselineValue ?? NaN);
  const gate = pointDifference <= 0
    ? 'fails: lagged population trend equals or beats the mechanism point estimate'
    : difference.ci95[0] > 0
      ? 'passes: mechanism advantage is positive with a market-bootstrap 95% interval above zero'
      : 'inconclusive: mechanism has the higher point estimate but its advantage is not precise';

  return {
    geography,
    role: geography === 'cz2000'
      ? 'primary: start-period functional markets with rural coverage'
      : 'sensitivity only: end-period functional-market definitions',
    universe: {
      outcomeRows: rows.length,
      assignedRows: initial.length,
      eligibleRows: finalEligible.length,
      eligibleMarkets: new Set(finalEligible.map((index) => marketIds[index])).size,
      minimumPlacesPerMarket: MIN_PLACES,
      excludedAmbiguousFallbackRows: initial.filter((index) =>
        marketByGeoid.get(rows[index].geoid)?.assignmentMethod === 'first_county_no_part'
      ).length,
    },
    folds: foldSummaries,
    allAvailable,
    laggedPopulationCommonSample: commonPublic,
    baselineGate: {
      primaryMetric: 'mean within-market Spearman on the exact lagged-population common sample',
      mechanismMinusLaggedPopulation: difference,
      result: gate,
    },
  };
}

export function main(): void {
  const rows = loadFeatureRows('features2000.csv').filter(
    (row) => row.raw.logGrowth00_25 !== null && row.pop >= 1000
  );
  const outcome = rows.map((row) => row.raw.logGrowth00_25 as number);
  const rawMatrix = buildMatrix(rows);
  const marketByGeoid = loadPlaceMarkets();
  const mechanismRun = runAgingSim({ epoch: '2000', years: 25, minPop: 1000 });
  const mechanismByGeoid = new Map<string, number>();
  mechanismRun.data.statics.geoid.forEach((geoid, index) => {
    mechanismByGeoid.set(geoid, mechanismRun.simRealLogGrowth[index]);
  });
  const mechanism = rows.map((row) => mechanismByGeoid.get(row.geoid) ?? NaN);

  const result = {
    status: 'development-window diagnostic; not independent forward validation',
    outcome: 'log(ZHVI June 2025 / ZHVI June 2000)',
    interpretation: 'local capture: rank places within a functional market, not national market growth',
    method: {
      folds: `${FOLDS}-fold grouped cross-validation holding out whole commuting zones`,
      preprocessing: 'training-fold means, standard deviations, winner cutoffs, and coefficients only',
      minimumMarketSize: MIN_PLACES,
      fittedModels: ['historicalPersistence', 'localRidge'],
      unfittedComparators: ['mechanism', 'foreignShare', 'marketAccess', 'laggedPopulationTrend'],
      uncertainty: 'market-level bootstrap of the mean within-market Spearman difference',
      caveat: 'Observed market outcome means are used only to evaluate local residuals; they are not forecast inputs.',
    },
    cz2000: runGeography('cz2000', rows, outcome, rawMatrix, mechanism, marketByGeoid),
    cz2020: runGeography('cz2020', rows, outcome, rawMatrix, mechanism, marketByGeoid),
  };
  const target = path.join(DATA_DIR, 'market-validation.json');
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
  console.log(`wrote ${target}`);
  console.log(JSON.stringify({
    cz2000: (result.cz2000 as Record<string, unknown>).baselineGate,
    cz2020: (result.cz2020 as Record<string, unknown>).baselineGate,
  }, null, 2));
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) main();

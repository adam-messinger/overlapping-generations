/**
 * Outcome-window stability diagnostic.
 *
 * Both periods use year-2000 covariates. This is deliberately not called a
 * rolling-origin backtest: the 2012-2025 window lacks a 2012 feature snapshot.
 * It tests whether the associations learned in the first half of the single
 * available US outcome window persist into the second half.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR } from './lib.js';
import {
  loadFeatureRows, pearson, quantile, safeAuc, spearman, stateDemeaned,
  stateFold, summary,
} from './backtest.js';
import {
  MODEL_FEATURES, buildMatrix, columnStats, fitLogit, fitRidge,
  predictLinear, predictLogit, standardize,
} from '../src/scoring.js';

interface WindowFold {
  fold: number;
  n: number;
  states: string[];
  aucEarlyFitEarlyOutcome: number;
  aucEarlyFitLateOutcome: number;
  aucLateFitLateOutcome: number;
  aucLateFitEarlyOutcome: number;
  aucForeignEarlyOutcome: number;
  aucForeignLateOutcome: number;
  spearmanEarlyRidgeEarlyOutcome: number;
  spearmanEarlyRidgeLateOutcome: number;
  spearmanLateRidgeLateOutcome: number;
  spearmanLateRidgeEarlyOutcome: number;
  earlyLateOutcomeSpearman: number;
  logitCoefficientCosine: number;
  ridgeCoefficientCosine: number;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return normA > 0 && normB > 0 ? dot / Math.sqrt(normA * normB) : NaN;
}

function overlap(a: Set<number>, b: Set<number>): number {
  const intersection = [...a].filter((value) => b.has(value)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : NaN;
}

export function main(): void {
  const rows = loadFeatureRows('features2000.csv').filter((row) =>
    row.pop >= 1000 &&
    row.raw.zhvi2000 !== null && row.raw.zhvi2000! > 0 &&
    row.raw.zhvi2012 !== null && row.raw.zhvi2012! > 0 &&
    row.raw.zhvi2025 !== null && row.raw.zhvi2025! > 0
  );
  // Annualizing makes magnitudes comparable; ranks and winner labels are
  // unchanged by the positive scale factors.
  const early = rows.map((row) => Math.log(row.raw.zhvi2012! / row.raw.zhvi2000!) / 12);
  const late = rows.map((row) => Math.log(row.raw.zhvi2025! / row.raw.zhvi2012!) / 13);
  const rawMatrix = buildMatrix(rows);
  const foreignIndex = MODEL_FEATURES.findIndex((feature) => feature.name === 'foreignShare');
  const folds: WindowFold[] = [];

  for (let fold = 0; fold < 5; fold++) {
    const test = rows.map((_, index) => index)
      .filter((index) => stateFold(rows[index].state) === fold);
    const train = rows.map((_, index) => index)
      .filter((index) => stateFold(rows[index].state) !== fold);
    const stats = columnStats(train.map((index) => rawMatrix[index]));
    const zTrain = standardize(train.map((index) => rawMatrix[index]), stats.means, stats.sds);
    const zTest = standardize(test.map((index) => rawMatrix[index]), stats.means, stats.sds);
    const earlyCutoff = quantile(train.map((index) => early[index]), 0.75);
    const lateCutoff = quantile(train.map((index) => late[index]), 0.75);
    const earlyTrainLabels = train.map((index) => Number(early[index] >= earlyCutoff));
    const lateTrainLabels = train.map((index) => Number(late[index] >= lateCutoff));
    const earlyTestLabels = test.map((index) => Number(early[index] >= earlyCutoff));
    const lateTestLabels = test.map((index) => Number(late[index] >= lateCutoff));
    const earlyLogit = fitLogit(zTrain, earlyTrainLabels, { l2: 1e-3, lr: 0.5, iters: 600 });
    const lateLogit = fitLogit(zTrain, lateTrainLabels, { l2: 1e-3, lr: 0.5, iters: 600 });
    const earlyScore = predictLogit(zTest, earlyLogit);
    const lateScore = predictLogit(zTest, lateLogit);
    const earlyResidual = stateDemeaned(rows, early, train);
    const lateResidual = stateDemeaned(rows, late, train);
    const testEarlyResidual = stateDemeaned(rows, early, test);
    const testLateResidual = stateDemeaned(rows, late, test);
    const earlyRidge = fitRidge(
      zTrain, train.map((index) => earlyResidual.get(index)!), 1e-2
    );
    const lateRidge = fitRidge(
      zTrain, train.map((index) => lateResidual.get(index)!), 1e-2
    );
    const earlyRidgeScore = predictLinear(zTest, earlyRidge);
    const lateRidgeScore = predictLinear(zTest, lateRidge);
    const actualEarly = test.map((index) => testEarlyResidual.get(index)!);
    const actualLate = test.map((index) => testLateResidual.get(index)!);
    const foreign = zTest.map((row) => row[foreignIndex]);
    folds.push({
      fold,
      n: test.length,
      states: [...new Set(test.map((index) => rows[index].state))].sort(),
      aucEarlyFitEarlyOutcome: safeAuc(earlyScore, earlyTestLabels),
      aucEarlyFitLateOutcome: safeAuc(earlyScore, lateTestLabels),
      aucLateFitLateOutcome: safeAuc(lateScore, lateTestLabels),
      aucLateFitEarlyOutcome: safeAuc(lateScore, earlyTestLabels),
      aucForeignEarlyOutcome: safeAuc(foreign, earlyTestLabels),
      aucForeignLateOutcome: safeAuc(foreign, lateTestLabels),
      spearmanEarlyRidgeEarlyOutcome: spearman(earlyRidgeScore, actualEarly),
      spearmanEarlyRidgeLateOutcome: spearman(earlyRidgeScore, actualLate),
      spearmanLateRidgeLateOutcome: spearman(lateRidgeScore, actualLate),
      spearmanLateRidgeEarlyOutcome: spearman(lateRidgeScore, actualEarly),
      earlyLateOutcomeSpearman: spearman(actualEarly, actualLate),
      logitCoefficientCosine: cosine(earlyLogit.slice(1), lateLogit.slice(1)),
      ridgeCoefficientCosine: cosine(earlyRidge.slice(1), lateRidge.slice(1)),
    });
  }

  const all = rows.map((_, index) => index);
  const earlyCutoff = quantile(early, 0.75);
  const lateCutoff = quantile(late, 0.75);
  const earlyWinners = new Set(all.filter((index) => early[index] >= earlyCutoff));
  const lateWinners = new Set(all.filter((index) => late[index] >= lateCutoff));
  const summarize = (field: keyof WindowFold): ReturnType<typeof summary> => summary(
    folds.map((fold) => fold[field]).filter((value): value is number => typeof value === 'number')
  );
  const result = {
    status: 'fixed-2000-covariate outcome-window stability diagnostic; not a rolling-origin backtest',
    universe: `places pop>=1000 with June 2000, June 2012, and June 2025 ZHVI (n=${rows.length})`,
    periods: {
      early: 'annualized log(ZHVI_2012 / ZHVI_2000)',
      late: 'annualized log(ZHVI_2025 / ZHVI_2012)',
      covariates: 'year 2000 for both fits',
    },
    method: '5-fold state-grouped cross-validation with train-only preprocessing and window-specific winner cutoffs',
    descriptive: {
      rawEarlyLatePearson: +pearson(early, late).toFixed(3),
      rawEarlyLateSpearman: +spearman(early, late).toFixed(3),
      topQuartileJaccard: +overlap(earlyWinners, lateWinners).toFixed(3),
    },
    summary: {
      aucEarlyFitEarlyOutcome: summarize('aucEarlyFitEarlyOutcome'),
      aucEarlyFitLateOutcome: summarize('aucEarlyFitLateOutcome'),
      aucLateFitLateOutcome: summarize('aucLateFitLateOutcome'),
      aucLateFitEarlyOutcome: summarize('aucLateFitEarlyOutcome'),
      aucForeignEarlyOutcome: summarize('aucForeignEarlyOutcome'),
      aucForeignLateOutcome: summarize('aucForeignLateOutcome'),
      spearmanEarlyRidgeEarlyOutcome: summarize('spearmanEarlyRidgeEarlyOutcome'),
      spearmanEarlyRidgeLateOutcome: summarize('spearmanEarlyRidgeLateOutcome'),
      spearmanLateRidgeLateOutcome: summarize('spearmanLateRidgeLateOutcome'),
      spearmanLateRidgeEarlyOutcome: summarize('spearmanLateRidgeEarlyOutcome'),
      earlyLateOutcomeSpearman: summarize('earlyLateOutcomeSpearman'),
      logitCoefficientCosine: summarize('logitCoefficientCosine'),
      ridgeCoefficientCosine: summarize('ridgeCoefficientCosine'),
    },
    folds: folds.map((fold) => ({ ...fold, states: fold.states.join(',') })),
    interpretationRule: {
      transfer: 'aucEarlyFitLateOutcome is the relevant temporal-transfer diagnostic',
      limitation: 'Because 2012 place features are unavailable, this cannot show how a model refit at a 2012 origin would perform.',
    },
  };
  const target = path.join(DATA_DIR, 'window-stability.json');
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
  console.log(`wrote ${target}`);
  console.log(JSON.stringify({ descriptive: result.descriptive, summary: result.summary }, null, 2));
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) main();

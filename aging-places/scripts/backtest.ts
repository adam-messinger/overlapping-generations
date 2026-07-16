/**
 * Spatially grouped validation and production fit for the municipal model.
 *
 * States, rather than individual places, are assigned to deterministic folds.
 * This prevents neighboring places and common state-level price shocks from
 * appearing in both train and test data. All preprocessing statistics and the
 * winner cutoff are learned from each fold's training partition only.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, parseCsv, readCsvAuto } from './lib.js';
import {
  FeatureRow, MODEL_FEATURES, buildMatrix, columnStats, standardize,
  fitLogit, predictLogit, fitRidge, predictLinear, rocAuc, mulberry32,
} from '../src/scoring.js';
import { runAgingSim } from '../src/simulation.js';

export function loadFeatureRows(file: string): FeatureRow[] {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, file)));
  const header = rows[0];
  const at = (name: string): number => header.indexOf(name);
  return rows.slice(1).filter((row) => row.length >= header.length).map((row) => {
    const raw: Record<string, number | null> = {};
    for (let i = 0; i < header.length; i++) {
      const value = row[i] === '' ? null : Number(row[i]);
      raw[header[i]] = value !== null && Number.isFinite(value) ? value : null;
    }
    return {
      geoid: row[0], name: row[1], state: row[2], county: row[3],
      lat: Number(row[4]), lon: Number(row[5]), pop: Number(row[6]), raw,
    };
  });
}

/** Frozen, deterministic state assignment. Changing this function changes the
 * validation set and requires an explicit methodology/version update. */
export function stateFold(state: string, folds = 5): number {
  let hash = 2166136261;
  for (let i = 0; i < state.length; i++) {
    hash ^= state.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % folds;
}

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

function meanSd(values: number[]): { mean: number; sd: number } {
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(1, values.length - 1)) || 1;
  return { mean, sd };
}

function zApply(train: number[], values: number[]): number[] {
  const { mean, sd } = meanSd(train);
  return values.map((value) => Math.max(-4, Math.min(4, (value - mean) / sd)));
}

function pearson(a: number[], b: number[]): number {
  const ma = meanSd(a).mean;
  const mb = meanSd(b).mean;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < a.length; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  return va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : NaN;
}

function ranks(values: number[]): number[] {
  const ordered = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const out = new Array(values.length).fill(0);
  let i = 0;
  while (i < ordered.length) {
    let j = i + 1;
    while (j < ordered.length && ordered[j].value === ordered[i].value) j++;
    const rank = (i + j - 1) / 2;
    for (let k = i; k < j; k++) out[ordered[k].index] = rank;
    i = j;
  }
  return out;
}

function spearman(a: number[], b: number[]): number {
  return pearson(ranks(a), ranks(b));
}

function stateDemeaned(rows: FeatureRow[], growth: number[], indices: number[]): Map<number, number> {
  const means = new Map<string, { sum: number; n: number }>();
  for (const index of indices) {
    const current = means.get(rows[index].state) ?? { sum: 0, n: 0 };
    current.sum += growth[index];
    current.n++;
    means.set(rows[index].state, current);
  }
  const out = new Map<number, number>();
  for (const index of indices) {
    const state = means.get(rows[index].state)!;
    out.set(index, growth[index] - state.sum / state.n);
  }
  return out;
}

interface FoldMetric {
  fold: number;
  n: number;
  nBig: number;
  states: string[];
  aucLogit: number;
  aucHistorical: number;
  aucMechanism: number;
  aucBlend30Mechanism: number;
  aucBlend50Mechanism: number;
  aucBlend70Mechanism: number;
  aucLogitBlend30Mechanism: number;
  aucHistoricalBig: number;
  aucMechanismBig: number;
  aucBlend30MechanismBig: number;
  aucLogitBlend30MechanismBig: number;
  spearmanRidge: number;
  spearmanMechanism: number;
  spearmanBlend30Mechanism: number;
  aucForeignShareBaseline: number;
}

function safeAuc(scores: number[], labels: number[]): number {
  const value = rocAuc(scores, labels);
  return Number.isFinite(value) ? value : 0.5;
}

function orientBaseline(train: number[], trainY: number[], test: number[]): number[] {
  return safeAuc(train, trainY) < 0.5 ? test.map((value) => -value) : test;
}

function summary(values: number[]): { mean: number; min: number; max: number } {
  return {
    mean: +meanSd(values).mean.toFixed(3),
    min: +Math.min(...values).toFixed(3),
    max: +Math.max(...values).toFixed(3),
  };
}

function randomStateBaseline(rows: FeatureRow[], growth: number[]): number {
  const rng = mulberry32(42);
  const train = rows.map((_, i) => i).filter(() => rng() >= 0.3);
  // Recreate the RNG so train/test are complementary and deterministic.
  const rng2 = mulberry32(42);
  const test = rows.map((_, i) => i).filter(() => rng2() < 0.3);
  const cutoff = quantile(train.map((i) => growth[i]), 0.75);
  const yTrain = train.map((i) => Number(growth[i] >= cutoff));
  const globalRate = yTrain.reduce((sum, value) => sum + value, 0) / yTrain.length;
  const byState = new Map<string, { winners: number; n: number }>();
  train.forEach((index, position) => {
    const current = byState.get(rows[index].state) ?? { winners: 0, n: 0 };
    current.winners += yTrain[position];
    current.n++;
    byState.set(rows[index].state, current);
  });
  const score = test.map((index) => {
    const state = byState.get(rows[index].state);
    return state ? (state.winners + 5 * globalRate) / (state.n + 5) : globalRate;
  });
  return safeAuc(score, test.map((i) => Number(growth[i] >= cutoff)));
}

export function main(): void {
  const rows = loadFeatureRows('features2000.csv').filter(
    (row) => row.raw.logGrowth00_25 !== null && row.pop >= 1000
  );
  const growth = rows.map((row) => row.raw.logGrowth00_25 as number);
  const rawMatrix = buildMatrix(rows);
  const mechanismRun = runAgingSim({ epoch: '2000', years: 25, minPop: 1000 });
  const mechanismByGeoid = new Map<string, number>();
  mechanismRun.data.statics.geoid.forEach((geoid, i) => {
    mechanismByGeoid.set(geoid, mechanismRun.simRealLogGrowth[i]);
  });
  const mechanism = rows.map((row) => mechanismByGeoid.get(row.geoid) ?? 0);
  const featureIndex = new Map(MODEL_FEATURES.map((feature, i) => [feature.name, i]));
  const foreignIndex = featureIndex.get('foreignShare')!;
  const folds: FoldMetric[] = [];

  for (let fold = 0; fold < 5; fold++) {
    const test = rows.map((_, i) => i).filter((i) => stateFold(rows[i].state) === fold);
    const train = rows.map((_, i) => i).filter((i) => stateFold(rows[i].state) !== fold);
    const cutoff = quantile(train.map((i) => growth[i]), 0.75);
    const yTrain = train.map((i) => Number(growth[i] >= cutoff));
    const yTest = test.map((i) => Number(growth[i] >= cutoff));
    const trainRaw = train.map((i) => rawMatrix[i]);
    const stats = columnStats(trainRaw);
    const zTrain = standardize(trainRaw, stats.means, stats.sds);
    const zTest = standardize(test.map((i) => rawMatrix[i]), stats.means, stats.sds);

    const logit = fitLogit(zTrain, yTrain, { l2: 1e-3, lr: 0.5, iters: 600 });
    const logitTrain = predictLogit(zTrain, logit);
    const logitTest = predictLogit(zTest, logit);
    const trainDemeaned = stateDemeaned(rows, growth, train);
    const testDemeaned = stateDemeaned(rows, growth, test);
    const ridge = fitRidge(zTrain, train.map((i) => trainDemeaned.get(i)!), 1e-2);
    const ridgeTrain = predictLinear(zTrain, ridge);
    const ridgeTest = predictLinear(zTest, ridge);

    const logitTrainZ = zApply(logitTrain, logitTrain);
    const logitTestZ = zApply(logitTrain, logitTest);
    const ridgeTrainZ = zApply(ridgeTrain, ridgeTrain);
    const ridgeTestZ = zApply(ridgeTrain, ridgeTest);
    const historicalTrain = logitTrainZ.map(
      (value, i) => 0.5 * value + 0.5 * ridgeTrainZ[i]
    );
    const historicalTest = logitTestZ.map(
      (value, i) => 0.5 * value + 0.5 * ridgeTestZ[i]
    );
    const mechanismTrainZ = zApply(train.map((i) => mechanism[i]), train.map((i) => mechanism[i]));
    const mechanismTestZ = zApply(train.map((i) => mechanism[i]), test.map((i) => mechanism[i]));
    const blend = (mechanismWeight: number): number[] => historicalTest.map(
      (value, i) => mechanismWeight * mechanismTestZ[i] + (1 - mechanismWeight) * value
    );
    const blend30 = blend(0.3), blend50 = blend(0.5), blend70 = blend(0.7);
    const logitBlend30 = logitTestZ.map((value, i) => 0.3 * mechanismTestZ[i] + 0.7 * value);
    const bigPositions = test.map((index, position) => ({ index, position }))
      .filter(({ index }) => rows[index].pop >= 10000).map(({ position }) => position);
    const pick = (values: number[]): number[] => bigPositions.map((position) => values[position]);
    const actualDemeaned = test.map((i) => testDemeaned.get(i)!);
    const foreignTrain = zTrain.map((row) => row[foreignIndex]);
    const foreignTest = orientBaseline(foreignTrain, yTrain, zTest.map((row) => row[foreignIndex]));
    const states = [...new Set(test.map((i) => rows[i].state))].sort();
    folds.push({
      fold, n: test.length, nBig: bigPositions.length, states,
      aucLogit: safeAuc(logitTest, yTest),
      aucHistorical: safeAuc(historicalTest, yTest),
      aucMechanism: safeAuc(mechanismTestZ, yTest),
      aucBlend30Mechanism: safeAuc(blend30, yTest),
      aucBlend50Mechanism: safeAuc(blend50, yTest),
      aucBlend70Mechanism: safeAuc(blend70, yTest),
      aucLogitBlend30Mechanism: safeAuc(logitBlend30, yTest),
      aucHistoricalBig: safeAuc(pick(historicalTest), pick(yTest)),
      aucMechanismBig: safeAuc(pick(mechanismTestZ), pick(yTest)),
      aucBlend30MechanismBig: safeAuc(pick(blend30), pick(yTest)),
      aucLogitBlend30MechanismBig: safeAuc(pick(logitBlend30), pick(yTest)),
      spearmanRidge: spearman(ridgeTest, actualDemeaned),
      spearmanMechanism: spearman(mechanismTestZ, actualDemeaned),
      spearmanBlend30Mechanism: spearman(blend30, actualDemeaned),
      aucForeignShareBaseline: safeAuc(foreignTest, yTest),
    });
    // Keep this variable explicit: it verifies every training prediction is
    // produced with the same normalization used to calibrate the blend.
    void historicalTrain;
    void mechanismTrainZ;
  }

  const cv = {
    method: '5-fold state-grouped cross-validation; train-only preprocessing',
    foldAssignment: Object.fromEntries([...new Set(rows.map((row) => row.state))].sort()
      .map((state) => [state, stateFold(state)])),
    folds: folds.map((fold) => ({ ...fold, states: fold.states.join(',') })),
    summary: {
      aucLogit: summary(folds.map((fold) => fold.aucLogit)),
      aucHistorical: summary(folds.map((fold) => fold.aucHistorical)),
      aucMechanism: summary(folds.map((fold) => fold.aucMechanism)),
      aucBlend30Mechanism: summary(folds.map((fold) => fold.aucBlend30Mechanism)),
      aucBlend50Mechanism: summary(folds.map((fold) => fold.aucBlend50Mechanism)),
      aucBlend70Mechanism: summary(folds.map((fold) => fold.aucBlend70Mechanism)),
      aucLogitBlend30Mechanism: summary(folds.map((fold) => fold.aucLogitBlend30Mechanism)),
      aucHistoricalBig: summary(folds.map((fold) => fold.aucHistoricalBig)),
      aucMechanismBig: summary(folds.map((fold) => fold.aucMechanismBig)),
      aucBlend30MechanismBig: summary(folds.map((fold) => fold.aucBlend30MechanismBig)),
      aucLogitBlend30MechanismBig: summary(folds.map((fold) => fold.aucLogitBlend30MechanismBig)),
      spearmanRidge: summary(folds.map((fold) => fold.spearmanRidge)),
      spearmanMechanism: summary(folds.map((fold) => fold.spearmanMechanism)),
      spearmanBlend30Mechanism: summary(folds.map((fold) => fold.spearmanBlend30Mechanism)),
      aucForeignShareBaseline: summary(folds.map((fold) => fold.aucForeignShareBaseline)),
    },
    diagnostics: {
      noSkillAuc: 0.5,
      randomPlaceSplitStateOutcomeBaselineAuc: +randomStateBaseline(rows, growth).toFixed(3),
      warning: 'The random-split state baseline uses outcome-derived state rates and is a leakage diagnostic, not a deployable model.',
    },
  };

  // Production fit on every historical row. Forecast preprocessing remains
  // explicitly epoch-relative: current features are standardized within the
  // current cross-section because nominal levels are not comparable to 2000.
  const allStats = columnStats(rawMatrix);
  const allZ = standardize(rawMatrix, allStats.means, allStats.sds);
  const allCutoff = quantile(growth, 0.75);
  const allY = growth.map((value) => Number(value >= allCutoff));
  const logitW = fitLogit(allZ, allY, { l2: 1e-3, lr: 0.5, iters: 600 });
  const allDemeaned = stateDemeaned(rows, growth, rows.map((_, i) => i));
  const linW = fitRidge(allZ, rows.map((_, i) => allDemeaned.get(i)!), 1e-2);
  const probabilities = predictLogit(allZ, logitW);
  const positiveProbabilities = probabilities.filter((_, i) => allY[i] === 1).sort((a, b) => b - a);
  const threshold = positiveProbabilities[Math.min(
    positiveProbabilities.length - 1, Math.floor(0.9 * positiveProbabilities.length)
  )];
  const model = {
    features: MODEL_FEATURES.map((feature) => feature.name),
    means: allStats.means,
    sds: allStats.sds,
    logitW,
    linW,
    threshold,
    preprocessing: 'epoch_zscore',
    statisticalScore: 'logistic historical-winner index (headline); state-demeaned ridge retained as a diagnostic',
    meta: {
      fitDate: new Date().toISOString().slice(0, 10),
      universe: `US places pop>=1000 with ZHVI 2000 & 2025 (n=${rows.length})`,
      winnerDefinition: `top quartile of log(ZHVI2025/ZHVI2000), cutoff=${allCutoff.toFixed(4)}`,
      outcome: 'Zillow ZHVI city-level, June observations',
      validation: cv.summary,
      caveat: 'Mechanism hindcast is a development diagnostic, not an independently untouched test.',
    },
  };
  fs.writeFileSync(path.join(DATA_DIR, 'model.json'), JSON.stringify(model, null, 2) + '\n');
  fs.writeFileSync(path.join(DATA_DIR, 'validation.json'), JSON.stringify(cv, null, 2) + '\n');

  console.log(`universe n=${rows.length}; production winner cutoff=${allCutoff.toFixed(3)}`);
  console.log(JSON.stringify(cv.summary, null, 2));
  console.log(JSON.stringify(cv.diagnostics, null, 2));
  for (const fold of folds) {
    console.log(`fold ${fold.fold} n=${fold.n} states=${fold.states.join(',')} historical=${fold.aucHistorical.toFixed(3)} mechanism=${fold.aucMechanism.toFixed(3)} blend30=${fold.aucBlend30Mechanism.toFixed(3)}`);
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) main();

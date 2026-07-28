/**
 * Retrospective rolling-origin audit for the ACS-core aging-place signal.
 *
 * Windows:
 *   2009 covariates -> 2009-2014 ZHVI
 *   2014 covariates -> 2014-2019 ZHVI
 *   2019 covariates -> 2019-2024 ZHVI
 *
 * The final 2024 covariates are frozen for future scoring and are never used
 * as predictors of an already-observed outcome.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  columnStats,
  fitLogit,
  fitRidge,
  predictLinear,
  predictLogit,
  standardize,
} from '../src/scoring.js';
import {
  quantile,
  safeAuc,
  spearman,
  stateFold,
} from './backtest.js';
import { parseCsv, readCsvAuto } from './lib.js';

const CORE_FEATURES = [
  'repRatio',
  'youngShare',
  'share65',
  'share45_64',
  'share0_19',
  'eduHealthShare',
  'pubAdminShare',
  'artsEmpShare',
  'profInfoFireShare',
  'armedShare',
  'bachShare',
  'gradShare',
  'collegeShare',
  'seasonalShare',
  'distressVacancy',
  'newBuildShare',
  'foreignShare',
  'valueToIncome',
  'logIncome',
  'logDensity',
  'logPop',
] as const;

type CoreFeature = typeof CORE_FEATURES[number];

interface OriginRow {
  geoid: string;
  state: string;
  pop: number;
  x: (number | null)[];
}

interface WindowRow extends OriginRow {
  outcome: number;
}

interface AuditWindow {
  origin: number;
  destination: number;
  rows: WindowRow[];
}

function numericRecord(header: string[], row: string[]): Record<string, number | null> {
  return Object.fromEntries(header.map((name, index) => {
    const value = row[index] === '' || row[index] === undefined
      ? null
      : Number(row[index]);
    return [name, value !== null && Number.isFinite(value) ? value : null];
  }));
}

function loadPricePanel(dataDir: string, vintage: number): Map<string, Record<string, number | null>> {
  const matrix = parseCsv(
    readCsvAuto(path.join(dataDir, `features${vintage}.csv`)),
  );
  const header = matrix[0];
  const geoidAt = header.indexOf('geoid');
  return new Map(matrix.slice(1).map((row) => [
    row[geoidAt],
    numericRecord(header, row),
  ]));
}

function safeRatio(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  return numerator !== null && numerator !== undefined &&
    denominator !== null && denominator !== undefined && denominator !== 0
    ? numerator / denominator
    : null;
}

function loadOrigins(
  dataDir: string,
  vintage: number,
  landArea: ReadonlyMap<string, number>,
): Map<string, OriginRow> {
  const matrix = parseCsv(readCsvAuto(path.join(dataDir, `acs${vintage}.csv`)));
  const header = matrix[0];
  const geoidAt = header.indexOf('geoid');
  const output = new Map<string, OriginRow>();
  for (const row of matrix.slice(1)) {
    const raw = numericRecord(header, row);
    const geoid = row[geoidAt];
    const pop = raw.pop ?? 0;
    if (!geoid || pop < 1_000) continue;
    const pct = (name: string): number | null => {
      const value = raw[name];
      return value === null || value === undefined ? null : value / 100;
    };
    const add = (...values: (number | null)[]): number | null =>
      values.every((value) => value !== null)
        ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
        : null;
    const share25_44 = add(pct('pct25_34'), pct('pct35_44'));
    const share65 = pct('pct65up');
    const civEmployed = raw.civEmployed;
    const units = raw.units;
    const vacant = raw.vacant;
    const seasonal = raw.seasonalUnits;
    const income = raw.medianHHInc;
    const medianValue = raw.medianValue;
    const density = landArea.get(geoid)
      ? pop / landArea.get(geoid)!
      : null;
    const features: Record<CoreFeature, number | null> = {
      repRatio: safeRatio(share25_44, share65),
      youngShare: add(pct('pct20_24'), pct('pct25_34')),
      share65,
      share45_64: add(pct('pct45_54'), pct('pct55_59'), pct('pct60_64')),
      share0_19: add(
        pct('pctUnder5'),
        pct('pct5_9'),
        pct('pct10_14'),
        pct('pct15_19'),
      ),
      eduHealthShare: pct('pctEduHealth'),
      pubAdminShare: pct('pctPubAdmin'),
      artsEmpShare: pct('pctArtsRec'),
      profInfoFireShare: add(pct('pctProf'), pct('pctInfo'), pct('pctFire')),
      armedShare: safeRatio(
        raw.armedForces,
        civEmployed !== null && civEmployed !== undefined &&
          raw.armedForces !== null && raw.armedForces !== undefined
          ? civEmployed + raw.armedForces
          : null,
      ),
      bachShare: pct('pctBach'),
      gradShare: pct('pctGrad'),
      collegeShare: safeRatio(raw.collegeEnroll, pop),
      seasonalShare: safeRatio(seasonal, units),
      distressVacancy: safeRatio(
        vacant !== null && vacant !== undefined &&
          seasonal !== null && seasonal !== undefined
          ? Math.max(0, vacant - seasonal)
          : null,
        units,
      ),
      newBuildShare: safeRatio(raw.builtRecent, units),
      foreignShare: safeRatio(raw.foreignBorn, pop),
      valueToIncome: safeRatio(medianValue, income),
      logIncome: income !== null && income !== undefined && income > 0
        ? Math.log(income)
        : null,
      logDensity: density !== null && density >= 0 ? Math.log1p(density) : null,
      logPop: Math.log(pop),
    };
    output.set(geoid, {
      geoid,
      state: geoid.slice(0, 2),
      pop,
      x: CORE_FEATURES.map((feature) => features[feature]),
    });
  }
  return output;
}

function loadLandArea(dataDir: string): Map<string, number> {
  const matrix = parseCsv(readCsvAuto(path.join(dataDir, 'places.csv')));
  const header = matrix[0];
  const geoidAt = header.indexOf('geoid');
  const areaAt = header.indexOf('aland_sqmi');
  const result = new Map<string, number>();
  for (const row of matrix.slice(1)) {
    const value = Number(row[areaAt]);
    if (Number.isFinite(value) && value > 0) result.set(row[geoidAt], value);
  }
  return result;
}

function buildWindow(
  origin: number,
  destination: number,
  origins: ReadonlyMap<string, OriginRow>,
  prices: ReadonlyMap<string, Record<string, number | null>>,
): AuditWindow {
  const years = destination - origin;
  const rows: WindowRow[] = [];
  for (const row of origins.values()) {
    const price = prices.get(row.geoid);
    const start = price?.[`zhvi${origin}`];
    const end = price?.[`zhvi${destination}`];
    if (
      start === null || start === undefined || start <= 0 ||
      end === null || end === undefined || end <= 0
    ) continue;
    rows.push({
      ...row,
      outcome: Math.log(end / start) / years,
    });
  }
  return { origin, destination, rows };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function sameWindowCv(window: AuditWindow): {
  n: number;
  meanAuc: number;
  meanSpearman: number;
  folds: {
    fold: number;
    n: number;
    auc: number;
    spearman: number;
  }[];
} {
  const folds = [];
  for (let fold = 0; fold < 5; fold++) {
    const train = window.rows.filter((row) => stateFold(row.state) !== fold);
    const test = window.rows.filter((row) => stateFold(row.state) === fold);
    const stats = columnStats(train.map(({ x }) => x));
    const zTrain = standardize(train.map(({ x }) => x), stats.means, stats.sds);
    const zTest = standardize(test.map(({ x }) => x), stats.means, stats.sds);
    const cutoff = quantile(train.map(({ outcome }) => outcome), 0.75);
    const logit = fitLogit(
      zTrain,
      train.map(({ outcome }) => Number(outcome >= cutoff)),
      { l2: 1e-3, lr: 0.5, iters: 600 },
    );
    const ridge = fitRidge(zTrain, train.map(({ outcome }) => outcome), 1e-2);
    folds.push({
      fold,
      n: test.length,
      auc: safeAuc(
        predictLogit(zTest, logit),
        test.map(({ outcome }) => Number(outcome >= cutoff)),
      ),
      spearman: spearman(
        predictLinear(zTest, ridge),
        test.map(({ outcome }) => outcome),
      ),
    });
  }
  return {
    n: window.rows.length,
    meanAuc: +average(folds.map(({ auc }) => auc)).toFixed(3),
    meanSpearman: +average(folds.map((row) => row.spearman)).toFixed(3),
    folds: folds.map((row) => ({
      ...row,
      auc: +row.auc.toFixed(3),
      spearman: +row.spearman.toFixed(3),
    })),
  };
}

function temporalTransfer(
  training: readonly AuditWindow[],
  test: AuditWindow,
  priorOutcome?: AuditWindow,
): {
  trainWindows: string[];
  testWindow: string;
  n: number;
  auc: number;
  spearman: number;
  laggedOutcomeN: number;
  laggedOutcomeAuc: number | null;
  laggedOutcomeSpearman: number | null;
} {
  const zTraining: number[][] = [];
  const labels: number[] = [];
  const outcomes: number[] = [];
  for (const window of training) {
    const stats = columnStats(window.rows.map(({ x }) => x));
    zTraining.push(...standardize(
      window.rows.map(({ x }) => x),
      stats.means,
      stats.sds,
    ));
    const cutoff = quantile(window.rows.map(({ outcome }) => outcome), 0.75);
    labels.push(...window.rows.map(({ outcome }) => Number(outcome >= cutoff)));
    outcomes.push(...window.rows.map(({ outcome }) => outcome));
  }
  const testStats = columnStats(test.rows.map(({ x }) => x));
  const zTest = standardize(
    test.rows.map(({ x }) => x),
    testStats.means,
    testStats.sds,
  );
  const logit = fitLogit(
    zTraining,
    labels,
    { l2: 1e-3, lr: 0.5, iters: 600 },
  );
  const ridge = fitRidge(zTraining, outcomes, 1e-2);
  const testCutoff = quantile(test.rows.map(({ outcome }) => outcome), 0.75);

  const priorByGeoid = new Map(
    (priorOutcome?.rows ?? []).map((row) => [row.geoid, row.outcome]),
  );
  const lagged = test.rows
    .map((row) => ({
      score: priorByGeoid.get(row.geoid),
      outcome: row.outcome,
    }))
    .filter((row): row is { score: number; outcome: number } =>
      row.score !== undefined);
  return {
    trainWindows: training.map(({ origin, destination }) => `${origin}-${destination}`),
    testWindow: `${test.origin}-${test.destination}`,
    n: test.rows.length,
    auc: +safeAuc(
      predictLogit(zTest, logit),
      test.rows.map(({ outcome }) => Number(outcome >= testCutoff)),
    ).toFixed(3),
    spearman: +spearman(
      predictLinear(zTest, ridge),
      test.rows.map(({ outcome }) => outcome),
    ).toFixed(3),
    laggedOutcomeN: lagged.length,
    laggedOutcomeAuc: lagged.length > 0
      ? +safeAuc(
        lagged.map(({ score }) => score),
        lagged.map(({ outcome }) => Number(outcome >= testCutoff)),
      ).toFixed(3)
      : null,
    laggedOutcomeSpearman: lagged.length > 0
      ? +spearman(
        lagged.map(({ score }) => score),
        lagged.map(({ outcome }) => outcome),
      ).toFixed(3)
      : null,
  };
}

function cosine(left: number[], right: number[]): number {
  const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const nl = Math.sqrt(left.reduce((sum, value) => sum + value ** 2, 0));
  const nr = Math.sqrt(right.reduce((sum, value) => sum + value ** 2, 0));
  return nl > 0 && nr > 0 ? dot / (nl * nr) : NaN;
}

function fullWindowCoefficients(window: AuditWindow): number[] {
  const stats = columnStats(window.rows.map(({ x }) => x));
  const z = standardize(window.rows.map(({ x }) => x), stats.means, stats.sds);
  return fitRidge(z, window.rows.map(({ outcome }) => outcome), 1e-2).slice(1);
}

function projectWindow(
  window: AuditWindow,
  selectedFeatures: readonly CoreFeature[],
): AuditWindow {
  const indices = selectedFeatures.map((feature) => CORE_FEATURES.indexOf(feature));
  return {
    ...window,
    rows: window.rows.map((row) => ({
      ...row,
      x: indices.map((index) => row.x[index]),
    })),
  };
}

export function runRollingOriginAudit(options: {
  dataDir: string;
  currentVintage: number;
  createdAt: string;
}): Record<string, unknown> {
  const land = loadLandArea(options.dataDir);
  const prices = loadPricePanel(options.dataDir, options.currentVintage);
  const origins = new Map<number, Map<string, OriginRow>>();
  for (const year of [2009, 2014, 2019, options.currentVintage]) {
    origins.set(year, loadOrigins(options.dataDir, year, land));
  }
  const windows = [
    buildWindow(2009, 2014, origins.get(2009)!, prices),
    buildWindow(2014, 2019, origins.get(2014)!, prices),
    buildWindow(2019, 2024, origins.get(2019)!, prices),
  ];
  const coefficients = windows.map(fullWindowCoefficients);
  const windowKey = (window: AuditWindow): string =>
    `${window.origin}-${window.destination}`;
  const sameWindow = Object.fromEntries(
    windows.map((window) => [windowKey(window), sameWindowCv(window)]),
  );
  const transfers = [
    temporalTransfer([windows[0]], windows[1], windows[0]),
    temporalTransfer([windows[0], windows[1]], windows[2], windows[1]),
  ];
  // One deliberately bounded iteration after inspecting the full-core
  // transfer: test whether removing faster-moving economic/valuation signals
  // or using demography alone fixes temporal instability. These variants are
  // reported as post-hoc and cannot replace the frozen model.
  const iterationVariants: {
    id: string;
    rationale: string;
    features: readonly CoreFeature[];
  }[] = [
    {
      id: 'slow-structural',
      rationale:
        'Remove arts/professional composition, value-to-income, and income level, which can encode period-specific housing and business cycles.',
      features: CORE_FEATURES.filter((feature) => ![
        'artsEmpShare',
        'profInfoFireShare',
        'valueToIncome',
        'logIncome',
      ].includes(feature)),
    },
    {
      id: 'demography-only',
      rationale:
        'Ask whether the slow population-age stock alone transfers more reliably than the broader place model.',
      features: [
        'repRatio',
        'youngShare',
        'share65',
        'share45_64',
        'share0_19',
        'foreignShare',
        'logDensity',
        'logPop',
      ],
    },
  ];
  const exploratoryIteration = iterationVariants.map((variant) => {
    const projected = windows.map((window) =>
      projectWindow(window, variant.features));
    const variantTransfers = [
      temporalTransfer([projected[0]], projected[1], projected[0]),
      temporalTransfer(
        [projected[0], projected[1]],
        projected[2],
        projected[1],
      ),
    ];
    const passedPromotionRule = variantTransfers.every((result, index) =>
      result.auc > transfers[index].auc &&
      result.spearman > transfers[index].spearman &&
      result.auc > (result.laggedOutcomeAuc ?? -Infinity) &&
      result.spearman > (result.laggedOutcomeSpearman ?? -Infinity));
    return {
      id: variant.id,
      rationale: variant.rationale,
      features: variant.features,
      temporalTransfer: variantTransfers,
      promotionRule:
        'Must beat the full-core model and lagged-growth baseline on both AUC and Spearman in both transfer windows.',
      passedPromotionRule,
    };
  });
  const coefficientStability = [
    [0, 1],
    [1, 2],
    [0, 2],
  ].map(([left, right]) => ({
    left: windowKey(windows[left]),
    right: windowKey(windows[right]),
    cosine: +cosine(coefficients[left], coefficients[right]).toFixed(3),
    signAgreement: +(
      coefficients[left].filter((value, index) =>
        Math.sign(value) === Math.sign(coefficients[right][index])).length /
      CORE_FEATURES.length
    ).toFixed(3),
  }));
  return {
    schemaVersion: 'aging-places.rolling-origin-audit/v1',
    createdAt: options.createdAt,
    status:
      'retrospective temporal audit; coefficients inspected here remain exploratory and do not replace data/model.json',
    currentForecastOrigin: {
      vintage: options.currentVintage,
      status: 'frozen for future scoring; no post-2024 outcome used',
    },
    universe:
      'Exact current place GEOID and Zillow-name-match intersection, origin population >=1,000, with June endpoint ZHVI.',
    windows: windows.map((window) => ({
      origin: window.origin,
      destination: window.destination,
      n: window.rows.length,
    })),
    features: {
      included: CORE_FEATURES,
      excluded: [
        'university proximity (historical IPEDS panel not yet captured)',
        '60/120-minute population access (historical geography not yet reconstructed)',
        'separate education and health employment shares (profile vintages expose a stable combined category)',
      ],
      preprocessing:
        'Origin-relative z-scores; same-window CV estimates train statistics only. Temporal transfer applies weights to destination-origin-relative z-scores.',
    },
    sameWindowStateGroupedCrossValidation: sameWindow,
    temporalTransfer: transfers,
    oneExploratoryIteration: {
      trigger:
        'The full-core temporal-transfer Spearman correlations were near zero despite stronger same-window fits.',
      variants: exploratoryIteration,
      result: exploratoryIteration.some(({ passedPromotionRule }) =>
        passedPromotionRule)
        ? 'A variant passed the deliberately strict screen, but remains post-hoc and requires a new untouched evaluation before promotion.'
        : 'No simplified variant passed the screen; retain the frozen model and narrow its interpretation rather than retuning coefficients.',
    },
    coefficientStability,
    baseline:
      'Lagged local house-price growth is scored on the same exact-GEOID intersection.',
    limitations: [
      'Retrospective windows were selected before this run but are not untouched prospective tests.',
      'Current 2024 place identifiers and coordinates create survivorship and boundary-stability selection.',
      'Zillow coverage is a selected housing-market subset and is not all Census places.',
      'ACS estimates overlap within five-year windows and carry sampling error; MOEs are preserved but not used as regression weights.',
      'National and state house-price shocks are not structural aging effects.',
    ],
  };
}

async function main(): Promise<void> {
  const dataDir = process.argv.find((arg) => arg.startsWith('--data-dir='))
    ?.slice('--data-dir='.length);
  const output = process.argv.find((arg) => arg.startsWith('--output='))
    ?.slice('--output='.length);
  const vintage = Number(
    process.argv.find((arg) => arg.startsWith('--vintage='))
      ?.slice('--vintage='.length) ?? 2024,
  );
  if (!dataDir || !output) {
    throw new Error('usage: rolling-origin.ts --data-dir=... --output=... [--vintage=2024]');
  }
  const result = runRollingOriginAudit({
    dataDir,
    currentVintage: vintage,
    createdAt: new Date().toISOString(),
  });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`wrote ${output}`);
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}

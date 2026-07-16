/**
 * Forward municipal ranking and mechanism scenario, 2025-2065.
 *
 * The headline ranking is the state-grouped-validated logistic winner model.
 * The mechanism simulation is reported separately because adding it to the
 * classifier did not improve mean held-out-state AUC. Structural valuation is
 * also separate and excludes current prices from its fundamental score.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, OUT_DIR, ensureDirs, writeCsv } from './lib.js';
import { loadFeatureRows } from './backtest.js';
import {
  MODEL_FEATURES, ModelSpec, buildMatrix, columnStats, standardize, predictLogit, predictLinear,
} from '../src/scoring.js';
import { runAgingSim } from '../src/simulation.js';
import { attractionModule } from '../src/modules/attraction.js';

function zVec(values: number[]): number[] {
  const present = values.filter(Number.isFinite);
  const mean = present.reduce((sum, value) => sum + value, 0) / Math.max(1, present.length);
  const sd = Math.sqrt(present.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(1, present.length - 1)) || 1;
  return values.map((value) => Number.isFinite(value) ? (value - mean) / sd : 0);
}

export interface ConfidenceInputs {
  pop: number;
  hasZhvi: boolean;
  hasIncome: boolean;
  observedUnits: number;
  groupQuartersShare: number;
  missingFeatureCount: number;
  extremeFeatureCount: number;
  modelDisagreement: number;
}

export function classifyConfidence(input: ConfidenceInputs): {
  confidence: 'high' | 'medium' | 'low'; reasons: string[];
} {
  const hard: string[] = [];
  const cautions: string[] = [];
  if (input.pop < 2500) hard.push('population below 2,500');
  if (!input.hasZhvi) hard.push('no observed Zillow price');
  if (!input.hasIncome) hard.push('missing household income');
  if (input.observedUnits <= 0) hard.push('zero reported housing units');
  if (input.groupQuartersShare >= 0.5) hard.push('majority group-quarters population');
  else if (input.groupQuartersShare >= 0.25) cautions.push('high group-quarters population');
  if (input.missingFeatureCount > 5) hard.push('many missing predictors');
  else if (input.missingFeatureCount > 2) cautions.push('several missing predictors');
  if (input.extremeFeatureCount > 2) cautions.push('outside historical predictor support');
  if (input.modelDisagreement > 3) hard.push('large statistical/mechanism disagreement');
  else if (input.modelDisagreement > 2) cautions.push('statistical/mechanism disagreement');
  if (hard.length > 0) return { confidence: 'low', reasons: [...hard, ...cautions] };
  if (cautions.length > 0) return { confidence: 'medium', reasons: cautions };
  return { confidence: 'high', reasons: [] };
}

interface PlaceOut {
  geoid: string;
  name: string;
  state: string;
  pop: number;
  /** Standardized headline score; ranking-equivalent to historicalWinnerIndex. */
  outlook: number;
  /** A 0--1 logistic ranking index, not a calibrated forward probability. */
  historicalWinnerIndex: number;
  mechanismScore: number;
  mechanismRealLogGrowth: number;
  historicalRelativeGrowth: number;
  structuralScore: number;
  valuationGap: number | null;
  modelDisagreement: number;
  zhvi2025: number | null;
  medianValue: number | null;
  housingMarketEligible: boolean;
  confidence: 'high' | 'medium' | 'low';
  confidenceReasons: string[];
  pillars: Record<string, number>;
  tags: string[];
  positives: string[];
  negatives: string[];
}

const PILLAR_LABELS: Record<string, string> = {
  engines: 'institutional engines',
  human: 'human capital',
  access: 'market access',
  regen: 'demographic regeneration',
  gateway: 'immigrant gateway',
  amenity: 'amenity capital',
  scarcity: 'structural housing scarcity',
  distress: 'distress vacancy',
  health: 'healthcare capacity',
};

export function main(): void {
  ensureDirs();
  const model: ModelSpec = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'model.json'), 'utf8'));
  if (model.preprocessing !== 'epoch_zscore') {
    throw new Error(`unsupported model preprocessing: ${String(model.preprocessing)}`);
  }
  const rows = loadFeatureRows('features2023.csv').filter((row) => row.pop >= 250);
  const rawMatrix = buildMatrix(rows);
  // Explicitly epoch-relative: nominal 2023 levels are not standardized with
  // year-2000 dollars. The model artifact records this preprocessing contract.
  const currentStats = columnStats(rawMatrix);
  const zMatrix = standardize(rawMatrix, currentStats.means, currentStats.sds);
  const historicalWinnerIndex = predictLogit(zMatrix, model.logitW);
  const relativeGrowth = predictLinear(zMatrix, model.linW);
  const outlook = zVec(historicalWinnerIndex);

  const sim = runAgingSim({ epoch: '2023', years: 40, minPop: 250 });
  const simIndex = new Map(sim.data.statics.geoid.map((geoid, i) => [geoid, i]));
  const mechanismGrowth = rows.map((row) => {
    const index = simIndex.get(row.geoid);
    return index === undefined ? NaN : sim.simRealLogGrowth[index];
  });
  const mechanismScore = zVec(mechanismGrowth);

  const attraction = attractionModule.init(attractionModule.mergeParams({ statics: sim.data.statics }));
  const pillarByGeoid = new Map<string, Record<string, number>>();
  for (let i = 0; i < sim.data.statics.n; i++) {
    pillarByGeoid.set(sim.data.statics.geoid[i], {
      engines: attraction.engines[i], human: attraction.human[i], access: attraction.access[i],
      regen: attraction.regen[i], gateway: attraction.gateway[i], amenity: attraction.amenity[i],
      scarcity: attraction.scarcity[i], distress: attraction.distress[i], health: attraction.health[i],
    });
  }
  const structuralRaw = rows.map((row) => {
    const p = pillarByGeoid.get(row.geoid) ?? {};
    return 0.25 * (p.engines ?? 0) + 0.20 * (p.human ?? 0) + 0.20 * (p.access ?? 0) +
      0.10 * (p.regen ?? 0) + 0.10 * (p.gateway ?? 0) + 0.08 * (p.amenity ?? 0) +
      0.05 * (p.scarcity ?? 0) + 0.07 * (p.health ?? 0) - 0.10 * (p.distress ?? 0);
  });
  const structuralScore = zVec(structuralRaw);
  const logPriceToIncome = rows.map((row) => {
    const price = row.raw.zhvi2025 ?? row.raw.medianValue;
    const income = row.raw.medianHHInc;
    return price !== null && income !== null && income > 0 ? Math.log(price / income) : NaN;
  });
  const valuationZ = zVec(logPriceToIncome);

  const out: PlaceOut[] = rows.map((row, i) => {
    const p = pillarByGeoid.get(row.geoid) ?? {};
    const contributions: [string, number][] = [
      ['engines', 0.25 * (p.engines ?? 0)], ['human', 0.20 * (p.human ?? 0)],
      ['access', 0.20 * (p.access ?? 0)], ['regen', 0.10 * (p.regen ?? 0)],
      ['gateway', 0.10 * (p.gateway ?? 0)], ['amenity', 0.08 * (p.amenity ?? 0)],
      ['scarcity', 0.05 * (p.scarcity ?? 0)], ['health', 0.07 * (p.health ?? 0)],
      ['distress', -0.10 * (p.distress ?? 0)],
    ];
    const positives = [...contributions].sort((a, b) => b[1] - a[1])
      .filter(([, value]) => value > 0.10).slice(0, 3).map(([key]) => PILLAR_LABELS[key]);
    const negatives = [...contributions].sort((a, b) => a[1] - b[1])
      .filter(([, value]) => value < -0.10).slice(0, 3).map(([key]) => PILLAR_LABELS[key]);
    const featureZ = (name: string): number => {
      const index = MODEL_FEATURES.findIndex((feature) => feature.name === name);
      return index >= 0 ? zMatrix[i][index] : 0;
    };
    const tags: string[] = [];
    if ((row.raw.collegeShare ?? 0) > 0.15) tags.push('Knowledge Center');
    if (featureZ('healthEmpShare') > 1.5 && row.pop >= 20000) tags.push('Medical Hub');
    if (featureZ('pubAdminShare') > 1.5) tags.push('Government Hub');
    if (featureZ('armedShare') > 1.5) tags.push('Military Anchor');
    if ((p.engines ?? 0) > 0.8 && featureZ('logPopAccess60') < 0 && row.pop >= 10000) tags.push('Regional Service Center');
    if (featureZ('seasonalShare') > 1) tags.push('Amenity Destination');
    if (featureZ('share45_64') > 1 && featureZ('repRatio') < -0.3) tags.push('Aging Trap');
    if ((p.engines ?? 0) < -0.8 && featureZ('logPopAccess60') < -0.5) tags.push('Institutional Risk');

    const simI = simIndex.get(row.geoid);
    const observedUnits = simI === undefined ? 0 : sim.data.statics.observedUnits0[simI];
    const groupQuartersShare = simI === undefined ? 0 : sim.data.statics.groupQuartersShare[simI];
    const housingMarketEligible = simI !== undefined && sim.data.statics.housingMarketEligible[simI] === 1;
    const missingFeatureCount = rawMatrix[i].filter((value) => value === null).length;
    const extremeFeatureCount = zMatrix[i].filter((value) => Math.abs(value) > 4).length;
    const disagreement = Math.abs(outlook[i] - mechanismScore[i]);
    const confidence = classifyConfidence({
      pop: row.pop,
      hasZhvi: row.raw.zhvi2025 !== null,
      hasIncome: row.raw.medianHHInc !== null,
      observedUnits,
      groupQuartersShare,
      missingFeatureCount,
      extremeFeatureCount,
      modelDisagreement: disagreement,
    });
    return {
      geoid: row.geoid, name: row.name, state: row.state, pop: row.pop,
      outlook: +outlook[i].toFixed(3),
      historicalWinnerIndex: +historicalWinnerIndex[i].toFixed(4),
      mechanismScore: +mechanismScore[i].toFixed(3),
      mechanismRealLogGrowth: +mechanismGrowth[i].toFixed(3),
      historicalRelativeGrowth: +relativeGrowth[i].toFixed(3),
      structuralScore: +structuralScore[i].toFixed(3),
      valuationGap: Number.isFinite(logPriceToIncome[i])
        ? +(structuralScore[i] - valuationZ[i]).toFixed(3) : null,
      modelDisagreement: +disagreement.toFixed(3),
      zhvi2025: row.raw.zhvi2025,
      medianValue: row.raw.medianValue,
      housingMarketEligible,
      confidence: confidence.confidence,
      confidenceReasons: confidence.reasons,
      pillars: Object.fromEntries(Object.entries(p).map(([key, value]) => [key, +value.toFixed(2)])),
      tags, positives, negatives,
    };
  });

  const header = [
    'geoid', 'name', 'state', 'pop', 'outlook', 'historicalWinnerIndex',
    'mechanismScore', 'mechanismRealLogGrowth', 'historicalRelativeGrowth',
    'structuralScore', 'valuationGap', 'modelDisagreement', 'zhvi2025', 'medianValue',
    'housingMarketEligible', 'confidence', 'confidenceReasons',
    'engines', 'human', 'access', 'regen', 'gateway', 'amenity', 'scarcity', 'health', 'distress',
    'tags', 'positives', 'negatives',
  ];
  const toRow = (place: PlaceOut): (string | number | null)[] => [
    place.geoid, place.name, place.state, place.pop, place.outlook, place.historicalWinnerIndex,
    place.mechanismScore, place.mechanismRealLogGrowth, place.historicalRelativeGrowth,
    place.structuralScore, place.valuationGap, place.modelDisagreement,
    place.zhvi2025, place.medianValue, Number(place.housingMarketEligible), place.confidence,
    place.confidenceReasons.join('; '),
    place.pillars.engines ?? null, place.pillars.human ?? null, place.pillars.access ?? null,
    place.pillars.regen ?? null, place.pillars.gateway ?? null, place.pillars.amenity ?? null,
    place.pillars.scarcity ?? null, place.pillars.health ?? null, place.pillars.distress ?? null,
    place.tags.join('; '), place.positives.join('; '), place.negatives.join('; '),
  ];
  writeCsv(path.join(OUT_DIR, 'forecast-all.csv.gz'), header, out.map(toRow));

  const eligible = out.filter((place) =>
    place.pop >= 10000 && place.housingMarketEligible && place.zhvi2025 !== null && place.confidence !== 'low'
  );
  const ranked = [...eligible].sort((a, b) => b.outlook - a.outlook);
  writeCsv(path.join(OUT_DIR, 'top100.csv'), header, ranked.slice(0, 100).map(toRow));
  writeCsv(path.join(OUT_DIR, 'bottom100.csv'), header, ranked.slice(-100).reverse().map(toRow));
  const valued = eligible.filter((place) => place.valuationGap !== null);
  const byValue = [...valued].sort((a, b) => (b.valuationGap ?? 0) - (a.valuationGap ?? 0));
  writeCsv(path.join(OUT_DIR, 'undervalued.csv'), header,
    byValue.filter((place) => place.structuralScore >= 0.5).slice(0, 100).map(toRow));
  writeCsv(path.join(OUT_DIR, 'overvalued.csv'), header,
    byValue.filter((place) => place.structuralScore < 0).reverse().slice(0, 100).map(toRow));

  console.log(`headline eligible universe: ${ranked.length}`);
  console.log('=== TOP 20: validated historical winner score ===');
  ranked.slice(0, 20).forEach((place, i) => console.log(
    `${String(i + 1).padStart(2)} ${place.outlook.toFixed(2).padStart(6)} index=${place.historicalWinnerIndex.toFixed(3)} ${place.name}, ${place.state} [${place.confidence}]`
  ));
  console.log('=== BOTTOM 20 ===');
  ranked.slice(-20).reverse().forEach((place, i) => console.log(
    `${String(ranked.length - i).padStart(4)} ${place.outlook.toFixed(2).padStart(6)} index=${place.historicalWinnerIndex.toFixed(3)} ${place.name}, ${place.state} [${place.confidence}]`
  ));
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) main();

/**
 * Tetlock-style forecasting pilot for U.S. data-center electricity in 2035.
 *
 * This is intentionally a question-specific adapter, not a tsimulation
 * framework feature. It keeps three different objects separate:
 *
 * 1. the global model's deterministic scenarios;
 * 2. the BNEF-aligned U.S. grid model's deterministic realization scenarios;
 * 3. an explicitly judgmental probability mixture used to map present
 *    evidence into the forecast question's four resolution bins.
 *
 * Reproduce with:
 *   node --import tsx scripts/forecast-data-center-2035.ts
 */

import { runSimulation } from '../src/simulation.js';
import {
  dataCenterGridScenarios,
  simulateDataCenterGrid,
} from '../src/simulations/news/data-center-grid.js';

const SEED = 20_350_723;
const DRAWS = 200_000;

type ForecastBin = 'below 10%' | '10% to below 15%' | '15% to below 20%' | '20% or more';
type SourceFamily = 'EIA general energy model' | 'LBNL specialized bottom-up model';
type GrowthRegime = 'EIA path' | 'headwinds' | 'central' | 'lift-off';

interface Draw {
  share2030: number;
  share2035: number;
  relativeLogGrowth: number;
  sourceFamily: SourceFamily;
  growthRegime: GrowthRegime;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4_294_967_296;
  };
}

function normal(random: () => number): number {
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function logit(value: number): number {
  return Math.log(value / (1 - value));
}

function logistic(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function classify(share: number): ForecastBin {
  if (share < 0.10) return 'below 10%';
  if (share < 0.15) return '10% to below 15%';
  if (share < 0.20) return '15% to below 20%';
  return '20% or more';
}

function quantile(sorted: readonly number[], probability: number): number {
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(probability * sorted.length)),
  );
  return sorted[index];
}

/**
 * Question-specific evidence mixture.
 *
 * EIA AEO 2026 projects 2030 server electricity of 178-191 TWh and 2035
 * server electricity of 254-304 TWh. Converting from server-only to full-site
 * load gives a rough 2030 share near 6%; its path implies roughly 6% annual
 * log-odds growth relative to non-data-center electricity through 2035.
 *
 * LBNL's June 2026 specialized bottom-up report instead estimates a 2030
 * full-site reference share of 11.8%, with compounded sensitivity scenarios
 * of 9.5%-15.3%. We represent inter-model discrepancy by assigning 25% weight
 * to the EIA family and 75% to LBNL. These are analyst weights, not frequencies.
 *
 * Conditional on LBNL, post-2030 relative growth is a three-regime judgment:
 * 30% headwinds, 50% central, 20% lift-off. The annual rates are log growth in
 * data-center/non-data-center electricity odds. The intentionally broad
 * distributions acknowledge historical forecast misses in both directions.
 */
function drawForecasts(eiaWeight: number, seed = SEED): Draw[] {
  const random = mulberry32(seed);
  const draws: Draw[] = [];

  for (let i = 0; i < DRAWS; i++) {
    const isEia = random() < eiaWeight;
    let share2030: number;
    let relativeLogGrowth: number;
    let sourceFamily: SourceFamily;
    let growthRegime: GrowthRegime;

    if (isEia) {
      sourceFamily = 'EIA general energy model';
      growthRegime = 'EIA path';
      share2030 = logistic(logit(0.060) + 0.25 * normal(random));
      relativeLogGrowth = 0.060 + 0.030 * normal(random);
    } else {
      sourceFamily = 'LBNL specialized bottom-up model';
      share2030 = logistic(logit(0.118) + 0.23 * normal(random));
      const regime = random();
      if (regime < 0.30) {
        growthRegime = 'headwinds';
        relativeLogGrowth = 0.030 + 0.030 * normal(random);
      } else if (regime < 0.80) {
        growthRegime = 'central';
        relativeLogGrowth = 0.100 + 0.035 * normal(random);
      } else {
        growthRegime = 'lift-off';
        relativeLogGrowth = 0.170 + 0.040 * normal(random);
      }
    }

    const share2035 = logistic(logit(share2030) + 5 * relativeLogGrowth);
    draws.push({
      share2030,
      share2035,
      relativeLogGrowth,
      sourceFamily,
      growthRegime,
    });
  }
  return draws;
}

function summarize(draws: readonly Draw[]) {
  const orderedBins: ForecastBin[] = [
    'below 10%',
    '10% to below 15%',
    '15% to below 20%',
    '20% or more',
  ];
  const binCounts = new Map<ForecastBin, number>(
    orderedBins.map((bin) => [bin, 0]),
  );
  for (const draw of draws) {
    const bin = classify(draw.share2035);
    binCounts.set(bin, (binCounts.get(bin) ?? 0) + 1);
  }
  const shares = draws.map((draw) => draw.share2035).sort((a, b) => a - b);
  return {
    bins: Object.fromEntries(
      orderedBins.map((bin) => [bin, (binCounts.get(bin) ?? 0) / draws.length]),
    ) as Record<ForecastBin, number>,
    p10: quantile(shares, 0.10),
    median: quantile(shares, 0.50),
    p90: quantile(shares, 0.90),
  };
}

function conditionalProbability(
  draws: readonly Draw[],
  condition: (draw: Draw) => boolean,
): { draws: number; pAtLeast20: number } {
  const selected = draws.filter(condition);
  return {
    draws: selected.length,
    pAtLeast20:
      selected.filter((draw) => draw.share2035 >= 0.20).length /
      selected.length,
  };
}

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;

console.log('=== U.S. data-center electricity forecast pilot ===');
console.log(`seed=${SEED}; draws=${DRAWS.toLocaleString()}`);

console.log('\n1. Existing global model: deterministic scenario sensitivity');
const globalCases = [
  {
    case: 'slower / tighter spend brake',
    demand: {
      dataCenterBaseGrowth: 0.08,
      dataCenterPowerSpendCeiling: 0.00035,
    },
  },
  { case: 'repository baseline', demand: {} },
  {
    case: 'faster / looser spend brake',
    demand: {
      dataCenterBaseGrowth: 0.16,
      dataCenterPowerSpendCeiling: 0.00080,
    },
  },
];
console.table(globalCases.map(({ case: label, demand }) => {
  const result = runSimulation({ endYear: 2035, demand });
  const row2030 = result.results.find((row) => row.year === 2030)!;
  const row2035 = result.results.find((row) => row.year === 2035)!;
  return {
    case: label,
    '2030 global DC TWh': row2030.dataCenterLoadTWh.toFixed(0),
    '2035 global DC TWh': row2035.dataCenterLoadTWh.toFixed(0),
    '2035 global electricity share': pct(
      row2035.dataCenterLoadTWh / row2035.electricityDemand,
    ),
    '2035 DC capex $T/yr': row2035.dataCenterCapexSpend.toFixed(2),
  };
}));

console.log('\n2. Existing U.S. grid model: BNEF scenario realization sensitivity');
const bnefScenario = dataCenterGridScenarios['full-pledge-clean-flex'];
const existingLoadTwh = 35 * bnefScenario.loadFactor * bnefScenario.hoursPerYear / 1_000;
console.table([0.50, 0.75, 1.00].map((realization) => {
  const result = simulateDataCenterGrid({
    ...bnefScenario,
    id: `bnef-realization-${realization}`,
    expectedLoadRealization: realization,
  });
  const totalDcTwh = existingLoadTwh + result.annualElectricityTwh;
  const totalElectricityTwh =
    bnefScenario.nonDataCenterRetailSalesTwh + totalDcTwh;
  return {
    'incremental realization': pct(realization),
    'total DC TWh': totalDcTwh.toFixed(0),
    'U.S. electricity share': pct(totalDcTwh / totalElectricityTwh),
  };
}));

console.log('\n3. Question-specific probability mixture');
const draws = drawForecasts(0.25);
const summary = summarize(draws);
console.table(Object.entries(summary.bins).map(([bin, probability]) => ({
  bin,
  probability: pct(probability),
})));
console.table([{
  '10th percentile': pct(summary.p10),
  median: pct(summary.median),
  '90th percentile': pct(summary.p90),
}]);

console.log('\n4. Conditional crux probabilities');
const conditions: Array<[string, (draw: Draw) => boolean]> = [
  ['2030 share >= 12%', (draw) => draw.share2030 >= 0.12],
  ['2030 share < 12%', (draw) => draw.share2030 < 0.12],
  ['post-2030 relative growth >= 10%/yr', (draw) => draw.relativeLogGrowth >= 0.10],
  ['post-2030 relative growth < 10%/yr', (draw) => draw.relativeLogGrowth < 0.10],
  ['EIA family', (draw) => draw.sourceFamily === 'EIA general energy model'],
  ['LBNL family', (draw) => draw.sourceFamily === 'LBNL specialized bottom-up model'],
  ['LBNL headwinds', (draw) => draw.growthRegime === 'headwinds'],
  ['LBNL central', (draw) => draw.growthRegime === 'central'],
  ['LBNL lift-off', (draw) => draw.growthRegime === 'lift-off'],
];
console.table(conditions.map(([condition, predicate]) => {
  const result = conditionalProbability(draws, predicate);
  return {
    condition,
    draws: result.draws,
    'P(2035 share >= 20%)': pct(result.pAtLeast20),
  };
}));

console.log('\n5. Structural-model-weight sensitivity (not sampling error)');
console.table([0, 0.25, 0.50].map((eiaWeight, index) => {
  const result = summarize(drawForecasts(eiaWeight, SEED + index));
  return {
    'EIA-family weight': pct(eiaWeight),
    '<10%': pct(result.bins['below 10%']),
    '10-15%': pct(result.bins['10% to below 15%']),
    '15-20%': pct(result.bins['15% to below 20%']),
    '>=20%': pct(result.bins['20% or more']),
  };
}));

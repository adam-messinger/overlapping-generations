import { calibrateRareEarthEvent } from '../src/simulations/critical-materials/calibration.js';
import {
  criticalMaterialNetwork,
  nMinusOneCoverage,
  weberBenchmark,
} from '../src/simulations/critical-materials/data.js';
import { simulateDynamicNetwork } from '../src/simulations/critical-materials/dynamic-network.js';
import {
  evaluateWeberPeriod,
  fitWeberModels,
  simulatePriceShock,
} from '../src/simulations/critical-materials/price-network.js';

const fit = fitWeberModels(weberBenchmark);
console.log('WEBER METHOD REPRODUCTION');
console.log('Training: 2000–2019 volatility experiment. Holdouts: 2021-Q4 and 2022-Q2 shock vectors.');
console.log('These targets are published model outputs, not observed causal CPI contributions.\n');
console.log('Period\tV1 direct MAE\tV1 rank rho\tV2 network MAE\tV2 rank rho');
for (const period of ['covid', 'ukraine'] as const) {
  const v1 = evaluateWeberPeriod(weberBenchmark, period, 'v1', fit);
  const v2 = evaluateWeberPeriod(weberBenchmark, period, 'v2', fit);
  console.log(
    [
      period,
      v1.maePctPoints.toFixed(3),
      v1.rankCorrelation.toFixed(3),
      v2.maePctPoints.toFixed(3),
      v2.rankCorrelation.toFixed(3),
    ].join('\t'),
  );
}

const rareV1 = calibrateRareEarthEvent('v1');
const rareV2 = calibrateRareEarthEvent('v2');
console.log('\n2025 RARE-EARTH EVENT ENVELOPE');
console.log('Version\tinventory months\tprice elasticity\tfirst EV curtailment\trecovery\tpeak import price');
for (const [label, calibration] of [
  ['V1 static', rareV1],
  ['V2 dynamic', rareV2],
] as const) {
  console.log(
    [
      label,
      calibration.inventoryMonths.toFixed(2),
      calibration.priceElasticity.toFixed(2),
      calibration.result.firstCurtailmentMonth ?? 'none',
      calibration.result.recoveryMonth ?? 'none',
      `${calibration.result.peakSourcePriceMultiple.toFixed(2)}x`,
    ].join('\t'),
  );
}

const sources = Object.keys(nMinusOneCoverage);
const risks = sources.map((source) => {
  const coverage = nMinusOneCoverage[source];
  const path = [1, ...Array(11).fill(coverage)];
  const base = simulateDynamicNetwork(criticalMaterialNetwork, {
    months: 12,
    supplyPaths: { [source]: path },
    revision: 'v2',
    inventoryMonthsOverride: rareV2.inventoryMonths,
    priceElasticity: rareV2.priceElasticity,
    pricePassThrough: 0.85,
  });
  const stockpile = simulateDynamicNetwork(criticalMaterialNetwork, {
    months: 12,
    supplyPaths: { [source]: path },
    revision: 'v2',
    inventoryMonthsOverride: rareV2.inventoryMonths,
    inventoryMultiplier: 3,
    priceElasticity: rareV2.priceElasticity,
    pricePassThrough: 0.85,
  });
  const diversified = simulateDynamicNetwork(criticalMaterialNetwork, {
    months: 12,
    supplyPaths: {
      [source]: [1, ...Array(11).fill(Math.min(1, coverage + 0.2))],
    },
    revision: 'v2',
    inventoryMonthsOverride: rareV2.inventoryMonths,
    priceElasticity: rareV2.priceElasticity,
    pricePassThrough: 0.85,
  });
  const priceImpact = simulatePriceShock(
    criticalMaterialNetwork,
    source,
    1,
    0.85,
  ).finalBasketPriceChange;
  return {
    source,
    coverage,
    outputLoss: base.cumulativeWeightedOutputLoss,
    stockpileAvoided: base.cumulativeWeightedOutputLoss - stockpile.cumulativeWeightedOutputLoss,
    diversityAvoided: base.cumulativeWeightedOutputLoss - diversified.cumulativeWeightedOutputLoss,
    priceImpact,
  };
});
risks.sort((a, b) => b.outputLoss - a.outputLoss);

console.log('\n12-MONTH N-1 STRESS (toy strategic-manufacturing basket)');
console.log('Material\tN-1 coverage\toutput-months lost\t3x stock buffer avoids\t+20pp diversity avoids\t100% price shock basket impact');
for (const risk of risks) {
  console.log(
    [
      risk.source,
      `${(100 * risk.coverage).toFixed(1)}%`,
      risk.outputLoss.toFixed(2),
      risk.stockpileAvoided.toFixed(2),
      risk.diversityAvoided.toFixed(2),
      `${(100 * risk.priceImpact).toFixed(2)}%`,
    ].join('\t'),
  );
}

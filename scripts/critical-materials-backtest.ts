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
import { calibrateDisruptionModel } from '../src/simulations/critical-materials/event-backtest.js';
import {
  buildEmpiricalMaterialOverlay,
  simulateEmpiricalNMinusOne,
} from '../src/simulations/critical-materials/empirical-network.js';

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

const eventV1 = calibrateDisruptionModel('cost-share-v1');
const eventV3 = calibrateDisruptionModel('physical-v3');
console.log('\nFIVE-EVENT PHYSICAL BOTTLENECK BACKTEST');
console.log('Development: 2010 rare earths, 2011 Tohoku, 2021 chips. Holdout: 2023 gallium, 2025 rare earths.');
console.log('Version\taccessible inventory\tdevelopment score\tholdout score');
for (const calibration of [eventV1, eventV3]) {
  console.log([
    calibration.model,
    `${(100 * calibration.parameters.accessibleInventoryFraction).toFixed(0)}%`,
    calibration.development.meanScore.toFixed(3),
    calibration.holdout.meanScore.toFixed(3),
  ].join('\t'));
}
console.log('\nEvent\tset\tV1 onset\tV3 onset\tV3 recovery\tV3 trough loss\tV3 peak input price');
const v1Events = new Map(
  [...eventV1.development.events, ...eventV1.holdout.events].map((row) => [row.eventId, row]),
);
for (const row of [...eventV3.development.events, ...eventV3.holdout.events]) {
  const fitSet = eventV3.development.events.some((candidate) => candidate.eventId === row.eventId)
    ? 'development'
    : 'holdout';
  console.log([
    row.eventId,
    fitSet,
    v1Events.get(row.eventId)?.prediction.firstCurtailmentMonth ?? 'none',
    row.prediction.firstCurtailmentMonth ?? 'none',
    row.prediction.recoveryMonth ?? 'none',
    `${(100 * row.prediction.troughOutputLoss).toFixed(1)}%`,
    `${row.prediction.peakInputPriceMultiple.toFixed(1)}x`,
  ].join('\t'));
}

const overlay = buildEmpiricalMaterialOverlay();
const empiricalRisks = overlay.overlays.map((row) => {
  const base = simulateEmpiricalNMinusOne(row.material, {
    accessibleInventoryFraction: eventV3.parameters.accessibleInventoryFraction,
  });
  const stock = simulateEmpiricalNMinusOne(row.material, {
    accessibleInventoryFraction: eventV3.parameters.accessibleInventoryFraction,
    inventoryScale: 3,
  });
  const diverse = simulateEmpiricalNMinusOne(row.material, {
    accessibleInventoryFraction: eventV3.parameters.accessibleInventoryFraction,
    additionalCoverage: 0.2,
  });
  return {
    ...row,
    inventoryBasis: base.inventoryBasis,
    loss: base.result.cumulativeWeightedOutputLoss,
    stockAvoided: base.result.cumulativeWeightedOutputLoss - stock.result.cumulativeWeightedOutputLoss,
    diversityAvoided: base.result.cumulativeWeightedOutputLoss - diverse.result.cumulativeWeightedOutputLoss,
  };
}).sort((a, b) => b.loss - a.loss);

console.log('\nEMPIRICALLY ANCHORED 2025 N-1 STRESS');
console.log('USGS producer shares/stocks drive the stress; IEA EV kg are an audited absolute-demand overlay.');
console.log('Material\tdominant share\tN-1 coverage\tstocks months\tEV kg\toutput-months lost\t3x buffers avoids\t+20pp diversity avoids');
for (const row of empiricalRisks) {
  console.log([
    row.material,
    `${(100 * row.dominantProducerShare).toFixed(1)}%`,
    `${(100 * row.nMinusOneCoverage).toFixed(1)}%`,
    row.observedInventoryMonths === null
      ? 'assumed'
      : row.observedInventoryMonths.toFixed(2),
    row.kilogramsPerNmc622Ev === null ? 'n/a' : row.kilogramsPerNmc622Ev.toFixed(1),
    row.loss.toFixed(2),
    row.stockAvoided.toFixed(2),
    row.diversityAvoided.toFixed(2),
  ].join('\t'));
}

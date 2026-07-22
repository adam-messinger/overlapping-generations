import {
  calibratedCisplatinBackcast,
  drugPriceReliefSensitivity,
} from '../src/simulations/drug-supply/calibration.js';
import {
  drugSupplyEvidence,
  genericDrugEconomicsScenarios,
} from '../src/simulations/drug-supply/data.js';
import {
  simulateCisplatinBackcast,
  simulateGenericDrugEconomics,
} from '../src/simulations/drug-supply/model.js';
import { runModel } from 'tsimulation';
import { genericDrugModel } from '../src/simulations/registry.js';

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;

console.log('=== Essential generic-drug supply network ===\n');
console.log('2023 U.S. cisplatin backcast: aggregate product releases are separated from hospital access.');
const backcast = simulateCisplatinBackcast(calibratedCisplatinBackcast.params);
console.table([0, 3, 6, 9, 12].map((month) => {
  const row = backcast.months[month];
  return {
    month,
    'primary supply': row.primarySupply.toFixed(2),
    'other incumbents': row.otherIncumbentSupply.toFixed(2),
    'emergency import': row.emergencyImportSupply.toFixed(2),
    'national volume': row.nationalVolumeIndex.toFixed(2),
    'centers reporting shortage': pct(row.centersReportingShortage),
    'dose service': pct(row.estimatedDoseServiceLevel),
  };
}));
console.log(`Held-out check: modeled June utilization decline ${pct(calibratedCisplatinBackcast.predictedJuneUtilizationDecline)} vs ${pct(calibratedCisplatinBackcast.observedUtilizationDecline)} observed.`);

console.log('\n2026 India platinum-drug price-cap scenarios');
const economics = Object.values(genericDrugEconomicsScenarios)
  .map((scenario) => runModel(genericDrugModel, scenario).output);
console.table(economics.map((result) => ({
  policy: result.scenario.id,
  'first shortage month': result.firstShortageMonth ?? 'none',
  'months <98%': result.monthsBelow98Pct,
  'minimum service': pct(result.minimumServiceLevel),
  'dose-months lost': result.cumulativeDoseShortfall.toFixed(2),
  'ending inventory': result.endingInventoryMonths.toFixed(2),
  'average price': result.averagePaidPriceMultiplier.toFixed(2),
  'average margin': pct(result.averageOperatingMargin),
})));

console.log('\nEnacted price change');
console.table([
  {
    drug: 'cisplatin',
    old: drugSupplyEvidence.india2026.cisplatinOldPriceRupeesPerMl,
    new: drugSupplyEvidence.india2026.cisplatinNewPriceRupeesPerMl,
  },
  {
    drug: 'carboplatin',
    old: drugSupplyEvidence.india2026.carboplatinOldPriceRupeesPerMl,
    new: drugSupplyEvidence.india2026.carboplatinNewPriceRupeesPerMl,
  },
].map((row) => ({ ...row, increase: pct(row.new / row.old - 1) })));

console.log('\nMinimum dose service across raw-material-cost and price-relief assumptions');
console.table(drugPriceReliefSensitivity().map((row) => ({
  'raw cost index': row.rawMaterialCostMultiplier.toFixed(1),
  'price relief': pct(row.priceRelief),
  'minimum service': pct(row.minimumServiceLevel),
  'dose-months lost': row.cumulativeDoseShortfall.toFixed(2),
})));

console.log('\nInterpretation guardrails');
console.log('- The 2023 national-volume and cancer-center survey points are fitted; the dose-utilization comparison is held out.');
console.log('- Center shortage incidence is not the same as the fraction of doses missing: allocation can remain chaotic after national volume recovers.');
console.log('- The India exercise is a normalized unit-economics scenario, not manufacturer-level cost data or a forecast of a named company.');
console.log('- Price relief can restart batches; it does not by itself create a second qualified plant or reward quality redundancy.');

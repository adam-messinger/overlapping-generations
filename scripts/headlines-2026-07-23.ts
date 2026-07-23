import { runModel } from 'tsimulation';

import { calibrateHormuzModel } from '../src/simulations/critical-materials/hormuz-calibration.js';
import { hormuzScenarios } from '../src/simulations/critical-materials/hormuz-data.js';
import { calibrateMaritimeNetwork } from '../src/simulations/critical-materials/shipping-calibration.js';
import { maritimeScenarios } from '../src/simulations/critical-materials/shipping-data.js';
import {
  dataCenterGridScenarios,
} from '../src/simulations/news/data-center-grid.js';
import {
  genericTariffScenarios,
} from '../src/simulations/drug-supply/generic-tariff.js';
import {
  dataCenterGridModel,
  genericDrugTariffModel,
  hormuzDisruptionModel,
  maritimeNetworkModel,
} from '../src/simulations/registry.js';

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;

console.log('=== Headlines experiments: 2026-07-23 ===\n');

const hormuzCalibration = calibrateHormuzModel();
const hormuz = runModel(hormuzDisruptionModel, {
  scenario: hormuzScenarios['observed-2026-to-date'],
  params: hormuzCalibration.params,
}).output;
const julyHormuz = hormuz.months[hormuz.months.length - 1];

const maritimeCalibration = calibrateMaritimeNetwork();
const redSeaCases = [
  'july-23-tanker-attacks',
  'july-2026-escalation',
] as const;
const redSea = redSeaCases.map((id) => {
  const result = runModel(maritimeNetworkModel, {
    scenario: maritimeScenarios[id],
    params: maritimeCalibration.params,
  }).output;
  const minimumOilAvailability = Math.min(
    ...result.monthly.map((row) => row.intendedMarketOilAvailability),
  );
  const peakCapacityLoss = Math.max(
    ...result.monthly.map((row) => row.containerEffectiveCapacityLoss),
  );
  const peakDelayHours = Math.max(
    ...result.monthly.map((row) => row.affectedLaneDelayHours),
  );
  const peakInflation = Math.max(
    ...result.monthly.map((row) => row.importInflationImpulsePctPoints),
  );
  return {
    scenario: id,
    minimumOilAvailability,
    peakCapacityLoss,
    peakDelayHours,
    peakInflation,
  };
});

console.log('Hormuz plus incremental Red Sea stress');
console.table([{
  'July oil price': `${julyHormuz.oil.priceMultiple.toFixed(2)}×`,
  'July oil supply': pct(julyHormuz.oil.physicalSupplyRatio),
  'July LNG price': `${julyHormuz.lng.priceMultiple.toFixed(2)}×`,
  'July fertilizer price': `${julyHormuz.fertilizer.priceMultiple.toFixed(2)}×`,
}]);
console.table(redSea.map((row) => ({
  scenario: row.scenario,
  'minimum intended oil': pct(row.minimumOilAvailability),
  'peak container capacity loss': pct(row.peakCapacityLoss),
  'affected-lane delay': `${(row.peakDelayHours / 24).toFixed(1)} days`,
  'peak import inflation': `${row.peakInflation.toFixed(2)} pp`,
})));

console.log('\nData-center ratepayer pledge');
const dataCenters = Object.values(dataCenterGridScenarios).map((scenario) =>
  runModel(dataCenterGridModel, scenario).output
);
console.table(dataCenters.map((result) => ({
  scenario: result.scenario.id,
  'electricity TWh/yr': result.annualElectricityTwh.toFixed(0),
  'shared firm need GW': result.sharedFirmCapacityRequiredGw.toFixed(1),
  'reliability gap GW': result.reliabilityGapGw.toFixed(1),
  'developer capex $B': result.developerAssignedCapexBillion.toFixed(0),
  'ratepayer capex $B': result.ratepayerAssignedCapexBillion.toFixed(0),
  'non-DC bill impact': pct(result.nonDataCenterBillImpact),
  'operational GtCO2/yr': result.operationalEmissionsGtCo2.toFixed(2),
})));

console.log('\nGeneric-drug tariff transition');
const genericTariffs = Object.values(genericTariffScenarios).map((scenario) =>
  runModel(genericDrugTariffModel, scenario).output
);
console.table(genericTariffs.map((result) => ({
  scenario: result.scenario.id,
  'first shortage month': result.firstShortageMonth ?? 'none',
  'months <98% service': result.monthsBelow98Pct,
  'minimum service': pct(result.minimumServiceLevel),
  'dose-months lost': result.cumulativeDoseShortfallMonths.toFixed(2),
  'peak paid price': `${result.peakPaidPriceMultiplier.toFixed(2)}×`,
  'ending domestic capacity': pct(result.endingDomesticCapacityShare),
})));

console.log('\nRobustness: Red Sea commercial-avoidance depth');
const redSeaBase = maritimeScenarios['july-23-tanker-attacks'];
console.table([0.80, 0.65, 0.40, 0.10].map((trough) => {
  const result = runModel(maritimeNetworkModel, {
    scenario: {
      ...redSeaBase,
      babThroughputPath: [
        6.1 / 7.4,
        trough,
        trough,
        0.75,
        0.85,
        0.95,
        1,
        1,
      ],
    },
    params: maritimeCalibration.params,
  }).output;
  return {
    'Bab trough': pct(trough),
    'minimum intended oil': pct(Math.min(
      ...result.monthly.map((row) => row.intendedMarketOilAvailability),
    )),
    'peak capacity loss': pct(Math.max(
      ...result.monthly.map((row) => row.containerEffectiveCapacityLoss),
    )),
    'affected-lane delay': `${
      (
        Math.max(...result.monthly.map((row) => row.affectedLaneDelayHours)) /
        24
      ).toFixed(1)
    } days`,
    'import inflation': `${
      Math.max(
        ...result.monthly.map((row) => row.importInflationImpulsePctPoints),
      ).toFixed(2)
    } pp`,
  };
}));

console.log('\nRobustness: socialized data-center capital cost');
const socialized = dataCenterGridScenarios.socialized;
console.table([
  { label: 'lower capex', generation: 1_200, network: 300 },
  { label: 'central', generation: 1_800, network: 600 },
  { label: 'higher capex', generation: 2_500, network: 1_000 },
].map(({ label, generation, network }) => {
  const result = runModel(dataCenterGridModel, {
    ...socialized,
    id: `${socialized.id}-${label}`,
    generationCapexPerKw: generation,
    networkCapexPerKw: network,
  }).output;
  return {
    case: label,
    'ratepayer capex $B': result.ratepayerAssignedCapexBillion.toFixed(0),
    'non-DC bill impact': pct(result.nonDataCenterBillImpact),
    'reliability gap GW': result.reliabilityGapGw.toFixed(1),
  };
}));

console.log('\nRobustness: half the contracted data-center load materializes');
const fullPledge = dataCenterGridScenarios['full-pledge-clean-flex'];
console.table([0, 0.50, 1].map((takeOrPayCoverage) => {
  const result = runModel(dataCenterGridModel, {
    ...fullPledge,
    id: `${fullPledge.id}-take-or-pay-${takeOrPayCoverage}`,
    expectedLoadRealization: 0.50,
    takeOrPayCoverage,
  }).output;
  return {
    'take-or-pay coverage': pct(takeOrPayCoverage),
    'stranded shift $B': result.strandedRiskShiftBillion.toFixed(1),
    'non-DC bill impact': pct(result.nonDataCenterBillImpact),
  };
}));

console.log('\nRobustness: generic-drug qualification timing');
const announcedTariff = genericTariffScenarios.announced;
console.table([18, 24, 30, 36, 42].map((constructionLeadMonths) => {
  const result = runModel(genericDrugTariffModel, {
    ...announcedTariff,
    id: `${announcedTariff.id}-lead-${constructionLeadMonths}`,
    constructionLeadMonths,
  }).output;
  return {
    'construction lead': `${constructionLeadMonths} months`,
    'first shortage month': result.firstShortageMonth ?? 'none',
    'minimum service': pct(result.minimumServiceLevel),
    'dose-months lost': result.cumulativeDoseShortfallMonths.toFixed(2),
    'peak paid price': `${result.peakPaidPriceMultiplier.toFixed(2)}×`,
  };
}));

console.log('\nGuardrails');
console.log('- The July 23 Red Sea case is incremental to the existing Hormuz closure; it does not subtract the same oil twice.');
console.log('- The data-center result is capex/resource-adequacy accounting, not a utility-specific rate case.');
console.log('- The drug-tariff result is a normalized supply scenario. Plant timing, pass-through, and supplier exit remain sensitivities.');

import { calibrateMaritimeNetwork } from '../src/simulations/critical-materials/shipping-calibration.js';
import {
  maritimeObserved,
  maritimeScenarios,
  type MaritimeScenarioId,
} from '../src/simulations/critical-materials/shipping-data.js';
import { runModel } from 'tsimulation';
import { maritimeNetworkModel } from '../src/simulations/registry.js';

function scenarioArg(): MaritimeScenarioId {
  const value = process.argv.find((arg) => arg.startsWith('--scenario='))
    ?.slice('--scenario='.length) as MaritimeScenarioId | undefined;
  if (!value) return 'july-2026-escalation';
  if (!(value in maritimeScenarios)) throw new Error(`Unknown maritime scenario: ${value}`);
  return value;
}

const calibration = calibrateMaritimeNetwork();
const scenario = maritimeScenarios[scenarioArg()];
const result = runModel(maritimeNetworkModel, { scenario, params: calibration.params }).output;
const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;

console.log('=== Multi-chokepoint maritime network ===\n');
console.log('2024 fits only the share of blocked Bab oil rerouted around the Cape.');
console.table([{
  'fitted reroute share': pct(calibration.params.oilCapeRerouteShare),
  '2024 Cape modeled mb/d': calibration.developmentCapeOilMbd.toFixed(2),
  '2024 Cape observed mb/d': maritimeObserved.capeOil2024Mbd.toFixed(2),
  '1H25 Cape modeled mb/d': calibration.holdoutCapeOilMbd.toFixed(2),
  '1H25 Cape observed mb/d': maritimeObserved.capeOil1h25Mbd.toFixed(2),
  'holdout abs. error mb/d': calibration.holdoutAbsoluteErrorMbd.toFixed(2),
}]);

console.log(`\n=== ${scenario.label} ===\n${scenario.description}\n`);
console.table(result.annual.map((row) => ({
  year: row.year,
  'avg intended oil': pct(row.averageIntendedMarketOilAvailability),
  'minimum intended oil': pct(row.minimumIntendedMarketOilAvailability),
  'Cape oil mb/d': row.averageCapeOilFlowMbd.toFixed(1),
  'container capacity loss': pct(row.peakContainerCapacityLoss),
  'affected-lane delay days': (row.peakAffectedLaneDelayHours / 24).toFixed(1),
  'peak import inflation pp': row.peakImportInflationImpulsePctPoints.toFixed(2),
})));

const stressed = result.monthly.filter((row) => row.babThroughput < 0.5);
if (stressed.length > 0) {
  console.log('\nMonthly onset and queue dynamics');
  console.table(stressed.slice(0, 8).map((row) => ({
    month: `${row.year}-${String(row.month).padStart(2, '0')}`,
    Hormuz: pct(row.hormuzThroughput),
    Bab: pct(row.babThroughput),
    'direct oil mb/d': row.directOilMbd.toFixed(2),
    'Cape depart mb/d': row.capeOilDeparturesMbd.toFixed(2),
    'Cape arrive mb/d': row.capeOilArrivalsMbd.toFixed(2),
    'intended availability': pct(row.intendedMarketOilAvailability),
    'capacity loss': pct(row.containerEffectiveCapacityLoss),
    'inflation pp': row.importInflationImpulsePctPoints.toFixed(2),
  })));
}

console.log('\nInterpretation guardrails');
console.log('- Bab/Suez disruption mostly delays and reroutes oil; it does not destroy barrels.');
console.log('- LNG through Bab was already near zero in 1H25, so no incremental LNG loss is assigned.');
console.log('- The inflation translation is the IMF empirical delay coefficient, not a full CPI model.');
console.log('- The 35% Hormuz/Bab overlap is a transparent judgment pending bilateral voyage data.');

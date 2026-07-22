import {
  auditFrance2026Backcast,
  calibratedHeatMortalityScale,
  heatTemperatureSensitivity,
} from '../src/simulations/heat/calibration.js';
import {
  france2026HeatEvent,
  france2035HotterEvent,
  heatAdaptationPackages,
} from '../src/simulations/heat/data.js';
import { simulateHeatEvent } from '../src/simulations/heat/model.js';

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;
const packages = ['none', 'current', 'outreach', 'targeted-cooling', 'passive-food', 'combined'];
const results = packages.map((id) => simulateHeatEvent(
  france2026HeatEvent,
  heatAdaptationPackages[id],
  calibratedHeatMortalityScale,
));
const baseline = results.find((row) => row.adaptation.id === 'current')!;

console.log('=== Acute heat: mortality × food × electricity ===\n');
console.log('France, 17 June–2 July 2026. Mortality scale is fitted to the preliminary 5,764 excess-death estimate.');
console.table(results.map((result) => ({
  package: result.adaptation.id,
  deaths: result.mortality.totalDeaths.toFixed(0),
  'deaths vs current': `${result.mortality.totalDeaths >= baseline.mortality.totalDeaths ? '+' : ''}${pct(result.mortality.totalDeaths / baseline.mortality.totalDeaths - 1)}`,
  'age 65+ share': pct(result.mortality.shareAge65Plus),
  'crop yield loss': pct(result.food.aggregateSeasonalYieldLoss),
  'cooling TWh': result.power.coolingElectricityTwh.toFixed(2),
  'cooling peak GW': result.power.managedCoolingPeakGw.toFixed(1),
  'reserve GW': result.power.reserveMarginGw.toFixed(1),
  'outage loss': pct(result.power.overloadOutageFraction),
})));

const audit = auditFrance2026Backcast();
console.log('\nBackcast and external checks');
console.table([{
  'fit target': audit.observedDeaths,
  fitted: audit.fittedDeaths.toFixed(0),
  'modeled age 65+': pct(audit.shareAge65Plus),
  'no-adaptation increase': pct(audit.noAdaptationIncrease),
  'Europe-2023 study': pct(audit.literatureNoAdaptationIncrease),
}]);

console.log('\nTemperature sensitivity under current adaptation');
console.table(heatTemperatureSensitivity(france2026HeatEvent, heatAdaptationPackages.current).map((row) => ({
  'day delta C': row.dayTemperatureDeltaC,
  'night delta C': row.nightTemperatureDeltaC.toFixed(2),
  deaths: row.deaths.toFixed(0),
  'crop loss': pct(row.yieldLoss),
  'reserve GW': row.reserveMarginGw.toFixed(1),
})));

const futureCurrent = simulateHeatEvent(
  france2035HotterEvent,
  heatAdaptationPackages.current,
  calibratedHeatMortalityScale,
);
const futureCombined = simulateHeatEvent(
  france2035HotterEvent,
  heatAdaptationPackages.combined,
  calibratedHeatMortalityScale,
);
console.log('\nIllustrative 2035 repeat: older population, +1.3 C days / +1.5 C nights');
console.table([futureCurrent, futureCombined].map((result) => ({
  package: result.adaptation.id,
  deaths: result.mortality.totalDeaths.toFixed(0),
  'vs 2026 current': pct(result.mortality.totalDeaths / baseline.mortality.totalDeaths - 1),
  'crop loss': pct(result.food.aggregateSeasonalYieldLoss),
  'cooling peak GW': result.power.managedCoolingPeakGw.toFixed(1),
  'reserve GW': result.power.reserveMarginGw.toFixed(1),
})));

console.log('\nInterpretation guardrails');
console.log('- The death count is an in-sample calibration to preliminary excess mortality, not an independent causal attribution.');
console.log('- Age gradients and the no-adaptation comparison are external consistency checks, not additional fitted observations.');
console.log('- Crop loss applies only to the explicitly exposed, phenologically sensitive share; it is not total French food supply.');
console.log('- Grid results are engineering stress tests. They expose the cooling/load tradeoff but do not model unit-level dispatch.');

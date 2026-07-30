import {
  OBSERVED_MONTHS,
  SETTLEMENT_CHANNELS,
  warSettlementScenarios,
  type WarSettlementScenarioId,
} from '../src/simulations/war-settlement/data.js';
import {
  buildSettlementEnsemble,
  ensembleAxes,
  simulateWarSettlement,
} from '../src/simulations/war-settlement/model.js';
import {
  backcastValues,
  calibrateWarSettlement,
  marchLossAfterRerouting,
  warSettlementTargets,
} from '../src/simulations/war-settlement/calibration.js';
import { runModel } from 'tsimulation';
import { warSettlementModel } from '../src/simulations/registry.js';

function scenarioArg(): WarSettlementScenarioId {
  const raw = process.argv
    .find((arg) => arg.startsWith('--scenario='))
    ?.slice('--scenario='.length) as WarSettlementScenarioId | undefined;
  if (!raw) return 'attrition-continues';
  if (!(raw in warSettlementScenarios)) {
    throw new Error(
      `Unknown scenario '${raw}'. Choose: ${Object.keys(warSettlementScenarios).join(', ')}`,
    );
  }
  return raw;
}

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;
const money = (value: number): string => `$${value.toFixed(0)}`;
const label = (value: string | null): string => value ?? 'beyond horizon';

const scenarioId = scenarioArg();
const scenario = warSettlementScenarios[scenarioId];
const calibrated = calibrateWarSettlement();
const result = runModel(warSettlementModel, { scenario }).output;
const ensemble = buildSettlementEnsemble(scenario);

console.log('=== 2026 US-Iran war: reserve and magazine settlement model ===\n');
console.log('Read at 30 July 2026. March-July is the observed window; everything after');
console.log('is the scenario\'s assumption about tempo and Hormuz throughput.\n');

// --- Backcast ---------------------------------------------------------------

console.log('Backcast against the observed record');
console.log('(development targets set the defaults; holdouts were never targeted)\n');
const values = backcastValues(result);
console.table(
  Object.entries(warSettlementTargets.development).map(([name, target]) => ({
    target: name,
    modeled: values[name].toFixed(2),
    reported: `${target.min}-${target.max}`,
    hit: values[name] >= target.min && values[name] <= target.max ? 'yes' : 'NO',
  })),
);
console.table(
  Object.entries(warSettlementTargets.holdout).map(([name, target]) => ({
    holdout: name,
    modeled: values[name].toFixed(2),
    reported: `${target.min}-${target.max}`,
    hit: values[name] >= target.min && values[name] <= target.max ? 'yes' : 'NO',
  })),
);
console.log(
  `The World Bank's 10 mb/d March figure sits between the model's loss after rerouting ` +
  `(${marchLossAfterRerouting(result).toFixed(1)} mb/d) and after inventory draws ` +
  `(${values.marchNetSupplyLossMbd.toFixed(1)} mb/d); their definition does not say which.\n`,
);
console.log(
  `Coordinate search moved ${calibrated.iterations} candidate parameter values and ` +
  `finished at a development loss of ${calibrated.development.meanLoss.toFixed(3)}.\n`,
);

// --- Reserve and magazine paths ---------------------------------------------

console.log(`=== ${scenario.label} ===\n`);
console.log(scenario.description);
console.log();

const quarterly = result.months.filter((m) => (m.monthIndex - (OBSERVED_MONTHS - 1)) % 3 === 0);
console.log('Reserves and prices');
console.table(
  quarterly.map((m) => ({
    month: `${m.year}-${String(m.month).padStart(2, '0')}`,
    observed: m.monthIndex < OBSERVED_MONTHS ? 'yes' : '',
    'Hormuz': pct(m.hormuzThroughput),
    'US SPR mb': m.usSprMb.toFixed(0),
    'China mb': m.chinaReserveMb.toFixed(0),
    'RoW mb': m.rowReserveMb.toFixed(0),
    Brent: money(m.brentUsdPerBarrel),
    'pump $/gal': m.retailGasolineUsdPerGal.toFixed(2),
    'US CPI': pct(m.headlineCpiYoy),
  })),
);

console.log('\nMagazines and the Iranian economy');
console.table(
  quarterly.map((m) => ({
    month: `${m.year}-${String(m.month).padStart(2, '0')}`,
    'IR missiles': m.iranMissileInventory.toFixed(0),
    'IR launchers': m.iranLaunchers.toFixed(0),
    'IR salvo/mo': m.iranSustainableSalvo.toFixed(0),
    'US THAAD+SM3': m.usHighEndInterceptors.toFixed(0),
    'US Patriot': m.usAreaInterceptors.toFixed(0),
    'US standoff': m.usStandoffWeapons.toFixed(0),
    'IR poverty': pct(m.iranPovertyHeadcount),
    'IR rial': pct(m.iranRialDepreciation),
  })),
);

// --- What binds, and when ---------------------------------------------------

const monthName = (index: number | null): string => {
  if (index === null) return 'never in horizon';
  const m = result.months[index];
  return `${m.year}-${String(m.month).padStart(2, '0')}`;
};

console.log('\nWhen each stock first hits its operational floor');
console.table([
  { stock: 'US SPR (172 mb authorization spent)', binds: monthName(result.bindingMonths.usSpr) },
  { stock: 'China reserve floor', binds: monthName(result.bindingMonths.chinaReserve) },
  {
    stock: 'US THAAD/SM-3 below reserve requirement',
    binds: monthName(result.bindingMonths.usHighEndInterceptors),
  },
  {
    stock: 'US Patriot below reserve requirement',
    binds: monthName(result.bindingMonths.usAreaInterceptors),
  },
  {
    stock: 'Iranian salvo below credibility floor',
    binds: monthName(result.bindingMonths.iranMissiles),
  },
]);

// --- Settlement -------------------------------------------------------------

console.log('\nWhen the war settles, conditional on it still running at end-July 2026');
console.table([{
  'P10 (earliest quartile)': label(ensemble.conditionalQuantileLabels.p10),
  'P50 (median)': label(ensemble.conditionalQuantileLabels.p50),
  'P90': label(ensemble.conditionalQuantileLabels.p90),
}]);
console.table(
  Object.entries(ensemble.conditionalByEndOf).map(([year, probability]) => ({
    'settled by end of': year,
    probability: pct(probability),
  })),
);

console.log('\nWhich mechanism ends it');
console.table(
  SETTLEMENT_CHANNELS.map((channel) => ({
    channel,
    share: pct(ensemble.channelAttribution[channel]),
  })),
);

// --- Scenario and parameter sensitivity -------------------------------------

console.log('\nAcross scenarios (conditional median, and probability by end-2027)');
console.table(
  Object.values(warSettlementScenarios).map((candidate) => {
    const e = buildSettlementEnsemble(candidate);
    return {
      scenario: candidate.id,
      median: label(e.conditionalQuantileLabels.p50),
      'by end-2026': pct(e.conditionalByEndOf['2026'] ?? 0),
      'by end-2027': pct(e.conditionalByEndOf['2027'] ?? 0),
      'inflation share': pct(e.channelAttribution.usInflation),
      'poverty share': pct(e.channelAttribution.iranPoverty),
    };
  }),
);

console.log('\nHow much of the answer is judgment: one axis moved at a time');
console.table(
  ensembleAxes.map((axis) => {
    const low = simulateWarSettlement(scenario, { [axis.key]: axis.low });
    const high = simulateWarSettlement(scenario, { [axis.key]: axis.high });
    return {
      axis: axis.label,
      basis: axis.basis,
      'range': `${axis.low} to ${axis.high}`,
      'median at low': label(low.quantileLabels.p50),
      'median at high': label(high.quantileLabels.p50),
    };
  }),
);
console.log(
  `\nEnsemble: ${ensemble.memberCount} members, a full three-level factorial over the axes above.`,
);

console.log('\nInterpretation guardrails');
console.log('- The depletion arithmetic is calibrated. The map from depletion to a settlement');
console.log('  hazard is not, and cannot be: there is one observed settlement attempt in this');
console.log('  war and it failed. Read the ordering of the channels, not the dates.');
console.log('- "Settlement" means a durable one. The June ceasefire is treated as an attempt');
console.log('  that did not hold, which is what sets the attempt-to-settlement conversion.');
console.log('- Leakage is not modeled: a thinner interceptor magazine degrades coverage in the');
console.log('  model without inflicting the damage that would actually follow.');
console.log('- Nuclear escalation, regime change, and third-party entry are out of scope. Each');
console.log('  would dominate everything above if it happened.');

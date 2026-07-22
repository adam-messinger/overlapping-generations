import { REGIONS } from '../src/domain-types.js';
import { calibrateHormuzModel } from '../src/simulations/critical-materials/hormuz-calibration.js';
import { compareHormuzGlobalImpact } from '../src/simulations/critical-materials/hormuz-bridge.js';
import {
  hormuzScenarios,
  type HormuzScenarioId,
} from '../src/simulations/critical-materials/hormuz-data.js';
import { simulateHormuzDisruption } from '../src/simulations/critical-materials/hormuz-model.js';

function scenarioArg(): HormuzScenarioId {
  const raw = process.argv.find((arg) => arg.startsWith('--scenario='))
    ?.slice('--scenario='.length) as HormuzScenarioId | undefined;
  if (!raw) return 'partial-reopening';
  if (!(raw in hormuzScenarios)) {
    throw new Error(
      `Unknown scenario '${raw}'. Choose: ${Object.keys(hormuzScenarios).join(', ')}`,
    );
  }
  return raw;
}

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;
const signed = (value: number, digits = 2): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;

const calibrated = calibrateHormuzModel();
const scenario = hormuzScenarios[scenarioArg()];
const physical = simulateHormuzDisruption(scenario, calibrated.params);
const macro = compareHormuzGlobalImpact(physical);

console.log('=== Hormuz 2026 stock-flow backcast ===\n');
console.log('Calibration sees Q1 traffic, March net loss/price, and March Gulf shut-ins.');
console.log('Q2/July oil and fertilizer are untouched holdouts.\n');
console.table(
  [...calibrated.development.components, ...calibrated.holdout.components].map(
    (row) => ({
      target: row.name,
      modeled: row.value.toFixed(2),
      range: `${row.target.min.toFixed(2)}–${row.target.max.toFixed(2)}`,
      loss: row.loss.toFixed(2),
    }),
  ),
);

console.log('\nSelected oil parameters');
console.table([{
  'short elasticity': calibrated.params.oil.demandElasticity,
  'medium elasticity': calibrated.params.oil.mediumRunDemandElasticity,
  'stock draw mb/d': calibrated.params.oil.maxInventoryDrawPerDay,
  'alternative mb/d': calibrated.params.oil.alternativeSupplyMaxPerDay,
  'Gulf spare tanks mb': calibrated.params.oil.exporterSpareStorageMillionBarrels,
}]);

console.log(`\n=== ${scenario.label} ===\n`);
console.log(scenario.description);
console.table(
  physical.annual.map((row) => ({
    year: row.year,
    'oil price': `${row.oilPriceMultiple.toFixed(2)}×`,
    'broad gas price': `${row.gasPriceMultiple.toFixed(2)}×`,
    'fertilizer price': `${row.fertilizerPriceMultiple.toFixed(2)}×`,
    'oil supplied': pct(row.oilAvailability),
    'crop yield': pct(row.cropYieldMultiplier),
    'peak shut-in': `${row.peakGulfCrudeShutInPerDay.toFixed(1)} mb/d`,
  })),
);

console.log('\nGlobal-model delta from matched no-closure path');
console.table(
  macro.impacts.map((row) => ({
    year: row.year,
    'GDP %': signed(row.gdpChangePct),
    'energy burden pp': signed(row.energyBurdenChangePctPoints),
    'food stress pp': signed(row.foodStressChangePctPoints),
    'oil use %': signed(row.oilConsumptionChangePct),
    'gas use %': signed(row.gasConsumptionChangePct),
  })),
);

console.log('\nGDP sensitivity to the global model\'s useful-energy elasticity (γ)');
console.table(
  [0.08, 0.30, 0.55].map((gamma) => {
    const sensitivity = compareHormuzGlobalImpact(physical, {
      production: { gamma },
    });
    const trough = sensitivity.impacts.reduce(
      (worst, row) => row.gdpChangePct < worst.gdpChangePct ? row : worst,
      sensitivity.impacts[0],
    );
    const first = sensitivity.impacts[0];
    return {
      gamma,
      '2026 GDP %': signed(first.gdpChangePct),
      'trough GDP %': signed(trough.gdpChangePct),
      'trough year': trough.year,
    };
  }),
);

const worstRegional = Object.fromEntries(
  REGIONS.map((region) => {
    const worst = macro.impacts.reduce(
      (selected, row) =>
        row.regionalGdpChangePct[region] < selected.regionalGdpChangePct[region]
          ? row
          : selected,
      macro.impacts[0],
    );
    return [region, `${signed(worst.regionalGdpChangePct[region])}% (${worst.year})`];
  }),
);
console.log('\nWorst regional GDP delta over the reported window');
console.table([worstRegional]);

console.log('\nInterpretation guardrails');
console.log('- Prices are market-clearing stress paths, not forecasts of a quoted contract.');
console.log('- MENA combines energy-abundant consumers with export-dependent Gulf producers.');
console.log('- The broad fertilizer holdout is overpredicted; product-level trade is the next revision.');
console.log('- Annual macro results retain the global model\'s one-year burden/food feedback lags.');

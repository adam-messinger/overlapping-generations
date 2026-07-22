import { auditTariffCalibration } from '../src/simulations/trade/calibration.js';
import {
  brazilJuly2026Tariff,
  canadaJuly2026Tariff,
} from '../src/simulations/trade/data.js';
import { runModel } from 'tsimulation';
import { bilateralTariffModel } from '../src/simulations/registry.js';

const pct = (value: number): string => `${(100 * value).toFixed(2)}%`;
const pp = (value: number): string => `${(100 * value).toFixed(3)} pp`;
const actions = [canadaJuly2026Tariff, brazilJuly2026Tariff];
const runTariff = (action: typeof canadaJuly2026Tariff, options: { scope?: 'actual' | 'naive-headline'; retaliation?: boolean } = {}) =>
  runModel(bilateralTariffModel, { action, ...options }).output;
const results = actions.flatMap((action) => [
  runTariff(action),
  runTariff(action, { retaliation: true }),
]);

console.log('=== Bilateral tariff input-output model ===\n');
console.table(results.map((result) => ({
  partner: result.action.partner,
  retaliation: result.retaliation ? 'yes' : 'no',
  'headline rate': pct(result.action.nominalTariff),
  'trade covered': pct(result.coveredShareOfPartnerImports),
  'effective avg increase': pp(result.effectiveAverageTariffIncrease),
  'affected qty decline': pct(result.weightedAffectedImportQuantityDecline),
  'U.S. CPI': pp(result.usConsumerPriceChange),
  'IO amplification': `${result.ioPriceAmplification.toFixed(2)}x`,
  'U.S. real GDP': pct(result.usRealGdpChange),
  'partner real GDP': pct(result.partnerRealGdpChange),
  'partner revenue loss $bn': result.partnerExportRevenueLossBillion.toFixed(1),
})));

console.log('\nCanada: why product scope dominates the headline');
const scoped = runTariff(canadaJuly2026Tariff);
const naive = runTariff(canadaJuly2026Tariff, { scope: 'naive-headline' });
console.table([scoped, naive].map((result) => ({
  scope: result.scope,
  'imports covered $bn': (result.action.totalImportsBillion * result.coveredShareOfPartnerImports).toFixed(0),
  'effective avg tariff': pp(result.effectiveAverageTariffIncrease),
  'U.S. CPI': pp(result.usConsumerPriceChange),
  'Canada GDP': pct(result.partnerRealGdpChange),
})));

console.log('\nLargest U.S. sector price effects');
for (const result of results.filter((row) => !row.retaliation)) {
  console.log(result.action.partner);
  console.table([...result.sectors]
    .sort((a, b) => b.totalSectorPriceChange - a.totalSectorPriceChange)
    .slice(0, 5)
    .map((row) => ({
      sector: row.sector,
      'affected imports $bn': row.affectedImportsBillion.toFixed(1),
      'import qty decline': pct(row.affectedImportQuantityDecline),
      'sector price': pp(row.totalSectorPriceChange),
    })));
}

const audit = auditTariffCalibration();
console.log('\n2018 calibration and retro');
console.table([{
  'aluminum pass-through': pct(audit.aluminumPassThrough),
  'aluminum elasticity': audit.aluminumTradeElasticity.toFixed(2),
  'steel elasticity': audit.steelTradeElasticity.toFixed(2),
  'V1 steel decline': pct(audit.v1SteelQuantityDecline),
  'observed steel decline': pct(audit.observedSteelQuantityDecline),
}]);

console.log('\nInterpretation guardrails');
console.log('- These are full-year effects conditional on implementation, not probability-weighted forecasts; Canada\'s new authority is legally untested.');
console.log('- The new Canada action covers about $20bn of $389bn in imports. Applying 50% to every Canadian good is the rejected V1.');
console.log('- Sector-specific substitution matters: a single elasticity fitted to aluminum badly overpredicts the 2018 steel quantity response.');
console.log('- GDP estimates omit monetary/fiscal reactions and policy uncertainty, and should be read as first-order ranges around zero for the U.S.');

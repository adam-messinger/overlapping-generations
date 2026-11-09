/**
 * Real-option investment prototype: what changes when general investment
 * responds to a Dixit-Pindyck hurdle (discount rate AND anticipated
 * volatility) instead of the after-interest profit rate.
 *
 * capital.realOptionHurdleWeight = 1 switches the rule (see realOptionHurdle
 * in src/modules/capital.ts). The signal is anchored at 2025, so 2025 is
 * unchanged and everything after it moves with the hurdle's change:
 *   - the safe rate (rate channel; legacy reads only the interest bill)
 *   - climate damages, through anticipated volatility (climateVolatilitySensitivity)
 *
 * Usage: npx tsx scripts/real-option-investment.ts [--output=path.md]
 */

import { writeFileSync } from 'node:fs';
import { runSimulation } from '../src/index.js';
import { listScenariosSync, loadScenarioParamsSync } from '../src/scenario.js';

const FAST = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;
const YEARS = [2030, 2050, 2075, 2100];

type Params = Record<string, any>;

function withCapital(base: Params, capital: Params): Params {
  return { ...base, capital: { ...(base.capital ?? {}), ...capital } };
}

function run(params: Params) {
  const result = runSimulation(params as any, FAST) as any;
  const at = (year: number) => result.results[result.years.indexOf(year)];
  return { result, at };
}

const lines: string[] = [];
const out = (s = '') => { lines.push(s); console.log(s); };
const f = (x: number, d = 1) => x.toFixed(d);
const pct = (x: number, d = 1) => (100 * x).toFixed(d);

function pathTable(label: string, params: Params) {
  const { at, result } = run(params);
  out(`**${label}** (warming 2100 ${f(result.metrics.warming2100, 2)}°C)`);
  out('');
  out('| year | GDP $T | I/Y % | K/Y | safe % | hurdle % | σ | signal % | profit rate % | return on K % |');
  out('|---|---|---|---|---|---|---|---|---|---|');
  for (const year of [2025, ...YEARS]) {
    const y = at(year);
    out(`| ${year} | ${f(y.gdp, 0)} | ${pct(y.investment / y.gdp)} | ${f(y.capitalOutputRatio, 2)} | ${pct(y.safeRate, 2)} | ${pct(y.investmentHurdle, 2)} | ${f(y.investmentVolatility, 3)} | ${pct(y.investmentSignal, 2)} | ${pct(y.profitRate, 2)} | ${pct(y.interestRate, 2)} |`);
  }
  out('');
}

function summary(params: Params) {
  const { at, result } = run(params);
  return {
    gdp2050: at(2050).gdp,
    gdp2100: at(2100).gdp,
    iy2075: at(2075).investment / at(2075).gdp,
    ky2100: at(2100).capitalOutputRatio,
    warming: result.metrics.warming2100,
  };
}

const RO = { realOptionHurdleWeight: 1 };

out('# Real-option investment prototype');
out('');
out('## 1. Default path: legacy rule vs real-option rule');
out('');
pathTable('Legacy (after-interest profit rate)', {});
pathTable('Real option (σ base 0.20, climate sensitivity 3)', withCapital({}, RO));
pathTable('Real option, climate volatility off (rate channel only)', withCapital({}, { ...RO, climateVolatilitySensitivity: 0 }));

out('## 2. Climate-volatility sensitivity (real-option rule)');
out('');
out('| climateVolatilitySensitivity | σ 2100 | GDP 2050 | GDP 2100 | I/Y 2075 % | K/Y 2100 | warming 2100 |');
out('|---|---|---|---|---|---|---|');
const legacy = summary({});
out(`| legacy | — | ${f(legacy.gdp2050, 0)} | ${f(legacy.gdp2100, 0)} | ${pct(legacy.iy2075)} | ${f(legacy.ky2100, 2)} | ${f(legacy.warming, 2)} |`);
for (const k of [0, 1.5, 3, 6]) {
  const params = withCapital({}, { ...RO, climateVolatilitySensitivity: k });
  const s = summary(params);
  const sigma = run(params).at(2100).investmentVolatility;
  out(`| ${k} | ${f(sigma, 3)} | ${f(s.gdp2050, 0)} | ${f(s.gdp2100, 0)} | ${pct(s.iy2075)} | ${f(s.ky2100, 2)} | ${f(s.warming, 2)} |`);
}
out('');

out('## 3. Rate channel: a permanent +2pp safe-rate shock (neutralSafeRate 1% -> 3%)');
out('');
out('| rule | GDP 2050 | GDP 2100 | I/Y 2075 % | K/Y 2100 | GDP 2100 vs no shock |');
out('|---|---|---|---|---|---|');
for (const [label, capital] of [
  ['legacy', {}],
  ['real option (climate vol off)', { ...RO, climateVolatilitySensitivity: 0 }],
  ['real option', RO],
] as const) {
  const base = summary(withCapital({}, capital));
  const shock = summary(withCapital({}, { ...capital, neutralSafeRate: 0.03 }));
  out(`| ${label} | ${f(shock.gdp2050, 0)} | ${f(shock.gdp2100, 0)} | ${pct(shock.iy2075)} | ${f(shock.ky2100, 2)} | ${pct(shock.gdp2100 / base.gdp2100 - 1)}% |`);
}
out('');

out('## 4. Scenarios: GDP 2100 and warming, legacy vs real option');
out('');
out('| scenario | GDP 2100 legacy | GDP 2100 RO | Δ % | warming legacy | warming RO |');
out('|---|---|---|---|---|---|');
const wanted = ['baseline', 'net-zero', 'high-sensitivity', 'climate-cascade', 'ssp5-85', 'ssp1-26', 'debt-populism', 'tech-stagnation'];
const available = new Set(listScenariosSync());
for (const name of wanted.filter((n) => available.has(n))) {
  const base = loadScenarioParamsSync(name) as Params;
  const a = summary(base);
  const b = summary(withCapital(base, RO));
  out(`| ${name} | ${f(a.gdp2100, 0)} | ${f(b.gdp2100, 0)} | ${pct(b.gdp2100 / a.gdp2100 - 1)} | ${f(a.warming, 2)} | ${f(b.warming, 2)} |`);
}
out('');

const output = process.argv.find((a) => a.startsWith('--output='))?.slice('--output='.length);
if (output) writeFileSync(output, lines.join('\n') + '\n');

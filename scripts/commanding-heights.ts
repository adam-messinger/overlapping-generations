/**
 * Testing the modelable claims of Manidis & Roberts, "The Commanding Heights"
 * (commanding-heights.com, 2026-10-29) against this model.
 *
 *   npx tsx scripts/commanding-heights.ts            # markdown tables
 *
 * The essay's claims and which of them this model can speak to are set out in
 * docs/COMMANDING_HEIGHTS.md. Five tests:
 *
 *  T1 The Line, arithmetic: the essay's own growth rates (Big-4 capex +70%/yr,
 *     Epoch's frontier training cost 3.5x/yr) projected against the US economy
 *     the model grows. When does the line hit the macro budget?
 *  T2 Genesis: a sustained datacenter boom with and without an AI output
 *     payoff, scored on consumption plus the capital left at the end, not on
 *     GDP. The payoff that breaks even is the question.
 *  T3 Labor to capital: the labor-share change over 2026-2036 against the
 *     essay's "a decade does what forty years did" (BLS: ~ -5.5 to -7pp).
 *  T4 Debasement: financial repression (the safe rate held below its market
 *     level) as the real-terms channel by which a sovereign "carries its
 *     costs"; who loses (bondholders' interest) and what it buys (debt/GDP).
 *  T5 Principalities: where the model puts the world's compute (US + China
 *     share of datacenter load) against IEA's observed 2024 split.
 *
 * Model limits that bound every answer: no price level (so no inflation or
 * "debasement" in nominal terms), no stock market, no labs or toll layers,
 * world-aggregate public debt, PPP-2017 levels. See the doc.
 */

import { readFileSync } from 'node:fs';
import { runSimulation } from '../src/index.js';
import { demandDefaults } from '../src/modules/demand.js';

const OPTS = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;
type Row = Record<string, any>;
type Run = { label: string; rows: Row[] };

function run(label: string, params: Record<string, any>, endYear = 2050): Run {
  const r = runSimulation({ ...params, endYear } as any, OPTS as any);
  return { label, rows: r.results as Row[] };
}
const at = (r: Run, y: number) => r.rows.find((x) => x.year === y)!;
const sum = (r: Run, from: number, to: number, f: (x: Row) => number) =>
  r.rows.filter((x) => x.year >= from && x.year <= to).reduce((s, x) => s + f(x), 0);
const f = (v: number, d = 2) => v.toFixed(d);
const pct = (v: number, d = 1) => (100 * v).toFixed(d) + '%';

function table(head: string[], body: (string | number)[][]): string {
  return [
    '| ' + head.join(' | ') + ' |',
    '|' + head.map(() => '---').join('|') + '|',
    ...body.map((r) => '| ' + r.join(' | ') + ' |'),
  ].join('\n');
}

// --- the essay's levers, as model parameter sets ---------------------------------
// "The line": the closest the model gets to an unbraked datacenter build is a
// doubled base growth with the total-cost spend ceiling loosened 10x (as in
// ai-energy-boom).
const LINE = { demand: { dataCenterBaseGrowth: 0.30, dataCenterSpendCeiling: 0.13 } };
const withPayoff = (w: number) => ({ ...LINE, production: { aiWorkerEquivalentPerTWh: w } });

const out: string[] = [];
const p = (s = '') => out.push(s);

const base = run('baseline', {});

// --- T1 ------------------------------------------------------------------------
// Nominal US GDP path: IMF WEO Oct 2026 2026 level ($31.8T) grown at the model's
// real US growth plus 2.5% inflation. Big-4 capex: CY2026 guidance midpoint
// ~$0.73T (Oct 2026 calls) growing at Epoch's 70%/yr hyperscaler cash-capex
// trend. Training run: ~$1B in 2026, x3.5/yr (Epoch "Trends in AI").
{
  const US_NOMINAL_2026 = 31.8, INFL = 0.025;
  const usNom = (y: number) =>
    US_NOMINAL_2026 * (at(base, y).regionalGdp.us / at(base, 2026).regionalGdp.us) *
    Math.pow(1 + INFL, y - 2026);
  const capex = (y: number) => 0.73 * Math.pow(1.7, y - 2026);
  const run$ = (y: number) => 0.001 * Math.pow(3.5, y - 2026);
  p('## T1. The Line against the US economy');
  p();
  p('The essay\'s own growth rates, projected against a nominal US GDP path (IMF 2026 level, the model\'s real US growth, 2.5% inflation).');
  p();
  const rows = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2035].map((y) => [
    y, f(usNom(y), 1), f(capex(y), 2), pct(capex(y) / usNom(y)), f(run$(y), 3), pct(run$(y) / usNom(y), 2),
  ]);
  p(table(['year', 'US GDP $T', 'Big-4 capex at +70%/yr $T', 'capex / US GDP', 'frontier run at 3.5x/yr $T', 'run / US GDP'], rows));
  const first = (g: (y: number) => number, th: number) => {
    for (let y = 2026; y <= 2050; y++) if (g(y) >= th) return y;
    return '>2050';
  };
  p();
  p(`Capex reaches 3% of US GDP in ${first((y) => capex(y) / usNom(y), 0.03)}, 10% in ${first((y) => capex(y) / usNom(y), 0.10)}, ` +
    `and US gross private investment (~18% of GDP) in ${first((y) => capex(y) / usNom(y), 0.18)}. ` +
    `A single training run passes 1% of US GDP in ${first((y) => run$(y) / usNom(y), 0.01)} and 5% in ${first((y) => run$(y) / usNom(y), 0.05)}.`);
  p();
}

// --- T2 ------------------------------------------------------------------------
// Whether a boom "pays" is scored on what people get, not on GDP: GDP that
// holds level while datacenter capex absorbs more of it means less
// consumption. Score = cumulative 2026-40 consumption (household + public
// services) plus the capital stock left in 2040 (general + robot +
// datacenter, so the datacenters still standing count, and so does the
// general capital they crowded out), each against the baseline.
{
  const FROM = 2026, TO = 2040;
  const cons = (x: Row) => x.householdConsumption + x.governmentServiceConsumption;
  const delta = (r: Run, g: (x: Row) => number) => sum(r, FROM, TO, g) - sum(base, FROM, TO, g);
  const score = (r: Run) => ({
    gdp: delta(r, (x) => x.gdp),
    capex: delta(r, (x) => x.dataCenterCapexSpend),
    cons: delta(r, cons),
    capital: at(r, TO).capitalStock - at(base, TO).capitalStock,
  });
  const value = (r: Run) => { const v = score(r); return v.cons + v.capital; };
  const { name: _n, description: _d, ...boomParams } = JSON.parse(
    readFileSync(new URL('../scenarios/ai-energy-boom.json', import.meta.url), 'utf8'));
  const boom = run('ai-energy-boom', boomParams);
  const payoffs = [0, 25000, 35000, 45000, 50000, 75000, 100000];
  const lines = payoffs.map((w) => run(w ? `line, payoff ${w / 1000}k/TWh` : 'line, no payoff', withPayoff(w)));
  const runs = [base, ...lines, boom];
  const kw = (w: number) => f(1e9 / 8760 / w, 1);
  // Smallest payoff at which a measure stops being negative (bisection).
  const breakEven = (measure: (r: Run) => number) => {
    let lo = 0, hi = 300000;
    if (measure(run('', withPayoff(hi), TO)) <= 0) return NaN;
    for (let i = 0; i < 16; i++) {
      const m = (lo + hi) / 2;
      if (measure(run('', withPayoff(m), TO)) > 0) hi = m; else lo = m;
    }
    return hi;
  };
  const beValue = breakEven(value);
  const beCons = breakEven((r) => score(r).cons);
  const beGdp = breakEven((r) => score(r).gdp);

  p('## T2. Genesis: does a sustained datacenter boom pay for itself?');
  p();
  p('`line` = datacenter base growth 0.30 and the total-cost spend ceiling 10x (13% of GDP). Payoff = production.aiWorkerEquivalentPerTWh (0 by default). $T are the model\'s PPP-2017 dollars. "Value" = cumulative 2026-40 consumption plus the capital stock left in 2040, both against the baseline; GDP is shown but is not the test, since GDP that holds level while capex rises means less consumption.');
  p();
  p(table(
    ['run', 'DC capex 2030', 'DC capex 2035', 'DC TWh 2035', 'cum. GDP vs base', 'cum. extra DC capex', 'cum. consumption vs base', 'capital 2040 vs base', 'value vs base', 'return on capital 2035'],
    runs.map((r) => {
      const v = r === base ? { gdp: 0, capex: 0, cons: 0, capital: 0 } : score(r);
      return [r.label, f(at(r, 2030).dataCenterCapexSpend), f(at(r, 2035).dataCenterCapexSpend), f(at(r, 2035).dataCenterLoadTWh, 0),
        f(v.gdp, 0), f(v.capex, 0), f(v.cons, 0), f(v.capital, 0), f(v.cons + v.capital, 0), pct(at(r, 2035).interestRate, 2)];
    }),
  ));
  p();
  p(`Break-even payoff on value: ~${f(beValue / 1000, 0)}k worker-equivalents per TWh (~${kw(beValue)} kW of continuous datacenter load per worker-equivalent). ` +
    `On consumption alone: ~${f(beCons / 1000, 0)}k (~${kw(beCons)} kW). GDP alone stops falling at ~${f(beGdp / 1000, 0)}k (~${kw(beGdp)} kW), which is not a break-even.`);
  p();

  // --- T3 ----------------------------------------------------------------------
  p('## T3. Labor to capital in a decade');
  p();
  p('Essay: "as much transfer from labor to capital in the next decade as the previous wage-to-financial economy produced in forty years". BLS nonfarm labor share index (FRED PRS85006173, 2017=100): 1980 112.1 -> 2020 102.3; 1985 108.4 -> 2025 96.0, i.e. about -5.5 to -7 pp of the percent share (2026Q2 = 52.8%). Model laborShare is world compensation/GDP; read the change.');
  p();
  p(table(['run', '2026', '2031', '2036', 'change 2026-36, pp', 'value 2026-40 vs base, $T'],
    runs.map((r) => [r.label, pct(at(r, 2026).laborShare), pct(at(r, 2031).laborShare), pct(at(r, 2036).laborShare),
      f(100 * (at(r, 2036).laborShare - at(r, 2026).laborShare), 1), r === base ? '-' : f(value(r), 0)])));
  p();
}

// --- T4 ------------------------------------------------------------------------
{
  const levels = [0, 0.01, 0.02, 0.03];
  const runs = levels.map((l) => run(`repression ${l * 100}pp`, { capital: { financialRepression: l } }, 2050));
  const r0 = runs[0];
  p('## T4. Debasement as financial repression');
  p();
  p('The model has no price level, so "debasement" is represented by its real-terms equivalent: the safe rate held below its market level (capital.financialRepression), the Reinhart-Sbrancia liquidation channel the essay cites for the post-war US. Public debt is a world aggregate.');
  p();
  p(table(['run', 'safe rate 2030', 'r_safe - g 2030', 'public debt/GDP 2035', 'public debt/GDP 2050', 'cum. public interest to households 2026-50 vs no repression, $T', 'GDP 2050 vs no repression'],
    runs.map((r) => {
      const g = at(r, 2030).gdp / at(r, 2029).gdp - 1;
      return [r.label, pct(at(r, 2030).safeRate, 2), pct(at(r, 2030).safeRate - g, 2), f(at(r, 2035).publicDebtGDP), f(at(r, 2050).publicDebtGDP),
        f(sum(r, 2026, 2050, (x) => x.publicInterestToHouseholds) - sum(r0, 2026, 2050, (x) => x.publicInterestToHouseholds), 1),
        pct(at(r, 2050).gdp / at(r0, 2050).gdp - 1, 2)];
    })));
  const firstRepress = base.rows.find((x) => x.repressionGap > 1e-6);
  p();
  p(`Default path: fiscal-dominance repression (world public debt > 150%) first binds in ${firstRepress ? firstRepress.year : 'no year to 2050'}.`);
  p();
}

// --- T5 ------------------------------------------------------------------------
{
  const r = at(base, 2025), r35 = at(base, 2035);
  // Regional datacenter load is not a separate output: the demand module
  // sites it by dataCenterRegionalShare (GDP share before November 2026).
  const dcShare = (_row: Row, reg: string) =>
    (demandDefaults as any).dataCenterRegionalShare?.[reg] ?? _row.regionalGdp[reg] / _row.gdp;
  p('## T5. Principalities: where the compute sits');
  p();
  p('IEA Energy and AI (2025): 2024 datacenter electricity ~415 TWh, US 45%, China 25%, Europe 15%.');
  p();
  p(table(['', 'world DC TWh', 'US share', 'China share', 'US + China', 'US DC TWh'],
    [[2025, f(r.dataCenterLoadTWh, 0), pct(dcShare(r, 'us')), pct(dcShare(r, 'china')), pct(dcShare(r, 'us') + dcShare(r, 'china')), f(r.dataCenterLoadTWh * dcShare(r, 'us'), 0)],
     [2035, f(r35.dataCenterLoadTWh, 0), pct(dcShare(r35, 'us')), pct(dcShare(r35, 'china')), pct(dcShare(r35, 'us') + dcShare(r35, 'china')), f(r35.dataCenterLoadTWh * dcShare(r35, 'us'), 0)]]));
  p();
  p(`Model 2025 datacenter capex: ${f(r.dataCenterCapexSpend, 3)} $T (PPP-2017). Dell'Oro: worldwide 2025 ~$0.7T nominal (2024 $455B, +57%); 2026 forecast > $1T.`);
}

console.log(out.join('\n'));

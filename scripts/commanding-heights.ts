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
 *     payoff. "Rational for each firm, capital destruction in aggregate" is the
 *     no-payoff case; the payoff that breaks even is the question.
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
// doubled base growth with the power-spend ceiling loosened 10x.
const LINE = { demand: { dataCenterBaseGrowth: 0.30, dataCenterPowerSpendCeiling: 0.005 } };
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
{
  const noPay = run('line, no payoff', LINE);
  const boom = run('ai-energy-boom', {
    demand: { dataCenterPowerSpendCeiling: 0.005, dataCenterBaseGrowth: 0.15, robotDiffusionRate: 0.3, robotIntegrationExponent: 0.5 },
    production: { robotLaborEquivalent: 2, aiWorkerEquivalentPerTWh: 100000 },
  });
  const payoffs = [25000, 50000, 100000];
  const pays = payoffs.map((w) => run(`line, payoff ${w / 1000}k/TWh`, withPayoff(w)));
  const runs = [base, noPay, ...pays, boom];
  p('## T2. Genesis: a sustained datacenter boom, with and without an output payoff');
  p();
  p('`line` = datacenter base growth 0.30 and the power-spend ceiling 10x (0.5% of GDP). Payoff = production.aiWorkerEquivalentPerTWh (0 by default). Capex is the model\'s composite chips + facility spend, world, $T (PPP-2017).');
  p();
  p(table(
    ['run', 'DC capex 2030', 'DC capex 2035', 'cum. DC capex 2026-40', 'DC TWh 2035', 'investment 2035', 'GDP 2035 vs base', 'GDP 2040 vs base', 'cum. GDP 2026-40 vs base', 'return on capital 2035', 'energy WACC 2035'],
    runs.map((r) => [
      r.label, f(at(r, 2030).dataCenterCapexSpend), f(at(r, 2035).dataCenterCapexSpend),
      f(sum(r, 2026, 2040, (x) => x.dataCenterCapexSpend), 1), f(at(r, 2035).dataCenterLoadTWh, 0),
      f(at(r, 2035).investment, 1),
      pct(at(r, 2035).gdp / at(base, 2035).gdp - 1, 2), pct(at(r, 2040).gdp / at(base, 2040).gdp - 1, 2),
      f(sum(r, 2026, 2040, (x) => x.gdp) - sum(base, 2026, 2040, (x) => x.gdp), 1),
      pct(at(r, 2035).interestRate, 2), pct(at(r, 2035).effectiveWACC, 2),
    ]),
  ));
  // Breakeven payoff: cumulative 2026-2040 GDP equal to the baseline's.
  const cumGap = (w: number) => {
    const r = run('', withPayoff(w), 2040);
    return sum(r, 2026, 2040, (x) => x.gdp) - sum(base, 2026, 2040, (x) => x.gdp);
  };
  let lo = 0, hi = 200000;
  if (cumGap(hi) > 0) {
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (cumGap(m) > 0) hi = m; else lo = m; }
  }
  const extraCapex = sum(noPay, 2026, 2040, (x) => x.dataCenterCapexSpend) - sum(base, 2026, 2040, (x) => x.dataCenterCapexSpend);
  p();
  p(`Without a payoff the boom costs ${f(-(sum(noPay, 2026, 2040, (x) => x.gdp) - sum(base, 2026, 2040, (x) => x.gdp)), 1)} $T of cumulative 2026-40 GDP for ${f(extraCapex, 1)} $T of extra datacenter capex. ` +
    `Cumulative GDP breaks even at a payoff of ~${f(hi / 1000, 0)}k worker-equivalents per TWh (~${f(1e9 / 8760 / hi, 1)} kW of continuous datacenter load per worker-equivalent).`);
  p();

  // --- T3 ----------------------------------------------------------------------
  p('## T3. Labor to capital in a decade');
  p();
  p('Essay: "as much transfer from labor to capital in the next decade as the previous wage-to-financial economy produced in forty years". BLS nonfarm labor share index (FRED PRS85006173, 2017=100): 1980 112.1 -> 2020 102.3; 1985 108.4 -> 2025 96.0, i.e. about -5.5 to -7 pp of the percent share (2026Q2 = 52.8%). Model laborShare is world compensation/GDP; read the change.');
  p();
  p(table(['run', '2026', '2031', '2036', 'change 2026-36, pp', 'robots/1000 workers 2036'],
    runs.map((r) => [r.label, pct(at(r, 2026).laborShare), pct(at(r, 2031).laborShare), pct(at(r, 2036).laborShare),
      f(100 * (at(r, 2036).laborShare - at(r, 2026).laborShare), 1), f(at(r, 2036).robotsPer1000, 0)])));
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

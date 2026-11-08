/**
 * Run the AI-offshoring overlay on top of the main simulation.
 *
 *   npx tsx scripts/ai-offshoring/run.ts            # all adoption cases, markdown report
 *   npx tsx scripts/ai-offshoring/run.ts --json     # raw results
 *
 * For each adoption case: run the main model, compute the overlay, feed its
 * regional output factors back through demand.commodityShocks, and repeat until
 * the factors settle (the overlay's USD denominators depend on regional GDP).
 * See docs/AI_OFFSHORING_SIMULATION.md.
 */
import { runSimulation } from '../../src/simulation.js';
import { REGIONS, type Region } from '../../src/domain-types.js';
import { capitalDefaults } from '../../src/modules/capital.js';
import { runOverlay, toCommodityShocks, type BaseRun, type OverlayResult } from './model.js';
import { ADOPTION_CASES, baseOverlayParams } from './data.js';

const OPTS = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;
const END = 2060;

function mainRun(shocks: ReturnType<typeof toCommodityShocks> = []) {
  const res = (runSimulation({ startYear: 2025, endYear: END, demand: { commodityShocks: shocks } } as never, OPTS) as any).results;
  const base: BaseRun = {
    years: res.map((r: any) => r.year),
    regionalGdp: res.map((r: any) => r.regionalGdp as Record<Region, number>),
    marketPriceRatio: capitalDefaults.publicDebtMarketPriceRatio,
  };
  return { res, base };
}

export function runCase(caseName: keyof typeof ADOPTION_CASES) {
  const params = { ...baseOverlayParams, adoption: ADOPTION_CASES[caseName] };
  const plain = mainRun();
  let overlay: OverlayResult = runOverlay(plain.base, params);
  let coupled = mainRun(toCommodityShocks(overlay));
  for (let k = 0; k < 4; k++) {
    const next = runOverlay(coupled.base, params);
    const drift = Math.max(...next.years.map((y) =>
      Math.max(0, ...REGIONS.map((r) => Math.abs((next.regionalFactors[y][r] ?? 1) - (overlay.regionalFactors[y][r] ?? 1))))));
    overlay = next;
    coupled = mainRun(toCommodityShocks(overlay));
    if (drift < 1e-6) break;
  }
  return { caseName, params, plain: plain.res, coupled: coupled.res, overlay };
}

const pct = (x: number, d = 1) => (x * 100).toFixed(d);

function report(runs: ReturnType<typeof runCase>[]) {
  const out: string[] = [];
  const p = (s = '') => out.push(s);
  const years = [2030, 2035, 2040, 2050, 2060];
  for (const r of runs) {
    p(`## Case: ${r.caseName} (AI ceiling ${pct(r.params.adoption.sMax, 0)}% of exposed tasks, midpoint ${r.params.adoption.midpointYear})`);
    p();
    for (const name of Object.keys(r.overlay.exporters)) {
      p(`### ${name}`);
      p();
      p('| year | AI share of tasks | jobs without AI, M | jobs remaining, M | displaced, M | unemployed, M | unemployment rate +pp | not back in formal work, M | displaced workers\' lost earnings, $bn | value-added lost, $bn | % of GDP |');
      p('|---|---|---|---|---|---|---|---|---|---|---|');
      for (const y of years) {
        const e = r.overlay.exporters[name].find((x) => x.year === y);
        if (!e) continue;
        p(`| ${y} | ${pct(e.aiShare)}% | ${(e.counterfactualJobs / 1e6).toFixed(2)} | ${(e.jobs / 1e6).toFixed(2)} | ${(e.displacedCumulative / 1e6).toFixed(2)} | ${(e.unemployed / 1e6).toFixed(2)} | ${pct(e.unemploymentRateRise, 2)} | ${(e.notBackInFormalWork / 1e6).toFixed(2)} | ${e.displacedEarningsLostUsdBn.toFixed(1)} | ${e.valueAddedLostUsdBn.toFixed(1)} | ${pct(e.gdpLossShare, 2)}% |`);
      }
      const peak = r.overlay.exporters[name].reduce((m, e) => (e.unemploymentRateRise > m.unemploymentRateRise ? e : m));
      p();
      p(`Peak unemployment-rate rise: ${pct(peak.unemploymentRateRise, 2)}pp in ${peak.year}.`);
      p();
    }
    p('### Regional GDP in the main model (coupled run vs no-overlay run)');
    p();
    p('| region | ' + years.join(' | ') + ' |');
    p('|---|' + years.map(() => '---').join('|') + '|');
    for (const region of REGIONS) {
      const cells = years.map((y) => {
        const a = r.plain.find((x: any) => x.year === y).regionalGdp[region];
        const b = r.coupled.find((x: any) => x.year === y).regionalGdp[region];
        return `${((b / a - 1) * 100).toFixed(2)}%`;
      });
      p(`| ${region} | ${cells.join(' | ')} |`);
    }
    const w = (y: number) => {
      const a = r.plain.find((x: any) => x.year === y);
      const b = r.coupled.find((x: any) => x.year === y);
      return `world GDP ${((b.gdp / a.gdp - 1) * 100).toFixed(3)}%, warming ${(b.temperature - a.temperature).toFixed(3)}°C`;
    };
    p();
    p(`World effect: 2040 ${w(2040)}; 2060 ${w(2060)}.`);
    const host2040 = r.overlay.hostRevenueUsdBn[2040];
    p(`AI-provider revenue from displaced work, 2040: ${Object.entries(host2040).map(([k, v]) => `${k} $${(v as number).toFixed(0)}bn`).join(', ')}.`);
    p();
  }
  return out.join('\n');
}

const cases = Object.keys(ADOPTION_CASES) as (keyof typeof ADOPTION_CASES)[];
const runs = cases.map(runCase);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(runs.map((r) => ({ case: r.caseName, overlay: r.overlay })), null, 1));
} else {
  console.log(report(runs));
}

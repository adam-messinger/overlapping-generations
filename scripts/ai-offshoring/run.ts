/**
 * Run the AI-offshoring overlay on top of the main simulation.
 *
 *   npx tsx scripts/ai-offshoring/run.ts            # all adoption cases, markdown report
 *   npx tsx scripts/ai-offshoring/run.ts --json     # raw results
 *   npx tsx scripts/ai-offshoring/run.ts --ai-productivity[=1e5]
 *       # turn on the main model's AI productivity channel
 *       # (production.aiWorkerEquivalentPerTWh; 1e5 is the ai-energy-boom value)
 *   --ai-gains=exposure
 *       # with --ai-productivity: re-split AI's world output gain by where AI is
 *       # used (IMF SDN/2024/001 exposure: AE 60%, EM 40%, LIC 26% of jobs) instead
 *       # of the main model's split, which gives every region the same % gain
 *
 * For each adoption case: run the main model, compute the overlay, feed its
 * regional output factors back through demand.regionalOutputAdjustments, and repeat until
 * the factors settle (the overlay's USD denominators depend on regional GDP).
 * See docs/AI_OFFSHORING_SIMULATION.md.
 */
import { runSimulation } from '../../src/simulation.js';
import { REGIONS, type Region } from '../../src/domain-types.js';
import { capitalDefaults } from '../../src/modules/capital.js';
import { runOverlay, toOutputAdjustments, type BaseRun, type OverlayResult } from './model.js';
import type { AnnualRegionalOutputAdjustment } from '../../src/modules/demand.js';
import { ADOPTION_CASES, baseOverlayParams } from './data.js';

const OPTS = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;
const END = 2060;
const aiArg = process.argv.find((a) => a.startsWith('--ai-productivity'));
export const AI_WORKER_EQUIVALENT_PER_TWH = aiArg ? Number(aiArg.split('=')[1] ?? 1e5) : 0;
const AI_GAINS_BY_EXPOSURE = process.argv.includes('--ai-gains=exposure');
/**
 * Share of jobs exposed to AI, IMF SDN/2024/001 (Cazzaniga et al.) [P]:
 * advanced economies 60%, emerging markets 40%, low-income countries 26%.
 * Mapped to regions [est]: South Asia between EM and LIC. A proxy for where
 * AI's output gains land (use), not who owns the capital.
 */
const AI_EXPOSURE: Record<Region, number> = {
  us: 0.60, 'oecd-ex-us': 0.60, china: 0.40, latam: 0.40, seasia: 0.40,
  russia: 0.40, mena: 0.40, india: 0.30, ssa: 0.26,
};
let aiGainFactors: Record<number, Partial<Record<Region, number>>> | undefined;

/** Factors that move AI's world gain from the model's uniform split to an exposure-weighted one */
function exposureGainFactors() {
  const off = mainRun([], 0, false).res;
  const on = mainRun([], AI_WORKER_EQUIVALENT_PER_TWH, false).res;
  const out: Record<number, Partial<Record<Region, number>>> = {};
  for (const r of on) {
    const o = off.find((x: any) => x.year === r.year);
    const G = r.gdp / o.gdp - 1;
    const total = REGIONS.reduce((s, k) => s + r.regionalGdp[k], 0);
    const W = REGIONS.reduce((s, k) => s + (r.regionalGdp[k] / total) * AI_EXPOSURE[k], 0);
    out[r.year] = Object.fromEntries(REGIONS.map((k) => [k, (1 + G * AI_EXPOSURE[k] / W) / (1 + G)]));
  }
  return out;
}

function combine(adjustments: AnnualRegionalOutputAdjustment[]): AnnualRegionalOutputAdjustment[] {
  if (!aiGainFactors) return adjustments;
  const byYear = new Map(adjustments.map((s) => [s.year, s.factors]));
  return Object.keys(aiGainFactors).map(Number).filter((y) => y > 2025).map((year) => ({
    year,
    factors: Object.fromEntries(REGIONS.map((k) => [
      k, (aiGainFactors![year][k] ?? 1) * ((byYear.get(year) ?? {})[k] ?? 1),
    ])),
  }));
}

function mainRun(adjustments: AnnualRegionalOutputAdjustment[] = [], aiPerTWh = AI_WORKER_EQUIVALENT_PER_TWH, withGainSplit = true) {
  const res = (runSimulation({
    startYear: 2025,
    endYear: END,
    demand: { regionalOutputAdjustments: withGainSplit ? combine(adjustments) : adjustments },
    production: { aiWorkerEquivalentPerTWh: aiPerTWh },
  }, OPTS) as any).results;
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
  let coupled = mainRun(toOutputAdjustments(overlay));
  for (let k = 0; k < 4; k++) {
    const next = runOverlay(coupled.base, params);
    const drift = Math.max(...next.years.map((y) =>
      Math.max(0, ...REGIONS.map((r) => Math.abs((next.regionalFactors[y][r] ?? 1) - (overlay.regionalFactors[y][r] ?? 1))))));
    overlay = next;
    coupled = mainRun(toOutputAdjustments(overlay));
    if (drift < 1e-6) break;
  }
  return { caseName, params, plain: plain.res, coupled: coupled.res, overlay };
}

const pct = (x: number, d = 1) => (x * 100).toFixed(d);

function report(runs: ReturnType<typeof runCase>[]) {
  const out: string[] = [];
  const p = (s = '') => out.push(s);
  const years = [2030, 2035, 2040, 2050, 2060];
  if (AI_WORKER_EQUIVALENT_PER_TWH > 0) {
    const off = mainRun([], 0, false).res;
    const on = runs[0].plain;
    p(`## Main model with AI productivity on (aiWorkerEquivalentPerTWh = ${AI_WORKER_EQUIVALENT_PER_TWH}${AI_GAINS_BY_EXPOSURE ? ', gains split by AI exposure' : ', gains split as the main model does'}) vs off, no overlay`);
    p();
    p('| | ' + years.join(' | ') + ' |');
    p('|---|' + years.map(() => '---').join('|') + '|');
    const row = (label: string, f: (r: any) => number) => p(`| ${label} | ${years.map((y) => {
      const a = off.find((x: any) => x.year === y), b = on.find((x: any) => x.year === y);
      return `${((f(b) / f(a) - 1) * 100).toFixed(1)}%`;
    }).join(' | ')} |`);
    row('world GDP', (r) => r.gdp);
    for (const region of REGIONS) row(region, (r) => r.regionalGdp[region]);
    row('datacenter load', (r) => r.dataCenterLoadTWh);
    p();
    const cg = (rs: any[], a: number, b: number) => (((rs.find((x) => x.year === b).gdp / rs.find((x) => x.year === a).gdp) ** (1 / (b - a)) - 1) * 100).toFixed(2);
    p(`World growth 2026-45: off ${cg(off, 2026, 2045)}%/yr, on ${cg(on, 2026, 2045)}%/yr. Labour share 2045: off ${(off.find((x: any) => x.year === 2045).laborShare * 100).toFixed(1)}%, on ${(on.find((x: any) => x.year === 2045).laborShare * 100).toFixed(1)}%.`);
    p();
  }
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

if (AI_GAINS_BY_EXPOSURE) {
  if (AI_WORKER_EQUIVALENT_PER_TWH <= 0) throw new Error('--ai-gains=exposure needs --ai-productivity');
  aiGainFactors = exposureGainFactors();
}
const cases = Object.keys(ADOPTION_CASES) as (keyof typeof ADOPTION_CASES)[];
const runs = cases.map(runCase);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(runs.map((r) => ({ case: r.caseName, overlay: r.overlay })), null, 1));
} else {
  console.log(report(runs));
}

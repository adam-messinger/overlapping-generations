/**
 * Model vs the 2026-11-07 "Bifurcated Bloc Capitalism & Fiscal Repression" Tetlock panel
 * (2026-2045), plus the diagnostic runs behind docs/forecasts/bloc-capitalism-2045/README.md.
 *
 * Sections:
 *   1. The comparison table: default + five alternatives (same runs as the first comparison).
 *   2. Growth crux: production weights with and without constant returns to scale.
 *   3. Electrification pace: does it drive growth? (frozen / half-pace electrification).
 *   4. Debt path to 2031 against IMF Fiscal Monitor April 2026 (world 93.9% -> 102.3%).
 *   5. Backcast 1990-2025 with constant returns (does history identify gamma?).
 *
 * "fragmentation" is a reconstruction (financing spreads x2, migration -60%, primary deficit
 * +1pp); the first comparison's exact settings were not kept.
 *
 * Usage: npx tsx scripts/bloc-capitalism-comparison.ts   (~30 s)
 */
import { runSimulation, runWithScenario } from '../src/simulation.js';
import { runGrowthBackcast } from '../src/historical-backcast.js';

const OPTS = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;
const BLOC = ['us', 'oecd-ex-us', 'china'] as const;
type Row = Record<string, any>;

const cagr = (a: number, b: number, n: number) => ((b / a) ** (1 / n) - 1) * 100;
const f = (x: number, d = 2) => x.toFixed(d);

function summarize(res: Row[]) {
  const at = (y: number) => res.find((r) => r.year === y)!;
  const pc = (y: number, regs: readonly string[]) =>
    regs.reduce((a, r) => a + at(y).regionalGdp[r], 0) / regs.reduce((a, r) => a + at(y).regionalPopulation[r], 0);
  const win = res.filter((r) => r.year >= 2036 && r.year <= 2045);
  const tfcShare = (y: number) => at(y).electricityDemand / (at(y).electricityDemand + at(y).nonElectricEnergy);
  return {
    world26: (at(2026).gdp / at(2025).gdp - 1) * 100,
    us26: (at(2026).regionalGdp.us / at(2025).regionalGdp.us - 1) * 100,
    world: cagr(at(2026).gdp, at(2045).gdp, 19),
    bloc: cagr(pc(2026, BLOC), pc(2045, BLOC), 19),
    us: cagr(pc(2026, ['us']), pc(2045, ['us']), 19),
    cn: cagr(pc(2026, ['china']), pc(2045, ['china']), 19),
    in: cagr(pc(2026, ['india']), pc(2045, ['india']), 19),
    rstar: (win.reduce((a, r) => a + r.safeRate, 0) / win.length) * 100,
    debt25: at(2025).publicDebtGDP, debt31: at(2031).publicDebtGDP,
    debt45: at(2045).publicDebtGDP, debt60: at(2060).publicDebtGDP,
    repr45: res.filter((r) => r.year <= 2045 && r.repressionGap > 1e-4).length,
    repr60: res.filter((r) => r.year <= 2060 && r.repressionGap > 1e-4).length,
    usCn45: ((at(2045).regionalGdp.us + at(2045).regionalGdp.china) / at(2045).gdp) * 100,
    labor45: at(2045).laborShare * 100,
    elecG: cagr(at(2026).electricityDemand, at(2045).electricityDemand, 19),
    elecTfc45: tfcShare(2045) * 100,
    usefulE: cagr(at(2026).productionUsefulEnergy, at(2045).productionUsefulEnergy, 19),
  };
}

const run = (p: object) => summarize((runSimulation(p as never, OPTS) as any).results);
const scen = async (name: string) =>
  summarize((await runWithScenario(`scenarios/${name}.json`, undefined, OPTS)).result.results as Row[]);

console.log('## 1. Comparison (2026-45; r* = 2036-45 average world safe rate)\n');
console.log('| run | OECD+China /cap | US /cap | China /cap | India /cap | world | r* | debt 2045 | debt 2060 | repression yrs to 2045/2060 | US+China share 2045 | labour share 2045 |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
const table: [string, () => Promise<ReturnType<typeof summarize>>][] = [
  ['default', async () => run({})],
  ['ai-energy-boom', () => scen('ai-energy-boom')],
  ['tech-stagnation', () => scen('tech-stagnation')],
  ['debt-populism', () => scen('debt-populism')],
  ['un-wpp-medium', () => scen('un-wpp-medium')],
  ['fragmentation (reconstructed)', async () => run({
    energy: { financingSpreadScale: 2.0 },
    demographics: { migrationMultiplier: 0.4 },
    capital: { publicDeficitRate: 0.04 },
  })],
];
for (const [name, fn] of table) {
  const s = await fn();
  console.log(`| ${name} | ${f(s.bloc)} | ${f(s.us)} | ${f(s.cn)} | ${f(s.in)} | ${f(s.world)} | ${f(s.rstar)} | ${f(s.debt45 * 100, 0)}% | ${f(s.debt60 * 100, 0)}% | ${s.repr45}/${s.repr60} | ${f(s.usCn45, 1)}% | ${f(s.labor45, 1)}% |`);
}

console.log('\n## 2. Growth crux: production weights (alpha, beta, gamma)\n');
console.log('| weights | sum | world 2026 | US 2026 | world 2026-45 | OECD+China /cap | US /cap | China /cap | r* | debt 2045 |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const [a, b, g] of [[0.25, 0.15, 0.55], [0.25, 0.15, 0.08], [0.25, 0.45, 0.30], [0.25, 0.55, 0.20], [0.25, 0.65, 0.10]]) {
  const s = run({ production: { alpha: a, beta: b, gamma: g } });
  console.log(`| ${a} / ${b} / ${g} | ${f(a + b + g)} | ${f(s.world26)} | ${f(s.us26)} | ${f(s.world)} | ${f(s.bloc)} | ${f(s.us)} | ${f(s.cn)} | ${f(s.rstar)} | ${f(s.debt45 * 100, 0)}% |`);
}

console.log('\n## 3. Electrification pace vs growth\n');
const sectors = (k: number, bp: number) => ({
  transport: { maxAnnualChange: 0.04 * k, basePressure: 0.015 * bp },
  buildings: { maxAnnualChange: 0.03 * k, basePressure: 0.02 * bp },
  industry: { maxAnnualChange: 0.025 * k, basePressure: 0.019 * bp },
});
console.log('| case | electricity demand %/yr | electricity share of final energy 2045 | useful energy %/yr | world GDP %/yr | OECD+China /cap |');
console.log('|---|---|---|---|---|---|');
for (const [name, p] of [['default', {}], ['half pace', { demand: { sectors: sectors(0.5, 0.5) } }], ['frozen at 2025', { demand: { sectors: sectors(0.02, 0) } }]] as [string, object][]) {
  const s = run(p);
  console.log(`| ${name} | ${f(s.elecG)} | ${f(s.elecTfc45, 1)}% | ${f(s.usefulE)} | ${f(s.world)} | ${f(s.bloc)} |`);
}

console.log('\n## 4. World public debt vs IMF Fiscal Monitor (Apr 2026: 93.9% in 2025, 102.3% in 2031)\n');
for (const [name, p] of [['default', {}], ['CRS gamma 0.1', { production: { alpha: 0.25, beta: 0.65, gamma: 0.1 } }]] as [string, object][]) {
  const s = run(p);
  console.log(`- ${name}: 2025 ${f(s.debt25 * 100, 1)}%, 2031 ${f(s.debt31 * 100, 1)}%, 2045 ${f(s.debt45 * 100, 1)}%`);
}

console.log('\n## 5. Backcast 1990-2025: as shipped vs constant returns\n');
console.log('| alpha / beta / gamma | sum | model CAGR | observed | RMS log error |');
console.log('|---|---|---|---|---|');
for (const [a, b, g] of [[0.25, 0.15, 0.08], [0.25, 0.15, 0.55], [0.25, 0.75, 0], [0.25, 0.65, 0.1], [0.25, 0.55, 0.2], [0.25, 0.45, 0.3], [0.25, 0.20, 0.55]]) {
  const r: any = runGrowthBackcast({ alpha: a, beta: b, gamma: g } as never);
  const m: number[] = r.gdpPath, o: number[] = r.gdpObserved, N = m.length;
  const rms = Math.sqrt(m.reduce((acc, x, i) => acc + Math.log(x / o[i]) ** 2, 0) / N);
  console.log(`| ${a} / ${b} / ${g} | ${f(a + b + g)} | ${f(cagr(m[0], m[N - 1], N - 1))} | ${f(cagr(o[0], o[N - 1], N - 1))} | ${f(rms, 3)} |`);
}

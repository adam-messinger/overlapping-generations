/**
 * Model-to-question adapter for the Tetlock ensemble (Demographics x AI, 2036).
 *
 * This script exists so a forecasting panelist can read CONDITIONAL STRUCTURAL
 * BOUNDS off this repository's simulation without smuggling in an unidentified
 * translation. It deliberately refuses to emit a number for questions the model
 * cannot represent.
 *
 * The discipline is `packages/forecast-workbench`'s own: keep the model run
 * separate from the model-to-question adapter, and refuse an identified
 * probability when the translation is not identified.
 *
 * Usage:
 *   npx tsx scripts/tetlock-sim-adapter.ts                 # human-readable table
 *   npx tsx scripts/tetlock-sim-adapter.ts --json          # machine payload
 *   npx tsx scripts/tetlock-sim-adapter.ts --scenarios=baseline,ai-energy-boom
 */
import { runSimulation, type MacroYearResult } from '../src/simulation.js';
import { loadScenario, scenarioToParams, getScenarioPath } from '../src/scenario.js';
import { REGIONS, type Region } from '../src/domain-types.js';
import type { SimulationParams } from '../src/simulation.js';
import type { DeepPartial } from '../src/primitives/deep-merge.js';

/** CQ3 window: Jan 1 2032 - Dec 31 2036 = growth during the five years 2032..2036. */
const W_START = 2032;
const W_END = 2036;
const BASE_YEAR = W_START - 1; // 2031 year-end level is the base of a 5-year CAGR

/**
 * "OECD-38 + China" has no exact counterpart in the model's nine regions.
 * us + oecd-ex-us + china is the closest available proxy and is what this
 * adapter reports. The gap is disclosed, not silently absorbed.
 */
const OECD_PROXY: Region[] = ['us', 'oecd-ex-us'];
const CHINA: Region[] = ['china'];

const DISCLOSURES = [
  'IDENTIFIED (growth only): the model is PPP-based (demand.ts: "PPP, 2017 international dollars", world ~$158T). ' +
    'Its deflator base year is 2017, not the brief\'s constant-2025-USD-PPP lock. CQ3 asks for a GROWTH RATE, ' +
    'which is invariant to the deflator base, so the translation is identified. A LEVEL question would NOT be.',
  'COVERAGE GAP: "OECD-38 + China" is proxied by us + oecd-ex-us + china. The model\'s nine regions place ' +
    'Korea, Japan and Turkiye in seasia/mena and Mexico, Chile, Colombia and Costa Rica in latam, so several ' +
    'real OECD-38 members sit outside the proxy and some non-OECD states sit inside oecd-ex-us. ' +
    'Treat the growth figure as an OECD-core + China aggregate, not as the OECD-38 + China aggregate.',
  'PRIOR CONFLICT: CLAUDE.md records that the model\'s demographic path tracks the UN WPP LOW variant ' +
    '(~18% below the medium variant by 2100) by deliberate low-fertility-convergence choice. That biases the ' +
    'model\'s labour force, and therefore its growth, DOWNWARD relative to the brief\'s locked Section 2A ' +
    'baseline. Any CQ3 bound read off this model is a LOW-FERTILITY-CONDITIONAL bound.',
  'NOT IDENTIFIED (CQ4): capital.interestRate is an economy-wide REAL interest rate. The model has no 10-year ' +
    'sovereign benchmark, no term premium (no termPremium anywhere in src/), and no inflation swap or breakeven. ' +
    'It therefore CANNOT produce the G7 GDP-weighted 10y sovereign real yield CQ4 asks for. The rate and ' +
    'debtRiskPremium below are reported as DIRECTIONAL context only and must not be used as a CQ4 point estimate.',
  'NOT REPRESENTABLE (CQ1, CQ2, CQ5): src/modules/ contains no unemployment, no ISIC sector split, no sectoral ' +
    'median wage, no price level, no CPI/PCE, no asset prices and no volatility index. The model is entirely ' +
    'real. Do not derive any CQ1, CQ2 or CQ5 number from it.',
  'PARTIAL (CQ6): only the GROWTH leg of the regime definitions is modellable via CQ3. The >=2.7% and <2.0% ' +
    'core-inflation conditions are not representable, so the model can discriminate A-vs-not-A on growth and ' +
    'speak to D\'s growth leg, but cannot place mass between C and D.',
  'GLOBAL vs REGIONAL: dataCenterLoadTWh and robotsPer1000 are WORLD aggregates in this model, while the ' +
    'brief\'s AI-Q3 prior is an OECD-38 + China figure. The model number is therefore an UPPER bound on the ' +
    'AI-Q3 quantity, not a like-for-like comparison.',
];

function cagr(from: number, to: number, years: number): number {
  if (from <= 0 || to <= 0) return NaN;
  return (Math.pow(to / from, 1 / years) - 1) * 100;
}

function sumRegions(yr: MacroYearResult, regions: Region[]): number {
  return regions.reduce((acc, r) => acc + (yr.regionalGdp[r] ?? 0), 0);
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

interface ScenarioReading {
  scenario: string;
  cq3_coupled_growth_pct: number;
  oecd_proxy_growth_pct: number;
  china_growth_pct: number;
  ppp_weight_oecd_proxy_2031: number;
  ppp_weight_china_2031: number;
  china_growth_contribution_pp: number;
  directional_only_real_interest_rate_avg_pct: number;
  directional_only_debt_risk_premium_avg_pp: number;
  world_datacenter_TWh_2036: number;
  world_robots_per_1000_2036: number;
  temperature_2036_C: number;
}

function read(label: string, overrides: DeepPartial<SimulationParams>): ScenarioReading {
  const result = runSimulation(overrides as SimulationParams, {
    diagnostics: false,
    connectorValidation: 'off',
    paramLiveness: 'off',
  });
  const byYear = new Map<number, MacroYearResult>();
  for (const yr of result.results) byYear.set(yr.year, yr);

  const base = byYear.get(BASE_YEAR);
  const end = byYear.get(W_END);
  if (!base || !end) throw new Error(`${label}: missing ${BASE_YEAR} or ${W_END} in results`);

  const span = W_END - BASE_YEAR; // 5
  const coupled = (yr: MacroYearResult) => sumRegions(yr, [...OECD_PROXY, ...CHINA]);

  const window: MacroYearResult[] = [];
  for (let y = W_START; y <= W_END; y++) {
    const yr = byYear.get(y);
    if (yr) window.push(yr);
  }

  const oecdBase = sumRegions(base, OECD_PROXY);
  const chinaBase = sumRegions(base, CHINA);
  const coupledBase = oecdBase + chinaBase;
  const wOecd = oecdBase / coupledBase;
  const wChina = chinaBase / coupledBase;
  const chinaGrowth = cagr(chinaBase, sumRegions(end, CHINA), span);

  return {
    scenario: label,
    cq3_coupled_growth_pct: cagr(coupledBase, coupled(end), span),
    oecd_proxy_growth_pct: cagr(oecdBase, sumRegions(end, OECD_PROXY), span),
    china_growth_pct: chinaGrowth,
    ppp_weight_oecd_proxy_2031: wOecd,
    ppp_weight_china_2031: wChina,
    china_growth_contribution_pp: wChina * chinaGrowth,
    directional_only_real_interest_rate_avg_pct: mean(window.map((y) => y.interestRate)) * 100,
    directional_only_debt_risk_premium_avg_pp: mean(window.map((y) => y.debtRiskPremium)) * 100,
    world_datacenter_TWh_2036: end.dataCenterLoadTWh,
    world_robots_per_1000_2036: end.robotsPer1000,
    temperature_2036_C: end.temperature,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const arg = argv.find((a) => a.startsWith('--scenarios='));
  const names = arg
    ? arg.slice('--scenarios='.length).split(',').map((s) => s.trim()).filter(Boolean)
    : ['baseline', 'central-path', 'ai-energy-boom', 'tech-stagnation', 'tech-breakthrough', 'automation-boom'];

  const readings: ScenarioReading[] = [];
  const failures: string[] = [];
  for (const name of names) {
    try {
      const scenario = await loadScenario(getScenarioPath(name));
      readings.push(read(name, scenarioToParams(scenario) as DeepPartial<SimulationParams>));
    } catch (err) {
      failures.push(`${name}: ${(err as Error).message}`);
    }
  }

  const payload = {
    purpose: 'Conditional structural bounds for CQ3 (and directional context for CQ4) only.',
    window: { start: W_START, end: W_END, basis: `(GDP_${W_END}/GDP_${BASE_YEAR})^(1/${W_END - BASE_YEAR}) - 1` },
    region_proxy: { oecd_38_proxied_by: OECD_PROXY, china: CHINA, model_regions: REGIONS },
    adapter_disclosures: DISCLOSURES,
    refusals: {
      CQ1: 'not representable - no unemployment, no ISIC sectors, no sectoral median wage',
      CQ2: 'not representable - the model has no price level',
      CQ4: 'not identified - economy-wide real rate is not a 10y sovereign real yield; no term premium',
      CQ5: 'not representable - no asset prices, no volatility index',
    },
    readings,
    failures,
  };

  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('\nTetlock sim adapter - CONDITIONAL BOUNDS ONLY (see disclosures)\n');
  console.log(`CQ3 window ${W_START}-${W_END}, basis ${payload.window.basis}`);
  console.log(`OECD-38 proxied by: ${OECD_PROXY.join(' + ')} (+ china). Coverage gap disclosed.\n`);
  console.log(
    'scenario            | CQ3 cpld | OECD px | China  | w_China | China ctrb | r (dir.) | DC TWh | rob/1k'
  );
  console.log(
    '--------------------|----------|---------|--------|---------|------------|----------|--------|-------'
  );
  for (const r of readings) {
    console.log(
      `${r.scenario.padEnd(19)} | ${r.cq3_coupled_growth_pct.toFixed(2).padStart(8)} | ` +
        `${r.oecd_proxy_growth_pct.toFixed(2).padStart(7)} | ${r.china_growth_pct.toFixed(2).padStart(6)} | ` +
        `${r.ppp_weight_china_2031.toFixed(3).padStart(7)} | ${r.china_growth_contribution_pp.toFixed(2).padStart(10)} | ` +
        `${r.directional_only_real_interest_rate_avg_pct.toFixed(2).padStart(8)} | ` +
        `${r.world_datacenter_TWh_2036.toFixed(0).padStart(6)} | ${r.world_robots_per_1000_2036.toFixed(1).padStart(6)}`
    );
  }
  if (failures.length) {
    console.log('\nFAILED SCENARIOS:');
    for (const f of failures) console.log('  -', f);
  }
  console.log('\nREFUSALS (do not derive these from the model):');
  for (const [k, v] of Object.entries(payload.refusals)) console.log(`  ${k}: ${v}`);
  console.log('\nDISCLOSURES:');
  for (const d of DISCLOSURES) console.log(`  * ${d}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

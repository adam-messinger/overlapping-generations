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
 * Two modes:
 *
 * 1. Legacy (no --spec): the original Demographics x AI 2036 panel - CQ3
 *    coupled growth, CQ4 directional context, everything else refused.
 * 2. Spec (--spec=<file.json>): any panel. The spec maps each question to a model
 *    field, regions, transform and an explicit status:
 *      identified  - the translation is exact; the number may be quoted
 *      directional - a related model quantity; context only, never a point estimate
 *      refused     - the model cannot represent it; no number is produced
 *    plus the named scenarios and/or lever variants to read. Model-wide
 *    disclosures (PPP base year, UN-WPP-low demography, fixed labour share, no
 *    trade block, no price level, the rate is not a policy/market rate) are
 *    appended automatically so no spec can forget them.
 *
 * Usage:
 *   npx tsx scripts/tetlock-sim-adapter.ts                 # legacy, human-readable
 *   npx tsx scripts/tetlock-sim-adapter.ts --json          # legacy, machine payload
 *   npx tsx scripts/tetlock-sim-adapter.ts --scenarios=baseline,ai-energy-boom
 *   npx tsx scripts/tetlock-sim-adapter.ts --spec=docs/forecasts/<panel>/adapter-spec.json --json
 *
 * Spec format (see .claude/skills/tetlock-ensemble-forecasting/references/adapter-spec.md):
 *   {
 *     "title": "...",
 *     "scenarios": ["baseline", "net-zero"],              // named scenario files
 *     "variants": { "ai-boom": { "demand": { ... } } },   // param overrides (optional)
 *     "disclosures": ["panel-specific caveat", ...],
 *     "questions": [
 *       { "id": "q3", "status": "identified", "note": "...",
 *         "readings": [ { "label": "...", "field": "regionalGdp",
 *                         "regions": ["us","oecd-ex-us","china"], "regionAgg": "sum",
 *                         "transform": "cagr", "from": 2031, "to": 2036, "scale": 1 } ] },
 *       { "id": "q1", "status": "refused", "reason": "no trade block" }
 *     ]
 *   }
 *   transforms: level (at `year`), mean (over from..to), delta (to - from),
 *               cagr (% per year, from -> to), ratio (field over `denominator`
 *               regions or `denominatorField`, at `year`), share (regions over all regions, at `year`)
 */
import { runSimulation, type MacroYearResult } from '../src/simulation.js';
import { loadScenario, scenarioToParams, getScenarioPath } from '../src/scenario.js';
import { REGIONS, type Region } from '../src/domain-types.js';
import type { SimulationParams } from '../src/simulation.js';
import type { DeepPartial } from '../src/primitives/deep-merge.js';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

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
  'NOT IDENTIFIED (CQ4): capital.safeRate is the model\'s REAL rate on public debt (~1% in 2025, tracking trend ' +
    'growth and public debt). The model has no 10-year ' +
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
  directional_only_real_safe_rate_avg_pct: number;
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
    directional_only_real_safe_rate_avg_pct: mean(window.map((y) => y.safeRate)) * 100,
    directional_only_debt_risk_premium_avg_pp: mean(window.map((y) => y.debtRiskPremium)) * 100,
    world_datacenter_TWh_2036: end.dataCenterLoadTWh,
    world_robots_per_1000_2036: end.robotsPer1000,
    temperature_2036_C: end.temperature,
  };
}


// ---------------------------------------------------------------- spec mode

/** Facts about this model that hold for EVERY panel. A spec cannot omit them. */
const MODEL_DISCLOSURES = [
  'PPP BASE: regional and world GDP are PPP in 2017 international dollars (world ~$158T in 2025). Growth rates ' +
    'and ratios are invariant to the deflator base; LEVELS are not comparable to market-exchange-rate or ' +
    'nominal-USD figures. A nominal-USD level question is NOT identified.',
  'DEMOGRAPHY: the default fertility path follows Fernandez-Villaverde & Norrick (2026): world peak ~9.0B in 2054, ' +
    '2100 ~7.5B (UN WPP Medium: 10.29B in 2084), a deliberate low-fertility choice (CLAUDE.md). Labour-force, ' +
    'dependency and growth readings are conditional on it; scenarios/un-wpp-medium.json gives the UN Medium view.',
  'RATES: three real rates. capital.interestRate is the return on capital plus the debt premium (~6% in 2025, ' +
    'firms\' cost of capital); capital.safeRate (~1%) is paid on public debt and capital.loanRate (~3%) on ' +
    'private bank debt. The safe rate follows trend growth and public debt (Holston-Laubach-Williams; Laubach ' +
    '2009) and can be held down by financial repression (repressionGap). It is not a policy rate or a market ' +
    'yield. There is no term premium. Use CHANGES, never the level.',
  'NO TRADE BLOCK: the macro model has no bilateral trade, tariffs, exchange rates or current accounts. ' +
    'Trade-volume and trade-composition questions are not representable; fossil-fuel CONSUMPTION is.',
  'NO PRICE LEVEL: no CPI/PCE, no nominal anything, no asset prices. Nominal-GDP and inflation questions are ' +
    'not representable.',
  'FIXED FACTOR SHARES: laborCompensation/GDP stays ~65.5% across all lever settings, so the model cannot ' +
    'speak to AI eroding the labour tax base. Extreme labour substitution breaks the stock-flow ledger.',
  'FISCAL: public debt follows an exogenous structural primary deficit (capital.publicDeficitRate); interest ' +
    'is tax-financed by construction. It is a world aggregate, not a US or any single-sovereign fiscal path.',
];

type Transform = 'level' | 'mean' | 'delta' | 'cagr' | 'ratio' | 'share';

interface ReadingSpec {
  label?: string;
  field: string;
  regions?: Region[];
  regionAgg?: 'sum' | 'mean';
  transform: Transform;
  year?: number;
  from?: number;
  to?: number;
  denominator?: Region[];
  denominatorField?: string;
  scale?: number;
}

interface QuestionSpec {
  id: string;
  status: 'identified' | 'directional' | 'refused';
  label?: string;
  note?: string;
  reason?: string;
  readings?: ReadingSpec[];
}

export interface AdapterSpec {
  title?: string;
  scenarios?: string[];
  variants?: Record<string, DeepPartial<SimulationParams>>;
  disclosures?: string[];
  questions: QuestionSpec[];
}

/** Validate a spec up front; a bad spec is an error, never a silent refusal. */
export function specErrors(spec: AdapterSpec): string[] {
  const errs: string[] = [];
  if (!Array.isArray(spec.questions) || spec.questions.length === 0) errs.push('spec declares no questions');
  if (!(spec.scenarios?.length || Object.keys(spec.variants ?? {}).length)) {
    errs.push('spec declares no scenarios or variants to read');
  }
  const transforms: Transform[] = ['level', 'mean', 'delta', 'cagr', 'ratio', 'share'];
  for (const q of spec.questions ?? []) {
    if (!['identified', 'directional', 'refused'].includes(q.status)) {
      errs.push(`${q.id}: status must be identified | directional | refused`);
    }
    if (q.status === 'refused') {
      if (!q.reason) errs.push(`${q.id}: a refusal must give its reason`);
      if (q.readings?.length) errs.push(`${q.id}: a refused question must not carry readings`);
      continue;
    }
    if (!q.readings?.length) errs.push(`${q.id}: ${q.status} question has no readings`);
    for (const r of q.readings ?? []) {
      const tag = `${q.id}/${r.label ?? r.field}`;
      if (!transforms.includes(r.transform)) errs.push(`${tag}: unknown transform '${r.transform}'`);
      for (const reg of [...(r.regions ?? []), ...(r.denominator ?? [])]) {
        if (!REGIONS.includes(reg)) errs.push(`${tag}: unknown region '${reg}'`);
      }
      const needsYear = r.transform === 'level' || r.transform === 'ratio' || r.transform === 'share';
      if (needsYear && r.year === undefined) errs.push(`${tag}: '${r.transform}' needs 'year'`);
      if (!needsYear && (r.from === undefined || r.to === undefined)) {
        errs.push(`${tag}: '${r.transform}' needs 'from' and 'to'`);
      }
      if (r.transform === 'share' && !r.regions?.length) errs.push(`${tag}: 'share' needs 'regions'`);
      if (r.transform === 'ratio' && !r.denominator?.length && !r.denominatorField) {
        errs.push(`${tag}: 'ratio' needs 'denominator' regions or 'denominatorField'`);
      }
    }
  }
  return errs;
}

/** Read one numeric field from a year, summing or averaging regions when the
 *  field is a per-region record. Throws when the field is absent or not numeric,
 *  so a typo in a spec cannot become a silent zero. */
function fieldValue(yr: MacroYearResult, field: string, regions?: Region[], agg: 'sum' | 'mean' = 'sum'): number {
  const raw = (yr as unknown as Record<string, unknown>)[field];
  if (typeof raw === 'number') {
    if (regions?.length) throw new Error(`field '${field}' is a world scalar; it takes no regions`);
    return raw;
  }
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>;
    const regs = regions?.length ? regions : (REGIONS as readonly Region[]).filter((r) => r in rec);
    const vals = regs.map((r) => {
      const v = rec[r];
      if (typeof v !== 'number') throw new Error(`field '${field}' has no numeric value for region '${r}'`);
      return v;
    });
    const total = vals.reduce((a, b) => a + b, 0);
    return agg === 'mean' ? total / vals.length : total;
  }
  throw new Error(`field '${field}' is not a numeric output (see describeOutputs())`);
}

function evalReading(byYear: Map<number, MacroYearResult>, r: ReadingSpec): number {
  const at = (y: number | undefined) => {
    const yr = y === undefined ? undefined : byYear.get(y);
    if (!yr) throw new Error(`year ${y} not in results`);
    return yr;
  };
  const v = (y: number | undefined, regions = r.regions) => fieldValue(at(y), r.field, regions, r.regionAgg);
  const scale = r.scale ?? 1;
  switch (r.transform) {
    case 'level':
      return v(r.year) * scale;
    case 'delta':
      return (v(r.to) - v(r.from)) * scale;
    case 'cagr':
      return cagr(v(r.from), v(r.to), (r.to as number) - (r.from as number)) * scale;
    case 'mean': {
      const xs: number[] = [];
      for (let y = r.from as number; y <= (r.to as number); y++) xs.push(v(y));
      return mean(xs) * scale;
    }
    case 'ratio': {
      const den = r.denominatorField
        ? fieldValue(at(r.year), r.denominatorField, r.denominator, r.regionAgg)
        : v(r.year, r.denominator);
      return (v(r.year) / den) * scale;
    }
    case 'share':
      return (v(r.year) / fieldValue(at(r.year), r.field, undefined, 'sum')) * scale;
  }
}

interface SpecReading {
  run: string;
  question: string;
  status: 'identified' | 'directional';
  label: string;
  value: number | null;
  error?: string;
}

export async function runSpec(spec: AdapterSpec) {
  const errs = specErrors(spec);
  if (errs.length) throw new Error(`invalid adapter spec:\n  - ${errs.join('\n  - ')}`);

  const runs: { name: string; params: DeepPartial<SimulationParams> }[] = [];
  const failures: string[] = [];
  for (const name of spec.scenarios ?? []) {
    try {
      runs.push({ name, params: scenarioToParams(await loadScenario(getScenarioPath(name))) as DeepPartial<SimulationParams> });
    } catch (err) {
      failures.push(`${name}: ${(err as Error).message}`);
    }
  }
  for (const [name, params] of Object.entries(spec.variants ?? {})) runs.push({ name, params });

  const readings: SpecReading[] = [];
  for (const run of runs) {
    let byYear: Map<number, MacroYearResult>;
    try {
      const result = runSimulation(run.params as SimulationParams, {
        diagnostics: false, connectorValidation: 'off', paramLiveness: 'off',
      });
      byYear = new Map(result.results.map((yr) => [yr.year, yr]));
    } catch (err) {
      failures.push(`${run.name}: ${(err as Error).message}`);
      continue;
    }
    for (const q of spec.questions) {
      if (q.status === 'refused') continue;
      for (const r of q.readings ?? []) {
        const label = r.label ?? `${r.field} ${r.transform}`;
        try {
          readings.push({ run: run.name, question: q.id, status: q.status, label, value: evalReading(byYear, r) });
        } catch (err) {
          readings.push({ run: run.name, question: q.id, status: q.status, label, value: null, error: (err as Error).message });
        }
      }
    }
  }

  return {
    purpose: `${spec.title ?? 'Tetlock panel'}: conditional structural bounds only. ` +
      'identified = quotable conditional on the run; directional = context, never a point estimate.',
    adapter_disclosures: [...MODEL_DISCLOSURES, ...(spec.disclosures ?? [])],
    questions: spec.questions.map((q) => ({
      id: q.id, label: q.label, status: q.status,
      ...(q.status === 'refused' ? { refusal: q.reason } : { note: q.note }),
    })),
    refusals: Object.fromEntries(spec.questions.filter((q) => q.status === 'refused').map((q) => [q.id, q.reason])),
    runs: runs.map((r) => r.name),
    readings,
    failures,
  };
}

function printSpecPayload(payload: Awaited<ReturnType<typeof runSpec>>) {
  console.log(`\n${payload.purpose}\n`);
  const qids = [...new Set(payload.readings.map((r) => `${r.question}|${r.label}|${r.status}`))];
  for (const key of qids) {
    const [qid, label, status] = key.split('|');
    console.log(`${qid} [${status.toUpperCase()}] ${label}`);
    for (const r of payload.readings.filter((x) => x.question === qid && x.label === label)) {
      const val = r.value === null ? `ERROR ${r.error}` : r.value.toFixed(3);
      console.log(`    ${r.run.padEnd(24)} ${val}`);
    }
  }
  if (payload.failures.length) {
    console.log('\nFAILED RUNS:');
    for (const f of payload.failures) console.log('  -', f);
  }
  console.log('\nREFUSALS (do not derive these from the model):');
  for (const [k, v] of Object.entries(payload.refusals)) console.log(`  ${k}: ${v}`);
  console.log('\nDISCLOSURES:');
  for (const d of payload.adapter_disclosures) console.log(`  * ${d}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const specArg = argv.find((a) => a.startsWith('--spec='));
  if (specArg) {
    const spec = JSON.parse(await readFile(specArg.slice('--spec='.length), 'utf8')) as AdapterSpec;
    const payload = await runSpec(spec);
    if (asJson) console.log(JSON.stringify(payload, null, 2));
    else printSpecPayload(payload);
    return;
  }
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

// Run only when executed directly, so tests can import runSpec/specErrors.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

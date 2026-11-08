/**
 * Feedback ablation: which mechanisms actually move the model?
 *
 * Two kinds of ablation, each run against a set of scenarios:
 *
 *  - freeze: hold one cross-module input at its converged 2025 value for
 *    every later year. The receiving module still runs; only the feedback's
 *    VARIATION is removed. A zero result means the input is constant on every
 *    path (the mechanism never binds), a small one means it varies without
 *    mattering. Freezing a growing flow at its 2025 level also removes its
 *    growth, so a large result is not by itself a sign of an interesting
 *    feedback.
 *  - param: set a mechanism's own parameter to its neutral value (0, or a
 *    threshold out of reach).
 *
 * The table reports the largest absolute change across the scenarios.
 * Freeze runs turn the engine's invariant checks off (a frozen input can
 * legitimately break a ledger the module closes against it); base and
 * parameter runs keep them, so a neutral setting that breaks a ledger shows
 * up as an error row. Written for docs/MODEL_REVIEW_2026-11.md.
 *
 * Known limitation: freezing patches each module's step, which cannot tell
 * the start-year warm-up from the run proper. Trend-seeded lags step year 1
 * during the warm-up, so a frozen input also shapes the frozen run's own 2025
 * seed (it is then consistent with the frozen model, not with the base
 * run). A framework input-override hook that skipped the warm-up would remove
 * this.
 *
 * Usage:
 *   npx tsx scripts/feedback-ablation.ts
 *   npx tsx scripts/feedback-ablation.ts --mode=freeze --scenarios=default,net-zero
 *   npx tsx scripts/feedback-ablation.ts --mode=param --json
 */

import { ALL_MODULES } from '../src/simulation-autowired.js';
import { runSimulation, type SimulationParams } from '../src/simulation.js';
import { deepMerge, loadScenarioParamsSync } from '../src/scenario.js';
import type { DeepPartial } from '../src/primitives/deep-merge.js';
import type { MacroSimulationResult, MacroYearResult, RunOptions } from '../src/index.js';
import { REGIONS, type Region } from '../src/domain-types.js';
import { arg } from './report-format.js';

const DEFAULT_SCENARIOS = [
  'default', 'net-zero', 'climate-cascade', 'ssp5-85', 'ssp3-70',
  'ai-energy-boom', 'tech-stagnation', 'debt-populism', 'ssp1-19',
];

/** Cross-module inputs to freeze, as `module.input` keys, grouped by mechanism. */
const FREEZE_ABLATIONS: Record<string, string[]> = {
  'climate damages -> production': ['production.damages'],
  'climate damages -> demand (regional shares)': ['demand.regionalDamages'],
  'climate damages -> capital (stability)': ['capital.damages'],
  'energy-burden damage -> production': ['production.energyBurdenDamage'],
  'food stress -> production': ['production.foodStress'],
  'resource energy -> production': ['production.resourceEnergy'],
  'energy-system overhead -> production': ['production.energySystemOverhead'],
  'CDR energy -> production + demand': ['production.cdrEnergy', 'demand.cdrEnergy'],
  'college share -> production (org. efficiency)': ['production.collegeShare'],
  'robots + datacenters -> production': [
    'production.robotsPer1000', 'production.robotLoadTWh', 'production.dataCenterLoadTWh',
  ],
  'LCOE -> demand (electrification)': ['demand.laggedAvgLCOE'],
  'return on capital -> demand (robots)': ['demand.laggedInterestRate'],
  'labor share -> demand (robots)': ['demand.laggedLaborShare'],
  'regional burden + reliability -> demand': [
    'demand.regionalEnergyBurden', 'demand.regionalReliabilityFactor',
  ],
  'net energy factor -> capital': ['capital.netEnergyFactor'],
  'automation labor share -> capital': ['capital.automationLaborShare'],
  'life expectancy -> capital (retirement age)': ['capital.regionalLifeExpectancy'],
  'financing debits -> capital': [
    'capital.energyCapexSpend', 'capital.cdrSpend',
    'capital.robotCapexSpend', 'capital.dataCenterCapexSpend',
  ],
  'mineral constraint -> energy': ['energy.mineralConstraintBySource'],
  'curtailment -> energy': ['energy.laggedRegionalCurtailmentRate'],
  'shortfall -> energy': ['energy.laggedRegionalShortfallRate'],
  'idle fossil -> energy': ['energy.laggedRegionalGeneration'],
  'safe rate -> energy (WACC debt)': ['energy.laggedSafeRate'],
  'return on capital -> energy (WACC equity)': ['energy.laggedInterestRate'],
  'savings -> energy (home bias)': ['energy.savingsRate', 'energy.regionalSavings'],
  'regional investment -> energy (clean budget)': ['energy.regionalInvestment'],
  'non-electric fuels -> energy (depletion)': ['energy.fuels'],
  'temperature -> demographics (heat stress)': ['demographics.temperature'],
  'temperature -> resources (yields, water, land)': ['resources.temperature'],
  'temperature -> cdr (deployment)': ['cdr.temperature'],
  'GDP per capita -> climate (adaptation)': ['climate.regionalGdpPerCapita'],
  'GDP -> resources (minerals, food, land)': ['resources.gdp', 'resources.gdpPerCapita'],
};

const sameForAllRegions = (v: number) =>
  Object.fromEntries(REGIONS.map((r) => [r, v])) as Record<Region, number>;

/**
 * Within-module mechanisms switched to their neutral setting. Typed
 * DeepPartial (no casts) so a misspelled nested key fails to compile instead
 * of silently reading as "this mechanism does nothing".
 */
const PARAM_ABLATIONS: Record<string, DeepPartial<SimulationParams>> = {
  'capital.stabilityLambda = 0': { capital: { stabilityLambda: 0 } },
  'capital.bankRetentionSpeed = 0': { capital: { bankRetentionSpeed: 0 } },
  'capital.leverageAdjustmentSpeed = 0': { capital: { leverageAdjustmentSpeed: 0 } },
  'capital.debtRiskLambda = 0': { capital: { debtRiskLambda: 0 } },
  'capital.safeRateDebtSensitivity = 0': { capital: { safeRateDebtSensitivity: 0 } },
  'capital.repressionDebtThreshold = 10 (no repression)': { capital: { repressionDebtThreshold: 10 } },
  'capital.fiscalReactionCoeff = 0': { capital: { fiscalReactionCoeff: 0 } },
  'capital.ageingCostDeficitShare = 0': { capital: { ageingCostDeficitShare: 0 } },
  'capital savings demography response = 0': {
    capital: { savingsLifeExpSensitivity: 0, savingsDependencySensitivity: 0 },
  },
  'capital.savingsPremium = 0': { capital: { savingsPremium: sameForAllRegions(0) } },
  'capital.retirementAgeResponse = 0': { capital: { retirementAgeResponse: 0 } },
  'capital.creditSensitivity = 0': { capital: { creditSensitivity: 0 } },
  'capital.leverageDamping = 0': { capital: { leverageDamping: 0 } },
  'capital.automationIncomeToCapital = 0': { capital: { automationIncomeToCapital: 0 } },
  'production.foodStressElasticity = 0': { production: { foodStressElasticity: 0 } },
  'energy.financingHomeBias = 0': { energy: { financingHomeBias: 0 } },
  'energy.financingSpreadScale = 0': { energy: { financingSpreadScale: 0 } },
  'energy.curtailmentStorageBoost = 0': { energy: { curtailmentStorageBoost: 0 } },
  'energy.cleanShareFlex = 1': { energy: { cleanShareFlex: 1 } },
  'energy fossil depletion off': {
    energy: { sources: { gas: { recoverableResources: 1e12 }, coal: { recoverableResources: 1e12 } } },
  },
  'energy.longStorage.growthRate = 0': { energy: { longStorage: { growthRate: 0 } } },
  'energy site depletion off': { energy: { siteDepletion: { solarDepletion: 0, windDepletion: 0 } } },
  'demand.heavyIndustryGdpElasticity = 1': { demand: { fuelMix: { heavyIndustryGdpElasticity: 1 } } },
  'demand.dataCenterBaseGrowth = 0': { demand: { dataCenterBaseGrowth: 0 } },
  'climate tipping off (threshold 99)': { climate: { tippingThreshold: 99 } },
  'climate.adaptationRate = 0': { climate: { adaptation: { adaptationRate: 0 } } },
  'resources water yield sensitivity = 0': { resources: { water: { yieldSensitivity: 0 } } },
  'resources desertification off': {
    resources: { land: { desertificationRate: 0, desertificationClimateCoeff: 0 } },
  },
  'resources mining depletion exponent = 0': { resources: { mining: { depletionExponent: 0 } } },
  'demographics heat stress off (threshold 99)': { demographics: { heatStressThreshold: 99 } },
  'cdr.budgetFraction = 0 (no CDR)': { cdr: { budgetFraction: 0 } },
};

/**
 * The outputs compared, once. `change` is how a difference is expressed
 * (percent of the base level, absolute, or percentage points of a share);
 * `weight` scales it for the "does it matter" ranking (0.05 °C counts like 1%
 * of GDP, 2pp of debt/GDP like 1%).
 */
const METRICS: ReadonlyArray<{
  label: string;
  year: number;
  read: (row: MacroYearResult) => number;
  change: 'pct' | 'abs' | 'pp';
  weight: number;
}> = [
  { label: 'GDP 2050 %', year: 2050, read: (r) => r.gdp, change: 'pct', weight: 1 },
  { label: 'GDP 2100 %', year: 2100, read: (r) => r.gdp, change: 'pct', weight: 1 },
  { label: 'T 2100 °C', year: 2100, read: (r) => r.temperature, change: 'abs', weight: 20 },
  { label: 'cum CO2 %', year: 2100, read: (r) => r.cumulativeEmissions, change: 'pct', weight: 1 },
  { label: 'fossil 2050 pp', year: 2050, read: (r) => r.fossilShare, change: 'pp', weight: 1 },
  { label: 'elec 2100 %', year: 2100, read: (r) => r.electricityDemand, change: 'pct', weight: 1 },
  { label: 'pub debt pp', year: 2100, read: (r) => r.publicDebtGDP, change: 'pp', weight: 0.5 },
  { label: 'pop 2100 %', year: 2100, read: (r) => r.population, change: 'pct', weight: 1 },
];

function summarize(result: MacroSimulationResult): number[] {
  return METRICS.map(({ year, read }) => {
    const index = result.years.indexOf(year);
    if (index < 0) throw new Error(`Run did not reach ${year}`);
    return read(result.results[index]);
  });
}

function delta(base: number[], run: number[]): number[] {
  return METRICS.map(({ change }, i) => {
    if (change === 'pct') return (100 * (run[i] - base[i])) / Math.abs(base[i]);
    if (change === 'pp') return 100 * (run[i] - base[i]);
    return run[i] - base[i];
  });
}

// -----------------------------------------------------------------------------
// Input freezing: wrap each module's step; the wrapper is inert unless a freeze
// set is active. Installed by main(), so importing this file patches nothing.
// -----------------------------------------------------------------------------

type StepFn = (state: unknown, inputs: Record<string, unknown>, params: unknown, year: number, yearIndex: number) => unknown;

let recording = false;
let frozen: ReadonlySet<string> = new Set();
const recorded = new Map<string, unknown>();

function installFreezeHook() {
  const modules = ALL_MODULES as unknown as Array<{ name: string; inputs: readonly string[]; step: StepFn }>;
  const frozenKeys = new Set(Object.values(FREEZE_ABLATIONS).flat());

  // A frozen key that names no module input would be silently ignored and
  // read as "this mechanism does nothing": refuse it instead.
  const moduleInputs = new Set(modules.flatMap((m) => m.inputs.map((key) => `${m.name}.${key}`)));
  for (const [name, keys] of Object.entries(FREEZE_ABLATIONS)) {
    for (const key of keys) {
      if (!moduleInputs.has(key)) throw new Error(`Freeze ablation '${name}': ${key} is not a module input`);
    }
  }

  for (const m of modules) {
    const step = m.step;
    m.step = (state, inputs, params, year, yearIndex) => {
      // The bootstrap fixed point calls year 0 repeatedly; the last call holds
      // the converged value. Only inputs some ablation freezes are kept.
      if (recording && yearIndex === 0) {
        for (const key of m.inputs) {
          const id = `${m.name}.${key}`;
          if (frozenKeys.has(id)) recorded.set(id, structuredClone(inputs[key]));
        }
      }
      if (yearIndex >= 1 && frozen.size > 0) {
        let patched: Record<string, unknown> | undefined;
        for (const key of m.inputs) {
          const id = `${m.name}.${key}`;
          if (!frozen.has(id)) continue;
          if (!recorded.has(id)) throw new Error(`No recorded 2025 value for ${id}`);
          patched ??= { ...inputs };
          patched[key] = structuredClone(recorded.get(id));
        }
        if (patched) return step.call(m, state, patched, params, year, yearIndex);
      }
      return step.call(m, state, inputs, params, year, yearIndex);
    };
  }
}

// -----------------------------------------------------------------------------

const BASE_OPTIONS: RunOptions & { diagnostics: false } = {
  diagnostics: false,
  connectorValidation: 'off',
  paramLiveness: 'off',
};
const FREEZE_OPTIONS: RunOptions & { diagnostics: false } = { ...BASE_OPTIONS, invariants: 'off' };

function main() {
  installFreezeHook();
  const mode = arg('mode') ?? 'all';
  const scenarios = arg('scenarios')?.split(',') ?? DEFAULT_SCENARIOS;
  const json = process.argv.includes('--json');

  const maxAbs = new Map<string, number[]>();
  const errors = new Map<string, string[]>();
  const record = (name: string, d: number[]) => {
    const prev = maxAbs.get(name) ?? d.map(() => 0);
    maxAbs.set(name, prev.map((p, i) => (Math.abs(d[i]) >= Math.abs(p) ? d[i] : p)));
  };

  for (const scenario of scenarios) {
    const params: SimulationParams = scenario === 'default' ? {} : loadScenarioParamsSync(scenario);
    recording = true;
    recorded.clear();
    const base = summarize(runSimulation(params, BASE_OPTIONS));
    recording = false;

    const runs: Array<[string, () => MacroSimulationResult]> = [];
    if (mode !== 'param') {
      for (const [name, keys] of Object.entries(FREEZE_ABLATIONS)) {
        runs.push([`freeze: ${name}`, () => {
          frozen = new Set(keys);
          try { return runSimulation(params, FREEZE_OPTIONS); } finally { frozen = new Set(); }
        }]);
      }
    }
    if (mode !== 'freeze') {
      for (const [name, override] of Object.entries(PARAM_ABLATIONS)) {
        runs.push([`param: ${name}`, () => runSimulation(deepMerge(params, override), BASE_OPTIONS)]);
      }
    }
    for (const [name, run] of runs) {
      try {
        record(name, delta(base, summarize(run())));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.set(name, [...(errors.get(name) ?? []), `${scenario}: ${message.split('\n')[0]}`]);
      }
    }
    console.error(`done ${scenario}`);
  }

  const labelled = (d: number[]) => Object.fromEntries(METRICS.map(({ label }, i) => [label, d[i]]));
  if (json) {
    const table = Object.fromEntries([...maxAbs].map(([name, d]) => [name, labelled(d)]));
    console.log(JSON.stringify({ scenarios, maxAbs: table, errors: Object.fromEntries(errors) }, null, 2));
    return;
  }

  const score = (d: number[]) => Math.max(...d.map((v, i) => Math.abs(v) * METRICS[i].weight));
  const rows = [...maxAbs.entries()].sort((a, b) => score(a[1]) - score(b[1]));
  console.log(`Largest |change| across: ${scenarios.join(', ')}\n`);
  console.log('mechanism'.padEnd(64) + METRICS.map(({ label }) => label.padStart(15)).join(''));
  for (const [name, d] of rows) {
    console.log(name.padEnd(64) + d.map((v) => v.toFixed(2).padStart(15)).join(''));
  }
  for (const [name, list] of errors) console.log(`\nERROR ${name}:\n  ${list.join('\n  ')}`);
}

main();

/**
 * Simulation Integration Tests
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runSimulation } from './simulation.js';
import { runAutowiredFull, runAutowiredSimulation, ALL_MODULES, auditGlobalUnitContracts } from './simulation-autowired.js';
import {
  auditCollectorContracts,
  buildOutputRegistry,
  resolveKey,
  getOutputsAtYear,
} from 'tsimulation';
import { scenarioToParams } from './scenario.js';
import { standardCollectors } from './standard-collectors.js';
import { productionDefaults } from './modules/production.js';
import { gdpWeightedIntensityDecline, demandDefaults } from './modules/demand.js';
import { describeOutputs } from './introspection.js';
import { test, expect, printSummary } from './test-utils.js';

/** Load a scenario's params synchronously (the test framework's test() is sync). */
function loadScenarioParamsSync(name: string) {
  const path = join(dirname(fileURLToPath(import.meta.url)), `../scenarios/${name}.json`);
  return scenarioToParams(JSON.parse(readFileSync(path, 'utf-8')));
}

console.log('\n=== Simulation Integration Tests ===\n');

test('runSimulation respects startYear/endYear', () => {
  const result = runSimulation({ startYear: 2025, endYear: 2028 });
  expect(result.years[0]).toBe(2025);
  expect(result.years[result.years.length - 1]).toBe(2028);
  expect(result.years).toHaveLength(4);
  expect(result.results).toHaveLength(4);
});

test('scenarioToParams passes through startYear/endYear', () => {
  const params = scenarioToParams({
    name: 'Test Scenario',
    description: 'Start/end year passthrough',
    startYear: 2030,
    endYear: 2032,
  });

  expect(params.startYear).toBe(2030);
  expect(params.endYear).toBe(2032);
});

test('scenarioToParams warns on dead NESTED keys but not on valid Partial optionals', () => {
  const warnings: string[] = [];
  const orig = console.warn;
  console.warn = (m: string) => { warnings.push(m); };
  try {
    scenarioToParams({
      name: 'Nested key validation', description: '',
      // dead nested key (the sources.<x>.growthRate class) + a top-level typo
      energy: {
        sources: { solar: { growthRate: 0.3 } },
        carbonPriceTYPO: 1,
        // valid Partial optional absent from defaults — must NOT warn
        regional: { oecd: { maxGrowthRate: { solar: 0.1 } } },
      },
    } as never, { unknownKeys: 'warn' });
  } finally {
    console.warn = orig;
  }
  const joined = warnings.join('\n');
  expect(joined.includes('energy.sources.solar') && joined.includes('growthRate')).toBeTrue();
  expect(joined.includes('carbonPriceTYPO')).toBeTrue();
  expect(joined.includes('maxGrowthRate')).toBeFalse();  // valid optional, no false positive
});

test('scenarioToParams strict mode rejects unknown top-level and nested keys', () => {
  expect(() => scenarioToParams({
    name: 'Bad top level', description: '', typo: true,
  } as never, { unknownKeys: 'error' })).toThrow('Unrecognized scenario key "typo"');
  expect(() => scenarioToParams({
    name: 'Bad nested key', description: '', demand: { dataCenterBaseGrowt: 0.2 },
  } as never, { unknownKeys: 'error' })).toThrow('Unrecognized demand param "dataCenterBaseGrowt"');
});

test('2025 regional financing spreads reproduce the IEA-observed calibration', () => {
  // Total spread = static residual (energy defaults) + financingHomeBias ×
  // 2025 savings gap (capital outputs). The residuals were derived by hand
  // from the observed totals, so this pins the cross-module calibration:
  // changing capital's savings params or financingHomeBias without
  // re-deriving the residuals breaks this test rather than silently
  // decalibrating the spreads. See REGIONAL_FINANCING_SPREADS in energy.ts.
  const observed: Record<string, number> = {
    oecd: -0.010, china: -0.015, india: 0.020, latam: 0.030,
    seasia: 0.025, russia: 0.050, mena: 0.010, ssa: 0.060,
  };
  const result = runSimulation({ startYear: 2025, endYear: 2025 });
  const r = result.results[0];
  for (const [region, total] of Object.entries(observed)) {
    const actual = r.regionalWACC[region as keyof typeof r.regionalWACC] - r.effectiveWACC;
    expect(Math.abs(actual - total)).toBeLessThan(0.001);
  }
});

test('regional allocator anchors 2025 and does not collapse regions onto a share floor', () => {
  const result = runSimulation({ startYear: 2025, endYear: 2100 });
  const first = result.results[0];
  const last = result.results[result.results.length - 1];
  for (const region of Object.keys(demandDefaults.regions) as Array<keyof typeof demandDefaults.regions>) {
    expect(first.regionalGdp[region])
      .toBeCloseTo(demandDefaults.regions[region].gdp2025, 9);
  }
  const total = Object.values(last.regionalGdp).reduce((sum, value) => sum + value, 0);
  for (const value of Object.values(last.regionalGdp)) {
    expect(value / total).toBeGreaterThan(0.015);
  }
  expect(last.regionalGdp.china / total)
    .toBeGreaterThan(first.regionalGdp.china / 158);
});

// Shared default-params run for the two calibration-band tests below
// (deterministic model, so the 2035 slice is a strict prefix of this run)
const to2050 = runSimulation({ startYear: 2025, endYear: 2050 });

test('GDP is monotonic in efficiencyMultiplier (coupled efficiency series)', () => {
  // Demand decays energy at intensityDecline x efficiencyMultiplier; the
  // runner couples production's eta growth to the same effective rate. If
  // they decouple (the pre-fix bug, or a re-introduced hard eta ceiling),
  // higher efficiency DESTROYS GDP through E^gamma — a 3.6x non-monotone
  // artifact across the 8 scenarios that set the multiplier. Guard it.
  const gdp2100 = (m: number) =>
    runSimulation({ demand: { efficiencyMultiplier: m } }).results[75].gdp;
  // Sweep past 1.5 too: the removed eta ceiling used to relocate the collapse
  // cliff to multiplier ~1.8-2.5, so the range must extend beyond any scenario
  // value to catch a re-introduced cap.
  const multipliers = [0.7, 0.8, 1.0, 1.3, 1.6, 2.0];
  let prev = gdp2100(multipliers[0]);
  for (const m of multipliers.slice(1)) {
    const g = gdp2100(m);
    expect(g).toBeGreaterThan(prev);   // more efficiency -> more GDP, everywhere
    prev = g;
  }
});

test('production serviceEfficiencyGrowth equals demand GDP-weighted intensity decline', () => {
  // One efficiency series, two views: demand removes final energy at the
  // regional intensityDecline rates; production credits eta growth at
  // serviceEfficiencyGrowth. If these drift apart (e.g. an IEA
  // recalibration of regional intensityDecline without updating
  // production), the intensity-decline-as-GDP-destroyer bug returns.
  const derived = gdpWeightedIntensityDecline();
  expect(Math.abs(productionDefaults.serviceEfficiencyGrowth - derived)).toBeLessThan(5e-4);
});

test('production and demand share the same structural-decay shape', () => {
  // The forward structural decay must apply identically to demand's
  // intensity decline and production's eta growth, or the coupled series
  // re-split under efficiencyMultiplier and GDP collapses at the high end.
  expect(productionDefaults.structuralEfficiencyShare)
    .toBe(demandDefaults.structuralEfficiencyShare);
  expect(productionDefaults.structuralDecayHalfLife)
    .toBe(demandDefaults.structuralDecayHalfLife);
});

test('no initialization discontinuity: first simulated years are smooth', () => {
  // The lag warm-up (bootstrapLags) must hold: with hand-guessed lag
  // initials the model produced a spurious -5.5% global recession in 2026
  // (E0 anchored on potential rather than served generation, overhead
  // subtractions switching on after year 0). Guard against regressions:
  // year-over-year GDP change in the first three years stays in a band no
  // real global economy leaves in the absence of a shock.
  for (let i = 1; i <= 3; i++) {
    const growth = to2050.results[i].gdp / to2050.results[i - 1].gdp - 1;
    expect(growth).toBeGreaterThan(-0.01);
    expect(growth).toBeLessThan(0.04);
  }
});

test('baseline lag bootstrap reaches a measured fixed point', () => {
  const result = runAutowiredSimulation({ startYear: 2025, endYear: 2025 });
  const bootstrap = result.diagnostics?.bootstrap;
  expect(bootstrap?.enabled).toBeTrue();
  expect(bootstrap?.converged).toBeTrue();
  expect(bootstrap?.residual as number).toBeLessThan(1e-7 + 1e-12);
});

test('near-term observables stay in validation bands (2025-2030)', () => {
  // Slightly loosened versions of scripts/nearterm-validation.ts (the
  // report has the full 9-check set with sources). These four are the
  // load-bearing ones: they anchor the model's first five forward years
  // to IEA/Ember/GCB observables so recalibrations cannot silently drift
  // the near-term path away from the world again.
  const y25 = to2050.results[0];
  const y30 = to2050.results[5];
  expect(y25.totalGeneration / 1000).toBeBetween(28, 34);        // IEA ~31.5k TWh
  expect(y25.electricityEmissions + y25.nonElectricEmissions)
    .toBeBetween(34, 41);                                         // GCB ~37.4 Gt
  expect(y25.gridIntensity).toBeBetween(400, 520);               // Ember ~445-480
  expect(y30.transportElectrification).toBeBetween(0.02, 0.12);  // ~4-5% aggressive
});

test('2050 electricity generation lands in the IEA STEPS comparison band', () => {
  // IEA WEO 2024 STEPS: ~55-58k TWh global generation in 2050. After the
  // 2026 accounting reconciliation and 2025 re-initialization the model
  // lands near ~82k generation (~1.4x STEPS) — the model's endogenous path
  // has faster GDP growth and electrification than STEPS assumes. History
  // of this band: pre-2026 fixes the model produced ~245k (4.4x, an
  // accounting artifact); after the demand fixes ~48k (0.9x). The band is
  // deliberately wide: it pins order-of-magnitude agreement, catching a
  // regression to either the old inflation or a collapsed grid, and is on
  // the GENERATION basis matching IEA statistics.
  const y2050 = to2050.results[to2050.results.length - 1];
  expect(y2050.totalGeneration).toBeGreaterThan(40_000);
  expect(y2050.totalGeneration).toBeLessThan(110_000);
});

test('near-term electrification pace is fast but bounded', () => {
  // Historical check: world electrification of final energy rose ~13% (1990)
  // to ~20% (2023, IEA WEB) — ~0.22 pp/yr, fastest decade ~0.35 pp/yr. The
  // model runs ~1.9 pp/yr over 2025-2035, ~5x faster than any historical
  // decade, driven by the solar-storage cost crossover (which has no
  // historical precedent). This test documents and bounds that divergence:
  // the lower bound catches an accidentally-killed transition, the upper
  // bound catches runaway electrification beyond even the model's thesis.
  const first = to2050.results[0];
  const y2035 = to2050.results[10];
  const pacePerYear = (y2035.electrificationRate - first.electrificationRate) / 10;
  expect(pacePerYear).toBeGreaterThan(0.005);
  expect(pacePerYear).toBeLessThan(0.03);
});

test('ai-energy-boom raises the cost of capital materially', () => {
  // Heavy automation + energy + CDR competing for savings raises WACC well
  // above baseline. The improved regional allocator also makes the extreme
  // path hit the lagged funding-floor diagnostic late in the century (pinned
  // separately below), so this is no longer claimed to be its only bound.
  const boomParams = loadScenarioParamsSync('ai-energy-boom');
  const base = runSimulation();
  const boom = runSimulation(boomParams);
  const i2075 = 2075 - 2025;
  expect(boom.results[i2075].effectiveWACC)
    .toBeGreaterThan(base.results[i2075].effectiveWACC + 0.02);
});

test('cohort accounts reconcile to the next-year macro stocks', () => {
  const result = runSimulation({ startYear: 2025, endYear: 2026 });
  const first = result.results[0];
  const second = result.results[1];
  expect(Object.keys(first.cohortAccounts).length).toBeGreaterThan(0);
  expect(first.cohortAssets).toBeCloseTo(second.capitalStock, 6);
});

test('cohort constraint assumptions do not feed back into the macro path', () => {
  const tight = runSimulation({
    startYear: 2025,
    endYear: 2030,
    generations: { borrowingLimitIncomeMultiple: 0 },
  });
  const loose = runSimulation({
    startYear: 2025,
    endYear: 2030,
    generations: { borrowingLimitIncomeMultiple: 20 },
  });
  const tightFinal = tight.results[tight.results.length - 1];
  const looseFinal = loose.results[loose.results.length - 1];
  expect(tightFinal.gdp).toBeCloseTo(looseFinal.gdp, 8);
  expect(tightFinal.capitalStock).toBeCloseTo(looseFinal.capitalStock, 8);
  expect(tightFinal.cohortBorrowingLimitGap).toBeGreaterThan(
    looseFinal.cohortBorrowingLimitGap,
  );
});

// Baseline financing must reconcile. Explicit DC capex should also feed back
// into the deliberately extreme AI boom through the shared capital ledger,
// lowering the path relative to an otherwise identical free-DC-capex run.
test('baseline is fully funded and datacenter capex feeds back through the AI boom', () => {
  const boomParams = loadScenarioParamsSync('ai-energy-boom');
  const baseline = runAutowiredSimulation({});
  for (let i = 0; i < baseline.years.length; i++) {
    const o = getOutputsAtYear(baseline, i);
    expect(o.unfundedRealizedSpend as number).toBeLessThan(1e-9);
  }

  const boom = runAutowiredSimulation(boomParams);
  let maxGap = 0;
  for (let i = 0; i < boom.years.length; i++) {
    const o = getOutputsAtYear(boom, i);
    maxGap = Math.max(maxGap, o.unfundedRealizedSpend as number);
  }
  expect(maxGap).toBeLessThan(1e-9);

  const boomWithoutDcCapex = runAutowiredSimulation({
    ...boomParams,
    demand: {
      ...boomParams.demand,
      dataCenterCapitalCostPerGW: 0,
    },
  });
  const idx2050 = boom.years.indexOf(2050);
  const withDc = getOutputsAtYear(boom, idx2050);
  const withoutDc = getOutputsAtYear(boomWithoutDcCapex, idx2050);
  expect(withDc.dataCenterCapexSpend as number).toBeGreaterThan(0);
  expect(withDc.stock as number).toBeLessThan(withoutDc.stock as number);
  expect(withDc.gdp as number).toBeLessThan(withoutDc.gdp as number);
});

// Cross-check: describeOutputs matches standardCollectors
test('describeOutputs keys match standardCollectors keys', () => {
  const outputSchema = describeOutputs();
  const outputKeys = new Set(Object.keys(outputSchema));
  const collectorKeys = new Set(
    standardCollectors.timeseries
      .filter(d => d.description)
      .map(d => resolveKey(d))
  );
  collectorKeys.add('year'); // framework field

  const missingFromOutputs = [...collectorKeys].filter(k => !outputKeys.has(k));
  const extraInOutputs = [...outputKeys].filter(k => !collectorKeys.has(k));

  if (missingFromOutputs.length > 0) {
    throw new Error(
      `standardCollectors fields missing from describeOutputs: ${missingFromOutputs.join(', ')}`
    );
  }
  if (extraInOutputs.length > 0) {
    throw new Error(
      `describeOutputs fields not in standardCollectors: ${extraInOutputs.join(', ')}`
    );
  }
});

// Cross-check: every collector source is a real module output.
// Catches phantom outputs: collector entries whose source no module computes
// would silently collect undefined (and YearResult would report a constant).
test('standardCollectors sources exist in module outputs', () => {
  // Output name -> owning module, from the real wiring's module list
  const outputOwner = buildOutputRegistry(ALL_MODULES);

  const problems: string[] = [];
  for (const def of standardCollectors.timeseries) {
    if (def.transform) continue; // transform entries compute their own value
    const owner = outputOwner.get(def.source);
    if (!owner) {
      problems.push(`'${def.source}' is not produced by any module`);
    } else if (def.module && def.module !== owner) {
      problems.push(`'${def.source}' attributed to '${def.module}' but produced by '${owner}'`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`standardCollectors drift:\n${problems.join('\n')}`);
  }
});

test('standardCollectors derive and validate units against their producers', () => {
  const audit = auditCollectorContracts(ALL_MODULES, standardCollectors);
  if (!audit.valid) throw new Error(`Collector contract audit failed:\n${audit.errors.join('\n')}`);
  expect(audit.collectors).toBe(standardCollectors.timeseries.length);
  expect(audit.transformedCollectors).toBe(2);
});

test('global graph has complete, compatible unit contracts', () => {
  const audit = auditGlobalUnitContracts();
  if (!audit.valid) throw new Error(`Unit contract audit failed:\n${audit.errors.join('\n')}`);
  expect(audit.unitBearingContracts > 100).toBe(true);
  expect(audit.structuredContracts > 0).toBe(true);
  expect(audit.metadataContracts > 0).toBe(true);
  expect(audit.opaqueContracts).toBe(0);
});

// trackReads integration: run real simulation and check for undeclared reads
test('no undeclared transform reads in real simulation', () => {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args.map(a => String(a)).join(' ');
    warnings.push(msg);
  };

  try {
    runAutowiredSimulation({ startYear: 2025, endYear: 2027 }, { trackReads: true });
    const trackWarnings = warnings.filter(w => w.includes('[autowire]') && w.includes('reads'));
    if (trackWarnings.length > 0) {
      throw new Error(
        `Undeclared transform reads detected:\n${trackWarnings.join('\n')}`
      );
    }
  } finally {
    console.warn = origWarn;
  }
});

printSummary();

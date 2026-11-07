/**
 * Simulation Integration Tests
 */

import { energyDefaults } from './modules/energy.js';
import { capitalDefaults } from './modules/capital.js';
import { REGIONS } from './domain-types.js';
import { runSimulation, type SimulationParams } from './simulation.js';
import {
  runAutowiredSimulation,
  ALL_MODULES,
  MACRO_MODULES,
  DIAGNOSTIC_FIELDS,
  DIAGNOSTIC_MODULES,
  auditGlobalUnitContracts,
  START_YEAR_BOOTSTRAP,
} from './simulation-autowired.js';
import {
  auditCollectorContracts,
  resolveKey,
  getOutputsAtYear,
} from 'tsimulation';
import { loadScenarioParamsSync, scenarioToParams } from './scenario.js';
import { standardCollectors } from './standard-collectors.js';
import { productionDefaults } from './modules/production.js';
import { gdpWeightedIntensityDecline, demandDefaults } from './modules/demand.js';
import { describeOutputs, describeParameters, buildMultiParams } from './introspection.js';
import { STUDY_OPTIONS } from './ensemble-model.js';
import { test, expect, printSummary } from './test-utils.js';

/** Load a scenario's params synchronously (the test framework's test() is sync). */
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
        regional: { 'oecd-ex-us': { maxGrowthRate: { solar: 0.1 } } },
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

test('2025 regional financing spreads equal the observed IEA table by construction', () => {
  // The start-year savings gap is anchored in energy state, so the observed
  // totals in REGIONAL_FINANCING_SPREADS are reproduced exactly at yearIndex 0
  // whatever capital's savings calibration produces.
  const observed = energyDefaults.regional;
  const check = (params: SimulationParams) => {
    const r = runSimulation({ ...params, startYear: 2025, endYear: 2025 }).results[0];
    for (const region of REGIONS) {
      expect(r.regionalWACC[region] - r.effectiveWACC).toBeCloseTo(observed[region].financingSpread ?? 0, 9);
    }
  };
  check({});
  check({ capital: { savingsPremium: { ...capitalDefaults.savingsPremium, china: 0.30, us: 0.10 } } });
});

test('saving-propensity params run across their whole declared paramMeta range', () => {
  // Both used to throw 'additions must be finite and non-negative' inside
  // their declared ranges (savingsRateWorking <= ~0.24, savingsDependencySensitivity
  // >= ~0.9): the US premium (-0.10, additive) outran a shrinking base as the
  // US aged, its saving propensity went negative, and so did its investment
  // allocation and clean-energy budget. Read the bounds from the schema so a
  // paramMeta change stays covered.
  const schema = describeParameters();
  let floorBound = false;
  for (const name of ['savingsRateWorking', 'savingsDependencySensitivity']) {
    const meta = schema[name];
    for (const value of [meta.min, meta.max]) {
      expect(typeof value).toBe('number');
      const r = runSimulation(buildMultiParams({ [name]: value as number }) as SimulationParams, STUDY_OPTIONS);
      expect(r.results[r.results.length - 1].year).toBe(2100);
      expect(Number.isFinite(r.metrics.warming2100)).toBe(true);
      expect(Number.isFinite(r.metrics.gdp2100 ?? NaN)).toBe(true);
      for (const row of r.results) {
        for (const region of REGIONS) {
          expect(row.regionalSavings[region]).toBeBetween(0, 1);
          if (row.regionalSavings[region] === 0) floorBound = true;
        }
      }
    }
  }
  // Guard the test's relevance: the low end must still reach the zero floor,
  // or this no longer exercises the case that crashed
  expect(floorBound).toBe(true);
});

test('insolvent firms default rather than crash the run (sweep: ai-energy-boom, firmRetentionRate 0.1)', () => {
  // Late in this run interest due exceeds firms' operating surplus; once the
  // deposit buffer is gone this used to throw "Godley account
  // 'firms.deposits' cannot have a negative balance". Without the insolvency
  // write-down it instead collapsed GDP to zero under zombie debt by 2100.
  const scenario = loadScenarioParamsSync('ai-energy-boom') as SimulationParams;
  const r = runSimulation(
    { ...scenario, capital: { ...scenario.capital, firmRetentionRate: 0.1 } },
    STUDY_OPTIONS,
  );
  expect(r.results[r.results.length - 1].year).toBe(2100);
  // Since private debt pays the ~3% loan rate rather than the ~7% return on
  // capital, this sweep no longer reaches insolvency; the default mechanism
  // itself is pinned in capital.test.ts. If it binds, debt stays serviceable.
  const binding = r.results.filter(row => row.unpaidPrivateInterest > 0);
  for (const row of binding) expect(row.privateDebtGDP).toBeLessThan(3);
});

test('start-year fixed point: plain runs converge; an order-dependent build cycle is accepted, not faked', () => {
  // The start-year solve runs whatever the horizon, so one year suffices.
  // Plain scenarios must reach the fixed point outright: the cycle fallback
  // must not hide a regression there
  for (const params of [{}, loadScenarioParamsSync('ssp1-19')] as SimulationParams[]) {
    const bootstrap = runAutowiredSimulation({ ...params, endYear: 2025 }, STUDY_OPTIONS).diagnostics?.bootstrap;
    expect(bootstrap?.converged).toBe(true);
    expect(bootstrap?.acceptedCycle).toBe(undefined);
  }
  // The runner keeps a cycle band: energy's world build-capacity loop moves
  // the build discretely at a cap edge, which no damping removes.
  expect(START_YEAR_BOOTSTRAP.acceptCycleWithin).toBe(1e-3);
  expect(START_YEAR_BOOTSTRAP.onNonConvergence).toBe('throw');
  // The two sweep runs that threw "Lag bootstrap did not converge" must now
  // complete. Whether they land on the cap edge, and so cycle, depends on
  // float rounding (it differs between Node versions and moves with any model
  // change), so the test pins what must hold either way rather than which
  // happens: a run that did not converge reports a genuine accepted cycle
  // inside the band, never a silent pass. The acceptance mechanism itself is
  // pinned deterministically in packages/tsimulation/test/autowire.test.ts.
  const scenario = loadScenarioParamsSync('ssp1-19') as SimulationParams;
  const warn = console.warn;
  console.warn = () => {};
  try {
    for (const capital of [{ baseCreditGrowth: 0.01 }, { publicDeficitRate: 0.01 }]) {
      const bootstrap = runAutowiredSimulation(
        { ...scenario, capital: { ...scenario.capital, ...capital }, endYear: 2025 },
        STUDY_OPTIONS,
      ).diagnostics?.bootstrap;
      expect(bootstrap?.enabled).toBe(true);
      if (bootstrap?.converged) {
        expect(bootstrap.acceptedCycle).toBe(undefined);
      } else {
        expect(bootstrap!.acceptedCycle!.scaledResidual)
          .toBeLessThan(START_YEAR_BOOTSTRAP.acceptCycleWithin);
      }
    }
  } finally {
    console.warn = warn;
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
  // China's share falls from 20.9% (2025) to ~18% (2100) under the 2026
  // calibration: its catch-up residual converges on the OECD-ex-US floor while
  // its workforce shrinks faster than the world's. This is a guard against the
  // allocator collapsing it, not a forecast; the old assertion (share rises by
  // 2100) was an artifact of the ~46-yr catch-up half-life.
  expect(last.regionalGdp.china / total)
    .toBeGreaterThan(0.7 * first.regionalGdp.china / 158);
});

// Shared default-params run for the two calibration-band tests below
// (deterministic model, so the 2035 slice is a strict prefix of this run)
const to2050 = runSimulation({ startYear: 2025, endYear: 2050 });

/** Shared by every test below that needs the deterministic default run:
 *  recomputing it costs ~1s of CI time each. */
const FULL_RUN = runSimulation();

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

test('2025 primary mineral demand reproduces observed mine production', () => {
  // Calibration pin for the non-transition demand stream. `annualSupply2025` is
  // primary (mine-supplied) production and `demand` is total use net of
  // recycling, so the two must agree in the base year — that is what makes
  // every mineral's supply ratio start at exactly 1.0, and it is what lets the
  // model ask whether capacity growth can keep up with demand growth.
  //
  // Sources: copper 23.0 Mt and REO 0.39 Mt from USGS MCS 2026; steel 1,202 Mt
  // = worldsteel's 1,849.4 Mt crude less the ~35% scrap-fed EAF share.
  //
  // Lithium is deliberately excluded: ~85% of real lithium use is batteries and
  // the model's 2025 battery build is below the actual market, so it calibrates
  // to the transition build rather than to this stream (see resources.ts).
  const first = FULL_RUN.results[0];
  expect(first.year).toBe(2025);
  expect(first.copperDemand).toBeCloseTo(23.0, 1);
  expect(first.steelDemand / 1202).toBeCloseTo(1, 2);
  expect(first.rareEarthsDemand).toBeCloseTo(0.39, 2);
  expect(first.mineralConstraint).toBeCloseTo(1, 6);
});

test('copper binds the economy late in the century, not the build-out', () => {
  // Copper used to look dead: identically 1.0 in every year, because mining
  // capacity was seeded from total world output while demand counted only the
  // transition slice. With economy-wide demand it binds.
  const last = FULL_RUN.results[FULL_RUN.results.length - 1];
  expect(last.copperSupplyRatio).toBeLessThan(0.95);
  expect(last.copperSupplyRatio).toBeGreaterThan(0.1);
  // And extraction is capped by capacity, never by demand alone.
  expect(last.copperExtraction).toBeLessThan(last.copperDemand);
  // The transition is served first and the baseline takes the shortfall
  // (aluminium substitution), so on this path no mineral throttles clean
  // build: the transition's own claim stays within mine capacity.
  expect(last.mineralConstraint).toBeCloseTo(1, 6);
});

test('raising the global carbon price lowers warming', () => {
  // The global key fills every region's power-sector price. When it priced
  // end-use fuels only, $270 electrified demand onto unpriced coal and ended
  // ~0.1C WARMER than $30 (power CO2 2050 doubled to ~30 Gt).
  const fast = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;
  const low = runSimulation({ energy: { carbonPrice: 30 } }, fast);
  const high = runSimulation({ energy: { carbonPrice: 270 } }, fast);
  expect(high.metrics.warming2100!).toBeLessThan(low.metrics.warming2100! - 0.2);
  const i2050 = 2050 - 2025;
  expect(high.results[i2050].electricityEmissions)
    .toBeLessThan(low.results[i2050].electricityEmissions);
});

test('ai-energy-boom raises the cost of capital materially', () => {
  // Heavy automation + energy + CDR competing for savings raises WACC well
  // above baseline. The improved regional allocator also makes the extreme
  // path hit the lagged funding-floor diagnostic late in the century (pinned
  // separately below), so this is no longer claimed to be its only bound.
  const boomParams = loadScenarioParamsSync('ai-energy-boom');
  const base = FULL_RUN;
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

test('human-capital ledger is reported and its parameters do not feed back into the macro path', () => {
  const base = runSimulation({ startYear: 2025, endYear: 2030 });
  const costly = runSimulation({
    startYear: 2025,
    endYear: 2030,
    humanCapital: { rearingCostShare: 0.6, bands: { tertiary: { retirementAge: 50 } } },
  });
  const baseFinal = base.results[base.results.length - 1];
  const costlyFinal = costly.results[costly.results.length - 1];
  expect(costlyFinal.gdp).toBeCloseTo(baseFinal.gdp, 8);
  expect(costlyFinal.capitalStock).toBeCloseTo(baseFinal.capitalStock, 8);
  expect(costlyFinal.population).toBeCloseTo(baseFinal.population, 6);
  expect(costlyFinal.humanCapitalInvestment).toBeGreaterThan(baseFinal.humanCapitalInvestment);
  expect(costlyFinal.humanCapitalByBand.tertiary.usefulLife).toBeLessThan(
    baseFinal.humanCapitalByBand.tertiary.usefulLife,
  );

  // 2025 anchor: cost-based human-capital investment is on the order of a
  // tenth of GDP (Kendrick 1976; Abraham 2010 puts formal education alone at
  // 7-9% of US GDP), and the net stock is comparable to physical capital.
  const first = base.results[0];
  expect(first.humanCapitalInvestmentGdpShare).toBeBetween(0.06, 0.18);
  expect(first.humanCapitalNetStockToPhysical).toBeBetween(0.3, 1.5);
  const bandSum = (['primary', 'secondary', 'tertiary', 'advanced'] as const)
    .reduce((sum, band) => sum + first.humanCapitalByBand[band].investment, 0);
  expect(bandSum).toBeCloseTo(first.humanCapitalInvestment, 9);
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

// toYearResults casts collectResults' rows to YearResult[]. That cast is
// unchecked, so nothing links the 134-field interface to what is actually
// produced. Comparing key SETS would be circular (the rows are built from
// standardCollectors), so this checks the thing that is not circular: that
// every declared field actually carries a value. A collector whose path stops
// matching -- a renamed key inside a keyless record, say -- lands undefined
// here, in a field the interface types as number.
test('every YearResult field is populated in every year', () => {
  const result = runSimulation({ startYear: 2025, endYear: 2030 });
  const empty: string[] = [];
  for (const row of result.results) {
    for (const [key, value] of Object.entries(row)) {
      if (value === undefined || value === null) empty.push(`${key}@${row.year}`);
    }
  }
  if (empty.length > 0) {
    throw new Error(`YearResult fields with no value: ${empty.slice(0, 10).join(', ')}`);
  }
  expect(Object.keys(result.results[0]).length).toBe(standardCollectors.timeseries.length + 1);
});

// describeOutputs() is a filtered loop over standardCollectors, so comparing
// their key sets compares a thing to itself. What it cannot see is the filter:
// a collector with no description is silently dropped from the agent-facing
// schema (with only a console.warn). That is the failure worth catching.
test('every collector carries a description for describeOutputs', () => {
  const undescribed = standardCollectors.timeseries
    .filter(d => !d.description)
    .map(d => resolveKey(d));
  if (undescribed.length > 0) {
    throw new Error(
      `collectors missing a description, so describeOutputs() drops them: ${undescribed.join(', ')}`
    );
  }
  expect(Object.keys(describeOutputs()).length).toBe(standardCollectors.timeseries.length + 1);
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

// =============================================================================
// DIAGNOSTIC LEDGERS DO NOT FEED BACK
// =============================================================================

/**
 * Every numeric leaf of a value tree, as `path -> number`. Non-numeric leaves
 * are ignored; the diagnostic fields being compared here are all numbers or
 * nested records of numbers.
 */
function numericLeaves(value: unknown, path: string, into: Map<string, number>): void {
  if (typeof value === 'number') { into.set(path, value); return; }
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((child, i) => numericLeaves(child, `${path}[${i}]`, into));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    numericLeaves(child, `${path}.${key}`, into);
  }
}

const MACRO_RUN = runSimulation(undefined, { diagnostics: false });

test('firm cash floor never binds on the default path', () => {
  for (const row of FULL_RUN.results) expect(row.unpaidPrivateInterest).toBe(0);
});

test('private credit holds a target-leverage steady state on the default path', () => {
  const rows = FULL_RUN.results;
  // 2025 calibration is untouched: investment 25.2% of GDP, net new credit ~3%
  expect(rows[0].investment / rows[0].gdp).toBeBetween(0.249, 0.255);
  expect(rows[0].newInvestmentLoanOriginations / rows[0].gdp).toBeBetween(0.025, 0.035);
  for (const row of rows) {
    // Leverage on general capital stays near its year-0 ratio, so debt/GDP
    // follows K/Y rather than decaying at the growth rate (the
    // investment-gap-only closure reached 0.22 by 2100). Observed world
    // private debt has held ~1.4-1.7x GDP (IMF GDD 2025, BIS). The bank
    // credit envelope (baseCreditGrowth) binds from ~2030 and holds leverage
    // ~9% under target, hence the tolerance
    expect(Math.abs(row.privateLeverage / row.targetPrivateLeverage - 1)).toBeLessThan(0.12);
    expect(row.privateDebtGDP).toBeBetween(1.0, 1.65);
  }
});

test('diagnostics: false leaves every macro number bit-identical', () => {
  const withDiag = FULL_RUN;
  const without = MACRO_RUN;

  expect(without.results.length).toBe(withDiag.results.length);

  const diagnostic = new Set<string>(DIAGNOSTIC_FIELDS);
  const full = new Map<string, number>();
  const macro = new Map<string, number>();

  withDiag.results.forEach((row, i) => {
    for (const [key, v] of Object.entries(row)) {
      if (!diagnostic.has(key)) numericLeaves(v, `${i}.${key}`, full);
    }
  });
  without.results.forEach((row, i) => {
    for (const [key, v] of Object.entries(row)) numericLeaves(v, `${i}.${key}`, macro);
  });
  numericLeaves(withDiag.metrics, 'metrics', full);
  numericLeaves(without.metrics, 'metrics', macro);

  // A trivially small comparison would pass while proving nothing.
  expect(full.size).toBeGreaterThan(30_000);
  expect(macro.size).toBe(full.size);

  const differing: string[] = [];
  for (const [key, value] of full) {
    if (!Object.is(value, macro.get(key))) differing.push(key);
    if (differing.length > 5) break;
  }
  expect(differing).toEqual([]);
});

test('diagnostics: false drops exactly the diagnostic fields', () => {
  const present = new Set(Object.keys(MACRO_RUN.results[0] as unknown as Record<string, unknown>));
  expect(DIAGNOSTIC_FIELDS.filter((field: string) => present.has(field))).toEqual([]);

  const expected = Object.keys(FULL_RUN.results[0] as unknown as Record<string, unknown>)
    .filter(key => !DIAGNOSTIC_FIELDS.includes(key as never));
  expect(expected.filter(key => !present.has(key))).toEqual([]);
});

test('DIAGNOSTIC_FIELDS matches the diagnostic collectors', () => {
  const produced = new Set(
    standardCollectors.timeseries
      .filter(entry => DIAGNOSTIC_MODULES.includes(entry.module as never))
      .map(entry => resolveKey(entry)),
  );
  const declared = new Set<string>(DIAGNOSTIC_FIELDS);

  expect([...produced].filter(field => !declared.has(field))).toEqual([]);
  expect([...declared].filter(field => !produced.has(field))).toEqual([]);
});

test('macro modules are the full set minus the diagnostic ones', () => {
  expect(MACRO_MODULES.length).toBe(ALL_MODULES.length - DIAGNOSTIC_MODULES.length);
  const names = new Set(MACRO_MODULES.map(m => m.name));
  expect(DIAGNOSTIC_MODULES.filter((name: string) => names.has(name))).toEqual([]);
});

printSummary();

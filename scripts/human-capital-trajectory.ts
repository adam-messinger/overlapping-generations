/**
 * Human-capital trajectory: is the stock of pre-workforce human capital
 * growing or shrinking, region by region and year by year?
 *
 * The ledger in src/modules/human-capital.ts is a current-cost account: unit
 * costs scale with GDP per capita, so its dollar stock rises with income even
 * when the workforce it prices is shrinking. This script deflates each
 * region's net stock by the region's own GDP-per-capita index (2025 = 1) to
 * get a constant-cost quantity measure, and reports for each region the peak
 * year of that quantity, the first year its own cohorts stop covering their
 * charge, the first year the total (including migration transfers) turns
 * negative, and the flows behind them.
 *
 * At the world level the change in the constant-cost stock decomposes
 * exactly into the ledger's own net investment, the migration transfers
 * (movers re-booked at destination cost), and the useful-life revaluation,
 * each deflated by its region's cost index; the decomposition block prints
 * the residual so the table is self-checking.
 *
 * With --emit=<dir> it also writes the two files the Python reconstruction
 * and figure consume, so the ledger's constants have one source of truth:
 *   <dir>/ledger-constants.json  band cost multipliers, entry ages, expected
 *                                working lives (OECD ex-US), advanced-degree
 *                                shares, regions, and 2025 population anchors
 *   <dir>/model-index.csv        year x region constant-cost gross and net
 *                                stock index (2025 = 1), plus the world
 *
 * Companion to docs/HUMAN_CAPITAL_TRAJECTORY.md (the research note) and
 * docs/HUMAN_CAPITAL.md (the ledger's method).
 *
 * Usage:
 *   npx tsx scripts/human-capital-trajectory.ts [--scenario=baseline]
 *       [--years=2025,2050,2100] [--set=humanCapital.rearingCostShare=0]
 *       [--no-exit-hazards] [--emit=data/human-capital]
 *
 * --no-exit-hazards switches off death, disability, and domestic-role exits
 * everywhere, so useful life is retirement age minus entry age and there
 * are no write-offs (the G7-BRIC spreadsheet's convention).
 */

import { mkdirSync, writeFileSync } from 'fs';
import { EDUCATION_BANDS, REGIONS, REGION_NAMES, REGION_NAME_WIDTH, type Region } from '../src/domain-types.js';
import { runSimulation, runWithScenario, type SimulationParams, type SimulationResult, type YearResult } from '../src/simulation.js';
import { getScenarioPath } from '../src/scenario.js';
import { getAtYear } from '../src/helpers.js';
import { deepMerge } from '../src/primitives/deep-merge.js';
import { ComponentParams } from 'tsimulation';
import { demographicsDefaults } from '../src/modules/demographics.js';
import { expectedWorkingYears, humanCapitalDefaults, unitReplacementCost } from '../src/modules/human-capital.js';
import { arg, fixed, millions, pct } from './report-format.js';

const scenarioName = arg('scenario');
const years = (arg('years') ?? '2025,2030,2040,2050,2060,2075,2100').split(',').map(Number);

const NO_EXIT_HAZARDS: SimulationParams = {
  humanCapital: {
    hazards: { mortalityBase: 0, disabilityBase: 0 },
    regions: Object.fromEntries(REGIONS.map(r => [r, { domesticExitShare: 0 }])),
  },
};

/** --set=module.param.path=value overrides (numbers only), applied on top of defaults or the scenario. */
function overridesFromArgs(): SimulationParams {
  let params: SimulationParams = process.argv.includes('--no-exit-hazards') ? NO_EXIT_HAZARDS : {};
  for (const a of process.argv) {
    if (!a.startsWith('--set=')) continue;
    const [path, value] = a.slice('--set='.length).split('=');
    params = deepMerge(params, ComponentParams.from({}).set(path, Number(value)).toParams() as SimulationParams);
  }
  return params;
}

/** Region's GDP per capita relative to the first simulated year: the ledger's unit-cost index. */
function costIndex(row: YearResult, first: YearResult, region: Region): number {
  const gdppc = (r: YearResult) => r.regionalGdp[region] / r.regionalPopulation[region];
  return gdppc(row) / gdppc(first);
}

/** A regional flow or stock summed over regions at constant first-year unit costs. */
function deflatedSum(row: YearResult, first: YearResult, pick: (a: YearResult['regionalHumanCapital'][Region]) => number): number {
  let total = 0;
  for (const region of REGIONS) total += pick(row.regionalHumanCapital[region]) / costIndex(row, first, region);
  return total;
}

const ledgerNet = (a: YearResult['regionalHumanCapital'][Region]) => a.investment - a.depreciation - a.writeOffs;
const totalNet = (a: YearResult['regionalHumanCapital'][Region]) => ledgerNet(a) + a.migrationTransfer;

function report(result: SimulationResult, label: string) {
  const all = result.results;
  const first = all[0];
  const rows = years.map(y => getAtYear(result, y)).filter((r): r is YearResult => r !== undefined);
  const realNet = (r: YearResult) => deflatedSum(r, first, a => a.netStock);
  const worldReal0 = realNet(first);

  console.log(`\n=== Human-capital trajectory: ${label} ===`);
  console.log(`Constant-cost stocks are at ${first.year} regional unit costs ($T); flows at current cost ($T/yr).\n`);

  console.log('World  inv    charge  net inv  mig reval  life reval  inv/GDP  net stk  const-cost stk  idx   entrants(M)  tertiary+ share of workforce');
  console.log('----  -----  ------  -------  ---------  ----------  -------  -------  --------------  ----  -----------  ----------------------------');
  for (const r of rows) {
    const real = realNet(r);
    const workers = EDUCATION_BANDS.reduce((sum, b) => sum + r.humanCapitalByBand[b].workersInService, 0);
    const college = (r.humanCapitalByBand.tertiary.workersInService + r.humanCapitalByBand.advanced.workersInService) / workers;
    console.log(
      `${r.year}  ${fixed(1, 5)(r.humanCapitalInvestment)}  ${fixed(1, 6)(r.humanCapitalDepreciation + r.humanCapitalWriteOffs)}  ` +
      `${fixed(1, 7)(r.humanCapitalNetInvestment)}  ${fixed(2, 9)(r.humanCapitalMigrationRevaluation)}  ${fixed(2, 10)(r.humanCapitalLifeRevaluation)}  ` +
      `${pct(7)(r.humanCapitalInvestmentGdpShare)}  ${fixed(0, 7)(r.humanCapitalNetStock)}  ${fixed(0, 14)(real)}  ${fixed(2, 4)(real / worldReal0)}  ` +
      `${millions(11)(r.workforceEntrants)}  ${pct(10)(college)}`
    );
  }

  // The constant-cost stock changes by each year's flows deflated at that
  // year's regional cost index; the three lines below account for all of it.
  console.log(`\nChange in the world constant-cost net stock since ${first.year} ($T at ${first.year} cost): the ledger's own net investment,`);
  console.log('migration transfers (movers re-booked at destination cost), and the useful-life revaluation, each deflated by its region\'s cost index');
  console.log('Year  net inv  migration  life reval     sum  actual  residual');
  console.log('----  -------  ---------  ----------  ------  ------  --------');
  let cumNet = 0, cumMig = 0, cumLife = 0;
  for (const r of all) {
    if (r.year === first.year) continue;
    cumNet += deflatedSum(r, first, ledgerNet);
    cumMig += deflatedSum(r, first, a => a.migrationTransfer);
    cumLife += deflatedSum(r, first, a => a.lifeRevaluation);
    if (!years.includes(r.year)) continue;
    const actual = realNet(r) - worldReal0;
    console.log(
      `${r.year}  ${fixed(1, 7)(cumNet)}  ${fixed(1, 9)(cumMig)}  ${fixed(1, 10)(cumLife)}  ${fixed(1, 6)(cumNet + cumMig + cumLife)}  ` +
      `${fixed(1, 6)(actual)}  ${fixed(1, 8)(actual - cumNet - cumMig - cumLife)}`
    );
  }

  console.log(`\nBy region: constant-cost net stock index (${first.year} = 1), peak year, first year own cohorts stop covering their charge,`);
  console.log('first year the total (own cohorts, immigrants\' charge, and migration transfers) is negative');
  const yearHeader = rows.map(r => String(r.year).padStart(6)).join('');
  console.log(`${'Region'.padEnd(REGION_NAME_WIDTH)}${yearHeader}   peak  peak idx  own<0  total<0  entrants ${all[all.length - 1].year}/${first.year}`);
  console.log(`${'-'.repeat(REGION_NAME_WIDTH)}${rows.map(() => '  ----').join('')}   ----  --------  -----  -------  -------------`);
  for (const region of REGIONS) {
    const stock0 = first.regionalHumanCapital[region].netStock;
    let peak = 0, peakYear = first.year, firstNegOwn: number | undefined, firstNegTotal: number | undefined;
    for (const r of all) {
      const a = r.regionalHumanCapital[region];
      const real = a.netStock / costIndex(r, first, region);
      if (real > peak) { peak = real; peakYear = r.year; }
      if (firstNegOwn === undefined && a.ownCohortNetInvestment < 0) firstNegOwn = r.year;
      if (firstNegTotal === undefined && totalNet(a) < 0) firstNegTotal = r.year;
    }
    const idx = rows.map(r => fixed(2, 6)(r.regionalHumanCapital[region].netStock / costIndex(r, first, region) / stock0)).join('');
    const entrantsRatio = all[all.length - 1].regionalHumanCapital[region].entrants / first.regionalHumanCapital[region].entrants;
    console.log(
      `${REGION_NAMES[region].padEnd(REGION_NAME_WIDTH)}${idx}   ${peakYear}  ${fixed(2, 8)(peak / stock0)}  ` +
      `${String(firstNegOwn ?? 'never').padStart(5)}  ${String(firstNegTotal ?? 'never').padStart(7)}  ${fixed(2, 13)(entrantsRatio)}`
    );
  }

  console.log('\nBy region and year: entrants (M), investment, depreciation + write-offs, of which on post-2025 immigrants,');
  console.log('own-cohort net, migration transfer, total net, immigrants\' share of the workforce, inv/GDP');
  for (const region of REGIONS) {
    console.log(`\n${REGION_NAMES[region]}`);
    console.log('Year  entrants    inv  charge  on immig  own net    mig  total   immig %  inv/GDP');
    for (const r of rows) {
      const a = r.regionalHumanCapital[region];
      console.log(
        `${r.year}  ${millions(8)(a.entrants)}  ${fixed(2, 5)(a.investment)}  ${fixed(2, 6)(a.depreciation + a.writeOffs)}  ` +
        `${fixed(2, 8)(a.migrantDepreciation + a.migrantWriteOffs)}  ${fixed(2, 7)(a.ownCohortNetInvestment)}  ${fixed(2, 5)(a.migrationTransfer)}  ` +
        `${fixed(2, 5)(totalNet(a))}  ${pct(8)(a.migrantWorkers / a.workersInService)}  ${pct(7)(a.investmentGdpShare)}`
      );
    }
  }
}

/**
 * Write the ledger constants and the model's constant-cost index for the
 * Python reconstruction (scripts/human-capital-backcast.py) and figure
 * (scripts/human-capital-figure.py). Multipliers are the replacement cost of
 * one entrant as a multiple of GDP per capita; 'none' is rearing to the
 * primary entry age with no schooling. Working lives are the OECD ex-US
 * expected years in the workforce at the 2025 life expectancy.
 */
function emit(result: SimulationResult, dir: string) {
  const hc = humanCapitalDefaults;
  const oecd = demographicsDefaults.regions['oecd-ex-us'];
  const multipliers: Record<string, number> = { none: hc.rearingCostShare * hc.bands.primary.entryAge };
  const entryAge: Record<string, number> = { none: hc.bands.primary.entryAge };
  const workingLife: Record<string, number> = {};
  for (const band of EDUCATION_BANDS) {
    multipliers[band] = unitReplacementCost(hc, band, 1);
    entryAge[band] = hc.bands[band].entryAge;
    workingLife[band] = expectedWorkingYears(hc, 'oecd-ex-us', band, oecd.lifeExpectancy, hc.bands[band].retirementAge);
  }
  workingLife.none = workingLife.primary;
  const advancedShare = Object.fromEntries(REGIONS.map(r => [r, hc.regions[r].advancedShare]));
  const pop2025 = Object.fromEntries(REGIONS.map(r => [r, demographicsDefaults.regions[r].pop2025]));
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/ledger-constants.json`, JSON.stringify(
    { source: 'scripts/human-capital-trajectory.ts --emit', multipliers, entryAge, workingLife, advancedShare, regions: REGIONS, regionNames: REGION_NAMES, pop2025 },
    null, 2,
  ) + '\n');

  const first = result.results[0];
  const gross0 = deflatedSum(first, first, a => a.grossStock);
  const net0 = deflatedSum(first, first, a => a.netStock);
  const lines = ['year,region,gross_index,net_index'];
  for (const r of result.results) {
    for (const region of REGIONS) {
      const a = r.regionalHumanCapital[region], a0 = first.regionalHumanCapital[region], c = costIndex(r, first, region);
      lines.push(`${r.year},${region},${(a.grossStock / c / a0.grossStock).toFixed(6)},${(a.netStock / c / a0.netStock).toFixed(6)}`);
    }
    lines.push(`${r.year},world,${(deflatedSum(r, first, a => a.grossStock) / gross0).toFixed(6)},${(deflatedSum(r, first, a => a.netStock) / net0).toFixed(6)}`);
  }
  writeFileSync(`${dir}/model-index.csv`, lines.join('\n') + '\n');
  console.log(`\nWrote ${dir}/ledger-constants.json and ${dir}/model-index.csv`);
}

async function main() {
  const overrides = overridesFromArgs();
  let result: SimulationResult, label: string;
  if (scenarioName) {
    const run = await runWithScenario(getScenarioPath(scenarioName), overrides);
    result = run.result; label = run.scenario.name;
  } else {
    result = runSimulation(overrides); label = 'default parameters';
  }
  if (process.argv.includes('--no-exit-hazards')) label += ', no exit hazards';
  report(result, label);
  const dir = arg('emit');
  if (dir) emit(result, dir);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

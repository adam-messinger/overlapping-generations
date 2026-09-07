/**
 * Human-capital trajectory: is the stock of pre-workforce human capital
 * growing or shrinking, region by region and year by year?
 *
 * The ledger in src/modules/human-capital.ts is a current-cost account: unit
 * costs scale with GDP per capita, so its dollar stock rises with income even
 * when the workforce it prices is shrinking. This script deflates each
 * region's net stock by the region's own GDP-per-capita index (2025 = 1) to
 * get a constant-cost quantity measure, and reports for each region the peak
 * year of that quantity, the first year of net disinvestment, and the flows
 * with and without migration transfers.
 *
 * Companion to docs/HUMAN_CAPITAL_TRAJECTORY.md (the research note) and
 * docs/HUMAN_CAPITAL.md (the ledger's method).
 *
 * Usage:
 *   npx tsx scripts/human-capital-trajectory.ts [--scenario=baseline]
 *       [--years=2025,2050,2100] [--set=humanCapital.rearingCostShare=0]
 */

import { EDUCATION_BANDS, REGIONS, REGION_NAMES, REGION_NAME_WIDTH, type Region } from '../src/domain-types.js';
import { runSimulation, runWithScenario, type SimulationParams, type SimulationResult, type YearResult } from '../src/simulation.js';
import { getScenarioPath } from '../src/scenario.js';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find(a => a.startsWith(prefix))?.slice(prefix.length);
}

const scenarioName = arg('scenario');
const years = (arg('years') ?? '2025,2030,2040,2050,2060,2075,2100').split(',').map(Number);

/** --set=module.param=value overrides (numbers only), applied on top of defaults or the scenario. */
function overridesFromArgs(): SimulationParams {
  const params: Record<string, Record<string, number>> = {};
  for (const a of process.argv) {
    if (!a.startsWith('--set=')) continue;
    const [path, value] = a.slice('--set='.length).split('=');
    const [module, key] = path.split('.');
    (params[module] ??= {})[key] = Number(value);
  }
  return params as SimulationParams;
}

const fixed = (digits: number, width: number) => (v: number) => v.toFixed(digits).padStart(width);
const pct = (width: number) => (v: number) => `${(100 * v).toFixed(1)}%`.padStart(width);
const millions = (width: number) => (v: number) => (v / 1e6).toFixed(1).padStart(width);

/** Region's GDP per capita relative to the first simulated year: the ledger's unit-cost index. */
function costIndex(row: YearResult, first: YearResult, region: Region): number {
  const gdppc = (r: YearResult) => r.regionalGdp[region] / r.regionalPopulation[region];
  return gdppc(row) / gdppc(first);
}

/** Net stock at constant first-year unit costs, summed over regions. */
function realNetStock(row: YearResult, first: YearResult): number {
  let total = 0;
  for (const region of REGIONS) total += row.regionalHumanCapital[region].netStock / costIndex(row, first, region);
  return total;
}

function report(result: SimulationResult, label: string) {
  const all = result.results;
  const first = all[0];
  const rows = years.map(y => all.find(r => r.year === y)).filter((r): r is YearResult => r !== undefined);
  const worldReal0 = realNetStock(first, first);

  console.log(`\n=== Human-capital trajectory: ${label} ===`);
  console.log(`Constant-cost stocks are at ${first.year} regional unit costs ($T); flows at current cost ($T/yr).\n`);

  console.log('World  inv    charge  net inv  mig reval  inv/GDP  net stk  const-cost stk  idx   entrants(M)  tertiary+ share of workforce');
  console.log('----  -----  ------  -------  ---------  -------  -------  --------------  ----  -----------  ----------------------------');
  for (const r of rows) {
    const real = realNetStock(r, first);
    const bands = EDUCATION_BANDS.map(b => r.humanCapitalByBand[b].workersInService);
    const workers = bands.reduce((a, b) => a + b, 0);
    const college = (r.humanCapitalByBand.tertiary.workersInService + r.humanCapitalByBand.advanced.workersInService) / workers;
    console.log(
      `${r.year}  ${fixed(1, 5)(r.humanCapitalInvestment)}  ${fixed(1, 6)(r.humanCapitalDepreciation + r.humanCapitalWriteOffs)}  ` +
      `${fixed(1, 7)(r.humanCapitalNetInvestment)}  ${fixed(2, 9)(r.humanCapitalMigrationRevaluation)}  ${pct(7)(r.humanCapitalInvestmentGdpShare)}  ` +
      `${fixed(0, 7)(r.humanCapitalNetStock)}  ${fixed(0, 14)(real)}  ${fixed(2, 4)(real / worldReal0)}  ${millions(11)(r.workforceEntrants)}  ${pct(10)(college)}`
    );
  }

  console.log(`\nBy region: constant-cost net stock index (${first.year} = 1), peak year, first year of net disinvestment (own cohorts, then including migration transfers)`);
  const yearHeader = rows.map(r => String(r.year).padStart(6)).join('');
  console.log(`${'Region'.padEnd(REGION_NAME_WIDTH)}${yearHeader}   peak  peak idx  net<0  net+mig<0  entrants ${all[all.length - 1].year}/${first.year}`);
  console.log(`${'-'.repeat(REGION_NAME_WIDTH)}${rows.map(() => '  ----').join('')}   ----  --------  -----  ---------  -------------`);
  for (const region of REGIONS) {
    const stock0 = first.regionalHumanCapital[region].netStock;
    let peak = 0, peakYear = first.year, firstNeg: number | undefined, firstNegMig: number | undefined;
    for (const r of all) {
      const a = r.regionalHumanCapital[region];
      const real = a.netStock / costIndex(r, first, region);
      if (real > peak) { peak = real; peakYear = r.year; }
      const net = a.investment - a.depreciation - a.writeOffs;
      if (firstNeg === undefined && net < 0) firstNeg = r.year;
      if (firstNegMig === undefined && net + a.migrationTransfer < 0) firstNegMig = r.year;
    }
    const idx = rows.map(r => fixed(2, 6)(r.regionalHumanCapital[region].netStock / costIndex(r, first, region) / stock0)).join('');
    const entrantsRatio = all[all.length - 1].regionalHumanCapital[region].entrants / first.regionalHumanCapital[region].entrants;
    console.log(
      `${REGION_NAMES[region].padEnd(REGION_NAME_WIDTH)}${idx}   ${peakYear}  ${fixed(2, 8)(peak / stock0)}  ` +
      `${String(firstNeg ?? 'never').padStart(5)}  ${String(firstNegMig ?? 'never').padStart(9)}  ${fixed(2, 13)(entrantsRatio)}`
    );
  }

  console.log('\nBy region and year: entrants (M), investment, depreciation + write-offs, net, migration transfer, net incl. migration, inv/GDP');
  for (const region of REGIONS) {
    console.log(`\n${REGION_NAMES[region]}`);
    console.log('Year  entrants    inv  charge     net    mig  net+mig  inv/GDP');
    for (const r of rows) {
      const a = r.regionalHumanCapital[region];
      const net = a.investment - a.depreciation - a.writeOffs;
      console.log(
        `${r.year}  ${millions(8)(a.entrants)}  ${fixed(2, 5)(a.investment)}  ${fixed(2, 6)(a.depreciation + a.writeOffs)}  ` +
        `${fixed(2, 6)(net)}  ${fixed(2, 5)(a.migrationTransfer)}  ${fixed(2, 7)(net + a.migrationTransfer)}  ${pct(7)(a.investmentGdpShare)}`
      );
    }
  }
}

async function main() {
  const overrides = overridesFromArgs();
  if (scenarioName) {
    const { result, scenario } = await runWithScenario(getScenarioPath(scenarioName), overrides);
    report(result, scenario.name);
  } else {
    report(runSimulation(overrides), 'default parameters');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

/**
 * Human-capital ledger report.
 *
 * Prints the education-banded human-capital investment (pre-workforce cost
 * embodied in each year's entrants) and straight-line depreciation at current
 * replacement cost, plus the regional split and migration transfers, for
 * sample years of a scenario.
 *
 * Usage:
 *   npx tsx scripts/human-capital.ts [--scenario=baseline] [--years=2025,2050,2100]
 */

import { EDUCATION_BANDS, REGIONS } from '../src/domain-types.js';
import { runSimulation, runWithScenario, type SimulationResult, type YearResult } from '../src/simulation.js';
import { getScenarioPath } from '../src/scenario.js';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find(a => a.startsWith(prefix))?.slice(prefix.length);
}

const scenarioName = arg('scenario');
const years = (arg('years') ?? '2025,2035,2050,2075,2100').split(',').map(Number);

/** Fixed-width cell formatters: value -> padded string. */
const fixed = (digits: number, width: number) => (v: number) => v.toFixed(digits).padStart(width);
const millions = (width: number) => (v: number) => (v / 1e6).toFixed(1).padStart(width);
const thousands = (width: number) => (v: number) => (v / 1e3).toFixed(0).padStart(width);
const pct = (width: number) => (v: number) => `${(100 * v).toFixed(1)}%`.padStart(width);

function report(result: SimulationResult, label: string) {
  const rows = years
    .map(year => result.results.find(r => r.year === year))
    .filter((r): r is YearResult => r !== undefined);

  console.log(`\n=== Human-capital ledger: ${label} ===`);
  console.log('($T at current replacement cost; entrants in millions; unit cost in $k per entrant)');
  console.log('Depreciation is straight-line over expected time in the workforce; write-offs are pre-retirement exits.\n');

  const t = fixed(1, 7);
  console.log('Year   GDP    HC inv   HC dep  write-off   net inv  gross stk  net stk   inv/GDP  dep/GDP  HC/K   entrants');
  console.log('----  -----  -------  -------  ---------  --------  ---------  -------   -------  -------  -----  --------');
  for (const row of rows) {
    console.log(
      `${row.year}  ${fixed(0, 5)(row.gdp)}  ${t(row.humanCapitalInvestment)}  ${t(row.humanCapitalDepreciation)}  ` +
      `${fixed(1, 9)(row.humanCapitalWriteOffs)}  ${fixed(1, 8)(row.humanCapitalNetInvestment)}  ` +
      `${fixed(0, 9)(row.humanCapitalGrossStock)}  ${fixed(0, 7)(row.humanCapitalNetStock)}   ` +
      `${pct(6)(row.humanCapitalInvestmentGdpShare)}   ${pct(6)(row.humanCapitalDepreciationGdpShare)}  ` +
      `${fixed(2, 5)(row.humanCapitalNetStockToPhysical)}  ${millions(8)(row.workforceEntrants)}`
    );
  }

  for (const row of rows) printBands(row);

  const first = result.results[0];
  const last = result.results[result.results.length - 1];
  console.log(`\nBy region (${first.year} -> ${last.year}): investment, depreciation + write-offs, net, migration transfer (at own cost), inv/GDP`);
  console.log('Region   inv0  chg0   net0   mig0  share0 |   inv1    chg1    net1    mig1  share1');
  console.log('------  -----  ----  -----  -----  ------ |  -----   -----   -----   -----  ------');
  for (const region of REGIONS) {
    console.log(`${region.padEnd(6)}  ${regionCells(first, region, 2)} |  ${regionCells(last, region, 1)}`);
  }

  console.log('\nMigration (world): inflows at destination cost / outflows at origin cost / revaluation gain, $T/yr');
  for (const row of rows) {
    console.log(`${row.year}  ${fixed(2, 6)(row.humanCapitalMigrationInflows)}  ${fixed(2, 6)(row.humanCapitalMigrationOutflows)}  ${fixed(2, 6)(row.humanCapitalMigrationRevaluation)}`);
  }
}

function regionCells(row: YearResult, region: (typeof REGIONS)[number], digits: number): string {
  const a = row.regionalHumanCapital[region];
  const charge = a.depreciation + a.writeOffs;
  const f = fixed(digits, 5);
  return `${f(a.investment)}  ${fixed(digits, 4)(charge)}  ${f(a.investment - charge)}  ${f(a.migrationTransfer)}  ${pct(6)(a.investmentGdpShare)}`;
}

function printBands(row: YearResult) {
  console.log(`\n${row.year} by education band:`);
  console.log('Band       entrants  cost $k  life yr   invest   deprec  writeoff  gross stk  net stk  in service (M)');
  console.log('---------  --------  -------  -------  -------  -------  --------  ---------  -------  --------------');
  const t = fixed(1, 7);
  for (const band of EDUCATION_BANDS) {
    const a = row.humanCapitalByBand[band];
    console.log(
      `${band.padEnd(9)}  ${millions(8)(a.entrants)}  ${thousands(7)(a.unitCost)}  ${fixed(1, 7)(a.usefulLife)}  ` +
      `${t(a.investment)}  ${t(a.depreciation)}  ${fixed(1, 8)(a.writeOffs)}  ` +
      `${fixed(0, 9)(a.grossStock)}  ${fixed(0, 7)(a.netStock)}  ${millions(14)(a.workersInService)}`
    );
  }
  console.log(`\n${row.year} workforce exits by cause (millions/yr; useful life = expected years to exit for any cause):`);
  console.log('Band        deaths  disability  domestic  retirement   total');
  console.log('---------  -------  ----------  --------  ----------  ------');
  for (const band of EDUCATION_BANDS) {
    const a = row.humanCapitalByBand[band];
    const total = a.deaths + a.disabilityExits + a.domesticExits + a.retirements;
    console.log(
      `${band.padEnd(9)}  ${millions(7)(a.deaths)}  ${millions(10)(a.disabilityExits)}  ` +
      `${millions(8)(a.domesticExits)}  ${millions(10)(a.retirements)}  ${millions(6)(total)}`
    );
  }
}

async function main() {
  if (scenarioName) {
    const { result, scenario } = await runWithScenario(getScenarioPath(scenarioName));
    report(result, scenario.name);
  } else {
    report(runSimulation(), 'default parameters');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

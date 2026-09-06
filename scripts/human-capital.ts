/**
 * Human-capital ledger report.
 *
 * Prints the education-banded human-capital investment (pre-workforce cost
 * embodied in each year's entrants) and straight-line depreciation at current
 * replacement cost, plus the regional split, for sample years of a scenario.
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

const fmtT = (v: number) => v.toFixed(1).padStart(7);
const fmtPct = (v: number) => `${(100 * v).toFixed(1)}%`.padStart(6);
const fmtM = (v: number) => (v / 1e6).toFixed(1).padStart(6);
const fmtK = (v: number) => (v / 1e3).toFixed(0).padStart(6);

function report(result: SimulationResult, label: string) {
  console.log(`\n=== Human-capital ledger: ${label} ===`);
  console.log('($T at current replacement cost; entrants in millions; unit cost in $k per entrant)');
  console.log('Depreciation is straight-line over expected time in the workforce; write-offs are pre-retirement exits.\n');

  console.log('Year   GDP    HC inv   HC dep  write-off   net inv  gross stk  net stk   inv/GDP  dep/GDP  HC/K   entrants');
  console.log('----  -----  -------  -------  ---------  --------  ---------  -------   -------  -------  -----  --------');
  for (const year of years) {
    const row = result.results.find(r => r.year === year);
    if (!row) continue;
    console.log(
      `${year}  ${row.gdp.toFixed(0).padStart(5)}  ${fmtT(row.humanCapitalInvestment)}  ${fmtT(row.humanCapitalDepreciation)}  ` +
      `${fmtT(row.humanCapitalWriteOffs).padStart(9)}  ${fmtT(row.humanCapitalNetInvestment).padStart(8)}  ` +
      `${row.humanCapitalGrossStock.toFixed(0).padStart(9)}  ${row.humanCapitalNetStock.toFixed(0).padStart(7)}   ` +
      `${fmtPct(row.humanCapitalInvestmentGdpShare)}   ${fmtPct(row.humanCapitalDepreciationGdpShare)}  ` +
      `${row.humanCapitalNetStockToPhysical.toFixed(2).padStart(5)}  ${fmtM(row.workforceEntrants).padStart(8)}`
    );
  }

  for (const year of years) {
    const row = result.results.find(r => r.year === year);
    if (!row) continue;
    printBands(row);
  }

  const first = result.results[0];
  const last = result.results[result.results.length - 1];
  console.log(`\nBy region (${first.year} -> ${last.year}): investment, depreciation + write-offs, net, migration transfer (at own cost), inv/GDP`);
  console.log('Region   inv0  chg0   net0   mig0  share0 |   inv1    chg1    net1    mig1  share1');
  console.log('------  -----  ----  -----  -----  ------ |  -----   -----   -----   -----  ------');
  for (const region of REGIONS) {
    const a = first.regionalHumanCapital[region];
    const b = last.regionalHumanCapital[region];
    console.log(
      `${region.padEnd(6)}  ${a.investment.toFixed(2).padStart(5)}  ${(a.depreciation + a.writeOffs).toFixed(2).padStart(4)}  ` +
      `${(a.investment - a.depreciation - a.writeOffs).toFixed(2).padStart(5)}  ${a.migrationTransfer.toFixed(2).padStart(5)}  ${fmtPct(a.investmentGdpShare)} |  ` +
      `${b.investment.toFixed(1).padStart(5)}   ${(b.depreciation + b.writeOffs).toFixed(1).padStart(5)}   ` +
      `${(b.investment - b.depreciation - b.writeOffs).toFixed(1).padStart(5)}   ${b.migrationTransfer.toFixed(1).padStart(5)}  ${fmtPct(b.investmentGdpShare)}`
    );
  }
  console.log(`\nMigration (world): inflows at destination cost / outflows at origin cost / revaluation gain, $T/yr`);
  for (const year of years) {
    const row = result.results.find(r => r.year === year);
    if (!row) continue;
    console.log(`${year}  ${row.humanCapitalMigrationInflows.toFixed(2).padStart(6)}  ${row.humanCapitalMigrationOutflows.toFixed(2).padStart(6)}  ${row.humanCapitalMigrationRevaluation.toFixed(2).padStart(6)}`);
  }
}

function printBands(row: YearResult) {
  console.log(`\n${row.year} by education band:`);
  console.log('Band       entrants  cost $k  life yr   invest   deprec  writeoff  gross stk  net stk  in service (M)');
  console.log('---------  --------  -------  -------  -------  -------  --------  ---------  -------  --------------');
  for (const band of EDUCATION_BANDS) {
    const a = row.humanCapitalByBand[band];
    console.log(
      `${band.padEnd(9)}  ${fmtM(a.entrants).padStart(8)}  ${fmtK(a.unitCost).padStart(7)}  ${a.usefulLife.toFixed(1).padStart(7)}  ` +
      `${fmtT(a.investment)}  ${fmtT(a.depreciation)}  ${fmtT(a.writeOffs).padStart(8)}  ` +
      `${a.grossStock.toFixed(0).padStart(9)}  ${a.netStock.toFixed(0).padStart(7)}  ${fmtM(a.workersInService).padStart(14)}`
    );
  }
  console.log(`\n${row.year} workforce exits by cause (millions/yr; useful life = expected years to exit for any cause):`);
  console.log('Band        deaths  disability  domestic  retirement   total');
  console.log('---------  -------  ----------  --------  ----------  ------');
  for (const band of EDUCATION_BANDS) {
    const a = row.humanCapitalByBand[band];
    const total = a.deaths + a.disabilityExits + a.domesticExits + a.retirements;
    console.log(
      `${band.padEnd(9)}  ${fmtM(a.deaths).padStart(7)}  ${fmtM(a.disabilityExits).padStart(10)}  ` +
      `${fmtM(a.domesticExits).padStart(8)}  ${fmtM(a.retirements).padStart(10)}  ${fmtM(total).padStart(6)}`
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

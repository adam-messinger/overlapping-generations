import {
  renderGodleyMermaid,
  renderGodleyTableMarkdown,
} from 'tsimulation';
import { runSimulation } from '../src/simulation.js';
import {
  capitalDefaults,
} from '../src/modules/capital.js';
import {
  capitalGodleyDefinition,
  createCapitalGodleyLedger,
  postCapitalGodleyYear,
} from '../src/modules/capital-accounting.js';
import {
  analyzeFinancialLocalStability,
  compareFinancialTimesteps,
  scanDebtRatioBasin,
} from '../src/diagnostics/financial-stability.js';
import {
  renderAccountingApplicabilityMarkdown,
} from '../src/simulations/accounting-applicability.js';

const baseline = runSimulation();
const keenCounterfactual = runSimulation({
  production: { keenEnergyWeight: 1 },
});
const stabilityPoint = {
  state: {
    publicDebt: capitalDefaults.initialPublicDebtGDP * capitalDefaults.initialCapitalStock / 3.5,
    privateDebt: capitalDefaults.initialPrivateDebtGDP * capitalDefaults.initialCapitalStock / 3.5,
    previousGdp: capitalDefaults.initialCapitalStock / 3.5,
  },
  inputs: {
    gdp: capitalDefaults.initialCapitalStock / 3.5,
    capitalStock: capitalDefaults.initialCapitalStock,
  },
  params: capitalDefaults,
};
const local = analyzeFinancialLocalStability(stabilityPoint).analysis;
const timesteps = compareFinancialTimesteps(stabilityPoint);
const basin = scanDebtRatioBasin(
  { inputs: stabilityPoint.inputs, params: stabilityPoint.params },
  {
    publicDebtRatios: [0.5, 1, 2, 3],
    privateDebtRatios: [0.5, 1.5, 2.5, 3.5],
    years: 40,
    escapeTotalDebtGDP: 10,
  },
);

const sampleOpening = createCapitalGodleyLedger({
  capitalStock: 553,
  privateDebt: 252.8,
  publicDebt: 142.2,
  bankEquityRatio: capitalDefaults.bankEquityRatio,
});
const samplePosting = postCapitalGodleyYear(sampleOpening, {
  depreciation: 27.65,
  generalInvestment: 30,
  laborCompensation: 100,
  householdConsumption: 110,
  grossLoanOriginations: 5,
  principalRepayments: 12,
  loanWriteOffs: 1,
  privateInterestPayments: 5,
  firmDividendPayments: 1,
  bankDividendPayments: 5,
  publicDebtChange: 3,
  governmentServiceConsumption: 8,
  pensionTransfers: 18,
  publicInterestPayments: 5,
  publicInterestToBanks: 0,
  netTaxes: 28,
});

function rowForYear(year: number) {
  const baselineIndex = baseline.years.indexOf(year);
  const keenIndex = keenCounterfactual.years.indexOf(year);
  const base = baseline.results[baselineIndex];
  const keen = keenCounterfactual.results[keenIndex];
  return {
    year,
    ayresWarrPath: base.gdp,
    keenShadowOnAyresWarrPath: base.keenEnergyGdp,
    keenFeedbackPath: keen.gdp,
    shadowGap: base.productionFunctionGap,
    feedbackGap: keen.gdp / base.gdp - 1,
  };
}

const energyRows = [2025, 2050, 2100].map(rowForYear);
const basinCounts = Object.fromEntries(
  ['contracting', 'bounded', 'expanding', 'escape'].map((outcome) => [
    outcome,
    basin.filter((cell) => cell.outcome === outcome).length,
  ]),
);

console.log('# Accounting, stability, and energy-challenger report\n');
console.log('## Production-function comparison\n');
console.log(
  'Shadow gap is the symmetric relative difference '
  + '`2 × (Keen - AW) / (|Keen| + |AW|)`.',
);
console.log('| Year | Ayres-Warr path ($T/yr) | Keen shadow ($T/yr) | Keen feedback path ($T/yr) | Symmetric shadow gap | Feedback gap |');
console.log('| --- | ---: | ---: | ---: | ---: | ---: |');
for (const row of energyRows) {
  console.log(
    `| ${row.year} | ${row.ayresWarrPath.toFixed(1)} | `
    + `${row.keenShadowOnAyresWarrPath.toFixed(1)} | ${row.keenFeedbackPath.toFixed(1)} | `
    + `${(100 * row.shadowGap).toFixed(1)}% | ${(100 * row.feedbackGap).toFixed(1)}% |`,
  );
}

console.log('\n## Financial dynamics\n');
console.log(
  `Local classification: **${local.classification}**, spectral radius `
  + `**${local.spectralRadius.toFixed(6)}**.`,
);
console.log('\n| Substeps/year | Closing public debt ($T) | Closing private debt ($T) | Public error vs finest | Private error vs finest |');
console.log('| ---: | ---: | ---: | ---: | ---: |');
for (const row of timesteps) {
  console.log(
    `| ${row.substeps} | ${row.publicDebt.toFixed(4)} | ${row.privateDebt.toFixed(4)} | `
    + `${(100 * row.publicDebtRelativeError).toFixed(5)}% | `
    + `${(100 * row.privateDebtRelativeError).toFixed(5)}% |`,
  );
}
console.log(`\nBasin grid outcomes: ${JSON.stringify(basinCounts)}.`);

console.log('\n## Godley transaction graph\n');
console.log('```mermaid');
console.log(renderGodleyMermaid(capitalGodleyDefinition, samplePosting.report));
console.log('```');
console.log('\n<details><summary>Representative transaction matrix</summary>\n');
console.log(renderGodleyTableMarkdown(capitalGodleyDefinition, samplePosting.report, 2));
console.log('\n</details>');

console.log('\n## Applicability to current models\n');
console.log(renderAccountingApplicabilityMarkdown());

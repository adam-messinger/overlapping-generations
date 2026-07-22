import { loadScenario, scenarioToParams } from '../src/scenario.js';
import { runWarAiExperiment } from '../src/simulations/news/war-ai.js';

const aiScenario = await loadScenario('scenarios/ai-energy-boom.json');
const experiment = runWarAiExperiment({
  aiParams: scenarioToParams(aiScenario),
  hormuzScenario: 'prolonged-closure',
  endYear: 2035,
});

const signed = (value: number, digits = 2): string =>
  `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;

console.log('=== War × AI matched factorial experiment ===\n');
console.log('War arm: calibrated prolonged Hormuz closure.');
console.log('AI arm: scenarios/ai-energy-boom.json.');
console.log('Positive cushion means AI makes the matched war GDP effect less negative.\n');

const selected = new Set([2025, 2026, 2027, 2030, 2032, 2035]);
console.table(
  experiment.years.filter((row) => selected.has(row.year)).map((row) => ({
    year: row.year,
    'GDP baseline $T': row.baselineGdp.toFixed(1),
    'GDP AI $T': row.aiOnlyGdp.toFixed(1),
    'war effect no AI': `${signed(row.warGdpEffectWithoutAiPct)}%`,
    'war effect with AI': `${signed(row.warGdpEffectWithAiPct)}%`,
    'AI cushion pp': signed(row.aiCushionPctPoints),
    'interaction $T': signed(row.gdpInteraction),
    'DC load TWh': row.dataCenterLoadTWh.toFixed(0),
    'DC capex $T': row.dataCenterCapexSpend.toFixed(2),
    'total inv. $T': row.combinedInvestment.toFixed(1),
    'interest rate': pct(row.combinedInterestRate),
    'funding gap $T': row.combinedCapitalFundingGap.toFixed(2),
  })),
);

const trough = experiment.years.reduce((worst, row) =>
  row.warGdpEffectWithAiPct < worst.warGdpEffectWithAiPct ? row : worst,
);
const strongestCushion = experiment.years.reduce((best, row) =>
  row.aiCushionPctPoints > best.aiCushionPctPoints ? row : best,
);
const strongestAmplification = experiment.years.reduce((worst, row) =>
  row.aiCushionPctPoints < worst.aiCushionPctPoints ? row : worst,
);

console.log('\nSummary');
console.log(
  `- Worst matched war effect with AI: ${signed(trough.warGdpEffectWithAiPct)}% in ${trough.year}.`,
);
console.log(
  `- Largest modeled AI cushion: ${signed(strongestCushion.aiCushionPctPoints)}pp in ${strongestCushion.year}.`,
);
console.log(
  `- Largest modeled AI amplification: ${signed(strongestAmplification.aiCushionPctPoints)}pp in ${strongestAmplification.year}.`,
);

console.log('\nRegional AI cushion at the war trough (percentage points)');
console.table([Object.fromEntries(
  Object.entries(trough.regionalAiCushionPctPoints).map(([region, value]) => [
    region,
    signed(value),
  ]),
)]);

console.log('\nGuardrails');
console.log('- This is a conditional interaction experiment, not a probability forecast.');
console.log('- AI load is global rather than assigned to a specific grid region.');
console.log('- Bab el-Mandeb and tanker-route capacity are not in this first experiment.');

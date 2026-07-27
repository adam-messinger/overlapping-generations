import { runSimulation } from '../src/index.js';
import {
  evaluatePipelineAttrition,
  evaluateSolarCoalCrossover,
  evaluateVendorFinancingBackstop,
} from '../src/simulations/news/headline-experiments-2026-07-27.js';

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;
const billions = (value: number): string => `$${value.toFixed(0)}B`;
const gw = (value: number): string => `${value.toFixed(1)} GW`;

console.log('=== News-driven simulations: 2026-07-27 ===\n');
console.log('Selected questions');
console.table([
  {
    headline: "Nvidia weighs $250B backstop for OpenAI's 10 GW Ohio campus",
    estimand: 'vendor-financing exposure and expected loss',
    mechanism: 'contingent guarantee × monetization × wrong-way collateral',
  },
  {
    headline: '$130B of data centers blocked or delayed in early 2026',
    estimand: 'net drag on the 194 GW-by-2035 path',
    mechanism: 'capex semantics × relocation × queue phantoms vs firm capacity',
  },
  {
    headline: 'Solar passed coal in US electricity for the first month ever',
    estimand: 'year of the first full-year solar-over-coal crossover',
    mechanism: 'May seasonality × addition-driven solar growth × coal decline',
  },
]);

// ---------------------------------------------------------------------------
const backstop = evaluateVendorFinancingBackstop();
console.log('\n1. Nvidia backstop as vendor financing');
console.table([
  ...backstop.initialV1.benchmarkShares.map((row) => ({
    entity: row.id,
    'commitments / revenue': pct(row.commitmentsShareOfRevenue),
  })),
  {
    entity: 'nvidia backstop alone',
    'commitments / revenue': pct(backstop.initialV1.backstopShareOfRevenue),
  },
  {
    entity: 'nvidia incl. chip financing',
    'commitments / revenue': pct(
      backstop.initialV1.totalDiscussedShareOfRevenue,
    ),
  },
]);
console.log(
  `V1: the guarantee alone is ${backstop.initialV1.multipleOfLargestHistoricalRatio.toFixed(
    1,
  )}x Lucent's peak vendor-financing intensity — the "Lucent redux" reading.`,
);
console.table(
  backstop.revisedV2.scenarioCoverage.map((row) => ({
    scenario: row.id,
    weight: row.weight,
    'P(call)': pct(row.callProbability),
    'revenue 2032': billions(row.projectedRevenueBillion2032),
    'covers lease in': row.coverageYear ?? 'never (by 2036)',
  })),
);
console.log(
  `V2: the full-build lease is ${billions(
    backstop.revisedV2.fullBuildAnnualLeasePaymentBillion,
  )}/yr, needing ~${billions(
    backstop.revisedV2.requiredLesseeRevenueBillion,
  )} of lessee revenue. Probability-weighted expected loss ${billions(
    backstop.revisedV2.expectedLossBillion,
  )} (${pct(
    backstop.revisedV2.expectedLossShareOfAnnualFreeCashFlow,
  )} of one year's FCF); telecom-analog loss ${billions(
    backstop.revisedV2.telecomAnalogLossBillion,
  )}; worst case ${billions(
    backstop.revisedV2.worstCaseLossBillion,
  )} = ${backstop.revisedV2.worstCaseLossYearsOfFreeCashFlow.toFixed(
    1,
  )} years of FCF. ${pct(
    backstop.revisedV2.guaranteedBuyerShareOfProjectCapex,
  )} of project capex is chips sold by the guarantor.`,
);

// ---------------------------------------------------------------------------
const attrition = evaluatePipelineAttrition();
console.log('\n2. Blocked data centers vs the 2035 path');
console.log(
  `V1: ${gw(
    attrition.initialV1.annualizedBlockedGwPerYear,
  )}/yr annualized blocked vs ${gw(
    attrition.requiredNetAdditionsGwPerYear,
  )}/yr required -> "forecast infeasible" (${String(
    attrition.initialV1.forecastLooksInfeasible,
  )}).`,
);
console.table([
  {
    channel: 'consent (net of phantoms + relocation)',
    'avg-load drag GW/yr':
      `${attrition.revisedV2.consentDragAverageLoadGwPerYearLow.toFixed(1)}-` +
      attrition.revisedV2.consentDragAverageLoadGwPerYearHigh.toFixed(1),
  },
  ...attrition.revisedV2.firmCapacityVariants.map((row) => ({
    channel: `firm capacity (${row.sharedFirmBuildGw} GW shared build)`,
    'avg-load drag GW/yr':
      row.firmCapacityDragAverageLoadGwPerYear.toFixed(1),
  })),
]);
console.log(
  `V2: the $130B is ${gw(attrition.revisedV2.blockedGwFullStack)}-${gw(
    attrition.revisedV2.blockedGwFacilityOnly,
  )} depending on whether announced value includes IT gear; gross blocking runs ${pct(
    attrition.revisedV2.grossBlockedShareOfEmbeddedAttrition,
  )} of the queue attrition the forecast already absorbs. Binding constraint: ${
    attrition.revisedV2.bindingConstraint
  }.`,
);

// ---------------------------------------------------------------------------
const crossover = evaluateSolarCoalCrossover();
console.log('\n3. Solar vs coal: monthly milestone, annual crossover');
console.log(
  `V1: May 2026 solar/coal = ${crossover.initialV1.may2026SolarShareOfCoal.toFixed(
    2,
  )} -> "solar overtook coal in ${crossover.initialV1.claimedCrossoverYear}".`,
);
console.table(
  crossover.revisedV2.annualSeries.slice(0, 5).map((row) => ({
    year: row.year,
    'solar TWh': Math.round(row.solarTwh),
    'coal TWh': Math.round(row.coalTwh),
  })),
);
console.log(
  `V2: seasonal factors (May solar ${crossover.revisedV2.maySolarSeasonalFactor.toFixed(
    2,
  )}x, May coal ${crossover.revisedV2.mayCoalSeasonalFactor.toFixed(
    2,
  )}x) predict May 2026 at ${crossover.revisedV2.predictedMay2026SolarTwh.toFixed(
    1,
  )} vs ${crossover.revisedV2.predictedMay2026CoalTwh.toFixed(
    1,
  )} TWh (errors ${pct(crossover.revisedV2.may2026SolarPredictionError)}, ${pct(
    crossover.revisedV2.may2026CoalPredictionError,
  )}) and reproduce the monthly crossover. Annual crossover: ${String(
    crossover.revisedV2.annualCrossoverYear,
  )} (coal-decline sensitivity ${String(
    crossover.revisedV2.annualCrossoverYearCoalDeclineLow,
  )}-${String(
    crossover.revisedV2.annualCrossoverYearCoalDeclineHigh,
  )}); 2026 still has a ${crossover.revisedV2.annual2026SolarDeficitTwh.toFixed(
    0,
  )} TWh annual solar deficit.`,
);

// World-model comparison: the main simulation's global solar-vs-coal
// electricity crossover, for contrast with the US-only story.
const world = runSimulation();
const worldCrossover = world.results.find(
  (row) =>
    (row.generation.solar ?? 0) > (row.generation.coal ?? 0),
);
console.log(
  `World model tie-in: the baseline scenario's global electricity mix first puts solar above coal in ${
    worldCrossover ? worldCrossover.year : 'no year in the horizon'
  } (US-only stories lead the world by years).`,
);

console.log('\nWhere the models differ from conventional wisdom');
console.log(
  '- Nvidia backstop: the "Lucent redux" ratio is real - 5x the worst 2000 vendor-financing intensity, 12x including chip financing. But a priced contingency is not a booked loan: the expected loss is about a quarter of one year of free cash flow, and even a full call with collapsed GPU collateral is ~2 years of FCF - an earnings event, not a solvency event. The novel risk is concentration and circularity (70% of the project capex is chips sold by the guarantor), not the balance-sheet fragility that killed Lucent.',
);
console.log(
  '- Blocked data centers: the $130B figure is consent, not a power shortage - and it is gross project value at announcement, so the GW at stake are 3-12 GW, not a year of the demand path. After phantoms and relocation, consent drag and firm-capacity drag are the same order of magnitude; neither alone breaks the 194 GW path, but together they are the difference between BNEF 2035 arriving on time and arriving ~2-4 years late.',
);
console.log(
  '- Solar vs coal: the May milestone is real but seasonal - solar runs ~1.2x its annual-average month in May while coal runs ~0.84x. On current addition rates the annual crossover lands in 2028 (2028-2029 under coal sensitivity), so "solar has overtaken coal" is about two years early as an annual claim - and the baseline world model puts the same global crossover around 2034, six years behind the US.',
);

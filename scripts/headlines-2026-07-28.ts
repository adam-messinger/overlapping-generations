import {
  evaluateGermanySickNotes,
  evaluateNvidiaVendorFinancing,
  evaluateSpainLabourMarket,
} from '../src/simulations/news/headline-experiments-2026-07-28.js';

const pct = (value: number): string =>
  `${(100 * value).toFixed(2)}%`;
const pp = (value: number): string => `${value.toFixed(2)}pp`;
const people = (valueThousand: number): string =>
  `${Math.round(valueThousand).toLocaleString('en-US')}k`;
const money = (valueBillion: number): string =>
  valueBillion >= 1_000
    ? `$${(valueBillion / 1_000).toFixed(2)}T`
    : `$${valueBillion.toFixed(1)}B`;

console.log('=== News-driven simulations: 2026-07-28 ===\n');
console.log('Selected questions');
console.table([
  {
    headline: 'Spain unemployment falls to 9.87%',
    estimand: 'underlying quarterly labour-market improvement',
    mechanism: 'employment + labour force + seasonal adjustment',
  },
  {
    headline: 'Nvidia CDS rises on vendor-financing concern',
    estimand: 'contingent credit loss and customer funding gap',
    mechanism: 'customer hazard × guarantee + AI capital cycle',
  },
  {
    headline: 'Germany tightens sick-note rules',
    estimand: 'change in effective labour input',
    mechanism: 'recording → attendance → productivity − spillovers',
  },
]);

const spain = evaluateSpainLabourMarket();
console.log('\n1. Spain labour market');
console.table([
  {
    version: 'V1 raw Q2 stocks',
    employment: `+${people(
      spain.initialV1.rawEmploymentChangeThousand,
    )}`,
    labour_force: `+${people(
      spain.initialV1.rawLabourForceChangeThousand,
    )}`,
    unemployment_rate_change: pp(
      spain.initialV1.rawRateChangePctPoints,
    ),
  },
  {
    version: 'V2 seasonally adjusted proxy',
    employment: `+${people(
      spain.revisedV2
        .impliedSeasonallyAdjustedEmploymentChangeThousand,
    )}`,
    labour_force: 'implied by E + U',
    unemployment_rate_change: pp(
      spain.revisedV2
        .impliedSeasonallyAdjustedRateChangePctPoints,
    ),
  },
  {
    version: 'V2 year over year',
    employment: `+${people(
      spain.case.annualEmploymentChangeThousand,
    )}`,
    labour_force: 'record high',
    unemployment_rate_change: pp(
      spain.revisedV2.annualRateChangePctPoints,
    ),
  },
]);
console.table([
  {
    component: 'employment growth',
    contribution: pp(
      spain.initialV1.employmentContributionPctPoints,
    ),
  },
  {
    component: 'larger labour force',
    contribution: `+${pp(
      spain.initialV1.labourForceContributionPctPoints,
    )}`,
  },
]);

const nvidia = evaluateNvidiaVendorFinancing();
console.log('\n2. Nvidia vendor financing');
console.table([
  {
    version: 'V1 gross face value',
    exposure: money(
      nvidia.initialV1.grossFaceValueLossBillion,
    ),
    share_of_equity_move: pct(
      nvidia.initialV1.grossFaceValueToObservedEquityLoss,
    ),
    interpretation: 'assumes full, immediate impairment',
  },
  {
    version: 'V2 5% annual customer hazard',
    exposure: money(
      nvidia.revisedV2.centralExpectedLoss
        .presentValueExpectedLossBillion,
    ),
    share_of_equity_move: pct(
      nvidia.revisedV2.centralExpectedLoss
        .expectedLossShareOfObservedEquityLoss,
    ),
    interpretation: '75% use, five-year expected loss stress',
  },
  {
    version: 'V2 25% annual customer hazard',
    exposure: money(
      nvidia.revisedV2.stressExpectedLoss
        .presentValueExpectedLossBillion,
    ),
    share_of_equity_move: pct(
      nvidia.revisedV2.stressExpectedLoss
        .expectedLossShareOfObservedEquityLoss,
    ),
    interpretation: 'full use, severe customer stress',
  },
]);
console.log(
  `The 82bp Nvidia CDS implies about ${money(
    nvidia.revisedV2.nvidiaOwnCreditSignal
      .annualPremiumOnGuaranteeFaceBillion,
  )} a year when applied to $250B of notional. It prices Nvidia's credit and is not the customer-default input used above.`,
);
console.log('Existing customer capital-cycle check');
console.table(
  nvidia.revisedV2.customerCapitalCycle.map((row) => ({
    scenario: row.scenario,
    peak_funding_need: money(row.peakFundingNeedBillion),
    ending_debt: money(row.endingDebtBalanceBillion),
    guarantee_share_of_gap: pct(
      row.guaranteeShareOfPeakFundingNeed,
    ),
    announced_deals_share_of_gap: pct(
      row.announcedDealsShareOfPeakFundingNeed,
    ),
  })),
);

const germany = evaluateGermanySickNotes();
console.log('\n3. Germany sick-note policy');
console.table([
  {
    version: 'V1 literal 10% recorded-day cut',
    net_effective_days:
      germany.initialV1.recoveredEffectiveDays.toFixed(3),
    effective_labour: pct(
      germany.initialV1.effectiveLabourChange,
    ),
  },
  ...germany.revisedV2.scenarios.map((row) => ({
    version: `V2 ${row.id}`,
    net_effective_days: row.netEffectiveDays.toFixed(3),
    effective_labour: pct(row.effectiveLabourChange),
  })),
]);
console.log(
  `Under the break-even row's productivity, contagion, and administration assumptions, ${pct(
    germany.revisedV2.breakEvenBehaviouralShare,
  )} of the recorded reduction must represent real extra attendance before effective labour rises.`,
);

console.log('\nWhere the models differ from conventional wisdom');
console.log(
  `- Spain: the good-news interpretation survives, but not at the raw quarterly magnitude. Seasonal adjustment retains about ${pct(
    spain.revisedV2.rawRateDeclineRetainedAfterAdjustment,
  )} of the 0.96pp rate drop; the annual rate still falls ${pp(
    -spain.revisedV2.annualRateChangePctPoints,
  )}, and the labour force grew rather than shrank.`,
);
console.log(
  `- Nvidia: funding strain is real in the existing capital-cycle model, but a $250B contingent face value is not a $250B expected loss. The central five-year customer-credit stress yields ${money(
    nvidia.revisedV2.centralExpectedLoss
      .presentValueExpectedLossBillion,
  )}; most of the equity repricing must be a signal about demand quality, future margins, or valuation rather than direct guarantee impairment.`,
);
console.log(
  `- Germany: the government's maximum arithmetic gain is ${pct(
    germany.initialV1.effectiveLabourChange,
  )}, but once a recorded reduction is separated from real attendance, the displayed range is ${pct(
    germany.revisedV2.scenarios[0]?.effectiveLabourChange ?? 0,
  )} to ${pct(
    germany.revisedV2.scenarios.at(-1)?.effectiveLabourChange ?? 0,
  )}. The article's skepticism is better supported than a confident productivity claim.`,
);

console.log('\nLimits');
console.log(
  '- Spain adjusted levels are proxies reconstructed from INE growth rates; only the rates themselves are official.',
);
console.log(
  '- Nvidia deal terms were unconfirmed, its CDS is not the customer hazard, and the model does not value lost chip sales or Nvidia equity.',
);
console.log(
  '- Germany has no estimated policy response. Its envelope exposes the missing behavioral inputs and should not be read as a forecast.',
);

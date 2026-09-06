import {
  evaluateDieselInflationAndFed,
  evaluateEbolaTrajectory,
  evaluateHormuzClosureNarrative,
} from '../src/simulations/news/headline-experiments-2026-09-06.js';

const pct = (value: number, digits = 1): string => `${(100 * value).toFixed(digits)}%`;
const usd = (value: number, digits = 0): string => `$${value.toFixed(digits)}`;
const pp = (value: number, digits = 2): string => `${value >= 0 ? '+' : ''}${value.toFixed(digits)}pp`;
const k = (value: number): string => `${Math.round(value).toLocaleString('en-US')}`;

console.log('=== News-driven simulations: 2026-09-06 ===\n');
console.log('Selected questions');
console.table([
  {
    headline: 'Hormuz "closed for 190 days"; Brent $96 after US strikes on Iranian tankers',
    estimand: 'oil volume actually moving, and the settlement clock',
    mechanism: 'price inversion in two models + IEA stock identity',
  },
  {
    headline: 'Record $5.85 diesel; 162k jobs; ~60% priced Fed hike',
    estimand: 'incremental CPI from diesel; what a hike buys',
    mechanism: 'distillate clearing → CPI pass-through → policy rule',
  },
  {
    headline: 'Ebola (Bundibugyo): "fastest growing on record", ~3,100 deaths',
    estimand: 'confirmed cases and deaths by 31 December',
    mechanism: 'SEIR with staged response, plateau holdout',
  },
]);

// ---------------------------------------------------------------------------
const hormuz = evaluateHormuzClosureNarrative();
console.log('\n1. Strait of Hormuz: what does $96 say about barrels?');
console.table([
  {
    reading: 'V1 vessel count = oil flow',
    throughput: pct(hormuz.initialV1.vesselCountThroughputShare),
    'seaborne loss mb/d': hormuz.initialV1.grossSeaborneLossMbd.toFixed(1),
    'implied Brent': `${usd(hormuz.initialV1.literalClearingPriceUsd)} (ε=0.2) / ${usd(
      hormuz.initialV1.settlementModelBrentAtVesselCountUsd,
    )} (settlement model)`,
  },
  {
    reading: 'V2 settlement model inverted on $96',
    throughput: pct(hormuz.revisedV2.settlementModel.septemberThroughputImpliedByPrice),
    'seaborne loss mb/d': (
      20.9 * (1 - hormuz.revisedV2.settlementModel.septemberThroughputImpliedByPrice)
    ).toFixed(1),
    'implied Brent': usd(hormuz.revisedV2.settlementModel.septemberBrentReproducedUsd),
  },
  {
    reading: 'V2 stock-flow model inverted on $96',
    throughput: `${pct(hormuz.revisedV2.stockFlowModel.throughputBandWithin3Usd.low)}–${pct(
      hormuz.revisedV2.stockFlowModel.throughputBandWithin3Usd.high,
    )} (±$3)`,
    'seaborne loss mb/d': (
      20.9 * (1 - hormuz.revisedV2.stockFlowModel.septemberThroughputImpliedByPrice)
    ).toFixed(1),
    'implied Brent': usd(hormuz.revisedV2.stockFlowModel.septemberBrentReproducedUsd),
  },
  ...hormuz.revisedV2.stockAnchored.readings
    .filter((r) => r.demandElasticity <= 0.2)
    .map((r) => ({
      reading: `V3 IEA stock identity, ε=${r.demandElasticity}`,
      throughput: pct(r.impliedHormuzThroughputShare),
      'seaborne loss mb/d': (20.9 * (1 - r.impliedHormuzThroughputShare)).toFixed(1),
      'implied Brent': 'n/a (anchored on 410 mb draw)',
    })),
]);
console.log(
  `Observed IEA draw March–July: ${hormuz.revisedV2.stockAnchored.ieaObservedDrawMbd.toFixed(1)} mb/d (410 mb). ` +
    `Settlement model draws ${k(hormuz.revisedV2.stockAnchored.settlementModelMarchToJulyDrawMb)} mb over the same months, ` +
    `stock-flow model ${k(hormuz.revisedV2.stockAnchored.stockFlowModelMarchToJulyDrawMb)} mb: both over-draw, so both overstate the physical shortfall the price implies.`,
);
console.log(
  `Renewed strikes add ${usd(hormuz.revisedV2.settlementModel.premiumChangeAugustToSeptemberUsd)} of war premium in the settlement model against a ${usd(
    hormuz.case.brentUsdPerBarrel - hormuz.case.brentLateAugustUsd,
  )} observed weekly move; the implied September flow (${pct(
    hormuz.revisedV2.settlementModel.septemberThroughputImpliedByPrice,
  )}) is above August (${pct(hormuz.revisedV2.settlementModel.augustThroughputImpliedByPrice)}).`,
);
console.log('September throughput implied by $96 at different combat tempos');
console.table(
  hormuz.revisedV2.settlementModel.intensitySensitivity.map((row) => ({
    'tempo (Epic Fury = 1)': row.septemberIntensity,
    'war premium': usd(row.warPremiumUsd),
    'implied throughput': row.septemberThroughputImpliedByPrice >= 0.999 ? 'no shortfall needed' : pct(row.septemberThroughputImpliedByPrice),
  })),
);
console.log(`Dark-fleet share of screened tankers (24h): ${pct(hormuz.revisedV2.darkTankerShare)}.`);
console.log('\nForward branches from October (settlement model, conditional on the war surviving to October)');
console.table(
  hormuz.revisedV2.branches.map((b) => ({
    branch: b.id,
    'settled by 31 Dec': pct(b.settledByDec2026GivenSurvival, 0),
    'settled by Jun 2027': pct(b.settledByJun2027GivenSurvival, 0),
    'median': b.medianSettlementLabelGivenSurvival ?? 'beyond horizon',
    'Brent Oct→Mar': b.brentOctToMarUsd.map((v) => Math.round(v)).join('/'),
    'SPR release ends': b.usSprExhaustedLabel ?? 'n/a',
  })),
);
console.log(
  `Prediction market: ${pct(hormuz.case.marketNormalByDec31, 0)} normal transit by 31 December; EIA Q3 Brent ${usd(
    hormuz.case.eiaQ3BrentForecastUsd,
  )}. Unconditional model mass on a settlement before October was ${pct(
    hormuz.revisedV2.settlementModel.settlementMassBeforeOctober,
    0,
  )}, which did not occur.`,
);
console.log(
  `Stock-flow model at its price-implied flow: ${pct(
    hormuz.revisedV2.stockFlowModel.accessibleStockRemainingShare,
    0,
  )} of accessible stocks left in September, exhausted in ${
    hormuz.revisedV2.stockFlowModel.monthsUntilAccessibleStocksExhausted ?? '>15'
  } months, after which the multiple is ${hormuz.revisedV2.stockFlowModel.priceMultipleAfterExhaustion.toFixed(2)}× (${usd(
    hormuz.revisedV2.stockFlowModel.priceMultipleAfterExhaustion * hormuz.case.brentPrewarUsd,
  )}).`,
);

// ---------------------------------------------------------------------------
const diesel = evaluateDieselInflationAndFed();
console.log('\n2. Record diesel, the jobs print, and the Fed');
console.table([
  {
    version: 'V1 "long list of goods"',
    'diesel y/y': pct(diesel.initialV1.dieselYoy),
    'headline addition': pp(diesel.initialV1.naiveHeadlineAdditionPctPoints),
    basis: '2.5% exposed basket × full y/y rise, at once',
  },
  {
    version: 'V2 incremental since July',
    'diesel y/y': pct(diesel.revisedV2.cpiPassThrough.julyDieselUsdPerGal / diesel.case.dieselUsdPerGalYearAgo - 1),
    'headline addition': pp(diesel.revisedV2.cpiPassThrough.totalHeadlineAdditionAfterYearPctPoints),
    basis: `$${diesel.revisedV2.cpiPassThrough.incrementalDieselBillBillionPerYear.toFixed(0)}B/yr = ${pct(
      diesel.revisedV2.cpiPassThrough.incrementalBillShareOfPce,
      2,
    )} of PCE, 70% pass-through, 5-month half-life`,
  },
]);
const d = diesel.revisedV2.distillateMarket;
console.log(
  `Distillate: ${pct(d.shortfallShareOfDemand)} of demand short after stock draws; wholesale ${usd(
    d.wholesaleDieselNowUsdPerBarrel,
  )}/bbl vs ${usd(d.wholesaleDieselYearAgoUsdPerBarrel)} a year ago (${d.wholesalePriceMultiple.toFixed(2)}×), ${pct(
    d.crackShareOfWholesaleRise,
    0,
  )} of the rise is crack not crude; implied short-run elasticity ${d.impliedShortRunElasticity.toFixed(2)}.`,
);
console.log(
  `Sensitivities: lose the remaining Hormuz product flow → ${usd(d.retailIfHormuzProductsLostUsdPerGal, 2)}/gal; same shortfall after medium-run adjustment (ε=0.25) → ${usd(
    d.retailAfterMediumRunAdjustmentUsdPerGal,
    2,
  )}/gal.`,
);
console.log('\nPolicy rules on a common retail-energy path (month 0 = March 2026; September level held)');
console.table(
  [diesel.revisedV2.policy.lookThrough, diesel.revisedV2.policy.hikeRule].map((p) => ({
    rule: p.id,
    'peak funds rate': `${p.peakPolicyRatePct.toFixed(2)}%`,
    'headline Dec 2026': `${p.headlineDec2026Pct.toFixed(2)}%`,
    'headline Jun 2027': `${p.headlineJun2027Pct.toFixed(2)}%`,
    'headline Dec 2027': `${p.headlineDec2027Pct.toFixed(2)}%`,
    'output gap trough': pp(p.troughOutputGapPct),
  })),
);
console.log(
  `Model July headline ${diesel.revisedV2.policy.modelHeadlineJuly2026Pct.toFixed(2)}% vs ${diesel.case.headlineCpiJuly}% reported. ` +
    `Static base-effect arithmetic with energy flat: ${diesel.revisedV2.baseEffects.headlineIfEnergyFlatJun2027Pct.toFixed(2)}% by June 2027.`,
);
console.log(
  `The hiking rule lowers December 2027 headline by ${diesel.revisedV2.policy.headlineDifferenceDec2027PctPoints.toFixed(3)}pp for ${pp(
    diesel.revisedV2.policy.outputGapDifferencePctPoints,
  )} of output gap; a single 25bp step is ${pp(
    diesel.revisedV2.policy.benchmark25bpInflationAfterTwoYearsPctPoints,
  )} on inflation after two years by the usual rule of thumb.`,
);
const l = diesel.revisedV2.labour;
console.log('\nPayrolls as a noisy signal');
console.table([
  {
    'August print': `${diesel.case.payrollsAugustThousand}k vs ${diesel.case.payrollsConsensusThousand}k consensus`,
    '3-month average': `${l.threeMonthAverageThousand.toFixed(0)}k ± ${l.threeMonthStandardErrorThousand.toFixed(0)}k`,
    'P(print > consensus is real)': pct(l.probabilityAugustAboveConsensusIsSignal, 0),
    'P(trend > 90k)': pct(l.probabilityTrendAboveBreakevenHigh, 0),
    'P(trend > 30k)': pct(l.probabilityTrendAboveBreakevenLow, 0),
  },
]);

// ---------------------------------------------------------------------------
const ebola = evaluateEbolaTrajectory();
console.log('\n3. Ebola: is the curve still exponential?');
console.log(`Weekly confirmed cases (from 15 May): ${ebola.weekly.map((w) => Math.round(w.cases)).join(' ')}`);
console.log(
  `Two-week Rt, last eight weeks: ${ebola.revisedV2.empiricalReproductionNumber
    .slice(-8)
    .map((r) => r.rt.toFixed(2))
    .join(' ')}`,
);
console.table([
  {
    version: 'V1 exponential ("5,000 in 100 days")',
    'Rt / doubling': `doubling ${ebola.initialV1.doublingTimeDays.toFixed(0)} days`,
    'confirmed by 31 Dec': k(ebola.initialV1.projectedCasesByDec31),
    'deaths by 31 Dec': '—',
  },
  {
    version: 'V2 single-stage SEIR (train ≤ 14 Aug)',
    'Rt / doubling': `Rt ${ebola.revisedV2.fitted.effectiveReproductionNumberNow.toFixed(2)}; holdout cumulative error ${pct(
      ebola.revisedV2.evaluation.holdout.caseCumulativeError,
      0,
    )}`,
    'confirmed by 31 Dec': 'rejected on holdout',
    'deaths by 31 Dec': '—',
  },
  {
    version: 'V3 two-stage SEIR (train ≤ 14 Aug)',
    'Rt / doubling': `Rt ${ebola.revisedV2.twoStage.effectiveReproductionNumberNow.toFixed(2)}; holdout cumulative error ${pct(
      ebola.revisedV2.twoStage.evaluation.holdout.caseCumulativeError,
      0,
    )}`,
    'confirmed by 31 Dec': 'used only as the out-of-sample test',
    'deaths by 31 Dec': '—',
  },
  ...ebola.revisedV2.projections.map((p) => ({
    version: `V3 refit on all weeks: ${p.id}`,
    'Rt / doubling': `Rt ${(ebola.revisedV2.finalFit.effectiveReproductionNumberNow * p.contactMultiplierChange).toFixed(2)}`,
    'confirmed by 31 Dec': k(p.confirmedCasesByDec31),
    'deaths by 31 Dec': k(p.confirmedDeathsByDec31),
  })),
]);
console.log(
  `Last four weeks average ${k(ebola.revisedV2.weeklyCasesLastFourWeeks)} confirmed/week versus ${k(
    ebola.revisedV2.weeklyCasesMidJuly,
  )} in mid-July (ratio ${ebola.revisedV2.plateauRatio.toFixed(2)}). At 24% positivity that is ~${k(
    ebola.revisedV2.impliedTestsPerWeekAtPlateau,
  )} tests/week: a flat confirmed count is also what a laboratory ceiling looks like.`,
);
console.log(
  `Fitted ascertainment ${pct(ebola.revisedV2.fitted.ascertainment, 0)} of infections (WHO: reported cases at least half of reality); implied CFR among confirmed ${pct(
    ebola.revisedV2.fitted.impliedConfirmedCaseFatality,
    0,
  )} vs 48% reported.`,
);

console.log('\nWhere the models differ from the day\'s narrative');
console.log(
  `- Hormuz: "closed for 190 days" is an insurance and routing status. The IEA draw of 2.7 mb/d over five months plus a $96 price is arithmetic for roughly ${pct(
    hormuz.revisedV2.stockAnchored.readings[2]?.impliedHormuzThroughputShare ?? 0,
    0,
  )}–${pct(hormuz.revisedV2.stockAnchored.readings[0]?.impliedHormuzThroughputShare ?? 0, 0)} of normal Gulf oil still reaching buyers (elasticity 0.2 to 0.1), not 7%. The week's $7 rise is smaller than the war premium renewed strikes carry. Unless shipping normalizes, both repo models put Brent above $105 by December as buffers thin; the EIA and market numbers are reopening paths.`,
);
console.log(
  `- Diesel/Fed: the record is a crack-spread event (${pct(d.crackShareOfWholesaleRise, 0)} of the wholesale rise). Its incremental CPI effect is ${pp(
    diesel.revisedV2.cpiPassThrough.totalHeadlineAdditionAfterYearPctPoints,
  )} over a year, against a base effect that takes headline from ~${diesel.revisedV2.policy.lookThrough.headlineDec2026Pct.toFixed(1)}% in December to ~${diesel.revisedV2.policy.lookThrough.headlineJun2027Pct.toFixed(1)}% by June 2027 with no policy change. The 162k print is a ${pct(
    l.probabilityAugustAboveConsensusIsSignal,
    0,
  )}-confidence surprise but only a ${pct(l.probabilityTrendAboveBreakevenHigh, 0)} case that trend hiring exceeds 90k.`,
);
console.log(
  `- Ebola: confirmed incidence has been ~${k(ebola.revisedV2.weeklyCasesLastFourWeeks)}/week since mid-July, Rt ≈ ${ebola.revisedV2.finalFit.effectiveReproductionNumberNow.toFixed(2)}. "Fastest growing on record" describes May–July; the exponential reading gives ${k(
    ebola.initialV1.projectedCasesByDec31,
  )} confirmed by year-end, the plateau reading ${k(
    ebola.revisedV2.projections[0]?.confirmedCasesByDec31 ?? 0,
  )}. Neither containment nor explosion, unless the flat count is the laboratory's throughput.`,
);

console.log('\nLimits');
console.log('- Hormuz: both repo models draw stocks 1.5–2× faster than the IEA observed, so their post-buffer price paths are upper bounds; the settlement hazard mapping is a swept judgment; "settlement" is not "normal transit".');
console.log('- Diesel: the policy model\'s transmission from the funds rate to inflation is weak by construction; the rule comparison shows the sign and order of magnitude, not a Fed forecast. Breakeven employment is a judgment range.');
console.log('- Ebola: weekly counts are interpolated between batched cumulative reports; ascertainment and fatality are fitted observation parameters; the two-stage response is reduced-form and the branches are scenarios.');

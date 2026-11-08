import { runSimulation } from '../src/index.js';
import {
  evaluateBrentDealRepricing,
  evaluateElNinoTemperature,
  evaluateFedDecemberHike,
  scoreSeptember6Forecasts,
} from '../src/simulations/news/headline-experiments-2026-11-08.js';

const pct = (v: number, d = 0) => `${(100 * v).toFixed(d)}%`;
const usd = (v: number, d = 0) => `$${v.toFixed(d)}`;
const deg = (v: number) => `${v.toFixed(2)}°C`;
const k = (v: number) => Math.round(v).toLocaleString('en-US');

console.log('=== News-driven simulations: 2026-11-08 ===\n');

// ---------------------------------------------------------------------------
const oil = evaluateBrentDealRepricing();
const o1 = oil.initialV1;
const o2 = oil.revisedV2;
console.log('1. Brent −16% "on deal bets": how much is the deal?');
console.table([
  {
    reading: 'V1 whole fall is a deal bet',
    'deal price (Jan delivery)': usd(o1.dealPriceJanuaryUsd),
    result: `deal odds 0 → ${pct(o1.impliedDealProbability)}, ${o1.impliedOverObservedOddsMove.toFixed(1)}× the largest observed odds move`,
  },
  {
    reading: 'V2 bound on the deal bet',
    'deal price (Jan delivery)': usd(o1.dealPriceJanuaryUsd),
    result: `Δp 10.5pts × widest spread = ${usd(o2.dealOddsMoveExplainsUsdAtMost, 1)} of ${usd(o1.weeklyFallUsd, 2)} (${pct(o2.dealOddsMoveShareOfFallAtMost)} at most)`,
  },
]);
console.log('Settlement model (stock-clearing block), observed flows: August 36%, September 47%, October 58% of normal');
console.table([
  ...o2.statusQuoNovemberAtTempoUsd.map((z) => ({ state: `status quo, tempo ${z.tempo} (Nov)`, 'model Brent': usd(z.brentUsd) })),
  { state: 're-closure at full tempo (peak Nov–Jan)', 'model Brent': usd(o2.escalationPeakNovToJanUsd) },
  { state: 'deal, flows normal over 4 months (Jan)', 'model Brent': usd(o1.dealPriceJanuaryUsd) },
]);
console.log(
  `Model October ${usd(o2.modelOctoberUsd)} against an observed ${usd(oil.case.brentSep29Usd)}→${usd(oil.case.brentOct30Usd)}. ` +
    `30 Oct close is ${usd(o2.october30AboveEscalationPeakUsd, 1)} above the model's re-closure peak; 6 Nov close ${usd(oil.case.brentNov6Usd, 2)} is at its full-tempo status quo. ` +
    'Deal probability implied if the no-deal value is the model\'s: ' +
    o2.impliedDealProbabilityAtModelNoDeal.map((r) => `${pct(r.probability)} (tempo ${r.tempo})`).join(', ') + '.',
);
console.log(
  `Market and analysts: Polymarket deal by 31 Dec ${pct(oil.case.polymarketDealByDec31, 1)}, normal traffic by 31 Dec ${pct(oil.case.polymarketNormalTrafficByDec31)}; Eurasia ${pct(oil.case.eurasiaDealOddsNow)} (from ${pct(oil.case.eurasiaDealOddsBefore)}); Rapidan ${pct(oil.case.rapidanFightingResumes)} that fighting resumes.`,
);
const g = o2.stockGapEndSeptemberMb;
console.log(
  `Holdout: observed stocks below pre-war at end-September — stock block ${k(g.stocksV2)} mb, legacy flow block ${k(g.flowV1)} mb, IEA ${g.iea} mb. Commercial stocks are ${k(o2.commercialGapOctoberMb)} mb below pre-war in October; the rest of the gap is strategic releases.`,
);

// ---------------------------------------------------------------------------
const fed = evaluateFedDecemberHike();
const f2 = fed.revisedV2;
console.log('\n2. December hike priced at 77% while pump prices fall');
console.table([
  {
    version: 'V1 (6 Sep calibration, new fuel path)',
    'Jul–Sep headline (model vs 3.4/3.4/3.7)': fed.initialV1.modelHeadlineJulToSep.map((v) => v.toFixed(2)).join('/'),
    'Jul–Sep core (model vs 2.5/2.4/2.6)': fed.initialV1.modelCoreJulToSep.map((v) => v.toFixed(2)).join('/'),
    rmse: `${fed.revisedV2.v1FitRmsePp.toFixed(2)}pp`,
  },
  {
    version: `V2 refit (expectations ${f2.fittedExpectedInflationPct}%, pass-through ${f2.fittedIndirectPassThrough} vs ${f2.defaultIndirectPassThrough})`,
    'Jul–Sep headline (model vs 3.4/3.4/3.7)': '—',
    'Jul–Sep core (model vs 2.5/2.4/2.6)': '—',
    rmse: `${f2.fitRmsePp.toFixed(2)}pp`,
  },
]);
console.table(
  [f2.lookThrough, f2.hikeRule, f2.relapse].map((p) => ({
    path: p.id,
    'peak headline': `${p.peakHeadlinePct.toFixed(2)}% (${p.peakHeadlineMonth})`,
    'Dec 2026': `${p.headlineDec2026Pct.toFixed(2)}%`,
    'Jun 2027': `${p.headlineJun2027Pct.toFixed(2)}%`,
    'Dec 2027': `${p.headlineDec2027Pct.toFixed(2)}%`,
    'core Dec 2026': `${p.coreDec2026Pct.toFixed(2)}%`,
    'policy rate Dec 2026': `${p.policyRateDec2026Pct.toFixed(2)}%`,
  })),
);
console.log(
  `The hiking rule changes Dec 2027 headline by ${f2.hikeBuysDec2027Pp.toFixed(3)}pp for ${f2.hikeCostsOutputGapPp.toFixed(2)}pp of output gap.`,
);
const l = f2.labour;
console.log(
  `Payrolls: 3-month average ${l.threeMonthAverageThousand.toFixed(0)}k ± ${l.threeMonthStandardErrorThousand.toFixed(0)}k (Aug 186k, Sep 60k revised; Oct 165k, a ${l.octoberSurpriseSigma.toFixed(1)}σ beat). ` +
    `P(trend > 90k) = ${pct(l.probabilityTrendAbove90k)} (6 Sep: ${pct(l.september6ProbabilityTrendAbove90k)}). Wages ${fed.case.averageHourlyEarningsYoy}% y/y, ${Math.abs(l.wageGapToTargetConsistentPp).toFixed(1)}pp below the 2%-consistent pace.`,
);
const lf = l.filtered;
console.log('Payroll trend filtered for revisions (local level; first/second prints carry their revision variance and trailing-24-month mean revision)');
console.table([
  { release: 'Aug 2026 (6 Sep)', naive: '71k', filtered: `${lf.september6TrendThousand.toFixed(0)}k`, 'P(trend > 90k)': `${pct(l.september6ProbabilityTrendAbove90k)} → ${pct(lf.september6ProbabilityTrendAbove90k)}` },
  { release: 'Oct 2026 (6 Nov)', naive: `${l.threeMonthAverageThousand.toFixed(0)}k`, filtered: `${lf.trendThousand.toFixed(0)}k ± ${lf.trendSdThousand.toFixed(0)}k`, 'P(trend > 90k)': `${pct(l.probabilityTrendAbove90k)} → ${pct(lf.probabilityTrendAbove90k)}` },
]);
const bt = lf.backtest;
console.log(
  `First prints are revised by ${lf.firstPrintBiasThousand.toFixed(0)}k on average (trailing 24 months). Real-time backtest, ${bt.releases} releases ${bt.firstRelease}–${bt.lastRelease}: ` +
    `RMSE ${bt.smoothedTarget.naiveRmse.toFixed(0)}k naive → ${bt.smoothedTarget.filterRmse.toFixed(0)}k filtered against the ex-post trend; ` +
    `${bt.centredTarget.naiveRmse.toFixed(0)}k → ${bt.centredTarget.filterRmse.toFixed(0)}k against a centred five-month mean (no bias correction: ${bt.centredTarget.noBiasRmse.toFixed(0)}k).`,
);

// ---------------------------------------------------------------------------
const sim = runSimulation({}, { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' });
const forced = (year: number) => sim.results[sim.years.indexOf(year)]?.temperature ?? Number.NaN;
const nino = evaluateElNinoTemperature(undefined, { y2026: forced(2026), y2027: forced(2027) });
console.log('\n3. Record El Niño: 2026 and 2027 against the 2024 record (ERA5, above 1850–1900)');
console.log(
  `Fit 1970–2025 (volcanic years out): ENSO coefficient ${nino.fit.ensoCoefficient.toFixed(3)} °C per °C ONI at ${nino.case.ensoLagMonths}-month lag; ` +
    `trend ${deg(nino.fit.trendLevel2026)} in 2026, ${nino.fit.trendSlopePerDecade.toFixed(2)} °C/decade. ` +
    `Post-peak residuals: ${nino.fit.strongEventResiduals.map((s) => `${s.year} +${s.residual.toFixed(2)}`).join(', ')} (mean +${nino.fit.strongEventExcess.toFixed(2)}).`,
);
console.log(
  `Holdout 2026: H1 residual ${nino.holdout2026.firstHalfResidual.toFixed(3)}; July–October ${nino.holdout2026.julyToOctoberResidual.toFixed(3)} (V1) → ${nino.holdout2026.julyToOctoberResidualV2.toFixed(3)} (V2 with the excess).`,
);
console.table(
  [
    ['V1 regression', nino.initialV1],
    ['V2 + strong-event excess', nino.revisedV2],
  ].flatMap(([label, v]) => {
    const r = v as typeof nino.initialV1;
    return [r.year2026, r.year2027].map((y) => ({
      version: label as string,
      year: y.year,
      anomaly: deg(y.annualAnomalyPreindustrial),
      'P(above 2024)': pct(y.probabilityAbove2024),
    }));
  }),
);
console.log(
  `2024 record ${deg(nino.observed.record2024)}. 2026 Jan–Oct ${deg(nino.observed.januaryToOctober2026)}; October ${deg(nino.observed.october2026)}; first ${nino.observed.novemberDays} November days ${deg(nino.observed.novemberFirstDays2026)}. ` +
    `Nov–Dec must average ${deg(nino.observed.novDecNeededToTie2024)} to tie 2024. Copernicus: ${nino.case.copernicusProjection2026.low}–${nino.case.copernicusProjection2026.high}°C, ~${pct(nino.case.copernicusRecordChance2026)} chance.`,
);
console.log(
  `2027 peak month ${nino.revisedV2.peakMonth2027.label} at ${deg(nino.revisedV2.peakMonth2027.anomaly)}. Peak sensitivity: ` +
    nino.revisedV2.peakSensitivity2027.map((s) => `×${s.scale} → ${deg(s.anomaly)} (${pct(s.probabilityAbove2024)})`).join(', ') + '.',
);
console.log(
  `Climate module (default run) forced warming ${deg(nino.climateModule.forced2026)} in 2026, ${deg(nino.climateModule.forced2027)} in 2027, against the ENSO-removed ERA5 trend ${deg(nino.climateModule.regressionTrend2026)} / ${deg(nino.climateModule.regressionTrend2027)}; module plus ENSO gives ${deg(nino.climateModule.moduleWithEnso2027)} for 2027.`,
);

// ---------------------------------------------------------------------------
const s = scoreSeptember6Forecasts();
console.log('\n4. Scorecard: the 6 September forecasts');
console.table([
  {
    forecast: 'Ebola: plateau (~630/wk), not exponential',
    'then said': `plateau → ${k(s.ebola.plateauCasesAtLastObservation)} by 31 Oct; exponential → ${k(s.ebola.exponentialCasesAtLastObservation)}`,
    happened: `${k(s.ebola.observedCasesAtLastObservation)} confirmed on 31 Oct (${k(s.ebola.observedWeeklyCasesSinceAnchor)}/wk)`,
  },
  {
    forecast: 'Ebola: 31 Dec confirmed',
    'then said': s.ebola.projectionsByDec31.map((p) => `${p.id} ${k(p.cases)}`).join('; '),
    happened: `run-rate held flat → ${k(s.ebola.runRateCasesByDec31)}`,
  },
  {
    forecast: 'Hormuz: Brent Oct/Nov, attrition branch',
    'then said': `${usd(s.hormuz.attritionOctNovUsd[0])}/${usd(s.hormuz.attritionOctNovUsd[1])} (escalation ${usd(s.hormuz.escalationOctNovUsd[0])}/${usd(s.hormuz.escalationOctNovUsd[1])}, pause ${usd(s.hormuz.pauseOctNovUsd[0])}/${usd(s.hormuz.pauseOctNovUsd[1])})`,
    happened: `Oct ${usd(s.hormuz.observedOctoberRangeUsd[0])}→${usd(s.hormuz.observedOctoberRangeUsd[1])}; Nov so far ${usd(s.hormuz.observedNovemberToDateRangeUsd[0])}–${usd(s.hormuz.observedNovemberToDateRangeUsd[1])}`,
  },
  {
    forecast: 'Hormuz: oil still moving (stock identity)',
    'then said': `${pct(s.hormuz.stockAnchoredThroughputBand[0])}–${pct(s.hormuz.stockAnchoredThroughputBand[1])} of normal`,
    happened: `IEA August ${pct(s.hormuz.ieaAugustThroughputShare)}; <60% by late October`,
  },
  {
    forecast: 'US CPI September',
    'then said': `${s.inflation.september6HeadlineSeptemberPct.toFixed(2)}%`,
    happened: `${s.inflation.observedSeptemberHeadlinePct}% (core over-predicted, fuel under-assumed)`,
  },
  {
    forecast: 'Payroll trend above 90k',
    'then said': pct(s.inflation.september6ProbabilityTrendAbove90k),
    happened: `${pct(s.inflation.probabilityTrendAbove90kNow)} naive, ${pct(s.inflation.filteredProbabilityTrendAbove90kNow)} filtered (6 Sep filtered: ${pct(s.inflation.filteredSeptember6ProbabilityTrendAbove90k)})`,
  },
]);

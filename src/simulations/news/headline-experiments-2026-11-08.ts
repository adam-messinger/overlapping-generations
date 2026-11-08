/**
 * News-driven stress tests, 8 November 2026.
 *
 * 1. Brent fell 16% in a week ($117.64 -> $98.32) "as traders bet on a
 *    US-Iran deal". How much of the fall can a deal bet explain?
 * 2. Payrolls beat again (165k vs 59k) and a December Fed hike is priced at
 *    ~77%, while pump prices fall. Where is US inflation going, and what is
 *    the hike case resting on?
 * 3. A record El Nino and the warmest October on record. Will 2026 or 2027
 *    beat 2024?
 * 4. A scorecard of the 6 September forecasts against what happened.
 *
 * Every input is dated and sourced inline. JUDGMENT marks a value that is a
 * modelling choice rather than an observation.
 */

import { assertFiniteDeep } from 'tsimulation';

import { clamp, normalCdf } from '../../primitives/math.js';
import {
  LEGACY_FLOW_V1_PRICE_BLOCK,
  OBSERVED_INTENSITY,
  OBSERVED_THROUGHPUT,
  defaultWarSettlementParams,
  hold,
  ramp,
  warSettlementEvidence,
  type WarSettlementParams,
  type WarSettlementScenario,
} from '../war-settlement/data.js';
import {
  WAR_RISK_PREMIUM_USD,
  simulateWarSettlement,
  type WarSettlementResult,
} from '../war-settlement/model.js';
import {
  energyInflationScenarios,
  simulateEnergyInflationV2,
  type EnergyInflationResult,
  type EnergyInflationScenario,
} from './energy-inflation.js';
import {
  ERA5_MONTHLY_ANOMALY_1991_2020,
  ERA5_NOVEMBER_2026_PARTIAL,
  ONI_MONTHLY,
  SERIES_START_YEAR,
} from './el-nino-temperature-data.js';
import {
  backtestPayrollTrend,
  payrollMonthIndex,
  payrollTrendAt,
  type PayrollBacktest,
} from './payroll-trend.js';
import {
  dieselInflationCase,
  ebolaTrajectoryCase,
  evaluateDieselInflationAndFed,
  evaluateEbolaTrajectory,
  evaluateHormuzClosureNarrative,
} from './headline-experiments-2026-09-06.js';

// ---------------------------------------------------------------------------
// 1. Brent: "traders bet on a US-Iran deal"
// ---------------------------------------------------------------------------

export interface BrentDealCase {
  /** ICE Brent front month (January 2027) closes, $/bbl. */
  brentSep29Usd: number;
  brentOct21Usd: number;
  brentOct27Usd: number;
  brentOct30Usd: number;
  brentNov3Usd: number;
  brentNov4Usd: number;
  brentNov6Usd: number;
  /** Polymarket "US-Iran Hormuz deal by 30 November" before and after the 31 October draft framework. */
  polymarketDealByNov30Before: number;
  polymarketDealByNov30After: number;
  /** Polymarket deal by 31 December, after the framework. */
  polymarketDealByDec31: number;
  /** Polymarket: Hormuz traffic back to normal by 31 December (2 November). */
  polymarketNormalTrafficByDec31: number;
  /** Eurasia Group deal odds, cut from 20% to 10% this week. */
  eurasiaDealOddsBefore: number;
  eurasiaDealOddsNow: number;
  /** Rapidan: probability fighting resumes. */
  rapidanFightingResumes: number;
  /** Reuters-sourced: Hormuz crude flows below 60% of normal. */
  hormuzThroughputNow: number;
  /** JPMorgan: global supply minus demand, mb/d. Positive is a surplus. */
  jpmBalanceSeptemberMbd: number;
  jpmBalanceOctoberMbd: number;
  /** IEA OMR: observed stocks below pre-war, end-July and end-September, mb. */
  ieaStockGapEndJulyMb: number;
  ieaStockGapEndSeptemberMb: number;
  /** IEA commentary: Hormuz oil flows in August, mb/d. */
  ieaHormuzFlowAugustMbd: number;
  /** EIA STEO (October): Q4 2026 Brent. */
  eiaQ4BrentUsd: number;
  /** Combat tempo (Epic Fury = 1). JUDGMENT: Qeshm strikes and SAM hits in late October, a stand-off now. */
  octoberIntensity: number;
  intensityNowLow: number;
  intensityNowHigh: number;
  /** Months for Hormuz to normalize after a deal (mines; four tankers lost to mines). JUDGMENT. */
  dealNormalizationMonths: number;
}

export const brentDealCase: BrentDealCase = {
  // https://www.nationthailand.com/news/world/40071680 ($102.59, 29 Sep);
  // https://www.nationthailand.com/news/world/40072588 ($108.82, 21 Oct);
  // https://tradingeconomics.com/commodity/brent-crude-oil ($114.55, 27 Oct);
  // https://financefeeds.com/brent-crude-oil-price-98-32-saturday-week-ahead-us-iran-deal-bets-cpi-10-november-bull-105-bear-93/
  // ($117.64 on 30 Oct, $93.52 on 4 Nov after -9.73%, $98.32 on 6 Nov);
  // https://oilprice.com/Latest-Energy-News/World-News/Brent-Falls-to-100-as-Traders-Bet-on-a-US-Iran-Deal.html
  // (-$3.04 to $100.60 intraday on 4 Nov, so $103.64 on 3 Nov).
  brentSep29Usd: 102.59,
  brentOct21Usd: 108.82,
  brentOct27Usd: 114.55,
  brentOct30Usd: 117.64,
  brentNov3Usd: 103.64,
  brentNov4Usd: 93.52,
  brentNov6Usd: 98.32,
  // https://www.riotimesonline.com/hormuz-deal-odds-jump-us-iran-draft/
  polymarketDealByNov30Before: 0.235,
  polymarketDealByNov30After: 0.34,
  polymarketDealByDec31: 0.415,
  polymarketNormalTrafficByDec31: 0.07,
  // https://startupfortune.com/brent-crude-drops-16-in-a-week-to-98-as-traders-bet-on-a-us-iran-deal/
  eurasiaDealOddsBefore: 0.2,
  eurasiaDealOddsNow: 0.1,
  // https://cnbc.com/2026/11/06/oil-price-today-brent-wti.html (via the
  // FinanceFeeds and BigGo summaries)
  rapidanFightingResumes: 0.8,
  // https://finance.biggo.com/news/ebb2a1cb-d2a6-4a13-9051-50aa312b0b83
  // (flows <60%, JPMorgan balances, Middle East exports 20.7 vs 9.8 mb/d).
  hormuzThroughputNow: 0.58,
  jpmBalanceSeptemberMbd: 1.1,
  jpmBalanceOctoberMbd: 1.4,
  // IEA OMR August (410 mb) and October (509 mb) via
  // https://gcaptain.com/iea-moves-to-accelerate-oil-reserve-releases-as-hormuz-crisis-drags-on/
  ieaStockGapEndJulyMb: 410,
  ieaStockGapEndSeptemberMb: 509,
  // https://www.iea.org/commentaries/how-global-oil-supplies-have-readjusted-to-help-fill-the-huge-gap-left-by-the-strait-of-hormuz-shock
  ieaHormuzFlowAugustMbd: 7.6,
  eiaQ4BrentUsd: 105,
  octoberIntensity: 1.0,
  intensityNowLow: 0.6,
  intensityNowHigh: 0.9,
  dealNormalizationMonths: 4,
};

/**
 * Observed Hormuz throughput: August from the IEA (7.6 of 20.9 mb/d); October
 * "below 60%" (Reuters); September interpolated between them. The 6 September
 * pass inverted the old price block on $96 instead (0.23 / 0.31); the IEA
 * figure, unavailable then, supersedes that.
 */
const AUGUST_THROUGHPUT = 0.36;
const SEPTEMBER_THROUGHPUT = 0.47;
/** Combat tempo, August and September, as on 6 September. JUDGMENT. */
const AUGUST_INTENSITY = 0.35;
const SEPTEMBER_INTENSITY = 0.9;
/** Month indices from March 2026. */
const SEPTEMBER = 6;
const OCTOBER = 7;
const NOVEMBER = 8;
const JANUARY_2027 = 10;

type PriceBlock = WarSettlementParams['priceBlock'];

function novemberBranch(
  input: BrentDealCase,
  tail: { intensity: readonly number[]; throughput: readonly number[] },
  priceBlock: PriceBlock = 'stocks-v2',
): WarSettlementResult {
  const scenario: WarSettlementScenario = {
    id: 'november-2026',
    label: 'november-2026',
    description: 'Observed record through October 2026, then a November branch.',
    startYear: 2026,
    startMonth: 3,
    months: 18,
    baseIntensityPath: [
      ...OBSERVED_INTENSITY,
      AUGUST_INTENSITY,
      SEPTEMBER_INTENSITY,
      input.octoberIntensity,
      ...tail.intensity,
    ],
    hormuzThroughputPath: [
      ...OBSERVED_THROUGHPUT,
      AUGUST_THROUGHPUT,
      SEPTEMBER_THROUGHPUT,
      input.hormuzThroughputNow,
      ...tail.throughput,
    ],
  };
  return simulateWarSettlement(scenario, priceBlock === 'flow-v1' ? LEGACY_FLOW_V1_PRICE_BLOCK : {});
}

export interface BrentDealResult {
  case: BrentDealCase;
  initialV1: {
    weeklyFallUsd: number;
    weeklyFallShare: number;
    /** Deal branch, January 2027 delivery (the contract that fell). */
    dealPriceJanuaryUsd: number;
    /** If last week's close were the no-deal value, the deal probability $98.32 implies. */
    impliedDealProbability: number;
    /** That jump (from zero at $117.64) over the largest observed move in deal odds this week. */
    impliedOverObservedOddsMove: number;
    flaw: string;
  };
  revisedV2: {
    /** Price change a move in deal odds can explain: Δp × (no-deal − deal), at most. */
    dealOddsMoveExplainsUsdAtMost: number;
    dealOddsMoveShareOfFallAtMost: number;
    /** Δp needed for the deal bet to explain the whole fall, at the widest spread. */
    dealOddsMoveNeededForWholeFall: number;
    /** Status quo (flows held at 58%), November Brent at each tempo. */
    statusQuoNovemberAtTempoUsd: { tempo: number; brentUsd: number }[];
    /** Status quo at October tempo, October Brent, against the observed $103–118. */
    modelOctoberUsd: number;
    /** Re-closure at full tempo, highest monthly Brent November–January. */
    escalationPeakNovToJanUsd: number;
    /** 30 October close minus that peak. */
    october30AboveEscalationPeakUsd: number;
    /** Deal probability implied by $98.32 if the no-deal value is the model's status quo at that tempo. */
    impliedDealProbabilityAtModelNoDeal: { tempo: number; probability: number }[];
    /** Holdout: observed stock gap at end-September, stock block and legacy block, vs the IEA's 509 mb. */
    stockGapEndSeptemberMb: { stocksV2: number; flowV1: number; iea: number };
    /** Status quo: commercial stocks below pre-war, end-October, and the inventory part of the price. */
    commercialGapOctoberMb: number;
    /** IEA August flow as a share of the 20.9 mb/d norm (Sept 6's stock identity gave 26–46%). */
    ieaAugustThroughputShare: number;
    interpretation: string;
  };
}

export function evaluateBrentDealRepricing(input: BrentDealCase = brentDealCase): BrentDealResult {
  assertFiniteDeep(input, 'Brent deal case');
  const normal = warSettlementEvidence.oil.hormuzNormalFlowMbd;

  // Branches from November. Deal: tempo collapses, flows normalize over the
  // mine-clearance window. Escalation: full tempo and a re-closure.
  const deal = novemberBranch(input, {
    intensity: [0.3, ...hold(0.1, 12)],
    throughput: [...ramp(input.hormuzThroughputNow, 1, input.dealNormalizationMonths), ...hold(1, 12)],
  });
  const escalation = novemberBranch(input, {
    intensity: hold(1.05, 12),
    throughput: [...ramp(input.hormuzThroughputNow, 0.2, 3), ...hold(0.2, 12)],
  });
  const statusQuoAt = (tempo: number, block: PriceBlock = 'stocks-v2') =>
    novemberBranch(input, { intensity: hold(tempo, 12), throughput: hold(input.hormuzThroughputNow, 12) }, block);
  const dealJan = deal.months[JANUARY_2027]?.brentUsdPerBarrel ?? Number.NaN;

  // --- V1: the whole fall is a deal bet, last week's close the no-deal value.
  const fall = input.brentOct30Usd - input.brentNov6Usd;
  const v1Probability = fall / (input.brentOct30Usd - dealJan);

  // --- V2a: what a move in deal odds can explain at most. The spread between
  // the no-deal and deal values cannot exceed last week's close minus the
  // deal price, and the largest observed odds move is Polymarket's 10.5 points.
  const dealOddsMove = input.polymarketDealByNov30After - input.polymarketDealByNov30Before;
  const widestSpread = input.brentOct30Usd - dealJan;
  const explainsAtMost = dealOddsMove * widestSpread;

  // --- V2b: the no-deal value at observed flows, from the stock-clearing block.
  const statusQuo = [input.intensityNowLow, input.intensityNowHigh, 1].map((tempo) => ({
    tempo,
    brentUsd: statusQuoAt(tempo).months[NOVEMBER]?.brentUsdPerBarrel ?? Number.NaN,
  }));
  const central = statusQuoAt(input.octoberIntensity);
  const peak = Math.max(
    ...escalation.months.slice(NOVEMBER, JANUARY_2027 + 1).map((m) => m.brentUsdPerBarrel),
  );
  const impliedAtModel = statusQuo
    .filter((s) => s.tempo < 1)
    .map(({ tempo, brentUsd }) => ({
      tempo,
      probability: clamp((brentUsd - input.brentNov6Usd) / (brentUsd - dealJan), 0, 1),
    }));
  const gapAt = (r: WarSettlementResult) => r.months[SEPTEMBER]?.observedStockGapMb ?? Number.NaN;

  const result: BrentDealResult = {
    case: input,
    initialV1: {
      weeklyFallUsd: fall,
      weeklyFallShare: fall / input.brentOct30Usd,
      dealPriceJanuaryUsd: dealJan,
      impliedDealProbability: v1Probability,
      impliedOverObservedOddsMove: v1Probability / dealOddsMove,
      flaw:
        'Treats the 30 October close as the no-deal value, so every dollar of the fall becomes deal probability; the implied jump is several times any observed move in deal odds.',
    },
    revisedV2: {
      dealOddsMoveExplainsUsdAtMost: explainsAtMost,
      dealOddsMoveShareOfFallAtMost: explainsAtMost / fall,
      dealOddsMoveNeededForWholeFall: fall / widestSpread,
      statusQuoNovemberAtTempoUsd: statusQuo,
      modelOctoberUsd: central.months[OCTOBER]?.brentUsdPerBarrel ?? Number.NaN,
      escalationPeakNovToJanUsd: peak,
      october30AboveEscalationPeakUsd: input.brentOct30Usd - peak,
      impliedDealProbabilityAtModelNoDeal: impliedAtModel,
      stockGapEndSeptemberMb: {
        stocksV2: gapAt(central),
        flowV1: gapAt(statusQuoAt(input.octoberIntensity, 'flow-v1')),
        iea: input.ieaStockGapEndSeptemberMb,
      },
      commercialGapOctoberMb: central.months[OCTOBER]?.commercialStockGapMb ?? Number.NaN,
      ieaAugustThroughputShare: input.ieaHormuzFlowAugustMbd / normal,
      interpretation:
        'The deal bet explains at most about a quarter of the fall. With stocks cleared against price, the status quo at observed flows prices Brent near today\'s $98; the 30 October close needed most of a re-closure priced in. The week repriced re-closure, not a deal.',
    },
  };
  assertFiniteDeep(result, 'Brent deal result');
  return result;
}

// ---------------------------------------------------------------------------
// 2. December hike: falling fuel, strong payrolls
// ---------------------------------------------------------------------------

export interface FedDecemberCase {
  /** BLS CPI 12-month, %: July, August, September 2026, headline and core. */
  headlineCpi: readonly [number, number, number];
  coreCpi: readonly [number, number, number];
  /** AAA regular gasoline, $/gal, monthly averages: September, October; latest; December judgment. */
  gasolineSeptember: number;
  gasolineOctober: number;
  gasolineNow: number;
  /** RBOB futures plus ~$1.07 of tax and margin. JUDGMENT. */
  gasolineDecember: number;
  /** Diesel, $/gal: September, October, latest, December (ULSD futures + $1.25). */
  dieselSeptember: number;
  dieselOctober: number;
  dieselNow: number;
  dieselDecember: number;
  /** Relapse branch: fighting resumes and pump prices return to the October peak. */
  gasolineRelapse: number;
  dieselRelapse: number;
  fedFundsMidpointPct: number;
  /** CME FedWatch, December 8–9 quarter-point hike. */
  decemberHikeOdds: number;
  payrollsAugustRevised: number;
  payrollsSeptemberRevised: number;
  payrollsOctober: number;
  payrollsConsensusOctober: number;
  unemploymentRate: number;
  previousUnemploymentRate: number;
  averageHourlyEarningsYoy: number;
  /** Wage growth consistent with 2% inflation at 1.5% trend productivity. JUDGMENT. */
  wageGrowthConsistentWithTarget: number;
}

export const fedDecemberCase: FedDecemberCase = {
  // BLS via https://www.cnbc.com/2026/10/14/cpi-inflation-report-september-2026.html
  headlineCpi: [3.4, 3.4, 3.7],
  coreCpi: [2.5, 2.4, 2.6],
  // AAA: October averaged $4.31, about 1% below September; $4.04 on 7 Nov.
  // https://newsroom.aaa.com/2026/11/national-average-falls-12-cents-in-one-week/
  gasolineSeptember: 4.35,
  gasolineOctober: 4.31,
  gasolineNow: 4.04,
  gasolineDecember: 3.85,
  dieselSeptember: 5.9,
  dieselOctober: 6.35,
  dieselNow: 6.21,
  dieselDecember: 5.6,
  gasolineRelapse: 4.4,
  dieselRelapse: 6.4,
  // FOMC held 3.75–4.00% on 4 November (10–2).
  fedFundsMidpointPct: 3.875,
  // https://www.cnbc.com/2026/11/06/jobs-report-october-2026.html
  decemberHikeOdds: 0.768,
  payrollsAugustRevised: 186,
  payrollsSeptemberRevised: 60,
  payrollsOctober: 165,
  payrollsConsensusOctober: 59,
  unemploymentRate: 4.1,
  previousUnemploymentRate: 4.2,
  averageHourlyEarningsYoy: 3.1,
  wageGrowthConsistentWithTarget: 3.5,
};

export interface FedPathSummary {
  id: 'look-through' | 'hike-rule' | 'relapse';
  peakHeadlinePct: number;
  peakHeadlineMonth: string;
  headlineDec2026Pct: number;
  headlineJun2027Pct: number;
  headlineDec2027Pct: number;
  coreDec2026Pct: number;
  policyRateDec2026Pct: number;
  troughOutputGapPct: number;
}

export interface FedDecemberResult {
  case: FedDecemberCase;
  initialV1: {
    /** September 6's path (September fuel held), re-run: its September and December headline. */
    september6HeadlineSeptemberPct: number;
    september6HeadlineDec2026Pct: number;
    /** The same model's July–September headline and core, against the prints. */
    modelHeadlineJulToSep: number[];
    modelCoreJulToSep: number[];
    meanHeadlineErrorPp: number;
    meanCoreErrorPp: number;
    flaw: string;
  };
  revisedV2: {
    /** Starting expected inflation and indirect pass-through re-fitted on the July–September prints. */
    fittedExpectedInflationPct: number;
    fittedIndirectPassThrough: number;
    defaultIndirectPassThrough: number;
    v1FitRmsePp: number;
    fitRmsePp: number;
    lookThrough: FedPathSummary;
    hikeRule: FedPathSummary;
    relapse: FedPathSummary;
    hikeBuysDec2027Pp: number;
    hikeCostsOutputGapPp: number;
    labour: {
      /** Naive read (the 6 September method): three latest prints, sampling error only. */
      threeMonthAverageThousand: number;
      threeMonthStandardErrorThousand: number;
      probabilityTrendAbove90k: number;
      september6ProbabilityTrendAbove90k: number;
      octoberSurpriseSigma: number;
      wageGapToTargetConsistentPp: number;
      /** Revision-aware filter (payroll-trend.ts), as of the October release and, in real time, the August one. */
      filtered: {
        trendThousand: number;
        trendSdThousand: number;
        probabilityTrendAbove90k: number;
        probabilityTrendAbove30k: number;
        firstPrintBiasThousand: number;
        september6TrendThousand: number;
        september6ProbabilityTrendAbove90k: number;
        backtest: PayrollBacktest;
      };
    };
    interpretation: string;
  };
}

const MONTH_LABELS = (() => {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Array.from({ length: 36 }, (_, i) => `${names[(i + 2) % 12]} ${2026 + Math.floor((i + 2) / 12)}`);
})();

function usScenario(
  path: readonly number[],
  expectedInflationPct: number,
  policy: { supplyShockLookThrough: number; policyInflationResponse: number },
  startingPolicyRatePct: number,
  indirectCorePassThrough = DEFAULT_INDIRECT_PASS_THROUGH,
): EnergyInflationScenario {
  const c = dieselInflationCase;
  return {
    ...energyInflationScenarios['euro-area-2026-current'],
    id: 'us-2026-11',
    label: 'us-2026-11',
    importEnergyPricePath: path,
    startingHeadlineInflationPct: c.headlineCpiFeb2026,
    startingCoreInflationPct: c.coreCpiFeb2026,
    startingExpectedInflationPct: expectedInflationPct,
    startingPolicyRatePct,
    startingOutputGapPct: 0,
    neutralPolicyRatePct: c.neutralRatePct,
    energyCpiWeight: c.energyCpiWeight,
    directConsumerPassThrough: 1,
    directAdjustmentHalfLifeMonths: 1,
    fiscalShieldingShare: 0,
    exchangeRateAmplification: 1,
    inflationAttention: 0.9,
    supplyShockLookThrough: policy.supplyShockLookThrough,
    policyInflationResponse: policy.policyInflationResponse,
    indirectCorePassThrough,
  };
}

const DEFAULT_INDIRECT_PASS_THROUGH: number = energyInflationScenarios['euro-area-2026-current'].indirectCorePassThrough;

function summarizeFedPath(id: FedPathSummary['id'], result: EnergyInflationResult): FedPathSummary {
  // Month 0 = March 2026.
  const at = (i: number) => {
    const m = result.months[i];
    if (!m) throw new Error('Policy path too short');
    return m;
  };
  let peak = 0;
  for (let i = 0; i < 22; i++) if (at(i).headlineInflationPct > at(peak).headlineInflationPct) peak = i;
  return {
    id,
    peakHeadlinePct: at(peak).headlineInflationPct,
    peakHeadlineMonth: MONTH_LABELS[peak] ?? '',
    headlineDec2026Pct: at(9).headlineInflationPct,
    headlineJun2027Pct: at(15).headlineInflationPct,
    headlineDec2027Pct: at(21).headlineInflationPct,
    coreDec2026Pct: at(9).coreInflationPct,
    policyRateDec2026Pct: at(9).policyRatePct,
    troughOutputGapPct: result.troughOutputGapPct,
  };
}

export function evaluateFedDecemberHike(input: FedDecemberCase = fedDecemberCase): FedDecemberResult {
  assertFiniteDeep(input, 'Fed December case');
  const c = dieselInflationCase;
  const otherWeight = c.energyCpiWeight - c.motorFuelCpiWeight;
  const motorFuel = (gasoline: number, diesel: number) =>
    0.8 * (gasoline / c.gasolineUsdPerGalBase2025) + 0.2 * (diesel / c.dieselUsdPerGalYearAgo);
  const blend = (gasoline: number, diesel: number) =>
    (c.motorFuelCpiWeight * motorFuel(gasoline, diesel) + otherWeight * 1.05) / c.energyCpiWeight;
  // March–August as on 6 September (AAA/BLS anchors; see headline-experiments-2026-09-06).
  const julyDiesel = c.dieselUsdPerGalJulyWeekly.reduce((a, b) => a + b, 0) / c.dieselUsdPerGalJulyWeekly.length;
  const marchToAugust = [
    blend(4.2, 4.0),
    blend(4.6, 4.4),
    blend(4.3, 4.5),
    blend(3.98, 4.6),
    blend(c.gasolineUsdPerGalBase2025 * (1 + c.gasolineYoyJuly), julyDiesel),
    blend(4.0, 5.47),
  ];
  const septemberToDecember = [
    blend(input.gasolineSeptember, input.dieselSeptember),
    blend(input.gasolineOctober, input.dieselOctober),
    blend(input.gasolineNow, input.dieselNow),
    blend(input.gasolineDecember, input.dieselDecember),
  ];
  const decemberLevel = septemberToDecember[3] ?? 1;
  const basePath = [...marchToAugust, ...septemberToDecember, ...hold(decemberLevel, 26)];
  const relapseLevel = blend(input.gasolineRelapse, input.dieselRelapse);
  const relapsePath = [...marchToAugust, ...septemberToDecember.slice(0, 3), ...hold(relapseLevel, 27)];
  const september6Level = blend(c.gasolineUsdPerGalNow, c.dieselUsdPerGalNow);
  const september6Path = [...marchToAugust, ...hold(september6Level, 30)];

  const lookThroughRule = { supplyShockLookThrough: 0.9, policyInflationResponse: 0.5 };
  const hikeRule = { supplyShockLookThrough: 0.3, policyInflationResponse: 1.0 };

  // --- V1: the 6 September model with this autumn's fuel path. Its error on
  // the July–September prints is the calibration check.
  const v1 = simulateEnergyInflationV2(usScenario(basePath, 2.6, lookThroughRule, c.fedFundsMidpointPct));
  const september6Run = simulateEnergyInflationV2(usScenario(september6Path, 2.6, lookThroughRule, c.fedFundsMidpointPct));
  const julToSep = [4, 5, 6];
  const v1Headline = julToSep.map((i) => v1.months[i]?.headlineInflationPct ?? Number.NaN);
  const v1Core = julToSep.map((i) => v1.months[i]?.coreInflationPct ?? Number.NaN);
  const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  // --- V2: refit core's two free parameters, starting expected inflation and
  // indirect energy pass-through, on the six prints (grid), then rerun the rules.
  const fitError = (expected: number, passThrough: number) => {
    const r = simulateEnergyInflationV2(
      usScenario(basePath, expected, lookThroughRule, c.fedFundsMidpointPct, passThrough),
    );
    let sse = 0;
    julToSep.forEach((month, k) => {
      sse += ((r.months[month]?.headlineInflationPct ?? 0) - (input.headlineCpi[k] ?? 0)) ** 2;
      sse += ((r.months[month]?.coreInflationPct ?? 0) - (input.coreCpi[k] ?? 0)) ** 2;
    });
    return Math.sqrt(sse / 6);
  };
  let fitted = 2.6;
  let fittedPassThrough = DEFAULT_INDIRECT_PASS_THROUGH;
  let best = Number.POSITIVE_INFINITY;
  for (let e = 1.8; e <= 3.0 + 1e-9; e += 0.05) {
    for (let pt = 0; pt <= 0.05 + 1e-9; pt += 0.0025) {
      const err = fitError(e, pt);
      if (err < best) {
        best = err;
        fitted = Math.round(e * 100) / 100;
        fittedPassThrough = Math.round(pt * 10_000) / 10_000;
      }
    }
  }
  const v1Rmse = fitError(2.6, DEFAULT_INDIRECT_PASS_THROUGH);
  const lookThrough = summarizeFedPath(
    'look-through',
    simulateEnergyInflationV2(usScenario(basePath, fitted, lookThroughRule, input.fedFundsMidpointPct, fittedPassThrough)),
  );
  const hike = summarizeFedPath(
    'hike-rule',
    simulateEnergyInflationV2(usScenario(basePath, fitted, hikeRule, input.fedFundsMidpointPct, fittedPassThrough)),
  );
  const relapse = summarizeFedPath(
    'relapse',
    simulateEnergyInflationV2(usScenario(relapsePath, fitted, lookThroughRule, input.fedFundsMidpointPct, fittedPassThrough)),
  );

  // --- Payrolls: the same signal extraction as 6 September, with revisions.
  const monthlySe = c.payrollsCi90Thousand / 1.645;
  const threeMonth = (input.payrollsAugustRevised + input.payrollsSeptemberRevised + input.payrollsOctober) / 3;
  const threeMonthSe = monthlySe / Math.sqrt(3);
  const september6Analysis = evaluateDieselInflationAndFed();
  const filteredNow = payrollTrendAt(payrollMonthIndex(2026, 10));
  const filteredSeptember6 = payrollTrendAt(payrollMonthIndex(2026, 8));
  const backtest = backtestPayrollTrend(payrollMonthIndex(2024, 1), payrollMonthIndex(2026, 8));

  const result: FedDecemberResult = {
    case: input,
    initialV1: {
      september6HeadlineSeptemberPct: september6Run.months[6]?.headlineInflationPct ?? Number.NaN,
      september6HeadlineDec2026Pct: september6Run.months[9]?.headlineInflationPct ?? Number.NaN,
      modelHeadlineJulToSep: v1Headline,
      modelCoreJulToSep: v1Core,
      meanHeadlineErrorPp: mean(v1Headline.map((v, k) => v - (input.headlineCpi[k] ?? 0))),
      meanCoreErrorPp: mean(v1Core.map((v, k) => v - (input.coreCpi[k] ?? 0))),
      flaw: 'Runs core about 0.2pp hot over July–September, which carries straight into every forecast month.',
    },
    revisedV2: {
      fittedExpectedInflationPct: fitted,
      fittedIndirectPassThrough: fittedPassThrough,
      defaultIndirectPassThrough: DEFAULT_INDIRECT_PASS_THROUGH,
      v1FitRmsePp: v1Rmse,
      fitRmsePp: best,
      lookThrough,
      hikeRule: hike,
      relapse,
      hikeBuysDec2027Pp: lookThrough.headlineDec2027Pct - hike.headlineDec2027Pct,
      hikeCostsOutputGapPp: hike.troughOutputGapPct - lookThrough.troughOutputGapPct,
      labour: {
        threeMonthAverageThousand: threeMonth,
        threeMonthStandardErrorThousand: threeMonthSe,
        probabilityTrendAbove90k: 1 - normalCdf((c.breakevenHighThousand - threeMonth) / threeMonthSe),
        september6ProbabilityTrendAbove90k: september6Analysis.revisedV2.labour.probabilityTrendAboveBreakevenHigh,
        octoberSurpriseSigma: (input.payrollsOctober - input.payrollsConsensusOctober) / monthlySe,
        wageGapToTargetConsistentPp: input.averageHourlyEarningsYoy - input.wageGrowthConsistentWithTarget,
        filtered: {
          trendThousand: filteredNow.trend,
          trendSdThousand: filteredNow.trendSd,
          probabilityTrendAbove90k: filteredNow.probabilityAbove(c.breakevenHighThousand),
          probabilityTrendAbove30k: filteredNow.probabilityAbove(c.breakevenLowThousand),
          firstPrintBiasThousand: filteredNow.firstPrintBias,
          september6TrendThousand: filteredSeptember6.trend,
          september6ProbabilityTrendAbove90k: filteredSeptember6.probabilityAbove(c.breakevenHighThousand),
          backtest,
        },
      },
      interpretation:
        'Headline peaked in October on the fuel path already in hand and falls under any rule; the hike barely moves 2027 inflation. Filtered for revisions, the payroll trend sits at the top of the breakeven range, a coin flip on overheating, and wages are below the pace that would threaten 2%.',
    },
  };
  assertFiniteDeep(result, 'Fed December result');
  return result;
}

// ---------------------------------------------------------------------------
// 3. El Nino: will 2026 or 2027 beat 2024?
// ---------------------------------------------------------------------------

export interface ElNinoCase {
  /** ERA5 offset, 1991–2020 to 1850–1900 (Copernicus). */
  preindustrialOffset: number;
  /** ENSO lag, months, chosen on the 2026 holdout (see the doc). */
  ensoLagMonths: number;
  fitStartYear: number;
  fitEndYear: number;
  /** Years excluded for volcanic cooling (El Chichon, Pinatubo). */
  volcanicYears: readonly number[];
  /** Post-peak years of the three prior strong El Ninos. */
  strongEventYears: readonly number[];
  /** ONI path, October 2026 to December 2027 (centred months). JUDGMENT from the
   *  CPC outlook (peak Oct–Dec, 83% strong-to-very-strong) and private outlooks
   *  (neutral by May, La Nina later in 2027). */
  oniPathFromOctober2026: readonly number[];
  oniPeakSensitivity: readonly number[];
  /** Copernicus statements, 6 November. */
  copernicusProjection2026: { low: number; high: number };
  copernicusRecordChance2026: number;
}

export const elNinoCase: ElNinoCase = {
  // https://climate.copernicus.eu/copernicus-warmest-october-record-2026-virtually-certain-exceed-15degc
  preindustrialOffset: 0.88,
  ensoLagMonths: 2,
  fitStartYear: 1970,
  fitEndYear: 2025,
  volcanicYears: [1982, 1983, 1984, 1991, 1992, 1993],
  strongEventYears: [1998, 2016, 2024],
  oniPathFromOctober2026: [2.7, 2.9, 3.0, 2.9, 2.5, 1.9, 1.2, 0.5, 0.0, -0.4, -0.7, -0.9, -1.0, -1.0, -1.0],
  oniPeakSensitivity: [0.8, 1.0, 1.15],
  copernicusProjection2026: { low: 1.56, high: 1.61 },
  copernicusRecordChance2026: 0.2,
};

interface MonthKey {
  year: number;
  month: number; // 1-12
}

const monthIndex = ({ year, month }: MonthKey): number => (year - SERIES_START_YEAR) * 12 + (month - 1);
const shift = ({ year, month }: MonthKey, back: number): MonthKey => {
  const i = year * 12 + (month - 1) - back;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
};

/** Ordinary least squares via normal equations; columns are few and well scaled. */
function leastSquares(rows: readonly number[][], y: readonly number[]): number[] {
  const k = rows[0]?.length ?? 0;
  const a = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
  rows.forEach((row, n) => {
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) a[i]![j]! += row[i]! * row[j]!;
      a[i]![k]! += row[i]! * y[n]!;
    }
  });
  for (let col = 0; col < k; col++) {
    let pivot = col;
    for (let r = col + 1; r < k; r++) if (Math.abs(a[r]![col]!) > Math.abs(a[pivot]![col]!)) pivot = r;
    [a[col], a[pivot]] = [a[pivot]!, a[col]!];
    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const f = a[r]![col]! / a[col]![col]!;
      for (let j = col; j <= k; j++) a[r]![j]! -= f * a[col]![j]!;
    }
  }
  return a.map((row, i) => row[k]! / row[i]!);
}

export interface ElNinoYear {
  year: number;
  annualAnomalyPreindustrial: number;
  probabilityAbove2024: number;
}

export interface ElNinoResult {
  case: ElNinoCase;
  fit: {
    ensoCoefficient: number;
    trendLevel2026: number;
    trendSlopePerDecade: number;
    monthlyResidualSd: number;
    annualResidualSd: number;
    /** Annual residual in the post-peak year of each prior strong El Nino. */
    strongEventResiduals: { year: number; residual: number }[];
    strongEventExcess: number;
    residuals2023to2025: number[];
  };
  observed: {
    record2024: number;
    januaryToOctober2026: number;
    october2026: number;
    novemberFirstDays2026: number;
    novemberDays: number;
    /** Mean November–December 2026 needed to tie 2024. */
    novDecNeededToTie2024: number;
  };
  holdout2026: {
    /** Mean residual of the regression (no adjustment), H1 and July–October 2026. */
    firstHalfResidual: number;
    julyToOctoberResidual: number;
    /** Same, with the strong-event excess applied from July. */
    julyToOctoberResidualV2: number;
  };
  initialV1: { year2026: ElNinoYear; year2027: ElNinoYear };
  revisedV2: {
    year2026: ElNinoYear;
    year2027: ElNinoYear;
    peakMonth2027: { label: string; anomaly: number };
    /** 2027 under weaker and stronger peaks (ONI path scaled). */
    peakSensitivity2027: { scale: number; anomaly: number; probabilityAbove2024: number }[];
  };
  climateModule: {
    /** The repo's climate module, default run: 2026 and 2027 forced warming. */
    forced2026: number;
    forced2027: number;
    /** Module forced level plus the fitted ENSO term. */
    moduleWithEnso2027: number;
    /** Regression trend (ENSO removed) for the same years, for comparison. */
    regressionTrend2026: number;
    regressionTrend2027: number;
  };
  interpretation: string;
}

export function evaluateElNinoTemperature(
  input: ElNinoCase = elNinoCase,
  climateModuleForced: { y2026: number; y2027: number } = { y2026: 1.439, y2027: 1.463 },
): ElNinoResult {
  assertFiniteDeep(input, 'El Nino case');
  const temp = (k: MonthKey): number | undefined => {
    const v = ERA5_MONTHLY_ANOMALY_1991_2020[monthIndex(k)];
    return v === undefined ? undefined : v + input.preindustrialOffset;
  };
  const oniPath = (scale: number) => (k: MonthKey): number | undefined => {
    const i = monthIndex(k);
    if (i < ONI_MONTHLY.length) return ONI_MONTHLY[i];
    const j = i - ONI_MONTHLY.length;
    const v = input.oniPathFromOctober2026[j];
    return v === undefined ? undefined : v * (v > 0 ? scale : 1);
  };
  const oni = oniPath(1);
  const centre = (k: MonthKey) => k.year + (k.month - 0.5) / 12 - 2000;
  const row = (k: MonthKey, e: number) => {
    const s = centre(k);
    return [1, s, s * s, e];
  };

  const rows: number[][] = [];
  const ys: number[] = [];
  const keys: MonthKey[] = [];
  for (let year = input.fitStartYear; year <= input.fitEndYear; year++) {
    if (input.volcanicYears.includes(year)) continue;
    for (let month = 1; month <= 12; month++) {
      const k = { year, month };
      const t = temp(k);
      const e = oni(shift(k, input.ensoLagMonths));
      if (t === undefined || e === undefined) continue;
      rows.push(row(k, e));
      ys.push(t);
      keys.push(k);
    }
  }
  const coef = leastSquares(rows, ys);
  const predict = (k: MonthKey, enso: (k: MonthKey) => number | undefined): number => {
    const e = enso(shift(k, input.ensoLagMonths));
    if (e === undefined) throw new Error(`No ENSO value for ${k.year}-${k.month}`);
    return row(k, e).reduce((acc, x, i) => acc + x * coef[i]!, 0);
  };
  const residuals = ys.map((y, n) => y - predict(keys[n]!, oni));
  const sd = (xs: readonly number[]) => {
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
  };
  const annualResidual = (year: number) => {
    let s = 0;
    for (let month = 1; month <= 12; month++) {
      const k = { year, month };
      s += (temp(k) ?? 0) - predict(k, oni);
    }
    return s / 12;
  };
  const annualResiduals: number[] = [];
  for (let year = input.fitStartYear; year <= input.fitEndYear; year++) {
    if (!input.volcanicYears.includes(year)) annualResiduals.push(annualResidual(year));
  }
  const annualSd = sd(annualResiduals);
  const strong = input.strongEventYears.map((year) => ({ year, residual: annualResidual(year) }));
  const excess = strong.reduce((a, b) => a + b.residual, 0) / strong.length;
  const excessSd = sd(strong.map((s) => s.residual));

  const record2024 = Array.from({ length: 12 }, (_, i) => temp({ year: 2024, month: i + 1 }) ?? 0)
    .reduce((a, b) => a + b, 0) / 12;
  const observed2026 = Array.from({ length: 10 }, (_, i) => temp({ year: 2026, month: i + 1 }) ?? 0);
  const janToOct = observed2026.reduce((a, b) => a + b, 0) / 10;

  // 2026: ten observed months plus November–December forecast. V1: the
  // regression alone. V2: plus the strong-event excess, which the July–October
  // holdout supports.
  const forecastMonth = (k: MonthKey, add: number, enso = oni) => predict(k, enso) + add;
  const novObserved = ERA5_NOVEMBER_2026_PARTIAL.anomaly1991_2020 + input.preindustrialOffset;
  const novObservedWeight = ERA5_NOVEMBER_2026_PARTIAL.days / 30;
  const year2026 = (add: number): ElNinoYear => {
    const novForecast = forecastMonth({ year: 2026, month: 11 }, add);
    const nov = novObservedWeight * novObserved + (1 - novObservedWeight) * novForecast;
    const dec = forecastMonth({ year: 2026, month: 12 }, add);
    const observedSum = observed2026.reduce((a, b) => a + b, 0);
    const annual = (observedSum + nov + dec) / 12;
    // Uncertainty: the unobserved 24 November days and December. Their mean
    // has the monthly residual sd shrunk by averaging two autocorrelated
    // months (lag-1 autocorrelation 0.63, fitted), scaled by the unknown weight.
    const unknownWeight = (1 - novObservedWeight + 1) / 2;
    const remainingSd = sd(residuals) * Math.sqrt((1 + 0.63) / 2) * unknownWeight;
    const meanNeeded = (12 * record2024 - observedSum) / 2;
    return {
      year: 2026,
      annualAnomalyPreindustrial: annual,
      probabilityAbove2024: 1 - normalCdf((meanNeeded - (nov + dec) / 2) / remainingSd),
    };
  };
  const year2027 = (add: number, extraSd: number, enso = oni): ElNinoYear => {
    const months = Array.from({ length: 12 }, (_, i) => forecastMonth({ year: 2027, month: i + 1 }, add, enso));
    const annual = months.reduce((a, b) => a + b, 0) / 12;
    const totalSd = Math.sqrt(annualSd ** 2 + extraSd ** 2);
    return {
      year: 2027,
      annualAnomalyPreindustrial: annual,
      probabilityAbove2024: 1 - normalCdf((record2024 - annual) / totalSd),
    };
  };
  const holdoutResidual = (months: readonly number[], add: number) =>
    months.reduce((a, month) => a + (temp({ year: 2026, month }) ?? 0) - predict({ year: 2026, month }, oni) - add, 0) /
    months.length;

  const months2027V2 = Array.from({ length: 12 }, (_, i) => forecastMonth({ year: 2027, month: i + 1 }, excess));
  let peak = 0;
  months2027V2.forEach((v, i) => {
    if (v > months2027V2[peak]!) peak = i;
  });
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendAt = (year: number) =>
    Array.from({ length: 12 }, (_, i) => predict({ year, month: i + 1 }, () => 0)).reduce((a, b) => a + b, 0) / 12;
  const ensoTerm2027 = year2027(0, 0).annualAnomalyPreindustrial - trendAt(2027);

  const result: ElNinoResult = {
    case: input,
    fit: {
      ensoCoefficient: coef[3]!,
      trendLevel2026: trendAt(2026),
      trendSlopePerDecade: 10 * (coef[1]! + 2 * coef[2]! * 26.5),
      monthlyResidualSd: sd(residuals),
      annualResidualSd: annualSd,
      strongEventResiduals: strong,
      strongEventExcess: excess,
      residuals2023to2025: [2023, 2024, 2025].map(annualResidual),
    },
    observed: {
      record2024,
      januaryToOctober2026: janToOct,
      october2026: observed2026[9]!,
      novemberFirstDays2026: novObserved,
      novemberDays: ERA5_NOVEMBER_2026_PARTIAL.days,
      novDecNeededToTie2024: (12 * record2024 - observed2026.reduce((a, b) => a + b, 0)) / 2,
    },
    holdout2026: {
      firstHalfResidual: holdoutResidual([1, 2, 3, 4, 5, 6], 0),
      julyToOctoberResidual: holdoutResidual([7, 8, 9, 10], 0),
      julyToOctoberResidualV2: holdoutResidual([7, 8, 9, 10], excess),
    },
    initialV1: { year2026: year2026(0), year2027: year2027(0, 0) },
    revisedV2: {
      year2026: year2026(excess),
      year2027: year2027(excess, excessSd),
      peakMonth2027: { label: `${names[peak]} 2027`, anomaly: months2027V2[peak]! },
      peakSensitivity2027: input.oniPeakSensitivity.map((scale) => {
        const y = year2027(excess, excessSd, oniPath(scale));
        return { scale, anomaly: y.annualAnomalyPreindustrial, probabilityAbove2024: y.probabilityAbove2024 };
      }),
    },
    climateModule: {
      forced2026: climateModuleForced.y2026,
      forced2027: climateModuleForced.y2027,
      moduleWithEnso2027: climateModuleForced.y2027 + ensoTerm2027,
      regressionTrend2026: trendAt(2026),
      regressionTrend2027: trendAt(2027),
    },
    interpretation:
      '2026 finishes second to 2024 unless November–December average about 1.97°C; 2027, the year after the peak, is the record year, by about a tenth of a degree, because every prior strong El Nino ran warmer the following year than the ENSO index alone predicts.',
  };
  assertFiniteDeep(result, 'El Nino result');
  return result;
}

// ---------------------------------------------------------------------------
// 4. Scorecard: the 6 September forecasts
// ---------------------------------------------------------------------------

export interface EbolaObservation {
  date: string;
  cumulativeConfirmed: number;
  cumulativeDeaths?: number;
}

export const ebolaObservationsAfterSeptember6: readonly EbolaObservation[] = [
  // WHO DON622 (20 Oct: 9,704 / 4,687; 976 cases since the 8 Oct update) and
  // https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON619 (31 Oct: 10,467 / 5,103).
  { date: '2026-10-08', cumulativeConfirmed: 8_728 },
  { date: '2026-10-20', cumulativeConfirmed: 9_704, cumulativeDeaths: 4_687 },
  { date: '2026-10-31', cumulativeConfirmed: 10_467, cumulativeDeaths: 5_103 },
];

export interface ScorecardResult {
  ebola: {
    lastAnchorDate: string;
    lastAnchorCases: number;
    observedWeeklyCasesSinceAnchor: number;
    plateauWeeklyCases: number;
    exponentialCasesAtLastObservation: number;
    plateauCasesAtLastObservation: number;
    observedCasesAtLastObservation: number;
    /** Average weekly incidence since 4 September, held flat to 31 December. */
    runRateCasesByDec31: number;
    projectionsByDec31: { id: string; cases: number }[];
  };
  hormuz: {
    attritionOctNovUsd: [number, number];
    escalationOctNovUsd: [number, number];
    pauseOctNovUsd: [number, number];
    observedOctoberRangeUsd: [number, number];
    observedNovemberToDateRangeUsd: [number, number];
    stockAnchoredThroughputBand: [number, number];
    ieaAugustThroughputShare: number;
  };
  inflation: {
    september6HeadlineSeptemberPct: number;
    observedSeptemberHeadlinePct: number;
    september6ProbabilityTrendAbove90k: number;
    probabilityTrendAbove90kNow: number;
    filteredSeptember6ProbabilityTrendAbove90k: number;
    filteredProbabilityTrendAbove90kNow: number;
  };
}

export function scoreSeptember6Forecasts(): ScorecardResult {
  const ebola = evaluateEbolaTrajectory();
  const hormuz = evaluateHormuzClosureNarrative();
  const fed = evaluateFedDecemberHike();
  const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

  const anchors = ebolaTrajectoryCase.anchors.filter((a) => a.cumulativeCases !== undefined);
  const last = anchors[anchors.length - 1]!;
  const lastObs = ebolaObservationsAfterSeptember6[ebolaObservationsAfterSeptember6.length - 1]!;
  const weeks = days(last.date, lastObs.date) / 7;
  const observedWeekly = (lastObs.cumulativeConfirmed - (last.cumulativeCases ?? 0)) / weeks;
  const plateauWeekly = ebola.revisedV2.weeklyCasesLastFourWeeks;
  // Run-rate held flat at the average since the last 6 September anchor.
  const weeksToDec31 = days(lastObs.date, '2026-12-31') / 7;
  const runRate = lastObs.cumulativeConfirmed + observedWeekly * weeksToDec31;

  const branch = (id: string) => hormuz.revisedV2.branches.find((b) => b.id === id)!;
  const octNov = (id: string): [number, number] => {
    const b = branch(id);
    return [b.brentOctToMarUsd[0]!, b.brentOctToMarUsd[1]!];
  };
  const readings = hormuz.revisedV2.stockAnchored.readings;
  const shares = readings.filter((r) => r.demandElasticity <= 0.2).map((r) => r.impliedHormuzThroughputShare);

  return {
    ebola: {
      lastAnchorDate: last.date,
      lastAnchorCases: last.cumulativeCases ?? 0,
      observedWeeklyCasesSinceAnchor: observedWeekly,
      plateauWeeklyCases: plateauWeekly,
      exponentialCasesAtLastObservation:
        (last.cumulativeCases ?? 0) * Math.pow(2, days(last.date, lastObs.date) / ebola.initialV1.doublingTimeDays),
      plateauCasesAtLastObservation: (last.cumulativeCases ?? 0) + plateauWeekly * weeks,
      observedCasesAtLastObservation: lastObs.cumulativeConfirmed,
      runRateCasesByDec31: runRate,
      projectionsByDec31: [
        { id: 'V1 exponential', cases: ebola.initialV1.projectedCasesByDec31 },
        ...ebola.revisedV2.projections.map((p) => ({ id: p.id, cases: p.confirmedCasesByDec31 })),
      ],
    },
    hormuz: {
      attritionOctNovUsd: octNov('attrition'),
      escalationOctNovUsd: octNov('escalation'),
      pauseOctNovUsd: octNov('pause'),
      observedOctoberRangeUsd: [brentDealCase.brentSep29Usd, brentDealCase.brentOct30Usd],
      observedNovemberToDateRangeUsd: [brentDealCase.brentNov4Usd, brentDealCase.brentNov3Usd],
      stockAnchoredThroughputBand: [Math.min(...shares), Math.max(...shares)],
      ieaAugustThroughputShare: brentDealCase.ieaHormuzFlowAugustMbd / warSettlementEvidence.oil.hormuzNormalFlowMbd,
    },
    inflation: {
      september6HeadlineSeptemberPct: fed.initialV1.september6HeadlineSeptemberPct,
      observedSeptemberHeadlinePct: fedDecemberCase.headlineCpi[2],
      september6ProbabilityTrendAbove90k: fed.revisedV2.labour.september6ProbabilityTrendAbove90k,
      probabilityTrendAbove90kNow: fed.revisedV2.labour.probabilityTrendAbove90k,
      filteredSeptember6ProbabilityTrendAbove90k: fed.revisedV2.labour.filtered.september6ProbabilityTrendAbove90k,
      filteredProbabilityTrendAbove90kNow: fed.revisedV2.labour.filtered.probabilityTrendAbove90k,
    },
  };
}

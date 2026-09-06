import { assertFiniteDeep } from 'tsimulation';

import { clamp, normalCdf } from '../../primitives/math.js';
import { calibrateHormuzModel } from '../critical-materials/hormuz-calibration.js';
import {
  hormuzScenarios,
  type HormuzScenario,
} from '../critical-materials/hormuz-data.js';
import {
  simulateHormuzDisruption,
  type HormuzSimulationResult,
} from '../critical-materials/hormuz-model.js';
import { fitScale, scaledSeries } from '../outbreak/calibration.js';
import type { OutbreakEpisode } from '../outbreak/data.js';
import {
  evaluateEpisode,
  simulateOutbreakV2,
  type EpisodeEvaluation,
  type OutbreakSeries,
  type OutbreakV2Params,
} from '../outbreak/model.js';
import {
  OBSERVED_INTENSITY,
  OBSERVED_MONTHS,
  OBSERVED_THROUGHPUT,
  defaultWarSettlementParams,
  hold,
  ramp,
  warSettlementEvidence,
  type WarSettlementScenario,
} from '../war-settlement/data.js';
import {
  BYPASS_UTILIZATION,
  DAYS_PER_MONTH,
  WAR_RISK_PREMIUM_USD,
  monthLabel,
  simulateWarSettlement,
  type WarSettlementResult,
} from '../war-settlement/model.js';
import {
  energyInflationScenarios,
  simulateEnergyInflationV2,
  type EnergyInflationResult,
  type EnergyInflationScenario,
} from './energy-inflation.js';

/**
 * Bisection on a monotone-decreasing scalar response. Used to invert a price
 * observation into the physical throughput each model needs to reproduce it.
 * 24 iterations resolve a unit interval to ~6e-8, well inside model noise.
 */
function invertDecreasing(
  response: (x: number) => number,
  target: number,
  low: number,
  high: number,
  iterations = 24,
): number {
  let lo = low;
  let hi = high;
  if (response(lo) < target) return lo;
  if (response(hi) > target) return hi;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    if (response(mid) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const sumRange = (values: readonly number[], from: number, to: number): number =>
  values.slice(from, to).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// 1. "Strait of Hormuz closed for 190 days" versus $96 Brent
// ---------------------------------------------------------------------------

export interface HormuzClosureCase {
  /** straits.live daily transit count and its pre-crisis baseline, 30 Aug 2026. */
  observedTransitsPerDay: number;
  baselineTransitsPerDay: number;
  /** Tankers that went AIS-dark in the last 24h out of those screened. */
  darkTankers24h: number;
  tankersScreened24h: number;
  /** Brent, 4-6 September 2026, and the level a week earlier (up 8% w/w). */
  brentUsdPerBarrel: number;
  brentLateAugustUsd: number;
  /** Pre-war Brent used by the settlement model's price block. */
  brentPrewarUsd: number;
  /** Combat tempo relative to Epic Fury: August's "month of relative calm" and
   *  the renewed September strikes. JUDGMENT. */
  augustIntensity: number;
  septemberIntensity: number;
  /** Prediction-market probability of normal transit by 31 December (straits.live). */
  marketNormalByDec31: number;
  /** EIA STEO Q3 2026 Brent forecast, as reported on 4 September. */
  eiaQ3BrentForecastUsd: number;
  /** Short-run oil demand elasticity used for the literal V1 price. */
  literalDemandElasticity: number;
  /** IEA OMR August 2026: observed stock draw end-February to end-July, mb. */
  ieaObservedStockDrawMarchToJulyMb: number;
  ieaObservedMonths: number;
}

export const hormuzClosureCase: HormuzClosureCase = {
  // https://straits.live/ (6 vessels vs 85/day baseline on 30 August; closed
  // 190 days on 6 September; 79 of 231 screened tankers AIS-dark; 1% normal
  // transit by 15 September and 26% by 31 December on prediction markets).
  observedTransitsPerDay: 6,
  baselineTransitsPerDay: 85,
  darkTankers24h: 79,
  tankersScreened24h: 231,
  // Brent $95.83–$96.28 on 4–6 September after an 8% weekly gain:
  // https://tradingeconomics.com/commodity/brent-crude-oil
  brentUsdPerBarrel: 96.28,
  brentLateAugustUsd: 96.28 / 1.08,
  brentPrewarUsd: defaultWarSettlementParams.basePriceUsdPerBarrel,
  augustIntensity: 0.35,
  septemberIntensity: 0.9,
  marketNormalByDec31: 0.26,
  eiaQ3BrentForecastUsd: 85,
  literalDemandElasticity: 0.2,
  // https://www.iea.org/reports/oil-market-report-august-2026 : cumulative
  // observed draws of 410 mb (2.7 mb/d) between end-February and end-July.
  ieaObservedStockDrawMarchToJulyMb: 410,
  ieaObservedMonths: 5,
};

export interface StockAnchoredReading {
  demandElasticity: number;
  demandReductionMbd: number;
  physicalSupplyLossMbd: number;
  /** Hormuz oil throughput share implied by the stock identity. */
  impliedHormuzThroughputShare: number;
}

export interface HormuzBranchSummary {
  id: 'escalation' | 'attrition' | 'pause';
  /** Unconditional model mass by the date, from the March 2026 start. */
  settledByDec2026Unconditional: number;
  /** Conditional on the war having survived to the end of September 2026. */
  settledByDec2026GivenSurvival: number;
  settledByJun2027GivenSurvival: number;
  medianSettlementLabelGivenSurvival: string | null;
  brentDec2026Usd: number;
  /** Brent for October 2026 through March 2027, in order. */
  brentOctToMarUsd: number[];
  peakBrentAfterSeptemberUsd: number;
  usSprExhaustedLabel: string | null;
  headlineCpiDec2026: number;
  usInflationAttribution: number;
}

export interface HormuzIntensityInversion {
  septemberIntensity: number;
  warPremiumUsd: number;
  septemberThroughputImpliedByPrice: number;
}

export interface HormuzClosureResult {
  case: HormuzClosureCase;
  initialV1: {
    vesselCountThroughputShare: number;
    grossSeaborneLossMbd: number;
    lossAfterBypassAndResponseMbd: number;
    lossShareOfWorldSupply: number;
    literalClearingPriceUsd: number;
    settlementModelBrentAtVesselCountUsd: number;
    stockFlowModelBrentAtVesselCountUsd: number;
    flaw: string;
  };
  revisedV2: {
    settlementModel: {
      augustThroughputImpliedByPrice: number;
      septemberThroughputImpliedByPrice: number;
      septemberBrentReproducedUsd: number;
      /** War-risk premium at September tempo minus August tempo, $/bbl. */
      premiumChangeAugustToSeptemberUsd: number;
      /** Share of the August-to-September Brent move explained by premium alone. */
      premiumShareOfBrentMove: number;
      intensitySensitivity: HormuzIntensityInversion[];
      cumulativeStockDrawThroughSeptemberMb: number;
      /** Model mass on a durable settlement before October that did not occur. */
      settlementMassBeforeOctober: number;
    };
    stockFlowModel: {
      septemberThroughputImpliedByPrice: number;
      /** Throughput shares for which the September price stays within $3 of spot. */
      throughputBandWithin3Usd: { low: number; high: number };
      septemberBrentReproducedUsd: number;
      cumulativeStockDrawThroughSeptemberMb: number;
      accessibleStockRemainingShare: number;
      monthsUntilAccessibleStocksExhausted: number | null;
      priceMultipleAfterExhaustion: number;
    };
    darkTankerShare: number;
    /** Oil volume the price needs divided by the vessel-count share. */
    priceImpliedToVesselCountRatio: number;
    /** V3: the IEA observed draw as a holdout for both models, then as an anchor. */
    stockAnchored: {
      ieaObservedDrawMbd: number;
      /** Fitted March, Q2, and July multiples from the stock-flow calibration, averaged. */
      marchToJulyAverageBrentMultiple: number;
      settlementModelMarchToJulyDrawMb: number;
      stockFlowModelMarchToJulyDrawMb: number;
      readings: StockAnchoredReading[];
    };
    branches: HormuzBranchSummary[];
    interpretation: string;
  };
}

/** Settlement-model month indices: the scenario starts in March 2026. */
const AUGUST_INDEX = OBSERVED_MONTHS;
const SEPTEMBER_INDEX = OBSERVED_MONTHS + 1;
/** Stock-flow month indices: the observed scenario starts in January 2026. */
const STOCK_FLOW_MARCH_INDEX = 2;
const STOCK_FLOW_SEPTEMBER_INDEX = 8;
const BRANCH_MONTHS = 30;

interface SettlementRunOptions {
  augustThroughput: number;
  septemberThroughput: number;
  septemberIntensity?: number;
  months?: number;
  tailIntensity?: readonly number[];
  tailThroughput?: readonly number[];
}

/** One settlement-model run: the observed March–July record, August and
 *  September as given, then an optional branch tail. */
function settlementRun(input: HormuzClosureCase, options: SettlementRunOptions): WarSettlementResult {
  const scenario: WarSettlementScenario = {
    id: 'september-2026',
    label: 'september-2026',
    description: 'Observed record through September 2026, then a branch tail.',
    startYear: 2026,
    startMonth: 3,
    months: options.months ?? SEPTEMBER_INDEX + 1,
    baseIntensityPath: [
      ...OBSERVED_INTENSITY,
      input.augustIntensity,
      options.septemberIntensity ?? input.septemberIntensity,
      ...(options.tailIntensity ?? []),
    ],
    hormuzThroughputPath: [
      ...OBSERVED_THROUGHPUT,
      options.augustThroughput,
      options.septemberThroughput,
      ...(options.tailThroughput ?? []),
    ],
  };
  return simulateWarSettlement(scenario);
}

function settlementBrentAt(
  input: HormuzClosureCase,
  monthIndex: number,
  options: SettlementRunOptions,
): number {
  return settlementRun(input, options).months[monthIndex]?.brentUsdPerBarrel ?? Number.NaN;
}

function summarizeBranch(id: HormuzBranchSummary['id'], result: WarSettlementResult): HormuzBranchSummary {
  const byLabel = (year: number, month: number) =>
    result.months.find((m) => m.year === year && m.month === month);
  const dec2026 = byLabel(2026, 12);
  const jun2027 = byLabel(2027, 6);
  const september = byLabel(2026, 9);
  if (!dec2026 || !jun2027 || !september) throw new Error('Branch horizon too short');
  // Survival at the start of October equals 1 minus the cumulative settlement
  // through September. Everything after is conditioned on that survival.
  const survivalOctober = 1 - september.cumulativeSettlement;
  const conditional = (cumulative: number) =>
    survivalOctober > 0
      ? clamp((cumulative - september.cumulativeSettlement) / survivalOctober, 0, 1)
      : 1;
  const afterSeptember = result.months.filter((m) => m.monthIndex > september.monthIndex);
  const median = afterSeptember.find((m) => conditional(m.cumulativeSettlement) >= 0.5);
  const exhausted = result.months.find((m) => m.usSprExhausted);
  return {
    id,
    settledByDec2026Unconditional: dec2026.cumulativeSettlement,
    settledByDec2026GivenSurvival: conditional(dec2026.cumulativeSettlement),
    settledByJun2027GivenSurvival: conditional(jun2027.cumulativeSettlement),
    medianSettlementLabelGivenSurvival: median ? monthLabel(median.year, median.month) : null,
    brentDec2026Usd: dec2026.brentUsdPerBarrel,
    brentOctToMarUsd: afterSeptember.slice(0, 6).map((m) => m.brentUsdPerBarrel),
    peakBrentAfterSeptemberUsd: Math.max(...afterSeptember.map((m) => m.brentUsdPerBarrel)),
    usSprExhaustedLabel: exhausted ? monthLabel(exhausted.year, exhausted.month) : null,
    headlineCpiDec2026: dec2026.headlineCpiYoy,
    usInflationAttribution: result.channelAttribution.usInflation,
  };
}

/** Mean of a linear ramp `min(1, (t + 1) / rampMonths)` over the first `months` months. */
const meanRamp = (rampMonths: number, months: number): number =>
  Array.from({ length: months }, (_, t) => Math.min(1, (t + 1) / Math.max(rampMonths, 1)))
    .reduce((a, b) => a + b, 0) / months;

export function evaluateHormuzClosureNarrative(
  input: HormuzClosureCase = hormuzClosureCase,
): HormuzClosureResult {
  assertFiniteDeep(input, 'Hormuz closure case');
  if (
    input.baselineTransitsPerDay <= 0 ||
    input.observedTransitsPerDay < 0 ||
    input.brentPrewarUsd <= 0 ||
    input.literalDemandElasticity <= 0 ||
    input.ieaObservedMonths <= 0
  ) {
    throw new Error('Invalid Hormuz closure case');
  }
  const E = warSettlementEvidence.oil;
  const calibrated = calibrateHormuzModel();
  const stockFlowRun = (throughputAugSep: number, extraMonths: readonly number[] = []): HormuzSimulationResult =>
    simulateHormuzDisruption(
      {
        id: 'observed-through-september-2026',
        label: 'Observed closure path extended through September 2026',
        description: 'The July path with August and September set to a single throughput share.',
        startYear: 2026,
        startMonth: 1,
        throughputPath: [
          ...hormuzScenarios['observed-2026-to-date'].throughputPath,
          throughputAugSep,
          throughputAugSep,
          ...extraMonths,
        ],
      } satisfies HormuzScenario,
      calibrated.params,
    );
  const stockFlowPriceAt = (throughput: number): number =>
    (stockFlowRun(throughput).months[STOCK_FLOW_SEPTEMBER_INDEX]?.oil.priceMultiple ?? 1) *
    input.brentPrewarUsd;

  // --- V1: read the vessel count as the oil flow --------------------------
  const vesselShare = input.observedTransitsPerDay / input.baselineTransitsPerDay;
  const grossLoss = E.hormuzNormalFlowMbd * (1 - vesselShare);
  const afterBypass = Math.max(
    0,
    grossLoss - E.bypassCapacityMbd * BYPASS_UTILIZATION - defaultWarSettlementParams.nonGulfResponseMbd,
  );
  const lossShare = afterBypass / E.globalLiquidsSupplyMbd;
  const literalClearingPrice =
    input.brentPrewarUsd * Math.pow(1 / (1 - lossShare), 1 / input.literalDemandElasticity);

  // --- V2: invert the price for the flow each model needs ------------------
  const augustThroughput = invertDecreasing(
    (x) => settlementBrentAt(input, AUGUST_INDEX, { augustThroughput: x, septemberThroughput: x }),
    input.brentLateAugustUsd,
    0.02,
    1,
  );
  const invertSeptember = (septemberIntensity: number): number =>
    invertDecreasing(
      (x) =>
        settlementBrentAt(input, SEPTEMBER_INDEX, {
          augustThroughput,
          septemberThroughput: x,
          septemberIntensity,
        }),
      input.brentUsdPerBarrel,
      0.02,
      1,
    );
  const septemberThroughput = invertSeptember(input.septemberIntensity);
  const inverted = settlementRun(input, { augustThroughput, septemberThroughput });
  const settlementDrawMb = (from: number, to: number): number =>
    inverted.months
      .slice(from, to)
      .reduce((sum, m) => sum + (m.grossDeficitMbd - m.netDeficitMbd) * DAYS_PER_MONTH, 0);
  const premiumChange = WAR_RISK_PREMIUM_USD * (input.septemberIntensity - input.augustIntensity);
  const intensitySensitivity: HormuzIntensityInversion[] = [0.3, 0.5, 0.7, 0.9, 1.05].map(
    (septemberIntensity) => ({
      septemberIntensity,
      warPremiumUsd: WAR_RISK_PREMIUM_USD * septemberIntensity,
      septemberThroughputImpliedByPrice:
        septemberIntensity === input.septemberIntensity
          ? septemberThroughput
          : invertSeptember(septemberIntensity),
    }),
  );

  const stockFlowThroughput = invertDecreasing(stockFlowPriceAt, input.brentUsdPerBarrel, 0.02, 1);
  // The price falls with throughput, so the ±$3 band is the interval between
  // the two roots; a higher price target is the lower throughput edge.
  const throughputBand = {
    low: invertDecreasing(stockFlowPriceAt, input.brentUsdPerBarrel + 3, 0.02, 1),
    high: invertDecreasing(stockFlowPriceAt, input.brentUsdPerBarrel - 3, 0.02, 1),
  };
  const stockFlow = stockFlowRun(stockFlowThroughput, hold(stockFlowThroughput, 15));
  const stockFlowDrawMb = (from: number, to: number): number =>
    stockFlow.months
      .slice(from, to)
      .reduce((sum, m) => sum + m.oil.inventoryDrawPerDay * (365.25 / 12), 0);
  const accessible =
    calibrated.params.oil.globalDemandPerDay * calibrated.params.oil.accessibleInventoryDays;
  const septemberStock = stockFlow.months[STOCK_FLOW_SEPTEMBER_INDEX]?.oil.inventoryRemaining ?? 0;
  const exhaustionIndex = stockFlow.months.findIndex(
    (m, i) => i > STOCK_FLOW_SEPTEMBER_INDEX && m.oil.inventoryRemaining <= 1e-6,
  );

  // --- V3: the IEA stock draw as holdout and anchor -------------------------
  const ieaDrawMbd = input.ieaObservedStockDrawMarchToJulyMb / (input.ieaObservedMonths * DAYS_PER_MONTH);
  const fittedMultiple = (name: string): number => {
    const row = [...calibrated.development.components, ...calibrated.holdout.components].find(
      (c) => c.name === name,
    );
    if (!row) throw new Error(`Calibration component '${name}' not found`);
    return row.value;
  };
  // March, then the three Q2 months, then July.
  const marchToJulyMultiple =
    (fittedMultiple('March oil-price multiple') +
      3 * fittedMultiple('Q2 oil-price multiple') +
      fittedMultiple('July oil-price multiple')) /
    5;
  // Identity: seaborne loss = bypass + non-Gulf response + stock draw + demand
  // reduction. The bypass ramps at the stock-flow model's rate and the non-Gulf
  // response at the settlement model's; only the elasticity is unobserved.
  const bypassMbd =
    E.bypassCapacityMbd *
    BYPASS_UTILIZATION *
    meanRamp(calibrated.params.oil.bypassRampMonths, input.ieaObservedMonths);
  const nonGulfMbd =
    defaultWarSettlementParams.nonGulfResponseMbd *
    meanRamp(defaultWarSettlementParams.supplyResponseRampMonths, input.ieaObservedMonths);
  const readings: StockAnchoredReading[] = [0.1, 0.15, 0.2, 0.35].map((demandElasticity) => {
    const demandReduction =
      calibrated.params.oil.globalDemandPerDay * (1 - Math.pow(marchToJulyMultiple, -demandElasticity));
    const physicalLoss = ieaDrawMbd + demandReduction;
    return {
      demandElasticity,
      demandReductionMbd: demandReduction,
      physicalSupplyLossMbd: physicalLoss,
      impliedHormuzThroughputShare: clamp(
        1 - (physicalLoss + bypassMbd + nonGulfMbd) / E.hormuzNormalFlowMbd,
        0,
        1,
      ),
    };
  });

  // --- Forward branches from October 2026 ----------------------------------
  const tailMonths = BRANCH_MONTHS - (SEPTEMBER_INDEX + 1);
  const branch = (
    id: HormuzBranchSummary['id'],
    tailIntensity: number[],
    tailThroughput: number[],
  ): HormuzBranchSummary =>
    summarizeBranch(
      id,
      settlementRun(input, {
        augustThroughput,
        septemberThroughput,
        months: BRANCH_MONTHS,
        tailIntensity,
        tailThroughput,
      }),
    );
  const branches: HormuzBranchSummary[] = [
    // Escalation: strikes at full tempo, Iran closes the strait outright.
    branch(
      'escalation',
      [...hold(1.05, 10), ...hold(0.9, tailMonths - 10)],
      [...ramp(septemberThroughput, 0.3, 6), ...hold(0.3, tailMonths - 6)],
    ),
    // Attrition: September tempo persists, throughput stays where the price puts it.
    branch('attrition', hold(0.6, tailMonths), hold(septemberThroughput, tailMonths)),
    // Pause: strikes stop and shipping normalizes over six months.
    branch(
      'pause',
      hold(0.15, tailMonths),
      [...ramp(septemberThroughput, 0.95, 6), ...hold(0.97, tailMonths - 6)],
    ),
  ];

  const result: HormuzClosureResult = {
    case: input,
    initialV1: {
      vesselCountThroughputShare: vesselShare,
      grossSeaborneLossMbd: grossLoss,
      lossAfterBypassAndResponseMbd: afterBypass,
      lossShareOfWorldSupply: lossShare,
      literalClearingPriceUsd: literalClearingPrice,
      settlementModelBrentAtVesselCountUsd: settlementBrentAt(input, SEPTEMBER_INDEX, {
        augustThroughput: vesselShare,
        septemberThroughput: vesselShare,
      }),
      stockFlowModelBrentAtVesselCountUsd: stockFlowPriceAt(vesselShare),
      flaw:
        'Reads a vessel-transit count as an oil-volume share and treats "closed" as a physical rather than an insurance status.',
    },
    revisedV2: {
      settlementModel: {
        augustThroughputImpliedByPrice: augustThroughput,
        septemberThroughputImpliedByPrice: septemberThroughput,
        septemberBrentReproducedUsd: inverted.months[SEPTEMBER_INDEX]?.brentUsdPerBarrel ?? Number.NaN,
        premiumChangeAugustToSeptemberUsd: premiumChange,
        premiumShareOfBrentMove: premiumChange / (input.brentUsdPerBarrel - input.brentLateAugustUsd),
        intensitySensitivity,
        cumulativeStockDrawThroughSeptemberMb: settlementDrawMb(0, SEPTEMBER_INDEX + 1),
        settlementMassBeforeOctober: inverted.months[SEPTEMBER_INDEX]?.cumulativeSettlement ?? Number.NaN,
      },
      stockFlowModel: {
        septemberThroughputImpliedByPrice: stockFlowThroughput,
        throughputBandWithin3Usd: throughputBand,
        septemberBrentReproducedUsd: stockFlowPriceAt(stockFlowThroughput),
        cumulativeStockDrawThroughSeptemberMb: stockFlowDrawMb(0, STOCK_FLOW_SEPTEMBER_INDEX + 1),
        accessibleStockRemainingShare: septemberStock / accessible,
        monthsUntilAccessibleStocksExhausted:
          exhaustionIndex < 0 ? null : exhaustionIndex - STOCK_FLOW_SEPTEMBER_INDEX,
        priceMultipleAfterExhaustion: stockFlow.months.at(-1)?.oil.priceMultiple ?? Number.NaN,
      },
      darkTankerShare: input.darkTankers24h / input.tankersScreened24h,
      priceImpliedToVesselCountRatio: septemberThroughput / vesselShare,
      stockAnchored: {
        ieaObservedDrawMbd: ieaDrawMbd,
        marchToJulyAverageBrentMultiple: marchToJulyMultiple,
        settlementModelMarchToJulyDrawMb: settlementDrawMb(0, input.ieaObservedMonths),
        stockFlowModelMarchToJulyDrawMb: stockFlowDrawMb(
          STOCK_FLOW_MARCH_INDEX,
          STOCK_FLOW_MARCH_INDEX + input.ieaObservedMonths,
        ),
        readings,
      },
      branches,
      interpretation:
        'The price does not identify the flow. Two calibrated models reproduce $96 with very different physical throughput; only stock data separates them, and the settlement clock depends on which is right.',
    },
  };
  assertFiniteDeep(result, 'Hormuz closure result');
  return result;
}

// ---------------------------------------------------------------------------
// 2. Record diesel, a "blowout" jobs print, and a 60% priced Fed hike
// ---------------------------------------------------------------------------

export interface DieselInflationCase {
  dieselUsdPerGalNow: number;
  dieselUsdPerGalYearAgo: number;
  /** Weekly AAA prints, 6 July to 27 July 2026, averaged for the July CPI base. */
  dieselUsdPerGalJulyWeekly: readonly number[];
  gasolineUsdPerGalNow: number;
  gasolineUsdPerGalBase2025: number;
  /** Retail taxes and margin on diesel; the remainder is wholesale product. JUDGMENT. */
  dieselTaxAndMarginUsdPerGal: number;
  brentUsdPerBarrel: number;
  /** Diesel crack, $/bbl: the 1 September record and a normal pre-crisis level. */
  dieselCrackNowUsdPerBarrel: number;
  dieselCrackNormalUsdPerBarrel: number;
  globalDieselDemandMbd: number;
  /** Supply currently disrupted, as reported: Russia ban, Hormuz, other outages. */
  disruptedSupplyMbd: { russiaExportBan: number; hormuz: number; otherOutages: number };
  /** Global distillate stock draw absorbing part of the gap. JUDGMENT. */
  stockDrawMbd: number;
  mediumRunDieselElasticity: number;
  usDistillateDemandMbd: number;
  usNominalPceTrillion: number;
  /** BLS relative importance: fuel oil plus other motor fuels. */
  directDieselCpiWeight: number;
  /** Share of the incremental diesel bill that reaches consumer prices within a year. JUDGMENT. */
  indirectPassThrough: number;
  indirectHalfLifeMonths: number;
  // CPI state
  headlineCpiJuly: number;
  coreCpiJuly: number;
  headlineCpiFeb2026: number;
  coreCpiFeb2026: number;
  energyCpiWeight: number;
  motorFuelCpiWeight: number;
  gasolineYoyJuly: number;
  otherEnergyYoyJuly: number;
  // Fed and labour
  fedFundsMidpointPct: number;
  neutralRatePct: number;
  payrollsAugustThousand: number;
  payrollsConsensusThousand: number;
  payrollsJuneRevisedThousand: number;
  payrollsJulyRevisedThousand: number;
  /** BLS 90% confidence interval on the monthly change, 2026 technical note. */
  payrollsCi90Thousand: number;
  breakevenLowThousand: number;
  breakevenHighThousand: number;
}

export const dieselInflationCase: DieselInflationCase = {
  // AAA, 4 September 2026: $5.85 record versus $3.71 a year earlier.
  // https://www.usnews.com/news/business/articles/2026-09-04/us-diesel-prices-hit-a-record-high-of-5-85-on-average-as-the-iran-war-disrupts-the-flow-of-fuel
  dieselUsdPerGalNow: 5.85,
  dieselUsdPerGalYearAgo: 3.71,
  // Weekly AAA diesel, July 2026: https://www.ttnews.com/articles/diesel-prices-august-2026
  dieselUsdPerGalJulyWeekly: [4.58, 4.80, 5.13, 5.31],
  gasolineUsdPerGalNow: 4.18,
  gasolineUsdPerGalBase2025: warSettlementEvidence.usEconomy.gasolineBase2025UsdPerGal,
  dieselTaxAndMarginUsdPerGal: 1.04,
  brentUsdPerBarrel: 96.28,
  // Diesel crack above $106/bbl on 1 September: https://www.ttnews.com/articles/diesel-crack-spread-record
  dieselCrackNowUsdPerBarrel: 106,
  dieselCrackNormalUsdPerBarrel: 30,
  // CNBC/NPR 4 September: 28 mb/d demand, ~8% disrupted, 0.8 Russia, 1.2 Hormuz.
  globalDieselDemandMbd: 28,
  disruptedSupplyMbd: { russiaExportBan: 0.8, hormuz: 1.2, otherOutages: 0.2 },
  stockDrawMbd: 0.3,
  mediumRunDieselElasticity: 0.25,
  // EIA four-week distillate demand 3.6 mb/d, August 2026.
  usDistillateDemandMbd: 3.6,
  usNominalPceTrillion: 21.5,
  directDieselCpiWeight: 0.002,
  indirectPassThrough: 0.7,
  indirectHalfLifeMonths: 5,
  // BLS: July 2026 CPI 3.4% headline, 2.5% core; February 2.4% / 2.5%.
  headlineCpiJuly: 3.4,
  coreCpiJuly: 2.5,
  headlineCpiFeb2026: 2.4,
  coreCpiFeb2026: 2.5,
  energyCpiWeight: warSettlementEvidence.usEconomy.energyCpiWeight,
  motorFuelCpiWeight: defaultWarSettlementParams.cpiMotorFuelWeight,
  gasolineYoyJuly: 0.246,
  otherEnergyYoyJuly: 0.05,
  // FOMC held 3.50–3.75% on 29 July; ~60–65% hike odds after the jobs report.
  fedFundsMidpointPct: 3.625,
  neutralRatePct: 3.25,
  // BLS Employment Situation, August 2026.
  payrollsAugustThousand: 162,
  payrollsConsensusThousand: 55,
  payrollsJuneRevisedThousand: 31,
  payrollsJulyRevisedThousand: 21,
  payrollsCi90Thousand: 122,
  // FEDS Notes (April 2026) argue for a range, not a point; low immigration
  // puts the 2026 breakeven well below the 2010s' 80k. JUDGMENT range.
  breakevenLowThousand: 30,
  breakevenHighThousand: 90,
};

export interface FedPolicyPathSummary {
  id: 'look-through' | 'hike-rule';
  peakPolicyRatePct: number;
  policyRateDec2026Pct: number;
  headlineDec2026Pct: number;
  headlineJun2027Pct: number;
  headlineDec2027Pct: number;
  coreDec2027Pct: number;
  troughOutputGapPct: number;
}

export interface DieselInflationResult {
  case: DieselInflationCase;
  initialV1: {
    dieselYoy: number;
    naiveHeadlineAdditionPctPoints: number;
    payrollsSurpriseThousand: number;
    payrollsToBreakevenHighRatio: number;
    flaw: string;
  };
  revisedV2: {
    distillateMarket: {
      shortfallShareOfDemand: number;
      wholesaleDieselNowUsdPerBarrel: number;
      wholesaleDieselYearAgoUsdPerBarrel: number;
      wholesalePriceMultiple: number;
      crackShareOfWholesaleRise: number;
      impliedShortRunElasticity: number;
      retailIfHormuzProductsLostUsdPerGal: number;
      retailAfterMediumRunAdjustmentUsdPerGal: number;
    };
    cpiPassThrough: {
      julyDieselUsdPerGal: number;
      incrementalDieselBillBillionPerYear: number;
      incrementalBillShareOfPce: number;
      yearOverYearDieselBillBillionPerYear: number;
      directCpiLevelPctPoints: number;
      indirectCpiLevelAfterYearPctPoints: number;
      totalHeadlineAdditionAfterYearPctPoints: number;
    };
    baseEffects: {
      energyContributionJulyPctPoints: number;
      headlineIfEnergyFlatJun2027Pct: number;
    };
    policy: {
      lookThrough: FedPolicyPathSummary;
      hikeRule: FedPolicyPathSummary;
      /** Model July headline, to check the calibration against the 3.4% print. */
      modelHeadlineJuly2026Pct: number;
      headlineDifferenceDec2027PctPoints: number;
      outputGapDifferencePctPoints: number;
      /** Rule-of-thumb inflation effect of a single 25bp move after two years. */
      benchmark25bpInflationAfterTwoYearsPctPoints: number;
    };
    labour: {
      threeMonthAverageThousand: number;
      monthlyStandardErrorThousand: number;
      threeMonthStandardErrorThousand: number;
      probabilityAugustAboveConsensusIsSignal: number;
      probabilityTrendAboveBreakevenHigh: number;
      probabilityTrendAboveBreakevenLow: number;
    };
    interpretation: string;
  };
}

function usEnergyInflationScenario(
  input: DieselInflationCase,
  id: string,
  consumerEnergyMultiplePath: readonly number[],
  policy: { supplyShockLookThrough: number; policyInflationResponse: number },
): EnergyInflationScenario {
  return {
    ...energyInflationScenarios['euro-area-2026-current'],
    id,
    label: id,
    importEnergyPricePath: consumerEnergyMultiplePath,
    startingHeadlineInflationPct: input.headlineCpiFeb2026,
    startingCoreInflationPct: input.coreCpiFeb2026,
    startingExpectedInflationPct: 2.6,
    startingPolicyRatePct: input.fedFundsMidpointPct,
    startingOutputGapPct: 0,
    neutralPolicyRatePct: input.neutralRatePct,
    energyCpiWeight: input.energyCpiWeight,
    // The path is already a retail energy index, so it passes through one for one.
    directConsumerPassThrough: 1,
    directAdjustmentHalfLifeMonths: 1,
    fiscalShieldingShare: 0,
    exchangeRateAmplification: 1,
    inflationAttention: 0.9,
    supplyShockLookThrough: policy.supplyShockLookThrough,
    policyInflationResponse: policy.policyInflationResponse,
  };
}

function summarizePolicyPath(id: FedPolicyPathSummary['id'], result: EnergyInflationResult): FedPolicyPathSummary {
  // Month 0 is March 2026.
  const dec2026 = result.months[9];
  const jun2027 = result.months[15];
  const dec2027 = result.months[21];
  if (!dec2026 || !jun2027 || !dec2027) throw new Error('Policy path too short');
  return {
    id,
    peakPolicyRatePct: result.peakPolicyRatePct,
    policyRateDec2026Pct: dec2026.policyRatePct,
    headlineDec2026Pct: dec2026.headlineInflationPct,
    headlineJun2027Pct: jun2027.headlineInflationPct,
    headlineDec2027Pct: dec2027.headlineInflationPct,
    coreDec2027Pct: dec2027.coreInflationPct,
    troughOutputGapPct: result.troughOutputGapPct,
  };
}

export function evaluateDieselInflationAndFed(
  input: DieselInflationCase = dieselInflationCase,
): DieselInflationResult {
  assertFiniteDeep(input, 'diesel inflation case');
  if (
    input.dieselUsdPerGalYearAgo <= 0 ||
    input.globalDieselDemandMbd <= 0 ||
    input.payrollsCi90Thousand <= 0 ||
    input.breakevenHighThousand <= input.breakevenLowThousand
  ) {
    throw new Error('Invalid diesel inflation case');
  }

  // --- V1: the headline arithmetic -----------------------------------------
  const dieselYoy = input.dieselUsdPerGalNow / input.dieselUsdPerGalYearAgo - 1;
  // "A long list of goods": apply the full diesel rise at once to the 0.2%
  // direct BLS weight plus a ~2.3% freight-exposed share. JUDGMENT straw man.
  const naiveExposedShare = 0.025;
  const naiveHeadlineAddition = 100 * naiveExposedShare * dieselYoy;

  // --- V2a: distillate market clearing -------------------------------------
  const disrupted =
    input.disruptedSupplyMbd.russiaExportBan +
    input.disruptedSupplyMbd.hormuz +
    input.disruptedSupplyMbd.otherOutages;
  const shortfallShare = (disrupted - input.stockDrawMbd) / input.globalDieselDemandMbd;
  const wholesaleNow = input.brentUsdPerBarrel + input.dieselCrackNowUsdPerBarrel;
  const wholesaleYearAgo = (input.dieselUsdPerGalYearAgo - input.dieselTaxAndMarginUsdPerGal) * 42;
  const wholesaleMultiple = wholesaleNow / wholesaleYearAgo;
  const crackShare =
    (input.dieselCrackNowUsdPerBarrel - input.dieselCrackNormalUsdPerBarrel) / (wholesaleNow - wholesaleYearAgo);
  const impliedElasticity = Math.log(1 / (1 - shortfallShare)) / Math.log(wholesaleMultiple);
  const retailFromWholesale = (usdPerBarrel: number) => usdPerBarrel / 42 + input.dieselTaxAndMarginUsdPerGal;
  const escalationShare = (disrupted + input.disruptedSupplyMbd.hormuz - input.stockDrawMbd) / input.globalDieselDemandMbd;
  const retailIfHormuzProductsLost = retailFromWholesale(
    wholesaleYearAgo * Math.pow(1 / (1 - escalationShare), 1 / impliedElasticity),
  );
  const retailAfterMediumRun = retailFromWholesale(
    wholesaleYearAgo * Math.pow(1 / (1 - shortfallShare), 1 / input.mediumRunDieselElasticity),
  );

  // --- V2b: what the diesel increment can add to CPI -----------------------
  const julyDiesel =
    input.dieselUsdPerGalJulyWeekly.reduce((a, b) => a + b, 0) / input.dieselUsdPerGalJulyWeekly.length;
  const gallonsPerYear = input.usDistillateDemandMbd * 1e6 * 42 * 365;
  const incrementalBill = (gallonsPerYear * (input.dieselUsdPerGalNow - julyDiesel)) / 1e9;
  const yoyBill = (gallonsPerYear * (input.dieselUsdPerGalNow - input.dieselUsdPerGalYearAgo)) / 1e9;
  const incrementalShareOfPce = incrementalBill / (input.usNominalPceTrillion * 1e3);
  const directLevel = 100 * input.directDieselCpiWeight * (input.dieselUsdPerGalNow / julyDiesel - 1);
  const indirectTarget = 100 * incrementalShareOfPce * input.indirectPassThrough;
  const indirectAfterYear = indirectTarget * (1 - Math.pow(0.5, 12 / input.indirectHalfLifeMonths));

  // --- V2c: base effects ---------------------------------------------------
  const otherEnergyWeight = input.energyCpiWeight - input.motorFuelCpiWeight;
  const julyEnergyMultiple =
    (input.motorFuelCpiWeight * (1 + input.gasolineYoyJuly) + otherEnergyWeight * (1 + input.otherEnergyYoyJuly)) /
    input.energyCpiWeight;
  const energyContributionJuly = 100 * input.energyCpiWeight * Math.log(julyEnergyMultiple);
  const headlineIfEnergyFlat = input.coreCpiJuly + directLevel + indirectAfterYear;

  // --- V2d: policy rule comparison on a common retail-energy path ----------
  // Month 0 = March 2026. Household motor fuel is overwhelmingly gasoline; the
  // 20% diesel share stands in for fuel oil and diesel-using households
  // (JUDGMENT). Other energy is held near its reported +5% y/y.
  const motorFuel = (gasoline: number, diesel: number) =>
    0.8 * (gasoline / input.gasolineUsdPerGalBase2025) + 0.2 * (diesel / input.dieselUsdPerGalYearAgo);
  const blend = (fuel: number, other: number) =>
    (input.motorFuelCpiWeight * fuel + otherEnergyWeight * other) / input.energyCpiWeight;
  // Gasoline anchors (AAA/BLS): June $3.98 reported; July +24.6% y/y on the
  // $3.14 base gives $3.91; September $4.18 (straits.live). March–May follow
  // the reported April peak and the -5.7% June energy CPI print; August is
  // interpolated. Diesel: $4.00 in early April, the July weekly average, $5.47
  // on 18 August, and $5.85 on 4 September.
  const observedMonths = [
    blend(motorFuel(4.2, 4.0), 1.03),
    blend(motorFuel(4.6, 4.4), 1.05),
    blend(motorFuel(4.3, 4.5), 1.05),
    blend(motorFuel(3.98, 4.6), 1.05),
    blend(motorFuel(input.gasolineUsdPerGalBase2025 * (1 + input.gasolineYoyJuly), julyDiesel), 1.05),
    blend(motorFuel(4.0, 5.47), 1.05),
    blend(motorFuel(input.gasolineUsdPerGalNow, input.dieselUsdPerGalNow), 1.05),
  ];
  const septemberLevel = observedMonths[observedMonths.length - 1] ?? 1;
  const path = [...observedMonths, ...hold(septemberLevel, 36 - observedMonths.length)];
  const lookThroughRun = simulateEnergyInflationV2(
    usEnergyInflationScenario(input, 'us-look-through', path, {
      supplyShockLookThrough: 0.9,
      policyInflationResponse: 0.5,
    }),
  );
  const lookThrough = summarizePolicyPath('look-through', lookThroughRun);
  const hikeRule = summarizePolicyPath(
    'hike-rule',
    simulateEnergyInflationV2(
      usEnergyInflationScenario(input, 'us-hike-rule', path, {
        supplyShockLookThrough: 0.3,
        policyInflationResponse: 1.0,
      }),
    ),
  );

  // --- V2e: payroll signal extraction --------------------------------------
  const monthlySe = input.payrollsCi90Thousand / 1.645;
  const threeMonthAverage =
    (input.payrollsJuneRevisedThousand + input.payrollsJulyRevisedThousand + input.payrollsAugustThousand) / 3;
  const threeMonthSe = monthlySe / Math.sqrt(3);
  const probTrendAbove = (threshold: number) => 1 - normalCdf((threshold - threeMonthAverage) / threeMonthSe);

  const result: DieselInflationResult = {
    case: input,
    initialV1: {
      dieselYoy,
      naiveHeadlineAdditionPctPoints: naiveHeadlineAddition,
      payrollsSurpriseThousand: input.payrollsAugustThousand - input.payrollsConsensusThousand,
      payrollsToBreakevenHighRatio: input.payrollsAugustThousand / input.breakevenHighThousand,
      flaw:
        'Applies a year-over-year fuel change that is mostly already in the index, and reads one noisy payroll print as the trend.',
    },
    revisedV2: {
      distillateMarket: {
        shortfallShareOfDemand: shortfallShare,
        wholesaleDieselNowUsdPerBarrel: wholesaleNow,
        wholesaleDieselYearAgoUsdPerBarrel: wholesaleYearAgo,
        wholesalePriceMultiple: wholesaleMultiple,
        crackShareOfWholesaleRise: crackShare,
        impliedShortRunElasticity: impliedElasticity,
        retailIfHormuzProductsLostUsdPerGal: retailIfHormuzProductsLost,
        retailAfterMediumRunAdjustmentUsdPerGal: retailAfterMediumRun,
      },
      cpiPassThrough: {
        julyDieselUsdPerGal: julyDiesel,
        incrementalDieselBillBillionPerYear: incrementalBill,
        incrementalBillShareOfPce: incrementalShareOfPce,
        yearOverYearDieselBillBillionPerYear: yoyBill,
        directCpiLevelPctPoints: directLevel,
        indirectCpiLevelAfterYearPctPoints: indirectAfterYear,
        totalHeadlineAdditionAfterYearPctPoints: directLevel + indirectAfterYear,
      },
      baseEffects: {
        energyContributionJulyPctPoints: energyContributionJuly,
        headlineIfEnergyFlatJun2027Pct: headlineIfEnergyFlat,
      },
      policy: {
        lookThrough,
        hikeRule,
        modelHeadlineJuly2026Pct: lookThroughRun.months[4]?.headlineInflationPct ?? Number.NaN,
        headlineDifferenceDec2027PctPoints: lookThrough.headlineDec2027Pct - hikeRule.headlineDec2027Pct,
        outputGapDifferencePctPoints: hikeRule.troughOutputGapPct - lookThrough.troughOutputGapPct,
        // JUDGMENT: large macro models put a sustained 100bp funds-rate move at
        // roughly -0.2pp on inflation after two years, so one 25bp step is ~-0.05pp.
        benchmark25bpInflationAfterTwoYearsPctPoints: -0.05,
      },
      labour: {
        threeMonthAverageThousand: threeMonthAverage,
        monthlyStandardErrorThousand: monthlySe,
        threeMonthStandardErrorThousand: threeMonthSe,
        probabilityAugustAboveConsensusIsSignal: normalCdf(
          (input.payrollsAugustThousand - input.payrollsConsensusThousand) / monthlySe,
        ),
        probabilityTrendAboveBreakevenHigh: probTrendAbove(input.breakevenHighThousand),
        probabilityTrendAboveBreakevenLow: probTrendAbove(input.breakevenLowThousand),
      },
      interpretation:
        'The diesel record is a refining-margin event that the implied short-run elasticity explains without a demand boom; its incremental CPI contribution is small next to the base effects that pull headline toward core by spring 2027, and the policy rule that hikes buys very little inflation for its output cost.',
    },
  };
  assertFiniteDeep(result, 'diesel inflation result');
  return result;
}

// ---------------------------------------------------------------------------
// 3. Ebola (Bundibugyo): "fastest growing on record" versus a flat count
// ---------------------------------------------------------------------------

export interface EbolaAnchor {
  date: string;
  cumulativeCases?: number;
  cumulativeDeaths?: number;
}

export interface EbolaTrajectoryCase {
  /** Outbreak declaration; day 0 of the weekly series. */
  declarationDate: string;
  projectionEndDate: string;
  /** Reference for the mid-July plateau comparison. */
  plateauReferenceDate: string;
  anchors: readonly EbolaAnchor[];
  /** Suspected cases at declaration, used as the seed of infections. */
  suspectedCasesAtDeclaration: number;
  /** Affected-province population (Ituri plus North Kivu), for the SEIR denominator. */
  population: number;
  incubationDays: number;
  infectiousDays: number;
  caseReportDelayDays: number;
  infectionToDeathDays: number;
  /** Ramp for any change in the contact multiplier; about two serial intervals. JUDGMENT. */
  responseChangeRampDays: number;
  trainWeeks: number;
  /** MMWR (August 2026): test positivity among validated alerts. */
  testPositivity: number;
  westAfricaCasesFirst100Days: number;
}

export const ebolaTrajectoryCase: EbolaTrajectoryCase = {
  declarationDate: '2026-05-15',
  projectionEndDate: '2026-12-31',
  plateauReferenceDate: '2026-07-24',
  // Cumulative confirmed cases and deaths, DRC plus Uganda, from WHO Disease
  // Outbreak News (DON602, DON605, DON616), CDC MMWR mm7535e1, and the
  // Wikipedia timeline of the 2026 Central Africa Ebola epidemic.
  anchors: [
    { date: '2026-05-15', cumulativeCases: 8, cumulativeDeaths: 4 },
    { date: '2026-05-29', cumulativeCases: 134, cumulativeDeaths: 18 },
    { date: '2026-06-20', cumulativeCases: 1_000 },
    { date: '2026-07-13', cumulativeCases: 2_000 },
    { date: '2026-07-22', cumulativeDeaths: 1_000 },
    { date: '2026-07-24', cumulativeCases: 3_000 },
    { date: '2026-08-07', cumulativeCases: 4_000 },
    { date: '2026-08-09', cumulativeDeaths: 2_000 },
    { date: '2026-08-14', cumulativeCases: 4_665 },
    { date: '2026-08-19', cumulativeDeaths: 2_500 },
    { date: '2026-08-21', cumulativeCases: 5_458, cumulativeDeaths: 2_606 },
    { date: '2026-08-28', cumulativeCases: 5_794, cumulativeDeaths: 2_786 },
    { date: '2026-09-04', cumulativeCases: 6_522, cumulativeDeaths: 3_134 },
  ],
  // WHO DON602: 246 suspected cases at declaration. The seed is not separately
  // identified from ascertainment (the fit scales cases freely), so it is set
  // from the record rather than searched.
  suspectedCasesAtDeclaration: 246,
  population: 15_000_000,
  // Bundibugyo mean incubation 6.3 days; Ebola serial interval ~15 days.
  incubationDays: 6.3,
  infectiousDays: 8,
  caseReportDelayDays: 6,
  infectionToDeathDays: 15,
  responseChangeRampDays: 28,
  trainWeeks: 13,
  testPositivity: 0.24,
  westAfricaCasesFirst100Days: 1_000,
};

export interface EbolaProjection {
  id: 'plateau-continues' | 'response-strengthens' | 'response-erodes';
  contactMultiplierChange: number;
  confirmedCasesByDec31: number;
  confirmedDeathsByDec31: number;
  weeklyCasesLateDecember: number;
}

interface EbolaFirstStageFit {
  r0: number;
  responseStartDay: number;
  responseMultiplier: number;
  responseRampDays: number;
}

interface EbolaSecondStageFit {
  startDay: number;
  multiplier: number;
  ascertainment: number;
  cfr: number;
  evaluation: EpisodeEvaluation;
}

export interface EbolaTrajectoryResult {
  case: EbolaTrajectoryCase;
  weekly: { week: number; cases: number; deaths: number }[];
  initialV1: {
    doublingTimeDays: number;
    projectedCasesByDec31: number;
    casesFirst100Days: number;
    ratioToWestAfrica: number;
    flaw: string;
  };
  revisedV2: {
    fitted: EbolaFirstStageFit & {
      /** Cases per infection given the fixed seed; not identified separately from it. */
      ascertainmentGivenSeed: number;
      /** Deaths per confirmed case implied by the fit; seed-invariant. */
      impliedConfirmedCaseFatality: number;
      effectiveReproductionNumberNow: number;
    };
    evaluation: EpisodeEvaluation;
    /** V3: a second response stage fitted on the training weeks only. */
    twoStage: {
      secondStageStartDay: number;
      secondStageMultiplier: number;
      effectiveReproductionNumberNow: number;
      evaluation: EpisodeEvaluation;
      holdoutCumulativeErrorImprovement: number;
    };
    /** Second stage refitted on all observed weeks; the projection basis. */
    finalFit: {
      secondStageStartDay: number;
      secondStageMultiplier: number;
      effectiveReproductionNumberNow: number;
    };
    empiricalReproductionNumber: { week: number; rt: number }[];
    weeklyCasesLastFourWeeks: number;
    weeklyCasesMidJuly: number;
    plateauRatio: number;
    impliedTestsPerWeekAtPlateau: number;
    projections: EbolaProjection[];
    interpretation: string;
  };
}

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

function interpolateWeekly(
  points: readonly { day: number; value: number }[],
  weeks: number,
): number[] {
  const at = (day: number): number => {
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return 0;
    if (day <= first.day) return first.value;
    if (day >= last.day) return last.value;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const next = points[i];
      if (prev && next && day >= prev.day && day <= next.day) {
        const t = (day - prev.day) / Math.max(1, next.day - prev.day);
        return prev.value + t * (next.value - prev.value);
      }
    }
    return last.value;
  };
  return Array.from({ length: weeks }, (_, week) => Math.max(0, at((week + 1) * 7) - at(week * 7)));
}

function ebolaParams(
  input: EbolaTrajectoryCase,
  weeks: number,
  fit: EbolaFirstStageFit,
  secondStage?: { startDay: number; multiplier: number },
): OutbreakV2Params {
  const seed = input.suspectedCasesAtDeclaration;
  return {
    population: input.population,
    weeks,
    r0: fit.r0,
    infectiousDays: input.infectiousDays,
    incubationDays: input.incubationDays,
    // Split the seed between compartments in proportion to time spent in each.
    initialInfectious: Math.max(
      1,
      (seed * input.infectiousDays) / (input.incubationDays + input.infectiousDays),
    ),
    initialExposed: seed,
    responseStartDay: fit.responseStartDay,
    responseMultiplier: fit.responseMultiplier,
    responseRampDays: fit.responseRampDays,
    // The model's easing slot carries the second response stage, if any.
    easingStartDaysAfterResponse: secondStage
      ? Math.max(0, secondStage.startDay - fit.responseStartDay)
      : 9_999,
    easedResponseMultiplier: secondStage ? clamp(secondStage.multiplier, 0, 2) : fit.responseMultiplier,
    easingRampDays: input.responseChangeRampDays,
    importedInfectionsPerMillionPerDay: 0,
    ascertainment: 1,
    infectionFatalityRatio: 1,
    caseReportDelayDays: input.caseReportDelayDays,
    infectionToDeathDays: input.infectionToDeathDays,
    // Care capacity is not the binding constraint on counts here (ETU
    // occupancy 64% nationally); the overflow channel is off (slope 0) and the
    // admission inputs are placeholders that feed nothing reported.
    hospitalizationRate: 0,
    hospitalStayDays: 1,
    staffedBedsPer100k: 0,
    overflowFatalitySlope: 0,
    severityDeclineStartDaysAfterResponse: 0,
    severityHalfLifeDays: Number.POSITIVE_INFINITY,
    severityFloor: 1,
  };
}

export function evaluateEbolaTrajectory(
  input: EbolaTrajectoryCase = ebolaTrajectoryCase,
): EbolaTrajectoryResult {
  assertFiniteDeep(input, 'Ebola trajectory case');
  const dayOf = (date: string) => daysBetween(input.declarationDate, date);
  const anchors = input.anchors.map((a) => ({ ...a, day: dayOf(a.date) })).sort((a, b) => a.day - b.day);
  const lastDay = anchors[anchors.length - 1]?.day ?? 0;
  const weeks = Math.floor(lastDay / 7);
  if (weeks < input.trainWeeks + 2) throw new Error('Not enough weeks for a holdout');
  const series = (key: 'cumulativeCases' | 'cumulativeDeaths') =>
    interpolateWeekly(
      anchors.filter((a) => a[key] !== undefined).map((a) => ({ day: a.day, value: a[key] as number })),
      weeks,
    );
  const cases = series('cumulativeCases');
  const deaths = series('cumulativeDeaths');
  const weekly = cases.map((c, week) => ({ week, cases: c, deaths: deaths[week] ?? 0 }));

  // --- V1: exponential extrapolation of "5,000 in 100 days" ---------------
  const a1000 = anchors.find((a) => a.cumulativeCases === 1_000);
  const a5000 = anchors.find((a) => (a.cumulativeCases ?? 0) >= 5_000);
  if (!a1000 || !a5000) throw new Error('Need the 1,000 and 5,000 anchors');
  const growth =
    Math.log((a5000.cumulativeCases ?? 1) / (a1000.cumulativeCases ?? 1)) / (a5000.day - a1000.day);
  const projectionEndDay = dayOf(input.projectionEndDate);
  const projectedV1 = (a5000.cumulativeCases ?? 0) * Math.exp(growth * (projectionEndDay - a5000.day));
  const casesFirst100Days =
    anchors.filter((a) => a.day <= 100 && a.cumulativeCases !== undefined).at(-1)?.cumulativeCases ?? 0;

  // --- V2: SEIR fit with a ramped response, three-week plateau holdout ------
  const episode: OutbreakEpisode = {
    id: 'bundibugyo-2026',
    label: 'Bundibugyo 2026',
    population: input.population,
    trainWeeks: input.trainWeeks,
    observations: weekly.map((w) => ({ date: `week-${w.week}`, cases: w.cases, deaths: w.deaths })),
  };
  const score = (unit: OutbreakSeries, fitWeeks: number) => {
    const ascertainment = fitScale(unit.weeklyCases, cases, fitWeeks, 0.05, 1);
    const cfr = fitScale(unit.weeklyDeaths, deaths, fitWeeks, 0.05, 0.8);
    const evaluation = evaluateEpisode(
      { ...episode, trainWeeks: fitWeeks },
      scaledSeries(unit, ascertainment, cfr),
    );
    return { ascertainment, cfr, evaluation };
  };
  let best: ({ fit: EbolaFirstStageFit } & ReturnType<typeof score>) | undefined;
  for (const r0 of [1.4, 1.6, 1.8, 2.0, 2.3, 2.6, 3.0]) {
    for (const responseStartDay of [7, 21, 35, 49, 63]) {
      for (const responseMultiplier of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
        for (const responseRampDays of [14, 28, 56, 84]) {
          const fit = { r0, responseStartDay, responseMultiplier, responseRampDays };
          const scored = score(simulateOutbreakV2(ebolaParams(input, weeks, fit)), input.trainWeeks);
          if (!best || scored.evaluation.train.score < best.evaluation.train.score) {
            best = { fit, ...scored };
          }
        }
      }
    }
  }
  if (!best) throw new Error('Ebola fit failed');
  const firstStage = best;

  // V3: a second response stage. The candidate series are simulated once and
  // scored twice: on the training weeks only (so the last three weeks remain
  // a genuine holdout) and on every observed week (the projection basis).
  const secondStageCandidates = [42, 49, 56, 63, 70, 77].flatMap((startDay) =>
    [0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1].map((change) => {
      const multiplier = firstStage.fit.responseMultiplier * change;
      return {
        startDay,
        multiplier,
        unit: simulateOutbreakV2(ebolaParams(input, weeks, firstStage.fit, { startDay, multiplier })),
      };
    }),
  );
  const fitSecondStage = (fitWeeks: number): EbolaSecondStageFit => {
    let found: EbolaSecondStageFit | undefined;
    for (const candidate of secondStageCandidates) {
      const scored = score(candidate.unit, fitWeeks);
      if (!found || scored.evaluation.train.score < found.evaluation.train.score) {
        found = { startDay: candidate.startDay, multiplier: candidate.multiplier, ...scored };
      }
    }
    if (!found) throw new Error('Ebola two-stage fit failed');
    return found;
  };
  const twoStage = fitSecondStage(input.trainWeeks);
  const finalStage = fitSecondStage(weeks);

  const lastFour = sumRange(cases, weeks - 4, weeks) / 4;
  const midJulyWeek = Math.floor(dayOf(input.plateauReferenceDate) / 7) - 1;
  const midJuly = cases[midJulyWeek] ?? 0;
  // Two-week sums two weeks apart approximate one ~15-day serial interval and
  // damp the reporting batches visible in the anchors.
  const rt = weekly
    .filter((w) => w.week >= 3)
    .map((w) => {
      const now = sumRange(cases, w.week - 1, w.week + 1);
      const lag = sumRange(cases, w.week - 3, w.week - 1);
      return { week: w.week, rt: lag > 0 ? now / lag : Number.NaN };
    })
    .filter((row) => Number.isFinite(row.rt));
  const totalWeeks = weeks + Math.ceil((projectionEndDay - lastDay) / 7);
  const observedToDate = { cases: sumRange(cases, 0, weeks), deaths: sumRange(deaths, 0, weeks) };
  const projections: EbolaProjection[] = (
    [
      ['plateau-continues', 1.0],
      ['response-strengthens', 0.8],
      ['response-erodes', 1.2],
    ] as const
  ).map(([id, change]) => {
    // Carry the full-sample two-stage fit forward; the branch changes the
    // contact multiplier from the last observed day.
    const unit = simulateOutbreakV2({
      ...ebolaParams(input, totalWeeks, firstStage.fit, finalStage),
      additionalStages: [
        {
          startDay: lastDay,
          multiplier: clamp(finalStage.multiplier * change, 0, 2),
          rampDays: input.responseChangeRampDays,
        },
      ],
    });
    const scaled = scaledSeries(unit, finalStage.ascertainment, finalStage.cfr);
    // Anchor the projection on the observed cumulative count, not the fitted one.
    return {
      id,
      contactMultiplierChange: change,
      confirmedCasesByDec31: observedToDate.cases + sumRange(scaled.weeklyCases, weeks, totalWeeks),
      confirmedDeathsByDec31: observedToDate.deaths + sumRange(scaled.weeklyDeaths, weeks, totalWeeks),
      weeklyCasesLateDecember: scaled.weeklyCases[totalWeeks - 1] ?? 0,
    };
  });

  const result: EbolaTrajectoryResult = {
    case: input,
    weekly,
    initialV1: {
      doublingTimeDays: Math.log(2) / growth,
      projectedCasesByDec31: projectedV1,
      casesFirst100Days,
      ratioToWestAfrica: casesFirst100Days / input.westAfricaCasesFirst100Days,
      flaw:
        'Extrapolates the June–August doubling time as if incidence were still accelerating, when weekly confirmed counts have been flat since mid-July.',
    },
    revisedV2: {
      fitted: {
        ...firstStage.fit,
        ascertainmentGivenSeed: firstStage.ascertainment,
        impliedConfirmedCaseFatality: firstStage.cfr / firstStage.ascertainment,
        effectiveReproductionNumberNow: firstStage.fit.r0 * firstStage.fit.responseMultiplier,
      },
      evaluation: firstStage.evaluation,
      twoStage: {
        secondStageStartDay: twoStage.startDay,
        secondStageMultiplier: twoStage.multiplier,
        effectiveReproductionNumberNow: firstStage.fit.r0 * twoStage.multiplier,
        evaluation: twoStage.evaluation,
        holdoutCumulativeErrorImprovement:
          firstStage.evaluation.holdout.caseCumulativeError - twoStage.evaluation.holdout.caseCumulativeError,
      },
      finalFit: {
        secondStageStartDay: finalStage.startDay,
        secondStageMultiplier: finalStage.multiplier,
        effectiveReproductionNumberNow: firstStage.fit.r0 * finalStage.multiplier,
      },
      empiricalReproductionNumber: rt,
      weeklyCasesLastFourWeeks: lastFour,
      weeklyCasesMidJuly: midJuly,
      plateauRatio: midJuly > 0 ? lastFour / midJuly : Number.NaN,
      impliedTestsPerWeekAtPlateau: lastFour / input.testPositivity,
      projections,
      interpretation:
        'Confirmed incidence has been arithmetic, not geometric, for seven weeks: the fitted effective reproduction number is near one. That is neither containment nor explosion, and a flat confirmed count is also what a laboratory-throughput ceiling would produce, so community deaths outside treatment units are the series to watch.',
    },
  };
  assertFiniteDeep(result, 'Ebola trajectory result');
  return result;
}

export const september6HeadlineEvidence = {
  hormuz: {
    straitsLive: 'https://straits.live/',
    abcLive:
      'https://abcnews.com/International/live-updates/iran-live-updates-centcom-targeted-iranian-forces-posed/?id=136080582',
    brent: 'https://tradingeconomics.com/commodity/brent-crude-oil',
    eiaSteo: 'https://www.eia.gov/outlooks/steo/',
    ieaOmrAugust2026: 'https://www.iea.org/reports/oil-market-report-august-2026',
  },
  diesel: {
    aaaRecord:
      'https://www.usnews.com/news/business/articles/2026-09-04/us-diesel-prices-hit-a-record-high-of-5-85-on-average-as-the-iran-war-disrupts-the-flow-of-fuel',
    cnbc: 'https://www.cnbc.com/2026/09/04/diesel-price-record-high-ukraine-iran-inflation.html',
    crack: 'https://www.ttnews.com/articles/diesel-crack-spread-record',
    julyCpi: 'https://www.cnbc.com/2026/08/12/cpi-inflation-report-july-2026.html',
    febCpi: 'https://www.bls.gov/opub/ted/2026/consumer-prices-up-2-4-percent-over-year-ended-february-2026.htm',
    jobs: 'https://www.bls.gov/news.release/empsit.htm',
    hikeOdds: 'https://www.redfin.com/news/august-jobs-report-increases-september-rate-hike-odds/',
    dallasFed: 'https://www.dallasfed.org/research/economics/2026/0417',
    breakeven:
      'https://www.federalreserve.gov/econres/notes/feds-notes/labor-force-growth-breakeven-employment-and-potential-gdp-growth-20260402.html',
  },
  ebola: {
    don602: 'https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON602',
    don605: 'https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON605',
    don616: 'https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON616',
    mmwr: 'https://www.cdc.gov/mmwr/volumes/75/wr/mm7535e1.htm',
    timeline: 'https://en.wikipedia.org/wiki/2026_Central_Africa_Ebola_epidemic',
  },
} as const;

import { assertFiniteDeep } from 'tsimulation';

import { normalCdf } from '../../primitives/math.js';
import { calibrateHormuzModel } from '../critical-materials/hormuz-calibration.js';
import {
  hormuzScenarios,
  type HormuzScenario,
} from '../critical-materials/hormuz-data.js';
import {
  simulateHormuzDisruption,
  type HormuzSimulationResult,
} from '../critical-materials/hormuz-model.js';
import {
  evaluateEpisode,
  simulateOutbreakV2,
  type EpisodeEvaluation,
  type OutbreakSeries,
  type OutbreakV2Params,
} from '../outbreak/model.js';
import type { OutbreakEpisode } from '../outbreak/data.js';
import {
  defaultWarSettlementParams,
  warSettlementEvidence,
  type WarSettlementScenario,
} from '../war-settlement/data.js';
import {
  simulateWarSettlement,
  type WarSettlementResult,
} from '../war-settlement/model.js';
import {
  energyInflationScenarios,
  simulateEnergyInflationV2,
  type EnergyInflationResult,
  type EnergyInflationScenario,
} from './energy-inflation.js';

const DAYS_PER_MONTH = 30.4;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const hold = (value: number, count: number): number[] =>
  Array.from({ length: count }, () => value);

const ramp = (from: number, to: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => from + ((to - from) * (i + 1)) / count);

/**
 * Bisection on a monotone-decreasing scalar response. Used to invert a price
 * observation into the physical throughput each model needs to reproduce it.
 */
function invertDecreasing(
  response: (x: number) => number,
  target: number,
  low: number,
  high: number,
  iterations = 40,
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

// ---------------------------------------------------------------------------
// 1. "Strait of Hormuz closed for 190 days" versus $96 Brent
// ---------------------------------------------------------------------------

export interface HormuzClosureCase {
  /** straits.live daily transit count and its pre-crisis baseline, 30 Aug 2026. */
  observedTransitsPerDay: number;
  baselineTransitsPerDay: number;
  daysClosed: number;
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
  /** Prediction-market probabilities of normal transit, from straits.live. */
  marketNormalBySep15: number;
  marketNormalByDec31: number;
  /** EIA STEO Q3 2026 Brent forecast, as reported on 4 September. */
  eiaQ3BrentForecastUsd: number;
  /** Short-run oil demand elasticity used for the literal V1 price. */
  literalDemandElasticity: number;
  /** IEA OMR August 2026: observed stock draw end-February to end-July, mb. */
  ieaObservedStockDrawMarchToJulyMb: number;
  ieaObservedMonths: number;
  /** Average Brent multiple March–July from the stock-flow calibration targets. */
  marchToJulyAverageBrentMultiple: number;
}

export const hormuzClosureCase: HormuzClosureCase = {
  // https://straits.live/ (6 vessels vs 85/day baseline on 30 August; closed
  // 190 days on 6 September; 79 of 231 screened tankers AIS-dark).
  observedTransitsPerDay: 6,
  baselineTransitsPerDay: 85,
  daysClosed: 190,
  darkTankers24h: 79,
  tankersScreened24h: 231,
  // Brent $95.83–$96.28 on 4–6 September after an 8% weekly gain:
  // https://tradingeconomics.com/commodity/brent-crude-oil
  brentUsdPerBarrel: 96.28,
  brentLateAugustUsd: 96.28 / 1.08,
  brentPrewarUsd: defaultWarSettlementParams.basePriceUsdPerBarrel,
  augustIntensity: 0.35,
  septemberIntensity: 0.9,
  marketNormalBySep15: 0.01,
  marketNormalByDec31: 0.26,
  eiaQ3BrentForecastUsd: 85,
  literalDemandElasticity: 0.2,
  // https://www.iea.org/reports/oil-market-report-august-2026 : cumulative
  // observed draws of 410 mb (2.7 mb/d) between end-February and end-July.
  ieaObservedStockDrawMarchToJulyMb: 410,
  ieaObservedMonths: 5,
  // March 1.71×, Q2 1.51×, July 1.42× (hormuz-calibration targets), averaged.
  marchToJulyAverageBrentMultiple: (1.71 + 3 * 1.51 + 1.42) / 5,
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
  label: string;
  /** Unconditional model mass by the date, from the March 2026 start. */
  settledByDec2026Unconditional: number;
  /** Conditional on the war having survived to the end of September 2026. */
  settledByDec2026GivenSurvival: number;
  settledByJun2027GivenSurvival: number;
  medianSettlementLabelGivenSurvival: string | null;
  brentDec2026Usd: number;
  /** Brent for October 2026 through March 2027, in order. */
  brentOctToMarUsd: number[];
  /** Total stock draw (strategic plus commercial) for the same months, mb/d. */
  stockDrawOctToMarMbd: number[];
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
      settlementModelMarchToJulyDrawMb: number;
      stockFlowModelMarchToJulyDrawMb: number;
      readings: StockAnchoredReading[];
    };
    branches: HormuzBranchSummary[];
    interpretation: string;
  };
}

const OBSERVED_INTENSITY = [1.0, 0.85, 0.70, 0.18, 0.75] as const;
const OBSERVED_THROUGHPUT = [0.15, 0.40, 0.58, 0.82, 0.72] as const;
const AUGUST_INDEX = 5;
const SEPTEMBER_INDEX = 6;

function settlementScenario(
  id: string,
  label: string,
  intensity: readonly number[],
  throughput: readonly number[],
): WarSettlementScenario {
  return {
    id,
    label,
    description: label,
    startYear: 2026,
    startMonth: 3,
    months: 30,
    baseIntensityPath: intensity,
    hormuzThroughputPath: throughput,
  };
}

function settlementBrentAt(
  input: HormuzClosureCase,
  monthIndex: number,
  augustThroughput: number,
  septemberThroughput: number,
  septemberIntensity: number = input.septemberIntensity,
): number {
  const result = simulateWarSettlement(
    settlementScenario(
      'inversion',
      'inversion',
      [...OBSERVED_INTENSITY, input.augustIntensity, septemberIntensity],
      [...OBSERVED_THROUGHPUT, augustThroughput, septemberThroughput],
    ),
  );
  return result.months[monthIndex]?.brentUsdPerBarrel ?? Number.NaN;
}

/** War-risk premium the settlement model adds per unit of combat tempo, $/bbl. */
const WAR_RISK_PREMIUM_USD = 29;

function stockFlowThrough(
  throughputAugSep: number,
  params: ReturnType<typeof calibrateHormuzModel>['params'],
  extraMonths: readonly number[] = [],
): HormuzSimulationResult {
  const observed = hormuzScenarios['observed-2026-to-date'].throughputPath;
  const scenario: HormuzScenario = {
    id: 'observed-through-september-2026',
    label: 'Observed closure path extended through September 2026',
    description:
      'The July path with August and September set to a single throughput share.',
    startYear: 2026,
    startMonth: 1,
    throughputPath: [...observed, throughputAugSep, throughputAugSep, ...extraMonths],
  };
  return simulateHormuzDisruption(scenario, params);
}

function summarizeBranch(
  id: HormuzBranchSummary['id'],
  label: string,
  result: WarSettlementResult,
): HormuzBranchSummary {
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
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const median = result.months.find(
    (m) => m.monthIndex > september.monthIndex && conditional(m.cumulativeSettlement) >= 0.5,
  );
  const exhausted = result.months.find((m) => m.usSprExhausted);
  return {
    id,
    label,
    settledByDec2026Unconditional: dec2026.cumulativeSettlement,
    settledByDec2026GivenSurvival: conditional(dec2026.cumulativeSettlement),
    settledByJun2027GivenSurvival: conditional(jun2027.cumulativeSettlement),
    medianSettlementLabelGivenSurvival: median
      ? `${names[median.month - 1]} ${median.year}`
      : null,
    brentDec2026Usd: dec2026.brentUsdPerBarrel,
    brentOctToMarUsd: result.months
      .filter((m) => m.monthIndex > september.monthIndex && m.monthIndex <= september.monthIndex + 6)
      .map((m) => m.brentUsdPerBarrel),
    stockDrawOctToMarMbd: result.months
      .filter((m) => m.monthIndex > september.monthIndex && m.monthIndex <= september.monthIndex + 6)
      .map((m) => m.grossDeficitMbd - m.netDeficitMbd),
    peakBrentAfterSeptemberUsd: Math.max(
      ...result.months
        .filter((m) => m.monthIndex > september.monthIndex)
        .map((m) => m.brentUsdPerBarrel),
    ),
    usSprExhaustedLabel: exhausted ? `${names[exhausted.month - 1]} ${exhausted.year}` : null,
    headlineCpiDec2026: dec2026?.headlineCpiYoy ?? Number.NaN,
    usInflationAttribution: result.channelAttribution.usInflation,
  };
}

export function evaluateHormuzClosureNarrative(
  input: HormuzClosureCase = hormuzClosureCase,
): HormuzClosureResult {
  assertFiniteDeep(input, 'Hormuz closure case');
  if (
    input.baselineTransitsPerDay <= 0 ||
    input.observedTransitsPerDay < 0 ||
    input.brentPrewarUsd <= 0 ||
    input.literalDemandElasticity <= 0
  ) {
    throw new Error('Invalid Hormuz closure case');
  }
  const E = warSettlementEvidence.oil;

  // --- V1: read the vessel count as the oil flow --------------------------
  const vesselShare = input.observedTransitsPerDay / input.baselineTransitsPerDay;
  const grossLoss = E.hormuzNormalFlowMbd * (1 - vesselShare);
  const afterBypass = Math.max(
    0,
    grossLoss - E.bypassCapacityMbd * 0.75 - defaultWarSettlementParams.nonGulfResponseMbd,
  );
  const lossShare = afterBypass / E.globalLiquidsSupplyMbd;
  const literalClearingPrice =
    input.brentPrewarUsd * Math.pow(1 / (1 - lossShare), 1 / input.literalDemandElasticity);
  const settlementAtVesselCount = settlementBrentAt(
    input,
    SEPTEMBER_INDEX,
    vesselShare,
    vesselShare,
  );
  const calibrated = calibrateHormuzModel();
  const stockFlowAtVesselCount = stockFlowThrough(vesselShare, calibrated.params);
  const stockFlowSeptember = stockFlowAtVesselCount.months[8];
  if (!stockFlowSeptember) throw new Error('Stock-flow path did not reach September');

  // --- V2: invert the price for the flow each model needs ------------------
  const augustThroughput = invertDecreasing(
    (x) => settlementBrentAt(input, AUGUST_INDEX, x, x),
    input.brentLateAugustUsd,
    0.02,
    1,
  );
  const septemberThroughput = invertDecreasing(
    (x) => settlementBrentAt(input, SEPTEMBER_INDEX, augustThroughput, x),
    input.brentUsdPerBarrel,
    0.02,
    1,
  );
  const inverted = simulateWarSettlement(
    settlementScenario(
      'inverted',
      'inverted',
      [...OBSERVED_INTENSITY, input.augustIntensity, input.septemberIntensity],
      [...OBSERVED_THROUGHPUT, augustThroughput, septemberThroughput],
    ),
  );
  const settlementDraw = inverted.months
    .slice(0, SEPTEMBER_INDEX + 1)
    .reduce((sum, m) => sum + (m.grossDeficitMbd - m.netDeficitMbd) * DAYS_PER_MONTH, 0);
  const settlementMassBeforeOctober =
    inverted.months[SEPTEMBER_INDEX]?.cumulativeSettlement ?? Number.NaN;
  const premiumChange =
    WAR_RISK_PREMIUM_USD * (input.septemberIntensity - input.augustIntensity);
  const premiumShare = premiumChange / (input.brentUsdPerBarrel - input.brentLateAugustUsd);
  const intensitySensitivity: HormuzIntensityInversion[] = [0.3, 0.5, 0.7, 0.9, 1.05].map(
    (septemberIntensity) => ({
      septemberIntensity,
      warPremiumUsd: WAR_RISK_PREMIUM_USD * septemberIntensity,
      septemberThroughputImpliedByPrice: invertDecreasing(
        (x) => settlementBrentAt(input, SEPTEMBER_INDEX, augustThroughput, x, septemberIntensity),
        input.brentUsdPerBarrel,
        0.02,
        1,
      ),
    }),
  );

  const targetMultiple = input.brentUsdPerBarrel / input.brentPrewarUsd;
  const stockFlowThroughput = invertDecreasing(
    (x) => stockFlowThrough(x, calibrated.params).months[8]?.oil.priceMultiple ?? 1,
    targetMultiple,
    0.02,
    1,
  );
  const stockFlowPriceAt = (x: number) =>
    (stockFlowThrough(x, calibrated.params).months[8]?.oil.priceMultiple ?? 1) *
    input.brentPrewarUsd;
  const bandGrid = Array.from({ length: 99 }, (_, i) => 0.02 + (0.98 * i) / 98);
  const inBand = bandGrid.filter((x) => Math.abs(stockFlowPriceAt(x) - input.brentUsdPerBarrel) <= 3);
  const throughputBand = {
    low: inBand.length > 0 ? Math.min(...inBand) : stockFlowThroughput,
    high: inBand.length > 0 ? Math.max(...inBand) : stockFlowThroughput,
  };
  const stockFlow = stockFlowThrough(
    stockFlowThroughput,
    calibrated.params,
    hold(stockFlowThroughput, 15),
  );
  const stockFlowDraw = stockFlow.months
    .slice(0, 9)
    .reduce((sum, m) => sum + m.oil.inventoryDrawPerDay * (365.25 / 12), 0);
  const accessible =
    calibrated.params.oil.globalDemandPerDay * calibrated.params.oil.accessibleInventoryDays;
  const septemberStock = stockFlow.months[8]?.oil.inventoryRemaining ?? 0;
  const exhaustionIndex = stockFlow.months.findIndex(
    (m, i) => i > 8 && m.oil.inventoryRemaining <= 1e-6,
  );
  const afterExhaustion = stockFlow.months.at(-1)?.oil.priceMultiple ?? Number.NaN;

  // --- V3: the IEA stock draw as holdout and anchor -------------------------
  const settlementMarJul = inverted.months
    .slice(0, 5)
    .reduce((sum, m) => sum + (m.grossDeficitMbd - m.netDeficitMbd) * DAYS_PER_MONTH, 0);
  const stockFlowMarJul = stockFlow.months
    .slice(2, 7)
    .reduce((sum, m) => sum + m.oil.inventoryDrawPerDay * (365.25 / 12), 0);
  const ieaDrawMbd =
    input.ieaObservedStockDrawMarchToJulyMb / (input.ieaObservedMonths * DAYS_PER_MONTH);
  // Identity: seaborne loss = bypass + non-Gulf response + stock draw + demand
  // reduction. Only the elasticity is unobserved, so it is swept.
  const readings: StockAnchoredReading[] = [0.1, 0.15, 0.2, 0.35].map((demandElasticity) => {
    const demandReduction =
      calibrated.params.oil.globalDemandPerDay *
      (1 - Math.pow(input.marchToJulyAverageBrentMultiple, -demandElasticity));
    const physicalLoss = ieaDrawMbd + demandReduction;
    const seaborneLoss =
      physicalLoss +
      E.bypassCapacityMbd * 0.75 +
      defaultWarSettlementParams.nonGulfResponseMbd * 0.6;
    return {
      demandElasticity,
      demandReductionMbd: demandReduction,
      physicalSupplyLossMbd: physicalLoss,
      impliedHormuzThroughputShare: clamp(1 - seaborneLoss / E.hormuzNormalFlowMbd, 0, 1),
    };
  });

  // --- Forward branches from October 2026 ----------------------------------
  const branchIntensity = (tail: number[]) =>
    [...OBSERVED_INTENSITY, input.augustIntensity, input.septemberIntensity, ...tail];
  const branchThroughput = (tail: number[]) =>
    [...OBSERVED_THROUGHPUT, augustThroughput, septemberThroughput, ...tail];
  const branches: HormuzBranchSummary[] = [
    summarizeBranch(
      'escalation',
      'Escalation: strikes at full tempo, Iran closes the strait outright',
      simulateWarSettlement(
        settlementScenario(
          'september-escalation',
          'escalation',
          branchIntensity([...hold(1.05, 10), ...hold(0.9, 13)]),
          branchThroughput([...ramp(septemberThroughput, 0.3, 6), ...hold(0.3, 17)]),
        ),
      ),
    ),
    summarizeBranch(
      'attrition',
      'Attrition: September tempo persists, throughput stays where the price puts it',
      simulateWarSettlement(
        settlementScenario(
          'september-attrition',
          'attrition',
          branchIntensity(hold(0.6, 23)),
          branchThroughput(hold(septemberThroughput, 23)),
        ),
      ),
    ),
    summarizeBranch(
      'pause',
      'Pause: strikes stop and shipping normalizes over six months',
      simulateWarSettlement(
        settlementScenario(
          'september-pause',
          'pause',
          branchIntensity(hold(0.15, 23)),
          branchThroughput([...ramp(septemberThroughput, 0.95, 6), ...hold(0.97, 17)]),
        ),
      ),
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
      settlementModelBrentAtVesselCountUsd: settlementAtVesselCount,
      stockFlowModelBrentAtVesselCountUsd:
        stockFlowSeptember.oil.priceMultiple * input.brentPrewarUsd,
      flaw:
        'Reads a vessel-transit count as an oil-volume share and treats "closed" as a physical rather than an insurance status.',
    },
    revisedV2: {
      settlementModel: {
        augustThroughputImpliedByPrice: augustThroughput,
        septemberThroughputImpliedByPrice: septemberThroughput,
        septemberBrentReproducedUsd:
          inverted.months[SEPTEMBER_INDEX]?.brentUsdPerBarrel ?? Number.NaN,
        premiumChangeAugustToSeptemberUsd: premiumChange,
        premiumShareOfBrentMove: premiumShare,
        intensitySensitivity,
        cumulativeStockDrawThroughSeptemberMb: settlementDraw,
        settlementMassBeforeOctober,
      },
      stockFlowModel: {
        septemberThroughputImpliedByPrice: stockFlowThroughput,
        throughputBandWithin3Usd: throughputBand,
        septemberBrentReproducedUsd:
          (stockFlow.months[8]?.oil.priceMultiple ?? Number.NaN) * input.brentPrewarUsd,
        cumulativeStockDrawThroughSeptemberMb: stockFlowDraw,
        accessibleStockRemainingShare: septemberStock / accessible,
        monthsUntilAccessibleStocksExhausted:
          exhaustionIndex < 0 ? null : exhaustionIndex - 8,
        priceMultipleAfterExhaustion: afterExhaustion,
      },
      darkTankerShare: input.darkTankers24h / input.tankersScreened24h,
      priceImpliedToVesselCountRatio: septemberThroughput / vesselShare,
      stockAnchored: {
        ieaObservedDrawMbd: ieaDrawMbd,
        settlementModelMarchToJulyDrawMb: settlementMarJul,
        stockFlowModelMarchToJulyDrawMb: stockFlowMarJul,
        readings,
      },
      branches,
      interpretation:
        'The price does not identify the flow. Two calibrated models reproduce $96 with very different physical throughput; only stock data separates them, and the settlement clock depends on which is right.',
    },
  };
  assertFiniteDeep(
    {
      v1: result.initialV1,
      v2: {
        ...result.revisedV2,
        stockFlowModel: {
          ...result.revisedV2.stockFlowModel,
          monthsUntilAccessibleStocksExhausted: 0,
        },
        branches: result.revisedV2.branches.map((b) => ({
          settledByDec2026Unconditional: b.settledByDec2026Unconditional,
          settledByDec2026GivenSurvival: b.settledByDec2026GivenSurvival,
          settledByJun2027GivenSurvival: b.settledByJun2027GivenSurvival,
          brentDec2026Usd: b.brentDec2026Usd,
          peakBrentAfterSeptemberUsd: b.peakBrentAfterSeptemberUsd,
          headlineCpiDec2026: b.headlineCpiDec2026,
        })),
      },
    },
    'Hormuz closure result',
  );
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
  brentPrewarUsd: number;
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
  marketHikeProbability: number;
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
  brentPrewarUsd: defaultWarSettlementParams.basePriceUsdPerBarrel,
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
  marketHikeProbability: 0.62,
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
      partialEquilibrium25bpOutputGapPctPoints: number;
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
      probabilityTrendAboveConsensus: number;
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
  const base = energyInflationScenarios['euro-area-2026-current'];
  return {
    ...base,
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

function summarizePolicyPath(
  id: FedPolicyPathSummary['id'],
  result: EnergyInflationResult,
): FedPolicyPathSummary {
  // Month 0 is March 2026.
  const at = (index: number) => result.months[index];
  const dec2026 = at(9);
  const jun2027 = at(15);
  const dec2027 = at(21);
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
  // "A long list of goods": apply the full diesel rise to a diesel-exposed
  // basket share, all at once. 2.5% is the direct weight plus a freight share.
  const naiveExposedShare = 0.025;
  const naiveHeadlineAddition = 100 * naiveExposedShare * dieselYoy;

  // --- V2a: distillate market clearing -------------------------------------
  const disrupted =
    input.disruptedSupplyMbd.russiaExportBan +
    input.disruptedSupplyMbd.hormuz +
    input.disruptedSupplyMbd.otherOutages;
  const shortfallShare = (disrupted - input.stockDrawMbd) / input.globalDieselDemandMbd;
  const wholesaleNow = input.brentUsdPerBarrel + input.dieselCrackNowUsdPerBarrel;
  const wholesaleYearAgo =
    (input.dieselUsdPerGalYearAgo - input.dieselTaxAndMarginUsdPerGal) * 42;
  const wholesaleMultiple = wholesaleNow / wholesaleYearAgo;
  const crackShare =
    (input.dieselCrackNowUsdPerBarrel - input.dieselCrackNormalUsdPerBarrel) /
    (wholesaleNow - wholesaleYearAgo);
  const impliedElasticity = Math.log(1 / (1 - shortfallShare)) / Math.log(wholesaleMultiple);
  const retailFromWholesale = (usdPerBarrel: number) =>
    usdPerBarrel / 42 + input.dieselTaxAndMarginUsdPerGal;
  const escalationShare =
    (disrupted + input.disruptedSupplyMbd.hormuz - input.stockDrawMbd) /
    input.globalDieselDemandMbd;
  const retailIfHormuzProductsLost = retailFromWholesale(
    wholesaleYearAgo * Math.pow(1 / (1 - escalationShare), 1 / impliedElasticity),
  );
  const retailAfterMediumRun = retailFromWholesale(
    wholesaleYearAgo * Math.pow(1 / (1 - shortfallShare), 1 / input.mediumRunDieselElasticity),
  );

  // --- V2b: what the diesel increment can add to CPI -----------------------
  const julyDiesel =
    input.dieselUsdPerGalJulyWeekly.reduce((a, b) => a + b, 0) /
    input.dieselUsdPerGalJulyWeekly.length;
  const gallonsPerYear = input.usDistillateDemandMbd * 1e6 * 42 * 365;
  const incrementalBill = (gallonsPerYear * (input.dieselUsdPerGalNow - julyDiesel)) / 1e9;
  const yoyBill = (gallonsPerYear * (input.dieselUsdPerGalNow - input.dieselUsdPerGalYearAgo)) / 1e9;
  const incrementalShareOfPce = incrementalBill / (input.usNominalPceTrillion * 1e3);
  const directLevel = 100 * input.directDieselCpiWeight * (input.dieselUsdPerGalNow / julyDiesel - 1);
  const indirectTarget = 100 * incrementalShareOfPce * input.indirectPassThrough;
  const indirectAfterYear = indirectTarget * (1 - Math.pow(0.5, 12 / input.indirectHalfLifeMonths));

  // --- V2c: base effects ---------------------------------------------------
  const julyEnergyMultiple =
    (input.motorFuelCpiWeight * (1 + input.gasolineYoyJuly) +
      (input.energyCpiWeight - input.motorFuelCpiWeight) * (1 + input.otherEnergyYoyJuly)) /
    input.energyCpiWeight;
  const energyContributionJuly = 100 * input.energyCpiWeight * Math.log(julyEnergyMultiple);
  const headlineIfEnergyFlat = input.coreCpiJuly + directLevel + indirectAfterYear;

  // --- V2d: policy rule comparison on a common retail-energy path ----------
  // Month 0 = March 2026. Observed retail motor-fuel multiples (80% gasoline,
  // 20% diesel by volume) blended with a flat other-energy component, then held
  // at September levels.
  const gasolineMultiple = (usd: number) => usd / input.gasolineUsdPerGalBase2025;
  const dieselMultiple = (usd: number) => usd / input.dieselUsdPerGalYearAgo;
  const motorFuel = (gas: number, diesel: number) =>
    0.8 * gasolineMultiple(gas) + 0.2 * dieselMultiple(diesel);
  const blend = (mf: number, other: number) =>
    (input.motorFuelCpiWeight * mf +
      (input.energyCpiWeight - input.motorFuelCpiWeight) * other) /
    input.energyCpiWeight;
  // Gasoline anchors (AAA/BLS): June $3.98 reported; July +24.6% y/y on the
  // $3.14 base gives $3.91; September $4.18 (straits.live). March–May follow
  // the reported April peak and the -5.7% June energy CPI print; August is
  // interpolated. Diesel: $4.00 in early April, the July weekly average, $5.47
  // on 18 August, and $5.85 on 4 September.
  const observedMonths = [
    blend(motorFuel(4.20, 4.00), 1.03),
    blend(motorFuel(4.60, 4.40), 1.05),
    blend(motorFuel(4.30, 4.50), 1.05),
    blend(motorFuel(3.98, 4.60), 1.05),
    blend(motorFuel(3.14 * (1 + input.gasolineYoyJuly), julyDiesel), 1.05),
    blend(motorFuel(4.00, 5.47), 1.05),
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
  const modelHeadlineJuly = lookThroughRun.months[4]?.headlineInflationPct ?? Number.NaN;
  const hikeRule = summarizePolicyPath(
    'hike-rule',
    simulateEnergyInflationV2(
      usEnergyInflationScenario(input, 'us-hike-rule', path, {
        supplyShockLookThrough: 0.3,
        policyInflationResponse: 1.0,
      }),
    ),
  );
  const base = energyInflationScenarios['euro-area-2026-current'];

  // --- V2e: payroll signal extraction --------------------------------------
  const monthlySe = input.payrollsCi90Thousand / 1.645;
  const threeMonthAverage =
    (input.payrollsJuneRevisedThousand +
      input.payrollsJulyRevisedThousand +
      input.payrollsAugustThousand) /
    3;
  const threeMonthSe = monthlySe / Math.sqrt(3);
  const zSurprise =
    (input.payrollsAugustThousand - input.payrollsConsensusThousand) / monthlySe;
  const probAbove = (threshold: number) =>
    1 - normalCdf((threshold - threeMonthAverage) / threeMonthSe);

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
        modelHeadlineJuly2026Pct: modelHeadlineJuly,
        headlineDifferenceDec2027PctPoints:
          lookThrough.headlineDec2027Pct - hikeRule.headlineDec2027Pct,
        outputGapDifferencePctPoints:
          hikeRule.troughOutputGapPct - lookThrough.troughOutputGapPct,
        partialEquilibrium25bpOutputGapPctPoints: -base.policyOutputSensitivity * 0.25,
        // JUDGMENT: large macro models put a sustained 100bp funds-rate move at
        // roughly -0.2pp on inflation after two years, so one 25bp step is ~-0.05pp.
        benchmark25bpInflationAfterTwoYearsPctPoints: -0.05,
      },
      labour: {
        threeMonthAverageThousand: threeMonthAverage,
        monthlyStandardErrorThousand: monthlySe,
        threeMonthStandardErrorThousand: threeMonthSe,
        probabilityAugustAboveConsensusIsSignal: normalCdf(zSurprise),
        probabilityTrendAboveBreakevenHigh: probAbove(input.breakevenHighThousand),
        probabilityTrendAboveBreakevenLow: probAbove(input.breakevenLowThousand),
        probabilityTrendAboveConsensus: probAbove(input.payrollsConsensusThousand),
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
  /** Days since 15 May 2026, the declaration date. */
  day: number;
  cumulativeCases?: number;
  cumulativeDeaths?: number;
}

export interface EbolaTrajectoryCase {
  anchors: readonly EbolaAnchor[];
  /** Affected-province population (Ituri plus North Kivu), for the SEIR denominator. */
  population: number;
  incubationDays: number;
  infectiousDays: number;
  caseReportDelayDays: number;
  infectionToDeathDays: number;
  serialIntervalDays: number;
  trainWeeks: number;
  projectionWeeks: number;
  /** MMWR (August 2026): share of validated alerts tested and test positivity. */
  alertsTestedShare: number;
  testPositivity: number;
  /** WHO: reported cases "at least double" in reality. */
  whoUnderreportingFactor: number;
  westAfricaCasesFirst100Days: number;
}

export const ebolaTrajectoryCase: EbolaTrajectoryCase = {
  // Cumulative confirmed cases and deaths, DRC plus Uganda, from WHO Disease
  // Outbreak News (DON602, DON605, DON616), CDC MMWR mm7535e1, and the
  // Wikipedia timeline of the 2026 Central Africa Ebola epidemic.
  anchors: [
    { date: '2026-05-15', day: 0, cumulativeCases: 8, cumulativeDeaths: 4 },
    { date: '2026-05-29', day: 14, cumulativeCases: 134, cumulativeDeaths: 18 },
    { date: '2026-06-20', day: 36, cumulativeCases: 1_000 },
    { date: '2026-07-13', day: 59, cumulativeCases: 2_000 },
    { date: '2026-07-22', day: 68, cumulativeDeaths: 1_000 },
    { date: '2026-07-24', day: 70, cumulativeCases: 3_000 },
    { date: '2026-08-07', day: 84, cumulativeCases: 4_000 },
    { date: '2026-08-09', day: 86, cumulativeDeaths: 2_000 },
    { date: '2026-08-14', day: 91, cumulativeCases: 4_665 },
    { date: '2026-08-19', day: 96, cumulativeDeaths: 2_500 },
    { date: '2026-08-21', day: 98, cumulativeCases: 5_458, cumulativeDeaths: 2_606 },
    { date: '2026-08-28', day: 105, cumulativeCases: 5_794, cumulativeDeaths: 2_786 },
    { date: '2026-09-04', day: 112, cumulativeCases: 6_522, cumulativeDeaths: 3_134 },
  ],
  population: 15_000_000,
  // Bundibugyo mean incubation 6.3 days; Ebola serial interval ~15 days.
  incubationDays: 6.3,
  infectiousDays: 8,
  caseReportDelayDays: 6,
  infectionToDeathDays: 15,
  serialIntervalDays: 15,
  trainWeeks: 13,
  projectionWeeks: 17,
  alertsTestedShare: 0.72,
  testPositivity: 0.24,
  whoUnderreportingFactor: 2,
  westAfricaCasesFirst100Days: 1_000,
};

export interface EbolaProjection {
  id: 'plateau-continues' | 'response-strengthens' | 'response-erodes';
  contactMultiplierChange: number;
  confirmedCasesByDec31: number;
  confirmedDeathsByDec31: number;
  weeklyCasesLateDecember: number;
}

export interface EbolaTrajectoryResult {
  case: EbolaTrajectoryCase;
  weekly: { week: number; cases: number; deaths: number }[];
  initialV1: {
    exponentialGrowthPerDay: number;
    doublingTimeDays: number;
    projectedCasesByDec31: number;
    casesFirst100Days: number;
    ratioToWestAfrica: number;
    flaw: string;
  };
  revisedV2: {
    fitted: {
      r0: number;
      responseStartDay: number;
      responseMultiplier: number;
      responseRampDays: number;
      initialExposed: number;
      ascertainment: number;
      fatalityPerInfection: number;
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
      ascertainment: number;
      trainCaseNmae: number;
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

function interpolateWeekly(
  anchors: readonly EbolaAnchor[],
  key: 'cumulativeCases' | 'cumulativeDeaths',
  weeks: number,
): number[] {
  const points = anchors
    .filter((a) => a[key] !== undefined)
    .map((a) => ({ day: a.day, value: a[key] as number }))
    .sort((a, b) => a.day - b.day);
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
  const weekly: number[] = [];
  for (let week = 0; week < weeks; week++) {
    weekly.push(Math.max(0, at((week + 1) * 7) - at(week * 7)));
  }
  return weekly;
}

function fitScale(
  unit: readonly number[],
  observed: readonly number[],
  weeks: number,
  min: number,
  max: number,
): number {
  let numerator = 0;
  let denominator = 0;
  for (let week = 0; week < weeks; week++) {
    numerator += (unit[week] ?? 0) * (observed[week] ?? 0);
    denominator += (unit[week] ?? 0) ** 2;
  }
  return denominator === 0 ? min : clamp(numerator / denominator, min, max);
}

function ebolaParams(
  input: EbolaTrajectoryCase,
  weeks: number,
  fit: {
    r0: number;
    initialExposed: number;
    responseStartDay: number;
    responseMultiplier: number;
    responseRampDays: number;
  },
  easing?: { startDay: number; multiplier: number },
): OutbreakV2Params {
  return {
    population: input.population,
    weeks,
    r0: fit.r0,
    infectiousDays: input.infectiousDays,
    incubationDays: input.incubationDays,
    initialInfectious: Math.max(1, fit.initialExposed * 0.4),
    initialExposed: fit.initialExposed,
    responseStartDay: fit.responseStartDay,
    responseMultiplier: fit.responseMultiplier,
    responseRampDays: fit.responseRampDays,
    easingStartDaysAfterResponse: easing
      ? Math.max(0, easing.startDay - fit.responseStartDay)
      : 9_999,
    easedResponseMultiplier: easing ? clamp(easing.multiplier, 0, 2) : fit.responseMultiplier,
    easingRampDays: 28,
    importedInfectionsPerMillionPerDay: 0,
    ascertainment: 1,
    infectionFatalityRatio: 1,
    caseReportDelayDays: input.caseReportDelayDays,
    infectionToDeathDays: input.infectionToDeathDays,
    // Care capacity is not the binding constraint on counts here (ETU
    // occupancy 64% nationally), so the overflow channel is switched off.
    hospitalizationRate: 0.5,
    hospitalStayDays: 12,
    staffedBedsPer100k: 1_000,
    overflowFatalitySlope: 0,
    severityDeclineStartDaysAfterResponse: 0,
    severityHalfLifeDays: Number.POSITIVE_INFINITY,
    severityFloor: 1,
  };
}

const scale = (series: OutbreakSeries, ascertainment: number, cfr: number): OutbreakSeries => {
  const weeklyCases = series.weeklyCases.map((v) => v * ascertainment);
  const weeklyDeaths = series.weeklyDeaths.map((v) => v * cfr);
  return {
    ...series,
    weeklyCases,
    weeklyDeaths,
    totalDeaths: weeklyDeaths.reduce((a, b) => a + b, 0),
  };
};

export function evaluateEbolaTrajectory(
  input: EbolaTrajectoryCase = ebolaTrajectoryCase,
): EbolaTrajectoryResult {
  assertFiniteDeep(input, 'Ebola trajectory case');
  const lastDay = Math.max(...input.anchors.map((a) => a.day));
  const weeks = Math.floor(lastDay / 7);
  if (weeks < input.trainWeeks + 2) throw new Error('Not enough weeks for a holdout');
  const cases = interpolateWeekly(input.anchors, 'cumulativeCases', weeks);
  const deaths = interpolateWeekly(input.anchors, 'cumulativeDeaths', weeks);
  const weekly = cases.map((c, week) => ({ week, cases: c, deaths: deaths[week] ?? 0 }));

  // --- V1: exponential extrapolation of "5,000 in 100 days" ---------------
  const a1000 = input.anchors.find((a) => a.cumulativeCases === 1_000);
  const a5000 = input.anchors.find((a) => (a.cumulativeCases ?? 0) >= 5_000);
  if (!a1000 || !a5000) throw new Error('Need the 1,000 and 5,000 anchors');
  const growth =
    Math.log((a5000.cumulativeCases ?? 1) / (a1000.cumulativeCases ?? 1)) /
    (a5000.day - a1000.day);
  const dec31Day = 230; // 15 May + 230 days = 31 December 2026
  const projectedV1 = (a5000.cumulativeCases ?? 0) * Math.exp(growth * (dec31Day - a5000.day));
  const casesFirst100Days = (() => {
    const before = input.anchors.filter((a) => a.day <= 100 && a.cumulativeCases !== undefined);
    const last = before[before.length - 1];
    return last?.cumulativeCases ?? 0;
  })();

  // --- V2: SEIR fit with a ramped response, three-week plateau holdout ------
  const episode: OutbreakEpisode = {
    id: 'bundibugyo-2026',
    label: 'Bundibugyo 2026',
    population: input.population,
    trainWeeks: input.trainWeeks,
    observations: weekly.map((w) => ({ date: `week-${w.week}`, cases: w.cases, deaths: w.deaths })),
  };
  let best:
    | {
        fit: Parameters<typeof ebolaParams>[2];
        ascertainment: number;
        cfr: number;
        evaluation: EpisodeEvaluation;
      }
    | undefined;
  for (const r0 of [1.4, 1.6, 1.8, 2.0, 2.3, 2.6, 3.0]) {
    for (const initialExposed of [60, 120, 240, 480]) {
      for (const responseStartDay of [7, 21, 35, 49, 63]) {
        for (const responseMultiplier of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
          for (const responseRampDays of [14, 28, 56, 84]) {
            const fit = { r0, initialExposed, responseStartDay, responseMultiplier, responseRampDays };
            const unit = simulateOutbreakV2(ebolaParams(input, weeks, fit));
            const ascertainment = fitScale(unit.weeklyCases, cases, input.trainWeeks, 0.05, 1);
            const cfr = fitScale(unit.weeklyDeaths, deaths, input.trainWeeks, 0.05, 0.8);
            const evaluation = evaluateEpisode(episode, scale(unit, ascertainment, cfr));
            if (!best || evaluation.train.score < best.evaluation.train.score) {
              best = { fit, ascertainment, cfr, evaluation };
            }
          }
        }
      }
    }
  }
  if (!best) throw new Error('Ebola fit failed');

  // V3: the same fit with a second response stage that starts before the
  // training window ends, so the plateau weeks inform it and the last three
  // weeks remain a genuine holdout.
  let bestTwoStage:
    | {
        startDay: number;
        multiplier: number;
        ascertainment: number;
        cfr: number;
        evaluation: EpisodeEvaluation;
      }
    | undefined;
  const secondStageChanges = Array.from({ length: 13 }, (_, i) => 0.4 + 0.05 * i);
  const fitSecondStage = (fitWeeks: number) => {
    let found: typeof bestTwoStage;
    const fitEpisode: OutbreakEpisode = { ...episode, trainWeeks: fitWeeks };
    for (const startDay of [42, 49, 56, 63, 70, 77]) {
      for (const change of secondStageChanges) {
        const multiplier = best.fit.responseMultiplier * change;
        const unit = simulateOutbreakV2(
          ebolaParams(input, weeks, best.fit, { startDay, multiplier }),
        );
        const ascertainment = fitScale(unit.weeklyCases, cases, fitWeeks, 0.05, 1);
        const cfr = fitScale(unit.weeklyDeaths, deaths, fitWeeks, 0.05, 0.8);
        const evaluation = evaluateEpisode(fitEpisode, scale(unit, ascertainment, cfr));
        if (!found || evaluation.train.score < found.evaluation.train.score) {
          found = { startDay, multiplier, ascertainment, cfr, evaluation };
        }
      }
    }
    if (!found) throw new Error('Ebola two-stage fit failed');
    return found;
  };
  // Holdout test: second stage fitted on the training weeks only.
  bestTwoStage = fitSecondStage(input.trainWeeks);
  const twoStage = bestTwoStage;
  // Projection basis: the same structure refitted on every observed week,
  // once the holdout has served as the out-of-sample check.
  const finalStage = fitSecondStage(weeks);

  const lastFour = cases.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const midJuly = cases[9] ?? 0; // week 9 = 17–24 July
  // Two-week sums two weeks apart approximate one ~15-day serial interval and
  // damp the reporting batches visible in the anchors.
  const rt = weekly
    .filter((w) => w.week >= 3)
    .map((w) => {
      const now = (cases[w.week] ?? 0) + (cases[w.week - 1] ?? 0);
      const lag = (cases[w.week - 2] ?? 0) + (cases[w.week - 3] ?? 0);
      return { week: w.week, rt: lag > 0 ? now / lag : Number.NaN };
    })
    .filter((row) => Number.isFinite(row.rt));
  const rtNow = rt.slice(-2).reduce((a, b) => a + b.rt, 0) / Math.max(1, rt.slice(-2).length);
  const cumulativeByDec31 = (series: OutbreakSeries, upToWeek: number) => ({
    cases: series.weeklyCases.slice(0, upToWeek).reduce((a, b) => a + b, 0),
    deaths: series.weeklyDeaths.slice(0, upToWeek).reduce((a, b) => a + b, 0),
  });
  const totalWeeks = weeks + input.projectionWeeks;
  const projections: EbolaProjection[] = (
    [
      ['plateau-continues', 1.0],
      ['response-strengthens', 0.8],
      ['response-erodes', 1.2],
    ] as const
  ).map(([id, change]) => {
    // Projections carry the full-sample two-stage fit forward; the branch
    // changes the contact multiplier from the last observed day.
    const unit = simulateOutbreakV2({
      ...ebolaParams(input, totalWeeks, best.fit, {
        startDay: finalStage.startDay,
        multiplier: finalStage.multiplier,
      }),
      additionalStages: [
        { startDay: lastDay, multiplier: clamp(finalStage.multiplier * change, 0, 2), rampDays: 28 },
      ],
    });
    const scaled = scale(unit, finalStage.ascertainment, finalStage.cfr);
    const observedToDate = {
      cases: cases.reduce((a, b) => a + b, 0),
      deaths: deaths.reduce((a, b) => a + b, 0),
    };
    const modeledToDate = cumulativeByDec31(scaled, weeks);
    const modeledEnd = cumulativeByDec31(scaled, totalWeeks);
    return {
      id,
      contactMultiplierChange: change,
      // Anchor the projection on the observed cumulative count, not the fitted one.
      confirmedCasesByDec31: observedToDate.cases + (modeledEnd.cases - modeledToDate.cases),
      confirmedDeathsByDec31: observedToDate.deaths + (modeledEnd.deaths - modeledToDate.deaths),
      weeklyCasesLateDecember: scaled.weeklyCases[totalWeeks - 1] ?? 0,
    };
  });

  const result: EbolaTrajectoryResult = {
    case: input,
    weekly,
    initialV1: {
      exponentialGrowthPerDay: growth,
      doublingTimeDays: Math.log(2) / growth,
      projectedCasesByDec31: projectedV1,
      casesFirst100Days,
      ratioToWestAfrica: casesFirst100Days / input.westAfricaCasesFirst100Days,
      flaw:
        'Extrapolates the June–August doubling time as if incidence were still accelerating, when weekly confirmed counts have been flat since mid-July.',
    },
    revisedV2: {
      fitted: {
        r0: best.fit.r0,
        responseStartDay: best.fit.responseStartDay,
        responseMultiplier: best.fit.responseMultiplier,
        responseRampDays: best.fit.responseRampDays,
        initialExposed: best.fit.initialExposed,
        ascertainment: best.ascertainment,
        fatalityPerInfection: best.cfr,
        impliedConfirmedCaseFatality: best.cfr / best.ascertainment,
        effectiveReproductionNumberNow: best.fit.r0 * best.fit.responseMultiplier,
      },
      evaluation: best.evaluation,
      twoStage: {
        secondStageStartDay: twoStage.startDay,
        secondStageMultiplier: twoStage.multiplier,
        effectiveReproductionNumberNow: best.fit.r0 * twoStage.multiplier,
        evaluation: twoStage.evaluation,
        holdoutCumulativeErrorImprovement:
          best.evaluation.holdout.caseCumulativeError -
          twoStage.evaluation.holdout.caseCumulativeError,
      },
      finalFit: {
        secondStageStartDay: finalStage.startDay,
        secondStageMultiplier: finalStage.multiplier,
        effectiveReproductionNumberNow: best.fit.r0 * finalStage.multiplier,
        ascertainment: finalStage.ascertainment,
        trainCaseNmae: finalStage.evaluation.train.caseNmae,
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
  assertFiniteDeep(
    { v1: result.initialV1, fitted: result.revisedV2.fitted, projections },
    'Ebola trajectory result',
  );
  return result;
}

export const september6HeadlineEvidence = {
  hormuz: {
    straitsLive: 'https://straits.live/',
    abcLive:
      'https://abcnews.com/International/live-updates/iran-live-updates-centcom-targeted-iranian-forces-posed/?id=136080582',
    brent: 'https://tradingeconomics.com/commodity/brent-crude-oil',
    eiaSteo: 'https://www.eia.gov/outlooks/steo/',
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

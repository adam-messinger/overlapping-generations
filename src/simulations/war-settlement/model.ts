/**
 * Monthly reserve-and-magazine model of the 2026 US–Iran war.
 *
 * Four depletable stocks are tracked to their operational floors: the US
 * Strategic Petroleum Reserve, Chinese and rest-of-world crude reserves, the
 * US high-end interceptor and standoff-strike magazines, and Iran's ballistic
 * missile inventory and launcher fleet. Depletion drives four pressure indices
 * — US headline inflation, Iranian poverty, US magazine cover, Iranian salvo
 * credibility — which are mapped to a competing-risk monthly hazard of a
 * settlement attempt.
 *
 * The physical and price blocks are calibrated against the reported February
 * to July 2026 record. The hazard mapping is not identified by anything and is
 * reported as a swept judgment, never as an estimate.
 */

import { clamp, lognormalSigmaFromGini, normalCdf, normalQuantile } from '../../primitives/math.js';
import {
  OBSERVED_MONTHS,
  SETTLEMENT_CHANNELS,
  defaultWarSettlementParams,
  warSettlementEvidence,
  type SettlementChannel,
  type WarSettlementParams,
  type WarSettlementScenario,
} from './data.js';

const E = warSettlementEvidence;
const DAYS_PER_MONTH = 30.4;

export interface WarSettlementMonth {
  monthIndex: number;
  year: number;
  month: number;
  /** Combat tempo actually sustained, after magazine limits bite. */
  intensity: number;

  // Oil and reserves
  hormuzThroughput: number;
  /** Global supply shortfall before reserve draws, mb/d. */
  grossDeficitMbd: number;
  /** Shortfall remaining after all reserve draws, mb/d — this sets the price. */
  netDeficitMbd: number;
  usSprDrawMbd: number;
  chinaDrawMbd: number;
  rowDrawMbd: number;
  usSprMb: number;
  chinaReserveMb: number;
  rowReserveMb: number;
  /** True once the SPR authorization or the operable floor stops US draws. */
  usSprExhausted: boolean;
  brentUsdPerBarrel: number;

  // US economy
  retailGasolineUsdPerGal: number;
  energyCpiYoy: number;
  headlineCpiYoy: number;
  coreCpiYoy: number;

  // Iranian economy
  iranOilExportsMbd: number;
  iranOilRevenueBillionPerMonth: number;
  iranFiscalDeficitBillionPerMonth: number;
  iranMonthlyInflation: number;
  iranRealIncomeIndex: number;
  iranPovertyHeadcount: number;
  /** Cumulative rial depreciation against the dollar since March 2026. */
  iranRialDepreciation: number;

  // Magazines
  iranLaunches: number;
  iranMissileInventory: number;
  iranLaunchers: number;
  iranSustainableSalvo: number;
  usHighEndInterceptors: number;
  usAreaInterceptors: number;
  usStandoffWeapons: number;
  /** Whichever US interceptor pool sits furthest below its reserve floor. */
  usMagazineCoverShare: number;

  // Settlement
  pressures: Record<Exclude<SettlementChannel, 'diplomatic'>, number>;
  channelHazards: Record<SettlementChannel, number>;
  /** Monthly probability of a settlement attempt. */
  attemptHazard: number;
  /** Monthly probability of a durable settlement. */
  settlementHazard: number;
  /** Probability the war is still running at the start of this month. */
  survival: number;
  /** Cumulative probability a durable settlement has occurred by month end. */
  cumulativeSettlement: number;
}

export interface WarSettlementResult {
  scenario: WarSettlementScenario;
  params: WarSettlementParams;
  months: readonly WarSettlementMonth[];
  /** Probability the war is unsettled at the end of the horizon. */
  unsettledProbability: number;
  /** Share of settlements attributable to each channel. */
  channelAttribution: Record<SettlementChannel, number>;
  /** Month index at which cumulative settlement first crosses each quantile. */
  quantileMonths: { p25: number | null; p50: number | null; p75: number | null };
  /** Calendar labels for the same quantiles. */
  quantileLabels: { p25: string | null; p50: string | null; p75: string | null };
  /** First month in which each stock hits its operational floor, if it does. */
  bindingMonths: {
    usSpr: number | null;
    chinaReserve: number | null;
    usHighEndInterceptors: number | null;
    usAreaInterceptors: number | null;
    iranMissiles: number | null;
  };
}

/**
 * Interceptor and strike pools.
 *
 * The two interceptor pools are kept separate because they are consumed by
 * different threats and are at very different states of depletion: the high-end
 * pool (THAAD plus SM-3) engages ballistic missiles, while the area pool
 * (Patriot plus SM-6) absorbs the drone and cruise-missile stream and is the
 * one reported at roughly one-third of its pre-war level.
 */
const MAGAZINES = {
  /** THAAD in service plus SM-3 available, February 2026. */
  highEndPrewar: 860,
  /** Patriot PAC-3 family, February 2026, implied by the reported depletion. */
  areaPrewar: 2_850,
  /** Tomahawk and JASSM-class standoff weapons, February 2026. */
  standoffPrewar: 7_500,
  /** Monthly deliveries before the FY27 ramp, and after it. */
  highEndPerMonth: 5.5, // SM-3 only; THAAD deliveries paused since Aug 2023
  highEndPerMonthAfterRamp: 38.5, // THAAD resumes ~April 2027 at 400/yr
  areaPerMonth: 50, // PAC-3 MSE at the current 600/yr
  areaPerMonthAfterRamp: 92,
  standoffPerMonth: 20, // FY26 procurement (55 Tomahawks) is a rounding error
  standoffPerMonthAfterRamp: 140, // Tomahawk >1,000/yr plus a JASSM line at ~700
  /** Month index (from February 2026) at which FY27 deliveries arrive. */
  rampMonthIndex: 14, // April 2027
} as const;

/** Iranian drone and cruise-missile launches per month at full tempo. */
const IRAN_DRONES_PER_MONTH = 580;

/** Share of Chinese crude imports that normally transits Hormuz. */
const CHINA_HORMUZ_IMPORT_SHARE = 0.45;

/** Bypass pipelines rarely run at nameplate; crude only, never products. */
const BYPASS_UTILIZATION = 0.75;

/**
 * War-risk premium on Brent at full combat tempo, $/bbl. Fitted jointly with
 * the elasticity to the June trough and the 29 July close, and it carries the
 * part of the price that is expectation rather than physical shortfall.
 */
const WAR_RISK_PREMIUM_USD = 29;

/**
 * Iranian export volume falls this much per unit of combat tempo. Set so that
 * the July 2026 tempo reproduces the reported 1.5 mb/d still leaving Iran.
 */
const IRAN_BLOCKADE_STRENGTH = 0.15;
/** Pre-war Iranian crude exports, mb/d. */
const IRAN_PREWAR_EXPORTS_MBD = 1.7;
/** Iranian non-oil revenue lost per unit of Hormuz trade disruption. */
const IRAN_TRADE_ELASTICITY = 0.60;
/** War premium on Iranian government spending at full tempo. */
const IRAN_WAR_SPENDING_UPLIFT = 0.25;
/** Wage indexation converges from its initial value toward this over ~1 year. */
const IRAN_INDEXATION_CEILING = 0.80;
const IRAN_INDEXATION_HALFLIFE_MONTHS = 12;

/**
 * Probability that a settlement attempt becomes durable.
 *
 * Anchored on the single observation available: the mid-June 2026 ceasefire was
 * reached and collapsed within six weeks. One failure out of one attempt cannot
 * identify a rate, so this is set below one-half and swept.
 */
const SETTLEMENT_DURABILITY = 0.45;

const monthLabel = (year: number, month: number): string => {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[month - 1]} ${year}`;
};

/** Read a scenario path at `index`, holding the final value beyond its end. */
const pathAt = (path: readonly number[], index: number): number =>
  path.length === 0 ? 0 : path[Math.min(index, path.length - 1)];

/**
 * Poverty headcount under a lognormal income distribution whose mean has moved
 * by `realIncomeIndex` relative to the pre-war calibration point.
 *
 * The dispersion is pinned by Iran's Gini and held fixed, so the headcount moves
 * only with the mean. That understates distributional widening in a war economy
 * and therefore understates the poverty channel.
 */
export function povertyHeadcount(
  realIncomeIndex: number,
  prewarHeadcount: number,
  gini: number,
): number {
  const sigma = lognormalSigmaFromGini(gini);
  // Pre-war: prewarHeadcount = Phi((ln z - ln mu + sigma^2/2) / sigma). Solve for
  // the pre-war distance between the poverty line and the mean, then shift it.
  const prewarDeviate = normalQuantile(clamp(prewarHeadcount, 1e-4, 1 - 1e-4));
  const shifted = prewarDeviate - Math.log(Math.max(realIncomeIndex, 1e-6)) / sigma;
  return clamp(normalCdf(shifted), 0, 1);
}

export function simulateWarSettlement(
  scenario: WarSettlementScenario,
  overrides: Partial<WarSettlementParams> = {},
): WarSettlementResult {
  const p: WarSettlementParams = { ...defaultWarSettlementParams, ...overrides };

  // --- Initial stocks -------------------------------------------------------
  let usSpr = E.reserves.usSprDec2025Mb;
  let sprReleased = 0;
  let sprAuthorization = E.reserves.usSprAuthorizedReleaseMb;
  const chinaReservePeak = E.reserves.chinaReserveDec2025Mb;
  let chinaReserve = chinaReservePeak;
  let rowReserve = E.reserves.ieaCollectiveMb - E.reserves.usSprDec2025Mb;

  // The 28 February opening salvo happened the day before the first simulated
  // month, so it is applied as an initial condition rather than as a step.
  const openingSalvo = E.iranMunitions.openingSalvo;
  let iranMissiles: number = E.iranMunitions.prewarInventory - openingSalvo;
  let iranLaunchers: number = E.iranMunitions.launchersPrewar;
  let highEnd = MAGAZINES.highEndPrewar -
    openingSalvo * p.ballisticEngagementShare * p.interceptorsPerBallisticMissile;
  let area = MAGAZINES.areaPrewar - openingSalvo * p.areaInterceptorsPerBallisticMissile;
  let standoff = MAGAZINES.standoffPrewar;
  let commercialStock = p.commercialStockMobilizableMb;

  const prewarPumpPrice = p.pumpBaseUsdPerGal +
    p.crudePassthroughUsdPerGalPerBarrel * p.basePriceUsdPerBarrel;
  let iranRealIncome = 1;
  let iranGdpIndex = 1;
  let coreCpi = p.coreInflationBaseline;
  let iranRialIndex = 1;
  /** Twelve-month trailing pump prices, seeded at the pre-war level. */
  const pumpHistory: number[] = Array.from({ length: 12 }, () => prewarPumpPrice);

  let survival = 1;
  let cumulativeSettlement = 0;
  const attribution: Record<SettlementChannel, number> = {
    usInflation: 0,
    iranPoverty: 0,
    usMagazine: 0,
    iranMagazine: 0,
    diplomatic: 0,
  };
  const binding: WarSettlementResult['bindingMonths'] = {
    usSpr: null,
    chinaReserve: null,
    usHighEndInterceptors: null,
    usAreaInterceptors: null,
    iranMissiles: null,
  };

  const months: WarSettlementMonth[] = [];
  const iranProductionPerMonth =
    (E.iranMunitions.productionPerMonthLow + E.iranMunitions.productionPerMonthHigh) / 2;

  for (let t = 0; t < scenario.months; t += 1) {
    const calendarMonth = ((scenario.startMonth - 1 + t) % 12) + 1;
    const year = scenario.startYear + Math.floor((scenario.startMonth - 1 + t) / 12);

    // --- Combat tempo, limited by the US standoff magazine -------------------
    const baseIntensity = pathAt(scenario.baseIntensityPath, t);
    const strikeDemand = p.usStrikeWeaponsPerMonth * baseIntensity;
    const strikeLimiter = strikeDemand > 0 ? Math.min(1, standoff / strikeDemand) : 1;
    const intensity = baseIntensity * strikeLimiter;

    // --- Iranian launches ---------------------------------------------------
    const launcherCapacity = iranLaunchers * p.iranSortiesPerLauncherMonth * intensity;
    const inventoryCap = iranMissiles * p.iranMaxInventoryDrawShare;
    const launches = Math.max(0, Math.min(launcherCapacity, inventoryCap, iranMissiles));
    const drones = IRAN_DRONES_PER_MONTH * intensity;

    // --- Magazine accounting ------------------------------------------------
    // Desired engagements, then what the remaining magazine can actually
    // support. A depleted pool degrades coverage rather than hitting zero.
    const highEndBurn = Math.min(
      launches * p.ballisticEngagementShare * p.interceptorsPerBallisticMissile,
      highEnd * p.maxMonthlyMagazineCommitShare,
    );
    const areaBurn = Math.min(
      drones * p.droneEngagementShare * p.areaInterceptorsPerDrone +
        launches * p.areaInterceptorsPerBallisticMissile,
      area * p.maxMonthlyMagazineCommitShare,
    );
    const standoffBurn = Math.min(standoff, p.usStrikeWeaponsPerMonth * intensity);
    const ramped = t >= MAGAZINES.rampMonthIndex;

    highEnd = Math.max(0, highEnd - highEndBurn) +
      (ramped ? MAGAZINES.highEndPerMonthAfterRamp : MAGAZINES.highEndPerMonth);
    area = Math.max(0, area - areaBurn) +
      (ramped ? MAGAZINES.areaPerMonthAfterRamp : MAGAZINES.areaPerMonth);
    standoff = Math.max(0, standoff - standoffBurn) +
      (ramped ? MAGAZINES.standoffPerMonthAfterRamp : MAGAZINES.standoffPerMonth);

    const iranProduction = iranProductionPerMonth * (1 - p.iranProductionSuppression * intensity);
    const missilesDestroyed = iranMissiles * p.iranMissileAttritionShare * intensity;
    iranMissiles = Math.max(0, iranMissiles - launches + iranProduction - missilesDestroyed);
    iranLaunchers = Math.max(
      0,
      iranLaunchers * (1 - p.iranLauncherAttritionShare * intensity) +
        p.iranLauncherReplacementPerMonth,
    );

    // --- Oil supply and reserve draws ---------------------------------------
    const throughput = pathAt(scenario.hormuzThroughputPath, t);
    const hormuzFlow = E.oil.hormuzNormalFlowMbd * throughput;
    const lostFlow = E.oil.hormuzNormalFlowMbd - hormuzFlow;
    const ramp = Math.min(1, (t + 1) / p.supplyResponseRampMonths);
    const bypassed = Math.min(lostFlow, E.oil.bypassCapacityMbd * BYPASS_UTILIZATION * ramp);
    const nonGulf = p.nonGulfResponseMbd * ramp;
    const grossDeficit = Math.max(0, lostFlow - bypassed - nonGulf);

    // Draw decisions use last month's price, which avoids a same-month fixed
    // point between the price and the policy response to it.
    // The March 2026 order released a fixed 172 mb on a schedule; it is drawn
    // down at a steady tempo rather than metered against the monthly shortfall,
    // which is why the SPR kept falling through the June price trough.
    const sprHeadroom = Math.max(0, usSpr - p.usSprMinimumOperableMb);
    const authorizationLeft = Math.max(0, sprAuthorization - sprReleased);
    // The authorization, once issued, is executed on schedule: the reserve kept
    // falling 3.7 mb/week straight through the June price trough. Whether a
    // further authorization would follow is out of scope; the 200 mb operable
    // floor bounds anything that could.
    const sprWanted = p.usSprMaxDrawPerMonthMb;
    const sprDrawMb = Math.min(sprWanted, sprHeadroom, authorizationLeft);
    // Exhausted means the stock or the authorization stopped the draw, not that
    // the price fell far enough that no draw was wanted.
    const usSprExhausted = sprWanted > 0 &&
      Math.min(sprHeadroom, authorizationLeft) < sprWanted - 1e-9;
    usSpr -= sprDrawMb;
    sprReleased += sprDrawMb;
    if (usSprExhausted && binding.usSpr === null) binding.usSpr = t;

    const chinaAvailability = clamp((hormuzFlow + bypassed) / E.oil.hormuzNormalFlowMbd, 0, 1);
    const chinaShortfallMbd = E.reserves.chinaImportsMbd * CHINA_HORMUZ_IMPORT_SHARE *
      (1 - chinaAvailability);
    const chinaFloor = chinaReservePeak * p.chinaReserveFloorShare;
    const chinaDrawMb = Math.min(
      chinaShortfallMbd * p.chinaDrawCoverageShare * DAYS_PER_MONTH,
      Math.max(0, chinaReserve - chinaFloor),
    );
    chinaReserve -= chinaDrawMb;
    if (chinaReserve <= chinaFloor + 1e-9 && binding.chinaReserve === null) binding.chinaReserve = t;

    const rowDrawMb = Math.min(
      grossDeficit > 0 ? p.rowMaxDrawPerMonthMb : 0,
      Math.max(0, rowReserve - p.rowReserveFloorMb),
    );
    rowReserve -= rowDrawMb;

    // Commercial crude and product stocks are the largest and fastest buffer in
    // the system; leaving them out makes the March closure look apocalyptic.
    const strategicMbd = (sprDrawMb + chinaDrawMb + rowDrawMb) / DAYS_PER_MONTH;
    const commercialDrawMb = Math.min(
      p.commercialMaxDrawPerMonthMb,
      Math.max(0, commercialStock),
      Math.max(0, grossDeficit - strategicMbd) * DAYS_PER_MONTH,
    );
    commercialStock -= commercialDrawMb;
    const drawMbd = strategicMbd + commercialDrawMb / DAYS_PER_MONTH;
    const netDeficit = Math.max(0, grossDeficit - drawMbd);

    // --- Price --------------------------------------------------------------
    const deficitShare = netDeficit / E.oil.globalLiquidsSupplyMbd;
    const elasticity = (p.shortRunDemandElasticity + p.elasticityMonthlyDrift * t) *
      (1 + deficitShare * p.elasticityShockScale);
    const brent = p.basePriceUsdPerBarrel * (1 + deficitShare / elasticity) +
      WAR_RISK_PREMIUM_USD * intensity;

    // --- US pump price and CPI ----------------------------------------------
    // Refined product does not travel the bypass pipelines, so product-market
    // stress tracks raw Hormuz throughput, not throughput plus bypass.
    const productDisruption = clamp(1 - throughput, 0, 1);
    const pump = p.pumpBaseUsdPerGal +
      p.crudePassthroughUsdPerGalPerBarrel * brent +
      p.productCrackUsdPerGal * Math.pow(productDisruption, 0.6);
    const yearAgoPump = pumpHistory[pumpHistory.length - 12] ?? prewarPumpPrice;
    const energyCpiYoy = pump / yearAgoPump - 1;
    pumpHistory.push(pump);

    // Second-round pass: core picks up a fraction of the energy contribution.
    coreCpi = p.coreInflationBaseline +
      p.energyToCorePassthrough * p.cpiMotorFuelWeight * Math.max(0, energyCpiYoy);
    const headlineCpi = (1 - p.cpiMotorFuelWeight - p.cpiOtherEnergyWeight) * coreCpi +
      p.cpiMotorFuelWeight * energyCpiYoy +
      p.cpiOtherEnergyWeight * p.otherEnergyInflation;

    // --- Iranian economy ----------------------------------------------------
    const exportFactor = clamp(1 - IRAN_BLOCKADE_STRENGTH * intensity, 0, 1);
    const iranExports = IRAN_PREWAR_EXPORTS_MBD * exportFactor;
    const iranOilRevenue = iranExports * DAYS_PER_MONTH *
      Math.max(0, brent - p.iranSanctionsDiscountUsd) / 1_000;
    const tradeLoss = clamp(
      E.iranEconomy.tradeShareViaHormuz * (1 - throughput) * IRAN_TRADE_ELASTICITY,
      0,
      0.9,
    );
    const iranNonOilRevenue = p.iranNonOilRevenueBillionPerMonth * (1 - tradeLoss) * iranGdpIndex;
    const iranSpending = p.iranSpendingBillionPerMonth * (1 + IRAN_WAR_SPENDING_UPLIFT * intensity);
    const iranDeficit = Math.max(0, iranSpending - iranOilRevenue - iranNonOilRevenue);
    const moneyGrowth = p.iranDeficitMonetizationShare * iranDeficit / p.iranBaseMoneyBillion;
    const iranInflation = moneyGrowth * p.iranMoneyToInflation;
    iranRialIndex *= 1 + iranInflation * p.iranInflationToDepreciation;

    const indexation = p.iranWageIndexation +
      (IRAN_INDEXATION_CEILING - p.iranWageIndexation) *
        (1 - Math.exp(-t / IRAN_INDEXATION_HALFLIFE_MONTHS));
    const monthlyGdpGrowth = E.iranEconomy.imfGdpGrowth2026 / 12;
    iranGdpIndex *= 1 + monthlyGdpGrowth;
    iranRealIncome *= (1 + monthlyGdpGrowth) * (1 - iranInflation * (1 - indexation));
    iranRealIncome = Math.max(iranRealIncome, 0.15); // subsistence and informal floor
    const poverty = povertyHeadcount(
      iranRealIncome,
      p.iranPrewarPovertyHeadcount,
      E.iranEconomy.gini,
    );

    // --- Pressure indices ---------------------------------------------------
    const usInflationPressure = Math.max(0, headlineCpi - p.usCpiTolerance) / p.usCpiTolerance +
      0.5 * Math.max(0, pump - p.gasolineSalienceUsdPerGal) / p.gasolineSalienceUsdPerGal;
    const iranPovertyPressure = Math.max(0, poverty - p.iranPrewarPovertyHeadcount) /
      p.iranPrewarPovertyHeadcount;
    const highEndCover = highEnd / (MAGAZINES.highEndPrewar * p.usInterceptorReserveShare);
    const areaCover = area / (MAGAZINES.areaPrewar * p.usInterceptorReserveShare);
    const usMagazineCover = Math.min(highEndCover, areaCover);
    const usMagazinePressure = Math.max(0, 1 - usMagazineCover);
    const sustainableSalvo = Math.min(
      iranLaunchers * p.iranSortiesPerLauncherMonth,
      iranProduction + iranMissiles * p.iranMaxInventoryDrawShare,
    );
    const iranMagazinePressure = Math.max(
      0,
      1 - sustainableSalvo / p.iranCredibleSalvoPerMonth,
    );

    if (highEndCover < 1 && binding.usHighEndInterceptors === null) binding.usHighEndInterceptors = t;
    if (areaCover < 1 && binding.usAreaInterceptors === null) binding.usAreaInterceptors = t;
    if (sustainableSalvo < p.iranCredibleSalvoPerMonth && binding.iranMissiles === null) {
      binding.iranMissiles = t;
    }

    // --- Competing-risk settlement hazard -----------------------------------
    const channelHazard = (weight: number, pressure: number): number =>
      Math.min(p.maxChannelHazard, weight * Math.pow(Math.max(0, pressure), p.hazardExponent));
    const channelHazards: Record<SettlementChannel, number> = {
      usInflation: channelHazard(p.usInflationHazardWeight, usInflationPressure),
      iranPoverty: channelHazard(p.iranPovertyHazardWeight, iranPovertyPressure),
      usMagazine: channelHazard(p.usMagazineHazardWeight, usMagazinePressure),
      iranMagazine: channelHazard(p.iranMagazineHazardWeight, iranMagazinePressure),
      diplomatic: p.baselineDiplomaticHazard,
    };
    let sustained = 1;
    for (const channel of SETTLEMENT_CHANNELS) sustained *= 1 - channelHazards[channel];
    const attemptHazard = 1 - sustained;
    const settlementHazard = attemptHazard * SETTLEMENT_DURABILITY;

    const settledThisMonth = survival * settlementHazard;
    const hazardTotal = SETTLEMENT_CHANNELS.reduce((sum, c) => sum + channelHazards[c], 0);
    if (hazardTotal > 0) {
      for (const channel of SETTLEMENT_CHANNELS) {
        attribution[channel] += settledThisMonth * (channelHazards[channel] / hazardTotal);
      }
    }
    const survivalAtStart = survival;
    survival *= 1 - settlementHazard;
    cumulativeSettlement = 1 - survival;

    months.push({
      monthIndex: t,
      year,
      month: calendarMonth,
      intensity,
      hormuzThroughput: throughput,
      grossDeficitMbd: grossDeficit,
      netDeficitMbd: netDeficit,
      usSprDrawMbd: sprDrawMb / DAYS_PER_MONTH,
      chinaDrawMbd: chinaDrawMb / DAYS_PER_MONTH,
      rowDrawMbd: rowDrawMb / DAYS_PER_MONTH,
      usSprMb: usSpr,
      chinaReserveMb: chinaReserve,
      rowReserveMb: rowReserve,
      usSprExhausted,
      brentUsdPerBarrel: brent,
      retailGasolineUsdPerGal: pump,
      energyCpiYoy,
      headlineCpiYoy: headlineCpi,
      coreCpiYoy: coreCpi,
      iranOilExportsMbd: iranExports,
      iranOilRevenueBillionPerMonth: iranOilRevenue,
      iranFiscalDeficitBillionPerMonth: iranDeficit,
      iranMonthlyInflation: iranInflation,
      iranRealIncomeIndex: iranRealIncome,
      iranPovertyHeadcount: poverty,
      iranRialDepreciation: 1 - 1 / iranRialIndex,
      iranLaunches: launches,
      iranMissileInventory: iranMissiles,
      iranLaunchers,
      iranSustainableSalvo: sustainableSalvo,
      usHighEndInterceptors: highEnd,
      usAreaInterceptors: area,
      usStandoffWeapons: standoff,
      usMagazineCoverShare: usMagazineCover,
      pressures: {
        usInflation: usInflationPressure,
        iranPoverty: iranPovertyPressure,
        usMagazine: usMagazinePressure,
        iranMagazine: iranMagazinePressure,
      },
      channelHazards,
      attemptHazard,
      settlementHazard,
      survival: survivalAtStart,
      cumulativeSettlement,
    });
  }

  const totalSettled = cumulativeSettlement;
  const channelAttribution = Object.fromEntries(
    SETTLEMENT_CHANNELS.map((c) => [c, totalSettled > 0 ? attribution[c] / totalSettled : 0]),
  ) as Record<SettlementChannel, number>;

  const crossing = (q: number): number | null => {
    const hit = months.find((m) => m.cumulativeSettlement >= q);
    return hit ? hit.monthIndex : null;
  };
  const label = (index: number | null): string | null => {
    if (index === null) return null;
    const m = months[index];
    return monthLabel(m.year, m.month);
  };
  const quantileMonths = { p25: crossing(0.25), p50: crossing(0.5), p75: crossing(0.75) };

  return {
    scenario,
    params: p,
    months,
    unsettledProbability: 1 - cumulativeSettlement,
    channelAttribution,
    quantileMonths,
    quantileLabels: {
      p25: label(quantileMonths.p25),
      p50: label(quantileMonths.p50),
      p75: label(quantileMonths.p75),
    },
    bindingMonths: binding,
  };
}

// --- Ensemble ---------------------------------------------------------------

export interface EnsembleAxis {
  key: keyof WarSettlementParams;
  label: string;
  low: number;
  central: number;
  high: number;
  /** Why this range: a reported spread, or a swept judgment. */
  basis: 'reported-range' | 'judgment-sweep';
}

/**
 * Axes the ensemble varies.
 *
 * The first three are reported disagreements between sources — the model is not
 * entitled to pick a point inside them. The last three are the judgment dials
 * that convert depletion into a settlement hazard, and their spread is what the
 * "how confident is this" answer actually rests on.
 */
export const ensembleAxes: readonly EnsembleAxis[] = [
  {
    key: 'iranMissileAttritionShare',
    label: 'Iranian missile stock destroyed per strike-month',
    low: 0.050,
    central: 0.075,
    high: 0.105,
    basis: 'reported-range',
  },
  {
    key: 'interceptorsPerBallisticMissile',
    label: 'High-end interceptors per engaged ballistic missile',
    low: 1.1,
    central: 1.4,
    high: 1.8,
    basis: 'reported-range',
  },
  {
    key: 'iranPrewarPovertyHeadcount',
    label: 'Iranian pre-war poverty headcount',
    low: 0.22,
    central: 0.30,
    high: 0.44,
    basis: 'reported-range',
  },
  {
    key: 'usInflationHazardWeight',
    label: 'US inflation hazard weight',
    low: 0.05,
    central: 0.10,
    high: 0.18,
    basis: 'judgment-sweep',
  },
  {
    key: 'iranPovertyHazardWeight',
    label: 'Iranian poverty hazard weight',
    low: 0.055,
    central: 0.11,
    high: 0.20,
    basis: 'judgment-sweep',
  },
  {
    key: 'usMagazineHazardWeight',
    label: 'US magazine hazard weight',
    low: 0.045,
    central: 0.09,
    high: 0.16,
    basis: 'judgment-sweep',
  },
];

export interface WarSettlementEnsemble {
  scenario: WarSettlementScenario;
  memberCount: number;
  /** Marginal settlement CDF, pooled with equal weight over members. */
  cumulative: readonly number[];
  /**
   * The same CDF renormalised on the war having survived the observed window.
   * This is the reportable one: the model is being read at the end of July 2026
   * and the fact that no durable settlement happened by then is data, not a
   * forecast to be re-issued.
   */
  conditionalCumulative: readonly number[];
  conditionalQuantileLabels: { p10: string | null; p50: string | null; p90: string | null };
  conditionalQuantileMonths: { p10: number | null; p50: number | null; p90: number | null };
  /** Conditional probability of a durable settlement by the end of each year. */
  conditionalByEndOf: Record<string, number>;
  /** Calendar label per month index. */
  labels: readonly string[];
  quantileLabels: { p10: string | null; p50: string | null; p90: string | null };
  quantileMonths: { p10: number | null; p50: number | null; p90: number | null };
  /** Probability of a durable settlement by the end of each calendar year. */
  byEndOf: Record<string, number>;
  channelAttribution: Record<SettlementChannel, number>;
  /** Spread of the median across members, as a robustness read. */
  medianRange: { earliest: string | null; latest: string | null };
}

/**
 * Full factorial over `ensembleAxes` at three levels each.
 *
 * A factorial rather than a random sample: it is deterministic, every member is
 * explainable, and with six axes the 729 members cost nothing. Members are
 * pooled with equal weight, which is a uniform prior over the axes and is
 * stated rather than defended.
 */
export function buildSettlementEnsemble(
  scenario: WarSettlementScenario,
  base: Partial<WarSettlementParams> = {},
): WarSettlementEnsemble {
  const levels = ensembleAxes.map((axis) => [axis.low, axis.central, axis.high]);
  const members: WarSettlementResult[] = [];
  const total = levels.reduce((n, l) => n * l.length, 1);

  for (let i = 0; i < total; i += 1) {
    const overrides: Partial<WarSettlementParams> = { ...base };
    let rest = i;
    for (let a = 0; a < ensembleAxes.length; a += 1) {
      const level = rest % 3;
      rest = Math.floor(rest / 3);
      (overrides as Record<string, number>)[ensembleAxes[a].key] = levels[a][level];
    }
    members.push(simulateWarSettlement(scenario, overrides));
  }

  const monthCount = scenario.months;
  const cumulative = Array.from({ length: monthCount }, (_, t) =>
    members.reduce((sum, m) => sum + m.months[t].cumulativeSettlement, 0) / members.length);
  const labels = members[0].months.map((m) => monthLabel(m.year, m.month));

  const crossing = (series: readonly number[], q: number): number | null => {
    const index = series.findIndex((c) => c >= q);
    return index === -1 ? null : index;
  };
  const quantileMonths = {
    p10: crossing(cumulative, 0.10),
    p50: crossing(cumulative, 0.50),
    p90: crossing(cumulative, 0.90),
  };
  const labelAt = (index: number | null): string | null => (index === null ? null : labels[index]);

  // Renormalise on surviving the observed window: the war demonstrably had not
  // settled by the end of July 2026, so that branch of the tree is closed.
  const survivedObserved = 1 - cumulative[OBSERVED_MONTHS - 1];
  const conditionalCumulative = cumulative.map((c, t) =>
    t < OBSERVED_MONTHS || survivedObserved <= 0
      ? 0
      : clamp((c - cumulative[OBSERVED_MONTHS - 1]) / survivedObserved, 0, 1));
  const conditionalQuantileMonths = {
    p10: crossing(conditionalCumulative, 0.10),
    p50: crossing(conditionalCumulative, 0.50),
    p90: crossing(conditionalCumulative, 0.90),
  };

  const byEndOf: Record<string, number> = {};
  const conditionalByEndOf: Record<string, number> = {};
  members[0].months.forEach((m, t) => {
    if (m.month === 12) {
      byEndOf[String(m.year)] = cumulative[t];
      conditionalByEndOf[String(m.year)] = conditionalCumulative[t];
    }
  });

  const channelAttribution = Object.fromEntries(
    SETTLEMENT_CHANNELS.map((c) => [
      c,
      members.reduce((sum, m) => sum + m.channelAttribution[c], 0) / members.length,
    ]),
  ) as Record<SettlementChannel, number>;

  const medians = members
    .map((m) => m.quantileMonths.p50)
    .filter((v): v is number => v !== null);

  return {
    scenario,
    memberCount: members.length,
    cumulative,
    conditionalCumulative,
    conditionalQuantileLabels: {
      p10: labelAt(conditionalQuantileMonths.p10),
      p50: labelAt(conditionalQuantileMonths.p50),
      p90: labelAt(conditionalQuantileMonths.p90),
    },
    conditionalQuantileMonths,
    conditionalByEndOf,
    labels,
    quantileMonths,
    quantileLabels: {
      p10: labelAt(quantileMonths.p10),
      p50: labelAt(quantileMonths.p50),
      p90: labelAt(quantileMonths.p90),
    },
    byEndOf,
    channelAttribution,
    medianRange: {
      earliest: medians.length ? labels[Math.min(...medians)] : null,
      latest: medians.length ? labels[Math.max(...medians)] : null,
    },
  };
}

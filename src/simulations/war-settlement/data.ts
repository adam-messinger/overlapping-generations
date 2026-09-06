/**
 * Reserve-and-magazine anchors for the 2026 US–Iran war settlement model.
 *
 * The question this data supports is narrow: given how fast four depletable
 * stocks are draining (US SPR, Chinese and rest-of-world crude reserves, US
 * high-end interceptors, Iranian ballistic missiles), when does one of them
 * bind hard enough that continuing the war costs a belligerent more than
 * settling?
 *
 * Every number below is either a reported observation with a source, or a
 * judgment parameter explicitly flagged as such. The distinction matters:
 * the physical depletion arithmetic is anchored, the political mapping from
 * depletion to a settlement hazard is not identified by anything and is swept
 * rather than fitted.
 */

/** Reported observations. Ranges are reported ranges, not modeling choices. */
export const warSettlementEvidence = {
  war: {
    /** US/Israeli strikes on Iran opened the war. */
    startDate: '2026-02-28',
    /** Operation Epic Fury: 13,000+ targets over 39 days. */
    epicFuryDays: 39,
    epicFuryTargets: 13_000,
    /** Mid-June ceasefire; declared over by Washington in late July. */
    ceasefireStart: '2026-06-15',
    ceasefireCollapse: '2026-07-24',
    /** Strikes paused 27 July to give talks room; Iran denies talks exist. */
    strikePause: '2026-07-27',
  },

  oil: {
    /** EIA 1H25 chokepoint report: crude/condensate plus products. */
    hormuzNormalFlowMbd: 20.9,
    hormuzCrudeMbd: 14.7,
    hormuzProductsMbd: 6.1,
    /** Saudi East–West plus UAE Fujairah pipelines. */
    bypassCapacityMbd: 4.7,
    /** EIA 2026 STEO: Q1 2026 average Hormuz oil traffic. */
    q1TrafficMbd: 14.6,
    /** World Bank April 2026: initial net global supply reduction. */
    initialNetSupplyLossMbd: 10,
    /** EIA April 2026: peak Gulf crude shut-in as export storage filled. */
    peakShutInMbd: 7.5,
    /** Iranian exports still moving despite the US naval presence, late July. */
    iranExportsMbd: 1.5,
    /** Brent close, 29 July 2026, after Trump renewed strike threats. */
    brentJul29: 90.74,
    /** Brent trough at the end of June under the collapsed ceasefire. */
    brentJun30: 73,
    /** Pre-war global liquids supply, used only to convert mb/d into shares. */
    globalLiquidsSupplyMbd: 103,
  },

  reserves: {
    /** EIA weekly: SPR crude, week ending 24 July 2026 — lowest since 1983. */
    usSprJul24Mb: 307.65,
    /** Weekly draw at that date. */
    usSprWeeklyDrawMb: 3.7,
    /** SPR level entering the war (EIA, December 2025). */
    usSprDec2025Mb: 415,
    /** GAO-26-106918: effective drawdown rate, against a 4.415 mb/d design. */
    usSprEffectiveDrawRateMbd: 2.7,
    usSprDesignDrawRateMbd: 4.415,
    /** The SPR is required to sustain the design rate for this long. */
    usSprDesignSustainDays: 90,
    /** Site drawdown rates, December 2025: Big Hill is entirely offline. */
    usSprSiteDrawRatesMbd: {
      bryanMound: 1.500, // 100% of design
      westHackberry: 0.750, // 58% of 1.300 design
      bayouChoctaw: 0.450, // 87% of 0.515 design
      bigHill: 0.000, // 0% of 1.100 design — construction outage
    },
    /** Big Hill inventory, stranded while the site is in outage. */
    usSprBigHillMb: 90,
    /** Return-to-service date for Big Hill barrels. */
    usSprBigHillReturns: '2026-11',
    /** GAO: share of inventory unavailable for drawdown as of December 2025. */
    usSprUnavailableShare: 0.25,
    /** EPCA limited-drawdown authority is unavailable below this level. A
     *  severe-energy-supply-interruption finding carries no such floor. */
    usSprLimitedDrawdownFloorMb: 252.4,
    /** DOE's 2026 claim of a cavern-mechanics operational minimum, contested. */
    usSprDoeCavernFloorMb: 70,
    /** The level industry has conventionally treated as the practical limit. */
    usSprConventionalFloorLowMb: 250,
    usSprConventionalFloorHighMb: 300,
    /** SPR crude is stored to this sweet/sour split by design. */
    usSprSweetShare: 0.40,
    usSprSourShare: 0.60,
    /** Straight-run middle-distillate yield: Gulf medium sour versus light shale. */
    gulfSourDistillateYield: 0.325,
    /** Major maintenance backlog outstanding, December 2025. */
    usSprMaintenanceBacklogMillionUsd: 230,
    /**
     * Cavern mechanics. Drawdown injects raw water at the cavern bottom to
     * float the oil out; the water dissolves salt on its way to saturation, so
     * each complete drawdown adds about 15% to cavern volume. The design basis
     * is roughly five complete cycles, with Sandia's Level III criterion
     * requiring a pillar-to-diameter ratio above 1.78 after them. NOT MODELLED:
     * the reserve is tracked in barrels and rates, not cumulative cycle damage,
     * so the model understates how constrained the caverns are.
     */
    usSprVolumeGrowthPerFullDrawdown: 0.15,
    usSprDesignDrawdownCycles: 5,
    usSprPillarToDiameterCriterion: 1.78,
    usSprPillarToDiameterIndustryStandard: 1.0,
    /** March 2026 presidential order: total authorized release. */
    usSprAuthorizedReleaseMb: 172,
    /** Level implied once the authorized release is fully executed. */
    usSprPostReleaseMb: 243,
    /** China strategic plus commercial crude, December 2025 estimate. */
    chinaReserveDec2025Mb: 1_400,
    /** Independent lower estimate of the same stock, early January 2026. */
    chinaReserveJan2026LowMb: 1_206,
    /** Pace at which China built the stock through 2025. */
    chinaBuildRateMbd: 1.1,
    /** Implied import cover at 2025 consumption. */
    chinaDaysImportCover: 104,
    /** IEA-32 collective strategic stocks, including the US SPR. */
    ieaCollectiveMb: 1_200,
    /** Chinese crude imports, used for the days-of-cover denominator. */
    chinaImportsMbd: 11.3,
  },

  usMunitions: {
    /** CSIS: THAAD interceptors delivered, excluding 50 RDT&E prototypes. */
    thaadDelivered: 534,
    /** Late-July 2026 remaining inventory range. */
    thaadRemainingLow: 234,
    thaadRemainingHigh: 278,
    /** Reported decline against the pre-war stock. */
    thaadDeclineShare: 0.38,
    /** Deliveries have been paused since August 2023; resumption ~April 2027. */
    thaadProductionPerYear: 96,
    thaadProductionTargetPerYear: 400,
    thaadDeliveryResumes: '2027-04',
    /** SM-3 deliveries through end 2025 and expenditure before this war. */
    sm3DeliveredThrough2025: 506,
    sm3ExpendedBefore2026: 92,
    sm3Deliveries2026: 66,
    /** Share of the SM-3 inventory consumed across the 2025–26 conflicts. */
    sm3ConsumedShare: 0.20,
    /** Patriot: fewer than this remain; roughly two-thirds of stock is gone. */
    patriotRemainingUpper: 1_000,
    patriotDepletionShare: 0.65,
    /** PAC-3 MSE build rate now, and the announced 2030 target. */
    pac3ProductionPerYear: 600,
    pac3ProductionTarget2030: 2_000,
    /** Ten-year average deliveries 2015–2024, for context on the ramp. */
    pac3HistoricAveragePerYear: 270,
    /** Standoff strike munitions expended during Epic Fury. */
    tomahawkExpended: 1_000,
    jassmExpended: 1_100,
    tomahawkProductionTargetPerYear: 1_000,
    /** FY26 procurement quantities against the FY27 request. */
    tomahawkFy26: 55,
    tomahawkFy27Request: 785,
    thaadFy27Request: 857,
    /** Manufacturing lead time has stretched from 24 to 36+ months. */
    leadTimeMonths: 36,
    fullCycleMonths: 52,
    /** Time to rebuild to pre-war levels, per CSIS. */
    recoveryYearsLow: 1,
    recoveryYearsHigh: 4,
    /** Iranian ballistic missiles launched in the reported engagements. */
    incomingBallisticMissiles: 500,
    /** Drones deployed alongside them; these draw on the Patriot/SM-6 pool. */
    incomingDrones: 2_000,
  },

  iranMunitions: {
    /** IDF assessment of the pre-escalation stockpile. */
    prewarInventory: 2_500,
    /** Post-strike range as of mid-2026. */
    remainingLow: 1_500,
    remainingHigh: 2_000,
    /** Total launched in retaliation, and the opening-day salvo. */
    totalFired: 500,
    openingSalvo: 170,
    /** Launch volume fell by two-thirds after the first day. */
    day1DeclineShare: 2 / 3,
    /** Monthly production: the IDF and State Department estimates disagree. */
    productionPerMonthLow: 30,
    productionPerMonthHigh: 110,
    /** Launchers: pre-war, then halved, then reportedly halved again. */
    launchersPrewar: 400,
    launchersAfterFirstCampaign: 200,
    launchersLate2026: 100,
    /** Stated goal before the war: 3,000 rising to 8,000 within two years. */
    statedGoalLow: 3_000,
    statedGoalHigh: 8_000,
  },

  usEconomy: {
    /** BLS, June 2026. */
    cpiYoyJun2026: 0.035,
    coreCpiYoyJun2026: 0.026,
    cpiMomJun2026: -0.004,
    gasolineYoyJun2026: 0.27,
    fuelOilYoyJun2026: 0.43,
    gasolineMomJun2026: -0.10,
    /** BLS relative importance of energy in the CPI basket. */
    energyCpiWeight: 0.063,
    /** US retail gasoline, mid-2025 national average — the y/y base. */
    gasolineBase2025UsdPerGal: 3.14,
  },

  iranEconomy: {
    /** Open-market rate, 20 July 2026, and the year-to-date depreciation. */
    rialPerUsdJul2026: 1_950_000,
    rialYtdDepreciation: 0.33,
    /** IMF projections for 2026. */
    imfInflation2026: 0.689,
    imfGdpGrowth2026: -0.054,
    /** Food price inflation, February 2026. */
    foodInflationFeb2026: 0.99,
    /** Official monthly minimum wage at the open-market rate. */
    minimumWageUsdPerMonth: 87,
    /** World Bank upper-middle-income poverty line, $8.30/day. */
    povertyLineUsdPerMonth: 249,
    /** Reported headcount range as of March 2025. */
    povertyHeadcountLow: 0.22,
    povertyHeadcountHigh: 0.50,
    /** Share of Iranian trade that transits Hormuz. */
    tradeShareViaHormuz: 0.90,
    /** Iranian income Gini, used to turn a mean-income move into a headcount. */
    gini: 0.39,
  },

  sources: {
    ceasefireStatus: 'https://www.cnn.com/2026/07/27/world/live-news/iran-war-trump',
    strikePause: 'https://www.cnbc.com/2026/07/27/us-iran-war-trump-hormuz.html',
    interceptorInventory: 'https://www.csis.org/analysis/depleting-missile-defense-interceptor-inventory',
    munitionsAtCeasefire: 'https://www.csis.org/analysis/last-rounds-status-key-munitions-iran-war-ceasefire',
    patriotDepletion:
      'https://www.armytimes.com/news/your-military/2026/07/30/iran-war-depleted-us-patriot-missile-stockpiles-creating-readiness-challenges-experts-say/',
    iranArsenal: 'https://www.mideastjournal.org/post/iran-missile-arsenal-2026-conflict',
    iranFirepower: 'https://jinsa.org/wp-content/uploads/2026/03/Irans-Firepower-2026-03-05-1.pdf',
    sprLevel:
      'https://energynow.com/2026/07/oil-stocks-in-us-strategic-petroleum-reserve-fall-by-3-7-million-barrels-to-lowest-level-since-1983/',
    sprStress: 'https://www.cnbc.com/2026/07/28/us-strategic-petroleum-reserve-spr-iran-oil-strait-hormuz.html',
    sprGao: 'https://files.gao.gov/reports/GAO-26-106918/index.html',
    sprCavernDrawdowns: 'https://www.osti.gov/biblio/1870557',
    sprCavernCriteria: 'https://www.osti.gov/servlets/purl/888563/',
    sprDistribution: 'https://www.energy.gov/ceser/articles/spr-distribution-systems',
    sprDrawdownAuthority: 'https://www.energy.gov/hgeo/opr/statutory-authority-spr-drawdown',
    chinaReserves: 'https://www.energypolicy.columbia.edu/?p=27032',
    chinaVsUsReserves:
      'https://finance.yahoo.com/sectors/energy/article/new-data-shows-china-came-into-the-iran-war-with-over-3x-the-strategic-oil-reserves-of-the-us-151438578.html',
    oilPrice: 'https://www.cnbc.com/2026/07/29/oil-prices-today-brent-wti-iran-us-hormuz.html',
    usCpi: 'https://www.cnbc.com/2026/07/14/inflation-cpi-june-2026-in-one-chart.html',
    iranEconomy: 'https://www.cnbc.com/2026/04/23/iran-economy-war-charts-rial-oil-strait-hormuz-blockade.html',
    iranRial: 'https://www.tftc.io/iran-rial-record-low-1-95-million-per-dollar-2026',
    hormuzChokepoint:
      'https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/',
  },
} as const;

/**
 * Structural parameters.
 *
 * Fields marked JUDGMENT have no observational anchor. They are set to
 * defensible round numbers and swept in the reported sensitivity table rather
 * than presented as estimates.
 */
export interface WarSettlementParams {
  // --- Oil and reserves -----------------------------------------------------
  /** Pre-war Brent, the level the price block multiplies up from. */
  basePriceUsdPerBarrel: number;
  /** Short-run price elasticity of oil demand; the deficit clears through it. */
  shortRunDemandElasticity: number;
  /** Elasticity rises with time as substitution becomes possible. */
  elasticityMonthlyDrift: number;
  /** Non-Gulf supply response, mb/d at full ramp. */
  nonGulfResponseMbd: number;
  /** Months for the non-Gulf response and the pipeline bypass to reach full. */
  supplyResponseRampMonths: number;
  /** SPR barrels released per month at full policy effort. */
  usSprMaxDrawPerMonthMb: number;
  /** Minimum operable SPR volume. Genuinely contested: DOE now claims about
   *  70 mb on cavern mechanics, industry has long treated 250-300 mb as the
   *  practical limit, and the 252.4 mb in statute binds only the limited
   *  drawdown authority. Swept rather than asserted. */
  usSprMinimumOperableMb: number;
  /** Ceiling on the physical draw rate, mb/d, before Big Hill returns. */
  usSprMaxDrawRateMbd: number;
  /** Rate recovered once the Big Hill outage ends. */
  usSprDrawRateAfterBigHillMbd: number;
  /** Barrels physically inaccessible while their site is in outage. */
  usSprStrandedMb: number;
  /** Month index at which stranded barrels return to service. */
  usSprStrandedReturnsMonthIndex: number;
  /** Multiplier on the scheduled release if policy tries to surge. 1 is the
   *  observed scheduled tempo; above 1 the physical caps start to bind. */
  usSprSurgeMultiplier: number;
  /** How much of a released SPR barrel offsets a Brent-priced shortfall.
   *  Below 1 because 60% of the reserve is sour and clears only through
   *  coking refineries; not far below 1, because Gulf medium sour is exactly
   *  the slate Hormuz removed and it out-yields light shale on distillate. */
  sprBarrelEffectiveness: number;
  /** Chinese draw as a share of its own import shortfall. */
  chinaDrawCoverageShare: number;
  /** JUDGMENT: floor China will not draw below, as a share of the 2025 peak. */
  chinaReserveFloorShare: number;
  /** Rest-of-world collective release, mb/d, and the floor it protects. */
  rowMaxDrawPerMonthMb: number;
  rowReserveFloorMb: number;
  /** Commercial crude and product stocks above operational minimum, mb. */
  commercialStockMobilizableMb: number;
  /** Fastest the trade can pull those stocks down, mb per month. */
  commercialMaxDrawPerMonthMb: number;
  /** Effective elasticity rises with the size of the shock: rationing and
   *  substitution that a 1% shortfall never triggers become available at 6%. */
  elasticityShockScale: number;

  // --- US inflation channel -------------------------------------------------
  /** Retail gasoline = base + passthrough x crude + crack x product disruption. */
  pumpBaseUsdPerGal: number;
  crudePassthroughUsdPerGalPerBarrel: number;
  productCrackUsdPerGal: number;
  /** CPI basket weights: motor fuel, then all other energy. */
  cpiMotorFuelWeight: number;
  cpiOtherEnergyWeight: number;
  /** Inflation of non-motor-fuel energy, held at its pre-war trend. */
  otherEnergyInflation: number;
  /** Core inflation absent the war, and the passthrough from energy to core. */
  coreInflationBaseline: number;
  energyToCorePassthrough: number;

  // --- Iranian economy channel ---------------------------------------------
  /** Discount sanctioned Iranian barrels sell at, versus Brent. */
  iranSanctionsDiscountUsd: number;
  /** Non-oil monthly government revenue, $B, and monthly spending, $B. */
  iranNonOilRevenueBillionPerMonth: number;
  iranSpendingBillionPerMonth: number;
  /** Share of the fiscal deficit financed by printing. */
  iranDeficitMonetizationShare: number;
  /** Base money, $B equivalent, that the monetized deficit inflates. */
  iranBaseMoneyBillion: number;
  /** Pass from money growth to prices, and from prices to the rial. */
  iranMoneyToInflation: number;
  iranInflationToDepreciation: number;
  /** Share of nominal incomes that reprice with inflation within the month. */
  iranWageIndexation: number;
  /** Pre-war poverty headcount at the UMIC line. */
  iranPrewarPovertyHeadcount: number;

  // --- Munitions ------------------------------------------------------------
  /** Iranian sorties per surviving launcher per month at full intensity. */
  iranSortiesPerLauncherMonth: number;
  /** Share of the remaining inventory Iran will commit in any single month. */
  iranMaxInventoryDrawShare: number;
  /** Share of the surviving missile stock destroyed on the ground per month of
   *  full-intensity US strikes. Proportional rather than absolute: the easily
   *  located depots go first, so absolute attrition falls as the stock hides. */
  iranMissileAttritionShare: number;
  /** Share of surviving launchers destroyed per full-intensity strike month. */
  iranLauncherAttritionShare: number;
  /** Launcher replacement per month, and the share of production suppressed. */
  iranLauncherReplacementPerMonth: number;
  iranProductionSuppression: number;
  /** High-end interceptors expended per incoming ballistic missile engaged. */
  interceptorsPerBallisticMissile: number;
  /** Share of incoming ballistic missiles engaged by high-end interceptors. */
  ballisticEngagementShare: number;
  /** Patriot/SM-6-class rounds per engaged drone or cruise missile. */
  areaInterceptorsPerDrone: number;
  droneEngagementShare: number;
  /** Patriot-class rounds drawn per incoming ballistic missile. */
  areaInterceptorsPerBallisticMissile: number;
  /** US standoff strike weapons expended per month at full intensity. */
  usStrikeWeaponsPerMonth: number;
  /** JUDGMENT: interceptor stock, as a share of pre-war, the US will not go
   *  below without disengaging — the reserve held against a Pacific
   *  contingency, which is the explicit concern in the CSIS analysis. */
  usInterceptorReserveShare: number;
  /** JUDGMENT: monthly salvo below which Iran's deterrent stops being credible. */
  iranCredibleSalvoPerMonth: number;
  /** Share of a remaining magazine that can be committed in a single month.
   *  Running low shows up as thinner defensive coverage, not a hard zero. */
  maxMonthlyMagazineCommitShare: number;

  // --- Settlement hazard (all JUDGMENT) ------------------------------------
  /** Monthly hazard of a settlement for reasons this model does not represent. */
  baselineDiplomaticHazard: number;
  /** Headline CPI above which US domestic politics starts forcing the issue. */
  usCpiTolerance: number;
  /** Retail gasoline above which the price becomes politically salient. */
  gasolineSalienceUsdPerGal: number;
  /** Hazard weight and curvature on each pressure channel. */
  usInflationHazardWeight: number;
  iranPovertyHazardWeight: number;
  usMagazineHazardWeight: number;
  iranMagazineHazardWeight: number;
  hazardExponent: number;
  /** Cap on any single channel's monthly hazard. */
  maxChannelHazard: number;
}

export const defaultWarSettlementParams: WarSettlementParams = {
  basePriceUsdPerBarrel: 68, // Brent before the 28 Feb 2026 strikes
  shortRunDemandElasticity: 0.060, // fitted; within the 0.02-0.08 short-run range
  elasticityMonthlyDrift: 0.004, // substitution accumulates over ~1-2 years
  nonGulfResponseMbd: 1.4, // US shale plus non-Gulf OPEC spare, EIA STEO scale
  supplyResponseRampMonths: 6,
  usSprMaxDrawPerMonthMb: 21.5, // 3.7 mb/wk observed; 172 mb runs ~8 months
  usSprMinimumOperableMb: 200, // JUDGMENT, swept over the 70-300 mb dispute
  usSprMaxDrawRateMbd: 2.7, // GAO Dec 2025 effective capability
  usSprDrawRateAfterBigHillMbd: 3.8, // 2.7 plus Big Hill's 1.1 mb/d design rate
  usSprStrandedMb: 90, // Big Hill inventory, inaccessible during the outage
  usSprStrandedReturnsMonthIndex: 8, // November 2026, from a March 2026 start
  usSprSurgeMultiplier: 1,
  sprBarrelEffectiveness: 0.90, // JUDGMENT
  chinaDrawCoverageShare: 0.85,
  chinaReserveFloorShare: 0.5, // JUDGMENT
  rowMaxDrawPerMonthMb: 12,
  rowReserveFloorMb: 520, // ~90-day IEA obligation net of the US share
  commercialStockMobilizableMb: 900, // OECD commercial above operational minimum
  commercialMaxDrawPerMonthMb: 180, // ~6 mb/d, the observed 2022 release tempo
  elasticityShockScale: 12,

  pumpBaseUsdPerGal: 1.47, // taxes and margin; reproduces $3.14/gal at $68 Brent
  crudePassthroughUsdPerGalPerBarrel: 0.0245, // $1/bbl ~ 2.4c/gal at the pump
  productCrackUsdPerGal: 2.00, // fitted; 6.1 mb/d of Hormuz product flow at risk
  cpiMotorFuelWeight: 0.032, // BLS relative importance: gasoline plus fuel oil
  cpiOtherEnergyWeight: 0.031, // electricity and piped gas
  otherEnergyInflation: 0.05,
  coreInflationBaseline: 0.026, // June 2026 core, taken as the non-war anchor
  energyToCorePassthrough: 0.10, // second-round pass into core over a year

  iranSanctionsDiscountUsd: 16,
  iranNonOilRevenueBillionPerMonth: 3.6,
  iranSpendingBillionPerMonth: 8.5,
  iranDeficitMonetizationShare: 0.75,
  iranBaseMoneyBillion: 95,
  iranMoneyToInflation: 1.60, // >1: velocity rises with inflation, fitted to IMF 68.9%
  iranInflationToDepreciation: 0.90, // fitted to the 33% year-to-date rial move
  iranWageIndexation: 0.35,
  iranPrewarPovertyHeadcount: 0.30, // midpoint of the reported 22-50% range

  iranSortiesPerLauncherMonth: 0.74, // fitted with the draw share to ~670 fired
  iranMaxInventoryDrawShare: 0.065,
  iranMissileAttritionShare: 0.075, // fitted to the July inventory range
  iranLauncherAttritionShare: 0.32, // fitted to 400 -> ~100 launchers by July
  iranLauncherReplacementPerMonth: 6,
  iranProductionSuppression: 0.55, // 100+/mo claimed capacity down to dozens
  interceptorsPerBallisticMissile: 1.40, // shoot-shoot doctrine on engaged tracks
  ballisticEngagementShare: 0.25, // CSIS June 2025: ~230 high-end for 550 incoming
  areaInterceptorsPerDrone: 0.85, // fitted to the Patriot two-thirds depletion
  droneEngagementShare: 0.70,
  areaInterceptorsPerBallisticMissile: 1.35,
  usStrikeWeaponsPerMonth: 1_000, // ~1,000 TLAM + 1,100 JASSM over Epic Fury's 39 days
  usInterceptorReserveShare: 0.60, // JUDGMENT
  iranCredibleSalvoPerMonth: 60, // JUDGMENT
  maxMonthlyMagazineCommitShare: 0.35,

  baselineDiplomaticHazard: 0.025, // JUDGMENT
  usCpiTolerance: 0.030, // JUDGMENT
  gasolineSalienceUsdPerGal: 4.00, // JUDGMENT
  usInflationHazardWeight: 0.10, // JUDGMENT
  iranPovertyHazardWeight: 0.11, // JUDGMENT
  usMagazineHazardWeight: 0.09, // JUDGMENT
  iranMagazineHazardWeight: 0.13, // JUDGMENT
  hazardExponent: 1.4, // JUDGMENT
  maxChannelHazard: 0.30,
};

export const SETTLEMENT_CHANNELS = [
  'usInflation',
  'iranPoverty',
  'usMagazine',
  'iranMagazine',
  'diplomatic',
] as const;
export type SettlementChannel = (typeof SETTLEMENT_CHANNELS)[number];

export interface WarSettlementScenario {
  id: string;
  label: string;
  description: string;
  /** First simulated month; the war opened on 28 February 2026. */
  startYear: number;
  startMonth: number;
  months: number;
  /**
   * Political willingness to keep fighting, by month, before magazine and
   * economic feedbacks are applied. 1 is Epic Fury tempo.
   */
  baseIntensityPath: readonly number[];
  /** Hormuz throughput as a share of the 20.9 mb/d norm, by month. */
  hormuzThroughputPath: readonly number[];
}

/** Repeat `value` for `count` months. */
export const hold = (value: number, count: number): number[] => Array.from({ length: count }, () => value);

/** Linear ramp from `from` to `to` inclusive over `count` months. */
export const ramp = (from: number, to: number, count: number): number[] =>
  Array.from({ length: count }, (_, i) => from + ((to - from) * (i + 1)) / count);

/**
 * Months 0-4 are March through July 2026, reconstructed from the reported
 * record: Operation Epic Fury, the mid-June ceasefire, its collapse, and the
 * 27 July pause. The 28 February opening salvo lands in the initial conditions
 * rather than in a month, because a monthly step cannot hold a one-day event.
 *
 * The March throughput is pinned by arithmetic rather than assumed: EIA reports
 * Q1 2026 Hormuz oil traffic averaging 14.6 mb/d against a 20.9 mb/d norm, and
 * January and February were close to normal, so March has to have been near a
 * total closure to produce that quarterly average.
 */
export const OBSERVED_INTENSITY = [1.0, 0.85, 0.70, 0.18, 0.75];
export const OBSERVED_THROUGHPUT = [0.15, 0.40, 0.58, 0.82, 0.72];

export const warSettlementScenarios = {
  'attrition-continues': {
    id: 'attrition-continues',
    label: 'Attrition continues',
    description:
      'The July pause fails to become a ceasefire and both sides keep fighting at a ' +
      'reduced but sustained tempo, with Hormuz throttled rather than closed. This is ' +
      'the continuation of the observed path and the central case.',
    startYear: 2026,
    startMonth: 3,
    months: 36,
    baseIntensityPath: [...OBSERVED_INTENSITY, ...ramp(0.72, 0.55, 12), ...hold(0.5, 18)],
    hormuzThroughputPath: [...OBSERVED_THROUGHPUT, ...ramp(0.73, 0.82, 12), ...hold(0.85, 18)],
  },
  'negotiated-pause': {
    id: 'negotiated-pause',
    label: 'Negotiated pause holds',
    description:
      'The 27 July pause converts into a durable de-escalation: strike tempo falls ' +
      'sharply from August and Hormuz traffic recovers toward normal, which relieves ' +
      'both the price and the magazine channels.',
    startYear: 2026,
    startMonth: 3,
    months: 36,
    baseIntensityPath: [...OBSERVED_INTENSITY, ...ramp(0.35, 0.15, 9), ...hold(0.12, 21)],
    hormuzThroughputPath: [...OBSERVED_THROUGHPUT, ...ramp(0.80, 0.95, 9), ...hold(0.97, 21)],
  },
  escalation: {
    id: 'escalation',
    label: 'Escalation and closure',
    description:
      'Talks collapse, the US resumes maximum tempo, and Iran makes good on closing ' +
      'Hormuz outright. Both magazines drain at Epic Fury rates against a full ' +
      'chokepoint closure.',
    startYear: 2026,
    startMonth: 3,
    months: 36,
    baseIntensityPath: [...OBSERVED_INTENSITY, ...hold(1.05, 10), ...hold(0.9, 20)],
    hormuzThroughputPath: [...OBSERVED_THROUGHPUT, ...ramp(0.45, 0.20, 6), ...hold(0.30, 24)],
  },
  'iran-capitulates-hormuz': {
    id: 'iran-capitulates-hormuz',
    label: 'Hormuz reopens, strikes continue',
    description:
      'Iran concedes on shipping to relieve its own trade strangulation while the ' +
      'military campaign continues. Isolates the magazine channels from the oil-price ' +
      'channel: the economic clocks stop, the munitions clocks do not.',
    startYear: 2026,
    startMonth: 3,
    months: 36,
    baseIntensityPath: [...OBSERVED_INTENSITY, ...hold(0.8, 12), ...hold(0.65, 18)],
    hormuzThroughputPath: [...OBSERVED_THROUGHPUT, ...ramp(0.88, 1.0, 6), ...hold(1.0, 24)],
  },
} as const satisfies Record<string, WarSettlementScenario>;

export type WarSettlementScenarioId = keyof typeof warSettlementScenarios;

/** Number of observed months (March–July 2026) available for calibration. */
export const OBSERVED_MONTHS = 5;

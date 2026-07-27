import { assertFiniteDeep, validateNumber } from 'tsimulation';

import { aiCapitalCycleScenarios } from './ai-capital-cycle.js';
import {
  dataCenterGridScenarios,
  simulateDataCenterGrid,
} from './data-center-grid.js';

// ---------------------------------------------------------------------------
// 1. Nvidia's $250B lease backstop as vendor financing
// ---------------------------------------------------------------------------

export interface VendorFinancingBenchmark {
  id: string;
  label: string;
  /** Peak announced customer-financing commitments, $ billions. */
  commitmentsBillion: number;
  /** Commitments actually drawn near the peak, $ billions. */
  drawnBillion: number;
  /** Vendor annual revenue in the peak year, $ billions. */
  revenueBillion: number;
  /**
   * Approximate realized credit losses and write-downs through the bust,
   * $ billions. These are order-of-magnitude figures assembled from filings
   * and contemporaneous reporting, not audited totals.
   */
  realizedLossBillion: number;
}

export interface VendorBackstopCase {
  /** Reported guarantee under discussion for lease and construction debt. */
  backstopGuaranteeBillion: number;
  /** Separately discussed chip-purchase financing. */
  chipFinancingBillion: number;
  projectCapexBillion: number;
  projectGw: number;
  /** Vendor (guarantor) trailing annual revenue, $ billions. */
  vendorRevenueBillion: number;
  /** Vendor trailing annual free cash flow, $ billions. */
  vendorFreeCashFlowBillion: number;
  /** Beneficiary (lessee) current annualized revenue, $ billions. */
  lesseeAnnualizedRevenueBillion: number;
  /** Financing rate applied to the leased project. */
  leaseFinancingRate: number;
  /** Amortization term of the lease, years. */
  leaseTermYears: number;
  /** Share of lessee revenue that can be budgeted to this one campus. */
  campusRevenueBudgetShare: number;
  /** Share of the guarantee assumed drawn when distress would surface. */
  exposureAtDistressShare: number;
  benchmarks: readonly VendorFinancingBenchmark[];
  monetizationScenarios: readonly VendorMonetizationScenario[];
}

export interface VendorMonetizationScenario {
  id: string;
  /** Probability weight of the scenario. */
  weight: number;
  /** Lessee annual revenue growth path, reused as a monetization prior. */
  revenueGrowthPath: readonly number[];
  /** Probability the guarantee is called within the scenario. */
  callProbability: number;
  /**
   * Recovery on the drawn guarantee if called. Low in slow-monetization
   * worlds because the collateral is GPUs and AI shells whose resale value
   * collapses exactly when calls happen (wrong-way risk).
   */
  recoveryShare: number;
}

export interface VendorBackstopResult {
  case: VendorBackstopCase;
  initialV1: {
    /** Guarantee alone over vendor revenue. */
    backstopShareOfRevenue: number;
    /** Guarantee plus chip financing over vendor revenue. */
    totalDiscussedShareOfRevenue: number;
    benchmarkShares: readonly {
      id: string;
      commitmentsShareOfRevenue: number;
    }[];
    /** How many times the largest historical ratio the backstop alone is. */
    multipleOfLargestHistoricalRatio: number;
  };
  revisedV2: {
    fullBuildAnnualLeasePaymentBillion: number;
    /** Lessee revenue needed to fit the lease inside the campus budget. */
    requiredLesseeRevenueBillion: number;
    scenarioCoverage: readonly {
      id: string;
      weight: number;
      callProbability: number;
      /** Calendar year revenue first covers the lease, or null. */
      coverageYear: number | null;
      projectedRevenueBillion2032: number;
    }[];
    expectedLossBillion: number;
    worstCaseLossBillion: number;
    expectedLossShareOfAnnualFreeCashFlow: number;
    worstCaseLossYearsOfFreeCashFlow: number;
    /** Telecom-bust realized losses as a share of peak commitments. */
    historicalLossShareOfCommitments: number;
    /** That historical loss share applied to the drawn Nvidia exposure. */
    telecomAnalogLossBillion: number;
    /** Chip financing over project capex: how circular the revenue is. */
    guaranteedBuyerShareOfProjectCapex: number;
  };
}

export const vendorBackstopCase: VendorBackstopCase = {
  // WSJ via Reuters, 26 July 2026: talks to guarantee ~$250B tied to the
  // lease and construction debt of SB Energy's 10 GW Piketon, Ohio campus,
  // with chip-purchase financing that could total another $350B.
  backstopGuaranteeBillion: 250,
  chipFinancingBillion: 350,
  projectCapexBillion: 500,
  projectGw: 10,
  // Nvidia FY2026 (ended Jan 2026): revenue $215.9B, FCF $96.6B.
  vendorRevenueBillion: 215.9,
  vendorFreeCashFlowBillion: 96.6,
  // OpenAI annualized revenue ~ $25B in early 2026 (Sacra; WSJ reporting).
  lesseeAnnualizedRevenueBillion: 25,
  leaseFinancingRate: 0.08, // BBB-ish infrastructure debt plus spread
  leaseTermYears: 15,
  // One campus cannot absorb the lessee's whole compute budget: Piketon is
  // ~10 GW of an announced multi-site pipeline several times larger.
  campusRevenueBudgetShare: 0.30,
  // First 800 MW phase targeted for 2028; distress in a slow-monetization
  // world would surface mid-build, not at full draw.
  exposureAtDistressShare: 0.60,
  benchmarks: [
    {
      id: 'lucent-2000',
      label: 'Lucent FY2000',
      commitmentsBillion: 8.1, // widely cited peak commitment figure
      drawnBillion: 1.6,
      revenueBillion: 33.6,
      realizedLossBillion: 3.5, // FY2001 customer-financing provisions
    },
    {
      id: 'nortel-2000',
      label: 'Nortel 2000',
      commitmentsBillion: 3.1,
      drawnBillion: 1.4, // Globe and Mail, 2001
      revenueBillion: 30.3,
      realizedLossBillion: 1.0,
    },
    {
      id: 'cisco-2001',
      label: 'Cisco FY2001',
      commitmentsBillion: 2.4,
      drawnBillion: 0.6,
      revenueBillion: 22.3,
      realizedLossBillion: 0.3,
    },
  ],
  monetizationScenarios: [
    {
      id: 'fast-monetization',
      weight: 0.25,
      revenueGrowthPath:
        aiCapitalCycleScenarios['fast-monetization'].annualRevenueGrowthPath,
      callProbability: 0.02,
      recoveryShare: 0.55,
    },
    {
      id: 'central',
      weight: 0.5,
      revenueGrowthPath: aiCapitalCycleScenarios.central.annualRevenueGrowthPath,
      callProbability: 0.15,
      recoveryShare: 0.45,
    },
    {
      id: 'slow-monetization',
      weight: 0.25,
      revenueGrowthPath:
        aiCapitalCycleScenarios['slow-monetization'].annualRevenueGrowthPath,
      callProbability: 0.60,
      recoveryShare: 0.20,
    },
  ],
};

function validateVendorBackstopCase(input: VendorBackstopCase): void {
  assertFiniteDeep(input, 'vendor-backstop case');
  const errors = [
    ...validateNumber(input.backstopGuaranteeBillion, 'backstopGuaranteeBillion', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(input.vendorRevenueBillion, 'vendorRevenueBillion', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(input.vendorFreeCashFlowBillion, 'vendorFreeCashFlowBillion', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(input.leaseFinancingRate, 'leaseFinancingRate', {
      min: 0,
      exclusiveMin: true,
      max: 0.3,
    }),
    ...validateNumber(input.leaseTermYears, 'leaseTermYears', {
      integer: true,
      min: 1,
    }),
    ...validateNumber(input.campusRevenueBudgetShare, 'campusRevenueBudgetShare', {
      min: 0,
      exclusiveMin: true,
      max: 1,
    }),
    ...validateNumber(input.exposureAtDistressShare, 'exposureAtDistressShare', {
      min: 0,
      max: 1,
    }),
  ];
  if (input.benchmarks.length === 0) {
    errors.push('benchmarks must not be empty');
  }
  const totalWeight = input.monetizationScenarios.reduce(
    (sum, scenario) => sum + scenario.weight,
    0,
  );
  if (Math.abs(totalWeight - 1) > 1e-9) {
    errors.push(`monetization scenario weights must sum to 1, got ${totalWeight}`);
  }
  if (errors.length > 0) {
    throw new Error(`Invalid vendor-backstop case:\n  ${errors.join('\n  ')}`);
  }
}

/**
 * Evaluates the reported Nvidia guarantee of OpenAI's Piketon lease as
 * vendor financing.
 *
 * V1 is the headline test: divide the guarantee by the guarantor's revenue
 * and compare to Lucent, Nortel, and Cisco in 2000. V2 keeps the comparison
 * but prices the guarantee as a contingent exposure: lease serviceability
 * under monetization scenarios, an expected loss with wrong-way collateral
 * recovery, and absorption capacity measured in years of free cash flow.
 */
export function evaluateVendorFinancingBackstop(
  input: VendorBackstopCase = vendorBackstopCase,
): VendorBackstopResult {
  validateVendorBackstopCase(input);

  const benchmarkShares = input.benchmarks.map((benchmark) => ({
    id: benchmark.id,
    commitmentsShareOfRevenue:
      benchmark.commitmentsBillion / benchmark.revenueBillion,
  }));
  const largestHistoricalRatio = Math.max(
    ...benchmarkShares.map((row) => row.commitmentsShareOfRevenue),
  );
  const backstopShareOfRevenue =
    input.backstopGuaranteeBillion / input.vendorRevenueBillion;

  // Annuity payment on the leased project at full build.
  const rate = input.leaseFinancingRate;
  const annuityFactor =
    rate / (1 - Math.pow(1 + rate, -input.leaseTermYears));
  const fullBuildAnnualLeasePaymentBillion =
    input.projectCapexBillion * annuityFactor;
  const requiredLesseeRevenueBillion =
    fullBuildAnnualLeasePaymentBillion / input.campusRevenueBudgetShare;

  const startYear = 2026;
  const scenarioCoverage = input.monetizationScenarios.map((scenario) => {
    let revenue = input.lesseeAnnualizedRevenueBillion;
    let coverageYear: number | null = null;
    let revenue2032 = revenue;
    scenario.revenueGrowthPath.forEach((growth, index) => {
      revenue *= 1 + growth;
      const year = startYear + index + 1;
      if (coverageYear === null && revenue >= requiredLesseeRevenueBillion) {
        coverageYear = year;
      }
      if (year === 2032) revenue2032 = revenue;
    });
    return {
      id: scenario.id,
      weight: scenario.weight,
      callProbability: scenario.callProbability,
      coverageYear,
      projectedRevenueBillion2032: revenue2032,
    };
  });

  const drawnExposureBillion =
    input.backstopGuaranteeBillion * input.exposureAtDistressShare;
  const expectedLossBillion = input.monetizationScenarios.reduce(
    (sum, scenario) =>
      sum +
      scenario.weight *
        scenario.callProbability *
        drawnExposureBillion *
        (1 - scenario.recoveryShare),
    0,
  );
  const worstRecovery = Math.min(
    ...input.monetizationScenarios.map((scenario) => scenario.recoveryShare),
  );
  const worstCaseLossBillion =
    input.backstopGuaranteeBillion * (1 - worstRecovery);

  const totalHistoricalLoss = input.benchmarks.reduce(
    (sum, benchmark) => sum + benchmark.realizedLossBillion,
    0,
  );
  const totalHistoricalCommitments = input.benchmarks.reduce(
    (sum, benchmark) => sum + benchmark.commitmentsBillion,
    0,
  );
  const historicalLossShareOfCommitments =
    totalHistoricalLoss / totalHistoricalCommitments;

  const result: VendorBackstopResult = {
    case: input,
    initialV1: {
      backstopShareOfRevenue,
      totalDiscussedShareOfRevenue:
        (input.backstopGuaranteeBillion + input.chipFinancingBillion) /
        input.vendorRevenueBillion,
      benchmarkShares,
      multipleOfLargestHistoricalRatio:
        backstopShareOfRevenue / largestHistoricalRatio,
    },
    revisedV2: {
      fullBuildAnnualLeasePaymentBillion,
      requiredLesseeRevenueBillion,
      scenarioCoverage,
      expectedLossBillion,
      worstCaseLossBillion,
      expectedLossShareOfAnnualFreeCashFlow:
        expectedLossBillion / input.vendorFreeCashFlowBillion,
      worstCaseLossYearsOfFreeCashFlow:
        worstCaseLossBillion / input.vendorFreeCashFlowBillion,
      historicalLossShareOfCommitments,
      telecomAnalogLossBillion:
        historicalLossShareOfCommitments * drawnExposureBillion,
      guaranteedBuyerShareOfProjectCapex:
        Math.min(1, input.chipFinancingBillion / input.projectCapexBillion),
    },
  };
  assertFiniteDeep(result, 'vendor-backstop result');
  return result;
}

// ---------------------------------------------------------------------------
// 2. $130B of blocked data centers versus the 2035 demand path
// ---------------------------------------------------------------------------

export interface PipelineAttritionCase {
  /** Projects blocked or delayed by local opposition in early 2026. */
  blockedProjects: number;
  /** Announced value of those projects, $ billions (Data Center Watch). */
  blockedValueBillion: number;
  /** Months covered by the blocked-project count. */
  observationMonths: number;
  /** Facility-plus-power capex per GW when IT equipment is excluded. */
  facilityCapexPerGwBillion: number;
  /** Full-stack project value per GW when announced values include IT gear. */
  fullStackCapexPerGwBillion: number;
  /** Operating data-center capacity at the start of the forecast, GW. */
  currentCapacityGw: number;
  /** Forecast capacity in 2035, GW (BloombergNEF). */
  forecast2035CapacityGw: number;
  forecastYears: number;
  /** Share of contracted interconnection requests that ever materialize. */
  queueRealizationShare: number;
  /** Share of consent-blocked demand that resites within a year or two. */
  relocationShare: number;
  /** Firm-capacity build variants fed to the shared-grid model, GW. */
  sharedFirmBuildVariantsGw: readonly number[];
}

export interface PipelineAttritionResult {
  case: PipelineAttritionCase;
  requiredNetAdditionsGwPerYear: number;
  initialV1: {
    /** Blocked GW annualized, using facility-only $/GW. */
    annualizedBlockedGwPerYear: number;
    /** Required additions minus blocked additions, taken literally. */
    naiveRemainingAdditionsGwPerYear: number;
    forecastLooksInfeasible: boolean;
  };
  revisedV2: {
    /** The same $130B translated under both capex-semantics readings. */
    blockedGwFacilityOnly: number;
    blockedGwFullStack: number;
    /**
     * Annualized capacity actually lost to blocking after discounting for
     * queue phantoms and relocation, GW/year (full-stack vs facility-only).
     */
    netCapacityLossGwPerYearLow: number;
    netCapacityLossGwPerYearHigh: number;
    /** The same net loss expressed as average served load, GW/year. */
    consentDragAverageLoadGwPerYearLow: number;
    consentDragAverageLoadGwPerYearHigh: number;
    /** Gross proposals the forecast already expects to fail, GW/year. */
    embeddedQueueAttritionGwPerYear: number;
    /** Gross annualized blocked capacity vs that embedded failure budget. */
    grossBlockedShareOfEmbeddedAttrition: number;
    firmCapacityVariants: readonly {
      sharedFirmBuildGw: number;
      reliabilityGapGw: number;
      /** Contracted average load that cannot be served firmly, GW. */
      unservedAverageLoadGw: number;
      /** That unserved 2035 load spread over the buildout, GW/year. */
      firmCapacityDragAverageLoadGwPerYear: number;
    }[];
    /** Largest per-year firm-capacity drag across variants. */
    maxFirmCapacityDragAverageLoadGwPerYear: number;
    bindingConstraint: 'firm-capacity' | 'consent' | 'comparable';
  };
}

export const pipelineAttritionCase: PipelineAttritionCase = {
  // Data Center Watch via PRNewswire/Tom's Hardware, July 2026: >75
  // projects worth ~$130B blocked or delayed in the first three months of
  // 2026, attributed to local opposition — not to a grid shortage.
  blockedProjects: 75,
  blockedValueBillion: 130,
  observationMonths: 3,
  // $10-12B/GW for land, shell, cooling, and power infrastructure;
  // $30-40B/GW when announced "project value" includes IT equipment.
  facilityCapexPerGwBillion: 11,
  fullStackCapexPerGwBillion: 35,
  // BloombergNEF path used by the existing data-center-grid model.
  currentCapacityGw: 35,
  forecast2035CapacityGw: 194,
  forecastYears: 10,
  // Utility integrated-resource plans discount large-load queues heavily;
  // 30-60% realization is typical, 40% is the central reading.
  queueRealizationShare: 0.4,
  relocationShare: 0.6,
  sharedFirmBuildVariantsGw: [60, 120],
};

function validatePipelineAttritionCase(input: PipelineAttritionCase): void {
  assertFiniteDeep(input, 'pipeline-attrition case');
  const errors = [
    ...validateNumber(input.blockedValueBillion, 'blockedValueBillion', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(input.observationMonths, 'observationMonths', {
      min: 1,
      max: 12,
    }),
    ...validateNumber(input.facilityCapexPerGwBillion, 'facilityCapexPerGwBillion', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(
      input.fullStackCapexPerGwBillion,
      'fullStackCapexPerGwBillion',
      { min: input.facilityCapexPerGwBillion },
    ),
    ...validateNumber(input.queueRealizationShare, 'queueRealizationShare', {
      min: 0,
      exclusiveMin: true,
      max: 1,
    }),
    ...validateNumber(input.relocationShare, 'relocationShare', { min: 0, max: 1 }),
    ...validateNumber(input.forecastYears, 'forecastYears', {
      integer: true,
      min: 1,
    }),
  ];
  if (input.forecast2035CapacityGw <= input.currentCapacityGw) {
    errors.push('forecast2035CapacityGw must exceed currentCapacityGw');
  }
  if (input.sharedFirmBuildVariantsGw.length === 0) {
    errors.push('sharedFirmBuildVariantsGw must not be empty');
  }
  if (errors.length > 0) {
    throw new Error(`Invalid pipeline-attrition case:\n  ${errors.join('\n  ')}`);
  }
}

/**
 * Puts the "$130B of AI data centers blocked" figure against the BloombergNEF
 * demand path the existing grid model uses.
 *
 * V1 does what the alarmed reading does: convert dollars to GW, annualize,
 * and subtract from the required additions. V2 fixes three accounting
 * errors — the $/GW semantics of announced project values, relocation of
 * blocked demand, and the phantom share of the interconnection queue — and
 * then asks the existing data-center-grid model which constraint actually
 * binds.
 */
export function evaluatePipelineAttrition(
  input: PipelineAttritionCase = pipelineAttritionCase,
): PipelineAttritionResult {
  validatePipelineAttritionCase(input);

  const requiredNetAdditionsGwPerYear =
    (input.forecast2035CapacityGw - input.currentCapacityGw) /
    input.forecastYears;

  const annualizationFactor = 12 / input.observationMonths;
  const blockedGwFacilityOnly =
    input.blockedValueBillion / input.facilityCapexPerGwBillion;
  const blockedGwFullStack =
    input.blockedValueBillion / input.fullStackCapexPerGwBillion;
  const annualizedBlockedGwPerYear =
    blockedGwFacilityOnly * annualizationFactor;

  // A blocked proposal only destroys demand if it would have materialized
  // (queue realization) and does not simply resite (relocation).
  const netLossFactor =
    input.queueRealizationShare * (1 - input.relocationShare);
  const netCapacityLossGwPerYearHigh =
    annualizedBlockedGwPerYear * netLossFactor;
  const netCapacityLossGwPerYearLow =
    blockedGwFullStack * annualizationFactor * netLossFactor;

  // If only queueRealizationShare of gross proposals materialize, hitting the
  // net path requires gross proposals of net / share; the difference is
  // attrition the forecast already absorbs.
  const embeddedQueueAttritionGwPerYear =
    requiredNetAdditionsGwPerYear / input.queueRealizationShare -
    requiredNetAdditionsGwPerYear;
  const grossBlockedGwPerYearCentral =
    ((blockedGwFacilityOnly + blockedGwFullStack) / 2) * annualizationFactor;

  const socialized = dataCenterGridScenarios.socialized;
  if (!socialized) {
    throw new Error('data-center-grid socialized scenario is missing');
  }
  const firmCapacityVariants = input.sharedFirmBuildVariantsGw.map(
    (sharedFirmBuildGw) => {
      const run = simulateDataCenterGrid({
        ...socialized,
        id: `attrition-${sharedFirmBuildGw}`,
        label: `Shared firm build ${sharedFirmBuildGw} GW`,
        sharedFirmBuildGw,
      });
      const unservedAverageLoadGw =
        run.reliabilityGapGw / socialized.peakCoincidenceFactor *
        socialized.loadFactor;
      return {
        sharedFirmBuildGw,
        reliabilityGapGw: run.reliabilityGapGw,
        unservedAverageLoadGw,
        firmCapacityDragAverageLoadGwPerYear:
          unservedAverageLoadGw / input.forecastYears,
      };
    },
  );
  const maxFirmCapacityDragAverageLoadGwPerYear = Math.max(
    ...firmCapacityVariants.map(
      (row) => row.firmCapacityDragAverageLoadGwPerYear,
    ),
  );

  const consentDragAverageLoadGwPerYearLow =
    netCapacityLossGwPerYearLow * socialized.loadFactor;
  const consentDragAverageLoadGwPerYearHigh =
    netCapacityLossGwPerYearHigh * socialized.loadFactor;
  const consentDragCentral =
    (consentDragAverageLoadGwPerYearLow + consentDragAverageLoadGwPerYearHigh) /
    2;
  const bindingConstraint =
    maxFirmCapacityDragAverageLoadGwPerYear > 2 * consentDragCentral
      ? 'firm-capacity'
      : consentDragCentral > 2 * maxFirmCapacityDragAverageLoadGwPerYear
        ? 'consent'
        : 'comparable';

  const result: PipelineAttritionResult = {
    case: input,
    requiredNetAdditionsGwPerYear,
    initialV1: {
      annualizedBlockedGwPerYear,
      naiveRemainingAdditionsGwPerYear:
        requiredNetAdditionsGwPerYear - annualizedBlockedGwPerYear,
      forecastLooksInfeasible:
        annualizedBlockedGwPerYear > requiredNetAdditionsGwPerYear,
    },
    revisedV2: {
      blockedGwFacilityOnly,
      blockedGwFullStack,
      netCapacityLossGwPerYearLow,
      netCapacityLossGwPerYearHigh,
      consentDragAverageLoadGwPerYearLow,
      consentDragAverageLoadGwPerYearHigh,
      embeddedQueueAttritionGwPerYear,
      grossBlockedShareOfEmbeddedAttrition:
        grossBlockedGwPerYearCentral / embeddedQueueAttritionGwPerYear,
      firmCapacityVariants,
      maxFirmCapacityDragAverageLoadGwPerYear,
      bindingConstraint,
    },
  };
  assertFiniteDeep(result, 'pipeline-attrition result');
  return result;
}

// ---------------------------------------------------------------------------
// 3. Solar passed coal in May. When does it pass coal for a full year?
// ---------------------------------------------------------------------------

export interface SolarCoalCrossoverCase {
  may2026SolarTwh: number;
  may2026CoalTwh: number;
  /** May-over-May growth implied by the same Ember release. */
  maySolarYearOverYearGrowth: number;
  mayCoalYearOverYearGrowth: number;
  /** EIA annual anchors. 2025 values are estimates pending final data. */
  annual2024SolarTwh: number;
  annual2024CoalTwh: number;
  annual2025SolarTwh: number;
  annual2025CoalTwh: number;
  /** Absolute solar generation added per year going forward, TWh. */
  solarAnnualAdditionTwh: number;
  /** Yearly growth of that absolute addition (learning + record capacity). */
  solarAdditionGrowth: number;
  /** Annual change in coal generation (negative is decline). */
  coalAnnualGrowth: number;
  /** Sensitivity bounds for coal's annual change. */
  coalAnnualGrowthLow: number;
  coalAnnualGrowthHigh: number;
  horizonYears: number;
}

export interface SolarCoalCrossoverResult {
  case: SolarCoalCrossoverCase;
  initialV1: {
    /** Reading the monthly crossover as the annual regime change. */
    claimedCrossoverYear: number;
    may2026SolarShareOfCoal: number;
  };
  revisedV2: {
    /** Seasonal factors derived from May 2025 vs annual 2025. */
    maySolarSeasonalFactor: number;
    mayCoalSeasonalFactor: number;
    /** One-step validation: predicted May 2026 from 2025 anchors. */
    predictedMay2026SolarTwh: number;
    predictedMay2026CoalTwh: number;
    may2026SolarPredictionError: number;
    may2026CoalPredictionError: number;
    predictionReproducesMonthlyCrossover: boolean;
    annualSeries: readonly {
      year: number;
      solarTwh: number;
      coalTwh: number;
    }[];
    annualCrossoverYear: number | null;
    annualCrossoverYearCoalDeclineLow: number | null;
    annualCrossoverYearCoalDeclineHigh: number | null;
    /** Years between the first monthly crossover and the annual one. */
    monthlyLeadYears: number | null;
    annual2026SolarDeficitTwh: number;
  };
}

export const solarCoalCrossoverCase: SolarCoalCrossoverCase = {
  // Ember, June-July 2026: May 2026 solar 45.5 TWh (12.8% share) vs coal
  // 43.4 TWh (12.2%) — the first month on record with solar above coal.
  may2026SolarTwh: 45.5,
  may2026CoalTwh: 43.4,
  maySolarYearOverYearGrowth: 0.17,
  mayCoalYearOverYearGrowth: -0.11,
  // EIA: solar 239 TWh (2023) -> 303 TWh (2024); coal 653 TWh (2024).
  annual2024SolarTwh: 303,
  annual2024CoalTwh: 653,
  // 2025 estimates: solar ~+29% on another record build year; coal rose on
  // higher gas prices and demand growth to roughly 700 TWh (EIA STEO).
  annual2025SolarTwh: 390,
  annual2025CoalTwh: 700,
  // EIA planned 2026 additions: 86 GW, 51% solar. 44 GW at a 24% capacity
  // factor is ~92 TWh of new annual output.
  solarAnnualAdditionTwh: 92,
  solarAdditionGrowth: 0.05,
  coalAnnualGrowth: -0.04,
  coalAnnualGrowthLow: -0.08,
  coalAnnualGrowthHigh: 0,
  horizonYears: 10,
};

function validateSolarCoalCase(input: SolarCoalCrossoverCase): void {
  assertFiniteDeep(input, 'solar-coal crossover case');
  const errors = [
    ...validateNumber(input.may2026SolarTwh, 'may2026SolarTwh', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(input.may2026CoalTwh, 'may2026CoalTwh', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(input.annual2025SolarTwh, 'annual2025SolarTwh', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(input.annual2025CoalTwh, 'annual2025CoalTwh', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(input.solarAnnualAdditionTwh, 'solarAnnualAdditionTwh', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(input.horizonYears, 'horizonYears', {
      integer: true,
      min: 1,
    }),
    ...validateNumber(input.coalAnnualGrowth, 'coalAnnualGrowth', {
      min: input.coalAnnualGrowthLow,
      max: input.coalAnnualGrowthHigh,
    }),
  ];
  if (errors.length > 0) {
    throw new Error(`Invalid solar-coal crossover case:\n  ${errors.join('\n  ')}`);
  }
}

function annualCrossover(
  input: SolarCoalCrossoverCase,
  coalGrowth: number,
): {
  series: { year: number; solarTwh: number; coalTwh: number }[];
  crossoverYear: number | null;
} {
  const series: { year: number; solarTwh: number; coalTwh: number }[] = [];
  let solar = input.annual2025SolarTwh;
  let coal = input.annual2025CoalTwh;
  let addition = input.solarAnnualAdditionTwh;
  let crossoverYear: number | null = null;
  for (let offset = 1; offset <= input.horizonYears; offset++) {
    const year = 2025 + offset;
    solar += addition;
    addition *= 1 + input.solarAdditionGrowth;
    coal *= 1 + coalGrowth;
    series.push({ year, solarTwh: solar, coalTwh: coal });
    if (crossoverYear === null && solar > coal) crossoverYear = year;
  }
  return { series, crossoverYear };
}

/**
 * Separates the May 2026 monthly solar-over-coal milestone from the annual
 * crossover it is widely read as.
 *
 * V1 is the headline reading: solar "overtook" coal in 2026. V2 derives May
 * seasonal factors from the 2025 anchors, validates them by predicting the
 * observed May 2026 values one year ahead, and then projects annual series
 * to find the full-year crossover and its sensitivity to coal's decline
 * rate.
 */
export function evaluateSolarCoalCrossover(
  input: SolarCoalCrossoverCase = solarCoalCrossoverCase,
): SolarCoalCrossoverResult {
  validateSolarCoalCase(input);

  const may2025SolarTwh =
    input.may2026SolarTwh / (1 + input.maySolarYearOverYearGrowth);
  const may2025CoalTwh =
    input.may2026CoalTwh / (1 + input.mayCoalYearOverYearGrowth);
  const maySolarSeasonalFactor =
    may2025SolarTwh / (input.annual2025SolarTwh / 12);
  const mayCoalSeasonalFactor =
    may2025CoalTwh / (input.annual2025CoalTwh / 12);

  const central = annualCrossover(input, input.coalAnnualGrowth);
  const [annual2026] = central.series;
  if (!annual2026) {
    throw new Error('crossover projection produced no years');
  }
  const predictedMay2026SolarTwh =
    (annual2026.solarTwh / 12) * maySolarSeasonalFactor;
  const predictedMay2026CoalTwh =
    (annual2026.coalTwh / 12) * mayCoalSeasonalFactor;

  const low = annualCrossover(input, input.coalAnnualGrowthLow);
  const high = annualCrossover(input, input.coalAnnualGrowthHigh);

  const result: SolarCoalCrossoverResult = {
    case: input,
    initialV1: {
      claimedCrossoverYear: 2026,
      may2026SolarShareOfCoal: input.may2026SolarTwh / input.may2026CoalTwh,
    },
    revisedV2: {
      maySolarSeasonalFactor,
      mayCoalSeasonalFactor,
      predictedMay2026SolarTwh,
      predictedMay2026CoalTwh,
      may2026SolarPredictionError:
        predictedMay2026SolarTwh / input.may2026SolarTwh - 1,
      may2026CoalPredictionError:
        predictedMay2026CoalTwh / input.may2026CoalTwh - 1,
      predictionReproducesMonthlyCrossover:
        predictedMay2026SolarTwh > predictedMay2026CoalTwh,
      annualSeries: central.series,
      annualCrossoverYear: central.crossoverYear,
      annualCrossoverYearCoalDeclineLow: low.crossoverYear,
      annualCrossoverYearCoalDeclineHigh: high.crossoverYear,
      monthlyLeadYears:
        central.crossoverYear === null ? null : central.crossoverYear - 2026,
      annual2026SolarDeficitTwh: annual2026.coalTwh - annual2026.solarTwh,
    },
  };
  assertFiniteDeep(result, 'solar-coal crossover result');
  return result;
}

export const headlineEvidence20260727 = {
  sources: {
    nvidiaBackstop:
      'https://finance.yahoo.com/technology/ai/articles/nvidia-talks-openai-guarantee-250-233930971.html',
    piketonProject:
      'https://www.networkworld.com/article/4183513/openai-weighs-nvidia-backed-lease-for-10-gw-ohio-data-center-campus.html',
    lucentNortelVendorFinancing:
      'https://tomtunguz.com/nvidia_nortel_vendor_financing_comparison/',
    nortelDrawn:
      'https://www.theglobeandmail.com/report-on-business/nortel-clients-give-warning-of-finances/article20454748/',
    nvidiaFy2026:
      'https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2026',
    openAiRevenue: 'https://sacra.com/c/openai/',
    blockedProjects:
      'https://www.prnewswire.com/news-releases/130-billion-in-ai-data-centers-have-been-blocked-or-delayed-in-2026-302821568.html',
    blockedProjectsDetail:
      'https://www.tomshardware.com/tech-industry/artificial-intelligence/more-than-75-data-center-build-outs-worth-usd130-billion-have-been-successfully-blocked-in-the-first-four-months-of-2026-bipartisan-opposition-mounts-nationwide-over-fears-of-soaring-power-and-water-costs',
    bnefForecast:
      'https://www.bloomberg.com/news/articles/2026-07-21/data-centers-on-track-to-suck-up-a-fifth-of-us-power-use-by-2035',
    emberMayCrossover:
      'https://ember-energy.org/latest-updates/solar-overtakes-coal-in-us-electricity-for-the-first-month-on-record/',
    eia2026Additions:
      'https://pv-magazine-usa.com/2026/07/22/solar-and-storage-account-for-91-of-new-u-s-grid-capacity-in-first-half-of-2026/',
    eia2025Generation:
      'https://www.eia.gov/todayinenergy/detail.php?id=67284',
  },
} as const;

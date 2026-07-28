import { assertFiniteDeep } from 'tsimulation';

import {
  aiCapitalCycleScenarios,
  simulateAiCapitalCycleV2,
} from './ai-capital-cycle.js';

// ---------------------------------------------------------------------------
// 1. Spain's sub-10% unemployment rate
// ---------------------------------------------------------------------------

export interface SpainLabourMarketCase {
  previousEmploymentThousand: number;
  previousUnemploymentThousand: number;
  currentEmploymentThousand: number;
  currentUnemploymentThousand: number;
  currentLabourForceThousand: number;
  seasonallyAdjustedEmploymentGrowth: number;
  seasonallyAdjustedUnemploymentGrowth: number;
  annualEmploymentChangeThousand: number;
  annualUnemploymentChangeThousand: number;
  servicesEmploymentChangeThousand: number;
}

export interface SpainLabourMarketResult {
  case: SpainLabourMarketCase;
  initialV1: {
    previousLabourForceThousand: number;
    rawEmploymentChangeThousand: number;
    rawUnemploymentChangeThousand: number;
    rawLabourForceChangeThousand: number;
    previousUnemploymentRate: number;
    currentUnemploymentRate: number;
    rawRateChangePctPoints: number;
    employmentContributionPctPoints: number;
    labourForceContributionPctPoints: number;
    servicesShareOfRawEmploymentGain: number;
    isLabourForceExitStory: boolean;
    flaw: string;
  };
  revisedV2: {
    impliedSeasonallyAdjustedEmploymentChangeThousand: number;
    impliedSeasonallyAdjustedUnemploymentChangeThousand: number;
    impliedSeasonallyAdjustedUnemploymentRate: number;
    impliedSeasonallyAdjustedRateChangePctPoints: number;
    rawRateDeclineRetainedAfterAdjustment: number;
    rawEmploymentGainShareRetainedAfterAdjustment: number;
    yearAgoEmploymentThousand: number;
    yearAgoUnemploymentThousand: number;
    yearAgoUnemploymentRate: number;
    annualRateChangePctPoints: number;
    interpretation: string;
  };
}

export const spainLabourMarketCase: SpainLabourMarketCase = {
  // INE Economically Active Population Survey, 2026 Q1 and Q2:
  // https://www.ine.es/dyngs/Prensa/es/EPA2T26.htm
  previousEmploymentThousand: 22_293.0,
  previousUnemploymentThousand: 2_708.6,
  currentEmploymentThousand: 22_779.0,
  currentUnemploymentThousand: 2_495.3,
  currentLabourForceThousand: 25_274.3,
  seasonallyAdjustedEmploymentGrowth: 0.0054,
  seasonallyAdjustedUnemploymentGrowth: -0.0037,
  annualEmploymentChangeThousand: 510.2,
  annualUnemploymentChangeThousand: -57.8,
  servicesEmploymentChangeThousand: 394.0,
};

const unemploymentRate = (
  employmentThousand: number,
  labourForceThousand: number,
): number => 1 - employmentThousand / labourForceThousand;

/**
 * Reconciles the unemployment-rate headline to the employment and labour-force
 * stocks, then repeats the comparison with INE's seasonally adjusted growth
 * rates and the year-over-year changes.
 */
export function evaluateSpainLabourMarket(
  input: SpainLabourMarketCase = spainLabourMarketCase,
): SpainLabourMarketResult {
  assertFiniteDeep(input, 'Spain labour-market case');
  const previousLabourForceThousand =
    input.previousEmploymentThousand +
    input.previousUnemploymentThousand;
  if (
    input.previousEmploymentThousand <= 0 ||
    input.previousUnemploymentThousand < 0 ||
    input.currentEmploymentThousand <= 0 ||
    input.currentUnemploymentThousand < 0 ||
    Math.abs(
      input.currentEmploymentThousand +
        input.currentUnemploymentThousand -
        input.currentLabourForceThousand,
    ) > 0.2
  ) {
    throw new Error('Invalid Spain labour-market stocks');
  }

  const previousRate = unemploymentRate(
    input.previousEmploymentThousand,
    previousLabourForceThousand,
  );
  const currentRate = unemploymentRate(
    input.currentEmploymentThousand,
    input.currentLabourForceThousand,
  );
  const rawEmploymentChangeThousand =
    input.currentEmploymentThousand -
    input.previousEmploymentThousand;
  const rawUnemploymentChangeThousand =
    input.currentUnemploymentThousand -
    input.previousUnemploymentThousand;
  const rawLabourForceChangeThousand =
    input.currentLabourForceThousand -
    previousLabourForceThousand;

  // Two-order Shapley split of u = 1 - E/L. This preserves the exact rate
  // change while avoiding an arbitrary choice of the old or new denominator.
  const employmentContribution =
    0.5 *
    (
      unemploymentRate(
        input.currentEmploymentThousand,
        previousLabourForceThousand,
      ) -
      previousRate +
      currentRate -
      unemploymentRate(
        input.previousEmploymentThousand,
        input.currentLabourForceThousand,
      )
    );
  const labourForceContribution =
    currentRate - previousRate - employmentContribution;

  // INE publishes adjusted growth rates rather than adjusted levels in the
  // release. Applying those rates to the Q1 stocks gives a transparent proxy,
  // not an official adjusted level series.
  const impliedAdjustedEmployment =
    input.previousEmploymentThousand *
    (1 + input.seasonallyAdjustedEmploymentGrowth);
  const impliedAdjustedUnemployment =
    input.previousUnemploymentThousand *
    (1 + input.seasonallyAdjustedUnemploymentGrowth);
  const impliedAdjustedRate =
    impliedAdjustedUnemployment /
    (impliedAdjustedEmployment + impliedAdjustedUnemployment);
  const adjustedRateChange = impliedAdjustedRate - previousRate;

  const yearAgoEmployment =
    input.currentEmploymentThousand -
    input.annualEmploymentChangeThousand;
  const yearAgoUnemployment =
    input.currentUnemploymentThousand -
    input.annualUnemploymentChangeThousand;
  const yearAgoRate =
    yearAgoUnemployment /
    (yearAgoEmployment + yearAgoUnemployment);

  const result: SpainLabourMarketResult = {
    case: input,
    initialV1: {
      previousLabourForceThousand,
      rawEmploymentChangeThousand,
      rawUnemploymentChangeThousand,
      rawLabourForceChangeThousand,
      previousUnemploymentRate: previousRate,
      currentUnemploymentRate: currentRate,
      rawRateChangePctPoints: 100 * (currentRate - previousRate),
      employmentContributionPctPoints:
        100 * employmentContribution,
      labourForceContributionPctPoints:
        100 * labourForceContribution,
      servicesShareOfRawEmploymentGain:
        input.servicesEmploymentChangeThousand /
        rawEmploymentChangeThousand,
      isLabourForceExitStory:
        rawLabourForceChangeThousand < 0,
      flaw:
        'A raw Q2-to-Q1 stock comparison folds Spain’s recurring summer hiring into the apparent quarterly acceleration.',
    },
    revisedV2: {
      impliedSeasonallyAdjustedEmploymentChangeThousand:
        impliedAdjustedEmployment -
        input.previousEmploymentThousand,
      impliedSeasonallyAdjustedUnemploymentChangeThousand:
        impliedAdjustedUnemployment -
        input.previousUnemploymentThousand,
      impliedSeasonallyAdjustedUnemploymentRate:
        impliedAdjustedRate,
      impliedSeasonallyAdjustedRateChangePctPoints:
        100 * adjustedRateChange,
      rawRateDeclineRetainedAfterAdjustment:
        adjustedRateChange /
        (currentRate - previousRate),
      rawEmploymentGainShareRetainedAfterAdjustment:
        (
          impliedAdjustedEmployment -
          input.previousEmploymentThousand
        ) /
        rawEmploymentChangeThousand,
      yearAgoEmploymentThousand: yearAgoEmployment,
      yearAgoUnemploymentThousand: yearAgoUnemployment,
      yearAgoUnemploymentRate: yearAgoRate,
      annualRateChangePctPoints:
        100 * (currentRate - yearAgoRate),
      interpretation:
        'The sub-10% raw milestone is seasonally flattered, but it is not produced by labour-force exit: adjusted employment still rises, adjusted unemployment falls, and the annual comparison also improves.',
    },
  };
  assertFiniteDeep(result, 'Spain labour-market result');
  return result;
}

// ---------------------------------------------------------------------------
// 2. Nvidia vendor financing and AI funding strain
// ---------------------------------------------------------------------------

export interface NvidiaVendorFinancingCase {
  nvidiaCdsSpreadBps: number;
  potentialGuaranteeBillion: number;
  centralGuaranteeUtilization: number;
  centralCounterpartyAnnualHazard: number;
  stressCounterpartyAnnualHazard: number;
  lossGivenDefault: number;
  horizonYears: number;
  discountRate: number;
  announcedCircularDealsBillion: number;
  potentialInfrastructureDealsBillion: number;
  potentialChipPurchaseFinancingBillion: number;
  hyperscaler2026CapexBillion: number;
  observedEquityValueLossBillion: number;
}

export interface GuaranteeExpectedLossCase {
  counterpartyAnnualHazard: number;
  utilization: number;
  cumulativeCounterpartyDefaultProbability: number;
  presentValueExpectedLossBillion: number;
  expectedLossShareOfObservedEquityLoss: number;
}

export interface NvidiaVendorFinancingResult {
  case: NvidiaVendorFinancingCase;
  initialV1: {
    grossFaceValueLossBillion: number;
    grossFaceValueToObservedEquityLoss: number;
    announcedDealsToAnnualHyperscalerCapex: number;
    potentialDealsToAnnualHyperscalerCapex: number;
    flaw: string;
  };
  revisedV2: {
    nvidiaOwnCreditSignal: {
      annualPremiumOnGuaranteeFaceBillion: number;
      impliedOwnRiskNeutralHazard: number;
      impliedOwnFiveYearDefaultProbability: number;
      isCounterpartyDefaultProbability: false;
    };
    centralExpectedLoss: GuaranteeExpectedLossCase;
    stressExpectedLoss: GuaranteeExpectedLossCase;
    expectedLossSensitivity: readonly GuaranteeExpectedLossCase[];
    customerCapitalCycle: readonly {
      scenario: string;
      peakFundingNeedBillion: number;
      endingDebtBalanceBillion: number;
      guaranteeShareOfPeakFundingNeed: number;
      announcedDealsShareOfPeakFundingNeed: number;
    }[];
    interpretation: string;
    caveat: string;
  };
}

export const nvidiaVendorFinancingCase: NvidiaVendorFinancingCase = {
  // 28 July market reporting:
  // https://www.investing.com/news/stock-market-news/nvidias-rising-cds-the-talk-of-wall-street-amid-circular-financing-fears-4816626
  nvidiaCdsSpreadBps: 82,
  potentialGuaranteeBillion: 250,
  announcedCircularDealsBillion: 540,
  potentialInfrastructureDealsBillion: 750,
  potentialChipPurchaseFinancingBillion: 350,
  hyperscaler2026CapexBillion: 690,
  observedEquityValueLossBillion: 250,
  // Explicit expected-loss judgments, not reported deal terms. The deals were
  // described as early-stage and Nvidia had not confirmed their terms.
  centralGuaranteeUtilization: 0.75,
  centralCounterpartyAnnualHazard: 0.05,
  stressCounterpartyAnnualHazard: 0.25,
  lossGivenDefault: 0.60,
  horizonYears: 5,
  discountRate: 0.06,
};

const guaranteeExpectedLoss = (
  input: NvidiaVendorFinancingCase,
  counterpartyAnnualHazard: number,
  utilization: number,
): GuaranteeExpectedLossCase => {
  // The customer hazard is an exposed scenario judgment. Nvidia's CDS cannot
  // identify it because that contract prices Nvidia's own credit.
  const cumulativeCounterpartyDefaultProbability =
    1 -
    Math.exp(-counterpartyAnnualHazard * input.horizonYears);
  const lossArrivalAndDiscountRate =
    counterpartyAnnualHazard + input.discountRate;
  const discountedDefaultMass =
    counterpartyAnnualHazard /
    lossArrivalAndDiscountRate *
    (
      1 -
      Math.exp(
        -lossArrivalAndDiscountRate * input.horizonYears,
      )
    );
  const presentValueExpectedLossBillion =
    input.potentialGuaranteeBillion *
    utilization *
    input.lossGivenDefault *
    discountedDefaultMass;
  return {
    counterpartyAnnualHazard,
    utilization,
    cumulativeCounterpartyDefaultProbability,
    presentValueExpectedLossBillion,
    expectedLossShareOfObservedEquityLoss:
      presentValueExpectedLossBillion /
      input.observedEquityValueLossBillion,
  };
};

/**
 * Replaces a face-value comparison with a contingent expected-loss model, then
 * checks the guarantee against the existing AI customer capital-cycle model.
 */
export function evaluateNvidiaVendorFinancing(
  input: NvidiaVendorFinancingCase = nvidiaVendorFinancingCase,
): NvidiaVendorFinancingResult {
  assertFiniteDeep(input, 'Nvidia vendor-financing case');
  if (
    input.nvidiaCdsSpreadBps <= 0 ||
    input.potentialGuaranteeBillion <= 0 ||
    input.centralGuaranteeUtilization <= 0 ||
    input.centralGuaranteeUtilization > 1 ||
    input.centralCounterpartyAnnualHazard <= 0 ||
    input.stressCounterpartyAnnualHazard <
      input.centralCounterpartyAnnualHazard ||
    input.lossGivenDefault <= 0 ||
    input.lossGivenDefault > 1 ||
    input.horizonYears <= 0 ||
    input.discountRate < 0 ||
    input.observedEquityValueLossBillion <= 0
  ) {
    throw new Error('Invalid Nvidia vendor-financing case');
  }

  const expectedLossSensitivity = [0.02, 0.05, 0.25]
    .flatMap((counterpartyAnnualHazard) =>
      [0.50, 0.75, 1.00].map((utilization) =>
        guaranteeExpectedLoss(
          input,
          counterpartyAnnualHazard,
          utilization,
        ),
      ),
    );
  const impliedOwnRiskNeutralHazard =
    input.nvidiaCdsSpreadBps /
    10_000 /
    input.lossGivenDefault;
  const customerCapitalCycle = Object.values(
    aiCapitalCycleScenarios,
  ).map((scenario) => {
    const run = simulateAiCapitalCycleV2(scenario);
    return {
      scenario: scenario.id,
      peakFundingNeedBillion:
        run.peakCumulativeFundingNeedBillion,
      endingDebtBalanceBillion: run.endingDebtBalanceBillion,
      guaranteeShareOfPeakFundingNeed:
        input.potentialGuaranteeBillion /
        run.peakCumulativeFundingNeedBillion,
      announcedDealsShareOfPeakFundingNeed:
        input.announcedCircularDealsBillion /
        run.peakCumulativeFundingNeedBillion,
    };
  });

  const result: NvidiaVendorFinancingResult = {
    case: input,
    initialV1: {
      grossFaceValueLossBillion:
        input.potentialGuaranteeBillion,
      grossFaceValueToObservedEquityLoss:
        input.potentialGuaranteeBillion /
        input.observedEquityValueLossBillion,
      announcedDealsToAnnualHyperscalerCapex:
        input.announcedCircularDealsBillion /
        input.hyperscaler2026CapexBillion,
      potentialDealsToAnnualHyperscalerCapex:
        input.potentialInfrastructureDealsBillion /
        input.hyperscaler2026CapexBillion,
      flaw:
        'Treats an unconfirmed contingent guarantee as an immediate, fully impaired liability and compares multi-year commitments with one year of capex.',
    },
    revisedV2: {
      nvidiaOwnCreditSignal: {
        annualPremiumOnGuaranteeFaceBillion:
          input.potentialGuaranteeBillion *
          input.nvidiaCdsSpreadBps /
          10_000,
        impliedOwnRiskNeutralHazard,
        impliedOwnFiveYearDefaultProbability:
          1 -
          Math.exp(
            -impliedOwnRiskNeutralHazard *
            input.horizonYears,
          ),
        isCounterpartyDefaultProbability: false,
      },
      centralExpectedLoss: guaranteeExpectedLoss(
        input,
        input.centralCounterpartyAnnualHazard,
        input.centralGuaranteeUtilization,
      ),
      stressExpectedLoss: guaranteeExpectedLoss(
        input,
        input.stressCounterpartyAnnualHazard,
        1,
      ),
      expectedLossSensitivity,
      customerCapitalCycle,
      interpretation:
        'Direct expected credit loss is too small to explain the equity move by itself, while the customer capital-cycle model independently supports the market’s broader concern that AI demand increasingly depends on external finance.',
      caveat:
        'Nvidia’s CDS does not reveal customer default risk. The customer hazards are stress assumptions, and the reported financing structures, utilization, seniority, collateral, and recourse were not public.',
    },
  };
  assertFiniteDeep(result, 'Nvidia vendor-financing result');
  return result;
}

// ---------------------------------------------------------------------------
// 3. Germany's proposed sick-note crackdown
// ---------------------------------------------------------------------------

export interface SickNotePolicyScenario {
  id: 'cautious' | 'break-even' | 'optimistic';
  behaviouralShareOfRecordedReduction: number;
  productivityWhileSick: number;
  infectionAbsenceDaysPerAttendanceDay: number;
  certificateAdministrationDaysPerWorker: number;
}

export interface GermanySickNoteCase {
  recordedCalendarSickDaysPerWorker: number;
  calendarDaysPerYear: number;
  workingDaysPerYear: number;
  headlineRecordedAbsenceReduction: number;
  scenarios: readonly SickNotePolicyScenario[];
}

export interface SickNotePolicyResult {
  id: SickNotePolicyScenario['id'];
  recordedWorkdaysSuppressed: number;
  realAttendanceDays: number;
  recoveredEffectiveDays: number;
  infectionExternalityDays: number;
  administrationDays: number;
  netEffectiveDays: number;
  effectiveLabourChange: number;
}

export interface GermanySickNoteResult {
  case: GermanySickNoteCase;
  initialV1: {
    recordedWorkdayEquivalent: number;
    recordedWorkdaysSuppressed: number;
    recoveredEffectiveDays: number;
    effectiveLabourChange: number;
    flaw: string;
  };
  revisedV2: {
    scenarios: readonly SickNotePolicyResult[];
    breakEvenBehaviouralShare: number;
    interpretation: string;
  };
}

export const germanySickNoteCase: GermanySickNoteCase = {
  // Reuters cites BKK's 22 recorded calendar days for 2024:
  // https://www.investing.com/news/economy-news/analysisgermanys-sicknote-crackdown-may-be-treating-the-symptoms-not-the-disease-4812967
  recordedCalendarSickDaysPerWorker: 22,
  calendarDaysPerYear: 365,
  workingDaysPerYear: 220,
  // A round policy stress, not an estimate of the proposed rule's effect.
  headlineRecordedAbsenceReduction: 0.10,
  // Behavioural response, on-the-job productivity, infection spillovers, and
  // administration are deliberately exposed as judgments. Reuters reports no
  // evidence that telephone certification caused the recorded sick-day rise.
  scenarios: [
    {
      id: 'cautious',
      behaviouralShareOfRecordedReduction: 0.10,
      productivityWhileSick: 0.30,
      infectionAbsenceDaysPerAttendanceDay: 0.25,
      certificateAdministrationDaysPerWorker: 0.15,
    },
    {
      id: 'break-even',
      behaviouralShareOfRecordedReduction: 0.25,
      productivityWhileSick: 0.50,
      infectionAbsenceDaysPerAttendanceDay: 0.20,
      certificateAdministrationDaysPerWorker: 0.10,
    },
    {
      id: 'optimistic',
      behaviouralShareOfRecordedReduction: 0.75,
      productivityWhileSick: 0.70,
      infectionAbsenceDaysPerAttendanceDay: 0.05,
      certificateAdministrationDaysPerWorker: 0.05,
    },
  ],
};

const evaluateSickNoteScenario = (
  scenario: SickNotePolicyScenario,
  recordedWorkdaysSuppressed: number,
  baselineEffectiveWorkdays: number,
): SickNotePolicyResult => {
  const realAttendanceDays =
    recordedWorkdaysSuppressed *
    scenario.behaviouralShareOfRecordedReduction;
  const recoveredEffectiveDays =
    realAttendanceDays * scenario.productivityWhileSick;
  const infectionExternalityDays =
    realAttendanceDays *
    scenario.infectionAbsenceDaysPerAttendanceDay;
  const netEffectiveDays =
    recoveredEffectiveDays -
    infectionExternalityDays -
    scenario.certificateAdministrationDaysPerWorker;
  return {
    id: scenario.id,
    recordedWorkdaysSuppressed,
    realAttendanceDays,
    recoveredEffectiveDays,
    infectionExternalityDays,
    administrationDays:
      scenario.certificateAdministrationDaysPerWorker,
    netEffectiveDays,
    effectiveLabourChange:
      netEffectiveDays / baselineEffectiveWorkdays,
  };
};

/**
 * Converts recorded calendar-day absence to a working-day equivalent. V1
 * assumes every suppressed day becomes a fully productive day. V2 separates a
 * change in the recorded statistic from real attendance and effective output.
 */
export function evaluateGermanySickNotes(
  input: GermanySickNoteCase = germanySickNoteCase,
): GermanySickNoteResult {
  assertFiniteDeep(input, 'Germany sick-note case');
  if (
    input.recordedCalendarSickDaysPerWorker < 0 ||
    input.calendarDaysPerYear <= 0 ||
    input.workingDaysPerYear <= 0 ||
    input.workingDaysPerYear > input.calendarDaysPerYear ||
    input.headlineRecordedAbsenceReduction < 0 ||
    input.headlineRecordedAbsenceReduction > 1 ||
    input.scenarios.length !== 3
  ) {
    throw new Error('Invalid Germany sick-note case');
  }
  input.scenarios.forEach((scenario) => {
    if (
      scenario.behaviouralShareOfRecordedReduction < 0 ||
      scenario.behaviouralShareOfRecordedReduction > 1 ||
      scenario.productivityWhileSick < 0 ||
      scenario.productivityWhileSick > 1 ||
      scenario.infectionAbsenceDaysPerAttendanceDay < 0 ||
      scenario.certificateAdministrationDaysPerWorker < 0
    ) {
      throw new Error(`Invalid sick-note scenario: ${scenario.id}`);
    }
  });

  const recordedWorkdayEquivalent =
    input.recordedCalendarSickDaysPerWorker *
    input.workingDaysPerYear /
    input.calendarDaysPerYear;
  const recordedWorkdaysSuppressed =
    recordedWorkdayEquivalent *
    input.headlineRecordedAbsenceReduction;
  const baselineEffectiveWorkdays =
    input.workingDaysPerYear - recordedWorkdayEquivalent;
  const scenarios = input.scenarios.map((scenario) =>
    evaluateSickNoteScenario(
      scenario,
      recordedWorkdaysSuppressed,
      baselineEffectiveWorkdays,
    ),
  );
  const breakEvenScenario =
    input.scenarios.find((scenario) => scenario.id === 'break-even');
  if (!breakEvenScenario) {
    throw new Error('Missing break-even sick-note scenario');
  }
  const netProductivityPerAttendanceDay =
    breakEvenScenario.productivityWhileSick -
    breakEvenScenario.infectionAbsenceDaysPerAttendanceDay;
  const breakEvenBehaviouralShare =
    netProductivityPerAttendanceDay > 0
      ? breakEvenScenario.certificateAdministrationDaysPerWorker /
        (
          recordedWorkdaysSuppressed *
          netProductivityPerAttendanceDay
        )
      : 1;

  const result: GermanySickNoteResult = {
    case: input,
    initialV1: {
      recordedWorkdayEquivalent,
      recordedWorkdaysSuppressed,
      recoveredEffectiveDays: recordedWorkdaysSuppressed,
      effectiveLabourChange:
        recordedWorkdaysSuppressed /
        baselineEffectiveWorkdays,
      flaw:
        'Equates a reduction in certified absence with an equal increase in fully productive work and omits certification time and infection spillovers.',
    },
    revisedV2: {
      scenarios,
      breakEvenBehaviouralShare,
      interpretation:
        'The sign is not identified by the sick-day statistic. Under the displayed assumptions the policy ranges from a small loss to a gain well below the headline shortcut, and it needs roughly one quarter of any recorded reduction to reflect real attendance just to break even.',
    },
  };
  assertFiniteDeep(result, 'Germany sick-note result');
  return result;
}

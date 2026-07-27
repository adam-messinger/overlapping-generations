import {
  assertFiniteDeep,
  depreciableVintage,
  straightLineDepreciation,
  type DepreciableVintage,
  validateNumber,
} from 'tsimulation';

export interface AiCapitalCycleScenario {
  id: string;
  label: string;
  startYear: number;
  startQuarter: number;
  quarters: number;
  startingQuarterlyAiRevenueBillion: number;
  startingQuarterlyAiDepreciationBillion: number;
  annualRevenueGrowthPath: readonly number[];
  annualTotalDeveloperCapexBillion: readonly number[];
  aiShareOfDeveloperCapex: number;
  cashOperatingCostShare: number;
  chipShareOfAiCapex: number;
  chipUsefulLifeYears: number;
  facilityUsefulLifeYears: number;
  chipDeploymentLagQuarters: number;
  facilityDeploymentLagQuarters: number;
  replacementCostPremium: number;
  debtFundedShareOfCashDeficit: number;
  financingRate: number;
}

export interface AiCapitalSnapshot {
  quarterlyAiRevenueBillion: number;
  quarterlyAiDepreciationBillion: number;
  revenueDepreciationCoverage: number;
  revenueLessDepreciationBillion: number;
  clearsDepreciationBar: boolean;
}

export interface AiCapitalQuarter {
  index: number;
  year: number;
  quarter: number;
  aiRevenueBillion: number;
  aiCapexBillion: number;
  depreciationBillion: number;
  cashOperatingCostBillion: number;
  operatingCashContributionBillion: number;
  maintenanceCapexBillion: number;
  growthCapexBillion: number;
  financingCostBillion: number;
  revenueDepreciationCoverage: number;
  economicReplacementCoverage: number;
  totalCapexSelfFundingCoverage: number;
  cashAfterReplacementBillion: number;
  freeCashFlowBillion: number;
  cumulativeNetCashBillion: number;
  debtBalanceBillion: number;
}

export interface AiCapitalCycleResult {
  scenario: AiCapitalCycleScenario;
  revision: 'cohort-cash-flow-v2';
  initialSnapshot: AiCapitalSnapshot;
  quarters: AiCapitalQuarter[];
  firstRevenueCoverageQuarter: string | null;
  firstEconomicReplacementQuarter: string | null;
  firstTotalCapexSelfFundingQuarter: string | null;
  peakCumulativeFundingNeedBillion: number;
  endingCumulativeNetCashBillion: number;
  endingDebtBalanceBillion: number;
  endingCapexReplacementCoverage: number;
  endingNewCapexBookValueBillion: number;
}

function validateScenario(scenario: AiCapitalCycleScenario): void {
  assertFiniteDeep(scenario, 'AI capital-cycle scenario');
  const errors = [
    ...validateNumber(scenario.startYear, 'startYear', { integer: true }),
    ...validateNumber(scenario.startQuarter, 'startQuarter', {
      integer: true,
      min: 1,
      max: 4,
    }),
    ...validateNumber(scenario.quarters, 'quarters', { integer: true, min: 1 }),
    ...validateNumber(
      scenario.startingQuarterlyAiRevenueBillion,
      'startingQuarterlyAiRevenueBillion',
      { min: 0, exclusiveMin: true },
    ),
    ...validateNumber(
      scenario.startingQuarterlyAiDepreciationBillion,
      'startingQuarterlyAiDepreciationBillion',
      { min: 0, exclusiveMin: true },
    ),
    ...validateNumber(scenario.aiShareOfDeveloperCapex, 'aiShareOfDeveloperCapex', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(scenario.cashOperatingCostShare, 'cashOperatingCostShare', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(scenario.chipShareOfAiCapex, 'chipShareOfAiCapex', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(scenario.chipUsefulLifeYears, 'chipUsefulLifeYears', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(scenario.facilityUsefulLifeYears, 'facilityUsefulLifeYears', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(
      scenario.chipDeploymentLagQuarters,
      'chipDeploymentLagQuarters',
      { integer: true, min: 0 },
    ),
    ...validateNumber(
      scenario.facilityDeploymentLagQuarters,
      'facilityDeploymentLagQuarters',
      { integer: true, min: 0 },
    ),
    ...validateNumber(scenario.replacementCostPremium, 'replacementCostPremium', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(
      scenario.debtFundedShareOfCashDeficit,
      'debtFundedShareOfCashDeficit',
      { min: 0, max: 1 },
    ),
    ...validateNumber(scenario.financingRate, 'financingRate', { min: 0, max: 1 }),
  ];
  if (scenario.annualRevenueGrowthPath.length === 0) {
    errors.push('annualRevenueGrowthPath must not be empty');
  }
  if (scenario.annualTotalDeveloperCapexBillion.length === 0) {
    errors.push('annualTotalDeveloperCapexBillion must not be empty');
  }
  if (!Number.isInteger(scenario.chipUsefulLifeYears * 4)) {
    errors.push('chipUsefulLifeYears must resolve to an integer number of quarters');
  }
  if (!Number.isInteger(scenario.facilityUsefulLifeYears * 4)) {
    errors.push('facilityUsefulLifeYears must resolve to an integer number of quarters');
  }
  scenario.annualRevenueGrowthPath.forEach((value, index) => {
    errors.push(
      ...validateNumber(value, `annualRevenueGrowthPath[${index}]`, {
        min: -0.99,
        max: 5,
      }),
    );
  });
  scenario.annualTotalDeveloperCapexBillion.forEach((value, index) => {
    errors.push(
      ...validateNumber(value, `annualTotalDeveloperCapexBillion[${index}]`, {
        min: 0,
      }),
    );
  });
  if (errors.length > 0) {
    throw new Error(`Invalid AI capital-cycle scenario:\n  ${errors.join('\n  ')}`);
  }
}

const atOrLast = (values: readonly number[], index: number): number =>
  values[Math.min(index, values.length - 1)] as number;

// A zero requirement is fully covered for threshold purposes. Returning one
// keeps registry outputs finite without inventing an arbitrarily large ratio.
const coverageRatio = (available: number, required: number): number =>
  required > 0 ? available / required : available >= 0 ? 1 : 0;

const quarterLabel = (row: AiCapitalQuarter | undefined): string | null =>
  row ? `${row.year}Q${row.quarter}` : null;

/**
 * Initial headline test: does reported AI revenue exceed reported AI-related
 * depreciation in the same quarter?
 *
 * This is a valid accounting ratio, but it is not a profitability or
 * self-financing test because revenue still has to pay operating costs and
 * because current capex has not yet fully entered depreciation.
 */
export function simulateAiCapitalCycleV1(
  scenario: AiCapitalCycleScenario,
): AiCapitalSnapshot {
  validateScenario(scenario);
  const revenueDepreciationCoverage =
    scenario.startingQuarterlyAiRevenueBillion /
    scenario.startingQuarterlyAiDepreciationBillion;
  const result: AiCapitalSnapshot = {
    quarterlyAiRevenueBillion:
      scenario.startingQuarterlyAiRevenueBillion,
    quarterlyAiDepreciationBillion:
      scenario.startingQuarterlyAiDepreciationBillion,
    revenueDepreciationCoverage,
    revenueLessDepreciationBillion:
      scenario.startingQuarterlyAiRevenueBillion -
      scenario.startingQuarterlyAiDepreciationBillion,
    clearsDepreciationBar: revenueDepreciationCoverage >= 1,
  };
  assertFiniteDeep(result, 'AI capital-cycle V1 result');
  return result;
}

/**
 * Revised cohort cash-flow model. It adds operating costs, separate chip and
 * facility lives, deployment lags, the future depreciation generated by
 * today's capex, replacement-cost inflation, and financing costs.
 */
export function simulateAiCapitalCycleV2(
  scenario: AiCapitalCycleScenario,
): AiCapitalCycleResult {
  validateScenario(scenario);

  const initialSnapshot = simulateAiCapitalCycleV1(scenario);
  const capexVintages: DepreciableVintage[] = [];
  const chipLifeQuarters = scenario.chipUsefulLifeYears * 4;
  const facilityLifeQuarters = scenario.facilityUsefulLifeYears * 4;

  let revenueBillion = scenario.startingQuarterlyAiRevenueBillion;
  let cumulativeNetCashBillion = 0;
  let minimumCumulativeNetCashBillion = 0;
  let debtBalanceBillion = 0;
  const quarters: AiCapitalQuarter[] = [];

  for (let index = 0; index < scenario.quarters; index++) {
    const absoluteQuarter = scenario.startQuarter - 1 + index;
    const yearOffset = Math.floor(absoluteQuarter / 4);
    const year = scenario.startYear + yearOffset;
    const quarter = absoluteQuarter % 4 + 1;
    if (index > 0) {
      const annualRevenueGrowth = atOrLast(
        scenario.annualRevenueGrowthPath,
        yearOffset,
      );
      revenueBillion *= Math.pow(1 + annualRevenueGrowth, 1 / 4);
    }

    const totalDeveloperCapexBillion = atOrLast(
      scenario.annualTotalDeveloperCapexBillion,
      yearOffset,
    );
    const aiCapexBillion =
      totalDeveloperCapexBillion *
      scenario.aiShareOfDeveloperCapex /
      4;
    capexVintages.push(
      depreciableVintage({
        id: `chips-${index}`,
        expenditureStep: index,
        inServiceStep: index + scenario.chipDeploymentLagQuarters,
        cost: aiCapexBillion * scenario.chipShareOfAiCapex,
        usefulLifeSteps: chipLifeQuarters,
      }),
      depreciableVintage({
        id: `facilities-${index}`,
        expenditureStep: index,
        inServiceStep: index + scenario.facilityDeploymentLagQuarters,
        cost: aiCapexBillion * (1 - scenario.chipShareOfAiCapex),
        usefulLifeSteps: facilityLifeQuarters,
      }),
    );

    // The starting depreciation stock is split into separate uniformly aged
    // chip and facility pools rather than compressed into one average life.
    const legacyDepreciationBillion =
      scenario.startingQuarterlyAiDepreciationBillion * (
        scenario.chipShareOfAiCapex *
          Math.max(0, 1 - index / chipLifeQuarters) +
        (1 - scenario.chipShareOfAiCapex) *
          Math.max(0, 1 - index / facilityLifeQuarters)
      );
    const newDepreciationBillion =
      straightLineDepreciation(capexVintages, index).depreciation;
    const depreciationBillion =
      legacyDepreciationBillion + newDepreciationBillion;
    const cashOperatingCostBillion =
      revenueBillion * scenario.cashOperatingCostShare;
    const operatingCashContributionBillion =
      revenueBillion - cashOperatingCostBillion;
    const maintenanceCapexBillion =
      depreciationBillion * scenario.replacementCostPremium;
    const growthCapexBillion = Math.max(
      0,
      aiCapexBillion - maintenanceCapexBillion,
    );
    const financingCostBillion =
      debtBalanceBillion * scenario.financingRate / 4;
    const cashAfterReplacementBillion =
      operatingCashContributionBillion -
      maintenanceCapexBillion -
      financingCostBillion;
    const freeCashFlowBillion =
      operatingCashContributionBillion -
      aiCapexBillion -
      financingCostBillion;
    cumulativeNetCashBillion += freeCashFlowBillion;
    minimumCumulativeNetCashBillion = Math.min(
      minimumCumulativeNetCashBillion,
      cumulativeNetCashBillion,
    );
    if (freeCashFlowBillion < 0) {
      debtBalanceBillion +=
        -freeCashFlowBillion * scenario.debtFundedShareOfCashDeficit;
    } else {
      debtBalanceBillion = Math.max(
        0,
        debtBalanceBillion -
          freeCashFlowBillion * scenario.debtFundedShareOfCashDeficit,
      );
    }

    quarters.push({
      index,
      year,
      quarter,
      aiRevenueBillion: revenueBillion,
      aiCapexBillion,
      depreciationBillion,
      cashOperatingCostBillion,
      operatingCashContributionBillion,
      maintenanceCapexBillion,
      growthCapexBillion,
      financingCostBillion,
      revenueDepreciationCoverage: coverageRatio(
        revenueBillion,
        depreciationBillion,
      ),
      economicReplacementCoverage: coverageRatio(
        operatingCashContributionBillion,
        maintenanceCapexBillion + financingCostBillion,
      ),
      totalCapexSelfFundingCoverage: coverageRatio(
        operatingCashContributionBillion,
        aiCapexBillion + financingCostBillion,
      ),
      cashAfterReplacementBillion,
      freeCashFlowBillion,
      cumulativeNetCashBillion,
      debtBalanceBillion,
    });
  }

  const result: AiCapitalCycleResult = {
    scenario,
    revision: 'cohort-cash-flow-v2',
    initialSnapshot,
    quarters,
    firstRevenueCoverageQuarter: quarterLabel(
      quarters.find((row) => row.revenueDepreciationCoverage >= 1),
    ),
    firstEconomicReplacementQuarter: quarterLabel(
      quarters.find((row) => row.economicReplacementCoverage >= 1),
    ),
    firstTotalCapexSelfFundingQuarter: quarterLabel(
      quarters.find((row) => row.totalCapexSelfFundingCoverage >= 1),
    ),
    peakCumulativeFundingNeedBillion: -minimumCumulativeNetCashBillion,
    endingCumulativeNetCashBillion: cumulativeNetCashBillion,
    endingDebtBalanceBillion: debtBalanceBillion,
    endingCapexReplacementCoverage:
      (quarters.at(-1)?.maintenanceCapexBillion ?? 0) > 0
        ? (quarters.at(-1)?.aiCapexBillion ?? 0) /
          (quarters.at(-1)?.maintenanceCapexBillion ?? 1)
        : 1,
    endingNewCapexBookValueBillion:
      straightLineDepreciation(
        capexVintages,
        Math.max(0, scenario.quarters - 1),
      ).endingBookValue,
  };
  assertFiniteDeep(result, 'AI capital-cycle V2 result');
  return result;
}

const commonAiCycle = {
  startYear: 2026,
  startQuarter: 1,
  quarters: 40,
  startingQuarterlyAiRevenueBillion: 25,
  startingQuarterlyAiDepreciationBillion: 21,
  chipShareOfAiCapex: 0.70,
  chipUsefulLifeYears: 4,
  facilityUsefulLifeYears: 15,
  chipDeploymentLagQuarters: 2,
  facilityDeploymentLagQuarters: 6,
  replacementCostPremium: 1.05,
  debtFundedShareOfCashDeficit: 0.25,
  financingRate: 0.06,
} as const;

export const aiCapitalCycleScenarios = {
  central: {
    ...commonAiCycle,
    id: 'central',
    label: 'Central monetization and capex normalization',
    annualRevenueGrowthPath: [
      0.65, 0.55, 0.45, 0.35, 0.28, 0.22, 0.18, 0.15, 0.12, 0.10,
    ],
    annualTotalDeveloperCapexBillion: [
      725, 780, 800, 760, 700, 680, 660, 640, 620, 600,
    ],
    aiShareOfDeveloperCapex: 0.70,
    cashOperatingCostShare: 0.38,
  },
  'fast-monetization': {
    ...commonAiCycle,
    id: 'fast-monetization',
    label: 'Fast revenue growth and narrower AI capex allocation',
    annualRevenueGrowthPath: [
      0.85, 0.70, 0.55, 0.42, 0.32, 0.25, 0.20, 0.16, 0.13, 0.10,
    ],
    annualTotalDeveloperCapexBillion: [
      725, 760, 760, 700, 620, 560, 520, 480, 460, 440,
    ],
    aiShareOfDeveloperCapex: 0.50,
    cashOperatingCostShare: 0.32,
  },
  'slow-monetization': {
    ...commonAiCycle,
    id: 'slow-monetization',
    label: 'Slower revenue growth and broad AI capex allocation',
    annualRevenueGrowthPath: [
      0.45, 0.38, 0.32, 0.26, 0.21, 0.17, 0.14, 0.12, 0.10, 0.08,
    ],
    annualTotalDeveloperCapexBillion: [
      725, 800, 840, 840, 820, 780, 740, 700, 650, 600,
    ],
    aiShareOfDeveloperCapex: 0.80,
    cashOperatingCostShare: 0.45,
  },
} as const satisfies Readonly<Record<string, AiCapitalCycleScenario>>;

export const aiCapitalCycleEvidence = {
  q1_2026RevenueBillion: 25,
  q1_2026DepreciationBillion: 21,
  bigTech2026CapexBillion: 725,
  sources: {
    revenueAndDepreciation:
      'https://aiweekly.co/alerts/exponential-view-ai-revenue-clears-the-depreciation-bar',
    capex:
      'https://www.bloomberg.com/news/articles/2026-04-30/us-big-tech-ratchets-up-ai-spending-past-700-billion-this-year',
    currentMarkets:
      'https://au.marketscreener.com/news/stocks-sink-on-big-tech-cash-burn-oil-hits-100-for-first-time-since-may-ce7f51dedf8afe22',
  },
} as const;

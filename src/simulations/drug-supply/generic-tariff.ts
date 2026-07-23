import {
  assertFiniteDeep,
  validateNumber,
  validateShares,
} from 'tsimulation';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export interface GenericTariffScenario {
  id: string;
  label: string;
  months: number;
  initialImportShare: number;
  initialDomesticShare: number;
  initialInventoryMonths: number;
  targetInventoryMonths: number;
  tariffStartMonth: number;
  secondTariffMonth: number;
  firstTariffRate: number;
  secondTariffRate: number;
  importedUnitCostIndex: number;
  existingDomesticUnitCostIndex: number;
  newDomesticUnitCostIndex: number;
  /** Customs value exposed to the duty, relative to the baseline paid price. */
  tariffCustomsValueShare: number;
  /** Share of the full weighted cost shock reflected in the paid price. */
  payerPassThrough: number;
  /** Sensitivity of economically available import supply to cost coverage. */
  importSupplyElasticity: number;
  minimumImportRetention: number;
  /** Qualified domestic capacity available after the onshoring buildout. */
  onshoreTargetShare: number;
  constructionLeadMonths: number;
  qualificationRampMonths: number;
  domesticSupplyElasticity: number;
  /** Reliability payment or production credit relative to baseline price. */
  domesticProductionCredit: number;
}

export interface GenericTariffMonth {
  month: number;
  tariffRate: number;
  allowedPriceMultiplier: number;
  importDeliveredCostIndex: number;
  importEconomicCoverage: number;
  importSupply: number;
  existingDomesticSupply: number;
  newDomesticCapacity: number;
  newDomesticSupply: number;
  releasedSupply: number;
  beginningInventoryMonths: number;
  endingInventoryMonths: number;
  serviceLevel: number;
  domesticShareOfReleasedSupply: number;
  tariffRevenueIndex: number;
}

export interface GenericTariffResult {
  scenario: GenericTariffScenario;
  months: readonly GenericTariffMonth[];
  firstShortageMonth: number | null;
  monthsBelow98Pct: number;
  minimumServiceLevel: number;
  cumulativeDoseShortfallMonths: number;
  peakPaidPriceMultiplier: number;
  averagePaidPriceMultiplier: number;
  endingInventoryMonths: number;
  endingDomesticCapacityShare: number;
  cumulativeTariffRevenueDemandMonths: number;
}

function validateScenario(scenario: GenericTariffScenario): void {
  assertFiniteDeep(scenario, 'generic tariff scenario');
  const errors = [
    ...validateNumber(scenario.months, 'months', { integer: true, min: 1 }),
    ...validateShares(
      {
        imports: scenario.initialImportShare,
        domestic: scenario.initialDomesticShare,
      },
      'initial supply shares',
      1e-9,
    ),
    ...validateNumber(scenario.initialInventoryMonths, 'initialInventoryMonths', { min: 0 }),
    ...validateNumber(scenario.targetInventoryMonths, 'targetInventoryMonths', { min: 0 }),
    ...validateNumber(scenario.tariffStartMonth, 'tariffStartMonth', {
      integer: true,
      min: 0,
    }),
    ...validateNumber(scenario.secondTariffMonth, 'secondTariffMonth', {
      integer: true,
      min: 0,
    }),
    ...validateNumber(scenario.firstTariffRate, 'firstTariffRate', { min: 0 }),
    ...validateNumber(scenario.secondTariffRate, 'secondTariffRate', { min: 0 }),
    ...validateNumber(scenario.importedUnitCostIndex, 'importedUnitCostIndex', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(
      scenario.existingDomesticUnitCostIndex,
      'existingDomesticUnitCostIndex',
      { min: 0, exclusiveMin: true },
    ),
    ...validateNumber(scenario.newDomesticUnitCostIndex, 'newDomesticUnitCostIndex', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(scenario.tariffCustomsValueShare, 'tariffCustomsValueShare', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(scenario.payerPassThrough, 'payerPassThrough', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(scenario.importSupplyElasticity, 'importSupplyElasticity', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(scenario.minimumImportRetention, 'minimumImportRetention', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(scenario.onshoreTargetShare, 'onshoreTargetShare', {
      min: 0,
      max: 1.5,
    }),
    ...validateNumber(scenario.constructionLeadMonths, 'constructionLeadMonths', {
      min: 0,
    }),
    ...validateNumber(scenario.qualificationRampMonths, 'qualificationRampMonths', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(scenario.domesticSupplyElasticity, 'domesticSupplyElasticity', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(scenario.domesticProductionCredit, 'domesticProductionCredit', {
      min: 0,
    }),
  ];
  if (scenario.secondTariffMonth < scenario.tariffStartMonth) {
    errors.push('secondTariffMonth must not precede tariffStartMonth');
  }
  if (scenario.onshoreTargetShare < scenario.initialDomesticShare) {
    errors.push('onshoreTargetShare must not be below initialDomesticShare');
  }
  if (errors.length > 0) {
    throw new Error(`Invalid generic tariff scenario:\n  ${errors.join('\n  ')}`);
  }
}

function tariffAt(scenario: GenericTariffScenario, month: number): number {
  if (month < scenario.tariffStartMonth) return 0;
  if (month < scenario.secondTariffMonth) return scenario.firstTariffRate;
  return scenario.secondTariffRate;
}

function onshoreCapacityAt(
  scenario: GenericTariffScenario,
  month: number,
): number {
  const maximumAddition =
    scenario.onshoreTargetShare - scenario.initialDomesticShare;
  const ramp = clamp(
    (month - scenario.constructionLeadMonths) /
      scenario.qualificationRampMonths,
    0,
    1,
  );
  return maximumAddition * ramp;
}

/**
 * Monthly transition model for a tariff on imported generics. The tariff does
 * not mechanically destroy medicine: access deteriorates only when the paid
 * price fails to cover tariff-inclusive imports before qualified domestic
 * capacity arrives. Inventory can bridge a timing gap but cannot replace a
 * permanently uneconomic source.
 */
export function simulateGenericTariffTransition(
  scenario: GenericTariffScenario,
): GenericTariffResult {
  validateScenario(scenario);

  const baselineWeightedCost =
    scenario.initialImportShare * scenario.importedUnitCostIndex +
    scenario.initialDomesticShare * scenario.existingDomesticUnitCostIndex;
  let inventory = scenario.initialInventoryMonths;
  const months: GenericTariffMonth[] = [];

  for (let month = 0; month < scenario.months; month++) {
    const tariffRate = tariffAt(scenario, month);
    const importDeliveredCostIndex =
      scenario.importedUnitCostIndex +
      scenario.tariffCustomsValueShare * tariffRate;
    const weightedCostAtOriginalShares =
      scenario.initialImportShare * importDeliveredCostIndex +
      scenario.initialDomesticShare * scenario.existingDomesticUnitCostIndex;
    const fullPassThroughPrice = Math.max(
      1,
      weightedCostAtOriginalShares / baselineWeightedCost,
    );
    const allowedPriceMultiplier =
      1 + scenario.payerPassThrough * (fullPassThroughPrice - 1);

    const importEconomicCoverage = clamp(
      allowedPriceMultiplier / importDeliveredCostIndex,
      0,
      1,
    );
    const importRetention = Math.max(
      scenario.minimumImportRetention,
      importEconomicCoverage ** scenario.importSupplyElasticity,
    );
    const importSupply = scenario.initialImportShare * importRetention;
    const existingDomesticSupply = scenario.initialDomesticShare;
    const newDomesticCapacity = onshoreCapacityAt(scenario, month);
    const domesticEconomicCoverage = clamp(
      (allowedPriceMultiplier + scenario.domesticProductionCredit) /
        scenario.newDomesticUnitCostIndex,
      0,
      1,
    );
    const newDomesticSupply =
      newDomesticCapacity *
      domesticEconomicCoverage ** scenario.domesticSupplyElasticity;
    const releasedSupply =
      importSupply + existingDomesticSupply + newDomesticSupply;
    const beginningInventoryMonths = inventory;
    const available = releasedSupply + beginningInventoryMonths;
    const serviceLevel = Math.min(1, available);
    inventory = clamp(
      available - serviceLevel,
      0,
      scenario.targetInventoryMonths,
    );
    const domesticShareOfReleasedSupply = releasedSupply > 0
      ? (existingDomesticSupply + newDomesticSupply) / releasedSupply
      : 0;
    const tariffRevenueIndex =
      importSupply * scenario.tariffCustomsValueShare * tariffRate;

    months.push({
      month,
      tariffRate,
      allowedPriceMultiplier,
      importDeliveredCostIndex,
      importEconomicCoverage,
      importSupply,
      existingDomesticSupply,
      newDomesticCapacity,
      newDomesticSupply,
      releasedSupply,
      beginningInventoryMonths,
      endingInventoryMonths: inventory,
      serviceLevel,
      domesticShareOfReleasedSupply,
      tariffRevenueIndex,
    });
  }

  const shortage = months.find((row) => row.serviceLevel < 0.98);
  const result: GenericTariffResult = {
    scenario,
    months,
    firstShortageMonth: shortage?.month ?? null,
    monthsBelow98Pct: months.filter((row) => row.serviceLevel < 0.98).length,
    minimumServiceLevel: Math.min(...months.map((row) => row.serviceLevel)),
    cumulativeDoseShortfallMonths: months.reduce(
      (sum, row) => sum + Math.max(0, 1 - row.serviceLevel),
      0,
    ),
    peakPaidPriceMultiplier: Math.max(
      ...months.map((row) => row.allowedPriceMultiplier),
    ),
    averagePaidPriceMultiplier:
      months.reduce((sum, row) => sum + row.allowedPriceMultiplier, 0) /
      months.length,
    endingInventoryMonths: inventory,
    endingDomesticCapacityShare:
      scenario.initialDomesticShare +
      onshoreCapacityAt(scenario, scenario.months - 1),
    cumulativeTariffRevenueDemandMonths: months.reduce(
      (sum, row) => sum + row.tariffRevenueIndex,
      0,
    ),
  };
  assertFiniteDeep(result, 'generic tariff result');
  return result;
}

const tariffCommon: Omit<
  GenericTariffScenario,
  | 'id'
  | 'label'
  | 'payerPassThrough'
  | 'onshoreTargetShare'
  | 'constructionLeadMonths'
  | 'qualificationRampMonths'
  | 'domesticProductionCredit'
  | 'initialInventoryMonths'
  | 'targetInventoryMonths'
> = {
  months: 60,
  initialImportShare: 0.69,
  initialDomesticShare: 0.31,
  tariffStartMonth: 24,
  secondTariffMonth: 36,
  firstTariffRate: 1,
  secondTariffRate: 2,
  importedUnitCostIndex: 0.85,
  existingDomesticUnitCostIndex: 0.95,
  newDomesticUnitCostIndex: 1.30,
  tariffCustomsValueShare: 0.65,
  importSupplyElasticity: 2,
  minimumImportRetention: 0.25,
  domesticSupplyElasticity: 2,
};

export const genericTariffScenarios: Readonly<Record<string, GenericTariffScenario>> = {
  'no-onshoring': {
    ...tariffCommon,
    id: 'no-onshoring',
    label: 'Tariffs without qualified domestic expansion',
    payerPassThrough: 0.75,
    onshoreTargetShare: 0.31,
    constructionLeadMonths: 30,
    qualificationRampMonths: 18,
    domesticProductionCredit: 0,
    initialInventoryMonths: 1.5,
    targetInventoryMonths: 2,
  },
  announced: {
    ...tariffCommon,
    id: 'announced',
    label: 'Two-year notice with conventional construction and qualification',
    payerPassThrough: 0.75,
    onshoreTargetShare: 0.65,
    constructionLeadMonths: 36,
    qualificationRampMonths: 18,
    domesticProductionCredit: 0,
    initialInventoryMonths: 1.5,
    targetInventoryMonths: 2,
  },
  'full-pass-through': {
    ...tariffCommon,
    id: 'full-pass-through',
    label: 'Tariff fully passed through to purchasers',
    payerPassThrough: 1,
    onshoreTargetShare: 0.65,
    constructionLeadMonths: 36,
    qualificationRampMonths: 18,
    domesticProductionCredit: 0,
    initialInventoryMonths: 1.5,
    targetInventoryMonths: 2,
  },
  'fast-qualification': {
    ...tariffCommon,
    id: 'fast-qualification',
    label: 'Accelerated construction, FDA qualification, and production credit',
    payerPassThrough: 0.75,
    onshoreTargetShare: 0.70,
    constructionLeadMonths: 18,
    qualificationRampMonths: 12,
    domesticProductionCredit: 0.15,
    initialInventoryMonths: 2,
    targetInventoryMonths: 3,
  },
  resilience: {
    ...tariffCommon,
    id: 'resilience',
    label: 'Larger stockpile plus accelerated qualified capacity',
    payerPassThrough: 0.75,
    onshoreTargetShare: 0.70,
    constructionLeadMonths: 18,
    qualificationRampMonths: 12,
    domesticProductionCredit: 0.20,
    initialInventoryMonths: 4,
    targetInventoryMonths: 4,
  },
};

export const genericTariffEvidence = {
  genericPrescriptionShare: 0.90,
  genericSpendingShareUpperBound: 0.13,
  foreignGenericProductShare: 0.69,
  usApiManufacturerShare: 0.09,
  indiaApiManufacturerShare: 0.44,
  indiaManufacturingCostAdvantageRange: [0.30, 0.40] as const,
  sources: {
    policy:
      'https://m.economictimes.com/news/economy/foreign-trade/trumps-100-generic-drug-duty-threatens-us-low-cost-supply/amp_articleshow/132553340.cms',
    fdaOnshoring:
      'https://www.fda.gov/drugs/news-events-human-drugs/fda-public-meeting-onshoring-manufacturing-drugs-and-biological-products-09302025',
    fdaGenericEconomics:
      'https://www.fda.gov/news-events/fda-voices/ensuring-quality-and-access-fdas-approach-generic-drug-oversight',
    fdaCostAdvantage:
      'https://www.fda.gov/news-events/congressional-testimony/securing-us-drug-supply-chain-oversight-fdas-foreign-inspection-program-12102019',
  },
} as const;

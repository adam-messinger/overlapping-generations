import {
  assertFiniteDeep,
  validateNumber,
  validateShares,
} from 'tsimulation';
import {
  EBIKE_REGIONS,
  INCUMBENT_MOTOR_SUPPLIERS,
  MOTOR_ARCHITECTURES,
  MOTOR_SUPPLIERS,
  supplierDefinitions,
  supplierShares2024,
  supplierShares2040,
  type EbikeMotorScenario,
  type EbikeRegion,
  type EntrantStrategy,
  type IncumbentMotorSupplier,
  type MotorArchitecture,
  type MotorSupplier,
  type RegionalAdoptionParams,
} from './data.js';

const SHARE_BASE_YEAR = 2024;
const SHARE_TARGET_YEAR = 2040;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

function interpolate(
  start: number,
  end: number,
  progress: number,
): number {
  return start + (end - start) * clamp(progress, 0, 1);
}

export interface RegionalMotorYear {
  region: EbikeRegion;
  populationMillions: number;
  beginningInstalledStock: number;
  replacementSales: number;
  newAdoptionSales: number;
  annualSales: number;
  endingInstalledStock: number;
  stockPerThousandPeople: number;
  architectureShares: Record<MotorArchitecture, number>;
  entrantAddressableUnits: number;
  entrantUnits: number;
  entrantShareOfAddressableMarket: number;
}

export interface EntrantFinancialYear {
  annualUnits: number;
  activeInstalledBase: number;
  qualifiedOemPrograms: number;
  oemProgramCapacity: number;
  factoryCapacity: number;
  averageSellingPriceDollars: number;
  variableCostDollars: number;
  revenueMillion: number;
  costOfGoodsMillion: number;
  grossProfitMillion: number;
  grossMargin: number;
  researchExpenseMillion: number;
  salesAndServiceExpenseMillion: number;
  installedBaseServiceExpenseMillion: number;
  generalAdminExpenseMillion: number;
  oemEngineeringExpenseMillion: number;
  operatingExpenseMillion: number;
  operatingIncomeMillion: number;
  capacityCapexMillion: number;
  freeCashFlowMillion: number;
  cumulativeCashFlowMillion: number;
  discountedCashFlowMillion: number;
}

export interface EbikeMotorYear {
  year: number;
  regions: Record<EbikeRegion, RegionalMotorYear>;
  globalAnnualSales: number;
  globalDriveUnitDemand: number;
  globalInstalledStock: number;
  architectureVolumes: Record<MotorArchitecture, number>;
  supplierVolumes: Record<MotorSupplier, number>;
  entrant: EntrantFinancialYear;
}

export type EntrantOutcome =
  | 'no-operating-breakeven'
  | 'profitable-niche'
  | 'scaled-industrial-supplier'
  | 'venture-scale-platform';

export interface EbikeMotorResult {
  scenario: EbikeMotorScenario;
  years: readonly EbikeMotorYear[];
  firstOperatingBreakevenYear: number | null;
  cashPaybackYear: number | null;
  peakFundingNeedMillion: number;
  explicitHorizonNpvMillion: number;
  terminalValueAtHorizonMillion: number;
  enterpriseNpvMillion: number;
  endingAnnualUnits: number;
  endingRevenueMillion: number;
  endingOperatingIncomeMillion: number;
  endingOperatingMargin: number;
  endingGlobalSupplierShare: number;
  entrantOutcome: EntrantOutcome;
}

interface RegionalState {
  populationMillions: number;
  stock: number;
  midDriveShare: number;
}

interface EntrantCommercialState {
  targetShare: number;
  qualifiedOemPrograms: number;
  cumulativeUnits: number;
  activeInstalledBase: number;
  factoryCapacity: number;
  cumulativeCashFlowMillion: number;
}

function validateRegionalParams(
  params: RegionalAdoptionParams,
  key: EbikeRegion,
  scenario: EbikeMotorScenario,
): string[] {
  const path = `scenario.regions.${key}`;
  const errors = [
    ...validateNumber(params.baseYear, `${path}.baseYear`, {
      integer: true,
      min: 2000,
    }),
    ...validateNumber(params.populationMillions, `${path}.populationMillions`, {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(
      params.annualPopulationGrowth,
      `${path}.annualPopulationGrowth`,
      { min: -1, exclusiveMin: true, max: 0.1 },
    ),
    ...validateNumber(
      params.initialInstalledStock,
      `${path}.initialInstalledStock`,
      { min: 0 },
    ),
    ...validateNumber(params.baseAnnualSales, `${path}.baseAnnualSales`, {
      min: 0,
    }),
    ...validateNumber(
      params.saturationStockPerThousandPeople,
      `${path}.saturationStockPerThousandPeople`,
      { min: 0, exclusiveMin: true },
    ),
    ...validateNumber(params.innovationRate, `${path}.innovationRate`, {
      min: 0,
      max: 1,
    }),
    ...validateNumber(params.imitationRate, `${path}.imitationRate`, {
      min: 0,
      max: 1,
    }),
    ...validateNumber(params.replacementYears, `${path}.replacementYears`, {
      min: 1,
    }),
    ...validateNumber(params.baseMidDriveShare, `${path}.baseMidDriveShare`, {
      min: 0,
      max: 1,
    }),
    ...validateNumber(
      params.targetMidDriveShare,
      `${path}.targetMidDriveShare`,
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      params.architectureTransitionRate,
      `${path}.architectureTransitionRate`,
      { min: 0, max: 1 },
    ),
  ];
  if (params.id !== key) {
    errors.push(`${path}.id must equal '${key}'`);
  }
  if (params.baseYear !== scenario.startYear) {
    errors.push(`${path}.baseYear must equal scenario.startYear`);
  }
  for (const architecture of MOTOR_ARCHITECTURES) {
    errors.push(
      ...validateNumber(
        params.entrantOpenness[architecture],
        `${path}.entrantOpenness.${architecture}`,
        { min: 0, max: 1 },
      ),
    );
  }
  return errors;
}

function validateEntrant(
  entrant: EntrantStrategy,
  scenario: EbikeMotorScenario,
): string[] {
  const path = 'scenario.entrant';
  const errors = [
    ...validateNumber(entrant.launchYear, `${path}.launchYear`, {
      integer: true,
      min: scenario.startYear,
      max: scenario.endYear,
    }),
    ...validateNumber(entrant.productScore, `${path}.productScore`, {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(entrant.priceIndex, `${path}.priceIndex`, {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(entrant.serviceScore, `${path}.serviceScore`, {
      min: 0,
      max: 1,
    }),
    ...validateNumber(entrant.integrationScore, `${path}.integrationScore`, {
      min: 0,
      max: 1,
    }),
    ...validateNumber(entrant.bankabilityScore, `${path}.bankabilityScore`, {
      min: 0,
      max: 1,
    }),
    ...validateNumber(
      entrant.maxAddressableShare,
      `${path}.maxAddressableShare`,
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      entrant.shareAdjustmentRate,
      `${path}.shareAdjustmentRate`,
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      entrant.initialQualifiedOems,
      `${path}.initialQualifiedOems`,
      { min: 0, integer: true },
    ),
    ...validateNumber(entrant.annualOemWins, `${path}.annualOemWins`, {
      min: 0,
      integer: true,
    }),
    ...validateNumber(entrant.matureUnitsPerOem, `${path}.matureUnitsPerOem`, {
      min: 0,
    }),
    ...validateNumber(entrant.oemRampYears, `${path}.oemRampYears`, {
      min: 1,
    }),
    ...validateNumber(
      entrant.initialAnnualCapacity,
      `${path}.initialAnnualCapacity`,
      { min: 0 },
    ),
    ...validateNumber(
      entrant.annualCapacityGrowth,
      `${path}.annualCapacityGrowth`,
      { min: -1, exclusiveMin: true },
    ),
    ...validateNumber(
      entrant.maximumAnnualCapacity,
      `${path}.maximumAnnualCapacity`,
      { min: entrant.initialAnnualCapacity },
    ),
    ...validateNumber(
      entrant.averageSellingPriceDollars,
      `${path}.averageSellingPriceDollars`,
      { min: 0, exclusiveMin: true },
    ),
    ...validateNumber(
      entrant.initialVariableCostDollars,
      `${path}.initialVariableCostDollars`,
      { min: 0 },
    ),
    ...validateNumber(
      entrant.learningRatePerDoubling,
      `${path}.learningRatePerDoubling`,
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      entrant.learningReferenceUnits,
      `${path}.learningReferenceUnits`,
      { min: 0, exclusiveMin: true },
    ),
    ...validateNumber(
      entrant.warrantyRevenueShare,
      `${path}.warrantyRevenueShare`,
      { min: 0, max: 1 },
    ),
    ...validateNumber(entrant.serviceLifeYears, `${path}.serviceLifeYears`, {
      min: 1,
    }),
    ...validateNumber(
      entrant.annualServiceCostPerActiveUnitDollars,
      `${path}.annualServiceCostPerActiveUnitDollars`,
      { min: 0 },
    ),
    ...validateNumber(entrant.discountRate, `${path}.discountRate`, {
      min: -1,
      exclusiveMin: true,
    }),
    ...validateNumber(
      entrant.terminalGrowthRate,
      `${path}.terminalGrowthRate`,
      { min: -1, exclusiveMin: true },
    ),
  ];
  const nonnegativeFields = [
    'preLaunchAnnualResearchMillion',
    'postLaunchAnnualResearchMillion',
    'annualSalesAndServiceMillion',
    'annualGeneralAdminMillion',
    'engineeringMillionPerOemWin',
    'capexDollarsPerAddedCapacity',
  ] as const;
  for (const field of nonnegativeFields) {
    errors.push(
      ...validateNumber(entrant[field], `${path}.${field}`, { min: 0 }),
    );
  }
  if (!MOTOR_ARCHITECTURES.includes(entrant.architecture)) {
    errors.push(`${path}.architecture must be a supported architecture`);
  }
  if (entrant.discountRate <= entrant.terminalGrowthRate) {
    errors.push(
      `${path}.discountRate must exceed ${path}.terminalGrowthRate`,
    );
  }
  return errors;
}

function validateScenario(scenario: EbikeMotorScenario): void {
  assertFiniteDeep(scenario, 'e-bike motor scenario');
  const errors = [
    ...validateNumber(scenario.startYear, 'scenario.startYear', {
      integer: true,
      min: SHARE_BASE_YEAR,
    }),
    ...validateNumber(scenario.endYear, 'scenario.endYear', {
      integer: true,
      min: scenario.startYear,
    }),
    ...validateEntrant(scenario.entrant, scenario),
  ];
  for (const region of EBIKE_REGIONS) {
    errors.push(...validateRegionalParams(scenario.regions[region], region, scenario));
    errors.push(
      ...validateShares(
        supplierShares2024[region],
        `supplierShares2024.${region}`,
      ),
      ...validateShares(
        supplierShares2040[region],
        `supplierShares2040.${region}`,
      ),
    );
  }
  if (errors.length > 0) {
    throw new Error(`Invalid e-bike motor scenario:\n- ${errors.join('\n- ')}`);
  }
}

function incumbentShare(
  region: EbikeRegion,
  supplier: IncumbentMotorSupplier,
  year: number,
): number {
  const progress =
    (year - SHARE_BASE_YEAR) / (SHARE_TARGET_YEAR - SHARE_BASE_YEAR);
  return interpolate(
    supplierShares2024[region][supplier],
    supplierShares2040[region][supplier],
    progress,
  );
}

function entrantCompetitiveness(entrant: EntrantStrategy): number {
  return (
    Math.pow(entrant.productScore, 0.30) *
    Math.pow(entrant.priceIndex, -0.15) *
    Math.pow(entrant.serviceScore, 0.20) *
    Math.pow(entrant.integrationScore, 0.20) *
    Math.pow(entrant.bankabilityScore, 0.15)
  );
}

function regionalAdoption(
  params: RegionalAdoptionParams,
  state: RegionalState,
  year: number,
): Omit<
  RegionalMotorYear,
  | 'entrantAddressableUnits'
  | 'entrantUnits'
  | 'entrantShareOfAddressableMarket'
> {
  const populationMillions =
    year === params.baseYear
      ? state.populationMillions
      : state.populationMillions * (1 + params.annualPopulationGrowth);
  const beginningStock = state.stock;
  const replacementSales = beginningStock / params.replacementYears;
  let newAdoptionSales: number;
  let annualSales: number;

  if (year === params.baseYear) {
    annualSales = params.baseAnnualSales;
    newAdoptionSales = Math.max(0, annualSales - replacementSales);
  } else {
    const targetStock =
      populationMillions *
      1_000_000 *
      (params.saturationStockPerThousandPeople / 1_000);
    const remainingPotential = Math.max(0, targetStock - beginningStock);
    const adoptionFraction =
      targetStock > 0 ? clamp(beginningStock / targetStock, 0, 1) : 1;
    newAdoptionSales = Math.min(
      remainingPotential,
      Math.max(
        0,
        (params.innovationRate + params.imitationRate * adoptionFraction) *
          remainingPotential,
      ),
    );
    annualSales = replacementSales + newAdoptionSales;
  }

  const endingInstalledStock = Math.max(
    0,
    beginningStock + newAdoptionSales,
  );
  const midDriveShare =
    year === params.baseYear
      ? params.baseMidDriveShare
      : state.midDriveShare +
        params.architectureTransitionRate *
          (params.targetMidDriveShare - state.midDriveShare);
  state.populationMillions = populationMillions;
  state.stock = endingInstalledStock;
  state.midDriveShare = clamp(midDriveShare, 0, 1);

  return {
    region: params.id,
    populationMillions,
    beginningInstalledStock: beginningStock,
    replacementSales,
    newAdoptionSales,
    annualSales,
    endingInstalledStock,
    stockPerThousandPeople:
      endingInstalledStock / (populationMillions * 1_000),
    architectureShares: {
      hub: 1 - state.midDriveShare,
      'mid-drive': state.midDriveShare,
    },
  };
}

function oemProgramCapacity(
  entrant: EntrantStrategy,
  year: number,
): { qualifiedOemPrograms: number; annualCapacity: number } {
  if (year < entrant.launchYear) {
    return { qualifiedOemPrograms: 0, annualCapacity: 0 };
  }
  const elapsed = year - entrant.launchYear;
  let annualCapacity =
    entrant.initialQualifiedOems * entrant.matureUnitsPerOem;
  for (let cohort = 0; cohort <= elapsed; cohort++) {
    const rampAge = elapsed - cohort + 1;
    annualCapacity +=
      entrant.annualOemWins *
      entrant.matureUnitsPerOem *
      clamp(rampAge / entrant.oemRampYears, 0, 1);
  }
  return {
    qualifiedOemPrograms:
      entrant.initialQualifiedOems + entrant.annualOemWins * (elapsed + 1),
    annualCapacity,
  };
}

function allocateEntrantUnits(
  entrant: EntrantStrategy,
  year: number,
  regionalRows: Record<EbikeRegion, RegionalMotorYear>,
  commercialState: EntrantCommercialState,
): {
  unitsByRegion: Record<EbikeRegion, number>;
  qualifiedOemPrograms: number;
  oemProgramCapacity: number;
  factoryCapacity: number;
  addedFactoryCapacity: number;
} {
  const zeroUnits = Object.fromEntries(
    EBIKE_REGIONS.map((region) => [region, 0]),
  ) as Record<EbikeRegion, number>;
  if (year < entrant.launchYear) {
    return {
      unitsByRegion: zeroUnits,
      qualifiedOemPrograms: 0,
      oemProgramCapacity: 0,
      factoryCapacity: 0,
      addedFactoryCapacity: 0,
    };
  }

  const matureShare = clamp(
    entrant.maxAddressableShare * entrantCompetitiveness(entrant),
    0,
    0.5,
  );
  commercialState.targetShare +=
    entrant.shareAdjustmentRate *
    (matureShare - commercialState.targetShare);

  const targetByRegion = Object.fromEntries(
    EBIKE_REGIONS.map((region) => {
      const row = regionalRows[region];
      return [
        region,
        row.entrantAddressableUnits * commercialState.targetShare,
      ];
    }),
  ) as Record<EbikeRegion, number>;
  const targetUnits = sum(Object.values(targetByRegion));
  const programs = oemProgramCapacity(entrant, year);
  const previousFactoryCapacity = commercialState.factoryCapacity;
  if (year === entrant.launchYear) {
    commercialState.factoryCapacity = entrant.initialAnnualCapacity;
  } else {
    const growthConstrainedCapacity =
      previousFactoryCapacity * (1 + entrant.annualCapacityGrowth);
    const justifiedCapacity = Math.min(
      entrant.maximumAnnualCapacity,
      Math.max(
        entrant.initialAnnualCapacity,
        Math.min(programs.annualCapacity, targetUnits * 1.15),
      ),
    );
    commercialState.factoryCapacity = Math.max(
      previousFactoryCapacity,
      Math.min(growthConstrainedCapacity, justifiedCapacity),
    );
  }
  const bindingCapacity = Math.min(
    programs.annualCapacity,
    commercialState.factoryCapacity,
  );
  const fulfillment =
    targetUnits > 0 ? Math.min(1, bindingCapacity / targetUnits) : 0;
  const unitsByRegion = Object.fromEntries(
    EBIKE_REGIONS.map((region) => [
      region,
      targetByRegion[region] * fulfillment,
    ]),
  ) as Record<EbikeRegion, number>;
  commercialState.qualifiedOemPrograms = programs.qualifiedOemPrograms;
  return {
    unitsByRegion,
    qualifiedOemPrograms: programs.qualifiedOemPrograms,
    oemProgramCapacity: programs.annualCapacity,
    factoryCapacity: commercialState.factoryCapacity,
    addedFactoryCapacity: Math.max(
      0,
      commercialState.factoryCapacity - previousFactoryCapacity,
    ),
  };
}

function allocateSupplierVolumes(
  year: number,
  regionalRows: Record<EbikeRegion, RegionalMotorYear>,
  entrantUnitsByRegion: Record<EbikeRegion, number>,
  architecture: MotorArchitecture,
): Record<MotorSupplier, number> {
  const totals = Object.fromEntries(
    MOTOR_SUPPLIERS.map((supplier) => [supplier, 0]),
  ) as Record<MotorSupplier, number>;

  for (const region of EBIKE_REGIONS) {
    const regionSales = regionalRows[region].annualSales;
    const baseline = Object.fromEntries(
      INCUMBENT_MOTOR_SUPPLIERS.map((supplier) => [
        supplier,
        regionSales * incumbentShare(region, supplier, year),
      ]),
    ) as Record<IncumbentMotorSupplier, number>;
    const displacementWeights = Object.fromEntries(
      INCUMBENT_MOTOR_SUPPLIERS.map((supplier) => {
        const definition = supplierDefinitions[supplier];
        const exposure =
          architecture === 'mid-drive'
            ? definition.premiumDisplacementExposure
            : definition.hubDisplacementExposure;
        return [supplier, baseline[supplier] * exposure];
      }),
    ) as Record<IncumbentMotorSupplier, number>;
    const weightTotal = sum(Object.values(displacementWeights));
    const entrantUnits = Math.min(
      entrantUnitsByRegion[region],
      regionSales,
    );
    for (const supplier of INCUMBENT_MOTOR_SUPPLIERS) {
      const displaced =
        weightTotal > 0
          ? entrantUnits * (displacementWeights[supplier] / weightTotal)
          : 0;
      totals[supplier] += Math.max(0, baseline[supplier] - displaced);
    }
    totals['us-entrant'] += entrantUnits;
  }
  return totals;
}

function entrantFinancials(
  entrant: EntrantStrategy,
  year: number,
  yearIndex: number,
  annualUnits: number,
  qualifiedOemPrograms: number,
  oemProgramCapacityValue: number,
  factoryCapacity: number,
  addedFactoryCapacity: number,
  commercialState: EntrantCommercialState,
): EntrantFinancialYear {
  commercialState.cumulativeUnits += annualUnits;
  commercialState.activeInstalledBase =
    commercialState.activeInstalledBase *
      (1 - 1 / entrant.serviceLifeYears) +
    annualUnits;
  const learningUnits = Math.max(
    entrant.learningReferenceUnits,
    commercialState.cumulativeUnits,
  );
  const doublings = Math.max(
    0,
    Math.log2(learningUnits / entrant.learningReferenceUnits),
  );
  const variableCostDollars =
    entrant.initialVariableCostDollars *
    Math.pow(1 - entrant.learningRatePerDoubling, doublings);
  const revenueMillion =
    (annualUnits * entrant.averageSellingPriceDollars) / 1_000_000;
  const costOfGoodsMillion =
    (annualUnits * variableCostDollars) / 1_000_000 +
    revenueMillion * entrant.warrantyRevenueShare;
  const grossProfitMillion = revenueMillion - costOfGoodsMillion;
  const grossMargin =
    revenueMillion > 0 ? grossProfitMillion / revenueMillion : 0;
  const researchExpenseMillion =
    year < entrant.launchYear
      ? entrant.preLaunchAnnualResearchMillion
      : entrant.postLaunchAnnualResearchMillion;
  const commercialReadiness =
    year < entrant.launchYear
      ? clamp(
          (year - (entrant.launchYear - 3) + 1) / 3,
          0.25,
          1,
        )
      : 1;
  const salesAndServiceExpenseMillion =
    entrant.annualSalesAndServiceMillion * commercialReadiness;
  const installedBaseServiceExpenseMillion =
    (commercialState.activeInstalledBase *
      entrant.annualServiceCostPerActiveUnitDollars) /
    1_000_000;
  const generalAdminExpenseMillion =
    entrant.annualGeneralAdminMillion *
    (year < entrant.launchYear ? 0.75 : 1);
  const preLaunchOemEngineering =
    year < entrant.launchYear
      ? (entrant.initialQualifiedOems *
          entrant.engineeringMillionPerOemWin) /
        Math.max(1, entrant.launchYear - 2024)
      : 0;
  const oemEngineeringExpenseMillion =
    year >= entrant.launchYear
      ? entrant.annualOemWins * entrant.engineeringMillionPerOemWin
      : preLaunchOemEngineering;
  const operatingExpenseMillion =
    researchExpenseMillion +
    salesAndServiceExpenseMillion +
    installedBaseServiceExpenseMillion +
    generalAdminExpenseMillion +
    oemEngineeringExpenseMillion;
  const operatingIncomeMillion =
    grossProfitMillion - operatingExpenseMillion;
  const capacityCapexMillion =
    (addedFactoryCapacity * entrant.capexDollarsPerAddedCapacity) / 1_000_000;
  const freeCashFlowMillion =
    operatingIncomeMillion - capacityCapexMillion;
  commercialState.cumulativeCashFlowMillion += freeCashFlowMillion;
  const discountedCashFlowMillion =
    freeCashFlowMillion / Math.pow(1 + entrant.discountRate, yearIndex);

  return {
    annualUnits,
    activeInstalledBase: commercialState.activeInstalledBase,
    qualifiedOemPrograms,
    oemProgramCapacity: oemProgramCapacityValue,
    factoryCapacity,
    averageSellingPriceDollars: entrant.averageSellingPriceDollars,
    variableCostDollars,
    revenueMillion,
    costOfGoodsMillion,
    grossProfitMillion,
    grossMargin,
    researchExpenseMillion,
    salesAndServiceExpenseMillion,
    installedBaseServiceExpenseMillion,
    generalAdminExpenseMillion,
    oemEngineeringExpenseMillion,
    operatingExpenseMillion,
    operatingIncomeMillion,
    capacityCapexMillion,
    freeCashFlowMillion,
    cumulativeCashFlowMillion: commercialState.cumulativeCashFlowMillion,
    discountedCashFlowMillion,
  };
}

function classifyOutcome(
  firstOperatingBreakevenYear: number | null,
  endingRevenueMillion: number,
  endingOperatingMargin: number,
): EntrantOutcome {
  if (firstOperatingBreakevenYear === null || endingOperatingMargin <= 0) {
    return 'no-operating-breakeven';
  }
  if (endingRevenueMillion < 100) return 'profitable-niche';
  if (endingRevenueMillion < 300 || endingOperatingMargin < 0.12) {
    return 'scaled-industrial-supplier';
  }
  return 'venture-scale-platform';
}

/**
 * Annual regional adoption, supplier-volume allocation, and a bottom-up
 * entrant P&L. One complete e-bike requires one drive-unit equivalent, but the
 * two units remain distinct at the model boundary to prevent semantic leaks.
 */
export function simulateEbikeMotorMarket(
  scenario: EbikeMotorScenario,
): EbikeMotorResult {
  validateScenario(scenario);
  const regionalState = Object.fromEntries(
    EBIKE_REGIONS.map((region) => {
      const params = scenario.regions[region];
      return [
        region,
        {
          populationMillions: params.populationMillions,
          stock: params.initialInstalledStock,
          midDriveShare: params.baseMidDriveShare,
        },
      ];
    }),
  ) as Record<EbikeRegion, RegionalState>;
  const commercialState: EntrantCommercialState = {
    targetShare: 0,
    qualifiedOemPrograms: 0,
    cumulativeUnits: 0,
    activeInstalledBase: 0,
    factoryCapacity: 0,
    cumulativeCashFlowMillion: 0,
  };
  const years: EbikeMotorYear[] = [];
  let explicitHorizonNpvMillion = 0;

  for (let year = scenario.startYear; year <= scenario.endYear; year++) {
    const regionalRows = Object.fromEntries(
      EBIKE_REGIONS.map((region) => {
        const base = regionalAdoption(
          scenario.regions[region],
          regionalState[region],
          year,
        );
        const architectureShare =
          base.architectureShares[scenario.entrant.architecture];
        const entrantAddressableUnits =
          base.annualSales *
          architectureShare *
          scenario.regions[region].entrantOpenness[
            scenario.entrant.architecture
          ];
        return [
          region,
          {
            ...base,
            entrantAddressableUnits,
            entrantUnits: 0,
            entrantShareOfAddressableMarket: 0,
          },
        ];
      }),
    ) as Record<EbikeRegion, RegionalMotorYear>;

    const allocation = allocateEntrantUnits(
      scenario.entrant,
      year,
      regionalRows,
      commercialState,
    );
    for (const region of EBIKE_REGIONS) {
      const row = regionalRows[region];
      row.entrantUnits = allocation.unitsByRegion[region];
      row.entrantShareOfAddressableMarket =
        row.entrantAddressableUnits > 0
          ? row.entrantUnits / row.entrantAddressableUnits
          : 0;
    }

    const supplierVolumes = allocateSupplierVolumes(
      year,
      regionalRows,
      allocation.unitsByRegion,
      scenario.entrant.architecture,
    );
    const annualUnits = supplierVolumes['us-entrant'];
    const entrant = entrantFinancials(
      scenario.entrant,
      year,
      year - scenario.startYear,
      annualUnits,
      allocation.qualifiedOemPrograms,
      allocation.oemProgramCapacity,
      allocation.factoryCapacity,
      allocation.addedFactoryCapacity,
      commercialState,
    );
    explicitHorizonNpvMillion += entrant.discountedCashFlowMillion;
    const globalAnnualSales = sum(
      EBIKE_REGIONS.map((region) => regionalRows[region].annualSales),
    );
    const globalInstalledStock = sum(
      EBIKE_REGIONS.map(
        (region) => regionalRows[region].endingInstalledStock,
      ),
    );
    const architectureVolumes = Object.fromEntries(
      MOTOR_ARCHITECTURES.map((architecture) => [
        architecture,
        sum(
          EBIKE_REGIONS.map(
            (region) =>
              regionalRows[region].annualSales *
              regionalRows[region].architectureShares[architecture],
          ),
        ),
      ]),
    ) as Record<MotorArchitecture, number>;
    years.push({
      year,
      regions: regionalRows,
      globalAnnualSales,
      globalDriveUnitDemand: globalAnnualSales,
      globalInstalledStock,
      architectureVolumes,
      supplierVolumes,
      entrant,
    });
  }

  assertFiniteDeep(years, 'e-bike motor result');
  const firstOperatingBreakevenYear =
    years.find(
      (row) =>
        row.year >= scenario.entrant.launchYear &&
        row.entrant.operatingIncomeMillion >= 0,
    )?.year ?? null;
  const cashPaybackYear =
    years.find(
      (row) =>
        row.year >= scenario.entrant.launchYear &&
        row.entrant.cumulativeCashFlowMillion >= 0,
    )?.year ?? null;
  const peakFundingNeedMillion = Math.max(
    0,
    -Math.min(...years.map((row) => row.entrant.cumulativeCashFlowMillion)),
  );
  const ending = years.at(-1)!;
  const endingOperatingMargin =
    ending.entrant.revenueMillion > 0
      ? ending.entrant.operatingIncomeMillion /
        ending.entrant.revenueMillion
      : 0;
  const endingGlobalSupplierShare =
    ending.globalAnnualSales > 0
      ? ending.entrant.annualUnits / ending.globalAnnualSales
      : 0;
  const terminalValueAtHorizonMillion =
    (Math.max(0, ending.entrant.freeCashFlowMillion) *
      (1 + scenario.entrant.terminalGrowthRate)) /
    (scenario.entrant.discountRate - scenario.entrant.terminalGrowthRate);
  const discountedTerminalValueMillion =
    terminalValueAtHorizonMillion /
    Math.pow(
      1 + scenario.entrant.discountRate,
      scenario.endYear - scenario.startYear + 1,
    );
  return {
    scenario,
    years,
    firstOperatingBreakevenYear,
    cashPaybackYear,
    peakFundingNeedMillion,
    explicitHorizonNpvMillion,
    terminalValueAtHorizonMillion,
    enterpriseNpvMillion:
      explicitHorizonNpvMillion + discountedTerminalValueMillion,
    endingAnnualUnits: ending.entrant.annualUnits,
    endingRevenueMillion: ending.entrant.revenueMillion,
    endingOperatingIncomeMillion: ending.entrant.operatingIncomeMillion,
    endingOperatingMargin,
    endingGlobalSupplierShare,
    entrantOutcome: classifyOutcome(
      firstOperatingBreakevenYear,
      ending.entrant.revenueMillion,
      endingOperatingMargin,
    ),
  };
}

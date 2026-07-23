import { assertFiniteDeep, validateNumber } from 'tsimulation';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export interface DataCenterGridScenario {
  id: string;
  label: string;
  /** Incremental contracted data-center load between the present and 2035. */
  incrementalContractedLoadGw: number;
  /** Average annual use as a share of contracted load. */
  loadFactor: number;
  /** Share of contracted load coincident with the system peak. */
  peakCoincidenceFactor: number;
  /** Share of coincident load that can be curtailed during scarcity. */
  flexibleLoadShare: number;
  /** Share of annual data-center energy backed by additive dedicated supply. */
  dedicatedGenerationShare: number;
  /** Firm-capacity credit of the dedicated supply portfolio. */
  dedicatedCapacityCredit: number;
  /** Shared firm capacity actually completed for the incremental load. */
  sharedFirmBuildGw: number;
  /** Share of shared generation capex assigned to the data-center customer. */
  generationCostResponsibility: number;
  /** Share of network-upgrade capex assigned to the data-center customer. */
  networkCostResponsibility: number;
  /** Share of assigned utility capex protected by take-or-pay commitments. */
  takeOrPayCoverage: number;
  /** Fraction of contracted load that ultimately materializes. */
  expectedLoadRealization: number;
  generationCapexPerKw: number;
  networkCapexPerKw: number;
  /** Annual revenue requirement as a share of installed capital. */
  fixedChargeRate: number;
  nonDataCenterRetailSalesTwh: number;
  nonDataCenterRetailRatePerMwh: number;
  gridEmissionsKgPerMwh: number;
  dedicatedEmissionsKgPerMwh: number;
  hoursPerYear: number;
}

export interface DataCenterGridResult {
  scenario: DataCenterGridScenario;
  realizedAverageLoadGw: number;
  annualElectricityTwh: number;
  coincidentPeakGw: number;
  flexiblePeakGw: number;
  dedicatedFirmCapacityGw: number;
  sharedFirmCapacityRequiredGw: number;
  sharedFirmCapacityBuiltGw: number;
  reliabilityGapGw: number;
  dedicatedGenerationCapexBillion: number;
  sharedGenerationCapexBillion: number;
  networkCapexBillion: number;
  totalIncrementalCapexBillion: number;
  developerAssignedCapexBillion: number;
  ratepayerAssignedCapexBillion: number;
  strandedRiskShiftBillion: number;
  annualRatepayerRevenueRequirementBillion: number;
  nonDataCenterBillImpact: number;
  dedicatedElectricityTwh: number;
  gridElectricityTwh: number;
  operationalEmissionsGtCo2: number;
}

function validateScenario(scenario: DataCenterGridScenario): void {
  assertFiniteDeep(scenario, 'data-center grid scenario');
  const fractions: Array<keyof DataCenterGridScenario> = [
    'loadFactor',
    'peakCoincidenceFactor',
    'flexibleLoadShare',
    'dedicatedGenerationShare',
    'dedicatedCapacityCredit',
    'generationCostResponsibility',
    'networkCostResponsibility',
    'takeOrPayCoverage',
    'expectedLoadRealization',
  ];
  const errors = [
    ...validateNumber(scenario.incrementalContractedLoadGw, 'incrementalContractedLoadGw', {
      min: 0,
    }),
    ...validateNumber(scenario.sharedFirmBuildGw, 'sharedFirmBuildGw', { min: 0 }),
    ...validateNumber(scenario.generationCapexPerKw, 'generationCapexPerKw', { min: 0 }),
    ...validateNumber(scenario.networkCapexPerKw, 'networkCapexPerKw', { min: 0 }),
    ...validateNumber(scenario.fixedChargeRate, 'fixedChargeRate', { min: 0, max: 1 }),
    ...validateNumber(scenario.nonDataCenterRetailSalesTwh, 'nonDataCenterRetailSalesTwh', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(scenario.nonDataCenterRetailRatePerMwh, 'nonDataCenterRetailRatePerMwh', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(scenario.gridEmissionsKgPerMwh, 'gridEmissionsKgPerMwh', { min: 0 }),
    ...validateNumber(scenario.dedicatedEmissionsKgPerMwh, 'dedicatedEmissionsKgPerMwh', {
      min: 0,
    }),
    ...validateNumber(scenario.hoursPerYear, 'hoursPerYear', { min: 0, exclusiveMin: true }),
  ];
  for (const key of fractions) {
    errors.push(
      ...validateNumber(scenario[key] as number, key, { min: 0, max: 1 }),
    );
  }
  if (errors.length > 0) {
    throw new Error(`Invalid data-center grid scenario:\n  ${errors.join('\n  ')}`);
  }
}

/**
 * First-order resource-adequacy and cost-allocation model for a large new
 * data-center load. It deliberately separates three claims that are often
 * blurred together: paying for energy, paying for network upgrades, and
 * protecting utility investments if contracted load never appears.
 */
export function simulateDataCenterGrid(
  scenario: DataCenterGridScenario,
): DataCenterGridResult {
  validateScenario(scenario);

  const realizedContractedLoadGw =
    scenario.incrementalContractedLoadGw * scenario.expectedLoadRealization;
  const realizedAverageLoadGw = realizedContractedLoadGw * scenario.loadFactor;
  const annualElectricityTwh =
    realizedAverageLoadGw * scenario.hoursPerYear / 1_000;
  const coincidentPeakGw =
    realizedContractedLoadGw * scenario.peakCoincidenceFactor;
  const flexiblePeakGw = coincidentPeakGw * scenario.flexibleLoadShare;
  const dedicatedNameplateGw =
    scenario.incrementalContractedLoadGw * scenario.dedicatedGenerationShare;
  const dedicatedFirmCapacityGw =
    dedicatedNameplateGw * scenario.dedicatedCapacityCredit;
  const sharedFirmCapacityRequiredGw = Math.max(
    0,
    coincidentPeakGw - flexiblePeakGw - dedicatedFirmCapacityGw,
  );
  const sharedFirmCapacityBuiltGw = Math.min(
    sharedFirmCapacityRequiredGw,
    scenario.sharedFirmBuildGw,
  );
  const reliabilityGapGw = Math.max(
    0,
    sharedFirmCapacityRequiredGw - sharedFirmCapacityBuiltGw,
  );

  // GW × $/kW / 1,000 = $ billions.
  const dedicatedGenerationCapexBillion =
    dedicatedNameplateGw * scenario.generationCapexPerKw / 1_000;
  const sharedGenerationCapexBillion =
    sharedFirmCapacityBuiltGw * scenario.generationCapexPerKw / 1_000;
  const networkCapexBillion =
    scenario.incrementalContractedLoadGw * scenario.networkCapexPerKw / 1_000;
  const totalIncrementalCapexBillion =
    dedicatedGenerationCapexBillion +
    sharedGenerationCapexBillion +
    networkCapexBillion;

  const assignedSharedGeneration =
    sharedGenerationCapexBillion * scenario.generationCostResponsibility;
  const assignedNetwork =
    networkCapexBillion * scenario.networkCostResponsibility;
  const utilityCapexAssignedToDeveloper = assignedSharedGeneration + assignedNetwork;
  const unassignedUtilityCapex =
    sharedGenerationCapexBillion + networkCapexBillion -
    utilityCapexAssignedToDeveloper;
  const strandedRiskShiftBillion =
    utilityCapexAssignedToDeveloper *
    (1 - scenario.expectedLoadRealization) *
    (1 - scenario.takeOrPayCoverage);
  const developerAssignedCapexBillion =
    dedicatedGenerationCapexBillion +
    utilityCapexAssignedToDeveloper -
    strandedRiskShiftBillion;
  const ratepayerAssignedCapexBillion =
    unassignedUtilityCapex + strandedRiskShiftBillion;
  const annualRatepayerRevenueRequirementBillion =
    ratepayerAssignedCapexBillion * scenario.fixedChargeRate;
  // TWh × $/MWh / 1,000 = $ billions.
  const nonDataCenterRetailRevenueBillion =
    scenario.nonDataCenterRetailSalesTwh *
    scenario.nonDataCenterRetailRatePerMwh /
    1_000;
  const nonDataCenterBillImpact =
    annualRatepayerRevenueRequirementBillion / nonDataCenterRetailRevenueBillion;

  const dedicatedElectricityTwh =
    annualElectricityTwh * scenario.dedicatedGenerationShare;
  const gridElectricityTwh = annualElectricityTwh - dedicatedElectricityTwh;
  // TWh × kg/MWh / 1,000,000 = Gt.
  const operationalEmissionsGtCo2 =
    (
      dedicatedElectricityTwh * scenario.dedicatedEmissionsKgPerMwh +
      gridElectricityTwh * scenario.gridEmissionsKgPerMwh
    ) / 1_000_000;

  const result: DataCenterGridResult = {
    scenario,
    realizedAverageLoadGw,
    annualElectricityTwh,
    coincidentPeakGw,
    flexiblePeakGw,
    dedicatedFirmCapacityGw,
    sharedFirmCapacityRequiredGw,
    sharedFirmCapacityBuiltGw,
    reliabilityGapGw,
    dedicatedGenerationCapexBillion,
    sharedGenerationCapexBillion,
    networkCapexBillion,
    totalIncrementalCapexBillion,
    developerAssignedCapexBillion,
    ratepayerAssignedCapexBillion,
    strandedRiskShiftBillion,
    annualRatepayerRevenueRequirementBillion,
    nonDataCenterBillImpact,
    dedicatedElectricityTwh,
    gridElectricityTwh,
    operationalEmissionsGtCo2,
  };
  assertFiniteDeep(result, 'data-center grid result');
  return result;
}

const common2035: Omit<
  DataCenterGridScenario,
  | 'id'
  | 'label'
  | 'flexibleLoadShare'
  | 'dedicatedGenerationShare'
  | 'generationCostResponsibility'
  | 'networkCostResponsibility'
  | 'takeOrPayCoverage'
  | 'dedicatedEmissionsKgPerMwh'
  | 'sharedFirmBuildGw'
> = {
  // BloombergNEF's headline 194 GW in 2035 less its earlier 35 GW operating
  // base. A 60% fleet-wide utilization factor approximately reconciles that
  // capacity figure with both LBNL's 176 TWh 2023 estimate and BNEF's new
  // claim that data centers reach 20% of 2035 U.S. electricity. This is a
  // scenario anchor, not an independently observed project queue.
  incrementalContractedLoadGw: 194 - 35,
  loadFactor: 0.60,
  peakCoincidenceFactor: 0.95,
  dedicatedCapacityCredit: 0.90,
  expectedLoadRealization: 1,
  generationCapexPerKw: 1_800,
  networkCapexPerKw: 600,
  fixedChargeRate: 0.10,
  // If 194 GW at 60% utilization is 20% of 2035 electricity, all other
  // customers consume four times that amount.
  nonDataCenterRetailSalesTwh: 194 * 0.60 * 8_760 / 1_000 * 4,
  nonDataCenterRetailRatePerMwh: 150,
  gridEmissionsKgPerMwh: 350,
  hoursPerYear: 8_760,
};

export const dataCenterGridScenarios: Readonly<Record<string, DataCenterGridScenario>> = {
  socialized: {
    ...common2035,
    id: 'socialized',
    label: 'Shared grid build with socialized capital cost',
    flexibleLoadShare: 0.05,
    dedicatedGenerationShare: 0,
    sharedFirmBuildGw: 120,
    generationCostResponsibility: 0,
    networkCostResponsibility: 0,
    takeOrPayCoverage: 0,
    dedicatedEmissionsKgPerMwh: 0,
  },
  'generation-only': {
    ...common2035,
    id: 'generation-only',
    label: 'Dedicated generation, but network costs remain shared',
    flexibleLoadShare: 0.05,
    dedicatedGenerationShare: 1,
    sharedFirmBuildGw: 10,
    generationCostResponsibility: 1,
    networkCostResponsibility: 0,
    takeOrPayCoverage: 0,
    dedicatedEmissionsKgPerMwh: 400,
  },
  'full-pledge-gas': {
    ...common2035,
    id: 'full-pledge-gas',
    label: 'Full cost responsibility with gas-heavy dedicated power',
    flexibleLoadShare: 0.05,
    dedicatedGenerationShare: 1,
    sharedFirmBuildGw: 10,
    generationCostResponsibility: 1,
    networkCostResponsibility: 1,
    takeOrPayCoverage: 1,
    dedicatedEmissionsKgPerMwh: 400,
  },
  'full-pledge-clean-flex': {
    ...common2035,
    id: 'full-pledge-clean-flex',
    label: 'Full cost responsibility, clean supply, and flexible compute',
    flexibleLoadShare: 0.25,
    dedicatedGenerationShare: 1,
    sharedFirmBuildGw: 0,
    generationCostResponsibility: 1,
    networkCostResponsibility: 1,
    takeOrPayCoverage: 1,
    dedicatedEmissionsKgPerMwh: 50,
  },
};

export const dataCenterGridEvidence = {
  bnef2035CapacityGw: 194,
  bnef2035ElectricityShare: 0.20,
  illustrativeCurrentCapacityGw: 35,
  reconciledFleetLoadFactor: 0.60,
  lbnl2023ElectricityTwh: 176,
  lbnl2028RangeTwh: [325, 580] as const,
  sources: {
    bnef2035:
      'https://www.latitudemedia.com/news/bnef-nearly-doubled-its-forecast-for-us-data-center-power-demand/',
    lbnl:
      'https://eta.lbl.gov/news/berkeley-lab-report-evaluates-increase-electricity-demand-data-centers',
    doeRates:
      'https://www.energy.gov/policy/articles/electricity-rate-designs-large-loads-evolving-practices-and-opportunities',
    ferc:
      'https://www.ferc.gov/news-events/news/ferc-launches-aggressive-targeted-action-speed-large-load-integration',
    pledge:
      'https://www.whitehouse.gov/releases/2026/03/ratepayer-protection-pledge/',
    flexibility: 'https://dcflex.epri.com/demonstrations',
  },
} as const;

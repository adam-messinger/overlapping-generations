import type { MaterialNode } from './data.js';
import { simulateDynamicNetwork, type DynamicNetworkResult } from './dynamic-network.js';
import {
  defensePolicies,
  defenseSourcingDefaults,
  type DefensePolicyId,
  type DefenseSourcingParams,
} from './defense-sourcing-data.js';

const defenseMagnetNetwork: readonly MaterialNode[] = [
  {
    id: 'rare-earths',
    label: 'Compliant magnet rare-earth material',
    kind: 'material',
    inputs: [],
    inventoryMonths: 0,
    finalDemandWeight: 0,
  },
  {
    id: 'magnets',
    label: 'Qualified permanent magnets',
    kind: 'component',
    inputs: [{
      from: 'rare-earths',
      costShare: 0.38,
      critical: true,
      maxSubstitution: 0.05,
      substitutionRampMonths: 24,
    }],
    inventoryMonths: 0.75,
    finalDemandWeight: 0,
  },
  {
    id: 'defense-systems',
    label: 'Magnet-dependent defense systems',
    kind: 'final',
    inputs: [{
      from: 'magnets',
      costShare: 0.02,
      critical: true,
      maxSubstitution: 0.02,
      substitutionRampMonths: 36,
    }],
    inventoryMonths: 0.5,
    finalDemandWeight: 1,
  },
];

export interface DefenseSourcingMonth {
  month: number;
  calendarYear: number;
  calendarMonth: number;
  physicalCompliantCapacity: number;
  qualifiedCompliantCapacity: number;
  waiverAllowance: number;
  waiverSupplyUsed: number;
  stockpileRemaining: number;
  usableInputSupply: number;
  compliantShareOfInput: number;
  procurementCostIndex: number;
  defenseOutput: number;
}

export interface DefenseSourcingResult {
  policy: DefensePolicyId;
  params: DefenseSourcingParams;
  months: readonly DefenseSourcingMonth[];
  network: DynamicNetworkResult;
  firstCurtailmentMonth: number | null;
  minimumDefenseOutput: number;
  outputMonthsLost: number;
  monthsBelow95Pct: number;
  waiverSupplyMonths: number;
  stockpileDepletionMonth: number | null;
  endingQualifiedCapacity: number;
  averageProcurementCostIndex: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function mergeParams(
  policy: DefensePolicyId,
  overrides: Partial<DefenseSourcingParams>,
): DefenseSourcingParams {
  const policyOverrides = defensePolicies[policy];
  return {
    ...defenseSourcingDefaults,
    ...policyOverrides,
    ...overrides,
    projects: overrides.projects ?? policyOverrides.projects ?? defenseSourcingDefaults.projects,
    waiverPath: overrides.waiverPath ?? policyOverrides.waiverPath ?? defenseSourcingDefaults.waiverPath,
  };
}

function calendarAt(month: number): { year: number; month: number } {
  const offset = 6 + month; // month zero = July 2026
  return { year: 2026 + Math.floor(offset / 12), month: offset % 12 + 1 };
}

/**
 * Simulate physical commissioning, qualification, waiver use, and a central
 * specification-matched stockpile. The resulting usable-input path is then
 * propagated through a fixed-proportion magnet → defense-system network.
 */
export function simulateDefenseSourcing(
  policy: DefensePolicyId,
  overrides: Partial<DefenseSourcingParams> = {},
): DefenseSourcingResult {
  const params = mergeParams(policy, overrides);
  let stockpile = params.stockpileMonths;
  let stockpileDepletionMonth: number | null = null;
  const sourcingRows: Omit<DefenseSourcingMonth, 'defenseOutput'>[] = [];
  const supplyPath: number[] = [];

  for (let month = 0; month < params.months; month++) {
    let physicalCompliantCapacity =
      params.initialQualifiedCapacity + params.initialPhysicalUnqualifiedCapacity;
    let qualifiedCompliantCapacity = params.initialQualifiedCapacity;
    if (month >= Math.round(
      params.initialUnqualifiedQualificationMonths * params.qualificationTimeMultiplier,
    )) {
      qualifiedCompliantCapacity += params.initialPhysicalUnqualifiedCapacity;
    }

    for (const project of params.projects) {
      const commissionMonth = Math.round(project.commissionMonth * params.projectTimeMultiplier);
      if (month >= commissionMonth) physicalCompliantCapacity += project.capacity;
      const qualifyMonth = commissionMonth + Math.round(
        project.qualificationMonths * params.qualificationTimeMultiplier,
      );
      if (month >= qualifyMonth) qualifiedCompliantCapacity += project.capacity;
    }
    physicalCompliantCapacity = clamp(physicalCompliantCapacity, 0, 1.5);
    qualifiedCompliantCapacity = clamp(qualifiedCompliantCapacity, 0, physicalCompliantCapacity);

    const waiverAllowance = clamp(
      params.waiverPath[month] ?? params.waiverPath[params.waiverPath.length - 1] ?? 0,
      0,
      1,
    );
    const compliantSupply = Math.min(1, qualifiedCompliantCapacity);
    const waiverSupplyUsed = Math.min(
      1 - compliantSupply,
      (1 - compliantSupply) * waiverAllowance,
    );
    let usableInputSupply = compliantSupply + waiverSupplyUsed;
    const preDrawStockpile = stockpile;
    if (usableInputSupply < 1 && stockpile > 0) {
      const draw = Math.min(stockpile, 1 - usableInputSupply);
      stockpile -= draw;
      usableInputSupply += draw;
    }
    if (stockpileDepletionMonth === null && preDrawStockpile > 0 && stockpile <= 1e-9) {
      stockpileDepletionMonth = month;
    }
    const compliantShareOfInput = usableInputSupply > 0
      ? Math.min(1, (compliantSupply + (preDrawStockpile - stockpile)) / usableInputSupply)
      : 0;
    const shortage = Math.max(0, 1 - usableInputSupply);
    const procurementCostIndex =
      1 + params.compliantCostPremium * compliantSupply +
      params.emergencySpotPremium * shortage;
    const date = calendarAt(month);
    sourcingRows.push({
      month,
      calendarYear: date.year,
      calendarMonth: date.month,
      physicalCompliantCapacity,
      qualifiedCompliantCapacity,
      waiverAllowance,
      waiverSupplyUsed,
      stockpileRemaining: stockpile,
      usableInputSupply,
      compliantShareOfInput,
      procurementCostIndex,
    });
    supplyPath.push(usableInputSupply);
  }

  const network = simulateDynamicNetwork(defenseMagnetNetwork, {
    months: params.months,
    supplyPaths: { 'rare-earths': supplyPath },
    revision: 'v3',
    inventoryMultiplier: 1,
    substitutionMultiplier: 1,
    priceElasticity: 2.75,
    pricePassThrough: 0.85,
    curtailmentNodeId: 'defense-systems',
    curtailmentThreshold: 0.95,
  });
  const months: DefenseSourcingMonth[] = sourcingRows.map((row, index) => ({
    ...row,
    defenseOutput: network.months[index].outputRatios['defense-systems'] ?? 1,
  }));
  const outputs = months.map((row) => row.defenseOutput);
  return {
    policy,
    params,
    months,
    network,
    firstCurtailmentMonth: network.firstCurtailmentMonth,
    minimumDefenseOutput: Math.min(...outputs),
    outputMonthsLost: outputs.reduce((sum, output) => sum + Math.max(0, 1 - output), 0),
    monthsBelow95Pct: outputs.filter((output) => output < 0.95).length,
    waiverSupplyMonths: months.filter((row) => row.waiverSupplyUsed > 1e-9).length,
    stockpileDepletionMonth,
    endingQualifiedCapacity: months[months.length - 1].qualifiedCompliantCapacity,
    averageProcurementCostIndex:
      months.reduce((sum, row) => sum + row.procurementCostIndex, 0) / months.length,
  };
}

export interface DefenseSensitivityRow {
  initialQualifiedCapacity: number;
  qualificationMonths: number;
  outputMonthsLost: number;
  minimumDefenseOutput: number;
}

export function defenseQualificationSensitivity(
  policy: DefensePolicyId,
): readonly DefenseSensitivityRow[] {
  const rows: DefenseSensitivityRow[] = [];
  for (const initialQualifiedCapacity of [0.25, 0.35, 0.50]) {
    for (const qualificationMonths of [6, 12, 18]) {
      const projects = defenseSourcingDefaults.projects.map((project) => ({
        ...project,
        qualificationMonths,
      }));
      const result = simulateDefenseSourcing(policy, {
        initialQualifiedCapacity,
        projects,
      });
      rows.push({
        initialQualifiedCapacity,
        qualificationMonths,
        outputMonthsLost: result.outputMonthsLost,
        minimumDefenseOutput: result.minimumDefenseOutput,
      });
    }
  }
  return rows;
}

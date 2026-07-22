import {
  genericSterileCostShares,
  type CisplatinBackcastParams,
  type GenericDrugEconomicsScenario,
} from './data.js';
import { assertFiniteDeep, validateNumber } from 'tsimulation';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const ramp = (monthsSinceStart: number, timeConstantMonths: number): number =>
  monthsSinceStart < 0 ? 0 : 1 - Math.exp(-monthsSinceStart / timeConstantMonths);

export interface CisplatinBackcastMonth {
  month: number;
  primarySupply: number;
  otherIncumbentSupply: number;
  emergencyImportSupply: number;
  nationalVolumeIndex: number;
  centersReportingShortage: number;
  estimatedDoseServiceLevel: number;
}

export interface CisplatinBackcastResult {
  params: CisplatinBackcastParams;
  months: readonly CisplatinBackcastMonth[];
}

/**
 * Reconstruct the 2023 cisplatin shock. National volume and local access are
 * separate: new suppliers can lift aggregate releases while hospital ordering
 * channels remain misallocated and patients are switched to alternatives.
 */
export function simulateCisplatinBackcast(
  params: CisplatinBackcastParams,
): CisplatinBackcastResult {
  assertFiniteDeep(params, 'cisplatin backcast params');
  const errors = [
    ...validateNumber(params.months, 'months', { integer: true, min: 1 }),
    ...validateNumber(params.primaryShare, 'primaryShare', { min: 0, max: 1 }),
    ...validateNumber(params.primaryRemainingOutput, 'primaryRemainingOutput', { min: 0 }),
    ...validateNumber(params.otherBaselineShare, 'otherBaselineShare', { min: 0 }),
    ...validateNumber(params.otherSurgeCapacity, 'otherSurgeCapacity', { min: 0 }),
    ...validateNumber(params.otherSurgeRampMonths, 'otherSurgeRampMonths', { min: 0, exclusiveMin: true }),
    ...validateNumber(params.emergencyImportCapacity, 'emergencyImportCapacity', { min: 0 }),
    ...validateNumber(params.emergencyImportStartMonth, 'emergencyImportStartMonth', { min: 0 }),
    ...validateNumber(params.emergencyImportRampMonths, 'emergencyImportRampMonths', { min: 0, exclusiveMin: true }),
    ...validateNumber(params.allocationMismatchInitial, 'allocationMismatchInitial', { min: 0, max: 1 }),
    ...validateNumber(params.allocationMismatchDecay, 'allocationMismatchDecay', { min: 0 }),
    ...validateNumber(params.accessFrictionDoseElasticity, 'accessFrictionDoseElasticity', { min: 0, max: 1 }),
  ];
  if (errors.length > 0) throw new Error(`Invalid cisplatin backcast params:\n  ${errors.join('\n  ')}`);
  const months: CisplatinBackcastMonth[] = [];
  for (let month = 0; month < params.months; month++) {
    const primarySupply = params.primaryShare * params.primaryRemainingOutput;
    const otherIncumbentSupply = params.otherBaselineShare + params.otherSurgeCapacity *
      ramp(month, params.otherSurgeRampMonths);
    const emergencyImportSupply = params.emergencyImportCapacity * ramp(
      month - params.emergencyImportStartMonth,
      params.emergencyImportRampMonths,
    );
    const nationalVolumeIndex = primarySupply + otherIncumbentSupply + emergencyImportSupply;
    const centersReportingShortage = clamp(
      params.allocationMismatchInitial * Math.exp(-params.allocationMismatchDecay * month),
      0,
      1,
    );
    const nationalSupplyFactor = Math.min(1, nationalVolumeIndex);
    const estimatedDoseServiceLevel = nationalSupplyFactor *
      (1 - params.accessFrictionDoseElasticity * centersReportingShortage);
    months.push({
      month,
      primarySupply,
      otherIncumbentSupply,
      emergencyImportSupply,
      nationalVolumeIndex,
      centersReportingShortage,
      estimatedDoseServiceLevel,
    });
  }
  const result = { params, months };
  assertFiniteDeep(result, 'cisplatin backcast result');
  return result;
}

export interface GenericDrugEconomicsMonth {
  month: number;
  rawMaterialCostMultiplier: number;
  allowedPriceMultiplier: number;
  economicCostIndex: number;
  operatingMargin: number;
  targetUtilization: number;
  actualUtilization: number;
  releasedSupply: number;
  beginningInventory: number;
  endingInventory: number;
  serviceLevel: number;
}

export interface GenericDrugEconomicsResult {
  scenario: GenericDrugEconomicsScenario;
  months: readonly GenericDrugEconomicsMonth[];
  firstShortageMonth: number | null;
  monthsBelow98Pct: number;
  minimumServiceLevel: number;
  cumulativeDoseShortfall: number;
  endingInventoryMonths: number;
  averagePaidPriceMultiplier: number;
  averageOperatingMargin: number;
}

function economicCostIndex(rawMaterialCostMultiplier: number): number {
  return genericSterileCostShares.platinumOrApi * rawMaterialCostMultiplier +
    genericSterileCostShares.conversionAndFillFinish +
    genericSterileCostShares.qualityAndCompliance +
    genericSterileCostShares.overhead;
}

function utilizationSupportedByMargin(operatingMargin: number): number {
  // At an 8% margin the installed line is roughly three-quarters utilized.
  // Sustained negative margins cause exit; healthy margins fund overtime,
  // maintenance, and additional batches up to rated-capacity constraints.
  return clamp(0.75 + 2 * (operatingMargin - 0.08), 0.35, 1.08);
}

export function simulateGenericDrugEconomics(
  scenario: GenericDrugEconomicsScenario,
): GenericDrugEconomicsResult {
  assertFiniteDeep(scenario, 'generic drug scenario');
  const errors = [
    ...validateNumber(scenario.months, 'months', { integer: true, min: 1 }),
    ...validateNumber(scenario.ratedCapacity, 'ratedCapacity', { min: 0, exclusiveMin: true }),
    ...validateNumber(scenario.initialUtilization, 'initialUtilization', { min: 0, max: 1.5 }),
    ...validateNumber(scenario.initialInventoryMonths, 'initialInventoryMonths', { min: 0 }),
    ...validateNumber(scenario.targetInventoryMonths, 'targetInventoryMonths', { min: 0 }),
    ...validateNumber(scenario.rawMaterialCostMultiplier, 'rawMaterialCostMultiplier', { min: 0, exclusiveMin: true }),
    ...validateNumber(scenario.laterRawMaterialCostMultiplier, 'laterRawMaterialCostMultiplier', { min: 0, exclusiveMin: true }),
    ...validateNumber(scenario.rawMaterialReliefMonth, 'rawMaterialReliefMonth', { min: 0 }),
    ...validateNumber(scenario.priceMultiplier, 'priceMultiplier', { min: 0, exclusiveMin: true }),
    ...validateNumber(scenario.priceChangeDelayMonths, 'priceChangeDelayMonths', { min: 0 }),
    ...validateNumber(scenario.demandMultiplier, 'demandMultiplier', { min: 0, exclusiveMin: true }),
    ...validateNumber(scenario.qualityAvailability, 'qualityAvailability', { min: 0, max: 1 }),
    ...validateNumber(scenario.adjustmentHalfLifeMonths, 'adjustmentHalfLifeMonths', { min: 0, exclusiveMin: true }),
    ...validateNumber(scenario.resiliencePayment, 'resiliencePayment', { min: 0 }),
  ];
  if (errors.length > 0) throw new Error(`Invalid generic drug scenario:\n  ${errors.join('\n  ')}`);
  let utilization = scenario.initialUtilization;
  let inventory = scenario.initialInventoryMonths;
  const months: GenericDrugEconomicsMonth[] = [];
  const adjustmentRate = 1 - Math.exp(-Math.log(2) / scenario.adjustmentHalfLifeMonths);

  for (let month = 0; month < scenario.months; month++) {
    const rawMaterialCostMultiplier = month < scenario.rawMaterialReliefMonth
      ? scenario.rawMaterialCostMultiplier
      : scenario.laterRawMaterialCostMultiplier;
    const allowedPriceMultiplier = month < scenario.priceChangeDelayMonths
      ? 1
      : scenario.priceMultiplier;
    const effectiveRevenue = allowedPriceMultiplier + scenario.resiliencePayment;
    const cost = economicCostIndex(rawMaterialCostMultiplier);
    const operatingMargin = (effectiveRevenue - cost) / effectiveRevenue;
    const targetUtilization = utilizationSupportedByMargin(operatingMargin);
    utilization += (targetUtilization - utilization) * adjustmentRate;
    const releasedSupply = scenario.ratedCapacity * utilization * scenario.qualityAvailability;
    const beginningInventory = inventory;
    const available = releasedSupply + inventory;
    const serviceLevel = Math.min(1, available / scenario.demandMultiplier);
    inventory = clamp(
      available - serviceLevel * scenario.demandMultiplier,
      0,
      scenario.targetInventoryMonths * scenario.demandMultiplier,
    );
    months.push({
      month,
      rawMaterialCostMultiplier,
      allowedPriceMultiplier,
      economicCostIndex: cost,
      operatingMargin,
      targetUtilization,
      actualUtilization: utilization,
      releasedSupply,
      beginningInventory,
      endingInventory: inventory,
      serviceLevel,
    });
  }

  const firstShortage = months.find((row) => row.serviceLevel < 0.98);
  const result: GenericDrugEconomicsResult = {
    scenario,
    months,
    firstShortageMonth: firstShortage?.month ?? null,
    monthsBelow98Pct: months.filter((row) => row.serviceLevel < 0.98).length,
    minimumServiceLevel: Math.min(...months.map((row) => row.serviceLevel)),
    cumulativeDoseShortfall: months.reduce(
      (sum, row) => sum + Math.max(0, 1 - row.serviceLevel) * scenario.demandMultiplier,
      0,
    ),
    endingInventoryMonths: inventory / scenario.demandMultiplier,
    averagePaidPriceMultiplier: months.reduce(
      (sum, row) => sum + row.allowedPriceMultiplier,
      0,
    ) / months.length,
    averageOperatingMargin: months.reduce((sum, row) => sum + row.operatingMargin, 0) /
      months.length,
  };
  assertFiniteDeep(result, 'generic drug result');
  return result;
}

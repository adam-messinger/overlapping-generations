import {
  tradeSectors,
  type BilateralTariffAction,
  type TradeSectorId,
} from './data.js';
import { assertFiniteDeep, solveLinearSystem, validateNumber } from 'tsimulation';

const US_NOMINAL_GDP_BILLION = 31_000;

export interface TariffSectorResult {
  sector: TradeSectorId;
  affectedImportsBillion: number;
  deliveredTariffPriceIncrease: number;
  affectedImportQuantityDecline: number;
  directSectorCostShock: number;
  totalSectorPriceChange: number;
  displacedImportsBillion: number;
}

export interface BilateralTariffResult {
  action: BilateralTariffAction;
  scope: 'actual' | 'naive-headline';
  retaliation: boolean;
  coveredShareOfPartnerImports: number;
  effectiveAverageTariffIncrease: number;
  weightedAffectedImportQuantityDecline: number;
  tariffRevenueBillion: number;
  domesticReplacementBillion: number;
  usConsumerPriceChange: number;
  directConsumerPriceChange: number;
  ioPriceAmplification: number;
  usRealGdpChange: number;
  partnerRealGdpChange: number;
  partnerExportRevenueLossBillion: number;
  sectors: readonly TariffSectorResult[];
}

/**
 * Static first-year bilateral tariff model. `naive-headline` deliberately
 * applies the announced rate to every import from the partner; it is retained
 * as the failed V1 against which the product-scope revision can be audited.
 */
export function simulateBilateralTariff(
  action: BilateralTariffAction,
  options: { scope?: 'actual' | 'naive-headline'; retaliation?: boolean } = {},
): BilateralTariffResult {
  assertFiniteDeep(action, 'tariff action');
  const errors = [
    ...validateNumber(action.nominalTariff, 'nominalTariff', { min: 0 }),
    ...validateNumber(action.affectedImportsBillion, 'affectedImportsBillion', { min: 0 }),
    ...validateNumber(action.totalImportsBillion, 'totalImportsBillion', { min: 0, exclusiveMin: true }),
    ...validateNumber(action.partnerExportsToUsShareOfGdp, 'partnerExportsToUsShareOfGdp', { min: 0, max: 1 }),
    ...validateNumber(action.tradeDiversionShare, 'tradeDiversionShare', { min: 0, max: 1 }),
    ...validateNumber(action.partnerInputOutputMultiplier, 'partnerInputOutputMultiplier', { min: 0 }),
    ...validateNumber(action.domesticRecaptureShare, 'domesticRecaptureShare', { min: 0, max: 1 }),
    ...validateNumber(action.domesticValueAddedShare, 'domesticValueAddedShare', { min: 0, max: 1 }),
  ];
  if (action.affectedImportsBillion > action.totalImportsBillion) {
    errors.push('affectedImportsBillion must not exceed totalImportsBillion');
  }
  for (const [sector, allocation] of Object.entries(action.affectedImportAllocation)) {
    if (!tradeSectors.some((candidate) => candidate.id === sector)) {
      errors.push(`Unknown tariff allocation sector '${sector}'`);
    }
    errors.push(...validateNumber(allocation, `affectedImportAllocation.${sector}`, { min: 0, max: 1 }));
  }
  if (errors.length > 0) throw new Error(`Invalid tariff action:\n  ${errors.join('\n  ')}`);
  const scope = options.scope ?? 'actual';
  const retaliation = options.retaliation ?? false;
  const affectedTotal = scope === 'actual'
    ? action.affectedImportsBillion
    : action.totalImportsBillion;
  const allocationTotal = Object.values(action.affectedImportAllocation).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  if (Math.abs(allocationTotal - 1) > 1e-9) throw new Error('Tariff-sector allocation must sum to one');

  const directShocks = new Map<TradeSectorId, number>();
  const intermediate: Omit<TariffSectorResult, 'totalSectorPriceChange'>[] = [];
  let displacedImports = 0;
  let survivingImports = 0;
  let weightedQuantityDecline = 0;

  for (const sector of tradeSectors) {
    const affectedImportsBillion = affectedTotal *
      (action.affectedImportAllocation[sector.id] ?? 0);
    const deliveredTariffPriceIncrease = affectedImportsBillion > 0
      ? action.nominalTariff * sector.tariffPassThrough
      : 0;
    const remainingQuantity = Math.pow(1 + deliveredTariffPriceIncrease, -sector.tradeElasticity);
    const affectedImportQuantityDecline = 1 - remainingQuantity;
    const directSectorCostShock = sector.usAbsorptionBillion > 0
      ? affectedImportsBillion / sector.usAbsorptionBillion * deliveredTariffPriceIncrease
      : 0;
    const displaced = affectedImportsBillion * affectedImportQuantityDecline;
    directShocks.set(sector.id, directSectorCostShock);
    displacedImports += displaced;
    survivingImports += affectedImportsBillion - displaced;
    weightedQuantityDecline += affectedImportsBillion * affectedImportQuantityDecline;
    intermediate.push({
      sector: sector.id,
      affectedImportsBillion,
      deliveredTariffPriceIncrease,
      affectedImportQuantityDecline,
      directSectorCostShock,
      displacedImportsBillion: displaced,
    });
  }

  const position = new Map(tradeSectors.map((sector, index) => [sector.id, index]));
  const matrix = tradeSectors.map(() => tradeSectors.map(() => 0));
  const rhs = tradeSectors.map((sector) => directShocks.get(sector.id) ?? 0);
  tradeSectors.forEach((recipient, row) => {
    matrix[row][row] = 1;
    for (const [supplierId, coefficient] of Object.entries(recipient.inputs)) {
      const column = position.get(supplierId as TradeSectorId);
      if (column !== undefined) matrix[row][column] -= coefficient ?? 0;
    }
  });
  const prices = solveLinearSystem(matrix, rhs).solution;
  const sectors: TariffSectorResult[] = intermediate.map((row, index) => ({
    ...row,
    totalSectorPriceChange: prices[index],
  }));
  const directConsumerPriceChange = tradeSectors.reduce(
    (sum, sector, index) => sum + sector.finalConsumptionWeight * rhs[index],
    0,
  );
  const usConsumerPriceChange = tradeSectors.reduce(
    (sum, sector, index) => sum + sector.finalConsumptionWeight * prices[index],
    0,
  );
  const downstreamOutputLoss = tradeSectors.reduce(
    (sum, sector, index) => sum + sector.usValueAddedShare *
      sector.tradeElasticity * 0.35 * prices[index],
    0,
  );
  const domesticReplacementBillion = displacedImports * action.domesticRecaptureShare;
  const protectedValueAddedGain = domesticReplacementBillion *
    action.domesticValueAddedShare / US_NOMINAL_GDP_BILLION;
  const deadweightLoss = 0.5 * action.nominalTariff * displacedImports /
    US_NOMINAL_GDP_BILLION;
  const retaliationQuantityDecline = retaliation
    ? weightedQuantityDecline / Math.max(affectedTotal, 1e-12)
    : 0;
  const retaliationExportLoss = retaliation
    ? affectedTotal * retaliationQuantityDecline * action.domesticValueAddedShare * 1.2 /
      US_NOMINAL_GDP_BILLION
    : 0;
  const usRealGdpChange = protectedValueAddedGain - downstreamOutputLoss -
    deadweightLoss - retaliationExportLoss;

  const coveredShareOfPartnerImports = affectedTotal / action.totalImportsBillion;
  const averageQuantityDecline = weightedQuantityDecline / Math.max(affectedTotal, 1e-12);
  const partnerExportRevenueLossBillion = displacedImports *
    (1 - action.tradeDiversionShare);
  const partnerRealGdpChange = -action.partnerExportsToUsShareOfGdp *
    coveredShareOfPartnerImports * averageQuantityDecline *
    (1 - action.tradeDiversionShare) * action.partnerInputOutputMultiplier;

  const result: BilateralTariffResult = {
    action,
    scope,
    retaliation,
    coveredShareOfPartnerImports,
    effectiveAverageTariffIncrease: action.nominalTariff * coveredShareOfPartnerImports,
    weightedAffectedImportQuantityDecline: averageQuantityDecline,
    tariffRevenueBillion: survivingImports * action.nominalTariff,
    domesticReplacementBillion,
    usConsumerPriceChange,
    directConsumerPriceChange,
    ioPriceAmplification: directConsumerPriceChange > 0
      ? usConsumerPriceChange / directConsumerPriceChange
      : 1,
    usRealGdpChange,
    partnerRealGdpChange,
    partnerExportRevenueLossBillion,
    sectors,
  };
  assertFiniteDeep(result, 'tariff result');
  return result;
}

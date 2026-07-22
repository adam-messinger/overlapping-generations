import { tariffEvidence } from './data.js';

export interface TariffCalibrationAudit {
  aluminumPassThrough: number;
  aluminumTradeElasticity: number;
  steelTradeElasticity: number;
  v1SteelQuantityDecline: number;
  observedSteelQuantityDecline: number;
  v1SteelAbsoluteError: number;
  downstreamLossExceedsProtectedGain: boolean;
}

/**
 * V1 fit one substitution elasticity to aluminum. It badly overpredicted the
 * steel response. V2 therefore retains sector-specific elasticities, with the
 * integrated-material benchmark inferred independently from steel.
 */
export function auditTariffCalibration(): TariffCalibrationAudit {
  const e = tariffEvidence.usitc2018;
  const aluminumPassThrough = e.aluminumDeliveredPriceIncrease / e.aluminumTariff;
  const aluminumTradeElasticity = -Math.log(1 - e.aluminumImportQuantityDecline) /
    Math.log(1 + e.aluminumDeliveredPriceIncrease);
  const steelTradeElasticity = -Math.log(1 - e.steelImportQuantityDecline) /
    Math.log(1 + e.steelDeliveredPriceIncrease);
  const v1SteelQuantityDecline = 1 - Math.pow(
    1 + e.steelDeliveredPriceIncrease,
    -aluminumTradeElasticity,
  );
  return {
    aluminumPassThrough,
    aluminumTradeElasticity,
    steelTradeElasticity,
    v1SteelQuantityDecline,
    observedSteelQuantityDecline: e.steelImportQuantityDecline,
    v1SteelAbsoluteError: Math.abs(v1SteelQuantityDecline - e.steelImportQuantityDecline),
    downstreamLossExceedsProtectedGain:
      e.downstreamOutputLossBillion2021 > e.protectedOutputGainBillion2021,
  };
}

import {
  cisplatinBackcastDefaults,
  drugSupplyEvidence,
  genericDrugEconomicsScenarios,
  type CisplatinBackcastParams,
} from './data.js';
import { simulateCisplatinBackcast, simulateGenericDrugEconomics } from './model.js';

export interface CisplatinCalibration {
  params: CisplatinBackcastParams;
  q3NationalVolumeIndex: number;
  juneCenterShortage: number;
  septemberCenterShortage: number;
  predictedJuneUtilizationDecline: number;
  observedUtilizationDecline: number;
}

/**
 * Three transparent fits:
 *  - surge capacity to the Q3 national volume index;
 *  - initial allocation mismatch and its decay to June/September surveys.
 * The dose-utilization elasticity remains fixed, making its 15% comparison a
 * small holdout rather than a fourth fitted target.
 */
export function calibrateCisplatin2023(): CisplatinCalibration {
  const q3Month = 9;
  const juneMonth = 6;
  const septemberMonth = 9;
  const evidence = drugSupplyEvidence.cisplatin2023;
  const mismatchDecay = Math.log(
    evidence.centersReportingShortageJune / evidence.centersReportingShortageSeptember,
  ) / (septemberMonth - juneMonth);
  const mismatchInitial = evidence.centersReportingShortageJune *
    Math.exp(mismatchDecay * juneMonth);
  const primary = cisplatinBackcastDefaults.primaryShare *
    cisplatinBackcastDefaults.primaryRemainingOutput;
  const importRamp = 1 - Math.exp(
    -(q3Month - cisplatinBackcastDefaults.emergencyImportStartMonth) /
      cisplatinBackcastDefaults.emergencyImportRampMonths,
  );
  const importAtQ3 = cisplatinBackcastDefaults.emergencyImportCapacity * importRamp;
  const otherRamp = 1 - Math.exp(-q3Month / cisplatinBackcastDefaults.otherSurgeRampMonths);
  const otherSurgeCapacity = (
    evidence.nationalVolumeIndexQ3 - primary -
    cisplatinBackcastDefaults.otherBaselineShare - importAtQ3
  ) / otherRamp;
  const params: CisplatinBackcastParams = {
    ...cisplatinBackcastDefaults,
    otherSurgeCapacity,
    allocationMismatchInitial: mismatchInitial,
    allocationMismatchDecay: mismatchDecay,
  };
  const result = simulateCisplatinBackcast(params);
  return {
    params,
    q3NationalVolumeIndex: result.months[q3Month].nationalVolumeIndex,
    juneCenterShortage: result.months[juneMonth].centersReportingShortage,
    septemberCenterShortage: result.months[septemberMonth].centersReportingShortage,
    predictedJuneUtilizationDecline: 1 - result.months[juneMonth].estimatedDoseServiceLevel,
    observedUtilizationDecline: evidence.headAndNeckUtilizationDecline,
  };
}

export const calibratedCisplatinBackcast = calibrateCisplatin2023();

export interface DrugPriceSensitivityRow {
  rawMaterialCostMultiplier: number;
  priceRelief: number;
  minimumServiceLevel: number;
  cumulativeDoseShortfall: number;
}

export function drugPriceReliefSensitivity(): readonly DrugPriceSensitivityRow[] {
  return [1.5, 1.8, 2.1].flatMap((rawMaterialCostMultiplier) =>
    [0, 0.25, 0.40, 0.50, 0.60].map((priceRelief) => {
      const result = simulateGenericDrugEconomics({
        ...genericDrugEconomicsScenarios['50pct-relief'],
        id: `raw-${rawMaterialCostMultiplier}-relief-${priceRelief}`,
        rawMaterialCostMultiplier,
        laterRawMaterialCostMultiplier: Math.max(1.2, rawMaterialCostMultiplier - 0.3),
        priceMultiplier: 1 + priceRelief,
      });
      return {
        rawMaterialCostMultiplier,
        priceRelief,
        minimumServiceLevel: result.minimumServiceLevel,
        cumulativeDoseShortfall: result.cumulativeDoseShortfall,
      };
    }),
  );
}

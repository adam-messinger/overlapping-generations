/** Empirical anchors and transparent scenarios for low-margin sterile generics. */

export const drugSupplyEvidence = {
  cisplatin2023: {
    intasPreShockVolumeShare: 0.51,
    intasVolumeDecline: 0.72,
    nationalVolumeIndexQ3: 1.23,
    centersReportingShortageJune: 0.70,
    centersReportingShortageSeptember: 0.59,
    headAndNeckUtilizationDecline: 0.15,
  },
  india2026: {
    cisplatinOldPriceRupeesPerMl: 7.26,
    cisplatinNewPriceRupeesPerMl: 10.89,
    carboplatinOldPriceRupeesPerMl: 60.49,
    carboplatinNewPriceRupeesPerMl: 90.74,
  },
  usp2025: {
    sterileInjectableShareOfActiveShortages: 0.71,
    medianShortageYears: 5,
    discontinuationIncrease: 0.60,
  },
  sources: {
    cisplatinVolumes: 'https://academyhealth.confex.com/academyhealth/2025arm/meetingapp.cgi/Paper/70656',
    cancerCenterSurveys: 'https://ascopost.com/news/october-2023/chemotherapy-shortages-ongoing-according-to-new-survey/',
    utilization: 'https://www.healthday.com/health-pro-news/cancer/2023-cisplatin-shortage-tied-to-use-of-alternatives-for-head-neck-cancer',
    indiaPriceRelief: 'https://www.reuters.com/business/healthcare-pharmaceuticals/india-raises-price-cap-cancer-drugs-tackle-shortage-2026-06-12/',
    usp2025: 'https://www.usp.org/news/long-lasting-drug-shortages-drive-average-duration-higher-disrupting-patient-care',
    fdaRootCauses: 'https://www.fda.gov/drugs/drug-shortages/report-drug-shortages-root-causes-and-potential-solutions',
  },
} as const;

export interface CisplatinBackcastParams {
  months: number;
  primaryShare: number;
  primaryRemainingOutput: number;
  otherBaselineShare: number;
  otherSurgeCapacity: number;
  otherSurgeRampMonths: number;
  emergencyImportCapacity: number;
  emergencyImportStartMonth: number;
  emergencyImportRampMonths: number;
  allocationMismatchInitial: number;
  allocationMismatchDecay: number;
  /** Maps widespread ordering friction into actual dose utilization. */
  accessFrictionDoseElasticity: number;
}

export const cisplatinBackcastDefaults: CisplatinBackcastParams = {
  months: 15,
  primaryShare: drugSupplyEvidence.cisplatin2023.intasPreShockVolumeShare,
  primaryRemainingOutput: 1 - drugSupplyEvidence.cisplatin2023.intasVolumeDecline,
  otherBaselineShare: 1 - drugSupplyEvidence.cisplatin2023.intasPreShockVolumeShare,
  otherSurgeCapacity: 0.45,
  otherSurgeRampMonths: 3,
  emergencyImportCapacity: 0.20,
  emergencyImportStartMonth: 5,
  emergencyImportRampMonths: 2,
  allocationMismatchInitial: 0.98,
  allocationMismatchDecay: 0.057,
  accessFrictionDoseElasticity: 0.20,
};

export interface GenericDrugEconomicsScenario {
  id: string;
  label: string;
  months: number;
  ratedCapacity: number;
  initialUtilization: number;
  initialInventoryMonths: number;
  targetInventoryMonths: number;
  rawMaterialCostMultiplier: number;
  laterRawMaterialCostMultiplier: number;
  rawMaterialReliefMonth: number;
  priceMultiplier: number;
  priceChangeDelayMonths: number;
  demandMultiplier: number;
  qualityAvailability: number;
  adjustmentHalfLifeMonths: number;
  /** Extra guaranteed demand or reliability payment as a fraction of price. */
  resiliencePayment: number;
}

const economicsBase: Omit<GenericDrugEconomicsScenario, 'id' | 'label' | 'priceMultiplier'> = {
  months: 24,
  ratedCapacity: 1.10,
  initialUtilization: 0.72,
  initialInventoryMonths: 0.75,
  targetInventoryMonths: 2,
  rawMaterialCostMultiplier: 1.80,
  laterRawMaterialCostMultiplier: 1.50,
  rawMaterialReliefMonth: 12,
  priceChangeDelayMonths: 1,
  demandMultiplier: 1,
  qualityAvailability: 0.98,
  adjustmentHalfLifeMonths: 3,
  resiliencePayment: 0,
};

export const genericDrugEconomicsScenarios: Record<string, GenericDrugEconomicsScenario> = {
  'frozen-cap': {
    ...economicsBase,
    id: 'frozen-cap',
    label: 'Price cap remains frozen',
    priceMultiplier: 1,
  },
  '25pct-relief': {
    ...economicsBase,
    id: '25pct-relief',
    label: '25% ceiling-price relief',
    priceMultiplier: 1.25,
  },
  '50pct-relief': {
    ...economicsBase,
    id: '50pct-relief',
    label: 'Enacted 50% ceiling-price relief',
    priceMultiplier: 1.50,
  },
  '50pct-resilience': {
    ...economicsBase,
    id: '50pct-resilience',
    label: '50% relief plus reliability procurement',
    priceMultiplier: 1.50,
    resiliencePayment: 0.06,
    initialInventoryMonths: 1.5,
    targetInventoryMonths: 3,
    adjustmentHalfLifeMonths: 2.25,
  },
};

/** Cost shares at the old controlled price; baseline economic cost is 0.92. */
export const genericSterileCostShares = {
  platinumOrApi: 0.28,
  conversionAndFillFinish: 0.32,
  qualityAndCompliance: 0.20,
  overhead: 0.12,
} as const;

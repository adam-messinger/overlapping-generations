/**
 * Acute heat-event inputs.
 *
 * This is deliberately an event model rather than a replacement for a
 * distributed-lag epidemiological model.  The observed anchors are kept next
 * to the assumptions so that scenario inputs are not mistaken for measured
 * quantities.
 */

export const HEAT_AGE_GROUPS = ['under65', 'age65to79', 'age80plus'] as const;
export type HeatAgeGroup = (typeof HEAT_AGE_GROUPS)[number];

export interface HeatEvent {
  id: string;
  label: string;
  populationMillions: number;
  ageShares: Record<HeatAgeGroup, number>;
  heatDays: number;
  meanDayMaximumC: number;
  meanNightMinimumC: number;
  compoundHotNightShare: number;
  urbanHeatIslandC: number;
  humidityRiskMultiplier: number;
  mortalityDayThresholdC: number;
  mortalityNightThresholdC: number;
  /** Fraction of each day represented by exposure above the crop threshold. */
  cropHotHoursShare: number;
  cropThresholdC: number;
  /** Fraction of annual crop output in an exposed crop and sensitive stage. */
  cropSensitiveOutputShare: number;
  baseNonCoolingPeakGw: number;
  firmPowerCapacityGw: number;
}

export interface HeatAdaptation {
  id: string;
  label: string;
  /** Existing housing, health-system, and behavioral adaptation. */
  structuralMortalityRiskReduction: number;
  warningCoverage: number;
  warningMortalityEfficacy: number;
  outreachCoverage: Record<HeatAgeGroup, number>;
  outreachMortalityEfficacy: number;
  coolingAccess: Record<HeatAgeGroup, number>;
  coolingMortalityEfficacy: number;
  mechanicalGridUptime: number;
  passiveCoolingC: number;
  coolingEfficiencyMultiplier: number;
  demandResponseShare: number;
  additionalFirmCapacityGw: number;
  irrigatedCropShare: number;
  irrigationDamageReduction: number;
  cropHeatToleranceC: number;
}

export const heatEvidence = {
  france2026ObservedExcessDeaths: 5_764,
  europe2022MortalityPerMillion: {
    under65: 16,
    age65to79: 160,
    age80plus: 1_684,
  } satisfies Record<HeatAgeGroup, number>,
  europe2023NoAdaptationMortalityIncrease: 0.80,
  europeMidcenturyAcElectricityTwh: 34,
  maizeLossPerExtremeDegreeDay: 0.0067,
  sources: {
    france2026: 'https://apnews.com/article/france-heatwave-extra-deaths-health-agency-dff2ed624e0cdad02f836d30ae3e878f',
    europe2022: 'https://www.nature.com/articles/s41591-023-02419-z',
    europe2023Adaptation: 'https://www.nature.com/articles/s41591-024-03186-1',
    compoundHeat: 'https://www.nature.com/articles/s41467-025-62871-y',
    airConditioning: 'https://www.nature.com/articles/s41598-023-31469-z',
    cropResponse: 'https://www.nature.com/articles/nclimate1832',
  },
} as const;

/**
 * France-wide first-order representation of the 17 June–2 July 2026 event.
 * Temperatures are scenario averages over the affected population, not a
 * claim that every French weather station recorded the same values.
 */
export const france2026HeatEvent: HeatEvent = {
  id: 'france-2026',
  label: 'France June–July 2026 heat episode',
  populationMillions: 68.6,
  ageShares: {
    under65: 0.78,
    age65to79: 0.155,
    age80plus: 0.065,
  },
  heatDays: 16,
  meanDayMaximumC: 37.0,
  meanNightMinimumC: 23.0,
  compoundHotNightShare: 0.75,
  urbanHeatIslandC: 0.8,
  humidityRiskMultiplier: 1.08,
  mortalityDayThresholdC: 30,
  mortalityNightThresholdC: 20,
  cropHotHoursShare: 0.32,
  cropThresholdC: 29,
  cropSensitiveOutputShare: 0.32,
  baseNonCoolingPeakGw: 48,
  firmPowerCapacityGw: 58,
};

const noCoverage: Record<HeatAgeGroup, number> = {
  under65: 0,
  age65to79: 0,
  age80plus: 0,
};

export const heatAdaptationPackages: Record<string, HeatAdaptation> = {
  none: {
    id: 'none',
    label: 'No present-day adaptation',
    structuralMortalityRiskReduction: 0,
    warningCoverage: 0,
    warningMortalityEfficacy: 0,
    outreachCoverage: { ...noCoverage },
    outreachMortalityEfficacy: 0,
    coolingAccess: { ...noCoverage },
    coolingMortalityEfficacy: 0.55,
    mechanicalGridUptime: 0.995,
    passiveCoolingC: 0,
    coolingEfficiencyMultiplier: 1,
    demandResponseShare: 0,
    additionalFirmCapacityGw: 0,
    irrigatedCropShare: 0,
    irrigationDamageReduction: 0,
    cropHeatToleranceC: 0,
  },
  current: {
    id: 'current',
    label: 'Approximate current French adaptation',
    structuralMortalityRiskReduction: 0.20,
    warningCoverage: 0.85,
    warningMortalityEfficacy: 0.10,
    outreachCoverage: { under65: 0.10, age65to79: 0.35, age80plus: 0.45 },
    outreachMortalityEfficacy: 0.25,
    coolingAccess: { under65: 0.18, age65to79: 0.22, age80plus: 0.20 },
    coolingMortalityEfficacy: 0.55,
    mechanicalGridUptime: 0.995,
    passiveCoolingC: 0.25,
    coolingEfficiencyMultiplier: 0.95,
    demandResponseShare: 0.05,
    additionalFirmCapacityGw: 0,
    irrigatedCropShare: 0.12,
    irrigationDamageReduction: 0.55,
    cropHeatToleranceC: 0.15,
  },
  outreach: {
    id: 'outreach',
    label: 'Current system plus warnings and older-adult outreach',
    structuralMortalityRiskReduction: 0.20,
    warningCoverage: 0.95,
    warningMortalityEfficacy: 0.18,
    outreachCoverage: { under65: 0.25, age65to79: 0.65, age80plus: 0.80 },
    outreachMortalityEfficacy: 0.35,
    coolingAccess: { under65: 0.18, age65to79: 0.22, age80plus: 0.20 },
    coolingMortalityEfficacy: 0.55,
    mechanicalGridUptime: 0.995,
    passiveCoolingC: 0.25,
    coolingEfficiencyMultiplier: 0.95,
    demandResponseShare: 0.05,
    additionalFirmCapacityGw: 0,
    irrigatedCropShare: 0.12,
    irrigationDamageReduction: 0.55,
    cropHeatToleranceC: 0.15,
  },
  'targeted-cooling': {
    id: 'targeted-cooling',
    label: 'Targeted cooling without a major grid buildout',
    structuralMortalityRiskReduction: 0.20,
    warningCoverage: 0.90,
    warningMortalityEfficacy: 0.12,
    outreachCoverage: { under65: 0.15, age65to79: 0.50, age80plus: 0.65 },
    outreachMortalityEfficacy: 0.30,
    coolingAccess: { under65: 0.22, age65to79: 0.65, age80plus: 0.80 },
    coolingMortalityEfficacy: 0.55,
    mechanicalGridUptime: 0.995,
    passiveCoolingC: 0.35,
    coolingEfficiencyMultiplier: 0.90,
    demandResponseShare: 0.10,
    additionalFirmCapacityGw: 0,
    irrigatedCropShare: 0.12,
    irrigationDamageReduction: 0.55,
    cropHeatToleranceC: 0.15,
  },
  'passive-food': {
    id: 'passive-food',
    label: 'Cool surfaces, shade, and irrigation',
    structuralMortalityRiskReduction: 0.20,
    warningCoverage: 0.85,
    warningMortalityEfficacy: 0.10,
    outreachCoverage: { under65: 0.10, age65to79: 0.35, age80plus: 0.45 },
    outreachMortalityEfficacy: 0.25,
    coolingAccess: { under65: 0.18, age65to79: 0.22, age80plus: 0.20 },
    coolingMortalityEfficacy: 0.55,
    mechanicalGridUptime: 0.995,
    passiveCoolingC: 1.10,
    coolingEfficiencyMultiplier: 0.90,
    demandResponseShare: 0.10,
    additionalFirmCapacityGw: 0,
    irrigatedCropShare: 0.50,
    irrigationDamageReduction: 0.65,
    cropHeatToleranceC: 0.65,
  },
  combined: {
    id: 'combined',
    label: 'Targeted cooling plus passive, food, and grid resilience',
    structuralMortalityRiskReduction: 0.25,
    warningCoverage: 0.97,
    warningMortalityEfficacy: 0.18,
    outreachCoverage: { under65: 0.30, age65to79: 0.75, age80plus: 0.90 },
    outreachMortalityEfficacy: 0.38,
    coolingAccess: { under65: 0.25, age65to79: 0.70, age80plus: 0.85 },
    coolingMortalityEfficacy: 0.58,
    mechanicalGridUptime: 0.998,
    passiveCoolingC: 1.25,
    coolingEfficiencyMultiplier: 0.70,
    demandResponseShare: 0.30,
    additionalFirmCapacityGw: 4,
    irrigatedCropShare: 0.60,
    irrigationDamageReduction: 0.65,
    cropHeatToleranceC: 0.75,
  },
};

export const france2035HotterEvent: HeatEvent = {
  ...france2026HeatEvent,
  id: 'france-2035-hotter',
  label: 'Illustrative older and hotter France in 2035',
  ageShares: {
    under65: 0.755,
    age65to79: 0.16,
    age80plus: 0.085,
  },
  meanDayMaximumC: france2026HeatEvent.meanDayMaximumC + 1.3,
  meanNightMinimumC: france2026HeatEvent.meanNightMinimumC + 1.5,
  baseNonCoolingPeakGw: 49.5,
};

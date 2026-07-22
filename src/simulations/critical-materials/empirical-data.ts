export type EmpiricalMaterialId =
  | 'cobalt'
  | 'copper'
  | 'gallium'
  | 'graphite'
  | 'lithium'
  | 'nickel'
  | 'rare-earths';

export interface EmpiricalMaterialProfile {
  id: EmpiricalMaterialId;
  label: string;
  productionStage: string;
  productionUnit: 'metric tons' | 'thousand metric tons' | 'kilograms';
  worldProduction2025: number;
  dominantProducer: string;
  dominantProduction2025: number;
  /** Largest producer divided by the comparable world total. */
  dominantProducerShare: number;
  usNetImportReliance: number;
  importRelianceQualifier: 'estimate' | 'lower-bound';
  usConsumption2025: number | null;
  usIndustryStocks2025: number | null;
  /** Stocks / annual consumption * 12, when both are published and comparable. */
  observedInventoryMonths: number | null;
  caveat: string;
}

/**
 * Frozen 2025 observations from USGS Mineral Commodity Summaries 2026.
 * https://doi.org/10.5066/P1WKQ63T
 *
 * Stages are deliberately not homogenized: refined copper is more relevant to
 * manufacturing than copper ore, while the other public rows are mine or
 * primary-production series. The stage field prevents accidental comparison as
 * though these were a single global refinery table.
 */
export const empiricalMaterialProfiles: readonly EmpiricalMaterialProfile[] = [
  {
    id: 'cobalt',
    label: 'Cobalt',
    productionStage: 'mine production',
    productionUnit: 'metric tons',
    worldProduction2025: 310_000,
    dominantProducer: 'Congo (Kinshasa)',
    dominantProduction2025: 230_000,
    dominantProducerShare: 230_000 / 310_000,
    usNetImportReliance: 0.79,
    importRelianceQualifier: 'estimate',
    usConsumption2025: 9_600,
    usIndustryStocks2025: 1_500,
    observedInventoryMonths: (1_500 / 9_600) * 12,
    caveat: 'Stocks include U.S. consumers and processors, not traders or investment holdings.',
  },
  {
    id: 'copper',
    label: 'Refined copper',
    productionStage: 'refinery production',
    productionUnit: 'thousand metric tons',
    worldProduction2025: 29_000,
    dominantProducer: 'China',
    dominantProduction2025: 14_000,
    dominantProducerShare: 14_000 / 29_000,
    usNetImportReliance: 0.57,
    importRelianceQualifier: 'estimate',
    usConsumption2025: 2_200,
    usIndustryStocks2025: 450,
    observedInventoryMonths: (450 / 2_200) * 12,
    caveat: 'Stocks combine U.S. producers, consumers, and metal exchanges.',
  },
  {
    id: 'gallium',
    label: 'Low-purity primary gallium',
    productionStage: 'primary low-purity production',
    productionUnit: 'kilograms',
    worldProduction2025: 909_000,
    dominantProducer: 'China',
    dominantProduction2025: 900_000,
    dominantProducerShare: 900_000 / 909_000,
    usNetImportReliance: 1,
    importRelianceQualifier: 'estimate',
    usConsumption2025: 19_000,
    usIndustryStocks2025: 3_400,
    observedInventoryMonths: (3_400 / 19_000) * 12,
    caveat: 'The 909,000 kg denominator sums country rows; USGS rounds the displayed world total to 900,000 kg.',
  },
  {
    id: 'graphite',
    label: 'Natural graphite',
    productionStage: 'mine production',
    productionUnit: 'metric tons',
    worldProduction2025: 1_800_000,
    dominantProducer: 'China',
    dominantProduction2025: 1_400_000,
    dominantProducerShare: 1_400_000 / 1_800_000,
    usNetImportReliance: 1,
    importRelianceQualifier: 'estimate',
    usConsumption2025: 71_000,
    usIndustryStocks2025: null,
    observedInventoryMonths: null,
    caveat: 'Mine production is not interchangeable with battery-grade spherical graphite.',
  },
  {
    id: 'lithium',
    label: 'Lithium',
    productionStage: 'mine production, lithium content',
    productionUnit: 'metric tons',
    worldProduction2025: 290_000,
    dominantProducer: 'Australia',
    dominantProduction2025: 92_000,
    dominantProducerShare: 92_000 / 290_000,
    usNetImportReliance: 0.5,
    importRelianceQualifier: 'lower-bound',
    usConsumption2025: null,
    usIndustryStocks2025: null,
    observedInventoryMonths: null,
    caveat: 'USGS withholds U.S. production/consumption and reports net import reliance only as greater than 50%.',
  },
  {
    id: 'nickel',
    label: 'Nickel',
    productionStage: 'mine production',
    productionUnit: 'metric tons',
    worldProduction2025: 3_900_000,
    dominantProducer: 'Indonesia',
    dominantProduction2025: 2_600_000,
    dominantProducerShare: 2_600_000 / 3_900_000,
    usNetImportReliance: 0.41,
    importRelianceQualifier: 'estimate',
    usConsumption2025: 220_000,
    usIndustryStocks2025: 25_000,
    observedInventoryMonths: (25_000 / 220_000) * 12,
    caveat: 'Consumption includes scrap; excluding scrap, USGS says primary nickel import reliance is nearly 100%.',
  },
  {
    id: 'rare-earths',
    label: 'Rare-earth oxides',
    productionStage: 'mine production, REO equivalent',
    productionUnit: 'metric tons',
    worldProduction2025: 390_000,
    dominantProducer: 'China',
    dominantProduction2025: 270_000,
    dominantProducerShare: 270_000 / 390_000,
    usNetImportReliance: 0.67,
    importRelianceQualifier: 'estimate',
    usConsumption2025: 27_000,
    usIndustryStocks2025: null,
    observedInventoryMonths: null,
    caveat: 'Broad mine output materially understates concentration in separated magnet rare earths and finished magnets.',
  },
];

export const empiricalMaterialById: Readonly<Record<EmpiricalMaterialId, EmpiricalMaterialProfile>> =
  Object.fromEntries(empiricalMaterialProfiles.map((profile) => [profile.id, profile])) as
    Record<EmpiricalMaterialId, EmpiricalMaterialProfile>;

export interface PhysicalRecipeRow {
  material: EmpiricalMaterialId | 'manganese';
  kilogramsPerVehicle: number;
}

/**
 * IEA 2021 chart for an entire electric car with a 75 kWh NMC-622 cathode and
 * graphite anode. Steel and aluminium are excluded. This is one technology
 * recipe, not an invariant recipe for all EVs.
 * https://www.iea.org/data-and-statistics/charts/minerals-used-in-electric-cars-compared-to-conventional-cars
 */
export const ieaNmc622ElectricCarRecipe: readonly PhysicalRecipeRow[] = [
  { material: 'copper', kilogramsPerVehicle: 53.2 },
  { material: 'lithium', kilogramsPerVehicle: 8.9 },
  { material: 'nickel', kilogramsPerVehicle: 39.9 },
  { material: 'manganese', kilogramsPerVehicle: 24.5 },
  { material: 'cobalt', kilogramsPerVehicle: 13.3 },
  { material: 'graphite', kilogramsPerVehicle: 66.3 },
  { material: 'rare-earths', kilogramsPerVehicle: 0.5 },
];

export interface TargetRange {
  min: number;
  max: number;
}

export interface HistoricalDisruptionEvent {
  id: string;
  label: string;
  fitSet: 'development' | 'holdout';
  source: EmpiricalMaterialId | 'semiconductors';
  directInputCostShare: number;
  /** Available input relative to normal monthly use; month zero is pre-shock. */
  supplyPath: readonly number[];
  /** Observable or explicit prior available at the event start. */
  grossInventoryMonths: number;
  maximumTechnicalSubstitution: number;
  /** True only when null means an observed absence rather than missing data. */
  observedNoBroadCurtailment?: boolean;
  observed: {
    firstCurtailmentMonth: TargetRange | null;
    troughOutputLoss: TargetRange | null;
    recoveryMonth: TargetRange | null;
    peakInputPriceMultiple: TargetRange | null;
  };
  evidence: string;
  measurementCaveat: string;
}

/**
 * Five frozen event envelopes. Ranges acknowledge incompatible products,
 * revisions, seasonal adjustment, and narrative rather than plant-level data.
 * Supply paths are pre-event descriptors, not observations fitted from the
 * downstream output target.
 */
export const historicalDisruptionEvents: readonly HistoricalDisruptionEvent[] = [
  {
    id: 'rare-earth-quotas-2010',
    label: '2010 Chinese rare-earth quota cut',
    fitSet: 'development',
    source: 'rare-earths',
    directInputCostShare: 0.015,
    supplyPath: [1, 0.6, 0.6, 0.6, 0.7, 0.8, 0.9, 1, 1, 1, 1, 1, 1],
    grossInventoryMonths: 1.5,
    maximumTechnicalSubstitution: 0.1,
    observed: {
      firstCurtailmentMonth: null,
      troughOutputLoss: null,
      recoveryMonth: null,
      peakInputPriceMultiple: { min: 5, max: 15 },
    },
    evidence: 'USGS reports second-half quota 64% below the first half, 2010 exports down 40%, and most prices peaking in mid-2011.',
    measurementCaveat: 'No comparable national downstream-output attribution is available; only price timing/magnitude is scored.',
  },
  {
    id: 'tohoku-components-2011',
    label: '2011 Tohoku auto-component disruption',
    fitSet: 'development',
    source: 'semiconductors',
    directInputCostShare: 0.08,
    supplyPath: [1, 0.72, 0.94, 0.99, 1, 1, 1, 1],
    grossInventoryMonths: 0.5,
    maximumTechnicalSubstitution: 0.15,
    observed: {
      firstCurtailmentMonth: { min: 1, max: 1 },
      troughOutputLoss: { min: 0.04, max: 0.1 },
      recoveryMonth: { min: 2, max: 4 },
      peakInputPriceMultiple: null,
    },
    evidence: 'Federal Reserve G.17 motor-vehicle output fell about 7% in April versus the Jan–Mar 2011 mean; Beige Book contacts reported recovery during Q3.',
    measurementCaveat: 'The event window also contains demand and other supply changes; the range is an event outcome, not a causal estimate.',
  },
  {
    id: 'auto-chip-shortage-2021',
    label: '2021 auto semiconductor shortage',
    fitSet: 'development',
    source: 'semiconductors',
    directInputCostShare: 0.08,
    supplyPath: [1, 0.9, 0.84, 0.8, 0.82, 0.8, 0.83, 0.82, 0.76, 0.86, 0.92, 0.93, 0.93, 0.95, 1],
    grossInventoryMonths: 0.4,
    maximumTechnicalSubstitution: 0.08,
    observed: {
      firstCurtailmentMonth: { min: 1, max: 3 },
      troughOutputLoss: { min: 0.15, max: 0.3 },
      recoveryMonth: { min: 10, max: 15 },
      peakInputPriceMultiple: null,
    },
    evidence: 'The Federal Reserve documents widespread auto-plant shutdowns; current G.17 motor-vehicle series fall 27% from January to September and recover near the January level during late 2021/early 2022.',
    measurementCaveat: 'Pandemic demand, labor, logistics, and seasonal shutdowns confound a pure chip effect.',
  },
  {
    id: 'gallium-licensing-2023',
    label: '2023 gallium export licensing',
    fitSet: 'holdout',
    source: 'gallium',
    directInputCostShare: 0.03,
    supplyPath: [1, 0.75, 0.75, 0.85, 0.95, 1, 1],
    grossInventoryMonths: (3_400 / 19_000) * 12,
    maximumTechnicalSubstitution: 0.25,
    observedNoBroadCurtailment: true,
    observed: {
      firstCurtailmentMonth: null,
      troughOutputLoss: { min: 0, max: 0.03 },
      recoveryMonth: null,
      peakInputPriceMultiple: null,
    },
    evidence: 'Licensing began in August; USGS estimates Chinese net exports at about one-quarter of 2022 world supply. Fed semiconductor-component IP fell less than 2% through September and then rose.',
    measurementCaveat: 'Aggregate semiconductor IP can hide product-specific shortages; “no broad curtailment” is not “no firm was affected.”',
  },
  {
    id: 'rare-earth-controls-2025',
    label: '2025 heavy-rare-earth and magnet controls',
    fitSet: 'holdout',
    source: 'rare-earths',
    directInputCostShare: 0.015,
    supplyPath: [1, 0.45, 0.35, 0.55, 0.85, 1, 1, 1, 1],
    grossInventoryMonths: 0.75,
    maximumTechnicalSubstitution: 0.1,
    observed: {
      firstCurtailmentMonth: { min: 1, max: 2 },
      troughOutputLoss: null,
      recoveryMonth: { min: 3, max: 5 },
      peakInputPriceMultiple: { min: 5, max: 7 },
    },
    evidence: 'IEA reports sharp April/May export falls, auto utilisation cuts or temporary shutdowns, recovery in following months, and European prices up to six times Chinese prices.',
    measurementCaveat: 'IEA reports affected firms, not a representative global auto-output loss; trough magnitude is therefore not scored.',
  },
];

/** Current-vintage Federal Reserve G.17 rows used to audit three event targets. */
export const federalReserveEventWindows = {
  tohokuMotorVehicles: {
    baselineJanToMar2011: [73.6492, 78.9022, 82.8078] as const,
    aprilToJuly2011: [72.9986, 75.6772, 75.0892, 78.24] as const,
  },
  chipShortageMotorVehicles: {
    january2021: 110.5528,
    february2021ToMarch2022: [95.467, 97.7342, 89.6915, 92.8949, 90.2439, 94.5877, 91.9095, 81.1129, 97.3052, 104.3451, 104.4926, 101.2915, 97.5144, 108.1084] as const,
  },
  galliumSemiconductorComponents: {
    july2023: 136.6894,
    augustToDecember2023: [135.6233, 134.4233, 136.4045, 137.8263, 138.9374] as const,
  },
};

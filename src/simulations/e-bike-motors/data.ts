/**
 * Regional e-bike adoption, incumbent drive-unit shares, and entrant cases.
 *
 * Market boundaries matter unusually much here. China reports electric
 * bicycles that often resemble low-speed scooters, Europe reports 250 W
 * pedal-assist cycles, Japan reports factory shipments of tightly regulated
 * power-assist bicycles, and U.S. retail panels historically missed a large
 * direct-to-consumer channel. The model keeps those source boundaries visible
 * and treats cross-region totals as drive-unit equivalents, not identical
 * consumer products.
 */

export const EBIKE_REGIONS = ['us', 'eu', 'china', 'japan', 'row'] as const;
export type EbikeRegion = (typeof EBIKE_REGIONS)[number];

export const MOTOR_ARCHITECTURES = ['hub', 'mid-drive'] as const;
export type MotorArchitecture = (typeof MOTOR_ARCHITECTURES)[number];

export const INCUMBENT_MOTOR_SUPPLIERS = [
  'bosch',
  'shimano',
  'bafang',
  'ananda',
  'yamaha-brose',
  'panasonic',
  'avinox',
  'other-china',
  'other-premium',
] as const;
export type IncumbentMotorSupplier =
  (typeof INCUMBENT_MOTOR_SUPPLIERS)[number];

export const MOTOR_SUPPLIERS = [
  ...INCUMBENT_MOTOR_SUPPLIERS,
  'us-entrant',
] as const;
export type MotorSupplier = (typeof MOTOR_SUPPLIERS)[number];

export type SupplierVolumeBasis =
  | 'reported'
  | 'calibrated-to-report'
  | 'inferred'
  | 'residual';

export interface RegionalAdoptionParams {
  id: EbikeRegion;
  label: string;
  baseYear: number;
  populationMillions: number;
  annualPopulationGrowth: number;
  initialInstalledStock: number;
  baseAnnualSales: number;
  saturationStockPerThousandPeople: number;
  innovationRate: number;
  imitationRate: number;
  replacementYears: number;
  baseMidDriveShare: number;
  targetMidDriveShare: number;
  architectureTransitionRate: number;
  entrantOpenness: Record<MotorArchitecture, number>;
}

export interface SupplierDefinition {
  id: IncumbentMotorSupplier;
  label: string;
  volumeBasis: SupplierVolumeBasis;
  premiumDisplacementExposure: number;
  hubDisplacementExposure: number;
}

export interface EntrantStrategy {
  id: string;
  label: string;
  launchYear: number;
  architecture: MotorArchitecture;
  productScore: number;
  priceIndex: number;
  serviceScore: number;
  integrationScore: number;
  bankabilityScore: number;
  maxAddressableShare: number;
  shareAdjustmentRate: number;
  initialQualifiedOems: number;
  annualOemWins: number;
  matureUnitsPerOem: number;
  oemRampYears: number;
  initialAnnualCapacity: number;
  annualCapacityGrowth: number;
  maximumAnnualCapacity: number;
  averageSellingPriceDollars: number;
  initialVariableCostDollars: number;
  learningRatePerDoubling: number;
  learningReferenceUnits: number;
  warrantyRevenueShare: number;
  serviceLifeYears: number;
  annualServiceCostPerActiveUnitDollars: number;
  preLaunchAnnualResearchMillion: number;
  postLaunchAnnualResearchMillion: number;
  annualSalesAndServiceMillion: number;
  annualGeneralAdminMillion: number;
  engineeringMillionPerOemWin: number;
  capexDollarsPerAddedCapacity: number;
  discountRate: number;
  terminalGrowthRate: number;
}

export interface EbikeMotorScenario {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  regions: Record<EbikeRegion, RegionalAdoptionParams>;
  entrant: EntrantStrategy;
}

export interface RegionalSalesObservation {
  region: EbikeRegion;
  year: number;
  annualUnits: number;
  boundary:
    | 'retail-new-sales'
    | 'factory-shipments'
    | 'domestic-production'
    | 'derived-new-sales';
  role: 'development' | 'holdout' | 'diagnostic' | 'scenario';
  source: string;
  notes: string;
}

export interface SupplierDisclosure {
  supplier: IncumbentMotorSupplier;
  year: number;
  disclosedUnits: number;
  modeledComparableUnits: number;
  grossMargin: number | null;
  source: string;
  notes: string;
}

export const ebikeMotorEvidence = {
  sources: {
    usPeopleForBikes:
      'https://www.peopleforbikes.org/news/e-bike-market-bigger-than-numbers-show',
    euConebi2023:
      'https://www.conebi.eu/pr-conebi-bimp-2024/',
    euConebi2021:
      'https://www.conebi.eu/bicycle-and-e-bike-sales-continue-to-grow-reaching-record-levels/',
    euConebi2020:
      'https://www.conebi.eu/european-bicycle-industry-booming/',
    chinaGovernmentStock:
      'https://english.www.gov.cn/archive/statistics/202405/07/content_WS6639648fc6d0868f4e8e6cc3.html',
    japanDiet:
      'https://www.shugiin.go.jp/internet/itdb_kaigiroku.nsf/html/kaigiroku/000221320240412010.htm',
    bafangAnnualReport:
      'https://www.100est.com/res/financial-report/r2024/SH603489_202504291664591346.pdf',
    anandaAnnualReport:
      'https://pdf.dfcfw.com/pdf/H2_AN202504291664487398_1.pdf',
    anandaProspectus:
      'https://vip.stock.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=10299167&stockid=603350',
    boschPartnerPortal:
      'https://b2b.bosch-ebike.com/en/en/',
    boschAnnualReport2025:
      'https://assets.bosch.com/media/global/bosch_group/our_figures/pdf/bosch-annual-report-2025.pdf',
    avinoxOemPartners:
      'https://www.bike-eu.com/52682/power-with-purpose-the-independent-strategy-of-avinox',
    avinox2026Release:
      'https://www.prnewswire.com/news-releases/e-bike-innovator-avinox-powers-the-next-generation-of-electric-bikes-with-the-launch-of-the-avinox-m2s-and-avinox-m2-with-60-leading-bike-brands-302736477.html',
    yamahaBrose:
      'https://www.yamaha-motor.eu/mk/mk/news/2025/Yamaha_Motor_acquires_Brose-s_bicycle_eKit_business_unit/',
    yamaha2025Results:
      'https://global.yamaha-motor.com/news/2026/0213/result.html',
    ul2849:
      'https://www.ul.com/services/e-bikes-certificationevaluating-and-testing-ul-2849',
    bionxFailure:
      'https://bicycleretailer.com/industry-news/2018/06/26/foldaway-solutions-provide-replacement-bionx-batteries',
  },
  accessedAt: '2026-07-24',
} as const;

/**
 * Development and holdout anchors. The sparse series are deliberately not
 * padded with market-research point estimates that cannot be audited.
 */
export const regionalSalesHistory: readonly RegionalSalesObservation[] = [
  {
    region: 'eu',
    year: 2019,
    annualUnits: 3_400_000,
    boundary: 'retail-new-sales',
    role: 'development',
    source: ebikeMotorEvidence.sources.euConebi2020,
    notes: 'EU27 plus UK pedal-assist e-bike sales.',
  },
  {
    region: 'eu',
    year: 2020,
    annualUnits: 4_500_000,
    boundary: 'retail-new-sales',
    role: 'development',
    source: ebikeMotorEvidence.sources.euConebi2020,
    notes: 'EU27 plus UK pedal-assist e-bike sales during the pandemic boom.',
  },
  {
    region: 'eu',
    year: 2021,
    annualUnits: 5_000_000,
    boundary: 'retail-new-sales',
    role: 'development',
    source: ebikeMotorEvidence.sources.euConebi2021,
    notes: 'CONEBI reports sales topped five million; five million is used as the rounded anchor.',
  },
  {
    region: 'eu',
    year: 2022,
    annualUnits: 5_500_000,
    boundary: 'retail-new-sales',
    role: 'holdout',
    source: ebikeMotorEvidence.sources.euConebi2023,
    notes: 'Peak sell-through before the post-pandemic inventory correction.',
  },
  {
    region: 'eu',
    year: 2023,
    annualUnits: 5_100_000,
    boundary: 'retail-new-sales',
    role: 'holdout',
    source: ebikeMotorEvidence.sources.euConebi2023,
    notes: 'CONEBI retail-sales boundary.',
  },
  {
    region: 'japan',
    year: 2007,
    annualUnits: 250_000,
    boundary: 'factory-shipments',
    role: 'development',
    source: ebikeMotorEvidence.sources.japanDiet,
    notes: 'Rounded METI factory-shipment count cited in Diet testimony.',
  },
  {
    region: 'japan',
    year: 2012,
    annualUnits: 390_000,
    boundary: 'factory-shipments',
    role: 'development',
    source: ebikeMotorEvidence.sources.japanDiet,
    notes: 'Rounded METI factory-shipment count cited in Diet testimony.',
  },
  {
    region: 'japan',
    year: 2017,
    annualUnits: 620_000,
    boundary: 'factory-shipments',
    role: 'development',
    source: ebikeMotorEvidence.sources.japanDiet,
    notes: 'Rounded METI factory-shipment count cited in Diet testimony.',
  },
  {
    region: 'japan',
    year: 2022,
    annualUnits: 790_000,
    boundary: 'factory-shipments',
    role: 'holdout',
    source: ebikeMotorEvidence.sources.japanDiet,
    notes: 'Rounded METI factory-shipment count cited in Diet testimony.',
  },
  {
    region: 'china',
    year: 2023,
    annualUnits: 42_280_000,
    boundary: 'domestic-production',
    role: 'diagnostic',
    source: ebikeMotorEvidence.sources.chinaGovernmentStock,
    notes: 'Production, not retail sales; the model uses it as a same-year drive-unit-demand proxy.',
  },
  {
    region: 'us',
    year: 2024,
    annualUnits: 900_000,
    boundary: 'derived-new-sales',
    role: 'scenario',
    source: ebikeMotorEvidence.sources.usPeopleForBikes,
    notes: 'Approximately 450,000 newly measured DTC units roughly doubled known new-bike volume; excludes about 80,000 used transactions.',
  },
] as const;

export const supplierDisclosures: readonly SupplierDisclosure[] = [
  {
    supplier: 'bafang',
    year: 2024,
    disclosedUnits: 2_924_875,
    modeledComparableUnits: 2_924_875,
    grossMargin: 0.413,
    source: ebikeMotorEvidence.sources.bafangAnnualReport,
    notes: '857,442 hub motors, 167,839 mid-drives, and 1,899,594 integrated-wheel motors. The product mix crosses pedelec and Chinese electric-two-wheeler boundaries.',
  },
  {
    supplier: 'ananda',
    year: 2024,
    disclosedUnits: 6_784_464,
    modeledComparableUnits: 7_200_000,
    grossMargin: null,
    source: ebikeMotorEvidence.sources.anandaAnnualReport,
    notes: 'Known direct-hub estimate plus 206,600 reported mid-drives; modeled comparable total includes geared hubs. The prospectus reports roughly 9% direct-hub versus much higher mid-drive gross margins.',
  },
] as const;

export const supplierDefinitions: Record<
  IncumbentMotorSupplier,
  SupplierDefinition
> = {
  bosch: {
    id: 'bosch',
    label: 'Bosch eBike Systems',
    volumeBasis: 'inferred',
    premiumDisplacementExposure: 1,
    hubDisplacementExposure: 0.05,
  },
  shimano: {
    id: 'shimano',
    label: 'Shimano STEPS',
    volumeBasis: 'inferred',
    premiumDisplacementExposure: 1,
    hubDisplacementExposure: 0.05,
  },
  bafang: {
    id: 'bafang',
    label: 'Bafang',
    volumeBasis: 'calibrated-to-report',
    premiumDisplacementExposure: 0.55,
    hubDisplacementExposure: 1,
  },
  ananda: {
    id: 'ananda',
    label: 'Ananda',
    volumeBasis: 'calibrated-to-report',
    premiumDisplacementExposure: 0.35,
    hubDisplacementExposure: 1,
  },
  'yamaha-brose': {
    id: 'yamaha-brose',
    label: 'Yamaha / Brose',
    volumeBasis: 'inferred',
    premiumDisplacementExposure: 1,
    hubDisplacementExposure: 0.1,
  },
  panasonic: {
    id: 'panasonic',
    label: 'Panasonic',
    volumeBasis: 'inferred',
    premiumDisplacementExposure: 0.9,
    hubDisplacementExposure: 0.1,
  },
  avinox: {
    id: 'avinox',
    label: 'Avinox (launched with DJI)',
    volumeBasis: 'inferred',
    premiumDisplacementExposure: 1,
    hubDisplacementExposure: 0,
  },
  'other-china': {
    id: 'other-china',
    label: 'Other Chinese / in-house',
    volumeBasis: 'residual',
    premiumDisplacementExposure: 0.15,
    hubDisplacementExposure: 1,
  },
  'other-premium': {
    id: 'other-premium',
    label: 'Other premium systems',
    volumeBasis: 'residual',
    premiumDisplacementExposure: 1,
    hubDisplacementExposure: 0.2,
  },
};

/** Shares are inferred except where calibrated to reported Bafang/Ananda totals. */
export const supplierShares2024: Record<
  EbikeRegion,
  Record<IncumbentMotorSupplier, number>
> = {
  us: {
    bosch: 0.10,
    shimano: 0.05,
    bafang: 0.20,
    ananda: 0.08,
    'yamaha-brose': 0.04,
    panasonic: 0.02,
    avinox: 0,
    'other-china': 0.40,
    'other-premium': 0.11,
  },
  eu: {
    bosch: 0.45,
    shimano: 0.16,
    bafang: 0.10,
    ananda: 0.04,
    'yamaha-brose': 0.09,
    panasonic: 0.02,
    avinox: 0.005,
    'other-china': 0.075,
    'other-premium': 0.06,
  },
  china: {
    bosch: 0,
    shimano: 0,
    bafang: 0.025,
    ananda: 0.16,
    'yamaha-brose': 0.005,
    panasonic: 0.005,
    avinox: 0.001,
    'other-china': 0.775,
    'other-premium': 0.029,
  },
  japan: {
    bosch: 0.02,
    shimano: 0.04,
    bafang: 0.01,
    ananda: 0,
    'yamaha-brose': 0.38,
    panasonic: 0.45,
    avinox: 0,
    'other-china': 0.02,
    'other-premium': 0.08,
  },
  row: {
    bosch: 0.06,
    shimano: 0.04,
    bafang: 0.25,
    ananda: 0.04,
    'yamaha-brose': 0.05,
    panasonic: 0.03,
    avinox: 0.002,
    'other-china': 0.46,
    'other-premium': 0.068,
  },
};

/**
 * A transparent 2040 competitive-share scenario. Avinox gains in premium
 * systems; Yamaha absorbs Brose; commodity Chinese supply remains fragmented.
 */
export const supplierShares2040: Record<
  EbikeRegion,
  Record<IncumbentMotorSupplier, number>
> = {
  us: {
    bosch: 0.11,
    shimano: 0.05,
    bafang: 0.15,
    ananda: 0.07,
    'yamaha-brose': 0.04,
    panasonic: 0.015,
    avinox: 0.05,
    'other-china': 0.35,
    'other-premium': 0.165,
  },
  eu: {
    bosch: 0.38,
    shimano: 0.14,
    bafang: 0.09,
    ananda: 0.05,
    'yamaha-brose': 0.10,
    panasonic: 0.015,
    avinox: 0.10,
    'other-china': 0.065,
    'other-premium': 0.06,
  },
  china: {
    bosch: 0,
    shimano: 0,
    bafang: 0.03,
    ananda: 0.17,
    'yamaha-brose': 0.005,
    panasonic: 0.003,
    avinox: 0.01,
    'other-china': 0.752,
    'other-premium': 0.03,
  },
  japan: {
    bosch: 0.02,
    shimano: 0.04,
    bafang: 0.01,
    ananda: 0,
    'yamaha-brose': 0.43,
    panasonic: 0.38,
    avinox: 0.02,
    'other-china': 0.02,
    'other-premium': 0.08,
  },
  row: {
    bosch: 0.07,
    shimano: 0.04,
    bafang: 0.22,
    ananda: 0.05,
    'yamaha-brose': 0.05,
    panasonic: 0.02,
    avinox: 0.05,
    'other-china': 0.42,
    'other-premium': 0.08,
  },
};

export const regionalAdoptionParams: Record<
  EbikeRegion,
  RegionalAdoptionParams
> = {
  us: {
    id: 'us',
    label: 'United States',
    baseYear: 2024,
    populationMillions: 340,
    annualPopulationGrowth: 0.004,
    initialInstalledStock: 5_500_000,
    baseAnnualSales: 900_000,
    saturationStockPerThousandPeople: 150,
    innovationRate: 0.001,
    imitationRate: 0.06,
    replacementYears: 10,
    baseMidDriveShare: 0.25,
    targetMidDriveShare: 0.35,
    architectureTransitionRate: 0.08,
    entrantOpenness: { hub: 0.80, 'mid-drive': 0.90 },
  },
  eu: {
    id: 'eu',
    label: 'EU27 + UK proxy',
    baseYear: 2024,
    populationMillions: 515,
    annualPopulationGrowth: -0.001,
    initialInstalledStock: 40_000_000,
    baseAnnualSales: 4_850_000,
    saturationStockPerThousandPeople: 250,
    innovationRate: 0.001,
    imitationRate: 0.026,
    replacementYears: 10,
    baseMidDriveShare: 0.72,
    targetMidDriveShare: 0.78,
    architectureTransitionRate: 0.06,
    entrantOpenness: { hub: 0.50, 'mid-drive': 0.75 },
  },
  china: {
    id: 'china',
    label: 'China',
    baseYear: 2024,
    populationMillions: 1_408,
    annualPopulationGrowth: -0.004,
    initialInstalledStock: 350_000_000,
    baseAnnualSales: 42_280_000,
    saturationStockPerThousandPeople: 300,
    innovationRate: 0,
    imitationRate: 0.057,
    replacementYears: 9,
    baseMidDriveShare: 0.02,
    targetMidDriveShare: 0.03,
    architectureTransitionRate: 0.04,
    entrantOpenness: { hub: 0.05, 'mid-drive': 0.03 },
  },
  japan: {
    id: 'japan',
    label: 'Japan',
    baseYear: 2024,
    populationMillions: 124,
    annualPopulationGrowth: -0.006,
    initialInstalledStock: 14_000_000,
    baseAnnualSales: 800_000,
    saturationStockPerThousandPeople: 150,
    innovationRate: 0.0002,
    imitationRate: 0.004,
    replacementYears: 18,
    baseMidDriveShare: 0.90,
    targetMidDriveShare: 0.90,
    architectureTransitionRate: 0.04,
    entrantOpenness: { hub: 0.03, 'mid-drive': 0.08 },
  },
  row: {
    id: 'row',
    label: 'Rest of world',
    baseYear: 2024,
    populationMillions: 5_800,
    annualPopulationGrowth: 0.009,
    initialInstalledStock: 40_000_000,
    baseAnnualSales: 4_500_000,
    saturationStockPerThousandPeople: 30,
    innovationRate: 0.001,
    imitationRate: 0.012,
    replacementYears: 10,
    baseMidDriveShare: 0.18,
    targetMidDriveShare: 0.28,
    architectureTransitionRate: 0.05,
    entrantOpenness: { hub: 0.45, 'mid-drive': 0.55 },
  },
};

export const entrantStrategies: Record<string, EntrantStrategy> = {
  'product-only': {
    id: 'product-only',
    label: 'Excellent motor, thin commercial layer',
    launchYear: 2028,
    architecture: 'mid-drive',
    productScore: 1.10,
    priceIndex: 1,
    serviceScore: 0.45,
    integrationScore: 0.60,
    bankabilityScore: 0.35,
    maxAddressableShare: 0.08,
    shareAdjustmentRate: 0.30,
    initialQualifiedOems: 1,
    annualOemWins: 1,
    matureUnitsPerOem: 12_000,
    oemRampYears: 3,
    initialAnnualCapacity: 25_000,
    annualCapacityGrowth: 0.45,
    maximumAnnualCapacity: 150_000,
    averageSellingPriceDollars: 390,
    initialVariableCostDollars: 285,
    learningRatePerDoubling: 0.06,
    learningReferenceUnits: 25_000,
    warrantyRevenueShare: 0.05,
    serviceLifeYears: 10,
    annualServiceCostPerActiveUnitDollars: 2,
    preLaunchAnnualResearchMillion: 22,
    postLaunchAnnualResearchMillion: 18,
    annualSalesAndServiceMillion: 10,
    annualGeneralAdminMillion: 8,
    engineeringMillionPerOemWin: 1.2,
    capexDollarsPerAddedCapacity: 70,
    discountRate: 0.12,
    terminalGrowthRate: 0.02,
  },
  'full-stack': {
    id: 'full-stack',
    label: 'Competitive U.S. full-stack mid-drive supplier',
    launchYear: 2028,
    architecture: 'mid-drive',
    productScore: 1.10,
    priceIndex: 1,
    serviceScore: 0.85,
    integrationScore: 0.90,
    bankabilityScore: 0.75,
    maxAddressableShare: 0.14,
    shareAdjustmentRate: 0.35,
    initialQualifiedOems: 3,
    annualOemWins: 3,
    matureUnitsPerOem: 22_000,
    oemRampYears: 3,
    initialAnnualCapacity: 60_000,
    annualCapacityGrowth: 0.65,
    maximumAnnualCapacity: 650_000,
    averageSellingPriceDollars: 420,
    initialVariableCostDollars: 285,
    learningRatePerDoubling: 0.06,
    learningReferenceUnits: 60_000,
    warrantyRevenueShare: 0.04,
    serviceLifeYears: 10,
    annualServiceCostPerActiveUnitDollars: 4,
    preLaunchAnnualResearchMillion: 30,
    postLaunchAnnualResearchMillion: 24,
    annualSalesAndServiceMillion: 22,
    annualGeneralAdminMillion: 12,
    engineeringMillionPerOemWin: 1.5,
    capexDollarsPerAddedCapacity: 100,
    discountRate: 0.12,
    terminalGrowthRate: 0.02,
  },
  breakthrough: {
    id: 'breakthrough',
    label: 'Avinox-like technical and commercial breakthrough',
    launchYear: 2027,
    architecture: 'mid-drive',
    productScore: 1.22,
    priceIndex: 0.95,
    serviceScore: 0.95,
    integrationScore: 1,
    bankabilityScore: 0.95,
    maxAddressableShare: 0.25,
    shareAdjustmentRate: 0.50,
    initialQualifiedOems: 6,
    annualOemWins: 7,
    matureUnitsPerOem: 30_000,
    oemRampYears: 2,
    initialAnnualCapacity: 120_000,
    annualCapacityGrowth: 0.80,
    maximumAnnualCapacity: 1_500_000,
    averageSellingPriceDollars: 450,
    initialVariableCostDollars: 290,
    learningRatePerDoubling: 0.08,
    learningReferenceUnits: 120_000,
    warrantyRevenueShare: 0.035,
    serviceLifeYears: 10,
    annualServiceCostPerActiveUnitDollars: 4,
    preLaunchAnnualResearchMillion: 45,
    postLaunchAnnualResearchMillion: 35,
    annualSalesAndServiceMillion: 35,
    annualGeneralAdminMillion: 18,
    engineeringMillionPerOemWin: 2,
    capexDollarsPerAddedCapacity: 120,
    discountRate: 0.12,
    terminalGrowthRate: 0.02,
  },
  'localized-hub': {
    id: 'localized-hub',
    label: 'Competitive localized commodity hub motor',
    launchYear: 2028,
    architecture: 'hub',
    productScore: 1.10,
    priceIndex: 1,
    serviceScore: 0.80,
    integrationScore: 0.80,
    bankabilityScore: 0.70,
    maxAddressableShare: 0.06,
    shareAdjustmentRate: 0.35,
    initialQualifiedOems: 4,
    annualOemWins: 4,
    matureUnitsPerOem: 40_000,
    oemRampYears: 2,
    initialAnnualCapacity: 100_000,
    annualCapacityGrowth: 0.70,
    maximumAnnualCapacity: 1_000_000,
    averageSellingPriceDollars: 95,
    initialVariableCostDollars: 72,
    learningRatePerDoubling: 0.05,
    learningReferenceUnits: 100_000,
    warrantyRevenueShare: 0.03,
    serviceLifeYears: 8,
    annualServiceCostPerActiveUnitDollars: 2,
    preLaunchAnnualResearchMillion: 20,
    postLaunchAnnualResearchMillion: 15,
    annualSalesAndServiceMillion: 14,
    annualGeneralAdminMillion: 9,
    engineeringMillionPerOemWin: 0.8,
    capexDollarsPerAddedCapacity: 45,
    discountRate: 0.12,
    terminalGrowthRate: 0.02,
  },
};

export function makeEbikeMotorScenario(
  entrant: EntrantStrategy,
  overrides: Partial<Pick<EbikeMotorScenario, 'id' | 'label' | 'startYear' | 'endYear'>> = {},
): EbikeMotorScenario {
  return {
    id: overrides.id ?? `e-bike-motors-${entrant.id}`,
    label: overrides.label ?? entrant.label,
    startYear: overrides.startYear ?? 2024,
    endYear: overrides.endYear ?? 2045,
    regions: regionalAdoptionParams,
    entrant,
  };
}

export const ebikeMotorScenarios = {
  'product-only': makeEbikeMotorScenario(entrantStrategies['product-only']),
  'full-stack': makeEbikeMotorScenario(entrantStrategies['full-stack']),
  breakthrough: makeEbikeMotorScenario(entrantStrategies.breakthrough),
  'localized-hub': makeEbikeMotorScenario(entrantStrategies['localized-hub']),
} as const;

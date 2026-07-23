/**
 * Aviation-infrastructure scenarios and observed anchors.
 *
 * The model forecasts landing-facility traffic, not aircraft sales.  A flight
 * creates two airport operations (one departure and one arrival), while FBO
 * capture is a separate service-channel assumption.
 */

export const AIR_MOBILITY_ARCHITECTURES = ['vtol', 'stol', 'ctol'] as const;
export type AirMobilityArchitecture =
  (typeof AIR_MOBILITY_ARCHITECTURES)[number];

export const AIR_MOBILITY_MARKETS = [
  'airport-shuttle',
  'regional',
  'urban',
] as const;
export type AirMobilityMarket = (typeof AIR_MOBILITY_MARKETS)[number];

export const AVIATION_FACILITY_CLASSES = [
  'major-airport-fbo',
  'business-aviation-fbo',
  'small-airport',
  'commercial-helipad',
  'new-vertiport',
] as const;
export type AviationFacilityClass =
  (typeof AVIATION_FACILITY_CLASSES)[number];

export interface ConventionalTrafficParams {
  baseYear: number;
  businessJetDomesticOperations: number;
  businessJetInternationalOperations: number;
  internationalOperationUsEndpointShare: number;
  lightFixedWingOperations: number;
  conventionalRotorcraftOperations: number;
  businessJetAnnualGrowth: number;
  lightFixedWingAnnualGrowth: number;
  conventionalRotorcraftAnnualGrowth: number;
}

export interface ArchitectureParams {
  id: AirMobilityArchitecture;
  label: string;
  entryIntoServiceYear: number;
  seats: number;
  loadFactor: number;
  retirementRate: number;
  pilotedFlightsPerAircraftDay: number;
  autonomousFlightsPerAircraftDay: number;
  dispatchAvailability: number;
  fixedCostPerFlight: number;
  variableCostPerMile: number;
  pilotCostPerFlight: number;
  autonomousCrewCostFraction: number;
  operatorMargin: number;
  earlyMaxAnnualDeliveries: number;
  earlyProductionMidpointYear: number;
  earlyProductionRampYears: number;
  matureAdditionalAnnualDeliveries: number;
  matureProductionMidpointYear: number;
  matureProductionRampYears: number;
  initialServiceSites: number;
  matureServiceSites: number;
  networkCoverageSites: number;
  siteReadinessMidpointYear: number;
  siteReadinessRampYears: number;
  operationsPerSiteDay: number;
}

export interface PassengerMarketParams {
  id: AirMobilityMarket;
  label: string;
  matureAnnualPassengerTrips: number;
  adoptionMidpointYear: number;
  adoptionRampYears: number;
  averageDistanceMiles: number;
  willingnessToPayPerPassenger: number;
  fareElasticity: number;
  architectureSuitability: Record<AirMobilityArchitecture, number>;
}

export type FacilityEndpointShares = Record<
  AirMobilityArchitecture,
  Record<
    AirMobilityMarket,
    Record<AviationFacilityClass, number>
  >
>;

export interface FacilityEconomicsParams {
  conventionalBusinessJetShares: Record<AviationFacilityClass, number>;
  conventionalLightFixedWingShares: Record<AviationFacilityClass, number>;
  conventionalRotorcraftShares: Record<AviationFacilityClass, number>;
  fboCaptureOfBusinessJet: Record<AviationFacilityClass, number>;
  fboCaptureOfLightFixedWing: Record<AviationFacilityClass, number>;
  fboCaptureOfRotorcraft: Record<AviationFacilityClass, number>;
  fboCaptureOfAam: Record<AviationFacilityClass, number>;
  businessJetFuelGallonsPerOperation: number;
  lightAircraftFuelGallonsPerOperation: number;
  rotorcraftFuelGallonsPerOperation: number;
  vtolElectricityKwhPerOperation: number;
  stolElectricityKwhPerOperation: number;
  ctolElectricityKwhPerOperation: number;
}

export interface AviationInfrastructureScenario {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  autonomyApprovalYear: number | null;
  autonomyRampYears: number;
  demandScale: number;
  conventional: ConventionalTrafficParams;
  architectures: Record<AirMobilityArchitecture, ArchitectureParams>;
  markets: Record<AirMobilityMarket, PassengerMarketParams>;
  facilityEndpointShares: FacilityEndpointShares;
  facilityEconomics: FacilityEconomicsParams;
}

export interface HistoricalObservation {
  year: number;
  value: number;
}

export interface HistoricalTrafficSeries {
  id: string;
  label: string;
  unit: 'operation/year';
  observations: readonly HistoricalObservation[];
  source: string;
  notes: string;
}

export const aviationEvidence = {
  faaBusinessJetEtmscOperations2025: 5_314_996,
  faaBusinessJetDomesticOperations2025: 4_569_480,
  faaBusinessJetInternationalOperations2025: 745_516,
  faaGaHours2024: 29_000_000,
  faaRotorcraftHours2024: 2_890_000,
  faaAamEarlyFleetAllUseCases: [7, 30, 80, 169, 254, 367],
  faaAamEarlyAllUseCaseDepartures: [
    24_600,
    111_600,
    334_800,
    737_300,
    1_108_400,
    1_615_000,
  ],
  // Airport Shuttle plus Commuter Air Taxi from the FAA use-case chart.
  // Year 1 is chart-rounded to 24 thousand.
  faaAamEarlyPassengerDepartures: [
    24_000,
    108_800,
    328_000,
    726_000,
    1_091_000,
    1_589_000,
  ],
  sources: {
    faaBusinessJet:
      'https://www.aspm.faa.gov/apmd/sys/bjpdf/b-jet-202606.pdf',
    faaAerospaceForecast:
      'https://www.faa.gov/data_research/aviation/aerospace_forecasts/FY_2026-2046_Full_Forecast_Document_Tables.pdf',
    faaTaf:
      'https://taf.faa.gov/Downloads/APO100_TAF_Final_2025.zip',
    faaAamInfrastructure:
      'https://www.faa.gov/airports/new_entrants/aam_infrastructure',
    electraCertification:
      'https://electra.aero/news/electra-achieves-faa-certification-milestone-for-el9-ultra-short-aircraft',
  },
  taf2025ZipSha256:
    'ff3b7048a56ef580fb33a307240c45bc42a189717c3c52b22005719508c2ae12',
} as const;

/** FAA ETMSC arrivals plus departures; 2020 is retained as a shock diagnostic. */
export const businessJetOperationsHistory: HistoricalTrafficSeries = {
  id: 'faa-etmsc-business-jet-operations',
  label: 'FAA ETMSC business-jet arrivals and departures',
  unit: 'operation/year',
  observations: [
    { year: 2016, value: 4_349_740 },
    { year: 2017, value: 4_483_614 },
    { year: 2018, value: 4_520_968 },
    { year: 2019, value: 4_533_920 },
    { year: 2020, value: 3_501_192 },
    { year: 2021, value: 5_099_528 },
    { year: 2022, value: 5_369_454 },
    { year: 2023, value: 5_139_626 },
    { year: 2024, value: 5_134_988 },
    { year: 2025, value: 5_314_996 },
  ],
  source: aviationEvidence.sources.faaBusinessJet,
  notes:
    'FAA ETMSC equipment-code series, including published domestic and international categories. Operations are arrivals and departures, not a strict U.S.-facility total, origin-to-destination flights, or FBO transactions.',
};

/**
 * Fixed 2024 facility cohorts, aggregated from the 2025 TAF airport and
 * operations workbooks.  The business-aviation cohort contains the 97
 * non-hub towered airports with at least 50,000 2024 itinerant GA plus
 * air-taxi operations.  This cohort definition is held fixed through history.
 */
export const tafFacilityTrafficHistory = {
  majorAirportGa: {
    id: 'taf-major-medium-hub-itinerant-ga',
    label: 'Large/medium-hub itinerant general-aviation operations',
    unit: 'operation/year',
    observations: [
      { year: 2010, value: 1_625_548 },
      { year: 2011, value: 1_617_014 },
      { year: 2012, value: 1_551_588 },
      { year: 2013, value: 1_524_357 },
      { year: 2014, value: 1_533_458 },
      { year: 2015, value: 1_527_957 },
      { year: 2016, value: 1_513_617 },
      { year: 2017, value: 1_492_842 },
      { year: 2018, value: 1_484_109 },
      { year: 2019, value: 1_473_017 },
      { year: 2020, value: 1_186_462 },
      { year: 2021, value: 1_350_631 },
      { year: 2022, value: 1_513_616 },
      { year: 2023, value: 1_397_487 },
      { year: 2024, value: 1_382_576 },
    ],
    source: aviationEvidence.sources.faaTaf,
    notes:
      'Sum of TAF itn_ga for airports with 2025 TAF HUB_SIZE 2 or 3; it excludes air-taxi operations that are often scheduled commuter service.',
  },
  businessAviationAirports: {
    id: 'taf-business-aviation-airport-traffic',
    label: 'Business-aviation-oriented towered airport operations',
    unit: 'operation/year',
    observations: [
      { year: 2010, value: 11_807_139 },
      { year: 2011, value: 11_755_944 },
      { year: 2012, value: 11_870_969 },
      { year: 2013, value: 11_823_720 },
      { year: 2014, value: 11_959_607 },
      { year: 2015, value: 11_959_821 },
      { year: 2016, value: 12_073_197 },
      { year: 2017, value: 12_323_409 },
      { year: 2018, value: 13_013_115 },
      { year: 2019, value: 13_556_410 },
      { year: 2020, value: 12_372_855 },
      { year: 2021, value: 12_995_444 },
      { year: 2022, value: 13_922_447 },
      { year: 2023, value: 14_888_214 },
      { year: 2024, value: 15_484_146 },
    ],
    source: aviationEvidence.sources.faaTaf,
    notes:
      'Fixed cohort sum of itinerant GA, air-taxi, and local GA operations. It is airport traffic, not an estimate of FBO-handled operations.',
  },
  otherRunwayAirports: {
    id: 'taf-other-runway-airport-traffic',
    label: 'Other non-major runway-airport operations',
    unit: 'operation/year',
    observations: [
      { year: 2010, value: 58_923_308 },
      { year: 2011, value: 57_780_882 },
      { year: 2012, value: 57_498_761 },
      { year: 2013, value: 56_906_593 },
      { year: 2014, value: 56_171_293 },
      { year: 2015, value: 56_292_679 },
      { year: 2016, value: 55_369_355 },
      { year: 2017, value: 54_938_468 },
      { year: 2018, value: 54_902_690 },
      { year: 2019, value: 55_310_881 },
      { year: 2020, value: 54_051_655 },
      { year: 2021, value: 55_477_984 },
      { year: 2022, value: 56_012_087 },
      { year: 2023, value: 56_687_705 },
      { year: 2024, value: 57_448_606 },
    ],
    source: aviationEvidence.sources.faaTaf,
    notes:
      'Fixed cohort sum of itinerant GA, air-taxi, and local GA operations at remaining NPIAS airports.',
  },
} as const satisfies Record<string, HistoricalTrafficSeries>;

export const paloAltoTrafficHistory: HistoricalTrafficSeries = {
  id: 'taf-pao-itinerant-civil-traffic',
  label: 'Palo Alto Airport itinerant GA plus air-taxi operations',
  unit: 'operation/year',
  observations: [
    { year: 2010, value: 68_365 },
    { year: 2015, value: 69_021 },
    { year: 2019, value: 54_664 },
    { year: 2020, value: 40_316 },
    { year: 2021, value: 46_976 },
    { year: 2022, value: 52_124 },
    { year: 2023, value: 53_498 },
    { year: 2024, value: 57_057 },
  ],
  source: aviationEvidence.sources.faaTaf,
  notes:
    'TAF itn_ga + itn_at. Local pattern operations and overflights are excluded because they are not destination traffic.',
};

const zeroFacilityShares = (): Record<AviationFacilityClass, number> => ({
  'major-airport-fbo': 0,
  'business-aviation-fbo': 0,
  'small-airport': 0,
  'commercial-helipad': 0,
  'new-vertiport': 0,
});

const shares = (
  values: Partial<Record<AviationFacilityClass, number>>,
): Record<AviationFacilityClass, number> => ({
  ...zeroFacilityShares(),
  ...values,
});

export const centralFacilityEndpointShares: FacilityEndpointShares = {
  vtol: {
    'airport-shuttle': shares({
      'major-airport-fbo': 0.45,
      'business-aviation-fbo': 0.10,
      'small-airport': 0.05,
      'commercial-helipad': 0.30,
      'new-vertiport': 0.10,
    }),
    regional: shares({
      'major-airport-fbo': 0.05,
      'business-aviation-fbo': 0.25,
      'small-airport': 0.35,
      'commercial-helipad': 0.15,
      'new-vertiport': 0.20,
    }),
    urban: shares({
      'major-airport-fbo': 0.05,
      'business-aviation-fbo': 0.05,
      'small-airport': 0.05,
      'commercial-helipad': 0.50,
      'new-vertiport': 0.35,
    }),
  },
  stol: {
    'airport-shuttle': shares({
      'major-airport-fbo': 0.45,
      'business-aviation-fbo': 0.35,
      'small-airport': 0.20,
    }),
    regional: shares({
      'major-airport-fbo': 0.05,
      'business-aviation-fbo': 0.30,
      'small-airport': 0.65,
    }),
    urban: shares({
      'major-airport-fbo': 0.10,
      'business-aviation-fbo': 0.40,
      'small-airport': 0.50,
    }),
  },
  ctol: {
    'airport-shuttle': shares({
      'major-airport-fbo': 0.50,
      'business-aviation-fbo': 0.35,
      'small-airport': 0.15,
    }),
    regional: shares({
      'major-airport-fbo': 0.05,
      'business-aviation-fbo': 0.25,
      'small-airport': 0.70,
    }),
    urban: shares({
      'major-airport-fbo': 0.10,
      'business-aviation-fbo': 0.35,
      'small-airport': 0.55,
    }),
  },
};

const conventionalShares = {
  businessJet: shares({
    'major-airport-fbo': 0.18,
    'business-aviation-fbo': 0.62,
    'small-airport': 0.20,
  }),
  lightFixedWing: shares({
    'major-airport-fbo': 0.01,
    'business-aviation-fbo': 0.14,
    'small-airport': 0.85,
  }),
  rotorcraft: shares({
    'major-airport-fbo': 0.08,
    'business-aviation-fbo': 0.10,
    'small-airport': 0.22,
    'commercial-helipad': 0.60,
  }),
} as const;

export const centralFacilityEconomics: FacilityEconomicsParams = {
  conventionalBusinessJetShares: conventionalShares.businessJet,
  conventionalLightFixedWingShares: conventionalShares.lightFixedWing,
  conventionalRotorcraftShares: conventionalShares.rotorcraft,
  fboCaptureOfBusinessJet: shares({
    'major-airport-fbo': 0.90,
    'business-aviation-fbo': 0.95,
    'small-airport': 0.75,
  }),
  fboCaptureOfLightFixedWing: shares({
    'major-airport-fbo': 0.25,
    'business-aviation-fbo': 0.50,
    'small-airport': 0.15,
  }),
  fboCaptureOfRotorcraft: shares({
    'major-airport-fbo': 0.35,
    'business-aviation-fbo': 0.50,
    'small-airport': 0.20,
    'commercial-helipad': 0.05,
  }),
  fboCaptureOfAam: shares({
    'major-airport-fbo': 0.35,
    'business-aviation-fbo': 0.65,
    'small-airport': 0.45,
    'commercial-helipad': 0.05,
    'new-vertiport': 0,
  }),
  // Engineering/economic scenario values; they are not fitted observations.
  businessJetFuelGallonsPerOperation: 180,
  lightAircraftFuelGallonsPerOperation: 7,
  rotorcraftFuelGallonsPerOperation: 25,
  vtolElectricityKwhPerOperation: 80,
  stolElectricityKwhPerOperation: 45,
  ctolElectricityKwhPerOperation: 35,
};

const architectures: Record<AirMobilityArchitecture, ArchitectureParams> = {
  vtol: {
    id: 'vtol',
    label: 'Electric vertical takeoff and landing',
    entryIntoServiceYear: 2029,
    seats: 4,
    loadFactor: 0.72,
    retirementRate: 0.025,
    pilotedFlightsPerAircraftDay: 10,
    autonomousFlightsPerAircraftDay: 17,
    dispatchAvailability: 0.82,
    fixedCostPerFlight: 220,
    variableCostPerMile: 4.0,
    pilotCostPerFlight: 240,
    autonomousCrewCostFraction: 0.22,
    operatorMargin: 0.18,
    earlyMaxAnnualDeliveries: 150,
    earlyProductionMidpointYear: 2032.5,
    earlyProductionRampYears: 1.2,
    matureAdditionalAnnualDeliveries: 850,
    matureProductionMidpointYear: 2041,
    matureProductionRampYears: 3,
    initialServiceSites: 4,
    matureServiceSites: 700,
    networkCoverageSites: 700,
    siteReadinessMidpointYear: 2040,
    siteReadinessRampYears: 2,
    operationsPerSiteDay: 120,
  },
  stol: {
    id: 'stol',
    label: 'Ultra-short takeoff and landing',
    entryIntoServiceYear: 2031,
    seats: 9,
    loadFactor: 0.68,
    retirementRate: 0.025,
    pilotedFlightsPerAircraftDay: 7,
    autonomousFlightsPerAircraftDay: 12,
    dispatchAvailability: 0.86,
    fixedCostPerFlight: 350,
    variableCostPerMile: 3.5,
    pilotCostPerFlight: 320,
    autonomousCrewCostFraction: 0.25,
    operatorMargin: 0.18,
    earlyMaxAnnualDeliveries: 100,
    earlyProductionMidpointYear: 2034.5,
    earlyProductionRampYears: 1.4,
    matureAdditionalAnnualDeliveries: 600,
    matureProductionMidpointYear: 2040,
    matureProductionRampYears: 3,
    initialServiceSites: 80,
    matureServiceSites: 900,
    networkCoverageSites: 900,
    siteReadinessMidpointYear: 2038,
    siteReadinessRampYears: 3,
    operationsPerSiteDay: 90,
  },
  ctol: {
    id: 'ctol',
    label: 'Electric or hybrid conventional takeoff and landing',
    entryIntoServiceYear: 2029,
    seats: 6,
    loadFactor: 0.70,
    retirementRate: 0.025,
    pilotedFlightsPerAircraftDay: 7,
    autonomousFlightsPerAircraftDay: 12,
    dispatchAvailability: 0.88,
    fixedCostPerFlight: 250,
    variableCostPerMile: 3.0,
    pilotCostPerFlight: 280,
    autonomousCrewCostFraction: 0.25,
    operatorMargin: 0.18,
    earlyMaxAnnualDeliveries: 60,
    earlyProductionMidpointYear: 2034,
    earlyProductionRampYears: 1.5,
    matureAdditionalAnnualDeliveries: 450,
    matureProductionMidpointYear: 2040,
    matureProductionRampYears: 3,
    initialServiceSites: 100,
    matureServiceSites: 850,
    networkCoverageSites: 850,
    siteReadinessMidpointYear: 2037,
    siteReadinessRampYears: 3,
    operationsPerSiteDay: 90,
  },
};

const markets: Record<AirMobilityMarket, PassengerMarketParams> = {
  'airport-shuttle': {
    id: 'airport-shuttle',
    label: 'Airport access and transfer',
    matureAnnualPassengerTrips: 30_000_000,
    adoptionMidpointYear: 2037,
    adoptionRampYears: 3.5,
    averageDistanceMiles: 30,
    willingnessToPayPerPassenger: 190,
    fareElasticity: 2.2,
    architectureSuitability: { vtol: 1, stol: 0.35, ctol: 0.45 },
  },
  regional: {
    id: 'regional',
    label: 'Regional business and leisure trips',
    matureAnnualPassengerTrips: 80_000_000,
    adoptionMidpointYear: 2041,
    adoptionRampYears: 4.5,
    averageDistanceMiles: 180,
    willingnessToPayPerPassenger: 290,
    fareElasticity: 2.0,
    architectureSuitability: { vtol: 0.12, stol: 1, ctol: 0.95 },
  },
  urban: {
    id: 'urban',
    label: 'Premium intra-metropolitan trips',
    matureAnnualPassengerTrips: 25_000_000,
    adoptionMidpointYear: 2043,
    adoptionRampYears: 4,
    averageDistanceMiles: 22,
    willingnessToPayPerPassenger: 145,
    fareElasticity: 2.5,
    architectureSuitability: { vtol: 1, stol: 0.03, ctol: 0.02 },
  },
};

export const centralAviationScenario: AviationInfrastructureScenario = {
  id: 'central-mixed',
  label: 'Mixed architecture with late-2030s autonomy',
  startYear: 2025,
  endYear: 2050,
  autonomyApprovalYear: 2038,
  autonomyRampYears: 5,
  demandScale: 1,
  conventional: {
    baseYear: 2025,
    businessJetDomesticOperations:
      aviationEvidence.faaBusinessJetDomesticOperations2025,
    businessJetInternationalOperations:
      aviationEvidence.faaBusinessJetInternationalOperations2025,
    // Each cross-border flight normally contributes one U.S. and one foreign
    // endpoint operation. The FAA international series also contains some
    // foreign-to-foreign activity, so 0.5 is an explicit upper-side proxy.
    internationalOperationUsEndpointShare: 0.5,
    // Reconciles approximately to 2024 TAF GA-like operations after removing
    // business-jet and rotorcraft operations from the total.
    lightFixedWingOperations: 56_000_000,
    // 2.89M rotorcraft hours / 0.75 hours per flight * two endpoint operations.
    conventionalRotorcraftOperations: 7_706_667,
    businessJetAnnualGrowth: 0.012,
    lightFixedWingAnnualGrowth: -0.001,
    conventionalRotorcraftAnnualGrowth: 0.014,
  },
  architectures,
  markets,
  facilityEndpointShares: centralFacilityEndpointShares,
  facilityEconomics: centralFacilityEconomics,
};

function cloneScenario(
  scenario: AviationInfrastructureScenario,
): AviationInfrastructureScenario {
  return structuredClone(scenario);
}

function withArchitectureProduction(
  scenario: AviationInfrastructureScenario,
  architecture: AirMobilityArchitecture,
  multiplier: number,
): void {
  const params = scenario.architectures[architecture];
  params.earlyMaxAnnualDeliveries *= multiplier;
  params.matureAdditionalAnnualDeliveries *= multiplier;
  params.matureServiceSites *= multiplier;
}

const continuity = cloneScenario(centralAviationScenario);
continuity.id = 'continuity';
continuity.label = 'Conventional aviation; no material passenger AAM';
continuity.autonomyApprovalYear = null;
continuity.demandScale = 0;

const slowCertification = cloneScenario(centralAviationScenario);
slowCertification.id = 'slow-certification';
slowCertification.label = 'Slow certification, sites, and no autonomy before 2050';
slowCertification.autonomyApprovalYear = null;
slowCertification.demandScale = 0.65;
for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
  slowCertification.architectures[architecture].entryIntoServiceYear += 4;
  slowCertification.architectures[architecture].earlyProductionMidpointYear += 4;
  slowCertification.architectures[architecture].matureProductionMidpointYear += 5;
  slowCertification.architectures[architecture].siteReadinessMidpointYear += 5;
  withArchitectureProduction(slowCertification, architecture, 0.55);
}

const vtolAutonomy = cloneScenario(centralAviationScenario);
vtolAutonomy.id = 'autonomous-vtol';
vtolAutonomy.label = 'Early autonomy with VTOL manufacturing and site success';
vtolAutonomy.autonomyApprovalYear = 2033;
vtolAutonomy.autonomyRampYears = 4;
vtolAutonomy.demandScale = 1.25;
withArchitectureProduction(vtolAutonomy, 'vtol', 1.8);
withArchitectureProduction(vtolAutonomy, 'stol', 0.55);
withArchitectureProduction(vtolAutonomy, 'ctol', 0.65);
vtolAutonomy.architectures.vtol.siteReadinessMidpointYear = 2036;
vtolAutonomy.architectures.vtol.fixedCostPerFlight *= 0.75;
vtolAutonomy.architectures.vtol.variableCostPerMile *= 0.75;
vtolAutonomy.markets.regional.architectureSuitability.vtol = 0.35;
for (const architecture of ['stol', 'ctol'] as const) {
  vtolAutonomy.architectures[architecture].entryIntoServiceYear += 3;
  vtolAutonomy.architectures[architecture].earlyProductionMidpointYear += 3;
  vtolAutonomy.architectures[architecture].matureProductionMidpointYear += 4;
  vtolAutonomy.architectures[architecture].siteReadinessMidpointYear += 4;
  vtolAutonomy.architectures[architecture].fixedCostPerFlight *= 1.10;
}

const runwayAutonomy = cloneScenario(centralAviationScenario);
runwayAutonomy.id = 'autonomous-runway';
runwayAutonomy.label = 'Early autonomy with STOL/CTOL regional network';
runwayAutonomy.autonomyApprovalYear = 2033;
runwayAutonomy.autonomyRampYears = 4;
runwayAutonomy.demandScale = 1.25;
withArchitectureProduction(runwayAutonomy, 'vtol', 0.55);
withArchitectureProduction(runwayAutonomy, 'stol', 1.8);
withArchitectureProduction(runwayAutonomy, 'ctol', 1.5);
runwayAutonomy.architectures.stol.siteReadinessMidpointYear = 2034;
runwayAutonomy.architectures.ctol.siteReadinessMidpointYear = 2034;
runwayAutonomy.architectures.vtol.entryIntoServiceYear += 3;
runwayAutonomy.architectures.vtol.earlyProductionMidpointYear += 3;
runwayAutonomy.architectures.vtol.matureProductionMidpointYear += 4;
runwayAutonomy.architectures.vtol.siteReadinessMidpointYear += 5;
runwayAutonomy.architectures.vtol.fixedCostPerFlight *= 1.15;
for (const architecture of ['stol', 'ctol'] as const) {
  runwayAutonomy.architectures[architecture].fixedCostPerFlight *= 0.80;
  runwayAutonomy.architectures[architecture].variableCostPerMile *= 0.80;
}
runwayAutonomy.markets['airport-shuttle'].architectureSuitability.stol = 0.65;
runwayAutonomy.markets['airport-shuttle'].architectureSuitability.ctol = 0.75;

export const aviationInfrastructureScenarios = {
  continuity,
  'slow-certification': slowCertification,
  'central-mixed': centralAviationScenario,
  'autonomous-vtol': vtolAutonomy,
  'autonomous-runway': runwayAutonomy,
} as const satisfies Record<string, AviationInfrastructureScenario>;

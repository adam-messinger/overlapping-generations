import {
  defineEstimand,
  defineMeasurement,
  defineSemanticDerivation,
  type EstimandContract,
  type MeasurementBinding,
  type SemanticDerivation,
} from 'tsimulation';

type EstimandSpec = Omit<
  EstimandContract,
  'schemaVersion' | 'id' | 'version'
>;

function estimand(id: string, spec: EstimandSpec): EstimandContract {
  return defineEstimand({
    schemaVersion: 'tsimulation.estimand/v1',
    id: `estimand.aviation.${id}`,
    version: '1.0.0',
    ...spec,
  });
}

const us = {
  id: 'geo.us',
  label: 'United States',
  boundaryVersion: 'current-national-boundary',
} as const;

const faaEtmscCoverage = {
  id: 'geo.faa-etmsc-coverage',
  label: 'FAA ETMSC observed domestic, international, and foreign operations',
  boundaryVersion: 'etmsc-2026-reporting-coverage',
} as const;

const annualSum = {
  kind: 'interval',
  interval: 'calendar-year',
  aggregation: 'sum',
  calendar: 'gregorian',
} as const;

const annualMean = {
  kind: 'interval',
  interval: 'calendar-year',
  aggregation: 'mean',
  calendar: 'gregorian',
} as const;

const pointInTime = {
  kind: 'instant',
  calendar: 'gregorian',
} as const;

const usLandingFacilities = {
  id: 'population.us.aviation-landing-facilities',
  label: 'U.S. airports, heliports, and vertiports',
  universe:
    'Facilities in the United States at which modeled conventional or advanced-air-mobility aircraft arrive or depart.',
} as const;

const aamPassengerFlights = {
  id: 'population.us.aam-passenger-flights',
  label: 'Modeled U.S. passenger AAM flights',
  universe:
    'Origin-to-destination passenger flights by modeled VTOL, STOL, or CTOL advanced-air-mobility aircraft.',
  exclusion: ['cargo-only flights', 'military operations', 'uncrewed parcel drones'],
} as const;

const aamPassengerAircraft = {
  id: 'population.us.aam-passenger-aircraft',
  label: 'Modeled U.S. passenger AAM aircraft',
  universe:
    'Active VTOL, STOL, or CTOL aircraft used for modeled U.S. passenger AAM service.',
  exclusion: ['cargo-only aircraft', 'military aircraft', 'uncrewed parcel drones'],
} as const;

const businessJetOperations = {
  id: 'population.business-jet-airport-operations',
  label: 'Business-jet airport operations',
  universe:
    'Individual business-jet arrivals and departures identified by FAA ETMSC equipment codes.',
} as const;

const realUsd2026 = {
  priceBasis: 'real',
  currency: 'USD',
  priceYear: 2026,
  exchangeRateBasis: 'market',
} as const;

function facilityOperationEstimand(
  id: string,
  quantityKind: string,
  inclusion: string,
): EstimandContract {
  return estimand(id, {
    quantityKind,
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: {
      ...usLandingFacilities,
      inclusion: [
        'the facility class named by the accompanying row metadata',
        inclusion,
      ],
    },
    geography: us,
    time: annualSum,
  });
}

function fboOperationEstimand(
  id: string,
  quantityKind: string,
  inclusion: string,
): EstimandContract {
  return estimand(id, {
    quantityKind,
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: {
      id: `population.us.${id}`,
      label: 'Operations receiving modeled FBO services',
      inclusion: [
        'operations captured by an FBO under the scenario',
        inclusion,
      ],
      exclusion: [
        'self-service operations',
        'operations handled by a terminal or independent vertiport operator',
      ],
    },
    geography: us,
    time: annualSum,
  });
}

export const aviationEstimands = {
  calendarYear: estimand('calendar-year', {
    quantityKind: 'calendar.gregorian-year-label',
    measure: { kind: 'level' },
    time: pointInTime,
  }),
  domesticBusinessJetOperations: estimand(
    'business-jet-domestic-etmsc-operations',
    {
      quantityKind: 'aviation.business-jet.airport-operation',
      measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
      population: {
        ...businessJetOperations,
        inclusion: ['operations classified as domestic by FAA ETMSC'],
      },
      geography: faaEtmscCoverage,
      time: annualSum,
    },
  ),
  internationalBusinessJetOperations: estimand(
    'business-jet-international-etmsc-operations',
    {
      quantityKind: 'aviation.business-jet.airport-operation',
      measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
      population: {
        ...businessJetOperations,
        inclusion: [
          'U.S.-foreign, foreign-U.S., and foreign operations classified as international by FAA ETMSC',
        ],
      },
      geography: faaEtmscCoverage,
      time: annualSum,
    },
  ),
  internationalUsEndpointShare: estimand(
    'international-operation-us-endpoint-share',
    {
      quantityKind: 'aviation.international-operation.us-endpoint-share',
      measure: { kind: 'share' },
      ratio: {
        numerator: 'international ETMSC business-jet operations located at U.S. facilities',
        denominator: 'all international ETMSC business-jet operations',
      },
      geography: faaEtmscCoverage,
      time: annualSum,
    },
  ),
  usBusinessJetOperations: estimand('us-business-jet-airport-operations', {
    quantityKind: 'aviation.business-jet.airport-operation',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: businessJetOperations,
    geography: us,
    time: annualSum,
  }),
  usLightFixedWingOperations: estimand(
    'us-light-fixed-wing-airport-operations',
    {
      quantityKind: 'aviation.light-fixed-wing.airport-operation',
      measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
      population: usLandingFacilities,
      geography: us,
      time: annualSum,
    },
  ),
  usRotorcraftOperations: estimand('us-rotorcraft-airport-operations', {
    quantityKind: 'aviation.rotorcraft.airport-operation',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: usLandingFacilities,
    geography: us,
    time: annualSum,
  }),
  usConventionalOperations: estimand('us-conventional-airport-operations', {
    quantityKind: 'aviation.conventional-aircraft.airport-operation',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: usLandingFacilities,
    geography: us,
    time: annualSum,
  }),
  aamFlights: estimand('us-aam-origin-destination-flights', {
    quantityKind: 'aviation.aam.origin-destination-flight',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: aamPassengerFlights,
    geography: us,
    time: annualSum,
  }),
  aamPassengerTrips: estimand('us-aam-passenger-trips', {
    quantityKind: 'aviation.aam.passenger-trip',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: aamPassengerFlights,
    geography: us,
    time: annualSum,
  }),
  architectureAamFlights: estimand(
    'named-architecture-aam-origin-destination-flights',
    {
      quantityKind: 'aviation.aam.named-architecture.origin-destination-flight',
      measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
      population: {
        ...aamPassengerFlights,
        inclusion: [
          'the VTOL, STOL, or CTOL architecture named by the accompanying row metadata',
        ],
      },
      geography: us,
      time: annualSum,
    },
  ),
  architectureAamPassengerTrips: estimand(
    'named-architecture-aam-passenger-trips',
    {
      quantityKind: 'aviation.aam.named-architecture.passenger-trip',
      measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
      population: {
        ...aamPassengerFlights,
        inclusion: [
          'the VTOL, STOL, or CTOL architecture named by the accompanying row metadata',
        ],
      },
      geography: us,
      time: annualSum,
    },
  ),
  marketAamPassengerTrips: estimand('named-market-aam-passenger-trips', {
    quantityKind: 'aviation.aam.named-market.passenger-trip',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: {
      ...aamPassengerFlights,
      inclusion: [
        'the airport-shuttle, regional, or urban market named by the record key',
      ],
    },
    geography: us,
    time: annualSum,
  }),
  aamFacilityOperations: estimand('us-aam-facility-operations', {
    quantityKind: 'aviation.aam.airport-operation',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: usLandingFacilities,
    geography: us,
    time: annualSum,
    description:
      'One operation per arrival or departure; every completed modeled flight creates exactly two facility operations.',
  }),
  facilityClassOperations: estimand('facility-class-airport-operations', {
    quantityKind: 'aviation.facility-class.airport-operation',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: {
      ...usLandingFacilities,
      inclusion: ['the facility class named by the accompanying row metadata'],
    },
    geography: us,
    time: annualSum,
  }),
  facilityBusinessJetOperations: facilityOperationEstimand(
    'facility-class-business-jet-operations',
    'aviation.facility-class.business-jet-airport-operation',
    'business-jet operations',
  ),
  facilityLightFixedWingOperations: facilityOperationEstimand(
    'facility-class-light-fixed-wing-operations',
    'aviation.facility-class.light-fixed-wing-airport-operation',
    'light fixed-wing operations',
  ),
  facilityRotorcraftOperations: facilityOperationEstimand(
    'facility-class-rotorcraft-operations',
    'aviation.facility-class.rotorcraft-airport-operation',
    'conventional rotorcraft operations',
  ),
  facilityConventionalOperations: facilityOperationEstimand(
    'facility-class-conventional-operations',
    'aviation.facility-class.conventional-aircraft-operation',
    'all modeled conventional-aircraft operations',
  ),
  facilityVtolOperations: facilityOperationEstimand(
    'facility-class-aam-vtol-operations',
    'aviation.facility-class.aam-vtol-operation',
    'AAM VTOL operations',
  ),
  facilityStolOperations: facilityOperationEstimand(
    'facility-class-aam-stol-operations',
    'aviation.facility-class.aam-stol-operation',
    'AAM STOL operations',
  ),
  facilityCtolOperations: facilityOperationEstimand(
    'facility-class-aam-ctol-operations',
    'aviation.facility-class.aam-ctol-operation',
    'AAM CTOL operations',
  ),
  facilityAamOperations: facilityOperationEstimand(
    'facility-class-aam-operations',
    'aviation.facility-class.aam-operation',
    'all modeled AAM operations',
  ),
  facilityTotalOperations: facilityOperationEstimand(
    'facility-class-total-operations',
    'aviation.facility-class.total-aircraft-operation',
    'all modeled conventional and AAM operations',
  ),
  fboHandledOperations: estimand('fbo-handled-airport-operations', {
    quantityKind: 'aviation.fbo-handled.airport-operation',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: {
      id: 'population.us.fbo-handled-operations',
      label: 'Operations receiving modeled FBO services',
      inclusion: ['operations captured by an FBO under the scenario'],
      exclusion: [
        'self-service operations',
        'operations handled by a terminal or independent vertiport operator',
      ],
    },
    geography: us,
    time: annualSum,
  }),
  conventionalFboHandledOperations: fboOperationEstimand(
    'conventional-fbo-handled-operations',
    'aviation.fbo-handled.conventional-aircraft-operation',
    'conventional-aircraft operations',
  ),
  aamFboHandledOperations: fboOperationEstimand(
    'aam-fbo-handled-operations',
    'aviation.fbo-handled.aam-operation',
    'AAM operations',
  ),
  aamPassengerMovements: estimand('aam-facility-passenger-movements', {
    quantityKind: 'aviation.aam.facility-passenger-movement',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: aamPassengerFlights,
    geography: us,
    time: annualSum,
    description:
      'One passenger movement at departure and another at arrival; twice origin-to-destination passenger trips.',
  }),
  aircraftFleet: estimand('aam-active-aircraft-fleet', {
    quantityKind: 'aviation.aam.active-aircraft',
    measure: { kind: 'stock', totality: 'total', accounting: 'net' },
    population: aamPassengerAircraft,
    geography: us,
    time: pointInTime,
  }),
  aircraftDeliveries: estimand('aam-aircraft-deliveries', {
    quantityKind: 'aviation.aam.aircraft-delivery',
    measure: { kind: 'flow', totality: 'incremental', accounting: 'gross' },
    population: aamPassengerAircraft,
    geography: us,
    time: annualSum,
  }),
  serviceSites: estimand('aam-service-ready-sites', {
    quantityKind: 'aviation.aam.service-ready-landing-facility',
    measure: { kind: 'stock', totality: 'total', accounting: 'net' },
    population: usLandingFacilities,
    geography: us,
    time: pointInTime,
  }),
  farePerPassenger: estimand('aam-average-fare-per-passenger', {
    quantityKind: 'finance.aam.average-passenger-fare',
    measure: { kind: 'rate' },
    population: aamPassengerFlights,
    geography: us,
    ratio: {
      numerator: 'passenger fare revenue',
      denominator: 'origin-to-destination passenger trips',
    },
    time: annualMean,
    valuation: realUsd2026,
  }),
  flightCapacity: estimand('aam-annual-flight-capacity', {
    quantityKind: 'aviation.aam.origin-destination-flight-capacity',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: aamPassengerFlights,
    geography: us,
    time: annualSum,
  }),
  capacityUtilization: estimand('aam-flight-capacity-utilization', {
    quantityKind: 'aviation.aam.flight-capacity-utilization',
    measure: { kind: 'share' },
    ratio: {
      numerator: 'realized origin-to-destination flights',
      denominator: 'minimum of fleet and landing-site flight capacity',
    },
    geography: us,
    time: annualMean,
  }),
  autonomyShare: estimand('aam-autonomous-operating-share', {
    quantityKind: 'aviation.aam.autonomous-operating-share',
    measure: { kind: 'share' },
    ratio: {
      numerator: 'modeled AAM operating capability without an onboard pilot',
      denominator: 'total modeled AAM operating capability',
    },
    geography: us,
    time: annualMean,
  }),
  architectureFlightShare: estimand('aam-architecture-flight-share', {
    quantityKind: 'aviation.aam.architecture-flight-share',
    measure: { kind: 'share' },
    ratio: {
      numerator: 'origin-to-destination flights by the named architecture set',
      denominator: 'all modeled AAM origin-to-destination flights',
    },
    geography: us,
    time: annualSum,
  }),
  fuelUse: estimand('conventional-aircraft-fuel-volume', {
    quantityKind: 'aviation.conventional-aircraft.liquid-fuel-volume',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: usLandingFacilities,
    geography: us,
    time: annualSum,
  }),
  electricityUse: estimand('aam-electricity-consumption', {
    quantityKind: 'aviation.aam.electricity-consumption',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: aamPassengerFlights,
    geography: us,
    time: annualSum,
  }),
  annualGrowthRate: estimand('conventional-operation-annual-growth-rate', {
    quantityKind: 'aviation.airport-operation.annual-growth-rate',
    measure: { kind: 'rate' },
    ratio: {
      numerator: 'change in annual operations',
      denominator: 'prior-year annual operations',
    },
    geography: us,
    time: annualMean,
  }),
} as const;

export const faaDomesticBusinessJetOperations2025Measurement: MeasurementBinding =
  defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'measurement.faa.etmsc.domestic-business-jet-operations-2025',
    version: '1.0.0',
    estimand: aviationEstimands.domesticBusinessJetOperations,
    dataset: {
      id: 'faa.etmsc.monthly-business-jet-report',
      field: '2025_domestic_operations',
      version: '2026-06-report',
    },
    procedure: {
      description:
        'FAA ETMSC count of arrivals and departures by business-jet equipment codes classified as domestic.',
    },
    phenomenonTime: {
      start: '2025-01-01',
      end: '2025-12-31',
    },
    resultTime: '2026-06-30',
    revisionPolicy: 'revisable',
    release: 'revised',
  });

export const faaInternationalBusinessJetOperations2025Measurement: MeasurementBinding =
  defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'measurement.faa.etmsc.international-business-jet-operations-2025',
    version: '1.0.0',
    estimand: aviationEstimands.internationalBusinessJetOperations,
    dataset: {
      id: 'faa.etmsc.monthly-business-jet-report',
      field: '2025_international_operations',
      version: '2026-06-report',
    },
    procedure: {
      description:
        'FAA ETMSC count classified as international, including U.S.-foreign, foreign-U.S., and reported foreign operations.',
    },
    phenomenonTime: {
      start: '2025-01-01',
      end: '2025-12-31',
    },
    resultTime: '2026-06-30',
    revisionPolicy: 'revisable',
    release: 'revised',
    coverage: {
      geography: 'FAA ETMSC coverage, not strictly U.S. landing facilities',
      missingness:
        'The public report does not separately identify the U.S. endpoint share of international operations.',
    },
  });

export const businessJetEndpointDerivation: SemanticDerivation =
  defineSemanticDerivation({
    schemaVersion: 'tsimulation.derivation/v1',
    id: 'derivation.aviation.etmsc-to-us-business-jet-operations',
    version: '1.0.0',
    description:
      'Estimate annual business-jet operations located at U.S. facilities from FAA domestic and international ETMSC categories, then apply the scenario growth rate.',
    inputEstimandIds: [
      aviationEstimands.domesticBusinessJetOperations.id,
      aviationEstimands.internationalBusinessJetOperations.id,
      aviationEstimands.internationalUsEndpointShare.id,
      aviationEstimands.annualGrowthRate.id,
    ],
    outputEstimand: aviationEstimands.usBusinessJetOperations,
    expression:
      'US operations(t) = [domestic operations(base) + international operations(base) × U.S.-endpoint share] × (1 + operations growth)^(t-base)',
    assumptions: [
      'A 0.5 endpoint share is an upper-side proxy because cross-border flights have one U.S. endpoint while the published international category also contains some foreign operations.',
      'The same annual operations growth rate applies to domestic and U.S.-endpoint international activity.',
    ],
    evidenceIds: [
      'aviation-faa-business-jet-domestic',
      'aviation-faa-business-jet-international',
    ],
  });

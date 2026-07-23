import {
  measurementPort,
  metadataPort,
  objectPort,
  observationPort,
  recordPort,
  unitPort,
  vectorPort,
} from 'tsimulation';
import {
  AIR_MOBILITY_ARCHITECTURES,
  AIR_MOBILITY_MARKETS,
  AVIATION_FACILITY_CLASSES,
  type ArchitectureParams,
  type AviationInfrastructureScenario,
  type ConventionalTrafficParams,
  type FacilityEconomicsParams,
  type PassengerMarketParams,
} from './data.js';
import {
  aviationEstimands,
  faaDomesticBusinessJetOperations2025Measurement,
  faaInternationalBusinessJetOperations2025Measurement,
} from './measurement-contracts.js';
import type {
  ArchitectureYearResult,
  AviationInfrastructureResult,
  AviationInfrastructureYear,
  FacilityTrafficYearResult,
} from './model.js';

const facilityFractions = () =>
  recordPort<number>(unitPort('fraction'), {
    keys: AVIATION_FACILITY_CLASSES,
  });

const architectureFractions = () =>
  recordPort<number>(unitPort('fraction'), {
    keys: AIR_MOBILITY_ARCHITECTURES,
  });

export const CONVENTIONAL_TRAFFIC_PORT =
  objectPort<ConventionalTrafficParams>({
    baseYear: measurementPort(
      'calendar-year',
      aviationEstimands.calendarYear,
    ),
    businessJetDomesticOperations: observationPort(
      'operation/year',
      faaDomesticBusinessJetOperations2025Measurement,
    ),
    businessJetInternationalOperations: observationPort(
      'operation/year',
      faaInternationalBusinessJetOperations2025Measurement,
    ),
    internationalOperationUsEndpointShare: measurementPort(
      'fraction',
      aviationEstimands.internationalUsEndpointShare,
    ),
    lightFixedWingOperations: measurementPort(
      'operation/year',
      aviationEstimands.usLightFixedWingOperations,
    ),
    conventionalRotorcraftOperations: measurementPort(
      'operation/year',
      aviationEstimands.usRotorcraftOperations,
    ),
    businessJetAnnualGrowth: measurementPort(
      'fraction/year',
      aviationEstimands.annualGrowthRate,
    ),
    lightFixedWingAnnualGrowth: measurementPort(
      'fraction/year',
      aviationEstimands.annualGrowthRate,
    ),
    conventionalRotorcraftAnnualGrowth: measurementPort(
      'fraction/year',
      aviationEstimands.annualGrowthRate,
    ),
  });

export const ARCHITECTURE_PARAMS_PORT = objectPort<ArchitectureParams>({
  id: metadataPort('string', 'Architecture identifier.'),
  label: metadataPort('string', 'Architecture label.'),
  entryIntoServiceYear: unitPort('calendar-year'),
  seats: unitPort('seat'),
  loadFactor: unitPort('fraction'),
  retirementRate: unitPort('fraction/year'),
  pilotedFlightsPerAircraftDay: unitPort('flight/aircraft/day'),
  autonomousFlightsPerAircraftDay: unitPort('flight/aircraft/day'),
  dispatchAvailability: unitPort('fraction'),
  fixedCostPerFlight: unitPort('$/flight'),
  variableCostPerMile: unitPort('$/mi'),
  pilotCostPerFlight: unitPort('$/flight'),
  autonomousCrewCostFraction: unitPort('fraction'),
  operatorMargin: unitPort('fraction'),
  earlyMaxAnnualDeliveries: unitPort('aircraft/year'),
  earlyProductionMidpointYear: unitPort('calendar-year'),
  earlyProductionRampYears: unitPort('year'),
  matureAdditionalAnnualDeliveries: unitPort('aircraft/year'),
  matureProductionMidpointYear: unitPort('calendar-year'),
  matureProductionRampYears: unitPort('year'),
  initialServiceSites: unitPort('facility'),
  matureServiceSites: unitPort('facility'),
  networkCoverageSites: unitPort('facility'),
  siteReadinessMidpointYear: unitPort('calendar-year'),
  siteReadinessRampYears: unitPort('year'),
  operationsPerSiteDay: unitPort('operation/facility/day'),
});

export const PASSENGER_MARKET_PORT = objectPort<PassengerMarketParams>({
  id: metadataPort('string', 'Passenger-market identifier.'),
  label: metadataPort('string', 'Passenger-market label.'),
  matureAnnualPassengerTrips: unitPort('passenger-trip/year'),
  adoptionMidpointYear: unitPort('calendar-year'),
  adoptionRampYears: unitPort('year'),
  averageDistanceMiles: unitPort('mi'),
  willingnessToPayPerPassenger: unitPort('$/passenger-trip'),
  fareElasticity: unitPort('1'),
  architectureSuitability: architectureFractions(),
});

export const FACILITY_ECONOMICS_PORT =
  objectPort<FacilityEconomicsParams>({
    conventionalBusinessJetShares: facilityFractions(),
    conventionalLightFixedWingShares: facilityFractions(),
    conventionalRotorcraftShares: facilityFractions(),
    fboCaptureOfBusinessJet: facilityFractions(),
    fboCaptureOfLightFixedWing: facilityFractions(),
    fboCaptureOfRotorcraft: facilityFractions(),
    fboCaptureOfAam: facilityFractions(),
    businessJetFuelGallonsPerOperation: unitPort('USgal/operation'),
    lightAircraftFuelGallonsPerOperation: unitPort('USgal/operation'),
    rotorcraftFuelGallonsPerOperation: unitPort('USgal/operation'),
    vtolElectricityKwhPerOperation: unitPort('kWh/operation'),
    stolElectricityKwhPerOperation: unitPort('kWh/operation'),
    ctolElectricityKwhPerOperation: unitPort('kWh/operation'),
  });

export const AVIATION_INFRASTRUCTURE_SCENARIO_PORT =
  objectPort<AviationInfrastructureScenario>({
    id: metadataPort('string', 'Scenario identifier.'),
    label: metadataPort('string', 'Scenario label.'),
    startYear: measurementPort(
      'calendar-year',
      aviationEstimands.calendarYear,
    ),
    endYear: measurementPort(
      'calendar-year',
      aviationEstimands.calendarYear,
    ),
    autonomyApprovalYear: {
      ...unitPort('calendar-year'),
      nullable: true,
    },
    autonomyRampYears: unitPort('year'),
    demandScale: unitPort('1'),
    conventional: CONVENTIONAL_TRAFFIC_PORT,
    architectures: recordPort<ArchitectureParams>(
      ARCHITECTURE_PARAMS_PORT,
      { keys: AIR_MOBILITY_ARCHITECTURES },
    ),
    markets: recordPort<PassengerMarketParams>(
      PASSENGER_MARKET_PORT,
      { keys: AIR_MOBILITY_MARKETS },
    ),
    facilityEndpointShares: recordPort<
      Record<
        (typeof AIR_MOBILITY_MARKETS)[number],
        Record<(typeof AVIATION_FACILITY_CLASSES)[number], number>
      >
    >(
      recordPort<Record<(typeof AVIATION_FACILITY_CLASSES)[number], number>>(
        facilityFractions(),
        { keys: AIR_MOBILITY_MARKETS },
      ),
      { keys: AIR_MOBILITY_ARCHITECTURES },
    ),
    facilityEconomics: FACILITY_ECONOMICS_PORT,
  });

export const ARCHITECTURE_YEAR_PORT =
  objectPort<ArchitectureYearResult>({
    architecture: metadataPort('string', 'Architecture identifier.'),
    annualDeliveries: measurementPort(
      'aircraft/year',
      aviationEstimands.aircraftDeliveries,
    ),
    fleet: measurementPort('aircraft', aviationEstimands.aircraftFleet),
    serviceSites: measurementPort(
      'facility',
      aviationEstimands.serviceSites,
    ),
    autonomyShare: measurementPort(
      'fraction',
      aviationEstimands.autonomyShare,
    ),
    averageFarePerPassenger: measurementPort(
      '$/passenger-trip',
      aviationEstimands.farePerPassenger,
    ),
    desiredAnnualFlights: measurementPort(
      'flight/year',
      aviationEstimands.architectureAamFlights,
    ),
    fleetFlightCapacity: measurementPort(
      'flight/year',
      aviationEstimands.flightCapacity,
    ),
    siteFlightCapacity: measurementPort(
      'flight/year',
      aviationEstimands.flightCapacity,
    ),
    actualAnnualFlights: measurementPort(
      'flight/year',
      aviationEstimands.architectureAamFlights,
    ),
    annualPassengerTrips: measurementPort(
      'passenger-trip/year',
      aviationEstimands.architectureAamPassengerTrips,
    ),
    capacityUtilization: measurementPort(
      'fraction',
      aviationEstimands.capacityUtilization,
    ),
    bindingConstraint: metadataPort(
      'string',
      'Demand, fleet, or site-capacity constraint.',
    ),
  });

export const FACILITY_TRAFFIC_YEAR_PORT =
  objectPort<FacilityTrafficYearResult>({
    facilityClass: metadataPort('string', 'Facility-class identifier.'),
    conventionalBusinessJetOperations: measurementPort(
      'operation/year',
      aviationEstimands.facilityBusinessJetOperations,
    ),
    conventionalLightFixedWingOperations: measurementPort(
      'operation/year',
      aviationEstimands.facilityLightFixedWingOperations,
    ),
    conventionalRotorcraftOperations: measurementPort(
      'operation/year',
      aviationEstimands.facilityRotorcraftOperations,
    ),
    conventionalOperations: measurementPort(
      'operation/year',
      aviationEstimands.facilityConventionalOperations,
    ),
    aamVtolOperations: measurementPort(
      'operation/year',
      aviationEstimands.facilityVtolOperations,
    ),
    aamStolOperations: measurementPort(
      'operation/year',
      aviationEstimands.facilityStolOperations,
    ),
    aamCtolOperations: measurementPort(
      'operation/year',
      aviationEstimands.facilityCtolOperations,
    ),
    aamOperations: measurementPort(
      'operation/year',
      aviationEstimands.facilityAamOperations,
    ),
    totalOperations: measurementPort(
      'operation/year',
      aviationEstimands.facilityTotalOperations,
    ),
    aamPassengerMovements: measurementPort(
      'passenger-trip/year',
      aviationEstimands.aamPassengerMovements,
    ),
    conventionalFboHandledOperations: measurementPort(
      'operation/year',
      aviationEstimands.conventionalFboHandledOperations,
    ),
    aamFboHandledOperations: measurementPort(
      'operation/year',
      aviationEstimands.aamFboHandledOperations,
    ),
    fboHandledOperations: measurementPort(
      'operation/year',
      aviationEstimands.fboHandledOperations,
    ),
    conventionalFuelGallons: measurementPort(
      'USgal/year',
      aviationEstimands.fuelUse,
    ),
    aamElectricityMwh: measurementPort(
      'MWh/year',
      aviationEstimands.electricityUse,
    ),
  });

export const AVIATION_INFRASTRUCTURE_YEAR_PORT =
  objectPort<AviationInfrastructureYear>({
    year: measurementPort('calendar-year', aviationEstimands.calendarYear),
    autonomyShare: measurementPort(
      'fraction',
      aviationEstimands.autonomyShare,
    ),
    architectures: recordPort<ArchitectureYearResult>(
      ARCHITECTURE_YEAR_PORT,
      { keys: AIR_MOBILITY_ARCHITECTURES },
    ),
    facilities: recordPort<FacilityTrafficYearResult>(
      FACILITY_TRAFFIC_YEAR_PORT,
      { keys: AVIATION_FACILITY_CLASSES },
    ),
    marketPassengerTrips: recordPort<number>(
      measurementPort(
        'passenger-trip/year',
        aviationEstimands.marketAamPassengerTrips,
      ),
      { keys: AIR_MOBILITY_MARKETS },
    ),
    conventionalBusinessJetOperations: measurementPort(
      'operation/year',
      aviationEstimands.usBusinessJetOperations,
    ),
    conventionalLightFixedWingOperations: measurementPort(
      'operation/year',
      aviationEstimands.usLightFixedWingOperations,
    ),
    conventionalRotorcraftOperations: measurementPort(
      'operation/year',
      aviationEstimands.usRotorcraftOperations,
    ),
    totalConventionalOperations: measurementPort(
      'operation/year',
      aviationEstimands.usConventionalOperations,
    ),
    totalAamFlights: measurementPort(
      'flight/year',
      aviationEstimands.aamFlights,
    ),
    totalAamPassengerTrips: measurementPort(
      'passenger-trip/year',
      aviationEstimands.aamPassengerTrips,
    ),
    totalAamFacilityOperations: measurementPort(
      'operation/year',
      aviationEstimands.aamFacilityOperations,
    ),
    vtolFlightShare: measurementPort(
      'fraction',
      aviationEstimands.architectureFlightShare,
    ),
    runwayFlightShare: measurementPort(
      'fraction',
      aviationEstimands.architectureFlightShare,
    ),
    totalFboHandledOperations: measurementPort(
      'operation/year',
      aviationEstimands.fboHandledOperations,
    ),
    totalConventionalFuelGallons: measurementPort(
      'USgal/year',
      aviationEstimands.fuelUse,
    ),
    totalAamElectricityMwh: measurementPort(
      'MWh/year',
      aviationEstimands.electricityUse,
    ),
  });

const nullableCalendarYear = {
  ...measurementPort('calendar-year', aviationEstimands.calendarYear),
  nullable: true,
} as const;

export const AVIATION_INFRASTRUCTURE_RESULT_PORT =
  objectPort<AviationInfrastructureResult>({
    scenario: AVIATION_INFRASTRUCTURE_SCENARIO_PORT,
    years: vectorPort<AviationInfrastructureYear>(
      AVIATION_INFRASTRUCTURE_YEAR_PORT,
    ),
    firstHundredThousandAamFlightsYear: nullableCalendarYear,
    firstMillionAamFlightsYear: nullableCalendarYear,
    firstTenMillionAamFlightsYear: nullableCalendarYear,
    majorityAutonomousYear: nullableCalendarYear,
    endingAamFlights: measurementPort(
      'flight/year',
      aviationEstimands.aamFlights,
    ),
    endingAamPassengerTrips: measurementPort(
      'passenger-trip/year',
      aviationEstimands.aamPassengerTrips,
    ),
    endingVtolFlightShare: measurementPort(
      'fraction',
      aviationEstimands.architectureFlightShare,
    ),
    endingRunwayFlightShare: measurementPort(
      'fraction',
      aviationEstimands.architectureFlightShare,
    ),
    endingFacilityAamOperations: recordPort<number>(
      measurementPort(
        'operation/year',
        aviationEstimands.facilityAamOperations,
      ),
      { keys: AVIATION_FACILITY_CLASSES },
    ),
  });

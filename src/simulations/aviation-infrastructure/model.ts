import {
  assertFiniteDeep,
  validateNumber,
  validateShares,
} from 'tsimulation';
import {
  AIR_MOBILITY_ARCHITECTURES,
  AIR_MOBILITY_MARKETS,
  AVIATION_FACILITY_CLASSES,
  type AirMobilityArchitecture,
  type AirMobilityMarket,
  type ArchitectureParams,
  type AviationFacilityClass,
  type AviationInfrastructureScenario,
} from './data.js';

const DAYS_PER_YEAR = 365.25;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const logistic = (value: number): number => 1 / (1 + Math.exp(-value));

function normalizedRamp(
  year: number,
  startYear: number,
  midpointYear: number,
  rampYears: number,
): number {
  if (year < startYear) return 0;
  const baseline = logistic((startYear - 1 - midpointYear) / rampYears);
  const current = logistic((year - midpointYear) / rampYears);
  return clamp((current - baseline) / Math.max(1e-9, 1 - baseline), 0, 1);
}

function autonomyShare(
  scenario: AviationInfrastructureScenario,
  year: number,
): number {
  if (scenario.autonomyApprovalYear === null) return 0;
  return clamp(
    (year - scenario.autonomyApprovalYear + 1) /
      scenario.autonomyRampYears,
    0,
    1,
  );
}

function architectureDeliveries(
  params: ArchitectureParams,
  year: number,
): number {
  if (year < params.entryIntoServiceYear) return 0;
  const early =
    params.earlyMaxAnnualDeliveries *
    normalizedRamp(
      year,
      params.entryIntoServiceYear,
      params.earlyProductionMidpointYear,
      params.earlyProductionRampYears,
    );
  const mature =
    params.matureAdditionalAnnualDeliveries *
    normalizedRamp(
      year,
      params.entryIntoServiceYear,
      params.matureProductionMidpointYear,
      params.matureProductionRampYears,
    );
  return early + mature;
}

function architectureServiceSites(
  params: ArchitectureParams,
  year: number,
): number {
  if (year < params.entryIntoServiceYear) return 0;
  const readiness = normalizedRamp(
    year,
    params.entryIntoServiceYear,
    params.siteReadinessMidpointYear,
    params.siteReadinessRampYears,
  );
  return (
    params.initialServiceSites +
    (params.matureServiceSites - params.initialServiceSites) * readiness
  );
}

function passengerFare(
  params: ArchitectureParams,
  distanceMiles: number,
  autonomousShare: number,
): number {
  const crewCost =
    params.pilotCostPerFlight *
    ((1 - autonomousShare) +
      autonomousShare * params.autonomousCrewCostFraction);
  const flightCost =
    params.fixedCostPerFlight +
    params.variableCostPerMile * distanceMiles +
    crewCost;
  const occupiedSeats = params.seats * params.loadFactor;
  return (flightCost * (1 + params.operatorMargin)) / occupiedSeats;
}

export interface ArchitectureYearResult {
  architecture: AirMobilityArchitecture;
  annualDeliveries: number;
  fleet: number;
  serviceSites: number;
  autonomyShare: number;
  averageFarePerPassenger: number;
  desiredAnnualFlights: number;
  fleetFlightCapacity: number;
  siteFlightCapacity: number;
  actualAnnualFlights: number;
  annualPassengerTrips: number;
  capacityUtilization: number;
  bindingConstraint: 'demand' | 'fleet' | 'sites';
}

export interface FacilityTrafficYearResult {
  facilityClass: AviationFacilityClass;
  conventionalBusinessJetOperations: number;
  conventionalLightFixedWingOperations: number;
  conventionalRotorcraftOperations: number;
  conventionalOperations: number;
  aamVtolOperations: number;
  aamStolOperations: number;
  aamCtolOperations: number;
  aamOperations: number;
  totalOperations: number;
  aamPassengerMovements: number;
  conventionalFboHandledOperations: number;
  aamFboHandledOperations: number;
  fboHandledOperations: number;
  conventionalFuelGallons: number;
  aamElectricityMwh: number;
}

export interface AviationInfrastructureYear {
  year: number;
  autonomyShare: number;
  architectures: Record<AirMobilityArchitecture, ArchitectureYearResult>;
  facilities: Record<AviationFacilityClass, FacilityTrafficYearResult>;
  marketPassengerTrips: Record<AirMobilityMarket, number>;
  conventionalBusinessJetOperations: number;
  conventionalLightFixedWingOperations: number;
  conventionalRotorcraftOperations: number;
  totalConventionalOperations: number;
  totalAamFlights: number;
  totalAamPassengerTrips: number;
  totalAamFacilityOperations: number;
  vtolFlightShare: number;
  runwayFlightShare: number;
  totalFboHandledOperations: number;
  totalConventionalFuelGallons: number;
  totalAamElectricityMwh: number;
}

export interface AviationInfrastructureResult {
  scenario: AviationInfrastructureScenario;
  years: readonly AviationInfrastructureYear[];
  firstHundredThousandAamFlightsYear: number | null;
  firstMillionAamFlightsYear: number | null;
  firstTenMillionAamFlightsYear: number | null;
  majorityAutonomousYear: number | null;
  endingAamFlights: number;
  endingAamPassengerTrips: number;
  endingVtolFlightShare: number;
  endingRunwayFlightShare: number;
  endingFacilityAamOperations: Record<AviationFacilityClass, number>;
}

interface ArchitectureDemandScratch {
  params: ArchitectureParams;
  fleet: number;
  deliveries: number;
  serviceSites: number;
  autonomyShare: number;
  fares: Record<AirMobilityMarket, number>;
  desiredFlights: Record<AirMobilityMarket, number>;
  actualFlights: Record<AirMobilityMarket, number>;
  actualPassengerTrips: Record<AirMobilityMarket, number>;
  fleetCapacity: number;
  siteCapacity: number;
}

function validateScenario(scenario: AviationInfrastructureScenario): void {
  assertFiniteDeep(
    {
      ...scenario,
      autonomyApprovalYear: scenario.autonomyApprovalYear ?? 0,
    },
    'aviation-infrastructure scenario',
  );
  const errors = [
    ...validateNumber(scenario.startYear, 'scenario.startYear', {
      integer: true,
      min: 2000,
    }),
    ...validateNumber(scenario.endYear, 'scenario.endYear', {
      integer: true,
      min: scenario.startYear,
    }),
    ...validateNumber(scenario.autonomyRampYears, 'scenario.autonomyRampYears', {
      min: 0,
      exclusiveMin: true,
    }),
    ...validateNumber(scenario.demandScale, 'scenario.demandScale', { min: 0 }),
    ...validateNumber(
      scenario.conventional.businessJetDomesticOperations,
      'scenario.conventional.businessJetDomesticOperations',
      { min: 0 },
    ),
    ...validateNumber(
      scenario.conventional.baseYear,
      'scenario.conventional.baseYear',
      { integer: true, min: 2000 },
    ),
    ...validateNumber(
      scenario.conventional.businessJetInternationalOperations,
      'scenario.conventional.businessJetInternationalOperations',
      { min: 0 },
    ),
    ...validateNumber(
      scenario.conventional.internationalOperationUsEndpointShare,
      'scenario.conventional.internationalOperationUsEndpointShare',
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      scenario.conventional.lightFixedWingOperations,
      'scenario.conventional.lightFixedWingOperations',
      { min: 0 },
    ),
    ...validateNumber(
      scenario.conventional.conventionalRotorcraftOperations,
      'scenario.conventional.conventionalRotorcraftOperations',
      { min: 0 },
    ),
    ...validateNumber(
      scenario.conventional.businessJetAnnualGrowth,
      'scenario.conventional.businessJetAnnualGrowth',
      { min: -1, exclusiveMin: true },
    ),
    ...validateNumber(
      scenario.conventional.lightFixedWingAnnualGrowth,
      'scenario.conventional.lightFixedWingAnnualGrowth',
      { min: -1, exclusiveMin: true },
    ),
    ...validateNumber(
      scenario.conventional.conventionalRotorcraftAnnualGrowth,
      'scenario.conventional.conventionalRotorcraftAnnualGrowth',
      { min: -1, exclusiveMin: true },
    ),
  ];
  if (
    scenario.autonomyApprovalYear !== null &&
    !Number.isInteger(scenario.autonomyApprovalYear)
  ) {
    errors.push('scenario.autonomyApprovalYear must be a calendar year or null');
  }
  for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
    const params = scenario.architectures[architecture];
    if (params.id !== architecture) {
      errors.push(
        `scenario.architectures.${architecture}.id must equal '${architecture}'`,
      );
    }
    errors.push(
      ...validateNumber(
        params.entryIntoServiceYear,
        `scenario.architectures.${architecture}.entryIntoServiceYear`,
        { integer: true, min: scenario.startYear },
      ),
      ...validateNumber(
        params.seats,
        `scenario.architectures.${architecture}.seats`,
        { integer: true, min: 1 },
      ),
      ...validateNumber(
        params.loadFactor,
        `scenario.architectures.${architecture}.loadFactor`,
        { min: 0, max: 1, exclusiveMin: true },
      ),
      ...validateNumber(
        params.retirementRate,
        `scenario.architectures.${architecture}.retirementRate`,
        { min: 0, max: 1 },
      ),
      ...validateNumber(
        params.dispatchAvailability,
        `scenario.architectures.${architecture}.dispatchAvailability`,
        { min: 0, max: 1, exclusiveMin: true },
      ),
      ...validateNumber(
        params.pilotedFlightsPerAircraftDay,
        `scenario.architectures.${architecture}.pilotedFlightsPerAircraftDay`,
        { min: 0, exclusiveMin: true },
      ),
      ...validateNumber(
        params.autonomousFlightsPerAircraftDay,
        `scenario.architectures.${architecture}.autonomousFlightsPerAircraftDay`,
        { min: 0, exclusiveMin: true },
      ),
      ...validateNumber(
        params.fixedCostPerFlight,
        `scenario.architectures.${architecture}.fixedCostPerFlight`,
        { min: 0 },
      ),
      ...validateNumber(
        params.variableCostPerMile,
        `scenario.architectures.${architecture}.variableCostPerMile`,
        { min: 0 },
      ),
      ...validateNumber(
        params.pilotCostPerFlight,
        `scenario.architectures.${architecture}.pilotCostPerFlight`,
        { min: 0 },
      ),
      ...validateNumber(
        params.autonomousCrewCostFraction,
        `scenario.architectures.${architecture}.autonomousCrewCostFraction`,
        { min: 0, max: 1 },
      ),
      ...validateNumber(
        params.operatorMargin,
        `scenario.architectures.${architecture}.operatorMargin`,
        { min: -1, exclusiveMin: true },
      ),
      ...validateNumber(
        params.earlyMaxAnnualDeliveries,
        `scenario.architectures.${architecture}.earlyMaxAnnualDeliveries`,
        { min: 0 },
      ),
      ...validateNumber(
        params.earlyProductionMidpointYear,
        `scenario.architectures.${architecture}.earlyProductionMidpointYear`,
        { min: scenario.startYear },
      ),
      ...validateNumber(
        params.earlyProductionRampYears,
        `scenario.architectures.${architecture}.earlyProductionRampYears`,
        { min: 0, exclusiveMin: true },
      ),
      ...validateNumber(
        params.matureAdditionalAnnualDeliveries,
        `scenario.architectures.${architecture}.matureAdditionalAnnualDeliveries`,
        { min: 0 },
      ),
      ...validateNumber(
        params.matureProductionMidpointYear,
        `scenario.architectures.${architecture}.matureProductionMidpointYear`,
        { min: scenario.startYear },
      ),
      ...validateNumber(
        params.matureProductionRampYears,
        `scenario.architectures.${architecture}.matureProductionRampYears`,
        { min: 0, exclusiveMin: true },
      ),
      ...validateNumber(
        params.initialServiceSites,
        `scenario.architectures.${architecture}.initialServiceSites`,
        { min: 0 },
      ),
      ...validateNumber(
        params.matureServiceSites,
        `scenario.architectures.${architecture}.matureServiceSites`,
        { min: params.initialServiceSites },
      ),
      ...validateNumber(
        params.networkCoverageSites,
        `scenario.architectures.${architecture}.networkCoverageSites`,
        { min: 0, exclusiveMin: true },
      ),
      ...validateNumber(
        params.siteReadinessMidpointYear,
        `scenario.architectures.${architecture}.siteReadinessMidpointYear`,
        { min: scenario.startYear },
      ),
      ...validateNumber(
        params.siteReadinessRampYears,
        `scenario.architectures.${architecture}.siteReadinessRampYears`,
        { min: 0, exclusiveMin: true },
      ),
      ...validateNumber(
        params.operationsPerSiteDay,
        `scenario.architectures.${architecture}.operationsPerSiteDay`,
        { min: 0, exclusiveMin: true },
      ),
    );
  }
  for (const market of AIR_MOBILITY_MARKETS) {
    const params = scenario.markets[market];
    if (params.id !== market) {
      errors.push(`scenario.markets.${market}.id must equal '${market}'`);
    }
    errors.push(
      ...validateNumber(
        params.matureAnnualPassengerTrips,
        `scenario.markets.${market}.matureAnnualPassengerTrips`,
        { min: 0 },
      ),
      ...validateNumber(
        params.adoptionRampYears,
        `scenario.markets.${market}.adoptionRampYears`,
        { min: 0, exclusiveMin: true },
      ),
      ...validateNumber(
        params.adoptionMidpointYear,
        `scenario.markets.${market}.adoptionMidpointYear`,
        { min: scenario.startYear },
      ),
      ...validateNumber(
        params.averageDistanceMiles,
        `scenario.markets.${market}.averageDistanceMiles`,
        { min: 0, exclusiveMin: true },
      ),
      ...validateNumber(
        params.willingnessToPayPerPassenger,
        `scenario.markets.${market}.willingnessToPayPerPassenger`,
        { min: 0, exclusiveMin: true },
      ),
      ...validateNumber(
        params.fareElasticity,
        `scenario.markets.${market}.fareElasticity`,
        { min: 0, exclusiveMin: true },
      ),
    );
    for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
      errors.push(
        ...validateNumber(
          params.architectureSuitability[architecture],
          `scenario.markets.${market}.architectureSuitability.${architecture}`,
          { min: 0, max: 1 },
        ),
      );
      errors.push(
        ...validateShares(
          scenario.facilityEndpointShares[architecture][market],
          `scenario.facilityEndpointShares.${architecture}.${market}`,
          1e-9,
        ),
      );
    }
  }
  const economics = scenario.facilityEconomics;
  errors.push(
    ...validateShares(
      economics.conventionalBusinessJetShares,
      'scenario.facilityEconomics.conventionalBusinessJetShares',
      1e-9,
    ),
    ...validateShares(
      economics.conventionalLightFixedWingShares,
      'scenario.facilityEconomics.conventionalLightFixedWingShares',
      1e-9,
    ),
    ...validateShares(
      economics.conventionalRotorcraftShares,
      'scenario.facilityEconomics.conventionalRotorcraftShares',
      1e-9,
    ),
  );
  for (const facilityClass of AVIATION_FACILITY_CLASSES) {
    for (const [name, record] of [
      ['fboCaptureOfBusinessJet', economics.fboCaptureOfBusinessJet],
      ['fboCaptureOfLightFixedWing', economics.fboCaptureOfLightFixedWing],
      ['fboCaptureOfRotorcraft', economics.fboCaptureOfRotorcraft],
      ['fboCaptureOfAam', economics.fboCaptureOfAam],
    ] as const) {
      errors.push(
        ...validateNumber(
          record[facilityClass],
          `scenario.facilityEconomics.${name}.${facilityClass}`,
          { min: 0, max: 1 },
        ),
      );
    }
  }
  for (const [name, value] of [
    ['businessJetFuelGallonsPerOperation', economics.businessJetFuelGallonsPerOperation],
    ['lightAircraftFuelGallonsPerOperation', economics.lightAircraftFuelGallonsPerOperation],
    ['rotorcraftFuelGallonsPerOperation', economics.rotorcraftFuelGallonsPerOperation],
    ['vtolElectricityKwhPerOperation', economics.vtolElectricityKwhPerOperation],
    ['stolElectricityKwhPerOperation', economics.stolElectricityKwhPerOperation],
    ['ctolElectricityKwhPerOperation', economics.ctolElectricityKwhPerOperation],
  ] as const) {
    errors.push(
      ...validateNumber(
        value,
        `scenario.facilityEconomics.${name}`,
        { min: 0 },
      ),
    );
  }
  if (errors.length > 0) {
    throw new Error(`Invalid aviation-infrastructure scenario:\n  ${errors.join('\n  ')}`);
  }
}

function emptyFacilityResult(
  facilityClass: AviationFacilityClass,
): FacilityTrafficYearResult {
  return {
    facilityClass,
    conventionalBusinessJetOperations: 0,
    conventionalLightFixedWingOperations: 0,
    conventionalRotorcraftOperations: 0,
    conventionalOperations: 0,
    aamVtolOperations: 0,
    aamStolOperations: 0,
    aamCtolOperations: 0,
    aamOperations: 0,
    totalOperations: 0,
    aamPassengerMovements: 0,
    conventionalFboHandledOperations: 0,
    aamFboHandledOperations: 0,
    fboHandledOperations: 0,
    conventionalFuelGallons: 0,
    aamElectricityMwh: 0,
  };
}

function sumFacilities(
  facilities: Record<AviationFacilityClass, FacilityTrafficYearResult>,
  field: keyof FacilityTrafficYearResult,
): number {
  return AVIATION_FACILITY_CLASSES.reduce((sum, facilityClass) => {
    const value = facilities[facilityClass][field];
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);
}

export function simulateAviationInfrastructure(
  scenario: AviationInfrastructureScenario,
): AviationInfrastructureResult {
  validateScenario(scenario);
  const years: AviationInfrastructureYear[] = [];
  const fleet: Record<AirMobilityArchitecture, number> = {
    vtol: 0,
    stol: 0,
    ctol: 0,
  };

  for (let year = scenario.startYear; year <= scenario.endYear; year++) {
    const autonomous = autonomyShare(scenario, year);
    const scratch = {} as Record<
      AirMobilityArchitecture,
      ArchitectureDemandScratch
    >;

    for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
      const params = scenario.architectures[architecture];
      const deliveries = architectureDeliveries(params, year);
      fleet[architecture] =
        fleet[architecture] * (1 - params.retirementRate) + deliveries;
      const serviceSites = architectureServiceSites(params, year);
      const flightsPerDay =
        params.pilotedFlightsPerAircraftDay * (1 - autonomous) +
        params.autonomousFlightsPerAircraftDay * autonomous;
      const fleetCapacity =
        fleet[architecture] *
        flightsPerDay *
        DAYS_PER_YEAR *
        params.dispatchAvailability;
      const siteCapacity =
        (serviceSites * params.operationsPerSiteDay * DAYS_PER_YEAR) / 2;
      scratch[architecture] = {
        params,
        fleet: fleet[architecture],
        deliveries,
        serviceSites,
        autonomyShare: autonomous,
        fares: { 'airport-shuttle': 0, regional: 0, urban: 0 },
        desiredFlights: { 'airport-shuttle': 0, regional: 0, urban: 0 },
        actualFlights: { 'airport-shuttle': 0, regional: 0, urban: 0 },
        actualPassengerTrips: {
          'airport-shuttle': 0,
          regional: 0,
          urban: 0,
        },
        fleetCapacity,
        siteCapacity,
      };
    }

    for (const market of AIR_MOBILITY_MARKETS) {
      const marketParams = scenario.markets[market];
      const maturity = logistic(
        (year - marketParams.adoptionMidpointYear) /
          marketParams.adoptionRampYears,
      );
      const addressablePassengerTrips =
        marketParams.matureAnnualPassengerTrips *
        scenario.demandScale *
        maturity;
      const rawWeights = {} as Record<AirMobilityArchitecture, number>;
      let weightSum = 0;

      for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
        const row = scratch[architecture];
        const fare = passengerFare(
          row.params,
          marketParams.averageDistanceMiles,
          autonomous,
        );
        row.fares[market] = fare;
        const serviceSiteFraction =
          row.serviceSites / row.params.networkCoverageSites;
        // A few dense initial markets cover more demand than their national
        // site count alone suggests; the square root captures concentration.
        const networkCoverage = Math.sqrt(clamp(serviceSiteFraction, 0, 1));
        const priceAcceptance =
          1 /
          (1 +
            Math.pow(
              fare / marketParams.willingnessToPayPerPassenger,
              marketParams.fareElasticity,
            ));
        const weight =
          marketParams.architectureSuitability[architecture] *
          networkCoverage *
          priceAcceptance;
        rawWeights[architecture] = weight;
        weightSum += weight;
      }

      for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
        const row = scratch[architecture];
        const desiredPassengerTrips =
          addressablePassengerTrips *
          (rawWeights[architecture] / (1 + weightSum));
        row.desiredFlights[market] =
          desiredPassengerTrips /
          (row.params.seats * row.params.loadFactor);
      }
    }

    for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
      const row = scratch[architecture];
      const desired = AIR_MOBILITY_MARKETS.reduce(
        (sum, market) => sum + row.desiredFlights[market],
        0,
      );
      const availableCapacity = Math.min(
        row.fleetCapacity,
        row.siteCapacity,
      );
      const scale = desired > 0 ? Math.min(1, availableCapacity / desired) : 0;
      for (const market of AIR_MOBILITY_MARKETS) {
        row.actualFlights[market] = row.desiredFlights[market] * scale;
        row.actualPassengerTrips[market] =
          row.actualFlights[market] * row.params.seats * row.params.loadFactor;
      }
    }

    const exponent = year - scenario.conventional.baseYear;
    const baseBusinessJetOperations =
      scenario.conventional.businessJetDomesticOperations +
      scenario.conventional.businessJetInternationalOperations *
        scenario.conventional.internationalOperationUsEndpointShare;
    const conventionalBusinessJetOperations =
      baseBusinessJetOperations *
      Math.pow(
        1 + scenario.conventional.businessJetAnnualGrowth,
        exponent,
      );
    const conventionalLightFixedWingOperations =
      scenario.conventional.lightFixedWingOperations *
      Math.pow(
        1 + scenario.conventional.lightFixedWingAnnualGrowth,
        exponent,
      );
    const conventionalRotorcraftOperations =
      scenario.conventional.conventionalRotorcraftOperations *
      Math.pow(
        1 + scenario.conventional.conventionalRotorcraftAnnualGrowth,
        exponent,
      );

    const facilities = Object.fromEntries(
      AVIATION_FACILITY_CLASSES.map((facilityClass) => [
        facilityClass,
        emptyFacilityResult(facilityClass),
      ]),
    ) as Record<AviationFacilityClass, FacilityTrafficYearResult>;
    const economics = scenario.facilityEconomics;

    for (const facilityClass of AVIATION_FACILITY_CLASSES) {
      const facility = facilities[facilityClass];
      facility.conventionalBusinessJetOperations =
        conventionalBusinessJetOperations *
        economics.conventionalBusinessJetShares[facilityClass];
      facility.conventionalLightFixedWingOperations =
        conventionalLightFixedWingOperations *
        economics.conventionalLightFixedWingShares[facilityClass];
      facility.conventionalRotorcraftOperations =
        conventionalRotorcraftOperations *
        economics.conventionalRotorcraftShares[facilityClass];
      facility.conventionalOperations =
        facility.conventionalBusinessJetOperations +
        facility.conventionalLightFixedWingOperations +
        facility.conventionalRotorcraftOperations;
      facility.conventionalFboHandledOperations =
        facility.conventionalBusinessJetOperations *
          economics.fboCaptureOfBusinessJet[facilityClass] +
        facility.conventionalLightFixedWingOperations *
          economics.fboCaptureOfLightFixedWing[facilityClass] +
        facility.conventionalRotorcraftOperations *
          economics.fboCaptureOfRotorcraft[facilityClass];
      facility.fboHandledOperations =
        facility.conventionalFboHandledOperations;
      facility.conventionalFuelGallons =
        facility.conventionalBusinessJetOperations *
          economics.businessJetFuelGallonsPerOperation +
        facility.conventionalLightFixedWingOperations *
          economics.lightAircraftFuelGallonsPerOperation +
        facility.conventionalRotorcraftOperations *
          economics.rotorcraftFuelGallonsPerOperation;
    }

    const marketPassengerTrips: Record<AirMobilityMarket, number> = {
      'airport-shuttle': 0,
      regional: 0,
      urban: 0,
    };
    for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
      const energyKwhPerOperation =
        architecture === 'vtol'
          ? economics.vtolElectricityKwhPerOperation
          : architecture === 'stol'
            ? economics.stolElectricityKwhPerOperation
            : economics.ctolElectricityKwhPerOperation;
      for (const market of AIR_MOBILITY_MARKETS) {
        const flights = scratch[architecture].actualFlights[market];
        const passengerTrips =
          scratch[architecture].actualPassengerTrips[market];
        marketPassengerTrips[market] += passengerTrips;
        for (const facilityClass of AVIATION_FACILITY_CLASSES) {
          const endpointShare =
            scenario.facilityEndpointShares[architecture][market][
              facilityClass
            ];
          const operations = 2 * flights * endpointShare;
          const passengerMovements = 2 * passengerTrips * endpointShare;
          const facility = facilities[facilityClass];
          if (architecture === 'vtol') {
            facility.aamVtolOperations += operations;
          } else if (architecture === 'stol') {
            facility.aamStolOperations += operations;
          } else {
            facility.aamCtolOperations += operations;
          }
          facility.aamPassengerMovements += passengerMovements;
          facility.aamFboHandledOperations +=
            operations * economics.fboCaptureOfAam[facilityClass];
          facility.aamElectricityMwh +=
            (operations * energyKwhPerOperation) / 1_000;
        }
      }
    }

    for (const facilityClass of AVIATION_FACILITY_CLASSES) {
      const facility = facilities[facilityClass];
      facility.aamOperations =
        facility.aamVtolOperations +
        facility.aamStolOperations +
        facility.aamCtolOperations;
      facility.totalOperations =
        facility.conventionalOperations + facility.aamOperations;
      facility.fboHandledOperations =
        facility.conventionalFboHandledOperations +
        facility.aamFboHandledOperations;
    }

    const architectureResults = {} as Record<
      AirMobilityArchitecture,
      ArchitectureYearResult
    >;
    for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
      const row = scratch[architecture];
      const desired = AIR_MOBILITY_MARKETS.reduce(
        (sum, market) => sum + row.desiredFlights[market],
        0,
      );
      const actual = AIR_MOBILITY_MARKETS.reduce(
        (sum, market) => sum + row.actualFlights[market],
        0,
      );
      const passengerTrips = AIR_MOBILITY_MARKETS.reduce(
        (sum, market) => sum + row.actualPassengerTrips[market],
        0,
      );
      const fareWeight = AIR_MOBILITY_MARKETS.reduce(
        (sum, market) =>
          sum + row.actualPassengerTrips[market] * row.fares[market],
        0,
      );
      const limitingCapacity = Math.min(row.fleetCapacity, row.siteCapacity);
      const bindingConstraint: ArchitectureYearResult['bindingConstraint'] =
        desired <= limitingCapacity
          ? 'demand'
          : row.fleetCapacity <= row.siteCapacity
            ? 'fleet'
            : 'sites';
      architectureResults[architecture] = {
        architecture,
        annualDeliveries: row.deliveries,
        fleet: row.fleet,
        serviceSites: row.serviceSites,
        autonomyShare: row.autonomyShare,
        averageFarePerPassenger:
          passengerTrips > 0 ? fareWeight / passengerTrips : 0,
        desiredAnnualFlights: desired,
        fleetFlightCapacity: row.fleetCapacity,
        siteFlightCapacity: row.siteCapacity,
        actualAnnualFlights: actual,
        annualPassengerTrips: passengerTrips,
        capacityUtilization:
          limitingCapacity > 0 ? Math.min(1, actual / limitingCapacity) : 0,
        bindingConstraint,
      };
    }

    const totalAamFlights = AIR_MOBILITY_ARCHITECTURES.reduce(
      (sum, architecture) =>
        sum + architectureResults[architecture].actualAnnualFlights,
      0,
    );
    const totalAamPassengerTrips = AIR_MOBILITY_ARCHITECTURES.reduce(
      (sum, architecture) =>
        sum + architectureResults[architecture].annualPassengerTrips,
      0,
    );
    const totalAamFacilityOperations = sumFacilities(
      facilities,
      'aamOperations',
    );
    const expectedFacilityOperations = 2 * totalAamFlights;
    if (
      Math.abs(totalAamFacilityOperations - expectedFacilityOperations) >
      Math.max(1e-6, expectedFacilityOperations * 1e-10)
    ) {
      throw new Error(
        `AAM operation ledger failed in ${year}: ${totalAamFacilityOperations} ` +
          `facility operations versus ${expectedFacilityOperations} expected`,
      );
    }
    const vtolFlights = architectureResults.vtol.actualAnnualFlights;
    const runwayFlights =
      architectureResults.stol.actualAnnualFlights +
      architectureResults.ctol.actualAnnualFlights;

    const result: AviationInfrastructureYear = {
      year,
      autonomyShare: autonomous,
      architectures: architectureResults,
      facilities,
      marketPassengerTrips,
      conventionalBusinessJetOperations,
      conventionalLightFixedWingOperations,
      conventionalRotorcraftOperations,
      totalConventionalOperations:
        conventionalBusinessJetOperations +
        conventionalLightFixedWingOperations +
        conventionalRotorcraftOperations,
      totalAamFlights,
      totalAamPassengerTrips,
      totalAamFacilityOperations,
      vtolFlightShare: totalAamFlights > 0 ? vtolFlights / totalAamFlights : 0,
      runwayFlightShare:
        totalAamFlights > 0 ? runwayFlights / totalAamFlights : 0,
      totalFboHandledOperations: sumFacilities(
        facilities,
        'fboHandledOperations',
      ),
      totalConventionalFuelGallons: sumFacilities(
        facilities,
        'conventionalFuelGallons',
      ),
      totalAamElectricityMwh: sumFacilities(
        facilities,
        'aamElectricityMwh',
      ),
    };
    assertFiniteDeep(result, `aviation-infrastructure result ${year}`);
    years.push(result);
  }

  const firstYearAt = (threshold: number): number | null =>
    years.find((row) => row.totalAamFlights >= threshold)?.year ?? null;
  const ending = years.at(-1)!;
  return {
    scenario,
    years,
    firstHundredThousandAamFlightsYear: firstYearAt(100_000),
    firstMillionAamFlightsYear: firstYearAt(1_000_000),
    firstTenMillionAamFlightsYear: firstYearAt(10_000_000),
    majorityAutonomousYear:
      years.find((row) => row.autonomyShare >= 0.5)?.year ?? null,
    endingAamFlights: ending.totalAamFlights,
    endingAamPassengerTrips: ending.totalAamPassengerTrips,
    endingVtolFlightShare: ending.vtolFlightShare,
    endingRunwayFlightShare: ending.runwayFlightShare,
    endingFacilityAamOperations: Object.fromEntries(
      AVIATION_FACILITY_CLASSES.map((facilityClass) => [
        facilityClass,
        ending.facilities[facilityClass].aamOperations,
      ]),
    ) as Record<AviationFacilityClass, number>,
  };
}

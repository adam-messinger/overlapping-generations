import {
  aviationInfrastructureScenarios,
} from '../src/simulations/aviation-infrastructure/data.js';
import {
  bayAreaPrivateJetAirportProfiles,
  bayAreaPrivateJetScenarios,
  projectBayAreaPrivateJetTraffic,
  type BayAreaPrivateJetResult,
} from '../src/simulations/aviation-infrastructure/bay-area-private-jets.js';
import {
  simulateAviationInfrastructure,
} from '../src/simulations/aviation-infrastructure/model.js';

const forecastYears = [2025, 2030, 2035, 2040, 2045, 2050] as const;

const round = (value: number, digits = 3): number =>
  Number(value.toFixed(digits));

function atYear(
  result: BayAreaPrivateJetResult,
  year: number,
) {
  const row = result.years.find((candidate) => candidate.year === year);
  if (!row) throw new Error(`Scenario does not include ${year}`);
  return row;
}

const nationalContinuity = simulateAviationInfrastructure(
  aviationInfrastructureScenarios.continuity,
);
const runs = Object.fromEntries(
  Object.entries(bayAreaPrivateJetScenarios).map(([id, scenario]) => [
    id,
    projectBayAreaPrivateJetTraffic(nationalContinuity, scenario),
  ]),
) as Record<string, BayAreaPrivateJetResult>;
const central = runs.central;
const constrained = runs['gateway-constrained'];
const oakPlanningJetProxy = [
  {
    year: 2028,
    operations: 28_070 + 1_050 + 1_039,
  },
  {
    year: 2038,
    operations: 33_916 + 1_202 + 1_190,
  },
] as const;

const centralAirportForecasts = forecastYears.flatMap((year) => {
  const row = atYear(central, year);
  return bayAreaPrivateJetAirportProfiles.map((airport) => ({
    year,
    airport: airport.code,
    name: airport.name,
    role: airport.role,
    privateJetOperations: round(
      row.airports[airport.code].privateJetOperations,
      0,
    ),
    fboHandledOperations: round(
      row.airports[airport.code].fboHandledOperations,
      0,
    ),
    bayAreaTrafficShare: round(
      row.airports[airport.code].shareOfBayAreaPrivateJetOperations,
      4,
    ),
  }));
});

const central2050 = atYear(central, 2050);
const constrained2050 = atYear(constrained, 2050);
const gatewayAccessSensitivity2050 =
  bayAreaPrivateJetAirportProfiles.map((airport) => ({
    airport: airport.code,
    centralOperations: round(
      central2050.airports[airport.code].privateJetOperations,
      0,
    ),
    constrainedGatewayOperations: round(
      constrained2050.airports[airport.code].privateJetOperations,
      0,
    ),
    change: round(
      constrained2050.airports[airport.code].privateJetOperations -
        central2050.airports[airport.code].privateJetOperations,
      0,
    ),
  }));

const summary = {
  schemaVersion: 'tsimulation.aviation-bay-area-private-jets/v1',
  scenarioBoundary: {
    autonomousFlightIncluded: false,
    advancedAirMobilityIncluded: false,
    aircraft:
      'Conventional business/private jets as defined by the FAA ETMSC equipment-code category.',
    operation:
      'One arrival or one departure at an airport; a flight normally creates two airport operations.',
  },
  dataVintage:
    'FAA 2025 TAF archive published March 2026; FAA June 2026 Business Jet Report.',
  measurementStatus:
    'National traffic is FAA-observed. Bay Area total and individual-airport allocations are explicit scenario proxies pending an airport-level TFMSC Business Jet extract.',
  planningCrossChecks: {
    oak: {
      source:
        'OAK Comprehensive Aviation Activity Forecast, updated July 2022, Table 8-3.',
      definition:
        'Large business-aircraft operations plus the separately identified Phenom 100 and 300; this is a conservative jet proxy because the residual small-aircraft category can contain other jets.',
      rows: oakPlanningJetProxy.map((benchmark) => {
        const modeled = atYear(central, benchmark.year)
          .airports.OAK.privateJetOperations;
        return {
          year: benchmark.year,
          airportPlanningJetProxyOperations: benchmark.operations,
          modeledPrivateJetOperations: round(modeled, 0),
          modeledToPlanningRatio: round(modeled / benchmark.operations),
        };
      }),
    },
    hwd: {
      source:
        'Hayward Executive Airport Layout Plan Narrative Report, Table 4-11.',
      definition:
        'The local plan forecast 11,000 jet operations in 2020. Scaling its 35 based jets to the TAF 2024 count of 46 gives a deliberately simple stock cross-check, not an observation.',
      localPlan2020JetOperations: 11_000,
      tafBasedJets2020: 35,
      tafBasedJets2024: 46,
      stockScaledOperationCheck: round(11_000 * 46 / 35, 0),
      modeled2025PrivateJetOperations: round(
        atYear(central, 2025).airports.HWD.privateJetOperations,
        0,
      ),
    },
    sjcEventPeak: {
      source:
        'San Jose Mineta International Airport report for February 4–9, 2026.',
      privateJetOperationsOverSixDays: 900,
      eventOperationsPerDay: 150,
      modeled2026AverageOperationsPerDay: round(
        atYear(central, 2026).airports.SJC.privateJetOperations / 365.25,
        1,
      ),
      interpretation:
        'Event traffic is a peak-load diagnostic and must not be annualized.',
    },
  },
  centralAssumptions: {
    bayAreaShareOfUsBusinessJetOperations2025:
      bayAreaPrivateJetScenarios.central
        .bayAreaShareOfUsBusinessJetOperations,
    annualBayAreaShareDrift:
      bayAreaPrivateJetScenarios.central.annualBayAreaShareDrift,
    airportAllocation:
      'FAA TAF itinerant-GA and air-taxi paths, weighted by airport role and 2024 based-jet mix.',
    airportAccess:
      'Central case accepts the TAF relative airport path. A separate sensitivity reduces 2050 access retention to 65% at SFO, 90% at OAK, and 85% at SJC, then reallocates unchanged Bay Area demand.',
  },
  regionalDemandEnvelope: forecastYears.map((year) => ({
    year,
    lowerOperations: round(
      atYear(runs.lower, year).bayAreaPrivateJetOperations,
      0,
    ),
    centralOperations: round(
      atYear(central, year).bayAreaPrivateJetOperations,
      0,
    ),
    upperOperations: round(
      atYear(runs.upper, year).bayAreaPrivateJetOperations,
      0,
    ),
    centralFboHandledOperations: round(
      atYear(central, year).bayAreaFboHandledOperations,
      0,
    ),
  })),
  centralAirportForecasts,
  centralRanking2050: bayAreaPrivateJetAirportProfiles
    .map((airport) => ({
      airport: airport.code,
      name: airport.name,
      privateJetOperations: round(
        central2050.airports[airport.code].privateJetOperations,
        0,
      ),
      fboHandledOperations: round(
        central2050.airports[airport.code].fboHandledOperations,
        0,
      ),
      bayAreaTrafficShare: round(
        central2050.airports[airport.code]
          .shareOfBayAreaPrivateJetOperations,
        4,
      ),
    }))
    .sort((a, b) => b.privateJetOperations - a.privateJetOperations),
  gatewayAccessSensitivity2050,
};

console.log(JSON.stringify(summary, null, 2));

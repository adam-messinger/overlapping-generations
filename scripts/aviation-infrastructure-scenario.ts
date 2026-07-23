import {
  AVIATION_FACILITY_CLASSES,
  aviationInfrastructureScenarios,
} from '../src/simulations/aviation-infrastructure/data.js';
import {
  analyzeAviationSensitivity,
  backtestConventionalTraffic,
  evaluateEarlyAamBenchmark,
  naiveExtrapolatedAamFlights,
  projectPaloAltoTraffic,
} from '../src/simulations/aviation-infrastructure/calibration.js';
import {
  simulateAviationInfrastructure,
  type AviationInfrastructureResult,
} from '../src/simulations/aviation-infrastructure/model.js';

const forecastYears = [2030, 2035, 2040, 2045, 2050] as const;

const round = (value: number, digits = 3): number =>
  Number(value.toFixed(digits));

const millions = (value: number): number => round(value / 1_000_000);

function year(
  result: AviationInfrastructureResult,
  forecastYear: number,
) {
  const row = result.years.find((candidate) => candidate.year === forecastYear);
  if (!row) throw new Error(`Scenario does not include ${forecastYear}`);
  return row;
}

const runs = Object.fromEntries(
  Object.entries(aviationInfrastructureScenarios).map(([id, scenario]) => [
    id,
    simulateAviationInfrastructure(scenario),
  ]),
);
const central = runs['central-mixed'];
const backtest = backtestConventionalTraffic();
const earlyBenchmark = evaluateEarlyAamBenchmark();
const sensitivity = analyzeAviationSensitivity();

const scenarioForecasts = Object.fromEntries(
  Object.entries(runs).map(([id, result]) => [
    id,
    {
      firstMillionFlightsYear: result.firstMillionAamFlightsYear,
      firstTenMillionFlightsYear: result.firstTenMillionAamFlightsYear,
      majorityAutonomousYear: result.majorityAutonomousYear,
      years: forecastYears.map((forecastYear) => {
        const row = year(result, forecastYear);
        return {
          year: forecastYear,
          aamFlightsMillions: millions(row.totalAamFlights),
          passengerTripsMillions: millions(row.totalAamPassengerTrips),
          vtolFlightShare: round(row.vtolFlightShare),
          runwayFlightShare: round(row.runwayFlightShare),
          majorAirportAamOperationsMillions: millions(
            row.facilities['major-airport-fbo'].aamOperations,
          ),
          businessAviationAirportAamOperationsMillions: millions(
            row.facilities['business-aviation-fbo'].aamOperations,
          ),
          smallAirportAamOperationsMillions: millions(
            row.facilities['small-airport'].aamOperations,
          ),
          helipadAamOperationsMillions: millions(
            row.facilities['commercial-helipad'].aamOperations,
          ),
          newVertiportAamOperationsMillions: millions(
            row.facilities['new-vertiport'].aamOperations,
          ),
          incrementalFboHandledOperationsMillions: millions(
            Object.values(row.facilities).reduce(
              (sum, facility) => sum + facility.aamFboHandledOperations,
              0,
            ),
          ),
        };
      }),
    },
  ]),
);

const centralFacilityOutlook = forecastYears.flatMap((forecastYear) => {
  const row = year(central, forecastYear);
  return AVIATION_FACILITY_CLASSES.map((facilityClass) => {
    const facility = row.facilities[facilityClass];
    return {
      year: forecastYear,
      facilityClass,
      conventionalOperationsMillions: millions(
        facility.conventionalOperations,
      ),
      aamOperationsMillions: millions(facility.aamOperations),
      totalOperationsMillions: millions(facility.totalOperations),
      conventionalFboHandledOperationsMillions: millions(
        facility.conventionalFboHandledOperations,
      ),
      aamFboHandledOperationsMillions: millions(
        facility.aamFboHandledOperations,
      ),
      aamPassengerMovementsMillions: millions(
        facility.aamPassengerMovements,
      ),
    };
  });
});

const paloAlto = projectPaloAltoTraffic(central)
  .filter((row) =>
    forecastYears.includes(row.year as (typeof forecastYears)[number])
  )
  .map((row) => ({
    year: row.year,
    conventionalItinerantOperations: round(
      row.conventionalItinerantOperations,
      0,
    ),
    conventionalLocalOperations: round(row.conventionalLocalOperations, 0),
    aamOperations: round(row.aamOperations, 0),
    totalOperations: round(row.totalOperations, 0),
    aamShareOfOperations: round(row.aamShareOfOperations),
    practicalCapacityUtilization: round(row.practicalCapacityUtilization),
  }));

const summary = {
  schemaVersion: 'tsimulation.aviation-infrastructure/v1',
  dataVintage:
    'FAA TAF 2025; FAA Aerospace Forecast FY 2026–2046; FAA Business Jet Report June 2026',
  forecastStatus:
    'Conditional scenario forecast. Conventional traffic has frozen holdouts; AAM architecture, certification, autonomy, and facility capture do not.',
  iterationDiagnostics: {
    conventionalNaiveHoldoutMape: round(
      backtest.naiveMeanAbsolutePercentageError,
    ),
    conventionalSegmentedHoldoutMape: round(
      backtest.segmentedMeanAbsolutePercentageError,
    ),
    earlyAamVtolToAllUseFleetAbsoluteDifference: round(
      earlyBenchmark.meanVtolToAllUseFleetAbsolutePercentageDifference,
    ),
    earlyModeledToFaaUnconstrainedPassengerFlightRatio: round(
      earlyBenchmark.meanModeledToUnconstrainedPassengerFlightRatio,
    ),
    naive2050AamFlightsMillions: millions(
      naiveExtrapolatedAamFlights(2050),
    ),
    revisedCentral2050AamFlightsMillions: millions(
      central.endingAamFlights,
    ),
  },
  sensitivityRanking: sensitivity.map((row) => ({
    lever: row.lever,
    lower2040FlightsMillions: millions(row.lowerCase.annualFlights2040),
    central2040FlightsMillions: millions(row.centralAnnualFlights2040),
    upper2040FlightsMillions: millions(row.upperCase.annualFlights2040),
    lower2050FlightsMillions: millions(row.lowerCase.annualFlights2050),
    central2050FlightsMillions: millions(row.centralAnnualFlights2050),
    upper2050FlightsMillions: millions(row.upperCase.annualFlights2050),
    lowToHighSpreadAsShareOfCentral2050: round(
      row.spreadAroundCentral2050,
    ),
  })),
  scenarioForecasts,
  centralFacilityOutlook,
  paloAltoIllustration: {
    assumptions:
      'PAO attracts 0.25% of national small-airport AAM operations and has a 220,000-operation practical annual limit.',
    years: paloAlto,
  },
};

console.log(JSON.stringify(summary, null, 2));

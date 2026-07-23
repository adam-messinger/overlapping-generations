import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aviationInfrastructureScenarios,
  centralAviationScenario,
  type AviationInfrastructureScenario,
} from './data.js';
import {
  analyzeAviationSensitivity,
  backtestConventionalTraffic,
  evaluateEarlyAamBenchmark,
  naiveExtrapolatedAamFlights,
  projectPaloAltoTraffic,
} from './calibration.js';
import {
  simulateAviationInfrastructure,
  type AviationInfrastructureResult,
} from './model.js';

const central = simulateAviationInfrastructure(centralAviationScenario);

function atYear(
  result: AviationInfrastructureResult,
  year: number,
) {
  const row = result.years.find((candidate) => candidate.year === year);
  assert.ok(row, `missing ${year}`);
  return row;
}

test('segmented conventional baseline improves the frozen traffic holdout', () => {
  const score = backtestConventionalTraffic();
  assert.equal(score.rows.length, 8);
  assert.ok(
    score.segmentedMeanAbsolutePercentageError <
      score.naiveMeanAbsolutePercentageError,
  );
  assert.ok(score.segmentedMeanAbsolutePercentageError < 0.03);
  assert.ok(score.naiveMeanAbsolutePercentageError > 0.05);
});

test('early passenger ramp is benchmarked without treating cargo as passenger demand', () => {
  const benchmark = evaluateEarlyAamBenchmark();
  assert.equal(benchmark.rows.length, 6);
  assert.ok(
    benchmark.meanVtolToAllUseFleetAbsolutePercentageDifference < 0.15,
  );
  assert.ok(
    benchmark.meanModeledToUnconstrainedPassengerFlightRatio > 0.5,
  );
  assert.ok(
    benchmark.meanModeledToUnconstrainedPassengerFlightRatio < 1,
  );
});

test('each flight creates exactly two facility operations', () => {
  for (const row of central.years) {
    assert.ok(
      Math.abs(row.totalAamFacilityOperations - 2 * row.totalAamFlights) <
        Math.max(1e-6, row.totalAamFacilityOperations * 1e-10),
    );
    const facilityOperations = Object.values(row.facilities)
      .reduce((sum, facility) => sum + facility.aamOperations, 0);
    assert.ok(
      Math.abs(facilityOperations - row.totalAamFacilityOperations) <
        Math.max(1e-6, row.totalAamFacilityOperations * 1e-10),
    );
  }
});

test('FBO capture remains a service subset, not a synonym for airport traffic', () => {
  const row = atYear(central, 2040);
  const airport = row.facilities['business-aviation-fbo'];
  assert.ok(airport.fboHandledOperations < airport.totalOperations);
  assert.ok(airport.fboHandledOperations > 0);
  assert.equal(
    airport.fboHandledOperations,
    airport.conventionalFboHandledOperations +
      airport.aamFboHandledOperations,
  );
  assert.ok(airport.aamFboHandledOperations > 0);
  assert.ok(row.totalFboHandledOperations < row.totalConventionalOperations +
    row.totalAamFacilityOperations);
});

test('architecture branches move traffic toward the facilities they can use', () => {
  const vtol = simulateAviationInfrastructure(
    aviationInfrastructureScenarios['autonomous-vtol'],
  );
  const runway = simulateAviationInfrastructure(
    aviationInfrastructureScenarios['autonomous-runway'],
  );
  const vtol2035 = atYear(vtol, 2035);
  const runway2035 = atYear(runway, 2035);

  assert.ok(vtol2035.vtolFlightShare > 0.85);
  assert.ok(runway2035.runwayFlightShare > 0.90);
  assert.ok(
    vtol2035.facilities['commercial-helipad'].aamOperations >
      runway2035.facilities['commercial-helipad'].aamOperations * 5,
  );
  assert.ok(
    runway2035.facilities['small-airport'].aamOperations >
      vtol2035.facilities['small-airport'].aamOperations * 3,
  );
});

test('continuity, delayed, and autonomy cases retain meaningful scale ordering', () => {
  const continuity = simulateAviationInfrastructure(
    aviationInfrastructureScenarios.continuity,
  );
  const delayed = simulateAviationInfrastructure(
    aviationInfrastructureScenarios['slow-certification'],
  );
  const vtol = simulateAviationInfrastructure(
    aviationInfrastructureScenarios['autonomous-vtol'],
  );
  const runway = simulateAviationInfrastructure(
    aviationInfrastructureScenarios['autonomous-runway'],
  );

  assert.equal(continuity.endingAamFlights, 0);
  assert.ok(delayed.endingAamFlights < central.endingAamFlights);
  assert.ok(vtol.endingAamFlights > central.endingAamFlights);
  assert.ok(runway.endingAamFlights > central.endingAamFlights);
  assert.equal(central.firstMillionAamFlightsYear, 2034);
  assert.equal(central.firstTenMillionAamFlightsYear, 2043);
  assert.ok(central.endingAamFlights < naiveExtrapolatedAamFlights(2050));
});

test('sensitivity scan ranks structural levers without treating them as probabilities', () => {
  const sensitivity = analyzeAviationSensitivity();
  assert.equal(sensitivity.length, 6);
  assert.ok(
    sensitivity.every((row) =>
      row.lowerCase.annualFlights2050 <= row.centralAnnualFlights2050 &&
      row.upperCase.annualFlights2050 >= row.centralAnnualFlights2050
    ),
  );
  assert.ok(
    sensitivity[0].spreadAroundCentral2050 >=
      sensitivity.at(-1)!.spreadAroundCentral2050,
  );
});

test('Palo Alto overlay enforces an explicit practical airport capacity', () => {
  const projection = projectPaloAltoTraffic(central);
  const ending = projection.at(-1)!;
  assert.ok(ending.aamOperations > 0);
  assert.ok(ending.totalOperations <= 220_000);
  assert.ok(ending.practicalCapacityUtilization < 1);

  const constrained = projectPaloAltoTraffic(central, {
    practicalAnnualOperations: 170_000,
  }).at(-1)!;
  assert.equal(constrained.totalOperations, 170_000);
  assert.ok(constrained.aamOperations < ending.aamOperations);
});

test('invalid endpoint allocations are rejected', () => {
  const invalid = structuredClone(
    centralAviationScenario,
  ) as AviationInfrastructureScenario;
  invalid.facilityEndpointShares.vtol.urban['commercial-helipad'] = 0.75;
  assert.throws(
    () => simulateAviationInfrastructure(invalid),
    /must sum to 1/,
  );
});

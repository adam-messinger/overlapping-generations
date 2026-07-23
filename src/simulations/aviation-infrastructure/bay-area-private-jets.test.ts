import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aviationInfrastructureScenarios,
  centralAviationScenario,
} from './data.js';
import {
  bayAreaPrivateJetAirportProfiles,
  bayAreaPrivateJetScenarios,
  projectBayAreaPrivateJetTraffic,
} from './bay-area-private-jets.js';
import { simulateAviationInfrastructure } from './model.js';

const continuity = simulateAviationInfrastructure(
  aviationInfrastructureScenarios.continuity,
);
const central = projectBayAreaPrivateJetTraffic(continuity);

function atYear(year: number) {
  const row = central.years.find((candidate) => candidate.year === year);
  assert.ok(row, `missing ${year}`);
  return row;
}

test('Bay Area PJ scenario excludes autonomy and AAM by construction', () => {
  assert.equal(central.autonomousFlightIncluded, false);
  assert.equal(central.advancedAirMobilityIncluded, false);
  assert.equal(
    central.allocationStatus,
    'scenario-proxy-not-airport-level-etmsc-observation',
  );
  assert.throws(
    () =>
      projectBayAreaPrivateJetTraffic(
        simulateAviationInfrastructure(centralAviationScenario),
      ),
    /requires a continuity run/,
  );
});

test('airport allocations exactly reconcile to Bay Area PJ operations', () => {
  for (const row of central.years) {
    const airportTotal = Object.values(row.airports).reduce(
      (sum, airport) => sum + airport.privateJetOperations,
      0,
    );
    assert.ok(
      Math.abs(airportTotal - row.bayAreaPrivateJetOperations) <
        row.bayAreaPrivateJetOperations * 1e-10,
    );
    assert.ok(row.bayAreaFboHandledOperations < airportTotal);
  }
});

test('demand bounds bracket the central regional path', () => {
  const lower = projectBayAreaPrivateJetTraffic(
    continuity,
    bayAreaPrivateJetScenarios.lower,
  );
  const upper = projectBayAreaPrivateJetTraffic(
    continuity,
    bayAreaPrivateJetScenarios.upper,
  );
  assert.ok(lower.endingPrivateJetOperations < central.endingPrivateJetOperations);
  assert.ok(upper.endingPrivateJetOperations > central.endingPrivateJetOperations);
});

test('gateway constraint redistributes rather than destroys regional demand', () => {
  const constrained = projectBayAreaPrivateJetTraffic(
    continuity,
    bayAreaPrivateJetScenarios['gateway-constrained'],
  );
  const baseline2050 = atYear(2050);
  const constrained2050 = constrained.years.at(-1)!;
  assert.ok(
    Math.abs(
      constrained2050.bayAreaPrivateJetOperations -
        baseline2050.bayAreaPrivateJetOperations,
    ) < 1e-6,
  );
  for (const code of ['SFO', 'OAK', 'SJC'] as const) {
    assert.ok(
      constrained2050.airports[code].privateJetOperations <
        baseline2050.airports[code].privateJetOperations,
    );
  }
  const relieverCodes = bayAreaPrivateJetAirportProfiles
    .filter((airport) => airport.role === 'business-reliever')
    .map((airport) => airport.code);
  const relieverTotal = (
    result: typeof baseline2050,
  ) =>
    relieverCodes.reduce(
      (sum, code) => sum + result.airports[code].privateJetOperations,
      0,
    );
  assert.ok(relieverTotal(constrained2050) > relieverTotal(baseline2050));
});

test('affluent short-runway catchments do not become conventional PJ hubs', () => {
  const ending = atYear(2050);
  const limitedShare = bayAreaPrivateJetAirportProfiles
    .filter((airport) => airport.role === 'limited-business-jet')
    .reduce(
      (sum, airport) =>
        sum + ending.airports[airport.code].shareOfBayAreaPrivateJetOperations,
      0,
    );
  assert.ok(limitedShare < 0.08);
  assert.ok(
    ending.airports.PAO.privateJetOperations <
      ending.airports.HWD.privateJetOperations * 0.15,
  );
  assert.ok(
    ending.airports.SQL.privateJetOperations <
      ending.airports.SJC.privateJetOperations * 0.15,
  );
});

import { expect, printSummary, test } from '../../test-utils.js';
import {
  evaluatePanel,
  historicalResiduals,
  makeForecast,
  scoreForecast,
} from './probabilistic.js';
import {
  cdcRespiratoryObservations,
  respiratoryPanel,
} from './rolling-data.js';
import {
  outbreakResolutionAdapter,
  runOutbreakResolutionAdapter,
} from './forecast-bridge.js';

const holdout = evaluatePanel(respiratoryPanel, 'holdout');

test('frozen CDC panel has consecutive weekly rows and explicit RSV missingness', () => {
  expect(cdcRespiratoryObservations).toHaveLength(252);
  expect(cdcRespiratoryObservations[0].weekEnding).toBe('2020-08-08');
  expect(cdcRespiratoryObservations.at(-1)?.weekEnding).toBe('2025-05-31');
  expect(cdcRespiratoryObservations[0].rsv).toBe(null);
  expect(respiratoryPanel.find((row) => row.id === 'rsv')?.admissions.length).toBe(87);
  for (let index = 1; index < cdcRespiratoryObservations.length; index++) {
    const prior = new Date(`${cdcRespiratoryObservations[index - 1].weekEnding}T00:00:00Z`);
    const current = new Date(`${cdcRespiratoryObservations[index].weekEnding}T00:00:00Z`);
    expect((current.getTime() - prior.getTime()) / 86_400_000).toBe(7);
  }
});

test('rolling forecast cannot see observations after its origin', () => {
  const values = respiratoryPanel[0].admissions;
  const origin = 150;
  const original = makeForecast(values, 'adaptive-ensemble', origin, 4);
  const changed = values.map((value, index) => (index > origin ? value * 1_000 : value));
  const afterMutation = makeForecast(changed, 'adaptive-ensemble', origin, 4);
  expect(afterMutation.pointLog).toBe(original.pointLog);
  expect(afterMutation.quantilesLog).toEqual(original.quantilesLog);
});

test('rolling forecast supports a genuinely future target', () => {
  const values = respiratoryPanel[0].admissions;
  const origin = values.length - 1;
  const future = makeForecast(values, 'adaptive-ensemble', origin, 4);
  const padded = makeForecast([...values, 0, 0, 0, 0], 'adaptive-ensemble', origin, 4);
  expect(future.pointLog).toBe(padded.pointLog);
  expect(future.quantilesLog).toEqual(padded.quantilesLog);
  expect(future.targetIndex).toBe(origin + 4);
  expect(() =>
    makeForecast(values, 'adaptive-ensemble', values.length, 4)
  ).toThrow('Forecast origin is outside series');
});

test('resolution adapter converts counts and records the measurement-regime bridge', () => {
  const log100 = Math.log1p(100);
  const resolution = runOutbreakResolutionAdapter({
    correction: 0.94,
    forecast: {
      model: 'persistence',
      originIndex: 10,
      targetIndex: 11,
      horizon: 1,
      pointLog: log100,
      quantilesLog: {
        0.025: log100,
        0.25: log100,
        0.5: log100,
        0.75: log100,
        0.975: log100,
      },
    },
  });
  expect(resolution.point).toBeCloseTo(94, 12);
  expect(resolution.quantiles[0.5]).toBeCloseTo(94, 12);
  expect(
    outbreakResolutionAdapter.portMappings[0].measurementCrosswalk?.id,
  ).toBe(
    'measurement-crosswalk.outbreak.operational-to-fixed-initial-admissions',
  );
});

test('exported historical residuals validate their origin and remain leakage-safe', () => {
  const values = respiratoryPanel[0].admissions;
  const origin = 150;
  const original = historicalResiduals(values, 'adaptive-ensemble', origin, 4);
  const changed = values.map((value, index) => (index > origin ? value * 1_000 : value));
  expect(historicalResiduals(changed, 'adaptive-ensemble', origin, 4)).toEqual(original);
  expect(() =>
    historicalResiduals(values, 'adaptive-ensemble', 5, 4)
  ).toThrow('Forecast origin needs at least seven observations');
  expect(() =>
    historicalResiduals(values, 'adaptive-ensemble', values.length, 4)
  ).toThrow('Forecast origin is outside series');
});

test('WIS is zero for a point-perfect degenerate forecast', () => {
  const observed = 99;
  const logObserved = Math.log1p(observed);
  const score = scoreForecast(
    {
      model: 'persistence',
      originIndex: 10,
      targetIndex: 11,
      horizon: 1,
      pointLog: logObserved,
      quantilesLog: {
        0.025: logObserved,
        0.25: logObserved,
        0.5: logObserved,
        0.75: logObserved,
        0.975: logObserved,
      },
    },
    observed,
  );
  expect(score.wis).toBe(0);
});

test('adaptive ensemble beats persistence on every pathogen holdout', () => {
  for (const pathogen of holdout.pathogens) {
    expect(pathogen.models['adaptive-ensemble'].wis).toBeLessThan(
      pathogen.models.persistence.wis,
    );
  }
});

test('adaptive revision improves macro WIS and 95% coverage on the frozen holdout', () => {
  expect(holdout.macroAverage['adaptive-ensemble'].wis).toBeLessThan(
    holdout.macroAverage['local-trend'].wis,
  );
  expect(holdout.macroAverage['adaptive-ensemble'].coverage95).toBeGreaterThan(
    holdout.macroAverage.persistence.coverage95,
  );
});

printSummary();

import { test, expect } from '../test-utils.js';
import { capitalDefaults } from '../modules/capital.js';
import { advanceCapitalFinance } from '../modules/capital-finance.js';
import {
  analyzeFinancialLocalStability,
  compareFinancialTimesteps,
  scanDebtRatioBasin,
} from './financial-stability.js';

const point = {
  state: {
    publicDebt: 0.9 * 158,
    privateDebt: 1.6 * 158,
    previousGdp: 158,
  },
  inputs: { gdp: 158, capitalStock: 553 },
  params: capitalDefaults,
};

test('baseline debt map exposes a finite local Jacobian and spectral radius', () => {
  const result = analyzeFinancialLocalStability(point);
  expect(Number.isFinite(result.analysis.spectralRadius)).toBeTrue();
  expect(result.analysis.jacobian.length).toBe(2);
  expect(result.analysis.spectralRadius).toBeLessThan(1.1);
});

test('debt-free operating points use right-hand debt derivatives', () => {
  const boundaryPoint = {
    ...point,
    state: { ...point.state, publicDebt: 0, privateDebt: 0 },
  };
  const result = analyzeFinancialLocalStability(boundaryPoint);
  const step = 1e-6;
  const evaluate = (publicDebt: number, privateDebt: number) =>
    advanceCapitalFinance(
      { ...boundaryPoint.state, publicDebt, privateDebt },
      boundaryPoint.inputs,
      boundaryPoint.params,
    ).state;
  const base = evaluate(0, 0);
  const publicPerturbation = evaluate(step, 0);
  const privatePerturbation = evaluate(0, step);
  const expected = [
    [
      (publicPerturbation.publicDebt - base.publicDebt) / step,
      (privatePerturbation.publicDebt - base.publicDebt) / step,
    ],
    [
      (publicPerturbation.privateDebt - base.privateDebt) / step,
      (privatePerturbation.privateDebt - base.privateDebt) / step,
    ],
  ];
  expect(result.analysis.jacobian[0][0]).toBeCloseTo(expected[0][0], 8);
  expect(result.analysis.jacobian[0][1]).toBeCloseTo(expected[0][1], 8);
  expect(result.analysis.jacobian[1][0]).toBeCloseTo(expected[1][0], 8);
  expect(result.analysis.jacobian[1][1]).toBeCloseTo(expected[1][1], 8);
});

test('quarterly integration is closer to monthly than annual integration', () => {
  const rows = compareFinancialTimesteps(point);
  expect(rows.length).toBe(3);
  expect(rows[1].privateDebtRelativeError)
    .toBeLessThan(rows[0].privateDebtRelativeError);
  expect(rows[2].privateDebtRelativeError).toBeCloseTo(0, 12);
});

test('debt basin scan classifies every requested initial condition', () => {
  const cells = scanDebtRatioBasin(
    { inputs: point.inputs, params: point.params },
    {
      publicDebtRatios: [0.5, 1, 2],
      privateDebtRatios: [0.5, 1.5, 3],
      years: 20,
    },
  );
  expect(cells.length).toBe(9);
  expect(cells.every((cell) => Number.isFinite(cell.maximumTotalDebtGDP))).toBeTrue();
});

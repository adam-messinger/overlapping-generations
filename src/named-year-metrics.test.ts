/**
 * Named-Year Metric Tests
 *
 * A metric naming a calendar year must report that year, or report that it
 * has no value — never some other year's number under the wrong label.
 */

import { runSimulation } from './simulation.js';
import { test, expect, printSummary } from './test-utils.js';

test('the default horizon reports the years it names', () => {
  const { results, metrics } = runSimulation();
  const row = (year: number) => results.find(r => r.year === year)!;

  expect(metrics.gdp2100).toBe(row(2100).gdp);
  expect(metrics.gdp2050).toBe(row(2050).gdp);
  expect(metrics.warming2100).toBe(row(2100).temperature);
  expect(metrics.warming2050).toBe(row(2050).temperature);
  expect(metrics.population2100).toBe(row(2100).population);
});

test('a run that stops early has no value for years it did not reach', () => {
  // Previously gdp2100 was the last row's GDP — 2030's value under a 2100
  // label — and gdp2050 was 0, which reads as a real reading of zero.
  const { metrics } = runSimulation({ endYear: 2030 } as any);

  expect(metrics.gdp2100).toBe(undefined);
  expect(metrics.gdp2050).toBe(undefined);
  expect(metrics.warming2100).toBe(undefined);
  expect(metrics.warming2050).toBe(undefined);
  expect(metrics.population2100).toBe(undefined);
  expect(metrics.kY2050).toBe(undefined);
});

test('terminal metrics report the end of the run, whatever year that is', () => {
  const short = runSimulation({ endYear: 2030 } as any);
  expect(short.metrics.terminalYear).toBe(2030);
  expect(short.metrics.gdpTerminal).toBe(short.results[short.results.length - 1].gdp);

  const full = runSimulation();
  expect(full.metrics.terminalYear).toBe(2100);
  expect(full.metrics.gdpTerminal).toBe(full.metrics.gdp2100!);
  expect(full.metrics.warmingTerminal).toBe(full.metrics.warming2100!);
});

test('a horizon past 2100 still reports 2100 for the 2100 metrics', () => {
  const { results, metrics } = runSimulation({ endYear: 2120 } as any);
  const row2100 = results.find(r => r.year === 2100)!;

  expect(metrics.gdp2100).toBe(row2100.gdp);
  expect(metrics.warming2100).toBe(row2100.temperature);
  // The run continues past the named year, so terminal and named differ.
  expect(metrics.terminalYear).toBe(2120);
  expect(metrics.gdpTerminal !== metrics.gdp2100).toBeTrue();
});

printSummary();

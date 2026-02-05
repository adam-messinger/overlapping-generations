/**
 * Result Helpers
 *
 * Convenience functions for extracting data from simulation results.
 */

import type { SimulationResult, YearResult } from './simulation.js';

/**
 * Get the result for a specific year.
 *
 * @param result - Simulation result
 * @param year - Year to look up (e.g., 2050)
 * @returns YearResult or undefined if year not in range
 */
export function getAtYear(result: SimulationResult, year: number): YearResult | undefined {
  return result.results.find(r => r.year === year);
}

/**
 * Extract a time series for a specific numeric field.
 *
 * @param result - Simulation result
 * @param field - Field name from YearResult (e.g., 'temperature', 'gdp')
 * @returns Object with years and values arrays
 */
export function extractTimeSeries(
  result: SimulationResult,
  field: keyof YearResult
): { years: number[]; values: number[] } {
  const years: number[] = [];
  const values: number[] = [];

  for (const r of result.results) {
    const val = r[field];
    if (typeof val === 'number') {
      years.push(r.year);
      values.push(val);
    }
  }

  return { years, values };
}

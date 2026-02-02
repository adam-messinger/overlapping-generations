/**
 * Time series storage and query helpers
 *
 * Provides the query functions like firstYear(), crossover(), valueAt()
 * that exist in the current energy-sim.js
 */

import { Year, YearIndex, Region } from './types';
import { SimulationResults } from './simulation';

/**
 * Time series type
 */
export type TimeSeries<T> = T[];

/**
 * Query result for crossover detection
 */
export interface CrossoverResult {
  year: Year | null;
  direction: 'rising' | 'falling' | null;
  values: { a: number; b: number } | null;
}

/**
 * Query helper functions
 */
export const query = {
  /**
   * Find first year where series exceeds a threshold
   */
  firstYearAbove(
    results: SimulationResults,
    moduleName: string,
    outputKey: string,
    threshold: number
  ): Year | null {
    const series = results.modules[moduleName]?.[outputKey];
    if (!series) return null;

    for (let i = 0; i < series.length; i++) {
      if (series[i] > threshold) {
        return results.years[i];
      }
    }
    return null;
  },

  /**
   * Find first year where series drops below a threshold
   */
  firstYearBelow(
    results: SimulationResults,
    moduleName: string,
    outputKey: string,
    threshold: number
  ): Year | null {
    const series = results.modules[moduleName]?.[outputKey];
    if (!series) return null;

    for (let i = 0; i < series.length; i++) {
      if (series[i] < threshold) {
        return results.years[i];
      }
    }
    return null;
  },

  /**
   * Find year when series A crosses series B
   */
  crossover(
    results: SimulationResults,
    moduleA: string,
    keyA: string,
    moduleB: string,
    keyB: string
  ): CrossoverResult {
    const seriesA = results.modules[moduleA]?.[keyA];
    const seriesB = results.modules[moduleB]?.[keyB];

    if (!seriesA || !seriesB) {
      return { year: null, direction: null, values: null };
    }

    for (let i = 1; i < seriesA.length; i++) {
      const prevDiff = seriesA[i - 1] - seriesB[i - 1];
      const currDiff = seriesA[i] - seriesB[i];

      // Sign change indicates crossover
      if (prevDiff <= 0 && currDiff > 0) {
        return {
          year: results.years[i],
          direction: 'rising',
          values: { a: seriesA[i], b: seriesB[i] },
        };
      }
      if (prevDiff >= 0 && currDiff < 0) {
        return {
          year: results.years[i],
          direction: 'falling',
          values: { a: seriesA[i], b: seriesB[i] },
        };
      }
    }

    return { year: null, direction: null, values: null };
  },

  /**
   * Get value at a specific year
   */
  valueAt(
    results: SimulationResults,
    moduleName: string,
    outputKey: string,
    year: Year
  ): number | null {
    const series = results.modules[moduleName]?.[outputKey];
    if (!series) return null;

    const idx = results.years.indexOf(year);
    if (idx === -1) return null;

    return series[idx];
  },

  /**
   * Get value at a specific year index
   */
  valueAtIndex(
    results: SimulationResults,
    moduleName: string,
    outputKey: string,
    index: YearIndex
  ): number | null {
    const series = results.modules[moduleName]?.[outputKey];
    if (!series || index < 0 || index >= series.length) return null;
    return series[index];
  },

  /**
   * Find year of peak value
   */
  peakYear(
    results: SimulationResults,
    moduleName: string,
    outputKey: string
  ): { year: Year; value: number } | null {
    const series = results.modules[moduleName]?.[outputKey];
    if (!series || series.length === 0) return null;

    let maxIdx = 0;
    let maxVal = series[0];

    for (let i = 1; i < series.length; i++) {
      if (series[i] > maxVal) {
        maxVal = series[i];
        maxIdx = i;
      }
    }

    return { year: results.years[maxIdx], value: maxVal };
  },

  /**
   * Find year of minimum value
   */
  minYear(
    results: SimulationResults,
    moduleName: string,
    outputKey: string
  ): { year: Year; value: number } | null {
    const series = results.modules[moduleName]?.[outputKey];
    if (!series || series.length === 0) return null;

    let minIdx = 0;
    let minVal = series[0];

    for (let i = 1; i < series.length; i++) {
      if (series[i] < minVal) {
        minVal = series[i];
        minIdx = i;
      }
    }

    return { year: results.years[minIdx], value: minVal };
  },

  /**
   * Calculate cumulative sum of a series
   */
  cumulative(
    results: SimulationResults,
    moduleName: string,
    outputKey: string
  ): TimeSeries<number> | null {
    const series = results.modules[moduleName]?.[outputKey];
    if (!series) return null;

    const result: number[] = [];
    let sum = 0;
    for (const val of series) {
      sum += val;
      result.push(sum);
    }
    return result;
  },

  /**
   * Calculate per-capita values given population series
   */
  perCapita(
    results: SimulationResults,
    valueMod: string,
    valueKey: string,
    popMod: string,
    popKey: string
  ): TimeSeries<number> | null {
    const values = results.modules[valueMod]?.[valueKey];
    const pop = results.modules[popMod]?.[popKey];

    if (!values || !pop) return null;

    return values.map((v, i) => v / (pop[i] || 1));
  },

  /**
   * Get a slice of years
   */
  slice(
    results: SimulationResults,
    moduleName: string,
    outputKey: string,
    startYear: Year,
    endYear: Year
  ): { years: Year[]; values: number[] } | null {
    const series = results.modules[moduleName]?.[outputKey];
    if (!series) return null;

    const startIdx = results.years.indexOf(startYear);
    const endIdx = results.years.indexOf(endYear);

    if (startIdx === -1 || endIdx === -1) return null;

    return {
      years: results.years.slice(startIdx, endIdx + 1),
      values: series.slice(startIdx, endIdx + 1),
    };
  },

  /**
   * Calculate average over a period
   */
  average(
    results: SimulationResults,
    moduleName: string,
    outputKey: string,
    startYear?: Year,
    endYear?: Year
  ): number | null {
    const series = results.modules[moduleName]?.[outputKey];
    if (!series || series.length === 0) return null;

    const startIdx = startYear ? results.years.indexOf(startYear) : 0;
    const endIdx = endYear ? results.years.indexOf(endYear) : series.length - 1;

    if (startIdx === -1 || endIdx === -1) return null;

    const slice = series.slice(startIdx, endIdx + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  },
};

/**
 * Derive commonly needed metrics from raw results
 */
export function deriveMetrics(results: SimulationResults): Record<string, any> {
  // This would compute things like:
  // - warming2100
  // - peakEmissionsYear
  // - solarCrossesGas
  // - gridBelow100
  // etc.

  const metrics: Record<string, any> = {};

  // Example derivations (actual implementation would be more complete)
  const warming2100 = query.valueAt(results, 'climate', 'temperature', 2100);
  if (warming2100 !== null) {
    metrics.warming2100 = warming2100;
  }

  const peakEmissions = query.peakYear(results, 'climate', 'emissions');
  if (peakEmissions) {
    metrics.peakEmissionsYear = peakEmissions.year;
    metrics.peakEmissionsValue = peakEmissions.value;
  }

  const solarCrossesGas = query.crossover(
    results,
    'energy', 'solarLCOE',
    'energy', 'gasLCOE'
  );
  if (solarCrossesGas.year) {
    metrics.solarCrossesGas = solarCrossesGas.year;
  }

  const gridBelow100 = query.firstYearBelow(results, 'dispatch', 'gridIntensity', 100);
  if (gridBelow100) {
    metrics.gridBelow100 = gridBelow100;
  }

  return metrics;
}

/**
 * Time series store for building results incrementally
 */
export class TimeSeriesStore {
  private data: Map<string, Map<string, any[]>> = new Map();
  private years: Year[] = [];

  addYear(year: Year): void {
    this.years.push(year);
  }

  set(moduleName: string, key: string, value: any): void {
    if (!this.data.has(moduleName)) {
      this.data.set(moduleName, new Map());
    }
    const modData = this.data.get(moduleName)!;
    if (!modData.has(key)) {
      modData.set(key, []);
    }
    modData.get(key)!.push(value);
  }

  toResults(): SimulationResults {
    const modules: Record<string, Record<string, any[]>> = {};
    for (const [modName, modData] of this.data) {
      modules[modName] = {};
      for (const [key, values] of modData) {
        modules[modName][key] = values;
      }
    }
    return { years: this.years, modules };
  }
}

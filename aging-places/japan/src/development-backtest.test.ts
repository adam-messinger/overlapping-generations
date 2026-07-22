import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, printSummary, test } from '../../../src/test-utils.js';

console.log('\n=== Japan Development Backtest Tests ===\n');

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = JSON.parse(
  fs.readFileSync(path.join(JAPAN_DIR, 'data', 'development-demography.json'), 'utf8'),
) as {
  holdoutStatus: string;
  developmentGate: {
    status: string;
    windows: Record<string, {
      partialBeatsNoMigrationWorkingAgeMae: boolean;
      partialBeatsLaggedPopulationWithinMarketWithCiAboveZero: boolean;
      fullBeatsLaggedPopulationWithinMarketWithCiAboveZero: boolean;
      fullHouseholdAndLaggedHouseholdGateAvailable: boolean;
      fullHouseholdBeatsLaggedOnMaeAndRank: boolean | null;
    }>;
  };
  windows: Array<{
    window: string;
    partialMechanism: {
      allocation: { conservationError: number };
      workingAge: {
        absoluteMaeAllPartialPrimary: {
          conditionalPartialMechanismAllocation: number;
          conditionalDemographicSameSample: number;
          nationallyScaledNoMigrationSameSample: number;
        };
        partialMechanismMinusLaggedPopulation: { ci95: [number, number] };
      };
    };
  }>;
};

test('development report distinguishes its input boundary from live holdout status', () => {
  expect(report.holdoutStatus.includes('this script reads no outcome after 2020')).toBeTrue();
  expect(report.holdoutStatus.includes('live split-holdout state')).toBeTrue();
});

test('partial mechanism improves absolute working-age error in both windows', () => {
  expect(report.windows.length).toBe(2);
  for (const window of report.windows) {
    const mae = window.partialMechanism.workingAge.absoluteMaeAllPartialPrimary;
    expect(mae.conditionalPartialMechanismAllocation)
      .toBeLessThan(mae.conditionalDemographicSameSample);
    expect(mae.conditionalPartialMechanismAllocation)
      .toBeLessThan(mae.nationallyScaledNoMigrationSameSample);
    expect(Math.abs(window.partialMechanism.allocation.conservationError)).toBeLessThan(1e-6);
  }
});

test('international-validation gate fails honestly against lagged population', () => {
  expect(report.developmentGate.status).toBe('fail; remain scenario tooling');
  for (const window of report.windows) {
    const lower = window.partialMechanism.workingAge
      .partialMechanismMinusLaggedPopulation.ci95[0];
    expect(lower).toBeLessThan(0);
    const gate = report.developmentGate.windows[window.window];
    expect(gate.partialBeatsNoMigrationWorkingAgeMae).toBeTrue();
    expect(gate.partialBeatsLaggedPopulationWithinMarketWithCiAboveZero).toBeFalse();
    expect(gate.fullBeatsLaggedPopulationWithinMarketWithCiAboveZero).toBeFalse();
    if (window.window === '2015-2020') {
      expect(gate.fullHouseholdAndLaggedHouseholdGateAvailable).toBeTrue();
      expect(gate.fullHouseholdBeatsLaggedOnMaeAndRank).toBeFalse();
    } else {
      expect(gate.fullHouseholdAndLaggedHouseholdGateAvailable).toBeFalse();
      expect(gate.fullHouseholdBeatsLaggedOnMaeAndRank).toBe(null);
    }
  }
});

printSummary();

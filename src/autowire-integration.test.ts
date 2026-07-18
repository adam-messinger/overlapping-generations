/**
 * Integration test for the autowired energy simulation.
 *
 * Lives with the domain (not in the tsimulation framework package) because it
 * exercises the full module set. Verifies that the energy-system overhead —
 * energy spent building and running the energy system itself — is positive once
 * the simulation is past its first step.
 */

import { test, expect, printSummary } from './test-utils.js';
import { runAutowiredFull } from './simulation-autowired.js';

test('energySystemOverhead > 0 after year 1 in full simulation', () => {
  const { results } = runAutowiredFull({ startYear: 2025, endYear: 2030 });

  // Year 0 may be 0 (no prior additions), but subsequent years should have overhead
  const lastYear = results[results.length - 1];
  expect(lastYear.energySystemOverhead).toBeGreaterThan(0);
});

printSummary();

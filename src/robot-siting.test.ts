/**
 * demand.robotDensityIndex: robot electricity load is sited by working-age
 * population x robots per worker relative to the world (IFR 2024 stock).
 */
import { demandModule, demandDefaults, robotSitingShares } from './modules/demand.js';
import { demographicsModule } from './modules/demographics.js';
import { REGIONS } from './domain-types.js';
import { test, expect, printSummary } from './test-utils.js';

const demoParams = demographicsModule.mergeParams({});
const working2025 = (demographicsModule.step(
  demographicsModule.init(demoParams), { temperature: 1.2 } as never, demoParams, 2025, 0,
).outputs as { regionalWorking: Record<(typeof REGIONS)[number], number> }).regionalWorking;

test('2025 siting reproduces the IFR 2024 regional robot-stock split', () => {
  // IFR World Robotics 2025 stock shares mapped to the nine regions (source at the defaults)
  const ifr = { china: 0.462, 'oecd-ex-us': 0.367, us: 0.086, seasia: 0.035, latam: 0.023, india: 0.015, mena: 0.009, russia: 0.002, ssa: 0.002 };
  const shares = robotSitingShares(demandDefaults.robotDensityIndex, working2025);
  for (const r of REGIONS) expect(shares[r]).toBeCloseTo(ifr[r], 2);
});

test('siting follows the workforce: a region whose working age halves hosts less', () => {
  const base = robotSitingShares(demandDefaults.robotDensityIndex, working2025);
  const shrunk = robotSitingShares(demandDefaults.robotDensityIndex, { ...working2025, china: working2025.china / 2 });
  expect(shrunk.china).toBeLessThan(base.china * 0.75);
  expect(REGIONS.reduce((s, r) => s + shrunk[r], 0)).toBeCloseTo(1, 12);
});

test('validation rejects negative or all-zero indexes; a regional index merges over the defaults', () => {
  expect(demandModule.validate({ robotDensityIndex: { china: -1 } } as never).valid).toBe(false);
  expect(demandModule.validate({ robotDensityIndex: Object.fromEntries(REGIONS.map((r) => [r, 0])) } as never).valid).toBe(false);
  const merged = demandModule.mergeParams({ robotDensityIndex: { ssa: 1 } } as never);
  expect(merged.robotDensityIndex.ssa).toBe(1);
  expect(merged.robotDensityIndex.china).toBe(demandDefaults.robotDensityIndex.china);
});

printSummary();

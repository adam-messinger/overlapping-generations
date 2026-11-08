/**
 * Robot siting: robot electricity load is sited by working-age population x
 * robots per worker relative to the world, set in year 0 from the observed
 * robot-stock shares (demand.robotStockShare2024, IFR 2024).
 */
import { demandModule, demandDefaults, robotDensityFromStock, robotSitingShares } from './modules/demand.js';
import { demographicsModule } from './modules/demographics.js';
import { REGIONS } from './domain-types.js';
import { test, expect, printSummary, sumRegional } from './test-utils.js';

const demoParams = demographicsModule.mergeParams({});
const working2025 = (demographicsModule.step(
  demographicsModule.init(demoParams), { temperature: 1.2 } as never, demoParams, 2025, 0,
).outputs as { regionalWorking: Record<(typeof REGIONS)[number], number> }).regionalWorking;
const density = robotDensityFromStock(demandDefaults.robotStockShare2024, working2025);

test('year-0 siting reproduces the observed robot-stock shares exactly', () => {
  const shares = robotSitingShares(density, working2025);
  for (const r of REGIONS) expect(shares[r]).toBeCloseTo(demandDefaults.robotStockShare2024[r], 12);
});

test('siting follows the workforce: a region whose working age halves hosts less', () => {
  const base = robotSitingShares(density, working2025);
  const shrunk = robotSitingShares(density, { ...working2025, china: working2025.china / 2 });
  expect(shrunk.china).toBeLessThan(base.china * 0.75);
  expect(sumRegional(shrunk)).toBeCloseTo(1, 12);
});

test('validation rejects shares that are negative or do not sum to 1; a region merges over the defaults', () => {
  expect(demandModule.validate({ robotStockShare2024: { ...demandDefaults.robotStockShare2024, china: -0.1 } } as never).valid).toBe(false);
  expect(demandModule.validate({ robotStockShare2024: { ...demandDefaults.robotStockShare2024, ssa: 0.5 } } as never).valid).toBe(false);
  const merged = demandModule.mergeParams({ robotStockShare2024: { ssa: 0.0017 } } as never);
  expect(merged.robotStockShare2024.china).toBe(demandDefaults.robotStockShare2024.china);
});

printSummary();

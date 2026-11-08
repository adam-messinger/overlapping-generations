/**
 * GDP at market exchange rates (demand's gdpMarket / regionalGdpMarket):
 * regional PPP GDP x each region's 2025 market/PPP price ratio (US = 1) x US
 * dollars per model dollar. Constant 2025 prices and exchange rates.
 */
import { runSimulation } from './simulation.js';
import { demandModule, demandDefaults } from './modules/demand.js';
import { type Region } from './domain-types.js';
import { test, expect, printSummary, sumRegional } from './test-utils.js';

const OPTS = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;
type Row = { year: number; gdp: number; gdpMarket: number; regionalGdp: Record<Region, number>; regionalGdpMarket: Record<Region, number> };
const run = (demand: object = {}) =>
  runSimulation({ startYear: 2025, endYear: 2040, demand } as never, OPTS).results as unknown as Row[];
const rows = run();
test('2025 US GDP at market rates equals its anchor (regions partitioning the world is a demand invariant)', () => {
  expect(rows[0].regionalGdpMarket.us).toBeCloseTo(demandDefaults.usGdpMarketUsd2025, 9);
  expect(sumRegional(rows[0].regionalGdpMarket)).toBeCloseTo(rows[0].gdpMarket, 9);
});

test('market weights shrink low-price economies and enlarge the US relative to PPP', () => {
  const r = rows[0];
  const marketShare = (k: Region) => r.regionalGdpMarket[k] / r.gdpMarket;
  const pppShare = (k: Region) => r.regionalGdp[k] / r.gdp;
  expect(marketShare('india')).toBeLessThan(pppShare('india'));
  expect(marketShare('us')).toBeGreaterThan(pppShare('us'));
});

test('validation rejects non-positive ratios and anchors; a regional ratio merges over the defaults', () => {
  expect(demandModule.validate({ regions: { china: { marketPriceRatio2025: 0 } } } as never).valid).toBe(false);
  expect(demandModule.validate({ usGdpMarketUsd2025: 0 } as never).valid).toBe(false);
  const merged = demandModule.mergeParams({ regions: { china: { marketPriceRatio2025: 0.6 } } } as never);
  expect(merged.regions.china.marketPriceRatio2025).toBe(0.6);
  expect(merged.regions.china.gdp2025).toBe(demandDefaults.regions.china.gdp2025);
  expect(merged.regions.us.marketPriceRatio2025).toBe(1);
});

printSummary();

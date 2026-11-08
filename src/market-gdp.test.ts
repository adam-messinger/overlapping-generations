/**
 * GDP at market exchange rates (demand's gdpMarket / regionalGdpMarket):
 * regional PPP GDP x each region's 2025 market/PPP price ratio, scaled in year
 * 0 to the observed 2025 world total. Constant 2025 prices and exchange rates.
 */
import { runSimulation } from './simulation.js';
import { demandModule, demandDefaults } from './modules/demand.js';
import { REGIONS, type Region } from './domain-types.js';
import { test, expect, printSummary } from './test-utils.js';

const OPTS = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;
type Row = { year: number; gdp: number; gdpMarket: number; regionalGdp: Record<Region, number>; regionalGdpMarket: Record<Region, number> };
const run = (demand: object = {}) =>
  runSimulation({ startYear: 2025, endYear: 2040, demand } as never, OPTS).results as unknown as Row[];
const rows = run();
const sum = (r: Record<Region, number>) => REGIONS.reduce((s, k) => s + r[k], 0);

test('2025 world GDP at market rates equals the IMF anchor, and regions sum to the world', () => {
  expect(rows[0].gdpMarket).toBeCloseTo(demandDefaults.marketGdpUsd2025, 9);
  for (const row of rows) expect(sum(row.regionalGdpMarket)).toBeCloseTo(row.gdpMarket, 9);
});

test('market weights shrink low-price economies and enlarge the US relative to PPP', () => {
  const r = rows[0];
  const marketShare = (k: Region) => r.regionalGdpMarket[k] / r.gdpMarket;
  const pppShare = (k: Region) => r.regionalGdp[k] / r.gdp;
  expect(marketShare('india')).toBeLessThan(pppShare('india'));
  expect(marketShare('us')).toBeGreaterThan(pppShare('us'));
});

test('market shares do not depend on the dollar anchor', () => {
  const rescaled = run({ marketGdpUsd2025: 200 });
  for (const y of [0, 10, 15]) {
    for (const k of REGIONS) {
      expect(rescaled[y].regionalGdpMarket[k] / rescaled[y].gdpMarket)
        .toBeCloseTo(rows[y].regionalGdpMarket[k] / rows[y].gdpMarket, 12);
    }
  }
});

test('validation rejects non-positive ratios and anchors; a regional ratio merges over the defaults', () => {
  expect(demandModule.validate({ regions: { china: { marketPriceRatio2025: 0 } } } as never).valid).toBe(false);
  expect(demandModule.validate({ marketGdpUsd2025: 0 } as never).valid).toBe(false);
  const merged = demandModule.mergeParams({ regions: { china: { marketPriceRatio2025: 0.6 } } } as never);
  expect(merged.regions.china.marketPriceRatio2025).toBe(0.6);
  expect(merged.regions.china.gdp2025).toBe(demandDefaults.regions.china.gdp2025);
  expect(merged.regions.us.marketPriceRatio2025).toBe(1);
});

printSummary();

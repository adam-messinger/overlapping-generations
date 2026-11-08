/**
 * demand.regionalOutputAdjustments: the overlay hook on regional output.
 *
 * Each entry is a LEVEL on a region's output share in that calendar year
 * (missing year or region = 1); the allocator applies a(year)/a(year-1) and
 * renormalises to world GDP.
 */
import { runSimulation } from './simulation.js';
import { demandModule } from './modules/demand.js';
import { REGIONS, type Region } from './domain-types.js';
import { test, expect, printSummary, regional } from './test-utils.js';

const OPTS = { diagnostics: false, connectorValidation: 'off', paramLiveness: 'off' } as const;
const END = 2035;
type Row = { year: number; gdp: number; regionalGdp: Record<Region, number>; temperature: number };
const run = (demand: object) =>
  runSimulation({ startYear: 2025, endYear: END, demand } as never, OPTS).results as unknown as Row[];
const at = (rows: Row[], year: number) => rows.find((r) => r.year === year)!;
const share = (row: Row, region: Region) => row.regionalGdp[region] / row.gdp;
const everyYear = (from: number, to: number, factors: Partial<Record<Region, number>>) =>
  Array.from({ length: to - from + 1 }, (_, k) => ({ year: from + k, factors }));

const base = run({});

test('adjustments of exactly 1 leave the run bit-identical', () => {
  const ones = run({ regionalOutputAdjustments: everyYear(2025, END, regional(1)) });
  for (const row of base) {
    const other = at(ones, row.year);
    expect(Object.is(other.gdp, row.gdp)).toBeTrue();
    for (const r of REGIONS) expect(Object.is(other.regionalGdp[r], row.regionalGdp[r])).toBeTrue();
  }
});

test('an entry in the start year leaves 2025 shares unchanged (and, being sparse, reverts in 2026)', () => {
  const anchored = run({ regionalOutputAdjustments: [{ year: 2025, factors: { india: 1.2 } }] });
  for (const r of REGIONS) expect(share(at(anchored, 2025), r)).toBeCloseTo(share(at(base, 2025), r), 12);
  // 2026 reads a(2026)/a(2025) = 1/1.2: a sparse entry reverts the next year
  expect(share(at(anchored, 2026), 'india')).toBeLessThan(share(at(base, 2026), 'india'));
});

test('a level held every year moves the region ~that much and holds; an unlisted year reverts', () => {
  const held = run({ regionalOutputAdjustments: everyYear(2026, 2030, { us: 1.1 }) });
  const relative = (rows: Row[], y: number) => share(at(rows, y), 'us') / share(at(rows, y), 'china');
  for (const y of [2026, 2028, 2030]) {
    expect(relative(held, y) / relative(base, y)).toBeBetween(1.08, 1.12);
  }
  // 2031 is not listed: the level returns to 1
  expect(relative(held, 2031) / relative(base, 2031)).toBeBetween(0.98, 1.02);
});

test('composes multiplicatively with commodityShocks regional output factors', () => {
  const commodityShocks = Array.from({ length: 5 }, (_, k) => ({ year: 2026 + k, regionalOutputFactors: { mena: 0.9 } }));
  const viaShock = run({ commodityShocks });
  const both = run({ commodityShocks, regionalOutputAdjustments: everyYear(2026, 2030, { mena: 0.9 }) });
  const rel = (rows: Row[]) => share(at(rows, 2028), 'mena') / share(at(rows, 2028), 'us');
  const shockOnly = rel(viaShock) / rel(base);
  expect(shockOnly).toBeBetween(0.88, 0.92);
  expect(rel(both) / rel(base)).toBeBetween(shockOnly * 0.88, shockOnly * 0.92);
});

test('validation rejects out-of-range factors, unknown regions and duplicate years', () => {
  const v = (regionalOutputAdjustments: unknown) =>
    demandModule.validate({ regionalOutputAdjustments } as never).valid;
  expect(v([{ year: 2030, factors: { us: 1.5 } }])).toBeTrue();
  expect(v([{ year: 2030, factors: { us: 0.05 } }])).toBe(false);
  expect(v([{ year: 2030, factors: { us: 11 } }])).toBe(false);
  expect(v([{ year: 2030, factors: { atlantis: 1.1 } }])).toBe(false);
  expect(v([{ year: 2030.5, factors: { us: 1.1 } }])).toBe(false);
  expect(v([{ year: 2030, factors: { us: 1.1 } }, { year: 2030, factors: { china: 1.1 } }])).toBe(false);
});

printSummary();

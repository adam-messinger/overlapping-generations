/**
 * Build place-to-functional-market assignments and a pre-period population
 * trend baseline.
 *
 * Primary historical geography: USDA ERS 2000 commuting zones. These cover
 * rural counties and are defined from start-period commuting rather than
 * end-period behavior. USDA's 2020 zones are retained as a current-geography
 * sensitivity and eventual product mapping.
 *
 * Multi-county places are assigned to the county containing the largest
 * Census-2000 place part when that population is available. If every county
 * belongs to the same market, the assignment is invariant. The fallback is
 * explicit and flagged; ambiguous fallbacks can be excluded in sensitivity
 * tests.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, RAW_DIR, ensureDirs, parseCsv, readCsvAuto, writeCsv } from './lib.js';

export interface PlacePart {
  geoid: string;
  countyFips: string;
  pop2000: number | null;
  pop1990: number | null;
}

export interface PlaceMarketRow {
  geoid: string;
  primaryCountyFips: string | null;
  countyCount: number;
  assignmentMethod: 'single_county' | 'unanimous_multi_county' |
    'largest_2000_place_part' | 'first_county_no_part' | 'unassigned';
  crossMarket2000: boolean;
  cz2000: string | null;
  crossMarket2020: boolean;
  cz2020: string | null;
  cz2020Name: string | null;
  cz2020Containment: number | null;
  pop1990On2000Boundaries: number | null;
  pop2000Census: number | null;
  laggedLogPopGrowth90_00: number | null;
}

interface CountyMarket2000 {
  cz: string;
}

interface CountyMarket2020 {
  cz: string;
  name: string;
  containment: number | null;
}

function numberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parse the fixed-width Census SU-2000-10 table. Segment 1 contains the
 * April-2000 Census count; segment 2 ends with the April-1990 base restated
 * to governmental boundaries legally effective January 1, 2000. */
export function parsePlaceParts(text: string): PlacePart[] {
  const byPart = new Map<string, PlacePart>();
  for (const line of text.split(/\r?\n/)) {
    if (line.length < 80 || line.slice(6, 9) !== '157') continue;
    const segment = line.slice(0, 4).trim();
    if (segment !== '1' && segment !== '2') continue;
    const stateFips = line.slice(10, 12);
    const countyFips = `${stateFips}${line.slice(13, 16)}`;
    const placeFips = line.slice(23, 28);
    if (!/^\d{5}$/.test(placeFips)) continue;
    const geoid = `${stateFips}${placeFips}`;
    const values = line.slice(73).trim().split(/\s+/).map(numberOrNull);
    const key = `${geoid}|${countyFips}`;
    const current = byPart.get(key) ?? { geoid, countyFips, pop2000: null, pop1990: null };
    if (segment === '1' && values.length >= 1) current.pop2000 = values[0];
    if (segment === '2' && values.length >= 6) current.pop1990 = values[5];
    byPart.set(key, current);
  }
  return [...byPart.values()];
}

export function choosePrimaryCounty(
  counties: string[], parts: PlacePart[], market2000: Map<string, CountyMarket2000>
): Pick<PlaceMarketRow, 'primaryCountyFips' | 'assignmentMethod' | 'crossMarket2000'> {
  const sorted = [...new Set(counties)].sort();
  if (sorted.length === 0) {
    return { primaryCountyFips: null, assignmentMethod: 'unassigned', crossMarket2000: false };
  }
  const markets = new Set(sorted.map((county) => market2000.get(county)?.cz).filter(Boolean));
  const crossMarket2000 = markets.size > 1;
  if (sorted.length === 1) {
    return { primaryCountyFips: sorted[0], assignmentMethod: 'single_county', crossMarket2000 };
  }
  const withPopulation = parts.filter(
    (part) => sorted.includes(part.countyFips) && part.pop2000 !== null
  ).sort((a, b) => (b.pop2000 ?? 0) - (a.pop2000 ?? 0) ||
    a.countyFips.localeCompare(b.countyFips));
  if (!crossMarket2000) {
    return {
      primaryCountyFips: withPopulation[0]?.countyFips ?? sorted[0],
      assignmentMethod: 'unanimous_multi_county',
      crossMarket2000,
    };
  }
  if (withPopulation.length > 0) {
    return {
      primaryCountyFips: withPopulation[0].countyFips,
      assignmentMethod: 'largest_2000_place_part',
      crossMarket2000,
    };
  }
  return {
    primaryCountyFips: sorted[0],
    assignmentMethod: 'first_county_no_part',
    crossMarket2000,
  };
}

function loadCountyMembership(): Map<string, string[]> {
  const lines = fs.readFileSync(path.join(RAW_DIR, 'place_by_county.txt'), 'utf8')
    .split(/\r?\n/).filter(Boolean);
  const out = new Map<string, string[]>();
  for (const line of lines.slice(1)) {
    const fields = line.split('|');
    if (fields.length < 6) continue;
    const geoid = `${fields[1]}${fields[4]}`;
    const countyFips = `${fields[1]}${fields[2]}`;
    const current = out.get(geoid) ?? [];
    current.push(countyFips);
    out.set(geoid, current);
  }
  return out;
}

function loadMarkets2000(): Map<string, CountyMarket2000> {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, 'county-cz2000.csv')));
  const header = rows[0];
  const county = header.indexOf('countyFips');
  const cz = header.indexOf('cz2000');
  if (county < 0 || cz < 0) throw new Error('county-cz2000.csv: missing required columns');
  return new Map(rows.slice(1).map((row) => [row[county], { cz: row[cz] }]));
}

function loadMarkets2020(): Map<string, CountyMarket2020> {
  const rows = parseCsv(fs.readFileSync(path.join(RAW_DIR, 'cz2020.csv'), 'utf8'));
  const header = rows[0];
  const at = (name: string): number => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`cz2020.csv: missing ${name}`);
    return index;
  };
  const fips = at('FIPStxt'), cz = at('CZ2020'), name = at('CZName');
  const containment = at('CZContainment');
  return new Map(rows.slice(1).map((row) => [row[fips].padStart(5, '0'), {
    cz: row[cz], name: row[name], containment: numberOrNull(row[containment]),
  }]));
}

export function buildPlaceMarkets(): PlaceMarketRow[] {
  const placeRows = parseCsv(readCsvAuto(path.join(DATA_DIR, 'places.csv')));
  const placeHeader = placeRows[0];
  const geoidIndex = placeHeader.indexOf('geoid');
  if (geoidIndex < 0) throw new Error('places.csv: missing geoid');
  const membership = loadCountyMembership();
  const market2000 = loadMarkets2000();
  const market2020 = loadMarkets2020();
  const parts = parsePlaceParts(
    fs.readFileSync(path.join(RAW_DIR, 'population-1990-2000.txt'), 'utf8')
  );
  const partsByPlace = new Map<string, PlacePart[]>();
  for (const part of parts) {
    const current = partsByPlace.get(part.geoid) ?? [];
    current.push(part);
    partsByPlace.set(part.geoid, current);
  }

  return placeRows.slice(1).map((row) => {
    const geoid = row[geoidIndex];
    const counties = [...new Set(membership.get(geoid) ?? [])].sort();
    const placeParts = partsByPlace.get(geoid) ?? [];
    const primary = choosePrimaryCounty(counties, placeParts, market2000);
    const county = primary.primaryCountyFips;
    const currentMarket = county ? market2020.get(county) : undefined;
    const distinct2020 = new Set(counties.map((item) => market2020.get(item)?.cz).filter(Boolean));
    const completeParts = placeParts.filter(
      (part) => part.pop1990 !== null && part.pop2000 !== null
    );
    const pop1990 = completeParts.length > 0
      ? completeParts.reduce((sum, part) => sum + (part.pop1990 ?? 0), 0) : null;
    const pop2000 = completeParts.length > 0
      ? completeParts.reduce((sum, part) => sum + (part.pop2000 ?? 0), 0) : null;
    const laggedGrowth = pop1990 !== null && pop2000 !== null && pop1990 > 0 && pop2000 > 0
      ? Math.log(pop2000 / pop1990) : null;
    return {
      geoid,
      primaryCountyFips: county,
      countyCount: counties.length,
      assignmentMethod: primary.assignmentMethod,
      crossMarket2000: primary.crossMarket2000,
      cz2000: county ? market2000.get(county)?.cz ?? null : null,
      crossMarket2020: distinct2020.size > 1,
      cz2020: currentMarket?.cz ?? null,
      cz2020Name: currentMarket?.name ?? null,
      cz2020Containment: currentMarket?.containment ?? null,
      pop1990On2000Boundaries: pop1990,
      pop2000Census: pop2000,
      laggedLogPopGrowth90_00: laggedGrowth,
    };
  });
}

export function main(): void {
  ensureDirs();
  const rows = buildPlaceMarkets();
  const header = [
    'geoid', 'primaryCountyFips', 'countyCount', 'assignmentMethod', 'crossMarket2000',
    'cz2000', 'crossMarket2020', 'cz2020', 'cz2020Name', 'cz2020Containment',
    'pop1990On2000Boundaries', 'pop2000Census', 'laggedLogPopGrowth90_00',
  ];
  writeCsv(path.join(DATA_DIR, 'place-markets.csv.gz'), header, rows.map((row) => [
    row.geoid, row.primaryCountyFips, row.countyCount, row.assignmentMethod,
    Number(row.crossMarket2000), row.cz2000, Number(row.crossMarket2020), row.cz2020,
    row.cz2020Name, row.cz2020Containment, row.pop1990On2000Boundaries,
    row.pop2000Census, row.laggedLogPopGrowth90_00,
  ]));
  const assigned2000 = rows.filter((row) => row.cz2000 !== null).length;
  const lagged = rows.filter((row) => row.laggedLogPopGrowth90_00 !== null).length;
  const fallback = rows.filter((row) => row.assignmentMethod === 'first_county_no_part').length;
  console.log(`place markets: ${assigned2000}/${rows.length} assigned to 2000 CZs`);
  console.log(`lagged population baseline: ${lagged}/${rows.length}; ambiguous fallback=${fallback}`);
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) main();

/**
 * Process static raw downloads into compact CSVs:
 *   data/places.csv        — GEOID, name, state, county, lat, lon, land area
 *   data/zhvi.csv          — Zillow ZHVI city-level annual series (June obs), 2000-2025
 *   data/universities2000.csv — contemporaneous IPEDS institutions + fall enrollment
 *   data/universities2023.csv — IPEDS institutions + campus-linked 12-month enrollment
 *
 * Raw inputs live in aging-places/raw by default; fetch-static.ts builds that
 * directory. Set AGING_RAW_DIR to put the source files elsewhere.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, RAW_DIR, ensureDirs, parseCsv, readCsvAuto, writeCsv, num } from './lib.js';

function buildPlaces(): void {
  // Gazetteer 2023: tab-delimited USPS GEOID ANSICODE NAME LSAD FUNCSTAT ALAND AWATER ALAND_SQMI AWATER_SQMI INTPTLAT INTPTLONG
  const gaz = fs.readFileSync(path.join(RAW_DIR, '2023_Gaz_place_national.txt'), 'utf8')
    .split('\n').filter((l) => l.trim());
  // Place->county crosswalk (2020): STATE|STATEFP|COUNTYFP|COUNTYNAME|PLACEFP|PLACENS|PLACENAME|TYPE|CLASSFP|FUNCSTAT
  const pbc = fs.readFileSync(path.join(RAW_DIR, 'place_by_county.txt'), 'utf8')
    .split('\n').filter((l) => l.trim());
  const county = new Map<string, string>();
  for (const line of pbc.slice(1)) {
    const f = line.split('|');
    const geoid = f[1] + f[4];
    if (!county.has(geoid)) county.set(geoid, f[3]); // first (primary) county
  }
  const rows: (string | number | null)[][] = [];
  for (const line of gaz.slice(1)) {
    const f = line.split('\t').map((s) => s.trim());
    if (f.length < 12) continue;
    rows.push([f[1], f[3], f[0], county.get(f[1]) ?? '', Number(f[10]), Number(f[11]), Number(f[8])]);
  }
  writeCsv(path.join(DATA_DIR, 'places.csv.gz'), ['geoid', 'name', 'state', 'county', 'lat', 'lon', 'aland_sqmi'], rows);
}

function buildZhvi(): void {
  const raw = fs.readFileSync(path.join(RAW_DIR, 'zhvi_city.csv'), 'utf8');
  const rows = parseCsv(raw);
  const header = rows[0];
  const years: number[] = [];
  for (let y = 2000; y <= 2025; y++) years.push(y);
  // Prefer June; fall back to the last available month of the year.
  const yearCols = new Map<number, number[]>();
  for (let i = 8; i < header.length; i++) {
    const y = Number(header[i].slice(0, 4));
    if (!yearCols.has(y)) yearCols.set(y, []);
    yearCols.get(y)!.push(i);
  }
  const pickCol = new Map<number, number[]>(); // year -> ordered candidate col indexes (June first)
  for (const y of years) {
    const cols = yearCols.get(y) ?? [];
    const june = cols.find((i) => header[i].slice(5, 7) === '06');
    const ordered = june !== undefined ? [june, ...cols.filter((i) => i !== june).reverse()] : [...cols].reverse();
    pickCol.set(y, ordered);
  }
  const out: (string | number | null)[][] = [];
  for (const r of rows.slice(1)) {
    if (r.length < 9 || r[3] !== 'city') continue;
    const vals: (number | null)[] = years.map((y) => {
      for (const c of pickCol.get(y)!) {
        const v = num(r[c]);
        if (v !== null) return Math.round(v);
      }
      return null;
    });
    out.push([r[0], r[2], r[5], r[6], r[7], ...vals]);
  }
  writeCsv(path.join(DATA_DIR, 'zhvi.csv.gz'),
    ['regionId', 'city', 'state', 'metro', 'county', ...years.map((y) => `v${y}`)], out);
}

function cleanTextFile(file: string): string {
  return fs.readFileSync(path.join(RAW_DIR, file), 'latin1').replace(/^﻿|^ï»¿/, '');
}

function buildPlaceCoordinateIndex(): Map<string, { lat: number; lon: number }> {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, 'places.csv')));
  const header = rows[0];
  const at = (name: string): number => header.indexOf(name);
  const normalize = (name: string): string => name.toLowerCase()
    .replace(/\b(city|town|village|borough|cdp|municipality)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  const out = new Map<string, { lat: number; lon: number }>();
  for (const row of rows.slice(1)) {
    const lat = num(row[at('lat')]), lon = num(row[at('lon')]);
    if (lat === null || lon === null) continue;
    const key = `${row[at('state')]}|${normalize(row[at('name')])}`;
    if (!out.has(key)) out.set(key, { lat, lon });
  }
  return out;
}

function buildUniversities2023(): void {
  const hd = parseCsv(cleanTextFile('HD2023.csv'));
  const h = hd[0].map((s) => s.toUpperCase());
  const col = (name: string): number => {
    const i = h.indexOf(name);
    if (i === -1) throw new Error(`HD2023 missing column ${name}`);
    return i;
  };
  const iUnit = col('UNITID'), iName = col('INSTNM'), iCity = col('CITY'), iSt = col('STABBR');
  const iLat = col('LATITUDE'), iLon = col('LONGITUD'), iSector = col('SECTOR'), iLevel = col('ICLEVEL');
  // EFFY2023_DIST: 12-month unduplicated count by distance status.
  // EFFYDLEV=1 is all students. Campus-linked enrollment excludes students
  // taking every course remotely; students taking some online courses remain.
  const dist = parseCsv(cleanTextFile('EFFY2023_dist.csv'));
  const dh = dist[0].map((s) => s.toUpperCase());
  const dUnit = dh.indexOf('UNITID');
  const dLev = dh.indexOf('EFFYDLEV');
  const dTotal = dh.indexOf('EFYDETOT');
  const dExclusive = dh.indexOf('EFYDEEXC');
  for (const [name, idx] of [['UNITID', dUnit], ['EFFYDLEV', dLev], ['EFYDETOT', dTotal], ['EFYDEEXC', dExclusive]] as const) {
    if (idx === -1) throw new Error(`EFFY2023_dist missing column ${name}`);
  }
  const enroll = new Map<string, { total: number; exclusiveOnline: number }>();
  for (const row of dist.slice(1)) {
    if (row[dLev]?.trim() !== '1') continue;
    enroll.set(row[dUnit], {
      total: num(row[dTotal]) ?? 0,
      exclusiveOnline: num(row[dExclusive]) ?? 0,
    });
  }
  const rows: (string | number | null)[][] = [];
  for (const r of hd.slice(1)) {
    const counts = enroll.get(r[iUnit]);
    if (!counts || counts.total <= 0) continue;
    const campusEnrollment = Math.max(0, counts.total - counts.exclusiveOnline);
    if (campusEnrollment <= 0) continue;
    const lat = num(r[iLat]), lon = num(r[iLon]);
    if (lat === null || lon === null) continue;
    // IPEDS reports at the institution rather than physical-campus level. Keep
    // the observed count, but cap the count used spatially so a statewide
    // multi-campus system is not assigned wholesale to its administrative HQ.
    const spatialEnrollment = Math.min(75_000, campusEnrollment);
    rows.push([
      r[iUnit], r[iName], r[iCity], r[iSt], lat, lon,
      counts.total, counts.exclusiveOnline, campusEnrollment, spatialEnrollment,
      counts.total > 0 ? +(counts.exclusiveOnline / counts.total).toFixed(4) : 0,
      r[iSector], r[iLevel],
    ]);
  }
  writeCsv(path.join(DATA_DIR, 'universities2023.csv.gz'), [
    'unitid', 'name', 'city', 'state', 'lat', 'lon', 'enrollment',
    'exclusiveOnline', 'campusEnrollment', 'spatialEnrollment',
    'exclusiveOnlineShare', 'sector', 'iclevel',
  ], rows);
}

function buildUniversities2000(): void {
  const hd = parseCsv(cleanTextFile('fa2000hd.csv'));
  const hh = hd[0].map((s) => s.toUpperCase());
  const hc = (name: string): number => {
    const idx = hh.indexOf(name);
    if (idx === -1) throw new Error(`FA2000HD missing column ${name}`);
    return idx;
  };
  const hUnit = hc('UNITID'), hName = hc('INSTNM'), hCity = hc('CITY'), hState = hc('STABBR');
  const hSector = hc('SECTOR'), hLevel = hc('ICLEVEL');

  const ef = parseCsv(cleanTextFile('ef2000a.csv'));
  const eh = ef[0].map((s) => s.toUpperCase());
  const ec = (name: string): number => {
    const idx = eh.indexOf(name);
    if (idx === -1) throw new Error(`EF2000A missing column ${name}`);
    return idx;
  };
  const eUnit = ec('UNITID'), eLine = ec('LINE'), eMale = ec('EFRACE15'), eFemale = ec('EFRACE16');
  const enrollment = new Map<string, number>();
  for (const row of ef.slice(1)) {
    // Line 29 is the institution-wide fall enrollment total, male + female.
    if (row[eLine]?.trim() !== '29') continue;
    enrollment.set(row[eUnit], (num(row[eMale]) ?? 0) + (num(row[eFemale]) ?? 0));
  }

  const current = parseCsv(cleanTextFile('HD2023.csv'));
  const ch = current[0].map((s) => s.toUpperCase());
  const cUnit = ch.indexOf('UNITID'), cLat = ch.indexOf('LATITUDE'), cLon = ch.indexOf('LONGITUD');
  const currentCoordinates = new Map<string, { lat: number; lon: number }>();
  for (const row of current.slice(1)) {
    const lat = num(row[cLat]), lon = num(row[cLon]);
    if (lat !== null && lon !== null) currentCoordinates.set(row[cUnit], { lat, lon });
  }
  const placeCoordinates = buildPlaceCoordinateIndex();
  const normalize = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const rows: (string | number | null)[][] = [];
  let cityFallbacks = 0;
  for (const row of hd.slice(1)) {
    const count = enrollment.get(row[hUnit]) ?? 0;
    if (count <= 0) continue;
    // CCAF's reported enrollment is a worldwide, system-wide military total;
    // it is not a local campus population and cannot be placed in Montgomery.
    if (row[hName].toUpperCase().includes('COMMUNITY COLLEGE OF THE AIR FORCE')) continue;
    let coord = currentCoordinates.get(row[hUnit]);
    if (!coord) {
      coord = placeCoordinates.get(`${row[hState]}|${normalize(row[hCity])}`);
      if (coord) cityFallbacks++;
    }
    if (!coord) continue;
    rows.push([
      row[hUnit], row[hName], row[hCity], row[hState], coord.lat, coord.lon,
      count, count, Math.min(75_000, count), row[hSector], row[hLevel],
    ]);
  }
  writeCsv(path.join(DATA_DIR, 'universities2000.csv.gz'), [
    'unitid', 'name', 'city', 'state', 'lat', 'lon', 'enrollment',
    'campusEnrollment', 'spatialEnrollment', 'sector', 'iclevel',
  ], rows);
  console.log(`universities2000: ${cityFallbacks} institutions located by contemporaneous city centroid`);
}

ensureDirs();
const only = process.argv.find((arg) => arg.startsWith('--only='))?.split('=')[1];
if (!only || only === 'places') buildPlaces();
if (!only || only === 'zhvi') buildZhvi();
if (!only || only === 'universities') {
  buildUniversities2000();
  buildUniversities2023();
}

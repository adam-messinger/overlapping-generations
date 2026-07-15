/**
 * Process static raw downloads into compact CSVs:
 *   data/places.csv        — GEOID, name, state, county, lat, lon, land area
 *   data/zhvi.csv          — Zillow ZHVI city-level annual series (June obs), 2000-2025
 *   data/universities.csv  — IPEDS institutions with location + 12-month enrollment
 *
 * Raw inputs live in the scratchpad (see fetch commands in README).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, RAW_DIR, ensureDirs, parseCsv, writeCsv, num } from './lib.js';

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

function buildUniversities(): void {
  const hd = parseCsv(fs.readFileSync(path.join(RAW_DIR, 'HD2023.csv'), 'latin1').replace(/^﻿|^ï»¿/, ''));
  const h = hd[0].map((s) => s.toUpperCase());
  const col = (name: string): number => {
    const i = h.indexOf(name);
    if (i === -1) throw new Error(`HD2023 missing column ${name}`);
    return i;
  };
  const iUnit = col('UNITID'), iName = col('INSTNM'), iCity = col('CITY'), iSt = col('STABBR');
  const iLat = col('LATITUDE'), iLon = col('LONGITUD'), iSector = col('SECTOR'), iLevel = col('ICLEVEL');
  // EFFY2023: 12-month unduplicated headcount; EFFYLEV 1 = all students total
  const effy = parseCsv(fs.readFileSync(path.join(RAW_DIR, 'EFFY2023.csv'), 'latin1').replace(/^﻿|^ï»¿/, ''));
  const eh = effy[0].map((s) => s.toUpperCase());
  const eUnit = eh.indexOf('UNITID');
  const eLev = eh.indexOf('EFFYALEV'); // 1 = all students, all levels
  const eTot = eh.indexOf('EFYTOTLT');
  const enroll = new Map<string, number>();
  for (const r of effy.slice(1)) {
    if (r[eLev]?.trim() === '1') enroll.set(r[eUnit], num(r[eTot]) ?? 0);
  }
  const rows: (string | number | null)[][] = [];
  for (const r of hd.slice(1)) {
    const en = enroll.get(r[iUnit]) ?? 0;
    if (en <= 0) continue;
    const lat = num(r[iLat]), lon = num(r[iLon]);
    if (lat === null || lon === null) continue;
    rows.push([r[iUnit], r[iName], r[iCity], r[iSt], lat, lon, en, r[iSector], r[iLevel]]);
  }
  writeCsv(path.join(DATA_DIR, 'universities.csv.gz'),
    ['unitid', 'name', 'city', 'state', 'lat', 'lon', 'enrollment', 'sector', 'iclevel'], rows);
}

ensureDirs();
buildPlaces();
buildZhvi();
buildUniversities();

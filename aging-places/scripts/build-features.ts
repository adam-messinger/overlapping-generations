/**
 * Join all data sources and engineer the municipal feature set for both
 * epochs (2000 and 2023), including market-access and university features
 * computed via spatial grid, and Zillow outcomes for the backtest.
 *
 * Outputs:
 *   data/features2000.csv — year-2000 features + realized 2000-2025 ZHVI outcome
 *   data/features2023.csv — current features + current ZHVI level
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, ensureDirs, parseCsv, readCsvAuto, writeCsv } from './lib.js';

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------
function loadCsv(file: string): { header: string[]; rows: string[][] } {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, file)));
  return { header: rows[0], rows: rows.slice(1).filter((r) => r.length > 1) };
}

function indexer(header: string[]): (name: string) => number {
  return (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`missing column ${name}`);
    return i;
  };
}

const f = (v: string | undefined): number | null => {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

interface Place {
  geoid: string;
  name: string;
  state: string;
  county: string;
  lat: number;
  lon: number;
  alandSqmi: number;
}

// ---------------------------------------------------------------------------
// Spatial grid for radius sums (haversine, bucketed by 1-degree cells)
// ---------------------------------------------------------------------------
const R_EARTH = 6371; // km
function havKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}

interface GridPoint { lat: number; lon: number; w: number[] } // weights (pop, income, enrollment...)

class Grid {
  private cells = new Map<string, GridPoint[]>();
  constructor(private nWeights: number) {}
  private key(lat: number, lon: number): string {
    return `${Math.floor(lat)}:${Math.floor(lon)}`;
  }
  add(lat: number, lon: number, w: number[]): void {
    const k = this.key(lat, lon);
    let arr = this.cells.get(k);
    if (!arr) { arr = []; this.cells.set(k, arr); }
    arr.push({ lat, lon, w });
  }
  /** Sum weights within each radius (km), for all radii at once. */
  sumsWithin(lat: number, lon: number, radiiKm: number[]): number[][] {
    const maxR = Math.max(...radiiKm);
    const latSpan = Math.ceil(maxR / 111) + 1;
    const lonSpan = Math.ceil(maxR / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))) + 1;
    const out = radiiKm.map(() => new Array(this.nWeights).fill(0));
    for (let dLat = -latSpan; dLat <= latSpan; dLat++) {
      for (let dLon = -lonSpan; dLon <= lonSpan; dLon++) {
        const arr = this.cells.get(`${Math.floor(lat) + dLat}:${Math.floor(lon) + dLon}`);
        if (!arr) continue;
        for (const p of arr) {
          const d = havKm(lat, lon, p.lat, p.lon);
          for (let ri = 0; ri < radiiKm.length; ri++) {
            if (d <= radiiKm[ri]) {
              for (let wi = 0; wi < this.nWeights; wi++) out[ri][wi] += p.w[wi];
            }
          }
        }
      }
    }
    return out;
  }
}

// Approximate drive-time bands: 60/90/120 minutes at ~70 km/h average
const RADII_KM = [70, 105, 140];

// ---------------------------------------------------------------------------
// Zillow name matching
// ---------------------------------------------------------------------------
const LSAD_SUFFIX =
  /\s+(city|town|village|borough|municipality|CDP|comunidad|zona urbana|city and borough|consolidated government \(balance\)|unified government \(balance\)|metro government \(balance\)|metropolitan government \(balance\)|urban county|\(balance\))$/i;

function normName(s: string): string {
  let n = s.trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Strip repeated LSAD suffixes ("Anchorage municipality", "Butte-Silver Bow (balance)")
  for (let i = 0; i < 3; i++) n = n.replace(LSAD_SUFFIX, '');
  return n
    .toLowerCase()
    .replace(/^st\.\s/, 'saint ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Census names like "San Buenaventura (Ventura) city" carry a common alias in parens. */
function nameVariants(s: string): string[] {
  const out = [normName(s)];
  const m = s.match(/^(.*?)\s*\(([^)]+)\)(.*)$/);
  if (m && !/balance/i.test(m[2])) {
    out.push(normName(m[2] + m[3]));
    out.push(normName(m[1] + m[3]));
  }
  return Array.from(new Set(out.filter(Boolean)));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  ensureDirs();

  // --- places ---
  const pl = loadCsv('places.csv');
  const pi = indexer(pl.header);
  const places = new Map<string, Place>();
  for (const r of pl.rows) {
    const lat = f(r[pi('lat')]);
    const lon = f(r[pi('lon')]);
    if (lat === null || lon === null) continue;
    places.set(r[pi('geoid')], {
      geoid: r[pi('geoid')], name: r[pi('name')], state: r[pi('state')],
      county: r[pi('county')], lat, lon, alandSqmi: f(r[pi('aland_sqmi')]) ?? 0,
    });
  }

  // --- census years ---
  const c2000 = loadCsv('census2000.csv');
  const c2023 = loadCsv('acs2023.csv');
  const idx2000 = indexer(c2000.header);
  const idx2023 = indexer(c2023.header);
  const rows2000 = new Map(c2000.rows.map((r) => [r[idx2000('geoid')], r]));
  const rows2023 = new Map(c2023.rows.map((r) => [r[idx2023('geoid')], r]));

  // --- universities grid (structural; used for both epochs) ---
  const uni = loadCsv('universities.csv');
  const ui = indexer(uni.header);
  const uniGrid = new Grid(1);
  for (const r of uni.rows) {
    const lat = f(r[ui('lat')]), lon = f(r[ui('lon')]), en = f(r[ui('enrollment')]);
    if (lat === null || lon === null || en === null) continue;
    uniGrid.add(lat, lon, [en]);
  }

  // --- Zillow ---
  const z = loadCsv('zhvi.csv');
  const zi = indexer(z.header);
  // state -> normName -> rows
  const zIndex = new Map<string, string[][]>();
  for (const r of z.rows) {
    const key = `${r[zi('state')]}|${normName(r[zi('city')])}`;
    let arr = zIndex.get(key);
    if (!arr) { arr = []; zIndex.set(key, arr); }
    arr.push(r);
  }
  const zhviFor = (p: Place): string[] | null => {
    for (const variant of nameVariants(p.name)) {
      const candidates = zIndex.get(`${p.state}|${variant}`);
      if (!candidates || candidates.length === 0) continue;
      if (candidates.length === 1) return candidates[0];
      const sameCounty = candidates.filter((r) => r[zi('county')] === p.county);
      return (sameCounty[0] ?? candidates[0]);
    }
    return null;
  };

  // --- population grids per epoch (pop, aggregate income $M) ---
  const grid2000 = new Grid(2);
  const grid2023 = new Grid(2);
  for (const [geoid, r] of rows2000) {
    const p = places.get(geoid);
    if (!p) continue;
    const pop = f(r[idx2000('pop')]) ?? 0;
    const pci = f(r[idx2000('perCapInc')]) ?? 0;
    if (pop > 0) grid2000.add(p.lat, p.lon, [pop, (pop * pci) / 1e6]);
  }
  for (const [geoid, r] of rows2023) {
    const p = places.get(geoid);
    if (!p) continue;
    const pop = f(r[idx2023('pop')]) ?? 0;
    const agg = (f(r[idx2023('aggHHInc')]) ?? 0) / 1e6;
    if (pop > 0) grid2023.add(p.lat, p.lon, [pop, agg]);
  }

  // -------------------------------------------------------------------------
  // Epoch 2000 features
  // -------------------------------------------------------------------------
  const out2000: (string | number | null)[][] = [];
  for (const [geoid, r] of rows2000) {
    const p = places.get(geoid);
    if (!p) continue;
    const g = (c: string): number | null => f(r[idx2000(c)]);
    const pop = g('pop') ?? 0;
    if (pop < 100) continue;
    const units = g('units') ?? 0;
    const civEmp = g('civEmployed') ?? 0;
    const a25_44 = (g('a25_34') ?? 0) + (g('a35_44') ?? 0);
    const a65 = g('a65up') ?? 0;
    const seasonal = g('seasonalUnits') ?? 0;
    const vacant = g('vacant') ?? 0;
    const [acc60, acc90, acc120] = grid2000.sumsWithin(p.lat, p.lon, RADII_KM);
    const [uni15, uni60] = uniGrid.sumsWithin(p.lat, p.lon, [15, 60]);
    const zrow = zhviFor(p);
    const v2000 = zrow ? f(zrow[zi('v2000')]) : null;
    const v2012 = zrow ? f(zrow[zi('v2012')]) : null;
    const v2025 = zrow ? f(zrow[zi('v2025')]) : null;
    const medVal = g('medianValue');
    const medInc = g('medianHHInc');
    out2000.push([
      geoid, p.name, p.state, p.county, p.lat, p.lon,
      pop,
      a25_44 > 0 && a65 > 0 ? +(a25_44 / a65).toFixed(3) : null,          // repRatio
      pop > 0 ? +(((g('a20_24') ?? 0) + (g('a25_34') ?? 0)) / pop).toFixed(4) : null, // youngShare
      pop > 0 ? +(a65 / pop).toFixed(4) : null,                            // share65
      pop > 0 ? +(((g('a45_64') ?? 0)) / pop).toFixed(4) : null,           // share45_64
      civEmp > 0 ? +((g('eduEmp') ?? 0) / civEmp).toFixed(4) : null,       // eduEmpShare
      civEmp > 0 ? +((g('healthEmp') ?? 0) / civEmp).toFixed(4) : null,    // healthEmpShare
      civEmp > 0 ? +((g('pubAdminEmp') ?? 0) / civEmp).toFixed(4) : null,  // pubAdminShare
      civEmp > 0 ? +((g('artsEmp') ?? 0) / civEmp).toFixed(4) : null,      // artsEmpShare
      civEmp > 0 ? +(((g('profEmp') ?? 0) + (g('infoEmp') ?? 0) + (g('fireEmp') ?? 0)) / civEmp).toFixed(4) : null, // profInfoFireShare
      civEmp + (g('armedForces') ?? 0) > 0 ? +((g('armedForces') ?? 0) / (civEmp + (g('armedForces') ?? 0))).toFixed(4) : null, // armedShare
      (g('pop25up') ?? 0) > 0 ? +((g('bachUp') ?? 0) / (g('pop25up') ?? 1)).toFixed(4) : null, // bachShare
      (g('pop25up') ?? 0) > 0 ? +((g('gradUp') ?? 0) / (g('pop25up') ?? 1)).toFixed(4) : null, // gradShare
      pop > 0 ? +((g('collegeEnroll') ?? 0) / pop).toFixed(4) : null,      // collegeShare
      units > 0 ? +(seasonal / units).toFixed(4) : null,                   // seasonalShare
      units > 0 ? +(Math.max(0, vacant - seasonal) / units).toFixed(4) : null, // distressVacancy
      units > 0 ? +(((g('built99_00') ?? 0) + (g('built95_98') ?? 0) + (g('built90_94') ?? 0)) / units).toFixed(4) : null, // newBuildShare (1990s)
      pop > 0 ? +((g('foreignBorn') ?? 0) / pop).toFixed(4) : null,        // foreignShare
      medVal, medInc, g('perCapInc'),
      medVal !== null && medInc !== null && medInc > 0 ? +(medVal / medInc).toFixed(2) : null, // valueToIncome
      p.alandSqmi > 0 ? Math.round(pop / p.alandSqmi) : null,              // density
      Math.round(acc60[0]), Math.round(acc90[0]), Math.round(acc120[0]),   // popAccess
      Math.round(acc60[1]), Math.round(acc120[1]),                         // incomeAccess $M
      Math.round(uni15[0]), Math.round(uni60[0]),                          // university enrollment nearby
      v2000, v2012, v2025,
      v2000 !== null && v2025 !== null && v2000 > 0 ? +Math.log(v2025 / v2000).toFixed(4) : null, // logGrowth00_25
      v2012 !== null && v2025 !== null && v2012 > 0 ? +Math.log(v2025 / v2012).toFixed(4) : null, // logGrowth12_25
    ]);
  }
  const HEADER_2000 = [
    'geoid', 'name', 'state', 'county', 'lat', 'lon', 'pop',
    'repRatio', 'youngShare', 'share65', 'share45_64',
    'eduEmpShare', 'healthEmpShare', 'pubAdminShare', 'artsEmpShare', 'profInfoFireShare', 'armedShare',
    'bachShare', 'gradShare', 'collegeShare',
    'seasonalShare', 'distressVacancy', 'newBuildShare', 'foreignShare',
    'medianValue', 'medianHHInc', 'perCapInc', 'valueToIncome', 'density',
    'popAccess60', 'popAccess90', 'popAccess120', 'incAccess60', 'incAccess120',
    'uniEnroll15', 'uniEnroll60',
    'zhvi2000', 'zhvi2012', 'zhvi2025', 'logGrowth00_25', 'logGrowth12_25',
  ];
  writeCsv(path.join(DATA_DIR, 'features2000.csv.gz'), HEADER_2000, out2000);

  // -------------------------------------------------------------------------
  // Epoch 2023 features
  // -------------------------------------------------------------------------
  const out2023: (string | number | null)[][] = [];
  for (const [geoid, r] of rows2023) {
    const p = places.get(geoid);
    if (!p) continue;
    const g = (c: string): number | null => f(r[idx2023(c)]);
    const pop = g('pop') ?? 0;
    if (pop < 100) continue;
    const units = g('units') ?? 0;
    const civEmp = g('civEmployed') ?? 0;
    const pct = (c: string): number => (g(c) ?? 0) / 100;
    const share25_44 = pct('pct25_34') + pct('pct35_44');
    const share65 = pct('pct65up');
    const eduEmp = (g('eduEmpM') ?? 0) + (g('eduEmpF') ?? 0);
    const healthEmp = (g('healthEmpM') ?? 0) + (g('healthEmpF') ?? 0);
    const seasonal = g('seasonalUnits') ?? 0;
    const vacant = g('vacant') ?? 0;
    const [acc60, acc90, acc120] = grid2023.sumsWithin(p.lat, p.lon, RADII_KM);
    const [uni15, uni60] = uniGrid.sumsWithin(p.lat, p.lon, [15, 60]);
    const zrow = zhviFor(p);
    const v2015 = zrow ? f(zrow[zi('v2015')]) : null;
    const v2025 = zrow ? f(zrow[zi('v2025')]) : null;
    const medVal = g('medianValue');
    const medInc = g('medianHHInc');
    out2023.push([
      geoid, p.name, p.state, p.county, p.lat, p.lon,
      pop,
      share65 > 0.001 ? +(share25_44 / share65).toFixed(3) : null,
      +(pct('pct20_24') + pct('pct25_34')).toFixed(4),
      +share65.toFixed(4),
      +(pct('pct45_54') + pct('pct55_59') + pct('pct60_64')).toFixed(4),
      civEmp > 0 ? +(eduEmp / civEmp).toFixed(4) : null,
      civEmp > 0 ? +(healthEmp / civEmp).toFixed(4) : null,
      +(pct('pctPubAdmin')).toFixed(4),
      +(pct('pctArtsRec')).toFixed(4),
      +(pct('pctProf') + pct('pctInfo') + pct('pctFire')).toFixed(4),
      civEmp + (g('armedForces') ?? 0) > 0 ? +((g('armedForces') ?? 0) / (civEmp + (g('armedForces') ?? 0))).toFixed(4) : null,
      +(pct('pctBach')).toFixed(4),
      +(pct('pctGrad')).toFixed(4),
      pop > 0 ? +((g('collegeEnroll') ?? 0) / pop).toFixed(4) : null,
      units > 0 ? +(seasonal / units).toFixed(4) : null,
      units > 0 ? +(Math.max(0, vacant - seasonal) / units).toFixed(4) : null,
      units > 0 ? +(((g('built2020up') ?? 0) + (g('built2010s') ?? 0)) / units).toFixed(4) : null, // 2010+ build share
      pop > 0 ? +((g('foreignBorn') ?? 0) / pop).toFixed(4) : null,
      medVal, medInc,
      g('households') !== null && (g('households') ?? 0) > 0 ? Math.round((g('aggHHInc') ?? 0) / (g('households') ?? 1)) : null, // meanHHInc via aggregate
      medVal !== null && medInc !== null && medInc > 0 ? +(medVal / medInc).toFixed(2) : null,
      p.alandSqmi > 0 ? Math.round(pop / p.alandSqmi) : null,
      Math.round(acc60[0]), Math.round(acc90[0]), Math.round(acc120[0]),
      Math.round(acc60[1]), Math.round(acc120[1]),
      Math.round(uni15[0]), Math.round(uni60[0]),
      g('medianAge'),
      v2015, v2025,
      v2015 !== null && v2025 !== null && v2015 > 0 ? +Math.log(v2025 / v2015).toFixed(4) : null,
    ]);
  }
  const HEADER_2023 = [
    'geoid', 'name', 'state', 'county', 'lat', 'lon', 'pop',
    'repRatio', 'youngShare', 'share65', 'share45_64',
    'eduEmpShare', 'healthEmpShare', 'pubAdminShare', 'artsEmpShare', 'profInfoFireShare', 'armedShare',
    'bachShare', 'gradShare', 'collegeShare',
    'seasonalShare', 'distressVacancy', 'newBuildShare', 'foreignShare',
    'medianValue', 'medianHHInc', 'meanHHInc', 'valueToIncome', 'density',
    'popAccess60', 'popAccess90', 'popAccess120', 'incAccess60', 'incAccess120',
    'uniEnroll15', 'uniEnroll60',
    'medianAge',
    'zhvi2015', 'zhvi2025', 'logGrowth15_25',
  ];
  writeCsv(path.join(DATA_DIR, 'features2023.csv.gz'), HEADER_2023, out2023);
}

main();

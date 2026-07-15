/**
 * Fetch place-level Census data via the data.census.gov table API (keyless).
 *
 * Produces:
 *   data/census2000.csv  — one row per place, year-2000 features (SF1 + SF3 profiles)
 *   data/acs2023.csv     — one row per place, ACS 2019-2023 5-year features
 *
 * All variable codes below were resolved against the corresponding
 * variables.json metadata (api.census.gov) on 2026-07-15; the label is noted
 * inline so future re-runs can re-verify.
 *
 * Usage: npx tsx aging-places/scripts/fetch-census.ts [--year=2000|2023] [--states=06,41]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CACHE_DIR, DATA_DIR, STATE_FIPS, ensureDirs, fetchWithRetry, num, writeCsv } from './lib.js';

interface TableSpec {
  id: string; // data.census.gov table id
  cols: Record<string, string | string[]>; // output column -> variable code(s); arrays are summed
}

// ---------------------------------------------------------------------------
// ACS 2019-2023 5-year (place level)
// ---------------------------------------------------------------------------
const TABLES_2023: TableSpec[] = [
  {
    id: 'ACSDP5Y2023.DP05',
    cols: {
      pop: 'DP05_0001E',          // Estimate!!SEX AND AGE!!Total population
      medianAge: 'DP05_0018E',    // ...Median age (years)
      pctUnder5: 'DP05_0005PE', pct5_9: 'DP05_0006PE', pct10_14: 'DP05_0007PE',
      pct15_19: 'DP05_0008PE', pct20_24: 'DP05_0009PE', pct25_34: 'DP05_0010PE',
      pct35_44: 'DP05_0011PE', pct45_54: 'DP05_0012PE', pct55_59: 'DP05_0013PE',
      pct60_64: 'DP05_0014PE', pct65_74: 'DP05_0015PE', pct75_84: 'DP05_0016PE',
      pct85up: 'DP05_0017PE',
      pct65up: 'DP05_0024PE',     // Percent!!SEX AND AGE!!Total population!!65 years and over
    },
  },
  {
    id: 'ACSDP5Y2023.DP02',
    cols: {
      households: 'DP02_0001E',   // Total households
      collegeEnroll: 'DP02_0058E',// Population 3+ enrolled: College or graduate school
      pctGrad: 'DP02_0066PE',     // Pop 25+: Graduate or professional degree
      pctBach: 'DP02_0068PE',     // Pop 25+: Bachelor's degree or higher
      foreignBorn: 'DP02_0094E',  // PLACE OF BIRTH: Foreign born (count)
    },
  },
  {
    id: 'ACSDP5Y2023.DP03',
    cols: {
      armedForces: 'DP03_0006E',  // In labor force: Armed Forces
      unempRate: 'DP03_0009PE',   // Unemployment Rate
      civEmployed: 'DP03_0032E',  // INDUSTRY universe: civilian employed 16+
      pctInfo: 'DP03_0039PE',     // Information
      pctFire: 'DP03_0040PE',     // Finance/insurance/real estate
      pctProf: 'DP03_0041PE',     // Professional/scientific/management/admin
      pctEduHealth: 'DP03_0042PE',// Educational services + health care + social assistance
      pctArtsRec: 'DP03_0043PE',  // Arts/entertainment/recreation/accommodation/food
      pctPubAdmin: 'DP03_0045PE', // Public administration
      medianHHInc: 'DP03_0062E',  // Median household income
      meanHHInc: 'DP03_0063E',    // Mean household income
    },
  },
  {
    id: 'ACSDP5Y2023.DP04',
    cols: {
      units: 'DP04_0001E',        // Total housing units
      occupied: 'DP04_0002E',     // Occupied housing units
      vacant: 'DP04_0003E',       // Vacant housing units
      built2020up: 'DP04_0017E',  // Built 2020 or later
      built2010s: 'DP04_0018E',   // Built 2010 to 2019
      built2000s: 'DP04_0019E',   // Built 2000 to 2009
      medianValue: 'DP04_0089E',  // Owner-occupied units: median value ($)
      medianRent: 'DP04_0134E',   // Median gross rent ($)
    },
  },
  {
    id: 'ACSDT5Y2023.C24030',
    cols: {
      eduEmpM: 'C24030_022E',     // Male: Educational services
      healthEmpM: 'C24030_023E',  // Male: Health care and social assistance
      eduEmpF: 'C24030_049E',     // Female: Educational services
      healthEmpF: 'C24030_050E',  // Female: Health care and social assistance
    },
  },
  {
    id: 'ACSDT5Y2023.B25004',
    cols: {
      seasonalUnits: 'B25004_006E', // Vacant: for seasonal, recreational, occasional use
    },
  },
  {
    id: 'ACSDT5Y2023.B19025',
    cols: {
      aggHHInc: 'B19025_001E',    // Aggregate household income ($)
    },
  },
];

// ---------------------------------------------------------------------------
// Census 2000 (place level): SF1 detailed tables + SF3 profiles
// ---------------------------------------------------------------------------
// P012 age brackets are summed into cohorts at extraction time (see AGE2000).
const P012_COLS: Record<string, string> = {};
for (let i = 1; i <= 49; i++) P012_COLS[`P012${String(i).padStart(3, '0')}`] = `P012${String(i).padStart(3, '0')}`;

// SF3-profile tables (DECENNIALDPSF32000.*) 500 on wildcard place queries, so
// year-2000 socioeconomic features come from SF3 detailed tables instead.
const TABLES_2000: TableSpec[] = [
  { id: 'DECENNIALSF12000.P012', cols: P012_COLS }, // SEX BY AGE, 49 cells
  {
    id: 'DECENNIALSF12000.H005',
    cols: {
      vacant: 'H005001',          // Total vacant
      seasonalUnits: 'H005005',   // For seasonal, recreational, or occasional use
    },
  },
  { id: 'DECENNIALSF12000.H001', cols: { units: 'H001001' } },
  {
    id: 'DECENNIALSF32000.P037', // SEX BY EDUCATIONAL ATTAINMENT, pop 25+
    cols: {
      pop25up: 'P037001',
      bachUp: ['P037015', 'P037016', 'P037017', 'P037018', 'P037032', 'P037033', 'P037034', 'P037035'],
      gradUp: ['P037016', 'P037017', 'P037018', 'P037033', 'P037034', 'P037035'],
    },
  },
  {
    id: 'DECENNIALSF32000.P036', // SCHOOL ENROLLMENT BY LEVEL
    cols: {
      collegeEnroll: ['P036018', 'P036021', 'P036041', 'P036044'], // undergrad + grad, M+F
    },
  },
  {
    id: 'DECENNIALSF32000.P049', // SEX BY INDUSTRY, employed civilians 16+
    cols: {
      civEmployed: 'P049001',
      eduEmp: ['P049022', 'P049049'],      // Educational services
      healthEmp: ['P049023', 'P049050'],   // Health care and social assistance
      pubAdminEmp: ['P049028', 'P049055'], // Public administration
      artsEmp: ['P049024', 'P049051'],     // Arts/ent/rec/accommodation/food
      infoEmp: ['P049013', 'P049040'],
      profEmp: ['P049017', 'P049044'],
      fireEmp: ['P049014', 'P049041'],
    },
  },
  {
    id: 'DECENNIALSF32000.P043',
    cols: { armedForces: ['P043004', 'P043011'] }, // In Armed Forces, M+F
  },
  { id: 'DECENNIALSF32000.P021', cols: { foreignBorn: 'P021013' } },
  { id: 'DECENNIALSF32000.P053', cols: { medianHHInc: 'P053001' } },
  { id: 'DECENNIALSF32000.P082', cols: { perCapInc: 'P082001' } },
  { id: 'DECENNIALSF32000.H085', cols: { medianValue: 'H085001' } }, // all owner-occupied
  { id: 'DECENNIALSF32000.H063', cols: { medianRent: 'H063001' } },
  {
    id: 'DECENNIALSF32000.H034', // YEAR STRUCTURE BUILT (counts)
    cols: {
      built99_00: 'H034002',
      built95_98: 'H034003',
      built90_94: 'H034004',
    },
  },
];

// P012 bracket -> [maleIdx, femaleIdx] cell numbers (1-based within P012).
// Brackets: 1 Total, 2 Male, 3 M<5, 4 M5-9, 5 M10-14, 6 M15-17, 7 M18-19, 8 M20,
// 9 M21, 10 M22-24, 11 M25-29, 12 M30-34, 13 M35-39, 14 M40-44, 15 M45-49,
// 16 M50-54, 17 M55-59, 18 M60-61, 19 M62-64, 20 M65-66, 21 M67-69, 22 M70-74,
// 23 M75-79, 24 M80-84, 25 M85+; female mirrors at +24 (26 Female, 27 F<5 ...).
const AGE2000: Record<string, number[]> = {
  a0_19: [3, 4, 5, 6, 7, 27, 28, 29, 30, 31],
  a20_24: [8, 9, 10, 32, 33, 34],
  a25_34: [11, 12, 35, 36],
  a35_44: [13, 14, 37, 38],
  a45_64: [15, 16, 17, 18, 19, 39, 40, 41, 42, 43],
  a65up: [20, 21, 22, 23, 24, 25, 44, 45, 46, 47, 48, 49],
};

async function fetchTable(id: string, stateFips: string): Promise<{ header: string[]; rows: string[][] }> {
  const cacheFile = path.join(CACHE_DIR, `${id}-${stateFips}.json`);
  let text: string;
  if (fs.existsSync(cacheFile)) {
    text = fs.readFileSync(cacheFile, 'utf8');
  } else {
    const url = `https://data.census.gov/api/access/data/table?id=${id}&g=040XX00US${stateFips}%241600000`;
    text = await fetchWithRetry(url);
    JSON.parse(text); // validate before caching
    fs.writeFileSync(cacheFile, text);
    await new Promise((r) => setTimeout(r, 300));
  }
  const parsed = JSON.parse(text);
  const data: string[][] = parsed.response?.data;
  if (!data || data.length < 1) throw new Error(`no data for ${id} state ${stateFips}`);
  return { header: data[0], rows: data.slice(1) };
}

async function buildYear(year: '2000' | '2023', states: string[]): Promise<void> {
  const tables = year === '2000' ? TABLES_2000 : TABLES_2023;
  const records = new Map<string, Record<string, number | string | null>>();

  // Pre-warm the cache with limited concurrency, then extract sequentially.
  const jobs = states.flatMap((st) => tables.map((t) => ({ st, t })));
  const POOL = 4;
  let jobIdx = 0;
  await Promise.all(
    Array.from({ length: POOL }, async () => {
      while (jobIdx < jobs.length) {
        const { st, t } = jobs[jobIdx++];
        try {
          await fetchTable(t.id, st);
        } catch {
          /* logged during extraction pass */
        }
      }
    })
  );

  for (const st of states) {
    for (const t of tables) {
      let header: string[], rows: string[][];
      try {
        ({ header, rows } = await fetchTable(t.id, st));
      } catch (e) {
        console.error(`FAILED ${t.id} state ${st}: ${(e as Error).message}`);
        continue;
      }
      const geoIdx = header.indexOf('GEO_ID');
      const nameIdx = header.indexOf('NAME');
      const colIdx: Record<string, number[]> = {};
      for (const [out, code] of Object.entries(t.cols)) {
        const codes = Array.isArray(code) ? code : [code];
        const idxs = codes.map((c) => header.indexOf(c));
        if (idxs.some((i) => i === -1)) {
          console.warn(`missing ${codes.join('/')} (${out}) in ${t.id} state ${st}`);
          continue;
        }
        colIdx[out] = idxs;
      }
      for (const row of rows) {
        const geoid = row[geoIdx]?.replace('1600000US', '');
        if (!geoid) continue;
        let rec = records.get(geoid);
        if (!rec) {
          rec = { geoid, name: row[nameIdx] ?? '' };
          records.set(geoid, rec);
        }
        if (t.id.endsWith('P012')) {
          // Sum P012 cells into cohorts
          const cells: (number | null)[] = [null];
          for (let i = 1; i <= 49; i++) {
            const idx = header.indexOf(`P012${String(i).padStart(3, '0')}`);
            cells.push(idx >= 0 ? num(row[idx]) : null);
          }
          rec.pop = cells[1];
          for (const [out, idxs] of Object.entries(AGE2000)) {
            let s = 0;
            for (const i of idxs) s += cells[i] ?? 0;
            rec[out] = s;
          }
        } else {
          for (const [out, idxs] of Object.entries(colIdx)) {
            if (idxs.length === 1) {
              rec[out] = num(row[idxs[0]]);
            } else {
              const vals = idxs.map((i) => num(row[i]));
              rec[out] = vals.every((v) => v === null) ? null : vals.reduce((s: number, v) => s + (v ?? 0), 0);
            }
          }
        }
      }
      console.log(`${year} ${t.id} state ${st}: ${rows.length} places`);
    }
  }

  const recs = Array.from(records.values());
  const cols = new Set<string>(['geoid', 'name']);
  for (const r of recs) for (const k of Object.keys(r)) cols.add(k);
  const header = Array.from(cols);
  const rows = recs.map((r) => header.map((h) => (r[h] === undefined ? null : (r[h] as string | number | null))));
  writeCsv(path.join(DATA_DIR, year === '2000' ? 'census2000.csv.gz' : 'acs2023.csv.gz'), header, rows);
}

async function main(): Promise<void> {
  ensureDirs();
  const yearArg = process.argv.find((a) => a.startsWith('--year='))?.split('=')[1];
  const statesArg = process.argv.find((a) => a.startsWith('--states='))?.split('=')[1];
  const states = statesArg ? statesArg.split(',') : STATE_FIPS;
  if (!yearArg || yearArg === '2023') await buildYear('2023', states);
  if (!yearArg || yearArg === '2000') await buildYear('2000', states);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

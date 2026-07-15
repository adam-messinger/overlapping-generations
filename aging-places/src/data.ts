/**
 * Load an epoch's feature file into the PlaceStatics structure consumed by
 * the simulation modules (z-scored features + initial levels).
 */
import * as path from 'node:path';
import { parseCsv, readCsvAuto, DATA_DIR } from '../scripts/lib.js';
import { COHORTS, Cohort, PlaceStatics } from './domain-types.js';

/** Features that are z-scored for the attraction pillars. */
const Z_FEATURES = [
  'repRatio', 'youngShare', 'share65', 'share45_64',
  'eduEmpShare', 'healthEmpShare', 'pubAdminShare', 'artsEmpShare', 'profInfoFireShare', 'armedShare',
  'bachShare', 'gradShare', 'collegeShare',
  'seasonalShare', 'distressVacancy', 'newBuildShare', 'foreignShare',
  'valueToIncome',
] as const;
const LOG_Z_FEATURES = [
  ['logDensity', 'density'],
  ['logPopAccess60', 'popAccess60'],
  ['logPopAccess120', 'popAccess120'],
  ['logUni15', 'uniEnroll15'],
  ['logUni60', 'uniEnroll60'],
] as const;

export interface EpochData {
  statics: PlaceStatics;
  /** Realized outcome (log ZHVI growth) when available — for hindcast scoring. */
  outcome: (number | null)[];
  /** Current ZHVI level when available. */
  zhviLevel: (number | null)[];
  raw: Record<string, (number | null)[]>;
}

export function loadEpoch(file: string, minPop = 250): EpochData {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, file)));
  const header = rows[0];
  const col = (name: string): number => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`${file}: missing column ${name}`);
    return i;
  };
  const body = rows.slice(1).filter((r) => r.length >= header.length && Number(r[col('pop')]) >= minPop);
  const n = body.length;
  const get = (r: string[], name: string): number | null => {
    const v = r[col(name)];
    if (v === '' || v === undefined) return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };

  const statics: PlaceStatics = {
    n,
    geoid: body.map((r) => r[col('geoid')]),
    name: body.map((r) => r[col('name')]),
    state: body.map((r) => r[col('state')]),
    z: {},
    pop0: new Float64Array(n),
    units0: new Float64Array(n),
    seasonalShare: new Float64Array(n),
    cohorts0: Object.fromEntries(COHORTS.map((c) => [c, new Float64Array(n)])) as Record<Cohort, Float64Array>,
    price0: new Float64Array(n),
    income0: new Float64Array(n),
  };

  // z-scored columns (null -> 0 after standardization)
  const zscore = (vals: (number | null)[]): Float64Array => {
    const present = vals.filter((v): v is number => v !== null);
    const m = present.reduce((s, v) => s + v, 0) / Math.max(1, present.length);
    const sd = Math.sqrt(present.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, present.length - 1)) || 1;
    const out = new Float64Array(vals.length);
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      out[i] = v === null ? 0 : Math.max(-4, Math.min(6, (v - m) / sd));
    }
    return out;
  };
  for (const f of Z_FEATURES) {
    statics.z[f] = zscore(body.map((r) => get(r, f)));
  }
  for (const [zName, rawName] of LOG_Z_FEATURES) {
    statics.z[zName] = zscore(body.map((r) => {
      const v = get(r, rawName);
      return v !== null && v >= 0 ? Math.log1p(v) : null;
    }));
  }
  // Regional dominance: the place's share of all population within ~120min.
  // High values mark hinterland hubs (the Fukuoka/Rochester-MN geometry).
  statics.z.domShare = zscore(body.map((r) => {
    const pop = get(r, 'pop');
    const acc = get(r, 'popAccess120');
    return pop !== null && acc !== null && acc > 0 ? Math.min(1, pop / acc) : null;
  }));
  // Prestige-scarcity: value/income gated by income relative to the epoch
  // median. Raw value/income conflates prestige (Nantucket: 12x at $110k
  // income) with poverty-unaffordability (Covelo: 9x at $36k income); only
  // the former is the Como/Carmel scarcity capital of THEORY.md.
  const incomes = body.map((r) => get(r, 'medianHHInc')).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const medianInc = incomes[Math.floor(incomes.length / 2)] || 60000;
  statics.z.prestigeVTI = zscore(body.map((r) => {
    const vti = get(r, 'valueToIncome');
    const inc = get(r, 'medianHHInc');
    if (vti === null || inc === null) return null;
    return Math.min(30, vti) * Math.min(2, inc / medianInc);
  }));
  statics.z.logIncome = zscore(body.map((r) => {
    const inc = get(r, 'medianHHInc');
    return inc !== null && inc > 0 ? Math.log(inc) : null;
  }));

  const zhviCol = header.includes('zhvi2000') ? 'zhvi2000' : 'zhvi2025';
  const outcome: (number | null)[] = [];
  const zhviLevel: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const r = body[i];
    const pop = get(r, 'pop') ?? 0;
    statics.pop0[i] = pop;
    statics.units0[i] = get(r, 'units') ?? Math.max(1, pop * 0.42);
    statics.seasonalShare[i] = get(r, 'seasonalShare') ?? 0;
    statics.cohorts0.a0_19[i] = (get(r, 'share0_19') ?? 0.25) * pop;
    statics.cohorts0.a20_24[i] = (get(r, 'share20_24') ?? 0.06) * pop;
    statics.cohorts0.a25_44[i] = (get(r, 'share25_44') ?? 0.26) * pop;
    statics.cohorts0.a45_64[i] = (get(r, 'share45_64') ?? 0.26) * pop;
    statics.cohorts0.a65up[i] = (get(r, 'share65') ?? 0.16) * pop;
    const income = get(r, 'medianHHInc') ?? 50000;
    statics.income0[i] = income;
    const zhvi = get(r, zhviCol);
    const medVal = get(r, 'medianValue');
    statics.price0[i] = zhvi ?? medVal ?? 3.5 * income;
    outcome.push(header.includes('logGrowth00_25') ? get(r, 'logGrowth00_25') : null);
    zhviLevel.push(header.includes('zhvi2025') ? get(r, 'zhvi2025') : null);
  }

  const raw: Record<string, (number | null)[]> = {};
  for (const name of header) raw[name] = body.map((r) => get(r, name));
  raw.geoid = body.map((r) => Number(r[col('geoid')]));

  return { statics, outcome, zhviLevel, raw };
}

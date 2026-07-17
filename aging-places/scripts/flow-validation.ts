/**
 * Step 3 — direct flow-level validation of the attraction mechanism.
 *
 * Plan (reviewed): the mechanism's core claim is about MIGRATION, but every
 * prior test scored it against prices or population change. Here it faces
 * realized IRS SOI county-to-county flows:
 *   outcome  = net migration rate 2015-2020 (five filing-year files,
 *              exemptions ~ persons), per county
 *   predictor = county-aggregated year-2000 working-age attraction
 *              (pop-weighted over modeled places; 15-year-old information,
 *              deliberately stale so there is no lookahead)
 *   kill comparator = lagged net migration rate 2005-2010 (same source)
 *   secondary window = 2005-2010 outcome without a lagged-flow comparator
 *              (pre-2005 files use a different format; not acquired)
 * Metrics: national Spearman; equal-zone within-commuting-zone Spearman
 * (cz2000 via county), zone bootstrap for the mechanism-minus-lag difference.
 * Review notes: (a) IRS exemptions undercount non-filers (students, elderly
 * poor) — reported, not corrected; (b) counties are the IRS unit; place
 * scores aggregate by primary county with coverage reported; (c) passing
 * here does NOT upgrade the label (scenario tooling) — this isolates WHERE
 * the mechanism's information lives (flows vs prices).
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DATA_DIR, OUT_DIR, RAW_DIR, ensureDirs, parseCsv, readCsvAuto, writeCsv } from './lib.js';
import { loadEpoch } from '../src/data.js';
import { attractionModule } from '../src/modules/attraction.js';

const WINDOWS: Record<string, string[]> = {
  '2015-2020': ['1516', '1617', '1718', '1819', '1920'],
  '2005-2010': ['0506', '0607', '0708', '0809', '0910'],
};

async function fetchFlows(): Promise<Record<string, Map<string, { net: number; base: number }>>> {
  const dir = path.join(RAW_DIR, 'irs');
  fs.mkdirSync(dir, { recursive: true });
  const manifest: Record<string, string> = {};
  const out: Record<string, Map<string, { net: number; base: number }>> = {};
  for (const [window, years] of Object.entries(WINDOWS)) {
    const net = new Map<string, { net: number; base: number }>();
    for (const yy of years) {
      for (const direction of ['inflow', 'outflow'] as const) {
        const file = path.join(dir, `county${direction}${yy}.csv`);
        if (!fs.existsSync(file)) {
          const url = `https://www.irs.gov/pub/irs-soi/county${direction}${yy}.csv`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
          fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        }
        manifest[`county${direction}${yy}`] = crypto.createHash('sha256')
          .update(fs.readFileSync(file)).digest('hex');
        const rows = parseCsv(fs.readFileSync(file, 'utf8'));
        const header = rows[0].map((h) => h.trim().toLowerCase());
        const col = (names: string[]): number => {
          const i = header.findIndex((h) => names.includes(h));
          if (i < 0) throw new Error(`${file}: none of ${names} in ${header.join(',')}`);
          return i;
        };
        // Two vintages: 2011+ uses y1_/y2_ fips; 2004-2010 uses *_dest/_origin.
        // inflow: focal = destination; outflow: focal = origin.
        const focalState = col(direction === 'inflow'
          ? ['y2_statefips', 'state_code_dest'] : ['y1_statefips', 'state_code_origin']);
        const focalCounty = col(direction === 'inflow'
          ? ['y2_countyfips', 'county_code_dest'] : ['y1_countyfips', 'county_code_origin']);
        const otherState = col(direction === 'inflow'
          ? ['y1_statefips', 'state_code_origin'] : ['y2_statefips', 'state_code_dest']);
        const otherCounty = col(direction === 'inflow'
          ? ['y1_countyfips', 'county_code_origin'] : ['y2_countyfips', 'county_code_dest']);
        const exempt = col(['n2', 'exemptions', 'exmpt_num']);
        for (const row of rows.slice(1)) {
          const os = Number(row[otherState]);
          const oc = Number(row[otherCounty]);
          const fsFips = String(Number(row[focalState])).padStart(2, '0');
          const fcFips = String(Number(row[focalCounty])).padStart(3, '0');
          if (Number(row[focalState]) > 56) continue;
          const fips = fsFips + fcFips;
          const n = Number(row[exempt]);
          if (!Number.isFinite(n) || n < 0) continue;
          const entry = net.get(fips) ?? { net: 0, base: 0 };
          // Same-county row (os==focal state && oc==focal county) = non-migrants -> base.
          const isSelf = String(Number(row[otherState])) === String(Number(row[focalState]))
            && String(Number(row[otherCounty])) === String(Number(row[focalCounty]));
          if (isSelf) {
            if (direction === 'inflow') entry.base += n; // count base once (inflow file only)
          } else if (os <= 57 && oc < 900) {
            // real counterpart county (excludes summary rows: state 57+, county 000/9xx aggregates)
            if (oc !== 0) entry.net += direction === 'inflow' ? n : -n;
          }
          net.set(fips, entry);
        }
      }
    }
    out[window] = net;
  }
  fs.writeFileSync(path.join(DATA_DIR, 'irs-flow-sources.json'), JSON.stringify(manifest, null, 1));
  return out;
}

function spearman(a: number[], b: number[]): number {
  const rank = (x: number[]): number[] => {
    const order = x.map((v, i) => ({ v, i })).sort((p, q) => p.v - q.v);
    const r = new Array(x.length).fill(0);
    order.forEach((o, k) => { r[o.i] = k; });
    return r;
  };
  const ra = rank(a); const rb = rank(b);
  const ma = ra.reduce((s, v) => s + v, 0) / ra.length;
  let cov = 0; let va = 0; let vb = 0;
  for (let i = 0; i < ra.length; i++) {
    cov += (ra[i] - ma) * (rb[i] - ma); va += (ra[i] - ma) ** 2; vb += (rb[i] - ma) ** 2;
  }
  return cov / Math.sqrt(va * vb);
}

async function main(): Promise<void> {
  ensureDirs();
  const flows = await fetchFlows();

  // County-aggregated year-2000 attraction (pop-weighted over modeled places)
  const epoch = loadEpoch('features2000.csv', 1000);
  const att = attractionModule.init(attractionModule.mergeParams({ statics: epoch.statics }));
  const marketRows = parseCsv(readCsvAuto(path.join(DATA_DIR, 'place-markets.csv.gz')));
  const mh = marketRows[0];
  const mAt = (n: string): number => mh.indexOf(n);
  const countyByGeoid = new Map<string, { fips: string; cz: string }>();
  for (const row of marketRows.slice(1)) {
    if (row.length < 3) continue;
    countyByGeoid.set(row[mAt('geoid')], { fips: row[mAt('primaryCountyFips')], cz: row[mAt('cz2000')] });
  }
  interface CountyAgg { attractionSum: number; pop: number; cz: string }
  const counties = new Map<string, CountyAgg>();
  for (let i = 0; i < epoch.statics.n; i++) {
    const geo = countyByGeoid.get(epoch.statics.geoid[i]);
    if (!geo || !geo.fips) continue;
    const pop = epoch.statics.pop0[i];
    // Frozen working attraction at origin (static pillar composite, no dynamics)
    const attraction = 0.30 * att.engines[i] + 0.25 * att.human[i] + 0.20 * att.access[i]
      + 0.15 * att.regen[i] + 0.10 * att.gateway[i] - 0.15 * att.distress[i]
      + 0.10 * Math.max(0, att.engines[i]) * Math.max(0, att.dominance[i]);
    const entry = counties.get(geo.fips) ?? { attractionSum: 0, pop: 0, cz: geo.cz };
    entry.attractionSum += attraction * pop;
    entry.pop += pop;
    counties.set(geo.fips, entry);
  }

  const rows: (string | number | null)[][] = [];
  const sample: { fips: string; cz: string; attraction: number; out1520: number; out0510: number }[] = [];
  for (const [fips, agg] of counties) {
    const late = flows['2015-2020'].get(fips);
    const early = flows['2005-2010'].get(fips);
    if (!late || !early || late.base <= 0 || early.base <= 0 || agg.pop <= 0) continue;
    const rateLate = late.net / (late.base / WINDOWS['2015-2020'].length);
    const rateEarly = early.net / (early.base / WINDOWS['2005-2010'].length);
    const attraction = agg.attractionSum / agg.pop;
    sample.push({ fips, cz: agg.cz, attraction, out1520: rateLate, out0510: rateEarly });
    rows.push([fips, agg.cz, +attraction.toFixed(4), +rateLate.toFixed(5), +rateEarly.toFixed(5), Math.round(agg.pop)]);
  }
  writeCsv(path.join(OUT_DIR, 'flow-validation-counties.csv.gz'),
    ['fips', 'cz2000', 'attraction2000', 'netRate2015_2020', 'netRate2005_2010', 'modeledPop'], rows);

  // National correlations
  const natMech = spearman(sample.map((s) => s.attraction), sample.map((s) => s.out1520));
  const natLag = spearman(sample.map((s) => s.out0510), sample.map((s) => s.out1520));
  const natEarly = spearman(sample.map((s) => s.attraction), sample.map((s) => s.out0510));

  // Equal-zone within-CZ Spearman + zone bootstrap of (mechanism - lag)
  const byZone = new Map<string, typeof sample>();
  for (const s of sample) {
    if (!s.cz) continue;
    const list = byZone.get(s.cz) ?? [];
    list.push(s);
    byZone.set(s.cz, list);
  }
  const zones = [...byZone.values()].filter((list) => list.length >= 5);
  const zMech: number[] = []; const zLag: number[] = [];
  for (const list of zones) {
    zMech.push(spearman(list.map((s) => s.attraction), list.map((s) => s.out1520)));
    zLag.push(spearman(list.map((s) => s.out0510), list.map((s) => s.out1520)));
  }
  const mean = (x: number[]): number => x.reduce((s, v) => s + v, 0) / x.length;
  // 4000-draw zone bootstrap
  let seed = 42;
  const rand = (): number => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
  const diffs: number[] = [];
  for (let b = 0; b < 4000; b++) {
    let dm = 0;
    for (let k = 0; k < zones.length; k++) {
      const j = Math.floor(rand() * zones.length);
      dm += zMech[j] - zLag[j];
    }
    diffs.push(dm / zones.length);
  }
  diffs.sort((a, b) => a - b);
  const report = {
    design: 'county net IRS migration rate 2015-2020 vs year-2000 county-aggregated attraction; kill comparator = lagged 2005-2010 net rate',
    counties: sample.length,
    zonesWith5PlusCounties: zones.length,
    national: {
      attraction2000_vs_netRate2015_2020: +natMech.toFixed(4),
      laggedNetRate2005_2010_vs_netRate2015_2020: +natLag.toFixed(4),
      attraction2000_vs_netRate2005_2010: +natEarly.toFixed(4),
    },
    withinCommutingZone: {
      equalZoneMeanSpearman_attraction: +mean(zMech).toFixed(4),
      equalZoneMeanSpearman_laggedFlows: +mean(zLag).toFixed(4),
      attractionMinusLag: {
        mean: +(mean(zMech) - mean(zLag)).toFixed(4),
        ci95: [+diffs[Math.floor(0.025 * diffs.length)].toFixed(4), +diffs[Math.floor(0.975 * diffs.length)].toFixed(4)],
      },
    },
    caveats: [
      'IRS exemptions undercount non-filers (students, low-income elderly)',
      'all-ages flows; the mechanism claim is strongest for working-age movers',
      'attraction aggregated from modeled places only (incorporated-place coverage of counties varies)',
    ],
  };
  fs.writeFileSync(path.join(DATA_DIR, 'flow-validation.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

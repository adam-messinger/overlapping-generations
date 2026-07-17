/**
 * Build data/origin-features-extended.csv.gz from acquired official sources.
 * Constructs (per origin year 2010/2015, on frozen 2020 boundaries):
 *   popAccess70km, popAccess140km, domShare — P34 centroids x census population
 *   priceToIncome — L01 residential median yen/m2 over SSDS taxable income per
 *     taxpayer (thousand yen) when income is acquired; price-only stays null
 *   bachelorShare, collegeEnrollShare, uniEnroll15km/60km, otherVacancyShare —
 *     joined from estat acquisitions when their fetchers have run
 * Absent inputs leave columns null; the backtest imputes and reports coverage.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, readCsvAuto, writeCsv } from '../../scripts/lib.js';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(JAPAN_DIR, 'data');

function loadTable(file: string): { header: string[]; rows: string[][] } | null {
  const full = path.join(DATA, file);
  if (!fs.existsSync(full) && !fs.existsSync(`${full}.gz`)) return null;
  const rows = parseCsv(readCsvAuto(full));
  return { header: rows[0], rows: rows.slice(1).filter((row) => row.length > 1) };
}

function havKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((bLat - aLat) * rad) / 2) ** 2
    + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(((bLon - aLon) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function main(): void {
  const panel = loadTable('census-2010-2020.csv');
  if (!panel) throw new Error('census panel missing');
  const at = (name: string): number => {
    const column = panel.header.indexOf(name);
    if (column < 0) throw new Error(`panel missing ${name}`);
    return column;
  };
  const codes = panel.rows.map((row) => row[at('code2020')]);

  // Centroids on 2014 codes; map to 2020 panel codes directly (codes are
  // stable 2014->2020 except a handful of mergers, which fall back below).
  const centroids = loadTable('mlit-centroids.csv');
  const centroidByCode = new Map<string, { lat: number; lon: number }>();
  if (centroids) {
    const ci = (name: string): number => centroids.header.indexOf(name);
    for (const row of centroids.rows) {
      centroidByCode.set(row[ci('code')], { lat: Number(row[ci('lat')]), lon: Number(row[ci('lon')]) });
    }
  }
  // Ward-level P34 codes (e.g. 01101 Sapporo Chuo-ku) roll up to the panel's
  // parent-city codes (01100) by averaging ward offices.
  const resolveCentroid = (code2020: string): { lat: number; lon: number } | null => {
    const direct = centroidByCode.get(code2020);
    if (direct) return direct;
    if (code2020.endsWith('00')) {
      const prefix = code2020.slice(0, 3);
      const wards = [...centroidByCode.entries()]
        .filter(([code]) => code.startsWith(prefix) && !code.endsWith('00'));
      if (wards.length > 0) {
        return {
          lat: wards.reduce((sum, [, p]) => sum + p.lat, 0) / wards.length,
          lon: wards.reduce((sum, [, p]) => sum + p.lon, 0) / wards.length,
        };
      }
    }
    return null;
  };

  const priceTables = {
    2010: loadTable('mlit-residential-price-2010.csv'),
    2015: loadTable('mlit-residential-price-2015.csv'),
  } as const;
  // Optional e-Stat acquisitions (built by their own fetchers when available)
  const estatExt = {
    2010: loadTable('estat-extended-2010.csv'),
    2015: loadTable('estat-extended-2015.csv'),
  } as const;

  const out: (string | number | null)[][] = [];
  for (const originYear of [2010, 2015] as const) {
    const popColumn = at(`population${originYear}`);
    const points = codes.map((code, index) => ({
      code,
      pop: Number(panel.rows[index][popColumn]) || 0,
      point: resolveCentroid(code),
    }));
    const located = points.filter((entry) => entry.point !== null);
    console.log(`${originYear}: centroids resolved for ${located.length}/${points.length}`);

    const priceMap = new Map<string, number>();
    const priceTable = priceTables[originYear];
    if (priceTable) {
      const pi = (name: string): number => priceTable.header.indexOf(name);
      for (const row of priceTable.rows) {
        // L01 codes are origin-vintage; direct + parent-city fallback join.
        priceMap.set(row[pi('code')], Number(row[pi('medianYenPerM2')]));
      }
    }
    const estat = estatExt[originYear];
    const estatByCode = new Map<string, Record<string, string>>();
    if (estat) {
      const ei = Object.fromEntries(estat.header.map((name, index) => [name, index]));
      for (const row of estat.rows) {
        estatByCode.set(row[ei.code2020], Object.fromEntries(
          estat.header.map((name, index) => [name, row[index]]),
        ));
      }
    }

    for (const entry of points) {
      let access70: number | null = null;
      let access140: number | null = null;
      let dom: number | null = null;
      if (entry.point) {
        let sum70 = 0;
        let sum140 = 0;
        for (const other of located) {
          const distance = havKm(entry.point.lat, entry.point.lon, other.point!.lat, other.point!.lon);
          if (distance <= 70) sum70 += other.pop;
          if (distance <= 140) sum140 += other.pop;
        }
        access70 = sum70;
        access140 = sum140;
        dom = sum140 > 0 ? Math.min(1, entry.pop / sum140) : null;
      }
      const price = priceMap.get(entry.code) ?? null;
      const estatRow = estatByCode.get(entry.code);
      const num = (name: string): number | null => {
        const value = estatRow?.[name];
        const parsed = value === undefined || value === '' ? NaN : Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const incomePerTaxpayer = num('taxableIncomePerTaxpayerThousandYen');
      const students = num('students18_24');
      // Radius sums of resident 18-24 students (census-side substitute for
      // campus enrollment; MEXT publishes no municipal table — see manifest).
      let uni15: number | null = null;
      let uni60: number | null = null;
      if (entry.point && estat) {
        let sum15 = 0;
        let sum60 = 0;
        for (const other of located) {
          const otherStudents = Number(estatByCode.get(other.code)?.students18_24 ?? NaN);
          if (!Number.isFinite(otherStudents)) continue;
          const distance = havKm(entry.point.lat, entry.point.lon, other.point!.lat, other.point!.lon);
          if (distance <= 15) sum15 += otherStudents;
          if (distance <= 60) sum60 += otherStudents;
        }
        uni15 = Math.log1p(sum15);
        uni60 = Math.log1p(sum60);
      }
      out.push([
        entry.code, originYear,
        num('bachelorShare'),
        students !== null && entry.pop > 0 ? +(students / entry.pop).toFixed(5) : null,
        uni15, uni60,
        access70 === null ? null : Math.log1p(access70),
        access140 === null ? null : Math.log1p(access140),
        dom,
        price !== null && incomePerTaxpayer !== null && incomePerTaxpayer > 0
          ? +(price / (incomePerTaxpayer * 1000)).toFixed(6)
          : null,
        num('otherVacancyShare'),
      ]);
    }
  }
  writeCsv(path.join(DATA, 'origin-features-extended.csv.gz'), [
    'code2020', 'originYear', 'bachelorShare', 'collegeEnrollShare',
    'uniEnroll15km', 'uniEnroll60km', 'popAccess70km', 'popAccess140km',
    'domShare', 'priceToIncome', 'otherVacancyShare',
  ], out);
}

main();

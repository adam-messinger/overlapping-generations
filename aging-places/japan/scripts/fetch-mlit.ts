/**
 * Fetch MLIT National Land Numerical Information archives (keyless):
 *   P34-14: one main municipal office point per municipality (centroid proxy)
 *   L01-10 / L01-15: posted land price points (residential = L01_003 "000")
 *
 * Terms: Government Standard Terms / PDL, attribution 「出典：国土交通省国土
 * 数値情報ダウンロードサイト」. Raw zips are hashed into data/mlit-sources.json;
 * derived tables: data/mlit-centroids.csv.gz, data/mlit-residential-price.csv.gz.
 *
 * Only ASCII-safe DBF columns are read (codes, prices), so Shift_JIS text
 * columns never need decoding.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeCsv } from '../../scripts/lib.js';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(JAPAN_DIR, '..', 'raw', 'japan', 'mlit');
const DATA = path.join(JAPAN_DIR, 'data');
const PREFS = Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, '0'));

async function download(url: string, file: string): Promise<string> {
  if (!fs.existsSync(file)) {
    let delay = 2000;
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        break;
      } catch (error) {
        if (attempt >= 5) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function zipMember(zip: string, suffix: string): Buffer {
  const listing = execFileSync('unzip', ['-Z1', zip]).toString().split('\n');
  const member = listing.find((name) => name.toLowerCase().endsWith(suffix));
  if (!member) throw new Error(`${zip}: no member ending ${suffix}`);
  return execFileSync('unzip', ['-p', zip, member], { maxBuffer: 256 * 1024 * 1024 });
}

/** Minimal DBF reader returning the requested columns as latin1 strings. */
function readDbf(buffer: Buffer, wanted: string[]): Record<string, string>[] {
  const nRecords = buffer.readUInt32LE(4);
  const headerSize = buffer.readUInt16LE(8);
  const recordSize = buffer.readUInt16LE(10);
  const fields: { name: string; offset: number; length: number }[] = [];
  let offset = 1; // record deletion flag
  for (let pos = 32; pos < headerSize - 1 && buffer[pos] !== 0x0d; pos += 32) {
    const name = buffer.toString('latin1', pos, pos + 11).replace(/\0.*$/, '');
    const length = buffer[pos + 16];
    fields.push({ name, offset, length });
    offset += length;
  }
  const byName = new Map(fields.map((field) => [field.name, field]));
  const out: Record<string, string>[] = [];
  for (let record = 0; record < nRecords; record++) {
    const base = headerSize + record * recordSize;
    if (buffer[base] === 0x2a) continue; // deleted
    const row: Record<string, string> = {};
    for (const name of wanted) {
      const field = byName.get(name);
      if (!field) throw new Error(`DBF missing column ${name}`);
      row[name] = buffer.toString('latin1', base + field.offset, base + field.offset + field.length).trim();
    }
    out.push(row);
  }
  return out;
}

/** Minimal point-shapefile reader (shape type 1): returns [lon, lat] per record. */
function readShpPoints(buffer: Buffer): Array<[number, number] | null> {
  const out: Array<[number, number] | null> = [];
  let pos = 100;
  while (pos + 12 <= buffer.length) {
    const contentWords = buffer.readInt32BE(pos + 4);
    const shapeType = buffer.readInt32LE(pos + 8);
    out.push(shapeType === 1
      ? [buffer.readDoubleLE(pos + 12), buffer.readDoubleLE(pos + 20)]
      : null);
    pos += 8 + contentWords * 2;
  }
  return out;
}

async function main(): Promise<void> {
  fs.mkdirSync(RAW, { recursive: true });
  const sources: Array<Record<string, string>> = [];

  // --- P34 municipal office points (2014 vintage) ---
  const centroidRows: (string | number)[][] = [];
  for (const pref of PREFS) {
    const url = `https://nlftp.mlit.go.jp/ksj/gml/data/P34/P34-14/P34-14_${pref}_GML.zip`;
    const file = path.join(RAW, `P34-14_${pref}.zip`);
    const sha256 = await download(url, file);
    sources.push({ dataset: 'P34-14', pref, url, sha256 });
    const dbf = readDbf(zipMember(file, '.dbf'), ['P34_001', 'P34_002']);
    const points = readShpPoints(zipMember(file, '.shp'));
    const seen = new Set<string>();
    dbf.forEach((row, index) => {
      if (row.P34_002 !== '1') return; // main office only
      const point = points[index];
      if (!point || seen.has(row.P34_001)) return;
      seen.add(row.P34_001);
      centroidRows.push([row.P34_001, +point[1].toFixed(6), +point[0].toFixed(6)]);
    });
  }
  writeCsv(path.join(DATA, 'mlit-centroids.csv.gz'), ['code', 'lat', 'lon'], centroidRows);

  // --- L01 land prices, residential sites, municipal median ---
  for (const year of ['10', '15'] as const) {
    const byCode = new Map<string, number[]>();
    for (const pref of PREFS) {
      const url = `https://nlftp.mlit.go.jp/ksj/gml/data/L01/L01-${year}/L01-${year}_${pref}_GML.zip`;
      const file = path.join(RAW, `L01-${year}_${pref}.zip`);
      const sha256 = await download(url, file);
      sources.push({ dataset: `L01-${year}`, pref, url, sha256 });
      const dbf = readDbf(zipMember(file, '.dbf'), ['L01_003', 'L01_005', 'L01_006', 'L01_017']);
      for (const row of dbf) {
        if (row.L01_003 !== '000') continue; // residential classification
        const price = Number(row.L01_006);
        if (!Number.isFinite(price) || price <= 0) continue;
        const list = byCode.get(row.L01_017) ?? [];
        list.push(price);
        byCode.set(row.L01_017, list);
      }
    }
    const priceRows: (string | number)[][] = [];
    for (const [code, prices] of byCode) {
      prices.sort((a, b) => a - b);
      const mid = Math.floor(prices.length / 2);
      const median = prices.length % 2 === 1 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
      priceRows.push([code, 2000 + Number(year), Math.round(median), prices.length]);
    }
    writeCsv(
      path.join(DATA, `mlit-residential-price-20${year}.csv.gz`),
      ['code', 'year', 'medianYenPerM2', 'sites'],
      priceRows,
    );
  }

  fs.writeFileSync(path.join(DATA, 'mlit-sources.json'), JSON.stringify(sources, null, 1));
  console.log(`centroids: ${centroidRows.length}; sources: ${sources.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

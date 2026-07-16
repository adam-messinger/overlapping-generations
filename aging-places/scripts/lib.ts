/**
 * Shared helpers for the aging-places data pipeline.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';

export const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
export const DATA_DIR = path.join(REPO_ROOT, 'data');
export const OUT_DIR = path.join(REPO_ROOT, 'outputs');
/** Portable defaults. Both can be moved outside the repository with env vars. */
export const SCRATCH = process.env.AGING_SCRATCH ?? path.join(REPO_ROOT, '.cache');
export const RAW_DIR = process.env.AGING_RAW_DIR ?? path.join(REPO_ROOT, 'raw');
export const CACHE_DIR = path.join(SCRATCH, 'census-cache');

export function ensureDirs(): void {
  for (const d of [DATA_DIR, OUT_DIR, RAW_DIR, CACHE_DIR]) fs.mkdirSync(d, { recursive: true });
}

/** Minimal RFC-4180-ish CSV parser (handles quoted fields with commas/newlines). */
export function parseCsv(text: string, delim = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else if (c !== '\r') field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export function writeCsv(file: string, header: string[], rows: (string | number | null)[][]): void {
  const esc = (v: string | number | null): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) lines.push(r.map(esc).join(','));
  const text = lines.join('\n') + '\n';
  if (file.endsWith('.gz')) fs.writeFileSync(file, zlib.gzipSync(text, { level: 9 }));
  else fs.writeFileSync(file, text);
  console.log(`wrote ${file} (${rows.length} rows)`);
}

/** Read a CSV that may be stored gzipped (tries `<file>.gz` first, then plain). */
export function readCsvAuto(file: string): string {
  if (fs.existsSync(file + '.gz')) return zlib.gunzipSync(fs.readFileSync(file + '.gz')).toString('utf8');
  if (file.endsWith('.gz')) return zlib.gunzipSync(fs.readFileSync(file)).toString('utf8');
  return fs.readFileSync(file, 'utf8');
}

/** Parse a numeric census value; returns null for jam values / annotations. */
export function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[$,+%]/g, '').trim();
  if (s === '' || s === '-' || s === 'N' || s === '(X)' || s === '**' || s === '***' || s === 'null') return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  // ACS jam values (missing/suppressed markers)
  if (n <= -222222222) return null;
  return n;
}

export async function fetchWithRetry(url: string, tries = 5): Promise<string> {
  let delay = 2000;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const text = await res.text();
      if (res.ok && text.length > 0) return text;
      throw new Error(`HTTP ${res.status} (${text.slice(0, 100)})`);
    } catch (e) {
      if (attempt === tries) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error('unreachable');
}

/** 50 states + DC, 2-digit FIPS. */
export const STATE_FIPS = [
  '01', '02', '04', '05', '06', '08', '09', '10', '11', '12', '13', '15', '16', '17', '18',
  '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33',
  '34', '35', '36', '37', '38', '39', '40', '41', '42', '44', '45', '46', '47', '48', '49',
  '50', '51', '53', '54', '55', '56',
];

export const FIPS_TO_USPS: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT',
  '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL',
  '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD',
  '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE',
  '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
  '55': 'WI', '56': 'WY',
};

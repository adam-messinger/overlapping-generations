/**
 * Fetch the official 2010/2015 origin-year employment and foreign-resident
 * constructs used by the Japan development-window mechanism audit.
 *
 * This script deliberately requests no endpoint after 2015 and no outcome
 * after 2020. Raw API responses remain ignored; their hashes and exact table
 * selections are committed in data/origin-feature-sources.json.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, writeCsv } from '../../scripts/lib.js';
import { isAnalysisUnit } from '../src/census.js';
import {
  fetchEstatTable,
  parseEstatTable,
  type EstatFetchResult,
  type EstatLayout,
  type EstatModel,
  type EstatTableRow,
} from '../src/estat-db.js';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.resolve(JAPAN_DIR, '..', 'raw', 'japan');
const DATA_DIR = path.join(JAPAN_DIR, 'data');

interface SourceConfig {
  key: string;
  year: 2010 | 2015;
  sid: string;
  tableNumber: string;
  title: string;
  output: string;
  columns: string[];
  layout: (model: EstatModel, municipalityCodes: string[]) => EstatLayout;
}

interface SourceRecord {
  key: string;
  year: number;
  construct: string;
  tableNumber: string;
  statsDataId: string;
  url: string;
  selectedCodes: Record<string, string[]>;
  selectedDimensions: Array<{
    matterId: number;
    matterName: string;
    items: Array<{ code: string; name: string }>;
  }>;
  modelBytes: number;
  modelSha256: string;
  resultBytes: number;
  resultSha256: string;
  normalizedFile: string;
  normalizedBytes: number;
  normalizedSha256: string;
  rows: number;
  populationConcept: string;
}

const INDUSTRY_2010 = ['000', '141', '224', '239', '290', '301', '347'];
const INDUSTRY_2015 = ['0000', '1420', '2250', '2400', '2910', '3020', '3480'];
const EMPLOYMENT_COLUMNS = [
  'totalEmployed',
  'informationEmployed',
  'financeEmployed',
  'professionalEmployed',
  'educationEmployed',
  'healthEmployed',
  'publicAdminEmployed',
];

const SOURCES: SourceConfig[] = [
  {
    key: 'employment2010',
    year: 2010,
    sid: '0003052127',
    tableNumber: '00520',
    title: 'Industry, employment status, and sex by municipality',
    output: 'origin-employment2010.csv',
    columns: EMPLOYMENT_COLUMNS,
    layout: (_model, municipalityCodes) => ({
      rows: [1],
      cols: [4, 5, 6],
      tops: [18, 3, 2],
      selectedCodes: {
        1: municipalityCodes,
        4: INDUSTRY_2010,
        5: ['000'],
        6: ['000'],
        18: ['340'],
        3: ['00710'],
        2: ['2010000000'],
      },
    }),
  },
  {
    key: 'employment2015',
    year: 2015,
    sid: '0003175084',
    tableNumber: '00630',
    title: 'Industry and sex by municipality',
    output: 'origin-employment2015.csv',
    columns: EMPLOYMENT_COLUMNS,
    layout: (_model, municipalityCodes) => ({
      rows: [1],
      cols: [7, 3],
      tops: [18, 2],
      selectedCodes: {
        1: municipalityCodes,
        7: INDUSTRY_2015,
        3: ['0000'],
        18: ['1'],
        2: ['2015000000'],
      },
    }),
  },
  {
    key: 'foreign2010',
    year: 2010,
    sid: '0003038639',
    tableNumber: '04100',
    title: 'Foreign residents by nationality and sex by municipality',
    output: 'origin-foreign2010.csv',
    columns: ['foreignResidents'],
    layout: (_model, municipalityCodes) => ({
      rows: [1],
      cols: [5, 4],
      tops: [18, 3, 2],
      selectedCodes: {
        1: municipalityCodes,
        5: ['000'],
        4: ['000'],
        18: ['020'],
        3: ['00710'],
        2: ['2010000000'],
      },
    }),
  },
  {
    key: 'foreign2015',
    year: 2015,
    sid: '0003148596',
    tableNumber: '03800',
    title: 'Foreign residents by nationality and sex by municipality',
    output: 'origin-foreign2015.csv',
    columns: ['foreignResidents'],
    layout: (_model, municipalityCodes) => ({
      rows: [1],
      cols: [3, 4],
      tops: [18, 5, 2],
      selectedCodes: {
        1: municipalityCodes,
        3: ['0000'],
        4: ['0000'],
        18: ['020'],
        5: ['00710'],
        2: ['2015000000'],
      },
    }),
  },
];

function sha256(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function originMunicipalityCodes(year: 2010 | 2015): string[] {
  const file = path.join(RAW_DIR, `census${year}-basic.csv`);
  if (!fs.existsSync(file)) throw new Error(`missing official boundary source ${file}`);
  const rows = parseCsv(new TextDecoder('shift_jis').decode(fs.readFileSync(file)));
  const codes = rows.slice(10)
    .filter((row) => isAnalysisUnit(row[3], row[2]))
    .map((row) => row[2]);
  const unique = [...new Set(codes)].sort();
  if (unique.length !== codes.length || unique.length < 1_700) {
    throw new Error(`${year} municipality source has ${codes.length} rows and ${unique.length} unique codes`);
  }
  return unique;
}

function validateRows(
  source: SourceConfig,
  expectedCodes: string[],
  rows: EstatTableRow[],
): void {
  const returnedCodes = new Set(rows.map((row) => row.code));
  const missing = expectedCodes.filter((code) => !returnedCodes.has(code));
  const unexpected = rows.filter((row) => !expectedCodes.includes(row.code));
  if (missing.length > 0 || unexpected.length > 0 || rows.length !== expectedCodes.length) {
    throw new Error(
      `${source.key} geography mismatch: ${missing.length} missing, ${unexpected.length} unexpected, `
      + `${rows.length}/${expectedCodes.length} rows`,
    );
  }
  const wrongWidth = rows.filter((row) => row.values.length !== source.columns.length);
  if (wrongWidth.length > 0) {
    const widths = [...new Set(rows.map((row) => row.values.length))].sort((a, b) => a - b);
    throw new Error(
      `${source.key} has ${wrongWidth.length} rows with an unexpected column count `
      + `(expected ${source.columns.length}; observed ${widths.join(', ')})`,
    );
  }
}

function writeNormalized(source: SourceConfig, rows: EstatTableRow[]): string {
  const file = path.join(RAW_DIR, source.output);
  writeCsv(
    file,
    ['sourceCode', 'sourceName', ...source.columns],
    rows.map((row) => [row.code, row.name, ...row.values]),
  );
  return file;
}

function preservedRetrievalTime(): string {
  const file = path.join(DATA_DIR, 'origin-feature-sources.json');
  if (fs.existsSync(file)) {
    const existing = JSON.parse(fs.readFileSync(file, 'utf8')) as { retrievedNoLaterThan?: string };
    if (existing.retrievedNoLaterThan) return existing.retrievedNoLaterThan;
  }
  return new Date().toISOString();
}

function sourceRecord(
  source: SourceConfig,
  result: EstatFetchResult,
  layout: EstatLayout,
  normalizedFile: string,
): SourceRecord {
  const normalized = fs.readFileSync(normalizedFile);
  const selectedEntries = Object.entries(layout.selectedCodes)
    .filter(([matter]) => Number(matter) !== 1)
    .sort(([left], [right]) => Number(left) - Number(right));
  return {
    key: source.key,
    year: source.year,
    construct: source.title,
    tableNumber: source.tableNumber,
    statsDataId: source.sid,
    url: `https://www.e-stat.go.jp/dbview?sid=${source.sid}`,
    selectedCodes: Object.fromEntries(selectedEntries),
    selectedDimensions: selectedEntries.map(([matterIdText, codes]) => {
      const matterId = Number(matterIdText);
      const matter = Object.values(result.model.matters)
        .find((candidate) => candidate.matterId === matterId);
      if (!matter) throw new Error(`${source.key} model is missing selected matter ${matterId}`);
      const items = new Map(Object.values(matter.listData).map((item) => [item.code, item]));
      return {
        matterId,
        matterName: matter.matterName,
        items: codes.map((code) => {
          const item = items.get(code);
          if (!item) throw new Error(`${source.key} matter ${matterId} is missing selected code ${code}`);
          return { code, name: item.name };
        }),
      };
    }),
    modelBytes: Buffer.byteLength(result.modelText),
    modelSha256: sha256(result.modelText),
    resultBytes: Buffer.byteLength(result.resultText),
    resultSha256: sha256(result.resultText),
    normalizedFile: path.basename(normalizedFile),
    normalizedBytes: normalized.length,
    normalizedSha256: sha256(normalized),
    rows: result.rows.length,
    populationConcept: source.key.startsWith('employment')
      ? 'usual-resident workers age 15+; industry of resident employment; total sex; full municipality'
      : 'usual-resident non-Japanese population; total sex; full municipality',
  };
}

function cachedResult(source: SourceConfig): EstatFetchResult | null {
  const modelFile = path.join(RAW_DIR, `estat-${source.sid}-model.json`);
  const resultFile = path.join(RAW_DIR, `estat-${source.sid}-result.json`);
  if (!fs.existsSync(modelFile) || !fs.existsSync(resultFile)) return null;
  const modelText = fs.readFileSync(modelFile, 'utf8');
  const resultText = fs.readFileSync(resultFile, 'utf8');
  const result = JSON.parse(resultText) as { table?: string };
  if (!result.table) throw new Error(`cached e-Stat response ${resultFile} has no table`);
  return {
    modelText,
    resultText,
    model: JSON.parse(modelText) as EstatModel,
    tableHtml: result.table,
    rows: parseEstatTable(result.table),
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const codes = new Map<2010 | 2015, string[]>([
    [2010, originMunicipalityCodes(2010)],
    [2015, originMunicipalityCodes(2015)],
  ]);
  const records: SourceRecord[] = [];
  const only = process.argv.find((argument) => argument.startsWith('--only='))?.slice('--only='.length);
  const reuse = process.argv.includes('--reuse');
  const requested = only ? SOURCES.filter((source) => source.key === only) : SOURCES;
  if (requested.length === 0) throw new Error(`unknown --only source: ${only}`);
  for (const source of requested) {
    const municipalityCodes = codes.get(source.year)!;
    let frozenLayout: EstatLayout | null = null;
    const cached = reuse ? cachedResult(source) : null;
    console.log(
      `${cached ? 'reusing' : 'fetching'} ${source.key}: `
      + `${municipalityCodes.length.toLocaleString()} municipalities`,
    );
    const result = cached ?? await fetchEstatTable(source.sid, (model) => {
        frozenLayout = source.layout(model, municipalityCodes);
        return frozenLayout;
      });
    frozenLayout ??= source.layout(result.model, municipalityCodes);
    validateRows(source, municipalityCodes, result.rows);
    const normalizedFile = writeNormalized(source, result.rows);
    fs.writeFileSync(path.join(RAW_DIR, `estat-${source.sid}-model.json`), result.modelText);
    fs.writeFileSync(path.join(RAW_DIR, `estat-${source.sid}-result.json`), result.resultText);
    records.push(sourceRecord(source, result, frozenLayout!, normalizedFile));
  }
  if (only) return;
  const manifest = {
    retrievedNoLaterThan: preservedRetrievalTime(),
    post2020OutcomeIncluded: false,
    endpointPolicy: 'origin-year 2010 and 2015 features only; no outcome after 2020 requested',
    sources: records,
  };
  const target = path.join(DATA_DIR, 'origin-feature-sources.json');
  fs.writeFileSync(target, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`wrote ${target}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

/** Fetch official prefecture commuting matrices from e-Stat. */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.resolve(JAPAN_DIR, '..', 'raw', 'japan');
const DATA_DIR = path.join(JAPAN_DIR, 'data');
const TABLE_TITLE = '常住地による従業・通学市区町村，男女別15歳以上就業者数及び15歳以上通学者数';

type SurveyYear = 2010 | 2015;

const CONFIG: Record<SurveyYear, { classificationBase: number; tableNumber: string }> = {
  // Add the 1-based prefecture number to obtain each e-Stat classification.
  2010: { classificationBase: 1_039_653, tableNumber: '2' },
  2015: { classificationBase: 1_090_437, tableNumber: '3-2' },
};

interface SourceRecord {
  prefecture: string;
  classificationId: string;
  statInfId: string;
  url: string;
  bytes: number;
  sha256: string;
}

function cli(): { year: SurveyYear; prefectures: number[] } {
  const yearArg = process.argv.find((arg) => arg.startsWith('--year='))?.split('=')[1] ?? '2010';
  const year = Number(yearArg);
  if (year !== 2010 && year !== 2015) throw new Error(`unsupported commuting year ${yearArg}`);
  const prefectureArg = process.argv.find((arg) => arg.startsWith('--prefecture='))?.split('=')[1];
  const prefectures = prefectureArg
    ? prefectureArg.split(',').map(Number)
    : Array.from({ length: 47 }, (_, index) => index + 1);
  if (prefectures.some((value) => !Number.isInteger(value) || value < 1 || value > 47)) {
    throw new Error(`invalid prefecture list ${prefectureArg}`);
  }
  return { year, prefectures };
}

async function fetchRetry(url: string, binary = false): Promise<string | Uint8Array> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return binary
        ? new Uint8Array(await response.arrayBuffer())
        : await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

function tableId(html: string, prefecture: string, year: SurveyYear): string {
  const titleIndex = html.indexOf(TABLE_TITLE);
  if (titleIndex < 0) {
    throw new Error(`${year} table ${CONFIG[year].tableNumber} not found for prefecture ${prefecture}`);
  }
  const prefix = html.slice(Math.max(0, titleIndex - 1600), titleIndex);
  const values = [...prefix.matchAll(/data-value="(\d{12})"/g)];
  const id = values.at(-1)?.[1];
  if (!id) throw new Error(`statInfId not found for prefecture ${prefecture}`);
  return id;
}

async function fetchPrefecture(year: SurveyYear, prefectureNumber: number): Promise<SourceRecord> {
  const prefecture = String(prefectureNumber).padStart(2, '0');
  // e-Stat's prefecture result classifications are sequential from Hokkaido.
  const classificationId = String(CONFIG[year].classificationBase + prefectureNumber).padStart(12, '0');
  const listUrl = `https://www.e-stat.go.jp/stat-search/files?cycle=0&layout=datalist&tclass=${classificationId}`;
  const html = await fetchRetry(listUrl) as string;
  const statInfId = tableId(html, prefecture, year);
  const url = `https://www.e-stat.go.jp/stat-search/file-download?fileKind=1&statInfId=${statInfId}`;
  const file = path.join(RAW_DIR, `commuting${year}-${prefecture}.csv`);
  let bytes: Uint8Array;
  if (fs.existsSync(file) && fs.statSync(file).size > 100_000) {
    bytes = fs.readFileSync(file);
  } else {
    bytes = await fetchRetry(url, true) as Uint8Array;
    if (bytes.byteLength < 100_000) {
      throw new Error(`implausibly small commuting table for prefecture ${prefecture}: ${bytes.byteLength}`);
    }
    fs.writeFileSync(file, bytes);
  }
  const heading = new TextDecoder('shift_jis').decode(bytes.slice(0, 3000));
  if (!heading.includes(`第${CONFIG[year].tableNumber.replace('-2', '')}表`) || !heading.includes('常住地')) {
    throw new Error(`downloaded file failed table-title validation for prefecture ${prefecture}`);
  }
  const record = {
    prefecture,
    classificationId,
    statInfId,
    url,
    bytes: bytes.byteLength,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
  console.log(`${prefecture}: ${statInfId} (${(bytes.byteLength / 1_000_000).toFixed(1)} MB)`);
  return record;
}

async function main(): Promise<void> {
  const { year, prefectures } = cli();
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const pending = [...prefectures];
  const records: SourceRecord[] = [];
  const workers = Array.from({ length: 4 }, async () => {
    while (pending.length > 0) {
      const prefecture = pending.shift();
      if (prefecture === undefined) return;
      records.push(await fetchPrefecture(year, prefecture));
    }
  });
  await Promise.all(workers);
  records.sort((a, b) => a.prefecture.localeCompare(b.prefecture));
  fs.writeFileSync(
    path.join(DATA_DIR, `commuting${year}-sources.json`),
    JSON.stringify({ surveyYear: year, retrievedAt: new Date().toISOString(), sources: records }, null, 2) + '\n',
  );
  console.log(`wrote commuting source manifest (${records.length} prefectures)`);
}

await main();

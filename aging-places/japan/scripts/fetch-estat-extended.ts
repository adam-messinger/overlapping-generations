/**
 * Fetch the extended origin constructs from official e-Stat database tables
 * (sids verified 2026-07 against dbview titles):
 *   0003052134  2010 Census 産業等基本集計 表01020 — 在学か否か・最終卒業学校
 *               の種類(6区分) x 年齢(5歳階級) x 男女, municipal. Gives resident
 *               university-graduate share and 18-24 student counts. The 2015
 *               census has no education question; 2015 origin carries the 2010
 *               values (available-at-origin, recorded in the manifest).
 *   0000020203  SSDS 市区町村データ C 経済基盤 (boundary-standardized) —
 *               課税対象所得 C120110 / 納税義務者数 C120120, FY2010 and FY2015.
 *   0003100835 / 0003099766  HLS 2013 municipal vacant dwellings by type / total
 *   0003010419 / 0003009773  HLS 2008 equivalents (~pop>=15k coverage only)
 *
 * Outputs data/estat-extended-{2010,2015}.csv plus data/estat-extended-sources.json.
 * Raw model/result JSON is cached under raw/japan/ for --reuse runs.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, readCsvAuto, writeCsv } from '../../scripts/lib.js';
import {
  fetchEstatTable, type EstatFetchResult, type EstatMatter, type EstatModel, type EstatTableRow,
} from '../src/estat-db.js';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.resolve(JAPAN_DIR, '..', 'raw', 'japan');
const DATA_DIR = path.join(JAPAN_DIR, 'data');

function matterByName(model: EstatModel, pattern: RegExp): EstatMatter {
  const matters = Object.values(model.matters);
  const hit = matters.find((matter) => pattern.test(matter.matterName));
  if (!hit) {
    throw new Error(`no dimension matching ${pattern}; available: ${
      matters.map((matter) => `${matter.matterId}:${matter.matterName}`).join(' | ')}`);
  }
  return hit;
}

function codesByName(matter: EstatMatter, patterns: RegExp[]): string[] {
  const items = Object.values(matter.listData);
  const out: string[] = [];
  for (const pattern of patterns) {
    const hit = items.find((item) => pattern.test(item.name));
    if (!hit) {
      throw new Error(`dimension ${matter.matterName}: no item matching ${pattern}; items: ${
        items.slice(0, 40).map((item) => `${item.code}:${item.name}`).join(' | ')}`);
    }
    out.push(hit.code);
  }
  return out;
}

function allCodes(matter: EstatMatter): string[] {
  return Object.values(matter.listData).map((item) => item.code);
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** 2010-vintage municipal code -> frozen 2020 code. */
function audit2010Map(): Map<string, string> {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, 'boundary-audit-2010-2020.csv')));
  const header = rows[0];
  const at = (name: string): number => header.indexOf(name);
  const map = new Map<string, string>();
  for (const row of rows.slice(1)) {
    if (row[at('operation')] === 'excluded') continue;
    map.set(row[at('sourceCode')], row[at('targetCode2020')]);
  }
  return map;
}

function panelCodes(): string[] {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, 'census-2010-2020.csv')));
  const code = rows[0].indexOf('code2020');
  return rows.slice(1).filter((row) => row.length > 1).map((row) => row[code]);
}

interface FetchSpec {
  key: string;
  sid: string;
  title: string;
  /** Column labels for the selected value columns, in selection order. */
  columns: string[];
  layout: (model: EstatModel) => ReturnType<Parameters<typeof fetchEstatTable>[1]>;
}

async function runFetch(spec: FetchSpec, reuse: boolean): Promise<{ rows: EstatTableRow[]; record: Record<string, unknown> }> {
  const modelFile = path.join(RAW_DIR, `estat-${spec.sid}-model.json`);
  const resultFile = path.join(RAW_DIR, `estat-${spec.sid}-result.json`);
  let result: EstatFetchResult;
  if (reuse && fs.existsSync(resultFile) && fs.existsSync(modelFile)) {
    const modelText = fs.readFileSync(modelFile, 'utf8');
    const resultText = fs.readFileSync(resultFile, 'utf8');
    const { parseEstatTable } = await import('../src/estat-db.js');
    result = {
      modelText,
      resultText,
      model: JSON.parse(modelText),
      rows: parseEstatTable(resultText),
    } as EstatFetchResult;
  } else {
    let attempt = 0;
    for (;;) {
      try {
        result = await fetchEstatTable(spec.sid, spec.layout);
        break;
      } catch (error) {
        attempt += 1;
        if (attempt >= 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, 15_000 * attempt)); // e-Stat 503 backoff
      }
    }
    fs.mkdirSync(RAW_DIR, { recursive: true });
    fs.writeFileSync(modelFile, result.modelText);
    fs.writeFileSync(resultFile, result.resultText);
  }
  console.log(`${spec.key}: ${result.rows.length} rows x ${spec.columns.length} columns`);
  return {
    rows: result.rows,
    record: {
      key: spec.key,
      sid: spec.sid,
      title: spec.title,
      url: `https://www.e-stat.go.jp/dbview?sid=${spec.sid}`,
      columns: spec.columns,
      rows: result.rows.length,
      resultSha256: sha256(result.resultText),
    },
  };
}

async function main(): Promise<void> {
  const reuse = process.argv.includes('--reuse');
  const to2020 = audit2010Map();
  const panel = new Set(panelCodes());
  const records: Record<string, unknown>[] = [];

  // --- 2010 census education (table 01020) ---
  const edu = await runFetch({
    key: 'education2010',
    sid: '0003052134',
    title: '2010 Census: school attendance / last school completed x age x sex, municipal',
    columns: ['pop15upTotal', 'graduatesTotal', 'universityGraduates', 'students15_19', 'students20_24'],
    layout: (model) => {
      const area = matterByName(model, /地域|市区町村/);
      const school = matterByName(model, /在学|卒業/);
      const age = matterByName(model, /年齢/);
      const sex = matterByName(model, /男女/);
      const time = matterByName(model, /時間軸/);
      const totalAge = codesByName(age, [/総数/])[0];
      const [total, graduates, university] = codesByName(school, [/総数/, /卒業者$|卒業者（総数）|卒業者\b/, /大学・大学院/]);
      const attending = codesByName(school, [/在学者/])[0];
      const [age1519, age2024] = codesByName(age, [/15～19|１５～１９/, /20～24|２０～２４/]);
      const extra: Record<number, string[]> = {};
      for (const matter of Object.values(model.matters)) {
        if ([area.matterId, school.matterId, age.matterId, sex.matterId, time.matterId].includes(matter.matterId)) continue;
        // Remaining dimensions (全域/表章項目): totals / single item
        const items = Object.values(matter.listData);
        const totalItem = items.find((item) => /総数|全域/.test(item.name)) ?? items[0];
        extra[matter.matterId] = [totalItem.code];
      }
      return {
        rows: [area.matterId],
        cols: [school.matterId, age.matterId],
        tops: [sex.matterId, time.matterId, ...Object.keys(extra).map(Number)],
        selectedCodes: {
          [area.matterId]: allCodes(area).filter((code) => /^\d{5}$/.test(code)),
          [school.matterId]: [total, graduates, university, attending],
          [age.matterId]: [totalAge, age1519, age2024],
          [sex.matterId]: codesByName(sex, [/総数/]),
          [time.matterId]: allCodes(time).filter((code) => code.startsWith('2010')),
          ...extra,
        },
      };
    },
  }, reuse);
  records.push(edu.record);
  // Column order from cols selection: school(4) x age(3) = 12 value columns in
  // row-major order [school][age]. Derive per-municipality constructs.
  const eduByCode = new Map<string, { bach: number | null; college: number | null; students: number | null }>();
  for (const row of edu.rows) {
    const target = to2020.get(row.code) ?? (panel.has(row.code) ? row.code : null);
    if (!target) continue;
    const value = (school: number, age: number): number | null => row.values[school * 3 + age] ?? null;
    const graduates = value(1, 0);
    const universityGrads = value(2, 0);
    const attending1519 = value(3, 1);
    const attending2024 = value(3, 2);
    const pop = value(0, 0);
    const previous = eduByCode.get(target) ?? { bach: 0, college: 0, students: 0 };
    // Aggregate merged municipalities by summing numerators/denominators via
    // weighted reconstruction: store sums, convert to shares afterwards.
    eduByCode.set(target, {
      bach: previous.bach === null ? null : previous.bach + (universityGrads ?? 0),
      college: previous.college === null ? null : previous.college + (graduates ?? 0),
      students: previous.students === null ? null : previous.students + ((attending1519 ?? 0) + (attending2024 ?? 0)),
    });
    void pop;
  }

  // --- SSDS taxable income (both fiscal years in one fetch) ---
  const ssds = await runFetch({
    key: 'ssdsIncome',
    sid: '0000020203',
    title: 'SSDS municipal C economic base: taxable income and taxpayers, FY2010/FY2015',
    columns: ['taxableIncome2010', 'taxpayers2010', 'taxableIncome2015', 'taxpayers2015'],
    layout: (model) => {
      const area = matterByName(model, /地域/);
      const item = matterByName(model, /経済基盤|表章項目/);
      const time = matterByName(model, /調査年|時間軸|年度/);
      const [income, taxpayers] = codesByName(item, [/課税対象所得/, /納税義務者数/]);
      const years = allCodes(time).filter((code) => /2010|2015/.test(code));
      const rest: Record<number, string[]> = {};
      for (const matter of Object.values(model.matters)) {
        if ([area.matterId, item.matterId, time.matterId].includes(matter.matterId)) continue;
        const items = Object.values(matter.listData);
        const total = items.find((entry) => /総数|計/.test(entry.name)) ?? items[0];
        rest[matter.matterId] = [total.code];
      }
      return {
        rows: [area.matterId],
        cols: [time.matterId, item.matterId],
        tops: Object.keys(rest).map(Number),
        selectedCodes: {
          [area.matterId]: allCodes(area).filter((code) => /^\d{5}$/.test(code)),
          [item.matterId]: [income, taxpayers],
          [time.matterId]: years,
          ...rest,
        },
      };
    },
  }, reuse);
  records.push(ssds.record);
  const incomeByCode = new Map<string, { y2010: number | null; y2015: number | null }>();
  for (const row of ssds.rows) {
    const target = panel.has(row.code) ? row.code : to2020.get(row.code);
    if (!target) continue;
    const per = (income: number | null, taxpayers: number | null): number | null => (
      income !== null && taxpayers !== null && taxpayers > 0 ? income / taxpayers : null
    );
    incomeByCode.set(target, {
      y2010: per(row.values[0] ?? null, row.values[1] ?? null),
      y2015: per(row.values[2] ?? null, row.values[3] ?? null),
    });
  }

  // --- HLS vacancy by type + totals (2008 -> origin 2010; 2013 -> origin 2015) ---
  const hlsSpecs = [
    { origin: 2010, types: '0003010419', totals: '0003009773' },
    { origin: 2015, types: '0003100835', totals: '0003099766' },
  ] as const;
  const vacancyByOrigin = new Map<number, Map<string, number | null>>();
  for (const spec of hlsSpecs) {
    const types = await runFetch({
      key: `hlsTypes${spec.origin}`,
      sid: spec.types,
      title: `HLS vacant dwellings by type, municipal (~pop>=15k), origin ${spec.origin}`,
      columns: ['otherVacant'],
      layout: (model) => {
        const area = matterByName(model, /地域|市区/);
        const kind = matterByName(model, /空き家の種類/);
        const other = codesByName(kind, [/その他/]);
        const rest: Record<number, string[]> = {};
        for (const matter of Object.values(model.matters)) {
          if ([area.matterId, kind.matterId].includes(matter.matterId)) continue;
          const items = Object.values(matter.listData);
          const total = items.find((item) => /総数|全域|計/.test(item.name)) ?? items[0];
          rest[matter.matterId] = [total.code];
        }
        return {
          rows: [area.matterId],
          cols: [kind.matterId],
          tops: Object.keys(rest).map(Number),
          selectedCodes: {
            [area.matterId]: allCodes(area).filter((code) => /^\d{5}$/.test(code)),
            [kind.matterId]: other,
            ...rest,
          },
        };
      },
    }, reuse);
    records.push(types.record);
    const totals = await runFetch({
      key: `hlsTotals${spec.origin}`,
      sid: spec.totals,
      title: `HLS total dwellings, municipal, origin ${spec.origin}`,
      columns: ['dwellingsTotal'],
      layout: (model) => {
        const area = matterByName(model, /地域|市区/);
        const occupancy = matterByName(model, /居住世帯/);
        const rest: Record<number, string[]> = {};
        for (const matter of Object.values(model.matters)) {
          if ([area.matterId, occupancy.matterId].includes(matter.matterId)) continue;
          const items = Object.values(matter.listData);
          const total = items.find((item) => /総数|全域|計/.test(item.name)) ?? items[0];
          rest[matter.matterId] = [total.code];
        }
        return {
          rows: [area.matterId],
          cols: [occupancy.matterId],
          tops: Object.keys(rest).map(Number),
          selectedCodes: {
            [area.matterId]: allCodes(area).filter((code) => /^\d{5}$/.test(code)),
            [occupancy.matterId]: codesByName(occupancy, [/総数/]),
            ...rest,
          },
        };
      },
    }, reuse);
    records.push(totals.record);
    const totalByCode = new Map<string, number>();
    for (const row of totals.rows) {
      const target = spec.origin === 2010 ? to2020.get(row.code) : (panel.has(row.code) ? row.code : to2020.get(row.code));
      if (!target || row.values[0] === null) continue;
      totalByCode.set(target, (totalByCode.get(target) ?? 0) + row.values[0]);
    }
    const shares = new Map<string, number | null>();
    for (const row of types.rows) {
      const target = spec.origin === 2010 ? to2020.get(row.code) : (panel.has(row.code) ? row.code : to2020.get(row.code));
      if (!target) continue;
      const total = totalByCode.get(target);
      shares.set(target, row.values[0] !== null && total ? row.values[0] / total : null);
    }
    vacancyByOrigin.set(spec.origin, shares);
  }

  // --- write per-origin extended tables ---
  for (const originYear of [2010, 2015] as const) {
    const rows: (string | number | null)[][] = [];
    for (const code of panel) {
      const eduRow = eduByCode.get(code); // 2015 carries 2010 values (logged)
      const income = incomeByCode.get(code);
      const incomeYear = originYear === 2010 ? income?.y2010 : income?.y2015;
      const vacancy = vacancyByOrigin.get(originYear)?.get(code);
      // graduate share among graduates-with-known-attainment; students as counts
      rows.push([
        code,
        eduRow && eduRow.college && eduRow.college > 0 && eduRow.bach !== null
          ? +(eduRow.bach / eduRow.college).toFixed(5) : null,
        null, // collegeEnrollShare computed in builder (students / population)
        eduRow?.students ?? null,
        incomeYear === null || incomeYear === undefined ? null : +incomeYear.toFixed(2),
        vacancy === null || vacancy === undefined ? null : +vacancy.toFixed(5),
      ]);
    }
    writeCsv(path.join(DATA_DIR, `estat-extended-${originYear}.csv`), [
      'code2020', 'bachelorShare', 'collegeEnrollShare', 'students18_24',
      'taxableIncomePerTaxpayerThousandYen', 'otherVacancyShare',
    ], rows);
  }

  fs.writeFileSync(path.join(DATA_DIR, 'estat-extended-sources.json'), JSON.stringify({
    post2020OutcomeIncluded: false,
    education2015Policy: '2010 census values carried to the 2015 origin (2015 census has no education question); available-at-origin',
    hlsCoverage: 'municipal vacancy published only for ~pop>=15k areas; smaller municipalities stay null and are median-imputed with reported coverage',
    sources: records,
  }, null, 1));
  console.log('wrote estat-extended tables + manifest');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

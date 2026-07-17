/** Build 2010/2015 institutional-employment and gateway origin features. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, readCsvAuto, writeCsv } from '../../scripts/lib.js';
import {
  codeOn2020Boundary,
  deriveBoundaryCrosswalk,
  finiteNumber,
} from '../src/census.js';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.resolve(JAPAN_DIR, '..', 'raw', 'japan');
const DATA_DIR = path.join(JAPAN_DIR, 'data');

const COUNT_COLUMNS = [
  'totalEmployed',
  'informationEmployed',
  'financeEmployed',
  'professionalEmployed',
  'educationEmployed',
  'healthEmployed',
  'publicAdminEmployed',
  'foreignResidents',
] as const;
type CountColumn = typeof COUNT_COLUMNS[number];

interface SourceCounts extends Record<CountColumn, number | null> {
  sourceCode: string;
  sourceName: string;
}

interface TargetCounts extends Record<CountColumn, number | null> {
  code: string;
  components: number;
}

interface CensusPopulation {
  population2010: number | null;
  population2015: number | null;
}

function rawCsv(name: string): string[][] {
  const file = path.join(RAW_DIR, name);
  if (!fs.existsSync(file)) throw new Error(`missing Japan origin-feature source ${file}`);
  return parseCsv(fs.readFileSync(file, 'utf8'));
}

function shiftJisCsv(name: string): string[][] {
  const file = path.join(RAW_DIR, name);
  if (!fs.existsSync(file)) throw new Error(`missing Japan boundary source ${file}`);
  return parseCsv(new TextDecoder('shift_jis').decode(fs.readFileSync(file)));
}

function index(header: string[], name: string): number {
  const result = header.indexOf(name);
  if (result < 0) throw new Error(`origin-feature source is missing ${name}`);
  return result;
}

function loadSource(year: 2010 | 2015): Map<string, SourceCounts> {
  const employment = rawCsv(`origin-employment${year}.csv`);
  const foreign = rawCsv(`origin-foreign${year}.csv`);
  const employmentHeader = employment[0];
  const foreignHeader = foreign[0];
  const employmentCode = index(employmentHeader, 'sourceCode');
  const employmentName = index(employmentHeader, 'sourceName');
  const foreignCode = index(foreignHeader, 'sourceCode');
  const foreignValue = index(foreignHeader, 'foreignResidents');
  const foreigners = new Map<string, number | null>();
  for (const row of foreign.slice(1)) {
    if (foreigners.has(row[foreignCode])) throw new Error(`duplicate ${year} foreign code ${row[foreignCode]}`);
    foreigners.set(row[foreignCode], finiteNumber(row[foreignValue]));
  }
  const result = new Map<string, SourceCounts>();
  for (const row of employment.slice(1)) {
    const code = row[employmentCode];
    if (result.has(code)) throw new Error(`duplicate ${year} employment code ${code}`);
    if (!foreigners.has(code)) throw new Error(`${year} foreign table is missing ${code}`);
    const counts = Object.fromEntries(COUNT_COLUMNS.map((name) => [
      name,
      name === 'foreignResidents'
        ? foreigners.get(code) ?? null
        : finiteNumber(row[index(employmentHeader, name)]),
    ])) as Record<CountColumn, number | null>;
    result.set(code, { sourceCode: code, sourceName: row[employmentName], ...counts });
  }
  if (result.size !== foreigners.size) {
    throw new Error(`${year} employment/foreign row mismatch: ${result.size}/${foreigners.size}`);
  }
  return result;
}

function emptyTarget(code: string): TargetCounts {
  return {
    code,
    components: 0,
    totalEmployed: 0,
    informationEmployed: 0,
    financeEmployed: 0,
    professionalEmployed: 0,
    educationEmployed: 0,
    healthEmployed: 0,
    publicAdminEmployed: 0,
    foreignResidents: 0,
  };
}

function addSource(target: TargetCounts, source: SourceCounts): void {
  target.components++;
  for (const column of COUNT_COLUMNS) {
    const current = target[column];
    const addition = source[column];
    target[column] = current === null || addition === null ? null : current + addition;
  }
}

function aggregate2010(
  source: Map<string, SourceCounts>,
): { targets: Map<string, TargetCounts>; audit: Array<Array<string | number>> } {
  const links = deriveBoundaryCrosswalk(
    shiftJisCsv('census2010-basic.csv'),
    shiftJisCsv('census2015-basic.csv'),
  );
  const targets = new Map<string, TargetCounts>();
  for (const link of links) {
    const row = source.get(link.sourceCode);
    if (!row) throw new Error(`2010 origin features are missing source ${link.sourceCode}`);
    const target = targets.get(link.targetCode) ?? emptyTarget(link.targetCode);
    addSource(target, row);
    targets.set(link.targetCode, target);
  }
  if (links.length !== source.size) {
    throw new Error(`2010 origin crosswalk uses ${links.length}/${source.size} source rows`);
  }
  return {
    targets,
    audit: links.map((link) => [
      2010, link.sourceCode, link.targetCode, link.operation, link.reason,
    ]),
  };
}

function aggregate2015(
  source: Map<string, SourceCounts>,
): { targets: Map<string, TargetCounts>; audit: Array<Array<string | number>> } {
  const targets = new Map<string, TargetCounts>();
  const audit: Array<Array<string | number>> = [];
  for (const row of source.values()) {
    const targetCode = codeOn2020Boundary(row.sourceCode);
    const target = targets.get(targetCode) ?? emptyTarget(targetCode);
    addSource(target, row);
    targets.set(targetCode, target);
    audit.push([
      2015,
      row.sourceCode,
      targetCode,
      targetCode === row.sourceCode ? 'unchanged' : 'aggregate',
      targetCode === row.sourceCode ? 'same official municipality code' : 'official code-only status change',
    ]);
  }
  return { targets, audit };
}

function censusPopulation(): Map<string, CensusPopulation> {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, 'census-2010-2020.csv')));
  const header = rows[0];
  const code = index(header, 'code2020');
  const p2010 = index(header, 'population2010');
  const p2015 = index(header, 'population2015');
  return new Map(rows.slice(1).map((row) => [row[code], {
    population2010: finiteNumber(row[p2010]),
    population2015: finiteNumber(row[p2015]),
  }]));
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  return numerator !== null && denominator !== null && denominator > 0
    ? numerator / denominator
    : null;
}

function countFinite(rows: Array<Array<string | number | null>>, column: number): number {
  return rows.filter((row) => typeof row[column] === 'number' && Number.isFinite(row[column])).length;
}

function main(): void {
  const source2010 = loadSource(2010);
  const source2015 = loadSource(2015);
  const a2010 = aggregate2010(source2010);
  const a2015 = aggregate2015(source2015);
  const population = censusPopulation();
  if (population.size !== 1_741 || a2010.targets.size !== 1_741 || a2015.targets.size !== 1_741) {
    throw new Error(
      `frozen geography mismatch: census ${population.size}, 2010 ${a2010.targets.size}, 2015 ${a2015.targets.size}`,
    );
  }

  const header = [
    'code2020', 'originYear', 'sourceComponents',
    ...COUNT_COLUMNS,
    'educationEmploymentShare', 'healthEmploymentShare', 'publicAdminEmploymentShare',
    'professionalInfoFinanceShare', 'foreignResidentShare',
  ];
  const derived: Array<Array<string | number | null>> = [];
  for (const year of [2010, 2015] as const) {
    const targets = year === 2010 ? a2010.targets : a2015.targets;
    for (const code of [...population.keys()].sort()) {
      const counts = targets.get(code);
      if (!counts) throw new Error(`${year} origin features have no target ${code}`);
      const total = counts.totalEmployed;
      const professional = [
        counts.informationEmployed,
        counts.financeEmployed,
        counts.professionalEmployed,
      ].some((value) => value === null)
        ? null
        : (counts.informationEmployed ?? 0)
          + (counts.financeEmployed ?? 0)
          + (counts.professionalEmployed ?? 0);
      const originPopulation = population.get(code)![
        year === 2010 ? 'population2010' : 'population2015'
      ];
      derived.push([
        code,
        year,
        counts.components,
        ...COUNT_COLUMNS.map((column) => counts[column]),
        ratio(counts.educationEmployed, total),
        ratio(counts.healthEmployed, total),
        ratio(counts.publicAdminEmployed, total),
        ratio(professional, total),
        ratio(counts.foreignResidents, originPopulation),
      ]);
    }
  }
  const output = path.join(DATA_DIR, 'origin-features.csv.gz');
  writeCsv(output, header, derived);
  writeCsv(
    path.join(DATA_DIR, 'origin-feature-boundary-audit.csv.gz'),
    ['sourceYear', 'sourceCode', 'targetCode2020', 'operation', 'reason'],
    [...a2010.audit, ...a2015.audit],
  );

  const coverageColumns = [
    'educationEmploymentShare',
    'healthEmploymentShare',
    'publicAdminEmploymentShare',
    'professionalInfoFinanceShare',
    'foreignResidentShare',
  ];
  const coverage = {
    post2020OutcomeIncluded: false,
    rows: derived.length,
    frozenBoundaryUnitsPerYear: population.size,
    years: Object.fromEntries([2010, 2015].map((year) => {
      const yearRows = derived.filter((row) => row[1] === year);
      return [year, {
        sourceMunicipalities: year === 2010 ? source2010.size : source2015.size,
        frozenBoundaryUnits: yearRows.length,
        aggregatedTargets: yearRows.filter((row) => Number(row[2]) > 1).length,
        finiteCoverage: Object.fromEntries(coverageColumns.map((name) => {
          const column = header.indexOf(name);
          const finite = countFinite(yearRows, column);
          return [name, { n: finite, share: +(finite / yearRows.length).toFixed(6) }];
        })),
      }];
    })),
  };
  const coverageFile = path.join(DATA_DIR, 'origin-feature-coverage.json');
  fs.writeFileSync(coverageFile, JSON.stringify(coverage, null, 2) + '\n');
  console.log(`wrote ${coverageFile}`);
}

main();

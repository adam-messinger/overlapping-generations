/**
 * Build the first frozen-boundary Japan development panel from official
 * e-Stat census tables. This script deliberately reads no post-2020 outcome.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, writeCsv } from '../../scripts/lib.js';
import {
  ageCohorts2010,
  ageCohorts2015,
  ageCohorts2020,
  codeOn2020Boundary,
  deriveBoundaryCrosswalk,
  finiteNumber,
  isAnalysisUnit,
  stripAreaOrdinal,
  type AgeCohorts,
} from '../src/census.js';
import { readXlsxRows } from './xlsx.js';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.resolve(JAPAN_DIR, '..', 'raw', 'japan');
const DATA_DIR = path.join(JAPAN_DIR, 'data');

interface CensusYear {
  population: number | null;
  privateHouseholds: number | null;
  totalHouseholds: number | null;
  density: number | null;
  areaKm2: number | null;
  cohorts: AgeCohorts;
}

interface Municipality {
  code: string;
  prefecture: string;
  name: string;
  identification: string;
  population2005: number | null;
  population2010: number | null;
  boundaryExact2010: boolean;
  readjustedPopulation2015: number | null;
  y2010?: CensusYear;
  y2015?: CensusYear;
  y2020?: CensusYear;
}

function requiredFile(name: string): string {
  const file = path.join(RAW_DIR, name);
  if (!fs.existsSync(file)) throw new Error(`missing Japan source file: ${file}`);
  return file;
}

function shiftJisCsv(name: string): string[][] {
  const bytes = fs.readFileSync(requiredFile(name));
  return parseCsv(new TextDecoder('shift_jis').decode(bytes));
}

function putUnique<T>(map: Map<string, T>, code: string, value: T, source: string): void {
  if (map.has(code)) throw new Error(`duplicate analysis unit ${code} in ${source}`);
  map.set(code, value);
}

function load2015(): Map<string, Municipality> {
  const basicRows = shiftJisCsv('census2015-basic.csv');
  const ageRows = shiftJisCsv('census2015-age.csv');
  const householdRows = shiftJisCsv('census2015-households.csv');

  const ages = new Map<string, AgeCohorts>();
  for (const row of ageRows.slice(12)) {
    if (row[1] !== '0101' || !isAnalysisUnit(row[3], row[2])) continue;
    putUnique(ages, codeOn2020Boundary(row[2]), ageCohorts2015(row), '2015 age table');
  }

  const privateHouseholds = new Map<string, number | null>();
  for (const row of householdRows.slice(7)) {
    if (!isAnalysisUnit(row[3], row[2])) continue;
    putUnique(
      privateHouseholds,
      codeOn2020Boundary(row[2]),
      finiteNumber(row[9]),
      '2015 household table',
    );
  }

  const result = new Map<string, Municipality>();
  for (const row of basicRows.slice(10)) {
    if (!isAnalysisUnit(row[3], row[2])) continue;
    const code = codeOn2020Boundary(row[2]);
    const cohorts = ages.get(code);
    if (!cohorts || !privateHouseholds.has(code)) {
      throw new Error(`2015 component table is missing analysis unit ${code}`);
    }
    putUnique(result, code, {
      code,
      prefecture: code.slice(0, 2),
      name: row[6],
      identification: row[3],
      population2005: null,
      population2010: finiteNumber(row[8]),
      boundaryExact2010: false,
      readjustedPopulation2015: null,
      y2015: {
        population: finiteNumber(row[7]),
        privateHouseholds: privateHouseholds.get(code) ?? null,
        totalHouseholds: finiteNumber(row[13]),
        areaKm2: finiteNumber(row[11]),
        density: finiteNumber(row[12]),
        cohorts,
      },
    }, '2015 basic table');
  }
  return result;
}

function addNullable(left: number | null, right: number | null): number | null {
  return left === null || right === null ? null : left + right;
}

function emptyCohorts(): AgeCohorts {
  return {
    age0_19: 0,
    age15_19: 0,
    age20_24: 0,
    age20_34: 0,
    age25_44: 0,
    age45_59: 0,
    age60_64: 0,
    age65plus: 0,
    working20_64: 0,
  };
}

function addCohorts(target: AgeCohorts, source: AgeCohorts): void {
  for (const key of Object.keys(target) as Array<keyof AgeCohorts>) {
    target[key] = addNullable(target[key], source[key]);
  }
}

interface Aggregate2010 {
  population2005: number | null;
  year: CensusYear;
}

function empty2010(): Aggregate2010 {
  return {
    population2005: 0,
    year: {
      population: 0,
      privateHouseholds: 0,
      totalHouseholds: 0,
      density: null,
      areaKm2: 0,
      cohorts: emptyCohorts(),
    },
  };
}

function load2010(existing: Map<string, Municipality>): void {
  const basicRows = shiftJisCsv('census2010-basic.csv');
  const targetBasicRows = shiftJisCsv('census2015-basic.csv');
  const ageRows = shiftJisCsv('census2010-age.csv');
  const householdRows = shiftJisCsv('census2010-households.csv');
  const crosswalk = deriveBoundaryCrosswalk(basicRows, targetBasicRows);

  const basic = new Map<string, string[]>();
  for (const row of basicRows.slice(10)) {
    if (isAnalysisUnit(row[3], row[2])) putUnique(basic, row[2], row, '2010 basic table');
  }
  const ages = new Map<string, AgeCohorts>();
  for (const row of ageRows.slice(11)) {
    if (row[1] !== '01' || row[7] !== '0' || !isAnalysisUnit(row[3], row[2])) continue;
    putUnique(ages, row[2], ageCohorts2010(row), '2010 age table');
  }
  const households = new Map<string, { total: number | null; private: number | null }>();
  for (const row of householdRows.slice(7)) {
    if (!isAnalysisUnit(row[3], row[2])) continue;
    putUnique(households, row[2], {
      total: finiteNumber(row[10]),
      private: finiteNumber(row[11]),
    }, '2010 household table');
  }

  const aggregates = new Map<string, Aggregate2010>();
  for (const link of crosswalk) {
    const basicRow = basic.get(link.sourceCode);
    const sourceAges = ages.get(link.sourceCode);
    const sourceHouseholds = households.get(link.sourceCode);
    if (!basicRow || !sourceAges || !sourceHouseholds) {
      throw new Error(`2010 component table is missing analysis unit ${link.sourceCode}`);
    }
    const aggregate = aggregates.get(link.targetCode) ?? empty2010();
    aggregate.population2005 = addNullable(aggregate.population2005, finiteNumber(basicRow[8]));
    aggregate.year.population = addNullable(aggregate.year.population, finiteNumber(basicRow[7]));
    aggregate.year.privateHouseholds = addNullable(
      aggregate.year.privateHouseholds,
      sourceHouseholds.private,
    );
    aggregate.year.totalHouseholds = addNullable(
      aggregate.year.totalHouseholds,
      sourceHouseholds.total,
    );
    aggregate.year.areaKm2 = addNullable(aggregate.year.areaKm2, finiteNumber(basicRow[11]));
    addCohorts(aggregate.year.cohorts, sourceAges);
    aggregates.set(link.targetCode, aggregate);
  }

  let exactTargets = 0;
  const inexactTargets = new Set<string>();
  for (const municipality of existing.values()) {
    const aggregate = aggregates.get(municipality.code);
    if (!aggregate) throw new Error(`2010 crosswalk does not cover target ${municipality.code}`);
    const population = aggregate.year.population;
    const area = aggregate.year.areaKm2;
    aggregate.year.density = population !== null && area !== null && area > 0
      ? population / area
      : null;
    municipality.population2005 = aggregate.population2005;
    municipality.y2010 = aggregate.year;
    municipality.boundaryExact2010 = population !== null
      && municipality.population2010 !== null
      && population === municipality.population2010;
    if (municipality.boundaryExact2010) exactTargets++;
    else inexactTargets.add(municipality.code);
  }
  if (exactTargets < 1730 || inexactTargets.size > 12) {
    throw new Error(
      `2010 boundary reconciliation failed: ${exactTargets} exact, ${inexactTargets.size} inexact`,
    );
  }
  console.log(
    `2010 boundary reconciliation: ${exactTargets}/${existing.size.toLocaleString()} exact targets; `
    + `${inexactTargets.size} boundary-transfer targets flagged`,
  );

  const auditRows = crosswalk.map((link) => {
    const exact = !inexactTargets.has(link.targetCode);
    return [
      '2010', link.sourceCode, link.targetCode, link.operation,
      exact ? link.reason : `${link.reason}; small inter-municipal boundary transfer`,
      exact ? 1 : 0,
    ];
  });
  writeCsv(
    path.join(DATA_DIR, 'boundary-audit-2010-2020.csv.gz'),
    ['sourceYear', 'sourceCode', 'targetCode2020', 'operation', 'reason', 'exactBoundary'],
    auditRows,
  );
}

function load2020(existing: Map<string, Municipality>): void {
  const basicRows = readXlsxRows(requiredFile('census2020-basic.xlsx'));
  const ageRows = readXlsxRows(requiredFile('census2020-age.xlsx'));
  const householdRows = readXlsxRows(requiredFile('census2020-households.xlsx'));

  const ages = new Map<string, AgeCohorts>();
  for (const row of ageRows.slice(11)) {
    if (row[0] !== '0_Total' || row[1] !== '0_Total') continue;
    if (!isAnalysisUnit(row[2], row[7])) continue;
    putUnique(ages, row[7], ageCohorts2020(row), '2020 age table');
  }

  const privateHouseholds = new Map<string, number | null>();
  for (const row of householdRows.slice(8)) {
    if (row[0] !== '0_Total') continue;
    const code = row[3]?.split('_', 1)[0] ?? '';
    if (!isAnalysisUnit(row[1], code)) continue;
    putUnique(privateHouseholds, code, finiteNumber(row[5]), '2020 household table');
  }

  for (const row of basicRows.slice(14)) {
    const code = row[5];
    if (!isAnalysisUnit(row[0], code)) continue;
    const municipality = existing.get(code);
    if (!municipality) throw new Error(`2020 analysis unit ${code} has no 2015 match`);
    const cohorts = ages.get(code);
    if (!cohorts || !privateHouseholds.has(code)) {
      throw new Error(`2020 component table is missing analysis unit ${code}`);
    }
    municipality.prefecture = stripAreaOrdinal(row[4]);
    municipality.name = stripAreaOrdinal(row[6]);
    municipality.identification = row[0];
    municipality.readjustedPopulation2015 = finiteNumber(row[10]);
    municipality.y2020 = {
      population: finiteNumber(row[7]),
      privateHouseholds: privateHouseholds.get(code) ?? null,
      totalHouseholds: finiteNumber(row[16]),
      areaKm2: finiteNumber(row[14]),
      density: finiteNumber(row[15]),
      cohorts,
    };
  }
}

function relativeDifference(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(1, Math.abs(a), Math.abs(b));
}

function reconcile(panel: Map<string, Municipality>): void {
  if (panel.size !== 1741) throw new Error(`expected 1,741 analysis units, found ${panel.size}`);
  let exactPopulationMatches = 0;
  let smallAdministrativeRevisions = 0;
  let suppressedPopulationPairs = 0;
  for (const municipality of panel.values()) {
    if (!municipality.y2010 || !municipality.y2015 || !municipality.y2020) {
      throw new Error(`incomplete census years for ${municipality.code}`);
    }
    const reported = municipality.y2015.population;
    const readjusted = municipality.readjustedPopulation2015;
    if (reported !== null && readjusted !== null) {
      const absoluteDifference = Math.abs(reported - readjusted);
      if (absoluteDifference > 5) {
        throw new Error(
          `2015 population does not reconcile on 2020 boundary for ${municipality.code}: ${reported} vs ${readjusted}`,
        );
      }
      if (absoluteDifference === 0) exactPopulationMatches++;
      else smallAdministrativeRevisions++;
    } else {
      suppressedPopulationPairs++;
    }
    for (const [year, census] of [
      [2010, municipality.y2010],
      [2015, municipality.y2015],
      [2020, municipality.y2020],
    ] as const) {
      const c = census.cohorts;
      const cohortTotal = [c.age0_19, c.age20_24, c.age25_44, c.age45_59, c.age60_64, c.age65plus];
      if (cohortTotal.every((value) => value !== null) && census.population !== null) {
        const knownAge = cohortTotal.reduce<number>((sum, value) => sum + (value ?? 0), 0);
        if (knownAge > census.population || relativeDifference(knownAge, census.population) > 0.25) {
          throw new Error(`implausible ${year} age reconciliation for ${municipality.code}`);
        }
      }
    }
  }
  if (exactPopulationMatches < 1730) {
    throw new Error(`too few exact 2015 population reconciliations: ${exactPopulationMatches}`);
  }
  console.log(
    `2015 population reconciliation: ${exactPopulationMatches} exact, `
    + `${smallAdministrativeRevisions} administrative revisions of <=5 people, `
    + `${suppressedPopulationPairs} suppressed pairs`,
  );
}

function logChange(end: number | null, start: number | null): number | null {
  return end !== null && start !== null && end > 0 && start > 0 ? Math.log(end / start) : null;
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  return numerator !== null && denominator !== null && denominator > 0 ? numerator / denominator : null;
}

function build(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const panel = load2015();
  load2010(panel);
  load2020(panel);
  reconcile(panel);

  const header = [
    'code2020', 'prefecture', 'name', 'identification',
    'boundaryExact2010', 'population2005', 'population2010',
    'population2010Readjusted', 'population2015', 'population2020',
    'privateHouseholds2010', 'privateHouseholds2015', 'privateHouseholds2020',
    'totalHouseholds2010', 'totalHouseholds2015', 'totalHouseholds2020',
    'areaKm2_2010', 'areaKm2_2015', 'areaKm2_2020',
    'density2010', 'density2015', 'density2020',
    'age0_19_2010', 'age15_19_2010', 'age20_24_2010', 'age20_34_2010', 'age25_44_2010',
    'age45_59_2010', 'age60_64_2010', 'age65plus2010', 'working20_64_2010',
    'age0_19_2015', 'age15_19_2015', 'age20_24_2015', 'age20_34_2015', 'age25_44_2015',
    'age45_59_2015', 'age60_64_2015', 'age65plus2015', 'working20_64_2015',
    'age0_19_2020', 'age15_19_2020', 'age20_24_2020', 'age20_34_2020', 'age25_44_2020',
    'age45_59_2020', 'age60_64_2020', 'age65plus2020', 'working20_64_2020',
    'laggedPopulationLogChange2005_2010', 'populationLogChange2010_2015',
    'privateHouseholdLogChange2010_2015', 'workingAgeLogChange2010_2015',
    'demographicCarryLogChange2010_2015', 'workingAgeResidual2010_2015',
    'populationLogChange2015_2020',
    'privateHouseholdLogChange2015_2020', 'workingAgeLogChange2015_2020',
    'demographicCarryLogChange2015_2020', 'workingAgeResidual2015_2020',
    'replacementRatio2010', 'replacementRatio2015', 'olderShare2010', 'olderShare2015',
  ];

  const rows = [...panel.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((m) => {
      const y10 = m.y2010!;
      const y15 = m.y2015!;
      const y20 = m.y2020!;
      const c10 = y10.cohorts;
      const c15 = y15.cohorts;
      const c20 = y20.cohorts;
      const carryWorking10 = [c10.age15_19, c10.age20_24, c10.age25_44, c10.age45_59]
        .every((value) => value !== null)
        ? (c10.age15_19 ?? 0) + (c10.age20_24 ?? 0) + (c10.age25_44 ?? 0) + (c10.age45_59 ?? 0)
        : null;
      const carryWorking = [c15.age15_19, c15.age20_24, c15.age25_44, c15.age45_59]
        .every((value) => value !== null)
        ? (c15.age15_19 ?? 0) + (c15.age20_24 ?? 0) + (c15.age25_44 ?? 0) + (c15.age45_59 ?? 0)
        : null;
      const workingChange10 = logChange(c15.working20_64, c10.working20_64);
      const demographicCarry10 = logChange(carryWorking10, c10.working20_64);
      const residual10 = workingChange10 !== null && demographicCarry10 !== null
        ? workingChange10 - demographicCarry10
        : null;
      const workingChange = logChange(c20.working20_64, c15.working20_64);
      const demographicCarry = logChange(carryWorking, c15.working20_64);
      const residual = workingChange !== null && demographicCarry !== null
        ? workingChange - demographicCarry
        : null;
      return [
        m.code, m.prefecture, m.name, m.identification,
        m.boundaryExact2010 ? 1 : 0, m.population2005, y10.population,
        m.population2010, y15.population, y20.population,
        y10.privateHouseholds, y15.privateHouseholds, y20.privateHouseholds,
        y10.totalHouseholds, y15.totalHouseholds, y20.totalHouseholds,
        y10.areaKm2, y15.areaKm2, y20.areaKm2,
        y10.density, y15.density, y20.density,
        c10.age0_19, c10.age15_19, c10.age20_24, c10.age20_34, c10.age25_44,
        c10.age45_59, c10.age60_64, c10.age65plus, c10.working20_64,
        c15.age0_19, c15.age15_19, c15.age20_24, c15.age20_34, c15.age25_44,
        c15.age45_59, c15.age60_64, c15.age65plus, c15.working20_64,
        c20.age0_19, c20.age15_19, c20.age20_24, c20.age20_34, c20.age25_44,
        c20.age45_59, c20.age60_64, c20.age65plus, c20.working20_64,
        logChange(y10.population, m.population2005),
        logChange(y15.population, y10.population),
        logChange(y15.privateHouseholds, y10.privateHouseholds),
        workingChange10,
        demographicCarry10,
        residual10,
        logChange(y20.population, y15.population),
        logChange(y20.privateHouseholds, y15.privateHouseholds),
        workingChange,
        demographicCarry,
        residual,
        ratio(c10.age25_44, c10.age65plus),
        ratio(c15.age25_44, c15.age65plus),
        ratio(c10.age65plus, y10.population),
        ratio(c15.age65plus, y15.population),
      ];
    });

  writeCsv(path.join(DATA_DIR, 'census-2010-2020.csv.gz'), header, rows);
}

build();

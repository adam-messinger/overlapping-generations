/** Build origin-year functional markets from official e-Stat commuting flows. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, writeCsv } from '../../scripts/lib.js';
import {
  codeOn2020Boundary,
  deriveBoundaryCrosswalk,
  finiteNumber,
  isAnalysisUnit,
  isTokyoSpecialWard,
  TOKYO_WARD_AGGREGATE,
} from '../src/census.js';
import { buildCommutingBasins, type CommutingOrigin } from '../src/markets.js';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.resolve(JAPAN_DIR, '..', 'raw', 'japan');
const DATA_DIR = path.join(JAPAN_DIR, 'data');
type SurveyYear = 2010 | 2015;

function surveyYear(): SurveyYear {
  const raw = process.argv.find((arg) => arg.startsWith('--year='))?.split('=')[1] ?? '2010';
  const parsed = Number(raw);
  if (parsed !== 2010 && parsed !== 2015) throw new Error(`unsupported commuting year ${raw}`);
  return parsed;
}

function shiftJisCsv(file: string): string[][] {
  return parseCsv(new TextDecoder('shift_jis').decode(fs.readFileSync(file)));
}

function basicRows(year: 2010 | 2015): string[][] {
  const file = path.join(RAW_DIR, `census${year}-basic.csv`);
  if (!fs.existsSync(file)) throw new Error(`missing source: ${file}`);
  return shiftJisCsv(file);
}

/**
 * Map ordinance-city wards to their parent. The commuting table publishes
 * Tokyo's 23 special wards as one origin, so they temporarily collapse to the
 * official 13100 aggregate for market construction only.
 */
function analysisParentMap(rows: string[][]): Map<string, string> {
  const result = new Map<string, string>();
  let designatedParent: string | null = null;
  for (const row of rows.slice(10)) {
    const code = row[2];
    const identification = row[3];
    if (identification === '1') {
      designatedParent = code;
      result.set(code, code);
    } else if (identification === '0') {
      if (isTokyoSpecialWard(code)) result.set(code, TOKYO_WARD_AGGREGATE);
      else if (designatedParent !== null) result.set(code, designatedParent);
    } else if (identification === '2' || identification === '3') {
      designatedParent = null;
      result.set(code, code);
    } else if (identification !== '9') {
      designatedParent = null;
    }
  }
  return result;
}

function addFlow(origin: CommutingOrigin, destination: string, flow: number): void {
  origin.externalFlows.set(destination, (origin.externalFlows.get(destination) ?? 0) + flow);
}

function sourceCrosswalk(
  year: SurveyYear,
  rows2010: string[][],
  rows2015: string[][],
): Map<string, string> {
  if (year === 2010) {
    return new Map(
      deriveBoundaryCrosswalk(rows2010, rows2015)
        .map((row) => [row.sourceCode, row.targetCode]),
    );
  }
  const links: Array<[string, string]> = [];
  for (const row of rows2015.slice(10)) {
    if (isAnalysisUnit(row[3], row[2])) links.push([row[2], codeOn2020Boundary(row[2])]);
  }
  return new Map(links);
}

function build(): void {
  const year = surveyYear();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const rows2010 = basicRows(2010);
  const rows2015 = basicRows(2015);
  const crosswalk = sourceCrosswalk(year, rows2010, rows2015);
  const parent = analysisParentMap(year === 2010 ? rows2010 : rows2015);
  const outcomeCodes = new Set([...crosswalk.values()]);
  const collapseTokyo = (code: string): string => (
    isTokyoSpecialWard(code) ? TOKYO_WARD_AGGREGATE : code
  );
  const marketCodes = new Set([...outcomeCodes].map(collapseTokyo));
  const expectedOriginSources = new Set(
    [...crosswalk.keys()].filter((code) => !isTokyoSpecialWard(code)),
  );
  expectedOriginSources.add(TOKYO_WARD_AGGREGATE);
  const origins = new Map<string, CommutingOrigin>();
  for (const code of marketCodes) origins.set(code, { employedResidents: 0, externalFlows: new Map() });

  const denominatorSeen = new Set<string>();
  let municipalFlowRows = 0;
  let unmappedDestinationRows = 0;
  for (let prefecture = 1; prefecture <= 47; prefecture++) {
    const pref = String(prefecture).padStart(2, '0');
    const file = path.join(RAW_DIR, `commuting${year}-${pref}.csv`);
    if (!fs.existsSync(file)) throw new Error(`missing commuting source: ${file}`);
    for (const row of shiftJisCsv(file).slice(12)) {
      const originSource = row[2];
      const isTokyoAggregate = originSource === TOKYO_WARD_AGGREGATE && row[3] === '1';
      if (!isTokyoAggregate && !isAnalysisUnit(row[3], originSource)) continue;
      const originTarget = isTokyoAggregate
        ? TOKYO_WARD_AGGREGATE
        : collapseTokyo(crosswalk.get(originSource) ?? '');
      if (!originTarget) throw new Error(`unmapped 2010 origin ${originSource}`);
      const origin = origins.get(originTarget)!;

      // The origin-total row supplies employed residents (both sexes).
      if (row[6] === 'gyo1A.3010') {
        if (denominatorSeen.has(originSource)) throw new Error(`duplicate origin total ${originSource}`);
        denominatorSeen.add(originSource);
        const workers = finiteNumber(row[10]);
        if (workers !== null) origin.employedResidents += workers;
        continue;
      }

      const destinationSource = row[4];
      if (!destinationSource || !['0', '1', '2', '3'].includes(row[5])) continue;
      const destinationParent = parent.get(destinationSource);
      const destinationTarget = destinationParent === TOKYO_WARD_AGGREGATE
        ? TOKYO_WARD_AGGREGATE
        : destinationParent
          ? collapseTokyo(crosswalk.get(destinationParent) ?? '')
          : undefined;
      if (!destinationTarget) {
        unmappedDestinationRows++;
        continue;
      }
      const workers = finiteNumber(row[10]);
      if (workers === null || workers <= 0) continue;
      addFlow(origin, destinationTarget, workers);
      municipalFlowRows++;
    }
  }

  const missingOrigins = [...expectedOriginSources].filter((code) => !denominatorSeen.has(code));
  const extraOrigins = [...denominatorSeen].filter((code) => !expectedOriginSources.has(code));
  if (missingOrigins.length > 0 || extraOrigins.length > 0) {
    throw new Error(
      `origin-total mismatch: ${missingOrigins.length} missing (${missingOrigins.slice(0, 5)}), `
      + `${extraOrigins.length} extra (${extraOrigins.slice(0, 5)})`,
    );
  }
  if (outcomeCodes.size !== 1741) {
    throw new Error(`expected 1,741 outcome units, found ${outcomeCodes.size}`);
  }
  if (origins.size !== 1719) {
    throw new Error(`expected 1,719 market-construction origins, found ${origins.size}`);
  }
  // Evacuated Fukushima municipalities can have a published zero/suppressed
  // employed-resident denominator. Presence of the origin-total row is
  // enforced above; a genuine zero is retained and self-links by construction.
  const zeroDenominators = [...origins.values()]
    .filter((origin) => origin.employedResidents === 0).length;
  for (const [code, origin] of origins) {
    if (origin.employedResidents < 0) throw new Error(`negative employed-resident denominator for ${code}`);
  }

  const collapsedAssignments = buildCommutingBasins(origins);
  const collapsedByCode = new Map(collapsedAssignments.map((row) => [row.code, row]));
  const assignments = [...outcomeCodes]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => {
      const collapsed = collapsedByCode.get(collapseTokyo(code));
      if (!collapsed) throw new Error(`missing market assignment for ${code}`);
      return {
        ...collapsed,
        code,
        assignmentLevel: isTokyoSpecialWard(code) ? 'tokyo_23_ward_aggregate' : 'municipality',
      };
    });
  const counts = new Map<string, number>();
  for (const row of assignments) counts.set(row.market, (counts.get(row.market) ?? 0) + 1);
  const linked = collapsedAssignments.filter((row) => row.linkedDestination !== row.code).length;
  const rows = assignments.map((row) => [
    row.code,
    `JP${year}-${row.market}`,
    row.linkedDestination,
    row.employedResidents,
    row.largestExternalFlow,
    row.largestExternalShare,
    counts.get(row.market)!,
    row.assignmentLevel,
  ]);
  writeCsv(
    path.join(DATA_DIR, `commuting-markets${year}.csv.gz`),
    [
      'code2020', `market${year}`, 'linkedDestination2020', `employedResidents${year}`,
      `largestExternalFlow${year}`, `largestExternalShare${year}`, 'marketUnitCount',
      'marketAssignmentLevel',
    ],
    rows,
  );
  console.log(
    `${assignments.length} outcome units; ${collapsedAssignments.length} market origins; `
    + `${counts.size} basins; ${linked} external links; `
    + `${municipalFlowRows} municipal flow rows; ${unmappedDestinationRows} unmapped destination rows; `
    + `${zeroDenominators} zero worker denominators`,
  );
}

build();

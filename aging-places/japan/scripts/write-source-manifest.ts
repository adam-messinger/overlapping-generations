/** Record exact official source IDs and hashes for the frozen Japan census panel. */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.resolve(JAPAN_DIR, '..', 'raw', 'japan');
const DATA_DIR = path.join(JAPAN_DIR, 'data');

const SOURCES = [
  { file: 'census2010-basic.csv', year: 2010, construct: 'population, area, households', statInfId: '000012460662', fileKind: 1 },
  { file: 'census2010-households.csv', year: 2010, construct: 'private and total households', statInfId: '000012460663', fileKind: 1 },
  { file: 'census2010-age.csv', year: 2010, construct: 'five-year age groups', statInfId: '000012460665', fileKind: 1 },
  { file: 'census2015-basic.csv', year: 2015, construct: 'population, area, households', statInfId: '000031473210', fileKind: 1 },
  { file: 'census2015-age.csv', year: 2015, construct: 'five-year age groups', statInfId: '000031473213', fileKind: 1 },
  { file: 'census2015-households.csv', year: 2015, construct: 'private households', statInfId: '000031473220', fileKind: 1 },
  { file: 'census2020-basic.xlsx', year: 2020, construct: 'population, area, households and readjusted 2015 population', statInfId: '000032142402', fileKind: 0 },
  { file: 'census2020-age.xlsx', year: 2020, construct: 'five-year age groups', statInfId: '000032142410', fileKind: 0 },
  { file: 'census2020-households.xlsx', year: 2020, construct: 'private households', statInfId: '000032142481', fileKind: 0 },
] as const;

function main(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sources = SOURCES.map((source) => {
    const file = path.join(RAW_DIR, source.file);
    if (!fs.existsSync(file)) throw new Error(`missing Japan census source ${file}`);
    const bytes = fs.readFileSync(file);
    return {
      ...source,
      survey: 'Statistics Bureau of Japan Population Census',
      url: `https://www.e-stat.go.jp/stat-search/file-download?fileKind=${source.fileKind}&statInfId=${source.statInfId}`,
      bytes: bytes.byteLength,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      populationConcept: 'usual-resident municipal census; 2020-boundary processing documented in boundary audit',
    };
  });
  const target = path.join(DATA_DIR, 'census-sources.json');
  fs.writeFileSync(target, JSON.stringify({
    retrievedNoLaterThan: new Date().toISOString(),
    post2020OutcomeIncluded: false,
    sources,
  }, null, 2) + '\n');
  console.log(`wrote ${target} (${sources.length} official tables)`);
}

main();

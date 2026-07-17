/**
 * Fetch the non-API inputs used by build-static.ts from their official hosts.
 *
 * Raw files are intentionally not committed. Re-running this script can pick
 * up a newer Zillow vintage, so the committed derived artifacts remain the
 * reproducible snapshot used for published validation.
 *
 * Usage:
 *   npx tsx aging-places/scripts/fetch-static.ts [--force] [--skip-zillow]
 *   npx tsx aging-places/scripts/fetch-static.ts --markets-only
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RAW_DIR, ensureDirs } from './lib.js';

const force = process.argv.includes('--force');
const skipZillow = process.argv.includes('--skip-zillow');
const marketsOnly = process.argv.includes('--markets-only');

async function download(url: string, file: string): Promise<string> {
  const destination = path.join(RAW_DIR, file);
  if (!force && fs.existsSync(destination) && fs.statSync(destination).size > 0) {
    console.log(`keeping ${destination}`);
    return destination;
  }
  console.log(`fetching ${url}`);
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const partial = `${destination}.part`;
  fs.writeFileSync(partial, new Uint8Array(await response.arrayBuffer()));
  fs.renameSync(partial, destination);
  console.log(`wrote ${destination} (${fs.statSync(destination).size} bytes)`);
  return destination;
}

function extract(zipFile: string): void {
  const result = spawnSync('unzip', ['-o', zipFile, '-d', RAW_DIR], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`unzip failed for ${zipFile}`);
}

async function main(): Promise<void> {
  ensureDirs();
  const archives = [
    ['https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2023_Gazetteer/2023_Gaz_place_national.zip', '2023_Gaz_place_national.zip'],
    ['https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip', 'HD2023.zip'],
    ['https://nces.ed.gov/ipeds/datacenter/data/EFFY2023_DIST.zip', 'EFFY2023_DIST.zip'],
    ['https://nces.ed.gov/ipeds/datacenter/data/FA2000HD.zip', 'FA2000HD.zip'],
    ['https://nces.ed.gov/ipeds/datacenter/data/EF2000A.zip', 'EF2000A.zip'],
  ] as const;
  if (!marketsOnly) {
    for (const [url, file] of archives) extract(await download(url, file));
  }

  await download(
    'https://www2.census.gov/geo/docs/reference/codes2020/national_place_by_county2020.txt',
    'place_by_county.txt'
  );
  await download(
    'https://ers.usda.gov/media/6968/2020-commuting-zones.csv?v=83214',
    'cz2020.csv'
  );
  // ERS publishes the start-period commuting-zone vintage only as legacy XLS.
  // data/county-cz2000.csv.gz is the committed lossless CSV conversion used by
  // build-markets.ts; retain the workbook so its provenance can be audited.
  await download(
    'https://ers.usda.gov/media/5688/2000-commuting-zones.xls?v=59751',
    'cz2000.xls'
  );
  await download(
    'https://www2.census.gov/programs-surveys/popest/tables/1990-2000/2000-subcounties-evaluation-estimates/sc2000f_us.txt',
    'population-1990-2000.txt'
  );
  if (!marketsOnly && !skipZillow) {
    const zillowUrl = process.env.AGING_ZHVI_URL ??
      'https://files.zillowstatic.com/research/public_csvs/zhvi/City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv';
    await download(zillowUrl, 'zhvi_city.csv');
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

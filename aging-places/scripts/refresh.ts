/**
 * One-shot, point-in-time U.S. aging-places refresh.
 *
 * This command captures source payloads through forecast-workbench, writes an
 * immutable versioned snapshot, runs the frozen production model against the
 * new inputs, compares it with the committed 2023 result, and performs one
 * retrospective rolling-origin audit. It defines no timers or monitors.
 *
 * Usage:
 *   npm run aging:refresh -- --vintage=2024
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  ForecastWorkbench,
  SystemClock,
  captureHttpArtifact,
  censusConnector,
  type Actor,
  type CredentialProvider,
  type DatasetSnapshot,
  type HttpSourceConnector,
  type SanitizedRequestEnvelope,
} from 'forecast-workbench';
import {
  acsFetchChunks,
  normalizeAcsPayloads,
  parseCensusArray,
  resolveAcsCrosswalk,
  type AcsDatasetKind,
  type AcsPayload,
  type AcsVariablesMetadata,
} from '../src/acs-panel.js';
import { runRollingOriginAudit } from './rolling-origin.js';
import {
  REPO_ROOT as AGING_ROOT,
  parseCsv,
  readCsvAuto,
  writeCsv,
} from './lib.js';

const REPOSITORY_ROOT = path.resolve(AGING_ROOT, '..');
const ACTOR: Actor = {
  id: 'aging-refresh',
  role: 'service',
  displayName: 'Aging Places one-shot refresh',
};
const ACS_LICENSE = 'U.S. Census Bureau public data';
const IPEDS_LICENSE = 'NCES IPEDS public data';
const ZILLOW_LICENSE = 'Zillow research data terms';

interface CapturedFile {
  recordId: string;
  rawArtifactId: string;
  schemaArtifactId?: string;
  bytes: Uint8Array;
}

interface AcsCapture {
  vintage: number;
  dataFile: string;
  snapshotRecordId: string;
  acquisitionRecordIds: string[];
  dataArtifactId: string;
  crosswalkArtifactId: string;
}

async function withRetry<T>(
  label: string,
  operation: () => Promise<T>,
  attempts = 4,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delayMs = 1_000 * 2 ** (attempt - 1);
      console.warn(
        `${label} failed on attempt ${attempt}/${attempts}; retrying in ${delayMs}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function arg(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

function parseEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const result: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}

function credentialProvider(): CredentialProvider {
  const values = {
    ...parseEnvFile(path.join(REPOSITORY_ROOT, '.env.census.local')),
    ...parseEnvFile(path.join(REPOSITORY_ROOT, '.env.forecast.local')),
    ...process.env,
  };
  const refs: Record<string, string | undefined> = {
    'census.default': values.CENSUS_API_KEY,
  };
  return async (reference) => {
    const value = refs[reference];
    if (!value) {
      throw new Error(
        `Credential '${reference}' is unavailable; expected CENSUS_API_KEY in .env.forecast.local or .env.census.local`,
      );
    }
    return value;
  };
}

function bytesConnector(options: {
  id: string;
  sourceId: string;
  url: string;
  documentationUrl: string;
  releaseVintage?: string;
  allowedHosts?: readonly string[];
  maxBytes?: number;
}): HttpSourceConnector<Record<string, never>, Uint8Array> {
  const url = new URL(options.url);
  const allowedHosts = options.allowedHosts ?? [url.hostname];
  return {
    id: options.id,
    version: '1.0.0',
    sourceId: options.sourceId,
    documentationUrl: options.documentationUrl,
    vintage: options.releaseVintage
      ? {
          sourceId: options.sourceId,
          capability: 'release-pinned',
          description: 'The requested URL names a published release or vintage.',
        }
      : {
          sourceId: options.sourceId,
          capability: 'current-only',
          description:
            'The source exposes a current file; this raw capture establishes its point-in-time vintage.',
          monitoringStartedAt: '2026-07-28T00:00:00.000Z',
        },
    responseSchema: {
      format: 'published file bytes',
      url: options.url,
    },
    buildRequest() {
      const envelope: SanitizedRequestEnvelope = {
        schemaVersion: 'forecast-workbench.sanitized-request/v1',
        uri: options.url,
        method: 'GET',
        credentialBindings: [],
        allowedHosts,
        timeoutMs: 120_000,
        maxBytes: options.maxBytes ?? 220 * 1024 * 1024,
        maxRedirects: 4,
      };
      return {
        envelope,
        ...(options.releaseVintage
          ? { sourceEffectiveVintage: options.releaseVintage }
          : {}),
      };
    },
    parse: (raw) => raw,
  };
}

function jsonMetadataConnector(
  vintage: number,
  dataset: AcsDatasetKind,
): HttpSourceConnector<Record<string, never>, AcsVariablesMetadata> {
  const suffix = dataset === 'profile' ? 'acs/acs5/profile' : 'acs/acs5';
  const uri = `https://api.census.gov/data/${vintage}/${suffix}/variables.json`;
  return {
    id: `census-acs5-${dataset}-metadata`,
    version: '1.0.0',
    sourceId: 'census.data-api',
    documentationUrl: 'https://api.census.gov/data.html',
    vintage: {
      sourceId: 'census.data-api',
      capability: 'release-pinned',
      description: 'The Census metadata URL contains the ACS release year.',
    },
    responseSchema: {
      format: 'Census variables.json',
      required: ['variables'],
    },
    buildRequest() {
      return {
        envelope: {
          schemaVersion: 'forecast-workbench.sanitized-request/v1',
          uri,
          method: 'GET',
          credentialBindings: [],
          allowedHosts: ['api.census.gov'],
          timeoutMs: 120_000,
          maxBytes: 80 * 1024 * 1024,
          maxRedirects: 2,
        },
        sourceEffectiveVintage: String(vintage),
      };
    },
    parse(raw) {
      const parsed = JSON.parse(new TextDecoder().decode(raw)) as AcsVariablesMetadata;
      if (!parsed.variables || typeof parsed.variables !== 'object') {
        throw new Error(`${vintage} ${dataset} metadata has no variables object`);
      }
      return parsed;
    },
  };
}

async function captureFile(options: {
  workbench: ForecastWorkbench;
  provider: CredentialProvider;
  connector: HttpSourceConnector<Record<string, never>, Uint8Array>;
  license: string;
}): Promise<CapturedFile> {
  const captured = await captureHttpArtifact({
    workbench: options.workbench,
    actor: ACTOR,
    connector: options.connector,
    query: {},
    credentialProvider: options.provider,
    classification: 'public',
    license: options.license,
    accessPolicy: 'Public source; preserve source terms and attribution.',
  });
  return {
    recordId: captured.acquisitionReceiptRecordId,
    rawArtifactId: captured.receipt.rawArtifactId,
    schemaArtifactId: captured.receipt.schemaArtifactId,
    bytes: captured.parsed,
  };
}

async function latestDatasetSnapshot(
  workbench: ForecastWorkbench,
  datasetId: string,
): Promise<{ recordId: string; snapshot: DatasetSnapshot } | null> {
  const matches: { recordId: string; snapshot: DatasetSnapshot }[] = [];
  for (const recordId of workbench.ledger.listRecordIds('dataset-snapshot')) {
    const snapshot = await workbench.ledger.getRecord<DatasetSnapshot>(recordId);
    if (snapshot.datasetId === datasetId) matches.push({ recordId, snapshot });
  }
  return matches.sort((left, right) =>
    Date.parse(right.snapshot.createdAt) - Date.parse(left.snapshot.createdAt)
  )[0] ?? null;
}

async function captureAcsVintage(options: {
  workbench: ForecastWorkbench;
  provider: CredentialProvider;
  vintage: number;
  stamp: string;
  createdAt: string;
  dataDir: string;
}): Promise<AcsCapture> {
  console.log(`capturing ACS ${options.vintage} schemas`);
  const metadataCaptures = [];
  for (const dataset of ['profile', 'detailed'] as const) {
    metadataCaptures.push(await captureHttpArtifact({
      workbench: options.workbench,
      actor: ACTOR,
      connector: jsonMetadataConnector(options.vintage, dataset),
      query: {},
      credentialProvider: options.provider,
      classification: 'public',
      license: ACS_LICENSE,
      accessPolicy: 'Public U.S. Census Bureau API.',
    }));
  }
  const profile = metadataCaptures[0];
  const detailed = metadataCaptures[1];
  const crosswalk = resolveAcsCrosswalk({
    vintage: options.vintage,
    resolvedAt: options.createdAt,
    profile: profile.parsed,
    detailed: detailed.parsed,
  });
  const crosswalkArtifact = await options.workbench.ledger.artifacts.putCanonical(
    crosswalk,
    { classification: 'public', pretty: true },
  );

  const payloads: AcsPayload[] = [];
  const dataCaptures = [];
  for (const [index, chunk] of acsFetchChunks(crosswalk).entries()) {
    console.log(
      `capturing ACS ${options.vintage} ${chunk.dataset} chunk ${index + 1}`,
    );
    const connector = censusConnector('census.default', {
      timeoutMs: 120_000,
      maxBytes: 100 * 1024 * 1024,
    });
    const captured = await withRetry(
      `ACS ${options.vintage} ${chunk.dataset} chunk ${index + 1}`,
      () => captureHttpArtifact({
        workbench: options.workbench,
        actor: ACTOR,
        connector,
        query: {
          datasetPath: `${options.vintage}/acs/acs5${
            chunk.dataset === 'profile' ? '/profile' : ''
          }`,
          get: ['NAME', ...chunk.variables],
          predicates: { for: 'place:*', in: 'state:*' },
          releaseVintage: String(options.vintage),
        },
        credentialProvider: options.provider,
        classification: 'public',
        license: ACS_LICENSE,
        accessPolicy: 'Public U.S. Census Bureau API.',
      }),
    );
    const parsed = parseCensusArray(
      captured.parsed,
      `ACS ${options.vintage} ${chunk.dataset} chunk ${index + 1}`,
    );
    payloads.push({ dataset: chunk.dataset, ...parsed });
    dataCaptures.push(captured);
  }
  const normalized = normalizeAcsPayloads(crosswalk, payloads);
  const dataFile = path.join(options.dataDir, `acs${options.vintage}.csv.gz`);
  writeCsv(dataFile, normalized.header, normalized.rows);
  const dataArtifact = await options.workbench.ledger.artifacts.putFile(dataFile, {
    mediaType: 'application/gzip',
    classification: 'public',
  });
  const acquisitionRecordIds = [
    ...metadataCaptures.map(({ acquisitionReceiptRecordId }) =>
      acquisitionReceiptRecordId),
    ...dataCaptures.map(({ acquisitionReceiptRecordId }) =>
      acquisitionReceiptRecordId),
  ];
  const datasetId = `census.acs5.place.${options.vintage}`;
  const predecessor = await latestDatasetSnapshot(options.workbench, datasetId);
  const snapshot: DatasetSnapshot = {
    schemaVersion: 'forecast-workbench.dataset-snapshot/v1',
    id: `aging-us-acs5-${options.vintage}-${options.stamp}`,
    datasetId,
    datasetVersion: `${options.vintage}@${options.stamp}`,
    title: `ACS ${options.vintage} five-year place panel with margins of error`,
    description:
      'National place-level semantic extract; codes resolved from this release metadata and every estimate paired with its 90% MOE.',
    createdAt: options.createdAt,
    referencePeriod: `${options.vintage - 4}-${options.vintage}`,
    publicationTimeBasis: 'archive',
    sourceIds: ['census.data-api'],
    acquisitionReceiptIds: acquisitionRecordIds,
    dataArtifactIds: [dataArtifact.id],
    schemaArtifactIds: [
      profile.receipt.rawArtifactId,
      detailed.receipt.rawArtifactId,
    ],
    semanticCrosswalkArtifactIds: [crosswalkArtifact.id],
    rowCount: normalized.rows.length,
    columnCount: normalized.header.length,
    change: predecessor
      ? predecessor.snapshot.dataArtifactIds[0] === dataArtifact.id
        ? 'unchanged'
        : 'revised'
      : 'initial',
    ...(predecessor ? { predecessorSnapshotId: predecessor.recordId } : {}),
    classification: 'public',
    license: ACS_LICENSE,
    accessPolicy: 'Public U.S. Census Bureau API.',
    notes: crosswalk.notes,
  };
  const snapshotRecord = await options.workbench.recordDatasetSnapshot(
    ACTOR,
    snapshot,
  );
  return {
    vintage: options.vintage,
    dataFile,
    snapshotRecordId: snapshotRecord.id,
    acquisitionRecordIds,
    dataArtifactId: dataArtifact.id,
    crosswalkArtifactId: crosswalkArtifact.id,
  };
}

async function existingAcsCapture(options: {
  workbench: ForecastWorkbench;
  vintage: number;
  stamp: string;
  dataDir: string;
}): Promise<AcsCapture | null> {
  const logicalId = `aging-us-acs5-${options.vintage}-${options.stamp}`;
  for (const recordId of options.workbench.ledger.listRecordIds('dataset-snapshot')) {
    const snapshot = await options.workbench.ledger.getRecord<DatasetSnapshot>(
      recordId,
    );
    if (snapshot.id !== logicalId) continue;
    const dataFile = path.join(options.dataDir, `acs${options.vintage}.csv.gz`);
    if (!fs.existsSync(dataFile)) {
      throw new Error(
        `Ledger has ${logicalId}, but normalized file ${dataFile} is missing`,
      );
    }
    return {
      vintage: options.vintage,
      dataFile,
      snapshotRecordId: recordId,
      acquisitionRecordIds: [...snapshot.acquisitionReceiptIds],
      dataArtifactId: snapshot.dataArtifactIds[0],
      crosswalkArtifactId: snapshot.semanticCrosswalkArtifactIds[0],
    };
  }
  return null;
}

function writeCapturedFile(file: string, capture: CapturedFile): void {
  fs.writeFileSync(file, capture.bytes, { mode: 0o600 });
}

function extractZip(file: string, rawDir: string): void {
  const result = spawnSync('unzip', ['-o', file, '-d', rawDir], {
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error(`unzip failed for ${file}`);
}

function runScript(
  script: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): void {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', script, ...args],
    { cwd: REPOSITORY_ROOT, env, stdio: 'inherit' },
  );
  if (result.status !== 0) {
    throw new Error(`${path.basename(script)} failed with status ${result.status}`);
  }
}

function countCsv(file: string): { rows: number; columns: number; header: string[] } {
  const matrix = parseCsv(readCsvAuto(file.replace(/\.gz$/, '')));
  return {
    rows: Math.max(0, matrix.length - 1),
    columns: matrix[0]?.length ?? 0,
    header: matrix[0] ?? [],
  };
}

async function recordNormalizedSnapshot(options: {
  workbench: ForecastWorkbench;
  stamp: string;
  createdAt: string;
  id: string;
  datasetId: string;
  title: string;
  description: string;
  referencePeriod: string;
  sourceIds: string[];
  acquisitions: CapturedFile[];
  file: string;
  publicationTimeBasis: DatasetSnapshot['publicationTimeBasis'];
  license: string;
  notes?: string[];
}): Promise<string> {
  const dimensions = countCsv(options.file);
  const data = await options.workbench.ledger.artifacts.putFile(options.file, {
    mediaType: 'application/gzip',
    classification: 'public',
  });
  const schema = await options.workbench.ledger.artifacts.putCanonical({
    schemaVersion: 'aging-places.csv-schema/v1',
    columns: dimensions.header,
  }, { classification: 'public', pretty: true });
  const predecessor = await latestDatasetSnapshot(
    options.workbench,
    options.datasetId,
  );
  const record = await options.workbench.recordDatasetSnapshot(ACTOR, {
    schemaVersion: 'forecast-workbench.dataset-snapshot/v1',
    id: `${options.id}-${options.stamp}`,
    datasetId: options.datasetId,
    datasetVersion: options.stamp,
    title: options.title,
    description: options.description,
    createdAt: options.createdAt,
    referencePeriod: options.referencePeriod,
    publicationTimeBasis: options.publicationTimeBasis,
    sourceIds: options.sourceIds,
    acquisitionReceiptIds: options.acquisitions.map(({ recordId }) => recordId),
    dataArtifactIds: [data.id],
    schemaArtifactIds: [schema.id],
    semanticCrosswalkArtifactIds: [],
    rowCount: dimensions.rows,
    columnCount: dimensions.columns,
    change: predecessor
      ? predecessor.snapshot.dataArtifactIds[0] === data.id
        ? 'unchanged'
        : 'revised'
      : 'initial',
    ...(predecessor ? { predecessorSnapshotId: predecessor.recordId } : {}),
    classification: 'public',
    license: options.license,
    accessPolicy: 'Public source; preserve source terms and attribution.',
    ...(options.notes ? { notes: options.notes } : {}),
  });
  return record.id;
}

interface ForecastRow {
  geoid: string;
  name: string;
  state: string;
  values: Record<string, string>;
}

function loadForecast(file: string): ForecastRow[] {
  const matrix = parseCsv(readCsvAuto(file.replace(/\.gz$/, '')));
  const header = matrix[0];
  const at = (name: string): number => header.indexOf(name);
  return matrix.slice(1).filter((row) => row.length >= header.length).map((row) => ({
    geoid: row[at('geoid')],
    name: row[at('name')],
    state: row[at('state')],
    values: Object.fromEntries(header.map((name, index) => [name, row[index]])),
  }));
}

function rank(values: number[]): number[] {
  const order = values.map((value, index) => ({ value, index }))
    .sort((left, right) => right.value - left.value);
  const output = new Array(values.length);
  order.forEach((row, index) => { output[row.index] = index + 1; });
  return output;
}

function pearson(left: number[], right: number[]): number {
  const ml = left.reduce((sum, value) => sum + value, 0) / left.length;
  const mr = right.reduce((sum, value) => sum + value, 0) / right.length;
  let covariance = 0, vl = 0, vr = 0;
  for (let index = 0; index < left.length; index++) {
    covariance += (left[index] - ml) * (right[index] - mr);
    vl += (left[index] - ml) ** 2;
    vr += (right[index] - mr) ** 2;
  }
  return vl > 0 && vr > 0 ? covariance / Math.sqrt(vl * vr) : NaN;
}

function spearman(left: number[], right: number[]): number {
  return pearson(rank(left), rank(right));
}

function quantileNumber(values: number[], probability: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(
    sorted.length - 1,
    Math.floor(probability * sorted.length),
  )] ?? NaN;
}

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function compareForecasts(options: {
  baselineOutputDir: string;
  refreshedOutputDir: string;
  snapshotDataDir: string;
  vintage: number;
  createdAt: string;
  snapshotId: string;
}): Record<string, unknown> {
  const baselineFile = path.join(options.baselineOutputDir, 'forecast-all.csv.gz');
  const refreshedFile = path.join(options.refreshedOutputDir, 'forecast-all.csv.gz');
  const baseline = loadForecast(baselineFile);
  const refreshed = loadForecast(refreshedFile);
  const baselineById = new Map(baseline.map((row) => [row.geoid, row]));
  const pairs = refreshed
    .filter((row) => baselineById.has(row.geoid))
    .map((row) => ({ old: baselineById.get(row.geoid)!, fresh: row }))
    .filter(({ old, fresh }) =>
      old.values.historicalPersistenceScore !== '' &&
      fresh.values.historicalPersistenceScore !== '');
  const isObservedMarket = (row: ForecastRow): boolean =>
    Number(row.values.pop) >= 10_000 &&
    row.values.housingMarketEligible === '1' &&
    row.values.zhvi2025 !== '';
  const marketPairs = pairs.filter(({ old, fresh }) =>
    isObservedMarket(old) && isObservedMarket(fresh));
  const pairMetrics = (selected: typeof pairs) => {
    const oldScore = selected.map(({ old }) =>
      Number(old.values.historicalPersistenceScore));
    const newScore = selected.map(({ fresh }) =>
      Number(fresh.values.historicalPersistenceScore));
    const oldMechanism = selected.map(({ old }) => Number(old.values.mechanismScore));
    const newMechanism = selected.map(({ fresh }) => Number(fresh.values.mechanismScore));
    const oldRanks = rank(oldScore);
    const newRanks = rank(newScore);
    const movement = selected.map((pair, index) => ({
      geoid: pair.fresh.geoid,
      name: pair.fresh.name,
      state: pair.fresh.state,
      pop: Number(pair.fresh.values.pop),
      oldRank: oldRanks[index],
      newRank: newRanks[index],
      rankChange: oldRanks[index] - newRanks[index],
      oldScore: oldScore[index],
      newScore: newScore[index],
      scoreChange: +(newScore[index] - oldScore[index]).toFixed(3),
    }));
    return {
      summary: {
        n: selected.length,
        historicalPersistenceScoreSpearman: +spearman(oldScore, newScore).toFixed(3),
        mechanismScoreSpearman: +spearman(oldMechanism, newMechanism).toFixed(3),
        medianAbsoluteHistoricalScoreChange: +quantileNumber(
          movement.map(({ scoreChange }) => Math.abs(scoreChange)),
          0.5,
        ).toFixed(3),
        medianAbsoluteRankChange: +quantileNumber(
          movement.map(({ rankChange }) => Math.abs(rankChange)),
          0.5,
        ).toFixed(0),
        p90AbsoluteRankChange: +quantileNumber(
          movement.map(({ rankChange }) => Math.abs(rankChange)),
          0.9,
        ).toFixed(0),
      },
      movement,
    };
  };
  const allMetrics = pairMetrics(pairs);
  const marketMetrics = pairMetrics(marketPairs);

  const baselineTop = new Set(
    loadForecast(path.join(options.baselineOutputDir, 'top100.csv'))
      .map(({ geoid }) => geoid),
  );
  const refreshedTop = new Set(
    loadForecast(path.join(options.refreshedOutputDir, 'top100.csv'))
      .map(({ geoid }) => geoid),
  );
  const topIntersection = [...baselineTop].filter((geoid) => refreshedTop.has(geoid));
  const topUnion = new Set([...baselineTop, ...refreshedTop]);

  const transitions = (selected: typeof pairs): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const { old, fresh } of selected) {
      const key = `${old.values.confidence}->${fresh.values.confidence}`;
      result[key] = (result[key] ?? 0) + 1;
    }
    return result;
  };

  const oldAcs = loadForecast(path.join(options.snapshotDataDir, 'acs2023.csv.gz'));
  const newAcs = loadForecast(path.join(options.snapshotDataDir, `acs${options.vintage}.csv.gz`));
  const oldAcsById = new Map(oldAcs.map((row) => [row.geoid, row]));
  const populationChanges = newAcs
    .filter((row) => oldAcsById.has(row.geoid))
    .map((row) => {
      const previous = Number(oldAcsById.get(row.geoid)!.values.pop);
      const current = Number(row.values.pop);
      return previous > 0 && Number.isFinite(current)
        ? Math.abs(current / previous - 1)
        : NaN;
    })
    .filter(Number.isFinite);

  return {
    schemaVersion: 'aging-places.refresh-comparison/v1',
    createdAt: options.createdAt,
    snapshotId: options.snapshotId,
    baseline: {
      demographicVintage: 2023,
      forecastArtifactSha256: sha256(baselineFile),
    },
    refreshed: {
      demographicVintage: options.vintage,
      forecastArtifactSha256: sha256(refreshedFile),
      productionCoefficientsChanged: false,
      nationalMechanismPathChanged: false,
    },
    commonPlaceComparison: marketMetrics.summary,
    allCommonPlaceComparison: allMetrics.summary,
    top100: {
      overlap: topIntersection.length,
      jaccard: +(topIntersection.length / Math.max(1, topUnion.size)).toFixed(3),
      entered: [...refreshedTop].filter((geoid) => !baselineTop.has(geoid)),
      exited: [...baselineTop].filter((geoid) => !refreshedTop.has(geoid)),
    },
    confidenceTransitions: transitions(marketPairs),
    allConfidenceTransitions: transitions(pairs),
    acs2023To2024: {
      exactGeoidN: populationChanges.length,
      medianAbsolutePopulationRevision: +quantileNumber(
        populationChanges,
        0.5,
      ).toFixed(4),
      p90AbsolutePopulationRevision: +quantileNumber(
        populationChanges,
        0.9,
      ).toFixed(4),
      note:
        'This is change between overlapping five-year ACS estimates, not one-year population growth.',
    },
    largestHistoricalRankMovers: [...marketMetrics.movement]
      .sort((left, right) =>
        Math.abs(right.rankChange) - Math.abs(left.rankChange))
      .slice(0, 25),
    interpretation:
      'High rank correlation supports stability of the frozen scoring model; large individual moves and confidence downgrades identify places where the new vintage or its MOE materially matters.',
  };
}

export function renderReport(
  comparison: any,
  rolling: any,
  snapshotDir: string,
): string {
  const common = comparison.commonPlaceComparison;
  const transfers = rolling.temporalTransfer;
  const same = rolling.sameWindowStateGroupedCrossValidation;
  const iteration = rolling.oneExploratoryIteration;
  return `# U.S. aging-places 2024 point-in-time refresh

Generated ${comparison.createdAt}. This is a one-shot run; it installs no monitor, timer, or scheduled job.

## What changed

- The committed 2023 forecast and \`data/model.json\` remain frozen.
- ACS 2009, 2014, 2019, and 2020-2024 payloads were captured with raw-query lineage, release schemas, semantic variable crosswalks, hashes, and 90% margins of error.
- The refreshed forecast uses 2024 ACS, 2024 Gazetteer and IPEDS, and a point-in-time Zillow capture. Its national mechanism assumptions and fitted coefficients are unchanged.
- Snapshot payloads live at \`${path.relative(REPOSITORY_ROOT, snapshotDir)}\`; their content-addressed originals live in the forecast-workbench ledger.

## Frozen-model comparison

- Common observed housing markets (population ≥10,000): ${common.n.toLocaleString()}
- Historical-persistence rank correlation: ${common.historicalPersistenceScoreSpearman}
- Mechanism-score rank correlation: ${common.mechanismScoreSpearman}
- Top-100 overlap: ${comparison.top100.overlap}/100 (Jaccard ${comparison.top100.jaccard})
- Median absolute rank movement: ${common.medianAbsoluteRankChange}; 90th percentile: ${common.p90AbsoluteRankChange}
- Median absolute 2023-to-2024 ACS population change on exact GEOIDs: ${(100 * comparison.acs2023To2024.medianAbsolutePopulationRevision).toFixed(2)}%

Interpretation: aggregate stability and local revisions are separate questions. High rank correlation means the broad ordering survives the vintage update; individual movers and MOE-driven confidence downgrades should not be treated as equally stable.

## Rolling-origin audit

Same-window state-grouped cross-validation:

| Origin → outcome | N | Mean AUC | Mean Spearman |
|---|---:|---:|---:|
${Object.entries(same).map(([window, value]: [string, any]) =>
  `| ${window} | ${value.n} | ${value.meanAuc} | ${value.meanSpearman} |`).join('\n')}

Strict temporal transfer:

| Training windows | Test window | N | Model AUC | Model Spearman | Lagged-growth AUC | Lagged-growth Spearman |
|---|---|---:|---:|---:|---:|---:|
${transfers.map((value: any) =>
  `| ${value.trainWindows.join(', ')} | ${value.testWindow} | ${value.n} | ${value.auc} | ${value.spearman} | ${value.laggedOutcomeAuc ?? 'n/a'} | ${value.laggedOutcomeSpearman ?? 'n/a'} |`).join('\n')}

These are retrospective diagnostics, not untouched forecasts. No inspected coefficient was promoted. The 2024 origin is frozen for a genuinely future score.

## One bounded iteration

Because the full-core model's strict transfer correlations were near zero, one post-hoc iteration tested two simpler specifications:

| Variant | 2014-2019 AUC / Spearman | 2019-2024 AUC / Spearman | Passed promotion rule? |
|---|---:|---:|---:|
${iteration.variants.map((variant: any) =>
  `| ${variant.id} | ${variant.temporalTransfer[0].auc} / ${variant.temporalTransfer[0].spearman} | ${variant.temporalTransfer[1].auc} / ${variant.temporalTransfer[1].spearman} | ${variant.passedPromotionRule ? 'yes' : 'no'} |`).join('\n')}

${iteration.result}

## Bottom line

The data-layer improvement is real: the broad 2023 ranking is fairly stable under a new release, individual uncertainty is now visible, and every input can be reproduced from sealed evidence. The forecasting claim should become narrower, not stronger. Same-window validation makes the feature set look useful, but the strict temporal tests mostly disagree with the conventional extrapolation that yesterday's cross-city winner profile will identify the next period's winners. For 2019-2024, simple lagged house-price growth beats the transferred structural model. Treat the historical-persistence ranking as descriptive resemblance and the mechanism simulation as a scenario—not a calibrated long-horizon return forecast.

## Main limitations

${rolling.limitations.map((value: string) => `- ${value}`).join('\n')}
`;
}

async function main(): Promise<void> {
  const vintage = Number(arg('vintage') ?? 2024);
  if (vintage !== 2024) {
    throw new Error(
      'This first audited refresh is pinned to --vintage=2024; add and test a release profile before using another current vintage.',
    );
  }
  const clock = new SystemClock();
  const createdAt = clock.now().toISOString();
  const analysisOnlyId = arg('analysis-only');
  if (analysisOnlyId) {
    if (!new RegExp(`^us-${vintage}-\\d{8}T\\d{6}Z$`).test(analysisOnlyId)) {
      throw new Error(`invalid --analysis-only snapshot ID '${analysisOnlyId}'`);
    }
    const analysisDataDir = path.join(
      AGING_ROOT,
      'data',
      'snapshots',
      analysisOnlyId,
    );
    const analysisOutputDir = path.join(
      AGING_ROOT,
      'outputs',
      'snapshots',
      analysisOnlyId,
    );
    if (!fs.existsSync(analysisDataDir) || !fs.existsSync(analysisOutputDir)) {
      throw new Error(`analysis snapshot '${analysisOnlyId}' is incomplete`);
    }
    const rolling = runRollingOriginAudit({
      dataDir: analysisDataDir,
      currentVintage: vintage,
      createdAt,
    });
    const comparison = compareForecasts({
      baselineOutputDir: path.join(AGING_ROOT, 'outputs'),
      refreshedOutputDir: analysisOutputDir,
      snapshotDataDir: analysisDataDir,
      vintage,
      createdAt,
      snapshotId: analysisOnlyId,
    });
    const rollingFile = path.join(analysisDataDir, 'rolling-origin-audit.json');
    const comparisonFile = path.join(analysisDataDir, 'refresh-comparison.json');
    fs.writeFileSync(rollingFile, `${JSON.stringify(rolling, null, 2)}\n`);
    fs.writeFileSync(comparisonFile, `${JSON.stringify(comparison, null, 2)}\n`);
    fs.copyFileSync(
      rollingFile,
      path.join(AGING_ROOT, 'data', 'rolling-origin-2009-2024.json'),
    );
    fs.copyFileSync(
      comparisonFile,
      path.join(AGING_ROOT, 'data', 'refresh-2024.json'),
    );
    const report = renderReport(comparison, rolling, analysisDataDir);
    fs.writeFileSync(path.join(AGING_ROOT, 'docs', 'REFRESH_2024.md'), report);
    const analysisWorkbench = new ForecastWorkbench(
      path.join(REPOSITORY_ROOT, 'var', 'forecast-workbench', 'aging-us'),
      clock,
    );
    await analysisWorkbench.initialize();
    try {
      const snapshotRecordIds: string[] = [];
      for (const recordId of analysisWorkbench.ledger.listRecordIds('dataset-snapshot')) {
        const snapshot = await analysisWorkbench.ledger.getRecord<DatasetSnapshot>(
          recordId,
        );
        if (snapshot.id.endsWith(analysisOnlyId.slice(`us-${vintage}-`.length))) {
          snapshotRecordIds.push(recordId);
        }
      }
      const derivedArtifacts = [];
      for (const file of [
        path.join(analysisOutputDir, 'forecast-all.csv.gz'),
        comparisonFile,
        rollingFile,
      ]) {
        derivedArtifacts.push(await analysisWorkbench.ledger.artifacts.putFile(file, {
          mediaType: file.endsWith('.gz')
            ? 'application/gzip'
            : 'application/json',
          classification: 'internal',
        }));
      }
      const analysisStamp = createdAt.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      await analysisWorkbench.createEvidencePacket({
        actor: ACTOR,
        id: `aging-us-refresh-analysis-${analysisStamp}`,
        title: 'Revised U.S. aging-places 2024 analysis',
        description:
          'Observed-market comparison and one bounded post-hoc temporal-stability iteration; no coefficients promoted.',
        view: report,
        mediaType: 'text/markdown',
        snapshotIds: snapshotRecordIds,
        derivedFromArtifactIds: derivedArtifacts.map(({ id }) => id),
        classification: 'internal',
      });
    } finally {
      analysisWorkbench.close();
    }
    console.log(JSON.stringify({
      snapshotId: analysisOnlyId,
      comparison: comparison.commonPlaceComparison,
      temporalTransfer: (rolling as any).temporalTransfer,
      iteration: (rolling as any).oneExploratoryIteration,
    }, null, 2));
    return;
  }
  const resumeId = arg('resume');
  if (resumeId && !new RegExp(`^us-${vintage}-\\d{8}T\\d{6}Z$`).test(resumeId)) {
    throw new Error(`invalid --resume snapshot ID '${resumeId}'`);
  }
  const stamp = resumeId
    ? resumeId.slice(`us-${vintage}-`.length)
    : createdAt.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const snapshotId = resumeId ?? `us-${vintage}-${stamp}`;
  const dataDir = path.join(AGING_ROOT, 'data', 'snapshots', snapshotId);
  const outputDir = path.join(AGING_ROOT, 'outputs', 'snapshots', snapshotId);
  const rawDir = path.join(dataDir, 'raw');
  if (resumeId) {
    if (!fs.existsSync(dataDir)) {
      throw new Error(`cannot resume missing snapshot directory ${dataDir}`);
    }
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(rawDir, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    fs.mkdirSync(path.dirname(outputDir), { recursive: true });
    for (const directory of [dataDir, outputDir, rawDir]) {
      fs.mkdirSync(directory, { recursive: false });
    }
  }

  const workbench = new ForecastWorkbench(
    path.join(REPOSITORY_ROOT, 'var', 'forecast-workbench', 'aging-us'),
    clock,
  );
  await workbench.initialize();
  const provider = credentialProvider();
  try {
    const acsVintages = [2009, 2014, 2019, 2020, 2021, 2022, 2023, 2024];
    const acsCaptures: AcsCapture[] = [];
    for (const year of acsVintages) {
      const existing = await existingAcsCapture({
        workbench,
        vintage: year,
        stamp,
        dataDir,
      });
      if (existing) {
        console.log(`keeping completed ACS ${year} snapshot`);
        acsCaptures.push(existing);
        continue;
      }
      acsCaptures.push(await captureAcsVintage({
        workbench,
        provider,
        vintage: year,
        stamp,
        createdAt,
        dataDir,
      }));
    }

    console.log('capturing current static inputs');
    const gazetteer = await captureFile({
      workbench,
      provider,
      connector: bytesConnector({
        id: 'census-gazetteer-place-file',
        sourceId: 'census.gazetteer',
        url: 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip',
        documentationUrl: 'https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html',
        releaseVintage: '2024',
      }),
      license: ACS_LICENSE,
    });
    const placeCounty = await captureFile({
      workbench,
      provider,
      connector: bytesConnector({
        id: 'census-place-county-reference',
        sourceId: 'census.geography-reference',
        url: 'https://www2.census.gov/geo/docs/reference/codes2020/national_place_by_county2020.txt',
        documentationUrl: 'https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.html',
        releaseVintage: '2020',
      }),
      license: ACS_LICENSE,
    });
    const ipedsHd = await captureFile({
      workbench,
      provider,
      connector: bytesConnector({
        id: 'ipeds-hd-file',
        sourceId: 'nces.ipeds',
        url: 'https://nces.ed.gov/ipeds/datacenter/data/HD2024.zip',
        documentationUrl: 'https://nces.ed.gov/ipeds/use-the-data',
        releaseVintage: '2024',
      }),
      license: IPEDS_LICENSE,
    });
    const ipedsDistance = await captureFile({
      workbench,
      provider,
      connector: bytesConnector({
        id: 'ipeds-effy-distance-file',
        sourceId: 'nces.ipeds',
        url: 'https://nces.ed.gov/ipeds/datacenter/data/EFFY2024_DIST.zip',
        documentationUrl: 'https://nces.ed.gov/ipeds/use-the-data',
        releaseVintage: '2024',
      }),
      license: IPEDS_LICENSE,
    });
    const zillow = await captureFile({
      workbench,
      provider,
      connector: bytesConnector({
        id: 'zillow-city-zhvi-file',
        sourceId: 'zillow.research',
        url: 'https://files.zillowstatic.com/research/public_csvs/zhvi/City_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv',
        documentationUrl: 'https://www.zillow.com/research/data/',
        maxBytes: 180 * 1024 * 1024,
      }),
      license: ZILLOW_LICENSE,
    });

    const gazetteerZip = path.join(rawDir, '2024_Gaz_place_national.zip');
    const hdZip = path.join(rawDir, 'HD2024.zip');
    const effyZip = path.join(rawDir, 'EFFY2024_DIST.zip');
    writeCapturedFile(gazetteerZip, gazetteer);
    writeCapturedFile(hdZip, ipedsHd);
    writeCapturedFile(effyZip, ipedsDistance);
    writeCapturedFile(path.join(rawDir, 'place_by_county.txt'), placeCounty);
    writeCapturedFile(path.join(rawDir, 'zhvi_city.csv'), zillow);
    extractZip(gazetteerZip, rawDir);
    extractZip(hdZip, rawDir);
    extractZip(effyZip, rawDir);

    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      AGING_RAW_DIR: rawDir,
      AGING_DATA_DIR: dataDir,
      AGING_OUTPUT_DIR: outputDir,
      AGING_CURRENT_VINTAGE: String(vintage),
    };
    const buildStatic = path.join(AGING_ROOT, 'scripts', 'build-static.ts');
    runScript(buildStatic, ['--only=places'], childEnv);
    runScript(buildStatic, ['--only=zhvi'], childEnv);
    runScript(buildStatic, ['--only=universities'], childEnv);

    for (const file of ['census2000.csv.gz', 'universities2000.csv.gz', 'model.json']) {
      fs.copyFileSync(path.join(AGING_ROOT, 'data', file), path.join(dataDir, file));
    }
    runScript(path.join(AGING_ROOT, 'scripts', 'build-features.ts'), [], childEnv);
    runScript(path.join(AGING_ROOT, 'scripts', 'forecast.ts'), [], childEnv);

    const staticSnapshotIds = [
      await recordNormalizedSnapshot({
        workbench,
        stamp,
        createdAt,
        id: 'aging-us-places',
        datasetId: 'aging-us.places',
        title: '2024 U.S. place geography',
        description: 'Gazetteer place coordinates and land area joined to the 2020 place-county relationship file.',
        referencePeriod: '2024 geography / 2020 county relationship',
        sourceIds: ['census.gazetteer', 'census.geography-reference'],
        acquisitions: [gazetteer, placeCounty],
        file: path.join(dataDir, 'places.csv.gz'),
        publicationTimeBasis: 'archive',
        license: ACS_LICENSE,
        notes: [
          'The first listed county is retained for multi-county places, matching the legacy model contract.',
        ],
      }),
      await recordNormalizedSnapshot({
        workbench,
        stamp,
        createdAt,
        id: 'aging-us-ipeds',
        datasetId: 'aging-us.ipeds-campus-enrollment',
        title: 'IPEDS 2024 campus-linked enrollment',
        description: 'Institution directory joined to 12-month enrollment, excluding exclusively distance-education students.',
        referencePeriod: '2024',
        sourceIds: ['nces.ipeds'],
        acquisitions: [ipedsHd, ipedsDistance],
        file: path.join(dataDir, `universities${vintage}.csv.gz`),
        publicationTimeBasis: 'archive',
        license: IPEDS_LICENSE,
        notes: [
          'Institution-level reporting is capped at 75,000 students for spatial assignment.',
        ],
      }),
      await recordNormalizedSnapshot({
        workbench,
        stamp,
        createdAt,
        id: 'aging-us-zhvi',
        datasetId: 'aging-us.zillow-city-zhvi',
        title: 'Point-in-time Zillow city ZHVI panel',
        description: 'City-level smoothed, seasonally adjusted ZHVI with one June observation per year through the frozen 2025 model endpoint.',
        referencePeriod: '2000-2025',
        sourceIds: ['zillow.research'],
        acquisitions: [zillow],
        file: path.join(dataDir, 'zhvi.csv.gz'),
        publicationTimeBasis: 'retrieval',
        license: ZILLOW_LICENSE,
        notes: [
          'The raw capture may contain later observations; the normalized model panel intentionally stops at 2025 for comparability.',
        ],
      }),
    ];

    const rolling = runRollingOriginAudit({
      dataDir,
      currentVintage: vintage,
      createdAt,
    });
    const rollingSnapshotFile = path.join(dataDir, 'rolling-origin-audit.json');
    fs.writeFileSync(rollingSnapshotFile, `${JSON.stringify(rolling, null, 2)}\n`);

    const comparison = compareForecasts({
      baselineOutputDir: path.join(AGING_ROOT, 'outputs'),
      refreshedOutputDir: outputDir,
      snapshotDataDir: dataDir,
      vintage,
      createdAt,
      snapshotId,
    });
    const comparisonSnapshotFile = path.join(dataDir, 'refresh-comparison.json');
    fs.writeFileSync(
      comparisonSnapshotFile,
      `${JSON.stringify(comparison, null, 2)}\n`,
    );

    const trackedComparison = path.join(AGING_ROOT, 'data', 'refresh-2024.json');
    const trackedRolling = path.join(
      AGING_ROOT,
      'data',
      'rolling-origin-2009-2024.json',
    );
    fs.copyFileSync(comparisonSnapshotFile, trackedComparison);
    fs.copyFileSync(rollingSnapshotFile, trackedRolling);
    const report = renderReport(comparison, rolling, dataDir);
    const reportFile = path.join(AGING_ROOT, 'docs', 'REFRESH_2024.md');
    fs.writeFileSync(reportFile, report);

    const derivedFiles = [
      path.join(outputDir, 'forecast-all.csv.gz'),
      comparisonSnapshotFile,
      rollingSnapshotFile,
    ];
    const derivedArtifacts = [];
    for (const file of derivedFiles) {
      derivedArtifacts.push(await workbench.ledger.artifacts.putFile(file, {
        mediaType: file.endsWith('.gz') ? 'application/gzip' : 'application/json',
        classification: 'internal',
      }));
    }
    await workbench.createEvidencePacket({
      actor: ACTOR,
      id: `aging-us-refresh-${stamp}`,
      title: 'U.S. aging-places 2024 refresh and rolling-origin audit',
      description:
        'Frozen-model vintage comparison plus retrospective temporal audit; no coefficients promoted.',
      view: report,
      mediaType: 'text/markdown',
      snapshotIds: [
        ...acsCaptures.map(({ snapshotRecordId }) => snapshotRecordId),
        ...staticSnapshotIds,
      ],
      derivedFromArtifactIds: derivedArtifacts.map(({ id }) => id),
      classification: 'internal',
    });

    const manifest = {
      schemaVersion: 'aging-places.refresh-run/v1',
      snapshotId,
      createdAt,
      vintage,
      alwaysOn: false,
      dataDirectory: path.relative(REPOSITORY_ROOT, dataDir),
      outputDirectory: path.relative(REPOSITORY_ROOT, outputDir),
      ledgerDirectory: 'var/forecast-workbench/aging-us',
      inputSnapshotRecordIds: [
        ...acsCaptures.map(({ snapshotRecordId }) => snapshotRecordId),
        ...staticSnapshotIds,
      ],
      trackedResults: [
        path.relative(REPOSITORY_ROOT, trackedComparison),
        path.relative(REPOSITORY_ROOT, trackedRolling),
        path.relative(REPOSITORY_ROOT, reportFile),
      ],
    };
    fs.writeFileSync(
      path.join(dataDir, 'run-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    console.log(JSON.stringify({
      snapshotId,
      report: path.relative(REPOSITORY_ROOT, reportFile),
      comparison: comparison.commonPlaceComparison,
      top100: comparison.top100,
      temporalTransfer: (rolling as any).temporalTransfer,
    }, null, 2));
  } finally {
    workbench.close();
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}

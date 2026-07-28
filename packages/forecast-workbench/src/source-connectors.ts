import {
  canonicalSha256Id,
  requireIsoTimestamp,
  requireText,
} from './canonical.js';
import {
  acquireHttp,
  type CredentialProvider,
  type FetchRuntime,
  type PublicRequestValue,
  type SanitizedRequestEnvelope,
} from './acquisition.js';
import type {
  Actor,
  DataClassification,
} from './contracts.js';
import type { ForecastWorkbench } from './session.js';
import {
  assuranceForProfile,
  createSourceRelease,
  diffObservationRelease,
  type AcquisitionReceipt,
  type NormalizedObservation,
  type ObservationVersion,
  type SourceRelease,
  type SourceVintageProfile,
} from './vintage.js';

export interface BuiltConnectorRequest {
  envelope: SanitizedRequestEnvelope;
  requestedAsOf?: string;
  sourceEffectiveVintage?: string;
}

export interface HttpSourceConnector<Query, Parsed = unknown> {
  id: string;
  version: string;
  sourceId: string;
  documentationUrl: string;
  vintage: SourceVintageProfile;
  responseSchema: unknown;
  buildRequest(query: Query): BuiltConnectorRequest;
  parse(raw: Uint8Array): Parsed;
}

export interface NormalizedRelease {
  datasetId: string;
  rows: readonly NormalizedObservation[];
  publishedAt?: string;
  sourceVersion?: string;
  publicationTimeBasis: SourceRelease['publicationTimeBasis'];
  completeReplacement?: boolean;
}

export interface ConnectorCaptureResult<Parsed> {
  acquisitionReceiptRecordId: string;
  receipt: AcquisitionReceipt;
  releaseRecordId: string;
  release: SourceRelease;
  observationVersionRecordIds: readonly string[];
  observationVersions: readonly ObservationVersion[];
  parsed: Parsed;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

function envelope(options: {
  uri: string;
  publicQuery?: Readonly<Record<string, PublicRequestValue>>;
  publicHeaders?: Readonly<Record<string, string>>;
  credentialBindings?: SanitizedRequestEnvelope['credentialBindings'];
  allowedHosts: readonly string[];
  maxBytes?: number;
  maxRedirects?: number;
}): SanitizedRequestEnvelope {
  return {
    schemaVersion: 'forecast-workbench.sanitized-request/v1',
    uri: options.uri,
    method: 'GET',
    ...(options.publicQuery ? { publicQuery: options.publicQuery } : {}),
    ...(options.publicHeaders ? { publicHeaders: options.publicHeaders } : {}),
    credentialBindings: options.credentialBindings ?? [],
    allowedHosts: options.allowedHosts,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
    maxRedirects: options.maxRedirects ?? 2,
  };
}

function jsonParser<T = unknown>(sourceId: string): (raw: Uint8Array) => T {
  return (raw) => {
    try {
      return JSON.parse(new TextDecoder().decode(raw)) as T;
    } catch (error) {
      throw new Error(
        `${sourceId} returned invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };
}

function requireSafePath(value: string, context: string): string {
  requireText(value, context);
  if (value.includes('..') || !/^[A-Za-z0-9_.,;:@/+-]+$/.test(value)) {
    throw new Error(`${context} contains unsupported path characters`);
  }
  return value.replace(/^\/+|\/+$/g, '');
}

function requireIdentifier(value: string, context: string): string {
  requireText(value, context);
  if (!/^[A-Za-z0-9_.:-]+$/.test(value)) {
    throw new Error(`${context} contains unsupported identifier characters`);
  }
  return value;
}

function currentOnlyProfile(
  sourceId: string,
  description: string,
  monitoringStartedAt: string,
): SourceVintageProfile {
  requireIsoTimestamp(monitoringStartedAt, `${sourceId}.monitoringStartedAt`);
  return {
    sourceId,
    capability: 'current-only',
    description,
    monitoringStartedAt,
  };
}

export interface FredSeriesQuery {
  seriesId: string;
  observationStart?: string;
  observationEnd?: string;
  asOf?: string;
  frequency?: string;
  units?: string;
}

export function fredConnector(
  apiKeyRef = 'fred.default',
): HttpSourceConnector<FredSeriesQuery> {
  return {
    id: 'fred-series-observations',
    version: '1.0.0',
    sourceId: 'fred.alfred',
    documentationUrl:
      'https://fred.stlouisfed.org/docs/api/fred/series_observations.html',
    vintage: {
      sourceId: 'fred.alfred',
      capability: 'true-vintage',
      description:
        'ALFRED real-time periods expose what was known on a specified historical date.',
    },
    responseSchema: {
      format: 'FRED series observations JSON',
      required: ['observations'],
      observationFields: ['date', 'value', 'realtime_start', 'realtime_end'],
    },
    buildRequest(query) {
      const publicQuery: Record<string, PublicRequestValue> = {
        series_id: requireIdentifier(query.seriesId, 'FRED seriesId'),
        file_type: 'json',
      };
      if (query.observationStart) publicQuery.observation_start = query.observationStart;
      if (query.observationEnd) publicQuery.observation_end = query.observationEnd;
      if (query.frequency) publicQuery.frequency = query.frequency;
      if (query.units) publicQuery.units = query.units;
      if (query.asOf) {
        requireIsoTimestamp(query.asOf, 'FRED asOf');
        const day = query.asOf.slice(0, 10);
        publicQuery.realtime_start = day;
        publicQuery.realtime_end = day;
      }
      return {
        envelope: envelope({
          uri: 'https://api.stlouisfed.org/fred/series/observations',
          publicQuery,
          credentialBindings: [{
            location: 'query',
            name: 'api_key',
            ref: apiKeyRef,
          }],
          allowedHosts: ['api.stlouisfed.org'],
        }),
        ...(query.asOf
          ? { requestedAsOf: query.asOf, sourceEffectiveVintage: query.asOf }
          : {}),
      };
    },
    parse: jsonParser('FRED/ALFRED'),
  };
}

export interface EiaQuery {
  route: string;
  query?: Readonly<Record<string, PublicRequestValue>>;
  requestedAsOf?: string;
}

export function eiaConnector(options: {
  monitoringStartedAt: string;
  apiKeyRef?: string;
}): HttpSourceConnector<EiaQuery> {
  return {
    id: 'eia-api-v2',
    version: '2.1.0',
    sourceId: 'eia.api-v2',
    documentationUrl: 'https://www.eia.gov/opendata/documentation.php',
    vintage: currentOnlyProfile(
      'eia.api-v2',
      'EIA API v2 exposes current historical series; raw captures establish future cutoffs.',
      options.monitoringStartedAt,
    ),
    responseSchema: {
      format: 'EIA API v2 JSON',
      required: ['response'],
    },
    buildRequest(query) {
      const route = requireSafePath(query.route, 'EIA route');
      if (query.requestedAsOf) requireIsoTimestamp(query.requestedAsOf, 'EIA requestedAsOf');
      return {
        envelope: envelope({
          uri: `https://api.eia.gov/v2/${route}`,
          publicQuery: query.query,
          credentialBindings: [{
            location: 'query',
            name: 'api_key',
            ref: options.apiKeyRef ?? 'eia.default',
          }],
          allowedHosts: ['api.eia.gov'],
        }),
        ...(query.requestedAsOf ? { requestedAsOf: query.requestedAsOf } : {}),
      };
    },
    parse: jsonParser('EIA'),
  };
}

export interface BeaQuery {
  method: string;
  datasetName?: string;
  parameters?: Readonly<Record<string, PublicRequestValue>>;
  requestedAsOf?: string;
}

export function beaConnector(options: {
  monitoringStartedAt: string;
  userIdRef?: string;
}): HttpSourceConnector<BeaQuery> {
  return {
    id: 'bea-data-api',
    version: '1.0.0',
    sourceId: 'bea.data-api',
    documentationUrl: 'https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf',
    vintage: currentOnlyProfile(
      'bea.data-api',
      'The BEA data API serves the current published history; captures preserve later comparisons.',
      options.monitoringStartedAt,
    ),
    responseSchema: {
      format: 'BEA API JSON',
      required: ['BEAAPI'],
    },
    buildRequest(query) {
      if (query.requestedAsOf) requireIsoTimestamp(query.requestedAsOf, 'BEA requestedAsOf');
      return {
        envelope: envelope({
          uri: 'https://apps.bea.gov/api/data',
          publicQuery: {
            method: requireIdentifier(query.method, 'BEA method'),
            ResultFormat: 'JSON',
            ...(query.datasetName
              ? { DataSetName: requireIdentifier(query.datasetName, 'BEA datasetName') }
              : {}),
            ...(query.parameters ?? {}),
          },
          credentialBindings: [{
            location: 'query',
            name: 'UserID',
            ref: options.userIdRef ?? 'bea.default',
          }],
          allowedHosts: ['apps.bea.gov'],
        }),
        ...(query.requestedAsOf ? { requestedAsOf: query.requestedAsOf } : {}),
      };
    },
    parse: jsonParser('BEA'),
  };
}

export interface CensusQuery {
  datasetPath: string;
  get: readonly string[];
  predicates?: Readonly<Record<string, PublicRequestValue>>;
  releaseVintage?: string;
}

export function censusConnector(
  apiKeyRef = 'census.default',
): HttpSourceConnector<CensusQuery> {
  return {
    id: 'census-data-api',
    version: '1.0.0',
    sourceId: 'census.data-api',
    documentationUrl:
      'https://www.census.gov/data/developers/guidance/api-user-guide.html',
    vintage: {
      sourceId: 'census.data-api',
      capability: 'release-pinned',
      description:
        'Census dataset URLs contain an explicit release year or vintage; raw captures pin corrections.',
    },
    responseSchema: {
      format: 'Census two-dimensional JSON array',
      firstRow: 'column names',
    },
    buildRequest(query) {
      const path = requireSafePath(query.datasetPath, 'Census datasetPath');
      return {
        envelope: envelope({
          uri: `https://api.census.gov/data/${path}`,
          publicQuery: {
            get: query.get.map((value) => requireIdentifier(value, 'Census variable')),
            ...(query.predicates ?? {}),
          },
          credentialBindings: [{
            location: 'query',
            name: 'key',
            ref: apiKeyRef,
          }],
          allowedHosts: ['api.census.gov'],
        }),
        ...(query.releaseVintage
          ? { sourceEffectiveVintage: query.releaseVintage }
          : {}),
      };
    },
    parse: jsonParser('Census'),
  };
}

export interface SecSubmissionsQuery {
  cik: string | number;
}

export function secSubmissionsConnector(
  userAgent: string,
): HttpSourceConnector<SecSubmissionsQuery> {
  requireText(userAgent, 'SEC userAgent');
  return {
    id: 'sec-edgar-submissions',
    version: '1.0.0',
    sourceId: 'sec.edgar-submissions',
    documentationUrl:
      'https://www.sec.gov/search-filings/edgar-application-programming-interfaces',
    vintage: {
      sourceId: 'sec.edgar-submissions',
      capability: 'release-pinned',
      description:
        'EDGAR filings are identified by accession and accepted time; the submissions index is captured raw.',
    },
    responseSchema: {
      format: 'SEC submissions JSON',
      required: ['cik', 'filings'],
    },
    buildRequest(query) {
      const digits = String(query.cik).replace(/^0+/, '');
      if (!/^\d{1,10}$/.test(digits)) throw new Error('SEC CIK must contain at most 10 digits');
      return {
        envelope: envelope({
          uri: `https://data.sec.gov/submissions/CIK${digits.padStart(10, '0')}.json`,
          publicHeaders: {
            accept: 'application/json',
            'user-agent': userAgent,
          },
          allowedHosts: ['data.sec.gov'],
        }),
      };
    },
    parse: jsonParser('SEC EDGAR'),
  };
}

export interface EurostatQuery {
  datasetCode: string;
  filters?: Readonly<Record<string, PublicRequestValue>>;
  requestedAsOf?: string;
}

export function eurostatConnector(options: {
  monitoringStartedAt: string;
}): HttpSourceConnector<EurostatQuery> {
  return {
    id: 'eurostat-statistics-api',
    version: '1.0.0',
    sourceId: 'eurostat.statistics',
    documentationUrl:
      'https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-introduction',
    vintage: currentOnlyProfile(
      'eurostat.statistics',
      'Eurostat documents that its dissemination database contains only the latest dataset version.',
      options.monitoringStartedAt,
    ),
    responseSchema: {
      format: 'JSON-stat 2.0',
      required: ['class', 'id', 'size', 'dimension', 'value'],
    },
    buildRequest(query) {
      if (query.requestedAsOf) {
        requireIsoTimestamp(query.requestedAsOf, 'Eurostat requestedAsOf');
      }
      const code = requireIdentifier(query.datasetCode, 'Eurostat datasetCode');
      return {
        envelope: envelope({
          uri:
            `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${code}`,
          publicQuery: {
            format: 'JSON',
            lang: 'en',
            ...(query.filters ?? {}),
          },
          allowedHosts: ['ec.europa.eu'],
        }),
        ...(query.requestedAsOf ? { requestedAsOf: query.requestedAsOf } : {}),
      };
    },
    parse: jsonParser('Eurostat'),
  };
}

export interface OecdQuery {
  resourcePath: string;
  query?: Readonly<Record<string, PublicRequestValue>>;
  requestedAsOf?: string;
}

export function oecdConnector(options: {
  monitoringStartedAt: string;
}): HttpSourceConnector<OecdQuery> {
  return {
    id: 'oecd-data-explorer-sdmx',
    version: '1.0.0',
    sourceId: 'oecd.sdmx',
    documentationUrl:
      'https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html',
    vintage: currentOnlyProfile(
      'oecd.sdmx',
      'OECD Data Explorer supplies current SDMX data; point-in-time support begins with capture.',
      options.monitoringStartedAt,
    ),
    responseSchema: {
      format: 'SDMX JSON or CSV selected by Accept header',
    },
    buildRequest(query) {
      if (query.requestedAsOf) requireIsoTimestamp(query.requestedAsOf, 'OECD requestedAsOf');
      const path = requireSafePath(query.resourcePath, 'OECD resourcePath');
      return {
        envelope: envelope({
          uri: `https://sdmx.oecd.org/public/rest/${path}`,
          publicQuery: query.query,
          publicHeaders: { accept: 'application/vnd.sdmx.data+json;version=2.0.0' },
          allowedHosts: ['sdmx.oecd.org'],
        }),
        ...(query.requestedAsOf ? { requestedAsOf: query.requestedAsOf } : {}),
      };
    },
    parse: jsonParser('OECD'),
  };
}

export interface WorldBankQuery {
  country: string;
  indicator: string;
  date?: string;
  source?: string | number;
  perPage?: number;
  requestedAsOf?: string;
}

export function worldBankConnector(options: {
  monitoringStartedAt: string;
}): HttpSourceConnector<WorldBankQuery> {
  return {
    id: 'world-bank-indicators-v2',
    version: '2.0.0',
    sourceId: 'world-bank.indicators',
    documentationUrl:
      'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392',
    vintage: currentOnlyProfile(
      'world-bank.indicators',
      'The Indicators API serves current published values; captures establish workbench vintages.',
      options.monitoringStartedAt,
    ),
    responseSchema: {
      format: 'World Bank Indicators v2 JSON',
      shape: '[pagination metadata, observations]',
    },
    buildRequest(query) {
      if (query.requestedAsOf) {
        requireIsoTimestamp(query.requestedAsOf, 'World Bank requestedAsOf');
      }
      const country = requireIdentifier(query.country, 'World Bank country');
      const indicator = requireIdentifier(query.indicator, 'World Bank indicator');
      return {
        envelope: envelope({
          uri:
            `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}`,
          publicQuery: {
            format: 'json',
            per_page: query.perPage ?? 20_000,
            ...(query.date ? { date: query.date } : {}),
            ...(query.source !== undefined ? { source: query.source } : {}),
          },
          allowedHosts: ['api.worldbank.org'],
        }),
        ...(query.requestedAsOf ? { requestedAsOf: query.requestedAsOf } : {}),
      };
    },
    parse: jsonParser('World Bank'),
  };
}

export interface CdcSocrataQuery {
  datasetId: string;
  soql?: Readonly<Record<string, PublicRequestValue>>;
  requestedAsOf?: string;
}

export function cdcSocrataConnector(options: {
  monitoringStartedAt: string;
  appTokenRef?: string;
}): HttpSourceConnector<CdcSocrataQuery> {
  return {
    id: 'cdc-socrata-soda',
    version: '1.0.0',
    sourceId: 'cdc.socrata',
    documentationUrl: 'https://dev.socrata.com/foundry/data.cdc.gov',
    vintage: currentOnlyProfile(
      'cdc.socrata',
      'Socrata resource endpoints return their current rows; captures preserve backfill history.',
      options.monitoringStartedAt,
    ),
    responseSchema: {
      format: 'Socrata SODA JSON row array',
    },
    buildRequest(query) {
      if (!/^[a-z0-9]{4}-[a-z0-9]{4}$/i.test(query.datasetId)) {
        throw new Error('CDC Socrata dataset ID must use the four-four resource form');
      }
      if (query.requestedAsOf) requireIsoTimestamp(query.requestedAsOf, 'CDC requestedAsOf');
      return {
        envelope: envelope({
          uri: `https://data.cdc.gov/resource/${query.datasetId}.json`,
          publicQuery: query.soql,
          credentialBindings: options.appTokenRef
            ? [{
                location: 'header',
                name: 'X-App-Token',
                ref: options.appTokenRef,
              }]
            : [],
          allowedHosts: ['data.cdc.gov'],
        }),
        ...(query.requestedAsOf ? { requestedAsOf: query.requestedAsOf } : {}),
      };
    },
    parse: jsonParser('CDC Socrata'),
  };
}

export interface NoaaCdoQuery {
  endpoint: 'datasets' | 'datacategories' | 'datatypes' | 'locationcategories' |
    'locations' | 'stations' | 'data';
  query?: Readonly<Record<string, PublicRequestValue>>;
  requestedAsOf?: string;
}

export function noaaCdoConnector(options: {
  monitoringStartedAt: string;
  tokenRef?: string;
}): HttpSourceConnector<NoaaCdoQuery> {
  return {
    id: 'noaa-ncei-cdo-v2',
    version: '2.0.0',
    sourceId: 'noaa.ncei-cdo',
    documentationUrl: 'https://www.ncdc.noaa.gov/cdo-web/webservices/v2',
    vintage: currentOnlyProfile(
      'noaa.ncei-cdo',
      'NCEI CDO exposes current quality-controlled data; captures establish point-in-time history.',
      options.monitoringStartedAt,
    ),
    responseSchema: {
      format: 'NOAA CDO v2 JSON',
      collectionFields: ['metadata', 'results'],
    },
    buildRequest(query) {
      if (query.requestedAsOf) requireIsoTimestamp(query.requestedAsOf, 'NOAA requestedAsOf');
      return {
        envelope: envelope({
          uri: `https://www.ncei.noaa.gov/cdo-web/api/v2/${query.endpoint}`,
          publicQuery: query.query,
          credentialBindings: [{
            location: 'header',
            name: 'token',
            ref: options.tokenRef ?? 'noaa.default',
          }],
          allowedHosts: ['www.ncei.noaa.gov'],
        }),
        ...(query.requestedAsOf ? { requestedAsOf: query.requestedAsOf } : {}),
      };
    },
    parse: jsonParser('NOAA NCEI'),
  };
}

export interface LbnlQueuedUpQuery {
  fileUrl: string;
  releaseVintage: string;
}

export function lbnlQueuedUpConnector(): HttpSourceConnector<LbnlQueuedUpQuery, Uint8Array> {
  return {
    id: 'lbnl-queued-up-file',
    version: '1.0.0',
    sourceId: 'lbnl.queued-up',
    documentationUrl: 'https://emp.lbl.gov/queues',
    vintage: {
      sourceId: 'lbnl.queued-up',
      capability: 'release-pinned',
      description:
        'Named Queued Up editions and their downloaded workbooks are release-pinned artifacts.',
    },
    responseSchema: {
      format: 'Published LBNL workbook or report bytes',
    },
    buildRequest(query) {
      const url = new URL(query.fileUrl);
      if (url.protocol !== 'https:' ||
          !['emp.lbl.gov', 'eta-publications.lbl.gov'].includes(url.hostname)) {
        throw new Error('LBNL file URL must be an HTTPS LBNL publication URL');
      }
      requireIsoTimestamp(query.releaseVintage, 'LBNL releaseVintage');
      return {
        envelope: envelope({
          uri: url.toString(),
          allowedHosts: ['emp.lbl.gov', 'eta-publications.lbl.gov'],
          maxBytes: 250 * 1024 * 1024,
          maxRedirects: 3,
        }),
        sourceEffectiveVintage: query.releaseVintage,
      };
    },
    parse: (raw) => raw,
  };
}

export function publicDataConnectorCatalog(options: {
  monitoringStartedAt: string;
  secUserAgent: string;
}): readonly HttpSourceConnector<any, any>[] {
  return [
    beaConnector({ monitoringStartedAt: options.monitoringStartedAt }),
    eiaConnector({ monitoringStartedAt: options.monitoringStartedAt }),
    censusConnector(),
    secSubmissionsConnector(options.secUserAgent),
    fredConnector(),
    eurostatConnector({ monitoringStartedAt: options.monitoringStartedAt }),
    oecdConnector({ monitoringStartedAt: options.monitoringStartedAt }),
    worldBankConnector({ monitoringStartedAt: options.monitoringStartedAt }),
    cdcSocrataConnector({ monitoringStartedAt: options.monitoringStartedAt }),
    noaaCdoConnector({ monitoringStartedAt: options.monitoringStartedAt }),
    lbnlQueuedUpConnector(),
  ];
}

export async function captureHttpSource<Query, Parsed>(options: {
  workbench: ForecastWorkbench;
  actor: Actor;
  connector: HttpSourceConnector<Query, Parsed>;
  query: Query;
  credentialProvider: CredentialProvider;
  normalize: (parsed: Parsed, receipt: AcquisitionReceipt) => NormalizedRelease;
  previousByObservationKey?: ReadonlyMap<string, ObservationVersion>;
  classification?: DataClassification;
  license?: string;
  accessPolicy?: string;
  auditHmacKey?: string | Uint8Array;
  runtime?: FetchRuntime;
}): Promise<ConnectorCaptureResult<Parsed>> {
  const built = options.connector.buildRequest(options.query);
  const asOfAssurance = assuranceForProfile(
    options.connector.vintage,
    built.requestedAsOf,
  );
  if (asOfAssurance === 'unsupported') {
    throw new Error(
      `Connector '${options.connector.id}' cannot satisfy the requested as-of time`,
    );
  }
  const acquired = await acquireHttp({
    store: options.workbench.ledger.artifacts,
    clock: options.workbench.clock,
    sourceId: options.connector.sourceId,
    connectorId: options.connector.id,
    connectorVersion: options.connector.version,
    envelope: built.envelope,
    credentialProvider: options.credentialProvider,
    classification: options.classification,
    license: options.license,
    accessPolicy: options.accessPolicy,
    requestedAsOf: built.requestedAsOf,
    sourceEffectiveVintage: built.sourceEffectiveVintage,
    asOfAssurance,
    auditHmacKey: options.auditHmacKey,
    schema: options.connector.responseSchema,
    runtime: options.runtime,
  });
  const receiptRecord = await options.workbench.recordAcquisition(
    options.actor,
    acquired.receipt,
  );
  const parsed = options.connector.parse(acquired.raw);
  const normalized = options.normalize(parsed, acquired.receipt);
  requireText(normalized.datasetId, 'normalized release datasetId');
  if (normalized.publishedAt) {
    requireIsoTimestamp(normalized.publishedAt, 'normalized release publishedAt');
  }
  const release = createSourceRelease({
    id: `release:${canonicalSha256Id({
      sourceId: options.connector.sourceId,
      datasetId: normalized.datasetId,
      acquisitionReceiptId: receiptRecord.id,
      publishedAt: normalized.publishedAt,
      sourceVersion: normalized.sourceVersion,
    })}`,
    sourceId: options.connector.sourceId,
    datasetId: normalized.datasetId,
    availableAt: acquired.receipt.completedAt,
    acquisitionReceiptId: receiptRecord.id,
    publishedAt: normalized.publishedAt,
    sourceVersion: normalized.sourceVersion,
    publicationTimeBasis: normalized.publicationTimeBasis,
  });
  const releaseRecord = await options.workbench.recordSourceRelease(
    options.actor,
    release,
  );
  const observationVersions = diffObservationRelease({
    release,
    rows: normalized.rows,
    previousByObservationKey: options.previousByObservationKey,
    completeReplacement: normalized.completeReplacement,
  });
  const observationVersionRecordIds: string[] = [];
  for (const version of observationVersions) {
    const record = await options.workbench.recordObservationVersion(
      options.actor,
      version,
      options.classification,
    );
    observationVersionRecordIds.push(record.id);
  }
  return {
    acquisitionReceiptRecordId: receiptRecord.id,
    receipt: acquired.receipt,
    releaseRecordId: releaseRecord.id,
    release,
    observationVersionRecordIds,
    observationVersions,
    parsed,
  };
}

import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  type CredentialProvider,
  type ForecastWorkbench,
  type HttpSourceConnector,
  type ObservationVersion,
  type PublicRequestValue,
} from 'forecast-workbench';

export const refreshService = {
  id: 'forecast-refresh-runner',
  role: 'service',
} as const;

export function repositoryState(): { gitSha?: string; dirty?: boolean } {
  try {
    return {
      gitSha: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      dirty: execFileSync('git', ['status', '--porcelain'], {
        encoding: 'utf8',
      }).trim().length > 0,
    };
  } catch {
    return {};
  }
}

function parseEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export async function loadForecastEnvironment(
  envFile = '.env.forecast.local',
): Promise<string | undefined> {
  const path = resolve(envFile);
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error: any) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
  for (const line of raw.split(/\r?\n/)) {
    const candidate = line.trim();
    if (!candidate || candidate.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(
      candidate,
    );
    if (!match) {
      throw new Error(`Invalid environment entry in '${path}'`);
    }
    if (process.env[match[1]] === undefined) {
      process.env[match[1]] = parseEnvValue(match[2]);
    }
  }
  return path;
}

export function forecastCredentialProvider(): CredentialProvider {
  const names: Readonly<Record<string, string>> = {
    'fred.default': 'FRED_API_KEY',
    'eia.default': 'EIA_API_KEY',
    'census.default': 'CENSUS_API_KEY',
  };
  return (reference) => {
    const name = names[reference];
    if (!name) throw new Error(`Unknown credential reference '${reference}'`);
    const value = process.env[name]?.trim();
    if (!value) {
      throw new Error(
        `Credential '${name}' is not configured; set it in the process or .env.forecast.local`,
      );
    }
    return value;
  };
}

export async function ledgerHasHistory(root: string): Promise<boolean> {
  try {
    return (await stat(resolve(root, 'events.jsonl'))).size > 0;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

export function checkpointSlug(timestamp: string): string {
  const value = new Date(timestamp);
  if (!Number.isFinite(value.getTime())) {
    throw new Error(`Invalid checkpoint timestamp '${timestamp}'`);
  }
  return value.toISOString().replace(/[-:.]/g, '').replace('T', 't').replace('Z', 'z');
}

export async function latestObservationVersions(
  workbench: ForecastWorkbench,
): Promise<Map<string, ObservationVersion>> {
  const latest = new Map<string, ObservationVersion>();
  for (const recordId of workbench.ledger.listRecordIds('observation-version')) {
    const version = await workbench.ledger.getRecord<ObservationVersion>(recordId);
    if (version.status === 'withdrawn') latest.delete(version.observationKeyId);
    else latest.set(version.observationKeyId, version);
  }
  return latest;
}

export async function recordsForQuestion<T extends { questionHash: string }>(
  workbench: ForecastWorkbench,
  recordType: string,
  questionHash: string,
): Promise<string[]> {
  const matches: string[] = [];
  for (const recordId of workbench.ledger.listRecordIds(recordType)) {
    const value = await workbench.ledger.getRecord<T>(recordId);
    if (value.questionHash === questionHash) matches.push(recordId);
  }
  return matches;
}

export interface EndpointQuery {
  query?: Readonly<Record<string, PublicRequestValue>>;
}

export function jsonEndpointConnector<T>(options: {
  id: string;
  sourceId: string;
  uri: string;
  documentationUrl: string;
  allowedHosts: readonly string[];
  monitoringStartedAt: string;
  responseSchema: unknown;
  maxBytes?: number;
}): HttpSourceConnector<EndpointQuery, T> {
  return {
    id: options.id,
    version: '1.0.0',
    sourceId: options.sourceId,
    documentationUrl: options.documentationUrl,
    vintage: {
      sourceId: options.sourceId,
      capability: 'current-only',
      description:
        'The endpoint exposes current state; immutable workbench captures establish future point-in-time comparisons.',
      monitoringStartedAt: options.monitoringStartedAt,
    },
    responseSchema: options.responseSchema,
    buildRequest(query) {
      return {
        envelope: {
          schemaVersion: 'forecast-workbench.sanitized-request/v1',
          uri: options.uri,
          method: 'GET',
          ...(query.query ? { publicQuery: query.query } : {}),
          credentialBindings: [],
          allowedHosts: options.allowedHosts,
          timeoutMs: 30_000,
          maxBytes: options.maxBytes ?? 25 * 1024 * 1024,
          maxRedirects: 2,
        },
      };
    },
    parse(raw) {
      try {
        return JSON.parse(new TextDecoder().decode(raw)) as T;
      } catch (error) {
        throw new Error(
          `${options.sourceId} returned invalid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
  };
}

export function binaryEndpointConnector(options: {
  id: string;
  sourceId: string;
  uri: string;
  documentationUrl: string;
  allowedHosts: readonly string[];
  monitoringStartedAt: string;
  responseSchema: unknown;
  maxBytes?: number;
}): HttpSourceConnector<Record<string, never>, Uint8Array> {
  return {
    id: options.id,
    version: '1.0.0',
    sourceId: options.sourceId,
    documentationUrl: options.documentationUrl,
    vintage: {
      sourceId: options.sourceId,
      capability: 'current-only',
      description:
        'The mutable publication URL exposes the latest release; immutable raw captures establish future vintages.',
      monitoringStartedAt: options.monitoringStartedAt,
    },
    responseSchema: options.responseSchema,
    buildRequest() {
      return {
        envelope: {
          schemaVersion: 'forecast-workbench.sanitized-request/v1',
          uri: options.uri,
          method: 'GET',
          credentialBindings: [],
          allowedHosts: options.allowedHosts,
          timeoutMs: 60_000,
          maxBytes: options.maxBytes ?? 100 * 1024 * 1024,
          maxRedirects: 3,
        },
      };
    },
    parse(raw) {
      return raw;
    },
  };
}

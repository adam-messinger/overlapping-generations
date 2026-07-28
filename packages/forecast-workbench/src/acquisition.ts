import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { readFile, realpath, stat } from 'node:fs/promises';
import { basename, isAbsolute, relative } from 'node:path';
import {
  canonicalJson,
  hmacSha256Hex,
  requireText,
  sha256Id,
  type Clock,
} from './canonical.js';
import type { DataClassification } from './contracts.js';
import { FileArtifactStore } from './artifact-store.js';
import {
  createAcquisitionReceipt,
  type AcquisitionReceipt,
  type AsOfAssurance,
} from './vintage.js';

export type PublicRequestValue =
  | string
  | number
  | boolean
  | readonly (string | number | boolean)[];

export interface CredentialBinding {
  location: 'query' | 'header' | 'json-body' | 'form-body';
  name: string;
  ref: string;
}

export type SanitizedRequestBody =
  | { kind: 'json'; value: Readonly<Record<string, unknown>> }
  | { kind: 'form'; value: Readonly<Record<string, string>> }
  | { kind: 'text'; value: string };

export interface SanitizedRequestEnvelope {
  schemaVersion: 'forecast-workbench.sanitized-request/v1';
  uri: string;
  method: 'GET' | 'POST';
  publicQuery?: Readonly<Record<string, PublicRequestValue>>;
  publicHeaders?: Readonly<Record<string, string>>;
  publicBody?: SanitizedRequestBody;
  credentialBindings: readonly CredentialBinding[];
  allowedHosts: readonly string[];
  allowHttp?: boolean;
  allowPrivateNetwork?: boolean;
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
}

export type CredentialProvider =
  (reference: string) => string | Promise<string>;

export interface HardenedFetchMetadata {
  status: number;
  mediaType: string;
  finalUrl: string;
  responseHeaders: Readonly<Record<string, string>>;
  wireRequestHmac?: string;
}

export interface HardenedFetchResult {
  raw: Uint8Array;
  metadata: HardenedFetchMetadata;
}

export interface HttpAcquisitionResult {
  receipt: AcquisitionReceipt;
  raw: Uint8Array;
  metadata: HardenedFetchMetadata;
}

export interface SanitizedFileRequest {
  schemaVersion: 'forecast-workbench.sanitized-file-request/v1';
  logicalUri: string;
  fileName: string;
  maxBytes: number;
  expectedArtifactId?: string;
}

export interface FileAcquisitionResult {
  receipt: AcquisitionReceipt;
  raw: Uint8Array;
}

export interface FetchRuntime {
  fetch: typeof globalThis.fetch;
  resolveHost: (host: string) => Promise<readonly string[]>;
}

const defaultRuntime: FetchRuntime = {
  fetch: globalThis.fetch,
  resolveHost: async (host) => {
    const rows = await lookup(host, { all: true, verbatim: true });
    return rows.map(({ address }) => address);
  },
};

function privateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value))) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224;
}

function privateIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return privateIpv4(address);
  if (version === 6) {
    const normalized = address.toLowerCase();
    const dottedMapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
    if (dottedMapped) return privateIpv4(dottedMapped[1]);
    return normalized === '::' || normalized === '::1' ||
      normalized.startsWith('fc') || normalized.startsWith('fd') ||
      normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb') ||
      normalized.startsWith('fec') || normalized.startsWith('fed') ||
      normalized.startsWith('fee') || normalized.startsWith('fef') ||
      normalized.startsWith('ff');
  }
  return true;
}

function bodyContainsSecret(
  raw: Uint8Array,
  secrets: readonly string[],
): boolean {
  const bytes = Buffer.from(raw);
  return secrets.some((secret) => {
    if (!secret) return false;
    const variants = new Set([secret, encodeURIComponent(secret)]);
    return [...variants].some(
      (variant) => bytes.indexOf(Buffer.from(variant)) !== -1,
    );
  });
}

function credentialNameSet(envelope: SanitizedRequestEnvelope): Set<string> {
  return new Set(envelope.credentialBindings.map(({ name }) => name.toLowerCase()));
}

function sensitiveName(name: string): boolean {
  return /(authorization|cookie|api[-_]?key|token|secret|password|credential|userid)/i.test(name);
}

export function validateSanitizedRequest(envelope: SanitizedRequestEnvelope): void {
  if (envelope.schemaVersion !== 'forecast-workbench.sanitized-request/v1') {
    throw new Error(`Unsupported request schema '${String(envelope.schemaVersion)}'`);
  }
  let url: URL;
  try {
    url = new URL(envelope.uri);
  } catch {
    throw new Error('Request URI must be absolute');
  }
  if (url.username || url.password) throw new Error('Request URI must not contain credentials');
  if (url.protocol !== 'https:' && !(envelope.allowHttp && url.protocol === 'http:')) {
    throw new Error(`Request URI protocol '${url.protocol}' is not allowed`);
  }
  if (envelope.allowedHosts.length === 0 ||
      !envelope.allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new Error(`Request host '${url.hostname}' is not allowlisted`);
  }
  if (!Number.isInteger(envelope.timeoutMs) || envelope.timeoutMs < 1) {
    throw new Error('Request timeoutMs must be a positive integer');
  }
  if (!Number.isInteger(envelope.maxBytes) || envelope.maxBytes < 1) {
    throw new Error('Request maxBytes must be a positive integer');
  }
  if (!Number.isInteger(envelope.maxRedirects) || envelope.maxRedirects < 0) {
    throw new Error('Request maxRedirects must be a non-negative integer');
  }
  const bindingNames = credentialNameSet(envelope);
  for (const binding of envelope.credentialBindings) {
    requireText(binding.name, 'credential binding name');
    requireText(binding.ref, 'credential binding ref');
  }
  for (const name of url.searchParams.keys()) {
    if (bindingNames.has(name.toLowerCase()) || sensitiveName(name)) {
      throw new Error(`Credential-like URI query '${name}' must use a credential binding`);
    }
  }
  for (const name of Object.keys(envelope.publicQuery ?? {})) {
    if (bindingNames.has(name.toLowerCase()) || sensitiveName(name)) {
      throw new Error(`Credential-like public query '${name}' must use a credential binding`);
    }
  }
  for (const name of Object.keys(envelope.publicHeaders ?? {})) {
    if (bindingNames.has(name.toLowerCase()) || sensitiveName(name)) {
      throw new Error(`Credential-like public header '${name}' must use a credential binding`);
    }
  }
  if (envelope.method === 'GET' && envelope.publicBody) {
    throw new Error('GET requests must not have a body');
  }
}

function scrubText(value: string, secrets: readonly string[]): string {
  let scrubbed = value;
  for (const secret of [...secrets].sort((left, right) => right.length - left.length)) {
    if (!secret) continue;
    scrubbed = scrubbed.split(secret).join('[REDACTED]');
    try {
      scrubbed = scrubbed.split(encodeURIComponent(secret)).join('[REDACTED]');
    } catch {
      // The literal replacement above still applies.
    }
  }
  return scrubbed;
}

function sanitizedUrl(
  value: string,
  bindings: readonly CredentialBinding[],
  secrets: readonly string[],
): string {
  const scrubbed = scrubText(value, secrets);
  try {
    const url = new URL(scrubbed);
    for (const binding of bindings) {
      if (binding.location === 'query') url.searchParams.delete(binding.name);
    }
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return scrubbed;
  }
}

async function validateDestination(
  url: URL,
  envelope: SanitizedRequestEnvelope,
  runtime: FetchRuntime,
): Promise<void> {
  if (url.protocol !== 'https:' && !(envelope.allowHttp && url.protocol === 'http:')) {
    throw new Error(`Redirect protocol '${url.protocol}' is not allowed`);
  }
  if (!envelope.allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new Error(`Redirect host '${url.hostname}' is not allowlisted`);
  }
  if (envelope.allowPrivateNetwork) return;
  if (isIP(url.hostname) && privateIp(url.hostname)) {
    throw new Error(`Private-network destination '${url.hostname}' is not allowed`);
  }
  const addresses = await runtime.resolveHost(url.hostname);
  if (addresses.length === 0) throw new Error(`No addresses resolved for '${url.hostname}'`);
  if (addresses.some(privateIp)) {
    throw new Error(`Host '${url.hostname}' resolves to a private-network address`);
  }
}

function appendQuery(url: URL, query: Readonly<Record<string, PublicRequestValue>>): void {
  for (const [name, value] of Object.entries(query)) {
    url.searchParams.delete(name);
    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(name, String(item));
    }
  }
}

async function credentialValues(
  bindings: readonly CredentialBinding[],
  provider: CredentialProvider,
): Promise<Map<string, string>> {
  const values = new Map<string, string>();
  for (const binding of bindings) {
    const value = await provider(binding.ref);
    if (!value) throw new Error(`Credential provider returned an empty value for '${binding.ref}'`);
    values.set(binding.ref, value);
  }
  return values;
}

function prepareBody(
  body: SanitizedRequestBody | undefined,
  bindings: readonly CredentialBinding[],
  values: ReadonlyMap<string, string>,
): { body?: string; contentType?: string } {
  if (!body && !bindings.some(({ location }) =>
    location === 'json-body' || location === 'form-body')) {
    return {};
  }
  const jsonBindings = bindings.filter(({ location }) => location === 'json-body');
  const formBindings = bindings.filter(({ location }) => location === 'form-body');
  if (jsonBindings.length > 0) {
    if (body && body.kind !== 'json') {
      throw new Error('JSON-body credentials require a JSON public body');
    }
    const record: Record<string, unknown> = {
      ...((body as Extract<SanitizedRequestBody, { kind: 'json' }> | undefined)?.value ?? {}),
    };
    for (const binding of jsonBindings) record[binding.name] = values.get(binding.ref)!;
    return { body: JSON.stringify(record), contentType: 'application/json' };
  }
  if (formBindings.length > 0) {
    if (body && body.kind !== 'form') {
      throw new Error('Form-body credentials require a form public body');
    }
    const form = new URLSearchParams(
      (body as Extract<SanitizedRequestBody, { kind: 'form' }> | undefined)?.value ?? {},
    );
    for (const binding of formBindings) form.set(binding.name, values.get(binding.ref)!);
    return { body: form.toString(), contentType: 'application/x-www-form-urlencoded' };
  }
  if (!body) return {};
  if (body.kind === 'json') {
    return { body: JSON.stringify(body.value), contentType: 'application/json' };
  }
  if (body.kind === 'form') {
    return {
      body: new URLSearchParams(body.value).toString(),
      contentType: 'application/x-www-form-urlencoded',
    };
  }
  return { body: body.value, contentType: 'text/plain' };
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error(`Response body exceeds ${maxBytes} bytes`);
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Response body exceeds ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function hardenedFetch(options: {
  envelope: SanitizedRequestEnvelope;
  credentialProvider: CredentialProvider;
  auditHmacKey?: string | Uint8Array;
  runtime?: FetchRuntime;
}): Promise<HardenedFetchResult> {
  validateSanitizedRequest(options.envelope);
  const runtime = options.runtime ?? defaultRuntime;
  const credentials = await credentialValues(
    options.envelope.credentialBindings,
    options.credentialProvider,
  );
  const secrets = [...new Set(credentials.values())];
  const initial = new URL(options.envelope.uri);
  appendQuery(initial, options.envelope.publicQuery ?? {});
  const initialOrigin = initial.origin;
  let current = initial;
  let redirects = 0;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.envelope.timeoutMs);
  try {
    while (true) {
      await validateDestination(current, options.envelope, runtime);
      const sameOrigin = current.origin === initialOrigin;
      const wireUrl = new URL(current);
      const headers = new Headers(options.envelope.publicHeaders ?? {});
      const activeBindings = sameOrigin ? options.envelope.credentialBindings : [];
      for (const binding of activeBindings) {
        const value = credentials.get(binding.ref)!;
        if (binding.location === 'query') wireUrl.searchParams.set(binding.name, value);
        if (binding.location === 'header') headers.set(binding.name, value);
      }
      const preparedBody = prepareBody(
        options.envelope.publicBody,
        activeBindings,
        credentials,
      );
      if (preparedBody.contentType && !headers.has('content-type')) {
        headers.set('content-type', preparedBody.contentType);
      }
      const wireDescription = canonicalJson({
        method: options.envelope.method,
        url: wireUrl.toString(),
        headers: Object.fromEntries(headers.entries()),
        body: preparedBody.body,
      });
      const wireRequestHmac = options.auditHmacKey
        ? hmacSha256Hex(options.auditHmacKey, wireDescription)
        : undefined;
      let response: Response;
      try {
        response = await runtime.fetch(wireUrl, {
          method: options.envelope.method,
          headers,
          body: options.envelope.method === 'POST' ? preparedBody.body : undefined,
          redirect: 'manual',
          signal: controller.signal,
        });
      } catch (error) {
        throw new Error(scrubText(
          error instanceof Error ? error.message : String(error),
          secrets,
        ));
      }
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        if (redirects >= options.envelope.maxRedirects) {
          throw new Error(`Response exceeded ${options.envelope.maxRedirects} redirects`);
        }
        const location = response.headers.get('location');
        if (!location) throw new Error(`Redirect ${response.status} has no Location header`);
        current = new URL(scrubText(location, secrets), current);
        for (const binding of options.envelope.credentialBindings) {
          if (binding.location === 'query') current.searchParams.delete(binding.name);
        }
        redirects++;
        continue;
      }
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} from ${sanitizedUrl(
            response.url || current.toString(),
            options.envelope.credentialBindings,
            secrets,
          )}`,
        );
      }
      const raw = await readLimitedBody(response, options.envelope.maxBytes);
      if (bodyContainsSecret(raw, secrets)) {
        throw new Error(
          'Response body contains credential material and cannot be persisted',
        );
      }
      const responseHeaders: Record<string, string> = {};
      for (const name of [
        'content-type',
        'content-length',
        'etag',
        'last-modified',
        'content-location',
        'date',
      ]) {
        const value = response.headers.get(name);
        if (value) responseHeaders[name] = scrubText(value, secrets);
      }
      return {
        raw,
        metadata: {
          status: response.status,
          mediaType: response.headers.get('content-type')?.split(';')[0]?.trim() ||
            'application/octet-stream',
          finalUrl: sanitizedUrl(
            response.url || current.toString(),
            options.envelope.credentialBindings,
            secrets,
          ),
          responseHeaders,
          ...(wireRequestHmac ? { wireRequestHmac } : {}),
        },
      };
    }
  } catch (error) {
    throw new Error(scrubText(
      error instanceof Error ? error.message : String(error),
      secrets,
    ));
  } finally {
    clearTimeout(timeout);
  }
}

export async function acquireHttp(options: {
  store: FileArtifactStore;
  clock: Clock;
  sourceId: string;
  connectorId: string;
  connectorVersion: string;
  envelope: SanitizedRequestEnvelope;
  credentialProvider: CredentialProvider;
  classification?: DataClassification;
  license?: string;
  accessPolicy?: string;
  requestedAsOf?: string;
  sourceEffectiveVintage?: string;
  asOfAssurance: AsOfAssurance;
  auditHmacKey?: string | Uint8Array;
  schema?: unknown;
  runtime?: FetchRuntime;
}): Promise<HttpAcquisitionResult> {
  const classification = options.classification ?? 'internal';
  const sanitizedRequest = await options.store.putCanonical(options.envelope, {
    classification,
  });
  const startedAt = options.clock.now().toISOString();
  const fetched = await hardenedFetch({
    envelope: options.envelope,
    credentialProvider: options.credentialProvider,
    auditHmacKey: options.auditHmacKey,
    runtime: options.runtime,
  });
  const raw = await options.store.put(fetched.raw, {
    mediaType: fetched.metadata.mediaType,
    classification,
  });
  const schema = options.schema === undefined
    ? undefined
    : await options.store.putCanonical(options.schema, { classification });
  const receipt = createAcquisitionReceipt({
    clock: options.clock,
    sourceId: options.sourceId,
    connectorId: options.connectorId,
    connectorVersion: options.connectorVersion,
    classification,
    license: options.license,
    accessPolicy: options.accessPolicy,
    sanitizedRequestArtifactId: sanitizedRequest.id,
    rawArtifactId: raw.id,
    startedAt,
    requestedAsOf: options.requestedAsOf,
    sourceEffectiveVintage: options.sourceEffectiveVintage,
    asOfAssurance: options.asOfAssurance,
    wireRequestHmac: fetched.metadata.wireRequestHmac,
    responseStatus: fetched.metadata.status,
    responseHeaders: fetched.metadata.responseHeaders,
    schemaArtifactId: schema?.id,
  });
  return { receipt, raw: fetched.raw, metadata: fetched.metadata };
}

function pathInside(root: string, candidate: string): boolean {
  const child = relative(root, candidate);
  return child === '' || (!child.startsWith('..') && !isAbsolute(child));
}

export async function acquireFile(options: {
  store: FileArtifactStore;
  clock: Clock;
  sourceId: string;
  connectorId: string;
  connectorVersion: string;
  path: string;
  allowedRoots: readonly string[];
  logicalUri: string;
  maxBytes: number;
  expectedArtifactId?: string;
  classification?: DataClassification;
  license?: string;
  accessPolicy?: string;
  requestedAsOf?: string;
  sourceEffectiveVintage?: string;
  asOfAssurance: AsOfAssurance;
  schema?: unknown;
}): Promise<FileAcquisitionResult> {
  requireText(options.sourceId, 'file acquisition sourceId');
  requireText(options.connectorId, 'file acquisition connectorId');
  requireText(options.connectorVersion, 'file acquisition connectorVersion');
  requireText(options.logicalUri, 'file acquisition logicalUri');
  if (!Number.isInteger(options.maxBytes) || options.maxBytes < 1) {
    throw new Error('File acquisition maxBytes must be a positive integer');
  }
  if (options.allowedRoots.length === 0) {
    throw new Error('File acquisition requires at least one allowed root');
  }
  const resolvedPath = await realpath(options.path);
  const resolvedRoots = await Promise.all(options.allowedRoots.map((root) => realpath(root)));
  if (!resolvedRoots.some((root) => pathInside(root, resolvedPath))) {
    throw new Error('File acquisition path is outside the allowed roots');
  }
  const metadata = await stat(resolvedPath);
  if (!metadata.isFile()) throw new Error('File acquisition path must identify a regular file');
  if (metadata.size > options.maxBytes) {
    throw new Error(`File exceeds ${options.maxBytes} bytes`);
  }
  const classification = options.classification ?? 'internal';
  const request: SanitizedFileRequest = {
    schemaVersion: 'forecast-workbench.sanitized-file-request/v1',
    logicalUri: options.logicalUri,
    fileName: basename(resolvedPath),
    maxBytes: options.maxBytes,
    ...(options.expectedArtifactId
      ? { expectedArtifactId: options.expectedArtifactId }
      : {}),
  };
  const sanitizedRequest = await options.store.putCanonical(request, { classification });
  const startedAt = options.clock.now().toISOString();
  const raw = new Uint8Array(await readFile(resolvedPath));
  const computedArtifactId = sha256Id(raw);
  if (options.expectedArtifactId && computedArtifactId !== options.expectedArtifactId) {
    throw new Error(
      `File digest mismatch: expected ${options.expectedArtifactId}, found ${computedArtifactId}`,
    );
  }
  const storedRaw = await options.store.put(raw, { classification });
  const schema = options.schema === undefined
    ? undefined
    : await options.store.putCanonical(options.schema, { classification });
  return {
    raw,
    receipt: createAcquisitionReceipt({
      clock: options.clock,
      sourceId: options.sourceId,
      connectorId: options.connectorId,
      connectorVersion: options.connectorVersion,
      classification,
      license: options.license,
      accessPolicy: options.accessPolicy,
      sanitizedRequestArtifactId: sanitizedRequest.id,
      rawArtifactId: storedRaw.id,
      startedAt,
      requestedAsOf: options.requestedAsOf,
      sourceEffectiveVintage: options.sourceEffectiveVintage,
      asOfAssurance: options.asOfAssurance,
      schemaArtifactId: schema?.id,
    }),
  };
}

import { stableHash, stableStringify } from './serialization.js';
import {
  validateMeasurement,
  type MeasurementBinding,
  type ReportingCoverage,
  type RevisionPolicy,
} from './semantics.js';

export interface ContentDigest {
  algorithm: 'sha256';
  value: string;
}

export interface DataSourceDefinition {
  id: string;
  title: string;
  publisher?: string;
  homepage?: string;
  license?: string;
  revisionPolicy: RevisionPolicy;
}

export type DataRequestValue = string | number | boolean | readonly (string | number | boolean)[];

/**
 * Canonical, safe-to-persist request description. Credentials are referenced
 * by name and never copied into a manifest or snapshot.
 */
export interface DataRequest {
  uri: string;
  method?: 'GET' | 'POST';
  query?: Readonly<Record<string, DataRequestValue>>;
  publicHeaders?: Readonly<Record<string, string>>;
  bodyDigest?: ContentDigest;
  credentialsRef?: string;
}

export interface DataArtifact {
  id: string;
  digest: ContentDigest;
  bytes: number;
  mediaType: string;
  encoding?: string;
  schema?: unknown;
  schemaDigest?: ContentDigest;
  locator?: string;
}

export interface ResolverResponseMetadata {
  status?: number;
  etag?: string;
  lastModified?: string;
  contentLocation?: string;
}

export interface DataSnapshot {
  schemaVersion: 'tsimulation.data-snapshot/v1';
  id: string;
  source: DataSourceDefinition;
  resolver: {
    id: string;
    version: string;
  };
  request: DataRequest;
  retrievedAt: string;
  /** Information cutoff requested by a real-time-vintage analysis. */
  asOf?: string;
  publishedAt?: string;
  sourceVersion?: string;
  artifact: DataArtifact;
  /** SHA-256 of canonical parsed/normalized data when a resolver supplies it. */
  normalizedDigest?: ContentDigest;
  measurement?: MeasurementBinding;
  coverage?: ReportingCoverage;
  response?: ResolverResponseMetadata;
}

export interface DataTransformation {
  schemaVersion: 'tsimulation.data-transformation/v1';
  id: string;
  version: string;
  description: string;
  inputSnapshotIds: readonly string[];
  outputArtifact: DataArtifact;
  codeHash?: string;
  parametersHash?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface DataLineage {
  snapshots: readonly DataSnapshot[];
  transformations: readonly DataTransformation[];
}

export interface DataResolutionContext {
  requestedAt?: string;
  asOf?: string;
}

export interface ResolvedData<TValue> {
  raw: string | Uint8Array;
  value: TValue;
  mediaType: string;
  encoding?: string;
  schema?: unknown;
  publishedAt?: string;
  sourceVersion?: string;
  measurement?: MeasurementBinding;
  coverage?: ReportingCoverage;
  response?: ResolverResponseMetadata;
  artifactLocator?: string;
}

export interface DataResolver<TRequest, TValue> {
  id: string;
  version: string;
  source: DataSourceDefinition;
  canonicalize(request: TRequest): DataRequest;
  resolve(request: TRequest, context: DataResolutionContext): Promise<ResolvedData<TValue>>;
}

export interface CapturedData<TValue> {
  snapshot: DataSnapshot;
  value: TValue;
  raw: string | Uint8Array;
}

function requiredText(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${context} must not be empty`);
}

function validateTimestamp(value: string | undefined, context: string): void {
  if (value !== undefined && Number.isNaN(Date.parse(value))) {
    throw new Error(`${context} must be a valid date or timestamp`);
  }
}

function sensitiveName(name: string): boolean {
  return /(authorization|cookie|api[-_]?key|token|secret|password|credential)/i.test(name);
}

export function validateDataRequest(request: DataRequest, context = 'data request'): void {
  requiredText(request.uri, `${context}.uri`);
  let parsed: URL;
  try {
    parsed = new URL(request.uri);
  } catch {
    throw new Error(`${context}.uri must be an absolute URL`);
  }
  if (!['http:', 'https:', 'file:', 'data:'].includes(parsed.protocol)) {
    throw new Error(`${context}.uri uses unsupported protocol '${parsed.protocol}'`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`${context}.uri must not embed credentials; use credentialsRef`);
  }
  for (const name of parsed.searchParams.keys()) {
    if (sensitiveName(name)) {
      throw new Error(`${context}.uri query '${name}' appears secret; use credentialsRef`);
    }
  }
  for (const name of Object.keys(request.query ?? {})) {
    if (sensitiveName(name)) {
      throw new Error(`${context}.query '${name}' appears secret; use credentialsRef`);
    }
  }
  for (const name of Object.keys(request.publicHeaders ?? {})) {
    if (sensitiveName(name)) {
      throw new Error(`${context}.publicHeaders '${name}' appears secret; use credentialsRef`);
    }
  }
  if (request.credentialsRef !== undefined) {
    requiredText(request.credentialsRef, `${context}.credentialsRef`);
  }
  if (request.bodyDigest) validateContentDigest(request.bodyDigest, `${context}.bodyDigest`);
}

export function validateContentDigest(digest: ContentDigest, context = 'digest'): void {
  if (digest.algorithm !== 'sha256') throw new Error(`${context}.algorithm must be sha256`);
  if (!/^[a-f0-9]{64}$/.test(digest.value)) {
    throw new Error(`${context}.value must be a lowercase 64-character SHA-256 hex digest`);
  }
}

export function validateDataArtifact(artifact: DataArtifact, context = 'data artifact'): void {
  requiredText(artifact.id, `${context}.id`);
  validateContentDigest(artifact.digest, `${context}.digest`);
  if (artifact.id !== `sha256:${artifact.digest.value}`) {
    throw new Error(`${context}.id must equal its content digest`);
  }
  if (!Number.isInteger(artifact.bytes) || artifact.bytes < 0) {
    throw new Error(`${context}.bytes must be a non-negative integer`);
  }
  requiredText(artifact.mediaType, `${context}.mediaType`);
  if (artifact.schemaDigest) validateContentDigest(artifact.schemaDigest, `${context}.schemaDigest`);
}

export function validateDataSnapshot(snapshot: DataSnapshot, context = 'data snapshot'): void {
  if (snapshot.schemaVersion !== 'tsimulation.data-snapshot/v1') {
    throw new Error(`${context} has unsupported schemaVersion '${String(snapshot.schemaVersion)}'`);
  }
  requiredText(snapshot.id, `${context}.id`);
  validateDataSource(snapshot.source, `${context}.source`);
  requiredText(snapshot.resolver.id, `${context}.resolver.id`);
  requiredText(snapshot.resolver.version, `${context}.resolver.version`);
  validateDataRequest(snapshot.request, `${context}.request`);
  validateTimestamp(snapshot.retrievedAt, `${context}.retrievedAt`);
  validateTimestamp(snapshot.asOf, `${context}.asOf`);
  validateTimestamp(snapshot.publishedAt, `${context}.publishedAt`);
  validateDataArtifact(snapshot.artifact, `${context}.artifact`);
  if (snapshot.normalizedDigest) {
    validateContentDigest(snapshot.normalizedDigest, `${context}.normalizedDigest`);
  }
  if (snapshot.measurement) {
    validateMeasurement(snapshot.measurement, `${context}.measurement`);
    if (snapshot.measurement.snapshotId !== snapshot.id) {
      throw new Error(`${context}.measurement.snapshotId must reference the containing snapshot`);
    }
  }
}

export function validateDataTransformation(
  transformation: DataTransformation,
  context = 'data transformation',
): void {
  if (transformation.schemaVersion !== 'tsimulation.data-transformation/v1') {
    throw new Error(`${context} has unsupported schemaVersion '${String(transformation.schemaVersion)}'`);
  }
  requiredText(transformation.id, `${context}.id`);
  requiredText(transformation.version, `${context}.version`);
  requiredText(transformation.description, `${context}.description`);
  if (!Array.isArray(transformation.inputSnapshotIds) ||
      transformation.inputSnapshotIds.length === 0 ||
      transformation.inputSnapshotIds.some((id) => typeof id !== 'string' || !id.trim())) {
    throw new Error(`${context}.inputSnapshotIds must contain at least one snapshot ID`);
  }
  validateDataArtifact(transformation.outputArtifact, `${context}.outputArtifact`);
  validateTimestamp(transformation.startedAt, `${context}.startedAt`);
  validateTimestamp(transformation.endedAt, `${context}.endedAt`);
  if (transformation.startedAt && transformation.endedAt &&
      Date.parse(transformation.endedAt) < Date.parse(transformation.startedAt)) {
    throw new Error(`${context}.endedAt precedes startedAt`);
  }
}

export function validateDataLineage(lineage: DataLineage): void {
  const snapshotIds = new Set<string>();
  for (const snapshot of lineage.snapshots) {
    validateDataSnapshot(snapshot, `Snapshot '${snapshot.id}'`);
    if (snapshotIds.has(snapshot.id)) throw new Error(`Duplicate snapshot ID '${snapshot.id}'`);
    snapshotIds.add(snapshot.id);
  }
  const transformationIds = new Set<string>();
  for (const transformation of lineage.transformations) {
    validateDataTransformation(transformation, `Transformation '${transformation.id}'`);
    if (transformationIds.has(transformation.id)) {
      throw new Error(`Duplicate transformation ID '${transformation.id}'`);
    }
    transformationIds.add(transformation.id);
    for (const snapshotId of transformation.inputSnapshotIds) {
      if (!snapshotIds.has(snapshotId)) {
        throw new Error(
          `Transformation '${transformation.id}' references unknown snapshot '${snapshotId}'`,
        );
      }
    }
  }
  for (const snapshot of lineage.snapshots) {
    for (const transformationId of snapshot.measurement?.transformationIds ?? []) {
      if (!transformationIds.has(transformationId)) {
        throw new Error(
          `Snapshot '${snapshot.id}' measurement references unknown transformation '${transformationId}'`,
        );
      }
    }
  }
}

export function validateDataSource(source: DataSourceDefinition, context = 'data source'): void {
  requiredText(source.id, `${context}.id`);
  requiredText(source.title, `${context}.title`);
  if (!([
    'immutable-release',
    'first-release',
    'revisable',
    'rolling',
    'backfilled',
    'final',
    'unknown',
  ] as const).includes(source.revisionPolicy)) {
    throw new Error(`${context}.revisionPolicy is invalid`);
  }
}

function bytesOf(value: string | Uint8Array): Uint8Array {
  return typeof value === 'string' ? new TextEncoder().encode(value) : value;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Portable browser/Node SHA-256 via the Web Crypto API. */
export async function sha256Digest(value: string | Uint8Array): Promise<ContentDigest> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('SHA-256 requires globalThis.crypto.subtle');
  const bytes = bytesOf(value);
  const result = await subtle.digest('SHA-256', bytes);
  return { algorithm: 'sha256', value: hex(new Uint8Array(result)) };
}

export async function createDataArtifact(options: {
  raw: string | Uint8Array;
  mediaType: string;
  encoding?: string;
  schema?: unknown;
  locator?: string;
}): Promise<DataArtifact> {
  requiredText(options.mediaType, 'artifact mediaType');
  const bytes = bytesOf(options.raw);
  const digest = await sha256Digest(bytes);
  const schemaDigest = options.schema === undefined
    ? undefined
    : await sha256Digest(stableStringify(options.schema));
  const artifact: DataArtifact = {
    id: `sha256:${digest.value}`,
    digest,
    bytes: bytes.byteLength,
    mediaType: options.mediaType,
    ...(options.encoding ? { encoding: options.encoding } : {}),
    ...(options.schema !== undefined ? { schema: options.schema, schemaDigest } : {}),
    ...(options.locator ? { locator: options.locator } : {}),
  };
  validateDataArtifact(artifact);
  return artifact;
}

function withoutSnapshotId(binding: MeasurementBinding | undefined): MeasurementBinding | undefined {
  if (!binding) return undefined;
  const { snapshotId: _snapshotId, ...rest } = binding;
  return rest;
}

export async function captureDataSnapshot<TRequest, TValue>(options: {
  resolver: DataResolver<TRequest, TValue>;
  request: TRequest;
  context?: DataResolutionContext;
}): Promise<CapturedData<TValue>> {
  validateDataSource(options.resolver.source, `Resolver '${options.resolver.id}' source`);
  requiredText(options.resolver.id, 'resolver.id');
  requiredText(options.resolver.version, 'resolver.version');
  const context = options.context ?? {};
  const canonicalRequest = options.resolver.canonicalize(options.request);
  validateDataRequest(canonicalRequest);
  const resolved = await options.resolver.resolve(options.request, context);
  const retrievedAt = context.requestedAt ?? new Date().toISOString();
  validateTimestamp(retrievedAt, 'retrievedAt');
  validateTimestamp(context.asOf, 'asOf');
  validateTimestamp(resolved.publishedAt, 'publishedAt');
  const artifact = await createDataArtifact({
    raw: resolved.raw,
    mediaType: resolved.mediaType,
    encoding: resolved.encoding,
    schema: resolved.schema,
    locator: resolved.artifactLocator,
  });
  const normalizedDigest = await sha256Digest(stableStringify(resolved.value));
  if (resolved.measurement) validateMeasurement(resolved.measurement);
  const identity = {
    source: options.resolver.source,
    resolver: { id: options.resolver.id, version: options.resolver.version },
    request: canonicalRequest,
    retrievedAt,
    asOf: context.asOf,
    publishedAt: resolved.publishedAt,
    sourceVersion: resolved.sourceVersion,
    artifact: artifact.digest,
    normalizedDigest,
    measurement: withoutSnapshotId(resolved.measurement),
    coverage: resolved.coverage,
    response: resolved.response,
  };
  const snapshotDigest = await sha256Digest(stableStringify(identity));
  const snapshotId = `snapshot:sha256:${snapshotDigest.value}`;
  const measurement = resolved.measurement
    ? { ...resolved.measurement, snapshotId }
    : undefined;
  const snapshot: DataSnapshot = {
    schemaVersion: 'tsimulation.data-snapshot/v1',
    id: snapshotId,
    source: options.resolver.source,
    resolver: { id: options.resolver.id, version: options.resolver.version },
    request: canonicalRequest,
    retrievedAt,
    ...(context.asOf ? { asOf: context.asOf } : {}),
    ...(resolved.publishedAt ? { publishedAt: resolved.publishedAt } : {}),
    ...(resolved.sourceVersion ? { sourceVersion: resolved.sourceVersion } : {}),
    artifact,
    normalizedDigest,
    ...(measurement ? { measurement } : {}),
    ...(resolved.coverage ? { coverage: resolved.coverage } : {}),
    ...(resolved.response ? { response: resolved.response } : {}),
  };
  validateDataSnapshot(snapshot);
  return { snapshot, value: resolved.value, raw: resolved.raw };
}

export async function createDataTransformation(options: {
  id: string;
  version: string;
  description: string;
  inputSnapshotIds: readonly string[];
  rawOutput: string | Uint8Array;
  mediaType: string;
  encoding?: string;
  schema?: unknown;
  locator?: string;
  code?: unknown;
  parameters?: unknown;
  startedAt?: string;
  endedAt?: string;
}): Promise<DataTransformation> {
  const outputArtifact = await createDataArtifact({
    raw: options.rawOutput,
    mediaType: options.mediaType,
    encoding: options.encoding,
    schema: options.schema,
    locator: options.locator,
  });
  const transformation: DataTransformation = {
    schemaVersion: 'tsimulation.data-transformation/v1',
    id: options.id,
    version: options.version,
    description: options.description,
    inputSnapshotIds: [...options.inputSnapshotIds],
    outputArtifact,
    ...(options.code === undefined ? {} : { codeHash: stableHash(options.code) }),
    ...(options.parameters === undefined ? {} : { parametersHash: stableHash(options.parameters) }),
    ...(options.startedAt ? { startedAt: options.startedAt } : {}),
    ...(options.endedAt ? { endedAt: options.endedAt } : {}),
  };
  validateDataTransformation(transformation);
  return transformation;
}

/** Simple resolver for embedded fixtures and deterministic tests. */
export function inlineDataResolver<TValue>(options: {
  id: string;
  version: string;
  source: DataSourceDefinition;
  value: TValue;
  raw?: string | Uint8Array;
  mediaType?: string;
  schema?: unknown;
  measurement?: MeasurementBinding;
  publishedAt?: string;
  sourceVersion?: string;
}): DataResolver<{ id?: string }, TValue> {
  return {
    id: options.id,
    version: options.version,
    source: options.source,
    canonicalize: (request) => ({
      uri: `data:application/json,${encodeURIComponent(request.id ?? options.source.id)}`,
      method: 'GET',
    }),
    resolve: async () => ({
      raw: options.raw ?? stableStringify(options.value),
      value: options.value,
      mediaType: options.mediaType ?? 'application/json',
      schema: options.schema,
      measurement: options.measurement,
      publishedAt: options.publishedAt,
      sourceVersion: options.sourceVersion,
    }),
  };
}

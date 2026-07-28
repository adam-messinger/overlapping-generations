import {
  canonicalSha256Id,
  requireIsoTimestamp,
  requireText,
  type Clock,
} from './canonical.js';
import type { DataClassification } from './contracts.js';

export type VintageCapability =
  | 'true-vintage'
  | 'release-pinned'
  | 'reconstructed'
  | 'current-only';

export type AsOfAssurance =
  | 'source-enforced'
  | 'release-archive'
  | 'reconstructed'
  | 'capture-cutoff'
  | 'unsupported';

export type FirstReleaseBasis =
  | 'source-declared'
  | 'archive-verified'
  | 'first-seen';

export interface SourceVintageProfile {
  sourceId: string;
  capability: VintageCapability;
  description: string;
  monitoringStartedAt?: string;
}

export interface ObservationKey {
  schemaVersion: 'forecast-workbench.observation-key/v1';
  datasetId: string;
  seriesId: string;
  geography: string;
  frequency: string;
  validPeriod: string;
  measure: string;
}

export interface SourceRelease {
  schemaVersion: 'forecast-workbench.source-release/v1';
  id: string;
  sourceId: string;
  datasetId: string;
  publishedAt?: string;
  availableAt: string;
  sourceVersion?: string;
  acquisitionReceiptId: string;
  publicationTimeBasis: 'source' | 'archive' | 'inferred' | 'retrieval';
}

export type ObservationVersionStatus =
  | 'new'
  | 'unchanged'
  | 'revised'
  | 'withdrawn'
  | 'backfilled';

export interface ObservationVersion {
  schemaVersion: 'forecast-workbench.observation-version/v1';
  id: string;
  observationKey: ObservationKey;
  observationKeyId: string;
  releaseId: string;
  value?: unknown;
  valueDigest?: string;
  status: ObservationVersionStatus;
  predecessorId?: string;
  firstReleaseBasis?: FirstReleaseBasis;
  availableAt: string;
  sourceRowLocator?: string;
}

export interface AcquisitionReceipt {
  schemaVersion: 'forecast-workbench.acquisition-receipt/v1';
  id: string;
  sourceId: string;
  connectorId: string;
  connectorVersion: string;
  classification: DataClassification;
  license?: string;
  accessPolicy?: string;
  sanitizedRequestArtifactId: string;
  rawArtifactId: string;
  startedAt: string;
  completedAt: string;
  requestedAsOf?: string;
  sourceEffectiveVintage?: string;
  asOfAssurance: AsOfAssurance;
  wireRequestHmac?: string;
  responseStatus?: number;
  responseHeaders?: Readonly<Record<string, string>>;
  schemaArtifactId?: string;
}

export interface NormalizedObservation {
  key: ObservationKey;
  value: unknown;
  sourceRowLocator?: string;
  reportedStatus?: 'new' | 'revised' | 'backfilled';
  firstReleaseBasis?: FirstReleaseBasis;
}

export function observationKeyId(key: ObservationKey): string {
  validateObservationKey(key);
  return `observation:${canonicalSha256Id(key)}`;
}

export function validateObservationKey(key: ObservationKey): void {
  if (key.schemaVersion !== 'forecast-workbench.observation-key/v1') {
    throw new Error(`Unsupported observation key schema '${String(key.schemaVersion)}'`);
  }
  requireText(key.datasetId, 'observationKey.datasetId');
  requireText(key.seriesId, 'observationKey.seriesId');
  requireText(key.geography, 'observationKey.geography');
  requireText(key.frequency, 'observationKey.frequency');
  requireText(key.validPeriod, 'observationKey.validPeriod');
  requireText(key.measure, 'observationKey.measure');
}

export function validateVintageProfile(profile: SourceVintageProfile): void {
  requireText(profile.sourceId, 'vintageProfile.sourceId');
  requireText(profile.description, 'vintageProfile.description');
  if (profile.monitoringStartedAt) {
    requireIsoTimestamp(profile.monitoringStartedAt, 'vintageProfile.monitoringStartedAt');
  }
  if (profile.capability === 'current-only' && !profile.monitoringStartedAt) {
    throw new Error('Current-only sources must record when workbench monitoring began');
  }
}

export function validateAcquisitionReceipt(receipt: AcquisitionReceipt): void {
  if (receipt.schemaVersion !== 'forecast-workbench.acquisition-receipt/v1') {
    throw new Error(
      `Unsupported acquisition receipt schema '${String(receipt.schemaVersion)}'`,
    );
  }
  requireText(receipt.id, 'acquisition.id');
  requireText(receipt.sourceId, 'acquisition.sourceId');
  requireText(receipt.connectorId, 'acquisition.connectorId');
  requireText(receipt.connectorVersion, 'acquisition.connectorVersion');
  if (receipt.license !== undefined) requireText(receipt.license, 'acquisition.license');
  if (receipt.accessPolicy !== undefined) {
    requireText(receipt.accessPolicy, 'acquisition.accessPolicy');
  }
  requireText(receipt.sanitizedRequestArtifactId, 'acquisition.sanitizedRequestArtifactId');
  requireText(receipt.rawArtifactId, 'acquisition.rawArtifactId');
  requireIsoTimestamp(receipt.startedAt, 'acquisition.startedAt');
  requireIsoTimestamp(receipt.completedAt, 'acquisition.completedAt');
  if (receipt.requestedAsOf) {
    requireIsoTimestamp(receipt.requestedAsOf, 'acquisition.requestedAsOf');
  }
  if (receipt.sourceEffectiveVintage) {
    requireIsoTimestamp(
      receipt.sourceEffectiveVintage,
      'acquisition.sourceEffectiveVintage',
    );
  }
}

export function validateSourceRelease(release: SourceRelease): void {
  if (release.schemaVersion !== 'forecast-workbench.source-release/v1') {
    throw new Error(`Unsupported source release schema '${String(release.schemaVersion)}'`);
  }
  requireText(release.id, 'release.id');
  requireText(release.sourceId, 'release.sourceId');
  requireText(release.datasetId, 'release.datasetId');
  requireText(release.acquisitionReceiptId, 'release.acquisitionReceiptId');
  requireIsoTimestamp(release.availableAt, 'release.availableAt');
  if (release.publishedAt) requireIsoTimestamp(release.publishedAt, 'release.publishedAt');
}

export function validateObservationVersion(version: ObservationVersion): void {
  if (version.schemaVersion !== 'forecast-workbench.observation-version/v1') {
    throw new Error(
      `Unsupported observation version schema '${String(version.schemaVersion)}'`,
    );
  }
  requireText(version.id, 'observationVersion.id');
  validateObservationKey(version.observationKey);
  if (version.observationKeyId !== observationKeyId(version.observationKey)) {
    throw new Error('Observation version key ID does not match its key');
  }
  requireText(version.releaseId, 'observationVersion.releaseId');
  requireIsoTimestamp(version.availableAt, 'observationVersion.availableAt');
  if (
    ['unchanged', 'revised', 'withdrawn'].includes(version.status) &&
    !version.predecessorId
  ) {
    throw new Error(
      `Observation status '${version.status}' requires a predecessor`,
    );
  }
  if (version.predecessorId === version.id) {
    throw new Error('Observation version cannot be its own predecessor');
  }
  if (!version.predecessorId && !version.firstReleaseBasis) {
    throw new Error(
      'An observation without a predecessor must declare its first-release basis',
    );
  }
  if (version.predecessorId && version.firstReleaseBasis) {
    throw new Error(
      'Only the first observation version may declare first-release basis',
    );
  }
  if (version.status === 'withdrawn') {
    if (version.value !== undefined || version.valueDigest !== undefined) {
      throw new Error('Withdrawn observations must not carry a value');
    }
  } else if (version.valueDigest !== canonicalSha256Id(version.value)) {
    throw new Error('Observation version value digest does not match its value');
  }
}

export function assuranceForProfile(
  profile: SourceVintageProfile,
  requestedAsOf?: string,
): AsOfAssurance {
  validateVintageProfile(profile);
  if (requestedAsOf) requireIsoTimestamp(requestedAsOf, 'requestedAsOf');
  if (profile.capability === 'true-vintage') return 'source-enforced';
  if (profile.capability === 'release-pinned') return 'release-archive';
  if (profile.capability === 'reconstructed') return 'reconstructed';
  if (!requestedAsOf) return 'capture-cutoff';
  if (Date.parse(requestedAsOf) >= Date.parse(profile.monitoringStartedAt!)) {
    return 'capture-cutoff';
  }
  return 'unsupported';
}

export function createAcquisitionReceipt(options: {
  clock: Clock;
  sourceId: string;
  connectorId: string;
  connectorVersion: string;
  classification: DataClassification;
  license?: string;
  accessPolicy?: string;
  sanitizedRequestArtifactId: string;
  rawArtifactId: string;
  startedAt: string;
  requestedAsOf?: string;
  sourceEffectiveVintage?: string;
  asOfAssurance: AsOfAssurance;
  wireRequestHmac?: string;
  responseStatus?: number;
  responseHeaders?: Readonly<Record<string, string>>;
  schemaArtifactId?: string;
}): AcquisitionReceipt {
  requireIsoTimestamp(options.startedAt, 'acquisition.startedAt');
  if (options.requestedAsOf) requireIsoTimestamp(options.requestedAsOf, 'acquisition.requestedAsOf');
  if (options.sourceEffectiveVintage) {
    requireIsoTimestamp(options.sourceEffectiveVintage, 'acquisition.sourceEffectiveVintage');
  }
  const completedAt = options.clock.now().toISOString();
  if (Date.parse(completedAt) < Date.parse(options.startedAt)) {
    throw new Error('Acquisition completedAt precedes startedAt');
  }
  const identity = {
    sourceId: options.sourceId,
    connectorId: options.connectorId,
    connectorVersion: options.connectorVersion,
    classification: options.classification,
    license: options.license,
    accessPolicy: options.accessPolicy,
    sanitizedRequestArtifactId: options.sanitizedRequestArtifactId,
    rawArtifactId: options.rawArtifactId,
    startedAt: options.startedAt,
    completedAt,
    requestedAsOf: options.requestedAsOf,
    sourceEffectiveVintage: options.sourceEffectiveVintage,
    asOfAssurance: options.asOfAssurance,
    wireRequestHmac: options.wireRequestHmac,
    responseStatus: options.responseStatus,
    responseHeaders: options.responseHeaders,
    schemaArtifactId: options.schemaArtifactId,
  };
  return {
    schemaVersion: 'forecast-workbench.acquisition-receipt/v1',
    id: `acquisition:${canonicalSha256Id(identity)}`,
    ...identity,
  };
}

export function createSourceRelease(options: {
  id: string;
  sourceId: string;
  datasetId: string;
  availableAt: string;
  acquisitionReceiptId: string;
  publishedAt?: string;
  sourceVersion?: string;
  publicationTimeBasis: SourceRelease['publicationTimeBasis'];
}): SourceRelease {
  requireText(options.id, 'release.id');
  requireText(options.sourceId, 'release.sourceId');
  requireText(options.datasetId, 'release.datasetId');
  requireText(options.acquisitionReceiptId, 'release.acquisitionReceiptId');
  requireIsoTimestamp(options.availableAt, 'release.availableAt');
  if (options.publishedAt) requireIsoTimestamp(options.publishedAt, 'release.publishedAt');
  return {
    schemaVersion: 'forecast-workbench.source-release/v1',
    ...options,
  };
}

function versionIdentity(
  version: Omit<ObservationVersion, 'id'>,
): string {
  return `observation-version:${canonicalSha256Id(version)}`;
}

export function diffObservationRelease(options: {
  release: SourceRelease;
  rows: readonly NormalizedObservation[];
  previousByObservationKey?: ReadonlyMap<string, ObservationVersion>;
  completeReplacement?: boolean;
}): ObservationVersion[] {
  const previous = options.previousByObservationKey ?? new Map<string, ObservationVersion>();
  const seen = new Set<string>();
  const versions: ObservationVersion[] = [];
  for (const row of options.rows) {
    const keyId = observationKeyId(row.key);
    if (seen.has(keyId)) throw new Error(`Duplicate observation row '${keyId}' in release`);
    seen.add(keyId);
    const prior = previous.get(keyId);
    const valueDigest = canonicalSha256Id(row.value);
    let status: ObservationVersionStatus;
    if (row.reportedStatus === 'backfilled') status = 'backfilled';
    else if (!prior) status = row.reportedStatus ?? 'new';
    else if (prior.valueDigest === valueDigest) status = 'unchanged';
    else status = row.reportedStatus ?? 'revised';
    const unsealed: Omit<ObservationVersion, 'id'> = {
      schemaVersion: 'forecast-workbench.observation-version/v1',
      observationKey: row.key,
      observationKeyId: keyId,
      releaseId: options.release.id,
      value: row.value,
      valueDigest,
      status,
      ...(prior ? { predecessorId: prior.id } : {}),
      ...(!prior
        ? { firstReleaseBasis: row.firstReleaseBasis ?? 'first-seen' }
        : {}),
      availableAt: options.release.availableAt,
      ...(row.sourceRowLocator ? { sourceRowLocator: row.sourceRowLocator } : {}),
    };
    versions.push({ ...unsealed, id: versionIdentity(unsealed) });
  }
  if (options.completeReplacement) {
    for (const [keyId, prior] of previous) {
      if (seen.has(keyId)) continue;
      const unsealed: Omit<ObservationVersion, 'id'> = {
        schemaVersion: 'forecast-workbench.observation-version/v1',
        observationKey: prior.observationKey,
        observationKeyId: keyId,
        releaseId: options.release.id,
        status: 'withdrawn',
        predecessorId: prior.id,
        availableAt: options.release.availableAt,
      };
      versions.push({ ...unsealed, id: versionIdentity(unsealed) });
    }
  }
  return versions;
}

export function selectObservationsAsOf(options: {
  versions: readonly ObservationVersion[];
  cutoffAt: string;
  profile: SourceVintageProfile;
}): Map<string, ObservationVersion> {
  requireIsoTimestamp(options.cutoffAt, 'as-of cutoff');
  const assurance = assuranceForProfile(options.profile, options.cutoffAt);
  if (assurance === 'unsupported') {
    throw new Error(
      `Source '${options.profile.sourceId}' cannot support an as-of query before ` +
      `${options.profile.monitoringStartedAt}`,
    );
  }
  const selected = new Map<string, ObservationVersion>();
  const cutoff = Date.parse(options.cutoffAt);
  for (const version of [...options.versions].sort(
    (left, right) => Date.parse(left.availableAt) - Date.parse(right.availableAt),
  )) {
    requireIsoTimestamp(version.availableAt, `observation '${version.id}' availableAt`);
    if (Date.parse(version.availableAt) > cutoff) continue;
    if (version.status === 'withdrawn') selected.delete(version.observationKeyId);
    else selected.set(version.observationKeyId, version);
  }
  return selected;
}

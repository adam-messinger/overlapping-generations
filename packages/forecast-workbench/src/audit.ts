import { sign, verify } from 'node:crypto';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  canonicalJson,
  requireIsoTimestamp,
  requireText,
  sha256Id,
  type Clock,
} from './canonical.js';
import type {
  EvidencePacket,
  ForecastVersion,
  ModelForecast,
  QuestionPreflight,
  ResolutionVersion,
} from './contracts.js';
import type {
  NewsModelComparison,
  NewsScreenRecord,
} from './news-workflow.js';
import type { ReferenceClassVersion } from './reference-classes.js';
import type { ForecastLedger } from './ledger.js';
import type { DatasetSnapshot } from './dataset-snapshots.js';

export interface ChainHeadReceipt {
  schemaVersion: 'forecast-workbench.chain-receipt/v1';
  chainHead: string;
  eventSequence: number;
  issuedAt: string;
  issuer: string;
  signatureAlgorithm: 'ed25519';
  signatureBase64: string;
  publicKeyId: string;
  externalAnchor?: string;
}

export interface AuditBundleArtifact {
  id: string;
  role: string;
  included: boolean;
  restriction?: string;
}

export interface AuditBundleManifest {
  schemaVersion: 'forecast-workbench.audit-bundle/v1';
  generatedAt: string;
  chainHead?: string;
  events: number;
  records: number;
  verification: 'complete' | 'incomplete-restricted-artifacts';
  artifacts: readonly AuditBundleArtifact[];
}

function receiptPayload(
  receipt: Omit<ChainHeadReceipt, 'signatureBase64'>,
): string {
  return canonicalJson(receipt);
}

export function signChainHead(options: {
  ledger: ForecastLedger;
  clock: Clock;
  issuer: string;
  privateKeyPem: string;
  publicKeyId: string;
  externalAnchor?: string;
}): ChainHeadReceipt {
  const head = options.ledger.chainHead();
  if (!head) throw new Error('Cannot sign an empty ledger');
  requireText(options.issuer, 'chain receipt issuer');
  requireText(options.publicKeyId, 'chain receipt publicKeyId');
  const issuedAt = options.clock.now().toISOString();
  if (Date.parse(issuedAt) < Date.parse(head.occurredAt)) {
    throw new Error('Chain receipt cannot be issued before the chain head');
  }
  const unsigned: Omit<ChainHeadReceipt, 'signatureBase64'> = {
    schemaVersion: 'forecast-workbench.chain-receipt/v1',
    chainHead: head.eventHash,
    eventSequence: head.sequence,
    issuedAt,
    issuer: options.issuer,
    signatureAlgorithm: 'ed25519',
    publicKeyId: options.publicKeyId,
    ...(options.externalAnchor ? { externalAnchor: options.externalAnchor } : {}),
  };
  const signature = sign(null, Buffer.from(receiptPayload(unsigned)), options.privateKeyPem);
  return { ...unsigned, signatureBase64: signature.toString('base64') };
}

export function verifyChainHeadReceipt(
  receipt: ChainHeadReceipt,
  publicKeyPem: string,
): boolean {
  requireIsoTimestamp(receipt.issuedAt, 'chain receipt issuedAt');
  const { signatureBase64, ...unsigned } = receipt;
  return verify(
    null,
    Buffer.from(receiptPayload(unsigned)),
    publicKeyPem,
    Buffer.from(signatureBase64, 'base64'),
  );
}

function artifactPath(root: string, id: string): string {
  const match = /^sha256:([a-f0-9]{64})$/.exec(id);
  if (!match) throw new Error(`Invalid audit artifact ID '${id}'`);
  return join(root, 'artifacts', match[1].slice(0, 2), match[1].slice(2));
}

export async function exportAuditBundle(options: {
  ledger: ForecastLedger;
  clock: Clock;
  destination: string;
  includeRestricted?: boolean;
}): Promise<AuditBundleManifest> {
  await options.ledger.initialize();
  try {
    const existing = await readdir(options.destination);
    if (existing.length > 0) {
      throw new Error(
        `Audit destination '${options.destination}' must be empty`,
      );
    }
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const verification = await options.ledger.verify();
  const artifacts = new Map<string, AuditBundleArtifact>();
  const add = (
    id: string,
    role: string,
    included = true,
    restriction?: string,
  ): void => {
    const existing = artifacts.get(id);
    if (existing) {
      existing.role = `${existing.role},${role}`;
      existing.included = existing.included && included;
      if (restriction) existing.restriction = restriction;
      return;
    }
    artifacts.set(id, {
      id,
      role,
      included,
      ...(restriction ? { restriction } : {}),
    });
  };
  const records = options.ledger.listRecords();
  for (const row of records) {
    add(row.id, `record:${row.recordType}`);
    const record = await options.ledger.getRecord<any>(row.id);
    if (row.recordType === 'evidence-packet') {
      const packet = record as EvidencePacket;
      const include = packet.classification !== 'restricted' || options.includeRestricted === true;
      add(
        packet.viewArtifactId,
        'evidence-view',
        include,
        include ? undefined : packet.accessPolicy ?? 'restricted source',
      );
      packet.derivedFromArtifactIds.forEach((id) => add(
        id,
        'evidence-derived-source',
        include,
        include ? undefined : packet.accessPolicy ?? 'restricted source',
      ));
      for (const id of packet.snapshotIds) {
        if (await options.ledger.artifacts.has(id)) {
          add(
            id,
            'evidence-snapshot',
            include,
            include ? undefined : packet.accessPolicy ?? 'restricted source',
          );
        }
      }
    }
    if (row.recordType === 'preflight') {
      const preflight = record as QuestionPreflight;
      if (preflight.resolverProbeArtifactId) {
        add(preflight.resolverProbeArtifactId, 'resolver-preflight');
      }
    }
    if (row.recordType === 'forecast') {
      add((record as ForecastVersion).informationSetArtifactId, 'information-set');
    }
    if (row.recordType === 'model-forecast') {
      const modelForecast = record as ModelForecast;
      add(modelForecast.runManifestArtifactId, 'run-manifest');
      modelForecast.adapterInputArtifactIds.forEach((id) => add(id, 'model-adapter-input'));
    }
    if (row.recordType === 'news-model-comparison') {
      const comparison = record as NewsModelComparison;
      comparison.evidencePacketIds.forEach((id) =>
        add(id, 'news-evidence-packet')
      );
      comparison.iterations.forEach(({ runManifestArtifactId }, index) =>
        add(runManifestArtifactId, `news-run-manifest-v${index + 1}`)
      );
    }
    if (row.recordType === 'news-screen') {
      const screen = record as NewsScreenRecord;
      screen.stories.forEach(({ sourceArtifactIds }) =>
        sourceArtifactIds.forEach((id) => add(id, 'news-source-pointer'))
      );
    }
    if (row.recordType === 'reference-class') {
      add(
        (record as ReferenceClassVersion).candidateUniverseArtifactId,
        'reference-class-universe',
      );
    }
    if (row.recordType === 'resolution') {
      const resolution = record as ResolutionVersion;
      for (const id of resolution.snapshotIds) {
        add(id, 'resolution-snapshot');
      }
    }
    if (row.recordType === 'acquisition-receipt') {
      add(record.sanitizedRequestArtifactId, 'sanitized-request');
      const include = record.classification !== 'restricted' ||
        options.includeRestricted === true;
      add(
        record.rawArtifactId,
        'raw-acquisition',
        include,
        include ? undefined : record.accessPolicy ?? 'restricted source',
      );
      if (record.schemaArtifactId) add(record.schemaArtifactId, 'source-schema');
    }
    if (row.recordType === 'dataset-snapshot') {
      const snapshot = record as DatasetSnapshot;
      const include = snapshot.classification !== 'restricted' ||
        options.includeRestricted === true;
      const restriction = include
        ? undefined
        : snapshot.accessPolicy ?? 'restricted dataset';
      snapshot.dataArtifactIds.forEach((id) =>
        add(id, 'dataset-data', include, restriction)
      );
      snapshot.schemaArtifactIds.forEach((id) =>
        add(id, 'dataset-schema', include, restriction)
      );
      snapshot.semanticCrosswalkArtifactIds.forEach((id) =>
        add(id, 'dataset-semantic-crosswalk', include, restriction)
      );
    }
  }
  await mkdir(options.destination, { recursive: true, mode: 0o700 });
  for (const artifact of artifacts.values()) {
    if (!artifact.included) continue;
    await options.ledger.artifacts.writeCopy(
      artifact.id,
      artifactPath(options.destination, artifact.id),
    );
  }
  const events = await options.ledger.events();
  await writeFile(
    join(options.destination, 'events.jsonl'),
    events.map((event) => canonicalJson(event)).join('\n') + (events.length ? '\n' : ''),
    { mode: 0o600 },
  );
  const incomplete = [...artifacts.values()].some(({ included }) => !included);
  const manifest: AuditBundleManifest = {
    schemaVersion: 'forecast-workbench.audit-bundle/v1',
    generatedAt: options.clock.now().toISOString(),
    ...(verification.chainHead ? { chainHead: verification.chainHead } : {}),
    events: verification.events,
    records: verification.records,
    verification: incomplete ? 'incomplete-restricted-artifacts' : 'complete',
    artifacts: [...artifacts.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };
  const manifestJson = `${canonicalJson(manifest, 2)}\n`;
  await writeFile(join(options.destination, 'manifest.json'), manifestJson, { mode: 0o600 });
  await writeFile(
    join(options.destination, 'manifest.sha256'),
    `${sha256Id(manifestJson)}  manifest.json\n`,
    { mode: 0o600 },
  );
  return manifest;
}

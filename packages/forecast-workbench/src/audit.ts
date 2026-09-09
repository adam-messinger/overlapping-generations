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
  DataClassification,
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

interface DisclosureGate {
  included: boolean;
  restriction?: string;
}

/**
 * Whether a bundle may carry something owned by a record of this
 * classification. An absent classification is unknown provenance rather than
 * permission — only records written before the event envelope carried one
 * produce it — so it withholds too.
 */
function classificationGate(
  classification: DataClassification | undefined,
  includeRestricted: boolean | undefined,
  restrictedReason = 'restricted record',
): DisclosureGate {
  const restriction = classification === undefined
    ? 'classification not recorded (pre-v2 ledger)'
    : classification === 'restricted'
      ? restrictedReason
      : undefined;
  if (restriction === undefined || includeRestricted === true) return { included: true };
  return { included: false, restriction };
}

/**
 * The more restrictive of an envelope gate and a record's own. When both
 * withhold, the record's reason wins: it carries the access policy the source
 * actually declared, which says more than the generic envelope message.
 */
function narrower(envelope: DisclosureGate, record: DisclosureGate): DisclosureGate {
  if (!record.included) return record;
  return envelope;
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
    // A record body carries the values themselves, so a restricted record must
    // be withheld even when the raw artifact it derives from already is — and
    // so must everything that record points at, or the values reappear one
    // level out. The manifest keeps the pointer either way, so the bundle
    // still attests to what it is not carrying.
    const gate = classificationGate(row.classification, options.includeRestricted);
    add(row.id, `record:${row.recordType}`, gate.included, gate.restriction);
    const record = await options.ledger.getRecord<any>(row.id);
    if (row.recordType === 'evidence-packet') {
      const packet = record as EvidencePacket;
      const packetGate = narrower(gate, classificationGate(
        packet.classification,
        options.includeRestricted,
        packet.accessPolicy ?? 'restricted source',
      ));
      const include = packetGate.included;
      add(
        packet.viewArtifactId,
        'evidence-view',
        include,
        packetGate.restriction,
      );
      packet.derivedFromArtifactIds.forEach((id) => add(
        id,
        'evidence-derived-source',
        include,
        packetGate.restriction,
      ));
      for (const id of packet.snapshotIds) {
        if (await options.ledger.artifacts.has(id)) {
          add(
            id,
            'evidence-snapshot',
            include,
            packetGate.restriction,
          );
        }
      }
    }
    if (row.recordType === 'preflight') {
      const preflight = record as QuestionPreflight;
      if (preflight.resolverProbeArtifactId) {
        add(
          preflight.resolverProbeArtifactId,
          'resolver-preflight',
          gate.included,
          gate.restriction,
        );
      }
    }
    if (row.recordType === 'forecast') {
      add(
        (record as ForecastVersion).informationSetArtifactId,
        'information-set',
        gate.included,
        gate.restriction,
      );
    }
    if (row.recordType === 'model-forecast') {
      const modelForecast = record as ModelForecast;
      add(modelForecast.runManifestArtifactId, 'run-manifest', gate.included, gate.restriction);
      modelForecast.adapterInputArtifactIds.forEach((id) =>
        add(id, 'model-adapter-input', gate.included, gate.restriction)
      );
    }
    if (row.recordType === 'news-model-comparison') {
      const comparison = record as NewsModelComparison;
      comparison.evidencePacketIds.forEach((id) =>
        add(id, 'news-evidence-packet', gate.included, gate.restriction)
      );
      comparison.iterations.forEach(({ runManifestArtifactId }, index) =>
        add(
          runManifestArtifactId,
          `news-run-manifest-v${index + 1}`,
          gate.included,
          gate.restriction,
        )
      );
    }
    if (row.recordType === 'news-screen') {
      const screen = record as NewsScreenRecord;
      screen.stories.forEach(({ sourceArtifactIds }) =>
        sourceArtifactIds.forEach((id) =>
          add(id, 'news-source-pointer', gate.included, gate.restriction)
        )
      );
    }
    if (row.recordType === 'reference-class') {
      add(
        (record as ReferenceClassVersion).candidateUniverseArtifactId,
        'reference-class-universe',
        gate.included,
        gate.restriction,
      );
    }
    if (row.recordType === 'resolution') {
      const resolution = record as ResolutionVersion;
      for (const id of resolution.snapshotIds) {
        add(id, 'resolution-snapshot', gate.included, gate.restriction);
      }
    }
    if (row.recordType === 'acquisition-receipt') {
      const receiptGate = narrower(gate, classificationGate(
        record.classification,
        options.includeRestricted,
        record.accessPolicy ?? 'restricted source',
      ));
      add(
        record.sanitizedRequestArtifactId,
        'sanitized-request',
        gate.included,
        gate.restriction,
      );
      add(
        record.rawArtifactId,
        'raw-acquisition',
        receiptGate.included,
        receiptGate.restriction,
      );
      if (record.schemaArtifactId) {
        add(record.schemaArtifactId, 'source-schema', gate.included, gate.restriction);
      }
    }
    if (row.recordType === 'dataset-snapshot') {
      const snapshot = record as DatasetSnapshot;
      const { included: include, restriction } = narrower(gate, classificationGate(
        snapshot.classification,
        options.includeRestricted,
        snapshot.accessPolicy ?? 'restricted dataset',
      ));
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

import {
  requireIsoTimestamp,
  requireText,
} from './canonical.js';
import type { DataClassification } from './contracts.js';

export type DatasetSnapshotChange =
  | 'initial'
  | 'unchanged'
  | 'revised'
  | 'backfilled';

/**
 * A bulk dataset snapshot keeps large normalized panels content-addressed
 * without expanding every cell into an observation-version ledger event.
 * Acquisition receipts still preserve the raw query/response boundary.
 */
export interface DatasetSnapshot {
  schemaVersion: 'forecast-workbench.dataset-snapshot/v1';
  id: string;
  datasetId: string;
  datasetVersion: string;
  title: string;
  description: string;
  createdAt: string;
  referencePeriod: string;
  publishedAt?: string;
  publicationTimeBasis: 'source' | 'archive' | 'inferred' | 'retrieval';
  sourceIds: readonly string[];
  acquisitionReceiptIds: readonly string[];
  dataArtifactIds: readonly string[];
  schemaArtifactIds: readonly string[];
  semanticCrosswalkArtifactIds: readonly string[];
  rowCount: number;
  columnCount: number;
  change: DatasetSnapshotChange;
  predecessorSnapshotId?: string;
  classification: DataClassification;
  license?: string;
  accessPolicy?: string;
  notes?: readonly string[];
}

function requireUniqueText(
  values: readonly string[],
  context: string,
  options: { allowEmpty?: boolean } = {},
): void {
  if (!options.allowEmpty && values.length === 0) {
    throw new Error(`${context} must contain at least one value`);
  }
  const seen = new Set<string>();
  for (const value of values) {
    requireText(value, context);
    if (seen.has(value)) {
      throw new Error(`${context} contains duplicate '${value}'`);
    }
    seen.add(value);
  }
}

export function validateDatasetSnapshot(
  snapshot: DatasetSnapshot,
): DatasetSnapshot {
  if (snapshot.schemaVersion !== 'forecast-workbench.dataset-snapshot/v1') {
    throw new Error(
      `Unsupported dataset snapshot schema '${String(snapshot.schemaVersion)}'`,
    );
  }
  requireText(snapshot.id, 'dataset snapshot id');
  requireText(snapshot.datasetId, 'dataset snapshot datasetId');
  requireText(snapshot.datasetVersion, 'dataset snapshot datasetVersion');
  requireText(snapshot.title, 'dataset snapshot title');
  requireText(snapshot.description, 'dataset snapshot description');
  requireIsoTimestamp(snapshot.createdAt, 'dataset snapshot createdAt');
  requireText(snapshot.referencePeriod, 'dataset snapshot referencePeriod');
  if (snapshot.publishedAt) {
    requireIsoTimestamp(snapshot.publishedAt, 'dataset snapshot publishedAt');
  }
  if (
    !['source', 'archive', 'inferred', 'retrieval'].includes(
      snapshot.publicationTimeBasis,
    )
  ) {
    throw new Error(
      `Invalid dataset snapshot publicationTimeBasis '${String(
        snapshot.publicationTimeBasis,
      )}'`,
    );
  }
  if (
    !['initial', 'unchanged', 'revised', 'backfilled'].includes(
      snapshot.change,
    )
  ) {
    throw new Error(
      `Invalid dataset snapshot change '${String(snapshot.change)}'`,
    );
  }
  if (!['public', 'internal', 'restricted'].includes(snapshot.classification)) {
    throw new Error(
      `Invalid dataset snapshot classification '${String(
        snapshot.classification,
      )}'`,
    );
  }
  if (!Number.isInteger(snapshot.rowCount) || snapshot.rowCount < 0) {
    throw new Error('Dataset snapshot rowCount must be a non-negative integer');
  }
  if (!Number.isInteger(snapshot.columnCount) || snapshot.columnCount < 1) {
    throw new Error('Dataset snapshot columnCount must be a positive integer');
  }
  requireUniqueText(snapshot.sourceIds, 'dataset snapshot sourceIds');
  requireUniqueText(
    snapshot.acquisitionReceiptIds,
    'dataset snapshot acquisitionReceiptIds',
  );
  requireUniqueText(snapshot.dataArtifactIds, 'dataset snapshot dataArtifactIds');
  requireUniqueText(
    snapshot.schemaArtifactIds,
    'dataset snapshot schemaArtifactIds',
    { allowEmpty: true },
  );
  requireUniqueText(
    snapshot.semanticCrosswalkArtifactIds,
    'dataset snapshot semanticCrosswalkArtifactIds',
    { allowEmpty: true },
  );
  if (snapshot.predecessorSnapshotId) {
    requireText(
      snapshot.predecessorSnapshotId,
      'dataset snapshot predecessorSnapshotId',
    );
  } else if (snapshot.change !== 'initial') {
    throw new Error(
      `Dataset snapshot change '${snapshot.change}' requires a predecessor`,
    );
  }
  if (snapshot.notes) {
    requireUniqueText(snapshot.notes, 'dataset snapshot notes', {
      allowEmpty: true,
    });
  }
  return snapshot;
}

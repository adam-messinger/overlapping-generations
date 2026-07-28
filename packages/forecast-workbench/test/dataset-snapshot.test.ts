import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FixedClock,
  ForecastWorkbench,
  createAcquisitionReceipt,
  exportAuditBundle,
  type Actor,
  type DatasetSnapshot,
} from '../src/index.js';

const service: Actor = { id: 'dataset-runner', role: 'service' };

test('bulk dataset snapshots bind acquisitions, schemas, and normalized artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-dataset-snapshot-'));
  const audit = await mkdtemp(join(tmpdir(), 'forecast-dataset-audit-'));
  const clock = new FixedClock(new Date('2026-07-28T12:00:00.000Z'));
  const workbench = new ForecastWorkbench(root, clock);
  try {
    await workbench.initialize();
    const request = await workbench.ledger.artifacts.putCanonical({
      uri: 'https://example.test/data',
      credentials: [],
    }, { classification: 'public' });
    const raw = await workbench.ledger.artifacts.put('raw,csv\n1,2\n', {
      mediaType: 'text/csv',
      classification: 'public',
    });
    const sourceSchema = await workbench.ledger.artifacts.putCanonical({
      columns: ['raw', 'csv'],
    }, { classification: 'public' });
    const receipt = createAcquisitionReceipt({
      clock,
      sourceId: 'fixture.bulk',
      connectorId: 'fixture-bulk',
      connectorVersion: '1.0.0',
      classification: 'public',
      sanitizedRequestArtifactId: request.id,
      rawArtifactId: raw.id,
      startedAt: clock.now().toISOString(),
      sourceEffectiveVintage: '2026-01-01T00:00:00.000Z',
      asOfAssurance: 'release-archive',
      schemaArtifactId: sourceSchema.id,
    });
    const receiptRecord = await workbench.recordAcquisition(service, receipt);
    const data = await workbench.ledger.artifacts.put('a,b\n1,2\n', {
      mediaType: 'text/csv',
      classification: 'public',
    });
    const schema = await workbench.ledger.artifacts.putCanonical({
      columns: ['a', 'b'],
    }, { classification: 'public' });
    const crosswalk = await workbench.ledger.artifacts.putCanonical({
      a: 'fixture raw',
      b: 'fixture csv',
    }, { classification: 'public' });
    const snapshot: DatasetSnapshot = {
      schemaVersion: 'forecast-workbench.dataset-snapshot/v1',
      id: 'fixture.bulk.2026-v1',
      datasetId: 'fixture.bulk',
      datasetVersion: '2026-v1',
      title: 'Fixture bulk panel',
      description: 'A two-column dataset used to test bulk snapshot lineage.',
      createdAt: clock.now().toISOString(),
      referencePeriod: '2026',
      publishedAt: '2026-07-01T00:00:00.000Z',
      publicationTimeBasis: 'source',
      sourceIds: ['fixture.bulk'],
      acquisitionReceiptIds: [receiptRecord.id],
      dataArtifactIds: [data.id],
      schemaArtifactIds: [schema.id],
      semanticCrosswalkArtifactIds: [crosswalk.id],
      rowCount: 1,
      columnCount: 2,
      change: 'initial',
      classification: 'public',
    };
    const recorded = await workbench.recordDatasetSnapshot(service, snapshot);
    assert.equal(
      workbench.ledger.listRecordIds('dataset-snapshot').length,
      1,
    );
    assert.deepEqual(
      await workbench.ledger.getRecord(recorded.id),
      snapshot,
    );
    await assert.rejects(
      workbench.recordDatasetSnapshot(service, {
        ...snapshot,
        id: 'fixture.bulk.2026-v1-copy',
      }),
      /version '2026-v1' exists/,
    );

    const manifest = await exportAuditBundle({
      ledger: workbench.ledger,
      clock,
      destination: audit,
    });
    assert.equal(
      manifest.artifacts.find(({ id }) => id === data.id)?.role,
      'dataset-data',
    );
    assert.equal(
      manifest.artifacts.find(({ id }) => id === crosswalk.id)?.role,
      'dataset-semantic-crosswalk',
    );
    assert.match(
      await readFile(join(audit, 'events.jsonl'), 'utf8'),
      /dataset-snapshot/,
    );
  } finally {
    workbench.close();
    await rm(root, { recursive: true, force: true });
    await rm(audit, { recursive: true, force: true });
  }
});

test('revised bulk snapshots require a same-dataset predecessor', async () => {
  const snapshot: DatasetSnapshot = {
    schemaVersion: 'forecast-workbench.dataset-snapshot/v1',
    id: 'fixture.revised',
    datasetId: 'fixture',
    datasetVersion: '2',
    title: 'Revised fixture',
    description: 'Invalid without its predecessor.',
    createdAt: '2026-07-28T12:00:00.000Z',
    referencePeriod: '2026',
    publicationTimeBasis: 'retrieval',
    sourceIds: ['fixture'],
    acquisitionReceiptIds: ['sha256:receipt'],
    dataArtifactIds: ['sha256:data'],
    schemaArtifactIds: [],
    semanticCrosswalkArtifactIds: [],
    rowCount: 1,
    columnCount: 1,
    change: 'revised',
    classification: 'public',
  };
  const {
    validateDatasetSnapshot,
  } = await import('../src/dataset-snapshots.js');
  assert.throws(
    () => validateDatasetSnapshot(snapshot),
    /requires a predecessor/,
  );
});

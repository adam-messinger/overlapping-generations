import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  canonicalJson,
  canonicalSha256Id,
  FixedClock,
  FileArtifactStore,
  ForecastLedger,
  signChainHead,
  verifyChainHeadReceipt,
} from '../src/index.js';

const actor = { id: 'conformance-runner', role: 'service' } as const;

/**
 * Builds a v1 event the way the pre-classification ledger did, so the rebuild
 * path can be exercised against a log this build would never write itself.
 */
function sealLegacyV1Event(options: {
  schemaVersion: 'forecast-workbench.event/v1';
  sequence: number;
  occurredAt: string;
  actor: typeof actor;
  kind: string;
  recordType: string;
  record: unknown;
}) {
  const { record, ...rest } = options;
  const unsealed = { ...rest, recordArtifactId: canonicalSha256Id(record) };
  const hash = canonicalSha256Id(unsealed);
  return {
    record,
    event: { ...unsealed, eventId: `event:${hash}`, eventHash: hash },
  };
}

test('independent writers serialize appends through the ledger lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-ledger-concurrency-'));
  const clock = new FixedClock(new Date('2026-07-28T12:00:00.000Z'));
  const first = new ForecastLedger(root, clock);
  const second = new ForecastLedger(root, clock);
  await Promise.all([first.initialize(), second.initialize()]);
  try {
    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        (index % 2 === 0 ? first : second).appendRecord({
          actor,
          kind: 'conformance.recorded',
          recordType: 'conformance-record',
          record: { index, value: `record-${index}` },
          classification: 'internal',
        })
      ),
    );
    const verification = await first.verify();
    assert.equal(verification.events, 20);
    assert.equal(verification.records, 20);
    assert.deepEqual(
      (await first.events()).map(({ sequence }) => sequence),
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
  } finally {
    first.close();
    second.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('SQLite can be rebuilt from the canonical log and record artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-ledger-rebuild-'));
  const clock = new FixedClock(new Date('2026-07-28T12:00:00.000Z'));
  const ledger = new ForecastLedger(root, clock);
  await ledger.initialize();
  await ledger.appendRecord({
    actor,
    kind: 'conformance.recorded',
    recordType: 'conformance-record',
    record: { id: 'survives-rebuild', value: 42 },
    classification: 'internal',
  });
  const recordId = ledger.listRecordIds('conformance-record')[0];
  ledger.close();
  await Promise.all([
    rm(join(root, 'index.sqlite'), { force: true }),
    rm(join(root, 'index.sqlite-wal'), { force: true }),
    rm(join(root, 'index.sqlite-shm'), { force: true }),
  ]);

  const rebuilt = new ForecastLedger(root, clock);
  try {
    await rebuilt.initialize();
    assert.deepEqual(await rebuilt.getRecord(recordId), {
      id: 'survives-rebuild',
      value: 42,
    });
    assert.equal((await rebuilt.verify()).events, 1);
  } finally {
    rebuilt.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('Ed25519 chain-head receipts verify and detect tampering', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-chain-receipt-'));
  const clock = new FixedClock(new Date('2026-07-28T12:00:00.000Z'));
  const ledger = new ForecastLedger(root, clock);
  await ledger.initialize();
  try {
    await ledger.appendRecord({
      actor,
      kind: 'conformance.recorded',
      recordType: 'conformance-record',
      record: { id: 'signed-record' },
      classification: 'internal',
    });
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const privateKeyPem = privateKey.export({
      format: 'pem',
      type: 'pkcs8',
    }).toString();
    const publicKeyPem = publicKey.export({
      format: 'pem',
      type: 'spki',
    }).toString();
    const receipt = signChainHead({
      ledger,
      clock,
      issuer: 'forecast-workbench-test',
      privateKeyPem,
      publicKeyId: 'test-key-1',
    });
    assert.equal(verifyChainHeadReceipt(receipt, publicKeyPem), true);
    assert.equal(
      verifyChainHeadReceipt(
        { ...receipt, issuer: 'tampered-issuer' },
        publicKeyPem,
      ),
      false,
    );
  } finally {
    ledger.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('the canonical event clock cannot move backward', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-ledger-clock-'));
  const clock = new FixedClock(new Date('2026-07-28T12:00:00.000Z'));
  const ledger = new ForecastLedger(root, clock);
  await ledger.initialize();
  try {
    await ledger.appendRecord({
      actor,
      kind: 'conformance.recorded',
      recordType: 'conformance-record',
      record: { id: 'first' },
      classification: 'internal',
    });
    clock.set(new Date('2026-07-28T11:59:59.000Z'));
    await assert.rejects(
      ledger.appendRecord({
        actor,
        kind: 'conformance.recorded',
        recordType: 'conformance-record',
        record: { id: 'backdated' },
        classification: 'internal',
      }),
      /clock moved backward/,
    );
    assert.equal((await ledger.verify()).events, 1);
  } finally {
    ledger.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('content-address collisions never accept corrupted existing bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-artifact-corruption-'));
  const store = new FileArtifactStore(root);
  try {
    const artifact = await store.put('original');
    await writeFile(store.pathFor(artifact.id), 'tampered');
    await assert.rejects(store.put('original'), /invalid stored content/);
    await assert.rejects(
      store.writeCopy(artifact.id, join(root, 'copy')),
      /integrity failure/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('classification is sealed into the event and survives a projection rebuild', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-ledger-classification-'));
  const clock = new FixedClock(new Date('2026-09-09T12:00:00.000Z'));
  const ledger = new ForecastLedger(root, clock);
  await ledger.initialize();
  try {
    const reference = await ledger.appendRecord({
      actor,
      kind: 'observation.final',
      recordType: 'observation-version',
      record: { id: 'obs-restricted', value: 'RESTRICTED_OBSERVATION_VALUE' },
      classification: 'restricted',
    });
    assert.equal(reference.event.schemaVersion, 'forecast-workbench.event/v2');
    assert.equal(reference.event.classification, 'restricted');

    // The canonical log, not just the index, has to carry it — the projection
    // is derived and can be discarded at any time.
    const [logged] = await ledger.events();
    assert.equal(logged.classification, 'restricted');

    const projected = () => (ledger.db().prepare(
      'SELECT classification FROM records WHERE record_artifact_id = ?',
    ).get(reference.id) as { classification: string | null }).classification;
    assert.equal(projected(), 'restricted');

    ledger.close();
    await Promise.all([
      rm(join(root, 'index.sqlite'), { force: true }),
      rm(join(root, 'index.sqlite-wal'), { force: true }),
      rm(join(root, 'index.sqlite-shm'), { force: true }),
    ]);
    const rebuilt = new ForecastLedger(root, clock);
    await rebuilt.initialize();
    try {
      assert.equal((rebuilt.db().prepare(
        'SELECT classification FROM records WHERE record_artifact_id = ?',
      ).get(reference.id) as { classification: string | null }).classification, 'restricted');
      assert.equal((await rebuilt.verify()).events, 1);
    } finally {
      rebuilt.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a v1 event still verifies, and its classification reads as unknown', async () => {
  // v1 had nowhere to record a classification, and the write-time intent is
  // unrecoverable. Such a record must project as NULL — "not recorded" — so
  // readers can fail closed rather than mistake it for a known level.
  const root = await mkdtemp(join(tmpdir(), 'forecast-ledger-v1-'));
  const clock = new FixedClock(new Date('2026-09-09T12:00:00.000Z'));
  const legacy = sealLegacyV1Event({
    schemaVersion: 'forecast-workbench.event/v1',
    sequence: 1,
    occurredAt: clock.now().toISOString(),
    actor,
    kind: 'observation.final',
    recordType: 'observation-version',
    record: { id: 'legacy-observation', value: 3 },
  });
  await mkdir(root, { recursive: true, mode: 0o700 });
  const store = new FileArtifactStore(join(root, 'artifacts'));
  await store.putCanonical(legacy.record);
  await writeFile(join(root, 'events.jsonl'), `${canonicalJson(legacy.event)}\n`);

  const ledger = new ForecastLedger(root, clock);
  try {
    await ledger.initialize();
    assert.equal((await ledger.verify()).events, 1);
    const row = ledger.db().prepare(
      'SELECT classification FROM records WHERE record_artifact_id = ?',
    ).get(legacy.event.recordArtifactId) as { classification: string | null };
    assert.equal(row.classification, null);
  } finally {
    ledger.close();
    await rm(root, { recursive: true, force: true });
  }
});

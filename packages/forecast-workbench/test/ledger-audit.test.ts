import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  canonicalJson,
  canonicalSha256Id,
  exportAuditBundle,
  FixedClock,
  FileArtifactStore,
  ForecastLedger,
  signChainHead,
  verifyChainHeadReceipt,
} from '../src/index.js';

const actor = { id: 'conformance-runner', role: 'service' } as const;

/**
 * True when any file in the exported bundle contains `needle`. Recurses by
 * hand rather than with `readdir`'s `recursive` option, whose `Dirent` carries
 * the parent directory under a name that moved between Node releases.
 */
async function bundleContains(root: string, needle: string): Promise<boolean> {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    const found = entry.isDirectory()
      ? await bundleContains(path, needle)
      : (await readFile(path, 'utf8')).includes(needle);
    if (found) return true;
  }
  return false;
}

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

test('audit export withholds restricted record bodies but keeps the pointer', async () => {
  // Finding 2: restrictions covered referenced artifacts such as raw
  // acquisitions, but not the record bodies that hold the values themselves.
  const root = await mkdtemp(join(tmpdir(), 'forecast-audit-restricted-'));
  const destination = join(await mkdtemp(join(tmpdir(), 'forecast-audit-out-')), 'bundle');
  const clock = new FixedClock(new Date('2026-09-09T12:00:00.000Z'));
  const ledger = new ForecastLedger(root, clock);
  await ledger.initialize();
  try {
    const restricted = await ledger.appendRecord({
      actor,
      kind: 'observation.final',
      recordType: 'observation-version',
      record: { id: 'obs-restricted', value: 'RESTRICTED_OBSERVATION_VALUE' },
      classification: 'restricted',
    });
    const open = await ledger.appendRecord({
      actor,
      kind: 'observation.final',
      recordType: 'observation-version',
      record: { id: 'obs-public', value: 'PUBLIC_OBSERVATION_VALUE' },
      classification: 'public',
    });

    const manifest = await exportAuditBundle({ ledger, clock, destination });
    const entry = (id: string) => manifest.artifacts.find((a) => a.id === id)!;

    assert.equal(entry(restricted.id).included, false);
    assert.equal(entry(restricted.id).restriction, 'restricted record');
    assert.equal(entry(open.id).included, true);
    assert.equal(manifest.verification, 'incomplete-restricted-artifacts');

    // The value must be absent from the bytes, not merely flagged.
    assert.equal(await bundleContains(destination, 'RESTRICTED_OBSERVATION_VALUE'), false);
    assert.equal(await bundleContains(destination, 'PUBLIC_OBSERVATION_VALUE'), true);
  } finally {
    ledger.close();
    await rm(root, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});

test('audit export fails closed on a record with no recorded classification', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-audit-legacy-'));
  const destination = join(await mkdtemp(join(tmpdir(), 'forecast-audit-legacy-out-')), 'bundle');
  const clock = new FixedClock(new Date('2026-09-09T12:00:00.000Z'));
  const legacy = sealLegacyV1Event({
    schemaVersion: 'forecast-workbench.event/v1',
    sequence: 1,
    occurredAt: clock.now().toISOString(),
    actor,
    kind: 'observation.final',
    recordType: 'observation-version',
    record: { id: 'legacy-observation', value: 'LEGACY_OBSERVATION_VALUE' },
  });
  await mkdir(root, { recursive: true, mode: 0o700 });
  await new FileArtifactStore(join(root, 'artifacts')).putCanonical(legacy.record);
  await writeFile(join(root, 'events.jsonl'), `${canonicalJson(legacy.event)}\n`);

  const ledger = new ForecastLedger(root, clock);
  await ledger.initialize();
  try {
    const manifest = await exportAuditBundle({ ledger, clock, destination });
    const entry = manifest.artifacts.find((a) => a.id === legacy.event.recordArtifactId)!;
    assert.equal(entry.included, false);
    // The reason must say the classification is unknown rather than claim a
    // restriction that was never actually declared.
    assert.equal(entry.restriction, 'classification not recorded (pre-v2 ledger)');
    assert.equal(await bundleContains(destination, 'LEGACY_OBSERVATION_VALUE'), false);
  } finally {
    ledger.close();
    await rm(root, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});

test('includeRestricted still emits withheld record bodies', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-audit-include-'));
  const destination = join(await mkdtemp(join(tmpdir(), 'forecast-audit-include-out-')), 'bundle');
  const clock = new FixedClock(new Date('2026-09-09T12:00:00.000Z'));
  const ledger = new ForecastLedger(root, clock);
  await ledger.initialize();
  try {
    await ledger.appendRecord({
      actor,
      kind: 'observation.final',
      recordType: 'observation-version',
      record: { id: 'obs-restricted', value: 'RESTRICTED_OBSERVATION_VALUE' },
      classification: 'restricted',
    });
    const manifest = await exportAuditBundle({
      ledger, clock, destination, includeRestricted: true,
    });
    assert.equal(manifest.verification, 'complete');
    assert.equal(await bundleContains(destination, 'RESTRICTED_OBSERVATION_VALUE'), true);
  } finally {
    ledger.close();
    await rm(root, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});

test('a restricted record does not leak the artifacts it references', async () => {
  // Withholding the body alone is not enough: the values reappear one level
  // out through whatever the record points at. Reproduced on model-forecast,
  // whose adapterInputArtifactIds were exported in full.
  const root = await mkdtemp(join(tmpdir(), 'forecast-audit-referenced-'));
  const destination = join(await mkdtemp(join(tmpdir(), 'forecast-audit-ref-out-')), 'bundle');
  const clock = new FixedClock(new Date('2026-09-09T12:00:00.000Z'));
  const ledger = new ForecastLedger(root, clock);
  await ledger.initialize();
  try {
    const adapterInput = await ledger.artifacts.putCanonical({
      derivedFrom: 'RESTRICTED_INPUT_VALUE',
    });
    const runManifest = await ledger.artifacts.putCanonical({ run: 'r-1' });
    await ledger.appendRecord({
      actor,
      kind: 'model.forecast-registered',
      recordType: 'model-forecast',
      record: {
        id: 'mf-1',
        runManifestArtifactId: runManifest.id,
        adapterInputArtifactIds: [adapterInput.id],
      },
      classification: 'restricted',
    });

    const manifest = await exportAuditBundle({ ledger, clock, destination });
    const entry = manifest.artifacts.find((a) => a.id === adapterInput.id)!;
    assert.equal(entry.included, false);
    assert.equal(entry.restriction, 'restricted record');
    assert.equal(await bundleContains(destination, 'RESTRICTED_INPUT_VALUE'), false);
  } finally {
    ledger.close();
    await rm(root, { recursive: true, force: true });
    await rm(destination, { recursive: true, force: true });
  }
});

test('reading records does not re-verify the whole history each time', async () => {
  // Every getRecord used to re-read the event log and rehash every record
  // artifact before its indexed lookup: 25 reads cost 625 verifications, 50
  // cost 2,500, 100 cost 10,000. Counting bytes read as well as
  // verifications, because a check that only counted hashes would go green
  // while the log was still re-read in full on every call.
  const measure = async (records: number) => {
    const root = await mkdtemp(join(tmpdir(), 'forecast-ledger-scale-'));
    const clock = new FixedClock(new Date('2026-09-09T00:00:00.000Z'));
    const ledger = new ForecastLedger(root, clock);
    await ledger.initialize();
    try {
      for (let index = 0; index < records; index++) {
        await ledger.appendRecord({
          actor,
          kind: 'conformance.recorded',
          recordType: 'conformance-record',
          record: { id: `record-${index}` },
          classification: 'internal',
        });
      }
      const ids = ledger.listRecordIds('conformance-record');

      const store = ledger.artifacts as unknown as {
        verify: (id: string) => Promise<unknown>;
      };
      const verifyArtifact = store.verify.bind(store);
      let verifications = 0;
      store.verify = async (id: string) => {
        verifications += 1;
        return verifyArtifact(id);
      };

      const internals = ledger as unknown as { readEventLog: () => Promise<unknown[]> };
      const readEventLog = internals.readEventLog.bind(internals);
      let logReads = 0;
      internals.readEventLog = async () => {
        logReads += 1;
        return readEventLog();
      };

      for (const id of ids) await ledger.getRecord(id);
      return { verifications, logReads };
    } finally {
      ledger.close();
      await rm(root, { recursive: true, force: true });
    }
  };

  const small = await measure(25);
  const large = await measure(100);

  // Four times the records must not cost sixteen times the work.
  assert.ok(
    large.verifications <= small.verifications * 5,
    `expected roughly linear growth, got ${small.verifications} then ${large.verifications}`,
  );
  // The log is read to synchronise, not once per record read.
  assert.ok(
    large.logReads < 25,
    `expected the log to be read a bounded number of times, got ${large.logReads}`,
  );
});

test('a tampered record artifact is caught when it is read', async () => {
  // The suite covered tampering on the write path only, so a read that
  // stopped re-verifying everything could have dropped this silently.
  const root = await mkdtemp(join(tmpdir(), 'forecast-ledger-tamper-'));
  const clock = new FixedClock(new Date('2026-09-09T00:00:00.000Z'));
  const ledger = new ForecastLedger(root, clock);
  await ledger.initialize();
  try {
    const reference = await ledger.appendRecord({
      actor,
      kind: 'conformance.recorded',
      recordType: 'conformance-record',
      record: { id: 'tamper-target', value: 1 },
      classification: 'internal',
    });
    assert.deepEqual(await ledger.getRecord(reference.id), { id: 'tamper-target', value: 1 });

    await writeFile(
      ledger.artifacts.pathFor(reference.id),
      JSON.stringify({ id: 'tamper-target', value: 999 }),
    );

    await assert.rejects(ledger.getRecord(reference.id), /integrity|invalid/i);
  } finally {
    ledger.close();
    await rm(root, { recursive: true, force: true });
  }
});

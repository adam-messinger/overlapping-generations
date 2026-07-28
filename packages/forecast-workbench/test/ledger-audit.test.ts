import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FixedClock,
  FileArtifactStore,
  ForecastLedger,
  signChainHead,
  verifyChainHeadReceipt,
} from '../src/index.js';

const actor = { id: 'conformance-runner', role: 'service' } as const;

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
    });
    clock.set(new Date('2026-07-28T11:59:59.000Z'));
    await assert.rejects(
      ledger.appendRecord({
        actor,
        kind: 'conformance.recorded',
        recordType: 'conformance-record',
        record: { id: 'backdated' },
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

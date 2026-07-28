import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FileArtifactStore,
  FixedClock,
  ForecastWorkbench,
  acquireFile,
  acquireHttp,
  exportAuditBundle,
  hardenedFetch,
  sha256Id,
  type FetchRuntime,
  type SanitizedRequestEnvelope,
} from '../src/index.js';

const SECRET = 'canary-super-secret-api-key';

const envelope: SanitizedRequestEnvelope = {
  schemaVersion: 'forecast-workbench.sanitized-request/v1',
  uri: 'https://api.example.test/data',
  method: 'GET',
  publicQuery: { series: 'x' },
  publicHeaders: { accept: 'application/json' },
  credentialBindings: [{
    location: 'query',
    name: 'api_key',
    ref: 'example.default',
  }],
  allowedHosts: ['api.example.test'],
  timeoutMs: 5_000,
  maxBytes: 1_024,
  maxRedirects: 1,
};

async function treeText(path: string): Promise<string> {
  const entries = await readdir(path, { withFileTypes: true });
  let output = '';
  for (const entry of entries) {
    const child = join(path, entry.name);
    output += entry.isDirectory()
      ? await treeText(child)
      : (await readFile(child)).toString('utf8');
  }
  return output;
}

test('query credentials exist on the wire but never in persisted acquisition artifacts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-acquisition-'));
  try {
    const seen: string[] = [];
    const runtime: FetchRuntime = {
      resolveHost: async () => ['203.0.113.10'],
      fetch: async (input) => {
        seen.push(String(input));
        return new Response('{"value":1}', {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'content-location': `https://api.example.test/data?api_key=${SECRET}`,
          },
        });
      },
    };
    const store = new FileArtifactStore(root);
    const result = await acquireHttp({
      store,
      clock: new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
      sourceId: 'example',
      connectorId: 'example',
      connectorVersion: '1',
      envelope,
      credentialProvider: async () => SECRET,
      classification: 'internal',
      asOfAssurance: 'capture-cutoff',
      auditHmacKey: 'audit-key',
      runtime,
    });
    assert.equal(seen.length, 1);
    assert.match(seen[0], new RegExp(SECRET));
    assert.doesNotMatch(result.metadata.finalUrl, new RegExp(SECRET));
    assert.doesNotMatch(
      result.metadata.responseHeaders['content-location'] ?? '',
      new RegExp(SECRET),
    );
    assert.ok(result.receipt.wireRequestHmac);
    assert.doesNotMatch(await treeText(root), new RegExp(SECRET));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('errors and redirects scrub canary secrets', async () => {
  const runtime: FetchRuntime = {
    resolveHost: async () => ['203.0.113.10'],
    fetch: async () => new Response(null, {
      status: 302,
      headers: {
        location: `https://not-allowed.example/leak?api_key=${SECRET}`,
      },
    }),
  };
  await assert.rejects(
    hardenedFetch({
      envelope,
      credentialProvider: async () => SECRET,
      runtime,
    }),
    (error: Error) => {
      assert.doesNotMatch(error.message, new RegExp(SECRET));
      assert.match(error.message, /not allowlisted/);
      return true;
    },
  );
});

test('responses that echo credentials are rejected before persistence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-credential-echo-'));
  try {
    const store = new FileArtifactStore(root);
    const runtime: FetchRuntime = {
      resolveHost: async () => ['203.0.113.10'],
      fetch: async () =>
        new Response(JSON.stringify({ echoedApiKey: SECRET }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    };
    await assert.rejects(
      acquireHttp({
        store,
        clock: new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
        sourceId: 'example',
        connectorId: 'example',
        connectorVersion: '1',
        envelope,
        credentialProvider: async () => SECRET,
        classification: 'internal',
        asOfAssurance: 'capture-cutoff',
        runtime,
      }),
      /contains credential material/,
    );
    assert.doesNotMatch(await treeText(root), new RegExp(SECRET));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('private-network DNS results are rejected before any request is sent', async () => {
  for (const address of [
    '127.0.0.1',
    '169.254.169.254',
    '10.0.0.1',
    '::1',
    '::ffff:172.16.0.1',
  ]) {
    let fetched = false;
    await assert.rejects(
      hardenedFetch({
        envelope,
        credentialProvider: async () => SECRET,
        runtime: {
          resolveHost: async () => [address],
          fetch: async () => {
            fetched = true;
            return new Response('{}');
          },
        },
      }),
      /private-network/,
    );
    assert.equal(fetched, false);
  }
});

test('credentials are stripped from an allowlisted cross-origin redirect', async () => {
  const requests: string[] = [];
  const redirectedEnvelope: SanitizedRequestEnvelope = {
    ...envelope,
    allowedHosts: ['api.example.test', 'download.example.test'],
  };
  const runtime: FetchRuntime = {
    resolveHost: async () => ['203.0.113.10'],
    fetch: async (input) => {
      requests.push(String(input));
      if (requests.length === 1) {
        return new Response(null, {
          status: 302,
          headers: {
            location: 'https://download.example.test/file.json',
          },
        });
      }
      return new Response('{"value":1}', { status: 200 });
    },
  };
  await hardenedFetch({
    envelope: redirectedEnvelope,
    credentialProvider: async () => SECRET,
    runtime,
  });
  assert.equal(requests.length, 2);
  assert.match(requests[0], new RegExp(SECRET));
  assert.doesNotMatch(requests[1], new RegExp(SECRET));
});

test('response size limits are enforced while streaming', async () => {
  const runtime: FetchRuntime = {
    resolveHost: async () => ['203.0.113.10'],
    fetch: async () => new Response('x'.repeat(2_000), { status: 200 }),
  };
  await assert.rejects(
    hardenedFetch({
      envelope,
      credentialProvider: async () => SECRET,
      runtime,
    }),
    /exceeds 1024 bytes/,
  );
});

test('local and subscription files are root-confined, hashed, and access-controlled', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'forecast-file-acquisition-'));
  const allowed = join(temporary, 'allowed');
  const ledgerRoot = join(temporary, 'ledger');
  const auditRoot = join(temporary, 'audit');
  const sourcePath = join(allowed, 'licensed-report.csv');
  const outsidePath = join(temporary, 'outside.csv');
  await mkdir(allowed);
  await writeFile(sourcePath, 'date,value\n2026-01-01,42\n');
  await writeFile(outsidePath, 'private\n');
  const clock = new FixedClock(new Date('2026-07-28T12:00:00.000Z'));
  const workbench = new ForecastWorkbench(ledgerRoot, clock);
  await workbench.initialize();
  try {
    const bytes = new Uint8Array(await readFile(sourcePath));
    const acquired = await acquireFile({
      store: workbench.ledger.artifacts,
      clock,
      sourceId: 'subscription.example',
      connectorId: 'subscription-file',
      connectorVersion: '1.0.0',
      path: sourcePath,
      allowedRoots: [allowed],
      logicalUri: 'subscription://vendor/report/2026-07',
      maxBytes: 1_024,
      expectedArtifactId: sha256Id(bytes),
      classification: 'restricted',
      license: 'Single-seat research subscription',
      accessPolicy: 'Do not redistribute raw vendor document.',
      sourceEffectiveVintage: '2026-07-28T00:00:00.000Z',
      asOfAssurance: 'release-archive',
      schema: { format: 'csv', columns: ['date', 'value'] },
    });
    assert.equal(acquired.receipt.classification, 'restricted');
    assert.equal(acquired.receipt.license, 'Single-seat research subscription');
    assert.equal(acquired.receipt.rawArtifactId, sha256Id(bytes));
    await workbench.recordAcquisition(
      { id: 'file-runner', role: 'service' },
      acquired.receipt,
    );
    const persistedRequest = await workbench.ledger.artifacts.getText(
      acquired.receipt.sanitizedRequestArtifactId,
    );
    assert.doesNotMatch(persistedRequest, new RegExp(sourcePath));
    assert.match(persistedRequest, /subscription:\/\/vendor\/report\/2026-07/);

    const manifest = await exportAuditBundle({
      ledger: workbench.ledger,
      clock,
      destination: auditRoot,
    });
    const rawEntry = manifest.artifacts.find(
      ({ id }) => id === acquired.receipt.rawArtifactId,
    );
    assert.equal(rawEntry?.included, false);
    assert.equal(rawEntry?.restriction, 'Do not redistribute raw vendor document.');
    assert.equal(manifest.verification, 'incomplete-restricted-artifacts');
    await assert.rejects(
      exportAuditBundle({
        ledger: workbench.ledger,
        clock,
        destination: auditRoot,
        includeRestricted: true,
      }),
      /must be empty/,
    );

    await assert.rejects(
      acquireFile({
        store: workbench.ledger.artifacts,
        clock,
        sourceId: 'subscription.example',
        connectorId: 'subscription-file',
        connectorVersion: '1.0.0',
        path: outsidePath,
        allowedRoots: [allowed],
        logicalUri: 'subscription://vendor/outside',
        maxBytes: 1_024,
        classification: 'restricted',
        asOfAssurance: 'release-archive',
      }),
      /outside the allowed roots/,
    );
  } finally {
    workbench.close();
    await rm(temporary, { recursive: true, force: true });
  }
});

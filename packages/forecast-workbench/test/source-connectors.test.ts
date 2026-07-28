import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FileArtifactStore,
  FixedClock,
  ForecastWorkbench,
  acquireHttp,
  assuranceForProfile,
  beaConnector,
  captureHttpSource,
  eiaConnector,
  fredConnector,
  publicDataConnectorCatalog,
  type Actor,
  type FetchRuntime,
  type ObservationKey,
} from '../src/index.js';

const SECRET = 'connector-canary-api-secret';
const service: Actor = { id: 'connector-runner', role: 'service' };

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

test('the zero-cost connector catalog covers the promised official sources', () => {
  const connectors = publicDataConnectorCatalog({
    monitoringStartedAt: '2026-07-28T00:00:00.000Z',
    secUserAgent: 'Forecast Workbench test@example.com',
  });
  assert.deepEqual(
    connectors.map(({ sourceId }) => sourceId),
    [
      'bea.data-api',
      'eia.api-v2',
      'census.data-api',
      'sec.edgar-submissions',
      'fred.alfred',
      'eurostat.statistics',
      'oecd.sdmx',
      'world-bank.indicators',
      'cdc.socrata',
      'noaa.ncei-cdo',
      'lbnl.queued-up',
    ],
  );
  assert.equal(
    connectors.find(({ sourceId }) => sourceId === 'fred.alfred')?.vintage.capability,
    'true-vintage',
  );
  assert.equal(
    connectors.find(({ sourceId }) => sourceId === 'eurostat.statistics')
      ?.vintage.capability,
    'current-only',
  );
  assert.equal(
    connectors.find(({ sourceId }) => sourceId === 'lbnl.queued-up')
      ?.vintage.capability,
    'release-pinned',
  );
});

test('FRED capture records an as-of release and normalized row lineage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-fred-capture-'));
  const clock = new FixedClock(new Date('2026-07-28T12:00:00.000Z'));
  const workbench = new ForecastWorkbench(root, clock);
  await workbench.initialize();
  const seen: string[] = [];
  const runtime: FetchRuntime = {
    resolveHost: async () => ['203.0.113.20'],
    fetch: async (input) => {
      seen.push(String(input));
      return new Response(JSON.stringify({
        realtime_start: '2026-06-01',
        realtime_end: '2026-06-01',
        observations: [{
          realtime_start: '2026-06-01',
          realtime_end: '2026-06-01',
          date: '2026-01-01',
          value: '123.4',
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  };
  try {
    const connector = fredConnector();
    const result = await captureHttpSource({
      workbench,
      actor: service,
      connector,
      query: {
        seriesId: 'TEST',
        asOf: '2026-06-01T23:59:59.000Z',
      },
      credentialProvider: async () => SECRET,
      classification: 'public',
      auditHmacKey: 'fixture-audit-key',
      runtime,
      normalize: (parsed: any) => ({
        datasetId: 'fred.TEST',
        publicationTimeBasis: 'source',
        sourceVersion: `${parsed.realtime_start}/${parsed.realtime_end}`,
        rows: parsed.observations.map((row: any) => ({
          key: {
            schemaVersion: 'forecast-workbench.observation-key/v1',
            datasetId: 'fred.TEST',
            seriesId: 'TEST',
            geography: 'US',
            frequency: 'monthly',
            validPeriod: row.date,
            measure: 'index',
          } satisfies ObservationKey,
          value: Number(row.value),
          sourceRowLocator: `observations[date=${row.date}]`,
          firstReleaseBasis: 'source-declared',
        })),
      }),
    });
    assert.equal(seen.length, 1);
    assert.match(seen[0], /realtime_start=2026-06-01/);
    assert.match(seen[0], new RegExp(SECRET));
    assert.equal(result.receipt.asOfAssurance, 'source-enforced');
    assert.equal(result.observationVersions[0].value, 123.4);
    assert.equal(result.observationVersions[0].status, 'new');
    assert.equal(workbench.ledger.listRecordIds('acquisition-receipt').length, 1);
    assert.equal(workbench.ledger.listRecordIds('source-release').length, 1);
    assert.equal(workbench.ledger.listRecordIds('observation-version').length, 1);
    assert.doesNotMatch(await treeText(root), new RegExp(SECRET));
  } finally {
    workbench.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('actual FRED, EIA, and BEA profiles never persist query credentials', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-real-connectors-'));
  const store = new FileArtifactStore(root);
  const clock = new FixedClock(new Date('2026-07-28T12:00:00.000Z'));
  const seen: string[] = [];
  const runtime: FetchRuntime = {
    resolveHost: async () => ['203.0.113.30'],
    fetch: async (input) => {
      seen.push(String(input));
      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  };
  const connectors = [
    {
      connector: fredConnector(),
      query: { seriesId: 'GDP', asOf: '2026-07-01T00:00:00.000Z' },
    },
    {
      connector: eiaConnector({
        monitoringStartedAt: '2026-07-01T00:00:00.000Z',
      }),
      query: { route: 'electricity/rto/region-data/data' },
    },
    {
      connector: beaConnector({
        monitoringStartedAt: '2026-07-01T00:00:00.000Z',
      }),
      query: { method: 'GETDATASETLIST' },
    },
  ] as const;
  try {
    for (const item of connectors) {
      const built = item.connector.buildRequest(item.query as never);
      await acquireHttp({
        store,
        clock,
        sourceId: item.connector.sourceId,
        connectorId: item.connector.id,
        connectorVersion: item.connector.version,
        envelope: built.envelope,
        credentialProvider: async () => SECRET,
        classification: 'internal',
        requestedAsOf: built.requestedAsOf,
        sourceEffectiveVintage: built.sourceEffectiveVintage,
        asOfAssurance: assuranceForProfile(
          item.connector.vintage,
          built.requestedAsOf,
        ),
        runtime,
      });
    }
    assert.equal(seen.length, 3);
    seen.forEach((request) => assert.match(request, new RegExp(SECRET)));
    assert.doesNotMatch(await treeText(root), new RegExp(SECRET));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('current-only connectors reject historical as-of requests predating monitoring', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forecast-current-only-'));
  const workbench = new ForecastWorkbench(
    root,
    new FixedClock(new Date('2026-07-28T12:00:00.000Z')),
  );
  await workbench.initialize();
  let fetched = false;
  try {
    await assert.rejects(
      captureHttpSource({
        workbench,
        actor: service,
        connector: eiaConnector({
          monitoringStartedAt: '2026-07-28T00:00:00.000Z',
        }),
        query: {
          route: 'electricity/rto/region-data/data',
          requestedAsOf: '2026-07-01T00:00:00.000Z',
        },
        credentialProvider: async () => SECRET,
        runtime: {
          resolveHost: async () => ['203.0.113.40'],
          fetch: async () => {
            fetched = true;
            return new Response('{}');
          },
        },
        normalize: () => ({
          datasetId: 'never',
          publicationTimeBasis: 'retrieval',
          rows: [],
        }),
      }),
      /cannot satisfy the requested as-of time/,
    );
    assert.equal(fetched, false);
  } finally {
    workbench.close();
    await rm(root, { recursive: true, force: true });
  }
});

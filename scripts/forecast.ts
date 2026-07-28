import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  ForecastLedger,
  SystemClock,
  exportAuditBundle,
  publicDataConnectorCatalog,
  signChainHead,
  verifyChainHeadReceipt,
  type ChainHeadReceipt,
  type MonitorCheck,
  type TriggerDefinition,
} from 'forecast-workbench';
import { runDailyNews20260728Replay } from '../src/forecasting/news/2026-07-28/replay.js';
import { runDataCenter2035Replay } from '../src/forecasting/questions/data-center-2035/replay.js';
import { runHormuz2026Replay } from '../src/forecasting/questions/hormuz-2026/replay.js';
import { runOutbreak2026Replay } from '../src/forecasting/questions/outbreak-2026/replay.js';
import {
  defaultRefreshRoot,
  runForecastRefresh,
  type RefreshPilot,
} from '../src/forecasting/refresh/index.js';

const HELP = `forecast-workbench operator CLI

Usage:
  npm run forecast -- verify --root=<ledger>
  npm run forecast -- list --root=<ledger> [--type=<record-type>]
  npm run forecast -- show --root=<ledger> --id=<sha256:...>
  npm run forecast -- export --root=<ledger> --destination=<directory>
      [--include-restricted]
  npm run forecast -- monitor-status --root=<ledger>
  npm run forecast -- source-catalog
      [--monitoring-started-at=<ISO>] [--sec-user-agent=<value>]
  npm run forecast -- replay <outbreak|data-center|hormuz|news>
      [--root=<ledger>] [--audit=<directory>]
      [--synthetic-resolution=<number>]
  npm run forecast -- refresh <outbreak|data-center|hormuz|all>
      [--root=<ledger>] [--env-file=<local env file>]
  npm run forecast -- sign-receipt --root=<ledger>
      --private-key=<PEM file> --public-key-id=<id> --issuer=<name>
      --output=<JSON file> [--external-anchor=<value>]
  npm run forecast -- verify-receipt
      --receipt=<JSON file> --public-key=<PEM file>
`;

const arguments_ = process.argv.slice(2);
const command = arguments_.find((value) => !value.startsWith('--')) ?? 'help';
const positionals = arguments_.filter((value) => !value.startsWith('--')).slice(1);

function option(name: string): string | undefined {
  const prefix = `--${name}=`;
  return arguments_.find((value) => value.startsWith(prefix))?.slice(
    prefix.length,
  );
}

function flag(name: string): boolean {
  return arguments_.includes(`--${name}`);
}

function requiredOption(name: string): string {
  const value = option(name);
  if (!value?.trim()) throw new Error(`Missing required --${name}=...`);
  return value;
}

function requiredRoot(): string {
  return resolve(requiredOption('root'));
}

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function withLedger<T>(
  root: string,
  operation: (ledger: ForecastLedger, clock: SystemClock) => Promise<T>,
): Promise<T> {
  const clock = new SystemClock();
  const ledger = new ForecastLedger(root, clock);
  await ledger.initialize();
  try {
    return await operation(ledger, clock);
  } finally {
    ledger.close();
  }
}

async function verifyLedger(): Promise<void> {
  const root = requiredRoot();
  const result = await withLedger(root, async (ledger) => ledger.verify());
  print({ root, ...result, status: 'verified' });
}

async function listLedger(): Promise<void> {
  const root = requiredRoot();
  const recordType = option('type');
  const records = await withLedger(root, async (ledger) => {
    const rows = ledger.listRecords().filter(
      (row) => !recordType || row.recordType === recordType,
    );
    return Promise.all(rows.map(async (row) => {
      const record = await ledger.getRecord<any>(row.id);
      return {
        ...row,
        ...(typeof record.id === 'string' ? { logicalId: record.id } : {}),
        ...(typeof record.title === 'string' ? { title: record.title } : {}),
        ...(typeof record.status === 'string' ? { status: record.status } : {}),
        ...(typeof record.questionId === 'string'
          ? { questionId: record.questionId }
          : {}),
        ...(typeof record.sealedAt === 'string'
          ? { sealedAt: record.sealedAt }
          : {}),
      };
    }));
  });
  print({ root, recordType: recordType ?? 'all', count: records.length, records });
}

async function showRecord(): Promise<void> {
  const root = requiredRoot();
  const id = option('id') ?? positionals[0];
  if (!id) throw new Error('show requires --id=<sha256:...>');
  const value = await withLedger(root, async (ledger) => {
    const row = ledger.listRecords().find((candidate) => candidate.id === id);
    if (!row) throw new Error(`Unknown ledger record '${id}'`);
    return {
      metadata: row,
      record: await ledger.getRecord(id),
    };
  });
  print({ root, ...value });
}

async function exportLedger(): Promise<void> {
  const root = requiredRoot();
  const destination = resolve(requiredOption('destination'));
  const manifest = await withLedger(root, async (ledger, clock) =>
    exportAuditBundle({
      ledger,
      clock,
      destination,
      includeRestricted: flag('include-restricted'),
    })
  );
  print({ root, destination, manifest });
}

async function monitorStatus(): Promise<void> {
  const root = requiredRoot();
  const status = await withLedger(root, async (ledger) => {
    const triggers = await Promise.all(
      ledger.listRecordIds('trigger').map((id) =>
        ledger.getRecord<TriggerDefinition>(id).then((trigger) => ({
          recordId: id,
          trigger,
        }))
      ),
    );
    const checks = await Promise.all(
      ledger.listRecordIds('monitor-check').map((id) =>
        ledger.getRecord<MonitorCheck>(id).then((check) => ({
          recordId: id,
          check,
        }))
      ),
    );
    return triggers.map(({ recordId, trigger }) => {
      const matching = checks.filter(
        ({ check }) => check.triggerId === trigger.id,
      );
      const latest = matching.at(-1);
      return {
        recordId,
        id: trigger.id,
        version: trigger.version,
        schedule: trigger.schedule,
        sourceProfileId: trigger.sourceProfileId,
        notificationPolicy: trigger.notificationPolicy,
        checks: matching.length,
        matches: matching.filter(({ check }) => check.matched).length,
        ...(latest
          ? {
              latest: {
                recordId: latest.recordId,
                checkedAt: latest.check.checkedAt,
                matched: latest.check.matched,
                materialChange: latest.check.materialChange,
              },
            }
          : {}),
      };
    });
  });
  print({ root, triggers: status.length, status });
}

function sourceCatalog(): void {
  const monitoringStartedAt =
    option('monitoring-started-at') ?? new Date().toISOString();
  const secUserAgent =
    option('sec-user-agent') ??
    'Forecast Workbench catalog-only catalog@example.invalid';
  const catalog = publicDataConnectorCatalog({
    monitoringStartedAt,
    secUserAgent,
  }).map((connector) => ({
    id: connector.id,
    version: connector.version,
    sourceId: connector.sourceId,
    documentationUrl: connector.documentationUrl,
    vintage: connector.vintage,
  }));
  print({
    monitoringStartedAt,
    secUserAgentConfigured: Boolean(option('sec-user-agent')),
    warning:
      'Set a real SEC-compliant user agent before making EDGAR requests.',
    connectors: catalog,
  });
}

async function replayPilot(): Promise<void> {
  const pilot = positionals[0];
  if (!pilot) {
    throw new Error(
      'replay requires outbreak, data-center, hormuz, or news',
    );
  }
  const defaultRoot = `var/forecast-workbench/${
    pilot === 'news' ? 'news-2026-07-28' :
    pilot === 'data-center' ? 'data-center-2035' :
    pilot === 'hormuz' ? 'hormuz-2026' :
    pilot === 'outbreak' ? 'outbreak-2026' :
    pilot
  }`;
  const root = resolve(option('root') ?? defaultRoot);
  const auditDestination = option('audit')
    ? resolve(option('audit') as string)
    : undefined;
  if (pilot === 'outbreak') {
    const synthetic = option('synthetic-resolution');
    const syntheticResolutionValue =
      synthetic === undefined ? undefined : Number(synthetic);
    if (
      syntheticResolutionValue !== undefined &&
      !Number.isFinite(syntheticResolutionValue)
    ) {
      throw new Error('--synthetic-resolution must be a finite number');
    }
    print({
      root,
      ...(auditDestination ? { auditDestination } : {}),
      ...await runOutbreak2026Replay({
        root,
        ...(auditDestination ? { auditDestination } : {}),
        ...(syntheticResolutionValue !== undefined
          ? { syntheticResolutionValue }
          : {}),
      }),
    });
    return;
  }
  if (pilot === 'data-center') {
    print({
      root,
      ...(auditDestination ? { auditDestination } : {}),
      ...await runDataCenter2035Replay({
        root,
        ...(auditDestination ? { auditDestination } : {}),
      }),
    });
    return;
  }
  if (pilot === 'hormuz') {
    print({
      root,
      ...(auditDestination ? { auditDestination } : {}),
      ...await runHormuz2026Replay({
        root,
        ...(auditDestination ? { auditDestination } : {}),
      }),
    });
    return;
  }
  if (pilot === 'news') {
    print({
      root,
      ...(auditDestination ? { auditDestination } : {}),
      ...await runDailyNews20260728Replay({
        root,
        ...(auditDestination ? { auditDestination } : {}),
      }),
    });
    return;
  }
  throw new Error(`Unknown replay pilot '${pilot}'`);
}

async function refreshPilot(): Promise<void> {
  const requested = positionals[0];
  if (
    requested !== 'outbreak' &&
    requested !== 'data-center' &&
    requested !== 'hormuz' &&
    requested !== 'all'
  ) {
    throw new Error(
      'refresh requires outbreak, data-center, hormuz, or all',
    );
  }
  if (requested === 'all' && option('root')) {
    throw new Error(
      'refresh all uses one default ledger per pilot; --root is only valid for a single pilot',
    );
  }
  const pilots: RefreshPilot[] =
    requested === 'all'
      ? ['outbreak', 'data-center', 'hormuz']
      : [requested];
  const results = [];
  for (const pilot of pilots) {
    results.push(await runForecastRefresh({
      pilot,
      root: option('root')
        ? resolve(option('root') as string)
        : defaultRefreshRoot(pilot),
      ...(option('env-file')
        ? { envFile: resolve(option('env-file') as string) }
        : {}),
    }));
  }
  print(requested === 'all' ? { refreshed: results } : results[0]);
}

async function signReceipt(): Promise<void> {
  const root = requiredRoot();
  const privateKeyPath = resolve(requiredOption('private-key'));
  const output = resolve(requiredOption('output'));
  const privateKeyPem = await readFile(privateKeyPath, 'utf8');
  const receipt = await withLedger(root, async (ledger, clock) =>
    signChainHead({
      ledger,
      clock,
      issuer: requiredOption('issuer'),
      privateKeyPem,
      publicKeyId: requiredOption('public-key-id'),
      ...(option('external-anchor')
        ? { externalAnchor: option('external-anchor') as string }
        : {}),
    })
  );
  await mkdir(dirname(output), { recursive: true, mode: 0o700 });
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, {
    mode: 0o600,
  });
  print({
    root,
    output,
    chainHead: receipt.chainHead,
    eventSequence: receipt.eventSequence,
    publicKeyId: receipt.publicKeyId,
  });
}

async function verifyReceipt(): Promise<void> {
  const receiptPath = resolve(requiredOption('receipt'));
  const publicKeyPath = resolve(requiredOption('public-key'));
  const receipt = JSON.parse(
    await readFile(receiptPath, 'utf8'),
  ) as ChainHeadReceipt;
  const verified = verifyChainHeadReceipt(
    receipt,
    await readFile(publicKeyPath, 'utf8'),
  );
  print({
    receipt: receiptPath,
    publicKey: publicKeyPath,
    chainHead: receipt.chainHead,
    eventSequence: receipt.eventSequence,
    verified,
  });
  if (!verified) process.exitCode = 1;
}

async function main(): Promise<void> {
  if (command === 'help' || command === '--help' || flag('help')) {
    console.log(HELP);
  } else if (command === 'verify') {
    await verifyLedger();
  } else if (command === 'list') {
    await listLedger();
  } else if (command === 'show') {
    await showRecord();
  } else if (command === 'export') {
    await exportLedger();
  } else if (command === 'monitor-status') {
    await monitorStatus();
  } else if (command === 'source-catalog') {
    sourceCatalog();
  } else if (command === 'replay') {
    await replayPilot();
  } else if (command === 'refresh') {
    await refreshPilot();
  } else if (command === 'sign-receipt') {
    await signReceipt();
  } else if (command === 'verify-receipt') {
    await verifyReceipt();
  } else {
    throw new Error(`Unknown command '${command}'\n\n${HELP}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

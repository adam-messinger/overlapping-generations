import {
  mkdir,
  open,
  readFile,
  stat,
  unlink,
  type FileHandle,
} from 'node:fs/promises';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import {
  canonicalJson,
  canonicalParse,
  requireIsoTimestamp,
  requireText,
  sha256Id,
  type Clock,
} from './canonical.js';
import type { Actor, DataClassification } from './contracts.js';
import { FileArtifactStore, type StoredArtifact } from './artifact-store.js';

export interface EventEnvelope {
  schemaVersion: 'forecast-workbench.event/v1' | 'forecast-workbench.event/v2';
  sequence: number;
  eventId: string;
  occurredAt: string;
  actor: Actor;
  kind: string;
  recordType: string;
  recordArtifactId: string;
  /**
   * Absent on v1 events, which had no way to carry it. A v1 record's
   * classification is unrecoverable — `appendRecord` forwarded it only to
   * `putCanonical`, whose copy was never persisted — so readers must treat
   * "absent" as unknown rather than as any particular level.
   */
  classification?: DataClassification;
  previousEventHash?: string;
  eventHash: string;
}

export interface RecordReference {
  id: string;
  recordType: string;
  artifact: StoredArtifact;
  event: EventEnvelope;
}

export type ProjectionValidator = (database: Database.Database) => void;

interface StoredEventRow {
  sequence: number;
  event_id: string;
  occurred_at: string;
  actor_id: string;
  actor_role: string;
  kind: string;
  record_type: string;
  record_artifact_id: string;
  previous_event_hash: string | null;
  event_hash: string;
  schema_version: string;
  classification: string | null;
}

/** Bumped whenever the SQLite projection's shape changes. */
const PROJECTION_VERSION = 2;

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS events (
    sequence INTEGER PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    occurred_at TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    kind TEXT NOT NULL,
    record_type TEXT NOT NULL,
    record_artifact_id TEXT NOT NULL,
    previous_event_hash TEXT,
    event_hash TEXT NOT NULL UNIQUE,
    schema_version TEXT NOT NULL,
    classification TEXT
  );

  CREATE TABLE IF NOT EXISTS records (
    record_artifact_id TEXT PRIMARY KEY,
    record_type TEXT NOT NULL,
    first_event_sequence INTEGER NOT NULL REFERENCES events(sequence),
    -- NULL means "not recorded", which only pre-v2 events produce. Readers
    -- that gate on classification must fail closed on NULL.
    classification TEXT
  );

  CREATE TABLE IF NOT EXISTS questions (
    question_hash TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    question_version TEXT NOT NULL,
    record_artifact_id TEXT NOT NULL REFERENCES records(record_artifact_id),
    opens_at TEXT NOT NULL,
    closes_at TEXT NOT NULL,
    first_forecast_id TEXT,
    UNIQUE(question_id, question_version)
  );

  CREATE TABLE IF NOT EXISTS preflights (
    record_artifact_id TEXT PRIMARY KEY REFERENCES records(record_artifact_id),
    question_hash TEXT NOT NULL REFERENCES questions(question_hash),
    checked_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS evidence_packets (
    record_artifact_id TEXT PRIMARY KEY REFERENCES records(record_artifact_id),
    logical_id TEXT NOT NULL UNIQUE,
    view_artifact_id TEXT NOT NULL,
    -- Copied from the packet body, and duplicated by records.classification
    -- since the envelope started carrying it. records.classification is the
    -- authority; readers should prefer it and this column should go.
    classification TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS forecast_series_state (
    question_hash TEXT NOT NULL REFERENCES questions(question_hash),
    forecaster_id TEXT NOT NULL,
    series_id TEXT NOT NULL,
    forecast_required INTEGER NOT NULL DEFAULT 1,
    last_forecast_id TEXT,
    last_exposure_id TEXT,
    PRIMARY KEY(question_hash, forecaster_id, series_id)
  );

  CREATE TABLE IF NOT EXISTS forecasts (
    record_artifact_id TEXT PRIMARY KEY REFERENCES records(record_artifact_id),
    question_hash TEXT NOT NULL REFERENCES questions(question_hash),
    forecaster_id TEXT NOT NULL,
    series_id TEXT NOT NULL,
    sealed_at TEXT NOT NULL,
    information_set_artifact_id TEXT NOT NULL,
    supersedes_forecast_id TEXT
  );

  CREATE TABLE IF NOT EXISTS evidence_exposures (
    record_artifact_id TEXT PRIMARY KEY REFERENCES records(record_artifact_id),
    question_hash TEXT NOT NULL REFERENCES questions(question_hash),
    forecaster_id TEXT NOT NULL,
    series_id TEXT NOT NULL,
    packet_id TEXT NOT NULL,
    exposed_at TEXT NOT NULL,
    forecast_id_before_exposure TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS model_forecasts (
    record_artifact_id TEXT PRIMARY KEY REFERENCES records(record_artifact_id),
    logical_id TEXT NOT NULL UNIQUE,
    question_hash TEXT NOT NULL REFERENCES questions(question_hash),
    run_manifest_artifact_id TEXT NOT NULL,
    identified INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resolutions (
    record_artifact_id TEXT PRIMARY KEY REFERENCES records(record_artifact_id),
    question_hash TEXT NOT NULL REFERENCES questions(question_hash),
    status TEXT NOT NULL,
    resolved_at TEXT NOT NULL,
    supersedes_resolution_id TEXT
  );

  CREATE TABLE IF NOT EXISTS scores (
    record_artifact_id TEXT PRIMARY KEY REFERENCES records(record_artifact_id),
    question_hash TEXT NOT NULL REFERENCES questions(question_hash),
    forecast_id TEXT NOT NULL,
    resolution_id TEXT NOT NULL,
    scored_at TEXT NOT NULL
  );

  CREATE TRIGGER IF NOT EXISTS events_no_update
  BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT, 'events are append-only'); END;
  CREATE TRIGGER IF NOT EXISTS events_no_delete
  BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT, 'events are append-only'); END;
  CREATE TRIGGER IF NOT EXISTS records_no_update
  BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT, 'records are append-only'); END;
  CREATE TRIGGER IF NOT EXISTS records_no_delete
  BEFORE DELETE ON records BEGIN SELECT RAISE(ABORT, 'records are append-only'); END;

  PRAGMA user_version = ${PROJECTION_VERSION};
`;

function eventPayload(
  event: Omit<EventEnvelope, 'eventId' | 'eventHash'>,
): Omit<EventEnvelope, 'eventId' | 'eventHash'> {
  return event;
}

function sealEvent(
  event: Omit<EventEnvelope, 'eventId' | 'eventHash'>,
): EventEnvelope {
  const eventHash = sha256Id(canonicalJson(eventPayload(event)));
  return {
    ...event,
    eventId: `event:${eventHash}`,
    eventHash,
  };
}

function validateEvent(
  event: EventEnvelope,
  expectedPrevious?: string,
  previousOccurredAt?: string,
): void {
  if (
    event.schemaVersion !== 'forecast-workbench.event/v1' &&
    event.schemaVersion !== 'forecast-workbench.event/v2'
  ) {
    throw new Error(`Unsupported event schema '${String(event.schemaVersion)}'`);
  }
  if (event.schemaVersion === 'forecast-workbench.event/v1' &&
      event.classification !== undefined) {
    throw new Error(`Event ${event.sequence} declares a classification under v1`);
  }
  if (!Number.isInteger(event.sequence) || event.sequence < 1) {
    throw new Error('Event sequence must be a positive integer');
  }
  requireIsoTimestamp(event.occurredAt, 'event.occurredAt');
  if (
    previousOccurredAt &&
    Date.parse(event.occurredAt) < Date.parse(previousOccurredAt)
  ) {
    throw new Error(
      `Event ${event.sequence} occurred before the preceding event`,
    );
  }
  requireText(event.actor.id, 'event.actor.id');
  requireText(event.actor.role, 'event.actor.role');
  if (
    ![
      'designer',
      'forecaster',
      'resolver',
      'administrator',
      'service',
    ].includes(event.actor.role)
  ) {
    throw new Error(`Event ${event.sequence} has an invalid actor role`);
  }
  requireText(event.kind, 'event.kind');
  requireText(event.recordType, 'event.recordType');
  requireText(event.recordArtifactId, 'event.recordArtifactId');
  if (event.previousEventHash !== expectedPrevious) {
    throw new Error(
      `Event ${event.sequence} previous hash mismatch: expected ` +
      `${expectedPrevious ?? '<none>'}, found ${event.previousEventHash ?? '<none>'}`,
    );
  }
  const { eventId: _eventId, eventHash: _eventHash, ...unsealed } = event;
  const expectedHash = sha256Id(canonicalJson(unsealed));
  if (event.eventHash !== expectedHash || event.eventId !== `event:${expectedHash}`) {
    throw new Error(`Event ${event.sequence} integrity failure`);
  }
}

export class ForecastLedger {
  readonly artifacts: FileArtifactStore;
  readonly eventLogPath: string;
  readonly databasePath: string;
  readonly appendLockPath: string;
  private database?: Database.Database;
  private appendTail: Promise<void> = Promise.resolve();

  constructor(
    readonly root: string,
    readonly clock: Clock,
  ) {
    this.artifacts = new FileArtifactStore(join(root, 'artifacts'));
    this.eventLogPath = join(root, 'events.jsonl');
    this.databasePath = join(root, 'index.sqlite');
    this.appendLockPath = join(root, '.append.lock');
  }

  async initialize(): Promise<void> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    await this.artifacts.initialize();
    if (!this.database) {
      await this.discardOutdatedProjection();
      const database = new Database(this.databasePath);
      try {
        database.exec(SCHEMA);
      } catch (error) {
        database.close();
        throw error;
      }
      // Published only once the schema is in place. Assigning earlier would
      // let a failed setup — a transient SQLITE_BUSY, say — leave a handle
      // that every later initialize() skips past, wedging the instance on a
      // shape the code no longer expects until the process restarts.
      this.database = database;
    }
    await this.synchronizeProjection();
  }

  /**
   * The projection is derived state, so a stale one is deleted and rebuilt
   * from the canonical log rather than altered in place. `records` and
   * `events` carry append-only triggers that `RAISE(ABORT)` on UPDATE, so an
   * `ALTER TABLE ... ADD COLUMN` could never be backfilled afterwards.
   *
   * Deleting the files reuses the rebuild `synchronizeProjection` already
   * performs — the same path `initialize` takes when the index is missing
   * entirely — instead of enumerating tables to drop, which would silently
   * miss any index or view the schema grows later.
   */
  private async discardOutdatedProjection(): Promise<void> {
    let version: number;
    const probe = new Database(this.databasePath);
    try {
      version = (probe.prepare('PRAGMA user_version').get() as {
        user_version: number;
      }).user_version;
    } finally {
      probe.close();
    }
    // 0 is a projection that has never been written, which needs no rebuild.
    if (version === 0 || version >= PROJECTION_VERSION) return;
    await Promise.all([
      unlink(this.databasePath).catch(() => undefined),
      unlink(`${this.databasePath}-wal`).catch(() => undefined),
      unlink(`${this.databasePath}-shm`).catch(() => undefined),
    ]);
  }

  db(): Database.Database {
    if (!this.database) throw new Error('Forecast ledger is not initialized');
    return this.database;
  }

  close(): void {
    this.database?.close();
    this.database = undefined;
  }

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const prior = this.appendTail;
    this.appendTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prior;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  private async acquireAppendLock(
    timeoutMs = 5_000,
  ): Promise<() => Promise<void>> {
    const started = Date.now();
    let handle: FileHandle | undefined;
    while (!handle) {
      try {
        handle = await open(this.appendLockPath, 'wx', 0o600);
      } catch (error: any) {
        if (error?.code !== 'EEXIST') throw error;
        let stale = false;
        try {
          const metadata = canonicalParse<{ pid?: number; createdAt?: string }>(
            await readFile(this.appendLockPath, 'utf8'),
          );
          const age = metadata.createdAt
            ? Date.now() - Date.parse(metadata.createdAt)
            : 0;
          if (
            typeof metadata.pid === 'number' &&
            Number.isInteger(metadata.pid) &&
            age > 30_000
          ) {
            try {
              process.kill(metadata.pid, 0);
            } catch (processError: any) {
              stale = processError?.code === 'ESRCH';
            }
          }
        } catch {
          try {
            stale =
              Date.now() - (await stat(this.appendLockPath)).mtimeMs >
              10 * 60_000;
          } catch {
            stale = false;
          }
        }
        if (stale) {
          try {
            await unlink(this.appendLockPath);
            continue;
          } catch (unlinkError: any) {
            if (unlinkError?.code !== 'ENOENT') {
              // Another contender may have replaced the stale lock.
            }
          }
        }
        if (Date.now() - started >= timeoutMs) {
          throw new Error(
            `Timed out waiting for ledger append lock '${this.appendLockPath}'`,
          );
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 25));
      }
    }
    await handle.writeFile(
      canonicalJson({
        schemaVersion: 'forecast-workbench.append-lock/v1',
        pid: process.pid,
        createdAt: this.clock.now().toISOString(),
      }),
    );
    await handle.sync();
    return async () => {
      await handle?.close();
      try {
        await unlink(this.appendLockPath);
      } catch (error: any) {
        if (error?.code !== 'ENOENT') throw error;
      }
    };
  }

  async appendRecord(options: {
    actor: Actor;
    kind: string;
    recordType: string;
    record: unknown;
    /**
     * Required: a v2 event always carries one, so a NULL in the projection
     * means "written before classification was recorded" and nothing else.
     */
    classification: DataClassification;
    validateProjection?: ProjectionValidator;
  }): Promise<RecordReference> {
    return this.exclusive(async () => {
      requireText(options.actor.id, 'record actor ID');
      if (
        ![
          'designer',
          'forecaster',
          'resolver',
          'administrator',
          'service',
        ].includes(options.actor.role)
      ) {
        throw new Error(`Invalid record actor role '${String(options.actor.role)}'`);
      }
      requireText(options.kind, 'record event kind');
      requireText(options.recordType, 'record type');
      if (!['public', 'internal', 'restricted'].includes(options.classification)) {
        throw new Error(
          `Invalid record classification '${String(options.classification)}'`,
        );
      }
      await mkdir(this.root, { recursive: true, mode: 0o700 });
      const releaseAppendLock = await this.acquireAppendLock();
      try {
        await this.initialize();
        const artifact = await this.artifacts.putCanonical(options.record, {
          classification: options.classification,
        });
        const database = this.db();
        database.exec('BEGIN IMMEDIATE');
        try {
          options.validateProjection?.(database);
          const latest = database.prepare(
            'SELECT sequence, event_hash, occurred_at FROM events ORDER BY sequence DESC LIMIT 1',
          ).get() as {
            sequence: number;
            event_hash: string;
            occurred_at: string;
          } | undefined;
          const occurredAt = this.clock.now().toISOString();
          if (
            latest &&
            Date.parse(occurredAt) < Date.parse(latest.occurred_at)
          ) {
            throw new Error(
              'Ledger clock moved backward relative to the preceding event',
            );
          }
          const event = sealEvent({
            schemaVersion: 'forecast-workbench.event/v2',
            sequence: (latest?.sequence ?? 0) + 1,
            occurredAt,
            actor: options.actor,
            kind: options.kind,
            recordType: options.recordType,
            recordArtifactId: artifact.id,
            classification: options.classification,
            ...(latest ? { previousEventHash: latest.event_hash } : {}),
          });
          await this.appendEventLine(event);
          // The log grew, so the cached synchronisation no longer describes it.
          this.synchronized = undefined;
          this.insertEvent(database, event);
          this.projectRecord(database, event, options.record);
          database.exec('COMMIT');
          return {
            id: artifact.id,
            recordType: options.recordType,
            artifact,
            event,
          };
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      } finally {
        await releaseAppendLock();
      }
    });
  }

  private async appendEventLine(event: EventEnvelope): Promise<void> {
    const handle = await open(this.eventLogPath, 'a', 0o600);
    try {
      await handle.writeFile(`${canonicalJson(event)}\n`);
      await handle.sync();
    } finally {
      await handle.close();
    }
  }

  private insertEvent(database: Database.Database, event: EventEnvelope): void {
    database.prepare(`
      INSERT OR IGNORE INTO events (
        sequence, event_id, occurred_at, actor_id, actor_role, kind,
        record_type, record_artifact_id, previous_event_hash, event_hash,
        schema_version, classification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.sequence,
      event.eventId,
      event.occurredAt,
      event.actor.id,
      event.actor.role,
      event.kind,
      event.recordType,
      event.recordArtifactId,
      event.previousEventHash ?? null,
      event.eventHash,
      event.schemaVersion,
      event.classification ?? null,
    );
    database.prepare(`
      INSERT OR IGNORE INTO records (
        record_artifact_id, record_type, first_event_sequence, classification
      ) VALUES (?, ?, ?, ?)
    `).run(
      event.recordArtifactId,
      event.recordType,
      event.sequence,
      event.classification ?? null,
    );
  }

  private projectRecord(
    database: Database.Database,
    event: EventEnvelope,
    record: any,
  ): void {
    const id = event.recordArtifactId;
    if (event.recordType === 'question') {
      database.prepare(`
        INSERT OR IGNORE INTO questions (
          question_hash, question_id, question_version, record_artifact_id,
          opens_at, closes_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        record.id,
        record.version,
        id,
        record.opensAt,
        record.closesAt,
      );
      return;
    }
    if (event.recordType === 'preflight') {
      database.prepare(`
        INSERT OR IGNORE INTO preflights (
          record_artifact_id, question_hash, checked_at
        ) VALUES (?, ?, ?)
      `).run(id, record.questionHash, record.checkedAt);
      return;
    }
    if (event.recordType === 'evidence-packet') {
      database.prepare(`
        INSERT OR IGNORE INTO evidence_packets (
          record_artifact_id, logical_id, view_artifact_id, classification
        ) VALUES (?, ?, ?, ?)
      `).run(id, record.id, record.viewArtifactId, record.classification);
      return;
    }
    if (event.recordType === 'forecast') {
      database.prepare(`
        INSERT OR IGNORE INTO forecasts (
          record_artifact_id, question_hash, forecaster_id, series_id,
          sealed_at, information_set_artifact_id, supersedes_forecast_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        record.questionHash,
        record.forecasterId,
        record.seriesId,
        record.sealedAt,
        record.informationSetArtifactId,
        record.supersedesForecastId ?? null,
      );
      database.prepare(`
        INSERT INTO forecast_series_state (
          question_hash, forecaster_id, series_id, forecast_required,
          last_forecast_id
        ) VALUES (?, ?, ?, 0, ?)
        ON CONFLICT(question_hash, forecaster_id, series_id) DO UPDATE SET
          forecast_required = 0,
          last_forecast_id = excluded.last_forecast_id
      `).run(record.questionHash, record.forecasterId, record.seriesId, id);
      database.prepare(`
        UPDATE questions SET first_forecast_id = COALESCE(first_forecast_id, ?)
        WHERE question_hash = ?
      `).run(id, record.questionHash);
      return;
    }
    if (event.recordType === 'evidence-exposure') {
      database.prepare(`
        INSERT OR IGNORE INTO evidence_exposures (
          record_artifact_id, question_hash, forecaster_id, series_id,
          packet_id, exposed_at, forecast_id_before_exposure
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        record.questionHash,
        record.forecasterId,
        record.seriesId,
        record.packetId,
        record.exposedAt,
        record.forecastIdBeforeExposure,
      );
      database.prepare(`
        INSERT INTO forecast_series_state (
          question_hash, forecaster_id, series_id, forecast_required,
          last_forecast_id, last_exposure_id
        ) VALUES (?, ?, ?, 1, ?, ?)
        ON CONFLICT(question_hash, forecaster_id, series_id) DO UPDATE SET
          forecast_required = 1,
          last_exposure_id = excluded.last_exposure_id
      `).run(
        record.questionHash,
        record.forecasterId,
        record.seriesId,
        record.forecastIdBeforeExposure === 'break-glass:none'
          ? null
          : record.forecastIdBeforeExposure,
        id,
      );
      return;
    }
    if (event.recordType === 'model-forecast') {
      database.prepare(`
        INSERT OR IGNORE INTO model_forecasts (
          record_artifact_id, logical_id, question_hash,
          run_manifest_artifact_id, identified
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        id,
        record.id,
        record.questionHash,
        record.runManifestArtifactId,
        Number(record.identified),
      );
      return;
    }
    if (event.recordType === 'resolution') {
      database.prepare(`
        INSERT OR IGNORE INTO resolutions (
          record_artifact_id, question_hash, status, resolved_at,
          supersedes_resolution_id
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        id,
        record.questionHash,
        record.status,
        record.resolvedAt,
        record.supersedesResolutionId ?? null,
      );
      return;
    }
    if (event.recordType === 'score') {
      database.prepare(`
        INSERT OR IGNORE INTO scores (
          record_artifact_id, question_hash, forecast_id, resolution_id,
          scored_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        id,
        record.questionHash,
        record.forecastId,
        record.resolutionId,
        record.scoredAt,
      );
    }
  }

  private async readEventLog(): Promise<EventEnvelope[]> {
    let text: string;
    try {
      text = await readFile(this.eventLogPath, 'utf8');
    } catch (error: any) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
    return text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => canonicalParse<EventEnvelope>(line));
  }

  /**
   * The event log as of the last synchronise, with the file size and mtime it
   * had then. Re-reading and re-hashing the whole history on every read made
   * getRecord quadratic: 50 record reads cost 2,500 artifact verifications.
   */
  private synchronized?: {
    size: number;
    mtimeMs: number;
    events: number;
  };

  /**
   * Whether the canonical log has changed since the last synchronise. Size and
   * mtime, not content: this decides whether to re-read, and every path that
   * needs integrity re-establishes it for the bytes it actually returns.
   */
  private async logIsUnchanged(): Promise<boolean> {
    if (!this.synchronized) return false;
    try {
      const info = await stat(this.eventLogPath);
      return info.size === this.synchronized.size &&
        info.mtimeMs === this.synchronized.mtimeMs;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return this.synchronized.events === 0;
      throw error;
    }
  }

  private async synchronizeProjection(): Promise<void> {
    if (await this.logIsUnchanged()) return;
    const events = await this.readEventLog();
    let previous: string | undefined;
    let previousOccurredAt: string | undefined;
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      if (event.sequence !== index + 1) {
        throw new Error(`Event log sequence gap at ${event.sequence}`);
      }
      validateEvent(event, previous, previousOccurredAt);
      await this.artifacts.verify(event.recordArtifactId);
      previous = event.eventHash;
      previousOccurredAt = event.occurredAt;
    }
    const database = this.db();
    const rows = database.prepare(
      'SELECT * FROM events ORDER BY sequence',
    ).all() as StoredEventRow[];
    if (rows.length > events.length) {
      throw new Error('SQLite projection contains events absent from the canonical log');
    }
    for (let index = 0; index < rows.length; index++) {
      if (rows[index].event_hash !== events[index].eventHash) {
        throw new Error(`SQLite projection diverges from event log at sequence ${index + 1}`);
      }
    }
    if (rows.length !== events.length) {
      database.exec('BEGIN IMMEDIATE');
      try {
        for (const event of events.slice(rows.length)) {
          const record = await this.artifacts.getCanonicalJson(event.recordArtifactId);
          this.insertEvent(database, event);
          this.projectRecord(database, event, record);
        }
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    }
    await this.rememberSynchronized(events.length);
  }

  private async rememberSynchronized(events: number): Promise<void> {
    try {
      const info = await stat(this.eventLogPath);
      this.synchronized = { size: info.size, mtimeMs: info.mtimeMs, events };
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        this.synchronized = { size: 0, mtimeMs: 0, events };
        return;
      }
      throw error;
    }
  }

  async verify(): Promise<{
    events: number;
    records: number;
    chainHead?: string;
  }> {
    await this.initialize();
    const events = await this.readEventLog();
    let previous: string | undefined;
    let previousOccurredAt: string | undefined;
    const records = new Set<string>();
    for (const event of events) {
      validateEvent(event, previous, previousOccurredAt);
      await this.artifacts.verify(event.recordArtifactId);
      records.add(event.recordArtifactId);
      previous = event.eventHash;
      previousOccurredAt = event.occurredAt;
    }
    return {
      events: events.length,
      records: records.size,
      ...(previous ? { chainHead: previous } : {}),
    };
  }

  /**
   * Reads one record, verifying the artifact it returns.
   *
   * It no longer re-verifies the whole history first. That caught tampering
   * with any artifact on any read, but cost a full rehash of every record per
   * read; verify() remains the explicit whole-history audit, and export calls
   * it. What a read guarantees is that the bytes it hands back match the
   * content address they were stored under.
   */
  async getRecord<T>(id: string): Promise<T> {
    await this.initialize();
    const exists = this.db().prepare(
      'SELECT 1 FROM records WHERE record_artifact_id = ?',
    ).get(id);
    if (!exists) throw new Error(`Unknown ledger record '${id}'`);
    await this.artifacts.verify(id);
    return this.artifacts.getCanonicalJson<T>(id);
  }

  listRecordIds(recordType: string): string[] {
    const rows = this.db().prepare(
      'SELECT record_artifact_id FROM records WHERE record_type = ? ORDER BY first_event_sequence',
    ).all(recordType) as Array<{ record_artifact_id: string }>;
    return rows.map(({ record_artifact_id }) => record_artifact_id);
  }

  /**
   * `classification` is undefined for a record written before the event
   * envelope carried one. That is unknown provenance, not a level — callers
   * that gate on it must fail closed.
   */
  listRecords(): Array<{
    id: string;
    recordType: string;
    sequence: number;
    classification?: DataClassification;
  }> {
    const rows = this.db().prepare(`
      SELECT record_artifact_id, record_type, first_event_sequence, classification
      FROM records ORDER BY first_event_sequence
    `).all() as Array<{
      record_artifact_id: string;
      record_type: string;
      first_event_sequence: number;
      classification: DataClassification | null;
    }>;
    return rows.map((row) => ({
      id: row.record_artifact_id,
      recordType: row.record_type,
      sequence: row.first_event_sequence,
      ...(row.classification ? { classification: row.classification } : {}),
    }));
  }

  async events(): Promise<readonly EventEnvelope[]> {
    await this.initialize();
    return this.readEventLog();
  }

  chainHead(): EventEnvelope | undefined {
    const row = this.db().prepare(
      'SELECT * FROM events ORDER BY sequence DESC LIMIT 1',
    ).get() as StoredEventRow | undefined;
    if (!row) return undefined;
    return {
      schemaVersion: row.schema_version as EventEnvelope['schemaVersion'],
      sequence: row.sequence,
      eventId: row.event_id,
      occurredAt: row.occurred_at,
      actor: { id: row.actor_id, role: row.actor_role as Actor['role'] },
      kind: row.kind,
      recordType: row.record_type,
      recordArtifactId: row.record_artifact_id,
      ...(row.previous_event_hash
        ? { previousEventHash: row.previous_event_hash }
        : {}),
      eventHash: row.event_hash,
    };
  }
}

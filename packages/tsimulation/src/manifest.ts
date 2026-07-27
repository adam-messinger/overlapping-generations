import type { CalibrationResult } from './calibration.js';
import {
  validateDataLineage,
  type DataLineage,
  type DataSnapshot,
  type DataTransformation,
} from './data.js';
import type { EvidenceRecord, ValidationClaim } from './evidence.js';
import { validateEvidence, validateValidationClaims } from './evidence.js';
import type { ModelRun } from './model.js';
import { stableHash, stableStringify } from './serialization.js';
import { validateExperiment, type ExperimentContract } from './study.js';

export interface LegacyRunManifest<TInput = unknown, TOutput = unknown> {
  schemaVersion: 'tsimulation.run/v1';
  runId: string;
  createdAt: string;
  model: {
    id: string;
    version: string;
  };
  code?: {
    gitSha?: string;
    dirty?: boolean;
  };
  input: TInput;
  output: TOutput;
  inputHash: string;
  outputHash: string;
  dataHashes: Record<string, string>;
  durationMs: number;
  seed?: number;
  warnings: string[];
  invariants: ModelRun<TInput, TOutput>['invariantReport'];
  evidence: readonly EvidenceRecord[];
  validationClaims: readonly ValidationClaim[];
  calibration?: {
    id: string;
    splitHash: string;
    candidateCount: number;
    developmentObjective: number;
    scores: CalibrationResult<unknown, unknown>['scores'];
  };
  diagnostics?: Record<string, unknown>;
}

export interface RunManifest<TInput = unknown, TOutput = unknown> {
  schemaVersion: 'tsimulation.run/v2';
  runId: string;
  createdAt: string;
  model: {
    id: string;
    version: string;
  };
  code?: {
    gitSha?: string;
    dirty?: boolean;
  };
  input: TInput;
  output: TOutput;
  inputHash: string;
  outputHash: string;
  /** Hashes of complete shape/unit/semantic model boundary contracts. */
  contractHashes: {
    input: string;
    output: string;
  };
  semanticLineage: ModelRun<TInput, TOutput>['semanticLineage'];
  /**
   * Retained for v1 consumers and inline fixtures. External data should use
   * dataLineage, whose artifacts carry SHA-256 digests.
   */
  dataHashes: Record<string, string>;
  dataLineage: DataLineage;
  dataLineageHash: string;
  durationMs: number;
  seed?: number;
  warnings: string[];
  invariants: ModelRun<TInput, TOutput>['invariantReport'];
  evidence: readonly EvidenceRecord[];
  validationClaims: readonly ValidationClaim[];
  experiment?: {
    contract: ExperimentContract;
    hash: string;
  };
  calibration?: {
    id: string;
    splitHash: string;
    candidateCount: number;
    developmentObjective: number;
    scores: CalibrationResult<unknown, unknown>['scores'];
    snapshotIds: readonly string[];
  };
  diagnostics?: Record<string, unknown>;
  /** Hash of the complete manifest payload, excluding this field itself. */
  integrityHash: string;
}

export type AnyRunManifest<TInput = unknown, TOutput = unknown> =
  | LegacyRunManifest<TInput, TOutput>
  | RunManifest<TInput, TOutput>;

type UnsealedRunManifest<TInput, TOutput> =
  Omit<RunManifest<TInput, TOutput>, 'integrityHash'>;

function sealRunManifest<TInput, TOutput>(
  payload: UnsealedRunManifest<TInput, TOutput>,
): RunManifest<TInput, TOutput> {
  return { ...payload, integrityHash: stableHash(payload) };
}

function validateSemanticLineage(
  lineage: ModelRun<unknown, unknown>['semanticLineage'],
  context = 'semantic lineage',
): void {
  if (!lineage || !Array.isArray(lineage.derivations) ||
      !Array.isArray(lineage.crosswalks) ||
      !Array.isArray(lineage.measurementCrosswalks)) {
    throw new Error(
      `${context} must contain derivation, semantic-crosswalk, and ` +
      'measurement-crosswalk arrays',
    );
  }
  const ids = new Set<string>();
  for (const [kind, records] of [
    ['derivation', lineage.derivations],
    ['crosswalk', lineage.crosswalks],
    ['measurement crosswalk', lineage.measurementCrosswalks],
  ] as const) {
    for (const record of records) {
      if (typeof record.id !== 'string' || !record.id.trim() ||
          typeof record.version !== 'string' || !record.version.trim()) {
        throw new Error(`${context} has an invalid ${kind} reference`);
      }
      if (ids.has(record.id)) throw new Error(`${context} has duplicate ID '${record.id}'`);
      ids.add(record.id);
    }
  }
}

export function createRunManifest<TInput, TOutput>(options: {
  run: ModelRun<TInput, TOutput>;
  runId?: string;
  createdAt?: string;
  gitSha?: string;
  dirty?: boolean;
  data?: Readonly<Record<string, unknown>>;
  snapshots?: readonly DataSnapshot[];
  transformations?: readonly DataTransformation[];
  evidence?: readonly EvidenceRecord[];
  validationClaims?: readonly ValidationClaim[];
  experiment?: ExperimentContract;
  calibration?: CalibrationResult<unknown, unknown>;
  diagnostics?: Record<string, unknown>;
}): RunManifest<TInput, TOutput> {
  const createdAt = options.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) throw new Error('Manifest createdAt must be an ISO date');
  const dataLineage: DataLineage = {
    snapshots: options.snapshots ?? [],
    transformations: options.transformations ?? [],
  };
  validateDataLineage(dataLineage);
  const evidence = options.evidence ?? options.run.evidence;
  const validationClaims =
    options.validationClaims ?? options.run.validationClaims;
  validateEvidence(evidence, dataLineage.snapshots);
  validateValidationClaims(validationClaims, evidence);
  if (options.experiment) validateExperiment(options.experiment, 'Manifest experiment');
  validateSemanticLineage(options.run.semanticLineage, 'Manifest run semantic lineage');
  const snapshotIds = new Set(dataLineage.snapshots.map((snapshot) => snapshot.id));
  for (const snapshotId of options.calibration?.snapshotIds ?? []) {
    if (!snapshotIds.has(snapshotId)) {
      throw new Error(`Manifest calibration references unknown snapshot '${snapshotId}'`);
    }
  }
  const dataHashes = Object.fromEntries(
    Object.entries(options.data ?? {}).map(([id, value]) => [id, stableHash(value)]),
  );
  const dataLineageHash = stableHash(dataLineage);
  const runId = options.runId ??
    `${options.run.modelId}:${options.run.modelVersion}:${stableHash({
      createdAt,
      input: options.run.input,
      dataLineageHash,
      experiment: options.experiment,
    })}`;
  return sealRunManifest({
    schemaVersion: 'tsimulation.run/v2',
    runId,
    createdAt,
    model: { id: options.run.modelId, version: options.run.modelVersion },
    ...((options.gitSha !== undefined || options.dirty !== undefined)
      ? { code: { gitSha: options.gitSha, dirty: options.dirty } }
      : {}),
    input: options.run.input,
    output: options.run.output,
    inputHash: stableHash(options.run.input),
    outputHash: stableHash(options.run.output),
    contractHashes: options.run.contractHashes,
    semanticLineage: options.run.semanticLineage,
    dataHashes,
    dataLineage,
    dataLineageHash,
    durationMs: options.run.durationMs,
    seed: options.run.seed,
    warnings: options.run.warnings,
    invariants: options.run.invariantReport,
    evidence,
    validationClaims,
    ...(options.experiment ? {
      experiment: {
        contract: options.experiment,
        hash: stableHash(options.experiment),
      },
    } : {}),
    ...(options.calibration ? {
      calibration: {
        id: options.calibration.id,
        splitHash: options.calibration.splitHash,
        candidateCount: options.calibration.candidateCount,
        developmentObjective: options.calibration.developmentObjective,
        scores: options.calibration.scores,
        snapshotIds: options.calibration.snapshotIds,
      },
    } : {}),
    diagnostics: options.diagnostics,
  });
}

/** Upgrade a parsed v1 record without pretending its unavailable lineage was captured. */
export function upgradeRunManifest<TInput, TOutput>(
  legacy: LegacyRunManifest<TInput, TOutput>,
): RunManifest<TInput, TOutput> {
  const dataLineage: DataLineage = { snapshots: [], transformations: [] };
  const {
    calibration,
    integrityHash: _legacyIntegrityHash,
    ...base
  } = legacy as LegacyRunManifest<TInput, TOutput> & {
    integrityHash?: string;
  };
  return sealRunManifest({
    ...base,
    schemaVersion: 'tsimulation.run/v2',
    contractHashes: {
      input: 'legacy:unavailable',
      output: 'legacy:unavailable',
    },
    semanticLineage: {
      derivations: [],
      crosswalks: [],
      measurementCrosswalks: [],
    },
    dataLineage,
    dataLineageHash: stableHash(dataLineage),
    ...(calibration ? {
      calibration: {
        ...calibration,
        snapshotIds: [],
      },
    } : {}),
  });
}

export function parseRunManifest(
  json: string,
  options: { upgradeV1?: boolean; verifyIntegrity?: boolean } = {},
): AnyRunManifest {
  const parsed = JSON.parse(json) as Partial<AnyRunManifest>;
  if (parsed.schemaVersion !== 'tsimulation.run/v1' &&
      parsed.schemaVersion !== 'tsimulation.run/v2') {
    throw new Error(`Unsupported run manifest schemaVersion '${String(parsed.schemaVersion)}'`);
  }
  if (typeof parsed.runId !== 'string' || !parsed.runId.trim()) {
    throw new Error('Run manifest is missing runId');
  }
  if (typeof parsed.createdAt !== 'string' || Number.isNaN(Date.parse(parsed.createdAt))) {
    throw new Error('Run manifest has invalid createdAt');
  }
  if (parsed.schemaVersion === 'tsimulation.run/v2') {
    const current = parsed as RunManifest;
    return options.verifyIntegrity === false
      ? validateRunManifestStructure(current)
      : verifyRunManifest(current);
  }
  const legacy = parsed as LegacyRunManifest;
  return options.upgradeV1 === false ? legacy : upgradeRunManifest(legacy);
}

function requiredText(value: unknown, context: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${context} must not be empty`);
  }
}

function requiredHash(value: unknown, context: string): asserts value is string {
  requiredText(value, context);
  if (value !== 'legacy:unavailable' && !/^fnv1a32:[0-9a-f]{8}$/.test(value)) {
    throw new Error(`${context} must be a stableHash value`);
  }
}

function validateRunManifestStructure<TInput, TOutput>(
  current: RunManifest<TInput, TOutput>,
): RunManifest<TInput, TOutput> {
  requiredText(current.model?.id, 'Run manifest model.id');
  requiredText(current.model?.version, 'Run manifest model.version');
  requiredHash(current.inputHash, 'Run manifest inputHash');
  requiredHash(current.outputHash, 'Run manifest outputHash');
  requiredHash(current.integrityHash, 'Run manifest integrityHash');
  requiredHash(current.contractHashes?.input, 'Run manifest input contract hash');
  requiredHash(current.contractHashes?.output, 'Run manifest output contract hash');
  requiredHash(current.dataLineageHash, 'Run manifest dataLineageHash');
  if (!Number.isFinite(current.durationMs) || current.durationMs < 0) {
    throw new Error('Run manifest durationMs must be finite and non-negative');
  }
  if (!Array.isArray(current.warnings)) {
    throw new Error('Run manifest warnings must be an array');
  }
  if (!current.invariants ||
      !Array.isArray(current.invariants.errors) ||
      !Array.isArray(current.invariants.warnings) ||
      !Array.isArray(current.invariants.passed)) {
    throw new Error('Run manifest invariants report is invalid');
  }
  validateDataLineage(current.dataLineage);
  validateEvidence(current.evidence ?? [], current.dataLineage.snapshots);
  validateValidationClaims(current.validationClaims ?? [], current.evidence ?? []);
  validateSemanticLineage(current.semanticLineage, 'Run manifest semantic lineage');
  for (const [id, hash] of Object.entries(current.dataHashes ?? {})) {
    requiredText(id, 'Run manifest data hash ID');
    requiredHash(hash, `Run manifest data hash '${id}'`);
  }
  if (current.experiment) {
    validateExperiment(current.experiment.contract);
    requiredHash(current.experiment.hash, 'Run manifest experiment hash');
  }
  const snapshotIds = new Set(
    current.dataLineage.snapshots.map((snapshot) => snapshot.id),
  );
  for (const snapshotId of current.calibration?.snapshotIds ?? []) {
    if (!snapshotIds.has(snapshotId)) {
      throw new Error(
        `Run manifest calibration references unknown snapshot '${snapshotId}'`,
      );
    }
  }
  return current;
}

/**
 * Verify both schema and every hash whose source value is carried by the
 * manifest. Contract and inline-data hashes are format-checked because their
 * source contracts/data are intentionally external to the run record.
 */
export function verifyRunManifest<TInput, TOutput>(
  manifest: RunManifest<TInput, TOutput>,
): RunManifest<TInput, TOutput> {
  const current = validateRunManifestStructure(manifest);
  const checks: Array<[string, string, string]> = [
    ['inputHash', current.inputHash, stableHash(current.input)],
    ['outputHash', current.outputHash, stableHash(current.output)],
    ['dataLineageHash', current.dataLineageHash, stableHash(current.dataLineage)],
  ];
  if (current.experiment) {
    checks.push([
      'experiment.hash',
      current.experiment.hash,
      stableHash(current.experiment.contract),
    ]);
  }
  for (const [name, recorded, recomputed] of checks) {
    if (recorded !== recomputed) {
      throw new Error(
        `Run manifest integrity failure for ${name}: ` +
        `recorded ${recorded}, recomputed ${recomputed}`,
      );
    }
  }
  const { integrityHash, ...payload } = current;
  const recomputedIntegrityHash = stableHash(payload);
  if (integrityHash !== recomputedIntegrityHash) {
    throw new Error(
      `Run manifest integrity failure for integrityHash: ` +
      `recorded ${integrityHash}, recomputed ${recomputedIntegrityHash}`,
    );
  }
  return current;
}

export function manifestToJson(manifest: AnyRunManifest, space = 2): string {
  return stableStringify(manifest, space);
}

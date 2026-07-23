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
}

export type AnyRunManifest<TInput = unknown, TOutput = unknown> =
  | LegacyRunManifest<TInput, TOutput>
  | RunManifest<TInput, TOutput>;

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
  const evidence = options.evidence ?? [];
  validateEvidence(evidence, dataLineage.snapshots);
  validateValidationClaims(options.validationClaims ?? [], evidence);
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
  return {
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
    validationClaims: options.validationClaims ?? [],
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
  };
}

/** Upgrade a parsed v1 record without pretending its unavailable lineage was captured. */
export function upgradeRunManifest<TInput, TOutput>(
  legacy: LegacyRunManifest<TInput, TOutput>,
): RunManifest<TInput, TOutput> {
  const dataLineage: DataLineage = { snapshots: [], transformations: [] };
  const { calibration, ...base } = legacy;
  return {
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
  };
}

export function parseRunManifest(
  json: string,
  options: { upgradeV1?: boolean } = {},
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
    validateDataLineage(current.dataLineage);
    validateEvidence(current.evidence ?? [], current.dataLineage.snapshots);
    validateSemanticLineage(current.semanticLineage, 'Run manifest semantic lineage');
    if (current.experiment) validateExperiment(current.experiment.contract);
    return current;
  }
  const legacy = parsed as LegacyRunManifest;
  return options.upgradeV1 === false ? legacy : upgradeRunManifest(legacy);
}

export function manifestToJson(manifest: AnyRunManifest, space = 2): string {
  return stableStringify(manifest, space);
}

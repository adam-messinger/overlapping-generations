import type { CalibrationResult } from './calibration.js';
import type { EvidenceRecord, ValidationClaim } from './evidence.js';
import { validateEvidence, validateValidationClaims } from './evidence.js';
import type { ModelRun } from './model.js';
import { stableHash, stableStringify } from './serialization.js';

export interface RunManifest<TInput = unknown, TOutput = unknown> {
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

export function createRunManifest<TInput, TOutput>(options: {
  run: ModelRun<TInput, TOutput>;
  runId?: string;
  createdAt?: string;
  gitSha?: string;
  dirty?: boolean;
  data?: Readonly<Record<string, unknown>>;
  evidence?: readonly EvidenceRecord[];
  validationClaims?: readonly ValidationClaim[];
  calibration?: CalibrationResult<unknown, unknown>;
  diagnostics?: Record<string, unknown>;
}): RunManifest<TInput, TOutput> {
  const createdAt = options.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) throw new Error('Manifest createdAt must be an ISO date');
  const evidence = options.evidence ?? [];
  validateEvidence(evidence);
  validateValidationClaims(options.validationClaims ?? [], evidence);
  const dataHashes = Object.fromEntries(
    Object.entries(options.data ?? {}).map(([id, value]) => [id, stableHash(value)]),
  );
  const runId = options.runId ??
    `${options.run.modelId}:${options.run.modelVersion}:${stableHash({ createdAt, input: options.run.input })}`;
  return {
    schemaVersion: 'tsimulation.run/v1',
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
    dataHashes,
    durationMs: options.run.durationMs,
    seed: options.run.seed,
    warnings: options.run.warnings,
    invariants: options.run.invariantReport,
    evidence,
    validationClaims: options.validationClaims ?? [],
    ...(options.calibration ? { calibration: {
      id: options.calibration.id,
      splitHash: options.calibration.splitHash,
      candidateCount: options.calibration.candidateCount,
      developmentObjective: options.calibration.developmentObjective,
      scores: options.calibration.scores,
    } } : {}),
    diagnostics: options.diagnostics,
  };
}

export function manifestToJson(manifest: RunManifest, space = 2): string {
  return stableStringify(manifest, space);
}

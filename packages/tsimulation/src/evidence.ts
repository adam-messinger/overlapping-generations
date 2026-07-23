import { validateDataSnapshot, type DataSnapshot } from './data.js';
import {
  validateMeasurement,
  validateMeasurementCrosswalk,
  compareEstimands,
  compareMeasurements,
  validateSemanticCrosswalk,
  validateSemanticDerivation,
  type MeasurementBinding,
  type MeasurementCrosswalk,
  type SemanticCrosswalk,
  type SemanticDerivation,
} from './semantics.js';

export type EvidenceKind = 'observed' | 'fitted' | 'literature' | 'judgment' | 'derived';
export type EvidenceRole = 'development' | 'validation' | 'holdout' | 'diagnostic' | 'scenario';
export type ValidationGrade =
  | 'out-of-sample'
  | 'same-event-fit'
  | 'literature-anchored'
  | 'mechanism-inherited'
  | 'scenario-only';

export interface DataSource {
  title: string;
  url?: string;
  citation?: string;
  accessedAt?: string;
  publishedAt?: string;
  license?: string;
}

export interface EvidenceRecord<T = unknown> {
  id: string;
  label: string;
  kind: EvidenceKind;
  role: EvidenceRole;
  value?: T;
  unit?: string;
  source?: DataSource;
  /** Concrete observation semantics, including release and revision policy. */
  measurement?: MeasurementBinding;
  /** Immutable external data vintages used by this evidence item. */
  snapshotIds?: readonly string[];
  /** Auditable translations from evidence quantities to modeled quantities. */
  semanticDerivations?: readonly SemanticDerivation[];
  semanticCrosswalks?: readonly SemanticCrosswalk[];
  measurementCrosswalks?: readonly MeasurementCrosswalk[];
  notes?: string;
}

export interface ValidationClaim {
  grade: ValidationGrade;
  label: string;
  basis: string;
  evidenceIds?: readonly string[];
}

export function validateEvidence(
  records: readonly EvidenceRecord[],
  snapshots: readonly DataSnapshot[] = [],
): void {
  const snapshotIds = new Set<string>();
  for (const snapshot of snapshots) {
    validateDataSnapshot(snapshot, `Snapshot '${snapshot.id}'`);
    if (snapshotIds.has(snapshot.id)) throw new Error(`Duplicate snapshot ID '${snapshot.id}'`);
    snapshotIds.add(snapshot.id);
  }
  const ids = new Set<string>();
  for (const record of records) {
    if (!record.id) throw new Error('Evidence ID must not be empty');
    if (ids.has(record.id)) throw new Error(`Duplicate evidence ID '${record.id}'`);
    ids.add(record.id);
    if (record.source?.url && !/^https?:\/\//.test(record.source.url)) {
      throw new Error(`Evidence '${record.id}' has a non-HTTP source URL`);
    }
    if (record.source?.accessedAt && Number.isNaN(Date.parse(record.source.accessedAt))) {
      throw new Error(`Evidence '${record.id}' has invalid accessedAt`);
    }
    if (record.measurement) {
      validateMeasurement(record.measurement, `Evidence '${record.id}' measurement`);
      if (record.measurement.snapshotId &&
          snapshots.length > 0 &&
          !snapshotIds.has(record.measurement.snapshotId)) {
        throw new Error(
          `Evidence '${record.id}' measurement references unknown snapshot ` +
          `'${record.measurement.snapshotId}'`,
        );
      }
    }
    for (const derivation of record.semanticDerivations ?? []) {
      validateSemanticDerivation(
        derivation,
        `Evidence '${record.id}' semantic derivation '${derivation.id}'`,
      );
      if (record.measurement &&
          !derivation.inputEstimandIds.includes(record.measurement.estimand.id)) {
        throw new Error(
          `Evidence '${record.id}' derivation '${derivation.id}' does not reference ` +
          'the evidence measurement estimand',
        );
      }
    }
    for (const crosswalk of record.semanticCrosswalks ?? []) {
      validateSemanticCrosswalk(
        crosswalk,
        `Evidence '${record.id}' semantic crosswalk '${crosswalk.id}'`,
      );
      if (record.measurement &&
          !compareEstimands(record.measurement.estimand, crosswalk.source).compatible) {
        throw new Error(
          `Evidence '${record.id}' semantic crosswalk '${crosswalk.id}' source does not ` +
          'match its measurement estimand',
        );
      }
    }
    for (const crosswalk of record.measurementCrosswalks ?? []) {
      validateMeasurementCrosswalk(
        crosswalk,
        `Evidence '${record.id}' measurement crosswalk '${crosswalk.id}'`,
      );
      if (record.measurement &&
          !compareMeasurements(record.measurement, crosswalk.source).compatible) {
        throw new Error(
          `Evidence '${record.id}' measurement crosswalk '${crosswalk.id}' source does ` +
          'not match its measurement regime',
        );
      }
    }
    for (const snapshotId of record.snapshotIds ?? []) {
      if (typeof snapshotId !== 'string' || !snapshotId.trim()) {
        throw new Error(`Evidence '${record.id}' has an invalid snapshot ID`);
      }
      if (snapshots.length > 0 && !snapshotIds.has(snapshotId)) {
        throw new Error(`Evidence '${record.id}' references unknown snapshot '${snapshotId}'`);
      }
    }
    if (record.measurement?.snapshotId &&
        !(record.snapshotIds ?? []).includes(record.measurement.snapshotId)) {
      throw new Error(
        `Evidence '${record.id}' measurement snapshot is absent from snapshotIds`,
      );
    }
  }
}

export function validateValidationClaims(
  claims: readonly ValidationClaim[],
  records: readonly EvidenceRecord[],
): void {
  const evidenceIds = new Set(records.map((record) => record.id));
  for (const claim of claims) {
    if (!claim.label.trim()) throw new Error('Validation claim label must not be empty');
    if (!claim.basis.trim()) throw new Error(`Validation claim '${claim.label}' basis must not be empty`);
    for (const evidenceId of claim.evidenceIds ?? []) {
      if (!evidenceIds.has(evidenceId)) {
        throw new Error(`Validation claim '${claim.label}' references unknown evidence '${evidenceId}'`);
      }
    }
  }
}

export function inferValidationGrade(records: readonly EvidenceRecord[]): ValidationGrade {
  if (records.some((record) => record.role === 'holdout' && record.kind === 'observed')) {
    return 'out-of-sample';
  }
  if (records.some((record) => record.kind === 'fitted')) return 'same-event-fit';
  if (records.some((record) => record.kind === 'literature')) return 'literature-anchored';
  return 'scenario-only';
}

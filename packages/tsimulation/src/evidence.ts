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
  notes?: string;
}

export interface ValidationClaim {
  grade: ValidationGrade;
  label: string;
  basis: string;
  evidenceIds?: readonly string[];
}

export function validateEvidence(records: readonly EvidenceRecord[]): void {
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

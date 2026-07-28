import { requireIsoTimestamp, requireText } from './canonical.js';

export type ReferenceClassDecision = 'included' | 'excluded' | 'censored';

export interface ReferenceClassCase {
  id: string;
  label: string;
  decision: ReferenceClassDecision;
  reason: string;
  outcomeId?: string;
  outcomeObservationVersionIds: readonly string[];
}

export interface ReferenceClassVersion {
  schemaVersion: 'forecast-workbench.reference-class/v1';
  id: string;
  version: string;
  questionHash: string;
  createdAt: string;
  searchProtocol: string;
  searchCutoffAt: string;
  candidateUniverseArtifactId: string;
  construction: 'prospective' | 'retrospective';
  cases: readonly ReferenceClassCase[];
  denominatorRule: string;
  alternateReferenceClassIds: readonly string[];
  limitations: string;
}

export function validateReferenceClass(referenceClass: ReferenceClassVersion): void {
  if (referenceClass.schemaVersion !== 'forecast-workbench.reference-class/v1') {
    throw new Error(
      `Unsupported reference-class schema '${String(referenceClass.schemaVersion)}'`,
    );
  }
  requireText(referenceClass.id, 'referenceClass.id');
  requireText(referenceClass.version, 'referenceClass.version');
  requireText(referenceClass.questionHash, 'referenceClass.questionHash');
  requireIsoTimestamp(referenceClass.createdAt, 'referenceClass.createdAt');
  requireIsoTimestamp(referenceClass.searchCutoffAt, 'referenceClass.searchCutoffAt');
  requireText(referenceClass.searchProtocol, 'referenceClass.searchProtocol');
  requireText(referenceClass.candidateUniverseArtifactId, 'referenceClass.candidateUniverseArtifactId');
  requireText(referenceClass.denominatorRule, 'referenceClass.denominatorRule');
  requireText(referenceClass.limitations, 'referenceClass.limitations');
  if (!['prospective', 'retrospective'].includes(referenceClass.construction)) {
    throw new Error(
      `Invalid reference-class construction '${String(referenceClass.construction)}'`,
    );
  }
  if (
    Date.parse(referenceClass.searchCutoffAt) >
    Date.parse(referenceClass.createdAt)
  ) {
    throw new Error('Reference-class search cutoff cannot follow creation');
  }
  const alternateIds = new Set<string>();
  for (const id of referenceClass.alternateReferenceClassIds) {
    requireText(id, 'alternate reference-class ID');
    if (alternateIds.has(id)) {
      throw new Error(`Duplicate alternate reference class '${id}'`);
    }
    alternateIds.add(id);
  }
  if (referenceClass.cases.length === 0) {
    throw new Error('Reference class must preserve at least one candidate');
  }
  const ids = new Set<string>();
  for (const row of referenceClass.cases) {
    requireText(row.id, 'reference-class case ID');
    requireText(row.label, `reference-class case '${row.id}' label`);
    requireText(row.reason, `reference-class case '${row.id}' reason`);
    if (!['included', 'excluded', 'censored'].includes(row.decision)) {
      throw new Error(
        `Reference-class case '${row.id}' has invalid decision '${String(row.decision)}'`,
      );
    }
    if (ids.has(row.id)) throw new Error(`Duplicate reference-class case '${row.id}'`);
    ids.add(row.id);
    if (row.decision === 'included' && !row.outcomeId) {
      throw new Error(`Included reference-class case '${row.id}' needs an outcome`);
    }
    const observationIds = new Set<string>();
    for (const observationId of row.outcomeObservationVersionIds) {
      requireText(
        observationId,
        `reference-class case '${row.id}' observation version`,
      );
      if (observationIds.has(observationId)) {
        throw new Error(
          `Reference-class case '${row.id}' repeats observation '${observationId}'`,
        );
      }
      observationIds.add(observationId);
    }
  }
}

export function referenceClassRate(options: {
  referenceClass: ReferenceClassVersion;
  positiveOutcomeIds: readonly string[];
}): {
  numerator: number;
  denominator: number;
  rate: number;
} {
  validateReferenceClass(options.referenceClass);
  const included = options.referenceClass.cases.filter(({ decision }) => decision === 'included');
  if (included.length === 0) throw new Error('Reference class has no included cases');
  const numerator = included.filter(({ outcomeId }) =>
    outcomeId !== undefined && options.positiveOutcomeIds.includes(outcomeId)
  ).length;
  return {
    numerator,
    denominator: included.length,
    rate: numerator / included.length,
  };
}

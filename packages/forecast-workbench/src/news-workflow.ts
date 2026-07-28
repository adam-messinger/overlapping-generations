import {
  assertFiniteJson,
  requireIsoTimestamp,
  requireText,
} from './canonical.js';

export type NewsModelingDecision = 'selected' | 'deferred' | 'rejected';

export interface NewsScreenStory {
  id: string;
  headline: string;
  decision: NewsModelingDecision;
  reason: string;
  estimand?: string;
  mechanism?: string;
  sourceArtifactIds: readonly string[];
}

export interface NewsScreenRecord {
  schemaVersion: 'forecast-workbench.news-screen/v1';
  id: string;
  coverageDate: string;
  screenedAt: string;
  analystId: string;
  method: string;
  stories: readonly NewsScreenStory[];
  limitations: readonly string[];
}

export type NewsModelAgreement =
  | 'agrees'
  | 'qualifies'
  | 'disagrees'
  | 'not-identified';

export type NewsIdentificationStatus =
  | 'identified-direction'
  | 'identified-magnitude'
  | 'conditional-only'
  | 'not-identified';

export interface NewsModelingIteration {
  sequence: 1 | 2;
  label: string;
  method: string;
  resultSummary: string;
  runManifestArtifactId: string;
}

export interface NewsModelComparison {
  schemaVersion: 'forecast-workbench.news-model-comparison/v1';
  id: string;
  screenRecordId: string;
  storyId: string;
  createdAt: string;
  analysisKind:
    | 'accounting-reconciliation'
    | 'conditional-stress-test'
    | 'mechanism-check';
  modelQuestion: string;
  targetEstimand: string;
  evidencePacketIds: readonly string[];
  iterations: readonly [NewsModelingIteration, NewsModelingIteration];
  identificationStatus: NewsIdentificationStatus;
  conventionalWisdom: string;
  agreement: NewsModelAgreement;
  comparison: string;
  notForecastReason: string;
  limitations: readonly string[];
}

function requireUniqueText(
  values: readonly string[],
  context: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    requireText(value, context);
    if (seen.has(value)) {
      throw new Error(`${context} contains duplicate '${value}'`);
    }
    seen.add(value);
  }
}

export function validateNewsScreen(record: NewsScreenRecord): void {
  if (record.schemaVersion !== 'forecast-workbench.news-screen/v1') {
    throw new Error(
      `Unsupported news-screen schema '${String(record.schemaVersion)}'`,
    );
  }
  requireText(record.id, 'news screen ID');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.coverageDate)) {
    throw new Error('news screen coverageDate must be YYYY-MM-DD');
  }
  requireIsoTimestamp(record.screenedAt, 'news screen screenedAt');
  requireText(record.analystId, 'news screen analystId');
  requireText(record.method, 'news screen method');
  if (record.stories.length === 0) {
    throw new Error('news screen must contain at least one story');
  }
  requireUniqueText(record.stories.map(({ id }) => id), 'news story ID');
  for (const story of record.stories) {
    requireText(story.headline, `news story '${story.id}' headline`);
    requireText(story.reason, `news story '${story.id}' reason`);
    if (
      !['selected', 'deferred', 'rejected'].includes(story.decision)
    ) {
      throw new Error(
        `news story '${story.id}' has invalid decision '${String(story.decision)}'`,
      );
    }
    if (story.decision === 'selected') {
      requireText(story.estimand, `news story '${story.id}' estimand`);
      requireText(story.mechanism, `news story '${story.id}' mechanism`);
    }
    if (story.sourceArtifactIds.length === 0) {
      throw new Error(`news story '${story.id}' needs a source artifact`);
    }
    requireUniqueText(
      story.sourceArtifactIds,
      `news story '${story.id}' source artifact`,
    );
  }
  record.limitations.forEach((limitation) =>
    requireText(limitation, 'news screen limitation')
  );
  assertFiniteJson(record, 'news screen');
}

export function validateNewsModelComparison(
  record: NewsModelComparison,
): void {
  if (
    record.schemaVersion !==
      'forecast-workbench.news-model-comparison/v1'
  ) {
    throw new Error(
      `Unsupported news-model-comparison schema '${String(record.schemaVersion)}'`,
    );
  }
  requireText(record.id, 'news model comparison ID');
  requireText(record.screenRecordId, 'news model comparison screenRecordId');
  requireText(record.storyId, 'news model comparison storyId');
  requireIsoTimestamp(record.createdAt, 'news model comparison createdAt');
  requireText(record.modelQuestion, 'news model comparison modelQuestion');
  requireText(record.targetEstimand, 'news model comparison targetEstimand');
  requireUniqueText(
    record.evidencePacketIds,
    'news model comparison evidence packet',
  );
  if (
    record.iterations.length !== 2 ||
    record.iterations[0].sequence !== 1 ||
    record.iterations[1].sequence !== 2
  ) {
    throw new Error(
      'news model comparison must preserve exactly one V1-to-V2 iteration',
    );
  }
  for (const iteration of record.iterations) {
    requireText(iteration.label, 'news model iteration label');
    requireText(iteration.method, 'news model iteration method');
    requireText(iteration.resultSummary, 'news model iteration resultSummary');
    requireText(
      iteration.runManifestArtifactId,
      'news model iteration runManifestArtifactId',
    );
  }
  if (
    record.iterations[0].runManifestArtifactId ===
    record.iterations[1].runManifestArtifactId
  ) {
    throw new Error('News modeling iterations must cite distinct run manifests');
  }
  if (
    ![
      'accounting-reconciliation',
      'conditional-stress-test',
      'mechanism-check',
    ].includes(record.analysisKind)
  ) {
    throw new Error(
      `Invalid news analysis kind '${String(record.analysisKind)}'`,
    );
  }
  if (
    ![
      'identified-direction',
      'identified-magnitude',
      'conditional-only',
      'not-identified',
    ].includes(record.identificationStatus)
  ) {
    throw new Error(
      `Invalid news identification status '${String(record.identificationStatus)}'`,
    );
  }
  if (
    !['agrees', 'qualifies', 'disagrees', 'not-identified'].includes(
      record.agreement,
    )
  ) {
    throw new Error(
      `Invalid news agreement classification '${String(record.agreement)}'`,
    );
  }
  requireText(
    record.conventionalWisdom,
    'news model comparison conventionalWisdom',
  );
  requireText(record.comparison, 'news model comparison comparison');
  requireText(
    record.notForecastReason,
    'news model comparison notForecastReason',
  );
  record.limitations.forEach((limitation) =>
    requireText(limitation, 'news model comparison limitation')
  );
  assertFiniteJson(record, 'news model comparison');
}

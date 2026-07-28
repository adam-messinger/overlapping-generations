import {
  assertFiniteJson,
  canonicalSha256Id,
  requireIsoTimestamp,
  requireText,
} from './canonical.js';

export type DataClassification = 'public' | 'internal' | 'restricted';
export type ActorRole =
  | 'designer'
  | 'forecaster'
  | 'resolver'
  | 'administrator'
  | 'service';

export interface Actor {
  id: string;
  role: ActorRole;
  displayName?: string;
}

export interface CategoricalOutcome {
  id: string;
  label: string;
}

export interface OrderedOutcomeBin extends CategoricalOutcome {
  lower?: number;
  upper?: number;
  lowerInclusive?: boolean;
  upperInclusive?: boolean;
}

export type OutcomeContract =
  | {
      kind: 'binary';
      negative: CategoricalOutcome;
      positive: CategoricalOutcome;
    }
  | {
      kind: 'categorical';
      outcomes: readonly CategoricalOutcome[];
    }
  | {
      kind: 'ordered-categorical';
      bins: readonly OrderedOutcomeBin[];
      unit: string;
    }
  | {
      kind: 'continuous';
      unit: string;
      minimum?: number;
      maximum?: number;
    };

export type ResolutionRevisionRule =
  | { kind: 'first-release' }
  | { kind: 'as-of'; cutoffAt: string }
  | { kind: 'final-after'; delayDays: number }
  | { kind: 'latest-at'; cutoffAt: string };

export interface ResolverContract {
  id: string;
  version: string;
  sourceId: string;
  description: string;
  implementationHash: string;
  queryDescription: string;
  targetField: string;
  statistic: string;
  expectedPublicationAt?: string;
  revisionRule: ResolutionRevisionRule;
  fallback?: {
    resolverId: string;
    rule: string;
  };
  cancellationRule: string;
}

export interface ForecastQuestion {
  schemaVersion: 'forecast-workbench.question/v1';
  id: string;
  version: string;
  title: string;
  description: string;
  decisionContext?: string;
  targetEstimandId: string;
  opensAt: string;
  closesAt: string;
  expectedResolutionAt?: string;
  outcome: OutcomeContract;
  resolver: ResolverContract;
  createdAt: string;
}

export type PreflightCheckStatus = 'pass' | 'warning' | 'fail';

export interface PreflightCheck {
  id: string;
  status: PreflightCheckStatus;
  message: string;
  details?: unknown;
}

export interface QuestionPreflight {
  schemaVersion: 'forecast-workbench.preflight/v1';
  questionHash: string;
  checkedAt: string;
  designerId: string;
  resolverProbeArtifactId?: string;
  checks: readonly PreflightCheck[];
  disclosedPacketIds: readonly string[];
  designerOnlyPacketIds: readonly string[];
  soloWorkflow: boolean;
  alreadySeenNotes?: string;
}

export type Prediction =
  | {
      kind: 'binary';
      positiveOutcomeId: string;
      probability: number;
    }
  | {
      kind: 'categorical' | 'ordered-categorical';
      probabilities: Readonly<Record<string, number>>;
    }
  | {
      kind: 'quantiles';
      quantiles: readonly {
        probability: number;
        value: number;
      }[];
    }
  | {
      kind: 'samples';
      values: readonly number[];
    };

export type ModelUse = 'none' | 'consulted' | 'conditioned';

export type ForecastUpdateBasis =
  | { kind: 'launch'; note?: string }
  | { kind: 'evidence'; exposureIds: readonly string[]; note?: string }
  | { kind: 'model-run'; modelForecastIds: readonly string[]; note?: string }
  | { kind: 'no-news'; monitorCheckIds: readonly string[]; note?: string }
  | { kind: 'correction'; correctedForecastId: string; note: string };

export interface InformationSet {
  schemaVersion: 'forecast-workbench.information-set/v1';
  questionHash: string;
  forecasterId: string;
  seriesId: string;
  disclosedPreflightPacketIds: readonly string[];
  exposureIds: readonly string[];
  declaredExternalInformation: readonly string[];
  computedAt: string;
}

export interface ForecastVersion {
  schemaVersion: 'forecast-workbench.forecast/v1';
  questionHash: string;
  questionId: string;
  questionVersion: string;
  forecasterId: string;
  seriesId: string;
  sealedAt: string;
  prediction: Prediction;
  informationSetArtifactId: string;
  updateBasis: ForecastUpdateBasis;
  modelUse: ModelUse;
  modelForecastIds: readonly string[];
  referenceClassIds: readonly string[];
  conditionalSetIds: readonly string[];
  rationale: string;
  strongestContraryCase: string;
  supersedesForecastId?: string;
}

export interface EvidencePacket {
  schemaVersion: 'forecast-workbench.evidence-packet/v1';
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  viewArtifactId: string;
  snapshotIds: readonly string[];
  observationVersionIds: readonly string[];
  derivedFromArtifactIds: readonly string[];
  classification: DataClassification;
  license?: string;
  accessPolicy?: string;
}

export interface EvidenceExposure {
  schemaVersion: 'forecast-workbench.evidence-exposure/v1';
  questionHash: string;
  forecasterId: string;
  seriesId: string;
  packetId: string;
  exposedAt: string;
  forecastIdBeforeExposure: string;
  breakGlass?: {
    reason: string;
    authorizedBy: string;
  };
}

export interface ForecastDiscrepancy {
  kind: 'none' | 'mixture' | 'tail-floor' | 'qualitative';
  description: string;
  parameters?: Readonly<Record<string, number>>;
}

export interface ModelForecast {
  schemaVersion: 'forecast-workbench.model-forecast/v1';
  id: string;
  questionHash: string;
  createdAt: string;
  runManifestArtifactId: string;
  runId: string;
  modelId: string;
  modelVersion: string;
  adapter: {
    id: string;
    version: string;
    implementationHash: string;
    configurationHash: string;
  };
  adapterInputArtifactIds: readonly string[];
  sourceEstimandIds: readonly string[];
  targetEstimandId: string;
  semanticCrosswalkIds: readonly string[];
  measurementCrosswalkIds: readonly string[];
  discrepancy: ForecastDiscrepancy;
  prediction?: Prediction;
  identified: boolean;
  notIdentifiedReason?: string;
}

export type ResolutionStatus =
  | 'pending'
  | 'provisional'
  | 'final'
  | 'cancelled'
  | 'disputed'
  | 'amended';

export interface ResolutionVersion {
  schemaVersion: 'forecast-workbench.resolution/v1';
  questionHash: string;
  status: ResolutionStatus;
  resolvedAt: string;
  resolverId: string;
  resolverVersion: string;
  resolverImplementationHash: string;
  snapshotIds: readonly string[];
  observationVersionIds: readonly string[];
  derivedValue?: number | string | boolean;
  outcomeId?: string;
  mappingExplanation?: string;
  fallbackInvoked?: string;
  adjudication?: string;
  supersedesResolutionId?: string;
}

function uniqueIds(values: readonly { id: string }[], context: string): void {
  const ids = new Set<string>();
  for (const value of values) {
    requireText(value.id, `${context} ID`);
    if (ids.has(value.id)) throw new Error(`${context} has duplicate ID '${value.id}'`);
    ids.add(value.id);
  }
}

function uniqueTextValues(
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

export function outcomeIds(outcome: OutcomeContract): readonly string[] {
  if (outcome.kind === 'binary') return [outcome.negative.id, outcome.positive.id];
  if (outcome.kind === 'categorical') return outcome.outcomes.map(({ id }) => id);
  if (outcome.kind === 'ordered-categorical') return outcome.bins.map(({ id }) => id);
  return [];
}

export function validateOutcomeContract(
  outcome: OutcomeContract,
  context = 'outcome',
): void {
  if (outcome.kind === 'binary') {
    uniqueIds([outcome.negative, outcome.positive], context);
    requireText(outcome.negative.label, `${context} negative label`);
    requireText(outcome.positive.label, `${context} positive label`);
    return;
  }
  if (outcome.kind === 'categorical') {
    if (outcome.outcomes.length < 2) throw new Error(`${context} needs at least two outcomes`);
    uniqueIds(outcome.outcomes, context);
    outcome.outcomes.forEach((value) => requireText(value.label, `${context} label`));
    return;
  }
  if (outcome.kind === 'continuous') {
    requireText(outcome.unit, `${context} unit`);
    if (outcome.minimum !== undefined && !Number.isFinite(outcome.minimum)) {
      throw new Error(`${context} minimum must be finite`);
    }
    if (outcome.maximum !== undefined && !Number.isFinite(outcome.maximum)) {
      throw new Error(`${context} maximum must be finite`);
    }
    if (outcome.minimum !== undefined && outcome.maximum !== undefined &&
        outcome.maximum < outcome.minimum) {
      throw new Error(`${context} maximum precedes minimum`);
    }
    return;
  }
  requireText(outcome.unit, `${context} unit`);
  if (outcome.bins.length < 2) throw new Error(`${context} needs at least two bins`);
  uniqueIds(outcome.bins, context);
  if (outcome.bins[0].lower !== undefined) {
    throw new Error(`${context} first bin must be open below`);
  }
  if (outcome.bins.at(-1)?.upper !== undefined) {
    throw new Error(`${context} last bin must be open above`);
  }
  for (let index = 0; index < outcome.bins.length; index++) {
    const bin = outcome.bins[index];
    requireText(bin.label, `${context} bin label`);
    if (bin.lower !== undefined && !Number.isFinite(bin.lower)) {
      throw new Error(`${context} bin '${bin.id}' lower bound must be finite`);
    }
    if (bin.upper !== undefined && !Number.isFinite(bin.upper)) {
      throw new Error(`${context} bin '${bin.id}' upper bound must be finite`);
    }
    if (bin.lower !== undefined && bin.upper !== undefined && bin.upper <= bin.lower) {
      throw new Error(`${context} bin '${bin.id}' bounds are invalid`);
    }
    if (index === 0) continue;
    const previous = outcome.bins[index - 1];
    if (previous.upper !== bin.lower) {
      throw new Error(`${context} bins '${previous.id}' and '${bin.id}' have a gap or overlap`);
    }
    const previousIncludes = previous.upperInclusive ?? false;
    const currentIncludes = bin.lowerInclusive ?? true;
    if (previousIncludes === currentIncludes) {
      throw new Error(
        `${context} boundary between '${previous.id}' and '${bin.id}' must belong to exactly one bin`,
      );
    }
  }
}

export function validateResolverContract(
  resolver: ResolverContract,
  context = 'resolver',
): void {
  requireText(resolver.id, `${context}.id`);
  requireText(resolver.version, `${context}.version`);
  requireText(resolver.sourceId, `${context}.sourceId`);
  requireText(resolver.description, `${context}.description`);
  requireText(resolver.implementationHash, `${context}.implementationHash`);
  requireText(resolver.queryDescription, `${context}.queryDescription`);
  requireText(resolver.targetField, `${context}.targetField`);
  requireText(resolver.statistic, `${context}.statistic`);
  requireText(resolver.cancellationRule, `${context}.cancellationRule`);
  if (resolver.fallback) {
    requireText(resolver.fallback.resolverId, `${context}.fallback.resolverId`);
    requireText(resolver.fallback.rule, `${context}.fallback.rule`);
  }
  if (resolver.expectedPublicationAt) {
    requireIsoTimestamp(resolver.expectedPublicationAt, `${context}.expectedPublicationAt`);
  }
  if (resolver.revisionRule.kind === 'as-of' ||
      resolver.revisionRule.kind === 'latest-at') {
    requireIsoTimestamp(resolver.revisionRule.cutoffAt, `${context}.revisionRule.cutoffAt`);
  }
  if (resolver.revisionRule.kind === 'final-after' &&
      (!Number.isFinite(resolver.revisionRule.delayDays) ||
       resolver.revisionRule.delayDays < 0)) {
    throw new Error(`${context}.revisionRule.delayDays must be non-negative`);
  }
}

export function validateForecastQuestion(question: ForecastQuestion): void {
  if (question.schemaVersion !== 'forecast-workbench.question/v1') {
    throw new Error(`Unsupported question schema '${String(question.schemaVersion)}'`);
  }
  requireText(question.id, 'question.id');
  requireText(question.version, 'question.version');
  requireText(question.title, 'question.title');
  requireText(question.description, 'question.description');
  if (question.decisionContext !== undefined) {
    requireText(question.decisionContext, 'question.decisionContext');
  }
  requireText(question.targetEstimandId, 'question.targetEstimandId');
  requireIsoTimestamp(question.opensAt, 'question.opensAt');
  requireIsoTimestamp(question.closesAt, 'question.closesAt');
  requireIsoTimestamp(question.createdAt, 'question.createdAt');
  if (question.expectedResolutionAt) {
    requireIsoTimestamp(question.expectedResolutionAt, 'question.expectedResolutionAt');
  }
  if (Date.parse(question.closesAt) <= Date.parse(question.opensAt)) {
    throw new Error('question.closesAt must follow question.opensAt');
  }
  if (Date.parse(question.createdAt) > Date.parse(question.closesAt)) {
    throw new Error('question.createdAt must not follow question.closesAt');
  }
  if (
    question.expectedResolutionAt &&
    Date.parse(question.expectedResolutionAt) < Date.parse(question.closesAt)
  ) {
    throw new Error(
      'question.expectedResolutionAt must not precede question.closesAt',
    );
  }
  if (
    question.resolver.expectedPublicationAt &&
    Date.parse(question.resolver.expectedPublicationAt) <
      Date.parse(question.closesAt)
  ) {
    throw new Error(
      'question resolver publication must not precede question.closesAt',
    );
  }
  validateOutcomeContract(question.outcome, 'question.outcome');
  validateResolverContract(question.resolver, 'question.resolver');
}

export function questionHash(question: ForecastQuestion): string {
  validateForecastQuestion(question);
  return canonicalSha256Id(question);
}

function validateProbability(value: number, context: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${context} must be in [0, 1]`);
  }
}

export function validatePrediction(
  prediction: Prediction,
  outcome: OutcomeContract,
  context = 'prediction',
): void {
  assertFiniteJson(prediction, context);
  if (prediction.kind === 'binary') {
    if (outcome.kind !== 'binary') throw new Error(`${context} is binary for a non-binary question`);
    if (prediction.positiveOutcomeId !== outcome.positive.id) {
      throw new Error(`${context} positive outcome does not match the question`);
    }
    validateProbability(prediction.probability, `${context}.probability`);
    return;
  }
  if (prediction.kind === 'categorical' || prediction.kind === 'ordered-categorical') {
    if (outcome.kind !== prediction.kind) {
      throw new Error(`${context} kind does not match question outcome kind`);
    }
    const expected = [...outcomeIds(outcome)].sort();
    const actual = Object.keys(prediction.probabilities).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new Error(`${context} outcome IDs do not match the question`);
    }
    let total = 0;
    for (const [id, value] of Object.entries(prediction.probabilities)) {
      validateProbability(value, `${context}.${id}`);
      total += value;
    }
    if (Math.abs(total - 1) > 1e-9) {
      throw new Error(`${context} probabilities must sum to 1`);
    }
    return;
  }
  if (outcome.kind !== 'continuous') {
    throw new Error(`${context} is continuous for a categorical question`);
  }
  if (prediction.kind === 'samples') {
    if (prediction.values.length === 0) throw new Error(`${context} samples must not be empty`);
    return;
  }
  if (prediction.kind !== 'quantiles') {
    throw new Error(`${context} kind does not match continuous question`);
  }
  if (prediction.quantiles.length < 2) throw new Error(`${context} needs at least two quantiles`);
  let priorProbability = -1;
  let priorValue = Number.NEGATIVE_INFINITY;
  for (const row of prediction.quantiles) {
    if (row.probability <= priorProbability || row.probability <= 0 || row.probability >= 1) {
      throw new Error(`${context} quantile probabilities must be strictly increasing in (0, 1)`);
    }
    if (row.value < priorValue) throw new Error(`${context} quantile values must be nondecreasing`);
    priorProbability = row.probability;
    priorValue = row.value;
  }
}

export function validateQuestionPreflight(preflight: QuestionPreflight): void {
  if (preflight.schemaVersion !== 'forecast-workbench.preflight/v1') {
    throw new Error(`Unsupported preflight schema '${String(preflight.schemaVersion)}'`);
  }
  requireText(preflight.questionHash, 'preflight.questionHash');
  requireIsoTimestamp(preflight.checkedAt, 'preflight.checkedAt');
  requireText(preflight.designerId, 'preflight.designerId');
  if (preflight.resolverProbeArtifactId !== undefined) {
    requireText(
      preflight.resolverProbeArtifactId,
      'preflight.resolverProbeArtifactId',
    );
  }
  if (!Array.isArray(preflight.checks) || preflight.checks.length === 0) {
    throw new Error('Preflight must contain at least one check');
  }
  const ids = new Set<string>();
  for (const check of preflight.checks) {
    requireText(check.id, 'preflight check ID');
    requireText(check.message, `preflight check '${check.id}' message`);
    if (!['pass', 'warning', 'fail'].includes(check.status)) {
      throw new Error(
        `Preflight check '${check.id}' has invalid status '${String(check.status)}'`,
      );
    }
    if (check.details !== undefined) {
      assertFiniteJson(check.details, `preflight check '${check.id}' details`);
    }
    if (ids.has(check.id)) throw new Error(`Duplicate preflight check '${check.id}'`);
    ids.add(check.id);
  }
  uniqueTextValues(
    preflight.disclosedPacketIds,
    'preflight disclosed packet ID',
  );
  uniqueTextValues(
    preflight.designerOnlyPacketIds,
    'preflight designer-only packet ID',
  );
  const disclosed = new Set(preflight.disclosedPacketIds);
  for (const packetId of preflight.designerOnlyPacketIds) {
    if (disclosed.has(packetId)) {
      throw new Error(
        `Preflight packet '${packetId}' cannot be both disclosed and designer-only`,
      );
    }
  }
  if (preflight.alreadySeenNotes !== undefined) {
    requireText(preflight.alreadySeenNotes, 'preflight alreadySeenNotes');
  }
}

export function validateEvidencePacket(packet: EvidencePacket): void {
  if (packet.schemaVersion !== 'forecast-workbench.evidence-packet/v1') {
    throw new Error(`Unsupported evidence packet schema '${String(packet.schemaVersion)}'`);
  }
  requireText(packet.id, 'evidencePacket.id');
  requireText(packet.title, 'evidencePacket.title');
  if (packet.description !== undefined) {
    requireText(packet.description, 'evidencePacket.description');
  }
  requireIsoTimestamp(packet.createdAt, 'evidencePacket.createdAt');
  requireText(packet.viewArtifactId, 'evidencePacket.viewArtifactId');
  uniqueTextValues(packet.snapshotIds, 'evidencePacket snapshot ID');
  uniqueTextValues(
    packet.observationVersionIds,
    'evidencePacket observation version ID',
  );
  uniqueTextValues(
    packet.derivedFromArtifactIds,
    'evidencePacket derived artifact ID',
  );
  if (!['public', 'internal', 'restricted'].includes(packet.classification)) {
    throw new Error(
      `Invalid evidence classification '${String(packet.classification)}'`,
    );
  }
  if (packet.license !== undefined) {
    requireText(packet.license, 'evidencePacket.license');
  }
  if (packet.accessPolicy !== undefined) {
    requireText(packet.accessPolicy, 'evidencePacket.accessPolicy');
  }
}

export function validateModelForecast(forecast: ModelForecast): void {
  if (forecast.schemaVersion !== 'forecast-workbench.model-forecast/v1') {
    throw new Error(
      `Unsupported model forecast schema '${String(forecast.schemaVersion)}'`,
    );
  }
  requireText(forecast.id, 'modelForecast.id');
  requireText(forecast.questionHash, 'modelForecast.questionHash');
  requireIsoTimestamp(forecast.createdAt, 'modelForecast.createdAt');
  requireText(
    forecast.runManifestArtifactId,
    'modelForecast.runManifestArtifactId',
  );
  requireText(forecast.runId, 'modelForecast.runId');
  requireText(forecast.modelId, 'modelForecast.modelId');
  requireText(forecast.modelVersion, 'modelForecast.modelVersion');
  requireText(forecast.adapter.id, 'modelForecast.adapter.id');
  requireText(forecast.adapter.version, 'modelForecast.adapter.version');
  requireText(
    forecast.adapter.implementationHash,
    'modelForecast.adapter.implementationHash',
  );
  requireText(
    forecast.adapter.configurationHash,
    'modelForecast.adapter.configurationHash',
  );
  uniqueTextValues(
    forecast.adapterInputArtifactIds,
    'modelForecast adapter input artifact ID',
  );
  uniqueTextValues(
    forecast.sourceEstimandIds,
    'modelForecast source estimand ID',
  );
  requireText(forecast.targetEstimandId, 'modelForecast.targetEstimandId');
  uniqueTextValues(
    forecast.semanticCrosswalkIds,
    'modelForecast semantic crosswalk ID',
  );
  uniqueTextValues(
    forecast.measurementCrosswalkIds,
    'modelForecast measurement crosswalk ID',
  );
  if (
    !['none', 'mixture', 'tail-floor', 'qualitative'].includes(
      forecast.discrepancy.kind,
    )
  ) {
    throw new Error(
      `Invalid model discrepancy kind '${String(forecast.discrepancy.kind)}'`,
    );
  }
  requireText(
    forecast.discrepancy.description,
    'modelForecast.discrepancy.description',
  );
  if (forecast.discrepancy.parameters !== undefined) {
    assertFiniteJson(
      forecast.discrepancy.parameters,
      'modelForecast.discrepancy.parameters',
    );
  }
  if (forecast.identified !== Boolean(forecast.prediction)) {
    throw new Error(
      'Identified model forecasts must carry a prediction, and vice versa',
    );
  }
  if (!forecast.identified) {
    requireText(
      forecast.notIdentifiedReason,
      'modelForecast.notIdentifiedReason',
    );
  }
}

export function validateResolutionVersion(
  resolution: ResolutionVersion,
): void {
  if (resolution.schemaVersion !== 'forecast-workbench.resolution/v1') {
    throw new Error(
      `Unsupported resolution schema '${String(resolution.schemaVersion)}'`,
    );
  }
  requireText(resolution.questionHash, 'resolution.questionHash');
  if (
    ![
      'pending',
      'provisional',
      'final',
      'cancelled',
      'disputed',
      'amended',
    ].includes(resolution.status)
  ) {
    throw new Error(`Invalid resolution status '${String(resolution.status)}'`);
  }
  requireIsoTimestamp(resolution.resolvedAt, 'resolution.resolvedAt');
  requireText(resolution.resolverId, 'resolution.resolverId');
  requireText(resolution.resolverVersion, 'resolution.resolverVersion');
  requireText(
    resolution.resolverImplementationHash,
    'resolution.resolverImplementationHash',
  );
  uniqueTextValues(resolution.snapshotIds, 'resolution snapshot ID');
  uniqueTextValues(
    resolution.observationVersionIds,
    'resolution observation version ID',
  );
  if (typeof resolution.derivedValue === 'number') {
    assertFiniteJson(resolution.derivedValue, 'resolution.derivedValue');
  }
  if (resolution.outcomeId !== undefined) {
    requireText(resolution.outcomeId, 'resolution.outcomeId');
  }
  if (resolution.mappingExplanation !== undefined) {
    requireText(
      resolution.mappingExplanation,
      'resolution.mappingExplanation',
    );
  }
  if (resolution.fallbackInvoked !== undefined) {
    requireText(resolution.fallbackInvoked, 'resolution.fallbackInvoked');
  }
  if (resolution.adjudication !== undefined) {
    requireText(resolution.adjudication, 'resolution.adjudication');
  }
  if (resolution.supersedesResolutionId !== undefined) {
    requireText(
      resolution.supersedesResolutionId,
      'resolution.supersedesResolutionId',
    );
  }
}

export function validateForecastVersion(
  forecast: ForecastVersion,
  question: ForecastQuestion,
): void {
  if (forecast.schemaVersion !== 'forecast-workbench.forecast/v1') {
    throw new Error(`Unsupported forecast schema '${String(forecast.schemaVersion)}'`);
  }
  if (forecast.questionHash !== questionHash(question) ||
      forecast.questionId !== question.id ||
      forecast.questionVersion !== question.version) {
    throw new Error('Forecast question binding does not match');
  }
  requireText(forecast.forecasterId, 'forecast.forecasterId');
  requireText(forecast.seriesId, 'forecast.seriesId');
  requireIsoTimestamp(forecast.sealedAt, 'forecast.sealedAt');
  if (
    Date.parse(forecast.sealedAt) < Date.parse(question.opensAt) ||
    Date.parse(forecast.sealedAt) >= Date.parse(question.closesAt)
  ) {
    throw new Error('Forecast sealedAt must fall inside the question window');
  }
  requireText(forecast.informationSetArtifactId, 'forecast.informationSetArtifactId');
  requireText(forecast.rationale, 'forecast.rationale');
  requireText(forecast.strongestContraryCase, 'forecast.strongestContraryCase');
  uniqueTextValues(forecast.modelForecastIds, 'forecast model ID');
  uniqueTextValues(forecast.referenceClassIds, 'forecast reference-class ID');
  uniqueTextValues(forecast.conditionalSetIds, 'forecast conditional-set ID');
  if (!['none', 'consulted', 'conditioned'].includes(forecast.modelUse)) {
    throw new Error(`Invalid forecast model use '${String(forecast.modelUse)}'`);
  }
  if (forecast.updateBasis.note !== undefined) {
    requireText(forecast.updateBasis.note, 'forecast update-basis note');
  }
  if (forecast.updateBasis.kind === 'evidence') {
    uniqueTextValues(
      forecast.updateBasis.exposureIds,
      'forecast evidence exposure ID',
    );
    if (forecast.updateBasis.exposureIds.length === 0) {
      throw new Error('Evidence update basis must cite an exposure');
    }
  } else if (forecast.updateBasis.kind === 'model-run') {
    uniqueTextValues(
      forecast.updateBasis.modelForecastIds,
      'forecast update model ID',
    );
    if (forecast.updateBasis.modelForecastIds.length === 0) {
      throw new Error('Model-run update basis must cite a model forecast');
    }
  } else if (forecast.updateBasis.kind === 'no-news') {
    uniqueTextValues(
      forecast.updateBasis.monitorCheckIds,
      'forecast monitor-check ID',
    );
    if (forecast.updateBasis.monitorCheckIds.length === 0) {
      throw new Error('No-news update basis must cite a monitor check');
    }
  } else if (forecast.updateBasis.kind === 'correction') {
    requireText(
      forecast.updateBasis.correctedForecastId,
      'forecast correctedForecastId',
    );
    requireText(forecast.updateBasis.note, 'forecast correction note');
  } else if (forecast.updateBasis.kind !== 'launch') {
    throw new Error(
      `Invalid forecast update basis '${String(
        (forecast.updateBasis as { kind?: unknown }).kind,
      )}'`,
    );
  }
  validatePrediction(forecast.prediction, question.outcome);
  if (forecast.modelUse === 'none' && forecast.modelForecastIds.length > 0) {
    throw new Error('Forecast with modelUse none must not cite model forecasts');
  }
  if (forecast.modelUse !== 'none' && forecast.modelForecastIds.length === 0) {
    throw new Error('Forecast that used a model must cite a model forecast');
  }
}

export function mapNumericOutcome(
  outcome: OutcomeContract,
  value: number,
): string | undefined {
  if (!Number.isFinite(value)) throw new Error('Resolved numeric value must be finite');
  if (outcome.kind === 'continuous') return undefined;
  if (outcome.kind !== 'ordered-categorical') {
    throw new Error('Numeric outcome mapping requires an ordered or continuous question');
  }
  for (const bin of outcome.bins) {
    const aboveLower = bin.lower === undefined ||
      value > bin.lower ||
      (value === bin.lower && (bin.lowerInclusive ?? true));
    const belowUpper = bin.upper === undefined ||
      value < bin.upper ||
      (value === bin.upper && (bin.upperInclusive ?? false));
    if (aboveLower && belowUpper) return bin.id;
  }
  throw new Error(`No outcome bin contains ${value}`);
}

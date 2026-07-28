import type Database from 'better-sqlite3';
import { parseRunManifest } from 'tsimulation';
import {
  mapNumericOutcome,
  outcomeIds,
  questionHash,
  validateEvidencePacket,
  validateForecastQuestion,
  validateForecastVersion,
  validateModelForecast,
  validatePrediction,
  validateQuestionPreflight,
  validateResolutionVersion,
  type Actor,
  type DataClassification,
  type EvidenceExposure,
  type EvidencePacket,
  type ForecastQuestion,
  type ForecastUpdateBasis,
  type ForecastVersion,
  type InformationSet,
  type ModelForecast,
  type ModelUse,
  type Prediction,
  type QuestionPreflight,
  type ResolutionVersion,
} from './contracts.js';
import { canonicalJson, type Clock } from './canonical.js';
import { ForecastLedger, type RecordReference } from './ledger.js';
import {
  DEFAULT_SCORING_SPECIFICATION,
  scorePrediction,
  timeWeightedScore,
  type ScoreRecord,
  type ScoreSeriesSummary,
  type ScoringSpecification,
} from './scoring.js';
import {
  validateAcquisitionReceipt,
  validateObservationVersion,
  validateSourceRelease,
  type AcquisitionReceipt,
  type ObservationVersion,
  type SourceRelease,
} from './vintage.js';
import {
  validateReferenceClass,
  type ReferenceClassVersion,
} from './reference-classes.js';
import {
  validateConditionalSet,
  type ConditionalForecastSet,
} from './conditionals.js';
import {
  aggregatePredictions,
  validateAggregationRecord,
  type AggregationRecord,
} from './aggregation.js';
import {
  validateMonitorCheck,
  validateTrigger,
  type MonitorCheck,
  type TriggerDefinition,
} from './monitoring.js';
import {
  validateNewsModelComparison,
  validateNewsScreen,
  type NewsModelComparison,
  type NewsScreenRecord,
} from './news-workflow.js';
import {
  validateDatasetSnapshot,
  type DatasetSnapshot,
} from './dataset-snapshots.js';

interface SeriesState {
  forecast_required: number;
  last_forecast_id: string | null;
  last_exposure_id: string | null;
}

interface QuestionRow {
  record_artifact_id: string;
  opens_at: string;
  closes_at: string;
  first_forecast_id: string | null;
}

export class ForecastWorkbench {
  readonly ledger: ForecastLedger;

  constructor(
    root: string,
    readonly clock: Clock,
  ) {
    this.ledger = new ForecastLedger(root, clock);
  }

  async initialize(): Promise<void> {
    await this.ledger.initialize();
  }

  close(): void {
    this.ledger.close();
  }

  async registerQuestion(
    actor: Actor,
    question: ForecastQuestion,
  ): Promise<RecordReference> {
    validateForecastQuestion(question);
    const hash = questionHash(question);
    return this.ledger.appendRecord({
      actor,
      kind: 'question.registered',
      recordType: 'question',
      record: question,
      classification: 'internal',
      validateProjection: (database) => {
        const existing = database.prepare(
          'SELECT 1 FROM questions WHERE question_hash = ? OR (question_id = ? AND question_version = ?)',
        ).get(hash, question.id, question.version);
        if (existing) throw new Error(`Question '${question.id}' version '${question.version}' exists`);
      },
    });
  }

  async recordPreflight(
    actor: Actor,
    preflight: QuestionPreflight,
  ): Promise<RecordReference> {
    validateQuestionPreflight(preflight);
    for (const packetId of [
      ...preflight.disclosedPacketIds,
      ...preflight.designerOnlyPacketIds,
    ]) {
      this.requireRecordType(this.ledger.db(), packetId, 'evidence-packet');
    }
    if (
      preflight.resolverProbeArtifactId &&
      !await this.ledger.artifacts.has(preflight.resolverProbeArtifactId)
    ) {
      throw new Error(
        `Missing resolver-probe artifact '${preflight.resolverProbeArtifactId}'`,
      );
    }
    return this.ledger.appendRecord({
      actor,
      kind: 'question.preflighted',
      recordType: 'preflight',
      record: preflight,
      classification: 'internal',
      validateProjection: (database) => {
        const question = database.prepare(
          'SELECT first_forecast_id FROM questions WHERE question_hash = ?',
        ).get(preflight.questionHash) as { first_forecast_id: string | null } | undefined;
        if (!question) throw new Error(`Unknown question '${preflight.questionHash}'`);
        if (question.first_forecast_id) {
          throw new Error('Question preflight cannot change after the first forecast is sealed');
        }
      },
    });
  }

  async createEvidencePacket(options: {
    actor: Actor;
    id: string;
    title: string;
    description?: string;
    view: string | Uint8Array | unknown;
    mediaType?: string;
    snapshotIds?: readonly string[];
    observationVersionIds?: readonly string[];
    derivedFromArtifactIds?: readonly string[];
    classification?: DataClassification;
    license?: string;
    accessPolicy?: string;
  }): Promise<RecordReference> {
    const classification = options.classification ?? 'internal';
    const viewArtifact = typeof options.view === 'string' || options.view instanceof Uint8Array
      ? await this.ledger.artifacts.put(options.view, {
          mediaType: options.mediaType ?? (
            typeof options.view === 'string' ? 'text/plain' : 'application/octet-stream'
          ),
          classification,
        })
      : await this.ledger.artifacts.putCanonical(options.view, { classification });
    const packet: EvidencePacket = {
      schemaVersion: 'forecast-workbench.evidence-packet/v1',
      id: options.id,
      title: options.title,
      ...(options.description ? { description: options.description } : {}),
      createdAt: this.clock.now().toISOString(),
      viewArtifactId: viewArtifact.id,
      snapshotIds: [...(options.snapshotIds ?? [])],
      observationVersionIds: [...(options.observationVersionIds ?? [])],
      derivedFromArtifactIds: [...(options.derivedFromArtifactIds ?? [])],
      classification,
      ...(options.license ? { license: options.license } : {}),
      ...(options.accessPolicy ? { accessPolicy: options.accessPolicy } : {}),
    };
    validateEvidencePacket(packet);
    for (const artifactId of packet.derivedFromArtifactIds) {
      if (!await this.ledger.artifacts.has(artifactId)) {
        throw new Error(`Missing derived evidence artifact '${artifactId}'`);
      }
    }
    for (const observationVersionId of packet.observationVersionIds) {
      this.requireRecordType(
        this.ledger.db(),
        observationVersionId,
        'observation-version',
      );
    }
    return this.ledger.appendRecord({
      actor: options.actor,
      kind: 'evidence.packet-created',
      recordType: 'evidence-packet',
      record: packet,
      classification,
      validateProjection: (database) => {
        const existing = database.prepare(
          'SELECT 1 FROM evidence_packets WHERE logical_id = ?',
        ).get(packet.id);
        if (existing) throw new Error(`Evidence packet '${packet.id}' already exists`);
      },
    });
  }

  async recordAcquisition(
    actor: Actor,
    receipt: AcquisitionReceipt,
  ): Promise<RecordReference> {
    validateAcquisitionReceipt(receipt);
    if (await this.findLogicalRecordId<AcquisitionReceipt>(
      'acquisition-receipt',
      receipt.id,
    )) {
      throw new Error(`Acquisition receipt '${receipt.id}' already exists`);
    }
    for (const artifactId of [
      receipt.sanitizedRequestArtifactId,
      receipt.rawArtifactId,
      ...(receipt.schemaArtifactId ? [receipt.schemaArtifactId] : []),
    ]) {
      if (!await this.ledger.artifacts.has(artifactId)) {
        throw new Error(`Missing acquisition artifact '${artifactId}'`);
      }
    }
    return this.ledger.appendRecord({
      actor,
      kind: 'acquisition.completed',
      recordType: 'acquisition-receipt',
      record: receipt,
      classification: receipt.classification,
    });
  }

  async recordSourceRelease(
    actor: Actor,
    release: SourceRelease,
  ): Promise<RecordReference> {
    validateSourceRelease(release);
    if (await this.findLogicalRecordId<SourceRelease>(
      'source-release',
      release.id,
    )) {
      throw new Error(`Source release '${release.id}' already exists`);
    }
    const receipt = await this.ledger.getRecord<AcquisitionReceipt>(
      release.acquisitionReceiptId,
    );
    if (receipt.sourceId !== release.sourceId) {
      throw new Error('Source release and acquisition receipt source IDs differ');
    }
    return this.ledger.appendRecord({
      actor,
      kind: 'source.release-captured',
      recordType: 'source-release',
      record: release,
      classification: receipt.classification,
    });
  }

  async recordObservationVersion(
    actor: Actor,
    version: ObservationVersion,
    classification: DataClassification = 'internal',
  ): Promise<RecordReference> {
    validateObservationVersion(version);
    if (await this.findLogicalRecordId<ObservationVersion>(
      'observation-version',
      version.id,
    )) {
      throw new Error(`Observation version '${version.id}' already exists`);
    }
    const releaseRecordId = await this.findLogicalRecordId<SourceRelease>(
      'source-release',
      version.releaseId,
    );
    if (!releaseRecordId) {
      throw new Error(`Unknown source release '${version.releaseId}'`);
    }
    const release = await this.ledger.getRecord<SourceRelease>(releaseRecordId);
    if (Date.parse(version.availableAt) < Date.parse(release.availableAt)) {
      throw new Error('Observation version cannot predate its source release');
    }
    if (version.predecessorId) {
      const predecessorRecordId =
        await this.findLogicalRecordId<ObservationVersion>(
          'observation-version',
          version.predecessorId,
        );
      if (!predecessorRecordId) {
        throw new Error(
          `Unknown observation predecessor '${version.predecessorId}'`,
        );
      }
      const predecessor = await this.ledger.getRecord<ObservationVersion>(
        predecessorRecordId,
      );
      if (predecessor.observationKeyId !== version.observationKeyId) {
        throw new Error('Observation predecessor has a different key');
      }
    }
    return this.ledger.appendRecord({
      actor,
      kind: `observation.${version.status}`,
      recordType: 'observation-version',
      record: version,
      classification,
    });
  }

  async recordDatasetSnapshot(
    actor: Actor,
    snapshot: DatasetSnapshot,
  ): Promise<RecordReference> {
    validateDatasetSnapshot(snapshot);
    if (await this.findLogicalRecordId<DatasetSnapshot>(
      'dataset-snapshot',
      snapshot.id,
    )) {
      throw new Error(`Dataset snapshot '${snapshot.id}' already exists`);
    }
    for (const recordId of snapshot.acquisitionReceiptIds) {
      this.requireRecordType(
        this.ledger.db(),
        recordId,
        'acquisition-receipt',
      );
    }
    for (const artifactId of [
      ...snapshot.dataArtifactIds,
      ...snapshot.schemaArtifactIds,
      ...snapshot.semanticCrosswalkArtifactIds,
    ]) {
      if (!await this.ledger.artifacts.has(artifactId)) {
        throw new Error(`Missing dataset snapshot artifact '${artifactId}'`);
      }
    }
    if (snapshot.predecessorSnapshotId) {
      this.requireRecordType(
        this.ledger.db(),
        snapshot.predecessorSnapshotId,
        'dataset-snapshot',
      );
      const predecessor = await this.ledger.getRecord<DatasetSnapshot>(
        snapshot.predecessorSnapshotId,
      );
      if (predecessor.datasetId !== snapshot.datasetId) {
        throw new Error(
          'Dataset snapshot predecessor belongs to a different dataset',
        );
      }
      if (Date.parse(predecessor.createdAt) > Date.parse(snapshot.createdAt)) {
        throw new Error(
          'Dataset snapshot predecessor was created after the new snapshot',
        );
      }
    }
    for (const recordId of this.ledger.listRecordIds('dataset-snapshot')) {
      const existing = await this.ledger.getRecord<DatasetSnapshot>(recordId);
      if (
        existing.datasetId === snapshot.datasetId &&
        existing.datasetVersion === snapshot.datasetVersion
      ) {
        throw new Error(
          `Dataset '${snapshot.datasetId}' version '${snapshot.datasetVersion}' exists`,
        );
      }
    }
    return this.ledger.appendRecord({
      actor,
      kind: `dataset.${snapshot.change}`,
      recordType: 'dataset-snapshot',
      record: snapshot,
      classification: snapshot.classification,
    });
  }

  async recordNewsScreen(
    actor: Actor,
    screen: NewsScreenRecord,
    classification: DataClassification = 'internal',
  ): Promise<RecordReference> {
    validateNewsScreen(screen);
    for (const story of screen.stories) {
      for (const artifactId of story.sourceArtifactIds) {
        if (!await this.ledger.artifacts.has(artifactId)) {
          throw new Error(`Missing news source artifact '${artifactId}'`);
        }
      }
    }
    for (const recordId of this.ledger.listRecordIds('news-screen')) {
      const existing = await this.ledger.getRecord<NewsScreenRecord>(recordId);
      if (existing.id === screen.id) {
        throw new Error(`News screen '${screen.id}' already exists`);
      }
    }
    return this.ledger.appendRecord({
      actor,
      kind: 'news.screen-completed',
      recordType: 'news-screen',
      record: screen,
      classification,
    });
  }

  async recordNewsModelComparison(
    actor: Actor,
    comparison: NewsModelComparison,
    classification: DataClassification = 'internal',
  ): Promise<RecordReference> {
    validateNewsModelComparison(comparison);
    this.requireRecordType(
      this.ledger.db(),
      comparison.screenRecordId,
      'news-screen',
    );
    const screen = await this.ledger.getRecord<NewsScreenRecord>(
      comparison.screenRecordId,
    );
    const story = screen.stories.find(({ id }) => id === comparison.storyId);
    if (!story) {
      throw new Error(
        `News screen does not contain story '${comparison.storyId}'`,
      );
    }
    if (story.decision !== 'selected') {
      throw new Error(
        `News story '${comparison.storyId}' was not selected for modeling`,
      );
    }
    for (const packetId of comparison.evidencePacketIds) {
      this.requireRecordType(this.ledger.db(), packetId, 'evidence-packet');
    }
    for (const { runManifestArtifactId } of comparison.iterations) {
      if (!await this.ledger.artifacts.has(runManifestArtifactId)) {
        throw new Error(
          `Missing news run manifest '${runManifestArtifactId}'`,
        );
      }
      const manifest = parseRunManifest(
        await this.ledger.artifacts.getText(runManifestArtifactId),
      );
      if (Date.parse(manifest.createdAt) > Date.parse(comparison.createdAt)) {
        throw new Error(
          'News comparison cannot cite a run created in the future',
        );
      }
    }
    for (const recordId of this.ledger.listRecordIds(
      'news-model-comparison',
    )) {
      const existing = await this.ledger.getRecord<NewsModelComparison>(
        recordId,
      );
      if (existing.id === comparison.id) {
        throw new Error(
          `News model comparison '${comparison.id}' already exists`,
        );
      }
    }
    return this.ledger.appendRecord({
      actor,
      kind: 'news.model-compared',
      recordType: 'news-model-comparison',
      record: comparison,
      classification,
    });
  }

  async recordReferenceClass(
    actor: Actor,
    referenceClass: ReferenceClassVersion,
    classification: DataClassification = 'internal',
  ): Promise<RecordReference> {
    validateReferenceClass(referenceClass);
    await this.question(referenceClass.questionHash);
    for (const recordId of this.ledger.listRecordIds('reference-class')) {
      const existing = await this.ledger.getRecord<ReferenceClassVersion>(
        recordId,
      );
      if (
        existing.id === referenceClass.id &&
        existing.version === referenceClass.version
      ) {
        throw new Error(
          `Reference class '${referenceClass.id}' version '${referenceClass.version}' exists`,
        );
      }
    }
    if (!await this.ledger.artifacts.has(referenceClass.candidateUniverseArtifactId)) {
      throw new Error(
        `Missing reference-class universe '${referenceClass.candidateUniverseArtifactId}'`,
      );
    }
    for (const row of referenceClass.cases) {
      for (const observationVersionId of row.outcomeObservationVersionIds) {
        if (!await this.findLogicalRecordId<ObservationVersion>(
          'observation-version',
          observationVersionId,
        )) {
          throw new Error(
            `Unknown reference-class observation '${observationVersionId}'`,
          );
        }
      }
    }
    return this.ledger.appendRecord({
      actor,
      kind: 'reference-class.registered',
      recordType: 'reference-class',
      record: referenceClass,
      classification,
    });
  }

  async recordConditionalSet(
    actor: Actor,
    conditionalSet: ConditionalForecastSet,
  ): Promise<RecordReference> {
    validateConditionalSet(conditionalSet);
    await this.question(conditionalSet.questionHash);
    if (await this.findLogicalRecordId<ConditionalForecastSet>(
      'conditional-set',
      conditionalSet.id,
    )) {
      throw new Error(
        `Conditional set '${conditionalSet.id}' already exists`,
      );
    }
    for (const branch of conditionalSet.branches) {
      if (branch.indicatorQuestionHash) {
        await this.question(branch.indicatorQuestionHash);
      }
    }
    return this.ledger.appendRecord({
      actor,
      kind: 'conditional-set.registered',
      recordType: 'conditional-set',
      record: conditionalSet,
      classification: 'internal',
    });
  }

  async recordAggregation(
    actor: Actor,
    aggregation: AggregationRecord,
  ): Promise<RecordReference> {
    const question = await this.question(aggregation.questionHash);
    validateAggregationRecord(aggregation, question);
    if (await this.findLogicalRecordId<AggregationRecord>(
      'aggregation',
      aggregation.id,
    )) {
      throw new Error(`Aggregation '${aggregation.id}' already exists`);
    }
    for (const input of aggregation.inputs) {
      const forecast = await this.ledger.getRecord<ForecastVersion>(input.forecastId);
      if (forecast.questionHash !== aggregation.questionHash ||
          forecast.forecasterId !== input.forecasterId ||
          forecast.sealedAt !== input.sealedAt) {
        throw new Error(`Aggregation input '${input.forecastId}' does not match its sealed record`);
      }
    }
    for (const scoreId of aggregation.trainingScoreIds) {
      this.requireRecordType(this.ledger.db(), scoreId, 'score');
    }
    const recomputed = aggregatePredictions({
      id: aggregation.id,
      version: aggregation.version,
      questionHash: aggregation.questionHash,
      createdAt: aggregation.createdAt,
      method: aggregation.method,
      inputs: aggregation.inputs,
      trainingScoreIds: aggregation.trainingScoreIds,
    });
    if (canonicalJson(recomputed.result) !== canonicalJson(aggregation.result)) {
      throw new Error('Aggregation result does not match its declared inputs');
    }
    return this.ledger.appendRecord({
      actor,
      kind: 'aggregation.created',
      recordType: 'aggregation',
      record: aggregation,
      classification: 'internal',
    });
  }

  async recordTrigger(
    actor: Actor,
    trigger: TriggerDefinition,
  ): Promise<RecordReference> {
    validateTrigger(trigger);
    await this.question(trigger.questionHash);
    if (await this.findLogicalRecordId<TriggerDefinition>(
      'trigger',
      trigger.id,
    )) {
      throw new Error(`Trigger '${trigger.id}' already exists`);
    }
    return this.ledger.appendRecord({
      actor,
      kind: 'monitor.trigger-defined',
      recordType: 'trigger',
      record: trigger,
      classification: 'internal',
    });
  }

  async recordMonitorCheck(
    actor: Actor,
    check: MonitorCheck,
  ): Promise<RecordReference> {
    validateMonitorCheck(check);
    if (await this.findLogicalRecordId<MonitorCheck>(
      'monitor-check',
      check.id,
    )) {
      throw new Error(`Monitor check '${check.id}' already exists`);
    }
    this.requireRecordType(
      this.ledger.db(),
      check.acquisitionReceiptId,
      'acquisition-receipt',
    );
    this.requireRecordType(
      this.ledger.db(),
      check.evidencePacketId,
      'evidence-packet',
    );
    let matchedTrigger: TriggerDefinition | undefined;
    for (const triggerRecordId of this.ledger.listRecordIds('trigger')) {
      const trigger = await this.ledger.getRecord<TriggerDefinition>(triggerRecordId);
      if (trigger.id === check.triggerId) {
        matchedTrigger = trigger;
        break;
      }
    }
    if (!matchedTrigger) throw new Error(`Unknown trigger '${check.triggerId}'`);
    if (matchedTrigger.notificationPolicy !== check.notificationPolicy) {
      throw new Error('Monitor check notification policy differs from its trigger');
    }
    if (Date.parse(check.checkedAt) < Date.parse(check.scheduledFor)) {
      throw new Error('Monitor check cannot precede its scheduled time');
    }
    return this.ledger.appendRecord({
      actor,
      kind: check.matched ? 'monitor.trigger-matched' : 'monitor.checked',
      recordType: 'monitor-check',
      record: check,
      classification: 'internal',
    });
  }

  async sealForecast(options: {
    actor: Actor;
    questionHash: string;
    forecasterId: string;
    seriesId: string;
    prediction: Prediction;
    updateBasis: ForecastUpdateBasis;
    modelUse: ModelUse;
    modelForecastIds?: readonly string[];
    referenceClassIds?: readonly string[];
    conditionalSetIds?: readonly string[];
    rationale: string;
    strongestContraryCase: string;
    declaredExternalInformation?: readonly string[];
  }): Promise<RecordReference> {
    await this.initialize();
    const question = await this.question(options.questionHash);
    this.requireOpenQuestion(this.ledger.db(), options.questionHash);
    const state = this.seriesState(
      this.ledger.db(),
      options.questionHash,
      options.forecasterId,
      options.seriesId,
    );
    const hasPriorForecast = Boolean(state?.last_forecast_id);
    const latestPreflightId = this.latestPreflightId(this.ledger.db(), options.questionHash);
    if (!latestPreflightId) throw new Error('A successful question preflight is required');
    const preflight = await this.ledger.getRecord<QuestionPreflight>(latestPreflightId);
    if (preflight.checks.some(({ status }) => status === 'fail')) {
      throw new Error('Cannot seal a forecast while question preflight has failures');
    }
    const modelForecastIds = [...(options.modelForecastIds ?? [])];
    if (options.modelUse === 'none' && modelForecastIds.length > 0) {
      throw new Error('A forecast declaring no model use cannot cite model forecasts');
    }
    if (options.modelUse !== 'none' && modelForecastIds.length === 0) {
      throw new Error('Consulted or conditioned model use must cite a model forecast');
    }
    for (const modelForecastId of modelForecastIds) {
      this.requireRecordType(this.ledger.db(), modelForecastId, 'model-forecast');
      const modelForecast = await this.ledger.getRecord<ModelForecast>(modelForecastId);
      if (modelForecast.questionHash !== options.questionHash) {
        throw new Error(`Model forecast '${modelForecastId}' belongs to another question`);
      }
    }
    for (const referenceClassId of options.referenceClassIds ?? []) {
      this.requireRecordType(this.ledger.db(), referenceClassId, 'reference-class');
      const referenceClass = await this.ledger.getRecord<ReferenceClassVersion>(
        referenceClassId,
      );
      if (referenceClass.questionHash !== options.questionHash) {
        throw new Error(`Reference class '${referenceClassId}' belongs to another question`);
      }
    }
    for (const conditionalSetId of options.conditionalSetIds ?? []) {
      this.requireRecordType(this.ledger.db(), conditionalSetId, 'conditional-set');
      const conditionalSet = await this.ledger.getRecord<ConditionalForecastSet>(
        conditionalSetId,
      );
      if (conditionalSet.questionHash !== options.questionHash) {
        throw new Error(`Conditional set '${conditionalSetId}' belongs to another question`);
      }
    }
    if (state?.forecast_required === 1 &&
        !(options.updateBasis.kind === 'launch' && !hasPriorForecast) &&
        options.updateBasis.kind !== 'evidence' &&
        options.updateBasis.kind !== 'model-run') {
      throw new Error('The pending evidence exposure must be acknowledged in the update basis');
    }
    if (options.updateBasis.kind === 'evidence') {
      if (!state?.last_exposure_id ||
          !options.updateBasis.exposureIds.includes(state.last_exposure_id)) {
        throw new Error('Evidence update basis must cite the pending exposure');
      }
      for (const exposureId of options.updateBasis.exposureIds) {
        this.requireRecordType(this.ledger.db(), exposureId, 'evidence-exposure');
      }
    }
    if (options.updateBasis.kind === 'model-run') {
      if (options.updateBasis.modelForecastIds.length === 0) {
        throw new Error('Model-run update basis must cite at least one model forecast');
      }
      const cited = [...options.updateBasis.modelForecastIds].sort();
      const declared = [...modelForecastIds].sort();
      if (JSON.stringify(cited) !== JSON.stringify(declared)) {
        throw new Error('Model-run update basis and declared model forecasts differ');
      }
    }
    if (options.updateBasis.kind === 'no-news') {
      if (options.updateBasis.monitorCheckIds.length === 0) {
        throw new Error('No-news update basis must cite at least one monitor check');
      }
      for (const checkId of options.updateBasis.monitorCheckIds) {
        this.requireRecordType(this.ledger.db(), checkId, 'monitor-check');
      }
    }
    if (options.updateBasis.kind === 'correction') {
      this.requireRecordType(
        this.ledger.db(),
        options.updateBasis.correctedForecastId,
        'forecast',
      );
    }
    const exposureIds = this.exposureIds(
      this.ledger.db(),
      options.questionHash,
      options.forecasterId,
      options.seriesId,
    );
    const informationSet: InformationSet = {
      schemaVersion: 'forecast-workbench.information-set/v1',
      questionHash: options.questionHash,
      forecasterId: options.forecasterId,
      seriesId: options.seriesId,
      disclosedPreflightPacketIds: [...preflight.disclosedPacketIds],
      exposureIds,
      declaredExternalInformation: [...(options.declaredExternalInformation ?? [])],
      computedAt: this.clock.now().toISOString(),
    };
    const informationSetArtifact = await this.ledger.artifacts.putCanonical(informationSet, {
      classification: 'internal',
    });
    const forecast: ForecastVersion = {
      schemaVersion: 'forecast-workbench.forecast/v1',
      questionHash: options.questionHash,
      questionId: question.id,
      questionVersion: question.version,
      forecasterId: options.forecasterId,
      seriesId: options.seriesId,
      sealedAt: this.clock.now().toISOString(),
      prediction: options.prediction,
      informationSetArtifactId: informationSetArtifact.id,
      updateBasis: options.updateBasis,
      modelUse: options.modelUse,
      modelForecastIds,
      referenceClassIds: [...(options.referenceClassIds ?? [])],
      conditionalSetIds: [...(options.conditionalSetIds ?? [])],
      rationale: options.rationale,
      strongestContraryCase: options.strongestContraryCase,
      ...(state?.last_forecast_id
        ? { supersedesForecastId: state.last_forecast_id }
        : {}),
    };
    validateForecastVersion(forecast, question);
    if (!hasPriorForecast && options.updateBasis.kind !== 'launch') {
      throw new Error('The first forecast in a series must use launch update basis');
    }
    if (hasPriorForecast && options.updateBasis.kind === 'launch') {
      throw new Error('Only the first forecast in a series may use launch update basis');
    }
    return this.ledger.appendRecord({
      actor: options.actor,
      kind: hasPriorForecast ? 'forecast.updated' : 'forecast.launched',
      recordType: 'forecast',
      record: forecast,
      classification: 'internal',
      validateProjection: (database) => {
        this.requireOpenQuestion(database, options.questionHash);
        const current = this.seriesState(
          database,
          options.questionHash,
          options.forecasterId,
          options.seriesId,
        );
        if ((current?.last_forecast_id ?? null) !== (state?.last_forecast_id ?? null) ||
            (current?.last_exposure_id ?? null) !== (state?.last_exposure_id ?? null)) {
          throw new Error('Forecast series changed while the checkpoint was being prepared');
        }
      },
    });
  }

  async revealEvidence(options: {
    actor: Actor;
    questionHash: string;
    forecasterId: string;
    seriesId: string;
    packetId: string;
    breakGlass?: {
      reason: string;
      authorizedBy: string;
    };
  }): Promise<RecordReference> {
    await this.initialize();
    const database = this.ledger.db();
    this.requireOpenQuestion(database, options.questionHash);
    const packet = database.prepare(
      'SELECT 1 FROM evidence_packets WHERE record_artifact_id = ?',
    ).get(options.packetId);
    if (!packet) throw new Error(`Unknown evidence packet '${options.packetId}'`);
    const state = this.seriesState(
      database,
      options.questionHash,
      options.forecasterId,
      options.seriesId,
    );
    if ((!state || state.forecast_required !== 0) && !options.breakGlass) {
      throw new Error('A forecast checkpoint must be sealed before revealing evidence');
    }
    if (options.breakGlass) {
      if (!options.breakGlass.reason.trim() || !options.breakGlass.authorizedBy.trim()) {
        throw new Error('Break-glass reveal requires a reason and authorizer');
      }
    }
    const exposure: EvidenceExposure = {
      schemaVersion: 'forecast-workbench.evidence-exposure/v1',
      questionHash: options.questionHash,
      forecasterId: options.forecasterId,
      seriesId: options.seriesId,
      packetId: options.packetId,
      exposedAt: this.clock.now().toISOString(),
      forecastIdBeforeExposure: state?.last_forecast_id ?? 'break-glass:none',
      ...(options.breakGlass ? { breakGlass: options.breakGlass } : {}),
    };
    return this.ledger.appendRecord({
      actor: options.actor,
      kind: options.breakGlass ? 'evidence.break-glass-revealed' : 'evidence.revealed',
      recordType: 'evidence-exposure',
      record: exposure,
      classification: 'internal',
      validateProjection: (currentDatabase) => {
        this.requireOpenQuestion(currentDatabase, options.questionHash);
        const current = this.seriesState(
          currentDatabase,
          options.questionHash,
          options.forecasterId,
          options.seriesId,
        );
        if (!options.breakGlass && (!current || current.forecast_required !== 0)) {
          throw new Error('A forecast checkpoint must be sealed before revealing evidence');
        }
        if (!options.breakGlass &&
            current?.last_forecast_id !== exposure.forecastIdBeforeExposure) {
          throw new Error('Forecast series changed before evidence reveal');
        }
      },
    });
  }

  async registerModelForecast(
    actor: Actor,
    forecast: ModelForecast,
    classification: DataClassification = 'internal',
  ): Promise<RecordReference> {
    validateModelForecast(forecast);
    if (!await this.ledger.artifacts.has(forecast.runManifestArtifactId)) {
      throw new Error(`Missing run-manifest artifact '${forecast.runManifestArtifactId}'`);
    }
    const manifest = parseRunManifest(
      await this.ledger.artifacts.getText(forecast.runManifestArtifactId),
    );
    if (
      manifest.runId !== forecast.runId ||
      manifest.model.id !== forecast.modelId ||
      manifest.model.version !== forecast.modelVersion
    ) {
      throw new Error(
        'Model forecast identifiers do not match the verified run manifest',
      );
    }
    if (manifest.createdAt !== forecast.createdAt) {
      throw new Error(
        'Model forecast createdAt does not match the run manifest',
      );
    }
    for (const artifactId of forecast.adapterInputArtifactIds) {
      if (!await this.ledger.artifacts.has(artifactId)) {
        throw new Error(`Missing adapter input artifact '${artifactId}'`);
      }
    }
    const question = await this.question(forecast.questionHash);
    if (forecast.targetEstimandId !== question.targetEstimandId) {
      throw new Error('Model forecast target estimand differs from the question');
    }
    if (forecast.prediction) validatePrediction(forecast.prediction, question.outcome);
    return this.ledger.appendRecord({
      actor,
      kind: 'model-forecast.registered',
      recordType: 'model-forecast',
      record: forecast,
      classification,
      validateProjection: (database) => {
        if (!database.prepare(
          'SELECT 1 FROM questions WHERE question_hash = ?',
        ).get(forecast.questionHash)) {
          throw new Error(`Unknown question '${forecast.questionHash}'`);
        }
      },
    });
  }

  async recordResolution(
    actor: Actor,
    resolution: ResolutionVersion,
  ): Promise<RecordReference> {
    validateResolutionVersion(resolution);
    const frozenQuestion = await this.question(resolution.questionHash);
    if (resolution.resolverId !== frozenQuestion.resolver.id ||
        resolution.resolverVersion !== frozenQuestion.resolver.version ||
        resolution.resolverImplementationHash !==
          frozenQuestion.resolver.implementationHash) {
      throw new Error('Resolution does not match the frozen resolver contract');
    }
    if (resolution.fallbackInvoked && !frozenQuestion.resolver.fallback) {
      throw new Error('Resolution invoked a fallback that the question did not freeze');
    }
    for (const snapshotId of resolution.snapshotIds) {
      if (!await this.ledger.artifacts.has(snapshotId)) {
        throw new Error(`Missing resolution snapshot '${snapshotId}'`);
      }
    }
    for (const observationVersionId of resolution.observationVersionIds) {
      const found = await this.findLogicalRecordId<ObservationVersion>(
        'observation-version',
        observationVersionId,
      );
      if (!found) {
        throw new Error(
          `Unknown resolution observation version '${observationVersionId}'`,
        );
      }
    }
    if ((resolution.status === 'final' || resolution.status === 'amended') &&
        !resolution.outcomeId && resolution.derivedValue === undefined) {
      throw new Error('Final or amended resolution needs an outcome or derived value');
    }
    const isFinal =
      resolution.status === 'final' || resolution.status === 'amended';
    if (isFinal && frozenQuestion.outcome.kind === 'continuous') {
      if (
        typeof resolution.derivedValue !== 'number' ||
        resolution.outcomeId !== undefined
      ) {
        throw new Error(
          'Continuous resolution requires a numeric value and no categorical outcome',
        );
      }
    } else if (isFinal) {
      if (
        !resolution.outcomeId ||
        !outcomeIds(frozenQuestion.outcome).includes(resolution.outcomeId)
      ) {
        throw new Error(
          `Resolution outcome '${String(resolution.outcomeId)}' is not in the question`,
        );
      }
      if (
        frozenQuestion.outcome.kind === 'ordered-categorical' &&
        typeof resolution.derivedValue === 'number' &&
        mapNumericOutcome(
          frozenQuestion.outcome,
          resolution.derivedValue,
        ) !== resolution.outcomeId
      ) {
        throw new Error(
          'Resolution outcome does not match the derived numeric value',
        );
      }
    }
    const priorRows = this.ledger.db().prepare(`
      SELECT record_artifact_id, status
      FROM resolutions
      WHERE question_hash = ?
      ORDER BY rowid
    `).all(resolution.questionHash) as Array<{
      record_artifact_id: string;
      status: string;
    }>;
    const priorFinal = [...priorRows].reverse().find(
      ({ status }) => status === 'final' || status === 'amended',
    );
    if (priorFinal &&
        !resolution.supersedesResolutionId &&
        resolution.status !== 'cancelled' &&
        resolution.status !== 'disputed') {
      throw new Error('A resolved question requires an explicit superseding resolution');
    }
    if (resolution.status === 'amended' && !resolution.supersedesResolutionId) {
      throw new Error('An amended resolution must identify the version it supersedes');
    }
    if (resolution.supersedesResolutionId) {
      this.requireRecordType(
        this.ledger.db(),
        resolution.supersedesResolutionId,
        'resolution',
      );
    }
    return this.ledger.appendRecord({
      actor,
      kind: resolution.status === 'amended'
        ? 'resolution.amended'
        : `resolution.${resolution.status}`,
      recordType: 'resolution',
      record: resolution,
      classification: 'internal',
      validateProjection: (database) => {
        const question = database.prepare(
          'SELECT closes_at FROM questions WHERE question_hash = ?',
        ).get(resolution.questionHash) as { closes_at: string } | undefined;
        if (!question) throw new Error(`Unknown question '${resolution.questionHash}'`);
        if ((resolution.status === 'final' || resolution.status === 'amended') &&
            Date.parse(resolution.resolvedAt) < Date.parse(question.closes_at)) {
          throw new Error('A question cannot resolve finally before it closes');
        }
      },
    });
  }

  async scoreForecast(options: {
    actor: Actor;
    forecastId: string;
    resolutionId: string;
    specification?: ScoringSpecification;
  }): Promise<RecordReference> {
    await this.initialize();
    const forecast = await this.ledger.getRecord<ForecastVersion>(options.forecastId);
    const resolution = await this.ledger.getRecord<ResolutionVersion>(options.resolutionId);
    if (resolution.status !== 'final' && resolution.status !== 'amended') {
      throw new Error('Scores can be created only from a final or amended resolution');
    }
    if (forecast.questionHash !== resolution.questionHash) {
      throw new Error('Forecast and resolution belong to different questions');
    }
    const question = await this.question(forecast.questionHash);
    const specification = options.specification ?? DEFAULT_SCORING_SPECIFICATION;
    const values = scorePrediction({
      question,
      prediction: forecast.prediction,
      ...(resolution.outcomeId ? { observedOutcomeId: resolution.outcomeId } : {}),
      ...(typeof resolution.derivedValue === 'number'
        ? { observedValue: resolution.derivedValue }
        : {}),
      specification,
    });
    const score: ScoreRecord = {
      schemaVersion: 'forecast-workbench.score/v1',
      questionHash: forecast.questionHash,
      forecastId: options.forecastId,
      resolutionId: options.resolutionId,
      scoredAt: this.clock.now().toISOString(),
      scoringSpecification: specification,
      ...(resolution.outcomeId ? { observedOutcomeId: resolution.outcomeId } : {}),
      ...(typeof resolution.derivedValue === 'number'
        ? { observedValue: resolution.derivedValue }
        : {}),
      values,
    };
    return this.ledger.appendRecord({
      actor: options.actor,
      kind: 'forecast.scored',
      recordType: 'score',
      record: score,
      classification: 'internal',
      validateProjection: (database) => {
        if (!database.prepare(
          'SELECT 1 FROM forecasts WHERE record_artifact_id = ?',
        ).get(options.forecastId)) {
          throw new Error(`Unknown forecast '${options.forecastId}'`);
        }
        if (!database.prepare(
          'SELECT 1 FROM resolutions WHERE record_artifact_id = ?',
        ).get(options.resolutionId)) {
          throw new Error(`Unknown resolution '${options.resolutionId}'`);
        }
      },
    });
  }

  async scoreForecastSeries(options: {
    actor: Actor;
    questionHash: string;
    forecasterId: string;
    seriesId: string;
    resolutionId: string;
    specification?: ScoringSpecification;
  }): Promise<RecordReference> {
    await this.initialize();
    const resolution = await this.ledger.getRecord<ResolutionVersion>(
      options.resolutionId,
    );
    if (resolution.questionHash !== options.questionHash) {
      throw new Error('Score-series resolution belongs to a different question');
    }
    if (resolution.status !== 'final' && resolution.status !== 'amended') {
      throw new Error('Score series requires a final or amended resolution');
    }
    const question = await this.question(options.questionHash);
    const rows = this.ledger.db().prepare(`
      SELECT record_artifact_id
      FROM forecasts
      WHERE question_hash = ? AND forecaster_id = ? AND series_id = ?
      ORDER BY sealed_at, rowid
    `).all(
      options.questionHash,
      options.forecasterId,
      options.seriesId,
    ) as Array<{ record_artifact_id: string }>;
    if (rows.length === 0) throw new Error('Forecast series has no forecasts');
    const specification = options.specification ?? DEFAULT_SCORING_SPECIFICATION;
    const scoreRows: Array<{
      forecast: ForecastVersion;
      record: RecordReference;
      score: ScoreRecord;
    }> = [];
    for (const row of rows) {
      const forecast = await this.ledger.getRecord<ForecastVersion>(
        row.record_artifact_id,
      );
      const record = await this.scoreForecast({
        actor: options.actor,
        forecastId: row.record_artifact_id,
        resolutionId: options.resolutionId,
        specification,
      });
      scoreRows.push({
        forecast,
        record,
        score: await this.ledger.getRecord<ScoreRecord>(record.id),
      });
    }
    const metricNames = [
      'brier',
      'rankedProbability',
      'logarithmic',
      'weightedInterval',
      'crps',
    ] as const;
    const timeWeighted: ScoreRecord['values'] = {};
    for (const metric of metricNames) {
      const values = scoreRows.map(({ forecast, score }) => ({
        sealedAt: forecast.sealedAt,
        score: score.values[metric],
      }));
      if (values.every(({ score }) => score !== undefined)) {
        timeWeighted[metric] = timeWeightedScore({
          forecasts: values as Array<{ sealedAt: string; score: number }>,
          opensAt: question.opensAt,
          closesAt: question.closesAt,
        });
      }
    }
    const first = scoreRows[0];
    const last = scoreRows.at(-1)!;
    const summary: ScoreSeriesSummary = {
      schemaVersion: 'forecast-workbench.score-series/v1',
      questionHash: options.questionHash,
      forecasterId: options.forecasterId,
      seriesId: options.seriesId,
      resolutionId: options.resolutionId,
      scoredAt: this.clock.now().toISOString(),
      forecastScoreIds: scoreRows.map(({ record }) => record.id),
      launchForecastId: rows[0].record_artifact_id,
      closingForecastId: rows.at(-1)!.record_artifact_id,
      launch: first.score.values,
      closing: last.score.values,
      timeWeighted,
      scoringSpecification: specification,
    };
    return this.ledger.appendRecord({
      actor: options.actor,
      kind: 'forecast-series.scored',
      recordType: 'score-series',
      record: summary,
      classification: 'internal',
    });
  }

  async question(hash: string): Promise<ForecastQuestion> {
    await this.initialize();
    const row = this.ledger.db().prepare(
      'SELECT record_artifact_id FROM questions WHERE question_hash = ?',
    ).get(hash) as { record_artifact_id: string } | undefined;
    if (!row) throw new Error(`Unknown question '${hash}'`);
    return this.ledger.getRecord<ForecastQuestion>(row.record_artifact_id);
  }

  private latestPreflightId(database: Database.Database, hash: string): string | undefined {
    const row = database.prepare(`
      SELECT p.record_artifact_id
      FROM preflights p
      JOIN records r ON r.record_artifact_id = p.record_artifact_id
      WHERE p.question_hash = ?
      ORDER BY r.first_event_sequence DESC
      LIMIT 1
    `).get(hash) as { record_artifact_id: string } | undefined;
    return row?.record_artifact_id;
  }

  private seriesState(
    database: Database.Database,
    hash: string,
    forecasterId: string,
    seriesId: string,
  ): SeriesState | undefined {
    return database.prepare(`
      SELECT forecast_required, last_forecast_id, last_exposure_id
      FROM forecast_series_state
      WHERE question_hash = ? AND forecaster_id = ? AND series_id = ?
    `).get(hash, forecasterId, seriesId) as SeriesState | undefined;
  }

  private exposureIds(
    database: Database.Database,
    hash: string,
    forecasterId: string,
    seriesId: string,
  ): string[] {
    const rows = database.prepare(`
      SELECT e.record_artifact_id
      FROM evidence_exposures e
      JOIN records r ON r.record_artifact_id = e.record_artifact_id
      WHERE e.question_hash = ? AND e.forecaster_id = ? AND e.series_id = ?
      ORDER BY r.first_event_sequence
    `).all(hash, forecasterId, seriesId) as Array<{ record_artifact_id: string }>;
    return rows.map(({ record_artifact_id }) => record_artifact_id);
  }

  private requireOpenQuestion(database: Database.Database, hash: string): QuestionRow {
    const question = database.prepare(`
      SELECT record_artifact_id, opens_at, closes_at, first_forecast_id
      FROM questions WHERE question_hash = ?
    `).get(hash) as QuestionRow | undefined;
    if (!question) throw new Error(`Unknown question '${hash}'`);
    if (this.clock.now().getTime() < Date.parse(question.opens_at)) {
      throw new Error('Question is not open');
    }
    if (this.clock.now().getTime() >= Date.parse(question.closes_at)) {
      throw new Error('Question is closed');
    }
    return question;
  }

  private requireRecordType(
    database: Database.Database,
    id: string,
    recordType: string,
  ): void {
    const row = database.prepare(
      'SELECT record_type FROM records WHERE record_artifact_id = ?',
    ).get(id) as { record_type: string } | undefined;
    if (!row) throw new Error(`Unknown ${recordType} record '${id}'`);
    if (row.record_type !== recordType) {
      throw new Error(`Record '${id}' is '${row.record_type}', not '${recordType}'`);
    }
  }

  private async findLogicalRecordId<T extends { id: string }>(
    recordType: string,
    logicalId: string,
  ): Promise<string | undefined> {
    for (const recordId of this.ledger.listRecordIds(recordType)) {
      const record = await this.ledger.getRecord<T>(recordId);
      if (record.id === logicalId) return recordId;
    }
    return undefined;
  }
}

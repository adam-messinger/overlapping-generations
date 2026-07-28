import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FixedClock,
  ForecastWorkbench,
  aggregatePredictions,
  auditConditionalCoherence,
  createAcquisitionReceipt,
  evaluateTrigger,
  questionHash,
  referenceClassRate,
  resolveNumericQuestion,
  runQuestionPreflight,
  type Actor,
  type ForecastQuestion,
  type ForecastVersion,
  type ScoreSeriesSummary,
} from '../src/index.js';

const designer: Actor = { id: 'designer', role: 'designer' };
const forecaster: Actor = { id: 'forecaster', role: 'forecaster' };

const question: ForecastQuestion = {
  schemaVersion: 'forecast-workbench.question/v1',
  id: 'test-count',
  version: '1',
  title: 'How many?',
  description: 'Resolve a count into ordered bins.',
  targetEstimandId: 'test.count',
  opensAt: '2026-01-01T00:00:00.000Z',
  closesAt: '2026-02-01T00:00:00.000Z',
  expectedResolutionAt: '2026-02-02T00:00:00.000Z',
  outcome: {
    kind: 'ordered-categorical',
    unit: 'count',
    bins: [
      { id: 'low', label: 'Below 10', upper: 10 },
      { id: 'middle', label: '10–19', lower: 10, upper: 20 },
      { id: 'high', label: 'At least 20', lower: 20 },
    ],
  },
  resolver: {
    id: 'fixture-resolver',
    version: '1',
    sourceId: 'fixture',
    description: 'Read fixture count.',
    implementationHash: 'sha256:resolver',
    queryDescription: 'fixture row',
    targetField: 'count',
    statistic: 'value',
    expectedPublicationAt: '2026-02-02T00:00:00.000Z',
    revisionRule: { kind: 'first-release' },
    cancellationRule: 'Cancel if the fixture is unavailable for 30 days.',
  },
  createdAt: '2025-12-01T00:00:00.000Z',
};

async function temporaryWorkbench(): Promise<{
  path: string;
  clock: FixedClock;
  workbench: ForecastWorkbench;
}> {
  const path = await mkdtemp(join(tmpdir(), 'forecast-workbench-'));
  const clock = new FixedClock(new Date('2026-01-02T00:00:00.000Z'));
  const workbench = new ForecastWorkbench(path, clock);
  await workbench.initialize();
  return { path, clock, workbench };
}

test('forecast checkpoints gate evidence exposure and preserve information sets', async () => {
  const temporary = await temporaryWorkbench();
  try {
    const registered = await temporary.workbench.registerQuestion(designer, question);
    assert.equal(registered.id, questionHash(question));
    const packet = await temporary.workbench.createEvidencePacket({
      actor: designer,
      id: 'packet-one',
      title: 'First observation',
      view: { count: 8 },
      classification: 'public',
    });
    const preflight = runQuestionPreflight({
      question,
      designerId: designer.id,
      clock: temporary.clock,
      resolverProbe: {
        ok: true,
        schemaRecognized: true,
        message: 'Fixture resolver is available.',
      },
      historicalValues: [1, 5, 11, 17, 25],
    });
    await temporary.workbench.recordPreflight(designer, preflight);
    await assert.rejects(
      temporary.workbench.revealEvidence({
        actor: forecaster,
        questionHash: registered.id,
        forecasterId: forecaster.id,
        seriesId: 'main',
        packetId: packet.id,
      }),
      /checkpoint must be sealed/,
    );
    const launch = await temporary.workbench.sealForecast({
      actor: forecaster,
      questionHash: registered.id,
      forecasterId: forecaster.id,
      seriesId: 'main',
      prediction: {
        kind: 'ordered-categorical',
        probabilities: { low: 0.3, middle: 0.4, high: 0.3 },
      },
      updateBasis: { kind: 'launch' },
      modelUse: 'none',
      rationale: 'Prior based on the broad historical range.',
      strongestContraryCase: 'Recent observations could be much lower.',
    });
    const exposure = await temporary.workbench.revealEvidence({
      actor: forecaster,
      questionHash: registered.id,
      forecasterId: forecaster.id,
      seriesId: 'main',
      packetId: packet.id,
    });
    await assert.rejects(
      temporary.workbench.revealEvidence({
        actor: forecaster,
        questionHash: registered.id,
        forecasterId: forecaster.id,
        seriesId: 'main',
        packetId: packet.id,
      }),
      /checkpoint must be sealed/,
    );
    temporary.clock.advance(60_000);
    const update = await temporary.workbench.sealForecast({
      actor: forecaster,
      questionHash: registered.id,
      forecasterId: forecaster.id,
      seriesId: 'main',
      prediction: {
        kind: 'ordered-categorical',
        probabilities: { low: 0.6, middle: 0.25, high: 0.15 },
      },
      updateBasis: { kind: 'evidence', exposureIds: [exposure.id] },
      modelUse: 'none',
      rationale: 'The first observation moved probability toward the low bin.',
      strongestContraryCase: 'The observation may be noisy.',
    });
    const updateRecord = await temporary.workbench.ledger.getRecord<any>(update.id);
    assert.equal(updateRecord.supersedesForecastId, launch.id);
    const informationSet = await temporary.workbench.ledger.artifacts.getJson<any>(
      updateRecord.informationSetArtifactId,
    );
    assert.deepEqual(informationSet.exposureIds, [exposure.id]);
    await assert.rejects(
      temporary.workbench.recordPreflight(designer, preflight),
      /cannot change after the first forecast/,
    );
    const verification = await temporary.workbench.ledger.verify();
    assert.equal(verification.events, 6);
    assert.ok(verification.chainHead);
    assert.throws(
      () => temporary.workbench.ledger.db().prepare(
        'UPDATE events SET kind = ? WHERE sequence = 1',
      ).run('tampered'),
      /append-only/,
    );
  } finally {
    temporary.workbench.close();
    await rm(temporary.path, { recursive: true, force: true });
  }
});

test('preflight reports degenerate ordered bins without rewriting the question', () => {
  const clock = new FixedClock(new Date('2026-01-02T00:00:00.000Z'));
  const preflight = runQuestionPreflight({
    question,
    designerId: designer.id,
    clock,
    resolverProbe: {
      ok: true,
      schemaRecognized: true,
      message: 'ok',
    },
    historicalValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 9],
  });
  const occupancy = preflight.checks.find(({ id }) => id === 'historical-bin-occupancy');
  assert.equal(occupancy?.status, 'warning');
  assert.match(occupancy?.message ?? '', /100\.0%/);
});

async function allFileText(path: string): Promise<string> {
  const entries = await readdir(path, { withFileTypes: true });
  const values: string[] = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) values.push(await allFileText(child));
    else values.push((await readFile(child)).toString('utf8'));
  }
  return values.join('\n');
}

test('record artifacts are canonical and contain no incidental pretty-print bytes', async () => {
  const temporary = await temporaryWorkbench();
  try {
    const registered = await temporary.workbench.registerQuestion(designer, question);
    const raw = await temporary.workbench.ledger.artifacts.getText(registered.id);
    assert.equal(raw.includes('\n'), false);
    assert.equal((await allFileText(temporary.path)).includes('undefined'), false);
  } finally {
    temporary.workbench.close();
    await rm(temporary.path, { recursive: true, force: true });
  }
});

test('replay clocks cannot seal or expose information after a question closes', async () => {
  const temporary = await temporaryWorkbench();
  try {
    const registered = await temporary.workbench.registerQuestion(designer, question);
    const preflight = runQuestionPreflight({
      question,
      designerId: designer.id,
      clock: temporary.clock,
      resolverProbe: {
        ok: true,
        schemaRecognized: true,
        message: 'ok',
      },
    });
    await temporary.workbench.recordPreflight(designer, preflight);
    temporary.clock.set(new Date(question.closesAt));
    await assert.rejects(
      temporary.workbench.sealForecast({
        actor: forecaster,
        questionHash: registered.id,
        forecasterId: forecaster.id,
        seriesId: 'late',
        prediction: {
          kind: 'ordered-categorical',
          probabilities: { low: 0.3, middle: 0.4, high: 0.3 },
        },
        updateBasis: { kind: 'launch' },
        modelUse: 'none',
        rationale: 'This should never be accepted.',
        strongestContraryCase: 'The clock is already at the close.',
      }),
      /Question is closed/,
    );
  } finally {
    temporary.workbench.close();
    await rm(temporary.path, { recursive: true, force: true });
  }
});

test('an authorized pre-forecast break-glass exposure remains launchable and auditable', async () => {
  const temporary = await temporaryWorkbench();
  try {
    const registered = await temporary.workbench.registerQuestion(designer, question);
    await temporary.workbench.recordPreflight(designer, runQuestionPreflight({
      question,
      designerId: designer.id,
      clock: temporary.clock,
      resolverProbe: { ok: true, schemaRecognized: true, message: 'ok' },
    }));
    const packet = await temporary.workbench.createEvidencePacket({
      actor: designer,
      id: 'break-glass-packet',
      title: 'Urgent evidence',
      view: { value: 9 },
    });
    const exposure = await temporary.workbench.revealEvidence({
      actor: forecaster,
      questionHash: registered.id,
      forecasterId: forecaster.id,
      seriesId: 'break-glass',
      packetId: packet.id,
      breakGlass: {
        reason: 'Urgent safety review required immediate access.',
        authorizedBy: 'administrator',
      },
    });
    const launch = await temporary.workbench.sealForecast({
      actor: forecaster,
      questionHash: registered.id,
      forecasterId: forecaster.id,
      seriesId: 'break-glass',
      prediction: {
        kind: 'ordered-categorical',
        probabilities: { low: 0.5, middle: 0.3, high: 0.2 },
      },
      updateBasis: {
        kind: 'launch',
        note: 'Launch incorporates the explicitly logged break-glass exposure.',
      },
      modelUse: 'none',
      rationale: 'The urgent evidence was already exposed and is declared.',
      strongestContraryCase: 'The urgent value may be noisy.',
    });
    assert.equal(launch.event.kind, 'forecast.launched');
    const forecast = await temporary.workbench.ledger.getRecord<ForecastVersion>(
      launch.id,
    );
    const informationSet = await temporary.workbench.ledger.artifacts.getJson<{
      exposureIds: string[];
    }>(forecast.informationSetArtifactId);
    assert.deepEqual(informationSet.exposureIds, [exposure.id]);
  } finally {
    temporary.workbench.close();
    await rm(temporary.path, { recursive: true, force: true });
  }
});

test('outside views, conditionals, aggregation, monitoring, and series scores are ledger-native', async () => {
  const temporary = await temporaryWorkbench();
  try {
    const registered = await temporary.workbench.registerQuestion(designer, question);
    const preflight = runQuestionPreflight({
      question,
      designerId: designer.id,
      clock: temporary.clock,
      resolverProbe: { ok: true, schemaRecognized: true, message: 'ok' },
      historicalValues: [3, 8, 12, 19, 21],
    });
    await temporary.workbench.recordPreflight(designer, preflight);

    const universe = await temporary.workbench.ledger.artifacts.putCanonical({
      candidates: ['episode-a', 'episode-b', 'episode-c'],
      query: 'fixture search frozen before outcomes were coded',
    });
    const referenceClass = {
      schemaVersion: 'forecast-workbench.reference-class/v1',
      id: 'fixture-reference-class',
      version: '1.0.0',
      questionHash: registered.id,
      createdAt: temporary.clock.now().toISOString(),
      searchProtocol: 'Use every fixture episode returned by the frozen query.',
      searchCutoffAt: temporary.clock.now().toISOString(),
      candidateUniverseArtifactId: universe.id,
      construction: 'prospective',
      cases: [
        {
          id: 'episode-a',
          label: 'Episode A',
          decision: 'included',
          reason: 'Meets the frozen rule.',
          outcomeId: 'low',
          outcomeObservationVersionIds: [],
        },
        {
          id: 'episode-b',
          label: 'Episode B',
          decision: 'included',
          reason: 'Meets the frozen rule.',
          outcomeId: 'high',
          outcomeObservationVersionIds: [],
        },
        {
          id: 'episode-c',
          label: 'Episode C',
          decision: 'excluded',
          reason: 'Target period is missing.',
          outcomeObservationVersionIds: [],
        },
      ],
      denominatorRule: 'All included, non-censored cases.',
      alternateReferenceClassIds: [],
      limitations: 'Tiny fixture class.',
    } as const;
    const referenceRecord = await temporary.workbench.recordReferenceClass(
      designer,
      referenceClass,
    );
    assert.deepEqual(referenceClassRate({
      referenceClass,
      positiveOutcomeIds: ['high'],
    }), { numerator: 1, denominator: 2, rate: 0.5 });

    const conditionalSet = {
      schemaVersion: 'forecast-workbench.conditional-set/v1',
      id: 'fixture-conditional',
      version: '1.0.0',
      questionHash: registered.id,
      forecasterId: forecaster.id,
      createdAt: temporary.clock.now().toISOString(),
      unconditionalTargetProbability: 0.3,
      completeMutuallyExclusivePartition: true,
      branches: [
        {
          id: 'signal',
          label: 'Signal appears',
          branchProbability: 0.25,
          targetProbability: 0.6,
        },
        {
          id: 'no-signal',
          label: 'Signal does not appear',
          branchProbability: 0.75,
          targetProbability: 0.2,
        },
      ],
    } as const;
    const conditionalRecord = await temporary.workbench.recordConditionalSet(
      forecaster,
      conditionalSet,
    );
    assert.equal(auditConditionalCoherence(conditionalSet).coherent, true);

    const launch = await temporary.workbench.sealForecast({
      actor: forecaster,
      questionHash: registered.id,
      forecasterId: forecaster.id,
      seriesId: 'main',
      prediction: {
        kind: 'ordered-categorical',
        probabilities: { low: 0.4, middle: 0.4, high: 0.2 },
      },
      updateBasis: { kind: 'launch' },
      modelUse: 'none',
      referenceClassIds: [referenceRecord.id],
      conditionalSetIds: [conditionalRecord.id],
      rationale: 'Outside view and conditionals define the launch distribution.',
      strongestContraryCase: 'The small reference class may be misleading.',
    });
    const packet = await temporary.workbench.createEvidencePacket({
      actor: designer,
      id: 'workflow-fixture-packet',
      title: 'Fixture signal',
      view: { value: 7 },
      classification: 'public',
    });
    const exposure = await temporary.workbench.revealEvidence({
      actor: forecaster,
      questionHash: registered.id,
      forecasterId: forecaster.id,
      seriesId: 'main',
      packetId: packet.id,
    });
    temporary.clock.set(new Date('2026-01-10T00:00:00.000Z'));
    const update = await temporary.workbench.sealForecast({
      actor: forecaster,
      questionHash: registered.id,
      forecasterId: forecaster.id,
      seriesId: 'main',
      prediction: {
        kind: 'ordered-categorical',
        probabilities: { low: 0.75, middle: 0.2, high: 0.05 },
      },
      updateBasis: { kind: 'evidence', exposureIds: [exposure.id] },
      modelUse: 'none',
      referenceClassIds: [referenceRecord.id],
      conditionalSetIds: [conditionalRecord.id],
      rationale: 'The observed value materially favors the low outcome.',
      strongestContraryCase: 'The observation could be revised.',
    });
    const secondForecaster: Actor = { id: 'forecaster-two', role: 'forecaster' };
    const second = await temporary.workbench.sealForecast({
      actor: secondForecaster,
      questionHash: registered.id,
      forecasterId: secondForecaster.id,
      seriesId: 'main',
      prediction: {
        kind: 'ordered-categorical',
        probabilities: { low: 0.6, middle: 0.25, high: 0.15 },
      },
      updateBasis: { kind: 'launch' },
      modelUse: 'none',
      rationale: 'Independent fixture judgment.',
      strongestContraryCase: 'The latest value could be unrepresentative.',
    });
    temporary.clock.advance(60_000);
    const [updatedForecast, secondForecast] = await Promise.all([
      temporary.workbench.ledger.getRecord<ForecastVersion>(update.id),
      temporary.workbench.ledger.getRecord<ForecastVersion>(second.id),
    ]);
    const aggregation = aggregatePredictions({
      id: 'fixture-pool',
      version: '1.0.0',
      questionHash: registered.id,
      createdAt: temporary.clock.now().toISOString(),
      method: { kind: 'equal-weight' },
      inputs: [
        {
          forecastId: update.id,
          forecasterId: updatedForecast.forecasterId,
          prediction: updatedForecast.prediction,
          sealedAt: updatedForecast.sealedAt,
        },
        {
          forecastId: second.id,
          forecasterId: secondForecast.forecasterId,
          prediction: secondForecast.prediction,
          sealedAt: secondForecast.sealedAt,
        },
      ],
    });
    await temporary.workbench.recordAggregation(
      { id: 'pooling-service', role: 'service' },
      aggregation,
    );
    assert.deepEqual(aggregation.result, {
      kind: 'ordered-categorical',
      probabilities: { high: 0.1, low: 0.675, middle: 0.225 },
    });

    const requestArtifact = await temporary.workbench.ledger.artifacts.putCanonical({
      source: 'fixture-monitor',
    });
    const rawArtifact = await temporary.workbench.ledger.artifacts.putCanonical({
      metric: 7,
    });
    const receipt = createAcquisitionReceipt({
      clock: temporary.clock,
      sourceId: 'fixture-monitor',
      connectorId: 'fixture',
      connectorVersion: '1',
      classification: 'internal',
      sanitizedRequestArtifactId: requestArtifact.id,
      rawArtifactId: rawArtifact.id,
      startedAt: temporary.clock.now().toISOString(),
      asOfAssurance: 'capture-cutoff',
    });
    const receiptRecord = await temporary.workbench.recordAcquisition(
      { id: 'monitor-service', role: 'service' },
      receipt,
    );
    const trigger = {
      schemaVersion: 'forecast-workbench.trigger/v1',
      id: 'fixture-threshold',
      version: '1.0.0',
      questionHash: registered.id,
      sourceProfileId: 'fixture-monitor',
      schedule: 'P1D',
      description: 'Alert when the fixture metric reaches seven.',
      valuePath: 'metric',
      operator: 'gte',
      threshold: 7,
      notificationPolicy: 'magnitude-bearing',
    } as const;
    await temporary.workbench.recordTrigger(designer, trigger);
    const monitorCheck = evaluateTrigger({
      trigger,
      scheduledFor: temporary.clock.now().toISOString(),
      checkedAt: temporary.clock.now().toISOString(),
      acquisitionReceiptId: receiptRecord.id,
      evidencePacketId: packet.id,
      current: { metric: 7 },
    });
    await temporary.workbench.recordMonitorCheck(
      { id: 'monitor-service', role: 'service' },
      monitorCheck,
    );
    assert.equal(monitorCheck.matched, true);

    temporary.clock.set(new Date('2026-02-02T00:00:00.000Z'));
    const resolution = resolveNumericQuestion({
      question,
      clock: temporary.clock,
      resolverImplementationHash: question.resolver.implementationHash,
      value: 7,
      snapshotIds: [rawArtifact.id],
      mappingExplanation: 'Fixture value maps to low.',
    });
    const resolutionRecord = await temporary.workbench.recordResolution(
      { id: 'resolver', role: 'resolver' },
      resolution,
    );
    const seriesRecord = await temporary.workbench.scoreForecastSeries({
      actor: { id: 'resolver', role: 'resolver' },
      questionHash: registered.id,
      forecasterId: forecaster.id,
      seriesId: 'main',
      resolutionId: resolutionRecord.id,
    });
    const series = await temporary.workbench.ledger.getRecord<ScoreSeriesSummary>(
      seriesRecord.id,
    );
    assert.equal(series.launchForecastId, launch.id);
    assert.equal(series.closingForecastId, update.id);
    assert.equal(series.forecastScoreIds.length, 2);
    assert.ok(
      series.timeWeighted.brier !== undefined &&
      series.launch.brier !== undefined &&
      series.closing.brier !== undefined &&
      series.timeWeighted.brier < series.launch.brier &&
      series.timeWeighted.brier > series.closing.brier,
    );
  } finally {
    temporary.workbench.close();
    await rm(temporary.path, { recursive: true, force: true });
  }
});

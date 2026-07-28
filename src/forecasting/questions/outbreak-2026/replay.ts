import { execFileSync } from 'node:child_process';
import {
  FixedClock,
  ForecastWorkbench,
  exportAuditBundle,
  resolveNumericQuestion,
  runQuestionPreflight,
  type Actor,
} from 'forecast-workbench';
import {
  captureDataSnapshot,
  inlineDataResolver,
  stableStringify,
  type EvidenceRecord,
} from 'tsimulation';
import {
  fixedInitialCovidObservations,
  operationalCovidContinuation,
} from '../../../simulations/outbreak/pilot-data-2026-07-23.js';
import {
  cdcFixedInitialAdmissionsMeasurement,
  cdcOperationalAdmissionsMeasurement,
} from '../../../simulations/outbreak/measurement-contracts.js';
import { respiratorySeries } from '../../../simulations/outbreak/rolling-data.js';
import {
  outbreak2026FinalHumanForecast,
  outbreak2026Prior,
  outbreak2026Question,
} from './question.js';
import { runOutbreakModelAdapter } from './model-adapter.js';

const designer: Actor = { id: 'question-designer', role: 'designer' };
const forecaster: Actor = { id: 'pilot-forecaster', role: 'forecaster' };
const modelService = { id: 'model-runner', role: 'service' } as const;
const resolverActor: Actor = { id: 'resolution-service', role: 'resolver' };

function repositoryState(): { gitSha?: string; dirty?: boolean } {
  try {
    return {
      gitSha: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      dirty: execFileSync('git', ['status', '--porcelain'], {
        encoding: 'utf8',
      }).trim().length > 0,
    };
  } catch {
    return {};
  }
}

async function capturePilotSnapshots(clock: FixedClock) {
  const historic = respiratorySeries('covid19');
  const operationalValue = {
    weeks: [...historic.weeks, ...operationalCovidContinuation.map(({ weekEnding }) => weekEnding)],
    admissions: [...historic.admissions, ...operationalCovidContinuation.map(({ admissions }) => admissions)],
    reporting: operationalCovidContinuation,
  };
  const operational = await captureDataSnapshot({
    resolver: inlineDataResolver({
      id: 'cdc-operational-pilot-fixture',
      version: '1.0.0',
      source: {
        id: 'cdc.socrata.mpgq-jmmr',
        title: 'CDC operational national respiratory admissions',
        homepage: 'https://data.cdc.gov/resource/mpgq-jmmr.json',
        revisionPolicy: 'backfilled',
      },
      value: operationalValue,
      raw: stableStringify(operationalValue),
      measurement: cdcOperationalAdmissionsMeasurement,
      publishedAt: '2026-07-23T00:00:00.000Z',
      sourceVersion: 'pilot-vintage-2026-07-23',
    }),
    request: { id: 'outbreak-pilot-operational' },
    context: {
      requestedAt: clock.now().toISOString(),
      asOf: '2026-07-23T00:00:00.000Z',
    },
  });
  const fixedValue = fixedInitialCovidObservations;
  const fixed = await captureDataSnapshot({
    resolver: inlineDataResolver({
      id: 'cdc-fixed-initial-pilot-fixture',
      version: '1.0.0',
      source: {
        id: 'cdc.socrata.vdzy-6i9v',
        title: 'CDC fixed-initial national respiratory admissions',
        homepage: 'https://data.cdc.gov/resource/vdzy-6i9v.json',
        revisionPolicy: 'first-release',
      },
      value: fixedValue,
      raw: stableStringify(fixedValue),
      measurement: cdcFixedInitialAdmissionsMeasurement,
      publishedAt: '2026-07-23T00:00:00.000Z',
      sourceVersion: 'pilot-vintage-2026-07-23',
    }),
    request: { id: 'outbreak-pilot-fixed-initial' },
    context: {
      requestedAt: clock.now().toISOString(),
      asOf: '2026-07-23T00:00:00.000Z',
    },
  });
  return { operational, fixed };
}

export interface OutbreakReplayResult {
  questionId: string;
  priorForecastId: string;
  modelForecastId: string;
  finalForecastId: string;
  resolutionId?: string;
  scoreIds: readonly string[];
  chainHead?: string;
  auditBundle?: string;
}

export async function runOutbreak2026Replay(options: {
  root: string;
  auditDestination?: string;
  syntheticResolutionValue?: number;
}): Promise<OutbreakReplayResult> {
  const clock = new FixedClock(new Date('2026-07-23T12:00:00.000Z'));
  const workbench = new ForecastWorkbench(options.root, clock);
  await workbench.initialize();
  try {
    const questionRecord = await workbench.registerQuestion(designer, outbreak2026Question);
    const schemaPacket = await workbench.createEvidencePacket({
      actor: designer,
      id: 'outbreak-2026-resolver-schema',
      title: 'CDC resolver schema preflight',
      view: {
        dataset: 'cdc.socrata.vdzy-6i9v',
        fields: [
          'weekendingdate',
          'jurisdiction',
          'totalconfc19newadm',
          'percent_reporting',
        ],
        valueRowsWithheldFromForecaster: true,
      },
      classification: 'public',
      license: 'U.S. government public data',
    });
    const preflight = runQuestionPreflight({
      question: outbreak2026Question,
      designerId: designer.id,
      clock,
      resolverProbe: {
        ok: true,
        schemaRecognized: true,
        message: 'Frozen CDC fixture contains the target resolver fields.',
        artifactId: schemaPacket.artifact.id,
        expectedPublicationAt: outbreak2026Question.expectedResolutionAt,
      },
      historicalValues: fixedInitialCovidObservations.map(({ admissions }) => admissions),
      disclosedPacketIds: [schemaPacket.id],
      designerOnlyPacketIds: [],
      soloWorkflow: false,
    });
    await workbench.recordPreflight(designer, preflight);

    clock.set(new Date('2026-07-23T13:22:18.000Z'));
    const prior = await workbench.sealForecast({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      prediction: outbreak2026Prior,
      updateBasis: {
        kind: 'launch',
        note: 'Historically sealed before current CDC rows and the fresh model run.',
      },
      modelUse: 'none',
      rationale:
        'Summer COVID waves are common, but hospitalization burden has declined and ' +
        'a five-digit count requires meaningful current growth.',
      strongestContraryCase:
        'A current immune-escape wave could already be compounding rapidly.',
      declaredExternalInformation: [
        'General knowledge of prior U.S. summer COVID waves.',
        'Previously committed model documentation, but no fresh model output.',
      ],
    });

    clock.set(new Date('2026-07-23T14:00:00.000Z'));
    const captured = await capturePilotSnapshots(clock);
    const operationalRaw = await workbench.ledger.artifacts.put(captured.operational.raw, {
      mediaType: 'application/json',
      classification: 'public',
    });
    const fixedRaw = await workbench.ledger.artifacts.put(captured.fixed.raw, {
      mediaType: 'application/json',
      classification: 'public',
    });
    if (operationalRaw.id !== captured.operational.snapshot.artifact.id ||
        fixedRaw.id !== captured.fixed.snapshot.artifact.id) {
      throw new Error('Workbench raw artifacts do not match tsimulation snapshot digests');
    }
    const dataPacket = await workbench.createEvidencePacket({
      actor: modelService,
      id: 'outbreak-2026-current-cdc-levels',
      title: 'Current CDC admissions level and endpoint overlap',
      view: {
        operationalLatest: operationalCovidContinuation.at(-1),
        fixedInitialLatest: fixedInitialCovidObservations.at(-1),
        overlapWeeks: fixedInitialCovidObservations.length,
        note:
          'Operational history is revisable/backfilled; fixed-initial rows are the ' +
          'resolution measurement regime.',
      },
      snapshotIds: [
        captured.operational.snapshot.id,
        captured.fixed.snapshot.id,
      ],
      derivedFromArtifactIds: [operationalRaw.id, fixedRaw.id],
      classification: 'public',
      license: 'U.S. government public data',
    });
    const currentExposure = await workbench.revealEvidence({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      packetId: dataPacket.id,
    });

    clock.set(new Date('2026-07-23T14:10:00.000Z'));
    await workbench.sealForecast({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      prediction: outbreak2026Prior,
      updateBasis: {
        kind: 'evidence',
        exposureIds: [currentExposure.id],
        note:
          'Protocol checkpoint for replay. The historical pilot did not preserve a full ' +
          'intermediate categorical distribution, so this checkpoint does not invent one.',
      },
      modelUse: 'none',
      rationale:
        'Current evidence has been seen; no complete historical T1 distribution was saved.',
      strongestContraryCase:
        'The low current count is strong evidence and an unchanged distribution is conservative.',
    });

    const historic = respiratorySeries('covid19');
    const weeks = [
      ...historic.weeks,
      ...operationalCovidContinuation.map(({ weekEnding }) => weekEnding),
    ];
    const values = [
      ...historic.admissions,
      ...operationalCovidContinuation.map(({ admissions }) => admissions),
    ];
    const originIndex = values.length - 1;
    if (weeks[originIndex] !== '2026-07-18') {
      throw new Error('Unexpected outbreak replay forecast origin');
    }
    const operationalByWeek = new Map(
      operationalCovidContinuation.map((row) => [row.weekEnding, row.admissions]),
    );
    const overlapRatios = fixedInitialCovidObservations.map((row) => {
      const operational = operationalByWeek.get(row.weekEnding);
      if (operational === undefined) throw new Error(`Missing overlap at ${row.weekEnding}`);
      return row.admissions / operational;
    });
    const correction = overlapRatios.reduce((sum, value) => sum + value, 0) /
      overlapRatios.length;
    const evidence: EvidenceRecord[] = [
      {
        id: 'outbreak-forecast-operational-admissions',
        label: 'CDC operational, revisable U.S. COVID-19 weekly admissions',
        kind: 'observed',
        role: 'development',
        unit: 'people/week',
        value: operationalCovidContinuation,
        measurement: captured.operational.snapshot.measurement,
        snapshotIds: [captured.operational.snapshot.id],
      },
    ];
    const model = await runOutbreakModelAdapter({
      workbench,
      actor: modelService,
      input: {
        values,
        originIndex,
        model: 'adaptive-ensemble',
        horizon: 4,
        correction,
        operationalSnapshot: captured.operational.snapshot,
        fixedInitialArtifactId: fixedRaw.id,
        evidence,
        createdAt: clock.now().toISOString(),
        ...repositoryState(),
      },
    });
    const modelPacket = await workbench.createEvidencePacket({
      actor: modelService,
      id: 'outbreak-2026-model-conditioned-result',
      title: 'Outbreak model-conditioned categorical result',
      view: {
        prediction: model.modelForecast.prediction,
        discrepancy: model.modelForecast.discrepancy,
        runManifestArtifactId: model.modelForecast.runManifestArtifactId,
        adapter: model.modelForecast.adapter,
      },
      derivedFromArtifactIds: [
        model.modelForecast.runManifestArtifactId,
        fixedRaw.id,
      ],
      classification: 'internal',
    });
    const modelExposure = await workbench.revealEvidence({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      packetId: modelPacket.id,
    });

    clock.set(new Date('2026-07-23T18:00:00.000Z'));
    const final = await workbench.sealForecast({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      prediction: outbreak2026FinalHumanForecast,
      updateBasis: {
        kind: 'model-run',
        modelForecastIds: [model.recordId],
        note: `Model result was exposed in ${modelExposure.id}; human judgment restores novelty tails.`,
      },
      modelUse: 'conditioned',
      modelForecastIds: [model.recordId],
      rationale:
        'The resolver-equivalent level and empirical model strongly favor the bottom bin. ' +
        'The final forecast remains wider and more right-tailed than finite residual support.',
      strongestContraryCase:
        'A moderate immune-escape lineage, worsening reporting coverage, and rapid regional ' +
        'growth could combine into a much faster summer wave.',
    });

    let resolutionId: string | undefined;
    const scoreIds: string[] = [];
    if (options.syntheticResolutionValue !== undefined) {
      clock.set(new Date('2026-09-30T16:00:00.000Z'));
      const synthetic = await workbench.ledger.artifacts.putCanonical({
        syntheticTestFixture: true,
        weekEnding: '2026-08-15',
        admissions: options.syntheticResolutionValue,
      }, { classification: 'internal' });
      const resolution = resolveNumericQuestion({
        question: outbreak2026Question,
        clock,
        resolverImplementationHash: outbreak2026Question.resolver.implementationHash,
        value: options.syntheticResolutionValue,
        snapshotIds: [synthetic.id],
        mappingExplanation:
          'Synthetic integration-test value mapped through the frozen ordered-bin contract.',
        adjudication:
          'SYNTHETIC TEST FIXTURE ONLY. The real 2026 question remains open and unresolved.',
      });
      const resolutionRecord = await workbench.recordResolution(resolverActor, resolution);
      resolutionId = resolutionRecord.id;
      for (const forecastId of [prior.id, final.id]) {
        const score = await workbench.scoreForecast({
          actor: resolverActor,
          forecastId,
          resolutionId,
        });
        scoreIds.push(score.id);
      }
    } else {
      clock.set(new Date('2026-07-23T18:05:00.000Z'));
      const pending = await workbench.recordResolution(resolverActor, {
        schemaVersion: 'forecast-workbench.resolution/v1',
        questionHash: questionRecord.id,
        status: 'pending',
        resolvedAt: clock.now().toISOString(),
        resolverId: outbreak2026Question.resolver.id,
        resolverVersion: outbreak2026Question.resolver.version,
        resolverImplementationHash: outbreak2026Question.resolver.implementationHash,
        snapshotIds: [],
        observationVersionIds: [],
        adjudication:
          'Question remains open; resolution is scheduled for 2026-09-30T16:00:00Z.',
      });
      resolutionId = pending.id;
    }

    if (options.auditDestination) {
      await exportAuditBundle({
        ledger: workbench.ledger,
        clock,
        destination: options.auditDestination,
      });
    }
    const verification = await workbench.ledger.verify();
    return {
      questionId: questionRecord.id,
      priorForecastId: prior.id,
      modelForecastId: model.recordId,
      finalForecastId: final.id,
      resolutionId,
      scoreIds,
      chainHead: verification.chainHead,
      auditBundle: options.auditDestination,
    };
  } finally {
    workbench.close();
  }
}

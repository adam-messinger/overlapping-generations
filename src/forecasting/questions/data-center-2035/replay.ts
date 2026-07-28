import { execFileSync } from 'node:child_process';
import {
  FixedClock,
  ForecastWorkbench,
  exportAuditBundle,
  runQuestionPreflight,
  type Actor,
} from 'forecast-workbench';
import {
  dataCenter2035FinalHumanForecast,
  dataCenter2035PreModelForecast,
  dataCenter2035Prior,
  dataCenter2035Question,
} from './question.js';
import { runDataCenter2035ModelAdapter } from './model-adapter.js';

const designer: Actor = { id: 'question-designer', role: 'designer' };
const forecaster: Actor = { id: 'data-center-pilot-forecaster', role: 'forecaster' };
const modelService = { id: 'model-runner', role: 'service' } as const;
const resolver: Actor = { id: 'resolution-service', role: 'resolver' };

function repositoryState(): { gitSha?: string; dirty?: boolean } {
  try {
    return {
      gitSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      dirty: execFileSync('git', ['status', '--porcelain'], {
        encoding: 'utf8',
      }).trim().length > 0,
    };
  } catch {
    return {};
  }
}

export interface DataCenter2035ReplayResult {
  questionId: string;
  priorForecastId: string;
  preModelForecastId: string;
  modelForecastId: string;
  finalForecastId: string;
  referenceClassId: string;
  conditionalSetIds: readonly string[];
  triggerIds: readonly string[];
  resolutionId: string;
  chainHead?: string;
  auditBundle?: string;
}

export async function runDataCenter2035Replay(options: {
  root: string;
  auditDestination?: string;
}): Promise<DataCenter2035ReplayResult> {
  const clock = new FixedClock(new Date('2026-07-23T13:00:00.000Z'));
  const workbench = new ForecastWorkbench(options.root, clock);
  await workbench.initialize();
  try {
    const questionRecord = await workbench.registerQuestion(
      designer,
      dataCenter2035Question,
    );
    const schemaPacket = await workbench.createEvidencePacket({
      actor: designer,
      id: 'data-center-2035-resolver-preflight',
      title: 'Retrospective resolver hierarchy and outcome schema',
      view: {
        hierarchy: [
          'DOE/LBNL/EIA retrospective',
          'IEA or congressional retrospective',
          'cancel rather than use a projection',
        ],
        bins: dataCenter2035Question.outcome,
        valueRowsWithheldFromForecaster: true,
      },
      classification: 'public',
      license: 'U.S. government and public institutional publications',
    });
    await workbench.recordPreflight(designer, runQuestionPreflight({
      question: dataCenter2035Question,
      designerId: designer.id,
      clock,
      resolverProbe: {
        ok: true,
        schemaRecognized: true,
        message:
          'The resolver hierarchy, share denominator, revision cutoff, fallback, and cancellation rule are explicit.',
        artifactId: schemaPacket.artifact.id,
        expectedPublicationAt: dataCenter2035Question.expectedResolutionAt,
      },
      historicalValues: [0.076, 0.095, 0.118, 0.153, 0.20],
      disclosedPacketIds: [schemaPacket.id],
      designerOnlyPacketIds: [],
      soloWorkflow: false,
    }));

    clock.set(new Date('2026-07-23T13:21:37.000Z'));
    const prior = await workbench.sealForecast({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      prediction: dataCenter2035Prior,
      updateBasis: {
        kind: 'launch',
        note: 'Historically sealed before targeted research and fresh simulations.',
      },
      modelUse: 'none',
      rationale:
        'AI load growth is material, but grid, utilization, efficiency, financing, ' +
        'and duplicate-project constraints make an uninterrupted exponential path unlikely.',
      strongestContraryCase:
        'The prior already knew the public 20% headline and may underweight a durable new workload regime.',
      declaredExternalInformation: [
        'Broad background knowledge of AI infrastructure growth.',
        'Previously encountered public claim near 20% in 2035.',
      ],
    });

    clock.set(new Date('2026-07-23T14:00:00.000Z'));
    const evidenceArtifact = await workbench.ledger.artifacts.putCanonical({
      frozenAt: clock.now().toISOString(),
      evidence: [
        {
          id: 'epa-2007-versus-2011',
          claim:
            'The 2007 current-efficiency forecast was about 25% above the later midpoint.',
        },
        {
          id: 'lbnl-2016-versus-2024',
          claim:
            'The 2016 model missed the accelerated-server workload regime on the low side.',
        },
        {
          id: 'lbnl-june-2026',
          claim: 'Specialized 2030 reference full-site share was 11.8%.',
        },
        {
          id: 'eia-aeo-2026',
          claim:
            'General-energy-model 2035 server electricity remained much lower after a full-site conversion.',
        },
        {
          id: 'bnef-and-queue-evidence',
          claim:
            'The project pipeline is large, but announced capacity and queue requests have serious realization risk.',
        },
      ],
      interpretation:
        'This is the historically published evidence summary, not a newly fetched 2026 vintage.',
    }, { classification: 'public' });
    const candidateUniverse = await workbench.ledger.artifacts.putCanonical({
      searchCutoffAt: '2026-07-23T14:00:00.000Z',
      query:
        'Published U.S. national, full-site data-center electricity forecasts later revisited by a comparable bottom-up study.',
      candidates: ['EPA 2007 to 2011', 'LBNL 2016 to 2024'],
    }, { classification: 'public' });
    const referenceClass = await workbench.recordReferenceClass(designer, {
      schemaVersion: 'forecast-workbench.reference-class/v1',
      id: 'us-data-center-national-forecast-revisions',
      version: '1.0.0',
      questionHash: questionRecord.id,
      createdAt: clock.now().toISOString(),
      searchProtocol:
        'Preserve every clean national full-site forecast episode found before the cutoff.',
      searchCutoffAt: clock.now().toISOString(),
      candidateUniverseArtifactId: candidateUniverse.id,
      construction: 'retrospective',
      cases: [
        {
          id: 'epa-2007-to-2011',
          label: 'EPA 2007 forecast revisited in 2011',
          decision: 'included',
          reason: 'Comparable national full-site estimate and later reconstruction.',
          outcomeId: 'overpredicted',
          outcomeObservationVersionIds: [],
        },
        {
          id: 'lbnl-2016-to-2024',
          label: 'LBNL 2016 forecast revisited in 2024',
          decision: 'included',
          reason: 'Comparable national estimate and later workload-regime revision.',
          outcomeId: 'underpredicted',
          outcomeObservationVersionIds: [],
        },
      ],
      denominatorRule: 'Two included, clean-enough national forecast episodes.',
      alternateReferenceClassIds: [],
      limitations:
        'Two heterogeneous cases cannot identify a numerical event rate; they only show misses in both directions.',
    }, 'public');
    const evidencePacket = await workbench.createEvidencePacket({
      actor: designer,
      id: 'data-center-2035-research-evidence',
      title: 'Frozen reference class and current model-family evidence',
      view: {
        referenceClassRecordId: referenceClass.id,
        directionalResult: 'one overprediction and one underprediction',
        lbnl2030ReferenceShare: 0.118,
        modelFamiliesDisagree: true,
      },
      derivedFromArtifactIds: [evidenceArtifact.id, candidateUniverse.id],
      classification: 'public',
    });
    const evidenceExposure = await workbench.revealEvidence({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      packetId: evidencePacket.id,
    });

    clock.set(new Date('2026-07-23T15:00:00.000Z'));
    const preModel = await workbench.sealForecast({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      prediction: dataCenter2035PreModelForecast,
      updateBasis: {
        kind: 'evidence',
        exposureIds: [evidenceExposure.id],
        note:
          'Reconstructed historical checkpoint after the final qualitative evidence stage and before the quantitative adapter.',
      },
      modelUse: 'none',
      referenceClassIds: [referenceClass.id],
      rationale:
        'LBNL raises the high tail; EIA and realization evidence restore meaningful sub-10% mass.',
      strongestContraryCase:
        'The newer specialized evidence may deserve more weight than this balanced checkpoint gives it.',
    });

    const model = await runDataCenter2035ModelAdapter({
      workbench,
      actor: modelService,
      evidenceArtifactIds: [evidenceArtifact.id],
      createdAt: clock.now().toISOString(),
      ...repositoryState(),
    });
    const modelPacket = await workbench.createEvidencePacket({
      actor: modelService,
      id: 'data-center-2035-model-conditioned-result',
      title: 'Seeded structural-family mixture result',
      view: {
        prediction: model.modelForecast.prediction,
        discrepancy: model.modelForecast.discrepancy,
        runManifestArtifactId: model.modelForecast.runManifestArtifactId,
      },
      derivedFromArtifactIds: [
        model.modelForecast.runManifestArtifactId,
        evidenceArtifact.id,
      ],
      classification: 'internal',
    });
    await workbench.revealEvidence({
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
      prediction: dataCenter2035FinalHumanForecast,
      updateBasis: {
        kind: 'model-run',
        modelForecastIds: [model.recordId],
        note:
          'Human judgment gives somewhat more weight to newer specialized evidence than the adapter.',
      },
      modelUse: 'conditioned',
      modelForecastIds: [model.recordId],
      referenceClassIds: [referenceClass.id],
      rationale:
        'Rapid growth through 2030 followed by deceleration is central; structural disagreement widens both tails.',
      strongestContraryCase:
        'EIA, queue attrition, efficiency, weaker returns, and denominator growth can keep the share below 10%.',
    });

    const conditionalSets = [
      {
        id: 'data-center-2030-share-bridge',
        unconditionalTargetProbability: 0.28,
        branches: [
          { id: 'yes', label: '2030 share is at least 12%', branchProbability: 0.45, targetProbability: 0.53 },
          { id: 'no', label: '2030 share is below 12%', branchProbability: 0.55, targetProbability: 0.10 },
        ],
      },
      {
        id: 'data-center-2028-twh-bridge',
        unconditionalTargetProbability: 0.28,
        branches: [
          { id: 'yes', label: '2028 use is at least 500 TWh', branchProbability: 0.35, targetProbability: 0.45 },
          { id: 'no', label: '2028 use is below 500 TWh', branchProbability: 0.65, targetProbability: 0.19 },
        ],
      },
      {
        id: 'data-center-post-2030-growth-bridge',
        unconditionalTargetProbability: 0.28,
        branches: [
          { id: 'yes', label: 'Relative odds growth is at least 10%/yr', branchProbability: 0.40, targetProbability: 0.60 },
          { id: 'no', label: 'Relative odds growth is below 10%/yr', branchProbability: 0.60, targetProbability: 0.06 },
        ],
      },
    ] as const;
    const conditionalSetIds: string[] = [];
    for (const set of conditionalSets) {
      const record = await workbench.recordConditionalSet(forecaster, {
        schemaVersion: 'forecast-workbench.conditional-set/v1',
        id: set.id,
        version: '1.0.0',
        questionHash: questionRecord.id,
        forecasterId: forecaster.id,
        createdAt: clock.now().toISOString(),
        unconditionalTargetProbability: set.unconditionalTargetProbability,
        completeMutuallyExclusivePartition: true,
        branches: set.branches,
      });
      conditionalSetIds.push(record.id);
    }
    const triggerDefinitions = [
      {
        id: 'data-center-measured-2030-share',
        sourceProfileId: 'lbnl.queued-up',
        description: 'Qualifying 2030 retrospective full-site share reaches 12%.',
        valuePath: 'share2030',
        operator: 'gte' as const,
        threshold: 0.12,
      },
      {
        id: 'data-center-measured-2028-twh',
        sourceProfileId: 'eia.api-v2',
        description: 'Qualifying 2028 data-center electricity estimate reaches 500 TWh.',
        valuePath: 'dataCenterTwh2028',
        operator: 'gte' as const,
        threshold: 500,
      },
      {
        id: 'data-center-queue-realization-change',
        sourceProfileId: 'lbnl.queued-up',
        description: 'Queue and energized-load realization data change materially.',
        valuePath: 'realizationRate',
        operator: 'changed' as const,
      },
    ];
    const triggerIds: string[] = [];
    for (const trigger of triggerDefinitions) {
      const record = await workbench.recordTrigger(designer, {
        schemaVersion: 'forecast-workbench.trigger/v1',
        id: trigger.id,
        version: '1.0.0',
        questionHash: questionRecord.id,
        sourceProfileId: trigger.sourceProfileId,
        schedule: 'P90D',
        description: trigger.description,
        valuePath: trigger.valuePath,
        operator: trigger.operator,
        ...('threshold' in trigger ? { threshold: trigger.threshold } : {}),
        notificationPolicy: 'magnitude-bearing',
      });
      triggerIds.push(record.id);
    }

    clock.set(new Date('2026-07-23T18:05:00.000Z'));
    const pending = await workbench.recordResolution(resolver, {
      schemaVersion: 'forecast-workbench.resolution/v1',
      questionHash: questionRecord.id,
      status: 'pending',
      resolvedAt: clock.now().toISOString(),
      resolverId: dataCenter2035Question.resolver.id,
      resolverVersion: dataCenter2035Question.resolver.version,
      resolverImplementationHash:
        dataCenter2035Question.resolver.implementationHash,
      snapshotIds: [],
      observationVersionIds: [],
      adjudication:
        'Question remains open; qualifying retrospectives are evaluated at the frozen cutoff.',
    });
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
      preModelForecastId: preModel.id,
      modelForecastId: model.recordId,
      finalForecastId: final.id,
      referenceClassId: referenceClass.id,
      conditionalSetIds,
      triggerIds,
      resolutionId: pending.id,
      chainHead: verification.chainHead,
      auditBundle: options.auditDestination,
    };
  } finally {
    workbench.close();
  }
}

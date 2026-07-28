import { execFileSync } from 'node:child_process';
import {
  FixedClock,
  ForecastWorkbench,
  exportAuditBundle,
  runQuestionPreflight,
  type Actor,
  type Prediction,
  type RecordReference,
} from 'forecast-workbench';
import {
  hormuz2026FinalHumanForecast,
  hormuz2026Prior,
  hormuz2026Question,
  hormuzBinaryPrediction,
} from './question.js';
import {
  runHormuzScenarioAdapters,
  type HormuzScenarioModelResult,
} from './model-adapter.js';

const designer: Actor = { id: 'question-designer', role: 'designer' };
const forecaster: Actor = { id: 'hormuz-pilot-forecaster', role: 'forecaster' };
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

export interface Hormuz2026ReplayResult {
  questionId: string;
  forecastIds: readonly string[];
  modelForecastIds: readonly string[];
  modelResults: readonly HormuzScenarioModelResult[];
  finalForecastId: string;
  referenceClassIds: readonly string[];
  conditionalSetIds: readonly string[];
  triggerIds: readonly string[];
  resolutionId: string;
  chainHead?: string;
  auditBundle?: string;
}

export async function runHormuz2026Replay(options: {
  root: string;
  auditDestination?: string;
}): Promise<Hormuz2026ReplayResult> {
  const clock = new FixedClock(new Date('2026-07-23T13:00:00.000Z'));
  const workbench = new ForecastWorkbench(options.root, clock);
  await workbench.initialize();
  try {
    const questionRecord = await workbench.registerQuestion(
      designer,
      hormuz2026Question,
    );
    const schemaPacket = await workbench.createEvidencePacket({
      actor: designer,
      id: 'hormuz-2026-resolver-preflight',
      title: 'PortWatch resolver schema and fixed window',
      view: {
        portid: 'chokepoint6',
        field: 'n_total',
        utcDates: ['2026-12-01', '2026-12-21'],
        threshold: 62,
        minimumFallbackDays: 17,
        valuesWithheldFromForecaster: true,
      },
      classification: 'public',
    });
    await workbench.recordPreflight(designer, runQuestionPreflight({
      question: hormuz2026Question,
      designerId: designer.id,
      clock,
      resolverProbe: {
        ok: true,
        schemaRecognized: true,
        message: 'PortWatch has the fixed chokepoint, date, and n_total fields.',
        artifactId: schemaPacket.artifact.id,
        expectedPublicationAt: hormuz2026Question.expectedResolutionAt,
      },
      disclosedPacketIds: [schemaPacket.id],
      designerOnlyPacketIds: [],
      soloWorkflow: false,
    }));

    clock.set(new Date('2026-07-23T13:20:00.000Z'));
    const prior = await workbench.sealForecast({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      prediction: hormuz2026Prior,
      updateBasis: {
        kind: 'launch',
        note:
          'Historical prior; this replay assigns a protocol timestamp because only the date was preserved.',
      },
      modelUse: 'none',
      rationale:
        'Five months allowed meaningful time for a bargain under high mutual costs, but active war made restoration uncertain.',
      strongestContraryCase:
        'A June reopening attempt had already relapsed, and durable carrier return requires more than signed text.',
      declaredExternalInformation: [
        'War active on July 23.',
        'Normal traffic broadly near 88 daily calls.',
        'June reopening attempt had relapsed.',
      ],
    });
    const forecastIds: string[] = [prior.id];

    const revealAndUpdate = async (options: {
      at: string;
      packet: RecordReference;
      probabilityYes: number;
      rationale: string;
      strongestContraryCase: string;
      referenceClassIds?: readonly string[];
    }): Promise<RecordReference> => {
      clock.set(new Date(options.at));
      const exposure = await workbench.revealEvidence({
        actor: forecaster,
        questionHash: questionRecord.id,
        forecasterId: forecaster.id,
        seriesId: 'published-human',
        packetId: options.packet.id,
      });
      clock.advance(10 * 60_000);
      const forecast = await workbench.sealForecast({
        actor: forecaster,
        questionHash: questionRecord.id,
        forecasterId: forecaster.id,
        seriesId: 'published-human',
        prediction: hormuzBinaryPrediction(options.probabilityYes),
        updateBasis: {
          kind: 'evidence',
          exposureIds: [exposure.id],
          note:
            'Historical stage order and probabilities were preserved; replay times are protocol assignments.',
        },
        modelUse: 'none',
        referenceClassIds: options.referenceClassIds,
        rationale: options.rationale,
        strongestContraryCase: options.strongestContraryCase,
      });
      forecastIds.push(forecast.id);
      return forecast;
    };

    const transitArtifact = await workbench.ledger.artifacts.putCanonical({
      source: 'Straits.live mirror of IMF PortWatch',
      pinnedCommit: '07be7ed259aa56a7470567f5d1efa7f3439c5199',
      citedRawSha256:
        '089783b3fbe3a5d9853fe19e04189c801f4f48c2bd6e39b4e4f4c2af26fbdfa6',
      rawPayloadAvailability:
        'The historical raw CSV is not checked into this repository; this record preserves the published summary and cited digest.',
      windows: {
        preWar: { start: '2025-03-30', end: '2026-02-27', days: 335, mean: 90.02, median: 89, tankerMean: 50.42 },
        postClosure: { start: '2026-02-28', end: '2026-07-19', days: 142, mean: 10.26, median: 7, tankerMean: 4.04 },
        juneResponse: { start: '2026-06-17', end: '2026-06-30', days: 14, mean: 25, median: 21.5, tankerMean: 10.43 },
        latestSevenDays: { start: '2026-07-13', end: '2026-07-19', days: 7, mean: 12.14, median: 11, tankerMean: 3.86 },
      },
      bestPostClosureSevenDayMean: 33.86,
    }, { classification: 'public' });
    const transitPacket = await workbench.createEvidencePacket({
      actor: designer,
      id: 'hormuz-2026-portwatch-history',
      title: 'Pinned PortWatch history through July 19',
      view: {
        latestSevenDayMean: 12.14,
        bestPostClosureSevenDayMean: 33.86,
        questionThreshold: 62,
      },
      derivedFromArtifactIds: [transitArtifact.id],
      classification: 'public',
    });
    await revealAndUpdate({
      at: '2026-07-23T14:00:00.000Z',
      packet: transitPacket,
      probabilityYes: 0.45,
      rationale:
        'The current level was only about one fifth of the threshold, and the failed June response peaked far below it.',
      strongestContraryCase:
        'A low July level leaves several months for a nonlinear diplomatic and commercial reopening.',
    });

    const referenceUniverse = await workbench.ledger.artifacts.putCanonical({
      strictRule: [
        'internationally important chokepoint',
        'hostile action or conflict caused closure or at least 40% contraction',
        'episode began 1956–2025',
        'at least 152 days observed',
        'restoration depended on political or security conditions',
      ],
      candidates: [
        'Suez crisis 1956–57',
        'Suez closure 1967–75',
        'Red Sea attacks beginning 2023',
        'Ever Given 2021',
        'Tanker War',
      ],
    }, { classification: 'public' });
    const commonCases = [
      {
        id: 'suez-1956',
        label: 'Suez crisis 1956–57',
        decision: 'included' as const,
        reason: 'Hostile closure with 152-day follow-up.',
        outcomeId: 'yes',
        outcomeObservationVersionIds: [],
      },
      {
        id: 'suez-1967',
        label: 'Suez closure after the 1967 war',
        decision: 'included' as const,
        reason: 'Hostile closure with long follow-up.',
        outcomeId: 'no',
        outcomeObservationVersionIds: [],
      },
      {
        id: 'red-sea-2023',
        label: 'Red Sea attacks beginning 2023',
        decision: 'included' as const,
        reason: 'Hostile traffic contraction and long follow-up.',
        outcomeId: 'no',
        outcomeObservationVersionIds: [],
      },
    ];
    const strictReference = await workbench.recordReferenceClass(designer, {
      schemaVersion: 'forecast-workbench.reference-class/v1',
      id: 'hostile-chokepoint-restoration-152-days',
      version: '1.0.0',
      questionHash: questionRecord.id,
      createdAt: '2026-07-23T14:15:00.000Z',
      searchProtocol: 'Apply the five frozen strict criteria to the candidate universe.',
      searchCutoffAt: '2026-07-23T14:15:00.000Z',
      candidateUniverseArtifactId: referenceUniverse.id,
      construction: 'retrospective',
      cases: [
        ...commonCases,
        {
          id: 'ever-given-2021',
          label: 'Ever Given obstruction',
          decision: 'excluded',
          reason: 'Mechanical obstruction did not require a political settlement.',
          outcomeObservationVersionIds: [],
        },
        {
          id: 'tanker-war',
          label: '1980s Tanker War',
          decision: 'excluded',
          reason: 'Traffic did not contract by the frozen 40% threshold.',
          outcomeObservationVersionIds: [],
        },
      ],
      denominatorRule: 'Three included hostile/security episodes; one restored within 152 days.',
      alternateReferenceClassIds: ['broader-chokepoint-restoration-with-ever-given'],
      limitations:
        'Tiny heterogeneous sample; endpoint is easier than a fixed 21-day 70%-of-normal mean.',
    }, 'public');
    const broadReference = await workbench.recordReferenceClass(designer, {
      schemaVersion: 'forecast-workbench.reference-class/v1',
      id: 'broader-chokepoint-restoration-with-ever-given',
      version: '1.0.0',
      questionHash: questionRecord.id,
      createdAt: '2026-07-23T14:16:00.000Z',
      searchProtocol:
        'Use the strict class but include a large accidental physical obstruction as a sensitivity case.',
      searchCutoffAt: '2026-07-23T14:15:00.000Z',
      candidateUniverseArtifactId: referenceUniverse.id,
      construction: 'retrospective',
      cases: [
        ...commonCases,
        {
          id: 'ever-given-2021',
          label: 'Ever Given obstruction',
          decision: 'included',
          reason: 'Included only in the broader physical-obstruction sensitivity class.',
          outcomeId: 'yes',
          outcomeObservationVersionIds: [],
        },
      ],
      denominatorRule: 'Four included disruption episodes; two restored within 152 days.',
      alternateReferenceClassIds: ['hostile-chokepoint-restoration-152-days'],
      limitations:
        'The accidental obstruction is causally much easier to reverse than a war closure.',
    }, 'public');
    const referencePacket = await workbench.createEvidencePacket({
      actor: designer,
      id: 'hormuz-2026-reference-classes',
      title: 'Strict and broad chokepoint reference classes',
      view: {
        strict: { recordId: strictReference.id, numerator: 1, denominator: 3, rate: 1 / 3 },
        broad: { recordId: broadReference.id, numerator: 2, denominator: 4, rate: 0.5 },
      },
      derivedFromArtifactIds: [referenceUniverse.id],
      classification: 'public',
    });
    await revealAndUpdate({
      at: '2026-07-23T14:30:00.000Z',
      packet: referencePacket,
      probabilityYes: 0.38,
      referenceClassIds: [strictReference.id, broadReference.id],
      rationale:
        'The strict 1/3 rate and broad 1/2 sensitivity pulled the prior down while leaving a wide bracket.',
      strongestContraryCase:
        'The cases are heterogeneous, and today’s mutual economic pressure is unlike the longest closure.',
    });

    const securityArtifact = await workbench.ledger.artifacts.putCanonical({
      asOf: '2026-07-23',
      confirmedIncidentsThroughJuly21: 61,
      seafarerFatalities: 17,
      latestSevenDayMean: 12.14,
      trappedSeafarersApproximate: 6_000,
      interpretation:
        'Renewed attacks, paused evacuation, and competing blockades reduce the chance of durable commercial return.',
    }, { classification: 'public' });
    const securityPacket = await workbench.createEvidencePacket({
      actor: designer,
      id: 'hormuz-2026-security-evidence',
      title: 'Security and commercial-operability evidence',
      view: {
        confirmedIncidents: 61,
        evacuationPaused: true,
        routineCarrierReturnObserved: false,
      },
      derivedFromArtifactIds: [securityArtifact.id],
      classification: 'public',
    });
    await revealAndUpdate({
      at: '2026-07-23T15:00:00.000Z',
      packet: securityPacket,
      probabilityYes: 0.30,
      referenceClassIds: [strictReference.id, broadReference.id],
      rationale:
        'Renewed attacks, fatalities, a paused evacuation, and absent routine traffic weakened the near-term reopening path.',
      strongestContraryCase:
        'Escalation itself raises pressure for a bargain and can reverse quickly after credible enforcement.',
    });

    const marketArtifact = await workbench.ledger.artifacts.putCanonical({
      observedAt: '2026-07-23T13:33:14.000Z',
      venue: 'Polymarket',
      market:
        'Strait of Hormuz traffic returns to normal by December 31',
      probabilityYes: 0.495,
      volumeUsdApproximate: 5_670_000,
      citedStatusBundleSha256:
        '882e8dfc72fd7cc47b42d7d07a3db71100abf86d4ead8d4fdc9e0566a2f36b92',
      nonEquivalence:
        'Market resolves on one seven-day mean of 60 by December 31; the workbench question needs a 21-day mean of 62 during December 1–21.',
    }, { classification: 'public' });
    const marketPacket = await workbench.createEvidencePacket({
      actor: designer,
      id: 'hormuz-2026-market-and-contrary-case',
      title: 'Easier prediction-market comparator and strongest contrary evidence',
      view: {
        easierMarketProbability: 0.495,
        easierTarget: true,
        signedDealPrecedent: true,
        mediationContinues: true,
      },
      derivedFromArtifactIds: [marketArtifact.id],
      classification: 'public',
    });
    await revealAndUpdate({
      at: '2026-07-23T15:30:00.000Z',
      packet: marketPacket,
      probabilityYes: 0.39,
      referenceClassIds: [strictReference.id, broadReference.id],
      rationale:
        'The easier liquid market, signed-deal precedent, mediation, and high mutual costs restored some Yes probability.',
      strongestContraryCase:
        'The market target is materially easier and may share the same headline anchoring.',
    });

    clock.set(new Date('2026-07-23T16:00:00.000Z'));
    const models = await runHormuzScenarioAdapters({
      workbench,
      actor: modelService,
      evidenceArtifactIds: [
        transitArtifact.id,
        securityArtifact.id,
        marketArtifact.id,
      ],
      createdAt: clock.now().toISOString(),
      ...repositoryState(),
    });
    const modelPacket = await workbench.createEvidencePacket({
      actor: modelService,
      id: 'hormuz-2026-scenario-results',
      title: 'Conditional Hormuz physical paths; native probability not identified',
      view: {
        identifiedProbability: false,
        scenarios: models.map((model) => ({
          scenarioId: model.scenarioId,
          decemberThroughput: model.decemberThroughput,
          naiveDailyCallProxy: model.naiveDailyCallProxy,
          conditionalOutcomeId: model.conditionalOutcomeId,
          modelForecastRecordId: model.recordId,
        })),
        warning:
          'The paths lack probabilities and the oil-volume-to-all-vessel-count proxy is uncalibrated.',
      },
      derivedFromArtifactIds: models.map(
        ({ modelForecast }) => modelForecast.runManifestArtifactId,
      ),
      classification: 'internal',
    });
    const modelExposure = await workbench.revealEvidence({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      packetId: modelPacket.id,
    });
    clock.set(new Date('2026-07-23T16:10:00.000Z'));
    const modelForecastIds = models.map(({ recordId }) => recordId);
    const final = await workbench.sealForecast({
      actor: forecaster,
      questionHash: questionRecord.id,
      forecasterId: forecaster.id,
      seriesId: 'published-human',
      prediction: hormuz2026FinalHumanForecast,
      updateBasis: {
        kind: 'model-run',
        modelForecastIds,
        note:
          `Scenario evidence was exposed in ${modelExposure.id}; neither run supplies path weights.`,
      },
      modelUse: 'consulted',
      modelForecastIds,
      referenceClassIds: [strictReference.id, broadReference.id],
      rationale:
        'The model clarifies opposite conditional paths and economic stakes but supplies no update to the 39% political judgment.',
      strongestContraryCase:
        'A durable attack halt by October could permit clearance, repricing, and carrier return before the fixed window.',
    });
    forecastIds.push(final.id);

    const conditionalDefinitions = [
      {
        id: 'hormuz-attack-halt-21-days',
        branchProbability: 0.45,
        targetIfYes: 0.78,
        targetIfNo: 0.07,
        yesLabel: 'Publicly acknowledged attack halt lasts 21 days by October 31',
      },
      {
        id: 'hormuz-portwatch-seven-day-40',
        branchProbability: 0.42,
        targetIfYes: 0.80,
        targetIfNo: 0.09,
        yesLabel: 'PortWatch seven-day mean reaches 40 by November 15',
      },
      {
        id: 'hormuz-six-major-carriers-return',
        branchProbability: 0.37,
        targetIfYes: 0.86,
        targetIfNo: 0.11,
        yesLabel: 'At least six of nine largest carriers resume regular bookings by November 15',
      },
    ];
    const conditionalSetIds: string[] = [];
    for (const definition of conditionalDefinitions) {
      const record = await workbench.recordConditionalSet(forecaster, {
        schemaVersion: 'forecast-workbench.conditional-set/v1',
        id: definition.id,
        version: '1.0.0',
        questionHash: questionRecord.id,
        forecasterId: forecaster.id,
        createdAt: clock.now().toISOString(),
        unconditionalTargetProbability: 0.39,
        completeMutuallyExclusivePartition: true,
        branches: [
          {
            id: 'yes',
            label: definition.yesLabel,
            branchProbability: definition.branchProbability,
            targetProbability: definition.targetIfYes,
          },
          {
            id: 'no',
            label: `Not: ${definition.yesLabel}`,
            branchProbability: 1 - definition.branchProbability,
            targetProbability: definition.targetIfNo,
          },
        ],
      });
      conditionalSetIds.push(record.id);
    }
    const triggerDefinitions = [
      {
        id: 'hormuz-attack-halt-days',
        sourceProfileId: 'official-security-releases',
        description: 'A publicly acknowledged attack halt reaches 21 consecutive days.',
        valuePath: 'consecutiveAttackHaltDays',
        operator: 'gte' as const,
        threshold: 21,
      },
      {
        id: 'hormuz-portwatch-seven-day-mean',
        sourceProfileId: 'imf.portwatch.daily-chokepoint',
        description: 'PortWatch seven-day total-call mean reaches 40.',
        valuePath: 'sevenDayMean',
        operator: 'gte' as const,
        threshold: 40,
      },
      {
        id: 'hormuz-major-carrier-return',
        sourceProfileId: 'carrier-advisories',
        description: 'At least six of nine largest carriers resume regular Hormuz bookings.',
        valuePath: 'regularCarrierCount',
        operator: 'gte' as const,
        threshold: 6,
      },
      {
        id: 'hormuz-mine-clearance-change',
        sourceProfileId: 'imo-jmic',
        description: 'Authoritative mine-clearance or corridor assurance changes.',
        valuePath: 'clearanceStatus',
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
        schedule: trigger.id.includes('portwatch') ? 'P7D' : 'P1D',
        description: trigger.description,
        valuePath: trigger.valuePath,
        operator: trigger.operator,
        ...('threshold' in trigger ? { threshold: trigger.threshold } : {}),
        notificationPolicy: 'magnitude-bearing',
      });
      triggerIds.push(record.id);
    }

    clock.set(new Date('2026-07-23T16:15:00.000Z'));
    const pending = await workbench.recordResolution(resolver, {
      schemaVersion: 'forecast-workbench.resolution/v1',
      questionHash: questionRecord.id,
      status: 'pending',
      resolvedAt: clock.now().toISOString(),
      resolverId: hormuz2026Question.resolver.id,
      resolverVersion: hormuz2026Question.resolver.version,
      resolverImplementationHash: hormuz2026Question.resolver.implementationHash,
      snapshotIds: [],
      observationVersionIds: [],
      adjudication:
        'Question remains open; resolution awaits the first complete post-window PortWatch vintage.',
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
      forecastIds,
      modelForecastIds,
      modelResults: models,
      finalForecastId: final.id,
      referenceClassIds: [strictReference.id, broadReference.id],
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

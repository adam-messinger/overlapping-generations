import { execFileSync } from 'node:child_process';
import {
  FixedClock,
  ForecastWorkbench,
  exportAuditBundle,
  type Actor,
  type NewsModelComparison,
  type NewsScreenStory,
} from 'forecast-workbench';
import {
  createRunManifest,
  manifestToJson,
  runModel,
  type ModelDefinition,
} from 'tsimulation';
import {
  germanySickNoteCase,
  nvidiaVendorFinancingCase,
  spainLabourMarketCase,
} from '../../../simulations/news/headline-experiments-2026-07-28.js';
import {
  germanySickNoteV1Model,
  germanySickNoteV2Model,
  nvidiaVendorFinancingV1Model,
  nvidiaVendorFinancingV2Model,
  spainLabourMarketV1Model,
  spainLabourMarketV2Model,
  type HeadlineModelInput,
  type HeadlineModelOutput,
} from '../../../simulations/news/headline-models-2026-07-28.js';

const analyst: Actor = {
  id: 'daily-news-modeling-analyst',
  role: 'forecaster',
};
const modelService = {
  id: 'model-runner',
  role: 'service',
} as const;

const sources = {
  spainReuters: {
    id: 'spain-reuters',
    title: 'Spain unemployment falls to 9.87% in Q2',
    publisher: 'Reuters via Investing.com',
    url:
      'https://www.investing.com/news/economic-indicators/' +
      'spains-unemployment-rate-falls-to-987-in-q2-lowest-in-18-years-4815685',
  },
  spainIne: {
    id: 'spain-ine',
    title: 'Economically Active Population Survey, 2026 Q2',
    publisher: 'Instituto Nacional de Estadística',
    url: 'https://www.ine.es/dyngs/Prensa/es/EPA2T26.htm',
  },
  marketWrap: {
    id: 'global-market-wrap',
    title: 'AI anxiety sparks tech rout',
    publisher: 'Reuters via Investing.com',
    url:
      'https://au.investing.com/news/stock-market-news/' +
      'ai-anxiety-sparks-tech-rout-broad-selloff-in-asian-markets-4555334',
  },
  nvidiaReuters: {
    id: 'nvidia-financing-reuters',
    title: 'Nvidia CDS and circular-financing concern',
    publisher: 'Investing.com market report',
    url:
      'https://www.investing.com/news/stock-market-news/' +
      'nvidias-rising-cds-the-talk-of-wall-street-amid-circular-financing-fears-4816626',
  },
  germanyReuters: {
    id: 'germany-sick-note-reuters',
    title: 'Germany sick-note crackdown analysis',
    publisher: 'Reuters via Investing.com',
    url:
      'https://www.investing.com/news/economy-news/' +
      'analysisgermanys-sicknote-crackdown-may-be-treating-the-symptoms-not-the-disease-4812967',
  },
  germanyOecd: {
    id: 'germany-sick-note-oecd',
    title: 'OECD Economic Survey of Germany 2025',
    publisher: 'OECD',
    url:
      'https://www.oecd.org/en/publications/2025/06/' +
      'oecd-economic-surveys-germany-2025_b395dc9b/full-report/' +
      'addressing-skilled-labour-shortages_9edb78e6.html',
  },
  germanyDak: {
    id: 'germany-sick-note-dak',
    title: 'Current health-report index',
    publisher: 'DAK-Gesundheit',
    url: 'https://www.dak.de/presse/bundesthemen/gesundheitsreport_48012',
  },
  inflationReuters: {
    id: 'global-inflation-reuters',
    title: 'Persistently high inflation poll',
    publisher: 'Reuters via Investing.com',
    url:
      'https://www.investing.com/news/economy-news/' +
      'persistently-high-inflation-to-nag-global-economy-say-economists-reuters-poll-4816723',
  },
  indiaReuters: {
    id: 'india-industrial-output-reuters',
    title: 'India industrial output grows 7.3%',
    publisher: 'Reuters via Investing.com',
    url:
      'https://www.investing.com/news/economy-news/' +
      'indias-june-industrial-output-grows-73-yy-on-manufacturing-boost-4816399',
  },
  chinaReuters: {
    id: 'china-regional-divergence-reuters',
    title: 'High-tech manufacturing hubs pull ahead in China',
    publisher: 'Reuters via Investing.com',
    url:
      'https://www.investing.com/news/economy-news/' +
      'hightech-manufacturing-hubs-pull-ahead-in-chinas-uneven-growth-4815650',
  },
  australiaReuters: {
    id: 'australia-housing-reuters',
    title: 'Australia housing slowdown reaches the economy',
    publisher: 'Reuters via Investing.com',
    url:
      'https://www.investing.com/news/economy-news/' +
      'australias-sudden-housing-chill-seeps-into-economy-4815462',
  },
} as const;

type SourceId = keyof typeof sources;

function repositoryState(): { gitSha?: string; dirty?: boolean } {
  try {
    return {
      gitSha: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      dirty:
        execFileSync('git', ['status', '--porcelain'], {
          encoding: 'utf8',
        }).trim().length > 0,
    };
  } catch {
    return {};
  }
}

async function storeSourceMetadata(
  workbench: ForecastWorkbench,
): Promise<Record<SourceId, string>> {
  const entries = await Promise.all(
    (Object.entries(sources) as Array<
      [SourceId, (typeof sources)[SourceId]]
    >).map(async ([key, source]) => {
      const artifact = await workbench.ledger.artifacts.putCanonical(
        {
          schemaVersion: 'forecast-workbench.historical-source-pointer/v1',
          ...source,
          publicationDate: '2026-07-28',
          rawPayloadStatus: 'not-captured-in-historical-work',
          publicationTimeStatus: 'not-preserved',
          retrievalTimeStatus: 'not-preserved',
          caveat:
            'This immutable record preserves the source pointer used by the ' +
            'historical analysis. It does not pretend that the mutable web ' +
            'payload was captured at the time.',
        },
        { classification: 'public' },
      );
      return [key, artifact.id] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<SourceId, string>;
}

async function storeModelRun<TCase extends object, TResult extends object>(
  options: {
    workbench: ForecastWorkbench;
    model: ModelDefinition<
      HeadlineModelInput<TCase>,
      HeadlineModelOutput<TResult>
    >;
    input: TCase;
    runId: string;
    createdAt: string;
    storyId: string;
    iteration: 1 | 2;
    evidencePacketId: string;
  },
): Promise<{
  runManifestArtifactId: string;
  result: TResult;
}> {
  const run = runModel(options.model, { case: options.input }, {
    runLabel: `${options.storyId}-v${options.iteration}`,
  });
  const manifest = createRunManifest({
    run,
    runId: options.runId,
    createdAt: options.createdAt,
    ...repositoryState(),
    diagnostics: {
      workflow: 'daily-news-modeling',
      storyId: options.storyId,
      iteration: options.iteration,
      evidencePacketId: options.evidencePacketId,
      historicalRawSourceSnapshotsAvailable: false,
    },
  });
  const artifact = await options.workbench.ledger.artifacts.put(
    `${manifestToJson(manifest, 2)}\n`,
    {
      mediaType: 'application/json',
      classification: 'internal',
    },
  );
  return {
    runManifestArtifactId: artifact.id,
    result: run.output.result,
  };
}

export interface DailyNews20260728ReplayResult {
  screenId: string;
  evidencePacketIds: readonly string[];
  comparisonIds: readonly string[];
  runManifestArtifactIds: readonly string[];
  chainHead?: string;
  auditBundle?: string;
}

export async function runDailyNews20260728Replay(options: {
  root: string;
  auditDestination?: string;
}): Promise<DailyNews20260728ReplayResult> {
  const clock = new FixedClock(new Date('2026-07-28T16:00:00.000Z'));
  const workbench = new ForecastWorkbench(options.root, clock);
  await workbench.initialize();
  try {
    const sourceArtifactIds = await storeSourceMetadata(workbench);
    const stories: NewsScreenStory[] = [
      {
        id: 'spain-unemployment',
        headline: 'Spain unemployment falls to 9.87%',
        decision: 'selected',
        reason:
          'Official stocks, adjusted growth, and annual changes permit three internally consistent views.',
        estimand: 'Underlying quarterly Spanish labour-market improvement',
        mechanism:
          'Employment and labour-force accounting with seasonal and annual checks',
        sourceArtifactIds: [
          sourceArtifactIds.spainReuters,
          sourceArtifactIds.spainIne,
        ],
      },
      {
        id: 'nvidia-vendor-financing',
        headline: 'Nvidia CDS rises amid vendor-financing concern',
        decision: 'selected',
        reason:
          'Reported notional, CDS, equity move, and an existing capital-cycle model permit a contingent-loss diagnostic.',
        estimand:
          'Contingent credit loss and the customer funding mechanism',
        mechanism:
          'Customer hazard × utilization × loss given default plus an AI capital-cycle check',
        sourceArtifactIds: [
          sourceArtifactIds.nvidiaReuters,
          sourceArtifactIds.marketWrap,
        ],
      },
      {
        id: 'germany-sick-notes',
        headline: 'Germany tightens sick-note rules',
        decision: 'selected',
        reason:
          'The output identity is tractable, but the policy response is not estimated, so the sign remains conditional.',
        estimand: 'Change in effective labour input',
        mechanism:
          'Recording → attendance → productivity − infection and administration spillovers',
        sourceArtifactIds: [
          sourceArtifactIds.germanyReuters,
          sourceArtifactIds.germanyOecd,
          sourceArtifactIds.germanyDak,
        ],
      },
      {
        id: 'global-inflation-poll',
        headline: 'Persistent global inflation in a 500-economist poll',
        decision: 'rejected',
        reason:
          'A consensus revision is not an outcome model, and the energy-persistence channel had already been modeled.',
        sourceArtifactIds: [sourceArtifactIds.inflationReuters],
      },
      {
        id: 'india-industrial-output',
        headline: 'India industrial output grows 7.3%',
        decision: 'rejected',
        reason:
          'The output-price methodology changed in May; one post-change observation cannot support a useful backcast.',
        sourceArtifactIds: [sourceArtifactIds.indiaReuters],
      },
      {
        id: 'china-high-tech-provinces',
        headline: "China's high-tech provinces pull ahead",
        decision: 'rejected',
        reason:
          'Provincial sector-exposure weights and a defensible counterfactual are missing.',
        sourceArtifactIds: [sourceArtifactIds.chinaReuters],
      },
      {
        id: 'australia-housing',
        headline: "Australia's housing slowdown reaches the economy",
        decision: 'deferred',
        reason:
          'The reported decline covers Sydney and Melbourne while the cited housing stock is national; geography and timing must be matched.',
        sourceArtifactIds: [sourceArtifactIds.australiaReuters],
      },
    ];
    const screen = await workbench.recordNewsScreen(analyst, {
      schemaVersion: 'forecast-workbench.news-screen/v1',
      id: 'daily-news-screen:2026-07-28',
      coverageDate: '2026-07-28',
      screenedAt: clock.now().toISOString(),
      analystId: analyst.id,
      method:
        'Screen for a measurable estimand, a representable mechanism, and at least one independent check.',
      stories,
      limitations: [
        'This is a retrospective migration of the analysis performed that day.',
        'Original retrieval timestamps, publication times, and raw article payloads were not captured.',
        'Selection reflects the economic, labour, technology, housing, and market coverage reviewed, not all world news.',
      ],
    }, 'public');

    const evidencePacketIds: string[] = [];
    const comparisonIds: string[] = [];
    const runManifestArtifactIds: string[] = [];

    clock.set(new Date('2026-07-28T16:10:00.000Z'));
    const spainEvidence = await workbench.createEvidencePacket({
      actor: analyst,
      id: 'daily-news:2026-07-28:spain-inputs',
      title: 'Spain labour-market source values and modeling case',
      view: {
        case: spainLabourMarketCase,
        sourceArtifactIds:
          stories.find(({ id }) => id === 'spain-unemployment')
            ?.sourceArtifactIds ?? [],
      },
      derivedFromArtifactIds:
        stories.find(({ id }) => id === 'spain-unemployment')
          ?.sourceArtifactIds ?? [],
      classification: 'public',
      accessPolicy: 'Follow original source terms for the linked articles.',
    });
    evidencePacketIds.push(spainEvidence.id);
    const spainV1 = await storeModelRun({
      workbench,
      model: spainLabourMarketV1Model,
      input: spainLabourMarketCase,
      runId: 'daily-news:2026-07-28:spain:v1',
      createdAt: clock.now().toISOString(),
      storyId: 'spain-unemployment',
      iteration: 1,
      evidencePacketId: spainEvidence.id,
    });
    clock.advance(5 * 60_000);
    const spainV2 = await storeModelRun({
      workbench,
      model: spainLabourMarketV2Model,
      input: spainLabourMarketCase,
      runId: 'daily-news:2026-07-28:spain:v2',
      createdAt: clock.now().toISOString(),
      storyId: 'spain-unemployment',
      iteration: 2,
      evidencePacketId: spainEvidence.id,
    });
    runManifestArtifactIds.push(
      spainV1.runManifestArtifactId,
      spainV2.runManifestArtifactId,
    );
    const spainComparison: NewsModelComparison = {
      schemaVersion: 'forecast-workbench.news-model-comparison/v1',
      id: 'daily-news:2026-07-28:spain',
      screenRecordId: screen.id,
      storyId: 'spain-unemployment',
      createdAt: clock.now().toISOString(),
      analysisKind: 'accounting-reconciliation',
      modelQuestion:
        'Is the sub-10% unemployment result an underlying improvement or a seasonal/labour-force artifact?',
      targetEstimand:
        'Underlying quarterly Spanish labour-market improvement',
      evidencePacketIds: [spainEvidence.id],
      iterations: [
        {
          sequence: 1,
          label: 'V1 raw quarterly stocks',
          method:
            'Decompose the raw rate change into employment and labour-force contributions.',
          resultSummary:
            `Raw employment rose ${spainV1.result.rawEmploymentChangeThousand.toFixed(1)}k ` +
            `and the unemployment rate changed ${spainV1.result.rawRateChangePctPoints.toFixed(2)}pp.`,
          runManifestArtifactId: spainV1.runManifestArtifactId,
        },
        {
          sequence: 2,
          label: 'V2 adjusted-growth proxy and annual check',
          method:
            'Insert seasonally adjusted growth rates and a year-over-year comparison.',
          resultSummary:
            `The adjusted proxy adds ${spainV2.result.impliedSeasonallyAdjustedEmploymentChangeThousand.toFixed(1)}k jobs ` +
            `and changes the rate ${spainV2.result.impliedSeasonallyAdjustedRateChangePctPoints.toFixed(2)}pp.`,
          runManifestArtifactId: spainV2.runManifestArtifactId,
        },
      ],
      identificationStatus: 'identified-direction',
      conventionalWisdom:
        'Spain crossed below 10% unemployment because its labour market improved strongly.',
      agreement: 'qualifies',
      comparison:
        'The direction survives and labour-force exit is rejected, but seasonal adjustment removes about 91% of the raw quarterly rate decline.',
      notForecastReason:
        'This reconciles already released observations; it does not predict a future outcome.',
      limitations: [
        'Adjusted levels are proxies reconstructed from official growth rates.',
        'The calculation is descriptive and does not identify causal policy effects.',
      ],
    };
    const spainRecord = await workbench.recordNewsModelComparison(
      analyst,
      spainComparison,
      'public',
    );
    comparisonIds.push(spainRecord.id);

    clock.set(new Date('2026-07-28T16:30:00.000Z'));
    const nvidiaEvidence = await workbench.createEvidencePacket({
      actor: analyst,
      id: 'daily-news:2026-07-28:nvidia-inputs',
      title: 'Nvidia vendor-financing report values and stress assumptions',
      view: {
        case: nvidiaVendorFinancingCase,
        sourceArtifactIds:
          stories.find(({ id }) => id === 'nvidia-vendor-financing')
            ?.sourceArtifactIds ?? [],
        judgmentWarning:
          'Customer hazards, utilization, loss given default, and discount rate are explicit stresses, not reported deal terms.',
      },
      derivedFromArtifactIds:
        stories.find(({ id }) => id === 'nvidia-vendor-financing')
          ?.sourceArtifactIds ?? [],
      classification: 'public',
      accessPolicy: 'Follow original source terms for the linked articles.',
    });
    evidencePacketIds.push(nvidiaEvidence.id);
    const nvidiaV1 = await storeModelRun({
      workbench,
      model: nvidiaVendorFinancingV1Model,
      input: nvidiaVendorFinancingCase,
      runId: 'daily-news:2026-07-28:nvidia:v1',
      createdAt: clock.now().toISOString(),
      storyId: 'nvidia-vendor-financing',
      iteration: 1,
      evidencePacketId: nvidiaEvidence.id,
    });
    clock.advance(5 * 60_000);
    const nvidiaV2 = await storeModelRun({
      workbench,
      model: nvidiaVendorFinancingV2Model,
      input: nvidiaVendorFinancingCase,
      runId: 'daily-news:2026-07-28:nvidia:v2',
      createdAt: clock.now().toISOString(),
      storyId: 'nvidia-vendor-financing',
      iteration: 2,
      evidencePacketId: nvidiaEvidence.id,
    });
    runManifestArtifactIds.push(
      nvidiaV1.runManifestArtifactId,
      nvidiaV2.runManifestArtifactId,
    );
    const nvidiaRecord = await workbench.recordNewsModelComparison(analyst, {
      schemaVersion: 'forecast-workbench.news-model-comparison/v1',
      id: 'daily-news:2026-07-28:nvidia',
      screenRecordId: screen.id,
      storyId: 'nvidia-vendor-financing',
      createdAt: clock.now().toISOString(),
      analysisKind: 'mechanism-check',
      modelQuestion:
        'Can a possible $250B guarantee explain the reported equity loss, and does the capital-cycle model support the broader funding concern?',
      targetEstimand:
        'Present-value contingent credit loss and customer funding strain',
      evidencePacketIds: [nvidiaEvidence.id],
      iterations: [
        {
          sequence: 1,
          label: 'V1 gross face-value comparison',
          method:
            'Treat the reported contingent face value as immediate impairment.',
          resultSummary:
            `$${nvidiaV1.result.grossFaceValueLossBillion.toFixed(0)}B equals ` +
            `${(100 * nvidiaV1.result.grossFaceValueToObservedEquityLoss).toFixed(0)}% of the reported equity move.`,
          runManifestArtifactId: nvidiaV1.runManifestArtifactId,
        },
        {
          sequence: 2,
          label: 'V2 expected-loss and capital-cycle stresses',
          method:
            'Insert customer hazard, utilization, recovery, discounting, and a separate customer funding-path check.',
          resultSummary:
            `PV expected loss is $${nvidiaV2.result.centralExpectedLoss.presentValueExpectedLossBillion.toFixed(1)}B centrally ` +
            `and $${nvidiaV2.result.stressExpectedLoss.presentValueExpectedLossBillion.toFixed(1)}B in the severe stress.`,
          runManifestArtifactId: nvidiaV2.runManifestArtifactId,
        },
      ],
      identificationStatus: 'conditional-only',
      conventionalWisdom:
        'Vendor financing reveals dangerous circular AI demand and could account for the stock-market repricing.',
      agreement: 'qualifies',
      comparison:
        'The capital-cycle mechanism supports funding concern, but direct guarantee expected loss explains only a minority of the equity move in the displayed stresses.',
      notForecastReason:
        'The transaction terms and customer default distribution are unobserved, so the output is a conditional stress test rather than an investment forecast.',
      limitations: [
        "Nvidia's own CDS is not the customer's default probability.",
        'Deal utilization, seniority, collateral, recourse, and obligors were not public.',
        'The model does not value lost chip sales, margins, or Nvidia equity.',
      ],
    }, 'public');
    comparisonIds.push(nvidiaRecord.id);

    clock.set(new Date('2026-07-28T16:50:00.000Z'));
    const germanyEvidence = await workbench.createEvidencePacket({
      actor: analyst,
      id: 'daily-news:2026-07-28:germany-inputs',
      title: 'Germany sick-note observations and explicit policy sensitivities',
      view: {
        case: germanySickNoteCase,
        sourceArtifactIds:
          stories.find(({ id }) => id === 'germany-sick-notes')
            ?.sourceArtifactIds ?? [],
        judgmentWarning:
          'Behavioral response, sick-worker productivity, infection spillovers, and administration are scenario assumptions.',
      },
      derivedFromArtifactIds:
        stories.find(({ id }) => id === 'germany-sick-notes')
          ?.sourceArtifactIds ?? [],
      classification: 'public',
      accessPolicy: 'Follow original source terms for the linked articles.',
    });
    evidencePacketIds.push(germanyEvidence.id);
    const germanyV1 = await storeModelRun({
      workbench,
      model: germanySickNoteV1Model,
      input: germanySickNoteCase,
      runId: 'daily-news:2026-07-28:germany:v1',
      createdAt: clock.now().toISOString(),
      storyId: 'germany-sick-notes',
      iteration: 1,
      evidencePacketId: germanyEvidence.id,
    });
    clock.advance(5 * 60_000);
    const germanyV2 = await storeModelRun({
      workbench,
      model: germanySickNoteV2Model,
      input: germanySickNoteCase,
      runId: 'daily-news:2026-07-28:germany:v2',
      createdAt: clock.now().toISOString(),
      storyId: 'germany-sick-notes',
      iteration: 2,
      evidencePacketId: germanyEvidence.id,
    });
    runManifestArtifactIds.push(
      germanyV1.runManifestArtifactId,
      germanyV2.runManifestArtifactId,
    );
    const germanyRange = germanyV2.result.scenarios.map(
      ({ effectiveLabourChange }) => effectiveLabourChange,
    );
    const germanyRecord = await workbench.recordNewsModelComparison(analyst, {
      schemaVersion: 'forecast-workbench.news-model-comparison/v1',
      id: 'daily-news:2026-07-28:germany',
      screenRecordId: screen.id,
      storyId: 'germany-sick-notes',
      createdAt: clock.now().toISOString(),
      analysisKind: 'conditional-stress-test',
      modelQuestion:
        'Would restricting sick-note certification materially raise effective labour input?',
      targetEstimand: 'Change in effective German labour input',
      evidencePacketIds: [germanyEvidence.id],
      iterations: [
        {
          sequence: 1,
          label: 'V1 literal recorded-day reduction',
          method:
            'Treat each suppressed recorded workday as a fully productive attendance day.',
          resultSummary:
            `The arithmetic ceiling is a ${(100 * germanyV1.result.effectiveLabourChange).toFixed(2)}% effective-labour gain.`,
          runManifestArtifactId: germanyV1.runManifestArtifactId,
        },
        {
          sequence: 2,
          label: 'V2 behavioral and spillover envelope',
          method:
            'Separate recording from attendance, sick productivity, infection spillovers, and administration.',
          resultSummary:
            `The displayed range is ${(100 * Math.min(...germanyRange)).toFixed(2)}% to ` +
            `${(100 * Math.max(...germanyRange)).toFixed(2)}%, with a ` +
            `${(100 * germanyV2.result.breakEvenBehaviouralShare).toFixed(1)}% behavioral break-even share.`,
          runManifestArtifactId: germanyV2.runManifestArtifactId,
        },
      ],
      identificationStatus: 'not-identified',
      conventionalWisdom:
        "The government's productivity claim is doubtful because certification rules may change reporting more than attendance.",
      agreement: 'agrees',
      comparison:
        'The model supports skepticism about a confident gain: plausible displayed assumptions cross zero, so the sign remains unidentified.',
      notForecastReason:
        'No credible policy-response estimate identifies how recorded absence maps into actual attendance or output.',
      limitations: [
        'All behavioral and spillover rows are analyst sensitivities.',
        'The simple effective-days identity omits general-equilibrium and health-system effects.',
      ],
    }, 'public');
    comparisonIds.push(germanyRecord.id);

    let auditBundle: string | undefined;
    if (options.auditDestination) {
      await exportAuditBundle({
        ledger: workbench.ledger,
        clock,
        destination: options.auditDestination,
      });
      auditBundle = options.auditDestination;
    }
    return {
      screenId: screen.id,
      evidencePacketIds,
      comparisonIds,
      runManifestArtifactIds,
      ...(workbench.ledger.chainHead()?.eventHash
        ? { chainHead: workbench.ledger.chainHead()?.eventHash }
        : {}),
      ...(auditBundle ? { auditBundle } : {}),
    };
  } finally {
    workbench.close();
  }
}

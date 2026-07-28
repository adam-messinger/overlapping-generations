import {
  ForecastWorkbench,
  SystemClock,
  canonicalSha256Id,
  captureHttpSource,
  type NormalizedObservation,
} from 'forecast-workbench';
import {
  hormuz2026Question,
  hormuzBinaryPrediction,
} from '../questions/hormuz-2026/question.js';
import {
  checkpointSlug,
  forecastCredentialProvider,
  jsonEndpointConnector,
  latestObservationVersions,
  recordsForQuestion,
  refreshService,
} from './common.js';

interface StraitsLiveStatus {
  asOf?: string;
  verdict?: {
    status?: string;
    short?: string;
    long?: string;
    basis?: string;
  };
  transits?: {
    count?: number;
    baseline?: number;
    throughputPct?: number;
    asOfDate?: string;
    stale?: boolean;
    provisional?: boolean;
  };
  dailyTransits?: {
    date?: string;
    nTotal?: number;
    nTanker?: number;
    nCargo?: number;
    nContainer?: number;
    previousNTotal?: number;
    previousDate?: string;
    updatedAt?: string;
  };
  carrierSuspensions?: Array<{
    id?: string;
    carrier?: string;
    rank?: number;
    status?: string;
    updatedAt?: string;
  }>;
}

interface PolymarketMarket {
  id?: string;
  question?: string;
  outcomes?: string;
  outcomePrices?: string;
  volume?: string;
  liquidity?: string;
  updatedAt?: string;
  active?: boolean;
  closed?: boolean;
}

interface PolymarketEvent {
  id?: string;
  slug?: string;
  title?: string;
  updatedAt?: string;
  volume?: number;
  liquidity?: number;
  markets?: PolymarketMarket[];
}

export interface HormuzPhysicalCheckpoint {
  observedAt: string;
  transitDate: string;
  transitCount: number;
  baseline: number;
  throughputShare: number;
  regularCarrierCount: number;
  carrierStatuses: Readonly<Record<string, number>>;
  verdictStatus: string;
}

export interface HormuzMarketCheckpoint {
  eventId: string;
  marketId: string;
  updatedAt: string;
  probabilityYes: number;
  volumeUsd: number;
  liquidityUsd: number;
  active: boolean;
  closed: boolean;
}

function requireNumber(value: unknown, context: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${context} must be numeric`);
  return number;
}

export function summarizeHormuzPhysical(
  status: StraitsLiveStatus,
): HormuzPhysicalCheckpoint {
  const observedAt = status.asOf;
  const transitDate = status.transits?.asOfDate ?? status.dailyTransits?.date;
  if (!observedAt || !transitDate) {
    throw new Error('Straits.live response lacks observation timestamps');
  }
  if (status.transits?.stale) {
    throw new Error('Straits.live transit observation is marked stale');
  }
  const transitCount = requireNumber(
    status.transits?.count,
    'Straits.live transit count',
  );
  const baseline = requireNumber(
    status.transits?.baseline,
    'Straits.live transit baseline',
  );
  if (baseline <= 0) throw new Error('Straits.live transit baseline must be positive');
  const carrierStatuses: Record<string, number> = {};
  let regularCarrierCount = 0;
  const regularStatuses = new Set([
    'normal',
    'operating',
    'regular',
    'resumed',
    'transiting',
  ]);
  for (const carrier of status.carrierSuspensions ?? []) {
    const carrierStatus = carrier.status?.toLowerCase() ?? 'unknown';
    carrierStatuses[carrierStatus] = (carrierStatuses[carrierStatus] ?? 0) + 1;
    if (regularStatuses.has(carrierStatus)) regularCarrierCount++;
  }
  return {
    observedAt,
    transitDate,
    transitCount,
    baseline,
    throughputShare: transitCount / baseline,
    regularCarrierCount,
    carrierStatuses,
    verdictStatus: status.verdict?.status ?? 'unknown',
  };
}

function parseJsonStringArray(value: string | undefined, context: string): string[] {
  if (!value) throw new Error(`${context} is missing`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${context} is not valid JSON`);
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error(`${context} must be a string array`);
  }
  return parsed;
}

export function summarizeHormuzMarket(
  events: readonly PolymarketEvent[],
): HormuzMarketCheckpoint {
  if (events.length !== 1) {
    throw new Error(`Expected one Polymarket event, received ${events.length}`);
  }
  const event = events[0];
  const market = event.markets?.find(
    (candidate) =>
      candidate.question ===
      'Strait of Hormuz traffic returns to normal by December 31?',
  );
  if (!market) throw new Error('Polymarket event lacks the expected Hormuz market');
  const outcomes = parseJsonStringArray(market.outcomes, 'Polymarket outcomes');
  const prices = parseJsonStringArray(
    market.outcomePrices,
    'Polymarket outcome prices',
  ).map((value) => requireNumber(value, 'Polymarket outcome price'));
  const yesIndex = outcomes.findIndex(
    (outcome) => outcome.toLowerCase() === 'yes',
  );
  if (yesIndex < 0 || prices[yesIndex] === undefined) {
    throw new Error('Polymarket outcome prices lack Yes');
  }
  const probabilityYes = prices[yesIndex];
  if (probabilityYes <= 0 || probabilityYes >= 1) {
    throw new Error('Polymarket Yes probability must be strictly between zero and one');
  }
  const updatedAt = market.updatedAt ?? event.updatedAt;
  if (!event.id || !market.id || !updatedAt) {
    throw new Error('Polymarket event lacks IDs or update time');
  }
  return {
    eventId: event.id,
    marketId: market.id,
    updatedAt,
    probabilityYes,
    volumeUsd: requireNumber(
      market.volume ?? event.volume,
      'Polymarket volume',
    ),
    liquidityUsd: requireNumber(
      market.liquidity ?? event.liquidity,
      'Polymarket liquidity',
    ),
    active: market.active ?? false,
    closed: market.closed ?? false,
  };
}

function logit(probability: number): number {
  return Math.log(probability / (1 - probability));
}

function logistic(logOdds: number): number {
  return 1 / (1 + Math.exp(-logOdds));
}

export function partialMarketUpdate(options: {
  priorQuestionProbability: number;
  priorComparatorProbability: number;
  currentComparatorProbability: number;
  logOddsWeight: number;
}): number {
  for (const [label, probability] of Object.entries({
    priorQuestionProbability: options.priorQuestionProbability,
    priorComparatorProbability: options.priorComparatorProbability,
    currentComparatorProbability: options.currentComparatorProbability,
  })) {
    if (probability <= 0 || probability >= 1) {
      throw new Error(`${label} must be strictly between zero and one`);
    }
  }
  if (options.logOddsWeight < 0 || options.logOddsWeight > 1) {
    throw new Error('logOddsWeight must be in [0, 1]');
  }
  return logistic(
    logit(options.priorQuestionProbability) +
      options.logOddsWeight *
        (logit(options.currentComparatorProbability) -
          logit(options.priorComparatorProbability)),
  );
}

function normalizedPhysicalRows(
  checkpoint: HormuzPhysicalCheckpoint,
): NormalizedObservation[] {
  return [
    {
      key: {
        schemaVersion: 'forecast-workbench.observation-key/v1',
        datasetId: 'straits.live.status',
        seriesId: 'portwatch-hormuz-daily-transit-calls',
        geography: 'Strait of Hormuz',
        frequency: 'daily',
        validPeriod: checkpoint.transitDate,
        measure: 'IMF PortWatch total transit calls mirrored by Straits.live',
      },
      value: {
        count: checkpoint.transitCount,
        baseline: checkpoint.baseline,
        throughputShare: checkpoint.throughputShare,
      },
      sourceRowLocator: 'transits',
    },
    {
      key: {
        schemaVersion: 'forecast-workbench.observation-key/v1',
        datasetId: 'straits.live.status',
        seriesId: 'major-carriers-regular-service',
        geography: 'Strait of Hormuz',
        frequency: 'instant',
        validPeriod: checkpoint.observedAt,
        measure: 'count of nine major carriers with regular service',
      },
      value: {
        count: checkpoint.regularCarrierCount,
        statuses: checkpoint.carrierStatuses,
      },
      sourceRowLocator: 'carrierSuspensions',
    },
  ];
}

function normalizedMarketRows(
  checkpoint: HormuzMarketCheckpoint,
): NormalizedObservation[] {
  return [{
    key: {
      schemaVersion: 'forecast-workbench.observation-key/v1',
      datasetId: 'polymarket.gamma',
      seriesId: `market:${checkpoint.marketId}:yes`,
      geography: 'global prediction market',
      frequency: 'instant',
      validPeriod: checkpoint.updatedAt,
      measure: 'market-implied Yes probability',
    },
    value: checkpoint,
    sourceRowLocator: `event=${checkpoint.eventId}&market=${checkpoint.marketId}`,
  }];
}

export interface HormuzRefreshResult {
  pilot: 'hormuz';
  root: string;
  checkpointAt: string;
  physical: HormuzPhysicalCheckpoint;
  market: HormuzMarketCheckpoint;
  priorHumanProbability: number;
  rawUpdatedProbability: number;
  sealedHumanProbability: number;
  evidencePacketId: string;
  forecastId: string;
  chainHead?: string;
}

export async function refreshHormuzForecast(options: {
  root: string;
}): Promise<HormuzRefreshResult> {
  const clock = new SystemClock();
  const workbench = new ForecastWorkbench(options.root, clock);
  await workbench.initialize();
  try {
    const checkpointAt = clock.now().toISOString();
    const checkpoint = checkpointSlug(checkpointAt);
    const previous = await latestObservationVersions(workbench);
    const statusConnector = jsonEndpointConnector<StraitsLiveStatus>({
      id: 'straits-live-status',
      sourceId: 'straits.live.status',
      uri: 'https://straits.live/status',
      documentationUrl: 'https://straits.live/methodology',
      allowedHosts: ['straits.live'],
      monitoringStartedAt: checkpointAt,
      responseSchema: {
        required: ['asOf', 'transits', 'carrierSuspensions'],
        transitFields: ['count', 'baseline', 'asOfDate', 'stale'],
      },
    });
    const statusCapture = await captureHttpSource({
      workbench,
      actor: refreshService,
      connector: statusConnector,
      query: {},
      credentialProvider: forecastCredentialProvider(),
      previousByObservationKey: previous,
      classification: 'public',
      normalize(parsed) {
        const physical = summarizeHormuzPhysical(parsed);
        return {
          datasetId: 'straits.live.status',
          rows: normalizedPhysicalRows(physical),
          sourceVersion: physical.observedAt,
          publicationTimeBasis: 'source',
          publishedAt: physical.observedAt,
        };
      },
    });
    const marketConnector = jsonEndpointConnector<PolymarketEvent[]>({
      id: 'polymarket-gamma-events',
      sourceId: 'polymarket.gamma',
      uri: 'https://gamma-api.polymarket.com/events',
      documentationUrl: 'https://docs.polymarket.com/developers/gamma-markets-api/overview',
      allowedHosts: ['gamma-api.polymarket.com'],
      monitoringStartedAt: checkpointAt,
      responseSchema: {
        format: 'Gamma events JSON',
        requiredMarketFields: [
          'id',
          'question',
          'outcomes',
          'outcomePrices',
          'volume',
          'liquidity',
          'updatedAt',
        ],
      },
    });
    const marketCapture = await captureHttpSource({
      workbench,
      actor: refreshService,
      connector: marketConnector,
      query: {
        query: {
          slug: 'strait-of-hormuz-traffic-returns-to-normal-by-december-31',
        },
      },
      credentialProvider: forecastCredentialProvider(),
      previousByObservationKey: previous,
      classification: 'public',
      normalize(parsed) {
        const market = summarizeHormuzMarket(parsed);
        return {
          datasetId: 'polymarket.gamma',
          rows: normalizedMarketRows(market),
          sourceVersion: market.updatedAt,
          publicationTimeBasis: 'source',
          publishedAt: market.updatedAt,
        };
      },
    });
    const physical = summarizeHormuzPhysical(statusCapture.parsed);
    const market = summarizeHormuzMarket(marketCapture.parsed);
    if (physical.throughputShare >= 0.35 || physical.regularCarrierCount >= 6) {
      throw new Error(
        'A precommitted Hormuz physical trigger has materially changed; manual scenario and forecast review is required',
      );
    }
    if (!market.active || market.closed) {
      throw new Error('The Polymarket comparator is not an active open market');
    }
    const priorHumanProbability = 0.39;
    const rawUpdatedProbability = partialMarketUpdate({
      priorQuestionProbability: priorHumanProbability,
      priorComparatorProbability: 0.495,
      currentComparatorProbability: market.probabilityYes,
      logOddsWeight: 1 / 3,
    });
    const sealedHumanProbability = Math.round(rawUpdatedProbability * 100) / 100;
    const packet = await workbench.createEvidencePacket({
      actor: refreshService,
      id: `hormuz-2026-live-refresh:${checkpoint}`,
      title: `Hormuz physical and market refresh at ${checkpointAt}`,
      view: {
        checkpointAt,
        physical,
        market,
        targetNonEquivalence:
          'The market resolves Yes if any seven-day moving average reaches 60 by December 31. The workbench question requires the fixed December 1–21 mean to reach 62, so the market target is easier.',
        updateMethod: {
          priorQuestionProbability: priorHumanProbability,
          priorComparatorProbability: 0.495,
          currentComparatorProbability: market.probabilityYes,
          comparatorLogOddsWeight: 1 / 3,
          rawUpdatedProbability,
          sealedHumanProbability,
        },
        triggerAssessment: {
          transitRecoveryTrigger: 'not met',
          majorCarrierReturnTrigger: 'not met',
        },
      },
      observationVersionIds: [
        ...statusCapture.observationVersionRecordIds,
        ...marketCapture.observationVersionRecordIds,
      ],
      derivedFromArtifactIds: [
        statusCapture.receipt.rawArtifactId,
        marketCapture.receipt.rawArtifactId,
      ],
      classification: 'public',
    });
    const questionHash = canonicalSha256Id(hormuz2026Question);
    const exposure = await workbench.revealEvidence({
      actor: { id: 'hormuz-pilot-forecaster', role: 'forecaster' },
      questionHash,
      forecasterId: 'hormuz-pilot-forecaster',
      seriesId: 'published-human',
      packetId: packet.id,
    });
    const referenceClassIds = await recordsForQuestion(
      workbench,
      'reference-class',
      questionHash,
    );
    const conditionalSetIds = await recordsForQuestion(
      workbench,
      'conditional-set',
      questionHash,
    );
    const forecast = await workbench.sealForecast({
      actor: { id: 'hormuz-pilot-forecaster', role: 'forecaster' },
      questionHash,
      forecasterId: 'hormuz-pilot-forecaster',
      seriesId: 'published-human',
      prediction: hormuzBinaryPrediction(sealedHumanProbability),
      updateBasis: {
        kind: 'evidence',
        exposureIds: [exposure.id],
        note:
          'Partially incorporated the log-odds movement of the easier liquid comparator. Physical recovery and carrier-return triggers remain unhit.',
      },
      modelUse: 'none',
      referenceClassIds,
      conditionalSetIds,
      rationale:
        'The easier liquid market moved upward, which is modest positive evidence for the fixed-window question. Current physical traffic remains near one ninth of baseline and major carriers have not resumed regular service, so only one third of the comparator log-odds move is transferred.',
      strongestContraryCase:
        'Renewed talks could produce a nonlinear security and insurance reset; conversely, the market may be reacting to the same headlines while underweighting the stricter fixed-window target.',
    });
    const verification = await workbench.ledger.verify();
    return {
      pilot: 'hormuz',
      root: options.root,
      checkpointAt,
      physical,
      market,
      priorHumanProbability,
      rawUpdatedProbability,
      sealedHumanProbability,
      evidencePacketId: packet.id,
      forecastId: forecast.id,
      chainHead: verification.chainHead,
    };
  } finally {
    workbench.close();
  }
}

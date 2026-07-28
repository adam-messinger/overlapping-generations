import {
  ForecastWorkbench,
  SystemClock,
  canonicalSha256Id,
  captureHttpSource,
  cdcSocrataConnector,
  type CdcSocrataQuery,
  type HttpSourceConnector,
  type NormalizedObservation,
} from 'forecast-workbench';
import {
  captureDataSnapshot,
  inlineDataResolver,
  type EvidenceRecord,
} from 'tsimulation';
import {
  cdcFixedInitialAdmissionsMeasurement,
  cdcOperationalAdmissionsMeasurement,
} from '../../simulations/outbreak/measurement-contracts.js';
import { respiratorySeries } from '../../simulations/outbreak/rolling-data.js';
import { runOutbreakModelAdapter } from '../questions/outbreak-2026/model-adapter.js';
import {
  outbreak2026FinalHumanForecast,
  outbreak2026Question,
} from '../questions/outbreak-2026/question.js';
import {
  checkpointSlug,
  forecastCredentialProvider,
  latestObservationVersions,
  refreshService,
  repositoryState,
} from './common.js';

interface CdcAdmissionsRow {
  weekendingdate?: string;
  jurisdiction?: string;
  totalconfc19newadm?: string;
  totalconfc19newadmhosprep?: string;
  totalconfc19newadmperchosprep?: string;
}

export interface LiveCovidObservation {
  weekEnding: string;
  admissions: number;
  hospitalsReporting: number | null;
  reportingPercent: number | null;
}

function requireFiniteNumber(value: unknown, context: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${context} must be numeric`);
  return number;
}

export function parseCdcAdmissionsRows(
  rows: readonly CdcAdmissionsRow[],
  datasetId: string,
): LiveCovidObservation[] {
  const parsed = rows.map((row, index) => {
    if (row.jurisdiction !== 'USA') {
      throw new Error(`${datasetId} row ${index} is not the USA aggregate`);
    }
    const weekEnding = row.weekendingdate?.slice(0, 10);
    if (!weekEnding || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnding)) {
      throw new Error(`${datasetId} row ${index} has an invalid week`);
    }
    return {
      weekEnding,
      admissions: requireFiniteNumber(
        row.totalconfc19newadm,
        `${datasetId} ${weekEnding} admissions`,
      ),
      hospitalsReporting:
        row.totalconfc19newadmhosprep === undefined
          ? null
          : requireFiniteNumber(
              row.totalconfc19newadmhosprep,
              `${datasetId} ${weekEnding} hospitals reporting`,
            ),
      reportingPercent:
        row.totalconfc19newadmperchosprep === undefined
          ? null
          : requireFiniteNumber(
              row.totalconfc19newadmperchosprep,
              `${datasetId} ${weekEnding} reporting percent`,
            ),
    };
  });
  parsed.sort((left, right) => left.weekEnding.localeCompare(right.weekEnding));
  if (parsed.length < 8) {
    throw new Error(`${datasetId} returned too few USA observations`);
  }
  return parsed;
}

function normalizedRows(
  datasetId: string,
  observations: readonly LiveCovidObservation[],
  firstRelease: boolean,
): NormalizedObservation[] {
  return observations.map((row) => ({
    key: {
      schemaVersion: 'forecast-workbench.observation-key/v1',
      datasetId,
      seriesId: 'totalconfc19newadm',
      geography: 'USA',
      frequency: 'weekly',
      validPeriod: row.weekEnding,
      measure: 'new laboratory-confirmed COVID-19 hospital admissions',
    },
    value: row,
    sourceRowLocator: `jurisdiction=USA&weekendingdate=${row.weekEnding}`,
    ...(firstRelease ? { firstReleaseBasis: 'source-declared' as const } : {}),
  }));
}

function mergeOperationalHistory(
  current: readonly LiveCovidObservation[],
): { weeks: string[]; admissions: number[] } {
  const historic = respiratorySeries('covid19');
  const byWeek = new Map(
    historic.weeks.map((week, index) => [week, historic.admissions[index]]),
  );
  for (const row of current) byWeek.set(row.weekEnding, row.admissions);
  const ordered = [...byWeek.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  );
  return {
    weeks: ordered.map(([week]) => week),
    admissions: ordered.map(([, admissions]) => admissions),
  };
}

function forecastHorizon(origin: string): 1 | 2 | 3 | 4 {
  const target = Date.parse('2026-08-15T00:00:00.000Z');
  const originTime = Date.parse(`${origin}T00:00:00.000Z`);
  const weeks = (target - originTime) / (7 * 24 * 60 * 60 * 1_000);
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 4) {
    throw new Error(
      `Latest CDC week ${origin} does not support the model's 1–4 week target horizon`,
    );
  }
  return weeks as 1 | 2 | 3 | 4;
}

export interface OutbreakRefreshResult {
  pilot: 'outbreak';
  root: string;
  checkpointAt: string;
  latestOperational: LiveCovidObservation;
  latestFixedInitial: LiveCovidObservation;
  overlapWeeks: number;
  measurementCorrection: number;
  horizonWeeks: number;
  modelPrediction: Readonly<Record<string, number>>;
  resolverPointEstimate: number;
  humanPrediction: Readonly<Record<string, number>>;
  evidencePacketId: string;
  modelForecastId: string;
  forecastId: string;
  chainHead?: string;
}

export async function refreshOutbreakForecast(options: {
  root: string;
}): Promise<OutbreakRefreshResult> {
  const clock = new SystemClock();
  const workbench = new ForecastWorkbench(options.root, clock);
  await workbench.initialize();
  try {
    const checkpointAt = clock.now().toISOString();
    const checkpoint = checkpointSlug(checkpointAt);
    const previous = await latestObservationVersions(workbench);
    const connector = cdcSocrataConnector({
      monitoringStartedAt: checkpointAt,
    }) as HttpSourceConnector<CdcSocrataQuery, CdcAdmissionsRow[]>;
    const commonSoql = {
      '$select':
        'weekendingdate,jurisdiction,totalconfc19newadm,' +
        'totalconfc19newadmhosprep,totalconfc19newadmperchosprep',
      '$where':
        "jurisdiction='USA' AND weekendingdate>='2025-05-31T00:00:00.000'",
      '$order': 'weekendingdate asc',
      '$limit': 500,
    };
    const operationalCapture = await captureHttpSource({
      workbench,
      actor: refreshService,
      connector,
      query: { datasetId: 'mpgq-jmmr', soql: commonSoql },
      credentialProvider: forecastCredentialProvider(),
      previousByObservationKey: previous,
      classification: 'public',
      license: 'U.S. government public data',
      normalize(parsed) {
        const observations = parseCdcAdmissionsRows(
          parsed,
          'cdc.socrata.mpgq-jmmr',
        );
        return {
          datasetId: 'cdc.socrata.mpgq-jmmr',
          rows: normalizedRows(
            'cdc.socrata.mpgq-jmmr',
            observations,
            false,
          ),
          sourceVersion: observations.at(-1)?.weekEnding,
          publicationTimeBasis: 'retrieval',
        };
      },
    });
    const fixedCapture = await captureHttpSource({
      workbench,
      actor: refreshService,
      connector,
      query: { datasetId: 'vdzy-6i9v', soql: commonSoql },
      credentialProvider: forecastCredentialProvider(),
      previousByObservationKey: previous,
      classification: 'public',
      license: 'U.S. government public data',
      normalize(parsed) {
        const observations = parseCdcAdmissionsRows(
          parsed,
          'cdc.socrata.vdzy-6i9v',
        );
        return {
          datasetId: 'cdc.socrata.vdzy-6i9v',
          rows: normalizedRows(
            'cdc.socrata.vdzy-6i9v',
            observations,
            true,
          ),
          sourceVersion: observations.at(-1)?.weekEnding,
          publicationTimeBasis: 'retrieval',
        };
      },
    });
    const operational = parseCdcAdmissionsRows(
      operationalCapture.parsed,
      'cdc.socrata.mpgq-jmmr',
    );
    const fixed = parseCdcAdmissionsRows(
      fixedCapture.parsed,
      'cdc.socrata.vdzy-6i9v',
    );
    const latestOperational = operational.at(-1);
    const latestFixedInitial = fixed.at(-1);
    if (!latestOperational || !latestFixedInitial) {
      throw new Error('CDC refresh returned no usable latest observation');
    }
    const operationalByWeek = new Map(
      operational.map((row) => [row.weekEnding, row.admissions]),
    );
    const overlapRatios = fixed.flatMap((row) => {
      const comparable = operationalByWeek.get(row.weekEnding);
      return comparable === undefined ? [] : [row.admissions / comparable];
    });
    if (overlapRatios.length < 8) {
      throw new Error('CDC endpoints have too few overlapping weeks for the crosswalk');
    }
    const correction =
      overlapRatios.reduce((sum, value) => sum + value, 0) /
      overlapRatios.length;
    const combined = mergeOperationalHistory(operational);
    const originIndex = combined.weeks.length - 1;
    const horizon = forecastHorizon(combined.weeks[originIndex]);
    const operationalRaw = await workbench.ledger.artifacts.get(
      operationalCapture.receipt.rawArtifactId,
    );
    const fixedRaw = await workbench.ledger.artifacts.get(
      fixedCapture.receipt.rawArtifactId,
    );
    const operationalSnapshot = await captureDataSnapshot({
      resolver: inlineDataResolver({
        id: 'cdc-operational-live-refresh',
        version: '1.0.0',
        source: {
          id: 'cdc.socrata.mpgq-jmmr',
          title: 'CDC operational national respiratory admissions',
          homepage: 'https://data.cdc.gov/resource/mpgq-jmmr.json',
          revisionPolicy: 'backfilled',
        },
        value: operational,
        raw: operationalRaw,
        mediaType: 'application/json',
        measurement: cdcOperationalAdmissionsMeasurement,
        sourceVersion: latestOperational.weekEnding,
      }),
      request: { id: `outbreak-live-operational-${checkpoint}` },
      context: { requestedAt: operationalCapture.receipt.completedAt },
    });
    const fixedSnapshot = await captureDataSnapshot({
      resolver: inlineDataResolver({
        id: 'cdc-fixed-initial-live-refresh',
        version: '1.0.0',
        source: {
          id: 'cdc.socrata.vdzy-6i9v',
          title: 'CDC fixed-initial national respiratory admissions',
          homepage: 'https://data.cdc.gov/resource/vdzy-6i9v.json',
          revisionPolicy: 'first-release',
        },
        value: fixed,
        raw: fixedRaw,
        mediaType: 'application/json',
        measurement: cdcFixedInitialAdmissionsMeasurement,
        sourceVersion: latestFixedInitial.weekEnding,
      }),
      request: { id: `outbreak-live-fixed-${checkpoint}` },
      context: { requestedAt: fixedCapture.receipt.completedAt },
    });
    const evidence: EvidenceRecord[] = [{
      id: `outbreak-refresh-operational-${checkpoint}`,
      label: 'Live CDC operational, revisable U.S. COVID-19 weekly admissions',
      kind: 'observed',
      role: 'development',
      unit: 'people/week',
      value: operational,
      measurement: operationalSnapshot.snapshot.measurement,
      snapshotIds: [operationalSnapshot.snapshot.id],
    }];
    const model = await runOutbreakModelAdapter({
      workbench,
      actor: refreshService,
      checkpointId: checkpoint,
      input: {
        values: combined.admissions,
        originIndex,
        model: 'adaptive-ensemble',
        horizon,
        correction,
        operationalSnapshot: operationalSnapshot.snapshot,
        fixedInitialArtifactId: fixedCapture.receipt.rawArtifactId,
        evidence,
        createdAt: clock.now().toISOString(),
        ...repositoryState(),
      },
    });
    const modelPrediction = model.modelForecast.prediction;
    if (modelPrediction?.kind !== 'ordered-categorical') {
      throw new Error('Outbreak adapter did not return categorical probabilities');
    }
    if ((modelPrediction.probabilities.A ?? 0) < 0.90) {
      throw new Error(
        'Fresh outbreak model moved materially outside the low-count regime; manual forecast review is required',
      );
    }
    const packet = await workbench.createEvidencePacket({
      actor: refreshService,
      id: `outbreak-2026-live-refresh:${checkpoint}`,
      title: `CDC and outbreak-model refresh at ${checkpointAt}`,
      view: {
        checkpointAt,
        latestOperational,
        latestFixedInitial,
        overlapWeeks: overlapRatios.length,
        measurementCorrection: correction,
        horizonWeeks: horizon,
        resolverPointEstimate: model.resolverPointEstimate,
        modelPrediction: modelPrediction.probabilities,
        forecastDecision:
          'The fresh model remains in the same low-count regime; preserve the human novelty tail and leave the human bins unchanged.',
      },
      snapshotIds: [
        operationalSnapshot.snapshot.id,
        fixedSnapshot.snapshot.id,
      ],
      observationVersionIds: [
        ...operationalCapture.observationVersionRecordIds,
        ...fixedCapture.observationVersionRecordIds,
      ],
      derivedFromArtifactIds: [
        operationalCapture.receipt.rawArtifactId,
        fixedCapture.receipt.rawArtifactId,
        model.modelForecast.runManifestArtifactId,
      ],
      classification: 'public',
      license: 'U.S. government public data',
    });
    const questionHash = canonicalSha256Id(outbreak2026Question);
    const exposure = await workbench.revealEvidence({
      actor: { id: 'pilot-forecaster', role: 'forecaster' },
      questionHash,
      forecasterId: 'pilot-forecaster',
      seriesId: 'published-human',
      packetId: packet.id,
    });
    const forecast = await workbench.sealForecast({
      actor: { id: 'pilot-forecaster', role: 'forecaster' },
      questionHash,
      forecasterId: 'pilot-forecaster',
      seriesId: 'published-human',
      prediction: outbreak2026FinalHumanForecast,
      updateBasis: {
        kind: 'model-run',
        modelForecastIds: [model.recordId],
        note:
          `Fresh CDC evidence was exposed in ${exposure.id}. The model still strongly favors the bottom bin, so the prior human novelty tail is retained.`,
      },
      modelUse: 'conditioned',
      modelForecastIds: [model.recordId],
      rationale:
        'The latest operational and fixed-initial levels remain low, and the refreshed empirical model still places overwhelming mass below 4,000.',
      strongestContraryCase:
        'Rapid acceleration, an immune-escape lineage, or another measurement-regime shift remains outside the finite historical residual support.',
    });
    const verification = await workbench.ledger.verify();
    return {
      pilot: 'outbreak',
      root: options.root,
      checkpointAt,
      latestOperational,
      latestFixedInitial,
      overlapWeeks: overlapRatios.length,
      measurementCorrection: correction,
      horizonWeeks: horizon,
      modelPrediction: modelPrediction.probabilities,
      resolverPointEstimate: model.resolverPointEstimate,
      humanPrediction:
        outbreak2026FinalHumanForecast.kind === 'ordered-categorical'
          ? outbreak2026FinalHumanForecast.probabilities
          : {},
      evidencePacketId: packet.id,
      modelForecastId: model.recordId,
      forecastId: forecast.id,
      chainHead: verification.chainHead,
    };
  } finally {
    workbench.close();
  }
}

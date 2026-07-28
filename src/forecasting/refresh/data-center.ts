import {
  ForecastWorkbench,
  SystemClock,
  canonicalSha256Id,
  captureHttpSource,
  eiaConnector,
  type EiaQuery,
  type HttpSourceConnector,
  type NormalizedObservation,
} from 'forecast-workbench';
import { runDataCenter2035ModelAdapter } from '../questions/data-center-2035/model-adapter.js';
import {
  dataCenter2035FinalHumanForecast,
  dataCenter2035Question,
} from '../questions/data-center-2035/question.js';
import {
  binaryEndpointConnector,
  checkpointSlug,
  forecastCredentialProvider,
  latestObservationVersions,
  recordsForQuestion,
  refreshService,
  repositoryState,
} from './common.js';
import {
  parseCensusDataCenterConstructionWorkbook,
  type CensusDataCenterConstructionRow,
} from './xlsx.js';

const EIA_SERVER_SERIES =
  'cnsm_NA_comm_NA_prc_datactrserv_usa_qbtu';
const EIA_TOTAL_SERIES =
  'cnsm_NA_elep_NA_tel_NA_usa_blnkwh';
const QUAD_TO_BILLION_KWH = 293.071070172;

interface EiaAeoRow {
  period?: string;
  history?: string;
  scenario?: string;
  scenarioDescription?: string;
  seriesId?: string;
  seriesName?: string;
  value?: string;
  unit?: string;
}

interface EiaAeoResponse {
  response?: {
    total?: string;
    data?: EiaAeoRow[];
    description?: string;
  };
  apiVersion?: string;
}

export interface EiaDataCenterPath {
  scenario: string;
  scenarioDescription: string;
  year: number;
  serverElectricityQuads: number;
  totalElectricityBillionKwh: number;
  serverOnlyShare: number;
}

function requireFinite(value: unknown, context: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${context} must be numeric`);
  return number;
}

export function parseEiaDataCenterPaths(
  payload: EiaAeoResponse,
): EiaDataCenterPath[] {
  const rows = payload.response?.data;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('EIA AEO response has no data rows');
  }
  const grouped = new Map<
    string,
    {
      scenario: string;
      scenarioDescription: string;
      year: number;
      server?: number;
      total?: number;
    }
  >();
  for (const row of rows) {
    const scenario = row.scenario?.trim();
    const year = Number(row.period);
    if (!scenario || !Number.isInteger(year)) {
      throw new Error('EIA AEO row is missing scenario or year');
    }
    const key = `${scenario}:${year}`;
    const group = grouped.get(key) ?? {
      scenario,
      scenarioDescription: row.scenarioDescription ?? scenario,
      year,
    };
    if (row.seriesId === EIA_SERVER_SERIES) {
      if (row.unit !== 'quads') {
        throw new Error(`EIA server series unit changed to '${String(row.unit)}'`);
      }
      group.server = requireFinite(row.value, `${key} server electricity`);
    } else if (row.seriesId === EIA_TOTAL_SERIES) {
      if (row.unit !== 'BkWh') {
        throw new Error(`EIA total series unit changed to '${String(row.unit)}'`);
      }
      group.total = requireFinite(row.value, `${key} total electricity`);
    }
    grouped.set(key, group);
  }
  return [...grouped.values()]
    .map((group) => {
      if (group.server === undefined || group.total === undefined) {
        throw new Error(
          `EIA AEO scenario ${group.scenario} ${group.year} lacks one required series`,
        );
      }
      return {
        scenario: group.scenario,
        scenarioDescription: group.scenarioDescription,
        year: group.year,
        serverElectricityQuads: group.server,
        totalElectricityBillionKwh: group.total,
        serverOnlyShare:
          (group.server * QUAD_TO_BILLION_KWH) / group.total,
      };
    })
    .sort(
      (left, right) =>
        left.year - right.year || left.scenario.localeCompare(right.scenario),
    );
}

function normalizedEiaRows(
  paths: readonly EiaDataCenterPath[],
): NormalizedObservation[] {
  return paths.flatMap((path) => [
    {
      key: {
        schemaVersion: 'forecast-workbench.observation-key/v1' as const,
        datasetId: 'eia.aeo-2026.data-center-paths',
        seriesId: `${path.scenario}:${EIA_SERVER_SERIES}`,
        geography: 'USA',
        frequency: 'annual',
        validPeriod: String(path.year),
        measure: 'commercial purchased electricity for data center servers',
      },
      value: {
        value: path.serverElectricityQuads,
        unit: 'quads',
        scenarioDescription: path.scenarioDescription,
      },
      sourceRowLocator: `${path.scenario}/${path.year}/${EIA_SERVER_SERIES}`,
    },
    {
      key: {
        schemaVersion: 'forecast-workbench.observation-key/v1' as const,
        datasetId: 'eia.aeo-2026.data-center-paths',
        seriesId: `${path.scenario}:${EIA_TOTAL_SERIES}`,
        geography: 'USA',
        frequency: 'annual',
        validPeriod: String(path.year),
        measure: 'total electricity use',
      },
      value: {
        value: path.totalElectricityBillionKwh,
        unit: 'billion kWh',
        scenarioDescription: path.scenarioDescription,
      },
      sourceRowLocator: `${path.scenario}/${path.year}/${EIA_TOTAL_SERIES}`,
    },
  ]);
}

function monthOffset(month: string, years: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${year - years}-${String(monthNumber).padStart(2, '0')}`;
}

export interface CensusConstructionSummary {
  latest: CensusDataCenterConstructionRow;
  oneYearEarlier: CensusDataCenterConstructionRow;
  fiveYearsEarlier: CensusDataCenterConstructionRow;
  yearOverYearGrowth: number;
  fiveYearCompoundAnnualGrowth: number;
}

export function summarizeCensusConstruction(
  rows: readonly CensusDataCenterConstructionRow[],
): CensusConstructionSummary {
  const latest = rows.at(-1);
  if (!latest) throw new Error('Census construction history is empty');
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  const oneYearEarlier = byMonth.get(monthOffset(latest.month, 1));
  const fiveYearsEarlier = byMonth.get(monthOffset(latest.month, 5));
  if (!oneYearEarlier || !fiveYearsEarlier) {
    throw new Error('Census construction history lacks one- or five-year anchors');
  }
  const latestValue = latest.seasonallyAdjustedAnnualRateMillionUsd;
  return {
    latest,
    oneYearEarlier,
    fiveYearsEarlier,
    yearOverYearGrowth:
      latestValue /
        oneYearEarlier.seasonallyAdjustedAnnualRateMillionUsd -
      1,
    fiveYearCompoundAnnualGrowth:
      Math.pow(
        latestValue /
          fiveYearsEarlier.seasonallyAdjustedAnnualRateMillionUsd,
        1 / 5,
      ) - 1,
  };
}

function normalizedCensusRows(
  rows: readonly CensusDataCenterConstructionRow[],
  latestMonth: string,
): NormalizedObservation[] {
  const fiveYearStart = monthOffset(latestMonth, 5);
  return rows
    .filter((row) => row.month >= fiveYearStart)
    .map((row) => ({
      key: {
        schemaVersion: 'forecast-workbench.observation-key/v1',
        datasetId: 'census.vip.private-sa-history',
        seriesId: 'data-center-construction',
        geography: 'USA',
        frequency: 'monthly',
        validPeriod: row.month,
        measure:
          'value of private data-center construction put in place, seasonally adjusted annual rate',
      },
      value: {
        value: row.seasonallyAdjustedAnnualRateMillionUsd,
        unit: 'million USD at seasonally adjusted annual rate',
      },
      sourceRowLocator: `Private SA!J${row.sourceRow}`,
    }));
}

export interface DataCenterRefreshResult {
  pilot: 'data-center';
  root: string;
  checkpointAt: string;
  eia2035Paths: readonly EiaDataCenterPath[];
  construction: CensusConstructionSummary;
  priorEiaWeight: number;
  refreshedEiaWeight: number;
  modelPrediction: Readonly<Record<string, number>>;
  humanPrediction: Readonly<Record<string, number>>;
  evidencePacketId: string;
  modelForecastId: string;
  forecastId: string;
  chainHead?: string;
}

export async function refreshDataCenterForecast(options: {
  root: string;
}): Promise<DataCenterRefreshResult> {
  const clock = new SystemClock();
  const workbench = new ForecastWorkbench(options.root, clock);
  await workbench.initialize();
  try {
    const checkpointAt = clock.now().toISOString();
    const checkpoint = checkpointSlug(checkpointAt);
    const previous = await latestObservationVersions(workbench);
    const eia = eiaConnector({
      monitoringStartedAt: checkpointAt,
    }) as HttpSourceConnector<EiaQuery, EiaAeoResponse>;
    const eiaCapture = await captureHttpSource({
      workbench,
      actor: refreshService,
      connector: eia,
      query: {
        route: 'aeo/2026/data',
        query: {
          frequency: 'annual',
          'data[0]': 'value',
          'facets[scenario][]': ['cb2026', 'higheldmd'],
          'facets[seriesId][]': [EIA_SERVER_SERIES, EIA_TOTAL_SERIES],
          start: 2030,
          end: 2035,
          'sort[0][column]': 'period',
          'sort[0][direction]': 'asc',
          offset: 0,
          length: 500,
        },
      },
      credentialProvider: forecastCredentialProvider(),
      previousByObservationKey: previous,
      classification: 'public',
      license: 'U.S. government public data',
      normalize(parsed) {
        const paths = parseEiaDataCenterPaths(parsed);
        return {
          datasetId: 'eia.aeo-2026.data-center-paths',
          rows: normalizedEiaRows(paths),
          sourceVersion: `AEO 2026; EIA API ${parsed.apiVersion ?? 'unknown'}`,
          publicationTimeBasis: 'retrieval',
        };
      },
    });
    const census = binaryEndpointConnector({
      id: 'census-vip-private-sa-workbook',
      sourceId: 'census.vip-construction',
      uri: 'https://www.census.gov/construction/c30/xlsx/privsatime.xlsx',
      documentationUrl: 'https://www.census.gov/construction/c30/',
      allowedHosts: ['www.census.gov'],
      monitoringStartedAt: checkpointAt,
      responseSchema: {
        format: 'Office Open XML workbook',
        worksheet: 'Private SA',
        headerRow: 4,
        dateColumn: 'A',
        dataCenterColumn: 'J',
      },
      maxBytes: 25 * 1024 * 1024,
    });
    const censusCapture = await captureHttpSource({
      workbench,
      actor: refreshService,
      connector: census,
      query: {},
      credentialProvider: forecastCredentialProvider(),
      previousByObservationKey: previous,
      classification: 'public',
      license: 'U.S. government public data',
      normalize(raw) {
        const rows = parseCensusDataCenterConstructionWorkbook(raw);
        const latest = rows.at(-1);
        if (!latest) throw new Error('Census workbook has no data-center rows');
        return {
          datasetId: 'census.vip.private-sa-history',
          rows: normalizedCensusRows(rows, latest.month),
          sourceVersion: latest.month,
          publicationTimeBasis: 'retrieval',
        };
      },
    });
    const eiaPaths = parseEiaDataCenterPaths(eiaCapture.parsed);
    const eia2035Paths = eiaPaths.filter(({ year }) => year === 2035);
    if (eia2035Paths.length !== 2) {
      throw new Error('EIA refresh did not return both required 2035 scenarios');
    }
    const constructionRows = parseCensusDataCenterConstructionWorkbook(
      censusCapture.parsed,
    );
    const construction = summarizeCensusConstruction(constructionRows);
    if (construction.latest.month < '2026-05') {
      throw new Error(
        `Census construction workbook is unexpectedly stale at ${construction.latest.month}`,
      );
    }
    const priorEiaWeight = 0.25;
    const refreshedEiaWeight = 0.20;
    const model = await runDataCenter2035ModelAdapter({
      workbench,
      actor: refreshService,
      evidenceArtifactIds: [
        eiaCapture.receipt.rawArtifactId,
        censusCapture.receipt.rawArtifactId,
      ],
      createdAt: clock.now().toISOString(),
      eiaWeight: refreshedEiaWeight,
      checkpointId: checkpoint,
      ...repositoryState(),
    });
    const modelPrediction = model.modelForecast.prediction;
    if (modelPrediction?.kind !== 'ordered-categorical') {
      throw new Error('Data-center adapter did not return categorical probabilities');
    }
    const packet = await workbench.createEvidencePacket({
      actor: refreshService,
      id: `data-center-2035-live-refresh:${checkpoint}`,
      title: `EIA and Census data-center refresh at ${checkpointAt}`,
      view: {
        checkpointAt,
        eia2035Paths,
        construction,
        structuralWeightUpdate: {
          priorEiaWeight,
          refreshedEiaWeight,
          interpretation:
            'Fresh EIA values validate the low general-energy-model branch. Rapid realized data-center construction supports modestly more weight on the specialized high-growth family; this is a transparent analyst reweighting, not a fitted coefficient.',
        },
        modelPrediction: modelPrediction.probabilities,
        forecastDecision:
          'The model mixture shifts upward modestly, but remains within the uncertainty already represented by the human distribution; leave human bins unchanged.',
      },
      observationVersionIds: [
        ...eiaCapture.observationVersionRecordIds,
        ...censusCapture.observationVersionRecordIds,
      ],
      derivedFromArtifactIds: [
        eiaCapture.receipt.rawArtifactId,
        censusCapture.receipt.rawArtifactId,
        model.modelForecast.runManifestArtifactId,
      ],
      classification: 'internal',
      license: 'U.S. government public data',
    });
    const questionHash = canonicalSha256Id(dataCenter2035Question);
    const exposure = await workbench.revealEvidence({
      actor: { id: 'data-center-pilot-forecaster', role: 'forecaster' },
      questionHash,
      forecasterId: 'data-center-pilot-forecaster',
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
      actor: { id: 'data-center-pilot-forecaster', role: 'forecaster' },
      questionHash,
      forecasterId: 'data-center-pilot-forecaster',
      seriesId: 'published-human',
      prediction: dataCenter2035FinalHumanForecast,
      updateBasis: {
        kind: 'model-run',
        modelForecastIds: [model.recordId],
        note:
          `Fresh EIA and Census evidence was exposed in ${exposure.id}. The structural mixture moved modestly upward without escaping the prior human uncertainty envelope.`,
      },
      modelUse: 'conditioned',
      modelForecastIds: [model.recordId],
      referenceClassIds,
      conditionalSetIds,
      rationale:
        'Official EIA projections keep a meaningful low-share branch alive, while rapid realized construction supports slightly more weight on the specialized high-growth family. The evidence changes the model-family mix more than the already-wide human bins.',
      strongestContraryCase:
        'Construction spending can overstate energized and utilized load, while efficiency, queue attrition, behind-the-meter accounting, and denominator growth could preserve the lower EIA path.',
    });
    const verification = await workbench.ledger.verify();
    return {
      pilot: 'data-center',
      root: options.root,
      checkpointAt,
      eia2035Paths,
      construction,
      priorEiaWeight,
      refreshedEiaWeight,
      modelPrediction: modelPrediction.probabilities,
      humanPrediction:
        dataCenter2035FinalHumanForecast.kind === 'ordered-categorical'
          ? dataCenter2035FinalHumanForecast.probabilities
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

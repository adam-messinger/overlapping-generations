import {
  canonicalSha256Id,
  type ModelForecast,
  type Prediction,
} from 'forecast-workbench';
import {
  createRunManifest,
  manifestToJson,
  runModel,
  type DataSnapshot,
  type EvidenceRecord,
} from 'tsimulation';
import type { ForecastWorkbench } from 'forecast-workbench';
import { outbreakForecastModel } from '../../../simulations/registry.js';
import {
  historicalResiduals,
  type ForecastHorizon,
  type ForecastModel,
} from '../../../simulations/outbreak/probabilistic.js';
import {
  mapOperationalToFixedInitialCount,
} from '../../../simulations/outbreak/forecast-bridge.js';
import {
  operationalToFixedInitialAdmissionsCrosswalk,
} from '../../../simulations/outbreak/measurement-contracts.js';
import { outbreak2026Question } from './question.js';

const BIN_LIMITS = [4_000, 6_000, 9_000, 14_000] as const;

export interface OutbreakModelAdapterInput {
  values: readonly number[];
  originIndex: number;
  model: ForecastModel;
  horizon: ForecastHorizon;
  correction: number;
  operationalSnapshot: DataSnapshot;
  fixedInitialArtifactId: string;
  evidence: readonly EvidenceRecord[];
  createdAt: string;
  gitSha?: string;
  dirty?: boolean;
}

export interface OutbreakModelAdapterResult {
  recordId: string;
  modelForecast: ModelForecast;
  residualSamples: readonly number[];
}

function empiricalBins(samples: readonly number[]): Prediction {
  if (samples.length === 0) throw new Error('Outbreak adapter needs residual samples');
  const counts = [0, 0, 0, 0, 0];
  for (const value of samples) {
    const index = BIN_LIMITS.findIndex((limit) => value < limit);
    counts[index < 0 ? counts.length - 1 : index]++;
  }
  return {
    kind: 'ordered-categorical',
    probabilities: {
      A: counts[0] / samples.length,
      B: counts[1] / samples.length,
      C: counts[2] / samples.length,
      D: counts[3] / samples.length,
      E: counts[4] / samples.length,
    },
  };
}

export async function runOutbreakModelAdapter(options: {
  workbench: ForecastWorkbench;
  actor: { id: string; role: 'service' };
  input: OutbreakModelAdapterInput;
}): Promise<OutbreakModelAdapterResult> {
  const run = runModel(outbreakForecastModel, {
    values: options.input.values,
    model: options.input.model,
    originIndex: options.input.originIndex,
    horizon: options.input.horizon,
  }, {
    seed: 20260723,
    runLabel: 'outbreak-2026-08-15',
  });
  const manifest = createRunManifest({
    run,
    createdAt: options.input.createdAt,
    runId: 'outbreak-2026-08-15:model',
    gitSha: options.input.gitSha,
    dirty: options.input.dirty,
    snapshots: [options.input.operationalSnapshot],
    evidence: options.input.evidence,
    diagnostics: {
      forecastQuestionId: outbreak2026Question.id,
      modelOutputSemantics:
        'Operational revised weekly admissions in log1p space before resolution-series crosswalk.',
    },
  });
  const manifestArtifact = await options.workbench.ledger.artifacts.put(
    `${manifestToJson(manifest, 2)}\n`,
    {
      mediaType: 'application/json',
      classification: 'internal',
    },
  );
  const forecast = run.output;
  const residuals = historicalResiduals(
    options.input.values,
    options.input.model,
    options.input.originIndex,
    options.input.horizon,
  );
  const resolverSamples = residuals.map((residual) =>
    mapOperationalToFixedInitialCount(
      Math.max(0, Math.expm1(forecast.pointLog + residual)),
      options.input.correction,
    )
  );
  const prediction = empiricalBins(resolverSamples);
  const configuration = {
    binLimits: BIN_LIMITS,
    correction: options.input.correction,
    residualCount: residuals.length,
    measurementCrosswalk: {
      id: operationalToFixedInitialAdmissionsCrosswalk.id,
      version: operationalToFixedInitialAdmissionsCrosswalk.version,
    },
  };
  const adapterImplementation = `${empiricalBins.toString()}\n${runOutbreakModelAdapter.toString()}`;
  const modelForecast: ModelForecast = {
    schemaVersion: 'forecast-workbench.model-forecast/v1',
    id: 'outbreak-2026-08-15:model-conditioned',
    questionHash: canonicalSha256Id(outbreak2026Question),
    createdAt: options.input.createdAt,
    runManifestArtifactId: manifestArtifact.id,
    runId: manifest.runId,
    modelId: run.modelId,
    modelVersion: run.modelVersion,
    adapter: {
      id: 'outbreak-empirical-residuals-to-question-bins',
      version: '1.0.0',
      implementationHash: canonicalSha256Id(adapterImplementation),
      configurationHash: canonicalSha256Id(configuration),
    },
    adapterInputArtifactIds: [options.input.fixedInitialArtifactId],
    sourceEstimandIds: [
      'estimand.outbreak.us-covid-weekly-hospital-admissions',
    ],
    targetEstimandId: outbreak2026Question.targetEstimandId,
    semanticCrosswalkIds: [],
    measurementCrosswalkIds: [
      operationalToFixedInitialAdmissionsCrosswalk.id,
    ],
    discrepancy: {
      kind: 'qualitative',
      description:
        'The empirical residual support contains no novel immune-escape or measurement-regime ' +
        'jump. Literal zero tail bins are conditional on that finite support and must not be ' +
        'read as zero real-world probability; the final human forecast supplies the visible ' +
        'novelty tail.',
      parameters: {
        residualDraws: residuals.length,
        crossings9000: resolverSamples.filter((value) => value >= 9_000).length,
      },
    },
    prediction,
    identified: true,
  };
  const record = await options.workbench.registerModelForecast(
    options.actor,
    modelForecast,
  );
  return {
    recordId: record.id,
    modelForecast,
    residualSamples: resolverSamples,
  };
}

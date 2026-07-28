import {
  canonicalSha256Id,
  type ForecastWorkbench,
  type ModelForecast,
} from 'forecast-workbench';
import {
  createRunManifest,
  manifestToJson,
  runModel,
} from 'tsimulation';
import {
  DATA_CENTER_FORECAST_DRAWS,
  DATA_CENTER_FORECAST_SEED,
  dataCenterForecastMixtureModel,
} from '../../../simulations/news/data-center-forecast-mixture.js';
import {
  DATA_CENTER_2035_TARGET_ESTIMAND_ID,
  dataCenter2035Question,
} from './question.js';

export async function runDataCenter2035ModelAdapter(options: {
  workbench: ForecastWorkbench;
  actor: { id: string; role: 'service' };
  evidenceArtifactIds: readonly string[];
  createdAt: string;
  gitSha?: string;
  dirty?: boolean;
}): Promise<{ recordId: string; modelForecast: ModelForecast }> {
  const input = {
    eiaWeight: 0.25,
    draws: DATA_CENTER_FORECAST_DRAWS,
  };
  const run = runModel(dataCenterForecastMixtureModel, input, {
    seed: DATA_CENTER_FORECAST_SEED,
    runLabel: 'data-center-2035-question-mixture',
  });
  const manifest = createRunManifest({
    run,
    runId: 'data-center-2035:model-mixture',
    createdAt: options.createdAt,
    gitSha: options.gitSha,
    dirty: options.dirty,
    diagnostics: {
      forecastQuestionId: dataCenter2035Question.id,
      probabilitySemantics:
        'Epistemic analyst mixture over structural model families and post-2030 regimes.',
      samplingErrorInterpretation:
        'Monte Carlo error is minor relative to the chosen family and regime weights.',
    },
  });
  const manifestArtifact = await options.workbench.ledger.artifacts.put(
    `${manifestToJson(manifest, 2)}\n`,
    { mediaType: 'application/json', classification: 'internal' },
  );
  const prediction = {
    kind: 'ordered-categorical' as const,
    probabilities: {
      A: run.output.bins['below 10%'],
      B: run.output.bins['10% to below 15%'],
      C: run.output.bins['15% to below 20%'],
      D: run.output.bins['20% or more'],
    },
  };
  const adapterConfiguration = {
    binEdges: [0.10, 0.15, 0.20],
    eiaWeight: input.eiaWeight,
    draws: input.draws,
    seed: DATA_CENTER_FORECAST_SEED,
  };
  const modelForecast: ModelForecast = {
    schemaVersion: 'forecast-workbench.model-forecast/v1',
    id: 'data-center-2035:model-conditioned',
    questionHash: canonicalSha256Id(dataCenter2035Question),
    createdAt: options.createdAt,
    runManifestArtifactId: manifestArtifact.id,
    runId: manifest.runId,
    modelId: run.modelId,
    modelVersion: run.modelVersion,
    adapter: {
      id: 'data-center-mixture-summary-to-question-bins',
      version: '1.0.0',
      implementationHash: canonicalSha256Id(runDataCenter2035ModelAdapter.toString()),
      configurationHash: canonicalSha256Id(adapterConfiguration),
    },
    adapterInputArtifactIds: [...options.evidenceArtifactIds],
    sourceEstimandIds: [
      'estimand.eia.us-data-center-server-electricity-share',
      'estimand.lbnl.us-data-center-full-site-electricity-share',
    ],
    targetEstimandId: DATA_CENTER_2035_TARGET_ESTIMAND_ID,
    semanticCrosswalkIds: [
      'crosswalk.data-center.server-only-to-full-site-electricity',
    ],
    measurementCrosswalkIds: [],
    discrepancy: {
      kind: 'mixture',
      description:
        'The model-family and regime weights are explicit analyst beliefs, not ' +
        'frequencies learned from a validated historical ensemble.',
      parameters: {
        eiaFamilyWeight: input.eiaWeight,
        lbnlFamilyWeight: 1 - input.eiaWeight,
        p10: run.output.p10,
        median: run.output.median,
        p90: run.output.p90,
      },
    },
    prediction,
    identified: true,
  };
  const record = await options.workbench.registerModelForecast(
    options.actor,
    modelForecast,
  );
  return { recordId: record.id, modelForecast };
}

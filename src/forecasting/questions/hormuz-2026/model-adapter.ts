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
import { calibrateHormuzModel } from '../../../simulations/critical-materials/hormuz-calibration.js';
import {
  hormuzScenarios,
  type HormuzScenarioId,
} from '../../../simulations/critical-materials/hormuz-data.js';
import { hormuzDisruptionModel } from '../../../simulations/registry.js';
import { hormuzEstimands } from '../../../simulations/semantic-contracts.js';
import {
  HORMUZ_2026_TARGET_ESTIMAND_ID,
  hormuz2026Question,
} from './question.js';

const SCENARIOS = [
  'partial-reopening',
  'prolonged-closure',
] as const satisfies readonly HormuzScenarioId[];
const PRE_CRISIS_DAILY_CALL_ANCHOR = 88;
const QUESTION_THRESHOLD = 62;

export interface HormuzScenarioModelResult {
  scenarioId: typeof SCENARIOS[number];
  recordId: string;
  modelForecast: ModelForecast;
  decemberThroughput: number;
  naiveDailyCallProxy: number;
  conditionalOutcomeId: 'yes' | 'no';
  oilPriceMultiple2026: number;
  oilAvailability2026: number;
  peakGulfCrudeShutInPerDay2026: number;
}

export async function runHormuzScenarioAdapters(options: {
  workbench: ForecastWorkbench;
  actor: { id: string; role: 'service' };
  evidenceArtifactIds: readonly string[];
  createdAt: string;
  gitSha?: string;
  dirty?: boolean;
}): Promise<readonly HormuzScenarioModelResult[]> {
  const calibration = calibrateHormuzModel();
  const results: HormuzScenarioModelResult[] = [];
  for (const scenarioId of SCENARIOS) {
    const run = runModel(hormuzDisruptionModel, {
      scenario: hormuzScenarios[scenarioId],
      params: calibration.params,
    }, {
      runLabel: `hormuz-2026-${scenarioId}`,
    });
    const december = run.output.months.find(
      ({ year, month }) => year === 2026 && month === 12,
    );
    const annual = run.output.annual.find(({ year }) => year === 2026);
    if (!december || !annual) {
      throw new Error(`Hormuz scenario '${scenarioId}' lacks a 2026 result`);
    }
    const naiveDailyCallProxy =
      PRE_CRISIS_DAILY_CALL_ANCHOR * december.throughput;
    const conditionalOutcomeId = naiveDailyCallProxy >= QUESTION_THRESHOLD
      ? 'yes'
      : 'no';
    const manifest = createRunManifest({
      run,
      runId: `hormuz-2026:${scenarioId}`,
      createdAt: options.createdAt,
      gitSha: options.gitSha,
      dirty: options.dirty,
      diagnostics: {
        forecastQuestionId: hormuz2026Question.id,
        calibration: {
          development: calibration.development,
          holdout: calibration.holdout,
        },
        questionTranslation: {
          preCrisisDailyCallAnchor: PRE_CRISIS_DAILY_CALL_ANCHOR,
          threshold: QUESTION_THRESHOLD,
          decemberOilThroughputFraction: december.throughput,
          naiveDailyCallProxy,
          conditionalOutcomeId,
        },
      },
    });
    const manifestArtifact = await options.workbench.ledger.artifacts.put(
      `${manifestToJson(manifest, 2)}\n`,
      { mediaType: 'application/json', classification: 'internal' },
    );
    const adapterConfiguration = {
      scenarioId,
      preCrisisDailyCallAnchor: PRE_CRISIS_DAILY_CALL_ANCHOR,
      threshold: QUESTION_THRESHOLD,
    };
    const modelForecast: ModelForecast = {
      schemaVersion: 'forecast-workbench.model-forecast/v1',
      id: `hormuz-2026:${scenarioId}:conditional-model`,
      questionHash: canonicalSha256Id(hormuz2026Question),
      createdAt: options.createdAt,
      runManifestArtifactId: manifestArtifact.id,
      runId: manifest.runId,
      modelId: run.modelId,
      modelVersion: run.modelVersion,
      adapter: {
        id: 'hormuz-oil-throughput-to-all-vessel-calls-guardrail',
        version: '1.0.0',
        implementationHash: canonicalSha256Id(runHormuzScenarioAdapters.toString()),
        configurationHash: canonicalSha256Id(adapterConfiguration),
      },
      adapterInputArtifactIds: [...options.evidenceArtifactIds],
      sourceEstimandIds: [hormuzEstimands.commodityThroughputShare.id],
      targetEstimandId: HORMUZ_2026_TARGET_ESTIMAND_ID,
      semanticCrosswalkIds: [],
      measurementCrosswalkIds: [],
      discrepancy: {
        kind: 'qualitative',
        description:
          'The 88 × throughput calculation is an uncalibrated bin-mapping ' +
          'diagnostic. Oil-volume capacity is not the count of all vessel transits.',
        parameters: {
          decemberThroughput: december.throughput,
          naiveDailyCallProxy,
        },
      },
      identified: false,
      notIdentifiedReason:
        `Scenario '${scenarioId}' supplies a conditional physical path but no ` +
        'geopolitical path probability; the oil-volume-to-all-vessel-count crosswalk is absent.',
    };
    const record = await options.workbench.registerModelForecast(
      options.actor,
      modelForecast,
    );
    results.push({
      scenarioId,
      recordId: record.id,
      modelForecast,
      decemberThroughput: december.throughput,
      naiveDailyCallProxy,
      conditionalOutcomeId,
      oilPriceMultiple2026: annual.oilPriceMultiple,
      oilAvailability2026: annual.oilAvailability,
      peakGulfCrudeShutInPerDay2026: annual.peakGulfCrudeShutInPerDay,
    });
  }
  return results;
}

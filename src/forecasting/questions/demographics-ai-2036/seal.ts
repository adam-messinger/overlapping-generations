/**
 * Seals the two Demographics x AI 2036 panel runs into a forecast-workbench
 * ledger so they can be resolved and scored.
 *
 * What is recorded, per question:
 *   - the frozen question contract and its preflight (CQ1's fails: its wage
 *     conjunct has no resolving series, so no CQ1 forecast is sealed);
 *   - for run 2, the model-to-question adapter output the simulation-enabled
 *     Fermi seats consulted, as a model forecast. It is the ARCHIVED output
 *     from the model as it stood at that time, not a re-run: the model has
 *     changed since, and a re-run would attest to numbers nobody consulted.
 *     Only CQ3 is identified; the others record the adapter's refusal;
 *   - one launch forecast per panelist (24 per run), with the panelist's own
 *     reasoning as rationale;
 *   - equal-weight and log-odds pools for the binary and regime questions.
 *     The workbench has no continuous pooling, so CQ3/CQ4 pools stay in the
 *     report's Vincentized tables (scripts/tetlock_aggregate.py);
 *   - a pending resolution.
 *
 * Panelists in Waves 2-3 saw their effort's earlier packets. Those packets were
 * not workbench evidence records, so the exposure is DECLARED as external
 * information rather than claimed as gated evidence.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  aggregatePredictions,
  canonicalSha256Id,
  exportAuditBundle,
  ForecastWorkbench,
  runQuestionPreflight,
  type Actor,
  type AggregationInput,
  type Clock,
  type ModelForecast,
  type Prediction,
} from 'forecast-workbench';
import {
  createRunManifest,
  defineModel,
  manifestToJson,
  opaquePort,
  runModel,
} from 'tsimulation';
import { coupledQuestions, type CoupledQuestionKey } from './questions.js';

const designer: Actor = { id: 'demographics-ai-2036-orchestrator', role: 'designer' };
const modelService = { id: 'tetlock-sim-adapter', role: 'service' } as const;
const resolverActor: Actor = { id: 'resolution-service', role: 'resolver' };

/** The commit whose model produced the archived adapter output run 2 consulted. */
export const RUN2_MODEL_COMMIT = '68c42796069139f8d00e0c10d39f2d3644a6afb8';

export const PANEL_RUNS = [
  { id: 'run1', dir: 'run1-judgment-only', simEnabled: false },
  { id: 'run2', dir: 'run2-sim-enabled', simEnabled: true },
] as const;

interface Panelist {
  effort_key: string;
  lens: string;
  wave: number;
  cq1: number; cq2: number; cq5: number;
  cq3: { p10: number; p50: number; p90: number };
  cq4: { p10: number; p50: number; p90: number };
  cq6: { A: number; B: number; C: number; D: number };
  [field: string]: unknown;
}

export async function loadPanel(panelDir: string): Promise<Panelist[]> {
  const raw = JSON.parse(await readFile(join(panelDir, 'panelists.json'), 'utf8')) as {
    efforts: Array<{ effort_key: string; wave1: any[]; wave2: any[]; wave3: any }>;
  };
  return raw.efforts.flatMap((effort) =>
    [...effort.wave1, ...effort.wave2, effort.wave3].map((p) => ({
      ...p,
      effort_key: effort.effort_key,
    })),
  );
}

export function panelPrediction(p: Panelist, key: CoupledQuestionKey): Prediction {
  switch (key) {
    case 'cq1': case 'cq2': case 'cq5':
      return { kind: 'binary', positiveOutcomeId: 'yes', probability: p[key] / 100 };
    case 'cq3': case 'cq4':
      return {
        kind: 'quantiles',
        quantiles: [
          { probability: 0.1, value: p[key].p10 },
          { probability: 0.5, value: p[key].p50 },
          { probability: 0.9, value: p[key].p90 },
        ],
      };
    case 'cq6': {
      const total = p.cq6.A + p.cq6.B + p.cq6.C + p.cq6.D;
      return {
        kind: 'categorical',
        probabilities: {
          A: p.cq6.A / total, B: p.cq6.B / total, C: p.cq6.C / total, D: p.cq6.D / total,
        },
      };
    }
  }
}

function text(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(text).join(' | ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value ?? '');
}

const adapterArchiveModel = defineModel<
  { archive: Record<string, unknown> },
  { readings: Record<string, unknown>[]; refusals: Record<string, unknown> }
>({
  id: 'tetlock-sim-adapter-archive',
  version: '1.0.0',
  description:
    'Reads the archived scripts/tetlock-sim-adapter.ts --json output that the run-2 Fermi ' +
    'seats consulted, and exposes its per-scenario readings and per-question refusals.',
  inputPorts: { archive: opaquePort('Archived adapter JSON payload.', 'record') },
  outputPorts: {
    readings: opaquePort('Per-scenario adapter readings.', 'vector'),
    refusals: opaquePort('Per-question adapter refusals.', 'record'),
  },
  semanticValidation: 'if-present',
  run: ({ archive }) => ({
    readings: archive.readings as Record<string, unknown>[],
    refusals: archive.refusals as Record<string, unknown>,
  }),
});

async function registerAdapterForecasts(options: {
  workbench: ForecastWorkbench;
  archivePath: string;
  questionHashes: Map<CoupledQuestionKey, string>;
  createdAt: string;
}): Promise<Map<CoupledQuestionKey, string>> {
  const archive = JSON.parse(await readFile(options.archivePath, 'utf8')) as Record<string, unknown>;
  const archiveArtifact = await options.workbench.ledger.artifacts.putCanonical(archive, {
    classification: 'internal',
  });
  const run = runModel(adapterArchiveModel, { archive }, { runLabel: 'demographics-ai-2036-run2' });
  const manifest = createRunManifest({
    run,
    runId: 'demographics-ai-2036:run2:sim-adapter',
    createdAt: options.createdAt,
    gitSha: RUN2_MODEL_COMMIT,
    dirty: false,
    diagnostics: {
      provenance:
        'Archived adapter output. Re-running scripts/tetlock-sim-adapter.ts at ' +
        `${RUN2_MODEL_COMMIT} reproduces it exactly; later commits change the model.`,
      archiveArtifactId: archiveArtifact.id,
    },
  });
  const manifestArtifact = await options.workbench.ledger.artifacts.put(
    `${manifestToJson(manifest, 2)}\n`,
    { mediaType: 'application/json', classification: 'internal' },
  );
  const readings = run.output.readings;
  const refusals = run.output.refusals;
  const ids = new Map<CoupledQuestionKey, string>();
  for (const key of ['cq2', 'cq3', 'cq4', 'cq5', 'cq6'] as const) {
    const questionHash = options.questionHashes.get(key);
    if (!questionHash) continue;
    const growth = readings.map((r) => Number(r.cq3_coupled_growth_pct));
    const identified = key === 'cq3';
    // The adapter's own refusal text where it gave one; CQ6 inherits CQ2's,
    // since regime resolution needs the inflation measure the model lacks.
    const notIdentifiedReason = identified
      ? undefined
      : text(refusals[key === 'cq6' ? 'CQ2' : key.toUpperCase()] ??
          'The adapter returned no identified reading for this question.') +
        (key === 'cq6' ? ' (CQ6 resolves on OECD core inflation, which the model lacks.)' : '');
    const modelForecast: ModelForecast = {
      schemaVersion: 'forecast-workbench.model-forecast/v1',
      id: `demographics-ai-2036:run2:sim-adapter:${key}`,
      questionHash,
      createdAt: options.createdAt,
      runManifestArtifactId: manifestArtifact.id,
      runId: manifest.runId,
      modelId: run.modelId,
      modelVersion: run.modelVersion,
      adapter: {
        id: 'tetlock-sim-adapter-to-coupled-question',
        version: '1.0.0',
        implementationHash: canonicalSha256Id(registerAdapterForecasts.toString()),
        configurationHash: canonicalSha256Id({ key, window: [2032, 2036] }),
      },
      adapterInputArtifactIds: [archiveArtifact.id],
      sourceEstimandIds: ['estimand.overlapping-generations.regional-gdp'],
      targetEstimandId: `estimand.forecast.demographics-ai-2036.${key}`,
      semanticCrosswalkIds: identified
        ? ['crosswalk.oecd-38-plus-china-proxied-by-us-oecd-ex-us-china']
        : [],
      measurementCrosswalkIds: [],
      discrepancy: {
        kind: 'qualitative',
        description: identified
          ? 'Six named scenarios, NOT a probability distribution: the samples are scenario ' +
            'readings. Coverage gap: OECD-38 is proxied by us + oecd-ex-us (Japan, Korea, ' +
            'Turkiye, Mexico, Chile, Colombia, Costa Rica sit in other model regions). China ' +
            'catch-up is exogenous and labour elasticity is 0.15, so aging barely moves growth.'
          : 'Not identified; recorded so the consulting seats cite the refusal they received.',
        ...(identified
          ? { parameters: { scenarioMin: Math.min(...growth), scenarioMax: Math.max(...growth) } }
          : {}),
      },
      ...(identified ? { prediction: { kind: 'samples' as const, values: growth } } : {}),
      identified,
      ...(notIdentifiedReason ? { notIdentifiedReason } : {}),
    };
    const record = await options.workbench.registerModelForecast(modelService, modelForecast);
    ids.set(key, record.id);
  }
  return ids;
}

export interface SealResult {
  questionIds: Record<CoupledQuestionKey, string>;
  preflightFailures: CoupledQuestionKey[];
  sealedForecasts: number;
  modelForecastIds: Record<string, string>;
  aggregationIds: string[];
  skippedAggregations: string[];
  resolutionIds: string[];
  chainHead?: string;
}

export async function sealDemographicsAi2036(options: {
  root: string;
  forecastDir: string;
  clock: Clock;
  auditDestination?: string;
}): Promise<SealResult> {
  const workbench = new ForecastWorkbench(options.root, options.clock);
  await workbench.initialize();
  try {
    const questionHashes = new Map<CoupledQuestionKey, string>();
    const preflightFailures: CoupledQuestionKey[] = [];
    for (const spec of coupledQuestions) {
      const record = await workbench.registerQuestion(designer, spec.question);
      questionHashes.set(spec.key, record.id);
      const preflight = runQuestionPreflight({
        question: spec.question,
        designerId: designer.id,
        clock: options.clock,
        resolverProbe: { ...spec.probe, expectedPublicationAt: spec.question.resolver.expectedPublicationAt },
        soloWorkflow: false,
        alreadySeenNotes:
          'Sealed after the panel answered (same day, 2026-11-04) and before any resolving data exists.',
      });
      await workbench.recordPreflight(designer, preflight);
      if (preflight.checks.some(({ status }) => status === 'fail')) preflightFailures.push(spec.key);
    }
    const sealable = coupledQuestions
      .map(({ key }) => key)
      .filter((key) => !preflightFailures.includes(key));

    const modelForecastIds = await registerAdapterForecasts({
      workbench,
      archivePath: join(options.forecastDir, 'run2-sim-enabled', 'sim-adapter-output.json'),
      questionHashes: new Map([...questionHashes].filter(([key]) => sealable.includes(key))),
      createdAt: options.clock.now().toISOString(),
    });

    const inputs = new Map<string, AggregationInput[]>();
    let sealedForecasts = 0;
    for (const panelRun of PANEL_RUNS) {
      const panel = await loadPanel(join(options.forecastDir, panelRun.dir));
      for (const p of panel) {
        const forecasterId = `demographics-ai-2036:${panelRun.id}:${p.effort_key}:${p.lens}`;
        const actor: Actor = { id: forecasterId, role: 'forecaster' };
        for (const key of sealable) {
          const consulted = panelRun.simEnabled && p.lens === 'fermi';
          const modelId = modelForecastIds.get(key);
          const prediction = panelPrediction(p, key);
          const sealed = await workbench.sealForecast({
            actor,
            questionHash: questionHashes.get(key)!,
            forecasterId,
            seriesId: 'published-panel',
            prediction,
            updateBasis: {
              kind: 'launch',
              note: `${panelRun.id} wave ${p.wave} ${p.lens} seat, effort '${p.effort_key}'.`,
            },
            modelUse: consulted && modelId ? 'consulted' : 'none',
            ...(consulted && modelId ? { modelForecastIds: [modelId] } : {}),
            rationale: text(p[`${key}_reasoning`]),
            strongestContraryCase:
              'Not elicited per question. Panelist falsification signposts: ' +
              text(p.falsification_signposts),
            declaredExternalInformation: [
              'Shared preamble: locked demographic/fiscal (2A) and AI-Q1..Q6 (2B) priors.',
              ...(p.wave > 1
                ? [`Effort '${p.effort_key}' packets from waves 1..${p.wave - 1}` +
                   (panelRun.simEnabled ? ', including the Fermi seat\'s sim-consulted answers.' : '.')]
                : []),
            ],
          });
          sealedForecasts++;
          const group = `${panelRun.id}:${key}`;
          const list = inputs.get(group) ?? [];
          const record = await workbench.ledger.getRecord<{ sealedAt: string }>(sealed.id);
          list.push({ forecastId: sealed.id, forecasterId, prediction, sealedAt: record.sealedAt });
          inputs.set(group, list);
        }
      }
    }

    const aggregationIds: string[] = [];
    const skippedAggregations: string[] = [];
    for (const [group, list] of inputs) {
      const [runId, key] = group.split(':') as [string, CoupledQuestionKey];
      if (key === 'cq3' || key === 'cq4') {
        skippedAggregations.push(`${group}: continuous pooling not implemented in the workbench`);
        continue;
      }
      for (const method of [{ kind: 'equal-weight' as const }, { kind: 'log-odds' as const }]) {
        const aggregation = aggregatePredictions({
          id: `demographics-ai-2036:${runId}:${key}:${method.kind}`,
          version: '1.0.0',
          questionHash: questionHashes.get(key)!,
          createdAt: options.clock.now().toISOString(),
          method,
          inputs: list,
        });
        const record = await workbench.recordAggregation(designer, aggregation);
        aggregationIds.push(record.id);
      }
    }

    const resolutionIds: string[] = [];
    for (const spec of coupledQuestions) {
      if (!sealable.includes(spec.key)) continue;
      const pending = await workbench.recordResolution(resolverActor, {
        schemaVersion: 'forecast-workbench.resolution/v1',
        questionHash: questionHashes.get(spec.key)!,
        status: 'pending',
        resolvedAt: options.clock.now().toISOString(),
        resolverId: spec.question.resolver.id,
        resolverVersion: spec.question.resolver.version,
        resolverImplementationHash: spec.question.resolver.implementationHash,
        snapshotIds: [],
        observationVersionIds: [],
        adjudication: 'Open; resolve against the frozen resolver at the cutoff.',
      });
      resolutionIds.push(pending.id);
    }

    if (options.auditDestination) {
      await exportAuditBundle({
        ledger: workbench.ledger,
        clock: options.clock,
        destination: options.auditDestination,
      });
    }
    const verification = await workbench.ledger.verify();
    return {
      questionIds: Object.fromEntries(questionHashes) as Record<CoupledQuestionKey, string>,
      preflightFailures,
      sealedForecasts,
      modelForecastIds: Object.fromEntries(modelForecastIds),
      aggregationIds,
      skippedAggregations,
      resolutionIds,
      chainHead: verification.chainHead,
    };
  } finally {
    workbench.close();
  }
}

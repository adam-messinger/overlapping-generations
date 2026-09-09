/**
 * Performance-Weighted Aggregation
 *
 * A weight must come from the score records the aggregate cites, not from the
 * caller's copy of them.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FixedClock,
  ForecastWorkbench,
  aggregatePredictions,
  questionHash,
  resolveNumericQuestion,
  runQuestionPreflight,
  type Actor,
  type ForecastQuestion,
  type ScoreRecord,
} from '../src/index.js';

const designer: Actor = { id: 'designer', role: 'designer' };
const resolver: Actor = { id: 'resolver', role: 'resolver' };
const pooling: Actor = { id: 'pooling-service', role: 'service' };

function countQuestion(id: string, closesAt: string): ForecastQuestion {
  return {
    schemaVersion: 'forecast-workbench.question/v1',
    id,
    version: '1',
    title: 'How many?',
    description: 'Resolve a count into ordered bins.',
    targetEstimandId: `test.${id}`,
    opensAt: '2026-01-01T00:00:00.000Z',
    closesAt,
    expectedResolutionAt: closesAt,
    outcome: {
      kind: 'ordered-categorical',
      unit: 'count',
      bins: [
        { id: 'low', label: 'Below 10', upper: 10 },
        { id: 'high', label: 'At least 10', lower: 10 },
      ],
    },
    resolver: {
      id: 'fixture-resolver',
      version: '1',
      sourceId: 'fixture',
      description: 'Read fixture count.',
      implementationHash: 'sha256:resolver',
      queryDescription: 'fixture row',
      targetField: 'count',
      statistic: 'value',
      expectedPublicationAt: closesAt,
      revisionRule: { kind: 'first-release' },
      cancellationRule: 'Cancel if the fixture is unavailable for 30 days.',
    },
    createdAt: '2025-12-01T00:00:00.000Z',
  };
}

/**
 * Builds a workbench holding a resolved training question with one score per
 * forecaster, plus an open question the two have both forecast.
 */
async function poolWithTrackRecord() {
  const path = await mkdtemp(join(tmpdir(), 'forecast-performance-'));
  const clock = new FixedClock(new Date('2026-01-02T00:00:00.000Z'));
  const workbench = new ForecastWorkbench(path, clock);
  await workbench.initialize();

  const register = async (question: ForecastQuestion) => {
    const reference = await workbench.registerQuestion(designer, question);
    await workbench.recordPreflight(designer, runQuestionPreflight({
      question,
      designerId: designer.id,
      clock,
      resolverProbe: { ok: true, schemaRecognized: true, message: 'ok' },
      historicalValues: [1, 5, 11, 17],
    }));
    return reference;
  };

  const training = countQuestion('training-count', '2026-01-20T00:00:00.000Z');
  const target = countQuestion('target-count', '2026-03-01T00:00:00.000Z');
  const trainingRef = await register(training);
  const targetRef = await register(target);

  const seal = async (
    forecaster: string,
    hash: string,
    low: number,
  ) => workbench.sealForecast({
    actor: { id: forecaster, role: 'forecaster' },
    questionHash: hash,
    forecasterId: forecaster,
    seriesId: 'main',
    prediction: { kind: 'ordered-categorical', probabilities: { low, high: 1 - low } },
    updateBasis: { kind: 'launch' },
    modelUse: 'none',
    rationale: 'Prior based on the broad historical range.',
    strongestContraryCase: 'Recent observations could differ.',
  });

  // Track record: `sharp` is confident and right, `vague` is not.
  const sharpTraining = await seal('sharp', trainingRef.id, 0.9);
  const vagueTraining = await seal('vague', trainingRef.id, 0.5);

  clock.set(new Date('2026-01-21T00:00:00.000Z'));
  const resolution = await workbench.recordResolution(resolver, resolveNumericQuestion({
    question: training,
    clock,
    resolverImplementationHash: training.resolver.implementationHash,
    value: 4,
    snapshotIds: [],
    mappingExplanation: 'value 4',
  }));

  const scoreIds: string[] = [];
  for (const forecastId of [sharpTraining.id, vagueTraining.id]) {
    const score = await workbench.scoreForecast({
      actor: resolver,
      forecastId,
      resolutionId: resolution.id,
    });
    scoreIds.push(score.id);
  }

  // Both forecast the question actually being aggregated.
  const sharpTarget = await seal('sharp', targetRef.id, 0.8);
  const vagueTarget = await seal('vague', targetRef.id, 0.55);

  const scoreOf = async (id: string) => workbench.ledger.getRecord<ScoreRecord>(id);
  const [sharpScore, vagueScore] = await Promise.all(scoreIds.map(scoreOf));

  return {
    path, clock, workbench, targetRef, scoreIds,
    sharpTarget, vagueTarget, sharpScore, vagueScore,
    forecastOf: async (id: string) => workbench.ledger.getRecord<any>(id),
  };
}

test('performance weights must match the cited score records', async () => {
  const t = await poolWithTrackRecord();
  try {
    const [sharpForecast, vagueForecast] = await Promise.all([
      t.forecastOf(t.sharpTarget.id),
      t.forecastOf(t.vagueTarget.id),
    ]);

    const build = (sharpScore: number, availableAt?: string) => aggregatePredictions({
      id: 'performance-pool',
      version: '1.0.0',
      questionHash: t.targetRef.id,
      createdAt: t.clock.now().toISOString(),
      method: { kind: 'performance-weighted', epsilon: 0.1, metric: 'brier' },
      inputs: [
        {
          forecastId: t.sharpTarget.id,
          forecasterId: 'sharp',
          prediction: sharpForecast.prediction,
          sealedAt: sharpForecast.sealedAt,
          performanceScore: sharpScore,
          performanceScoreAvailableAt: availableAt ?? t.sharpScore.scoredAt,
        },
        {
          forecastId: t.vagueTarget.id,
          forecasterId: 'vague',
          prediction: vagueForecast.prediction,
          sealedAt: vagueForecast.sealedAt,
          performanceScore: t.vagueScore.values.brier!,
          performanceScoreAvailableAt: t.vagueScore.scoredAt,
        },
      ],
      trainingScoreIds: t.scoreIds,
    });

    // The honest aggregate, with both scores as recorded.
    await t.workbench.recordAggregation(pooling, build(t.sharpScore.values.brier!));

    // Flattering yourself: a better score than the record supports.
    await assert.rejects(
      t.workbench.recordAggregation(pooling, {
        ...build(t.sharpScore.values.brier! / 4),
        id: 'performance-pool-flattered',
      }),
      /cited scores average/,
    );

    // Backdating availability so a score appears to predate the aggregate.
    await assert.rejects(
      t.workbench.recordAggregation(pooling, {
        ...build(t.sharpScore.values.brier!, '2026-01-05T00:00:00.000Z'),
        id: 'performance-pool-backdated',
      }),
      /availability its cited records do not support/,
    );
  } finally {
    t.workbench.close();
    await rm(t.path, { recursive: true, force: true });
  }
});

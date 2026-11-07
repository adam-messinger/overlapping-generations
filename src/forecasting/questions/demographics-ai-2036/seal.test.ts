import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  FileArtifactStore,
  FixedClock,
  type AggregationRecord,
  type ModelForecast,
} from 'forecast-workbench';
import { sealDemographicsAi2036 } from './seal.js';

const forecastDir = resolve('docs/forecasts/demographics-ai-2036');

test('demographics-ai-2036 seal refuses CQ1, seals 48 panelists, and keeps the sim separate', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'demographics-ai-2036-seal-'));
  const root = join(temporary, 'ledger');
  try {
    const result = await sealDemographicsAi2036({
      root,
      forecastDir,
      clock: new FixedClock(new Date('2026-11-04T20:00:00.000Z')),
    });
    // CQ1's wage conjunct has no resolving series: the workbench must refuse it
    assert.deepEqual(result.preflightFailures, ['cq1']);
    // 2 runs x 24 panelists x 5 sealable questions
    assert.equal(result.sealedForecasts, 2 * 24 * 5);
    // binary + regime questions pooled two ways per run; continuous skipped
    assert.equal(result.aggregationIds.length, 2 * 3 * 2); // CQ2, CQ5, CQ6 x two methods x two runs
    assert.equal(result.skippedAggregations.length, 2 * 2);
    assert.equal(result.resolutionIds.length, 5);
    assert.match(result.chainHead ?? '', /^sha256:[a-f0-9]{64}$/);

    const artifacts = new FileArtifactStore(join(root, 'artifacts'));
    await artifacts.initialize();
    // Only CQ3 is identified; the model's growth is the archived run-2 baseline
    const cq3 = await artifacts.getCanonicalJson<ModelForecast>(result.modelForecastIds.cq3);
    assert.equal(cq3.identified, true);
    assert.equal(cq3.prediction?.kind, 'samples');
    const cq2 = await artifacts.getCanonicalJson<ModelForecast>(result.modelForecastIds.cq2);
    assert.equal(cq2.identified, false);
    assert.match(cq2.notIdentifiedReason ?? '', /price level/);

    // The run-1 CQ2 equal-weight pool reproduces the report's 35.6% raw mean
    const pools = await Promise.all(result.aggregationIds.map((id) =>
      artifacts.getCanonicalJson<AggregationRecord>(id)));
    const run1cq2 = pools.find((a) => a.id === 'demographics-ai-2036:run1:cq2:equal-weight');
    assert.ok(run1cq2 && run1cq2.result.kind === 'binary');
    assert.ok(Math.abs(run1cq2.result.probability - 0.356) < 0.0005);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

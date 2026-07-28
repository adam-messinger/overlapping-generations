import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FileArtifactStore,
  type ForecastVersion,
  type ModelForecast,
} from 'forecast-workbench';
import { runDataCenter2035Replay } from './replay.js';

test('data-center replay reproduces the published mixture and preserves judgment separately', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'data-center-workbench-replay-'));
  const root = join(temporary, 'ledger');
  const auditDestination = join(temporary, 'audit');
  try {
    const result = await runDataCenter2035Replay({ root, auditDestination });
    const artifacts = new FileArtifactStore(join(root, 'artifacts'));
    await artifacts.initialize();
    const model = await artifacts.getJson<ModelForecast>(result.modelForecastId);
    assert.deepEqual(model.prediction, {
      kind: 'ordered-categorical',
      probabilities: {
        A: 0.23088,
        B: 0.25614,
        C: 0.26119,
        D: 0.25179,
      },
    });
    assert.equal(model.discrepancy.kind, 'mixture');
    assert.equal(model.discrepancy.parameters?.median, 0.1522705120834732);

    const final = await artifacts.getJson<ForecastVersion>(result.finalForecastId);
    assert.deepEqual(final.prediction, {
      kind: 'ordered-categorical',
      probabilities: { A: 0.18, B: 0.25, C: 0.29, D: 0.28 },
    });
    assert.equal(final.modelUse, 'conditioned');
    assert.deepEqual(final.modelForecastIds, [result.modelForecastId]);
    assert.equal(result.conditionalSetIds.length, 3);
    assert.equal(result.triggerIds.length, 3);
    assert.match(result.chainHead ?? '', /^sha256:[a-f0-9]{64}$/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

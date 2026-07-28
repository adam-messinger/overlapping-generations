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
import { runHormuz2026Replay } from './replay.js';

test('Hormuz replay keeps opposite scenario results separate from an unidentified probability', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'hormuz-workbench-replay-'));
  const root = join(temporary, 'ledger');
  try {
    const result = await runHormuz2026Replay({ root });
    assert.equal(result.forecastIds.length, 6);
    assert.equal(result.modelResults.length, 2);
    assert.deepEqual(
      result.modelResults.map(({ scenarioId, conditionalOutcomeId }) => ({
        scenarioId,
        conditionalOutcomeId,
      })),
      [
        { scenarioId: 'partial-reopening', conditionalOutcomeId: 'yes' },
        { scenarioId: 'prolonged-closure', conditionalOutcomeId: 'no' },
      ],
    );
    assert.equal(result.modelResults[0].naiveDailyCallProxy, 88);
    assert.equal(result.modelResults[1].naiveDailyCallProxy, 7.04);

    const artifacts = new FileArtifactStore(join(root, 'artifacts'));
    await artifacts.initialize();
    for (const id of result.modelForecastIds) {
      const model = await artifacts.getJson<ModelForecast>(id);
      assert.equal(model.identified, false);
      assert.equal(model.prediction, undefined);
      assert.match(model.notIdentifiedReason ?? '', /no geopolitical path probability/);
      assert.match(model.discrepancy.description, /not the count of all vessel transits/);
    }
    const final = await artifacts.getJson<ForecastVersion>(result.finalForecastId);
    assert.deepEqual(final.prediction, {
      kind: 'binary',
      positiveOutcomeId: 'yes',
      probability: 0.39,
    });
    assert.equal(final.modelUse, 'consulted');
    assert.deepEqual(final.modelForecastIds, result.modelForecastIds);
    assert.equal(result.referenceClassIds.length, 2);
    assert.equal(result.conditionalSetIds.length, 3);
    assert.equal(result.triggerIds.length, 4);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

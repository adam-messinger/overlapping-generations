import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FileArtifactStore,
  type ModelForecast,
  type ScoreRecord,
} from 'forecast-workbench';
import { runOutbreak2026Replay } from './replay.js';

test('outbreak replay preserves the historical protocol and produces auditable scores', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'outbreak-workbench-replay-'));
  const root = join(temporary, 'ledger');
  const auditDestination = join(temporary, 'audit');
  try {
    const result = await runOutbreak2026Replay({
      root,
      auditDestination,
      syntheticResolutionValue: 1_500,
    });
    assert.equal(result.scoreIds.length, 2);
    assert.match(result.chainHead ?? '', /^sha256:[a-f0-9]{64}$/);

    const artifacts = new FileArtifactStore(join(root, 'artifacts'));
    await artifacts.initialize();
    const model = await artifacts.getJson<ModelForecast>(result.modelForecastId);
    assert.equal(model.identified, true);
    assert.deepEqual(model.prediction, {
      kind: 'ordered-categorical',
      probabilities: {
        A: 101 / 104,
        B: 1 / 104,
        C: 2 / 104,
        D: 0,
        E: 0,
      },
    });
    assert.equal(model.discrepancy.kind, 'qualitative');
    assert.match(model.discrepancy.description, /must not be read as zero real-world probability/);

    const [priorScore, finalScore] = await Promise.all(
      result.scoreIds.map((id) => artifacts.getJson<ScoreRecord>(id)),
    );
    const priorBrier = priorScore.values.brier;
    const finalBrier = finalScore.values.brier;
    const priorLog = priorScore.values.logarithmic;
    const finalLog = finalScore.values.logarithmic;
    assert.equal(priorBrier, 0.85);
    assert.equal(typeof finalBrier, 'number');
    assert.equal(typeof priorLog, 'number');
    assert.equal(typeof finalLog, 'number');
    assert.ok(finalBrier !== undefined && finalBrier < priorBrier);
    assert.ok(finalLog !== undefined && priorLog !== undefined && finalLog < priorLog);

    const manifest = JSON.parse(await readFile(
      join(auditDestination, 'manifest.json'),
      'utf8',
    )) as {
      events: number;
      verification: string;
      chainHead: string;
    };
    assert.equal(manifest.events, 14);
    assert.equal(manifest.verification, 'complete');
    assert.equal(manifest.chainHead, result.chainHead);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

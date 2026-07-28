import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FileArtifactStore,
  type NewsModelComparison,
  type NewsScreenRecord,
} from 'forecast-workbench';
import type { RunManifest } from 'tsimulation';
import type {
  GermanySickNoteResult,
  NvidiaVendorFinancingResult,
  SpainLabourMarketResult,
} from '../../../simulations/news/headline-experiments-2026-07-28.js';
import { runDailyNews20260728Replay } from './replay.js';

test('daily-news replay preserves screening, one iteration, and conventional-wisdom comparisons', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'daily-news-workbench-replay-'));
  const root = join(temporary, 'ledger');
  const auditDestination = join(temporary, 'audit');
  try {
    const replay = await runDailyNews20260728Replay({
      root,
      auditDestination,
    });
    assert.equal(replay.evidencePacketIds.length, 3);
    assert.equal(replay.comparisonIds.length, 3);
    assert.equal(replay.runManifestArtifactIds.length, 6);
    assert.match(replay.chainHead ?? '', /^sha256:[a-f0-9]{64}$/);

    const artifacts = new FileArtifactStore(join(root, 'artifacts'));
    await artifacts.initialize();
    const screen = await artifacts.getJson<NewsScreenRecord>(replay.screenId);
    assert.equal(screen.stories.filter(({ decision }) => decision === 'selected').length, 3);
    assert.equal(screen.stories.filter(({ decision }) => decision === 'deferred').length, 1);
    assert.equal(screen.stories.filter(({ decision }) => decision === 'rejected').length, 3);
    assert.ok(screen.limitations.some((value) => value.includes('raw article payloads')));

    const comparisons = await Promise.all(
      replay.comparisonIds.map((id) =>
        artifacts.getJson<NewsModelComparison>(id)
      ),
    );
    assert.deepEqual(
      comparisons.map(({ storyId, agreement, identificationStatus }) => ({
        storyId,
        agreement,
        identificationStatus,
      })),
      [
        {
          storyId: 'spain-unemployment',
          agreement: 'qualifies',
          identificationStatus: 'identified-direction',
        },
        {
          storyId: 'nvidia-vendor-financing',
          agreement: 'qualifies',
          identificationStatus: 'conditional-only',
        },
        {
          storyId: 'germany-sick-notes',
          agreement: 'agrees',
          identificationStatus: 'not-identified',
        },
      ],
    );
    comparisons.forEach(({ iterations }) => {
      assert.deepEqual(iterations.map(({ sequence }) => sequence), [1, 2]);
    });

    const manifests = await Promise.all(
      replay.runManifestArtifactIds.map((id) =>
        artifacts.getJson<RunManifest<Record<string, unknown>, any>>(id)
      ),
    );
    const byModel = new Map(
      manifests.map((manifest) => [manifest.model.id, manifest]),
    );
    const spainV2 = byModel.get(
      'news-spain-labour-market-v2-seasonal-annual-checks',
    )?.output.result as SpainLabourMarketResult['revisedV2'] | undefined;
    assert.ok(spainV2);
    assert.ok(
      Math.abs(
        spainV2.rawRateDeclineRetainedAfterAdjustment - 0.091,
      ) < 0.002,
    );

    const nvidiaV2 = byModel.get(
      'news-nvidia-vendor-financing-v2-expected-loss',
    )?.output.result as NvidiaVendorFinancingResult['revisedV2'] | undefined;
    assert.ok(nvidiaV2);
    assert.ok(
      Math.abs(
        nvidiaV2.centralExpectedLoss.presentValueExpectedLossBillion - 21.6,
      ) < 0.1,
    );
    assert.ok(
      Math.abs(
        nvidiaV2.stressExpectedLoss.presentValueExpectedLossBillion - 95.3,
      ) < 0.1,
    );

    const germanyV2 = byModel.get(
      'news-germany-sick-note-v2-behavioural-envelope',
    )?.output.result as GermanySickNoteResult['revisedV2'] | undefined;
    assert.ok(germanyV2);
    const germanyOutcomes = germanyV2.scenarios.map(
      ({ effectiveLabourChange }) => effectiveLabourChange,
    );
    assert.ok(Math.min(...germanyOutcomes) < 0);
    assert.ok(Math.max(...germanyOutcomes) > 0);

    const auditManifest = JSON.parse(
      await readFile(join(auditDestination, 'manifest.json'), 'utf8'),
    ) as {
      events: number;
      verification: string;
      artifacts: Array<{ id: string; role: string; included: boolean }>;
    };
    assert.equal(auditManifest.events, 7);
    assert.equal(auditManifest.verification, 'complete');
    for (const id of replay.runManifestArtifactIds) {
      const entry = auditManifest.artifacts.find((artifact) => artifact.id === id);
      assert.equal(entry?.included, true);
      assert.match(entry?.role ?? '', /news-run-manifest/);
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

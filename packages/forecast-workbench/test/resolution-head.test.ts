/**
 * The resolution head is a compare-and-set: a question may hold exactly one
 * final answer, and only the current head may be superseded.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FixedClock,
  ForecastWorkbench,
  resolveNumericQuestion,
  runQuestionPreflight,
  type Actor,
  type ForecastQuestion,
} from '../src/index.js';

const designer: Actor = { id: 'designer', role: 'designer' };
const resolver: Actor = { id: 'resolver', role: 'resolver' };

const question: ForecastQuestion = {
  schemaVersion: 'forecast-workbench.question/v1',
  id: 'head-count',
  version: '1',
  title: 'How many?',
  description: 'Resolve a count into ordered bins.',
  targetEstimandId: 'test.count',
  opensAt: '2026-01-01T00:00:00.000Z',
  closesAt: '2026-02-01T00:00:00.000Z',
  expectedResolutionAt: '2026-02-02T00:00:00.000Z',
  outcome: {
    kind: 'ordered-categorical',
    unit: 'count',
    bins: [
      { id: 'low', label: 'Below 10', upper: 10 },
      { id: 'middle', label: '10-19', lower: 10, upper: 20 },
      { id: 'high', label: 'At least 20', lower: 20 },
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
    expectedPublicationAt: '2026-02-02T00:00:00.000Z',
    revisionRule: { kind: 'first-release' },
    cancellationRule: 'Cancel if the fixture is unavailable for 30 days.',
  },
  createdAt: '2025-12-01T00:00:00.000Z',
};

async function resolvableQuestion(overrides: Partial<ForecastQuestion> = {}) {
  const path = await mkdtemp(join(tmpdir(), 'forecast-resolution-head-'));
  const clock = new FixedClock(new Date('2026-01-02T00:00:00.000Z'));
  const workbench = new ForecastWorkbench(path, clock);
  await workbench.initialize();
  const subject = { ...question, ...overrides };
  const registered = await workbench.registerQuestion(designer, subject);
  await workbench.recordPreflight(designer, runQuestionPreflight({
    question: subject,
    designerId: designer.id,
    clock,
    resolverProbe: { ok: true, schemaRecognized: true, message: 'ok' },
    historicalValues: [1, 5, 11, 17, 25],
  }));
  clock.set(new Date('2026-02-02T00:00:00.000Z'));
  const resolution = (value: number, extra: Record<string, unknown> = {}) =>
    resolveNumericQuestion({
      question: subject,
      clock,
      resolverImplementationHash: subject.resolver.implementationHash,
      value,
      snapshotIds: [],
      mappingExplanation: `value ${value}`,
      ...extra,
    });
  return { path, clock, workbench, registered, resolution };
}

test('concurrent finalizations cannot both commit', async () => {
  const t = await resolvableQuestion();
  try {
    const settled = await Promise.allSettled([
      t.workbench.recordResolution(resolver, t.resolution(5)),
      t.workbench.recordResolution(resolver, t.resolution(15)),
    ]);
    assert.equal(settled.filter(({ status }) => status === 'fulfilled').length, 1);

    const finals = [];
    for (const id of t.workbench.ledger.listRecordIds('resolution')) {
      const record = await t.workbench.ledger.getRecord<any>(id);
      if (record.status === 'final' || record.status === 'amended') finals.push(record);
    }
    assert.equal(finals.length, 1);
  } finally {
    t.workbench.close();
    await rm(t.path, { recursive: true, force: true });
  }
});

test('an amendment cannot supersede another question\'s resolution', async () => {
  // Both questions live in one ledger, so the superseded record genuinely
  // exists — the rejection has to come from the question check, not from the
  // record simply being absent.
  const t = await resolvableQuestion();
  try {
    const other = { ...question, id: 'head-count-b', title: 'How many (B)?' };
    await t.workbench.registerQuestion(designer, other);
    await t.workbench.recordPreflight(designer, runQuestionPreflight({
      question: other,
      designerId: designer.id,
      clock: t.clock,
      resolverProbe: { ok: true, schemaRecognized: true, message: 'ok' },
      historicalValues: [1, 5, 11, 17, 25],
    }));

    const first = await t.workbench.recordResolution(resolver, t.resolution(5));
    await assert.rejects(
      t.workbench.recordResolution(resolver, resolveNumericQuestion({
        question: other,
        clock: t.clock,
        resolverImplementationHash: other.resolver.implementationHash,
        value: 25,
        snapshotIds: [],
        mappingExplanation: 'value 25',
        status: 'amended',
        supersedesResolutionId: first.id,
      })),
      /same question/,
    );
  } finally {
    t.workbench.close();
    await rm(t.path, { recursive: true, force: true });
  }
});

test('only the current head may be superseded', async () => {
  const t = await resolvableQuestion();
  try {
    const first = await t.workbench.recordResolution(resolver, t.resolution(5));
    await t.workbench.recordResolution(resolver, t.resolution(15, {
      status: 'amended',
      supersedesResolutionId: first.id,
    }));
    // `first` is no longer the head, so amending it again must be refused.
    await assert.rejects(
      t.workbench.recordResolution(resolver, t.resolution(25, {
        status: 'amended',
        supersedesResolutionId: first.id,
      })),
      /current head/,
    );
  } finally {
    t.workbench.close();
    await rm(t.path, { recursive: true, force: true });
  }
});

test('amending the current head is accepted', async () => {
  const t = await resolvableQuestion();
  try {
    const first = await t.workbench.recordResolution(resolver, t.resolution(5));
    const amended = await t.workbench.recordResolution(resolver, t.resolution(15, {
      status: 'amended',
      supersedesResolutionId: first.id,
    }));
    const record = await t.workbench.ledger.getRecord<any>(amended.id);
    assert.equal(record.status, 'amended');
    assert.equal(record.supersedesResolutionId, first.id);
  } finally {
    t.workbench.close();
    await rm(t.path, { recursive: true, force: true });
  }
});

test('a dispute may follow a final resolution without superseding it', async () => {
  // A dispute comments on the resolved state rather than replacing it, so it
  // is exempt from the supersession requirement.
  const t = await resolvableQuestion();
  try {
    await t.workbench.recordResolution(resolver, t.resolution(5));
    const disputed = await t.workbench.recordResolution(
      resolver,
      t.resolution(5, { status: 'disputed' }),
    );
    assert.equal((await t.workbench.ledger.getRecord<any>(disputed.id)).status, 'disputed');
  } finally {
    t.workbench.close();
    await rm(t.path, { recursive: true, force: true });
  }
});

test('a non-final resolution cannot be superseded', async () => {
  // Resolutions of every status are projected, so a pending or disputed
  // record can be named as the predecessor even though nothing was ever
  // finally resolved. There is no head to move, so the append is refused.
  const t = await resolvableQuestion();
  try {
    const pending = await t.workbench.recordResolution(
      resolver,
      t.resolution(5, { status: 'pending' }),
    );
    await assert.rejects(
      t.workbench.recordResolution(resolver, t.resolution(15, {
        status: 'amended',
        supersedesResolutionId: pending.id,
      })),
      /no resolution to supersede/,
    );
  } finally {
    t.workbench.close();
    await rm(t.path, { recursive: true, force: true });
  }
});

test('a dispute may name a resolution the head has moved past', async () => {
  // Disputing an answer that was later amended over is the ordinary case:
  // the dispute is about that particular answer, not about replacing the
  // current one, so it is not held to the head.
  const t = await resolvableQuestion();
  try {
    const first = await t.workbench.recordResolution(resolver, t.resolution(5));
    await t.workbench.recordResolution(resolver, t.resolution(15, {
      status: 'amended',
      supersedesResolutionId: first.id,
    }));
    const disputed = await t.workbench.recordResolution(resolver, t.resolution(5, {
      status: 'disputed',
      supersedesResolutionId: first.id,
    }));
    const record = await t.workbench.ledger.getRecord<any>(disputed.id);
    assert.equal(record.status, 'disputed');
    assert.equal(record.supersedesResolutionId, first.id);
  } finally {
    t.workbench.close();
    await rm(t.path, { recursive: true, force: true });
  }
});

test('concurrent amendments of the same head cannot both commit', async () => {
  // The supersession path has its own head lookup, so it needs its own race
  // check — the finalization test only covers the no-predecessor branch.
  const t = await resolvableQuestion();
  try {
    const first = await t.workbench.recordResolution(resolver, t.resolution(5));
    const settled = await Promise.allSettled([
      t.workbench.recordResolution(resolver, t.resolution(15, {
        status: 'amended',
        supersedesResolutionId: first.id,
      })),
      t.workbench.recordResolution(resolver, t.resolution(25, {
        status: 'amended',
        supersedesResolutionId: first.id,
      })),
    ]);
    assert.equal(settled.filter(({ status }) => status === 'fulfilled').length, 1);
    const rejected = settled.find(({ status }) => status === 'rejected');
    assert.match((rejected as PromiseRejectedResult).reason.message, /current head/);
  } finally {
    t.workbench.close();
    await rm(t.path, { recursive: true, force: true });
  }
});

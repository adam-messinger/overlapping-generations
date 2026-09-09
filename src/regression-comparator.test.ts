/**
 * Regression Comparator Tests
 *
 * The comparator is the gate CI uses to decide whether scenario outputs moved.
 * These exercise the CLI itself, so what is tested is the gate as invoked, not
 * an internal function it happens to share.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { test, expect, printSummary } from './test-utils.js';

const reference = JSON.parse(
  readFileSync(new URL('../baselines/reference.json', import.meta.url), 'utf8'),
);

/** Runs the comparator over two fixtures, returning its JSON report and exit code. */
function compare(
  mutate: (before: any, after: any) => void,
): { exitCode: number; report: any } {
  const directory = mkdtempSync(join(tmpdir(), 'comparator-'));
  try {
    const before = JSON.parse(JSON.stringify(reference));
    const after = JSON.parse(JSON.stringify(reference));
    mutate(before, after);
    const beforePath = join(directory, 'before.json');
    const afterPath = join(directory, 'after.json');
    writeFileSync(beforePath, JSON.stringify(before));
    writeFileSync(afterPath, JSON.stringify(after));

    let exitCode = 0;
    let stdout = '';
    try {
      stdout = execFileSync(
        process.execPath,
        ['--import', 'tsx', 'scripts/compare-baselines.ts', '--strict', '--json', beforePath, afterPath],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      );
    } catch (error: any) {
      exitCode = error.status ?? 1;
      stdout = error.stdout ?? '';
    }
    return { exitCode, report: JSON.parse(stdout) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const firstScenario = Object.keys(reference.scenarios)[0];

test('an unchanged baseline compares clean', () => {
  const { exitCode, report } = compare(() => {});
  expect(exitCode).toBe(0);
  expect(report.warnings).toBe(0);
  expect(report.uncomparable.length).toBe(0);
});

test('a metric missing from the new capture is a failure, not a skip', () => {
  // Previously skipped, so a capture that dropped a metric reported clean.
  const { exitCode, report } = compare((_before, after) => {
    delete after.scenarios[firstScenario].gdp2100;
  });
  expect(exitCode).toBe(1);
  expect(report.warnings > 0).toBeTrue();
  expect(report.uncomparable.some((m: string) => m.includes('gdp2100'))).toBeTrue();
});

test('a non-finite metric is a failure', () => {
  const { exitCode, report } = compare((_before, after) => {
    after.scenarios[firstScenario].gdp2100 = null;
  });
  expect(exitCode).toBe(1);
  expect(report.uncomparable.some((m: string) => m.includes('gdp2100'))).toBeTrue();
});

test('a percentage metric moving off a zero reference is caught', () => {
  // A percentage against zero is undefined, which compared false and passed.
  const { exitCode, report } = compare((before, after) => {
    before.scenarios[firstScenario].gridIntensity2050 = 0;
    after.scenarios[firstScenario].gridIntensity2050 = 1000;
  });
  expect(exitCode).toBe(1);
  const diff = report.diffs.find(
    (d: any) => d.scenario === firstScenario && d.metric === 'gridIntensity2050',
  );
  expect(diff.warning).toBeTrue();
});

test('a zero reference that stays put is not a warning', () => {
  const { exitCode, report } = compare((before, after) => {
    before.scenarios[firstScenario].gridIntensity2050 = 0;
    after.scenarios[firstScenario].gridIntensity2050 = 0;
  });
  expect(exitCode).toBe(0);
  expect(report.warnings).toBe(0);
});

test('a missing scenario is still caught', () => {
  const { exitCode } = compare((_before, after) => {
    delete after.scenarios[firstScenario];
  });
  expect(exitCode).toBe(1);
});

printSummary();

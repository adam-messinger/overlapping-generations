import fs from 'node:fs';
import { expect, printSummary, test } from '../../src/test-utils.js';
import {
  README_PATH,
  assertInternationalStatus,
  assertReadmeStatusCurrent,
  collectInternationalStatusErrors,
  extractInternationalStatusBlock,
  loadInternationalStatus,
  renderInternationalStatusBlock,
} from './international-status.js';

const manifest = loadInternationalStatus();

test('canonical international status validates artifact hashes and result semantics', () => {
  assertInternationalStatus(manifest);
});

test('Japan records the split holdout instead of treating every outcome as sealed', () => {
  expect(manifest.countries.japan.holdouts.household.status).toBe('opened');
  expect(manifest.countries.japan.holdouts.household.verdict).toBe('fail');
  expect(manifest.countries.japan.holdouts.workingAge.status).toBe('awaiting_data');
  expect(manifest.countries.japan.holdouts.workingAge.verdict).toBe('pending');
  expect(manifest.countries.japan.overall.verdict).toBe('fail');
});

test('Italy records the opened working-age primary and failed overall verdict', () => {
  expect(manifest.countries.italy.holdouts.workingAge.status).toBe('opened');
  expect(manifest.countries.italy.holdouts.workingAge.verdict).toBe('fail');
  expect(manifest.countries.italy.overall.verdict).toBe('fail');
});

test('validator rejects a false claim that the Japan working-age result is open', () => {
  const contradictory = structuredClone(manifest);
  contradictory.countries.japan.holdouts.workingAge.status = 'opened';
  const errors = collectInternationalStatusErrors(contradictory);
  expect(errors.some((error) => error.includes('Japan workingAge holdout is opened'))).toBeTrue();
  expect(errors.some((error) => error.includes('working age to remain awaiting_data'))).toBeTrue();
});

test('README live-status block is generated exactly from the manifest', () => {
  assertReadmeStatusCurrent(manifest);
  const readme = fs.readFileSync(README_PATH, 'utf8');
  expect(extractInternationalStatusBlock(readme)).toBe(renderInternationalStatusBlock(manifest));
});

printSummary();

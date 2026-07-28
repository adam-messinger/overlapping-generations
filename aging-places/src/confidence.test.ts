import { expect, printSummary, test } from '../../src/test-utils.js';
import { classifyConfidence } from '../scripts/forecast.js';

console.log('\n=== Aging Places Confidence Tests ===\n');

const sound = {
  pop: 50000, hasZhvi: true, hasIncome: true, observedUnits: 20000,
  groupQuartersShare: 0.02, missingFeatureCount: 0, extremeFeatureCount: 0,
  modelDisagreement: 0.5,
};

test('complete, supported market is high confidence', () => {
  expect(classifyConfidence(sound).confidence).toBe('high');
});

test('zero housing stock and majority group quarters force low confidence', () => {
  const result = classifyConfidence({ ...sound, observedUnits: 0, groupQuartersShare: 0.8 });
  expect(result.confidence).toBe('low');
  expect(result.reasons.some((reason) => reason.includes('housing units'))).toBeTrue();
  expect(result.reasons.some((reason) => reason.includes('group-quarters'))).toBeTrue();
});

test('moderate model disagreement is explicitly medium confidence', () => {
  const result = classifyConfidence({ ...sound, modelDisagreement: 2.5 });
  expect(result.confidence).toBe('medium');
});

test('published ACS sampling uncertainty lowers confidence', () => {
  expect(classifyConfidence({ ...sound, acsRelativeMoe: 0.15 }).confidence).toBe('medium');
  expect(classifyConfidence({ ...sound, acsRelativeMoe: 0.30 }).confidence).toBe('low');
});

printSummary();

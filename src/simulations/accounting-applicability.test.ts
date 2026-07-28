import assert from 'node:assert/strict';
import test from 'node:test';
import { SIMULATION_MODELS } from './registry.js';
import {
  MODEL_ACCOUNTING_APPLICABILITY,
  assertCompleteAccountingApplicability,
  renderAccountingApplicabilityMarkdown,
} from './accounting-applicability.js';

test('accounting applicability audit covers every current registry model exactly once', () => {
  assert.doesNotThrow(() => assertCompleteAccountingApplicability());
  const registered = SIMULATION_MODELS.map((model) => model.id).sort();
  const audited = MODEL_ACCOUNTING_APPLICABILITY
    .filter((entry) => entry.scope === 'registry')
    .map((entry) => entry.modelId)
    .sort();
  assert.deepEqual(audited, registered);
});

test('audit recommendations are substantive and render as a complete table', () => {
  for (const entry of MODEL_ACCOUNTING_APPLICABILITY) {
    assert.ok(entry.recommendation.length > 80, entry.modelId);
  }
  const markdown = renderAccountingApplicabilityMarkdown();
  assert.match(markdown, /global-olg/);
  assert.match(markdown, /sovereign-nbfi-contagion/);
  assert.equal(markdown.split('\n').length, MODEL_ACCOUNTING_APPLICABILITY.length + 2);
});

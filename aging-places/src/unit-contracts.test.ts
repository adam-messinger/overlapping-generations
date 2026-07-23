import assert from 'node:assert/strict';
import test from 'node:test';

import { auditAgingUnitContracts } from './simulation.js';

test('aging-city entry point has complete compatible unit contracts', () => {
  const audit = auditAgingUnitContracts();
  assert.equal(audit.valid, true, audit.errors.join('\n'));
  assert.ok(audit.unitBearingContracts > 50);
  assert.equal(audit.opaqueContracts, 0);
});

/**
 * Module invariants: declared once, checked after every step of every run.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAutowired } from '../src/autowire.js';
import { defineModule } from '../src/module.js';
import {
  atLeast,
  atMost,
  closeTo,
  evaluateInvariants,
  invariantMessages,
  sumValues,
} from '../src/invariants.js';
import { unitPort } from '../src/units.js';
import { okValidate, throwsWith } from './helpers.js';

/**
 * A two-account ledger: `total` must equal `a + b` and the stock must grow by
 * exactly this step's inflow. `leakFrom` breaks the first identity from that
 * year on, so the tests can watch a violation appear mid-run.
 */
function ledgerModule(leakFrom = Number.POSITIVE_INFINITY) {
  return defineModule({
    name: 'ledger',
    description: 'Parts, total and a stock',
    defaults: { inflow: 2 },
    connectorTypes: {
      inputs: {},
      outputs: {
        a: unitPort('fraction'),
        b: unitPort('fraction'),
        total: unitPort('fraction'),
        stock: unitPort('fraction'),
      },
    },
    validate: okValidate,
    mergeParams: (p) => ({ inflow: 2, ...p }),
    init: () => ({ stock: 10 }),
    step: (state, _inputs, params, year) => {
      const a = year;
      const b = 2 * year;
      const stock = state.stock + params.inflow;
      return {
        state: { stock },
        outputs: { a, b, total: a + b + (year >= leakFrom ? 1 : 0), stock },
      };
    },
    invariants: [
      {
        name: 'parts sum to total',
        check: ({ outputs }) => closeTo('total', outputs.total, outputs.a + outputs.b),
      },
      {
        name: 'stock accumulates the inflow',
        check: ({ previousState, state, params }) =>
          closeTo('stock', state.stock, previousState.stock + params.inflow),
      },
    ],
  });
}

const run = (leakFrom?: number, invariants?: 'off' | 'report' | 'warn' | 'error') =>
  runAutowired({ modules: [ledgerModule(leakFrom)], startYear: 0, endYear: 5, invariants });

test('holding invariants are checked every step and reported', () => {
  const result = run();
  assert.deepEqual(result.diagnostics?.invariants, { checked: 12, violations: [] });
});

test('the default policy throws at the first violating step, naming module, invariant and year', () => {
  throwsWith(() => run(3), "[ledger] invariant 'parts sum to total' failed at 3");
});

test('report collects every violation without throwing', () => {
  const result = run(3, 'report');
  const violations = result.diagnostics?.invariants?.violations ?? [];
  assert.deepEqual(violations.map((v) => v.year), [3, 4, 5]);
  assert.ok(violations.every((v) => v.module === 'ledger' && v.invariant === 'parts sum to total'));
});

test("'off' skips the checks and leaves no invariant diagnostics", () => {
  const result = run(3, 'off');
  assert.equal(result.diagnostics?.invariants, undefined);
});

test('the policy never changes what the model computes', () => {
  const checked = run(3, 'report');
  const unchecked = run(3, 'off');
  assert.deepEqual(checked.outputs, unchecked.outputs);
  assert.deepEqual(checked.states, unchecked.states);
});

test('previous outputs and inputs are undefined on the first step and the prior step\'s after', () => {
  const seen: Array<number | undefined> = [];
  const seenInputs: Array<object | undefined> = [];
  const mod = defineModule({
    name: 'counter',
    description: 'counts',
    defaults: {},
    connectorTypes: { inputs: {}, outputs: { n: unitPort('fraction') } },
    validate: okValidate,
    mergeParams: () => ({}),
    init: () => ({}),
    step: (_s, _i, _p, _year, yearIndex) => ({ state: {}, outputs: { n: yearIndex } }),
    invariants: [{
      name: 'record',
      check: ({ previousOutputs, previousInputs }) => {
        seen.push(previousOutputs?.n);
        seenInputs.push(previousInputs);
      },
    }],
  });
  runAutowired({ modules: [mod], startYear: 0, endYear: 2 });
  assert.deepEqual(seen, [undefined, 0, 1]);
  assert.deepEqual(seenInputs, [undefined, {}, {}]);
});

test('invariant reads do not make a parameter count as live', () => {
  // Liveness answers "did the MODEL read this override"; an identity check
  // reading it must not mask a parameter the step ignores.
  const mod = defineModule({
    name: 'idle',
    description: 'never reads its param in step',
    defaults: { unused: 1 },
    connectorTypes: { inputs: {}, outputs: { x: unitPort('fraction') } },
    validate: okValidate,
    mergeParams: (p) => ({ unused: 1, ...p }),
    init: () => ({}),
    step: () => ({ state: {}, outputs: { x: 0 } }),
    invariants: [{ name: 'reads param', check: ({ params }) => atLeast('unused', params.unused, 0) }],
  });
  const result = runAutowired({
    modules: [mod],
    startYear: 0,
    endYear: 1,
    params: { idle: { unused: 5 } },
    paramLiveness: 'report',
  });
  assert.deepEqual(result.diagnostics?.parameterLiveness?.idle.unreadOverridePaths, ['unused']);
});

test('a check that throws is recorded as a violation rather than crashing the run', () => {
  const violations = evaluateInvariants('m', [{
    name: 'broken',
    check: () => { throw new Error('boom'); },
  }], {
    params: {}, previousState: {}, state: {}, inputs: {}, outputs: {},
    previousOutputs: undefined, previousInputs: undefined, year: 2030, yearIndex: 5,
  });
  assert.equal(violations.length, 1);
  assert.match(violations[0].message, /check threw: boom/);
});

test('comparison helpers return a message only on failure', () => {
  assert.equal(closeTo('x', 1, 1 + 1e-12), undefined);
  assert.match(closeTo('x', 1, 1.1) ?? '', /^x: 1 != 1\.1/);
  assert.equal(closeTo('x', 0, 1e-10), undefined, 'absolute tolerance covers values near zero');
  assert.match(closeTo('x', Number.NaN, 0) ?? '', /actual is NaN/, 'NaN never passes');
  assert.equal(atMost('x', 2, 2), undefined);
  assert.match(atMost('x', 3, 2) ?? '', /exceeds 2 by 1/);
  assert.equal(atLeast('x', 2, 2), undefined);
  assert.match(atLeast('x', 1, 2) ?? '', /below 2 by 1/);
  assert.equal(sumValues({ a: 1, b: 2 }), 3);
  assert.equal(sumValues({ a: { v: 1 }, b: { v: 4 } }, (r) => r.v), 5);
  assert.deepEqual(invariantMessages(['a', undefined, null, false, 'b']), ['a', 'b']);
});

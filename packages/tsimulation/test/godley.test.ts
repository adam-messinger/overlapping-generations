import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGodleyLedger,
  defineGodleyLedger,
  postGodleyTransactions,
  renderGodleyMermaid,
  renderGodleyTableMarkdown,
} from '../src/index.js';

const definition = defineGodleyLedger({
  id: 'banking-test',
  version: '1.0.0',
  description: 'Two-sector loan accounting fixture',
  unit: 'currency',
  accounts: [
    { id: 'firm.deposit', sector: 'firms', kind: 'asset', instrument: 'deposits' },
    { id: 'firm.loan', sector: 'firms', kind: 'liability', instrument: 'loans' },
    { id: 'firm.equity', sector: 'firms', kind: 'equity' },
    { id: 'bank.loan', sector: 'banks', kind: 'asset', instrument: 'loans' },
    { id: 'bank.deposit', sector: 'banks', kind: 'liability', instrument: 'deposits' },
    { id: 'bank.equity', sector: 'banks', kind: 'equity' },
  ],
});

test('Godley ledger posts loan creation and repayment with exact counterparties', () => {
  const opening = createGodleyLedger(definition, {});
  const result = postGodleyTransactions(definition, opening, [
    {
      id: 'origination',
      description: 'Bank creates a loan and matching deposit',
      entries: [
        { accountId: 'firm.deposit', change: 100 },
        { accountId: 'firm.loan', change: 100 },
        { accountId: 'bank.loan', change: 100 },
        { accountId: 'bank.deposit', change: 100 },
      ],
    },
    {
      id: 'repayment',
      description: 'Firm repays principal',
      entries: [
        { accountId: 'firm.deposit', change: -20 },
        { accountId: 'firm.loan', change: -20 },
        { accountId: 'bank.loan', change: -20 },
        { accountId: 'bank.deposit', change: -20 },
      ],
    },
  ]);

  assert.equal(result.state.balances['firm.loan'], 80);
  assert.equal(result.state.balances['bank.loan'], 80);
  assert.equal(result.report.maxResidual, 0);
  assert.equal(result.report.balanced, true);
  assert.match(renderGodleyTableMarkdown(definition, result.report), /Bank creates a loan/);
  assert.match(renderGodleyMermaid(definition, result.report), /flowchart LR/);
});

test('Godley ledger rejects a transaction missing its liability counter-entry', () => {
  const opening = createGodleyLedger(definition, {});
  assert.throws(
    () => postGodleyTransactions(definition, opening, [
      {
        id: 'money-from-nowhere',
        description: 'Unbalanced deposit creation',
        entries: [{ accountId: 'firm.deposit', change: 100 }],
      },
    ]),
    /Unbalanced Godley transaction/,
  );
});

test('Godley ledger rejects unmatched opening instruments and negative claims', () => {
  assert.throws(
    () => createGodleyLedger(definition, {
      'firm.deposit': 10,
      'firm.equity': 10,
    }),
    /instrument residual/,
  );
  assert.throws(
    () => createGodleyLedger(definition, {
      'firm.deposit': -1,
      'firm.equity': -1,
      'bank.deposit': -1,
      'bank.equity': 1,
    }),
    /cannot have a negative balance/,
  );
});

test('Godley table preserves integer trailing zeros at zero display precision', () => {
  const opening = createGodleyLedger(definition, {});
  const result = postGodleyTransactions(definition, opening, [{
    id: 'origination',
    description: 'Bank creates a loan and matching deposit',
    entries: [
      { accountId: 'firm.deposit', change: 100 },
      { accountId: 'firm.loan', change: 100 },
      { accountId: 'bank.loan', change: 100 },
      { accountId: 'bank.deposit', change: 100 },
    ],
  }]);
  const table = renderGodleyTableMarkdown(definition, result.report, 0);
  assert.match(
    table,
    /\| Bank creates a loan and matching deposit \| 100 \| 100 \| 0 \| 100 \| 100 \| 0 \| 0 \|/,
  );
});

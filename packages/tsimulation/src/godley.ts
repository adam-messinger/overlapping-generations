/**
 * A small, domain-independent Godley-table ledger.
 *
 * Balances use the holder's point of view. Assets are positive claims,
 * liabilities are positive obligations, and equity is the balancing item.
 * Every transaction must preserve A - L - E = 0 within every affected sector.
 */

export type GodleyAccountKind = 'asset' | 'liability' | 'equity';

export interface GodleyAccountDefinition {
  id: string;
  sector: string;
  kind: GodleyAccountKind;
  description?: string;
  /**
   * Claims with the same instrument id must net to zero across asset and
   * liability accounts (for example, deposits or bank loans).
   */
  instrument?: string;
  /** Assets and liabilities default to non-negative; equity may be negative. */
  allowNegative?: boolean;
}

export interface GodleyLedgerDefinition {
  id: string;
  version: string;
  description: string;
  unit: string;
  accounts: readonly GodleyAccountDefinition[];
  tolerance?: number;
}

export interface GodleyLedgerState {
  definitionId: string;
  step: number;
  balances: Readonly<Record<string, number>>;
}

export interface GodleyEntry {
  accountId: string;
  change: number;
}

export interface GodleyTransaction {
  id: string;
  description: string;
  entries: readonly GodleyEntry[];
}

export interface GodleyTransactionReport {
  id: string;
  description: string;
  changes: Readonly<Record<string, number>>;
  globalResidual: number;
  sectorResiduals: Readonly<Record<string, number>>;
}

export interface GodleyLedgerReport {
  definitionId: string;
  openingStep: number;
  closingStep: number;
  openingBalances: Readonly<Record<string, number>>;
  closingBalances: Readonly<Record<string, number>>;
  flowsByAccount: Readonly<Record<string, number>>;
  transactions: readonly GodleyTransactionReport[];
  openingSectorResiduals: Readonly<Record<string, number>>;
  closingSectorResiduals: Readonly<Record<string, number>>;
  openingInstrumentResiduals: Readonly<Record<string, number>>;
  closingInstrumentResiduals: Readonly<Record<string, number>>;
  stockTransitionResiduals: Readonly<Record<string, number>>;
  maxResidual: number;
  balanced: boolean;
}

export interface GodleyPostingResult {
  state: GodleyLedgerState;
  report: GodleyLedgerReport;
}

function kindSign(kind: GodleyAccountKind): number {
  return kind === 'asset' ? 1 : -1;
}

function assertIdentifier(value: string, context: string): void {
  if (!value.trim()) throw new Error(`${context} must be non-empty`);
}

function accountMap(
  definition: GodleyLedgerDefinition,
): ReadonlyMap<string, GodleyAccountDefinition> {
  return new Map(definition.accounts.map((account) => [account.id, account]));
}

function sectors(definition: GodleyLedgerDefinition): string[] {
  return [...new Set(definition.accounts.map((account) => account.sector))].sort();
}

function instruments(definition: GodleyLedgerDefinition): string[] {
  return [
    ...new Set(
      definition.accounts
        .map((account) => account.instrument)
        .filter((instrument): instrument is string => instrument !== undefined),
    ),
  ].sort();
}

function tolerance(definition: GodleyLedgerDefinition): number {
  return definition.tolerance ?? 1e-9;
}

export function defineGodleyLedger(
  definition: GodleyLedgerDefinition,
): GodleyLedgerDefinition {
  assertIdentifier(definition.id, 'Godley ledger id');
  assertIdentifier(definition.version, 'Godley ledger version');
  assertIdentifier(definition.description, 'Godley ledger description');
  assertIdentifier(definition.unit, 'Godley ledger unit');
  if (definition.accounts.length === 0) {
    throw new Error('Godley ledger requires at least one account');
  }
  if (
    definition.tolerance !== undefined
    && (!Number.isFinite(definition.tolerance) || definition.tolerance < 0)
  ) {
    throw new Error('Godley ledger tolerance must be a finite non-negative number');
  }

  const ids = new Set<string>();
  const equitySectors = new Set<string>();
  for (const account of definition.accounts) {
    assertIdentifier(account.id, 'Godley account id');
    assertIdentifier(account.sector, `Godley account '${account.id}' sector`);
    if (ids.has(account.id)) {
      throw new Error(`Duplicate Godley account id '${account.id}'`);
    }
    ids.add(account.id);
    if (account.instrument) assertIdentifier(account.instrument, `Account '${account.id}' instrument`);
    if (account.kind === 'equity') equitySectors.add(account.sector);
  }
  for (const sector of sectors(definition)) {
    if (!equitySectors.has(sector)) {
      throw new Error(`Godley sector '${sector}' requires an equity account`);
    }
  }
  for (const instrument of instruments(definition)) {
    const accounts = definition.accounts.filter((account) => account.instrument === instrument);
    if (!accounts.some((account) => account.kind === 'asset')) {
      throw new Error(`Godley instrument '${instrument}' requires an asset account`);
    }
    if (!accounts.some((account) => account.kind === 'liability')) {
      throw new Error(`Godley instrument '${instrument}' requires a liability account`);
    }
    if (accounts.some((account) => account.kind === 'equity')) {
      throw new Error(`Godley instrument '${instrument}' cannot be assigned to equity`);
    }
  }
  return Object.freeze({
    ...definition,
    accounts: Object.freeze(definition.accounts.map((account) => Object.freeze({ ...account }))),
  });
}

function completeBalances(
  definition: GodleyLedgerDefinition,
  supplied: Readonly<Record<string, number>>,
): Record<string, number> {
  const accounts = accountMap(definition);
  for (const accountId of Object.keys(supplied)) {
    if (!accounts.has(accountId)) {
      throw new Error(`Unknown Godley account '${accountId}'`);
    }
  }
  const balances: Record<string, number> = {};
  for (const account of definition.accounts) {
    const value = supplied[account.id] ?? 0;
    if (!Number.isFinite(value)) {
      throw new Error(`Godley account '${account.id}' balance must be finite`);
    }
    const allowsNegative = account.allowNegative ?? account.kind === 'equity';
    if (!allowsNegative && value < -tolerance(definition)) {
      throw new Error(`Godley account '${account.id}' cannot have a negative balance`);
    }
    balances[account.id] = Math.abs(value) <= tolerance(definition) ? 0 : value;
  }
  return balances;
}

export function godleySectorResiduals(
  definition: GodleyLedgerDefinition,
  balances: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const result: Record<string, number> = Object.fromEntries(
    sectors(definition).map((sector) => [sector, 0]),
  );
  for (const account of definition.accounts) {
    result[account.sector] += kindSign(account.kind) * (balances[account.id] ?? 0);
  }
  return result;
}

export function godleyInstrumentResiduals(
  definition: GodleyLedgerDefinition,
  balances: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const result: Record<string, number> = Object.fromEntries(
    instruments(definition).map((instrument) => [instrument, 0]),
  );
  for (const account of definition.accounts) {
    if (!account.instrument) continue;
    result[account.instrument] += kindSign(account.kind) * (balances[account.id] ?? 0);
  }
  return result;
}

function maxAbsolute(records: readonly Readonly<Record<string, number>>[]): number {
  return records.reduce(
    (maximum, record) =>
      Math.max(maximum, ...Object.values(record).map((value) => Math.abs(value)), 0),
    0,
  );
}

function assertResiduals(
  residuals: Readonly<Record<string, number>>,
  allowed: number,
  context: string,
): void {
  const failures = Object.entries(residuals).filter(([, residual]) => Math.abs(residual) > allowed);
  if (failures.length > 0) {
    throw new Error(
      `${context}: ${failures.map(([id, residual]) => `${id}=${residual}`).join(', ')}`,
    );
  }
}

export function createGodleyLedger(
  definition: GodleyLedgerDefinition,
  balances: Readonly<Record<string, number>>,
  step = 0,
): GodleyLedgerState {
  const checked = defineGodleyLedger(definition);
  if (!Number.isInteger(step)) throw new Error('Godley ledger step must be an integer');
  const complete = completeBalances(checked, balances);
  assertResiduals(
    godleySectorResiduals(checked, complete),
    tolerance(checked),
    'Opening Godley sector balance-sheet residual',
  );
  assertResiduals(
    godleyInstrumentResiduals(checked, complete),
    tolerance(checked),
    'Opening Godley instrument residual',
  );
  return {
    definitionId: checked.id,
    step,
    balances: Object.freeze(complete),
  };
}

export function postGodleyTransactions(
  definition: GodleyLedgerDefinition,
  state: GodleyLedgerState,
  transactions: readonly GodleyTransaction[],
): GodleyPostingResult {
  const checked = defineGodleyLedger(definition);
  if (state.definitionId !== checked.id) {
    throw new Error(
      `Godley state belongs to '${state.definitionId}', not ledger '${checked.id}'`,
    );
  }
  const openingBalances = completeBalances(checked, state.balances);
  const openingSectorResiduals = godleySectorResiduals(checked, openingBalances);
  const openingInstrumentResiduals = godleyInstrumentResiduals(checked, openingBalances);
  assertResiduals(
    openingSectorResiduals,
    tolerance(checked),
    'Opening Godley sector balance-sheet residual',
  );
  assertResiduals(
    openingInstrumentResiduals,
    tolerance(checked),
    'Opening Godley instrument residual',
  );

  const accounts = accountMap(checked);
  const transactionIds = new Set<string>();
  const flowsByAccount: Record<string, number> = Object.fromEntries(
    checked.accounts.map((account) => [account.id, 0]),
  );
  const transactionReports: GodleyTransactionReport[] = [];

  for (const transaction of transactions) {
    assertIdentifier(transaction.id, 'Godley transaction id');
    if (transactionIds.has(transaction.id)) {
      throw new Error(`Duplicate Godley transaction id '${transaction.id}'`);
    }
    transactionIds.add(transaction.id);
    assertIdentifier(transaction.description, `Godley transaction '${transaction.id}' description`);
    if (transaction.entries.length === 0) {
      throw new Error(`Godley transaction '${transaction.id}' requires at least one entry`);
    }

    const changes: Record<string, number> = {};
    for (const entry of transaction.entries) {
      const account = accounts.get(entry.accountId);
      if (!account) {
        throw new Error(
          `Godley transaction '${transaction.id}' references unknown account '${entry.accountId}'`,
        );
      }
      if (!Number.isFinite(entry.change)) {
        throw new Error(
          `Godley transaction '${transaction.id}' entry '${entry.accountId}' must be finite`,
        );
      }
      changes[entry.accountId] = (changes[entry.accountId] ?? 0) + entry.change;
    }

    const sectorResiduals: Record<string, number> = Object.fromEntries(
      sectors(checked).map((sector) => [sector, 0]),
    );
    let globalResidual = 0;
    for (const [accountId, change] of Object.entries(changes)) {
      const account = accounts.get(accountId);
      if (!account) continue;
      const signedChange = kindSign(account.kind) * change;
      sectorResiduals[account.sector] += signedChange;
      globalResidual += signedChange;
      flowsByAccount[accountId] += change;
    }
    assertResiduals(
      { global: globalResidual, ...sectorResiduals },
      tolerance(checked),
      `Unbalanced Godley transaction '${transaction.id}'`,
    );
    transactionReports.push({
      id: transaction.id,
      description: transaction.description,
      changes: Object.freeze(changes),
      globalResidual,
      sectorResiduals: Object.freeze(sectorResiduals),
    });
  }

  const provisionalClosing = Object.fromEntries(
    checked.accounts.map((account) => [
      account.id,
      openingBalances[account.id] + flowsByAccount[account.id],
    ]),
  );
  const closingBalances = completeBalances(checked, provisionalClosing);
  const closingSectorResiduals = godleySectorResiduals(checked, closingBalances);
  const closingInstrumentResiduals = godleyInstrumentResiduals(checked, closingBalances);
  const stockTransitionResiduals = Object.fromEntries(
    checked.accounts.map((account) => [
      account.id,
      closingBalances[account.id] - openingBalances[account.id] - flowsByAccount[account.id],
    ]),
  );
  const maxResidual = maxAbsolute([
    openingSectorResiduals,
    closingSectorResiduals,
    openingInstrumentResiduals,
    closingInstrumentResiduals,
    stockTransitionResiduals,
    ...transactionReports.map((transaction) => transaction.sectorResiduals),
  ]);
  const balanced = maxResidual <= tolerance(checked);
  if (!balanced) {
    throw new Error(`Godley ledger failed to close; maximum residual is ${maxResidual}`);
  }

  const nextState: GodleyLedgerState = {
    definitionId: checked.id,
    step: state.step + 1,
    balances: Object.freeze(closingBalances),
  };
  return {
    state: nextState,
    report: {
      definitionId: checked.id,
      openingStep: state.step,
      closingStep: nextState.step,
      openingBalances: Object.freeze(openingBalances),
      closingBalances: nextState.balances,
      flowsByAccount: Object.freeze(flowsByAccount),
      transactions: Object.freeze(transactionReports),
      openingSectorResiduals: Object.freeze(openingSectorResiduals),
      closingSectorResiduals: Object.freeze(closingSectorResiduals),
      openingInstrumentResiduals: Object.freeze(openingInstrumentResiduals),
      closingInstrumentResiduals: Object.freeze(closingInstrumentResiduals),
      stockTransitionResiduals: Object.freeze(stockTransitionResiduals),
      maxResidual,
      balanced,
    },
  };
}

function markdownCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function formatNumber(value: number, digits: number): string {
  if (Math.abs(value) < 10 ** -(digits + 1)) return '0';
  const fixed = value.toFixed(digits);
  return digits === 0 ? fixed : fixed.replace(/0+$/, '').replace(/\.$/, '');
}

/** Render a report as a transaction-flow matrix with account columns. */
export function renderGodleyTableMarkdown(
  definition: GodleyLedgerDefinition,
  report: GodleyLedgerReport,
  digits = 3,
): string {
  const headers = ['Transaction', ...definition.accounts.map((account) => account.id), 'Residual'];
  const separator = headers.map(() => '---');
  const rows = report.transactions.map((transaction) => [
    markdownCell(transaction.description),
    ...definition.accounts.map((account) =>
      formatNumber(transaction.changes[account.id] ?? 0, digits)),
    formatNumber(transaction.globalResidual, digits),
  ]);
  rows.push([
    'Opening balance',
    ...definition.accounts.map((account) =>
      formatNumber(report.openingBalances[account.id] ?? 0, digits)),
    '',
  ]);
  rows.push([
    'Closing balance',
    ...definition.accounts.map((account) =>
      formatNumber(report.closingBalances[account.id] ?? 0, digits)),
    formatNumber(report.maxResidual, digits),
  ]);
  return [
    `| ${headers.map(markdownCell).join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function mermaidId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Render sector-to-transaction incidence as a Mermaid flowchart. */
export function renderGodleyMermaid(
  definition: GodleyLedgerDefinition,
  report: GodleyLedgerReport,
): string {
  const lines = ['flowchart LR'];
  for (const sector of sectors(definition)) {
    lines.push(`  sector_${mermaidId(sector)}["${sector}"]`);
  }
  for (const transaction of report.transactions) {
    const transactionId = `tx_${mermaidId(transaction.id)}`;
    lines.push(`  ${transactionId}(("${transaction.description.replaceAll('"', "'")}"))`);
    for (const sector of sectors(definition)) {
      const accounts = definition.accounts.filter((account) => account.sector === sector);
      const grossChange = accounts.reduce(
        (sum, account) => sum + Math.abs(transaction.changes[account.id] ?? 0),
        0,
      );
      if (grossChange > tolerance(definition)) {
        lines.push(`  sector_${mermaidId(sector)} --- ${transactionId}`);
      }
    }
  }
  return lines.join('\n');
}

import {
  createGodleyLedger,
  defineGodleyLedger,
  postGodleyTransactions,
  type GodleyLedgerState,
  type GodleyPostingResult,
  type GodleyTransaction,
} from 'tsimulation';

/**
 * Consolidated toy balance sheet for the OLG capital/debt block.
 *
 * Productive capital here is the module's general-capital stock. Specialized
 * energy, CDR, robot, and data-center physical stocks remain in their owner
 * modules and are not silently claimed as covered by this ledger.
 */
export const capitalGodleyDefinition = defineGodleyLedger({
  id: 'global-olg-capital-finance',
  version: '1.0.0',
  description: 'Consolidated general-capital, banking, and public-debt balance sheet',
  unit: '$T',
  tolerance: 1e-8,
  accounts: [
    {
      id: 'households.deposits',
      sector: 'households',
      kind: 'asset',
      instrument: 'bank-deposits',
    },
    {
      id: 'households.publicBonds',
      sector: 'households',
      kind: 'asset',
      instrument: 'public-debt',
    },
    { id: 'households.netWorth', sector: 'households', kind: 'equity' },

    {
      id: 'firms.deposits',
      sector: 'firms',
      kind: 'asset',
      instrument: 'bank-deposits',
    },
    { id: 'firms.generalCapital', sector: 'firms', kind: 'asset' },
    {
      id: 'firms.privateLoans',
      sector: 'firms',
      kind: 'liability',
      instrument: 'private-loans',
    },
    { id: 'firms.netWorth', sector: 'firms', kind: 'equity' },

    {
      id: 'banks.privateLoans',
      sector: 'banks',
      kind: 'asset',
      instrument: 'private-loans',
    },
    {
      id: 'banks.publicBonds',
      sector: 'banks',
      kind: 'asset',
      instrument: 'public-debt',
    },
    {
      id: 'banks.reserves',
      sector: 'banks',
      kind: 'asset',
      instrument: 'central-bank-reserves',
    },
    {
      id: 'banks.deposits',
      sector: 'banks',
      kind: 'liability',
      instrument: 'bank-deposits',
    },
    { id: 'banks.netWorth', sector: 'banks', kind: 'equity' },

    {
      id: 'government.deposits',
      sector: 'government',
      kind: 'asset',
      instrument: 'bank-deposits',
    },
    {
      id: 'government.publicDebt',
      sector: 'government',
      kind: 'liability',
      instrument: 'public-debt',
    },
    { id: 'government.netWorth', sector: 'government', kind: 'equity' },

    {
      id: 'centralBank.reserveLiability',
      sector: 'central-bank',
      kind: 'liability',
      instrument: 'central-bank-reserves',
    },
    {
      id: 'centralBank.netWorth',
      sector: 'central-bank',
      kind: 'equity',
      allowNegative: true,
    },
  ],
});

export interface CapitalGodleyOpening {
  capitalStock: number;
  privateDebt: number;
  publicDebt: number;
  bankEquityRatio: number;
  /** Share of the opening deposit stock held by households rather than firms. */
  householdDepositShare?: number;
  step?: number;
}

export function createCapitalGodleyLedger(
  opening: CapitalGodleyOpening,
): GodleyLedgerState {
  const householdDepositShare = opening.householdDepositShare ?? 0.5;
  if (
    !Number.isFinite(householdDepositShare)
    || householdDepositShare < 0
    || householdDepositShare > 1
  ) {
    throw new Error('householdDepositShare must be between 0 and 1');
  }
  const householdDeposits = opening.privateDebt * householdDepositShare;
  const firmDeposits = opening.privateDebt - householdDeposits;
  const reserveAndEquity = opening.privateDebt
    * opening.bankEquityRatio
    / Math.max(Number.EPSILON, 1 - opening.bankEquityRatio);
  return createGodleyLedger(
    capitalGodleyDefinition,
    {
      'households.deposits': householdDeposits,
      'households.publicBonds': opening.publicDebt,
      'households.netWorth': opening.publicDebt + householdDeposits,
      'firms.deposits': firmDeposits,
      'firms.generalCapital': opening.capitalStock,
      'firms.privateLoans': opening.privateDebt,
      'firms.netWorth': opening.capitalStock - householdDeposits,
      'banks.privateLoans': opening.privateDebt,
      'banks.reserves': reserveAndEquity,
      'banks.deposits': opening.privateDebt,
      'banks.netWorth': reserveAndEquity,
      'government.publicDebt': opening.publicDebt,
      'government.netWorth': -opening.publicDebt,
      'centralBank.reserveLiability': reserveAndEquity,
      'centralBank.netWorth': -reserveAndEquity,
    },
    opening.step ?? 0,
  );
}

export interface CapitalGodleyFlows {
  depreciation: number;
  generalInvestment: number;
  laborCompensation: number;
  householdConsumption: number;
  grossLoanOriginations: number;
  principalRepayments: number;
  loanWriteOffs: number;
  privateInterestPayments: number;
  firmDividendPayments: number;
  bankDividendPayments: number;
  publicDebtChange: number;
  governmentServiceConsumption: number;
  pensionTransfers: number;
  publicInterestPayments: number;
  publicInterestToBanks: number;
  netTaxes: number;
}

function balanceSheetChange(
  id: string,
  description: string,
  entries: GodleyTransaction['entries'],
): GodleyTransaction {
  return { id, description, entries };
}

export function postCapitalGodleyYear(
  state: GodleyLedgerState,
  flows: CapitalGodleyFlows,
): GodleyPostingResult {
  if (
    flows.publicInterestToBanks < 0
    || flows.publicInterestToBanks > flows.publicInterestPayments
  ) {
    throw new Error(
      'publicInterestToBanks must be between zero and total publicInterestPayments',
    );
  }
  // New public debt is purchased by banks through matching deposit creation,
  // rather than being forced onto households as if their prior saving were a
  // funding prerequisite. When debt is retired, bank-held bonds are redeemed
  // first and any remainder is redeemed from households.
  const publicDebtIssuance = Math.max(0, flows.publicDebtChange);
  const publicDebtRetirement = Math.max(0, -flows.publicDebtChange);
  const bankDebtRetirement = Math.min(
    publicDebtRetirement,
    state.balances['banks.publicBonds'] ?? 0,
  );
  const householdDebtRetirement =
    publicDebtRetirement - bankDebtRetirement;
  const bankPublicDebtChange =
    publicDebtIssuance - bankDebtRetirement;
  const householdPublicDebtChange = -householdDebtRetirement;
  const householdCurrentSaving =
    flows.laborCompensation
    + flows.firmDividendPayments
    + flows.bankDividendPayments
    + flows.governmentServiceConsumption
    + flows.pensionTransfers
    + (flows.publicInterestPayments - flows.publicInterestToBanks)
    - flows.householdConsumption
    - flows.netTaxes;
  const householdDepositsBeforeAssetSale =
    (state.balances['households.deposits'] ?? 0)
    + householdCurrentSaving
    - householdPublicDebtChange;
  const householdBondsAfterRedemption =
    (state.balances['households.publicBonds'] ?? 0)
    + householdPublicDebtChange;
  const householdBondSale = Math.min(
    Math.max(0, -householdDepositsBeforeAssetSale),
    Math.max(0, householdBondsAfterRedemption),
  );

  return postGodleyTransactions(capitalGodleyDefinition, state, [
    balanceSheetChange('depreciation', 'General-capital depreciation', [
      { accountId: 'firms.generalCapital', change: -flows.depreciation },
      { accountId: 'firms.netWorth', change: -flows.depreciation },
    ]),
    balanceSheetChange('capital-formation', 'General-capital formation', [
      { accountId: 'firms.generalCapital', change: flows.generalInvestment },
      { accountId: 'firms.netWorth', change: flows.generalInvestment },
    ]),
    balanceSheetChange('loan-originations', 'Gross bank-loan originations', [
      { accountId: 'firms.deposits', change: flows.grossLoanOriginations },
      { accountId: 'firms.privateLoans', change: flows.grossLoanOriginations },
      { accountId: 'banks.privateLoans', change: flows.grossLoanOriginations },
      { accountId: 'banks.deposits', change: flows.grossLoanOriginations },
    ]),
    balanceSheetChange('principal-repayments', 'Private-loan principal repayments', [
      { accountId: 'firms.deposits', change: -flows.principalRepayments },
      { accountId: 'firms.privateLoans', change: -flows.principalRepayments },
      { accountId: 'banks.privateLoans', change: -flows.principalRepayments },
      { accountId: 'banks.deposits', change: -flows.principalRepayments },
    ]),
    balanceSheetChange('loan-writeoffs', 'Private-loan write-offs', [
      { accountId: 'firms.privateLoans', change: -flows.loanWriteOffs },
      { accountId: 'firms.netWorth', change: flows.loanWriteOffs },
      { accountId: 'banks.privateLoans', change: -flows.loanWriteOffs },
      { accountId: 'banks.netWorth', change: -flows.loanWriteOffs },
    ]),
    balanceSheetChange('labor-compensation', 'Firms pay labor compensation', [
      { accountId: 'firms.deposits', change: -flows.laborCompensation },
      { accountId: 'firms.netWorth', change: -flows.laborCompensation },
      { accountId: 'households.deposits', change: flows.laborCompensation },
      { accountId: 'households.netWorth', change: flows.laborCompensation },
    ]),
    balanceSheetChange('household-consumption', 'Households purchase firm output', [
      { accountId: 'households.deposits', change: -flows.householdConsumption },
      { accountId: 'households.netWorth', change: -flows.householdConsumption },
      { accountId: 'firms.deposits', change: flows.householdConsumption },
      { accountId: 'firms.netWorth', change: flows.householdConsumption },
    ]),
    balanceSheetChange('private-interest', 'Firms pay interest on bank loans', [
      { accountId: 'firms.deposits', change: -flows.privateInterestPayments },
      { accountId: 'firms.netWorth', change: -flows.privateInterestPayments },
      { accountId: 'banks.deposits', change: -flows.privateInterestPayments },
      { accountId: 'banks.netWorth', change: flows.privateInterestPayments },
    ]),
    balanceSheetChange('firm-dividends', 'Firms distribute profits to households', [
      { accountId: 'firms.deposits', change: -flows.firmDividendPayments },
      { accountId: 'firms.netWorth', change: -flows.firmDividendPayments },
      { accountId: 'households.deposits', change: flows.firmDividendPayments },
      { accountId: 'households.netWorth', change: flows.firmDividendPayments },
    ]),
    balanceSheetChange('bank-dividends', 'Banks distribute interest income to households', [
      { accountId: 'banks.deposits', change: flows.bankDividendPayments },
      { accountId: 'banks.netWorth', change: -flows.bankDividendPayments },
      { accountId: 'households.deposits', change: flows.bankDividendPayments },
      { accountId: 'households.netWorth', change: flows.bankDividendPayments },
    ]),
    balanceSheetChange('household-bond-sale', 'Households sell public bonds to fund dissaving', [
      { accountId: 'households.publicBonds', change: -householdBondSale },
      { accountId: 'households.deposits', change: householdBondSale },
      { accountId: 'banks.publicBonds', change: householdBondSale },
      { accountId: 'banks.deposits', change: householdBondSale },
    ]),
    balanceSheetChange('net-taxes', 'Net taxes paid by households', [
      { accountId: 'households.deposits', change: -flows.netTaxes },
      { accountId: 'households.netWorth', change: -flows.netTaxes },
      { accountId: 'government.deposits', change: flows.netTaxes },
      { accountId: 'government.netWorth', change: flows.netTaxes },
    ]),
    balanceSheetChange('government-services', 'Government purchases of services', [
      {
        accountId: 'government.deposits',
        change: -flows.governmentServiceConsumption,
      },
      {
        accountId: 'government.netWorth',
        change: -flows.governmentServiceConsumption,
      },
      {
        accountId: 'households.deposits',
        change: flows.governmentServiceConsumption,
      },
      {
        accountId: 'households.netWorth',
        change: flows.governmentServiceConsumption,
      },
    ]),
    balanceSheetChange('pension-transfers', 'Cash pension transfers', [
      { accountId: 'government.deposits', change: -flows.pensionTransfers },
      { accountId: 'government.netWorth', change: -flows.pensionTransfers },
      { accountId: 'households.deposits', change: flows.pensionTransfers },
      { accountId: 'households.netWorth', change: flows.pensionTransfers },
    ]),
    balanceSheetChange('household-public-interest', 'Interest paid to household bondholders', [
      {
        accountId: 'government.deposits',
        change: -(flows.publicInterestPayments - flows.publicInterestToBanks),
      },
      {
        accountId: 'government.netWorth',
        change: -(flows.publicInterestPayments - flows.publicInterestToBanks),
      },
      {
        accountId: 'households.deposits',
        change: flows.publicInterestPayments - flows.publicInterestToBanks,
      },
      {
        accountId: 'households.netWorth',
        change: flows.publicInterestPayments - flows.publicInterestToBanks,
      },
    ]),
    balanceSheetChange('bank-public-interest', 'Interest paid to bank bondholders', [
      { accountId: 'government.deposits', change: -flows.publicInterestToBanks },
      { accountId: 'government.netWorth', change: -flows.publicInterestToBanks },
      { accountId: 'banks.deposits', change: -flows.publicInterestToBanks },
      { accountId: 'banks.netWorth', change: flows.publicInterestToBanks },
    ]),
    balanceSheetChange('bank-public-debt', 'Bank purchase or redemption of public bonds', [
      { accountId: 'government.deposits', change: bankPublicDebtChange },
      { accountId: 'government.publicDebt', change: bankPublicDebtChange },
      { accountId: 'banks.publicBonds', change: bankPublicDebtChange },
      { accountId: 'banks.deposits', change: bankPublicDebtChange },
    ]),
    balanceSheetChange('household-public-debt', 'Household public-bond redemption', [
      { accountId: 'government.deposits', change: householdPublicDebtChange },
      { accountId: 'government.publicDebt', change: householdPublicDebtChange },
      { accountId: 'households.deposits', change: -householdPublicDebtChange },
      { accountId: 'households.publicBonds', change: householdPublicDebtChange },
    ]),
  ]);
}

export function capitalBankCapitalRatio(state: GodleyLedgerState): number {
  const assets =
    (state.balances['banks.privateLoans'] ?? 0)
    + (state.balances['banks.publicBonds'] ?? 0)
    + (state.balances['banks.reserves'] ?? 0);
  return assets > 0 ? (state.balances['banks.netWorth'] ?? 0) / assets : 0;
}

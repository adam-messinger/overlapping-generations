export const SOVEREIGN_MARKETS = ['treasury', 'gilt', 'jgb'] as const;
export type SovereignMarketId = (typeof SOVEREIGN_MARKETS)[number];

export interface SovereignMarket {
  id: SovereignMarketId;
  label: string;
  /** Basis points of additional yield per $bn-equivalent net forced sale. */
  baseMarketImpactBpsPerBillion: number;
  dealerCapacityBillion: number;
  nonlinearImpact: number;
  bankExposureShareOfTier1: number;
  bankPortfolioDuration: number;
  recognizedMarkToMarketShare: number;
}

export interface LeveragedFundGroup {
  id: string;
  label: string;
  marginCallBillionPer100Bps: Record<SovereignMarketId, number>;
  exogenousFundingCallBillion: number;
  cashAndEligibleCollateralBillion: number;
  maxLiquidationBillion: number;
  liquidationWeights: Record<SovereignMarketId, number>;
  bankGapLossShare: number;
}

export interface ContagionPolicy {
  id: string;
  label: string;
  fundMarginCallMultiplier: number;
  fundingCallMultiplier: number;
  liquidityBufferMultiplier: number;
  marketImpactMultiplier: number;
  centralBankBackstopBillion: Record<SovereignMarketId, number>;
}

export interface SovereignShockScenario {
  id: string;
  label: string;
  fundamentalYieldShockBps: Record<SovereignMarketId, number>;
}

export const sovereignMarkets2026: readonly SovereignMarket[] = [
  {
    id: 'treasury',
    label: 'U.S. Treasuries',
    baseMarketImpactBpsPerBillion: 0.12,
    dealerCapacityBillion: 250,
    nonlinearImpact: 1,
    bankExposureShareOfTier1: 0.50,
    bankPortfolioDuration: 5.5,
    recognizedMarkToMarketShare: 0.25,
  },
  {
    id: 'gilt',
    label: 'UK gilts',
    baseMarketImpactBpsPerBillion: 0.60,
    dealerCapacityBillion: 40,
    nonlinearImpact: 1,
    bankExposureShareOfTier1: 0.20,
    bankPortfolioDuration: 7,
    recognizedMarkToMarketShare: 0.25,
  },
  {
    id: 'jgb',
    label: 'Japanese government bonds',
    baseMarketImpactBpsPerBillion: 0.35,
    dealerCapacityBillion: 80,
    nonlinearImpact: 1,
    bankExposureShareOfTier1: 0.30,
    bankPortfolioDuration: 6.5,
    recognizedMarkToMarketShare: 0.25,
  },
];

export const leveragedFunds2026: readonly LeveragedFundGroup[] = [
  {
    id: 'global-relative-value',
    label: 'Global sovereign relative-value hedge funds',
    marginCallBillionPer100Bps: { treasury: 75, gilt: 10, jgb: 20 },
    exogenousFundingCallBillion: 20,
    cashAndEligibleCollateralBillion: 15,
    maxLiquidationBillion: 500,
    liquidationWeights: { treasury: 0.60, gilt: 0.15, jgb: 0.25 },
    bankGapLossShare: 0.025,
  },
  {
    id: 'pension-insurer-duration',
    label: 'Post-reform pension and insurer duration hedges',
    marginCallBillionPer100Bps: { treasury: 10, gilt: 50, jgb: 20 },
    exogenousFundingCallBillion: 0,
    cashAndEligibleCollateralBillion: 130,
    maxLiquidationBillion: 350,
    liquidationWeights: { treasury: 0.20, gilt: 0.50, jgb: 0.30 },
    bankGapLossShare: 0.01,
  },
];

export const contagionPolicies: Record<string, ContagionPolicy> = {
  current: {
    id: 'current',
    label: 'Current structure',
    fundMarginCallMultiplier: 1,
    fundingCallMultiplier: 1,
    liquidityBufferMultiplier: 1,
    marketImpactMultiplier: 1,
    centralBankBackstopBillion: { treasury: 0, gilt: 0, jgb: 0 },
  },
  safeguards: {
    id: 'safeguards',
    label: 'Minimum haircuts, central clearing, and larger liquidity buffers',
    fundMarginCallMultiplier: 0.75,
    fundingCallMultiplier: 0.35,
    liquidityBufferMultiplier: 1.50,
    marketImpactMultiplier: 0.75,
    centralBankBackstopBillion: { treasury: 0, gilt: 0, jgb: 0 },
  },
  'thin-liquidity': {
    id: 'thin-liquidity',
    label: 'Dealer balance sheets already constrained',
    fundMarginCallMultiplier: 1,
    fundingCallMultiplier: 1.50,
    liquidityBufferMultiplier: 0.85,
    marketImpactMultiplier: 1.25,
    centralBankBackstopBillion: { treasury: 0, gilt: 0, jgb: 0 },
  },
  backstop: {
    id: 'backstop',
    label: 'Temporary targeted central-bank backstops',
    fundMarginCallMultiplier: 1,
    fundingCallMultiplier: 1,
    liquidityBufferMultiplier: 1,
    marketImpactMultiplier: 1,
    centralBankBackstopBillion: { treasury: 100, gilt: 20, jgb: 30 },
  },
};

export const sovereignShockScenarios: Record<string, SovereignShockScenario> = {
  'uk-100bp': {
    id: 'uk-100bp',
    label: '100bp UK fiscal repricing',
    fundamentalYieldShockBps: { treasury: 0, gilt: 100, jgb: 0 },
  },
  'global-100bp': {
    id: 'global-100bp',
    label: 'Synchronous 100bp global inflation repricing',
    fundamentalYieldShockBps: { treasury: 100, gilt: 100, jgb: 100 },
  },
  'global-200bp': {
    id: 'global-200bp',
    label: 'Severe synchronous 200bp repricing',
    fundamentalYieldShockBps: { treasury: 200, gilt: 200, jgb: 200 },
  },
  'japan-150bp': {
    id: 'japan-150bp',
    label: '150bp JGB shock with modest global spillover',
    fundamentalYieldShockBps: { treasury: 20, gilt: 20, jgb: 150 },
  },
};

export const financialContagionEvidence = {
  uk2022: {
    fundamentalShockBps: 70,
    observedPeakShockBps: 140,
    collateralCallsBillionGbp: 70,
    forcedGiltSalesBillionGbp: 36,
    centralBankPurchasesBillionGbp: 19.3,
    interventionDays: 13,
    postReformMinimumBufferBps: 250,
  },
  current: {
    nbfiShareOfAdvancedEconomySovereignDebt: 0.53,
    centralBankShareOfAdvancedEconomySovereignDebt: 0.17,
    zeroHaircutShareOfBilateralUsdHedgeFundRepo: 0.70,
    giltRepoBorrowingBillionGbpBefore2026Deleveraging: 100,
    giltRepoBorrowingDecline: 0.40,
  },
  sources: {
    bis2026: 'https://www.bis.org/publ/arpdf/ar2026e2.htm',
    boe2026: 'https://www.bankofengland.co.uk/financial-stability-report/2026/july-2026',
    boe2022: 'https://www.bankofengland.co.uk/financial-stability-report/2022/december-2022',
    boeIntervention: 'https://www.bankofengland.co.uk/quarterly-bulletin/2023/2023/financial-stability-buy-sell-tools-a-gilt-market-case-study',
    boeAnatomy: 'https://www.bankofengland.co.uk/working-paper/2023/an-anatomy-of-the-2022-gilt-market-crisis',
    fsbLeverage: 'https://www.fsb.org/2025/07/leverage-in-nonbank-financial-intermediation-final-report/',
  },
} as const;

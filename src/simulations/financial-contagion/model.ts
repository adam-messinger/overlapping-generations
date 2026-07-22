import {
  SOVEREIGN_MARKETS,
  type ContagionPolicy,
  type LeveragedFundGroup,
  type SovereignMarket,
  type SovereignMarketId,
  type SovereignShockScenario,
} from './data.js';

export interface FundStressResult {
  fund: string;
  marginAndFundingCallBillion: number;
  availableLiquidityBillion: number;
  forcedSalesBillion: number;
  salesByMarket: Record<SovereignMarketId, number>;
  exhaustedLiquidationCapacity: boolean;
}

export interface SovereignMarketStressResult {
  market: SovereignMarketId;
  fundamentalShockBps: number;
  amplifiedShockBps: number;
  amplificationBps: number;
  grossForcedSalesBillion: number;
  centralBankPurchasesBillion: number;
  netMarketSalesBillion: number;
}

export interface FinancialContagionResult {
  scenario: SovereignShockScenario;
  policy: ContagionPolicy;
  converged: boolean;
  iterations: number;
  markets: readonly SovereignMarketStressResult[];
  funds: readonly FundStressResult[];
  totalForcedSalesBillion: number;
  totalCentralBankPurchasesBillion: number;
  dealerCounterpartyLossBillion: number;
  bankTier1CapitalHit: number;
  crossMarketSpilloverBps: number;
  /** At least one fund has sold every asset this toy balance sheet permits. */
  liquidationCapacityExhausted: boolean;
}

const emptyMarketRecord = (): Record<SovereignMarketId, number> => ({
  treasury: 0,
  gilt: 0,
  jgb: 0,
});

function calculateFundStress(
  fund: LeveragedFundGroup,
  yields: Record<SovereignMarketId, number>,
  policy: ContagionPolicy,
): FundStressResult {
  let call = fund.exogenousFundingCallBillion * policy.fundingCallMultiplier;
  for (const market of SOVEREIGN_MARKETS) {
    call += fund.marginCallBillionPer100Bps[market] *
      Math.max(0, yields[market]) / 100 * policy.fundMarginCallMultiplier;
  }
  const availableLiquidityBillion = fund.cashAndEligibleCollateralBillion *
    policy.liquidityBufferMultiplier;
  const requiredSales = Math.max(0, call - availableLiquidityBillion);
  const forcedSalesBillion = Math.min(fund.maxLiquidationBillion, requiredSales);
  const salesByMarket = emptyMarketRecord();
  for (const market of SOVEREIGN_MARKETS) {
    salesByMarket[market] = forcedSalesBillion * fund.liquidationWeights[market];
  }
  return {
    fund: fund.id,
    marginAndFundingCallBillion: call,
    availableLiquidityBillion,
    forcedSalesBillion,
    salesByMarket,
    exhaustedLiquidationCapacity: requiredSales > fund.maxLiquidationBillion - 1e-9,
  };
}

export function simulateFinancialContagion(
  scenario: SovereignShockScenario,
  policy: ContagionPolicy,
  markets: readonly SovereignMarket[],
  funds: readonly LeveragedFundGroup[],
  options: { maxIterations?: number; toleranceBps?: number; bankTier1Billion?: number } = {},
): FinancialContagionResult {
  const maxIterations = options.maxIterations ?? 2_000;
  const toleranceBps = options.toleranceBps ?? 1e-6;
  const bankTier1Billion = options.bankTier1Billion ?? 2_500;
  let yields = { ...scenario.fundamentalYieldShockBps };
  let fundResults = funds.map((fund) => calculateFundStress(fund, yields, policy));
  let converged = false;
  let iterations = 0;

  for (iterations = 1; iterations <= maxIterations; iterations++) {
    fundResults = funds.map((fund) => calculateFundStress(fund, yields, policy));
    const next = emptyMarketRecord();
    for (const market of markets) {
      const grossSales = fundResults.reduce(
        (sum, fund) => sum + fund.salesByMarket[market.id],
        0,
      );
      const backstop = Math.min(grossSales, policy.centralBankBackstopBillion[market.id]);
      const netSales = Math.max(0, grossSales - backstop);
      const liquidityPenalty = 1 + market.nonlinearImpact *
        netSales / Math.max(1, market.dealerCapacityBillion);
      const amplification = market.baseMarketImpactBpsPerBillion *
        policy.marketImpactMultiplier * netSales * liquidityPenalty;
      next[market.id] = scenario.fundamentalYieldShockBps[market.id] + amplification;
    }
    const maxDifference = Math.max(
      ...SOVEREIGN_MARKETS.map((market) => Math.abs(next[market] - yields[market])),
    );
    // Damping avoids numerical oscillation around collateral thresholds.
    for (const market of SOVEREIGN_MARKETS) yields[market] = 0.5 * yields[market] + 0.5 * next[market];
    if (maxDifference < toleranceBps) {
      yields = next;
      converged = true;
      break;
    }
  }

  fundResults = funds.map((fund) => calculateFundStress(fund, yields, policy));
  const marketResults: SovereignMarketStressResult[] = markets.map((market) => {
    const grossForcedSalesBillion = fundResults.reduce(
      (sum, fund) => sum + fund.salesByMarket[market.id],
      0,
    );
    const centralBankPurchasesBillion = Math.min(
      grossForcedSalesBillion,
      policy.centralBankBackstopBillion[market.id],
    );
    return {
      market: market.id,
      fundamentalShockBps: scenario.fundamentalYieldShockBps[market.id],
      amplifiedShockBps: yields[market.id],
      amplificationBps: yields[market.id] - scenario.fundamentalYieldShockBps[market.id],
      grossForcedSalesBillion,
      centralBankPurchasesBillion,
      netMarketSalesBillion: grossForcedSalesBillion - centralBankPurchasesBillion,
    };
  });
  const totalForcedSalesBillion = fundResults.reduce(
    (sum, fund) => sum + fund.forcedSalesBillion,
    0,
  );
  const dealerCounterpartyLossBillion = fundResults.reduce((sum, fundResult, index) => {
    const source = funds[index];
    const stressScale = 1 + Math.max(...SOVEREIGN_MARKETS.map((m) => yields[m])) / 500;
    return sum + fundResult.forcedSalesBillion * source.bankGapLossShare * stressScale;
  }, 0);
  const directBankMarkToMarket = markets.reduce((sum, market) => {
    const priceLoss = market.bankPortfolioDuration * yields[market.id] / 10_000;
    return sum + market.bankExposureShareOfTier1 * priceLoss *
      market.recognizedMarkToMarketShare;
  }, 0);
  const bankTier1CapitalHit = directBankMarkToMarket +
    dealerCounterpartyLossBillion / bankTier1Billion;
  const crossMarketSpilloverBps = marketResults
    .filter((row) => row.fundamentalShockBps === 0)
    .reduce((sum, row) => sum + row.amplificationBps, 0);

  return {
    scenario,
    policy,
    converged,
    iterations,
    markets: marketResults,
    funds: fundResults,
    totalForcedSalesBillion,
    totalCentralBankPurchasesBillion: marketResults.reduce(
      (sum, market) => sum + market.centralBankPurchasesBillion,
      0,
    ),
    dealerCounterpartyLossBillion,
    bankTier1CapitalHit,
    crossMarketSpilloverBps,
    liquidationCapacityExhausted: fundResults.some((fund) => fund.exhaustedLiquidationCapacity),
  };
}

import {
  financialContagionEvidence,
  type ContagionPolicy,
  type LeveragedFundGroup,
  type SovereignMarket,
  type SovereignShockScenario,
} from './data.js';
import { simulateFinancialContagion } from './model.js';

const e = financialContagionEvidence.uk2022;

const uk2022Shock: SovereignShockScenario = {
  id: 'uk-ldi-2022',
  label: 'September 2022 UK LDI episode',
  fundamentalYieldShockBps: { treasury: 0, gilt: e.fundamentalShockBps, jgb: 0 },
};

const uk2022Policy: ContagionPolicy = {
  id: 'pre-reform',
  label: 'Pre-reform LDI structure',
  fundMarginCallMultiplier: 1,
  fundingCallMultiplier: 1,
  liquidityBufferMultiplier: 1,
  marketImpactMultiplier: 1,
  centralBankBackstopBillion: { treasury: 0, gilt: 0, jgb: 0 },
};

const callPer100 = e.collateralCallsBillionGbp / (e.observedPeakShockBps / 100);
const liquidity = e.collateralCallsBillionGbp - e.forcedGiltSalesBillionGbp;
const fittedImpact = (e.observedPeakShockBps - e.fundamentalShockBps) /
  e.forcedGiltSalesBillionGbp;

const uk2022Market: SovereignMarket = {
  id: 'gilt',
  label: 'Long-dated gilts, September 2022',
  baseMarketImpactBpsPerBillion: fittedImpact,
  dealerCapacityBillion: 1_000_000,
  nonlinearImpact: 0,
  bankExposureShareOfTier1: 0,
  bankPortfolioDuration: 0,
  recognizedMarkToMarketShare: 0,
};

const uk2022Fund: LeveragedFundGroup = {
  id: 'pre-reform-ldi',
  label: 'Pre-reform LDI funds and pension schemes',
  marginCallBillionPer100Bps: { treasury: 0, gilt: callPer100, jgb: 0 },
  exogenousFundingCallBillion: 0,
  cashAndEligibleCollateralBillion: liquidity,
  maxLiquidationBillion: 100,
  liquidationWeights: { treasury: 0, gilt: 1, jgb: 0 },
  bankGapLossShare: 0,
};

export interface UkLdiBackcastAudit {
  v1ForcedSalesBillion: number;
  v2ForcedSalesBillion: number;
  observedForcedSalesBillion: number;
  v2PeakYieldShockBps: number;
  observedPeakYieldShockBps: number;
  fittedImpactBpsPerBillion: number;
  feedbackLoopGain: number;
}

export function auditUkLdiBackcast(): UkLdiBackcastAudit {
  const v1Calls = callPer100 * e.fundamentalShockBps / 100;
  const v1ForcedSalesBillion = Math.max(0, v1Calls - liquidity);
  const v2 = simulateFinancialContagion(
    uk2022Shock,
    uk2022Policy,
    [uk2022Market],
    [uk2022Fund],
    { maxIterations: 5_000, toleranceBps: 1e-8 },
  );
  return {
    v1ForcedSalesBillion,
    v2ForcedSalesBillion: v2.totalForcedSalesBillion,
    observedForcedSalesBillion: e.forcedGiltSalesBillionGbp,
    v2PeakYieldShockBps: v2.markets[0].amplifiedShockBps,
    observedPeakYieldShockBps: e.observedPeakShockBps,
    fittedImpactBpsPerBillion: fittedImpact,
    feedbackLoopGain: fittedImpact * callPer100 / 100,
  };
}

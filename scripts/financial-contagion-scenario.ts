import { auditUkLdiBackcast } from '../src/simulations/financial-contagion/calibration.js';
import {
  contagionPolicies,
  financialContagionEvidence,
  leveragedFunds2026,
  sovereignMarkets2026,
  sovereignShockScenarios,
} from '../src/simulations/financial-contagion/data.js';
import { simulateFinancialContagion } from '../src/simulations/financial-contagion/model.js';

const pct = (value: number): string => `${(100 * value).toFixed(2)}%`;
const shocks = ['uk-100bp', 'global-100bp', 'global-200bp', 'japan-150bp'];
const policies = ['current', 'safeguards', 'thin-liquidity', 'backstop'];

console.log('=== Sovereign–nonbank financial contagion ===\n');
const results = shocks.flatMap((shock) => policies.map((policy) => simulateFinancialContagion(
  sovereignShockScenarios[shock],
  contagionPolicies[policy],
  sovereignMarkets2026,
  leveragedFunds2026,
)));
console.table(results.map((result) => ({
  shock: result.scenario.id,
  policy: result.policy.id,
  'forced sales $bn': result.totalForcedSalesBillion.toFixed(1),
  'CB purchases $bn': result.totalCentralBankPurchasesBillion.toFixed(1),
  'UST extra bp': result.markets.find((m) => m.market === 'treasury')!.amplificationBps.toFixed(1),
  'gilt extra bp': result.markets.find((m) => m.market === 'gilt')!.amplificationBps.toFixed(1),
  'JGB extra bp': result.markets.find((m) => m.market === 'jgb')!.amplificationBps.toFixed(1),
  'bank Tier-1 hit': pct(result.bankTier1CapitalHit),
  state: result.liquidationCapacityExhausted
    ? 'resolution boundary'
    : result.converged ? 'market-clearing' : 'no convergence',
})));

console.log('\nIllustrative synchronous-shock cliff');
console.table(['current', 'safeguards', 'thin-liquidity'].map((policy) => {
  let firstResolution: number | null = null;
  for (let bps = 50; bps <= 300; bps += 10) {
    const result = simulateFinancialContagion(
      {
        id: `global-${bps}bp-scan`,
        label: `${bps}bp synchronous scan`,
        fundamentalYieldShockBps: { treasury: bps, gilt: bps, jgb: bps },
      },
      contagionPolicies[policy],
      sovereignMarkets2026,
      leveragedFunds2026,
    );
    if (result.liquidationCapacityExhausted) {
      firstResolution = bps;
      break;
    }
  }
  return {
    policy,
    'first grid point at resolution boundary': firstResolution === null ? '>300bp' : `${firstResolution}bp`,
  };
}));

const uk = results.find((row) => row.scenario.id === 'uk-100bp' && row.policy.id === 'current')!;
console.log('\nCross-market path after an isolated UK shock');
console.table(uk.markets.map((market) => ({
  market: market.market,
  'fundamental bp': market.fundamentalShockBps.toFixed(0),
  'forced sales $bn': market.grossForcedSalesBillion.toFixed(1),
  'total shock bp': market.amplifiedShockBps.toFixed(1),
})));

const audit = auditUkLdiBackcast();
console.log('\n2022 UK LDI backcast and retro');
console.table([{
  'V1 sales £bn': audit.v1ForcedSalesBillion.toFixed(1),
  'V2 sales £bn': audit.v2ForcedSalesBillion.toFixed(1),
  'observed sales £bn': audit.observedForcedSalesBillion.toFixed(1),
  'V2 peak bp': audit.v2PeakYieldShockBps.toFixed(1),
  'observed peak bp': audit.observedPeakYieldShockBps.toFixed(0),
  'feedback gain': audit.feedbackLoopGain.toFixed(3),
}]);

console.log('\nCurrent empirical anchors');
console.table([{
  'NBFI sovereign share': pct(financialContagionEvidence.current.nbfiShareOfAdvancedEconomySovereignDebt),
  'central-bank share': pct(financialContagionEvidence.current.centralBankShareOfAdvancedEconomySovereignDebt),
  'zero-haircut USD repo': pct(financialContagionEvidence.current.zeroHaircutShareOfBilateralUsdHedgeFundRepo),
  'gilt repo before £bn': financialContagionEvidence.current.giltRepoBorrowingBillionGbpBefore2026Deleveraging,
  '2026 deleveraging': pct(financialContagionEvidence.current.giltRepoBorrowingDecline),
}]);

console.log('\nInterpretation guardrails');
console.log('- This is a collateral/fire-sale stress test, not a default-probability or trading model. Dollar figures are common-currency equivalents except the labeled UK backcast.');
console.log('- The 2022 fit shows why linear, one-pass stress tests fail near a feedback gain of one; small extra sales can nearly double the yield shock.');
console.log('- Current LDI buffers make a repeat of the exact 2022 mechanism less likely, while globally overlapping hedge-fund positions create a newer cross-market channel.');
console.log('- Backstops repair market prices after forced selling starts; minimum haircuts, clearing, and liquidity buffers reduce the forced selling itself.');
console.log('- Once a fund hits its modeled liquidation cap, the printed yield is not a forecast; the state requires resolution, recapitalization, or official intervention.');

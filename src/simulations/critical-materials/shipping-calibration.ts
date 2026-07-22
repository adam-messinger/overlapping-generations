import {
  maritimeDefaults,
  maritimeObserved,
  maritimeScenarios,
  type MaritimeNetworkParams,
} from './shipping-data.js';
import { simulateMaritimeNetwork } from './shipping-network.js';

export interface MaritimeCalibrationResult {
  params: MaritimeNetworkParams;
  developmentCapeOilMbd: number;
  holdoutCapeOilMbd: number;
  holdoutAbsoluteErrorMbd: number;
  diagnosticContainerCapacityLoss: number;
  diagnosticDelayDays: number;
}

/** Fit only oilCapeRerouteShare to the 2024 EIA Cape-flow increment. */
export function calibrateMaritimeNetwork(): MaritimeCalibrationResult {
  let bestShare = maritimeDefaults.oilCapeRerouteShare;
  let bestError = Number.POSITIVE_INFINITY;
  for (let share = 0.40; share <= 0.80 + 1e-9; share += 0.005) {
    const result = simulateMaritimeNetwork(
      maritimeScenarios['red-sea-2024-development'],
      { oilCapeRerouteShare: share },
    );
    const modeled = result.annual[0].averageCapeOilFlowMbd;
    const error = Math.abs(modeled - maritimeObserved.capeOil2024Mbd);
    if (error < bestError) {
      bestError = error;
      bestShare = share;
    }
  }

  const params: MaritimeNetworkParams = {
    ...maritimeDefaults,
    oilCapeRerouteShare: bestShare,
  };
  const development = simulateMaritimeNetwork(
    maritimeScenarios['red-sea-2024-development'],
    params,
  );
  const holdout = simulateMaritimeNetwork(
    maritimeScenarios['red-sea-1h25-holdout'],
    params,
  );
  const diagnosticMonth = development.monthly[0];
  return {
    params,
    developmentCapeOilMbd: development.annual[0].averageCapeOilFlowMbd,
    holdoutCapeOilMbd: holdout.annual[0].averageCapeOilFlowMbd,
    holdoutAbsoluteErrorMbd: Math.abs(
      holdout.annual[0].averageCapeOilFlowMbd - maritimeObserved.capeOil1h25Mbd
    ),
    diagnosticContainerCapacityLoss: diagnosticMonth.containerEffectiveCapacityLoss,
    diagnosticDelayDays: diagnosticMonth.affectedLaneDelayHours / 24,
  };
}

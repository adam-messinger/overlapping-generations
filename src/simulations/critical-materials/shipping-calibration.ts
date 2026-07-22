import {
  maritimeDefaults,
  maritimeObserved,
  maritimeScenarios,
  type MaritimeNetworkParams,
} from './shipping-data.js';
import { simulateMaritimeNetwork } from './shipping-network.js';
import { calibrate, type CalibrationObservation } from 'tsimulation';

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
  type Observation = { scenario: keyof typeof maritimeScenarios; capeOilMbd: number };
  const observations: CalibrationObservation<Observation>[] = [
    {
      id: 'eia-cape-oil-2024',
      role: 'development',
      value: {
        scenario: 'red-sea-2024-development',
        capeOilMbd: maritimeObserved.capeOil2024Mbd,
      },
    },
    {
      id: 'eia-cape-oil-1h25',
      role: 'holdout',
      value: {
        scenario: 'red-sea-1h25-holdout',
        capeOilMbd: maritimeObserved.capeOil1h25Mbd,
      },
    },
  ];
  const calibration = calibrate({
    id: 'maritime-cape-reroute-v1',
    candidates: function* () {
      for (let step = 0; step <= 80; step++) {
        yield { oilCapeRerouteShare: 0.40 + 0.005 * step };
      }
    },
    observations,
    predict: (candidate, observation) => simulateMaritimeNetwork(
      maritimeScenarios[observation.value.scenario],
      candidate,
    ).annual[0].averageCapeOilFlowMbd,
    loss: (prediction, observation) => Math.abs(prediction - observation.value.capeOilMbd),
  });

  const params: MaritimeNetworkParams = {
    ...maritimeDefaults,
    oilCapeRerouteShare: calibration.params.oilCapeRerouteShare,
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

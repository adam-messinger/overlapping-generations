import {
  france2026HeatEvent,
  heatAdaptationPackages,
  heatEvidence,
  type HeatAdaptation,
  type HeatEvent,
} from './data.js';
import { fitMortalityScale, simulateHeatEvent } from './model.js';

export const calibratedHeatMortalityScale = fitMortalityScale(
  france2026HeatEvent,
  heatAdaptationPackages.current,
  heatEvidence.france2026ObservedExcessDeaths,
);

export interface HeatBackcastAudit {
  fittedDeaths: number;
  observedDeaths: number;
  absolutePercentageError: number;
  shareAge65Plus: number;
  noAdaptationDeaths: number;
  noAdaptationIncrease: number;
  literatureNoAdaptationIncrease: number;
}

export function auditFrance2026Backcast(): HeatBackcastAudit {
  const current = simulateHeatEvent(
    france2026HeatEvent,
    heatAdaptationPackages.current,
    calibratedHeatMortalityScale,
  );
  const none = simulateHeatEvent(
    france2026HeatEvent,
    heatAdaptationPackages.none,
    calibratedHeatMortalityScale,
  );
  return {
    fittedDeaths: current.mortality.totalDeaths,
    observedDeaths: heatEvidence.france2026ObservedExcessDeaths,
    absolutePercentageError: Math.abs(
      current.mortality.totalDeaths - heatEvidence.france2026ObservedExcessDeaths,
    ) / heatEvidence.france2026ObservedExcessDeaths,
    shareAge65Plus: current.mortality.shareAge65Plus,
    noAdaptationDeaths: none.mortality.totalDeaths,
    noAdaptationIncrease: none.mortality.totalDeaths / current.mortality.totalDeaths - 1,
    literatureNoAdaptationIncrease: heatEvidence.europe2023NoAdaptationMortalityIncrease,
  };
}

export interface HeatSensitivityRow {
  dayTemperatureDeltaC: number;
  nightTemperatureDeltaC: number;
  deaths: number;
  yieldLoss: number;
  reserveMarginGw: number;
}

export function heatTemperatureSensitivity(
  event: HeatEvent,
  adaptation: HeatAdaptation,
): readonly HeatSensitivityRow[] {
  return [-1, 0, 1, 2].map((delta) => {
    const result = simulateHeatEvent({
      ...event,
      meanDayMaximumC: event.meanDayMaximumC + delta,
      meanNightMinimumC: event.meanNightMinimumC + 1.15 * delta,
    }, adaptation, calibratedHeatMortalityScale);
    return {
      dayTemperatureDeltaC: delta,
      nightTemperatureDeltaC: 1.15 * delta,
      deaths: result.mortality.totalDeaths,
      yieldLoss: result.food.aggregateSeasonalYieldLoss,
      reserveMarginGw: result.power.reserveMarginGw,
    };
  });
}

import { REGIONS, type Region } from '../../domain-types.js';
import {
  maritimeDefaults,
  type MaritimeNetworkParams,
  type MaritimeScenario,
} from './shipping-data.js';

export interface MaritimeMonthResult {
  year: number;
  month: number;
  hormuzThroughput: number;
  babThroughput: number;
  suezThroughput: number;
  oilAvailableToRedSeaMbd: number;
  directOilMbd: number;
  capeOilDeparturesMbd: number;
  capeOilArrivalsMbd: number;
  reorientedOilMbd: number;
  intendedMarketOilAvailability: number;
  capeOilFlowMbd: number;
  containerAvoidance: number;
  containerEffectiveCapacityLoss: number;
  affectedLaneDelayHours: number;
  importInflationImpulsePctPoints: number;
  regionalTradeCapacityFactor: Readonly<Record<Region, number>>;
}

export interface MaritimeAnnualResult {
  year: number;
  averageIntendedMarketOilAvailability: number;
  minimumIntendedMarketOilAvailability: number;
  averageCapeOilFlowMbd: number;
  peakContainerCapacityLoss: number;
  peakAffectedLaneDelayHours: number;
  peakImportInflationImpulsePctPoints: number;
  regionalTradeCapacityFactor: Readonly<Record<Region, number>>;
}

export interface MaritimeSimulationResult {
  scenario: MaritimeScenario;
  params: MaritimeNetworkParams;
  monthly: readonly MaritimeMonthResult[];
  annual: readonly MaritimeAnnualResult[];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function monthAt(path: readonly number[], index: number): number {
  return clamp(path[index] ?? path[path.length - 1] ?? 1, 0, 1);
}

function dateAt(startYear: number, startMonth: number, index: number): { year: number; month: number } {
  const zeroBased = startMonth - 1 + index;
  return {
    year: startYear + Math.floor(zeroBased / 12),
    month: zeroBased % 12 + 1,
  };
}

function regionalFactors(
  globalCapacityFactor: number,
  params: MaritimeNetworkParams,
): Record<Region, number> {
  const result = {} as Record<Region, number>;
  for (const region of REGIONS) {
    result[region] = 1 -
      params.regionalTradeExposure[region] * (1 - globalCapacityFactor);
  }
  return result;
}

/**
 * Monthly serial-edge model for Hormuz → Bab el-Mandeb → Suez/SUMED, with a
 * Cape alternative. Hormuz-overlapping barrels are removed before Bab is
 * stressed, preventing the same barrel from being counted twice.
 */
export function simulateMaritimeNetwork(
  scenario: MaritimeScenario,
  overrides: Partial<MaritimeNetworkParams> = {},
): MaritimeSimulationResult {
  const params: MaritimeNetworkParams = {
    ...maritimeDefaults,
    ...overrides,
    regionalTradeExposure: {
      ...maritimeDefaults.regionalTradeExposure,
      ...(overrides.regionalTradeExposure ?? {}),
    },
  };
  const months = Math.max(
    scenario.hormuzThroughputPath.length,
    scenario.babThroughputPath.length,
    scenario.suezThroughputPath.length,
  );
  const arrivalSchedule = Array.from({ length: months + 3 }, () => 0);
  const inflationSchedule = Array.from(
    { length: months + params.importInflationLagMonths + 1 },
    () => 0,
  );
  const monthly: MaritimeMonthResult[] = [];
  const delayMonths = params.capeExtraDays / params.daysPerMonth;
  const delayFloor = Math.floor(delayMonths);
  const delayRemainder = delayMonths - delayFloor;

  for (let index = 0; index < months; index++) {
    const { year, month } = dateAt(scenario.startYear, scenario.startMonth, index);
    const hormuzThroughput = monthAt(scenario.hormuzThroughputPath, index);
    const babThroughput = monthAt(scenario.babThroughputPath, index);
    const suezThroughput = monthAt(scenario.suezThroughputPath, index);

    const oilAvailableToRedSeaMbd = scenario.baselineBabOilMbd * (
      1 - params.babHormuzOverlapShare +
      params.babHormuzOverlapShare * hormuzThroughput
    );
    const suezOrSumedThroughput =
      params.babCrudeShare * Math.max(
        suezThroughput,
        Math.min(1, params.sumedCrudeCoverage),
      ) +
      (1 - params.babCrudeShare) * suezThroughput;
    const directFraction = clamp(babThroughput * suezOrSumedThroughput, 0, 1);
    const directOilMbd = oilAvailableToRedSeaMbd * directFraction;
    const blockedOilMbd = oilAvailableToRedSeaMbd - directOilMbd;
    const capeOilDeparturesMbd = blockedOilMbd * params.oilCapeRerouteShare;
    const reorientedOilMbd = blockedOilMbd - capeOilDeparturesMbd;

    const firstArrival = index + delayFloor;
    arrivalSchedule[firstArrival] += capeOilDeparturesMbd * (1 - delayRemainder);
    arrivalSchedule[firstArrival + 1] += capeOilDeparturesMbd * delayRemainder;
    const capeOilArrivalsMbd = arrivalSchedule[index];
    const intendedDelivered = directOilMbd + capeOilArrivalsMbd;
    const intendedMarketOilAvailability = oilAvailableToRedSeaMbd > 0
      ? clamp(intendedDelivered / oilAvailableToRedSeaMbd, 0, 1.5)
      : 1;

    const containerAvoidance = clamp(1 - babThroughput * suezThroughput, 0, 1);
    const affectedLaneDelayHours =
      containerAvoidance * params.capeExtraDays * 24;
    const addedFleetTimeShare = params.capeExtraDays /
      (params.containerServiceCycleDays + params.capeExtraDays);
    const containerEffectiveCapacityLoss = clamp(
      params.suezContainerTradeShare *
        containerAvoidance *
        addedFleetTimeShare *
        params.containerNetworkAmplification,
      0,
      0.25,
    );
    const eventualInflationImpulse =
      affectedLaneDelayHours / 100 * params.importInflationPpPer100Hours;
    inflationSchedule[index + params.importInflationLagMonths] +=
      eventualInflationImpulse;
    const importInflationImpulsePctPoints = inflationSchedule[index];
    const globalTradeCapacityFactor = 1 - containerEffectiveCapacityLoss;

    monthly.push({
      year,
      month,
      hormuzThroughput,
      babThroughput,
      suezThroughput,
      oilAvailableToRedSeaMbd,
      directOilMbd,
      capeOilDeparturesMbd,
      capeOilArrivalsMbd,
      reorientedOilMbd,
      intendedMarketOilAvailability,
      capeOilFlowMbd: scenario.baselineCapeOilMbd + capeOilDeparturesMbd,
      containerAvoidance,
      containerEffectiveCapacityLoss,
      affectedLaneDelayHours,
      importInflationImpulsePctPoints,
      regionalTradeCapacityFactor: regionalFactors(globalTradeCapacityFactor, params),
    });
  }

  const years = [...new Set(monthly.map((row) => row.year))];
  const annual: MaritimeAnnualResult[] = years.map((year) => {
    const rows = monthly.filter((row) => row.year === year);
    const avg = (selector: (row: MaritimeMonthResult) => number): number =>
      rows.reduce((sum, row) => sum + selector(row), 0) / rows.length;
    const averageRegional = {} as Record<Region, number>;
    for (const region of REGIONS) {
      averageRegional[region] = avg((row) => row.regionalTradeCapacityFactor[region]);
    }
    return {
      year,
      averageIntendedMarketOilAvailability: avg((row) => row.intendedMarketOilAvailability),
      minimumIntendedMarketOilAvailability: Math.min(...rows.map((row) => row.intendedMarketOilAvailability)),
      averageCapeOilFlowMbd: avg((row) => row.capeOilFlowMbd),
      peakContainerCapacityLoss: Math.max(...rows.map((row) => row.containerEffectiveCapacityLoss)),
      peakAffectedLaneDelayHours: Math.max(...rows.map((row) => row.affectedLaneDelayHours)),
      peakImportInflationImpulsePctPoints: Math.max(...rows.map((row) => row.importInflationImpulsePctPoints)),
      regionalTradeCapacityFactor: averageRegional,
    };
  });

  return { scenario, params, monthly, annual };
}

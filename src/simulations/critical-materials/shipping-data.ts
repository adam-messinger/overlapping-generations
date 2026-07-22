import type { Region } from '../../domain-types.js';

export type MaritimeScenarioId =
  | 'red-sea-2024-development'
  | 'red-sea-1h25-holdout'
  | 'july-2026-escalation'
  | 'dual-chokepoint-closure';

export interface MaritimeScenario {
  id: MaritimeScenarioId;
  label: string;
  description: string;
  startYear: number;
  startMonth: number;
  /** Fraction of normal route traffic physically able to traverse each edge. */
  hormuzThroughputPath: readonly number[];
  babThroughputPath: readonly number[];
  suezThroughputPath: readonly number[];
  /** Oil already using Bab in the comparison baseline, million b/d. */
  baselineBabOilMbd: number;
  /** Cape oil flow before the compared disruption, million b/d. */
  baselineCapeOilMbd: number;
}

export interface MaritimeNetworkParams {
  /** 1H25 Bab flow: 2.4 crude + 1.8 products, EIA. */
  babCrudeShare: number;
  /** Share of Bab oil that also crossed Hormuz. Judgment pending OD data. */
  babHormuzOverlapShare: number;
  /** Share of blocked oil cargoes that keep destination and reroute via Cape. */
  oilCapeRerouteShare: number;
  /** Added Asia-Europe voyage time around the Cape, UNCTAD. */
  capeExtraDays: number;
  daysPerMonth: number;
  /** SUMED can bypass Suez for this fraction of baseline crude flow. */
  sumedCrudeCoverage: number;
  /** 2023 share of global seaborne containers normally using Suez. */
  suezContainerTradeShare: number;
  /** Avoidance observed in the 2024 container episode. */
  containerAvoidanceCalibration: number;
  /** Congestion/repositioning multiplier beyond added sailing time. */
  containerNetworkAmplification: number;
  /** Typical service-cycle days used to translate extra days into fleet loss. */
  containerServiceCycleDays: number;
  /** IMF estimate: peak import inflation pp per 100 hours of delay. */
  importInflationPpPer100Hours: number;
  importInflationLagMonths: number;
  /** Regional exposure to Red Sea/Suez goods trade, transparent judgment. */
  regionalTradeExposure: Record<Region, number>;
}

export const maritimeDefaults: MaritimeNetworkParams = {
  babCrudeShare: 2.4 / 4.2,
  babHormuzOverlapShare: 0.35,
  oilCapeRerouteShare: 0.60,
  capeExtraDays: 12,
  daysPerMonth: 30,
  sumedCrudeCoverage: 1,
  suezContainerTradeShare: 0.22,
  containerAvoidanceCalibration: 0.82,
  containerNetworkAmplification: 1.35,
  containerServiceCycleDays: 20,
  importInflationPpPer100Hours: 0.5,
  importInflationLagMonths: 5,
  regionalTradeExposure: {
    oecd: 0.80,
    china: 0.70,
    india: 0.60,
    latam: 0.35,
    seasia: 0.90,
    russia: 0.30,
    mena: 0.75,
    ssa: 0.55,
  },
};

const normal = (months: number): number[] => Array.from({ length: months }, () => 1);

export const maritimeScenarios: Readonly<Record<MaritimeScenarioId, MaritimeScenario>> = {
  'red-sea-2024-development': {
    id: 'red-sea-2024-development',
    label: '2024 Red Sea diversion development window',
    description:
      'Reproduces the annual fall in Bab oil flow from 9.3 to 4.1 mb/d; only the Cape reroute share is fitted.',
    startYear: 2024,
    startMonth: 1,
    hormuzThroughputPath: normal(12),
    babThroughputPath: Array.from({ length: 12 }, () => 4.1 / 9.3),
    suezThroughputPath: Array.from({ length: 12 }, () => 0.50),
    baselineBabOilMbd: 9.3,
    baselineCapeOilMbd: 6.2,
  },
  'red-sea-1h25-holdout': {
    id: 'red-sea-1h25-holdout',
    label: '1H25 Red Sea persistence holdout',
    description:
      'Uses the fitted 2024 reroute behavior against independently reported 1H25 Bab and Cape oil flows.',
    startYear: 2025,
    startMonth: 1,
    hormuzThroughputPath: normal(6),
    babThroughputPath: Array.from({ length: 6 }, () => 4.2 / 9.3),
    suezThroughputPath: Array.from({ length: 6 }, () => 4.9 / 8.8),
    baselineBabOilMbd: 9.3,
    baselineCapeOilMbd: 6.2,
  },
  'july-2026-escalation': {
    id: 'july-2026-escalation',
    label: 'July 2026 Hormuz plus Red Sea escalation',
    description:
      'Observed near-closure of Hormuz followed by a severe five-month Bab disruption and gradual reopening.',
    startYear: 2026,
    startMonth: 1,
    hormuzThroughputPath: [1, 1, 0.10, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.20, 0.40, 0.70, 1, 1, 1],
    babThroughputPath: [1, 1, 1, 1, 1, 1, 1, 0.10, 0.10, 0.10, 0.10, 0.10, 0.30, 0.60, 0.85, 1, 1, 1],
    suezThroughputPath: normal(18),
    baselineBabOilMbd: 4.2,
    baselineCapeOilMbd: 9.1,
  },
  'dual-chokepoint-closure': {
    id: 'dual-chokepoint-closure',
    label: 'Sustained dual chokepoint closure',
    description:
      'A severe conditional stress: Hormuz and Bab remain at 8% and 5% throughput for a full year.',
    startYear: 2026,
    startMonth: 1,
    hormuzThroughputPath: [1, 1, ...Array.from({ length: 12 }, () => 0.08), 0.25, 0.50, 0.75, 1],
    babThroughputPath: [1, 1, ...Array.from({ length: 12 }, () => 0.05), 0.25, 0.50, 0.75, 1],
    suezThroughputPath: normal(18),
    baselineBabOilMbd: 4.2,
    baselineCapeOilMbd: 9.1,
  },
};

export interface MaritimeObservedAnchors {
  babOil2023Mbd: number;
  babOil2024Mbd: number;
  babOil1h25Mbd: number;
  capeOil2023Mbd: number;
  capeOil2024Mbd: number;
  capeOil1h25Mbd: number;
  containerCapacityLoss2024: number;
  capeDelayDays2024: number;
}

export const maritimeObserved: MaritimeObservedAnchors = {
  babOil2023Mbd: 9.3,
  babOil2024Mbd: 4.1,
  babOil1h25Mbd: 4.2,
  capeOil2023Mbd: 6.2,
  capeOil2024Mbd: 9.3,
  capeOil1h25Mbd: 9.1,
  containerCapacityLoss2024: 0.09,
  capeDelayDays2024: 12,
};

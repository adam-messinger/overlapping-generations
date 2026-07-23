import {
  AIR_MOBILITY_ARCHITECTURES,
  aviationEvidence,
  businessJetOperationsHistory,
  centralAviationScenario,
  paloAltoTrafficHistory,
  tafFacilityTrafficHistory,
  type AviationInfrastructureScenario,
  type HistoricalObservation,
  type HistoricalTrafficSeries,
} from './data.js';
import {
  simulateAviationInfrastructure,
  type AviationInfrastructureResult,
} from './model.js';

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

function robustAnnualGrowth(
  observations: readonly HistoricalObservation[],
  throughYear: number,
): number {
  const usable = observations.filter((row) => row.year <= throughYear);
  const growthRates: number[] = [];
  for (let index = 1; index < usable.length; index++) {
    const previous = usable[index - 1];
    const current = usable[index];
    if (current.year - previous.year !== 1) continue;
    // The pandemic collapse and immediate reopening are an event shock, not
    // the persistent traffic trend being estimated.
    if ([2020, 2021].includes(current.year)) continue;
    growthRates.push(current.value / previous.value - 1);
  }
  return Math.max(-0.04, Math.min(0.05, median(growthRates)));
}

function valueAt(
  observations: readonly HistoricalObservation[],
  year: number,
): number {
  const value = observations.find((row) => row.year === year)?.value;
  if (value === undefined) throw new Error(`Missing observation for ${year}`);
  return value;
}

export interface TrafficBacktestRow {
  series: string;
  year: number;
  observedOperations: number;
  naiveOperations: number;
  segmentedOperations: number;
  naiveAbsolutePercentageError: number;
  segmentedAbsolutePercentageError: number;
}

export interface TrafficBacktest {
  rows: readonly TrafficBacktestRow[];
  naiveMeanAbsolutePercentageError: number;
  segmentedMeanAbsolutePercentageError: number;
  estimatedGrowthRates: Record<string, number>;
}

interface BacktestSpec {
  series: HistoricalTrafficSeries;
  originYear: number;
  holdoutYears: readonly number[];
  naiveGrowth: number;
  /**
   * Share of the last observed annual change treated as a persistent
   * post-pandemic recovery rather than a transitory rebound.
   */
  recoveryPersistence: number;
}

/**
 * Compare the first-pass "one aviation growth rate" treatment with a
 * segment-specific robust operations trend.  The split is genuinely
 * out-of-sample: the robust rate and origin level use no holdout observations.
 */
export function backtestConventionalTraffic(): TrafficBacktest {
  const specs: readonly BacktestSpec[] = [
    {
      series: businessJetOperationsHistory,
      originYear: 2023,
      holdoutYears: [2024, 2025],
      // The tempting but incorrect shortcut is to use FAA's 3.2% jet-hours
      // forecast as if it were a forecast of airport operations.
      naiveGrowth: 0.032,
      recoveryPersistence: 0,
    },
    {
      series: tafFacilityTrafficHistory.majorAirportGa,
      originYear: 2022,
      holdoutYears: [2023, 2024],
      naiveGrowth: 0.01,
      recoveryPersistence: 0,
    },
    {
      series: tafFacilityTrafficHistory.businessAviationAirports,
      originYear: 2022,
      holdoutYears: [2023, 2024],
      naiveGrowth: 0.01,
      recoveryPersistence: 0.8,
    },
    {
      series: tafFacilityTrafficHistory.otherRunwayAirports,
      originYear: 2022,
      holdoutYears: [2023, 2024],
      naiveGrowth: 0.01,
      recoveryPersistence: 1,
    },
  ];
  const rows: TrafficBacktestRow[] = [];
  const estimatedGrowthRates: Record<string, number> = {};
  for (const spec of specs) {
    const base = valueAt(spec.series.observations, spec.originYear);
    const growth = robustAnnualGrowth(
      spec.series.observations,
      spec.originYear,
    );
    const previous = valueAt(
      spec.series.observations,
      spec.originYear - 1,
    );
    const recentGrowth = base / previous - 1;
    const segmentedGrowth =
      growth * (1 - spec.recoveryPersistence) +
      recentGrowth * spec.recoveryPersistence;
    estimatedGrowthRates[spec.series.id] = segmentedGrowth;
    for (const year of spec.holdoutYears) {
      const observed = valueAt(spec.series.observations, year);
      const horizon = year - spec.originYear;
      const naive = base * Math.pow(1 + spec.naiveGrowth, horizon);
      const segmented = base * Math.pow(1 + segmentedGrowth, horizon);
      rows.push({
        series: spec.series.id,
        year,
        observedOperations: observed,
        naiveOperations: naive,
        segmentedOperations: segmented,
        naiveAbsolutePercentageError: Math.abs(naive - observed) / observed,
        segmentedAbsolutePercentageError:
          Math.abs(segmented - observed) / observed,
      });
    }
  }
  return {
    rows,
    naiveMeanAbsolutePercentageError: mean(
      rows.map((row) => row.naiveAbsolutePercentageError),
    ),
    segmentedMeanAbsolutePercentageError: mean(
      rows.map((row) => row.segmentedAbsolutePercentageError),
    ),
    estimatedGrowthRates,
  };
}

export interface EarlyAamBenchmarkRow {
  forecastYear: number;
  yearsAfterEntry: number;
  faaAllUseCaseFleet: number;
  modeledVtolFleetScaleProxy: number;
  vtolToAllUseFleetRatio: number;
  faaUnconstrainedPassengerDepartures: number;
  modeledPassengerFlights: number;
  passengerFlightRatio: number;
}

export interface EarlyAamBenchmark {
  rows: readonly EarlyAamBenchmarkRow[];
  meanVtolToAllUseFleetAbsolutePercentageDifference: number;
  meanModeledToUnconstrainedPassengerFlightRatio: number;
}

/**
 * The FAA series is an unconstrained scenario, not an observed calibration
 * target. Its fleet covers passenger, cargo, and medical use cases, so the
 * VTOL comparison is only a production-scale proxy. Flights are compared with
 * the passenger-only Airport Shuttle plus Commuter Air Taxi chart series.
 */
export function evaluateEarlyAamBenchmark(
  scenario: AviationInfrastructureScenario = centralAviationScenario,
): EarlyAamBenchmark {
  const result = simulateAviationInfrastructure(scenario);
  const entryYear = scenario.architectures.vtol.entryIntoServiceYear;
  const rows = aviationEvidence.faaAamEarlyFleetAllUseCases.map(
    (faaFleet, index) => {
      const forecastYear = entryYear + index;
      const modeled = result.years.find((row) => row.year === forecastYear);
      if (!modeled) {
        throw new Error(
          `Scenario does not cover AAM benchmark year ${forecastYear}`,
        );
      }
      const faaPassengerDepartures =
        aviationEvidence.faaAamEarlyPassengerDepartures[index];
      return {
        forecastYear,
        yearsAfterEntry: index + 1,
        faaAllUseCaseFleet: faaFleet,
        modeledVtolFleetScaleProxy: modeled.architectures.vtol.fleet,
        vtolToAllUseFleetRatio: modeled.architectures.vtol.fleet / faaFleet,
        faaUnconstrainedPassengerDepartures: faaPassengerDepartures,
        modeledPassengerFlights: modeled.totalAamFlights,
        passengerFlightRatio:
          modeled.totalAamFlights / faaPassengerDepartures,
      };
    },
  );
  return {
    rows,
    meanVtolToAllUseFleetAbsolutePercentageDifference: mean(
      rows.map((row) =>
        Math.abs(
          row.modeledVtolFleetScaleProxy - row.faaAllUseCaseFleet,
        ) / row.faaAllUseCaseFleet
      ),
    ),
    meanModeledToUnconstrainedPassengerFlightRatio: mean(
      rows.map((row) => row.passengerFlightRatio),
    ),
  };
}

/**
 * Deliberately naive comparator: continue the FAA's last early-adoption
 * growth rate, decaying toward 5% annually.  It demonstrates why the first
 * iteration overstated helipad traffic when certification, sites, fleet, and
 * outside-mode choice were absent.
 */
export function naiveExtrapolatedAamFlights(
  year: number,
  entryYear = 2029,
): number {
  if (year < entryYear) return 0;
  const index = year - entryYear;
  if (index < aviationEvidence.faaAamEarlyPassengerDepartures.length) {
    return aviationEvidence.faaAamEarlyPassengerDepartures[index];
  }
  let flights = aviationEvidence.faaAamEarlyPassengerDepartures.at(-1)!;
  const recentGrowth =
    flights /
      aviationEvidence.faaAamEarlyPassengerDepartures[
        aviationEvidence.faaAamEarlyPassengerDepartures.length - 2
      ] -
    1;
  for (
    let forecastYear =
      entryYear + aviationEvidence.faaAamEarlyPassengerDepartures.length;
    forecastYear <= year;
    forecastYear++
  ) {
    const yearsPastBenchmark =
      forecastYear -
      (entryYear + aviationEvidence.faaAamEarlyPassengerDepartures.length - 1);
    const growth = 0.05 + (recentGrowth - 0.05) *
      Math.pow(0.5, yearsPastBenchmark / 5);
    flights *= 1 + growth;
  }
  return flights;
}

export interface PaloAltoProjectionRow {
  year: number;
  conventionalItinerantOperations: number;
  conventionalLocalOperations: number;
  aamOperations: number;
  totalOperations: number;
  aamShareOfOperations: number;
  practicalCapacityUtilization: number;
}

/**
 * Illustrative PAO overlay.  The national model does not claim to know route
 * shares for an individual airport, so both the attraction multiplier and
 * practical throughput limit remain explicit scenario inputs.
 */
export function projectPaloAltoTraffic(
  result: AviationInfrastructureResult,
  options: {
    smallAirportAamShare?: number;
    practicalAnnualOperations?: number;
    itinerantAnnualGrowth?: number;
    localAnnualGrowth?: number;
  } = {},
): readonly PaloAltoProjectionRow[] {
  const smallAirportAamShare = options.smallAirportAamShare ?? 0.0025;
  const practicalAnnualOperations = options.practicalAnnualOperations ?? 220_000;
  const itinerantAnnualGrowth = options.itinerantAnnualGrowth ?? 0.005;
  const localAnnualGrowth = options.localAnnualGrowth ?? 0.003;
  const baseYear = 2024;
  const baseItinerant = valueAt(paloAltoTrafficHistory.observations, baseYear);
  const baseLocal = 92_673;
  return result.years.map((row) => {
    const horizon = row.year - baseYear;
    const conventionalItinerantOperations =
      baseItinerant * Math.pow(1 + itinerantAnnualGrowth, horizon);
    const conventionalLocalOperations =
      baseLocal * Math.pow(1 + localAnnualGrowth, horizon);
    const conventional =
      conventionalItinerantOperations + conventionalLocalOperations;
    const unconstrainedAam =
      row.facilities['small-airport'].aamOperations * smallAirportAamShare;
    const aamOperations = Math.min(
      unconstrainedAam,
      Math.max(0, practicalAnnualOperations - conventional),
    );
    const totalOperations = conventional + aamOperations;
    return {
      year: row.year,
      conventionalItinerantOperations,
      conventionalLocalOperations,
      aamOperations,
      totalOperations,
      aamShareOfOperations:
        totalOperations > 0 ? aamOperations / totalOperations : 0,
      practicalCapacityUtilization:
        totalOperations / practicalAnnualOperations,
    };
  });
}

export interface AviationSensitivityVariant {
  annualFlights2040: number;
  annualFlights2050: number;
  facilityOperations2050: Record<string, number>;
}

export interface AviationSensitivityRow {
  lever: string;
  lowerCase: AviationSensitivityVariant;
  upperCase: AviationSensitivityVariant;
  centralAnnualFlights2040: number;
  centralAnnualFlights2050: number;
  spreadAroundCentral2050: number;
}

function sensitivityVariant(
  scenario: AviationInfrastructureScenario,
): AviationSensitivityVariant {
  const result = simulateAviationInfrastructure(scenario);
  const row2040 = result.years.find((row) => row.year === 2040);
  const row2050 = result.years.find((row) => row.year === 2050);
  if (!row2040 || !row2050) {
    throw new Error('Aviation sensitivity analysis requires 2040 and 2050');
  }
  return {
    annualFlights2040: row2040.totalAamFlights,
    annualFlights2050: row2050.totalAamFlights,
    facilityOperations2050: Object.fromEntries(
      Object.entries(row2050.facilities).map(([facilityClass, facility]) => [
        facilityClass,
        facility.aamOperations,
      ]),
    ),
  };
}

/**
 * One-lever-at-a-time structural sensitivity. These are deliberately wide
 * perturbations, intended to rank research priorities rather than imply a
 * probability distribution.
 */
export function analyzeAviationSensitivity(
  scenario: AviationInfrastructureScenario = centralAviationScenario,
): readonly AviationSensitivityRow[] {
  const central = sensitivityVariant(scenario);
  const cases: readonly {
    lever: string;
    lower: (candidate: AviationInfrastructureScenario) => void;
    upper: (candidate: AviationInfrastructureScenario) => void;
  }[] = [
    {
      lever: 'addressable-passenger-demand',
      lower: (candidate) => { candidate.demandScale *= 0.7; },
      upper: (candidate) => { candidate.demandScale *= 1.3; },
    },
    {
      lever: 'certification-and-industrial-timing',
      lower: (candidate) => {
        for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
          const params = candidate.architectures[architecture];
          params.entryIntoServiceYear += 3;
          params.earlyProductionMidpointYear += 3;
          params.matureProductionMidpointYear += 3;
          params.siteReadinessMidpointYear += 3;
        }
      },
      upper: (candidate) => {
        for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
          const params = candidate.architectures[architecture];
          params.entryIntoServiceYear -= 2;
          params.earlyProductionMidpointYear -= 2;
          params.matureProductionMidpointYear -= 2;
          params.siteReadinessMidpointYear -= 2;
        }
      },
    },
    {
      lever: 'autonomy-timing',
      lower: (candidate) => { candidate.autonomyApprovalYear = null; },
      upper: (candidate) => {
        candidate.autonomyApprovalYear = 2033;
        candidate.autonomyRampYears = 4;
      },
    },
    {
      lever: 'aircraft-production-capacity',
      lower: (candidate) => {
        for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
          candidate.architectures[architecture].earlyMaxAnnualDeliveries *= 0.6;
          candidate.architectures[architecture].matureAdditionalAnnualDeliveries *= 0.6;
        }
      },
      upper: (candidate) => {
        for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
          candidate.architectures[architecture].earlyMaxAnnualDeliveries *= 1.4;
          candidate.architectures[architecture].matureAdditionalAnnualDeliveries *= 1.4;
        }
      },
    },
    {
      lever: 'usable-landing-site-capacity',
      lower: (candidate) => {
        for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
          candidate.architectures[architecture].matureServiceSites *= 0.6;
        }
      },
      upper: (candidate) => {
        for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
          candidate.architectures[architecture].matureServiceSites *= 1.4;
        }
      },
    },
    {
      lever: 'aircraft-operating-cost',
      lower: (candidate) => {
        for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
          const params = candidate.architectures[architecture];
          params.fixedCostPerFlight *= 1.25;
          params.variableCostPerMile *= 1.25;
          params.pilotCostPerFlight *= 1.25;
        }
      },
      upper: (candidate) => {
        for (const architecture of AIR_MOBILITY_ARCHITECTURES) {
          const params = candidate.architectures[architecture];
          params.fixedCostPerFlight *= 0.8;
          params.variableCostPerMile *= 0.8;
          params.pilotCostPerFlight *= 0.8;
        }
      },
    },
  ];

  return cases.map(({ lever, lower, upper }) => {
    const lowerScenario = structuredClone(scenario);
    const upperScenario = structuredClone(scenario);
    lower(lowerScenario);
    upper(upperScenario);
    const lowerCase = sensitivityVariant(lowerScenario);
    const upperCase = sensitivityVariant(upperScenario);
    return {
      lever,
      lowerCase,
      upperCase,
      centralAnnualFlights2040: central.annualFlights2040,
      centralAnnualFlights2050: central.annualFlights2050,
      spreadAroundCentral2050:
        (upperCase.annualFlights2050 - lowerCase.annualFlights2050) /
        central.annualFlights2050,
    };
  }).sort((left, right) =>
    right.spreadAroundCentral2050 - left.spreadAroundCentral2050
  );
}

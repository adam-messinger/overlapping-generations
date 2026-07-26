import { runModel } from 'tsimulation';

import {
  analyzeEntrantSensitivity,
  analyzeEntrantGeographicScope,
  backtestEbikeAdoption,
  evaluateSupplierVolumeCalibration,
  mapEntrantDecisionSurface,
} from '../src/simulations/e-bike-motors/calibration.js';
import {
  EBIKE_REGIONS,
  INCUMBENT_MOTOR_SUPPLIERS,
  MOTOR_SUPPLIERS,
  ebikeMotorScenarios,
  supplierDefinitions,
  type MotorSupplier,
} from '../src/simulations/e-bike-motors/data.js';
import type {
  EbikeMotorResult,
  EbikeMotorYear,
} from '../src/simulations/e-bike-motors/model.js';
import { ebikeMotorMarketModel } from '../src/simulations/registry.js';

const forecastYears = [2024, 2030, 2035, 2040, 2045] as const;

const round = (value: number, digits = 3): number =>
  Number(value.toFixed(digits));

const millions = (value: number): number => round(value / 1_000_000);

function year(result: EbikeMotorResult, target: number): EbikeMotorYear {
  const row = result.years.find((candidate) => candidate.year === target);
  if (!row) throw new Error(`Scenario does not include ${target}`);
  return row;
}

const runs = Object.fromEntries(
  Object.entries(ebikeMotorScenarios).map(([id, scenario]) => [
    id,
    runModel(ebikeMotorMarketModel, scenario).output,
  ]),
) as Record<string, EbikeMotorResult>;
const central = runs['full-stack'];
const backtest = backtestEbikeAdoption();
const supplierCalibration = evaluateSupplierVolumeCalibration();
const sensitivity = analyzeEntrantSensitivity();
const decisionSurface = mapEntrantDecisionSurface();
const geographicScope = analyzeEntrantGeographicScope();

const supplierUncertaintyFraction: Record<MotorSupplier, number> = {
  bosch: 0.35,
  shimano: 0.40,
  bafang: 0.05,
  ananda: 0.15,
  'yamaha-brose': 0.35,
  panasonic: 0.40,
  avinox: 0.50,
  'other-china': 0.20,
  'other-premium': 0.35,
  'us-entrant': 0,
};

const regionalAdoption = forecastYears.flatMap((targetYear) => {
  const row = year(central, targetYear);
  return EBIKE_REGIONS.map((region) => ({
    year: targetYear,
    region,
    annualMarketFlowMillion: millions(row.regions[region].annualSales),
    installedStockMillion: millions(
      row.regions[region].endingInstalledStock,
    ),
    stockPerThousandPeople: round(
      row.regions[region].stockPerThousandPeople,
      1,
    ),
    midDriveShare: round(
      row.regions[region].architectureShares['mid-drive'],
    ),
  }));
});

const supplierVolumes = forecastYears.flatMap((targetYear) => {
  const row = year(central, targetYear);
  return MOTOR_SUPPLIERS.map((supplier) => {
    const units = row.supplierVolumes[supplier];
    const definition =
      supplier === 'us-entrant' ? null : supplierDefinitions[supplier];
    const uncertainty = supplierUncertaintyFraction[supplier];
    return {
      year: targetYear,
      supplier,
      volumeBasis: definition?.volumeBasis ?? 'scenario',
      centralVolumeMillion: millions(units),
      indicativeLowerMillion: millions(units * (1 - uncertainty)),
      indicativeUpperMillion: millions(units * (1 + uncertainty)),
    };
  });
});

const entrantScenarios = Object.fromEntries(
  Object.entries(runs).map(([id, result]) => {
    const row2040 = year(result, 2040);
    const ending = result.years.at(-1)!;
    return [
      id,
      {
        classification: result.entrantOutcome,
        firstOperatingBreakevenYear: result.firstOperatingBreakevenYear,
        cumulativeCashPaybackYear: result.cashPaybackYear,
        peakFundingNeedMillion: round(result.peakFundingNeedMillion, 1),
        explicitHorizonNpvMillion: round(
          result.explicitHorizonNpvMillion,
          1,
        ),
        terminalValueAt2045Million: round(
          result.terminalValueAtHorizonMillion,
          1,
        ),
        enterpriseNpvMillion: round(result.enterpriseNpvMillion, 1),
        year2040: {
          annualUnits: Math.round(row2040.entrant.annualUnits),
          revenueMillion: round(row2040.entrant.revenueMillion, 1),
          operatingIncomeMillion: round(
            row2040.entrant.operatingIncomeMillion,
            1,
          ),
          operatingMargin: round(
            row2040.entrant.revenueMillion > 0
              ? row2040.entrant.operatingIncomeMillion /
                  row2040.entrant.revenueMillion
              : 0,
          ),
        },
        year2045: {
          annualUnits: Math.round(ending.entrant.annualUnits),
          revenueMillion: round(ending.entrant.revenueMillion, 1),
          operatingIncomeMillion: round(
            ending.entrant.operatingIncomeMillion,
            1,
          ),
          operatingMargin: round(result.endingOperatingMargin),
          globalSupplierShare: round(result.endingGlobalSupplierShare),
          unitDistribution: Object.fromEntries(
            EBIKE_REGIONS.map((region) => [
              region,
              Math.round(ending.regions[region].entrantUnits),
            ]),
          ),
        },
      },
    ];
  }),
);

const summary = {
  schemaVersion: 'tsimulation.e-bike-motor-market/v1',
  dataVintage: 'Public sources available through 2026-07-24',
  forecastStatus:
    'Conditional market and entrant scenarios. Regional adoption has sparse frozen holdouts; only Bafang and Ananda have auditable supplier-volume anchors; all other company volumes are inferred ranges.',
  marketBoundaryWarning:
    'China production, Japan factory shipments, EU retail sales, and a derived U.S. all-channel sales anchor are not identical statistics. They are aggregated only as one-drive-unit-per-complete-bike supply-demand equivalents.',
  iterationDiagnostics: {
    naiveExponentialHoldoutMape: round(
      backtest.naiveMeanAbsolutePercentageError,
    ),
    stockReplacementHoldoutMape: round(
      backtest.stockReplacementMeanAbsolutePercentageError,
    ),
    supplierComparableMape: round(
      supplierCalibration.meanAbsolutePercentageError,
    ),
    adoptionHoldouts: backtest.rows.map((row) => ({
      region: row.region,
      year: row.year,
      sourceBoundary: row.boundary,
      observedMillion: millions(row.observedUnits),
      naiveMillion: millions(row.naiveExponentialUnits),
      revisedMillion: millions(row.stockReplacementUnits),
    })),
    supplierCalibration: supplierCalibration.rows.map((row) => ({
      supplier: row.supplier,
      disclosedMillion: millions(row.disclosedUnits),
      modeledComparableTargetMillion: millions(
        row.modeledComparableTarget,
      ),
      modeledMillion: millions(row.modeledUnits),
      absolutePercentageError: round(
        row.errorVersusComparableTarget,
      ),
    })),
  },
  centralMarket: {
    globalAnnualMarketFlowMillion: forecastYears.map((targetYear) => ({
      year: targetYear,
      value: millions(year(central, targetYear).globalAnnualSales),
    })),
    regionalAdoption,
    supplierVolumes,
    supplierUncertaintyNote:
      'Ranges are judgmental identification bands around inferred point estimates, not statistical confidence intervals. Bafang is report-calibrated ±5%; Ananda ±15%; undisclosed named suppliers ±35–50%; residual pools ±20–35%.',
  },
  entrantScenarios,
  geographicScope: geographicScope.map((row) => ({
    scope: row.scope,
    includedRegions: row.includedRegions,
    annualUnits2045: Math.round(row.metrics.endingAnnualUnits),
    revenue2045Million: round(row.metrics.endingRevenueMillion, 1),
    operatingMargin2045: round(row.metrics.endingOperatingMargin),
    operatingBreakevenYear: row.metrics.firstOperatingBreakevenYear,
    cashPaybackYear: row.metrics.cashPaybackYear,
    peakFundingNeedMillion: round(row.metrics.peakFundingNeedMillion, 1),
    enterpriseNpvMillion: round(row.metrics.enterpriseNpvMillion, 1),
    commercialWin: row.metrics.commercialWin,
  })),
  sensitivityRanking: sensitivity.map((row) => ({
    lever: row.lever,
    lowerCase: row.lowerLabel,
    lower2045RevenueMillion: round(row.lower.endingRevenueMillion, 1),
    lower2045OperatingMargin: round(row.lower.endingOperatingMargin),
    lowerPaybackYear: row.lower.cashPaybackYear,
    centralCase: row.centralLabel,
    central2045RevenueMillion: round(row.central.endingRevenueMillion, 1),
    central2045OperatingMargin: round(row.central.endingOperatingMargin),
    centralPaybackYear: row.central.cashPaybackYear,
    upperCase: row.upperLabel,
    upper2045RevenueMillion: round(row.upper.endingRevenueMillion, 1),
    upper2045OperatingMargin: round(row.upper.endingOperatingMargin),
    upperPaybackYear: row.upper.cashPaybackYear,
    operatingIncomeSpreadMillion: round(
      row.operatingIncomeSpreadMillion,
      1,
    ),
  })),
  capitalEfficientDecisionSurface: decisionSurface
    .filter((row) => row.metrics.capitalEfficientWin)
    .map((row) => ({
      annualOemWins: row.annualOemWins,
      fixedCostMultiplier: row.fixedCostMultiplier,
      paybackYear: row.metrics.cashPaybackYear,
      peakFundingNeedMillion: round(
        row.metrics.peakFundingNeedMillion,
        1,
      ),
      enterpriseNpvMillion: round(row.metrics.enterpriseNpvMillion, 1),
    })),
  decisionRules: {
    commercialWin:
      'At least 250,000 annual units and at least 15% operating margin in 2045.',
    capitalEfficientWin:
      'Commercial win, cumulative cash payback by 2045, peak modeled funding no more than $300M, and nonnegative enterprise NPV at a 12% discount rate including a 2% terminal-growth value.',
  },
  supplierBasis: Object.fromEntries(
    INCUMBENT_MOTOR_SUPPLIERS.map((supplier) => [
      supplier,
      supplierDefinitions[supplier].volumeBasis,
    ]),
  ),
};

console.log(JSON.stringify(summary, null, 2));

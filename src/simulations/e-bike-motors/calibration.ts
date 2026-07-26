import {
  EBIKE_REGIONS,
  ebikeMotorScenarios,
  entrantStrategies,
  makeEbikeMotorScenario,
  regionalSalesHistory,
  supplierDisclosures,
  type EbikeRegion,
  type EntrantStrategy,
  type RegionalSalesObservation,
} from './data.js';
import { simulateEbikeMotorMarket } from './model.js';

const mean = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0) /
  Math.max(1, values.length);

const absolutePercentageError = (
  forecast: number,
  observed: number,
): number => Math.abs(forecast - observed) / observed;

interface StockAdoptionFit {
  initialStockMultiple: number;
  saturationStockPerThousandPeople: number;
  innovationRate: number;
  imitationRate: number;
  replacementYears: number;
  developmentMape: number;
}

interface RegionalBacktestSpec {
  region: 'eu' | 'japan';
  populationMillions: number;
  annualPopulationGrowth: number;
}

export interface AdoptionBacktestRow {
  region: EbikeRegion;
  year: number;
  boundary: RegionalSalesObservation['boundary'];
  observedUnits: number;
  naiveExponentialUnits: number;
  stockReplacementUnits: number;
  naiveAbsolutePercentageError: number;
  stockReplacementAbsolutePercentageError: number;
}

export interface AdoptionBacktest {
  rows: readonly AdoptionBacktestRow[];
  naiveMeanAbsolutePercentageError: number;
  stockReplacementMeanAbsolutePercentageError: number;
  fittedParams: Record<'eu' | 'japan', StockAdoptionFit>;
  notes: readonly string[];
}

function annualizedGrowth(
  first: RegionalSalesObservation,
  last: RegionalSalesObservation,
): number {
  return Math.pow(last.annualUnits / first.annualUnits, 1 / (last.year - first.year)) - 1;
}

function simulateStockPath(
  first: RegionalSalesObservation,
  endYear: number,
  populationMillions: number,
  annualPopulationGrowth: number,
  fit: Omit<StockAdoptionFit, 'developmentMape'>,
): Map<number, number> {
  let population = populationMillions;
  let stock = first.annualUnits * fit.initialStockMultiple;
  const path = new Map<number, number>();
  for (let year = first.year; year <= endYear; year++) {
    if (year > first.year) {
      population *= 1 + annualPopulationGrowth;
    }
    const replacement = stock / fit.replacementYears;
    let sales: number;
    let newAdoption: number;
    if (year === first.year) {
      sales = first.annualUnits;
      newAdoption = Math.max(0, sales - replacement);
    } else {
      const targetStock =
        population *
        1_000_000 *
        (fit.saturationStockPerThousandPeople / 1_000);
      const remaining = Math.max(0, targetStock - stock);
      const adoptionFraction =
        targetStock > 0 ? Math.min(1, stock / targetStock) : 1;
      newAdoption = Math.min(
        remaining,
        Math.max(
          0,
          (fit.innovationRate + fit.imitationRate * adoptionFraction) *
            remaining,
        ),
      );
      sales = replacement + newAdoption;
    }
    path.set(year, sales);
    stock = Math.max(0, stock + newAdoption);
  }
  return path;
}

function fitStockAdoption(
  observations: readonly RegionalSalesObservation[],
  spec: RegionalBacktestSpec,
): StockAdoptionFit {
  const development = observations.filter((row) => row.role === 'development');
  const first = development[0];
  const lastYear = Math.max(...development.map((row) => row.year));
  let best: StockAdoptionFit | null = null;
  for (const initialStockMultiple of [4, 6, 8, 10, 12, 15, 18]) {
    for (const saturationStockPerThousandPeople of [
      100, 150, 200, 250, 300, 350,
    ]) {
      for (const innovationRate of [0, 0.0002, 0.0005, 0.001, 0.002]) {
        for (const imitationRate of [
          0.004, 0.008, 0.012, 0.02, 0.03, 0.04, 0.06, 0.08,
        ]) {
          for (const replacementYears of [8, 10, 12, 15, 18, 20]) {
            const params = {
              initialStockMultiple,
              saturationStockPerThousandPeople,
              innovationRate,
              imitationRate,
              replacementYears,
            };
            const path = simulateStockPath(
              first,
              lastYear,
              spec.populationMillions,
              spec.annualPopulationGrowth,
              params,
            );
            const errors = development
              .slice(1)
              .map((row) =>
                absolutePercentageError(path.get(row.year)!, row.annualUnits),
              );
            // A tiny complexity penalty breaks near-ties toward slower,
            // replacement-supported diffusion rather than explosive q values.
            const score =
              mean(errors) +
              0.002 * imitationRate +
              0.0001 * saturationStockPerThousandPeople / 1_000;
            if (best === null || score < best.developmentMape) {
              best = { ...params, developmentMape: score };
            }
          }
        }
      }
    }
  }
  if (best === null) throw new Error(`No stock-adoption fit for ${spec.region}`);
  return best;
}

/**
 * Frozen development/holdout exercise. It tests whether stock, replacement,
 * and saturation dynamics improve on the tempting extrapolation of recent
 * unit-sales growth. Source boundaries are preserved on every row.
 */
export function backtestEbikeAdoption(): AdoptionBacktest {
  const specs: readonly RegionalBacktestSpec[] = [
    { region: 'eu', populationMillions: 515, annualPopulationGrowth: -0.001 },
    { region: 'japan', populationMillions: 128, annualPopulationGrowth: -0.004 },
  ];
  const rows: AdoptionBacktestRow[] = [];
  const fittedParams = {} as Record<'eu' | 'japan', StockAdoptionFit>;
  for (const spec of specs) {
    const observations = regionalSalesHistory
      .filter(
        (row) =>
          row.region === spec.region &&
          (row.role === 'development' || row.role === 'holdout'),
      )
      .sort((left, right) => left.year - right.year);
    const development = observations.filter(
      (row) => row.role === 'development',
    );
    const holdouts = observations.filter((row) => row.role === 'holdout');
    const first = development[0];
    const last = development.at(-1)!;
    const fit = fitStockAdoption(observations, spec);
    fittedParams[spec.region] = fit;
    const stockPath = simulateStockPath(
      first,
      holdouts.at(-1)!.year,
      spec.populationMillions,
      spec.annualPopulationGrowth,
      fit,
    );
    const naiveGrowth = annualizedGrowth(first, last);
    for (const row of holdouts) {
      const naive =
        last.annualUnits *
        Math.pow(1 + naiveGrowth, row.year - last.year);
      const stockReplacement = stockPath.get(row.year)!;
      rows.push({
        region: spec.region,
        year: row.year,
        boundary: row.boundary,
        observedUnits: row.annualUnits,
        naiveExponentialUnits: naive,
        stockReplacementUnits: stockReplacement,
        naiveAbsolutePercentageError: absolutePercentageError(
          naive,
          row.annualUnits,
        ),
        stockReplacementAbsolutePercentageError: absolutePercentageError(
          stockReplacement,
          row.annualUnits,
        ),
      });
    }
  }
  return {
    rows,
    naiveMeanAbsolutePercentageError: mean(
      rows.map((row) => row.naiveAbsolutePercentageError),
    ),
    stockReplacementMeanAbsolutePercentageError: mean(
      rows.map((row) => row.stockReplacementAbsolutePercentageError),
    ),
    fittedParams,
    notes: [
      'EU rows are retail sales; Japan rows are factory shipments. The errors are compared within source boundary, never as one pooled level series.',
      'The exercise is sparse and validates the shape of a replacement-and-saturation model, not the 2040 regional point estimates.',
    ],
  };
}

export interface SupplierCalibrationRow {
  supplier: 'bafang' | 'ananda';
  disclosedUnits: number;
  modeledComparableTarget: number;
  modeledUnits: number;
  errorVersusComparableTarget: number;
  grossMargin: number | null;
}

export interface SupplierCalibration {
  year: 2024;
  rows: readonly SupplierCalibrationRow[];
  meanAbsolutePercentageError: number;
}

/**
 * Check the inferred regional share table against the two public companies
 * that disclose enough product volume to construct a global comparator.
 */
export function evaluateSupplierVolumeCalibration(): SupplierCalibration {
  const result = simulateEbikeMotorMarket(
    ebikeMotorScenarios['product-only'],
  );
  const base = result.years[0];
  const rows = supplierDisclosures.map((disclosure) => {
    if (disclosure.supplier !== 'bafang' && disclosure.supplier !== 'ananda') {
      throw new Error('Unexpected supplier disclosure');
    }
    const modeledUnits = base.supplierVolumes[disclosure.supplier];
    return {
      supplier: disclosure.supplier,
      disclosedUnits: disclosure.disclosedUnits,
      modeledComparableTarget: disclosure.modeledComparableUnits,
      modeledUnits,
      errorVersusComparableTarget: absolutePercentageError(
        modeledUnits,
        disclosure.modeledComparableUnits,
      ),
      grossMargin: disclosure.grossMargin,
    };
  });
  return {
    year: 2024,
    rows,
    meanAbsolutePercentageError: mean(
      rows.map((row) => row.errorVersusComparableTarget),
    ),
  };
}

export interface EntrantDecisionMetrics {
  endingAnnualUnits: number;
  endingRevenueMillion: number;
  endingOperatingMargin: number;
  firstOperatingBreakevenYear: number | null;
  cashPaybackYear: number | null;
  peakFundingNeedMillion: number;
  explicitHorizonNpvMillion: number;
  enterpriseNpvMillion: number;
  commercialWin: boolean;
  capitalEfficientWin: boolean;
}

export interface EntrantSensitivityRow {
  lever: string;
  lowerLabel: string;
  centralLabel: string;
  upperLabel: string;
  lower: EntrantDecisionMetrics;
  central: EntrantDecisionMetrics;
  upper: EntrantDecisionMetrics;
  operatingIncomeSpreadMillion: number;
}

function decisionMetrics(
  entrant: EntrantStrategy,
): EntrantDecisionMetrics & { endingOperatingIncomeMillion: number } {
  const result = simulateEbikeMotorMarket(
    makeEbikeMotorScenario(entrant, { endYear: 2045 }),
  );
  const commercialWin =
    result.endingAnnualUnits >= 250_000 &&
    result.endingOperatingMargin >= 0.15;
  return {
    endingAnnualUnits: result.endingAnnualUnits,
    endingRevenueMillion: result.endingRevenueMillion,
    endingOperatingMargin: result.endingOperatingMargin,
    firstOperatingBreakevenYear: result.firstOperatingBreakevenYear,
    cashPaybackYear: result.cashPaybackYear,
    peakFundingNeedMillion: result.peakFundingNeedMillion,
    explicitHorizonNpvMillion: result.explicitHorizonNpvMillion,
    enterpriseNpvMillion: result.enterpriseNpvMillion,
    commercialWin,
    capitalEfficientWin:
      commercialWin &&
      result.cashPaybackYear !== null &&
      result.peakFundingNeedMillion <= 300 &&
      result.enterpriseNpvMillion >= 0,
    endingOperatingIncomeMillion: result.endingOperatingIncomeMillion,
  };
}

function scaleFixedCosts(
  entrant: EntrantStrategy,
  multiplier: number,
): EntrantStrategy {
  return {
    ...entrant,
    preLaunchAnnualResearchMillion:
      entrant.preLaunchAnnualResearchMillion * multiplier,
    postLaunchAnnualResearchMillion:
      entrant.postLaunchAnnualResearchMillion * multiplier,
    annualSalesAndServiceMillion:
      entrant.annualSalesAndServiceMillion * multiplier,
    annualGeneralAdminMillion:
      entrant.annualGeneralAdminMillion * multiplier,
    engineeringMillionPerOemWin:
      entrant.engineeringMillionPerOemWin * multiplier,
  };
}

function sensitivityRow(
  lever: string,
  lowerLabel: string,
  lowerEntrant: EntrantStrategy,
  centralLabel: string,
  centralEntrant: EntrantStrategy,
  upperLabel: string,
  upperEntrant: EntrantStrategy,
): EntrantSensitivityRow {
  const lowerWithIncome = decisionMetrics(lowerEntrant);
  const centralWithIncome = decisionMetrics(centralEntrant);
  const upperWithIncome = decisionMetrics(upperEntrant);
  const { endingOperatingIncomeMillion: lowerIncome, ...lower } =
    lowerWithIncome;
  const { endingOperatingIncomeMillion: centralIncome, ...central } =
    centralWithIncome;
  const { endingOperatingIncomeMillion: upperIncome, ...upper } =
    upperWithIncome;
  void centralIncome;
  return {
    lever,
    lowerLabel,
    centralLabel,
    upperLabel,
    lower,
    central,
    upper,
    operatingIncomeSpreadMillion: Math.abs(upperIncome - lowerIncome),
  };
}

/**
 * One-at-a-time decision sensitivity around the full-stack entrant. "Upper"
 * means more favorable to the entrant, not necessarily a numerically larger
 * input. The ranking uses 2045 operating-income spread.
 */
export function analyzeEntrantSensitivity(): readonly EntrantSensitivityRow[] {
  const central = entrantStrategies['full-stack'];
  const rows = [
    sensitivityRow(
      'fixed operating cost',
      '130% of central',
      scaleFixedCosts(central, 1.3),
      '100% of central',
      central,
      '60% of central',
      scaleFixedCosts(central, 0.6),
    ),
    sensitivityRow(
      'unit economics',
      '$380 ASP / $315 initial variable cost / 6% warranty',
      {
        ...central,
        averageSellingPriceDollars: 380,
        initialVariableCostDollars: 315,
        warrantyRevenueShare: 0.06,
        annualServiceCostPerActiveUnitDollars: 7,
      },
      '$420 / $285 / 4%',
      central,
      '$460 ASP / $260 initial variable cost / 2.5% warranty',
      {
        ...central,
        averageSellingPriceDollars: 460,
        initialVariableCostDollars: 260,
        warrantyRevenueShare: 0.025,
        annualServiceCostPerActiveUnitDollars: 3,
      },
    ),
    sensitivityRow(
      'OEM program wins',
      '1 new OEM program/year',
      { ...central, annualOemWins: 1 },
      '3/year',
      central,
      '6/year',
      { ...central, annualOemWins: 6 },
    ),
    sensitivityRow(
      'mature units per OEM program',
      '12,000/year',
      { ...central, matureUnitsPerOem: 12_000 },
      '22,000/year',
      central,
      '35,000/year',
      { ...central, matureUnitsPerOem: 35_000 },
    ),
    sensitivityRow(
      'contestable share',
      '8% ceiling',
      { ...central, maxAddressableShare: 0.08 },
      '14% ceiling',
      central,
      '22% ceiling',
      { ...central, maxAddressableShare: 0.22 },
    ),
    sensitivityRow(
      'commercial system quality',
      'thin service, integration, and bankability',
      {
        ...central,
        serviceScore: 0.55,
        integrationScore: 0.65,
        bankabilityScore: 0.45,
      },
      'central full-stack scores',
      central,
      'incumbent-grade commercial system',
      {
        ...central,
        serviceScore: 0.95,
        integrationScore: 1,
        bankabilityScore: 0.95,
      },
    ),
    sensitivityRow(
      'factory scale',
      '300,000 maximum units/year',
      {
        ...central,
        annualCapacityGrowth: 0.40,
        maximumAnnualCapacity: 300_000,
      },
      '650,000/year',
      central,
      '1,000,000 maximum units/year',
      {
        ...central,
        annualCapacityGrowth: 0.80,
        maximumAnnualCapacity: 1_000_000,
      },
    ),
  ];
  return rows.sort(
    (left, right) =>
      right.operatingIncomeSpreadMillion - left.operatingIncomeSpreadMillion,
  );
}

export interface EntrantThresholdRow {
  annualOemWins: number;
  fixedCostMultiplier: number;
  metrics: EntrantDecisionMetrics;
}

/**
 * Compact decision surface for the two levers founders can most directly
 * control: qualified customer throughput and organizational burn.
 */
export function mapEntrantDecisionSurface(): readonly EntrantThresholdRow[] {
  const central = entrantStrategies['full-stack'];
  const rows: EntrantThresholdRow[] = [];
  for (const annualOemWins of [1, 2, 3, 4]) {
    for (const fixedCostMultiplier of [0.5, 0.7, 0.9, 1]) {
      const { endingOperatingIncomeMillion, ...metrics } = decisionMetrics(
        scaleFixedCosts(
          { ...central, annualOemWins },
          fixedCostMultiplier,
        ),
      );
      void endingOperatingIncomeMillion;
      rows.push({ annualOemWins, fixedCostMultiplier, metrics });
    }
  }
  return rows;
}

export interface GeographicScopeRow {
  scope: 'us-only' | 'us-eu' | 'us-eu-row' | 'global';
  includedRegions: readonly EbikeRegion[];
  metrics: EntrantDecisionMetrics;
}

/**
 * Tests whether "U.S. company" can also mean "U.S.-only company." The same
 * product and organization are held fixed while contestable foreign demand is
 * switched off.
 */
export function analyzeEntrantGeographicScope(): readonly GeographicScopeRow[] {
  const scopes: readonly Pick<
    GeographicScopeRow,
    'scope' | 'includedRegions'
  >[] = [
    { scope: 'us-only', includedRegions: ['us'] },
    { scope: 'us-eu', includedRegions: ['us', 'eu'] },
    { scope: 'us-eu-row', includedRegions: ['us', 'eu', 'row'] },
    { scope: 'global', includedRegions: ['us', 'eu', 'china', 'japan', 'row'] },
  ];
  return scopes.map(({ scope, includedRegions }) => {
    const scenario = structuredClone(ebikeMotorScenarios['full-stack']);
    scenario.id = `e-bike-motors-full-stack-${scope}`;
    scenario.label = `Full-stack entrant: ${scope}`;
    for (const region of EBIKE_REGIONS) {
      if (!includedRegions.includes(region)) {
        scenario.regions[region].entrantOpenness = {
          hub: 0,
          'mid-drive': 0,
        };
      }
    }
    const result = simulateEbikeMotorMarket(scenario);
    const commercialWin =
      result.endingAnnualUnits >= 250_000 &&
      result.endingOperatingMargin >= 0.15;
    return {
      scope,
      includedRegions,
      metrics: {
        endingAnnualUnits: result.endingAnnualUnits,
        endingRevenueMillion: result.endingRevenueMillion,
        endingOperatingMargin: result.endingOperatingMargin,
        firstOperatingBreakevenYear: result.firstOperatingBreakevenYear,
        cashPaybackYear: result.cashPaybackYear,
        peakFundingNeedMillion: result.peakFundingNeedMillion,
        explicitHorizonNpvMillion: result.explicitHorizonNpvMillion,
        enterpriseNpvMillion: result.enterpriseNpvMillion,
        commercialWin,
        capitalEfficientWin:
          commercialWin &&
          result.cashPaybackYear !== null &&
          result.peakFundingNeedMillion <= 300 &&
          result.enterpriseNpvMillion >= 0,
      },
    };
  });
}

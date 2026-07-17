/**
 * First Japan development-window test on the frozen municipal geography.
 *
 * This is deliberately a demographic-channel audit, not japan-model-v1. It
 * tests the US mechanism's frozen regeneration/vitality terms while the
 * institutional, human-capital, gateway, housing, and price constructs are
 * still being assembled. It reads no outcome after 2020.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, readCsvAuto, writeCsv } from '../../scripts/lib.js';
import { columnStats, fitRidge, predictLinear, standardize } from '../../src/scoring.js';
import {
  bootstrapDifference,
  conditionalWorkingAllocation,
  evaluateLocal,
  marketFold,
  percentileStandardize,
  type LocalEvaluation,
} from '../src/validation.js';

const JAPAN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(JAPAN_DIR, 'data');
const MIN_POPULATION = 10_000;
const MIN_MARKET_UNITS = 5;
const YEARS = 5;

interface PanelRow {
  code: string;
  prefecture: string;
  name: string;
  values: Record<string, number | null>;
}

interface WindowConfig {
  originYear: 2010 | 2015;
  endpointYear: 2015 | 2020;
  boundaryExactRequired: boolean;
  populationOrigin: string;
  originWorking: string;
  endpointWorking: string;
  carryWorkingChange: string;
  workingOutcome: string;
  householdOutcome: string;
  laggedPopulation: string;
  laggedHousehold: string | null;
  replacementRatio: string;
  olderShare: string;
}

interface PreparedUnit {
  panel: PanelRow;
  market: string;
  population: number;
  originWorking: number;
  endpointWorking: number;
  demographicEndpoint: number;
  workingOutcome: number;
  householdOutcome: number | null;
  laggedPopulation: number | null;
  laggedHousehold: number | null;
  replacementRatio: number;
  youngWorkingShare: number;
  midlifeShare: number;
  olderShare: number;
  logDensity: number;
  logPopulation: number;
  annualMoverRate: number;
  attraction: number;
  conditionalWorking: number;
  nationallyScaledNoMigration: number;
  localWorkingRidge: number;
  localHouseholdRidge: number;
}

const WINDOWS: WindowConfig[] = [
  {
    originYear: 2010,
    endpointYear: 2015,
    boundaryExactRequired: true,
    populationOrigin: 'population2010',
    originWorking: 'working20_64_2010',
    endpointWorking: 'working20_64_2015',
    carryWorkingChange: 'demographicCarryLogChange2010_2015',
    workingOutcome: 'workingAgeLogChange2010_2015',
    householdOutcome: 'privateHouseholdLogChange2010_2015',
    laggedPopulation: 'laggedPopulationLogChange2005_2010',
    laggedHousehold: null,
    replacementRatio: 'replacementRatio2010',
    olderShare: 'olderShare2010',
  },
  {
    originYear: 2015,
    endpointYear: 2020,
    boundaryExactRequired: false,
    populationOrigin: 'population2015',
    originWorking: 'working20_64_2015',
    endpointWorking: 'working20_64_2020',
    carryWorkingChange: 'demographicCarryLogChange2015_2020',
    workingOutcome: 'workingAgeLogChange2015_2020',
    householdOutcome: 'privateHouseholdLogChange2015_2020',
    laggedPopulation: 'populationLogChange2010_2015',
    laggedHousehold: 'privateHouseholdLogChange2010_2015',
    replacementRatio: 'replacementRatio2015',
    olderShare: 'olderShare2015',
  },
];

function loadPanel(): PanelRow[] {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, 'census-2010-2020.csv')));
  const header = rows[0];
  const at = (name: string): number => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`Japan census panel is missing ${name}`);
    return index;
  };
  const code = at('code2020');
  const prefecture = at('prefecture');
  const name = at('name');
  return rows.slice(1).map((row) => {
    const values: Record<string, number | null> = {};
    for (let i = 0; i < header.length; i++) {
      if (i === code || i === prefecture || i === name) continue;
      const parsed = row[i] === '' ? NaN : Number(row[i]);
      values[header[i]] = Number.isFinite(parsed) ? parsed : null;
    }
    return { code: row[code], prefecture: row[prefecture], name: row[name], values };
  });
}

function loadMarkets(year: 2010 | 2015): Map<string, string> {
  const rows = parseCsv(readCsvAuto(path.join(DATA_DIR, `commuting-markets${year}.csv`)));
  const header = rows[0];
  const code = header.indexOf('code2020');
  const market = header.indexOf(`market${year}`);
  if (code < 0 || market < 0) throw new Error(`${year} market file has an invalid header`);
  return new Map(rows.slice(1).map((row) => [row[code], row[market]]));
}

function required(row: PanelRow, name: string): number {
  const value = row.values[name];
  if (value === null || value === undefined || !Number.isFinite(value)) {
    throw new Error(`${row.code}: missing required ${name}`);
  }
  return value;
}

function optional(row: PanelRow, name: string | null): number | null {
  if (name === null) return null;
  const value = row.values[name];
  return value !== null && value !== undefined && Number.isFinite(value) ? value : null;
}

function maybePrepared(
  panel: PanelRow,
  config: WindowConfig,
  market: string | undefined,
): Omit<PreparedUnit, 'attraction' | 'conditionalWorking' | 'nationallyScaledNoMigration' | 'localWorkingRidge' | 'localHouseholdRidge'> | null {
  if (!market) return null;
  const value = (name: string): number | null => optional(panel, name);
  const population = value(config.populationOrigin);
  const originWorking = value(config.originWorking);
  const endpointWorking = value(config.endpointWorking);
  const carry = value(config.carryWorkingChange);
  const workingOutcome = value(config.workingOutcome);
  const replacementRatio = value(config.replacementRatio);
  const olderShare = value(config.olderShare);
  const age20_24 = value(`age20_24_${config.originYear}`);
  const age20_34 = value(`age20_34_${config.originYear}`);
  const age25_44 = value(`age25_44_${config.originYear}`);
  const age45_59 = value(`age45_59_${config.originYear}`);
  const age60_64 = value(`age60_64_${config.originYear}`);
  const density = value(`density${config.originYear}`);
  const requiredValues = [
    population, originWorking, endpointWorking, carry, workingOutcome,
    replacementRatio, olderShare, age20_24, age20_34, age25_44, age45_59, age60_64, density,
  ];
  if (requiredValues.some((current) => current === null)) return null;
  if ((population ?? 0) <= 0 || (originWorking ?? 0) <= 0 || (endpointWorking ?? 0) <= 0) return null;
  const youngWorking = (age20_24 ?? 0) + (age25_44 ?? 0);
  const midlife = (age45_59 ?? 0) + (age60_64 ?? 0);
  const working = youngWorking + midlife;
  return {
    panel,
    market,
    population: population!,
    originWorking: originWorking!,
    endpointWorking: endpointWorking!,
    demographicEndpoint: originWorking! * Math.exp(carry!),
    workingOutcome: workingOutcome!,
    householdOutcome: optional(panel, config.householdOutcome),
    laggedPopulation: optional(panel, config.laggedPopulation),
    laggedHousehold: optional(panel, config.laggedHousehold),
    replacementRatio: replacementRatio!,
    youngWorkingShare: age20_34! / population!,
    midlifeShare: midlife / population!,
    olderShare: olderShare!,
    logDensity: Math.log1p(density!),
    logPopulation: Math.log(population!),
    annualMoverRate: working > 0 ? (0.025 * youngWorking + 0.015 * midlife) / working : 0.02,
  };
}

function centerByMarket(units: PreparedUnit[], outcome: (unit: PreparedUnit) => number): number[] {
  const totals = new Map<string, { total: number; n: number }>();
  for (const unit of units) {
    const current = totals.get(unit.market) ?? { total: 0, n: 0 };
    current.total += outcome(unit);
    current.n++;
    totals.set(unit.market, current);
  }
  return units.map((unit) => {
    const group = totals.get(unit.market)!;
    return outcome(unit) - group.total / group.n;
  });
}

function featureMatrix(units: PreparedUnit[]): number[][] {
  return units.map((unit) => [
    unit.replacementRatio,
    unit.youngWorkingShare,
    unit.midlifeShare,
    unit.olderShare,
    unit.logDensity,
    unit.logPopulation,
  ]);
}

function outOfFoldRidge(
  units: PreparedUnit[],
  year: number,
  outcome: (unit: PreparedUnit) => number,
): number[] {
  const matrix = featureMatrix(units);
  const target = centerByMarket(units, outcome);
  const result = new Array(units.length).fill(NaN);
  for (let fold = 0; fold < 5; fold++) {
    const train = units.map((_, index) => index)
      .filter((index) => marketFold(year, units[index].market) !== fold);
    const test = units.map((_, index) => index)
      .filter((index) => marketFold(year, units[index].market) === fold);
    const stats = columnStats(train.map((index) => matrix[index]));
    const zTrain = standardize(train.map((index) => matrix[index]), stats.means, stats.sds);
    const zTest = standardize(test.map((index) => matrix[index]), stats.means, stats.sds);
    const model = fitRidge(zTrain, train.map((index) => target[index]), 1e-2);
    const prediction = predictLinear(zTest, model);
    test.forEach((index, position) => { result[index] = prediction[position]; });
  }
  return result;
}

function local(
  units: PreparedUnit[],
  score: (unit: PreparedUnit) => number,
  outcome: (unit: PreparedUnit) => number,
): LocalEvaluation {
  return evaluateLocal(units.map((unit) => ({
    market: unit.market,
    score: score(unit),
    outcome: outcome(unit),
  })), MIN_MARKET_UNITS);
}

function maeAnnualized(
  units: PreparedUnit[],
  prediction: (unit: PreparedUnit) => number,
  outcome: (unit: PreparedUnit) => number,
): number | null {
  const errors = units.map((unit) => Math.abs(prediction(unit) - outcome(unit)) / YEARS);
  return errors.length > 0
    ? +(errors.reduce((sum, value) => sum + value, 0) / errors.length).toFixed(5)
    : null;
}

function publicMetrics(evaluation: LocalEvaluation): ReturnType<typeof evaluateLocal>['metrics'] {
  return evaluation.metrics;
}

function analyzeWindow(panel: PanelRow[], config: WindowConfig): {
  summary: Record<string, unknown>;
  units: PreparedUnit[];
} {
  const marketByCode = loadMarkets(config.originYear);
  const prelim = panel.map((row) => maybePrepared(row, config, marketByCode.get(row.code)))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const rep = percentileStandardize(prelim.map((unit) => unit.replacementRatio));
  const midlife = percentileStandardize(prelim.map((unit) => unit.midlifeShare));
  const vitality = percentileStandardize(prelim.map((unit) => unit.youngWorkingShare));
  const attractions = prelim.map((_, index) => (
    0.15 * (0.6 * rep[index] - 0.4 * midlife[index]) + 0.15 * vitality[index]
  ));
  const allocation = conditionalWorkingAllocation(prelim.map((unit, index) => ({
    originWorking: unit.originWorking,
    demographicEndpoint: unit.demographicEndpoint,
    observedEndpoint: unit.endpointWorking,
    attraction: attractions[index],
    annualMoverRate: unit.annualMoverRate,
  })));
  const units: PreparedUnit[] = prelim.map((unit, index) => ({
    ...unit,
    attraction: attractions[index],
    conditionalWorking: allocation.predictedLogChange[index],
    nationallyScaledNoMigration: Math.log(
      unit.demographicEndpoint * allocation.baselineScaleToObservedNationalTotal / unit.originWorking,
    ),
    localWorkingRidge: NaN,
    localHouseholdRidge: NaN,
  }));

  const primary = units.filter((unit) => (
    unit.population >= MIN_POPULATION
    && (!config.boundaryExactRequired || unit.panel.values.boundaryExact2010 === 1)
  ));
  const workingCommon = primary.filter((unit) => unit.laggedPopulation !== null);
  const workingRidge = outOfFoldRidge(
    workingCommon,
    config.originYear,
    (unit) => unit.workingOutcome,
  );
  workingCommon.forEach((unit, index) => { unit.localWorkingRidge = workingRidge[index]; });

  const workingScores: Record<string, LocalEvaluation> = {
    conditionalDemographicAllocation: local(
      workingCommon, (unit) => unit.conditionalWorking, (unit) => unit.workingOutcome,
    ),
    noMigrationAging: local(
      workingCommon,
      (unit) => Math.log(unit.demographicEndpoint / unit.originWorking),
      (unit) => unit.workingOutcome,
    ),
    nationallyScaledNoMigration: local(
      workingCommon, (unit) => unit.nationallyScaledNoMigration, (unit) => unit.workingOutcome,
    ),
    laggedPopulationTrend: local(
      workingCommon, (unit) => unit.laggedPopulation!, (unit) => unit.workingOutcome,
    ),
    ageStructureScore: local(
      workingCommon, (unit) => unit.attraction, (unit) => unit.workingOutcome,
    ),
    localDemographicRidge: local(
      workingCommon, (unit) => unit.localWorkingRidge, (unit) => unit.workingOutcome,
    ),
  };
  const mechanismDifference = bootstrapDifference(
    workingScores.conditionalDemographicAllocation.spearmanByMarket,
    workingScores.laggedPopulationTrend.spearmanByMarket,
  );
  const attractionIncrement = bootstrapDifference(
    workingScores.conditionalDemographicAllocation.spearmanByMarket,
    workingScores.nationallyScaledNoMigration.spearmanByMarket,
  );

  const householdOutcome = primary.filter((unit) => unit.householdOutcome !== null);
  const householdCommon = config.laggedHousehold === null
    ? householdOutcome.filter((unit) => unit.laggedPopulation !== null)
    : householdOutcome.filter((unit) => unit.laggedPopulation !== null && unit.laggedHousehold !== null);
  const householdRidge = outOfFoldRidge(
    householdCommon,
    config.originYear,
    (unit) => unit.householdOutcome!,
  );
  householdCommon.forEach((unit, index) => { unit.localHouseholdRidge = householdRidge[index]; });
  const householdScores: Record<string, LocalEvaluation> = {
    ageStructureScore: local(
      householdCommon, (unit) => unit.attraction, (unit) => unit.householdOutcome!,
    ),
    laggedPopulationTrend: local(
      householdCommon, (unit) => unit.laggedPopulation!, (unit) => unit.householdOutcome!,
    ),
    localDemographicRidge: local(
      householdCommon, (unit) => unit.localHouseholdRidge, (unit) => unit.householdOutcome!,
    ),
  };
  if (config.laggedHousehold !== null) {
    householdScores.laggedHouseholdTrend = local(
      householdCommon, (unit) => unit.laggedHousehold!, (unit) => unit.householdOutcome!,
    );
  }

  return {
    units,
    summary: {
      window: `${config.originYear}-${config.endpointYear}`,
      status: 'development-only demographic-channel audit; not the full international mechanism',
      universe: {
        frozenBoundaryUnits: panel.length,
        allocationCoverageUnits: units.length,
        primaryPopulation10kUnits: primary.length,
        exactLaggedPopulationCommonUnits: workingCommon.length,
        householdCommonUnits: householdCommon.length,
        boundaryInexactExcluded: config.boundaryExactRequired
          ? units.filter((unit) => unit.population >= MIN_POPULATION && unit.panel.values.boundaryExact2010 !== 1).length
          : 0,
      },
      conditionalAllocation: {
        endpointNationalTotalIsObserved: true,
        municipalEndpointSharesArePredicted: true,
        baselineScaleToObservedNationalTotal: +allocation.baselineScaleToObservedNationalTotal.toFixed(6),
        effectiveAnnualMoverRate: +allocation.effectiveAnnualMoverRate.toFixed(6),
        fiveYearMovedFraction: +allocation.fiveYearMovedFraction.toFixed(6),
        observedEndpointTotal: +allocation.observedEndpointTotal.toFixed(3),
        conservationError: +(allocation.predictedEndpointTotal - allocation.observedEndpointTotal).toFixed(8),
      },
      workingAge: {
        outcome: 'annualized log change in population age 20-64',
        absoluteMaeAllPrimary: {
          n: primary.length,
          conditionalDemographicAllocation: maeAnnualized(
            primary, (unit) => unit.conditionalWorking, (unit) => unit.workingOutcome,
          ),
          noMigrationAging: maeAnnualized(
            primary,
            (unit) => Math.log(unit.demographicEndpoint / unit.originWorking),
            (unit) => unit.workingOutcome,
          ),
          nationallyScaledNoMigration: maeAnnualized(
            primary, (unit) => unit.nationallyScaledNoMigration, (unit) => unit.workingOutcome,
          ),
        },
        localLaggedPopulationCommonSample: Object.fromEntries(
          Object.entries(workingScores).map(([name, evaluation]) => [name, publicMetrics(evaluation)]),
        ),
        conditionalMechanismMinusLaggedPopulation: mechanismDifference,
        conditionalMechanismMinusNationallyScaledNoMigration: attractionIncrement,
      },
      households: {
        outcome: 'annualized log change in private households',
        laggedHouseholdComparator: config.laggedHousehold === null
          ? 'not available for this window in the current panel'
          : {
              absoluteMae: maeAnnualized(
                householdCommon, (unit) => unit.laggedHousehold!, (unit) => unit.householdOutcome!,
              ),
            },
        localExactCommonSample: Object.fromEntries(
          Object.entries(householdScores).map(([name, evaluation]) => [name, publicMetrics(evaluation)]),
        ),
      },
    },
  };
}

function main(): void {
  const panel = loadPanel();
  if (panel.length !== 1741) throw new Error(`expected 1,741 frozen-boundary units, found ${panel.length}`);
  const analyses = WINDOWS.map((window) => analyzeWindow(panel, window));
  const workingMeans = analyses.map((analysis) => {
    const working = analysis.summary.workingAge as Record<string, unknown>;
    const scores = working.localLaggedPopulationCommonSample as Record<string, Record<string, number | null>>;
    return scores.conditionalDemographicAllocation.meanWithinMarketSpearman;
  });
  const result = {
    protocol: 'docs/INTERNATIONAL_PANEL.md committed at ec2869b before post-2020 acquisition',
    holdoutStatus: 'sealed; this script reads no outcome after 2020',
    scope: {
      included: [
        'frozen US demographic regeneration and young-vitality attraction terms',
        'frozen US working mover rates and beta',
        'origin-year 10% commuting basins',
        'no-migration, lagged-trend, and demographic-ridge comparators',
      ],
      stillMissingForJapanModelV1: [
        'institutional engines', 'human capital', 'foreign-resident gateway',
        'radius-based market access', 'housing supply and vacancy', 'land prices',
      ],
      claim: 'feasibility diagnostic only; cannot earn the internationally validated label',
    },
    mechanismFormula: {
      standardization: 'centered unit-SD percentile ranks in the origin cross-section',
      workingAttraction: '0.15 * (0.6 * replacementRatio - 0.4 * share45_64) + 0.15 * youngWorkingShare',
      replacementRatio: 'population age 25-44 / population age 65+',
      youngWorkingShare: 'population age 20-34 / total population',
      allocation: 'national-total-conditioned five-year closed reallocation; beta=0.5; cohort-weighted 2.5% young-working and 1.5% midlife annual mover rates',
    },
    adjacentWindowSignStable: workingMeans.every((value) => value !== null)
      && Math.sign(workingMeans[0]!) === Math.sign(workingMeans[1]!),
    windows: analyses.map((analysis) => analysis.summary),
  };
  const target = path.join(DATA_DIR, 'development-demography.json');
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');

  const localityRows = analyses.flatMap((analysis, windowIndex) => {
    const config = WINDOWS[windowIndex];
    return analysis.units.map((unit) => [
      config.originYear,
      config.endpointYear,
      unit.panel.code,
      unit.panel.prefecture,
      unit.panel.name,
      unit.market,
      unit.population,
      unit.panel.values.boundaryExact2010,
      unit.workingOutcome,
      unit.conditionalWorking,
      Math.log(unit.demographicEndpoint / unit.originWorking),
      unit.nationallyScaledNoMigration,
      unit.laggedPopulation,
      unit.attraction,
      Number.isFinite(unit.localWorkingRidge) ? unit.localWorkingRidge : null,
      unit.householdOutcome,
      unit.laggedHousehold,
      Number.isFinite(unit.localHouseholdRidge) ? unit.localHouseholdRidge : null,
    ]);
  });
  writeCsv(
    path.join(DATA_DIR, 'development-demography-localities.csv.gz'),
    [
      'originYear', 'endpointYear', 'code2020', 'prefecture', 'name', 'market',
      'originPopulation', 'boundaryExact2010', 'workingAgeLogChangeObserved',
      'workingAgeLogChangeConditionalDemographic', 'workingAgeLogChangeNoMigration',
      'workingAgeLogChangeNationallyScaledNoMigration', 'laggedPopulationLogChange',
      'demographicAttraction', 'localWorkingRidgeOof', 'privateHouseholdLogChangeObserved',
      'laggedPrivateHouseholdLogChange', 'localHouseholdRidgeOof',
    ],
    localityRows,
  );
  console.log(`wrote ${target}`);
  console.log(JSON.stringify({
    adjacentWindowSignStable: result.adjacentWindowSignStable,
    windows: result.windows.map((window) => ({
      window: window.window,
      workingAge: window.workingAge,
      households: window.households,
    })),
  }, null, 2));
}

main();

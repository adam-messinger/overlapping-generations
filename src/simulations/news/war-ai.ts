import { REGIONS, type Region } from '../../domain-types.js';
import { deepMerge } from '../../scenario.js';
import {
  runSimulation,
  type SimulationParams,
  type SimulationResult,
  type YearResult,
} from '../../simulation.js';
import {
  buildHormuzGlobalOverrides,
} from '../critical-materials/hormuz-bridge.js';
import { calibrateHormuzModel } from '../critical-materials/hormuz-calibration.js';
import {
  hormuzScenarios,
  type HormuzScenarioId,
} from '../critical-materials/hormuz-data.js';
import { simulateHormuzDisruption } from '../critical-materials/hormuz-model.js';

export interface WarAiExperimentOptions {
  baseParams?: SimulationParams;
  aiParams: SimulationParams;
  hormuzScenario?: HormuzScenarioId;
  endYear?: number;
}

export interface WarAiPaths {
  baseline: SimulationResult;
  aiOnly: SimulationResult;
  warOnly: SimulationResult;
  warAndAi: SimulationResult;
}

export interface WarAiYearResult {
  year: number;
  baselineGdp: number;
  aiOnlyGdp: number;
  warOnlyGdp: number;
  warAndAiGdp: number;
  /** War effect relative to the matched no-war path, in percent. */
  warGdpEffectWithoutAiPct: number;
  /** War effect relative to the matched AI path, in percent. */
  warGdpEffectWithAiPct: number;
  /** Positive means AI makes the war GDP loss less severe. */
  aiCushionPctPoints: number;
  /** Difference-in-differences in GDP levels, $T. */
  gdpInteraction: number;
  dataCenterLoadTWh: number;
  dataCenterCapexSpend: number;
  combinedInvestment: number;
  combinedInterestRate: number;
  combinedEnergyBurden: number;
  combinedFoodStress: number;
  combinedCapitalFundingGap: number;
  combinedConstrainedWorkingShare: number;
  regionalAiCushionPctPoints: Readonly<Record<Region, number>>;
}

export interface WarAiExperiment {
  scenario: HormuzScenarioId;
  paths: WarAiPaths;
  years: readonly WarAiYearResult[];
}

function rowAt(result: SimulationResult, year: number): YearResult {
  const row = result.results.find((candidate) => candidate.year === year);
  if (!row) throw new Error(`Missing simulation row for ${year}`);
  return row;
}

function relativeEffect(shocked: number, matched: number): number {
  return matched === 0 ? 0 : 100 * (shocked / matched - 1);
}

export function summarizeWarAiYear(
  year: number,
  baseline: YearResult,
  aiOnly: YearResult,
  warOnly: YearResult,
  warAndAi: YearResult,
): WarAiYearResult {
  const warGdpEffectWithoutAiPct = relativeEffect(warOnly.gdp, baseline.gdp);
  const warGdpEffectWithAiPct = relativeEffect(warAndAi.gdp, aiOnly.gdp);
  const regionalAiCushionPctPoints = {} as Record<Region, number>;
  for (const region of REGIONS) {
    const noAiEffect = relativeEffect(
      warOnly.regionalGdp[region],
      baseline.regionalGdp[region],
    );
    const aiEffect = relativeEffect(
      warAndAi.regionalGdp[region],
      aiOnly.regionalGdp[region],
    );
    regionalAiCushionPctPoints[region] = aiEffect - noAiEffect;
  }

  return {
    year,
    baselineGdp: baseline.gdp,
    aiOnlyGdp: aiOnly.gdp,
    warOnlyGdp: warOnly.gdp,
    warAndAiGdp: warAndAi.gdp,
    warGdpEffectWithoutAiPct,
    warGdpEffectWithAiPct,
    aiCushionPctPoints: warGdpEffectWithAiPct - warGdpEffectWithoutAiPct,
    gdpInteraction:
      warAndAi.gdp - warOnly.gdp - aiOnly.gdp + baseline.gdp,
    dataCenterLoadTWh: warAndAi.dataCenterLoadTWh,
    dataCenterCapexSpend: warAndAi.dataCenterCapexSpend,
    combinedInvestment: warAndAi.investment,
    combinedInterestRate: warAndAi.interestRate,
    combinedEnergyBurden: warAndAi.energyBurden,
    combinedFoodStress: warAndAi.foodStress,
    combinedCapitalFundingGap: warAndAi.aggregateCapitalFundingGap,
    combinedConstrainedWorkingShare: warAndAi.constrainedWorkingShare,
    regionalAiCushionPctPoints,
  };
}

/**
 * Run a matched 2x2 experiment: baseline/AI crossed with no-war/Hormuz shock.
 * The same calibrated physical shock is used in both war arms, so the reported
 * interaction comes only from the macro model's nonlinear response.
 */
export function runWarAiExperiment(
  options: WarAiExperimentOptions,
): WarAiExperiment {
  const scenarioId = options.hormuzScenario ?? 'prolonged-closure';
  const endYear = options.endYear ?? 2035;
  const baseParams = deepMerge(
    { startYear: 2025, endYear } satisfies SimulationParams,
    options.baseParams ?? {},
  );
  baseParams.endYear = endYear;
  const aiParams = deepMerge(baseParams, options.aiParams);
  aiParams.startYear = baseParams.startYear ?? 2025;
  aiParams.endYear = endYear;

  const calibration = calibrateHormuzModel();
  const physical = simulateHormuzDisruption(
    hormuzScenarios[scenarioId],
    calibration.params,
  );
  const warParams = buildHormuzGlobalOverrides(physical, baseParams);
  const combinedParams = buildHormuzGlobalOverrides(physical, aiParams);

  const paths: WarAiPaths = {
    baseline: runSimulation(baseParams),
    aiOnly: runSimulation(aiParams),
    warOnly: runSimulation(warParams),
    warAndAi: runSimulation(combinedParams),
  };

  const years: WarAiYearResult[] = [];
  for (let year = baseParams.startYear ?? 2025; year <= endYear; year++) {
    years.push(summarizeWarAiYear(
      year,
      rowAt(paths.baseline, year),
      rowAt(paths.aiOnly, year),
      rowAt(paths.warOnly, year),
      rowAt(paths.warAndAi, year),
    ));
  }

  return { scenario: scenarioId, paths, years };
}

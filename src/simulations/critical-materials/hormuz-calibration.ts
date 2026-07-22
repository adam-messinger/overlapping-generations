import {
  hormuzDefaults,
  hormuzScenarios,
  type HormuzModelParams,
} from './hormuz-data.js';
import {
  simulateHormuzDisruption,
  withHormuzParams,
  type HormuzSimulationResult,
} from './hormuz-model.js';

export interface HormuzTargetRange {
  min: number;
  max: number;
  scale: number;
}

export interface HormuzBackcastTargets {
  development: {
    q1AverageOilTransitPerDay: HormuzTargetRange;
    marchNetOilSupplyLossPerDay: HormuzTargetRange;
    marchOilPriceMultiple: HormuzTargetRange;
    marchGulfCrudeShutInPerDay: HormuzTargetRange;
  };
  holdout: {
    q2OilPriceMultiple: HormuzTargetRange;
    julyOilPriceMultiple: HormuzTargetRange;
    peakFertilizerPriceMultiple: HormuzTargetRange;
  };
}

/**
 * Frozen ranges deliberately reflect reporting precision rather than point
 * estimates. Development targets select oil-market parameters; Q2/July prices
 * and fertilizer are untouched holdouts.
 *
 * - EIA STEO: Q1 2026 Hormuz oil flow 14.6 mb/d.
 * - World Bank April CMO: initial global oil-supply reduction about 10 mb/d;
 *   Brent more than 50% above its year-start level in mid-April; fertilizer
 *   +31% and urea +60% in the 2026 forecast.
 * - EIA 2026-04-07: affected Gulf producers shut about 7.5 mb/d in March.
 * - IMF 2026-07-15: oil subsequently held around $90-$100/bbl, versus a
 *   roughly $69/bbl 2025 average.
 */
export const hormuzBackcastTargets: HormuzBackcastTargets = {
  development: {
    q1AverageOilTransitPerDay: { min: 14.0, max: 15.2, scale: 1 },
    marchNetOilSupplyLossPerDay: { min: 8, max: 12, scale: 4 },
    marchOilPriceMultiple: { min: 1.50, max: 1.80, scale: 0.30 },
    marchGulfCrudeShutInPerDay: { min: 6.5, max: 8.5, scale: 2 },
  },
  holdout: {
    q2OilPriceMultiple: { min: 1.35, max: 1.60, scale: 0.25 },
    julyOilPriceMultiple: { min: 1.30, max: 1.50, scale: 0.20 },
    peakFertilizerPriceMultiple: { min: 1.30, max: 1.70, scale: 0.40 },
  },
};

export interface HormuzScoreComponent {
  name: string;
  value: number;
  target: HormuzTargetRange;
  loss: number;
}

export interface HormuzBackcastScore {
  meanLoss: number;
  components: readonly HormuzScoreComponent[];
}

export interface CalibratedHormuzModel {
  params: HormuzModelParams;
  development: HormuzBackcastScore;
  holdout: HormuzBackcastScore;
  result: HormuzSimulationResult;
}

function rangeLoss(value: number, target: HormuzTargetRange): number {
  if (value < target.min) return (target.min - value) / target.scale;
  if (value > target.max) return (value - target.max) / target.scale;
  return 0;
}

function scoreRows(
  rows: ReadonlyArray<{
    name: string;
    value: number;
    target: HormuzTargetRange;
  }>,
): HormuzBackcastScore {
  const components = rows.map((row) => ({
    ...row,
    loss: rangeLoss(row.value, row.target),
  }));
  return {
    meanLoss:
      components.reduce((sum, component) => sum + component.loss, 0) /
      Math.max(components.length, 1),
    components,
  };
}

export function scoreHormuzBackcast(
  result: HormuzSimulationResult,
  targets: HormuzBackcastTargets = hormuzBackcastTargets,
): { development: HormuzBackcastScore; holdout: HormuzBackcastScore } {
  const januaryToMarch = result.months.filter(
    (month) => month.year === 2026 && month.month <= 3,
  );
  const march = result.months.find(
    (month) => month.year === 2026 && month.month === 3,
  );
  const q2 = result.months.filter(
    (month) => month.year === 2026 && month.month >= 4 && month.month <= 6,
  );
  const july = result.months.find(
    (month) => month.year === 2026 && month.month === 7,
  );
  if (!march || !july || januaryToMarch.length !== 3 || q2.length !== 3) {
    throw new Error('Hormuz backcast scoring requires January-July 2026');
  }

  const q1AverageOilTransitPerDay = januaryToMarch.reduce(
    (sum, month) =>
      sum + month.oil.normalHormuzFlowPerDay * month.throughput,
    0,
  ) / januaryToMarch.length;
  const q2OilPriceMultiple = q2.reduce(
    (sum, month) => sum + month.oil.priceMultiple,
    0,
  ) / q2.length;
  const peakFertilizerPriceMultiple = Math.max(
    ...result.months.map((month) => month.fertilizer.priceMultiple),
  );

  return {
    development: scoreRows([
      {
        name: 'Q1 average Hormuz oil transit',
        value: q1AverageOilTransitPerDay,
        target: targets.development.q1AverageOilTransitPerDay,
      },
      {
        name: 'March net global oil-supply loss',
        value: march.oil.netPhysicalSupplyLossPerDay,
        target: targets.development.marchNetOilSupplyLossPerDay,
      },
      {
        name: 'March oil-price multiple',
        value: march.oil.priceMultiple,
        target: targets.development.marchOilPriceMultiple,
      },
      {
        name: 'March Gulf crude shut-in',
        value: march.gulfCrudeShutInPerDay,
        target: targets.development.marchGulfCrudeShutInPerDay,
      },
    ]),
    holdout: scoreRows([
      {
        name: 'Q2 oil-price multiple',
        value: q2OilPriceMultiple,
        target: targets.holdout.q2OilPriceMultiple,
      },
      {
        name: 'July oil-price multiple',
        value: july.oil.priceMultiple,
        target: targets.holdout.julyOilPriceMultiple,
      },
      {
        name: 'Peak fertilizer-price multiple',
        value: peakFertilizerPriceMultiple,
        target: targets.holdout.peakFertilizerPriceMultiple,
      },
    ]),
  };
}

/** Grid selection sees development targets only; holdout data never select parameters. */
export function calibrateHormuzModel(
  base: HormuzModelParams = hormuzDefaults,
): CalibratedHormuzModel {
  const shortElasticities = [0.16, 0.18, 0.20, 0.22, 0.24];
  const mediumElasticities = [0.30, 0.35, 0.40];
  const maxStockDraws = [3, 4, 5];
  const alternativeSupply = [0.5, 1.0, 1.5];
  const exporterStorage = [60, 75, 90];
  let best: CalibratedHormuzModel | undefined;
  let bestPriorPenalty = Number.POSITIVE_INFINITY;

  for (const demandElasticity of shortElasticities) {
    for (const mediumRunDemandElasticity of mediumElasticities) {
      if (mediumRunDemandElasticity < demandElasticity) continue;
      for (const maxInventoryDrawPerDay of maxStockDraws) {
        for (const alternativeSupplyMaxPerDay of alternativeSupply) {
          for (const exporterSpareStorageMillionBarrels of exporterStorage) {
            const params = withHormuzParams(base, {
              oil: {
                demandElasticity,
                mediumRunDemandElasticity,
                maxInventoryDrawPerDay,
                alternativeSupplyMaxPerDay,
                exporterSpareStorageMillionBarrels,
              },
            });
            const result = simulateHormuzDisruption(
              hormuzScenarios['observed-2026-to-date'],
              params,
            );
            const scores = scoreHormuzBackcast(result);
            const candidate = {
              params,
              ...scores,
              result,
            };
            // Range targets intentionally admit many observationally equivalent
            // candidates. Resolve exact development-score ties toward the
            // documented priors, never toward the holdout.
            const priorPenalty =
              Math.abs(demandElasticity - base.oil.demandElasticity) / 0.04 +
              Math.abs(
                mediumRunDemandElasticity - base.oil.mediumRunDemandElasticity,
              ) / 0.10 +
              Math.abs(maxInventoryDrawPerDay - base.oil.maxInventoryDrawPerDay) / 2 +
              Math.abs(
                alternativeSupplyMaxPerDay - base.oil.alternativeSupplyMaxPerDay,
              ) / 1 +
              Math.abs(
                exporterSpareStorageMillionBarrels -
                  base.oil.exporterSpareStorageMillionBarrels,
              ) / 30;
            if (
              !best ||
              candidate.development.meanLoss < best.development.meanLoss - 1e-12 ||
              (
                Math.abs(
                  candidate.development.meanLoss - best.development.meanLoss,
                ) < 1e-12 &&
                priorPenalty < bestPriorPenalty
              )
            ) {
              best = candidate;
              bestPriorPenalty = priorPenalty;
            }
          }
        }
      }
    }
  }
  if (!best) throw new Error('No Hormuz calibration candidates');
  return best;
}

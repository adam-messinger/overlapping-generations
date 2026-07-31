/**
 * Backcast of the war-settlement model against the March–July 2026 record.
 *
 * The development set is everything that was tuned, by the search below or by
 * hand while the defaults were being set: the stock levels the model exists to
 * track, and the price and index levels that were used to pick the crack
 * spread, the war-risk premium, and the demand elasticity. Calling those last
 * three a holdout would be false — they informed the defaults.
 *
 * The holdout set is two quantities nothing in the model was ever pointed at:
 * the World Bank's estimate of the March global supply loss, and China's
 * remaining days of import cover. The first of these is reported as a miss.
 *
 * Nothing in the settlement-hazard block is calibrated at all. It cannot be —
 * there is one observed settlement attempt and it failed — and pretending
 * otherwise would be the main way this model could mislead.
 */

import {
  defaultWarSettlementParams,
  warSettlementEvidence,
  warSettlementScenarios,
  type WarSettlementParams,
} from './data.js';
import { simulateWarSettlement, type WarSettlementResult } from './model.js';

const E = warSettlementEvidence;

export interface TargetRange {
  min: number;
  max: number;
  /** Loss units per unit of miss outside the range. */
  scale: number;
}

export interface WarSettlementTargets {
  development: {
    /** EIA weekly SPR crude, week ending 24 July 2026. */
    julySprMb: TargetRange;
    juneBrentUsd: TargetRange;
    julyBrentUsd: TargetRange;
    juneRetailGasolineUsd: TargetRange;
    juneHeadlineCpiYoy: TargetRange;
    /** Iranian monthly inflation implied by the IMF's 68.9% annual figure. */
    iranMonthlyInflation: TargetRange;
    /** Level implied once the 172 mb authorization is fully executed. */
    postReleaseSprMb: TargetRange;
    /** Iranian ballistic missiles remaining, mid-2026 assessments. */
    julyIranMissiles: TargetRange;
    /** Surviving Iranian launchers after two reported halvings. */
    julyIranLaunchers: TargetRange;
    /** Cumulative Iranian launches including the 28 February opening salvo. */
    cumulativeIranLaunches: TargetRange;
    /** THAAD plus SM-3 remaining. */
    julyHighEndInterceptors: TargetRange;
    /** Patriot PAC-3 family remaining: reported below 1,000. */
    julyAreaInterceptors: TargetRange;
  };
  holdout: {
    /** World Bank April 2026: initial net global oil-supply reduction. */
    marchNetSupplyLossMbd: TargetRange;
    /** China's remaining import cover in July, against 104 days in January. */
    chinaDaysOfCoverJuly: TargetRange;
  };
}

/**
 * Frozen target ranges. Widths reflect reporting precision, not modeler
 * comfort: where two sources disagree the range spans both.
 */
export const warSettlementTargets: WarSettlementTargets = {
  development: {
    julySprMb: { min: 303, max: 313, scale: 8 },
    postReleaseSprMb: { min: 238, max: 248, scale: 8 },
    julyIranMissiles: {
      min: E.iranMunitions.remainingLow,
      max: E.iranMunitions.remainingHigh,
      scale: 300,
    },
    julyIranLaunchers: { min: 80, max: 150, scale: 50 },
    cumulativeIranLaunches: { min: 500, max: 800, scale: 200 },
    // THAAD 234-278 plus SM-3 at roughly 80% of its ~480 available rounds.
    julyHighEndInterceptors: { min: 590, max: 700, scale: 80 },
    julyAreaInterceptors: { min: 850, max: 1_050, scale: 150 },
    juneBrentUsd: { min: 71, max: 76, scale: 5 },
    julyBrentUsd: { min: 88, max: 94, scale: 5 },
    // Reported +27% y/y on a $3.14 mid-2025 base.
    juneRetailGasolineUsd: { min: 3.85, max: 4.15, scale: 0.25 },
    juneHeadlineCpiYoy: { min: 0.033, max: 0.037, scale: 0.004 },
    // 68.9% annually compounds to about 4.5% a month.
    iranMonthlyInflation: { min: 0.035, max: 0.055, scale: 0.02 },
  },
  holdout: {
    marchNetSupplyLossMbd: { min: 8, max: 12, scale: 4 },
    chinaDaysOfCoverJuly: { min: 80, max: 110, scale: 15 },
  },
};

export interface ScoreComponent {
  name: string;
  value: number;
  target: TargetRange;
  loss: number;
}

export interface BackcastScore {
  meanLoss: number;
  components: readonly ScoreComponent[];
}

/** Zero inside the range; linear in the distance outside it, in scale units. */
function rangeLoss(value: number, target: TargetRange): number {
  if (!Number.isFinite(value)) return 1e6;
  if (value < target.min) return (target.min - value) / target.scale;
  if (value > target.max) return (value - target.max) / target.scale;
  return 0;
}

function score(values: Record<string, number>, targets: Record<string, TargetRange>): BackcastScore {
  const components = Object.entries(targets).map(([name, target]) => ({
    name,
    value: values[name],
    target,
    loss: rangeLoss(values[name], target),
  }));
  return {
    meanLoss: components.reduce((sum, c) => sum + c.loss, 0) / components.length,
    components,
  };
}

/** Index of July 2026 in a scenario that starts in March 2026. */
const JULY_INDEX = 4;
const JUNE_INDEX = 3;

/** Pull the observable quantities the backcast scores out of a model run. */
export function backcastValues(result: WarSettlementResult): Record<string, number> {
  const july = result.months[JULY_INDEX];
  const june = result.months[JUNE_INDEX];
  const launches = result.months
    .slice(0, JULY_INDEX + 1)
    .reduce<number>((sum, m) => sum + m.iranLaunches, E.iranMunitions.openingSalvo);
  const postRelease = result.months.reduce((low, m) => Math.min(low, m.usSprMb), Infinity);
  return {
    julySprMb: july.usSprMb,
    postReleaseSprMb: postRelease,
    julyIranMissiles: july.iranMissileInventory,
    julyIranLaunchers: july.iranLaunchers,
    cumulativeIranLaunches: launches,
    julyHighEndInterceptors: july.usHighEndInterceptors,
    julyAreaInterceptors: july.usAreaInterceptors,
    juneBrentUsd: june.brentUsdPerBarrel,
    julyBrentUsd: july.brentUsdPerBarrel,
    juneRetailGasolineUsd: june.retailGasolineUsdPerGal,
    juneHeadlineCpiYoy: june.headlineCpiYoy,
    iranMonthlyInflation: july.iranMonthlyInflation,
    marchNetSupplyLossMbd: result.months[0].netDeficitMbd,
    chinaDaysOfCoverJuly: july.chinaReserveMb / E.reserves.chinaImportsMbd,
  };
}

/**
 * The March supply loss net of rerouting but before any inventory draw.
 *
 * Reported separately because the World Bank's "net global oil-supply
 * reduction" does not say whether inventory draws are netted out, and the model
 * brackets their 10 mb/d figure rather than matching it on either definition.
 */
export function marchLossAfterRerouting(result: WarSettlementResult): number {
  return result.months[0].grossDeficitMbd;
}

/** Free parameters the search is allowed to move, with their bounds. */
const FREE_PARAMETERS: readonly { key: keyof WarSettlementParams; min: number; max: number }[] = [
  { key: 'iranSortiesPerLauncherMonth', min: 0.25, max: 1.20 },
  { key: 'iranMaxInventoryDrawShare', min: 0.030, max: 0.150 },
  { key: 'iranMissileAttritionShare', min: 0.020, max: 0.160 },
  { key: 'iranLauncherAttritionShare', min: 0.150, max: 0.480 },
  { key: 'interceptorsPerBallisticMissile', min: 0.80, max: 2.40 },
  { key: 'ballisticEngagementShare', min: 0.12, max: 0.55 },
  { key: 'areaInterceptorsPerDrone', min: 0.30, max: 1.40 },
  { key: 'areaInterceptorsPerBallisticMissile', min: 0.60, max: 2.40 },
  { key: 'usSprMaxDrawPerMonthMb', min: 16, max: 26 },
  { key: 'shortRunDemandElasticity', min: 0.030, max: 0.100 },
  { key: 'productCrackUsdPerGal', min: 1.00, max: 3.50 },
];

export interface CalibrationResult {
  params: WarSettlementParams;
  development: BackcastScore;
  holdout: BackcastScore;
  iterations: number;
}

/**
 * Coordinate descent on the development loss only.
 *
 * A grid search would be cleaner but eleven parameters make it impractical, and
 * the loss is flat inside every target range, so descent converges quickly and
 * stops as soon as the development set is satisfied. The holdout is scored at
 * the end and never steers the search.
 */
export function calibrateWarSettlement(
  overrides: Partial<WarSettlementParams> = {},
): CalibrationResult {
  const scenario = warSettlementScenarios['attrition-continues'];
  let params: WarSettlementParams = { ...defaultWarSettlementParams, ...overrides };
  const evaluate = (candidate: WarSettlementParams): number =>
    score(backcastValues(simulateWarSettlement(scenario, candidate)),
      warSettlementTargets.development).meanLoss;

  let best = evaluate(params);
  let iterations = 0;
  const passes = 12;

  for (let pass = 0; pass < passes && best > 0; pass += 1) {
    const step = Math.pow(0.6, pass);
    for (const { key, min, max } of FREE_PARAMETERS) {
      const current = params[key] as number;
      const span = (max - min) * 0.25 * step;
      for (const delta of [span, -span, span / 3, -span / 3]) {
        const next = Math.min(max, Math.max(min, current + delta));
        if (next === current) continue;
        const candidate: WarSettlementParams = { ...params, [key]: next };
        iterations += 1;
        const loss = evaluate(candidate);
        if (loss < best - 1e-12) {
          best = loss;
          params = candidate;
          break;
        }
      }
    }
  }

  const values = backcastValues(simulateWarSettlement(scenario, params));
  return {
    params,
    development: score(values, warSettlementTargets.development),
    holdout: score(values, warSettlementTargets.holdout),
    iterations,
  };
}

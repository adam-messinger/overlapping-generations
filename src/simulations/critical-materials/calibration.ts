import {
  criticalMaterialNetwork,
  rareEarth2025Event,
  type MaterialNode,
} from './data.js';
import {
  simulateDynamicNetwork,
  type DynamicNetworkResult,
} from './dynamic-network.js';

export interface RareEarthCalibration {
  inventoryMonths: number;
  priceElasticity: number;
  fitScore: number;
  holdoutRecoveryError: number;
  result: DynamicNetworkResult;
}

function distance(actual: number | null, target: number): number {
  return actual === null ? 10 : Math.abs(actual - target);
}

/** Fit only timing of first curtailment and peak import-price envelope. */
export function calibrateRareEarthEvent(
  version: 'v1' | 'v2',
  nodes: readonly MaterialNode[] = criticalMaterialNetwork,
): RareEarthCalibration {
  const inventoryGrid = version === 'v1' ? [0] : [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  const elasticityGrid = [1, 1.5, 2, 2.5, 2.75, 3, 3.5];
  let best: RareEarthCalibration | undefined;
  for (const inventoryMonths of inventoryGrid) {
    for (const priceElasticity of elasticityGrid) {
      const result = simulateDynamicNetwork(nodes, {
        months: rareEarth2025Event.supplyPath.length,
        supplyPaths: { 'rare-earths': rareEarth2025Event.supplyPath },
        revision: version,
        inventoryMonthsOverride: inventoryMonths,
        priceElasticity,
        pricePassThrough: 0.85,
        curtailmentNodeId: 'evs',
      });
      const curtailmentError = distance(
        result.firstCurtailmentMonth,
        rareEarth2025Event.fitTargets.firstAutoCurtailmentMonth,
      );
      const priceError = Math.abs(
        result.peakSourcePriceMultiple -
          rareEarth2025Event.fitTargets.peakImportPriceMultiple,
      );
      const fitScore = curtailmentError + priceError / 5;
      const holdoutRecoveryError = distance(
        result.recoveryMonth,
        rareEarth2025Event.holdoutTarget.autoRecoveryMonth,
      );
      const candidate = {
        inventoryMonths,
        priceElasticity,
        fitScore,
        holdoutRecoveryError,
        result,
      };
      if (!best || candidate.fitScore < best.fitScore) best = candidate;
    }
  }
  if (!best) throw new Error('No rare-earth calibration candidates');
  return best;
}

import { criticalMaterialNetwork } from './data.js';
import { simulateDynamicNetwork, type DynamicNetworkResult } from './dynamic-network.js';
import {
  empiricalMaterialProfiles,
  ieaNmc622ElectricCarRecipe,
  type EmpiricalMaterialId,
  type EmpiricalMaterialProfile,
} from './empirical-data.js';

export interface EmpiricalMaterialOverlay {
  material: EmpiricalMaterialId;
  networkNodeId: string;
  dominantProducerShare: number;
  /** Supply left if the largest producer disappears while all demand remains. */
  residualSupplyShare: number;
  usNetImportReliance: number;
  observedInventoryMonths: number | null;
  kilogramsPerNmc622Ev: number | null;
  coefficientStatus: {
    supply: 'observed';
    inventory: 'observed' | 'missing';
    physicalRecipe: 'observed' | 'not-in-recipe';
    topologyAndCostShares: 'assumption';
  };
}

export interface OverlayAudit {
  overlays: readonly EmpiricalMaterialOverlay[];
  unmatchedNetworkMaterials: readonly string[];
  unmatchedRecipeMaterials: readonly string[];
  errors: readonly string[];
}

export function buildEmpiricalMaterialOverlay(
  profiles: readonly EmpiricalMaterialProfile[] = empiricalMaterialProfiles,
): OverlayAudit {
  const networkMaterials = criticalMaterialNetwork
    .filter((node) => node.kind === 'material')
    .map((node) => node.id);
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const recipe = new Map(
    ieaNmc622ElectricCarRecipe.map((row) => [row.material, row.kilogramsPerVehicle]),
  );
  const errors: string[] = [];
  const overlays = profiles.map((profile): EmpiricalMaterialOverlay => {
    if (!(profile.dominantProducerShare >= 0 && profile.dominantProducerShare <= 1)) {
      errors.push(`${profile.id}: dominant producer share outside [0, 1]`);
    }
    if (!(profile.usNetImportReliance >= 0 && profile.usNetImportReliance <= 1)) {
      errors.push(`${profile.id}: import reliance outside [0, 1]`);
    }
    if (profile.observedInventoryMonths !== null && profile.observedInventoryMonths < 0) {
      errors.push(`${profile.id}: negative inventory`);
    }
    const kilogramsPerNmc622Ev = recipe.get(profile.id) ?? null;
    return {
      material: profile.id,
      networkNodeId: profile.id,
      dominantProducerShare: profile.dominantProducerShare,
      residualSupplyShare: 1 - profile.dominantProducerShare,
      usNetImportReliance: profile.usNetImportReliance,
      observedInventoryMonths: profile.observedInventoryMonths,
      kilogramsPerNmc622Ev,
      coefficientStatus: {
        supply: 'observed',
        inventory: profile.observedInventoryMonths === null ? 'missing' : 'observed',
        physicalRecipe: kilogramsPerNmc622Ev === null ? 'not-in-recipe' : 'observed',
        topologyAndCostShares: 'assumption',
      },
    };
  });
  return {
    overlays,
    unmatchedNetworkMaterials: networkMaterials.filter(
      (id) => !profileIds.has(id as EmpiricalMaterialId),
    ),
    unmatchedRecipeMaterials: ieaNmc622ElectricCarRecipe
      .map((row) => row.material)
      .filter((id) => !profileIds.has(id as EmpiricalMaterialId)),
    errors,
  };
}

export interface EmpiricalStressResult {
  overlay: EmpiricalMaterialOverlay;
  result: DynamicNetworkResult;
  inventoryBasis: 'usgs-observed' | 'network-prior';
}

/**
 * Loss of the largest observed producer for 12 months, with demand held fixed.
 * This deliberately severe export/supply cutoff is not the IEA's N-1 balance,
 * which also removes the largest producer's domestic demand. USGS stocks are
 * scaled by the accessible fraction fitted on development events; missing
 * stocks fall back to the visibly assumed node inventories in `data.ts`.
 */
export function simulateEmpiricalDominantProducerLoss(
  material: EmpiricalMaterialId,
  options: {
    accessibleInventoryFraction?: number;
    additionalCoverage?: number;
    inventoryScale?: number;
  } = {},
): EmpiricalStressResult {
  const overlay = buildEmpiricalMaterialOverlay().overlays.find(
    (row) => row.material === material,
  );
  if (!overlay) throw new Error(`No empirical overlay for ${material}`);
  const inventoryMonthsByInput = Object.fromEntries(
    buildEmpiricalMaterialOverlay().overlays
      .filter((row) => row.observedInventoryMonths !== null)
      .map((row) => [row.material, row.observedInventoryMonths as number]),
  );
  const coverage = Math.min(
    1,
    overlay.residualSupplyShare + (options.additionalCoverage ?? 0),
  );
  const accessibleInventoryFraction = options.accessibleInventoryFraction ?? 0.4;
  const result = simulateDynamicNetwork(criticalMaterialNetwork, {
    months: 12,
    supplyPaths: { [material]: [1, ...Array(11).fill(coverage)] },
    revision: 'v3',
    inventoryMonthsByInput,
    inventoryMultiplier:
      accessibleInventoryFraction * (options.inventoryScale ?? 1),
    substitutionMultiplier: 1,
    priceElasticity: 2.75,
    pricePassThrough: 0.85,
  });
  return {
    overlay,
    result,
    inventoryBasis:
      overlay.observedInventoryMonths === null ? 'network-prior' : 'usgs-observed',
  };
}

/** @deprecated Use simulateEmpiricalDominantProducerLoss; this is not an IEA N-1 balance. */
export const simulateEmpiricalNMinusOne = simulateEmpiricalDominantProducerLoss;

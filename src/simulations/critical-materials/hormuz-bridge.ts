import { REGIONS, type Region } from '../../domain-types.js';
import { runSimulation, type SimulationParams, type SimulationResult } from '../../simulation.js';
import type { AnnualCommodityShock } from '../../modules/demand.js';
import type { AnnualEnergySupplyShock } from '../../modules/production.js';
import type { AnnualFoodSupplyShock } from '../../modules/resources.js';
import type {
  AnnualHormuzShock,
  HormuzSimulationResult,
} from './hormuz-model.js';

export interface HormuzBridgeOptions {
  /** Near-term shares of non-electric final energy; remaining fuels are unshocked. */
  oilShareOfNonElectricEnergy: number;
  gasShareOfNonElectricEnergy: number;
}

export const hormuzBridgeDefaults: HormuzBridgeOptions = {
  oilShareOfNonElectricEnergy: 0.50,
  gasShareOfNonElectricEnergy: 0.30,
};

function mergeByYear<T extends { year: number }>(
  existing: readonly T[] | undefined,
  generated: readonly T[],
): readonly T[] {
  const merged = new Map<number, T>();
  for (const row of existing ?? []) merged.set(row.year, row);
  for (const row of generated) merged.set(row.year, row);
  return [...merged.values()].sort((a, b) => a.year - b.year);
}

function weightedRegionalGasAvailability(
  annual: AnnualHormuzShock,
  simulation: HormuzSimulationResult,
): number {
  return REGIONS.reduce(
    (sum, region) =>
      sum +
      simulation.params.regions[region].gasConsumptionWeight *
        annual.regional[region].gasAvailability,
    0,
  );
}

function isNonTrivial(annual: AnnualHormuzShock): boolean {
  return (
    Math.abs(annual.oilPriceMultiple - 1) > 1e-9 ||
    Math.abs(annual.gasPriceMultiple - 1) > 1e-9 ||
    Math.abs(annual.cropYieldMultiplier - 1) > 1e-9
  );
}

/**
 * Translate monthly commodity/network results into sparse annual inputs for
 * the global model. Physical fuel loss enters production in the same calendar
 * year; demand still reports served fuel, prices, and regional incidence.
 */
export function buildHormuzGlobalOverrides(
  simulation: HormuzSimulationResult,
  base: SimulationParams = {},
  options: HormuzBridgeOptions = hormuzBridgeDefaults,
): SimulationParams {
  const annual = simulation.annual.filter(isNonTrivial);
  const demandShocks: AnnualCommodityShock[] = annual.map((row) => ({
    year: row.year,
    globalPriceMultipliers: {
      oil: row.oilPriceMultiple,
      gas: row.gasPriceMultiple,
    },
    regionalPriceMultipliers: Object.fromEntries(
      REGIONS.map((region) => [
        region,
        {
          oil: row.regional[region].oilPriceMultiple,
          gas: row.regional[region].gasPriceMultiple,
        },
      ]),
    ) as Record<Region, { oil: number; gas: number }>,
    regionalAvailability: Object.fromEntries(
      REGIONS.map((region) => [
        region,
        {
          oil: row.regional[region].oilAvailability,
          gas: row.regional[region].gasAvailability,
        },
      ]),
    ) as Record<Region, { oil: number; gas: number }>,
    regionalOutputFactors: Object.fromEntries(
      REGIONS.map((region) => [region, row.regional[region].tradeIncomeFactor]),
    ) as Record<Region, number>,
  }));

  const productionShocks: AnnualEnergySupplyShock[] = annual.map((row) => {
    const broadGasAvailability = weightedRegionalGasAvailability(row, simulation);
    const unavailable =
      options.oilShareOfNonElectricEnergy * (1 - row.oilAvailability) +
      options.gasShareOfNonElectricEnergy * (1 - broadGasAvailability);
    return {
      year: row.year,
      nonElectricAvailability: Math.max(0, Math.min(1, 1 - unavailable)),
    };
  });

  const foodShocks: AnnualFoodSupplyShock[] = annual.map((row) => ({
    year: row.year,
    yieldMultiplier: row.cropYieldMultiplier,
    foodAvailabilityMultiplier: row.foodAvailabilityMultiplier,
    fertilizerPriceMultiplier: row.fertilizerPriceMultiple,
  }));

  return {
    ...base,
    demand: {
      ...(base.demand ?? {}),
      commodityShocks: mergeByYear(
        base.demand?.commodityShocks,
        demandShocks,
      ),
    },
    production: {
      ...(base.production ?? {}),
      energySupplyShocks: mergeByYear(
        base.production?.energySupplyShocks,
        productionShocks,
      ),
    },
    resources: {
      ...(base.resources ?? {}),
      foodSupplyShocks: mergeByYear(
        base.resources?.foodSupplyShocks,
        foodShocks,
      ),
    },
  };
}

export interface HormuzMacroYearImpact {
  year: number;
  gdpChangePct: number;
  energyBurdenChangePctPoints: number;
  foodStressChangePctPoints: number;
  oilConsumptionChangePct: number;
  gasConsumptionChangePct: number;
  regionalGdpChangePct: Readonly<Record<Region, number>>;
}

export interface HormuzMacroComparison {
  baseline: SimulationResult;
  shocked: SimulationResult;
  impacts: readonly HormuzMacroYearImpact[];
}

/** Run matched global paths and report deltas for shock years plus two recovery years. */
export function compareHormuzGlobalImpact(
  simulation: HormuzSimulationResult,
  base: SimulationParams = {},
  options: HormuzBridgeOptions = hormuzBridgeDefaults,
): HormuzMacroComparison {
  const firstShockYear = Math.min(...simulation.annual.map((row) => row.year));
  const lastShockYear = Math.max(...simulation.annual.map((row) => row.year));
  const startYear = base.startYear ?? Math.min(2025, firstShockYear - 1);
  if (startYear >= firstShockYear) {
    throw new Error(
      `Hormuz macro comparison must start before ${firstShockYear} so the production anchor does not absorb the shock`,
    );
  }
  const endYear = Math.max(base.endYear ?? lastShockYear + 2, lastShockYear + 2);
  const baselineParams = { ...base, startYear, endYear };
  const shockedParams = buildHormuzGlobalOverrides(
    simulation,
    baselineParams,
    options,
  );
  const baseline = runSimulation(baselineParams);
  const shocked = runSimulation(shockedParams);
  const impacts: HormuzMacroYearImpact[] = [];

  for (let year = firstShockYear; year <= endYear; year++) {
    const baseRow = baseline.results.find((row) => row.year === year);
    const shockRow = shocked.results.find((row) => row.year === year);
    if (!baseRow || !shockRow) continue;
    const regionalGdpChangePct = {} as Record<Region, number>;
    for (const region of REGIONS) {
      regionalGdpChangePct[region] = baseRow.regionalGdp[region] > 0
        ? 100 * (shockRow.regionalGdp[region] / baseRow.regionalGdp[region] - 1)
        : 0;
    }
    impacts.push({
      year,
      gdpChangePct: 100 * (shockRow.gdp / baseRow.gdp - 1),
      energyBurdenChangePctPoints:
        100 * (shockRow.energyBurden - baseRow.energyBurden),
      foodStressChangePctPoints: 100 * (shockRow.foodStress - baseRow.foodStress),
      oilConsumptionChangePct: baseRow.oilConsumption > 0
        ? 100 * (shockRow.oilConsumption / baseRow.oilConsumption - 1)
        : 0,
      gasConsumptionChangePct: baseRow.gasConsumption > 0
        ? 100 * (shockRow.gasConsumption / baseRow.gasConsumption - 1)
        : 0,
      regionalGdpChangePct,
    });
  }

  return { baseline, shocked, impacts };
}

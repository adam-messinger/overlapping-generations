import { REGIONS, type Region } from '../../domain-types.js';
import { runSimulation, type SimulationParams, type SimulationResult } from '../../simulation.js';
import type { AnnualCommodityShock } from '../../modules/demand.js';
import type { AnnualEnergySupplyShock } from '../../modules/production.js';
import type { AnnualFoodSupplyShock } from '../../modules/resources.js';
import type {
  AnnualHormuzShock,
  HormuzSimulationResult,
} from './hormuz-model.js';
import {
  defineAdapter,
  measurementPort,
  mergeTemporalRecords,
  runAdapter,
} from 'tsimulation';
import {
  hormuzCrosswalks,
  hormuzEstimands,
} from '../semantic-contracts.js';

export interface HormuzBridgeOptions {
  /** Near-term shares of non-electric final energy; remaining fuels are unshocked. */
  oilShareOfNonElectricEnergy: number;
  gasShareOfNonElectricEnergy: number;
  /** Existing annual shocks are protected by default instead of silently overwritten. */
  conflictPolicy?: 'error' | 'replace';
}

export const hormuzBridgeDefaults: HormuzBridgeOptions = {
  oilShareOfNonElectricEnergy: 0.50,
  gasShareOfNonElectricEnergy: 0.30,
};

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
  if (options.oilShareOfNonElectricEnergy < 0 || options.gasShareOfNonElectricEnergy < 0 ||
      options.oilShareOfNonElectricEnergy + options.gasShareOfNonElectricEnergy > 1) {
    throw new Error('Hormuz bridge fuel shares must be non-negative and sum to at most 1');
  }
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
      commodityShocks: mergeTemporalRecords({
        existing: base.demand?.commodityShocks,
        generated: demandShocks,
        onConflict: options.conflictPolicy,
        context: 'Hormuz demand shocks',
      }),
    },
    production: {
      ...(base.production ?? {}),
      energySupplyShocks: mergeTemporalRecords({
        existing: base.production?.energySupplyShocks,
        generated: productionShocks,
        onConflict: options.conflictPolicy,
        context: 'Hormuz production shocks',
      }),
    },
    resources: {
      ...(base.resources ?? {}),
      foodSupplyShocks: mergeTemporalRecords({
        existing: base.resources?.foodSupplyShocks,
        generated: foodShocks,
        onConflict: options.conflictPolicy,
        context: 'Hormuz food shocks',
      }),
    },
  };
}

export interface HormuzGlobalAdapterInput {
  simulation: HormuzSimulationResult;
  base?: SimulationParams;
  options?: HormuzBridgeOptions;
}

/** Machine-readable monthly-network → annual-global bridge contract. */
export const hormuzGlobalAdapter = defineAdapter<HormuzGlobalAdapterInput, SimulationParams>({
  id: 'hormuz-to-global-olg',
  version: '1.0.0',
  description: 'Aggregate monthly Hormuz physical, price, trade, and food shocks into annual global-model inputs.',
  sourceModel: 'critical-materials.hormuz',
  targetModel: 'global-olg',
  sourceTimeScale: { kind: 'monthly' },
  targetTimeScale: { kind: 'annual' },
  semanticValidation: 'required',
  sourcePorts: {
    oilAvailability: measurementPort(
      'fraction',
      hormuzEstimands.oilAvailability,
    ),
    gasAvailability: measurementPort(
      'fraction',
      hormuzEstimands.gasAvailability,
    ),
    oilPriceMultiple: measurementPort(
      '1',
      hormuzEstimands.oilPriceMultiple,
    ),
    gasPriceMultiple: measurementPort(
      '1',
      hormuzEstimands.gasPriceMultiple,
    ),
  },
  targetPorts: {
    oilAvailability: measurementPort(
      'fraction',
      hormuzEstimands.oilAvailability,
    ),
    gasAvailability: measurementPort(
      'fraction',
      hormuzEstimands.gasAvailability,
    ),
    nonElectricAvailability: measurementPort(
      'fraction',
      hormuzEstimands.nonElectricAvailability,
    ),
    oilPriceMultiple: measurementPort(
      '1',
      hormuzEstimands.oilPriceMultiple,
    ),
    gasPriceMultiple: measurementPort(
      '1',
      hormuzEstimands.gasPriceMultiple,
    ),
  },
  portMappings: [
    {
      source: 'oilAvailability',
      target: 'oilAvailability',
      conversion: { kind: 'identity' },
      aggregation: { kind: 'custom', description: 'Annual consumption-weighted oil and gas availability.' },
    },
    {
      source: 'gasAvailability',
      target: 'gasAvailability',
      conversion: { kind: 'identity' },
      aggregation: { kind: 'custom', description: 'Annual consumption-weighted oil and gas availability.' },
    },
    {
      source: 'oilPriceMultiple',
      target: 'oilPriceMultiple',
      conversion: { kind: 'identity' },
      aggregation: { kind: 'custom', description: 'Annual duration-weighted commodity price shock.' },
    },
    {
      source: 'gasPriceMultiple',
      target: 'gasPriceMultiple',
      conversion: { kind: 'identity' },
      aggregation: { kind: 'custom', description: 'Annual duration-weighted commodity price shock.' },
    },
    {
      source: 'oilAvailability',
      target: 'nonElectricAvailability',
      conversion: {
        kind: 'custom',
        description: 'Contribute the fixed oil share of non-electric final-energy loss.',
        convert: (value) => value,
      },
      aggregation: {
        kind: 'custom',
        description: 'Combine fixed oil and gas shares with unshocked residual fuels.',
      },
      crosswalk: hormuzCrosswalks.oilToNonElectric,
    },
    {
      source: 'gasAvailability',
      target: 'nonElectricAvailability',
      conversion: {
        kind: 'custom',
        description: 'Contribute the fixed gas share of non-electric final-energy loss.',
        convert: (value) => value,
      },
      aggregation: {
        kind: 'custom',
        description: 'Combine fixed oil and gas shares with unshocked residual fuels.',
      },
      crosswalk: hormuzCrosswalks.gasToNonElectric,
    },
  ],
  adapt: ({ simulation, base = {}, options = hormuzBridgeDefaults }) =>
    buildHormuzGlobalOverrides(simulation, base, options),
});

export function runHormuzGlobalAdapter(input: HormuzGlobalAdapterInput): SimulationParams {
  return runAdapter(hormuzGlobalAdapter, input).target;
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

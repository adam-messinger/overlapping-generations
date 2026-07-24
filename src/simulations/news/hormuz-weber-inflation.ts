import {
  assertFiniteDeep,
  defineAdapter,
  measurementPort,
  runAdapter,
  validateNumber,
} from 'tsimulation';

import { REGIONS, type Region } from '../../domain-types.js';
import {
  weberBenchmark,
} from '../critical-materials/data.js';
import type {
  HormuzModelParams,
  HormuzScenario,
} from '../critical-materials/hormuz-data.js';
import {
  simulateHormuzDisruption,
  type HormuzSimulationResult,
} from '../critical-materials/hormuz-model.js';
import {
  fitWeberModels,
  propagateWeberShock,
} from '../critical-materials/price-network.js';
import {
  hormuzEstimands,
  hormuzWeberCrosswalks,
  weberEnergyInflationEstimands,
} from '../semantic-contracts.js';
import {
  simulateEnergyInflationV3,
  type EnergyInflationNetworkResult,
  type EnergyInflationNetworkScenario,
  type EnergyInflationScenario,
} from './energy-inflation.js';

export interface WeberEnergyBridgeOptions {
  horizonMonths: number;
  region: Region;
  oilInputShare: number;
  gasInputShare: number;
  oilPetroleumTransmissionShare: number;
  gasUtilitiesTransmissionShare: number;
  coreAllocationShare: number;
  coreCpiWeight: number;
  networkScale: number;
}

export interface WeberEnergySourcePriceMonth {
  index: number;
  year: number;
  month: number;
  oilPriceMultiple: number;
  gasPriceMultiple: number;
}

export interface WeberEnergyPriceMonth {
  index: number;
  year: number;
  month: number;
  oilPriceMultiple: number;
  gasPriceMultiple: number;
  importEnergyPriceMultiple: number;
  oilIndirectCpiImpactPct: number;
  gasIndirectCpiImpactPct: number;
  networkIndirectCpiImpactPct: number;
  networkCoreSubindexPriceGapPct: number;
  networkOtherCpiContributionPct: number;
}

export interface WeberEnergyPricePaths {
  months: readonly WeberEnergyPriceMonth[];
  importEnergyPricePath: readonly number[];
  networkCorePriceGapPathPct: readonly number[];
  networkOtherCpiContributionPathPct: readonly number[];
}

export interface HormuzWeberAdapterInput {
  simulation: HormuzSimulationResult;
  options?: WeberEnergyBridgeOptions;
}

export interface HormuzWeberInflationScenario {
  id: string;
  label: string;
  hormuzScenario: HormuzScenario;
  hormuzParams: HormuzModelParams;
  inflationScenario: EnergyInflationScenario;
  bridgeOptions: WeberEnergyBridgeOptions;
}

export interface HormuzWeberInflationResult {
  scenario: HormuzWeberInflationScenario;
  revision: 'hormuz-weber-network-v3';
  hormuz: HormuzSimulationResult;
  pricePaths: WeberEnergyPricePaths;
  inflation: EnergyInflationNetworkResult;
}

export const defaultWeberEnergyBridgeOptions: WeberEnergyBridgeOptions = {
  horizonMonths: 36,
  region: 'oecd',
  oilInputShare: 0.55,
  gasInputShare: 0.45,
  // Oil maps mostly through refined petroleum; gas maps mostly through
  // utilities. The residual in each case uses Weber's upstream oil-and-gas
  // total-requirements exposure.
  oilPetroleumTransmissionShare: 0.65,
  gasUtilitiesTransmissionShare: 0.60,
  // Approximate allocation of indirect energy costs between the euro-area
  // core basket and food/other non-core prices.
  coreAllocationShare: 0.75,
  coreCpiWeight: 0.70,
  networkScale: 1,
};

const weberFit = fitWeberModels(weberBenchmark);

function validateBridgeOptions(options: WeberEnergyBridgeOptions): void {
  assertFiniteDeep(options, 'Hormuz-Weber bridge options');
  const errors = [
    ...validateNumber(options.horizonMonths, 'horizonMonths', {
      integer: true,
      min: 12,
    }),
    ...validateNumber(options.oilInputShare, 'oilInputShare', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(options.gasInputShare, 'gasInputShare', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(
      options.oilPetroleumTransmissionShare,
      'oilPetroleumTransmissionShare',
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      options.gasUtilitiesTransmissionShare,
      'gasUtilitiesTransmissionShare',
      { min: 0, max: 1 },
    ),
    ...validateNumber(options.coreAllocationShare, 'coreAllocationShare', {
      min: 0,
      max: 1,
    }),
    ...validateNumber(options.coreCpiWeight, 'coreCpiWeight', {
      min: 0,
      max: 1,
      exclusiveMin: true,
    }),
    ...validateNumber(options.networkScale, 'networkScale', {
      min: 0,
      max: 5,
    }),
  ];
  if (!REGIONS.includes(options.region)) {
    errors.push(`region must be one of ${REGIONS.join(', ')}`);
  }
  if (Math.abs(options.oilInputShare + options.gasInputShare - 1) > 1e-9) {
    errors.push('oilInputShare + gasInputShare must equal 1');
  }
  if (errors.length > 0) {
    throw new Error(
      `Invalid Hormuz-Weber bridge options:\n  ${errors.join('\n  ')}`,
    );
  }
}

function indirectWeberImpact(
  sectorId: 'oil-gas' | 'petroleum' | 'utilities',
  shockPct: number,
): number {
  return propagateWeberShock(
    weberBenchmark,
    sectorId,
    shockPct,
    weberFit,
  ).indirectCpiImpactPct;
}

export function buildWeberEnergyPricePaths(
  simulation: HormuzSimulationResult,
  options: WeberEnergyBridgeOptions =
    defaultWeberEnergyBridgeOptions,
): WeberEnergyPricePaths {
  validateBridgeOptions(options);
  if (simulation.months.length !== options.horizonMonths) {
    throw new Error(
      `Hormuz-Weber bridge expected ${options.horizonMonths} months, ` +
      `received ${simulation.months.length}`,
    );
  }
  return buildWeberEnergyPricePathsFromSourceMonths(
    simulation.months.map((row) => ({
      index: row.index,
      year: row.year,
      month: row.month,
      oilPriceMultiple: row.regional[options.region].oilPriceMultiple,
      gasPriceMultiple: row.regional[options.region].gasPriceMultiple,
    })),
    options,
  );
}

export function buildWeberEnergyPricePathsFromSourceMonths(
  sourceMonths: readonly WeberEnergySourcePriceMonth[],
  options: WeberEnergyBridgeOptions =
    defaultWeberEnergyBridgeOptions,
): WeberEnergyPricePaths {
  validateBridgeOptions(options);
  if (sourceMonths.length !== options.horizonMonths) {
    throw new Error(
      `Weber energy bridge expected ${options.horizonMonths} months, ` +
        `received ${sourceMonths.length}`,
    );
  }
  assertFiniteDeep(sourceMonths, 'Weber energy source-price months');

  const months = sourceMonths.map((row): WeberEnergyPriceMonth => {
    const oilPriceMultiple = row.oilPriceMultiple;
    const gasPriceMultiple = row.gasPriceMultiple;
    const oilShockPct = 100 * (oilPriceMultiple - 1);
    const gasShockPct = 100 * (gasPriceMultiple - 1);

    const oilIndirectCpiImpactPct =
      options.networkScale *
      options.oilInputShare *
      (
        options.oilPetroleumTransmissionShare *
          indirectWeberImpact('petroleum', oilShockPct) +
        (1 - options.oilPetroleumTransmissionShare) *
          indirectWeberImpact('oil-gas', oilShockPct)
      );
    const gasIndirectCpiImpactPct =
      options.networkScale *
      options.gasInputShare *
      (
        options.gasUtilitiesTransmissionShare *
          indirectWeberImpact('utilities', gasShockPct) +
        (1 - options.gasUtilitiesTransmissionShare) *
          indirectWeberImpact('oil-gas', gasShockPct)
      );
    const networkIndirectCpiImpactPct =
      oilIndirectCpiImpactPct + gasIndirectCpiImpactPct;
    const coreCpiContributionPct =
      networkIndirectCpiImpactPct * options.coreAllocationShare;

    return {
      index: row.index,
      year: row.year,
      month: row.month,
      oilPriceMultiple,
      gasPriceMultiple,
      importEnergyPriceMultiple:
        1 +
        options.oilInputShare * (oilPriceMultiple - 1) +
        options.gasInputShare * (gasPriceMultiple - 1),
      oilIndirectCpiImpactPct,
      gasIndirectCpiImpactPct,
      networkIndirectCpiImpactPct,
      networkCoreSubindexPriceGapPct:
        coreCpiContributionPct / options.coreCpiWeight,
      networkOtherCpiContributionPct:
        networkIndirectCpiImpactPct * (1 - options.coreAllocationShare),
    };
  });
  const result: WeberEnergyPricePaths = {
    months,
    importEnergyPricePath: months.map(
      (row) => row.importEnergyPriceMultiple,
    ),
    networkCorePriceGapPathPct: months.map(
      (row) => row.networkCoreSubindexPriceGapPct,
    ),
    networkOtherCpiContributionPathPct: months.map(
      (row) => row.networkOtherCpiContributionPct,
    ),
  };
  assertFiniteDeep(result, 'Hormuz-Weber price paths');
  return result;
}

/**
 * Same-frequency adapter from regional Hormuz commodity prices to the direct
 * import-energy and indirect Weber price-level paths consumed by inflation V3.
 */
export const hormuzWeberPriceAdapter = defineAdapter<
  HormuzWeberAdapterInput,
  WeberEnergyPricePaths
>({
  id: 'hormuz-to-weber-energy-prices',
  version: '1.0.0',
  description:
    'Map monthly regional oil/gas prices through Weber total-requirements exposures into direct and indirect euro-area price paths.',
  sourceModel: 'hormuz-stock-flow',
  targetModel: 'energy-inflation-policy-v3',
  sourceTimeScale: { kind: 'monthly' },
  targetTimeScale: { kind: 'monthly' },
  semanticValidation: 'required',
  sourcePorts: {
    oilPriceMultiple: measurementPort(
      '1',
      hormuzEstimands.oecdOilPriceMultipleMonthly,
    ),
    gasPriceMultiple: measurementPort(
      '1',
      hormuzEstimands.oecdGasPriceMultipleMonthly,
    ),
  },
  targetPorts: {
    importEnergyPriceMultiple: measurementPort(
      '1',
      weberEnergyInflationEstimands.importEnergyPriceMultiple,
    ),
    networkIndirectCpiImpactPct: measurementPort(
      'percentage-point',
      weberEnergyInflationEstimands.networkIndirectCpiImpact,
    ),
    networkCoreSubindexPriceGapPct: measurementPort(
      '%',
      weberEnergyInflationEstimands.networkCoreSubindexPriceGap,
    ),
    networkOtherCpiContributionPct: measurementPort(
      'percentage-point',
      weberEnergyInflationEstimands.networkOtherCpiContribution,
    ),
  },
  portMappings: [
    {
      source: 'oilPriceMultiple',
      target: 'importEnergyPriceMultiple',
      conversion: {
        kind: 'custom',
        description: 'Apply the explicit oil share of the import-energy basket.',
        convert: (value) => value,
      },
      aggregation: { kind: 'none' },
      crosswalk: hormuzWeberCrosswalks.oilToImportEnergy,
    },
    {
      source: 'gasPriceMultiple',
      target: 'importEnergyPriceMultiple',
      conversion: {
        kind: 'custom',
        description: 'Apply the explicit gas share of the import-energy basket.',
        convert: (value) => value,
      },
      aggregation: { kind: 'none' },
      crosswalk: hormuzWeberCrosswalks.gasToImportEnergy,
    },
    {
      source: 'oilPriceMultiple',
      target: 'networkIndirectCpiImpactPct',
      conversion: {
        kind: 'custom',
        description:
          'Propagate oil through Weber petroleum and oil-gas total-requirements exposures.',
        convert: (value) => value,
      },
      aggregation: { kind: 'none' },
      crosswalk: hormuzWeberCrosswalks.oilToNetworkImpact,
    },
    {
      source: 'gasPriceMultiple',
      target: 'networkIndirectCpiImpactPct',
      conversion: {
        kind: 'custom',
        description:
          'Propagate gas through Weber utilities and oil-gas total-requirements exposures.',
        convert: (value) => value,
      },
      aggregation: { kind: 'none' },
      crosswalk: hormuzWeberCrosswalks.gasToNetworkImpact,
    },
    {
      source: 'oilPriceMultiple',
      target: 'networkCoreSubindexPriceGapPct',
      conversion: {
        kind: 'custom',
        description: 'Allocate the oil network contribution to the core subindex.',
        convert: (value) => value,
      },
      aggregation: { kind: 'none' },
      crosswalk: hormuzWeberCrosswalks.oilToCoreGap,
    },
    {
      source: 'gasPriceMultiple',
      target: 'networkCoreSubindexPriceGapPct',
      conversion: {
        kind: 'custom',
        description: 'Allocate the gas network contribution to the core subindex.',
        convert: (value) => value,
      },
      aggregation: { kind: 'none' },
      crosswalk: hormuzWeberCrosswalks.gasToCoreGap,
    },
    {
      source: 'oilPriceMultiple',
      target: 'networkOtherCpiContributionPct',
      conversion: {
        kind: 'custom',
        description: 'Allocate the residual oil network contribution outside core.',
        convert: (value) => value,
      },
      aggregation: { kind: 'none' },
      crosswalk: hormuzWeberCrosswalks.oilToOtherContribution,
    },
    {
      source: 'gasPriceMultiple',
      target: 'networkOtherCpiContributionPct',
      conversion: {
        kind: 'custom',
        description: 'Allocate the residual gas network contribution outside core.',
        convert: (value) => value,
      },
      aggregation: { kind: 'none' },
      crosswalk: hormuzWeberCrosswalks.gasToOtherContribution,
    },
  ],
  adapt: ({ simulation, options = defaultWeberEnergyBridgeOptions }) =>
    buildWeberEnergyPricePaths(simulation, options),
});

export function runHormuzWeberPriceAdapter(
  input: HormuzWeberAdapterInput,
): WeberEnergyPricePaths {
  return runAdapter(hormuzWeberPriceAdapter, input).target;
}

function extendHormuzScenario(
  scenario: HormuzScenario,
  horizonMonths: number,
): HormuzScenario {
  if (scenario.throughputPath.length > horizonMonths) {
    throw new Error(
      `Hormuz scenario has ${scenario.throughputPath.length} months, ` +
        `longer than the ${horizonMonths}-month bridge horizon`,
    );
  }
  const normalMonths = horizonMonths - scenario.throughputPath.length;
  return {
    ...scenario,
    id: `${scenario.id}-${horizonMonths}m`,
    label: `${scenario.label} (${horizonMonths}-month inflation horizon)`,
    description:
      `${scenario.description} The inflation adapter extends the route at ` +
      'normal throughput after the declared scenario path.',
    throughputPath: [
      ...scenario.throughputPath,
      ...Array<number>(normalMonths).fill(1),
    ],
    bypassAvailabilityPath: scenario.bypassAvailabilityPath
      ? [
          ...scenario.bypassAvailabilityPath,
          ...Array<number>(
            horizonMonths - scenario.bypassAvailabilityPath.length,
          ).fill(1),
        ]
      : undefined,
  };
}

export function makeHormuzWeberInflationScenario(options: {
  id: string;
  label: string;
  hormuzScenario: HormuzScenario;
  hormuzParams: HormuzModelParams;
  inflationScenario: EnergyInflationScenario;
  bridgeOptions?: Partial<WeberEnergyBridgeOptions>;
}): HormuzWeberInflationScenario {
  return {
    id: options.id,
    label: options.label,
    hormuzScenario: options.hormuzScenario,
    hormuzParams: options.hormuzParams,
    inflationScenario: options.inflationScenario,
    bridgeOptions: {
      ...defaultWeberEnergyBridgeOptions,
      ...options.bridgeOptions,
    },
  };
}

export function makeEnergyInflationNetworkScenario(options: {
  id: string;
  label: string;
  inflationScenario: EnergyInflationScenario;
  pricePaths: WeberEnergyPricePaths;
  coreCpiWeight?: number;
}): EnergyInflationNetworkScenario {
  return {
    ...options.inflationScenario,
    id: options.id,
    label: options.label,
    importEnergyPricePath: options.pricePaths.importEnergyPricePath,
    coreCpiWeight:
      options.coreCpiWeight ?? defaultWeberEnergyBridgeOptions.coreCpiWeight,
    networkCorePriceGapPathPct:
      options.pricePaths.networkCorePriceGapPathPct,
    networkOtherCpiContributionPathPct:
      options.pricePaths.networkOtherCpiContributionPathPct,
  };
}

export function simulateHormuzWeberInflation(
  scenario: HormuzWeberInflationScenario,
): HormuzWeberInflationResult {
  assertFiniteDeep(scenario, 'Hormuz-Weber inflation scenario');
  validateBridgeOptions(scenario.bridgeOptions);
  if (
    scenario.inflationScenario.energyCpiWeight +
      scenario.bridgeOptions.coreCpiWeight >
    1
  ) {
    throw new Error(
      'energyCpiWeight + bridge coreCpiWeight must be at most 1',
    );
  }
  const extendedHormuzScenario = extendHormuzScenario(
    scenario.hormuzScenario,
    scenario.bridgeOptions.horizonMonths,
  );
  const hormuz = simulateHormuzDisruption(
    extendedHormuzScenario,
    scenario.hormuzParams,
  );
  const pricePaths = runHormuzWeberPriceAdapter({
    simulation: hormuz,
    options: scenario.bridgeOptions,
  });
  const inflationScenario = makeEnergyInflationNetworkScenario({
    id: `${scenario.inflationScenario.id}-${scenario.hormuzScenario.id}-weber`,
    label:
      `${scenario.inflationScenario.label}: ` +
      `${scenario.hormuzScenario.label}, Weber propagation`,
    inflationScenario: scenario.inflationScenario,
    pricePaths,
    coreCpiWeight: scenario.bridgeOptions.coreCpiWeight,
  });
  const inflation = simulateEnergyInflationV3(inflationScenario);
  const result: HormuzWeberInflationResult = {
    scenario,
    revision: 'hormuz-weber-network-v3',
    hormuz,
    pricePaths,
    inflation,
  };
  assertFiniteDeep(result, 'Hormuz-Weber inflation result');
  return result;
}

export const hormuzWeberEvidence = {
  weberDoi: 'https://doi.org/10.1093/icc/dtad080',
  notes:
    'Weber total-requirements exposures are fitted on 2000–2019 and checked against published 2021-Q4 and 2022-Q2 shock vectors.',
} as const;

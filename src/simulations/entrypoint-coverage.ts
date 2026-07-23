/**
 * Unit-contract disposition for every exported simulation runner in
 * src/simulations. A source-scan test keeps this inventory exhaustive.
 */
export type EntrypointCoverage =
  | {
      status: 'registered';
      modelId: string;
      reason?: never;
      coveredBy?: never;
    }
  | {
      status: 'validation-component';
      reason: string;
      coveredBy: string;
      modelId?: never;
    };

export const SIMULATION_ENTRYPOINT_COVERAGE = {
  simulateHeatEvent: { status: 'registered', modelId: 'acute-heat-event' },
  simulateGenericDrugEconomics: { status: 'registered', modelId: 'generic-drug-economics' },
  simulateGenericTariffTransition: {
    status: 'registered',
    modelId: 'generic-drug-tariff-transition',
  },
  simulateDataCenterGrid: {
    status: 'registered',
    modelId: 'data-center-grid-cost-allocation',
  },
  simulateBilateralTariff: { status: 'registered', modelId: 'bilateral-tariff-io' },
  simulatePriceShock: { status: 'registered', modelId: 'critical-material-price-network' },
  simulateDynamicNetwork: { status: 'registered', modelId: 'critical-material-flow-network' },
  simulateFinancialContagion: { status: 'registered', modelId: 'sovereign-nbfi-contagion' },
  simulateMaritimeNetwork: { status: 'registered', modelId: 'multi-chokepoint-maritime' },
  simulateDefenseSourcing: { status: 'registered', modelId: 'defense-magnet-sourcing' },
  simulateHormuzDisruption: { status: 'registered', modelId: 'hormuz-stock-flow' },
  simulateOutbreakV2: { status: 'registered', modelId: 'outbreak-preparedness' },
  makeForecast: { status: 'registered', modelId: 'outbreak-probabilistic-forecast' },
  runWarAiExperiment: { status: 'registered', modelId: 'war-ai-factorial' },

  simulateCisplatinBackcast: {
    status: 'validation-component',
    reason: 'Frozen historical mechanism reconstruction used only by calibration.',
    coveredBy: 'generic-drug-economics',
  },
  simulateOutbreakV1: {
    status: 'validation-component',
    reason: 'Superseded calibration baseline retained for V1-to-V2 comparison.',
    coveredBy: 'outbreak-preparedness',
  },
  simulateHistoricalDisruption: {
    status: 'validation-component',
    reason: 'Historical event adapter around the registered dynamic material network.',
    coveredBy: 'critical-material-flow-network',
  },
  simulateEmpiricalDominantProducerLoss: {
    status: 'validation-component',
    reason: 'Empirical scenario adapter around the registered dynamic material network.',
    coveredBy: 'critical-material-flow-network',
  },
} as const satisfies Record<string, EntrypointCoverage>;

/** Composition roots use graph contracts rather than standalone ModelDefinition wrappers. */
export const COMPOSITION_ENTRYPOINT_COVERAGE = {
  runSimulation: 'auditGlobalUnitContracts + standard collector contract audit',
  runAutowiredSimulation: 'auditGlobalUnitContracts + standard collector contract audit',
  runAgingSim: 'auditAgingUnitContracts',
  runGlobalCitySimulation: 'composes the audited global and aging-city entry points',
} as const;

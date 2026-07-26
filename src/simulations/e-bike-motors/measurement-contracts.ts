import {
  defineEstimand,
  defineMeasurement,
  defineSemanticDerivation,
  type EstimandContract,
  type MeasurementBinding,
  type SemanticDerivation,
} from 'tsimulation';
import {
  EBIKE_REGIONS,
  type EbikeRegion,
} from './data.js';

type EstimandSpec = Omit<
  EstimandContract,
  'schemaVersion' | 'id' | 'version'
>;

function estimand(id: string, spec: EstimandSpec): EstimandContract {
  return defineEstimand({
    schemaVersion: 'tsimulation.estimand/v1',
    id: `estimand.e-bike-motors.${id}`,
    version: '1.0.0',
    ...spec,
  });
}

const geographies: Record<EbikeRegion, EstimandContract['geography']> = {
  us: {
    id: 'geo.us',
    label: 'United States',
    boundaryVersion: 'current-national-boundary',
  },
  eu: {
    id: 'geo.eu27-uk',
    label: 'EU27 plus United Kingdom',
    boundaryVersion: 'post-brexit-current-boundary',
  },
  china: {
    id: 'geo.china',
    label: 'Mainland China',
    boundaryVersion: 'current-national-boundary',
  },
  japan: {
    id: 'geo.japan',
    label: 'Japan',
    boundaryVersion: 'current-national-boundary',
  },
  row: {
    id: 'geo.world-ex-us-eu27-uk-china-japan',
    label: 'Rest of world',
    boundaryVersion: 'model-region-v1',
  },
};

const global = {
  id: 'geo.world',
  label: 'World',
  boundaryVersion: 'model-region-v1',
} as const;

const annualSum = {
  kind: 'interval',
  interval: 'calendar-year',
  aggregation: 'sum',
  calendar: 'gregorian',
} as const;

const annualMean = {
  kind: 'interval',
  interval: 'calendar-year',
  aggregation: 'mean',
  calendar: 'gregorian',
} as const;

const pointInTime = {
  kind: 'instant',
  calendar: 'gregorian',
} as const;

const completeEbikePopulation = {
  id: 'population.complete-electric-bicycles',
  label: 'Complete electric bicycles in the applicable source boundary',
  universe:
    'Complete electric bicycles, pedal-assist cycles, or regulated power-assist cycles counted by the named regional data system.',
  exclusion: [
    'standalone replacement motors',
    'motorcycles outside the regional electric-bicycle boundary',
  ],
} as const;

function regionSalesEstimand(region: EbikeRegion): EstimandContract {
  const boundary =
    region === 'china'
      ? 'domestic production used as a same-year drive-unit demand proxy'
      : region === 'japan'
        ? 'factory shipments of power-assist bicycles'
        : region === 'row'
          ? 'model-harmonized new complete e-bike demand'
          : 'new complete e-bike retail sales';
  return estimand(`${region}.annual-complete-ebike-market-flow`, {
    quantityKind: `e-bike.${region}.complete-bike-market-flow`,
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: {
      ...completeEbikePopulation,
      inclusion: [boundary],
      ...(region === 'us'
        ? { inclusion: [boundary, 'dealer and direct-to-consumer channels'] }
        : {}),
    },
    geography: geographies[region],
    time: annualSum,
    description:
      'The regional source boundary is intentionally not assumed identical across countries.',
  });
}

function regionStockEstimand(region: EbikeRegion): EstimandContract {
  return estimand(`${region}.installed-complete-ebike-stock`, {
    quantityKind: `e-bike.${region}.installed-complete-bike-stock`,
    measure: { kind: 'stock', totality: 'total', accounting: 'gross' },
    population: completeEbikePopulation,
    geography: geographies[region],
    time: pointInTime,
  });
}

function regionMarketComponentEstimand(
  region: EbikeRegion,
  component: 'replacement' | 'new-adoption',
): EstimandContract {
  return estimand(`${region}.${component}-complete-ebike-market-flow`, {
    quantityKind: `e-bike.${region}.${component}.complete-bike-market-flow`,
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: {
      ...completeEbikePopulation,
      inclusion: [
        component === 'replacement'
          ? 'complete bikes replacing retirements from the installed fleet'
          : 'complete bikes that increase the installed fleet',
      ],
    },
    geography: geographies[region],
    time: annualSum,
  });
}

function regionalEntrantFlowEstimand(
  region: EbikeRegion,
  kind: 'addressable' | 'delivered',
): EstimandContract {
  return estimand(`${region}.us-entrant-${kind}-drive-units`, {
    quantityKind: `e-bike.${region}.us-entrant.${kind}-drive-unit-equivalent`,
    measure: {
      kind: 'flow',
      totality: 'total',
      accounting: 'gross',
    },
    population: {
      id: `population.${region}.us-entrant-${kind}-drive-unit-equivalents`,
      label:
        kind === 'addressable'
          ? 'Regional drive-unit demand open to the modeled U.S. entrant'
          : 'Regional drive units delivered by the modeled U.S. entrant',
      inclusion:
        kind === 'addressable'
          ? [
              'the entrant architecture',
              'the region-specific contestable-market fraction',
            ]
          : ['new units delivered by the modeled U.S. entrant'],
    },
    geography: geographies[region],
    time: annualSum,
  });
}

export const ebikeMotorEstimands = {
  calendarYear: estimand('calendar-year', {
    quantityKind: 'calendar.gregorian-year-label',
    measure: { kind: 'level' },
    time: pointInTime,
  }),
  regionalAnnualMarketFlow: Object.fromEntries(
    EBIKE_REGIONS.map((region) => [region, regionSalesEstimand(region)]),
  ) as Record<EbikeRegion, EstimandContract>,
  regionalInstalledStock: Object.fromEntries(
    EBIKE_REGIONS.map((region) => [region, regionStockEstimand(region)]),
  ) as Record<EbikeRegion, EstimandContract>,
  regionalReplacementFlow: Object.fromEntries(
    EBIKE_REGIONS.map((region) => [
      region,
      regionMarketComponentEstimand(region, 'replacement'),
    ]),
  ) as Record<EbikeRegion, EstimandContract>,
  regionalNewAdoptionFlow: Object.fromEntries(
    EBIKE_REGIONS.map((region) => [
      region,
      regionMarketComponentEstimand(region, 'new-adoption'),
    ]),
  ) as Record<EbikeRegion, EstimandContract>,
  regionalEntrantAddressableFlow: Object.fromEntries(
    EBIKE_REGIONS.map((region) => [
      region,
      regionalEntrantFlowEstimand(region, 'addressable'),
    ]),
  ) as Record<EbikeRegion, EstimandContract>,
  regionalEntrantDeliveredFlow: Object.fromEntries(
    EBIKE_REGIONS.map((region) => [
      region,
      regionalEntrantFlowEstimand(region, 'delivered'),
    ]),
  ) as Record<EbikeRegion, EstimandContract>,
  regionalPopulation: Object.fromEntries(
    EBIKE_REGIONS.map((region) => [
      region,
      estimand(`${region}.resident-population`, {
        quantityKind: 'demography.resident-population',
        measure: { kind: 'stock', totality: 'total' },
        geography: geographies[region],
        time: pointInTime,
      }),
    ]),
  ) as Record<EbikeRegion, EstimandContract>,
  globalDriveUnitDemand: estimand(
    'global.new-drive-unit-equivalent-demand',
    {
      quantityKind: 'e-bike.global.new-drive-unit-equivalent-demand',
      measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
      population: {
        id: 'population.global-new-e-bike-drive-unit-equivalents',
        label: 'New e-bike drive-unit equivalents',
        inclusion: [
          'one drive-unit equivalent per complete regional market-flow unit',
        ],
        exclusion: [
          'aftermarket replacement motors not attached to a new complete bike',
        ],
      },
      geography: global,
      time: annualSum,
    },
  ),
  architectureDriveUnits: estimand(
    'global.named-architecture-new-drive-units',
    {
      quantityKind: 'e-bike.named-architecture.new-drive-unit-equivalent',
      measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
      population: {
        id: 'population.new-e-bike-drive-unit-equivalents',
        label: 'New e-bike drive-unit equivalents',
        inclusion: [
          'the hub or mid-drive architecture named by row metadata',
          'one drive-unit equivalent per complete regional market-flow unit',
        ],
        exclusion: ['aftermarket replacement motors not attached to a new bike'],
      },
      geography: global,
      time: annualSum,
    },
  ),
  supplierDriveUnits: estimand('global.named-supplier-drive-units', {
    quantityKind: 'e-bike.named-supplier.new-drive-unit-equivalent',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: {
      id: 'population.named-supplier-new-drive-unit-equivalents',
      label: 'New drive-unit equivalents supplied by a named company',
      inclusion: [
        'the motor supplier named by row metadata',
        'one drive-unit equivalent per complete regional market-flow unit',
      ],
      exclusion: ['aftermarket replacement motors not attached to a new bike'],
    },
    geography: global,
    time: annualSum,
  }),
  entrantQualifiedOems: estimand('entrant.qualified-oem-programs', {
    quantityKind: 'e-bike.us-entrant.qualified-oem-program-count',
    measure: { kind: 'stock', totality: 'total' },
    population: {
      id: 'population.us-entrant-qualified-oem-programs',
      label: 'Bicycle OEM programs qualified to use the entrant drive system',
    },
    geography: global,
    time: pointInTime,
  }),
  entrantCapacity: estimand('entrant.annual-drive-unit-capacity', {
    quantityKind: 'e-bike.us-entrant.annual-drive-unit-capacity',
    measure: { kind: 'flow', totality: 'total' },
    population: {
      id: 'population.us-entrant-drive-unit-capacity',
      label: 'Entrant drive units supportable by the named constraint',
    },
    geography: global,
    time: annualSum,
  }),
  entrantRevenue: estimand('entrant.real-revenue', {
    quantityKind: 'e-bike.us-entrant.revenue',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    geography: global,
    time: annualSum,
    valuation: {
      priceBasis: 'real',
      currency: 'USD',
      priceYear: 2026,
      exchangeRateBasis: 'market',
    },
  }),
  entrantOperatingIncome: estimand('entrant.real-operating-income', {
    quantityKind: 'e-bike.us-entrant.operating-income',
    measure: { kind: 'flow', totality: 'total', accounting: 'net' },
    geography: global,
    time: annualSum,
    valuation: {
      priceBasis: 'real',
      currency: 'USD',
      priceYear: 2026,
      exchangeRateBasis: 'market',
    },
  }),
  entrantCashFlow: estimand('entrant.real-free-cash-flow', {
    quantityKind: 'e-bike.us-entrant.free-cash-flow',
    measure: { kind: 'flow', totality: 'total', accounting: 'net' },
    geography: global,
    time: annualSum,
    valuation: {
      priceBasis: 'real',
      currency: 'USD',
      priceYear: 2026,
      exchangeRateBasis: 'market',
    },
  }),
  entrantCumulativeCash: estimand('entrant.cumulative-real-cash-flow', {
    quantityKind: 'e-bike.us-entrant.cumulative-free-cash-flow',
    measure: { kind: 'stock', totality: 'total', accounting: 'net' },
    geography: global,
    time: pointInTime,
    valuation: {
      priceBasis: 'real',
      currency: 'USD',
      priceYear: 2026,
      exchangeRateBasis: 'market',
    },
  }),
  annualGrowthRate: estimand('market.annual-growth-rate', {
    quantityKind: 'e-bike.market.annual-growth-rate',
    measure: { kind: 'rate' },
    ratio: {
      numerator: 'change in annual complete-bike market flow',
      denominator: 'prior-year annual complete-bike market flow',
    },
    time: annualMean,
  }),
} as const;

export const usDtc2024Measurement: MeasurementBinding = defineMeasurement({
  schemaVersion: 'tsimulation.measurement/v1',
  id: 'measurement.peopleforbikes.circana-us-dtc-ebikes-2024',
  version: '1.0.0',
  estimand: estimand('us.direct-to-consumer-new-ebike-sales', {
    quantityKind: 'e-bike.us.complete-bike-retail-sale',
    measure: { kind: 'flow', totality: 'total', accounting: 'gross' },
    population: {
      ...completeEbikePopulation,
      inclusion: ['new direct-to-consumer transactions measured by Circana'],
      exclusion: ['dealer channel', 'used-bike transactions'],
    },
    geography: geographies.us,
    time: annualSum,
  }),
  dataset: {
    id: 'peopleforbikes.circana-dtc-2024',
    field: 'estimated_new_dtc_units',
  },
  procedure: {
    description:
      'PeopleForBikes/Circana estimate of previously unmeasured U.S. direct-to-consumer e-bike unit sales.',
  },
  phenomenonTime: { start: '2024-01-01', end: '2024-12-31' },
  resultTime: '2026-06-24',
  revisionPolicy: 'revisable',
  release: 'revised',
  coverage: {
    geography: 'United States',
    population: 'Measured direct-to-consumer new e-bike transactions',
    missingness: 'Does not include the dealer or used-bike channels.',
  },
});

export const eu2023SalesMeasurement: MeasurementBinding = defineMeasurement({
  schemaVersion: 'tsimulation.measurement/v1',
  id: 'measurement.conebi.eu27-uk-ebike-sales-2023',
  version: '1.0.0',
  estimand: ebikeMotorEstimands.regionalAnnualMarketFlow.eu,
  dataset: {
    id: 'conebi.bimp-2024',
    field: 'eu27_uk_2023_e-bike_sales',
  },
  procedure: {
    description:
      'CONEBI aggregation of national-industry-association new e-bike retail sales.',
  },
  phenomenonTime: { start: '2023-01-01', end: '2023-12-31' },
  resultTime: '2024-06-27',
  revisionPolicy: 'revisable',
  release: 'revised',
});

export const china2023ProductionMeasurement: MeasurementBinding =
  defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'measurement.china-government.ebike-production-2023',
    version: '1.0.0',
    estimand: ebikeMotorEstimands.regionalAnnualMarketFlow.china,
    dataset: {
      id: 'china.miit.ebike-industry-2023',
      field: 'major_enterprise_output_units',
    },
    procedure: {
      description:
        'Chinese government report of 2023 electric-bicycle output by major enterprises; used as the model production/demand proxy without relabeling it retail sales.',
    },
    phenomenonTime: { start: '2023-01-01', end: '2023-12-31' },
    resultTime: '2024-05-07',
    revisionPolicy: 'revisable',
    release: 'revised',
    coverage: {
      geography: 'Mainland China',
      population: 'Major electric-bicycle manufacturing enterprises',
      missingness:
        'Production may differ from domestic sell-through because of exports, inventories, and firms outside the reporting boundary.',
    },
  });

export const japan2022ShipmentMeasurement: MeasurementBinding =
  defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'measurement.meti.japan-power-assist-shipments-2022',
    version: '1.0.0',
    estimand: ebikeMotorEstimands.regionalAnnualMarketFlow.japan,
    dataset: {
      id: 'japan.meti.bicycle-factory-shipments',
      field: 'power_assist_bicycle_shipments_2022',
    },
    procedure: {
      description:
        'Rounded METI factory-shipment count cited in Japanese Diet testimony.',
    },
    phenomenonTime: { start: '2022-01-01', end: '2022-12-31' },
    resultTime: '2024-04-12',
    revisionPolicy: 'final',
    release: 'final',
  });

export const bafang2024DriveUnitMeasurement: MeasurementBinding =
  defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'measurement.bafang.annual-report-drive-units-2024',
    version: '1.0.0',
    estimand: ebikeMotorEstimands.supplierDriveUnits,
    dataset: {
      id: 'bafang.2024-annual-report',
      field: 'hub_plus_mid_plus_integrated_wheel_sales',
    },
    procedure: {
      description:
        'Sum reported hub-motor, mid-drive, and integrated-wheel unit sales.',
    },
    phenomenonTime: { start: '2024-01-01', end: '2024-12-31' },
    resultTime: '2025-04-29',
    revisionPolicy: 'final',
    release: 'final',
    notes:
      'The product mix crosses European pedelec and Chinese electric-two-wheeler boundaries.',
  });

export const ananda2024ComparableMeasurement: MeasurementBinding =
  defineMeasurement({
    schemaVersion: 'tsimulation.measurement/v1',
    id: 'measurement.ananda.annual-report-comparable-drive-units-2024',
    version: '1.0.0',
    estimand: ebikeMotorEstimands.supplierDriveUnits,
    dataset: {
      id: 'ananda.2024-annual-report-and-prospectus',
      field: 'direct_hub_plus_geared_hub_plus_mid_drive_estimate',
    },
    procedure: {
      description:
        'Combine disclosed mid-drive sales with direct-hub growth and a transparent geared-hub estimate to form a comparable model target.',
    },
    phenomenonTime: { start: '2024-01-01', end: '2024-12-31' },
    resultTime: '2025-04-29',
    revisionPolicy: 'revisable',
    release: 'revised',
    notes:
      'The modeled comparable target is less certain than Bafang because the annual report does not disclose one clean all-motor total.',
  });

export const usChannelExpansionDerivation: SemanticDerivation =
  defineSemanticDerivation({
    schemaVersion: 'tsimulation.derivation/v1',
    id: 'derivation.e-bike-motors.us-dtc-to-total-new-sales',
    version: '1.0.0',
    description:
      'Construct a rounded U.S. total-new-sales anchor from the newly measured direct-to-consumer channel and the statement that it approximately doubled the previously visible market.',
    inputEstimandIds: [usDtc2024Measurement.estimand.id],
    outputEstimand: ebikeMotorEstimands.regionalAnnualMarketFlow.us,
    expression:
      'total new sales ≈ 2 × 450,000 newly measured direct-to-consumer units = 900,000',
    assumptions: [
      '“Roughly doubled” is represented by exactly two for a transparent scenario anchor.',
      'Approximately 80,000 used-bike transactions are excluded from new-bike motor demand.',
    ],
    evidenceIds: ['e-bike-us-2024-channel-expansion'],
  });

export const bikeToDriveUnitDerivation: SemanticDerivation =
  defineSemanticDerivation({
    schemaVersion: 'tsimulation.derivation/v1',
    id: 'derivation.e-bike-motors.complete-bike-to-drive-unit-equivalent',
    version: '1.0.0',
    description:
      'Translate the five non-identical regional complete-bike market flows into drive-unit-equivalent demand.',
    inputEstimandIds: EBIKE_REGIONS.map(
      (region) => ebikeMotorEstimands.regionalAnnualMarketFlow[region].id,
    ),
    outputEstimand: ebikeMotorEstimands.globalDriveUnitDemand,
    expression:
      'global new drive-unit equivalents = sum(region annual complete-bike market flow × one drive unit per complete bike)',
    assumptions: [
      'Every complete e-bike in the regional market-flow boundary contains one drive-unit equivalent.',
      'Aftermarket replacement motors are excluded.',
      'The aggregation preserves the heterogeneous regional reporting boundaries; it is a supply-demand proxy, not a harmonized consumer-sales statistic.',
    ],
    evidenceIds: [
      'e-bike-us-2024-channel-expansion',
      'e-bike-eu-2023-sales',
      'e-bike-china-2023-output',
      'e-bike-japan-2022-shipments',
    ],
  });

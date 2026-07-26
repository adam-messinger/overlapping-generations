import {
  metadataPort,
  objectPort,
  unitPort,
  vectorPort,
} from 'tsimulation';
import type {
  ProductTradeEdge,
  TradeNetworkParameters,
  TradeNetworkSnapshot,
  TradeNetworkSnapshotMetadata,
  TradeNetworkTariffScenario,
} from './network-data.js';
import type {
  TradeNetworkExporterResult,
  TradeNetworkProductResult,
  TradeNetworkSectorResult,
  TradeNetworkTariffResult,
} from './network-model.js';

const sourceUrlsPort =
  objectPort<TradeNetworkSnapshotMetadata['sourceUrls']>({
    baci: metadataPort('string', 'CEPII BACI source URL.'),
    census: metadataPort(
      'string',
      'Census international-trade API source URL.',
    ),
    section122Tariff: metadataPort(
      'string',
      'Expiring Section 122 legal schedule URL.',
    ),
    tariffNotice: metadataPort(
      'string',
      'New Section 301 legal schedule URL.',
    ),
  });

export const TRADE_NETWORK_SNAPSHOT_METADATA_PORT =
  objectPort<TradeNetworkSnapshotMetadata>({
    id: metadataPort('string', 'Snapshot identifier.'),
    label: metadataPort('string', 'Snapshot label.'),
    importerIso3: metadataPort(
      'string',
      'ISO3 importer identifier.',
    ),
    tradeFlowYear: unitPort('calendar-year'),
    currentFlowPeriod: metadataPort(
      'string',
      'Current Census year-month observation period.',
    ),
    currentFlowMonths: unitPort('month'),
    baciVersion: metadataPort(
      'string',
      'CEPII BACI release version.',
    ),
    hsRevision: metadataPort(
      'string',
      'Harmonized System revision.',
    ),
    edgeFloorMillion: unitPort('$M/year'),
    retainedBaciValueShare: unitPort('fraction'),
    currentValueCoverageShare: unitPort('fraction'),
    exemptionValuation: metadataPort(
      'string',
      'HTS exemption valuation procedure.',
    ),
    sharedExistingMeasureValuation: metadataPort(
      'string',
      'Existing Chapter 99 scope valuation procedure.',
    ),
    sourceUrls: sourceUrlsPort,
  });

export const PRODUCT_TRADE_EDGE_PORT =
  objectPort<ProductTradeEdge>({
    exporterIso3: metadataPort(
      'string',
      'Exporter ISO3 identifier.',
    ),
    exporterName: metadataPort('string', 'Exporter name.'),
    hs6: metadataPort('string', 'HS6 product code.'),
    productLabel: metadataPort(
      'string',
      'HS6 product description.',
    ),
    sector: metadataPort(
      'string',
      'Coarse U.S. input-output sector.',
    ),
    annualImportBillion: unitPort('$B/year'),
    nonUsExportsBillion: unitPort('$B/year'),
    baselineMfnRate: unitPort('fraction'),
    oldTaxableShare: unitPort('fraction'),
    oldTaxableShareLow: unitPort('fraction'),
    oldTaxableShareHigh: unitPort('fraction'),
    newTaxableShare: unitPort('fraction'),
    newTaxableShareLow: unitPort('fraction'),
    newTaxableShareHigh: unitPort('fraction'),
    oldAdditionalTariffRate: unitPort('fraction'),
    newAdditionalTariffRate: unitPort('fraction'),
    treatment: metadataPort(
      'string',
      'Country-level tariff treatment.',
    ),
  });

export const TRADE_NETWORK_SNAPSHOT_PORT =
  objectPort<TradeNetworkSnapshot>({
    metadata: TRADE_NETWORK_SNAPSHOT_METADATA_PORT,
    edges: vectorPort<ProductTradeEdge>(
      PRODUCT_TRADE_EDGE_PORT,
    ),
  });

export const TRADE_NETWORK_PARAMETERS_PORT =
  objectPort<TradeNetworkParameters>({
    supplierSubstitutionElasticity: unitPort('1'),
    importDemandElasticity: unitPort('1'),
    tariffPassThrough: unitPort('fraction'),
    exemptionScopeCase: metadataPort(
      'string',
      'Low, central, or high taxable-share case.',
    ),
    redirectableNonUsSupplyShare: unitPort('fraction'),
    shortRunCapacityGrowthShare: unitPort('fraction'),
    domesticRecaptureShare: unitPort('fraction'),
    domesticValueAddedShare: unitPort('fraction'),
    usNominalGdpBillion: unitPort('$B'),
  });

export const TRADE_NETWORK_SCENARIO_PORT =
  objectPort<TradeNetworkTariffScenario>({
    id: metadataPort('string', 'Scenario identifier.'),
    label: metadataPort('string', 'Scenario label.'),
    snapshot: TRADE_NETWORK_SNAPSHOT_PORT,
    parameters: TRADE_NETWORK_PARAMETERS_PORT,
  });

export const TRADE_NETWORK_PRODUCT_RESULT_PORT =
  objectPort<TradeNetworkProductResult>({
    hs6: metadataPort('string', 'HS6 product code.'),
    productLabel: metadataPort(
      'string',
      'HS6 product description.',
    ),
    sector: metadataPort(
      'string',
      'Coarse U.S. input-output sector.',
    ),
    baselineImportsBillion: unitPort('$B/year'),
    realizedImportsBillion: unitPort('$B/year'),
    oldTaxableImportsBillion: unitPort('$B/year'),
    newTaxableImportsBillion: unitPort('$B/year'),
    supplierCount: unitPort('1'),
    baselineSupplierHhi: unitPort('1'),
    postTariffSupplierHhi: unitPort('1'),
    deliveredImportPriceChange: unitPort('fraction'),
    importQuantityDecline: unitPort('fraction'),
    supplierReallocationBillion: unitPort('$B/year'),
    capacityConstrainedImportsBillion:
      unitPort('$B/year'),
    effectiveOldAdditionalTariffRate:
      unitPort('fraction'),
    effectiveNewAdditionalTariffRate:
      unitPort('fraction'),
  });

export const TRADE_NETWORK_EXPORTER_RESULT_PORT =
  objectPort<TradeNetworkExporterResult>({
    exporterIso3: metadataPort(
      'string',
      'Exporter ISO3 identifier.',
    ),
    exporterName: metadataPort('string', 'Exporter name.'),
    baselineImportsBillion: unitPort('$B/year'),
    realizedImportsBillion: unitPort('$B/year'),
    demandAdjustedBaselineBillion: unitPort('$B/year'),
    supplierDiversionGainBillion: unitPort('$B/year'),
    totalImportChangeBillion: unitPort('$B/year'),
  });

export const TRADE_NETWORK_SECTOR_RESULT_PORT =
  objectPort<TradeNetworkSectorResult>({
    sector: metadataPort(
      'string',
      'Coarse U.S. input-output sector.',
    ),
    baselineImportsBillion: unitPort('$B/year'),
    oldTaxableImportsBillion: unitPort('$B/year'),
    newTaxableImportsBillion: unitPort('$B/year'),
    directSectorCostShock: unitPort('fraction'),
    totalSectorPriceChange: unitPort('fraction'),
    importsLostBillion: unitPort('$B/year'),
    supplierReallocationBillion: unitPort('$B/year'),
  });

export const TRADE_NETWORK_RESULT_PORT =
  objectPort<TradeNetworkTariffResult>({
    scenarioId: metadataPort('string', 'Scenario identifier.'),
    label: metadataPort('string', 'Scenario label.'),
    tradeFlowYear: unitPort('calendar-year'),
    currentFlowPeriod: metadataPort(
      'string',
      'Current Census year-month observation period.',
    ),
    totalImportsBillion: unitPort('$B/year'),
    oldTaxableImportsBillion: unitPort('$B/year'),
    newTaxableImportsBillion: unitPort('$B/year'),
    effectiveOldAdditionalTariffRate:
      unitPort('fraction'),
    effectiveNewAdditionalTariffRate:
      unitPort('fraction'),
    effectiveIncrementalTariffRate: unitPort('fraction'),
    deliveredImportPriceChange: unitPort('fraction'),
    importsLostBillion: unitPort('$B/year'),
    supplierReallocationBillion: unitPort('$B/year'),
    capacityConstrainedImportsBillion:
      unitPort('$B/year'),
    oldTariffRevenueBillion: unitPort('$B/year'),
    newTariffRevenueBillion: unitPort('$B/year'),
    additionalTariffRevenueBillion: unitPort('$B/year'),
    directConsumerPriceChange: unitPort('fraction'),
    usConsumerPriceChange: unitPort('fraction'),
    ioPriceAmplification: unitPort('1'),
    domesticReplacementBillion: unitPort('$B/year'),
    usRealGdpChange: unitPort('fraction'),
    weightedSupplierHhiBefore: unitPort('1'),
    weightedSupplierHhiAfter: unitPort('1'),
    productsWithAtLeastThreeSuppliersShare:
      unitPort('fraction'),
    sourceTradeValueCoverageShare: unitPort('fraction'),
    exemptionScopeCase: metadataPort(
      'string',
      'Low, central, or high taxable-share case.',
    ),
    products: vectorPort<TradeNetworkProductResult>(
      TRADE_NETWORK_PRODUCT_RESULT_PORT,
    ),
    exporters: vectorPort<TradeNetworkExporterResult>(
      TRADE_NETWORK_EXPORTER_RESULT_PORT,
    ),
    sectors: vectorPort<TradeNetworkSectorResult>(
      TRADE_NETWORK_SECTOR_RESULT_PORT,
    ),
  });

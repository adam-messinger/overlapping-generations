import type { TradeSectorId } from './data.js';

export type TariffTreatment =
  | 'outside-investigation'
  | 'ten-percent'
  | 'twelve-five-percent'
  | 'mfn-cap-ten'
  | 'mfn-cap-twelve-five';

export interface TradeNetworkSnapshotMetadata {
  id: string;
  label: string;
  importerIso3: 'USA';
  tradeFlowYear: number;
  currentFlowPeriod: string;
  currentFlowMonths: number;
  baciVersion: string;
  hsRevision: 'HS22';
  edgeFloorMillion: number;
  retainedBaciValueShare: number;
  currentValueCoverageShare: number;
  exemptionValuation:
    'HTS10-world-composition-plus-HS6-entry-preferences';
  sharedExistingMeasureValuation:
    'January-2026-HS6-Chapter99-share';
  sourceUrls: {
    baci: string;
    census: string;
    section122Tariff: string;
    tariffNotice: string;
  };
}

/**
 * A directed exporter -> United States edge for one HS6 product.
 *
 * Tariff rates are additional policy rates, excluding ordinary MFN duty.
 * For capped economies, `newAdditionalTariffRate` has already had the
 * estimated MFN rate netted out.
 */
export interface ProductTradeEdge {
  exporterIso3: string;
  exporterName: string;
  hs6: string;
  productLabel: string;
  sector: TradeSectorId;
  annualImportBillion: number;
  nonUsExportsBillion: number;
  baselineMfnRate: number;
  /** Central estimate for the share taxed by the expiring Section 122 action. */
  oldTaxableShare: number;
  /** Bounds reflect partial-product and existing-measure scope ambiguity. */
  oldTaxableShareLow: number;
  oldTaxableShareHigh: number;
  /** Central estimate for the share taxed by the new Section 301 action. */
  newTaxableShare: number;
  /** Bounds reflect partial-product and existing-measure scope ambiguity. */
  newTaxableShareLow: number;
  newTaxableShareHigh: number;
  oldAdditionalTariffRate: number;
  newAdditionalTariffRate: number;
  treatment: TariffTreatment;
}

export interface TradeNetworkSnapshot {
  metadata: TradeNetworkSnapshotMetadata;
  edges: readonly ProductTradeEdge[];
}

export type SerializedTradeNetworkEdge = readonly [
  exporterIndex: number,
  productIndex: number,
  annualImportBillion: number,
  nonUsExportsBillion: number,
  baselineMfnRate: number,
  oldTaxableShare: number,
  oldTaxableShareLow: number,
  oldTaxableShareHigh: number,
  newTaxableShare: number,
  newTaxableShareLow: number,
  newTaxableShareHigh: number,
  oldAdditionalTariffRate: number,
  newAdditionalTariffRate: number,
  treatmentIndex: number,
];

export interface SerializedTradeNetworkSnapshot {
  schemaVersion: 2;
  metadata: TradeNetworkSnapshotMetadata;
  sourceHashes: {
    baciZipSha256: string;
    section122AnnexSha256: string;
    ustrTextSha256: string;
  };
  countries: readonly (readonly [
    iso3: string,
    name: string,
  ])[];
  products: readonly (readonly [
    hs6: string,
    label: string,
    sector: TradeSectorId,
  ])[];
  treatments: readonly TariffTreatment[];
  edges: readonly SerializedTradeNetworkEdge[];
}

const serializedTreatments: readonly TariffTreatment[] = [
  'outside-investigation',
  'ten-percent',
  'twelve-five-percent',
  'mfn-cap-ten',
  'mfn-cap-twelve-five',
];

export function serializeTradeNetworkSnapshot(
  snapshot: TradeNetworkSnapshot,
  sourceHashes: SerializedTradeNetworkSnapshot['sourceHashes'],
): SerializedTradeNetworkSnapshot {
  const countries: [string, string][] = [];
  const countryIndex = new Map<string, number>();
  const products: [string, string, TradeSectorId][] = [];
  const productIndex = new Map<string, number>();
  const treatmentIndex = new Map(
    serializedTreatments.map((treatment, index) => [
      treatment,
      index,
    ]),
  );
  const edges: SerializedTradeNetworkEdge[] =
    snapshot.edges.map((edge) => {
      let exporter = countryIndex.get(edge.exporterIso3);
      if (exporter === undefined) {
        exporter = countries.length;
        countryIndex.set(edge.exporterIso3, exporter);
        countries.push([
          edge.exporterIso3,
          edge.exporterName,
        ]);
      }
      let product = productIndex.get(edge.hs6);
      if (product === undefined) {
        product = products.length;
        productIndex.set(edge.hs6, product);
        products.push([
          edge.hs6,
          edge.productLabel,
          edge.sector,
        ]);
      }
      const treatment = treatmentIndex.get(edge.treatment);
      if (treatment === undefined) {
        throw new Error(
          `Unknown tariff treatment '${edge.treatment}'`,
        );
      }
      return [
        exporter,
        product,
        edge.annualImportBillion,
        edge.nonUsExportsBillion,
        edge.baselineMfnRate,
        edge.oldTaxableShare,
        edge.oldTaxableShareLow,
        edge.oldTaxableShareHigh,
        edge.newTaxableShare,
        edge.newTaxableShareLow,
        edge.newTaxableShareHigh,
        edge.oldAdditionalTariffRate,
        edge.newAdditionalTariffRate,
        treatment,
      ];
    });
  return {
    schemaVersion: 2,
    metadata: snapshot.metadata,
    sourceHashes,
    countries,
    products,
    treatments: serializedTreatments,
    edges,
  };
}

export function deserializeTradeNetworkSnapshot(
  serialized: SerializedTradeNetworkSnapshot,
): TradeNetworkSnapshot {
  if (serialized.schemaVersion !== 2) {
    throw new Error(
      `Unsupported trade-network snapshot schema ${String(serialized.schemaVersion)}`,
    );
  }
  return {
    metadata: serialized.metadata,
    edges: serialized.edges.map((row, index) => {
      const country = serialized.countries[row[0]];
      const product = serialized.products[row[1]];
      const treatment = serialized.treatments[row[13]];
      if (!country || !product || !treatment) {
        throw new Error(
          `Invalid dictionary index in serialized trade edge ${index}`,
        );
      }
      return {
        exporterIso3: country[0],
        exporterName: country[1],
        hs6: product[0],
        productLabel: product[1],
        sector: product[2],
        annualImportBillion: row[2],
        nonUsExportsBillion: row[3],
        baselineMfnRate: row[4],
        oldTaxableShare: row[5],
        oldTaxableShareLow: row[6],
        oldTaxableShareHigh: row[7],
        newTaxableShare: row[8],
        newTaxableShareLow: row[9],
        newTaxableShareHigh: row[10],
        oldAdditionalTariffRate: row[11],
        newAdditionalTariffRate: row[12],
        treatment,
      };
    }),
  };
}

export interface TradeNetworkParameters {
  /** Armington-style substitution among exporters of the same HS6 product. */
  supplierSubstitutionElasticity: number;
  /** Aggregate import-demand response to the product-level tariff price index. */
  importDemandElasticity: number;
  tariffPassThrough: number;
  exemptionScopeCase: 'low-taxable' | 'central' | 'high-taxable';
  /** Share of non-U.S. exports that can be redirected to the U.S. in year one. */
  redirectableNonUsSupplyShare: number;
  /** Organic one-year expansion above the supplier's baseline U.S. shipments. */
  shortRunCapacityGrowthShare: number;
  domesticRecaptureShare: number;
  domesticValueAddedShare: number;
  usNominalGdpBillion: number;
}

export interface TradeNetworkTariffScenario {
  id: string;
  label: string;
  snapshot: TradeNetworkSnapshot;
  parameters: TradeNetworkParameters;
}

export const tradeNetworkCentralParameters: TradeNetworkParameters = {
  supplierSubstitutionElasticity: 1.5,
  importDemandElasticity: 1.5,
  tariffPassThrough: 0.8,
  exemptionScopeCase: 'central',
  redirectableNonUsSupplyShare: 0.10,
  shortRunCapacityGrowthShare: 0.05,
  domesticRecaptureShare: 0.30,
  domesticValueAddedShare: 0.55,
  usNominalGdpBillion: 31_000,
};

/**
 * Transparent HS chapter -> small U.S. use-table bridge. It is deliberately
 * coarse: the country-product graph resolves tariff incidence and supplier
 * substitution; this crosswalk only determines downstream U.S. propagation.
 */
export function tradeSectorForHs6(hs6: string): TradeSectorId {
  const chapter = Number(hs6.slice(0, 2));
  if (chapter >= 1 && chapter <= 24) return 'food';
  if (chapter >= 50 && chapter <= 67) return 'apparel';
  if ((chapter >= 44 && chapter <= 49) || chapter === 94) return 'wood-consumer';
  if ((chapter >= 84 && chapter <= 85) || (chapter >= 90 && chapter <= 91)) {
    return 'machinery';
  }
  if (chapter >= 86 && chapter <= 89) return 'transport';
  if ((chapter >= 25 && chapter <= 40) || (chapter >= 68 && chapter <= 83)) {
    return 'materials';
  }
  return 'other-goods';
}

export const tradeNetworkEvidence = {
  baci:
    'https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html',
  census:
    'https://api.census.gov/data/timeseries/intltrade/imports/hsimport.html',
  censusCountrySubcodes:
    'https://www.census.gov/foreign-trade/reference/codes/csc.html',
  censusRateProvisions:
    'https://www.census.gov/foreign-trade/reference/rpcodes.html',
  section122:
    'https://www.whitehouse.gov/presidential-actions/2026/02/imposing-a-temporary-import-surcharge-to-address-fundamental-international-payments-problems/',
  tariffNotice:
    'https://ustr.gov/sites/default/files/files/Press/Releases/2026/FLIP%20301%20Investigation%20Final%20Action%20FRN%207-23-26%20FINAL.pdf',
  usitc2018:
    'https://www.usitc.gov/sites/default/files/publications/332/pub5405.pdf',
} as const;

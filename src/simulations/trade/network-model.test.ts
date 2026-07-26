import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deserializeTradeNetworkSnapshot,
  serializeTradeNetworkSnapshot,
  tradeNetworkCentralParameters,
  type ProductTradeEdge,
  type TradeNetworkTariffScenario,
} from './network-data.js';
import { simulateTradeNetworkTariff } from './network-model.js';

const edge = (
  overrides: Partial<ProductTradeEdge>,
): ProductTradeEdge => ({
  exporterIso3: 'AAA',
  exporterName: 'Supplier A',
  hs6: '850760',
  productLabel: 'Lithium-ion batteries',
  sector: 'machinery',
  annualImportBillion: 60,
  nonUsExportsBillion: 120,
  baselineMfnRate: 0.025,
  oldTaxableShare: 1,
  oldTaxableShareLow: 1,
  oldTaxableShareHigh: 1,
  newTaxableShare: 1,
  newTaxableShareLow: 1,
  newTaxableShareHigh: 1,
  oldAdditionalTariffRate: 0,
  newAdditionalTariffRate: 0.25,
  treatment: 'twelve-five-percent',
  ...overrides,
});

const scenario = (
  edges: readonly ProductTradeEdge[],
): TradeNetworkTariffScenario => ({
  id: 'toy-network',
  label: 'Toy country-product graph',
  snapshot: {
    metadata: {
      id: 'toy',
      label: 'Toy snapshot',
      importerIso3: 'USA',
      tradeFlowYear: 2024,
      currentFlowPeriod: '2026-05',
      currentFlowMonths: 5,
      baciVersion: '202601',
      hsRevision: 'HS22',
      edgeFloorMillion: 0,
      retainedBaciValueShare: 1,
      currentValueCoverageShare: 1,
      exemptionValuation:
        'HTS10-world-composition-plus-HS6-entry-preferences',
      sharedExistingMeasureValuation:
        'January-2026-HS6-Chapter99-share',
      sourceUrls: {
        baci: 'https://example.com/baci',
        census: 'https://example.com/census',
        section122Tariff:
          'https://example.com/section-122',
        tariffNotice: 'https://example.com/notice',
      },
    },
    edges,
  },
  parameters: tradeNetworkCentralParameters,
});

test('same-product alternatives absorb part of a country tariff', () => {
  const result = simulateTradeNetworkTariff(
    scenario([
      edge({}),
      edge({
        exporterIso3: 'BBB',
        exporterName: 'Supplier B',
        annualImportBillion: 40,
        nonUsExportsBillion: 200,
        newAdditionalTariffRate: 0,
        treatment: 'outside-investigation',
      }),
    ]),
  );
  const supplierA = result.exporters.find(
    (row) => row.exporterIso3 === 'AAA',
  );
  const supplierB = result.exporters.find(
    (row) => row.exporterIso3 === 'BBB',
  );
  assert.ok(supplierA);
  assert.ok(supplierB);
  assert.ok(supplierA.supplierDiversionGainBillion < 0);
  assert.ok(supplierB.supplierDiversionGainBillion > 0);
  assert.ok(result.supplierReallocationBillion > 0);
  assert.ok(result.usConsumerPriceChange > 0);
});

test('capacity prevents a tiny alternate supplier from scaling without bound', () => {
  const constrainedScenario = scenario([
      edge({
        annualImportBillion: 99,
        nonUsExportsBillion: 0,
        newAdditionalTariffRate: 2,
      }),
      edge({
        exporterIso3: 'BBB',
        exporterName: 'Tiny supplier',
        annualImportBillion: 1,
        nonUsExportsBillion: 0,
        newAdditionalTariffRate: 0,
        treatment: 'outside-investigation',
      }),
    ]);
  constrainedScenario.parameters = {
    ...constrainedScenario.parameters,
    supplierSubstitutionElasticity: 5,
    importDemandElasticity: 0.2,
  };
  const constrained = simulateTradeNetworkTariff(
    constrainedScenario,
  );
  const tiny = constrained.exporters.find(
    (row) => row.exporterIso3 === 'BBB',
  );
  assert.ok(tiny);
  assert.ok(
    Math.abs(tiny.realizedImportsBillion - 1.05) < 1e-9,
  );
});

test('unchanged edge-specific rates produce no price or diversion shock', () => {
  const result = simulateTradeNetworkTariff(
    scenario([
      edge({
        oldAdditionalTariffRate: 0.10,
        newAdditionalTariffRate: 0.10,
      }),
      edge({
        exporterIso3: 'BBB',
        exporterName: 'Supplier B',
        annualImportBillion: 40,
        oldAdditionalTariffRate: 0.10,
        newAdditionalTariffRate: 0.10,
      }),
    ]),
  );
  assert.ok(Math.abs(result.usConsumerPriceChange) < 1e-12);
  assert.ok(Math.abs(result.supplierReallocationBillion) < 1e-12);
  assert.ok(Math.abs(result.importsLostBillion) < 1e-12);
});

test('a coverage change matters even when nominal tariff rates are unchanged', () => {
  const result = simulateTradeNetworkTariff(
    scenario([
      edge({
        oldAdditionalTariffRate: 0.10,
        newAdditionalTariffRate: 0.10,
        oldTaxableShare: 0.25,
        oldTaxableShareLow: 0.25,
        oldTaxableShareHigh: 0.25,
        newTaxableShare: 0.75,
        newTaxableShareLow: 0.75,
        newTaxableShareHigh: 0.75,
      }),
    ]),
  );
  assert.ok(result.deliveredImportPriceChange > 0);
  assert.ok(result.usConsumerPriceChange > 0);
  assert.ok(
    result.effectiveNewAdditionalTariffRate >
      result.effectiveOldAdditionalTariffRate,
  );
});

test('price changes are measured from the old duty-inclusive delivered price', () => {
  const result = simulateTradeNetworkTariff(
    scenario([
      edge({
        hs6: '850760',
        annualImportBillion: 50,
        baselineMfnRate: 0,
        oldAdditionalTariffRate: 0,
        newAdditionalTariffRate: 0.10,
      }),
      edge({
        hs6: '850780',
        productLabel: 'Other electric accumulators',
        annualImportBillion: 50,
        baselineMfnRate: 0,
        oldAdditionalTariffRate: 0.10,
        newAdditionalTariffRate: 0.20,
      }),
    ]),
  );
  const fromZero = result.products.find(
    (row) => row.hs6 === '850760',
  );
  const fromTen = result.products.find(
    (row) => row.hs6 === '850780',
  );
  assert.ok(fromZero);
  assert.ok(fromTen);
  assert.ok(
    fromTen.deliveredImportPriceChange <
      fromZero.deliveredImportPriceChange,
  );
});

test('normalized snapshot serialization preserves every edge field', () => {
  const original = scenario([
    edge({}),
    edge({
      exporterIso3: 'BBB',
      exporterName: 'Supplier B',
      annualImportBillion: 40,
      oldTaxableShare: 0.5,
      oldTaxableShareLow: 0.25,
      oldTaxableShareHigh: 0.75,
      newTaxableShare: 0.6,
      newTaxableShareLow: 0.4,
      newTaxableShareHigh: 0.8,
      treatment: 'mfn-cap-ten',
    }),
  ]).snapshot;
  const serialized = serializeTradeNetworkSnapshot(
    original,
    {
      baciZipSha256: 'abc',
      section122AnnexSha256: 'ghi',
      ustrTextSha256: 'def',
    },
  );
  const restored =
    deserializeTradeNetworkSnapshot(serialized);
  assert.deepEqual(restored, original);
  assert.equal(serialized.countries.length, 2);
  assert.equal(serialized.products.length, 1);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  deserializeTradeNetworkSnapshot,
  tradeNetworkCentralParameters,
  type SerializedTradeNetworkSnapshot,
} from './network-data.js';
import { simulateTradeNetworkTariff } from './network-model.js';

const serialized = JSON.parse(
  await readFile(
    new URL(
      '../../../data/trade/forced-labor-2026-network.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as SerializedTradeNetworkSnapshot;
const snapshot = deserializeTradeNetworkSnapshot(serialized);

test('checked-in country-product graph is coherent and retains nearly all trade', () => {
  assert.equal(serialized.schemaVersion, 2);
  assert.ok(serialized.countries.length >= 180);
  assert.ok(serialized.products.length >= 5_000);
  assert.ok(serialized.edges.length >= 50_000);
  assert.match(
    serialized.sourceHashes.baciZipSha256,
    /^[a-f0-9]{64}$/,
  );
  assert.ok(snapshot.metadata.retainedBaciValueShare > 0.99);
  assert.ok(snapshot.metadata.currentValueCoverageShare > 0.97);

  const edgeKeys = new Set<string>();
  let totalImportsBillion = 0;
  for (const edge of snapshot.edges) {
    edgeKeys.add(`${edge.exporterIso3}:${edge.hs6}`);
    totalImportsBillion += edge.annualImportBillion;
    assert.ok(
      edge.oldTaxableShareLow <= edge.oldTaxableShare &&
        edge.oldTaxableShare <= edge.oldTaxableShareHigh,
    );
    assert.ok(
      edge.newTaxableShareLow <= edge.newTaxableShare &&
        edge.newTaxableShare <= edge.newTaxableShareHigh,
    );
  }
  assert.equal(edgeKeys.size, snapshot.edges.length);
  assert.ok(totalImportsBillion > 3_000);
  assert.ok(totalImportsBillion < 3_500);
});

test('checked-in July 2026 tariff result is macro-small but reroutes suppliers', () => {
  const result = simulateTradeNetworkTariff({
    id: 'checked-in-forced-labor-301',
    label: 'Checked-in July 2026 tariff graph',
    snapshot,
    parameters: tradeNetworkCentralParameters,
  });

  assert.ok(Math.abs(result.usConsumerPriceChange) < 0.0002);
  assert.ok(result.supplierReallocationBillion > 5);
  assert.ok(result.supplierReallocationBillion < 30);
  assert.ok(result.weightedSupplierHhiAfter <
    result.weightedSupplierHhiBefore);
});

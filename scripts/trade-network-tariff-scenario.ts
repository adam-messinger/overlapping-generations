import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  deserializeTradeNetworkSnapshot,
  tradeNetworkCentralParameters,
  type SerializedTradeNetworkSnapshot,
} from '../src/simulations/trade/network-data.js';
import {
  simulateTradeNetworkTariff,
  type TradeNetworkTariffResult,
} from '../src/simulations/trade/network-model.js';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const separator = arg.indexOf('=');
    return separator >= 0
      ? [arg.slice(0, separator), arg.slice(separator + 1)]
      : [arg, 'true'];
  }),
);
const input =
  args.get('--input') ??
  'data/trade/forced-labor-2026-network.json';
const output =
  args.get('--output') ??
  'data/trade/forced-labor-2026-results.json';

const serialized = JSON.parse(
  await readFile(input, 'utf8'),
) as SerializedTradeNetworkSnapshot;
const snapshot = deserializeTradeNetworkSnapshot(serialized);

const scopeCases = [
  'low-taxable',
  'central',
  'high-taxable',
] as const;
const simulations = new Map<
  (typeof scopeCases)[number],
  TradeNetworkTariffResult
>();
for (const exemptionScopeCase of scopeCases) {
  simulations.set(
    exemptionScopeCase,
    simulateTradeNetworkTariff({
      id: `forced-labor-301-${exemptionScopeCase}`,
      label:
        'July 2026 Section 301 replacement for the expiring Section 122 tariff',
      snapshot,
      parameters: {
        ...tradeNetworkCentralParameters,
        exemptionScopeCase,
      },
    }),
  );
}

const central = simulations.get('central');
if (!central) {
  throw new Error('Central trade-network simulation is missing');
}

const summarize = (
  result: TradeNetworkTariffResult,
) => ({
  exemptionScopeCase: result.exemptionScopeCase,
  totalImportsBillion: result.totalImportsBillion,
  oldTaxableImportsBillion:
    result.oldTaxableImportsBillion,
  newTaxableImportsBillion:
    result.newTaxableImportsBillion,
  effectiveOldAdditionalTariffRate:
    result.effectiveOldAdditionalTariffRate,
  effectiveNewAdditionalTariffRate:
    result.effectiveNewAdditionalTariffRate,
  effectiveIncrementalTariffRate:
    result.effectiveIncrementalTariffRate,
  deliveredImportPriceChange:
    result.deliveredImportPriceChange,
  usConsumerPriceChange: result.usConsumerPriceChange,
  importsLostBillion: result.importsLostBillion,
  supplierReallocationBillion:
    result.supplierReallocationBillion,
  capacityConstrainedImportsBillion:
    result.capacityConstrainedImportsBillion,
  additionalTariffRevenueBillion:
    result.additionalTariffRevenueBillion,
  usRealGdpChange: result.usRealGdpChange,
  weightedSupplierHhiBefore:
    result.weightedSupplierHhiBefore,
  weightedSupplierHhiAfter:
    result.weightedSupplierHhiAfter,
});

const exporterRanking = central.exporters
  .map((row) => ({
    exporterIso3: row.exporterIso3,
    exporterName: row.exporterName,
    baselineImportsBillion: row.baselineImportsBillion,
    totalImportChangeBillion: row.totalImportChangeBillion,
    supplierDiversionGainBillion:
      row.supplierDiversionGainBillion,
  }));

const results = {
  schemaVersion: 1,
  scenario:
    'July 2026 Section 301 replacement for the expiring Section 122 tariff',
  snapshotId: snapshot.metadata.id,
  assumptions: tradeNetworkCentralParameters,
  uncertainty: Object.fromEntries(
    scopeCases.map((scopeCase) => [
      scopeCase,
      summarize(
        simulations.get(scopeCase) as TradeNetworkTariffResult,
      ),
    ]),
  ),
  central: {
    ...summarize(central),
    sectors: central.sectors
      .map((row) => ({
        sector: row.sector,
        baselineImportsBillion:
          row.baselineImportsBillion,
        directSectorCostShock: row.directSectorCostShock,
        totalSectorPriceChange:
          row.totalSectorPriceChange,
        importsLostBillion: row.importsLostBillion,
        supplierReallocationBillion:
          row.supplierReallocationBillion,
      }))
      .sort(
        (a, b) =>
          Math.abs(b.directSectorCostShock) -
          Math.abs(a.directSectorCostShock),
      ),
    largestExporterLosses: exporterRanking
      .filter((row) => row.totalImportChangeBillion < 0)
      .sort(
        (a, b) =>
          a.totalImportChangeBillion -
          b.totalImportChangeBillion,
      )
      .slice(0, 10),
    largestExporterGains: exporterRanking
      .filter((row) => row.totalImportChangeBillion > 0)
      .sort(
        (a, b) =>
          b.totalImportChangeBillion -
          a.totalImportChangeBillion,
      )
      .slice(0, 10),
    largestProductShocks: central.products
      .slice(0, 15)
      .map((row) => ({
        hs6: row.hs6,
        productLabel: row.productLabel,
        baselineImportsBillion:
          row.baselineImportsBillion,
        deliveredImportPriceChange:
          row.deliveredImportPriceChange,
        importQuantityChangeBillion:
          row.realizedImportsBillion -
          row.baselineImportsBillion,
        supplierReallocationBillion:
          row.supplierReallocationBillion,
      })),
  },
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));

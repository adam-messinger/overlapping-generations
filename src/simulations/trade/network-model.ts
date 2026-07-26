import {
  assertFiniteDeep,
  solveLinearSystem,
  validateNumber,
} from 'tsimulation';

import { tradeSectors, type TradeSectorId } from './data.js';
import type {
  ProductTradeEdge,
  TradeNetworkTariffScenario,
} from './network-data.js';

export interface TradeNetworkProductResult {
  hs6: string;
  productLabel: string;
  sector: TradeSectorId;
  baselineImportsBillion: number;
  realizedImportsBillion: number;
  oldTaxableImportsBillion: number;
  newTaxableImportsBillion: number;
  supplierCount: number;
  baselineSupplierHhi: number;
  postTariffSupplierHhi: number;
  deliveredImportPriceChange: number;
  importQuantityDecline: number;
  supplierReallocationBillion: number;
  capacityConstrainedImportsBillion: number;
  effectiveOldAdditionalTariffRate: number;
  effectiveNewAdditionalTariffRate: number;
}

export interface TradeNetworkExporterResult {
  exporterIso3: string;
  exporterName: string;
  baselineImportsBillion: number;
  realizedImportsBillion: number;
  demandAdjustedBaselineBillion: number;
  supplierDiversionGainBillion: number;
  totalImportChangeBillion: number;
}

export interface TradeNetworkSectorResult {
  sector: TradeSectorId;
  baselineImportsBillion: number;
  oldTaxableImportsBillion: number;
  newTaxableImportsBillion: number;
  directSectorCostShock: number;
  totalSectorPriceChange: number;
  importsLostBillion: number;
  supplierReallocationBillion: number;
}

export interface TradeNetworkTariffResult {
  scenarioId: string;
  label: string;
  tradeFlowYear: number;
  currentFlowPeriod: string;
  totalImportsBillion: number;
  oldTaxableImportsBillion: number;
  newTaxableImportsBillion: number;
  effectiveOldAdditionalTariffRate: number;
  effectiveNewAdditionalTariffRate: number;
  effectiveIncrementalTariffRate: number;
  deliveredImportPriceChange: number;
  importsLostBillion: number;
  supplierReallocationBillion: number;
  capacityConstrainedImportsBillion: number;
  oldTariffRevenueBillion: number;
  newTariffRevenueBillion: number;
  additionalTariffRevenueBillion: number;
  directConsumerPriceChange: number;
  usConsumerPriceChange: number;
  ioPriceAmplification: number;
  domesticReplacementBillion: number;
  usRealGdpChange: number;
  weightedSupplierHhiBefore: number;
  weightedSupplierHhiAfter: number;
  productsWithAtLeastThreeSuppliersShare: number;
  sourceTradeValueCoverageShare: number;
  exemptionScopeCase: 'low-taxable' | 'central' | 'high-taxable';
  products: readonly TradeNetworkProductResult[];
  exporters: readonly TradeNetworkExporterResult[];
  sectors: readonly TradeNetworkSectorResult[];
}

interface EdgeCalculation {
  edge: ProductTradeEdge;
  baselineShare: number;
  deliveredPriceRatio: number;
  desiredWeight: number;
  demandAdjustedBaselineBillion: number;
  realizedImportsBillion: number;
}

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

const taxableShareFor = (
  edge: ProductTradeEdge,
  policy: 'old' | 'new',
  exemptionScopeCase: 'low-taxable' | 'central' | 'high-taxable',
): number => {
  const prefix = policy === 'old' ? 'old' : 'new';
  if (exemptionScopeCase === 'low-taxable') {
    return edge[`${prefix}TaxableShareLow`];
  }
  if (exemptionScopeCase === 'high-taxable') {
    return edge[`${prefix}TaxableShareHigh`];
  }
  return edge[`${prefix}TaxableShare`];
};

const weightedRate = (
  edges: readonly ProductTradeEdge[],
  rate: (edge: ProductTradeEdge) => number,
  policy: 'old' | 'new',
  exemptionScopeCase: 'low-taxable' | 'central' | 'high-taxable',
): number => {
  const imports = sum(edges.map((edge) => edge.annualImportBillion));
  if (imports === 0) return 0;
  return sum(
    edges.map(
      (edge) =>
        edge.annualImportBillion *
        taxableShareFor(edge, policy, exemptionScopeCase) *
        rate(edge),
    ),
  ) / imports;
};

const cesPriceIndex = (
  calculations: readonly EdgeCalculation[],
  elasticity: number,
): number => {
  if (Math.abs(elasticity - 1) < 1e-9) {
    return Math.exp(
      sum(
        calculations.map(
          (row) =>
            row.baselineShare *
            Math.log(row.deliveredPriceRatio),
        ),
      ),
    );
  }
  return Math.pow(
    sum(
      calculations.map(
        (row) =>
          row.baselineShare *
          Math.pow(row.deliveredPriceRatio, 1 - elasticity),
      ),
    ),
    1 / (1 - elasticity),
  );
};

/**
 * Allocates a fixed product total across supplier weights subject to observed
 * short-run capacity. This is a small water-filling solver: suppliers that hit
 * their caps are removed and the remainder is reallocated among unconstrained
 * suppliers.
 */
const allocateWithCapacity = (
  calculations: EdgeCalculation[],
  targetImportsBillion: number,
  redirectableNonUsSupplyShare: number,
  shortRunCapacityGrowthShare: number,
): number => {
  let unallocated = targetImportsBillion;
  let active = calculations.map((_, index) => index);
  const capacities = calculations.map(
    ({ edge }) =>
      edge.annualImportBillion *
        (1 + shortRunCapacityGrowthShare) +
      edge.nonUsExportsBillion *
        redirectableNonUsSupplyShare,
  );

  while (active.length > 0 && unallocated > 1e-12) {
    const activeWeight = sum(
      active.map((index) => calculations[index].desiredWeight),
    );
    if (activeWeight <= 0) break;
    let cappedAny = false;
    const nextActive: number[] = [];

    for (const index of active) {
      const row = calculations[index];
      const proposed =
        unallocated * row.desiredWeight / activeWeight;
      if (proposed > capacities[index] + 1e-12) {
        row.realizedImportsBillion = capacities[index];
        unallocated -= capacities[index];
        cappedAny = true;
      } else {
        nextActive.push(index);
      }
    }

    if (!cappedAny) {
      for (const index of active) {
        calculations[index].realizedImportsBillion =
          unallocated *
          calculations[index].desiredWeight /
          activeWeight;
      }
      unallocated = 0;
      break;
    }
    active = nextActive;
  }

  return Math.max(0, unallocated);
};

const propagateSectorShocks = (
  directShocks: ReadonlyMap<TradeSectorId, number>,
): {
  directConsumerPriceChange: number;
  usConsumerPriceChange: number;
  prices: readonly number[];
} => {
  const position = new Map(
    tradeSectors.map((sector, index) => [sector.id, index]),
  );
  const matrix = tradeSectors.map(() =>
    tradeSectors.map(() => 0),
  );
  const rhs = tradeSectors.map(
    (sector) => directShocks.get(sector.id) ?? 0,
  );

  tradeSectors.forEach((recipient, row) => {
    matrix[row][row] = 1;
    for (const [supplierId, coefficient] of Object.entries(
      recipient.inputs,
    )) {
      const column = position.get(supplierId as TradeSectorId);
      if (column !== undefined) {
        matrix[row][column] -= coefficient ?? 0;
      }
    }
  });

  const prices = solveLinearSystem(matrix, rhs).solution;
  return {
    directConsumerPriceChange: sum(
      tradeSectors.map(
        (sector, index) =>
          sector.finalConsumptionWeight * rhs[index],
      ),
    ),
    usConsumerPriceChange: sum(
      tradeSectors.map(
        (sector, index) =>
          sector.finalConsumptionWeight * prices[index],
      ),
    ),
    prices,
  };
};

/**
 * One-year country-product tariff experiment.
 *
 * The trade graph determines legal incidence, same-product supplier
 * substitution, and capacity. Resulting product shocks are then aggregated
 * into the existing U.S. input-output price network.
 */
export function simulateTradeNetworkTariff(
  scenario: TradeNetworkTariffScenario,
): TradeNetworkTariffResult {
  assertFiniteDeep(scenario, 'trade-network tariff scenario');
  const { snapshot, parameters } = scenario;
  const errors = [
    ...validateNumber(
      parameters.supplierSubstitutionElasticity,
      'supplierSubstitutionElasticity',
      { min: 0 },
    ),
    ...validateNumber(
      parameters.importDemandElasticity,
      'importDemandElasticity',
      { min: 0 },
    ),
    ...validateNumber(
      parameters.tariffPassThrough,
      'tariffPassThrough',
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      parameters.redirectableNonUsSupplyShare,
      'redirectableNonUsSupplyShare',
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      parameters.shortRunCapacityGrowthShare,
      'shortRunCapacityGrowthShare',
      { min: 0 },
    ),
    ...validateNumber(
      parameters.domesticRecaptureShare,
      'domesticRecaptureShare',
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      parameters.domesticValueAddedShare,
      'domesticValueAddedShare',
      { min: 0, max: 1 },
    ),
    ...validateNumber(
      parameters.usNominalGdpBillion,
      'usNominalGdpBillion',
      { min: 0, exclusiveMin: true },
    ),
  ];

  const sectorIds = new Set(tradeSectors.map((sector) => sector.id));
  for (const [index, edge] of snapshot.edges.entries()) {
    errors.push(
      ...validateNumber(
        edge.annualImportBillion,
        `edges[${index}].annualImportBillion`,
        { min: 0, exclusiveMin: true },
      ),
      ...validateNumber(
        edge.nonUsExportsBillion,
        `edges[${index}].nonUsExportsBillion`,
        { min: 0 },
      ),
      ...validateNumber(
        edge.baselineMfnRate,
        `edges[${index}].baselineMfnRate`,
        { min: 0 },
      ),
      ...(['old', 'new'] as const).flatMap((policy) => [
        ...validateNumber(
          edge[`${policy}TaxableShare`],
          `edges[${index}].${policy}TaxableShare`,
          { min: 0, max: 1 },
        ),
        ...validateNumber(
          edge[`${policy}TaxableShareLow`],
          `edges[${index}].${policy}TaxableShareLow`,
          { min: 0, max: 1 },
        ),
        ...validateNumber(
          edge[`${policy}TaxableShareHigh`],
          `edges[${index}].${policy}TaxableShareHigh`,
          { min: 0, max: 1 },
        ),
      ]),
      ...validateNumber(
        edge.oldAdditionalTariffRate,
        `edges[${index}].oldAdditionalTariffRate`,
        { min: 0 },
      ),
      ...validateNumber(
        edge.newAdditionalTariffRate,
        `edges[${index}].newAdditionalTariffRate`,
        { min: 0 },
      ),
    );
    if (!/^\d{6}$/.test(edge.hs6)) {
      errors.push(`edges[${index}].hs6 must contain six digits`);
    }
    if (!sectorIds.has(edge.sector)) {
      errors.push(`edges[${index}].sector is unknown`);
    }
    for (const policy of ['old', 'new'] as const) {
      if (
        edge[`${policy}TaxableShareLow`] >
          edge[`${policy}TaxableShare`] ||
        edge[`${policy}TaxableShare`] >
          edge[`${policy}TaxableShareHigh`]
      ) {
        errors.push(
          `edges[${index}] ${policy} taxable shares must satisfy low <= central <= high`,
        );
      }
    }
  }
  if (snapshot.edges.length === 0) {
    errors.push('snapshot.edges must not be empty');
  }
  if (errors.length > 0) {
    throw new Error(
      `Invalid trade-network tariff scenario:\n  ${errors.join('\n  ')}`,
    );
  }

  const byProduct = new Map<string, ProductTradeEdge[]>();
  for (const edge of snapshot.edges) {
    const rows = byProduct.get(edge.hs6) ?? [];
    rows.push(edge);
    byProduct.set(edge.hs6, rows);
  }

  const productResults: TradeNetworkProductResult[] = [];
  const exporterRows = new Map<
    string,
    TradeNetworkExporterResult
  >();
  const sectorImports = new Map<TradeSectorId, number>();
  const sectorOldTaxable = new Map<TradeSectorId, number>();
  const sectorNewTaxable = new Map<TradeSectorId, number>();
  const sectorLost = new Map<TradeSectorId, number>();
  const sectorRerouted = new Map<TradeSectorId, number>();
  const sectorDeliveredCost = new Map<TradeSectorId, number>();
  let oldTariffRevenueBillion = 0;
  let newTariffRevenueBillion = 0;
  let capacityConstrainedImportsBillion = 0;

  for (const edges of byProduct.values()) {
    const productImports = sum(
      edges.map((edge) => edge.annualImportBillion),
    );
    const calculations: EdgeCalculation[] = edges.map((edge) => {
      const baselineShare =
        edge.annualImportBillion / productImports;
      const oldEffectiveDuty =
        taxableShareFor(
          edge,
          'old',
          parameters.exemptionScopeCase,
        ) * edge.oldAdditionalTariffRate;
      const newEffectiveDuty =
        taxableShareFor(
          edge,
          'new',
          parameters.exemptionScopeCase,
        ) * edge.newAdditionalTariffRate;
      const deliveredPriceRatio =
        (
          1 +
          edge.baselineMfnRate +
          parameters.tariffPassThrough *
            newEffectiveDuty
        ) /
        (
          1 +
          edge.baselineMfnRate +
          parameters.tariffPassThrough *
            oldEffectiveDuty
        );
      return {
        edge,
        baselineShare,
        deliveredPriceRatio,
        desiredWeight:
          baselineShare *
          Math.pow(
            deliveredPriceRatio,
            -parameters.supplierSubstitutionElasticity,
          ),
        demandAdjustedBaselineBillion: 0,
        realizedImportsBillion: 0,
      };
    });
    const priceIndex = cesPriceIndex(
      calculations,
      parameters.supplierSubstitutionElasticity,
    );
    const targetImports =
      productImports *
      Math.pow(
        priceIndex,
        -parameters.importDemandElasticity,
      );
    for (const row of calculations) {
      row.demandAdjustedBaselineBillion =
        targetImports * row.baselineShare;
    }
    const constrained = allocateWithCapacity(
      calculations,
      targetImports,
      parameters.redirectableNonUsSupplyShare,
      parameters.shortRunCapacityGrowthShare,
    );
    capacityConstrainedImportsBillion += constrained;

    const realizedImports = sum(
      calculations.map((row) => row.realizedImportsBillion),
    );
    const realizedShares = calculations.map((row) =>
      realizedImports > 0
        ? row.realizedImportsBillion / realizedImports
        : 0,
    );
    const supplierReallocation = sum(
      calculations.map((row) =>
        Math.max(
          0,
          row.realizedImportsBillion -
            row.demandAdjustedBaselineBillion,
        ),
      ),
    );
    const oldTaxableImports = sum(
      edges.map(
        (edge) =>
          edge.annualImportBillion *
            taxableShareFor(
              edge,
              'old',
              parameters.exemptionScopeCase,
            ),
      ),
    );
    const newTaxableImports = sum(
      edges.map(
        (edge) =>
          edge.annualImportBillion *
            taxableShareFor(
              edge,
              'new',
              parameters.exemptionScopeCase,
            ),
      ),
    );
    const oldRate = weightedRate(
      edges,
      (edge) => edge.oldAdditionalTariffRate,
      'old',
      parameters.exemptionScopeCase,
    );
    const newRate = weightedRate(
      edges,
      (edge) => edge.newAdditionalTariffRate,
      'new',
      parameters.exemptionScopeCase,
    );
    const importsLost = productImports - realizedImports;

    for (const row of calculations) {
      oldTariffRevenueBillion +=
        row.edge.annualImportBillion *
        taxableShareFor(
          row.edge,
          'old',
          parameters.exemptionScopeCase,
        ) *
        row.edge.oldAdditionalTariffRate;
      newTariffRevenueBillion +=
        row.realizedImportsBillion *
        taxableShareFor(
          row.edge,
          'new',
          parameters.exemptionScopeCase,
        ) *
        row.edge.newAdditionalTariffRate;

      const prior =
        exporterRows.get(row.edge.exporterIso3) ?? {
          exporterIso3: row.edge.exporterIso3,
          exporterName: row.edge.exporterName,
          baselineImportsBillion: 0,
          realizedImportsBillion: 0,
          demandAdjustedBaselineBillion: 0,
          supplierDiversionGainBillion: 0,
          totalImportChangeBillion: 0,
        };
      prior.baselineImportsBillion +=
        row.edge.annualImportBillion;
      prior.realizedImportsBillion +=
        row.realizedImportsBillion;
      prior.demandAdjustedBaselineBillion +=
        row.demandAdjustedBaselineBillion;
      prior.supplierDiversionGainBillion +=
        row.realizedImportsBillion -
        row.demandAdjustedBaselineBillion;
      prior.totalImportChangeBillion +=
        row.realizedImportsBillion -
        row.edge.annualImportBillion;
      exporterRows.set(row.edge.exporterIso3, prior);
    }

    const sector = edges[0].sector;
    sectorImports.set(
      sector,
      (sectorImports.get(sector) ?? 0) + productImports,
    );
    sectorOldTaxable.set(
      sector,
      (sectorOldTaxable.get(sector) ?? 0) +
        oldTaxableImports,
    );
    sectorNewTaxable.set(
      sector,
      (sectorNewTaxable.get(sector) ?? 0) +
        newTaxableImports,
    );
    sectorLost.set(
      sector,
      (sectorLost.get(sector) ?? 0) + importsLost,
    );
    sectorRerouted.set(
      sector,
      (sectorRerouted.get(sector) ?? 0) +
        supplierReallocation,
    );
    sectorDeliveredCost.set(
      sector,
      (sectorDeliveredCost.get(sector) ?? 0) +
        productImports * (priceIndex - 1),
    );

    productResults.push({
      hs6: edges[0].hs6,
      productLabel: edges[0].productLabel,
      sector,
      baselineImportsBillion: productImports,
      realizedImportsBillion: realizedImports,
      oldTaxableImportsBillion: oldTaxableImports,
      newTaxableImportsBillion: newTaxableImports,
      supplierCount: edges.length,
      baselineSupplierHhi: sum(
        calculations.map((row) =>
          row.baselineShare * row.baselineShare,
        ),
      ),
      postTariffSupplierHhi: sum(
        realizedShares.map((share) => share * share),
      ),
      deliveredImportPriceChange: priceIndex - 1,
      importQuantityDecline:
        1 - realizedImports / productImports,
      supplierReallocationBillion: supplierReallocation,
      capacityConstrainedImportsBillion: constrained,
      effectiveOldAdditionalTariffRate: oldRate,
      effectiveNewAdditionalTariffRate: newRate,
    });
  }

  const directShocks = new Map<TradeSectorId, number>();
  for (const sector of tradeSectors) {
    directShocks.set(
      sector.id,
      (sectorDeliveredCost.get(sector.id) ?? 0) /
        sector.usAbsorptionBillion,
    );
  }
  const propagated = propagateSectorShocks(directShocks);
  const sectors: TradeNetworkSectorResult[] = tradeSectors.map(
    (sector, index) => ({
      sector: sector.id,
      baselineImportsBillion:
        sectorImports.get(sector.id) ?? 0,
      oldTaxableImportsBillion:
        sectorOldTaxable.get(sector.id) ?? 0,
      newTaxableImportsBillion:
        sectorNewTaxable.get(sector.id) ?? 0,
      directSectorCostShock:
        directShocks.get(sector.id) ?? 0,
      totalSectorPriceChange: propagated.prices[index],
      importsLostBillion: sectorLost.get(sector.id) ?? 0,
      supplierReallocationBillion:
        sectorRerouted.get(sector.id) ?? 0,
    }),
  );

  const totalImportsBillion = sum(
    snapshot.edges.map((edge) => edge.annualImportBillion),
  );
  const oldTaxableImportsBillion = sum(
    snapshot.edges.map(
      (edge) =>
        edge.annualImportBillion *
          taxableShareFor(
            edge,
            'old',
            parameters.exemptionScopeCase,
          ),
    ),
  );
  const newTaxableImportsBillion = sum(
    snapshot.edges.map(
      (edge) =>
        edge.annualImportBillion *
          taxableShareFor(
            edge,
            'new',
            parameters.exemptionScopeCase,
          ),
    ),
  );
  const importsLostBillion = sum(
    productResults.map((row) => row.baselineImportsBillion -
      row.realizedImportsBillion),
  );
  const supplierReallocationBillion = sum(
    productResults.map(
      (row) => row.supplierReallocationBillion,
    ),
  );
  const effectiveOldAdditionalTariffRate = weightedRate(
    snapshot.edges,
    (edge) => edge.oldAdditionalTariffRate,
    'old',
    parameters.exemptionScopeCase,
  );
  const effectiveNewAdditionalTariffRate = weightedRate(
    snapshot.edges,
    (edge) => edge.newAdditionalTariffRate,
    'new',
    parameters.exemptionScopeCase,
  );
  const domesticReplacementBillion =
    importsLostBillion *
    parameters.domesticRecaptureShare;
  const protectedValueAdded =
    domesticReplacementBillion *
    parameters.domesticValueAddedShare /
    parameters.usNominalGdpBillion;
  const downstreamOutputLoss = sum(
    tradeSectors.map(
      (sector, index) =>
        sector.usValueAddedShare *
        sector.tradeElasticity *
        0.35 *
        propagated.prices[index],
    ),
  );
  const deadweightLoss =
    0.5 *
    Math.max(
      0,
      effectiveNewAdditionalTariffRate -
        effectiveOldAdditionalTariffRate,
    ) *
    importsLostBillion /
    parameters.usNominalGdpBillion;

  productResults.sort(
    (a, b) =>
      b.baselineImportsBillion *
        Math.abs(b.deliveredImportPriceChange) -
      a.baselineImportsBillion *
        Math.abs(a.deliveredImportPriceChange),
  );
  const exporters = [...exporterRows.values()].sort(
    (a, b) =>
      b.baselineImportsBillion - a.baselineImportsBillion,
  );
  const weightedSupplierHhiBefore =
    sum(
      productResults.map(
        (row) =>
          row.baselineImportsBillion *
          row.baselineSupplierHhi,
      ),
    ) / totalImportsBillion;
  const weightedSupplierHhiAfter =
    sum(
      productResults.map(
        (row) =>
          row.realizedImportsBillion *
          row.postTariffSupplierHhi,
      ),
    ) /
    Math.max(
      1e-12,
      sum(
        productResults.map(
          (row) => row.realizedImportsBillion,
        ),
      ),
    );
  const productsWithAtLeastThreeSuppliersShare =
    sum(
      productResults
        .filter((row) => row.supplierCount >= 3)
        .map((row) => row.baselineImportsBillion),
    ) / totalImportsBillion;

  const result: TradeNetworkTariffResult = {
    scenarioId: scenario.id,
    label: scenario.label,
    tradeFlowYear: snapshot.metadata.tradeFlowYear,
    currentFlowPeriod: snapshot.metadata.currentFlowPeriod,
    totalImportsBillion,
    oldTaxableImportsBillion,
    newTaxableImportsBillion,
    effectiveOldAdditionalTariffRate,
    effectiveNewAdditionalTariffRate,
    effectiveIncrementalTariffRate:
      effectiveNewAdditionalTariffRate -
      effectiveOldAdditionalTariffRate,
    deliveredImportPriceChange:
      sum(
        productResults.map(
          (row) =>
            row.baselineImportsBillion *
            row.deliveredImportPriceChange,
        ),
      ) / totalImportsBillion,
    importsLostBillion,
    supplierReallocationBillion,
    capacityConstrainedImportsBillion,
    oldTariffRevenueBillion,
    newTariffRevenueBillion,
    additionalTariffRevenueBillion:
      newTariffRevenueBillion -
      oldTariffRevenueBillion,
    directConsumerPriceChange:
      propagated.directConsumerPriceChange,
    usConsumerPriceChange:
      propagated.usConsumerPriceChange,
    ioPriceAmplification:
      propagated.directConsumerPriceChange !== 0
        ? propagated.usConsumerPriceChange /
          propagated.directConsumerPriceChange
        : 1,
    domesticReplacementBillion,
    usRealGdpChange:
      protectedValueAdded -
      downstreamOutputLoss -
      deadweightLoss,
    weightedSupplierHhiBefore,
    weightedSupplierHhiAfter,
    productsWithAtLeastThreeSuppliersShare,
    sourceTradeValueCoverageShare:
      snapshot.metadata.retainedBaciValueShare,
    exemptionScopeCase: parameters.exemptionScopeCase,
    products: productResults,
    exporters,
    sectors,
  };
  assertFiniteDeep(result, 'trade-network tariff result');
  return result;
}

import { readFile } from 'node:fs/promises';

import {
  evaluateAlphabetCapex,
  evaluateForcedLaborTariffs,
  evaluateOilBuffers,
} from '../src/simulations/news/headline-experiments-2026-07-25.js';
import {
  deserializeTradeNetworkSnapshot,
  tradeNetworkCentralParameters,
  type SerializedTradeNetworkSnapshot,
} from '../src/simulations/trade/network-data.js';
import { simulateTradeNetworkTariff } from '../src/simulations/trade/network-model.js';

const pct = (value: number): string => `${(100 * value).toFixed(1)}%`;
const pp = (value: number): string => `${(100 * value).toFixed(2)}pp`;
const money = (value: number): string =>
  `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(1)}B`;

console.log('=== tsimulation news experiments: 2026-07-25 ===\n');
console.table([
  {
    headline: 'Alphabet burns cash while lifting capex to $195-205B',
    experiment:
      'full-spend headline → incremental capital charge → benefit attribution',
  },
  {
    headline: 'U.S. imposes 10-12.5% forced-labor tariffs on 60 economies',
    experiment:
      'gross tariff → change from expiring 10% → government compliance lever',
  },
  {
    headline: '$100 oil and dwindling U.S. refinery supply',
    experiment:
      'unbuffered shortage → Hormuz stock-flow → crude/product separation',
  },
]);

const alphabet = evaluateAlphabetCapex();
console.log('\n1. Alphabet AI capex');
console.table([
  {
    version: 'V1 headline/full capex',
    coverage:
      `${alphabet.naiveHeadline.cloudProfitToFullCapitalCharge.toFixed(2)}x`,
    'annual capital charge':
      money(alphabet.naiveHeadline.fullCapexCapitalChargeBillion),
    'annual benefit':
      money(alphabet.naiveHeadline.annualizedCurrentCloudOperatingProfitBillion),
  },
  {
    version: 'V2 2024→25 backcast',
    coverage: `${alphabet.backcast2025.capitalChargeCoverage.toFixed(2)}x`,
    'annual capital charge':
      money(alphabet.backcast2025.annualCapitalChargeBillion),
    'annual benefit':
      money(
        alphabet.backcast2025
          .annualIncrementalCloudOperatingProfitBillion,
      ),
  },
  {
    version: 'V2 2025→26 central',
    coverage:
      `${alphabet.currentCentral.capitalChargeCoverage.toFixed(2)}x`,
    'annual capital charge':
      money(alphabet.currentCentral.annualCapitalChargeBillion),
    'annual benefit':
      money(
        alphabet.currentCentral
          .annualIncrementalCloudOperatingProfitBillion,
      ),
  },
  {
    version: 'V3 50% attribution/persistence',
    coverage:
      `${alphabet.attributionDownside.capitalChargeCoverage.toFixed(2)}x`,
    'annual capital charge':
      money(alphabet.currentCentral.annualCapitalChargeBillion),
    'annual benefit':
      money(
        alphabet.attributionDownside
          .annualAttributedCloudOperatingProfitBillion,
      ),
  },
  {
    version: 'V3 prior-cohort productivity at 50%',
    coverage:
      `${alphabet.backcastProductivityProjection.halfProductivityCoverage.toFixed(2)}x`,
    'annual capital charge':
      money(alphabet.currentCentral.annualCapitalChargeBillion),
    'annual benefit':
      money(
        alphabet.backcastProductivityProjection
          .projectedAnnualCloudOperatingProfitBillion * 0.50,
      ),
  },
]);
console.log(
  `Central break-even needs ${pct(
    alphabet.currentCentral.requiredBenefitAttribution,
  )} of the above-trend Cloud profit to be durable/attributable, or ${money(
    alphabet.attributionDownside.otherBusinessBenefitNeededBillion,
  )}/year from depreciation add-backs, Search, TPU sales, or later Cloud cohorts in the current-profit 50% case. A separate one-year-lag projection still clears at ${
    alphabet.backcastProductivityProjection.halfProductivityCoverage.toFixed(2)
  }x if the new cohort retains half of the prior cohort's measured productivity.`,
);

const tariffs = evaluateForcedLaborTariffs();
const tradeNetworkSnapshot = deserializeTradeNetworkSnapshot(
  JSON.parse(
    await readFile(
      new URL(
        '../data/trade/forced-labor-2026-network.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as SerializedTradeNetworkSnapshot,
);
const tradeNetworkTariffs = simulateTradeNetworkTariff({
  id: 'forced-labor-301-central',
  label:
    'July 2026 Section 301 replacement for the expiring Section 122 tariff',
  snapshot: tradeNetworkSnapshot,
  parameters: tradeNetworkCentralParameters,
});
console.log('\n2. Forced-labor tariffs');
console.table([
  {
    comparison: 'V1 new rate versus zero',
    'delivered import price':
      pp(tariffs.naiveFromZero.deliveredImportPriceIncrease),
    'U.S. price level': pp(
      tariffs.naiveFromZero.consumerPriceLevelIncrease,
    ),
    'import quantity': `-${pct(
      tariffs.naiveFromZero.affectedImportQuantityDecline,
    )}`,
    'annual revenue':
      money(tariffs.naiveFromZero.annualTariffRevenueBillion),
  },
  {
    comparison: 'V2 versus expiring 10%',
    'delivered import price': pp(
      tariffs.incrementalFromExpiringTariff
        .deliveredImportPriceIncrease,
    ),
    'U.S. price level': pp(
      tariffs.incrementalFromExpiringTariff
        .consumerPriceLevelIncrease,
    ),
    'import quantity': `-${pct(
      tariffs.incrementalFromExpiringTariff
        .affectedImportQuantityDecline,
    )}`,
    'annual revenue': money(
      tariffs.incrementalFromExpiringTariff
        .additionalAnnualTariffRevenueBillion,
    ),
  },
  {
    comparison: 'V3 first quarter/front-loading',
    'delivered import price': 'same endpoint',
    'U.S. price level': pp(
      tariffs.incrementalFromExpiringTariff
        .firstQuarterConsumerPriceLevelIncrease,
    ),
    'import quantity': 'lagged',
    'annual revenue': 'lagged',
  },
  {
    comparison: 'V4 country × HS6 network',
    'delivered import price':
      pp(tradeNetworkTariffs.deliveredImportPriceChange),
    'U.S. price level':
      pp(tradeNetworkTariffs.usConsumerPriceChange),
    'import quantity': money(
      -tradeNetworkTariffs.importsLostBillion,
    ),
    'annual revenue': money(
      tradeNetworkTariffs.additionalTariffRevenueBillion,
    ),
  },
]);
console.log(
  `The 2.5-point country differential shifts high-rate-country volume by only ${
    pct(
      tariffs.forcedLaborMechanism.highRateCountryRelativeVolumeDecline,
    )
  }; it does not change the relative price of forced-labor and compliant goods within one country. But a representative $10B exporter saves $${
    tariffs.forcedLaborMechanism
      .representativeAnnualSavingsFromComplianceMillion.toFixed(0)
  }M/year by qualifying for 10%, a potentially material government incentive.`,
);
console.log(
  `The legal/customs network covers ${
    tradeNetworkTariffs.products.length.toLocaleString()
  } HS6 products. It reallocates ${money(
    tradeNetworkTariffs.supplierReallocationBillion,
  )} among same-product suppliers even though the all-import price level barely moves; effective additional duties change from ${
    pp(tradeNetworkTariffs.effectiveOldAdditionalTariffRate)
  } to ${pp(
    tradeNetworkTariffs.effectiveNewAdditionalTariffRate,
  )}.`,
);

const oil = evaluateOilBuffers();
console.log('\n3. Oil, inventories, and refineries');
console.table([
  {
    version: 'V1 current output loss/no stocks',
    result: `$${oil.naiveNoBuffer.pricePerBarrel.toFixed(0)}/bbl`,
    interpretation: 'all adjustment forced through current demand',
  },
  {
    version: 'V2 observed June recovery + stocks',
    result:
      `${pct(oil.stockFlowRevision.juneThroughput)} June route throughput`,
    interpretation: 'explains June price retreat and inventory draw',
  },
  {
    version: 'V2 assimilate current $100',
    result:
      `${pct(oil.stockFlowRevision.impliedCurrentThroughput)} implied throughput`,
    interpretation: 'crude-only equivalent is near-closure, not June conditions',
  },
  {
    version: 'V3 refinery/product layer',
    result:
      `${oil.productBottleneck.productScarcityPriceMultiple.toFixed(2)}x product scarcity price`,
    interpretation: 'product tightness can coexist with available crude',
  },
]);
const impliedThroughputs = oil.throughputSensitivity.map(
  (row) => row.impliedCurrentThroughput,
);
console.log(
  `Across 0.15-0.30 short-run demand elasticities, the crude-only equivalent throughput is ${
    pct(Math.min(...impliedThroughputs))
  }-${pct(Math.max(...impliedThroughputs))}.`,
);
console.log('China import-gap decomposition');
console.table([
  {
    'import reduction mb/d':
      oil.chinaBuffer.importReductionPerDay.toFixed(2),
    'June stock draw mb/d':
      oil.chinaBuffer.observedStockDrawPerDay.toFixed(2),
    'stock-draw/import-gap rate':
      pct(oil.chinaBuffer.stockDrawShareOfImportReduction),
    'unresolved: demand/runs/rerouting mb/d':
      oil.chinaBuffer.residualDemandRunCutOrReroutingPerDay.toFixed(2),
  },
]);
console.log('U.S. commercial-buffer runway after the recent SPR draw rate');
console.table(
  oil.usRefineryRunway.map((row) => ({
    'lost net supply mb/d': row.lostNetCrudeSupplyPerDay.toFixed(1),
    'SPR bridge mb/d': row.sprDrawPerDay.toFixed(2),
    'remaining gap mb/d': row.remainingDailyGap.toFixed(2),
    'commercial-buffer days':
      row.commercialBufferDays === null
        ? 'fully bridged'
        : row.commercialBufferDays.toFixed(0),
  })),
);
const severeRunways = oil.usOperationalFloorSensitivity
  .filter((row) => row.lostNetCrudeSupplyPerDay === 3)
  .map((row) => row.commercialBufferDays);
console.log(
  `At a 3 mb/d net loss, changing the assumed operating floor from 350M to 390M barrels moves commercial-stock runway from ${
    Math.max(...severeRunways).toFixed(0)
  } to ${Math.min(...severeRunways).toFixed(0)} days.`,
);

console.log('\nWhere the model differs from headline conventional wisdom');
console.log(
  '- Alphabet: one negative-free-cash-flow quarter is not evidence that the investment already fails. The 2024→25 backcast clears the capital charge; applying even half that cohort productivity to the new cohort also just clears. The same-quarter comparison is less causal and needs roughly three quarters of above-trend Cloud profit to persist or other benefits to contribute.',
);
console.log(
  '- Tariffs: this is not a fresh 10–12.5-point overnight macro shock. The country-by-HS6 customs graph makes the aggregate price impulse smaller still—effectively zero centrally—but reveals material sourcing diversion. The product-level forced-labor channel remains weak; the more plausible mechanism is inducing governments to enact and enforce bans.',
);
console.log(
  '- Oil: at the separately reported May-import and June-stock rates, China’s stock draw is only about one third of the import gap, so “China used strategic reserves/electrification” is not a complete acute explanation. And U.S. refineries need not run out of crude nationally for gasoline and diesel margins to spike: the product/refinery bottleneck is already tighter than the aggregate crude balance.',
);

console.log('\nGuardrails');
console.log(
  '- Alphabet does not disclose an AI-capex allocation or a no-AI Cloud counterfactual. The attribution fork is the result; the point estimate is not.',
);
console.log(
  '- The tariff network values the legal HTS schedules, MFN caps, and observed USMCA/CAFTA entry claims. Partial tariff lines and pre-existing Chapter 99 coverage remain bounded estimates; legal durability, retaliation, exchange rates, and long-run supplier entry are outside this first-year calculation.',
);
console.log(
  '- The oil-price inversion is a crude-only equivalent-throughput estimate conditional on the existing elasticities and inventory assumptions. It can also represent expectations, product tightness, and a risk premium; it is not a physical traffic measurement. China’s residual is deliberately left unidentified.',
);

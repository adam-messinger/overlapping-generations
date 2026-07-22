export type TradeSectorId =
  | 'materials'
  | 'machinery'
  | 'transport'
  | 'food'
  | 'wood-consumer'
  | 'apparel'
  | 'construction'
  | 'other-goods'
  | 'services';

export interface TradeSector {
  id: TradeSectorId;
  label: string;
  usAbsorptionBillion: number;
  finalConsumptionWeight: number;
  usValueAddedShare: number;
  tradeElasticity: number;
  tariffPassThrough: number;
  inputs: Partial<Record<TradeSectorId, number>>;
}

/** Small U.S. use table: input coefficients are shares of recipient cost. */
export const tradeSectors: readonly TradeSector[] = [
  { id: 'materials', label: 'Primary and building materials', usAbsorptionBillion: 900, finalConsumptionWeight: 0.01, usValueAddedShare: 0.025, tradeElasticity: 1.50, tariffPassThrough: 0.90, inputs: {} },
  { id: 'machinery', label: 'Machinery and electrical equipment', usAbsorptionBillion: 1_000, finalConsumptionWeight: 0.035, usValueAddedShare: 0.035, tradeElasticity: 1.35, tariffPassThrough: 0.80, inputs: { materials: 0.14, machinery: 0.04 } },
  { id: 'transport', label: 'Motor vehicles and transport equipment', usAbsorptionBillion: 1_400, finalConsumptionWeight: 0.08, usValueAddedShare: 0.035, tradeElasticity: 1.10, tariffPassThrough: 0.80, inputs: { materials: 0.16, machinery: 0.10 } },
  { id: 'food', label: 'Food, beverages, and agriculture', usAbsorptionBillion: 1_600, finalConsumptionWeight: 0.14, usValueAddedShare: 0.04, tradeElasticity: 3.00, tariffPassThrough: 0.80, inputs: { materials: 0.02, machinery: 0.03 } },
  { id: 'wood-consumer', label: 'Wood, paper, and furniture', usAbsorptionBillion: 600, finalConsumptionWeight: 0.05, usValueAddedShare: 0.02, tradeElasticity: 2.50, tariffPassThrough: 0.80, inputs: { materials: 0.05, machinery: 0.03 } },
  { id: 'apparel', label: 'Footwear, textiles, and apparel', usAbsorptionBillion: 500, finalConsumptionWeight: 0.035, usValueAddedShare: 0.01, tradeElasticity: 4.00, tariffPassThrough: 0.80, inputs: {} },
  { id: 'construction', label: 'Construction and housing services', usAbsorptionBillion: 1_700, finalConsumptionWeight: 0.24, usValueAddedShare: 0.045, tradeElasticity: 0.60, tariffPassThrough: 0.80, inputs: { materials: 0.13, machinery: 0.05, 'wood-consumer': 0.10, transport: 0.03 } },
  { id: 'other-goods', label: 'Other manufactured goods', usAbsorptionBillion: 4_000, finalConsumptionWeight: 0.10, usValueAddedShare: 0.10, tradeElasticity: 1.75, tariffPassThrough: 0.80, inputs: { materials: 0.05, machinery: 0.06, transport: 0.02 } },
  { id: 'services', label: 'Market and public services', usAbsorptionBillion: 12_000, finalConsumptionWeight: 0.31, usValueAddedShare: 0.69, tradeElasticity: 0.30, tariffPassThrough: 0.80, inputs: { machinery: 0.025, transport: 0.015, construction: 0.025, 'other-goods': 0.02 } },
];

export interface BilateralTariffAction {
  id: string;
  partner: 'Canada' | 'Brazil';
  nominalTariff: number;
  affectedImportsBillion: number;
  totalImportsBillion: number;
  affectedImportAllocation: Partial<Record<TradeSectorId, number>>;
  partnerExportsToUsShareOfGdp: number;
  tradeDiversionShare: number;
  partnerInputOutputMultiplier: number;
  domesticRecaptureShare: number;
  domesticValueAddedShare: number;
}

export const canadaJuly2026Tariff: BilateralTariffAction = {
  id: 'canada-section-338-2026',
  partner: 'Canada',
  nominalTariff: 0.50,
  affectedImportsBillion: 20,
  totalImportsBillion: 389,
  affectedImportAllocation: {
    materials: 0.30,
    'wood-consumer': 0.30,
    food: 0.20,
    machinery: 0.05,
    apparel: 0.05,
    'other-goods': 0.10,
  },
  partnerExportsToUsShareOfGdp: 0.19,
  tradeDiversionShare: 0.35,
  partnerInputOutputMultiplier: 1.25,
  domesticRecaptureShare: 0.30,
  domesticValueAddedShare: 0.55,
};

export const brazilJuly2026Tariff: BilateralTariffAction = {
  id: 'brazil-section-301-2026',
  partner: 'Brazil',
  nominalTariff: 0.25,
  affectedImportsBillion: 7,
  // Brazil's trade minister described $7bn as about 18% of exports to the U.S.
  totalImportsBillion: 7 / 0.18,
  affectedImportAllocation: {
    machinery: 0.25,
    'wood-consumer': 0.30,
    apparel: 0.15,
    food: 0.20,
    'other-goods': 0.10,
  },
  partnerExportsToUsShareOfGdp: 0.018,
  tradeDiversionShare: 0.35,
  partnerInputOutputMultiplier: 1.25,
  domesticRecaptureShare: 0.30,
  domesticValueAddedShare: 0.55,
};

export const tariffEvidence = {
  usitc2018: {
    aluminumTariff: 0.10,
    aluminumDeliveredPriceIncrease: 0.08,
    aluminumImportQuantityDecline: 0.311,
    steelTariff: 0.25,
    steelDeliveredPriceIncrease: 0.227,
    steelImportQuantityDecline: 0.24,
    protectedOutputGainBillion2021: 2.3,
    downstreamOutputLossBillion2021: 3.4,
  },
  canada2026: {
    affectedImportsBillion: 20,
    totalImportsBillion: 389,
    averageTariffBefore: 0.031,
    averageTariffAfter: 0.056,
    goodsExportShareToUs: 0.72,
  },
  brazil2026: {
    affectedImportsBillion: 7,
    affectedShareOfUsExports: 0.18,
  },
  sources: {
    usitc: 'https://www.usitc.gov/sites/default/files/publications/332/pub5405.pdf',
    passThrough: 'https://www.nber.org/papers/w25638',
    canadaScope: 'https://apnews.com/article/trump-tariffs-canada-great-depression-trade-ece841a9c029d20be16c065f9a0eccfc',
    canadaOrder: 'https://www.whitehouse.gov/fact-sheets/2026/07/fact-sheet-president-donald-j-trump-imposes-additional-tariffs-on-canada/',
    brazilOrder: 'https://ustr.gov/about/policy-offices/press-office/press-releases/2026/july/ustr-section-301-action-brazils-unreasonable-acts-policies-and-practices',
    brazilScope: 'https://www.investing.com/news/economy-news/us-imposes-25-tariff-on-some-goods-from-brazil-4794624',
  },
} as const;

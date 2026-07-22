/** Published price-shock results used to reproduce the Weber et al. method. */
export interface WeberPeriodObservation {
  shockPct: number;
  totalCpiImpactPct: number;
}

export interface WeberSectorBenchmark {
  id: string;
  label: string;
  consumerSharePct: number;
  forwardLinkageRank: number;
  latent: WeberPeriodObservation;
  covid: WeberPeriodObservation;
  ukraine: WeberPeriodObservation;
}

/**
 * Table 1 in Weber, Jauregui, Teixeira & Nassif Pires (2024), "Inflation in
 * times of overlapping emergencies: Systemically significant prices from an
 * input-output perspective", Industrial and Corporate Change 33(2), 297–341.
 * https://doi.org/10.1093/icc/dtad080
 *
 * `latent` is the 2000–2019 price-volatility experiment. `covid` is the annual
 * change to 2021-Q4 and `ukraine` the annual change to 2022-Q2. These are
 * published model outputs, not realized CPI attribution; they validate our
 * reduced-form implementation of their method, not the causal theory itself.
 */
export const weberBenchmark: readonly WeberSectorBenchmark[] = [
  {
    id: 'petroleum',
    label: 'Petroleum and coal products',
    consumerSharePct: 1.23,
    forwardLinkageRank: 15,
    latent: { shockPct: 21.34, totalCpiImpactPct: 0.42 },
    covid: { shockPct: 75.66, totalCpiImpactPct: 1.48 },
    ukraine: { shockPct: 72.52, totalCpiImpactPct: 1.42 },
  },
  {
    id: 'oil-gas',
    label: 'Oil and gas extraction',
    consumerSharePct: 0.04,
    forwardLinkageRank: 18,
    latent: { shockPct: 23.92, totalCpiImpactPct: 0.19 },
    covid: { shockPct: 94.41, totalCpiImpactPct: 0.77 },
    ukraine: { shockPct: 74.75, totalCpiImpactPct: 0.61 },
  },
  {
    id: 'farms',
    label: 'Farms',
    consumerSharePct: 0.6,
    forwardLinkageRank: 22,
    latent: { shockPct: 9.65, totalCpiImpactPct: 0.19 },
    covid: { shockPct: 22.48, totalCpiImpactPct: 0.43 },
    ukraine: { shockPct: 25.92, totalCpiImpactPct: 0.5 },
  },
  {
    id: 'food',
    label: 'Food, beverage and tobacco products',
    consumerSharePct: 4.33,
    forwardLinkageRank: 23,
    latent: { shockPct: 3.57, totalCpiImpactPct: 0.18 },
    covid: { shockPct: 10.84, totalCpiImpactPct: 0.56 },
    ukraine: { shockPct: 11.32, totalCpiImpactPct: 0.58 },
  },
  {
    id: 'chemicals',
    label: 'Chemical products',
    consumerSharePct: 2.19,
    forwardLinkageRank: 9,
    latent: { shockPct: 4.99, totalCpiImpactPct: 0.16 },
    covid: { shockPct: 18.13, totalCpiImpactPct: 0.57 },
    ukraine: { shockPct: 12.2, totalCpiImpactPct: 0.38 },
  },
  {
    id: 'housing',
    label: 'Housing',
    consumerSharePct: 15.26,
    forwardLinkageRank: 70,
    latent: { shockPct: 0.98, totalCpiImpactPct: 0.15 },
    covid: { shockPct: 3.46, totalCpiImpactPct: 0.53 },
    ukraine: { shockPct: 5.24, totalCpiImpactPct: 0.8 },
  },
  {
    id: 'utilities',
    label: 'Utilities',
    consumerSharePct: 1.53,
    forwardLinkageRank: 10,
    latent: { shockPct: 5.45, totalCpiImpactPct: 0.13 },
    covid: { shockPct: 23.42, totalCpiImpactPct: 0.56 },
    ukraine: { shockPct: 26.81, totalCpiImpactPct: 0.64 },
  },
  {
    id: 'wholesale',
    label: 'Wholesale trade',
    consumerSharePct: 4.2,
    forwardLinkageRank: 3,
    latent: { shockPct: 1.76, totalCpiImpactPct: 0.13 },
    covid: { shockPct: 9.56, totalCpiImpactPct: 0.7 },
    ukraine: { shockPct: 10.97, totalCpiImpactPct: 0.81 },
  },
];

export interface MaterialInput {
  from: string;
  /** Share of the receiving node's baseline cost. */
  costShare: number;
  /** If true, physical output can be capped even when the cost share is small. */
  critical: boolean;
  /** Maximum long-run reduction in this input recipe. */
  maxSubstitution?: number;
  /** Months required to reach maximum substitution. */
  substitutionRampMonths?: number;
}

export interface MaterialNode {
  id: string;
  label: string;
  kind: 'material' | 'component' | 'final';
  inputs: readonly MaterialInput[];
  /** Months of normal input use initially held by this node. */
  inventoryMonths: number;
  /** Weight in the toy strategic-manufacturing final-demand basket. */
  finalDemandWeight: number;
}

/**
 * A deliberately small physical/cost network. Cost shares are transparent toy
 * assumptions, not an empirical global use table. The topology is the claim;
 * exact coefficients are sensitivity parameters and are printed as such.
 */
export const criticalMaterialNetwork: readonly MaterialNode[] = [
  { id: 'copper', label: 'Refined copper', kind: 'material', inputs: [], inventoryMonths: 0, finalDemandWeight: 0 },
  { id: 'lithium', label: 'Refined lithium', kind: 'material', inputs: [], inventoryMonths: 0, finalDemandWeight: 0 },
  { id: 'nickel', label: 'Battery-grade nickel', kind: 'material', inputs: [], inventoryMonths: 0, finalDemandWeight: 0 },
  { id: 'cobalt', label: 'Refined cobalt', kind: 'material', inputs: [], inventoryMonths: 0, finalDemandWeight: 0 },
  { id: 'graphite', label: 'Battery-grade graphite', kind: 'material', inputs: [], inventoryMonths: 0, finalDemandWeight: 0 },
  { id: 'rare-earths', label: 'Magnet rare-earth oxides', kind: 'material', inputs: [], inventoryMonths: 0, finalDemandWeight: 0 },
  { id: 'gallium', label: 'Refined gallium', kind: 'material', inputs: [], inventoryMonths: 0, finalDemandWeight: 0 },
  {
    id: 'semiconductors',
    label: 'Power and control semiconductors',
    kind: 'component',
    inputs: [{ from: 'gallium', costShare: 0.03, critical: true, maxSubstitution: 0.25, substitutionRampMonths: 18 }],
    inventoryMonths: 1.5,
    finalDemandWeight: 0,
  },
  {
    id: 'magnets',
    label: 'Permanent magnets',
    kind: 'component',
    inputs: [{ from: 'rare-earths', costShare: 0.38, critical: true, maxSubstitution: 0.1, substitutionRampMonths: 24 }],
    inventoryMonths: 0.75,
    finalDemandWeight: 0,
  },
  {
    id: 'battery-cells',
    label: 'Battery cells',
    kind: 'component',
    inputs: [
      { from: 'lithium', costShare: 0.08, critical: true, maxSubstitution: 0.05, substitutionRampMonths: 24 },
      { from: 'nickel', costShare: 0.08, critical: true, maxSubstitution: 0.75, substitutionRampMonths: 18 },
      { from: 'cobalt', costShare: 0.04, critical: true, maxSubstitution: 0.85, substitutionRampMonths: 18 },
      { from: 'graphite', costShare: 0.09, critical: true, maxSubstitution: 0.2, substitutionRampMonths: 30 },
      { from: 'copper', costShare: 0.03, critical: true, maxSubstitution: 0.1, substitutionRampMonths: 24 },
      { from: 'semiconductors', costShare: 0.02, critical: false },
    ],
    inventoryMonths: 1.25,
    finalDemandWeight: 0,
  },
  {
    id: 'power-electronics',
    label: 'Power electronics',
    kind: 'component',
    inputs: [
      { from: 'semiconductors', costShare: 0.28, critical: true, maxSubstitution: 0.1, substitutionRampMonths: 24 },
      { from: 'gallium', costShare: 0.05, critical: false, maxSubstitution: 0.5, substitutionRampMonths: 12 },
      { from: 'copper', costShare: 0.08, critical: true, maxSubstitution: 0.1, substitutionRampMonths: 24 },
    ],
    inventoryMonths: 1,
    finalDemandWeight: 0,
  },
  {
    id: 'motors',
    label: 'High-efficiency motors',
    kind: 'component',
    inputs: [
      { from: 'magnets', costShare: 0.15, critical: true, maxSubstitution: 0.25, substitutionRampMonths: 18 },
      { from: 'copper', costShare: 0.12, critical: true, maxSubstitution: 0.15, substitutionRampMonths: 24 },
      { from: 'semiconductors', costShare: 0.04, critical: false },
    ],
    inventoryMonths: 0.75,
    finalDemandWeight: 0,
  },
  {
    id: 'evs',
    label: 'Electric vehicles',
    kind: 'final',
    inputs: [
      { from: 'battery-cells', costShare: 0.33, critical: true, maxSubstitution: 0.05, substitutionRampMonths: 24 },
      { from: 'motors', costShare: 0.12, critical: true, maxSubstitution: 0.1, substitutionRampMonths: 18 },
      { from: 'power-electronics', costShare: 0.09, critical: true, maxSubstitution: 0.1, substitutionRampMonths: 18 },
      { from: 'semiconductors', costShare: 0.08, critical: true, maxSubstitution: 0.1, substitutionRampMonths: 24 },
      { from: 'copper', costShare: 0.04, critical: false },
    ],
    inventoryMonths: 0.5,
    finalDemandWeight: 0.4,
  },
  {
    id: 'wind',
    label: 'Wind equipment',
    kind: 'final',
    inputs: [
      { from: 'magnets', costShare: 0.12, critical: true, maxSubstitution: 0.35, substitutionRampMonths: 24 },
      { from: 'copper', costShare: 0.08, critical: true, maxSubstitution: 0.15, substitutionRampMonths: 24 },
      { from: 'semiconductors', costShare: 0.03, critical: false },
    ],
    inventoryMonths: 0.75,
    finalDemandWeight: 0.15,
  },
  {
    id: 'grid',
    label: 'Grid equipment',
    kind: 'final',
    inputs: [
      { from: 'copper', costShare: 0.22, critical: true, maxSubstitution: 0.15, substitutionRampMonths: 30 },
      { from: 'power-electronics', costShare: 0.1, critical: true, maxSubstitution: 0.1, substitutionRampMonths: 24 },
      { from: 'semiconductors', costShare: 0.05, critical: false },
    ],
    inventoryMonths: 1,
    finalDemandWeight: 0.2,
  },
  {
    id: 'data-centers',
    label: 'AI/data-center equipment',
    kind: 'final',
    inputs: [
      { from: 'semiconductors', costShare: 0.25, critical: true, maxSubstitution: 0.05, substitutionRampMonths: 24 },
      { from: 'power-electronics', costShare: 0.08, critical: true, maxSubstitution: 0.1, substitutionRampMonths: 18 },
      { from: 'copper', costShare: 0.05, critical: true, maxSubstitution: 0.1, substitutionRampMonths: 24 },
      { from: 'magnets', costShare: 0.02, critical: false },
    ],
    inventoryMonths: 0.75,
    finalDemandWeight: 0.25,
  },
];

/**
 * Remaining N-1 supply as a share of remaining demand. IEA 2025 reports about
 * 60% lithium, 55% nickel and 25–30% cobalt/graphite for 2035. IEA 2026 reports
 * ex-China 2035 magnet capacity well below 20% of demand and China above 90% in
 * gallium refining; 0.20 and 0.10 are conservative toy stress inputs, not point
 * forecasts. Copper's 0.70 is an explicit exploratory assumption.
 * https://www.iea.org/commentaries/growing-geopolitical-tensions-underscore-the-need-for-stronger-action-on-critical-minerals-security
 * https://www.iea.org/reports/rare-earth-elements/executive-summary
 */
export const nMinusOneCoverage: Readonly<Record<string, number>> = {
  copper: 0.7,
  lithium: 0.6,
  nickel: 0.55,
  cobalt: 0.275,
  graphite: 0.275,
  'rare-earths': 0.2,
  gallium: 0.1,
};

/**
 * Stylized monthly supply path for the April 2025 Chinese rare-earth export
 * controls. IEA reports exports falling sharply in April/May, some automakers
 * curtailing or stopping, volumes recovering in following months, and European
 * prices up to six times Chinese prices. The exact monthly capacity ratios are
 * assumptions; the timing and price envelope are the historical targets.
 * https://www.iea.org/commentaries/with-new-export-controls-on-critical-minerals-supply-concentration-risks-become-reality
 */
export const rareEarth2025Event = {
  supplyPath: [1, 0.45, 0.35, 0.55, 0.85, 1, 1, 1, 1] as readonly number[],
  fitTargets: {
    firstAutoCurtailmentMonth: 2,
    peakImportPriceMultiple: 6,
  },
  holdoutTarget: {
    autoRecoveryMonth: 5,
  },
};

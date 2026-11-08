/**
 * AI offshoring overlay: AI hosted in the US and China substitutes for
 * offshored service work (contact centres, back office, IT services), and the
 * exporting regions lose the jobs and the value-added.
 *
 * This is an OVERLAY on the main simulation, not part of it. It reads the main
 * model's regional GDP path, runs its own annual ledger of offshored-service
 * employment, displacement, unemployment and re-employment, and hands the
 * result back to the main model only through the existing
 * demand.commodityShocks[].regionalOutputFactors parameter (a level factor on
 * each region's output, renormalised to world GDP by the regional allocator).
 * Nothing in src/modules changes.
 *
 * Ledger per exporter (all annual):
 *   counterfactual exposed jobs  E*(t) = E0 * (buyers' GDP(t)/GDP(2025))^demandElasticity
 *   AI share of those tasks      s(t)  = sMax / (1 + exp(-k (t - mid)))  (logistic adoption)
 *   jobs remaining               E(t)  = E*(t) (1 - s(t))
 *   displaced (cumulative)       D(t)  = E*(t) s(t)
 *   unemployed pool              U(t)  = U(t-1) (1 - reabsorption) + newlyDisplaced(t)
 *   not back in comparable formal work
 *                                F(t)  = F(t-1) (1 - formalReabsorption) + newlyDisplaced(t)
 *   re-employed displaced        R(t)  = D(t) - U(t)        (in any work, at (1 - earningsLoss) of their old pay)
 *   value-added lost             L(t)  = D(t) va (1 - retainedShare) - R(t) va (1 - earningsLoss)
 * where va is value-added per exposed job; retainedShare is the part of the
 * displaced work's value the exporter's own (AI-using) firms keep.
 * AI providers receive aiRevenueShare * D(t) * va, split across host regions by
 * hostShares; the remainder is a cost saving to the firms that bought the
 * services (no region's GDP is credited with it directly: the main model's
 * regional allocator renormalises shares to world GDP).
 */

import type { Region } from '../../src/domain-types.js';
import { REGIONS } from '../../src/domain-types.js';

export interface ExporterProfile {
  /** Employed persons in AI-exposed exported services, 2025 */
  exposedJobs2025: number;
  /** Value-added per exposed job, USD/yr (export revenue x VA share / jobs) */
  valueAddedPerJob: number;
  /** Total employment of the economy the profile describes (for the unemployment rate) */
  totalEmployment2025: number;
  /** GDP of the economy the profile describes, USD bn at market rates, 2025 */
  gdpUsd2025Bn: number;
  /** Model region the exporter sits in */
  region: Region;
  /** Exposure multiplier on the adoption ceiling (task mix: voice/back office vs IT services) */
  exposureMultiplier: number;
  /** Overrides of the labour-market defaults for this exporter */
  reabsorption?: number;
  formalReabsorption?: number;
  earningsLoss?: number;
}

export interface AdoptionPath {
  /** Ceiling share of exposed tasks AI ends up doing */
  sMax: number;
  /** Year adoption is half-way to the ceiling */
  midpointYear: number;
  /** Logistic steepness per year */
  steepness: number;
}

export interface OverlayParams {
  exporters: Record<string, ExporterProfile>;
  adoption: AdoptionPath;
  /** Elasticity of offshored-service demand to buyers' GDP (counterfactual growth) */
  demandElasticity: number;
  /** Share of the unemployed pool re-employed (any work) each year */
  reabsorption: number;
  /** Share of those not yet back in comparable formal work who get there each year */
  formalReabsorption: number;
  /** Share of displaced work's value kept by the exporter's own firms */
  retainedShare: number;
  /** Earnings loss of re-employed displaced workers (fraction of old pay) */
  earningsLoss: number;
  /** Share of displaced work's value captured as AI-provider revenue */
  aiRevenueShare: number;
  /** Where AI-provider revenue lands (sums to 1) */
  hostShares: Partial<Record<Region, number>>;
  /** Regions whose GDP drives demand for offshored services */
  buyerRegions: Region[];
}

export interface ExporterYear {
  year: number;
  counterfactualJobs: number;
  jobs: number;
  aiShare: number;
  displacedCumulative: number;
  unemployed: number;
  notBackInFormalWork: number;
  reemployed: number;
  /** Earnings of displaced workers lost (unemployed: all; re-employed: earningsLoss), USD bn */
  displacedEarningsLostUsdBn: number;
  /** Rise in the unemployment rate of the exporter economy (pp of its employment) */
  unemploymentRateRise: number;
  valueAddedLostUsdBn: number;
  /** Value-added lost / exporter GDP (counterfactual growth with its region) */
  gdpLossShare: number;
}

export interface OverlayResult {
  years: number[];
  exporters: Record<string, ExporterYear[]>;
  /** Regional output factors fed to the main model, by year */
  regionalFactors: Record<number, Partial<Record<Region, number>>>;
  /** AI-provider revenue by host region, USD bn, by year */
  hostRevenueUsdBn: Record<number, Partial<Record<Region, number>>>;
  /** Per-region value-added change, USD bn (negative = loss), by year */
  regionalValueAddedUsdBn: Record<number, Partial<Record<Region, number>>>;
}

/** Main-model inputs the overlay reads (from a run's results) */
export interface BaseRun {
  years: number[];
  regionalGdp: Record<Region, number>[];       // $T PPP, per year
  /** 2025 market/PPP price ratio per region, to express regional GDP in USD at market rates */
  marketPriceRatio: Record<Region, number>;
}

export function aiShareAt(year: number, a: AdoptionPath): number {
  const raw = a.sMax / (1 + Math.exp(-a.steepness * (year - a.midpointYear)));
  const at2025 = a.sMax / (1 + Math.exp(-a.steepness * (2025 - a.midpointYear)));
  // Measured from 2025: the 2025 data already reflect AI adopted to date
  return Math.max(0, (raw - at2025) / (1 - at2025));
}

export function runOverlay(base: BaseRun, p: OverlayParams): OverlayResult {
  const i0 = base.years.indexOf(2025);
  if (i0 < 0) throw new Error('base run must include 2025');
  const usdGdp = (i: number, r: Region) => base.regionalGdp[i][r] * base.marketPriceRatio[r] * 1000; // $bn
  const buyerGdp = (i: number) => p.buyerRegions.reduce((s, r) => s + base.regionalGdp[i][r], 0);
  const regionGdpGrowth = (i: number, r: Region) => base.regionalGdp[i][r] / base.regionalGdp[i0][r];

  const result: OverlayResult = {
    years: base.years.slice(i0),
    exporters: {},
    regionalFactors: {},
    hostRevenueUsdBn: {},
    regionalValueAddedUsdBn: {},
  };
  const hostTotal = Object.values(p.hostShares).reduce((s, v) => s + (v ?? 0), 0);
  if (Math.abs(hostTotal - 1) > 1e-9) throw new Error('hostShares must sum to 1');

  const state: Record<string, { unemployed: number; informal: number; displaced: number }> = {};
  for (const name of Object.keys(p.exporters)) {
    result.exporters[name] = [];
    state[name] = { unemployed: 0, informal: 0, displaced: 0 };
  }

  for (let i = i0; i < base.years.length; i++) {
    const year = base.years[i];
    const vaByRegion: Partial<Record<Region, number>> = {};
    let aiRevenue = 0;
    for (const [name, x] of Object.entries(p.exporters)) {
      const st = state[name];
      const counterfactualJobs = x.exposedJobs2025 * Math.pow(buyerGdp(i) / buyerGdp(i0), p.demandElasticity);
      const share = Math.min(1, aiShareAt(year, p.adoption) * x.exposureMultiplier);
      const displaced = counterfactualJobs * share;
      const newlyDisplaced = Math.max(0, displaced - st.displaced);
      const reabsorption = x.reabsorption ?? p.reabsorption;
      const formalReabsorption = x.formalReabsorption ?? p.formalReabsorption;
      const earningsLoss = x.earningsLoss ?? p.earningsLoss;
      const unemployed = i === i0 ? 0 : Math.min(displaced, st.unemployed * (1 - reabsorption) + newlyDisplaced);
      const informal = i === i0 ? 0 : Math.min(displaced, st.informal * (1 - formalReabsorption) + newlyDisplaced);
      const reemployed = Math.max(0, displaced - unemployed);
      st.unemployed = unemployed;
      st.informal = informal;
      st.displaced = displaced;
      const lostUsd = displaced * x.valueAddedPerJob * (1 - p.retainedShare)
        - reemployed * x.valueAddedPerJob * (1 - earningsLoss);
      const earningsLostUsd = (unemployed + reemployed * earningsLoss) * x.valueAddedPerJob;
      const lostBn = lostUsd / 1e9;
      const totalEmployment = x.totalEmployment2025; // held at 2025: the rate is relative to today's workforce
      const exporterGdpBn = x.gdpUsd2025Bn * regionGdpGrowth(i, x.region);
      vaByRegion[x.region] = (vaByRegion[x.region] ?? 0) - lostBn;
      aiRevenue += p.aiRevenueShare * displaced * x.valueAddedPerJob / 1e9;
      result.exporters[name].push({
        year,
        counterfactualJobs,
        jobs: counterfactualJobs - displaced,
        aiShare: share,
        displacedCumulative: displaced,
        unemployed,
        notBackInFormalWork: informal,
        reemployed,
        displacedEarningsLostUsdBn: earningsLostUsd / 1e9,
        unemploymentRateRise: unemployed / totalEmployment,
        valueAddedLostUsdBn: lostBn,
        gdpLossShare: lostBn / exporterGdpBn,
      });
    }
    const host: Partial<Record<Region, number>> = {};
    for (const [r, share] of Object.entries(p.hostShares) as [Region, number][]) {
      host[r] = aiRevenue * share;
      vaByRegion[r] = (vaByRegion[r] ?? 0) + aiRevenue * share;
    }
    const factors: Partial<Record<Region, number>> = {};
    for (const r of REGIONS) {
      const delta = vaByRegion[r] ?? 0;
      if (delta !== 0) factors[r] = 1 + delta / usdGdp(i, r);
    }
    result.regionalFactors[year] = factors;
    result.hostRevenueUsdBn[year] = host;
    result.regionalValueAddedUsdBn[year] = vaByRegion;
  }
  return result;
}

/** Regional output factors as the main model's commodityShocks parameter */
export function toCommodityShocks(r: OverlayResult) {
  return r.years.filter((y) => y > 2025).map((year) => ({
    year,
    regionalOutputFactors: r.regionalFactors[year],
  }));
}

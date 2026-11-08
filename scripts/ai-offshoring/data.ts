/**
 * Inputs for the AI-offshoring overlay (scripts/ai-offshoring/model.ts).
 * Sources and tags are in docs/ai-offshoring/evidence.md:
 *   [P] read in the primary document, [S] secondary reporting,
 *   [est] arithmetic or allocation by judgment.
 * Value-added per job = export revenue per worker x 0.65 [est: labour-intensive
 * services; no published VA ratio for IT-BPM exports was found].
 */
import type { OverlayParams, AdoptionPath } from './model.js';

const VA_SHARE = 0.65; // [est] value-added / export revenue

/**
 * Share of exposed tasks AI does, measured from 2025. Fitted to the evidence
 * note's ranges [est]: contact centres and back office 15-30% by 2030 (central
 * 20%) and 40-70% by 2040 (central ~50%), 0-1%/yr through 2027, S-curve with a
 * 2031-32 midpoint. Fits: slow 10% (2030) / 38% (2040); central 18% / 52%;
 * fast 27% / 66%.
 */
export const ADOPTION_CASES: Record<'slow' | 'central' | 'fast', AdoptionPath> = {
  slow: { sMax: 0.40, midpointYear: 2032, steepness: 0.46 },
  central: { sMax: 0.53, midpointYear: 2031, steepness: 0.60 },
  fast: { sMax: 0.67, midpointYear: 2030.5, steepness: 0.70 },
};

export const baseOverlayParams: Omit<OverlayParams, 'adoption'> = {
  exporters: {
    // IBPAP 2026 [P]: contact centre + business process services 1.68M FTE,
    // $33.9bn ($20.1k revenue/worker); 65-70% of buyers North American.
    'Philippines (contact centre + BPS)': {
      exposedJobs2025: 1.68e6,
      valueAddedPerJob: 20_100 * VA_SHARE,
      totalEmployment2025: 49.43e6,   // PSA Dec 2025 [S]
      gdpUsd2025Bn: 487.1,            // IMF WEO Oct 2026, NGDPD 2025
      region: 'seasia',
      exposureMultiplier: 1.0,
    },
    // IBPAP 2026 [P]: IT 190k, $6.1bn ($33.3k/worker); less exposed (judgment).
    'Philippines (IT)': {
      exposedJobs2025: 0.19e6,
      valueAddedPerJob: 33_300 * VA_SHARE,
      totalEmployment2025: 49.43e6,
      gdpUsd2025Bn: 487.1,
      region: 'seasia',
      exposureMultiplier: 0.5,
    },
    // NASSCOM FY26 [P]: BPM revenue $59bn; headcount not published,
    // ~1.6M [est] (1.5-1.7M).
    'India (BPM)': {
      exposedJobs2025: 1.6e6,
      valueAddedPerJob: (59e9 / 1.6e6) * VA_SHARE,
      totalEmployment2025: 600e6,     // [unverified] ~600M workforce
      gdpUsd2025Bn: 3_909,            // IMF WEO Oct 2026, NGDPD 2025
      region: 'india',
      exposureMultiplier: 1.0,
    },
    // NASSCOM FY26 [P]: IT services $149bn; ~6.0M IT-BPM total less BPM [est].
    'India (IT services)': {
      exposedJobs2025: 4.4e6,
      valueAddedPerJob: (149e9 / 4.4e6) * VA_SHARE,
      totalEmployment2025: 600e6,
      gdpUsd2025Bn: 3_909,
      region: 'india',
      exposureMultiplier: 0.5,        // judgment: coding/testing partly complemented, not replaced
    },
    // Rest of SE Asia: regional 2.0-2.3M / $48-55bn less the Philippines [est, weak].
    'SE Asia ex-Philippines': {
      exposedJobs2025: 0.25e6,
      valueAddedPerJob: (11e9 / 0.25e6) * VA_SHARE,
      totalEmployment2025: 300e6,     // [est] seasia ex-PH employment, order of magnitude
      gdpUsd2025Bn: 4_319 - 487,      // imf-weo-regions.csv seasia less PH
      region: 'seasia',
      exposureMultiplier: 0.8,
    },
    // LatAm nearshore (Colombia >754k, Mexico, Costa Rica) [est, weak]: 0.6-1.0M, $8-15bn.
    'LatAm nearshore': {
      exposedJobs2025: 0.8e6,
      valueAddedPerJob: (11.5e9 / 0.8e6) * VA_SHARE,
      totalEmployment2025: 300e6,     // [est] ~300M employed
      gdpUsd2025Bn: 7_214,            // imf-weo-regions.csv
      region: 'latam',
      exposureMultiplier: 1.0,
    },
    // Central/Eastern Europe: Poland 500.5k, $48.4bn (ABSL) [P]; shared services + IT.
    'Central Europe (Poland)': {
      exposedJobs2025: 0.5e6,
      valueAddedPerJob: (48.4e9 / 0.5e6) * VA_SHARE,
      totalEmployment2025: 17e6,      // [unverified] Poland employment
      gdpUsd2025Bn: 1_040.5,          // IMF WEO Oct 2026, NGDPD 2025
      region: 'oecd-ex-us',
      exposureMultiplier: 0.7,
      reabsorption: 0.5,              // [est] OECD: 40-55%/yr re-employed
      formalReabsorption: 0.4,
      earningsLoss: 0.2,              // [est] 15-25% (Jacobson-LaLonde-Sullivan ~25%)
    },
    // MENA (Egypt ~195k / $5bn, Morocco 148.5k) [S]: 0.35-0.45M, $8-10bn.
    'MENA (Egypt, Morocco)': {
      exposedJobs2025: 0.4e6,
      valueAddedPerJob: (9e9 / 0.4e6) * VA_SHARE,
      totalEmployment2025: 60e6,      // [est] Egypt + Morocco employment, order of magnitude
      gdpUsd2025Bn: 365 + 184,        // IMF WEO Oct 2026, NGDPD 2025 (EGY + MAR)
      region: 'mena',
      exposureMultiplier: 1.0,
    },
    // SSA (Kenya, South Africa) [weak]: 0.15-0.25M, $1-2bn.
    'SSA (Kenya, South Africa)': {
      exposedJobs2025: 0.2e6,
      valueAddedPerJob: (1.5e9 / 0.2e6) * VA_SHARE,
      totalEmployment2025: 45e6,      // [est] Kenya + South Africa employment, order of magnitude
      gdpUsd2025Bn: 2_206,            // imf-weo-regions.csv (whole region: the denominator for the share)
      region: 'ssa',
      exposureMultiplier: 1.0,
    },
  },
  demandElasticity: 1.0,     // [est] offshored services grow with buyers' GDP
  // Emerging markets [est from Donovan-Lu-Schoellman flows, BLS DWS, World Bank PRWP 11116]:
  reabsorption: 0.6,         // 50-70%/yr back into any work
  formalReabsorption: 0.2,   // 15-25%/yr into comparable formal jobs
  earningsLoss: 0.4,         // 35-50%: BPO pay ~2x Philippine GDP per worker
  retainedShare: 0.10,       // [est] value kept by exporters' own AI-using providers
  aiRevenueShare: 0.35,      // [est] 20-60%; AI price per resolution ~$1-3 vs ~$1-2 per human contact offshore
  hostShares: { us: 0.8, china: 0.1, 'oecd-ex-us': 0.1 }, // [est] by AI-provider headquarters
  buyerRegions: ['us', 'oecd-ex-us'],
};

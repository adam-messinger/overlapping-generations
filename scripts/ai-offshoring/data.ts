/**
 * Inputs for the AI-offshoring overlay (scripts/ai-offshoring/model.ts).
 *
 * PROVISIONAL: every value below is a placeholder from memory, pending the
 * sourced figures (IBPAP, NASSCOM, IEA Energy and AI, IFR, ILO exposure index).
 * Do not quote results from this file until it is replaced.
 */
import type { OverlayParams, AdoptionPath } from './model.js';

export const ADOPTION_CASES: Record<'slow' | 'central' | 'fast', AdoptionPath> = {
  slow: { sMax: 0.30, midpointYear: 2038, steepness: 0.25 },
  central: { sMax: 0.50, midpointYear: 2034, steepness: 0.30 },
  fast: { sMax: 0.70, midpointYear: 2031, steepness: 0.45 },
};

export const baseOverlayParams: Omit<OverlayParams, 'adoption'> = {
  exporters: {
    Philippines: {
      exposedJobs2025: 1.8e6,        // PROVISIONAL: IT-BPM employment ~1.8M (IBPAP 2024)
      valueAddedPerJob: 15_000,      // PROVISIONAL: ~$38bn revenue x ~0.7 VA / 1.8M jobs
      totalEmployment2025: 49e6,     // PROVISIONAL: PSA Labour Force Survey 2024
      gdpUsd2025Bn: 490,             // PROVISIONAL: IMF WEO
      region: 'seasia',
      exposureMultiplier: 1.0,       // voice and back-office heavy
    },
    India: {
      exposedJobs2025: 5.8e6,        // PROVISIONAL: NASSCOM IT-BPM employment FY25
      valueAddedPerJob: 27_000,      // PROVISIONAL: ~$224bn exports x ~0.7 VA / 5.8M
      totalEmployment2025: 580e6,    // PROVISIONAL: PLFS
      gdpUsd2025Bn: 4_100,           // PROVISIONAL: IMF WEO
      region: 'india',
      exposureMultiplier: 0.6,       // IT services less exposed than voice/BPO
    },
  },
  demandElasticity: 1.0,             // PROVISIONAL: offshored services grow with buyers' GDP
  reabsorption: 0.25,                // PROVISIONAL: share of the unemployed re-employed per year
  earningsLoss: 0.25,                // PROVISIONAL: pay cut on re-employment
  aiRevenueShare: 0.3,               // PROVISIONAL: AI price per task / offshore labour cost
  hostShares: { us: 0.7, 'oecd-ex-us': 0.2, china: 0.1 }, // PROVISIONAL: where AI serving these buyers runs
  buyerRegions: ['us', 'oecd-ex-us'],
};

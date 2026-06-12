/**
 * Distribution helpers for allocating global totals across regions.
 */

import { Region, REGIONS } from '../domain-types.js';

/**
 * Approximate 2025 market-GDP shares (IMF WEO-order-of-magnitude calibration;
 * relative weights, not exact data). Normalized below so the table always
 * sums to exactly 1 — the raw values summed to 0.99, which leaked 1% of any
 * total distributed through these shares.
 */
const RAW_GDP_SHARES: Record<Region, number> = {
  oecd: 0.47, china: 0.15, india: 0.11, latam: 0.07,
  seasia: 0.06, russia: 0.03, mena: 0.04, ssa: 0.06,
};

const SHARE_SUM = REGIONS.reduce((sum, r) => sum + RAW_GDP_SHARES[r], 0);

export const GDP_SHARES: Record<Region, number> = Object.fromEntries(
  REGIONS.map(r => [r, RAW_GDP_SHARES[r] / SHARE_SUM])
) as Record<Region, number>;

/** Distribute a global total across regions by GDP share (conserves total). */
export function distributeByGDP(total: number): Record<Region, number> {
  const result: Record<Region, number> = {} as any;
  for (const region of REGIONS) {
    result[region] = total * GDP_SHARES[region];
  }
  return result;
}

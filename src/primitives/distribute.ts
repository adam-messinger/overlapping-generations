/**
 * Distribution helpers for allocating global totals across regions.
 */

import { Region, REGIONS } from '../framework/types.js';

/** Approximate 2025 GDP shares (sum = $118T) */
export const GDP_SHARES: Record<Region, number> = {
  oecd: 0.47, china: 0.15, india: 0.11, latam: 0.07,
  seasia: 0.06, russia: 0.03, mena: 0.04, ssa: 0.06,
};

/** Distribute a global total across regions by GDP share. */
export function distributeByGDP(total: number): Record<Region, number> {
  const result: Record<Region, number> = {} as any;
  for (const region of REGIONS) {
    result[region] = total * GDP_SHARES[region];
  }
  return result;
}

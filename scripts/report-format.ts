/**
 * Shared helpers for the ledger report scripts: `--name=value` CLI arguments
 * and fixed-width cell formatters (value -> padded string).
 */

export function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find(a => a.startsWith(prefix))?.slice(prefix.length);
}

export const fixed = (digits: number, width: number) => (v: number) => v.toFixed(digits).padStart(width);
export const millions = (width: number) => (v: number) => (v / 1e6).toFixed(1).padStart(width);
export const thousands = (width: number) => (v: number) => (v / 1e3).toFixed(0).padStart(width);
export const pct = (width: number) => (v: number) => `${(100 * v).toFixed(1)}%`.padStart(width);

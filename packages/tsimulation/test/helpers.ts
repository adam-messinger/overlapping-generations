/**
 * Shared helpers for the tsimulation test suites.
 */

import assert from 'node:assert/strict';
import type { ValidationResult } from '../src/types.js';

/** A passing validate() result — the default every test module needs. */
export const okValidate = (): ValidationResult => ({ valid: true, errors: [], warnings: [] });

/** Assert that `fn` throws an Error whose message contains `substring`. */
export function throwsWith(fn: () => unknown, substring: string): void {
  assert.throws(
    fn,
    (err: unknown) => err instanceof Error && err.message.includes(substring),
    `expected an error containing "${substring}"`
  );
}

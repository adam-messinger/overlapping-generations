/**
 * Module invariants: identities a module promises about every step it takes.
 *
 * A unit test of an identity pins it for the inputs the test chose, usually
 * one scenario at a few years. An invariant is declared once on the module and
 * the engine checks it after every step of every run, so a ledger that stops
 * closing in the one scenario or year nobody tested still fails.
 *
 * An invariant is a pure function of what the step saw and produced. It
 * returns nothing when it holds and a message (or several) when it does not.
 * The comparison helpers below return exactly that, so most invariants are a
 * list of `closeTo(...)` / `atMost(...)` calls.
 */

import type { Year, YearIndex } from './types.js';

/** Everything an invariant may read about one step. */
export interface InvariantContext<TParams, TState, TInputs, TOutputs> {
  /** Merged parameters. Reads here are not counted by parameter liveness. */
  readonly params: TParams;
  /** State the step started from (init's state on the first step). */
  readonly previousState: TState;
  /** State the step returned. */
  readonly state: TState;
  readonly inputs: TInputs;
  readonly outputs: TOutputs;
  /** The module's outputs from the previous step; undefined on the first. */
  readonly previousOutputs: TOutputs | undefined;
  readonly year: Year;
  readonly yearIndex: YearIndex;
}

/** What a check returns: nothing when the invariant holds. */
export type InvariantOutcome = string | readonly (string | undefined | null | false)[] | undefined | null | void | false;

export interface ModuleInvariant<TParams = any, TState = any, TInputs = any, TOutputs = any> {
  /** Short identifier, reported with every violation. */
  readonly name: string;
  /** What the identity means, for the reader of a violation. */
  readonly description?: string;
  check(context: InvariantContext<TParams, TState, TInputs, TOutputs>): InvariantOutcome;
}

/** One failed invariant at one step. */
export interface InvariantViolation {
  module: string;
  invariant: string;
  year: number;
  yearIndex: number;
  message: string;
}

/** How the engine treats invariants (default `'error'`). */
export type InvariantPolicy = 'off' | 'report' | 'warn' | 'error';

export interface InvariantDiagnostics {
  /** Invariant evaluations performed (invariants x steps). */
  checked: number;
  violations: InvariantViolation[];
}

/** Normalize a check's outcome to a list of messages. */
export function invariantMessages(outcome: InvariantOutcome): string[] {
  if (outcome === undefined || outcome === null || outcome === false) return [];
  if (typeof outcome === 'string') return [outcome];
  return outcome.filter((message): message is string => typeof message === 'string' && message.length > 0);
}

/** Evaluate a module's invariants for one step. A check that throws is a violation. */
export function evaluateInvariants(
  moduleName: string,
  invariants: readonly ModuleInvariant[] | undefined,
  context: InvariantContext<any, any, any, any>,
): InvariantViolation[] {
  if (!invariants || invariants.length === 0) return [];
  const violations: InvariantViolation[] = [];
  for (const invariant of invariants) {
    let messages: string[];
    try {
      messages = invariantMessages(invariant.check(context));
    } catch (error) {
      messages = [`check threw: ${error instanceof Error ? error.message : String(error)}`];
    }
    for (const message of messages) {
      violations.push({
        module: moduleName,
        invariant: invariant.name,
        year: context.year,
        yearIndex: context.yearIndex,
        message,
      });
    }
  }
  return violations;
}

/** One line per violation, for logs and thrown errors. */
export function formatInvariantViolation(violation: InvariantViolation): string {
  return `[${violation.module}] invariant '${violation.invariant}' failed at ${violation.year}: ${violation.message}`;
}

// =============================================================================
// COMPARISON HELPERS
// =============================================================================

export interface Tolerance {
  /** Relative tolerance against the larger magnitude of the two sides (default 1e-9). */
  rel?: number;
  /** Absolute tolerance, in the quantity's own unit (default 1e-9). */
  abs?: number;
}

function describeNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toPrecision(10);
}

function nonFinite(label: string, values: Record<string, number>): string | undefined {
  for (const [side, value] of Object.entries(values)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `${label}: ${side} is ${String(value)}`;
    }
  }
  return undefined;
}

/** `actual` equals `expected` within tolerance. */
export function closeTo(
  label: string,
  actual: number,
  expected: number,
  tolerance: Tolerance = {},
): string | undefined {
  const bad = nonFinite(label, { actual, expected });
  if (bad) return bad;
  const rel = tolerance.rel ?? 1e-9;
  const abs = tolerance.abs ?? 1e-9;
  const gap = Math.abs(actual - expected);
  const allowed = Math.max(abs, rel * Math.max(Math.abs(actual), Math.abs(expected)));
  if (gap <= allowed) return undefined;
  return `${label}: ${describeNumber(actual)} != ${describeNumber(expected)} (gap ${describeNumber(gap)}, allowed ${describeNumber(allowed)})`;
}

/** `actual` does not exceed `bound` by more than the tolerance. */
export function atMost(
  label: string,
  actual: number,
  bound: number,
  tolerance: Tolerance = {},
): string | undefined {
  const bad = nonFinite(label, { actual, bound });
  if (bad) return bad;
  const rel = tolerance.rel ?? 1e-9;
  const abs = tolerance.abs ?? 1e-9;
  const allowed = Math.max(abs, rel * Math.abs(bound));
  if (actual <= bound + allowed) return undefined;
  return `${label}: ${describeNumber(actual)} exceeds ${describeNumber(bound)} by ${describeNumber(actual - bound)}`;
}

/** `actual` is not below `bound` by more than the tolerance. */
export function atLeast(
  label: string,
  actual: number,
  bound: number,
  tolerance: Tolerance = {},
): string | undefined {
  const bad = nonFinite(label, { actual, bound });
  if (bad) return bad;
  const rel = tolerance.rel ?? 1e-9;
  const abs = tolerance.abs ?? 1e-9;
  const allowed = Math.max(abs, rel * Math.abs(bound));
  if (actual >= bound - allowed) return undefined;
  return `${label}: ${describeNumber(actual)} is below ${describeNumber(bound)} by ${describeNumber(bound - actual)}`;
}

/** Sum of a record's values (or of a projection of them). */
export function sumValues<T extends object>(record: T, project?: (value: T[keyof T]) => number): number {
  let total = 0;
  for (const value of Object.values(record) as T[keyof T][]) {
    total += project ? project(value) : (value as unknown as number);
  }
  return total;
}

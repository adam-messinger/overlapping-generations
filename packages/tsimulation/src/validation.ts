import type { ValidationResult } from './types.js';

export interface Invariant<T> {
  id: string;
  description: string;
  check: (value: T) => boolean | string | ValidationResult;
  severity?: 'error' | 'warning';
}

export interface InvariantReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  passed: string[];
}

export interface NonFiniteValue {
  path: string;
  value: number;
}

/** Return every NaN or +/-Infinity, without a depth limit. */
export function findNonFiniteValues(value: unknown, root = 'value'): NonFiniteValue[] {
  const values: NonFiniteValue[] = [];
  const seen = new WeakSet<object>();
  const visit = (candidate: unknown, path: string): void => {
    if (typeof candidate === 'number') {
      if (!Number.isFinite(candidate)) values.push({ path, value: candidate });
      return;
    }
    if (typeof candidate !== 'object' || candidate === null) return;
    if (seen.has(candidate)) return;
    seen.add(candidate);
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    for (const [key, item] of Object.entries(candidate)) visit(item, `${path}.${key}`);
  };
  visit(value, root);
  return values;
}

/** Return every path containing NaN or +/-Infinity, without a depth limit. */
export function findNonFinitePaths(value: unknown, root = 'value'): string[] {
  return findNonFiniteValues(value, root).map(({ path }) => path);
}

export function assertFiniteDeep(value: unknown, context = 'value'): void {
  const paths = findNonFinitePaths(value, context);
  if (paths.length > 0) {
    throw new Error(`Non-finite number${paths.length === 1 ? '' : 's'} at ${paths.join(', ')}`);
  }
}

export function validateNumber(
  value: unknown,
  path: string,
  options: { min?: number; max?: number; integer?: boolean; exclusiveMin?: boolean } = {},
): string[] {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return [`${path} must be a finite number`];
  }
  const errors: string[] = [];
  if (options.integer && !Number.isInteger(value)) errors.push(`${path} must be an integer`);
  if (options.min !== undefined) {
    const invalid = options.exclusiveMin ? value <= options.min : value < options.min;
    if (invalid) {
      errors.push(`${path} must be ${options.exclusiveMin ? '>' : '>='} ${options.min}`);
    }
  }
  if (options.max !== undefined && value > options.max) {
    errors.push(`${path} must be <= ${options.max}`);
  }
  return errors;
}

export function validateShares(
  shares: Readonly<Record<string, number>> | readonly number[],
  path: string,
  tolerance = 1e-9,
): string[] {
  const values = Array.isArray(shares) ? shares : Object.values(shares);
  const errors = values.flatMap((value, index) =>
    validateNumber(value, `${path}[${index}]`, { min: 0, max: 1 }),
  );
  const total = values.reduce((sum, value) => sum + value, 0);
  if (Number.isFinite(total) && Math.abs(total - 1) > tolerance) {
    errors.push(`${path} must sum to 1 (got ${total})`);
  }
  return errors;
}

export function runInvariants<T>(value: T, invariants: readonly Invariant<T>[]): InvariantReport {
  const report: InvariantReport = { valid: true, errors: [], warnings: [], passed: [] };
  for (const invariant of invariants) {
    let result: boolean | string | ValidationResult;
    try {
      result = invariant.check(value);
    } catch (error) {
      result = error instanceof Error ? error.message : String(error);
    }
    let messages: string[] = [];
    let warnings: string[] = [];
    if (typeof result === 'boolean') {
      if (!result) messages = [invariant.description];
    } else if (typeof result === 'string') {
      messages = [result];
    } else {
      messages = result.errors;
      warnings = result.warnings;
    }
    if (messages.length === 0 && warnings.length === 0) {
      report.passed.push(invariant.id);
      continue;
    }
    const prefix = `[${invariant.id}] `;
    if (invariant.severity === 'warning') {
      report.warnings.push(...messages.map((message) => prefix + message));
    } else {
      report.errors.push(...messages.map((message) => prefix + message));
    }
    report.warnings.push(...warnings.map((message) => prefix + message));
  }
  report.valid = report.errors.length === 0;
  return report;
}

export function assertInvariants<T>(value: T, invariants: readonly Invariant<T>[], context: string): InvariantReport {
  const report = runInvariants(value, invariants);
  if (!report.valid) {
    throw new Error(`${context} invariant failures:\n  ${report.errors.join('\n  ')}`);
  }
  return report;
}

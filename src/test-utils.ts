/**
 * Shared Test Utilities
 *
 * Lightweight test framework used by all module tests.
 * NaN-guarded: numeric assertions fail explicitly on NaN instead of silently passing.
 */

let passed = 0;
let failed = 0;

export function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
    failed++;
  }
}

export function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeCloseTo(expected: number, precision: number = 2) {
      if (Number.isNaN(actual) || Number.isNaN(expected)) {
        throw new Error(`Expected ~${expected}, got ${actual} (NaN detected)`);
      }
      const diff = Math.abs((actual as number) - expected);
      const threshold = Math.pow(10, -precision);
      if (diff > threshold) {
        throw new Error(`Expected ~${expected}, got ${actual} (diff: ${diff.toFixed(4)})`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (Number.isNaN(actual) || Number.isNaN(expected)) {
        throw new Error(`Expected ${actual} > ${expected} (NaN detected)`);
      }
      if ((actual as number) <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (Number.isNaN(actual) || Number.isNaN(expected)) {
        throw new Error(`Expected ${actual} < ${expected} (NaN detected)`);
      }
      if ((actual as number) >= expected) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeBetween(min: number, max: number) {
      if (Number.isNaN(actual) || Number.isNaN(min) || Number.isNaN(max)) {
        throw new Error(`Expected ${actual} to be between ${min} and ${max} (NaN detected)`);
      }
      if ((actual as number) < min || (actual as number) > max) {
        throw new Error(`Expected ${actual} to be between ${min} and ${max}`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true, got ${actual}`);
      }
    },
    toBeFalse() {
      if (actual !== false) {
        throw new Error(`Expected false, got ${actual}`);
      }
    },
    toThrow(message?: string) {
      if (typeof actual !== 'function') {
        throw new Error('Expected a function');
      }
      try {
        (actual as () => void)();
        throw new Error('Expected function to throw');
      } catch (err) {
        if (message && err instanceof Error && !err.message.includes(message)) {
          throw new Error(`Expected error containing "${message}", got "${err.message}"`);
        }
      }
    },
    toHaveLength(expected: number) {
      if (!Array.isArray(actual) || actual.length !== expected) {
        throw new Error(`Expected length ${expected}, got ${Array.isArray(actual) ? actual.length : 'not an array'}`);
      }
    },
  };
}

export function printSummary() {
  console.log('\n=== Summary ===\n');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

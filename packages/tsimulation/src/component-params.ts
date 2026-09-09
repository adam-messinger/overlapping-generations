/**
 * ComponentParams - Julia ComponentArrays-inspired parameter container
 *
 * Provides dot-path get/set and flat iteration for parameter sweeps.
 * Wraps any nested object and provides:
 * - .get(path) — dot-path access (e.g., 'climate.sensitivity')
 * - .set(path, value) — returns new immutable instance
 * - .entries() — yields [path, value] for all numeric leaves
 * - .paths() — all leaf paths
 * - .toParams() — back to plain nested object
 */

/**
 * Path segments that reach the prototype chain rather than a parameter.
 * `__proto__` is the exploitable one — assigning through it mutates
 * `Object.prototype` process-wide. `constructor` and `prototype` are refused
 * alongside it because a path containing them never addresses a parameter,
 * so accepting them can only mislead.
 */
const RESERVED_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function assertAddressable(path: string): string[] {
  const parts = path.split('.');
  for (const part of parts) {
    if (RESERVED_SEGMENTS.has(part)) {
      throw new Error(`Parameter path '${path}' contains reserved segment '${part}'`);
    }
  }
  return parts;
}

/** Own-property read; inherited members are not parameters. */
function ownValue(container: unknown, key: string): unknown {
  if (container === null || typeof container !== 'object') return undefined;
  return Object.prototype.hasOwnProperty.call(container, key)
    ? (container as Record<string, unknown>)[key]
    : undefined;
}

/**
 * Immutable parameter container with dot-path access.
 */
export class ComponentParams<T extends object = Record<string, unknown>> {
  private readonly data: T;

  private constructor(data: T) {
    this.data = data;
  }

  /**
   * Construct from any nested params object.
   */
  static from<T extends object>(obj: T): ComponentParams<T> {
    return new ComponentParams(structuredClone(obj));
  }

  /**
   * Get value at dot-path (e.g., 'climate.sensitivity').
   * Returns undefined if path doesn't exist. Object subtrees are returned as
   * deep clones so the container stays immutable — mutating the result cannot
   * change internal state. (Primitives copy by value already.)
   */
  get(path: string): unknown {
    let current: unknown = this.data;
    for (const part of assertAddressable(path)) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = ownValue(current, part);
    }
    return current !== null && typeof current === 'object' ? structuredClone(current) : current;
  }

  /**
   * Returns a new ComponentParams with the value at path replaced.
   * Does not mutate the original. Missing intermediate nodes — including `null`
   * ones — are created as empty objects; a primitive sitting on the path is
   * likewise overwritten with an object to make room for the deeper key.
   */
  set(path: string, value: unknown): ComponentParams<T> {
    const parts = assertAddressable(path);
    const clone = structuredClone(this.data);
    let current: any = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      const existing = ownValue(current, parts[i]);
      // `== null` catches both undefined and null (typeof null === 'object',
      // so the type check alone would step into a null and then throw).
      if (existing == null || typeof existing !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    // Cloned on the way in for the same reason `get` clones on the way out:
    // a container that shared structure with the caller's object would change
    // when they mutated it.
    current[parts[parts.length - 1]] =
      value !== null && typeof value === 'object' ? structuredClone(value) : value;
    return new ComponentParams(clone);
  }

  /**
   * Yields [path, value] for all numeric leaf values.
   */
  *entries(): IterableIterator<[string, number]> {
    yield* this.walkNumericLeaves(this.data, '');
  }

  /**
   * Returns all dot-paths to numeric leaf values.
   */
  paths(): string[] {
    return Array.from(this.entries()).map(([path]) => path);
  }

  /**
   * Returns the plain nested object (deep clone).
   */
  toParams(): T {
    return structuredClone(this.data);
  }

  private *walkNumericLeaves(obj: any, prefix: string): IterableIterator<[string, number]> {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'number') {
        yield [path, value];
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yield* this.walkNumericLeaves(value, path);
      }
    }
  }
}

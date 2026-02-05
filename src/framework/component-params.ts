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
   * Returns undefined if path doesn't exist.
   */
  get(path: string): unknown {
    const parts = path.split('.');
    let current: any = this.data;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  /**
   * Returns a new ComponentParams with the value at path replaced.
   * Does not mutate the original.
   */
  set(path: string, value: unknown): ComponentParams<T> {
    const parts = path.split('.');
    const clone = structuredClone(this.data);
    let current: any = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
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

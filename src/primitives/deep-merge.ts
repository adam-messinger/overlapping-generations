/**
 * Recursive partial types and a plain-object deep merge.
 *
 * `DeepPartial` is the override shape for nested parameter blocks (a scenario
 * may set `bands.tertiary.retirementAge` alone); `deepMerge` applies such an
 * override onto full defaults. Arrays are replaced, not merged, and
 * `undefined` override values leave the default in place.
 */

export type DeepPartial<T> = T extends (infer U)[]
  ? U[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep merge two objects (override wins; nested plain objects merge recursively). */
export function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
  const result = { ...base };

  for (const key of Object.keys(override) as Array<keyof T>) {
    const overrideValue = (override as Record<keyof T, unknown>)[key];
    const baseValue = base[key];

    if (overrideValue === undefined) continue;
    if (isPlainObject(overrideValue) && isPlainObject(baseValue)) {
      result[key] = deepMerge(baseValue, overrideValue as DeepPartial<typeof baseValue>) as T[keyof T];
    } else {
      result[key] = overrideValue as T[keyof T];
    }
  }

  return result;
}

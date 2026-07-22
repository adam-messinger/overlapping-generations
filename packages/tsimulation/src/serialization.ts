function normalize(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { $number: 'NaN' };
    if (value === Number.POSITIVE_INFINITY) return { $number: 'Infinity' };
    if (value === Number.NEGATIVE_INFINITY) return { $number: '-Infinity' };
    if (Object.is(value, -0)) return { $number: '-0' };
    return value;
  }
  if (typeof value === 'bigint') return { $bigint: value.toString() };
  if (value === undefined) return { $undefined: true };
  if (typeof value !== 'object' || value === null) return value;
  if (seen.has(value)) throw new Error('Cannot serialize a cyclic value');
  seen.add(value);
  let normalized: unknown;
  if (Array.isArray(value)) {
    normalized = value.map((item) => normalize(item, seen));
  } else if (value instanceof Date) {
    normalized = { $date: value.toISOString() };
  } else {
    normalized = Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize((value as Record<string, unknown>)[key], seen)]),
    );
  }
  seen.delete(value);
  return normalized;
}

export function stableStringify(value: unknown, space?: number): string {
  return JSON.stringify(normalize(value, new WeakSet<object>()), null, space);
}

/** Portable FNV-1a hash for provenance, not cryptographic security. */
export function stableHash(value: unknown): string {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

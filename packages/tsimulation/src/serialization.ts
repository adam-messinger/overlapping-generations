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

/**
 * Exact inverse of `normalize`: maps each marker it emits back to the value
 * JSON could not represent. A marker is only recognised as its sole own key,
 * so an ordinary object that happens to carry a `$`-prefixed key alongside
 * others survives unchanged.
 */
function denormalize(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return value.map(denormalize);

  const keys = Object.keys(value);
  if (keys.length === 1) {
    const record = value as Record<string, unknown>;
    if (keys[0] === '$undefined' && record.$undefined === true) return undefined;
    if (keys[0] === '$bigint' && typeof record.$bigint === 'string') {
      return BigInt(record.$bigint);
    }
    if (keys[0] === '$date' && typeof record.$date === 'string') {
      return new Date(record.$date);
    }
    if (keys[0] === '$number' && typeof record.$number === 'string') {
      switch (record.$number) {
        case 'NaN': return Number.NaN;
        case 'Infinity': return Number.POSITIVE_INFINITY;
        case '-Infinity': return Number.NEGATIVE_INFINITY;
        case '-0': return -0;
      }
    }
  }

  return Object.fromEntries(
    keys.map((key) => [key, denormalize((value as Record<string, unknown>)[key])]),
  );
}

/**
 * Inverse of `stableStringify`, restoring own properties whose value is
 * `undefined` — which is what lets a reloaded object re-serialize to the same
 * canonical bytes, and therefore keep the same content hash.
 *
 * Use it only for text this codec produced: `stableStringify`,
 * `canonicalJson`, or an artifact stored as canonical JSON. The marker
 * encoding is ambiguous by construction — a value that legitimately contains
 * `{$undefined: true}` is indistinguishable from an encoded `undefined` — so
 * decoding arbitrary third-party JSON would rewrite it.
 */
export function parseCanonical<T = unknown>(text: string): T {
  return denormalize(JSON.parse(text)) as T;
}

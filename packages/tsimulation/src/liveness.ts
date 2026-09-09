export interface ReadTracker<T extends object> {
  proxy: T;
  reads: Set<string>;
}

/**
 * Whether a value is a container this tracker can proxy: a plain object or an
 * array, and nothing else.
 *
 * Stated as what IS wrapped rather than what is not. An exclusion list keeps
 * leaking — a typed array is caught by ArrayBuffer.isView but a bare
 * ArrayBuffer is not, and Promise, boxed primitives, WeakMap and any class
 * with #private fields all fail the same way. Two distinct mechanisms break:
 * an accessor backed by an internal slot throws when the proxy is the
 * receiver, and an extracted method throws later at its call site with `this`
 * bound to the proxy.
 */
function isTrackableContainer(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === Array.prototype || prototype === null;
}

export function trackObjectReads<T extends object>(value: T): ReadTracker<T> {
  const reads = new Set<string>();
  const cache = new WeakMap<object, object>();
  const wrap = (candidate: object, prefix: string): object => {
    const cached = cache.get(candidate);
    if (cached) return cached;
    const proxy = new Proxy(candidate, {
      get(target, property, receiver) {
        if (typeof property !== 'string') return Reflect.get(target, property, receiver);
        const path = prefix ? `${prefix}.${property}` : property;
        const result = Reflect.get(target, property, receiver);
        if (typeof result === 'object' && result !== null && isTrackableContainer(result)) {
          return wrap(result, path);
        }
        reads.add(path);
        return result;
      },
      ownKeys(target) {
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, property) {
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    });
    cache.set(candidate, proxy);
    return proxy;
  };
  return { proxy: wrap(value, '') as T, reads };
}

export function leafPaths(value: unknown, prefix = ''): string[] {
  // Same leaf rule as the tracker: anything that is not a plain object is a
  // single value. Without this a typed array expands per element, so a
  // Float64Array override reports one unread path per element instead of one
  // for the parameter.
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return prefix ? [prefix] : [];
  if (!isTrackableContainer(value)) return prefix ? [prefix] : [];
  const entries = Object.entries(value);
  if (entries.length === 0) return prefix ? [prefix] : [];
  return entries.flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
}

export function unreadOverridePaths(overrides: unknown, reads: ReadonlySet<string>): string[] {
  return leafPaths(overrides).filter((path) =>
    !reads.has(path) && ![...reads].some((read) => read.startsWith(`${path}.`)),
  );
}

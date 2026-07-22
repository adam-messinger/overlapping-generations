export interface ReadTracker<T extends object> {
  proxy: T;
  reads: Set<string>;
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
        if (typeof result === 'object' && result !== null) return wrap(result, path);
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
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return prefix ? [prefix] : [];
  const entries = Object.entries(value);
  if (entries.length === 0) return prefix ? [prefix] : [];
  return entries.flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
}

export function unreadOverridePaths(overrides: unknown, reads: ReadonlySet<string>): string[] {
  return leafPaths(overrides).filter((path) =>
    !reads.has(path) && ![...reads].some((read) => read.startsWith(`${path}.`)),
  );
}

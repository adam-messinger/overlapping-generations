export interface GraphNodeLike {
  id: string;
  dependencies: readonly string[];
}

export interface GraphValidationResult<T> {
  ordered: T[];
  ids: string[];
}

/** Validate IDs/references and topologically order a directed acyclic graph. */
export function validateAndSortGraph<T>(
  nodes: readonly T[],
  getId: (node: T) => string,
  getDependencies: (node: T) => readonly string[],
  context = 'graph',
): GraphValidationResult<T> {
  const byId = new Map<string, T>();
  for (const node of nodes) {
    const id = getId(node);
    if (!id) throw new Error(`${context}: node ID must not be empty`);
    if (byId.has(id)) throw new Error(`${context}: duplicate node ID '${id}'`);
    byId.set(id, node);
  }
  const remaining = new Map<string, Set<string>>();
  const consumers = new Map<string, Set<string>>();
  for (const node of nodes) {
    const id = getId(node);
    const deps = new Set<string>();
    for (const dependency of getDependencies(node)) {
      if (!byId.has(dependency)) {
        throw new Error(`${context}: node '${id}' references unknown dependency '${dependency}'`);
      }
      if (dependency === id) throw new Error(`${context}: node '${id}' depends on itself`);
      deps.add(dependency);
      const downstream = consumers.get(dependency) ?? new Set<string>();
      downstream.add(id);
      consumers.set(dependency, downstream);
    }
    remaining.set(id, deps);
  }
  const ready = [...remaining.entries()]
    .filter(([, deps]) => deps.size === 0)
    .map(([id]) => id);
  const ordered: T[] = [];
  while (ready.length > 0) {
    const id = ready.shift()!;
    ordered.push(byId.get(id)!);
    remaining.delete(id);
    for (const consumer of consumers.get(id) ?? []) {
      const deps = remaining.get(consumer);
      if (!deps) continue;
      deps.delete(id);
      if (deps.size === 0) ready.push(consumer);
    }
  }
  if (remaining.size > 0) {
    throw new Error(`${context}: dependency cycle involving ${[...remaining.keys()].join(', ')}`);
  }
  return { ordered, ids: ordered.map(getId) };
}

/**
 * Derived parameters: one quantity, one owner.
 *
 * Modules are parameter-isolated, so a quantity two modules need (a grid-loss
 * factor, a damage coefficient, one efficiency series seen from two sides)
 * either lives in one module and is copied into the other at run time, or
 * exists twice and drifts. Hand-written copying in a runner has two failure
 * modes this file removes:
 *
 * - the copy is guarded by `??=`, so passing the derived value explicitly
 *   (even at its own default) silently re-splits the pair; and
 * - nothing checks that the copy reads only what its comment says it reads.
 *
 * A derivation names its target, the paths it reads, and how to compute it.
 * `applyDerivations` computes every target from the merged parameters, in
 * dependency order, and refuses an explicit override of a target unless the
 * caller lists it in `decouple` — a deliberate, visible act. `read` throws on
 * any path the derivation did not declare, so `from` is true by construction.
 */

import { assertAddressable, ownValue } from './component-params.js';
import { leafPaths } from './liveness.js';

export interface ParamDerivation {
  /** Dot path, module first: 'cdr.tcre'. */
  readonly target: string;
  /** Paths (or path prefixes) the derivation reads, module first. */
  readonly from: readonly string[];
  /** Why the two are one quantity. Shown in the refusal and in introspection. */
  readonly description: string;
  derive(read: (path: string) => unknown): unknown;
}

export interface DerivationOptions {
  /** One module's overrides merged onto its defaults. */
  merge(moduleName: string, overrides: Record<string, unknown>): unknown;
  /** Targets the caller may set explicitly, overriding the derivation. */
  decouple?: readonly string[];
}

export interface DerivationResult<P> {
  params: P;
  /** The value each target took (derived, or the decoupled override). */
  values: Record<string, unknown>;
  /** Paths read per module (relative to the module), for parameter liveness. */
  reads: Record<string, string[]>;
}

/** Module first, then at least one segment; reserved segments refused. */
function splitPath(path: string): [string, string[]] {
  const parts = assertAddressable(path);
  if (parts.length < 2 || parts.some((part) => part === '')) {
    throw new Error(`Invalid parameter path '${path}': expected module.path`);
  }
  return [parts[0], parts.slice(1)];
}

const getOwn = (value: unknown, parts: readonly string[]): unknown =>
  parts.reduce<unknown>((current, part) => ownValue(current, part), value);

function setOwn(target: Record<string, unknown>, parts: readonly string[], value: unknown): void {
  let current = target;
  for (const part of parts.slice(0, -1)) {
    const next = Object.hasOwn(current, part) ? current[part] : undefined;
    const copy = typeof next === 'object' && next !== null && !Array.isArray(next) ? { ...(next as object) } : {};
    current[part] = copy;
    current = copy as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

const covers = (declared: string, path: string) => path === declared || path.startsWith(`${declared}.`);

/** Order derivations so a target is computed before anything that reads it. */
function orderDerivations(derivations: readonly ParamDerivation[]): ParamDerivation[] {
  const byTarget = new Map<string, ParamDerivation>();
  for (const derivation of derivations) {
    splitPath(derivation.target);
    derivation.from.forEach(splitPath);
    if (byTarget.has(derivation.target)) throw new Error(`Parameter '${derivation.target}' is derived twice`);
    byTarget.set(derivation.target, derivation);
  }
  const ordered: ParamDerivation[] = [];
  const state = new Map<ParamDerivation, 'visiting' | 'done'>();
  const visit = (derivation: ParamDerivation, chain: string[]) => {
    const seen = state.get(derivation);
    if (seen === 'done') return;
    if (seen === 'visiting') {
      throw new Error(`Derived parameters form a cycle: ${[...chain, derivation.target].join(' -> ')}`);
    }
    state.set(derivation, 'visiting');
    for (const other of derivations) {
      if (other !== derivation && derivation.from.some((path) => covers(path, other.target) || covers(other.target, path))) {
        visit(other, [...chain, derivation.target]);
      }
    }
    state.set(derivation, 'done');
    ordered.push(derivation);
  };
  for (const derivation of derivations) visit(derivation, []);
  return ordered;
}

/**
 * Compute every derived parameter from the merged parameters.
 *
 * Throws when an override sets a derived target that is not in `decouple`, or
 * when `decouple` names something that is not derived (a stale entry would
 * otherwise read as a guarantee).
 */
export function applyDerivations<P extends Record<string, any>>(
  params: P,
  derivations: readonly ParamDerivation[],
  options: DerivationOptions,
): DerivationResult<P> {
  const ordered = orderDerivations(derivations);
  const targets = new Set(ordered.map((d) => d.target));
  const decouple = new Set(options.decouple ?? []);
  for (const entry of decouple) {
    if (!targets.has(entry)) throw new Error(`decouple names '${entry}', which is not a derived parameter`);
  }

  const result: Record<string, any> = { ...params };
  const values: Record<string, unknown> = {};
  const reads: Record<string, Set<string>> = {};
  // Merge each module once per distinct overrides object: merges can be costly
  // and can log warnings, and a module's overrides change only when written.
  const mergedCache = new Map<string, { overrides: unknown; merged: unknown }>();
  const mergedOf = (moduleName: string) => {
    const overrides = result[moduleName] ?? {};
    const cached = mergedCache.get(moduleName);
    if (cached && cached.overrides === result[moduleName]) return cached.merged;
    const merged = options.merge(moduleName, overrides);
    mergedCache.set(moduleName, { overrides: result[moduleName], merged });
    return merged;
  };

  for (const derivation of ordered) {
    const [targetModule, targetParts] = splitPath(derivation.target);
    const explicit = getOwn(params[targetModule], targetParts);
    if (explicit !== undefined) {
      if (!decouple.has(derivation.target)) {
        throw new Error(
          `Parameter '${derivation.target}' is derived from ${derivation.from.join(', ')}: ` +
          `${derivation.description} Set what it is derived from, or list '${derivation.target}' ` +
          'in decouple to override it deliberately.',
        );
      }
      values[derivation.target] = explicit;
      continue;
    }
    const read = (path: string): unknown => {
      if (!derivation.from.some((declared) => covers(declared, path))) {
        throw new Error(`Derivation of '${derivation.target}' read '${path}', which it does not declare in from`);
      }
      const [moduleName, parts] = splitPath(path);
      const value = getOwn(mergedOf(moduleName), parts);
      // A value read whole credits each leaf it covers, by liveness's own leaf rule
      const credited = (reads[moduleName] ??= new Set());
      for (const leaf of leafPaths(value, parts.join('.'))) credited.add(leaf);
      return value;
    };
    const value = derivation.derive(read);
    result[targetModule] = { ...(result[targetModule] ?? {}) };
    setOwn(result[targetModule], targetParts, value);
    values[derivation.target] = value;
  }

  return {
    params: result as P,
    values,
    reads: Object.fromEntries(Object.entries(reads).map(([name, paths]) => [name, [...paths].sort()])),
  };
}

/**
 * Automatic Dependency Resolution
 *
 * Julia-inspired auto-wiring: modules declare inputs/outputs,
 * framework resolves dependencies automatically.
 *
 * Key concepts:
 * - OutputRegistry: maps output names to providing modules
 * - Topological sort: determines execution order
 * - Transforms: compute derived inputs from outputs
 * - Lags: handle feedback loops with delayed values
 */

import { Module, ConnectorType } from './module.js';
import { Year, YearIndex } from './types.js';
import { validatedMerge } from './validated-merge.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A module with any type parameters (for registry)
 */
export type AnyModule = Module<any, any, any, any>;

/**
 * Transform function: compute an input from available outputs
 */
export type TransformFn = (outputs: Record<string, any>, year: Year, yearIndex: YearIndex) => any;

/**
 * Transform configuration with explicit dependencies
 */
export interface TransformConfig {
  /** Function that computes the transform */
  fn: TransformFn;
  /** Output names this transform reads (creates dependency edges) */
  dependsOn: string[];
}

/**
 * Transform entry: either a bare function (backwards compat) or config with dependencies
 */
export type TransformEntry = TransformFn | TransformConfig;

/**
 * Normalize a transform entry to TransformConfig
 */
function normalizeTransform(entry: TransformEntry): TransformConfig {
  if (typeof entry === 'function') {
    return { fn: entry, dependsOn: [] };  // Backwards compat: no deps
  }
  return entry;
}

/**
 * Lag configuration for feedback loops
 */
export interface LagConfig {
  /** Source output name */
  source: string;
  /** Delay in years (1 = use last year's value) */
  delay: number;
  /** Initial value for year 0 */
  initial: any;
  /**
   * When true and the run uses bootstrapLags > 0, this lag's initial is
   * replaced by the value its source actually produces in a warm-up pass of
   * year 0 — a fixed-point (steady-state) initialization. Use for FLOW
   * quantities (prices, rates, per-year energy) whose "previous year" value
   * should be consistent with the anchor year itself. Leave false for STOCK
   * quantities (capital, temperature) whose initial is a calibrated
   * end-of-previous-year level: bootstrapping those would inject a
   * one-year-forward bias. Note: honored only by the runAutowired
   * convenience wrapper (which owns the warm-up loop); callers driving
   * initAutowired/stepAutowired directly must run their own warm-up.
   */
  bootstrap?: boolean;
}

/**
 * Configuration for auto-wired simulation
 */
export interface AutowireConfig {
  /** Modules to wire together */
  modules: AnyModule[];

  /**
   * Transforms: compute derived inputs from outputs
   * Key is the input name, value is a function or config with dependencies
   */
  transforms?: Record<string, TransformEntry>;

  /**
   * Lags: handle feedback loops with delayed values
   * Key is the input name, value specifies source and delay
   */
  lags?: Record<string, LagConfig>;

  /**
   * Module parameter overrides
   * Key is module name, value is partial params
   */
  params?: Record<string, any>;

  /** First step index (e.g. a start year, or 0 for a generic horizon) */
  startYear: number;

  /** Last step index, inclusive */
  endYear: number;

  /** Enable dev-mode transform read tracking via Proxy (default: false) */
  trackReads?: boolean;

  /**
   * Fixed-point warm-up iterations for lags marked bootstrap: true.
   * Each iteration runs year 0 once and replaces those lags' initials with
   * the values their sources actually produced, so the anchor year sees
   * self-consistent "previous year" flows instead of hand-guessed constants
   * (which otherwise produce a spurious step change in year 1). Default 0
   * (off). 2 is enough in practice — convergence is geometric.
   */
  bootstrapLags?: number;
}

/**
 * Dependency graph node
 */
interface DepNode {
  module: AnyModule;
  dependsOn: Set<string>;  // Module names this depends on
  providesTo: Set<string>; // Module names that depend on this
}

// =============================================================================
// OUTPUT REGISTRY
// =============================================================================

/**
 * Build a registry mapping output names to their providing modules
 */
export function buildOutputRegistry(modules: AnyModule[]): Map<string, string> {
  const registry = new Map<string, string>();

  for (const mod of modules) {
    for (const output of mod.outputs) {
      if (registry.has(output as string)) {
        const existing = registry.get(output as string);
        throw new Error(
          `Output collision: '${output as string}' provided by both '${existing}' and '${mod.name}'`
        );
      }
      registry.set(output as string, mod.name);
    }
  }

  return registry;
}

// =============================================================================
// DEPENDENCY GRAPH
// =============================================================================

/**
 * Build dependency graph from modules
 */
export function buildDependencyGraph(
  modules: AnyModule[],
  outputRegistry: Map<string, string>,
  transforms: Record<string, TransformEntry> = {},
  lags: Record<string, LagConfig> = {}
): Map<string, DepNode> {
  const graph = new Map<string, DepNode>();

  // Initialize nodes
  for (const mod of modules) {
    graph.set(mod.name, {
      module: mod,
      dependsOn: new Set(),
      providesTo: new Set(),
    });
  }

  // Build edges
  for (const mod of modules) {
    const node = graph.get(mod.name)!;

    for (const input of mod.inputs) {
      const inputName = input as string;

      // Handle transforms - now with dependency tracking
      if (transforms[inputName]) {
        const config = normalizeTransform(transforms[inputName]);
        // Add edges for transform's declared dependencies
        for (const depOutput of config.dependsOn) {
          const provider = outputRegistry.get(depOutput);
          if (provider && provider !== mod.name) {
            node.dependsOn.add(provider);
            graph.get(provider)!.providesTo.add(mod.name);
          }
        }
        continue;  // Input is handled by transform
      }

      // Handle lags (unchanged - lags break cycles intentionally)
      if (lags[inputName]) {
        continue;
      }

      // Find which module provides this output
      const provider = outputRegistry.get(inputName);
      if (!provider) {
        throw new Error(
          `Unresolved input: '${inputName}' required by '${mod.name}' ` +
          `but no module provides it. Add a transform or lag, or add a module that outputs it.`
        );
      }

      // Don't add self-dependency
      if (provider !== mod.name) {
        node.dependsOn.add(provider);
        graph.get(provider)!.providesTo.add(mod.name);
      }
    }
  }

  return graph;
}

// =============================================================================
// TOPOLOGICAL SORT
// =============================================================================

/**
 * Topologically sort modules by dependencies (Kahn's algorithm)
 * Returns modules in execution order
 */
export function topologicalSort(graph: Map<string, DepNode>): AnyModule[] {
  const sorted: AnyModule[] = [];

  // Work on a private copy of each node's dependency set. `new Map(graph)` would
  // be a shallow copy that shares the DepNode Sets, so mutating them below would
  // corrupt the caller's graph — this function is exported and must be safe to
  // call more than once on the same graph. `providesTo` is only read.
  const pending = new Map<string, Set<string>>();
  for (const [name, node] of graph) {
    pending.set(name, new Set(node.dependsOn));
  }

  // Find nodes with no dependencies
  const ready: string[] = [];
  for (const [name, deps] of pending) {
    if (deps.size === 0) {
      ready.push(name);
    }
  }

  while (ready.length > 0) {
    const name = ready.shift()!;
    const node = graph.get(name)!;
    sorted.push(node.module);
    pending.delete(name);

    // Remove this node from the pending dependencies of others
    for (const dependent of node.providesTo) {
      const deps = pending.get(dependent);
      if (deps) {
        deps.delete(name);
        if (deps.size === 0) {
          ready.push(dependent);
        }
      }
    }
  }

  // Check for cycles
  if (pending.size > 0) {
    const cycleNodes = Array.from(pending.keys()).join(', ');
    throw new Error(
      `Dependency cycle detected involving: ${cycleNodes}. ` +
      `Use 'lags' configuration to break the cycle.`
    );
  }

  return sorted;
}

// =============================================================================
// CONNECTOR TYPE VALIDATION
// =============================================================================

/**
 * Validate connector type compatibility between providers and consumers.
 * Only checks modules that declare connectorTypes - others are skipped.
 */
export function validateConnectorTypes(
  modules: AnyModule[],
  outputRegistry: Map<string, string>,
  transforms: Record<string, TransformEntry> = {},
  lags: Record<string, LagConfig> = {}
): string[] {
  const warnings: string[] = [];

  // Build output type registry from modules that declare connectorTypes
  const outputTypes = new Map<string, { module: string; type: ConnectorType }>();
  for (const mod of modules) {
    if (!mod.connectorTypes?.outputs) continue;
    for (const [outputName, type] of Object.entries(mod.connectorTypes.outputs)) {
      outputTypes.set(outputName, { module: mod.name, type: type as ConnectorType });
    }
  }

  // Check each consumer's declared input types against provider types
  for (const mod of modules) {
    if (!mod.connectorTypes?.inputs) continue;
    for (const [inputName, expectedType] of Object.entries(mod.connectorTypes.inputs)) {
      // Skip transforms and lags (they handle type conversion)
      if (transforms[inputName] || lags[inputName]) continue;

      const providerInfo = outputTypes.get(inputName);
      if (!providerInfo) continue; // Provider doesn't declare types - skip

      if (providerInfo.type !== expectedType) {
        warnings.push(
          `Type mismatch: ${mod.name}.${inputName} expects '${expectedType}' ` +
          `but ${providerInfo.module}.${inputName} provides '${providerInfo.type}'`
        );
      }
    }
  }

  return warnings;
}

// =============================================================================
// WIRING VALIDATION
// =============================================================================

/**
 * Validate all wiring at composition time.
 * Catches transform/output name collisions, typos in dependsOn, missing or
 * invalid lag sources/delays, transform chaining, and modules that directly
 * consume cycle-breaker transforms.
 */
export function validateWiring(
  modules: AnyModule[],
  outputRegistry: Map<string, string>,
  transforms: Record<string, TransformEntry>,
  lags: Record<string, LagConfig>
): void {
  const errors: string[] = [];

  // Ignore transform keys whose value is undefined (e.g. built via a
  // conditional spread) — otherwise they'd count as available outputs while
  // never producing a value, and crash normalizeTransform below
  const definedTransforms = Object.fromEntries(
    Object.entries(transforms).filter(([, entry]) => entry !== undefined)
  );

  // A transform must not reuse a module output's name. If it did, a module
  // consuming that name would silently receive the transform's value (module
  // inputs resolve transforms before outputs) while dependsOn/lag sources
  // resolve to the module output — the two paths disagree. Identity
  // pass-throughs are simply redundant: a same-named input already resolves to
  // the output natively.
  for (const name of Object.keys(definedTransforms)) {
    const provider = outputRegistry.get(name);
    if (provider) {
      errors.push(
        `Transform '${name}' collides with output '${name}' provided by module '${provider}'. ` +
        `Rename the transform, or drop it if it only passes the output through.`
      );
      // Drop it so the passes below reason over a clean transform set (a name
      // here is now guaranteed to be a pure transform, not a shadowed output).
      delete definedTransforms[name];
    }
  }

  // All available output names (module outputs + transform names)
  const allOutputs = new Set([...outputRegistry.keys(), ...Object.keys(definedTransforms)]);

  // Check transform dependsOn items exist and are module outputs.
  // Transform→transform dependencies are rejected: the engine creates no
  // ordering edge for them (buildDependencyGraph resolves deps through the
  // output registry only) and transform values are never written to
  // currentOutputs, so a chained transform would silently read undefined.
  // (Colliding transform names were dropped above, so a dep still found in
  // definedTransforms is necessarily a pure transform name.)
  for (const [name, entry] of Object.entries(definedTransforms)) {
    const config = normalizeTransform(entry);
    for (const dep of config.dependsOn) {
      if (!allOutputs.has(dep)) {
        errors.push(`Transform '${name}' depends on '${dep}' which doesn't exist`);
      } else if (definedTransforms[dep] !== undefined) {
        errors.push(
          `Transform '${name}' depends on transform '${dep}'. ` +
          `Transform chaining is not supported — depend on module outputs instead.`
        );
      }
    }
  }

  // Check lag sources exist and delays are valid
  for (const [name, lag] of Object.entries(lags)) {
    if (!allOutputs.has(lag.source)) {
      errors.push(`Lag '${name}' reads source '${lag.source}' which doesn't exist`);
    }
    if (!Number.isInteger(lag.delay) || lag.delay < 1) {
      errors.push(`Lag '${name}' has delay ${lag.delay}: delay must be an integer >= 1`);
    }
  }

  // Cycle-breaker lint: if a transform has dependsOn: [] AND is used as a lag
  // source (proving it carries feedback data), no module should consume it
  // directly — use a lag instead. Transforms with dependsOn: [] that are NOT
  // lag sources are parameter injections (e.g., carbonPrice) and are fine.
  const noDepsTransforms = new Set<string>();
  for (const [name, entry] of Object.entries(definedTransforms)) {
    const config = normalizeTransform(entry);
    if (config.dependsOn.length === 0) noDepsTransforms.add(name);
  }
  // A cycle-breaker is a dependsOn:[] transform that's also a lag source
  const lagSources = new Set(Object.values(lags).map(l => l.source));
  const cycleBreakers = new Set(
    [...noDepsTransforms].filter(name => lagSources.has(name))
  );
  for (const mod of modules) {
    for (const input of mod.inputs) {
      const inputName = input as string;
      // Skip inputs resolved by lags (that's the correct pattern)
      if (lags[inputName]) continue;
      // Check if input is resolved by a cycle-breaker transform
      if (cycleBreakers.has(inputName)) {
        errors.push(
          `Module '${mod.name}' directly consumes cycle-breaker transform '${inputName}'. ` +
          `Use a lag instead to get real values.`
        );
      }
    }
  }

  if (errors.length > 0) throw new Error(`Wiring errors:\n${errors.join('\n')}`);
}

// =============================================================================
// OUTPUT GUARDS
// =============================================================================

/**
 * Recursively check a value for NaN/Infinity.
 * Descends into both plain objects (Record<Region, number>,
 * Record<Mineral, {demand, cumulative}>) and arrays (number[] time series,
 * arrays of records). The depth cap is a runaway/cyclic-structure guard, not a
 * semantic limit — set well beyond any realistic output nesting.
 */
const MAX_CHECK_DEPTH = 8;
function checkNumeric(val: unknown, path: string, mod: string, year: number, depth = 0): void {
  if (typeof val === 'number' && (Number.isNaN(val) || !Number.isFinite(val))) {
    throw new Error(`Module '${mod}' output '${path}' is ${val} at year ${year}`);
  }
  if (depth >= MAX_CHECK_DEPTH || typeof val !== 'object' || val === null) return;
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      checkNumeric(val[i], `${path}[${i}]`, mod, year, depth + 1);
    }
  } else {
    for (const [k, v] of Object.entries(val)) {
      checkNumeric(v, `${path}.${k}`, mod, year, depth + 1);
    }
  }
}

/**
 * Verify output completeness and check for NaN/Infinity after each module step.
 */
function validateOutputs(
  mod: AnyModule,
  outputs: Record<string, any>,
  year: number
): void {
  for (const output of mod.outputs) {
    const key = output as string;
    const val = outputs[key];
    if (val === undefined) {
      throw new Error(
        `Module '${mod.name}' declares output '${key}' but step() didn't return it`
      );
    }
    checkNumeric(val, key, mod.name, year);
  }
}

// =============================================================================
// TRANSFORM HELPERS
// =============================================================================

/**
 * Fail-fast: output MUST exist. Throws on broken wiring instead of masking with a fallback.
 * Use for normal (non-cycle-breaker) transforms where the dependency is declared.
 */
export function requireOutput<T>(outputs: Record<string, any>, key: string, context: string): T {
  const val = outputs[key];
  if (val === undefined) throw new Error(`${context}: required output '${key}' not available`);
  return val as T;
}

/**
 * Year-0 fallback: OK to use default on year 0 before upstream modules run, throws after.
 * Use for cycle-breaker transforms where the value legitimately doesn't exist on the first step.
 */
export function yearZeroFallback<T>(
  outputs: Record<string, any>,
  key: string,
  initial: T,
  yearIndex: number,
  context: string
): T {
  const val = outputs[key];
  if (val !== undefined) return val as T;
  if (yearIndex === 0) return initial;
  throw new Error(`${context}: '${key}' missing at year index ${yearIndex} (only year 0 fallback allowed)`);
}

/**
 * Intentional optional: output may legitimately not exist (e.g., pre-activation CDR).
 * The fallback value is always used when the output is absent — this is not a bug.
 */
export function optionalOutput<T>(
  outputs: Record<string, any>,
  key: string,
  fallback: T
): T {
  const val = outputs[key];
  return val !== undefined ? val as T : fallback;
}

// =============================================================================
// TRANSFORM READ TRACKING
// =============================================================================

/**
 * Create a Proxy that records which keys are read from outputs.
 * Used in dev mode to detect undeclared transform dependencies.
 */
function trackingProxy(outputs: Record<string, any>): { proxy: Record<string, any>; reads: Set<string> } {
  const reads = new Set<string>();
  const proxy = new Proxy(outputs, {
    get(target, prop) {
      if (typeof prop === 'string') reads.add(prop);
      return target[prop as string];
    },
  });
  return { proxy, reads };
}

// =============================================================================
// AUTO-WIRED SIMULATION
// =============================================================================

/**
 * Result from running an auto-wired simulation
 */
export interface AutowireResult {
  years: number[];
  outputs: Record<string, Record<string, any[]>>;  // module -> output -> values[]
  states: Record<string, any[]>;  // module -> state[]
}

/**
 * Mutable state for step-by-step simulation
 */
export interface AutowireState {
  sortedModules: AnyModule[];
  transforms: Record<string, TransformEntry>;
  lags: Record<string, LagConfig>;
  stateMap: Map<string, any>;
  paramsMap: Map<string, any>;
  lagHistory: Map<string, any[]>;
  years: number[];
  outputs: Record<string, Record<string, any[]>>;
  states: Record<string, any[]>;
  currentOutputs: Record<string, any>;
  startYear: number;
  endYear: number;
  currentYear: number;
  trackReads: boolean;
}

/**
 * Initialize an auto-wired simulation (builds graph, inits states).
 * Returns mutable state for step-by-step execution.
 */
export function initAutowired(config: AutowireConfig): AutowireState {
  const {
    modules,
    transforms = {},
    lags = {},
    params = {},
    startYear,
    endYear,
    trackReads = false,
  } = config;

  // Build registry and graph
  const outputRegistry = buildOutputRegistry(modules);

  // Validate connector types (warnings only - incremental adoption)
  const connectorWarnings = validateConnectorTypes(modules, outputRegistry, transforms, lags);
  for (const warning of connectorWarnings) {
    console.warn(`[autowire] ${warning}`);
  }

  // Validate wiring: catch typos, missing sources, orphaned outputs
  validateWiring(modules, outputRegistry, transforms, lags);

  const graph = buildDependencyGraph(modules, outputRegistry, transforms, lags);
  const sortedModules = topologicalSort(graph);

  // Initialize module states and params
  const stateMap = new Map<string, any>();
  const paramsMap = new Map<string, any>();

  for (const mod of sortedModules) {
    // Merge + validate at load time: throws on invalid params, warns on
    // warnings. This is what makes each Module's required validate() actually
    // run — the engine's contract, not something consumers must wire by hand.
    const mergedParams = validatedMerge(
      mod.name,
      (p) => mod.validate(p),
      (p) => mod.mergeParams(p),
      params[mod.name] ?? {}
    );
    paramsMap.set(mod.name, mergedParams);
    stateMap.set(mod.name, mod.init(mergedParams));
  }

  // Initialize lag history
  const lagHistory = new Map<string, any[]>();
  for (const [inputName, lagConfig] of Object.entries(lags)) {
    const history: any[] = [];
    for (let i = 0; i < lagConfig.delay; i++) {
      history.push(lagConfig.initial);
    }
    lagHistory.set(inputName, history);
  }

  // Result storage
  const outputs: Record<string, Record<string, any[]>> = {};
  const states: Record<string, any[]> = {};

  for (const mod of sortedModules) {
    outputs[mod.name] = {};
    for (const output of mod.outputs) {
      outputs[mod.name][output as string] = [];
    }
    states[mod.name] = [];
  }

  return {
    sortedModules,
    transforms,
    lags,
    stateMap,
    paramsMap,
    lagHistory,
    years: [],
    outputs,
    states,
    currentOutputs: {},
    startYear,
    endYear,
    currentYear: startYear,
    trackReads,
  };
}

/**
 * Advance the simulation by one year.
 * Returns the year that was stepped and a flat record of all outputs.
 */
export function stepAutowired(state: AutowireState): { year: number; outputs: Record<string, any>; done: boolean } {
  const year = state.currentYear;
  const yearIndex = year - state.startYear;

  if (year > state.endYear) {
    return { year: year - 1, outputs: state.currentOutputs, done: true };
  }

  state.years.push(year);

  // Clear current outputs for this year
  state.currentOutputs = {};

  // Step each module in sorted order
  for (const mod of state.sortedModules) {
    const inputs: Record<string, any> = {};

    for (const input of mod.inputs) {
      const inputName = input as string;

      if (state.transforms[inputName]) {
        const config = normalizeTransform(state.transforms[inputName]);
        if (state.trackReads && config.dependsOn.length > 0) {
          // Dev-mode: track which outputs the transform actually reads
          const { proxy, reads } = trackingProxy(state.currentOutputs);
          inputs[inputName] = config.fn(proxy, year, yearIndex);
          for (const read of reads) {
            if (!config.dependsOn.includes(read)) {
              console.warn(`[autowire] Transform '${inputName}' reads '${read}' but doesn't declare it in dependsOn`);
            }
          }
        } else {
          inputs[inputName] = config.fn(state.currentOutputs, year, yearIndex);
        }
        continue;
      }

      if (state.lags[inputName]) {
        const history = state.lagHistory.get(inputName)!;
        inputs[inputName] = history[0];
        continue;
      }

      if (state.currentOutputs[inputName] !== undefined) {
        inputs[inputName] = state.currentOutputs[inputName];
      } else {
        throw new Error(
          `Input '${inputName}' for module '${mod.name}' not available. ` +
          `This shouldn't happen if topological sort is correct.`
        );
      }
    }

    const modState = state.stateMap.get(mod.name)!;
    const modParams = state.paramsMap.get(mod.name)!;
    const result = mod.step(modState, inputs, modParams, year, yearIndex);

    // Verify completeness + NaN guard
    validateOutputs(mod, result.outputs as Record<string, any>, year);

    state.stateMap.set(mod.name, result.state);
    state.states[mod.name].push(result.state);

    for (const output of mod.outputs) {
      const outputName = output as string;
      const value = result.outputs[outputName];
      state.outputs[mod.name][outputName].push(value);
      state.currentOutputs[outputName] = value;
    }
  }

  // Update lag histories
  for (const [inputName, lagConfig] of Object.entries(state.lags)) {
    const history = state.lagHistory.get(inputName)!;
    history.shift();

    let sourceValue = state.currentOutputs[lagConfig.source];
    if (sourceValue === undefined && state.transforms[lagConfig.source]) {
      const config = normalizeTransform(state.transforms[lagConfig.source]);
      sourceValue = config.fn(state.currentOutputs, year, yearIndex);
    }
    if (sourceValue === undefined) {
      throw new Error(
        `Lag source '${lagConfig.source}' for input '${inputName}' not found in outputs or transforms.`
      );
    }
    history.push(sourceValue);
  }

  state.currentYear = year + 1;
  const done = state.currentYear > state.endYear;

  return { year, outputs: state.currentOutputs, done };
}

/**
 * Collect accumulated results from a completed (or in-progress) simulation.
 */
export function finalizeAutowired(state: AutowireState): AutowireResult {
  return {
    years: state.years,
    outputs: state.outputs,
    states: state.states,
  };
}

/**
 * Create and run an auto-wired simulation (convenience wrapper).
 */
export function runAutowired(config: AutowireConfig): AutowireResult {
  let cfg = config;

  // Fixed-point warm-up: run year 0 and feed bootstrap-flagged lags their
  // sources' actual year-0 values as initials, so the anchor year is
  // self-consistent (see AutowireConfig.bootstrapLags).
  const iterations = config.bootstrapLags ?? 0;
  const hasBootstrapLags = Object.values(config.lags ?? {}).some(l => l.bootstrap);
  if (iterations > 0 && hasBootstrapLags) {
    for (let i = 0; i < iterations; i++) {
      const warm = initAutowired(cfg);
      stepAutowired(warm);
      const newLags: Record<string, LagConfig> = {};
      for (const [name, lag] of Object.entries(cfg.lags ?? {})) {
        if (lag.bootstrap) {
          const history = warm.lagHistory.get(name)!;
          // After one step, the newest sample is the year-0 source value
          newLags[name] = { ...lag, initial: history[history.length - 1] };
        } else {
          newLags[name] = lag;
        }
      }
      cfg = { ...cfg, lags: newLags };
    }
  }

  const state = initAutowired(cfg);

  while (state.currentYear <= state.endYear) {
    stepAutowired(state);
  }

  return finalizeAutowired(state);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get a flat record of all outputs for a given year
 */
export function getOutputsAtYear(
  result: AutowireResult,
  yearIndex: number
): Record<string, any> {
  const flat: Record<string, any> = {};

  for (const [moduleName, moduleOutputs] of Object.entries(result.outputs)) {
    for (const [outputName, values] of Object.entries(moduleOutputs)) {
      flat[outputName] = values[yearIndex];
      // Also provide namespaced version
      flat[`${moduleName}.${outputName}`] = values[yearIndex];
    }
  }

  return flat;
}

/**
 * Get time series for a specific output
 */
export function getTimeSeries(
  result: AutowireResult,
  moduleName: string,
  outputName: string
): any[] {
  return result.outputs[moduleName]?.[outputName] ?? [];
}

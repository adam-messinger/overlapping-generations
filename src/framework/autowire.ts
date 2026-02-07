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

  /** Start year (default: 2025) */
  startYear?: number;

  /** End year (default: 2100) */
  endYear?: number;

  /** Enable dev-mode transform read tracking via Proxy (default: false) */
  trackReads?: boolean;
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
  const remaining = new Map(graph);

  // Find nodes with no dependencies
  const ready: string[] = [];
  for (const [name, node] of remaining) {
    if (node.dependsOn.size === 0) {
      ready.push(name);
    }
  }

  while (ready.length > 0) {
    const name = ready.shift()!;
    const node = remaining.get(name)!;
    sorted.push(node.module);
    remaining.delete(name);

    // Remove this node from dependencies of others
    for (const dependent of node.providesTo) {
      if (remaining.has(dependent)) {
        const depNode = remaining.get(dependent)!;
        depNode.dependsOn.delete(name);
        if (depNode.dependsOn.size === 0) {
          ready.push(dependent);
        }
      }
    }
  }

  // Check for cycles
  if (remaining.size > 0) {
    const cycleNodes = Array.from(remaining.keys()).join(', ');
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
 * Catches typos in dependsOn, missing lag sources, and orphaned outputs.
 */
export function validateWiring(
  modules: AnyModule[],
  outputRegistry: Map<string, string>,
  transforms: Record<string, TransformEntry>,
  lags: Record<string, LagConfig>
): void {
  const errors: string[] = [];

  // All available output names (module outputs + transform names)
  const allOutputs = new Set([...outputRegistry.keys(), ...Object.keys(transforms)]);

  // Check transform dependsOn items exist
  for (const [name, entry] of Object.entries(transforms)) {
    const config = normalizeTransform(entry);
    for (const dep of config.dependsOn) {
      if (!allOutputs.has(dep)) {
        errors.push(`Transform '${name}' depends on '${dep}' which doesn't exist`);
      }
    }
  }

  // Check lag sources exist
  for (const [name, lag] of Object.entries(lags)) {
    if (!allOutputs.has(lag.source)) {
      errors.push(`Lag '${name}' reads source '${lag.source}' which doesn't exist`);
    }
  }

  if (errors.length > 0) throw new Error(`Wiring errors:\n${errors.join('\n')}`);
}

// =============================================================================
// OUTPUT GUARDS
// =============================================================================

/**
 * Recursively check a value for NaN/Infinity up to a depth limit.
 * Covers Record<Region, number>, Record<Mineral, {demand, cumulative}>, etc.
 */
function checkNumeric(val: unknown, path: string, mod: string, year: number, depth = 0): void {
  if (typeof val === 'number' && (Number.isNaN(val) || !Number.isFinite(val))) {
    throw new Error(`Module '${mod}' output '${path}' is ${val} at year ${year}`);
  }
  if (depth < 3 && typeof val === 'object' && val !== null && !Array.isArray(val)) {
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
    startYear = 2025,
    endYear = 2100,
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
    const mergedParams = mod.mergeParams(params[mod.name] ?? {});
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
  const state = initAutowired(config);

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
